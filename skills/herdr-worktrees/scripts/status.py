#!/usr/bin/env python3
"""Print one row per git worktree of a repo: branch, local changes, commits not on
origin/main, unpushed commits, PR state, the hc terminals working in it, and a
cleanup hint. Usage: status.py [repo path]   (default: current directory)."""

import json
import os
import subprocess
import sys


def run(args, cwd=None):
    result = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
    return result.stdout.strip() if result.returncode == 0 else None


def worktrees(repo):
    rows, current = [], {}
    for line in (run(["git", "worktree", "list", "--porcelain"], repo) or "").splitlines():
        if not line:
            if current:
                rows.append(current)
            current = {}
            continue
        key, _, value = line.partition(" ")
        current[key] = value or True
    if current:
        rows.append(current)
    return rows


def pull_requests(repo):
    out = run(["gh", "pr", "list", "--state", "all", "--limit", "300",
               "--json", "headRefName,number,state"], repo)
    prs = {}
    for pr in json.loads(out or "[]"):
        prs.setdefault(pr["headRefName"], pr)  # newest first
    return prs


def terminals():
    out = run(["hc", "ls", "--json"])
    found = []
    for t in json.loads(out or '{"terminals": []}').get("terminals", []):
        detail = json.loads(run(["hc", "get", t["address"], "--json"]) or "{}")
        cwd = (detail.get("foreground") or {}).get("cwd") or detail.get("cwd") or t.get("cwd")
        found.append((t.get("name") or t["address"], t.get("agent"), cwd))
    return found


def main():
    repo = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
    run(["git", "fetch", "--quiet", "origin", "main"], repo)
    prs, terms = pull_requests(repo), terminals()
    print("path | branch | changed files | ahead of main | unpushed | PR | hc terminals | hint")
    for wt in worktrees(repo):
        path = wt["worktree"]
        branch = (wt.get("branch") or "").removeprefix("refs/heads/") or "(detached)"
        if wt.get("prunable"):
            print(f"{path} | {branch} | - | - | - | - | - | folder gone: git worktree prune")
            continue
        changed = len((run(["git", "status", "--porcelain"], path) or "").splitlines())
        ahead = run(["git", "rev-list", "--count", "origin/main..HEAD"], path) or "?"
        unpushed = run(["git", "rev-list", "--count", "@{u}..HEAD"], path)
        unpushed = "no upstream" if unpushed is None else unpushed
        pr = prs.get(branch)
        pr_text = f"#{pr['number']} {pr['state']}" if pr else "none"
        here = [f"{name}({agent})" for name, agent, cwd in terms
                if cwd and (cwd == path or cwd.startswith(path + "/"))]
        if path == repo:
            hint = "main checkout"
        elif here:
            hint = "in use"
        elif pr and pr["state"] in ("MERGED", "CLOSED") and changed == 0:
            hint = "safe to remove"
        elif changed or (ahead not in ("0", "?") and not pr):
            hint = "has work not in a PR: ask"
        else:
            hint = "keep"
        print(f"{path} | {branch} | {changed} | {ahead} | {unpushed} | {pr_text} | "
              f"{', '.join(here) or '-'} | {hint}")


if __name__ == "__main__":
    main()
