// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, expectTypeOf, it } from "vitest";
import type { PositiveSafeInteger } from "@sillymaker/base";

import {
  e2eDebugCommandSchemaV1,
  e2eDebugValidationErrorSchemaV1,
  e2eGameCommandSchemaV1,
  e2eGameStateSchemaV1,
  e2eGameplayFactSchemaV1,
  e2eGameplayFaultSchemaV1,
  e2eRejectionReasonSchemaV1,
  initialCounterStateV1,
  initialFlowStateV1,
  initialRunStateV1,
} from "./index.js";
import type {
  E2eGameQueriesV1,
  E2eGameSimulationTypesV1,
  E2eGameStateV1,
  E2eGameViewV1,
  E2eSimulationProgramInputV1,
} from "./index.js";

const initialStateInput = () => ({
  simulation: {
    counter: { value: 0 },
    flow: { status: "idle", branch: null, nodeId: "intro" },
    run: { status: "active" },
  },
});

describe("closed E2E Gameplay contracts", () => {
  it("parses and deeply freezes the exact module-composed State", () => {
    const state = e2eGameStateSchemaV1.parse(initialStateInput());
    expect(state).toEqual({
      simulation: {
        counter: initialCounterStateV1,
        flow: initialFlowStateV1,
        run: initialRunStateV1,
      },
    });
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.simulation)).toBe(true);
    expect(Object.isFrozen(state.simulation.counter)).toBe(true);
    expect(Object.isFrozen(state.simulation.flow)).toBe(true);
    expect(Object.isFrozen(state.simulation.run)).toBe(true);
  });

  it("rejects unknown command and State fields", () => {
    expect(() =>
      e2eGameCommandSchemaV1.parse({
        kind: "e2e.flow.choose",
        choice: "left",
        injected: true,
      }),
    ).toThrow();
    expect(() =>
      e2eGameStateSchemaV1.parse({
        simulation: {
          ...initialStateInput().simulation,
          foreign: {},
        },
      }),
    ).toThrow();
    expect(() => e2eGameStateSchemaV1.parse({ ...initialStateInput(), foreign: {} })).toThrow();
  });

  it("rejects accessor, symbol, array, and non-plain State objects", () => {
    const accessorState = {};
    Object.defineProperty(accessorState, "simulation", {
      enumerable: true,
      get: () => initialStateInput().simulation,
    });
    expect(() => e2eGameStateSchemaV1.parse(accessorState)).toThrow();

    const symbolState = initialStateInput() as ReturnType<typeof initialStateInput> & {
      [key: symbol]: boolean;
    };
    symbolState[Symbol("foreign")] = true;
    expect(() => e2eGameStateSchemaV1.parse(symbolState)).toThrow();
    expect(() => e2eGameStateSchemaV1.parse([])).toThrow();
    expect(() => e2eGameStateSchemaV1.parse(Object.create(null))).toThrow();
  });

  it("keeps normal and replayable DebugCommand unions separate and bounded", () => {
    expect(
      e2eGameCommandSchemaV1.parse({
        kind: "e2e.counter.roll",
        maximum: 0x1_0000_0000,
      }),
    ).toEqual({ kind: "e2e.counter.roll", maximum: 0x1_0000_0000 });
    expect(() =>
      e2eGameCommandSchemaV1.parse({
        kind: "e2e.counter.roll",
        maximum: 0x1_0000_0001,
      }),
    ).toThrow();
    expect(() =>
      e2eGameCommandSchemaV1.parse({ kind: "debug.e2e.counter.add", amount: 1 }),
    ).toThrow();
    expect(e2eDebugCommandSchemaV1.parse({ kind: "debug.e2e.counter.add", amount: 1 })).toEqual({
      kind: "debug.e2e.counter.add",
      amount: 1,
    });
    expect(() => e2eDebugCommandSchemaV1.parse({ kind: "e2e.counter.increment" })).toThrow();
  });

  it("strictly parses the closed Fact, rejection, fault, and Debug validation results", () => {
    expect(e2eGameplayFactSchemaV1.parse({ kind: "counter.changed", before: 0, after: 1 })).toEqual(
      { kind: "counter.changed", before: 0, after: 1 },
    );
    expect(() =>
      e2eGameplayFactSchemaV1.parse({ kind: "run.completed", injected: true }),
    ).toThrow();
    expect(e2eRejectionReasonSchemaV1.parse({ code: "flow.not_choosing" })).toEqual({
      code: "flow.not_choosing",
    });
    expect(() => e2eRejectionReasonSchemaV1.parse({ code: "unknown" })).toThrow();
    expect(e2eGameplayFaultSchemaV1.parse({ code: "e2e.owner.contract_invalid" })).toEqual({
      code: "e2e.owner.contract_invalid",
    });
    expect(() => e2eGameplayFaultSchemaV1.parse({ code: "e2e.internal.secret" })).toThrow();
    expect(
      e2eDebugValidationErrorSchemaV1.parse({
        code: "debug.e2e.state_conflict",
        commandKind: "debug.e2e.flow.set_blocked",
      }),
    ).toEqual({
      code: "debug.e2e.state_conflict",
      commandKind: "debug.e2e.flow.set_blocked",
    });
  });

  it("freezes one final invariant simulation type spine", () => {
    expectTypeOf<E2eGameSimulationTypesV1["state"]>().toEqualTypeOf<E2eGameStateV1>();
    expectTypeOf<E2eGameSimulationTypesV1["queries"]>().toEqualTypeOf<E2eGameQueriesV1>();
    expectTypeOf<E2eGameSimulationTypesV1["viewModel"]>().toEqualTypeOf<E2eGameViewV1>();
    type ChoiceResolver = E2eSimulationProgramInputV1["rules"]["resolveChoiceDelta"];
    expectTypeOf<ReturnType<ChoiceResolver>>().toEqualTypeOf<PositiveSafeInteger>();
  });
});
