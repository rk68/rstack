---
name: refactor
description: Change the structure of code without changing its behavior: rename, extract, inline, dedupe, move, or reshape an internal API. Use when the user asks to refactor, clean up, consolidate or restructure code, or when a change needs a structural step first. Not for finding refactor candidates across a codebase, use improve-codebase-architecture. Not for new behavior or bug fixes.
---

# Refactor

The structure changes. The behavior does not.

If the cleanup reveals a missing feature or a real bug, split it out. Ship the structural change first, against the pinned behavior. This skill is for a focused or medium change. Plan a large or cross-cutting reshape with the user first.

## Steps

1. **Pin the behavior first.** Read the affected code and its callers to learn what it does. Then write a characterization test, a snapshot or an equivalence script that captures the current behavior, before any structure moves. If the area has no tests, write the pin first. A typecheck or a lint is not a pin.
2. **Name the missing structure.** Model the domain: name the states and concepts the code handles, and make invalid states impossible to represent. Boring code stays when the shape is already clear and local. The reshape must delete branches or invalid states, not add indirection.
3. **Name the target shape.** Say what the module layout, the types and the call graph would be if you built them today. Use the `codebase-design` vocabulary (depth, seams, locality). If the target crosses a module boundary and more than one shape is plausible, sketch two or three shapes and choose with the user. Ask the user before you add a new shared abstraction.
4. **Subtract before you add.** Delete dead code, collapse one-caller wrappers, drop redundant validators and remove orphan references before you build the new shape. Ship the smallest change that reaches the target shape. Revert a cleanup that only "might help".
5. **Move in small steps.** Keep the pin green after each step. For an internal API reshape, migrate every caller and delete the old API in the same change: no compatibility shims and no parallel old and new paths. Use a staged migration only across a deployed boundary or stored data. Check every rename against the files: renames miss usages in strings, docs and back-references. If you can start a subagent, you may hand long mechanical edits to one subagent with an exact scope (the file paths, the names that move, the behavior to hold).
6. **Prove the behavior is unchanged** on the real artifact, not "it compiles". For a larger reshape, run an equivalence check: a script that diffs old and new outputs, a recorded baseline replayed against the new code, or a run of the app with the repo's verification skill.
7. **Keep it only if it helps.** The measure is less for a reader to hold in mind. If the diff does not lower that anywhere, revert it.
8. **Commit in order:** first the subtraction, then the reshape, then any follow-on cleanup. Each commit stays green.

## Report

The structure that changed, the pin you held it against, the equivalence proof, what got simpler for a reader, and what you reverted. No new behavior.

<!--
Source: pstack refactoring playbook (https://github.com/cursor/plugins/tree/main/pstack at 2776ddd2), MIT License, Copyright (c) 2026 Lauren Tan.
Changes: a standalone skill instead of a playbook. A new shared abstraction needs the user's approval. Staged migration allowed only across deployed boundaries or stored data.
-->
