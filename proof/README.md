# PDF rendering investigation (A1)

This is a synthetic, developer-only proof, not the finished paste-to-PDF application. A4 promotes its template into shared production modules under `app/pdf/`; see [the production template and verification record](../docs/pdf-template.md). The fixture objects do not define the future text input contract. No reference resumes or personal information are included.

## Reproduce

Prerequisites: Node.js 22.13+ in the 22.x series, or Node.js 24+, and npm. Use a current desktop Chrome installation for the browser check. Installation downloads dependencies; generation itself uses only local assets.

```sh
npm ci
npm test
npm run proof:generate
npm run proof:serve
```

Open http://127.0.0.1:4173/, select an example, generate, inspect the actual embedded PDF, and download it. The tiny development server binds only to the loopback address and serves an explicit asset list. Stop it with Ctrl+C. It does not receive or generate resume content; all PDF generation happens in the browser. Opening the HTML directly with `file://` is unsupported because JavaScript modules and font loading need a local origin.

For automated browser verification, stop the manual proof server first; the test command now owns its temporary servers. Build the application, then run:

```sh
npm run build
npm run test:browser
```

Playwright uses installed Chrome by default. To use another Chromium executable, set `CHROME_PATH` to its absolute path. To use the version-matched browser used in CI, run `npx --no-install playwright install chromium` and set `PLAYWRIGHT_BROWSER=chromium`. No browser download occurs automatically when running the checks. PDF.js and Playwright are test-only dependencies, not product assets. The browser test saves an ignored screenshot to `output/pdf/browser-preview.png`.

The seven generated PDFs are written to `output/pdf/` (ignored), including the parsed canonical example and targeted split-job, multi-page-bullet and long-value fixtures. To render every page for visual review, install Poppler and run:

```sh
pdftoppm -scale-to 1200 -png output/pdf/short.pdf output/pdf/short
pdftoppm -scale-to 1200 -png output/pdf/typical.pdf output/pdf/typical
pdftoppm -scale-to 1200 -png output/pdf/long.pdf output/pdf/long
```

A2 adds application development/build scripts, lint and CI; see the [main README](../README.md). This proof does not implement the parser, user resume form or final packaging. F1 migrates the shared PDF core to strict TypeScript; fixtures and developer tools remain JavaScript. The allowlisted proof server erases core types in memory and serves JavaScript, without a second emitted build. Direct Node imports need `--experimental-strip-types`; the package commands include it.

## Decision

Use native browser HTML/CSS/JavaScript plus **pdfmake 0.2.20**, pinned with `package-lock.json`. Its declarative document layout handles automatic pagination, selectable text, local font embedding, and link annotations. This avoids building a pagination engine or requiring a generation backend. The browser bundle is approximately 1.3 MB uncompressed; the three bundled fonts total approximately 472 KiB. These are acceptable for a local tool; no UI framework is justified.

The same document definition and bundled fonts generate the Node verification samples and browser PDFs. Node generation is a development check, not a production architecture requirement. The browser creates one PDF buffer and one Blob URL shared by the preview iframe and download link; it does not generate a second HTML approximation or require a print dialog. The automated browser check compares the actual downloaded file bytes with bytes fetched from that preview URL for all three examples.

### Typography and layout

The original reference-matching look is preserved in the historical pre-refresh baseline. The current B2 template uses Source Sans 3 Regular 9.75 pt body with measured 12.9285 pt baselines, Bold 20 pt name, Semibold 9.75 pt tracked section headings, Semibold 10.75/10.25 pt employer/role, and the same Semibold 9.5 pt style for every date. Contact/location text is secondary `#4B5563`, body is primary `#20252B`, accents are `#1F4E5F`, and inline vector dividers are `#D8DEE6`. US Letter, 43 pt margins, hanging bullets, right-aligned metadata and source ordering remain. See [the complete semantic style and measurement record](../docs/pdf-template.md).

Every top-level heading/job header is linked to its next content block when pagination is calculated, avoiding orphan headers. Jobs can continue across pages. There is no fixed page limit, no truncation, and no automatic shrinking to hit a page count.

### Dependencies and licenses

| Dependency | Purpose | License / source |
| --- | --- | --- |
| pdfmake 0.2.20 | Only product dependency; browser PDF generation | MIT, installed `node_modules/pdfmake/LICENSE`; [official source](https://github.com/bpampuch/pdfmake/tree/0.2.20), [browser documentation](https://pdfmake.github.io/docs/0.1/getting-started/client-side/) |
| Source Sans 3 Regular, Semibold, Bold | Local static TTFs, embedded/subset into generated PDFs | SIL OFL 1.1; full license in `assets/fonts/OFL.txt`; [Adobe release/source record](../assets/fonts/SOURCE.md) |
| pdfjs-dist 4.10.38 | Test-only text, annotation and geometry inspection | Apache 2.0, installed `node_modules/pdfjs-dist/LICENSE`; [official source](https://github.com/mozilla/pdf.js) |
| Playwright 1.62.1 | Test-only real browser downloads and preview checks | Apache 2.0, installed `node_modules/playwright/LICENSE`; [official source](https://github.com/microsoft/playwright) |

Current static TTFs come from Adobe’s pinned 3.052R release, with exact source revision and original OFL recorded in `assets/fonts/SOURCE.md`. Poppins is retained only as embedded historical PDF subsets with its separate license. The bundled copies are the runtime sources; generation makes no font request to an external host. Any later distribution must preserve dependency notices, and font redistribution must retain `OFL.txt`. The npm lockfile records all transitive packages and integrity hashes. pdfmake's package installation currently emits upstream deprecation notices for `crypto-js` and `jpeg-exif`; the 2026-10-15 production dependency audit reported no known vulnerabilities. This snapshot is not a guarantee about future advisories.

### Limits and deferred work

- Native PDF preview was verified in desktop Chrome. Other browsers, mobile devices, and browsers configured to download every PDF may not render inline. Download remains available. No separate viewer is needed or included in the product proof.
- Browser PDF controls, zoom and antialiasing vary. The preview is the exact exported artifact, but viewport appearance need not match other PDF viewers pixel for pixel.
- Font coverage is bounded by the bundled Source Sans 3 files. Accented Latin text, curly quotes and an em dash are verified. A4 adds glyph coverage checks that block unsupported displayed characters with a recoverable message; no glyph is silently dropped. See the production template document.
- A4 verifies long unbroken tokens, long wrapping metadata, a job continued across pages and one bullet continued across three pages. C5 measures explicit keep-groups with the same engine and blocks headers that cannot fit with the beginning of their following content on a fresh page, preserving input for correction; no arbitrary-document fidelity claim is made.
- PDFs are searchable/selectable but are not tagged accessibility PDFs. The proof's automated bounds checks complement visual review; they do not prove the absence of every possible overlap.
- Styling uses the fixed Applicable visual identity, with no claim of exact reproduction for every possible input. No parsing, rewriting, storage, external AI or resume validation is implemented.

## Retained baseline and layout checklist

`baseline/typical.pdf` is a reviewed **synthetic-only** visual baseline, intentionally refreshed in B2 after all 14 fixture pages were inspected for the new hierarchy, shared dates and inline rules. The old exactly two-page Poppins output and identical frozen data remain in `baseline/pre-refresh/` for B2 comparison, with their original license. It is intentionally retained; generated scratch output stays ignored. Regenerate from `fixture('typical')` after a proposed layout change, compare it against this baseline, and update the baseline only after reviewing every affected page. Byte-for-byte identity is not a regression requirement because PDF internal identifiers can vary.

B2 review recorded on 2026-10-15: all 14 pages in short (1), typical (2), long (3), parsed (1), split-job (2), multi-page-bullet (3) and long-values (2) were rendered with Poppler and visually inspected. The browser checks verify the actual downloaded/previewed PDF bytes. The following checklist passed:

- [x] Text stays within page margins; no clipping, overlap or missing glyphs in the fixtures.
- [x] Name/title hierarchy, tracked Semibold headings and readable body follow the Applicable PDF style.
- [x] All date groups use matching Semibold size/color; locations align right in secondary color, separate from left metadata.
- [x] Real section dividers fill remaining width without crossing heading text; headings/rules stay with following content.
- [x] Wrapped bullets use consistent hanging indentation and readable line spacing.
- [x] Section headings and job headers share a page with following content.
- [x] Page transitions preserve continued job content without duplicate headers or blank pages.
- [x] Categorized skills use Semibold labels and flowing text in source order.
- [x] Selectable/searchable text preserves every fixture field and punctuation; link annotations target the intended email and URL.
- [x] Direct download works; preview and download share exactly the same bytes.
- [x] Generation makes no remote network requests after local installation.

Automated verification includes parser, original rendering and production-template tests plus development/production browser checks. See the production template document for exact cases. The browser check continues to compare actual downloaded bytes with the preview artifact and to reject remote HTTP/WebSocket requests.
