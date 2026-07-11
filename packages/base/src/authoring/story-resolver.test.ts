// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createSyntheticCounterGamePackageV1 } from "../testkit/synthetic-counter.js";
import { deterministicBuildIdentityInputV1 } from "../testkit/resolver-fixtures.js";
import { resolveGamePackageV1 } from "./story-resolver.js";

describe("Story resolver", () => {
  it("resolves and freezes an unpatched synthetic Story", () => {
    const result = resolveGamePackageV1(
      createSyntheticCounterGamePackageV1(),
      [],
      deterministicBuildIdentityInputV1,
    );
    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") return;
    expect(result.resolved.frozen).toBe(true);
    expect(result.resolved.assets.assets).toEqual([]);
    expect(result.resolved.provenance.resolved.simulationDigest).toMatch(
      /^sha256:[0-9a-f]{64}$/u,
    );
    expect(Object.isFrozen(result.resolved)).toBe(true);
  });
});
