import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { browserOptions } from './browser-options.mjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parsedExample } from '../proof/production-fixtures.mjs';
const source = await readFile(new URL('../examples/resume.txt', import.meta.url), 'utf8');
const chatbotInstructions = await readFile(
  new URL('../examples/chatbot-instruction.md', import.meta.url),
  'utf8',
);
const withCompany = (text, company) => `${text}\n@@TARGET_COMPANY@@\n${company}`;
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
  await input.fill(source);
  const blank = await readPdf(await submit(page));
  await input.fill(withCompany(source, '  Société / West: Team?  '));
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
  await input.fill(withCompany(source, longCompany));
  const longDownload = await submit(page);
  assert.ok(Buffer.byteLength(longDownload.suggestedFilename(), 'utf8') <= 180);
  assert.ok(longDownload.suggestedFilename().endsWith(' Resume.pdf'));
  const correctedSource = withCompany(
    source.replace('Full-Stack Software Engineer', 'Lead: Platform / Engineer'),
    'Corrected',
  );
  await input.fill(correctedSource);
  const corrected = await readPdf(
    await submit(page),
    'Lead Platform Engineer at Corrected Resume.pdf',
  );
  assert.ok(corrected.text.includes('Lead:Platform/Engineer'));
  assert.equal(await input.inputValue(), correctedSource);
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
  const input = page.getByLabel('Your resume', { exact: true });
  const downloads = [];
  page.on('download', (download) => downloads.push(download));
  try {
    await input.fill(withCompany(source, 'Old Company'));
    const request = page.waitForRequest(/SourceSans3-Regular-.*\.ttf/);
    await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
    await request;
    await input.fill(withCompany(source, 'Current Company'));
    release();
    await page.waitForFunction(() => !document.querySelector('#create-pdf').disabled);
    assert.equal(downloads.length, 0);
    assert.equal(await page.locator('#result').isVisible(), false);
    assert.equal(await input.inputValue(), withCompany(source, 'Current Company'));
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
    .getByRole('heading', { name: 'Turn your resume into a polished PDF.', exact: true })
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
  const invalid = source.replace(
    /@@EDUCATION@@[\s\S]*?(?=@@CERTIFICATIONS@@)/,
    '@@EDUCATION@@\n\n',
  );
  const downloads = [];
  page.on('download', (event) => downloads.push(event));
  await input.fill(invalid);
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
  const educationLine = invalid.split('\n').indexOf('@@EDUCATION@@') + 1;
  await page
    .getByText(`Line ${educationLine}: Add content under Education.`, { exact: true })
    .waitFor();
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

test('paste-only metadata requires Name, permits optional contact blanks and retains invalid input', async (t) => {
  const page = await openPage(t);
  assert.equal(
    await page.locator('#fullName, #email, #linkedIn, #website, #phoneNumber, #company').count(),
    0,
  );
  const invalid = '@@CONTACT@@\nName: \n@@SKILLS@@\nLanguages:';
  await page.locator('#resume').fill(invalid);
  await page.locator('#create-pdf').click();
  await page.locator('#error-summary').waitFor();
  assert.deepEqual(await page.locator('#error-list li').allTextContents(), [
    'Line 1: Add name for Contact.',
    'Line 4: Add a skill category and at least one skill, with no empty items between commas.',
  ]);
  assert.equal(await page.locator('#resume').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.locator('#resume').inputValue(), invalid);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'error-summary');
  const corrected =
    '@@CONTACT@@\nName: Taylor  Example\nEmail:\nPhone:\nLinkedIn:\nWebsite:\n@@SUMMARY@@\nResolved customer questions.';
  await page.locator('#resume').fill(corrected);
  const pdf = await readPdf(await submit(page), 'Resume.pdf');
  assert.ok(pdf.text.includes('TaylorExample'));
  assert.equal(pdf.annotations.length, 0);
  await page.locator('#resume').fill('@@SUMMARY@@\nOlder body-only input.');
  await page.locator('#create-pdf').click();
  await page.locator('#error-list').filter({ hasText: 'Add @@CONTACT@@ with Name:' }).waitFor();
  assert.equal(await page.locator('#resume').inputValue(), '@@SUMMARY@@\nOlder body-only input.');
});

test('startup deletes only legacy contacts once, never reads them, and saves no pasted metadata', async (t) => {
  const page = await openPage(t);
  await page.addInitScript((appOrigin) => {
    if (window !== window.top || window.location.origin !== appOrigin) return;
    window.localStorage.setItem(
      'applicable.contact.v1',
      JSON.stringify({
        version: 1,
        fields: { fullName: 'Stale Candidate', email: 'stale@example.com' },
      }),
    );
    window.localStorage.setItem('unrelated-test-key', 'keep');
    window.storageCalls = [];
    const remove = window.Storage.prototype.removeItem;
    const get = window.Storage.prototype.getItem;
    const set = window.Storage.prototype.setItem;
    window.Storage.prototype.removeItem = function (key) {
      window.storageCalls.push(['remove', key]);
      return remove.call(this, key);
    };
    window.Storage.prototype.getItem = function (key) {
      window.storageCalls.push(['get', key]);
      if (key === 'applicable.contact.v1') throw new Error('Must never hydrate');
      return get.call(this, key);
    };
    window.Storage.prototype.setItem = function (key, value) {
      window.storageCalls.push(['set', key]);
      return set.call(this, key, value);
    };
  }, new URL(page.url()).origin);
  await page.reload();
  assert.deepEqual(await page.evaluate(() => window.storageCalls), [
    ['remove', 'applicable.contact.v1'],
  ]);
  assert.deepEqual(await page.evaluate(() => ({ ...window.localStorage })), {
    'unrelated-test-key': 'keep',
  });
  assert.equal(await page.locator('#resume').inputValue(), '');
  await page.locator('#resume').fill(source);
  const pdf = await readPdf(await submit(page));
  assert.ok(pdf.text.includes('AlexMorgan'));
  assert.equal(pdf.text.includes('StaleCandidate'), false);
  assert.deepEqual(await page.evaluate(() => window.storageCalls), [
    ['remove', 'applicable.contact.v1'],
  ]);
  await page.reload();
  assert.equal(await page.locator('#resume').inputValue(), '');
  assert.deepEqual(await page.evaluate(() => ({ ...window.localStorage })), {
    'unrelated-test-key': 'keep',
  });
});

for (const kind of ['access', 'remove']) {
  test(`blocked storage ${kind} does not block pasted resume export`, async (t) => {
    const page = await openPage(t);
    await page.addInitScript(
      ({ appOrigin, kind }) => {
        if (window !== window.top || window.location.origin !== appOrigin) return;
        if (kind === 'access')
          Object.defineProperty(window, 'localStorage', {
            get() {
              throw new Error('blocked');
            },
          });
        else
          window.Storage.prototype.removeItem = function () {
            throw new Error('blocked');
          };
      },
      { appOrigin: new URL(page.url()).origin, kind },
    );
    await page.reload();
    await page.locator('#resume').fill(source);
    assert.ok((await readPdf(await submit(page))).text.includes('AlexMorgan'));
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
    const updated = source.replace('Name: Alex Morgan', 'Name: Updated Candidate');
    await page.locator('#resume').fill(updated);
    release();
    await page.waitForFunction(() => !document.querySelector('#create-pdf').disabled);
    assert.equal(downloads.length, 0);
    assert.equal(await page.locator('#result').isVisible(), false);
    assert.ok((await readPdf(await submit(page))).text.includes('UpdatedCandidate'));
    const url = (await artifactUrls(page)).download;
    await page
      .locator('#resume')
      .fill(updated.replace('Email: alex@example.com', 'Email: available on request'));
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

test('three local tools default to PDF Maker with personal introduction and keyboard navigation', async (t) => {
  const page = await openPage(t);
  const builder = page.getByRole('tab', { name: 'Resume PDF Maker', exact: true });
  const finder = page.getByRole('tab', { name: 'Job Finder', exact: true });
  const writer = page.getByRole('tab', { name: 'Resume Writer', exact: true });
  assert.deepEqual(await page.getByRole('tab').allTextContents(), [
    'Job Finder',
    'Resume Writer',
    'Resume PDF Maker',
  ]);
  assert.equal(await builder.getAttribute('aria-selected'), 'true');
  assert.equal(await finder.getAttribute('tabindex'), '-1');
  assert.equal(await writer.getAttribute('tabindex'), '-1');
  assert.equal(await page.locator('#job-finder-panel').isVisible(), false);
  assert.equal(
    await page.locator('.homepage-intro strong').textContent(),
    'Use one tool or all three in conjunction.',
  );
  const story = page.locator('.homepage-intro details');
  assert.equal(await story.getAttribute('open'), null);
  await story.getByText('Why I built Applicable', { exact: true }).press('Enter');
  assert.equal(await story.getByText(/After spending months looking for work/).isVisible(), true);
  assert.equal(await builder.getAttribute('aria-selected'), 'true');
  await builder.press('ArrowRight');
  assert.equal(await finder.getAttribute('aria-selected'), 'true');
  assert.equal(await page.getByRole('form', { name: 'Job Finder setup' }).isVisible(), true);
  assert.equal(await page.locator('#job-finder-panel .tool-steps li').count(), 5);
  await finder.press('ArrowRight');
  assert.equal(await writer.getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#resume-writer-panel .tool-steps li').count(), 5);
  assert.match(
    await page.locator('#resume-writer-panel').textContent(),
    /Standard Resume is the default/,
  );
  assert.equal(await page.getByRole('button', { name: 'Copy Prompt', exact: true }).count(), 0);
  await page
    .getByRole('button', { name: 'Open chatbot formatting instructions', exact: true })
    .click();
  assert.equal(await builder.getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('.format-help').getAttribute('open'), '');
  assert.equal(
    await page.locator('.format-help summary').evaluate((el) => el === document.activeElement),
    true,
  );
  await builder.press('ArrowLeft');
  assert.equal(await writer.getAttribute('aria-selected'), 'true');
  await writer.press('Home');
  assert.equal(await finder.evaluate((el) => el === document.activeElement), true);
  await finder.press('ArrowLeft');
  assert.equal(await builder.evaluate((el) => el === document.activeElement), true);
  await builder.press('Home');
  await finder.press('End');
  assert.equal(await builder.evaluate((el) => el === document.activeElement), true);
  await builder.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'builder-panel');
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
  const invalid = source.replace(
    /@@EDUCATION@@[\s\S]*?(?=@@CERTIFICATIONS@@)/,
    '@@EDUCATION@@\n\n',
  );
  await input.fill(invalid);
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
  const error = page.locator('#error-summary');
  await error.waitFor();
  const errorText = await error.textContent();
  const height = await input.evaluate((element) => element.clientHeight);
  assert.ok(height > 300);
  await page.getByRole('tab', { name: 'Job Finder', exact: true }).click();
  await page.getByRole('tab', { name: 'Resume Writer', exact: true }).click();
  await page.setViewportSize({ width: 375, height: 900 });
  await page.getByRole('tab', { name: 'Resume PDF Maker', exact: true }).click();
  assert.equal(await input.inputValue(), invalid);
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
    await page.getByRole('tab', { name: 'Job Finder', exact: true }).click();
    const download = page.waitForEvent('download');
    release();
    await readPdf(await download);
    const readyUrl = await page.locator('#download').getAttribute('href');
    assert.ok(readyUrl.startsWith('blob:'));
    assert.equal(
      await page
        .getByRole('tab', { name: 'Job Finder', exact: true })
        .getAttribute('aria-selected'),
      'true',
    );
    await page.getByRole('tab', { name: 'Resume PDF Maker', exact: true }).click();
    assert.equal(await page.locator('#result').isVisible(), true);
    await page.getByRole('tab', { name: 'Job Finder', exact: true }).click();
    await page.getByRole('tab', { name: 'Resume Writer', exact: true }).click();
    await page.getByRole('tab', { name: 'Resume PDF Maker', exact: true }).click();
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
    const guide = page.getByRole('tab', { name: 'Job Finder', exact: true });
    const builder = page.getByRole('tab', { name: 'Resume PDF Maker', exact: true });
    const intro = await page.locator('.homepage-intro').boundingBox();
    const navigation = await page.getByRole('tablist').boundingBox();
    assert.ok(intro.y + intro.height <= navigation.y);
    assert.ok(navigation.y < 550, 'Compact introduction keeps tools near the top on mobile');
    for (const tab of [
      guide,
      page.getByRole('tab', { name: 'Resume Writer', exact: true }),
      builder,
    ]) {
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
        path: `output/ui/three-tools-${width}-${await tab.getAttribute('id')}.png`,
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
  await page.getByRole('tab', { name: 'Job Finder', exact: true }).click();
  const form = page.getByRole('form', { name: 'Job Finder setup' });
  const fields = form.locator('textarea');
  const output = page.getByLabel('Your Job Finder prompt', { exact: true });
  assert.equal(await fields.count(), 7);
  const usOnly = form.getByRole('checkbox', { name: 'Search U.S. jobs only', exact: true });
  const recent = form.getByRole('checkbox', {
    name: 'Prefer recently posted positions',
    exact: true,
  });
  assert.equal(await usOnly.isChecked(), true);
  assert.equal(await recent.isChecked(), true);
  for (const [checkbox, description] of [
    [
      usOnly,
      'Limit results to positions based in the United States or remote jobs that accept U.S.-based applicants.',
    ],
    [
      recent,
      'Prioritize newer openings. Some older, legitimate positions may appear less often, but strong matches should still be considered.',
    ],
  ]) {
    const help = await checkbox.getAttribute('aria-describedby');
    assert.equal(await page.locator(`#${help}`).textContent(), description);
  }
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
  // Native keyboard toggles exercise every combination through the actual copy action.
  for (const [us, fresh] of [
    [true, false],
    [false, false],
    [false, true],
    [true, true],
  ]) {
    for (const [checkbox, checked] of [
      [usOnly, us],
      [recent, fresh],
    ]) {
      if ((await checkbox.isChecked()) !== checked) {
        await checkbox.focus();
        await page.keyboard.press('Space');
        assert.equal(await page.locator('#job-finder-copy-status').textContent(), '');
      }
    }
    await copy.click();
    const copied = await page.evaluate(() => window.copiedJobFinderPrompt);
    assert.ok(copied.includes(`Search U.S. jobs only: ${us ? 'On' : 'Off'}`));
    assert.ok(copied.includes(`Prefer recently posted positions: ${fresh ? 'On' : 'Off'}`));
    assert.equal(await output.count(), 0);
  }
  await usOnly.uncheck();
  await recent.uncheck();
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
  await page.getByRole('tab', { name: 'Resume PDF Maker', exact: true }).click();
  await page.getByRole('tab', { name: 'Resume Writer', exact: true }).click();
  await page.getByRole('tab', { name: 'Job Finder', exact: true }).click();
  assert.equal(await page.locator('#job-finder-copy-status').textContent(), status);
  assert.equal(await output.count(), 0);
  assert.equal(await fields.first().inputValue(), values[0]);
  assert.equal(await usOnly.isChecked(), false);
  assert.equal(await recent.isChecked(), false);
  await mkdir('output/ui', { recursive: true });
  await page.screenshot({ path: 'output/ui/job-finder-desktop.png', fullPage: true });
  await fields.first().fill('Updated role');
  assert.equal(await output.count(), 0);
  assert.equal(await page.locator('#job-finder-copy-status').textContent(), '');
  await copy.click();
  const updated = await page.evaluate(() => window.copiedJobFinderPrompt);
  assert.ok(updated.includes('Updated role'));
  assert.ok(!updated.includes('Operations'));
  assert.equal(await output.count(), 0);
  await page.reload();
  await page.getByRole('tab', { name: 'Job Finder', exact: true }).click();
  for (const field of await fields.all()) assert.equal(await field.inputValue(), '');
  assert.equal(await usOnly.isChecked(), true);
  assert.equal(await recent.isChecked(), true);
  assert.equal(await output.count(), 0);
  const storage = await page.evaluate(() => ({
    local: { ...window.localStorage },
    session: { ...window.sessionStorage },
  }));
  assert.deepEqual(Object.keys(storage.session), []);
  assert.deepEqual(Object.keys(storage.local), []);
  assert.equal(JSON.stringify(storage).includes('Updated role'), false);
  assert.equal(JSON.stringify(storage).includes('Changing industries'), false);
});

test('Job Finder clipboard failure or absence focuses and selects manual output on mobile', async (t) => {
  const page = await openPage(t, { viewport: { width: 320, height: 900 }, hasTouch: true });
  await page.getByRole('tab', { name: 'Job Finder', exact: true }).tap();
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
  for (const name of ['Search U.S. jobs only', 'Prefer recently posted positions']) {
    await page.getByRole('checkbox', { name, exact: true }).tap();
    assert.equal(await page.locator('#job-finder-prompt').count(), 0);
    assert.equal(await page.locator('#job-finder-copy-status').textContent(), '');
    await page.getByRole('button', { name: 'Copy Prompt', exact: true }).tap();
    assert.ok((await page.locator('#job-finder-prompt').inputValue()).includes(`${name}: Off`));
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
  await page.getByRole('tab', { name: 'Job Finder', exact: true }).click();
  for (const outcome of ['finishJobFinderCopy', 'failJobFinderCopy']) {
    await page.getByRole('button', { name: 'Copy Prompt', exact: true }).click();
    await page.locator('#job-finder-roles').fill(outcome);
    await page.evaluate((outcome) => window[outcome](), outcome);
    assert.equal(await page.locator('#job-finder-copy-status').textContent(), '');
    assert.equal(await page.locator('#job-finder-prompt').count(), 0);
  }
  for (const name of ['Search U.S. jobs only', 'Prefer recently posted positions']) {
    for (const outcome of ['finishJobFinderCopy', 'failJobFinderCopy']) {
      await page.getByRole('button', { name: 'Copy Prompt', exact: true }).click();
      await page.getByRole('checkbox', { name, exact: true }).press('Space');
      await page.evaluate(async (outcome) => {
        window[outcome]();
        await new Promise(window.requestAnimationFrame);
      }, outcome);
      assert.equal(await page.locator('#job-finder-copy-status').textContent(), '');
      assert.equal(await page.locator('#job-finder-prompt').count(), 0);
    }
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

test('optional sections export sparse content and use the existing title-free filename fallback', async (t) => {
  const page = await openPage(t);
  const sparse = await readFile(new URL('../examples/resume-sparse.txt', import.meta.url), 'utf8');
  const input = page.getByLabel('Your resume', { exact: true });
  await input.fill(sparse);
  const pdf = await readPdf(await submit(page), 'Resume.pdf');
  assert.ok(pdf.text.includes('Supportspecialistexperienced'));
  assert.ok(pdf.text.includes('SKILLS'));
  for (const heading of ['RELEVANTEXPERIENCE', 'EDUCATION', 'CERTIFICATIONS'])
    assert.equal(pdf.text.includes(heading), false);
  assert.equal(await input.inputValue(), sparse);
  assert.deepEqual(Buffer.from((await artifactUrls(page)).bytes), pdf.bytes);
  await input.fill(withCompany(sparse, 'Example Team'));
  const named = await readPdf(await submit(page), 'Untitled at Example Team Resume.pdf');
  assert.equal(named.text, pdf.text);
});

test('volunteer/project paste exports new sections, links and company filename without invented jobs', async (t) => {
  const page = await openPage(t);
  const source = await readFile(
    new URL('../examples/resume-volunteer-projects.txt', import.meta.url),
    'utf8',
  );
  await page.locator('#resume').fill(source);
  const pdf = await readPdf(await submit(page), 'Untitled at Example Community Center Resume.pdf');
  for (const text of [
    'Taylor Example',
    'VOLUNTEER EXPERIENCE',
    'Example Food Pantry',
    'PROJECTS',
    'Community Resource Guide',
    'Neighborhood Survey',
  ])
    assert.ok(pdf.text.includes(compact(text)));
  for (const text of [
    'RELEVANT EXPERIENCE',
    'EDUCATION',
    'CERTIFICATIONS',
    'SKILLS',
    'Example Community Center',
  ])
    assert.equal(pdf.text.includes(compact(text)), false);
  assert.ok(pdf.annotations.some((row) => row.url === 'https://example.com/resource-guide'));
  assert.equal(await page.locator('#resume').inputValue(), source);
  assert.deepEqual(Buffer.from((await artifactUrls(page)).bytes), pdf.bytes);
  const invalid = source.replace(
    'Link: https://example.com/resource-guide',
    'Link: javascript:alert(1)',
  );
  await page.locator('#resume').fill(invalid);
  await page.locator('#create-pdf').click();
  await page
    .locator('#error-list')
    .filter({ hasText: 'usable HTTP(S) or bare web address' })
    .waitFor();
  assert.equal(await page.locator('#resume').inputValue(), invalid);
  assert.equal(await page.locator('#result').isVisible(), false);
  await page.locator('#resume').fill(source);
  await readPdf(await submit(page), 'Untitled at Example Community Center Resume.pdf');
});

test('Resume Writer background is optional, keyboard expandable and transient across all tools', async (t) => {
  const page = await openPage(t);
  await page.addInitScript(() => {
    window.backgroundStorageCalls = [];
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text) => {
          window.copiedWriterPrompt = text;
        },
      },
    });
    for (const method of ['getItem', 'setItem', 'removeItem', 'clear']) {
      const original = window.Storage.prototype[method];
      window.Storage.prototype[method] = function (...args) {
        window.backgroundStorageCalls.push([method, ...args]);
        return original.apply(this, args);
      };
    }
    const originalOpen = window.indexedDB.open.bind(window.indexedDB);
    window.indexedDB.open = (...args) => {
      window.backgroundStorageCalls.push(['indexedDB.open', ...args]);
      return originalOpen(...args);
    };
  });
  await page.reload();
  await page.getByRole('tab', { name: 'Resume Writer', exact: true }).click();
  const background = page.getByRole('region', { name: 'Help your Resume Writer get to know you' });
  const fields = background.locator('textarea');
  assert.equal(await background.getByRole('textbox').count(), 6);
  assert.equal(await fields.count(), 12);
  assert.deepEqual(
    await background.locator(':scope > .resume-writer-field label').allTextContents(),
    [
      'What kinds of jobs are you interested in? (optional)',
      'What did you actually spend your time doing in your most important jobs? (optional)',
      'What professional accomplishments are you most proud of? (optional)',
      'Did your work produce any measurable results? (optional)',
      "Are there skills or responsibilities your resume doesn't fully explain? (optional)",
      'Is there anything your Resume Writer should be careful not to overstate? (optional)',
    ],
  );
  assert.match(
    await background.textContent(),
    /existing resumes will provide most of the information/,
  );
  assert.match(await background.textContent(), /All 12 questions are optional/);
  assert.match(await background.textContent(), /reasonably supported numbers/);
  assert.match(await background.textContent(), /estimates labeled as estimates/);
  assert.match(
    await background.textContent(),
    /Nothing is sent to ChatGPT until you paste it there/,
  );
  const details = background.locator('details');
  const summary = details.locator('summary');
  assert.equal(await summary.textContent(), 'Tell us a little more');
  assert.equal(await details.getAttribute('open'), null);
  await summary.focus();
  await summary.press('Enter');
  assert.equal(await details.getAttribute('open'), '');
  assert.equal(await background.getByRole('textbox').count(), 12);
  await summary.press('Tab');
  assert.equal(
    await details
      .locator('textarea')
      .first()
      .evaluate((el) => el === document.activeElement),
    true,
  );
  assert.equal(await details.locator('label').count(), 6);
  const expectedValues = [];
  const longAnswer = 'Synthetic background: I organized supplies and helped coworkers.\n'.repeat(
    160,
  );
  for (const [index, field] of (await fields.all()).entries()) {
    const label = await field.evaluate((el) => el.labels[0].textContent);
    assert.match(label, /\(optional\)/);
    const description = await field.getAttribute('aria-describedby');
    assert.match(await page.locator(`#${description}`).textContent(), /^Example: .+/);
    assert.equal(await field.getAttribute('required'), null);
    assert.equal(await field.getAttribute('minlength'), null);
    assert.equal(await field.getAttribute('maxlength'), null);
    const value = index % 3 === 0 ? '' : index % 3 === 1 ? "I don't know" : longAnswer;
    expectedValues.push(value);
    await field.fill(value);
    assert.equal(await field.evaluate((el) => el.checkValidity()), true);
  }
  await summary.focus();
  await summary.press('Space');
  assert.equal(await details.getAttribute('open'), null);
  await page.getByRole('button', { name: 'Copy Setup Prompt', exact: true }).click();
  const copied = await page.evaluate(() => window.copiedWriterPrompt);
  assert.ok(copied.includes(chatbotInstructions.trim()));
  assert.ok(copied.includes(longAnswer.trim()));
  assert.ok(copied.includes("I don't know"));
  assert.equal(await page.locator('#resume-writer-prompt').count(), 0);
  assert.match(
    await page.locator('#resume-writer-copy-status').textContent(),
    /Setup prompt copied/,
  );
  for (const tool of ['Job Finder', 'Resume PDF Maker', 'Resume Writer']) {
    await page.getByRole('tab', { name: tool, exact: true }).click();
  }
  for (const [index, field] of (await fields.all()).entries()) {
    assert.equal(await field.inputValue(), expectedValues[index]);
  }
  await page.getByRole('button', { name: 'Open chatbot formatting instructions' }).click();
  assert.equal(
    await page.getByRole('tab', { name: 'Resume PDF Maker' }).getAttribute('aria-selected'),
    'true',
  );
  await page.getByRole('tab', { name: 'Resume Writer', exact: true }).click();
  assert.equal(await fields.nth(2).inputValue(), longAnswer);
  assert.equal(await page.locator('#resume-writer-panel button').count(), 2);
  assert.deepEqual(await page.evaluate(() => window.backgroundStorageCalls), [
    ['removeItem', 'applicable.contact.v1'],
  ]);
  assert.deepEqual(
    await page.evaluate(() => ({
      local: { ...window.localStorage },
      session: { ...window.sessionStorage },
    })),
    { local: {}, session: {} },
  );
  await page.reload();
  await page.getByRole('tab', { name: 'Resume Writer', exact: true }).click();
  assert.equal(await details.getAttribute('open'), null);
  for (const field of await fields.all()) assert.equal(await field.inputValue(), '');
});

for (const width of [320, 1280]) {
  test(`Resume Writer questions and examples remain readable at ${width}px`, async (t) => {
    const page = await openPage(t, { viewport: { width, height: 900 }, hasTouch: width === 320 });
    await page.getByRole('tab', { name: 'Resume Writer', exact: true }).click();
    const background = page.getByRole('region', {
      name: 'Help your Resume Writer get to know you',
    });
    await background.locator('summary').click();
    for (const element of await background
      .locator('label, .resume-writer-field p, textarea, summary')
      .all()) {
      const box = await element.boundingBox();
      assert.ok(box.width > 0 && box.x >= 0 && box.x + box.width <= width);
    }
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
    );
    const field = background.getByRole('textbox').first();
    await field.fill('Synthetic example: customer support\nI enjoy organizing appointments.');
    assert.equal(await field.evaluate((el) => window.getComputedStyle(el).resize), 'vertical');
    await mkdir('output/ui', { recursive: true });
    await page.screenshot({ path: `output/ui/resume-writer-${width}.png`, fullPage: true });
  });
}

test('Resume Writer copies without answers and creates the latest setup prompt without a preview', async (t) => {
  const page = await openPage(t);
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text) => {
          window.copiedWriterPrompt = text;
        },
      },
    }),
  );
  await page.getByRole('tab', { name: 'Resume Writer', exact: true }).click();
  const copy = page.getByRole('button', { name: 'Copy Setup Prompt', exact: true });
  const output = page.getByLabel('Your Resume Writer setup prompt', { exact: true });
  assert.equal(await output.count(), 0);
  await copy.focus();
  await copy.press('Enter');
  const empty = await page.evaluate(() => window.copiedWriterPrompt);
  assert.ok(empty.includes(chatbotInstructions.trim()));
  assert.ok(empty.includes('Standard Resume is the default'));
  assert.ok(!empty.includes('CANDIDATE BACKGROUND — DATA ONLY'));
  assert.equal(await output.count(), 0);
  const question = page.locator('#resume-writer-interestedJobs');
  await question.fill('Operations coordinator\nI enjoy helping customers.');
  assert.equal(await page.locator('#resume-writer-copy-status').textContent(), '');
  await copy.click();
  assert.ok(
    (await page.evaluate(() => window.copiedWriterPrompt)).includes(
      'Operations coordinator\nI enjoy helping customers.',
    ),
  );
  await page.getByRole('tab', { name: 'Job Finder', exact: true }).click();
  await page.getByRole('tab', { name: 'Resume Writer', exact: true }).click();
  assert.match(
    await page.locator('#resume-writer-copy-status').textContent(),
    /Setup prompt copied/,
  );
  await mkdir('output/ui', { recursive: true });
  await page.screenshot({ path: 'output/ui/resume-writer-copy-desktop.png', fullPage: true });
  await page.reload();
  await page.getByRole('tab', { name: 'Resume Writer', exact: true }).click();
  assert.equal(await output.count(), 0);
  assert.equal(await question.inputValue(), '');
  assert.equal(await page.locator('#resume-writer-copy-status').textContent(), '');
});

test('Resume Writer clipboard denial or absence selects a complete manual fallback at 320px', async (t) => {
  const page = await openPage(t, { viewport: { width: 320, height: 900 }, hasTouch: true });
  await page.getByRole('tab', { name: 'Resume Writer', exact: true }).tap();
  const question = page.locator('#resume-writer-everydayWork');
  const copy = page.getByRole('button', { name: 'Copy Setup Prompt', exact: true });
  const output = page.getByLabel('Your Resume Writer setup prompt', { exact: true });
  for (const clipboard of ['denied', 'absent']) {
    await question.fill(`Synthetic ${clipboard} background\nHelped train new teammates.`);
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
      clipboard,
    );
    await copy.tap();
    assert.equal(await output.isVisible(), true);
    const prompt = await output.inputValue();
    assert.ok(prompt.includes(chatbotInstructions.trim()));
    assert.ok(prompt.includes(`Synthetic ${clipboard} background\nHelped train new teammates.`));
    assert.deepEqual(
      await output.evaluate((el) => ({
        focused: el === document.activeElement,
        selected: el.selectionEnd - el.selectionStart,
        readOnly: el.readOnly,
      })),
      { focused: true, selected: prompt.length, readOnly: true },
    );
    assert.match(
      await page.locator('#resume-writer-copy-status').textContent(),
      /Copy was unavailable/,
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
    );
    const bounds = await output.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 320);
  }
  await mkdir('output/ui', { recursive: true });
  await page.screenshot({ path: 'output/ui/resume-writer-copy-320.png', fullPage: true });
  await question.fill('Revised background');
  assert.equal(await output.count(), 0);
  assert.equal(await page.locator('#resume-writer-copy-status').textContent(), '');
});

test('Resume Writer ignores pending clipboard results after edits and newer copy requests', async (t) => {
  const page = await openPage(t);
  await page.evaluate(() => {
    window.writerCopies = [];
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: (text) =>
          new Promise((resolve, reject) => {
            window.writerCopies.push({ text, resolve, reject });
          }),
      },
    });
  });
  await page.getByRole('tab', { name: 'Resume Writer', exact: true }).click();
  const copy = page.getByRole('button', { name: 'Copy Setup Prompt', exact: true });
  const output = page.locator('#resume-writer-prompt');
  const status = page.locator('#resume-writer-copy-status');
  const question = page.locator('#resume-writer-interestedJobs');
  for (const outcome of ['resolve', 'reject']) {
    await copy.click();
    await question.fill(`Updated after ${outcome}`);
    await page.evaluate(async (outcome) => {
      window.writerCopies.at(-1)[outcome]();
      await new Promise(window.requestAnimationFrame);
    }, outcome);
    assert.equal(await status.textContent(), '');
    assert.equal(await output.count(), 0);
  }
  await copy.click();
  await copy.click();
  await page.evaluate(async () => {
    window.writerCopies.at(-1).reject();
    await new Promise(window.requestAnimationFrame);
  });
  const latest = await output.inputValue();
  await page.evaluate(async () => {
    window.writerCopies.at(-2).resolve();
    await new Promise(window.requestAnimationFrame);
  });
  assert.equal(await output.inputValue(), latest);
  assert.match(await status.textContent(), /Copy was unavailable/);
  await question.fill('Newest background');
  await copy.click();
  await copy.click();
  await page.evaluate(async () => {
    window.writerCopies.at(-1).resolve();
    await new Promise(window.requestAnimationFrame);
    window.writerCopies.at(-2).reject();
    await new Promise(window.requestAnimationFrame);
  });
  assert.match(await status.textContent(), /Setup prompt copied/);
  assert.equal(await output.count(), 0);
});
