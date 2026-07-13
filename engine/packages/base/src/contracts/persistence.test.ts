// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { digestBytes } from "./digest.js";
import {
  createSaveRecordEnvelopeSchemaV1,
  exportedSaveSchemaV1,
  saveJsonLimitsV1,
  sessionLeaseStatusSchemaV1,
} from "./persistence.js";
import type { RuntimeSchemaV1 } from "./values.js";

const exactValueSchema = <T>(key: string): RuntimeSchemaV1<T> => ({
  parse(value) {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Object.keys(value).join() !== key
    ) {
      throw new TypeError(`invalid ${key}`);
    }
    return Object.freeze({ ...value }) as T;
  },
});

describe("persistence contracts", () => {
  it("keeps Save exports closed and binds the exact bytes", () => {
    const bytes = Uint8Array.of(1);
    const valid = {
      filename: "slot.json",
      mediaType: "application/json",
      digest: digestBytes(bytes),
      bytes,
    };
    expect(exportedSaveSchemaV1.parse(valid)).toEqual(valid);
    expect(() => exportedSaveSchemaV1.parse({ ...valid, summary: {} })).toThrow();
    expect(() =>
      exportedSaveSchemaV1.parse({ ...valid, digest: digestBytes(Uint8Array.of(2)) }),
    ).toThrow();
  });

  it("carries owner and fencing state through every available lease branch", () => {
    expect(
      sessionLeaseStatusSchemaV1.parse({
        kind: "handoff_requested",
        ownerId: "owner-a",
        fencingToken: 3,
        requestId: "request-1",
        requestedByOwnerId: "owner-b",
      }),
    ).toMatchObject({ ownerId: "owner-a", fencingToken: 3 });
    expect(
      sessionLeaseStatusSchemaV1.parse({
        kind: "unowned",
        ownerId: null,
        fencingToken: 1,
      }),
    ).toEqual({ kind: "unowned", ownerId: null, fencingToken: 1 });
  });

  it("builds a strict Save record Schema from four specialization Schemas", () => {
    const schema = createSaveRecordEnvelopeSchemaV1(
      exactValueSchema<{ readonly snapshot: true }>("snapshot"),
      exactValueSchema<{ readonly provenance: true }>("provenance"),
      exactValueSchema<{ readonly slot: true }>("slot"),
      exactValueSchema<{ readonly lineage: true }>("lineage"),
    );
    const valid = {
      formatRevision: 1,
      recordRevision: 2,
      provenance: { provenance: true },
      slot: { slot: true },
      savedAt: "2026-07-12T01:02:03.000Z",
      stateDigest: digestBytes(Uint8Array.of(3)),
      snapshot: { snapshot: true },
      simulationLineage: { lineage: true },
    };
    expect(schema.parse(valid)).toEqual(valid);
    expect(() => schema.parse({ ...valid, extra: true })).toThrow();
    expect(() => schema.parse({ ...valid, savedAt: "2026-07-12" })).toThrow();
    expect(Object.isFrozen(schema.parse(valid))).toBe(true);
  });

  it("freezes the reviewed Save limits", () => {
    expect(saveJsonLimitsV1).toEqual({
      maxBytes: 5_242_880,
      maxDepth: 64,
      maxArrayItems: 10_000,
      maxObjectMembers: 10_000,
      maxNodes: 100_000,
      maxStringBytes: 262_144,
    });
  });
});
