// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  defineGameplayModule,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "@sillymaker/base";
import type { ModuleOwnerProposalEnvelopeV1, RuntimeSchemaV1 } from "@sillymaker/base";

import { e2eCounterModuleIdV1, e2eFlowModuleIdV1, e2eFlowStateSlotIdV1 } from "../contracts/ids.js";
import { e2eFlowStateSchemaV1, initialFlowStateV1 } from "../contracts/index.js";
import type {
  E2eFlowStateV1,
  E2eGameSimulationTypesV1,
  E2eGameplayFactV1,
  E2eRejectionReasonV1,
} from "../contracts/index.js";
import type { CounterReadPortV1 } from "./counter-module.js";

export type FlowOwnerOperationV1 =
  | { readonly kind: "flow.start" }
  | { readonly kind: "flow.choose"; readonly choice: "left" | "right" }
  | { readonly kind: "flow.continue" }
  | { readonly kind: "flow.set_blocked"; readonly blocked: boolean };

type E2eFlowFactV1 = Extract<
  E2eGameplayFactV1,
  {
    readonly kind: "flow.started" | "flow.branch_selected" | "flow.blocked" | "flow.resolved";
  }
>;

export type FlowOwnerProposalV1 = ModuleOwnerProposalEnvelopeV1<E2eFlowStateV1, E2eFlowFactV1>;

interface FlowDependencyPortsV1 {
  readonly counter: CounterReadPortV1;
}

export interface FlowReadPortV1 {
  readonly status: E2eFlowStateV1["status"];
  readonly branch: E2eFlowStateV1["branch"];
  readonly nodeId: E2eFlowStateV1["nodeId"];
}

interface FlowInvariantViolationV1 {
  readonly code: string;
  readonly details: Readonly<Record<string, string | null>>;
}

type FlowRejectionCodeV1 = Extract<
  E2eRejectionReasonV1["code"],
  "flow.not_idle" | "flow.not_choosing" | "flow.not_blocked" | "flow.block_state_conflict"
>;

function inspectDataObjectV1(
  value: unknown,
  label: string,
  requireFrozen = false,
): PropertyDescriptorMap {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0 ||
    (requireFrozen && !Object.isFrozen(value))
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const descriptor of Object.values(descriptors)) {
    if (
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !Object.hasOwn(descriptor, "value") ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} property`);
    }
  }
  return descriptors;
}

function exactDataObjectV1(
  value: unknown,
  keys: readonly string[],
  label: string,
  requireFrozen = false,
): Readonly<Record<string, unknown>> {
  const descriptors = inspectDataObjectV1(value, label, requireFrozen);
  if (Object.keys(descriptors).sort().join("\0") !== [...keys].sort().join("\0")) {
    throw new TypeError(`invalid ${label} fields`);
  }
  const parsed: Record<string, unknown> = {};
  for (const key of keys) parsed[key] = descriptors[key]?.value;
  return parsed;
}

function denseArrayValuesV1(value: unknown, label: string): readonly unknown[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value) as unknown as PropertyDescriptorMap;
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined ||
    lengthDescriptor.get !== undefined ||
    lengthDescriptor.set !== undefined ||
    !Object.hasOwn(lengthDescriptor, "value") ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    lengthDescriptor.value > 2 ||
    Object.keys(descriptors).length !== lengthDescriptor.value + 1
  ) {
    throw new TypeError(`invalid ${label} fields`);
  }
  const parsed: unknown[] = [];
  for (let index = 0; index < lengthDescriptor.value; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !Object.hasOwn(descriptor, "value") ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} item`);
    }
    parsed.push(descriptor.value);
  }
  return parsed;
}

function parseFlowFactV1(value: unknown): E2eFlowFactV1 {
  const descriptors = inspectDataObjectV1(value, "E2E Flow Fact");
  const kind = descriptors.kind?.value;
  switch (kind) {
    case "flow.started": {
      exactDataObjectV1(value, ["kind"], "E2E Flow started Fact");
      return Object.freeze({ kind });
    }
    case "flow.branch_selected": {
      const parsed = exactDataObjectV1(value, ["kind", "branch"], "E2E Flow branch-selected Fact");
      if (parsed.branch !== "left" && parsed.branch !== "right") {
        throw new TypeError("invalid E2E Flow branch-selected Fact branch");
      }
      return Object.freeze({ kind, branch: parsed.branch });
    }
    case "flow.blocked": {
      const parsed = exactDataObjectV1(value, ["kind", "blocked"], "E2E Flow blocked Fact");
      if (typeof parsed.blocked !== "boolean") {
        throw new TypeError("invalid E2E Flow blocked Fact value");
      }
      return Object.freeze({ kind, blocked: parsed.blocked });
    }
    case "flow.resolved": {
      exactDataObjectV1(value, ["kind"], "E2E Flow resolved Fact");
      return Object.freeze({ kind });
    }
    default:
      throw new TypeError("invalid E2E Flow Fact kind");
  }
}

function parseFlowFactsV1(value: unknown): readonly E2eFlowFactV1[] {
  return Object.freeze(denseArrayValuesV1(value, "E2E Flow Facts").map(parseFlowFactV1));
}

type FlowOwnerProposalVariantV1 = "start" | "choose" | "continue" | "debug_block" | "debug_unblock";

function hasChoiceBranchV1(state: E2eFlowStateV1): boolean {
  return state.branch === "left" || state.branch === "right";
}

function hasToggleableFlowPositionV1(state: E2eFlowStateV1): boolean {
  return (
    (state.branch === null && state.nodeId === "choice") ||
    (hasChoiceBranchV1(state) && state.nodeId === "rejoin")
  );
}

function isReachableFlowTupleV1(state: E2eFlowStateV1): boolean {
  switch (state.status) {
    case "idle":
      return state.branch === null && state.nodeId === "intro";
    case "choosing":
    case "blocked":
      return hasToggleableFlowPositionV1(state);
    case "resolved":
      return hasChoiceBranchV1(state) && state.nodeId === "done";
  }
  const unsupportedStatus: never = state.status;
  throw new TypeError(`unsupported E2E Flow status ${String(unsupportedStatus)}`);
}

function classifyFlowOwnerProposalV1(
  payload: E2eFlowStateV1,
  facts: readonly E2eFlowFactV1[],
): FlowOwnerProposalVariantV1 {
  const first = facts[0];
  const second = facts[1];

  if (
    facts.length === 1 &&
    first?.kind === "flow.started" &&
    payload.status === "choosing" &&
    payload.branch === null &&
    payload.nodeId === "choice"
  ) {
    return "start";
  }
  if (
    facts.length === 2 &&
    first?.kind === "flow.branch_selected" &&
    second?.kind === "flow.blocked" &&
    second.blocked &&
    payload.status === "blocked" &&
    payload.branch === first.branch &&
    payload.nodeId === "rejoin"
  ) {
    return "choose";
  }
  if (
    facts.length === 1 &&
    first?.kind === "flow.resolved" &&
    payload.status === "resolved" &&
    hasChoiceBranchV1(payload) &&
    payload.nodeId === "done"
  ) {
    return "continue";
  }
  if (
    facts.length === 1 &&
    first?.kind === "flow.blocked" &&
    first.blocked &&
    payload.status === "blocked" &&
    hasToggleableFlowPositionV1(payload)
  ) {
    return "debug_block";
  }
  if (
    facts.length === 1 &&
    first?.kind === "flow.blocked" &&
    !first.blocked &&
    payload.status === "choosing" &&
    hasToggleableFlowPositionV1(payload)
  ) {
    return "debug_unblock";
  }
  throw new TypeError("invalid E2E Flow owner proposal transition");
}

const flowOwnerOperationSchemaV1: RuntimeSchemaV1<FlowOwnerOperationV1> = Object.freeze({
  parse(value: unknown): FlowOwnerOperationV1 {
    const descriptors = inspectDataObjectV1(value, "E2E Flow owner operation");
    const kind = descriptors.kind?.value;
    switch (kind) {
      case "flow.start":
      case "flow.continue":
        exactDataObjectV1(value, ["kind"], "E2E Flow owner operation");
        return Object.freeze({ kind });
      case "flow.choose": {
        const parsed = exactDataObjectV1(value, ["kind", "choice"], "E2E Flow choose operation");
        if (parsed.choice !== "left" && parsed.choice !== "right") {
          throw new TypeError("invalid E2E Flow choice");
        }
        return Object.freeze({ kind, choice: parsed.choice });
      }
      case "flow.set_blocked": {
        const parsed = exactDataObjectV1(
          value,
          ["kind", "blocked"],
          "E2E Flow set-blocked operation",
        );
        if (typeof parsed.blocked !== "boolean") {
          throw new TypeError("invalid E2E Flow blocked value");
        }
        return Object.freeze({ kind, blocked: parsed.blocked });
      }
      default:
        throw new TypeError("invalid E2E Flow owner operation kind");
    }
  },
});

const flowOwnerProposalSchemaV1: RuntimeSchemaV1<FlowOwnerProposalV1> = Object.freeze({
  parse(value: unknown): FlowOwnerProposalV1 {
    const parsed = exactDataObjectV1(value, ["payload", "facts"], "E2E Flow owner proposal");
    const payload = e2eFlowStateSchemaV1.parse(parsed.payload);
    const facts = parseFlowFactsV1(parsed.facts);
    classifyFlowOwnerProposalV1(payload, facts);
    return Object.freeze({
      payload,
      facts,
    });
  },
});

function parseFlowReadPortV1(value: unknown, requireFrozen = false): FlowReadPortV1 {
  const parsed = exactDataObjectV1(
    value,
    ["status", "branch", "nodeId"],
    "E2E Flow read port",
    requireFrozen,
  );
  const state = e2eFlowStateSchemaV1.parse(parsed);
  return Object.freeze({
    status: state.status,
    branch: state.branch,
    nodeId: state.nodeId,
  });
}

function parseFlowDependencyPortsV1(value: unknown): FlowDependencyPortsV1 {
  const parsed = exactDataObjectV1(value, ["counter"], "E2E Flow dependencies", true);
  const counter = exactDataObjectV1(parsed.counter, ["value"], "E2E Counter read port", true);
  return Object.freeze({
    counter: Object.freeze({ value: parseNonNegativeSafeInteger(counter.value) }),
  });
}

function flowProposalV1(payload: unknown, facts: unknown): FlowOwnerProposalV1 {
  return flowOwnerProposalSchemaV1.parse({ payload, facts });
}

function proposedFlowV1(payload: unknown, facts: unknown) {
  return Object.freeze({
    kind: "proposed" as const,
    proposal: flowProposalV1(payload, facts),
  });
}

function rejectedFlowV1<TCode extends FlowRejectionCodeV1>(code: TCode) {
  return Object.freeze({
    kind: "rejected" as const,
    rejection: Object.freeze({ code }),
  });
}

const flowLocalInvariantV1 = Object.freeze({
  check(stateValue: E2eFlowStateV1, readPortValue: FlowReadPortV1) {
    const state = e2eFlowStateSchemaV1.parse(stateValue);
    parseFlowReadPortV1(readPortValue, true);
    const violations: FlowInvariantViolationV1[] = [];
    if (state.status === "idle" && state.branch !== null) {
      violations.push(
        Object.freeze({
          code: "flow.branch_state_invalid",
          details: Object.freeze({ status: state.status, branch: state.branch }),
        }),
      );
    }
    if (state.status === "resolved" && state.nodeId !== "done") {
      violations.push(
        Object.freeze({
          code: "flow.resolved_node_invalid",
          details: Object.freeze({ status: state.status, nodeId: state.nodeId }),
        }),
      );
    }
    if (!isReachableFlowTupleV1(state) && violations.length === 0) {
      violations.push(
        Object.freeze({
          code: "flow.tuple_invalid",
          details: Object.freeze({
            status: state.status,
            branch: state.branch,
            nodeId: state.nodeId,
          }),
        }),
      );
    }
    return Object.freeze(violations);
  },
});

export const flowModuleV1 = defineGameplayModule<E2eGameSimulationTypesV1>()({
  bindingKind: "stateful",
  descriptor: {
    id: e2eFlowModuleIdV1,
    contractRevision: parsePositiveSafeInteger(1),
    stateSlots: [e2eFlowStateSlotIdV1],
    dependencies: [e2eCounterModuleIdV1],
  },
  commandSchema: null,
  querySchema: null,
  queryResultSchema: null,
  stateSchema: e2eFlowStateSchemaV1,
  ownerOperationSchema: flowOwnerOperationSchemaV1,
  ownerProposalSchema: flowOwnerProposalSchemaV1,
  localInvariants: [flowLocalInvariantV1],
  owner: {
    propose(stateValue, operationValue, dependenciesValue) {
      const state = e2eFlowStateSchemaV1.parse(stateValue);
      const operation = flowOwnerOperationSchemaV1.parse(operationValue);
      parseFlowDependencyPortsV1(dependenciesValue);

      switch (operation.kind) {
        case "flow.start":
          return state.status === "idle" && state.branch === null && state.nodeId === "intro"
            ? proposedFlowV1({ status: "choosing", branch: null, nodeId: "choice" }, [
                { kind: "flow.started" },
              ])
            : rejectedFlowV1("flow.not_idle");
        case "flow.choose":
          return state.status === "choosing" && state.branch === null && state.nodeId === "choice"
            ? proposedFlowV1({ status: "blocked", branch: operation.choice, nodeId: "rejoin" }, [
                { kind: "flow.branch_selected", branch: operation.choice },
                { kind: "flow.blocked", blocked: true },
              ])
            : rejectedFlowV1("flow.not_choosing");
        case "flow.continue":
          return state.status === "blocked" && hasChoiceBranchV1(state) && state.nodeId === "rejoin"
            ? proposedFlowV1({ status: "resolved", branch: state.branch, nodeId: "done" }, [
                { kind: "flow.resolved" },
              ])
            : rejectedFlowV1("flow.not_blocked");
        case "flow.set_blocked":
          if (
            state.status === "choosing" &&
            hasToggleableFlowPositionV1(state) &&
            operation.blocked
          ) {
            return proposedFlowV1(
              { status: "blocked", branch: state.branch, nodeId: state.nodeId },
              [{ kind: "flow.blocked", blocked: true }],
            );
          }
          if (
            state.status === "blocked" &&
            hasToggleableFlowPositionV1(state) &&
            !operation.blocked
          ) {
            return proposedFlowV1(
              { status: "choosing", branch: state.branch, nodeId: state.nodeId },
              [{ kind: "flow.blocked", blocked: false }],
            );
          }
          return rejectedFlowV1("flow.block_state_conflict");
      }
      const unsupportedOperation: never = operation;
      throw new TypeError(`unsupported E2E Flow operation ${String(unsupportedOperation)}`);
    },
    apply(stateValue, proposalValue) {
      const state = e2eFlowStateSchemaV1.parse(stateValue);
      const proposal = flowOwnerProposalSchemaV1.parse(proposalValue);
      const variant = classifyFlowOwnerProposalV1(proposal.payload, proposal.facts);
      const isCoherent =
        (variant === "start" &&
          state.status === "idle" &&
          state.branch === null &&
          state.nodeId === "intro") ||
        (variant === "choose" &&
          state.status === "choosing" &&
          state.branch === null &&
          state.nodeId === "choice") ||
        (variant === "continue" &&
          state.status === "blocked" &&
          hasChoiceBranchV1(state) &&
          state.nodeId === "rejoin" &&
          state.branch === proposal.payload.branch) ||
        (variant === "debug_block" &&
          state.status === "choosing" &&
          hasToggleableFlowPositionV1(state) &&
          state.branch === proposal.payload.branch &&
          state.nodeId === proposal.payload.nodeId) ||
        (variant === "debug_unblock" &&
          state.status === "blocked" &&
          hasToggleableFlowPositionV1(state) &&
          state.branch === proposal.payload.branch &&
          state.nodeId === proposal.payload.nodeId);
      if (!isCoherent) {
        throw new TypeError("E2E Flow owner proposal does not match current State");
      }
      return e2eFlowStateSchemaV1.parse(proposal.payload);
    },
  },
  queries: null,
  createInitialState() {
    return e2eFlowStateSchemaV1.parse(initialFlowStateV1);
  },
  createReadPort(stateValue) {
    const state = e2eFlowStateSchemaV1.parse(stateValue);
    return Object.freeze({
      status: state.status,
      branch: state.branch,
      nodeId: state.nodeId,
    });
  },
});
