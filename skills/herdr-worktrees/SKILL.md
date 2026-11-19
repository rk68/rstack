---
name: herdr-worktrees
description: Create, run agents in, inspect and clean up git worktrees when the session runs inside Herdr (`HC_TERMINAL_ID` is set). Use before you start parallel agents or a task on a new branch, when the user asks which worktrees exist or can go, or after a PR merges. With Paseo, use Paseo worktrees.
---

# Herdr worktrees

Herdr has no worktree feature. `hc` starts an agent in the folder you give with `--cwd`. You keep agents apart by giving each one its own git worktree and branch, and you coordinate them from this session.

Read the `herdr` skill first.

## Rules

- One worktree and one branch per agent or task. Git refuses to check out one branch in two worktrees, and two agents in one checkout overwrite each other's work.
- Put new worktrees in `~/.herdr/worktrees/<repo>/<task>`. Name the task folder after the branch, without the `type/` prefix.
- Remove only worktrees you created in this task. For others, show the status table and ask the user.
- Accept Claude Code's folder trust dialog for a new worktree without asking (see the `herdr` skill).

## See what exists

Run the status script before you create or remove anything:

```bash
python3 ~/.claude/skills/herdr-worktrees/scripts/status.py <repo path>
```

It prints one row per worktree: branch, changed files, commits ahead of `origin/main`, unpushed commits, PR state, the hc terminals working in it, and a hint (`in use`, `safe to remove`, `has work not in a PR: ask`, `keep`, or `folder gone: git worktree prune`).

## Create

1. Choose the base. Use `origin/main` for independent work. If task B needs task A's code, branch B from A's branch, and rebase B when A changes or merges.
2. Create it:

   ```bash
   git -C <repo> fetch origin main
   git -C <repo> worktree add ~/.herdr/worktrees/<repo>/<task> -b <branch> origin/main
   ```

3. Install dependencies as an hc terminal, so you stay reachable:

   ```bash
   hc run --bg --rm --no-notify --name install-<task> --cwd ~/.herdr/worktrees/<repo>/<task> -- pnpm install --frozen-lockfile
   hc wait install-<task>
   ```

4. Copy local files that git does not track and the task needs, for example `.env.local`. Do not copy secrets into a worktree that an agent with network access does not need.

## Run agents in it

Start the agent with the task in the launch command. Use a template from `hc templates` when one fits (see `herdr-delegate`):

```bash
hc run --bg --name <task> --cwd ~/.herdr/worktrees/<repo>/<task> -- claude --model claude-opus-5-5 \
  "<task>. Edit only files under <paths>. Commit locally, do not push. Do not start agents. When done or stuck, run: hc send $HC_TERMINAL_ID \"<result or blocker>\""
```

Wait without polling: `hc wait --children any` returns each result as it arrives, `hc wait --children all` waits for every agent.

If the user wants to watch one, open a space for it without moving them: `herdr-app do space.new --name <task> --folder <path> --focus false`.

## Shared local services

Worktrees share the machine, so two copies of a dev server fight over ports and over a shared dev backend.

- Give each worktree that runs the app its own ports and its own local backend, through the repo's own port settings. Keep a list of the ports in use in your report.
- Limit the other agents to typecheck and tests.
- Never point a worktree at a cloud deployment, such as a Convex dev deployment, unless the user asks.

## Clean up

After a PR merges or closes, for each worktree you created:

1. Stop its agents and helpers: `hc kill <t>`, then `hc rm <t>`.
2. Stop its local stack if one runs, with the repo's own stop command.
3. Run the status script. Remove only a row marked `safe to remove`:

   ```bash
   git -C <repo> worktree remove ~/.herdr/worktrees/<repo>/<task>
   git -C <repo> branch -d <branch>
   ```

   A git guardrail hook blocks force-deleting a branch. A squash-merged branch fails `-d`, because git does not see it as merged. Leave that branch and give the user the force-delete line to run.

4. Run `git -C <repo> worktree prune` for rows marked `folder gone`.

`git worktree remove` refuses a worktree with uncommitted changes. Do not add `--force` unless the user said that work can go.
