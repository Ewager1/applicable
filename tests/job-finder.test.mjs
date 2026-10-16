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
    /no more than two missing-preference questions at a time/,
    /never force completion of an onboarding checklist or an exhaustive interview/,
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

function onboardingGuidance(prompt) {
  const guidance = prompt.split('\n\nAdaptive onboarding guidance:\n')[1];
  assert.ok(guidance, 'Prompt includes adaptive onboarding guidance');
  return guidance;
}

function knownAnswers(prompt) {
  return prompt
    .split('My questionnaire answers:\n\n')[1]
    ?.split('\n\nAdaptive onboarding guidance:')[0];
}

function unansweredLabels(prompt) {
  return [...onboardingGuidance(prompt).matchAll(/^- ([^:\n]+):/gm)].map((match) => match[1]);
}

const priorities = {
  roles: 'Kinds of jobs',
  location: 'Where I would like to work',
  mustHaves: 'Must-haves (explicit non-negotiable requirements)',
  salary: 'Salary range of interest',
};
const ready = {
  ...empty,
  roles: 'Operations coordinator',
  location: 'Remote in the United States',
  mustHaves: 'No overnight shifts',
  salary: '$70,000–90,000, flexible',
};

test('empty onboarding prioritizes unknown roles, location, must-haves and optional compensation', () => {
  const prompt = buildJobFinderPrompt(empty);
  assert.deepEqual(unansweredLabels(prompt), Object.values(priorities));
  assert.equal(knownAnswers(prompt), undefined);
  for (const rule of [
    /first response short and natural: briefly introduce Job Finder's purpose/,
    /If I don't have a resume, invite me to describe my experience conversationally/,
    /Review available career information before asking detailed questions/,
    /Treat supplied questionnaire answers as known preferences/,
    /Do not repeat questions already answered/,
    /unknown, not evidence that I have no preference/,
    /clear choice between discussing missing preferences and beginning the search/,
    /respect my choice to skip or defer/,
    /do not repeatedly ask for information I declined/,
    /request jobs immediately, start searching with available information/,
    /ask only the minimum clarification needed/,
    /Allow preferences to be updated later/,
    /jobs I like, bookmark, apply for or reject/,
    /Do not specifically interrogate me about an empty Other considerations field/,
    /titles or years alone do not establish it/,
  ])
    assert.match(prompt, rule);
  assert.match(
    onboardingGuidance(prompt),
    /Do not assume I want the exact title I previously held/,
  );
  assert.match(
    onboardingGuidance(prompt),
    /not a complete location or work-arrangement preference/,
  );
  assert.match(onboardingGuidance(prompt), /Do not assume I have none/);
  assert.match(onboardingGuidance(prompt), /range is helpful but optional/);
  assert.match(
    onboardingGuidance(prompt),
    /Do not invent salary expectations, impose an arbitrary minimum/,
  );
  assert.match(
    onboardingGuidance(prompt),
    /or automatically exclude jobs with undisclosed compensation/,
  );
});

test('all important preferences supplied allows readiness without reconfirming or lower-priority interviewing', () => {
  const prompt = buildJobFinderPrompt(ready);
  assert.deepEqual(unansweredLabels(prompt), []);
  assert.match(
    onboardingGuidance(prompt),
    /ready to search using my stated preferences without unnecessary reconfirmation/,
  );
  assert.ok(!onboardingGuidance(prompt).includes('Unanswered priority preferences'));
  for (const value of Object.values(ready).filter(Boolean))
    assert.ok(knownAnswers(prompt).includes(value));
  assert.equal(buildJobFinderPrompt(ready), prompt);
});

for (const [key, label] of Object.entries(priorities)) {
  test(`only missing ${key} receives priority guidance, including whitespace-only answers`, () => {
    const answers = { ...ready, [key]: ' \n\t ' };
    const before = { ...answers };
    const prompt = buildJobFinderPrompt(answers);
    assert.deepEqual(unansweredLabels(prompt), [label]);
    assert.equal(prompt, buildJobFinderPrompt({ ...answers, [key]: '' }));
    assert.equal(prompt, buildJobFinderPrompt(answers));
    assert.ok(!knownAnswers(prompt).includes(`${label}:`));
    assert.deepEqual(answers, before);
  });
}

test('several missing priorities are ordered independently of supplied lower-priority answers', () => {
  const answers = {
    ...ready,
    roles: '',
    salary: '',
    preferences: 'Small team',
    other: 'Industry change',
  };
  const prompt = buildJobFinderPrompt(answers);
  assert.deepEqual(unansweredLabels(prompt), [priorities.roles, priorities.salary]);
  assert.ok(knownAnswers(prompt).includes('Small team'));
  assert.ok(knownAnswers(prompt).includes('Industry change'));
  for (const usJobsOnly of [true, false]) {
    assert.deepEqual(
      unansweredLabels(buildJobFinderPrompt(answers, { usJobsOnly, preferRecent: false })),
      [priorities.roles, priorities.salary],
    );
  }
});

test('supplied uncertainty remains literal and must not become an invented resolved preference', () => {
  const prompt = buildJobFinderPrompt({
    ...ready,
    roles: "I don't know",
    salary: 'Prefer not to say',
  });
  assert.ok(knownAnswers(prompt).includes("Kinds of jobs:\nI don't know"));
  assert.ok(knownAnswers(prompt).includes('Salary range of interest:\nPrefer not to say'));
  assert.match(prompt, /Preserve uncertainty if an answer says I am unsure/);
  assert.match(onboardingGuidance(prompt), /Preserve any stated uncertainty; otherwise/);
  assert.match(prompt, /do not repeatedly ask for information I declined to provide/);
});

test('all seven answers are ordered and preserve multiline Unicode wording after edge trimming', () => {
  const answers = Object.freeze({
    roles: '  Développeuse / operations\n  Keep this indentation.  \nSecond line 🚀  ',
    location: ' Remote — Montréal ',
    mustHaves: ' No overnight shifts ',
    preferences: ' Small team ',
    salary: ' €70,000–90,000; flexible ',
    experience: ' Mid-level ',
    other: ' Industry change\nTraining experience ',
  });
  const prompt = buildJobFinderPrompt(answers);
  assert.equal(
    knownAnswers(prompt),
    'Kinds of jobs:\nDéveloppeuse / operations\n  Keep this indentation.  \nSecond line 🚀\n\nWhere I would like to work:\nRemote — Montréal\n\nMust-haves (explicit non-negotiable requirements):\nNo overnight shifts\n\nNice-to-haves (flexible preferences):\nSmall team\n\nSalary range of interest:\n€70,000–90,000; flexible\n\nTarget experience level:\nMid-level\n\nOther considerations:\nIndustry change\nTraining experience',
  );
  assert.deepEqual(unansweredLabels(prompt), []);
  assert.equal(buildJobFinderPrompt(answers), prompt);
  assert.equal(answers.roles.startsWith('  '), true);
});

test('partial answers preserve known text while omitted fields remain unknown', () => {
  const prompt = buildJobFinderPrompt({ ...empty, other: ' Open to exploring ', roles: '\n\t' });
  assert.equal(knownAnswers(prompt), 'Other considerations:\nOpen to exploring');
  assert.deepEqual(unansweredLabels(prompt), Object.values(priorities));
  assert.equal(onboardingGuidance(prompt), onboardingGuidance(buildJobFinderPrompt(empty)));
});
