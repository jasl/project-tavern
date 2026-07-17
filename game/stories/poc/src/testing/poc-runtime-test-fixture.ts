// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
  createTransactionalRngV1,
  digestCanonical,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  rngStateV1Schema,
} from "@sillymaker/base";
import type {
  DeepReadonly,
  IsoUtcInstant,
  LeaseHandoffRequestId,
  RuntimeOperationFaultV1,
  SessionAnchorResultV1,
  SessionLeaseOwnerId,
  SimulationAdoptionV1,
} from "@sillymaker/base";
import {
  createDebugToolsPortV1,
  createGameDiagnosticsServiceV1,
  createGameSessionV1,
  createPersistenceServiceV1,
  createRuntimeCapabilityPortV1,
  decodeDebugBundleV1,
  inspectReplayBestEffortV1,
  replayAuthoritativelyV1,
} from "@sillymaker/base/runtime";
import type {
  DebugBundleDecodeResultV1,
  GameSessionCompositionV1,
  GameSessionDebugInputV1,
  ReplayComparisonV1,
} from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import {
  createPocGameApplicationV1,
  type PocGameApplicationPortV1,
  type PocPersistencePortV1,
} from "../application/create-poc-game-application.js";
import {
  createPocSemanticGamePortV1,
  type PocSemanticGamePortV1,
} from "../application/create-poc-semantic-port.js";
import {
  pocReferenceRunIdsV1,
  pocReferenceSeedV1,
  pocStoryIdentityV1,
} from "../content/identity.js";
import {
  createPocGameDebugCommandExecutorV1,
  createPocGameplayModuleTupleV1,
  pocDebugCommandKindsV1,
  pocDebugCommandSchemaV1,
  pocGameStateSchemaV1,
  type PocDebugCommandV1,
  type PocGameDebugCommandExecutorV1,
  type PocGameSimulationTypesV1,
  type PocGameSnapshotV1,
  type PocGameStateV1,
  type PocGameplayModuleTupleV1,
} from "../gameplay/index.js";
import {
  createPocDebugBundleCodecV1,
  createPocReplayInputV1,
  createPocUnexpectedFaultAttemptV1,
  createPocUnexpectedFaultV1,
  replayPocToolingFixtureV1,
  scrubPocDebugFailureV1,
  type PocCommandLogEntryV1,
  type PocDebugAnchorResultV1,
  type PocDebugBundleV1,
  type PocDebugCommandResultV1,
  type PocDebugFailureV1,
  type PocDebugReplayResultV1,
  type PocDiagnosticQueryResultV1,
  type PocDiagnosticQueryV1,
  type PocReplayDriverV1,
} from "../runtime/poc-debug-bundle.js";
import {
  validatePocStateInvariantsV1,
  validatePocStateReferencesV1,
} from "../runtime/poc-state-validation.js";
import { pocStoryEntryV1, type PocResolvedGameV1 } from "../story-definition.js";

const pocToolingSpecifierV1 = "@project-tavern/story-poc/tooling" as const;
const snapshotSchemaV1 = createGameSnapshotEnvelopeSchemaV1(pocGameStateSchemaV1, rngStateV1Schema);

type PocToolingModuleV1 = {
  readonly pocStoryToolingEntryV1: typeof import("../tooling/index.js").pocStoryToolingEntryV1;
};

export type PocToolingLoaderV1 = (
  specifier: typeof pocToolingSpecifierV1,
) => Promise<PocToolingModuleV1>;

type PocSessionV1 = GameSessionCompositionV1<PocGameSimulationTypesV1>;
const emptySimulationLineageV1 = Object.freeze([]) as readonly SimulationAdoptionV1[];
const emptyRuntimeFailuresV1 = Object.freeze([]) as readonly RuntimeOperationFaultV1[];
const metadataClockV1 = Object.freeze({
  now: () => "2026-07-16T00:00:00.000Z" as IsoUtcInstant,
});
const pocRuntimeTestAppBuildIdV1 = digestCanonical("sillymaker:application:v1", [
  "poc-runtime-test",
]);

export interface PocRuntimeTestFixtureV1 {
  readonly application: PocGameApplicationPortV1;
  toolingLoads(): number;
  loadedSpecifier(): typeof pocToolingSpecifierV1 | undefined;
  snapshotForTest(): DeepReadonly<PocGameSnapshotV1>;
  commandLogForTest(): readonly DeepReadonly<PocCommandLogEntryV1>[];
  latestCommandLogEntry(): DeepReadonly<PocCommandLogEntryV1> | undefined;
  debugExecutorValidateCalls(): number;
  debugExecutorExecuteAttemptCalls(): number;
  nextSemanticPublication(): ReturnType<PocSemanticGamePortV1["waitForIdle"]>;
  roundTripExactSave(): Promise<{ readonly snapshot: DeepReadonly<PocGameSnapshotV1> }>;
  exportDebugBundleForTest(): Promise<DeepReadonly<PocDebugBundleV1>>;
  replayForTest(): Promise<{
    readonly comparison: ReplayComparisonV1;
    readonly finalSnapshot: DeepReadonly<PocGameSnapshotV1>;
  }>;
}

export interface PocReplayableDebugIntegrationVectorV1 {
  readonly kind: PocDebugCommandV1["kind"];
  readonly command: DeepReadonly<PocDebugCommandV1>;
}

function debugCommandV1(value: unknown): PocDebugCommandV1 {
  return pocDebugCommandSchemaV1.parse(value);
}

export const pocReplayableDebugIntegrationVectorsV1 = Object.freeze([
  {
    kind: "debug.calendar.set_ap",
    command: debugCommandV1({
      kind: "debug.calendar.set_ap",
      value: 1,
      reasonId: "reason.debug.state_override",
    }),
  },
  {
    kind: "debug.actor.set_stamina",
    command: debugCommandV1({
      kind: "debug.actor.set_stamina",
      actorId: "actor.player",
      value: 9,
      reasonId: "reason.debug.state_override",
    }),
  },
  {
    kind: "debug.actor.set_mood",
    command: debugCommandV1({
      kind: "debug.actor.set_mood",
      actorId: "actor.heroine",
      value: 1,
      reasonId: "reason.debug.state_override",
    }),
  },
  {
    kind: "debug.relationship.set",
    command: debugCommandV1({
      kind: "debug.relationship.set",
      affection: 1,
      teamwork: 1,
      stage: "cold",
      reasonId: "reason.debug.state_override",
    }),
  },
  {
    kind: "debug.inventory.adjust_cash",
    command: debugCommandV1({
      kind: "debug.inventory.adjust_cash",
      delta: 1,
      reasonId: "reason.debug.cash_adjustment",
    }),
  },
  {
    kind: "debug.aura.apply",
    command: debugCommandV1({
      kind: "debug.aura.apply",
      auraId: "tavern.sign_repaired",
      target: { kind: "tavern" },
      duration: { kind: "countdown", unit: "opening", remaining: 1 },
      reasonId: "reason.debug.aura_adjustment",
    }),
  },
  {
    kind: "debug.aura.clear",
    command: debugCommandV1({
      kind: "debug.aura.clear",
      instanceId: "aura:initial:0",
      reasonId: "reason.debug.aura_adjustment",
    }),
  },
  {
    kind: "debug.story.fact.set",
    command: debugCommandV1({
      kind: "debug.story.fact.set",
      factId: "fact.war_clue",
      value: { kind: "boolean", value: true },
      reasonId: "reason.debug.state_override",
    }),
  },
  {
    kind: "debug.narrative.jump",
    command: debugCommandV1({
      kind: "debug.narrative.jump",
      cursor: {
        sceneId: "scene.supplier_invoice",
        nodeId: "node.supplier_invoice.choice",
      },
      reasonId: "reason.debug.narrative_jump",
    }),
  },
  {
    kind: "debug.rng.set",
    command: debugCommandV1({
      kind: "debug.rng.set",
      rng: { algorithm: "xorshift32-v1", cursor: 17, rawDrawCount: 4 },
      reasonId: "reason.debug.rng_override",
    }),
  },
] as const satisfies readonly PocReplayableDebugIntegrationVectorV1[]);

if (
  pocReplayableDebugIntegrationVectorsV1.length !== pocDebugCommandKindsV1.length ||
  pocReplayableDebugIntegrationVectorsV1.some(
    ({ kind }, index) => kind !== pocDebugCommandKindsV1[index],
  )
) {
  throw new TypeError("PoC debug integration matrix does not cover the frozen command-kind order");
}

export function unknownReasonDebugCommandV1(): PocDebugCommandV1 {
  return debugCommandV1({
    kind: "debug.calendar.set_ap",
    value: 1,
    reasonId: "reason.unknown",
  });
}

export function validSetMoodDebugCommandV1(): PocDebugCommandV1 {
  return debugCommandV1({
    kind: "debug.actor.set_mood",
    actorId: "actor.heroine",
    value: 1,
    reasonId: "reason.debug.state_override",
  });
}

function createInitialSnapshotV1(
  resolved: PocResolvedGameV1,
  mode: "default" | "debug_matrix",
): PocGameSnapshotV1 {
  const bootstrap = Object.freeze({
    rngSeed: pocReferenceSeedV1,
    runId: pocReferenceRunIdsV1["strategy.cash_first"],
  });
  const initial = snapshotSchemaV1.parse({
    state: resolved.gameSimulation.createInitialState(bootstrap),
    rng: createTransactionalRngV1(bootstrap.rngSeed).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  });
  if (mode === "default") return initial;

  return snapshotSchemaV1.parse({
    ...initial,
    state: pocGameStateSchemaV1.parse({
      ...initial.state,
      simulation: {
        ...initial.state.simulation,
        status: {
          auras: [
            {
              instanceId: "aura:initial:0",
              auraId: "heroine.angry",
              target: { kind: "actor", actorId: "actor.heroine" },
              source: { kind: "initial", reasonId: "reason.aura.heroine_angry" },
              duration: { kind: "countdown", unit: "day_end", remaining: 2 },
              appliedAtSequence: 0,
            },
          ],
        },
      },
      story: {
        ...initial.state.story,
        narrative: {
          status: "active",
          source: { kind: "manifest_start" },
          cursor: {
            sceneId: "scene.manifest_start",
            nodeId: "node.manifest_start.card",
          },
          callStack: [],
          stage: initial.state.story.narrative.stage,
        },
      },
    }),
  });
}

function debugExecutorV1(
  resolved: PocResolvedGameV1,
  injectedOwnerFault: "actors.after_proposal" | undefined,
): PocGameDebugCommandExecutorV1 {
  if (injectedOwnerFault === undefined) return resolved.gameSimulation.debugCommandExecutor;

  const modules = createPocGameplayModuleTupleV1(resolved.simulationProgram);
  const actors = modules[2];
  const faultedActors = Object.freeze({
    ...actors,
    owner: Object.freeze({
      ...actors.owner,
      propose(...args: Parameters<typeof actors.owner.propose>) {
        void actors.owner.propose(...args);
        throw new TypeError("injected actors failure after proposal");
      },
    }),
  });
  const faultedModules = Object.freeze([
    modules[0],
    modules[1],
    faultedActors,
    modules[3],
    modules[4],
    modules[5],
    modules[6],
    modules[7],
    modules[8],
    modules[9],
  ]) as PocGameplayModuleTupleV1;
  return createPocGameDebugCommandExecutorV1(resolved.simulationProgram, faultedModules);
}

function createSessionV1(input: {
  readonly resolved: PocResolvedGameV1;
  readonly initialSnapshot: PocGameSnapshotV1;
  readonly debugExecutor: PocGameDebugCommandExecutorV1;
  onDebugValidate(): void;
  onDebugExecuteAttempt(): void;
}): PocSessionV1 {
  const debug = Object.freeze({
    validate(snapshot, command) {
      input.onDebugValidate();
      return input.debugExecutor.validate(snapshot, command, undefined);
    },
    executeAttempt(snapshot, command) {
      input.onDebugExecuteAttempt();
      return input.debugExecutor.executeAttempt(snapshot, command, undefined);
    },
    normalizeUnexpectedFault(error, snapshot) {
      return createPocUnexpectedFaultAttemptV1(error, snapshot);
    },
  } satisfies GameSessionDebugInputV1<PocGameSimulationTypesV1>);

  return createGameSessionV1<PocGameSimulationTypesV1>({
    initialSnapshot: input.initialSnapshot,
    commandSchema: input.resolved.gameSimulation.commandSchema,
    executionContext: undefined,
    executeAttempt: (snapshot, command) =>
      input.resolved.gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined),
    normalizeUnexpectedDispatchFault: createPocUnexpectedFaultAttemptV1,
    debug,
  });
}

export function createPocRuntimeTestFixtureV1(input: {
  readonly debugTools: boolean;
  readonly cheats: boolean;
  readonly initialSnapshot?: "default" | "debug_matrix";
  readonly injectedOwnerFault?: "actors.after_proposal";
  readonly loadTooling?: PocToolingLoaderV1;
}): PocRuntimeTestFixtureV1 {
  const resolved = resolveStoryForTestV1(pocStoryEntryV1);
  const initialSnapshotMode = input.initialSnapshot ?? "default";
  let debugValidateCalls = 0;
  let debugExecuteAttemptCalls = 0;
  const created = createSessionV1({
    resolved,
    initialSnapshot: createInitialSnapshotV1(resolved, initialSnapshotMode),
    debugExecutor: debugExecutorV1(resolved, input.injectedOwnerFault),
    onDebugValidate: () => {
      debugValidateCalls += 1;
    },
    onDebugExecuteAttempt: () => {
      debugExecuteAttemptCalls += 1;
    },
  });
  const capabilities = createRuntimeCapabilityPortV1({
    initialState: Object.freeze({
      debugTools: input.debugTools,
      cheats: input.cheats,
      automationBridge: false,
    }),
    persist: async () => Object.freeze({ kind: "committed" as const }),
  });
  const semantic = createPocSemanticGamePortV1({
    gameSimulation: resolved.gameSimulation,
    session: created.session,
    runtimeControl: created.runtimeControl,
    reportSubscriberFailure: () => undefined,
  });
  const persistenceServicePromise = createPersistenceServiceV1<PocGameStateV1, PocGameSnapshotV1>({
    runtimeControl: created.runtimeControl,
    records: createMemoryHostRecordStoreV1(),
    snapshotSchema: snapshotSchemaV1,
    provenance: resolved.provenance,
    adoptionDeclaration: null,
    ownerId: "session.poc-runtime-test" as SessionLeaseOwnerId,
    nextHandoffRequestId: () => "handoff.poc-runtime-test" as LeaseHandoffRequestId,
    validateReferences(state) {
      return validatePocStateReferencesV1(resolved, state);
    },
    validateInvariants(view) {
      return validatePocStateInvariantsV1(resolved, view);
    },
    initialSimulationLineage: emptySimulationLineageV1,
    metadataClock: metadataClockV1,
    exportFilename: "project-tavern-poc-runtime-test-save.json",
  });
  const persistence = Object.freeze({
    lease: Object.freeze({
      async getStatus() {
        return await (await persistenceServicePromise).port.lease.getStatus();
      },
      async requestHandoff() {
        return await (await persistenceServicePromise).port.lease.requestHandoff();
      },
      async approveHandoff(requestId) {
        return await (await persistenceServicePromise).port.lease.approveHandoff(requestId);
      },
      async takeOver() {
        return await (await persistenceServicePromise).port.lease.takeOver();
      },
      async release() {
        return await (await persistenceServicePromise).port.lease.release();
      },
    } satisfies PocPersistencePortV1["lease"]),
    async listSlots() {
      return await (await persistenceServicePromise).port.listSlots();
    },
    async getStatus() {
      return await (await persistenceServicePromise).port.getStatus();
    },
    async save(slot) {
      return await (await persistenceServicePromise).port.save(slot);
    },
    async load(slot) {
      return await (await persistenceServicePromise).port.load(slot);
    },
    async clear(slot) {
      return await (await persistenceServicePromise).port.clear(slot);
    },
    async exportSave(slot) {
      return await (await persistenceServicePromise).port.exportSave(slot);
    },
    async exportCurrentSave() {
      return await (await persistenceServicePromise).port.exportCurrentSave();
    },
    async importSave(bytes: Uint8Array) {
      return await (await persistenceServicePromise).port.importSave(bytes);
    },
  } satisfies PocPersistencePortV1);
  const lifecycleOperation = async (): Promise<SessionAnchorResultV1> => {
    const persistenceService = await persistenceServicePromise;
    return await created.runtimeControl.enqueueAuthoritative<SessionAnchorResultV1>(
      async () => {
        const snapshot = createInitialSnapshotV1(resolved, initialSnapshotMode);
        return Object.freeze({
          kind: "replace" as const,
          snapshot,
          result: Object.freeze({
            kind: "anchored" as const,
            commandSequence: parseNonNegativeSafeInteger(0),
          }),
          anchor: "replace_replay_base" as const,
        });
      },
      () => Object.freeze({ kind: "faulted" as const, code: "runtime.anchor_failed" as const }),
      (snapshot) => persistenceService.establishAnchor(snapshot, emptySimulationLineageV1),
      () => Object.freeze({ kind: "rejected" as const, code: "hmr_invalidated" as const }),
    );
  };
  const debugBundleCodec = createPocDebugBundleCodecV1();
  const diagnostics = createGameDiagnosticsServiceV1({
    codec: debugBundleCodec,
    provenance: resolved.provenance,
    appBuildId: pocRuntimeTestAppBuildIdV1,
    getCapabilities: () => capabilities.state.getCurrent(),
    getSimulationLineage: () => emptySimulationLineageV1,
    readAtQueueFront: (reader) => created.runtimeControl.readAtQueueFront(reader),
    getReplayEvidence: () =>
      Object.freeze({
        replayBase: created.commandLog.replayBase(),
        replayBaseStateDigest: created.commandLog.replayBaseStateDigest(),
        commandLog: created.commandLog.entries(),
      }),
    getDiagnostics: () =>
      Object.freeze({
        invariantCodes: Object.freeze([]),
        recentErrorCodes: Object.freeze([]),
        hmrInvalidated: false,
      }),
    getRuntimeFailures: () => emptyRuntimeFailuresV1,
    getFailure: (): DeepReadonly<PocDebugFailureV1> | undefined => undefined,
    scrubFailure: scrubPocDebugFailureV1,
    metadataClock: metadataClockV1,
    exportFilename: "project-tavern-poc-runtime-test.debug-bundle.json",
  });

  const loadTooling =
    input.loadTooling ??
    (async () => (await import("@project-tavern/story-poc/tooling")) as PocToolingModuleV1);
  let toolingLoadCount = 0;
  let lastLoadedSpecifier: typeof pocToolingSpecifierV1 | undefined;
  let cachedSupport:
    ReturnType<PocToolingModuleV1["pocStoryToolingEntryV1"]["defineToolingSupport"]> | undefined;
  let toolingAttempt:
    | Promise<ReturnType<PocToolingModuleV1["pocStoryToolingEntryV1"]["defineToolingSupport"]>>
    | undefined;
  const toolingSupport = async () => {
    if (cachedSupport !== undefined) return cachedSupport;
    if (toolingAttempt !== undefined) return await toolingAttempt;
    const attempt = (async () => {
      toolingLoadCount += 1;
      lastLoadedSpecifier = pocToolingSpecifierV1;
      const module = await loadTooling(pocToolingSpecifierV1);
      if (
        module.pocStoryToolingEntryV1.storyIdentity.id !== pocStoryIdentityV1.id ||
        module.pocStoryToolingEntryV1.storyIdentity.revision !== pocStoryIdentityV1.revision
      ) {
        throw new TypeError("PoC tooling Story identity mismatch");
      }
      const support = module.pocStoryToolingEntryV1.defineToolingSupport();
      cachedSupport = support;
      return support;
    })();
    toolingAttempt = attempt;
    try {
      return await attempt;
    } finally {
      if (toolingAttempt === attempt) toolingAttempt = undefined;
    }
  };

  const publicFault = createPocUnexpectedFaultV1(
    new TypeError("PoC runtime operation unavailable"),
  );
  const debugTools = createDebugToolsPortV1<
    PocDebugCommandV1,
    PocDebugCommandResultV1,
    string,
    PocDebugAnchorResultV1,
    DebugBundleDecodeResultV1<PocDebugBundleV1>,
    PocDebugReplayResultV1,
    PocDebugReplayResultV1,
    PocDiagnosticQueryV1,
    PocDiagnosticQueryResultV1
  >({
    capabilities: capabilities.state,
    debugCommandSchema: pocDebugCommandSchemaV1,
    debugCommandSchemaFailure: () =>
      Object.freeze({
        kind: "validation_failed" as const,
        error: Object.freeze({ code: "debug.command_schema_invalid" as const }),
      }),
    async listFixtures() {
      const support = await toolingSupport();
      return Object.freeze(support.fixtures.map(({ fixtureId }) => fixtureId));
    },
    async executeDebugCommand(command, isStillEnabled): Promise<PocDebugCommandResultV1> {
      const result = await created.debugControl.execute(command, isStillEnabled);
      if (result.kind === "capability_disabled") return result;
      if (result.kind === "not_executed") {
        return Object.freeze({ kind: "faulted" as const, fault: publicFault });
      }
      if (result.kind === "validation_failed") {
        const error = result.errors[0];
        return error === undefined
          ? Object.freeze({ kind: "faulted" as const, fault: publicFault })
          : Object.freeze({ kind: "validation_failed" as const, error });
      }
      if (result.attempt.result.kind === "committed") {
        return Object.freeze({
          kind: "committed" as const,
          commandSequence: parsePositiveSafeInteger(result.attempt.result.snapshot.commandSequence),
        });
      }
      return result.attempt.result.kind === "faulted"
        ? Object.freeze({
            kind: "faulted" as const,
            fault: result.attempt.result.fault,
          })
        : Object.freeze({ kind: "faulted" as const, fault: publicFault });
    },
    async anchorFixture(fixtureId: string, isStillEnabled): Promise<PocDebugAnchorResultV1> {
      const persistenceService = await persistenceServicePromise;
      const anchored = await created.debugControl.anchorReplacement<PocDebugAnchorResultV1>(
        Object.freeze({ kind: "fixture" as const, fixtureId }),
        async () => {
          const support = await toolingSupport();
          const fixture = support.fixtures.find((candidate) => candidate.fixtureId === fixtureId);
          if (fixture === undefined) {
            return Object.freeze({
              kind: "preserve" as const,
              result: Object.freeze({
                kind: "validation_failed" as const,
                error: Object.freeze({
                  code: "debug.unknown_reference" as const,
                  commandKind: "debug.fixture.load" as const,
                  reference: Object.freeze({
                    kind: "fixture" as const,
                    fixtureId,
                  }),
                }),
              }),
            });
          }
          const snapshot = await replayPocToolingFixtureV1(resolved, fixture);
          return Object.freeze({
            kind: "replace" as const,
            snapshot,
            result: Object.freeze({
              kind: "anchor_established" as const,
              commandSequence: snapshot.commandSequence,
            }),
          });
        },
        isStillEnabled,
        () => Object.freeze({ kind: "faulted" as const, fault: publicFault }),
        (snapshot) => persistenceService.establishAnchor(snapshot, emptySimulationLineageV1),
      );
      return anchored.kind === "not_executed"
        ? Object.freeze({ kind: "faulted" as const, fault: publicFault })
        : anchored;
    },
    inspectDebugBundle(bytes) {
      return decodeDebugBundleV1(bytes, debugBundleCodec);
    },
    async anchorDebugBundle(bytes, isStillEnabled): Promise<PocDebugAnchorResultV1> {
      const persistenceService = await persistenceServicePromise;
      const decoded = decodeDebugBundleV1(bytes, debugBundleCodec);
      if (decoded.kind === "rejected") {
        return Object.freeze({
          kind: "validation_failed" as const,
          error: Object.freeze({
            code: "debug.bundle_invalid" as const,
            rejection: decoded.code,
          }),
        });
      }
      const comparison = await replayAuthoritativelyV1(
        createPocReplayInputV1(resolved, decoded.bundle, pocRuntimeTestAppBuildIdV1),
      );
      if (!comparison.authoritative || !comparison.identityMatch || !comparison.matches) {
        return Object.freeze({
          kind: "validation_failed" as const,
          error: Object.freeze({ code: "debug.bundle_replay_mismatch" as const }),
        });
      }
      const anchored = await created.debugControl.anchorReplacement<PocDebugAnchorResultV1>(
        Object.freeze({ kind: "debug_bundle" as const }),
        async () =>
          Object.freeze({
            kind: "replace" as const,
            snapshot: snapshotSchemaV1.parse(decoded.bundle.currentSnapshot),
            result: Object.freeze({
              kind: "anchor_established" as const,
              commandSequence: decoded.bundle.currentSnapshot.commandSequence,
            }),
          }),
        isStillEnabled,
        () => Object.freeze({ kind: "faulted" as const, fault: publicFault }),
        (snapshot) => persistenceService.establishAnchor(snapshot, emptySimulationLineageV1),
      );
      return anchored.kind === "not_executed"
        ? Object.freeze({ kind: "faulted" as const, fault: publicFault })
        : anchored;
    },
    async replayAuthoritatively(bytes) {
      const decoded = decodeDebugBundleV1(bytes, debugBundleCodec);
      if (decoded.kind === "rejected") return decoded;
      return Object.freeze({
        kind: "replayed" as const,
        comparison: await replayAuthoritativelyV1(
          createPocReplayInputV1(resolved, decoded.bundle, pocRuntimeTestAppBuildIdV1),
        ),
      });
    },
    async inspectReplayBestEffort(bytes) {
      const decoded = decodeDebugBundleV1(bytes, debugBundleCodec);
      if (decoded.kind === "rejected") return decoded;
      return Object.freeze({
        kind: "replayed" as const,
        comparison: await inspectReplayBestEffortV1(
          createPocReplayInputV1(resolved, decoded.bundle, pocRuntimeTestAppBuildIdV1),
        ),
      });
    },
    async queryDiagnostics(query) {
      if (
        query === null ||
        typeof query !== "object" ||
        Array.isArray(query) ||
        Reflect.ownKeys(query).length !== 1 ||
        !Object.hasOwn(query, "kind") ||
        (query as { readonly kind?: unknown }).kind !== "summary"
      ) {
        return Object.freeze({ kind: "validation_failed" as const });
      }
      return await created.runtimeControl.readAtQueueFront(() =>
        Object.freeze({
          kind: "summary" as const,
          diagnostics: Object.freeze({
            invariantCodes: Object.freeze([]),
            recentErrorCodes: Object.freeze([]),
            hmrInvalidated: false,
          }),
          commandLogEntryCount: parseNonNegativeSafeInteger(created.commandLog.entries().length),
        }),
      );
    },
  });

  const application = createPocGameApplicationV1({
    semantic,
    lifecycle: Object.freeze({
      createNewSession: lifecycleOperation,
      restartSession: lifecycleOperation,
    }),
    persistence,
    diagnostics,
    capabilities,
    debugTools,
  });

  const commandLog = () => created.commandLog.entries();
  return Object.freeze({
    application,
    toolingLoads: () => toolingLoadCount,
    loadedSpecifier: () => lastLoadedSpecifier,
    snapshotForTest: () => created.session.getCurrentSnapshot(),
    commandLogForTest: commandLog,
    latestCommandLogEntry: (): DeepReadonly<PocCommandLogEntryV1> | undefined =>
      commandLog().at(-1),
    debugExecutorValidateCalls: () => debugValidateCalls,
    debugExecutorExecuteAttemptCalls: () => debugExecuteAttemptCalls,
    nextSemanticPublication: () => semantic.waitForIdle(semantic.observe().revision),
    async roundTripExactSave() {
      const persistenceService = await persistenceServicePromise;
      const exported = await persistenceService.port.exportCurrentSave();
      const imported = await persistenceService.port.importSave(exported.bytes);
      if (imported.kind !== "imported" || imported.compatibility !== "exact") {
        throw new TypeError("PoC exact Save round trip failed");
      }
      return Object.freeze({ snapshot: created.session.getCurrentSnapshot() });
    },
    async exportDebugBundleForTest() {
      const exported = await diagnostics.exportDebugBundle();
      const decoded = decodeDebugBundleV1(exported.bytes, debugBundleCodec);
      if (decoded.kind === "rejected") {
        throw new TypeError(`PoC Debug Bundle decode failed: ${decoded.code}`);
      }
      return decoded.bundle;
    },
    async replayForTest() {
      const exported = await diagnostics.exportDebugBundle();
      const decoded = decodeDebugBundleV1(exported.bytes, debugBundleCodec);
      if (decoded.kind === "rejected") {
        throw new TypeError(`PoC Debug Bundle decode failed: ${decoded.code}`);
      }
      let replayDriver: PocReplayDriverV1 | undefined;
      const comparison = await replayAuthoritativelyV1(
        createPocReplayInputV1(resolved, decoded.bundle, pocRuntimeTestAppBuildIdV1, (driver) => {
          replayDriver = driver;
        }),
      );
      if (!comparison.authoritative || !comparison.identityMatch || !comparison.matches) {
        throw new TypeError("PoC authoritative replay mismatch");
      }
      if (replayDriver === undefined) throw new TypeError("PoC replay driver was not created");
      return Object.freeze({
        comparison,
        finalSnapshot: replayDriver.getCurrentSnapshot(),
      });
    },
  });
}
