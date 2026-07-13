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
  ReadonlyViewSourceV1,
  SaveExportOperationResultV1,
  SaveSlotSummaryV1,
  SessionAnchorResultV1,
  SessionLeaseOperationResultV1,
  SessionLeaseStatusV1,
} from "@sillymaker/base";
import { createGameSessionV1 } from "@sillymaker/base/runtime";
import { createViewSourceV1 } from "@sillymaker/ui";

import type {
  E2eGameCommandV1,
  E2eGameSimulationTypesV1,
  E2eGameSnapshotV1,
  E2eRejectionReasonV1,
} from "../gameplay/contracts/index.js";
import { createE2eInitialSnapshotV1 } from "../session.js";
import type { E2eResolvedGameV1 } from "../story-entry.js";

export interface E2eApplicationViewV1 {
  readonly count: number;
  readonly parity: "even" | "odd";
  readonly status: "ready" | "busy" | "fault_paused" | "hmr_invalidated";
}

type E2eSessionDispatchResultV1 = Awaited<
  ReturnType<
    ReturnType<typeof createGameSessionV1<E2eGameSimulationTypesV1>>["session"]["dispatch"]
  >
>;

export type E2eSemanticPlaceholderDispatchResultV1 =
  | { readonly kind: "committed" }
  | {
      readonly kind: "rejected";
      readonly reasons: readonly DeepReadonly<E2eRejectionReasonV1>[];
    }
  | {
      readonly kind: "not_executed";
      readonly code:
        "session_unavailable" | "fault_paused" | "hmr_invalidated" | "validation_failed";
    }
  | { readonly kind: "faulted"; readonly code: "gameplay_fault" };

export interface E2eSemanticPlaceholderPortV1 {
  readonly view: ReadonlyViewSourceV1<E2eApplicationViewV1>;
  dispatch(
    command: DeepReadonly<E2eGameCommandV1>,
  ): Promise<E2eSemanticPlaceholderDispatchResultV1>;
}

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
  E2eSemanticPlaceholderPortV1,
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

function projectE2ePlaceholderDispatchResultV1(
  result: E2eSessionDispatchResultV1,
): E2eSemanticPlaceholderDispatchResultV1 {
  if (result.kind === "not_executed") {
    return Object.freeze({ kind: "not_executed", code: result.code });
  }
  switch (result.execution.kind) {
    case "committed":
      return Object.freeze({ kind: "committed" });
    case "rejected":
      return Object.freeze({
        kind: "rejected",
        reasons: Object.freeze(
          result.execution.reasons.map((reason) => Object.freeze({ code: reason.code })),
        ),
      });
    case "faulted":
      return Object.freeze({ kind: "faulted", code: "gameplay_fault" });
  }
  const unsupported: never = result.execution;
  void unsupported;
  throw new TypeError("unsupported E2E dispatch result");
}

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
  });
  const project = (): E2eApplicationViewV1 => {
    const snapshot = created.session.getCurrentSnapshot();
    const queries = gameSimulation.createQueries(snapshot.state);
    return Object.freeze({
      count: queries.counterValue,
      parity: queries.parity,
      status: created.session.getStatus(),
    });
  };
  const viewPublisher = createViewSourceV1(project());
  const view: ReadonlyViewSourceV1<E2eApplicationViewV1> = Object.freeze({
    getCurrent: viewPublisher.getCurrent,
    subscribe: viewPublisher.subscribe,
  });
  created.session.subscribe(() => viewPublisher.publish(project()));

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
    semantic: Object.freeze({
      view,
      dispatch: async (command: DeepReadonly<E2eGameCommandV1>) =>
        projectE2ePlaceholderDispatchResultV1(await created.session.dispatch(command)),
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
    capabilities: unavailableCapabilities,
    debugTools: unavailableDebugTools,
  });
}
