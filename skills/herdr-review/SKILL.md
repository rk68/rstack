---
name: herdr-review
description: Review a branch with one Codex (Astra) reviewer agent started through Herdr's `hc`, fix its verified findings once, and push one draft. Use when the session runs inside Herdr (`HC_TERMINAL_ID` is set) and the user says "review", "review this branch", "review and ship", or asks for a review before a PR. With Paseo, use review-loop. Not for auditing a diff without fixing it, use typescript-review.
---

# Herdr review

One reviewer agent reads the branch. You verify each finding and fix the real ones once. Then you push one draft. This is the review process the user chose on 2026-11-13: one pass, one reviewer, no second round.

**Arguments:** $ARGUMENTS (optional: a PR number, focus areas, the name of a live reviewer to reuse)

Read the `herdr` skill first. It says to read `hc --skill`.

## Rules

- If `$HC_TERMINAL_ID` is empty, say that this session is not inside Herdr and use `review-loop` or a plain Agent tool review instead.
- Each push starts paid CI runners. Commit locally. Push once, at the end, after the local CI checks pass.
- Only real defects block: correctness, broken contracts, data loss, security, command-query mixing (see `typescript-review` and `convex-review`), and test gaps that hide a real bug. No style or naming nits.
- The reviewer does not edit, commit, stash, reset or check out. It shares your worktree.

## 1. Prepare

1. Record the worktree path, the branch, and `BASE=$(git merge-base HEAD origin/main)`.
2. If `gh pr view --json number,url` finds a PR, record it.
3. Commit the uncommitted work locally with the **commit-pr** conventions. Record `HEAD_SHA`.
4. Run the local CI checks (see `review-loop`, section "Local CI checks"). Run the slow ones as hc terminals (`hc run --bg --name ci ...`, then `hc wait ci`), so that you stay reachable.

## 2. Start the reviewer with its task

The `reviewer` template (`~/.config/herdr-core/templates/reviewer.md`) starts Codex on Astra with high reasoning and full access, and carries the standing review rules. Check that it exists with `hc templates`. Write the task to `<scratchpad>/review-task.md`:

```
Review branch <branch> in <worktree path>: the diff <BASE>..<HEAD_SHA>.
Intent: <one paragraph: what the change must do, from the ticket, PR body or commits>.
Read the repo's AGENTS.md or CLAUDE.md for its rules. Read REVIEW.md if it exists.
Apply ~/.claude/skills/typescript-review/SKILL.md to .ts and .tsx changes.
If the diff touches convex/, also apply ~/.claude/skills/convex-review/SKILL.md.

Rules:
- Report only actionable defects: correctness, broken contracts, data loss or corruption, security, command-query mixing, and test gaps that hide a real bug. No style or naming nits.
- Report a defect that existed before this diff only if the diff makes it reachable. Label it "pre-existing".
- For each finding give: severity (P1/P2/P3), file:line, a concrete failing scenario with values, the root cause, and the fix you expect.
- Reproduce a finding with a test, script or run where you can, and say so.
- Write all findings as Markdown to <scratchpad>/review-findings.md. If none remain, write exactly the line: NO ACTIONABLE FINDINGS
- When done or stuck, run: hc send <your HC_TERMINAL_ID> "<file path, or the blocker>"
<focus areas, if any>
```

Start the reviewer with the task as its first message. The task goes in the `run` command, because a send to a starting agent can be lost:

```bash
hc run --bg --name review --cwd "<worktree path>" reviewer "$(cat <scratchpad>/review-task.md)"
```

Check `first_message.sent` in the result. If it is false, read the screen with `hc read review` before you send the task again.

If the template is missing, start Codex directly: `hc run --bg --name review --cwd "<worktree path>" -- codex --no-daemon -m gpt-6-astra -c model_reasoning_effort="high" --dangerously-bypass-approvals-and-sandbox "<task>"`. If the name `review` is taken (`hc ls`), use another name. If the model is not available, use the closest Codex model and tell the user. If the arguments name a live reviewer, send it the task with `hc send <name> "..."` instead.

## 3. Wait for the report

Keep working on things that do not depend on the review. The reviewer's report arrives in your terminal as `<hc from="tN review">...</hc>`. To wait for it, run `hc wait review` and wait again after each `timeout` check-in. Do not sleep or poll.

If hc says the reviewer is `blocked` or in `error`, read its screen with `hc read review --lines 80`. Ask the user before you answer a permission dialog.

Read `<scratchpad>/review-findings.md`. Do not rely on the one-line report.

## 4. Verify and fix once

1. For each finding, read the cited lines. Try to reproduce it, or try to disprove it.
   - **Real:** fix it.
   - **Not real:** record the reason and the evidence for the report.
   - **Needs a product decision:** ask the user. Fix the other findings meanwhile.
2. Group the real findings by root cause. Patch a one-off bug in a sound design. When two findings share a cause, or a patch adds a special case or a second source of truth, do the redesign check from `review-loop` step 4. A redesign that changes a shared contract is a stop point.
3. Fix the findings yourself. Run the local CI checks. Commit locally with the **commit-pr** conventions.

Do not start a second review round.

## 5. Finish

1. Run the full local CI checks one last time.
2. Push once. If no PR exists, open a draft PR with the **commit-pr** conventions. If a PR exists, update its body to describe the whole branch.
3. Remove the reviewer: `hc kill review; hc rm review`. Keep it only if the user asked to reuse it.
4. Report to the user: each finding with fixed, rejected (with evidence) or held for a decision, the head SHA and the PR link. For a UI change, publish the screenshots with the report.
5. Leave the PR in draft.
