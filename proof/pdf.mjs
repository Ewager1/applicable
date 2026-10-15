import pdfMake from 'pdfmake/build/pdfmake.js';
import { readFile } from 'node:fs/promises';
import { fontFiles } from '../app/pdf/fonts.js';
import { createPdfBytes } from '../app/pdf/render.js';
const vfs = Object.fromEntries(await Promise.all(fontFiles.map(async file => [file, (await readFile(new URL(`../assets/fonts/${file}`, import.meta.url))).toString('base64')])));
export function renderPdf(resume) {
  return createPdfBytes(resume, pdfMake, vfs);
}
