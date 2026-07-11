// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import test from "node:test";
import { storyVerificationCommandV1 } from "./verify-stories.mjs";
test("owns the real Sandbox Story check", () =>
  assert.deepEqual(storyVerificationCommandV1, [
    "pnpm",
    ["--filter", "@project-tavern/story-sandbox", "test"],
  ]));
