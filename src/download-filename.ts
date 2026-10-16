const MAX_FILENAME_BYTES = 180;

function cleanPart(value: string) {
  // Remove hidden directional controls and lone surrogates; keep safe Unicode,
  // including joiners used in emoji. These edits affect filenames only.
  return value
    .replace(/[<>:"/\\|?*]/g, ' ')
    .replace(/[\p{Cc}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu, ' ')
    .replace(/[\uD800-\uDFFF]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

// encodeURIComponent counts UTF-8 bytes without a browser/Node-specific API.
const byteLength = (value: string) =>
  encodeURIComponent(value).replace(/%[0-9A-F]{2}|./g, 'x').length;

function fitPart(value: string, budget: number) {
  let bounded = '';
  for (const character of value) {
    if (byteLength(bounded + character) > budget) break;
    bounded += character;
  }
  return bounded.trimEnd();
}

/**
 * Readable portable download name only; never changes the resume/PDF content.
 * Bound UTF-8 bytes without splitting a Unicode code point, keeping the suffix.
 * @param {string} title Parsed professional title.
 * @param {string} [company] Optional interface-only company value.
 * @returns {string}
 */
export function resumeFilename(title: string, company = '') {
  const jobTitle = cleanPart(title);
  const companyName = cleanPart(company);
  if (!jobTitle && !companyName) return 'Resume.pdf';
  const suffix = ' Resume.pdf';
  const stemBudget = MAX_FILENAME_BYTES - byteLength(suffix);
  if (!companyName) return `${fitPart(jobTitle, stemBudget)}${suffix}`;

  const separator = ' at ';
  const partsBudget = stemBudget - byteLength(separator);
  // Share the budget between long parts, giving either short part its full name.
  const titleShare = Math.min(byteLength(jobTitle || 'Untitled'), Math.floor(partsBudget / 2));
  const companyBudget = Math.min(byteLength(companyName), partsBudget - titleShare);
  const titleBudget = partsBudget - companyBudget;
  return `${fitPart(jobTitle || 'Untitled', titleBudget)}${separator}${fitPart(companyName, companyBudget)}${suffix}`;
}
