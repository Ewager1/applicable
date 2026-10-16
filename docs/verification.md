# Local distribution verification

## Final migration verification — 2026-10-15

Tested a fresh `git archive` of [`0190e69`](https://github.com/Ewager1/applicable/commit/0190e691f8fa7f42fedf670a871847f9f401045f), the merged F2 React interface and strict TypeScript core, in a separate temporary source directory. The archive contained no dependencies, build output or environment files. `npm ci` installed the lockfile's 170 packages using an existing npm download cache, without copying workspace dependencies. F3 changes contributor documentation only; application code, dependencies, bundled assets and frozen baselines are unchanged.

| Check | Observed result |
| --- | --- |
| Platform/install | macOS 15.6, minimum supported Node **22.13.0**, npm **10.8.2**; `npm ci` passed, audit reported zero vulnerabilities |
| Static/unit/build | `npm run check` passed typecheck, lint, all **93 unit/PDF/usage tests** and build, emitting all three local Source Sans 3 fonts and the lazy PDF engine |
| Browser phase | The first Chromium launch stalled and was stopped after about two minutes; its owned processes were cleaned up. One browser-only retry with `npm run test:browser` passed **17/17**, using pinned Playwright Chromium and the same installed source/build; the test servers released ports 4173/4174 |
| Synthetic application flow | Browser checks covered correction/keyboard submission, actual PDF downloads, selectable text and links, exact preview bytes, narrow/wide layouts, local fonts, no remote HTTP/WebSocket requests, font retry, engine reload recovery and StrictMode cancellation/single delivery/URL cleanup |
| PDF/layout evidence | Reviewed the existing F1 comparisons (seven synthetic fixtures, 14 pages; identical text/layout/link structures and page images) and F2 comparisons (identical wide/narrow empty/filled and clipboard-fallback captures, plus the actual downloaded PDF page). Reused that unchanged visual evidence; no new PDF layout was introduced |

The entire `npm run check` did **not** finish uninterrupted; the successful browser-only retry completed its remaining gate without repeating the passing static/unit/build stages. The clean-source browser checks include first-export development startup with an isolated empty Vite cache and built-preview startup. Node's experimental type-stripping warning, upstream `crypto-js`/`jpeg-exif` deprecations and Vite's large PDF-engine chunk advisory remain visible. This local evidence does not establish latest-commit CI or GitHub delivery status.

Remaining limits: pdfmake **0.2.20** private measurement metadata remains a pinned compatibility boundary; large keep-group measurements cost extra CPU/memory. Font failures support same-page retry, while a failed engine import may require copying the draft, fixing the local asset/server problem, reloading and restoring the draft. Glyph coverage is finite; PDFs have selectable text but are not tagged accessibility PDFs. Native preview/download behavior varies by browser. Windows, Safari and physical mobile devices remain manually unverified. See [maintenance invariants and recovery](maintenance.md) and [template limits](pdf-template.md).

Agent/model usage is optional local development measurement, separate from the application. Private baseline/report availability and partial or unknown attribution must be reported in the issue handoff under the [usage guide](agent-usage.md); this verification establishes no efficiency or cost savings.

## Historical A6 verification

This is the **historical A6 verification record** for the commit and date below. Its test counts, fonts and observations are not a fresh run of the current checkout. Consult [the maintenance guide](maintenance.md), [current template limits](pdf-template.md) and [GitHub checks/status](https://github.com/Ewager1/applicable/actions) for subsequent work.

Verified on 2026-10-15 against committed application source [`338fcfc`](https://github.com/Ewager1/applicable/commit/338fcfca5468a8ec12cbc126e1d47206acae2fdb), the merged [A5 PR #11](https://github.com/Ewager1/applicable/pull/11). A6 adds documentation and license notices only; no application code, dependencies or layout changes are included.

### Clean-source method

A fresh `git archive` of that commit was extracted into an isolated temporary directory. Before installation it contained no `.git`, `node_modules`, `dist`, generated output or environment file. This checks the tracked source distributed by a repository download rather than the developer checkout's ignored files. It was not an installed/native application package, release publication, or a test of GitHub's ZIP download UI.

A separate initially empty npm cache was used for `npm ci`. The clean installation fetched the locked packages; it did not reuse the workspace's `node_modules`. Developer browser checks used the normally installed desktop Chrome, without a project browser cache or special application runtime paths.

Reproduction from a fresh source download/clone, using standard Node/npm and installed Chrome:

```sh
node --version
npm --version
npm ci
npm run check
npm run dev
```

Open http://127.0.0.1:5173/, use `examples/resume.txt`, and select Create PDF. Stop with Ctrl+C. To serve the already-built application, run `npm run preview`, open http://127.0.0.1:4174/, then stop with Ctrl+C. Browser alternatives, prerequisites and usage are in the [README](../README.md); the complete [input contract](input-format.md) and [chatbot instruction](../examples/chatbot-instruction.md) are bundled with the source.

### Results

| Check | Observed result |
| --- | --- |
| Clean installation | `npm ci` succeeded using the lockfile and a fresh npm cache; no copied dependencies |
| Static checks | ESLint passed |
| Parser/PDF tests | All 51 tests passed |
| Production build | Succeeded, with all three fonts and the PDF engine emitted as local assets |
| Browser checks | All 9 passed, including real paste → warnings → correction → download, complete selectable text/links/order, exact preview/download bytes, retry and stale-generation protections |
| Privacy/network | Every automated application browser case rejected remote HTTP/WebSocket requests; clean development-mode export also made no remote requests |
| Development startup | `npm run dev` served the application on loopback port 5173 and created an actual 15,870-byte synthetic `resume.pdf` |
| Built preview startup | `npm run preview` served the built application successfully on loopback port 4174 |
| Shutdown | Ctrl+C stopped both manually started servers; ports 5173, 4173 and 4174 refused subsequent connections |
| User interface/PDF | A5 desktop/mobile screenshots and the actual downloaded synthetic PDF were visually reviewed; A4's shared template baseline remains unchanged |

The 9 browser checks use synthetic content only. They include native PDF viewing and a capability-disabled fallback, each producing one intended automatic download, along with unavailable/corrupt font recovery and edits while generation is pending. Existing PDF tests cover short, typical and long resumes, one job split across pages, a single bullet continued over three pages, long tokens/metadata, and unsupported-glyph errors.

### Platforms and limits

The clean-source run above used **macOS 15.6**, Node **24.19.0**, npm **10.8.2**, and installed desktop Chrome. Existing GitHub Actions checks for the implemented application use **Ubuntu 24.04**, Node **22**, and pinned Playwright Chromium; see [PR #11 checks](https://github.com/Ewager1/applicable/pull/11/checks) and the [workflow](../.github/workflows/checks.yml). This local report did not establish A6's later CI/merge/closure result; [issue #6](https://github.com/Ewager1/applicable/issues/6) and its linked PR record that lifecycle.

Windows, Safari and physical mobile devices were not manually tested. Narrow/wide layouts were checked through desktop browser viewport sizes; that does not establish a full mobile-browser compatibility matrix. Normal use needs a modern browser, not specifically Chrome; Chrome/Chromium is the developer test prerequisite. Native PDF viewing/controls depend on the browser, and download remains available when native viewing is absent or automatic downloads are blocked.

Installation requires internet access for npm dependencies, and downloading a development test browser also requires internet. The installed application's generation path uses bundled fonts/code and no remote service. The app accepts the canonical input format, requires all seven groups, and that snapshot used bounded Poppins glyph coverage; unsupported displayed characters block generation with a correction message. Practical long metadata was tested; arbitrary multi-page header blocks were outside that snapshot's supported layout claim. The later Source Sans 3 and C5 fit safeguards are documented separately in the current template notes. Resume processing is not persisted by Applicable; downloaded files remain wherever the user/browser saves them.

The known build advisory about the approximately 1.3 MB PDF engine chunk is expected: it is lazy-loaded, while initial application JavaScript is approximately 18 KB. Installation also reports upstream `crypto-js` and `jpeg-exif` deprecation notices; these did not prevent installation or the checks. No warning was suppressed and no runtime dependency changed during A6.

### Distribution and licensing

Distribution is the public repository's source ZIP or clone, with local Node/npm startup. There is no native installer, published release or hosted deployment. Applicable's original code uses [MIT](../LICENSE), copyright 2026 Ewager1, as authorized by the user. Fonts and dependencies retain their own rights; [third-party notices and retained license texts](../THIRD_PARTY_NOTICES.md) document them. No personal resume, generated scratch PDF, installation log or private configuration is included in this verification change.
