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

export interface SandboxCounterStateV1 {
  readonly value: NonNegativeSafeInteger;
}

export interface SandboxStateV1 {
  readonly simulation: {
    readonly counter: SandboxCounterStateV1;
  };
}

export type SandboxCommandV1 =
  | { readonly kind: "sandbox.counter.increment" }
  | { readonly kind: "sandbox.counter.reject" }
  | { readonly kind: "sandbox.counter.fault" };

export interface SandboxFactV1 {
  readonly kind: "sandbox.counter.changed";
  readonly before: NonNegativeSafeInteger;
  readonly after: NonNegativeSafeInteger;
}

export interface SandboxRejectionV1 {
  readonly code: "sandbox.counter.rejected";
}

export interface SandboxFaultV1 {
  readonly code: "sandbox.counter.fault" | "sandbox.runtime.unexpected";
}

export interface SandboxDebugValidationErrorV1 {
  readonly code: "sandbox.debug.unsupported";
}

export interface SandboxBootstrapInputV1 extends GameBootstrapInputV1 {
  readonly rngSeed: NonZeroUint32;
}

export type SandboxSnapshotV1 = GameSnapshotEnvelopeV1<SandboxStateV1, RngStateV1>;

export interface SandboxSimulationTypesV1 extends GameSimulationTypeMapV1<
  SandboxBootstrapInputV1,
  SandboxStateV1,
  RngStateV1
> {
  readonly snapshot: SandboxSnapshotV1;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: SandboxCommandV1;
  readonly fact: SandboxFactV1;
  readonly rejection: SandboxRejectionV1;
  readonly fault: SandboxFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: SandboxDebugValidationErrorV1;
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
    throw new TypeError(`invalid Sandbox ${key}`);
  }
  return value as Record<string, unknown>;
}

export const sandboxCounterStateSchemaV1: RuntimeSchemaV1<SandboxCounterStateV1> = Object.freeze({
  parse(value: unknown) {
    const parsed = exactObject(value, "value");
    return Object.freeze({ value: parseNonNegativeSafeInteger(parsed.value) });
  },
});

export const sandboxStateSchemaV1: RuntimeSchemaV1<SandboxStateV1> = Object.freeze({
  parse(value: unknown) {
    const parsed = exactObject(value, "simulation");
    const simulation = exactObject(parsed.simulation, "counter");
    return Object.freeze({
      simulation: Object.freeze({
        counter: sandboxCounterStateSchemaV1.parse(simulation.counter),
      }),
    });
  },
});

export const sandboxCommandSchemaV1: RuntimeSchemaV1<SandboxCommandV1> = Object.freeze({
  parse(value: unknown) {
    const parsed = exactObject(value, "kind");
    const kind = parsed.kind;
    if (
      kind !== "sandbox.counter.increment" &&
      kind !== "sandbox.counter.reject" &&
      kind !== "sandbox.counter.fault"
    ) {
      throw new TypeError("invalid Sandbox command kind");
    }
    return Object.freeze({ kind });
  },
});

export const sandboxSnapshotSchemaV1 = createGameSnapshotEnvelopeSchemaV1(
  sandboxStateSchemaV1,
  rngStateV1Schema,
);
