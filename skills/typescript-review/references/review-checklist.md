# TypeScript review checklist

Use this for broad PR, refactor, or architecture reviews.

## 1. Codebase context

- Were direct callers/callees inspected?
- Were matching schemas/types/validators found?
- Were similar patterns elsewhere inspected?
- Is the proposed code copying historical precedent without evaluating it?

## 2. Contracts

- Did any input/output/export/event/schema shape change?
- Are downstream consumers proven compatible?
- Could the implementation preserve the old contract?
- If a breaking change is necessary, is migration/user approval explicit?

## 3. Type safety

- Any `as SomeType`, angle assertion, double assertion, `any`, or non-null `!` used to suppress uncertainty?
- Could control-flow narrowing, a type guard, parser/schema, discriminated union, generic constraint, or source-type fix remove it?
- Is external/untrusted data actually validated at runtime?

## 4. Nullability and fallbacks

- For each new `?.`, `??`, null guard, fallback, or compatibility branch, what exact runtime path requires it?
- Is absence valid domain state, or does the branch hide an invariant violation?
- Is a hard cutover possible after tracing callers/deployment ordering?

## 5. Intent and command/query behavior

- Do names describe domain intent rather than mechanics?
- Do names and implementation disagree?
- Does a query mutate state?
- Does a command return unrelated queried state, creating hidden ordering?

## 6. Module complexity

- Does the public interface hide useful complexity?
- Is complexity pushed down into cohesive modules or leaked to callers?
- Are there many shallow wrappers/pass-through helpers?
- Are there too many cross-module dependencies or details callers must know?
- Is a large function actually one coherent deep operation, or several unrelated responsibilities?

## 7. Existing pattern quality

Question precedent when it:

- leaks framework mechanisms through domain APIs;
- passes emitters/callback plumbing across unrelated layers;
- requires callers to know internal sequencing;
- duplicates infrastructure knowledge in many places;
- normalizes optional/fallback behavior that is not actually reachable.

## 8. State, async, and errors

- Unexpected mutation?
- Shared mutable state?
- Independent awaits serialized?
- Promise ignored?
- Error swallowed or converted to vague output?
- Fallback/retry introduced without an explicit condition?

## 9. Tests

- Is the changed behavior tested?
- Are contract/invariant boundaries covered?
- Are tests intention-revealing and independent?
- Does a risky refactor need characterization tests first?

## 10. React

- New `useMemo`/`useCallback`?
- Is there a concrete referential-identity or measured performance need?
- If not, recommend removal rather than speculative memoization.

## 11. Review quality

Every finding should answer:

- What is the concrete consequence?
- What code path proves it?
- What is the smallest fix?

Do not report formatter/prettier nits unless requested.
