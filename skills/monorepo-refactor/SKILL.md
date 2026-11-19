---
name: monorepo-refactor
description: Plan and run a structural refactor of a whole feature area or TypeScript monorepo, covering its packages, backend folders, tables and stored state, shared UI, docs and tests, as a proposal page the user approves, then a sequence of small green PRs. Use when the user asks to refactor, restructure or simplify a feature area or several packages, or to audit one for dead code, shallow modules or implicit state machines before a refactor. Not for one focused change, use refactor. Not for one module's interface, use codebase-design.
---

# Monorepo refactor

The aim is less for a reader to hold in mind: fewer places per rule, fewer ways to do one thing, and fewer invalid states. Judge every proposal against [PRINCIPLES.md](PRINCIPLES.md). Read it before step 2.

## 1. Fix the target state

- Refactor the code as it will be, not as it was. When open PRs will change the area, build a local merge of their heads in a detached scratch worktree and analyse that. Never push it. Never touch branches that someone else is merging.
- Record the scope: the folders, packages, apps and tables in the area, with their file and line counts.

Done when you have the scratch tree and the scope list.

## 2. Map the area

Split the map into independent read-only analyses, and run them in parallel when the area is large:

1. **Modules.** Group every source file by domain area. Find pass-through files (the deletion test), duplicated rules, functions that exist twice, and commands named like reads.
2. **Packages and dead code.** For each package: its purpose, its exports and who imports each one. List the unused packages, files, exports and public functions that only tests call, with evidence.
3. **Tables and stored state.** For each table: who writes it, who reads it, and why it is a table. Find copies of facts, dead fields and implicit state machines.
4. **UI.** Find components that two apps build separately.
5. **Docs.** List each doc with its stale parts, overlaps and diagrams.

Each brief names the principles from PRINCIPLES.md that apply, and asks for file and line evidence and caller counts.

Done when every source file in scope has a domain area, and every package has its importers counted.

## 3. Verify the claims

An analyst's claim is a lead, not a fact. Check each claim that drives a decision before it goes on the page:

- "dead": search the whole repo, tests and scripts included
- "a bug": trace the path that would trigger it
- "never read": list the readers

Record what you confirmed, what you corrected, and what turned out to be a test-only use.

Done when each claim on the page is confirmed, corrected or marked unverified.

## 4. Write the proposal page

Publish one artifact page, and update it on each round. In this order:

1. The decisions the user owes, at the top, each with your recommendation, then the answers once given.
2. Where the area is today, in counts.
3. The principles, with what each one changes here.
4. Delete first: what goes, with evidence.
5. The deep modules: today's shape against the proposed one, as small type sketches.
6. Files before and after, as two trees side by side. Every file of today appears in the after tree: moved, merged or deleted.
7. How the parts link up, before and after, as two Mermaid diagrams, plus one concrete flow before and after.
8. Tables and state: each change with its migration.
9. Packages, shared UI, implicit state machines and conventions.
10. How we know nothing breaks: the pins, the equivalence checks, and which contracts change.
11. The PR order, with the risk of each PR.
12. Considered and rejected, with the reason.

When the user asks for best practice, read the conventions files (`AGENTS.md`, `CONTRIBUTING.md`) and the package layouts of respected TypeScript monorepos, and record what each practice changes in the plan.

Done when the page answers "what changes, why it is simpler, and how we know nothing breaks" for each part.

## 5. Get the decisions

The stop points in `GLOBAL.md` apply: a shared contract, a schema, a new shared abstraction, deleting files you did not create. Put each one on the page as a decision. Do not ask about anything else; decide it and say so on the page. Start no code until the user answers, then record the answers on the page and in memory.

## 6. Run the PRs

Do one PR per row of the PR order. Use the `refactor` skill inside each PR: pin the behaviour, subtract first, move in small steps, and prove the behaviour is unchanged.

- Each PR stays green on the repo's full local checks.
- Order: subtraction first, then the deep modules, then folder moves, then schema and stored state last.
- A behaviour fix found on the way gets its own PR. It is never folded into a move.
- Update the proposal page as PRs land.
