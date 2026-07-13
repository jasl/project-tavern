// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createSyntheticCounterGamePackageV1 } from "./synthetic-counter.js";
import { resolveStoryForTestV1 } from "./story-contracts.js";

describe("resolved game testkit", () => {
  it("resolves a synthetic Story through production validation", () => {
    const resolved = resolveStoryForTestV1(createSyntheticCounterGamePackageV1());
    expect(resolved.frozen).toBe(true);
  });
});
