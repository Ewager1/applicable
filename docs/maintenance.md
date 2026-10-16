# Maintenance guide

Start with the [input contract](input-format.md), [project specification](project-spec.md) and the assigned [GitHub issue](https://github.com/Ewager1/applicable/issues). [The project board](https://github.com/users/Ewager1/projects/6) carries current work status. The [development plan](project-plan.md) records scope and sequence; dated verification records describe their tested commits, not a fresh check of the current checkout.

## Find the right edit point

| Change | Files and responsibility |
| --- | --- |
| Accepted text, validation and source lines | [parse.js](../app/resume/parse.js), [input format](input-format.md), [synthetic example](../examples/resume.txt), [chatbot instruction](../examples/chatbot-instruction.md) |
| Shared data/result/error shape | [types.js](../app/resume/types.js): editor-visible JSDoc `Resume`, nested entries, `ParseResult` and `ValidationError`; no runtime imports or build-time type checker |
| Website wording and structure | [index.html](../app/index.html): visible chatbot steps before the paste form; the chatbot instruction is imported into the copy control, with a labeled/focused fallback when clipboard access fails |
| Website appearance | [styles.css](../app/styles.css): variables/base, page, form, help/errors, result, responsive rules |
| Portable PDF filename | [download-filename.js](../app/download-filename.js): parsed professional title plus optional company, sanitized/bounded only for filenames; never modify the resume model |
| Submission, recovery, download and preview | [main.js](../app/main.js): resume/company revision guards, busy state, warnings and Blob URL lifecycle |
| PDF typography, palette, dimensions and entry rows | [document.js](../app/pdf/document.js): fixed semantic styles and section order; [current template details](pdf-template.md) |
| Header/content relationships | [pagination.js](../app/pdf/pagination.js) and explicit `keepWith` calls in `document.js`; keep links target actual nodes, including intermediate content |
| Oversized heading groups | [header-fit.js](../app/pdf/header-fit.js): same-engine, fresh-page measurement of those explicit keep-groups |
| PDF bytes and engine failures | [render.js](../app/pdf/render.js): fit check, synchronous local stream, recoverable errors |
| Local fonts and glyph support | [fonts.js](../app/pdf/fonts.js), [font-coverage.js](../app/pdf/font-coverage.js), [coverage generator](../scripts/font-coverage.mjs), [font source/license](../assets/fonts/SOURCE.md) |
| Local development agent/model metrics | [usage CLI](../scripts/agent-usage.mjs), [measurement guide](agent-usage.md); ignored `output/agent-usage/` reports, synthetic [tests](../tests/agent-usage.test.mjs) |
| Build, browsers and CI | [package.json](../package.json), [Vite config](../vite.config.js), [browser runner](../tests/run-browser.mjs), [browser selection](../tests/browser-options.mjs), [CI workflow](../.github/workflows/checks.yml) |

The app is native JavaScript/HTML/CSS with Vite, local pdfmake and bundled Source Sans 3. No backend, account, resume storage or application analytics is involved.

## Data flow and invariants

1. `main.js` takes the exact textarea source and calls the pure parser. A failed result contains ordered, human-readable errors and original one-based lines where available; a successful result contains the complete `Resume`, never partial data.
2. The model stores supplied job/bullet/category order and wording. Skills `items` remains a comma-separated string. PDF generation fixes only section order; it does not sort, rewrite or deduplicate content.
3. Local fonts and the PDF engine load after validation. The renderer checks glyphs and measures heading keep-groups, then produces one byte buffer. Preview and download use the same Blob URL; native viewing has a download fallback.
4. Every asynchronous boundary checks the captured source revision. Editing invalidates old output, stale pending work cannot download, failures preserve input, and repeated submissions do not queue exports. Preserve these guards when editing the coordinator.

## Choose verification by the change

Use the supported Node/npm version and browser setup in the [README](../README.md). Commands below run from the repository root; Chrome is the default developer browser, or select the pinned Chromium as documented there.

| Area | Focused check |
| --- | --- |
| Agent usage aggregation/privacy and baseline lifecycle | `node --test tests/agent-usage.test.mjs` |
| Download filename sanitization | `node --test tests/download-filename.test.mjs` |
| Parser/input contract | `node --test tests/parser.test.mjs` |
| PDF rendering, fonts, pagination or fit guard | `node --test proof/render.test.mjs tests/production-pdf.test.mjs` |
| Development dependency loading | `node --test tests/dev.browser.test.mjs` (owns an ephemeral server and isolated cache) |
| Website, download/preview, errors or async state | `npm run build`, then `npm run test:browser` |
| Static JavaScript checks | `npm run lint` |
| Full code-change gate | `npm run check` |
| Documentation-only changes | Review content, relative links, commands and `git diff --check`; do not manufacture runtime tests |

`npm run test:browser` owns proof/preview servers on ports 4173/4174 plus the isolated development check. Leave those ports free and do not launch duplicate test servers. Local success does not establish remote CI success: review and latest-commit CI remain merge gates under [AGENTS.md](../AGENTS.md).

## Fonts, samples and visual baselines

For an intentional font change, retain its authoritative version/source and license, update the static URL descriptors and distinct real weight mappings, then run:

```sh
npm run fonts:coverage
npm test
npm run proof:generate
npm run check
```

The generated coverage is the intersection of the actual bundled font glyphs with SHA-256 hashes, not a manually edited character list. Preserve the fail-with-correction behavior for unsupported displayed glyphs; hidden URL destinations are not font coverage checks. Tests verify real embedded font identities/weights as well as text, links and bounds.

`proof:generate` writes seven synthetic PDFs to ignored `output/pdf/`. Render the changed pages with Poppler (`pdftoppm -r 100 -png <pdf> <output-prefix>`) and inspect the [layout checklist](../proof/README.md). Compare page counts, extracted text/order/links, actual coordinates/fonts/colors and page images rather than metadata-sensitive PDF byte hashes. Inspect header/bullet transitions, dividers and wrapped metadata at normal PDF scale.

Keep [the frozen pre-refresh fixture/PDF](../proof/baseline/pre-refresh/README.md) unchanged. [The current typical baseline](../proof/baseline/typical.pdf) changes only for an intentional, reviewed visual change after inspecting every affected page. A refactor with equivalent output needs no baseline refresh. Never replace a baseline merely to make a check pass, and never use personal resumes in fixtures or artifacts.

## Isolation and limits

Before dependency installation, cache removal, server restart or reload, copy any unsaved draft somewhere safe and stop only Applicable's own process. Input exists only in the current browser page; HMR may also reset it. Do not run `npm ci` or clear `node_modules/.vite` under a live server. Verify clean installation in a separate source directory, and give temporary development tests their own cache/server with cleanup. [Cache recovery](development.md) explains the stale-dependency 504 and forced restart.

C5's fit guard performs one additional layout pass over independently cloned keep-groups using pdfmake **0.2.20 internal `_pdfMakePages` and `positions` metadata**. It requires a target's first line to fit with its heading/preceding details on a fresh page; later bullet lines may continue. Missing measurement metadata blocks export. The pass can repeat shared headers and measure a long first bullet in full, so very large input has extra CPU/memory cost. Engine upgrades require rechecking compatibility, large passing/failing boundaries, font errors, browser recovery and ordinary-layout equivalence. See [the guard's design and limits](pdf-template.md).

Font coverage is finite, PDFs are selectable/searchable but not tagged accessibility PDFs, and native preview depends on browser settings. No universal layout guarantee is made for arbitrary documents. A failed fit check returns a warning and no partial artifact; do not truncate, shrink, rewrite or add a parser character cap to bypass it.
