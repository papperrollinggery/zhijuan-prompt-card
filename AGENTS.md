# Project Instructions

## Release Communication

- Keep GitHub release tags machine-simple, for example `v0.3.1`.
- Keep GitHub release titles short because the extension displays `release.name` inside update notices. Prefer titles like `v0.3.1` or `v0.3.1 · API Compatibility`.
- Put detailed update descriptions in `CHANGELOG.md` and the GitHub release body, not in the release title.
- Release notes should compare the key user-visible changes against the previous version without exposing internal prompt wording or low-level implementation details.
- When applicable, mention in-extension update notices and upgrade guidance in both `CHANGELOG.md` and the GitHub release body.
- Thank issue reporters, PR contributors, and model-compatibility testers in public release-facing communication when applicable.

## Gstack + Codex Thread Workflow

- When the user invokes `$gstack`, asks for thread orchestration, or asks for planning/review/QA discipline, run this project through a gstack-style execution plane.
- The current thread is the CEO/control thread. It owns the goal, truth state, role assignment, worker-thread instructions, output merge, final integration, verification, stale-thread cleanup, and final communication.
- The CEO/control thread is not the default implementation executor. For substantial work, delegate implementation to an `Executor` worker in an isolated worktree, or state why a main-thread integration pass is the smaller safe move.
- Use Codex worker threads, not subagents, when the user asks for threads. Each worker gets a role, scope, read/write boundary, expected output format, and verification target.
- Default worker threads are read-only. Write-capable workers require an explicit isolated-worktree merge plan. No worker result is authoritative until the CEO/control thread reads it, reconciles conflicts, and verifies against the final diff.
- Archive worker threads after their report has been merged, or when they are stale, dead, obsolete, failed, or no longer match the accepted scope. Keep the CEO/control thread active.
- Report gstack completion using `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, or `NEEDS_CONTEXT`, with evidence.

### Role Matrix

- `Planner / plan-ceo-review`: checks user outcome, premise, scope boundary, alternatives, acceptance criteria, and whether the task is solving the right problem.
- `Engineer / plan-eng-review`: checks architecture, contracts, existing-code leverage, type boundaries, migration risk, and test strategy.
- `Executor / implementation`: applies the accepted plan only. It does not change scope, silently refactor, or self-approve its own work.
- `QA / qa`: verifies behavior with targeted regression first, then broader gates. Use browser evidence when the change is user-visible or URL-driven.
- `Reviewer / review`: performs independent cold review of the final diff for scope drift, regressions, LLM trust-boundary issues, missing tests, and stale docs.
- `Release / ship-documentation`: handles changelog, release notes, update notices, and public wording without exposing internal prompt mechanics.
- `Loop steward`: tracks repeated failures, stale workers, unresolved decisions, and cleanup. The CEO/control thread owns this unless explicitly delegated.

### Gstack Skill Mapping

- Use `/plan-ceo-review` semantics for premise, scope, acceptance criteria, alternatives, and explicit user approval before adding scope.
- Use `/plan-eng-review` semantics for architecture, contracts, affected files, test strategy, rollback risk, and reuse of existing project patterns.
- Use `/review` and `/codex` semantics for independent adversarial review of the final diff, especially LLM trust-boundary and prompt-handoff behavior.
- Use `/qa` semantics for targeted regression first, then broader checks. Browser or UI evidence is required when the change affects visible extension behavior.
- Use `/ship` semantics for branch, PR, GitHub checks, cloud Codex/GitHub review, and merge gating. PR merge always requires explicit user approval.
- If a sub-skill requirement conflicts with this project file, follow the stricter rule and record the reason in the CEO/control thread.

### Adversarial Council Mode

- Run the full council when the user asks for gstack/thread discipline, when behavior crosses the prompt trust boundary, when repeated review feedback appears, when UI-visible handoff behavior changes, before a ship/PR decision after a meaningful diff, or when branch/worktree/merge risk is non-trivial.
- The minimum council roles are `Real user`, `Developer`, `CTO`, `Cold reviewer`, `UI/UX architect`, and `Product manager`. Add `Release` only when public wording, changelog, update notices, or GitHub release content changes.
- Each council worker must be read-only unless explicitly assigned an isolated worktree. Its report must include `STATUS`, blocker findings or PASS rationale, evidence commands or paths, and unresolved risks.
- Do not blindly rerun the full council for tiny mechanical follow-up changes after a clean council pass. For those deltas, run targeted QA plus cold review, and state why the reduced review is sufficient.
- No council report is authoritative by itself. The CEO/control thread merges conclusions, resolves disagreements, verifies the final workspace state, and archives the worker threads.

### Execution Sequence

1. Define the goal and acceptance criteria before edits. For prompt-handoff work, acceptance must state what text reaches external generators and what remains structure-only JSON.
2. Run a planning pass: challenge the premise, identify at least a minimal viable approach and an ideal architecture approach, then choose the smallest approach that satisfies the user's actual outcome.
3. Run an engineering pass: map existing code, contracts, affected files, tests, and rollback/compatibility risk.
4. Delegate or perform execution according to the accepted plan. If the CEO/control thread performs a small integration patch directly, document why a separate executor would add more risk than value.
5. Run targeted verification first, then local gates. For prompt-handoff changes, run `npm run check:storage`, `npm run check:json-repair`, `npm run check:prompt-goal`, `npm run typecheck`, `npm run build`, and `git diff --check`.
6. Run cold review against the final diff. If any code or docs change after review, rerun the relevant QA/review checks on the new final diff.
7. Merge worker conclusions in the CEO/control thread, resolve disagreements explicitly, archive workers, and report result, key files, and verification status.

### Thread Protocol

- Create worker threads only with a concrete brief: role, task, files/scope, read-only or write boundary, required evidence, and output status.
- Worker reports must include `STATUS`, findings or actions, evidence paths/commands, and unresolved risks. They should not send the final user-facing answer.
- The CEO/control thread must read every worker report before finalizing, deduplicate findings, and decide what lands.
- Treat stale/dead workers as operational debt: archive workers that are superseded by newer scope, blocked without useful output, or already merged.
- Keep final validation in the CEO/control thread even when workers ran checks, because the CEO thread owns the final workspace state.

### Branch And Worktree Protocol

- Before edits, run `git status --short` and identify user-owned changes. Never reset, checkout, overwrite, or stage unrelated user changes.
- Read-only planning, QA design, and cold-review threads do not need branches or worktrees.
- Give a worker thread its own `codex/<task>-<role>` branch and isolated worktree when it will edit files, explore competing implementations, touch more than a small localized patch, or run in parallel with other work.
- Keep the CEO/control thread on the canonical workspace unless a clean branch switch is explicitly needed. Small integration patches may be done in the main workspace only when the CEO thread documents why isolation would add more merge risk than value.
- Worker branches never self-merge. A worker must report changed files, diff summary, tests run, remaining risks, and merge instructions.
- Merge only after the CEO/control thread reads the worker diff, checks for scope drift, resolves conflicts with current workspace changes, reruns the relevant verification gates, and completes cold review on the post-merge final diff.
- If tests fail, scope drift is found, merge conflicts overlap user-owned changes, or the worker branch is stale against current scope, do not merge. Archive or re-brief the worker thread and explain the blocker.
- After a successful merge or manual integration, archive the worker thread and remove its temporary worktree when it is no longer needed. Do not delete branches or worktrees that contain unmerged work without explicit user approval.

### PR And Cloud Review Gate

- For ship/PR requests, use a `codex/<task>` branch, stage only intentional files, commit only after local gates and final cold review pass, then push and create or update a PR.
- Do not include unrelated untracked assets in the PR unless the task explicitly covers them.
- PR body must state the user-visible change, local verification commands, council/cold-review status, and any known limitations. Do not expose internal prompt wording beyond what is needed to explain behavior.
- After PR creation, wait for GitHub checks and any configured cloud Codex/GitHub review. If cloud review or required checks are pending, failed, unavailable, or not visible, report `NEEDS_CONTEXT` or `BLOCKED`; do not merge.
- If cloud review requests changes, fix them on the same branch, rerun local gates, rerun the relevant Codex thread/cold-review pass, push an update, and wait for review again.
- Merge only after the PR has passing required checks, no unresolved cloud Codex/GitHub review blockers, and explicit user approval to merge.

### Cloud Feedback Loop

- Treat each cloud Codex/GitHub review comment as a failing test case until proved otherwise.
- Reduce repeated feedback to the smallest reproducible unit: exact input text, expected generator-facing prompt, and the function or contract that owns the behavior.
- Add or update a targeted regression before or with the fix. Then rerun the targeted check, broader local gates, and the relevant delta review.
- If the same issue class appears twice, freeze the loop, map the contract again, and ask whether the current architecture is still the smallest correct approach before patching more variants.
- Do not request another cloud review until the pushed branch contains all local fixes, local gates pass, and stale worker threads from the prior review round are archived.

## Loop Engineering

- Split work into independently verifiable units: contract, implementation, tests, UI copy, docs, QA, and cold review.
- Run an eval-first loop when possible: capture the failing behavior, implement the smallest fix, rerun the targeted regression, then run broader gates.
- Stop and reassess if the same diagnostic, same file, or same failed fix repeats without progress. Freeze the loop, reduce to the failing unit, then resume.
- Prefer durable project rules over memory. If a repeated workflow failure is found, update `AGENTS.md` or a project script so the next run does not rely on recall.
- Worker-thread reports are loop inputs, not truth. The CEO/control thread decides, edits or merges, verifies, archives completed workers, and marks the goal complete only after the evidence matches the acceptance criteria.

## Execution Plane Audit

- Before reporting `DONE`, run `git status --short` and confirm only intentional files are staged or committed. Unrelated untracked assets must remain unstaged.
- Confirm every worker thread report has been read and merged into the CEO/control thread's truth state.
- Archive worker threads that are merged, stale, dead, obsolete, failed, or superseded. A clean finish should leave only the CEO/control thread active for the task.
- Confirm the local branch, pushed branch, PR head SHA, and latest cloud review target the same commit.
- Confirm local gates and required GitHub checks are passing or explicitly report `NEEDS_CONTEXT`/`BLOCKED`.
- Confirm no PR merge has happened unless the user explicitly approved the merge after the final checks.
