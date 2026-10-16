import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseResume } from '../src/resume/parse.ts';

const source = await readFile(new URL('./fixtures/legacy-resume.txt', import.meta.url), 'utf8');
const blocks = source.trim().split(/\n(?=# )/);
const contactBlock = blocks[0];
const bodyBlocks = blocks.slice(1);
const blockName = (block) => block.split('\n')[0].slice(2);
const replaceBlock = (name, replacement) =>
  blocks.map((block) => (blockName(block) === name ? replacement : block)).join('\n');
function rejected(text, message) {
  const result = parseResume(text);
  assert.equal(result.ok, false);
  assert.equal(Object.hasOwn(result, 'resume'), false, 'Never expose partially usable resume data');
  assert.ok(result.errors.length);
  assert.ok(
    result.errors.some((error) => error.message.includes(message)),
    JSON.stringify(result.errors),
  );
  assert.ok(
    result.errors.every(
      (error) => error.line === null || (Number.isInteger(error.line) && error.line > 0),
    ),
  );
  return result;
}

test('legacy example preserves normalized resume data, links, and entry metadata', () => {
  const result = parseResume(source);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.deepEqual(result.resume, {
    name: 'Alex Morgan',
    contact: [
      { text: 'alex@example.com', link: 'mailto:alex@example.com' },
      {
        text: 'https://linkedin.com/in/example-alex',
        link: 'https://linkedin.com/in/example-alex',
      },
      { text: 'example.com/alex', link: 'https://example.com/alex' },
      { text: '555-010-0142' },
    ],
    title: 'Full-Stack Software Engineer',
    summary:
      'Product-focused engineer building reliable web applications and accessible interfaces. Experienced with integrations, automated tests, and clear technical communication.',
    jobs: [
      {
        employer: 'Example Studio',
        role: 'Software Engineer',
        dates: '2023 - Present',
        location: 'Portland, OR',
        bullets: [
          'Built accessible interfaces using JavaScript and reusable components. Worked with design partners to preserve keyboard navigation and clear error messages.',
          'Improved release reliability with focused automated checks.',
        ],
      },
      {
        employer: 'Example Systems',
        role: 'Application Developer',
        dates: '2020 - 2023',
        location: 'Remote',
        bullets: ['Maintained API integrations and investigated production issues.'],
      },
    ],
    education: [
      {
        institution: 'Example State University',
        qualification: 'Bachelor of Science, Computer Science',
        dates: '2016 - 2020',
      },
    ],
    certifications: [
      {
        title: 'Example Web Accessibility Certificate',
        issuer: 'Example Learning Institute',
        dates: '2024',
      },
    ],
    skills: [
      { category: 'Languages', items: 'JavaScript, TypeScript, Python, SQL' },
      { category: 'Frontend', items: 'HTML, CSS, accessible interfaces' },
      { category: 'Engineering', items: 'Automated testing, Git, API integrations' },
    ],
  });
});

test('shuffled sections normalize presentation groups while reversed jobs stay reversed', () => {
  const reordered = blocks.slice().reverse().join('\n');
  const experience = blocks.find((block) => blockName(block) === 'Relevant Experience');
  const jobs = experience
    .split(/\n(?=## Job)/)
    .slice(1)
    .reverse();
  const result = parseResume(
    reordered.replace(experience, `# Relevant Experience\n${jobs.join('\n')}`),
  );
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.deepEqual(Object.keys(result.resume), [
    'name',
    'contact',
    'title',
    'summary',
    'jobs',
    'education',
    'certifications',
    'skills',
  ]);
  assert.deepEqual(
    result.resume.jobs.map((job) => job.employer),
    ['Example Systems', 'Example Studio'],
  );
});

for (const name of bodyBlocks.map(blockName)) {
  test(`omitted ${name} is accepted with an empty canonical value`, () => {
    const result = parseResume(blocks.filter((block) => blockName(block) !== name).join('\n'));
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    const field = {
      'Professional Title': 'title',
      Summary: 'summary',
      'Relevant Experience': 'jobs',
      Education: 'education',
      Certifications: 'certifications',
      Skills: 'skills',
    }[name];
    assert.deepEqual(result.resume[field], ['title', 'summary'].includes(field) ? '' : []);
  });
  test(`blank ${name} blocks export`, () => {
    rejected(replaceBlock(name, `# ${name}\n  \n\t\n`), `Add content under ${name}`);
  });
}

test('empty and non-string input return usable errors', () => {
  for (const input of ['', ' \n\t ', null, undefined]) rejected(input, 'Paste a complete resume');
});

test('Unicode, colons in prose/metadata, duplicates and paragraph breaks preserve wording', () => {
  const input = source
    .replace('Employer: Example Studio', 'Employer: Studio: Example')
    .replace('Full-Stack Software Engineer', 'Développeur — “résumé”')
    .replace(
      'Product-focused engineer building reliable web applications and accessible interfaces.\nExperienced with integrations, automated tests, and clear technical communication.',
      'Résumé: café — “quoted text”.\nContinued  with two spaces.\n\nA second paragraph.',
    )
    .replace(
      '- Improved release reliability with focused automated checks.',
      '* Kept punctuation: commas, colons: and “quotes” — intact.\n\tSecond line retains  internal spaces.\n• Repeated bullet.\n- Repeated bullet.',
    )
    .replace(
      'Languages: JavaScript, TypeScript, Python, SQL',
      'Languages: JavaScript,  JavaScript, C++\nLanguages: JavaScript',
    );
  const result = parseResume(input);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.resume.title, 'Développeur — “résumé”');
  assert.equal(result.resume.jobs[0].employer, 'Studio: Example');
  assert.equal(
    result.resume.summary,
    'Résumé: café — “quoted text”. Continued  with two spaces.\n\nA second paragraph.',
  );
  assert.deepEqual(result.resume.jobs[0].bullets.slice(1), [
    'Kept punctuation: commas, colons: and “quotes” — intact. Second line retains  internal spaces.',
    'Repeated bullet.',
    'Repeated bullet.',
  ]);
  assert.deepEqual(result.resume.skills.slice(0, 2), [
    { category: 'Languages', items: 'JavaScript,  JavaScript, C++' },
    { category: 'Languages', items: 'JavaScript' },
  ]);
});

test('labels accept case, outer spaces and CRLF without changing values', () => {
  const result = parseResume(
    `\uFEFF\n${source}`
      .replace('# Professional Title', '  # PROFESSIONAL  TITLE  ')
      .replace('## Job', '## JOB')
      .replace(/\n/g, '\r\n'),
  );
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.deepEqual(result.resume, parseResume(source).resume);
});

test('repeated education/certification entries preserve source order and all metadata', () => {
  const input = source
    .replace(
      '# Certifications',
      '## Education\nDates: 2021\nQualification: Example Diploma\nInstitution: Another Example School\n\n# Certifications',
    )
    .replace(
      '# Skills',
      '## Certification\nDates: Current\nTitle: Another Example Certificate\nIssuer: Example Institute\n\n# Skills',
    );
  const result = parseResume(input);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.deepEqual(
    result.resume.education.map((entry) => entry.qualification),
    ['Bachelor of Science, Computer Science', 'Example Diploma'],
  );
  assert.deepEqual(result.resume.certifications[1], {
    dates: 'Current',
    title: 'Another Example Certificate',
    issuer: 'Example Institute',
  });
});

for (const [search, field] of [
  ['Employer: Example Studio', 'employer'],
  ['Role: Software Engineer', 'role'],
  ['Dates: 2023 - Present', 'dates'],
  ['Location: Portland, OR', 'location'],
  ['Institution: Example State University', 'institution'],
  ['Qualification: Bachelor of Science, Computer Science', 'qualification'],
  ['Dates: 2016 - 2020', 'dates'],
  ['Title: Example Web Accessibility Certificate', 'title'],
  ['Issuer: Example Learning Institute', 'issuer'],
  ['Dates: 2024', 'dates'],
]) {
  test(`missing and blank entry value: ${search.split(':')[0]} (${search.split(': ')[1]})`, () => {
    rejected(source.replace(`${search}\n`, ''), `Add ${field} for`);
    rejected(source.replace(search, `${search.split(':')[0]}:   `), `Add ${field} for`);
  });
}

test('unknown and duplicate sections report their location and never export partial data', () => {
  const unknown = rejected(`${source}\n# Awards\nAn award`, 'Unknown section');
  assert.equal(unknown.errors[0].line, source.split('\n').length + 1);
  rejected(`${source}\n# Skills\nOther: Something`, 'Skills appears more than once');
  rejected('Unassigned text\n' + source, 'Put this content under a section marker');
});

test('malformed/duplicate metadata and unsupported entry boundaries block export', () => {
  rejected(
    source.replace('Employer: Example Studio', 'Organization: Example Studio'),
    'Unrecognized content in this job',
  );
  rejected(
    source.replace('Role: Software Engineer', 'Role: Software Engineer\nRole: Another Role'),
    'role appears more than once',
  );
  rejected(source.replace('## Job\n', ''), 'Start each job with @@JOB@@');
  rejected(source.replace('## Education', '## University'), 'Start each education entry');
  rejected(source.replace('## Certification', '## Certificate'), 'Start each certification entry');
});

test('bullet continuations accept mixed horizontal indentation but reject a single space', () => {
  const expected = parseResume(source).resume.jobs[0].bullets[0];
  for (const indentation of ['\t  ', '  \t', ' \t', ' \t \t ', '\t', '  ']) {
    const result = parseResume(
      source.replace('  Worked with design', `${indentation}Worked with design`),
    );
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(result.resume.jobs[0].bullets[0], expected);
  }
  rejected(
    source.replace('  Worked with design', ' Worked with design'),
    'Indent continued bullet text',
  );
});

test('empty bullets, missing bullets and unrecognized bullet text are errors', () => {
  rejected(
    source.replace('- Improved release reliability with focused automated checks.', '-   '),
    'Add text after the job bullet marker',
  );
  rejected(
    source.replace('- Maintained API integrations and investigated production issues.', ''),
    'Add at least one bullet',
  );
  rejected(
    source.replace('  Worked with design', 'Worked with design'),
    'Indent continued bullet text',
  );
  rejected(
    source.replace(
      '- Built accessible interfaces using JavaScript and reusable components.',
      '  Continued text without a bullet.',
    ),
    'Put continued bullet text after a job bullet',
  );
  rejected(
    source.replace(
      '- Improved release reliability with focused automated checks.',
      'Unexpected: value',
    ),
    'Indent continued bullet text',
  );
});

test('empty/malformed skill rows, unsupported colons, and headings are rejected', () => {
  for (const row of [
    'Languages:',
    'Languages:  ',
    ': JavaScript',
    'Languages: JavaScript, , SQL',
    'Languages: ,SQL',
    'Languages: SQL,',
  ]) {
    rejected(
      replaceBlock('Skills', `# Skills\n${row}`),
      'Add a skill category and at least one skill',
    );
  }
  rejected(replaceBlock('Skills', '# Skills\nLanguages JavaScript'), 'Use one colon');
  rejected(replaceBlock('Skills', '# Skills\nCloud: Services: AWS'), 'Use one colon');
  rejected(replaceBlock('Skills', '# Skills\n## Languages: JavaScript'), 'without extra headings');
});

test('title extra lines, extra summary headings and code fences produce errors', () => {
  rejected(
    source.replace('Full-Stack Software Engineer', 'Full-Stack Software Engineer\nAnother line'),
    'Use one plain-text line',
  );
  rejected(
    source.replace('Product-focused engineer', '## Extra heading\nProduct-focused engineer'),
    'Use plain-text paragraphs',
  );
  rejected('```javascript\n' + source + '\n```', 'Other code-block formats are not supported');
});

test('failures report the original source line without exposing a partial resume', () => {
  const input = source.replace('Role: Software Engineer', 'Unexpected field');
  const result = rejected(input, 'Unrecognized content in this job');
  assert.ok(
    result.errors.some(
      (error) =>
        error.line === input.split('\n').findIndex((line) => line === 'Unexpected field') + 1,
    ),
  );
});

const symbolSource = await readFile(new URL('../examples/resume.txt', import.meta.url), 'utf8');
const symbolSections = [
  'PROFESSIONAL_TITLE',
  'SUMMARY',
  'RELEVANT_EXPERIENCE',
  'EDUCATION',
  'CERTIFICATIONS',
  'SKILLS',
];
const symbolBlocks = symbolSource
  .trim()
  .split(
    /\n(?=@@(?:CONTACT|PROFESSIONAL_TITLE|SUMMARY|RELEVANT_EXPERIENCE|EDUCATION|CERTIFICATIONS|SKILLS)@@)/,
  );

test('preferred symbol markers produce exactly the complete legacy model', () => {
  assert.deepEqual(parseResume(symbolSource), parseResume(source));
});

test('symbol sections can reorder and repeat entries without sorting jobs or other content', () => {
  const experience = symbolBlocks.find((block) => block.startsWith('@@RELEVANT_EXPERIENCE@@'));
  const jobs = experience
    .split(/\n(?=@@JOB@@)/)
    .slice(1)
    .reverse();
  const reordered = symbolBlocks
    .slice()
    .reverse()
    .join('\n')
    .replace(experience, `@@RELEVANT_EXPERIENCE@@\n${jobs.join('\n')}`)
    .replace(
      'Dates: 2016 - 2020',
      'Dates: 2016 - 2020\n@@EDUCATION_ENTRY@@\nInstitution: Another Example School\nQualification: Example Diploma\nDates: 2021',
    )
    .replace(
      'Dates: 2024',
      'Dates: 2024\n@@CERTIFICATION@@\nTitle: Another Example Certificate\nIssuer: Example Institute\nDates: Current',
    );
  const result = parseResume(reordered);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.deepEqual(
    result.resume.jobs.map((job) => job.employer),
    ['Example Systems', 'Example Studio'],
  );
  assert.deepEqual(
    result.resume.education.map((entry) => entry.qualification),
    ['Bachelor of Science, Computer Science', 'Example Diploma'],
  );
  assert.deepEqual(
    result.resume.certifications.map((entry) => entry.title),
    ['Example Web Accessibility Certificate', 'Another Example Certificate'],
  );
});

test('safe mixed symbol and legacy controls retain case/whitespace and line-ending tolerance', () => {
  const mixed = symbolSource
    .replace('@@PROFESSIONAL_TITLE@@', '# professional  title')
    .replace('@@JOB@@', '## JOB')
    .replace('@@EDUCATION@@', '# Education')
    .replace('@@CERTIFICATION@@', '## Certification')
    .replace('@@SUMMARY@@', '  @@summary@@  ')
    .replace(/\n/g, '\r\n');
  assert.deepEqual(parseResume(mixed), parseResume(source));
});

for (const marker of symbolSections) {
  test(`symbol ${marker}: omission works while blank included content blocks export`, () => {
    const title = marker.toLowerCase().replaceAll('_', ' ');
    const block = symbolBlocks.find((block) => block.startsWith(`@@${marker}@@`));
    const missing = parseResume(symbolBlocks.filter((value) => value !== block).join('\n'));
    const blank = parseResume(
      symbolBlocks.map((value) => (value === block ? `@@${marker}@@\n \t` : value)).join('\n'),
    );
    assert.equal(missing.ok, true, JSON.stringify(missing.errors));
    for (const result of [blank]) {
      assert.equal(result.ok, false);
      assert.equal(Object.hasOwn(result, 'resume'), false);
      assert.ok(result.errors.some((error) => error.message.toLowerCase().includes(title)));
    }
  });
}

test('symbol format keeps required fields and rejects malformed or wrong entry boundaries', () => {
  rejected(symbolSource.replace('Issuer: Example Learning Institute', 'Issuer:  '), 'Add issuer');
  rejected(
    symbolSource.replace('Languages: JavaScript, TypeScript, Python, SQL', 'Languages:'),
    'Add a skill category',
  );
  rejected(
    symbolSource.replace('@@EDUCATION_ENTRY@@', '@@JOB@@'),
    'Start each education entry with @@EDUCATION_ENTRY@@',
  );
  rejected(symbolSource + '\n# Skills\nOther: Something', 'Skills appears more than once');
});

test('unknown/malformed/start-of-line symbol controls never silently become prose', () => {
  for (const marker of [
    '@@AWARDS@@',
    '@@SUMMARY@',
    '@SUMMARY@',
    'SUMMARY@@',
    '@@SUMMARY@@ trailing text',
    '@@ PROFESSIONAL_TITLE @@',
    '@@JOB@@@@JOB@@',
  ]) {
    const input = symbolSource.replace('@@SUMMARY@@', `@@SUMMARY@@\n${marker}`);
    const result = rejected(input, 'recognized @@MARKER@@ on its own line');
    assert.equal(result.errors[0].line, input.split('\n').indexOf(marker) + 1);
  }
  rejected(
    symbolSource.replace('@@SUMMARY@@', '@@SUMMARY@@\n@@JOB@@'),
    'Use plain-text paragraphs',
  );
});

test('inline symbol-looking content remains literal in values, summary, bullets and skills', () => {
  const input = symbolSource
    .replace(
      'Product-focused engineer',
      'Explained @@PLACEHOLDER@@ tokens. Product-focused engineer',
    )
    .replace(
      '- Improved release reliability with focused automated checks.',
      '- Explained @@JOB@@ tokens without changing them.',
    )
    .replace(
      'Languages: JavaScript, TypeScript, Python, SQL',
      'Languages: JavaScript, @@EXAMPLE@@, JavaScript',
    );
  const result = parseResume(input);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.ok(result.resume.summary.startsWith('Explained @@PLACEHOLDER@@ tokens.'));
  assert.equal(result.resume.jobs[0].bullets[1], 'Explained @@JOB@@ tokens without changing them.');
  assert.equal(result.resume.skills[0].items, 'JavaScript, @@EXAMPLE@@, JavaScript');
});

test('one optional outer plain/text code block works without shifting source line numbers', () => {
  for (const language of ['', 'text', 'plaintext', 'TEXT']) {
    assert.deepEqual(
      parseResume(`\n\u0060\u0060\u0060${language}\n${symbolSource}\n\u0060\u0060\u0060\n`),
      parseResume(symbolSource),
    );
  }
  const input =
    '\n```text\n' +
    symbolSource.replace(
      'Role: Software Engineer',
      'Role: Software Engineer\nRole: Duplicate role',
    ) +
    '\n```\n';
  const result = rejected(input, 'role appears more than once');
  assert.ok(
    result.errors.some(
      (error) => error.line === input.split('\n').indexOf('Role: Duplicate role') + 1,
    ),
  );
});

test('unknown, nested, unclosed and exterior-content fences block the entire resume', () => {
  const invalid = [
    '```javascript\n' + symbolSource + '\n```',
    '```text\n' + symbolSource,
    'Commentary before\n```text\n' + symbolSource + '\n```',
    '```text\n' + symbolSource + '\n```\nCommentary after',
    '~~~text\n' + symbolSource + '\n~~~',
    '```text\n```text\n' + symbolSource + '\n```\n```',
  ];
  for (const input of invalid) {
    const result = parseResume(input);
    assert.equal(result.ok, false);
    assert.equal(Object.hasOwn(result, 'resume'), false);
    assert.equal(
      result.errors.length,
      1,
      'One actionable fence error instead of cascaded warnings',
    );
    assert.ok(result.errors[0].message.includes('code block'));
  }
});

test('unmarked resumes and missing entry controls get concise errors without heading inference', () => {
  const unmarked = symbolSource.replace(/^@@([^\n]+)@@$/gm, (_, name) => name.replaceAll('_', ' '));
  const result = rejected(unmarked, 'section marker');
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].line, 1);
  const jobs = rejected(symbolSource.replaceAll('@@JOB@@\n', ''), 'Start each job with @@JOB@@');
  assert.equal(jobs.errors.length, 1);
  const preamble = rejected(
    'A name\nA contact detail\nMore commentary\n' + symbolSource,
    'section marker',
  );
  assert.equal(preamble.errors.length, 1);
});

for (const name of bodyBlocks.map(blockName)) {
  test(`only ${name} supplies the minimum meaningful body`, () => {
    const block = blocks.find((value) => blockName(value) === name);
    const result = parseResume(`${contactBlock}\n${block}`);
    assert.equal(result.ok, true, JSON.stringify(result.errors));
  });
}
test('a few meaningful sections work without title, summary, jobs, education or certifications', () => {
  const result = parseResume(
    '@@CONTACT@@\nName: Synthetic Name\n@@SKILLS@@\nEngineering: Automated testing, Git',
  );
  assert.deepEqual(result, {
    ok: true,
    targetCompany: '',
    resume: {
      name: 'Synthetic Name',
      contact: [],
      title: '',
      summary: '',
      jobs: [],
      education: [],
      certifications: [],
      skills: [{ category: 'Engineering', items: 'Automated testing, Git' }],
    },
  });
  rejected('@@SUMMARY@@\nUseful summary.\n@@EDUCATION@@', 'Add content under Education');
  rejected('@@EDUCATION@@\n@@EDUCATION_ENTRY@@\nQualification: Diploma', 'Add institution');
  rejected('```text\n\n```', 'at least one nonempty body section');
});

const bodyOnly = bodyBlocks.join('\n');
test('pasted contact metadata supplies the name and preserves optional display/order and safe links', () => {
  const result = parseResume(`@@CONTACT@@
 Website: https://example.com/é
 NAME: Taylor  Example
 Phone:
 LinkedIn: available on request
 Email: taylor@example.com
@@SUMMARY@@
Useful supplied experience.`);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.resume.name, 'Taylor  Example');
  assert.deepEqual(result.resume.contact, [
    { text: 'taylor@example.com', link: 'mailto:taylor@example.com' },
    { text: 'available on request' },
    { text: 'https://example.com/é', link: 'https://example.com/%C3%A9' },
  ]);
  assert.equal(result.targetCompany, '');
});

test('metadata and body sections reorder with legacy, mixed, whitespace and case tolerance', () => {
  const result = parseResume(
    `  @@target_company@@  \r\nSociété: Example Team\r\n${bodyOnly}\r\n # CONTACT \r\n nAmE : Alex Morgan\r\n`,
  );
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.resume.name, 'Alex Morgan');
  assert.equal(result.targetCompany, 'Société: Example Team');
  assert.deepEqual(result.resume.jobs, parseResume(source).resume.jobs);
  assert.equal(
    Object.hasOwn(result.resume, 'targetCompany'),
    false,
    'Filename metadata stays outside the PDF model',
  );
  const legacy = parseResume(`# Target Company\nExample Company\n${source}`);
  assert.equal(legacy.ok, true);
  assert.equal(legacy.targetCompany, 'Example Company');
});

test('older body-only input receives contact migration guidance without using external values', () => {
  const result = rejected(bodyOnly, 'Add @@CONTACT@@ with Name:');
  assert.equal(result.errors[0].line, null);
  rejected(`@@CONTACT@@\nEmail: person@example.com\n${bodyOnly}`, 'Add name for Contact');
  rejected(`@@CONTACT@@\nName:  \n${bodyOnly}`, 'Add name for Contact');
  rejected(`@@CONTACT@@\n${bodyOnly}`, 'Add name for Contact');
});

test('contact alone and contact plus target company never count as meaningful body content', () => {
  for (const input of [
    '@@CONTACT@@\nName: Taylor Example',
    '@@CONTACT@@\nName: Taylor Example\n@@TARGET_COMPANY@@\nExample Company',
  ])
    rejected(input, 'at least one nonempty body section');
});

test('unknown, duplicate and malformed contact values report source lines without partial data', () => {
  for (const line of [
    'Contact: person@example.com',
    'Location: Somewhere',
    'Name Taylor Example',
    '## Job',
  ]) {
    const result = rejected(
      `@@CONTACT@@\nName: Taylor Example\n${line}\n@@SUMMARY@@\nUseful experience.`,
      'Unrecognized content in Contact',
    );
    assert.ok(result.errors.some((error) => error.line === 3));
  }
  const duplicate = rejected(
    `@@CONTACT@@\nName: Taylor Example\nNAME: Other Name\n@@SUMMARY@@\nUseful experience.`,
    'name appears more than once',
  );
  assert.equal(duplicate.errors[0].line, 3);
  rejected(`${source}\n@@CONTACT@@\nName: Other Name`, 'Contact appears more than once');
  rejected(`${source}\n@@CONTACT@\nName: Other Name`, 'recognized @@MARKER@@');
  rejected(
    source.replace('Email: alex@example.com', 'Email: alex@example.com\nEmail:'),
    'email appears more than once',
  );
});

test('included target company must contain one plain line and cannot repeat', () => {
  for (const value of ['', '  \t', 'Example Company\nSecond line', '## Extra heading']) {
    rejected(
      `${source}\n@@TARGET_COMPANY@@\n${value}`,
      value.trim()
        ? 'Use one plain-text line under Target Company'
        : 'Add content under Target Company',
    );
  }
  rejected(
    `${source}\n@@TARGET_COMPANY@@\nOne\n# Target Company\nTwo`,
    'Target Company appears more than once',
  );
  rejected(`${source}\n@@TARGET_COMPANY@\nOne`, 'recognized @@MARKER@@');
});
