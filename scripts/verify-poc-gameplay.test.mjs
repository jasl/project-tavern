// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const expectedPocGameplayVerificationCommandsV1 = Object.freeze([
  ["pnpm", ["verify:materialization"]],
  ["pnpm", ["verify:phase2"]],
  ["pnpm", ["verify:persistence-diagnostics"]],
  ["pnpm", ["--filter", "@project-tavern/story-poc", "run", "test:gameplay"]],
  ["pnpm", ["verify:public-exports"]],
  ["pnpm", ["verify:boundaries"]],
  ["pnpm", ["verify:cycles"]],
  ["pnpm", ["typecheck"]],
  ["pnpm", ["build"]],
]);

test("owns a read-only Phase 4A command list", async () => {
  const { pocGameplayVerificationCommandsV1 } = await import("./verify-poc-gameplay.mts");
  assert.deepEqual(pocGameplayVerificationCommandsV1, expectedPocGameplayVerificationCommandsV1);
  assert.equal(pocGameplayVerificationCommandsV1.length, 9);
  assert(Object.isFrozen(pocGameplayVerificationCommandsV1));
  for (const command of pocGameplayVerificationCommandsV1) {
    assert(Object.isFrozen(command));
    assert(Object.isFrozen(command[1]));
  }
  assert(
    !pocGameplayVerificationCommandsV1
      .flat(2)
      .some((token) => /regenerate|update:|write|writer|release|publish|deploy/u.test(token)),
  );
});

test("keeps test:gameplay closed to Phase 4A files", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../game/stories/poc/package.json", import.meta.url), "utf8"),
  );
  assert.equal(
    packageJson.scripts["test:gameplay"],
    "vitest run src/test/gameplay-contract.test.ts src/test/run-calendar.test.ts src/test/actors-status.test.ts src/test/inventory.test.ts src/test/facilities-tavern.test.ts src/test/workflow-progression.test.ts src/test/narrative.test.ts src/test/rules-resolvers.test.ts src/test/transaction.test.ts src/test/command-executor-core.test.ts src/test/command-executor-workflows.test.ts src/test/game-command-evaluation.test.ts src/test/game-debug-command-executor.test.ts src/test/game-queries.test.ts src/test/game-simulation.test.ts src/test/game-session-integration.test.ts",
  );
});

test("stops at the first failed command and never enables a shell", async () => {
  const { runPocGameplayVerificationV1 } = await import("./verify-poc-gameplay.mts");
  const calls = [];
  const injectedSpawnSync = (command, args, options) => {
    calls.push([command, args, options]);
    return { status: calls.length === 4 ? 1 : 0 };
  };

  assert.throws(
    () => runPocGameplayVerificationV1("/repo/project-tavern", injectedSpawnSync),
    /pnpm --filter @project-tavern\/story-poc run test:gameplay failed/u,
  );
  assert.deepEqual(
    calls.map(([command, args]) => [command, args]),
    expectedPocGameplayVerificationCommandsV1.slice(0, 4),
  );
  for (const [, , options] of calls) {
    assert.equal(options.cwd, "/repo/project-tavern");
    assert.equal(options.shell, false);
    assert.equal(options.stdio, "inherit");
  }
});

test("maps only the public root gameplay verifier alias", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(
    packageJson.scripts["verify:poc-gameplay"],
    "node --experimental-strip-types scripts/verify-poc-gameplay.mts",
  );
  assert.deepEqual(
    Object.entries(packageJson.scripts)
      .filter(([, command]) => command.includes("scripts/verify-poc-gameplay.mts"))
      .map(([name]) => name),
    ["verify:poc-gameplay"],
  );
});
