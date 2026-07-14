// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { defineStoryToolingEntry, parsePositiveSafeInteger } from "@sillymaker/base";
import type { StoryToolingEntryV1 } from "@sillymaker/base";
import { resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import { describe, expect, it } from "vitest";

import { e2eStoryEntryV1 } from "../story-entry.js";
import * as e2eToolingModuleV1 from "../tooling.js";
import { e2eFixtureIdsV1, e2eToolingEntryV1 } from "../tooling.js";
import { createE2eFixtureResolverV1 } from "./fixture-resolver.js";
import { e2eDebugCommandFormAdapterV1 } from "./debug-command-form-adapter.js";

const expectedSnapshotsV1 = Object.freeze([
  Object.freeze({
    fixtureId: "fixture.e2e.initial",
    commandSequence: 0,
    simulation: Object.freeze({
      counter: Object.freeze({ value: 0 }),
      flow: Object.freeze({ status: "idle", branch: null, nodeId: "intro" }),
      run: Object.freeze({ status: "active" }),
    }),
  }),
  Object.freeze({
    fixtureId: "fixture.e2e.choice-left-blocked",
    commandSequence: 2,
    simulation: Object.freeze({
      counter: Object.freeze({ value: 1 }),
      flow: Object.freeze({ status: "blocked", branch: "left", nodeId: "rejoin" }),
      run: Object.freeze({ status: "active" }),
    }),
  }),
  Object.freeze({
    fixtureId: "fixture.e2e.choice-right-blocked",
    commandSequence: 2,
    simulation: Object.freeze({
      counter: Object.freeze({ value: 2 }),
      flow: Object.freeze({ status: "blocked", branch: "right", nodeId: "rejoin" }),
      run: Object.freeze({ status: "active" }),
    }),
  }),
  Object.freeze({
    fixtureId: "fixture.e2e.terminal",
    commandSequence: 4,
    simulation: Object.freeze({
      counter: Object.freeze({ value: 2 }),
      flow: Object.freeze({ status: "resolved", branch: "right", nodeId: "done" }),
      run: Object.freeze({ status: "complete" }),
    }),
  }),
]);

describe("E2E fixed fixture resolver", () => {
  it("lists only the closed active-Story fixture IDs", () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const resolver = createE2eFixtureResolverV1(resolved.gameSimulation, e2eToolingEntryV1);

    expect(resolver.listFixtureIds()).toBe(e2eFixtureIdsV1);
    expect(Object.keys(resolver).sort()).toEqual(["listFixtureIds", "resolveFixture"]);
    expect(resolver).not.toHaveProperty("import");
    expect(resolver).not.toHaveProperty("path");
    expect(resolver).not.toHaveProperty("specifier");
    expect(e2eToolingModuleV1.createE2eFixtureResolverV1).toBe(createE2eFixtureResolverV1);
    expect(e2eToolingEntryV1.defineToolingSupport().debugCommandFormAdapter).toBe(
      e2eDebugCommandFormAdapterV1,
    );
  });

  it.each(expectedSnapshotsV1)(
    "replays $fixtureId through the resolved GameSimulation into one pristine Snapshot",
    async ({ fixtureId, commandSequence, simulation }) => {
      const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
      const resolver = createE2eFixtureResolverV1(resolved.gameSimulation, e2eToolingEntryV1);

      const result = await resolver.resolveFixture(fixtureId);

      expect(result.kind).toBe("resolved");
      if (result.kind !== "resolved") throw new TypeError("expected resolved E2E fixture");
      expect(result.fixtureId).toBe(fixtureId);
      expect(result.snapshot.commandSequence).toBe(commandSequence);
      expect(result.snapshot.state.simulation).toEqual(simulation);
      expect(result.snapshot.integrity).toEqual({
        mode: "normal",
        mutationCount: 0,
        firstMutationSequence: null,
        reasons: [],
      });
      expect(Object.isFrozen(result.snapshot)).toBe(true);
    },
  );

  it("returns one stable unknown-reference result without accepting an external fixture ID", async () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const resolver = createE2eFixtureResolverV1(resolved.gameSimulation, e2eToolingEntryV1);

    await expect(resolver.resolveFixture("fixture.other.story")).resolves.toEqual({
      kind: "unknown_reference",
      fixtureId: "fixture.other.story",
    });
  });

  it("rejects a foreign Story entry and any changed fixture catalog", () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const foreign = defineStoryToolingEntry({
      contractRevision: 1,
      storyIdentity: Object.freeze({
        id: "story.foreign",
        revision: parsePositiveSafeInteger(1),
      }),
      defineToolingSupport: e2eToolingEntryV1.defineToolingSupport,
    });
    const support = e2eToolingEntryV1.defineToolingSupport();
    const changed = defineStoryToolingEntry({
      contractRevision: 1,
      storyIdentity: e2eToolingEntryV1.storyIdentity,
      defineToolingSupport: () =>
        Object.freeze({
          ...support,
          fixtures: Object.freeze(support.fixtures.slice(0, -1)),
        }),
    });

    expect(() =>
      createE2eFixtureResolverV1(resolved.gameSimulation, foreign as StoryToolingEntryV1<unknown>),
    ).toThrow("invalid E2E tooling Story identity");
    expect(() =>
      createE2eFixtureResolverV1(resolved.gameSimulation, changed as StoryToolingEntryV1<unknown>),
    ).toThrow("invalid E2E fixture catalog");
  });
});
