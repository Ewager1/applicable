import { useLayoutEffect, useRef, useState } from 'react';
import { HowItWorks } from './HowItWorks.tsx';
import { JobFinderSetup } from './JobFinderSetup.tsx';
import { ResumeWriter } from './ResumeWriter.tsx';
import { ChatbotInstructions } from './ChatbotInstructions.tsx';
import { ResumeForm } from './ResumeForm.tsx';
import { Status } from './Feedback.tsx';
import { PdfResult } from './PdfResult.tsx';
import { useResumePdf } from './useResumePdf.ts';

type View = 'job-finder' | 'resume-writer' | 'builder';
const views = [
  { id: 'job-finder', label: 'Job Finder' },
  { id: 'resume-writer', label: 'Resume Writer' },
  { id: 'builder', label: 'Resume PDF Maker' },
] as const;

export function App() {
  const [view, setView] = useState<View>('builder');
  const builderPanel = useRef<HTMLDivElement>(null);
  const formatHelpRequested = useRef(false);
  useLayoutEffect(() => {
    if (view !== 'builder' || !formatHelpRequested.current) return;
    formatHelpRequested.current = false;
    const help = builderPanel.current?.querySelector<HTMLDetailsElement>('.format-help');
    if (help) {
      help.open = true;
      help.querySelector('summary')?.focus();
    }
  }, [view]);
  const tabs = useRef<Partial<Record<View, HTMLButtonElement | null>>>({});
  function selectView(next: View) {
    setView(next);
    tabs.current[next]?.focus();
  }
  const [source, setSource] = useState('');
  const { state, status, invalidate, generate } = useResumePdf();
  return (
    <main>
      <header className="masthead">
        <a className="brand" href="./" aria-label="Applicable home">
          Applicable<span aria-hidden="true">.</span>
        </a>
        <span className="privacy">No resume uploads</span>
        <a className="how-it-works-link" href="#how-it-works">
          How it works
        </a>
      </header>
      <section className="homepage-intro" aria-labelledby="home-title">
        <h1 id="home-title">Job searching takes enough time already.</h1>
        <p>
          I built Applicable to help you find better opportunities, tailor your resume, and create
          professional PDFs.
        </p>
        <p>
          <strong>Use one tool or all three. You stay in control of your applications.</strong>
        </p>
        <details>
          <summary>Why I built Applicable</summary>
          <p>
            After spending months looking for work, I kept running into the same problems. Finding
            legitimate jobs that actually matched my experience took time. Tailoring my resume for
            each opportunity took even more time. Then I still had to format everything before I
            could apply. I built Applicable to make that process easier.
          </p>
        </details>
      </section>
      <div className="view-tabs" role="tablist" aria-label="Applicable views">
        {views.map(({ id, label }, index) => (
          <button
            key={id}
            ref={(element) => {
              tabs.current[id] = element;
            }}
            id={`${id}-tab`}
            type="button"
            role="tab"
            aria-selected={view === id}
            aria-controls={`${id}-panel`}
            tabIndex={view === id ? 0 : -1}
            onClick={() => setView(id)}
            onKeyDown={(event) => {
              let next;
              if (event.key === 'ArrowRight') next = views[(index + 1) % views.length];
              if (event.key === 'ArrowLeft')
                next = views[(index + views.length - 1) % views.length];
              if (event.key === 'Home') next = views[0];
              if (event.key === 'End') next = views[views.length - 1];
              if (next) {
                event.preventDefault();
                selectView(next.id);
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        ref={builderPanel}
        id="builder-panel"
        role="tabpanel"
        aria-labelledby="builder-tab"
        hidden={view !== 'builder'}
        tabIndex={0}
      >
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">READY FOR YOUR NEXT OPPORTUNITY</p>
          <h2 id="page-title">Turn your resume into a polished PDF.</h2>
          <p>
            Paste your prepared resume to create a clean, professionally formatted PDF, ready for
            review and submission. Use the chatbot instructions below to prepare the text first.
          </p>
        </section>
        <ChatbotInstructions />
        <ResumeForm
          visible={view === 'builder'}
          source={source}
          state={state}
          onSourceChange={(value) => {
            invalidate('Resume updated. Create a PDF when you’re ready.');
            setSource(value);
          }}
          onSubmit={() => void generate(source)}
        />
        <Status message={status} />
        <PdfResult artifact={state.phase === 'ready' ? state.artifact : undefined} />
      </div>
      <div
        id="job-finder-panel"
        role="tabpanel"
        aria-labelledby="job-finder-tab"
        hidden={view !== 'job-finder'}
        tabIndex={0}
      >
        <section className="intro" aria-labelledby="job-finder-title">
          <p className="eyebrow">JOB FINDER</p>
          <h2 id="job-finder-title">Find jobs that fit you.</h2>
          <p>
            Tell us what kinds of jobs you’re looking for. Create a personalized ChatGPT
            conversation to search for opportunities matching your experience and preferences.
          </p>
        </section>
        <ol className="tool-steps">
          <li>Answer a few questions about your preferred jobs.</li>
          <li>Copy your personalized ChatGPT prompt.</li>
          <li>Paste it into a new ChatGPT conversation.</li>
          <li>Upload one or more existing resumes to that conversation.</li>
          <li>
            Answer clarification questions and start searching. Verify openings on the employer’s
            website.
          </li>
        </ol>
        <JobFinderSetup />
      </div>
      <div
        id="resume-writer-panel"
        role="tabpanel"
        aria-labelledby="resume-writer-tab"
        hidden={view !== 'resume-writer'}
        tabIndex={0}
      >
        <ResumeWriter
          onFormatHelp={() => {
            formatHelpRequested.current = true;
            selectView('builder');
          }}
        />
      </div>
      <HowItWorks />
      <footer>
        Resume text, contact details and target company stay on this page and are not saved or
        uploaded.
      </footer>
    </main>
  );
}
