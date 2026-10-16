# Applicable resume text format

The optional **Company you’re applying to** field is entered separately in the app. It affects only the download filename, is never required, and must not be added as a resume marker or field.

Applicable accepts a complete resume in this documented plain-text format. It does not import arbitrary Markdown or guess where jobs begin. A chatbot can produce this text directly; use the chat code block’s Copy button and paste the entire result into the application. The parser, paste interface and shared production PDF integration are implemented. The application can copy the reusable chatbot instruction from its collapsible format help.

See the complete [synthetic example](../examples/resume.txt) and the reusable [chatbot instruction](../examples/chatbot-instruction.md).

## Six required body sections

Include each of these literal section markers exactly once, on its own line, in any order. These symbols survive copying rendered Markdown instead of relying on Markdown heading syntax:

```text
@@PROFESSIONAL_TITLE@@
@@SUMMARY@@
@@RELEVANT_EXPERIENCE@@
@@EDUCATION@@
@@CERTIFICATIONS@@
@@SKILLS@@
```

Marker names and field labels are case-insensitive. Markers allow outer whitespace, but keep the underscores and do not insert spaces inside an `@@...@@` token. Field labels retain their existing outer/internal whitespace tolerance; values keep their original case and punctuation. LF, CRLF, a leading Unicode byte-order mark and blank separator lines are accepted.

Ask your chatbot to return the resume in one fenced `text` code block and use its Copy button to preserve line breaks. Applicable accepts the contents alone or one enclosing triple-backtick block labeled `text`, `plaintext`, or with no language label. Blank lines outside that block are allowed; commentary outside it, nested/extra fences, unsupported languages and unclosed fences block export. Error line numbers always refer to the original pasted source, including any outer fence.

Only standalone controls are structural. Unknown or malformed standalone marker-looking lines and lines starting with `@@` block export. Inline occurrences inside prose, metadata or bullets (for example, `Explained @@PLACEHOLDER@@ tokens`) remain literal text. There is no guesswork from ordinary unmarked headings or name/contact preambles.

### Legacy compatibility

Existing `# Professional Title`, `# Summary`, `# Relevant Experience`, `# Education`, `# Certifications`, `# Skills` section controls still work. The old entry controls are `## Job`, `## Education`, `## Certification`. They retain case/whitespace tolerance and require whitespace after `#`/`##`. You may safely mix recognized old and new controls on separate lines; repeating one section using another spelling still counts as a duplicate. Prefer the symbol format for new resumes. The section `@@EDUCATION@@` and entry `@@EDUCATION_ENTRY@@` are deliberately distinct.

The result always presents contact → professional title → summary → experience → education → certifications → skills. It preserves the input order of jobs, bullets, education entries, certifications, skill categories and skill items. Jobs are never sorted by date or relevance.

Missing or blank sections block export. A marker by itself is empty. All requirements below are structural/nonempty checks, without judging the resume's writing, date formats, phone formats or email correctness. No missing fact is inferred.

## Contact fields and migration

Enter Full Name, Email, LinkedIn, Website and Phone Number in the app, separately from this body text. Only Full Name is mandatory; all other fields may be blank. Display text remains literal. Usable email/web destinations become safe clickable links; phone remains text. Blank details and an empty contact row are omitted. There is no location field.

The five contact fields are saved in localStorage for this browser and origin. Clearing a field saves its empty value; clearing site data removes the saved fields. Resume text and company are never saved. Blocked storage or invalid saved data produces a nonblocking warning; editing and PDF creation remain available.

An old `@@CONTACT@@` or `# Contact` section blocks export with migration guidance: move its details into the fields and remove the section. The entire pasted source remains available. There is no automatic import, fallback or silent discard.

## Professional title and summary

Professional Title contains exactly one nonempty plain-text line. Summary contains one or more plain-text paragraphs. Wrapped lines within a paragraph join with one space; blank lines preserve a paragraph break. Outer whitespace is structural. Internal spaces, wording, punctuation, capitalization, accents and repeated phrases remain unchanged. Additional Markdown headings and code fences are not accepted inside these blocks.

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

## Education and certifications

Use an explicit marker for every entry. Every displayed field below is required and nonempty, once per entry. Fields may appear in any order and values are single-line text. Their date values are preserved as supplied; the parser does not interpret them.

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

Errors use human-language messages, such as “Education is missing. Add @@EDUCATION@@.” Each error includes the original 1-based line number where a location exists, or `null` for an absent section. The interface displays these messages while leaving the user's input intact and does not export when the parser returns failure. Unmarked preambles and missing entry markers produce concise guidance rather than one repeated warning per line.

## Parser interface and data shape

`parseResume(source)` in `src/resume/parse.ts` is pure and uses no browser API, storage, dependencies or network requests. It returns either:

```js
{ ok: true, resume: { title, summary, jobs, education, certifications, skills } }
{ ok: false, errors: [{ message, line }] }
```

The successful `resume` is a `ResumeBody` with this shape. `assembleResume(body, fields)` combines it with current contact fields into the canonical `Resume` for PDF rendering:

```js
{
  title: 'Full-Stack Software Engineer',
  summary: 'Summary paragraphs.',
  jobs: [{ employer: 'Example Studio', role: 'Software Engineer', dates: '2023 - Present', location: 'Remote', bullets: ['Built accessible interfaces.'] }],
  education: [{ qualification: 'Example qualification', institution: 'Example State University', dates: '2020' }],
  certifications: [{ title: 'Example Certificate', issuer: 'Example Institute', dates: '2024' }],
  skills: [{ category: 'Languages', items: 'JavaScript, TypeScript' }]
}
```

Skill items remain a validated string to preserve original separators/spacing and to fit the flowing reference layout. The shared production template now consumes this complete model, including structured certification fields. See [PDF template behavior and verification](pdf-template.md). No UI or PDF generation is performed by the parser, and failures deliberately expose no partial `resume`.
