import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const routes = new Map([
  ['/', ['proof/index.html', 'text/html']],
  ...['browser.mjs', 'fixtures.mjs', 'document.mjs'].map(file => [`/proof/${file}`, [`proof/${file}`, 'text/javascript']]),
  ['/node_modules/pdfmake/build/pdfmake.min.js', ['node_modules/pdfmake/build/pdfmake.min.js', 'text/javascript']],
  ...['Light', 'SemiBold', 'ExtraLight'].map(weight => [`/assets/fonts/Poppins-${weight}.ttf`, [`assets/fonts/Poppins-${weight}.ttf`, 'font/ttf']]),
]);
const root = new URL('../', import.meta.url);
const server = createServer(async (request, response) => {
  const route = routes.get(request.url);
  if (request.method !== 'GET' || !route) { response.writeHead(404).end(); return; }
  try {
    const body = await readFile(fileURLToPath(new URL(route[0], root)));
    response.writeHead(200, { 'Content-Type': route[1], 'Cache-Control': 'no-store' }).end(body);
  } catch { response.writeHead(500).end('Local proof asset unavailable. Run npm ci.'); }
});
server.listen(4173, '127.0.0.1', () => console.log('Proof: http://127.0.0.1:4173 — stop with Ctrl+C'));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
