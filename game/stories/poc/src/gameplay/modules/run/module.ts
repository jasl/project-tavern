// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly, ModuleOwnerCapabilityV1 } from "@sillymaker/base";

import { definePocGameplayModuleV1 } from "../../contracts/define-poc-gameplay-module.js";
import { descriptorForPocModuleV1 } from "../../contracts/module-catalog.js";
import type {
  PocGameBootstrapInputV1,
  PocRejectionReasonV1,
  RunStateV1,
} from "../../contracts/types.js";
import {
  parsePocRunBootstrapInputV1,
  parsePocRunDependencyPortsV1,
  pocRunInvariantV1,
  pocRunOwnerOperationSchemaV1,
  pocRunOwnerProposalSchemaV1,
  pocRunStateSchemaV1,
  pocRunStatesEqualV1,
} from "./contract.js";
import type {
  PocRunDependencyPortsV1,
  PocRunOwnerOperationV1,
  PocRunOwnerProposalV1,
  PocRunReadPortV1,
} from "./contract.js";

type RunInvalidStatusRejectionV1 = Extract<
  PocRejectionReasonV1,
  { readonly code: "run.invalid_status" }
>;

function rejectInvalidRunStatusV1(
  actual: RunStateV1["status"],
  allowed: readonly RunStateV1["status"][],
) {
  const rejection = Object.freeze({
    code: "run.invalid_status" as const,
    details: Object.freeze({ actual, allowed: Object.freeze([...allowed]) }),
  }) satisfies RunInvalidStatusRejectionV1;
  return Object.freeze({ kind: "rejected" as const, rejection });
}

export function createInitialPocRunStateV1(
  bootstrapValue: DeepReadonly<PocGameBootstrapInputV1>,
): RunStateV1 {
  const bootstrap = parsePocRunBootstrapInputV1(bootstrapValue);
  return pocRunStateSchemaV1.parse({
    runId: bootstrap.runId,
    initialSeed: bootstrap.rngSeed,
    status: "setup",
    completion: null,
  });
}

export function createPocRunReadPortV1(stateValue: DeepReadonly<RunStateV1>): PocRunReadPortV1 {
  return pocRunStateSchemaV1.parse(stateValue);
}

function assertSameRunIdentityV1(before: RunStateV1, after: RunStateV1): void {
  if (before.runId !== after.runId || before.initialSeed !== after.initialSeed) {
    throw new TypeError("Run proposal changed immutable identity");
  }
}

function assertValidRunTransitionV1(proposal: PocRunOwnerProposalV1): void {
  const { after, before, kind } = proposal.payload;
  assertSameRunIdentityV1(before, after);
  if (kind === "run.activate") {
    if (
      before.status !== "setup" ||
      before.completion !== null ||
      after.status !== "active" ||
      after.completion !== null
    ) {
      throw new TypeError("invalid Run activation proposal");
    }
    return;
  }
  if (
    before.status !== "active" ||
    before.completion !== null ||
    after.completion === null ||
    after.status !== after.completion.status
  ) {
    throw new TypeError("invalid Run completion proposal");
  }
}

export const pocRunOwnerV1: ModuleOwnerCapabilityV1<
  RunStateV1,
  PocRunOwnerOperationV1,
  PocRunOwnerProposalV1,
  PocRejectionReasonV1,
  PocRunDependencyPortsV1
> = {
  propose(stateValue, operationValue, dependenciesValue) {
    const state = pocRunStateSchemaV1.parse(stateValue);
    const operation = pocRunOwnerOperationSchemaV1.parse(operationValue);
    parsePocRunDependencyPortsV1(dependenciesValue);

    if (operation.kind === "run.activate") {
      if (state.status !== "setup") return rejectInvalidRunStatusV1(state.status, ["setup"]);
      return Object.freeze({
        kind: "proposed" as const,
        proposal: pocRunOwnerProposalSchemaV1.parse({
          payload: {
            kind: operation.kind,
            before: state,
            after: { ...state, status: "active" },
          },
          facts: [],
        }),
      });
    }

    if (state.status !== "active") return rejectInvalidRunStatusV1(state.status, ["active"]);
    return Object.freeze({
      kind: "proposed" as const,
      proposal: pocRunOwnerProposalSchemaV1.parse({
        payload: {
          kind: operation.kind,
          before: state,
          after: {
            ...state,
            status: operation.completion.status,
            completion: operation.completion,
          },
        },
        facts: [{ kind: "run.completed", completion: operation.completion }],
      }),
    });
  },
  apply(stateValue, proposalValue) {
    const state = pocRunStateSchemaV1.parse(stateValue);
    const proposal = pocRunOwnerProposalSchemaV1.parse(proposalValue);
    if (!pocRunStatesEqualV1(state, proposal.payload.before)) {
      throw new TypeError("stale Run owner proposal");
    }
    assertValidRunTransitionV1(proposal);
    return pocRunStateSchemaV1.parse(proposal.payload.after);
  },
};
Object.freeze(pocRunOwnerV1);

export const pocRunGameplayModuleV1 = definePocGameplayModuleV1({
  bindingKind: "stateful",
  descriptor: descriptorForPocModuleV1("run"),
  stateSchema: pocRunStateSchemaV1,
  commandSchema: null,
  querySchema: null,
  queryResultSchema: null,
  ownerOperationSchema: pocRunOwnerOperationSchemaV1,
  ownerProposalSchema: pocRunOwnerProposalSchemaV1,
  localInvariants: Object.freeze([pocRunInvariantV1]),
  owner: pocRunOwnerV1,
  queries: null,
  createInitialState: createInitialPocRunStateV1,
  createReadPort: createPocRunReadPortV1,
});
