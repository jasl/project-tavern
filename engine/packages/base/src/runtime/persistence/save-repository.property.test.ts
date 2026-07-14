// SPDX-License-Identifier: MIT
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { SaveSlotIdV1, SessionLeaseOwnerId } from "../../contracts/application.js";
import { digestCanonical } from "../../contracts/digest.js";
import type {
  HostAtomicCommitResultV1,
  HostAtomicRecordStoreV1,
  HostRecordMutationV1,
} from "../../contracts/host.js";
import { createMemoryHostRecordStoreV1 } from "../../contracts/host.js";
import {
  createSaveRecordEnvelopeSchemaV1,
  parseIsoUtcInstantV1,
} from "../../contracts/persistence.js";
import type {
  SaveCodecContextV1,
  SaveRecordEnvelopeV1,
  SaveWriteReasonV1,
} from "../../contracts/persistence.js";
import type { NonNegativeSafeInteger, RuntimeSchemaV1 } from "../../contracts/values.js";
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "../../contracts/values.js";
import { createSaveRepositoryV1 } from "./save-repository.js";
import type { SaveRepositorySlotMetadataV1 } from "./save-repository.js";
import { createSessionLeaseV1 } from "./session-lease.js";
import type { SessionLeaseFenceV1 } from "./session-lease.js";
import { createSaveSlotRecordKeyV1 } from "./slot-keys.js";

const storyIdV1 = "story.save-repository-property";

interface PropertySnapshotV1 {
  readonly commandSequence: NonNegativeSafeInteger;
  readonly marker: string;
}

interface PropertyProvenanceV1 {
  readonly storyId: string;
}

type PropertySaveRecordV1 = SaveRecordEnvelopeV1<
  PropertySnapshotV1,
  PropertyProvenanceV1,
  SaveRepositorySlotMetadataV1,
  readonly []
>;

function exactObjectV1(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError("invalid property object");
  }
  const fields = Object.getOwnPropertyDescriptors(value);
  if (
    Object.keys(fields).toSorted().join("\0") !== [...keys].toSorted().join("\0") ||
    Object.values(fields).some(({ get, set }) => get !== undefined || set !== undefined)
  ) {
    throw new TypeError("invalid property object fields");
  }
  return Object.freeze(
    Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value])),
  );
}

function stringV1(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) throw new TypeError("invalid string");
  return value;
}

function slotIdV1(value: unknown): SaveSlotIdV1 {
  if (
    value !== "auto.current" &&
    value !== "auto.previous" &&
    value !== "quick" &&
    value !== "manual"
  ) {
    throw new TypeError("invalid slot");
  }
  return value;
}

function reasonV1(value: unknown): SaveWriteReasonV1 {
  if (value !== "auto" && value !== "quick" && value !== "manual") {
    throw new TypeError("invalid reason");
  }
  return value;
}

const snapshotSchemaV1: RuntimeSchemaV1<PropertySnapshotV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["commandSequence", "marker"]);
    return Object.freeze({
      commandSequence: parseNonNegativeSafeInteger(fields.commandSequence),
      marker: stringV1(fields.marker),
    });
  },
});

const provenanceSchemaV1: RuntimeSchemaV1<PropertyProvenanceV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["storyId"]);
    return Object.freeze({ storyId: stringV1(fields.storyId) });
  },
});

const slotSchemaV1: RuntimeSchemaV1<SaveRepositorySlotMetadataV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, [
      "storyId",
      "slotId",
      "writeReason",
      "capturedCommandSequence",
    ]);
    return Object.freeze({
      storyId: stringV1(fields.storyId),
      slotId: slotIdV1(fields.slotId),
      writeReason: reasonV1(fields.writeReason),
      capturedCommandSequence: parseNonNegativeSafeInteger(fields.capturedCommandSequence),
    });
  },
});

const lineageSchemaV1: RuntimeSchemaV1<readonly []> = Object.freeze({
  parse(value: unknown) {
    if (!Array.isArray(value) || value.length !== 0) throw new TypeError("invalid lineage");
    return Object.freeze([]) as readonly [];
  },
});

const recordSchemaV1 = createSaveRecordEnvelopeSchemaV1(
  snapshotSchemaV1,
  provenanceSchemaV1,
  slotSchemaV1,
  lineageSchemaV1,
);
const codecV1: SaveCodecContextV1<PropertySnapshotV1, PropertySaveRecordV1> = Object.freeze({
  recordSchema: recordSchemaV1,
  validateEnvelope(record: Readonly<PropertySaveRecordV1>) {
    if (
      record.slot.storyId !== record.provenance.storyId ||
      record.slot.capturedCommandSequence !== record.snapshot.commandSequence
    ) {
      throw new TypeError("invalid property Save identity");
    }
  },
});

function recordV1(sequence: number): PropertySaveRecordV1 {
  const commandSequence = parseNonNegativeSafeInteger(sequence);
  const snapshot = snapshotSchemaV1.parse({
    commandSequence,
    marker: `snapshot.${sequence}`,
  });
  return recordSchemaV1.parse({
    formatRevision: 1,
    recordRevision: parsePositiveSafeInteger(1),
    provenance: { storyId: storyIdV1 },
    slot: {
      storyId: storyIdV1,
      slotId: "manual",
      writeReason: "manual",
      capturedCommandSequence: commandSequence,
    },
    savedAt: parseIsoUtcInstantV1(
      `2026-07-14T01:00:${String(sequence % 60).padStart(2, "0")}.000Z`,
    ),
    stateDigest: digestCanonical("sillymaker:state:v1", snapshot),
    snapshot,
    simulationLineage: [],
  });
}

async function fixtureV1(records: HostAtomicRecordStoreV1 = createMemoryHostRecordStoreV1()) {
  const lease = createSessionLeaseV1({
    records,
    storyId: storyIdV1,
    ownerId: "owner.property-a" as SessionLeaseOwnerId,
    nextHandoffRequestId: () => "request.property-a" as never,
  });
  await lease.acquireInitial();
  const fence = lease.captureFence();
  if (fence === null) throw new TypeError("missing property fence");
  return Object.freeze({
    records,
    lease,
    fence,
    repository: createSaveRepositoryV1({ records, storyId: storyIdV1, codec: codecV1 }),
  });
}

async function saveRecordsV1(records: HostAtomicRecordStoreV1) {
  return records.list("save");
}

async function physicalV1(records: HostAtomicRecordStoreV1, slotId: SaveSlotIdV1) {
  return records.read("save", createSaveSlotRecordKeyV1(storyIdV1, slotId));
}

function callWriteV1(
  kind: "auto" | "quick" | "manual",
  repository: ReturnType<typeof createSaveRepositoryV1>,
  record: PropertySaveRecordV1,
  fence: SessionLeaseFenceV1,
) {
  return kind === "auto"
    ? repository.writeAuto(record, fence)
    : kind === "quick"
      ? repository.writeQuick(record, fence)
      : repository.writeManual(record, fence);
}

type CommitOrderV1 = "save_first" | "takeover_first";

interface PendingCommitV1 {
  readonly mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]];
  resolve(result: HostAtomicCommitResultV1): void;
  reject(error: unknown): void;
}

function createOrderedCommitStoreV1() {
  const delegate = createMemoryHostRecordStoreV1();
  let order: CommitOrderV1 | null = null;
  let pending: PendingCommitV1[] = [];

  const releaseV1 = async () => {
    const selectedOrder = order;
    const selected = pending;
    order = null;
    pending = [];
    const save = selected.find(({ mutations }) =>
      mutations.some(({ namespace }) => namespace === "save"),
    );
    const takeover = selected.find(({ mutations }) =>
      mutations.every(({ namespace }) => namespace === "lease"),
    );
    if (selectedOrder === null || save === undefined || takeover === undefined) {
      const error = new TypeError("invalid ordered Host commit pair");
      for (const operation of selected) operation.reject(error);
      return;
    }
    const operations = selectedOrder === "save_first" ? [save, takeover] : [takeover, save];
    for (const operation of operations) {
      try {
        operation.resolve(await delegate.commit(operation.mutations));
      } catch (error) {
        operation.reject(error);
      }
    }
  };

  const store: HostAtomicRecordStoreV1 = Object.freeze({
    read: delegate.read,
    list: delegate.list,
    commit(mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]]) {
      if (order === null) return delegate.commit(mutations);
      return new Promise<HostAtomicCommitResultV1>((resolve, reject) => {
        pending.push(Object.freeze({ mutations, resolve, reject }));
        if (pending.length === 2) void releaseV1();
      });
    },
  });

  return Object.freeze({
    store,
    arm(nextOrder: CommitOrderV1) {
      if (order !== null || pending.length !== 0) {
        throw new TypeError("ordered Host commit store is already armed");
      }
      order = nextOrder;
    },
  });
}

describe("Save repository interleaving properties", () => {
  it("linearizes randomized write and takeover sequences without stale or partial commits", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            kind: fc.constantFrom("auto", "quick", "manual"),
            sequence: fc.integer({ min: 1, max: 10_000 }),
            order: fc.constantFrom<CommitOrderV1>("save_first", "takeover_first"),
          }),
          { minLength: 1, maxLength: 8 },
        ),
        async (steps) => {
          const ordered = createOrderedCommitStoreV1();
          const fixture = await fixtureV1(ordered.store);
          const leases = Object.freeze({
            a: fixture.lease,
            b: createSessionLeaseV1({
              records: fixture.records,
              storyId: storyIdV1,
              ownerId: "owner.property-b" as SessionLeaseOwnerId,
              nextHandoffRequestId: () => "request.property-b" as never,
            }),
          });
          let currentOwner: keyof typeof leases = "a";

          for (const step of steps) {
            const nextOwner: keyof typeof leases = currentOwner === "a" ? "b" : "a";
            const ownerLease = leases[currentOwner];
            const contender = leases[nextOwner];
            await ownerLease.getStatus();
            const fence = ownerLease.captureFence();
            if (fence === null) throw new TypeError("missing current property fence");
            await contender.getStatus();
            const beforeRecords = await saveRecordsV1(fixture.records);
            const beforeCurrent = await fixture.repository.read("auto.current");
            const beforePrevious = await physicalV1(fixture.records, "auto.previous");

            ordered.arm(step.order);
            const [saveResult, takeoverResult] = await Promise.all([
              callWriteV1(step.kind, fixture.repository, recordV1(step.sequence), fence),
              contender.takeOver(),
            ]);
            expect(takeoverResult).toMatchObject({ kind: "updated", status: { kind: "owned" } });
            expect(saveResult.kind === "saved").toBe(step.order === "save_first");

            if (saveResult.kind === "rejected") {
              expect(saveResult).toEqual({ kind: "rejected", code: "conflict" });
              expect(await saveRecordsV1(fixture.records)).toEqual(beforeRecords);
            } else if (step.kind === "auto") {
              await expect(fixture.repository.read("auto.current")).resolves.toMatchObject({
                health: "valid",
                record: { snapshot: { commandSequence: step.sequence } },
              });
              if (beforeCurrent.health === "valid") {
                await expect(fixture.repository.read("auto.previous")).resolves.toMatchObject({
                  health: "valid",
                  record: {
                    snapshot: {
                      commandSequence: beforeCurrent.record.snapshot.commandSequence,
                    },
                  },
                });
              } else {
                expect(await physicalV1(fixture.records, "auto.previous")).toEqual(beforePrevious);
              }
            } else {
              await expect(fixture.repository.read(step.kind)).resolves.toMatchObject({
                health: "valid",
                record: { snapshot: { commandSequence: step.sequence } },
              });
            }

            const afterRace = await saveRecordsV1(fixture.records);
            await expect(
              callWriteV1(step.kind, fixture.repository, recordV1(step.sequence + 10_001), fence),
            ).resolves.toEqual({ kind: "rejected", code: "conflict" });
            expect(await saveRecordsV1(fixture.records)).toEqual(afterRace);
            currentOwner = nextOwner;
          }
        },
      ),
      { numRuns: 30 },
    );
  });

  it("never changes previous when a randomized corrupt current is replaced", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.integer({ min: 1, max: 3_000 }),
          fc.integer({ min: 3_001, max: 6_000 }),
          fc.integer({ min: 6_001, max: 9_000 }),
        ),
        async ([first, second, next]) => {
          const fixture = await fixtureV1();
          await fixture.repository.writeAuto(recordV1(first), fixture.fence);
          await fixture.repository.writeAuto(recordV1(second), fixture.fence);
          const previous = await physicalV1(fixture.records, "auto.previous");
          const current = await physicalV1(fixture.records, "auto.current");
          if (previous === null || current === null) throw new TypeError("missing property Auto");
          const corrupted = await fixture.records.commit([
            {
              kind: "put",
              namespace: "save",
              key: current.key,
              expectedRevision: current.revision,
              bytes: new TextEncoder().encode('{"corrupt":'),
            },
          ]);
          expect(corrupted.kind).toBe("committed");

          await expect(
            fixture.repository.writeAuto(recordV1(next), fixture.fence),
          ).resolves.toMatchObject({
            kind: "saved",
          });
          expect(await physicalV1(fixture.records, "auto.previous")).toEqual(previous);
          await expect(fixture.repository.read("auto.current")).resolves.toMatchObject({
            health: "valid",
            record: { snapshot: { commandSequence: next } },
          });
        },
      ),
      { numRuns: 30 },
    );
  });
});
