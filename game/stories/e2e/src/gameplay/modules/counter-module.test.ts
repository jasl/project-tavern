// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it, vi } from "vitest";

import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "@sillymaker/base";

import { counterModuleV1 } from "./counter-module.js";

const noDependenciesV1 = Object.freeze({});

describe("E2E counter owner module", () => {
  it("keeps an add proposal owner scoped", () => {
    const state = Object.freeze({ value: parseNonNegativeSafeInteger(0) });
    const operation = counterModuleV1.ownerOperationSchema.parse({
      kind: "counter.add",
      amount: parsePositiveSafeInteger(2),
    });

    const result = counterModuleV1.owner.propose(state, operation, noDependenciesV1);

    expect(result).toEqual({
      kind: "proposed",
      proposal: {
        payload: { value: 2 },
        facts: [{ kind: "counter.changed", before: 0, after: 2 }],
      },
    });
    expect(JSON.stringify(result)).not.toContain("flow");
    expect(JSON.stringify(result)).not.toContain("run");
    expect(Object.isFrozen(result)).toBe(true);
    if (result.kind !== "proposed") throw new TypeError("expected a counter proposal");
    expect(Object.isFrozen(result.proposal)).toBe(true);
    expect(Object.isFrozen(result.proposal.payload)).toBe(true);
    expect(Object.isFrozen(result.proposal.facts)).toBe(true);
    expect(counterModuleV1.owner.apply(state, result.proposal)).toEqual({ value: 2 });
  });

  it("returns the typed counter rejection instead of overflowing", () => {
    const state = Object.freeze({
      value: parseNonNegativeSafeInteger(Number.MAX_SAFE_INTEGER),
    });
    const operation = counterModuleV1.ownerOperationSchema.parse({
      kind: "counter.add",
      amount: parsePositiveSafeInteger(1),
    });

    expect(counterModuleV1.owner.propose(state, operation, noDependenciesV1)).toEqual({
      kind: "rejected",
      rejection: { code: "counter.value_out_of_range" },
    });
  });

  it("reports a local invariant violation for a forged negative counter", () => {
    const validState = Object.freeze({ value: parseNonNegativeSafeInteger(0) });
    const validReadPort = counterModuleV1.createReadPort(validState);
    expect(
      counterModuleV1.localInvariants.flatMap((invariant) =>
        invariant.check(validState, validReadPort),
      ),
    ).toEqual([]);

    const negativeState = Object.freeze({ value: -1 }) as never;
    const violations = counterModuleV1.localInvariants.flatMap((invariant) =>
      invariant.check(negativeState, negativeState),
    );
    expect(violations).toEqual([
      {
        code: "counter.value_out_of_range",
        details: { value: -1 },
      },
    ]);
  });

  it("strictly parses only the two closed owner operations", () => {
    expect(counterModuleV1.ownerOperationSchema.parse({ kind: "counter.add", amount: 2 })).toEqual({
      kind: "counter.add",
      amount: 2,
    });
    expect(counterModuleV1.ownerOperationSchema.parse({ kind: "counter.set", value: 0 })).toEqual({
      kind: "counter.set",
      value: 0,
    });

    const accessorRead = vi.fn(() => "counter.add");
    const accessorOperation = Object.defineProperties(
      {},
      {
        kind: { enumerable: true, get: accessorRead },
        amount: { enumerable: true, value: 2 },
      },
    );
    const symbolOperation = {
      kind: "counter.add",
      amount: 2,
      [Symbol("foreign")]: true,
    };
    const nonPlainOperation = Object.assign(Object.create(null) as Record<string, unknown>, {
      kind: "counter.add",
      amount: 2,
    });

    for (const value of [
      [],
      accessorOperation,
      symbolOperation,
      nonPlainOperation,
      { kind: "counter.add", amount: 2, foreign: true },
      { kind: "counter.add", amount: 0 },
      { kind: "counter.add", amount: Number.MAX_SAFE_INTEGER + 1 },
      { kind: "counter.set", value: -1 },
      { kind: "counter.unknown", amount: 2 },
    ]) {
      expect(() => counterModuleV1.ownerOperationSchema.parse(value)).toThrow();
    }
    expect(accessorRead).not.toHaveBeenCalled();
  });

  it("strictly parses owner proposals and rejects foreign Fact variants", () => {
    const validProposal = {
      payload: { value: 2 },
      facts: [{ kind: "counter.changed", before: 0, after: 2 }],
    };
    const parsed = counterModuleV1.ownerProposalSchema.parse(validProposal);
    expect(parsed).toEqual(validProposal);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.payload)).toBe(true);
    expect(Object.isFrozen(parsed.facts)).toBe(true);
    expect(Object.isFrozen(parsed.facts[0])).toBe(true);

    const accessorRead = vi.fn(() => validProposal.facts);
    const accessorProposal = Object.defineProperties(
      {},
      {
        payload: { enumerable: true, value: validProposal.payload },
        facts: { enumerable: true, get: accessorRead },
      },
    );
    const symbolProposal = {
      ...validProposal,
      [Symbol("foreign")]: true,
    };
    const nonPlainProposal = Object.assign(
      Object.create(null) as Record<string, unknown>,
      validProposal,
    );

    for (const value of [
      [],
      accessorProposal,
      symbolProposal,
      nonPlainProposal,
      { ...validProposal, foreign: true },
      { ...validProposal, payload: { value: 2, flow: "blocked" } },
      {
        ...validProposal,
        facts: [{ kind: "counter.changed", before: 0, after: 2, run: "complete" }],
      },
      { ...validProposal, facts: [{ kind: "flow.started" }] },
      { ...validProposal, facts: [{ kind: "run.completed" }] },
    ]) {
      expect(() => counterModuleV1.ownerProposalSchema.parse(value)).toThrow();
    }
    expect(accessorRead).not.toHaveBeenCalled();
  });

  it("creates a frozen exact read projection without Snapshot reachability", () => {
    expect(counterModuleV1).toMatchObject({
      bindingKind: "stateful",
      descriptor: {
        id: "e2e.counter",
        contractRevision: 1,
        stateSlots: ["simulation.counter"],
        dependencies: [],
      },
      commandSchema: null,
      querySchema: null,
      queryResultSchema: null,
      queries: null,
    });
    const state = Object.freeze({ value: parseNonNegativeSafeInteger(7) });
    const readPort = counterModuleV1.createReadPort(state);

    expect(readPort).toEqual({ value: 7 });
    expect(Object.keys(readPort)).toEqual(["value"]);
    expect(Object.isFrozen(readPort)).toBe(true);
    expect(readPort).not.toBe(state);
    expect(readPort).not.toHaveProperty("snapshot");
    expect(readPort).not.toHaveProperty("state");
    expect(readPort).not.toHaveProperty("rng");
    expect(readPort).not.toHaveProperty("commandSequence");
    expect(readPort).not.toHaveProperty("flow");
    expect(readPort).not.toHaveProperty("run");
  });
});
