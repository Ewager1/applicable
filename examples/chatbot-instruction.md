# Chatbot instruction for Applicable

Copy this complete instruction into the conversation where your resume wording is prepared. Supply your resume facts there. No saved Applicable profile or separate document is needed to understand this format.

---

Format my complete resume for Applicable using only the facts and wording I supply. Do not invent missing facts; ask me for any required missing details before producing the final resume. Preserve my requested job, bullet, education, certification and skill order. Do not sort jobs by date.

Return the finished resume inside **one fenced `text` code block**, so I can use the chat interface's **Copy** button. Do not add commentary before or after that block. Keep the literal `@@...@@` markers below, each on its own line. Do not turn them into Markdown headings, bold labels or ordinary unmarked titles. The markers do not appear in the PDF.

Include `@@CONTACT@@` once with `Name: my full name` on the next line. Name is required; ask me if it is missing. Optional single-line labels are `Email:`, `Phone:`, `LinkedIn:` and `Website:` (personal site or portfolio). Use each label at most once. Omit optional details I do not supply; blank optional labels are accepted. Never invent contact information. Applicable displays Email, LinkedIn, Website and Phone in that order.

If I supply a target company, include `@@TARGET_COMPANY@@` once followed by exactly one nonempty plain-text line with its name, without a field label. Omit that section otherwise. Target company affects only the filename and never appears in the PDF or as an employer. Metadata sections may appear in any order among the body sections. Contact and target company do not count as body content.

 Include only the body sections that apply, at most once each. Include at least one valid nonempty body section. Omit any inapplicable section entirely, including its marker; never invent facts or add placeholders such as "No certifications." Each included section must satisfy its required content below. Sections may arrive in any order; Applicable always displays them in the listed order:

1. `@@PROFESSIONAL_TITLE@@`
   - Exactly one plain-text line containing my professional title.
2. `@@SUMMARY@@`
   - Plain-text paragraphs. Wrapped lines and blank lines between paragraphs are allowed. Do not add subheadings.
3. `@@RELEVANT_EXPERIENCE@@`
   - Start **every** job with `@@JOB@@`.
   - Then include one each of `Employer:`, `Role:`, `Dates:`, `Location:`, all nonempty, above the bullets.
   - Add at least one `- text` bullet per job. Indent continued bullet lines by two spaces. Do not indent metadata.
4. `@@VOLUNTEER_EXPERIENCE@@`
   - Start **every** entry with `@@VOLUNTEER@@`.
   - Include `Organization:` and at least one nonempty bullet. Optional single-line fields: `Role:`, `Dates:`, `Location:`.
   - Omit inapplicable details or leave optional fields blank. Never invent employment fields for volunteer work. Use the same bullet/continuation rules as jobs.
5. `@@PROJECTS@@`
   - Start **every** entry with `@@PROJECT@@` and include `Name:`.
   - Include a nonempty `Description:` and/or at least one nonempty bullet. Description may continue on lines indented by two spaces, before the bullets.
   - Optional single-line fields: `Dates:` and `Link:`. Omit inapplicable values or leave them blank.
   - A nonempty Link must be a usable HTTP(S) or dotted bare web address; do not use Markdown link syntax, unsafe schemes, spaces inside URLs or credentials. Keep literal link display text.
   - Do not invent an employer or job title. A project name/link alone is not enough content.
6. `@@EDUCATION@@`
   - Start **every** entry with `@@EDUCATION_ENTRY@@`.
   - Include one each of `Qualification:`, `Institution:`, `Dates:`, all nonempty.
7. `@@CERTIFICATIONS@@`
   - Start **every** entry with `@@CERTIFICATION@@`.
   - Include one each of `Title:`, `Issuer:`, `Dates:`, all nonempty.
8. `@@SKILLS@@`
   - One `Category: skill, skill` row per category, with exactly one colon per row.
   - Category names cannot contain colons. Individual skill names cannot contain colons or commas. Keep repeated items and category/item order. Do not leave empty items between commas.

Use metadata values on single lines; they may contain ordinary prose colons. Use the explicit entry markers even for a single job, volunteer entry, project, education entry or certification. Do not add other sections, fields, Markdown formatting or nested code blocks. Keep wording, capitalization, punctuation and duplicates unchanged unless I explicitly request language revisions. If a supplied skill name conflicts with a delimiter or a fact required for an included entry is missing, ask me rather than silently dropping or rewriting it.
