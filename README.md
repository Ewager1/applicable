# Applicable

Three independent tools to help with your job search:

- **Job Finder** prepares a ChatGPT conversation for finding relevant opportunities.
- **Resume Writer** prepares a separate ChatGPT conversation for writing and tailoring resumes.
- **Resume PDF Maker** converts structured resume text into a professional PDF using one consistent template.

Use one tool or all three in conjunction. Applicable assembles prompts and generates PDFs in your browser; you use ChatGPT separately, review its results and apply yourself.

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

To stop, press **Ctrl+C** in the terminal running Applicable. To start it again, open the same folder and run `npm run dev`; reinstalling is unnecessary unless the project dependencies changed. Stop Applicable before running `npm ci` or removing its dependency/cache folders: replacing files while it runs can interrupt PDF creation. Keep that terminal open while using the app. Do not open `index.html` directly: the local server is required.

For a production build served locally:

```sh
npm run build
npm run preview
```

Open [the local build preview](http://127.0.0.1:4174/). Stop it with Ctrl+C. This builds local static assets; it does not publish or deploy anything.

Distribution is this repository's source download; no installer, published release or hosted service is provided. See the dated [clean-source verification records and tested platforms](docs/verification.md) for their exact source scope.

## Verification and build

Run `npm run check` for formatting, strict TypeScript checking, lint, unit/PDF tests, build and browser tests. The [maintenance guide](docs/maintenance.md#choose-verification-by-the-change) owns focused check commands and the contributor edit map, including validation, input help, PDF styles, filenames and UI state.

Browser checks use installed desktop Chrome by default. Run `npm run build` before running the browser command on its own, and leave ports 4173 and 4174 free. The browser command starts and stops its own servers; do not also run `proof:serve` or `preview` while testing.

For a downloaded, version-matched Chromium instead of installed Chrome:

```sh
npx --no-install playwright install chromium
PLAYWRIGHT_BROWSER=chromium npm run check
```

The environment-variable form above works in macOS/Linux shells. In PowerShell, use `$env:PLAYWRIGHT_BROWSER = "chromium"` and then `npm run check`. Alternatively set `CHROME_PATH` to a Chromium executable's absolute path. On Linux, Playwright's `install --with-deps chromium` command can install the system libraries needed for testing. Browser downloads are development-only and are not needed to run the application.

GitHub Actions is configured to run the same checks on pull requests to `main` and pushes to `main`, using Node 22 on Ubuntu 24.04 and the pinned Playwright Chromium in its full/new headless mode (including native PDF viewing). Dependency/browser installation requires an internet connection; resume PDF generation uses local assets. The separate synthetic PDF investigation runs with `npm run proof:serve` at http://127.0.0.1:4173/; its [developer notes](proof/README.md) describe visual QA. The parser/PDF core is independent of React; the interface uses typed React components/local state, and developer scripts remain JavaScript. See [tooling and module structure](docs/development.md).

## Using Applicable

Resume PDF Maker opens by default. Switch between the three tabs with a click or tap, or use Left/Right arrows, Home and End while a tab has keyboard focus. Your answers, pasted text, validation and current PDF survive tool switches; reloading clears them. The tagline leads into one workspace connecting the tabs with the selected tool.

### Job Finder

Choose **Copy Prompt** immediately, or personalize it with three initial questions and four more under **Additional preferences**. **Search U.S. jobs only** and **Prefer recently posted positions** remain visible outside that disclosure (both on by default). Paste the prompt into a new ChatGPT conversation and upload your existing resumes there. Answer its clarification questions; for future searches, ask “Look for jobs.” Verify openings and apply yourself. Applicable does not search or apply for jobs.

### Resume Writer

Optionally answer the twelve background questions and choose **Copy Setup Prompt**. Paste it into a separate ChatGPT conversation and upload one or more existing resumes there; no job description is needed to get started. Share job descriptions when ready, review every result and reuse the conversation for future jobs.

Standard Resume uses conventional headings and bullets by default. Ask for Applicable Format when you want structured text for Resume PDF Maker. **Open chatbot formatting instructions** opens PDF Maker’s standalone formatting help; you can also use that help without setting up Resume Writer.

Both prompt tools show next steps after copying. If clipboard access is unavailable, the full prompt appears selected for manual copying.

### Resume PDF Maker

1. If your text is not already in Applicable Format, open **Need help formatting your resume?** and choose **Copy chatbot instructions**. Paste them with your current resume into ChatGPT or another chatbot. If copying is unavailable, the complete instructions appear for manual copying.
2. Copy the chatbot’s complete text code block and paste it into **Resume text**. The [input format](docs/input-format.md) describes the literal markers; there is no need to rebuild sections by hand.
3. Select **Create PDF** below the editor, or press Cmd/Ctrl + Enter while editing. Review the resulting PDF and use **Download PDF** to download it again. The document preview sits beside the editor on desktop and below it on mobile. If inline viewing is unavailable, the download remains available.

The empty editor also offers **Paste from clipboard** and **Try an example**. Clipboard access happens only when requested; if unavailable, paste directly into the editor. These actions appear only while the editor is empty. The fictional example can be removed until you edit it, and generates only when you select Create PDF.

The pasted text supplies the name/contact header and resume sections. `@@CONTACT@@` with `Name:` and at least one valid nonempty body section are required; Email, Phone, LinkedIn and Website are optional. Omit inapplicable sections instead of adding placeholders. Included blank or malformed sections block export with correction messages and source lines where applicable. Pasted text stays available for correction. Section order is fixed; entries and bullets retain the supplied order and wording.

The professional title determines the filename, for example `Full-Stack Software Engineer Resume.pdf`. Optionally include `@@TARGET_COMPANY@@` followed by a company name to get `Full-Stack Software Engineer at Example Company Resume.pdf`. Company metadata affects only the filename. Filename whitespace and unsafe path/control characters are normalized, names are limited to 180 UTF-8 bytes including `.pdf`, and missing usable content falls back to `Resume.pdf` (`Untitled` stands in for a missing title when a company remains).

The input expands with your text up to the available viewport, then scrolls. Editing clears the old preview/download, including during generation, so outdated results cannot download. The button is disabled while generating; review and automatic downloads depend on browser capabilities and settings.

## Development documents

For contributions, read [AGENTS.md](AGENTS.md), keep changes focused and use the [maintenance guide](docs/maintenance.md#choose-verification-by-the-change) to choose verification. The edit map and source structure below identify where each feature belongs.

- [Maintenance guide and edit/check map](docs/maintenance.md)
- [Source structure and tooling](docs/development.md)
- [PDF proof, fixtures and baselines](proof/README.md)
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

Applicable does not upload or persist pasted resumes, contact details, target company, questionnaire answers or generated prompts. They remain in the current page until it is reloaded or closed. There are no accounts, profiles or saved resume history. Copying prompts is an explicit clipboard action; Applicable makes no AI calls. When you paste a prompt or upload a resume into ChatGPT, you share that information with that separate service.

Contact and company information comes from the structured resume text, with no separate fields. On startup, Applicable attempts to delete only its old `applicable.contact.v1` saved-contact key without reading or reusing it; unavailable cleanup does not block PDF creation. Other storage is untouched. PDFs are generated in the browser and saved wherever it downloads files. If the app is hosted, loading code/fonts makes ordinary hosting requests; your resume is not uploaded for processing.

- Resume PDF Maker accepts the [documented text format](docs/input-format.md), not arbitrary free-form resumes or file uploads. Use the chatbot code block’s Copy button; extra commentary and unsupported formatting produce correction messages.
- Unsupported characters outside the bundled font's coverage produce a correction message instead of silently disappearing. See [template limits](docs/pdf-template.md).
- If an entry’s heading details cannot fit together with the beginning of their following content on one page, export stops with a correction message. Your pasted text remains available; shorten the oversized details and try again. Content is never shortened automatically.
- Inline PDF viewing and automatic downloads depend on browser capabilities/settings. Use **Download PDF** when needed; no extra viewer installation is required.
- If installation reports an unsupported Node version, check `node --version` in the same terminal and select a supported version before retrying `npm ci`.
- If a port is busy, stop the previous Applicable process with Ctrl+C. Startup reports the conflict rather than silently choosing another address.
- If PDF creation cannot load, or the browser reports **504 Outdated Optimize Dep**, first copy your resume somewhere safe. Stop Applicable with Ctrl+C in its own terminal, run `npm run dev -- --force` in the project folder, then reload the page and paste your resume back. This rebuilds the local development cache; reloading alone may keep requesting an obsolete file. If dependencies are missing, stop the server before running `npm ci`, then start it again. Avoid stopping another application's server if it uses a similar address.

Manual clean-source testing covered macOS; the application checks also run in Linux CI. Windows, Safari and physical mobile devices have not been manually verified. Desktop browser viewport tests cover narrow and wide layouts. Full results and exact limitations are in the verification record.

## License

Applicable's original code is [MIT licensed](LICENSE), copyright 2026 Ewager1. Fonts and dependencies retain their separate licenses; see [third-party notices](THIRD_PARTY_NOTICES.md), including the reviewed runtime inventory and upstream provenance limits. Keep the generated `LICENSE.txt` and `THIRD_PARTY_NOTICES.txt` with the complete `dist/` directory when redistributing or hosting a production build.

## Project tracking

- [GitHub repository](https://github.com/Ewager1/applicable)
- [Applicable project board](https://github.com/users/Ewager1/projects/6)
