import test from 'node:test';
import assert from 'node:assert/strict';
import pdfMake from 'pdfmake/build/pdfmake.js';
import { createPdfBytes } from '../app/pdf/render.ts';
import { measuredPageCount, firstMeasuredPage } from '../app/pdf/pdfmake-adapter.ts';
import { fontFiles } from '../app/pdf/fonts.ts';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { renderPdf } from '../proof/pdf.mjs';
import { parsedExample, stressFixture } from '../proof/production-fixtures.mjs';
import { fontHashes, supportedRanges } from '../app/pdf/font-coverage.ts';
import { createRequire } from 'node:module';
import { fonts } from '../app/pdf/fonts.ts';
import { documentDefinition } from '../app/pdf/document.ts';
import { createPagination } from '../app/pdf/pagination.ts';
const require = createRequire(import.meta.url);
const fontkit = createRequire(require.resolve('pdfmake/package.json'))('@foliojs-fork/fontkit');

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
  assert.deepEqual([...links].sort(), ['https://example.com/alex', 'https://linkedin.com/in/example-alex', 'mailto:alex@example.com'].sort());
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

test('a heading keeps its meaningful content across a page boundary despite an inserted spacer', async () => {
  const fontData = Object.fromEntries(await Promise.all(fontFiles.map(async file => [file, (await readFile(new URL(`../assets/fonts/${file}`, import.meta.url))).toString('base64')])));
  for (const linked of [false, true]) {
    const heading = { text: 'Boundary heading' };
    const firstContent = { text: 'First meaningful content' };
    const pagination = createPagination();
    if (linked) pagination.keepWith(heading, firstContent);
    const definition = {
      pageSize: { width: 612, height: 220 },
      pageMargins: [43, 43, 43, 43],
      defaultStyle: { font: 'SourceSans3', fontSize: 9.75 },
      content: [
        { text: 'Preceding content', margin: [0, 0, 0, 90] },
        heading,
        { text: '', margin: [0, 0, 0, 10] },
        firstContent,
      ],
      pageBreakBefore: pagination.pageBreakBefore,
    };
    const bytes = await new Promise((resolve, reject) => {
      const stream = pdfMake.createPdf(definition, undefined, fonts, fontData).getStream();
      const chunks = [];
      stream.on('data', chunk => chunks.push(chunk));
      stream.once('error', reject);
      stream.once('end', () => resolve(Buffer.concat(chunks)));
      stream.end();
    });
    const pdf = await getDocument({ data: Uint8Array.from(bytes) }).promise;
    try {
      assert.equal(pdf.numPages, 2);
      const pages = [];
      for (let number = 1; number <= pdf.numPages; number++) {
        pages.push(compact((await (await pdf.getPage(number)).getTextContent()).items.map(item => item.str).join('')));
      }
      assert.ok(pages[0].includes('Precedingcontent'));
      const headingPage = pages.findIndex(text => text.includes('Boundaryheading'));
      const contentPage = pages.findIndex(text => text.includes('Firstmeaningfulcontent'));
      assert.equal(contentPage, 1, 'Fixture forces the meaningful content onto the next page');
      assert.equal(headingPage, linked ? contentPage : 0, 'Explicit relationship moves heading past the boundary rather than keeping only the spacer');
    } finally { await pdf.destroy(); }
  }
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
  let intersection;
  for (const [file, expected] of Object.entries(fontHashes)) {
    const bytes = await readFile(new URL(`../assets/fonts/${file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected);
    const font = fontkit.create(bytes);
    const codes = font.characterSet.filter(code => font.hasGlyphForCodePoint(code));
    intersection = intersection ? intersection.filter(code => codes.includes(code)) : codes;
  }
  const generated = supportedRanges.flatMap(([first, last]) => Array.from({ length: last - first + 1 }, (_, index) => first + index));
  assert.deepEqual(generated, intersection.sort((a, b) => a - b), 'Coverage is exactly the intersection of actual bundled font glyphs');
  for (const character of 'résumé café “quotes” — • Δ Ж') assert.ok(supportedRanges.some(([first, last]) => character.codePointAt(0) >= first && character.codePointAt(0) <= last));
});

test('static Source Sans 3 files and PDF semantic styles use distinct real weights', async () => {
  for (const [file, weight] of [['SourceSans3-Regular.ttf', 400], ['SourceSans3-Semibold.ttf', 600], ['SourceSans3-Bold.ttf', 700]]) {
    const font = fontkit.create(await readFile(new URL(`../assets/fonts/${file}`, import.meta.url)));
    assert.equal(font.postscriptName, file.replace('.ttf', ''));
    assert.equal(font['OS/2'].usWeightClass, weight);
    assert.deepEqual(font.variationAxes, {}, 'Bundled fonts are static TTFs');
  }
  const definition = documentDefinition(parsedExample);
  assert.equal(fonts[definition.defaultStyle.font].normal, 'SourceSans3-Regular.ttf');
  assert.equal(fonts[definition.defaultStyle.font].bold, 'SourceSans3-Bold.ttf');
  assert.equal(fonts[definition.styles.sectionHeading.font].normal, 'SourceSans3-Semibold.ttf');
  const resume = structuredClone(parsedExample);
  resume.summary += ' Greek Δ and Cyrillic Ж remain selectable.';
  await inspect(resume);
});

test('rendered hierarchy and shared dates use real semantic weights, sizes and palette across repeated entries', async () => {
  const resume = structuredClone(parsedExample);
  resume.name = 'CandidateName';
  resume.title = 'ProfessionalTitle';
  resume.summary = 'Measured line one.\nMeasured line two.';
  resume.jobs.forEach((job, index) => {
    job.employer = `Employer${index}`;
    job.role = `Role${index}`;
    job.location = `Location${index}`;
    job.dates = `0${index + 1}/2021-0${index + 1}/2023`;
  });
  resume.education = [0, 1].map(index => ({ qualification: `Qualification${index}`, institution: `Institution${index}`, dates: `0${index + 3}/2011-0${index + 3}/2015` }));
  resume.certifications = [0, 1].map(index => ({ title: `Certificate${index}`, issuer: `Issuer${index}`, dates: `0${index + 5}/2024` }));
  const pdf = await getDocument({ data: await renderPdf(resume), useSystemFonts: false }).promise;
  const items = [], paint = [], dividers = [];
  try {
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const operators = await page.getOperatorList();
      const visible = (await page.getTextContent()).items.filter(item => item.str.trim());
      items.push(...visible.map(item => ({ ...item, identity: page.commonObjs.get(item.fontName).name })));
      let fill, stroke, fontSize, width, path;
      for (let index = 0; index < operators.fnArray.length; index++) {
        const op = operators.fnArray[index], args = operators.argsArray[index];
        if (op === OPS.setFillRGBColor) fill = Array.from(args);
        if (op === OPS.setStrokeRGBColor) stroke = Array.from(args);
        if (op === OPS.setFont) fontSize = args[1];
        if (op === OPS.setLineWidth) width = args[0];
        if (op === OPS.constructPath) path = args;
        if (op === OPS.showText) paint.push({ text: args[0].map(glyph => typeof glyph === 'object' ? glyph.unicode : '').join(''), fill, fontSize });
        if (op === OPS.stroke && stroke?.join() === '216,222,230') {
          assert.deepEqual(path[0], [OPS.moveTo, OPS.lineTo], 'Divider is a vector line');
          const [x1, y1, x2, y2] = path[1];
          assert.equal(width, 0.5);
          assert.equal(y1, y2);
          assert.equal(x2, 569, 'Rule extends to right content margin');
          const y = page.view[3] - y1;
          const adjacent = visible.filter(item => Math.abs(item.transform[5] - y) < 5);
          assert.ok(adjacent.length, 'Rule remains alongside its heading');
          const textRight = Math.max(...adjacent.map(item => item.transform[4] + item.width));
          assert.ok(Math.abs(x1 - textRight - 9) < 0.1, 'Rule begins after heading with a modest gap');
          for (const item of visible) {
            if (y >= item.transform[5] - 2 && y <= item.transform[5] + item.height) assert.ok(item.transform[4] + item.width < x1 || item.transform[4] > x2, `Rule overlaps ${item.str}`);
          }
          dividers.push(path);
        }
      }
    }
    const check = (text, weight, size, color) => {
      const item = items.find(item => item.str === text);
      assert.ok(item, `Missing text: ${text}`);
      assert.ok(item.identity.endsWith(`SourceSans3-${weight}`), `${text} uses actual ${weight}`);
      assert.equal(item.transform[0], size);
      const painted = paint.find(item => item.text.trim() === text);
      assert.deepEqual(painted?.fill, color, `${text} uses the intended color`);
    };
    check('CandidateName', 'Bold', 20, [31, 78, 95]);
    check('ProfessionalTitle', 'Semibold', 11.5, [32, 37, 43]);
    check('alex@example.com', 'Regular', 9.5, [75, 85, 99]);
    check('Measured', 'Regular', 9.75, [32, 37, 43]);
    check('Languages:', 'Semibold', 9.75, [32, 37, 43]);
    for (const job of resume.jobs) {
      check(job.employer, 'Semibold', 10.75, [32, 37, 43]);
      check(job.role, 'Semibold', 10.25, [32, 37, 43]);
      check(job.location, 'Semibold', 9.5, [75, 85, 99]);
    }
    for (const entry of [...resume.jobs, ...resume.education, ...resume.certifications]) check(entry.dates, 'Semibold', 9.5, [32, 37, 43]);
    for (const entry of resume.education) check(entry.institution, 'Regular', 9.75, [32, 37, 43]);
    for (const entry of resume.certifications) check(entry.issuer, 'Regular', 9.75, [32, 37, 43]);
    for (const heading of ['RELEVANT', 'EXPERIENCE', 'EDUCATION', 'CERTIFICATIONS', 'SKILLS']) check(heading, 'Semibold', 9.75, [31, 78, 95]);
    const headingFont = fontkit.create(await readFile(new URL('../assets/fonts/SourceSans3-Semibold.ttf', import.meta.url)));
    const education = items.find(item => item.str === 'EDUCATION');
    const untrackedWidth = headingFont.layout('EDUCATION').advanceWidth * 9.75 / headingFont.unitsPerEm;
    assert.ok(Math.abs(education.width - untrackedWidth - 8 * 0.68) < 0.001, 'Rendered heading tracking is approximately 0.07em');
    assert.equal(dividers.length, 4, 'Every section has its real remaining-width divider');
    assert.ok(paint.every(item => ['31,78,95', '32,37,43', '75,85,99'].includes(item.fill?.join())), 'All visible text uses the new palette');
    const first = items.find(item => item.str === 'Measured');
    assert.ok(first.identity.endsWith('SourceSans3-Regular'));
    const baselines = [...new Set(items.filter(item => item.str === 'Measured').map(item => item.transform[5]))];
    assert.equal(baselines.length, 2);
    assert.ok(Math.abs((baselines[0] - baselines[1]) / 9.75 - 1.326) < 0.001, 'Actual body baselines meet the 1.3–1.35em target');
    await inspect(resume);
  } finally { await pdf.destroy(); }
});

test('frozen pre-refresh data retains complete content and approximately two pages after restyling', async () => {
  const resume = JSON.parse(await readFile(new URL('../proof/baseline/pre-refresh/resume.json', import.meta.url), 'utf8'));
  const old = await readFile(new URL('../proof/baseline/pre-refresh/poppins.pdf', import.meta.url));
  assert.equal(createHash('sha256').update(old).digest('hex'), '7213c5c4d8b49726cf9796eda75cdd58cd8a73949e5d697a5df2739ad4bdc02c', 'Old PDF is unchanged');
  const before = await getDocument({ data: Uint8Array.from(old) }).promise;
  try { assert.equal(before.numPages, 2); } finally { await before.destroy(); }
  assert.equal((await inspect(resume)).length, 2, 'Identical complete content still occupies two pages');
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
  resume.contact[2].link = 'https://example.com/漢';
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

test('large headers retain every word through the measured one-page boundary', async () => {
  for (const count of [250, 269]) {
    const resume = structuredClone(parsedExample);
    resume.jobs[0].employer = `BEGIN ${'Longword '.repeat(count)} ENDMARKER`;
    const original = structuredClone(resume);
    const pages = await inspect(resume);
    const headerPage = pages.findIndex(page => page.text.includes('BEGIN'));
    assert.equal(pages.findIndex(page => page.text.includes('ENDMARKER')), headerPage);
    assert.equal(pages.findIndex(page => page.text.includes('RELEVANTEXPERIENCE')), headerPage);
    assert.equal(pages.findIndex(page => page.text.includes('Builtaccessibleinterfaces')), headerPage, 'Header stays with beginning of first bullet');
    assert.deepEqual(resume, original, 'Measuring and rendering do not modify supplied content');
  }
});

test('overflowing unbreakable job details reject recoverably without character-count or text-matching guesses', async () => {
  for (const [field, count] of [['employer', 270], ['employer', 287], ['employer', 300], ['role', 600], ['dates', 600], ['location', 600]]) {
    const resume = structuredClone(parsedExample);
    resume.jobs[0][field] = `BEGIN ${'Longword '.repeat(count)} ENDMARKER`;
    // The same text elsewhere must not disguise a dropped header.
    resume.summary = resume.jobs[0][field];
    const original = structuredClone(resume);
    await assert.rejects(renderPdf(resume), /top of job 1.*too long to fit with the beginning.*one page/);
    assert.deepEqual(resume, original, 'Original source data remains available for correction');
  }
  const resume = structuredClone(parsedExample);
  resume.jobs[0].employer = 'Longword '.repeat(180);
  resume.jobs[0].role = 'Longword '.repeat(180);
  await assert.rejects(renderPdf(resume), /top of job 1.*too long to fit with the beginning.*one page/);
});

test('long body text, a multi-page first bullet and Unicode metadata retain natural continuation', async () => {
  const resume = structuredClone(parsedExample);
  resume.summary = 'Longword '.repeat(300);
  resume.jobs[0].employer = 'Équipe Δ Ж '.repeat(80);
  resume.jobs[0].bullets[0] = 'Long first bullet '.repeat(400);
  await inspect(resume);
});

test('education and certification headings reject impossible keep-groups coherently', async () => {
  const resume = structuredClone(parsedExample);
  resume.education[0].qualification = 'Long qualification '.repeat(400);
  await assert.rejects(renderPdf(resume), /education entry 1.*too long to fit with the beginning/);
  resume.education[0].qualification = parsedExample.education[0].qualification;
  resume.certifications[0].title = 'Long certificate '.repeat(400);
  await assert.rejects(renderPdf(resume), /certification entry 1.*too long to fit with the beginning/);
});

test('unavailable pinned layout metadata blocks export and cleans up the measurement stream', async () => {
  const fontData = Object.fromEntries(fontFiles.map(file => [file, 'placeholder']));
  let destroyed = false;
  const engine = { createPdf: () => ({ getStream: () => ({ destroy: () => { destroyed = true; } }) }) };
  await assert.rejects(createPdfBytes(parsedExample, engine, fontData), /PDF layout could not be checked.*no PDF was created/);
  assert.equal(destroyed, true);
});


test('pinned layout boundary rejects malformed pages and impossible positions', () => {
  for (const pages of [null, {}, [], [null], [{ items: null }], [{ items: [] }], [{ items: [{ type: 'image' }] }]]) {
    assert.equal(measuredPageCount({ _pdfMakePages: pages }), undefined);
  }
  assert.equal(measuredPageCount({ _pdfMakePages: [{ items: [{ type: 'line' }] }] }), 1);
  for (const positions of [null, {}, [], [null], [{}], [{ pageNumber: '1' }], [{ pageNumber: 0 }], [{ pageNumber: 1.5 }], [{ pageNumber: 3 }]]) {
    assert.equal(firstMeasuredPage({ positions }, 2), undefined);
  }
  assert.equal(firstMeasuredPage({ positions: [{ pageNumber: 2 }] }, 2), 2);
});

test('name-only PDF omits the contact row and displays the complete body', async () => {
  const resume = structuredClone(parsedExample);
  resume.contact = [];
  const definition = documentDefinition(resume);
  assert.equal(definition.content.some(node => node.style === 'contact'), false);
  const pages = await inspect(resume);
  assert.equal(pages.flatMap(page => page.annotations).length, 0);
  const items = pages[0].items;
  const name = items.find(item => item.str.includes('Alex'));
  const title = items.find(item => item.str === 'Full-');
  assert.ok(name.transform[5] - title.transform[5] < 35, 'No empty contact-row spacing');
});
