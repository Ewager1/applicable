import { supportedRanges } from './font-coverage.js';
const accent = '#00786c';
const heading = (text) => ({ text, font: 'Heading', color: accent, fontSize: 10, margin: [0, 13, 0, 7], headlineLevel: 1, keepOffset: text === 'SKILLS' ? 1 : 2 });
const metadata = (left, right) => ({ columns: [{ text: left, width: '*' }, { text: right, width: 180, alignment: 'right' }], columnGap: 12, bold: true, fontSize: 11 });
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

/** Render a complete successful parser result; unsupported glyphs block generation. */
export function documentDefinition(resume) {
  verifyCharacters(resume);
  let contact;
  try {
    // PDF URI annotations need ASCII serialization (including Unicode URL paths).
    contact = resume.contact.map(item => item.link ? { ...item, link: new URL(item.link).href } : item);
  } catch {
    throw new Error('A contact link is not a usable web or email address. Check its destination before exporting.');
  }
  const content = [
    { text: resume.name, fontSize: 18, bold: true, color: accent, margin: [0, 0, 0, 3] },
    { text: contact.flatMap((item, i) => i ? [{ text: ' • ' }, item] : [item]), margin: [0, 0, 0, 16] },
    { text: resume.title, bold: true, fontSize: 11, margin: [0, 0, 0, 16] },
    { text: resume.summary },
    heading('RELEVANT EXPERIENCE'),
  ];
  for (const job of resume.jobs) {
    content.push({ stack: [metadata(job.employer, job.dates), metadata(job.role, job.location)], margin: [0, 0, 0, 5], headlineLevel: 1, unbreakable: true });
    for (const bullet of job.bullets) content.push({ ul: [bullet], margin: [7, 0, 0, 1.5] });
  }
  content.push(heading('EDUCATION'));
  for (const entry of resume.education) {
    content.push({ text: entry.qualification, bold: true, fontSize: 11, headlineLevel: 1 });
    content.push({ ...metadata(entry.institution, entry.dates), bold: false, fontSize: 10, margin: [0, 0, 0, 5] });
  }
  content.push(heading('CERTIFICATIONS'));
  for (const entry of resume.certifications) {
    content.push({ ...metadata(entry.title, entry.dates), headlineLevel: 1 });
    content.push({ text: entry.issuer, margin: [0, 0, 0, 5] });
  }
  content.push(heading('SKILLS'), ...resume.skills.map(row => ({ text: [{ text: `${row.category}: `, bold: true }, row.items], margin: [0, 0, 0, 3] })));
  const keepNext = new Map();
  content.forEach((node, index) => {
    node.id = `block-${index}`;
    if (node.headlineLevel === 1) keepNext.set(node.id, `block-${index + (node.keepOffset ?? 1)}`);
  });
  return {
    info: { title: 'Applicable resume', author: 'Applicable' },
    pageSize: 'LETTER', pageMargins: [43, 43, 43, 43],
    defaultStyle: { font: 'Poppins', fontSize: 10, lineHeight: 0.86 },
    content,
    // Re-evaluated after pagination so adjacent headings move with their content.
    pageBreakBefore: (node, followingNodesOnPage) => keepNext.has(node.id) && node.pageNumbers.length === 1 && !followingNodesOnPage.some(next => next.id === keepNext.get(node.id)),
  };
}
