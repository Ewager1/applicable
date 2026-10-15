import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { browserOptions } from './browser-options.mjs';

test('production build loads its JavaScript and styles locally without remote requests', async () => {
  const browser = await chromium.launch(browserOptions());
  const page = await browser.newPage();
  const remoteRequests = [];
  const failedRequests = [];
  const errors = [];
  const localAssets = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.origin !== 'http://127.0.0.1:4174') remoteRequests.push(request.url());
  });
  page.on('requestfailed', request => failedRequests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().includes('/assets/')) localAssets.push({ url: response.url(), status: response.status() });
  });
  try {
    const response = await page.goto('http://127.0.0.1:4174/');
    assert.equal(response.status(), 200);
    await page.waitForLoadState('networkidle');
    assert.ok(localAssets.some(asset => asset.url.endsWith('.js')), 'Built JavaScript was requested');
    assert.ok(localAssets.some(asset => asset.url.endsWith('.css')), 'Built styles were requested');
    assert.ok(localAssets.every(asset => asset.status === 200), 'Built assets resolve');
    assert.deepEqual(remoteRequests, []);
    assert.deepEqual(failedRequests, []);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
