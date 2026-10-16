import type { TFontDictionary } from 'pdfmake/interfaces.js';

const fontDescriptors = [
  {
    file: 'SourceSans3-Regular.ttf',
    url: new URL('../../assets/fonts/SourceSans3-Regular.ttf', import.meta.url),
  },
  {
    file: 'SourceSans3-Semibold.ttf',
    url: new URL('../../assets/fonts/SourceSans3-Semibold.ttf', import.meta.url),
  },
  {
    file: 'SourceSans3-Bold.ttf',
    url: new URL('../../assets/fonts/SourceSans3-Bold.ttf', import.meta.url),
  },
];
const [regular, semibold, bold] = fontDescriptors;
export const fontFiles = fontDescriptors.map(font => font.file);
export const fonts: TFontDictionary = {
  SourceSans3: {
    normal: regular.file,
    bold: bold.file,
    italics: regular.file,
    bolditalics: bold.file,
  },
  SourceSans3Semibold: {
    normal: semibold.file,
    bold: semibold.file,
    italics: semibold.file,
    bolditalics: semibold.file,
  },
};

/**
 * Load only bundled local assets. The caller can retain the map for later exports.
 * @returns {Promise<Record<string, string>>} Bundled filenames to base64 TTF data.
 */
export async function loadBrowserFonts(): Promise<Record<string, string>> {
  try {
    return Object.fromEntries(await Promise.all(fontDescriptors.map(async ({ file, url }) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Font request failed');
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return [file, btoa(binary)];
    })));
  } catch {
    throw new Error('The local resume fonts could not be loaded. Restart Applicable and try again.');
  }
}
