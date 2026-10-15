export const fontFiles = ['Poppins-Light.ttf', 'Poppins-SemiBold.ttf', 'Poppins-ExtraLight.ttf'];
export const fonts = {
  Poppins: { normal: fontFiles[0], bold: fontFiles[1], italics: fontFiles[0], bolditalics: fontFiles[1] },
  Heading: { normal: fontFiles[2], bold: fontFiles[2], italics: fontFiles[2], bolditalics: fontFiles[2] },
};
const fontUrls = [
  new URL('../../assets/fonts/Poppins-Light.ttf', import.meta.url),
  new URL('../../assets/fonts/Poppins-SemiBold.ttf', import.meta.url),
  new URL('../../assets/fonts/Poppins-ExtraLight.ttf', import.meta.url),
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
