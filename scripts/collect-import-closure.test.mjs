// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { collectManagedPaths } from "./collect-import-closure.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
test("keeps Developer code out of the Player closure", async () => {
  const player = await collectManagedPaths(root, [
    "stories/sandbox/src/application/player-entry.tsx",
  ]);
  const developer = await collectManagedPaths(root, [
    "stories/sandbox/src/application/developer-entry.tsx",
  ]);
  assert(!player.some((path) => path.startsWith("apps/web/src/developer/")));
  assert(developer.includes("apps/web/src/developer/index.ts"));
  assert(!player.some((path) => path.includes("/testkit/")));
});
