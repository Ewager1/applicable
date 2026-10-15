# Applicable

A lightweight local tool for turning a pasted resume into a professionally formatted PDF.

Paste a complete resume, submit it, and download a PDF using one consistent template. Section order is fixed, while jobs appear in the order supplied in the source text. All wording comes from the pasted resume.

## Project status

The PDF rendering investigation is complete. Synthetic examples demonstrate the fixed template, automatic pagination, direct download and exact PDF preview. The application now has a minimal vanilla JavaScript development/build foundation and automated checks. Resume parsing and the paste-to-PDF interface are still being built; the application currently shows a clearly labeled development shell.

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
| `npm test` | Selectable PDF text, embedded fonts, annotations, order, bounds and pagination |
| `npm run build` | Bundle the application into `dist/` |
| `npm run preview` | Serve the built application at http://127.0.0.1:4174/; stop with Ctrl+C |
| `npm run test:browser` | Own temporary proof/build-preview servers; verify real downloads and local built assets |
| `npm run check` | Lint, PDF tests, build, then browser tests |
| `npm run proof:generate` | Generate synthetic PDFs in ignored `output/pdf/` |

Browser checks use installed desktop Chrome by default. Run `npm run build` before running the browser command on its own, and leave ports 4173 and 4174 free. The browser command starts and stops its own servers; do not also run `proof:serve` or `preview` while testing.

For a downloaded, version-matched Chromium instead of installed Chrome:

```sh
npx --no-install playwright install chromium
PLAYWRIGHT_BROWSER=chromium npm run check
```

The environment-variable form above works in macOS/Linux shells. In PowerShell, use `$env:PLAYWRIGHT_BROWSER = "chromium"` and then `npm run check`. Alternatively set `CHROME_PATH` to a Chromium executable's absolute path. On Linux, Playwright's `install --with-deps chromium` command can install the system libraries needed for testing. Browser downloads are development-only and are not needed to run the application.

GitHub Actions runs the same checks on pull requests to `main` and pushes to `main`, using Node 22 on Ubuntu 24.04 and the pinned Playwright Chromium. Dependency/browser installation requires an internet connection; resume PDF generation uses local assets. No TypeScript or separate type-check command is configured for this small JavaScript application. See [tooling and module structure](docs/development.md).

## Planned experience

- One expanding text box with a submit button above it.
- Clear warnings that block export when required content is missing or empty.
- One carefully tuned PDF template with automatic pagination.
- Local processing without accounts, AI services, or a database.
- A preview using the same generated PDF offered for download, where the browser supports inline viewing.

## Development documents

- [Project specification](docs/project-spec.md)
- [Development plan](docs/project-plan.md)
- [Agent instructions](AGENTS.md)
- [Agent workflow](docs/agent-workflow.md)

The initial release will be downloadable and runnable locally. Final distribution and paste-format instructions will follow the remaining implementation issues.

## Project tracking

- [GitHub repository](https://github.com/Ewager1/applicable)
- [Applicable project board](https://github.com/users/Ewager1/projects/6)
