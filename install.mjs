#!/usr/bin/env node
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const HELP = `Usage: node install.mjs [--dry-run] [--rules] [--uninstall]

Installs the skill suite for Claude Code and Codex. Safe to run more than once.

  1. Links each skill in skills/ into ~/.claude/skills/ (Claude Code) and ~/.agents/skills/ (Codex).
  2. Registers the git-guardrails hook in ~/.claude/settings.json and ~/.codex/hooks.json.
  3. Only with --rules: writes a managed block with GLOBAL.md and a pointer to START-HERE.md.
     ~/.claude/CLAUDE.md imports GLOBAL.md with @, so edits apply at once.
     ~/.codex/AGENTS.md gets a copy, so rerun with --rules after you edit GLOBAL.md.

  --dry-run    Print what would change. Change nothing.
  --rules      Also add the GLOBAL.md rules to ~/.claude/CLAUDE.md and ~/.codex/AGENTS.md.
  --uninstall  Remove the links, the hook and the managed blocks that this script added.

A path that exists and is not a link to this suite is never replaced. It is reported as a collision.`;

const SUITE = dirname(fileURLToPath(import.meta.url));
const HOME = homedir();
const SKILL_DIRS = [join(HOME, ".claude/skills"), join(HOME, ".agents/skills")];
const BLOCK_START = "<!-- shared-skill-suite:start -->";
const BLOCK_END = "<!-- shared-skill-suite:end -->";
const SUITE_LINES = `## Skill suite

- Read \`${join(SUITE, "START-HERE.md")}\` before you use a suite skill. It says which skill fits which task.`;

function managedBlock(agent) {
  const rules =
    agent === "claude"
      ? `@${join(SUITE, "GLOBAL.md")}`
      : readFileSync(join(SUITE, "GLOBAL.md"), "utf8").trim();
  return `${BLOCK_START}\n${rules}\n\n${SUITE_LINES}\n${BLOCK_END}`;
}

const GUARDRAILS = join(SUITE, "hooks/git-guardrails.mjs");
const HOOK = {
  event: "PreToolUse",
  claudeMatcher: "Bash",
  codexMatcher: "Bash|shell|exec_command|unified_exec|local_shell",
  command: `node "${GUARDRAILS}"`,
  timeout: 10,
};

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean" },
    rules: { type: "boolean" },
    uninstall: { type: "boolean" },
    help: { type: "boolean" },
  },
});
if (values.help) {
  console.log(HELP);
  process.exit(0);
}
const dryRun = Boolean(values["dry-run"]);
const report = { changed: [], unchanged: [], collisions: [] };

function change(description, apply) {
  report.changed.push(description);
  if (!dryRun) apply();
}

function linkTarget(path) {
  try {
    return lstatSync(path).isSymbolicLink() ? resolve(dirname(path), readlinkSync(path)) : null;
  } catch {
    return undefined;
  }
}

function skillSources() {
  const root = join(SUITE, "skills");
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, entry.name, "SKILL.md")))
    .map((entry) => join(root, entry.name));
}

function installSkills() {
  for (const dir of SKILL_DIRS) {
    if (!existsSync(dir)) change(`create ${dir}`, () => mkdirSync(dir, { recursive: true }));
    for (const source of skillSources()) {
      const target = join(dir, source.split("/").pop());
      const current = linkTarget(target);
      if (current === source) report.unchanged.push(target);
      else if (current === undefined) change(`link ${target}`, () => symlinkSync(source, target));
      else if (current && current.startsWith(`${SUITE}/`)) {
        change(`relink ${target}`, () => {
          unlinkSync(target);
          symlinkSync(source, target);
        });
      }
      else report.collisions.push(`${target} exists and is not a link to ${source}`);
    }
  }
}

function uninstallSkills() {
  for (const dir of SKILL_DIRS) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      const target = join(dir, name);
      const current = linkTarget(target);
      if (current && current.startsWith(`${SUITE}/`)) change(`unlink ${target}`, () => unlinkSync(target));
    }
  }
}

function readJson(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function setHook(path, matcherKey, install) {
  const config = readJson(path);
  const before = JSON.stringify(config);
  config.hooks ??= {};
  const entries = (config.hooks[HOOK.event] ?? []).filter(
    (entry) => !entry.hooks?.some((h) => typeof h.command === "string" && h.command.includes(GUARDRAILS)),
  );
  if (install) {
    entries.push({
      matcher: HOOK[matcherKey],
      hooks: [{ type: "command", command: HOOK.command, timeout: HOOK.timeout }],
    });
  }
  if (entries.length) config.hooks[HOOK.event] = entries;
  else delete config.hooks[HOOK.event];
  if (!Object.keys(config.hooks).length) delete config.hooks;
  if (JSON.stringify(config) === before) report.unchanged.push(path);
  else change(`${install ? "register" : "remove"} the git-guardrails hook in ${path}`, () => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  });
}

function setBlock(path, agent, install) {
  const text = existsSync(path) ? readFileSync(path, "utf8") : "";
  if (!install && !text.includes(BLOCK_START)) return;
  const pattern = new RegExp(`\\n*${BLOCK_START}[\\s\\S]*?${BLOCK_END}\\n?`);
  const without = text.replace(pattern, "\n").replace(/\n+$/, "\n");
  const next = install ? `${without.trimEnd()}\n\n${managedBlock(agent)}\n` : without;
  if (next === text) report.unchanged.push(path);
  else change(`${install ? "write" : "remove"} the managed block in ${path}`, () => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, next);
  });
}

function findCodexDuplicates() {
  const codexOwn = join(HOME, ".codex/skills");
  if (!existsSync(codexOwn)) return;
  const suiteNames = new Set(skillSources().map((source) => source.split("/").pop()));
  for (const name of readdirSync(codexOwn)) {
    if (suiteNames.has(name)) {
      report.collisions.push(`${join(codexOwn, name)} has the same name as a suite skill. Codex loads both.`);
    }
  }
}

const install = !values.uninstall;
if (install) installSkills();
else uninstallSkills();
setHook(join(HOME, ".claude/settings.json"), "claudeMatcher", install);
setHook(join(HOME, ".codex/hooks.json"), "codexMatcher", install);
// The rules block is opt-in on install, but uninstall always removes it if present.
if (values.rules || !install) {
  setBlock(join(HOME, ".claude/CLAUDE.md"), "claude", install);
  setBlock(join(HOME, ".codex/AGENTS.md"), "codex", install);
}
if (install) findCodexDuplicates();

const verb = dryRun ? "Would change" : "Changed";
console.log(`${verb} (${report.changed.length}):`);
for (const line of report.changed) console.log(`  ${line}`);
console.log(`Unchanged: ${report.unchanged.length}`);
if (report.collisions.length) {
  console.log(`Collisions (${report.collisions.length}), left as they are:`);
  for (const line of report.collisions) console.log(`  ${line}`);
}
if (install && !dryRun && report.changed.some((line) => line.includes(".codex/hooks.json"))) {
  console.log("Codex asks you to trust the new hook the next time it starts.");
}
