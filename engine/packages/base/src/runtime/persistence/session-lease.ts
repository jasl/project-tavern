// SPDX-License-Identifier: MIT
import type { LeaseHandoffRequestId, SessionLeaseOwnerId } from "../../contracts/application.js";
import { canonicalJsonBytes } from "../../contracts/canonical-json.js";
import type {
  HostAtomicRecordStoreV1,
  HostRecordRevisionV1,
  HostStoredRecordV1,
} from "../../contracts/host.js";
import type {
  SessionLeaseOperationResultV1,
  SessionLeaseStatusV1,
} from "../../contracts/persistence.js";
import { parseStrictJson, parseStrictJsonLimitsV1 } from "../../contracts/strict-json.js";
import type { PositiveSafeInteger } from "../../contracts/values.js";
import { parsePositiveSafeInteger } from "../../contracts/values.js";
import { createSessionLeaseRecordKeyV1 } from "./slot-keys.js";

export interface SessionLeaseFenceV1 {
  readonly ownerId: SessionLeaseOwnerId;
  readonly fencingToken: PositiveSafeInteger;
}

export interface SessionLeaseRecordV1 {
  readonly formatRevision: 1;
  readonly ownerId: SessionLeaseOwnerId | null;
  readonly fencingToken: PositiveSafeInteger;
  readonly handoff: {
    readonly requestId: LeaseHandoffRequestId;
    readonly requestedByOwnerId: SessionLeaseOwnerId;
  } | null;
}

export type SessionLeaseRecordDecodeResultV1 =
  | { readonly kind: "decoded"; readonly record: SessionLeaseRecordV1 }
  | { readonly kind: "invalid" };

export interface SessionLeaseV1 {
  getStatus(): Promise<SessionLeaseStatusV1>;
  acquireInitial(): Promise<SessionLeaseStatusV1>;
  captureFence(): SessionLeaseFenceV1 | null;
  requestHandoff(): Promise<SessionLeaseOperationResultV1>;
  approveHandoff(requestId: LeaseHandoffRequestId): Promise<SessionLeaseOperationResultV1>;
  takeOver(): Promise<SessionLeaseOperationResultV1>;
  takeOverUnowned(
    expectedFencingToken: PositiveSafeInteger,
  ): Promise<SessionLeaseOperationResultV1>;
  release(): Promise<SessionLeaseOperationResultV1>;
  releaseFence(fence: SessionLeaseFenceV1): Promise<SessionLeaseOperationResultV1>;
}

const leaseJsonLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: 4_096,
  maxDepth: 4,
  maxArrayItems: 1,
  maxObjectMembers: 8,
  maxNodes: 16,
  maxStringBytes: 256,
});
const leaseRecordKeysV1 = ["fencingToken", "formatRevision", "handoff", "ownerId"] as const;
const handoffKeysV1 = ["requestId", "requestedByOwnerId"] as const;
const invalidLeaseCodeV1 = "lease.invalid_record";
const absentLeaseCodeV1 = "lease.not_initialized";

type ExactRecordV1 = Record<string, PropertyDescriptor>;

function exactDescriptorsV1(value: unknown, keys: readonly string[], label: string): ExactRecordV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Reflect.ownKeys(value).some((key) => typeof key !== "string")
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).toSorted().join("\0") !== [...keys].toSorted().join("\0")) {
    throw new TypeError(`invalid ${label} fields`);
  }
  if (
    Object.values(descriptors).some(
      (descriptor) =>
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !("value" in descriptor) ||
        !descriptor.enumerable,
    )
  ) {
    throw new TypeError(`invalid ${label} descriptors`);
  }
  return descriptors;
}

function descriptorValueV1(descriptors: ExactRecordV1, key: string): unknown {
  const descriptor = descriptors[key];
  if (descriptor === undefined || !("value" in descriptor)) {
    throw new TypeError(`missing ${key}`);
  }
  return descriptor.value;
}

function parseLeaseIdV1<TId extends string>(value: unknown, label: string): TId {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`invalid ${label}`);
  }
  let byteLength = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) byteLength += 1;
    else if (code <= 0x7ff) byteLength += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (index + 1 >= value.length || next < 0xdc00 || next > 0xdfff) {
        throw new TypeError(`invalid ${label}`);
      }
      byteLength += 4;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError(`invalid ${label}`);
    } else byteLength += 3;
  }
  if (byteLength > 256) throw new TypeError(`invalid ${label}`);
  return value as TId;
}

function normalizeSessionLeaseRecordV1(value: unknown): SessionLeaseRecordV1 {
  const descriptors = exactDescriptorsV1(value, leaseRecordKeysV1, "SessionLeaseRecordV1");
  if (descriptorValueV1(descriptors, "formatRevision") !== 1) {
    throw new TypeError("invalid SessionLeaseRecordV1 formatRevision");
  }
  const ownerValue = descriptorValueV1(descriptors, "ownerId");
  const ownerId =
    ownerValue === null
      ? null
      : parseLeaseIdV1<SessionLeaseOwnerId>(ownerValue, "SessionLeaseOwnerId");
  const fencingToken = parsePositiveSafeInteger(descriptorValueV1(descriptors, "fencingToken"));
  const handoffValue = descriptorValueV1(descriptors, "handoff");
  let handoff: SessionLeaseRecordV1["handoff"] = null;
  if (handoffValue !== null) {
    if (ownerId === null) throw new TypeError("unowned lease has a handoff");
    const handoffDescriptors = exactDescriptorsV1(
      handoffValue,
      handoffKeysV1,
      "SessionLeaseRecordV1 handoff",
    );
    const requestId = parseLeaseIdV1<LeaseHandoffRequestId>(
      descriptorValueV1(handoffDescriptors, "requestId"),
      "LeaseHandoffRequestId",
    );
    const requestedByOwnerId = parseLeaseIdV1<SessionLeaseOwnerId>(
      descriptorValueV1(handoffDescriptors, "requestedByOwnerId"),
      "requestedByOwnerId",
    );
    if (requestedByOwnerId === ownerId) {
      throw new TypeError("lease owner cannot request its own handoff");
    }
    handoff = Object.freeze({ requestId, requestedByOwnerId });
  }
  return Object.freeze({ formatRevision: 1, ownerId, fencingToken, handoff });
}

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.byteLength === right.byteLength && left.every((value, index) => value === right[index])
  );
}

export function encodeSessionLeaseRecordV1(record: SessionLeaseRecordV1): Uint8Array {
  return canonicalJsonBytes(normalizeSessionLeaseRecordV1(record));
}

export function decodeSessionLeaseRecordV1(bytes: Uint8Array): SessionLeaseRecordDecodeResultV1 {
  const decoded = parseStrictJson(bytes, leaseJsonLimitsV1);
  if (!decoded.ok) return Object.freeze({ kind: "invalid" });
  try {
    const record = normalizeSessionLeaseRecordV1(decoded.value);
    if (!bytesEqualV1(bytes, canonicalJsonBytes(record))) {
      return Object.freeze({ kind: "invalid" });
    }
    return Object.freeze({ kind: "decoded", record });
  } catch {
    return Object.freeze({ kind: "invalid" });
  }
}

type LeaseObservationV1 =
  | { readonly kind: "absent" }
  | {
      readonly kind: "available";
      readonly stored: HostStoredRecordV1;
      readonly record: SessionLeaseRecordV1;
    }
  | { readonly kind: "invalid" }
  | { readonly kind: "unavailable"; readonly code: string };

type AvailableLeaseObservationV1 = Extract<LeaseObservationV1, { readonly kind: "available" }>;

type LeaseCommitResultV1 =
  | {
      readonly kind: "committed";
      readonly observation: AvailableLeaseObservationV1;
    }
  | { readonly kind: "conflict" }
  | { readonly kind: "unavailable"; readonly code: string };

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

function unavailableStatusV1(code: string): SessionLeaseStatusV1 {
  return Object.freeze({
    kind: "unavailable",
    ownerId: null,
    fencingToken: null,
    code,
  });
}

function rejectedV1(
  code: Extract<SessionLeaseOperationResultV1, { readonly kind: "rejected" }>["code"],
): SessionLeaseOperationResultV1 {
  return Object.freeze({ kind: "rejected", code });
}

function nextFencingTokenV1(token: PositiveSafeInteger): PositiveSafeInteger | null {
  if (token === Number.MAX_SAFE_INTEGER) return null;
  return parsePositiveSafeInteger(token + 1);
}

function normalizeSessionLeaseFenceV1(value: SessionLeaseFenceV1): SessionLeaseFenceV1 {
  const descriptors = exactDescriptorsV1(value, ["fencingToken", "ownerId"], "SessionLeaseFenceV1");
  return Object.freeze({
    ownerId: parseLeaseIdV1<SessionLeaseOwnerId>(
      descriptorValueV1(descriptors, "ownerId"),
      "SessionLeaseOwnerId",
    ),
    fencingToken: parsePositiveSafeInteger(descriptorValueV1(descriptors, "fencingToken")),
  });
}

function sameLeaseSemanticsV1(left: SessionLeaseRecordV1, right: SessionLeaseRecordV1): boolean {
  return (
    left.formatRevision === right.formatRevision &&
    left.ownerId === right.ownerId &&
    left.fencingToken === right.fencingToken &&
    ((left.handoff === null && right.handoff === null) ||
      (left.handoff !== null &&
        right.handoff !== null &&
        left.handoff.requestId === right.handoff.requestId &&
        left.handoff.requestedByOwnerId === right.handoff.requestedByOwnerId))
  );
}

export function createSessionLeaseV1(input: {
  readonly records: HostAtomicRecordStoreV1;
  readonly storyId: string;
  readonly ownerId: SessionLeaseOwnerId;
  nextHandoffRequestId(): LeaseHandoffRequestId;
}): SessionLeaseV1 {
  const key = createSessionLeaseRecordKeyV1(input.storyId);
  const ownerId = parseLeaseIdV1<SessionLeaseOwnerId>(input.ownerId, "SessionLeaseOwnerId");
  if (typeof input.nextHandoffRequestId !== "function") {
    throw new TypeError("invalid nextHandoffRequestId");
  }
  let capturedFence: SessionLeaseFenceV1 | null = null;

  const recordStatusV1 = (record: SessionLeaseRecordV1): SessionLeaseStatusV1 => {
    if (record.handoff !== null) {
      return Object.freeze({
        kind: "handoff_requested",
        ownerId: record.ownerId as SessionLeaseOwnerId,
        fencingToken: record.fencingToken,
        requestId: record.handoff.requestId,
        requestedByOwnerId: record.handoff.requestedByOwnerId,
      });
    }
    if (record.ownerId === null) {
      return Object.freeze({ kind: "unowned", ownerId: null, fencingToken: record.fencingToken });
    }
    return Object.freeze({
      kind: record.ownerId === ownerId ? "owned" : "readonly",
      ownerId: record.ownerId,
      fencingToken: record.fencingToken,
    });
  };

  const rememberV1 = (observation: LeaseObservationV1): LeaseObservationV1 => {
    capturedFence = null;
    if (observation.kind === "available" && observation.record.ownerId === ownerId) {
      capturedFence = Object.freeze({ ownerId, fencingToken: observation.record.fencingToken });
    }
    return observation;
  };

  const observationStatusV1 = (observation: LeaseObservationV1): SessionLeaseStatusV1 => {
    if (observation.kind === "available") return recordStatusV1(observation.record);
    if (observation.kind === "invalid") return unavailableStatusV1(invalidLeaseCodeV1);
    if (observation.kind === "unavailable") return unavailableStatusV1(observation.code);
    return unavailableStatusV1(absentLeaseCodeV1);
  };

  const readFreshV1 = async (): Promise<LeaseObservationV1> => {
    let stored: HostStoredRecordV1 | null;
    try {
      stored = await input.records.read("lease", key);
    } catch (error) {
      const code = stableHostFailureCodeV1(error);
      if (code === null) throw error;
      return rememberV1(Object.freeze({ kind: "unavailable", code }));
    }
    if (stored === null) return rememberV1(Object.freeze({ kind: "absent" }));
    if (stored.namespace !== "lease" || stored.key !== key) {
      throw new TypeError("Host returned the wrong lease record");
    }
    try {
      parsePositiveSafeInteger(stored.revision);
    } catch {
      return rememberV1(Object.freeze({ kind: "invalid" }));
    }
    const decoded = decodeSessionLeaseRecordV1(stored.bytes);
    if (decoded.kind === "invalid") return rememberV1(Object.freeze({ kind: "invalid" }));
    return rememberV1(Object.freeze({ kind: "available", stored, record: decoded.record }));
  };

  const commitRecordV1 = async (
    expected: AvailableLeaseObservationV1 | null,
    record: SessionLeaseRecordV1,
  ): Promise<LeaseCommitResultV1> => {
    const bytes = encodeSessionLeaseRecordV1(record);
    const commitOnceV1 = async (
      expectedRevision: HostRecordRevisionV1 | null,
    ): Promise<LeaseCommitResultV1> => {
      let result: Awaited<ReturnType<HostAtomicRecordStoreV1["commit"]>>;
      try {
        result = await input.records.commit([
          {
            kind: "put",
            namespace: "lease",
            key,
            expectedRevision,
            bytes,
          },
        ]);
      } catch (error) {
        const code = stableHostFailureCodeV1(error);
        if (code === null) throw error;
        rememberV1(Object.freeze({ kind: "unavailable", code }));
        return Object.freeze({ kind: "unavailable", code });
      }
      if (result.kind === "conflict") {
        capturedFence = null;
        return Object.freeze({ kind: "conflict" });
      }
      const stored = result.records.find(
        (candidate) => candidate.namespace === "lease" && candidate.key === key,
      );
      if (stored === undefined || !bytesEqualV1(stored.bytes, bytes)) {
        throw new TypeError("Host commit omitted the lease record");
      }
      const observation = rememberV1(
        Object.freeze({ kind: "available", stored, record }),
      ) as AvailableLeaseObservationV1;
      return Object.freeze({ kind: "committed", observation });
    };

    const first = await commitOnceV1(expected?.stored.revision ?? null);
    if (first.kind !== "conflict" || expected === null) return first;

    const fresh = await readFreshV1();
    if (fresh.kind === "unavailable") {
      return Object.freeze({ kind: "unavailable", code: fresh.code });
    }
    if (fresh.kind === "invalid") {
      return Object.freeze({ kind: "unavailable", code: invalidLeaseCodeV1 });
    }
    if (fresh.kind !== "available" || !sameLeaseSemanticsV1(fresh.record, expected.record)) {
      return Object.freeze({ kind: "conflict" });
    }
    return commitOnceV1(fresh.stored.revision);
  };

  const updatedFromCommitV1 = (result: LeaseCommitResultV1): SessionLeaseOperationResultV1 => {
    if (result.kind === "conflict") return rejectedV1("conflict");
    if (result.kind === "unavailable") return rejectedV1("unavailable");
    return Object.freeze({
      kind: "updated",
      status: recordStatusV1(result.observation.record),
    });
  };

  const takeOverV1 = async (
    expectedUnownedFencingToken: PositiveSafeInteger | null,
  ): Promise<SessionLeaseOperationResultV1> => {
    const current = await readFreshV1();
    if (current.kind === "invalid" || current.kind === "unavailable") {
      return rejectedV1("unavailable");
    }
    if (current.kind !== "available") return rejectedV1("conflict");
    if (current.record.ownerId === ownerId) {
      return Object.freeze({ kind: "updated", status: recordStatusV1(current.record) });
    }
    if (
      expectedUnownedFencingToken !== null &&
      (current.record.ownerId !== null ||
        current.record.fencingToken !== expectedUnownedFencingToken)
    ) {
      return rejectedV1("conflict");
    }
    const fencingToken = nextFencingTokenV1(current.record.fencingToken);
    if (fencingToken === null) return rejectedV1("unavailable");
    const next: SessionLeaseRecordV1 = Object.freeze({
      formatRevision: 1,
      ownerId,
      fencingToken,
      handoff: null,
    });
    return updatedFromCommitV1(await commitRecordV1(current, next));
  };

  const releaseV1 = async (
    expectedFence: SessionLeaseFenceV1 | null,
  ): Promise<SessionLeaseOperationResultV1> => {
    const current = await readFreshV1();
    if (current.kind === "invalid" || current.kind === "unavailable") {
      return rejectedV1("unavailable");
    }
    if (
      current.kind !== "available" ||
      current.record.ownerId !== ownerId ||
      (expectedFence !== null &&
        (current.record.ownerId !== expectedFence.ownerId ||
          current.record.fencingToken !== expectedFence.fencingToken))
    ) {
      return rejectedV1("conflict");
    }
    const next: SessionLeaseRecordV1 = Object.freeze({
      formatRevision: 1,
      ownerId: null,
      fencingToken: current.record.fencingToken,
      handoff: null,
    });
    return updatedFromCommitV1(await commitRecordV1(current, next));
  };

  return Object.freeze({
    async getStatus() {
      return observationStatusV1(await readFreshV1());
    },

    async acquireInitial() {
      const current = await readFreshV1();
      if (current.kind !== "absent") return observationStatusV1(current);
      const initial: SessionLeaseRecordV1 = Object.freeze({
        formatRevision: 1,
        ownerId,
        fencingToken: parsePositiveSafeInteger(1),
        handoff: null,
      });
      const result = await commitRecordV1(null, initial);
      if (result.kind === "committed") return recordStatusV1(result.observation.record);
      if (result.kind === "unavailable") return unavailableStatusV1(result.code);
      return observationStatusV1(await readFreshV1());
    },

    captureFence() {
      return capturedFence;
    },

    async requestHandoff() {
      const current = await readFreshV1();
      if (current.kind === "invalid" || current.kind === "unavailable") {
        return rejectedV1("unavailable");
      }
      if (
        current.kind !== "available" ||
        current.record.ownerId === null ||
        current.record.ownerId === ownerId ||
        current.record.handoff !== null
      ) {
        return rejectedV1("conflict");
      }
      const requestId = parseLeaseIdV1<LeaseHandoffRequestId>(
        input.nextHandoffRequestId(),
        "LeaseHandoffRequestId",
      );
      const next: SessionLeaseRecordV1 = Object.freeze({
        ...current.record,
        handoff: Object.freeze({ requestId, requestedByOwnerId: ownerId }),
      });
      return updatedFromCommitV1(await commitRecordV1(current, next));
    },

    async approveHandoff(requestIdValue: LeaseHandoffRequestId) {
      const requestId = parseLeaseIdV1<LeaseHandoffRequestId>(
        requestIdValue,
        "LeaseHandoffRequestId",
      );
      const current = await readFreshV1();
      if (current.kind === "invalid" || current.kind === "unavailable") {
        return rejectedV1("unavailable");
      }
      if (current.kind !== "available" || current.record.ownerId !== ownerId) {
        return rejectedV1("conflict");
      }
      if (current.record.handoff?.requestId !== requestId) {
        return rejectedV1("unknown_request");
      }
      const fencingToken = nextFencingTokenV1(current.record.fencingToken);
      if (fencingToken === null) return rejectedV1("unavailable");
      const approvedOwnerId = current.record.handoff.requestedByOwnerId;
      const next: SessionLeaseRecordV1 = Object.freeze({
        formatRevision: 1,
        ownerId: approvedOwnerId,
        fencingToken,
        handoff: null,
      });
      return updatedFromCommitV1(await commitRecordV1(current, next));
    },

    async takeOver() {
      return takeOverV1(null);
    },

    async takeOverUnowned(expectedFencingToken: PositiveSafeInteger) {
      return takeOverV1(parsePositiveSafeInteger(expectedFencingToken));
    },

    async release() {
      return releaseV1(null);
    },

    async releaseFence(fence: SessionLeaseFenceV1) {
      return releaseV1(normalizeSessionLeaseFenceV1(fence));
    },
  });
}
