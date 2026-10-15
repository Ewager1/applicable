import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { browserOptions } from './browser-options.mjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parsedExample } from '../proof/production-fixtures.mjs';
const source = await readFile(new URL('../examples/resume.txt', import.meta.url), 'utf8');
const compact = text => text.replace(/\s/g, '');
let browser;
before(async () => { browser = await chromium.launch(browserOptions()); });
after(async () => { await browser.close(); });

async function openPage(t, { pdfViewer, ...options } = {}) {
  const page = await browser.newPage({ acceptDownloads: true, ...options });
  t.after(() => page.close());
  const remote = [], errors = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.origin !== 'http://127.0.0.1:4174') remote.push(request.url());
  });
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => { assert.deepEqual(remote, []); assert.deepEqual(errors, []); });
  if (pdfViewer === false) await page.addInitScript(() => Object.defineProperty(navigator, 'pdfViewerEnabled', { get: () => false }));
  await page.goto('http://127.0.0.1:4174/');
  return page;
}
async function submit(page) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
  return event;
}
async function readPdf(download) {
  assert.equal(download.suggestedFilename(), 'resume.pdf');
  const bytes = await readFile(await download.path());
  const pdf = await getDocument({ data: Uint8Array.from(bytes) }).promise;
  try {
    const texts = [], annotations = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      texts.push((await page.getTextContent()).items.map(item => item.str).join(''));
      annotations.push(...await page.getAnnotations());
    }
    return { bytes, text: compact(texts.join('')), annotations };
  } finally { await pdf.destroy(); }
}
async function artifactUrls(page) {
  return page.evaluate(async () => {
    const download = document.querySelector('#download').href;
    const preview = document.querySelector('#preview').src;
    return { download, preview, bytes: Array.from(new Uint8Array(await (await fetch(preview)).arrayBuffer())) };
  });
}

// This replaces the shell smoke test: exercise the built application end to end.
test('symbol markers and an outer text code block export complete ordered PDF content after correction', async t => {
  const page = await openPage(t);
  const input = page.getByLabel('Your resume', { exact: true });
  const invalid = source.replace(/@@EDUCATION@@[\s\S]*?(?=@@CERTIFICATIONS@@)/, '');
  const downloads = [];
  page.on('download', event => downloads.push(event));
  await input.fill(invalid);
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
  await page.getByText('Education is missing. Add @@EDUCATION@@.', { exact: true }).waitFor();
  assert.equal(await input.inputValue(), invalid);
  assert.equal(await input.getAttribute('aria-invalid'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'error-summary');
  assert.equal(await page.locator('#result').isVisible(), false);
  assert.equal(downloads.length, 0);
  const corrected = '```text\n' + source + '\n```';
  await input.fill(corrected);
  const event = page.waitForEvent('download');
  await input.press('Control+Enter');
  const pdf = await readPdf(await event);
  assert.equal(pdf.text.includes('@@CONTACT@@'), false, 'Structural markers do not print');
  assert.equal(pdf.text.includes('```'), false, 'Outer code fences do not print');
  assert.equal(await input.inputValue(), corrected);
  const fields = [parsedExample.name, ...parsedExample.contact.map(item => item.text), parsedExample.title, parsedExample.summary,
    ...parsedExample.jobs.flatMap(job => [job.employer, job.role, job.dates, job.location, ...job.bullets]),
    ...parsedExample.education.flatMap(entry => Object.values(entry)), ...parsedExample.certifications.flatMap(entry => Object.values(entry)),
    ...parsedExample.skills.flatMap(row => [row.category, row.items])];
  for (const field of fields) assert.ok(pdf.text.includes(compact(field)), `Missing PDF field: ${field}`);
  assert.ok(pdf.text.indexOf('ExampleStudio') < pdf.text.indexOf('ExampleSystems'));
  assert.ok(pdf.text.indexOf('EDUCATION') < pdf.text.indexOf('CERTIFICATIONS'));
  assert.ok(pdf.text.indexOf('CERTIFICATIONS') < pdf.text.indexOf('SKILLS'));
  assert.deepEqual([...new Set(pdf.annotations.filter(annotation => annotation.subtype === 'Link').map(annotation => annotation.url))].sort(), ['https://example.com/alex', 'mailto:alex@example.com'].sort());
  assert.equal(downloads.length, 1, 'One automatic download for one submission');
  assert.equal(await page.evaluate(() => navigator.pdfViewerEnabled), true, 'Native viewer is available in this browser mode');
  const artifact = await artifactUrls(page);
  assert.equal(artifact.download, artifact.preview);
  assert.deepEqual(Buffer.from(artifact.bytes), pdf.bytes);
  assert.equal(await page.locator('#error-summary').isVisible(), false);
  assert.equal(await page.locator('#resume-form').getAttribute('aria-busy'), 'false');
  const repeat = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download PDF' }).click();
  assert.deepEqual((await readPdf(await repeat)).bytes, pdf.bytes);
  await mkdir('output/ui', { recursive: true });
  await mkdir('output/pdf', { recursive: true });
  await writeFile('output/pdf/application-resume.pdf', pdf.bytes);
  await page.screenshot({ path: 'output/ui/desktop-preview.png', fullPage: true });
});

test('without native PDF viewing, one download is delivered with a usable fallback link', async t => {
  const page = await openPage(t, { pdfViewer: false });
  const downloads = [];
  page.on('download', download => downloads.push(download));
  await page.getByLabel('Your resume', { exact: true }).fill(source);
  const first = await readPdf(await submit(page));
  await page.getByText('Your browser does not display PDFs here. Use Download PDF to open your resume.', { exact: true }).waitFor();
  assert.equal(await page.locator('#preview').getAttribute('src'), null);
  assert.equal(await page.locator('#preview').isVisible(), false);
  assert.equal(downloads.length, 1);
  const repeat = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download PDF' }).click();
  assert.deepEqual((await readPdf(await repeat)).bytes, first.bytes);
});

test('unsupported displayed glyphs block download and allow correction without losing text', async t => {
  const page = await openPage(t);
  const input = page.getByLabel('Your resume', { exact: true });
  const invalid = source.replace('Product-focused engineer', '😀 Product-focused engineer');
  const downloads = [];
  page.on('download', download => downloads.push(download));
  await input.fill(invalid);
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
  await page.locator('#error-list').filter({ hasText: 'resume font cannot display' }).waitFor();
  assert.equal(await input.inputValue(), invalid);
  assert.equal(downloads.length, 0);
  assert.equal(await page.locator('#result').isVisible(), false);
  await input.fill(source);
  assert.ok((await readPdf(await submit(page))).text.includes('AlexMorgan'));
});

for (const kind of ['unavailable', 'corrupt']) {
  test(`${kind} local font failure is recoverable by retrying the same text`, async t => {
    const page = await openPage(t);
    let fail = true;
    await page.route(/SourceSans3-.*\.ttf/, route => fail ? route.fulfill({ status: kind === 'unavailable' ? 503 : 200, contentType: 'font/ttf', body: 'not a font' }) : route.continue());
    const input = page.getByLabel('Your resume', { exact: true });
    const downloads = [];
    page.on('download', download => downloads.push(download));
    await input.fill(source);
    await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
    await page.locator('#error-list').filter({ hasText: kind === 'unavailable' ? 'fonts could not be loaded' : 'PDF could not be created' }).waitFor();
    assert.equal(await input.inputValue(), source);
    assert.equal(downloads.length, 0);
    assert.equal(await page.locator('#result').isVisible(), false);
    fail = false;
    assert.ok((await readPdf(await submit(page))).text.includes('AlexMorgan'));
  });
}

test('edits during pending fonts discard stale output and repeated submissions do not queue downloads', async t => {
  const page = await openPage(t);
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route(/SourceSans3-Regular-.*\.ttf/, async route => { await held; await route.continue(); });
  const input = page.getByLabel('Your resume', { exact: true });
  const downloads = [];
  page.on('download', download => downloads.push(download));
  try {
    await input.fill(source);
    const request = page.waitForRequest(/SourceSans3-Regular-.*\.ttf/);
    await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
    await request;
    assert.equal(await page.locator('#create-pdf').isDisabled(), true);
    await page.evaluate(() => { document.querySelector('#resume-form').requestSubmit(); document.querySelector('#resume-form').requestSubmit(); });
    const edited = source.replace('Alex Morgan', 'Jamie Example');
    await input.fill(edited);
    release();
    await page.waitForFunction(() => !document.querySelector('#create-pdf').disabled);
    assert.equal(downloads.length, 0);
    assert.equal(await page.locator('#result').isVisible(), false);
    assert.equal(await input.inputValue(), edited);
    const pdf = await readPdf(await submit(page));
    assert.ok(pdf.text.includes('JamieExample'));
    assert.equal(pdf.text.includes('AlexMorgan'), false);
    assert.equal(downloads.length, 1);
  } finally { release(); }
});

test('editing an exported resume removes and revokes the old artifact before regeneration', async t => {
  const page = await openPage(t);
  const input = page.getByLabel('Your resume', { exact: true });
  await input.fill(source);
  await submit(page);
  const url = (await artifactUrls(page)).download;
  await input.fill(source.replace('Alex Morgan', 'Jamie Example'));
  assert.equal(await page.locator('#result').isVisible(), false);
  assert.equal(await page.locator('#download').getAttribute('href'), null);
  assert.equal(await page.locator('#preview').getAttribute('src'), null);
  assert.equal(await page.evaluate(async url => { try { await fetch(url); return false; } catch { return true; } }, url), true);
  const pdf = await readPdf(await submit(page));
  assert.ok(pdf.text.includes('JamieExample'));
  assert.notEqual((await artifactUrls(page)).download, url);
});

test('interface stays within narrow and wide viewports, grows with input and keeps submit above it', async t => {
  const page = await openPage(t, { viewport: { width: 1280, height: 1000 } });
  await mkdir('output/ui', { recursive: true });
  for (const [name, width, height] of [['desktop', 1280, 1000], ['mobile', 390, 844]]) {
    await page.setViewportSize({ width, height });
    const input = page.getByLabel('Your resume', { exact: true });
    await input.fill('');
    const initial = await input.boundingBox();
    await page.screenshot({ path: `output/ui/${name}-empty.png`, fullPage: true });
    await input.fill(source);
    const expanded = await input.boundingBox();
    const button = await page.locator('#create-pdf').boundingBox();
    assert.ok(expanded.height > initial.height, 'Textarea expands with content');
    assert.ok(button.y + button.height <= expanded.y, 'Submit stays above the text input');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'No horizontal overflow');
    await page.screenshot({ path: `output/ui/${name}-filled.png`, fullPage: true });
  }
});
