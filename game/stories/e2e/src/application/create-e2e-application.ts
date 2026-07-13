// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  canonicalJsonBytes,
  digestBytes,
  digestCanonical,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "@sillymaker/base";
import type {
  ExportedSaveV1,
  GameHostV1,
  PersistenceOperationResultV1,
  PersistenceStatusV1,
  PlayerApplicationPortV1,
  SaveExportOperationResultV1,
  SaveSlotSummaryV1,
  SessionAnchorResultV1,
  SessionLeaseOperationResultV1,
  SessionLeaseStatusV1,
} from "@sillymaker/base";
import { createGameSessionV1 } from "@sillymaker/base/runtime";
import { createViewSourceV1 } from "@sillymaker/ui";

import type { E2eCommandV1, E2eSimulationTypesV1 } from "../contracts.js";
import { createE2eInitialSnapshotV1 } from "../session.js";
import { createE2eFaultAttemptV1 } from "../profile.js";
import type { E2eResolvedGameV1 } from "../story-entry.js";

export interface E2eApplicationViewV1 {
  readonly count: number;
  readonly parity: "even" | "odd";
  readonly status: "ready" | "busy" | "fault_paused" | "hmr_invalidated";
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

export type E2ePlayerApplicationV1 = PlayerApplicationPortV1<
  E2eApplicationViewV1,
  {
    dispatch(
      command: E2eCommandV1,
    ): ReturnType<
      ReturnType<typeof createGameSessionV1<E2eSimulationTypesV1>>["session"]["dispatch"]
    >;
  },
  {
    createNewSession(): Promise<SessionAnchorResultV1>;
    restartSession(): Promise<SessionAnchorResultV1>;
  },
  E2ePersistencePortV1,
  { exportDebugBundle(): Promise<{ readonly kind: "unavailable"; readonly code: string }> }
>;

const unavailablePersistence = (): PersistenceOperationResultV1 =>
  Object.freeze({ kind: "rejected", code: "unavailable" });
const unavailableLease = (): SessionLeaseOperationResultV1 =>
  Object.freeze({ kind: "rejected", code: "unavailable" });

export function createE2eApplicationV1(input: {
  readonly resolved: E2eResolvedGameV1;
  readonly host: GameHostV1;
}): E2ePlayerApplicationV1 {
  const gameSimulation = input.resolved.gameSimulation;
  const bootstrap = gameSimulation.createBootstrapInput(input.host.bootstrapEntropy);
  const created = createGameSessionV1<E2eSimulationTypesV1>({
    initialSnapshot: createE2eInitialSnapshotV1(gameSimulation, bootstrap),
    commandSchema: gameSimulation.commandSchema,
    executionContext: undefined,
    executeAttempt(snapshot, command) {
      return gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined);
    },
    normalizeUnexpectedDispatchFault(_error, snapshot) {
      return createE2eFaultAttemptV1(snapshot, Object.freeze({ code: "e2e.runtime.unexpected" }));
    },
  });
  const project = (): E2eApplicationViewV1 => {
    const snapshot = created.session.getCurrentSnapshot();
    const queries = gameSimulation.createQueries(snapshot.state);
    const projected = gameSimulation.projectGameView(queries);
    return Object.freeze({ ...projected, status: created.session.getStatus() });
  };
  const view = createViewSourceV1(project());
  created.session.subscribe(() => view.publish(project()));

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
    view,
    commands: Object.freeze({
      dispatch: (command: E2eCommandV1) => created.session.dispatch(command),
    }),
    lifecycle: Object.freeze({
      createNewSession: lifecycleOperation,
      restartSession: lifecycleOperation,
    }),
    persistence,
    diagnostics: Object.freeze({
      exportDebugBundle: async () =>
        Object.freeze({ kind: "unavailable" as const, code: "diagnostics.unavailable" }),
    }),
  });
}
