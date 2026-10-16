export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="workflow-overview"
      aria-labelledby="workflow-title"
      tabIndex={-1}
    >
      <h2 id="workflow-title">How it works</h2>
      <p>
        Use each tool separately or combine them: Find Jobs → Tailor Resume → Create PDF → Apply.
      </p>
      <ol className="workflow-steps" role="list">
        <li>
          <span className="workflow-number" aria-hidden="true">
            1
          </span>
          <h3>Find the right jobs</h3>
          <p>
            Use Job Finder to prepare a ChatGPT conversation for finding opportunities that match
            your experience and interests.
          </p>
        </li>
        <li>
          <span className="workflow-number" aria-hidden="true">
            2
          </span>
          <h3>Tailor your resume</h3>
          <p>
            Use Resume Writer’s guidance in a separate ChatGPT conversation to tailor your resume
            for individual positions.
          </p>
        </li>
        <li>
          <span className="workflow-number" aria-hidden="true">
            3
          </span>
          <h3>Create your PDF</h3>
          <p>
            Paste your prepared resume into Resume PDF Maker to create a professionally formatted
            PDF.
          </p>
        </li>
        <li>
          <span className="workflow-number" aria-hidden="true">
            4
          </span>
          <h3>Review and apply</h3>
          <p>
            Review your resume and job listings, visit the employer’s application page, and submit
            it yourself.
          </p>
        </li>
      </ol>
      <p>
        Job Finder and Resume Writer help you set up external ChatGPT conversations. Upload your
        past resumes there, answer clarification questions, and reuse and refine those conversations
        over time. Applicable does not automatically search for jobs or submit applications.
      </p>
    </section>
  );
}
