import test from 'node:test';
import assert from 'node:assert/strict';
import pdfMake from 'pdfmake/build/pdfmake.js';
import { createPdfBytes } from '../app/pdf/render.js';
import { fontFiles } from '../app/pdf/fonts.js';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { renderPdf } from '../proof/pdf.mjs';
import { parsedExample, stressFixture } from '../proof/production-fixtures.mjs';
import { fontHashes, supportedRanges } from '../app/pdf/font-coverage.js';

const compact = value => value.replace(/\s/g, '');
const values = resume => [resume.name, ...resume.contact.map(row => row.text), resume.title, resume.summary,
  ...resume.jobs.flatMap(job => [job.employer, job.role, job.dates, job.location, ...job.bullets]),
  ...resume.education.flatMap(entry => [entry.qualification, entry.institution, entry.dates]),
  ...resume.certifications.flatMap(entry => [entry.title, entry.dates, entry.issuer]),
  ...resume.skills.flatMap(row => [row.category, row.items])];
async function inspect(resume) {
  const bytes = await renderPdf(resume);
  const pdf = await getDocument({ data: Uint8Array.from(bytes) }).promise;
  const pages = [];
  try {
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const { items } = await page.getTextContent();
      const visible = items.filter(item => item.str.trim());
      assert.ok(visible.length, 'No blank pages');
      for (const item of visible) {
        assert.ok(item.transform[4] >= 42 && item.transform[4] + item.width <= 570, `Horizontal clipping: ${item.str}`);
        assert.ok(item.transform[5] >= 42 && item.transform[5] <= 750, `Vertical clipping: ${item.str}`);
      }
      // Different columns may share a baseline; their horizontal intervals cannot overlap.
      for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) {
        const a = visible[i], b = visible[j];
        if (Math.abs(a.transform[5] - b.transform[5]) < 0.1) {
          assert.ok(a.transform[4] + a.width <= b.transform[4] + 0.2 || b.transform[4] + b.width <= a.transform[4] + 0.2, `Overlapping text: ${a.str} / ${b.str}`);
        }
      }
      pages.push({ items, text: compact(items.map(item => item.str).join('')), annotations: await page.getAnnotations() });
    }
    const all = pages.map(page => page.text).join('');
    for (const value of values(resume)) assert.ok(all.includes(compact(value)), `Lost content: ${value.slice(0, 120)}`);
    return pages;
  } finally { await pdf.destroy(); }
}

test('parsed example renders every field in production order and preserves exact link targets', async () => {
  const pages = await inspect(parsedExample);
  const all = pages.map(page => page.text).join('');
  let position = -1;
  for (const text of [parsedExample.name, parsedExample.title, parsedExample.summary, 'RELEVANT EXPERIENCE', ...parsedExample.jobs.map(job => job.employer), 'EDUCATION', parsedExample.education[0].qualification, parsedExample.education[0].institution, 'CERTIFICATIONS', parsedExample.certifications[0].title, parsedExample.certifications[0].issuer, 'SKILLS', ...parsedExample.skills.map(row => row.category)]) {
    const next = all.indexOf(compact(text), position + 1);
    assert.ok(next > position, `Incorrect order: ${text}`);
    position = next;
  }
  const links = new Set(pages.flatMap(page => page.annotations.filter(annotation => annotation.subtype === 'Link').map(annotation => annotation.url)));
  assert.deepEqual([...links].sort(), ['https://example.com/alex', 'mailto:alex@example.com'].sort());
  const items = pages.flatMap(page => page.items);
  const qualification = items.find(item => item.str.includes('Bachelor'));
  const institution = items.find(item => item.str.includes('Example') && item.transform[5] < qualification.transform[5]);
  assert.ok(qualification.transform[5] > institution.transform[5], 'Qualification is above institution');
  assert.notEqual(qualification.fontName, institution.fontName, 'Qualification is bold; institution uses body weight');
});

test('production PDF preserves deliberately reversed job order', async () => {
  const resume = structuredClone(parsedExample);
  resume.jobs.reverse();
  const all = (await inspect(resume)).map(page => page.text).join('');
  assert.ok(all.indexOf(compact(resume.jobs[0].employer)) < all.indexOf(compact(resume.jobs[1].employer)));
});

for (const kind of ['split-job', 'multi-page-bullet', 'long-values']) {
  test(`${kind}: complete text without clipping or column overlap`, async () => {
    const resume = stressFixture(kind);
    const pages = await inspect(resume);
    if (kind !== 'long-values') assert.ok(pages.length >= 2, 'Fixture must exercise real page transitions');
    if (kind === 'split-job') {
      const firstPage = pages.findIndex(page => page.text.includes(compact(resume.jobs[0].employer)));
      const lastBullet = pages.findIndex(page => page.text.includes('Bullet24:'));
      assert.ok(lastBullet > firstPage, 'One job spans pages');
      assert.ok(pages[firstPage].text.includes('Bullet1:'), 'Job header stays with its first bullet');
    }
    if (kind === 'multi-page-bullet') {
      assert.ok(pages[0].text.includes('Beginningofonelongbullet.'), 'Job header shares the beginning of the long bullet');
      assert.ok(pages.slice(1).some(page => page.text.includes('Endofthesamelongbullet.')), 'Same bullet continues onto later pages');
    }
    for (const [heading, following] of [['EDUCATION', resume.education[0].qualification], ['CERTIFICATIONS', resume.certifications[0].title], ['SKILLS', resume.skills[0].category]]) {
      const page = pages.find(page => page.text.includes(heading));
      assert.ok(page.text.includes(compact(following).slice(0, 30)), `Orphaned ${heading}`);
    }
  });
}

test('font coverage matches exact bundled assets and required glyphs', async () => {
  for (const [file, expected] of Object.entries(fontHashes)) {
    const bytes = await readFile(new URL(`../assets/fonts/${file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected);
  }
  for (const character of 'résumé café “quotes” — •') assert.ok(supportedRanges.some(([first, last]) => character.codePointAt(0) >= first && character.codePointAt(0) <= last));
});

test('paragraph breaks and structural tabs do not trigger glyph errors', async () => {
  const resume = structuredClone(parsedExample);
  resume.summary += '\n\nA second paragraph.\tWith structural whitespace.';
  await inspect(resume);
});

test('unsupported displayed characters fail recoverably; Unicode link destinations are preserved', async () => {
  for (const character of ['😀', '漢', '\u0000']) {
    const resume = structuredClone(parsedExample);
    resume.summary += character;
    await assert.rejects(renderPdf(resume), /resume font cannot display.*U\+/);
    assert.ok(resume.summary.endsWith(character), 'Source model remains available for correction');
  }
  const resume = structuredClone(parsedExample);
  resume.contact[3].link = 'https://example.com/漢';
  const pages = await inspect(resume);
  assert.ok(pages.flatMap(page => page.annotations).some(annotation => annotation.unsafeUrl === 'https://example.com/漢' || annotation.url === 'https://example.com/%E6%BC%A2'));
});

test('missing or corrupt local fonts reject recoverably instead of leaving generation pending', async () => {
  await assert.rejects(createPdfBytes(parsedExample, pdfMake, {}), /local resume fonts are missing/);
  const corrupt = Object.fromEntries(fontFiles.map(file => [file, Buffer.from('not a font').toString('base64')]));
  await assert.rejects(createPdfBytes(parsedExample, pdfMake, corrupt), error => {
    assert.match(error.message, /PDF could not be created/);
    assert.match(error.cause.message, /Unknown font format/);
    return true;
  });
});
