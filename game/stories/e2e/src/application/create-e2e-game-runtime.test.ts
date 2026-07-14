// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it, vi } from "vitest";
import {
  canonicalJsonBytes,
  createTransactionalRngV1,
  digestBytes,
  digestCanonical,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  rngStateV1Schema,
} from "@sillymaker/base";
import { createWebHostV1 } from "@sillymaker/web";
import {
  createMemoryHostRecordStoreV1,
  resolveStoryForTestV1,
  validateToolingFixturesV1,
} from "@sillymaker/base/testkit";
import { createE2eDebugBundleCodecV1, createE2eGameRuntimeV1 } from "./create-e2e-game-runtime.js";
import type { E2eGameSnapshotV1 } from "../gameplay/contracts/index.js";
import { e2eGameCommandSchemaV1 } from "../gameplay/contracts/index.js";
import { e2eStoryEntryV1 } from "../story-entry.js";
import { e2eToolingEntryV1 } from "../tooling.js";

const e2eFixtureIdsV1 = Object.freeze([
  "fixture.e2e.initial",
  "fixture.e2e.choice-left-blocked",
  "fixture.e2e.choice-right-blocked",
  "fixture.e2e.terminal",
]);

const e2eFixtureIdSchemaV1 = Object.freeze({
  parse(value: unknown) {
    if (typeof value !== "string" || !e2eFixtureIdsV1.includes(value)) {
      throw new TypeError("invalid E2E fixture ID");
    }
    return value;
  },
});

function createCountingE2eStoryEntryV1() {
  const sourceDefinition = e2eStoryEntryV1.define();
  const calls = {
    define: 0,
    simulationMaterializer: 0,
    presentationMaterializer: 0,
    createGameSimulation: 0,
  };
  const materializeProgram = (
    values: Parameters<typeof sourceDefinition.simulation.materializeProgram>[0],
  ) => {
    calls.simulationMaterializer += 1;
    return sourceDefinition.simulation.materializeProgram(values);
  };
  const createGameSimulation = (
    program: Parameters<typeof sourceDefinition.simulation.createGameSimulation>[0],
  ) => {
    calls.createGameSimulation += 1;
    return sourceDefinition.simulation.createGameSimulation(program);
  };
  const materializePresentation = (
    values: Parameters<typeof sourceDefinition.presentation.materializePresentation>[0],
  ) => {
    calls.presentationMaterializer += 1;
    return sourceDefinition.presentation.materializePresentation(values);
  };
  const definition = Object.freeze({
    simulation: Object.freeze({
      ...sourceDefinition.simulation,
      materializeProgram,
      createGameSimulation,
    }),
    presentation: Object.freeze({
      ...sourceDefinition.presentation,
      materializePresentation,
    }),
  });
  const entry = Object.freeze({
    ...e2eStoryEntryV1,
    define() {
      calls.define += 1;
      return definition;
    },
  });
  return Object.freeze({
    entry,
    calls: () => Object.freeze({ ...calls }),
  });
}

describe("E2e Game Application runtime", () => {
  it("exports one privacy-scrubbed bundle from the shared observer-failure sink", async () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const application = await createE2eGameRuntimeV1({
      resolved,
      host: createWebHostV1({
        records: createMemoryHostRecordStoreV1(),
        seeds: [0x0002_3049],
        uuids: ["00000000-0000-4000-8000-000000000099"],
        now: () => "2026-07-14T03:04:05.000Z",
      }),
    });
    let throwOnce = true;
    application.semantic.subscribe(() => {
      if (!throwOnce) return;
      throwOnce = false;
      throw new Error("subscriber at C:\\Users\\alice\\private.ts");
    });
    const following = vi.fn();
    application.semantic.subscribe(following);

    await expect(
      application.semantic.dispatch({ actionId: "action.e2e.increment", parameters: {} }),
    ).resolves.toEqual({ kind: "committed" });
    expect(application.semantic.observe().game.counterLabel).toBe("计数 1");
    expect(following).toHaveBeenCalled();
    await expect(
      application.semantic.dispatch({ actionId: "action.e2e.increment", parameters: {} }),
    ).resolves.toEqual({ kind: "committed" });
    await expect(application.capabilities.setEnabled("debug_tools", true)).resolves.toMatchObject({
      kind: "updated",
    });

    const exported = await application.diagnostics.exportDebugBundle();
    expect(exported).toMatchObject({
      filename: expect.stringMatching(/\.debug-bundle\.json$/u),
      mediaType: "application/json",
      digest: digestBytes(exported.bytes),
    });
    const text = new TextDecoder().decode(exported.bytes);
    const bundle = JSON.parse(text) as {
      readonly capabilities: {
        readonly debugTools: boolean;
        readonly cheats: boolean;
        readonly automationBridge: boolean;
      };
      readonly simulationLineage: readonly unknown[];
      readonly replayBase: E2eGameSnapshotV1;
      readonly replayBaseStateDigest: string;
      readonly commandLog: readonly unknown[];
      readonly currentSnapshot: E2eGameSnapshotV1;
      readonly currentStateDigest: string;
      readonly runtimeFailures: readonly {
        readonly operation: string;
        readonly message: string;
      }[];
    };
    expect(text).not.toContain("C:\\Users\\alice");
    expect(bundle.capabilities).toEqual({
      debugTools: true,
      cheats: false,
      automationBridge: false,
    });
    expect(bundle.simulationLineage).toEqual([]);
    expect(bundle.replayBase.commandSequence).toBe(0);
    expect(bundle.replayBaseStateDigest).toBe(
      digestCanonical("sillymaker:state:v1", bundle.replayBase),
    );
    expect(bundle.commandLog).toHaveLength(2);
    expect(bundle.currentSnapshot.commandSequence).toBe(2);
    expect(bundle.currentSnapshot.integrity).toEqual({
      mode: "normal",
      mutationCount: 0,
      firstMutationSequence: null,
      reasons: [],
    });
    expect(bundle.currentStateDigest).toBe(
      digestCanonical("sillymaker:state:v1", bundle.currentSnapshot),
    );
    expect(bundle.runtimeFailures).toEqual([
      expect.objectContaining({
        operation: "runtime.observer_notification_failed",
        message: "subscriber at <redacted-path>",
      }),
    ]);
    expect(application.diagnostics).not.toHaveProperty("inspectDebugBundle");
    expect(application.diagnostics).not.toHaveProperty("anchorDebugBundle");
  });

  it("loads only the fixed tooling export after DebugTools is enabled", async () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const loadTooling = vi.fn(async (specifier: unknown) => {
      expect(specifier).toBe("@project-tavern/story-e2e/tooling");
      return Object.freeze({ e2eToolingEntryV1 });
    });
    const input = {
      resolved,
      host: createWebHostV1({
        records: createMemoryHostRecordStoreV1(),
        seeds: [0x0002_3049],
        uuids: ["00000000-0000-4000-8000-000000000097"],
        now: () => "2026-07-14T03:04:05.000Z",
      }),
      loadTooling,
    };
    const application = await createE2eGameRuntimeV1(input);

    expect(loadTooling).not.toHaveBeenCalled();
    await expect(application.debugTools.listFixtures()).resolves.toEqual({
      kind: "capability_disabled",
    });
    expect(loadTooling).not.toHaveBeenCalled();

    await application.capabilities.setEnabled("debug_tools", true);
    await expect(application.debugTools.listFixtures()).resolves.toEqual({
      kind: "listed",
      fixtureIds: e2eFixtureIdsV1,
    });
    await expect(application.debugTools.listFixtures()).resolves.toEqual({
      kind: "listed",
      fixtureIds: e2eFixtureIdsV1,
    });
    expect(loadTooling).toHaveBeenCalledTimes(1);
    expect(loadTooling).toHaveBeenCalledWith("@project-tavern/story-e2e/tooling");
  });

  it("executes parsed DebugCommands without tooling import and finalizes integrity once", async () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const loadTooling = vi.fn(async () => Object.freeze({ e2eToolingEntryV1 }));
    const input = {
      resolved,
      host: createWebHostV1({
        records: createMemoryHostRecordStoreV1(),
        seeds: [0x0002_3049],
        uuids: ["00000000-0000-4000-8000-000000000096"],
        now: () => "2026-07-14T03:04:05.000Z",
      }),
      loadTooling,
    };
    const application = await createE2eGameRuntimeV1(input);
    await application.capabilities.setEnabled("debug_tools", true);
    await expect(
      application.debugTools.executeDebugCommand({
        kind: "debug.e2e.counter.add",
        amount: parsePositiveSafeInteger(5),
      }),
    ).resolves.toEqual({ kind: "capability_disabled" });

    await application.capabilities.setEnabled("cheats", true);
    await expect(
      application.debugTools.executeDebugCommand({
        kind: "debug.e2e.counter.add",
        amount: parsePositiveSafeInteger(5),
      }),
    ).resolves.toEqual({ kind: "committed", commandSequence: 1 });
    expect(application.semantic.observe().game.counterLabel).toBe("计数 5");
    expect(loadTooling).not.toHaveBeenCalled();

    const firstBundle = JSON.parse(
      new TextDecoder().decode((await application.diagnostics.exportDebugBundle()).bytes),
    ) as {
      readonly commandLog: readonly {
        readonly source: string;
        readonly postStateDigest: string;
      }[];
      readonly currentSnapshot: E2eGameSnapshotV1;
      readonly currentStateDigest: string;
    };
    expect(firstBundle.currentSnapshot.integrity).toEqual({
      mode: "modified",
      mutationCount: 1,
      firstMutationSequence: 1,
      reasons: [
        {
          kind: "debug_command",
          commandKind: "debug.e2e.counter.add",
          sequence: 1,
        },
      ],
    });
    expect(firstBundle.commandLog).toHaveLength(1);
    expect(firstBundle.commandLog[0]).toMatchObject({
      source: "debug",
      postStateDigest: firstBundle.currentStateDigest,
    });

    await expect(
      application.debugTools.executeDebugCommand({
        kind: "debug.e2e.test.validation_failed",
      }),
    ).resolves.toEqual({
      kind: "validation_failed",
      error: {
        code: "debug.e2e.test_validation_failed",
        commandKind: "debug.e2e.test.validation_failed",
      },
    });
    const secondBundle = JSON.parse(
      new TextDecoder().decode((await application.diagnostics.exportDebugBundle()).bytes),
    ) as {
      readonly commandLog: readonly unknown[];
      readonly currentSnapshot: E2eGameSnapshotV1;
    };
    expect(secondBundle.commandLog).toHaveLength(1);
    expect(secondBundle.currentSnapshot.integrity.mutationCount).toBe(1);
  });

  it("records a fault without marking integrity and recovers through a fixture anchor", async () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const application = await createE2eGameRuntimeV1({
      resolved,
      host: createWebHostV1({
        records: createMemoryHostRecordStoreV1(),
        seeds: [0x0002_3049],
        uuids: ["00000000-0000-4000-8000-000000000095"],
        now: () => "2026-07-14T03:04:05.000Z",
      }),
    });
    await application.capabilities.setEnabled("debug_tools", true);
    await application.capabilities.setEnabled("cheats", true);

    await expect(
      application.debugTools.executeDebugCommand({ kind: "debug.e2e.test.fault" }),
    ).resolves.toEqual({ kind: "faulted", fault: { code: "e2e.test.fault" } });
    expect(application.semantic.observe().status).toBe("fault_paused");

    const faultBundle = JSON.parse(
      new TextDecoder().decode((await application.diagnostics.exportDebugBundle()).bytes),
    ) as {
      readonly commandLog: readonly unknown[];
      readonly currentSnapshot: E2eGameSnapshotV1;
      readonly failure: unknown;
    };
    expect(faultBundle.currentSnapshot.integrity).toEqual({
      mode: "normal",
      mutationCount: 0,
      firstMutationSequence: null,
      reasons: [],
    });
    expect(faultBundle.commandLog).toHaveLength(1);
    expect(faultBundle.failure).toMatchObject({
      command: { source: "debug", command: { kind: "debug.e2e.test.fault" } },
      fault: { code: "e2e.test.fault" },
    });

    await expect(
      application.debugTools.anchorFixture("fixture.other.story" as never),
    ).resolves.toEqual({
      kind: "validation_failed",
      error: {
        code: "debug.unknown_reference",
        commandKind: "debug.fixture.load",
        reference: { kind: "fixture", fixtureId: "fixture.other.story" },
      },
    });
    expect(application.semantic.observe().status).toBe("fault_paused");

    await expect(
      application.debugTools.anchorFixture("fixture.e2e.choice-right-blocked"),
    ).resolves.toEqual({ kind: "anchor_established", commandSequence: 2 });
    expect(application.semantic.observe()).toMatchObject({
      status: "ready",
      game: { counterLabel: "计数 2" },
    });
    const anchoredBundle = JSON.parse(
      new TextDecoder().decode((await application.diagnostics.exportDebugBundle()).bytes),
    ) as {
      readonly commandLog: readonly unknown[];
      readonly replayBase: E2eGameSnapshotV1;
      readonly currentSnapshot: E2eGameSnapshotV1;
    };
    expect(anchoredBundle.commandLog).toEqual([]);
    expect(anchoredBundle.replayBase).toEqual(anchoredBundle.currentSnapshot);
    expect(anchoredBundle.currentSnapshot.integrity).toEqual({
      mode: "modified",
      mutationCount: 1,
      firstMutationSequence: 2,
      reasons: [
        {
          kind: "fixture_anchor",
          fixtureId: "fixture.e2e.choice-right-blocked",
          sequence: 2,
        },
      ],
    });
  });

  it("inspects, replays, queries, and anchors one exact mixed Debug Bundle", async () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const createApplication = async (uuid: string) => {
      const application = await createE2eGameRuntimeV1({
        resolved,
        host: createWebHostV1({
          records: createMemoryHostRecordStoreV1(),
          seeds: [0x0002_3049],
          uuids: [uuid],
          now: () => "2026-07-14T03:04:05.000Z",
        }),
      });
      await application.capabilities.setEnabled("debug_tools", true);
      await application.capabilities.setEnabled("cheats", true);
      return application;
    };
    const source = await createApplication("00000000-0000-4000-8000-000000000094");
    await expect(
      source.debugTools.executeDebugCommand({
        kind: "debug.e2e.counter.add",
        amount: parsePositiveSafeInteger(5),
      }),
    ).resolves.toEqual({ kind: "committed", commandSequence: 1 });
    const exported = await source.diagnostics.exportDebugBundle();

    await expect(source.debugTools.inspectDebugBundle(exported.bytes)).resolves.toMatchObject({
      kind: "decoded",
      bundle: { commandLog: [{ source: "debug" }] },
    });
    await expect(source.debugTools.replayAuthoritatively(exported.bytes)).resolves.toEqual({
      kind: "replayed",
      comparison: {
        authoritative: true,
        identityMatch: true,
        visualMatch: true,
        matches: true,
        executedEntries: 1,
        mismatches: [],
      },
    });
    await expect(source.debugTools.inspectReplayBestEffort(exported.bytes)).resolves.toMatchObject({
      kind: "replayed",
      comparison: { authoritative: false, identityMatch: true, matches: true },
    });
    await expect(source.debugTools.queryDiagnostics({ kind: "summary" })).resolves.toEqual({
      kind: "summary",
      diagnostics: {
        invariantCodes: [],
        recentErrorCodes: [],
        hmrInvalidated: false,
      },
      commandLogEntryCount: 1,
    });

    const target = await createApplication("00000000-0000-4000-8000-000000000093");
    await expect(target.debugTools.anchorDebugBundle(exported.bytes)).resolves.toEqual({
      kind: "anchor_established",
      commandSequence: 1,
    });
    expect(target.semantic.observe().game.counterLabel).toBe("计数 5");
    const anchored = JSON.parse(
      new TextDecoder().decode((await target.diagnostics.exportDebugBundle()).bytes),
    ) as {
      readonly commandLog: readonly unknown[];
      readonly replayBase: E2eGameSnapshotV1;
      readonly currentSnapshot: E2eGameSnapshotV1;
    };
    expect(anchored.commandLog).toEqual([]);
    expect(anchored.replayBase).toEqual(anchored.currentSnapshot);
    expect(anchored.currentSnapshot.integrity).toEqual({
      mode: "modified",
      mutationCount: 2,
      firstMutationSequence: 1,
      reasons: [
        { kind: "debug_command", commandKind: "debug.e2e.counter.add", sequence: 1 },
        { kind: "debug_bundle_anchor", sequence: 1 },
      ],
    });
  });

  it("admits contract-valid diagnostic arrays beyond obsolete local caps", async () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const application = await createE2eGameRuntimeV1({
      resolved,
      host: createWebHostV1({
        records: createMemoryHostRecordStoreV1(),
        seeds: [0x0002_3049],
        uuids: ["00000000-0000-4000-8000-000000000098"],
        now: () => "2026-07-14T03:04:05.000Z",
      }),
    });
    await application.semantic.dispatch({ actionId: "action.e2e.increment", parameters: {} });
    await application.semantic.dispatch({
      actionId: "action.e2e.choose",
      parameters: { choice: "left" },
    });
    const bundle = JSON.parse(
      new TextDecoder().decode((await application.diagnostics.exportDebugBundle()).bytes),
    ) as {
      readonly provenance: {
        readonly resolved: {
          readonly patchSet: {
            readonly digest: string;
            readonly appliedHotfixes: readonly unknown[];
          };
        };
      };
      readonly commandLog: readonly {
        readonly committedRngBefore: unknown;
        readonly attemptedDraws: readonly unknown[];
        readonly outcome:
          | { readonly kind: "committed"; readonly facts: readonly unknown[] }
          | { readonly kind: "rejected"; readonly reasons: readonly unknown[] }
          | { readonly kind: "faulted"; readonly fault: unknown };
      }[];
    };
    const codec = createE2eDebugBundleCodecV1(resolved.gameSimulation.stateSchema);
    const patchDigest = bundle.provenance.resolved.patchSet.digest;
    const committedIndex = bundle.commandLog.findIndex(
      ({ outcome }) => outcome.kind === "committed",
    );
    const rejectedIndex = bundle.commandLog.findIndex(({ outcome }) => outcome.kind === "rejected");
    const committed = bundle.commandLog[committedIndex];
    const rejected = bundle.commandLog[rejectedIndex];
    if (committed === undefined || rejected === undefined) {
      throw new TypeError("missing E2E diagnostic evidence");
    }
    const rng = createTransactionalRngV1(rngStateV1Schema.parse(committed.committedRngBefore));
    for (let index = 0; index < 257; index += 1) {
      rng.nextInt({ exclusiveMax: 2, purpose: "check:e2e.debug_bundle_limit" });
    }

    const variants = [
      {
        label: "applied Hotfixes",
        value: {
          ...bundle,
          provenance: {
            ...bundle.provenance,
            resolved: {
              ...bundle.provenance.resolved,
              patchSet: {
                ...bundle.provenance.resolved.patchSet,
                appliedHotfixes: Array.from({ length: 257 }, (_, index) => ({
                  identity: {
                    id: `hotfix.e2e.${index + 1}`,
                    revision: 1,
                    digest: patchDigest,
                  },
                  ordinal: index + 1,
                  replacements: [],
                })),
              },
            },
          },
        },
      },
      {
        label: "Patch replacements",
        value: {
          ...bundle,
          provenance: {
            ...bundle.provenance,
            resolved: {
              ...bundle.provenance.resolved,
              patchSet: {
                ...bundle.provenance.resolved.patchSet,
                appliedHotfixes: [
                  {
                    identity: { id: "hotfix.e2e.large", revision: 1, digest: patchDigest },
                    ordinal: 1,
                    replacements: Array.from({ length: 257 }, (_, index) => ({
                      surface: "simulation",
                      symbolId: `symbol.e2e.${index + 1}`,
                      kind: "value",
                      previousProviderDigest: patchDigest,
                      nextProviderDigest: patchDigest,
                    })),
                  },
                ],
              },
            },
          },
        },
      },
      {
        label: "committed GameplayFacts",
        value: {
          ...bundle,
          commandLog: bundle.commandLog.map((entry, index) =>
            index === committedIndex
              ? {
                  ...entry,
                  outcome: {
                    kind: "committed",
                    facts: Array.from({ length: 257 }, () => ({ kind: "flow.started" })),
                  },
                }
              : entry,
          ),
        },
      },
      {
        label: "rejection reasons",
        value: {
          ...bundle,
          commandLog: bundle.commandLog.map((entry, index) =>
            index === rejectedIndex
              ? {
                  ...entry,
                  outcome: {
                    kind: "rejected",
                    reasons: Array.from({ length: 65 }, () => ({ code: "test.rejected" })),
                  },
                }
              : entry,
          ),
        },
      },
      {
        label: "attempted RNG draws",
        value: {
          ...bundle,
          commandLog: bundle.commandLog.map((entry, index) =>
            index === committedIndex ? { ...entry, attemptedDraws: rng.attemptedDraws() } : entry,
          ),
        },
      },
    ];

    for (const { label, value } of variants) {
      let failure: unknown;
      try {
        codec.bundleSchema.parse(value);
      } catch (error) {
        failure = error;
      }
      expect.soft(failure, label).toBeUndefined();
    }
  });

  it("consumes one resolved simulation without redefining or rematerializing the Story", async () => {
    const fixture = createCountingE2eStoryEntryV1();
    const resolved = resolveStoryForTestV1(fixture.entry);

    expect(fixture.calls()).toEqual({
      define: 2,
      simulationMaterializer: 1,
      presentationMaterializer: 1,
      createGameSimulation: 1,
    });

    const application = await createE2eGameRuntimeV1({
      resolved,
      host: createWebHostV1({
        records: createMemoryHostRecordStoreV1(),
        seeds: [0x0002_3049],
        uuids: ["00000000-0000-4000-8000-000000000001"],
        now: () => "2026-07-12T00:00:00.000Z",
      }),
    });
    await expect(
      application.semantic.dispatch({ actionId: "action.e2e.increment", parameters: {} }),
    ).resolves.toEqual({ kind: "committed" });
    expect(application.semantic.observe().game.counterLabel).toBe("计数 1");
    const semantic = application.semantic;
    const simulation = resolved.gameSimulation;
    await expect(application.capabilities.setEnabled("debug_tools", true)).resolves.toMatchObject({
      kind: "updated",
    });
    expect(application.semantic).toBe(semantic);
    expect(resolved.gameSimulation).toBe(simulation);
    expect(fixture.calls()).toEqual({
      define: 2,
      simulationMaterializer: 1,
      presentationMaterializer: 1,
      createGameSimulation: 1,
    });
  });

  it("composes six frozen ports around one real SemanticGamePort", async () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const application = await createE2eGameRuntimeV1({
      resolved,
      host: createWebHostV1({
        records: createMemoryHostRecordStoreV1(),
        seeds: [0x0002_3049, 0x0002_3050],
        uuids: ["00000000-0000-4000-8000-000000000001"],
        now: () => "2026-07-12T00:00:00.000Z",
      }),
    });
    expect(Object.keys(application).sort()).toEqual([
      "capabilities",
      "debugTools",
      "diagnostics",
      "lifecycle",
      "persistence",
      "semantic",
    ]);
    expect(Object.isFrozen(application)).toBe(true);
    expect(Object.keys(application.semantic).sort()).toEqual([
      "availableActions",
      "dispatch",
      "observe",
      "preview",
      "subscribe",
      "waitForIdle",
    ]);
    const initial = application.semantic.observe();
    expect(initial).toMatchObject({
      revision: 0,
      status: "ready",
      game: {
        counterLabel: "计数 0",
        flow: { status: "idle", nodeId: "intro" },
        terminal: false,
      },
    });
    expect(application.semantic.availableActions()).toBe(initial.actions);
    expect(application.semantic).not.toHaveProperty("view");
    expect(application.semantic).not.toHaveProperty("snapshot");
    await expect(
      application.semantic.preview({ actionId: "action.e2e.increment", parameters: {} }),
    ).resolves.toEqual({ kind: "allowed" });
    await expect(
      application.semantic.dispatch({
        actionId: "action.e2e.choose",
        parameters: { choice: "left" },
      }),
    ).resolves.toEqual({
      kind: "rejected",
      reasons: [{ code: "flow.not_choosing" }],
    });
    await expect(
      application.semantic.dispatch({
        actionId: "action.e2e.increment",
        parameters: { extra: true },
      } as never),
    ).resolves.toEqual({ kind: "not_executed", code: "validation_failed" });

    const listener = vi.fn();
    const unsubscribe = application.semantic.subscribe(listener);
    const idle = application.semantic.waitForIdle(initial.revision);
    await expect(
      application.semantic.dispatch({ actionId: "action.e2e.increment", parameters: {} }),
    ).resolves.toEqual({ kind: "committed" });
    const incremented = await idle;
    expect(incremented).toMatchObject({
      revision: 1,
      status: "ready",
      game: { counterLabel: "计数 1" },
    });
    expect(application.semantic.observe()).toBe(incremented);
    expect(application.semantic.availableActions()).toBe(incremented.actions);
    expect(listener).toHaveBeenCalled();
    await expect(application.lifecycle.restartSession()).resolves.toMatchObject({
      kind: "anchored",
      commandSequence: 0,
    });
    expect(application.semantic.observe()).toMatchObject({
      revision: 2,
      status: "ready",
      game: { counterLabel: "计数 0" },
    });
    unsubscribe();
    expect(application).not.toHaveProperty("commands");
    expect(application).not.toHaveProperty("view");
    expect(application).not.toHaveProperty("player");
    expect(application).not.toHaveProperty("developer");
    expect(application).not.toHaveProperty("snapshot");
    expect(application.capabilities.state.getCurrent()).toEqual({
      debugTools: false,
      cheats: false,
      automationBridge: false,
    });
    expect(Object.isFrozen(application.capabilities)).toBe(true);
    expect(Object.isFrozen(application.debugTools)).toBe(true);
    const disabledResults = await Promise.all([
      application.debugTools.listFixtures(),
      application.debugTools.executeDebugCommand({
        kind: "debug.e2e.counter.add",
        amount: parsePositiveSafeInteger(1),
      }),
      application.debugTools.anchorFixture("fixture.e2e.initial"),
      application.debugTools.inspectDebugBundle(new Uint8Array()),
      application.debugTools.anchorDebugBundle(new Uint8Array()),
      application.debugTools.replayAuthoritatively(new Uint8Array()),
      application.debugTools.inspectReplayBestEffort(new Uint8Array()),
      application.debugTools.queryDiagnostics(undefined as never),
    ]);
    for (const result of disabledResults) {
      expect(result).toEqual({ kind: "capability_disabled" });
      expect(result).toBe(disabledResults[0]);
    }
    expect(application.lifecycle.createNewSession).toHaveLength(0);
    expect(application.lifecycle.restartSession).toHaveLength(0);
    await vi.waitFor(async () => {
      await expect(application.persistence.getStatus()).resolves.toMatchObject({
        available: true,
        busy: false,
      });
    });
    await expect(application.persistence.lease.getStatus()).resolves.toEqual({
      kind: "owned",
      ownerId: "00000000-0000-4000-8000-000000000001",
      fencingToken: 1,
    });
    await expect(application.persistence.exportSave("manual")).resolves.toEqual({
      kind: "rejected",
      code: "empty_slot",
    });
    await expect(application.persistence.exportCurrentSave()).resolves.toMatchObject({
      mediaType: "application/json",
      filename: "project-tavern-e2e-current.json",
    });
  });

  it("wires the real lease, save, export, load, and import ports around the one Session FIFO", async () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const application = await createE2eGameRuntimeV1({
      resolved,
      host: createWebHostV1({
        records: createMemoryHostRecordStoreV1(),
        seeds: [0x0002_3049, 0x0002_3050, 0x0002_3051],
        uuids: ["00000000-0000-4000-8000-000000000011"],
        now: () => "2026-07-12T00:00:00.000Z",
      }),
    });

    await expect(application.persistence.lease.getStatus()).resolves.toEqual({
      kind: "owned",
      ownerId: "00000000-0000-4000-8000-000000000011",
      fencingToken: 1,
    });
    await expect(
      application.semantic.dispatch({ actionId: "action.e2e.increment", parameters: {} }),
    ).resolves.toEqual({ kind: "committed" });
    await expect(application.persistence.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    await expect(application.persistence.getStatus()).resolves.toMatchObject({
      available: true,
      safelySavedCommandSequence: 1,
      lastFailureCode: null,
    });

    const exported = await application.persistence.exportSave("quick");
    expect(exported).toMatchObject({
      kind: "exported",
      slotId: "quick",
      file: {
        filename: expect.any(String),
        mediaType: "application/json",
        bytes: expect.any(Uint8Array),
      },
    });
    if (exported.kind !== "exported") throw new TypeError("expected exported Quick Save");
    await expect(application.capabilities.setEnabled("debug_tools", true)).resolves.toMatchObject({
      kind: "updated",
    });

    await expect(application.lifecycle.restartSession()).resolves.toEqual({
      kind: "anchored",
      commandSequence: 0,
    });
    expect(application.semantic.observe().game.counterLabel).toBe("计数 0");
    await expect(application.persistence.load("quick")).resolves.toEqual({
      kind: "loaded",
      compatibility: "exact",
      commandSequence: 1,
    });
    expect(application.semantic.observe().game.counterLabel).toBe("计数 1");
    expect(application.capabilities.state.getCurrent().debugTools).toBe(true);

    await expect(application.lifecycle.restartSession()).resolves.toMatchObject({
      kind: "anchored",
      commandSequence: 0,
    });
    await expect(application.persistence.importSave(exported.file.bytes)).resolves.toEqual({
      kind: "imported",
      compatibility: "exact",
      commandSequence: 1,
    });
    expect(application.semantic.observe().game.counterLabel).toBe("计数 1");
    expect(application.capabilities.state.getCurrent()).toEqual({
      debugTools: true,
      cheats: false,
      automationBridge: false,
    });
  });

  it("rejects an exact-identity Save whose terminal State violates cross-module invariants", async () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const application = await createE2eGameRuntimeV1({
      resolved,
      host: createWebHostV1({
        records: createMemoryHostRecordStoreV1(),
        seeds: [0x0002_3049],
        uuids: ["00000000-0000-4000-8000-000000000012"],
        now: () => "2026-07-12T00:00:00.000Z",
      }),
    });
    const before = application.semantic.observe();
    const exported = await application.persistence.exportCurrentSave();
    const malformed = JSON.parse(new TextDecoder().decode(exported.bytes)) as {
      snapshot: E2eGameSnapshotV1;
      slot: {
        storyId: string;
        slotId: "manual";
        writeReason: "manual";
        capturedCommandSequence: number;
      };
      stateDigest: string;
    };
    const commandSequence = parseNonNegativeSafeInteger(4);
    const belowTerminalThreshold = parseNonNegativeSafeInteger(
      Number(resolved.simulationProgram.values.terminalThreshold) - 1,
    );
    malformed.snapshot = Object.freeze({
      ...malformed.snapshot,
      commandSequence,
      state: Object.freeze({
        simulation: Object.freeze({
          counter: Object.freeze({ value: belowTerminalThreshold }),
          flow: Object.freeze({ status: "resolved", branch: "right", nodeId: "done" }),
          run: Object.freeze({ status: "complete" }),
        }),
      }),
    });
    malformed.slot = Object.freeze({ ...malformed.slot, capturedCommandSequence: commandSequence });
    malformed.stateDigest = digestCanonical("sillymaker:state:v1", malformed.snapshot);

    await expect(
      application.persistence.importSave(canonicalJsonBytes(malformed)),
    ).resolves.toEqual({
      kind: "rejected",
      code: "invalid_record",
    });
    expect(application.semantic.observe()).toStrictEqual(before);
  });

  it("restores Host capability preferences before exposing the next runtime", async () => {
    const host = createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      seeds: [0x0002_3049, 0x0002_3050],
      uuids: ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"],
      now: () => "2026-07-12T00:00:00.000Z",
    });
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const first = await createE2eGameRuntimeV1({ resolved, host });
    await first.capabilities.setEnabled("debug_tools", true);
    await first.capabilities.setEnabled("cheats", true);

    const next = await createE2eGameRuntimeV1({ resolved, host });
    expect(next.capabilities.state.getCurrent()).toEqual({
      debugTools: true,
      cheats: true,
      automationBridge: false,
    });
    expect(next.semantic.observe().game.counterLabel).toBe("计数 0");
  });

  it("keeps four closed canonical command fixtures in the separate tooling entry", () => {
    expect(() =>
      validateToolingFixturesV1(e2eToolingEntryV1, {
        fixtureIdSchema: e2eFixtureIdSchemaV1,
        commandSchema: e2eGameCommandSchemaV1,
      }),
    ).not.toThrow();

    const support = e2eToolingEntryV1.defineToolingSupport();
    expect(support.fixtures.map((fixture) => fixture.fixtureId)).toEqual(e2eFixtureIdsV1);
    expect(support.fixtures[3]?.commands).toEqual([
      { kind: "e2e.flow.start" },
      { kind: "e2e.flow.choose", choice: "right" },
      { kind: "e2e.flow.continue" },
      { kind: "e2e.run.complete" },
    ]);
    expect(Object.isFrozen(support.fixtures)).toBe(true);
  });
});
