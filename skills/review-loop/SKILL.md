---
name: review-loop
description: Review a branch with two Paseo reviewer agents (Codex and Claude) that then fix their own verified findings, and push once when the branch is clean. Use when the user says "review loop", "review this branch", "review and ship", or asks for a review before a PR or on an open PR. Not for auditing a TypeScript diff without fixing it, use typescript-review.
---

# Review loop

Two reviewer agents read. You verify each finding and decide patch or redesign. The reviewers apply the fixes, one at a time. The loop ends when the reviewers answer `NO ACTIONABLE FINDINGS`, or at the round limit for the branch's merge risk.

**Arguments:** $ARGUMENTS (optional: a PR number, focus areas, existing reviewer agent ids to reuse)

## Rules

- Each push starts paid CI runners. Commit locally after each round. Push once, at the end, after the local CI checks pass.
- Only real defects block: correctness, broken contracts, data loss, security, command-query mixing (see `typescript-review` and `convex-review`), and test gaps that hide a real bug. No style or naming nits.
- The merge risk sets the size of the review (see the `merge-risk` skill): low is one round with only the Codex reviewer, medium is up to 3 rounds with both reviewers, and high is up to 4 rounds with both reviewers plus a `blast-radius` pass.
- Round 1 reviews the full branch diff. Later rounds review only the diff since the previous round.
- Stop at the round limit. Report the open findings to the user. Do not start another round.
- Reviewers never edit during a review. They edit only in the fix step, one reviewer at a time, because they share one worktree.
- Reviewers commit locally. They do not push, stash, reset or check out another branch, because they share one worktree with you, the git stash list is shared across worktrees, and step 6 owns the single push.

## 1. Prepare

1. Record the worktree path, the branch, and `BASE=$(git merge-base HEAD origin/main)`.
2. If `gh pr view --json number,url` finds a PR, record it. If `git log @{u}..` shows commits that a reviewer did not see, include them. The PR is updated in step 6.
3. Commit the uncommitted work locally with the **commit-pr** conventions. Record `ROUND_BASE=$BASE` and `HEAD_SHA`.
4. Run the local CI checks (see "Local CI checks"). Fix failures before any reviewer starts.
5. Run `node ~/.claude/skills/merge-risk/scripts/risk.mjs branch` and record the level. If it is high and the branch can split, split it first as the `merge-risk` skill says, and review each slice. If it is high, also run the `blast-radius` skill on its riskiest reason before round 1.

Done when the branch is committed locally and the local CI checks pass.

## 2. Start the reviewers

Create two Paseo agents with `create_agent`, in the same workspace (omit `workspaceId`), both with `notifyOnFinish: true`:

| Reviewer | `provider` | `settings` |
|---|---|---|
| Codex | `codex/gpt-6-astra` | `{ "modeId": "full-access", "thinkingOptionId": "high" }` |
| Claude | `claude/claude-opus-5-5` | `{ "modeId": "bypassPermissions", "thinkingOptionId": "high" }` |

If an id in the arguments names an existing reviewer, use `send_agent_prompt` to reuse it. If a provider or model is unavailable, run `list_providers` and pick the closest model. Tell the user.

Brief for both (title `[Review] <branch>`):

```
Review branch <branch> in <worktree path>: the diff <ROUND_BASE>..<HEAD_SHA>.
Intent: <one paragraph: what the change must do, from the ticket, PR body or commits>.
Read the repo's AGENTS.md or CLAUDE.md for its rules. Read REVIEW.md if it exists.
If the diff touches convex/, also apply the convex-review skill's checklist (~/.claude/skills/convex-review/SKILL.md).
If the diff touches .ts or .tsx files, also apply the typescript-review skill (~/.claude/skills/typescript-review/SKILL.md).

Rules:
- Review only. Do not edit, commit, stash or check out anything.
- Report only actionable defects: correctness, broken contracts, data loss or corruption, security, command-query mixing, and test gaps that hide a real bug. No style or naming nits.
- Report a defect that existed before this diff only if the diff makes it reachable. Label it "pre-existing".
- For each finding give: severity (P1/P2/P3), file:line, a concrete failing scenario with values, the root cause, and the fix you expect.
- Reproduce a finding with a test, script or run where you can, and say so.
- If no actionable defects remain, reply with exactly the line: NO ACTIONABLE FINDINGS
<focus areas, if any>
```

Wait for both finish notifications. Do not poll.

## 3. Verify each finding

1. Merge the two lists. A finding that both reviewers report is high signal.
2. For each finding, read the cited lines. Then try to reproduce it, or try to disprove it.
   - **Real:** fix it in step 4.
   - **Not real:** write the reason and the evidence. Send it back in step 5, so the reviewer does not raise it again.
   - **Needs a product decision:** ask the user. Hold only that finding. Continue the round with the other findings, and add the answer to the next round.

## 4. Patch or redesign

1. Group the real findings of this round and of all earlier rounds by root cause.
2. **Patch** only when a finding is a one-off bug in a sound design: one missing check, one wrong condition.
3. **Redesign check.** Do it for every real finding. A redesign is likely when two or more findings share a cause, when a cause comes back in a later round, or when a patch adds a cleanup path, a special case or a second source of truth. Answer: "If I built this feature from scratch now, knowing these findings, what design would I choose?" Compare it with the current design: what each one removes, adds and risks.
   - If the new design removes the class of failure and changes no shared contract, build it.
   - If the new design changes a shared contract, show the user the cause, both designs and the code each removes, and wait for the answer, because a shared contract change is a stop point (GLOBAL.md). Continue with the findings that do not depend on it. If the comparison is close and no shared contract changes, choose one design and give the reason in the report.
4. **Assign the fixes.** Send each reviewer the verified findings it raised, with your patch-or-redesign decision for each, using `send_agent_prompt` with `notifyOnFinish: true`. Send to one reviewer, wait for it to finish, then send to the other. Give a redesign to one reviewer only, and give it the full comparison. A finding both reviewers raised goes to the first reviewer.

   ```
   Fix these verified findings in <worktree path>. You may edit now.
   <one block per finding: the finding, patch or redesign, the expected shape>
   Rules:
   - Fix at the root cause. Do not add a guard for a state that should not exist.
   - Add a test only when it is cheap and checks behavior a user would see.
   - Run the local CI checks: <the commands>. They must pass.
   - Commit locally with the commit-pr conventions. Add no Co-Authored-By trailer and no other Claude or Codex attribution. Do not push: the loop pushes once at the end.
   - Reply with one line per finding: what changed, which file, which test.
   ```

5. Read each fix diff yourself. If a fix is wrong or adds an unjustified line, send it back to the same reviewer. Record the new `HEAD_SHA`.

## 5. Re-review

Set `ROUND_BASE` to the head the reviewers last saw. Send to each reviewer with `send_agent_prompt`, `notifyOnFinish: true`:

```
Fixed: <one line per finding: what changed, file, test if any, and which reviewer fixed it>.
Redesigned: <cause>: <new shape, code removed>, if any.
Not changed: <finding> because <evidence>.

Re-review only the diff <ROUND_BASE>..<HEAD_SHA>, with the same review rules: no edits during the review. Check the other reviewer's fixes too. Do not repeat findings listed under "Not changed". If none remain, reply with exactly: NO ACTIONABLE FINDINGS
```

Go back to step 3. When the reviewers reply `NO ACTIONABLE FINDINGS`, or at the round limit, go to step 6.

## 6. Finish

1. Run the full local CI checks one last time.
2. Push once. If no PR exists, open a draft PR with the **commit-pr** conventions. If a PR exists, update its body to describe the whole branch. Then run `node ~/.claude/skills/merge-risk/scripts/risk.mjs pr <number> --write`.
3. Archive both reviewer agents with `archive_agent`.
4. Report to the user:
   - one row per round: head, findings, and for each one fixed, rejected or redesigned
   - the merge risk and the open findings, if the loop stopped at the round limit
   - the PR link
5. Leave the PR in draft.

## Local CI checks

Run the same checks that CI runs, so CI passes on the single push.

1. If the repo's `AGENTS.md` or `CLAUDE.md` names a local CI command, run it.
2. If not, read `.github/workflows/*.yml` for the pull-request jobs. Run the same commands: typecheck, lint, format check, tests, builds. Skip a job only when it needs a secret or a service you do not have, and say so in the report.
