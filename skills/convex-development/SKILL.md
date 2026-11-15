---
name: convex-development
description: Write or change Convex backend code (schema, queries, mutations, actions, HTTP actions, crons, scheduling, file storage). Use whenever you edit a file under convex/. Not for reviewing a Convex diff, use convex-review.
---

# Convex development

Your knowledge of the Convex API may be out of date. Before you write Convex code in a session, read `convex/_generated/ai/guidelines.md` in the repo (Convex generates it with `npx convex ai-files install`). If the repo does not have it, read https://convex.link/convex_rules.txt. Follow those rules unless the repo's own rules say otherwise. The repo's `AGENTS.md` and `CLAUDE.md` win over this skill.

## Related skills

- `convex-docs`: look up the current API for the installed version before you write an API you are not sure of.
- `convex-verify`: prove a function that reads or writes user or organization data, with tests that include the refused callers.
- `convex-review`: review a Convex diff.

## Rules

- Use the repo's own function builders. When the repo wraps them (for example in `convex/functions.ts`), import from the wrapper, never from `_generated/server` directly. Keep the builder names (`query`, `mutation`, `internalQuery`, `internalMutation`): the Convex ESLint plugin finds functions by these names.
- Give every public function an `args` validator and a `returns` validator.
- Read with an index: `.withIndex(...)`, not `.filter(...)` on a database query. Add the index to the schema when it is missing.
- Bound every read. Use `.take(n)`, pagination or an index range instead of `.collect()` on a table that can grow. A transaction reads at most 16 MiB.
- Display reads are queries. Use an action only for a side effect: an LLM call, external HTTP or scheduling.
- Schedule only `internal.*` functions. A scheduled job has no user identity, so a public target either fails its access check or must skip it. A public function called through `ctx.runQuery` or `ctx.runMutation` keeps the caller's identity and checks access itself.
- Do not call `Date.now()` in a query. Pass the time as an argument.
- Await every promise.
- Get the caller's identity from `ctx.auth`, never from an argument. Check access to every document that an id argument names, with the repo's existing access helpers.
- Validate external data at the boundary (HTTP actions, webhooks, LLM output) before it reaches the database.

## Checks

Some repos enforce part of these rules with `@convex-dev/eslint-plugin` in their `eslint.config.*`. Read the repo's eslint config to see which rules it enforces, if any. Follow every rule above either way, because a lint covers only some of them. Run the repo's local checks (for example `pnpm check`, or the steps in its CI workflow) before you push.

<!--
The SKILL.md body is written for this suite. It replaces the upstream `convex` router skill (https://github.com/convex/agent-skills at f60629d7), which routes to hosted catalog skills.
-->
