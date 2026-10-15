# Production PDF template

A4 promotes the verified single-column template into `app/pdf/`. The synthetic proof and production adapter use this same document definition; there is no separate HTML approximation or second layout implementation. A5 connects the paste interface to this shared template and local font loader.

## Modules and use

- `document.js`: fixed section order, reference typography, automatic pagination, metadata columns, and supported-character preflight.
- `fonts.js`: local font mapping and browser-only font loading, with asset URLs Vite can bundle later.
- `render.js`: `createPdfBytes(resume, pdfMake, fontData)` returns a promise for one PDF byte buffer. Supply a successful parser result's `resume`, the locally imported pdfmake browser bundle, and the font map from `loadBrowserFonts()`.
- `font-coverage.js`: generated supported code-point ranges and hashes for the exact bundled fonts.
- `proof/document.mjs`: compatibility re-exports of the production template.
- `proof/pdf.mjs`: Node-only development adapter reading the same fonts from disk.

The UI parses the entire source, loads/caches local fonts and awaits generation. On success it creates one Blob URL for preview and download. Parsing or rendering failures preserve the input, show the error message and offer no new/partial PDF. Unsupported native viewing omits the iframe source and keeps the download available. `createPdfBytes` rejects with an `Error` for unsupported displayed characters, unusable link destinations, missing/corrupt font data or a stream/engine failure. The pinned pdfmake 0.2 stream API uses the already loaded local VFS synchronously, so creation errors can be caught; stream errors also reject the promise. It deliberately avoids `getBuffer`'s internal asynchronous URL resolver, which otherwise leaves corrupt-font failures outside the caller's promise. The source model is not modified. No rendering API transmits input or requests external resources.

## Reference layout

US Letter, 43 pt margins, Poppins Light 10 pt body, SemiBold 18 pt teal name and 11 pt entry headers, ExtraLight 10 pt teal section headings, accent `#00786c`, and approximately 12 pt body baselines remain the reference baseline. Contact information, title and summary do not acquire visible uppercase headings.

Experience uses the supplied job order, employer/dates followed by role/location, with hanging bullets. Right metadata occupies a bounded 180 pt column with a 12 pt gap so long supplied metadata wraps without expanding beyond the page or colliding with the left column. Education renders **qualification first**, followed by institution and dates aligned right. Certification renders **title and dates**, followed by issuer. Skills preserve category/item order and use bold labels with flowing text.

Section headings reserve following entry content, and ordinary job headers remain together with the beginning of their bullets. Jobs and individual long bullets continue automatically across pages, with no page-count limit, shrinking, screenshot conversion or content truncation. The practical stress fixtures include long wrapped metadata and unbroken tokens in bullets and skills; their complete text and bounds are checked in the PDF. Very large, nonsensical multi-page header blocks are not a supported layout claim; this is a resume template rather than a general document layout engine.

All supplied text is selectable/searchable. Explicit links retain their target; URI annotations use `URL.href` serialization so Unicode URL paths/domains become valid encoded PDF destinations rather than malformed UTF-16 URI strings. Display labels and the original parsed link strings remain unchanged. Plain non-link contact rows stay plain text.

## Font coverage and errors

The three bundled Poppins weights share 471 code points. The font files' actual character maps generate a compact intersection table, ensuring that each supplied displayed character can be shown in every template weight. Newlines, carriage returns and tabs used for structural whitespace are allowed. Other control characters and unmapped glyphs cause a recoverable error listing the first unsupported characters and their Unicode code points; nothing is silently removed, replaced with a box, transliterated or downloaded remotely.

Coverage checks apply to displayed text, **not hidden link destinations**. Latin accents, curly quotes, bullets and em dashes are verified. Many scripts and emoji are outside these bundled fonts; the user must correct those characters in the source before export. A broader fallback-font system would be a separate explicit decision.

To regenerate the table after an intentional font change:

```sh
npm run fonts:coverage
npm test
```

The development generator uses the font reader already shipped with the pinned pdfmake dependency, not a new runtime package. Tests verify the coverage artifact against SHA-256 hashes of each bundled font. Re-run visual checks and update the baseline after any font change. Font licenses remain in `assets/fonts/OFL.txt`; no new fonts or dependencies were added in A4.

## Reproduce and verify

```sh
npm ci
npm run proof:generate
npm run check
```

Browser checks use installed Chrome by default; see the main README to select pinned Chromium. `proof:generate` writes seven synthetic PDFs under ignored `output/pdf/`: short (1 page), typical (2), long (3), parsed canonical example (1), split-job (2), multi-page-bullet (3), and long-values (2). The split-job fixture explicitly continues one job on another page; the multi-page-bullet fixture continues one bullet on three pages.

Automated checks inspect every fixture field, production order, deliberately reversed jobs, bold education hierarchy, all link targets, embedded fonts, page bounds, same-baseline horizontal overlap, section/header adjacency and glyph rejection. Native-browser checks still verify real downloads, exact preview/download byte identity and no remote network requests. Automated bounds/overlap checks complement visual review; they do not establish every possible visual property for arbitrary input.

Visual review recorded 2026-10-15: all 14 pages from the seven generated fixtures were rendered with Poppler and inspected. No clipping, text overlap, blank pages or missing fixture text was observed. Metadata wraps within its columns, the explicit job/bullet continuations remain readable, and the education/certification hierarchy matches the reference. The reviewed `proof/baseline/typical.pdf` was intentionally refreshed for the corrected education/certification layout and metadata wrapping. Continue using the layout checklist in `proof/README.md` for later changes.
