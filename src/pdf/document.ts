import type {
  ContentColumns,
  ContentStack,
  ContentUnorderedList,
  Margins,
  StyleDictionary,
  TDocumentDefinitions,
} from 'pdfmake/interfaces.js';
import type { Resume } from '../resume/types.ts';
import type { KeepGroup, LayoutNode } from './pagination.ts';

import { safeLink } from '../resume/contact.ts';
import { supportedRanges } from './font-coverage.ts';
import { createPagination } from './pagination.ts';

export interface ResumeDocument extends TDocumentDefinitions {
  content: LayoutNode[];
  keepGroups: KeepGroup[];
}
const palette = { primary: '#20252B', secondary: '#4B5563', accent: '#1F4E5F', divider: '#D8DEE6' };
const semibold = { font: 'SourceSans3Semibold' };
const pageMargins: Margins = [43, 43, 43, 43];
const metadataColumnWidth = 180;
const metadataColumnGap = 12;
const sectionColumnGap = 9;
const sectionMargins: Margins = [0, 11, 0, 6];
const dividerTopMargin = 6;
const dividerLineWidth = 0.5;
const entryBottomMargin = 5;
const bulletMargins: Margins = [7, 0, 0, 1.5];
const styles: StyleDictionary = {
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
const sectionHeading = (text: string): ContentColumns => ({
  columns: [
    { text, style: 'sectionHeading', width: 'auto' },
    // A table border uses the remaining column width; no text dashes or fixed
    // measurements that can overlap a wider heading.
    {
      width: '*',
      margin: [0, dividerTopMargin, 0, 0],
      table: { widths: ['*'], heights: 1, body: [['']] },
      layout: {
        hLineWidth: (index) => (index === 0 ? dividerLineWidth : 0),
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
const entryRow = (
  left: string,
  right: string,
  leftStyle: string,
  rightStyle: string,
): ContentColumns => ({
  columns: [
    { text: left, style: leftStyle, width: '*' },
    { text: right, style: rightStyle, width: metadataColumnWidth, alignment: 'right' },
  ],
  columnGap: metadataColumnGap,
});
const bulletsFor = (bullets: string[]): ContentUnorderedList[] =>
  bullets.map((bullet) => ({ ul: [bullet], margin: bulletMargins }));
const optionalRow = (left: string, right: string, leftStyle: string, rightStyle: string) =>
  right ? entryRow(left, right, leftStyle, rightStyle) : { text: left, style: leftStyle };
const experienceHeader = (
  primary: string,
  role: string,
  dates: string,
  location: string,
): ContentStack => ({
  stack: [
    optionalRow(primary, dates, 'entryHeading', 'date'),
    ...(role || location ? [optionalRow(role, location, 'role', 'location')] : []),
  ],
  margin: [0, 0, 0, entryBottomMargin],
  headlineLevel: 1,
  unbreakable: true,
});
function verifyCharacters(resume: Resume) {
  const text = [
    resume.name,
    ...resume.contact.map((item) => item.text),
    resume.title,
    resume.summary,
    ...resume.jobs.flatMap((job) => [
      job.employer,
      job.role,
      job.dates,
      job.location,
      ...job.bullets,
    ]),
    ...resume.volunteerExperience.flatMap((entry) => [
      entry.organization,
      entry.role,
      entry.dates,
      entry.location,
      ...entry.bullets,
    ]),
    ...resume.projects.flatMap((entry) => [
      entry.name,
      entry.dates,
      entry.link,
      entry.description,
      ...entry.bullets,
    ]),
    ...resume.education.flatMap((entry) => [entry.qualification, entry.institution, entry.dates]),
    ...resume.certifications.flatMap((entry) => [entry.title, entry.issuer, entry.dates]),
    ...resume.skills.flatMap((row) => [row.category, row.items]),
  ].join('\n');
  const unsupported = [
    ...new Set(
      [...text].filter((character) => {
        const code = character.codePointAt(0)!;
        if (['\n', '\r', '\t'].includes(character)) return false;
        return (
          code < 32 ||
          (code >= 127 && code <= 159) ||
          !supportedRanges.some(([first, last]) => code >= first && code <= last)
        );
      }),
    ),
  ];
  if (unsupported.length) {
    const characters = unsupported
      .slice(0, 8)
      .map(
        (character) => `“${character}” (U+${character.codePointAt(0)!.toString(16).toUpperCase()})`,
      )
      .join(', ');
    throw new Error(
      `The resume font cannot display ${characters}${unsupported.length > 8 ? ', and more characters' : ''}. Replace these characters in the source before exporting; no PDF was created.`,
    );
  }
}

/**
 * Render a complete successful parser result; unsupported glyphs block generation.
 */
export function documentDefinition(resume: Resume): ResumeDocument {
  verifyCharacters(resume);
  const pagination = createPagination();
  let contact;
  try {
    // PDF URI annotations need ASCII serialization (including Unicode URL paths).
    contact = resume.contact.map((item) =>
      item.link ? { ...item, link: new URL(item.link).href } : item,
    );
  } catch {
    throw new Error(
      'A contact link is not a usable web or email address. Check its destination before exporting.',
    );
  }
  const experienceHeading = sectionHeading('RELEVANT EXPERIENCE');
  const content: LayoutNode[] = [
    { text: resume.name, style: 'name', margin: [0, 0, 0, 3] },
    ...(contact.length
      ? [
          {
            text: contact.flatMap((item, index) => (index ? [{ text: ' • ' }, item] : [item])),
            style: 'contact',
            margin: [0, 0, 0, 10] as Margins,
          },
        ]
      : []),
    ...(resume.title
      ? [{ text: resume.title, style: 'title', margin: [0, 0, 0, 10] as Margins }]
      : []),
    ...(resume.summary ? [{ text: resume.summary }] : []),
    ...(resume.jobs.length ? [experienceHeading] : []),
  ];
  const appendEntry = (
    heading: LayoutNode,
    first: boolean,
    label: string,
    header: LayoutNode,
    details: LayoutNode[],
  ) => {
    pagination.keepWith(header, details[0], label);
    if (first) pagination.keepWith(heading, details[0], label);
    content.push(header, ...details);
  };
  for (const [jobIndex, job] of resume.jobs.entries()) {
    appendEntry(
      experienceHeading,
      jobIndex === 0,
      `job ${jobIndex + 1}`,
      experienceHeader(job.employer, job.role, job.dates, job.location),
      bulletsFor(job.bullets),
    );
  }
  const volunteerHeading = sectionHeading('VOLUNTEER EXPERIENCE');
  if (resume.volunteerExperience.length) content.push(volunteerHeading);
  for (const [index, entry] of resume.volunteerExperience.entries()) {
    appendEntry(
      volunteerHeading,
      index === 0,
      `volunteer entry ${index + 1}`,
      experienceHeader(entry.organization, entry.role, entry.dates, entry.location),
      bulletsFor(entry.bullets),
    );
  }
  const projectsHeading = sectionHeading('PROJECTS');
  if (resume.projects.length) content.push(projectsHeading);
  for (const [index, project] of resume.projects.entries()) {
    const link = project.link ? safeLink(project.link) : undefined;
    if (project.link && !link)
      throw new Error(
        'A project link is not a usable web address. Check its destination before exporting.',
      );
    const header: ContentStack = {
      stack: [
        optionalRow(project.name, project.dates, 'entryHeading', 'date'),
        ...(link ? [{ text: project.link, link, style: 'contact' }] : []),
      ],
      margin: [0, 0, 0, entryBottomMargin],
      headlineLevel: 1,
      unbreakable: true,
    };
    const details: LayoutNode[] = [
      ...(project.description
        ? [{ text: project.description, margin: [0, 0, 0, entryBottomMargin] as Margins }]
        : []),
      ...bulletsFor(project.bullets),
    ];
    appendEntry(projectsHeading, index === 0, `project ${index + 1}`, header, details);
  }
  const educationHeading = sectionHeading('EDUCATION');
  if (resume.education.length) content.push(educationHeading);
  for (const [entryIndex, entry] of resume.education.entries()) {
    const qualification = { text: entry.qualification, style: 'entryHeading', headlineLevel: 1 };
    const institution: ContentColumns = {
      ...entryRow(entry.institution, entry.dates, 'body', 'date'),
      margin: [0, 0, 0, entryBottomMargin],
    };
    pagination.keepWith(qualification, institution, `education entry ${entryIndex + 1}`);
    if (entryIndex === 0) pagination.keepWith(educationHeading, institution, 'education entry 1');
    content.push(qualification, institution);
  }
  const certificationsHeading = sectionHeading('CERTIFICATIONS');
  if (resume.certifications.length) content.push(certificationsHeading);
  for (const [entryIndex, entry] of resume.certifications.entries()) {
    const title = {
      ...entryRow(entry.title, entry.dates, 'entryHeading', 'date'),
      headlineLevel: 1,
    };
    const issuer: LayoutNode = { text: entry.issuer, margin: [0, 0, 0, entryBottomMargin] };
    pagination.keepWith(title, issuer, `certification entry ${entryIndex + 1}`);
    if (entryIndex === 0)
      pagination.keepWith(certificationsHeading, issuer, 'certification entry 1');
    content.push(title, issuer);
  }
  const skillsHeading = sectionHeading('SKILLS');
  if (resume.skills.length) content.push(skillsHeading);
  for (const [rowIndex, row] of resume.skills.entries()) {
    const skills: LayoutNode = {
      text: [{ text: `${row.category}: `, style: 'skillsCategory' }, row.items],
      margin: [0, 0, 0, 3],
    };
    if (rowIndex === 0) pagination.keepWith(skillsHeading, skills, 'the Skills section');
    content.push(skills);
  }
  return {
    info: { title: 'Applicable resume', author: 'Applicable' },
    pageSize: 'LETTER',
    pageMargins,
    defaultStyle: styles.body,
    styles,
    content,
    // Application-only fit-check metadata; pdfmake renders only `content`.
    keepGroups: pagination.groups,
    pageBreakBefore: pagination.pageBreakBefore,
  };
}
