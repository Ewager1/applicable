import './styles.css';
import chatbotInstructions from '../examples/chatbot-instruction.md?raw';
import { parseResume } from './resume/parse.js';
import { loadBrowserFonts } from './pdf/fonts.js';
import { createPdfBytes } from './pdf/render.js';

const resumeForm = document.querySelector('#resume-form');
const resumeInput = document.querySelector('#resume');
const submitButton = document.querySelector('#create-pdf');
const statusMessage = document.querySelector('#status');
const errorSummary = document.querySelector('#error-summary');
const errorList = document.querySelector('#error-list');
const pdfResult = document.querySelector('#result');
const pdfPreview = document.querySelector('#preview');
const downloadLink = document.querySelector('#download');
let sourceRevision = 0;
let isGenerating = false;
let currentPdfUrl;
let loadedFontData;

function resizeInput() {
  resumeInput.style.height = 'auto';
  resumeInput.style.height = `${resumeInput.scrollHeight}px`;
}
function invalidatePdf() {
  pdfResult.hidden = true;
  pdfPreview.removeAttribute('src');
  downloadLink.removeAttribute('href');
  if (currentPdfUrl) URL.revokeObjectURL(currentPdfUrl);
  currentPdfUrl = undefined;
}
function clearErrors() {
  errorSummary.hidden = true;
  errorList.replaceChildren();
  resumeInput.removeAttribute('aria-invalid');
  resumeInput.setAttribute('aria-describedby', 'resume-help');
}
/** @param {import('./resume/types.js').ValidationError[]} items */
function showErrors(items, invalidInput = true) {
  clearErrors();
  for (const item of items) {
    const errorItem = document.createElement('li');
    errorItem.textContent = item.line ? `Line ${item.line}: ${item.message}` : item.message;
    errorList.append(errorItem);
  }
  errorSummary.hidden = false;
  if (invalidInput) resumeInput.setAttribute('aria-invalid', 'true');
  resumeInput.setAttribute('aria-describedby', 'resume-help error-summary');
  errorSummary.focus();
}
function announce(message) {
  if (statusMessage.textContent !== message) statusMessage.textContent = message;
}

resumeInput.addEventListener('input', () => {
  sourceRevision++;
  invalidatePdf();
  clearErrors();
  resizeInput();
  announce('Resume updated. Create a PDF when you’re ready.');
});
window.addEventListener('resize', resizeInput);
resumeInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    if (!isGenerating) resumeForm.requestSubmit(submitButton);
  }
});

resumeForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (isGenerating) return;
  const source = resumeInput.value;
  const submissionRevision = ++sourceRevision;
  invalidatePdf();
  clearErrors();
  const parseResult = parseResume(source);
  if (!parseResult.ok) {
    showErrors(parseResult.errors);
    announce('Check the details above, then create your PDF again.');
    return;
  }
  isGenerating = true;
  submitButton.disabled = true;
  submitButton.textContent = 'Creating PDF…';
  resumeForm.setAttribute('aria-busy', 'true');
  announce('Creating your PDF…');
  const isCurrentSubmission = () => sourceRevision === submissionRevision && resumeInput.value === source;
  try {
    // Failed loads are not cached: a later submission can retry without reloading.
    if (!loadedFontData) loadedFontData = await loadBrowserFonts();
    if (!isCurrentSubmission()) return;
    let pdfMake;
    try {
      pdfMake = (await import('pdfmake/build/pdfmake.js')).default;
    } catch {
      throw new Error('PDF creation could not be loaded. Restart Applicable and try again.');
    }
    if (!isCurrentSubmission()) return;
    const pdfBytes = await createPdfBytes(parseResult.resume, pdfMake, loadedFontData);
    if (!isCurrentSubmission()) return;
    currentPdfUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
    downloadLink.href = currentPdfUrl;
    // Some browsers download iframe PDFs instead of displaying them. Do not
    // create a second automatic download when native inline viewing is absent.
    pdfPreview.hidden = !navigator.pdfViewerEnabled;
    if (navigator.pdfViewerEnabled) pdfPreview.src = currentPdfUrl;
    document.querySelector('#preview-note').textContent = navigator.pdfViewerEnabled
      ? 'Preview the same file you download. If your browser cannot show the preview, use Download PDF to open it.'
      : 'Your browser does not display PDFs here. Use Download PDF to open your resume.';
    pdfResult.hidden = false;
    announce('Your PDF is ready. If the download hasn’t started, use Download PDF.');
    downloadLink.click();
    document.querySelector('#result-title').focus();
  } catch (error) {
    if (!isCurrentSubmission()) return;
    invalidatePdf();
    // A corrupt local font can be fetched again on the next attempt.
    loadedFontData = undefined;
    showErrors([{
      message: error instanceof Error ? error.message : 'The PDF could not be created. Please try again.',
      line: null,
    }], false);
    announce('No PDF was created. Your resume text is still here.');
  } finally {
    isGenerating = false;
    submitButton.disabled = false;
    submitButton.textContent = 'Create PDF';
    resumeForm.setAttribute('aria-busy', 'false');
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
window.addEventListener('pagehide', () => {
  sourceRevision++;
  invalidatePdf();
  announce('Create a PDF when you’re ready.');
});
resizeInput();
