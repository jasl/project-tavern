// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly, ModuleOwnerCapabilityV1 } from "@sillymaker/base";

import { definePocGameplayModuleV1 } from "../../contracts/define-poc-gameplay-module.js";
import { descriptorForPocModuleV1 } from "../../contracts/module-catalog.js";
import type {
  ChangeReasonV1,
  FacilitiesStateV1,
  FacilityChoiceV1,
  FacilityDecisionV1,
  PocGameBootstrapInputV1,
  PocRejectionReasonV1,
} from "../../contracts/types.js";
import { deepFreezePocValueV1 } from "../../contracts/values.js";
import {
  assertValidInitialPocFacilitiesStateV1,
  pocFacilitiesDependencyPortsSchemaV1,
  pocFacilitiesInvariantV1,
  pocFacilitiesOwnerOperationSchemaV1,
  pocFacilitiesOwnerProposalSchemaV1,
  pocFacilitiesStateSchemaV1,
  pocFacilitiesStatesEqualV1,
  sortPocFacilityDecisionRecordsV1,
  sortPocFacilityStatesV1,
} from "./contract.js";
import type {
  PocFacilitiesDependencyPortsV1,
  PocFacilitiesGameplayFactV1,
  PocFacilitiesOwnerOperationV1,
  PocFacilitiesOwnerProposalV1,
  PocFacilitiesReadPortV1,
} from "./contract.js";

type PocFacilitiesProposalResultV1 =
  | { readonly kind: "proposed"; readonly proposal: PocFacilitiesOwnerProposalV1 }
  | { readonly kind: "rejected"; readonly rejection: PocRejectionReasonV1 };

type PocFacilitiesRejectionV1 = Extract<
  PocRejectionReasonV1,
  {
    readonly code:
      "facility.target_not_offered" | "facility.already_built" | "facility.choice_committed";
  }
>;

function assertValidFacilitiesStateV1(state: FacilitiesStateV1, label: string): void {
  if (pocFacilitiesInvariantV1.check(state, createPocFacilitiesReadPortV1(state)).length !== 0) {
    throw new TypeError(`${label} violates Facilities collection invariants`);
  }
}

function rejectedFacilitiesChangeV1(
  rejection: PocFacilitiesRejectionV1,
): PocFacilitiesProposalResultV1 {
  return deepFreezePocValueV1({ kind: "rejected", rejection });
}

function choiceReasonV1(
  choice: FacilityChoiceV1,
  dependencies: PocFacilitiesDependencyPortsV1,
): Extract<ChangeReasonV1, { readonly kind: "command" }> {
  return deepFreezePocValueV1({
    kind: "command",
    commandKind: "facility.choose",
    reasonId:
      choice.kind === "build"
        ? dependencies.facilityBuildReasonId
        : dependencies.opportunity.skipReasonId,
  });
}

function proposeFacilityChoiceV1(
  state: FacilitiesStateV1,
  operation: PocFacilitiesOwnerOperationV1,
  dependencies: PocFacilitiesDependencyPortsV1,
): PocFacilitiesProposalResultV1 {
  if (operation.opportunityId !== dependencies.opportunity.opportunityId) {
    throw new TypeError("Facilities operation does not match opportunity dependency");
  }
  const existingDecision = state.decisions.find(
    ({ opportunityId }) => opportunityId === operation.opportunityId,
  );
  if (existingDecision !== undefined) {
    return rejectedFacilitiesChangeV1({
      code: "facility.choice_committed",
      details: {
        opportunityId: existingDecision.opportunityId,
        choice: existingDecision.decision,
      },
    });
  }

  if (operation.choice.kind === "build") {
    const facilityId = operation.choice.facilityId;
    if (!dependencies.opportunity.facilityIds.includes(facilityId)) {
      return rejectedFacilitiesChangeV1({
        code: "facility.target_not_offered",
        details: {
          opportunityId: operation.opportunityId,
          facilityId,
        },
      });
    }
    if (state.built.some((built) => built.facilityId === facilityId)) {
      return rejectedFacilitiesChangeV1({
        code: "facility.already_built",
        details: { facilityId },
      });
    }
  }

  const decision: FacilityDecisionV1 =
    operation.choice.kind === "build"
      ? deepFreezePocValueV1({ kind: "built", facilityId: operation.choice.facilityId })
      : deepFreezePocValueV1({ kind: "skipped" });

  const after = pocFacilitiesStateSchemaV1.parse({
    built:
      operation.choice.kind === "build"
        ? sortPocFacilityStatesV1([
            ...state.built,
            {
              facilityId: operation.choice.facilityId,
              builtAtSequence: dependencies.commandSequence,
            },
          ])
        : state.built,
    decisions: sortPocFacilityDecisionRecordsV1([
      ...state.decisions,
      { opportunityId: operation.opportunityId, decision },
    ]),
  });
  assertValidFacilitiesStateV1(after, "Facilities proposal");
  const facts: readonly PocFacilitiesGameplayFactV1[] = [
    {
      kind: "facility.choice_committed",
      opportunityId: operation.opportunityId,
      choice: decision,
      reason: choiceReasonV1(operation.choice, dependencies),
    },
  ];
  return deepFreezePocValueV1({
    kind: "proposed",
    proposal: pocFacilitiesOwnerProposalSchemaV1.parse({
      payload: { kind: operation.kind, before: state, after },
      facts,
    }),
  });
}

export function createPocFacilitiesReadPortV1(
  stateValue: DeepReadonly<FacilitiesStateV1>,
): PocFacilitiesReadPortV1 {
  return pocFacilitiesStateSchemaV1.parse(stateValue);
}

export const pocFacilitiesOwnerV1: ModuleOwnerCapabilityV1<
  FacilitiesStateV1,
  PocFacilitiesOwnerOperationV1,
  PocFacilitiesOwnerProposalV1,
  PocRejectionReasonV1,
  PocFacilitiesDependencyPortsV1
> = Object.freeze({
  propose(
    stateValue: DeepReadonly<FacilitiesStateV1>,
    operationValue: DeepReadonly<PocFacilitiesOwnerOperationV1>,
    dependenciesValue: PocFacilitiesDependencyPortsV1,
  ): PocFacilitiesProposalResultV1 {
    const state = pocFacilitiesStateSchemaV1.parse(stateValue);
    assertValidFacilitiesStateV1(state, "Facilities State");
    const operation = pocFacilitiesOwnerOperationSchemaV1.parse(operationValue);
    const dependencies = pocFacilitiesDependencyPortsSchemaV1.parse(dependenciesValue);
    return proposeFacilityChoiceV1(state, operation, dependencies);
  },

  apply(
    stateValue: DeepReadonly<FacilitiesStateV1>,
    proposalValue: DeepReadonly<PocFacilitiesOwnerProposalV1>,
  ): FacilitiesStateV1 {
    const state = pocFacilitiesStateSchemaV1.parse(stateValue);
    assertValidFacilitiesStateV1(state, "Facilities State");
    const proposal = pocFacilitiesOwnerProposalSchemaV1.parse(proposalValue);
    if (!pocFacilitiesStatesEqualV1(state, proposal.payload.before)) {
      throw new TypeError("stale Facilities owner proposal");
    }
    assertValidFacilitiesStateV1(proposal.payload.after, "Facilities proposal");
    return pocFacilitiesStateSchemaV1.parse(proposal.payload.after);
  },
});

const initialFacilitiesStateV1 = pocFacilitiesStateSchemaV1.parse({ built: [], decisions: [] });
assertValidInitialPocFacilitiesStateV1(initialFacilitiesStateV1);

export function createInitialPocFacilitiesStateV1(
  _bootstrap: DeepReadonly<PocGameBootstrapInputV1>,
): FacilitiesStateV1 {
  return pocFacilitiesStateSchemaV1.parse(initialFacilitiesStateV1);
}

export const pocFacilitiesGameplayModuleV1 = definePocGameplayModuleV1({
  bindingKind: "stateful",
  descriptor: descriptorForPocModuleV1("facilities"),
  commandSchema: null,
  querySchema: null,
  queryResultSchema: null,
  stateSchema: pocFacilitiesStateSchemaV1,
  ownerOperationSchema: pocFacilitiesOwnerOperationSchemaV1,
  ownerProposalSchema: pocFacilitiesOwnerProposalSchemaV1,
  localInvariants: Object.freeze([pocFacilitiesInvariantV1]),
  owner: pocFacilitiesOwnerV1,
  queries: null,
  createInitialState: createInitialPocFacilitiesStateV1,
  createReadPort: createPocFacilitiesReadPortV1,
});
