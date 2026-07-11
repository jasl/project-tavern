// SPDX-License-Identifier: MIT
import type {
  LeaseHandoffRequestId,
  PlayerWritableSaveSlotIdV1,
  SaveSlotIdV1,
  SessionLeaseOwnerId,
} from "./application.js";
import { digestBytes } from "./digest.js";
import type { IsoUtcInstant } from "./host.js";
import { parseStrictJsonLimitsV1 } from "./strict-json.js";
import type {
  Digest,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
  RuntimeSchemaV1,
} from "./values.js";
import { parseDigest, parsePositiveSafeInteger } from "./values.js";

export type SaveSlotHealthV1 = "empty" | "valid" | "invalid" | "recovery_candidate" | "unavailable";

export interface SaveSlotSummaryV1 {
  readonly slotId: SaveSlotIdV1;
  readonly health: SaveSlotHealthV1;
  readonly recordRevision: PositiveSafeInteger | null;
  readonly capturedCommandSequence: NonNegativeSafeInteger | null;
  readonly savedAt: IsoUtcInstant | null;
  readonly warningCodes: readonly string[];
}

export interface PersistenceStatusV1 {
  readonly available: boolean;
  readonly busy: boolean;
  readonly safelySavedCommandSequence: NonNegativeSafeInteger | null;
  readonly lastFailureCode: string | null;
}

export type PersistenceOperationResultV1 =
  | { readonly kind: "saved" | "cleared"; readonly slotId: SaveSlotIdV1 }
  | {
      readonly kind: "loaded" | "imported";
      readonly compatibility: "exact" | "adopted";
      readonly commandSequence: NonNegativeSafeInteger;
    }
  | {
      readonly kind: "rejected";
      readonly code:
        | "busy"
        | "unavailable"
        | "empty_slot"
        | "conflict"
        | "invalid_record"
        | "lineage_limit"
        | "incompatible";
    }
  | { readonly kind: "faulted"; readonly code: string };

export interface ExportedSaveV1 {
  readonly filename: string;
  readonly mediaType: "application/json";
  readonly digest: Digest;
  readonly bytes: Uint8Array;
}

export type SaveExportOperationResultV1 =
  | {
      readonly kind: "exported";
      readonly slotId: SaveSlotIdV1;
      readonly file: ExportedSaveV1;
    }
  | {
      readonly kind: "rejected";
      readonly code: "unavailable" | "empty_slot" | "conflict" | "invalid_record";
    }
  | { readonly kind: "faulted"; readonly code: string };

export type SessionLeaseStatusV1 =
  | {
      readonly kind: "owned";
      readonly ownerId: SessionLeaseOwnerId;
      readonly fencingToken: PositiveSafeInteger;
    }
  | {
      readonly kind: "readonly";
      readonly ownerId: SessionLeaseOwnerId;
      readonly fencingToken: PositiveSafeInteger;
    }
  | {
      readonly kind: "handoff_requested";
      readonly ownerId: SessionLeaseOwnerId;
      readonly fencingToken: PositiveSafeInteger;
      readonly requestId: LeaseHandoffRequestId;
      readonly requestedByOwnerId: SessionLeaseOwnerId;
    }
  | {
      readonly kind: "unowned";
      readonly ownerId: null;
      readonly fencingToken: PositiveSafeInteger;
    }
  | {
      readonly kind: "unavailable";
      readonly ownerId: null;
      readonly fencingToken: null;
      readonly code: string;
    };

export type SessionLeaseOperationResultV1 =
  | { readonly kind: "updated"; readonly status: SessionLeaseStatusV1 }
  | {
      readonly kind: "rejected";
      readonly code: "conflict" | "unavailable" | "unknown_request";
    };

export type SaveWriteReasonV1 = "auto" | PlayerWritableSaveSlotIdV1;

export interface SaveRecordEnvelopeV1<TSnapshot, TProvenance, TSlotMetadata, TSimulationLineage> {
  readonly formatRevision: 1;
  readonly recordRevision: PositiveSafeInteger;
  readonly provenance: TProvenance;
  readonly slot: TSlotMetadata;
  readonly savedAt: IsoUtcInstant;
  readonly stateDigest: Digest;
  readonly snapshot: TSnapshot;
  readonly simulationLineage: TSimulationLineage;
}

type ExactRecord = Record<string, PropertyDescriptor>;

function exactDescriptors(value: unknown, fields: readonly string[], label: string): ExactRecord {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).sort().join("\0") !== [...fields].sort().join("\0")) {
    throw new TypeError(`invalid ${label} fields`);
  }
  if (Object.values(descriptors).some(({ get, set }) => get !== undefined || set !== undefined)) {
    throw new TypeError(`${label} accessors are forbidden`);
  }
  return descriptors;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`invalid ${label}`);
  return value;
}

export function parseIsoUtcInstantV1(value: unknown): IsoUtcInstant {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new TypeError("invalid IsoUtcInstant");
  }
  return value as IsoUtcInstant;
}

function parseByteExport<T extends ExportedSaveV1>(value: unknown, label: string): T {
  const fields = ["filename", "mediaType", "digest", "bytes"] as const;
  const descriptors = exactDescriptors(value, fields, label);
  const bytesValue = descriptors.bytes?.value;
  if (
    !(bytesValue instanceof Uint8Array) ||
    Object.getPrototypeOf(bytesValue) !== Uint8Array.prototype
  ) {
    throw new TypeError(`invalid ${label} bytes`);
  }
  const bytes = Uint8Array.from(bytesValue);
  const digest = parseDigest(descriptors.digest?.value);
  if (digest !== digestBytes(bytes)) throw new TypeError(`${label} digest mismatch`);
  if (descriptors.mediaType?.value !== "application/json") {
    throw new TypeError(`invalid ${label} mediaType`);
  }
  return Object.freeze({
    filename: requiredString(descriptors.filename?.value, `${label} filename`),
    mediaType: "application/json" as const,
    digest,
    bytes,
  }) as T;
}

export const exportedSaveSchemaV1: RuntimeSchemaV1<ExportedSaveV1> = Object.freeze({
  parse(value: unknown) {
    return parseByteExport<ExportedSaveV1>(value, "ExportedSaveV1");
  },
});

export const sessionLeaseStatusSchemaV1: RuntimeSchemaV1<SessionLeaseStatusV1> = Object.freeze({
  parse(value: unknown) {
    if (value === null || typeof value !== "object") {
      throw new TypeError("invalid SessionLeaseStatusV1");
    }
    const kind = Reflect.get(value, "kind");
    if (kind === "owned" || kind === "readonly") {
      const fields = exactDescriptors(
        value,
        ["kind", "ownerId", "fencingToken"],
        "SessionLeaseStatusV1",
      );
      return Object.freeze({
        kind,
        ownerId: requiredString(fields.ownerId?.value, "ownerId") as SessionLeaseOwnerId,
        fencingToken: parsePositiveSafeInteger(fields.fencingToken?.value),
      });
    }
    if (kind === "handoff_requested") {
      const fields = exactDescriptors(
        value,
        ["kind", "ownerId", "fencingToken", "requestId", "requestedByOwnerId"],
        "SessionLeaseStatusV1",
      );
      return Object.freeze({
        kind,
        ownerId: requiredString(fields.ownerId?.value, "ownerId") as SessionLeaseOwnerId,
        fencingToken: parsePositiveSafeInteger(fields.fencingToken?.value),
        requestId: requiredString(fields.requestId?.value, "requestId") as LeaseHandoffRequestId,
        requestedByOwnerId: requiredString(
          fields.requestedByOwnerId?.value,
          "requestedByOwnerId",
        ) as SessionLeaseOwnerId,
      });
    }
    if (kind === "unowned") {
      const fields = exactDescriptors(
        value,
        ["kind", "ownerId", "fencingToken"],
        "SessionLeaseStatusV1",
      );
      if (fields.ownerId?.value !== null) throw new TypeError("unowned lease has an owner");
      return Object.freeze({
        kind,
        ownerId: null,
        fencingToken: parsePositiveSafeInteger(fields.fencingToken?.value),
      });
    }
    if (kind === "unavailable") {
      const fields = exactDescriptors(
        value,
        ["kind", "ownerId", "fencingToken", "code"],
        "SessionLeaseStatusV1",
      );
      if (fields.ownerId?.value !== null || fields.fencingToken?.value !== null) {
        throw new TypeError("unavailable lease carries ownership");
      }
      return Object.freeze({
        kind,
        ownerId: null,
        fencingToken: null,
        code: requiredString(fields.code?.value, "lease unavailable code"),
      });
    }
    throw new TypeError("invalid SessionLeaseStatusV1 kind");
  },
});

export function createSaveRecordEnvelopeSchemaV1<
  TSnapshot,
  TProvenance,
  TSlotMetadata,
  TSimulationLineage,
>(
  snapshotSchema: RuntimeSchemaV1<TSnapshot>,
  provenanceSchema: RuntimeSchemaV1<TProvenance>,
  slotMetadataSchema: RuntimeSchemaV1<TSlotMetadata>,
  simulationLineageSchema: RuntimeSchemaV1<TSimulationLineage>,
): RuntimeSchemaV1<
  SaveRecordEnvelopeV1<TSnapshot, TProvenance, TSlotMetadata, TSimulationLineage>
> {
  return Object.freeze({
    parse(value: unknown) {
      const fields = exactDescriptors(
        value,
        [
          "formatRevision",
          "recordRevision",
          "provenance",
          "slot",
          "savedAt",
          "stateDigest",
          "snapshot",
          "simulationLineage",
        ],
        "SaveRecordEnvelopeV1",
      );
      if (fields.formatRevision?.value !== 1) throw new TypeError("invalid Save formatRevision");
      return Object.freeze({
        formatRevision: 1 as const,
        recordRevision: parsePositiveSafeInteger(fields.recordRevision?.value),
        provenance: provenanceSchema.parse(fields.provenance?.value),
        slot: slotMetadataSchema.parse(fields.slot?.value),
        savedAt: parseIsoUtcInstantV1(fields.savedAt?.value),
        stateDigest: parseDigest(fields.stateDigest?.value),
        snapshot: snapshotSchema.parse(fields.snapshot?.value),
        simulationLineage: simulationLineageSchema.parse(fields.simulationLineage?.value),
      });
    },
  });
}

export const saveJsonLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: 5_242_880,
  maxDepth: 64,
  maxArrayItems: 10_000,
  maxObjectMembers: 10_000,
  maxNodes: 100_000,
  maxStringBytes: 262_144,
});

export { exactDescriptors as exactEnvelopeDescriptorsV1, parseByteExport as parseByteExportV1 };
