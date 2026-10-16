# Applicable: Project Specification

This document records the application contract. Use [GitHub issues](https://github.com/Ewager1/applicable/issues) and [the project board](https://github.com/users/Ewager1/projects/6) for current delivery status, and [the maintenance guide](maintenance.md) for edit points and verification. Distribution is public source under MIT; release/deployment remains separately authorized. The approved migration sequence is recorded in the development plan.

## Purpose

Provide three independent tools: Job Finder and Resume Writer assemble setup prompts for separate ChatGPT conversations; Resume PDF Maker converts structured resume text into a consistently formatted PDF. Users review results and submit applications themselves. Applicable makes no AI calls.

## Confirmed requirements

### Input and interaction

- Open in Resume PDF Maker on every page load. The three primary tabs, in order, are Job Finder, Resume Writer and Resume PDF Maker. Local navigation supports pointer, touch, Left/Right wraparound, Home and End at mobile widths. Keep all panels mounted and hide inactive panels.
- The compact header groups the left-aligned Applicable wordmark with a secondary “Find better jobs. Apply faster.” tagline. Each active tool provides the single visible primary content heading. One workspace connects the three tabs to their tool panels; guidance appears within each tool.
- Job Finder offers an immediate Copy Prompt action before its optional questions. Three initial questions cover roles, location and must-haves; four more stay mounted under native, initially collapsed “Additional preferences” details. The two search-preference checkboxes remain outside that disclosure. All seven multiline answers personalize the same locally assembled prompt. No preview or separate generation action is shown. It distinguishes non-negotiable must-haves from flexible preferences, omits blank answers and preserves supplied multiline wording after trimming outer whitespace. Successful copying confirms the next steps in ChatGPT; only clipboard failure reveals a selectable, focused manual-copy fallback. Two native checkbox search preferences follow the questions: Search U.S. jobs only and Prefer recently posted positions, both checked by default. Their explicit values control employment eligibility and freshness ranking in the generated prompt; freshness never excludes older active matches. The six-stage policy covers broad discovery, responsibility-based fit, role-specific deduplication, confidence-based verification, judgment-based ranking and useful results, with targeted qualification questions and ongoing feedback. Official employer listings are a positive signal rather than mandatory. Editing answers or settings clears fallback output and copy feedback, and pending clipboard feedback is discarded after edits or newer copy requests. Answers, settings and fallback output use component state only and are never saved. The prompt guides resume onboarding, flexible live searches, verification and feedback in a separate ChatGPT conversation; Applicable has no ChatGPT integration, search or automatic application functionality.
- Resume Writer provides twelve optional background questions: six main fields and six under native, initially collapsed “Tell us a little more” details. Every field accepts blank, unknown and long multiline answers. Copy Setup Prompt assembles a deterministic prompt locally from supplied answers and the canonical chatbot formatting instructions. It starts resume onboarding in a separate ChatGPT conversation, requests existing resumes without requiring a job description, enforces truthful tailoring and defaults to Standard Resume. Applicable Format is available on request; its embedded formatting rules apply only to that mode. Success shows next steps without previewing the prompt; clipboard failure reveals a focused, selected manual-copy fallback. Editing answers clears output/feedback and invalidates pending clipboard responses; newer requests also supersede pending feedback. Answers and output live only in component state and reset on reload. No contact questionnaire, upload, API or persistence is added. The formatting shortcut opens and focuses PDF Maker’s chatbot instructions, which are otherwise collapsed by default under “Need help formatting your resume?”. Resume PDF Maker uses one pasted structured input for contact, optional target company and body content, with validation, PDF delivery and preview.
- Switching tools preserves pasted resume text, validation, pending generation, existing PDF output and Job Finder answers/settings/copy state. The selected view is local state only, with no router or persistence.

- Provide one labeled, expanding plain-text input.
- Place the submit button above the input.
- Accept the complete resume through copy and paste. File import is outside the initial scope.
- Submit valid input to generate a downloadable PDF.
- Optional @@TARGET_COMPANY@@ metadata affects only the download filename: professional title plus optional company, followed by “Resume.pdf”. It stays outside the PDF model; all pasted-text edits invalidate previous or pending output.
- Keep the pasted text available after errors so the user can correct it.
- Do not require individual job, bullet, or skill editors.
- Every submission supplies the entire resume; no saved profile or resume history is required.

### Ordering and content

Render groups in this fixed order, even when input sections arrive in another order:

1. Contact information
2. Professional title
3. Summary
4. Relevant Experience
5. Volunteer Experience
6. Projects
7. Education
8. Certifications
9. Skills

Contact information, professional title, and summary are content blocks, not additional visible uppercase headings. The remaining groups use the visible headings shown above.

- Preserve job order within Relevant Experience exactly as supplied. Do not sort by date, employer, or inferred relevance.
- Preserve bullet order, skill category order, and skill item order.
- Preserve wording, punctuation, capitalization, and repeated skills. Do not rewrite, deduplicate, or infer missing facts.
- Normalize structural whitespace and bullet markers only as needed for layout.
- Recognize section boundaries and explicit labels rather than searching for keywords anywhere in prose.
- Never silently drop content that cannot be parsed.

### Input contract

Use the canonical [resume text format](input-format.md), with a complete [synthetic example](../examples/resume.txt) and [reusable chatbot instruction](../examples/chatbot-instruction.md). The pure parser implements this format without guessing at arbitrary free-form resumes.

The preferred contract uses eight individually optional body standalone `@@...@@` section markers, repeated `@@JOB@@`, `@@VOLUNTEER@@`, `@@PROJECT@@`, `@@EDUCATION_ENTRY@@` and `@@CERTIFICATION@@` boundaries, labeled metadata, and `Category: comma-separated skills` rows. Legacy `#`/`##` controls remain compatible, including safe mixed formats. A single optional outer plain-text code fence is accepted without changing source line numbers; unknown/nested fences and exterior content block export. Unmarked headings are not inferred. Section blocks may arrive in a different order. Jobs retain source order. Certification title, issuer and dates remain separate fields for the production template.

Required labels, minimum entry values, whitespace normalization, indented bullet continuations, duplicate handling and human-language errors are documented in the input contract. Skills use exactly one colon per row; unsupported delimiters and malformed content cause blocking errors rather than silent guessing. No partial resume is exposed on failure.

### Validation

- Use programmatic checks without AI or external requests.
- Reject empty input and missing or whitespace-only required values, including Name in Contact metadata and values in included body sections.
- The eight body groups are individually optional: professional title, summary, Relevant Experience, Volunteer Experience, Projects, Education, Certifications, and Skills. Contact metadata with Name is required in pasted text; Email, LinkedIn, Website and Phone may be omitted or blank. Older body-only input receives guidance to add Contact and Name. Require at least one valid nonempty body section. Included blank or malformed sections block export; omitted sections have no PDF heading, divider or spacing.
- A heading by itself does not count as content.
- Show clear human-language warnings naming what is missing, such as "Add content under Education." Keep the source text available for correction; do not expose parser jargon or raw exceptions as validation feedback.
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
- Never persist pasted resume text, contact metadata or target company. At startup, attempt to remove only applicable.contact.v1 without reading or reusing saved values. Unavailable cleanup is nonblocking and unrelated storage stays untouched.
- Document setup requirements, startup, shutdown, and PDF download behavior once verified.
- A packaged native desktop application is outside the initial scope unless requested later.

## Architecture and ownership

Keep parsing, validation, PDF rendering and interface handling separate enough to test without introducing a general template engine. The [maintenance edit map](maintenance.md#find-the-right-edit-point) identifies contributor entry points; the [development plan](project-plan.md) records the approved migration sequence/history.

The rendering investigation selected pinned pdfmake with local fonts, native download and same-bytes preview. Vite supplies the development server and static build; Node serves/builds the local app, while resume processing runs in the browser. The parser, contracts and PDF core use strict TypeScript independent of React. The interface uses small React/TypeScript function components and local state under StrictMode; header tabs keep both panels mounted and hide the inactive view to preserve builder and generation lifetimes; developer scripts and proof fixtures remain JavaScript.

`src/resume/types.ts` owns the canonical model and parse/error contracts; `parse.ts` supplies runtime validation. The optional company belongs only to interface/filename state. `src/pdf/pdfmake-adapter.ts` validates pinned engine internals; `src/ui/useResumePdf.ts` owns generation revisions and Blob URL lifetime. Preserve the [data-flow invariants and recovery limits](maintenance.md#data-flow-and-invariants) when changing these boundaries. Agent-usage scripts measure development activity only and are outside the application bundle.

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

### Additional background sections

Volunteer Experience uses Organization plus responsibility/accomplishment bullets, with optional Role, Dates and Location. Projects use Name, optional Dates/Link and a description and/or bullets; they do not require employment metadata. Both are optional, retain supplied entry order, and use existing styles and header/content pagination safeguards. See the input format for exact markers, validation and continuation rules.

Possible future enhancements include Awards and Honors, Professional Affiliations, Publications, Languages, additional licensing or professional training categories, user-configurable section order and multiple PDF templates. None is implemented by these two additions.
