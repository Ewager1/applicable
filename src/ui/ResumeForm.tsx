import { useLayoutEffect, useRef } from 'react';
import type { ContactFields } from '../resume/types.ts';
import type { GenerationState } from './useResumePdf.ts';
import { ErrorSummary } from './Feedback.tsx';

interface Props {
  contact: ContactFields;
  contactWarning: string;
  onContactChange: (contact: ContactFields) => void;
  source: string;
  company: string;
  state: GenerationState;
  onSourceChange: (source: string) => void;
  onCompanyChange: (company: string) => void;
  onSubmit: () => void;
}
export function ResumeForm({
  contact,
  contactWarning,
  onContactChange,
  source,
  company,
  state,
  onSourceChange,
  onCompanyChange,
  onSubmit,
}: Props) {
  const input = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const generating = state.phase === 'generating';
  const errors = state.phase === 'error' ? state.errors : undefined;
  useLayoutEffect(() => {
    function resize() {
      if (!input.current) return;
      input.current.style.height = 'auto';
      input.current.style.height = `${input.current.scrollHeight}px`;
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [source]);
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
      <fieldset className="contact-fields" aria-describedby="contact-help">
        <legend>Your contact details</legend>
        <p id="contact-help">
          Only Full Name is required. These five fields are saved in this browser for future visits.
          Clear them to remove their saved values, or clear this site’s browser data.
        </p>
        {contactWarning && (
          <p className="storage-warning" role="status">
            {contactWarning}
          </p>
        )}
        <div className="contact-grid">
          {(
            [
              ['fullName', 'Full Name', 'name'],
              ['email', 'Email', 'email'],
              ['linkedIn', 'LinkedIn', 'off'],
              ['website', 'Website', 'url'],
              ['phoneNumber', 'Phone Number', 'tel'],
            ] as const
          ).map(([key, label, autoComplete]) => (
            <div key={key}>
              <label htmlFor={key}>
                {label} {key !== 'fullName' && <span className="optional">(optional)</span>}
              </label>
              <input
                id={key}
                name={key}
                type="text"
                autoComplete={autoComplete}
                required={key === 'fullName'}
                aria-invalid={
                  key === 'fullName' && state.phase === 'error' && state.invalidName
                    ? true
                    : undefined
                }
                aria-describedby={
                  key === 'fullName' && state.phase === 'error' && state.invalidName
                    ? 'contact-help error-summary'
                    : 'contact-help'
                }
                value={contact[key]}
                onChange={(event) => onContactChange({ ...contact, [key]: event.target.value })}
              />
            </div>
          ))}
        </div>
      </fieldset>
      <div className="company-field">
        <label htmlFor="company">
          Company you’re applying to <span className="optional">(optional)</span>
        </label>
        <p id="company-help">Used only in the downloaded filename.</p>
        <input
          id="company"
          name="company"
          type="text"
          autoComplete="off"
          aria-describedby="company-help"
          value={company}
          onChange={(event) => onCompanyChange(event.target.value)}
        />
      </div>
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
