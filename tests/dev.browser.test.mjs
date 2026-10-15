import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { browserOptions } from './browser-options.mjs';

test('a cold development cache exports a synthetic resume on the first submission', async t => {
  // Never clear/reuse node_modules/.vite: a developer may have the app running.
  const cacheDir = await mkdtemp(join(tmpdir(), 'applicable-vite-test-'));
  t.after(() => rm(cacheDir, { recursive: true, force: true }));
  assert.deepEqual(await readdir(cacheDir), []);
  let server, browser;
  try {
    server = await createServer({
      cacheDir,
      server: { host: '127.0.0.1', port: 0, strictPort: true, open: false },
    });
    assert.equal(server.config.cacheDir, resolve(cacheDir));
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await chromium.launch(browserOptions());
    const page = await browser.newPage({ acceptDownloads: true });
    const remote = [], failures = [], errors = [], downloads = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.origin !== origin) remote.push(request.url());
    });
    page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
    page.on('requestfailed', request => failures.push(`${request.failure().errorText} ${request.url()}`));
    page.on('pageerror', error => errors.push(error.message));
    page.on('download', download => downloads.push(download));
    await page.goto(origin);
    const source = await readFile(new URL('../examples/resume.txt', import.meta.url), 'utf8');
    await page.getByLabel('Your resume', { exact: true }).fill(source);
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
    const download = await downloaded;
    assert.equal(download.suggestedFilename(), 'Full-Stack Software Engineer Resume.pdf');
    const bytes = await readFile(await download.path());
    const pdf = await getDocument({ data: Uint8Array.from(bytes) }).promise;
    try {
      const text = [];
      for (let number = 1; number <= pdf.numPages; number++) {
        text.push((await (await pdf.getPage(number)).getTextContent()).items.map(item => item.str).join(''));
      }
      const compact = text.join('').replace(/\s/g, '');
      for (const expected of ['AlexMorgan', 'ExampleStudio', 'ExampleSystems', 'EDUCATION', 'CERTIFICATIONS', 'SKILLS']) assert.ok(compact.includes(expected), expected);
    } finally { await pdf.destroy(); }
    const previewBytes = await page.evaluate(async () => {
      const url = document.querySelector('#download').href;
      return Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer()));
    });
    assert.deepEqual(Buffer.from(previewBytes), bytes);
    assert.equal(await page.locator('#error-summary').isVisible(), false);
    assert.equal(await page.getByLabel('Your resume', { exact: true }).inputValue(), source);
    assert.equal(downloads.length, 1);
    assert.deepEqual(remote, []);
    assert.deepEqual(failures, []);
    assert.deepEqual(errors, []);
  } finally {
    try { await browser?.close(); }
    finally { await server?.close(); }
  }
});
