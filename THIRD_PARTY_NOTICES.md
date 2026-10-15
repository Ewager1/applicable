# Third-party notices

Applicable's original code is licensed under [MIT](LICENSE), copyright 2026 Ewager1. That grant does not replace the licenses or copyrights of dependencies, bundled fonts, or other third-party software.

## Included fonts

The unchanged Source Sans 3 Regular, Semibold and Bold static TTFs in `assets/fonts/` are copyright 2010–2022 Adobe and licensed under SIL Open Font License 1.1, with Reserved Font Name “Source”. The complete original [copyright and OFL text](assets/fonts/OFL.txt) is retained beside them. The [source/version record](assets/fonts/SOURCE.md) identifies Adobe’s official 3.052R release, pinned source commit, exact archive and real weight identities. Keep the license when redistributing the font files. Generated PDFs embed subsets of these fonts.

Historical synthetic Poppins PDF baselines are deliberately retained for visual comparison, including the frozen pre-refresh two-page sample in `proof/baseline/pre-refresh/`. Its [original Poppins OFL license](proof/baseline/pre-refresh/Poppins-OFL.txt) is retained separately; no Poppins TTF remains in active assets.

## Direct dependencies

These license texts were copied from the installed, lockfile-pinned packages. Line endings and trailing whitespace are normalized; license wording and copyright notices are preserved. Their copyright statements and any included additional notices remain part of those copies.

| Package | Version | Use | Retained license |
| --- | --- | --- | --- |
| pdfmake | 0.2.20 | Local browser PDF generation | [MIT](licenses/pdfmake-LICENSE.txt) |
| pdfjs-dist | 4.10.38 | Development/test PDF inspection | [Apache 2.0](licenses/pdfjs-dist-LICENSE.txt) |
| Playwright | 1.62.1 | Development/test browser automation | [Apache 2.0](licenses/playwright-LICENSE.txt) and [NOTICE](licenses/playwright-NOTICE.txt) |
| Vite | 8.3.4 | Development/build tooling | [MIT and included third-party notices](licenses/vite-LICENSE.txt) |
| ESLint | 10.12.0 | Development linting | [MIT](licenses/eslint-LICENSE.txt) |
| @eslint/js | 10.0.1 | Recommended JavaScript lint rules | [MIT](licenses/eslint-js-LICENSE.txt) |

The source distribution imports these npm packages rather than vendoring their executable source. `npm ci` installs their dependencies and original license/notice files; `package-lock.json` records exact versions, integrity values and package license identifiers. Transitive packages retain their respective licenses as well. If redistributing installed dependencies or a generated browser bundle, preserve the relevant downstream package notices in addition to these direct-package copies; Applicable's MIT license alone does not relicense the combined dependencies. The current distribution is repository source, not a published binary/build artifact.

No browser executable is shipped with this source. Installed Chrome or separately downloaded Playwright Chromium is used only for developer checks and remains governed by its own terms/notices. No third-party application code or fonts were newly added for the final verification step.
