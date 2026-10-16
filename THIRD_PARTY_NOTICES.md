# Third-party notices

Applicable's original code is licensed under [MIT](LICENSE), copyright 2026 Ewager1. That grant does not replace the licenses or copyrights of dependencies, bundled fonts, or other third-party software.

## Included fonts

The unchanged Source Sans 3 Regular, Semibold and Bold static TTFs in `assets/fonts/` are copyright 2010–2022 Adobe and licensed under SIL Open Font License 1.1, with Reserved Font Name “Source”. The complete original [copyright and OFL text](assets/fonts/OFL.txt) is retained beside them. The [source/version record](assets/fonts/SOURCE.md) identifies Adobe’s official 3.052R release, pinned source commit, exact archive and real weight identities. Keep the license when redistributing the font files. Generated PDFs embed subsets of these fonts.

Historical synthetic Poppins PDF baselines are deliberately retained for visual comparison, including the frozen pre-refresh two-page sample in `proof/baseline/pre-refresh/`. Its [original Poppins OFL license](proof/baseline/pre-refresh/Poppins-OFL.txt) is retained separately; no Poppins TTF remains in active assets.

## Retained dependency license references

These license texts were copied from the installed, lockfile-pinned packages. Line endings and trailing whitespace are normalized; license wording and copyright notices are preserved. Their copyright statements and any included additional notices remain part of those copies. This is a reference list for the retained files, not a complete inventory of every installed or browser-bundled component.

| Package | Version | Use | Retained license |
| --- | --- | --- | --- |
| React | 19.3.1 | Browser interface runtime | [MIT](licenses/react-LICENSE.txt) |
| React DOM | 19.3.1 | Browser DOM mounting | [MIT](licenses/react-LICENSE.txt) |
| Scheduler (React DOM dependency) | 0.28.0 | React scheduling | [MIT](licenses/react-LICENSE.txt) |
| pdfmake | 0.2.20 | Local browser PDF generation | [MIT](licenses/pdfmake-LICENSE.txt) |
| pdfjs-dist | 4.10.38 | Development/test PDF inspection | [Apache 2.0](licenses/pdfjs-dist-LICENSE.txt) |
| Playwright | 1.62.1 | Development/test browser automation | [Apache 2.0](licenses/playwright-LICENSE.txt) and [NOTICE](licenses/playwright-NOTICE.txt) |
| Vite | 8.3.4 | Development/build tooling | [MIT and included third-party notices](licenses/vite-LICENSE.txt) |
| ESLint | 10.12.0 | Development linting | [MIT](licenses/eslint-LICENSE.txt) |
| @eslint/js | 10.0.1 | Recommended JavaScript lint rules | [MIT](licenses/eslint-LICENSE.txt) |

React, React DOM and Scheduler share one retained file because their complete installed license texts, including the Meta copyright notice, are byte-identical after normalization. ESLint and @eslint/js likewise share the identical OpenJS notice. Other files are retained separately: matching license names or boilerplate do not establish matching copyrights or additional notices. In particular, the Applicable and pdfmake MIT grants, the two font copyright headers, Vite's combined notices, and the Playwright Apache license/NOTICE are not interchangeable.

## Source distribution

Keep Applicable's `LICENSE`, this notice and its linked license/font files with this repository. The source imports npm packages rather than vendoring their executable source. `npm ci` installs dependencies and their original license/notice files; `package-lock.json` records package versions, integrity values and license identifiers. These identifiers are useful inventory data, not substitutes for the actual terms. The retained development-tool copies are reference material; they do not imply those tools are shipped to app users. Newly added development tools do not require duplicate reference files merely because the source imports or invokes them.

If redistributing `node_modules`, preserve the distributed packages' licenses and applicable additional notices, including transitive dependencies and Playwright's `ThirdPartyNotices.txt`. The selected copies above are insufficient for that distribution. Existing development references remain here because this audit establishes only exact-duplicate consolidation, not that every other notice can be removed.

No browser executable is shipped with this source. Installed Chrome or separately downloaded Playwright Chromium is used only for developer checks and remains governed by its own terms/notices.

## Production build and generated PDFs

The browser entry imports React/React DOM (including Scheduler), dynamically imports the prebuilt `pdfmake/build/pdfmake.js`, and loads the three Source Sans 3 TTFs. Development/test tools such as ESLint, Vite, pdfjs-dist and Playwright are not imported by the app. However, pdfmake's prebuilt bundle already contains third-party code; its contents are not fully described by Applicable's installed runtime dependency tree or pdfmake's top-level MIT license.

Before distributing or hosting a standalone `dist/`:

- Include Applicable's MIT copyright and permission notice and the complete notices for React/React DOM/Scheduler and pdfmake. The upstream [React MIT grant](https://github.com/react/react/blob/main/LICENSE) and [pdfmake 0.2.20 MIT grant](https://github.com/bpampuch/pdfmake/blob/0.2.20/LICENSE) require retention of their copyright and permission notices; the package-version-specific copies are linked above.
- Inventory the components actually included in the emitted browser bundles, including code embedded in upstream bundles. Retain their required copyrights, licenses and additional notices. For example, the installed pdfmake browser bundle contains Cédric Mesnil's BSD-style redistribution notice, Joyent's MIT notice and Google Apache-licensed code. These cannot all be replaced with pdfmake's MIT notice. [Apache 2.0 section 4](https://www.apache.org/licenses/LICENSE-2.0) requires a license copy and applicable attribution/NOTICE handling for covered redistributed code.
- Keep the full [Adobe copyright and OFL](assets/fonts/OFL.txt) accessible with the redistributed TTFs. [OFL condition 2](https://openfontlicense.org/open-font-license-official-text/) permits standalone notices or easily viewed metadata. The unchanged TTFs contain copyright and an OFL URL; retaining the accompanying full text avoids depending solely on that metadata.

**Build limitation:** the current Vite configuration does not copy these documentation/license files. The inspected build contains JavaScript, CSS, HTML and TTFs, with no standalone license/notice files; its React and pdfmake chunks do not retain the complete upstream copyright and permission texts. `npm run build` therefore does not produce a reviewed standalone redistribution package. Complete the browser-bundle notice inventory and package its notices before publishing or sharing `dist/`. This audit does not certify bundled transitive-license completeness and does not change the build pipeline.

Generated resume PDFs contain embedded font subsets, rather than distributing the standalone TTFs or application JavaScript. The [SIL OFL FAQ 1.12–1.13](https://openfontlicense.org/ofl-faq/) permits document embedding and explains that it does not change the document's license. Preserve the historical Poppins notice with the frozen source proof assets; it is not an active runtime font.
