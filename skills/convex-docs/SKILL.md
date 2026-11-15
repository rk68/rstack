---
name: convex-docs
description: Look up the current Convex or @convex-dev component API for the version this project has installed. Use before you write a Convex API you are not sure of, or when a build error says an export or flag does not exist. Not for general Convex rules, use convex-development.
---

# Pull version-current Convex docs

`convex-development` carries the rules, and model memory carries baked knowledge — excellent for stable idioms, but it goes stale exactly where it hurts: a component that gained a new export, a CLI flag that changed, an API renamed between versions. This capability is the freshness discipline layered on top: pin to the project's real version, fetch the live page cheaply as markdown, and never write an unfamiliar API from memory when the current source is one fetch away.

## Workflow

1. Pin the version. Read the installed `convex` version (`node -p "require('./node_modules/convex/package.json').version"` or `package.json`) and the versions of the `@convex-dev/*` components in use. Use docs that match these versions, because a version mismatch is a common cause of wrong Convex code.
2. Fetch the current source, cheapest first: (a) a served Convex docs tool, if one is available; (b) the docs page as Markdown, or the component README at the pinned version; (c) a general web search, with its version marked unverified. When you are not sure an API is current, fetch it before you write it.
3. Verify against the installed package when it matters: for a component export you're unsure exists, check `node_modules/@convex-dev/<x>/` (its `package.json` `exports`, its `.d.ts`) — the installed types are the ground truth for this version, more authoritative than any doc.
4. Use the fetched fact narrowly: apply the current signature/flag, cite where it came from (page + version), and write the code with the `convex-development` rules.
5. On a version-mismatch build error (an export/flag that 'should' exist but doesn't): treat it as a currentness question — pin the version, fetch the current API, and correct — rather than guessing a different spelling.

<!--
Source: convex-docs from https://github.com/convex/agent-skills at f60629d (Apache License 2.0, text in licenses/convex.txt).
Changes: description rewritten to the suite formula; convex-expert references point to convex-development.
-->
