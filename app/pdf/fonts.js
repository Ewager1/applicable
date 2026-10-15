export const fontFiles = ['SourceSans3-Regular.ttf', 'SourceSans3-Semibold.ttf', 'SourceSans3-Bold.ttf'];
export const fonts = {
  SourceSans3: { normal: fontFiles[0], bold: fontFiles[2], italics: fontFiles[0], bolditalics: fontFiles[2] },
  SourceSans3Semibold: { normal: fontFiles[1], bold: fontFiles[1], italics: fontFiles[1], bolditalics: fontFiles[1] },
};
const fontUrls = [
  new URL('../../assets/fonts/SourceSans3-Regular.ttf', import.meta.url),
  new URL('../../assets/fonts/SourceSans3-Semibold.ttf', import.meta.url),
  new URL('../../assets/fonts/SourceSans3-Bold.ttf', import.meta.url),
];

/** Load only bundled local assets. The caller can retain the resulting map for later exports. */
export async function loadBrowserFonts() {
  try {
    return Object.fromEntries(await Promise.all(fontUrls.map(async (url, index) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Font request failed');
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return [fontFiles[index], btoa(binary)];
    })));
  } catch {
    throw new Error('The local resume fonts could not be loaded. Restart Applicable and try again.');
  }
}
