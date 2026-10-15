# Development foundation

## Structure

- `app/index.html`, `app/main.js`, `app/styles.css`: native HTML, JavaScript entry point and CSS. This is a development shell until the input/interface issues land.
- `app/resume/parse.js`: pure canonical-format parser and structural validation; returns a complete resume or human-language errors.
- `examples/`: synthetic canonical resume and reusable chatbot instruction.
- `assets/fonts/`: bundled Poppins fonts and their OFL license, retained from the rendering investigation.
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

`npm run check` runs lint, parser/validation and existing PDF preservation/layout tests, production build, then two browser tests. One browser test exercises short/typical/long synthetic PDF generation and actual downloads; the other loads the production build, confirms JavaScript/CSS resolve without execution or network errors, and rejects remote HTTP/WebSocket requests. Browser tests own and clean up the two temporary servers. The parser tests cover required content, ordering, wording, multiline bullets and blocking malformed input. The application shell has no input behavior to unit-test yet; avoid assertions that merely repeat its wording.

The built shell is the application artifact; the separate developer proof is intentionally not bundled into `dist/`. Fonts and the PDF renderer will enter that artifact when A4 connects the production template. Production packaging and clean-download checks remain A6 work. A build is not a release or deployment.

No PDF layout was intentionally changed in A2, so its reviewed synthetic baseline remains unchanged. The A1 visual checklist continues to apply to later PDF changes. A4 must add an explicit fixture with one job split across pages, alongside oversized token/bullet and unsupported-character handling before claiming production edge-case coverage.

Local checks do not establish that GitHub Actions has passed. The first remote workflow run must finish successfully on the PR's latest commit before merge.
