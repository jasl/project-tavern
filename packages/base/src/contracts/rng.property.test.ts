// SPDX-License-Identifier: MIT
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createTransactionalRngV1 } from "./rng.js";
import { parseNonZeroUint32 } from "./values.js";

function runDrawVector(seed: number, exclusiveMax: number) {
  const rng = createTransactionalRngV1(parseNonZeroUint32(seed));
  const results = Array.from({ length: 64 }, (_, index) =>
    rng.nextInt({ exclusiveMax, purpose: `scheduler:property.${index}` }),
  );
  return { results, state: rng.candidateState() };
}

describe("transactional RNG properties", () => {
  it("is deterministic and bounded", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 0xffff_ffff }),
        fc.integer({ min: 1, max: 0x1_0000_0000 }),
        (seed, exclusiveMax) => {
          const left = runDrawVector(seed, exclusiveMax);
          const right = runDrawVector(seed, exclusiveMax);
          expect(left).toEqual(right);
          expect(
            left.results.every(
              (value) => value >= 0 && value < exclusiveMax,
            ),
          ).toBe(true);
        },
      ),
    );
  });
});
