// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "../../contracts/canonical-json.js";
import { digestBytes, digestCanonical } from "../../contracts/digest.js";
import {
  createSaveRecordEnvelopeSchemaV1,
  parseIsoUtcInstantV1,
  saveJsonLimitsV1,
} from "../../contracts/persistence.js";
import type {
  SaveCodecContextV1,
  SaveRecordEnvelopeV1,
  SimulationAdoptionV1,
} from "../../contracts/persistence.js";
import {
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
} from "../../contracts/snapshot.js";
import type { GameSnapshotEnvelopeV1, RunIntegrityV1 } from "../../contracts/snapshot.js";
import type { Digest, NonNegativeSafeInteger, RuntimeSchemaV1 } from "../../contracts/values.js";
import {
  parseDigest,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "../../contracts/values.js";
import { decodeSaveRecordV1, encodeSaveRecordV1 } from "./save-codec.js";

interface SyntheticStateV1 {
  readonly referenceId: string;
  readonly count: NonNegativeSafeInteger;
}

interface SyntheticRngV1 {
  readonly cursor: NonNegativeSafeInteger;
}

type SyntheticSnapshotV1 = GameSnapshotEnvelopeV1<SyntheticStateV1, SyntheticRngV1>;

interface SyntheticProvenanceV1 {
  readonly story: { readonly id: string };
  readonly resolved: { readonly simulationDigest: Digest };
}

interface SyntheticSlotMetadataV1 {
  readonly storyId: string;
  readonly capturedCommandSequence: NonNegativeSafeInteger;
}

type SyntheticSaveRecordV1 = SaveRecordEnvelopeV1<
  SyntheticSnapshotV1,
  SyntheticProvenanceV1,
  SyntheticSlotMetadataV1,
  readonly SimulationAdoptionV1[]
>;

function exactObjectV1(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError("invalid object");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Object.keys(descriptors).toSorted().join("\0") !== [...keys].toSorted().join("\0") ||
    Object.values(descriptors).some(
      (descriptor) => descriptor.get !== undefined || descriptor.set !== undefined,
    )
  ) {
    throw new TypeError("invalid object fields");
  }
  return Object.freeze(
    Object.fromEntries(
      Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]),
    ),
  );
}

function requiredStringV1(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) throw new TypeError("invalid string");
  return value;
}

const stateSchemaV1: RuntimeSchemaV1<SyntheticStateV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["referenceId", "count"]);
    return Object.freeze({
      referenceId: requiredStringV1(fields.referenceId),
      count: parseNonNegativeSafeInteger(fields.count),
    });
  },
});

const rngSchemaV1: RuntimeSchemaV1<SyntheticRngV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["cursor"]);
    return Object.freeze({ cursor: parseNonNegativeSafeInteger(fields.cursor) });
  },
});

const snapshotSchemaV1 = createGameSnapshotEnvelopeSchemaV1(stateSchemaV1, rngSchemaV1);

const provenanceSchemaV1: RuntimeSchemaV1<SyntheticProvenanceV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["story", "resolved"]);
    const story = exactObjectV1(fields.story, ["id"]);
    const resolved = exactObjectV1(fields.resolved, ["simulationDigest"]);
    return Object.freeze({
      story: Object.freeze({ id: requiredStringV1(story.id) }),
      resolved: Object.freeze({ simulationDigest: parseDigest(resolved.simulationDigest) }),
    });
  },
});

const slotSchemaV1: RuntimeSchemaV1<SyntheticSlotMetadataV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["storyId", "capturedCommandSequence"]);
    return Object.freeze({
      storyId: requiredStringV1(fields.storyId),
      capturedCommandSequence: parseNonNegativeSafeInteger(fields.capturedCommandSequence),
    });
  },
});

const lineageSchemaV1: RuntimeSchemaV1<readonly SimulationAdoptionV1[]> = Object.freeze({
  parse(value: unknown) {
    if (!Array.isArray(value) || value.length > 16) throw new TypeError("invalid lineage");
    return Object.freeze(
      value.map((entry) => {
        const fields = exactObjectV1(entry, [
          "fromSimulationDigest",
          "toSimulationDigest",
          "viaSimulationPatchSetDigest",
          "adoptedAtCommandSequence",
        ]);
        return Object.freeze({
          fromSimulationDigest: parseDigest(fields.fromSimulationDigest),
          toSimulationDigest: parseDigest(fields.toSimulationDigest),
          viaSimulationPatchSetDigest: parseDigest(fields.viaSimulationPatchSetDigest),
          adoptedAtCommandSequence: parseNonNegativeSafeInteger(fields.adoptedAtCommandSequence),
        });
      }),
    );
  },
});

const recordSchemaV1 = createSaveRecordEnvelopeSchemaV1(
  snapshotSchemaV1,
  provenanceSchemaV1,
  slotSchemaV1,
  lineageSchemaV1,
);

function validateEnvelopeV1(record: Readonly<SyntheticSaveRecordV1>): void {
  if (record.slot.storyId !== record.provenance.story.id) {
    throw new TypeError("slot Story mismatch");
  }
  if (record.slot.capturedCommandSequence !== record.snapshot.commandSequence) {
    throw new TypeError("captured sequence mismatch");
  }
  for (let index = 1; index < record.simulationLineage.length; index += 1) {
    if (
      record.simulationLineage[index - 1]?.toSimulationDigest !==
      record.simulationLineage[index]?.fromSimulationDigest
    ) {
      throw new TypeError("lineage is disconnected");
    }
  }
  const tail = record.simulationLineage.at(-1);
  if (
    tail !== undefined &&
    tail.toSimulationDigest !== record.provenance.resolved.simulationDigest
  ) {
    throw new TypeError("lineage tail mismatch");
  }
}

const codecV1: SaveCodecContextV1<SyntheticSnapshotV1, SyntheticSaveRecordV1> = Object.freeze({
  recordSchema: recordSchemaV1,
  validateEnvelope: validateEnvelopeV1,
});

const digestV1 = (label: string): Digest =>
  digestBytes(new TextEncoder().encode(`save-codec:${label}`));

function makeSnapshotV1(integrity: RunIntegrityV1 = createPristineRunIntegrityV1()) {
  return snapshotSchemaV1.parse({
    state: { referenceId: "reference.synthetic", count: 4 },
    rng: { cursor: 17 },
    commandSequence: 3,
    integrity,
  });
}

function makeRecordV1(
  input: {
    readonly snapshot?: SyntheticSnapshotV1;
    readonly simulationDigest?: Digest;
    readonly lineage?: readonly SimulationAdoptionV1[];
  } = {},
): SyntheticSaveRecordV1 {
  const snapshot = input.snapshot ?? makeSnapshotV1();
  const simulationDigest = input.simulationDigest ?? digestV1("simulation.current");
  return recordSchemaV1.parse({
    formatRevision: 1,
    recordRevision: parsePositiveSafeInteger(2),
    provenance: {
      story: { id: "story.synthetic" },
      resolved: { simulationDigest },
    },
    slot: {
      storyId: "story.synthetic",
      capturedCommandSequence: snapshot.commandSequence,
    },
    savedAt: parseIsoUtcInstantV1("2026-07-14T00:00:00.000Z"),
    stateDigest: digestCanonical("sillymaker:state:v1", snapshot),
    snapshot,
    simulationLineage: input.lineage ?? Object.freeze([]),
  });
}

function bytesWithV1(record: SyntheticSaveRecordV1, overrides: Readonly<Record<string, unknown>>) {
  return canonicalJsonBytes({ ...record, ...overrides });
}

describe("Save record codec", () => {
  it("encodes one canonical representation and round-trips a strict frozen record", () => {
    const record = makeRecordV1();
    const bytes = encodeSaveRecordV1(record, codecV1);

    expect(bytes).toEqual(canonicalJsonBytes(record));
    expect(new TextDecoder().decode(bytes)).not.toMatch(/^\uFEFF|\n|\r/u);
    const decoded = decodeSaveRecordV1(bytes, codecV1);
    expect(decoded).toEqual({ kind: "decoded", record });
    if (decoded.kind !== "decoded") throw new TypeError("expected decoded record");
    expect(Object.isFrozen(decoded)).toBe(true);
    expect(Object.isFrozen(decoded.record)).toBe(true);
    expect(Object.isFrozen(decoded.record.snapshot)).toBe(true);
    expect(Object.isFrozen(decoded.record.snapshot.integrity)).toBe(true);
  });

  it.each([
    [
      "unknown envelope field",
      (record: SyntheticSaveRecordV1) => bytesWithV1(record, { unknown: true }),
      "envelope.schema_invalid",
    ],
    [
      "future format revision",
      (record: SyntheticSaveRecordV1) => bytesWithV1(record, { formatRevision: 2 }),
      "envelope.unsupported_revision",
    ],
    [
      "malformed format revision",
      (record: SyntheticSaveRecordV1) => bytesWithV1(record, { formatRevision: 0 }),
      "envelope.schema_invalid",
    ],
    [
      "invalid state digest format",
      (record: SyntheticSaveRecordV1) => bytesWithV1(record, { stateDigest: "not-a-digest" }),
      "digest.invalid_format",
    ],
    [
      "wrong state digest",
      (record: SyntheticSaveRecordV1) => bytesWithV1(record, { stateDigest: digestV1("wrong") }),
      "digest.state_mismatch",
    ],
    [
      "malformed integrity",
      (record: SyntheticSaveRecordV1) => {
        const snapshot = { ...record.snapshot, integrity: { mode: "normal" } };
        return bytesWithV1(record, {
          snapshot,
          stateDigest: digestCanonical("sillymaker:state:v1", snapshot),
        });
      },
      "envelope.schema_invalid",
    ],
    [
      "cross-record Story mismatch",
      (record: SyntheticSaveRecordV1) =>
        bytesWithV1(record, { slot: { ...record.slot, storyId: "story.other" } }),
      "envelope.schema_invalid",
    ],
    [
      "cross-record sequence mismatch",
      (record: SyntheticSaveRecordV1) =>
        bytesWithV1(record, {
          slot: { ...record.slot, capturedCommandSequence: record.snapshot.commandSequence + 1 },
        }),
      "envelope.schema_invalid",
    ],
  ] as const)("rejects a %s at its stable stage", (_label, makeBytes, code) => {
    expect(decodeSaveRecordV1(makeBytes(makeRecordV1()), codecV1)).toEqual({
      kind: "rejected",
      code,
    });
  });

  it("returns Strict JSON errors before opening the envelope Schema", () => {
    const validText = new TextDecoder().decode(canonicalJsonBytes(makeRecordV1()));
    const duplicate = new TextEncoder().encode(`{"formatRevision":1,${validText.slice(1)}`);
    expect(decodeSaveRecordV1(duplicate, codecV1)).toEqual({
      kind: "rejected",
      code: "object.duplicate_key",
    });

    const oversized = new Uint8Array(Number(saveJsonLimitsV1.maxBytes) + 1);
    expect(decodeSaveRecordV1(oversized, codecV1)).toEqual({
      kind: "rejected",
      code: "limit.bytes",
    });
  });

  it("rejects disconnected and wrong-tail lineage before Story validation", () => {
    const first = Object.freeze({
      fromSimulationDigest: digestV1("sim.0"),
      toSimulationDigest: digestV1("sim.1"),
      viaSimulationPatchSetDigest: digestV1("patch.1"),
      adoptedAtCommandSequence: parseNonNegativeSafeInteger(1),
    });
    const disconnected = Object.freeze({
      fromSimulationDigest: digestV1("sim.other"),
      toSimulationDigest: digestV1("simulation.current"),
      viaSimulationPatchSetDigest: digestV1("patch.2"),
      adoptedAtCommandSequence: parseNonNegativeSafeInteger(2),
    });
    const record = makeRecordV1();

    expect(
      decodeSaveRecordV1(
        bytesWithV1(record, { simulationLineage: [first, disconnected] }),
        codecV1,
      ),
    ).toEqual({ kind: "rejected", code: "envelope.schema_invalid" });
    expect(
      decodeSaveRecordV1(bytesWithV1(record, { simulationLineage: [first] }), codecV1),
    ).toEqual({ kind: "rejected", code: "envelope.schema_invalid" });
  });

  it("binds the state digest to State, RNG, sequence, and RunIntegrity only", () => {
    const snapshot = makeSnapshotV1();
    const base = digestCanonical("sillymaker:state:v1", snapshot);
    const modifiedIntegrity = snapshotSchemaV1.parse({
      ...snapshot,
      integrity: {
        mode: "modified",
        mutationCount: 1,
        firstMutationSequence: 3,
        reasons: [
          {
            kind: "fixture_anchor",
            fixtureId: "fixture.synthetic.modified",
            sequence: 3,
          },
        ],
      },
    });
    const variants = [
      snapshotSchemaV1.parse({ ...snapshot, state: { ...snapshot.state, count: 5 } }),
      snapshotSchemaV1.parse({ ...snapshot, rng: { cursor: 18 } }),
      snapshotSchemaV1.parse({ ...snapshot, commandSequence: 4 }),
      modifiedIntegrity,
    ];

    for (const variant of variants) {
      expect(digestCanonical("sillymaker:state:v1", variant)).not.toBe(base);
    }

    const record = makeRecordV1({ snapshot });
    expect(record.stateDigest).toBe(base);
    expect(
      digestCanonical("sillymaker:state:v1", {
        ...snapshot,
        provenance: record.provenance,
      }),
    ).not.toBe(base);
  });

  it("does not emit bytes for an invalid typed candidate", () => {
    const record = makeRecordV1();
    expect(() =>
      encodeSaveRecordV1({ ...record, stateDigest: digestV1("wrong") }, codecV1),
    ).toThrow();
  });
});
