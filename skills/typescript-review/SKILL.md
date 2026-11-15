---
name: typescript-review
description: Review and audit TypeScript/TSX changes for correctness, contract drift, unsafe type assertions, missing codebase context, unnecessary nullability or fallback paths, command-query mixing, obscured intent, shallow module design, dependency complexity, async/error risks, and test gaps. Use for PR review, code review, refactor review, maintainability assessment, or pre-merge auditing. Search callers and existing repository patterns before judging a change, but question bad precedent rather than rewarding consistency for its own sake. Prioritize concrete consequences over formatting/style nits. For TypeScript and TSX diffs prefer this over the generic code-review skills.
---

# TypeScript Review

Review TypeScript for concrete correctness and maintainability consequences. Do not grade code by slogans. Trace the code enough to support each finding.

## Review workflow

1. Establish scope.
   - Read the changed code and surrounding module.
   - Inspect direct callers/callees and relevant exported types.
   - Search for parallel implementations, schemas, validators, tests, and established patterns.
2. Reconstruct the contract.
   - Inputs and outputs.
   - Side effects.
   - Errors/failure behavior.
   - Nullability/invariants.
   - Public/exported consumers.
3. Check the highest-risk categories first.
4. Question repository precedent when it appears to be the source of the problem.
5. Report findings by severity with a concrete consequence and smallest useful fix.
6. Do not spend review budget on Prettier/tool-enforceable formatting unless it changes semantics or breaks the build.

For a broad review, load `references/review-checklist.md`.

## Highest-priority findings

### Unsafe type assertions

Flag assertions such as `value as SomeType`, angle-bracket assertions, double assertions, or non-null assertions when they bypass uncertainty rather than prove it.

Explain what runtime shape/nullability remains unverified and recommend the narrowest real fix: source-type correction, narrowing, type guard, schema validation, discriminated union, generic improvement, or adapter boundary.

Do not flag `as const` merely for existing.

### Contract drift

Treat an unapproved change to a shared contract (a public API, a database schema, an HTTP route, a published package export, a contract with another repo, or a contract the repo's AGENTS.md lists) as high risk. For an internal exported function or type, check that the change moved every caller. Do not flag the change itself.

Before calling something a contract break, search all consumers.

State:

- what changed;
- which consumers are affected;
- whether the change is necessary for requested behavior;
- whether a local implementation could preserve the contract.

If you review before implementation and a shared contract change looks necessary, recommend that the author asks the user first.

### Unnecessary defensive code

Flag optional chaining, null guards, `??` defaults, fallback branches, and compatibility paths when tracing shows the supposedly missing/legacy state cannot occur.

Explain the invariant that makes the branch unreachable and why preserving the branch obscures bugs or creates dual behavior.

Do not flag real nullable/error paths merely because they are defensive.

### Blind copying of repository patterns

Repository consistency is not automatically correctness.

If the reviewed change copies a questionable pattern, explain the actual coupling or complexity it carries forward. Examples include leaking framework mechanisms through domain APIs, passing event emitters through unrelated layers, wrappers that mirror dependencies without hiding complexity, or callers needing to know internal sequencing.

Prefer evidence over "this violates pattern X."

## Intent and naming

- Function and variable names should reveal domain intent at the call site.
- Use consistent vocabulary for the same concept.
- Flag names that conflict with actual behavior because they create semantic traps for future callers.
- If intent itself is ambiguous, identify the ambiguity explicitly rather than guessing the desired rename/behavior.

## Command-query separation

Flag functions that both mutate observable state and behave as general queries when the combination creates hidden sequencing, surprising effects, or hard-to-test callers.

Do not mechanically flag commands that return an inherent command result such as a created identifier or status.

## Complexity and module depth

Use the spirit of *A Philosophy of Software Design*:

- prefer simple interfaces that hide meaningful complexity;
- minimize dependencies crossing module boundaries;
- avoid obscurity and knowledge leakage;
- prefer cohesive deeper modules over many shallow wrappers.

Do not equate "short function" with "good function." A review finding should identify exposed complexity, inappropriate responsibility, or indirection without value.

Watch for both extremes:

- overly broad functions/modules with unrelated responsibilities;
- excessive decomposition into pass-through helpers that make control flow harder to follow.

## State, dependencies, and effects

Flag:

- unexpected mutation of caller-owned data;
- shared mutable global state;
- hidden side effects behind query-like names;
- high-level domain code constructing concrete infrastructure unnecessarily;
- broad interfaces whose consumers use only a small portion;
- dependency chains that expose implementation details across layers.

Prefer composition and narrow capability boundaries when they concretely reduce coupling.

### Implicit state machines

Look for state that moves through stages but is stored as several flags or optional fields: `isLoading`, `isSaving`, `hasError`, `error?`, `submittedAt?`, or a set of `useState` booleans that change together. With n flags the type allows 2^n combinations, and usually only a few of them are valid. Code then guards against the invalid ones, or misses them.

Flag it when one of these is true:

- two flags must not be true together, or one is meaningful only when another is set (`error` only when `hasError`);
- the change adds another flag or optional field to state that already has two or more;
- a transition sets several flags in one place, and a missed one leaves a mixed state (`setLoading(false)` without `setError(null)`);
- the same stage is read from different fields in different places.

The fix is one discriminated union for the stage, with each variant holding only the data valid in it. For example `{ status: "idle" } | { status: "saving" } | { status: "failed"; error: string } | { status: "saved"; savedAt: number }`. In React, use one `useState` of that union, or a `useReducer` when transitions have rules. For stored records, use one `status` field with a literal-union validator, not several booleans or nullable timestamps. Then a `switch` on `status` can check that every case is handled (a `never` default).

Do not flag independent flags (a `muted` and a `pinned` setting), a single boolean, or a stage that a library already models (a query hook's loading result). Do not ask for a state-machine library unless the transitions need guards, timers or history that a reducer would hide.

## Async and errors

Check for:

- accidentally serial independent async work;
- unobserved promises;
- swallowed errors;
- raw-string throws/rejections;
- lost error context;
- races caused by shared mutable state or hidden ordering;
- retries/timeouts/fallbacks that are added without proving they are required.

## Tests

Review whether changed behavior is protected at the right boundary.

Prefer findings about missing behavior, invariant, edge-case, or regression coverage over arbitrary coverage percentages.

A test should communicate one behavior/concept and be independent/repeatable. Multiple assertions are fine when they jointly verify that behavior.

## React-specific review

When reviewing TSX/React:

- flag a new `useMemo` or `useCallback` when the change gives no evidence of a valid case: a measured expensive computation, or a value whose identity a dependency array or a memoized child needs;
- flag it too when a plain expression or a restructure would remove the need. Memo hooks need evidence, not user approval.

## Severity and finding format

Order findings by impact:

- **Critical**: correctness, data loss, security, broken external contract, race, or unhandled failure.
- **Major**: likely bug source, contract instability, unsafe type bypass, misleading invariant/fallback, or substantial coupling that makes the change unsafe.
- **Minor**: localized readability/testability/complexity issue with a concrete future cost.
- **Nit**: omit by default; include only when requested and tooling cannot enforce it.

For each finding include:

1. **Consequence** — what can go wrong or become hard to change.
2. **Evidence** — the relevant code path/caller/invariant.
3. **Smallest fix** — a concrete change, not a principle name.

Avoid comments like "not clean," "violates SOLID," or "bad abstraction" without explaining the actual consequence.

## Review completion check

Before finalizing a substantive review, confirm you checked:

- callers and shared contracts;
- unsafe assertions/non-null suppression;
- actual data origin before null/fallback criticism;
- command/query side effects;
- related boolean flags or optional fields that should be one status union;
- misleading names or intent mismatches;
- hidden dependencies and shallow/deep module balance;
- async/error paths;
- changed behavior tests;
- React memoization when relevant;
- whether a suspicious existing pattern should be challenged rather than copied.
