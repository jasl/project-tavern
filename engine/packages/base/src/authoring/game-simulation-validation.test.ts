// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type {
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
  GameSnapshotEnvelopeV1,
  GameplayModuleBindingV1,
  RuntimeSchemaV1,
} from "../contracts/index.js";
import {
  parseModuleId,
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "../contracts/values.js";
import { defineGameplayModule } from "./define-gameplay-module.js";
import { defineGameSimulation } from "./define-game-simulation.js";

interface SyntheticStateV1 {
  readonly simulation: {
    readonly counter: { readonly count: number };
    readonly marker: { readonly enabled: boolean };
  };
}

interface SyntheticRngStateV1 {
  readonly cursor: number;
}

interface SyntheticSimulationTypesV1 extends GameSimulationTypeMapV1<
  GameBootstrapInputV1,
  SyntheticStateV1,
  SyntheticRngStateV1
> {
  readonly snapshot: GameSnapshotEnvelopeV1<SyntheticStateV1, SyntheticRngStateV1>;
  readonly rngDrawTrace: never;
  readonly command: { readonly kind: "synthetic.increment" };
  readonly fact: { readonly kind: "synthetic.changed" };
  readonly rejection: { readonly code: "synthetic.rejected" };
  readonly fault: { readonly code: "synthetic.fault" };
  readonly debugCommand: { readonly kind: "debug.synthetic.increment" };
  readonly debugValidationError: { readonly code: "debug.synthetic.invalid" };
  readonly executionContext: undefined;
  readonly queries: { readonly count: number; readonly parity: "even" | "odd" };
  readonly viewModel: { readonly countLabel: string };
}

function passthroughSchema<T>(): RuntimeSchemaV1<T> {
  return Object.freeze({ parse: (value: unknown) => value as T });
}

function statefulWithSlots(
  id: string,
  slots: readonly string[],
  dependencies: readonly string[] = [],
  stateSchema: RuntimeSchemaV1<unknown> = passthroughSchema<unknown>(),
  initialState: unknown = Object.freeze({}),
) {
  return defineGameplayModule<SyntheticSimulationTypesV1>()({
    bindingKind: "stateful" as const,
    descriptor: {
      id: parseModuleId(id),
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: slots.map(parseStateSlotId),
      dependencies: dependencies.map(parseModuleId),
    },
    commandSchema: null,
    querySchema: null,
    queryResultSchema: null,
    stateSchema,
    ownerOperationSchema: passthroughSchema<unknown>(),
    ownerProposalSchema: passthroughSchema<{
      readonly payload: null;
      readonly facts: readonly SyntheticSimulationTypesV1["fact"][];
    }>(),
    localInvariants: [],
    owner: {
      propose: () => ({
        kind: "proposed" as const,
        proposal: { payload: null, facts: [] },
      }),
      apply: (current: unknown) => current,
    },
    queries: null,
    createInitialState: () => initialState,
    createReadPort: (current: unknown) => current,
  });
}

function stateful(id: string, slot: string, dependencies: readonly string[] = []) {
  const initialState = slot === "simulation.marker" ? { enabled: false } : { count: 0 };
  return statefulWithSlots(id, [slot], dependencies, passthroughSchema<unknown>(), initialState);
}

function stateless(id: string, dependencies: readonly string[] = []) {
  return defineGameplayModule<SyntheticSimulationTypesV1>()({
    bindingKind: "stateless" as const,
    descriptor: {
      id: parseModuleId(id),
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: [],
      dependencies: dependencies.map(parseModuleId),
    },
    commandSchema: null,
    querySchema: null,
    queryResultSchema: null,
    ownerOperationSchema: null,
    ownerProposalSchema: null,
    owner: null,
    capabilities: Object.freeze({
      resolveParity(value: number): "even" | "odd" {
        return value % 2 === 0 ? "even" : "odd";
      },
    }),
  });
}

function simulation(modules: readonly GameplayModuleBindingV1<SyntheticSimulationTypesV1>[]) {
  return defineGameSimulation<SyntheticSimulationTypesV1>()({
    contractRevision: 1,
    modules,
    stateSchema: passthroughSchema<SyntheticStateV1>(),
    commandSchema: passthroughSchema<SyntheticSimulationTypesV1["command"]>(),
    factSchema: passthroughSchema<SyntheticSimulationTypesV1["fact"]>(),
    rejectionSchema: passthroughSchema<SyntheticSimulationTypesV1["rejection"]>(),
    debugCommandSchema: passthroughSchema<SyntheticSimulationTypesV1["debugCommand"]>(),
    debugValidationErrorSchema:
      passthroughSchema<SyntheticSimulationTypesV1["debugValidationError"]>(),
    commandExecutor: {
      executeAttempt: () => Object.freeze({ kind: "not-exercised" as const }),
    },
    debugCommandExecutor: {
      validate: () => Object.freeze({ kind: "allowed" as const }),
      executeAttempt: () => Object.freeze({ kind: "not-exercised" as const }),
    },
    createBootstrapInput: () => Object.freeze({ rngSeed: parseNonZeroUint32(1) }),
    createInitialState: () =>
      Object.freeze({
        simulation: Object.freeze({
          counter: Object.freeze({ count: 0 }),
          marker: Object.freeze({ enabled: false }),
        }),
      }),
    createQueries: (state) =>
      Object.freeze({
        count: state.simulation.counter.count,
        parity: state.simulation.counter.count % 2 === 0 ? ("even" as const) : ("odd" as const),
      }),
    projectGameView: (queries) => Object.freeze({ countLabel: String(queries.count) }),
  });
}

function defineSyntheticSimulation() {
  return simulation([
    stateful("synthetic.counter", "simulation.counter"),
    stateful("synthetic.marker", "simulation.marker", ["synthetic.counter"]),
    stateless("synthetic.parity", ["synthetic.counter"]),
  ]);
}

function syntheticSnapshot(): SyntheticSimulationTypesV1["snapshot"] {
  return Object.freeze({
    state: Object.freeze({
      simulation: Object.freeze({
        counter: Object.freeze({ count: 0 }),
        marker: Object.freeze({ enabled: false }),
      }),
    }),
    rng: Object.freeze({ cursor: 0 }),
    commandSequence: parseNonNegativeSafeInteger(0),
  });
}

function defineSimulationWithDuplicateSlot() {
  return simulation([
    stateful("synthetic.counter", "simulation.counter"),
    stateful("synthetic.other", "simulation.counter"),
  ]);
}

function defineSimulationWithDuplicateId() {
  return simulation([
    stateful("synthetic.counter", "simulation.counter"),
    stateful("synthetic.counter", "simulation.marker"),
  ]);
}

function defineSimulationWithMissingDependency() {
  return simulation([stateless("synthetic.parity", ["synthetic.missing"])]);
}

function defineSimulationWithCycle() {
  return simulation([
    stateless("synthetic.left", ["synthetic.right"]),
    stateless("synthetic.right", ["synthetic.left"]),
  ]);
}

describe("GameSimulation invariants", () => {
  it("keeps command execution separate from queries", () => {
    const resolved = defineSyntheticSimulation();

    expect(resolved.commandExecutor).toHaveProperty("executeAttempt");
    expect(resolved.commandExecutor).not.toHaveProperty("createQueries");
    expect(resolved.debugCommandExecutor).toHaveProperty("executeAttempt");
    expect(resolved.debugCommandExecutor).toHaveProperty("validate");
    expect(resolved.debugCommandExecutor).not.toHaveProperty("createQueries");
    expect(resolved.createInitialState(Object.freeze({ rngSeed: parseNonZeroUint32(1) }))).toEqual({
      simulation: { counter: { count: 0 }, marker: { enabled: false } },
    });
    const queries = resolved.createQueries(syntheticSnapshot().state);
    expect(queries).toEqual({
      count: 0,
      parity: "even",
    });
    expect(resolved.projectGameView(queries)).toEqual({ countLabel: "0" });
  });

  it("rejects duplicate slots, missing dependencies, and dependency cycles", () => {
    expect(() => defineSimulationWithDuplicateId()).toThrow("duplicate GameplayModule ID");
    expect(() => defineSimulationWithDuplicateSlot()).toThrow("duplicate State slot");
    expect(() => defineSimulationWithMissingDependency()).toThrow("missing dependency");
    expect(() => defineSimulationWithCycle()).toThrow("dependency cycle");
  });

  it("allows stateless capabilities but no state or owner surface", () => {
    const resolver = stateless("synthetic.resolver");
    expect(resolver.bindingKind).toBe("stateless");
    expect(resolver.capabilities).toHaveProperty("resolveParity");
    expect(resolver).not.toHaveProperty("services");
    expect(resolver).not.toHaveProperty("stateSchema");
  });

  it("validates real multi-slot State paths without parsing each leaf as an owner aggregate", () => {
    let ownerSchemaParseCalls = 0;
    const ownerAggregateSchema: RuntimeSchemaV1<unknown> = Object.freeze({
      parse(value: unknown) {
        ownerSchemaParseCalls += 1;
        if (
          value === null ||
          typeof value !== "object" ||
          !Object.hasOwn(value, "counter") ||
          !Object.hasOwn(value, "marker")
        ) {
          throw new TypeError("invalid owner aggregate");
        }
        return value;
      },
    });
    const resolved = simulation([
      statefulWithSlots(
        "synthetic.aggregate",
        ["simulation.counter", "simulation.marker"],
        [],
        ownerAggregateSchema,
        Object.freeze({
          counter: Object.freeze({ count: 0 }),
          marker: Object.freeze({ enabled: false }),
        }),
      ),
    ]);
    expect(() =>
      resolved.createInitialState(Object.freeze({ rngSeed: parseNonZeroUint32(1) })),
    ).not.toThrow();
    expect(ownerSchemaParseCalls).toBe(2);
  });

  it("deep-freezes both the authoring input and the validated simulation", () => {
    const seed = defineSyntheticSimulation();
    const modules = [...seed.modules];
    const commandExecutor = { ...seed.commandExecutor };
    const input = { ...seed, modules, commandExecutor };
    const resolved = defineGameSimulation<SyntheticSimulationTypesV1>()(input);
    expect(Object.isFrozen(input)).toBe(true);
    expect(Object.isFrozen(modules)).toBe(true);
    expect(Object.isFrozen(commandExecutor)).toBe(true);
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.commandExecutor)).toBe(true);
  });
});
