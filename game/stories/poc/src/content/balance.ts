// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  actionIdsV1,
  customerSegmentIdsV1,
  pocTextIdsV1,
  policyIdsV1,
  reasonIdsV1,
  serviceModeIdsV1,
} from "./ids.js";
import { deepFreezePocValueV1, parseDayIndex, pocStoryBalanceSchemaV1 } from "../gameplay/index.js";
import type { DeepReadonly, StoryBalanceV1 } from "../gameplay/index.js";

const pocBalanceReasonIdsV1 = Object.freeze({
  actionPurchase: reasonIdsV1[0],
  actionPrepareFood: reasonIdsV1[1],
  actionRest: reasonIdsV1[2],
  actionFacilityBuild: reasonIdsV1[3],
  recoveryBalancedNight: reasonIdsV1[5],
  recoveryNightOwlNight: reasonIdsV1[6],
  recoveryHeroineNight: reasonIdsV1[7],
  serviceManual: reasonIdsV1[8],
  serviceAssisted: reasonIdsV1[9],
  serviceDelegated: reasonIdsV1[10],
  serviceClosed: reasonIdsV1[11],
  serviceEmergencyClosed: reasonIdsV1[12],
  ledgerPurchase: reasonIdsV1[13],
  ledgerWage: reasonIdsV1[14],
  ledgerOpeningFee: reasonIdsV1[15],
  ledgerRevenue: reasonIdsV1[16],
  ledgerDiscardedFood: reasonIdsV1[17],
  ledgerSpoiledIngredient: reasonIdsV1[18],
  ledgerFacilityBuild: reasonIdsV1[19],
  ledgerWorldActionCost: reasonIdsV1[20],
  ledgerLevy: reasonIdsV1[21],
  obligationLevyForecast: reasonIdsV1[33],
  endingStable: reasonIdsV1[43],
  endingDanger: reasonIdsV1[44],
  endingArrears: reasonIdsV1[45],
  endingReputationCrisis: reasonIdsV1[46],
  unavailableServiceModeLocked: reasonIdsV1[55],
  unavailableHelperLocked: reasonIdsV1[56],
} as const);

export const pocServiceDaysV1 = Object.freeze([1, 2, 3, 4, 5, 6].map((day) => parseDayIndex(day)));

function serviceModeDayGateV1(day: number) {
  return {
    conditions: [{ kind: "calendar.day_at_least" as const, day: parseDayIndex(day) }],
    reasonId: pocBalanceReasonIdsV1.unavailableServiceModeLocked,
  } as const;
}

const pocHelperAvailabilityGateV1 = Object.freeze({
  conditions: Object.freeze([
    Object.freeze({ kind: "tavern.helper_tier_at_least" as const, tier: "apprentice" as const }),
  ]),
  reasonId: pocBalanceReasonIdsV1.unavailableHelperLocked,
});

const noMutuallyExcludedActionsV1 = Object.freeze([]);

function buildPocLifePoliciesV1() {
  return [
    {
      policyId: policyIdsV1[0],
      nameTextId: pocTextIdsV1.policyBalancedName,
      apByPhase: { morning: 2, afternoon: 2, evening: 2 },
      playerNightRecovery: 3,
      nightRecoveryReasonId: pocBalanceReasonIdsV1.recoveryBalancedNight,
    },
    {
      policyId: policyIdsV1[1],
      nameTextId: pocTextIdsV1.policyNightOwlName,
      apByPhase: { morning: 1, afternoon: 2, evening: 3 },
      playerNightRecovery: 2,
      nightRecoveryReasonId: pocBalanceReasonIdsV1.recoveryNightOwlNight,
    },
  ] as const;
}

function buildPocActionCostsV1() {
  return [
    {
      action: "inventory.buy",
      apCost: 1,
      playerStaminaCost: 1,
      heroineStaminaCost: 0,
      reasonId: pocBalanceReasonIdsV1.actionPurchase,
    },
    {
      action: "actor.prepare_food",
      apCost: 1,
      playerStaminaCost: 1,
      heroineStaminaCost: 0,
      reasonId: pocBalanceReasonIdsV1.actionPrepareFood,
    },
    {
      action: "actor.rest",
      apCost: 1,
      playerStaminaCost: 0,
      heroineStaminaCost: 0,
      reasonId: pocBalanceReasonIdsV1.actionRest,
    },
    {
      action: "facility.choose.build",
      apCost: 2,
      playerStaminaCost: 1,
      heroineStaminaCost: 0,
      reasonId: pocBalanceReasonIdsV1.actionFacilityBuild,
    },
  ] as const;
}

function buildPocServiceModesV1() {
  return [
    {
      mode: serviceModeIdsV1[0],
      nameTextId: pocTextIdsV1.serviceModeManualName,
      availability: [serviceModeDayGateV1(1)],
      confirmation: {
        benefitTextIds: [pocTextIdsV1.confirmationBenefitServiceManualControl],
        mutuallyExcludedActionIds: noMutuallyExcludedActionsV1,
        majorRiskTextIds: [pocTextIdsV1.confirmationRiskServiceManualStamina],
      },
      reasonId: pocBalanceReasonIdsV1.serviceManual,
      apCost: 2,
      playerStaminaCost: 3,
      heroineStaminaCost: 3,
      wage: 0,
      baseReceptionCapacity: 10,
      basePreparationPoints: 6,
      teamworkGain: 2,
      preparationPointsPerAction: 4,
    },
    {
      mode: serviceModeIdsV1[1],
      nameTextId: pocTextIdsV1.serviceModeAssistedName,
      availability: [serviceModeDayGateV1(2), pocHelperAvailabilityGateV1],
      confirmation: {
        benefitTextIds: [pocTextIdsV1.confirmationBenefitServiceAssistedCapacity],
        mutuallyExcludedActionIds: noMutuallyExcludedActionsV1,
        majorRiskTextIds: [pocTextIdsV1.confirmationRiskServiceAssistedCost],
      },
      reasonId: pocBalanceReasonIdsV1.serviceAssisted,
      apCost: 1,
      playerStaminaCost: 1,
      heroineStaminaCost: 2,
      wage: 5,
      baseReceptionCapacity: 8,
      basePreparationPoints: 6,
      teamworkGain: 1,
      preparationPointsPerAction: 4,
    },
    {
      mode: serviceModeIdsV1[2],
      nameTextId: pocTextIdsV1.serviceModeDelegatedName,
      availability: [serviceModeDayGateV1(3), pocHelperAvailabilityGateV1],
      confirmation: {
        benefitTextIds: [pocTextIdsV1.confirmationBenefitServiceDelegatedRecovery],
        mutuallyExcludedActionIds: noMutuallyExcludedActionsV1,
        majorRiskTextIds: [pocTextIdsV1.confirmationRiskServiceDelegatedWage],
      },
      reasonId: pocBalanceReasonIdsV1.serviceDelegated,
      apCost: 0,
      playerStaminaCost: 0,
      heroineStaminaCost: 0,
      wage: 7,
      baseReceptionCapacity: 7,
      basePreparationPoints: 7,
      teamworkGain: 0,
      preparationPointsPerAction: 2,
    },
    {
      mode: serviceModeIdsV1[3],
      nameTextId: pocTextIdsV1.serviceModeClosedName,
      availability: [serviceModeDayGateV1(3)],
      confirmation: {
        benefitTextIds: [pocTextIdsV1.confirmationBenefitServiceClosedRecovery],
        mutuallyExcludedActionIds: noMutuallyExcludedActionsV1,
        majorRiskTextIds: [pocTextIdsV1.confirmationRiskServiceClosedIncome],
      },
      reasonId: pocBalanceReasonIdsV1.serviceClosed,
      apCost: 0,
      playerStaminaCost: 0,
      heroineStaminaCost: 0,
      wage: 0,
      baseReceptionCapacity: 0,
      basePreparationPoints: 0,
      teamworkGain: 0,
      preparationPointsPerAction: 0,
    },
  ] as const;
}

function buildPocBaseDemandV1() {
  const demand = [
    [6, 2],
    [5, 3],
    [7, 2],
    [4, 5],
    [3, 7],
    [6, 4],
  ] as const;
  return pocServiceDaysV1.flatMap((day, index) => {
    const line = demand[index];
    if (line === undefined) throw new TypeError(`missing PoC demand row for day ${String(day)}`);
    return [
      { day, segmentId: customerSegmentIdsV1[0], customers: line[0] },
      { day, segmentId: customerSegmentIdsV1[1], customers: line[1] },
    ];
  });
}

export const pocBalanceV1: DeepReadonly<StoryBalanceV1> = deepFreezePocValueV1(
  pocStoryBalanceSchemaV1.parse({
    lifePolicies: buildPocLifePoliciesV1(),
    actionCosts: buildPocActionCostsV1(),
    serviceModes: buildPocServiceModesV1(),
    serviceDays: pocServiceDaysV1,
    baseDemand: buildPocBaseDemandV1(),
    ledgerReasons: {
      purchase: pocBalanceReasonIdsV1.ledgerPurchase,
      serviceWage: pocBalanceReasonIdsV1.ledgerWage,
      openingFee: pocBalanceReasonIdsV1.ledgerOpeningFee,
      revenue: pocBalanceReasonIdsV1.ledgerRevenue,
      discardedFood: pocBalanceReasonIdsV1.ledgerDiscardedFood,
      spoiledIngredient: pocBalanceReasonIdsV1.ledgerSpoiledIngredient,
      facilityBuild: pocBalanceReasonIdsV1.ledgerFacilityBuild,
      worldActionCost: pocBalanceReasonIdsV1.ledgerWorldActionCost,
      levy: pocBalanceReasonIdsV1.ledgerLevy,
    },
    emergencyClosure: {
      reputationPenalty: 1,
      reasonId: pocBalanceReasonIdsV1.serviceEmergencyClosed,
    },
    plannedClosureReasonId: pocBalanceReasonIdsV1.serviceClosed,
    heroineNightRecovery: 3,
    heroineNightRecoveryReasonId: pocBalanceReasonIdsV1.recoveryHeroineNight,
    restRecovery: 3,
    purchaseLineLimit: 5,
    purchaseQuantityPerLineLimit: 99,
    menuRecipeLimit: 2,
    menuPortionsPerRecipeLimit: 99,
    dailyPreparationLimit: 2,
    openingFee: 2,
    levyAmount: 140,
    levyDue: { day: 7, phase: "afternoon" },
    obligationForecast: {
      visibleFrom: { day: 3, phase: "morning" },
      conservativeFrom: { day: 5, phase: "morning" },
      reasonId: pocBalanceReasonIdsV1.obligationLevyForecast,
      recommendations: [
        {
          textId: pocTextIdsV1.obligationRecommendationPersonalService,
          actionId: actionIdsV1[4],
          appliesTo: ["current_gap"],
        },
        {
          textId: pocTextIdsV1.obligationRecommendationCheapMenu,
          actionId: null,
          appliesTo: ["current_gap"],
        },
        {
          textId: pocTextIdsV1.obligationRecommendationAvoidOverbuying,
          actionId: null,
          appliesTo: ["current_gap"],
        },
        {
          textId: pocTextIdsV1.obligationRecommendationCommittedPlanReview,
          actionId: null,
          appliesTo: ["committed_plan_conservative"],
        },
        {
          textId: pocTextIdsV1.obligationRecommendationReplayLedger,
          actionId: null,
          appliesTo: ["final"],
        },
      ],
    },
    endingPolicy: {
      stableMinimumCashAfterLevy: 20,
      stableMinimumReputation: 50,
      stableMinimumBuiltFacilities: 1,
      reputationCrisisBelow: 45,
      stableReasonId: pocBalanceReasonIdsV1.endingStable,
      dangerReasonId: pocBalanceReasonIdsV1.endingDanger,
      arrearsReasonId: pocBalanceReasonIdsV1.endingArrears,
      reputationCrisisReasonId: pocBalanceReasonIdsV1.endingReputationCrisis,
    },
    maxNarrativeStepsPerCommand: 128,
    maxNarrativeCallDepth: 8,
  }),
);
