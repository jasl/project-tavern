// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const expectedPreGoalIdsV1 = Object.freeze(["phase0"]);
const expectedMainGoalIdsV1 = Object.freeze([
  "phase2",
  "phase3",
  "phase4a",
  "phase4b",
  "phase5a",
  "phase5b",
  "phase5c",
  "phase6",
]);
const expectedPostGoalIdsV1 = Object.freeze(["final-human-review"]);
const expectedDeferredIdsV1 = Object.freeze(["remote-distribution"]);
const expectedControlPathsV1 = Object.freeze({
  operatorEntrypoint: "docs/engineering/GOAL.md",
  executionProtocol: "docs/engineering/execution-protocol.md",
  roadmap: "docs/engineering/plans/2026-07-11-project-tavern-poc-roadmap.md",
});
const expectedHandoffV1 = Object.freeze({
  id: "approved-poc-asset-pack",
  paths: [
    "game/packages/assets/src/approved-poc-pack.ts",
    "game/packages/assets/src/approved-poc-pack.test.ts",
  ],
  verification: "pnpm exec vitest run game/packages/assets/src/approved-poc-pack.test.ts",
  mayBeEmpty: true,
});
const expectedPlanPathsV1 = Object.freeze({
  phase0: "docs/engineering/plans/2026-07-12-project-tavern-00-goal-materialization.md",
  phase2: "docs/engineering/plans/2026-07-11-project-tavern-02-modules-e2e-story.md",
  phase3: "docs/engineering/plans/2026-07-11-project-tavern-03-persistence-diagnostics.md",
  phase4a: "docs/engineering/plans/2026-07-11-project-tavern-04a-poc-gameplay-simulation.md",
  phase4b: "docs/engineering/plans/2026-07-11-project-tavern-04b-poc-story-golden.md",
  phase5a: "docs/engineering/plans/2026-07-12-project-tavern-05a-ui-runtime-foundations.md",
  phase5b:
    "docs/engineering/plans/2026-07-12-project-tavern-05b-stage-character-story-presentation.md",
  phase5c: "docs/engineering/plans/2026-07-12-project-tavern-05c-tooling-automation-acceptance.md",
  phase6: "docs/engineering/plans/2026-07-11-project-tavern-06-local-artifact.md",
  "final-human-review": "docs/engineering/plans/2026-07-12-project-tavern-final-human-review.md",
  "remote-distribution":
    "docs/engineering/plans/2026-07-12-project-tavern-remote-distribution-deferred.md",
});
const expectedRequirementsV1 = Object.freeze({
  phase0: ["approved-poc-asset-pack"],
  phase2: ["phase0"],
  phase3: ["phase2"],
  phase4a: ["phase3"],
  phase4b: ["phase4a"],
  phase5a: ["phase4b"],
  phase5b: ["phase5a"],
  phase5c: ["phase5b"],
  phase6: ["phase5c"],
  "final-human-review": ["phase6"],
  "remote-distribution": ["phase6"],
});
const executionBannerV1 =
  "> **执行合同：** 本计划受 [`Goal Execution Protocol v1`](../execution-protocol.md) 约束；";
const forbiddenWorkflowTokensV1 = Object.freeze([
  "REQUIRED SUB-SKILL",
  "superpowers:",
  "subagent-driven-development",
  "executing-plans",
]);
const expectedPublicVerificationScriptsV1 = Object.freeze({
  verify: "node scripts/verify.mjs",
  "verify:balance:freeze":
    "node --experimental-strip-types scripts/release/verify-balance-freeze.mts",
  "verify:docs": "node scripts/docs/verify-docs.mjs",
  "verify:release": "node scripts/verify-release.mjs",
});
const operatorCommandDocumentsV1 = Object.freeze(["README.md", "CONTRIBUTING.md"]);
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
const requiredRunbookHeadingsV1 = Object.freeze([
  "## 前置条件",
  "## 精确命令",
  "## 预期输出",
  "## 失败证据",
  "## 停止条件",
  "## 权威边界",
]);
const prepareGoalScriptV1 = ["prepare", "goal"].join(":");
const prepareGoalCommandFragmentV1 = `\`pnpm ${prepareGoalScriptV1}\``;
const requiredRunbookFragmentsV1 = Object.freeze({
  "docs/runbooks/debug-bundle-sharing.md": Object.freeze([
    "隐私审查",
    "明确同意",
    "RunIntegrity",
    "RuntimeCapabilities",
    "20 MiB",
    "不自动上传",
    "prepare",
    "review",
    "save",
    "discard",
    "绝对路径",
    "浏览器历史",
    "任意 Host storage",
    "未选择文件",
    "未裁剪异常",
  ]),
  "docs/runbooks/dependency-upgrades.md": Object.freeze([
    "精确版本",
    "frozen lockfile",
    prepareGoalCommandFragmentV1,
    "`pnpm verify:materialization`",
    "计划外依赖",
    "直接评审",
    "npm 依赖",
    "`vendor/**`",
  ]),
  "docs/runbooks/local-verification.md": Object.freeze([
    prepareGoalCommandFragmentV1,
    "offline/read-only",
    "build-input.json",
    "artifact-manifest.json",
    "sourceCommit",
    "sourceTree",
    "materializationDigest",
    "ResolvedGame",
    "application identity",
    "不会 publish",
  ]),
  "docs/runbooks/runtime-capabilities.md": Object.freeze([
    "默认关闭",
    "persisted OR session-requested",
    "不写回",
    "同一 Artifact",
    "read-only Debug",
    "Cheat",
    "RunIntegrity",
    "普通能力状态",
    "fresh",
    "Host preference",
    "session-requested",
    "Save/Load",
  ]),
  "docs/runbooks/save-data-recovery.md": Object.freeze([
    "auto.current",
    "auto.previous",
    "quick",
    "manual",
    "显式恢复候选",
    "compare-and-swap",
    "lease",
    "fencing",
    "bytes → Strict JSON → envelope Schema → state digest → compatibility/adoption → stable references → invariants",
    "不得强行载入",
  ]),
  "docs/runbooks/semantic-automation.md": Object.freeze([
    "SemanticGamePort",
    "__SILLYMAKER_AUTOMATION_V1__",
    "contractRevision",
    'kind: "ok"',
    "observe",
    "availableActions",
    "preview",
    "dispatch",
    "waitForIdle",
    "capability_disabled",
    "每次调用",
    "player-visible",
    "不得使用 sleep",
    "不得使用坐标",
    "不得暴露 DebugTools",
  ]),
  "docs/runbooks/story-hotfix-authoring.md": Object.freeze([
    "bootstrap-only",
    "同步确定性",
    "requires",
    "conflicts",
    "supersedes",
    "fresh registries",
    "撤销写能力",
    "PatchSet",
    "部分 GameSession",
  ]),
});
const requiredReleaseTemplateFragmentsV1 = Object.freeze([
  "模板本身不构成验收证据",
  "source commit",
  "source tree",
  "materialization digest",
  "frozen balance",
  "build-input.json",
  "artifact-manifest.json",
  "manifest digest",
  "reproducible",
  "Final Human Review",
  "Remote Distribution",
  "clean status before/after",
]);
const phase6AcceptanceCommandsV1 = Object.freeze([
  "pnpm verify:materialization",
  "pnpm install --offline --frozen-lockfile",
  "pnpm test:scripts",
  "pnpm verify:balance:freeze",
  "pnpm build:poc",
  "pnpm build:e2e",
  "pnpm verify",
  "pnpm verify:release",
  "pnpm release:repro",
  "pnpm test:e2e:prebuilt --project=chromium",
  "pnpm verify:docs",
  "git diff --check",
  "git status --short --branch",
]);
const forbiddenRunbookCommandPatternsV1 = Object.freeze([
  Object.freeze({
    label: "pnpm publish",
    pattern: /\bpnpm[ \t]+(?:run[ \t]+)?publish\b/gu,
  }),
  Object.freeze({
    label: "npm publish",
    pattern: /\bnpm[ \t]+(?:run[ \t]+)?publish\b/gu,
  }),
  Object.freeze({ label: "git push", pattern: /\bgit[ \t]+push\b/gu }),
  Object.freeze({
    label: "deployment command",
    pattern: /\b(?:wrangler|vercel|netlify)[ \t]+(?:deploy|publish)\b/gu,
  }),
]);
const publicVerificationDocumentationFragmentsV1 = Object.freeze([
  "`pnpm verify`",
  "ordinary non-release",
  "`pnpm verify:release`",
  "clean-worktree",
  "`pnpm verify:balance:freeze`",
  "frozen-evidence admission only",
  "full balance corpus",
  "network",
  "push",
  "deploy",
]);
const pnpmBuiltinsV1 = new Set([
  "add",
  "config",
  "dlx",
  "exec",
  "fetch",
  "import",
  "install",
  "list",
  "outdated",
  "patch",
  "publish",
  "remove",
  "run",
  "store",
  "update",
  "why",
]);

function diagnostic(code, path, line, message) {
  return `plan.${code} ${path}:${line} ${message}`;
}

function lineOf(text, index) {
  return text.slice(0, Math.max(0, index)).split("\n").length;
}

function withoutFencedCode(text) {
  let fenced = false;
  return text
    .split("\n")
    .map((line) => {
      if (/^\s*```/u.test(line)) {
        fenced = !fenced;
        return "";
      }
      return fenced ? "" : line;
    })
    .join("\n");
}

function markdownCodeFragmentsV1(text) {
  const fragments = [];
  let fenced = false;
  for (const line of text.split("\n")) {
    if (/^\s*```/u.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) {
      fragments.push(line);
      continue;
    }
    for (const match of line.matchAll(/`([^`\n]+)`/gu)) {
      fragments.push(match[1]);
    }
  }
  return fragments.join("\n");
}

function markdownSectionV1(text, heading) {
  const marker = `${heading}\n`;
  const headingIndex = text.indexOf(marker);
  if (headingIndex < 0) return "";
  const contentStart = headingIndex + marker.length;
  const remainder = text.slice(contentStart);
  const nextHeadingOffset = remainder.search(/^## /mu);
  return nextHeadingOffset < 0 ? remainder : remainder.slice(0, nextHeadingOffset);
}

function markdownLinkTargetsV1(text) {
  const targets = [];
  const prose = withoutFencedCode(text);
  const pattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/gu;
  for (const match of prose.matchAll(pattern)) {
    const encoded = match[1]?.replace(/^<|>$/gu, "").split("#", 1)[0];
    if (!encoded) continue;
    try {
      targets.push(decodeURIComponent(encoded));
    } catch {
      // The existing link validator reports the stable invalid-link diagnostic.
    }
  }
  return targets;
}

export function extractRootPnpmScriptsV1(text) {
  const commands = new Set();
  const code = markdownCodeFragmentsV1(text);
  for (const match of code.matchAll(/\bpnpm[ \t]+(?:(run)[ \t]+)?([^\s`"'|;&()[\]{}<>]+)/gu)) {
    const explicitRun = match[1] !== undefined;
    const token = match[2].replace(/[,.!?]+$/gu, "");
    if (
      token.startsWith("-") ||
      (!explicitRun && pnpmBuiltinsV1.has(token)) ||
      !/^[a-z0-9][a-z0-9:_-]*$/u.test(token)
    ) {
      continue;
    }
    commands.add(token);
  }
  return [...commands].sort();
}

export async function readRootPackageScriptsV1(root) {
  const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  if (
    packageJson === null ||
    typeof packageJson !== "object" ||
    packageJson.scripts === null ||
    typeof packageJson.scripts !== "object" ||
    Array.isArray(packageJson.scripts)
  ) {
    throw new TypeError("package.json scripts must be an object");
  }
  return packageJson.scripts;
}

async function pathStateWithoutSymlinkV1(root, path) {
  const logicalRoot = resolve(root);
  const absolute = resolve(logicalRoot, path);
  const logicalPrefix = `${logicalRoot}${sep}`;
  if (absolute !== logicalRoot && !absolute.startsWith(logicalPrefix)) return "escape";
  try {
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) return "symlink";
    const canonicalRoot = await realpath(logicalRoot);
    const canonicalPrefix = `${canonicalRoot}${sep}`;
    const canonical = await realpath(absolute);
    if (canonical !== canonicalRoot && !canonical.startsWith(canonicalPrefix)) return "escape";
    if (stat.isFile()) return "file";
    if (stat.isDirectory()) return "directory";
    return "other";
  } catch {
    return "missing";
  }
}

async function existsWithoutSymlink(root, path) {
  const state = await pathStateWithoutSymlinkV1(root, path);
  return state === "file" || state === "directory" ? "exists" : state;
}

async function markdownFiles(root) {
  const output = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (["node_modules", "dist", "references", ".git", ".superpowers"].includes(entry.name)) {
        continue;
      }
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && extname(entry.name) === ".md") {
        output.push(relative(root, path).split(sep).join("/"));
      }
    }
  }
  for (const path of ["docs", "AGENTS.md", "README.md", "CONTRIBUTING.md", "LICENSE.md"]) {
    const absolute = join(root, path);
    try {
      const stat = await lstat(absolute);
      if (stat.isDirectory()) await walk(absolute);
      else if (stat.isFile()) output.push(path);
    } catch {}
  }
  return [...new Set(output)].sort();
}

function section(text, heading) {
  const start = text.indexOf(heading);
  if (start < 0) return null;
  const next = text.indexOf("\n## ", start + heading.length);
  return text.slice(start, next < 0 ? undefined : next);
}

function validateOrderedPlanLinks(text, heading, entries, path, errors) {
  const body = section(text, heading);
  if (body === null) {
    errors.push(diagnostic("section_missing", path, 1, `missing ${heading}`));
    return;
  }
  let previous = -1;
  for (const entry of entries) {
    const basename = entry.path.split("/").at(-1);
    const matches = [...body.matchAll(new RegExp(basename.replaceAll(".", "\\."), "gu"))];
    if (matches.length !== 1) {
      errors.push(
        diagnostic(
          "phase_link_count",
          path,
          lineOf(text, text.indexOf(body)),
          `${entry.id} link count is ${matches.length}, expected 1`,
        ),
      );
      continue;
    }
    const index = matches[0].index ?? -1;
    if (index <= previous) {
      errors.push(
        diagnostic("phase_link_order", path, lineOf(text, text.indexOf(body) + index), entry.id),
      );
    }
    previous = index;
  }
}

async function validateMarkdownLinks(root, files, errors) {
  for (const path of files) {
    const text = withoutFencedCode(await readFile(join(root, path), "utf8"));
    const pattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/gu;
    for (const match of text.matchAll(pattern)) {
      let target = match[1];
      if (!target || /^(?:https?:|mailto:|data:|#)/u.test(target)) continue;
      target = target.replace(/^<|>$/gu, "").split("#", 1)[0];
      if (!target) continue;
      let decoded;
      try {
        decoded = decodeURIComponent(target);
      } catch {
        errors.push(diagnostic("link_invalid", path, lineOf(text, match.index), target));
        continue;
      }
      const repositoryPath = isAbsolute(decoded)
        ? decoded.replace(/^\/+/, "")
        : relative(root, resolve(root, dirname(path), decoded))
            .split(sep)
            .join("/");
      const state = await existsWithoutSymlink(root, repositoryPath);
      if (state !== "exists") {
        errors.push(
          diagnostic(
            `link_${state}`,
            path,
            lineOf(text, match.index),
            `${target} -> ${repositoryPath}`,
          ),
        );
      }
    }
  }
}

export async function verifyGoalDocumentsV1(root) {
  const errors = [];
  const manifestPath = "docs/engineering/plan-set.v1.json";
  let manifest;
  try {
    manifest = JSON.parse(await readFile(join(root, manifestPath), "utf8"));
  } catch (error) {
    return [diagnostic("manifest_invalid", manifestPath, 1, String(error))];
  }

  if (manifest.schemaRevision !== 1 || manifest.contractId !== "project-tavern.goal-plan-set.v1") {
    errors.push(diagnostic("manifest_identity", manifestPath, 1, "unexpected schema or contract"));
  }
  const actualControlPaths = {
    operatorEntrypoint: manifest.operatorEntrypoint,
    executionProtocol: manifest.executionProtocol,
    roadmap: manifest.roadmap,
  };
  if (JSON.stringify(actualControlPaths) !== JSON.stringify(expectedControlPathsV1)) {
    errors.push(diagnostic("manifest_control_paths", manifestPath, 1, "unexpected control path"));
  }
  const handoff = manifest.predecessorHandoffs?.[0];
  const actualHandoff = handoff && {
    id: handoff.id,
    paths: handoff.paths,
    verification: handoff.verification,
    mayBeEmpty: handoff.mayBeEmpty,
  };
  if (
    !Array.isArray(manifest.predecessorHandoffs) ||
    manifest.predecessorHandoffs.length !== 1 ||
    JSON.stringify(actualHandoff) !== JSON.stringify(expectedHandoffV1)
  ) {
    errors.push(diagnostic("manifest_handoff", manifestPath, 1, "approved-poc-asset-pack"));
  }
  for (const [field, expected] of [
    ["preGoal", expectedPreGoalIdsV1],
    ["mainGoal", expectedMainGoalIdsV1],
    ["postGoal", expectedPostGoalIdsV1],
    ["deferred", expectedDeferredIdsV1],
  ]) {
    const actual = Array.isArray(manifest[field]) ? manifest[field].map((entry) => entry.id) : [];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      errors.push(
        diagnostic("manifest_phase_order", manifestPath, 1, `${field}: ${actual.join(",")}`),
      );
    }
  }

  const entries = [
    ...(manifest.preGoal ?? []),
    ...(manifest.mainGoal ?? []),
    ...(manifest.postGoal ?? []),
    ...(manifest.deferred ?? []),
  ];
  const ids = entries.map((entry) => entry.id);
  const paths = entries.map((entry) => entry.path);
  if (new Set(ids).size !== ids.length) {
    errors.push(diagnostic("manifest_duplicate_id", manifestPath, 1, ids.join(",")));
  }
  if (new Set(paths).size !== paths.length) {
    errors.push(diagnostic("manifest_duplicate_path", manifestPath, 1, paths.join(",")));
  }
  for (const entry of entries) {
    if (entry.path !== expectedPlanPathsV1[entry.id]) {
      errors.push(diagnostic("manifest_plan_path", manifestPath, 1, entry.id));
    }
    if (JSON.stringify(entry.requires) !== JSON.stringify(expectedRequirementsV1[entry.id])) {
      errors.push(diagnostic("manifest_dependency", manifestPath, 1, entry.id));
    }
  }

  const executableEntries = [...(manifest.preGoal ?? []), ...(manifest.mainGoal ?? [])];
  const controlPaths = [
    manifest.operatorEntrypoint,
    manifest.executionProtocol,
    manifest.roadmap,
    ...paths,
  ];
  const texts = new Map();
  for (const path of controlPaths) {
    if (typeof path !== "string") {
      errors.push(diagnostic("manifest_path", manifestPath, 1, String(path)));
      continue;
    }
    const state = await existsWithoutSymlink(root, path);
    if (state !== "exists") {
      errors.push(diagnostic(`path_${state}`, manifestPath, 1, path));
      continue;
    }
    texts.set(path, await readFile(join(root, path), "utf8"));
  }

  const planDirectory = "docs/engineering/plans";
  const actualPlans = (await readdir(join(root, planDirectory)))
    .filter((name) => name.endsWith(".md"))
    .map((name) => `${planDirectory}/${name}`)
    .sort();
  const expectedPlans = [manifest.roadmap, ...paths].sort();
  if (JSON.stringify(actualPlans) !== JSON.stringify(expectedPlans)) {
    errors.push(diagnostic("plan_inventory", planDirectory, 1, "manifest and directory differ"));
  }

  for (const entry of executableEntries) {
    const text = texts.get(entry.path);
    if (text === undefined) continue;
    if (!text.slice(0, 1000).includes(executionBannerV1)) {
      errors.push(diagnostic("execution_banner", entry.path, 1, "missing v1 banner"));
    }
    if (!text.includes(`## ${entry.acceptanceHeading}`)) {
      errors.push(diagnostic("acceptance_heading", entry.path, 1, String(entry.acceptanceHeading)));
    }
    const taskCount = [...text.matchAll(/^#{2,3} Task \d+:/gmu)].length;
    if (taskCount !== entry.taskCount) {
      errors.push(
        diagnostic(
          "task_count",
          entry.path,
          1,
          `${taskCount}, expected ${String(entry.taskCount)}`,
        ),
      );
    }
    const checked = text.match(/^- \[[xX]\]/gmu);
    if (checked !== null) {
      errors.push(diagnostic("mutable_progress", entry.path, 1, "checked plan checkbox"));
    }
  }
  const roadmapText = texts.get(manifest.roadmap);
  if (roadmapText !== undefined) {
    if (!roadmapText.slice(0, 1000).includes(executionBannerV1)) {
      errors.push(diagnostic("execution_banner", manifest.roadmap, 1, "missing v1 banner"));
    }
    validateOrderedPlanLinks(
      roadmapText,
      "## Mainline Plan Set and Required Order",
      manifest.mainGoal ?? [],
      manifest.roadmap,
      errors,
    );
  }
  const goalText = texts.get(manifest.operatorEntrypoint);
  if (goalText !== undefined) {
    const entrypointMarkerCount = [...goalText.matchAll(/<!-- goal-entrypoint:v1 -->/gu)].length;
    if (entrypointMarkerCount !== 1) {
      errors.push(
        diagnostic(
          "entrypoint_marker",
          manifest.operatorEntrypoint,
          1,
          String(entrypointMarkerCount),
        ),
      );
    }
    validateOrderedPlanLinks(
      goalText,
      "## 4. 强制阶段图",
      manifest.mainGoal ?? [],
      manifest.operatorEntrypoint,
      errors,
    );
  }

  const allMarkdown = await markdownFiles(root);
  let markerCount = 0;
  for (const path of allMarkdown) {
    const text = await readFile(join(root, path), "utf8");
    markerCount += [...text.matchAll(/<!-- goal-entrypoint:v1 -->/gu)].length;
  }
  if (markerCount !== 1) {
    errors.push(
      diagnostic("entrypoint_count", manifest.operatorEntrypoint, 1, String(markerCount)),
    );
  }

  const runbookDirectoryV1 = "docs/runbooks";
  const runbookDirectoryStateV1 = await pathStateWithoutSymlinkV1(root, runbookDirectoryV1);
  if (runbookDirectoryStateV1 !== "directory") {
    errors.push(
      diagnostic(
        runbookDirectoryStateV1 === "file" || runbookDirectoryStateV1 === "other"
          ? "runbook_wrong_type"
          : `runbook_${runbookDirectoryStateV1}`,
        runbookDirectoryV1,
        1,
        `complete Phase 6 runbook directory is required, found ${runbookDirectoryStateV1}`,
      ),
    );
  } else {
    const runbookEntries = await readdir(join(root, runbookDirectoryV1), { withFileTypes: true });
    const actualRunbookPaths = runbookEntries
      .map((entry) => `${runbookDirectoryV1}/${entry.name}`)
      .sort();
    if (
      runbookEntries.some(
        (entry) => entry.isSymbolicLink() || !entry.isFile() || !entry.name.endsWith(".md"),
      ) ||
      JSON.stringify(actualRunbookPaths) !== JSON.stringify(expectedRunbookPathsV1)
    ) {
      errors.push(
        diagnostic(
          "runbook_inventory",
          runbookDirectoryV1,
          1,
          `found ${actualRunbookPaths.join(", ")}`,
        ),
      );
    }
  }

  for (const path of expectedRunbookPathsV1) {
    const state = await pathStateWithoutSymlinkV1(root, path);
    if (state !== "file") {
      const code =
        state === "directory" || state === "other" ? "runbook_wrong_type" : `runbook_${state}`;
      errors.push(diagnostic(code, path, 1, `required Phase 6 runbook file, found ${state}`));
      continue;
    }
    const text = await readFile(join(root, path), "utf8");
    let previousHeadingIndex = -1;
    for (const heading of requiredRunbookHeadingsV1) {
      const pattern = new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}$`, "gmu");
      const matches = [...text.matchAll(pattern)];
      if (matches.length !== 1) {
        errors.push(
          diagnostic("runbook_structure", path, 1, `${heading} count ${String(matches.length)}`),
        );
        continue;
      }
      const index = matches[0]?.index ?? -1;
      if (index <= previousHeadingIndex) {
        errors.push(
          diagnostic("runbook_structure", path, lineOf(text, index), `out of order ${heading}`),
        );
      }
      previousHeadingIndex = index;
    }
    for (const fragment of requiredRunbookFragmentsV1[path] ?? []) {
      if (!text.includes(fragment)) {
        errors.push(diagnostic("runbook_content", path, 1, `missing ${fragment}`));
      }
    }
  }

  const releaseTemplateStateV1 = await pathStateWithoutSymlinkV1(
    root,
    releaseEvidenceTemplatePathV1,
  );
  if (releaseTemplateStateV1 !== "file") {
    errors.push(
      diagnostic(
        releaseTemplateStateV1 === "directory" || releaseTemplateStateV1 === "other"
          ? "release_template_wrong_type"
          : `release_template_${releaseTemplateStateV1}`,
        releaseEvidenceTemplatePathV1,
        1,
        `required Phase 6 release evidence template file, found ${releaseTemplateStateV1}`,
      ),
    );
  } else {
    const template = await readFile(join(root, releaseEvidenceTemplatePathV1), "utf8");
    for (const fragment of requiredReleaseTemplateFragmentsV1) {
      if (!template.includes(fragment)) {
        errors.push(
          diagnostic("release_template_content", releaseEvidenceTemplatePathV1, 1, fragment),
        );
      }
    }
    const templateCommandLines = markdownCodeFragmentsV1(
      markdownSectionV1(template, "## Gate evidence"),
    )
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (JSON.stringify(templateCommandLines) !== JSON.stringify(phase6AcceptanceCommandsV1)) {
      errors.push(
        diagnostic(
          "release_template_commands",
          releaseEvidenceTemplatePathV1,
          1,
          `expected ${phase6AcceptanceCommandsV1.join(" -> ")}; found ${templateCommandLines.join(" -> ")}`,
        ),
      );
    }
  }

  const indexExpectationsV1 = Object.freeze({
    "README.md": [
      ...expectedRunbookPathsV1,
      releaseEvidenceTemplatePathV1,
      expectedPlanPathsV1["final-human-review"],
      expectedPlanPathsV1["remote-distribution"],
    ],
    "docs/README.md": [
      ...expectedRunbookPathsV1.map((path) => path.replace(/^docs\//u, "")),
      releaseEvidenceTemplatePathV1.replace(/^docs\//u, ""),
      expectedPlanPathsV1["final-human-review"].replace(/^docs\//u, ""),
      expectedPlanPathsV1["remote-distribution"].replace(/^docs\//u, ""),
    ],
  });
  for (const [path, targets] of Object.entries(indexExpectationsV1)) {
    const text = await readFile(join(root, path), "utf8");
    const linkedTargets = markdownLinkTargetsV1(text);
    for (const target of targets) {
      const count = linkedTargets.filter((candidate) => candidate === target).length;
      if (count !== 1) {
        errors.push(diagnostic("runbook_index", path, 1, `${target} link count ${String(count)}`));
      }
    }
  }

  let packageScripts;
  try {
    packageScripts = await readRootPackageScriptsV1(root);
  } catch (error) {
    errors.push(diagnostic("package_scripts_invalid", "package.json", 1, String(error)));
  }
  if (packageScripts !== undefined) {
    for (const [name, expected] of Object.entries(expectedPublicVerificationScriptsV1)) {
      if (packageScripts[name] !== expected) {
        errors.push(
          diagnostic(
            "public_command",
            "package.json",
            1,
            `${name}: ${String(packageScripts[name])}`,
          ),
        );
      }
    }

    const commandDocuments = [
      ...operatorCommandDocumentsV1,
      ...allMarkdown.filter((path) => path.startsWith("docs/runbooks/")),
      ...(allMarkdown.includes(releaseEvidenceTemplatePathV1)
        ? [releaseEvidenceTemplatePathV1]
        : []),
    ];
    for (const path of commandDocuments) {
      const text = await readFile(join(root, path), "utf8");
      for (const command of extractRootPnpmScriptsV1(text)) {
        if (!Object.hasOwn(packageScripts, command)) {
          errors.push(diagnostic("command_unknown", path, 1, command));
        }
      }
      const code = markdownCodeFragmentsV1(text);
      for (const forbidden of forbiddenRunbookCommandPatternsV1) {
        if ([...code.matchAll(forbidden.pattern)].length > 0) {
          errors.push(diagnostic("command_forbidden", path, 1, forbidden.label));
        }
      }
    }
  }

  for (const path of operatorCommandDocumentsV1) {
    const text = await readFile(join(root, path), "utf8");
    const missing = publicVerificationDocumentationFragmentsV1.filter(
      (fragment) => !text.includes(fragment),
    );
    if (missing.length > 0) {
      errors.push(
        diagnostic("public_command_documentation", path, 1, `missing ${missing.join(", ")}`),
      );
    }
  }

  for (const path of [
    manifest.operatorEntrypoint,
    manifest.executionProtocol,
    manifest.roadmap,
    ...paths,
  ]) {
    const original = texts.get(path);
    if (original === undefined) continue;
    const text = withoutFencedCode(original);
    for (const token of forbiddenWorkflowTokensV1) {
      const index = text.indexOf(token);
      if (index >= 0) {
        errors.push(diagnostic("forbidden_skill", path, lineOf(text, index), token));
      }
    }
    for (const match of text.matchAll(/^\s*(?:TODO|TBD|FIXME|待定)\s*(?::.*)?$/gimu)) {
      errors.push(diagnostic("placeholder", path, lineOf(text, match.index), match[0].trim()));
    }
    for (const match of text.matchAll(/\{\{[^}\n]+\}\}|<PLACEHOLDER>/gu)) {
      errors.push(diagnostic("placeholder", path, lineOf(text, match.index), match[0]));
    }
  }

  for (const path of [
    manifest.operatorEntrypoint,
    manifest.executionProtocol,
    manifest.roadmap,
    ...executableEntries.map((entry) => entry.path),
  ]) {
    const original = texts.get(path);
    if (original === undefined) continue;
    const prose = withoutFencedCode(original);
    for (const match of prose.matchAll(
      /\b(?:ask|await|wait for) (?:the )?(?:user|human|owner)(?: approval| confirmation| input)?|(?:等待|请求)(?:用户|人工|所有者)(?:确认|输入|批准)/giu,
    )) {
      const end = prose.indexOf("\n", match.index);
      const line = prose.slice(prose.lastIndexOf("\n", match.index) + 1, end < 0 ? undefined : end);
      if (/不等待|无需|不需要|不得|never|without|does not|do not/iu.test(line)) continue;
      errors.push(diagnostic("interactive_blocker", path, lineOf(prose, match.index), match[0]));
    }
    for (const match of original.matchAll(
      /(^|[\s`"'(])(?:packages\/(?:base|ui|assets|modules)|apps\/web|stories\/(?:sandbox|e2e|demo|poc))(?=[/\s`"'.,):]|$)/gmu,
    )) {
      errors.push(
        diagnostic("legacy_source_path", path, lineOf(original, match.index), match[0].trim()),
      );
    }
  }

  if ((await existsWithoutSymlink(root, "docs/superpowers")) !== "missing") {
    errors.push(diagnostic("legacy_directory", "docs/superpowers", 1, "must not exist"));
  }
  for (const path of ["AGENTS.md", "README.md", "docs/README.md"]) {
    const text = await readFile(join(root, path), "utf8");
    if (!text.includes("docs/engineering/GOAL.md") && !text.includes("engineering/GOAL.md")) {
      errors.push(diagnostic("entrypoint_link", path, 1, "missing GOAL.md link"));
    }
  }

  await validateMarkdownLinks(root, allMarkdown, errors);
  return [...new Set(errors)].sort();
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
  const errors = await verifyGoalDocumentsV1(root);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else {
    console.log("documentation and goal plan verification passed");
  }
}
