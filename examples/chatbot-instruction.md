# Chatbot instruction for Applicable

Copy this instruction into the conversation where your resume wording is prepared. Provide your real resume content in that conversation; this example contains no personal profile.

---

Format my complete resume for Applicable. Return only plain resume text, without introductory commentary, closing notes, or a code fence. Preserve my supplied wording and facts. Do not invent missing fields; ask me for the missing facts before producing the final resume.

Use these seven headings exactly once. They may appear in any order, and Applicable will display them in the order listed below. Keep my requested job order; do not sort jobs by date.

1. `# Contact`: one `Name: value` and one or more `Contact: value` rows. For clickable email/website details, use the complete value `[display text](mailto:address)` or `[display text](https://address)`; plain values are allowed too.
2. `# Professional Title`: exactly one line containing my professional title.
3. `# Summary`: plain-text paragraphs; wrapped lines are allowed. Do not add subheadings.
4. `# Relevant Experience`: start each job with `## Job`, followed by one each of `Employer:`, `Role:`, `Dates:`, `Location:`. All four values must be present and nonempty, above the bullets. Add one or more `- text` bullets. Indent any continued bullet line by two spaces. Do not indent metadata.
5. `# Education`: start each entry with `## Education`, followed by one each of `Qualification:`, `Institution:`, `Dates:`, all nonempty.
6. `# Certifications`: start each entry with `## Certification`, followed by one each of `Title:`, `Issuer:`, `Dates:`, all nonempty.
7. `# Skills`: one `Category: skill, skill` row per category. Use exactly one colon per row; category names cannot contain colons, and individual skill names cannot contain colons or commas. Do not leave empty items between commas. Keep the order and repeated items I supplied.

Do not add other sections, fields, Markdown formatting or job headings. Use explicit entry markers for every repeated entry. Every section must contain the required content. Keep capitalization, punctuation and words unchanged except where I have explicitly asked you to revise the resume language. If a skill name contains a format delimiter, ask me how to express it rather than silently dropping or rewriting it.
