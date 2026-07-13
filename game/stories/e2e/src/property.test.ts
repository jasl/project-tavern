// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";
import fc from "fast-check";

import {
  createGameSnapshotEnvelopeSchemaV1,
  createTransactionalRngV1,
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
  rngStateV1Schema,
} from "@sillymaker/base";
import { resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import {
  e2eDebugCommandSchemaV1,
  e2eGameCommandSchemaV1,
  e2eGameStateSchemaV1,
} from "./gameplay/contracts/index.js";
import type {
  E2eDebugCommandV1,
  E2eGameCommandV1,
  E2eGameSnapshotV1,
} from "./gameplay/contracts/index.js";
import { createE2eGameSimulationV1 } from "./gameplay/game-simulation.js";
import { createE2eSessionV1 } from "./session.js";
import { createE2eInitialSnapshotV1 } from "./session.js";
import { e2eStoryEntryV1 } from "./story-entry.js";

async function run(seed: number, count: number): Promise<number> {
  const { gameSimulation } = resolveStoryForTestV1(e2eStoryEntryV1);
  const session = createE2eSessionV1(gameSimulation, {
    rngSeed: parseNonZeroUint32(seed),
  });
  for (let index = 0; index < count; index += 1) {
    const result = await session.dispatch({ kind: "e2e.counter.increment" });
    if (result.kind !== "executed" || result.execution.kind !== "committed") {
      throw new TypeError("E2e increment did not commit");
    }
  }
  return session.getCurrentSnapshot().state.simulation.counter.value;
}

describe("E2e deterministic counter properties", () => {
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

const canonicalSnapshotSchemaV1 = createGameSnapshotEnvelopeSchemaV1(
  e2eGameStateSchemaV1,
  rngStateV1Schema,
);

function propertyChoiceDeltaV1(choice: "left" | "right") {
  return parsePositiveSafeInteger(choice === "left" ? 1 : 2);
}

const propertyProgramV1 = Object.freeze({
  rules: Object.freeze({ resolveChoiceDelta: propertyChoiceDeltaV1 }),
  values: Object.freeze({ terminalThreshold: parsePositiveSafeInteger(2) }),
});

const normalCommandArbitraryV1: fc.Arbitrary<E2eGameCommandV1> = fc.oneof(
  fc.constant({ kind: "e2e.counter.increment" } as const),
  fc.integer({ min: 1, max: 12 }).map((maximum) => ({
    kind: "e2e.counter.roll" as const,
    maximum: parsePositiveSafeInteger(maximum),
  })),
  fc.constant({ kind: "e2e.flow.start" } as const),
  fc.constantFrom("left" as const, "right" as const).map((choice) => ({
    kind: "e2e.flow.choose" as const,
    choice,
  })),
  fc.constant({ kind: "e2e.flow.continue" } as const),
  fc.constant({ kind: "e2e.run.complete" } as const),
  fc.constant({ kind: "e2e.test.reject" } as const),
  fc.constant({ kind: "e2e.test.fault" } as const),
);

const debugCommandArbitraryV1: fc.Arbitrary<E2eDebugCommandV1> = fc.oneof(
  fc.integer({ min: 1, max: 12 }).map((amount) => ({
    kind: "debug.e2e.counter.add" as const,
    amount: parsePositiveSafeInteger(amount),
  })),
  fc.boolean().map((blocked) => ({
    kind: "debug.e2e.flow.set_blocked" as const,
    blocked,
  })),
  fc.constant({ kind: "debug.e2e.test.validation_failed" } as const),
  fc.constant({ kind: "debug.e2e.test.fault" } as const),
);

type PropertyOperationV1 =
  | { readonly channel: "normal"; readonly command: E2eGameCommandV1 }
  | { readonly channel: "debug"; readonly command: E2eDebugCommandV1 };

const propertyOperationArbitraryV1: fc.Arbitrary<PropertyOperationV1> = fc.oneof(
  normalCommandArbitraryV1.map((command) => ({ channel: "normal" as const, command })),
  debugCommandArbitraryV1.map((command) => ({ channel: "debug" as const, command })),
);

function runCanonicalOperationsV1(seed: number, operations: readonly PropertyOperationV1[]) {
  const simulation = createE2eGameSimulationV1(propertyProgramV1);
  let snapshot: E2eGameSnapshotV1 = createE2eInitialSnapshotV1(simulation, {
    rngSeed: parseNonZeroUint32(seed),
  });
  const transcript: unknown[] = [];

  for (const operation of operations) {
    const before = snapshot;
    if (operation.channel === "normal") {
      const command = e2eGameCommandSchemaV1.parse(operation.command);
      const attempt = simulation.commandExecutor.executeAttempt(before, command, undefined);
      expect(canonicalSnapshotSchemaV1.parse(attempt.result.snapshot)).toEqual(
        attempt.result.snapshot,
      );
      if (attempt.result.kind === "committed") {
        expect(attempt.result.snapshot.commandSequence).toBe(before.commandSequence + 1);
        snapshot = attempt.result.snapshot;
      } else {
        expect(attempt.result.snapshot).toBe(before);
        expect(attempt.result.snapshot.state).toBe(before.state);
        expect(attempt.result.snapshot.rng).toBe(before.rng);
        expect(attempt.result.snapshot.commandSequence).toBe(before.commandSequence);
      }
      transcript.push(attempt);
      continue;
    }

    const command = e2eDebugCommandSchemaV1.parse(operation.command);
    const validation = simulation.debugCommandExecutor.validate(before, command, undefined);
    transcript.push(validation);
    if (validation.kind === "validation_failed") continue;
    const attempt = simulation.debugCommandExecutor.executeAttempt(before, command, undefined);
    expect(attempt.result.kind).not.toBe("rejected");
    expect(canonicalSnapshotSchemaV1.parse(attempt.result.snapshot)).toEqual(
      attempt.result.snapshot,
    );
    if (attempt.result.kind === "committed") {
      expect(attempt.result.snapshot.commandSequence).toBe(before.commandSequence + 1);
      snapshot = attempt.result.snapshot;
    } else {
      expect(attempt.result.snapshot).toBe(before);
      expect(attempt.result.snapshot.rng).toBe(before.rng);
    }
    transcript.push(attempt);
  }

  return Object.freeze({ snapshot, transcript: Object.freeze(transcript) });
}

describe("canonical E2E execution properties", () => {
  it("keeps up to 100 mixed normal/debug operations deterministic", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 0xffff_ffff }),
        fc.array(propertyOperationArbitraryV1, { maxLength: 100 }),
        (seed, operations) => {
          const first = runCanonicalOperationsV1(seed, operations);
          const second = runCanonicalOperationsV1(seed, operations);
          expect(second).toEqual(first);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects every normal command after the Run is terminal", () => {
    fc.assert(
      fc.property(normalCommandArbitraryV1, (command) => {
        const simulation = createE2eGameSimulationV1(propertyProgramV1);
        const snapshot = canonicalSnapshotSchemaV1.parse({
          state: {
            simulation: {
              counter: { value: 2 },
              flow: { status: "resolved", branch: "right", nodeId: "done" },
              run: { status: "complete" },
            },
          },
          rng: createTransactionalRngV1(parseNonZeroUint32(0x0002_3049)).candidateState(),
          commandSequence: parseNonNegativeSafeInteger(4),
        });
        const attempt = simulation.commandExecutor.executeAttempt(snapshot, command, undefined);
        expect(attempt.result).toEqual({
          kind: "rejected",
          snapshot,
          reasons: [{ code: "game.run_complete" }],
        });
        expect(attempt.result.snapshot).toBe(snapshot);
      }),
      { numRuns: 100 },
    );
  });
});
