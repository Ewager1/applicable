import { useState } from 'react';
import { ChatbotInstructions } from './ChatbotInstructions.tsx';
import { ResumeForm } from './ResumeForm.tsx';
import { Status } from './Feedback.tsx';
import { PdfResult } from './PdfResult.tsx';
import { useContactFields } from './useContactFields.ts';
import { useResumePdf } from './useResumePdf.ts';

export function App() {
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
      </header>
      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">READY FOR YOUR NEXT OPPORTUNITY</p>
        <h1 id="page-title">Turn chatbot text into a polished resume.</h1>
        <p>
          Use ChatGPT or another chatbot to format your current resume with our instructions. Paste
          the formatted resume here to create your PDF.
        </p>
      </section>
      <ChatbotInstructions />
      <ResumeForm
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
      <footer>
        Contact details are saved only in this browser for future visits. Resume text and company
        stay on this page and are not saved or uploaded.
      </footer>
    </main>
  );
}
