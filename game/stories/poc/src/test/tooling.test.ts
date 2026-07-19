// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { describe, expect, it } from "vitest";

import { pocStoryIdentityV1 } from "../content/identity.js";
import { pocStoryToolingEntryV1, pocStoryToolingFixturesV1 } from "../tooling/index.js";
import { createPocRuntimeTestFixtureV1 } from "../testing/poc-runtime-test-fixture.js";

describe("PoC same-Artifact Story tooling", () => {
  it("keeps tooling in the same Story identity and denies it while disabled", async () => {
    expect(pocStoryToolingEntryV1.storyIdentity).toEqual(pocStoryIdentityV1);
    expect(pocStoryToolingEntryV1.defineToolingSupport().fixtures).toBe(pocStoryToolingFixturesV1);
    const fixture = createPocRuntimeTestFixtureV1({ debugTools: false, cheats: false });
    await expect(
      fixture.application.debugTools.anchorFixture("fixture.poc_d5_relationship"),
    ).resolves.toEqual({ kind: "capability_disabled" });
    expect(fixture.snapshotForTest().integrity.mode).toBe("normal");
    expect(fixture.toolingLoads()).toBe(0);
  });

  it("ships no frozen fixture presets", () => {
    const support = pocStoryToolingEntryV1.defineToolingSupport();
    expect(support.fixtures).toBe(pocStoryToolingFixturesV1);
    expect(pocStoryToolingFixturesV1).toEqual([]);
    expect(Object.isFrozen(pocStoryToolingFixturesV1)).toBe(true);
  });
});
