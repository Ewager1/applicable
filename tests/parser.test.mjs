import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseResume } from '../app/resume/parse.js';

const source = await readFile(new URL('../examples/resume.txt', import.meta.url), 'utf8');
const blocks = source.trim().split(/\n(?=# )/);
const blockName = block => block.split('\n')[0].slice(2);
const replaceBlock = (name, replacement) => blocks.map(block => blockName(block) === name ? replacement : block).join('\n');
function rejected(text, message) {
  const result = parseResume(text);
  assert.equal(result.ok, false);
  assert.equal(Object.hasOwn(result, 'resume'), false, 'Never expose partially usable resume data');
  assert.ok(result.errors.length);
  assert.ok(result.errors.some(error => error.message.includes(message)), JSON.stringify(result.errors));
  assert.ok(result.errors.every(error => error.line === null || Number.isInteger(error.line) && error.line > 0));
  return result;
}

test('complete documented example preserves normalized resume data, links, and entry metadata', () => {
  const result = parseResume(source);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.deepEqual(result.resume, {
    name: 'Alex Morgan',
    contact: [{ text: 'Portland, OR' }, { text: '555-010-0142' }, { text: 'alex@example.com', link: 'mailto:alex@example.com' }, { text: 'example.com/alex', link: 'https://example.com/alex' }],
    title: 'Full-Stack Software Engineer',
    summary: 'Product-focused engineer building reliable web applications and accessible interfaces. Experienced with integrations, automated tests, and clear technical communication.',
    jobs: [
      { employer: 'Example Studio', role: 'Software Engineer', dates: '2023 - Present', location: 'Portland, OR', bullets: ['Built accessible interfaces using JavaScript and reusable components. Worked with design partners to preserve keyboard navigation and clear error messages.', 'Improved release reliability with focused automated checks.'] },
      { employer: 'Example Systems', role: 'Application Developer', dates: '2020 - 2023', location: 'Remote', bullets: ['Maintained API integrations and investigated production issues.'] },
    ],
    education: [{ institution: 'Example State University', qualification: 'Bachelor of Science, Computer Science', dates: '2016 - 2020' }],
    certifications: [{ title: 'Example Web Accessibility Certificate', issuer: 'Example Learning Institute', dates: '2024' }],
    skills: [{ category: 'Languages', items: 'JavaScript, TypeScript, Python, SQL' }, { category: 'Frontend', items: 'HTML, CSS, accessible interfaces' }, { category: 'Engineering', items: 'Automated testing, Git, API integrations' }],
  });
});

test('shuffled sections normalize presentation groups while reversed jobs stay reversed', () => {
  const reordered = blocks.slice().reverse().join('\n');
  const experience = blocks.find(block => blockName(block) === 'Relevant Experience');
  const jobs = experience.split(/\n(?=## Job)/).slice(1).reverse();
  const result = parseResume(reordered.replace(experience, `# Relevant Experience\n${jobs.join('\n')}`));
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.deepEqual(Object.keys(result.resume), ['name', 'contact', 'title', 'summary', 'jobs', 'education', 'certifications', 'skills']);
  assert.deepEqual(result.resume.jobs.map(job => job.employer), ['Example Systems', 'Example Studio']);
});

for (const name of blocks.map(blockName)) {
  test(`missing ${name} blocks export`, () => {
    rejected(blocks.filter(block => blockName(block) !== name).join('\n'), `${name} is missing`);
  });
  test(`blank ${name} blocks export`, () => {
    rejected(replaceBlock(name, `# ${name}\n  \n\t\n`), `Add content under ${name}`);
  });
}

test('empty and non-string input return usable errors', () => {
  for (const input of ['', ' \n\t ', null, undefined]) rejected(input, 'Paste a complete resume');
});

test('missing/blank name and contact values cannot count as contact information', () => {
  rejected(source.replace('Name: Alex Morgan\n', ''), 'Add your name');
  rejected(source.replace('Name: Alex Morgan', 'Name:   '), 'Add your name');
  rejected(replaceBlock('Contact', '# Contact\nName: Alex Morgan'), 'Add at least one contact detail');
  rejected(replaceBlock('Contact', '# Contact\nName: Alex Morgan\nContact:  '), 'Add a value after Contact:');
});

test('Unicode, colons in prose/metadata, duplicates and paragraph breaks preserve wording', () => {
  const input = source
    .replace('Employer: Example Studio', 'Employer: Studio: Example')
    .replace('Full-Stack Software Engineer', 'Développeur — “résumé”')
    .replace('Product-focused engineer building reliable web applications and accessible interfaces.\nExperienced with integrations, automated tests, and clear technical communication.', 'Résumé: café — “quoted text”.\nContinued  with two spaces.\n\nA second paragraph.')
    .replace('- Improved release reliability with focused automated checks.', '* Kept punctuation: commas, colons: and “quotes” — intact.\n\tSecond line retains  internal spaces.\n• Repeated bullet.\n- Repeated bullet.')
    .replace('Languages: JavaScript, TypeScript, Python, SQL', 'Languages: JavaScript,  JavaScript, C++\nLanguages: JavaScript');
  const result = parseResume(input);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.resume.title, 'Développeur — “résumé”');
  assert.equal(result.resume.jobs[0].employer, 'Studio: Example');
  assert.equal(result.resume.summary, 'Résumé: café — “quoted text”. Continued  with two spaces.\n\nA second paragraph.');
  assert.deepEqual(result.resume.jobs[0].bullets.slice(1), ['Kept punctuation: commas, colons: and “quotes” — intact. Second line retains  internal spaces.', 'Repeated bullet.', 'Repeated bullet.']);
  assert.deepEqual(result.resume.skills.slice(0, 2), [{ category: 'Languages', items: 'JavaScript,  JavaScript, C++' }, { category: 'Languages', items: 'JavaScript' }]);
});

test('labels accept case, outer spaces and CRLF without changing values', () => {
  const result = parseResume(`\uFEFF\n${source}`.replace('# Contact', '  # CONTACT  ').replace('Name: Alex Morgan', '  nAmE : Alex Morgan  ').replace('## Job', '## JOB').replace(/\n/g, '\r\n'));
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.deepEqual(result.resume, parseResume(source).resume);
});

test('repeated education/certification entries preserve source order and all metadata', () => {
  const input = source.replace('# Certifications', '## Education\nDates: 2021\nQualification: Example Diploma\nInstitution: Another Example School\n\n# Certifications')
    .replace('# Skills', '## Certification\nDates: Current\nTitle: Another Example Certificate\nIssuer: Example Institute\n\n# Skills');
  const result = parseResume(input);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.deepEqual(result.resume.education.map(entry => entry.qualification), ['Bachelor of Science, Computer Science', 'Example Diploma']);
  assert.deepEqual(result.resume.certifications[1], { dates: 'Current', title: 'Another Example Certificate', issuer: 'Example Institute' });
});

for (const [search, field] of [
  ['Employer: Example Studio', 'employer'], ['Role: Software Engineer', 'role'], ['Dates: 2023 - Present', 'dates'], ['Location: Portland, OR', 'location'],
  ['Institution: Example State University', 'institution'], ['Qualification: Bachelor of Science, Computer Science', 'qualification'], ['Dates: 2016 - 2020', 'dates'],
  ['Title: Example Web Accessibility Certificate', 'title'], ['Issuer: Example Learning Institute', 'issuer'], ['Dates: 2024', 'dates'],
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
  rejected('Unassigned text\n' + source, 'Put this content under a section heading');
});

test('malformed/duplicate metadata and unsupported entry boundaries block export', () => {
  rejected(source.replace('Employer: Example Studio', 'Organization: Example Studio'), 'Unrecognized content in this job');
  rejected(source.replace('Role: Software Engineer', 'Role: Software Engineer\nRole: Another Role'), 'role appears more than once');
  rejected(source.replace('## Job\n', ''), 'Start each job with ## Job');
  rejected(source.replace('## Education', '## University'), 'Start each education entry');
  rejected(source.replace('## Certification', '## Certificate'), 'Start each certification entry');
  rejected(source.replace('Name: Alex Morgan', 'Name: Alex Morgan\nName: Alex Morgan'), 'Name appears more than once');
});

test('bullet continuations accept mixed horizontal indentation but reject a single space', () => {
  const expected = parseResume(source).resume.jobs[0].bullets[0];
  for (const indentation of ['\t  ', '  \t', ' \t', ' \t \t ', '\t', '  ']) {
    const result = parseResume(source.replace('  Worked with design', `${indentation}Worked with design`));
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(result.resume.jobs[0].bullets[0], expected);
  }
  rejected(source.replace('  Worked with design', ' Worked with design'), 'Indent continued bullet text');
});

test('empty bullets, missing bullets and unrecognized bullet text are errors', () => {
  rejected(source.replace('- Improved release reliability with focused automated checks.', '-   '), 'Add text after the job bullet marker');
  rejected(source.replace('- Maintained API integrations and investigated production issues.', ''), 'Add at least one bullet');
  rejected(source.replace('  Worked with design', 'Worked with design'), 'Indent continued bullet text');
  rejected(source.replace('- Built accessible interfaces using JavaScript and reusable components.', '  Continued text without a bullet.'), 'Put continued bullet text after a job bullet');
  rejected(source.replace('- Improved release reliability with focused automated checks.', 'Unexpected: value'), 'Indent continued bullet text');
});

test('empty/malformed skill rows, unsupported colons, and headings are rejected', () => {
  for (const row of ['Languages:', 'Languages:  ', ': JavaScript', 'Languages: JavaScript, , SQL', 'Languages: ,SQL', 'Languages: SQL,']) {
    rejected(replaceBlock('Skills', `# Skills\n${row}`), 'Add a skill category and at least one skill');
  }
  rejected(replaceBlock('Skills', '# Skills\nLanguages JavaScript'), 'Use one colon');
  rejected(replaceBlock('Skills', '# Skills\nCloud: Services: AWS'), 'Use one colon');
  rejected(replaceBlock('Skills', '# Skills\n## Languages: JavaScript'), 'without extra headings');
});

test('contact links preserve destinations without inventing or executing markup', () => {
  for (const link of ['[Email](javascript:alert(1))', '[Email](file:///tmp/a)', '[Email](mailto:)', '[Email](https://some where)', '[broken](https://example.com', '[](https://example.com)']) {
    rejected(source.replace('[alex@example.com](mailto:alex@example.com)', link), 'Use a complete contact link');
  }
  const result = parseResume(source.replace('Contact: Portland, OR', 'Contact: email: available upon request'));
  assert.equal(result.ok, true);
  assert.equal(result.resume.contact[0].text, 'email: available upon request');
});

test('title extra lines, extra summary headings and code fences produce errors', () => {
  rejected(source.replace('Full-Stack Software Engineer', 'Full-Stack Software Engineer\nAnother line'), 'Use one plain-text line');
  rejected(source.replace('Product-focused engineer', '## Extra heading\nProduct-focused engineer'), 'Use plain-text paragraphs');
  rejected('```text\n' + source + '\n```', 'Put this content under a section heading');
});

test('failures report the original source line without exposing a partial resume', () => {
  const input = source.replace('Role: Software Engineer', 'Unexpected field');
  const result = rejected(input, 'Unrecognized content in this job');
  assert.ok(result.errors.some(error => error.line === input.split('\n').findIndex(line => line === 'Unexpected field') + 1));
});
