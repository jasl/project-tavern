// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { lstat, mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import test from "node:test";
import {
  discoverScriptTestsV1,
  scriptTestCommandsV1,
  verifyVitestListOwnershipV1,
} from "./run-script-tests.mjs";
import { coreVerificationCommandsV1 } from "./verify.mjs";
import { workspacePackages } from "./workspace-policy.mjs";

const exactMaterializationScriptsV1 = Object.freeze({
  "prepare:goal": "node --experimental-strip-types scripts/preflight/materialize-goal.mts",
  "verify:materialization":
    "node --experimental-strip-types scripts/preflight/verify-materialization.mts",
  "update:materialization-lock":
    "node --experimental-strip-types scripts/preflight/materialization-contract.mts --write",
});

function directRootScriptCallsV1(command, scripts) {
  const calls = [];
  for (const segment of command.split(/&&|\|\||;/u)) {
    const match = /^\s*pnpm(?:\s+run)?\s+([^\s]+)(?:\s|$)/u.exec(segment);
    if (match?.[1] !== undefined && Object.hasOwn(scripts, match[1])) calls.push(match[1]);
  }
  return calls;
}

function reachableRootScriptsV1(scripts, roots) {
  const reachable = new Set();
  const pending = [...roots];
  while (pending.length > 0) {
    const name = pending.shift();
    if (name === undefined || reachable.has(name)) continue;
    assert.equal(typeof scripts[name], "string", `missing root script: ${name}`);
    reachable.add(name);
    pending.push(...directRootScriptCallsV1(scripts[name], scripts));
  }
  return reachable;
}

async function productionToolFilesV1(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if ((await lstat(path)).isSymbolicLink()) {
      throw new TypeError(`production tool symlink is forbidden: ${path}`);
    }
    if (entry.isDirectory()) files.push(...(await productionToolFilesV1(path)));
    else if (
      entry.isFile() &&
      /\.(?:mjs|mts)$/u.test(entry.name) &&
      !/\.test\./u.test(entry.name)
    ) {
      files.push(path);
    }
  }
  return files.sort();
}

const playwrightConfigNameV1 = /^playwright(?:\..+)?\.config\.(?:[cm]?[jt]s)$/u;

async function discoverPlaywrightConfigsV1(root, directory = root) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      [".git", ".project-tavern", "dist", "node_modules", "references"].includes(entry.name)
    ) {
      continue;
    }
    const path = join(directory, entry.name);
    if ((await lstat(path)).isSymbolicLink()) {
      if (playwrightConfigNameV1.test(entry.name)) {
        throw new TypeError(`Playwright config symlink is forbidden: ${path}`);
      }
      continue;
    }
    if (entry.isDirectory()) paths.push(...(await discoverPlaywrightConfigsV1(root, path)));
    else if (entry.isFile() && playwrightConfigNameV1.test(entry.name)) {
      paths.push(relative(root, path).split(sep).join("/"));
    }
  }
  return paths.sort();
}

test("discovers every nested script test exactly once", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-script-tests-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const path of [
    "scripts/root.test.mjs",
    "scripts/ui/nested.test.ts",
    "scripts/release/deep/workflow.test.mjs",
    "scripts/release/not-a-test.ts",
  ]) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), "export {};\n");
  }
  const discovered = await discoverScriptTestsV1(root);
  assert.deepEqual(discovered, {
    node: ["scripts/release/deep/workflow.test.mjs", "scripts/root.test.mjs"],
    vitest: ["scripts/ui/nested.test.ts"],
  });
  assert.deepEqual(scriptTestCommandsV1(discovered), [
    [
      "node",
      [
        "--experimental-strip-types",
        "--test",
        "--test-concurrency=1",
        "scripts/release/deep/workflow.test.mjs",
        "scripts/root.test.mjs",
      ],
    ],
    ["pnpm", ["exec", "vitest", "run", "--project", "scripts", "--fileParallelism=false"]],
  ]);
});

test("runs Node script tests with strip-only TypeScript support and serial file isolation", () => {
  assert.deepEqual(scriptTestCommandsV1({ node: ["scripts/typed.test.mjs"], vitest: [] }), [
    [
      "node",
      ["--experimental-strip-types", "--test", "--test-concurrency=1", "scripts/typed.test.mjs"],
    ],
  ]);
});

test("runs Vitest script files serially to preserve fixed-port isolation", () => {
  assert.deepEqual(scriptTestCommandsV1({ node: [], vitest: ["scripts/port.test.ts"] }), [
    ["pnpm", ["exec", "vitest", "run", "--project", "scripts", "--fileParallelism=false"]],
  ]);
});

test("rejects missing and duplicate Vitest list ownership", () => {
  assert.throws(() => verifyVitestListOwnershipV1(["scripts/a.test.ts"], []), /missing/u);
  assert.throws(
    () =>
      verifyVitestListOwnershipV1(
        ["scripts/a.test.ts"],
        ["scripts/a.test.ts", "scripts/a.test.ts"],
      ),
    /duplicate/u,
  );
});

test("registers the final Phase 2 runtime gate test exactly once", async () => {
  const root = join(import.meta.dirname, "..");
  const discovered = await discoverScriptTestsV1(root);
  assert.equal(
    discovered.node.filter((path) => path === "scripts/verify-phase2-runtime.test.mjs").length,
    1,
  );
  assert.equal(
    discovered.vitest.filter((path) => path === "scripts/verify-phase2-runtime.test.mjs").length,
    0,
  );
  assert(!discovered.node.includes("scripts/verify-phase2-checkpoint.test.mjs"));
  assert(!discovered.vitest.includes("scripts/verify-phase2-checkpoint.test.mjs"));
});

test("registers the cumulative Phase 3 persistence diagnostics gate test exactly once", async () => {
  const root = join(import.meta.dirname, "..");
  const discovered = await discoverScriptTestsV1(root);
  assert.equal(
    discovered.node.filter((path) => path === "scripts/verify-persistence-diagnostics.test.mjs")
      .length,
    1,
  );
  assert.equal(
    discovered.vitest.filter((path) => path === "scripts/verify-persistence-diagnostics.test.mjs")
      .length,
    0,
  );
});

test("registers the semantic verifier test exactly once", async () => {
  const root = join(import.meta.dirname, "..");
  const discovered = await discoverScriptTestsV1(root);
  assert.equal(
    discovered.node.filter((path) => path === "scripts/verify-semantic.test.mjs").length,
    1,
  );
  assert.equal(
    discovered.vitest.filter((path) => path === "scripts/verify-semantic.test.mjs").length,
    0,
  );
});

test("registers every Phase 5A runtime asset and UI gate test exactly once", async () => {
  const root = join(import.meta.dirname, "..");
  const discovered = await discoverScriptTestsV1(root);
  for (const path of [
    "scripts/assets/runtime-image-metadata.test.ts",
    "scripts/assets/validate-runtime.test.ts",
    "scripts/assets/verify-runtime-assets.test.ts",
  ]) {
    assert.equal(discovered.vitest.filter((candidate) => candidate === path).length, 1);
    assert.equal(discovered.node.filter((candidate) => candidate === path).length, 0);
  }
  const uiGateTest = "scripts/ui/verify-ui.test.mjs";
  assert.equal(discovered.node.filter((candidate) => candidate === uiGateTest).length, 1);
  assert.equal(discovered.vitest.filter((candidate) => candidate === uiGateTest).length, 0);
});

test("freezes the explicit Playwright config and public browser-script inventory", async () => {
  const root = join(import.meta.dirname, "..");
  assert.deepEqual(await discoverPlaywrightConfigsV1(root), [
    "engine/packages/web/playwright.interaction.config.ts",
    "engine/packages/web/playwright.prebuilt.config.ts",
    "engine/packages/web/playwright.ui.config.ts",
  ]);

  const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(packageJson.scripts).filter(([, command]) =>
        command.includes("playwright test"),
      ),
    ),
    {
      "test:e2e:smoke":
        "playwright test --config engine/packages/web/playwright.ui.config.ts --project=chromium --grep @smoke",
      "test:e2e:full":
        "playwright test --config engine/packages/web/playwright.ui.config.ts --project=chromium --project=webkit --grep-invert @visual",
      "test:e2e:interaction":
        "playwright test --config engine/packages/web/playwright.interaction.config.ts",
      "test:e2e:ui": "playwright test --config engine/packages/web/playwright.ui.config.ts",
      "test:e2e:prebuilt":
        "playwright test --config engine/packages/web/playwright.prebuilt.config.ts",
    },
  );
});

test("discovers every supported Playwright config variant and rejects config symlinks", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-playwright-configs-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "nested"), { recursive: true });
  const expected = [
    "nested/playwright.config.cjs",
    "nested/playwright.config.cts",
    "nested/playwright.config.js",
    "nested/playwright.config.mjs",
    "nested/playwright.config.mts",
    "nested/playwright.config.ts",
    "nested/playwright.story.config.ts",
  ];
  for (const path of expected) await writeFile(join(root, path), "export default {};\n");

  assert.deepEqual(await discoverPlaywrightConfigsV1(root), expected);

  await symlink(join(root, "nested/playwright.config.ts"), join(root, "playwright.config.ts"));
  await assert.rejects(
    discoverPlaywrightConfigsV1(root),
    /Playwright config symlink is forbidden/u,
  );
});

test("freezes Goal materialization root mappings and writer reachability", async () => {
  const root = join(import.meta.dirname, "..");
  const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const scripts = packageJson.scripts;
  assert.equal(typeof scripts, "object");
  assert.notEqual(scripts, null);

  for (const [name, command] of Object.entries(exactMaterializationScriptsV1)) {
    assert.equal(scripts[name], command, `${name} mapping must remain exact`);
  }
  assert.equal(scripts.verify, "node scripts/verify.mjs");

  assert.deepEqual(
    Object.entries(scripts)
      .filter(([, command]) => command.includes("scripts/preflight/materialize-goal.mts"))
      .map(([name]) => name),
    ["prepare:goal"],
  );
  assert.deepEqual(
    Object.entries(scripts)
      .filter(([, command]) => command.includes("scripts/preflight/materialization-contract.mts"))
      .map(([name]) => name),
    ["update:materialization-lock"],
  );

  const coreRoots = coreVerificationCommandsV1
    .filter(([command, childArguments]) => command === "pnpm" && childArguments.length === 1)
    .map(([, childArguments]) => childArguments[0]);
  for (const [command, childArguments] of coreVerificationCommandsV1) {
    const invocation = `${command} ${childArguments.join(" ")}`;
    assert.doesNotMatch(invocation, /prepare:goal|materialize-goal\.mts/u);
    assert.doesNotMatch(
      invocation,
      /update:materialization-lock|materialization-contract\.mts.*--write/u,
    );
  }
  const verificationReachability = reachableRootScriptsV1(scripts, coreRoots);
  assert.equal(verificationReachability.has("prepare:goal"), false);
  assert.equal(verificationReachability.has("update:materialization-lock"), false);

  const verifierReachability = reachableRootScriptsV1(scripts, ["verify:materialization"]);
  assert.equal(verifierReachability.has("prepare:goal"), false);
  assert.equal(verifierReachability.has("update:materialization-lock"), false);

  for (const entry of workspacePackages) {
    const manifest = JSON.parse(await readFile(join(root, entry.path, "package.json"), "utf8"));
    for (const command of Object.values(manifest.scripts ?? {})) {
      assert.equal(typeof command, "string");
      assert.doesNotMatch(
        command,
        /prepare:goal|materialize-goal\.mts|update:materialization-lock/u,
        `${entry.name} must not reach a Goal writer`,
      );
    }
  }

  for (const path of await productionToolFilesV1(join(root, "scripts"))) {
    const source = await readFile(path, "utf8");
    if (
      !path.endsWith("/preflight/materialize-goal.mts") &&
      !path.endsWith("/preflight/materialization-contract.mts")
    ) {
      assert.doesNotMatch(
        source,
        /prepare:goal|materialize-goal\.mts/u,
        `${path} must not reach prepare:goal`,
      );
    }
    if (!path.endsWith("/preflight/materialization-contract.mts")) {
      assert.doesNotMatch(
        source,
        /update:materialization-lock/u,
        `${path} must not reach the writer`,
      );
      if (source.includes("materialization-contract.mts")) {
        assert.doesNotMatch(source, /--write/u, `${path} may only read the tracked contract`);
      }
    }
  }
});
