// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { rejectAttemptV1 } from "./execution.js";
import { createTransactionalRngV1, rngStateV1Schema } from "./rng.js";
import { parseNonNegativeSafeInteger, parseNonZeroUint32 } from "./values.js";

describe("execution attempts", () => {
  it("keeps rejected attempts on the committed Snapshot", () => {
    const committedRng = rngStateV1Schema.parse({
      algorithm: "xorshift32-v1" as const,
      cursor: 0x0002_3049,
      rawDrawCount: parseNonNegativeSafeInteger(0),
    });
    const snapshot = Object.freeze({
      state: Object.freeze({ count: 0 }),
      rng: committedRng,
      commandSequence: parseNonNegativeSafeInteger(0),
    });
    const rng = createTransactionalRngV1(parseNonZeroUint32(0x0002_3049));
    for (let index = 0; index < 14; index += 1) {
      rng.nextInt({ exclusiveMax: 3, purpose: `demand:attempt.${index}` });
    }

    const rejected = rejectAttemptV1(snapshot, rng, [
      { code: "synthetic.reject" },
    ]);

    expect(rejected.result.snapshot).toBe(snapshot);
    expect(rejected.diagnostics.committedRngAfter).toBe(snapshot.rng);
    expect(rejected.diagnostics.attemptedDraws).toHaveLength(14);
    expect(Object.isFrozen(rejected)).toBe(true);
  });
});
