# PDF proof and regression resources

This directory retains the synthetic PDF investigation, testing fixtures, reviewed PDF baselines and regression checks. It shares the production TypeScript renderer in `src/pdf/` with the React/TypeScript application; the separate proof page remains a small JavaScript development tool. The [input contract](../docs/input-format.md) defines pasted text, while proof fixture objects supply rendering inputs. No personal resumes or contact details are included.

- `fixtures.mjs` supplies short, typical and long rendering inputs; `production-fixtures.mjs` parses the canonical example and supplies pagination/long-value stress cases.
- `document.mjs` and `pdf.mjs` reuse the production template and renderer; `generate.mjs` writes disposable samples.
- `index.html`, `browser.mjs` and `serve.mjs` provide the loopback-only interactive proof. `render.test.mjs` and `browser.test.mjs` retain PDF and actual preview/download regression checks.
- `baseline/typical.pdf` is the current reviewed visual baseline. `baseline/pre-refresh/` preserves the frozen old-font PDF, identical synthetic data and its license. Keep these source-controlled resources; only scratch output belongs in ignored `output/`.

## Reproduce

Use the [supported Node version and local installation instructions](../README.md#download-and-run-locally). After installing dependencies, run from the repository root:

```sh
npm run proof:generate
npm run proof:serve
```

Open http://127.0.0.1:4173/, select an example, generate, inspect the actual embedded PDF, and download it. The tiny development server binds only to the loopback address and serves an explicit asset list. Stop it with Ctrl+C. It does not receive or generate resume content; all PDF generation happens in the browser. Opening the HTML directly with `file://` is unsupported because JavaScript modules and font loading need a local origin.

For automated checks, stop the manual proof server first and follow the [maintenance check commands](../docs/maintenance.md#choose-verification-by-the-change). The browser command owns its temporary servers; [browser selection/setup](../README.md#verification-and-build) is documented in the main README. PDF.js and Playwright are test-only dependencies. The browser test saves an ignored screenshot to `output/pdf/browser-preview.png`.

The seven generated PDFs are written to `output/pdf/` (ignored), including the parsed canonical example and targeted split-job, multi-page-bullet and long-value fixtures. To render sample pages for visual review, install Poppler; for example:

```sh
pdftoppm -scale-to 1200 -png output/pdf/short.pdf output/pdf/short
pdftoppm -scale-to 1200 -png output/pdf/typical.pdf output/pdf/typical
pdftoppm -scale-to 1200 -png output/pdf/long.pdf output/pdf/long
```

The proof server transforms only allowlisted TypeScript core routes in memory and serves JavaScript, without a second emitted build. Direct Node imports need `--experimental-strip-types`; package commands include it. See [the TypeScript/JavaScript boundary](../docs/development.md#typescriptjavascript-boundary).

## Rendering approach

The application uses React/TypeScript for its interface and a framework-independent TypeScript PDF core with pinned **pdfmake 0.2.20**. Its declarative layout handles automatic pagination, selectable text, local font embedding and link annotations. PDF generation runs in the browser without a generation backend. The proof exercises that same core without mounting the application interface.

The same document definition and bundled fonts generate the Node verification samples and browser PDFs. Node generation is a development check, not a production architecture requirement. The browser creates one PDF buffer and one Blob URL shared by the preview iframe and download link; it does not generate a second HTML approximation or require a print dialog. The automated browser check compares the actual downloaded file bytes with bytes fetched from that preview URL for all three examples.

### Typography and layout

The original reference-matching look is preserved in the historical pre-refresh baseline. The current B2 template uses Source Sans 3 Regular 9.75 pt body with measured 12.9285 pt baselines, Bold 20 pt name, Semibold 9.75 pt tracked section headings, Semibold 10.75/10.25 pt employer/role, and the same Semibold 9.5 pt style for every date. Contact/location text is secondary `#4B5563`, body is primary `#20252B`, accents are `#1F4E5F`, and inline vector dividers are `#D8DEE6`. US Letter, 43 pt margins, hanging bullets, right-aligned metadata and source ordering remain. See [the complete semantic style and measurement record](../docs/pdf-template.md).

Every top-level heading/job header is linked to its next content block when pagination is calculated, avoiding orphan headers. Jobs can continue across pages. There is no fixed page limit, no truncation, and no automatic shrinking to hit a page count.

### Dependencies and licenses

[Tool choices](../docs/development.md#tool-choices) describe application and development dependencies. [Third-party notices](../THIRD_PARTY_NOTICES.md) own the runtime inventory, licenses and production notice packaging; [the font source record](../assets/fonts/SOURCE.md) pins the bundled Adobe release. Poppins remains only in the frozen historical PDF subsets with its original license. PDF.js and Playwright inspect generated output during development and are excluded from the application build.

### Limits and deferred work

- Native PDF preview was verified in desktop Chrome. Other browsers, mobile devices, and browsers configured to download every PDF may not render inline. Download remains available. No separate viewer is needed or included in the product proof.
- Browser PDF controls, zoom and antialiasing vary. The preview is the exact exported artifact, but viewport appearance need not match other PDF viewers pixel for pixel.
- Font coverage is bounded by the bundled Source Sans 3 files. Accented Latin text, curly quotes and an em dash are verified. Production glyph coverage checks block unsupported displayed characters with a recoverable message; no glyph is silently dropped. See the [production template](../docs/pdf-template.md).
- A4 verifies long unbroken tokens, long wrapping metadata, a job continued across pages and one bullet continued across three pages. C5 measures explicit keep-groups with the same engine and blocks headers that cannot fit with the beginning of their following content on a fresh page, preserving input for correction; no arbitrary-document fidelity claim is made.
- PDFs are searchable/selectable but are not tagged accessibility PDFs. The proof's automated bounds checks complement visual review; they do not prove the absence of every possible overlap.
- Styling uses the fixed Applicable visual identity, with no claim of exact reproduction for every possible input. The interactive proof uses synthetic fixture objects; use the application to exercise pasted-text parsing, validation and contact fields.

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
