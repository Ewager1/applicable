import { useRef, useState } from 'react';
import { GettingStarted } from './GettingStarted.tsx';
import { ChatbotInstructions } from './ChatbotInstructions.tsx';
import { ResumeForm } from './ResumeForm.tsx';
import { Status } from './Feedback.tsx';
import { PdfResult } from './PdfResult.tsx';
import { useContactFields } from './useContactFields.ts';
import { useResumePdf } from './useResumePdf.ts';

type View = 'builder' | 'getting-started';
const views = [
  { id: 'builder', label: 'PDF Builder' },
  { id: 'getting-started', label: 'Getting Started' },
] as const;

export function App() {
  const [view, setView] = useState<View>('builder');
  const tabs = useRef<Partial<Record<View, HTMLButtonElement | null>>>({});
  function selectView(next: View) {
    setView(next);
    tabs.current[next]?.focus();
  }
  const contact = useContactFields();
  const [source, setSource] = useState('');
  const [company, setCompany] = useState('');
  const { state, status, invalidate, generate } = useResumePdf();
  return (
    <main>
      <header className="masthead">
        <a className="brand" href="./" aria-label="Applicable home">
          Applicable<span aria-hidden="true">.</span>
        </a>
        <span className="privacy">No resume uploads</span>
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
      </header>
      <div
        id="builder-panel"
        role="tabpanel"
        aria-labelledby="builder-tab"
        hidden={view !== 'builder'}
        tabIndex={0}
      >
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">READY FOR YOUR NEXT OPPORTUNITY</p>
          <h1 id="page-title">Turn chatbot text into a polished resume.</h1>
          <p>
            Use ChatGPT or another chatbot to format your current resume with our instructions.
            Paste the formatted resume here to create your PDF.
          </p>
        </section>
        <aside className="workflow-intro" aria-label="Job-search workflow">
          <p>
            New here? Getting Started walks through the full job-search workflow, from finding
            positions to applying.
          </p>
          <button className="secondary" type="button" onClick={() => selectView('getting-started')}>
            Explore Getting Started
          </button>
        </aside>
        <ChatbotInstructions />
        <ResumeForm
          visible={view === 'builder'}
          contact={contact.fields}
          contactWarning={contact.warning}
          onContactChange={(fields) => {
            invalidate('Contact details updated. Create a PDF when you’re ready.');
            contact.update(fields);
          }}
          source={source}
          company={company}
          state={state}
          onSourceChange={(value) => {
            invalidate('Resume updated. Create a PDF when you’re ready.');
            setSource(value);
          }}
          onCompanyChange={(value) => {
            invalidate('Company updated. Create a PDF when you’re ready.');
            setCompany(value);
          }}
          onSubmit={() => void generate(source, company, contact.fields)}
        />
        <Status message={status} />
        <PdfResult artifact={state.phase === 'ready' ? state.artifact : undefined} />
      </div>
      <div
        id="getting-started-panel"
        role="tabpanel"
        aria-labelledby="getting-started-tab"
        hidden={view !== 'getting-started'}
        tabIndex={0}
      >
        <GettingStarted />
      </div>
      <footer>
        Contact details are saved only in this browser for future visits. Resume text and company
        stay on this page and are not saved or uploaded.
      </footer>
    </main>
  );
}
