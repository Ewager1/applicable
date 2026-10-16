import { spawn } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';

// Own both local servers; readiness comes from these processes, not another app on a busy port.
const servers = [
  spawn(process.execPath, ['--experimental-strip-types', 'proof/serve.mjs'], { stdio: ['ignore', 'pipe', 'pipe'] }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview'], { stdio: ['ignore', 'pipe', 'pipe'] }),
];
let tests;
const stop = () => {
  tests?.kill();
  for (const server of servers) server.kill();
};
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { process.exitCode = 1; stop(); });
function ready(server, url) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`Timed out starting ${url}`)), 15_000);
    const failed = code => { clearTimeout(timer); reject(new Error(`Test server exited (${code}). Check that ports 4173 and 4174 are free.`)); };
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', failed);
    server.stderr.pipe(process.stderr);
    server.stdout.on('data', chunk => {
      output += chunk;
      // Vite may color parts of the URL separately in CI; normalize accumulated
      // output so an escape sequence split across chunks is handled as well.
      if (stripVTControlCharacters(output).includes(url)) {
        clearTimeout(timer);
        server.removeListener('exit', failed);
        resolve();
      }
    });
  });
}
try {
  await Promise.all([ready(servers[0], 'http://127.0.0.1:4173'), ready(servers[1], 'http://127.0.0.1:4174')]);
  tests = spawn(process.execPath, ['--experimental-strip-types', '--test', 'proof/browser.test.mjs', 'tests/build.browser.test.mjs', 'tests/dev.browser.test.mjs', 'tests/react-lifecycle.browser.test.mjs'], { stdio: 'inherit' });
  process.exitCode = await new Promise((resolve, reject) => {
    tests.once('error', reject);
    tests.once('exit', code => resolve(code ?? 1));
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { stop(); }
