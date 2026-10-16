# Development foundation

For routine changes, start with [the maintenance guide](maintenance.md). This document records tooling choices, verification boundaries and cache recovery; current work status is in GitHub.

## Structure

- `app/index.html`, `app/main.tsx`, `app/styles.css`: HTML shell, React StrictMode entry and existing CSS. `app/ui/` contains typed function components for chatbot instructions, resume/company form, accessible feedback and PDF result, plus the focused `useResumePdf.ts` resource/async hook.
- `app/resume/parse.ts`: pure canonical-format parser and structural validation; returns a complete resume or human-language errors. `types.ts` supplies the single canonical TypeScript contracts.
- `examples/`: synthetic canonical resume and reusable chatbot instruction.
- `app/pdf/`: shared production document definition, supported-font coverage, browser font loader and byte-generation adapter.
- `assets/fonts/`: bundled Source Sans 3 static Regular/Semibold/Bold fonts, source record and OFL license.
- `proof/`: synthetic PDF renderer, fixtures, baseline and PDF/browser verification. Direct synthetic fixtures and parsed canonical fixtures use the shared Resume shape.
- `tests/`: browser launch options, temporary-server ownership, actual development/production exports and recovery tests.
- `vite.config.js`: application root, relative built asset paths, loopback-only servers and `dist/` output.
- `eslint.config.js`: recommended JavaScript checks, a TypeScript parser and explicit Node/browser globals.
- `.github/workflows/checks.yml`: pull request and main-branch checks.

Parser, rendering and interface modules should remain small and separate. Do not create an abstraction framework or empty module placeholders before their issue needs them. The core is strict TypeScript and independent of React. The interface uses React with local state; no backend, database, API keys or runtime remote assets are introduced.

## Tool choices

All direct dependencies are exact versions, with transitive integrity hashes in `package-lock.json`.

| Tool | Role | License |
| --- | --- | --- |
| Vite 8.3.4 | Local development, static production build and local build preview | MIT, `node_modules/vite/LICENSE.md` |
| ESLint 10.12.0 / @eslint/js 10.0.1 | Recommended JavaScript static checks | MIT, each installed package's `LICENSE` |
| React / React DOM 19.3.1 | Function components and DOM mounting; local state, no router/store/UI framework | MIT, retained under `licenses/` |
| Node's built-in test runner | PDF and browser test execution | Included with Node; no separate test-runner dependency |

TypeScript is a development dependency used for strict no-emit checking; `@types/react` and `@types/react-dom` describe the interface runtime; `@types/pdfmake` 0.2 and `@types/node` 22 describe the pinned engine and supported Node baseline. `@typescript-eslint/parser` lets existing ESLint rules parse TypeScript; compiler checks own names and unused declarations. Exact installed versions remain in `package.json` and the lockfile. These additions use the Apache-2.0 (TypeScript), MIT (DefinitelyTyped) and BSD-2-Clause (parser) licenses.

F1 verification on 2026-10-15: the full `npm run check` passed on isolated Node **22.13.0** (93 unit/PDF/usage tests and 15 browser tests, pinned Chromium on macOS). Node **24.19.0** also passed focused typecheck/lint, parser/filename/production-PDF tests and build. All seven regenerated synthetic fixtures retained identical text/layout/link structures and identical Poppler page images across 14 pages; short/typical/long pages were visually inspected. Frozen PDF baselines were unchanged. The minimum-version run emits Node's expected experimental type-stripping warning. This is local evidence; latest-commit CI remains a separate gate.

F2 verification on 2026-10-15: `npm run check` passed on Node **24.19.0** (93 unit/PDF/usage tests and 17 browser tests, pinned Chromium on macOS). Wide/narrow empty and filled states plus clipboard fallback screenshots were byte-identical to the frozen pre-React captures. The actual browser-downloaded synthetic PDF rendered to an identical Poppler page image against the pre-React parsed fixture, and was visually inspected. The additional browser cases cover lazy asset loading/engine failure with reload recovery and StrictMode unmount/remount cancellation, single delivery and URL cleanup. This records local evidence; latest-commit CI remains a separate gate.

### TypeScript/JavaScript boundary

`tsconfig.json` checks `app/**/*.ts` and `app/**/*.tsx`, using the automatic React JSX transform and Vite asset types, with `strict`, unused checks, DOM/library boundaries, and erasable syntax. Shared contracts are imported with `import type`; runtime inputs/errors use `unknown` and narrowing. `app/main.tsx` mounts typed components through Vite. React runtime/types are the only interface additions; Vite handles TSX without a React plugin. Existing JavaScript fixtures, scripts and test runners remain outside compiler checking; browser tests exercise their integration with the typed core.

Node commands importing the core use `--experimental-strip-types`, available from supported Node 22.13 and in Node 24+. Pass it when invoking a focused test directly (for example `node --experimental-strip-types --test tests/parser.test.mjs`). Only erasable TypeScript is allowed: no enums, namespaces, parameter properties or runtime path aliases. Explicit `.ts` imports work in Node and Vite without emitted files or a separate test build. The browser runner forwards the flag to its proof server/test children. The proof server transpiles only its explicit allowlisted `.ts` routes in memory with TypeScript's `transpileModule`; it serves JavaScript MIME types, adds no filesystem route, and writes no build output. Vite handles application development/production transformation.

Public document, style, font and callback types come from pdfmake's 0.2 declarations. The narrow `pdfmake-adapter.ts` alone reads `_pdfMakePages` and `positions` as unknown and validates them before the header-fit guard uses them. Synchronous stream APIs remain essential for recoverable font/layout failures. Layout clones retain public types; no second Resume model, React import, broad `any` or suppression is required.

The previously selected pdfmake, PDF.js and Playwright remain unchanged. Vite and ESLint are development-only. See [rendering dependency/license details](../proof/README.md) for the PDF dependencies and fonts. The supported Node range is `^22.13.0 || >=24.0.0`, matching the intersection of the selected tools' requirements; `.nvmrc` and CI use Node 22. CI downloads the Chromium revision specified by the pinned Playwright package.

[Official Vite setup](https://vite.dev/guide/), [ESLint configuration](https://eslint.org/docs/latest/use/configure/configuration-files), and [Playwright CI installation](https://playwright.dev/docs/ci-intro) describe these tools. We use their basic workflows without framework plugins or a separate test framework.

## Verification boundaries

`npm run check` runs strict typecheck, lint, parser/validation and existing PDF preservation/layout tests, production build, then the browser checks. The retained proof exercises short/typical/long PDFs and actual downloads. Built-application tests cover missing-section warnings, correction and keyboard submission, complete downloaded PDF content/order/links, exact preview bytes, repeat downloads, native-viewer fallback, glyph/font failure recovery, pending-font edit races, duplicate submit guards, stale URL cleanup and responsive layout. Every browser case rejects remote HTTP/WebSocket requests and uncaught page errors. Browser tests own and clean up the proof/preview servers plus a development server on an ephemeral loopback port. The development check starts with a unique empty temporary Vite cache, exports the synthetic resume on its first submission, checks downloaded PDF text and bytes, and rejects failed or remote requests. It closes its server before removing only that temporary cache; it never clears the running app’s `node_modules/.vite` cache. The parser tests cover required content, ordering, wording, multiline bullets and blocking malformed input. Browser checks verify user-visible behavior rather than repeating the interface wording.

The production build is the application artifact; the separate developer proof is intentionally not bundled into `dist/`. The application imports the shared production PDF adapter and Vite bundles all three fonts locally. The larger pdfmake module is lazy-loaded only after valid submission; the initial application JavaScript stays small. Its approximately 1.3 MB minified PDF engine chunk produces the expected Vite size advisory; this is the already selected engine, not an additional dependency. A6 verifies clean-source installation/startup and source distribution; see [verification evidence](verification.md). No native packaging or release publication is included. A build is not a release or deployment.

Historically, A2 did not change the PDF layout. The current reviewed baseline includes the intentional B1/B2 font and style refresh. The A1 visual checklist continues to apply to later PDF changes. A4 adds explicit split-job, multi-page-bullet, long metadata/token and unsupported-character cases; see [production PDF verification](pdf-template.md).

Local checks do not establish that GitHub Actions has passed. The remote workflow must finish successfully on the PR's latest commit before merge.

## Interface state and recovery

`app/ui/useResumePdf.ts` owns a single pending submission using an explicit idle/generating/error/ready union and synchronous refs for revision, busy slot and current object URL. Every input event advances a revision, clears warnings and removes/revokes any generated Blob URL. A submission captures the current source/company revision; after each asynchronous boundary it checks the revision and mounted lifecycle before creating an artifact. Editing while fonts or generation are pending therefore cannot deliver an old resume. The form exposes busy state, disables duplicate submissions, and restores the button in `finally`.

Fonts load lazily and only successful data is cached. Missing/corrupt font errors discard that cache, so the same source can be retried without a page reload. User source is never replaced or stored. Errors use text content, a focusable alert summary and the original line numbers. A live status region announces progress; Cmd/Ctrl + Enter is available in the labeled input.

A successful export creates one byte Blob and one object URL. Native PDF viewing is gated by `navigator.pdfViewerEnabled`; browsers without it get the normal download/link and an explanatory message, without assigning an iframe source that might cause an extra automatic download. With native viewing available the iframe and download use exactly the same URL. Editing, replacement, failure, page departure and component unmount remove the old artifact and release its URL. The result component triggers automatic delivery after committing its link, once per artifact even under development effect replay, then focuses the result heading.

CI uses Playwright’s `chromium` channel (full/new headless mode), rather than its older headless shell, to exercise the native PDF viewer. A capability-disabled application test separately verifies exactly one automatic download and a usable repeat-download link. Desktop/mobile UI screenshots are written under ignored `output/ui/`; an actual browser-downloaded synthetic resume is retained under ignored `output/pdf/application-resume.pdf` for visual QA. A5 did not change the PDF layout; the current baseline and later changes are documented in the template notes.

## Development dependency-cache recovery

Issue [#15](https://github.com/Ewager1/applicable/issues/15) exposed a development-only `504 Outdated Optimize Dep`: the running server referenced a versioned optimized pdfmake file that was absent from its cache. Vite keeps optimizer metadata in memory; its pinned implementation returns this 504 when a versioned optimized file cannot be read or its hash is outdated. Replacing `node_modules` (for example with `npm ci`) while that process remains alive can create this mismatch. The exact earlier deletion was not recorded, so that trigger remains a likely cause rather than a proven historical event.

First copy any unsaved resume somewhere safe. Stop only Applicable’s own process, restart with `npm run dev -- --force`, then reload and restore the draft. The coordinator verified this recovery on the affected local app. Stop the server before dependency installation or cache removal; clean-install verification belongs in a separate source directory. Tests must use their own cache and close their owned server before cleaning it up.

A failed engine module import may be cached for the page by the browser. The UI preserves the draft and asks the user to copy it somewhere safe, reload and paste it back after resolving the local asset problem; same-page font retries remain supported. The engine-failure browser test verifies that complete recovery. React lifecycle tests additionally cancel an unmounted pending submission, remount under StrictMode, check single delivery and verify replacement/unmount URL revocation.

The normal literal dynamic import is left intact: the cold-cache browser check verifies Vite discovers and serves pdfmake without explicit `optimizeDeps.include`. Pre-including it would not repair an already-running server whose optimized files were removed. No dependency, bundling or PDF-layout change is required.
