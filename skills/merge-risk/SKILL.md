---
name: merge-risk
description: Score how risky a branch or pull request is to merge, label it, and apply the review and split policy for that level. Use before you open a PR, when a review starts, or when the user asks how risky a PR is or how to split one. Not for finding what a change could break outside the diff, use blast-radius.
---

# Merge risk

`scripts/risk.mjs` scores a change from its diff: size, sensitive paths (schema and migrations, auth, CI and deploy, money, backend, dependencies, configuration) and missing tests. It is the one source of the rules. The corral PR Stack panel imports the same file, so the panel and the agents always agree.

```bash
R=~/.claude/skills/merge-risk/scripts/risk.mjs
node $R branch            # the current branch against the default branch, before a PR exists
node $R pr 123            # an open PR
node $R pr 123 --write    # also set the risk:<level> label and the Risk block in the PR body
```

Add `--json` for machine output. A `risk:<level>` label that is higher than the score wins, so a person or a reviewer can raise the level. Nobody lowers it below the score.

## Policy

| Level | Review | Split | Merge |
|---|---|---|---|
| low | one round, one reviewer | no | auto-merge allowed when CI is green |
| medium | up to 3 rounds, one reviewer | only if it mixes concerns | a person approves |
| high | up to 4 rounds, two reviewer model families, plus `blast-radius` | yes, before review | a person approves, never auto-merge |

`POLICY` in the script holds these numbers. `review-loop` and `herdr-review` read the level and set their rounds from it.

## When you open a PR

1. Run `node $R branch`.
2. If the level is high, split first (below). Open the slices instead of one PR.
3. After `gh pr create`, run `node $R pr <number> --write`. The label and the Risk block are then on the PR.

## Split a high-risk change

A reviewable slice has one concern and fewer than about 400 changed lines, and it passes its own checks. Split along these seams, in this order, so each slice builds on the one before:

1. Schema, migrations and generated types.
2. Backend functions and their tests.
3. Shared packages and helpers.
4. UI that uses them.
5. Clean-up: renames, removed code, docs.

For each slice:

- Make a branch from the previous slice (a stack), with only that slice's files. Use `git checkout <source-branch> -- <paths>` to copy files from the big branch.
- Run the fast local checks for the packages the slice touches: typecheck, lint and the tests of those packages. Run the full local CI once, on the top of the stack.
- Write a PR body whose test plan covers only that slice. Say what the next slice adds.
- Score it with `node $R branch <parent-branch>`. A slice that still scores high splits again, or its PR body says why it cannot.

Push the stack once, when every slice passes. Open the PRs bottom first, each based on the one below. Then run `--write` on each.

A change that cannot split (one migration and the code that must ship with it) stays one PR. Say why in its Risk section, and give it the high-risk review.

## While reviewing

- Read the level from the label, or run `node $R pr <number>`.
- For high risk, also run the `blast-radius` skill on the riskiest reason, for example the schema change.
- After the review, run `--write` again if the diff changed.
