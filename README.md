# Applicable

Turn chatbot text into a polished resume with a lightweight browser PDF formatter.

Paste a complete resume, submit it, and download a PDF using one consistent template. Section order is fixed, while jobs appear in the order supplied in the source text. The pasted structured text supplies all resume content, including the name/contact header and optional target-company filename metadata.

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

1. Open **Start with your chatbot** and choose **Copy chatbot instructions**. Paste those instructions together with your current resume into ChatGPT or another chatbot. If clipboard access is blocked, the complete instructions appear for manual copying.
2. Ask the chatbot to format your complete resume. Use the returned text code block’s **Copy** button, then paste the formatted resume into **Your resume** in Applicable. The [input format](docs/input-format.md) describes its literal markers; you do not need to rebuild sections by hand.
3. Select **Create PDF** above the field, or press Cmd/Ctrl + Enter while editing. The app names the file from the resume’s professional title, for example `Full-Stack Software Engineer Resume.pdf`, and shows the same PDF for review. Optionally include `@@TARGET_COMPANY@@` followed by the company name in the pasted text to receive `Full-Stack Software Engineer at Example Company Resume.pdf`. Company affects only the filename; it is never displayed in your PDF. Use **Download PDF** to download it again. If your browser cannot display PDFs inline, the download remains available without an embedded viewer.

Filename whitespace is normalized and unsafe path/control characters are replaced. Long names are bounded to 180 UTF-8 bytes including `.pdf`, reserving a readable portion of both title and company when both are supplied; source capitalization and safe Unicode are preserved. If no usable filename content remains, the fallback is `Resume.pdf` (`Untitled` stands in for an unusable title when a company remains). Editing the pasted text, including contact/company metadata, clears the previous download/preview, so create the PDF again after a change.

Resume PDF Maker opens by default. The three primary tabs are **Job Finder**, **Resume Writer** and **Resume PDF Maker**; use one tool or all three. A compact introduction above the tabs includes an expandable personal story. The header’s **How it works** link leads to an inline four-step overview: Find Jobs → Tailor Resume → Create PDF → Apply. It is informational, not a fourth tab. Switch tools without losing the current pasted resume, validation, PDF, or Job Finder answers/settings/copy feedback. Use Left/Right arrows, Home or End when a tab has keyboard focus. Reloading returns to Resume PDF Maker and clears the pasted resume as usual.

Resume Writer explains how to start a separate ChatGPT conversation, upload past resumes, clarify experience and tailor a resume to job descriptions. Its dedicated setup prompt is not available yet. **Open chatbot formatting instructions** switches to the existing instructions in Resume PDF Maker and focuses their expanded help. External ChatGPT conversations can be reused and refined; you review listings and resumes and submit applications yourself.

In Job Finder, optionally answer seven questions, adjust **Search U.S. jobs only** and **Prefer recently posted positions** (both on by default), and choose **Copy Prompt** to create and copy your setup instructions in one step. Paste them into a new ChatGPT conversation, then upload your existing resumes there. For future searches, ask “Look for jobs.” Applicable only assembles this text locally; it does not search or apply for jobs. Questionnaire answers and search settings survive tab switches but reset on reload; answers, settings and prompts are never saved. The prompt guides broad discovery, responsibility-based fit, role-specific deduplication, verification and ranking. Freshness is a preference, not an age cutoff; official employer listings increase confidence without being mandatory. The prompt is shown and selected for manual copying only if copying is unavailable. Editing an answer or setting, or successfully copying, clears that fallback and its old feedback.

`@@CONTACT@@` with `Name:` is required in the pasted text; Email, LinkedIn, Website and Phone are optional. Older body-only input receives guidance to add contact metadata. Included blank or malformed body sections block export with clear warnings and source lines where applicable. Your pasted text stays available for correction. Editing it removes the old preview/download so an earlier file is not mistaken for the updated resume. During generation the button is disabled; edits remain possible, and an outdated result will not download.

The field grows with your text up to the available viewport, then scrolls. There are no upload controls, profiles, accounts, saved resume history, AI calls or remote processing. A browser may require you to use the visible download link if it blocks automatic downloads. Native PDF controls and rendering vary by browser; no separate viewer library is included.

## Development documents

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

Resume text, contact details and target company stay in the current browser page and are never saved or sent to a remote service. There are no separate contact or company fields. On startup, Applicable attempts to delete only its old `applicable.contact.v1` saved-contact key without reading or reusing it; unavailable cleanup does not block PDF creation. Other storage is untouched. PDFs are generated locally and saved wherever your browser downloads files. Copying chatbot instructions is an explicit clipboard action; no chatbot is contacted by the app. If the static app is served on a website, loading its code/fonts makes ordinary hosting requests; resume text is still processed in the browser rather than uploaded.

- Use the documented format and include at least one valid nonempty body group. All eight body groups are optional individually; omit inapplicable sections and their markers rather than adding placeholders. Included sections must satisfy their entry requirements. Prefer standalone `@@PROFESSIONAL_TITLE@@`, `@@SUMMARY@@`, `@@RELEVANT_EXPERIENCE@@`, `@@VOLUNTEER_EXPERIENCE@@`, `@@PROJECTS@@`, `@@EDUCATION@@`, `@@CERTIFICATIONS@@`, `@@SKILLS@@`, with `@@JOB@@`, `@@VOLUNTEER@@`, `@@PROJECT@@`, `@@EDUCATION_ENTRY@@` and `@@CERTIFICATION@@` entry boundaries. Legacy `#`/`##` markers still work, but unmarked headings are not inferred. Paste the code block’s contents, or one enclosing text code block; extra commentary and nested/unknown fences are rejected. Arbitrary free-form resumes and file uploads are unsupported.
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
