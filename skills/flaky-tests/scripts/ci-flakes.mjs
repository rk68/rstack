#!/usr/bin/env node
// Finds flaky CI jobs in the current repo's GitHub Actions history: a run whose attempt failed and
// whose later attempt passed on the same commit. Nothing changed between the two, so the job is
// flaky. Prints one row per job, worst first.
//
//   node ci-flakes.mjs [--days 14] [--json]
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const days = Number(args[args.indexOf("--days") + 1]) || 14;
const json = args.includes("--json");
const gh = (path) => JSON.parse(execFileSync("gh", ["api", path], { encoding: "utf8", maxBuffer: 64 << 20 }));
const repo = execFileSync("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"], { encoding: "utf8" }).trim();
const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

const retried = [];
for (let page = 1; page <= 5; page++) {
  const { workflow_runs: runs } = gh(`repos/${repo}/actions/runs?per_page=100&page=${page}&created=%3E%3D${since}`);
  retried.push(...runs.filter((r) => r.run_attempt > 1));
  if (runs.length < 100) break;
}

const jobs = new Map(); // "workflow / job" -> { failures, examples }
for (const run of retried) {
  const attempts = [];
  for (let n = 1; n <= run.run_attempt; n++) attempts.push({ n, ...gh(`repos/${repo}/actions/runs/${run.id}/attempts/${n}`) });
  const passedAt = attempts.findIndex((a) => a.conclusion === "success");
  if (passedAt <= 0) continue; // never passed, or passed first time
  for (const a of attempts.slice(0, passedAt).filter((x) => x.conclusion === "failure")) {
    const { jobs: list } = gh(`repos/${repo}/actions/runs/${run.id}/attempts/${a.n}/jobs?per_page=100`);
    for (const job of list.filter((j) => j.conclusion === "failure")) {
      const key = `${run.name} / ${job.name}`;
      const row = jobs.get(key) ?? { job: key, failures: 0, examples: [] };
      row.failures++;
      if (row.examples.length < 3) row.examples.push({ sha: run.head_sha.slice(0, 7), branch: run.head_branch, url: job.html_url, at: job.completed_at });
      jobs.set(key, row);
    }
  }
}

const rows = [...jobs.values()].sort((a, b) => b.failures - a.failures);
if (json) console.log(JSON.stringify({ repo, days, retriedRuns: retried.length, flaky: rows }));
else {
  console.log(`${repo}: ${retried.length} retried runs in ${days} days, ${rows.length} flaky jobs`);
  for (const r of rows) {
    console.log(`\n${r.failures}x  ${r.job}`);
    for (const e of r.examples) console.log(`    ${e.sha} on ${e.branch}  ${e.url}`);
  }
}
