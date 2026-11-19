---
name: commit-pr
description: >-
  Write commit messages, PR titles and PR descriptions. Enforces Conventional
  Commits with the repo's existing scopes, the standard PR body sections, and an
  optional release-note fragment when the repo asks for one. Use whenever you
  write a commit message, or open, update, or finish (push the final commit of a
  work session to) a pull request, not only when explicitly asked.
---

# Commit and PR conventions

Apply this automatically. Whenever you commit, or open, update or finish a PR, the
output must follow the contract below, so every commit and PR carries the required
pieces in the same format.

If the repo's `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md` or PR template sets a
different convention, follow the repo.

---

## 1. Commit messages and PR titles: Conventional Commits

Format: `type(scope): subject`

- **type**: `feat` `fix` `refactor` `perf` `docs` `test` `chore` `build` `ci`
- **scope**: reuse a scope the repo already uses. Run
  `git log --format=%s -n 200 | grep -oE '^[a-z]+\([^)]+\)' | sort | uniq -c | sort -rn`
  to see them, and pick the closest match. Do not invent a new scope casually. If no
  scope fits, use the package or area name, or leave the scope out.
- **subject**: imperative mood, lowercase, no trailing period, about 70 characters at most
  ("add", not "added" or "adds").
- **breaking change**: put `!` after the scope (`feat(api)!: ...`) and add a
  `BREAKING CHANGE: <what changed and how to migrate>` footer.
- **Do not hand-write the `(#NNNN)` suffix.** GitHub's squash merge appends the PR number
  to the title.

The PR **title** follows the same format as the lead commit.

---

## 2. PR body

Always include these sections:

```
## What
<what changed, briefly>

## Why
<the rationale, which the diff does not show. Infer it from the branch, the ticket and the
commits. If you cannot infer it, write your best reading, mark it as a guess, and put one
question in your report. Open the PR without waiting for the answer.>

## Test plan
<how it was verified: the changed test files, the commands you ran, manual steps>

## Risk
<blast radius, migrations, anything to watch. The merge-risk block goes here too.>

Closes <TICKET-ID>   <- only if a ticket exists
```

---

## Merge risk (every PR)

Before you open a PR, run `node ~/.claude/skills/merge-risk/scripts/risk.mjs branch`. If the level is high and the change can split, split it into a stack first, as the `merge-risk` skill says. After `gh pr create`, run `node ~/.claude/skills/merge-risk/scripts/risk.mjs pr <number> --write`. That sets the `risk:<level>` label and the block in the Risk section.

---

## 3. Release-note fragment (optional)

Add this block only when the repo's `AGENTS.md`, `CLAUDE.md` or PR template asks for a
release-note fragment. If the repo defines its own format, use that format instead.

````
```release-note
audience: external          # external | internal | none
category: feature           # feature | improvement | fix | perf | security | breaking
area: <scope>               # the commit scope
summary: <one line>         # external: benefit voice ("You can now..."), internal: plain
```
````

Rules:

- **audience**
  - `external`: a customer can observe it: UI, public API, or a behavior change a user
    notices.
  - `internal`: developers or operations only (internal tooling, infrastructure,
    observability).
  - `none`: no release note (chore, pure refactor, test-only change, dependency bump).
- When the repo asks for the block, emit it even for `none`.
- **summary voice**: for `external`, write the benefit to the user ("You can now export
  reports as CSV"), not the implementation ("added CSV serializer"). For `internal`, plain
  developer language is fine.
- When you guess `audience` from the diff, state the guess and the basis so the user can
  correct it in one word, for example "audience: external (touches the settings page)" or
  "audience: none (migration and generated types only)".

---

## 4. Keep the PR body true at merge

PRs grow commits after they are opened. The user marks a PR ready for review, so do not run
`gh pr ready` or mark a PR ready in another way. The PR body must describe the whole PR,
not only the first commit:

- On the **final push of each work session**, before you report the PR back, re-check the
  PR body (and the release-note fragment, if there is one) against the full diff of the
  branch against the default branch.
- Never leave a PR body that only reflects the first commit.
