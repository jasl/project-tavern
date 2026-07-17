// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createDebugUiContextSchemaV1,
  createGameSnapshotEnvelopeSchemaV1,
  parseDigest,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  rngStateV1Schema,
} from "@sillymaker/base";
import type {
  DebugToolsPortV1,
  DebugUiContextV1,
  DeepReadonly,
  Digest,
  ExportedDebugBundleV1,
  ExportedSaveV1,
  GameApplicationPortV1,
  GameHostV1,
  LeaseHandoffRequestId,
  PersistenceOperationResultV1,
  PersistenceStatusV1,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
  RuntimeCapabilityIdV1,
  RuntimeCapabilityPortV1,
  SaveExportOperationResultV1,
  SaveSlotSummaryV1,
  SessionAnchorResultV1,
  SessionLeaseOperationResultV1,
  SessionLeaseStatusV1,
  SimulationAdoptionV1,
} from "@sillymaker/base";
import {
  createDebugToolsPortV1,
  decodeDebugBundleV1,
  createGameDiagnosticsServiceV1,
  createGameApplicationV1,
  createGameSessionV1,
  createPersistenceServiceV1,
  inspectReplayBestEffortV1,
  replayAuthoritativelyV1,
} from "@sillymaker/base/runtime";
import type {
  DebugBundleDecodeRejectionCodeV1,
  DebugBundleDecodeResultV1,
  GameSessionDebugInputV1,
  PersistenceRebootstrapDisposalV1,
  ReplayComparisonV1,
} from "@sillymaker/base/runtime";
import { createGameRuntimeV1 } from "@sillymaker/web";
import type {
  RuntimeCapabilitySessionOverlayV1,
  WebRuntimeRebootstrapLifecycleV1,
} from "@sillymaker/web";

import type {
  E2eDebugCommandV1,
  E2eDebugValidationErrorV1,
  E2eGameCommandV1,
  E2eGameStateV1,
  E2eGameSimulationTypesV1,
  E2eGameSnapshotV1,
  E2eGameplayFaultV1,
} from "../gameplay/contracts/index.js";
import { requireExactObjectV1 } from "../gameplay/contracts/state.js";
import { e2eStateContractManifestV1 } from "../story-definition.js";
import {
  createE2eDebugBundleCodecV1,
  createE2eReplayInputV1,
  createE2eUnexpectedFaultAttemptV1,
} from "../runtime/e2e-debug-bundle.js";
import type {
  E2eDebugBundleV1,
  E2eDebugFailureV1,
  E2eDiagnosticCodeV1,
  E2eDiagnosticSummaryV1,
  E2eFinalizedAttemptV1,
} from "../runtime/e2e-debug-bundle.js";
import { createE2eSemanticGamePortV1 } from "../runtime/e2e-semantic-game-port.js";
import type { E2eSemanticGamePortV1 } from "../runtime/e2e-semantic-game-port.js";
import { createE2eInitialSnapshotV1 } from "../session.js";
import type { E2eResolvedGameV1 } from "../story-entry.js";
import type { E2eFixtureIdV1, E2eFixtureResolverV1 } from "../tooling.js";

export { createE2eDebugBundleCodecV1 };

export type E2eDebugCommandResultV1 =
  | {
      readonly kind: "validation_failed";
      readonly error: E2eDebugValidationErrorV1 | { readonly code: "debug.command_schema_invalid" };
    }
  | { readonly kind: "committed"; readonly commandSequence: PositiveSafeInteger }
  | { readonly kind: "faulted"; readonly fault: E2eGameplayFaultV1 };

export type E2eDebugAnchorResultV1 =
  | {
      readonly kind: "validation_failed";
      readonly error:
        | {
            readonly code: "debug.unknown_reference";
            readonly commandKind: "debug.fixture.load";
            readonly reference: { readonly kind: "fixture"; readonly fixtureId: string };
          }
        | {
            readonly code: "debug.bundle_invalid";
            readonly rejection: DebugBundleDecodeRejectionCodeV1;
          }
        | { readonly code: "debug.bundle_replay_mismatch" };
    }
  | { readonly kind: "anchor_established"; readonly commandSequence: NonNegativeSafeInteger }
  | { readonly kind: "faulted"; readonly fault: E2eGameplayFaultV1 };

export type E2eDebugReplayResultV1 =
  | { readonly kind: "rejected"; readonly code: DebugBundleDecodeRejectionCodeV1 }
  | { readonly kind: "replayed"; readonly comparison: ReplayComparisonV1 };

export type E2eDiagnosticQueryV1 = { readonly kind: "summary" };

export type E2eDiagnosticQueryResultV1 =
  | { readonly kind: "validation_failed"; readonly code: "debug.diagnostics_query_invalid" }
  | {
      readonly kind: "summary";
      readonly diagnostics: E2eDiagnosticSummaryV1;
      readonly commandLogEntryCount: NonNegativeSafeInteger;
    };

export type E2eDebugToolsPortV1 = DebugToolsPortV1<
  E2eDebugCommandV1,
  E2eDebugCommandResultV1,
  E2eFixtureIdV1,
  E2eDebugAnchorResultV1,
  DebugBundleDecodeResultV1<E2eDebugBundleV1>,
  E2eDebugReplayResultV1,
  E2eDebugReplayResultV1,
  E2eDiagnosticQueryV1,
  E2eDiagnosticQueryResultV1
>;

type E2ePersistencePortV1 = {
  readonly lease: {
    getStatus(): Promise<SessionLeaseStatusV1>;
    requestHandoff(): Promise<SessionLeaseOperationResultV1>;
    approveHandoff(requestId: LeaseHandoffRequestId): Promise<SessionLeaseOperationResultV1>;
    takeOver(): Promise<SessionLeaseOperationResultV1>;
    release(): Promise<SessionLeaseOperationResultV1>;
  };
  listSlots(): Promise<readonly SaveSlotSummaryV1[]>;
  getStatus(): Promise<PersistenceStatusV1>;
  save(slot: "quick" | "manual"): Promise<PersistenceOperationResultV1>;
  load(
    slot: "auto.current" | "auto.previous" | "quick" | "manual",
  ): Promise<PersistenceOperationResultV1>;
  clear(
    slot: "auto.current" | "auto.previous" | "quick" | "manual",
  ): Promise<PersistenceOperationResultV1>;
  exportSave(
    slot: "auto.current" | "auto.previous" | "quick" | "manual",
  ): Promise<SaveExportOperationResultV1>;
  exportCurrentSave(): Promise<ExportedSaveV1>;
  importSave(bytes: Uint8Array): Promise<PersistenceOperationResultV1>;
};

export type E2eGameApplicationPortV1 = GameApplicationPortV1<
  E2eSemanticGamePortV1,
  {
    createNewSession(): Promise<SessionAnchorResultV1>;
    restartSession(): Promise<SessionAnchorResultV1>;
  },
  E2ePersistencePortV1,
  { exportDebugBundle(): Promise<ExportedDebugBundleV1> },
  RuntimeCapabilityPortV1,
  E2eDebugToolsPortV1
>;

const noValidationCodesV1 = Object.freeze([]) as readonly string[];
const e2eFlowNodeReferencesV1 = Object.freeze(
  e2eStateContractManifestV1.stableReferenceSets.find(
    ({ setId }) => setId === "references.e2e.flow-node",
  )?.ids ?? [],
);

function validateE2eReferencesV1(state: DeepReadonly<E2eGameStateV1>): readonly string[] {
  const reference = `flow_node.e2e.${state.simulation.flow.nodeId}`;
  return e2eFlowNodeReferencesV1.includes(reference)
    ? noValidationCodesV1
    : Object.freeze(["reference.e2e.flow_node_unknown"]);
}

function validateE2eInvariantsV1(
  gameSimulation: E2eResolvedGameV1["gameSimulation"],
  terminalThreshold: E2eResolvedGameV1["simulationProgram"]["values"]["terminalThreshold"],
  state: DeepReadonly<E2eGameStateV1>,
): readonly string[] {
  const [counterModule, flowModule, runModule] = gameSimulation.modules;
  const counter = counterModule.stateSchema.parse(state.simulation.counter);
  const flow = flowModule.stateSchema.parse(state.simulation.flow);
  const run = runModule.stateSchema.parse(state.simulation.run);
  const counterPort = counterModule.createReadPort(counter);
  const flowPort = flowModule.createReadPort(flow);
  const runPort = runModule.createReadPort(run);
  const violations = [
    ...counterModule.localInvariants.flatMap((invariant) => invariant.check(counter, counterPort)),
    ...flowModule.localInvariants.flatMap((invariant) => invariant.check(flow, flowPort)),
    ...runModule.localInvariants.flatMap((invariant) => invariant.check(run, runPort)),
  ];
  if (
    runPort.status === "complete" &&
    (flowPort.status !== "resolved" ||
      flowPort.nodeId !== "done" ||
      counterPort.value < terminalThreshold)
  ) {
    violations.push(
      Object.freeze({ code: "run.terminal_state_invalid", details: Object.freeze({}) }),
    );
  }
  return violations.length === 0
    ? noValidationCodesV1
    : Object.freeze(violations.map(({ code }) => code));
}

type E2eToolingModuleV1 = {
  readonly e2eToolingEntryV1: typeof import("../tooling.js").e2eToolingEntryV1;
};

type E2eToolingLoaderV1 = (
  specifier: "@project-tavern/story-e2e/tooling",
) => Promise<E2eToolingModuleV1>;

export async function createE2eGameRuntimeV1(input: {
  readonly resolved: E2eResolvedGameV1;
  readonly host: GameHostV1;
  readonly appBuildId?: Digest;
  readonly readUiContext?: () => DeepReadonly<DebugUiContextV1> | undefined;
  readonly loadTooling?: E2eToolingLoaderV1;
  readonly sessionRequestedCapabilities?: readonly RuntimeCapabilityIdV1[];
  readonly rebootstrapDisposition?: DeepReadonly<PersistenceRebootstrapDisposalV1>;
  onCapabilitySession?(
    capabilitySession: RuntimeCapabilitySessionOverlayV1,
  ): void | PromiseLike<void>;
  onRebootstrapLifecycle?(
    lifecycle: WebRuntimeRebootstrapLifecycleV1<PersistenceRebootstrapDisposalV1>,
  ): void | PromiseLike<void>;
}): Promise<E2eGameApplicationPortV1> {
  const appBuildId = input.appBuildId === undefined ? undefined : parseDigest(input.appBuildId);
  return createGameRuntimeV1<
    E2eGameApplicationPortV1,
    PersistenceRebootstrapDisposalV1,
    DebugUiContextV1
  >({
    host: input.host,
    ...(input.sessionRequestedCapabilities === undefined
      ? {}
      : { sessionRequestedCapabilities: input.sessionRequestedCapabilities }),
    ...(input.readUiContext === undefined
      ? {}
      : {
          uiContextSchema: createDebugUiContextSchemaV1(),
          readUiContext: input.readUiContext,
        }),
    ...(input.onRebootstrapLifecycle === undefined
      ? {}
      : { onRebootstrapLifecycle: input.onRebootstrapLifecycle }),
    async createApplication({
      capabilities,
      capabilitySession,
      persistenceIdentity,
      runtimeFailures,
      uiContextSchema,
      readUiContext,
      reportObserverFailure,
      reportHmrInvalidated,
      registerRebootstrapLifecycle,
    }) {
      const gameSimulation = input.resolved.gameSimulation;
      let latestFailure: E2eDebugFailureV1 | undefined;
      let pendingGameCommandForFailure: DeepReadonly<E2eGameCommandV1> | undefined;
      const bootstrap = gameSimulation.createBootstrapInput(input.host.bootstrapEntropy);
      const created = createGameSessionV1<E2eGameSimulationTypesV1>({
        initialSnapshot: createE2eInitialSnapshotV1(gameSimulation, bootstrap),
        commandSchema: gameSimulation.commandSchema,
        executionContext: undefined,
        executeAttempt(snapshot, command) {
          pendingGameCommandForFailure = command;
          return gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined);
        },
        normalizeUnexpectedDispatchFault(_error, snapshot) {
          return createE2eUnexpectedFaultAttemptV1(snapshot);
        },
        debug: Object.freeze({
          validate(snapshot, command) {
            return gameSimulation.debugCommandExecutor.validate(snapshot, command, undefined);
          },
          executeAttempt(snapshot, command) {
            return gameSimulation.debugCommandExecutor.executeAttempt(snapshot, command, undefined);
          },
          normalizeUnexpectedFault(_error, snapshot) {
            return createE2eUnexpectedFaultAttemptV1(snapshot);
          },
        } satisfies GameSessionDebugInputV1<E2eGameSimulationTypesV1>),
        onAttempt(attempt) {
          const gameCommand = pendingGameCommandForFailure;
          pendingGameCommandForFailure = undefined;
          if (gameCommand === undefined || attempt.result.kind !== "faulted") return;
          latestFailure = Object.freeze({
            command: Object.freeze({ source: "game" as const, command: gameCommand }),
            fault: attempt.result.fault,
            attemptedDraws: attempt.diagnostics.attemptedDraws,
            ...(attempt.diagnostics.candidateRngAfter === undefined
              ? {}
              : { candidateRngAfter: attempt.diagnostics.candidateRngAfter }),
            candidateSnapshot: attempt.result.snapshot,
          });
        },
        onObserverFailure: reportObserverFailure,
        onHmrInvalidated: reportHmrInvalidated,
      });
      const semantic = createE2eSemanticGamePortV1({
        gameSimulation,
        session: created.session,
        runtimeControl: created.runtimeControl,
        reportSubscriberFailure: reportObserverFailure,
      });
      const persistenceService = await createPersistenceServiceV1({
        runtimeControl: created.runtimeControl,
        records: input.host.records,
        snapshotSchema: createGameSnapshotEnvelopeSchemaV1(
          gameSimulation.stateSchema,
          rngStateV1Schema,
        ),
        provenance: input.resolved.provenance,
        adoptionDeclaration: null,
        ownerId: persistenceIdentity.ownerId,
        nextHandoffRequestId: persistenceIdentity.nextHandoffRequestId,
        validateReferences: validateE2eReferencesV1,
        validateInvariants: ({ state }) =>
          validateE2eInvariantsV1(
            gameSimulation,
            input.resolved.simulationProgram.values.terminalThreshold,
            state,
          ),
        initialSimulationLineage: Object.freeze([]),
        metadataClock: input.host.metadataClock,
        exportFilename: "project-tavern-e2e-current.json",
        leaseAcquisition:
          input.rebootstrapDisposition === undefined ? "acquire_initial" : "deferred_rebootstrap",
      });
      registerRebootstrapLifecycle(
        Object.freeze({
          invalidationController: created.invalidationController,
          disposeForRebootstrap: () => persistenceService.disposeForRebootstrap(),
        }),
      );

      const lifecycleOperation = () =>
        created.runtimeControl.enqueueAuthoritative<SessionAnchorResultV1>(
          async () => {
            const nextBootstrap = gameSimulation.createBootstrapInput(input.host.bootstrapEntropy);
            const snapshot = createE2eInitialSnapshotV1(gameSimulation, nextBootstrap);
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
          () => Object.freeze({ kind: "faulted" as const, code: "runtime.anchor_failed" }),
          (snapshot) => persistenceService.establishAnchor(snapshot, Object.freeze([])),
          () => Object.freeze({ kind: "rejected" as const, code: "hmr_invalidated" }),
        );

      const debugBundleCodec = createE2eDebugBundleCodecV1(gameSimulation.stateSchema);
      const getDiagnosticSummary = (): E2eDiagnosticSummaryV1 => {
        const commandFaults = created.commandLog
          .entries()
          .flatMap(({ outcome }) => (outcome.kind === "faulted" ? [outcome.fault.code] : []));
        const recentErrorCodes: readonly E2eDiagnosticCodeV1[] = Object.freeze(
          [...commandFaults, ...runtimeFailures.entries().map(({ code }) => code)].slice(-50),
        );
        return Object.freeze({
          invariantCodes: Object.freeze([]),
          recentErrorCodes,
          hmrInvalidated: created.session.getStatus() === "hmr_invalidated",
        });
      };
      const diagnostics = createGameDiagnosticsServiceV1({
        codec: debugBundleCodec,
        provenance: input.resolved.provenance,
        ...(appBuildId === undefined ? {} : { appBuildId }),
        getCapabilities: () => capabilities.state.getCurrent(),
        getSimulationLineage: () => persistenceService.getSimulationLineage(),
        readAtQueueFront: (reader) => created.runtimeControl.readAtQueueFront(reader),
        getReplayEvidence: () =>
          Object.freeze({
            replayBase: created.commandLog.replayBase(),
            replayBaseStateDigest: created.commandLog.replayBaseStateDigest(),
            commandLog: created.commandLog.entries(),
          }),
        getDiagnostics: getDiagnosticSummary,
        getRuntimeFailures: () => runtimeFailures.entries(),
        getFailure: () => latestFailure,
        scrubFailure: (failure) => failure,
        ...(uiContextSchema === undefined || readUiContext === undefined
          ? {}
          : { uiContextSchema, readUiContext }),
        metadataClock: input.host.metadataClock,
        exportFilename: "project-tavern-e2e.debug-bundle.json",
      });

      const loadTooling: E2eToolingLoaderV1 =
        input.loadTooling ?? (async () => await import("@project-tavern/story-e2e/tooling"));
      let fixtureResolverPromise: Promise<E2eFixtureResolverV1> | undefined;
      const getFixtureResolver = (): Promise<E2eFixtureResolverV1> => {
        if (fixtureResolverPromise !== undefined) return fixtureResolverPromise;
        const attempt = Promise.resolve()
          .then(async () => await loadTooling("@project-tavern/story-e2e/tooling"))
          .then(({ e2eToolingEntryV1 }) => {
            const support = e2eToolingEntryV1.defineToolingSupport();
            return support.createFixtureResolver(gameSimulation, e2eToolingEntryV1);
          });
        fixtureResolverPromise = attempt;
        void attempt.catch(() => {
          if (fixtureResolverPromise === attempt) fixtureResolverPromise = undefined;
        });
        return attempt;
      };

      const publicUnexpectedFault = Object.freeze({ code: "e2e.runtime.unexpected" as const });
      const mapUnavailableDebugResult = (): E2eDebugCommandResultV1 =>
        Object.freeze({ kind: "faulted" as const, fault: publicUnexpectedFault });
      const mapUnavailableAnchorResult = (): E2eDebugAnchorResultV1 =>
        Object.freeze({ kind: "faulted" as const, fault: publicUnexpectedFault });
      const rememberDebugCommandFailure = (
        command: DeepReadonly<E2eDebugCommandV1>,
        attempt: DeepReadonly<E2eFinalizedAttemptV1>,
      ): void => {
        if (attempt.result.kind !== "faulted") return;
        latestFailure = Object.freeze({
          command: Object.freeze({ source: "debug" as const, command }),
          fault: attempt.result.fault,
          attemptedDraws: attempt.diagnostics.attemptedDraws,
          ...(attempt.diagnostics.candidateRngAfter === undefined
            ? {}
            : { candidateRngAfter: attempt.diagnostics.candidateRngAfter }),
          candidateSnapshot: attempt.result.snapshot,
        });
      };

      const replayDebugBundle = async (
        bytes: Uint8Array,
        mode: "authoritative" | "best_effort",
      ): Promise<E2eDebugReplayResultV1> => {
        const decoded = decodeDebugBundleV1(bytes, debugBundleCodec);
        if (decoded.kind === "rejected") return decoded;
        const replayInput = createE2eReplayInputV1(input.resolved, decoded.bundle, appBuildId);
        const comparison =
          mode === "authoritative"
            ? await replayAuthoritativelyV1(replayInput)
            : await inspectReplayBestEffortV1(replayInput);
        return Object.freeze({ kind: "replayed" as const, comparison });
      };

      const debugTools = createDebugToolsPortV1<
        E2eDebugCommandV1,
        E2eDebugCommandResultV1,
        E2eFixtureIdV1,
        E2eDebugAnchorResultV1,
        DebugBundleDecodeResultV1<E2eDebugBundleV1>,
        E2eDebugReplayResultV1,
        E2eDebugReplayResultV1,
        E2eDiagnosticQueryV1,
        E2eDiagnosticQueryResultV1
      >({
        capabilities: capabilities.state,
        debugCommandSchema: gameSimulation.debugCommandSchema,
        debugCommandSchemaFailure: () =>
          Object.freeze({
            kind: "validation_failed" as const,
            error: Object.freeze({ code: "debug.command_schema_invalid" as const }),
          }),
        async listFixtures() {
          return (await getFixtureResolver()).listFixtureIds();
        },
        async executeDebugCommand(command, isStillEnabled) {
          const result = await created.debugControl.execute(command, isStillEnabled);
          if (result.kind === "capability_disabled") return result;
          if (result.kind === "not_executed") return mapUnavailableDebugResult();
          if (result.kind === "validation_failed") {
            const error = result.errors[0];
            if (error === undefined || result.errors.length !== 1) {
              return mapUnavailableDebugResult();
            }
            return Object.freeze({ kind: "validation_failed" as const, error });
          }
          const attempt = result.attempt;
          if (attempt.result.kind === "committed") {
            return Object.freeze({
              kind: "committed" as const,
              commandSequence: parsePositiveSafeInteger(attempt.result.snapshot.commandSequence),
            });
          }
          if (attempt.result.kind === "faulted") {
            rememberDebugCommandFailure(command, attempt);
            return Object.freeze({ kind: "faulted" as const, fault: attempt.result.fault });
          }
          return mapUnavailableDebugResult();
        },
        async anchorFixture(fixtureId, isStillEnabled) {
          let resolver: E2eFixtureResolverV1 | undefined;
          let toolingLoadFailed = false;
          try {
            resolver = await getFixtureResolver();
          } catch {
            toolingLoadFailed = true;
          }
          const anchored = await created.debugControl.anchorReplacement<E2eDebugAnchorResultV1>(
            Object.freeze({ kind: "fixture" as const, fixtureId }),
            async () => {
              if (toolingLoadFailed || resolver === undefined) {
                throw new TypeError("E2E tooling resolution failed");
              }
              const resolution = await resolver.resolveFixture(fixtureId);
              if (resolution.kind === "unknown_reference") {
                return Object.freeze({
                  kind: "preserve" as const,
                  result: Object.freeze({
                    kind: "validation_failed" as const,
                    error: Object.freeze({
                      code: "debug.unknown_reference" as const,
                      commandKind: "debug.fixture.load" as const,
                      reference: Object.freeze({
                        kind: "fixture" as const,
                        fixtureId: resolution.fixtureId,
                      }),
                    }),
                  }),
                });
              }
              if (
                validateE2eReferencesV1(resolution.snapshot.state).length !== 0 ||
                validateE2eInvariantsV1(
                  gameSimulation,
                  input.resolved.simulationProgram.values.terminalThreshold,
                  resolution.snapshot.state,
                ).length !== 0
              ) {
                throw new TypeError("E2E fixture Snapshot failed full validation");
              }
              return Object.freeze({
                kind: "replace" as const,
                snapshot: resolution.snapshot as E2eGameSnapshotV1,
                result: Object.freeze({
                  kind: "anchor_established" as const,
                  commandSequence: resolution.snapshot.commandSequence,
                }),
              });
            },
            isStillEnabled,
            () => {
              latestFailure = Object.freeze({
                command: Object.freeze({
                  source: "debug_anchor" as const,
                  command: Object.freeze({ kind: "debug.fixture.load" as const, fixtureId }),
                }),
                fault: publicUnexpectedFault,
                attemptedDraws: Object.freeze([]),
              });
              return Object.freeze({ kind: "faulted" as const, fault: publicUnexpectedFault });
            },
            (snapshot) => persistenceService.establishAnchor(snapshot, Object.freeze([])),
          );
          return anchored.kind === "not_executed" ? mapUnavailableAnchorResult() : anchored;
        },
        inspectDebugBundle(bytes) {
          return decodeDebugBundleV1(bytes, debugBundleCodec);
        },
        async anchorDebugBundle(bytes, isStillEnabled) {
          let adoptedLineage: readonly DeepReadonly<SimulationAdoptionV1>[] | undefined;
          const anchored = await created.debugControl.anchorReplacement<E2eDebugAnchorResultV1>(
            Object.freeze({ kind: "debug_bundle" as const }),
            async () => {
              const decoded = decodeDebugBundleV1(bytes, debugBundleCodec);
              if (decoded.kind === "rejected") {
                return Object.freeze({
                  kind: "preserve" as const,
                  result: Object.freeze({
                    kind: "validation_failed" as const,
                    error: Object.freeze({
                      code: "debug.bundle_invalid" as const,
                      rejection: decoded.code,
                    }),
                  }),
                });
              }
              const comparison = await replayAuthoritativelyV1(
                createE2eReplayInputV1(input.resolved, decoded.bundle, appBuildId),
              );
              if (!comparison.authoritative || !comparison.identityMatch || !comparison.matches) {
                return Object.freeze({
                  kind: "preserve" as const,
                  result: Object.freeze({
                    kind: "validation_failed" as const,
                    error: Object.freeze({ code: "debug.bundle_replay_mismatch" as const }),
                  }),
                });
              }
              adoptedLineage = decoded.bundle.simulationLineage;
              return Object.freeze({
                kind: "replace" as const,
                snapshot: decoded.bundle.currentSnapshot as E2eGameSnapshotV1,
                result: Object.freeze({
                  kind: "anchor_established" as const,
                  commandSequence: decoded.bundle.currentSnapshot.commandSequence,
                }),
              });
            },
            isStillEnabled,
            () => Object.freeze({ kind: "faulted" as const, fault: publicUnexpectedFault }),
            (snapshot) => {
              if (adoptedLineage === undefined) {
                throw new TypeError("missing adopted Debug Bundle lineage");
              }
              persistenceService.establishAnchor(snapshot, adoptedLineage);
            },
          );
          return anchored.kind === "not_executed" ? mapUnavailableAnchorResult() : anchored;
        },
        replayAuthoritatively(bytes) {
          return replayDebugBundle(bytes, "authoritative");
        },
        inspectReplayBestEffort(bytes) {
          return replayDebugBundle(bytes, "best_effort");
        },
        async queryDiagnostics(query) {
          try {
            const fields = requireExactObjectV1(query, ["kind"], "E2E diagnostic query");
            if (fields.kind !== "summary") throw new TypeError("invalid E2E diagnostic query");
          } catch {
            return Object.freeze({
              kind: "validation_failed" as const,
              code: "debug.diagnostics_query_invalid" as const,
            });
          }
          return await created.runtimeControl.readAtQueueFront(() =>
            Object.freeze({
              kind: "summary" as const,
              diagnostics: getDiagnosticSummary(),
              commandLogEntryCount: parseNonNegativeSafeInteger(
                created.commandLog.entries().length,
              ),
            }),
          );
        },
      });
      const application = createGameApplicationV1({
        semantic,
        lifecycle: Object.freeze({
          createNewSession: lifecycleOperation,
          restartSession: lifecycleOperation,
        }),
        persistence: persistenceService.port,
        diagnostics,
        capabilities,
        debugTools,
      });
      if (input.rebootstrapDisposition !== undefined) {
        await persistenceService.takeOverForRebootstrap(input.rebootstrapDisposition);
      }
      await input.onCapabilitySession?.(capabilitySession);
      return application;
    },
  });
}
