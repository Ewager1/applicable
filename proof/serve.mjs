import ts from 'typescript';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fontFiles } from '../src/pdf/fonts.ts';
const routes = new Map([
  ['/', ['proof/index.html', 'text/html']],
  ...['browser.mjs', 'fixtures.mjs', 'document.mjs'].map((file) => [
    `/proof/${file}`,
    [`proof/${file}`, 'text/javascript'],
  ]),
  ...[
    'document.ts',
    'fonts.ts',
    'font-coverage.ts',
    'render.ts',
    'pagination.ts',
    'header-fit.ts',
    'pdfmake-adapter.ts',
  ].map((file) => [`/src/pdf/${file}`, [`src/pdf/${file}`, 'text/javascript']]),
  [
    '/node_modules/pdfmake/build/pdfmake.min.js',
    ['node_modules/pdfmake/build/pdfmake.min.js', 'text/javascript'],
  ],
  ...fontFiles.map((file) => [`/assets/fonts/${file}`, [`assets/fonts/${file}`, 'font/ttf']]),
]);
const root = new URL('../', import.meta.url);
const server = createServer(async (request, response) => {
  const route = routes.get(request.url);
  if (request.method !== 'GET' || !route) {
    response.writeHead(404).end();
    return;
  }
  try {
    let body = await readFile(fileURLToPath(new URL(route[0], root)));
    // Only explicit proof routes are served; erase types without writing build files.
    if (route[0].endsWith('.ts')) {
      body = ts.transpileModule(body.toString('utf8'), {
        fileName: route[0],
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      }).outputText;
    }
    response.writeHead(200, { 'Content-Type': route[1], 'Cache-Control': 'no-store' }).end(body);
  } catch {
    response.writeHead(500).end('Local proof asset unavailable. Run npm ci.');
  }
});
server.listen(4173, '127.0.0.1', () =>
  console.log('Proof: http://127.0.0.1:4173 — stop with Ctrl+C'),
);
server.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
