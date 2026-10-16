import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { snapshot, compare, main, tokenFields } from '../scripts/agent-usage.mjs';

const at = (second) => `2026-01-01T00:00:${String(second).padStart(2, '0')}.000Z`;
const tokens = (value) => Object.fromEntries(tokenFields.map((key) => [key, value]));
const meta = (id, parent, second = 0) => ({
  type: 'session_meta',
  payload: {
    id,
    timestamp: second === null ? undefined : at(second),
    source: parent
      ? {
          subagent: {
            thread_spawn: {
              parent_thread_id: parent,
              agent_path: `/root/${id}`,
              agent_role: 'implementer',
            },
          },
        }
      : 'cli',
    instructions: 'PRIVATE_INSTRUCTIONS',
    user_id: 'PRIVATE_ACCOUNT',
  },
});
const model = (name = 'synthetic-model', second = 1) => ({
  type: 'turn_context',
  timestamp: at(second),
  payload: { model: name, instructions: 'PRIVATE_CONTEXT' },
});
const usage = (value, second = 2) => ({
  type: 'event_msg',
  timestamp: at(second),
  payload: {
    type: 'token_count',
    info: { total_token_usage: tokens(value), last_token_usage: tokens(999) },
    text: 'PRIVATE_CONTENT',
  },
});
const log = (records) =>
  records
    .map((record) => (typeof record === 'string' ? record : JSON.stringify(record)))
    .join('\n') + '\n';
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'applicable-usage-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const write = (name, records) => writeFile(join(dir, `${name}.jsonl`), log(records));
  const capture = (second = 3, scope = 'descendants') =>
    snapshot({ sessionsDir: dir, rootId: 'root', scope, now: at(second) });
  return { dir, write, capture };
}

test('scopes linked descendants, deduplicates copies and whitelists output', async (t) => {
  const { write, capture } = await fixture(t);
  const records = [meta('root'), model(), usage(10), usage(10)];
  await write('root', records);
  await write('copy', records);
  await write('prefix', records.slice(0, 3));
  await write('child', [meta('child', 'root'), model(), usage(20)]);
  await write('grandchild', [meta('grandchild', 'child'), model(), usage(30)]);
  await write('unrelated', [meta('unrelated'), model('PRIVATE_MODEL'), usage(500), '{truncated']);
  const result = await capture();
  assert.deepEqual(
    result.agents.map((agent) => agent.id),
    ['child', 'grandchild', 'root'],
  );
  assert.equal(result.agents[2].cumulative.total_tokens, 10);
  assert.equal(result.agents[2].problems.length, 0);
  assert.equal(result.agents[0].agentPath, '/root/child');
  assert.equal(result.agents[0].agentRole, 'implementer');
  assert(!JSON.stringify(result).includes('PRIVATE'));
  assert.equal((await capture(3, 'root')).agents.length, 1);
});

test('reliable deltas subtract cumulative counters without adding subsets', async (t) => {
  const { write, capture } = await fixture(t);
  const records = [meta('root'), model(), usage(10)];
  await write('root', records);
  const baseline = await capture();
  await write('root', [...records, usage(25, 4)]);
  await write('child', [meta('new-child', 'root', 4), model('synthetic-model', 4), usage(7, 5)]);
  const report = compare(baseline, await capture(6));
  assert.equal(report.observedScopeDelta.total_tokens, 22);
  assert.equal(report.wallElapsedSeconds, 3);
  assert.equal(report.agents[1].delta.cached_input_tokens, 15);
});

test('unknown and malformed usage never become zero', async (t) => {
  const { write, capture } = await fixture(t);
  await write('root', [meta('root'), model()]);
  const baseline = await capture();
  assert.equal(baseline.agents[0].cumulative, null);
  await write('root', [meta('root'), model(), usage(10, 4), '{bad']);
  const report = compare(baseline, await capture(5));
  assert.equal(report.observedScopeDelta, null);
  assert.equal(report.agents[0].delta, null);
  assert(report.agents[0].problems.includes('malformed-or-truncated-record'));
});

test('resets, mixed models, delayed records and changed histories block deltas', async (t) => {
  const { write, capture } = await fixture(t);
  const records = [meta('root'), model(), usage(10)];
  await write('root', records);
  const baseline = await capture();
  for (const [suffix, problem] of [
    [[usage(5, 4)], 'counter-reset'],
    [[model('second-model', 4), usage(15, 5)], 'mixed-models'],
    [[usage(15, 2)], 'late-or-undated-records'],
  ]) {
    await write('root', [...records, ...suffix]);
    const report = compare(baseline, await capture(6));
    assert.equal(report.agents[0].delta, null);
    assert(report.agents[0].problems.includes(problem), problem);
  }
  await write('root', [meta('root'), model(), usage(15, 4)]);
  assert(
    compare(baseline, await capture(6)).agents[0].problems.includes('baseline-history-changed'),
  );
});

test('missing or late descendants make observed aggregate unknown', async (t) => {
  const { dir, write, capture } = await fixture(t);
  const records = [meta('root'), model(), usage(10)];
  await write('root', records);
  await write('child', [meta('child', 'root'), model(), usage(10)]);
  const baseline = await capture();
  await rm(join(dir, 'child.jsonl'));
  await write('root', [...records, usage(20, 4)]);
  let result = compare(baseline, await capture(6));
  assert.equal(result.observedScopeDelta, null);
  assert(
    result.agents.find((agent) => agent.id === 'child').problems.includes('baseline-agent-missing'),
  );
  await write('child', [meta('late', 'root'), model(), usage(10)]);
  result = compare(baseline, await capture(6));
  assert.equal(result.agents.find((agent) => agent.id === 'late').delta, null);
});

test('divergent copies and invalid counters remain explicit', async (t) => {
  const { write, capture } = await fixture(t);
  await write('root', [meta('root'), model(), usage(10)]);
  await write('copy', [meta('root'), model(), usage(20)]);
  assert((await capture()).agents[0].problems.includes('divergent-session-copies'));
  await write('copy', [
    meta('root'),
    model(),
    {
      type: 'event_msg',
      payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 0 } } },
    },
  ]);
  assert((await capture()).agents[0].problems.includes('missing-or-invalid-counters'));
});

test('mismatched roots/scopes, missing root and backward time fail', async (t) => {
  const { write, capture } = await fixture(t);
  await assert.rejects(capture(), /missing/);
  await write('root', [meta('root'), model(), usage(10)]);
  const baseline = await capture();
  assert.throws(() => compare(baseline, { ...baseline, rootId: 'other' }), /mismatch/);
  assert.throws(() => compare(baseline, { ...baseline, scope: 'root' }), /mismatch/);
  assert.throws(() => compare(baseline, { ...baseline, capturedAt: at(1) }), /backwards/);
});

test('CLI preserves baseline, rejects unfinished/duplicate runs and keeps omitted counts unknown', async (t) => {
  const { dir, write } = await fixture(t);
  await write('root', [meta('root'), model(), usage(10)]);
  const previous = process.cwd();
  const work = join(dir, 'work');
  await mkdir(work);
  process.chdir(work);
  t.after(() => process.chdir(previous));
  const opts = ['--run', 'issue-37', '--sessions-dir', dir, '--thread', 'root'];
  await assert.rejects(main(['finish', ...opts]), /baseline/);
  await main(['start', ...opts]);
  const baselinePath = join(work, 'output/agent-usage/issue-37/baseline.json');
  const original = await readFile(baselinePath, 'utf8');
  await assert.rejects(main(['start', ...opts]), /EEXIST/);
  await main(['finish', ...opts, '--tasks', '2']);
  const report = JSON.parse(
    await readFile(join(work, 'output/agent-usage/issue-37/report.json'), 'utf8'),
  );
  assert.equal(report.counts.tasks, 2);
  assert.equal(report.counts.findings, null);
  assert.equal(await readFile(baselinePath, 'utf8'), original);
  await assert.rejects(main(['finish', ...opts, '--tasks', '-1']), /counts/);
  await assert.rejects(main(['snapshot', '--unknown', 'x']), /Unknown/);
  await assert.rejects(main(['snapshot', '--run', '../../outside']), /does not accept/);
});

test('inactive observed counters contribute zero while active work contributes its delta', async (t) => {
  const { write, capture } = await fixture(t);
  const records = [meta('root'), model(), usage(10)];
  await write('root', records);
  await write('child', [meta('child', 'root'), model(), usage(7)]);
  const baseline = await capture();
  await write('root', [...records, usage(25, 4)]);
  const report = compare(baseline, await capture(5));
  assert.equal(report.observedScopeDelta.total_tokens, 15);
  assert.equal(report.agents[0].delta.total_tokens, 0);
  assert.equal(report.agents[0].usageObservationAdvanced, false);
});

test('metadata discovery stops at the first nonblank record of unrelated files', async (t) => {
  const { write, capture } = await fixture(t);
  await write('root', [meta('root'), model(), usage(10)]);
  await write('non-session', [
    { type: 'user', payload: 'PRIVATE_CONTENT' },
    meta('fake-child', 'root'),
    model(),
    usage(90),
  ]);
  await write('bad-header', ['{truncated', meta('fake-child-2', 'root'), model(), usage(90)]);
  const report = await capture();
  assert.deepEqual(
    report.agents.map((agent) => agent.id),
    ['root'],
  );
});

test('new-child lifetime counters require a known creation time inside the window', async (t) => {
  const { write, capture } = await fixture(t);
  const records = [meta('root'), model(), usage(10)];
  await write('root', records);
  const baseline = await capture();
  await write('root', [...records, usage(25, 4)]);
  for (const created of [0, null, 4]) {
    await write('child', [
      meta('child', 'root', created),
      model('synthetic-model', 4),
      usage(500, 5),
    ]);
    const report = compare(baseline, await capture(6));
    const child = report.agents.find((agent) => agent.id === 'child');
    if (created === 4) {
      assert.equal(child.createdAt, at(4));
      assert.equal(child.delta.total_tokens, 500);
      assert.equal(report.observedScopeDelta.total_tokens, 515);
    } else {
      assert.equal(child.delta, null);
      assert.equal(report.observedScopeDelta, null);
      assert(child.problems.includes('new-agent-creation-outside-window-or-unknown'));
    }
  }
});

test('conflicting session creation timestamps across duplicate copies block attribution', async (t) => {
  const { write, capture } = await fixture(t);
  await write('root', [meta('root'), model(), usage(10)]);
  const baseline = await capture();
  await write('child', [meta('child', 'root', 4), model('synthetic-model', 4), usage(500, 5)]);
  await write('child-copy', [meta('child', 'root', 0), model('synthetic-model', 4), usage(500, 5)]);
  const report = compare(baseline, await capture(6));
  const child = report.agents.find((agent) => agent.id === 'child');
  assert.equal(child.delta, null);
  assert(child.problems.includes('conflicting-session-creation-times'));
});
