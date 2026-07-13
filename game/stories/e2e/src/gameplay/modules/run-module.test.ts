// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "@sillymaker/base";

import { runModuleV1 } from "./run-module.js";

const activeRunStateV1 = Object.freeze({ status: "active" as const });
const completeRunStateV1 = Object.freeze({ status: "complete" as const });

function runCompleteOperationV1(input: {
  readonly flowStatus: "idle" | "choosing" | "blocked" | "resolved";
  readonly nodeId: "intro" | "choice" | "left" | "right" | "rejoin" | "done";
  readonly counterValue: number;
  readonly terminalThreshold: number;
}) {
  return runModuleV1.ownerOperationSchema.parse({
    kind: "run.complete",
    terminal: input,
  });
}

const terminalOperationV1 = () =>
  runCompleteOperationV1({
    flowStatus: "resolved",
    nodeId: "done",
    counterValue: parseNonNegativeSafeInteger(2),
    terminalThreshold: parsePositiveSafeInteger(2),
  });

describe("E2E Run owner", () => {
  it("owns only simulation.run and has no Flow dependency", () => {
    expect(runModuleV1).toMatchObject({
      bindingKind: "stateful",
      descriptor: {
        id: "e2e.run",
        contractRevision: 1,
        stateSlots: ["simulation.run"],
        dependencies: [],
      },
      commandSchema: null,
      querySchema: null,
      queryResultSchema: null,
      queries: null,
    });

    const readPort = runModuleV1.createReadPort(activeRunStateV1);
    expect(readPort).toEqual({ status: "active" });
    expect(readPort).not.toBe(activeRunStateV1);
    expect(Object.keys(readPort)).toEqual(["status"]);
    expect(Object.isFrozen(readPort)).toBe(true);
    expect(readPort).not.toHaveProperty("flow");
    expect(readPort).not.toHaveProperty("snapshot");
  });

  it("strictly parses the complete operation terminal DTO", () => {
    const operation = terminalOperationV1();
    expect(operation).toEqual({
      kind: "run.complete",
      terminal: {
        flowStatus: "resolved",
        nodeId: "done",
        counterValue: 2,
        terminalThreshold: 2,
      },
    });
    expect(Object.keys(operation.terminal).sort()).toEqual([
      "counterValue",
      "flowStatus",
      "nodeId",
      "terminalThreshold",
    ]);
    expect(Object.isFrozen(operation)).toBe(true);
    expect(Object.isFrozen(operation.terminal)).toBe(true);

    expect(() =>
      runModuleV1.ownerOperationSchema.parse({
        kind: "run.complete",
        terminal: {
          flowStatus: "resolved",
          nodeId: "done",
          counterValue: 2,
        },
      }),
    ).toThrow();
    expect(() =>
      runModuleV1.ownerOperationSchema.parse({
        kind: "run.complete",
        terminal: {
          flowStatus: "resolved",
          nodeId: "done",
          counterValue: 2,
          terminalThreshold: 2,
          injected: true,
        },
      }),
    ).toThrow();
    expect(() =>
      runModuleV1.ownerOperationSchema.parse({
        kind: "run.complete",
        terminal: {
          flowStatus: "resolved",
          nodeId: "done",
          counterValue: -1,
          terminalThreshold: 2,
        },
      }),
    ).toThrow();
    expect(() =>
      runModuleV1.ownerOperationSchema.parse({
        kind: "run.complete",
        terminal: {
          flowStatus: "resolved",
          nodeId: "done",
          counterValue: 2,
          terminalThreshold: 0,
        },
      }),
    ).toThrow();
  });

  it("proposes one complete payload and one Run-owned Fact at the terminal boundary", () => {
    const result = runModuleV1.owner.propose(
      activeRunStateV1,
      terminalOperationV1(),
      Object.freeze({}),
    );
    expect(result).toEqual({
      kind: "proposed",
      proposal: {
        payload: { status: "complete" },
        facts: [{ kind: "run.completed" }],
      },
    });
    if (result.kind !== "proposed") throw new TypeError("expected Run proposal");

    const proposal = runModuleV1.ownerProposalSchema.parse(result.proposal);
    expect(runModuleV1.owner.apply(activeRunStateV1, proposal)).toEqual({
      status: "complete",
    });
    expect(() =>
      runModuleV1.ownerProposalSchema.parse({
        payload: { status: "complete" },
        facts: [{ kind: "flow.resolved" }],
      }),
    ).toThrow();
  });

  it("rejects completion when the Run is no longer active", () => {
    expect(
      runModuleV1.owner.propose(completeRunStateV1, terminalOperationV1(), Object.freeze({})),
    ).toEqual({
      kind: "rejected",
      rejection: { code: "run.not_active" },
    });
  });

  it.each([
    {
      name: "flow is unresolved",
      terminal: {
        flowStatus: "blocked" as const,
        nodeId: "done" as const,
        counterValue: 2,
        terminalThreshold: 2,
      },
    },
    {
      name: "node is not done",
      terminal: {
        flowStatus: "resolved" as const,
        nodeId: "rejoin" as const,
        counterValue: 2,
        terminalThreshold: 2,
      },
    },
    {
      name: "counter is below threshold",
      terminal: {
        flowStatus: "resolved" as const,
        nodeId: "done" as const,
        counterValue: 1,
        terminalThreshold: 2,
      },
    },
  ])("rejects completion when $name", ({ terminal }) => {
    expect(
      runModuleV1.owner.propose(
        activeRunStateV1,
        runCompleteOperationV1(terminal),
        Object.freeze({}),
      ),
    ).toEqual({
      kind: "rejected",
      rejection: { code: "run.not_terminal" },
    });
  });
});
