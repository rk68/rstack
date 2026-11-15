import { spawnSync } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";

const HOOK = new URL("./git-guardrails.mjs", import.meta.url).pathname;

function exitCode(command) {
  return spawnSync("node", [HOOK], { input: JSON.stringify({ tool_input: { command } }) }).status;
}

const blocked = [
  "git reset --hard HEAD",
  "echo hi && git reset --hard",
  "git -C /tmp reset --hard",
  "git clean -fd",
  "git checkout .",
  "git checkout -- .",
  "git restore .",
  "git branch -D foo",
  "git push --force",
  "git push -f origin x",
  "git stash drop stash@{0}",
  "git stash clear",
  "npx convex deploy",
  "pnpm exec convex deploy --typecheck enable",
  "npx convex run seed:run '{}' --prod",
  "npx convex env set FOO bar --prod",
  "CONVEX_DEPLOY_KEY=abc npx convex run x:y",
];

const allowed = [
  "git reset --soft HEAD~1",
  "git clean -n",
  "git checkout -- package.json",
  "git checkout main",
  "git restore --staged .",
  "git restore src/a.ts",
  "git branch -d foo",
  "git push",
  "git push -u origin x",
  "git push --force-with-lease",
  "git stash push -u -m tag",
  "echo 'git-guardrails blocks reset --hard'",
  "node hooks/git-guardrails.mjs",
  "npx convex dev --typecheck disable",
  "CONVEX_AGENT_MODE=anonymous npx convex run users:grantRole",
  "npx convex env set FOO bar",
  "pnpm exec convex typecheck",
];

for (const command of blocked) test(`blocks: ${command}`, () => assert.equal(exitCode(command), 2));
for (const command of allowed) test(`allows: ${command}`, () => assert.equal(exitCode(command), 0));

test("blocks a Codex array command", () => {
  const result = spawnSync("node", [HOOK], {
    input: JSON.stringify({ tool_input: { command: ["bash", "-lc", "git reset --hard HEAD"] } }),
  });
  assert.equal(result.status, 2);
});
