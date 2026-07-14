// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createGameSnapshotEnvelopeSchemaV1,
  createTransactionalRngV1,
  parseNonNegativeSafeInteger,
  rngStateV1Schema,
} from "@sillymaker/base";
import type {
  DebugToolsPortV1,
  DeepReadonly,
  ExportedSaveV1,
  GameApplicationPortV1,
  GameHostV1,
  LeaseHandoffRequestId,
  PersistenceOperationResultV1,
  PersistenceStatusV1,
  RuntimeCapabilityPortV1,
  SaveExportOperationResultV1,
  SaveSlotSummaryV1,
  SessionAnchorResultV1,
  SessionLeaseOperationResultV1,
  SessionLeaseStatusV1,
} from "@sillymaker/base";
import {
  createCapabilityDisabledDebugToolsPortV1,
  createGameApplicationV1,
  createGameSessionV1,
  createPersistenceServiceV1,
} from "@sillymaker/base/runtime";
import { createGameRuntimeV1 } from "@sillymaker/web";

import type {
  E2eDebugCommandV1,
  E2eGameStateV1,
  E2eGameSimulationTypesV1,
  E2eGameSnapshotV1,
} from "../gameplay/contracts/index.js";
import { e2eStateContractManifestV1 } from "../story-definition.js";
import { createE2eSemanticGamePortV1 } from "../runtime/e2e-semantic-game-port.js";
import type { E2eSemanticGamePortV1 } from "../runtime/e2e-semantic-game-port.js";
import { createE2eInitialSnapshotV1 } from "../session.js";
import type { E2eResolvedGameV1 } from "../story-entry.js";

export type E2eDisabledDebugToolsPortV1 = DebugToolsPortV1<
  E2eDebugCommandV1,
  never,
  string,
  never,
  never,
  never,
  never,
  never,
  never
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
  { exportDebugBundle(): Promise<{ readonly kind: "unavailable"; readonly code: string }> },
  RuntimeCapabilityPortV1,
  E2eDisabledDebugToolsPortV1
>;

function createE2eUnexpectedFaultAttemptV1(snapshot: DeepReadonly<E2eGameSnapshotV1>) {
  const rng = createTransactionalRngV1(snapshot.rng);
  return Object.freeze({
    result: Object.freeze({
      kind: "faulted" as const,
      snapshot,
      fault: Object.freeze({ code: "e2e.runtime.unexpected" as const }),
    }),
    diagnostics: Object.freeze({
      committedRngBefore: snapshot.rng,
      attemptedDraws: rng.attemptedDraws(),
      candidateRngAfter: rng.candidateState(),
      committedRngAfter: snapshot.rng,
    }),
  });
}

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

export async function createE2eGameRuntimeV1(input: {
  readonly resolved: E2eResolvedGameV1;
  readonly host: GameHostV1;
}): Promise<E2eGameApplicationPortV1> {
  return createGameRuntimeV1({
    host: input.host,
    async createApplication({ capabilities, persistenceIdentity }) {
      const gameSimulation = input.resolved.gameSimulation;
      const bootstrap = gameSimulation.createBootstrapInput(input.host.bootstrapEntropy);
      const reportRuntimeFailure = (_error: unknown): void => {
        // Phase 3 installs the bounded runtime-failure collector at this shared seam.
      };
      const created = createGameSessionV1<E2eGameSimulationTypesV1>({
        initialSnapshot: createE2eInitialSnapshotV1(gameSimulation, bootstrap),
        commandSchema: gameSimulation.commandSchema,
        executionContext: undefined,
        executeAttempt(snapshot, command) {
          return gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined);
        },
        normalizeUnexpectedDispatchFault(_error, snapshot) {
          return createE2eUnexpectedFaultAttemptV1(snapshot);
        },
        onObserverFailure: reportRuntimeFailure,
      });
      const semantic = createE2eSemanticGamePortV1({
        gameSimulation,
        session: created.session,
        runtimeControl: created.runtimeControl,
        reportSubscriberFailure: reportRuntimeFailure,
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
        validateInvariants: (state) =>
          validateE2eInvariantsV1(
            gameSimulation,
            input.resolved.simulationProgram.values.terminalThreshold,
            state,
          ),
        initialSimulationLineage: Object.freeze([]),
        metadataClock: input.host.metadataClock,
        exportFilename: "project-tavern-e2e-current.json",
      });

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
        );

      const debugTools = createCapabilityDisabledDebugToolsPortV1<
        E2eDebugCommandV1,
        never,
        string,
        never,
        never,
        never,
        never,
        never,
        never
      >();
      return createGameApplicationV1({
        semantic,
        lifecycle: Object.freeze({
          createNewSession: lifecycleOperation,
          restartSession: lifecycleOperation,
        }),
        persistence: persistenceService.port,
        diagnostics: Object.freeze({
          exportDebugBundle: async () =>
            Object.freeze({ kind: "unavailable" as const, code: "diagnostics.unavailable" }),
        }),
        capabilities,
        debugTools,
      });
    },
  });
}
