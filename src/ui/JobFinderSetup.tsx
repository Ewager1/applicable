import { useLayoutEffect, useRef, useState } from 'react';
import {
  buildJobFinderPrompt,
  defaultJobFinderSettings,
  type JobFinderAnswers,
  type JobFinderSettings,
} from '../job-finder/prompt.ts';

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
const settingsFields: { key: keyof JobFinderSettings; label: string; description: string }[] = [
  {
    key: 'usJobsOnly',
    label: 'Search U.S. jobs only',
    description:
      'Limit results to positions based in the United States or remote jobs that accept U.S.-based applicants.',
  },
  {
    key: 'preferRecent',
    label: 'Prefer recently posted positions',
    description: 'Prioritize newer jobs without excluding strong older matches.',
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
  const [settings, setSettings] = useState<JobFinderSettings>({ ...defaultJobFinderSettings });
  const [fallbackPrompt, setFallbackPrompt] = useState('');
  const [status, setStatus] = useState('');
  const output = useRef<HTMLTextAreaElement>(null);
  // Edits and newer copy requests invalidate pending clipboard feedback.
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
    const prompt = buildJobFinderPrompt(answers, settings);
    const currentRevision = ++revision.current;
    setFallbackPrompt('');
    setStatus('');
    try {
      await navigator.clipboard.writeText(prompt);
      if (currentRevision === revision.current)
        setStatus(
          'Prompt copied. Paste it into a new ChatGPT conversation and upload your resumes.',
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

  return (
    <div className="job-finder-setup">
      <p id="job-finder-help">
        All questions are optional. Use Must-haves for requirements you can't compromise on.
        Everything else can be flexible.
      </p>
      <p className="tool-guidance">
        Answers and search preferences stay on this page until reload. Nothing is shared with
        ChatGPT until you paste the prompt.
      </p>
      <form
        aria-label="Job Finder setup"
        aria-describedby="job-finder-help"
        onSubmit={(event) => {
          event.preventDefault();
          void copy();
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
                clearCopyFeedback();
                setAnswers({ ...answers, [key]: event.target.value });
              }}
            />
          </div>
        ))}
        <fieldset className="job-finder-settings">
          <legend>Search preferences</legend>
          {settingsFields.map(({ key, label, description }) => (
            <div className="job-finder-setting" key={key}>
              <label htmlFor={`job-finder-${key}`}>
                <input
                  id={`job-finder-${key}`}
                  type="checkbox"
                  checked={settings[key]}
                  aria-describedby={`job-finder-${key}-description`}
                  onChange={(event) => {
                    clearCopyFeedback();
                    setSettings({ ...settings, [key]: event.target.checked });
                  }}
                />
                {label}
              </label>
              <p id={`job-finder-${key}-description`}>{description}</p>
            </div>
          ))}
        </fieldset>
        <button type="submit">Copy Prompt</button>
      </form>
      {fallbackPrompt && (
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
            value={fallbackPrompt}
            rows={16}
            aria-describedby="job-finder-next-steps job-finder-copy-status"
          />
        </div>
      )}
      <p id="job-finder-copy-status" className="status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
