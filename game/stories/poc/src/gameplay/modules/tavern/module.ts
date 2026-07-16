// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly, ModuleOwnerCapabilityV1 } from "@sillymaker/base";

import { definePocGameplayModuleV1 } from "../../contracts/define-poc-gameplay-module.js";
import { descriptorForPocModuleV1 } from "../../contracts/module-catalog.js";
import type {
  PocGameBootstrapInputV1,
  PocRejectionReasonV1,
  ServiceHistoryEntryV1,
  TavernStateV1,
} from "../../contracts/types.js";
import {
  deepFreezePocValueV1,
  parseNonNegativeSafeInteger,
  parseSafeInteger,
} from "../../contracts/values.js";
import type { NonNegativeSafeInteger, SafeInteger } from "../../contracts/values.js";
import {
  assertValidInitialPocTavernStateV1,
  pocTavernDependencyPortsSchemaV1,
  pocTavernInvariantV1,
  pocTavernOwnerOperationSchemaV1,
  pocTavernOwnerProposalSchemaV1,
  pocTavernStateSchemaV1,
  pocTavernStatesEqualV1,
} from "./contract.js";
import type {
  PocTavernDependencyPortsV1,
  PocTavernGameplayFactV1,
  PocTavernOwnerOperationV1,
  PocTavernOwnerProposalV1,
  PocTavernPlanDependenciesV1,
  PocTavernPreparationDependenciesV1,
  PocTavernReadPortV1,
} from "./contract.js";

type PocTavernProposalResultV1 =
  | { readonly kind: "proposed"; readonly proposal: PocTavernOwnerProposalV1 }
  | { readonly kind: "rejected"; readonly rejection: PocRejectionReasonV1 };

type PocTavernOwnerRejectionV1 = Extract<
  PocRejectionReasonV1,
  {
    readonly code:
      | "tavern.preparation_limit_reached"
      | "tavern.invalid_plan"
      | "tavern.plan_frozen"
      | "tavern.service_unavailable";
  }
>;

function proposedTavernChangeV1(
  kind: PocTavernOwnerOperationV1["kind"],
  before: TavernStateV1,
  after: TavernStateV1,
  facts: readonly PocTavernGameplayFactV1[],
): PocTavernProposalResultV1 {
  return deepFreezePocValueV1({
    kind: "proposed",
    proposal: pocTavernOwnerProposalSchemaV1.parse({
      payload: { kind, before, after },
      facts,
    }),
  });
}

function rejectedTavernChangeV1(rejection: PocTavernOwnerRejectionV1): PocTavernProposalResultV1 {
  return deepFreezePocValueV1({ kind: "rejected", rejection });
}

function assertValidTavernStateV1(state: TavernStateV1, label: string): void {
  const violations = pocTavernInvariantV1.check(state, createPocTavernReadPortV1(state));
  if (violations.length !== 0) throw new TypeError(`${label} violates Tavern invariants`);
}

function saturatingReputationAddV1(
  current: NonNegativeSafeInteger,
  delta: SafeInteger,
): NonNegativeSafeInteger {
  if (delta < 0 && current < 0 - delta) return parseNonNegativeSafeInteger(0);
  if (delta > 0 && current > Number.MAX_SAFE_INTEGER - delta) {
    return parseNonNegativeSafeInteger(Number.MAX_SAFE_INTEGER);
  }
  return parseNonNegativeSafeInteger(current + delta);
}

function checkedNonNegativeAddV1(left: number, right: number, label: string): number {
  if (
    !Number.isSafeInteger(left) ||
    !Number.isSafeInteger(right) ||
    left < 0 ||
    right < 0 ||
    left > Number.MAX_SAFE_INTEGER - right
  ) {
    throw new TypeError(`${label} exceeds safe integer bounds`);
  }
  return left + right;
}

function checkedNonNegativeProductV1(left: number, right: number, label: string): number {
  if (
    !Number.isSafeInteger(left) ||
    !Number.isSafeInteger(right) ||
    left < 0 ||
    right < 0 ||
    (left !== 0 && right > Math.floor(Number.MAX_SAFE_INTEGER / left))
  ) {
    throw new TypeError(`${label} exceeds safe integer bounds`);
  }
  return left * right;
}

function invalidPlanV1(
  reason: Extract<
    PocTavernOwnerRejectionV1,
    { readonly code: "tavern.invalid_plan" }
  >["details"]["reason"],
): PocTavernProposalResultV1 {
  return rejectedTavernChangeV1({ code: "tavern.invalid_plan", details: { reason } });
}

function assertPlanContextV1(
  operation: Extract<PocTavernOwnerOperationV1, { readonly kind: "tavern.plan.set" }>,
  dependencies: PocTavernPlanDependenciesV1,
  preparationDay: TavernStateV1["preparation"]["day"],
): void {
  if (dependencies.day !== preparationDay) {
    throw new TypeError("Tavern plan day does not match current preparation day");
  }
  if (operation.plan.mode !== dependencies.mode) {
    throw new TypeError("Tavern plan mode does not match its dependency context");
  }
  if (
    operation.reason.kind !== "command" ||
    operation.reason.commandKind !== "tavern.plan.set" ||
    operation.reason.reasonId !== dependencies.modeReasonId
  ) {
    throw new TypeError("Tavern plan reason does not match its service mode context");
  }
}

function validatePlanV1(
  state: TavernStateV1,
  operation: Extract<PocTavernOwnerOperationV1, { readonly kind: "tavern.plan.set" }>,
  dependencies: PocTavernPlanDependenciesV1,
): PocTavernProposalResultV1 | null {
  assertPlanContextV1(operation, dependencies, state.preparation.day);
  if (dependencies.phase === "evening") {
    return rejectedTavernChangeV1({
      code: "tavern.plan_frozen",
      details: { day: dependencies.day, phase: dependencies.phase },
    });
  }
  if (dependencies.unavailableReasonId !== null) {
    return rejectedTavernChangeV1({
      code: "tavern.service_unavailable",
      details: { mode: operation.plan.mode, reasonId: dependencies.unavailableReasonId },
    });
  }

  const { menu, mode } = operation.plan;
  if (menu.length > Math.min(16, dependencies.menuRecipeLimit)) {
    return invalidPlanV1("menu_size");
  }
  if (mode === "closed" && menu.length !== 0) return invalidPlanV1("closed_has_menu");
  if (mode !== "closed" && menu.length === 0) return invalidPlanV1("open_has_no_menu");

  const recipeIds = new Set<string>();
  for (const line of menu) {
    if (recipeIds.has(line.recipeId)) return invalidPlanV1("duplicate_recipe");
    recipeIds.add(line.recipeId);
  }
  const recipeById = new Map(
    dependencies.recipes.map((recipe) => [recipe.recipeId, recipe] as const),
  );
  if (menu.some((line) => !recipeById.has(line.recipeId))) {
    return invalidPlanV1("unknown_recipe");
  }
  const unlocked = new Set(state.unlockedRecipeIds);
  if (menu.some((line) => !unlocked.has(line.recipeId))) {
    return invalidPlanV1("locked_recipe");
  }
  if (menu.some((line) => line.portions > dependencies.menuPortionsPerRecipeLimit)) {
    return invalidPlanV1("portion_limit");
  }

  let portions = 0;
  for (const line of menu) {
    portions = checkedNonNegativeAddV1(portions, line.portions, "Tavern menu portions");
  }
  if (portions > dependencies.receptionCapacity) return invalidPlanV1("capacity");

  let preparationPoints = 0;
  for (const line of menu) {
    const recipe = recipeById.get(line.recipeId);
    if (recipe === undefined) throw new TypeError("Tavern recipe validation diverged");
    const linePoints = checkedNonNegativeProductV1(
      line.portions,
      recipe.prepPoints,
      "Tavern recipe preparation points",
    );
    preparationPoints = checkedNonNegativeAddV1(
      preparationPoints,
      linePoints,
      "Tavern plan preparation points",
    );
  }
  return preparationPoints > dependencies.preparationCapacity
    ? invalidPlanV1("preparation_capacity")
    : null;
}

function proposePlanV1(
  state: TavernStateV1,
  operation: Extract<PocTavernOwnerOperationV1, { readonly kind: "tavern.plan.set" }>,
  dependencies: PocTavernPlanDependenciesV1,
): PocTavernProposalResultV1 {
  const rejection = validatePlanV1(state, operation, dependencies);
  if (rejection !== null) return rejection;
  const after = pocTavernStateSchemaV1.parse({ ...state, servicePlan: operation.plan });
  return proposedTavernChangeV1(operation.kind, state, after, [
    { kind: "tavern.plan_set", plan: operation.plan, reason: operation.reason },
  ]);
}

function proposePreparationIncrementV1(
  state: TavernStateV1,
  operation: Extract<PocTavernOwnerOperationV1, { readonly kind: "tavern.preparation.increment" }>,
  dependencies: PocTavernPreparationDependenciesV1,
): PocTavernProposalResultV1 {
  if (operation.day !== state.preparation.day) {
    throw new TypeError("Tavern preparation increment day does not match current preparation");
  }
  if (state.preparation.actionCount >= dependencies.dailyPreparationLimit) {
    return rejectedTavernChangeV1({
      code: "tavern.preparation_limit_reached",
      details: {
        current: state.preparation.actionCount,
        limit: dependencies.dailyPreparationLimit,
      },
    });
  }
  const actionCount = parseNonNegativeSafeInteger(
    checkedNonNegativeAddV1(state.preparation.actionCount, 1, "Tavern preparation count"),
  );
  const after = pocTavernStateSchemaV1.parse({
    ...state,
    preparation: { day: operation.day, actionCount },
  });
  return proposedTavernChangeV1(operation.kind, state, after, [
    {
      kind: "food.prepared",
      day: operation.day,
      actionCount,
      reason: {
        kind: "command",
        commandKind: "actor.prepare_food",
        reasonId: dependencies.prepareFoodReasonId,
      },
    },
  ]);
}

function serviceHistoryDayV1(history: ServiceHistoryEntryV1): number {
  return history.kind === "opening" ? history.opening.day : history.closure.day;
}

function serviceHistoryReputationAfterV1(history: ServiceHistoryEntryV1): number {
  return history.kind === "opening"
    ? history.opening.reputation.after
    : history.closure.reputation.after;
}

function serviceHistoryFactV1(history: ServiceHistoryEntryV1): Extract<
  PocTavernGameplayFactV1,
  {
    readonly kind: "opening.finalized" | "tavern.planned_closed" | "tavern.emergency_closed";
  }
> {
  if (history.kind === "opening") {
    return deepFreezePocValueV1({ kind: "opening.finalized", ledger: history.opening });
  }
  return history.closure.kind === "planned"
    ? deepFreezePocValueV1({ kind: "tavern.planned_closed", closure: history.closure })
    : deepFreezePocValueV1({ kind: "tavern.emergency_closed", closure: history.closure });
}

function proposeServiceHistoryAppendV1(
  state: TavernStateV1,
  operation: Extract<PocTavernOwnerOperationV1, { readonly kind: "tavern.service_history.append" }>,
): PocTavernProposalResultV1 {
  if (serviceHistoryDayV1(operation.history) !== state.preparation.day) {
    throw new TypeError("Tavern service history day must match the current preparation day");
  }
  if (serviceHistoryReputationAfterV1(operation.history) !== state.reputation) {
    throw new TypeError("Tavern service history reputation must match current Tavern reputation");
  }
  if (operation.history.kind === "opening") {
    const opening = operation.history.opening;
    if (
      state.servicePlan === null ||
      state.servicePlan.mode === "closed" ||
      state.servicePlan.mode !== opening.mode ||
      state.servicePlan.menu.length !== opening.menu.length ||
      state.servicePlan.menu.some((line, index) => {
        const recorded = opening.menu[index];
        return (
          recorded === undefined ||
          line.recipeId !== recorded.recipeId ||
          line.portions !== recorded.portions
        );
      })
    ) {
      throw new TypeError("Tavern Opening history must match the frozen open service plan");
    }
  } else if (
    operation.history.closure.kind === "planned" &&
    (state.servicePlan === null ||
      state.servicePlan.mode !== "closed" ||
      state.servicePlan.menu.length !== 0)
  ) {
    throw new TypeError("Tavern planned closure requires a closed service plan");
  } else if (
    operation.history.closure.kind === "emergency" &&
    state.servicePlan?.mode === "closed"
  ) {
    throw new TypeError("Tavern emergency closure cannot replace a planned closed service");
  }
  const previous = state.serviceHistory.at(-1);
  if (
    previous !== undefined &&
    serviceHistoryDayV1(operation.history) <= serviceHistoryDayV1(previous)
  ) {
    throw new TypeError("Tavern service history must append in strictly increasing day order");
  }
  const after = pocTavernStateSchemaV1.parse({
    ...state,
    servicePlan:
      operation.history.kind === "closure" ? { mode: "closed", menu: [] } : state.servicePlan,
    serviceHistory: [...state.serviceHistory, operation.history],
  });
  return proposedTavernChangeV1(operation.kind, state, after, [
    serviceHistoryFactV1(operation.history),
  ]);
}

function unreachableTavernOperationV1(operation: never): never {
  throw new TypeError(`unsupported Tavern owner operation ${String(operation)}`);
}

export function createPocTavernReadPortV1(
  stateValue: DeepReadonly<TavernStateV1>,
): PocTavernReadPortV1 {
  return pocTavernStateSchemaV1.parse(stateValue);
}

export const pocTavernOwnerV1: ModuleOwnerCapabilityV1<
  TavernStateV1,
  PocTavernOwnerOperationV1,
  PocTavernOwnerProposalV1,
  PocRejectionReasonV1,
  PocTavernDependencyPortsV1
> = Object.freeze({
  propose(
    stateValue: DeepReadonly<TavernStateV1>,
    operationValue: DeepReadonly<PocTavernOwnerOperationV1>,
    dependenciesValue: PocTavernDependencyPortsV1,
  ): PocTavernProposalResultV1 {
    const state = pocTavernStateSchemaV1.parse(stateValue);
    assertValidTavernStateV1(state, "Tavern State");
    const operation = pocTavernOwnerOperationSchemaV1.parse(operationValue);
    const dependencies = pocTavernDependencyPortsSchemaV1.parse(dependenciesValue);
    if (operation.kind !== dependencies.kind) {
      throw new TypeError("Tavern operation and dependency kinds do not match");
    }

    if (operation.kind === "tavern.reputation.adjust") {
      if (dependencies.kind !== operation.kind) throw new TypeError("Tavern dependency mismatch");
      const reputation = saturatingReputationAddV1(state.reputation, operation.delta);
      const actualDelta = parseSafeInteger(reputation - state.reputation);
      const after = pocTavernStateSchemaV1.parse({ ...state, reputation });
      return proposedTavernChangeV1(operation.kind, state, after, [
        {
          kind: "reputation.changed",
          value: { before: state.reputation, after: reputation },
          delta: actualDelta,
          reason: operation.reason,
        },
      ]);
    }
    if (operation.kind === "tavern.helper.set") {
      if (dependencies.kind !== operation.kind) throw new TypeError("Tavern dependency mismatch");
      const after = pocTavernStateSchemaV1.parse({ ...state, helper: operation.helper });
      return proposedTavernChangeV1(operation.kind, state, after, [
        {
          kind: "tavern.helper_changed",
          value: { before: state.helper, after: operation.helper },
          reason: operation.reason,
        },
      ]);
    }
    if (operation.kind === "tavern.plan.set") {
      if (dependencies.kind !== operation.kind) throw new TypeError("Tavern dependency mismatch");
      return proposePlanV1(state, operation, dependencies);
    }
    if (operation.kind === "tavern.demand_seeds.set") {
      if (dependencies.kind !== operation.kind) throw new TypeError("Tavern dependency mismatch");
      if (state.demandSeeds.length !== 0 || operation.demandSeeds.length === 0) {
        throw new TypeError("Tavern demand seeds may be installed exactly once");
      }
      const after = pocTavernStateSchemaV1.parse({
        ...state,
        demandSeeds: operation.demandSeeds,
      });
      return proposedTavernChangeV1(operation.kind, state, after, []);
    }
    if (operation.kind === "tavern.current_demand.set") {
      if (dependencies.kind !== operation.kind) throw new TypeError("Tavern dependency mismatch");
      if (operation.currentDemand === null) {
        if (state.currentDemand === null) {
          throw new TypeError("Tavern current demand clear requires materialized demand");
        }
        if (state.currentDemand.day >= state.preparation.day) {
          throw new TypeError("Tavern current demand cannot clear during its materialized day");
        }
      } else {
        if (operation.currentDemand.day !== state.preparation.day) {
          throw new TypeError("Tavern current demand day does not match current preparation day");
        }
        if (
          state.currentDemand !== null &&
          operation.currentDemand.day <= state.currentDemand.day
        ) {
          throw new TypeError("Tavern current demand cannot be rematerialized or moved backward");
        }
      }
      const after = pocTavernStateSchemaV1.parse({
        ...state,
        currentDemand: operation.currentDemand,
      });
      return proposedTavernChangeV1(
        operation.kind,
        state,
        after,
        operation.currentDemand === null
          ? []
          : [{ kind: "demand.materialized", demand: operation.currentDemand }],
      );
    }
    if (operation.kind === "tavern.preparation.increment") {
      if (dependencies.kind !== operation.kind) throw new TypeError("Tavern dependency mismatch");
      return proposePreparationIncrementV1(state, operation, dependencies);
    }
    if (operation.kind === "tavern.preparation.reset") {
      if (dependencies.kind !== operation.kind) throw new TypeError("Tavern dependency mismatch");
      if (
        state.preparation.day === Number.MAX_SAFE_INTEGER ||
        operation.day !== state.preparation.day + 1
      ) {
        throw new TypeError("Tavern preparation reset must advance to the next day");
      }
      const after = pocTavernStateSchemaV1.parse({
        ...state,
        preparation: { day: operation.day, actionCount: parseNonNegativeSafeInteger(0) },
        servicePlan: null,
      });
      return proposedTavernChangeV1(operation.kind, state, after, []);
    }
    if (operation.kind === "tavern.service_history.append") {
      if (dependencies.kind !== operation.kind) throw new TypeError("Tavern dependency mismatch");
      return proposeServiceHistoryAppendV1(state, operation);
    }
    return unreachableTavernOperationV1(operation);
  },

  apply(
    stateValue: DeepReadonly<TavernStateV1>,
    proposalValue: DeepReadonly<PocTavernOwnerProposalV1>,
  ): TavernStateV1 {
    const state = pocTavernStateSchemaV1.parse(stateValue);
    assertValidTavernStateV1(state, "Tavern State");
    const proposal = pocTavernOwnerProposalSchemaV1.parse(proposalValue);
    if (!pocTavernStatesEqualV1(state, proposal.payload.before)) {
      throw new TypeError("stale Tavern owner proposal");
    }
    assertValidTavernStateV1(proposal.payload.after, "Tavern proposal");
    return pocTavernStateSchemaV1.parse(proposal.payload.after);
  },
});

function definePocTavernGameplayModuleV1(initialStateValue: DeepReadonly<TavernStateV1>) {
  const initialState = pocTavernStateSchemaV1.parse(initialStateValue);
  assertValidInitialPocTavernStateV1(initialState);
  return definePocGameplayModuleV1({
    bindingKind: "stateful" as const,
    descriptor: descriptorForPocModuleV1("tavern"),
    commandSchema: null,
    querySchema: null,
    queryResultSchema: null,
    stateSchema: pocTavernStateSchemaV1,
    ownerOperationSchema: pocTavernOwnerOperationSchemaV1,
    ownerProposalSchema: pocTavernOwnerProposalSchemaV1,
    localInvariants: Object.freeze([pocTavernInvariantV1]),
    owner: pocTavernOwnerV1,
    queries: null,
    createInitialState(_bootstrap: DeepReadonly<PocGameBootstrapInputV1>): TavernStateV1 {
      return pocTavernStateSchemaV1.parse(initialState);
    },
    createReadPort: createPocTavernReadPortV1,
  });
}

export type PocTavernGameplayModuleV1 = ReturnType<typeof definePocTavernGameplayModuleV1>;

export function createPocTavernGameplayModuleV1(
  initialStateValue: DeepReadonly<TavernStateV1>,
): PocTavernGameplayModuleV1 {
  return definePocTavernGameplayModuleV1(initialStateValue);
}
