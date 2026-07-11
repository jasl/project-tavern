// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  canonicalJsonBytes,
  digestBytes,
  digestCanonical,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "@project-tavern/base";
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
} from "@project-tavern/base";
import { createEngineSessionV1 } from "@project-tavern/base/runtime";
import { createViewSourceV1 } from "@project-tavern/ui";

import type { SandboxCommandV1, SandboxProfileTypesV1 } from "../contracts.js";
import { createSandboxInitialSnapshotV1 } from "../session.js";
import { createSandboxFaultAttemptV1 } from "../profile.js";
import type { SandboxResolvedStoryV1 } from "../story-entry.js";

export interface SandboxApplicationViewV1 {
  readonly count: number;
  readonly parity: "even" | "odd";
  readonly status: "ready" | "busy" | "fault_paused" | "hmr_invalidated";
}

type SandboxPersistencePortV1 = {
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

export type SandboxPlayerApplicationV1 = PlayerApplicationPortV1<
  SandboxApplicationViewV1,
  {
    dispatch(
      command: SandboxCommandV1,
    ): ReturnType<
      ReturnType<typeof createEngineSessionV1<SandboxProfileTypesV1>>["session"]["dispatch"]
    >;
  },
  {
    createNewSession(): Promise<SessionAnchorResultV1>;
    restartSession(): Promise<SessionAnchorResultV1>;
  },
  SandboxPersistencePortV1,
  { exportDebugBundle(): Promise<{ readonly kind: "unavailable"; readonly code: string }> }
>;

const unavailablePersistence = (): PersistenceOperationResultV1 =>
  Object.freeze({ kind: "rejected", code: "unavailable" });
const unavailableLease = (): SessionLeaseOperationResultV1 =>
  Object.freeze({ kind: "rejected", code: "unavailable" });

export function createSandboxApplicationV1(input: {
  readonly resolved: SandboxResolvedStoryV1;
  readonly host: GameHostV1;
}): SandboxPlayerApplicationV1 {
  const profile = input.resolved.profile;
  const bootstrap = profile.createBootstrapInput(input.host.bootstrapEntropy);
  const created = createEngineSessionV1<SandboxProfileTypesV1>({
    initialSnapshot: createSandboxInitialSnapshotV1(profile, bootstrap),
    commandSchema: profile.commandSchema,
    executionContext: undefined,
    executeAttempt(snapshot, command) {
      return profile.coordinator.executeAttempt(snapshot, command, undefined);
    },
    normalizeUnexpectedDispatchFault(_error, snapshot) {
      return createSandboxFaultAttemptV1(
        snapshot,
        Object.freeze({ code: "sandbox.runtime.unexpected" }),
      );
    },
  });
  const project = (): SandboxApplicationViewV1 => {
    const snapshot = created.session.getCurrentSnapshot();
    const queries = profile.coordinator.createQueries(snapshot) as {
      count: number;
      parity: "even" | "odd";
    };
    return Object.freeze({ ...queries, status: created.session.getStatus() });
  };
  const view = createViewSourceV1(project());
  created.session.subscribe(() => view.publish(project()));

  const lifecycleOperation = () =>
    created.runtimeControl.enqueueAuthoritative<SessionAnchorResultV1>(
      async () => {
        const nextBootstrap = profile.createBootstrapInput(input.host.bootstrapEntropy);
        const snapshot = createSandboxInitialSnapshotV1(profile, nextBootstrap);
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
          stateDigest: digestCanonical("project-tavern:state:v1", snapshot),
          snapshot,
          simulationLineage: Object.freeze([]),
        });
        const bytes = canonicalJsonBytes(record);
        const file: ExportedSaveV1 = Object.freeze({
          filename: "project-tavern-sandbox-current.json",
          mediaType: "application/json",
          digest: digestBytes(bytes),
          bytes,
        });
        return Object.freeze({ kind: "preserve" as const, result: file });
      },
      () => {
        const bytes = canonicalJsonBytes({ kind: "faulted" });
        return Object.freeze({
          filename: "project-tavern-sandbox-current.json",
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
  const persistence: SandboxPersistencePortV1 = Object.freeze({
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
      dispatch: (command: SandboxCommandV1) => created.session.dispatch(command),
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
