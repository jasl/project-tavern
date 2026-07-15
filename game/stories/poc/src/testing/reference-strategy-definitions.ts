// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import type { RunId } from "@sillymaker/base";

import { pocReferenceRunIdsV1 } from "../content/identity.js";
import {
  deepFreezePocValueV1,
  parseChoiceId,
  parseDayIndex,
  parseFacilityId,
  parsePolicyId,
  parseQuantity,
  parseRecipeId,
  parseServiceMode,
  type ChoiceId,
  type DayIndex,
  type DeepReadonly,
  type FacilityId,
  type PolicyId,
  type TavernPlanV1,
} from "../gameplay/index.js";

export const pocReferenceStrategyIdsV1 = Object.freeze([
  "strategy.cash_first",
  "strategy.relationship_first",
  "strategy.investigation_first",
  "strategy.full_delegation",
  "strategy.two_closures_recovery",
  "strategy.explicit_failure",
] as const);

export type PocReferenceStrategyIdV1 = (typeof pocReferenceStrategyIdsV1)[number];

export type PocReferencePurchaseTargetV1 = "current" | "current_and_next" | "d4_d5_d6_clue";

export type PocReferenceScheduledActionV1 =
  | { readonly kind: "purchase"; readonly target: PocReferencePurchaseTargetV1 }
  | { readonly kind: "prepare_food" }
  | { readonly kind: "rest" }
  | { readonly kind: "build_facility"; readonly facilityId: FacilityId }
  | { readonly kind: "repair_sign"; readonly choiceId: ChoiceId }
  | { readonly kind: "begin_old_trade_road"; readonly optionId: ChoiceId }
  | { readonly kind: "complete_old_trade_road" };

export type PocReferenceBeforeServiceActionV1 = { readonly kind: "rest" };

export type PocReferencePlanDecisionV1 =
  | { readonly kind: "fixed"; readonly plan: DeepReadonly<TavernPlanV1> }
  | {
      readonly kind: "select_d6_plan_from_war_clue";
      readonly cluePlan: DeepReadonly<TavernPlanV1>;
      readonly noCluePlan: DeepReadonly<TavernPlanV1>;
    };

export interface PocReferenceDayDefinitionV1 {
  readonly day: DayIndex;
  readonly morningActions: readonly DeepReadonly<PocReferenceScheduledActionV1>[];
  readonly afternoonActions: readonly DeepReadonly<PocReferenceScheduledActionV1>[];
  readonly plan: DeepReadonly<PocReferencePlanDecisionV1>;
  readonly beforeServiceActions: readonly DeepReadonly<PocReferenceBeforeServiceActionV1>[];
}

export interface PocReferenceStrategyDefinitionV1 {
  readonly strategyId: PocReferenceStrategyIdV1;
  readonly runId: RunId;
  readonly policyId: PolicyId;
  readonly days: readonly [
    DeepReadonly<PocReferenceDayDefinitionV1>,
    DeepReadonly<PocReferenceDayDefinitionV1>,
    DeepReadonly<PocReferenceDayDefinitionV1>,
    DeepReadonly<PocReferenceDayDefinitionV1>,
    DeepReadonly<PocReferenceDayDefinitionV1>,
    DeepReadonly<PocReferenceDayDefinitionV1>,
  ];
}

const balancedPolicyIdV1 = parsePolicyId("policy.balanced");
const nightOwlPolicyIdV1 = parsePolicyId("policy.night_owl");
const coldStorageIdV1 = parseFacilityId("facility.cold_storage");
const comfortableBedIdV1 = parseFacilityId("facility.comfortable_bed");
const cooperateChoiceIdV1 = parseChoiceId("choice.repair_sign.cooperate");
const declineChoiceIdV1 = parseChoiceId("choice.repair_sign.decline");
const preparedAdventureChoiceIdV1 = parseChoiceId("choice.old_trade_road.prepared");

const recipesV1 = Object.freeze({
  P: parseRecipeId("recipe.grain_root_porridge"),
  B: parseRecipeId("recipe.ale_bread"),
  S: parseRecipeId("recipe.hunter_stew"),
  R: parseRecipeId("recipe.traveler_roast"),
});

function planV1(
  mode: "manual" | "assisted" | "delegated",
  menu: readonly (readonly [keyof typeof recipesV1, number])[],
): DeepReadonly<TavernPlanV1> {
  return deepFreezePocValueV1({
    mode: parseServiceMode(mode),
    menu: menu.map(([recipe, portions]) => ({
      recipeId: recipesV1[recipe],
      portions: parseQuantity(portions),
    })),
  });
}

const closedPlanV1: DeepReadonly<TavernPlanV1> = deepFreezePocValueV1({
  mode: parseServiceMode("closed"),
  menu: [],
});

function fixedV1(plan: DeepReadonly<TavernPlanV1>): DeepReadonly<PocReferencePlanDecisionV1> {
  return deepFreezePocValueV1({ kind: "fixed", plan });
}

function clueDecisionV1(
  cluePlan: DeepReadonly<TavernPlanV1>,
  noCluePlan: DeepReadonly<TavernPlanV1>,
): DeepReadonly<PocReferencePlanDecisionV1> {
  return deepFreezePocValueV1({
    kind: "select_d6_plan_from_war_clue",
    cluePlan,
    noCluePlan,
  });
}

const plan = Object.freeze({
  M1: Object.freeze([
    planV1("manual", [
      ["P", 2],
      ["S", 4],
    ]),
    planV1("manual", [
      ["P", 4],
      ["S", 3],
    ]),
    planV1("manual", [
      ["P", 2],
      ["S", 4],
    ]),
    planV1("manual", [
      ["P", 2],
      ["S", 4],
    ]),
    planV1("manual", [
      ["P", 4],
      ["B", 6],
    ]),
    planV1("manual", [
      ["P", 5],
      ["B", 5],
    ]),
    planV1("manual", [
      ["P", 3],
      ["B", 7],
    ]),
  ]),
  M2: Object.freeze([
    planV1("manual", [["S", 7]]),
    planV1("manual", [["S", 7]]),
    planV1("manual", [
      ["B", 4],
      ["S", 5],
    ]),
    planV1("manual", [
      ["P", 4],
      ["R", 5],
    ]),
    planV1("manual", [
      ["P", 2],
      ["R", 6],
    ]),
    planV1("manual", [
      ["P", 4],
      ["S", 5],
    ]),
    planV1("manual", [
      ["P", 2],
      ["S", 6],
    ]),
  ]),
  A1: Object.freeze([
    planV1("assisted", [
      ["P", 2],
      ["S", 4],
    ]),
    planV1("assisted", [
      ["P", 4],
      ["S", 3],
    ]),
    planV1("assisted", [
      ["P", 2],
      ["S", 4],
    ]),
    planV1("assisted", [
      ["P", 2],
      ["S", 4],
    ]),
    planV1("assisted", [
      ["P", 2],
      ["S", 4],
    ]),
    planV1("assisted", [["S", 5]]),
  ]),
  D1: Object.freeze([
    planV1("delegated", [
      ["P", 1],
      ["S", 4],
    ]),
    planV1("delegated", [
      ["P", 3],
      ["S", 3],
    ]),
    planV1("delegated", [
      ["P", 1],
      ["S", 4],
    ]),
    planV1("delegated", [
      ["P", 1],
      ["S", 4],
    ]),
    planV1("delegated", [
      ["P", 1],
      ["S", 4],
    ]),
    planV1("delegated", [
      ["P", 1],
      ["S", 4],
    ]),
  ]),
  friday: planV1("delegated", [
    ["P", 1],
    ["B", 6],
  ]),
  signD6: planV1("assisted", [
    ["P", 1],
    ["S", 5],
  ]),
  delegatedNoClueD6: planV1("delegated", [
    ["P", 1],
    ["S", 4],
  ]),
  delegatedClueD6: planV1("delegated", [
    ["P", 1],
    ["S", 5],
  ]),
});

const buyCurrentV1 = deepFreezePocValueV1({ kind: "purchase", target: "current" } as const);
const buyCurrentAndNextV1 = deepFreezePocValueV1({
  kind: "purchase",
  target: "current_and_next",
} as const);
const buyD4D5D6ClueV1 = deepFreezePocValueV1({
  kind: "purchase",
  target: "d4_d5_d6_clue",
} as const);
const prepareFoodV1 = deepFreezePocValueV1({ kind: "prepare_food" } as const);
const restV1 = deepFreezePocValueV1({ kind: "rest" } as const);
const completeAdventureV1 = deepFreezePocValueV1({ kind: "complete_old_trade_road" } as const);
const beginPreparedAdventureV1 = deepFreezePocValueV1({
  kind: "begin_old_trade_road",
  optionId: preparedAdventureChoiceIdV1,
} as const);
const buildColdStorageV1 = deepFreezePocValueV1({
  kind: "build_facility",
  facilityId: coldStorageIdV1,
} as const);
const buildComfortableBedV1 = deepFreezePocValueV1({
  kind: "build_facility",
  facilityId: comfortableBedIdV1,
} as const);
const cooperateRepairV1 = deepFreezePocValueV1({
  kind: "repair_sign",
  choiceId: cooperateChoiceIdV1,
} as const);
const declineRepairV1 = deepFreezePocValueV1({
  kind: "repair_sign",
  choiceId: declineChoiceIdV1,
} as const);

function dayV1(
  day: number,
  morningActions: readonly DeepReadonly<PocReferenceScheduledActionV1>[],
  afternoonActions: readonly DeepReadonly<PocReferenceScheduledActionV1>[],
  servicePlan: DeepReadonly<PocReferencePlanDecisionV1>,
  beforeServiceActions: readonly DeepReadonly<PocReferenceBeforeServiceActionV1>[] = [],
): DeepReadonly<PocReferenceDayDefinitionV1> {
  return deepFreezePocValueV1({
    day: parseDayIndex(day),
    morningActions,
    afternoonActions,
    plan: servicePlan,
    beforeServiceActions,
  });
}

function strategyV1(
  strategyId: PocReferenceStrategyIdV1,
  policyId: PolicyId,
  days: PocReferenceStrategyDefinitionV1["days"],
): DeepReadonly<PocReferenceStrategyDefinitionV1> {
  return deepFreezePocValueV1({
    strategyId,
    runId: pocReferenceRunIdsV1[strategyId],
    policyId,
    days,
  });
}

const cashFirstV1 = strategyV1("strategy.cash_first", balancedPolicyIdV1, [
  dayV1(1, [buyCurrentV1, prepareFoodV1], [prepareFoodV1, restV1], fixedV1(plan.M2[0]!)),
  dayV1(2, [buyCurrentV1, prepareFoodV1], [prepareFoodV1, restV1], fixedV1(plan.M2[1]!)),
  dayV1(3, [buyCurrentAndNextV1, prepareFoodV1], [prepareFoodV1, restV1], fixedV1(plan.M2[2]!)),
  dayV1(4, [prepareFoodV1, prepareFoodV1], [buildComfortableBedV1], fixedV1(plan.M2[3]!)),
  dayV1(5, [buyCurrentV1, prepareFoodV1], [prepareFoodV1], fixedV1(plan.M2[4]!)),
  dayV1(6, [buyCurrentV1, prepareFoodV1], [prepareFoodV1], fixedV1(plan.M2[5]!)),
]);

const relationshipFirstV1 = strategyV1("strategy.relationship_first", nightOwlPolicyIdV1, [
  dayV1(1, [buyCurrentV1], [prepareFoodV1], fixedV1(plan.M1[0]!)),
  dayV1(2, [buyCurrentV1], [prepareFoodV1], fixedV1(plan.M1[1]!)),
  dayV1(3, [buyCurrentAndNextV1], [prepareFoodV1, restV1], fixedV1(plan.M1[2]!)),
  dayV1(4, [prepareFoodV1], [buildComfortableBedV1], fixedV1(plan.A1[3]!), [restV1]),
  dayV1(5, [buyCurrentV1], [cooperateRepairV1], fixedV1(plan.friday), [restV1]),
  dayV1(6, [buyCurrentV1], [prepareFoodV1, restV1], fixedV1(plan.signD6)),
]);

const investigationFirstV1 = strategyV1("strategy.investigation_first", balancedPolicyIdV1, [
  dayV1(1, [buyCurrentV1, prepareFoodV1], [restV1], fixedV1(plan.M1[0]!)),
  dayV1(2, [buyCurrentV1, prepareFoodV1], [restV1], fixedV1(plan.M1[1]!)),
  dayV1(3, [buyCurrentV1, prepareFoodV1], [restV1], fixedV1(plan.M1[2]!)),
  dayV1(4, [buyD4D5D6ClueV1, prepareFoodV1], [buildColdStorageV1], fixedV1(plan.A1[3]!), [restV1]),
  dayV1(5, [prepareFoodV1, beginPreparedAdventureV1], [completeAdventureV1], fixedV1(plan.D1[4]!)),
  dayV1(
    6,
    [buyCurrentV1, prepareFoodV1],
    [prepareFoodV1, restV1],
    clueDecisionV1(plan.M2[6]!, plan.M2[5]!),
  ),
]);

const fullDelegationV1 = strategyV1("strategy.full_delegation", balancedPolicyIdV1, [
  dayV1(1, [buyCurrentV1, prepareFoodV1], [], fixedV1(plan.M1[0]!)),
  dayV1(2, [buyCurrentV1, prepareFoodV1], [], fixedV1(plan.A1[1]!)),
  dayV1(3, [buyCurrentV1, prepareFoodV1], [], fixedV1(plan.D1[2]!)),
  dayV1(4, [buyD4D5D6ClueV1, prepareFoodV1], [buildColdStorageV1], fixedV1(plan.D1[3]!)),
  dayV1(5, [prepareFoodV1, beginPreparedAdventureV1], [completeAdventureV1], fixedV1(plan.D1[4]!)),
  dayV1(
    6,
    [buyCurrentV1, prepareFoodV1],
    [prepareFoodV1],
    clueDecisionV1(plan.delegatedClueD6, plan.delegatedNoClueD6),
  ),
]);

const twoClosuresRecoveryV1 = strategyV1("strategy.two_closures_recovery", balancedPolicyIdV1, [
  dayV1(1, [buyCurrentV1, prepareFoodV1], [], fixedV1(plan.M1[0]!)),
  dayV1(2, [buyCurrentV1, prepareFoodV1], [], fixedV1(plan.M1[1]!)),
  dayV1(3, [restV1, restV1], [], fixedV1(closedPlanV1)),
  dayV1(4, [buyCurrentV1, prepareFoodV1], [buildComfortableBedV1], fixedV1(plan.A1[3]!), [restV1]),
  dayV1(5, [], [declineRepairV1], fixedV1(closedPlanV1)),
  dayV1(6, [buyCurrentV1, prepareFoodV1], [prepareFoodV1, restV1], fixedV1(plan.M2[5]!)),
]);

const explicitFailureV1 = strategyV1("strategy.explicit_failure", balancedPolicyIdV1, [
  dayV1(1, [buyCurrentV1, prepareFoodV1], [], fixedV1(plan.M1[0]!)),
  dayV1(2, [buyCurrentV1, prepareFoodV1], [], fixedV1(plan.A1[1]!)),
  dayV1(3, [], [], fixedV1(closedPlanV1)),
  dayV1(4, [buildColdStorageV1], [], fixedV1(closedPlanV1)),
  dayV1(5, [], [declineRepairV1], fixedV1(closedPlanV1)),
  dayV1(6, [], [], fixedV1(closedPlanV1)),
]);

export const pocReferenceStrategyDefinitionsV1 = Object.freeze({
  "strategy.cash_first": cashFirstV1,
  "strategy.relationship_first": relationshipFirstV1,
  "strategy.investigation_first": investigationFirstV1,
  "strategy.full_delegation": fullDelegationV1,
  "strategy.two_closures_recovery": twoClosuresRecoveryV1,
  "strategy.explicit_failure": explicitFailureV1,
} satisfies Readonly<
  Record<PocReferenceStrategyIdV1, DeepReadonly<PocReferenceStrategyDefinitionV1>>
>);
