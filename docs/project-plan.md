# Applicable: Development Plan

This plan records agreed scope and sequence. [GitHub issues](https://github.com/Ewager1/applicable/issues), [merged PRs](https://github.com/Ewager1/applicable/pulls?q=is%3Apr+is%3Amerged) and [the Applicable board](https://github.com/users/Ewager1/projects/6) are the source of current status; dated verification records apply to their recorded commits. See [the maintenance guide](maintenance.md) for the implemented module/check map.

## Workflow

Use this plan and the specification to create focused GitHub issues with acceptance criteria and dependencies. Issue identifiers below are planning identifiers, not GitHub issue numbers.

Follow `AGENTS.md` for branch, authorization, verification, and pull request rules. Do not inherit Planner's project board or application-specific dependencies.

Create issues in this order: A1, A2, A3, A4, A5, A6. Record their assigned GitHub numbers and links here after creation. This is also the execution order, even where technical dependencies would allow overlap.

For each issue:

1. Confirm acceptance criteria are clear; ask the user early about material ambiguity.
2. Create an issue-specific branch from the latest main.
3. Implement the issue and write or update meaningful tests for its behavior.
4. Run applicable checks and inspect the final diff; visually inspect PDF changes.
5. Open a PR linked to the issue and wait for applicable CI checks on its latest commit.
6. Self-merge clear, low-risk work only after the gates in `AGENTS.md` pass. Stop for unresolved concerns.
7. Verify the merge, issue closure, and project status; safely delete the merged issue branch locally and remotely.
8. Continue to the next issue only after completing that lifecycle.

The user has authorized this routine lifecycle. Documentation-only work uses content and link review instead of artificial tests. Repository setup is recorded below.


## Phase 1: Verify the PDF approach

### A1: PDF rendering investigation

Acceptance criteria:

- Use a synthetic resume to demonstrate the reference layout, bundled fonts, bullet indentation, right-aligned metadata, and categorized skills.
- Include minimal reproducible verification commands and synthetic fixtures for the rendering proof, even though A2 later consolidates the application tooling. The first executable issue must satisfy the testing gate.
- Verify selectable text, functioning links, complete content, and pagination across short and long examples.
- Confirm direct download and whether the same PDF can be embedded as a preview.
- Compare the result visually with the local references without committing their personal content.
- Retain a synthetic baseline and a layout checklist covering clipping, overlap, metadata alignment, heading separation, bullet indentation, and page transitions. Document its review status for reuse in later PDF changes.
- Record the selected approach, dependencies and licenses, local installation requirements, and limitations.
- Prefer a browser-only approach when it meets the requirements; explain any need for a local generation process before expanding the architecture.

Dependencies: None. Scope: A rendering proof and decision, not the complete application.

## Phase 2: Establish the foundation and input contract

### A2: Minimal application and verification setup

Acceptance criteria:

- Establish the smallest practical runtime and module structure based on A1.
- Provide documented commands for local startup, tests, lint, type checking if applicable, and build if applicable.
- Configure CI to run the applicable checks on pull requests to main.
- Do not add a UI framework without a demonstrated need.

Dependencies: A1.

### A3: Document and parse the resume format

Acceptance criteria:

- Document the canonical text format and provide a complete synthetic example suitable for chat-generated output.
- Define required fields, repeated entry boundaries, multiline bullets, skill separators, and duplicate or unknown section behavior.
- Require all seven fixed groups. Missing or blank content blocks export with a clear human-language warning naming what is missing; preserve the pasted text for correction.
- Accept different section orders and normalize only group ordering.
- Preserve job, bullet, category, and skill item order and original wording.
- Reject missing names, empty skills, malformed entries, and unrecognized content with useful feedback.
- Test ordering, whitespace-only values, multiline text, delimiter ambiguity, and preservation of content.

Dependencies: A2.

## Phase 3: Complete the paste-to-PDF flow

### A4: Production PDF template

Acceptance criteria:

- Render the parsed resume using the single verified template.
- Support automatic page counts without clipping or truncation.
- Keep headings and entry headers with following content.
- Verify text completeness and visually inspect short, typical, and long outputs. Include an explicit fixture with one job split across pages; this was identified during A1 independent review.

Dependencies: A1, A3.

### A5: Minimal interface and PDF delivery

Acceptance criteria:

- Provide the expanding labeled input with its submit button above it.
- Show validation and generation failures while retaining input.
- Generate and deliver the PDF without manual reconstruction or a mandatory print dialog.
- If the verified approach supports a simple accurate preview, display the same generated PDF and a download action without template settings.
- Make generation status keyboard and screen-reader accessible, prevent duplicate submission during generation, and release obsolete generated file resources.
- Test invalid input, successful export, and correction followed by resubmission.

Dependencies: A3, A4.

## Phase 4: Distribution and final verification

### A6: Local setup and release readiness

Acceptance criteria:

- Verify installation and startup from a clean download using documented prerequisites.
- Document usage, the input format, PDF download, preview limitations, and troubleshooting.
- Verify resume processing makes no remote requests and assets are available locally after installation.
- Review narrow and wide layouts, keyboard interaction, clickable links, selectable PDF text, and page transitions.
- Run relevant automated checks and document remaining limitations.
- Prepare distribution instructions; publishing a release requires explicit authorization.

Dependencies: A5.

## GitHub setup

- Public repository: https://github.com/Ewager1/applicable
- Dedicated project: https://github.com/users/Ewager1/projects/6
- The initial bootstrap contained planning and workflow files only. Implementation uses issue branches and PRs.

| Order | Plan | GitHub issue |
| --- | --- | --- |
| 1 | A1 | [#1: PDF rendering investigation](https://github.com/Ewager1/applicable/issues/1) |
| 2 | A2 | [#2: Minimal application and verification setup](https://github.com/Ewager1/applicable/issues/2) |
| 3 | A3 | [#3: Document and parse the resume format](https://github.com/Ewager1/applicable/issues/3) |
| 4 | A4 | [#4: Production PDF template](https://github.com/Ewager1/applicable/issues/4) |
| 5 | A5 | [#5: Minimal interface and PDF delivery](https://github.com/Ewager1/applicable/issues/5) |
| 6 | A6 | [#6: Local setup and release readiness](https://github.com/Ewager1/applicable/issues/6) |

## Post-plan fixes

### Issue #13: Chat-safe resume markers

Prefer explicit standalone `@@...@@` section/entry controls so copying rendered Markdown does not remove structural headings. Preserve legacy and mixed-format compatibility, required content checks, source ordering and original line numbers. Accept one enclosing text fence; reject malformed/unknown controls and unsafe fence/exterior content with concise guidance. Update the chatbot instruction, synthetic example, UI help and documentation. Unmarked-heading inference, dependencies, PDF layout changes and personal-data fixtures are out of scope.

Tracking: [issue #13](https://github.com/Ewager1/applicable/issues/13), Applicable project board. Follow the same branch, test, review, CI, merge and cleanup gates as the initial plan.

### Issue #15: Development PDF-cache recovery

Document safe recovery from `504 Outdated Optimize Dep` without losing the draft: copy source, stop only Applicable, restart with a forced cache rebuild, then reload. Stop before dependency installation/cache removal. Add an actual first-submission development-browser PDF export check using a unique cold temporary cache and owned ephemeral server, preserving the live development cache. Verify no failed/remote requests, one download, PDF text and matching delivered bytes. Keep the existing lazy import and optimizer defaults unless evidence justifies changing them.

Tracking: [issue #15](https://github.com/Ewager1/applicable/issues/15), Applicable project board. Local recovery is confirmed; automated verification and PR integration follow the normal review, CI and cleanup gates.

## PDF visual refresh

### B1 — Source Sans 3 font foundation (#17)

Bundle authoritative Adobe static Regular 400, Semibold 600 and Bold 700 TTFs locally, retain source revision/license, register distinct real weights and update glyph coverage/embedding verification. Body uses Regular and section headings Semibold. Preserve all content, ordering, links and local export behavior. Before changing fonts, retain an exactly two-page synthetic Poppins PDF and identical fixture for B2. Inspect short/typical/long outputs and run the full suite. No UI/parser/data model changes; size/color/dividers are B2. Tracking: [#17](https://github.com/Ewager1/applicable/issues/17), Applicable project. See [the font implementation PR #19](https://github.com/Ewager1/applicable/pull/19).

### B2 — PDF hierarchy and dividers (#18, after B1)

Complete the separately requested size/color/metadata/divider hierarchy using the B1 font foundation. Compare the identical frozen `proof/baseline/pre-refresh/resume.json` against its old Poppins PDF; preserve content and review all page transitions. Implement only after B1 merges, on its own issue branch with the normal tests/review/CI gates. Tracking: [#18](https://github.com/Ewager1/applicable/issues/18), Applicable project; follow its confirmed acceptance details.

B2 implementation evidence: centralized semantic styles and the confirmed palette, shared Semibold dates, adaptive real divider rules, measured 1.326 em body baselines, repeated-entry rendered font/color tests and identical-data two-page comparison. All 14 generated pages were visually reviewed; the current synthetic baseline is refreshed and the historical PDF/data remain unchanged. No UI, parser, source content or model changes. Issue and PR links record integration and verification status.

## Approved professional cleanup

The six focused issues below run sequentially, each with its own branch, checks, review and merge lifecycle. GitHub issues and the [Applicable project](https://github.com/users/Ewager1/projects/6) carry current status; this list records scope rather than duplicating live status. C6 covers documentation reconciliation and developer handoff.

1. [C1 #21: Resume contracts](https://github.com/Ewager1/applicable/issues/21): shared editor-visible JSDoc data/result/error definitions and clearer parser/UI code, with unchanged behavior.
2. [C2 #22: PDF presentation](https://github.com/Ewager1/applicable/issues/22): organize PDF styles/presentation without changing the approved design.
3. [C3 #23: Web styles](https://github.com/Ewager1/applicable/issues/23): clarify the existing web stylesheet structure without redesigning the interface.
4. [C4 #24: PDF pagination](https://github.com/Ewager1/applicable/issues/24): clarify pagination responsibilities and verification.
5. [C5 #25: Oversized PDF headers](https://github.com/Ewager1/applicable/issues/25): handle oversized metadata/header blocks explicitly within the issue's bounded requirements.
6. [C6 #26: Developer handoff](https://github.com/Ewager1/applicable/issues/26): reconcile documentation and provide the final developer handoff.

## Subsequent approved work

After the cleanup sequence, [D1 #31](https://github.com/Ewager1/applicable/issues/31) covers public-facing copy and [D2 #32](https://github.com/Ewager1/applicable/issues/32) covers optional company-based filenames. These are separate work items, not capabilities delivered by the cleanup documentation. D1 defines the visible chatbot-to-paste workflow, accurate browser-local privacy copy and accessible prompt copying; its issue records review/verification status. Publishing remains separate from this preparation.

The subsequent workflow work is **agent/model usage tracking only**, not application analytics. Future TypeScript/React migration **planning issues** are to be created after that work; migration implementation has not been authorized. No hosting or release/deployment is implied. Use GitHub for execution status and the individual issues for acceptance details.
