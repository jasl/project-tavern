// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly, ModuleOwnerCapabilityV1 } from "@sillymaker/base";

import { definePocGameplayModuleV1 } from "../../contracts/define-poc-gameplay-module.js";
import { descriptorForPocModuleV1 } from "../../contracts/module-catalog.js";
import type { PocGameBootstrapInputV1, PocRejectionReasonV1 } from "../../contracts/types.js";
import { deepFreezePocValueV1 } from "../../contracts/values.js";
import {
  assertPocProgressionFactEntryMatchesDefinitionV1,
  assertPocProgressionOutcomeEntryMatchesDefinitionV1,
  assertPocProgressionQuestEntryMatchesDefinitionV1,
  assertValidInitialPocProgressionStateV1,
  assertValidPocProgressionStateV1,
  createPocProgressionResolvedCheckV1,
  pocProgressionDependencyPortsSchemaV1,
  pocProgressionInvariantV1,
  pocProgressionOwnerOperationSchemaV1,
  pocProgressionOwnerProposalSchemaV1,
  pocProgressionStateSchemaV1,
  pocProgressionStatesEqualV1,
} from "./contract.js";
import type {
  PocProgressionCheckRecordDependenciesV1,
  PocProgressionDependencyPortsV1,
  PocProgressionFactSetDependenciesV1,
  PocProgressionGameplayFactV1,
  PocProgressionOutcomeSetDependenciesV1,
  PocProgressionOwnerOperationV1,
  PocProgressionOwnerProposalV1,
  PocProgressionQuestSetDependenciesV1,
  PocProgressionReadPortV1,
  PocProgressionStateV1,
} from "./contract.js";

type PocProgressionProposalResultV1 =
  | { readonly kind: "proposed"; readonly proposal: PocProgressionOwnerProposalV1 }
  | { readonly kind: "rejected"; readonly rejection: PocRejectionReasonV1 };

type PocProgressionDuplicateCheckRejectionV1 = Extract<
  PocRejectionReasonV1,
  { readonly code: "engine.invariant_rejected" }
>;

function rejectedDuplicateCheckV1(): PocProgressionProposalResultV1 {
  const rejection: PocProgressionDuplicateCheckRejectionV1 = {
    code: "engine.invariant_rejected",
    details: { invariantCode: "collection.duplicate_id" },
  };
  return deepFreezePocValueV1({ kind: "rejected", rejection });
}

function proposedProgressionChangeV1(
  operation: PocProgressionOwnerOperationV1,
  before: PocProgressionStateV1,
  after: PocProgressionStateV1,
  facts: readonly PocProgressionGameplayFactV1[],
): PocProgressionProposalResultV1 {
  return deepFreezePocValueV1({
    kind: "proposed",
    proposal: pocProgressionOwnerProposalSchemaV1.parse({
      payload: { kind: operation.kind, before, after },
      facts,
    }),
  });
}

function assertMatchingDependencyKindV1(
  operation: PocProgressionOwnerOperationV1,
  dependencies: PocProgressionDependencyPortsV1,
): void {
  if (operation.kind !== dependencies.kind) {
    throw new TypeError("Progression operation does not match its dependency ports");
  }
}

function proposeFactSetV1(
  state: PocProgressionStateV1,
  operation: Extract<PocProgressionOwnerOperationV1, { readonly kind: "progression.fact.set" }>,
  dependencies: PocProgressionFactSetDependenciesV1,
): PocProgressionProposalResultV1 {
  const current = state.facts.find(({ factId }) => factId === operation.entry.factId);
  if (current === undefined) {
    throw new TypeError("Progression Fact reference is missing from State");
  }
  assertPocProgressionFactEntryMatchesDefinitionV1(current, dependencies.definition);
  assertPocProgressionFactEntryMatchesDefinitionV1(operation.entry, dependencies.definition);
  const after = pocProgressionStateSchemaV1.parse({
    ...state,
    facts: state.facts.map((entry) =>
      entry.factId === operation.entry.factId ? operation.entry : entry,
    ),
  });
  return proposedProgressionChangeV1(operation, state, after, [
    {
      kind: "fact.set",
      factId: operation.entry.factId,
      value: operation.entry.value,
      reason: dependencies.reason,
    },
  ]);
}

function proposeQuestSetV1(
  state: PocProgressionStateV1,
  operation: Extract<PocProgressionOwnerOperationV1, { readonly kind: "progression.quest.set" }>,
  dependencies: PocProgressionQuestSetDependenciesV1,
): PocProgressionProposalResultV1 {
  const current = state.quests.find(({ questId }) => questId === operation.entry.questId);
  if (current === undefined) {
    throw new TypeError("Progression Quest reference is missing from State");
  }
  assertPocProgressionQuestEntryMatchesDefinitionV1(current, dependencies.definition);
  assertPocProgressionQuestEntryMatchesDefinitionV1(operation.entry, dependencies.definition);
  const after = pocProgressionStateSchemaV1.parse({
    ...state,
    quests: state.quests.map((entry) =>
      entry.questId === operation.entry.questId ? operation.entry : entry,
    ),
  });
  return proposedProgressionChangeV1(operation, state, after, [
    { kind: "quest.updated", quest: operation.entry, reason: dependencies.reason },
  ]);
}

function proposeOutcomeSetV1(
  state: PocProgressionStateV1,
  operation: Extract<PocProgressionOwnerOperationV1, { readonly kind: "progression.outcome.set" }>,
  dependencies: PocProgressionOutcomeSetDependenciesV1,
): PocProgressionProposalResultV1 {
  const current = state.outcomes.find(({ outcomeId }) => outcomeId === operation.entry.outcomeId);
  if (current === undefined) {
    throw new TypeError("Progression Outcome reference is missing from State");
  }
  assertPocProgressionOutcomeEntryMatchesDefinitionV1(current, dependencies.definition);
  assertPocProgressionOutcomeEntryMatchesDefinitionV1(operation.entry, dependencies.definition);
  const after = pocProgressionStateSchemaV1.parse({
    ...state,
    outcomes: state.outcomes.map((entry) =>
      entry.outcomeId === operation.entry.outcomeId ? operation.entry : entry,
    ),
  });
  return proposedProgressionChangeV1(operation, state, after, [
    {
      kind: "outcome.set",
      outcomeId: operation.entry.outcomeId,
      value: operation.entry.value,
      reason: dependencies.reason,
    },
  ]);
}

function proposeCheckRecordV1(
  state: PocProgressionStateV1,
  operation: Extract<PocProgressionOwnerOperationV1, { readonly kind: "progression.check.record" }>,
  dependencies: PocProgressionCheckRecordDependenciesV1,
): PocProgressionProposalResultV1 {
  const expected = createPocProgressionResolvedCheckV1(
    dependencies.result,
    dependencies.commandSequence,
  );
  if (
    !pocProgressionStatesEqualV1(
      { facts: [], quests: [], outcomes: [], resolvedChecks: [operation.check] },
      { facts: [], quests: [], outcomes: [], resolvedChecks: [expected] },
    )
  ) {
    throw new TypeError(
      "Progression resolved Check does not match its validated result or sequence",
    );
  }
  const previous = state.resolvedChecks.at(-1);
  if (previous !== undefined && dependencies.commandSequence <= previous.resolvedAtSequence) {
    throw new TypeError("Progression resolved Check sequence is not append-only");
  }
  const after = pocProgressionStateSchemaV1.parse({
    ...state,
    resolvedChecks: [...state.resolvedChecks, expected],
  });
  assertValidPocProgressionStateV1(after, "Progression Check proposal");
  return proposedProgressionChangeV1(operation, state, after, [
    { kind: "check.resolved", result: dependencies.result },
  ]);
}

function unreachableProgressionOperationV1(operation: never): never {
  throw new TypeError(`unsupported Progression owner operation ${String(operation)}`);
}

export function createPocProgressionReadPortV1(
  stateValue: DeepReadonly<PocProgressionStateV1>,
): PocProgressionReadPortV1 {
  return pocProgressionStateSchemaV1.parse(stateValue);
}

export const pocProgressionOwnerV1: ModuleOwnerCapabilityV1<
  PocProgressionStateV1,
  PocProgressionOwnerOperationV1,
  PocProgressionOwnerProposalV1,
  PocRejectionReasonV1,
  PocProgressionDependencyPortsV1
> = Object.freeze({
  propose(
    stateValue: DeepReadonly<PocProgressionStateV1>,
    operationValue: DeepReadonly<PocProgressionOwnerOperationV1>,
    dependenciesValue: PocProgressionDependencyPortsV1,
  ): PocProgressionProposalResultV1 {
    const state = pocProgressionStateSchemaV1.parse(stateValue);
    assertValidPocProgressionStateV1(state, "Progression State");
    const operation = pocProgressionOwnerOperationSchemaV1.parse(operationValue);
    const dependencies = pocProgressionDependencyPortsSchemaV1.parse(dependenciesValue);
    assertMatchingDependencyKindV1(operation, dependencies);

    // Idempotency wins over operation/result/sequence correlation for an admitted operation.
    if (
      operation.kind === "progression.check.record" &&
      state.resolvedChecks.some(({ checkId }) => checkId === operation.check.checkId)
    ) {
      return rejectedDuplicateCheckV1();
    }

    switch (operation.kind) {
      case "progression.fact.set":
        if (dependencies.kind !== operation.kind) {
          throw new TypeError("invalid Progression Fact dependencies");
        }
        return proposeFactSetV1(state, operation, dependencies);
      case "progression.quest.set":
        if (dependencies.kind !== operation.kind) {
          throw new TypeError("invalid Progression Quest dependencies");
        }
        return proposeQuestSetV1(state, operation, dependencies);
      case "progression.outcome.set":
        if (dependencies.kind !== operation.kind) {
          throw new TypeError("invalid Progression Outcome dependencies");
        }
        return proposeOutcomeSetV1(state, operation, dependencies);
      case "progression.check.record":
        if (dependencies.kind !== operation.kind) {
          throw new TypeError("invalid Progression Check dependencies");
        }
        return proposeCheckRecordV1(state, operation, dependencies);
    }
    return unreachableProgressionOperationV1(operation);
  },

  apply(
    stateValue: DeepReadonly<PocProgressionStateV1>,
    proposalValue: DeepReadonly<PocProgressionOwnerProposalV1>,
  ): PocProgressionStateV1 {
    const state = pocProgressionStateSchemaV1.parse(stateValue);
    assertValidPocProgressionStateV1(state, "Progression State");
    const proposal = pocProgressionOwnerProposalSchemaV1.parse(proposalValue);
    if (!pocProgressionStatesEqualV1(state, proposal.payload.before)) {
      throw new TypeError("stale Progression owner proposal");
    }
    assertValidPocProgressionStateV1(proposal.payload.after, "Progression proposal");
    return pocProgressionStateSchemaV1.parse(proposal.payload.after);
  },
});

export function createPocProgressionGameplayModuleV1(
  initialStateValue: DeepReadonly<PocProgressionStateV1>,
) {
  const initialState = pocProgressionStateSchemaV1.parse(initialStateValue);
  assertValidInitialPocProgressionStateV1(initialState);
  const createInitialState = (
    _bootstrap: DeepReadonly<PocGameBootstrapInputV1>,
  ): PocProgressionStateV1 => pocProgressionStateSchemaV1.parse(initialState);
  const defined = definePocGameplayModuleV1({
    bindingKind: "stateful" as const,
    descriptor: descriptorForPocModuleV1("progression"),
    commandSchema: null,
    querySchema: null,
    queryResultSchema: null,
    stateSchema: pocProgressionStateSchemaV1,
    ownerOperationSchema: pocProgressionOwnerOperationSchemaV1,
    ownerProposalSchema: pocProgressionOwnerProposalSchemaV1,
    localInvariants: Object.freeze([pocProgressionInvariantV1]),
    owner: pocProgressionOwnerV1,
    queries: null,
    createInitialState,
    createReadPort: createPocProgressionReadPortV1,
  });
  return defined as Omit<typeof defined, "ownerOperationSchema"> & {
    readonly ownerOperationSchema: typeof pocProgressionOwnerOperationSchemaV1;
  };
}

export type PocProgressionGameplayModuleV1 = ReturnType<
  typeof createPocProgressionGameplayModuleV1
>;
