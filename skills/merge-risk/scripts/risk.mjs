#!/usr/bin/env node
// Merge risk for a pull request or a local branch, from its diff alone. One source of truth for
// the corral PR Stack panel (which imports mergeRisk and POLICY) and for the agent skills (which
// run this file).
//
//   node risk.mjs pr <number> [--write]   score an open PR in the current repo; --write sets the
//                                         risk:<level> label and the Risk block in the PR body
//   node risk.mjs branch [<base>]         score the current branch against <base> (default: the
//                                         remote default branch), before a PR exists
//   add --json for machine output
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// What a change touches, by path. Each rule adds its points once per change.
export const RISK_PATHS = [
  [/(^|\/)(schema\.(ts|js|prisma|sql)|migrations?\/|.*\.sql$)/i, 3, "schema or migration"],
  [/(^|\/)(auth|permissions?|access|acl|security|rbac|crypto|secrets?)([./_-]|\/|$)/i, 3, "auth or access control"],
  [/(^|\/)(\.github\/workflows|infra|terraform|deploy|helm|k8s)\/|(^|\/)(Dockerfile|vercel\.json|netlify\.toml|fly\.toml)$/i, 2, "CI, deploy or infrastructure"],
  [/(^|\/)(payments?|billing|invoices?|refunds?|ledger|stripe)([./_-]|\/|$)/i, 2, "money"],
  [/(^|\/)(convex|api|server|backend)\//i, 1, "backend"],
  [/(^|\/)(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb?|Cargo\.(toml|lock)|go\.(mod|sum)|requirements.*\.txt|pyproject\.toml|uv\.lock)$/i, 1, "dependencies"],
  [/(^|\/)(\.env[^/]*|config\/)/i, 1, "configuration"],
];
const isTest = (p) => /(^|\/)(__tests__|tests?|spec|e2e)\/|\.(test|spec)\.[cm]?[jt]sx?$|_test\.(go|py)$/i.test(p);
const isDoc = (p) => /\.(md|mdx|txt|rst)$|(^|\/)docs?\//i.test(p);

export const LEVELS = ["low", "medium", "high"];

/** What each level asks of review and merge. The skills and the panel both read this. */
export const POLICY = {
  low: { rounds: 1, reviewers: 1, split: false, autoMerge: true, human: false },
  medium: { rounds: 3, reviewers: 1, split: false, autoMerge: false, human: true },
  high: { rounds: 4, reviewers: 2, split: true, autoMerge: false, human: true },
};

/** { level, score, reasons } for { additions, deletions, changedFiles, files: [{ path } | path] }.
 * Size, sensitive paths and missing tests add points. A docs-only change is always low. */
export function mergeRisk(change) {
  const paths = (change.files ?? []).map((f) => (typeof f === "string" ? f : f.path));
  const lines = (change.additions ?? 0) + (change.deletions ?? 0);
  const count = change.changedFiles ?? paths.length;
  if (paths.length && paths.every(isDoc)) return { level: "low", score: 0, reasons: ["docs only"] };
  let score = 0;
  const reasons = [];
  const add = (n, why) => { score += n; reasons.push(why); };
  if (lines > 800) add(3, `${lines} lines`); else if (lines > 300) add(2, `${lines} lines`); else if (lines > 100) add(1, `${lines} lines`);
  if (count > 25) add(2, `${count} files`); else if (count > 10) add(1, `${count} files`);
  for (const [re, n, why] of RISK_PATHS) if (paths.some((p) => re.test(p))) add(n, why);
  if (paths.some((p) => !isTest(p) && !isDoc(p)) && !paths.some(isTest) && lines > 40) add(1, "no test changes");
  return { level: score >= 6 ? "high" : score >= 3 ? "medium" : "low", score, reasons };
}

/** The higher of the computed level and a risk:<level> label a person or agent set. */
export function withLabel(risk, labels = []) {
  const named = labels.map((l) => (typeof l === "string" ? l : l.name)).map((n) => /^risk:\s*(low|medium|high)$/i.exec(n)?.[1]?.toLowerCase()).find(Boolean);
  if (!named || LEVELS.indexOf(named) <= LEVELS.indexOf(risk.level)) return risk;
  return { ...risk, level: named, reasons: [...risk.reasons, `labelled ${named}`] };
}

// ---------- CLI ----------

const sh = (cmd, args, input, quiet) => execFileSync(cmd, args, { encoding: "utf8", input, maxBuffer: 64 << 20, stdio: ["pipe", "pipe", quiet ? "ignore" : "inherit"] });
const LABEL_COLOR = { low: "7fd6a8", medium: "e8c87e", high: "f07a8c" };
const START = "<!-- merge-risk:start -->";
const END = "<!-- merge-risk:end -->";

function block(risk) {
  const p = POLICY[risk.level];
  return [START,
    `**Merge risk: ${risk.level}** (score ${risk.score}): ${risk.reasons.join(", ") || "small change"}.`,
    `Review: ${p.rounds === 1 ? "one round" : `up to ${p.rounds} rounds`}, ${p.reviewers === 2 ? "two reviewer model families" : "one reviewer"}` +
      `${p.human ? ", then a person" : ""}. ${p.autoMerge ? "Auto-merge allowed when green." : "No auto-merge."}`,
    END].join("\n");
}

/** Puts the block under "## Risk", replacing an earlier block, or adds the section at the end. */
export function withBlock(body, risk) {
  const text = block(risk);
  if (body.includes(START)) return body.replace(new RegExp(`${START}[\\s\\S]*?${END}`), text);
  const m = /^## Risk[^\n]*\n/m.exec(body);
  if (m) return body.slice(0, m.index + m[0].length) + text + "\n\n" + body.slice(m.index + m[0].length);
  return `${body.trimEnd()}\n\n## Risk\n${text}\n`;
}

function scorePr(number, write) {
  const pr = JSON.parse(sh("gh", ["pr", "view", String(number), "--json", "number,additions,deletions,changedFiles,files,labels,body"]));
  const risk = withLabel(mergeRisk(pr), pr.labels);
  if (write) {
    for (const level of LEVELS) sh("gh", ["label", "create", `risk:${level}`, "--color", LABEL_COLOR[level], "--description", `Merge risk: ${level}`, "--force"]);
    const stale = pr.labels.map((l) => l.name).filter((n) => /^risk:/i.test(n) && n !== `risk:${risk.level}`);
    sh("gh", ["pr", "edit", String(number), "--add-label", `risk:${risk.level}`, ...stale.flatMap((n) => ["--remove-label", n])]);
    sh("gh", ["pr", "edit", String(number), "--body-file", "-"], withBlock(pr.body ?? "", risk));
  }
  return { number: pr.number, ...risk, policy: POLICY[risk.level], written: Boolean(write) };
}

function defaultBranch() {
  try { return sh("git", ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], undefined, true).trim().replace(/^origin\//, ""); } catch { /* not set in this clone */ }
  try { return sh("gh", ["repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"], undefined, true).trim() || "main"; } catch { return "main"; }
}

function scoreBranch(base) {
  const target = base ?? `origin/${defaultBranch()}`;
  const numstat = sh("git", ["diff", "--numstat", `${target}...HEAD`]).trim().split("\n").filter(Boolean);
  let additions = 0, deletions = 0;
  const files = numstat.map((line) => {
    const [a, d, ...rest] = line.split("\t");
    additions += Number(a) || 0; deletions += Number(d) || 0;
    return rest.join("\t");
  });
  return { base: target, ...mergeRisk({ additions, deletions, changedFiles: files.length, files }), policy: null };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const [mode, arg] = args.filter((a) => !a.startsWith("--"));
  let out;
  if (mode === "pr" && arg) out = scorePr(arg, args.includes("--write"));
  else if (mode === "branch") { out = scoreBranch(arg); out.policy = POLICY[out.level]; }
  else { console.error("usage: risk.mjs pr <number> [--write] [--json] | risk.mjs branch [<base>] [--json]"); process.exit(2); }
  if (json) console.log(JSON.stringify(out));
  else {
    console.log(`${out.number ? `#${out.number} ` : ""}merge risk ${out.level.toUpperCase()} (score ${out.score}): ${out.reasons.join(", ") || "small change"}`);
    const p = out.policy;
    console.log(`policy: ${p.rounds} review round(s), ${p.reviewers} reviewer(s), split ${p.split ? "first" : "not needed"}, auto-merge ${p.autoMerge ? "allowed" : "off"}, person ${p.human ? "required" : "optional"}`);
    if (out.written) console.log("wrote the risk label and the Risk block in the PR body");
  }
}
