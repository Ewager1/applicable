# Production PDF template

A4 promotes the verified single-column template into `app/pdf/`. The synthetic proof and production adapter use this same document definition; there is no separate HTML approximation or second layout implementation. A5 connects the paste interface to this shared template and local font loader.

## Modules and use

- `document.js`: fixed section order, semantic typography/styles, automatic pagination, metadata columns, and supported-character preflight.
- `fonts.js`: local font mapping and browser-only font loading, with asset URLs Vite can bundle later.
- `render.js`: `createPdfBytes(resume, pdfMake, fontData)` returns a promise for one PDF byte buffer. Supply a successful parser result's `resume`, the locally imported pdfmake browser bundle, and the font map from `loadBrowserFonts()`.
- `font-coverage.js`: generated supported code-point ranges and hashes for the exact bundled fonts.
- `proof/document.mjs`: compatibility re-exports of the production template.
- `proof/pdf.mjs`: Node-only development adapter reading the same fonts from disk.

The UI parses the entire source, loads/caches local fonts and awaits generation. On success it creates one Blob URL for preview and download. Parsing or rendering failures preserve the input, show the error message and offer no new/partial PDF. Unsupported native viewing omits the iframe source and keeps the download available. `createPdfBytes` rejects with an `Error` for unsupported displayed characters, unusable link destinations, missing/corrupt font data or a stream/engine failure. The pinned pdfmake 0.2 stream API uses the already loaded local VFS synchronously, so creation errors can be caught; stream errors also reject the promise. It deliberately avoids `getBuffer`'s internal asynchronous URL resolver, which otherwise leaves corrupt-font failures outside the caller's promise. The source model is not modified. No rendering API transmits input or requests external resources.

## Current layout

US Letter, white background, 43 pt margins and one column. The B2 visual identity supersedes the earlier reference-matching typography. Contact information, title and summary do not acquire visible uppercase headings.

| Semantic role | Source Sans 3 weight | Size | Color |
| --- | --- | --- | --- |
| Name | Bold | 20 pt | Accent `#1F4E5F` |
| Contact | Regular | 9.5 pt | Secondary `#4B5563` |
| Professional title | Semibold | 11.5 pt | Primary `#20252B` |
| Summary/body and skills values | Regular | 9.75 pt | Primary |
| Section headings | Semibold | 9.75 pt | Accent, 0.68 pt character spacing (about 0.07 em) |
| Employer, qualification, certificate title | Semibold | 10.75 pt | Primary |
| Role | Semibold | 10.25 pt | Primary |
| Every date | Semibold | 9.5 pt | Primary |
| Location | Semibold | 9.5 pt | Secondary |
| Skills category | Semibold | 9.75 pt | Primary |

All date-bearing rows reference the same `date` style; institutions/issuers retain independent Regular styling. Semantic font/color definitions live in the document's central `styles` map. No Light/ExtraLight font or old accent appears in newly generated PDFs.

Body `lineHeight: 1` in pdfmake yields **12.9285 pt actual baselines**, or **1.326 × 9.75 pt**, from Source Sans 3's ascent/descent metrics. This is measured from extracted PDF line positions. Setting pdfmake's multiplier to CSS-like 1.3 would multiply that existing font height again and over-expand the document. The heading/contact/name spacing is compact; no content is shrunk or truncated to force pagination.

Each section heading has a real 0.5 pt `#D8DEE6` vector border after a 9 pt gap, stretching through the remaining width to the right margin. An empty, 1 pt high table row supplies the adaptive border; a zero-height row would omit it. Heading and rule remain one unbreakable layout block, using the existing keep-with-following-content safeguards.

Experience uses the supplied job order, employer/dates followed by role/location, with hanging bullets. Right metadata occupies a bounded 180 pt column with a 12 pt gap so long supplied metadata wraps without expanding beyond the page or colliding with the left column. Education renders **qualification first**, followed by institution and dates aligned right. Certification renders **title and dates**, followed by issuer. Skills preserve category/item order and use Semibold labels with flowing text.

Section headings reserve following entry content, and ordinary job headers remain together with the beginning of their bullets. Jobs and individual long bullets continue automatically across pages, with no page-count limit, shrinking, screenshot conversion or content truncation. The practical stress fixtures include long wrapped metadata and unbroken tokens in bullets and skills; their complete text and bounds are checked in the PDF. Very large, nonsensical multi-page header blocks are not a supported layout claim; this is a resume template rather than a general document layout engine.

All supplied text is selectable/searchable. Explicit links retain their target; URI annotations use `URL.href` serialization so Unicode URL paths/domains become valid encoded PDF destinations rather than malformed UTF-16 URI strings. Display labels and the original parsed link strings remain unchanged. Plain non-link contact rows stay plain text.

## Font coverage and errors

The three bundled Source Sans 3 static weights share 1,614 code points. The font files' actual character maps generate a compact intersection table, ensuring that each supplied displayed character can be shown in every template weight. Newlines, carriage returns and tabs used for structural whitespace are allowed. Other control characters and unmapped glyphs cause a recoverable error listing the first unsupported characters and their Unicode code points; nothing is silently removed, replaced with a box, transliterated or downloaded remotely.

Coverage checks apply to displayed text, **not hidden link destinations**. Latin accents, curly quotes, bullets and em dashes are verified. Many scripts and emoji are outside these bundled fonts; the user must correct those characters in the source before export. A broader fallback-font system would be a separate explicit decision.

To regenerate the table after an intentional font change:

```sh
npm run fonts:coverage
npm test
```

The development generator uses the font reader already shipped with the pinned pdfmake dependency, not a new runtime package. Tests verify the coverage artifact against SHA-256 hashes of each bundled font. Re-run visual checks and update the baseline after any font change. The current Source Sans 3 license and pinned Adobe source record are in `assets/fonts/`; B1 replaces the fonts without adding runtime dependencies.

## Reproduce and verify

```sh
npm ci
npm run proof:generate
npm run check
```

Browser checks use installed Chrome by default; see the main README to select pinned Chromium. `proof:generate` writes seven synthetic PDFs under ignored `output/pdf/`: short (1 page), typical (2), long (3), parsed canonical example (1), split-job (2), multi-page-bullet (3), and long-values (2). The split-job fixture explicitly continues one job on another page; the multi-page-bullet fixture continues one bullet on three pages.

Automated checks inspect every fixture field, production order, deliberately reversed jobs, Semibold education hierarchy, all link targets, embedded fonts, page bounds, same-baseline horizontal overlap, section/header adjacency and glyph rejection. Native-browser checks still verify real downloads, exact preview/download byte identity and no remote network requests. Automated bounds/overlap checks complement visual review; they do not establish every possible visual property for arbitrary input.

B2 visual review recorded 2026-10-15: all 14 pages from the seven regenerated fixtures were rendered with Poppler at 100 dpi and inspected, including both pages of the identical-data comparison. No clipping, text/rule overlap, blank pages, orphaned section headings or missing fixture text was observed. Metadata wraps within bounded columns; dates across all groups match in weight/size/color, independently of institution/issuer styling. The reviewed `proof/baseline/typical.pdf` was intentionally refreshed after that inspection. The frozen pre-refresh data and two-page Poppins PDF remain unchanged. The same source stays two pages (skills alone on page two); short/long remain one/three pages. Natural job/bullet continuations move with the larger body baseline spacing. Continue using the layout checklist in `proof/README.md`.

Tests additionally inspect actual rendered font identities and sizes for name/body/headings/employers/roles/contact/skills, repeated date values across two entries of each type, rendered fill colors, actual heading tracking, divider stroke width/color/right-edge/gap and text clearance, measured body baselines, and the pre-refresh PDF SHA-256. Native-browser checks still cover complete real downloads, preview byte identity and local-only requests.

## B1 font-only refresh

Adobe Source Sans 3.052R static Regular 400, Semibold 600 and Bold 700 replace all active Poppins paths. Body uses Regular; section headings use Semibold; existing bold text uses the actual Bold file. B1 intentionally left sizes, colors, margins, metadata styles and line spacing unchanged; the current B2 identity is documented above. Tests verify font identity, static weights, embedded PDF names, exact common glyph coverage, text/link retention, layout bounds and recoverable missing/corrupt-font failures. Greek Δ and Cyrillic Ж now pass real PDF extraction; emoji and CJK remain unsupported. Coverage is a cmap/glyph availability guarantee, not a claim of correct shaping for every writing system.

Before the swap, the identical content-heavy synthetic fixture and exactly two-page Poppins PDF were frozen in `proof/baseline/pre-refresh/`. The current `proof/baseline/typical.pdf` is the reviewed B2 output from identical data. Short/typical/long Source Sans outputs remain 1/2/3 pages. All 14 pages across the seven regenerated fixtures were visually inspected with Poppler, including split-job, multi-page-bullet and long-value stress cases. Review found no clipping, overlap, blank pages or orphaned section/job headers; text wraps more compactly with the new metrics. B2 uses the frozen fixture and old PDF for its comparison without resetting the source content.
