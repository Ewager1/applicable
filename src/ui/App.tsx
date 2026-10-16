import { useLayoutEffect, useRef, useState } from 'react';
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
      </header>
      <h1 className="tagline">Find better jobs. Apply faster.</h1>
      <div className="workspace">
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
            <h2 id="page-title">Turn your resume into a polished PDF.</h2>
            <p>Paste your resume in Applicable Format to create a PDF.</p>
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
            <h2 id="job-finder-title">Find jobs that fit you.</h2>
            <p>
              Create a personalized ChatGPT job search based on your experience and preferences.
            </p>
          </section>
          <p className="tool-guidance">
            Answer the optional questions below, then copy your prompt into a new ChatGPT
            conversation. Upload your existing resumes there to get started.
          </p>
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
      </div>
      <footer>
        Resume text, contact details and target company stay on this page and are not saved or
        uploaded.
      </footer>
    </main>
  );
}
