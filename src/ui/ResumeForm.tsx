import { useLayoutEffect, useRef, useState } from 'react';
import exampleResume from '../../examples/resume.txt?raw';
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
  const clipboardRevision = useRef(0);
  const [clipboardStatus, setClipboardStatus] = useState('');
  const [exampleLoaded, setExampleLoaded] = useState(false);
  const generating = state.phase === 'generating';
  function updateSource(value: string, isExample = false) {
    clipboardRevision.current += 1;
    setClipboardStatus('');
    setExampleLoaded(isExample);
    onSourceChange(value);
  }
  async function pasteFromClipboard() {
    clipboardRevision.current += 1;
    const request = clipboardRevision.current;
    setClipboardStatus('');
    let text: string;
    try {
      if (typeof navigator.clipboard?.readText !== 'function') {
        setClipboardStatus('Clipboard access is unavailable. Paste directly into Resume text.');
        input.current?.focus();
        return;
      }
      text = await navigator.clipboard.readText();
    } catch {
      if (request !== clipboardRevision.current) return;
      setClipboardStatus('Couldn’t read the clipboard. Paste directly into Resume text.');
      input.current?.focus();
      return;
    }
    // Edits, example actions, newer reads, hiding and unmounting cancel pending replacement.
    if (request !== clipboardRevision.current) return;
    if (!text.trim()) {
      setClipboardStatus('The clipboard has no text. Paste your resume or try an example.');
    } else {
      updateSource(text);
    }
    input.current?.focus();
  }
  const errors = state.phase === 'error' ? state.errors : undefined;
  useLayoutEffect(() => {
    function resize() {
      if (!visible || !input.current) return;
      input.current.style.height = 'auto';
      input.current.style.height = `${input.current.scrollHeight}px`;
    }
    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      // A hidden, changed or unmounted editor must not receive a delayed clipboard read.
      clipboardRevision.current += 1;
    };
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
          <label htmlFor="resume">Resume text</label>
          <p id="resume-help">
            Use Applicable Format. <span className="shortcut">⌘ / Ctrl + Enter to create.</span>
          </p>
        </div>
      </div>
      {source === '' && (
        <div className="editor-starting-actions">
          <button
            className="secondary"
            type="button"
            disabled={generating}
            onClick={() => void pasteFromClipboard()}
          >
            Paste from clipboard
          </button>
          <button
            className="secondary"
            type="button"
            disabled={generating}
            onClick={() => {
              updateSource(exampleResume, true);
              input.current?.focus();
            }}
          >
            Try an example
          </button>
        </div>
      )}
      {exampleLoaded && source === exampleResume && (
        <div className="editor-starting-actions">
          <button
            className="secondary"
            type="button"
            onClick={() => {
              updateSource('');
              input.current?.focus();
            }}
          >
            Remove example
          </button>
        </div>
      )}
      <p
        className="editor-clipboard-status status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {clipboardStatus}
      </p>
      <ErrorSummary errors={errors} />
      <textarea
        ref={input}
        id="resume"
        name="resume"
        rows={13}
        aria-invalid={state.phase === 'error' && state.invalidInput ? true : undefined}
        aria-describedby={errors ? 'resume-help error-summary' : 'resume-help'}
        spellCheck={false}
        placeholder="Paste your Applicable-formatted resume to get started."
        value={source}
        onChange={(event) => updateSource(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            if (!generating) form.current?.requestSubmit();
          }
        }}
      />
      <div className="editor-actions">
        <button id="create-pdf" type="submit" disabled={generating}>
          {generating ? 'Creating PDF…' : 'Create PDF'}
        </button>
      </div>
    </form>
  );
}
