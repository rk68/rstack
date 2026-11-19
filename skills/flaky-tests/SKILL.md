---
name: flaky-tests
description: Find flaky tests from CI history and local reruns, confirm each one, fix the root cause, and open one draft PR per cause. Use on a schedule (daily or weekly), or when the user says a test or CI job is flaky or "fails sometimes". Not for a test that fails every time, use diagnosing-bugs.
---

# Flaky tests

A test is flaky when it fails and passes on the same code. Each flaky failure costs a CI rerun and teaches people to ignore red builds. This skill finds them, proves them, and fixes the cause, not the symptom.

## 1. Find candidates

```bash
node ~/.claude/skills/flaky-tests/scripts/ci-flakes.mjs --days 14
```

The script lists CI jobs whose run failed and then passed on a rerun of the same commit, worst first, with links. Then read the failed logs of the top jobs to name the tests:

```bash
gh run view --job <job id> --log-failed | grep -E " FAIL | ×|Error|timed out"
```

A run that failed on one commit and passed after a new push is not evidence. Only a rerun of the same commit counts.

Done when you have a list of test names (or test files) with at least one failed-then-passed rerun each, or the script finds none. If it finds none, report "no flaky jobs in <days> days" and stop.

## 2. Confirm locally

Work in a new worktree from the default branch (see the `herdr-worktrees` skill, or `git worktree add`). Never change the person's own checkout.

For each candidate, run only its test file many times, with a shuffled order:

```bash
for i in $(seq 1 30); do <test command> <file> --sequence.shuffle || echo "FAIL $i"; done
```

For vitest, `--repeat`-style loops and `--sequence.shuffle` find order dependence. Also run it once with the whole package, because a test can fail only next to another test.

Done when each candidate is confirmed (it failed at least once locally) or marked "CI only" (it never failed locally in 30 runs).

## 3. Find the cause

Use the `diagnosing-bugs` skill. The usual causes, in the order to check:

1. Work that outlives the test: a timer, a scheduled function or a promise that nobody awaits. In convex-test, wait for scheduled work (`finishAllScheduledFunctions`, `finishInProgressScheduledFunctions`) or stub the scheduler.
2. Shared state between tests: a module-level cache, a database row, a mock that one test changes and another reads.
3. Time: real clocks, time zones, dates near midnight. Use fake timers and fixed dates.
4. Order and concurrency: two operations whose order the test assumes.
5. The network or a real service. Mock it at the system boundary.

A retry, a longer timeout or a skipped test is not a fix. Use one only with the cause written next to it, and say so in the PR.

## 4. Fix and open a PR

- One PR per root cause, on a new branch. Run the test 30 times again and show the count in the PR's test plan.
- Use the `commit-pr` conventions. Run `node ~/.claude/skills/merge-risk/scripts/risk.mjs pr <number> --write`.
- Leave the PR in draft.

## 5. Report

A short table: job or test, evidence (the links from step 1), local result, cause, PR link. Name the "CI only" tests too. They may need a CI-only cause (resources, parallel jobs).
