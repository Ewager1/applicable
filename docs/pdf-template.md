# Production PDF template

A4 promotes the verified single-column template into `src/pdf/`. The synthetic proof and production adapter use this same document definition; there is no separate HTML approximation or second layout implementation. A5 connects the paste interface to this shared template and local font loader.

## Modules and use

- `document.ts`: fixed section order, semantic typography/styles, explicit header/content relationships, metadata columns, and supported-character preflight.
- `pagination.ts`: local stable node IDs and the keep-with-content callback; no content-array offsets or fixed page cap.
- `fonts.ts`: local font mapping and browser-only font loading, with static asset URLs bundled by Vite.
- `header-fit.ts`: disposable same-engine layout check for blocks that must fit on one page; overflow stops delivery with recoverable guidance.
- `render.ts`: `createPdfBytes(resume, pdfMake, fontData)` returns a promise for one PDF byte buffer. Supply a successful parser result's `resume`, the locally imported pdfmake browser bundle, and the font map from `loadBrowserFonts()`.
- `font-coverage.ts`: generated supported code-point ranges and hashes for the exact bundled fonts.
- `proof/document.mjs`: compatibility re-exports of the production template.
- `proof/pdf.mjs`: Node-only development adapter reading the same fonts from disk.

The UI parses the entire source, loads/caches local fonts and awaits generation. On success it creates one Blob URL for preview and download. Parsing or rendering failures preserve the input, show the error message and offer no new/partial PDF. Unsupported native viewing omits the iframe source and keeps the download available. `createPdfBytes` rejects with an `Error` for unsupported displayed characters, unusable link destinations, missing/corrupt font data or a stream/engine failure. The pinned pdfmake 0.2 stream API uses the already loaded local VFS synchronously, so creation errors can be caught; stream errors also reject the promise. It deliberately avoids `getBuffer`'s internal asynchronous URL resolver, which otherwise leaves corrupt-font failures outside the caller's promise. The source model is not modified. No rendering API transmits input or requests external resources.

## Current layout

US Letter, white background, 43 pt margins and one column. The B2 visual identity supersedes the earlier reference-matching typography. Contact information, title and summary do not acquire visible uppercase headings. Each body section may be omitted; omitted sections produce no content nodes, headings, dividers or section spacing. Keep-groups are registered only for included entries, including when an entry section is first, last or the only body section. Existing complete resumes retain the same layout dimensions and styles.

| Semantic role                              | Source Sans 3 weight | Size     | Color                                             |
| ------------------------------------------ | -------------------- | -------- | ------------------------------------------------- |
| Name                                       | Bold                 | 20 pt    | Accent `#1F4E5F`                                  |
| Contact                                    | Regular              | 9.5 pt   | Secondary `#4B5563`                               |
| Professional title                         | Semibold             | 11.5 pt  | Primary `#20252B`                                 |
| Summary/body and skills values             | Regular              | 9.75 pt  | Primary                                           |
| Section headings                           | Semibold             | 9.75 pt  | Accent, 0.68 pt character spacing (about 0.07 em) |
| Employer, qualification, certificate title | Semibold             | 10.75 pt | Primary                                           |
| Role                                       | Semibold             | 10.25 pt | Primary                                           |
| Every date                                 | Semibold             | 9.5 pt   | Primary                                           |
| Location                                   | Semibold             | 9.5 pt   | Secondary                                         |
| Skills category                            | Semibold             | 9.75 pt  | Primary                                           |

All date-bearing rows reference the same `date` style; institutions/issuers retain independent Regular styling. Semantic font/color definitions live in the document's central `styles` map. The shared `entryHeading` style covers employers, qualifications and certificate titles; `entryRow` callers state both text styles explicitly. Fixed page/column/divider/section dimensions are named local constants, rather than a configurable theme system. No Light/ExtraLight font or old accent appears in newly generated PDFs.

Body `lineHeight: 1` in pdfmake yields **12.9285 pt actual baselines**, or **1.326 × 9.75 pt**, from Source Sans 3's ascent/descent metrics. This is measured from extracted PDF line positions. Setting pdfmake's multiplier to CSS-like 1.3 would multiply that existing font height again and over-expand the document. The heading/contact/name spacing is compact; no content is shrunk or truncated to force pagination.

Each section heading has a real 0.5 pt `#D8DEE6` vector border after a 9 pt gap, stretching through the remaining width to the right margin. An empty, 1 pt high table row supplies the adaptive border; a zero-height row would omit it. Heading and rule remain one unbreakable layout block, using the existing keep-with-following-content safeguards.

Experience uses the supplied job order, employer/dates followed by role/location, with hanging bullets. Right metadata occupies a bounded 180 pt column with a 12 pt gap so long supplied metadata wraps without expanding beyond the page or colliding with the left column. Education renders **qualification first**, followed by institution and dates aligned right. Certification renders **title and dates**, followed by issuer. Skills preserve category/item order and use Semibold labels with flowing text.

Section headings reserve following entry content, and ordinary job headers remain together with the beginning of their bullets. Jobs and individual long bullets continue automatically across pages, with no page-count limit, shrinking, screenshot conversion or content truncation. The practical stress fixtures include long wrapped metadata and unbroken tokens in bullets and skills; their complete text and bounds are checked in the PDF. A header group that cannot fit together with the beginning of its intended following content on one fresh page now blocks export with a recoverable correction message. Measurement includes all metadata columns, margins and the first section heading where applicable. It prevents both dropped unbreakable headers and apparently successful orphaned heading/header output. This is a resume template rather than a general document layout engine.

All displayed supplied text is selectable/searchable. Target-company metadata stays outside the PDF model and displayed-character preflight. Parsed contact metadata supplies Email, LinkedIn, Website and Phone in that order; blank fields and a wholly empty contact row are omitted. Phone is plain text. Usable email/web values receive safe destinations while all display values remain literal. Explicit links retain their target; URI annotations use `URL.href` serialization so Unicode URL paths/domains become valid encoded PDF destinations rather than malformed UTF-16 URI strings. Display labels remain unchanged. Plain non-link contact rows stay plain text.

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

C2 presentation cleanup verification: all seven before/after fixture PDFs had identical extracted text, coordinates, real font identities, rendering operators (including colors/rules), link targets/rectangles and page counts. All 14 Poppler images at 100 dpi were pixel-identical. Relevant typical and long-metadata pages were visually inspected; no baseline refresh was needed. The single font-descriptor list keeps filename and static Vite URL together, preserving `fontFiles`/`fonts` exports and font-coverage/proof compatibility.

C4 pagination cleanup registers each intended following content block while building its header: Experience heading and job header with the first bullet, Education heading/qualification with the institution/date row, Certification heading/title with the issuer, and Skills heading with its first category row. Stable IDs are assigned by relationship, not by array position. C4 preserved natural continuation for long jobs/bullets; C5 subsequently adds the fit safeguard described below. A real-PDF boundary regression inserts a neutral spacer between a header and its target: the header follows the meaningful content, rather than stranding beside the spacer. All seven before/after fixture PDFs matched in text, coordinates, font identities, rendering operators, links and page counts; all 14 Poppler page images were pixel-identical at 100 dpi. Relevant split-job and multi-page-bullet transitions were visually inspected; the retained baseline is unchanged.

## C5 oversized-header safeguard

The pinned pdfmake engine can discard an oversized unbreakable fragment while reporting successful PDF creation. Near-full-page headers can also leave a section heading or their first bullet stranded on another page. Original callback/page-number metadata is insufficient to detect this reliably after the loss. `header-fit.ts` therefore measures **the explicit C4 keep-groups** in a separate disposable pass: header through its actual intended following content, including intermediate layout nodes. Each group starts on a fresh page with unbreakable flags disabled. Its target's **first placed line** must share the group's starting page. Later lines of a multi-page bullet are allowed to continue.

Fonts, semantic styles, column widths, margins and page area match the real document. There is no character-count limit, text-matching heuristic, shrinking, truncation or parser restriction. This applies coherently to job/first-bullet groups, first-section/entry groups, qualification/institution groups and certificate/issuer groups. Long body text and multi-page bullets remain supported; heading metadata that makes its required group impossible to keep receives a correction message instead of an incomplete or orphaned result.

Every measured group has independently cloned plain layout nodes, styles/default style and margins; source definitions/functions are never patched. The measurement stream closes in `finally`. The real document and supplied resume data remain unchanged. No partial bytes reach the UI: final generation begins only after the fit check passes, and the existing error/retry flow retains source text with no artifact after failure.

This deliberately isolated integration uses **pdfmake 0.2.20's internal `_pdfMakePages` and placed-node `positions` metadata**, not a claimed public measurement API. Missing or incompatible metadata blocks export with a layout-check error. Engine upgrades must rerun compatibility, fit-boundary, font-failure and full preservation checks. There is one additional engine pass over keep-groups; shared headers appear in each group they participate in, and a long first bullet is measured in full although only its first line must fit. This has a CPU/memory cost for very large input; no universal performance claim is made. No dependency or remote request is added.

For the pinned synthetic `Longword` fixture, 269 repetitions retain every word **and** keep the section heading, complete header and beginning of the first bullet on one page; the adjacent 270-repeat case blocks. The earlier supported 250-repeat case still passes. The 287-repeat orphan reproduction and 300-repeat dropped-header reproduction now both fail clearly. These counts describe tests, not policy limits. Tests also cover oversized role/date/location and combined fields, repeated identical text elsewhere, Unicode, long body text, a multi-page first bullet, impossible Education/Certification keeps, unchanged source, unavailable metadata and stream cleanup. Browser checks verify no download/preview after failure and successful corrected resubmission.

All seven ordinary before/after fixture PDFs matched in text, coordinates, font identities, rendering operators, links and page counts. Their 14 rendered pages were pixel-identical at 100 dpi; the retained baseline is unchanged. The final near-limit supported output was visually inspected for complete header text, same-page section/header/bullet beginning, clipping and page transitions. The earlier 287-repeat orphan output is investigation evidence only and is rejected by the final guard.
