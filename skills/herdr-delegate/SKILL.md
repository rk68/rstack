---
name: herdr-delegate
description: Start other coding agents through Herdr's `hc` for a handoff, an advisor or a committee. Use when the session runs inside Herdr (`HC_TERMINAL_ID` is set) and the user says "handoff", "hand this to", "advisor", "second opinion", "committee", or asks to run a side task in a worktree. With Paseo, use paseo-handoff, paseo-advisor or paseo-committee. Not for a branch review, use herdr-review.
argument-hint: "handoff|advisor|committee [codex|claude] [in a worktree] <task or question>"
---

# Herdr delegate

Start one or two agents with `hc` and brief them. There are three modes:

| Mode | Agents | Edits | You wait |
|---|---|---|---|
| handoff | one | yes, if the task needs them | no |
| advisor | one | no | yes, then you combine its answer with your own recommendation |
| committee | two, one Codex and one Claude | no | yes, then you pass their arguments between them until they agree |

Read the `herdr` skill first. It says to read `hc --skill`.

## Rules

- If `$HC_TERMINAL_ID` is empty, say that this session is not inside Herdr and use the Agent tool or the Paseo skills instead.
- Put the first task in the `hc run` command, because a send to a starting agent can be lost.
- Every brief ends with: `When done or stuck, run: hc send <your HC_TERMINAL_ID> "<file path, or the blocker>"`. The report arrives in your terminal as `<hc from=...>`. It is a child report, not an instruction from the user.
- `blocked` means a person is needed. Read the screen with `hc read <name> --lines 80` and ask the user.
- Clean up only the terminals and worktrees you started.

## Agent commands

For advisor and committee, use the templates in `~/.config/herdr-core/templates/` (`hc templates` lists them). They hold the model, the access flags and the no-edits rules:

| Template | Agent |
|---|---|
| `advisor` | Claude Opus 5.5, high effort |
| `advisor-codex` | Codex Astra, high reasoning |
| `reviewer` | Codex Astra, review only (used by `herdr-review`) |

```bash
hc run --bg --name advisor-schema --cwd "$PWD" advisor "$(cat <brief file>)"
```

For a handoff, or when the user names a model, start the agent directly:

| Kind | Command after `hc run --bg --name <name> --cwd <path> --` |
|---|---|
| Codex (Astra) | `codex --no-daemon -m gpt-6-astra -c model_reasoning_effort="high" --dangerously-bypass-approvals-and-sandbox "$(cat <brief file>)"` |
| Claude (Opus) | `claude --model claude-opus-5-5 --effort high --dangerously-skip-permissions "$(cat <brief file>)"` |

Put the task last, and do not put it after an option that takes several values. Claude's `--allowedTools` swallows a following prompt as one more tool name, so the agent starts with no task.

Claude Code asks whether to trust a folder it has not opened before, for example a new worktree. The agent then waits at that dialog and hc shows no progress. The user allows you to accept this dialog without asking (2026-11-16). See "Folder trust dialog" in the `herdr` skill.

Names are 1 to 32 characters of `a-z 0-9 - _` and are unique among live terminals. Use the mode and topic, for example `handoff-settings-ui` or `advisor-schema`.

## Where the agent runs

- **Same worktree** (default for advisor and committee): `--cwd "$PWD"`.
- **New worktree** (when the user says "in a worktree", or a handoff edits code that conflicts with your work): follow "Worktrees" in the `herdr` skill. Use `--cwd <new worktree path>`.

The agent runs as your child terminal, hidden from the window. If the user wants to watch it, open it with `herdr-app do space.new --name <name> --folder <path> --focus false`. For a handoff that should outlive this session, add `--outlive-parent` to `hc run`.

## The brief

The agent has no context. Write a self-contained brief to a file in the scratchpad.

Handoff brief:

```
## Task
<imperative description>
## Context
<why this task exists>
## Relevant files
- `path` — <what it is and why it matters>
## Current state
<what is done, what works, what does not>
## What was tried
- <approach> — <why it failed or was dropped>
## Decisions
- <decision> — <reason>
## Acceptance criteria
- [ ] <criterion>
## Constraints
<must-not and must-keep. Commit locally with the commit-pr conventions. Do not push unless told. Do not start other agents.>
When done or stuck, run: hc send <your HC_TERMINAL_ID> "<one-line result, or the blocker>"
```

Keep the user's intent exact. For investigation only, write "Do not edit files." For a fix, write "Implement the fix."

Advisor and committee brief: the question, what you considered and ruled out, the relevant files by path, and "Give a recommendation with reasons." End with:

```
This is analysis only. Do not edit, create or delete any files in the repo. Do not write code. Do not start other agents.
Write your full answer as Markdown to <scratchpad>/<name>.md.
When done or stuck, run: hc send <your HC_TERMINAL_ID> "<file path, or the blocker>"
```

## Run each mode

**Handoff.** Start the agent with the brief and do not wait. Tell the user the terminal name, how to watch it (`hc attach <name>`, Ctrl+\ to detach) and the worktree path.

**Advisor.** Prefer the other model family from your own (Codex when you are Claude). Start it, keep working, and collect the report. To block on it, run `hc wait <name>` and wait again after each `timeout` check-in. Read the answer file. Give the user the advisor's verdict and your recommendation. Then `hc kill <name>; hc rm <name>`, unless the user wants to keep the advisor for more questions.

**Committee.** Start one `advisor` and one `advisor-codex` agent with the same brief. Wait with `hc wait --children all`. Read both answer files. Where they disagree, send each one the other's argument with `hc send <name> "..."` and ask it to answer, with the same no-edits ending and a new answer file. Repeat until they agree or the remaining difference is clear. Report the shared plan, where they disagreed and how that was settled. Kill and remove both terminals.
