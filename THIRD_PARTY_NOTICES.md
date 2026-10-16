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

**Upstream snippet provenance:** the reviewed bundle credits [bobince's Stack Overflow answer](https://stackoverflow.com/a/21409165) in `@foliojs-fork/pdfkit/lib/saslprep/index.js` (`toCodePoints`) and [Steve T's answer](https://stackoverflow.com/a/2173084) in `@foliojs-fork/pdfkit/lib/mixins/vector.js` (`ellipse`). [Primary answer metadata](https://api.stackexchange.com/2.3/answers/21409165;2173084;22747272?site=stackoverflow&filter=withbody) reports CC BY-SA 3.0 for those answers. Their attributions and full CC terms remain in the runtime notices alongside the original package MIT declarations. This audit records the upstream references without determining their legal applicability or claiming that the provenance uncertainty is resolved.

`npm run build` emits `LICENSE.txt` and a self-contained `THIRD_PARTY_NOTICES.txt` beside `index.html`. Distribute these files with the complete `dist/` directory when sharing or hosting the static app. The first file preserves Applicable's MIT grant. The second includes the shared React/React DOM/Scheduler MIT grant, pdfmake's MIT grant, the full Adobe copyright/OFL, and the [reviewed browser runtime notices](licenses/browser-runtime-NOTICES.txt). It contains the original notice texts rather than links back to development-only files. The app and PDF contents are unchanged.

The [artifact inventory](licenses/browser-runtime.json) records all 575 source-map entries in the pinned pdfmake browser artifact: 537 entries across 73 embedded npm package instances and 38 pdfmake, wrapper or ignored entries. Original registry tarball URLs/integrities, source paths and license-reference releases are retained. 489 embedded source contents match their reference tarball files exactly; the remaining 48 entries are transformed or composed, so the reference release is not asserted to be their exact embedded version. The reviewed bundle and source-map hashes pin the actual shipped input independently of those version inferences. The inventory comes from the artifact and upstream [webpack build configuration](https://github.com/bpampuch/pdfmake/blob/0.2.20/webpack.config.js), not just Applicable's installed dependency tree.

The runtime notices also preserve inline BSD/MIT and Google Apache headers that top-level package licenses do not cover, pdfmake's vendored SVG-to-PDFKit grant, conservative SASLprep/Unicode/HarfBuzz and nested helper notices, and licenses for generated Babel/webpack and Vite/Rolldown browser helpers (including Rolldown's Rollup/esbuild attributions). The embedded core-js split implementation credits es5-shim; its retained MIT text comes from [es5-shim v4.5.15](https://github.com/es-shims/es5-shim/blob/v4.5.15/LICENSE) as a reference release, not identification of the borrowed revision. Development executables and their dependency inventories are not included. [Apache 2.0 section 4](https://www.apache.org/licenses/LICENSE-2.0) explains license-copy and applicable attribution/NOTICE requirements; upstream [React](https://github.com/react/react/blob/main/LICENSE) and [pdfmake 0.2.20](https://github.com/bpampuch/pdfmake/blob/0.2.20/LICENSE) grants require their copyright and permission notices to remain.

**Upstream provenance limits:** brotli 1.3.3, @foliojs-fork/fontkit 1.9.2 and dfa 1.2.0 publish MIT declarations and author metadata but omit standalone LICENSE files in both their registry tarballs and recorded upstream commits. Their original declaration values are retained, and supplemental full MIT terms are labeled separately; no copyright statement or upstream license file is fabricated. Brotli's embedded Google Apache notices and the complete Apache terms remain separately included. These records describe the reviewed artifact and conservative attribution choices; they are not a universal legal certification or a scanner for future dependency versions.

The small [build-only notice plugin](scripts/build-notices.mjs) verifies runtime/tool versions, reviewed input and notice hashes, complete pdfmake source-map attribution, actual emitted third-party module/generated-helper coverage, and the three emitted font hashes. Missing, changed or unreviewed inputs fail the build with a license-review error. It emits the notices without changing application JavaScript, styling or font bytes. Before a runtime, font or build-tool update, inspect the new artifact/source map and upstream terms, revise the retained notices and provenance inventory, and rerun the focused notice tests plus the required checks. Do not merely refresh fingerprints to silence a review failure. Review new vendored code/data as well as named npm packages; source-map coverage alone does not establish every upstream origin.

Keep the full [Adobe copyright and OFL](assets/fonts/OFL.txt) accessible with redistributed TTFs. [OFL condition 2](https://openfontlicense.org/open-font-license-official-text/) permits standalone notices or easily viewed metadata; the build includes the full text rather than relying solely on the font's copyright/OFL URL metadata.

Generated resume PDFs contain embedded font subsets, rather than distributing the standalone TTFs or application JavaScript. The [SIL OFL FAQ 1.12–1.13](https://openfontlicense.org/ofl-faq/) permits document embedding and explains that it does not change the document's license. Preserve the historical Poppins notice with the frozen source proof assets; it is not an active runtime font.
