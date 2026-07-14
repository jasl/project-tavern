// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import {
  persistenceDiagnosticsCommandsV1,
  runPersistenceDiagnosticsV1,
} from "./verify-persistence-diagnostics.mts";
import { coreVerificationCommandsV1 } from "./verify.mjs";

const expectedPersistenceDiagnosticsCommandsV1 = Object.freeze([
  ["pnpm", ["verify:materialization"]],
  ["pnpm", ["verify:phase2"]],
  ["pnpm", ["--filter", "@sillymaker/base", "run", "test:runtime"]],
  ["pnpm", ["--filter", "@sillymaker/web", "run", "test:host"]],
  ["pnpm", ["--filter", "@project-tavern/story-e2e", "run", "test:runtime"]],
  ["pnpm", ["verify:runtime-fixtures"]],
  ["pnpm", ["verify:public-exports"]],
  ["pnpm", ["test:scripts"]],
  ["pnpm", ["verify:boundaries"]],
  ["pnpm", ["build:e2e"]],
  ["pnpm", ["verify:bundle"]],
  ["pnpm", ["verify:artifact"]],
]);

test("freezes the exact cumulative read-only Phase 3 command list", () => {
  assert.deepEqual(persistenceDiagnosticsCommandsV1, expectedPersistenceDiagnosticsCommandsV1);
  assert.equal(persistenceDiagnosticsCommandsV1.length, 12);
  assert(Object.isFrozen(persistenceDiagnosticsCommandsV1));
  for (const command of persistenceDiagnosticsCommandsV1) {
    assert(Object.isFrozen(command));
    assert(Object.isFrozen(command[1]));
  }

  const tokens = persistenceDiagnosticsCommandsV1.flat(2);
  assert(
    !tokens.some((token) => /regenerate|update:|write|writer|release|publish|deploy/u.test(token)),
  );

  const phase2Index = persistenceDiagnosticsCommandsV1.findIndex(
    ([command, args]) => command === "pnpm" && args.length === 1 && args[0] === "verify:phase2",
  );
  const firstPhase3Index = persistenceDiagnosticsCommandsV1.findIndex(
    ([command, args]) =>
      command === "pnpm" &&
      (args.includes("test:runtime") ||
        args.includes("test:host") ||
        args.includes("verify:runtime-fixtures")),
  );
  assert.equal(phase2Index, 1);
  assert.equal(firstPhase3Index, 2);
  assert(phase2Index < firstPhase3Index);
});

test("stops at the first failed command and never enables a shell", () => {
  const calls = [];
  const injectedSpawnSync = (command, args, options) => {
    calls.push([command, args, options]);
    return { status: calls.length === 4 ? 1 : 0 };
  };

  assert.throws(
    () => runPersistenceDiagnosticsV1("/repo/project-tavern", injectedSpawnSync),
    /pnpm --filter @sillymaker\/web run test:host failed/u,
  );
  assert.deepEqual(
    calls.map(([command, args]) => [command, args]),
    expectedPersistenceDiagnosticsCommandsV1.slice(0, 4),
  );
  for (const [, , options] of calls) {
    assert.equal(options.cwd, "/repo/project-tavern");
    assert.equal(options.shell, false);
    assert.equal(options.stdio, "inherit");
  }
});

test("maps the exact package aliases and only the two public root aliases", async () => {
  const root = join(import.meta.dirname, "..");
  const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const basePackageJson = JSON.parse(
    await readFile(join(root, "engine/packages/base/package.json"), "utf8"),
  );
  const webPackageJson = JSON.parse(
    await readFile(join(root, "engine/packages/web/package.json"), "utf8"),
  );
  const storyPackageJson = JSON.parse(
    await readFile(join(root, "game/stories/e2e/package.json"), "utf8"),
  );

  assert.equal(
    packageJson.scripts["verify:runtime-fixtures"],
    "pnpm --filter @project-tavern/story-e2e verify:runtime-fixtures",
  );
  assert.equal(
    packageJson.scripts["verify:persistence-diagnostics"],
    "node --experimental-strip-types scripts/verify-persistence-diagnostics.mts",
  );
  assert.equal(
    basePackageJson.scripts["test:runtime"],
    "pnpm --dir ../../.. exec vitest run engine/packages/base/src/runtime",
  );
  assert.equal(
    webPackageJson.scripts["test:host"],
    "pnpm --dir ../../.. exec vitest run engine/packages/web/src/host engine/packages/web/src/capabilities engine/packages/web/src/application",
  );
  assert.equal(
    storyPackageJson.scripts["test:runtime"],
    "pnpm --dir ../../.. exec vitest run game/stories/e2e/src/runtime game/stories/e2e/src/tooling",
  );
  assert.equal(
    storyPackageJson.scripts["regenerate:runtime-fixtures"],
    "node --experimental-strip-types scripts/regenerate-runtime-fixtures.mts",
  );
  assert.equal(
    storyPackageJson.scripts["verify:runtime-fixtures"],
    "node --experimental-strip-types scripts/verify-runtime-fixtures.mts",
  );
  assert.deepEqual(
    Object.entries(packageJson.scripts)
      .filter(([, command]) => command.includes("scripts/verify-persistence-diagnostics.mts"))
      .map(([name]) => name),
    ["verify:persistence-diagnostics"],
  );
  assert.deepEqual(
    Object.entries(packageJson.scripts)
      .filter(([, command]) =>
        command.includes("@project-tavern/story-e2e verify:runtime-fixtures"),
      )
      .map(([name]) => name),
    ["verify:runtime-fixtures"],
  );
  assert.equal(packageJson.scripts.verify, "node scripts/verify.mjs");
  assert(
    !coreVerificationCommandsV1
      .flat(2)
      .some((token) => /regenerate|update:|write|writer|release|publish|deploy/u.test(token)),
  );
});
