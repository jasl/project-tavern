// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { lstat, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
        "scripts/release/deep/workflow.test.mjs",
        "scripts/root.test.mjs",
      ],
    ],
    ["pnpm", ["exec", "vitest", "run", "--project", "scripts"]],
  ]);
});

test("runs Node script tests with strip-only TypeScript support", () => {
  assert.deepEqual(scriptTestCommandsV1({ node: ["scripts/typed.test.mjs"], vitest: [] }), [
    ["node", ["--experimental-strip-types", "--test", "scripts/typed.test.mjs"]],
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

test("registers the Phase 2 checkpoint test exactly once", async () => {
  const root = join(import.meta.dirname, "..");
  const discovered = await discoverScriptTestsV1(root);
  assert.equal(
    discovered.node.filter((path) => path === "scripts/verify-phase2-checkpoint.test.mjs").length,
    1,
  );
  assert.equal(
    discovered.vitest.filter((path) => path === "scripts/verify-phase2-checkpoint.test.mjs").length,
    0,
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
