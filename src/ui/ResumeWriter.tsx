export function ResumeWriter({ onFormatHelp }: { onFormatHelp: () => void }) {
  return (
    <section aria-labelledby="resume-writer-title">
      <div className="intro">
        <p className="eyebrow">RESUME WRITER</p>
        <h2 id="resume-writer-title">A resume for every opportunity.</h2>
        <p>
          Set up a ChatGPT conversation that understands your professional experience and helps
          tailor your resume to individual job descriptions.
        </p>
      </div>
      <p className="tool-guidance">
        The dedicated Resume Writer setup prompt is not available yet. You can start your own
        conversation using this guidance:
      </p>
      <ol className="tool-steps">
        <li>Start a separate ChatGPT conversation and ask for help tailoring your resume.</li>
        <li>Upload one or more previous resumes.</li>
        <li>Answer questions about your skills, experience, and accomplishments.</li>
        <li>
          Provide a job description whenever you want to prepare a tailored resume. Keep the facts
          accurate and review the result.
        </li>
        <li>
          Use the existing chatbot formatting instructions to prepare text for Resume PDF Maker.
        </li>
      </ol>
      <button className="secondary" type="button" onClick={onFormatHelp}>
        Open chatbot formatting instructions
      </button>
      <p className="tool-guidance">
        Reuse and refine this conversation over time. You can use Resume Writer independently of Job
        Finder.
      </p>
    </section>
  );
}
