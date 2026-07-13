// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import test from "node:test";
import { fixtureVerificationCommandV1 } from "./verify-fixtures.mjs";
test("delegates only to the read-only fixture verifier", () => {
  assert.deepEqual(fixtureVerificationCommandV1, [
    "pnpm",
    "--filter",
    "@project-tavern/story-e2e",
    "verify:fixtures",
  ]);
  assert(!fixtureVerificationCommandV1.includes("regenerate:fixtures"));
});
