// SPDX-License-Identifier: MIT
import type {
  LeaseHandoffRequestId,
  PlayerPersistencePortV1,
  PlayerWritableSaveSlotIdV1,
  SaveSlotIdV1,
  SessionLeaseOwnerId,
} from "../../contracts/application.js";
import { digestBytes, digestCanonical } from "../../contracts/digest.js";
import type { HostAtomicRecordStoreV1, IsoUtcInstant } from "../../contracts/host.js";
import type {
  AppliedHotfixV1,
  PatchReplacementTraceV1,
  PatchSetAdoptionDeclarationV1,
  PatchSetIdentityV1,
} from "../../contracts/hotfix.js";
import type { BuildProvenanceV1 } from "../../contracts/provenance.js";
import type {
  ExportedSaveV1,
  PersistenceOperationResultV1,
  PersistenceStatusV1,
  SaveExportOperationResultV1,
  SaveCodecContextV1,
  SaveImportInvariantViewV1,
  SaveImportValidationContextV1,
  SaveRecordEnvelopeV1,
  SaveSlotSummaryV1,
  SessionLeaseOperationResultV1,
  SessionLeaseStatusV1,
  SimulationAdoptionV1,
} from "../../contracts/persistence.js";
import { createSaveRecordEnvelopeSchemaV1 } from "../../contracts/persistence.js";
import type {
  DeepReadonly,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
  RuntimeSchemaV1,
} from "../../contracts/values.js";
import {
  parseDigest,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "../../contracts/values.js";
import type { GameSessionRuntimeControlV1 } from "../session/game-session.js";
import { createAutoSaveQueueV1 } from "./auto-save-queue.js";
import { classifySaveCompatibilityV1, validateSaveImportCandidateV1 } from "./compatibility.js";
import { encodeSaveRecordV1 } from "./save-codec.js";
import type {
  SaveRepositorySlotMetadataV1,
  SaveRepositoryV1,
  SaveRepositoryWriteResultV1,
} from "./save-repository.js";
import { createSaveRepositoryV1 } from "./save-repository.js";
import type { SessionLeaseFenceV1, SessionLeaseV1 } from "./session-lease.js";
import { createSessionLeaseV1 } from "./session-lease.js";

type PersistenceSaveRecordV1<TSnapshot> = SaveRecordEnvelopeV1<
  TSnapshot,
  BuildProvenanceV1,
  SaveRepositorySlotMetadataV1,
  readonly SimulationAdoptionV1[]
>;

type PersistencePortV1 = PlayerPersistencePortV1<
  SaveSlotSummaryV1,
  PersistenceStatusV1,
  PersistenceOperationResultV1,
  ExportedSaveV1,
  SaveExportOperationResultV1,
  SessionLeaseStatusV1,
  SessionLeaseOperationResultV1
>;

export type PersistenceRebootstrapDisposalV1 =
  | {
      readonly ownership: "released";
      readonly code: null;
      readonly fence: DeepReadonly<SessionLeaseFenceV1>;
    }
  | {
      readonly ownership: "read_only";
      readonly code: "lease_release_failed";
      readonly fence: null;
    };

export type PersistenceRebootstrapTakeoverV1 =
  | {
      readonly ownership: "writable";
      readonly code: null;
      readonly fence: DeepReadonly<SessionLeaseFenceV1>;
    }
  | {
      readonly ownership: "read_only";
      readonly code: "lease_release_failed" | "lease_takeover_failed";
      readonly fence: null;
    };

export interface PersistenceServiceV1<TSnapshot> {
  readonly port: PersistencePortV1;
  getSimulationLineage(): readonly DeepReadonly<SimulationAdoptionV1>[];
  establishAnchor(
    snapshot: DeepReadonly<TSnapshot>,
    simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[],
  ): void;
  autoSaveIdle(): Promise<void>;
  disposeForRebootstrap(): Promise<PersistenceRebootstrapDisposalV1>;
  takeOverForRebootstrap(
    previous: DeepReadonly<PersistenceRebootstrapDisposalV1>,
  ): Promise<PersistenceRebootstrapTakeoverV1>;
}

export type PersistenceLeaseAcquisitionV1 = "acquire_initial" | "deferred_rebootstrap";

export interface CreatePersistenceServiceOptionsV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
> {
  readonly runtimeControl: GameSessionRuntimeControlV1<TSnapshot>;
  readonly repository: SaveRepositoryV1<PersistenceSaveRecordV1<TSnapshot>>;
  readonly lease: SessionLeaseV1;
  readonly validation: SaveImportValidationContextV1<
    TState,
    TSnapshot,
    PersistenceSaveRecordV1<TSnapshot>
  >;
  readonly provenance: DeepReadonly<BuildProvenanceV1>;
  readonly initialSimulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[];
  readonly metadataClock: { now(): IsoUtcInstant };
  readonly exportFilename: string;
  readonly leaseAcquisition?: PersistenceLeaseAcquisitionV1;
}

export interface CreateStandardPersistenceServiceOptionsV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
> {
  readonly runtimeControl: GameSessionRuntimeControlV1<TSnapshot>;
  readonly records: HostAtomicRecordStoreV1;
  readonly snapshotSchema: RuntimeSchemaV1<TSnapshot>;
  readonly provenance: DeepReadonly<BuildProvenanceV1>;
  readonly adoptionDeclaration: DeepReadonly<PatchSetAdoptionDeclarationV1> | null;
  readonly ownerId: SessionLeaseOwnerId;
  nextHandoffRequestId(): LeaseHandoffRequestId;
  validateReferences(state: DeepReadonly<TState>): readonly string[];
  validateInvariants(view: DeepReadonly<SaveImportInvariantViewV1<TState>>): readonly string[];
  readonly initialSimulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[];
  readonly metadataClock: { now(): IsoUtcInstant };
  readonly exportFilename: string;
  readonly leaseAcquisition?: PersistenceLeaseAcquisitionV1;
}

interface SaveCandidateV1<TSnapshot> {
  readonly snapshot: DeepReadonly<TSnapshot>;
  readonly simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[];
  readonly savedAt: IsoUtcInstant;
}

interface AutoCandidateV1<TSnapshot> {
  readonly snapshot: TSnapshot;
  readonly simulationLineage: readonly SimulationAdoptionV1[];
  readonly fence: SessionLeaseFenceV1 | null;
}

const slotIdsV1 = Object.freeze(["auto.current", "auto.previous", "quick", "manual"] as const);

function copyLineageV1(
  lineage: readonly DeepReadonly<SimulationAdoptionV1>[],
): readonly SimulationAdoptionV1[] {
  return Object.freeze(lineage.map((entry) => Object.freeze({ ...entry })));
}

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.byteLength === right.byteLength && left.every((value, index) => value === right[index])
  );
}

function rejectedV1(
  code: Extract<PersistenceOperationResultV1, { readonly kind: "rejected" }>["code"],
): PersistenceOperationResultV1 {
  return Object.freeze({ kind: "rejected", code });
}

function faultedV1(code = "persistence.unexpected"): PersistenceOperationResultV1 {
  return Object.freeze({ kind: "faulted", code });
}

function exportRejectedV1(
  code: Extract<SaveExportOperationResultV1, { readonly kind: "rejected" }>["code"],
): SaveExportOperationResultV1 {
  return Object.freeze({ kind: "rejected", code });
}

function repositoryRejectionV1(
  code: Extract<SaveRepositoryWriteResultV1, { readonly kind: "rejected" }>["code"],
): PersistenceOperationResultV1 {
  return rejectedV1(code === "empty_slot" ? "empty_slot" : code);
}

async function createPersistenceServiceWithDependenciesV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
>(
  options: CreatePersistenceServiceOptionsV1<TState, TSnapshot>,
): Promise<PersistenceServiceV1<TSnapshot>> {
  if (typeof options.exportFilename !== "string" || options.exportFilename.length === 0) {
    throw new TypeError("Persistence service requires an export filename");
  }
  const leaseAcquisition = options.leaseAcquisition ?? "acquire_initial";
  if (leaseAcquisition !== "acquire_initial" && leaseAcquisition !== "deferred_rebootstrap") {
    throw new TypeError("invalid persistence lease acquisition");
  }

  let currentLineage = copyLineageV1(options.initialSimulationLineage);
  let safelySavedCommandSequence: NonNegativeSafeInteger | null = null;
  let lastFailureCode: string | null = null;
  let rebootstrapFailureCode: "lease_release_failed" | "lease_takeover_failed" | null = null;
  let foregroundWrites = 0;
  let autoWrites = 0;
  let physicalTail: Promise<void> = Promise.resolve();
  let lifecycle: "active" | "disposing" | "disposed" = "active";
  let rebootstrapTransferPending = leaseAcquisition === "deferred_rebootstrap";
  let leaseMutationTail: Promise<void> = Promise.resolve();
  let publicReleaseFence: DeepReadonly<SessionLeaseFenceV1> | null = null;
  let disposalPromise: Promise<PersistenceRebootstrapDisposalV1> | null = null;
  let takeoverPromise: Promise<PersistenceRebootstrapTakeoverV1> | null = null;
  let leaseStatus =
    leaseAcquisition === "acquire_initial"
      ? await options.lease.acquireInitial()
      : await options.lease.getStatus();
  if (leaseStatus.kind === "unavailable") lastFailureCode = leaseStatus.code;

  const rememberFailureV1 = (code: string): void => {
    lastFailureCode = code;
  };
  const rememberOperationFailureV1 = (code: string): void => {
    if (code === "unavailable" && lastFailureCode?.startsWith("indexeddb.") === true) return;
    rememberFailureV1(code);
  };
  const rememberSuccessV1 = (sequence: NonNegativeSafeInteger): void => {
    safelySavedCommandSequence = sequence;
    lastFailureCode = null;
  };
  const observeLeaseStatusV1 = (status: SessionLeaseStatusV1): SessionLeaseStatusV1 => {
    leaseStatus = status;
    if (status.kind === "unavailable") rememberFailureV1(status.code);
    return status;
  };
  const refreshLeaseStatusV1 = async (): Promise<SessionLeaseStatusV1> =>
    observeLeaseStatusV1(await options.lease.getStatus());

  const schedulePhysicalV1 = <TResult>(operation: () => Promise<TResult>): Promise<TResult> => {
    const result = physicalTail.then(operation);
    physicalTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const makeRecordV1 = (
    candidate: SaveCandidateV1<TSnapshot>,
    slotId: SaveSlotIdV1,
    writeReason: "auto" | PlayerWritableSaveSlotIdV1,
    recordRevision: PositiveSafeInteger = parsePositiveSafeInteger(1),
  ): PersistenceSaveRecordV1<TSnapshot> => {
    const value = {
      formatRevision: 1 as const,
      recordRevision,
      provenance: options.provenance,
      slot: Object.freeze({
        storyId: options.provenance.story.id,
        slotId,
        writeReason,
        capturedCommandSequence: candidate.snapshot.commandSequence,
      }),
      savedAt: candidate.savedAt,
      stateDigest: digestCanonical("sillymaker:state:v1", candidate.snapshot),
      snapshot: candidate.snapshot,
      simulationLineage: candidate.simulationLineage,
    };
    const parsed = options.validation.codec.recordSchema.parse(value);
    options.validation.codec.validateEnvelope(
      parsed as DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>,
    );
    return parsed;
  };

  const encodeRecordV1 = (record: DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>): Uint8Array =>
    encodeSaveRecordV1<TSnapshot, PersistenceSaveRecordV1<TSnapshot>>(
      record,
      options.validation.codec,
    );

  const captureV1 = (snapshot: DeepReadonly<TSnapshot>): SaveCandidateV1<TSnapshot> =>
    Object.freeze({
      snapshot,
      simulationLineage: currentLineage,
      savedAt: options.metadataClock.now(),
    });

  const verifyFenceV1 = async (
    fence: DeepReadonly<SessionLeaseFenceV1>,
  ): Promise<
    | { readonly kind: "owned" }
    | { readonly kind: "conflict" }
    | { readonly kind: "unavailable"; readonly code: string }
  > => {
    const observedStatus = await refreshLeaseStatusV1();
    if (observedStatus.kind === "unavailable") {
      return Object.freeze({ kind: "unavailable", code: observedStatus.code });
    }
    const freshFence = options.lease.captureFence();
    const ownsFence =
      (observedStatus.kind === "owned" || observedStatus.kind === "handoff_requested") &&
      observedStatus.ownerId === fence.ownerId &&
      observedStatus.fencingToken === fence.fencingToken &&
      freshFence !== null &&
      freshFence.ownerId === fence.ownerId &&
      freshFence.fencingToken === fence.fencingToken;
    return Object.freeze({ kind: ownsFence ? "owned" : "conflict" });
  };

  const writeVerifiedV1 = async (
    candidate: SaveCandidateV1<TSnapshot>,
    slotId: "auto.current" | PlayerWritableSaveSlotIdV1,
    fence: DeepReadonly<SessionLeaseFenceV1> | null,
  ): Promise<PersistenceOperationResultV1> => {
    if (fence === null) {
      return rejectedV1("unavailable");
    }
    const reason = slotId === "auto.current" ? "auto" : slotId;
    let record: PersistenceSaveRecordV1<TSnapshot>;
    try {
      record = makeRecordV1(candidate, slotId, reason);
    } catch {
      return faultedV1("persistence.capture_invalid");
    }
    try {
      const written =
        slotId === "auto.current"
          ? await options.repository.writeAuto(
              record as DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>,
              fence,
            )
          : slotId === "quick"
            ? await options.repository.writeQuick(
                record as DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>,
                fence,
              )
            : await options.repository.writeManual(
                record as DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>,
                fence,
              );
      if (written.kind === "rejected") {
        if (written.code === "unavailable") {
          await refreshLeaseStatusV1();
        }
        return repositoryRejectionV1(written.code);
      }
      const observed = await options.repository.read(slotId);
      if (observed.health === "unavailable") {
        rememberFailureV1(observed.code);
        return rejectedV1("unavailable");
      }
      const fenceVerification = await verifyFenceV1(fence);
      if (fenceVerification.kind === "unavailable") {
        return rejectedV1("unavailable");
      }
      if (
        fenceVerification.kind !== "owned" ||
        observed.health !== "valid" ||
        Number(observed.hostRevision) !== Number(written.recordRevision) ||
        observed.record.recordRevision !== written.recordRevision ||
        observed.record.slot.capturedCommandSequence !== candidate.snapshot.commandSequence
      ) {
        return rejectedV1("conflict");
      }
      const expected = makeRecordV1(candidate, slotId, reason, written.recordRevision);
      const expectedBytes = encodeRecordV1(
        expected as DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>,
      );
      if (!bytesEqualV1(observed.bytes, expectedBytes)) {
        return rejectedV1("conflict");
      }
      return Object.freeze({ kind: "saved" as const, slotId });
    } catch {
      return faultedV1();
    }
  };

  const autoQueue = createAutoSaveQueueV1<AutoCandidateV1<TSnapshot>, PersistenceOperationResultV1>(
    {
      async write(candidate) {
        autoWrites += 1;
        try {
          const savedAt = options.metadataClock.now();
          return await schedulePhysicalV1(() =>
            writeVerifiedV1(
              Object.freeze({ ...candidate, savedAt }),
              "auto.current",
              candidate.fence,
            ),
          );
        } catch {
          return faultedV1();
        } finally {
          autoWrites -= 1;
        }
      },
      isSuccessfulResult(result) {
        return result.kind === "saved" || lifecycle !== "active";
      },
      onCurrentResult(candidate, result) {
        if (result.kind === "saved") rememberSuccessV1(candidate.snapshot.commandSequence);
        else if (result.kind === "rejected" || result.kind === "faulted") {
          rememberOperationFailureV1(result.code);
        }
      },
      onFailure() {
        rememberFailureV1("persistence.unexpected");
      },
    },
  );

  const establishAnchorV1 = (
    snapshot: DeepReadonly<TSnapshot>,
    simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[],
  ): void => {
    if (lifecycle !== "active") return;
    const nextLineage = copyLineageV1(simulationLineage);
    autoQueue.establishAnchor(
      Object.freeze({
        snapshot,
        simulationLineage: nextLineage,
        fence: options.lease.captureFence(),
      }),
    );
    currentLineage = nextLineage;
    safelySavedCommandSequence = null;
  };

  options.runtimeControl.subscribeCommittedSnapshots((snapshot) => {
    if (lifecycle !== "active") return;
    try {
      autoQueue.enqueue(
        Object.freeze({
          snapshot,
          simulationLineage: currentLineage,
          fence: options.lease.captureFence(),
        }),
      );
    } catch {
      rememberFailureV1("persistence.capture_invalid");
    }
  });

  const validationRejectionV1 = (
    result: ReturnType<typeof validateSaveImportCandidateV1>,
  ): PersistenceOperationResultV1 | null => {
    if (result.kind === "inspect_only") return rejectedV1("incompatible");
    if (result.kind !== "rejected") return null;
    return rejectedV1(
      result.code === "compatibility.lineage_limit" ? "lineage_limit" : "invalid_record",
    );
  };

  const replacementOutcomeV1 = (bytes: Uint8Array, operation: "loaded" | "imported") => {
    const validation = validateSaveImportCandidateV1(bytes, options.validation);
    const rejection = validationRejectionV1(validation);
    if (rejection !== null) {
      return Object.freeze({ kind: "preserve" as const, result: rejection });
    }
    if (validation.kind !== "exact" && validation.kind !== "adopted") {
      throw new TypeError("invalid runnable Save validation result");
    }
    const lineage =
      validation.kind === "adopted"
        ? Object.freeze([...validation.candidate.simulationLineage, validation.adoption])
        : validation.candidate.simulationLineage;
    return Object.freeze({
      kind: "replace" as const,
      snapshot: validation.candidate.snapshot as TSnapshot,
      result: Object.freeze({
        kind: operation,
        compatibility: validation.kind,
        commandSequence: validation.candidate.snapshot.commandSequence,
      }) as PersistenceOperationResultV1,
      anchor: "replace_replay_base" as const,
      simulationLineage: lineage,
    });
  };

  const enqueueReplacementV1 = (
    operation: (
      current: DeepReadonly<TSnapshot>,
    ) => Promise<ReturnType<typeof replacementOutcomeV1>>,
  ): Promise<PersistenceOperationResultV1> => {
    if (lifecycle !== "active") return Promise.resolve(faultedV1("runtime_disposed"));
    let preparedLineage: readonly DeepReadonly<SimulationAdoptionV1>[] | null = null;
    return options.runtimeControl.enqueueAuthoritative<PersistenceOperationResultV1>(
      async (current) => {
        if (lifecycle !== "active") {
          return Object.freeze({
            kind: "preserve" as const,
            result: faultedV1("runtime_disposed"),
          });
        }
        try {
          const outcome = await operation(current);
          if (lifecycle !== "active") {
            return Object.freeze({
              kind: "preserve" as const,
              result: faultedV1("runtime_disposed"),
            });
          }
          if (outcome.kind === "replace") {
            preparedLineage = outcome.simulationLineage;
            return Object.freeze({
              kind: outcome.kind,
              snapshot: outcome.snapshot,
              result: outcome.result,
              anchor: outcome.anchor,
            });
          }
          return outcome;
        } catch {
          rememberFailureV1("persistence.unexpected");
          return Object.freeze({ kind: "preserve" as const, result: faultedV1() });
        }
      },
      () => {
        rememberFailureV1("persistence.unexpected");
        return faultedV1();
      },
      (committedSnapshot) => {
        if (preparedLineage === null) {
          throw new TypeError("missing committed persistence lineage");
        }
        establishAnchorV1(committedSnapshot, preparedLineage);
        lastFailureCode = null;
      },
      () => faultedV1("runtime_disposed"),
    );
  };

  const makeExportV1 = (
    record: DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>,
  ): ExportedSaveV1 => {
    const bytes = Uint8Array.from(encodeRecordV1(record));
    return Object.freeze({
      filename: options.exportFilename,
      mediaType: "application/json" as const,
      digest: digestBytes(bytes),
      bytes,
    });
  };

  const makeStoredExportV1 = (storedBytes: Uint8Array): ExportedSaveV1 => {
    const bytes = Uint8Array.from(storedBytes);
    return Object.freeze({
      filename: options.exportFilename,
      mediaType: "application/json" as const,
      digest: digestBytes(bytes),
      bytes,
    });
  };

  const leaseOperationV1 = async (
    operation: () => Promise<SessionLeaseOperationResultV1>,
  ): Promise<SessionLeaseOperationResultV1> => {
    try {
      const result = await operation();
      if (result.kind === "updated") leaseStatus = result.status;
      else rememberFailureV1(result.code);
      return result;
    } catch {
      rememberFailureV1("unavailable");
      return Object.freeze({ kind: "rejected", code: "unavailable" });
    }
  };

  const publicLeaseMutationV1 = (
    operation: () => Promise<SessionLeaseOperationResultV1>,
    trackSuccessfulRelease = false,
  ): Promise<SessionLeaseOperationResultV1> => {
    if (lifecycle !== "active" || rebootstrapTransferPending) {
      return Promise.resolve(
        Object.freeze({ kind: "rejected" as const, code: "conflict" as const }),
      );
    }
    const acceptedReleaseFence = trackSuccessfulRelease ? options.lease.captureFence() : null;
    const result = Promise.resolve().then(() => leaseOperationV1(operation));
    const tracked = result.then((settled) => {
      if (
        acceptedReleaseFence !== null &&
        settled.kind === "updated" &&
        settled.status.kind === "unowned" &&
        settled.status.fencingToken === acceptedReleaseFence.fencingToken
      ) {
        publicReleaseFence = Object.freeze({ ...acceptedReleaseFence });
      }
    });
    leaseMutationTail = Promise.all([leaseMutationTail, tracked]).then(() => undefined);
    return result;
  };

  const port: PersistencePortV1 = Object.freeze({
    lease: Object.freeze({
      async getStatus() {
        try {
          return observeLeaseStatusV1(await options.lease.getStatus());
        } catch {
          return observeLeaseStatusV1(
            Object.freeze({
              kind: "unavailable" as const,
              ownerId: null,
              fencingToken: null,
              code: "persistence.unexpected",
            }),
          );
        }
      },
      requestHandoff: () => publicLeaseMutationV1(() => options.lease.requestHandoff()),
      approveHandoff: (requestId: LeaseHandoffRequestId) =>
        publicLeaseMutationV1(() => options.lease.approveHandoff(requestId)),
      takeOver: () => publicLeaseMutationV1(() => options.lease.takeOver()),
      release: () => publicLeaseMutationV1(() => options.lease.release(), true),
    }),

    async listSlots() {
      try {
        const reads = await Promise.all(slotIdsV1.map((slotId) => options.repository.read(slotId)));
        const dispositions: Array<{
          readonly runnable: boolean;
          readonly summary: SaveSlotSummaryV1;
        }> = reads.map((read) => {
          if (read.health !== "valid") {
            if (read.health === "unavailable") rememberFailureV1(read.code);
            return Object.freeze({
              runnable: false,
              summary: Object.freeze({
                slotId: read.slotId,
                health: read.health,
                recordRevision: null,
                capturedCommandSequence: null,
                savedAt: null,
                warningCodes: Object.freeze(read.code === null ? [] : [read.code]),
              }) satisfies SaveSlotSummaryV1,
            });
          }
          const bytes = read.bytes;
          const validation = validateSaveImportCandidateV1(bytes, options.validation);
          const warningCodes =
            validation.kind === "rejected"
              ? [validation.code]
              : validation.kind === "inspect_only"
                ? [
                    ...validation.mismatches.map(({ code }) => code),
                    ...validation.warnings.map(({ code }) => code),
                  ]
                : validation.warnings.map(({ code }) => code);
          const lineageLimited =
            validation.kind === "rejected" && validation.code === "compatibility.lineage_limit";
          return Object.freeze({
            runnable: validation.kind === "exact" || validation.kind === "adopted",
            summary: Object.freeze({
              slotId: read.slotId,
              health:
                validation.kind === "rejected" && !lineageLimited
                  ? ("invalid" as const)
                  : ("valid" as const),
              recordRevision: read.record.recordRevision,
              capturedCommandSequence: read.record.slot.capturedCommandSequence,
              savedAt: read.record.savedAt,
              warningCodes: Object.freeze(warningCodes),
            }) satisfies SaveSlotSummaryV1,
          });
        });
        const current = dispositions[0];
        const previous = dispositions[1];
        if (
          current !== undefined &&
          previous !== undefined &&
          !current.runnable &&
          previous.runnable
        ) {
          dispositions[1] = Object.freeze({
            runnable: true,
            summary: Object.freeze({
              ...previous.summary,
              health: "recovery_candidate" as const,
            }),
          });
        }
        return Object.freeze(dispositions.map(({ summary }) => summary));
      } catch {
        rememberFailureV1("persistence.unexpected");
        return Object.freeze(
          slotIdsV1.map((slotId) =>
            Object.freeze({
              slotId,
              health: "unavailable" as const,
              recordRevision: null,
              capturedCommandSequence: null,
              savedAt: null,
              warningCodes: Object.freeze(["persistence.unexpected"]),
            }),
          ),
        );
      }
    },

    async getStatus() {
      try {
        await refreshLeaseStatusV1();
      } catch {
        observeLeaseStatusV1(
          Object.freeze({
            kind: "unavailable" as const,
            ownerId: null,
            fencingToken: null,
            code: "persistence.unexpected",
          }),
        );
      }
      const runtimeStatus = options.runtimeControl.inspectForRuntime().status;
      return Object.freeze({
        available: leaseStatus.kind !== "unavailable",
        busy:
          runtimeStatus === "busy" || foregroundWrites > 0 || autoWrites > 0 || !autoQueue.isIdle(),
        safelySavedCommandSequence,
        lastFailureCode: rebootstrapFailureCode ?? lastFailureCode,
      });
    },

    save(slot: PlayerWritableSaveSlotIdV1) {
      if (lifecycle !== "active") return Promise.resolve(faultedV1("runtime_disposed"));
      const runtime = options.runtimeControl.inspectForRuntime();
      if (runtime.status !== "ready" || foregroundWrites > 0) {
        return Promise.resolve(rejectedV1("busy"));
      }
      const fence = options.lease.captureFence();
      if (fence === null) {
        rememberFailureV1("unavailable");
        return Promise.resolve(rejectedV1("unavailable"));
      }
      let candidate: SaveCandidateV1<TSnapshot>;
      const acceptedAnchorEpoch = autoQueue.anchorEpoch();
      try {
        candidate = captureV1(runtime.snapshot);
      } catch {
        rememberFailureV1("persistence.capture_failed");
        return Promise.resolve(faultedV1("persistence.capture_failed"));
      }
      foregroundWrites += 1;
      return schedulePhysicalV1(() =>
        lifecycle === "active"
          ? writeVerifiedV1(candidate, slot, fence)
          : Promise.resolve(faultedV1("runtime_disposed")),
      )
        .then((result) => {
          if (acceptedAnchorEpoch === autoQueue.anchorEpoch()) {
            if (result.kind === "saved") rememberSuccessV1(candidate.snapshot.commandSequence);
            else if (result.kind === "rejected" || result.kind === "faulted") {
              rememberOperationFailureV1(result.code);
            }
          }
          return result;
        })
        .finally(() => {
          foregroundWrites -= 1;
        });
    },

    load(slot: SaveSlotIdV1) {
      return enqueueReplacementV1(async () => {
        const read = await options.repository.read(slot);
        if (read.health === "empty") {
          return Object.freeze({ kind: "preserve" as const, result: rejectedV1("empty_slot") });
        }
        if (read.health === "unavailable") {
          rememberFailureV1(read.code);
          return Object.freeze({ kind: "preserve" as const, result: rejectedV1("unavailable") });
        }
        if (read.health === "invalid") {
          return Object.freeze({ kind: "preserve" as const, result: rejectedV1("invalid_record") });
        }
        return replacementOutcomeV1(read.bytes, "loaded");
      });
    },

    clear(slot: SaveSlotIdV1) {
      if (lifecycle !== "active") return Promise.resolve(faultedV1("runtime_disposed"));
      if (foregroundWrites > 0) return Promise.resolve(rejectedV1("busy"));
      const acceptedFence = options.lease.captureFence();
      if (acceptedFence === null) {
        return Promise.resolve(rejectedV1("unavailable"));
      }
      const acceptedAnchorEpoch = autoQueue.anchorEpoch();
      foregroundWrites += 1;
      return schedulePhysicalV1(async () => {
        if (lifecycle !== "active") return faultedV1("runtime_disposed");
        try {
          const result = await options.repository.clear(slot, acceptedFence);
          if (result.kind === "rejected") {
            if (acceptedAnchorEpoch === autoQueue.anchorEpoch()) {
              rememberOperationFailureV1(result.code);
            }
            return repositoryRejectionV1(result.code);
          }
          if (acceptedAnchorEpoch === autoQueue.anchorEpoch()) {
            safelySavedCommandSequence = null;
            lastFailureCode = null;
          }
          return Object.freeze({ kind: "cleared" as const, slotId: slot });
        } catch {
          if (acceptedAnchorEpoch === autoQueue.anchorEpoch()) {
            rememberFailureV1("persistence.unexpected");
          }
          return faultedV1();
        }
      }).finally(() => {
        foregroundWrites -= 1;
      });
    },

    async exportSave(slot: SaveSlotIdV1) {
      try {
        const first = await options.repository.read(slot);
        if (first.health === "empty") return exportRejectedV1("empty_slot");
        if (first.health === "unavailable") {
          rememberFailureV1(first.code);
          return exportRejectedV1("unavailable");
        }
        if (first.health === "invalid") return exportRejectedV1("invalid_record");
        const bytes = first.bytes;
        const validation = validateSaveImportCandidateV1(bytes, options.validation);
        if (validation.kind === "rejected" && validation.code !== "compatibility.lineage_limit") {
          return exportRejectedV1("invalid_record");
        }
        const second = await options.repository.read(slot);
        if (second.health === "unavailable") {
          rememberFailureV1(second.code);
          return exportRejectedV1("unavailable");
        }
        if (second.health !== "valid") return exportRejectedV1("conflict");
        if (second.hostRevision !== first.hostRevision || !bytesEqualV1(bytes, second.bytes)) {
          return exportRejectedV1("conflict");
        }
        return Object.freeze({
          kind: "exported" as const,
          slotId: slot,
          file: makeStoredExportV1(bytes),
        });
      } catch {
        return Object.freeze({ kind: "faulted" as const, code: "persistence.unexpected" });
      }
    },

    exportCurrentSave() {
      try {
        const snapshot = options.runtimeControl.inspectForRuntime().snapshot;
        const record = makeRecordV1(captureV1(snapshot), "manual", "manual");
        return Promise.resolve(
          makeExportV1(record as DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>),
        );
      } catch {
        return Promise.reject(new TypeError("failed to export current Save"));
      }
    },

    importSave(bytes: Uint8Array) {
      const accepted = Uint8Array.from(bytes);
      return enqueueReplacementV1(async () => replacementOutcomeV1(accepted, "imported"));
    },
  });

  const disposeForRebootstrapV1 = (): Promise<PersistenceRebootstrapDisposalV1> => {
    if (disposalPromise !== null) return disposalPromise;
    lifecycle = "disposing";
    rebootstrapTransferPending = true;
    const preDrainFence = options.lease.captureFence();
    disposalPromise = (async () => {
      await leaseMutationTail;
      let observedAfterDrain: SessionLeaseStatusV1 | null = null;
      try {
        observedAfterDrain = await refreshLeaseStatusV1();
      } catch {
        rememberFailureV1("persistence.unexpected");
      }
      const releaseFence = options.lease.captureFence();
      const releasedFenceCandidate = publicReleaseFence ?? preDrainFence;
      const alreadyReleasedFence =
        releaseFence === null &&
        observedAfterDrain?.kind === "unowned" &&
        releasedFenceCandidate !== null &&
        observedAfterDrain.fencingToken === releasedFenceCandidate.fencingToken
          ? releasedFenceCandidate
          : null;
      try {
        const runtime = options.runtimeControl.inspectForRuntime();
        autoQueue.establishAnchor(
          Object.freeze({
            snapshot: runtime.snapshot,
            simulationLineage: currentLineage,
            fence: releaseFence,
          }),
        );
        safelySavedCommandSequence = null;
        await autoQueue.idle();
        await physicalTail;
      } catch {
        rememberFailureV1("persistence.unexpected");
      }
      lifecycle = "disposed";

      if (alreadyReleasedFence !== null) {
        return Object.freeze({
          ownership: "released" as const,
          code: null,
          fence: Object.freeze({ ...alreadyReleasedFence }),
        });
      }
      if (releaseFence !== null) {
        try {
          const result = await options.lease.releaseFence(releaseFence);
          if (
            result.kind === "updated" &&
            result.status.kind === "unowned" &&
            result.status.fencingToken === releaseFence.fencingToken
          ) {
            leaseStatus = result.status;
            return Object.freeze({
              ownership: "released" as const,
              code: null,
              fence: Object.freeze({ ...releaseFence }),
            });
          }
        } catch {
          // The stable lifecycle result below intentionally hides Host-specific failures.
        }
      }
      rebootstrapFailureCode = "lease_release_failed";
      rememberFailureV1(rebootstrapFailureCode);
      return Object.freeze({
        ownership: "read_only" as const,
        code: "lease_release_failed" as const,
        fence: null,
      });
    })();
    return disposalPromise;
  };

  const takeOverForRebootstrapV1 = (
    previous: DeepReadonly<PersistenceRebootstrapDisposalV1>,
  ): Promise<PersistenceRebootstrapTakeoverV1> => {
    if (takeoverPromise !== null) return takeoverPromise;
    takeoverPromise = (async () => {
      if (lifecycle !== "active" || previous.ownership === "read_only") {
        const code =
          previous.ownership === "read_only" ? previous.code : ("lease_takeover_failed" as const);
        rebootstrapFailureCode = code;
        rememberFailureV1(code);
        return Object.freeze({ ownership: "read_only" as const, code, fence: null });
      }
      try {
        const result = await options.lease.takeOverUnowned(previous.fence.fencingToken);
        const fence = options.lease.captureFence();
        if (
          result.kind === "updated" &&
          result.status.kind === "owned" &&
          fence !== null &&
          fence.ownerId === result.status.ownerId &&
          fence.fencingToken === result.status.fencingToken &&
          Number(fence.fencingToken) === Number(previous.fence.fencingToken) + 1
        ) {
          leaseStatus = result.status;
          rebootstrapTransferPending = false;
          return Object.freeze({
            ownership: "writable" as const,
            code: null,
            fence: Object.freeze({ ...fence }),
          });
        }
      } catch {
        // The stable lifecycle result below intentionally hides Host-specific failures.
      }
      rebootstrapFailureCode = "lease_takeover_failed";
      rememberFailureV1(rebootstrapFailureCode);
      return Object.freeze({
        ownership: "read_only" as const,
        code: "lease_takeover_failed" as const,
        fence: null,
      });
    })();
    return takeoverPromise;
  };

  return Object.freeze({
    port,
    getSimulationLineage: () => currentLineage,
    establishAnchor: establishAnchorV1,
    autoSaveIdle: () => autoQueue.idle(),
    disposeForRebootstrap: disposeForRebootstrapV1,
    takeOverForRebootstrap: takeOverForRebootstrapV1,
  });
}

type ExactFieldsV1 = Readonly<Record<string, unknown>>;

function exactFieldsV1(value: unknown, keys: readonly string[], label: string): ExactFieldsV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length > 0
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).toSorted().join("\0") !== [...keys].toSorted().join("\0")) {
    throw new TypeError(`invalid ${label} fields`);
  }
  const fields: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} field ${key}`);
    }
    fields[key] = descriptor.value;
  }
  return Object.freeze(fields);
}

function denseArrayV1<T>(
  value: unknown,
  label: string,
  parse: (entry: unknown, index: number) => T,
  maximumLength = 10_000,
): readonly T[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length > 0 ||
    value.length > maximumLength
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const expected = Array.from({ length: value.length }, (_, index) => String(index));
  const actual = Object.keys(descriptors)
    .filter((key) => key !== "length")
    .toSorted((left, right) => Number(left) - Number(right));
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`invalid ${label} fields`);
  }
  return Object.freeze(
    expected.map((key, index) => {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        throw new TypeError(`invalid ${label} entry`);
      }
      return parse(descriptor.value, index);
    }),
  );
}

function nonemptyStringV1(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`invalid ${label}`);
  return value;
}

function parsePatchReplacementV1(value: unknown): PatchReplacementTraceV1 {
  const fields = exactFieldsV1(
    value,
    ["surface", "symbolId", "kind", "previousProviderDigest", "nextProviderDigest"],
    "PatchReplacementTraceV1",
  );
  const surface = fields.surface;
  const kind = fields.kind;
  if (
    (surface !== "simulation" && surface !== "presentation") ||
    (kind !== "rule" && kind !== "value" && kind !== "text" && kind !== "asset") ||
    (surface === "simulation" && kind !== "rule" && kind !== "value") ||
    (surface === "presentation" && kind === "rule")
  ) {
    throw new TypeError("invalid Patch replacement kind");
  }
  const previousProviderDigest = parseDigest(fields.previousProviderDigest);
  const nextProviderDigest = parseDigest(fields.nextProviderDigest);
  return Object.freeze({
    surface,
    symbolId: nonemptyStringV1(fields.symbolId, "Patch symbol ID"),
    kind,
    previousProviderDigest,
    nextProviderDigest,
  });
}

function parseAppliedHotfixV1(value: unknown, index: number): AppliedHotfixV1 {
  const fields = exactFieldsV1(value, ["identity", "ordinal", "replacements"], "AppliedHotfixV1");
  const identity = exactFieldsV1(
    fields.identity,
    ["id", "revision", "digest"],
    "AppliedHotfixV1 identity",
  );
  const ordinal = parsePositiveSafeInteger(fields.ordinal);
  if (Number(ordinal) !== index + 1) throw new TypeError("invalid Applied Hotfix ordinal");
  return Object.freeze({
    identity: Object.freeze({
      id: nonemptyStringV1(identity.id, "Hotfix ID"),
      revision: parsePositiveSafeInteger(identity.revision),
      digest: parseDigest(identity.digest),
    }),
    ordinal,
    replacements: denseArrayV1(
      fields.replacements,
      "Applied Hotfix replacements",
      parsePatchReplacementV1,
    ),
  });
}

function parsePatchSetIdentityV1(value: unknown): PatchSetIdentityV1 {
  const fields = exactFieldsV1(
    value,
    ["digest", "simulationDigest", "presentationDigest", "appliedHotfixes"],
    "PatchSetIdentityV1",
  );
  const appliedHotfixes = denseArrayV1(
    fields.appliedHotfixes,
    "PatchSet applied Hotfixes",
    parseAppliedHotfixV1,
  );
  if (new Set(appliedHotfixes.map(({ identity }) => identity.id)).size !== appliedHotfixes.length) {
    throw new TypeError("duplicate applied Hotfix identity");
  }
  return Object.freeze({
    digest: parseDigest(fields.digest),
    simulationDigest: parseDigest(fields.simulationDigest),
    presentationDigest: parseDigest(fields.presentationDigest),
    appliedHotfixes,
  });
}

const buildProvenanceSchemaV1: RuntimeSchemaV1<BuildProvenanceV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactFieldsV1(value, ["story", "engine", "resolved"], "BuildProvenanceV1");
    const story = exactFieldsV1(fields.story, ["id", "revision", "digest"], "Story provenance");
    const engine = exactFieldsV1(fields.engine, ["version", "digest"], "Engine provenance");
    const resolved = exactFieldsV1(
      fields.resolved,
      [
        "stateContractRevision",
        "stateContractDigest",
        "simulationDigest",
        "presentationDigest",
        "patchSet",
      ],
      "Resolved provenance",
    );
    return Object.freeze({
      story: Object.freeze({
        id: nonemptyStringV1(story.id, "Story ID"),
        revision: parsePositiveSafeInteger(story.revision),
        digest: parseDigest(story.digest),
      }),
      engine: Object.freeze({
        version: nonemptyStringV1(engine.version, "engine version"),
        digest: parseDigest(engine.digest),
      }),
      resolved: Object.freeze({
        stateContractRevision: parsePositiveSafeInteger(resolved.stateContractRevision),
        stateContractDigest: parseDigest(resolved.stateContractDigest),
        simulationDigest: parseDigest(resolved.simulationDigest),
        presentationDigest: parseDigest(resolved.presentationDigest),
        patchSet: parsePatchSetIdentityV1(resolved.patchSet),
      }),
    });
  },
});

function parseSaveSlotIdV1(value: unknown): SaveSlotIdV1 {
  if (!slotIdsV1.some((slotId) => slotId === value)) throw new TypeError("invalid Save slot ID");
  return value as SaveSlotIdV1;
}

const saveSlotMetadataSchemaV1: RuntimeSchemaV1<SaveRepositorySlotMetadataV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactFieldsV1(
      value,
      ["storyId", "slotId", "writeReason", "capturedCommandSequence"],
      "Save slot metadata",
    );
    const writeReason = fields.writeReason;
    if (writeReason !== "auto" && writeReason !== "quick" && writeReason !== "manual") {
      throw new TypeError("invalid Save write reason");
    }
    return Object.freeze({
      storyId: nonemptyStringV1(fields.storyId, "Save Story ID"),
      slotId: parseSaveSlotIdV1(fields.slotId),
      writeReason,
      capturedCommandSequence: parseNonNegativeSafeInteger(fields.capturedCommandSequence),
    });
  },
});

const simulationLineageSchemaV1: RuntimeSchemaV1<readonly SimulationAdoptionV1[]> = Object.freeze({
  parse(value: unknown) {
    return denseArrayV1(
      value,
      "simulation lineage",
      (entry) => {
        const fields = exactFieldsV1(
          entry,
          [
            "fromSimulationDigest",
            "toSimulationDigest",
            "viaSimulationPatchSetDigest",
            "adoptedAtCommandSequence",
          ],
          "SimulationAdoptionV1",
        );
        const fromSimulationDigest = parseDigest(fields.fromSimulationDigest);
        const toSimulationDigest = parseDigest(fields.toSimulationDigest);
        if (fromSimulationDigest === toSimulationDigest) {
          throw new TypeError("empty simulation adoption");
        }
        return Object.freeze({
          fromSimulationDigest,
          toSimulationDigest,
          viaSimulationPatchSetDigest: parseDigest(fields.viaSimulationPatchSetDigest),
          adoptedAtCommandSequence: parseNonNegativeSafeInteger(fields.adoptedAtCommandSequence),
        });
      },
      16,
    );
  },
});

function createStandardPersistenceDependenciesV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
>(
  options: CreateStandardPersistenceServiceOptionsV1<TState, TSnapshot>,
): {
  readonly repository: SaveRepositoryV1<PersistenceSaveRecordV1<TSnapshot>>;
  readonly lease: SessionLeaseV1;
  readonly validation: SaveImportValidationContextV1<
    TState,
    TSnapshot,
    PersistenceSaveRecordV1<TSnapshot>
  >;
} {
  const recordSchema = createSaveRecordEnvelopeSchemaV1(
    options.snapshotSchema,
    buildProvenanceSchemaV1,
    saveSlotMetadataSchemaV1,
    simulationLineageSchemaV1,
  ) as RuntimeSchemaV1<PersistenceSaveRecordV1<TSnapshot>>;
  const codec: SaveCodecContextV1<TSnapshot, PersistenceSaveRecordV1<TSnapshot>> = Object.freeze({
    recordSchema,
    validateEnvelope(record: DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>) {
      const expectedReason =
        record.slot.slotId === "quick"
          ? "quick"
          : record.slot.slotId === "manual"
            ? "manual"
            : "auto";
      if (
        record.slot.storyId !== record.provenance.story.id ||
        record.slot.writeReason !== expectedReason ||
        record.slot.capturedCommandSequence !== record.snapshot.commandSequence
      ) {
        throw new TypeError("invalid Save envelope identity");
      }
      for (let index = 0; index < record.simulationLineage.length; index += 1) {
        const current = record.simulationLineage[index];
        const previous = record.simulationLineage[index - 1];
        const next = record.simulationLineage[index + 1];
        if (
          current === undefined ||
          current.toSimulationDigest !==
            (next?.fromSimulationDigest ?? record.provenance.resolved.simulationDigest) ||
          (previous !== undefined &&
            previous.adoptedAtCommandSequence > current.adoptedAtCommandSequence) ||
          current.adoptedAtCommandSequence > record.snapshot.commandSequence
        ) {
          throw new TypeError("invalid simulation lineage chain");
        }
      }
    },
  });
  const lease = createSessionLeaseV1({
    records: options.records,
    storyId: options.provenance.story.id,
    ownerId: options.ownerId,
    nextHandoffRequestId: options.nextHandoffRequestId,
  });
  const repository = createSaveRepositoryV1({
    records: options.records,
    storyId: options.provenance.story.id,
    codec,
  });
  const validation: SaveImportValidationContextV1<
    TState,
    TSnapshot,
    PersistenceSaveRecordV1<TSnapshot>
  > = Object.freeze({
    codec,
    classifyCompatibility(record: DeepReadonly<PersistenceSaveRecordV1<TSnapshot>>) {
      return classifySaveCompatibilityV1({
        stored: record.provenance,
        current: options.provenance,
        simulationLineage: record.simulationLineage,
        adoptionDeclaration: options.adoptionDeclaration,
        candidateCommandSequence: record.snapshot.commandSequence,
      });
    },
    validateReferences: options.validateReferences,
    validateInvariants: options.validateInvariants,
  });
  return Object.freeze({ repository, lease, validation });
}

export function createPersistenceServiceV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
>(
  options: CreatePersistenceServiceOptionsV1<TState, TSnapshot>,
): Promise<PersistenceServiceV1<TSnapshot>>;
export function createPersistenceServiceV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
>(
  options: CreateStandardPersistenceServiceOptionsV1<TState, TSnapshot>,
): Promise<PersistenceServiceV1<TSnapshot>>;
export function createPersistenceServiceV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
>(
  options:
    | CreatePersistenceServiceOptionsV1<TState, TSnapshot>
    | CreateStandardPersistenceServiceOptionsV1<TState, TSnapshot>,
): Promise<PersistenceServiceV1<TSnapshot>> {
  if ("repository" in options) {
    return createPersistenceServiceWithDependenciesV1(options);
  }
  const dependencies = createStandardPersistenceDependenciesV1(options);
  return createPersistenceServiceWithDependenciesV1({
    runtimeControl: options.runtimeControl,
    ...dependencies,
    provenance: options.provenance,
    initialSimulationLineage: options.initialSimulationLineage,
    metadataClock: options.metadataClock,
    exportFilename: options.exportFilename,
    ...(options.leaseAcquisition === undefined
      ? {}
      : { leaseAcquisition: options.leaseAcquisition }),
  });
}
