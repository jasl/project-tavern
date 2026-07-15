// SPDX-License-Identifier: MIT
import type {
  LeaseHandoffRequestId,
  PlayerWritableSaveSlotIdV1,
  SaveSlotIdV1,
  SessionLeaseOwnerId,
} from "./application.js";
import { digestBytes } from "./digest.js";
import type { IsoUtcInstant } from "./host.js";
import type { PatchSetAdoptionDeclarationV1, PatchSetIdentityV1 } from "./hotfix.js";
import type { BuildProvenanceV1 } from "./provenance.js";
import { parseStrictJsonLimitsV1 } from "./strict-json.js";
import type { StrictJsonErrorCodeV1 } from "./strict-json.js";
import type {
  DeepReadonly,
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

export interface SaveCompatibilityKeyV1 {
  readonly storyId: string;
  readonly storyRevision: PositiveSafeInteger;
  readonly stateContractRevision: PositiveSafeInteger;
  readonly stateContractDigest: Digest;
  readonly engineDigest: Digest;
  readonly simulationDigest: Digest;
}

export interface SimulationAdoptionV1 {
  readonly fromSimulationDigest: Digest;
  readonly toSimulationDigest: Digest;
  readonly viaSimulationPatchSetDigest: Digest;
  readonly adoptedAtCommandSequence: NonNegativeSafeInteger;
}

export type ImportValidationErrorCodeV1 =
  | StrictJsonErrorCodeV1
  | "envelope.schema_invalid"
  | "envelope.unsupported_revision"
  | "digest.invalid_format"
  | "digest.state_mismatch"
  | "identity.story_id_mismatch"
  | "identity.story_revision_mismatch"
  | "identity.state_contract_revision_mismatch"
  | "identity.state_contract_digest_mismatch"
  | "identity.engine_digest_mismatch"
  | "identity.simulation_digest_mismatch"
  | "reference.unknown_id"
  | "invariant.failed";

export type SaveCompatibilityMismatchV1 =
  | {
      readonly field: "story_id";
      readonly code: "identity.story_id_mismatch";
      readonly stored: string;
      readonly current: string;
    }
  | {
      readonly field: "story_revision";
      readonly code: "identity.story_revision_mismatch";
      readonly stored: PositiveSafeInteger;
      readonly current: PositiveSafeInteger;
    }
  | {
      readonly field: "state_contract_revision";
      readonly code: "identity.state_contract_revision_mismatch";
      readonly stored: PositiveSafeInteger;
      readonly current: PositiveSafeInteger;
    }
  | {
      readonly field: "state_contract_digest";
      readonly code: "identity.state_contract_digest_mismatch";
      readonly stored: Digest;
      readonly current: Digest;
    }
  | {
      readonly field: "engine_digest";
      readonly code: "identity.engine_digest_mismatch";
      readonly stored: Digest;
      readonly current: Digest;
    }
  | {
      readonly field: "simulation_digest";
      readonly code: "identity.simulation_digest_mismatch";
      readonly stored: Digest;
      readonly current: Digest;
    };

export type ImportCompatibilityWarningV1 =
  | {
      readonly field: "story_digest";
      readonly code: "identity.story_digest_mismatch";
      readonly stored: Digest;
      readonly current: Digest;
    }
  | {
      readonly field: "presentation_digest";
      readonly code: "identity.presentation_digest_mismatch";
      readonly stored: Digest;
      readonly current: Digest;
    }
  | {
      readonly field: "hotfix_set";
      readonly code: "identity.hotfix_set_mismatch";
      readonly stored: PatchSetIdentityV1;
      readonly current: PatchSetIdentityV1;
    };

export type ImportRejectionCodeV1 =
  | StrictJsonErrorCodeV1
  | "envelope.schema_invalid"
  | "envelope.unsupported_revision"
  | "digest.invalid_format"
  | "digest.state_mismatch"
  | "compatibility.lineage_limit"
  | "reference.unknown_id"
  | "invariant.failed";

export type ImportCompatibilityOutcomeV1 =
  | {
      readonly kind: "exact";
      readonly mismatches: readonly [];
      readonly warnings: readonly ImportCompatibilityWarningV1[];
    }
  | {
      readonly kind: "adopted";
      readonly mismatches: readonly [];
      readonly warnings: readonly ImportCompatibilityWarningV1[];
      readonly adoption: SimulationAdoptionV1;
    }
  | {
      readonly kind: "inspect_only";
      readonly mismatches: readonly [SaveCompatibilityMismatchV1, ...SaveCompatibilityMismatchV1[]];
      readonly warnings: readonly ImportCompatibilityWarningV1[];
    }
  | { readonly kind: "rejected"; readonly code: ImportRejectionCodeV1 };

export type SaveRecordDecodeRejectionCodeV1 =
  | StrictJsonErrorCodeV1
  | "envelope.schema_invalid"
  | "envelope.unsupported_revision"
  | "digest.invalid_format"
  | "digest.state_mismatch";

export type SaveRecordDecodeResultV1<TSaveRecord> =
  | { readonly kind: "decoded"; readonly record: DeepReadonly<TSaveRecord> }
  | { readonly kind: "rejected"; readonly code: SaveRecordDecodeRejectionCodeV1 };

export interface SaveCodecContextV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
> {
  readonly recordSchema: RuntimeSchemaV1<TSaveRecord>;
  validateEnvelope(record: DeepReadonly<TSaveRecord>): void;
}

export interface SaveCompatibilityClassificationInputV1 {
  readonly stored: DeepReadonly<BuildProvenanceV1>;
  readonly current: DeepReadonly<BuildProvenanceV1>;
  readonly simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[];
  readonly adoptionDeclaration: DeepReadonly<PatchSetAdoptionDeclarationV1> | null;
  readonly candidateCommandSequence: NonNegativeSafeInteger;
}

export type SaveCompatibilityClassificationV1 =
  | Extract<ImportCompatibilityOutcomeV1, { readonly kind: "exact" }>
  | {
      readonly kind: "adoption_candidate";
      readonly mismatches: readonly [];
      readonly warnings: readonly ImportCompatibilityWarningV1[];
      readonly adoption: SimulationAdoptionV1;
    }
  | Extract<ImportCompatibilityOutcomeV1, { readonly kind: "inspect_only" | "rejected" }>;

export type SaveImportValidationResultV1<TSaveRecord> =
  | (Extract<ImportCompatibilityOutcomeV1, { readonly kind: "exact" | "adopted" }> & {
      readonly candidate: DeepReadonly<TSaveRecord>;
    })
  | Extract<ImportCompatibilityOutcomeV1, { readonly kind: "inspect_only" | "rejected" }>;

export interface SaveImportInvariantViewV1<TState> {
  readonly state: TState;
  readonly commandSequence: NonNegativeSafeInteger;
}

export interface SaveImportValidationContextV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
> {
  readonly codec: SaveCodecContextV1<TSnapshot, TSaveRecord>;
  classifyCompatibility(record: DeepReadonly<TSaveRecord>): SaveCompatibilityClassificationV1;
  validateReferences(state: DeepReadonly<TState>): readonly string[];
  validateInvariants(view: DeepReadonly<SaveImportInvariantViewV1<TState>>): readonly string[];
}

type SaveRecordEnvelopeSchemaFailureCodeV1 =
  "envelope.unsupported_revision" | "digest.invalid_format";

export class SaveRecordEnvelopeSchemaFailureV1 extends TypeError {
  readonly code: SaveRecordEnvelopeSchemaFailureCodeV1;

  constructor(code: SaveRecordEnvelopeSchemaFailureCodeV1) {
    super(code);
    this.name = "SaveRecordEnvelopeSchemaFailureV1";
    this.code = code;
  }
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
      const formatRevision = fields.formatRevision?.value;
      if (formatRevision !== 1) {
        if (
          typeof formatRevision === "number" &&
          Number.isSafeInteger(formatRevision) &&
          !Object.is(formatRevision, -0) &&
          formatRevision > 0
        ) {
          throw new SaveRecordEnvelopeSchemaFailureV1("envelope.unsupported_revision");
        }
        throw new TypeError("invalid Save formatRevision");
      }
      const recordRevision = parsePositiveSafeInteger(fields.recordRevision?.value);
      const provenance = provenanceSchema.parse(fields.provenance?.value);
      const slot = slotMetadataSchema.parse(fields.slot?.value);
      const savedAt = parseIsoUtcInstantV1(fields.savedAt?.value);
      let stateDigest: Digest;
      try {
        stateDigest = parseDigest(fields.stateDigest?.value);
      } catch {
        throw new SaveRecordEnvelopeSchemaFailureV1("digest.invalid_format");
      }
      return Object.freeze({
        formatRevision: 1 as const,
        recordRevision,
        provenance,
        slot,
        savedAt,
        stateDigest,
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
