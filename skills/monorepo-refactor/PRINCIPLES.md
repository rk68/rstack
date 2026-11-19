# Principles for a monorepo refactor

Each principle names what to look for and what to do. The vocabulary (depth, seam, locality, the deletion test) is in `codebase-design`. Type, nullability and command-query rules are in `typescript-review`. The cutover rule is DECISIONS Q14. Sources are listed at the end.

## Packages

- **A package line goes where the runtime or the dependency weight changes.** Examples: browser and server, V8 and Node, a native or WASM dependency, a dev-only server. A `package.json` is a guard that tools and reviewers cannot miss. Keep it over a lint rule on subpaths. Subpath entry points are for slices that run in the same runtime.
- **A small, pure core.** One package holds the shared domain types and logic, with few dependencies, and every runtime may import it. Heavy integrations each get their own package that depends on the core.
- **Write the dependency direction down, and enforce it.** For example: core feeds the Node packages, and the apps never import a Node package. Put it in `CLAUDE.md` or `AGENTS.md`, and check it with the repo's boundary script or an import lint rule.
- **Names use one family prefix inside the scope**, such as `@scope/feature-core` and `@scope/feature-report`. Keep the folders flat under `packages/`.
- **Delete a package that nothing imports.** Check code, CI, tsconfig paths, scripts, Dockerfiles and the lockfile before you call it dead.

## Modules

- **Deep modules.** Look for a rule that is spread over several files, for example what a phase needs before it can start or be approved. Give it one owner: one record per variant, which the callers loop over.
- **One writer.** Look for a function that claims to be "the one way" while others write around it, or for the same operation written twice for two kinds of caller (a user and a job). Make one function that takes the caller as an argument, and make the low-level write private.
- **One list.** Write a list of variants (phases, kinds, modes) once, and derive the others from it.
- **One function until a second use.** Merge pass-through files and single-use helpers into their owner. The main function reads as the happy path, with its helpers below it.
- **Domain folders.** Group backend files by domain area, not by phase order or by file kind. Keep the most-called modules where they are.
- **Thin transports.** An HTTP route, RPC handler or MCP tool decodes its input, calls one domain function and maps the errors. A capability that a person can use should be reachable by an agent through the same function.
- **Pure core, dumb UI.** Complexity sits at the adapter edge. Shared UI pieces only display data: they take their data and actions from the app and import no backend client.

## State

- **Implicit state machines.** Look for a stage stored as several booleans, optional fields or nullable timestamps, for example a field that is valid only when another one is set, or a write that must clear three fields by hand. Replace it with one `status` discriminated union, where each variant holds only its own data. Copy the unions the code already has.
- **Store facts, derive the rest.** Do not store a copy of a fact that can be derived from events or from another table. Keep a copy only when an index needs it, and say so beside the field.
- **Validate once, at the edge that owns the data.** Pass typed values inward. Remove the fallbacks and re-checks deeper in the code.
- **Every way in has a way out.** For each action a user can take, check that the reverse exists and that the result is visible: publish and unpublish, add and remove, propose and withdraw. A backend function with no UI may be the missing button, not dead code. Ask the user before you delete it.
- **Stored-data changes go last**, behind a versioned reader or a migration, after the user confirms what production holds.

## Naming and conventions

- **One vocabulary.** Look for one concept with several names, or one name with several meanings. Fix the terms in a short glossary, and make the code follow it.
- **Names follow command-query separation.** A read is a noun, `get` or `list`. A command is a verb.
- **One meaning per file suffix.** For example, `Actions` holds actions, and `Store` holds table helpers.
- **Check every surface.** List the surfaces of the area (each app, each MCP or API, each public page). Every new capability states its decision for each surface in the PR body.

## Dead code

- Look for unused packages, files and exports, exports used only in their own file, and public functions that only tests call.
- Add a dead-code check to CI, such as knip, scoped to the area first, so dead code cannot grow back.

## Tests

- **Test at the lowest layer that fails.** Do not repeat a case in wrapper tests.
- **Extend an existing table of cases** before you add a new test.
- **Use no wall-clock time in tests**: no sleeps, no polling loops, no per-test timeout or retry. Fake the clock in the shared setup. Fix a flaky test, and do not retry it. Enforce this with a lint rule.
- **Avoid mocks and spies on internals.** Use the real module with a fake at the system edge, such as the model, the network or the clock.

## Docs

- **Docs record decisions and constraints that cross components.** Code, types and tests record the rest. Remove field lists, file catalogs and PR change notes.
- **Rewrite a changed decision.** Do not append to it.
- **Do not commit a plan.** The merged PR is the record.
- Give the area one overview with diagrams: the system context, the main state machine, the runtime flow, the data model and each external integration.

## Sources

Read on 2026-11-16:

- opencode (`sst/opencode`, `AGENTS.md`): the dependency direction, store facts, validate once, one function until a second use, and avoiding mocks.
- t3code (`pingdotgg/t3code`, `AGENTS.md`, `knip.jsonc`): thin transports, a pure core with a dumb UI, every way out, checking every surface, the glossary, the docs rules, the test rules and knip.
- The Vercel AI SDK (`vercel/ai`, `AGENTS.md`): a light core with one package per heavy integration, and decision records.
- TanStack Router (`TanStack/router`): separate client and server core packages, with subpaths only within one runtime.
