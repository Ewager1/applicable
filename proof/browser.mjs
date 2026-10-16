import { fixture } from './fixtures.mjs';
import { loadBrowserFonts } from '../src/pdf/fonts.ts';
import { createPdfBytes } from '../src/pdf/render.ts';
const button = document.querySelector('#generate');
const status = document.querySelector('#status');
const preview = document.querySelector('#preview');
const download = document.querySelector('#download');
let currentUrl;
const vfs = await loadBrowserFonts().catch(error => { status.textContent = error.message; button.disabled = true; });
if (vfs) button.disabled = false;
button.addEventListener('click', async () => {
  button.disabled = true;
  status.textContent = 'Generating…';
  try {
    const bytes = await createPdfBytes(fixture(document.querySelector('#sample').value), window.pdfMake, vfs);
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
