/**
 * Shared editor-visible contracts. Import these with JSDoc `import()` annotations;
 * this module performs no runtime validation or content normalization.
 *
 * @typedef {object} ContactDetail
 * @property {string} text Displayed contact text.
 * @property {string} [link] Explicit web/email destination, separate from its label.
 *
 * @typedef {object} Job
 * @property {string} employer
 * @property {string} role
 * @property {string} dates Supplied text; dates are not interpreted or sorted.
 * @property {string} location
 * @property {string[]} bullets Supplied order, with indented continuations joined.
 *
 * @typedef {object} EducationEntry
 * @property {string} institution
 * @property {string} qualification
 * @property {string} dates
 *
 * @typedef {object} Certification
 * @property {string} title
 * @property {string} issuer
 * @property {string} dates
 *
 * @typedef {object} SkillCategory
 * @property {string} category
 * @property {string} items Comma-separated source text, preserving duplicates/order.
 *
 * @typedef {object} Resume
 * @property {string} name
 * @property {ContactDetail[]} contact
 * @property {string} title
 * @property {string} summary Paragraphs separated by two newlines.
 * @property {Job[]} jobs Supplied order, never sorted by relevance or date.
 * @property {EducationEntry[]} education
 * @property {Certification[]} certifications
 * @property {SkillCategory[]} skills
 *
 * @typedef {object} ValidationError
 * @property {string} message Human-readable correction guidance.
 * @property {number|null} line One-based original source line, or null when unavailable.
 *
 * @typedef {object} ParseSuccess
 * @property {true} ok
 * @property {Resume} resume Complete validated content; never a partial resume.
 *
 * @typedef {object} ParseFailure
 * @property {false} ok
 * @property {ValidationError[]} errors Reported in validation order.
 *
 * @typedef {ParseSuccess|ParseFailure} ParseResult
 */
export {};
