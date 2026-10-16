import { useLayoutEffect, useRef, useState } from 'react';
import { buildResumeWriterPrompt } from '../resume-writer/prompt.ts';
import formatInstructions from '../../examples/chatbot-instruction.md?raw';
import {
  additionalQuestions,
  emptyResumeWriterAnswers,
  mainQuestions,
  type ResumeWriterAnswers,
} from '../resume-writer/questions.ts';

// Presentation examples stay separate from the shared prompt questionnaire contract.
const fieldGuidance: Record<keyof ResumeWriterAnswers, { placeholder: string; help?: string }> = {
  interestedJobs: { placeholder: 'For example, customer support or office coordination.' },
  everydayWork: {
    placeholder: 'For example, repaired equipment and explained repairs to customers.',
  },
  accomplishments: {
    placeholder: 'For example, improved a process, trained coworkers, or helped launch a project.',
  },
  measurableResults: {
    placeholder: 'For example, saved time, fewer errors, or happier customers.',
    help: 'Only include reasonably supported numbers, and keep estimates labeled as estimates. No numbers is fine too.',
  },
  unexplainedSkills: {
    placeholder: 'For example, tracking deliveries or translating instructions.',
  },
  avoidOverstatement: {
    placeholder: "For example, helped with a website but didn't lead it.",
    help: 'Distinguish helping from leading, and note limited or outdated qualifications.',
  },
  helpingOthers: { placeholder: 'For example, wrote instructions for new coworkers.' },
  collaboration: {
    placeholder: 'For example, worked with reception staff to fix scheduling issues.',
  },
  leadership: { placeholder: 'For example, guided new teammates or handled shift handoffs.' },
  familiarCommunities: { placeholder: 'For example, local small businesses or older adults.' },
  otherExperience: {
    placeholder: 'For example, volunteering, a school project, or freelance work.',
  },
  additionalContext: { placeholder: 'For example, returning to work after caregiving.' },
};

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
        setStatus('Prompt copied. Paste it into ChatGPT and upload your resumes.');
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
    return questions.map(({ key, label }) => (
      <div className="resume-writer-field" key={key}>
        <label htmlFor={`resume-writer-${key}`}>
          {label} <span className="optional">(optional)</span>
        </label>
        {fieldGuidance[key].help && (
          <p id={`resume-writer-${key}-help`}>{fieldGuidance[key].help}</p>
        )}
        <textarea
          id={`resume-writer-${key}`}
          rows={3}
          placeholder={fieldGuidance[key].placeholder}
          aria-describedby={fieldGuidance[key].help ? `resume-writer-${key}-help` : undefined}
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
        <h1 id="resume-writer-title">Turn job descriptions into tailored resumes.</h1>
        <p>
          Resume Writer sets up a ChatGPT conversation that gets to know your professional
          background. Once it's ready, simply paste a job description to create a tailored resume.
        </p>
        <p>
          You can request a standard, readable resume or one formatted specifically for Applicable's
          Resume PDF Maker. Just ask ChatGPT to switch between them.
        </p>
      </div>
      <section className="resume-writer-questionnaire" aria-labelledby="background-title">
        <h2 id="background-title">Help your Resume Writer get to know you</h2>
        <p>
          Your existing resumes provide most of what ChatGPT needs. These optional questions help
          fill in important details about your experience and accomplishments.
        </p>
        <p>
          Short answers are fine. Skip anything you're unsure about. ChatGPT can ask follow-up
          questions as you work together.
        </p>
        {renderQuestions(mainQuestions)}
        <details>
          <summary>Tell us a little more</summary>
          {renderQuestions(additionalQuestions)}
        </details>
      </section>
      <p className="tool-guidance">
        Answers stay in this browser page until reload. They are shared with ChatGPT only when you
        paste the prompt.
      </p>
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
      <p className="tool-guidance">
        Copy your setup prompt, paste it into a new ChatGPT conversation, and upload your existing
        resumes. Once you're ready, share a job description to create a tailored resume.
      </p>
      <button className="secondary" type="button" onClick={onFormatHelp}>
        Open chatbot formatting instructions
      </button>
    </section>
  );
}
