import { useState } from 'react';
import {
  additionalQuestions,
  emptyResumeWriterAnswers,
  mainQuestions,
  type ResumeWriterAnswers,
} from '../resume-writer/questions.ts';

export function ResumeWriter({ onFormatHelp }: { onFormatHelp: () => void }) {
  const [answers, setAnswers] = useState<ResumeWriterAnswers>(emptyResumeWriterAnswers);

  function renderQuestions(questions: typeof mainQuestions) {
    return questions.map(({ key, label, example }) => (
      <div className="resume-writer-field" key={key}>
        <label htmlFor={`resume-writer-${key}`}>
          {label} <span className="optional">(optional)</span>
        </label>
        <p id={`resume-writer-${key}-example`}>Example: {example}</p>
        <textarea
          id={`resume-writer-${key}`}
          rows={3}
          aria-describedby={`resume-writer-${key}-example`}
          value={answers[key]}
          onChange={(event) => setAnswers({ ...answers, [key]: event.target.value })}
        />
      </div>
    ));
  }

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
      <section className="resume-writer-questionnaire" aria-labelledby="background-title">
        <h3 id="background-title">Help your Resume Writer get to know you</h3>
        <p>
          Your existing resumes will provide most of the information ChatGPT needs. These optional
          questions help it understand the work behind your job titles, including accomplishments,
          responsibilities, and experiences that may not appear on a resume.
        </p>
        <p>
          Your answers can help ChatGPT write stronger professional summaries, tailor your
          experience more accurately, and suggest more personal cover letters or application
          responses.
        </p>
        <p>
          Short answers are fine. You can skip anything you aren’t sure about, and “I don’t know” is
          a perfectly acceptable answer. All 12 questions are optional.
        </p>
        <p>
          You don’t need to remember everything today. Your Resume Writer can ask follow-up
          questions and continue learning about your experience as you use it.
        </p>
        <p>
          Answers stay on this page while you switch tools and reset on reload. The setup prompt is
          coming in the next update; these answers are not sent anywhere or used by the formatting
          instructions below.
        </p>
        {renderQuestions(mainQuestions)}
        <details>
          <summary>Tell us a little more</summary>
          <p>These six extra questions are optional too. Skip any you like.</p>
          {renderQuestions(additionalQuestions)}
        </details>
      </section>
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
