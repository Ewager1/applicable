import { useEffect, useRef, useState } from 'react';
import { resumeFilename } from '../download-filename.ts';
import { assembleResume } from '../resume/contact.ts';
import { parseResume } from '../resume/parse.ts';
import type { ContactFields, ValidationError } from '../resume/types.ts';
import { loadBrowserFonts } from '../pdf/fonts.ts';
import { createPdfBytes } from '../pdf/render.ts';

export interface PdfArtifact { url: string; filename: string }
export type GenerationState =
  | { phase: 'idle' }
  | { phase: 'generating' }
  | { phase: 'error'; errors: ValidationError[]; invalidInput: boolean; invalidName?: boolean }
  | { phase: 'ready'; artifact: PdfArtifact };

/** Own pending work and its Blob URL; edits and lifecycle cleanup invalidate both. */
export function useResumePdf() {
  const [state, setState] = useState<GenerationState>({ phase: 'idle' });
  const [status, setStatus] = useState('');
  const revision = useRef(0);
  const busy = useRef(false);
  const generation = useRef(0);
  const active = useRef(false);
  const currentUrl = useRef<string | undefined>(undefined);
  const fontData = useRef<Record<string, string> | undefined>(undefined);

  function revokeArtifact() {
    if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    currentUrl.current = undefined;
  }
  function invalidate(message: string) {
    revision.current++;
    revokeArtifact();
    // Pending work still owns the busy slot until its next asynchronous boundary.
    setState(busy.current ? { phase: 'generating' } : { phase: 'idle' });
    setStatus(message);
  }
  useEffect(() => {
    active.current = true;
    const pageHide = () => {
      revision.current++;
      revokeArtifact();
      setState(busy.current ? { phase: 'generating' } : { phase: 'idle' });
      setStatus('Create a PDF when you’re ready.');
    };
    window.addEventListener('pagehide', pageHide);
    return () => {
      active.current = false;
      revision.current++;
      generation.current++;
      busy.current = false;
      revokeArtifact();
      window.removeEventListener('pagehide', pageHide);
    };
  }, []);

  async function generate(source: string, company: string, contact: ContactFields) {
    if (busy.current || !active.current) return;
    const submissionRevision = ++revision.current;
    revokeArtifact();
    const parsed = parseResume(source);
    if (!parsed.ok || !contact.fullName.trim()) {
      const errors = [...(!contact.fullName.trim() ? [{ message: 'Enter your Full Name in the contact fields above before creating a PDF.', line: null }] : []), ...(!parsed.ok ? parsed.errors : [])];
      setState({ phase: 'error', errors, invalidInput: !parsed.ok, invalidName: !contact.fullName.trim() });
      setStatus('Check the details above, then create your PDF again.');
      return;
    }
    const generationId = ++generation.current;
    busy.current = true;
    setState({ phase: 'generating' });
    setStatus('Creating your PDF…');
    const isCurrent = () => active.current && revision.current === submissionRevision;
    try {
      // Cache successful loads only; a failed/corrupt load can be retried.
      const loadedFonts = fontData.current ?? await loadBrowserFonts();
      if (!isCurrent()) return;
      fontData.current = loadedFonts;
      let pdfMake;
      try {
        pdfMake = (await import('pdfmake/build/pdfmake.js')).default;
      } catch {
        throw new Error('PDF creation could not be loaded. Copy your resume somewhere safe, reload Applicable, then paste it back and try again.');
      }
      if (!isCurrent()) return;
      const bytes = await createPdfBytes(assembleResume(parsed.resume, contact), pdfMake, loadedFonts);
      if (!isCurrent()) return;
      const url = URL.createObjectURL(new Blob([bytes.slice().buffer], { type: 'application/pdf' }));
      currentUrl.current = url;
      setState({ phase: 'ready', artifact: { url, filename: resumeFilename(parsed.resume.title, company) } });
      setStatus('Your PDF is ready. If the download hasn’t started, use Download PDF.');
    } catch (error) {
      if (!isCurrent()) return;
      revokeArtifact();
      fontData.current = undefined;
      setState({ phase: 'error', invalidInput: false, errors: [{
        message: error instanceof Error ? error.message : 'The PDF could not be created. Please try again.', line: null,
      }] });
      setStatus('No PDF was created. Your resume text is still here.');
    } finally {
      // Cleanup/unmount can release this slot, but stale work cannot update UI.
      if (active.current && generation.current === generationId) {
        busy.current = false;
        setState(current => current.phase === 'generating' ? { phase: 'idle' } : current);
      }
    }
  }
  return { state, status, invalidate, generate };
}
