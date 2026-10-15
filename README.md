# Applicable

A lightweight local tool for turning a pasted resume into a professionally formatted PDF.

Paste a complete resume, submit it, and download a PDF using one consistent template. Section order is fixed, while jobs appear in the order supplied in the source text. All wording comes from the pasted resume.

## Download and run locally

1. [Download the source ZIP](https://github.com/Ewager1/applicable/archive/refs/heads/main.zip) and extract it, or clone the repository:

   ```sh
   git clone https://github.com/Ewager1/applicable.git
   ```

2. Install [Node.js](https://nodejs.org/) with npm: **22.13 or newer in the 22.x series, or Node.js 24 or newer**. Node 20 and 23 are outside this project's supported versions. If you use nvm, `.nvmrc` selects Node 22.
3. Open a terminal in the extracted `applicable-main` folder (or the cloned `applicable` folder) and run:

   ```sh
   npm ci
   npm run dev
   ```

4. Open [Applicable on your computer](http://127.0.0.1:5173/) in a modern browser. Chrome is needed only for the default developer browser checks, not for normal use.

Installation needs internet access to download dependencies. After installation, the app processes your resume using local code and bundled fonts. It binds to your own machine only and does not require an account or paid service.

To stop, press **Ctrl+C** in the terminal running Applicable. To start it again, open the same folder and run `npm run dev`; reinstalling is unnecessary unless the project dependencies changed. Keep that terminal open while using the app. Do not open `index.html` directly: the local server is required.

For a production build served locally:

```sh
npm run build
npm run preview
```

Open [the local build preview](http://127.0.0.1:4174/). Stop it with Ctrl+C. This builds local static assets; it does not publish or deploy anything.

The complete application flow is implemented and clean-source verification has passed. Distribution is this repository's source download; no installer, published release or hosted service is provided. See the [verification record and tested platforms](docs/verification.md).

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

GitHub Actions is configured to run the same checks on pull requests to `main` and pushes to `main`, using Node 22 on Ubuntu 24.04 and the pinned Playwright Chromium in its full/new headless mode (including native PDF viewing). Dependency/browser installation requires an internet connection; resume PDF generation uses local assets. The separate synthetic PDF investigation runs with `npm run proof:serve` at http://127.0.0.1:4173/; its [developer notes](proof/README.md) describe visual QA. No TypeScript or separate type-check command is configured for this small JavaScript application. See [tooling and module structure](docs/development.md).

## Using Applicable

1. Prepare your complete resume using the [input format](docs/input-format.md). The in-app “Need the resume format?” section copies self-contained instructions asking your chatbot for literal `@@...@@` markers in one text code block. Use that code block’s **Copy** button to preserve its line breaks.
2. Paste the result into **Your resume**, then select **Create PDF** above the field. You can also press Cmd/Ctrl + Enter while editing.
3. The app downloads `resume.pdf` and shows the same PDF for review. Use **Download PDF** to download it again. If your browser cannot display PDFs inline, the download remains available without an embedded viewer.

Missing, blank or malformed content blocks export with clear warnings and source lines where applicable. Your pasted text stays available for correction. Editing it removes the old preview/download so an earlier file is not mistaken for the updated resume. During generation the button is disabled; edits remain possible, and an outdated result will not download.

The field grows with your text up to the available viewport, then scrolls. There are no upload controls, profiles, accounts, saved resume history, AI calls or remote processing. A browser may require you to use the visible download link if it blocks automatic downloads. Native PDF controls and rendering vary by browser; no separate viewer library is included.

## Development documents

- [Clean-source verification](docs/verification.md)
- [Production PDF template](docs/pdf-template.md)
- [Resume input format](docs/input-format.md)
- [Complete synthetic example](examples/resume.txt)
- [Reusable chatbot instruction](examples/chatbot-instruction.md)
- [Project specification](docs/project-spec.md)
- [Development plan](docs/project-plan.md)
- [Agent instructions](AGENTS.md)
- [Agent workflow](docs/agent-workflow.md)

## Privacy, limits and troubleshooting

Resume text stays in the current browser page; Applicable does not send it to a remote service, store a profile or save resume history. PDFs are generated locally and saved wherever your browser downloads files. Copying chatbot instructions is an explicit clipboard action; no chatbot is contacted by the app.

- Use the documented format and include all seven required groups. Prefer standalone `@@CONTACT@@`, `@@PROFESSIONAL_TITLE@@`, `@@SUMMARY@@`, `@@RELEVANT_EXPERIENCE@@`, `@@EDUCATION@@`, `@@CERTIFICATIONS@@`, `@@SKILLS@@`, with `@@JOB@@`, `@@EDUCATION_ENTRY@@` and `@@CERTIFICATION@@` entry boundaries. Legacy `#`/`##` markers still work, but unmarked headings are not inferred. Paste the code block’s contents, or one enclosing text code block; extra commentary and nested/unknown fences are rejected. Arbitrary free-form resumes and file uploads are unsupported.
- Unsupported characters outside the bundled font's coverage produce a correction message instead of silently disappearing. See [template limits](docs/pdf-template.md).
- Inline PDF viewing and automatic downloads depend on browser capabilities/settings. Use **Download PDF** when needed; no extra viewer installation is required.
- If installation reports an unsupported Node version, check `node --version` in the same terminal and select a supported version before retrying `npm ci`.
- If a port is busy, stop the previous Applicable process with Ctrl+C. Startup reports the conflict rather than silently choosing another address.
- If local assets cannot load, stop the server, run `npm ci` in the project folder, start again and reload the page. Your unsaved browser input may need to be copied somewhere safe before reloading.

Manual clean-source testing covered macOS; the application checks also run in Linux CI. Windows, Safari and physical mobile devices have not been manually verified. Desktop browser viewport tests cover narrow and wide layouts. Full results and exact limitations are in the verification record.

## License

Applicable's original code is [MIT licensed](LICENSE), copyright 2026 Ewager1. Fonts and dependencies retain their separate licenses; see [third-party notices](THIRD_PARTY_NOTICES.md).

## Project tracking

- [GitHub repository](https://github.com/Ewager1/applicable)
- [Applicable project board](https://github.com/users/Ewager1/projects/6)
