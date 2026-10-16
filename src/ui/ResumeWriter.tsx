import { useLayoutEffect, useRef, useState } from 'react';
import { buildResumeWriterPrompt } from '../resume-writer/prompt.ts';
import formatInstructions from '../../examples/chatbot-instruction.md?raw';
import {
  additionalQuestions,
  emptyResumeWriterAnswers,
  mainQuestions,
  type ResumeWriterAnswers,
} from '../resume-writer/questions.ts';

export function ResumeWriter({ onFormatHelp }: { onFormatHelp: () => void }) {
  const [answers, setAnswers] = useState<ResumeWriterAnswers>(emptyResumeWriterAnswers);

  const [fallbackPrompt, setFallbackPrompt] = useState('');
  const [status, setStatus] = useState('');
  const output = useRef<HTMLTextAreaElement>(null);
  // Edits and newer requests invalidate pending clipboard feedback.
  const revision = useRef(0);

  useLayoutEffect(() => {
    if (fallbackPrompt) {
      output.current?.focus();
      output.current?.select();
    }
  }, [fallbackPrompt]);

  function clearCopyFeedback() {
    revision.current += 1;
    setFallbackPrompt('');
    setStatus('');
  }

  async function copy() {
    const prompt = buildResumeWriterPrompt(answers, formatInstructions);
    const currentRevision = ++revision.current;
    setFallbackPrompt('');
    setStatus('');
    try {
      await navigator.clipboard.writeText(prompt);
      if (currentRevision === revision.current)
        setStatus(
          'Setup prompt copied. Paste it into a new ChatGPT conversation and upload one or more existing resumes there. Reuse that conversation for future jobs.',
        );
    } catch {
      if (currentRevision !== revision.current) return;
      setFallbackPrompt(prompt);
      setStatus(
        'Copy was unavailable. The prompt is selected below; use your device’s Copy command.',
      );
      output.current?.focus();
      output.current?.select();
    }
  }

  function renderQuestions(questions: typeof mainQuestions) {
    return questions.map(({ key, label, example }) => (
      <div className="resume-writer-field" key={key}>
        <label htmlFor={`resume-writer-${key}`}>
          {label} <span className="optional">(optional)</span>
        </label>
        <p id={`resume-writer-${key}-example`}>Example: {example}</p>
        <textarea
          id={`resume-writer-${key}`}
          rows={3}
          aria-describedby={`resume-writer-${key}-example`}
          value={answers[key]}
          onChange={(event) => {
            clearCopyFeedback();
            setAnswers({ ...answers, [key]: event.target.value });
          }}
        />
      </div>
    ));
  }

  return (
    <section aria-labelledby="resume-writer-title">
      <div className="intro">
        <p className="eyebrow">RESUME WRITER</p>
        <h2 id="resume-writer-title">A resume for every opportunity.</h2>
        <p>
          Set up a ChatGPT conversation that understands your professional experience and helps
          tailor your resume to individual job descriptions.
        </p>
      </div>
      <section className="resume-writer-questionnaire" aria-labelledby="background-title">
        <h3 id="background-title">Help your Resume Writer get to know you</h3>
        <p>
          Your existing resumes will provide most of the information ChatGPT needs. These optional
          questions help it understand the work behind your job titles, including accomplishments,
          responsibilities, and experiences that may not appear on a resume.
        </p>
        <p>
          Your answers can help ChatGPT write stronger professional summaries, tailor your
          experience more accurately, and suggest more personal cover letters or application
          responses.
        </p>
        <p>
          Short answers are fine. You can skip anything you aren’t sure about, and “I don’t know” is
          a perfectly acceptable answer. All 12 questions are optional.
        </p>
        <p>
          You don’t need to remember everything today. Your Resume Writer can ask follow-up
          questions and continue learning about your experience as you use it.
        </p>
        <p>
          Answers and your setup prompt stay on this page while you switch tools and reset on
          reload. Copy Setup Prompt includes any answers you provide; skipping every question is
          fine. Nothing is sent to ChatGPT until you paste it there.
        </p>
        {renderQuestions(mainQuestions)}
        <details>
          <summary>Tell us a little more</summary>
          <p>These six extra questions are optional too. Skip any you like.</p>
          {renderQuestions(additionalQuestions)}
        </details>
      </section>
      <button className="resume-writer-copy" type="button" onClick={() => void copy()}>
        Copy Setup Prompt
      </button>
      <p id="resume-writer-copy-status" className="status" role="status" aria-live="polite">
        {status}
      </p>
      {fallbackPrompt && (
        <div className="resume-writer-output">
          <label htmlFor="resume-writer-prompt">Your Resume Writer setup prompt</label>
          <p id="resume-writer-manual-help">
            Copy this prompt into a new ChatGPT conversation, then upload your existing resumes
            there.
          </p>
          <textarea
            ref={output}
            id="resume-writer-prompt"
            readOnly
            rows={16}
            value={fallbackPrompt}
            aria-describedby="resume-writer-manual-help resume-writer-copy-status"
          />
        </div>
      )}
      <ol className="tool-steps">
        <li>Copy your setup prompt, with or without optional answers.</li>
        <li>Paste it into a new, separate ChatGPT conversation.</li>
        <li>
          Upload one or more existing resumes to ChatGPT and answer its short clarification
          questions.
        </li>
        <li>
          Share a job description whenever you are ready to tailor a resume. Review every result for
          accuracy.
        </li>
        <li>Reuse the same conversation for future jobs and ask for either resume format.</li>
      </ol>
      <p className="tool-guidance">
        Standard Resume is the default: conventional headings and bullets you can use on their own.
        Ask for Applicable Format when you want structured text to paste into Resume PDF Maker.
        ChatGPT can also help with cover letters and application responses when you ask.
      </p>
      <button className="secondary" type="button" onClick={onFormatHelp}>
        Open chatbot formatting instructions
      </button>
      <p className="tool-guidance">
        Reuse and refine this conversation over time. You can use Resume Writer independently of Job
        Finder.
      </p>
    </section>
  );
}
