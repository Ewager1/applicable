import { JobFinderSetup } from './JobFinderSetup.tsx';

export function GettingStarted() {
  return (
    <section aria-labelledby="getting-started-title">
      <div className="intro">
        <p className="eyebrow">YOUR JOB SEARCH, STEP BY STEP</p>
        <h1 id="getting-started-title">Getting Started</h1>
        <p>
          Use ChatGPT to find opportunities and tailor your resume. Use Applicable’s PDF Builder to
          format the finished text, then apply yourself.
        </p>
      </div>
      <ol className="workflow-stages">
        <li>
          <h2>Understand the process</h2>
          <p>
            Start with your experience and the roles you want. Keep two separate ChatGPT
            conversations: one for finding jobs and one for building resumes. Review the suggestions
            and check every detail before using them.
          </p>
        </li>
        <li>
          <h2>Set up a Job Finder conversation in ChatGPT</h2>
          <p>
            Create a reusable setup prompt below, then open ChatGPT yourself to explore relevant
            positions together. Verify each opening on the employer’s website.
          </p>
          <JobFinderSetup />
        </li>
        <li>
          <h2>Set up a Resume Builder conversation in ChatGPT</h2>
          <p>
            Start a separate conversation with your current resume and experience. Use it to tailor
            your resume for individual job descriptions while keeping the facts accurate. The
            chatbot formatting instructions in PDF Builder explain the text format Applicable needs.
          </p>
        </li>
        <li>
          <h2>Find positions, tailor resumes, create PDFs and apply</h2>
          <p>
            Choose a relevant position with your Job Finder conversation. Share the job description
            with your Resume Builder conversation, review the tailored resume, then paste its
            formatted text into PDF Builder. Add your contact details, create and review the PDF,
            and manually submit your application on the employer’s website. Repeat for each
            position.
          </p>
        </li>
      </ol>
    </section>
  );
}
