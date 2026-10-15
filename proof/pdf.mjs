import pdfMake from 'pdfmake/build/pdfmake.js';
import { readFile } from 'node:fs/promises';
import { documentDefinition, fontFiles, fonts } from './document.mjs';
const vfs = Object.fromEntries(await Promise.all(fontFiles.map(async file => [file, (await readFile(new URL(`../assets/fonts/${file}`, import.meta.url))).toString('base64')])));
export function renderPdf(resume) {
  return new Promise((resolve, reject) => {
    try { pdfMake.createPdf(documentDefinition(resume), undefined, fonts, vfs).getBuffer(resolve); }
    catch (error) { reject(error); }
  });
}
