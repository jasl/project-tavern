// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { extractRootPnpmScriptsV1, verifyGoalDocumentsV1 } from "./verify-docs.mjs";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const manifest = JSON.parse(
  await readFile(join(root, "docs/engineering/plan-set.v1.json"), "utf8"),
);
const banner =
  "> **执行合同：** 本计划受 [`Goal Execution Protocol v1`](../execution-protocol.md) 约束；不依赖任何外部 workflow skill 或 plugin。";

async function write(rootPath, path, contents) {
  await mkdir(dirname(join(rootPath, path)), { recursive: true });
  await writeFile(join(rootPath, path), contents);
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "tavern-goal-docs-"));
  await write(directory, "docs/engineering/plan-set.v1.json", `${JSON.stringify(manifest)}\n`);
  await write(
    directory,
    manifest.operatorEntrypoint,
    [
      "# Goal",
      "",
      "<!-- goal-entrypoint:v1 -->",
      "",
      "[protocol](execution-protocol.md)",
      "",
      "## 4. 强制阶段图",
      ...manifest.mainGoal.map((entry) => `- [${entry.id}](plans/${entry.path.split("/").at(-1)})`),
    ].join("\n"),
  );
  await write(directory, manifest.executionProtocol, "# Goal Execution Protocol v1\n");
  await write(
    directory,
    manifest.roadmap,
    [
      "# Roadmap",
      "",
      banner,
      "",
      "## Mainline Plan Set and Required Order",
      ...manifest.mainGoal.map((entry) => `- [${entry.id}](${entry.path.split("/").at(-1)})`),
    ].join("\n"),
  );
  for (const entry of [...manifest.preGoal, ...manifest.mainGoal]) {
    const tasks = Array.from(
      { length: entry.taskCount },
      (_, index) => `## Task ${String(index + 1)}: fixture`,
    ).join("\n\n");
    await write(
      directory,
      entry.path,
      `# ${entry.id}\n\n${banner}\n\n${tasks}\n\n## ${entry.acceptanceHeading}\n`,
    );
  }
  for (const entry of [...manifest.postGoal, ...manifest.deferred]) {
    await write(directory, entry.path, `# ${entry.id}\n`);
  }
  await write(directory, "docs/engineering/README.md", "[Goal](GOAL.md)\n");
  await write(directory, "docs/engineering/checkpoints/README.md", "# Checkpoints\n");
  await write(directory, "docs/README.md", "[Goal](engineering/GOAL.md)\n");
  await write(
    directory,
    "README.md",
    [
      "[Goal](docs/engineering/GOAL.md)",
      "",
      "`pnpm verify` is the ordinary non-release gate.",
      "`pnpm verify:release` is the clean-worktree release gate.",
      "`pnpm verify:balance:freeze` is frozen-evidence admission only and does not run the full balance corpus.",
      "These commands do not use the network, push, or deploy.",
    ].join("\n"),
  );
  await write(directory, "AGENTS.md", "[Goal](docs/engineering/GOAL.md)\n");
  await write(
    directory,
    "CONTRIBUTING.md",
    [
      "# Contributing",
      "",
      "`pnpm verify` is the ordinary non-release gate.",
      "`pnpm verify:release` is the clean-worktree release gate.",
      "`pnpm verify:balance:freeze` is frozen-evidence admission only and does not run the full balance corpus.",
      "These commands do not use the network, push, or deploy.",
    ].join("\n"),
  );
  await write(directory, "LICENSE.md", "# License\n");
  await write(
    directory,
    "package.json",
    `${JSON.stringify({
      scripts: {
        verify: "node scripts/verify.mjs",
        "verify:balance:freeze":
          "node --experimental-strip-types scripts/release/verify-balance-freeze.mts",
        "verify:docs": "node scripts/docs/verify-docs.mjs",
        "verify:release": "node scripts/verify-release.mjs",
      },
    })}\n`,
  );
  return directory;
}

test("extracts only root pnpm script invocations from operator prose", () => {
  assert.deepEqual(
    extractRootPnpmScriptsV1(
      [
        "`pnpm verify`",
        "`pnpm run verify`",
        "`pnpm verify:release -- --allow-development`",
        "`pnpm verify:balance:freeze`",
        "`pnpm install --offline --frozen-lockfile`",
        "`pnpm exec vitest run test.ts`",
        "`pnpm --filter @project-tavern/story-poc verify:commands`",
      ].join("\n"),
    ),
    ["verify", "verify:balance:freeze", "verify:release"],
  );
});

test("verifies the checked-in goal document contract", async () => {
  assert.deepEqual(await verifyGoalDocumentsV1(root), []);
});

test("rejects a removed workflow skill reference", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(
    join(directory, manifest.mainGoal[0].path),
    `# phase2\n\n${banner}\n\nREQUIRED SUB-SKILL\n\n## Phase 2 Acceptance\n`,
  );
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some((error) => error.includes("plan.forbidden_skill")),
    errors.join("\n"),
  );
});

test("rejects reordered Goal phase links", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const reversed = manifest.mainGoal.toReversed();
  await writeFile(
    join(directory, manifest.operatorEntrypoint),
    [
      "# Goal",
      "",
      "<!-- goal-entrypoint:v1 -->",
      "",
      "[protocol](execution-protocol.md)",
      "",
      "## 4. 强制阶段图",
      ...reversed.map((entry) => `- [${entry.id}](plans/${entry.path.split("/").at(-1)})`),
    ].join("\n"),
  );
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some((error) => error.includes("plan.phase_link_order")),
    errors.join("\n"),
  );
});

test("rejects duplicate manifest identities and paths", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const invalid = structuredClone(manifest);
  invalid.mainGoal[1].id = invalid.mainGoal[0].id;
  invalid.mainGoal[1].path = invalid.mainGoal[0].path;
  await writeFile(
    join(directory, "docs/engineering/plan-set.v1.json"),
    `${JSON.stringify(invalid)}\n`,
  );
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some((error) => error.includes("plan.manifest_duplicate_id")),
    errors.join("\n"),
  );
  assert(
    errors.some((error) => error.includes("plan.manifest_duplicate_path")),
    errors.join("\n"),
  );
});

test("rejects predecessor handoff drift", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const invalid = structuredClone(manifest);
  invalid.predecessorHandoffs[0].paths = ["game/packages/assets/src/other.ts"];
  invalid.predecessorHandoffs[0].verification = "true";
  await writeFile(
    join(directory, "docs/engineering/plan-set.v1.json"),
    `${JSON.stringify(invalid)}\n`,
  );
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some((error) => error.includes("plan.manifest_handoff")),
    errors.join("\n"),
  );
});

test("rejects control path and plan path drift", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const invalid = structuredClone(manifest);
  invalid.executionProtocol = "docs/engineering/README.md";
  invalid.mainGoal[0].path = invalid.postGoal[0].path;
  await writeFile(
    join(directory, "docs/engineering/plan-set.v1.json"),
    `${JSON.stringify(invalid)}\n`,
  );
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some((error) => error.includes("plan.manifest_control_paths")),
    errors.join("\n"),
  );
  assert(
    errors.some((error) => error.includes("plan.manifest_plan_path")),
    errors.join("\n"),
  );
});

test("rejects post-goal and deferred dependency drift", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const invalid = structuredClone(manifest);
  invalid.postGoal[0].requires = ["phase5c"];
  invalid.deferred[0].requires = [];
  await writeFile(
    join(directory, "docs/engineering/plan-set.v1.json"),
    `${JSON.stringify(invalid)}\n`,
  );
  const errors = await verifyGoalDocumentsV1(directory);
  assert.equal(errors.filter((error) => error.includes("plan.manifest_dependency")).length, 2);
});

test("rejects an entrypoint marker outside the operator entrypoint", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const goalPath = join(directory, manifest.operatorEntrypoint);
  const goal = await readFile(goalPath, "utf8");
  await writeFile(goalPath, goal.replace("<!-- goal-entrypoint:v1 -->\n", ""));
  await writeFile(
    join(directory, "CONTRIBUTING.md"),
    "# Contributing\n\n<!-- goal-entrypoint:v1 -->\n",
  );
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some((error) => error.includes("plan.entrypoint_marker")),
    errors.join("\n"),
  );
  assert(!errors.some((error) => error.includes("plan.entrypoint_count")), errors.join("\n"));
});

test("rejects a truncated executable phase", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const entry = manifest.mainGoal[0];
  await writeFile(
    join(directory, entry.path),
    `# phase2\n\n${banner}\n\n## Task 1: only task\n\n## ${entry.acceptanceHeading}\n`,
  );
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some((error) => error.includes("plan.task_count")),
    errors.join("\n"),
  );
});

test("rejects broken local links while allowing external links", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(
    join(directory, "README.md"),
    "[Goal](docs/engineering/GOAL.md)\n[missing](docs/missing.md)\n[external](https://example.com)\n",
  );
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some((error) => error.includes("plan.link_missing")),
    errors.join("\n"),
  );
  assert(!errors.some((error) => error.includes("example.com")), errors.join("\n"));
});

test("rejects an unknown root pnpm command in operator documentation", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const readmePath = join(directory, "README.md");
  const readme = await readFile(readmePath, "utf8");
  await writeFile(readmePath, `${readme}\nRun \`pnpm verify:invented\`.\n`);
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some((error) => error.includes("plan.command_unknown")),
    errors.join("\n"),
  );
});

test("rejects drift in the exact public verification scripts", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  await write(
    directory,
    "package.json",
    `${JSON.stringify({
      scripts: {
        verify: "node scripts/verify.mjs",
        "verify:balance:freeze": "node scripts/wrong.mjs",
        "verify:docs": "node scripts/docs/verify-docs.mjs",
        "verify:release": "node scripts/verify-release.mjs",
      },
    })}\n`,
  );
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some((error) => error.includes("plan.public_command")),
    errors.join("\n"),
  );
});

test("rejects missing public verification scope documentation", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(
    join(directory, "CONTRIBUTING.md"),
    "# Contributing\n\n`pnpm verify` is available.\n",
  );
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some((error) => error.includes("plan.public_command_documentation")),
    errors.join("\n"),
  );
});

test("does not require Task 5 runbooks before they exist", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  assert.deepEqual(await verifyGoalDocumentsV1(directory), []);
});

test("validates runbook commands only after the runbook directory exists", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  await write(directory, "docs/runbooks/example.md", "# Example\n\nRun `pnpm verify:invented`.\n");
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some(
      (error) =>
        error.includes("plan.command_unknown") && error.includes("docs/runbooks/example.md"),
    ),
    errors.join("\n"),
  );
});

test("rejects an interactive blocker in an executable phase", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(
    join(directory, manifest.mainGoal[0].path),
    `# phase2\n\n${banner}\n\nWait for user confirmation.\n\n## Phase 2 Acceptance\n`,
  );
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some((error) => error.includes("plan.interactive_blocker")),
    errors.join("\n"),
  );
});
