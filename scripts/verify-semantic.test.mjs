// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { runSemanticVerificationV1, semanticVerificationCommandsV1 } from "./verify-semantic.mts";

const expectedSemanticVerificationCommandsV1 = Object.freeze([
  ["pnpm", ["--filter", "@project-tavern/story-e2e", "verify:semantic"]],
]);

test("freezes the exact read-only semantic delegation", () => {
  assert.deepEqual(semanticVerificationCommandsV1, expectedSemanticVerificationCommandsV1);
  assert(Object.isFrozen(semanticVerificationCommandsV1));
  for (const command of semanticVerificationCommandsV1) {
    assert(Object.isFrozen(command));
    assert(Object.isFrozen(command[1]));
  }

  const commandText = semanticVerificationCommandsV1.flat(2).join(" ");
  assert.doesNotMatch(
    commandText,
    /playwright|browser|chromium|webkit|test:e2e|regenerate|update|release|write/iu,
  );
});

test("stops on the first failure and never enables a shell", () => {
  const calls = [];
  const injectedSpawnSync = (command, args, options) => {
    calls.push([command, args, options]);
    return { status: 1 };
  };

  assert.throws(
    () => runSemanticVerificationV1("/repo/project-tavern", injectedSpawnSync),
    /pnpm --filter @project-tavern\/story-e2e verify:semantic failed/u,
  );
  assert.deepEqual(
    calls.map(([command, args]) => [command, args]),
    expectedSemanticVerificationCommandsV1,
  );
  assert.equal(calls[0]?.[2]?.cwd, "/repo/project-tavern");
  assert.equal(calls[0]?.[2]?.shell, false);
  assert.equal(calls[0]?.[2]?.stdio, "inherit");
});

test("maps the public and Story semantic scripts exactly", async () => {
  const root = join(import.meta.dirname, "..");
  const rootPackage = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const storyPackage = JSON.parse(
    await readFile(join(root, "game/stories/e2e/package.json"), "utf8"),
  );

  assert.equal(
    rootPackage.scripts["verify:semantic"],
    "node --experimental-strip-types scripts/verify-semantic.mts",
  );
  assert.equal(
    storyPackage.scripts["verify:semantic"],
    "pnpm --workspace-root exec vitest run game/stories/e2e/src/runtime/e2e-semantic-game-port.test.ts game/stories/e2e/src/runtime/headless-runner.test.ts",
  );
  assert.deepEqual(
    Object.entries(rootPackage.scripts)
      .filter(([, command]) => command.includes("scripts/verify-semantic.mts"))
      .map(([name]) => name),
    ["verify:semantic"],
  );
});
