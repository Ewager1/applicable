import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumeFilename } from '../app/download-filename.ts';

test('title and optional company retain readable capitalization, Unicode and punctuation', () => {
  assert.equal(resumeFilename('Full-Stack Software Engineer'), 'Full-Stack Software Engineer Resume.pdf');
  assert.equal(resumeFilename('  Senior   Engineer  ', ' \t '), 'Senior Engineer Resume.pdf');
  assert.equal(resumeFilename('Développeuse C++', '  Société & Co.  '), 'Développeuse C++ at Société & Co. Resume.pdf');
});

test('unsafe paths, platform characters and hidden controls cannot escape the filename', () => {
  const name = resumeFilename('../Lead: Engineer<>', 'ACME/West\\East | "Team"?*\u0000\u202E');
  assert.equal(name, '.. Lead Engineer at ACME West East Team Resume.pdf');
  assert.equal(/[<>:"/\\|?*\p{Cc}\p{Cf}]/u.test(name), false);
  assert.equal(resumeFilename('', ' '), 'Resume.pdf');
  assert.equal(resumeFilename('///', '*?'), 'Resume.pdf');
  assert.equal(resumeFilename('Lead \uD800 Engineer'), 'Lead Engineer Resume.pdf');
  assert.equal(resumeFilename('CON'), 'CON Resume.pdf');
});

test('long Unicode filenames fit a portable UTF-8 byte budget and keep their PDF suffix', () => {
  for (const [title, company] of [['Engineer', '測試'.repeat(300)], ['É'.repeat(300), 'ACME'], ['🧑‍💻'.repeat(100), '']]) {
    const name = resumeFilename(title, company);
    assert.ok(Buffer.byteLength(name, 'utf8') <= 180);
    assert.ok(name.endsWith(' Resume.pdf'));
    assert.equal(name.includes('\uFFFD'), false);
    assert.equal(name, resumeFilename(title, company));
  }
});

test('bounding keeps both filename parts and a coherent separator', () => {
  assert.equal(resumeFilename('X'.repeat(166), 'Acme'), `${'X'.repeat(161)} at Acme Resume.pdf`);
  assert.equal(resumeFilename('Engineer', 'C'.repeat(300)), `Engineer at ${'C'.repeat(157)} Resume.pdf`);
  assert.equal(resumeFilename('É'.repeat(300), '測試'), `${'É'.repeat(79)} at 測試 Resume.pdf`);
  const bothLong = resumeFilename('É'.repeat(300), '測'.repeat(300));
  assert.equal(bothLong, `${'É'.repeat(41)} at ${'測'.repeat(27)} Resume.pdf`);
  assert.ok(Buffer.byteLength(bothLong, 'utf8') <= 180);
});
