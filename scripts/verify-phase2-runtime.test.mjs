// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import {
  phase2RuntimeCommandsV1,
  runPhase2RuntimeV1,
  verifyE2eNodeClosureV1,
} from "./verify-phase2-runtime.mts";
import { coreVerificationCommandsV1 } from "./verify.mjs";

const expectedPhase2RuntimeCommandsV1 = Object.freeze([
  ["pnpm", ["verify:materialization"]],
  ["pnpm", ["verify:public-exports"]],
  ["pnpm", ["verify:boundaries"]],
  ["pnpm", ["verify:cycles"]],
  ["pnpm", ["verify:stories"]],
  ["pnpm", ["--filter", "@project-tavern/story-e2e", "verify:fixtures"]],
  ["pnpm", ["--filter", "@project-tavern/story-e2e", "verify:golden"]],
  ["pnpm", ["verify:determinism"]],
  ["pnpm", ["--filter", "@project-tavern/story-e2e", "verify:semantic"]],
  ["pnpm", ["typecheck"]],
  ["pnpm", ["test"]],
  ["pnpm", ["build:e2e"]],
  ["pnpm", ["verify:bundle"]],
  ["pnpm", ["verify:artifact"]],
  ["pnpm", ["test:e2e:smoke"]],
]);

test("freezes the exact read-only Phase 2 runtime command list", () => {
  assert.deepEqual(phase2RuntimeCommandsV1, expectedPhase2RuntimeCommandsV1);
  assert.equal(phase2RuntimeCommandsV1.length, 15);
  assert(Object.isFrozen(phase2RuntimeCommandsV1));
  for (const command of phase2RuntimeCommandsV1) {
    assert(Object.isFrozen(command));
    assert(Object.isFrozen(command[1]));
  }
  const tokens = phase2RuntimeCommandsV1.flat(2);
  assert(!tokens.some((token) => /regenerate|update:|release:prepare/u.test(token)));
  assert.equal(
    phase2RuntimeCommandsV1.some(
      ([command, args]) => command === "pnpm" && args.length === 1 && args[0] === "verify:semantic",
    ),
    false,
  );
});

test("stops at the first failed command and never enables a shell", () => {
  const calls = [];
  const injectedSpawnSync = (command, args, options) => {
    calls.push([command, args, options]);
    return { status: calls.length === 3 ? 1 : 0 };
  };

  assert.throws(
    () => runPhase2RuntimeV1("/repo/project-tavern", injectedSpawnSync),
    /pnpm verify:boundaries failed/u,
  );
  assert.deepEqual(
    calls.map(([command, args]) => [command, args]),
    expectedPhase2RuntimeCommandsV1.slice(0, 3),
  );
  for (const [, , options] of calls) {
    assert.equal(options.cwd, "/repo/project-tavern");
    assert.equal(options.shell, false);
    assert.equal(options.stdio, "inherit");
  }
});

test("maps only the final public Phase 2 gate and determinism names", async () => {
  const root = join(import.meta.dirname, "..");
  const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const storyPackageJson = JSON.parse(
    await readFile(join(root, "game/stories/e2e/package.json"), "utf8"),
  );

  assert.equal(
    packageJson.scripts["verify:phase2"],
    "node --experimental-strip-types scripts/verify-phase2-runtime.mts",
  );
  assert.equal(
    packageJson.scripts["verify:determinism"],
    "pnpm --filter @project-tavern/story-e2e verify:determinism",
  );
  assert.equal(
    storyPackageJson.scripts["verify:determinism"],
    "node --experimental-strip-types scripts/verify-determinism.mts",
  );
  assert.equal(packageJson.scripts["verify:phase2:checkpoint"], undefined);
  assert.equal(storyPackageJson.scripts["verify:balance"], undefined);
  assert.deepEqual(
    Object.entries(packageJson.scripts)
      .filter(([, command]) => command.includes("scripts/verify-phase2-runtime.mts"))
      .map(([name]) => name),
    ["verify:phase2"],
  );
  assert(coreVerificationCommandsV1.flat(2).includes("verify:determinism"));
  assert(!coreVerificationCommandsV1.flat(2).includes("verify:balance"));
});

test("directly imports the Node-only Story and proves its closure remains data-only", async () => {
  const root = join(import.meta.dirname, "..");
  const paths = await verifyE2eNodeClosureV1(root);

  assert(paths.includes("game/stories/e2e/src/index.ts"));
  assert(paths.includes("game/stories/e2e/src/presentation/scene-graph.ts"));
  assert(!paths.some((path) => path.endsWith(".tsx")));
  assert(!paths.some((path) => path.startsWith("game/stories/e2e/src/application/")));
  assert(!paths.some((path) => path.endsWith("/tooling.ts")));
});
