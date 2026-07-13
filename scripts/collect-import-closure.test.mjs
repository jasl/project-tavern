// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { collectManagedPaths } from "./collect-import-closure.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
test("collects only the single E2E application closure", async () => {
  const paths = await collectManagedPaths(root, ["game/stories/e2e/src/application/entry.tsx"]);
  assert(paths.includes("game/stories/e2e/src/application/entry.tsx"));
  assert(paths.includes("engine/packages/web/src/index.ts"));
  assert(!paths.some((path) => path.includes("developer-entry")));
  assert(!paths.some((path) => path.includes("player-entry")));
  assert(!paths.some((path) => path.includes("/testkit/")));
});
