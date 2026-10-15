# Applicable: Project Specification

Status: Initial draft based on confirmed requirements. PDF technology and distribution details require a small implementation investigation.

## Purpose

Turn an entire resume copied from a chat into a consistently formatted PDF with minimal interaction. Applicable formats supplied content; the chat handles writing and tailoring.

## Confirmed requirements

### Input and interaction

- Provide one labeled, expanding plain-text input.
- Place the submit button above the input.
- Accept the complete resume through copy and paste. File import is outside the initial scope.
- Submit valid input to generate a downloadable PDF.
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

Define and document one simple, deterministic text format during the parser phase. A chat agent must be able to produce the format without special software.

The contract must include explicit boundaries for contact details, professional title, summary, jobs and their metadata, education entries, certification entries, and skills. Skill rows should support `Category: comma-separated skills`. Job bullets should support a conventional text bullet marker. Section blocks may arrive in a different order.

Document required labels, accepted whitespace, multiline bullet handling, duplicate section behavior, and error messages. Avoid ambiguous parsing of colons in prose or skill category names. Do not promise arbitrary free-form resume import.

### Validation

- Use programmatic checks without AI or external requests.
- Reject empty input and missing or whitespace-only required values, including contact name and skills.
- Every fixed group is required: contact information (including name), professional title, summary, Relevant Experience, Education, Certifications, and Skills. Missing or whitespace-only content blocks export.
- A heading by itself does not count as content.
- Show clear human-language warnings naming what is missing, such as "Education is missing" or "Add at least one skill under Skills." Keep the source text available for correction; do not expose parser jargon or raw exceptions as validation feedback.
- Report missing fields and malformed or unrecognized blocks with useful locations where practical.
- Do not generate a partial PDF after a parsing failure.
- Do not introduce scoring, content advice, or speculative resume-quality checks.

### PDF presentation

- Use one fixed template closely matching the supplied reference resumes.
- Match font appearance, font sizes, spacing, margins, indentation, and teal accents as closely as practical.
- Use a single-column layout with the name and contact details at the top, followed by professional title and summary.
- Use consistent section headings; align employment dates and locations on the right as in the references.
- Bold skill categories and render their items as flowing text.
- Use automatic pagination without a page-count limit. Never truncate content to fit a target page count.
- Keep headings with following content and job headers with at least the beginning of their bullets. A job may continue on another page.
- Preserve selectable and searchable text. Do not export the resume as a screenshot.
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

Start with native HTML/CSS and small JavaScript modules. A UI framework is not required by this workflow. Keep parsing, validation, PDF rendering, and interface handling separate enough to test without introducing a general template engine.

Before committing to a PDF library or local runtime, prove that the chosen approach can deliver deterministic typography, pagination, selectable text, local fonts, and a direct downloadable file. Investigate a browser-only solution first; a local generation process remains an option if it materially improves fidelity. Record the tradeoff and installation burden before finalizing that choice. TypeScript and build tooling remain implementation decisions, not product requirements.

## Privacy and examples

Use synthetic resumes in committed samples, tests, screenshots, and documentation. The supplied PDFs are local reference materials, not repository assets. Do not copy personal contact details into the project.

## Delivery workflow

Create project issues from the development plan in sequential order, then complete one issue at a time on a dedicated branch. Codex is authorized to commit, push, open PRs, and self-merge clear, low-risk changes after writing appropriate tests, passing applicable checks on the latest PR commit, and reviewing the diff. Documentation-only work requires content and link review. PDF changes also require visual verification.

Stop early for material ambiguity, significant architecture or scope changes, or unresolved verification concerns. After a successful merge, verify issue closure and project status, safely delete the merged issue branch locally and remotely, and only then start the next issue. `AGENTS.md` defines the detailed gates.

## Definition of done

- A documented sample can be pasted and exported without manual reconstruction.
- Input group ordering is normalized, while job and bullet ordering is preserved.
- Missing content produces clear errors without losing the source text.
- PDF text is complete and selectable, and visual inspection confirms professional spacing and page breaks.
- Short and long resumes export without clipping or overlap.
- Any preview shows the exported artifact accurately.
- Local installation and usage are tested and documented.
- Relevant checks pass and the final changes are reviewed through the authorized workflow.
