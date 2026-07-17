// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createDebugUiContextSchemaV1,
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
  createTransactionalRngV1,
  parseDigest,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  rngStateV1Schema,
} from "@sillymaker/base";
import type {
  DeepReadonly,
  DebugUiContextV1,
  Digest,
  GameHostV1,
  SessionAnchorResultV1,
  SimulationAdoptionV1,
  RuntimeCapabilityIdV1,
} from "@sillymaker/base";
import {
  createDebugToolsPortV1,
  createGameDiagnosticsServiceV1,
  createGameSessionV1,
  createPersistenceServiceV1,
  decodeDebugBundleV1,
  inspectReplayBestEffortV1,
  replayAuthoritativelyV1,
} from "@sillymaker/base/runtime";
import type {
  DebugBundleDecodeResultV1,
  GameSessionDebugInputV1,
  PersistenceRebootstrapDisposalV1,
} from "@sillymaker/base/runtime";
import { createGameRuntimeV1 } from "@sillymaker/web";
import type {
  RuntimeCapabilitySessionOverlayV1,
  WebRuntimeRebootstrapLifecycleV1,
} from "@sillymaker/web";

import { pocStoryIdentityV1 } from "../content/identity.js";
import type {
  EngineInvariantCodeV1,
  PocDebugCommandV1,
  PocGameCommandV1,
  PocGameSimulationTypesV1,
  PocGameSnapshotV1,
  PocGameStateV1,
} from "../gameplay/index.js";
import {
  createPocDebugBundleCodecV1,
  createPocReplayInputV1,
  createPocUnexpectedFaultAttemptV1,
  createPocUnexpectedFaultV1,
  replayPocToolingFixtureV1,
  scrubPocDebugFailureV1,
  type PocDebugAnchorResultV1,
  type PocDebugBundleV1,
  type PocDebugCommandResultV1,
  type PocDebugFailureV1,
  type PocFinalizedAttemptV1,
  type PocDebugReplayResultV1,
  type PocDebugToolsPortV1,
  type PocDiagnosticQueryResultV1,
  type PocDiagnosticQueryV1,
  type PocDiagnosticSummaryV1,
} from "../runtime/poc-debug-bundle.js";
import {
  validatePocStateInvariantsV1,
  validatePocStateReferencesV1,
} from "../runtime/poc-state-validation.js";
import type { PocResolvedGameV1 } from "../story-definition.js";
import type { PocStoryToolingFixtureV1 } from "../tooling-fixtures.js";
import {
  createPocGameApplicationV1,
  type PocGameApplicationPortV1,
} from "./create-poc-game-application.js";
import { createPocSemanticGamePortV1 } from "./create-poc-semantic-port.js";

const pocToolingSpecifierV1 = "@project-tavern/story-poc/tooling" as const;
const emptySimulationLineageV1 = Object.freeze([]) as readonly SimulationAdoptionV1[];

function diagnosticInvariantCodeV1(value: string): EngineInvariantCodeV1 {
  if (value.startsWith("reference.unknown:")) return "story.reference_missing";
  const code = value.slice(value.lastIndexOf(":") + 1);
  switch (code) {
    case "snapshot.schema":
    case "rng.invalid":
    case "resource.negative":
    case "stamina.above_maximum":
    case "calendar.invalid":
    case "workflow.conflict":
    case "scheduler.multiple_blocking_events":
    case "narrative.blocking_conflict":
    case "opening.invalid_checkpoint":
    case "narrative.invalid_cursor":
    case "story.reference_missing":
    case "story.value_invalid":
    case "collection.duplicate_id":
    case "collection.unstable_order":
    case "ledger.unbalanced":
    case "terminal_state.invalid":
      return code;
    default:
      return "story.value_invalid";
  }
}

type PocToolingModuleV1 = {
  readonly pocStoryToolingEntryV1: typeof import("../tooling/index.js").pocStoryToolingEntryV1;
};

type PocToolingSupportV1 = ReturnType<
  PocToolingModuleV1["pocStoryToolingEntryV1"]["defineToolingSupport"]
>;

export type PocToolingLoaderV1 = (
  specifier: typeof pocToolingSpecifierV1,
) => Promise<PocToolingModuleV1>;

function createInitialSnapshotV1(resolved: PocResolvedGameV1, host: GameHostV1): PocGameSnapshotV1 {
  const gameSimulation = resolved.gameSimulation;
  const bootstrap = gameSimulation.createBootstrapInput(host.bootstrapEntropy);
  return createGameSnapshotEnvelopeSchemaV1(gameSimulation.stateSchema, rngStateV1Schema).parse({
    state: gameSimulation.createInitialState(bootstrap),
    rng: createTransactionalRngV1(bootstrap.rngSeed).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  });
}

function debugFailureV1(
  input:
    | {
        readonly source: "game";
        readonly command: DeepReadonly<PocGameCommandV1>;
        readonly attempt: DeepReadonly<PocFinalizedAttemptV1>;
      }
    | {
        readonly source: "debug";
        readonly command: DeepReadonly<PocDebugCommandV1>;
        readonly attempt: DeepReadonly<PocFinalizedAttemptV1>;
      },
): PocDebugFailureV1 {
  if (input.attempt.result.kind !== "faulted") {
    throw new TypeError("cannot record a non-faulted PoC attempt as failure evidence");
  }
  const command =
    input.source === "game"
      ? Object.freeze({ source: "game" as const, command: input.command })
      : Object.freeze({ source: "debug" as const, command: input.command });
  return Object.freeze({
    command,
    fault: input.attempt.result.fault,
    attemptedDraws: input.attempt.diagnostics.attemptedDraws,
    ...(input.attempt.diagnostics.candidateRngAfter === undefined
      ? {}
      : { candidateRngAfter: input.attempt.diagnostics.candidateRngAfter }),
    candidateSnapshot: input.attempt.result.snapshot,
  }) as PocDebugFailureV1;
}

function isSummaryQueryV1(value: unknown): value is PocDiagnosticQueryV1 {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Reflect.ownKeys(value).length === 1 &&
    Object.hasOwn(value, "kind") &&
    (value as { readonly kind?: unknown }).kind === "summary"
  );
}

export async function createPocGameRuntimeV1(input: {
  readonly resolved: PocResolvedGameV1;
  readonly host: GameHostV1;
  readonly appBuildId: Digest;
  readonly readUiContext?: () => DeepReadonly<DebugUiContextV1> | undefined;
  readonly loadTooling?: PocToolingLoaderV1;
  readonly sessionRequestedCapabilities?: readonly RuntimeCapabilityIdV1[];
  readonly rebootstrapDisposition?: DeepReadonly<PersistenceRebootstrapDisposalV1>;
  onCapabilitySession?(session: RuntimeCapabilitySessionOverlayV1): void;
  onRebootstrapLifecycle?(
    lifecycle: WebRuntimeRebootstrapLifecycleV1<PersistenceRebootstrapDisposalV1>,
  ): void | PromiseLike<void>;
}): Promise<PocGameApplicationPortV1> {
  const appBuildId = parseDigest(input.appBuildId);
  const uiContextSchema =
    input.readUiContext === undefined ? undefined : createDebugUiContextSchemaV1();
  return await createGameRuntimeV1<
    PocGameApplicationPortV1,
    PersistenceRebootstrapDisposalV1,
    DebugUiContextV1
  >({
    host: input.host,
    ...(input.sessionRequestedCapabilities === undefined
      ? {}
      : { sessionRequestedCapabilities: input.sessionRequestedCapabilities }),
    ...(uiContextSchema === undefined || input.readUiContext === undefined
      ? {}
      : { uiContextSchema, readUiContext: input.readUiContext }),
    ...(input.onRebootstrapLifecycle === undefined
      ? {}
      : { onRebootstrapLifecycle: input.onRebootstrapLifecycle }),
    async createApplication({
      capabilities,
      capabilitySession,
      persistenceIdentity,
      runtimeFailures,
      reportObserverFailure,
      reportHmrInvalidated,
      registerRebootstrapLifecycle,
      uiContextSchema: runtimeUiContextSchema,
      readUiContext,
    }) {
      const gameSimulation = input.resolved.gameSimulation;
      const snapshotSchema = createGameSnapshotEnvelopeSchemaV1(
        gameSimulation.stateSchema,
        rngStateV1Schema,
      );
      let latestFailure: PocDebugFailureV1 | undefined;
      let pendingGameCommand: DeepReadonly<PocGameCommandV1> | undefined;
      const created = createGameSessionV1<PocGameSimulationTypesV1>({
        initialSnapshot: createInitialSnapshotV1(input.resolved, input.host),
        commandSchema: gameSimulation.commandSchema,
        executionContext: undefined,
        executeAttempt(snapshot, command) {
          pendingGameCommand = command;
          return gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined);
        },
        normalizeUnexpectedDispatchFault: createPocUnexpectedFaultAttemptV1,
        debug: Object.freeze({
          validate(snapshot, command) {
            return gameSimulation.debugCommandExecutor.validate(snapshot, command, undefined);
          },
          executeAttempt(snapshot, command) {
            return gameSimulation.debugCommandExecutor.executeAttempt(snapshot, command, undefined);
          },
          normalizeUnexpectedFault: createPocUnexpectedFaultAttemptV1,
        } satisfies GameSessionDebugInputV1<PocGameSimulationTypesV1>),
        onAttempt(attempt) {
          const command = pendingGameCommand;
          pendingGameCommand = undefined;
          if (command === undefined || attempt.result.kind !== "faulted") return;
          latestFailure = debugFailureV1({ source: "game", command, attempt });
        },
        onObserverFailure: reportObserverFailure,
        onHmrInvalidated: reportHmrInvalidated,
      });
      const semantic = createPocSemanticGamePortV1({
        gameSimulation,
        session: created.session,
        runtimeControl: created.runtimeControl,
        reportSubscriberFailure: reportObserverFailure,
      });
      const persistenceService = await createPersistenceServiceV1<
        PocGameStateV1,
        PocGameSnapshotV1
      >({
        runtimeControl: created.runtimeControl,
        records: input.host.records,
        snapshotSchema,
        provenance: input.resolved.provenance,
        adoptionDeclaration: null,
        ownerId: persistenceIdentity.ownerId,
        nextHandoffRequestId: persistenceIdentity.nextHandoffRequestId,
        validateReferences: (state) => validatePocStateReferencesV1(input.resolved, state),
        validateInvariants: (view) => validatePocStateInvariantsV1(input.resolved, view),
        initialSimulationLineage: emptySimulationLineageV1,
        metadataClock: input.host.metadataClock,
        exportFilename: "project-tavern-poc-current.json",
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
            const snapshot = createInitialSnapshotV1(input.resolved, input.host);
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

      const getDiagnosticSummaryV1 = (): PocDiagnosticSummaryV1 => {
        const snapshot = created.session.getCurrentSnapshot();
        const invariantCodes = Object.freeze(
          [
            ...validatePocStateReferencesV1(input.resolved, snapshot.state),
            ...validatePocStateInvariantsV1(input.resolved, {
              state: snapshot.state,
              commandSequence: snapshot.commandSequence,
            }),
          ].map(diagnosticInvariantCodeV1),
        );
        const commandFaultCodes = created.commandLog
          .entries()
          .flatMap(({ outcome }) => (outcome.kind === "faulted" ? [outcome.fault.code] : []));
        return Object.freeze({
          invariantCodes,
          recentErrorCodes: Object.freeze(
            [...commandFaultCodes, ...runtimeFailures.entries().map(({ code }) => code)].slice(-50),
          ),
          hmrInvalidated: created.session.getStatus() === "hmr_invalidated",
        });
      };

      const debugBundleCodec = createPocDebugBundleCodecV1();
      const diagnostics = createGameDiagnosticsServiceV1({
        codec: debugBundleCodec,
        provenance: input.resolved.provenance,
        appBuildId,
        getCapabilities: () => capabilities.state.getCurrent(),
        getSimulationLineage: () => persistenceService.getSimulationLineage(),
        readAtQueueFront: (reader) => created.runtimeControl.readAtQueueFront(reader),
        getReplayEvidence: () =>
          Object.freeze({
            replayBase: created.commandLog.replayBase(),
            replayBaseStateDigest: created.commandLog.replayBaseStateDigest(),
            commandLog: created.commandLog.entries(),
          }),
        getDiagnostics: getDiagnosticSummaryV1,
        getRuntimeFailures: () => runtimeFailures.entries(),
        getFailure: () => latestFailure,
        scrubFailure: scrubPocDebugFailureV1,
        ...(runtimeUiContextSchema === undefined || readUiContext === undefined
          ? {}
          : { uiContextSchema: runtimeUiContextSchema, readUiContext }),
        metadataClock: input.host.metadataClock,
        exportFilename: "project-tavern-poc.debug-bundle.json",
      });

      const loadTooling: PocToolingLoaderV1 =
        input.loadTooling ??
        (async () => (await import("@project-tavern/story-poc/tooling")) as PocToolingModuleV1);
      let cachedToolingSupport: PocToolingSupportV1 | undefined;
      let toolingAttempt: Promise<PocToolingSupportV1> | undefined;
      const toolingSupportV1 = async (): Promise<PocToolingSupportV1> => {
        if (cachedToolingSupport !== undefined) return cachedToolingSupport;
        if (toolingAttempt !== undefined) return await toolingAttempt;
        const attempt = (async () => {
          const module = await loadTooling(pocToolingSpecifierV1);
          if (
            module.pocStoryToolingEntryV1.storyIdentity.id !== pocStoryIdentityV1.id ||
            module.pocStoryToolingEntryV1.storyIdentity.revision !== pocStoryIdentityV1.revision
          ) {
            throw new TypeError("PoC tooling Story identity mismatch");
          }
          const support = module.pocStoryToolingEntryV1.defineToolingSupport();
          cachedToolingSupport = support;
          return support;
        })();
        toolingAttempt = attempt;
        try {
          return await attempt;
        } finally {
          if (toolingAttempt === attempt) toolingAttempt = undefined;
        }
      };

      const publicUnexpectedFault = createPocUnexpectedFaultV1(
        new TypeError("PoC runtime operation unavailable"),
      );
      const unavailableDebugResultV1 = (): PocDebugCommandResultV1 =>
        Object.freeze({ kind: "faulted" as const, fault: publicUnexpectedFault });
      const unavailableAnchorResultV1 = (): PocDebugAnchorResultV1 =>
        Object.freeze({ kind: "faulted" as const, fault: publicUnexpectedFault });
      const rememberDebugFailureV1 = (
        command: DeepReadonly<PocDebugCommandV1>,
        attempt: Parameters<typeof debugFailureV1>[0]["attempt"],
      ): void => {
        latestFailure = debugFailureV1({ source: "debug", command, attempt });
      };

      const replayBundleV1 = async (
        bytes: Uint8Array,
        mode: "authoritative" | "best_effort",
      ): Promise<PocDebugReplayResultV1> => {
        const decoded = decodeDebugBundleV1(bytes, debugBundleCodec);
        if (decoded.kind === "rejected") return decoded;
        const replayInput = createPocReplayInputV1(input.resolved, decoded.bundle, appBuildId);
        const comparison =
          mode === "authoritative"
            ? await replayAuthoritativelyV1(replayInput)
            : await inspectReplayBestEffortV1(replayInput);
        return Object.freeze({ kind: "replayed" as const, comparison });
      };

      const debugTools: PocDebugToolsPortV1 = createDebugToolsPortV1<
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
        debugCommandSchema: gameSimulation.debugCommandSchema,
        debugCommandSchemaFailure: () =>
          Object.freeze({
            kind: "validation_failed" as const,
            error: Object.freeze({ code: "debug.command_schema_invalid" as const }),
          }),
        async listFixtures() {
          return Object.freeze(
            (await toolingSupportV1()).fixtures.map(({ fixtureId }) => fixtureId),
          );
        },
        async executeDebugCommand(command, isStillEnabled) {
          const result = await created.debugControl.execute(command, isStillEnabled);
          if (result.kind === "capability_disabled") return result;
          if (result.kind === "not_executed") return unavailableDebugResultV1();
          if (result.kind === "validation_failed") {
            const error = result.errors[0];
            return error === undefined || result.errors.length !== 1
              ? unavailableDebugResultV1()
              : Object.freeze({ kind: "validation_failed" as const, error });
          }
          const attempt = result.attempt;
          if (attempt.result.kind === "committed") {
            return Object.freeze({
              kind: "committed" as const,
              commandSequence: parsePositiveSafeInteger(attempt.result.snapshot.commandSequence),
            });
          }
          if (attempt.result.kind === "faulted") {
            rememberDebugFailureV1(command, attempt);
            return Object.freeze({ kind: "faulted" as const, fault: attempt.result.fault });
          }
          return unavailableDebugResultV1();
        },
        async anchorFixture(fixtureId, isStillEnabled) {
          let resolvedFixtureForFailure: DeepReadonly<PocStoryToolingFixtureV1> | undefined;
          const anchored = await created.debugControl.anchorReplacement<PocDebugAnchorResultV1>(
            Object.freeze({ kind: "fixture" as const, fixtureId }),
            async () => {
              const fixture = (await toolingSupportV1()).fixtures.find(
                (candidate) => candidate.fixtureId === fixtureId,
              );
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
              resolvedFixtureForFailure = fixture;
              const snapshot = await replayPocToolingFixtureV1(
                input.resolved,
                fixture as DeepReadonly<PocStoryToolingFixtureV1>,
              );
              if (
                validatePocStateReferencesV1(input.resolved, snapshot.state).length !== 0 ||
                validatePocStateInvariantsV1(input.resolved, snapshot).length !== 0
              ) {
                throw new TypeError("PoC fixture Snapshot failed full validation");
              }
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
            (error) => {
              const fault = createPocUnexpectedFaultV1(error);
              const fixture = resolvedFixtureForFailure;
              if (fixture !== undefined) {
                latestFailure = Object.freeze({
                  command: Object.freeze({
                    source: "debug_anchor" as const,
                    command: Object.freeze({
                      kind: "debug.fixture.load" as const,
                      fixtureId: fixture.fixtureId,
                      seed: fixture.seed,
                    }),
                  }),
                  fault,
                  attemptedDraws: Object.freeze([]),
                });
              }
              return Object.freeze({ kind: "faulted" as const, fault });
            },
            (snapshot) => persistenceService.establishAnchor(snapshot, emptySimulationLineageV1),
          );
          return anchored.kind === "not_executed" ? unavailableAnchorResultV1() : anchored;
        },
        inspectDebugBundle(bytes) {
          return decodeDebugBundleV1(bytes, debugBundleCodec);
        },
        async anchorDebugBundle(bytes, isStillEnabled) {
          let adoptedLineage: readonly DeepReadonly<SimulationAdoptionV1>[] | undefined;
          const anchored = await created.debugControl.anchorReplacement<PocDebugAnchorResultV1>(
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
                createPocReplayInputV1(input.resolved, decoded.bundle, appBuildId),
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
              const snapshot = snapshotSchema.parse(decoded.bundle.currentSnapshot);
              if (
                validatePocStateReferencesV1(input.resolved, snapshot.state).length !== 0 ||
                validatePocStateInvariantsV1(input.resolved, snapshot).length !== 0
              ) {
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
                snapshot,
                result: Object.freeze({
                  kind: "anchor_established" as const,
                  commandSequence: snapshot.commandSequence,
                }),
              });
            },
            isStillEnabled,
            () => unavailableAnchorResultV1(),
            (snapshot) => {
              if (adoptedLineage === undefined) {
                throw new TypeError("missing adopted PoC Debug Bundle lineage");
              }
              persistenceService.establishAnchor(snapshot, adoptedLineage);
            },
          );
          return anchored.kind === "not_executed" ? unavailableAnchorResultV1() : anchored;
        },
        replayAuthoritatively: (bytes) => replayBundleV1(bytes, "authoritative"),
        inspectReplayBestEffort: (bytes) => replayBundleV1(bytes, "best_effort"),
        async queryDiagnostics(query) {
          if (!isSummaryQueryV1(query)) {
            return Object.freeze({ kind: "validation_failed" as const });
          }
          return await created.runtimeControl.readAtQueueFront(() =>
            Object.freeze({
              kind: "summary" as const,
              diagnostics: getDiagnosticSummaryV1(),
              commandLogEntryCount: parseNonNegativeSafeInteger(
                created.commandLog.entries().length,
              ),
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
        persistence: persistenceService.port,
        diagnostics,
        capabilities,
        debugTools,
      });
      if (input.rebootstrapDisposition !== undefined) {
        await persistenceService.takeOverForRebootstrap(input.rebootstrapDisposition);
      }
      input.onCapabilitySession?.(capabilitySession);
      return application;
    },
  });
}
