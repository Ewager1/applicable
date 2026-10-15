import { documentDefinition } from './document.js';
import { fonts } from './fonts.js';

export class HeaderFitError extends Error {}

const incompatibleLayout = () => new HeaderFitError('The PDF layout could not be checked. Restart Applicable and try again; no PDF was created.');

// Definitions contain plain layout objects and functions, not engine instances.
// Each group needs its own nodes: the same header can participate in two keeps.
function cloneLayout(value) {
  if (Array.isArray(value)) return value.map(cloneLayout);
  if (!value || typeof value !== 'object') return value;
  const copy = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneLayout(item)]));
  delete copy.id;
  if (copy.unbreakable) copy.unbreakable = false;
  return copy;
}

/**
 * Measure explicit keep-groups with the same engine and fresh-page area. The
 * target must begin on that page; its later lines may continue naturally.
 * @param {import('../resume/types.js').Resume} resume
 * @param {typeof import('pdfmake/build/pdfmake.js')} pdfMake
 * @param {Record<string, string>} fontData
 */
export function verifyHeaderFit(resume, pdfMake, fontData) {
  const definition = documentDefinition(resume);
  const groups = definition.keepGroups.map(({ header, content, label }, index) => {
    const start = definition.content.indexOf(header);
    const end = definition.content.indexOf(content);
    if (start < 0 || end < start) throw incompatibleLayout();
    const nodes = definition.content.slice(start, end + 1).map(cloneLayout);
    return {
      label,
      target: nodes.at(-1),
      block: { stack: nodes, ...(index > 0 ? { pageBreak: 'before' } : {}) },
    };
  });
  const measurement = {
    pageSize: definition.pageSize,
    pageMargins: cloneLayout(definition.pageMargins),
    defaultStyle: cloneLayout(definition.defaultStyle),
    styles: cloneLayout(definition.styles),
    content: groups.map(group => group.block),
  };
  let stream;
  try {
    stream = pdfMake.createPdf(measurement, undefined, fonts, fontData).getStream();
    // Isolated dependency on the pinned pdfmake 0.2.20 placed-layout metadata.
    // Refuse export if a future engine cannot supply the measurements we check.
    const pages = stream._pdfMakePages;
    if (!Array.isArray(pages) || !pages.length || pages.some(page => !Array.isArray(page.items) || !page.items.some(item => item.type === 'line'))) {
      throw incompatibleLayout();
    }
    for (const { label, block, target } of groups) {
      const startPage = block.positions?.[0]?.pageNumber;
      const targetPage = target.positions?.[0]?.pageNumber;
      if (![startPage, targetPage].every(page => Number.isInteger(page) && page >= 1 && page <= pages.length)) {
        throw incompatibleLayout();
      }
      if (startPage !== targetPage) {
        const guidance = label.startsWith('job ')
          ? 'Shorten the employer, role, dates or location, then create the PDF again.'
          : 'Shorten the heading details for this entry, then create the PDF again.';
        throw new HeaderFitError(`The details at the top of ${label} are too long to fit with the beginning of its content on one page. ${guidance} Your resume text is still here.`);
      }
    }
  } finally {
    stream?.destroy();
  }
}
