# TypeScript development checklist

Use this for substantial implementation, refactoring, or bug-fix work.

## Repository reconnaissance

- Find every direct caller of touched exported/shared functions.
- Find parallel implementations of the same domain concept.
- Find relevant schemas, parsers, validators, error classes, and tests.
- Identify whether similar patterns are truly good or merely historical precedent.

## Contract safety

- Have any parameter, return, event, schema, or callback types changed?
- Would the caller need to change to accommodate the implementation rather than because the product behavior changed?
- Can the current contract be preserved with a local implementation change?
- If not, stop and request permission with the downstream migration described.

## Type assertions

Treat these as warning signs:

- `value as SomeType`
- `<SomeType>value`
- non-null assertion `value!`
- double assertions such as `value as unknown as SomeType`
- `any` introduced to make an error disappear

Prefer real narrowing/validation. `as const` and `satisfies` are normally safe tools because they do not claim an arbitrary runtime value has been validated into an unrelated shape.

## Nullability

Before `?.`, `??`, or a null guard:

- locate the value's producer;
- identify an actual `null`/`undefined` path;
- determine whether missing data is expected;
- if impossible by invariant, fix the type/invariant instead of masking it.

## Command-query separation

Ask:

- Does this function mutate observable state?
- Does it also return data that could have been a separate query?
- Does the returned value make callers depend on hidden sequencing?
- Is the returned value inherently the command result (created id/status), in which case combining can be reasonable?

## Deep-module check

Prefer a simple public surface that hides substantial useful work.

Warning signs of shallow decomposition:

- helper functions that simply rename a one-line call;
- wrappers with almost the same interface as the wrapped dependency;
- many modules that each expose their internal sequencing to callers;
- moving complexity sideways rather than hiding it.

Warning signs of overgrown responsibility:

- unrelated reasons to change;
- unrelated dependencies used by disjoint groups of methods;
- one function crossing business, persistence, transport, and presentation layers without a clear boundary.

Split by responsibility or abstraction boundary, not by line count.

## Hard cutover check

Before adding fallback/legacy behavior:

- prove an old consumer still exists;
- confirm deployment ordering requires overlap;
- confirm data migration cannot be atomic/hard-cutover;
- make fallback activation observable and explicit.

Do not preserve dead paths from fear alone.

## Existing-pattern skepticism

When an existing pattern looks suspicious, describe:

1. where it appears;
2. what coupling/obscurity/failure risk it creates;
3. whether the current task actually requires following it;
4. the smallest better alternative;
5. whether adopting that alternative would create a new repository-wide convention requiring user direction.

## React

Before `useMemo`/`useCallback`, identify the specific problem being solved: expensive recomputation, stable identity required by a dependency, or measured rendering behavior. Do not add them as ritual optimization. Ask the user before adding them under this skill.
