// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { SaveSlotIdV1, SessionLeaseOwnerId } from "../../contracts/application.js";
import { canonicalJsonBytes } from "../../contracts/canonical-json.js";
import { digestCanonical } from "../../contracts/digest.js";
import type {
  HostAtomicRecordStoreV1,
  HostRecordMutationV1,
  HostStoredRecordV1,
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
import { createSaveSlotRecordKeyV1, createSessionLeaseRecordKeyV1 } from "./slot-keys.js";

const storyIdV1 = "story.save-repository-test";
const ownerIdV1 = "owner.primary" as SessionLeaseOwnerId;
const slotIdsV1 = ["auto.current", "auto.previous", "quick", "manual"] as const;

interface SyntheticSnapshotV1 {
  readonly commandSequence: NonNegativeSafeInteger;
  readonly value: NonNegativeSafeInteger;
  readonly integrityMarker: string;
}

interface SyntheticProvenanceV1 {
  readonly storyId: string;
  readonly marker: string;
}

type SyntheticSaveRecordV1 = SaveRecordEnvelopeV1<
  SyntheticSnapshotV1,
  SyntheticProvenanceV1,
  SaveRepositorySlotMetadataV1,
  readonly string[]
>;

function exactObjectV1(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new TypeError("invalid object");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Object.keys(descriptors).toSorted().join("\0") !== [...keys].toSorted().join("\0") ||
    Object.values(descriptors).some(({ get, set }) => get !== undefined || set !== undefined)
  ) {
    throw new TypeError("invalid object fields");
  }
  return Object.freeze(
    Object.fromEntries(
      Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]),
    ),
  );
}

function nonEmptyStringV1(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) throw new TypeError("invalid string");
  return value;
}

function parseSlotIdV1(value: unknown): SaveSlotIdV1 {
  if (!slotIdsV1.some((slotId) => slotId === value)) throw new TypeError("invalid slot ID");
  return value as SaveSlotIdV1;
}

function parseWriteReasonV1(value: unknown): SaveWriteReasonV1 {
  if (value !== "auto" && value !== "quick" && value !== "manual") {
    throw new TypeError("invalid write reason");
  }
  return value;
}

const snapshotSchemaV1: RuntimeSchemaV1<SyntheticSnapshotV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["commandSequence", "value", "integrityMarker"]);
    return Object.freeze({
      commandSequence: parseNonNegativeSafeInteger(fields.commandSequence),
      value: parseNonNegativeSafeInteger(fields.value),
      integrityMarker: nonEmptyStringV1(fields.integrityMarker),
    });
  },
});

const provenanceSchemaV1: RuntimeSchemaV1<SyntheticProvenanceV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["storyId", "marker"]);
    return Object.freeze({
      storyId: nonEmptyStringV1(fields.storyId),
      marker: nonEmptyStringV1(fields.marker),
    });
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
      storyId: nonEmptyStringV1(fields.storyId),
      slotId: parseSlotIdV1(fields.slotId),
      writeReason: parseWriteReasonV1(fields.writeReason),
      capturedCommandSequence: parseNonNegativeSafeInteger(fields.capturedCommandSequence),
    });
  },
});

const lineageSchemaV1: RuntimeSchemaV1<readonly string[]> = Object.freeze({
  parse(value: unknown) {
    if (!Array.isArray(value)) throw new TypeError("invalid lineage");
    return Object.freeze(value.map(nonEmptyStringV1));
  },
});

const recordSchemaV1 = createSaveRecordEnvelopeSchemaV1(
  snapshotSchemaV1,
  provenanceSchemaV1,
  slotSchemaV1,
  lineageSchemaV1,
);

const codecV1: SaveCodecContextV1<SyntheticSnapshotV1, SyntheticSaveRecordV1> = Object.freeze({
  recordSchema: recordSchemaV1,
  validateEnvelope(record: Readonly<SyntheticSaveRecordV1>) {
    if (
      record.slot.storyId !== record.provenance.storyId ||
      record.slot.capturedCommandSequence !== record.snapshot.commandSequence
    ) {
      throw new TypeError("invalid synthetic Save identity");
    }
  },
});

function makeRecordV1(sequence: number, label = `sequence-${sequence}`): SyntheticSaveRecordV1 {
  const commandSequence = parseNonNegativeSafeInteger(sequence);
  const snapshot = snapshotSchemaV1.parse({
    commandSequence,
    value: commandSequence,
    integrityMarker: `integrity.${label}`,
  });
  return recordSchemaV1.parse({
    formatRevision: 1,
    recordRevision: parsePositiveSafeInteger(1),
    provenance: { storyId: storyIdV1, marker: `provenance.${label}` },
    slot: {
      storyId: storyIdV1,
      slotId: "manual",
      writeReason: "manual",
      capturedCommandSequence: commandSequence,
    },
    savedAt: parseIsoUtcInstantV1(
      `2026-07-14T00:00:${String(sequence % 60).padStart(2, "0")}.000Z`,
    ),
    stateDigest: digestCanonical("sillymaker:state:v1", snapshot),
    snapshot,
    simulationLineage: [`lineage.${label}`],
  });
}

function cloneMutationV1(mutation: HostRecordMutationV1): HostRecordMutationV1 {
  return mutation.kind === "put"
    ? Object.freeze({ ...mutation, bytes: Uint8Array.from(mutation.bytes) })
    : Object.freeze({ ...mutation });
}

function createInstrumentedStoreV1() {
  const memory = createMemoryHostRecordStoreV1();
  const batches: HostRecordMutationV1[][] = [];
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    read: memory.read,
    list: memory.list,
    async commit(mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]]) {
      batches.push(mutations.map(cloneMutationV1));
      return memory.commit(mutations);
    },
  });
  return Object.freeze({ records, batches });
}

function throwingStoreV1(error: Error): HostAtomicRecordStoreV1 {
  return Object.freeze({
    async read() {
      throw error;
    },
    async list() {
      throw error;
    },
    async commit() {
      throw error;
    },
  });
}

async function createFixtureV1() {
  const instrumented = createInstrumentedStoreV1();
  const lease = createSessionLeaseV1({
    records: instrumented.records,
    storyId: storyIdV1,
    ownerId: ownerIdV1,
    nextHandoffRequestId: () => "request.primary" as never,
  });
  await lease.acquireInitial();
  const fence = lease.captureFence();
  if (fence === null) throw new TypeError("expected owned lease fence");
  const repository = createSaveRepositoryV1({
    records: instrumented.records,
    storyId: storyIdV1,
    codec: codecV1,
  });
  return Object.freeze({ ...instrumented, lease, fence, repository });
}

async function physicalRecordV1(
  records: HostAtomicRecordStoreV1,
  slotId: SaveSlotIdV1,
): Promise<HostStoredRecordV1 | null> {
  return records.read("save", createSaveSlotRecordKeyV1(storyIdV1, slotId));
}

async function overwritePhysicalV1(
  records: HostAtomicRecordStoreV1,
  current: HostStoredRecordV1,
  bytes: Uint8Array,
): Promise<void> {
  const result = await records.commit([
    {
      kind: "put",
      namespace: "save",
      key: current.key,
      expectedRevision: current.revision,
      bytes,
    },
  ]);
  expect(result.kind).toBe("committed");
}

function expectValidSequenceV1(
  value: Awaited<ReturnType<ReturnType<typeof createSaveRepositoryV1>["read"]>>,
  sequence: number,
) {
  expect(value).toMatchObject({
    health: "valid",
    record: {
      slot: { capturedCommandSequence: sequence },
      snapshot: { commandSequence: sequence },
    },
  });
}

describe("Save repository", () => {
  it("creates unique versioned Story-scoped keys for all physical slots and the lease", () => {
    const firstStory = slotIdsV1.map((slotId) => createSaveSlotRecordKeyV1("story.first", slotId));
    const secondStory = slotIdsV1.map((slotId) =>
      createSaveSlotRecordKeyV1("story.second", slotId),
    );

    expect(new Set([...firstStory, ...secondStory])).toHaveLength(8);
    expect(createSessionLeaseRecordKeyV1("story.first")).not.toBe(
      createSessionLeaseRecordKeyV1("story.second"),
    );
    expect(firstStory.every((key) => key.includes("save-record.v1"))).toBe(true);
  });

  it("distinguishes empty, valid, revision-mismatched, and slot-mismatched records", async () => {
    const fixture = await createFixtureV1();
    await expect(fixture.repository.read("quick")).resolves.toEqual({
      health: "empty",
      slotId: "quick",
      hostRevision: null,
      record: null,
      code: null,
    });
    await fixture.repository.writeQuick(makeRecordV1(1), fixture.fence);
    expectValidSequenceV1(await fixture.repository.read("quick"), 1);

    const quick = await physicalRecordV1(fixture.records, "quick");
    if (quick === null) throw new TypeError("missing quick record");
    const decoded = JSON.parse(new TextDecoder().decode(quick.bytes)) as Record<string, unknown>;
    await overwritePhysicalV1(
      fixture.records,
      quick,
      canonicalJsonBytes({ ...decoded, recordRevision: 99 }),
    );
    await expect(fixture.repository.read("quick")).resolves.toMatchObject({
      health: "invalid",
      slotId: "quick",
      code: "persistence.record_revision_mismatch",
    });

    await fixture.repository.writeManual(makeRecordV1(2), fixture.fence);
    const manual = await physicalRecordV1(fixture.records, "manual");
    const mismatchedQuick = await physicalRecordV1(fixture.records, "quick");
    if (manual === null || mismatchedQuick === null) throw new TypeError("missing physical record");
    const manualRecord = JSON.parse(new TextDecoder().decode(manual.bytes)) as Record<
      string,
      unknown
    >;
    await overwritePhysicalV1(
      fixture.records,
      mismatchedQuick,
      canonicalJsonBytes({ ...manualRecord, recordRevision: mismatchedQuick.revision + 1 }),
    );
    await expect(fixture.repository.read("quick")).resolves.toMatchObject({
      health: "invalid",
      slotId: "quick",
      code: "persistence.slot_identity_mismatch",
    });
  });

  it("writes Quick and Manual with matching Host/Save revisions and one CAS winner", async () => {
    const fixture = await createFixtureV1();
    await expect(fixture.repository.writeQuick(makeRecordV1(1), fixture.fence)).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
      recordRevision: 1,
    });
    await expect(fixture.repository.writeQuick(makeRecordV1(2), fixture.fence)).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
      recordRevision: 2,
    });
    await expect(fixture.repository.writeManual(makeRecordV1(3), fixture.fence)).resolves.toEqual({
      kind: "saved",
      slotId: "manual",
      recordRevision: 1,
    });

    const outcomes = await Promise.all([
      fixture.repository.writeQuick(makeRecordV1(4), fixture.fence),
      fixture.repository.writeQuick(makeRecordV1(5), fixture.fence),
    ]);
    expect(outcomes.map(({ kind }) => kind).toSorted()).toEqual(["rejected", "saved"]);
    expect(outcomes.find(({ kind }) => kind === "rejected")).toEqual({
      kind: "rejected",
      code: "conflict",
    });
    const final = await fixture.repository.read("quick");
    expect(final).toMatchObject({
      health: "valid",
      hostRevision: 3,
      record: { recordRevision: 3 },
    });
    expect([4, 5]).toContain(final.health === "valid" ? final.record.snapshot.commandSequence : -1);
  });

  it("keeps lease operations usable after a Save CAS-touches only its Host revision", async () => {
    const fixture = await createFixtureV1();
    await fixture.repository.writeQuick(makeRecordV1(1), fixture.fence);

    await expect(fixture.lease.release()).resolves.toEqual({
      kind: "updated",
      status: { kind: "unowned", ownerId: null, fencingToken: 1 },
    });
  });

  it("rotates Auto current and previous in one three-mutation fenced batch", async () => {
    const fixture = await createFixtureV1();
    const first = makeRecordV1(1, "first-auto");
    const second = makeRecordV1(2, "second-auto");
    await fixture.repository.writeAuto(first, fixture.fence);
    const oldCurrent = await physicalRecordV1(fixture.records, "auto.current");
    if (oldCurrent === null) throw new TypeError("missing current Auto record");
    fixture.batches.length = 0;

    await expect(fixture.repository.writeAuto(second, fixture.fence)).resolves.toEqual({
      kind: "saved",
      slotId: "auto.current",
      recordRevision: 2,
    });
    expect(fixture.batches.at(-1)).toHaveLength(3);
    const current = await fixture.repository.read("auto.current");
    const previous = await fixture.repository.read("auto.previous");
    expectValidSequenceV1(current, 2);
    expectValidSequenceV1(previous, 1);
    expect(previous).toMatchObject({
      hostRevision: 1,
      record: {
        recordRevision: 1,
        provenance: first.provenance,
        savedAt: first.savedAt,
        snapshot: first.snapshot,
        simulationLineage: first.simulationLineage,
        slot: { slotId: "auto.previous", writeReason: "auto" },
      },
    });
    const newPrevious = await physicalRecordV1(fixture.records, "auto.previous");
    expect(newPrevious?.bytes).not.toEqual(oldCurrent.bytes);
  });

  it.each(["corrupt", "missing"] as const)(
    "preserves valid previous when current is %s",
    async (mode) => {
      const fixture = await createFixtureV1();
      await fixture.repository.writeAuto(makeRecordV1(1), fixture.fence);
      await fixture.repository.writeAuto(makeRecordV1(2), fixture.fence);
      const previousBefore = await physicalRecordV1(fixture.records, "auto.previous");
      const current = await physicalRecordV1(fixture.records, "auto.current");
      if (previousBefore === null || current === null) throw new TypeError("missing Auto records");
      const mutation: HostRecordMutationV1 =
        mode === "corrupt"
          ? {
              kind: "put",
              namespace: "save",
              key: current.key,
              expectedRevision: current.revision,
              bytes: new TextEncoder().encode('{"corrupt":'),
            }
          : {
              kind: "delete",
              namespace: "save",
              key: current.key,
              expectedRevision: current.revision,
            };
      expect((await fixture.records.commit([mutation])).kind).toBe("committed");

      await expect(
        fixture.repository.writeAuto(makeRecordV1(3), fixture.fence),
      ).resolves.toMatchObject({
        kind: "saved",
      });
      expect(await physicalRecordV1(fixture.records, "auto.previous")).toEqual(previousBefore);
      expectValidSequenceV1(await fixture.repository.read("auto.current"), 3);
    },
  );

  it("replaces corrupt previous only from a valid current rotation", async () => {
    const fixture = await createFixtureV1();
    await fixture.repository.writeAuto(makeRecordV1(1), fixture.fence);
    await fixture.repository.writeAuto(makeRecordV1(2), fixture.fence);
    const previous = await physicalRecordV1(fixture.records, "auto.previous");
    if (previous === null) throw new TypeError("missing previous Auto record");
    await overwritePhysicalV1(fixture.records, previous, new TextEncoder().encode('{"corrupt":'));

    await fixture.repository.writeAuto(makeRecordV1(3), fixture.fence);
    expectValidSequenceV1(await fixture.repository.read("auto.previous"), 2);
    expectValidSequenceV1(await fixture.repository.read("auto.current"), 3);
  });

  it("clears a corrupt slot with one CAS delete and lease touch", async () => {
    const fixture = await createFixtureV1();
    await fixture.repository.writeQuick(makeRecordV1(1), fixture.fence);
    const quick = await physicalRecordV1(fixture.records, "quick");
    if (quick === null) throw new TypeError("missing quick record");
    await overwritePhysicalV1(fixture.records, quick, new TextEncoder().encode("not-json"));
    fixture.batches.length = 0;

    await expect(fixture.repository.clear("quick", fixture.fence)).resolves.toEqual({
      kind: "cleared",
      slotId: "quick",
    });
    expect(fixture.batches.at(-1)).toHaveLength(2);
    await expect(fixture.repository.read("quick")).resolves.toMatchObject({ health: "empty" });
    await expect(fixture.repository.clear("quick", fixture.fence)).resolves.toEqual({
      kind: "rejected",
      code: "empty_slot",
    });
  });

  it("rejects a stale fence after ownership changes without writing a slot", async () => {
    const fixture = await createFixtureV1();
    const replacement = createSessionLeaseV1({
      records: fixture.records,
      storyId: storyIdV1,
      ownerId: "owner.replacement" as SessionLeaseOwnerId,
      nextHandoffRequestId: () => "request.replacement" as never,
    });
    await replacement.getStatus();
    await replacement.takeOver();

    await expect(fixture.repository.writeQuick(makeRecordV1(1), fixture.fence)).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    expect(await physicalRecordV1(fixture.records, "quick")).toBeNull();
  });

  it("linearizes a Save write before or after takeover without a stale commit", async () => {
    const fixture = await createFixtureV1();
    const replacement = createSessionLeaseV1({
      records: fixture.records,
      storyId: storyIdV1,
      ownerId: "owner.replacement" as SessionLeaseOwnerId,
      nextHandoffRequestId: () => "request.replacement" as never,
    });
    await replacement.getStatus();

    const [saved, takeover] = await Promise.all([
      fixture.repository.writeQuick(makeRecordV1(1), fixture.fence),
      replacement.takeOver(),
    ]);
    expect(takeover).toMatchObject({
      kind: "updated",
      status: { kind: "owned", ownerId: "owner.replacement", fencingToken: 2 },
    });
    if (saved.kind === "rejected") {
      expect(saved).toEqual({ kind: "rejected", code: "conflict" });
    }
    const quick = await fixture.repository.read("quick");
    expect(quick.health).toBe(saved.kind === "saved" ? "valid" : "empty");
  });

  it("maps only stable Host failures to unavailable", async () => {
    const stable = Object.assign(new Error("indexeddb.unavailable"), {
      name: "IndexedDbRecordStoreFailureV1",
      code: "indexeddb.unavailable",
      operation: "read",
    });
    const unavailable = createSaveRepositoryV1({
      records: throwingStoreV1(stable),
      storyId: storyIdV1,
      codec: codecV1,
    });
    const fence = Object.freeze({
      ownerId: ownerIdV1,
      fencingToken: parsePositiveSafeInteger(1),
    });
    await expect(unavailable.read("quick")).resolves.toMatchObject({
      health: "unavailable",
      code: "indexeddb.unavailable",
    });
    await expect(unavailable.writeQuick(makeRecordV1(1), fence)).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });

    const unexpected = new Error("unexpected Host bug");
    const broken = createSaveRepositoryV1({
      records: throwingStoreV1(unexpected),
      storyId: storyIdV1,
      codec: codecV1,
    });
    await expect(broken.read("quick")).rejects.toBe(unexpected);
    await expect(broken.writeQuick(makeRecordV1(1), fence)).rejects.toBe(unexpected);

    const codedUnexpected = Object.assign(new Error("unexpected coded Host bug"), {
      code: "indexeddb.unavailable",
      operation: "read",
    });
    const codedBroken = createSaveRepositoryV1({
      records: throwingStoreV1(codedUnexpected),
      storyId: storyIdV1,
      codec: codecV1,
    });
    await expect(codedBroken.read("quick")).rejects.toBe(codedUnexpected);
    await expect(codedBroken.writeQuick(makeRecordV1(1), fence)).rejects.toBe(codedUnexpected);
  });

  it("does not misclassify a coded Save encoding bug as Host unavailability", async () => {
    const fixture = await createFixtureV1();
    const valid = makeRecordV1(1);
    const invalid = Object.freeze({
      ...valid,
      provenance: Object.freeze({ ...valid.provenance, marker: "\ud800" }),
    }) as SyntheticSaveRecordV1;

    await expect(fixture.repository.writeQuick(invalid, fixture.fence)).rejects.toMatchObject({
      code: "string.lone_surrogate",
    });
    expect(await physicalRecordV1(fixture.records, "quick")).toBeNull();
  });
});
