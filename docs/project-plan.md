# Applicable: Development Plan

Status: GitHub setup complete. Issues are tracked in the Applicable project board; implementation has not started.

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
- Resolve required versus optional groups with the user before implementation; fixed presentation order alone does not make certifications or any other unconfirmed group mandatory.
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
- Verify text completeness and visually inspect short, typical, and long outputs.

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
- The initial main branch contains planning and workflow files only. Feature implementation uses issue branches and PRs.

| Order | Plan | GitHub issue |
| --- | --- | --- |
| 1 | A1 | [#1: PDF rendering investigation](https://github.com/Ewager1/applicable/issues/1) |
| 2 | A2 | [#2: Minimal application and verification setup](https://github.com/Ewager1/applicable/issues/2) |
| 3 | A3 | [#3: Document and parse the resume format](https://github.com/Ewager1/applicable/issues/3) |
| 4 | A4 | [#4: Production PDF template](https://github.com/Ewager1/applicable/issues/4) |
| 5 | A5 | [#5: Minimal interface and PDF delivery](https://github.com/Ewager1/applicable/issues/5) |
| 6 | A6 | [#6: Local setup and release readiness](https://github.com/Ewager1/applicable/issues/6) |
