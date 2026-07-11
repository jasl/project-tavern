// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import test from "node:test";
import { goldenVerificationCommandV1 } from "./verify-golden.mjs";
test("delegates only to the read-only golden verifier", () => {
  assert.deepEqual(goldenVerificationCommandV1.at(-1), "verify:golden");
  assert(!goldenVerificationCommandV1.includes("update:golden"));
});
