import pdfMake from 'pdfmake/build/pdfmake.js';
import { readFile } from 'node:fs/promises';
import { fontFiles } from '../src/pdf/fonts.ts';
import { createPdfBytes } from '../src/pdf/render.ts';
const vfs = Object.fromEntries(
  await Promise.all(
    fontFiles.map(async (file) => [
      file,
      (await readFile(new URL(`../assets/fonts/${file}`, import.meta.url))).toString('base64'),
    ]),
  ),
);
export function renderPdf(resume) {
  return createPdfBytes(resume, pdfMake, vfs);
}
