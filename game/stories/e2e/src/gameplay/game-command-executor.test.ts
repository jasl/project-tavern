// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it, vi } from "vitest";

import {
  createGameSnapshotEnvelopeSchemaV1,
  createTransactionalRngV1,
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
  rngStateV1Schema,
} from "@sillymaker/base";

import {
  e2eGameCommandSchemaV1,
  e2eGameStateSchemaV1,
  e2eGameplayFactSchemaV1,
  e2eGameplayFaultSchemaV1,
  e2eRejectionReasonSchemaV1,
} from "./contracts/index.js";
import type { E2eFlowStateV1, E2eGameSnapshotV1, E2eGameplayFactV1 } from "./contracts/index.js";
import { createE2eGameCommandExecutorV1 } from "./game-command-executor.js";
import { createE2eGameplayModulesV1 } from "./modules/index.js";
import type { ChoiceDeltaProviderV1, E2eGameplayModulesV1 } from "./modules/index.js";

const snapshotSchemaV1 = createGameSnapshotEnvelopeSchemaV1(e2eGameStateSchemaV1, rngStateV1Schema);

const defaultChoiceDeltaV1: ChoiceDeltaProviderV1 = (choice) =>
  parsePositiveSafeInteger(choice === "left" ? 1 : 2);

interface SnapshotOptionsV1 {
  readonly counter?: number;
  readonly flow?: E2eFlowStateV1;
  readonly runStatus?: "active" | "complete";
  readonly seed?: number;
  readonly sequence?: number;
}

function createSnapshotV1(options: SnapshotOptionsV1 = {}): E2eGameSnapshotV1 {
  return snapshotSchemaV1.parse({
    state: {
      simulation: {
        counter: { value: options.counter ?? 0 },
        flow: options.flow ?? { status: "idle", branch: null, nodeId: "intro" },
        run: { status: options.runStatus ?? "active" },
      },
    },
    rng: createTransactionalRngV1(parseNonZeroUint32(options.seed ?? 0x0002_3049)).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(options.sequence ?? 0),
  });
}

function createModulesV1(
  provider: ChoiceDeltaProviderV1 = defaultChoiceDeltaV1,
): E2eGameplayModulesV1 {
  return createE2eGameplayModulesV1(provider);
}

type ExecutorV1 = ReturnType<typeof createE2eGameCommandExecutorV1>;
type AttemptV1 = ReturnType<ExecutorV1["executeAttempt"]>;

function executeV1(executor: ExecutorV1, snapshot: E2eGameSnapshotV1, commandValue: unknown) {
  return executor.executeAttempt(snapshot, e2eGameCommandSchemaV1.parse(commandValue), undefined);
}

function requireCommittedV1(attempt: AttemptV1) {
  expect(attempt.result.kind).toBe("committed");
  if (attempt.result.kind !== "committed") throw new TypeError("expected committed attempt");
  return attempt.result;
}

function expectRollbackV1(attempt: AttemptV1, input: E2eGameSnapshotV1): void {
  expect(attempt.result.kind).not.toBe("committed");
  expect(attempt.result.snapshot).toBe(input);
  expect(attempt.result.snapshot.state).toBe(input.state);
  expect(attempt.result.snapshot.rng).toBe(input.rng);
  expect(attempt.result.snapshot.commandSequence).toBe(input.commandSequence);
  expect(attempt.diagnostics.committedRngBefore).toBe(input.rng);
  expect(attempt.diagnostics.committedRngAfter).toBe(input.rng);
}

function expectCommittedContractV1(
  attempt: AttemptV1,
  input: E2eGameSnapshotV1,
  modules: E2eGameplayModulesV1,
): void {
  const result = requireCommittedV1(attempt);
  expect(snapshotSchemaV1.parse(result.snapshot)).toEqual(result.snapshot);
  expect(result.snapshot.commandSequence).toBe(input.commandSequence + 1);
  expect(attempt.diagnostics.committedRngBefore).toBe(input.rng);
  expect(attempt.diagnostics.committedRngAfter).toBe(result.snapshot.rng);
  expect(attempt.diagnostics.candidateRngAfter).toEqual(result.snapshot.rng);
  for (const fact of result.facts) expect(e2eGameplayFactSchemaV1.parse(fact)).toEqual(fact);

  const { counter, flow, run } = result.snapshot.state.simulation;
  expect(
    modules[0].localInvariants.flatMap((invariant) =>
      invariant.check(counter, modules[0].createReadPort(counter)),
    ),
  ).toEqual([]);
  expect(
    modules[1].localInvariants.flatMap((invariant) =>
      invariant.check(flow, modules[1].createReadPort(flow)),
    ),
  ).toEqual([]);
  expect(
    modules[2].localInvariants.flatMap((invariant) =>
      invariant.check(run, modules[2].createReadPort(run)),
    ),
  ).toEqual([]);

  expect(Object.isFrozen(attempt)).toBe(true);
  expect(Object.isFrozen(attempt.result)).toBe(true);
  expect(Object.isFrozen(attempt.diagnostics)).toBe(true);
  expect(Object.isFrozen(attempt.diagnostics.attemptedDraws)).toBe(true);
  expect(Object.isFrozen(result.facts)).toBe(true);
  expect(Object.isFrozen(result.snapshot)).toBe(true);
  expect(Object.isFrozen(result.snapshot.state)).toBe(true);
  expect(Object.isFrozen(result.snapshot.state.simulation)).toBe(true);
  expect(Object.isFrozen(result.snapshot.rng)).toBe(true);
}

function replaceFlowModuleV1(
  modules: E2eGameplayModulesV1,
  flow: E2eGameplayModulesV1[1],
): E2eGameplayModulesV1 {
  return Object.freeze([modules[0], flow, modules[2], modules[3]]) as E2eGameplayModulesV1;
}

describe("E2E GameCommandExecutor", () => {
  it("increments Counter through its owner and commits exactly one sequence", () => {
    const modules = createModulesV1();
    const executor = createE2eGameCommandExecutorV1(modules, parsePositiveSafeInteger(2));
    const input = createSnapshotV1({ counter: 4, sequence: 7 });
    const attempt = executeV1(executor, input, { kind: "e2e.counter.increment" });
    const result = requireCommittedV1(attempt);

    expect(result.snapshot.state.simulation.counter.value).toBe(5);
    expect(result.facts).toEqual([{ kind: "counter.changed", before: 4, after: 5 }]);
    expect(attempt.diagnostics.attemptedDraws).toEqual([]);
    expectCommittedContractV1(attempt, input, modules);
  });

  it.each([1, 6, 0x1_0000_0000])(
    "rolls within 1..%s, records attempted draws, and commits candidate RNG",
    (maximum) => {
      const modules = createModulesV1();
      const executor = createE2eGameCommandExecutorV1(modules, parsePositiveSafeInteger(2));
      const input = createSnapshotV1();
      const attempt = executeV1(executor, input, { kind: "e2e.counter.roll", maximum });
      const result = requireCommittedV1(attempt);
      const value = result.snapshot.state.simulation.counter.value;

      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(maximum);
      expect(attempt.diagnostics.attemptedDraws.length).toBeGreaterThan(0);
      expect(attempt.diagnostics.attemptedDraws[0]?.before).toEqual(input.rng);
      expect(attempt.diagnostics.attemptedDraws.at(-1)?.after).toEqual(result.snapshot.rng);
      expect(result.snapshot.rng).not.toEqual(input.rng);
      expectCommittedContractV1(attempt, input, modules);
    },
  );

  it("executes start, continue, and Run completion through their owners", () => {
    const modules = createModulesV1();
    const executor = createE2eGameCommandExecutorV1(modules, parsePositiveSafeInteger(2));

    const startInput = createSnapshotV1();
    const started = executeV1(executor, startInput, { kind: "e2e.flow.start" });
    expect(requireCommittedV1(started)).toMatchObject({
      snapshot: { state: { simulation: { flow: { status: "choosing", nodeId: "choice" } } } },
      facts: [{ kind: "flow.started" }],
    });
    expectCommittedContractV1(started, startInput, modules);

    const continueInput = createSnapshotV1({
      flow: { status: "blocked", branch: "right", nodeId: "rejoin" },
    });
    const continued = executeV1(executor, continueInput, { kind: "e2e.flow.continue" });
    expect(requireCommittedV1(continued)).toMatchObject({
      snapshot: { state: { simulation: { flow: { status: "resolved", nodeId: "done" } } } },
      facts: [{ kind: "flow.resolved" }],
    });
    expectCommittedContractV1(continued, continueInput, modules);

    const completeInput = createSnapshotV1({
      counter: 2,
      flow: { status: "resolved", branch: "right", nodeId: "done" },
    });
    const completed = executeV1(executor, completeInput, { kind: "e2e.run.complete" });
    expect(requireCommittedV1(completed)).toMatchObject({
      snapshot: { state: { simulation: { run: { status: "complete" } } } },
      facts: [{ kind: "run.completed" }],
    });
    expectCommittedContractV1(completed, completeInput, modules);
  });

  it("applies Counter then Flow atomically and preserves authored Fact order for choose", () => {
    const provider = vi.fn(defaultChoiceDeltaV1);
    const modules = createModulesV1(provider);
    const executor = createE2eGameCommandExecutorV1(modules, parsePositiveSafeInteger(2));
    const input = createSnapshotV1({
      flow: { status: "choosing", branch: null, nodeId: "choice" },
    });
    const attempt = executeV1(executor, input, { kind: "e2e.flow.choose", choice: "right" });
    const result = requireCommittedV1(attempt);

    expect(provider).toHaveBeenCalledExactlyOnceWith("right");
    expect(result.snapshot.state.simulation.counter.value).toBe(2);
    expect(result.snapshot.state.simulation.flow).toEqual({
      status: "blocked",
      branch: "right",
      nodeId: "rejoin",
    });
    expect(result.facts).toEqual([
      { kind: "counter.changed", before: 0, after: 2 },
      { kind: "flow.branch_selected", branch: "right" },
      { kind: "flow.blocked", blocked: true },
    ]);
    expectCommittedContractV1(attempt, input, modules);
  });

  it("rolls back the first owner when the second owner rejects", () => {
    const order: string[] = [];
    const base = createModulesV1();
    const counterOwner = base[0].owner;
    const flowOwner = base[1].owner;
    const counter = Object.freeze({
      ...base[0],
      owner: Object.freeze({
        propose(...args: Parameters<typeof counterOwner.propose>) {
          order.push("counter.propose");
          return counterOwner.propose(...args);
        },
        apply(...args: Parameters<typeof counterOwner.apply>) {
          order.push("counter.apply");
          return counterOwner.apply(...args);
        },
      }),
    }) as E2eGameplayModulesV1[0];
    const flow = Object.freeze({
      ...base[1],
      owner: Object.freeze({
        ...flowOwner,
        propose(..._args: Parameters<typeof flowOwner.propose>) {
          order.push("flow.propose");
          return Object.freeze({
            kind: "rejected" as const,
            rejection: Object.freeze({ code: "flow.not_choosing" as const }),
          });
        },
      }),
    }) as E2eGameplayModulesV1[1];
    const modules = Object.freeze([counter, flow, base[2], base[3]]) as E2eGameplayModulesV1;
    const executor = createE2eGameCommandExecutorV1(modules, parsePositiveSafeInteger(2));
    const input = createSnapshotV1({
      flow: { status: "choosing", branch: null, nodeId: "choice" },
    });
    const attempt = executeV1(executor, input, { kind: "e2e.flow.choose", choice: "right" });

    expect(attempt.result).toMatchObject({
      kind: "rejected",
      reasons: [{ code: "flow.not_choosing" }],
    });
    expect(order).toEqual(["counter.propose", "flow.propose"]);
    expectRollbackV1(attempt, input);
  });

  it("returns stable explicit rejection and fault attempts without consuming RNG", () => {
    const modules = createModulesV1();
    const executor = createE2eGameCommandExecutorV1(modules, parsePositiveSafeInteger(2));
    const input = createSnapshotV1({ sequence: 3 });
    const rejected = executeV1(executor, input, { kind: "e2e.test.reject" });
    const faulted = executeV1(executor, input, { kind: "e2e.test.fault" });

    expect(rejected.result).toMatchObject({
      kind: "rejected",
      reasons: [{ code: "test.rejected" }],
    });
    expect(faulted.result).toMatchObject({ kind: "faulted", fault: { code: "e2e.test.fault" } });
    if (rejected.result.kind === "rejected") {
      expect(e2eRejectionReasonSchemaV1.parse(rejected.result.reasons[0])).toEqual(
        rejected.result.reasons[0],
      );
    }
    if (faulted.result.kind === "faulted") {
      expect(e2eGameplayFaultSchemaV1.parse(faulted.result.fault)).toEqual(faulted.result.fault);
    }
    expect(rejected.diagnostics.attemptedDraws).toEqual([]);
    expect(faulted.diagnostics.attemptedDraws).toEqual([]);
    expectRollbackV1(rejected, input);
    expectRollbackV1(faulted, input);
  });

  it.each([
    { kind: "e2e.counter.increment" },
    { kind: "e2e.counter.roll", maximum: 6 },
    { kind: "e2e.flow.start" },
    { kind: "e2e.flow.choose", choice: "left" },
    { kind: "e2e.flow.continue" },
    { kind: "e2e.run.complete" },
    { kind: "e2e.test.reject" },
    { kind: "e2e.test.fault" },
  ] as const)("rejects terminal Gameplay command $kind before execution", (command) => {
    const modules = createModulesV1();
    const executor = createE2eGameCommandExecutorV1(modules, parsePositiveSafeInteger(2));
    const input = createSnapshotV1({ runStatus: "complete" });
    const attempt = executeV1(executor, input, command);

    expect(attempt.result).toMatchObject({
      kind: "rejected",
      reasons: [{ code: "game.run_complete" }],
    });
    expect(attempt.diagnostics.attemptedDraws).toEqual([]);
    expectRollbackV1(attempt, input);
  });

  it("normalizes a malformed owner proposal to owner.contract_invalid", () => {
    const base = createModulesV1();
    const flowOwner = base[1].owner;
    const flow = Object.freeze({
      ...base[1],
      owner: Object.freeze({
        ...flowOwner,
        propose(..._args: Parameters<typeof flowOwner.propose>) {
          return Object.freeze({
            kind: "proposed" as const,
            proposal: Object.freeze({
              payload: Object.freeze({ status: "blocked", branch: "right", nodeId: "rejoin" }),
              facts: Object.freeze([{ kind: "run.completed" }]),
            }),
          }) as ReturnType<typeof flowOwner.propose>;
        },
      }),
    }) as E2eGameplayModulesV1[1];
    const modules = replaceFlowModuleV1(base, flow);
    const executor = createE2eGameCommandExecutorV1(modules, parsePositiveSafeInteger(2));
    const input = createSnapshotV1({
      flow: { status: "choosing", branch: null, nodeId: "choice" },
    });
    const attempt = executeV1(executor, input, { kind: "e2e.flow.choose", choice: "right" });

    expect(attempt.result).toMatchObject({
      kind: "faulted",
      fault: { code: "e2e.owner.contract_invalid" },
    });
    expectRollbackV1(attempt, input);
  });

  it("normalizes a throwing injected provider to runtime.unexpected", () => {
    const provider = vi.fn(() => {
      throw new Error("provider exploded");
    }) as ChoiceDeltaProviderV1;
    const modules = createModulesV1(provider);
    const executor = createE2eGameCommandExecutorV1(modules, parsePositiveSafeInteger(2));
    const input = createSnapshotV1({
      flow: { status: "choosing", branch: null, nodeId: "choice" },
    });
    const attempt = executeV1(executor, input, { kind: "e2e.flow.choose", choice: "left" });

    expect(attempt.result).toMatchObject({
      kind: "faulted",
      fault: { code: "e2e.runtime.unexpected" },
    });
    expect(provider).toHaveBeenCalledExactlyOnceWith("left");
    expectRollbackV1(attempt, input);
  });

  it("rejects an invalid choice before calling its resolver", () => {
    const provider = vi.fn(() => {
      throw new Error("the current-state guard must run first");
    }) as ChoiceDeltaProviderV1;
    const modules = createModulesV1(provider);
    const executor = createE2eGameCommandExecutorV1(modules, parsePositiveSafeInteger(2));
    const input = createSnapshotV1();
    const attempt = executeV1(executor, input, {
      kind: "e2e.flow.choose",
      choice: "left",
    });

    expect(attempt.result).toMatchObject({
      kind: "rejected",
      reasons: [{ code: "flow.not_choosing" }],
    });
    expect(provider).not.toHaveBeenCalled();
    expectRollbackV1(attempt, input);
  });

  it("rolls back a candidate that fails a module invariant", () => {
    const base = createModulesV1();
    const forcedInvariant = Object.freeze({
      check() {
        return Object.freeze([
          Object.freeze({
            code: "test.forced_invariant",
            details: Object.freeze({ source: "test" }),
          }),
        ]);
      },
    }) satisfies E2eGameplayModulesV1[1]["localInvariants"][number];
    const flow = Object.freeze({
      ...base[1],
      localInvariants: Object.freeze([...base[1].localInvariants, forcedInvariant]),
    }) as E2eGameplayModulesV1[1];
    const modules = replaceFlowModuleV1(base, flow);
    const executor = createE2eGameCommandExecutorV1(modules, parsePositiveSafeInteger(2));
    const input = createSnapshotV1();
    const attempt = executeV1(executor, input, { kind: "e2e.flow.start" });

    expect(attempt.result).toMatchObject({
      kind: "faulted",
      fault: { code: "e2e.owner.contract_invalid" },
    });
    expectRollbackV1(attempt, input);
  });

  it("keeps committed Facts deeply frozen", () => {
    const modules = createModulesV1();
    const executor = createE2eGameCommandExecutorV1(modules, parsePositiveSafeInteger(2));
    const input = createSnapshotV1();
    const result = requireCommittedV1(
      executeV1(executor, input, { kind: "e2e.counter.increment" }),
    );

    expect(result.facts.every((fact: E2eGameplayFactV1) => Object.isFrozen(fact))).toBe(true);
  });
});
