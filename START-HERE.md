# Start here

Pick one skill for the task. Most skills load on their own when the task matches their
description. `improve-codebase-architecture` loads only when you type its name.

## Which skill for which task

| Task | Skill |
|---|---|
| Write or change TypeScript or TSX | `typescript-development` |
| Review a TypeScript diff | `typescript-review` |
| Write or change code under `convex/` | `convex-development` |
| Check a Convex API for the installed version | `convex-docs` |
| Review a Convex diff | `convex-review` |
| Prove a Convex function refuses the wrong caller | `convex-verify` |
| Fix a bug that has a cheap test target | `tdd` |
| Find the cause of a hard bug or a slowdown | `diagnosing-bugs` |
| Restructure code without changing behavior | `refactor` |
| Design a module interface or place a seam | `codebase-design` |
| Scan a codebase for refactor candidates | `improve-codebase-architecture` |
| Name domain terms, write a glossary or an ADR | `domain-modeling` |
| Stress-test a plan before you build | `grilling` |
| Answer a design question with throwaway code | `prototype` |
| Find what a change could break outside the diff | `blast-radius` |
| Check a benchmark number before you report it | `benchmark-checklist` |
| Write a commit message or a PR | `commit-pr` |
| Remove AI tells from prose that people read | `unslop` |
| Write a skill, `AGENTS.md` or `CLAUDE.md` | `writing-for-agents` |

## Near misses

- `typescript-development` writes code. `typescript-review` audits a diff and does not fix it.
- `convex-development` writes Convex code. `convex-review` reviews it. `convex-verify` proves it
  with tests. `convex-docs` only looks up the current API.
- `tdd` fixes a bug with a known cause. `diagnosing-bugs` finds the cause first.
- `refactor` changes one known area. `improve-codebase-architecture` finds the areas to change.
- `codebase-design` gives the design words (module, interface, depth, seam). The other design
  skills use it.
- `grilling` asks the user questions about a plan. `prototype` builds code to answer a question.
- `blast-radius` checks one risky change. It is not a full branch review.
- `unslop` edits prose for people. `writing-for-agents` writes documents that agents read.
