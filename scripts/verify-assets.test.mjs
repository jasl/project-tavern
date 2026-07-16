// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import test from "node:test";
import { assetVerificationCommandsV1, verifyAssetsV1 } from "./verify-assets.mjs";

const expectedAssetVerificationCommandsV1 = Object.freeze([
  Object.freeze([
    "pnpm",
    "exec",
    "vitest",
    "run",
    "--project",
    "contract",
    "game/stories/e2e/src/story-contract.test.ts",
  ]),
  Object.freeze(["node", "--experimental-strip-types", "scripts/assets/verify-runtime-assets.mts"]),
]);

test("runs the existing asset contract before the closed runtime verifier", () => {
  assert.deepEqual(assetVerificationCommandsV1, expectedAssetVerificationCommandsV1);
  assert(Object.isFrozen(assetVerificationCommandsV1));
  for (const command of assetVerificationCommandsV1) assert(Object.isFrozen(command));
  assert.doesNotMatch(
    JSON.stringify(assetVerificationCommandsV1),
    /art-source|references|update|regenerate|write|release|playwright|browser/u,
  );
});

test("stops on the first asset verification failure with inherited stdio and no shell", () => {
  const calls = [];
  const spawn = (command, args, options) => {
    calls.push([command, args, options]);
    return { status: calls.length === 1 ? 1 : 0, signal: null };
  };

  assert.throws(
    () => verifyAssetsV1("/repo/project-tavern", spawn),
    /asset verification failed: pnpm exec vitest/u,
  );
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0, 2), [
    expectedAssetVerificationCommandsV1[0][0],
    expectedAssetVerificationCommandsV1[0].slice(1),
  ]);
  assert.deepEqual(calls[0][2], {
    cwd: "/repo/project-tavern",
    shell: false,
    stdio: "inherit",
  });
});

test("treats a signaled runtime verifier as failure after the existing check", () => {
  const calls = [];
  const spawn = (command, args, options) => {
    calls.push([command, args, options]);
    return calls.length === 2 ? { status: null, signal: "SIGTERM" } : { status: 0, signal: null };
  };

  assert.throws(
    () => verifyAssetsV1("/repo/project-tavern", spawn),
    /asset verification failed: node --experimental-strip-types/u,
  );
  assert.deepEqual(
    calls.map(([command, args]) => [command, ...args]),
    expectedAssetVerificationCommandsV1,
  );
  for (const [, , options] of calls) {
    assert.equal(options.cwd, "/repo/project-tavern");
    assert.equal(options.shell, false);
    assert.equal(options.stdio, "inherit");
  }
});
