// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { parseNonZeroUint32 } from "@sillymaker/base";
import { resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import { createSandboxSessionV1 } from "./session.js";
import { sandboxStoryEntryV1 } from "./story-entry.js";

async function run(seed: number, count: number): Promise<number> {
  const { gameSimulation } = resolveStoryForTestV1(sandboxStoryEntryV1);
  const session = createSandboxSessionV1(gameSimulation, {
    rngSeed: parseNonZeroUint32(seed),
  });
  for (let index = 0; index < count; index += 1) {
    const result = await session.dispatch({ kind: "sandbox.counter.increment" });
    if (result.kind !== "executed" || result.execution.kind !== "committed") {
      throw new TypeError("Sandbox increment did not commit");
    }
  }
  return session.getCurrentSnapshot().state.simulation.counter.value;
}

describe("Sandbox deterministic counter properties", () => {
  it("returns the same bounded count for every valid seed", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 0xffff_ffff }),
        fc.integer({ min: 1, max: 12 }),
        async (seed, count) => {
          const first = await run(seed, count);
          const second = await run(seed, count);
          expect(first).toBe(count);
          expect(second).toBe(first);
        },
      ),
      { numRuns: 1_000 },
    );
  });
});
