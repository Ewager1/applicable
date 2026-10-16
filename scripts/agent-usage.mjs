// Local observed Codex rollout format, not a public API or billing interface.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

export const tokenFields = ['input_tokens', 'cached_input_tokens', 'cache_write_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens'];
const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9_.:/-]{1,160}$/.test(value) ? value : null;
const timestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const counters = value => tokenFields.every(key => Number.isSafeInteger(value?.[key]) && value[key] >= 0)
  ? Object.fromEntries(tokenFields.map(key => [key, value[key]])) : null;

async function filesIn(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) files.push(...await filesIn(join(directory, entry.name)));
    else if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(join(directory, entry.name));
  }
  return files.sort();
}

async function metadata(file) {
  const input = createReadStream(file);
  const lines = createInterface({ input, crlfDelay: Infinity });
  try {
    // Observed rollouts begin with session_meta. Never search unrelated bodies.
    for await (const line of lines) {
      if (!line.trim()) continue;
      let record;
      try { record = JSON.parse(line); } catch { return null; }
      if (record.type !== 'session_meta') return null;
      const id = identifier(record.payload?.id);
      const spawn = record.payload?.source?.subagent?.thread_spawn;
      return id ? { id, parentId: identifier(spawn?.parent_thread_id), createdAt: timestamp(record.payload?.timestamp),
        agentPath: identifier(spawn?.agent_path), agentRole: identifier(spawn?.agent_role) } : null;
    }
    return null;
  } finally { lines.close(); input.destroy(); }
}

async function usage(file) {
  const events = [];
  const problems = [];
  const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    let record;
    try { record = JSON.parse(line); } catch { problems.push('malformed-or-truncated-record'); continue; }
    if (record.type === 'turn_context') {
      const model = identifier(record.payload?.model);
      if (!model) problems.push('missing-model');
      events.push({ kind: 'model', model, at: timestamp(record.timestamp) });
    }
    if (record.type === 'event_msg' && record.payload?.type === 'token_count') {
      // last_token_usage is a turn value, never a cumulative counter.
      const tokens = counters(record.payload?.info?.total_token_usage);
      if (!tokens) problems.push('missing-or-invalid-counters');
      events.push({ kind: 'usage', tokens, at: timestamp(record.timestamp) });
    }
  }
  return { events, problems };
}

export async function snapshot({ sessionsDir, rootId, scope = 'descendants', now = new Date().toISOString() }) {
  if (!identifier(rootId)) throw new Error('Select a valid --thread or set CODEX_THREAD_ID.');
  if (!['root', 'descendants'].includes(scope)) throw new Error('--scope must be root or descendants.');
  const index = [];
  for (const file of await filesIn(sessionsDir)) {
    const meta = await metadata(file);
    if (meta) index.push({ ...meta, file });
  }
  if (!index.some(item => item.id === rootId)) throw new Error('Selected root session is missing; no report written.');
  const selected = new Set([rootId]);
  if (scope === 'descendants') {
    let added;
    do {
      added = false;
      for (const item of index) if (selected.has(item.parentId) && !selected.has(item.id)) {
        selected.add(item.id); added = true;
      }
    } while (added);
  }
  const agents = [];
  for (const id of [...selected].sort()) {
    const records = index.filter(item => item.id === id);
    const versions = [];
    const problems = [];
    for (const record of records) {
      const result = await usage(record.file);
      versions.push(result.events);
      problems.push(...result.problems);
    }
    // Duplicate copies and shorter prefix copies are safe; divergent histories are not.
    versions.sort((a, b) => b.length - a.length);
    const events = versions[0];
    if (versions.some(version => version.some((event, i) => digest(event) !== digest(events[i])))) problems.push('divergent-session-copies');
    if (new Set(records.map(record => record.parentId)).size !== 1) problems.push('conflicting-parent-links');
    if (new Set(records.map(record => record.createdAt)).size !== 1) problems.push('conflicting-session-creation-times');
    const createdAt = records[0].createdAt;
    if (createdAt && createdAt > now) problems.push('future-session-creation');
    const models = [...new Set(events.filter(event => event.kind === 'model' && event.model).map(event => event.model))];
    if (!models.length) problems.push('model-unknown');
    if (models.length > 1) problems.push('mixed-models');
    let latest = null;
    for (const event of events) {
      if (!event.at) problems.push('missing-event-timestamp');
      if (event.at && event.at > now) problems.push('future-event');
      if (event.kind !== 'usage' || !event.tokens) continue;
      if (latest && tokenFields.some(key => event.tokens[key] < latest[key])) problems.push('counter-reset');
      latest = event.tokens;
    }
    if (!latest) problems.push('usage-unknown');
    agents.push({ id, parentId: records[0].parentId, createdAt, agentPath: records[0].agentPath, agentRole: records[0].agentRole, models, cumulative: latest,
      problems: [...new Set(problems)], history: events.map(event => ({ hash: digest(event), at: event.at, kind: event.kind })) });
  }
  return { version: 1, status: 'provisional-local-observation', capturedAt: now, rootId, scope, agents,
    completeness: 'Observed linked sessions only; undiscovered, deleted or delayed descendants cannot be ruled out.',
    units: 'Reported tokens; cached input and reasoning output are subsets, not additions. No billing conversion.' };
}

export function compare(baseline, current) {
  if (baseline.version !== 1 || baseline.rootId !== current.rootId || baseline.scope !== current.scope) throw new Error('Baseline root/scope/version mismatch.');
  if (!timestamp(baseline.capturedAt) || current.capturedAt < baseline.capturedAt) throw new Error('Invalid baseline time or clock moved backwards.');
  if (!Array.isArray(baseline.agents) || !baseline.agents.some(agent => agent.id === baseline.rootId)) throw new Error('Invalid baseline agents.');
  const agents = current.agents.map(agent => {
    const before = baseline.agents.find(item => item.id === agent.id);
    const problems = [...agent.problems];
    if (before) {
      problems.push(...before.problems.map(problem => `baseline:${problem}`));
      if (!Array.isArray(before.history) || before.history.some((event, i) => event.hash !== agent.history[i]?.hash)) problems.push('baseline-history-changed');
      if (agent.parentId !== before.parentId) problems.push('parent-link-changed');
      if (before.createdAt !== undefined && agent.createdAt !== before.createdAt) problems.push('session-creation-changed');
      if (JSON.stringify(agent.models) !== JSON.stringify(before.models)) problems.push('model-changed');
      if (!counters(before.cumulative)) problems.push('baseline-usage-unknown');
    }
    if (!before && (!agent.createdAt || agent.createdAt <= baseline.capturedAt)) problems.push('new-agent-creation-outside-window-or-unknown');
    const added = agent.history.slice(before?.history?.length ?? 0);
    if (added.some(event => !event.at || event.at <= baseline.capturedAt)) problems.push('late-or-undated-records');
    let delta = null;
    if (!problems.length && agent.cumulative) {
      delta = Object.fromEntries(tokenFields.map(key => [key, agent.cumulative[key] - (before?.cumulative?.[key] ?? 0)]));
      if (tokenFields.some(key => delta[key] < 0)) { problems.push('counter-reset'); delta = null; }
    }
    return { ...agent, delta, usageObservationAdvanced: added.some(event => event.kind === 'usage'), problems: [...new Set(problems)] };
  });
  for (const agent of baseline.agents) if (!current.agents.some(item => item.id === agent.id)) {
    agents.push({ id: agent.id, parentId: agent.parentId, createdAt: agent.createdAt ?? null, agentPath: agent.agentPath ?? null, agentRole: agent.agentRole ?? null, models: agent.models, cumulative: null, delta: null, problems: ['baseline-agent-missing'], history: [] });
  }
  const reliable = agents.every(agent => agent.delta !== null);
  return { ...current, baselineAt: baseline.capturedAt,
    wallElapsedSeconds: (Date.parse(current.capturedAt) - Date.parse(baseline.capturedAt)) / 1000,
    agents, observedScopeDelta: reliable ? Object.fromEntries(tokenFields.map(key => [key, agents.reduce((sum, agent) => sum + agent.delta[key], 0)])) : null,
    attribution: 'Issue window only for observed linked sessions; includes tools/waiting in wall time. Historical issue usage unavailable without a baseline.' };
}

function options(args) {
  const result = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!args[i].startsWith('--') || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Options require --name value pairs.');
    const key = args[i].slice(2);
    if (key in result) throw new Error(`Duplicate option --${key}.`);
    result[key] = args[i + 1];
  }
  return result;
}

export async function main(args = process.argv.slice(2)) {
  const [command, ...rest] = args;
  if (!['snapshot', 'start', 'finish'].includes(command)) throw new Error('Use snapshot, start, or finish; see docs/agent-usage.md.');
  const opts = options(rest);
  const allowed = ['thread', 'sessions-dir', 'scope', 'run', 'tasks', 'findings', 'rework', 'outcomes'];
  if (Object.keys(opts).some(key => !allowed.includes(key))) throw new Error('Unknown option; see docs/agent-usage.md.');
  const run = opts.run;
  if (command === 'snapshot' && run !== undefined) throw new Error('snapshot does not accept --run.');
  if (command !== 'snapshot' && (!run || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(run))) throw new Error('start/finish require a safe --run name.');
  const counts = {};
  for (const key of ['tasks', 'findings', 'rework', 'outcomes']) {
    if (opts[key] === undefined) { counts[key] = null; continue; }
    if (command !== 'finish' || !/^\d+$/.test(opts[key]) || !Number.isSafeInteger(Number(opts[key]))) throw new Error('Measured counts must be nonnegative integers on finish only.');
    counts[key] = Number(opts[key]);
  }
  const outputDir = resolve('output/agent-usage');
  const runDir = run ? join(outputDir, run) : outputDir;
  let baseline;
  if (command === 'finish') {
    try { baseline = JSON.parse(await readFile(join(runDir, 'baseline.json'), 'utf8')); }
    catch { throw new Error('No valid baseline for this run; start it first.'); }
  }
  const current = await snapshot({ sessionsDir: resolve(opts['sessions-dir'] ?? join(homedir(), '.codex/sessions')),
    rootId: opts.thread ?? baseline?.rootId ?? process.env.CODEX_THREAD_ID,
    scope: opts.scope ?? baseline?.scope ?? 'descendants' });
  const report = command === 'finish' ? { ...compare(baseline, current), counts } : current;
  await mkdir(runDir, { recursive: true });
  const file = join(runDir, command === 'start' ? 'baseline.json' : command === 'finish' ? 'report.json' : `snapshot-${current.capturedAt.replaceAll(':', '-')}.json`);
  await writeFile(file, `${JSON.stringify(report, null, 2)}\n`, { flag: command === 'finish' ? 'w' : 'wx', mode: 0o600 });
  console.log(file);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.error('Usage command failed. Check options, session directory, root/scope, baseline and local file permissions. No reliable result is implied. See docs/agent-usage.md.'); process.exitCode = 1; });
}
