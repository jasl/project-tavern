// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createGameSnapshotEnvelopeSchemaV1,
  parseNonNegativeSafeInteger,
  rngStateV1Schema,
} from "@sillymaker/base";
import type {
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
  GameSnapshotEnvelopeV1,
  NonNegativeSafeInteger,
  NonZeroUint32,
  RngDrawTraceV1,
  RngStateV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";

export interface E2eCounterStateV1 {
  readonly value: NonNegativeSafeInteger;
}

export interface E2eStateV1 {
  readonly simulation: {
    readonly counter: E2eCounterStateV1;
  };
}

export type E2eCommandV1 =
  | { readonly kind: "e2e.counter.increment" }
  | { readonly kind: "e2e.counter.reject" }
  | { readonly kind: "e2e.counter.fault" };

export interface E2eFactV1 {
  readonly kind: "e2e.counter.changed";
  readonly before: NonNegativeSafeInteger;
  readonly after: NonNegativeSafeInteger;
}

export interface E2eRejectionV1 {
  readonly code: "e2e.counter.rejected";
}

export interface E2eFaultV1 {
  readonly code: "e2e.counter.fault" | "e2e.runtime.unexpected";
}

export interface E2eDebugValidationErrorV1 {
  readonly code: "e2e.debug.unsupported";
}

export interface E2eBootstrapInputV1 extends GameBootstrapInputV1 {
  readonly rngSeed: NonZeroUint32;
}

export type E2eSnapshotV1 = GameSnapshotEnvelopeV1<E2eStateV1, RngStateV1>;

export interface E2eSimulationTypesV1 extends GameSimulationTypeMapV1<
  E2eBootstrapInputV1,
  E2eStateV1,
  RngStateV1
> {
  readonly snapshot: E2eSnapshotV1;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: E2eCommandV1;
  readonly fact: E2eFactV1;
  readonly rejection: E2eRejectionV1;
  readonly fault: E2eFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: E2eDebugValidationErrorV1;
  readonly executionContext: undefined;
  readonly queries: {
    readonly count: NonNegativeSafeInteger;
    readonly parity: "even" | "odd";
  };
  readonly viewModel: {
    readonly count: NonNegativeSafeInteger;
    readonly parity: "even" | "odd";
  };
}

function exactObject(value: unknown, key: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0 ||
    Object.keys(value).sort().join("\0") !== key
  ) {
    throw new TypeError(`invalid E2e ${key}`);
  }
  return value as Record<string, unknown>;
}

export const e2eCounterStateSchemaV1: RuntimeSchemaV1<E2eCounterStateV1> = Object.freeze({
  parse(value: unknown) {
    const parsed = exactObject(value, "value");
    return Object.freeze({ value: parseNonNegativeSafeInteger(parsed.value) });
  },
});

export const e2eStateSchemaV1: RuntimeSchemaV1<E2eStateV1> = Object.freeze({
  parse(value: unknown) {
    const parsed = exactObject(value, "simulation");
    const simulation = exactObject(parsed.simulation, "counter");
    return Object.freeze({
      simulation: Object.freeze({
        counter: e2eCounterStateSchemaV1.parse(simulation.counter),
      }),
    });
  },
});

export const e2eCommandSchemaV1: RuntimeSchemaV1<E2eCommandV1> = Object.freeze({
  parse(value: unknown) {
    const parsed = exactObject(value, "kind");
    const kind = parsed.kind;
    if (
      kind !== "e2e.counter.increment" &&
      kind !== "e2e.counter.reject" &&
      kind !== "e2e.counter.fault"
    ) {
      throw new TypeError("invalid E2e command kind");
    }
    return Object.freeze({ kind });
  },
});

export const e2eSnapshotSchemaV1 = createGameSnapshotEnvelopeSchemaV1(
  e2eStateSchemaV1,
  rngStateV1Schema,
);
