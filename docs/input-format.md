# Applicable resume text format

Applicable accepts a complete resume in this documented plain-text format. It does not import arbitrary Markdown or guess where jobs begin. A chatbot can produce this text directly; copy the entire result into the eventual application input. The parser, paste interface and shared production PDF integration are implemented. The application can copy the reusable chatbot instruction from its collapsible format help.

See the complete [synthetic example](../examples/resume.txt) and the reusable [chatbot instruction](../examples/chatbot-instruction.md).

## Seven required sections

Include each of these headings exactly once, in any order:

```text
# Contact
# Professional Title
# Summary
# Relevant Experience
# Education
# Certifications
# Skills
```

Heading/field labels are case-insensitive. Extra spaces within labels, around labels and at line ends are accepted; values retain their original case and punctuation. Both LF and CRLF line endings are accepted, as is an optional leading Unicode byte-order mark. Blank lines separate content for readability. Headings must have a space or tab after `#`; do not wrap the resume in a code fence or include commentary outside its sections.

The result always presents contact → professional title → summary → experience → education → certifications → skills. It preserves the input order of jobs, bullets, education entries, certifications, contact rows, skill categories and skill items. Jobs are never sorted by date or relevance.

Missing or blank sections block export. A heading by itself is empty. All requirements below are structural/nonempty checks, without judging the resume's writing, date formats, phone formats or email correctness. No missing fact is inferred.

## Contact

Use one `Name:` and at least one repeatable `Contact:` row. Other contact labels are not accepted. Use as many contact rows as needed, in the desired order:

```text
# Contact
Name: Alex Morgan
Contact: Portland, OR
Contact: 555-010-0142
Contact: [alex@example.com](mailto:alex@example.com)
Contact: [example.com/alex](https://example.com/alex)
```

A plain contact value is displayed literally. To preserve a clickable destination, use one complete Markdown link as the entire value: `[display text](destination)`. Destinations must start with `http://`, `https://` or `mailto:` and contain no whitespace. Display text cannot contain square brackets. Other Markdown syntax is not interpreted. A value starting with `[` must be a complete valid link; it cannot silently become plain text after a link error. Plain contact values may include colons. The original link destination and display text are retained; no URL shortening or inferred email links occur.

## Professional title and summary

Professional Title contains exactly one nonempty plain-text line. Summary contains one or more plain-text paragraphs. Wrapped lines within a paragraph join with one space; blank lines preserve a paragraph break. Outer whitespace is structural. Internal spaces, wording, punctuation, capitalization, accents and repeated phrases remain unchanged. Additional Markdown headings and code fences are not accepted inside these blocks.

```text
# Professional Title
Full-Stack Software Engineer

# Summary
Product-focused engineer building reliable interfaces.
Experienced with tests and integrations.

A second paragraph can follow here.
```

## Experience

Each job begins with the exact entry marker `## Job` (case-insensitive). Include every labeled value below once, above the bullets. Metadata labels may appear in any order. Their values are single-line text and may contain colons. Do not indent metadata: indentation is reserved for bullet continuation.

```text
# Relevant Experience
## Job
Employer: Example Studio
Role: Software Engineer
Dates: 2023 - Present
Location: Remote
- Built accessible interfaces.
  Collaborated with design partners on keyboard navigation.
- Added focused automated checks.

## Job
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
# Education
## Education
Qualification: Bachelor of Science, Computer Science
Institution: Example State University
Dates: 2016 - 2020

# Certifications
## Certification
Title: Example Web Accessibility Certificate
Issuer: Example Learning Institute
Dates: 2024
```

Repeat `## Education` or `## Certification` for additional entries. Their order is preserved. The production template will display education qualification first, then institution/dates; certifications retain title, issuer and dates as distinct values so the reference layout can be reproduced. Missing metadata must be corrected in the source rather than invented by Applicable.

## Skills

Use one category per line:

```text
# Skills
Languages: JavaScript, TypeScript, Python
Engineering: Automated testing, Git, API integrations
```

Each row must have **exactly one colon** separating a nonempty category from a nonempty comma-separated list. Colons in category or item names are unsupported; rewrite the supplied input explicitly rather than relying on a guess. Commas are delimiters, so individual skill names cannot contain commas in this initial format. Leading, trailing or consecutive commas produce an empty item and block export. There is no quoting or escape syntax. Category order, repeated categories, repeated skills, capitalization, commas and internal list spacing are preserved. A category heading alone is not a skill.

## Errors and content preservation

Unknown/duplicate sections, unknown field labels, duplicate single-value fields, wrong entry markers, extra content outside sections and malformed lines block the entire result. Duplicate contact rows and skill categories are permitted because their order/content is meaningful; the single Name and entry metadata fields cannot repeat. Every nonempty line is either consumed by the documented format or contributes to a blocking error. There is no partial-success mode.

Errors use human-language messages, such as “Education is missing. Add # Education.” or “Add your name after Name: in Contact.” Each error includes the original 1-based line number where a location exists, or `null` for an absent section. The eventual interface must display these messages while leaving the user's input intact, and must not export when the parser returns failure.

## Parser interface and data shape

`parseResume(source)` in `app/resume/parse.js` is pure and uses no browser API, storage, dependencies or network requests. It returns either:

```js
{ ok: true, resume: { name, contact, title, summary, jobs, education, certifications, skills } }
{ ok: false, errors: [{ message, line }] }
```

The successful `resume` has this shape:

```js
{
  name: 'Alex Morgan',
  contact: [{ text: 'Portland, OR' }, { text: 'alex@example.com', link: 'mailto:alex@example.com' }],
  title: 'Full-Stack Software Engineer',
  summary: 'Summary paragraphs.',
  jobs: [{ employer: 'Example Studio', role: 'Software Engineer', dates: '2023 - Present', location: 'Remote', bullets: ['Built accessible interfaces.'] }],
  education: [{ qualification: 'Example qualification', institution: 'Example State University', dates: '2020' }],
  certifications: [{ title: 'Example Certificate', issuer: 'Example Institute', dates: '2024' }],
  skills: [{ category: 'Languages', items: 'JavaScript, TypeScript' }]
}
```

Skill items remain a validated string to preserve original separators/spacing and to fit the flowing reference layout. The shared production template now consumes this complete model, including structured certification fields. See [PDF template behavior and verification](pdf-template.md). No UI or PDF generation is performed by the parser, and failures deliberately expose no partial `resume`.
