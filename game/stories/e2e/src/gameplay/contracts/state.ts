// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type { NonNegativeSafeInteger, RuntimeSchemaV1 } from "@sillymaker/base";

export type E2eFlowStatusV1 = "idle" | "choosing" | "blocked" | "resolved";
export type E2eFlowBranchV1 = "left" | "right" | null;
export type E2eFlowNodeIdV1 = "intro" | "choice" | "left" | "right" | "rejoin" | "done";
export type E2eRunStatusV1 = "active" | "complete";

export interface E2eCounterStateV1 {
  readonly value: NonNegativeSafeInteger;
}

export interface E2eFlowStateV1 {
  readonly status: E2eFlowStatusV1;
  readonly branch: E2eFlowBranchV1;
  readonly nodeId: E2eFlowNodeIdV1;
}

export interface E2eRunStateV1 {
  readonly status: E2eRunStatusV1;
}

export interface E2eSimulationStateV1 {
  readonly counter: E2eCounterStateV1;
  readonly flow: E2eFlowStateV1;
  readonly run: E2eRunStateV1;
}

export interface E2eGameStateV1 {
  readonly simulation: E2eSimulationStateV1;
}

export function requirePlainObjectV1(
  value: unknown,
  label: string,
): Readonly<Record<string, unknown>> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`invalid ${label}`);
  }

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") throw new TypeError(`invalid ${label}`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    ) {
      throw new TypeError(`invalid ${label}`);
    }
  }

  return value as Readonly<Record<string, unknown>>;
}

export function requireExactObjectV1(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): Readonly<Record<string, unknown>> {
  const record = requirePlainObjectV1(value, label);
  const actualKeys = Object.keys(record);
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key) => !expectedKeys.includes(key))
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  return record;
}

export function parseE2eFlowStatusV1(value: unknown): E2eFlowStatusV1 {
  if (value !== "idle" && value !== "choosing" && value !== "blocked" && value !== "resolved") {
    throw new TypeError("invalid E2E Flow status");
  }
  return value;
}

export function parseE2eFlowBranchV1(value: unknown): E2eFlowBranchV1 {
  if (value !== null && value !== "left" && value !== "right") {
    throw new TypeError("invalid E2E Flow branch");
  }
  return value;
}

export function parseE2eChoiceV1(value: unknown): Exclude<E2eFlowBranchV1, null> {
  if (value !== "left" && value !== "right") {
    throw new TypeError("invalid E2E choice");
  }
  return value;
}

export function parseE2eFlowNodeIdV1(value: unknown): E2eFlowNodeIdV1 {
  if (
    value !== "intro" &&
    value !== "choice" &&
    value !== "left" &&
    value !== "right" &&
    value !== "rejoin" &&
    value !== "done"
  ) {
    throw new TypeError("invalid E2E Flow node ID");
  }
  return value;
}

export function parseE2eRunStatusV1(value: unknown): E2eRunStatusV1 {
  if (value !== "active" && value !== "complete") {
    throw new TypeError("invalid E2E Run status");
  }
  return value;
}

export const e2eCounterStateSchemaV1: RuntimeSchemaV1<E2eCounterStateV1> = Object.freeze({
  parse(value: unknown): E2eCounterStateV1 {
    const record = requireExactObjectV1(value, ["value"], "E2E Counter State");
    return Object.freeze({ value: parseNonNegativeSafeInteger(record.value) });
  },
});

export const e2eFlowStateSchemaV1: RuntimeSchemaV1<E2eFlowStateV1> = Object.freeze({
  parse(value: unknown): E2eFlowStateV1 {
    const record = requireExactObjectV1(value, ["status", "branch", "nodeId"], "E2E Flow State");
    return Object.freeze({
      status: parseE2eFlowStatusV1(record.status),
      branch: parseE2eFlowBranchV1(record.branch),
      nodeId: parseE2eFlowNodeIdV1(record.nodeId),
    });
  },
});

export const e2eRunStateSchemaV1: RuntimeSchemaV1<E2eRunStateV1> = Object.freeze({
  parse(value: unknown): E2eRunStateV1 {
    const record = requireExactObjectV1(value, ["status"], "E2E Run State");
    return Object.freeze({ status: parseE2eRunStatusV1(record.status) });
  },
});

export const initialCounterStateV1 = e2eCounterStateSchemaV1.parse({ value: 0 });
export const initialFlowStateV1 = e2eFlowStateSchemaV1.parse({
  status: "idle",
  branch: null,
  nodeId: "intro",
});
export const initialRunStateV1 = e2eRunStateSchemaV1.parse({ status: "active" });

export const e2eGameStateSchemaV1: RuntimeSchemaV1<E2eGameStateV1> = Object.freeze({
  parse(value: unknown): E2eGameStateV1 {
    const state = requireExactObjectV1(value, ["simulation"], "E2E Game State");
    const simulation = requireExactObjectV1(
      state.simulation,
      ["counter", "flow", "run"],
      "E2E Simulation State",
    );
    return Object.freeze({
      simulation: Object.freeze({
        counter: e2eCounterStateSchemaV1.parse(simulation.counter),
        flow: e2eFlowStateSchemaV1.parse(simulation.flow),
        run: e2eRunStateSchemaV1.parse(simulation.run),
      }),
    });
  },
});
