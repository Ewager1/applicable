import { useLayoutEffect, useRef } from 'react';
import type { GenerationState } from './useResumePdf.ts';
import { ErrorSummary } from './Feedback.tsx';

interface Props {
  visible: boolean;
  source: string;
  state: GenerationState;
  onSourceChange: (source: string) => void;
  onSubmit: () => void;
}
export function ResumeForm({ visible, source, state, onSourceChange, onSubmit }: Props) {
  const input = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const generating = state.phase === 'generating';
  const errors = state.phase === 'error' ? state.errors : undefined;
  useLayoutEffect(() => {
    function resize() {
      if (!visible || !input.current) return;
      input.current.style.height = 'auto';
      input.current.style.height = `${input.current.scrollHeight}px`;
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [source, visible]);
  return (
    <form
      ref={form}
      id="resume-form"
      noValidate
      aria-busy={generating}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="form-top">
        <div>
          <label htmlFor="resume">Your resume</label>
          <p id="resume-help">
            Paste the complete text from your chatbot.{' '}
            <span className="shortcut">⌘ / Ctrl + Enter to create.</span>
          </p>
        </div>
        <button id="create-pdf" type="submit" disabled={generating}>
          {generating ? 'Creating PDF…' : 'Create PDF'}
        </button>
      </div>
      <ErrorSummary errors={errors} />
      <textarea
        ref={input}
        id="resume"
        name="resume"
        rows={13}
        aria-invalid={state.phase === 'error' && state.invalidInput ? true : undefined}
        aria-describedby={errors ? 'resume-help error-summary' : 'resume-help'}
        spellCheck={false}
        placeholder="Paste the complete resume text from your chatbot here…"
        value={source}
        onChange={(event) => onSourceChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            if (!generating) form.current?.requestSubmit();
          }
        }}
      />
    </form>
  );
}
