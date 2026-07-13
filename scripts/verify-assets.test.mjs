// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import test from "node:test";
import { assetVerificationCommandV1 } from "./verify-assets.mjs";
test("checks the fallback-only E2E manifest", () =>
  assert(assetVerificationCommandV1.includes("game/stories/e2e/src/story-contract.test.ts")));
