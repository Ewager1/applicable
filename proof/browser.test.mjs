import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import { browserOptions } from '../tests/browser-options.mjs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Servers are owned by npm run test:browser; no manual startup is needed.
test('browser generates local PDFs; preview and real downloads use identical bytes', async () => {
  const browser = await chromium.launch(browserOptions());
  const page = await browser.newPage({ acceptDownloads: true });
  const remoteRequests = [];
  const errors = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    // Chrome's built-in PDF viewer also loads chrome:// and chrome-extension:// assets.
    if (
      ['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) &&
      url.origin !== 'http://127.0.0.1:4173'
    )
      remoteRequests.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:4173/');
    let previousUrl;
    for (const [kind, pages] of [
      ['short', 1],
      ['typical', 2],
      ['long', 3],
    ]) {
      await page.selectOption('#sample', kind);
      await page.click('#generate');
      await page.waitForFunction(() =>
        document.querySelector('#status').textContent.startsWith('PDF ready'),
      );
      const details = await page.evaluate(async () => {
        const downloadUrl = document.querySelector('#download').href;
        const previewUrl = document.querySelector('#preview').src;
        return {
          downloadUrl,
          previewUrl,
          bytes: Array.from(new Uint8Array(await (await fetch(previewUrl)).arrayBuffer())),
        };
      });
      assert.equal(details.downloadUrl, details.previewUrl);
      const event = page.waitForEvent('download');
      await page.click('#download');
      const download = await event;
      assert.equal(download.suggestedFilename(), 'applicable-synthetic.pdf');
      const downloaded = await readFile(await download.path());
      assert.deepEqual(downloaded, Buffer.from(details.bytes));
      const pdf = await getDocument({ data: Uint8Array.from(downloaded) }).promise;
      assert.equal(pdf.numPages, pages);
      await pdf.destroy();
      if (previousUrl) {
        assert.equal(
          await page.evaluate(async (url) => {
            try {
              await fetch(url);
              return false;
            } catch {
              return true;
            }
          }, previousUrl),
          true,
          'Previous Blob URL is released',
        );
      }
      previousUrl = details.downloadUrl;
      if (kind === 'typical') {
        await mkdir('output/pdf', { recursive: true });
        await page.screenshot({ path: 'output/pdf/browser-preview.png', fullPage: true });
      }
    }
    assert.deepEqual(remoteRequests, []);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
