// SPDX-License-Identifier: MIT
import { canonicalJsonBytes } from "../../contracts/canonical-json.js";
import { digestCanonical } from "../../contracts/digest.js";
import {
  SaveRecordEnvelopeSchemaFailureV1,
  saveJsonLimitsV1,
} from "../../contracts/persistence.js";
import type {
  SaveCodecContextV1,
  SaveRecordDecodeResultV1,
  SaveRecordEnvelopeV1,
} from "../../contracts/persistence.js";
import { parseStrictJson } from "../../contracts/strict-json.js";
import type { DeepReadonly } from "../../contracts/values.js";

function parseRecordV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
>(
  value: unknown,
  context: SaveCodecContextV1<TSnapshot, TSaveRecord>,
):
  | { readonly kind: "parsed"; readonly record: DeepReadonly<TSaveRecord> }
  | {
      readonly kind: "rejected";
      readonly code:
        "envelope.schema_invalid" | "envelope.unsupported_revision" | "digest.invalid_format";
    } {
  let record: DeepReadonly<TSaveRecord>;
  try {
    record = context.recordSchema.parse(value) as DeepReadonly<TSaveRecord>;
    context.validateEnvelope(record);
  } catch (error) {
    if (error instanceof SaveRecordEnvelopeSchemaFailureV1) {
      return Object.freeze({ kind: "rejected", code: error.code });
    }
    return Object.freeze({ kind: "rejected", code: "envelope.schema_invalid" });
  }
  return Object.freeze({ kind: "parsed", record });
}

function hasMatchingStateDigestV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
>(record: DeepReadonly<TSaveRecord>): boolean {
  return record.stateDigest === digestCanonical("sillymaker:state:v1", record.snapshot);
}

export function encodeSaveRecordV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
>(
  record: DeepReadonly<TSaveRecord>,
  context: SaveCodecContextV1<TSnapshot, TSaveRecord>,
): Uint8Array {
  const parsed = context.recordSchema.parse(record) as DeepReadonly<TSaveRecord>;
  context.validateEnvelope(parsed);
  if (!hasMatchingStateDigestV1(parsed)) {
    throw new TypeError("Save state digest mismatch");
  }
  const bytes = canonicalJsonBytes(parsed);
  const preflight = parseStrictJson(bytes, saveJsonLimitsV1);
  if (!preflight.ok) {
    throw new TypeError(`Save record violates Strict JSON constraints: ${preflight.error.code}`);
  }
  return bytes;
}

export function decodeSaveRecordV1<
  TSnapshot,
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, unknown, unknown, unknown>,
>(
  bytes: Uint8Array,
  context: SaveCodecContextV1<TSnapshot, TSaveRecord>,
): SaveRecordDecodeResultV1<TSaveRecord> {
  const decoded = parseStrictJson(bytes, saveJsonLimitsV1);
  if (!decoded.ok) {
    return Object.freeze({ kind: "rejected", code: decoded.error.code });
  }
  const parsed = parseRecordV1(decoded.value, context);
  if (parsed.kind === "rejected") return parsed;
  if (!hasMatchingStateDigestV1(parsed.record)) {
    return Object.freeze({ kind: "rejected", code: "digest.state_mismatch" });
  }
  return Object.freeze({ kind: "decoded", record: parsed.record });
}
