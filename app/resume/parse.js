const sections = new Map([
  ['contact', 'Contact'], ['professional title', 'Professional Title'],
  ['summary', 'Summary'], ['relevant experience', 'Relevant Experience'],
  ['education', 'Education'], ['certifications', 'Certifications'], ['skills', 'Skills'],
]);
const label = text => text.trim().replace(/\s+/g, ' ').toLowerCase();
const bullet = /^(?:-|\*|•)(?:[ \t]+(.*)|$)/;
const reserved = /^(?:#{1,6}(?:\s|$)|```|~~~)/;

/**
 * Parse the documented Applicable text format without rewriting supplied content.
 * Returns either { ok: true, resume } or { ok: false, errors: [{ message, line }] }.
 * Errors never include a partially usable resume. The caller retains its source text.
 */
export function parseResume(source) {
  if (typeof source !== 'string' || !source.trim()) {
    return { ok: false, errors: [{ message: 'Paste a complete resume before creating a PDF.', line: null }] };
  }
  const errors = [];
  const report = (message, line = null) => errors.push({ message, line });
  const blocks = new Map();
  let current;
  source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n').forEach((text, index) => {
    const line = index + 1;
    const heading = text.trim().match(/^#(?:\s+(.*)|$)/);
    if (heading) {
      const key = label(heading[1] ?? '');
      current = { lines: [], line, title: sections.get(key) };
      if (!sections.has(key)) report('Unknown section. Use one of the seven section headings in the resume format.', line);
      else if (blocks.has(key)) report(`${current.title} appears more than once. Combine its content under one heading.`, line);
      else blocks.set(key, current);
    } else if (current) current.lines.push({ text, line });
    else if (text.trim()) report('Put this content under a section heading, starting with # Contact or another required section.', line);
  });

  const content = key => {
    const block = blocks.get(key);
    if (!block) { report(`${sections.get(key)} is missing. Add # ${sections.get(key)}.`); return []; }
    const lines = block.lines.filter(item => item.text.trim());
    if (!lines.length) report(`Add content under ${block.title}.`, block.line);
    return lines;
  };
  const contactLines = content('contact');
  const titleLines = content('professional title');
  const summaryLines = content('summary');
  const jobLines = content('relevant experience');
  const educationLines = content('education');
  const certificationLines = content('certifications');
  const skillLines = content('skills');

  const field = item => {
    const match = item.text.trim().match(/^([^:]+):[ \t]*(.*)$/);
    return match ? { key: label(match[1]), value: match[2].trim() } : null;
  };
  const required = (values, fields, context, line) => {
    for (const key of fields) if (!values[key]?.trim()) report(`Add ${key} for ${context}.`, line);
  };
  const readFields = (lines, allowed, context, startLine) => {
    const values = {};
    for (const item of lines) {
      const value = field(item);
      if (!value || !allowed.includes(value.key)) { report(`Unrecognized content in ${context}. Use the field labels in the resume format.`, item.line); continue; }
      if (Object.hasOwn(values, value.key)) report(`${value.key} appears more than once in ${context}. Keep one value.`, item.line);
      else values[value.key] = value.value;
    }
    required(values, allowed, context, startLine);
    return values;
  };
  const entries = (lines, marker, context) => {
    const result = [];
    let entry;
    for (const item of lines) {
      if (label(item.text) === `## ${marker}`) {
        entry = { line: item.line, lines: [] };
        result.push(entry);
      } else if (!entry) report(`Start each ${context} with ## ${marker[0].toUpperCase() + marker.slice(1)}.`, item.line);
      else entry.lines.push(item);
    }
    return result;
  };

  let name = '';
  let sawName = false;
  const contact = [];
  for (const item of contactLines) {
    const value = field(item);
    if (value?.key === 'name') {
      if (sawName) report('Name appears more than once. Keep one Name field.', item.line);
      else { name = value.value; sawName = true; }
    } else if (value?.key === 'contact') {
      if (!value.value) { report('Add a value after Contact:.', item.line); continue; }
      if (value.value.startsWith('[')) {
        const link = value.value.match(/^\[([^[\]]+)\]\((\S+)\)$/);
        if (!link || !link[1].trim() || !/^(?:https?:\/\/|mailto:)\S+$/i.test(link[2])) {
          report('Use a complete contact link: [display text](https://address) or [display text](mailto:address).', item.line);
        } else contact.push({ text: link[1], link: link[2] });
      } else contact.push({ text: value.value });
    } else report('Use Name: or Contact: for contact information.', item.line);
  }
  if (contactLines.length && !name.trim()) report('Add your name after Name: in Contact.', blocks.get('contact').line);
  if (contactLines.length && !contact.length) report('Add at least one contact detail after Contact:.', blocks.get('contact').line);

  let title = '';
  if (titleLines.length) {
    if (titleLines.length !== 1 || reserved.test(titleLines[0].text.trim())) report('Use one plain-text line under Professional Title.', titleLines[0].line);
    else title = titleLines[0].text.trim();
  }
  for (const item of summaryLines) if (reserved.test(item.text.trim())) report('Use plain-text paragraphs under Summary; additional headings or code fences are not supported.', item.line);
  // Join wrapped prose while retaining intentional paragraph breaks from blank lines.
  const summary = (blocks.get('summary')?.lines ?? []).map(item => item.text.trim()).join('\n').trim().split(/\n\s*\n/).map(paragraph => paragraph.split('\n').join(' ')).join('\n\n');

  const jobs = entries(jobLines, 'job', 'job').map(entry => {
    const metadata = [];
    const bullets = [];
    for (const item of entry.lines) {
      const text = item.text.trim();
      const match = text.match(bullet);
      if (match) {
        bullets.push(match[1]?.trim() ?? '');
        if (!bullets.at(-1)) report('Add text after the job bullet marker.', item.line);
      } else if (/^(?: {2,}|\t+)\S/.test(item.text)) {
        if (!bullets.length) report('Put continued bullet text after a job bullet.', item.line);
        else bullets[bullets.length - 1] += ` ${text}`;
      } else if (bullets.length) report('Indent continued bullet text by at least two spaces, or start a new bullet. Put job fields above the bullets.', item.line);
      else metadata.push(item);
    }
    const values = readFields(metadata, ['employer', 'role', 'dates', 'location'], 'this job', entry.line);
    if (!bullets.some(text => text.trim())) report('Add at least one bullet for this job.', entry.line);
    return { employer: values.employer, role: values.role, dates: values.dates, location: values.location, bullets };
  });
  const education = entries(educationLines, 'education', 'education entry').map(entry => {
    const values = readFields(entry.lines, ['institution', 'qualification', 'dates'], 'this education entry', entry.line);
    return { institution: values.institution, qualification: values.qualification, dates: values.dates };
  });
  const certifications = entries(certificationLines, 'certification', 'certification entry').map(entry => {
    const values = readFields(entry.lines, ['title', 'issuer', 'dates'], 'this certification', entry.line);
    return { title: values.title, issuer: values.issuer, dates: values.dates };
  });
  const skills = [];
  for (const item of skillLines) {
    const parts = item.text.trim().split(':');
    if (parts.length !== 2) { report('Use one colon between a skill category and its comma-separated skills; colons inside names are not supported.', item.line); continue; }
    const [category, items] = parts.map(part => part.trim());
    if (!category || !items || items.split(',').some(skill => !skill.trim())) {
      report('Add a skill category and at least one skill, with no empty items between commas.', item.line);
    } else if (reserved.test(category)) report('Use Category: skill, skill under Skills, without extra headings.', item.line);
    else skills.push({ category, items });
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, resume: { name, contact, title, summary, jobs, education, certifications, skills } };
}
