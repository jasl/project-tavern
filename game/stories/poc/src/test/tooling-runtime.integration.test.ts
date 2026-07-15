// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { describe, expect, it } from "vitest";

import { canonicalJsonBytes, digestCanonical } from "@sillymaker/base";

import { pocDebugCommandKindsV1 } from "../gameplay/index.js";
import {
  pocFixtureIdsV1,
  pocStoryToolingEntryV1,
  pocStoryToolingFixtureByIdV1,
} from "../tooling/index.js";
import {
  createPocRuntimeTestFixtureV1,
  pocReplayableDebugIntegrationVectorsV1,
  unknownReasonDebugCommandV1,
  validSetMoodDebugCommandV1,
} from "../testing/poc-runtime-test-fixture.js";

describe("PoC actual-Story DebugTools integration", () => {
  it("retries a rejected fixed tooling load and memoizes the first success", async () => {
    let attempts = 0;
    const fixture = createPocRuntimeTestFixtureV1({
      debugTools: true,
      cheats: true,
      async loadTooling(specifier) {
        expect(specifier).toBe("@project-tavern/story-poc/tooling");
        attempts += 1;
        if (attempts === 1) throw new TypeError("injected first tooling load failure");
        return Object.freeze({ pocStoryToolingEntryV1 });
      },
    });

    await expect(fixture.application.debugTools.listFixtures()).rejects.toThrow(
      "injected first tooling load failure",
    );
    await expect(fixture.application.debugTools.listFixtures()).resolves.toMatchObject({
      kind: "listed",
      fixtureIds: pocFixtureIdsV1,
    });
    await expect(fixture.application.debugTools.listFixtures()).resolves.toMatchObject({
      kind: "listed",
      fixtureIds: pocFixtureIdsV1,
    });
    expect(attempts).toBe(2);
    expect(fixture.toolingLoads()).toBe(2);
  });

  it("deduplicates concurrent fixed tooling loads", async () => {
    let attempts = 0;
    let resolveLoad:
      | ((module: { readonly pocStoryToolingEntryV1: typeof pocStoryToolingEntryV1 }) => void)
      | undefined;
    const pending = new Promise<{
      readonly pocStoryToolingEntryV1: typeof pocStoryToolingEntryV1;
    }>((resolve) => {
      resolveLoad = resolve;
    });
    const fixture = createPocRuntimeTestFixtureV1({
      debugTools: true,
      cheats: true,
      loadTooling: async () => {
        attempts += 1;
        return await pending;
      },
    });

    const first = fixture.application.debugTools.listFixtures();
    const second = fixture.application.debugTools.listFixtures();
    expect(attempts).toBe(1);
    resolveLoad?.(Object.freeze({ pocStoryToolingEntryV1 }));
    await expect(Promise.all([first, second])).resolves.toEqual([
      { kind: "listed", fixtureIds: pocFixtureIdsV1 },
      { kind: "listed", fixtureIds: pocFixtureIdsV1 },
    ]);
    expect(attempts).toBe(1);
    expect(fixture.toolingLoads()).toBe(1);
  });

  it("loads one fixed tooling export and persists a successful anchor mark", async () => {
    const fixture = createPocRuntimeTestFixtureV1({ debugTools: true, cheats: true });
    expect(fixture.toolingLoads()).toBe(0);
    await expect(fixture.application.debugTools.listFixtures()).resolves.toEqual({
      kind: "listed",
      fixtureIds: pocFixtureIdsV1,
    });
    await expect(fixture.application.debugTools.listFixtures()).resolves.toEqual({
      kind: "listed",
      fixtureIds: pocFixtureIdsV1,
    });
    expect(fixture.toolingLoads()).toBe(1);
    expect(fixture.loadedSpecifier()).toBe("@project-tavern/story-poc/tooling");

    const beforeRevision = fixture.application.semantic.observe().revision;
    const publication = fixture.nextSemanticPublication();
    const anchorFixture = pocStoryToolingFixtureByIdV1["fixture.poc_d5_relationship"];
    if (anchorFixture === undefined) throw new TypeError("missing relationship tooling fixture");
    const expectedAnchorSequence = anchorFixture.commands.length;
    await expect(
      fixture.application.debugTools.anchorFixture("fixture.poc_d5_relationship"),
    ).resolves.toEqual({
      kind: "anchor_established",
      commandSequence: expectedAnchorSequence,
    });
    await expect(publication).resolves.toMatchObject({ revision: beforeRevision + 1 });
    expect(fixture.snapshotForTest().integrity.mode).toBe("modified");
    await expect(fixture.roundTripExactSave()).resolves.toMatchObject({
      snapshot: { integrity: { mode: "modified" } },
    });
    expect(await fixture.exportDebugBundleForTest()).toMatchObject({
      replayBase: { integrity: { mode: "modified" } },
      currentSnapshot: { integrity: { mode: "modified" } },
    });
    expect((await fixture.replayForTest()).finalSnapshot.integrity.mode).toBe("modified");
  });

  it("rejects extra diagnostic fields through the public DebugTools inspector", async () => {
    const fixture = createPocRuntimeTestFixtureV1({ debugTools: true, cheats: true });
    const exported = await fixture.application.diagnostics.exportDebugBundle();
    const bundle = JSON.parse(new TextDecoder().decode(exported.bytes)) as {
      diagnostics: Record<string, unknown>;
    };
    bundle.diagnostics.unexpected = true;

    await expect(
      fixture.application.debugTools.inspectDebugBundle(canonicalJsonBytes(bundle)),
    ).resolves.toEqual({ kind: "rejected", code: "envelope.schema_invalid" });
  });

  it("rejects an invalid logged DebugCommand through the public DebugTools inspector", async () => {
    const fixture = createPocRuntimeTestFixtureV1({ debugTools: true, cheats: true });
    await expect(
      fixture.application.debugTools.executeDebugCommand(validSetMoodDebugCommandV1()),
    ).resolves.toMatchObject({ kind: "committed" });
    const exported = await fixture.application.diagnostics.exportDebugBundle();
    const bundle = JSON.parse(new TextDecoder().decode(exported.bytes)) as {
      commandLog: Array<{ command: unknown }>;
    };
    const entry = bundle.commandLog[0];
    if (entry === undefined) throw new TypeError("missing exported PoC DebugCommand entry");
    entry.command = { kind: "debug.invalid" };

    await expect(
      fixture.application.debugTools.inspectDebugBundle(canonicalJsonBytes(bundle)),
    ).resolves.toEqual({ kind: "rejected", code: "envelope.schema_invalid" });
  });

  it.each(["message", "stack"] as const)(
    "rejects an over-limit engine fault $field through the public DebugTools inspector",
    async (field) => {
      const fixture = createPocRuntimeTestFixtureV1({
        debugTools: true,
        cheats: true,
        injectedOwnerFault: "actors.after_proposal",
      });
      await expect(
        fixture.application.debugTools.executeDebugCommand(validSetMoodDebugCommandV1()),
      ).resolves.toMatchObject({ kind: "faulted" });
      const exported = await fixture.application.diagnostics.exportDebugBundle();
      const bundle = JSON.parse(new TextDecoder().decode(exported.bytes)) as {
        commandLog: Array<{
          outcome: { kind: string; fault?: { message: string; stack?: string } };
        }>;
      };
      const fault = bundle.commandLog[0]?.outcome.fault;
      if (fault === undefined) throw new TypeError("missing exported PoC engine fault");
      fault[field] = "界".repeat(21_846);

      await expect(
        fixture.application.debugTools.inspectDebugBundle(canonicalJsonBytes(bundle)),
      ).resolves.toEqual({ kind: "rejected", code: "envelope.schema_invalid" });
    },
  );

  it("rejects an exact Save whose State contains an unknown stable reference", async () => {
    const fixture = createPocRuntimeTestFixtureV1({ debugTools: true, cheats: true });
    const before = fixture.snapshotForTest();
    const exported = await fixture.application.persistence.exportCurrentSave();
    const save = JSON.parse(new TextDecoder().decode(exported.bytes)) as {
      snapshot: {
        state: { story: { facts: Array<{ factId: string }> } };
      };
      stateDigest: unknown;
    };
    const fact = save.snapshot.state.story.facts[0];
    if (fact === undefined) throw new TypeError("missing exported PoC Fact entry");
    fact.factId = "fact.unknown_but_well_formed";
    save.stateDigest = digestCanonical("sillymaker:state:v1", save.snapshot);

    await expect(
      fixture.application.persistence.importSave(canonicalJsonBytes(save)),
    ).resolves.toEqual({ kind: "rejected", code: "invalid_record" });
    expect(fixture.snapshotForTest()).toBe(before);
  });

  it("preserves the live anchor when a tooling fixture reference is unknown", async () => {
    const fixture = createPocRuntimeTestFixtureV1({ debugTools: true, cheats: true });
    const before = fixture.snapshotForTest();
    await expect(
      fixture.application.debugTools.anchorFixture("fixture.poc_unknown" as never),
    ).resolves.toEqual({
      kind: "validation_failed",
      error: {
        code: "debug.unknown_reference",
        commandKind: "debug.fixture.load",
        reference: { kind: "fixture", fixtureId: "fixture.poc_unknown" },
      },
    });
    expect(fixture.snapshotForTest()).toBe(before);
    expect(fixture.commandLogForTest()).toEqual([]);
    expect(fixture.snapshotForTest().integrity.mode).toBe("normal");
  });

  it.each(pocReplayableDebugIntegrationVectorsV1)(
    "routes $kind through the resolved GameSimulation debug executor",
    async ({ command, kind }) => {
      const fixture = createPocRuntimeTestFixtureV1({
        debugTools: true,
        cheats: true,
        initialSnapshot: "debug_matrix",
      });
      expect(command.kind).toBe(kind);
      await expect(
        fixture.application.debugTools.executeDebugCommand(command),
      ).resolves.toMatchObject({ kind: "committed" });
      expect(fixture.debugExecutorValidateCalls()).toBe(1);
      expect(fixture.debugExecutorExecuteAttemptCalls()).toBe(1);
      expect(fixture.latestCommandLogEntry()).toMatchObject({
        source: "debug",
        command: { kind },
        outcome: { kind: "committed" },
      });
      expect(fixture.toolingLoads()).toBe(0);
      expect(fixture.snapshotForTest().integrity.mode).toBe("modified");
    },
  );

  it("does not open an attempt, log, or integrity mark after queue-front validation failure", async () => {
    const fixture = createPocRuntimeTestFixtureV1({ debugTools: true, cheats: true });
    await expect(
      fixture.application.debugTools.executeDebugCommand(unknownReasonDebugCommandV1()),
    ).resolves.toMatchObject({ kind: "validation_failed" });
    expect(fixture.debugExecutorValidateCalls()).toBe(1);
    expect(fixture.debugExecutorExecuteAttemptCalls()).toBe(0);
    expect(fixture.commandLogForTest()).toEqual([]);
    expect(fixture.snapshotForTest().integrity.mode).toBe("normal");
  });

  it("records one faulted debug attempt without installing state or an integrity mark", async () => {
    const fixture = createPocRuntimeTestFixtureV1({
      debugTools: true,
      cheats: true,
      injectedOwnerFault: "actors.after_proposal",
    });
    const before = fixture.snapshotForTest();
    await expect(
      fixture.application.debugTools.executeDebugCommand(validSetMoodDebugCommandV1()),
    ).resolves.toMatchObject({ kind: "faulted" });
    expect(fixture.debugExecutorValidateCalls()).toBe(1);
    expect(fixture.debugExecutorExecuteAttemptCalls()).toBe(1);
    expect(fixture.snapshotForTest()).toBe(before);
    expect(fixture.latestCommandLogEntry()).toMatchObject({
      source: "debug",
      outcome: { kind: "faulted" },
    });
    expect(fixture.snapshotForTest().integrity.mode).toBe("normal");
  });

  it("keeps fixture load as an anchor rather than a replayable debug command", () => {
    expect(pocReplayableDebugIntegrationVectorsV1).toHaveLength(10);
    expect(pocReplayableDebugIntegrationVectorsV1.map((entry) => entry.kind)).toEqual(
      pocDebugCommandKindsV1,
    );
    expect(
      pocReplayableDebugIntegrationVectorsV1.some(
        (entry) => (entry.kind as string) === "debug.fixture.load",
      ),
    ).toBe(false);
  });
});
