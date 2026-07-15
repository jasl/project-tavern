// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly, ModuleOwnerCapabilityV1 } from "@sillymaker/base";

import { definePocGameplayModuleV1 } from "../../contracts/define-poc-gameplay-module.js";
import { descriptorForPocModuleV1 } from "../../contracts/module-catalog.js";
import type {
  NarrativeCursorV1,
  NarrativeRuntimeStateV1,
  PocGameBootstrapInputV1,
  PocRejectionReasonV1,
} from "../../contracts/types.js";
import { deepFreezePocValueV1 } from "../../contracts/values.js";
import {
  assertValidInitialPocNarrativeStateV1,
  assertValidPocNarrativeStateV1,
  pocNarrativeDependencyPortsSchemaV1,
  pocNarrativeInvariantV1,
  pocNarrativeOwnerOperationSchemaV1,
  pocNarrativeOwnerProposalSchemaV1,
  pocNarrativeStateSchemaV1,
  pocNarrativeStatesEqualV1,
} from "./contract.js";
import type {
  PocNarrativeDependencyPortsV1,
  PocNarrativeGameplayFactV1,
  PocNarrativeOwnerOperationV1,
  PocNarrativeOwnerProposalV1,
  PocNarrativeReadPortV1,
} from "./contract.js";

type PocNarrativeProposalResultV1 =
  | { readonly kind: "proposed"; readonly proposal: PocNarrativeOwnerProposalV1 }
  | { readonly kind: "rejected"; readonly rejection: PocRejectionReasonV1 };

type NarrativeInactiveRejectionV1 = Extract<
  PocRejectionReasonV1,
  { readonly code: "narrative.inactive" }
>;

type NarrativeCursorMismatchRejectionV1 = Extract<
  PocRejectionReasonV1,
  { readonly code: "narrative.cursor_mismatch" }
>;

function narrativeCursorsEqualV1(
  left: NarrativeCursorV1 | null,
  right: NarrativeCursorV1 | null,
): boolean {
  return (
    left === right ||
    (left !== null &&
      right !== null &&
      left.sceneId === right.sceneId &&
      left.nodeId === right.nodeId)
  );
}

function proposedNarrativeChangeV1(
  kind: PocNarrativeOwnerOperationV1["kind"],
  before: NarrativeRuntimeStateV1,
  after: NarrativeRuntimeStateV1,
  facts: readonly PocNarrativeGameplayFactV1[],
): PocNarrativeProposalResultV1 {
  return deepFreezePocValueV1({
    kind: "proposed",
    proposal: pocNarrativeOwnerProposalSchemaV1.parse({
      payload: { kind, before, after },
      facts,
    }),
  });
}

function rejectedNarrativeChangeV1(
  rejection: NarrativeInactiveRejectionV1 | NarrativeCursorMismatchRejectionV1,
): PocNarrativeProposalResultV1 {
  return deepFreezePocValueV1({ kind: "rejected", rejection });
}

function rejectInactiveNarrativeV1(
  commandKind: "narrative.advance" | "narrative.choose",
): PocNarrativeProposalResultV1 {
  return rejectedNarrativeChangeV1({
    code: "narrative.inactive",
    details: { commandKind },
  });
}

function rejectNarrativeCursorMismatchV1(
  expected: NarrativeCursorV1,
  actual: NarrativeCursorV1 | null,
): PocNarrativeProposalResultV1 {
  return rejectedNarrativeChangeV1({
    code: "narrative.cursor_mismatch",
    details: { expected, actual },
  });
}

function requireSettledDependenciesV1(dependencies: PocNarrativeDependencyPortsV1): void {
  if (dependencies.kind !== "narrative.settled") {
    throw new TypeError("Narrative settled operation requires settled dependencies");
  }
}

function requireDebugJumpDependenciesV1(
  operation: Extract<PocNarrativeOwnerOperationV1, { readonly kind: "narrative.debug.jump" }>,
  dependencies: PocNarrativeDependencyPortsV1,
): void {
  if (dependencies.kind !== "narrative.debug.jump") {
    throw new TypeError("Narrative debug jump requires debug target proof");
  }
  if (!narrativeCursorsEqualV1(operation.target, dependencies.target.cursor)) {
    throw new TypeError("Narrative debug jump target does not match its proof");
  }
}

export function createPocNarrativeReadPortV1(
  stateValue: DeepReadonly<NarrativeRuntimeStateV1>,
): PocNarrativeReadPortV1 {
  const state = pocNarrativeStateSchemaV1.parse(stateValue);
  assertValidPocNarrativeStateV1(state, "Narrative State");
  return state;
}

export const pocNarrativeOwnerV1: ModuleOwnerCapabilityV1<
  NarrativeRuntimeStateV1,
  PocNarrativeOwnerOperationV1,
  PocNarrativeOwnerProposalV1,
  PocRejectionReasonV1,
  PocNarrativeDependencyPortsV1
> = Object.freeze({
  propose(
    stateValue: DeepReadonly<NarrativeRuntimeStateV1>,
    operationValue: DeepReadonly<PocNarrativeOwnerOperationV1>,
    dependenciesValue: PocNarrativeDependencyPortsV1,
  ): PocNarrativeProposalResultV1 {
    const state = pocNarrativeStateSchemaV1.parse(stateValue);
    assertValidPocNarrativeStateV1(state, "Narrative State");
    const operation = pocNarrativeOwnerOperationSchemaV1.parse(operationValue);
    const dependencies = pocNarrativeDependencyPortsSchemaV1.parse(dependenciesValue);

    if (operation.kind === "narrative.debug.jump") {
      requireDebugJumpDependenciesV1(operation, dependencies);
      if (state.status !== "active" || state.cursor === null) {
        throw new TypeError("Narrative debug jump requires active Narrative State");
      }
      const after = pocNarrativeStateSchemaV1.parse({
        ...state,
        cursor: operation.target,
        callStack: [],
      });
      return proposedNarrativeChangeV1(operation.kind, state, after, []);
    }

    requireSettledDependenciesV1(dependencies);
    const after = operation.settled.state;
    const facts = operation.settled.gameplayFacts;

    if (operation.kind === "narrative.start") {
      if (state.status === "active") {
        throw new TypeError("Narrative start requires inactive Narrative State");
      }
      return proposedNarrativeChangeV1(operation.kind, state, after, facts);
    }

    if (operation.kind === "narrative.advance") {
      if (state.status !== "active" || state.cursor === null) {
        return rejectInactiveNarrativeV1(operation.kind);
      }
      const fact = facts[0];
      if (fact?.kind !== "narrative.advanced") {
        throw new TypeError("Narrative advance requires one advanced GameplayFact");
      }
      if (!narrativeCursorsEqualV1(state.cursor, fact.from)) {
        return rejectNarrativeCursorMismatchV1(state.cursor, fact.from);
      }
      return proposedNarrativeChangeV1(operation.kind, state, after, facts);
    }

    if (operation.kind === "narrative.choose") {
      if (state.status !== "active" || state.cursor === null) {
        return rejectInactiveNarrativeV1(operation.kind);
      }
      const fact = facts[0];
      if (fact?.kind !== "narrative.choice_committed") {
        throw new TypeError("Narrative choose requires one choice GameplayFact");
      }
      if (!narrativeCursorsEqualV1(state.cursor, fact.cursor)) {
        return rejectNarrativeCursorMismatchV1(state.cursor, fact.cursor);
      }
      return proposedNarrativeChangeV1(operation.kind, state, after, facts);
    }

    if (state.status !== "active" || state.cursor === null) {
      throw new TypeError("Narrative complete requires active Narrative State");
    }
    return proposedNarrativeChangeV1(operation.kind, state, after, facts);
  },

  apply(
    stateValue: DeepReadonly<NarrativeRuntimeStateV1>,
    proposalValue: DeepReadonly<PocNarrativeOwnerProposalV1>,
  ): NarrativeRuntimeStateV1 {
    const state = pocNarrativeStateSchemaV1.parse(stateValue);
    assertValidPocNarrativeStateV1(state, "Narrative State");
    const proposal = pocNarrativeOwnerProposalSchemaV1.parse(proposalValue);
    if (!pocNarrativeStatesEqualV1(state, proposal.payload.before)) {
      throw new TypeError("stale Narrative owner proposal");
    }
    assertValidPocNarrativeStateV1(proposal.payload.after, "Narrative proposal");
    return pocNarrativeStateSchemaV1.parse(proposal.payload.after);
  },
});

const initialNarrativeStateV1 = pocNarrativeStateSchemaV1.parse({
  status: "idle",
  source: null,
  cursor: null,
  callStack: [],
  stage: {
    backgroundAssetId: null,
    characters: [],
    transition: "cut",
  },
});
assertValidInitialPocNarrativeStateV1(initialNarrativeStateV1);

export function createInitialPocNarrativeStateV1(
  _bootstrap: DeepReadonly<PocGameBootstrapInputV1>,
): NarrativeRuntimeStateV1 {
  return pocNarrativeStateSchemaV1.parse(initialNarrativeStateV1);
}

export const pocNarrativeGameplayModuleV1 = definePocGameplayModuleV1({
  bindingKind: "stateful",
  descriptor: descriptorForPocModuleV1("narrative"),
  commandSchema: null,
  querySchema: null,
  queryResultSchema: null,
  stateSchema: pocNarrativeStateSchemaV1,
  ownerOperationSchema: pocNarrativeOwnerOperationSchemaV1,
  ownerProposalSchema: pocNarrativeOwnerProposalSchemaV1,
  localInvariants: Object.freeze([pocNarrativeInvariantV1]),
  owner: pocNarrativeOwnerV1,
  queries: null,
  createInitialState: createInitialPocNarrativeStateV1,
  createReadPort: createPocNarrativeReadPortV1,
});

export type PocNarrativeGameplayModuleV1 = typeof pocNarrativeGameplayModuleV1;
