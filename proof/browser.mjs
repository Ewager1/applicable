import { fixture } from './fixtures.mjs';
import { documentDefinition, fontFiles, fonts } from './document.mjs';
const button = document.querySelector('#generate');
const status = document.querySelector('#status');
const preview = document.querySelector('#preview');
const download = document.querySelector('#download');
let currentUrl;
const vfs = await Promise.all(fontFiles.map(async file => {
  const response = await fetch(`/assets/fonts/${file}`);
  if (!response.ok) throw new Error(`Font unavailable: ${file}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return [file, btoa(binary)];
})).then(Object.fromEntries).catch(error => { status.textContent = error.message; button.disabled = true; });
if (vfs) button.disabled = false;
button.addEventListener('click', async () => {
  button.disabled = true;
  status.textContent = 'Generating…';
  try {
    const bytes = await new Promise((resolve, reject) => {
      try { window.pdfMake.createPdf(documentDefinition(fixture(document.querySelector('#sample').value)), undefined, fonts, vfs).getBuffer(resolve); }
      catch (error) { reject(error); }
    });
    const oldUrl = currentUrl;
    currentUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    download.href = currentUrl;
    preview.src = currentUrl;
    download.hidden = preview.hidden = false;
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    status.textContent = 'PDF ready. Preview and download share the same file.';
  } catch (error) {
    status.textContent = `PDF generation failed: ${error.message}`;
  } finally { button.disabled = false; }
});
window.addEventListener('pagehide', () => { if (currentUrl) URL.revokeObjectURL(currentUrl); });
