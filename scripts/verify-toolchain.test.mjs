// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { verifyToolchain } from "./verify-toolchain.mjs";

test("rejects the wrong Node version", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "tavern-toolchain-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const errors = await verifyToolchain(root, {
    nodeVersion: "24.18.1",
    pnpmVersion: "11.11.0",
  });

  assert(errors.includes("Node version must be 24.18.0, got 24.18.1"));
});
