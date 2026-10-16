import type { ParseResult, ValidationError } from './types.ts';
import { contactDetails, safeLink } from './contact.ts';

interface SourceLine {
  text: string;
  line: number;
}
interface EntryBlock {
  lines: SourceLine[];
  line: number;
}
interface SectionBlock extends EntryBlock {
  title?: string;
}
const sectionTitles = new Map([
  ['professional title', 'Professional Title'],
  ['summary', 'Summary'],
  ['relevant experience', 'Relevant Experience'],
  ['volunteer experience', 'Volunteer Experience'],
  ['projects', 'Projects'],
  ['education', 'Education'],
  ['certifications', 'Certifications'],
  ['skills', 'Skills'],
]);
const bodySectionKeys = [...sectionTitles.keys()];
sectionTitles.set('contact', 'Contact');
sectionTitles.set('target company', 'Target Company');
const normalizeLabel = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase();
const bulletPattern = /^(?:-|\*|•)(?:[ \t]+(.*)|$)/;
const reservedControlPattern = /^(?:#{1,6}(?:\s|$)|```|~~~)/;
const symbolMarkers = new Map([
  ['@@CONTACT@@', '# Contact'],
  ['@@TARGET_COMPANY@@', '# Target Company'],
  ['@@PROFESSIONAL_TITLE@@', '# Professional Title'],
  ['@@SUMMARY@@', '# Summary'],
  ['@@RELEVANT_EXPERIENCE@@', '# Relevant Experience'],
  ['@@VOLUNTEER_EXPERIENCE@@', '# Volunteer Experience'],
  ['@@PROJECTS@@', '# Projects'],
  ['@@VOLUNTEER@@', '## Volunteer'],
  ['@@PROJECT@@', '## Project'],
  ['@@EDUCATION@@', '# Education'],
  ['@@CERTIFICATIONS@@', '# Certifications'],
  ['@@SKILLS@@', '# Skills'],
  ['@@JOB@@', '## Job'],
  ['@@EDUCATION_ENTRY@@', '## Education'],
  ['@@CERTIFICATION@@', '## Certification'],
]);

/**
 * Parse the documented Applicable text format without rewriting supplied content.
 * Errors never include a partially usable resume. The caller retains its source text.
 */
export function parseResume(source: unknown): ParseResult {
  if (typeof source !== 'string' || !source.trim()) {
    return {
      ok: false,
      errors: [{ message: 'Paste a complete resume before creating a PDF.', line: null }],
    };
  }
  const errors: ValidationError[] = [];
  const report = (message: string, line: number | null = null) => errors.push({ message, line });
  let lines = source
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((text, index) => ({ text, line: index + 1 }));
  const nonblank = lines.filter((item) => item.text.trim());
  const fence = /^(?:`{3,}|~{3,})/;
  if (nonblank.some((item) => fence.test(item.text.trim()))) {
    const first = nonblank[0];
    const last = nonblank.at(-1)!;
    if (
      first === last ||
      !/^```(?:text|plaintext)?$/i.test(first.text.trim()) ||
      last.text.trim() !== '```'
    ) {
      return {
        ok: false,
        errors: [
          {
            message:
              'Use one enclosing text code block with no commentary outside it, or copy only the resume text. Other code-block formats are not supported.',
            line: first.line,
          },
        ],
      };
    }
    lines = lines.filter((item) => item.line > first.line && item.line < last.line);
    const nested = lines.find((item) => fence.test(item.text.trim()));
    if (nested) {
      return {
        ok: false,
        errors: [
          {
            message:
              'Keep the resume inside one text code block. Remove nested or extra code fences.',
            line: nested.line,
          },
        ],
      };
    }
  }
  // Normalize standalone controls only; leave inline wording unchanged.
  // Malformed control lines are reported rather than treated as resume content.
  lines = lines.map((item) => {
    const text = item.text.trim();
    if (!text.startsWith('@@') && !/^@+[A-Z_]+@+$/i.test(text) && !/^[A-Z_]+@@$/i.test(text)) {
      return item;
    }
    const marker = symbolMarkers.get(text.toUpperCase());
    if (!marker)
      report(
        'Use a recognized @@MARKER@@ on its own line. Copy the exact section and entry markers from Applicable’s format instructions.',
        item.line,
      );
    return marker ? { ...item, text: marker } : item;
  });
  if (errors.length) return { ok: false, errors };
  const sectionBlocks = new Map<string, SectionBlock>();
  let currentBlock: SectionBlock | undefined;
  let preambleLine: number | undefined;
  for (const item of lines) {
    const { text, line } = item;
    const heading = text.trim().match(/^#(?:\s+(.*)|$)/);
    if (heading) {
      const key = normalizeLabel(heading[1] ?? '');
      currentBlock = { lines: [], line, title: sectionTitles.get(key) };
      if (!sectionTitles.has(key)) {
        report('Unknown section. Use the documented body or metadata section markers.', line);
      } else if (sectionBlocks.has(key)) {
        report(
          `${currentBlock.title} appears more than once. Combine its content under one marker.`,
          line,
        );
      } else {
        sectionBlocks.set(key, currentBlock);
      }
    } else if (currentBlock) {
      currentBlock.lines.push(item);
    } else if (text.trim() && preambleLine === undefined) {
      preambleLine = line;
    }
  }
  if (preambleLine !== undefined)
    report(
      'Put this content under a section marker, such as @@PROFESSIONAL_TITLE@@. Copy the complete resume using the chatbot code block’s Copy button; plain headings are not recognized.',
      preambleLine,
    );
  if (!sectionBlocks.size) {
    return {
      ok: false,
      errors: errors.length
        ? errors
        : [
            {
              message:
                'Include at least one nonempty body section using the resume format markers.',
              line: nonblank[0]?.line ?? null,
            },
          ],
    };
  }

  if (!bodySectionKeys.some((key) => sectionBlocks.has(key)))
    report('Include at least one nonempty body section using the resume format markers.');
  const readSectionLines = (key: string): SourceLine[] => {
    const block = sectionBlocks.get(key);
    if (!block) return [];
    const lines = block.lines.filter((item) => item.text.trim());
    if (!lines.length) report(`Add content under ${block.title}.`, block.line);
    return lines;
  };
  const titleLines = readSectionLines('professional title');
  const summaryLines = readSectionLines('summary');
  const jobLines = readSectionLines('relevant experience');
  const volunteerLines = readSectionLines('volunteer experience');
  const projectLines = readSectionLines('projects');
  const educationLines = readSectionLines('education');
  const certificationLines = readSectionLines('certifications');
  const skillLines = readSectionLines('skills');

  const parseField = (item: SourceLine) => {
    const match = item.text.trim().match(/^([^:]+):[ \t]*(.*)$/);
    return match ? { key: normalizeLabel(match[1]), value: match[2].trim() } : null;
  };
  const reportMissingFields = (
    values: Record<string, string>,
    fields: readonly string[],
    context: string,
    line: number,
  ) => {
    for (const key of fields) {
      if (!values[key]?.trim()) report(`Add ${key} for ${context}.`, line);
    }
  };
  const readFields = (
    lines: SourceLine[],
    allowed: readonly string[],
    context: string,
    startLine: number,
    required: readonly string[] = allowed,
  ) => {
    const values: Record<string, string> = {};
    for (const item of lines) {
      const value = parseField(item);
      if (!value || !allowed.includes(value.key)) {
        report(
          `Unrecognized content in ${context}. Use the field labels in the resume format.`,
          item.line,
        );
        continue;
      }
      if (Object.hasOwn(values, value.key)) {
        report(`${value.key} appears more than once in ${context}. Keep one value.`, item.line);
      } else {
        values[value.key] = value.value;
      }
    }
    reportMissingFields(values, required, context, startLine);
    return values;
  };
  const readEntries = (lines: SourceLine[], marker: string, context: string) => {
    const parsedEntries: EntryBlock[] = [];
    let entry: EntryBlock | undefined;
    let reportedPreamble = false;
    for (const item of lines) {
      if (normalizeLabel(item.text) === `## ${marker}`) {
        entry = { line: item.line, lines: [] };
        parsedEntries.push(entry);
      } else if (!entry) {
        if (!reportedPreamble)
          report(
            `Start each ${context} with ${marker === 'education' ? '@@EDUCATION_ENTRY@@' : `@@${marker.toUpperCase()}@@`}.`,
            item.line,
          );
        reportedPreamble = true;
      } else {
        entry.lines.push(item);
      }
    }
    return parsedEntries;
  };

  const contactBlock = sectionBlocks.get('contact');
  let name = '';
  let contact: ReturnType<typeof contactDetails> = [];
  if (!contactBlock) {
    report(
      'Add @@CONTACT@@ with Name: your full name to the pasted resume. Contact details now belong in the resume text.',
    );
  } else {
    const fields = readFields(
      contactBlock.lines.filter((item) => item.text.trim()),
      ['name', 'email', 'phone', 'linkedin', 'website'],
      'Contact',
      contactBlock.line,
      ['name'],
    );
    name = fields.name ?? '';
    contact = contactDetails(fields);
  }
  const companyLines = readSectionLines('target company');
  let targetCompany = '';
  if (companyLines.length) {
    if (companyLines.length !== 1 || reservedControlPattern.test(companyLines[0].text.trim())) {
      report('Use one plain-text line under Target Company.', companyLines[0].line);
    } else {
      targetCompany = companyLines[0].text.trim();
    }
  }

  let title = '';
  if (titleLines.length) {
    if (titleLines.length !== 1 || reservedControlPattern.test(titleLines[0].text.trim())) {
      report('Use one plain-text line under Professional Title.', titleLines[0].line);
    } else {
      title = titleLines[0].text.trim();
    }
  }
  for (const item of summaryLines) {
    if (reservedControlPattern.test(item.text.trim())) {
      report(
        'Use plain-text paragraphs under Summary; additional headings or code fences are not supported.',
        item.line,
      );
    }
  }
  // Join wrapped prose while retaining intentional paragraph breaks from blank lines.
  const summary = (sectionBlocks.get('summary')?.lines ?? [])
    .map((item) => item.text.trim())
    .join('\n')
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.split('\n').join(' '))
    .join('\n\n');

  const readBulletedEntry = (entry: EntryBlock, context: string, allowDescription = false) => {
    const metadata: SourceLine[] = [];
    const bullets: string[] = [];
    for (const item of entry.lines) {
      const text = item.text.trim();
      const match = text.match(bulletPattern);
      if (match) {
        bullets.push(match[1]?.trim() ?? '');
        if (!bullets.at(-1)) report(`Add text after the ${context} bullet marker.`, item.line);
      } else if (/^(?: {2,}| *\t)[ \t]*\S/.test(item.text)) {
        const previous = metadata.at(-1);
        if (
          !bullets.length &&
          allowDescription &&
          previous &&
          parseField(previous)?.key === 'description'
        ) {
          previous.text += ` ${text}`;
        } else if (!bullets.length) {
          report(
            `Put continued bullet text after a ${context} bullet${allowDescription ? ' or Description field' : ''}.`,
            item.line,
          );
        } else {
          bullets[bullets.length - 1] += ` ${text}`;
        }
      } else if (bullets.length) {
        report(
          `Indent continued bullet text by at least two spaces, or start a new bullet. Put ${context} fields above the bullets.`,
          item.line,
        );
      } else {
        metadata.push(item);
      }
    }
    return { metadata, bullets };
  };
  const jobs = readEntries(jobLines, 'job', 'job').map((entry) => {
    const { metadata, bullets } = readBulletedEntry(entry, 'job');
    const values = readFields(
      metadata,
      ['employer', 'role', 'dates', 'location'],
      'this job',
      entry.line,
    );
    if (!bullets.some((text) => text.trim()))
      report('Add at least one bullet for this job.', entry.line);
    return {
      employer: values.employer,
      role: values.role,
      dates: values.dates,
      location: values.location,
      bullets,
    };
  });
  const volunteerExperience = readEntries(volunteerLines, 'volunteer', 'volunteer entry').map(
    (entry) => {
      const { metadata, bullets } = readBulletedEntry(entry, 'volunteer');
      const values = readFields(
        metadata,
        ['organization', 'role', 'dates', 'location'],
        'this volunteer entry',
        entry.line,
        ['organization'],
      );
      if (!bullets.some((text) => text.trim()))
        report('Add at least one bullet for this volunteer entry.', entry.line);
      return {
        organization: values.organization,
        role: values.role ?? '',
        dates: values.dates ?? '',
        location: values.location ?? '',
        bullets,
      };
    },
  );
  const projects = readEntries(projectLines, 'project', 'project').map((entry) => {
    const { metadata, bullets } = readBulletedEntry(entry, 'project', true);
    const values = readFields(
      metadata,
      ['name', 'dates', 'link', 'description'],
      'this project',
      entry.line,
      ['name'],
    );
    if (values.link && !safeLink(values.link)) {
      const linkLine = metadata.find((item) => parseField(item)?.key === 'link')!;
      report('Use a usable HTTP(S) or bare web address for this project link.', linkLine.line);
    }
    if (!values.description?.trim() && !bullets.some((text) => text.trim()))
      report('Add a description or at least one bullet for this project.', entry.line);
    return {
      name: values.name,
      dates: values.dates ?? '',
      link: values.link ?? '',
      description: values.description ?? '',
      bullets,
    };
  });
  const education = readEntries(educationLines, 'education', 'education entry').map((entry) => {
    const values = readFields(
      entry.lines,
      ['institution', 'qualification', 'dates'],
      'this education entry',
      entry.line,
    );
    return {
      institution: values.institution,
      qualification: values.qualification,
      dates: values.dates,
    };
  });
  const certifications = readEntries(
    certificationLines,
    'certification',
    'certification entry',
  ).map((entry) => {
    const values = readFields(
      entry.lines,
      ['title', 'issuer', 'dates'],
      'this certification',
      entry.line,
    );
    return { title: values.title, issuer: values.issuer, dates: values.dates };
  });
  const skills = [];
  for (const item of skillLines) {
    const parts = item.text.trim().split(':');
    if (parts.length !== 2) {
      report(
        'Use one colon between a skill category and its comma-separated skills; colons inside names are not supported.',
        item.line,
      );
      continue;
    }
    const [category, items] = parts.map((part) => part.trim());
    if (!category || !items || items.split(',').some((skill) => !skill.trim())) {
      report(
        'Add a skill category and at least one skill, with no empty items between commas.',
        item.line,
      );
    } else if (reservedControlPattern.test(category)) {
      report('Use Category: skill, skill under Skills, without extra headings.', item.line);
    } else {
      skills.push({ category, items });
    }
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    resume: {
      name,
      contact,
      title,
      summary,
      jobs,
      volunteerExperience,
      projects,
      education,
      certifications,
      skills,
    },
    targetCompany,
  };
}
