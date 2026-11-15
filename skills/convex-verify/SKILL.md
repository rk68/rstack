---
name: convex-verify
description: Prove a Convex query, mutation or action works with convex-test, as several users, including the refused cases (wrong user, wrong organization, no login). Use after you build or change a Convex function that reads or writes data scoped to a user or organization. Not for UI checks in the running app.
---

# Prove a feature works — seed, drive, assert

A green typecheck proves the code parses; it does not prove a non-owner is actually denied, that a query returns the right rows, or that a mutation has the effect it claims. This capability closes that gap with the loop the whole field is missing: seed → drive → assert, run in-process with `convex-test` so it needs no deployment. Its highest-value assertions are the NEGATIVE ones — the caller who should be refused — because those are exactly the authz defects the 30-app corpus shows are the #1 real bug and the ones a happy-path demo never catches.

## Workflow

1. Identify the feature to prove: the specific exported query/mutation/action (or a small set) the user just built/changed, and its intended behavior — who should be allowed, what data should come back, what a mutation should change. If the intent is unstated, read the callers and the UI that use the function. If the code does not settle who may call the function, test the most restrictive reading, state that assumption in the report, and put the question there. Continue with the other assertions.
2. Set up `convex-test`: ensure `convex-test` + `vitest` are dev deps and a `vitest.config.ts` sets `test.environment: "edge-runtime"` with `server.deps.inline: ["convex-test"]`. Without that config, `convexTest(schema)` fails at runtime with `import.meta.glob is not a function` (verified). Also install `@edge-runtime/vm`. Then `convexTest(schema)` gives a `t` handle. Reuse the project's existing convex-test setup when one exists. Most repos that already use convex-test need no new config.
3. Seed realistic data through the app's own functions where possible (so the seed exercises the same validators/mutations a real user would), falling back to `t.run(async (ctx) => ctx.db.insert(...))` for fixtures the public API can't create. Seed at least: the caller's own rows and a second user's rows, so cross-user access is testable.
4. Drive the feature as different identities with `t.withIdentity({ subject, tokenIdentifier, ... })`: call the function as (a) the legitimate owner, (b) a different authenticated user, and (c) unauthenticated (`t` with no identity). Use the real identity shape the app's auth uses (subject/tokenIdentifier), matching how ownership is resolved.
5. Assert behavior, positive and negative:
   - positive: the owner gets the expected rows / the mutation made the expected change (`expect(await t.withIdentity(owner).query(api.x.y, args)).toEqual(...)`).
   - Negative assertions matter most. A different user who calls the same function is refused (`await expect(t.withIdentity(other).mutation(api.x.cancel, {id})).rejects.toThrow(/forbidden|not authorized|403/)`), and an unauthenticated caller is refused where auth is required. The feature is not proven until the test shows that the wrong caller is blocked.
   - data-scope: a list/query returns only the caller's rows, never the second user's (assert the second user's row is absent).
6. Run the tests (`npx vitest run`) and report: what was proven (each positive + negative assertion that passed), and any assertion that failed, because a failed negative assertion is a real authz hole found before ship.
7. Do NOT weaken a test to make it pass: if the owner-only query returns another user's row, the fix is in the function (see `convex-review`), not in the assertion. A test changed until it's green proves nothing.

## Rules

- convex-test needs a vitest config with `environment: "edge-runtime"` and `convex-test` inlined. Reuse the repo's config when it has one: a `convex/vitest.config.ts`, or a project in the root `vitest.config.ts`. Write one only when it is missing.
- This drives a SPECIFIC built feature; a request to set up a test framework in general is a different task.

<!--
Source: convex-verify from https://github.com/convex/agent-skills at f60629d (Apache License 2.0, text in licenses/convex.txt).
Changes: description rewritten; the bus-finding steps removed; the "ask one question" step reads the callers first; convex-authz and convex-expert references point to convex-review and convex-development; reuse the repo's existing convex-test setup.
-->
