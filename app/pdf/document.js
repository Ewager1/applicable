import { supportedRanges } from './font-coverage.js';
import { createPagination } from './pagination.js';
const palette = { primary: '#20252B', secondary: '#4B5563', accent: '#1F4E5F', divider: '#D8DEE6' };
const semibold = { font: 'SourceSans3Semibold' };
const pageMargins = [43, 43, 43, 43];
const metadataColumnWidth = 180;
const metadataColumnGap = 12;
const sectionColumnGap = 9;
const sectionMargins = [0, 11, 0, 6];
const dividerTopMargin = 6;
const dividerLineWidth = 0.5;
const entryBottomMargin = 5;
const bulletMargins = [7, 0, 0, 1.5];
const styles = {
  // Source Sans 3's ascent/descent already yield 1.326 × fontSize baselines.
  // pdfmake's lineHeight multiplies that metric, unlike a CSS em line-height.
  body: { font: 'SourceSans3', fontSize: 9.75, lineHeight: 1, color: palette.primary },
  name: { bold: true, fontSize: 20, color: palette.accent },
  contact: { fontSize: 9.5, color: palette.secondary },
  title: { ...semibold, fontSize: 11.5 },
  sectionHeading: { ...semibold, fontSize: 9.75, characterSpacing: 0.68, color: palette.accent },
  entryHeading: { ...semibold, fontSize: 10.75 },
  role: { ...semibold, fontSize: 10.25 },
  date: { ...semibold, fontSize: 9.5 },
  location: { ...semibold, fontSize: 9.5, color: palette.secondary },
  skillsCategory: { ...semibold },
};
const sectionHeading = text => ({
  columns: [
    { text, style: 'sectionHeading', width: 'auto' },
    // A table border uses the remaining column width; no text dashes or fixed
    // measurements that can overlap a wider heading.
    {
      width: '*',
      margin: [0, dividerTopMargin, 0, 0],
      table: { widths: ['*'], heights: 1, body: [['']] },
      layout: {
        hLineWidth: index => index === 0 ? dividerLineWidth : 0,
        hLineColor: () => palette.divider,
        vLineWidth: () => 0,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
    },
  ],
  columnGap: sectionColumnGap,
  margin: sectionMargins,
  headlineLevel: 1,
  unbreakable: true,
});
const entryRow = (left, right, leftStyle, rightStyle) => ({
  columns: [
    { text: left, style: leftStyle, width: '*' },
    { text: right, style: rightStyle, width: metadataColumnWidth, alignment: 'right' },
  ],
  columnGap: metadataColumnGap,
});
/** @param {import('../resume/types.js').Resume} resume */
function verifyCharacters(resume) {
  const text = [resume.name, ...resume.contact.map(item => item.text), resume.title, resume.summary,
    ...resume.jobs.flatMap(job => [job.employer, job.role, job.dates, job.location, ...job.bullets]),
    ...resume.education.flatMap(entry => [entry.qualification, entry.institution, entry.dates]),
    ...resume.certifications.flatMap(entry => [entry.title, entry.issuer, entry.dates]),
    ...resume.skills.flatMap(row => [row.category, row.items])].join('\n');
  const unsupported = [...new Set([...text].filter(character => {
    const code = character.codePointAt(0);
    if (['\n', '\r', '\t'].includes(character)) return false;
    return code < 32 || code >= 127 && code <= 159 || !supportedRanges.some(([first, last]) => code >= first && code <= last);
  }))];
  if (unsupported.length) {
    const characters = unsupported.slice(0, 8).map(character => `“${character}” (U+${character.codePointAt(0).toString(16).toUpperCase()})`).join(', ');
    throw new Error(`The resume font cannot display ${characters}${unsupported.length > 8 ? ', and more characters' : ''}. Replace these characters in the source before exporting; no PDF was created.`);
  }
}

/**
 * Render a complete successful parser result; unsupported glyphs block generation.
 * @param {import('../resume/types.js').Resume} resume
 */
export function documentDefinition(resume) {
  verifyCharacters(resume);
  const pagination = createPagination();
  let contact;
  try {
    // PDF URI annotations need ASCII serialization (including Unicode URL paths).
    contact = resume.contact.map(item => item.link ? { ...item, link: new URL(item.link).href } : item);
  } catch {
    throw new Error('A contact link is not a usable web or email address. Check its destination before exporting.');
  }
  const experienceHeading = sectionHeading('RELEVANT EXPERIENCE');
  const content = [
    { text: resume.name, style: 'name', margin: [0, 0, 0, 3] },
    {
      text: contact.flatMap((item, index) => index ? [{ text: ' • ' }, item] : [item]),
      style: 'contact',
      margin: [0, 0, 0, 10],
    },
    { text: resume.title, style: 'title', margin: [0, 0, 0, 10] },
    { text: resume.summary },
    experienceHeading,
  ];
  for (const [jobIndex, job] of resume.jobs.entries()) {
    const header = {
      stack: [
        entryRow(job.employer, job.dates, 'entryHeading', 'date'),
        entryRow(job.role, job.location, 'role', 'location'),
      ],
      margin: [0, 0, 0, entryBottomMargin],
      headlineLevel: 1,
      unbreakable: true,
    };
    const bullets = job.bullets.map(bullet => ({ ul: [bullet], margin: bulletMargins }));
    pagination.keepWith(header, bullets[0]);
    if (jobIndex === 0) pagination.keepWith(experienceHeading, bullets[0]);
    content.push(header, ...bullets);
  }
  const educationHeading = sectionHeading('EDUCATION');
  content.push(educationHeading);
  for (const [entryIndex, entry] of resume.education.entries()) {
    const qualification = { text: entry.qualification, style: 'entryHeading', headlineLevel: 1 };
    const institution = {
      ...entryRow(entry.institution, entry.dates, 'body', 'date'),
      margin: [0, 0, 0, entryBottomMargin],
    };
    pagination.keepWith(qualification, institution);
    if (entryIndex === 0) pagination.keepWith(educationHeading, institution);
    content.push(qualification, institution);
  }
  const certificationsHeading = sectionHeading('CERTIFICATIONS');
  content.push(certificationsHeading);
  for (const [entryIndex, entry] of resume.certifications.entries()) {
    const title = {
      ...entryRow(entry.title, entry.dates, 'entryHeading', 'date'),
      headlineLevel: 1,
    };
    const issuer = { text: entry.issuer, margin: [0, 0, 0, entryBottomMargin] };
    pagination.keepWith(title, issuer);
    if (entryIndex === 0) pagination.keepWith(certificationsHeading, issuer);
    content.push(title, issuer);
  }
  const skillsHeading = sectionHeading('SKILLS');
  content.push(skillsHeading);
  for (const [rowIndex, row] of resume.skills.entries()) {
    const skills = {
      text: [{ text: `${row.category}: `, style: 'skillsCategory' }, row.items],
      margin: [0, 0, 0, 3],
    };
    if (rowIndex === 0) pagination.keepWith(skillsHeading, skills);
    content.push(skills);
  }
  return {
    info: { title: 'Applicable resume', author: 'Applicable' },
    pageSize: 'LETTER',
    pageMargins,
    defaultStyle: styles.body,
    styles,
    content,
    pageBreakBefore: pagination.pageBreakBefore,
  };
}
