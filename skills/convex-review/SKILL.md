---
name: convex-review
description: Review a Convex diff for authorization, security, performance, validator and command-query defects. Use when a review touches files under convex/. Not for writing Convex code, use convex-development.
---

# Convex review

A checklist for reviewing changes under `convex/`. Report only real defects, in the format of the repo's `REVIEW.md` if it has one. Before you report a lint-level defect (a missing validator, `.filter` on a query, `api.*` in the scheduler, `Date.now()` in a query, a floating promise), read the repo's `eslint.config.*`. When a configured rule already catches it, do not report it again. When no rule catches it, report it.

## 1. Authorization (highest severity)

Check every public `query`, `mutation` and `action` the diff adds or changes:

- **Identity from an argument.** The function takes `userId`, `ownerId`, `actorId` or a similar id as an argument and trusts it. Identity must come from `ctx.auth`.
- **Missing ownership check.** The handler loads a document by an id argument, then reads, patches or deletes it without checking that the caller may access it.
- **Data leak by id.** A public query returns sensitive fields (email, tokens, secrets, financial or audit data) for a client-supplied id without an access check.
- **Write into a container the caller does not own.** A mutation inserts or moves a row into a parent (project, organization, workspace) named by an id argument without checking the caller's access to that parent.
- **Public reach.** A function that only the backend calls is public. Make it `internal*`.

Use the repo's existing access helpers in the expected fix. Do not propose a new helper.

## 2. Performance and limits

- An unbounded read: `.collect()` on a table that grows, or a loop of reads, in one transaction (16 MiB read limit, 8192-element arrays).
- A foreign-key field without an index that a new query needs.
- A query that reads large documents across a whole series when a cached summary exists.

## 3. Correctness

- A mutation that can leave related rows inconsistent if it is retried or runs twice.
- An action that writes through several mutations where one mutation would make the change atomic.
- Secrets that cross the read boundary (a raw document or a raw `target` returned to a client).

## 4. Command-query separation

A screen reads through a `query`, and a `mutation` or `action` changes state. The general rule is in the `typescript-review` skill. These are its Convex forms:

- **A command that returns display data.** A `mutation` or `action` returns rows, a list or a view model that a screen then shows. The screen reads that data through a `query`, so it stays live.
- **A read that is not a query.** A screen calls a `mutation` or an `action` only to fetch data that a `query` can return.
- **A lookup name on a function that writes.** A helper named like a read (`get`, `find`, `list`, `load`, `...Of`) inserts, patches or deletes.

A command may return the id it created or the outcome of its own write (`"claimed"`, `"stale"`, a count), because the caller cannot get that from a later read without a race. That is a correct command result.

<!--
Source: convex-reviewer and convex-authz from https://github.com/convex/agent-skills at f60629d7c6c1f27eb58a56260546d2445049274d (Apache License 2.0, text in licenses/convex.txt).
Changes: merged the two checklists into one review-only skill. Removed the authz skill's automatic hardening (it adds its own requireIdentity/requireOwner helper, which conflicts with repo access helpers) and its regex scan. Lint-level defects are reported only when the repo's eslint config does not catch them. Added section 4, command-query separation.
-->
