// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { verifyPublicExportsV1 } from "./verify-public-exports.mjs";

test("matches the reviewed Base inventory", async () => {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  assert.deepEqual(await verifyPublicExportsV1(root), []);
});
