// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { parseTextId } from "@sillymaker/base";

export const pocSimulationDefinitionTextIdsV1 = Object.freeze({
  characterNarratorName: parseTextId("text.poc.character.narrator.name"),
  characterPlayerName: parseTextId("text.poc.character.player.name"),
  characterHeroineName: parseTextId("text.poc.character.heroine.name"),

  reasonActionPurchase: parseTextId("text.poc.reason.action.purchase"),
  reasonActionPrepareFood: parseTextId("text.poc.reason.action.prepare_food"),
  reasonActionRest: parseTextId("text.poc.reason.action.rest"),
  reasonActionFacilityBuild: parseTextId("text.poc.reason.action.facility_build"),
  reasonActionFacilitySkip: parseTextId("text.poc.reason.action.facility_skip"),
  reasonRecoveryBalancedNight: parseTextId("text.poc.reason.recovery.balanced_night"),
  reasonRecoveryNightOwlNight: parseTextId("text.poc.reason.recovery.night_owl_night"),
  reasonRecoveryHeroineNight: parseTextId("text.poc.reason.recovery.heroine_night"),
  reasonServiceManual: parseTextId("text.poc.reason.service.manual"),
  reasonServiceAssisted: parseTextId("text.poc.reason.service.assisted"),
  reasonServiceDelegated: parseTextId("text.poc.reason.service.delegated"),
  reasonServiceClosed: parseTextId("text.poc.reason.service.closed"),
  reasonServiceEmergencyClosed: parseTextId("text.poc.reason.service.emergency_closed"),
  reasonLedgerPurchase: parseTextId("text.poc.reason.ledger.purchase"),
  reasonLedgerWage: parseTextId("text.poc.reason.ledger.wage"),
  reasonLedgerOpeningFee: parseTextId("text.poc.reason.ledger.opening_fee"),
  reasonLedgerRevenue: parseTextId("text.poc.reason.ledger.revenue"),
  reasonLedgerDiscardedFood: parseTextId("text.poc.reason.ledger.discarded_food"),
  reasonLedgerSpoiledIngredient: parseTextId("text.poc.reason.ledger.spoiled_ingredient"),
  reasonLedgerFacilityBuild: parseTextId("text.poc.reason.ledger.facility_build"),
  reasonLedgerWorldActionCost: parseTextId("text.poc.reason.ledger.world_action_cost"),
  reasonLedgerLevy: parseTextId("text.poc.reason.ledger.levy"),
  reasonModifierColdStorageShelfLife: parseTextId(
    "text.poc.reason.modifier.cold_storage_shelf_life",
  ),
  reasonModifierComfortableBedPlayerRecovery: parseTextId(
    "text.poc.reason.modifier.comfortable_bed_player_recovery",
  ),
  reasonModifierComfortableBedHeroineRecovery: parseTextId(
    "text.poc.reason.modifier.comfortable_bed_heroine_recovery",
  ),
  reasonModifierReputationDemand: parseTextId("text.poc.reason.modifier.reputation_demand"),
  reasonModifierWarClueDemand: parseTextId("text.poc.reason.modifier.war_clue_demand"),
  reasonAuraSignRepaired: parseTextId("text.poc.reason.aura.sign_repaired"),
  reasonAuraHeroineAngry: parseTextId("text.poc.reason.aura.heroine_angry"),
  reasonAuraAdventureStrain: parseTextId("text.poc.reason.aura.adventure_strain"),
  reasonEventTutorialCompleted: parseTextId("text.poc.reason.event.tutorial_completed"),
  reasonEventInvoiceChecked: parseTextId("text.poc.reason.event.invoice_checked"),
  reasonEventHelperUnlocked: parseTextId("text.poc.reason.event.helper_unlocked"),
  reasonObligationLevyForecast: parseTextId("text.poc.reason.obligation.levy_forecast"),
  reasonRelationshipRepairSign: parseTextId("text.poc.reason.relationship.repair_sign"),
  reasonRelationshipRepairSignDeclined: parseTextId(
    "text.poc.reason.relationship.repair_sign_declined",
  ),
  reasonRelationshipRepairSignConflict: parseTextId(
    "text.poc.reason.relationship.repair_sign_conflict",
  ),
  reasonRelationshipApology: parseTextId("text.poc.reason.relationship.apology"),
  reasonInvestigationBegin: parseTextId("text.poc.reason.investigation.begin"),
  reasonInvestigationSetback: parseTextId("text.poc.reason.investigation.setback"),
  reasonInvestigationSuccessWithCost: parseTextId(
    "text.poc.reason.investigation.success_with_cost",
  ),
  reasonInvestigationComplete: parseTextId("text.poc.reason.investigation.complete"),
  reasonInvestigationExceptional: parseTextId("text.poc.reason.investigation.exceptional"),
  reasonEndingStable: parseTextId("text.poc.reason.ending.stable"),
  reasonEndingDanger: parseTextId("text.poc.reason.ending.danger"),
  reasonEndingArrears: parseTextId("text.poc.reason.ending.arrears"),
  reasonEndingReputationCrisis: parseTextId("text.poc.reason.ending.reputation_crisis"),
  reasonUnavailableStoryWindowClosed: parseTextId(
    "text.poc.reason.unavailable.story_window_closed",
  ),
  reasonUnavailableRelationshipResolved: parseTextId(
    "text.poc.reason.unavailable.relationship_resolved",
  ),
  reasonUnavailableInvestigationResolved: parseTextId(
    "text.poc.reason.unavailable.investigation_resolved",
  ),
  reasonUnavailableMutuallyExclusive: parseTextId("text.poc.reason.unavailable.mutually_exclusive"),
  reasonUnavailableHeroineNotAngry: parseTextId("text.poc.reason.unavailable.heroine_not_angry"),
  reasonUnavailableFacilityDecided: parseTextId("text.poc.reason.unavailable.facility_decided"),
  reasonUnavailableTaxNotVisible: parseTextId("text.poc.reason.unavailable.tax_not_visible"),
  reasonUnavailablePolicyNotReady: parseTextId("text.poc.reason.unavailable.policy_not_ready"),
  reasonUnavailableServiceModeLocked: parseTextId(
    "text.poc.reason.unavailable.service_mode_locked",
  ),
  reasonUnavailableHelperLocked: parseTextId("text.poc.reason.unavailable.helper_locked"),
  reasonUnavailableIntellectBRequired: parseTextId(
    "text.poc.reason.unavailable.intellect_b_required",
  ),
  reasonDebugStateOverride: parseTextId("text.poc.reason.debug.state_override"),
  reasonDebugCashAdjustment: parseTextId("text.poc.reason.debug.cash_adjustment"),
  reasonDebugAuraAdjustment: parseTextId("text.poc.reason.debug.aura_adjustment"),
  reasonDebugNarrativeJump: parseTextId("text.poc.reason.debug.narrative_jump"),
  reasonDebugRngOverride: parseTextId("text.poc.reason.debug.rng_override"),

  segmentLocalsName: parseTextId("text.poc.segment.locals.name"),
  segmentTravelersName: parseTextId("text.poc.segment.travelers.name"),
  modifierSourceReputationName: parseTextId("text.poc.modifier_source.reputation.name"),
  modifierSourceWarClueName: parseTextId("text.poc.modifier_source.war_clue.name"),

  actionChooseLifePolicyLabel: parseTextId("text.poc.action.choose_life_policy.label"),
  actionPurchaseLabel: parseTextId("text.poc.action.purchase.label"),
  actionPrepareFoodLabel: parseTextId("text.poc.action.prepare_food.label"),
  actionRestLabel: parseTextId("text.poc.action.rest.label"),
  actionServicePlanLabel: parseTextId("text.poc.action.service_plan.label"),
  actionAdvancePhaseLabel: parseTextId("text.poc.action.advance_phase.label"),
  actionPayLevyLabel: parseTextId("text.poc.action.pay_levy.label"),
  actionFacilityWindowLabel: parseTextId("text.poc.action.facility_window.label"),
  actionRepairSignWithHeroineLabel: parseTextId("text.poc.action.repair_sign_with_heroine.label"),
  actionOldTradeRoadLabel: parseTextId("text.poc.action.old_trade_road.label"),
  actionApologizeToHeroineLabel: parseTextId("text.poc.action.apologize_to_heroine.label"),
} as const);

export const pocSimulationCatalogTextIdsV1 = Object.freeze({
  ingredientCoarseGrainName: parseTextId("text.poc.ingredient.coarse_grain.name"),
  ingredientRootVegetableName: parseTextId("text.poc.ingredient.root_vegetable.name"),
  ingredientAleName: parseTextId("text.poc.ingredient.ale.name"),
  ingredientFreshMeatName: parseTextId("text.poc.ingredient.fresh_meat.name"),
  ingredientHerbName: parseTextId("text.poc.ingredient.herb.name"),
  recipeGrainRootPorridgeName: parseTextId("text.poc.recipe.grain_root_porridge.name"),
  recipeAleBreadName: parseTextId("text.poc.recipe.ale_bread.name"),
  recipeHunterStewName: parseTextId("text.poc.recipe.hunter_stew.name"),
  recipeTravelerRoastName: parseTextId("text.poc.recipe.traveler_roast.name"),
  policyBalancedName: parseTextId("text.poc.policy.balanced.name"),
  policyNightOwlName: parseTextId("text.poc.policy.night_owl.name"),
  serviceModeManualName: parseTextId("text.poc.service_mode.manual.name"),
  serviceModeAssistedName: parseTextId("text.poc.service_mode.assisted.name"),
  serviceModeDelegatedName: parseTextId("text.poc.service_mode.delegated.name"),
  serviceModeClosedName: parseTextId("text.poc.service_mode.closed.name"),
  facilityColdStorageName: parseTextId("text.poc.facility.cold_storage.name"),
  facilityComfortableBedName: parseTextId("text.poc.facility.comfortable_bed.name"),
  auraHeroineAngryName: parseTextId("text.poc.aura.heroine_angry.name"),
  auraTavernSignRepairedName: parseTextId("text.poc.aura.tavern_sign_repaired.name"),
  auraPlayerAdventureStrainName: parseTextId("text.poc.aura.player_adventure_strain.name"),

  choiceSupplierInvoiceIntellectBLabel: parseTextId(
    "text.poc.choice.supplier_invoice.intellect_b.label",
  ),
  choiceSupplierInvoicePayNormallyLabel: parseTextId(
    "text.poc.choice.supplier_invoice.pay_normally.label",
  ),
  choiceRepairSignCooperateLabel: parseTextId("text.poc.choice.repair_sign.cooperate.label"),
  choiceRepairSignDeclineLabel: parseTextId("text.poc.choice.repair_sign.decline.label"),
  choiceRepairSignConflictLabel: parseTextId("text.poc.choice.repair_sign.conflict.label"),
  choiceOldTradeRoadBasicLabel: parseTextId("text.poc.choice.old_trade_road.basic.label"),
  choiceOldTradeRoadPreparedLabel: parseTextId("text.poc.choice.old_trade_road.prepared.label"),
  choiceFacilitySkipLabel: parseTextId("text.poc.choice.facility.skip.label"),

  endingStableName: parseTextId("text.poc.ending.stable.name"),
  endingDangerName: parseTextId("text.poc.ending.danger.name"),
  endingFailedArrearsName: parseTextId("text.poc.ending.failed_arrears.name"),
  obligationRecommendationPersonalService: parseTextId(
    "text.poc.obligation.recommendation.personal_service",
  ),
  obligationRecommendationCheapMenu: parseTextId("text.poc.obligation.recommendation.cheap_menu"),
  obligationRecommendationAvoidOverbuying: parseTextId(
    "text.poc.obligation.recommendation.avoid_overbuying",
  ),
  obligationRecommendationCommittedPlanReview: parseTextId(
    "text.poc.obligation.recommendation.committed_plan_review",
  ),
  obligationRecommendationReplayLedger: parseTextId(
    "text.poc.obligation.recommendation.replay_ledger",
  ),

  narrativeManifestStartCard: parseTextId("text.poc.narrative.manifest_start.card"),
  narrativeFacilityWindowNotice: parseTextId("text.poc.narrative.facility_window.notice"),
  narrativeLevyDueNotice: parseTextId("text.poc.narrative.levy_due.notice"),
  narrativeRepairSignIntro: parseTextId("text.poc.narrative.repair_sign.intro"),
  narrativeApologyLine: parseTextId("text.poc.narrative.apology.line"),
  narrativeOldTradeRoadDepartureLine: parseTextId(
    "text.poc.narrative.old_trade_road.departure.line",
  ),
  narrativeOldTradeRoadInvestigationLine: parseTextId(
    "text.poc.narrative.old_trade_road.investigation.line",
  ),
} as const);

export const pocSimulationConfirmationTextIdsV1 = Object.freeze({
  confirmationBenefitPurchaseStock: parseTextId("text.poc.confirmation.benefit.purchase_stock"),
  confirmationRiskPurchaseCash: parseTextId("text.poc.confirmation.risk.purchase_cash"),
  confirmationBenefitPrepareFood: parseTextId("text.poc.confirmation.benefit.prepare_food"),
  confirmationRiskPrepareFoodStamina: parseTextId(
    "text.poc.confirmation.risk.prepare_food_stamina",
  ),
  confirmationBenefitRestRecovery: parseTextId("text.poc.confirmation.benefit.rest_recovery"),
  confirmationRiskRestTime: parseTextId("text.poc.confirmation.risk.rest_time"),
  confirmationBenefitServiceManualControl: parseTextId(
    "text.poc.confirmation.benefit.service_manual_control",
  ),
  confirmationRiskServiceManualStamina: parseTextId(
    "text.poc.confirmation.risk.service_manual_stamina",
  ),
  confirmationBenefitServiceAssistedCapacity: parseTextId(
    "text.poc.confirmation.benefit.service_assisted_capacity",
  ),
  confirmationRiskServiceAssistedCost: parseTextId(
    "text.poc.confirmation.risk.service_assisted_cost",
  ),
  confirmationBenefitServiceDelegatedRecovery: parseTextId(
    "text.poc.confirmation.benefit.service_delegated_recovery",
  ),
  confirmationRiskServiceDelegatedWage: parseTextId(
    "text.poc.confirmation.risk.service_delegated_wage",
  ),
  confirmationBenefitServiceClosedRecovery: parseTextId(
    "text.poc.confirmation.benefit.service_closed_recovery",
  ),
  confirmationRiskServiceClosedIncome: parseTextId(
    "text.poc.confirmation.risk.service_closed_income",
  ),
  confirmationBenefitColdStorageShelfLife: parseTextId(
    "text.poc.confirmation.benefit.cold_storage_shelf_life",
  ),
  confirmationRiskColdStorageCost: parseTextId("text.poc.confirmation.risk.cold_storage_cost"),
  confirmationBenefitComfortableBedRecovery: parseTextId(
    "text.poc.confirmation.benefit.comfortable_bed_recovery",
  ),
  confirmationRiskComfortableBedCost: parseTextId(
    "text.poc.confirmation.risk.comfortable_bed_cost",
  ),
  confirmationBenefitFacilityBuildPermanent: parseTextId(
    "text.poc.confirmation.benefit.facility_build_permanent",
  ),
  confirmationRiskFacilityExclusiveChoice: parseTextId(
    "text.poc.confirmation.risk.facility_exclusive_choice",
  ),
  confirmationBenefitFacilitySkipCash: parseTextId(
    "text.poc.confirmation.benefit.facility_skip_cash",
  ),
  confirmationRiskFacilitySkipOpportunity: parseTextId(
    "text.poc.confirmation.risk.facility_skip_opportunity",
  ),
  confirmationBenefitRepairSignRelationship: parseTextId(
    "text.poc.confirmation.benefit.repair_sign_relationship",
  ),
  confirmationRiskRepairSignConflict: parseTextId(
    "text.poc.confirmation.risk.repair_sign_conflict",
  ),
  confirmationBenefitApologyReconcile: parseTextId(
    "text.poc.confirmation.benefit.apology_reconcile",
  ),
  confirmationRiskApologyWindow: parseTextId("text.poc.confirmation.risk.apology_window"),
  confirmationBenefitOldTradeRoadClue: parseTextId(
    "text.poc.confirmation.benefit.old_trade_road_clue",
  ),
  confirmationRiskOldTradeRoadCost: parseTextId("text.poc.confirmation.risk.old_trade_road_cost"),
  confirmationBenefitOldTradeRoadPrepared: parseTextId(
    "text.poc.confirmation.benefit.old_trade_road_prepared",
  ),
  confirmationRiskOldTradeRoadPreparedCost: parseTextId(
    "text.poc.confirmation.risk.old_trade_road_prepared_cost",
  ),
  confirmationBenefitInvoiceInspect: parseTextId("text.poc.confirmation.benefit.invoice_inspect"),
  confirmationRiskInvoicePayment: parseTextId("text.poc.confirmation.risk.invoice_payment"),
  confirmationBenefitBalancedPolicy: parseTextId("text.poc.confirmation.benefit.balanced_policy"),
  confirmationRiskBalancedPolicy: parseTextId("text.poc.confirmation.risk.balanced_policy"),
  confirmationBenefitNightOwlPolicy: parseTextId("text.poc.confirmation.benefit.night_owl_policy"),
  confirmationRiskNightOwlPolicy: parseTextId("text.poc.confirmation.risk.night_owl_policy"),
} as const);

export const pocSimulationTextIdsV1 = Object.freeze({
  ...pocSimulationDefinitionTextIdsV1,
  ...pocSimulationCatalogTextIdsV1,
  ...pocSimulationConfirmationTextIdsV1,
});
