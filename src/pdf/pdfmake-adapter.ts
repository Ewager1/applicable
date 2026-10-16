import type { createPdf } from 'pdfmake/build/pdfmake.js';

/** Only the browser bundle API used by the core, not a second engine model. */
export interface PdfMake {
  createPdf: typeof createPdf;
}
export type PdfStream = ReturnType<ReturnType<typeof createPdf>['getStream']>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

/** Pinned pdfmake 0.2.20 adds these internal fields during synchronous layout.
 * Keep them unknown until checked; upgrading pdfmake requires rechecking this adapter.
 */
export function measuredPageCount(stream: PdfStream): number | undefined {
  const pages: unknown = Reflect.get(stream, '_pdfMakePages');
  if (
    !Array.isArray(pages) ||
    !pages.length ||
    pages.some(
      (page: unknown) =>
        !isRecord(page) ||
        !Array.isArray(page.items) ||
        !page.items.some((item: unknown) => isRecord(item) && item.type === 'line'),
    )
  )
    return undefined;
  return pages.length;
}

export function firstMeasuredPage(node: object, pageCount: number): number | undefined {
  const positions: unknown = Reflect.get(node, 'positions');
  if (!Array.isArray(positions) || !isRecord(positions[0])) return undefined;
  const page: unknown = positions[0].pageNumber;
  return typeof page === 'number' && Number.isInteger(page) && page >= 1 && page <= pageCount
    ? page
    : undefined;
}
