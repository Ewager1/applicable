import './styles.css';
import chatbotInstructions from '../examples/chatbot-instruction.md?raw';
import { parseResume } from './resume/parse.js';
import { loadBrowserFonts } from './pdf/fonts.js';
import { createPdfBytes } from './pdf/render.js';

const form = document.querySelector('#resume-form');
const input = document.querySelector('#resume');
const submit = document.querySelector('#create-pdf');
const status = document.querySelector('#status');
const errors = document.querySelector('#error-summary');
const errorList = document.querySelector('#error-list');
const result = document.querySelector('#result');
const preview = document.querySelector('#preview');
const download = document.querySelector('#download');
let revision = 0;
let busy = false;
let currentUrl;
let fontData;

function resizeInput() {
  input.style.height = 'auto';
  input.style.height = `${input.scrollHeight}px`;
}
function invalidatePdf() {
  result.hidden = true;
  preview.removeAttribute('src');
  download.removeAttribute('href');
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = undefined;
}
function clearErrors() {
  errors.hidden = true;
  errorList.replaceChildren();
  input.removeAttribute('aria-invalid');
  input.setAttribute('aria-describedby', 'resume-help');
}
function showErrors(items, invalidInput = true) {
  clearErrors();
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item.line ? `Line ${item.line}: ${item.message}` : item.message;
    errorList.append(li);
  }
  errors.hidden = false;
  if (invalidInput) input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', 'resume-help error-summary');
  errors.focus();
}
function announce(message) {
  if (status.textContent !== message) status.textContent = message;
}

input.addEventListener('input', () => {
  revision++;
  invalidatePdf();
  clearErrors();
  resizeInput();
  announce('Resume updated. Create a PDF when you’re ready.');
});
window.addEventListener('resize', resizeInput);
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    if (!busy) form.requestSubmit(submit);
  }
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const source = input.value;
  const generation = ++revision;
  invalidatePdf();
  clearErrors();
  const parsed = parseResume(source);
  if (!parsed.ok) {
    showErrors(parsed.errors);
    announce('Check the details above, then create your PDF again.');
    return;
  }
  busy = true;
  submit.disabled = true;
  submit.textContent = 'Creating PDF…';
  form.setAttribute('aria-busy', 'true');
  announce('Creating your PDF…');
  const isCurrent = () => revision === generation && input.value === source;
  try {
    // Failed loads are not cached: a later submission can retry without reloading.
    if (!fontData) fontData = await loadBrowserFonts();
    if (!isCurrent()) return;
    let pdfMake;
    try { pdfMake = (await import('pdfmake/build/pdfmake.js')).default; }
    catch { throw new Error('PDF creation could not be loaded. Restart Applicable and try again.'); }
    if (!isCurrent()) return;
    const bytes = await createPdfBytes(parsed.resume, pdfMake, fontData);
    if (!isCurrent()) return;
    currentUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    download.href = currentUrl;
    // Some browsers download iframe PDFs instead of displaying them. Do not
    // create a second automatic download when native inline viewing is absent.
    preview.hidden = !navigator.pdfViewerEnabled;
    if (navigator.pdfViewerEnabled) preview.src = currentUrl;
    document.querySelector('#preview-note').textContent = navigator.pdfViewerEnabled
      ? 'Preview the same file you download. If your browser cannot show the preview, use Download PDF to open it.'
      : 'Your browser does not display PDFs here. Use Download PDF to open your resume.';
    result.hidden = false;
    announce('Your PDF is ready. If the download hasn’t started, use Download PDF.');
    download.click();
    document.querySelector('#result-title').focus();
  } catch (error) {
    if (!isCurrent()) return;
    invalidatePdf();
    // A corrupt local font can be fetched again on the next attempt.
    fontData = undefined;
    showErrors([{ message: error instanceof Error ? error.message : 'The PDF could not be created. Please try again.', line: null }], false);
    announce('No PDF was created. Your resume text is still here.');
  } finally {
    busy = false;
    submit.disabled = false;
    submit.textContent = 'Create PDF';
    form.setAttribute('aria-busy', 'false');
  }
});

const copyButton = document.querySelector('#copy-instructions');
copyButton.addEventListener('click', async () => {
  const copyStatus = document.querySelector('#copy-status');
  try {
    await navigator.clipboard.writeText(chatbotInstructions);
    copyStatus.textContent = 'Instructions copied. Paste them into your chatbot conversation.';
  } catch {
    const fallback = document.querySelector('#instructions-fallback');
    fallback.textContent = chatbotInstructions;
    fallback.hidden = false;
    fallback.focus();
    copyStatus.textContent = 'Select and copy the instructions below.';
  }
});
window.addEventListener('pagehide', () => { revision++; invalidatePdf(); announce('Create a PDF when you’re ready.'); });
resizeInput();
