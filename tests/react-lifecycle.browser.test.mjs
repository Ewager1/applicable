import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { browserOptions } from './browser-options.mjs';

const source = await readFile(new URL('../examples/resume.txt', import.meta.url), 'utf8');

test('StrictMode cancels unmounted work, delivers once after remount and revokes replaced/unmounted URLs', async t => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'applicable-react-test-'));
  t.after(() => rm(cacheDir, { recursive: true, force: true }));
  let server, browser;
  try {
    server = await createServer({
      cacheDir,
      server: { host: '127.0.0.1', port: 0, strictPort: true, open: false },
      plugins: [{
        name: 'react-lifecycle-test-entry',
        enforce: 'pre',
        // Exercise real components with a test-only mounting host. No production
        // globals or lifecycle escape hatches are added to the application.
        transform(code, id) {
          if (!id.endsWith('/src/main.tsx')) return;
          return code.replace('createRoot(container).render(<StrictMode><App /></StrictMode>);', `
            let root;
            window.mountApp = () => {
              root = createRoot(container);
              root.render(<StrictMode><App /></StrictMode>);
            };
            window.unmountApp = () => root.unmount();
            window.mountApp();
          `);
        },
      }],
    });
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await chromium.launch(browserOptions());
    const page = await browser.newPage({ acceptDownloads: true });
    const downloads = [], errors = [], remote = [];
    page.on('download', item => downloads.push(item));
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      const url = new URL(request.url());
      if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.origin !== origin) remote.push(request.url());
    });
    await page.addInitScript(() => {
      window.createdUrls = [];
      window.revokedUrls = [];
      window.pendingFonts = 0;
      const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = blob => {
        const url = create(blob);
        window.createdUrls.push(url);
        return url;
      };
      URL.revokeObjectURL = url => { window.revokedUrls.push(url); revoke(url); };
      const fetchOriginal = window.fetch.bind(window);
      window.fetch = async (...args) => {
        const font = String(args[0]).includes('.ttf');
        if (font) window.pendingFonts++;
        try { return await fetchOriginal(...args); }
        finally { if (font) window.pendingFonts--; }
      };
    });
    let release;
    const held = new Promise(resolve => { release = resolve; });
    await page.route(/SourceSans3-Regular\.ttf/, async route => { await held; await route.continue(); });
    try {
      await page.goto(origin);
    await page.locator('#fullName').fill('Alex Morgan');
      await page.getByLabel('Your resume', { exact: true }).fill(source);
      const requested = page.waitForRequest(/SourceSans3-Regular\.ttf/);
      await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
      await requested;
      await page.evaluate(() => window.unmountApp());
      release();
      await page.waitForFunction(() => window.pendingFonts === 0);
      await page.evaluate(() => new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))));
      assert.equal(downloads.length, 0, 'Unmounted pending work never delivers');
      assert.deepEqual(await page.evaluate(() => window.createdUrls), []);
      await page.evaluate(() => window.mountApp());
      await page.getByLabel('Your resume', { exact: true }).fill(source);
      for (let attempt = 0; attempt < 2; attempt++) {
        const downloaded = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
        await downloaded;
        await page.waitForFunction(() => document.activeElement.id === 'result-title');
        assert.equal(downloads.length, attempt + 1, 'StrictMode delivers exactly once per submission');
      }
      const urls = await page.evaluate(() => ({ created: window.createdUrls, revoked: window.revokedUrls }));
      assert.equal(urls.created.length, 2);
      assert.deepEqual(urls.revoked, [urls.created[0]], 'Regeneration revokes its predecessor');
      await page.evaluate(() => window.unmountApp());
      assert.deepEqual(await page.evaluate(() => window.revokedUrls), urls.created, 'Unmount revokes the remaining artifact exactly once');
      assert.deepEqual(errors, []);
      assert.deepEqual(remote, []);
    } finally { release(); }
  } finally {
    try { await browser?.close(); }
    finally { await server?.close(); }
  }
});
