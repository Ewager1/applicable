# Applicable: Project Specification

This document records the application contract. Use [GitHub issues](https://github.com/Ewager1/applicable/issues) and [the project board](https://github.com/users/Ewager1/projects/6) for current delivery status, and [the maintenance guide](maintenance.md) for edit points and verification. Distribution is public source under MIT; release/deployment remains separately authorized. The approved migration sequence is recorded in the development plan.

## Purpose

Turn an entire resume copied from a chat into a consistently formatted PDF with minimal interaction. Applicable formats supplied content; the chat handles writing and tailoring.

## Confirmed requirements

### Input and interaction

- Provide one labeled, expanding plain-text input.
- Place the submit button above the input.
- Accept the complete resume through copy and paste. File import is outside the initial scope.
- Submit valid input to generate a downloadable PDF.
- An optional company field affects only the download filename: professional title plus optional company, followed by “Resume.pdf”. It is outside the resume model and input format; company edits invalidate previous or pending output.
- Keep the pasted text available after errors so the user can correct it.
- Do not require individual job, bullet, or skill editors.
- Every submission supplies the entire resume; no saved profile or resume history is required.

### Ordering and content

Render groups in this fixed order, even when input sections arrive in another order:

1. Contact information
2. Professional title
3. Summary
4. Relevant Experience
5. Education
6. Certifications
7. Skills

Contact information, professional title, and summary are content blocks, not additional visible uppercase headings. The remaining groups use the visible headings shown above.

- Preserve job order within Relevant Experience exactly as supplied. Do not sort by date, employer, or inferred relevance.
- Preserve bullet order, skill category order, and skill item order.
- Preserve wording, punctuation, capitalization, and repeated skills. Do not rewrite, deduplicate, or infer missing facts.
- Normalize structural whitespace and bullet markers only as needed for layout.
- Recognize section boundaries and explicit labels rather than searching for keywords anywhere in prose.
- Never silently drop content that cannot be parsed.

### Input contract

Use the canonical [resume text format](input-format.md), with a complete [synthetic example](../examples/resume.txt) and [reusable chatbot instruction](../examples/chatbot-instruction.md). The pure parser implements this format without guessing at arbitrary free-form resumes.

The preferred contract uses seven required standalone `@@...@@` section markers, repeated `@@JOB@@`, `@@EDUCATION_ENTRY@@` and `@@CERTIFICATION@@` boundaries, labeled metadata, and `Category: comma-separated skills` rows. Legacy `#`/`##` controls remain compatible, including safe mixed formats. A single optional outer plain-text code fence is accepted without changing source line numbers; unknown/nested fences and exterior content block export. Unmarked headings are not inferred. Section blocks may arrive in a different order. Jobs retain source order. Certification title, issuer and dates remain separate fields for the production template.

Required labels, minimum entry values, whitespace normalization, indented bullet continuations, duplicate handling and human-language errors are documented in the input contract. Skills use exactly one colon per row; unsupported delimiters and malformed content cause blocking errors rather than silent guessing. No partial resume is exposed on failure.

### Validation

- Use programmatic checks without AI or external requests.
- Reject empty input and missing or whitespace-only required values, including contact name and skills.
- Every fixed group is required: contact information (including name), professional title, summary, Relevant Experience, Education, Certifications, and Skills. Missing or whitespace-only content blocks export.
- A heading by itself does not count as content.
- Show clear human-language warnings naming what is missing, such as "Education is missing" or "Add at least one skill under Skills." Keep the source text available for correction; do not expose parser jargon or raw exceptions as validation feedback.
- Report missing fields and malformed or unrecognized blocks with useful locations where practical.
- Do not generate a partial PDF after a parsing failure.
- Before export, measure required heading/content keep-groups with the same local PDF engine. Groups that cannot fit on a fresh page receive a recoverable warning; retain source, provide no artifact, and do not impose a blanket parser character cap.
- Do not introduce scoring, content advice, or speculative resume-quality checks.

### PDF presentation

- Use one fixed, conservative Applicable PDF template; B2’s visual identity supersedes the initial reference-matching typography while retaining the successful single-column structure.
- Use locally bundled Source Sans 3 Regular 9.75 pt body (measured 1.326 em baselines), Bold 20 pt name and Semibold headings/metadata. All date values share the Semibold 9.5 pt style, independently of institutions/issuers. See [the exact role sizes and colors](pdf-template.md).
- Use primary `#20252B`, secondary `#4B5563`, accent `#1F4E5F` and thin inline `#D8DEE6` section dividers on white. Headings use about 0.07 em tracking and retain following content. The web interface remains outside this PDF refresh.
- Use a single-column layout with the name and contact details at the top, followed by professional title and summary.
- Use consistent section headings; align employment dates and locations on the right as in the references.
- Use Semibold skill categories and render their items as flowing text.
- Use automatic pagination without a page-count limit. Never truncate content to fit a target page count.
- Keep headings with following content and job headers with at least the beginning of their bullets. A job may continue on another page.
- Preserve selectable and searchable text. Do not export the resume as a screenshot. Unsupported displayed glyphs must block generation with a recoverable explanation instead of being silently lost.
- Preserve explicit website and email link destinations.
- Bundle appropriately licensed fonts/assets needed for reliable local output. Do not depend on runtime font downloads.

### Preview

PDF delivery is required. Preview is conditional on a straightforward, reliable implementation.

Prefer displaying the same generated PDF bytes that are offered for download, after submission. A separate HTML approximation must not be represented as an exact preview. Continuous live regeneration while typing is unnecessary. Verify whether the chosen local delivery method supports native PDF viewing; if it does not, document that limitation before adding a separate viewer dependency.

### Local operation and distribution

- People can download the project and run it locally.
- Process resume content on the user's machine without transmitting it to remote services.
- No accounts, database, analytics, cloud deployment, or external AI API.
- No persistence of resume content is required.
- Document setup requirements, startup, shutdown, and PDF download behavior once verified.
- A packaged native desktop application is outside the initial scope unless requested later.

## Architecture direction

Keep parsing, validation, PDF rendering and interface handling separate enough to test without introducing a general template engine. The user approved strict TypeScript for the core followed by a small React/TypeScript interface; follow the sequential migration issues linked in the [development plan](project-plan.md).

The rendering investigation selected pinned pdfmake with local fonts, native download and same-bytes preview. Vite supplies the development server and static build; Node serves/builds the local app, while resume processing runs in the browser. F1 introduces strict TypeScript contracts, parser and PDF core independent of React. The existing JavaScript interface remains until F2; developer scripts and proof fixtures remain JavaScript.

## Privacy and examples

Use synthetic resumes in committed samples, tests, screenshots, and documentation. The supplied PDFs are local reference materials, not repository assets. Do not copy personal contact details into the project.

## Delivery workflow

Follow [AGENTS.md](../AGENTS.md#git-and-github) for engineering/merge gates, [agent workflow](agent-workflow.md) for delegation and [the development plan](project-plan.md) for scope/sequence. GitHub issues and the project board own current status.

## Definition of done

- A documented sample can be pasted and exported without manual reconstruction.
- Input group ordering is normalized, while job and bullet ordering is preserved.
- Missing content produces clear errors without losing the source text.
- PDF text is complete and selectable, and visual inspection confirms professional spacing and page breaks.
- Short and long resumes export without clipping or overlap.
- Any preview shows the exported artifact accurately.
- Local installation and usage are tested and documented.
- Relevant checks pass and the final changes are reviewed through the authorized workflow.
