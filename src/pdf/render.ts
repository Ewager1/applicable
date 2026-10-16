import type { Resume } from '../resume/types.ts';
import type { PdfMake, PdfStream } from './pdfmake-adapter.ts';
import { documentDefinition } from './document.ts';
import { fontFiles, fonts } from './fonts.ts';
import { HeaderFitError, verifyHeaderFit } from './header-fit.ts';

/**
 * Generate one byte buffer for both preview and download. Supply pdfmake's local
 * browser bundle and font data returned by loadBrowserFonts (or local Node reads).
 * Failures reject with an Error; the UI must retain source and offer no new PDF.
 */
export async function createPdfBytes(resume: Resume, pdfMake: PdfMake, fontData: Record<string, string>): Promise<Uint8Array> {
  const definition = documentDefinition(resume);
  if (!fontFiles.every(file => typeof fontData?.[file] === 'string' && fontData[file].length)) {
    throw new Error('The local resume fonts are missing. Restart Applicable and try again.');
  }
  return new Promise((resolve, reject) => {
    let stream: PdfStream | undefined;
    const fail = (cause: unknown) => reject(new Error('The PDF could not be created. Check the local font files and try again.', { cause }));
    try {
      verifyHeaderFit(resume, pdfMake, fontData);
      // With all fonts in VFS, the synchronous stream API exposes creation errors.
      // getBuffer's async URL-resolution path can otherwise reject outside our promise.
      stream = pdfMake.createPdf(definition, undefined, fonts, fontData).getStream();
      const chunks: Uint8Array[] = [];
      let length = 0;
      stream.on('data', (chunk: Uint8Array) => { chunks.push(chunk); length += chunk.length; });
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
