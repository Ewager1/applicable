# Applicable resume text format

Resume PDF Maker accepts a resume in this documented plain-text format. It does not import arbitrary Markdown or guess where jobs begin. A chatbot can produce this text directly; use the chat code block’s Copy button and paste the entire result into the application. Its collapsible format help provides reusable chatbot instructions independently of Resume Writer.

See the complete [synthetic example](../examples/resume.txt), the [sparse example](../examples/resume-sparse.txt), the [volunteer/project example](../examples/resume-volunteer-projects.txt) and the reusable [chatbot instruction](../examples/chatbot-instruction.md).

## Eight optional body sections

Include at least one body section with valid nonempty content. Omit any section that does not apply, including its marker; never add placeholder content such as "No certifications." Include each chosen literal section marker exactly once, on its own line, in any order. These symbols survive copying rendered Markdown instead of relying on Markdown heading syntax:

```text
@@PROFESSIONAL_TITLE@@
@@SUMMARY@@
@@RELEVANT_EXPERIENCE@@
@@VOLUNTEER_EXPERIENCE@@
@@PROJECTS@@
@@EDUCATION@@
@@CERTIFICATIONS@@
@@SKILLS@@
```

Marker names and field labels are case-insensitive. Markers allow outer whitespace, but keep the underscores and do not insert spaces inside an `@@...@@` token. Field labels retain their existing outer/internal whitespace tolerance; values keep their original case and punctuation. LF, CRLF, a leading Unicode byte-order mark and blank separator lines are accepted.

Ask your chatbot to return the resume in one fenced `text` code block and use its Copy button to preserve line breaks. Applicable accepts the contents alone or one enclosing triple-backtick block labeled `text`, `plaintext`, or with no language label. Blank lines outside that block are allowed; commentary outside it, nested/extra fences, unsupported languages and unclosed fences block export. Error line numbers always refer to the original pasted source, including any outer fence.

Only standalone controls are structural. Unknown or malformed standalone marker-looking lines and lines starting with `@@` block export. Inline occurrences inside prose, metadata or bullets (for example, `Explained @@PLACEHOLDER@@ tokens`) remain literal text. There is no guesswork from ordinary unmarked headings or name/contact preambles.

### Legacy compatibility

Supported `#` controls are `# Professional Title`, `# Summary`, `# Relevant Experience`, `# Volunteer Experience`, `# Projects`, `# Education`, `# Certifications`, `# Skills`. The corresponding entry controls are `## Job`, `## Volunteer`, `## Project`, `## Education`, `## Certification`. They retain case/whitespace tolerance and require whitespace after `#`/`##`. You may safely mix recognized old and new controls on separate lines; repeating one section using another spelling still counts as a duplicate. Prefer the symbol format for new resumes. The section `@@EDUCATION@@` and entry `@@EDUCATION_ENTRY@@` are deliberately distinct.

The result presents included content in contact → professional title → summary → experience → volunteer experience → projects → education → certifications → skills order. Omitted sections produce no heading, divider or space. It preserves the input order of jobs, bullets, education entries, certifications, skill categories and skill items. Jobs are never sorted by date or relevance.

Omitted sections are accepted. Included blank or malformed sections block export, even when another section is valid. A marker by itself is empty. At least one valid nonempty body section is required. All requirements below are structural/nonempty checks, without judging the resume's writing, date formats, phone formats or email correctness. No missing fact is inferred.

## Contact and target-company metadata

Include one `@@CONTACT@@` section with a nonempty `Name:`. Optional labels are `Email:`, `Phone:`, `LinkedIn:` and `Website:` (a personal site or portfolio). Each label may appear at most once; optional labels may be omitted or blank. Blank optional values produce no contact text, links or spacing. Unknown labels and unlabeled lines block export. All values occupy one line; outer whitespace is structural and internal wording remains literal.

```text
@@CONTACT@@
Name: Alex Morgan
Email: alex@example.com
Phone: 555-010-0142
LinkedIn: linkedin.com/in/example-alex
Website: example.com/alex

@@TARGET_COMPANY@@
Example Corporation
```

Name is required; no email, phone or website is forced. The PDF header displays optional contact details in Email → LinkedIn → Website → Phone order regardless of input field order. Usable email/web destinations become safe clickable links; unsupported destinations remain literal display text. Phone remains text. There is no location field.

`@@TARGET_COMPANY@@` is optional. When included, supply exactly one nonempty plain-text line without a field label. It affects only the download filename; it never appears in the PDF, becomes an employer, or counts as a body section. Omit its marker when no target company applies. With no professional title, filenames fall back to `Resume.pdf` or `Untitled at Example Corporation Resume.pdf` when a company is supplied.

Contact, target company and body sections may appear in any order. Marker names and field labels are case-insensitive; legacy `# Contact` and `# Target Company` section controls also work. Duplicate metadata sections, duplicate fields, included empty target company, extra lines and malformed markers block export with original source line numbers.

Older body-only input must add `@@CONTACT@@` and `Name:`. The app never invents or retrieves a name. All information comes from the current paste; there are no separate contact/company inputs or saved profiles. Contact metadata alone, even with target company, cannot replace the required valid nonempty body section.

Resume text, contact details and target company are never persisted. At startup, Applicable makes one best-effort removal of its old `applicable.contact.v1` storage key without reading or reusing its values. Other browser storage is untouched; unavailable cleanup does not block editing or export.

## Professional title and summary

When included, Professional Title contains exactly one nonempty plain-text line. When included, Summary contains one or more plain-text paragraphs. Wrapped lines within a paragraph join with one space; blank lines preserve a paragraph break. Outer whitespace is structural. Internal spaces, wording, punctuation, capitalization, accents and repeated phrases remain unchanged. Additional Markdown headings and code fences are not accepted inside these blocks.

```text
@@PROFESSIONAL_TITLE@@
Full-Stack Software Engineer

@@SUMMARY@@
Product-focused engineer building reliable interfaces.
Experienced with tests and integrations.

A second paragraph can follow here.
```

## Experience

Each job begins with the exact entry marker `@@JOB@@` (case-insensitive). Include every labeled value below once, above the bullets. Metadata labels may appear in any order. Their values are single-line text and may contain colons. Do not indent metadata: indentation is reserved for bullet continuation.

```text
@@RELEVANT_EXPERIENCE@@
@@JOB@@
Employer: Example Studio
Role: Software Engineer
Dates: 2023 - Present
Location: Remote
- Built accessible interfaces.
  Collaborated with design partners on keyboard navigation.
- Added focused automated checks.

@@JOB@@
Employer: Example Systems
Role: Application Developer
Dates: 2020 - 2023
Location: Portland, OR
- Maintained API integrations.
```

Each job requires nonempty Employer, Role, Dates and Location, plus at least one nonempty bullet. A bullet starts with `-`, `*` or `•`, followed by a space/tab and text. All three markers normalize to ordinary PDF bullets. A continued bullet line must be indented by at least two spaces or one tab; its outer indentation is removed and its text joins the prior bullet with a space. Blank lines between bullets do not create entries or extra bullets. Unindented continuation text is an error, not a new inferred field or a silently omitted line. An empty bullet is an error even if followed by continuation text. Continued bullet text can contain colons, commas or other prose punctuation.

## Volunteer experience

Use `@@VOLUNTEER_EXPERIENCE@@` and start every entry with `@@VOLUNTEER@@`. `Organization:` and at least one nonempty bullet are required. `Role:`, `Dates:` and `Location:` are optional single-line values; omit them or leave them blank when they do not apply. Do not invent an employer, role, dates or location. Included field labels may appear only once and all metadata belongs above the bullets.

```text
@@VOLUNTEER_EXPERIENCE@@
@@VOLUNTEER@@
Organization: Example Food Pantry
Role: Volunteer Coordinator
Dates: 2022 - Present
Location: Portland, OR
- Organized weekly food distribution.
  Documented procedures for new volunteers.
```

Bullets use the same markers, indentation and preservation rules as jobs. Repeat `@@VOLUNTEER@@` for more entries; supplied entry order is retained. Optional metadata produces no empty row in the PDF.

## Projects

Use `@@PROJECTS@@` and start every entry with `@@PROJECT@@`. `Name:` is required, together with a nonempty `Description:` and/or at least one nonempty bullet. `Dates:` and `Link:` are optional. Optional blank values are omitted. A name or link alone is not meaningful project content. Do not force a project into employment fields or invent an employer/job title.

```text
@@PROJECTS@@
@@PROJECT@@
Name: Community Resource Guide
Dates: 2024
Link: https://example.com/resource-guide
Description: Created a practical guide to local support services.
  Updated details with community partners.
- Improved navigation based on reader feedback.
```

Description begins on its labeled line and may continue on lines indented by two spaces or a tab, before any bullets. Continuations join with one space; blank separator lines do not create paragraphs. Bullets follow the existing experience rules. Each labeled field may appear only once; metadata belongs above the bullets. Repeated entries preserve source order. Unknown labels, empty bullets, unlabeled/unindented description continuations and malformed markers block the entire resume with source lines.

A nonempty Link must be a usable HTTP(S) URL or dotted bare web address. Unsafe schemes, credentials and whitespace inside a URL block export. Literal link text stays visible; its PDF destination uses safe URL serialization, including encoded Unicode paths. Links are not fetched. The project name, optional date/link rows and beginning of the description or first bullet stay together; long descriptions/bullets can continue across pages. Oversized heading groups receive the existing recoverable fit error rather than losing content.

## Education and certifications

Use an explicit marker for every entry. For an included section, every displayed field below is required and nonempty, once per entry. Fields may appear in any order and values are single-line text. Their date values are preserved as supplied; the parser does not interpret them.

```text
@@EDUCATION@@
@@EDUCATION_ENTRY@@
Qualification: Bachelor of Science, Computer Science
Institution: Example State University
Dates: 2016 - 2020

@@CERTIFICATIONS@@
@@CERTIFICATION@@
Title: Example Web Accessibility Certificate
Issuer: Example Learning Institute
Dates: 2024
```

Repeat `@@EDUCATION_ENTRY@@` or `@@CERTIFICATION@@` for additional entries. Their order is preserved. The production template will display education qualification first, then institution/dates; certifications retain title, issuer and dates as distinct values so the reference layout can be reproduced. Missing metadata must be corrected in the source rather than invented by Applicable.

## Skills

Use one category per line:

```text
@@SKILLS@@
Languages: JavaScript, TypeScript, Python
Engineering: Automated testing, Git, API integrations
```

Each row must have **exactly one colon** separating a nonempty category from a nonempty comma-separated list. Colons in category or item names are unsupported; rewrite the supplied input explicitly rather than relying on a guess. Commas are delimiters, so individual skill names cannot contain commas in this initial format. Leading, trailing or consecutive commas produce an empty item and block export. There is no quoting or escape syntax. Category order, repeated categories, repeated skills, capitalization, commas and internal list spacing are preserved. A category heading alone is not a skill.

## Errors and content preservation

Unknown/duplicate sections, unknown field labels, duplicate single-value fields, wrong entry markers, extra content outside sections and malformed lines block the entire result. Repeated skill categories are permitted because their order/content is meaningful; entry metadata fields cannot repeat. Every nonempty line must belong to the documented format. Unrecognized structure blocks the entire result, even when related warnings are condensed. Only the explicitly accepted outer fence is omitted as a wrapper. There is no partial-success mode.

Errors use human-language messages, such as “Add content under Education.” Each error includes the original 1-based line number where a location exists, or `null` when no source location exists. The interface displays these messages while leaving the user's input intact and does not export when the parser returns failure. Unmarked preambles and missing entry markers produce concise guidance rather than one repeated warning per line.

## Parser interface and data shape

`parseResume(source)` in `src/resume/parse.ts` is pure and uses no browser API, storage, dependencies or network requests. It returns either:

```js
{ ok: true, resume: { name, contact, title, summary, jobs, volunteerExperience, projects, education, certifications, skills }, targetCompany }
{ ok: false, errors: [{ message, line }] }
```

The successful `resume` is the complete canonical `Resume`, including name and safe contact details. Omitted title/summary use empty strings; omitted entry sections use empty arrays. `targetCompany` is separate filename metadata and never enters the PDF model:

```js
{
  name: 'Alex Morgan',
  contact: [{ text: 'alex@example.com', link: 'mailto:alex@example.com' }],
  title: 'Full-Stack Software Engineer',
  summary: 'Summary paragraphs.',
  jobs: [{ employer: 'Example Studio', role: 'Software Engineer', dates: '2023 - Present', location: 'Remote', bullets: ['Built accessible interfaces.'] }],
  volunteerExperience: [],
  projects: [],
  education: [{ qualification: 'Example qualification', institution: 'Example State University', dates: '2020' }],
  certifications: [{ title: 'Example Certificate', issuer: 'Example Institute', dates: '2024' }],
  skills: [{ category: 'Languages', items: 'JavaScript, TypeScript' }]
}
```

Skill items remain a validated string to preserve original separators/spacing and to fit the flowing reference layout. The shared production template now consumes this complete model, including structured certification fields. See [PDF template behavior and verification](pdf-template.md). No UI or PDF generation is performed by the parser, and failures deliberately expose no partial `resume`.

## Possible future additions

Awards and Honors, Professional Affiliations, Publications, Languages, additional licensing/training categories, configurable section order and multiple PDF templates are possible future enhancements. They are not accepted sections or controls in this format.
