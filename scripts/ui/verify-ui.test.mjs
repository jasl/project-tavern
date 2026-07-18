// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { discoverScriptTestsV1 } from "../run-script-tests.mjs";
import { runUiVerificationV1, verifyUiCommandsV1 } from "./verify-ui.mts";

const expectedVerifyUiCommandsV1 = Object.freeze([
  ["pnpm", ["verify:ui-runtime"]],
  ["pnpm", ["verify:story-presentation"]],
  ["pnpm", ["verify:ui-tooling"]],
]);

test("runs the final UI phases in exact order without recursion", () => {
  assert.deepEqual(verifyUiCommandsV1, expectedVerifyUiCommandsV1);
  assert(Object.isFrozen(verifyUiCommandsV1));
  for (const command of verifyUiCommandsV1) {
    assert(Object.isFrozen(command));
    assert(Object.isFrozen(command[1]));
  }
  assert.doesNotMatch(
    JSON.stringify(verifyUiCommandsV1),
    /build:|update:|regenerate|--update-snapshots|verify:phase|release|prepare/iu,
  );
});

test("stops at the first failed or terminated leaf without a shell", () => {
  const calls = [];
  assert.throws(
    () =>
      runUiVerificationV1("/repo/project-tavern", (command, args, options) => {
        calls.push([command, args, options]);
        return { status: calls.length === 2 ? 1 : 0, signal: null };
      }),
    /pnpm verify:story-presentation failed/u,
  );
  assert.deepEqual(
    calls.map(([command, args]) => [command, args]),
    expectedVerifyUiCommandsV1.slice(0, 2),
  );
  for (const [, , options] of calls) {
    assert.deepEqual(options, {
      cwd: "/repo/project-tavern",
      shell: false,
      stdio: "inherit",
    });
  }
  assert.throws(
    () =>
      runUiVerificationV1("/repo/project-tavern", () => ({
        status: null,
        signal: "SIGTERM",
      })),
    /pnpm verify:ui-runtime failed/u,
  );
});

test("maps the preserved, final, and cumulative UI aliases exactly", async () => {
  const root = join(import.meta.dirname, "../..");
  const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  assert.equal(
    packageJson.scripts["verify:ui-runtime"],
    "node --experimental-strip-types scripts/ui/verify-ui-runtime.mts",
  );
  assert.equal(
    packageJson.scripts["verify:phase5a"],
    "pnpm verify:phase4 && pnpm verify:ui-runtime",
  );
  assert.equal(
    packageJson.scripts["verify:phase5b"],
    "pnpm verify:phase5a && pnpm build:e2e && pnpm build:poc && pnpm verify:story-presentation",
  );
  assert.equal(
    packageJson.scripts["verify:ui-tooling"],
    "node --experimental-strip-types scripts/ui/verify-phase5c.mts",
  );
  assert.equal(
    packageJson.scripts["verify:ui"],
    "node --experimental-strip-types scripts/ui/verify-ui.mts",
  );
  assert.equal(
    packageJson.scripts["verify:phase5c"],
    "pnpm verify:phase5b && pnpm verify:ui-tooling",
  );
});

test("discovers every final UI script test exactly once", async () => {
  const root = join(import.meta.dirname, "../..");
  const discovered = await discoverScriptTestsV1(root);
  const expectedNode = ["scripts/ui/verify-ui-runtime.test.mjs", "scripts/ui/verify-ui.test.mjs"];
  const expectedVitest = [
    "scripts/ui/run-visual-regression.test.ts",
    "scripts/ui/serve-story-roots.test.ts",
    "scripts/ui/verify-application-graphs.test.ts",
    "scripts/ui/verify-phase5c.test.ts",
    "scripts/ui/verify-stage-presentation.test.ts",
  ];
  for (const path of expectedNode) {
    assert.equal(discovered.node.filter((candidate) => candidate === path).length, 1);
    assert.equal(discovered.vitest.filter((candidate) => candidate === path).length, 0);
  }
  for (const path of expectedVitest) {
    assert.equal(discovered.vitest.filter((candidate) => candidate === path).length, 1);
    assert.equal(discovered.node.filter((candidate) => candidate === path).length, 0);
  }
});
