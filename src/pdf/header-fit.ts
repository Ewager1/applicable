import type { TDocumentDefinitions, ContentStack } from 'pdfmake/interfaces.js';
import type { Resume } from '../resume/types.ts';
import type { PdfMake, PdfStream } from './pdfmake-adapter.ts';
import { measuredPageCount, firstMeasuredPage } from './pdfmake-adapter.ts';
import { documentDefinition } from './document.ts';
import { fonts } from './fonts.ts';

export class HeaderFitError extends Error {}

const incompatibleLayout = () =>
  new HeaderFitError(
    'The PDF layout could not be checked. Restart Applicable and try again; no PDF was created.',
  );

// Definitions contain plain layout objects and functions, not engine instances.
// Each group needs its own nodes: the same header can participate in two keeps.
function cloneLayout<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => cloneLayout(item)) as T;
  if (!value || typeof value !== 'object') return value;
  const copy = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, cloneLayout(item)]),
  );
  delete copy.id;
  if (copy.unbreakable) copy.unbreakable = false;
  // Cloning retains the public layout shape; only application ids/keep flags change.
  return copy as T;
}

/**
 * Measure explicit keep-groups with the same engine and fresh-page area. The
 * target must begin on that page; its later lines may continue naturally.
 */
export function verifyHeaderFit(
  resume: Resume,
  pdfMake: PdfMake,
  fontData: Record<string, string>,
) {
  const definition = documentDefinition(resume);
  // Title/summary-only resumes have no heading relationships to measure.
  if (!definition.keepGroups.length) return;
  const groups = definition.keepGroups.map(({ header, content, label }, index) => {
    const start = definition.content.indexOf(header);
    const end = definition.content.indexOf(content);
    if (start < 0 || end < start) throw incompatibleLayout();
    const nodes = definition.content.slice(start, end + 1).map(cloneLayout);
    return {
      label,
      target: nodes.at(-1)!,
      block: { stack: nodes, ...(index > 0 ? { pageBreak: 'before' } : {}) } satisfies ContentStack,
    };
  });
  const measurement: TDocumentDefinitions = {
    pageSize: definition.pageSize,
    pageMargins: cloneLayout(definition.pageMargins),
    defaultStyle: cloneLayout(definition.defaultStyle),
    styles: cloneLayout(definition.styles),
    content: groups.map((group) => group.block),
  };
  let stream: PdfStream | undefined;
  try {
    stream = pdfMake.createPdf(measurement, undefined, fonts, fontData).getStream();
    const pageCount = measuredPageCount(stream);
    if (pageCount === undefined) throw incompatibleLayout();
    for (const { label, block, target } of groups) {
      const startPage = firstMeasuredPage(block, pageCount);
      const targetPage = firstMeasuredPage(target, pageCount);
      if (startPage === undefined || targetPage === undefined) throw incompatibleLayout();
      if (startPage !== targetPage) {
        const guidance = label.startsWith('job ')
          ? 'Shorten the employer, role, dates or location, then create the PDF again.'
          : 'Shorten the heading details for this entry, then create the PDF again.';
        throw new HeaderFitError(
          `The details at the top of ${label} are too long to fit with the beginning of its content on one page. ${guidance} Your resume text is still here.`,
        );
      }
    }
  } finally {
    stream?.destroy();
  }
}
