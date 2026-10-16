# Maintenance guide

Start with the assigned [GitHub issue](https://github.com/Ewager1/applicable/issues) and the relevant edit points below. Consult the [input contract](input-format.md) or [specification](project-spec.md) only for the behavior being changed. [The project board](https://github.com/users/Ewager1/projects/6) carries current work status. The [development plan](project-plan.md) records scope and sequence; dated verification records describe their tested commits, not a fresh check of the current checkout.

## Find the right edit point

| Change | Files and responsibility |
| --- | --- |
| Accepted text, validation and source lines | [parse.ts](../app/resume/parse.ts), [input format](input-format.md), [synthetic example](../examples/resume.txt), [chatbot instruction](../examples/chatbot-instruction.md) |
| Shared data/result/error shape | [types.ts](../app/resume/types.ts): canonical TypeScript `Resume`, nested entries, discriminated `ParseResult` and `ValidationError`; type-only exports |
| Input help and copied chatbot instructions | [ChatbotInstructions.tsx](../app/ui/ChatbotInstructions.tsx): visible steps and clipboard/manual fallback; imports [chatbot-instruction.md](../examples/chatbot-instruction.md) as raw text, so edit that single file for the copied instructions and keep it aligned with the [input contract](input-format.md) |
| Website wording and structure | [App.tsx](../app/ui/App.tsx), [ChatbotInstructions.tsx](../app/ui/ChatbotInstructions.tsx), [ResumeForm.tsx](../app/ui/ResumeForm.tsx), [Feedback.tsx](../app/ui/Feedback.tsx), [PdfResult.tsx](../app/ui/PdfResult.tsx): semantic page structure, chatbot steps, copy fallback, form, accessible feedback and result |
| Website appearance | [styles.css](../app/styles.css): variables/base, page, form, help/errors, result, responsive rules |
| Portable PDF filename | [download-filename.ts](../app/download-filename.ts): parsed professional title plus optional company, sanitized/bounded only for filenames; never modify the resume model |
| Submission, recovery, download and preview | [useResumePdf.ts](../app/ui/useResumePdf.ts): typed generation states, resume/company revision guards, lazy local loads, recovery and Blob URL ownership; `PdfResult.tsx` delivers once after commit |
| PDF typography, palette, dimensions and entry rows | [document.ts](../app/pdf/document.ts): fixed semantic styles and section order; [current template details](pdf-template.md) |
| Header/content relationships | [pagination.ts](../app/pdf/pagination.ts) and explicit `keepWith` calls in `document.ts`; layout relationships target actual nodes, including intermediate content |
| Oversized heading groups | [header-fit.ts](../app/pdf/header-fit.ts): same-engine, fresh-page measurement of those explicit keep-groups |
| PDF bytes and engine failures | [render.ts](../app/pdf/render.ts): fit check, synchronous local stream, recoverable errors |
| Local fonts and glyph support | [fonts.ts](../app/pdf/fonts.ts), [font-coverage.ts](../app/pdf/font-coverage.ts), [coverage generator](../scripts/font-coverage.mjs), [font source/license](../assets/fonts/SOURCE.md) |
| Local development agent/model metrics | [usage CLI](../scripts/agent-usage.mjs), [measurement guide](agent-usage.md); ignored `output/agent-usage/` reports, synthetic [tests](../tests/agent-usage.test.mjs) |
| Build, browsers and CI | [package.json](../package.json), [Vite config](../vite.config.js), [browser runner](../tests/run-browser.mjs), [browser selection](../tests/browser-options.mjs), [CI workflow](../.github/workflows/checks.yml) |

The app has a strict TypeScript parser/PDF core and React/TypeScript interface retaining the HTML/CSS, built with Vite, local pdfmake and bundled Source Sans 3. No backend, account, resume storage or application analytics is involved.

`app/main.tsx` mounts the interface; `app/index.html` is only the HTML shell. `examples/` owns canonical text examples, `proof/` owns synthetic PDF/layout fixtures and frozen visual baselines, and `tests/` owns parser/filename/application/lifecycle checks. Keep developer-only proof, tests and agent-usage tools out of the production bundle. See [development boundaries](development.md#typescriptjavascript-boundary) for Node type stripping and the proof server's allowlisted TypeScript routes.

## Data flow and invariants

1. `useResumePdf.ts` takes the exact textarea source and calls the pure parser. A failed result contains ordered, human-readable errors and original one-based lines where available; a successful result contains the complete `Resume`, never partial data.
2. The model stores supplied job/bullet/category order and wording. Skills `items` remains a comma-separated string. PDF generation fixes only section order; it does not sort, rewrite or deduplicate content.
3. Local fonts and the PDF engine load after validation. The renderer checks glyphs and measures heading keep-groups, then produces one byte buffer. Preview and download use the same Blob URL; native viewing has a download fallback.
4. Every asynchronous boundary checks the captured source/company revision and active lifecycle. Editing invalidates old output, stale pending work cannot download, failures preserve input, and repeated submissions do not queue exports. Unmount cancels delivery and revokes URLs; React StrictMode replays cleanup safely. Preserve these guards when editing the hook.

## Choose verification by the change

Use Node **22.13 or newer in 22.x, or 24 or newer**, with npm (`^22.13.0 || >=24.0.0` in `package.json`; `.nvmrc` selects 22). Node 20 and 23 are unsupported. Commands below run from the repository root; installation/startup and browser setup are in the [README](../README.md). Chrome is the default developer browser, or select pinned Chromium as documented there.

| Area | Focused check |
| --- | --- |
| Agent usage aggregation/privacy and baseline lifecycle | `node --test tests/agent-usage.test.mjs` |
| Download filename sanitization | `node --experimental-strip-types --test tests/download-filename.test.mjs` |
| Parser/input contract | `node --experimental-strip-types --test tests/parser.test.mjs` |
| PDF rendering, fonts, pagination or fit guard | `node --experimental-strip-types --test proof/render.test.mjs tests/production-pdf.test.mjs` |
| Development dependency loading | `node --test tests/dev.browser.test.mjs` (owns an ephemeral server and isolated cache) |
| Website, download/preview, errors or async state | `npm run build`, then `npm run test:browser` |
| Strict core and React interface contracts | `npm run typecheck` |
| Static JavaScript/TypeScript checks | `npm run lint` |
| Full code-change gate | `npm run check` |
| Documentation-only changes | Review content, relative links, commands and `git diff --check`; do not manufacture runtime tests |

`npm run test:browser` owns proof/preview servers on ports 4173/4174 plus isolated cold-cache development and React StrictMode lifecycle checks. Leave those ports free and do not launch duplicate test servers. Local success does not establish remote CI success: review and latest-commit CI remain merge gates under [AGENTS.md](../AGENTS.md).

Run focused commands while developing; `npm run check` already includes typecheck, lint, unit/PDF tests, build and browser tests. The [engineering rules](../AGENTS.md#verification) define ownership and when to repeat checks. Manual PDF inspection applies when output could change; it is not required for developer tooling or documentation.

## Fonts, samples and visual baselines

For an intentional font change, retain its authoritative version/source and license, update the static URL descriptors and distinct real weight mappings, then run:

```sh
npm run fonts:coverage
npm run proof:generate
npm run check
```

The generated coverage is the intersection of the actual bundled font glyphs with SHA-256 hashes, not a manually edited character list. Preserve the fail-with-correction behavior for unsupported displayed glyphs; hidden URL destinations are not font coverage checks. Tests verify real embedded font identities/weights as well as text, links and bounds.

`proof:generate` writes seven synthetic PDFs to ignored `output/pdf/`. Render the changed pages with Poppler (`pdftoppm -r 100 -png <pdf> <output-prefix>`) and inspect the [layout checklist](../proof/README.md). Compare page counts, extracted text/order/links, actual coordinates/fonts/colors and page images rather than metadata-sensitive PDF byte hashes. Inspect header/bullet transitions, dividers and wrapped metadata at normal PDF scale.

Keep [the frozen pre-refresh fixture/PDF](../proof/baseline/pre-refresh/README.md) unchanged. [The current typical baseline](../proof/baseline/typical.pdf) changes only for an intentional, reviewed visual change after inspecting every affected page. A refactor with equivalent output needs no baseline refresh. Never replace a baseline merely to make a check pass, and never use personal resumes in fixtures or artifacts.

## Isolation and limits

Before dependency installation, cache removal, server restart or reload, copy any unsaved draft somewhere safe and stop only Applicable's own process. Input exists only in the current browser page; HMR may also reset it. Do not run `npm ci` or clear `node_modules/.vite` under a live server. Verify clean installation in a separate source directory, and give temporary development tests their own cache/server with cleanup. [Cache recovery](development.md) explains the stale-dependency 504 and forced restart.

The narrow [pdfmake adapter](../app/pdf/pdfmake-adapter.ts) owns runtime validation of the pinned engine's private page/position metadata. C5's fit guard performs one additional layout pass over independently cloned keep-groups using pdfmake **0.2.20 internal `_pdfMakePages` and `positions` metadata**. It requires a target's first line to fit with its heading/preceding details on a fresh page; later bullet lines may continue. Missing measurement metadata blocks export. The pass can repeat shared headers and measure a long first bullet in full, so very large input has extra CPU/memory cost. Engine upgrades require rechecking compatibility, large passing/failing boundaries, font errors, browser recovery and ordinary-layout equivalence. See [the guard's design and limits](pdf-template.md).

Font coverage is finite, PDFs are selectable/searchable but not tagged accessibility PDFs, and native preview depends on browser settings. No universal layout guarantee is made for arbitrary documents. A failed fit check returns a warning and no partial artifact; do not truncate, shrink, rewrite or add a parser character cap to bypass it.

## React interface lifecycle

`main.tsx` mounts function components under React `StrictMode`. Source/company values use local state; the generation hook owns the synchronous busy guard, revision checks, successful-font cache and current object URL. Keep PDF/parsing/filename modules framework independent. Successful delivery uses the committed result link once per artifact, and manual downloads reuse that URL. Replacing output, editing, page departure and unmount release the old URL. Lifecycle tests mount/unmount the actual app through a test-only Vite entry; production code exposes no test globals.

Font errors can be retried on the same page. A failed PDF-engine module import can remain cached by the browser for that page: copy the draft somewhere safe, fix the local asset/server problem, reload Applicable and paste the draft again. The warning explains that recovery; repeated same-page engine imports are not claimed to recover. No resume persistence is added.
