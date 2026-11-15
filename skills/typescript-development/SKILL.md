---
name: typescript-development
description: Write, refactor or fix TypeScript and TSX. Use whenever you edit a .ts or .tsx file: adding a feature, fixing a bug, changing a module or API, or refactoring. Covers type modelling, contract safety, nullability, module depth, and the ban on unsafe assertions. Not for auditing a diff someone else wrote, use typescript-review. Not for React render performance.
---

# TypeScript Development

Write TypeScript that is readable, type-safe, locally consistent, and easy to change without silently widening the blast radius of a task.

Treat these rules as engineering constraints, not formatting preferences. Preserve behavior unless the task changes it. Ask before you change a shared contract. For an internal function or type, change it and move every caller in the same change.

## Workflow

1. Inspect before editing.
   - Read the target code and its immediate callers/callees.
   - Search for the same domain concept, schema, error type, API pattern, state flow, and test pattern elsewhere in the repository.
   - Inspect relevant `tsconfig`, package scripts, lint rules, runtime validation/schema libraries, and test setup when available.
   - Trace data origins before adding null checks, optional chaining, fallbacks, casts, or compatibility paths.
2. Identify the existing contract and blast radius.
   - Record the current inputs, outputs, side effects, errors, and externally observed behavior of touched functions/modules.
   - Search all call sites before changing a shared signature or exported type.
3. Decide whether the existing pattern is sound.
   - Reuse a good existing pattern when it fits.
   - Do not copy a pattern merely because it already exists.
   - If the repository pattern looks wrong, check `docs/agents/known-bad-patterns.md` or the repo's equivalent. Use the listed replacement. If the pattern is not listed, choose the better pattern for the code you touch and propose the fix in the report. Ask first only when the fix adds a new shared abstraction or changes a shared contract.
4. Implement the smallest coherent change.
5. Validate with focused typecheck/tests/lint/build commands already used by the repository.
6. Report any contract change, migration, unresolved risk, or architectural deviation explicitly.

## Core rules

### Do not bypass TypeScript with unsafe assertions

Do not use type assertions such as `value as SomeType` or angle-bracket assertions to silence a type mismatch. A type assertion does not convert or validate the runtime value.

Also avoid non-null assertions (`value!`) when they merely suppress uncertainty.

Prefer, in this order:

- correct the source type;
- narrow with control flow;
- use a type guard or assertion function that performs a real check;
- validate/parse external data at the boundary;
- use a discriminated union;
- improve generic constraints or overloads;
- use `satisfies` when checking shape without changing the inferred value type.

`as const` is allowed for literal narrowing because it does not pretend that an arbitrary runtime value has a different shape.

If an external library has incorrect or incomplete types and a local assertion appears unavoidable, explain the mismatch and ask the user before introducing the assertion. Prefer containing it in one validated adapter boundary.

### Change shared contracts only with approval

A shared contract is a public API, a database schema, an HTTP route, a published package export, or a contract with another repo. The repo's AGENTS.md may list more. Before you change one: search all consumers, describe the downstream effects and the migration, say why the current contract is not enough, and ask the user. Any other exported function or type is internal: change it, move every caller in the same change, and list the change in the report.

### Search before inventing

Always inspect how the repository already solves the same or adjacent problem before introducing a new schema, service pattern, state shape, error strategy, or helper convention.

Repository consistency is evidence, not authority. Existing code can be wrong. Evaluate whether the pattern:

- makes dependencies explicit;
- preserves type safety;
- keeps responsibility in the right layer;
- avoids passing implementation machinery through unrelated layers;
- has a clear failure model;
- remains understandable at call sites.

Do not propagate a bad pattern solely for consistency.

## Type and data-flow discipline

- Encode valid states in types where practical.
- Prefer `readonly` inputs/properties when mutation is not part of the contract.
- Do not mutate caller-owned arrays/objects unexpectedly.
- Validate untrusted external data at boundaries; do not pretend it is typed because TypeScript says so.
- Prefer discriminated unions for state variants with different required fields.
- Use `type` or `interface` according to the model and local convention; do not turn this into a style debate.
- Prefer `import type` for type-only imports when supported by the codebase.

### Nullability and optional chaining

Do not add `?.`, `??`, default values, or defensive null checks automatically.

Before adding them:

1. trace the producer of the value;
2. inspect its declared type and runtime construction path;
3. identify a real path where absence can occur;
4. decide whether absence is valid domain state or a bug/invariant violation.

If the value is guaranteed by an invariant, express or enforce the invariant rather than obscuring it with optional chaining.

If absence is valid, handle it explicitly and intentionally.

## Type modelling rules

Vendored from pstack `typescript-best-practices`. Worked examples: `references/type-modelling-patterns.md`.

| Rule | Summary |
|------|---------|
| Constructive modelling | Build the shape so the illegal value cannot be constructed. `[T, ...T[]]` for non-empty, `[T, T][]` for even length, `start` plus `duration` for a range. Not a runtime guard. |
| Simplest total type | Keep `T[]` while every operation on it stays total. Strengthen to `NonEmpty<T>` only where the loose type forces a `!`, a cast, or a "should never happen" throw. |
| Branded types | Brand primitives with `& { readonly __brand: "X" }` so ids cannot be mixed up. Validate once at the boundary. |
| `unknown` over `any` | External data is `unknown` until parsed. |
| Schemas before guards | Before hand-writing a property-by-property type guard, use the repository's runtime schema library and infer the type from it, such as `z.infer`. |
| Narrowing hierarchy | Discriminant switch, then `in`, then `typeof`/`instanceof`, then a user-defined type guard. `as` is last and needs the validation above. |
| Type guards must verify | A guard that does not check the claim is worse than `as`, because the bug hides behind a safe-looking name. Name them `isX` or `hasX`. |
| Exhaustiveness | Put `const _exhaustive: never = x;` in default arms so the compiler errors when someone adds a variant. |
| `satisfies` over `as` | Validates the value without widening literal types. |
| Schema-derived types | Reach for `Pick`, `Omit`, `Parameters`, `ReturnType`, `Awaited`, `typeof` before declaring a new interface. |
| Object arguments | Pass an object, not positional arguments, so argument order is self-documenting. Skip on hot paths such as per-frame render, tokenizers and parsers. |
| Structured telemetry | Use the structured logger with enough context to debug from an id. No `console.log` in shipped code. |

## Functions and intent

- Name functions for the intent they express at the call site, not merely the mechanics they perform.
- Use one vocabulary for one domain concept.
- Avoid abbreviations and generic names that force mental mapping.
- Name complex predicates when the name exposes business intent.
- Keep each function responsible for one coherent job and one conceptual abstraction level.
- Do not split readable logic into tiny helpers merely to satisfy a line-count or "one thing" slogan.
- Prefer a small number of meaningful, deeper functions/modules over many shallow pass-through wrappers.
- Keep effects obvious. Separate computation from I/O when that makes the behavior easier to reason about or test.

If the name and implementation suggest different domain intent, do not guess. Surface the mismatch and ask what the intended behavior/name should be before making a semantic change.

## Command-query separation

Apply command-query separation where it clarifies behavior:

- a **query** returns information without changing observable state;
- a **command** changes state and should not also behave like a data query.

Avoid functions that both mutate state and return unrelated domain data because callers then depend on hidden ordering and side effects.

Returning an identifier, status, or result that is inherently part of performing the command can be appropriate. Use judgment rather than mechanically splitting every function.

## Complexity and module design

Follow the spirit of *A Philosophy of Software Design*:

- reduce complexity at interfaces;
- avoid obscurity in names and control flow;
- minimize unnecessary dependencies and knowledge crossing module boundaries;
- hide meaningful complexity behind simple, stable interfaces;
- prefer cohesive, deeper modules over many shallow wrappers;
- move complexity downward into modules when doing so simplifies callers;
- avoid configuration/flags that leak implementation choices to many call sites.

A function or module is not "clean" because it is short. Judge it by how much complexity its interface exposes compared with how much useful behavior it hides.

## Existing patterns may be wrong

When copying an existing repository pattern, ask whether it leaks implementation details or couples layers unnecessarily.

Examples of warning signs:

- passing framework/runtime mechanisms (such as an emitter) through business-domain APIs;
- generic utility interfaces that expose many irrelevant operations;
- high-level modules constructing concrete infrastructure deep inside themselves;
- callers needing to know internal sequencing or storage details;
- optional/fallback behavior that exists only because nobody traced the actual invariant.

When you replace a pattern across many call sites, state the current pattern, its concrete downside and the new pattern in the report. Ask first only when the change adds a new shared abstraction or changes a shared contract.

## Cutovers and fallbacks

Prefer a hard cutover when replacing an internal behavior or data path.

Do not add dual paths, silent fallbacks, legacy compatibility branches or "just in case" recovery code. Run old and new side by side (expand, then contract) only for a wide refactor, at a deployed seam, or for stored data.

Before removing an old path or skipping a fallback:

- search all callers;
- trace initialization and runtime entry points;
- check migration/deployment ordering if relevant;
- confirm tests or fixtures are not the only apparent consumer.

If a fallback is truly required, make its trigger explicit and explain why it exists.

## Classes, modules, and dependencies

- Keep modules/classes cohesive around one primary responsibility.
- Prefer composition to inheritance unless the subtype is genuinely substitutable for the base.
- Keep interfaces narrow and consumer-driven.
- Inject required capabilities at boundaries rather than reaching into globals or constructing infrastructure in high-level domain logic.
- Do not add a dependency-injection framework merely to achieve dependency inversion.
- Avoid hidden mutable global state.

## Async and errors

- Prefer `async`/`await` when it makes control flow clearer.
- Run independent async work concurrently when safe and useful; do not accidentally serialize it.
- Throw/reject `Error` or project-specific error types, not raw strings.
- Do not swallow failures.
- Preserve useful context when wrapping or rethrowing errors.
- Use explicit typed result/discriminated-union failures when failure is expected domain flow and that pattern fits the repository.

## Tests

- Update the tests that your change breaks. Add a test for changed branching logic at a public interface when a cheap test target exists. Prefer no new test over a bad test.
- Prefer behavior and boundary tests over testing private implementation details.
- Make tests independent, repeatable, and intention-revealing.
- Use one behavior/concept per test; multiple assertions are fine when they verify that same behavior.
- For risky refactors, add characterization coverage before changing behavior you do not fully understand.

## React-specific rule

When editing React/TSX:

- Do not add `useMemo` or `useCallback` by default. First try the alternatives: a plain expression, or a restructure that removes the need.
- Add one only when it is needed and you can show the evidence: a measured expensive computation, or a value whose identity a dependency array or a memoized child needs. Give the evidence in the report. No user approval is needed.

## Formatting and style

Use the repository's existing formatter/linter configuration. Do not add project-specific formatter commands to this skill.

Do not spend engineering effort on style changes that tooling can enforce automatically unless they are required to make the touched code valid.

## Completion checklist

Before finishing a non-trivial change, confirm:

- existing patterns and callers were searched;
- no unsafe assertion was introduced;
- no shared contract changed without approval, and every internal caller moved in the same change;
- null checks/optional chaining correspond to a real nullable path;
- no speculative fallback/compatibility path was added;
- names express domain intent;
- command/query behavior is clear where relevant;
- the change did not blindly reproduce a known-bad pattern;
- focused validation passed or any failure is reported clearly.

For more detailed decision heuristics, read `references/development-checklist.md` for substantial changes or refactors.
