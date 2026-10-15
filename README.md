# Applicable

A lightweight local tool for turning a pasted resume into a professionally formatted PDF.

Paste a complete resume, submit it, and download a PDF using one consistent template. Section order is fixed, while jobs appear in the order supplied in the source text. All wording comes from the pasted resume.

## Project status

The complete paste-to-PDF flow is implemented: validation, local generation, an automatic `resume.pdf` download and an exact preview where native PDF viewing is supported. The interface preserves your source text through errors and requires no template settings. Final clean-download/distribution verification is the remaining project phase; no release has been published.

## Local development

Install **Node.js 22.13 or newer in the 22.x series, or Node.js 24 or newer**, with npm. `.nvmrc` selects Node 22 if you use nvm. These requirements follow the pinned build and lint tools; Node 20 and 23 are outside this project's supported versions.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173/. Stop the server with Ctrl+C. It binds to your own machine only. A busy port produces an error instead of silently choosing another address.

To view the working synthetic PDF investigation separately:

```sh
npm run proof:serve
```

Open http://127.0.0.1:4173/. See [proof setup, verification, fonts and rendering decisions](proof/README.md). No personal resume input is implemented in this proof.

## Verification and build

| Command | Purpose |
| --- | --- |
| `npm run lint` | ESLint's recommended JavaScript checks plus strict equality and no `eval` |
| `npm test` | Resume parsing/validation plus selectable PDF text, fonts, links, bounds and pagination |
| `npm run build` | Bundle the application into `dist/` |
| `npm run preview` | Serve the built application at http://127.0.0.1:4174/; stop with Ctrl+C |
| `npm run test:browser` | Own temporary servers; verify paste, warnings, correction, real downloads, preview and recovery |
| `npm run check` | Lint, PDF tests, build, then browser tests |
| `npm run proof:generate` | Generate synthetic PDFs in ignored `output/pdf/` |

Browser checks use installed desktop Chrome by default. Run `npm run build` before running the browser command on its own, and leave ports 4173 and 4174 free. The browser command starts and stops its own servers; do not also run `proof:serve` or `preview` while testing.

For a downloaded, version-matched Chromium instead of installed Chrome:

```sh
npx --no-install playwright install chromium
PLAYWRIGHT_BROWSER=chromium npm run check
```

The environment-variable form above works in macOS/Linux shells. In PowerShell, use `$env:PLAYWRIGHT_BROWSER = "chromium"` and then `npm run check`. Alternatively set `CHROME_PATH` to a Chromium executable's absolute path. On Linux, Playwright's `install --with-deps chromium` command can install the system libraries needed for testing. Browser downloads are development-only and are not needed to run the application.

GitHub Actions runs the same checks on pull requests to `main` and pushes to `main`, using Node 22 on Ubuntu 24.04 and the pinned Playwright Chromium in its full/new headless mode (including native PDF viewing). Dependency/browser installation requires an internet connection; resume PDF generation uses local assets. No TypeScript or separate type-check command is configured for this small JavaScript application. See [tooling and module structure](docs/development.md).

## Using Applicable

1. Prepare your complete resume using the [input format](docs/input-format.md). The in-app “Need the resume format?” section can copy reusable instructions for your chatbot.
2. Paste the result into **Your resume**, then select **Create PDF** above the field. You can also press Cmd/Ctrl + Enter while editing.
3. The app downloads `resume.pdf` and shows the same PDF for review. Use **Download PDF** to download it again. If your browser cannot display PDFs inline, the download remains available without an embedded viewer.

Missing, blank or malformed content blocks export with clear warnings and source lines where applicable. Your pasted text stays available for correction. Editing it removes the old preview/download so an earlier file is not mistaken for the updated resume. During generation the button is disabled; edits remain possible, and an outdated result will not download.

The field grows with your text up to the available viewport, then scrolls. There are no upload controls, profiles, accounts, saved resume history, AI calls or remote processing. A browser may require you to use the visible download link if it blocks automatic downloads. Native PDF controls and rendering vary by browser; no separate viewer library is included.

## Development documents

- [Production PDF template](docs/pdf-template.md)
- [Resume input format](docs/input-format.md)
- [Complete synthetic example](examples/resume.txt)
- [Reusable chatbot instruction](examples/chatbot-instruction.md)
- [Project specification](docs/project-spec.md)
- [Development plan](docs/project-plan.md)
- [Agent instructions](AGENTS.md)
- [Agent workflow](docs/agent-workflow.md)

The initial release will be downloadable and runnable locally. Final distribution and paste-format instructions will follow the remaining implementation issues.

## Project tracking

- [GitHub repository](https://github.com/Ewager1/applicable)
- [Applicable project board](https://github.com/users/Ewager1/projects/6)
