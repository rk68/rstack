#!/usr/bin/env node
// PreToolUse hook for shell tools in Claude Code (Bash) and Codex (shell, exec_command): blocks destructive git and production Convex commands. Exit 2 blocks the command and sends stderr to the agent.
import { readFileSync } from "node:fs";

const BLOCKED = [
  { pattern: /(?:^|[\s;&|(])git\s[^;&|]*\breset\s+[^;&|]*--hard\b/, why: "discards uncommitted work" },
  { pattern: /(?:^|[\s;&|(])git\s[^;&|]*\bclean\s+[^;&|]*-[a-zA-Z]*f/, why: "deletes untracked files" },
  { pattern: /(?:^|[\s;&|(])git\s[^;&|]*\bcheckout\s+(--\s+)?\.(\s|$|;|&|\|)/, why: "discards all unstaged changes" },
  { pattern: /(?:^|[\s;&|(])git\s[^;&|]*\brestore\b(?![^;&|]*--staged)[^;&|]*\s\.(\s|$|;|&|\|)/, why: "discards all unstaged changes" },
  { pattern: /(?:^|[\s;&|(])git\s[^;&|]*\bbranch\s+[^;&|]*(-D\b|--delete\s+--force|-d\s+--force)/, why: "deletes a branch with unmerged commits" },
  { pattern: /(?:^|[\s;&|(])git\s[^;&|]*\bpush\b[^;&|]*(--force(?!-with-lease)\b|\s-[a-zA-Z]*f\b)/, why: "overwrites remote history; use --force-with-lease" },
  { pattern: /(?:^|[\s;&|(])git\s[^;&|]*\bstash\s+(drop|clear)\b/, why: "deletes stash entries that other worktrees share" },
  { pattern: /(?:^|[\s;&|(\/])convex\s+deploy\b/, why: "deploys Convex functions to a cloud deployment" },
  { pattern: /(?:^|[\s;&|(\/])convex\s[^;&|]*--prod\b/, why: "acts on the production Convex deployment" },
  { pattern: /CONVEX_DEPLOY_KEY=\S+[^;&|]*\bconvex\s/, why: "runs Convex with a deploy key, which targets a cloud deployment" },
];

const input = JSON.parse(readFileSync(0, "utf8"));
const raw = input.tool_input?.command ?? input.tool_input?.cmd ?? "";
const command = Array.isArray(raw) ? raw.join(" ") : String(raw);
for (const { pattern, why } of BLOCKED) {
  if (pattern.test(command)) {
    process.stderr.write(
      `BLOCKED by git guardrails: this command ${why}. Ask the user to run it, or use a safer command.\nCommand: ${command}\n`,
    );
    process.exit(2);
  }
}
process.exit(0);
