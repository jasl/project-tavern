// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it, vi } from "vitest";

import {
  createTransactionalRngV1,
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
} from "@sillymaker/base";

import {
  e2eDebugCommandSchemaV1,
  e2eGameStateSchemaV1,
  initialFlowStateV1,
  initialRunStateV1,
} from "./contracts/index.js";
import type { E2eDebugCommandV1, E2eFlowStateV1, E2eGameSnapshotV1 } from "./contracts/index.js";
import { createE2eGameDebugCommandExecutorV1 } from "./game-debug-command-executor.js";
import { createE2eGameplayModulesV1 } from "./modules/index.js";
import type { E2eGameplayModulesV1 } from "./modules/index.js";

interface SnapshotFixtureInputV1 {
  readonly counterValue?: number;
  readonly flow?: E2eFlowStateV1;
  readonly commandSequence?: number;
}

function createSnapshotV1(input: SnapshotFixtureInputV1 = {}): E2eGameSnapshotV1 {
  return Object.freeze({
    state: e2eGameStateSchemaV1.parse({
      simulation: {
        counter: { value: parseNonNegativeSafeInteger(input.counterValue ?? 0) },
        flow: input.flow ?? initialFlowStateV1,
        run: initialRunStateV1,
      },
    }),
    rng: createTransactionalRngV1(parseNonZeroUint32(0x0002_3049)).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(input.commandSequence ?? 0),
  });
}

function parseDebugCommandV1(value: unknown): E2eDebugCommandV1 {
  return e2eDebugCommandSchemaV1.parse(value);
}

function createModulesV1(): E2eGameplayModulesV1 {
  return createE2eGameplayModulesV1((choice) =>
    parsePositiveSafeInteger(choice === "left" ? 1 : 2),
  );
}

function createInstrumentedModulesV1() {
  const modules = createModulesV1();
  const counterPropose = vi.fn((...args: Parameters<(typeof modules)[0]["owner"]["propose"]>) =>
    modules[0].owner.propose(...args),
  );
  const counterApply = vi.fn((...args: Parameters<(typeof modules)[0]["owner"]["apply"]>) =>
    modules[0].owner.apply(...args),
  );
  const flowPropose = vi.fn((...args: Parameters<(typeof modules)[1]["owner"]["propose"]>) =>
    modules[1].owner.propose(...args),
  );
  const flowApply = vi.fn((...args: Parameters<(typeof modules)[1]["owner"]["apply"]>) =>
    modules[1].owner.apply(...args),
  );
  const instrumented = Object.freeze([
    Object.freeze({
      ...modules[0],
      owner: Object.freeze({ propose: counterPropose, apply: counterApply }),
    }),
    Object.freeze({
      ...modules[1],
      owner: Object.freeze({ propose: flowPropose, apply: flowApply }),
    }),
    modules[2],
    modules[3],
  ] as const);
  return Object.freeze({
    modules: instrumented,
    counterPropose,
    counterApply,
    flowPropose,
    flowApply,
  });
}

function replaceCounterProposeV1(
  propose: E2eGameplayModulesV1[0]["owner"]["propose"],
): E2eGameplayModulesV1 {
  const modules = createModulesV1();
  return Object.freeze([
    Object.freeze({
      ...modules[0],
      owner: Object.freeze({ ...modules[0].owner, propose }),
    }),
    modules[1],
    modules[2],
    modules[3],
  ] as const);
}

describe("E2E GameDebugCommandExecutor", () => {
  it("exposes only the frozen validator and replayable attempt surface", () => {
    const executor = createE2eGameDebugCommandExecutorV1(createModulesV1());

    expect(Object.keys(executor).sort()).toEqual(["executeAttempt", "validate"]);
    expect(Object.isFrozen(executor)).toBe(true);
    expect(executor).not.toHaveProperty("createQueries");
    expect(executor).not.toHaveProperty("runIntegrity");
    expect(executor).not.toHaveProperty("markRunModifiedV1");
  });

  it("allows valid Counter and Flow mutations at the current queue-front State", () => {
    const executor = createE2eGameDebugCommandExecutorV1(createModulesV1());
    const counterSnapshot = createSnapshotV1();
    const choosingSnapshot = createSnapshotV1({
      flow: Object.freeze({ status: "choosing", branch: null, nodeId: "choice" }),
    });

    expect(
      executor.validate(
        counterSnapshot,
        parseDebugCommandV1({ kind: "debug.e2e.counter.add", amount: 2 }),
        undefined,
      ),
    ).toEqual({ kind: "allowed" });
    expect(
      executor.validate(
        choosingSnapshot,
        parseDebugCommandV1({ kind: "debug.e2e.flow.set_blocked", blocked: true }),
        undefined,
      ),
    ).toEqual({ kind: "allowed" });
    expect(() =>
      parseDebugCommandV1({ kind: "debug.e2e.counter.add", amount: 2, injected: true }),
    ).toThrow();
  });

  it("returns the bounded Counter validation error without opening an owner attempt", () => {
    const fixture = createInstrumentedModulesV1();
    const executor = createE2eGameDebugCommandExecutorV1(fixture.modules);
    const snapshot = createSnapshotV1({ counterValue: Number.MAX_SAFE_INTEGER });

    expect(
      executor.validate(
        snapshot,
        parseDebugCommandV1({ kind: "debug.e2e.counter.add", amount: 1 }),
        undefined,
      ),
    ).toEqual({
      kind: "validation_failed",
      errors: [
        {
          code: "debug.e2e.value_out_of_range",
          commandKind: "debug.e2e.counter.add",
        },
      ],
    });
    expect(fixture.counterPropose).not.toHaveBeenCalled();
    expect(fixture.counterApply).not.toHaveBeenCalled();
    expect(snapshot.commandSequence).toBe(0);
  });

  it("rejects a Flow State conflict and the explicit validation fixture without an attempt", () => {
    const fixture = createInstrumentedModulesV1();
    const executor = createE2eGameDebugCommandExecutorV1(fixture.modules);
    const snapshot = createSnapshotV1();

    expect(
      executor.validate(
        snapshot,
        parseDebugCommandV1({ kind: "debug.e2e.flow.set_blocked", blocked: true }),
        undefined,
      ),
    ).toEqual({
      kind: "validation_failed",
      errors: [
        {
          code: "debug.e2e.state_conflict",
          commandKind: "debug.e2e.flow.set_blocked",
        },
      ],
    });
    expect(
      executor.validate(
        snapshot,
        parseDebugCommandV1({ kind: "debug.e2e.test.validation_failed" }),
        undefined,
      ),
    ).toEqual({
      kind: "validation_failed",
      errors: [
        {
          code: "debug.e2e.test_validation_failed",
          commandKind: "debug.e2e.test.validation_failed",
        },
      ],
    });
    expect(fixture.flowPropose).not.toHaveBeenCalled();
    expect(fixture.flowApply).not.toHaveBeenCalled();
  });

  it("commits Counter DebugCommands through the owner with Facts, sequence, and unchanged RNG", () => {
    const fixture = createInstrumentedModulesV1();
    const executor = createE2eGameDebugCommandExecutorV1(fixture.modules);
    const snapshot = createSnapshotV1({ commandSequence: 4 });
    const attempt = executor.executeAttempt(
      snapshot,
      parseDebugCommandV1({ kind: "debug.e2e.counter.add", amount: 3 }),
      undefined,
    );

    expect(fixture.counterPropose).toHaveBeenCalledOnce();
    expect(fixture.counterApply).toHaveBeenCalledOnce();
    expect(fixture.flowPropose).not.toHaveBeenCalled();
    expect(attempt.result.kind).toBe("committed");
    if (attempt.result.kind !== "committed")
      throw new TypeError("expected committed debug attempt");
    expect(attempt.result.snapshot.state.simulation.counter.value).toBe(3);
    expect(attempt.result.snapshot.state.simulation.flow).toBe(snapshot.state.simulation.flow);
    expect(attempt.result.snapshot.commandSequence).toBe(5);
    expect(attempt.result.snapshot.rng).toBe(snapshot.rng);
    expect(attempt.result.facts).toEqual([{ kind: "counter.changed", before: 0, after: 3 }]);
    expect(attempt.diagnostics.attemptedDraws).toEqual([]);
    expect(attempt.diagnostics.committedRngBefore).toBe(snapshot.rng);
    expect(attempt.diagnostics.committedRngAfter).toBe(snapshot.rng);
  });

  it("commits Flow DebugCommands through the owner without touching Counter or RNG", () => {
    const fixture = createInstrumentedModulesV1();
    const executor = createE2eGameDebugCommandExecutorV1(fixture.modules);
    const snapshot = createSnapshotV1({
      counterValue: 2,
      flow: Object.freeze({ status: "choosing", branch: null, nodeId: "choice" }),
    });
    const attempt = executor.executeAttempt(
      snapshot,
      parseDebugCommandV1({ kind: "debug.e2e.flow.set_blocked", blocked: true }),
      undefined,
    );

    expect(fixture.flowPropose).toHaveBeenCalledOnce();
    expect(fixture.flowApply).toHaveBeenCalledOnce();
    expect(fixture.counterPropose).not.toHaveBeenCalled();
    expect(attempt.result.kind).toBe("committed");
    if (attempt.result.kind !== "committed")
      throw new TypeError("expected committed debug attempt");
    expect(attempt.result.snapshot.state.simulation.counter).toBe(
      snapshot.state.simulation.counter,
    );
    expect(attempt.result.snapshot.state.simulation.flow).toEqual({
      status: "blocked",
      branch: null,
      nodeId: "choice",
    });
    expect(attempt.result.snapshot.rng).toBe(snapshot.rng);
    expect(attempt.result.facts).toEqual([{ kind: "flow.blocked", blocked: true }]);
  });

  it("returns the explicit Debug fault without changing the input Snapshot", () => {
    const executor = createE2eGameDebugCommandExecutorV1(createModulesV1());
    const snapshot = createSnapshotV1({ commandSequence: 7 });
    const command = parseDebugCommandV1({ kind: "debug.e2e.test.fault" });

    expect(executor.validate(snapshot, command, undefined)).toEqual({ kind: "allowed" });
    const attempt = executor.executeAttempt(snapshot, command, undefined);
    expect(attempt.result).toEqual({
      kind: "faulted",
      snapshot,
      fault: { code: "e2e.test.fault" },
    });
    expect(attempt.result.snapshot).toBe(snapshot);
    expect(attempt.diagnostics.committedRngAfter).toBe(snapshot.rng);
  });

  it("normalizes direct-use owner rejection and malformed proposals to owner contract faults", () => {
    const snapshot = createSnapshotV1();
    const command = parseDebugCommandV1({ kind: "debug.e2e.counter.add", amount: 1 });
    const rejectingModules = replaceCounterProposeV1(() =>
      Object.freeze({
        kind: "rejected" as const,
        rejection: Object.freeze({ code: "counter.value_out_of_range" as const }),
      }),
    );
    const malformedPropose = (() =>
      Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({ payload: Object.freeze({ value: 1 }), facts: Object.freeze([]) }),
      })) as unknown as E2eGameplayModulesV1[0]["owner"]["propose"];

    for (const modules of [rejectingModules, replaceCounterProposeV1(malformedPropose)]) {
      const attempt = createE2eGameDebugCommandExecutorV1(modules).executeAttempt(
        snapshot,
        command,
        undefined,
      );
      expect(attempt.result).toEqual({
        kind: "faulted",
        snapshot,
        fault: { code: "e2e.owner.contract_invalid" },
      });
      expect(attempt.result.kind).not.toBe("rejected");
      expect(attempt.result.snapshot).toBe(snapshot);
      expect(attempt.diagnostics.committedRngAfter).toBe(snapshot.rng);
    }
  });
});
