import { useRef, useState } from 'react';
import { buildJobFinderPrompt, type JobFinderAnswers } from '../job-finder/prompt.ts';

const questions: { key: keyof JobFinderAnswers; label: string; example: string }[] = [
  {
    key: 'roles',
    label: 'What kinds of jobs are you looking for?',
    example: 'Customer success or operations roles; open to related titles.',
  },
  {
    key: 'location',
    label: 'Where would you like to work?',
    example: 'Remote in the US, or hybrid near Boston.',
  },
  {
    key: 'mustHaves',
    label: 'What are your must-haves?',
    example: 'No overnight shifts. These are requirements I cannot compromise on.',
  },
  {
    key: 'preferences',
    label: 'What would be nice to have?',
    example: 'A small team and education benefits; I can be flexible.',
  },
  {
    key: 'salary',
    label: 'What salary range interests you?',
    example: '$70,000–$90,000, depending on benefits and responsibilities.',
  },
  {
    key: 'experience',
    label: 'What experience level are you targeting?',
    example: 'Mid-level individual contributor; open to a first team-lead role.',
  },
  {
    key: 'other',
    label: 'Is there anything else we should consider?',
    example: 'Changing industries; interested in using my training experience.',
  },
];
const emptyAnswers: JobFinderAnswers = {
  roles: '',
  location: '',
  mustHaves: '',
  preferences: '',
  salary: '',
  experience: '',
  other: '',
};

export function JobFinderSetup() {
  const [answers, setAnswers] = useState(emptyAnswers);
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('');
  const output = useRef<HTMLTextAreaElement>(null);
  // An edit or regeneration also invalidates feedback from a pending clipboard request.
  const revision = useRef(0);

  async function copy() {
    const currentRevision = revision.current;
    try {
      await navigator.clipboard.writeText(prompt);
      if (currentRevision === revision.current)
        setStatus('Prompt copied. Paste it into a new ChatGPT conversation.');
    } catch {
      if (currentRevision !== revision.current) return;
      setStatus(
        'Copy was unavailable. The prompt is selected below; use your device’s Copy command.',
      );
      output.current?.focus();
      output.current?.select();
    }
  }

  return (
    <div className="job-finder-setup">
      <p id="job-finder-help">
        All seven questions are optional. Must-haves are non-negotiable; nice-to-haves and other
        preferences are flexible. No account, uploads or personal information are needed here.
        Answers and generated prompts stay on this page and are cleared on reload.
      </p>
      <form
        aria-label="Job Finder setup"
        aria-describedby="job-finder-help"
        onSubmit={(event) => {
          event.preventDefault();
          revision.current += 1;
          setPrompt(buildJobFinderPrompt(answers));
          setStatus('Prompt generated. Review it below, then copy it.');
        }}
      >
        {questions.map(({ key, label, example }) => (
          <div className="job-finder-field" key={key}>
            <label htmlFor={`job-finder-${key}`}>
              {label} <span className="optional">(optional)</span>
            </label>
            <p id={`job-finder-${key}-example`}>Example: {example}</p>
            <textarea
              id={`job-finder-${key}`}
              rows={3}
              aria-describedby={`job-finder-${key}-example`}
              value={answers[key]}
              onChange={(event) => {
                revision.current += 1;
                setAnswers({ ...answers, [key]: event.target.value });
                setPrompt('');
                setStatus('');
              }}
            />
          </div>
        ))}
        <button type="submit">Generate Prompt</button>
      </form>
      {prompt && (
        <div className="job-finder-output">
          <label htmlFor="job-finder-prompt">Your Job Finder prompt</label>
          <p id="job-finder-next-steps">
            Paste this prompt into a new ChatGPT conversation and upload your existing resumes
            there. Answer its short clarification questions. For future searches, ask “Look for
            jobs.” Review results and apply yourself.
          </p>
          <textarea
            ref={output}
            id="job-finder-prompt"
            readOnly
            value={prompt}
            rows={16}
            aria-describedby="job-finder-next-steps job-finder-copy-status"
          />
          <button className="secondary" type="button" onClick={() => void copy()}>
            Copy Prompt
          </button>
        </div>
      )}
      <p id="job-finder-copy-status" className="status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
