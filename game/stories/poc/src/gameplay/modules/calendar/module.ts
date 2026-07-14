// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly, ModuleOwnerCapabilityV1 } from "@sillymaker/base";

import { definePocGameplayModuleV1 } from "../../contracts/define-poc-gameplay-module.js";
import { descriptorForPocModuleV1 } from "../../contracts/module-catalog.js";
import type {
  CalendarStateV1,
  PocGameBootstrapInputV1,
  PocRejectionReasonV1,
} from "../../contracts/types.js";
import {
  deepFreezePocValueV1,
  parseDayIndex,
  parseNonNegativeSafeInteger,
} from "../../contracts/values.js";
import type { CalendarPhase } from "../../contracts/ids.js";
import {
  pocCalendarDependencyPortsSchemaV1,
  pocCalendarInvariantV1,
  pocCalendarOwnerOperationSchemaV1,
  pocCalendarOwnerProposalSchemaV1,
  pocCalendarStateSchemaV1,
  pocCalendarStatesEqualV1,
} from "./contract.js";
import type {
  PocCalendarDependencyPortsV1,
  PocCalendarGameplayFactV1,
  PocCalendarOwnerOperationV1,
  PocCalendarOwnerProposalV1,
  PocCalendarReadPortV1,
} from "./contract.js";

type PocCalendarRejectionV1 = Extract<
  PocRejectionReasonV1,
  {
    readonly code:
      | "run.policy_required"
      | "policy.already_chosen"
      | "calendar.invalid_phase"
      | "calendar.insufficient_ap"
      | "calendar.phase_blocked";
  }
>;

type PocCalendarProposalResultV1 =
  | { readonly kind: "proposed"; readonly proposal: PocCalendarOwnerProposalV1 }
  | { readonly kind: "rejected"; readonly rejection: PocRejectionReasonV1 };

function rejectedCalendarProposalV1(
  rejection: PocCalendarRejectionV1,
): PocCalendarProposalResultV1 {
  return deepFreezePocValueV1({ kind: "rejected", rejection });
}

function proposedCalendarChangeV1(
  kind: PocCalendarOwnerOperationV1["kind"],
  before: CalendarStateV1,
  after: CalendarStateV1,
  facts: readonly PocCalendarGameplayFactV1[],
): PocCalendarProposalResultV1 {
  return deepFreezePocValueV1({
    kind: "proposed",
    proposal: pocCalendarOwnerProposalSchemaV1.parse({
      payload: { kind, before, after },
      facts,
    }),
  });
}

function invalidPhaseRejectionV1(
  actual: CalendarPhase,
  allowed: CalendarPhase,
): PocCalendarProposalResultV1 {
  return rejectedCalendarProposalV1({
    code: "calendar.invalid_phase",
    details: { actual, allowed: deepFreezePocValueV1([allowed]) },
  });
}

function nextCalendarPhaseV1(phase: CalendarPhase): CalendarPhase {
  if (phase === "morning") return "afternoon";
  if (phase === "afternoon") return "evening";
  return "morning";
}

function isExactAdjacentTargetV1(
  state: CalendarStateV1,
  operation: Extract<PocCalendarOwnerOperationV1, { readonly kind: "calendar.phase.advance" }>,
): boolean {
  if (state.phase === "morning") {
    return operation.to.day === state.day && operation.to.phase === "afternoon";
  }
  if (state.phase === "afternoon") {
    return operation.to.day === state.day && operation.to.phase === "evening";
  }
  return (
    state.day < Number.MAX_SAFE_INTEGER &&
    operation.to.day === state.day + 1 &&
    operation.to.phase === "morning"
  );
}

export function createInitialPocCalendarStateV1(
  _bootstrap: DeepReadonly<PocGameBootstrapInputV1>,
): CalendarStateV1 {
  return pocCalendarStateSchemaV1.parse({
    day: parseDayIndex(1),
    phase: "morning",
    lifePolicyId: null,
    apRemaining: parseNonNegativeSafeInteger(0),
    eveningResolved: false,
  });
}

export function createPocCalendarReadPortV1(
  stateValue: DeepReadonly<CalendarStateV1>,
): PocCalendarReadPortV1 {
  const state = pocCalendarStateSchemaV1.parse(stateValue);
  return pocCalendarStateSchemaV1.parse({
    day: state.day,
    phase: state.phase,
    lifePolicyId: state.lifePolicyId,
    apRemaining: state.apRemaining,
    eveningResolved: state.eveningResolved,
  });
}

export const pocCalendarOwnerV1: ModuleOwnerCapabilityV1<
  CalendarStateV1,
  PocCalendarOwnerOperationV1,
  PocCalendarOwnerProposalV1,
  PocRejectionReasonV1,
  PocCalendarDependencyPortsV1
> = Object.freeze({
  propose(
    stateValue: DeepReadonly<CalendarStateV1>,
    operationValue: DeepReadonly<PocCalendarOwnerOperationV1>,
    dependenciesValue: PocCalendarDependencyPortsV1,
  ): PocCalendarProposalResultV1 {
    const state = pocCalendarStateSchemaV1.parse(stateValue);
    const operation = pocCalendarOwnerOperationSchemaV1.parse(operationValue);
    const dependencies = pocCalendarDependencyPortsSchemaV1.parse(dependenciesValue);

    if (operation.kind === "calendar.policy.choose") {
      if (state.lifePolicyId !== null) {
        return rejectedCalendarProposalV1({
          code: "policy.already_chosen",
          details: { policyId: state.lifePolicyId },
        });
      }
      const after = pocCalendarStateSchemaV1.parse({
        ...state,
        lifePolicyId: operation.policyId,
        apRemaining: dependencies.policyAp,
      });
      return proposedCalendarChangeV1(operation.kind, state, after, [
        {
          kind: "policy.chosen",
          policyId: operation.policyId,
          apRemaining: dependencies.policyAp,
        },
      ]);
    }

    if (operation.kind === "calendar.ap.adjust") {
      if (operation.delta < 0) {
        const required = parseNonNegativeSafeInteger(0 - operation.delta);
        if (required > state.apRemaining) {
          return rejectedCalendarProposalV1({
            code: "calendar.insufficient_ap",
            details: { required, available: state.apRemaining },
          });
        }
      } else if (state.apRemaining > Number.MAX_SAFE_INTEGER - operation.delta) {
        throw new TypeError("Calendar AP adjustment exceeds safe integer bounds");
      }
      const nextAp = parseNonNegativeSafeInteger(state.apRemaining + operation.delta);
      const after = pocCalendarStateSchemaV1.parse({ ...state, apRemaining: nextAp });
      return proposedCalendarChangeV1(operation.kind, state, after, [
        {
          kind: "calendar.ap_changed",
          value: { before: state.apRemaining, after: nextAp },
          reason: operation.reason,
        },
      ]);
    }

    if (operation.kind === "calendar.debug.set_ap") {
      const after = pocCalendarStateSchemaV1.parse({
        ...state,
        apRemaining: operation.value,
      });
      return proposedCalendarChangeV1(operation.kind, state, after, [
        {
          kind: "calendar.ap_changed",
          value: { before: state.apRemaining, after: operation.value },
          reason: operation.reason,
        },
      ]);
    }

    if (operation.kind === "calendar.evening.resolve") {
      if (state.phase !== "evening") {
        return invalidPhaseRejectionV1(state.phase, "evening");
      }
      const after = pocCalendarStateSchemaV1.parse({ ...state, eveningResolved: true });
      return proposedCalendarChangeV1(operation.kind, state, after, []);
    }

    if (operation.terminalLocked) {
      return rejectedCalendarProposalV1({
        code: "calendar.phase_blocked",
        details: { blocker: "levy_due" },
      });
    }
    if (state.lifePolicyId === null) {
      return rejectedCalendarProposalV1({
        code: "run.policy_required",
        details: { commandKind: "calendar.advance_phase" },
      });
    }
    const allowedPhase = nextCalendarPhaseV1(state.phase);
    if (!isExactAdjacentTargetV1(state, operation)) {
      return invalidPhaseRejectionV1(state.phase, allowedPhase);
    }
    if (state.phase === "evening" && !state.eveningResolved) {
      return rejectedCalendarProposalV1({
        code: "calendar.phase_blocked",
        details: { blocker: "evening_unresolved" },
      });
    }
    const after = pocCalendarStateSchemaV1.parse({
      ...state,
      day: operation.to.day,
      phase: operation.to.phase,
      apRemaining: dependencies.policyAp,
      eveningResolved: false,
    });
    return proposedCalendarChangeV1(operation.kind, state, after, [
      {
        kind: "calendar.phase_advanced",
        from: { day: state.day, phase: state.phase },
        to: operation.to,
        apRemaining: dependencies.policyAp,
        expiredAuraIds: operation.expiredAuraIds,
      },
    ]);
  },
  apply(
    stateValue: DeepReadonly<CalendarStateV1>,
    proposalValue: DeepReadonly<PocCalendarOwnerProposalV1>,
  ): CalendarStateV1 {
    const state = pocCalendarStateSchemaV1.parse(stateValue);
    const proposal = pocCalendarOwnerProposalSchemaV1.parse(proposalValue);
    if (!pocCalendarStatesEqualV1(state, proposal.payload.before)) {
      throw new TypeError("stale Calendar owner proposal");
    }
    return pocCalendarStateSchemaV1.parse(proposal.payload.after);
  },
});

const definedPocCalendarGameplayModuleV1 = definePocGameplayModuleV1({
  bindingKind: "stateful" as const,
  descriptor: descriptorForPocModuleV1("calendar"),
  commandSchema: null,
  querySchema: null,
  queryResultSchema: null,
  stateSchema: pocCalendarStateSchemaV1,
  ownerOperationSchema: pocCalendarOwnerOperationSchemaV1,
  ownerProposalSchema: pocCalendarOwnerProposalSchemaV1,
  localInvariants: [pocCalendarInvariantV1],
  owner: pocCalendarOwnerV1,
  queries: null,
  createInitialState: createInitialPocCalendarStateV1,
  createReadPort: createPocCalendarReadPortV1,
});

export const pocCalendarGameplayModuleV1 = definedPocCalendarGameplayModuleV1 as Omit<
  typeof definedPocCalendarGameplayModuleV1,
  "ownerOperationSchema"
> & {
  readonly ownerOperationSchema: typeof pocCalendarOwnerOperationSchemaV1;
};
