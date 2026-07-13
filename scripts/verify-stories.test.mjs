// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import test from "node:test";
import { storyVerificationCommandV1 } from "./verify-stories.mjs";
test("owns exactly the E2E and PoC Story checks", () =>
  assert.deepEqual(storyVerificationCommandV1, [
    ["pnpm", ["--filter", "@project-tavern/story-e2e", "test"]],
    ["pnpm", ["--filter", "@project-tavern/story-poc", "test"]],
  ]));
