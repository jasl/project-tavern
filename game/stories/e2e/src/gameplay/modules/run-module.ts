// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  defineGameplayModule,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "@sillymaker/base";
import type {
  ModuleOwnerProposalEnvelopeV1,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
  RuntimeSchemaV1,
} from "@sillymaker/base";

import { e2eRunStateSchemaV1, initialRunStateV1 } from "../contracts/index.js";
import type {
  E2eGameSimulationTypesV1,
  E2eGameplayFactV1,
  E2eRejectionReasonV1,
  E2eRunStateV1,
} from "../contracts/index.js";
import { e2eRunModuleIdV1, e2eRunStateSlotIdV1 } from "../contracts/ids.js";

type E2eFlowStatusV1 = E2eGameSimulationTypesV1["state"]["simulation"]["flow"]["status"];
type E2eFlowNodeIdV1 = E2eGameSimulationTypesV1["state"]["simulation"]["flow"]["nodeId"];
type RunCompletedFactV1 = Extract<E2eGameplayFactV1, { readonly kind: "run.completed" }>;
type RunRejectionV1 = Extract<
  E2eRejectionReasonV1,
  { readonly code: "run.not_active" | "run.not_terminal" }
>;

export interface RunCompleteTerminalV1 {
  readonly flowStatus: E2eFlowStatusV1;
  readonly nodeId: E2eFlowNodeIdV1;
  readonly counterValue: NonNegativeSafeInteger;
  readonly terminalThreshold: PositiveSafeInteger;
}

export interface RunCompleteOperationV1 {
  readonly kind: "run.complete";
  readonly terminal: RunCompleteTerminalV1;
}

export interface RunCompletePayloadV1 {
  readonly status: "complete";
}

export type RunOwnerProposalV1 = ModuleOwnerProposalEnvelopeV1<
  RunCompletePayloadV1,
  RunCompletedFactV1
>;

export interface RunReadPortV1 {
  readonly status: E2eRunStateV1["status"];
}

export type RunDependencyPortsV1 = Readonly<Record<never, never>>;

function exactDataObjectV1(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.some((key) => typeof key !== "string") ||
    ownKeys.map(String).sort().join("\0") !== [...expectedKeys].sort().join("\0")
  ) {
    throw new TypeError(`invalid ${label} fields`);
  }
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} field ${key}`);
    }
  }
  return value as Record<string, unknown>;
}

function exactSingleElementArrayV1(value: unknown, label: string): readonly [unknown] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length !== 1 ||
    Reflect.ownKeys(value).some(
      (key) => typeof key !== "string" || (key !== "0" && key !== "length"),
    )
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const elementDescriptor = Object.getOwnPropertyDescriptor(value, "0");
  if (
    elementDescriptor === undefined ||
    elementDescriptor.get !== undefined ||
    elementDescriptor.set !== undefined ||
    elementDescriptor.enumerable !== true
  ) {
    throw new TypeError(`invalid ${label} element`);
  }
  return value as [unknown];
}

function parseFlowStatusV1(value: unknown): E2eFlowStatusV1 {
  if (value === "idle" || value === "choosing" || value === "blocked" || value === "resolved") {
    return value;
  }
  throw new TypeError("invalid Run terminal flowStatus");
}

function parseFlowNodeIdV1(value: unknown): E2eFlowNodeIdV1 {
  if (
    value === "intro" ||
    value === "choice" ||
    value === "left" ||
    value === "right" ||
    value === "rejoin" ||
    value === "done"
  ) {
    return value;
  }
  throw new TypeError("invalid Run terminal nodeId");
}

function parseRunCompleteTerminalV1(value: unknown): RunCompleteTerminalV1 {
  const terminal = exactDataObjectV1(
    value,
    ["flowStatus", "nodeId", "counterValue", "terminalThreshold"],
    "Run terminal",
  );
  return Object.freeze({
    flowStatus: parseFlowStatusV1(terminal.flowStatus),
    nodeId: parseFlowNodeIdV1(terminal.nodeId),
    counterValue: parseNonNegativeSafeInteger(terminal.counterValue),
    terminalThreshold: parsePositiveSafeInteger(terminal.terminalThreshold),
  });
}

export const runOwnerOperationSchemaV1: RuntimeSchemaV1<RunCompleteOperationV1> = Object.freeze({
  parse(value: unknown): RunCompleteOperationV1 {
    const operation = exactDataObjectV1(value, ["kind", "terminal"], "Run operation");
    if (operation.kind !== "run.complete") throw new TypeError("invalid Run operation kind");
    return Object.freeze({
      kind: "run.complete",
      terminal: parseRunCompleteTerminalV1(operation.terminal),
    });
  },
});

function parseRunCompletedFactV1(value: unknown): RunCompletedFactV1 {
  const fact = exactDataObjectV1(value, ["kind"], "Run Fact");
  if (fact.kind !== "run.completed") throw new TypeError("invalid Run Fact kind");
  return Object.freeze({ kind: "run.completed" });
}

export const runOwnerProposalSchemaV1: RuntimeSchemaV1<RunOwnerProposalV1> = Object.freeze({
  parse(value: unknown): RunOwnerProposalV1 {
    const proposal = exactDataObjectV1(value, ["payload", "facts"], "Run proposal");
    const payload = exactDataObjectV1(proposal.payload, ["status"], "Run proposal payload");
    if (payload.status !== "complete") throw new TypeError("invalid Run proposal status");
    const facts = exactSingleElementArrayV1(proposal.facts, "Run proposal Facts");
    return Object.freeze({
      payload: Object.freeze({ status: "complete" }),
      facts: Object.freeze([parseRunCompletedFactV1(facts[0])]),
    });
  },
});

function parseRunDependencyPortsV1(value: unknown): RunDependencyPortsV1 {
  const dependencies = exactDataObjectV1(value, [], "Run dependency ports");
  if (!Object.isFrozen(dependencies)) {
    throw new TypeError("Run dependency ports must be frozen");
  }
  return dependencies;
}

function rejectedRunProposalV1<const TCode extends RunRejectionV1["code"]>(code: TCode) {
  return Object.freeze({
    kind: "rejected" as const,
    rejection: Object.freeze({ code }),
  });
}

export const runModuleV1 = defineGameplayModule<E2eGameSimulationTypesV1>()({
  bindingKind: "stateful" as const,
  descriptor: {
    id: e2eRunModuleIdV1,
    contractRevision: parsePositiveSafeInteger(1),
    stateSlots: [e2eRunStateSlotIdV1],
    dependencies: [],
  },
  commandSchema: null,
  querySchema: null,
  queryResultSchema: null,
  stateSchema: e2eRunStateSchemaV1,
  ownerOperationSchema: runOwnerOperationSchemaV1,
  ownerProposalSchema: runOwnerProposalSchemaV1,
  localInvariants: [],
  owner: {
    propose(stateValue, operationValue, dependenciesValue) {
      const state = e2eRunStateSchemaV1.parse(stateValue);
      const operation = runOwnerOperationSchemaV1.parse(operationValue);
      parseRunDependencyPortsV1(dependenciesValue);
      if (state.status !== "active") return rejectedRunProposalV1("run.not_active");
      if (
        operation.terminal.flowStatus !== "resolved" ||
        operation.terminal.nodeId !== "done" ||
        operation.terminal.counterValue < operation.terminal.terminalThreshold
      ) {
        return rejectedRunProposalV1("run.not_terminal");
      }
      return Object.freeze({
        kind: "proposed" as const,
        proposal: runOwnerProposalSchemaV1.parse({
          payload: { status: "complete" },
          facts: [{ kind: "run.completed" }],
        }),
      });
    },
    apply(stateValue, proposalValue) {
      const state = e2eRunStateSchemaV1.parse(stateValue);
      if (state.status !== "active") throw new TypeError("Run proposal requires active State");
      const proposal = runOwnerProposalSchemaV1.parse(proposalValue);
      return e2eRunStateSchemaV1.parse(proposal.payload);
    },
  },
  queries: null,
  createInitialState() {
    return e2eRunStateSchemaV1.parse(initialRunStateV1);
  },
  createReadPort(stateValue) {
    const state = e2eRunStateSchemaV1.parse(stateValue);
    return Object.freeze({ status: state.status });
  },
});
