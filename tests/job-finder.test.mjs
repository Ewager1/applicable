import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildJobFinderPrompt,
  jobFinderInstructions,
  defaultJobFinderSettings,
} from '../src/job-finder/prompt.ts';

const empty = {
  roles: '',
  location: '',
  mustHaves: '',
  preferences: '',
  salary: '',
  experience: '',
  other: '',
};

test('blank answers retain onboarding and settings without inventing questionnaire answers', () => {
  const prompt = buildJobFinderPrompt({ ...empty, salary: ' \n\t ' });
  assert.equal(prompt, buildJobFinderPrompt(empty, { usJobsOnly: true, preferRecent: true }));
  assert.deepEqual(defaultJobFinderSettings, { usJobsOnly: true, preferRecent: true });
  assert.ok(prompt.startsWith(jobFinderInstructions));
  assert.ok(!prompt.includes('My questionnaire answers:'));
  for (const rule of [
    /upload one or more previous resumes/,
    /small groups.*do not repeat questions/,
    /without requiring an exhaustive interview/,
    /future request such as "Look for jobs"/,
    /faithful summary and the official listing link/,
    /Do not apply for jobs automatically/,
  ])
    assert.match(prompt, rule);
});

for (const usJobsOnly of [true, false]) {
  for (const preferRecent of [true, false]) {
    test(`settings independently control eligibility and ranking: US=${usJobsOnly}, recent=${preferRecent}`, () => {
      const settings = { usJobsOnly, preferRecent };
      const prompt = buildJobFinderPrompt(empty, settings);
      assert.ok(prompt.includes(`Search U.S. jobs only: ${usJobsOnly ? 'On' : 'Off'}`));
      assert.ok(
        prompt.includes(`Prefer recently posted positions: ${preferRecent ? 'On' : 'Off'}`),
      );
      assert.equal(
        prompt.includes('Restrict searches to positions based in the United States'),
        usJobsOnly,
      );
      assert.equal(
        prompt.includes('Allow international opportunities consistent with my other preferences'),
        !usJobsOnly,
      );
      assert.equal(prompt.includes('additional ranking priority'), preferRecent);
      assert.equal(prompt.includes('Do not intentionally favor newer jobs'), !preferRecent);
      if (usJobsOnly) {
        assert.match(prompt, /employment location and eligibility, not company headquarters/);
        assert.match(
          prompt,
          /Do not assume a generic "Remote" designation confirms U.S. eligibility/,
        );
      }
      assert.match(prompt, /potential scams across all sources and locations/);
      assert.match(prompt, /Never automatically exclude a job solely because of posting age/);
      assert.match(prompt, /Do not invent posting dates or assume an old listing is closed/);
      assert.match(prompt, /Keep older positions verified as active/);
      assert.deepEqual(settings, { usJobsOnly, preferRecent });
    });
  }
}

test('search policy orders discovery, fit and role deduplication before deeper verification and judgment', () => {
  const stages = [...jobFinderInstructions.matchAll(/Stage \d: ([^\n]+)/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(stages, [
    'Discover Broadly',
    'Screen for Meaningful Fit',
    'Remove Duplicates',
    'Verify Promising Opportunities',
    'Rank Opportunities',
    'Present Useful Results',
  ]);
  for (const rule of [
    /job boards and aggregators for discovery, employer careers pages/,
    /responsibilities rather than title alone/,
    /Do not require an arbitrary percentage/,
    /incidental technologies from substantial missing core qualifications/,
    /meeting one accepted alternative technology may be sufficient/,
    /not an exhaustive inventory of my skills/,
    /professional, personal, academic, transferable and nonexistent experience/,
    /ask a small number of relevant questions afterward/,
    /Do not.*claim an unverified skill as established experience/,
    /exact roles I intentionally rejected/,
    /job identifier or application URL/,
    /rejecting one position must not automatically exclude other jobs at that company/,
    /conversational memory may be incomplete/,
    /positive confidence signal, not a mandatory requirement/,
    /credible opportunities with incomplete verification/,
    /Do not recommend suspicious opportunities without further evidence/,
    /Use judgment, not a rigid numeric scoring formula/,
    /absolute minimum; do not reject compensation above expectations/,
    /Do not present unsuitable opportunities or pad results/,
    /verification confidence or important uncertainty/,
    /most significant concern or qualification gap/,
    /broad permanent exclusion without confirming/,
  ])
    assert.match(jobFinderInstructions, rule);
});

test('all seven answers are ordered and preserve multiline Unicode wording after edge trimming', () => {
  const answers = {
    roles: '  Développeuse / operations\n  Keep this indentation.  \nSecond line 🚀  ',
    location: ' Remote — Montréal ',
    mustHaves: ' No overnight shifts ',
    preferences: ' Small team ',
    salary: ' €70,000–90,000; flexible ',
    experience: ' Mid-level ',
    other: ' Industry change\nTraining experience ',
  };
  const prompt = buildJobFinderPrompt(answers);
  assert.equal(
    prompt,
    `${buildJobFinderPrompt(empty)}\n\nMy questionnaire answers:\n\nKinds of jobs:\nDéveloppeuse / operations\n  Keep this indentation.  \nSecond line 🚀\n\nWhere I would like to work:\nRemote — Montréal\n\nMust-haves (explicit non-negotiable requirements):\nNo overnight shifts\n\nNice-to-haves (flexible preferences):\nSmall team\n\nSalary range of interest:\n€70,000–90,000; flexible\n\nTarget experience level:\nMid-level\n\nOther considerations:\nIndustry change\nTraining experience`,
  );
  assert.equal(buildJobFinderPrompt(answers), prompt);
  assert.equal(answers.roles.startsWith('  '), true);
});

test('partial answers omit unanswered fields without adding preferences', () => {
  const prompt = buildJobFinderPrompt({ ...empty, other: ' Open to exploring ', roles: '\n\t' });
  assert.equal(
    prompt,
    `${buildJobFinderPrompt(empty)}\n\nMy questionnaire answers:\n\nOther considerations:\nOpen to exploring`,
  );
});
