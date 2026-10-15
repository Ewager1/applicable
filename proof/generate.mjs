import { mkdir, writeFile } from 'node:fs/promises';
import { fixture } from './fixtures.mjs';
import { parsedExample, stressFixture } from './production-fixtures.mjs';
import { renderPdf } from './pdf.mjs';
await mkdir('output/pdf', { recursive: true });
for (const kind of ['short', 'typical', 'long']) {
  const bytes = await renderPdf(fixture(kind));
  const path = `output/pdf/${kind}.pdf`;
  await writeFile(path, bytes);
  console.log(`${path}: ${bytes.length} bytes`);
}

for (const kind of ['parsed', 'split-job', 'multi-page-bullet', 'long-values']) {
  const resume = kind === 'parsed' ? parsedExample : stressFixture(kind);
  const bytes = await renderPdf(resume);
  const path = `output/pdf/${kind}.pdf`;
  await writeFile(path, bytes);
  console.log(`${path}: ${bytes.length} bytes`);
}
