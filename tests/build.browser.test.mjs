import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { browserOptions } from './browser-options.mjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parsedExample, exampleContact } from '../proof/production-fixtures.mjs';
const source = await readFile(new URL('../examples/resume.txt', import.meta.url), 'utf8');
const chatbotInstructions = await readFile(
  new URL('../examples/chatbot-instruction.md', import.meta.url),
  'utf8',
);
const compact = (text) => text.replace(/\s/g, '');
let browser;
before(async () => {
  browser = await chromium.launch(browserOptions());
});
after(async () => {
  await browser.close();
});

async function openPage(t, { pdfViewer, ...options } = {}) {
  const page = await browser.newPage({ acceptDownloads: true, ...options });
  t.after(() => page.close());
  const remote = [],
    errors = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      ['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) &&
      url.origin !== 'http://127.0.0.1:4174'
    )
      remote.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  t.after(() => {
    assert.deepEqual(remote, []);
    assert.deepEqual(errors, []);
  });
  if (pdfViewer === false)
    await page.addInitScript(() =>
      Object.defineProperty(navigator, 'pdfViewerEnabled', { get: () => false }),
    );
  await page.goto('http://127.0.0.1:4174/');
  for (const [id, value] of Object.entries(exampleContact))
    await page.locator(`#${id}`).fill(value);
  return page;
}
async function submit(page) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
  return event;
}
async function readPdf(download, filename = 'Full-Stack Software Engineer Resume.pdf') {
  assert.equal(download.suggestedFilename(), filename);
  const bytes = await readFile(await download.path());
  const pdf = await getDocument({ data: Uint8Array.from(bytes) }).promise;
  try {
    const texts = [],
      annotations = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      texts.push((await page.getTextContent()).items.map((item) => item.str).join(''));
      annotations.push(...(await page.getAnnotations()));
    }
    return { bytes, text: compact(texts.join('')), annotations };
  } finally {
    await pdf.destroy();
  }
}
async function artifactUrls(page) {
  return page.evaluate(async () => {
    const download = document.querySelector('#download').href;
    const preview = document.querySelector('#preview').src;
    return {
      download,
      preview,
      bytes: Array.from(new Uint8Array(await (await fetch(preview)).arrayBuffer())),
    };
  });
}

test('optional company names automatic and repeat downloads without entering PDF content', async (t) => {
  const page = await openPage(t);
  const input = page.getByLabel('Your resume', { exact: true });
  const company = page.getByLabel('Company you’re applying to', { exact: false });
  await input.fill(source);
  await company.fill('   ');
  const blank = await readPdf(await submit(page));
  await company.fill('  Société / West: Team?  ');
  assert.equal(await page.locator('#result').isVisible(), false);
  assert.equal(await page.locator('#download').getAttribute('download'), null);
  const filename = 'Full-Stack Software Engineer at Société West Team Resume.pdf';
  const named = await readPdf(await submit(page), filename);
  assert.equal(named.text, blank.text);
  assert.equal(named.text.includes('Société'), false);
  const repeat = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download PDF' }).click();
  const repeated = await readPdf(await repeat, filename);
  assert.deepEqual(repeated.bytes, named.bytes);
  assert.deepEqual(Buffer.from((await artifactUrls(page)).bytes), named.bytes);
  const longCompany = 'Company '.repeat(90);
  await company.fill(longCompany);
  const longDownload = await submit(page);
  assert.ok(Buffer.byteLength(longDownload.suggestedFilename(), 'utf8') <= 180);
  assert.ok(longDownload.suggestedFilename().endsWith(' Resume.pdf'));
  await input.fill(source.replace('Full-Stack Software Engineer', 'Lead: Platform / Engineer'));
  await company.fill('Corrected');
  const corrected = await readPdf(
    await submit(page),
    'Lead Platform Engineer at Corrected Resume.pdf',
  );
  assert.ok(corrected.text.includes('Lead:Platform/Engineer'));
  assert.equal(await company.inputValue(), 'Corrected');
});

test('company edits during generation discard obsolete names and allow corrected submission', async (t) => {
  const page = await openPage(t);
  let release;
  const held = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(/SourceSans3-Regular-.*\.ttf/, async (route) => {
    await held;
    await route.continue();
  });
  const company = page.getByLabel('Company you’re applying to', { exact: false });
  const input = page.getByLabel('Your resume', { exact: true });
  const downloads = [];
  page.on('download', (download) => downloads.push(download));
  try {
    await input.fill(source);
    await company.fill('Old Company');
    const request = page.waitForRequest(/SourceSans3-Regular-.*\.ttf/);
    await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
    await request;
    await company.fill('Current Company');
    release();
    await page.waitForFunction(() => !document.querySelector('#create-pdf').disabled);
    assert.equal(downloads.length, 0);
    assert.equal(await page.locator('#result').isVisible(), false);
    assert.equal(await input.inputValue(), source);
    await readPdf(await submit(page), 'Full-Stack Software Engineer at Current Company Resume.pdf');
    assert.equal(downloads.length, 1);
  } finally {
    release();
  }
});

test('visible chatbot workflow copies the complete literal instructions with keyboard activation', async (t) => {
  const page = await openPage(t);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text) => {
          window.copiedInstructions = text;
        },
      },
    }),
  );
  await page.reload();
  await page
    .getByRole('heading', { name: 'Turn chatbot text into a polished resume.', exact: true })
    .waitFor();
  const copy = page.getByRole('button', { name: 'Copy chatbot instructions', exact: true });
  assert.equal(
    await copy.isVisible(),
    true,
    'Beginner workflow is visible without opening hidden help',
  );
  await copy.focus();
  await copy.press('Enter');
  await page
    .getByText(
      'Instructions copied. Paste them into ChatGPT or another chatbot with your current resume.',
      { exact: true },
    )
    .waitFor();
  assert.equal(await page.evaluate(() => window.copiedInstructions), chatbotInstructions);
  assert.ok(
    chatbotInstructions.includes('@@PROFESSIONAL_TITLE@@') &&
      chatbotInstructions.includes('@@JOB@@'),
  );
  assert.equal(await page.locator('#instructions-fallback').isVisible(), false);
});

test('clipboard denial exposes focused complete instructions without changing the pasted resume', async (t) => {
  const page = await openPage(t);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async () => {
          throw new Error('Synthetic clipboard denial');
        },
      },
    }),
  );
  await page.reload();
  const input = page.getByLabel('Your resume', { exact: true });
  await input.fill(source);
  await page.getByRole('button', { name: 'Copy chatbot instructions', exact: true }).click();
  const fallback = page.getByRole('region', { name: 'Chatbot instructions to copy', exact: true });
  await fallback.waitFor();
  assert.equal(await fallback.textContent(), chatbotInstructions);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'instructions-fallback');
  assert.equal(await input.inputValue(), source);
  await page.getByText('Select and copy the instructions below.', { exact: true }).waitFor();
  await mkdir('output/ui', { recursive: true });
  await page.screenshot({ path: 'output/ui/chatbot-fallback.png', fullPage: true });
});

// This replaces the shell smoke test: exercise the built application end to end.
test('symbol markers and an outer text code block export complete ordered PDF content after correction', async (t) => {
  const page = await openPage(t);
  const input = page.getByLabel('Your resume', { exact: true });
  const invalid = source.replace(/@@EDUCATION@@[\s\S]*?(?=@@CERTIFICATIONS@@)/, '');
  const downloads = [];
  page.on('download', (event) => downloads.push(event));
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
  const fields = [
    parsedExample.name,
    ...parsedExample.contact.map((item) => item.text),
    parsedExample.title,
    parsedExample.summary,
    ...parsedExample.jobs.flatMap((job) => [
      job.employer,
      job.role,
      job.dates,
      job.location,
      ...job.bullets,
    ]),
    ...parsedExample.education.flatMap((entry) => Object.values(entry)),
    ...parsedExample.certifications.flatMap((entry) => Object.values(entry)),
    ...parsedExample.skills.flatMap((row) => [row.category, row.items]),
  ];
  for (const field of fields)
    assert.ok(pdf.text.includes(compact(field)), `Missing PDF field: ${field}`);
  assert.ok(pdf.text.indexOf('ExampleStudio') < pdf.text.indexOf('ExampleSystems'));
  assert.ok(pdf.text.indexOf('EDUCATION') < pdf.text.indexOf('CERTIFICATIONS'));
  assert.ok(pdf.text.indexOf('CERTIFICATIONS') < pdf.text.indexOf('SKILLS'));
  assert.deepEqual(
    [
      ...new Set(
        pdf.annotations
          .filter((annotation) => annotation.subtype === 'Link')
          .map((annotation) => annotation.url),
      ),
    ].sort(),
    [
      'https://example.com/alex',
      'https://linkedin.com/in/example-alex',
      'mailto:alex@example.com',
    ].sort(),
  );
  assert.equal(downloads.length, 1, 'One automatic download for one submission');
  assert.equal(
    await page.evaluate(() => navigator.pdfViewerEnabled),
    true,
    'Native viewer is available in this browser mode',
  );
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

test('without native PDF viewing, one download is delivered with a usable fallback link', async (t) => {
  const page = await openPage(t, { pdfViewer: false });
  const downloads = [];
  page.on('download', (download) => downloads.push(download));
  await page.getByLabel('Your resume', { exact: true }).fill(source);
  const first = await readPdf(await submit(page));
  await page
    .getByText('Your browser does not display PDFs here. Use Download PDF to open your resume.', {
      exact: true,
    })
    .waitFor();
  assert.equal(await page.locator('#preview').getAttribute('src'), null);
  assert.equal(await page.locator('#preview').isVisible(), false);
  assert.equal(downloads.length, 1);
  const repeat = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download PDF' }).click();
  assert.deepEqual((await readPdf(await repeat)).bytes, first.bytes);
});

test('unsupported displayed glyphs block download and allow correction without losing text', async (t) => {
  const page = await openPage(t);
  const input = page.getByLabel('Your resume', { exact: true });
  const invalid = source.replace('Product-focused engineer', '😀 Product-focused engineer');
  const downloads = [];
  page.on('download', (download) => downloads.push(download));
  await input.fill(invalid);
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
  await page.locator('#error-list').filter({ hasText: 'resume font cannot display' }).waitFor();
  assert.equal(await input.inputValue(), invalid);
  assert.equal(downloads.length, 0);
  assert.equal(await page.locator('#result').isVisible(), false);
  await input.fill(source);
  assert.ok((await readPdf(await submit(page))).text.includes('AlexMorgan'));
});

test('oversized job details block delivery, retain source and allow corrected resubmission', async (t) => {
  const page = await openPage(t);
  const input = page.getByLabel('Your resume', { exact: true });
  const oversized = source.replace(
    'Employer: Example Studio',
    `Employer: BEGIN ${'Longword '.repeat(300)} ENDMARKER`,
  );
  assert.notEqual(oversized, source);
  const downloads = [];
  page.on('download', (download) => downloads.push(download));
  await input.fill(oversized);
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
  await page
    .locator('#error-list')
    .filter({ hasText: 'top of job 1 are too long to fit with the beginning' })
    .waitFor();
  assert.equal(await input.inputValue(), oversized);
  assert.equal(downloads.length, 0);
  assert.equal(await page.locator('#result').isVisible(), false);
  assert.equal(await page.locator('#download').getAttribute('href'), null);
  assert.equal(await page.locator('#preview').getAttribute('src'), null);
  assert.equal(
    await page.getByRole('button', { name: 'Create PDF', exact: true }).isEnabled(),
    true,
  );
  await input.fill(source);
  const pdf = await readPdf(await submit(page));
  assert.ok(pdf.text.includes('ExampleStudio'));
  assert.equal(downloads.length, 1);
  assert.equal(await page.locator('#error-summary').isVisible(), false);
});

for (const kind of ['unavailable', 'corrupt']) {
  test(`${kind} local font failure is recoverable by retrying the same text`, async (t) => {
    const page = await openPage(t);
    let fail = true;
    await page.route(/SourceSans3-.*\.ttf/, (route) =>
      fail
        ? route.fulfill({
            status: kind === 'unavailable' ? 503 : 200,
            contentType: 'font/ttf',
            body: 'not a font',
          })
        : route.continue(),
    );
    const input = page.getByLabel('Your resume', { exact: true });
    const downloads = [];
    page.on('download', (download) => downloads.push(download));
    await input.fill(source);
    await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
    await page
      .locator('#error-list')
      .filter({
        hasText: kind === 'unavailable' ? 'fonts could not be loaded' : 'PDF could not be created',
      })
      .waitFor();
    assert.equal(await input.inputValue(), source);
    assert.equal(downloads.length, 0);
    assert.equal(await page.locator('#result').isVisible(), false);
    fail = false;
    assert.ok((await readPdf(await submit(page))).text.includes('AlexMorgan'));
  });
}

test('edits during pending fonts discard stale output and repeated submissions do not queue downloads', async (t) => {
  const page = await openPage(t);
  let release;
  const held = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(/SourceSans3-Regular-.*\.ttf/, async (route) => {
    await held;
    await route.continue();
  });
  const input = page.getByLabel('Your resume', { exact: true });
  const downloads = [];
  page.on('download', (download) => downloads.push(download));
  try {
    await input.fill(source);
    const request = page.waitForRequest(/SourceSans3-Regular-.*\.ttf/);
    await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
    await request;
    assert.equal(await page.locator('#create-pdf').isDisabled(), true);
    await page.evaluate(() => {
      document.querySelector('#resume-form').requestSubmit();
      document.querySelector('#resume-form').requestSubmit();
    });
    const edited = source.replace('Product-focused engineer', 'Jamie Example engineer');
    await input.fill(edited);
    release();
    await page.waitForFunction(() => !document.querySelector('#create-pdf').disabled);
    assert.equal(downloads.length, 0);
    assert.equal(await page.locator('#result').isVisible(), false);
    assert.equal(await input.inputValue(), edited);
    const pdf = await readPdf(await submit(page));
    assert.ok(pdf.text.includes('JamieExample'));
    assert.equal(pdf.text.includes('Product-focusedengineer'), false);
    assert.equal(downloads.length, 1);
  } finally {
    release();
  }
});

test('editing an exported resume removes and revokes the old artifact before regeneration', async (t) => {
  const page = await openPage(t);
  const input = page.getByLabel('Your resume', { exact: true });
  await input.fill(source);
  await submit(page);
  const url = (await artifactUrls(page)).download;
  await input.fill(source.replace('Product-focused engineer', 'Jamie Example engineer'));
  assert.equal(await page.locator('#result').isVisible(), false);
  assert.equal(await page.locator('#download').getAttribute('href'), null);
  assert.equal(await page.locator('#preview').getAttribute('src'), null);
  assert.equal(
    await page.evaluate(async (url) => {
      try {
        await fetch(url);
        return false;
      } catch {
        return true;
      }
    }, url),
    true,
  );
  const pdf = await readPdf(await submit(page));
  assert.ok(pdf.text.includes('JamieExample'));
  assert.notEqual((await artifactUrls(page)).download, url);
});

test('interface stays within narrow and wide viewports, grows with input and keeps submit above it', async (t) => {
  const page = await openPage(t, { viewport: { width: 1280, height: 1000 } });
  await mkdir('output/ui', { recursive: true });
  for (const [name, width, height] of [
    ['desktop', 1280, 1000],
    ['mobile', 390, 844],
  ]) {
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
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      'No horizontal overflow',
    );
    await page.screenshot({ path: `output/ui/${name}-filled.png`, fullPage: true });
  }
});

test('PDF assets stay lazy and engine load failure preserves source for reload recovery', async (t) => {
  const page = await openPage(t);
  let fail = true;
  const assets = [];
  page.on('request', (request) => {
    if (/\/pdfmake-.*\.js|SourceSans3-.*\.ttf/.test(request.url())) assets.push(request.url());
  });
  await page.route(/\/pdfmake-.*\.js/, (route) =>
    fail ? route.abort('failed') : route.continue(),
  );
  await page.reload();
  const input = page.getByLabel('Your resume', { exact: true });
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
  await page.locator('#error-summary').waitFor();
  assert.deepEqual(assets, [], 'Initial load and invalid submission load no PDF engine or fonts');
  await input.fill(source);
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
  await page
    .locator('#error-list')
    .filter({ hasText: 'PDF creation could not be loaded' })
    .waitFor();
  assert.equal(await input.inputValue(), source);
  assert.equal(await input.getAttribute('aria-invalid'), null);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'error-summary');
  assert.equal(await page.locator('#result').isVisible(), false);
  assert.equal(await page.locator('#download').getAttribute('href'), null);
  fail = false;
  // Browsers cache rejected dynamic module loads for this page. Preserve the
  // draft externally before reloading, then restore it after fixing assets.
  await page.reload();
  await input.fill(source);
  assert.ok((await readPdf(await submit(page))).text.includes('AlexMorgan'));
});

test('Full Name is the only required contact field; old pasted contacts require migration', async (t) => {
  const page = await openPage(t);
  for (const id of Object.keys(exampleContact)) await page.locator(`#${id}`).fill('');
  await page.locator('#fullName').fill('   ');
  await page.locator('#resume').fill(source);
  await page.locator('#create-pdf').click();
  await page.locator('#error-list').filter({ hasText: 'Enter your Full Name' }).waitFor();
  assert.equal(await page.locator('#fullName').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.locator('#resume').inputValue(), source);
  assert.equal(await page.locator('#resume').getAttribute('aria-invalid'), null);
  await page.locator('#fullName').fill('Taylor  Example');
  const pdf = await readPdf(await submit(page));
  assert.ok(pdf.text.includes('TaylorExample'));
  assert.equal(pdf.annotations.length, 0);
  const oldSource = '@@CONTACT@@\nName: Another Person\nContact: old@example.com\n' + source;
  await page.locator('#resume').fill(oldSource);
  await page.locator('#create-pdf').click();
  await page
    .locator('#error-list')
    .filter({ hasText: 'Move contact details into the fields above' })
    .waitFor();
  assert.equal(await page.locator('#resume').inputValue(), oldSource);
});

test('missing name and invalid resume show both errors in order and retain source line details', async (t) => {
  const page = await openPage(t);
  const invalidSource = 'Unrecognized resume line';
  const nameError = 'Enter your Full Name in the contact fields above before creating a PDF.';
  const sourceError =
    'Line 1: Put this content under a section marker, such as @@PROFESSIONAL_TITLE@@. Copy the complete resume using the chatbot code block’s Copy button; plain headings are not recognized.';
  await page.locator('#fullName').fill('   ');
  await page.locator('#resume').fill(invalidSource);
  await page.locator('#create-pdf').click();
  await page.locator('#error-summary').waitFor();
  assert.deepEqual(await page.locator('#error-list li').allTextContents(), [
    nameError,
    sourceError,
  ]);
  assert.equal(await page.locator('#fullName').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.locator('#resume').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.locator('#resume').inputValue(), invalidSource);
  await page.locator('#fullName').fill('Taylor Example');
  await page.locator('#create-pdf').click();
  await page.waitForFunction(() => document.querySelectorAll('#error-list li').length === 1);
  assert.deepEqual(await page.locator('#error-list li').allTextContents(), [sourceError]);
  assert.equal(await page.locator('#fullName').getAttribute('aria-invalid'), null);
  assert.equal(await page.locator('#resume').getAttribute('aria-invalid'), 'true');
});

test('only contact fields persist across reload; clearing every field persists', async (t) => {
  const page = await openPage(t);
  await page.locator('#resume').fill(source);
  await page.locator('#company').fill('Synthetic Company');
  await page.reload();
  for (const [id, value] of Object.entries(exampleContact))
    assert.equal(await page.locator(`#${id}`).inputValue(), value);
  assert.equal(await page.locator('#resume').inputValue(), '');
  assert.equal(await page.locator('#company').inputValue(), '');
  assert.deepEqual(
    await page.evaluate(() =>
      Object.keys(JSON.parse(window.localStorage.getItem('applicable.contact.v1')).fields),
    ),
    Object.keys(exampleContact),
  );
  for (const id of Object.keys(exampleContact)) await page.locator(`#${id}`).fill('');
  await page.reload();
  for (const id of Object.keys(exampleContact))
    assert.equal(await page.locator(`#${id}`).inputValue(), '');
  await page.locator('#fullName').focus();
  for (const id of ['email', 'linkedIn', 'website', 'phoneNumber', 'company']) {
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), id);
  }
});

for (const kind of ['blocked', 'corrupt']) {
  test(`${kind} contact storage warns and permits correction/export`, async (t) => {
    const page = await openPage(t);
    if (kind === 'blocked') {
      await page.addInitScript(() =>
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new Error('blocked');
          },
        }),
      );
    } else {
      await page.evaluate(() => window.localStorage.setItem('applicable.contact.v1', '{broken'));
    }
    await page.reload();
    await page.locator('.storage-warning').waitFor();
    assert.equal(await page.locator('#fullName').inputValue(), '');
    await page.locator('#fullName').fill('Synthetic Candidate');
    if (kind === 'blocked')
      assert.match(await page.locator('.storage-warning').textContent(), /could not be saved/);
    else
      assert.equal(
        await page.locator('.storage-warning').count(),
        0,
        'Successful save clears the warning',
      );
    await page.locator('#resume').fill(source);
    assert.ok((await readPdf(await submit(page))).text.includes('SyntheticCandidate'));
  });
}

test('contact edits invalidate pending work and revoke completed artifacts', async (t) => {
  const page = await openPage(t);
  let release;
  const held = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(/SourceSans3-Regular-.*\.ttf/, async (route) => {
    await held;
    await route.continue();
  });
  const downloads = [];
  page.on('download', (download) => downloads.push(download));
  try {
    await page.locator('#resume').fill(source);
    const request = page.waitForRequest(/SourceSans3-Regular-.*\.ttf/);
    await page.locator('#create-pdf').click();
    await request;
    await page.locator('#fullName').fill('Updated Candidate');
    release();
    await page.waitForFunction(() => !document.querySelector('#create-pdf').disabled);
    assert.equal(downloads.length, 0);
    assert.equal(await page.locator('#result').isVisible(), false);
    assert.ok((await readPdf(await submit(page))).text.includes('UpdatedCandidate'));
    const url = (await artifactUrls(page)).download;
    await page.locator('#email').fill('available on request');
    assert.equal(await page.locator('#result').isVisible(), false);
    assert.equal(
      await page.evaluate(async (url) => {
        try {
          await fetch(url);
          return false;
        } catch {
          return true;
        }
      }, url),
      true,
    );
    const corrected = await readPdf(await submit(page));
    assert.ok(corrected.text.includes('availableonrequest'));
    assert.equal(
      corrected.annotations.some((row) => row.url?.startsWith('mailto:')),
      false,
    );
  } finally {
    release();
  }
});

test('local header tabs default to PDF Builder and support discovery and keyboard navigation', async (t) => {
  const page = await openPage(t);
  const builder = page.getByRole('tab', { name: 'PDF Builder', exact: true });
  const guide = page.getByRole('tab', { name: 'Getting Started', exact: true });
  assert.equal(await builder.getAttribute('aria-selected'), 'true');
  assert.equal(await guide.getAttribute('tabindex'), '-1');
  assert.equal(await page.locator('#getting-started-panel').isVisible(), false);
  await page.getByRole('button', { name: 'Explore Getting Started', exact: true }).click();
  assert.equal(await guide.getAttribute('aria-selected'), 'true');
  assert.equal(await guide.evaluate((element) => element === document.activeElement), true);
  assert.equal(await builder.getAttribute('tabindex'), '-1');
  assert.equal(await page.locator('#builder-panel').isVisible(), false);
  const stages = page.locator('.workflow-stages > li');
  assert.equal(await stages.count(), 4);
  assert.deepEqual(await stages.locator('h2').allTextContents(), [
    'Understand the process',
    'Set up a Job Finder conversation in ChatGPT',
    'Set up a Resume Builder conversation in ChatGPT',
    'Find positions, tailor resumes, create PDFs and apply',
  ]);
  await guide.press('ArrowRight');
  assert.equal(await builder.getAttribute('aria-selected'), 'true');
  await builder.press('ArrowLeft');
  assert.equal(await guide.getAttribute('aria-selected'), 'true');
  await guide.press('Home');
  assert.equal(await builder.evaluate((element) => element === document.activeElement), true);
  await builder.press('End');
  assert.equal(await guide.evaluate((element) => element === document.activeElement), true);
  await guide.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'getting-started-panel');
  await page.reload();
  assert.equal(await builder.getAttribute('aria-selected'), 'true');
  assert.equal(
    await page.getByRole('button', { name: 'Copy chatbot instructions', exact: true }).isVisible(),
    true,
  );
});

test('switching views preserves drafts, validation and expanded input across hidden resizes', async (t) => {
  const page = await openPage(t);
  const input = page.getByLabel('Your resume', { exact: true });
  const company = page.locator('#company');
  const invalid = source.replace(/@@EDUCATION@@[\s\S]*?(?=@@CERTIFICATIONS@@)/, '');
  await input.fill(invalid);
  await company.fill('Example Company');
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
  const error = page.locator('#error-summary');
  await error.waitFor();
  const errorText = await error.textContent();
  const height = await input.evaluate((element) => element.clientHeight);
  assert.ok(height > 300);
  await page.getByRole('tab', { name: 'Getting Started', exact: true }).click();
  await page.setViewportSize({ width: 375, height: 900 });
  await page.getByRole('tab', { name: 'PDF Builder', exact: true }).click();
  assert.equal(await input.inputValue(), invalid);
  assert.equal(await company.inputValue(), 'Example Company');
  for (const [id, value] of Object.entries(exampleContact))
    assert.equal(await page.locator(`#${id}`).inputValue(), value);
  assert.equal(await error.textContent(), errorText);
  assert.equal(await error.isVisible(), true);
  assert.equal(await input.getAttribute('aria-invalid'), 'true');
  assert.ok(await input.evaluate((element) => element.clientHeight > 300));
});

test('PDF generation continues while guidance is open and the same artifact survives view switches', async (t) => {
  const page = await openPage(t);
  let release;
  const held = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(/SourceSans3-Regular-.*\.ttf/, async (route) => {
    await held;
    await route.continue();
  });
  const downloads = [];
  page.on('download', (download) => downloads.push(download));
  try {
    await page.locator('#resume').fill(source);
    const request = page.waitForRequest(/SourceSans3-Regular-.*\.ttf/);
    await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
    await request;
    await page.getByRole('tab', { name: 'Getting Started', exact: true }).click();
    const download = page.waitForEvent('download');
    release();
    await readPdf(await download);
    const readyUrl = await page.locator('#download').getAttribute('href');
    assert.ok(readyUrl.startsWith('blob:'));
    assert.equal(
      await page
        .getByRole('tab', { name: 'Getting Started', exact: true })
        .getAttribute('aria-selected'),
      'true',
    );
    await page.getByRole('tab', { name: 'PDF Builder', exact: true }).click();
    assert.equal(await page.locator('#result').isVisible(), true);
    await page.getByRole('tab', { name: 'Getting Started', exact: true }).click();
    await page.getByRole('tab', { name: 'PDF Builder', exact: true }).click();
    assert.equal(await page.locator('#download').getAttribute('href'), readyUrl);
    assert.equal(downloads.length, 1);
    const repeat = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download PDF' }).click();
    await readPdf(await repeat);
  } finally {
    release();
  }
});

for (const width of [320, 375, 1280]) {
  test(`navigation and guidance fit ${width}px with touch or pointer activation`, async (t) => {
    const page = await openPage(t, { viewport: { width, height: 900 }, hasTouch: width < 600 });
    const guide = page.getByRole('tab', { name: 'Getting Started', exact: true });
    const builder = page.getByRole('tab', { name: 'PDF Builder', exact: true });
    for (const tab of [guide, builder]) {
      if (width < 600) await tab.tap();
      else await tab.click();
      assert.equal(await tab.getAttribute('aria-selected'), 'true');
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        true,
      );
      const bounds = await tab.boundingBox();
      assert.ok(bounds.height >= 44 && bounds.width >= 44);
      await mkdir('output/ui', { recursive: true });
      await page.screenshot({
        path: `output/ui/getting-started-${width}-${await tab.getAttribute('id')}.png`,
        fullPage: true,
      });
    }
  });
}

test('Job Finder copies latest optional answers in one action without preview and clears on reload', async (t) => {
  const page = await openPage(t);
  await page.evaluate(() => {
    window.copiedJobFinderPrompt = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.copiedJobFinderPrompt = text;
        },
      },
    });
  });
  await page.getByRole('tab', { name: 'Getting Started', exact: true }).click();
  const form = page.getByRole('form', { name: 'Job Finder setup' });
  const fields = form.locator('textarea');
  const output = page.getByLabel('Your Job Finder prompt', { exact: true });
  assert.equal(await fields.count(), 7);
  for (const field of await fields.all()) {
    assert.equal(await field.getAttribute('required'), null);
    const help = await field.getAttribute('aria-describedby');
    assert.ok((await page.locator(`#${help}`).textContent()).startsWith('Example:'));
  }
  const copy = form.getByRole('button', { name: 'Copy Prompt', exact: true });
  assert.equal(await form.getByRole('button').count(), 1);
  assert.equal(await output.count(), 0);
  await copy.click();
  await page.waitForFunction(() =>
    document
      .querySelector('#job-finder-copy-status')
      .textContent.startsWith('Prompt created and copied.'),
  );
  const standard = await page.evaluate(() => window.copiedJobFinderPrompt);
  assert.ok(standard.includes('Ask me to upload one or more previous resumes here in ChatGPT'));
  assert.ok(!standard.includes('My questionnaire answers:'));
  assert.equal(await output.count(), 0);
  const values = [
    '  Operations\nTraining 🚀  ',
    'Remote',
    'No nights',
    'Small team',
    '$70k, flexible',
    'Mid-level',
    'Changing industries',
  ];
  for (const [index, value] of values.entries()) await fields.nth(index).fill(value);
  assert.equal(await output.count(), 0);
  await copy.click();
  await page.waitForFunction(() =>
    document
      .querySelector('#job-finder-copy-status')
      .textContent.startsWith('Prompt created and copied.'),
  );
  const populated = await page.evaluate(() => window.copiedJobFinderPrompt);
  for (const value of values) assert.ok(populated.includes(value.trim()));
  const status = await page.locator('#job-finder-copy-status').textContent();
  assert.match(status, /new ChatGPT conversation and upload your existing resumes there/);
  assert.match(status, /Look for jobs/);
  assert.equal(await output.count(), 0);
  await page.getByRole('tab', { name: 'PDF Builder', exact: true }).click();
  await page.getByRole('tab', { name: 'Getting Started', exact: true }).click();
  assert.equal(await output.count(), 0);
  assert.equal(await fields.first().inputValue(), values[0]);
  await fields.first().fill('Updated role');
  assert.equal(await output.count(), 0);
  assert.equal(await page.locator('#job-finder-copy-status').textContent(), '');
  await copy.click();
  const updated = await page.evaluate(() => window.copiedJobFinderPrompt);
  assert.ok(updated.includes('Updated role'));
  assert.ok(!updated.includes('Operations'));
  assert.equal(await output.count(), 0);
  await page.reload();
  await page.getByRole('tab', { name: 'Getting Started', exact: true }).click();
  for (const field of await fields.all()) assert.equal(await field.inputValue(), '');
  assert.equal(await output.count(), 0);
  const storage = await page.evaluate(() => ({
    local: { ...window.localStorage },
    session: { ...window.sessionStorage },
  }));
  assert.equal(JSON.stringify(storage).includes('Updated role'), false);
  assert.equal(JSON.stringify(storage).includes('Changing industries'), false);
});

test('Job Finder clipboard failure or absence focuses and selects manual output on mobile', async (t) => {
  const page = await openPage(t, { viewport: { width: 320, height: 900 }, hasTouch: true });
  await page.getByRole('tab', { name: 'Getting Started', exact: true }).tap();
  await page.locator('#job-finder-roles').fill('Operations\nTraining');
  for (const mode of ['reject', 'absent']) {
    await page.evaluate(
      (mode) =>
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value:
            mode === 'absent'
              ? undefined
              : {
                  writeText: async () => {
                    throw new Error('denied');
                  },
                },
        }),
      mode,
    );
    await page.getByRole('button', { name: 'Copy Prompt', exact: true }).tap();
    const selection = await page.locator('#job-finder-prompt').evaluate((element) => ({
      focused: element === document.activeElement,
      selected: element.value.slice(element.selectionStart, element.selectionEnd),
      value: element.value,
    }));
    assert.equal(await page.locator('#job-finder-prompt').getAttribute('readonly'), '');
    assert.equal(selection.focused, true);
    assert.equal(selection.selected, selection.value);
    assert.match(
      await page.locator('#job-finder-copy-status').textContent(),
      /use your device’s Copy command/,
    );
  }
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await mkdir('output/ui', { recursive: true });
  await page.screenshot({ path: 'output/ui/job-finder-320.png', fullPage: true });
  await page.locator('#job-finder-roles').fill('Updated role');
  assert.equal(await page.locator('#job-finder-prompt').count(), 0);
  assert.equal(await page.locator('#job-finder-copy-status').textContent(), '');
  await page.getByRole('button', { name: 'Copy Prompt', exact: true }).tap();
  assert.ok((await page.locator('#job-finder-prompt').inputValue()).includes('Updated role'));
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => {} },
    }),
  );
  await page.getByRole('button', { name: 'Copy Prompt', exact: true }).tap();
  assert.equal(await page.locator('#job-finder-prompt').count(), 0);
  assert.match(
    await page.locator('#job-finder-copy-status').textContent(),
    /Prompt created and copied/,
  );
});

test('pending Job Finder clipboard feedback is discarded after edits or newer copy requests', async (t) => {
  const page = await openPage(t);
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () =>
          new Promise((resolve, reject) => {
            window.finishJobFinderCopy = resolve;
            window.failJobFinderCopy = reject;
          }),
      },
    }),
  );
  await page.getByRole('tab', { name: 'Getting Started', exact: true }).click();
  for (const outcome of ['finishJobFinderCopy', 'failJobFinderCopy']) {
    await page.getByRole('button', { name: 'Copy Prompt', exact: true }).click();
    await page.locator('#job-finder-roles').fill(outcome);
    await page.evaluate((outcome) => window[outcome](), outcome);
    assert.equal(await page.locator('#job-finder-copy-status').textContent(), '');
    assert.equal(await page.locator('#job-finder-prompt').count(), 0);
  }
  const copy = page.getByRole('button', { name: 'Copy Prompt', exact: true });
  await copy.click();
  await page.evaluate(() => {
    window.failOlderJobFinderCopy = window.failJobFinderCopy;
  });
  await copy.click();
  await page.evaluate(() => window.finishJobFinderCopy());
  await page.waitForFunction(() =>
    document
      .querySelector('#job-finder-copy-status')
      .textContent.startsWith('Prompt created and copied.'),
  );
  const success = await page.locator('#job-finder-copy-status').textContent();
  assert.match(success, /Prompt created and copied/);
  await page.evaluate(async () => {
    window.failOlderJobFinderCopy();
    await new Promise(window.requestAnimationFrame);
  });
  assert.equal(await page.locator('#job-finder-copy-status').textContent(), success);
  assert.equal(await page.locator('#job-finder-prompt').count(), 0);
});
