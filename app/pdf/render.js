import { documentDefinition } from './document.js';
import { fontFiles, fonts } from './fonts.js';
import { HeaderFitError, verifyHeaderFit } from './header-fit.js';

/**
 * Generate one byte buffer for both preview and download. Supply pdfmake's local
 * browser bundle and font data returned by loadBrowserFonts (or local Node reads).
 * Failures reject with an Error; the UI must retain source and offer no new PDF.
 * @param {import('../resume/types.js').Resume} resume
 * @param {typeof import('pdfmake/build/pdfmake.js')} pdfMake Local browser engine.
 * @param {Record<string, string>} fontData Bundled TTF filenames to base64 data.
 * @returns {Promise<Uint8Array>}
 */
export async function createPdfBytes(resume, pdfMake, fontData) {
  const definition = documentDefinition(resume);
  if (!fontFiles.every(file => typeof fontData?.[file] === 'string' && fontData[file].length)) {
    throw new Error('The local resume fonts are missing. Restart Applicable and try again.');
  }
  return new Promise((resolve, reject) => {
    let stream;
    const fail = cause => reject(new Error('The PDF could not be created. Check the local font files and try again.', { cause }));
    try {
      verifyHeaderFit(resume, pdfMake, fontData);
      // With all fonts in VFS, the synchronous stream API exposes creation errors.
      // getBuffer's async URL-resolution path can otherwise reject outside our promise.
      stream = pdfMake.createPdf(definition, undefined, fonts, fontData).getStream();
      const chunks = [];
      let length = 0;
      stream.on('data', chunk => { chunks.push(chunk); length += chunk.length; });
      stream.once('error', fail);
      stream.once('end', () => {
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        resolve(bytes);
      });
      stream.end();
    } catch (error) {
      stream?.destroy();
      if (error instanceof HeaderFitError) reject(error);
      else fail(error);
    }
  });
}
