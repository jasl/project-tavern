// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
} from "@sillymaker/base";
import type { DeepReadonly } from "@sillymaker/base";

import {
  e2eDebugCommandSchemaV1,
  e2eDebugValidationErrorSchemaV1,
  e2eGameCommandSchemaV1,
  e2eGameplayFactSchemaV1,
  e2eRejectionReasonSchemaV1,
} from "./contracts/index.js";
import type {
  E2eGameQueriesV1,
  E2eGameStateV1,
  E2eGameViewV1,
  E2eSimulationProgramInputV1,
} from "./contracts/index.js";
import { createE2eGameSimulationV1 } from "./game-simulation.js";
import { createE2eGameSimulationV1 as createLegacyE2eGameSimulationV1 } from "../profile.js";
import { createE2eInitialSnapshotV1, createE2eSessionV1 } from "../session.js";

const fixtureSeedV1 = parseNonZeroUint32(0x0002_3049);

function resolveFixtureChoiceDeltaV1(choice: "left" | "right") {
  return parsePositiveSafeInteger(choice === "left" ? 2 : 3);
}

const fixtureProgramV1 = Object.freeze({
  rules: Object.freeze({ resolveChoiceDelta: resolveFixtureChoiceDeltaV1 }),
  values: Object.freeze({ terminalThreshold: parsePositiveSafeInteger(4) }),
}) satisfies DeepReadonly<E2eSimulationProgramInputV1>;

describe("E2E GameSimulation", () => {
  it("closes the exact four-module tuple and canonical type spine", () => {
    expectTypeOf(createE2eGameSimulationV1)
      .parameter(0)
      .toEqualTypeOf<DeepReadonly<E2eSimulationProgramInputV1>>();

    const simulation = createE2eGameSimulationV1(fixtureProgramV1);

    expect(
      simulation.modules.map((module) => ({
        bindingKind: module.bindingKind,
        id: module.descriptor.id,
        contractRevision: module.descriptor.contractRevision,
        stateSlots: module.descriptor.stateSlots,
        dependencies: module.descriptor.dependencies,
      })),
    ).toEqual([
      {
        bindingKind: "stateful",
        id: "e2e.counter",
        contractRevision: 1,
        stateSlots: ["simulation.counter"],
        dependencies: [],
      },
      {
        bindingKind: "stateful",
        id: "e2e.flow",
        contractRevision: 1,
        stateSlots: ["simulation.flow"],
        dependencies: ["e2e.counter"],
      },
      {
        bindingKind: "stateful",
        id: "e2e.run",
        contractRevision: 1,
        stateSlots: ["simulation.run"],
        dependencies: [],
      },
      {
        bindingKind: "stateless",
        id: "e2e.choice-delta-resolver",
        contractRevision: 1,
        stateSlots: [],
        dependencies: [],
      },
    ]);
    expect(simulation.modules[3]).not.toHaveProperty("stateSchema");
  });

  it("binds schemas, executors, queries, projection, and initial State to one type spine", () => {
    const simulation = createE2eGameSimulationV1(fixtureProgramV1);

    expect(simulation.commandSchema).toBe(e2eGameCommandSchemaV1);
    expect(simulation.factSchema).toBe(e2eGameplayFactSchemaV1);
    expect(simulation.rejectionSchema).toBe(e2eRejectionReasonSchemaV1);
    expect(simulation.debugCommandSchema).toBe(e2eDebugCommandSchemaV1);
    expect(simulation.debugValidationErrorSchema).toBe(e2eDebugValidationErrorSchemaV1);
    expect(simulation.commandExecutor).toHaveProperty("executeAttempt");
    expect(simulation.debugCommandExecutor).toHaveProperty("validate");
    expect(simulation.debugCommandExecutor).toHaveProperty("executeAttempt");
    expect("createQueries" in simulation.commandExecutor).toBe(false);
    expect("createQueries" in simulation.debugCommandExecutor).toBe(false);

    expectTypeOf(simulation.createQueries)
      .parameter(0)
      .toEqualTypeOf<DeepReadonly<E2eGameStateV1>>();
    expectTypeOf(simulation.createQueries).returns.toEqualTypeOf<E2eGameQueriesV1>();
    expectTypeOf(simulation.projectGameView).parameter(0).toEqualTypeOf<E2eGameQueriesV1>();
    expectTypeOf(simulation.projectGameView).returns.toEqualTypeOf<E2eGameViewV1>();

    expect(simulation.createInitialState({ rngSeed: fixtureSeedV1 })).toEqual({
      simulation: {
        counter: { value: 0 },
        flow: { status: "idle", branch: null, nodeId: "intro" },
        run: { status: "active" },
      },
    });

    expect(Object.isFrozen(simulation)).toBe(true);
    expect(Object.isFrozen(simulation.modules)).toBe(true);
    expect(Object.isFrozen(simulation.commandExecutor)).toBe(true);
    expect(Object.isFrozen(simulation.debugCommandExecutor)).toBe(true);
  });

  it("wires the supplied choice provider and terminal threshold through execution and queries", () => {
    const simulation = createE2eGameSimulationV1(fixtureProgramV1);
    expect(simulation.modules[3].capabilities.resolveChoiceDelta("left")).toBe(2);
    expect(simulation.modules[3].capabilities.resolveChoiceDelta("right")).toBe(3);

    const initial = createE2eInitialSnapshotV1(simulation, { rngSeed: fixtureSeedV1 });
    const started = simulation.commandExecutor.executeAttempt(
      initial,
      { kind: "e2e.flow.start" },
      undefined,
    );
    expect(started.result.kind).toBe("committed");
    if (started.result.kind !== "committed") throw new TypeError("flow start did not commit");

    const chosen = simulation.commandExecutor.executeAttempt(
      started.result.snapshot,
      { kind: "e2e.flow.choose", choice: "right" },
      undefined,
    );
    expect(chosen.result).toMatchObject({
      kind: "committed",
      snapshot: { state: { simulation: { counter: { value: 3 } } } },
      facts: [
        { kind: "counter.changed", before: 0, after: 3 },
        { kind: "flow.branch_selected", branch: "right" },
        { kind: "flow.blocked", blocked: true },
      ],
    });
    if (chosen.result.kind !== "committed") throw new TypeError("flow choice did not commit");

    const continued = simulation.commandExecutor.executeAttempt(
      chosen.result.snapshot,
      { kind: "e2e.flow.continue" },
      undefined,
    );
    expect(continued.result.kind).toBe("committed");
    if (continued.result.kind !== "committed") throw new TypeError("flow continue did not commit");

    const belowThreshold = simulation.createQueries(continued.result.snapshot.state);
    expect(belowThreshold.canComplete).toBe(false);
    const prematureComplete = simulation.commandExecutor.executeAttempt(
      continued.result.snapshot,
      { kind: "e2e.run.complete" },
      undefined,
    );
    expect(prematureComplete.result).toEqual({
      kind: "rejected",
      snapshot: continued.result.snapshot,
      reasons: [{ code: "run.not_terminal" }],
    });
    expect(prematureComplete.result.snapshot).toBe(continued.result.snapshot);

    const incremented = simulation.commandExecutor.executeAttempt(
      continued.result.snapshot,
      { kind: "e2e.counter.increment" },
      undefined,
    );
    expect(incremented.result.kind).toBe("committed");
    if (incremented.result.kind !== "committed") throw new TypeError("increment did not commit");

    const completable = simulation.createQueries(incremented.result.snapshot.state);
    expect(completable).toMatchObject({
      counterValue: 4,
      parity: "even",
      flowStatus: "resolved",
      visibleNodeId: "done",
      runStatus: "active",
      canStart: false,
      canComplete: true,
    });
    expect(simulation.projectGameView(completable)).toEqual({
      counterLabel: "计数 4",
      flow: { status: "resolved", nodeId: "done" },
      terminal: false,
    });

    const completed = simulation.commandExecutor.executeAttempt(
      incremented.result.snapshot,
      { kind: "e2e.run.complete" },
      undefined,
    );
    expect(completed.result.kind).toBe("committed");
    if (completed.result.kind !== "committed") throw new TypeError("run complete did not commit");
    const terminalQueries = simulation.createQueries(completed.result.snapshot.state);
    expect(terminalQueries.canComplete).toBe(false);
    expect(simulation.projectGameView(terminalQueries).terminal).toBe(true);
    expect(Object.isFrozen(terminalQueries)).toBe(true);
    expect(Object.isFrozen(simulation.projectGameView(terminalQueries))).toBe(true);
  });

  it("binds the replayable debug schema and executor to the same canonical state", () => {
    const simulation = createE2eGameSimulationV1(fixtureProgramV1);
    const snapshot = createE2eInitialSnapshotV1(simulation, { rngSeed: fixtureSeedV1 });
    const command = {
      kind: "debug.e2e.counter.add",
      amount: parsePositiveSafeInteger(2),
    } as const;

    expect(simulation.debugCommandExecutor.validate(snapshot, command, undefined)).toEqual({
      kind: "allowed",
    });
    const attempt = simulation.debugCommandExecutor.executeAttempt(snapshot, command, undefined);
    expect(attempt.result).toMatchObject({
      kind: "committed",
      snapshot: { state: { simulation: { counter: { value: 2 } } } },
      facts: [{ kind: "counter.changed", before: 0, after: 2 }],
    });
    expect(attempt.result.kind).not.toBe("rejected");
  });

  it("keeps the same session helpers usable for canonical and legacy simulations", async () => {
    const canonicalSimulation = createE2eGameSimulationV1(fixtureProgramV1);
    const canonicalSnapshot = createE2eInitialSnapshotV1(canonicalSimulation, {
      rngSeed: fixtureSeedV1,
    });
    expect(canonicalSnapshot).toMatchObject({
      state: {
        simulation: {
          counter: { value: 0 },
          flow: { status: "idle", branch: null, nodeId: "intro" },
          run: { status: "active" },
        },
      },
      commandSequence: 0,
    });
    const canonicalSession = createE2eSessionV1(canonicalSimulation, { rngSeed: fixtureSeedV1 });
    await expect(
      canonicalSession.dispatch({ kind: "e2e.counter.increment" }),
    ).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    expect(canonicalSession.getCurrentSnapshot().state.simulation.counter.value).toBe(1);

    const legacySimulation = createLegacyE2eGameSimulationV1({
      initialCount: parseNonNegativeSafeInteger(5),
    });
    const legacySnapshot = createE2eInitialSnapshotV1(legacySimulation, { rngSeed: fixtureSeedV1 });
    expect(legacySnapshot.state.simulation.counter.value).toBe(5);
    const legacySession = createE2eSessionV1(legacySimulation, { rngSeed: fixtureSeedV1 });
    await expect(legacySession.dispatch({ kind: "e2e.counter.increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    expect(legacySession.getCurrentSnapshot().state.simulation.counter.value).toBe(6);
  });
});
