// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  canonicalJsonBytes,
  createTransactionalRngV1,
  digestBytes,
  digestCanonical,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "@sillymaker/base";
import type {
  DeepReadonly,
  ExportedSaveV1,
  GameApplicationPortV1,
  GameHostV1,
  PersistenceOperationResultV1,
  PersistenceStatusV1,
  SaveExportOperationResultV1,
  SaveSlotSummaryV1,
  SessionAnchorResultV1,
  SessionLeaseOperationResultV1,
  SessionLeaseStatusV1,
} from "@sillymaker/base";
import { createGameSessionV1 } from "@sillymaker/base/runtime";

import type { E2eGameSimulationTypesV1, E2eGameSnapshotV1 } from "../gameplay/contracts/index.js";
import { createE2eSemanticGamePortV1 } from "../runtime/e2e-semantic-game-port.js";
import type { E2eSemanticGamePortV1 } from "../runtime/e2e-semantic-game-port.js";
import { createE2eInitialSnapshotV1 } from "../session.js";
import type { E2eResolvedGameV1 } from "../story-entry.js";

export interface E2eUnavailableCapabilitiesPortV1 {
  readonly kind: "unavailable";
}

export interface E2eUnavailableDebugToolsPortV1 {
  readonly kind: "unavailable";
  readonly code: "phase3_not_installed";
}

type E2ePersistencePortV1 = {
  readonly lease: {
    getStatus(): Promise<SessionLeaseStatusV1>;
    requestHandoff(): Promise<SessionLeaseOperationResultV1>;
    approveHandoff(requestId: never): Promise<SessionLeaseOperationResultV1>;
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
  E2eUnavailableCapabilitiesPortV1,
  E2eUnavailableDebugToolsPortV1
>;

const unavailableCapabilities: E2eUnavailableCapabilitiesPortV1 = Object.freeze({
  kind: "unavailable",
});
const unavailableDebugTools: E2eUnavailableDebugToolsPortV1 = Object.freeze({
  kind: "unavailable",
  code: "phase3_not_installed",
});

const unavailablePersistence = (): PersistenceOperationResultV1 =>
  Object.freeze({ kind: "rejected", code: "unavailable" });
const unavailableLease = (): SessionLeaseOperationResultV1 =>
  Object.freeze({ kind: "rejected", code: "unavailable" });

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

export function createE2eGameRuntimeV1(input: {
  readonly resolved: E2eResolvedGameV1;
  readonly host: GameHostV1;
}): E2eGameApplicationPortV1 {
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
    );

  const exportCurrentSave = () =>
    created.runtimeControl.enqueueAuthoritative(
      async (snapshot) => {
        const savedAt = input.host.metadataClock.now();
        const record = Object.freeze({
          formatRevision: 1 as const,
          recordRevision: parsePositiveSafeInteger(1),
          provenance: input.resolved.provenance,
          slot: Object.freeze({
            storyId: input.resolved.provenance.story.id,
            slotId: "manual" as const,
            writeReason: "manual" as const,
            capturedCommandSequence: snapshot.commandSequence,
          }),
          savedAt,
          stateDigest: digestCanonical("sillymaker:state:v1", snapshot),
          snapshot,
          simulationLineage: Object.freeze([]),
        });
        const bytes = canonicalJsonBytes(record);
        const file: ExportedSaveV1 = Object.freeze({
          filename: "project-tavern-e2e-current.json",
          mediaType: "application/json",
          digest: digestBytes(bytes),
          bytes,
        });
        return Object.freeze({ kind: "preserve" as const, result: file });
      },
      () => {
        const bytes = canonicalJsonBytes({ kind: "faulted" });
        return Object.freeze({
          filename: "project-tavern-e2e-current.json",
          mediaType: "application/json" as const,
          digest: digestBytes(bytes),
          bytes,
        });
      },
    );

  const leaseStatus: SessionLeaseStatusV1 = Object.freeze({
    kind: "unavailable",
    ownerId: null,
    fencingToken: null,
    code: "persistence.unavailable",
  });
  const persistence: E2ePersistencePortV1 = Object.freeze({
    lease: Object.freeze({
      getStatus: async () => leaseStatus,
      requestHandoff: async () => unavailableLease(),
      approveHandoff: async () => unavailableLease(),
      takeOver: async () => unavailableLease(),
      release: async () => unavailableLease(),
    }),
    listSlots: async () => Object.freeze([]),
    getStatus: async () =>
      Object.freeze({
        available: false,
        busy: false,
        safelySavedCommandSequence: null,
        lastFailureCode: "persistence.unavailable",
      }),
    save: async () => unavailablePersistence(),
    load: async () => unavailablePersistence(),
    clear: async () => unavailablePersistence(),
    exportSave: async () => Object.freeze({ kind: "rejected", code: "unavailable" }),
    exportCurrentSave,
    importSave: async () => unavailablePersistence(),
  });

  return Object.freeze({
    semantic,
    lifecycle: Object.freeze({
      createNewSession: lifecycleOperation,
      restartSession: lifecycleOperation,
    }),
    persistence,
    diagnostics: Object.freeze({
      exportDebugBundle: async () =>
        Object.freeze({ kind: "unavailable" as const, code: "diagnostics.unavailable" }),
    }),
    capabilities: unavailableCapabilities,
    debugTools: unavailableDebugTools,
  });
}
