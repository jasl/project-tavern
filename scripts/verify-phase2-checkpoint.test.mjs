// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { join } from "node:path";

import { phase2CheckpointCommandsV1, runPhase2CheckpointV1 } from "./verify-phase2-checkpoint.mts";

const expectedPhase2CheckpointCommandsV1 = Object.freeze([
  ["pnpm", ["format:check"]],
  ["pnpm", ["verify:docs"]],
  ["pnpm", ["lint"]],
  ["pnpm", ["verify:boundaries"]],
  ["pnpm", ["verify:cycles"]],
  ["pnpm", ["verify:public-exports"]],
  ["pnpm", ["verify:stories"]],
  ["pnpm", ["verify:assets"]],
  ["pnpm", ["verify:ui"]],
  ["pnpm", ["test:scripts"]],
  ["pnpm", ["typecheck"]],
  ["pnpm", ["test"]],
  ["pnpm", ["build"]],
]);

test("freezes the exact read-only Phase 2 checkpoint command list", () => {
  assert.deepEqual(phase2CheckpointCommandsV1, expectedPhase2CheckpointCommandsV1);
  assert.equal(phase2CheckpointCommandsV1.length, 13);
  assert(Object.isFrozen(phase2CheckpointCommandsV1));
  for (const command of phase2CheckpointCommandsV1) {
    assert(Object.isFrozen(command));
    assert(Object.isFrozen(command[1]));
  }
  const tokens = phase2CheckpointCommandsV1.flat(2);
  for (const forbidden of [
    "verify:fixtures",
    "verify:golden",
    "verify:balance",
    "verify:determinism",
    "test:e2e",
    "release",
    "update",
    "regenerate",
  ]) {
    assert(!tokens.some((token) => token.includes(forbidden)), forbidden);
  }
});

test("stops at the first failed command and never enables a shell", () => {
  const calls = [];
  const injectedSpawnSync = (command, args, options) => {
    calls.push([command, args, options]);
    return { status: calls.length === 3 ? 1 : 0 };
  };

  assert.throws(
    () => runPhase2CheckpointV1("/repo/project-tavern", injectedSpawnSync),
    /pnpm lint failed/u,
  );
  assert.deepEqual(
    calls.map(([command, args]) => [command, args]),
    expectedPhase2CheckpointCommandsV1.slice(0, 3),
  );
  for (const [, , options] of calls) {
    assert.equal(options.cwd, "/repo/project-tavern");
    assert.equal(options.shell, false);
    assert.equal(options.stdio, "inherit");
  }
});

test("maps the public checkpoint script exactly", async () => {
  const root = join(import.meta.dirname, "..");
  const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  assert.equal(
    packageJson.scripts["verify:phase2:checkpoint"],
    "node --experimental-strip-types scripts/verify-phase2-checkpoint.mts",
  );
  assert.deepEqual(
    Object.entries(packageJson.scripts)
      .filter(([, command]) => command.includes("scripts/verify-phase2-checkpoint.mts"))
      .map(([name]) => name),
    ["verify:phase2:checkpoint"],
  );
});
