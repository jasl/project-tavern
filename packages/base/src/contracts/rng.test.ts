// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { parseNonZeroUint32 } from "./values.js";
import { createTransactionalRngV1, rngStateV1Schema } from "./rng.js";

describe("xorshift32-v1", () => {
  it("matches the frozen vector and resumes exactly", () => {
    const rng = createTransactionalRngV1(parseNonZeroUint32(0x0002_3049));
    expect(
      rngStateV1Schema.parse({
        algorithm: "xorshift32-v1",
        cursor: 0,
        rawDrawCount: 0,
      }),
    ).toEqual({ algorithm: "xorshift32-v1", cursor: 0, rawDrawCount: 0 });
    expect(() =>
      rngStateV1Schema.parse({
        algorithm: "xorshift32-v1",
        cursor: 0x1_0000_0000,
        rawDrawCount: 0,
      }),
    ).toThrow();
    expect(
      Array.from(
        { length: 12 },
        () =>
          rng.nextInt({ exclusiveMax: 3, purpose: "demand:offset" }) - 1,
      ),
    ).toEqual(Array(12).fill(0));
    expect([
      rng.nextInt({ exclusiveMax: 6, purpose: "check:die.1" }) + 1,
      rng.nextInt({ exclusiveMax: 6, purpose: "check:die.2" }) + 1,
    ]).toEqual([4, 3]);
    expect(rng.candidateState()).toEqual({
      algorithm: "xorshift32-v1",
      cursor: 0x4e7b_7f2e,
      rawDrawCount: 14,
    });
    expect(rng.attemptedDraws()).toHaveLength(14);
    expect(Object.keys(rng).sort()).toEqual([
      "attemptedDraws",
      "candidateState",
      "nextInt",
    ]);
    expect(Object.isFrozen(rng)).toBe(true);

    const committedState = rng.candidateState();
    const resumed = createTransactionalRngV1(committedState);
    expect(resumed.candidateState()).toEqual(committedState);
    expect(resumed.attemptedDraws()).toEqual([]);
    expect(
      resumed.nextInt({ exclusiveMax: 17, purpose: "check:resume.probe" }),
    ).toBe(rng.nextInt({ exclusiveMax: 17, purpose: "check:resume.probe" }));
    expect(resumed.candidateState()).toEqual(rng.candidateState());
  });
});
