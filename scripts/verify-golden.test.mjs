// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { dirname } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { collectManagedPaths } from "./collect-import-closure.mjs";
import { goldenVerificationCommandV1 } from "./verify-golden.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("delegates only to the ordered read-only golden verifiers", () => {
  assert.deepEqual(goldenVerificationCommandV1, [
    ["pnpm", ["--filter", "@project-tavern/story-e2e", "verify:golden"]],
    ["pnpm", ["--filter", "@project-tavern/story-poc", "verify:golden"]],
  ]);
  assert(
    goldenVerificationCommandV1.every(
      ([command, args]) => command === "pnpm" && !args.includes("update:golden"),
    ),
  );
});

test("keeps Story tooling fixture authority out of the test-module closure", async () => {
  const entry = "game/stories/poc/src/tooling-fixtures.ts";
  const paths = await collectManagedPaths(root, [entry]);

  assert(paths.includes(entry));
  assert(
    !paths.some((path) => path.startsWith("game/stories/poc/src/testing/")),
    `tooling fixture closure reached test modules:\n${paths
      .filter((path) => path.startsWith("game/stories/poc/src/testing/"))
      .join("\n")}`,
  );
});
