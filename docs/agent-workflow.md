# Applicable: Agent Workflow

Status: Initial pilot. Follow this workflow for the current project; it does not enable a scheduled or unattended worker loop or replace the merge gates in `AGENTS.md`.

## Recommendation

Use three roles, with one delegated task running at a time by default. Keep issues sequential. Use the existing agent tools rather than building an orchestration service, adding API credentials, or running agents continuously.

| Role | Responsibility | Boundaries |
| --- | --- | --- |
| Chat: coordinator | Own the plan, issue order, handoffs, decisions, and verification of the merge/closure/cleanup lifecycle. | Do not duplicate the implementation agent's work. Escalate material ambiguity to the user early. |
| Codex: implementer | Complete the current issue, write meaningful tests, run checks, and prepare the PR. | One issue and one branch. Own source and test edits. No recursive delegation. |
| Reviewer: testing and review | Independently inspect substantive changes against acceptance criteria, look for missing edge cases, run targeted checks when useful, and inspect generated PDFs when relevant. | Read-only by default. Report concrete findings with evidence; do not rewrite the feature or repeat every passing check. |

The roles do not require different models. Keep the configured model unless the user requests a change. A named testing agent is not a substitute for the implementer writing and running tests.

## Per-issue flow

1. Chat selects the next issue and gives Codex its acceptance criteria, relevant file paths, branch ownership, expected checks, and stop conditions. Start a labeled [local usage baseline](agent-usage.md) for the selected root chat before work; if unavailable, record that measurement as unknown. On a domain change, begin with fresh concise context: issue contract, relevant paths, decisions, interfaces and risks.
2. One implementer owns source/tests and returns a concise handoff: changed behavior/files, exact commit and PR identity, checks actually run, interfaces changed or preserved, unresolved risks, and task/review/rework accounting. Include the metric window and local report path; do not paste real session records into the PR.
3. For substantive code, Chat dispatches one independent testing/review pass against that exact commit. The reviewer receives the issue, specification sections, diff reference, and test results.
4. Codex fixes actionable findings. Recheck only affected behavior and required checks; request one focused follow-up review if needed.
5. One designated integration owner performs the authorized merge after all gates pass. Default: Chat. Codex may be explicitly designated instead; never have both attempt the merge.
6. Finish the usage window after the bounded work/review, supplying measured task, actionable-finding, rework-pass and accepted-outcome counts where available. Preserve the baseline; identify partial/unknown metrics and do not invent historical attribution. Verify merge success, close the issue, set its project status to Done, and safely delete the merged branch. Then start the next issue.

Minor documentation changes can use coordinator review. Significant requirement or authorization changes still deserve independent review. Do not create a reviewer merely to approve punctuation.

If repeated review still leaves uncertainty, stop and explain the remaining issue to the user. Do not iterate indefinitely to obtain approval.

## Cost controls

- Default to one active child agent at a time; the coordinator waits instead of doing duplicate work.
- Keep implementation issues sequential; multiple roles do not imply multiple simultaneous feature branches.
- Delegate a bounded task with named inputs and a concise output, not the entire project objective.
- Reuse an implementation agent when continuity helps. Start reviewers with the context needed for independent review, without replaying unnecessary history when supported.
- Do not allow recursive subagents, competing implementations, continuous monitoring, or repeated full-project scans.
- Use executable tests and CI for repeatable checking. Use reviewer judgment for gaps and behavior, not as an expensive test runner.
- Request follow-up review only for material fixes, not every edit.
- Report delegated task, actionable finding and rework-pass counts per issue using the [local measurement definitions](agent-usage.md). Record token observations only where tooling exposes them; observed cumulative tokens, issue deltas, elapsed wall time and model billing are separate concepts. Do not represent account-wide usage changes as exact issue cost.
- Evaluate the pilot after the first substantive issue. If review adds little value or coordination dominates, simplify to one implementer with coordinator review. No numeric savings or overhead guarantee is assumed.

## Example: parser issue

Codex owns parser implementation and its tests. The reviewer checks whether shuffled section blocks normalize correctly, jobs preserve source order, whitespace-only skills fail, malformed text produces errors, and multiline bullets survive without losing wording. The reviewer reports missing cases and reproducible failures. Codex remains responsible for fixes and regression tests.

## Research behind the proposal

- [OpenAI: Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents): bounded delegation, concise summaries, and caution with simultaneous write-heavy tasks; additional agents consume additional tokens.
- [Cursor: Scaling long-running autonomous coding](https://cursor.com/blog/scaling-agents): reports better coordination with distinct planner and worker roles than a flat group, while also finding that extra coordination roles can create bottlenecks. These were large-scale experiments, not evidence of savings for a small app.
- [Anthropic: How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system): clear task boundaries and effort limits reduce duplication; multi-agent systems can be expensive, and dependent coding work often offers less parallelism than research.

These are engineering reports from their authors, not a controlled benchmark establishing the best workflow or cost for Applicable.
