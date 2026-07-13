// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { RuntimeSchemaV1 } from "./values.js";
import { createGameSnapshotEnvelopeSchemaV1 } from "./snapshot.js";

const counterStateSchema: RuntimeSchemaV1<{ readonly count: number }> = {
  parse(value) {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).join() !== "count" ||
      typeof (value as { count?: unknown }).count !== "number"
    ) {
      throw new TypeError("invalid counter state");
    }
    return Object.freeze({ count: (value as { count: number }).count });
  },
};

const syntheticRngStateSchema: RuntimeSchemaV1<{ readonly cursor: number }> = {
  parse(value) {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).join() !== "cursor" ||
      typeof (value as { cursor?: unknown }).cursor !== "number"
    ) {
      throw new TypeError("invalid RNG state");
    }
    return Object.freeze({ cursor: (value as { cursor: number }).cursor });
  },
};

describe("generic Snapshot envelope", () => {
  it("parses exact fields and rejects unknown keys", () => {
    const schema = createGameSnapshotEnvelopeSchemaV1(counterStateSchema, syntheticRngStateSchema);
    expect(
      schema.parse({
        state: { count: 0 },
        rng: { cursor: 1 },
        commandSequence: 0,
      }),
    ).toEqual({
      state: { count: 0 },
      rng: { cursor: 1 },
      commandSequence: 0,
    });
    expect(() =>
      schema.parse({
        state: { count: 0 },
        rng: { cursor: 1 },
        commandSequence: 0,
        extra: true,
      }),
    ).toThrow();
  });
});
