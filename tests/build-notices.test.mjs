import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { build } from 'vite';
import { digest, validateInventory, validateModules } from '../scripts/build-notices.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const inventory = JSON.parse(readFileSync(resolve(root, 'licenses/browser-runtime.json'), 'utf8'));
const clone = () => structuredClone(inventory);
const readReplacing = (suffix, replacement) => (path) =>
  path.endsWith(suffix) ? replacement : readFileSync(path);

test('reviewed source-map paths account for embedded packages and upstream wrapper code', () => {
  validateInventory(root, inventory);
  assert.equal(inventory.components.length, 73);
  assert.equal(inventory.components.flatMap((c) => c.sources).length, 537);
  assert.equal(inventory.otherPdfmakeSources.length, 38);
  assert.ok(inventory.components.some((c) => c.name === 'core-js'));
  assert.ok(inventory.components.some((c) => c.name === 'expose-loader'));
  assert.ok(inventory.components.some((c) => c.name === 'readable-stream'));
});

test('missing license input fails with an actionable review error', () => {
  assert.throws(
    () =>
      validateInventory(root, inventory, (path) => {
        if (path.endsWith('/assets/fonts/OFL.txt')) throw new Error('missing');
        return readFileSync(path);
      }),
    /license review required: missing input assets\/fonts\/OFL.txt/,
  );
});

test('changed opaque bundle and changed retained notice are rejected', () => {
  for (const path of [
    'node_modules/pdfmake/build/pdfmake.js',
    'licenses/browser-runtime-NOTICES.txt',
  ]) {
    assert.throws(
      () => validateInventory(root, inventory, readReplacing(path, Buffer.from('changed'))),
      /license review required: changed input/,
    );
  }
});

test('an unreviewed package version is rejected even if the version alone changed', () => {
  const changed = clone();
  changed.versions.react = '0.0.0';
  assert.throws(() => validateInventory(root, changed), /unreviewed react/);
});

test('missing fingerprints, source attribution and component metadata are rejected', () => {
  const noFingerprint = clone();
  delete noFingerprint.files['node_modules/pdfmake/build/pdfmake.js'];
  assert.throws(() => validateInventory(root, noFingerprint), /missing fingerprint/);
  const noAttribution = clone();
  noAttribution.components.pop();
  assert.throws(() => validateInventory(root, noAttribution), /source-map inventory is incomplete/);
  const noMetadata = clone();
  delete noMetadata.components[0].licenseReferenceVersion;
  assert.throws(
    () => validateInventory(root, noMetadata),
    /incomplete embedded component provenance/,
  );
  const noNotice = clone();
  noNotice.components[0].notices = ['notice-missing'];
  assert.throws(() => validateInventory(root, noNotice), /missing notice notice-missing/);
});

test('new third-party imports and new or changed generated helpers require review', () => {
  assert.throws(
    () =>
      validateModules(
        root,
        inventory,
        [resolve(root, 'node_modules/pdfjs-dist/build/pdf.mjs')],
        new Map(),
      ),
    /unreviewed bundled module/,
  );
  for (const id of ['\0unknown/runtime.js', '\0vite/preload-helper.js']) {
    assert.throws(
      () => validateModules(root, inventory, [id], new Map([[id, 'changed']])),
      /unreviewed generated helper/,
    );
  }
});

test('the actual production build packages complete readable notices and only reviewed fonts', async () => {
  const result = await build({ logLevel: 'silent', build: { write: false } });
  assert.ok(!Array.isArray(result));
  const withoutNotices = await build({
    configFile: false,
    root: resolve(root, 'src'),
    base: './',
    publicDir: false,
    logLevel: 'silent',
    build: { write: false, outDir: '../dist', emptyOutDir: true },
  });
  const applicationBytes = (output) =>
    Object.fromEntries(
      output
        .filter((item) => !['LICENSE.txt', 'THIRD_PARTY_NOTICES.txt'].includes(item.fileName))
        .map((item) => [item.fileName, digest(item.type === 'chunk' ? item.code : item.source)]),
    );
  assert.deepEqual(applicationBytes(result.output), applicationBytes(withoutNotices.output));
  const assets = result.output.filter((item) => item.type === 'asset');
  const notices = assets
    .find((item) => item.fileName === 'THIRD_PARTY_NOTICES.txt')
    .source.toString();
  const license = assets.find((item) => item.fileName === 'LICENSE.txt').source.toString();
  assert.equal(license, readFileSync(resolve(root, 'LICENSE'), 'utf8'));
  for (const path of [
    'licenses/react-LICENSE.txt',
    'licenses/pdfmake-LICENSE.txt',
    'assets/fonts/OFL.txt',
    'licenses/browser-runtime-NOTICES.txt',
  ]) {
    assert.ok(notices.includes(readFileSync(resolve(root, path), 'utf8')), path);
  }
  for (const attribution of [
    'Meta Platforms',
    'bpampuch',
    'Cédric Mesnil',
    'Google Inc.',
    'SVG-to-PDFKit',
    'SIL OPEN FONT LICENSE',
    'Unicode',
    'Evan Wallace',
  ]) {
    assert.ok(notices.includes(attribution), attribution);
  }
  assert.doesNotMatch(notices, /Playwright|ESLint|pdfjs-dist/);
  assert.ok(!assets.some((item) => /\.map$|\.tgz$|browser-runtime\.json$/.test(item.fileName)));
  const fonts = assets.filter((item) => item.fileName.endsWith('.ttf'));
  assert.equal(fonts.length, 3);
  for (const font of fonts) assert.ok(Object.values(inventory.files).includes(digest(font.source)));
});
