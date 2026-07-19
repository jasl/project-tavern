// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  extractRootPnpmScriptsV1,
  readRootPackageScriptsV1,
  verifyGoalDocumentsV1,
} from "./verify-docs.mjs";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const manifest = JSON.parse(
  await readFile(join(root, "docs/engineering/plan-set.v1.json"), "utf8"),
);
const banner =
  "> **执行合同：** 本计划受 [`Goal Execution Protocol v1`](../execution-protocol.md) 约束；不依赖任何外部 workflow skill 或 plugin。";
const expectedRunbookPathsV1 = Object.freeze([
  "docs/runbooks/debug-bundle-sharing.md",
  "docs/runbooks/dependency-upgrades.md",
  "docs/runbooks/local-verification.md",
  "docs/runbooks/runtime-capabilities.md",
  "docs/runbooks/save-data-recovery.md",
  "docs/runbooks/semantic-automation.md",
  "docs/runbooks/story-hotfix-authoring.md",
]);
const releaseEvidenceTemplatePathV1 = "docs/engineering/checkpoints/release-evidence-template.md";
const finalHumanReviewPathV1 =
  "docs/engineering/plans/2026-07-12-project-tavern-final-human-review.md";
const remoteDistributionPathV1 =
  "docs/engineering/plans/2026-07-12-project-tavern-remote-distribution-deferred.md";

async function write(rootPath, path, contents) {
  await mkdir(dirname(join(rootPath, path)), { recursive: true });
  await writeFile(join(rootPath, path), contents);
}

async function fixture(options = {}) {
  const includeTask5 = options.includeTask5 ?? true;
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
  if (includeTask5) {
    for (const path of expectedRunbookPathsV1) {
      await write(directory, path, await readFile(join(root, path), "utf8"));
    }
    await write(
      directory,
      releaseEvidenceTemplatePathV1,
      await readFile(join(root, releaseEvidenceTemplatePathV1), "utf8"),
    );
  }
  const rootIndexLinks = includeTask5
    ? [
        ...expectedRunbookPathsV1,
        releaseEvidenceTemplatePathV1,
        finalHumanReviewPathV1,
        remoteDistributionPathV1,
      ].map((path) => `- [fixture](${path})`)
    : [];
  const docsIndexLinks = includeTask5
    ? [
        ...expectedRunbookPathsV1,
        releaseEvidenceTemplatePathV1,
        finalHumanReviewPathV1,
        remoteDistributionPathV1,
      ].map((path) => `- [fixture](${path.replace(/^docs\//u, "")})`)
    : [];
  await write(
    directory,
    "docs/README.md",
    ["[Goal](engineering/GOAL.md)", ...docsIndexLinks].join("\n"),
  );
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
      ...rootIndexLinks,
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
  await write(directory, "package.json", await readFile(join(root, "package.json"), "utf8"));
  return directory;
}

test("extracts root pnpm scripts only from Markdown code", () => {
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
        "Node/pnpm checkpoint prose is not a command.",
        "```bash",
        "pnpm verify",
        "```",
      ].join("\n"),
    ),
    ["verify", "verify:balance:freeze", "verify:release"],
  );
  assert.deepEqual(extractRootPnpmScriptsV1("`pnpm run publish`"), ["publish"]);
});

test("verifies the checked-in goal document contract", async () => {
  assert.deepEqual(await verifyGoalDocumentsV1(root), []);
});

test("accepts a complete synthetic Task 5 document contract", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  assert.deepEqual(await verifyGoalDocumentsV1(directory), []);
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

test("rejects a missing Task 5 runbook set", async (t) => {
  const directory = await fixture({ includeTask5: false });
  t.after(() => rm(directory, { recursive: true, force: true }));
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some(
      (error) => error.includes("plan.runbook_missing") || error.includes("plan.runbook_inventory"),
    ),
    errors.join("\n"),
  );
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

test("contains the complete Phase 6 runbook inventory", async () => {
  const runbooks = (await readdir(join(root, "docs/runbooks"), { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => `docs/runbooks/${entry.name}`)
    .sort();
  assert.deepEqual(runbooks, expectedRunbookPathsV1);
  await readFile(join(root, releaseEvidenceTemplatePathV1), "utf8");
});

test("links every Phase 6 runbook and release template from the indexes", async () => {
  const rootReadme = await readFile(join(root, "README.md"), "utf8");
  const docsReadme = await readFile(join(root, "docs/README.md"), "utf8");
  for (const path of expectedRunbookPathsV1) {
    assert(rootReadme.includes(path), `README.md does not link ${path}`);
    assert(
      docsReadme.includes(path.replace(/^docs\//u, "")),
      `docs/README.md does not link ${path}`,
    );
  }
  assert(rootReadme.includes(releaseEvidenceTemplatePathV1));
  assert(docsReadme.includes(releaseEvidenceTemplatePathV1.replace(/^docs\//u, "")));
});

test("mentions only existing pnpm scripts", async () => {
  const scripts = await readRootPackageScriptsV1(root);
  const commands = new Set();
  for (const path of expectedRunbookPathsV1) {
    const text = await readFile(join(root, path), "utf8");
    for (const command of extractRootPnpmScriptsV1(text)) commands.add(command);
  }
  assert.deepEqual([...commands].filter((command) => !Object.hasOwn(scripts, command)).sort(), []);
});

test("contains capability and semantic automation stop lines", async () => {
  const capabilities = await readFile(join(root, "docs/runbooks/runtime-capabilities.md"), "utf8");
  assert(capabilities.includes("默认关闭"));
  assert(capabilities.includes("RunIntegrity"));
  const automation = await readFile(join(root, "docs/runbooks/semantic-automation.md"), "utf8");
  assert(automation.includes("SemanticGamePort"));
  assert(automation.includes("不得暴露 DebugTools"));
});

test("requires one real Markdown link for every runbook index target", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const readmePath = join(directory, "README.md");
  const target = expectedRunbookPathsV1[0];
  const readme = await readFile(readmePath, "utf8");
  await writeFile(readmePath, readme.replace(`[fixture](${target})`, target));
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some(
      (error) => error.includes("plan.runbook_index") && error.includes(`${target} link count 0`),
    ),
    errors.join("\n"),
  );
});

test("rejects a duplicate runbook index link", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const readmePath = join(directory, "README.md");
  const target = expectedRunbookPathsV1[0];
  const readme = await readFile(readmePath, "utf8");
  await writeFile(readmePath, `${readme}\n[duplicate](${target})\n`);
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some(
      (error) => error.includes("plan.runbook_index") && error.includes(`${target} link count 2`),
    ),
    errors.join("\n"),
  );
});

test("rejects duplicate or reordered required runbook headings", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = expectedRunbookPathsV1[0];
  const absolute = join(directory, path);
  const text = await readFile(absolute, "utf8");
  const reordered = text
    .replace("## 前置条件", "## __TEMP__")
    .replace("## 精确命令", "## 前置条件")
    .replace("## __TEMP__", "## 精确命令");
  await writeFile(absolute, `${reordered}\n## 停止条件\n`);
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.filter((error) => error.includes("plan.runbook_structure") && error.includes(path))
      .length >= 2,
    errors.join("\n"),
  );
});

test("rejects missing privacy lifecycle content", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = "docs/runbooks/debug-bundle-sharing.md";
  const absolute = join(directory, path);
  const text = await readFile(absolute, "utf8");
  await writeFile(absolute, text.replaceAll("RuntimeCapabilities", "Runtime-Capabilities"));
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some(
      (error) =>
        error.includes("plan.runbook_content") &&
        error.includes(path) &&
        error.includes("RuntimeCapabilities"),
    ),
    errors.join("\n"),
  );
});

test("freezes the release evidence command order", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const absolute = join(directory, releaseEvidenceTemplatePathV1);
  const text = await readFile(absolute, "utf8");
  const reordered = text
    .replace("`pnpm build:poc`", "`pnpm build:temporary`")
    .replace("`pnpm build:e2e`", "`pnpm build:poc`")
    .replace("`pnpm build:temporary`", "`pnpm build:e2e`");
  await writeFile(absolute, reordered);
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some((error) => error.includes("plan.release_template_commands")),
    errors.join("\n"),
  );
});

test("rejects extra and semantic-duplicate release evidence commands", async (t) => {
  for (const extra of ["pnpm typecheck", "pnpm run verify:docs"]) {
    const directory = await fixture();
    t.after(() => rm(directory, { recursive: true, force: true }));
    const absolute = join(directory, releaseEvidenceTemplatePathV1);
    const text = await readFile(absolute, "utf8");
    const marker = "| `pnpm verify:docs`";
    await writeFile(
      absolute,
      text.replace(
        marker,
        `| \`${extra}\`                          |      |          |\n${marker}`,
      ),
    );
    const errors = await verifyGoalDocumentsV1(directory);
    assert(
      errors.some((error) => error.includes("plan.release_template_commands")),
      `${extra}\n${errors.join("\n")}`,
    );
  }
});

test("rejects publish commands even though publish is a pnpm builtin", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const absolute = join(directory, expectedRunbookPathsV1[0]);
  const text = await readFile(absolute, "utf8");
  await writeFile(absolute, `${text}\n\`\`\`bash\npnpm publish\n\`\`\`\n`);
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some(
      (error) => error.includes("plan.command_forbidden") && error.includes("pnpm publish"),
    ),
    errors.join("\n"),
  );
});

test("rejects an explicit pnpm run publish command", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const absolute = join(directory, expectedRunbookPathsV1[0]);
  const text = await readFile(absolute, "utf8");
  await writeFile(absolute, `${text}\n\`\`\`bash\npnpm run publish\n\`\`\`\n`);
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some(
      (error) => error.includes("plan.command_forbidden") && error.includes("pnpm publish"),
    ),
    errors.join("\n"),
  );
});

test("reports a runbook directory with the wrong filesystem type", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const runbookDirectory = join(directory, "docs/runbooks");
  await rm(runbookDirectory, { recursive: true });
  await writeFile(runbookDirectory, "not a directory\n");
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some((error) => error.includes("plan.runbook_wrong_type")),
    errors.join("\n"),
  );
});

test("reports a runbook file with the wrong filesystem type", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const absolute = join(directory, expectedRunbookPathsV1[0]);
  await rm(absolute);
  await mkdir(absolute);
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some((error) => error.includes("plan.runbook_wrong_type")),
    errors.join("\n"),
  );
});

test("reports a release template with the wrong filesystem type", async (t) => {
  const directory = await fixture();
  t.after(() => rm(directory, { recursive: true, force: true }));
  const absolute = join(directory, releaseEvidenceTemplatePathV1);
  await rm(absolute);
  await mkdir(absolute);
  const errors = await verifyGoalDocumentsV1(directory);
  assert(
    errors.some((error) => error.includes("plan.release_template_wrong_type")),
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
