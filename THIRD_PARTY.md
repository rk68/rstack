# Third-party sources

Several skills in this suite are copied or adapted from open-source projects. Each adapted
skill keeps a comment at the end of its `SKILL.md` that names its source and lists the
changes. The licence texts are in `licenses/`.

| Upstream | Source | Version | Licence | Licence text | Skills |
|---|---|---|---|---|---|
| pstack, by Lauren Tan | https://github.com/cursor/plugins/tree/main/pstack | commit 2776ddd2355d6d6c8747d3964600f28daf62f049 | MIT, Copyright (c) 2026 Lauren Tan | `licenses/pstack.txt` | benchmark-checklist, blast-radius, refactor, tdd, unslop, and the type modelling rules in typescript-development |
| Matt Pocock's skills | https://github.com/mattpocock/skills | plugin 1.3.1, commit 49dd158d1076134a641b33efb035946536778336 | MIT, Copyright (c) 2026 Matt Pocock | `licenses/mattpocock-skills.txt` | codebase-design, diagnosing-bugs, domain-modeling, grilling, improve-codebase-architecture, prototype, writing-for-agents, and the mocking rule in tdd |
| Convex agent skills | https://github.com/convex/agent-skills | commit f60629d7c6c1f27eb58a56260546d2445049274d | Apache License 2.0 | `licenses/convex.txt` | convex-docs, convex-review (from convex-reviewer and convex-authz), convex-verify |

The changes to the Apache-licensed Convex skills are listed in the comment at the end of
each `SKILL.md`, as section 4(b) of the Apache License requires.

The skills not listed above (commit-pr, typescript-development, typescript-review,
convex-development) are written for this suite.
