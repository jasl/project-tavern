// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import test from "node:test";

import { runUiRuntimeVerificationV1, uiRuntimeVerificationCommandsV1 } from "./verify-ui.mts";

const expectedUiRuntimeVerificationCommandsV1 = Object.freeze([
  ["pnpm", ["--filter", "@sillymaker/ui", "test"]],
  ["pnpm", ["--filter", "@sillymaker/web", "exec", "vitest", "run", "src/assets", "src/input"]],
  ["pnpm", ["exec", "vitest", "run", "scripts/assets"]],
  ["pnpm", ["lint:styles"]],
  ["pnpm", ["verify:assets"]],
]);

test("freezes the inspect-only UI command list", () => {
  assert.deepEqual(uiRuntimeVerificationCommandsV1, expectedUiRuntimeVerificationCommandsV1);
  assert(Object.isFrozen(uiRuntimeVerificationCommandsV1));
  for (const command of uiRuntimeVerificationCommandsV1) {
    assert(Object.isFrozen(command));
    assert(Object.isFrozen(command[1]));
  }
  assert.doesNotMatch(
    JSON.stringify(uiRuntimeVerificationCommandsV1),
    /build|playwright|browser|update|regenerate|release|screenshot/iu,
  );
});

test("stops at the first nonzero exit and never enables a shell", () => {
  const calls = [];
  const injectedSpawnSync = (command, args, options) => {
    calls.push([command, args, options]);
    return { status: calls.length === 3 ? 1 : 0, signal: null };
  };

  assert.throws(
    () => runUiRuntimeVerificationV1("/repo/project-tavern", injectedSpawnSync),
    /pnpm exec vitest run scripts\/assets failed/u,
  );
  assert.deepEqual(
    calls.map(([command, args]) => [command, args]),
    expectedUiRuntimeVerificationCommandsV1.slice(0, 3),
  );
  for (const [, , options] of calls) {
    assert.equal(options.cwd, "/repo/project-tavern");
    assert.equal(options.shell, false);
    assert.equal(options.stdio, "inherit");
  }
});

test("rejects a terminated child as a verification failure", () => {
  assert.throws(
    () =>
      runUiRuntimeVerificationV1("/repo/project-tavern", () => ({
        status: null,
        signal: "SIGTERM",
      })),
    /pnpm --filter @sillymaker\/ui test failed/u,
  );
});
