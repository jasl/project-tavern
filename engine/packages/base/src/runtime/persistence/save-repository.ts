// SPDX-License-Identifier: MIT
import type { SaveSlotIdV1 } from "../../contracts/application.js";
import type {
  HostAtomicRecordStoreV1,
  HostRecordMutationV1,
  HostRecordRevisionV1,
  HostStoredRecordV1,
} from "../../contracts/host.js";
import type {
  SaveCodecContextV1,
  SaveRecordEnvelopeV1,
  SaveWriteReasonV1,
} from "../../contracts/persistence.js";
import type {
  DeepReadonly,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
} from "../../contracts/values.js";
import { parsePositiveSafeInteger } from "../../contracts/values.js";
import { decodeSaveRecordV1, encodeSaveRecordV1 } from "./save-codec.js";
import { decodeSessionLeaseRecordV1 } from "./session-lease.js";
import type { SessionLeaseFenceV1 } from "./session-lease.js";
import { createSaveSlotRecordKeyV1, createSessionLeaseRecordKeyV1 } from "./slot-keys.js";

export interface SaveRepositorySlotMetadataV1 {
  readonly storyId: string;
  readonly slotId: SaveSlotIdV1;
  readonly writeReason: SaveWriteReasonV1;
  readonly capturedCommandSequence: NonNegativeSafeInteger;
}

export type SaveRepositoryReadResultV1<TSaveRecord> =
  | {
      readonly health: "empty";
      readonly slotId: SaveSlotIdV1;
      readonly hostRevision: null;
      readonly record: null;
      readonly code: null;
    }
  | {
      readonly health: "valid";
      readonly slotId: SaveSlotIdV1;
      readonly hostRevision: HostRecordRevisionV1;
      readonly record: DeepReadonly<TSaveRecord>;
      readonly code: null;
    }
  | {
      readonly health: "invalid";
      readonly slotId: SaveSlotIdV1;
      readonly hostRevision: HostRecordRevisionV1;
      readonly record: null;
      readonly code: string;
    }
  | {
      readonly health: "unavailable";
      readonly slotId: SaveSlotIdV1;
      readonly hostRevision: null;
      readonly record: null;
      readonly code: string;
    };

export type SaveRepositoryWriteResultV1 =
  | {
      readonly kind: "saved";
      readonly slotId: SaveSlotIdV1;
      readonly recordRevision: PositiveSafeInteger;
    }
  | {
      readonly kind: "rejected";
      readonly code: "conflict" | "unavailable" | "invalid_record" | "empty_slot";
    };

export type SaveRepositoryClearResultV1 =
  | { readonly kind: "cleared"; readonly slotId: SaveSlotIdV1 }
  | Extract<SaveRepositoryWriteResultV1, { readonly kind: "rejected" }>;

export interface SaveRepositoryV1<TSaveRecord> {
  read(slotId: SaveSlotIdV1): Promise<SaveRepositoryReadResultV1<TSaveRecord>>;
  writeAuto(
    record: DeepReadonly<TSaveRecord>,
    fence: DeepReadonly<SessionLeaseFenceV1>,
  ): Promise<SaveRepositoryWriteResultV1>;
  writeQuick(
    record: DeepReadonly<TSaveRecord>,
    fence: DeepReadonly<SessionLeaseFenceV1>,
  ): Promise<SaveRepositoryWriteResultV1>;
  writeManual(
    record: DeepReadonly<TSaveRecord>,
    fence: DeepReadonly<SessionLeaseFenceV1>,
  ): Promise<SaveRepositoryWriteResultV1>;
  clear(
    slotId: SaveSlotIdV1,
    fence: DeepReadonly<SessionLeaseFenceV1>,
  ): Promise<SaveRepositoryClearResultV1>;
}

export interface CreateSaveRepositoryOptionsV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<
    TSnapshot,
    unknown,
    SaveRepositorySlotMetadataV1,
    unknown
  >,
> {
  readonly records: HostAtomicRecordStoreV1;
  readonly storyId: string;
  readonly codec: SaveCodecContextV1<TSnapshot, TSaveRecord>;
}

type PhysicalDecodeResultV1<TSaveRecord> =
  | { readonly kind: "valid"; readonly record: DeepReadonly<TSaveRecord> }
  | { readonly kind: "invalid"; readonly code: string };

type LeaseTouchResultV1 =
  | { readonly kind: "ready"; readonly mutation: HostRecordMutationV1 }
  | { readonly kind: "rejected"; readonly code: "conflict" | "invalid_record" };

const expectedWriteReasonV1 = (slotId: SaveSlotIdV1): SaveWriteReasonV1 =>
  slotId === "quick" ? "quick" : slotId === "manual" ? "manual" : "auto";

const indexedDbFailureCodesV1 = Object.freeze([
  "indexeddb.unavailable",
  "indexeddb.database_newer",
  "indexeddb.upgrade_blocked",
  "indexeddb.quota_exceeded",
  "indexeddb.transaction_aborted",
  "indexeddb.request_failed",
  "indexeddb.schema_invalid",
] as const);
const indexedDbFailureOperationsV1 = Object.freeze(["open", "read", "list", "commit"] as const);

function dataPropertyValueV1(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor !== undefined &&
    descriptor.get === undefined &&
    descriptor.set === undefined &&
    "value" in descriptor
    ? descriptor.value
    : undefined;
}

function stableHostFailureCodeV1(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const name = dataPropertyValueV1(error, "name");
  const code = dataPropertyValueV1(error, "code");
  const operation = dataPropertyValueV1(error, "operation");
  return name === "IndexedDbRecordStoreFailureV1" &&
    indexedDbFailureCodesV1.some((candidate) => candidate === code) &&
    indexedDbFailureOperationsV1.some((candidate) => candidate === operation)
    ? (code as (typeof indexedDbFailureCodesV1)[number])
    : null;
}

class HostRecordStoreUnavailableV1 {
  readonly code: string;

  constructor(code: string) {
    this.code = code;
  }
}

async function callHostRecordStoreV1<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const code = stableHostFailureCodeV1(error);
    if (code === null) throw error;
    throw new HostRecordStoreUnavailableV1(code);
  }
}

function nextRecordRevisionV1(revision: HostRecordRevisionV1 | null): PositiveSafeInteger | null {
  try {
    return parsePositiveSafeInteger((revision ?? 0) + 1);
  } catch {
    return null;
  }
}

export function createSaveRepositoryV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<
    TSnapshot,
    unknown,
    SaveRepositorySlotMetadataV1,
    unknown
  >,
>(options: CreateSaveRepositoryOptionsV1<TSnapshot, TSaveRecord>): SaveRepositoryV1<TSaveRecord> {
  if (typeof options.storyId !== "string" || options.storyId.length === 0) {
    throw new TypeError("invalid Save repository Story ID");
  }
  const leaseKey = createSessionLeaseRecordKeyV1(options.storyId);

  const decodePhysicalV1 = (
    stored: HostStoredRecordV1,
    slotId: SaveSlotIdV1,
  ): PhysicalDecodeResultV1<TSaveRecord> => {
    const decoded = decodeSaveRecordV1(stored.bytes, options.codec);
    if (decoded.kind === "rejected") {
      return Object.freeze({ kind: "invalid", code: decoded.code });
    }
    if (Number(decoded.record.recordRevision) !== Number(stored.revision)) {
      return Object.freeze({
        kind: "invalid",
        code: "persistence.record_revision_mismatch",
      });
    }
    if (
      decoded.record.slot.storyId !== options.storyId ||
      decoded.record.slot.slotId !== slotId ||
      decoded.record.slot.writeReason !== expectedWriteReasonV1(slotId)
    ) {
      return Object.freeze({ kind: "invalid", code: "persistence.slot_identity_mismatch" });
    }
    return Object.freeze({ kind: "valid", record: decoded.record });
  };

  const encodeForSlotV1 = (
    candidate: DeepReadonly<TSaveRecord>,
    slotId: SaveSlotIdV1,
    recordRevision: PositiveSafeInteger,
  ): Uint8Array => {
    const normalized = Object.freeze({
      ...candidate,
      recordRevision,
      slot: Object.freeze({
        storyId: options.storyId,
        slotId,
        writeReason: expectedWriteReasonV1(slotId),
        capturedCommandSequence: candidate.slot.capturedCommandSequence,
      }),
    }) as DeepReadonly<TSaveRecord>;
    return encodeSaveRecordV1(normalized, options.codec);
  };

  const readLeaseTouchV1 = async (
    fence: DeepReadonly<SessionLeaseFenceV1>,
  ): Promise<LeaseTouchResultV1> => {
    const stored = await callHostRecordStoreV1(() => options.records.read("lease", leaseKey));
    if (stored === null) return Object.freeze({ kind: "rejected", code: "conflict" });
    const decoded = decodeSessionLeaseRecordV1(stored.bytes);
    if (decoded.kind === "invalid") {
      return Object.freeze({ kind: "rejected", code: "invalid_record" });
    }
    if (
      decoded.record.ownerId !== fence.ownerId ||
      decoded.record.fencingToken !== fence.fencingToken
    ) {
      return Object.freeze({ kind: "rejected", code: "conflict" });
    }
    return Object.freeze({
      kind: "ready",
      mutation: Object.freeze({
        kind: "put",
        namespace: "lease",
        key: leaseKey,
        expectedRevision: stored.revision,
        bytes: Uint8Array.from(stored.bytes),
      }),
    });
  };

  const rejectedV1 = (code: "conflict" | "unavailable" | "invalid_record" | "empty_slot") =>
    Object.freeze({ kind: "rejected" as const, code });

  const runWriteV1 = async <TResult>(operation: () => Promise<TResult>): Promise<TResult> => {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HostRecordStoreUnavailableV1) {
        return rejectedV1("unavailable") as TResult;
      }
      throw error;
    }
  };

  const writeSingleV1 = (
    slotId: "quick" | "manual",
    candidate: DeepReadonly<TSaveRecord>,
    fence: DeepReadonly<SessionLeaseFenceV1>,
  ): Promise<SaveRepositoryWriteResultV1> =>
    runWriteV1(async () => {
      const [current, lease] = await Promise.all([
        callHostRecordStoreV1(() =>
          options.records.read("save", createSaveSlotRecordKeyV1(options.storyId, slotId)),
        ),
        readLeaseTouchV1(fence),
      ]);
      if (lease.kind === "rejected") return rejectedV1(lease.code);
      if (current !== null && decodePhysicalV1(current, slotId).kind === "invalid") {
        return rejectedV1("invalid_record");
      }
      const recordRevision = nextRecordRevisionV1(current?.revision ?? null);
      if (recordRevision === null) return rejectedV1("invalid_record");
      const bytes = encodeForSlotV1(candidate, slotId, recordRevision);
      const result = await callHostRecordStoreV1(() =>
        options.records.commit([
          Object.freeze({
            kind: "put",
            namespace: "save",
            key: createSaveSlotRecordKeyV1(options.storyId, slotId),
            expectedRevision: current?.revision ?? null,
            bytes,
          }),
          lease.mutation,
        ]),
      );
      return result.kind === "conflict"
        ? rejectedV1("conflict")
        : Object.freeze({ kind: "saved" as const, slotId, recordRevision });
    });

  const repository: SaveRepositoryV1<TSaveRecord> = {
    async read(slotId) {
      try {
        const stored = await callHostRecordStoreV1(() =>
          options.records.read("save", createSaveSlotRecordKeyV1(options.storyId, slotId)),
        );
        if (stored === null) {
          return Object.freeze({
            health: "empty" as const,
            slotId,
            hostRevision: null,
            record: null,
            code: null,
          });
        }
        const decoded = decodePhysicalV1(stored, slotId);
        if (decoded.kind === "invalid") {
          return Object.freeze({
            health: "invalid" as const,
            slotId,
            hostRevision: stored.revision,
            record: null,
            code: decoded.code,
          });
        }
        return Object.freeze({
          health: "valid" as const,
          slotId,
          hostRevision: stored.revision,
          record: decoded.record,
          code: null,
        });
      } catch (error) {
        if (!(error instanceof HostRecordStoreUnavailableV1)) throw error;
        return Object.freeze({
          health: "unavailable" as const,
          slotId,
          hostRevision: null,
          record: null,
          code: error.code,
        });
      }
    },

    writeAuto(candidate, fence) {
      return runWriteV1(async () => {
        const currentKey = createSaveSlotRecordKeyV1(options.storyId, "auto.current");
        const previousKey = createSaveSlotRecordKeyV1(options.storyId, "auto.previous");
        const [current, previous, lease] = await Promise.all([
          callHostRecordStoreV1(() => options.records.read("save", currentKey)),
          callHostRecordStoreV1(() => options.records.read("save", previousKey)),
          readLeaseTouchV1(fence),
        ]);
        if (lease.kind === "rejected") return rejectedV1(lease.code);
        const currentRevision = nextRecordRevisionV1(current?.revision ?? null);
        if (currentRevision === null) return rejectedV1("invalid_record");
        const decodedCurrent = current === null ? null : decodePhysicalV1(current, "auto.current");
        const mutations: HostRecordMutationV1[] = [];
        if (decodedCurrent?.kind === "valid") {
          const previousRevision = nextRecordRevisionV1(previous?.revision ?? null);
          if (previousRevision === null) return rejectedV1("invalid_record");
          mutations.push(
            Object.freeze({
              kind: "put",
              namespace: "save",
              key: previousKey,
              expectedRevision: previous?.revision ?? null,
              bytes: encodeForSlotV1(decodedCurrent.record, "auto.previous", previousRevision),
            }),
          );
        }
        mutations.push(
          Object.freeze({
            kind: "put",
            namespace: "save",
            key: currentKey,
            expectedRevision: current?.revision ?? null,
            bytes: encodeForSlotV1(candidate, "auto.current", currentRevision),
          }),
          lease.mutation,
        );
        const result = await callHostRecordStoreV1(() =>
          options.records.commit(mutations as [HostRecordMutationV1, ...HostRecordMutationV1[]]),
        );
        return result.kind === "conflict"
          ? rejectedV1("conflict")
          : Object.freeze({
              kind: "saved" as const,
              slotId: "auto.current" as const,
              recordRevision: currentRevision,
            });
      });
    },

    writeQuick(candidate, fence) {
      return writeSingleV1("quick", candidate, fence);
    },

    writeManual(candidate, fence) {
      return writeSingleV1("manual", candidate, fence);
    },

    clear(slotId, fence) {
      return runWriteV1(async () => {
        const key = createSaveSlotRecordKeyV1(options.storyId, slotId);
        const [stored, lease] = await Promise.all([
          callHostRecordStoreV1(() => options.records.read("save", key)),
          readLeaseTouchV1(fence),
        ]);
        if (lease.kind === "rejected") return rejectedV1(lease.code);
        if (stored === null) return rejectedV1("empty_slot");
        const result = await callHostRecordStoreV1(() =>
          options.records.commit([
            Object.freeze({
              kind: "delete",
              namespace: "save",
              key,
              expectedRevision: stored.revision,
            }),
            lease.mutation,
          ]),
        );
        return result.kind === "conflict"
          ? rejectedV1("conflict")
          : Object.freeze({ kind: "cleared" as const, slotId });
      });
    },
  };
  return Object.freeze(repository);
}
