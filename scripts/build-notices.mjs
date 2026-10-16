import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const inventoryPath = 'licenses/browser-runtime.json';
const noticeInputs = [
  'licenses/react-LICENSE.txt',
  'licenses/pdfmake-LICENSE.txt',
  'assets/fonts/OFL.txt',
  'licenses/browser-runtime-NOTICES.txt',
];
const runtimePackages = ['react', 'react-dom', 'scheduler', 'pdfmake', 'vite', 'rolldown'];
const fontPaths = ['Regular', 'Semibold', 'Bold'].map(
  (weight) => `assets/fonts/SourceSans3-${weight}.ttf`,
);

export const digest = (value) => createHash('sha256').update(value).digest('hex');

function reviewRequired(reason) {
  throw new Error(`Browser runtime license review required: ${reason}`);
}

/** Check the reviewed artifacts, not the unrelated installed development dependency tree. */
export function validateInventory(root, inventory, read = readFileSync) {
  const load = (path) => {
    try {
      return read(resolve(root, path));
    } catch {
      reviewRequired(`missing input ${path}`);
    }
  };
  if (inventory.schemaVersion !== 1) reviewRequired('unsupported inventory format');
  for (const name of runtimePackages) {
    const actual = JSON.parse(load(`node_modules/${name}/package.json`)).version;
    if (inventory.versions[name] !== actual) reviewRequired(`unreviewed ${name} ${actual}`);
  }
  const requiredInputs = [
    'LICENSE',
    ...noticeInputs,
    ...fontPaths,
    'node_modules/pdfmake/build/pdfmake.js',
    'node_modules/pdfmake/build/pdfmake.js.map',
  ];
  for (const path of requiredInputs) {
    if (!inventory.files[path]) reviewRequired(`missing fingerprint for ${path}`);
  }
  for (const [path, expected] of Object.entries(inventory.files)) {
    if (digest(load(path)) !== expected) reviewRequired(`changed input ${path}`);
  }

  const sourceMap = JSON.parse(load('node_modules/pdfmake/build/pdfmake.js.map'));
  const notices = load('licenses/browser-runtime-NOTICES.txt').toString();
  const covered = new Set();
  for (const component of inventory.components) {
    if (
      !component.name ||
      !component.licenseReferenceVersion ||
      !component.tarball?.startsWith('https://registry.npmjs.org/') ||
      !component.tarballIntegrity?.startsWith('sha512-') ||
      !component.notices?.length ||
      !component.sources?.length
    ) {
      reviewRequired('incomplete embedded component provenance');
    }
    const expectedRoot = `node_modules/${component.name}/`;
    if (!component.sourceRoot.endsWith(expectedRoot)) {
      reviewRequired(`incorrect source root for ${component.name}`);
    }
    for (const notice of component.notices) {
      if (!notices.includes(`\n${notice}\n`)) reviewRequired(`missing notice ${notice}`);
    }
    for (const source of component.sources) {
      if (!source.startsWith(component.sourceRoot) || covered.has(source)) {
        reviewRequired(`incorrect or duplicate source attribution ${source}`);
      }
      covered.add(source);
    }
  }
  for (const source of inventory.otherPdfmakeSources) {
    if (source.startsWith('webpack://pdfmake/./node_modules/') || covered.has(source)) {
      reviewRequired(`unattributed embedded package source ${source}`);
    }
    covered.add(source);
  }
  if (covered.size !== sourceMap.sources.length || sourceMap.sources.some((s) => !covered.has(s))) {
    reviewRequired('pdfmake source-map inventory is incomplete');
  }
  return { load };
}

/** Called with emitted chunk IDs so new runtime imports cannot bypass the inventory. */
export function validateModules(root, inventory, moduleIds, virtualSources) {
  for (const id of moduleIds) {
    if (id.startsWith('\0')) {
      if (
        !inventory.virtualModules[id] ||
        digest(virtualSources.get(id) ?? '') !== inventory.virtualModules[id]
      ) {
        reviewRequired(`unreviewed generated helper ${JSON.stringify(id)}`);
      }
    } else if (id.includes('/node_modules/')) {
      const path = relative(root, id.split('?')[0]).replaceAll('\\', '/');
      if (!inventory.files[path]) reviewRequired(`unreviewed bundled module ${path}`);
    }
  }
}

export function buildNotices() {
  const virtualSources = new Map();
  let inventory;
  let checked;
  return {
    name: 'applicable-build-notices',
    apply: 'build',
    enforce: 'pre',
    buildStart() {
      virtualSources.clear();
      inventory = JSON.parse(readFileSync(resolve(projectRoot, inventoryPath), 'utf8'));
      checked = validateInventory(projectRoot, inventory);
    },
    transform(code, id) {
      if (id.startsWith('\0')) virtualSources.set(id, code);
    },
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((item) => item.type === 'chunk');
      validateModules(
        projectRoot,
        inventory,
        chunks.flatMap((chunk) => Object.keys(chunk.modules)),
        virtualSources,
      );
      const expectedFonts = new Set(fontPaths.map((path) => inventory.files[path]));
      const emittedFonts = Object.values(bundle).filter(
        (item) => item.type === 'asset' && /\.(ttf|otf|woff2?)$/i.test(item.fileName),
      );
      if (
        emittedFonts.length !== expectedFonts.size ||
        emittedFonts.some((asset) => !expectedFonts.has(digest(asset.source)))
      ) {
        reviewRequired('emitted font assets differ from the reviewed inventory');
      }
      this.emitFile({ type: 'asset', fileName: 'LICENSE.txt', source: checked.load('LICENSE') });
      const header = `Applicable browser distribution: third-party notices\n\nReact ${inventory.versions.react}, React DOM ${inventory.versions['react-dom']},\nScheduler ${inventory.versions.scheduler}: shared Meta MIT grant below.\npdfmake ${inventory.versions.pdfmake}: MIT grant and embedded component notices below.\nSource Sans 3 3.052R: Adobe copyright and full SIL OFL below.\nThe following original notices retain their separate licenses.\n\n`;
      const source =
        header +
        noticeInputs.map((path) => `\n=== ${path} ===\n\n${checked.load(path)}`).join('\n');
      this.emitFile({ type: 'asset', fileName: 'THIRD_PARTY_NOTICES.txt', source });
    },
  };
}
