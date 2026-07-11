// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import test from "node:test";
import { assetVerificationCommandV1 } from "./verify-assets.mjs";
test("checks the fallback-only Sandbox manifest", () =>
  assert(assetVerificationCommandV1.some((value) => value.endsWith("story-contract.test.ts"))));
