// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { parseNonNegativeSafeInteger } from "@sillymaker/base";

import { flowModuleV1 } from "./flow-module.js";

type FlowStatusFixtureV1 = "idle" | "choosing" | "blocked" | "resolved";
type FlowBranchFixtureV1 = "left" | "right" | null;
type FlowNodeFixtureV1 = "intro" | "choice" | "left" | "right" | "rejoin" | "done";

interface FlowStateFixtureV1 {
  readonly status: FlowStatusFixtureV1;
  readonly branch: FlowBranchFixtureV1;
  readonly nodeId: FlowNodeFixtureV1;
}

function flowState(
  status: FlowStatusFixtureV1,
  branch: FlowBranchFixtureV1,
  nodeId: FlowNodeFixtureV1,
): FlowStateFixtureV1 {
  return Object.freeze({ status, branch, nodeId });
}

function counterDependencies(value = 0) {
  return Object.freeze({
    counter: Object.freeze({ value: parseNonNegativeSafeInteger(value) }),
  });
}

function propose(
  state: FlowStateFixtureV1,
  operationValue: unknown,
  dependencies: unknown = counterDependencies(),
) {
  const operation = flowModuleV1.ownerOperationSchema.parse(operationValue);
  return flowModuleV1.owner.propose(
    state,
    operation,
    dependencies as Parameters<typeof flowModuleV1.owner.propose>[2],
  );
}

function requireProposal(
  state: FlowStateFixtureV1,
  operationValue: unknown,
  dependencies: unknown = counterDependencies(),
) {
  const result = propose(state, operationValue, dependencies);
  expect(result.kind).toBe("proposed");
  if (result.kind !== "proposed") {
    throw new TypeError("expected Flow owner proposal");
  }
  return flowModuleV1.ownerProposalSchema.parse(result.proposal);
}

function applyProposal(state: FlowStateFixtureV1, proposal: unknown) {
  return flowModuleV1.owner.apply(state, flowModuleV1.ownerProposalSchema.parse(proposal));
}

function invariantViolations(state: FlowStateFixtureV1) {
  const validReadPort = flowModuleV1.createReadPort(flowState("idle", null, "intro"));
  return flowModuleV1.localInvariants.flatMap((invariant) => invariant.check(state, validReadPort));
}

describe("E2E Flow owner", () => {
  it("owns the exact Flow slot and creates a fresh frozen read projection", () => {
    expect(flowModuleV1).toMatchObject({
      bindingKind: "stateful",
      descriptor: {
        id: "e2e.flow",
        contractRevision: 1,
        stateSlots: ["simulation.flow"],
        dependencies: ["e2e.counter"],
      },
      commandSchema: null,
      querySchema: null,
      queryResultSchema: null,
      queries: null,
    });
    const state = flowState("blocked", "right", "rejoin");
    const readPort = flowModuleV1.createReadPort(state);

    expect(readPort).toEqual(state);
    expect(readPort).not.toBe(state);
    expect(Object.keys(readPort)).toEqual(["status", "branch", "nodeId"]);
    expect(Object.isFrozen(readPort)).toBe(true);
    expect(readPort).not.toHaveProperty("counter");
    expect(readPort).not.toHaveProperty("snapshot");
    expect(readPort).not.toHaveProperty("state");
    expect(readPort).not.toHaveProperty("rng");
  });

  it("applies the exact start, choose, and continue transitions with authored fact order", () => {
    const idle = flowState("idle", null, "intro");
    const started = requireProposal(idle, { kind: "flow.start" });
    expect(started).toEqual({
      payload: { status: "choosing", branch: null, nodeId: "choice" },
      facts: [{ kind: "flow.started" }],
    });
    const choosing = applyProposal(idle, started);
    expect(choosing).toEqual({ status: "choosing", branch: null, nodeId: "choice" });

    const chosen = requireProposal(choosing, { kind: "flow.choose", choice: "right" });
    expect(chosen).toEqual({
      payload: { status: "blocked", branch: "right", nodeId: "rejoin" },
      facts: [
        { kind: "flow.branch_selected", branch: "right" },
        { kind: "flow.blocked", blocked: true },
      ],
    });
    const blocked = applyProposal(choosing, chosen);
    expect(blocked).toEqual({ status: "blocked", branch: "right", nodeId: "rejoin" });

    const continued = requireProposal(blocked, { kind: "flow.continue" });
    expect(continued).toEqual({
      payload: { status: "resolved", branch: "right", nodeId: "done" },
      facts: [{ kind: "flow.resolved" }],
    });
    expect(applyProposal(blocked, continued)).toEqual({
      status: "resolved",
      branch: "right",
      nodeId: "done",
    });

    expect(Object.isFrozen(started)).toBe(true);
    expect(Object.isFrozen(started.payload)).toBe(true);
    expect(Object.isFrozen(started.facts)).toBe(true);
    expect(Object.isFrozen(choosing)).toBe(true);
  });

  it.each([
    [flowState("choosing", null, "choice"), { kind: "flow.start" }, "flow.not_idle"],
    [
      flowState("idle", null, "intro"),
      { kind: "flow.choose", choice: "left" },
      "flow.not_choosing",
    ],
    [flowState("choosing", null, "choice"), { kind: "flow.continue" }, "flow.not_blocked"],
  ] as const)("rejects an invalid %s transition with %s", (state, operation, code) => {
    expect(propose(state, operation)).toEqual({
      kind: "rejected",
      rejection: { code },
    });
  });

  it("reports branch and resolved-node invariant violations", () => {
    expect(invariantViolations(flowState("idle", "left", "intro")).length).toBeGreaterThan(0);
    expect(invariantViolations(flowState("resolved", "right", "rejoin")).length).toBeGreaterThan(0);
    expect(invariantViolations(flowState("choosing", null, "choice"))).toEqual([]);
    expect(invariantViolations(flowState("blocked", "right", "rejoin"))).toEqual([]);
    expect(invariantViolations(flowState("resolved", "right", "done"))).toEqual([]);
  });

  it("accepts only a frozen exact Counter read-port dependency", () => {
    const exact = counterDependencies(2);
    expect(Object.isFrozen(exact)).toBe(true);
    expect(Object.isFrozen(exact.counter)).toBe(true);
    expect(propose(flowState("idle", null, "intro"), { kind: "flow.start" }, exact).kind).toBe(
      "proposed",
    );

    expect(() =>
      propose(
        flowState("idle", null, "intro"),
        { kind: "flow.start" },
        {
          counter: exact.counter,
        },
      ),
    ).toThrow();
    expect(() =>
      propose(
        flowState("idle", null, "intro"),
        { kind: "flow.start" },
        Object.freeze({ counter: { value: parseNonNegativeSafeInteger(2) } }),
      ),
    ).toThrow();
    expect(() =>
      propose(
        flowState("idle", null, "intro"),
        { kind: "flow.start" },
        Object.freeze({
          counter: Object.freeze({
            value: parseNonNegativeSafeInteger(2),
            extra: true,
          }),
        }),
      ),
    ).toThrow();
    expect(() =>
      propose(
        flowState("idle", null, "intro"),
        { kind: "flow.start" },
        Object.freeze({
          counter: Object.freeze({
            state: Object.freeze({
              simulation: Object.freeze({
                counter: Object.freeze({ value: parseNonNegativeSafeInteger(2) }),
              }),
            }),
            rng: Object.freeze({}),
            commandSequence: 0,
          }),
        }),
      ),
    ).toThrow();
    expect(() =>
      propose(
        flowState("idle", null, "intro"),
        { kind: "flow.start" },
        Object.freeze({
          counter: exact.counter,
          snapshot: Object.freeze({}),
        }),
      ),
    ).toThrow();
  });

  it("toggles debug blocking only between choosing and blocked while preserving branch and node", () => {
    const choosing = flowState("choosing", null, "choice");
    const block = requireProposal(choosing, {
      kind: "flow.set_blocked",
      blocked: true,
    });
    expect(block).toEqual({
      payload: { status: "blocked", branch: null, nodeId: "choice" },
      facts: [{ kind: "flow.blocked", blocked: true }],
    });
    expect(applyProposal(choosing, block)).toEqual({
      status: "blocked",
      branch: null,
      nodeId: "choice",
    });

    const blocked = flowState("blocked", "right", "rejoin");
    const unblock = requireProposal(blocked, {
      kind: "flow.set_blocked",
      blocked: false,
    });
    expect(unblock).toEqual({
      payload: { status: "choosing", branch: "right", nodeId: "rejoin" },
      facts: [{ kind: "flow.blocked", blocked: false }],
    });
    expect(applyProposal(blocked, unblock)).toEqual({
      status: "choosing",
      branch: "right",
      nodeId: "rejoin",
    });

    for (const [state, blockedValue] of [
      [flowState("choosing", null, "choice"), false],
      [flowState("blocked", "right", "rejoin"), true],
      [flowState("idle", null, "intro"), true],
      [flowState("resolved", "right", "done"), false],
    ] as const) {
      expect(propose(state, { kind: "flow.set_blocked", blocked: blockedValue })).toEqual({
        kind: "rejected",
        rejection: { code: "flow.block_state_conflict" },
      });
    }
  });

  it("keeps normal commands on the exact authored path after debug toggles", () => {
    expect(
      propose(flowState("idle", null, "choice"), {
        kind: "flow.start",
      }),
    ).toEqual({ kind: "rejected", rejection: { code: "flow.not_idle" } });
    expect(
      propose(flowState("choosing", "right", "rejoin"), {
        kind: "flow.choose",
        choice: "left",
      }),
    ).toEqual({ kind: "rejected", rejection: { code: "flow.not_choosing" } });
    expect(
      propose(flowState("blocked", null, "choice"), {
        kind: "flow.continue",
      }),
    ).toEqual({ kind: "rejected", rejection: { code: "flow.not_blocked" } });
  });

  it("rejects schema-valid-looking proposals that do not explain an exact transition", () => {
    expect(() =>
      applyProposal(flowState("idle", null, "intro"), {
        payload: { status: "resolved", branch: "right", nodeId: "done" },
        facts: [],
      }),
    ).toThrow();
    expect(() =>
      applyProposal(flowState("choosing", null, "choice"), {
        payload: { status: "blocked", branch: "right", nodeId: "rejoin" },
        facts: [
          { kind: "flow.blocked", blocked: true },
          { kind: "flow.branch_selected", branch: "right" },
        ],
      }),
    ).toThrow();
    expect(() =>
      applyProposal(flowState("blocked", "right", "rejoin"), {
        payload: { status: "resolved", branch: "left", nodeId: "done" },
        facts: [{ kind: "flow.resolved" }],
      }),
    ).toThrow();
  });
});
