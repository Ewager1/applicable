# Development foundation

## Structure

- `app/index.html`, `app/main.js`, `app/styles.css`: native HTML, JavaScript entry point and CSS. The paste form, local generation coordinator, copyable format help and same-file PDF preview/download live here.
- `app/resume/parse.js`: pure canonical-format parser and structural validation; returns a complete resume or human-language errors.
- `examples/`: synthetic canonical resume and reusable chatbot instruction.
- `app/pdf/`: shared production document definition, supported-font coverage, browser font loader and byte-generation adapter.
- `assets/fonts/`: bundled Source Sans 3 static Regular/Semibold/Bold fonts, source record and OFL license.
- `proof/`: synthetic PDF renderer, fixtures, baseline and PDF/browser verification. Its data model is not yet the text input contract.
- `tests/`: browser launch options, temporary-server ownership and a built-artifact smoke test.
- `vite.config.js`: application root, relative built asset paths, loopback-only servers and `dist/` output.
- `eslint.config.js`: standard recommended JavaScript checks and explicit Node/browser globals.
- `.github/workflows/checks.yml`: pull request and main-branch checks.

Parser, rendering and interface modules should remain small and separate. Do not create an abstraction framework or empty module placeholders before their issue needs them. No backend, framework, TypeScript, database, API keys or runtime remote assets are introduced by this setup.

## Tool choices

All direct dependencies are exact versions, with transitive integrity hashes in `package-lock.json`.

| Tool | Role | License |
| --- | --- | --- |
| Vite 8.3.4 | Local development, static production build and local build preview | MIT, `node_modules/vite/LICENSE.md` |
| ESLint 10.12.0 / @eslint/js 10.0.1 | Recommended JavaScript static checks | MIT, each installed package's `LICENSE` |
| Node's built-in test runner | PDF and browser test execution | Included with Node; no separate test-runner dependency |

The previously selected pdfmake, PDF.js and Playwright remain unchanged. Vite and ESLint are development-only. See [rendering dependency/license details](../proof/README.md) for the PDF dependencies and fonts. The supported Node range is `^22.13.0 || >=24.0.0`, matching the intersection of the selected tools' requirements; `.nvmrc` and CI use Node 22. CI downloads the Chromium revision specified by the pinned Playwright package.

[Official Vite setup](https://vite.dev/guide/), [ESLint configuration](https://eslint.org/docs/latest/use/configure/configuration-files), and [Playwright CI installation](https://playwright.dev/docs/ci-intro) describe these tools. We use their basic workflows without framework plugins or a separate test framework.

## Verification boundaries

`npm run check` runs lint, parser/validation and existing PDF preservation/layout tests, production build, then the browser checks. The retained proof exercises short/typical/long PDFs and actual downloads. Built-application tests cover missing-section warnings, correction and keyboard submission, complete downloaded PDF content/order/links, exact preview bytes, repeat downloads, native-viewer fallback, glyph/font failure recovery, pending-font edit races, duplicate submit guards, stale URL cleanup and responsive layout. Every browser case rejects remote HTTP/WebSocket requests and uncaught page errors. Browser tests own and clean up the proof/preview servers plus a development server on an ephemeral loopback port. The development check starts with a unique empty temporary Vite cache, exports the synthetic resume on its first submission, checks downloaded PDF text and bytes, and rejects failed or remote requests. It closes its server before removing only that temporary cache; it never clears the running app’s `node_modules/.vite` cache. The parser tests cover required content, ordering, wording, multiline bullets and blocking malformed input. Browser checks verify user-visible behavior rather than repeating the interface wording.

The production build is the application artifact; the separate developer proof is intentionally not bundled into `dist/`. The application imports the shared production PDF adapter and Vite bundles all three fonts locally. The larger pdfmake module is lazy-loaded only after valid submission; the initial application JavaScript stays small. Its approximately 1.3 MB minified PDF engine chunk produces the expected Vite size advisory; this is the already selected engine, not an additional dependency. A6 verifies clean-source installation/startup and source distribution; see [verification evidence](verification.md). No native packaging or release publication is included. A build is not a release or deployment.

No PDF layout was intentionally changed in A2, so its reviewed synthetic baseline remains unchanged. The A1 visual checklist continues to apply to later PDF changes. A4 adds explicit split-job, multi-page-bullet, long metadata/token and unsupported-character cases; see [production PDF verification](pdf-template.md).

Local checks do not establish that GitHub Actions has passed. The first remote workflow run must finish successfully on the PR's latest commit before merge.

## Interface state and recovery

`app/main.js` owns a single pending submission. Every input event advances a revision, clears warnings and removes/revokes any generated Blob URL. A submission captures the current source and revision; after each asynchronous boundary it checks both before creating an artifact or downloading. Editing while fonts or generation are pending therefore cannot deliver an old resume. The form exposes busy state, disables duplicate submissions, and restores the button in `finally`.

Fonts load lazily and only successful data is cached. Missing/corrupt font errors discard that cache, so the same source can be retried without a page reload. User source is never replaced or stored. Errors use text content, a focusable alert summary and the original line numbers. A live status region announces progress; Cmd/Ctrl + Enter is available in the labeled input.

A successful export creates one byte Blob and one object URL. Native PDF viewing is gated by `navigator.pdfViewerEnabled`; browsers without it get the normal download/link and an explanatory message, without assigning an iframe source that might cause an extra automatic download. With native viewing available the iframe and download use exactly the same URL. Editing, failure and page departure remove the old artifact and release its URL.

CI uses Playwright’s `chromium` channel (full/new headless mode), rather than its older headless shell, to exercise the native PDF viewer. A capability-disabled application test separately verifies exactly one automatic download and a usable repeat-download link. Desktop/mobile UI screenshots are written under ignored `output/ui/`; an actual browser-downloaded synthetic resume is retained under ignored `output/pdf/application-resume.pdf` for visual QA. The PDF template baseline is unchanged by A5.

## Development dependency-cache recovery

Issue [#15](https://github.com/Ewager1/applicable/issues/15) exposed a development-only `504 Outdated Optimize Dep`: the running server referenced a versioned optimized pdfmake file that was absent from its cache. Vite keeps optimizer metadata in memory; its pinned implementation returns this 504 when a versioned optimized file cannot be read or its hash is outdated. Replacing `node_modules` (for example with `npm ci`) while that process remains alive can create this mismatch. The exact earlier deletion was not recorded, so that trigger remains a likely cause rather than a proven historical event.

First copy any unsaved resume somewhere safe. Stop only Applicable’s own process, restart with `npm run dev -- --force`, then reload and restore the draft. The coordinator verified this recovery on the affected local app. Stop the server before dependency installation or cache removal; clean-install verification belongs in a separate source directory. Tests must use their own cache and close their owned server before cleaning it up.

The normal literal dynamic import is left intact: the cold-cache browser check verifies Vite discovers and serves pdfmake without explicit `optimizeDeps.include`. Pre-including it would not repair an already-running server whose optimized files were removed. No dependency, bundling or PDF-layout change is required.
