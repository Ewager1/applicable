import { JobFinderSetup } from './JobFinderSetup.tsx';

export function GettingStarted() {
  return (
    <section aria-labelledby="getting-started-title">
      <div className="intro getting-started-intro">
        <p className="eyebrow">GETTING STARTED</p>
        <h1 id="getting-started-title">A simpler way to search for jobs</h1>
        <p>
          Looking for a job takes time. Finding positions that match your experience, tailoring your
          resume for each application, and making sure everything looks professional can be a lot of
          work.
        </p>
        <p>
          Applicable helps make that process faster and easier by combining ChatGPT with a simple
          resume PDF builder.
        </p>
      </div>
      <section className="workflow-overview" aria-labelledby="workflow-title">
        <h2 id="workflow-title">Your job search, step by step</h2>
        <ol className="workflow-steps" role="list">
          <li>
            <span className="workflow-number" aria-hidden="true">
              1
            </span>
            <h3>Find the right jobs</h3>
            <p>Use ChatGPT to search for positions that match your experience and interests.</p>
          </li>
          <li>
            <span className="workflow-number" aria-hidden="true">
              2
            </span>
            <h3>Tailor your resume</h3>
            <p>
              Use a separate ChatGPT conversation to create a resume specifically for each position.
            </p>
          </li>
          <li>
            <span className="workflow-number" aria-hidden="true">
              3
            </span>
            <h3>Create your PDF</h3>
            <p>
              Paste your tailored resume into Applicable to generate a clean, professionally
              formatted PDF.
            </p>
          </li>
          <li>
            <span className="workflow-number" aria-hidden="true">
              4
            </span>
            <h3>Review and apply</h3>
            <p>Check your resume, visit the employer’s application page, and submit it yourself.</p>
          </li>
        </ol>
      </section>
      <section className="workflow-setup" aria-labelledby="setup-title">
        <h2 id="setup-title">Let’s get you set up</h2>
        <div className="setup-intro">
          <p>
            You’ll use two separate ChatGPT conversations: a Job Finder to find opportunities and a
            Resume Builder to tailor your resume. No programming or prompt-writing knowledge is
            needed. Applicable provides the setup instructions below.
          </p>
          <p>
            You can upload one or more past resumes into your ChatGPT conversations. ChatGPT can ask
            clarifying questions to learn about your experience. This initial setup is largely a
            one-time process; you can refine your preferences and experience over time.
          </p>
        </div>
        <section className="setup-step" aria-labelledby="job-finder-setup-title">
          <h3 id="job-finder-setup-title">Step 1: Create your Job Finder</h3>
          <p>
            Copy your setup prompt below, then open a new ChatGPT conversation yourself to explore
            relevant positions together. Verify each opening on the employer’s website.
          </p>
          <JobFinderSetup />
        </section>
        <section className="setup-step" aria-labelledby="resume-builder-setup-title">
          <h3 id="resume-builder-setup-title">Step 2: Create your Resume Builder</h3>
          <p>
            Start a separate conversation with your current resume and experience. Use it to tailor
            your resume for individual job descriptions while keeping the facts accurate. The
            chatbot formatting instructions in PDF Builder explain the text format Applicable needs.
          </p>
        </section>
      </section>
    </section>
  );
}
