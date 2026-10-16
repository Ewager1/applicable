import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildJobFinderPrompt, jobFinderInstructions } from '../src/job-finder/prompt.ts';

const empty = {
  roles: '',
  location: '',
  mustHaves: '',
  preferences: '',
  salary: '',
  experience: '',
  other: '',
};

test('blank answers produce only standard onboarding, search and feedback instructions', () => {
  const prompt = buildJobFinderPrompt({ ...empty, salary: ' \n\t ' });
  assert.equal(prompt, jobFinderInstructions);
  for (const rule of [
    'upload one or more previous resumes',
    'employment history, skills, education and accomplishments',
    'contradictory employment dates, titles, qualifications',
    'small groups',
    'do not repeat questions',
    'without requiring an exhaustive interview',
    'ready to search',
    'search the live internet',
    'adjacent job titles and transferable skills',
    'explicit non-negotiable requirements',
    'not a strict exclusion',
    'official applicant tracking system links',
    'verification is incomplete',
    'qualification gaps',
    'accessible and permitted to share',
    'faithful summary and the official listing link',
    'conversational memory may be incomplete',
    'permanent exclusion',
    'Never invent job listings, compensation or qualifications',
    'Do not apply for jobs automatically',
  ])
    assert.ok(prompt.includes(rule), `Missing rule: ${rule}`);
  assert.ok(!prompt.includes('My questionnaire answers:'));
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
    `${jobFinderInstructions}\n\nMy questionnaire answers:\n\nKinds of jobs:\nDéveloppeuse / operations\n  Keep this indentation.  \nSecond line 🚀\n\nWhere I would like to work:\nRemote — Montréal\n\nMust-haves (explicit non-negotiable requirements):\nNo overnight shifts\n\nNice-to-haves (flexible preferences):\nSmall team\n\nSalary range of interest:\n€70,000–90,000; flexible\n\nTarget experience level:\nMid-level\n\nOther considerations:\nIndustry change\nTraining experience`,
  );
  assert.equal(buildJobFinderPrompt(answers), prompt);
  assert.equal(answers.roles.startsWith('  '), true);
});

test('partial answers omit unanswered fields without adding preferences', () => {
  const prompt = buildJobFinderPrompt({ ...empty, other: ' Open to exploring ', roles: '\n\t' });
  assert.equal(
    prompt,
    `${jobFinderInstructions}\n\nMy questionnaire answers:\n\nOther considerations:\nOpen to exploring`,
  );
});
