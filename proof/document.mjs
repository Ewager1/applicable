// A bounded rendering proof. The production parser and template belong to later issues.
export const fontFiles = ['Poppins-Light.ttf', 'Poppins-SemiBold.ttf', 'Poppins-ExtraLight.ttf'];
export const fonts = {
  Poppins: { normal: fontFiles[0], bold: fontFiles[1], italics: fontFiles[0], bolditalics: fontFiles[1] },
  Heading: { normal: fontFiles[2], bold: fontFiles[2], italics: fontFiles[2], bolditalics: fontFiles[2] },
};
const accent = '#00786c';
const heading = (text) => ({ text, font: 'Heading', color: accent, fontSize: 10, margin: [0, 13, 0, 7], headlineLevel: 1 });
const metadata = (left, right) => ({ columns: [{ text: left, width: '*' }, { text: right, width: 'auto', alignment: 'right' }], columnGap: 12, bold: true, fontSize: 11 });
export function documentDefinition(resume) {
  const content = [
    { text: resume.name, fontSize: 18, bold: true, color: accent, margin: [0, 0, 0, 3] },
    { text: resume.contact.flatMap((item, i) => i ? [{ text: ' • ' }, item] : [item]), margin: [0, 0, 0, 16] },
    { text: resume.title, bold: true, fontSize: 11, margin: [0, 0, 0, 16] },
    { text: resume.summary },
    heading('RELEVANT EXPERIENCE'),
  ];
  for (const job of resume.jobs) {
    content.push({ stack: [metadata(job.employer, job.dates), metadata(job.role, job.location)], margin: [0, 0, 0, 5], headlineLevel: 1, unbreakable: true });
    for (const bullet of job.bullets) content.push({ ul: [bullet], margin: [7, 0, 0, 1.5] });
  }
  content.push(heading('EDUCATION'));
  for (const entry of resume.education) content.push({ stack: [metadata(entry.institution, entry.dates), { text: entry.qualification }], unbreakable: true });
  content.push(heading('CERTIFICATIONS'), ...resume.certifications.map(text => ({ text })));
  content.push(heading('SKILLS'), ...resume.skills.map(row => ({ text: [{ text: `${row.category}: `, bold: true }, row.items], margin: [0, 0, 0, 3] })));
  const keepNext = new Map();
  content.forEach((node, index) => {
    node.id = `block-${index}`;
    if (node.headlineLevel === 1) keepNext.set(node.id, `block-${index + 1}`);
  });
  return {
    info: { title: 'Applicable synthetic rendering proof', author: 'Applicable', creationDate: new Date('2026-01-01T00:00:00Z') },
    pageSize: 'LETTER', pageMargins: [43, 43, 43, 43],
    defaultStyle: { font: 'Poppins', fontSize: 10, lineHeight: 0.86 },
    content,
    // Re-evaluated after pagination so adjacent headings move with their content.
    pageBreakBefore: (node, followingNodesOnPage) => keepNext.has(node.id) && !followingNodesOnPage.some(next => next.id === keepNext.get(node.id)),
  };
}
