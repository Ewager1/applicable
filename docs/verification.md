# Local distribution verification

Verified on 2026-10-15 against committed application source [`338fcfc`](https://github.com/Ewager1/applicable/commit/338fcfca5468a8ec12cbc126e1d47206acae2fdb), the merged [A5 PR #11](https://github.com/Ewager1/applicable/pull/11). A6 adds documentation and license notices only; no application code, dependencies or layout changes are included.

## Clean-source method

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

## Results

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

## Platforms and limits

The clean-source run above used **macOS 15.6**, Node **24.19.0**, npm **10.8.2**, and installed desktop Chrome. Existing GitHub Actions checks for the implemented application use **Ubuntu 24.04**, Node **22**, and pinned Playwright Chromium; see [PR #11 checks](https://github.com/Ewager1/applicable/pull/11/checks) and the [workflow](../.github/workflows/checks.yml). A6's latest-commit CI run and merge/issue closure remain integration gates tracked in [issue #6](https://github.com/Ewager1/applicable/issues/6), rather than being claimed by this local report.

Windows, Safari and physical mobile devices were not manually tested. Narrow/wide layouts were checked through desktop browser viewport sizes; that does not establish a full mobile-browser compatibility matrix. Normal use needs a modern browser, not specifically Chrome; Chrome/Chromium is the developer test prerequisite. Native PDF viewing/controls depend on the browser, and download remains available when native viewing is absent or automatic downloads are blocked.

Installation requires internet access for npm dependencies, and downloading a development test browser also requires internet. The installed application's generation path uses bundled fonts/code and no remote service. The app accepts the canonical input format, requires all seven groups, and has bounded bundled-font glyph coverage (Source Sans 3 after B1); unsupported displayed characters block generation with a correction message. Practical long metadata is tested; arbitrary multi-page header blocks are outside the supported layout claim. Resume processing is not persisted by Applicable; downloaded files remain wherever the user/browser saves them.

The known build advisory about the approximately 1.3 MB PDF engine chunk is expected: it is lazy-loaded, while initial application JavaScript is approximately 18 KB. Installation also reports upstream `crypto-js` and `jpeg-exif` deprecation notices; these did not prevent installation or the checks. No warning was suppressed and no runtime dependency changed during A6.

## Distribution and licensing

Distribution is the public repository's source ZIP or clone, with local Node/npm startup. There is no native installer, published release or hosted deployment. Applicable's original code uses [MIT](../LICENSE), copyright 2026 Ewager1, as authorized by the user. Fonts and dependencies retain their own rights; [third-party notices and retained license texts](../THIRD_PARTY_NOTICES.md) document them. No personal resume, generated scratch PDF, installation log or private configuration is included in this verification change.
