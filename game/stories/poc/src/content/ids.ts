// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  parseAppearanceLayerId,
  parseAssetId,
  parseCharacterActivityId,
  parseCharacterExpressionId,
  parseCharacterId,
  parseCharacterPoseId,
  parseCharacterRigId,
  parseHitAreaId,
  parseHitMapId,
  parseInteractionBehaviorId,
  parseInteractionSurfaceId,
  parseInteractionTargetId,
  parsePresentationProviderId,
  parseStageSceneId,
  parseStageSceneVariantId,
  parseTextId,
} from "@sillymaker/base";

import {
  parseActionId,
  parseActorId,
  parseAuraId,
  parseCheckBandId,
  parseCheckId,
  parseCheckpointId,
  parseChoiceId,
  parseCustomerSegmentId,
  parseEndingId,
  parseEventId,
  parseFactId,
  parseFacilityId,
  parseIngredientId,
  parseModifierSourceId,
  parseNodeId,
  parseOutcomeId,
  parsePolicyId,
  parseReasonId,
  parseRecipeId,
  parseSceneId,
  parseServiceMode,
  parseStoryToken,
  parseWorldStepId,
} from "../gameplay/index.js";

export const policyIdsV1 = Object.freeze([
  parsePolicyId("policy.balanced"),
  parsePolicyId("policy.night_owl"),
] as const);

export const customerSegmentIdsV1 = Object.freeze([
  parseCustomerSegmentId("segment.locals"),
  parseCustomerSegmentId("segment.travelers"),
] as const);

export const modifierSourceIdsV1 = Object.freeze([
  parseModifierSourceId("modifier_source.reputation"),
  parseModifierSourceId("modifier_source.war_clue"),
] as const);

export const actorIdsV1 = Object.freeze([
  parseActorId("actor.player"),
  parseActorId("actor.heroine"),
] as const);

export const characterIdsV1 = Object.freeze([
  parseCharacterId("character.narrator"),
  parseCharacterId("character.player"),
  parseCharacterId("character.heroine"),
] as const);

export const eventIdsV1 = Object.freeze([
  parseEventId("event.tutorial_first_service"),
  parseEventId("event.supplier_invoice"),
  parseEventId("event.helper_available"),
  parseEventId("event.facility_window"),
  parseEventId("event.levy_due"),
] as const);

export const checkpointIdsV1 = Object.freeze([
  parseCheckpointId("checkpoint.tutorial_first_service"),
  parseCheckpointId("checkpoint.supplier_invoice"),
  parseCheckpointId("checkpoint.helper_available"),
  parseCheckpointId("checkpoint.facility_window"),
  parseCheckpointId("checkpoint.levy_due"),
] as const);

export const actionIdsV1 = Object.freeze([
  parseActionId("action.choose_life_policy"),
  parseActionId("action.purchase"),
  parseActionId("action.prepare_food"),
  parseActionId("action.rest"),
  parseActionId("action.service_plan"),
  parseActionId("action.advance_phase"),
  parseActionId("action.pay_levy"),
  parseActionId("action.facility_window"),
  parseActionId("action.repair_sign_with_heroine"),
  parseActionId("action.old_trade_road"),
  parseActionId("action.apologize_to_heroine"),
] as const);

export const ingredientIdsV1 = Object.freeze([
  parseIngredientId("ingredient.coarse_grain"),
  parseIngredientId("ingredient.root_vegetable"),
  parseIngredientId("ingredient.ale"),
  parseIngredientId("ingredient.fresh_meat"),
  parseIngredientId("ingredient.herb"),
] as const);

export const recipeIdsV1 = Object.freeze([
  parseRecipeId("recipe.grain_root_porridge"),
  parseRecipeId("recipe.ale_bread"),
  parseRecipeId("recipe.hunter_stew"),
  parseRecipeId("recipe.traveler_roast"),
] as const);

export const facilityIdsV1 = Object.freeze([
  parseFacilityId("facility.cold_storage"),
  parseFacilityId("facility.comfortable_bed"),
] as const);

export const auraIdsV1 = Object.freeze([
  parseAuraId("heroine.angry"),
  parseAuraId("tavern.sign_repaired"),
  parseAuraId("player.adventure_strain"),
] as const);

export const choiceIdsV1 = Object.freeze([
  parseChoiceId("choice.supplier_invoice.intellect_b"),
  parseChoiceId("choice.supplier_invoice.pay_normally"),
  parseChoiceId("choice.repair_sign.cooperate"),
  parseChoiceId("choice.repair_sign.decline"),
  parseChoiceId("choice.repair_sign.conflict"),
  parseChoiceId("choice.old_trade_road.basic"),
  parseChoiceId("choice.old_trade_road.prepared"),
] as const);

export const checkIdsV1 = Object.freeze([parseCheckId("check.old_trade_road")] as const);

export const worldStepIdsV1 = Object.freeze([
  parseWorldStepId("step.old_trade_road.departure"),
  parseWorldStepId("step.old_trade_road.investigation"),
] as const);

export const sceneIdsV1 = Object.freeze([
  parseSceneId("scene.manifest_start"),
  parseSceneId("scene.supplier_invoice"),
  parseSceneId("scene.facility_window"),
  parseSceneId("scene.levy_due"),
  parseSceneId("scene.repair_sign_with_heroine"),
  parseSceneId("scene.apologize_to_heroine"),
  parseSceneId("scene.old_trade_road.departure"),
  parseSceneId("scene.old_trade_road.investigation"),
] as const);

export const nodeIdsV1 = Object.freeze([
  parseNodeId("node.manifest_start.card"),
  parseNodeId("node.manifest_start.end"),
  parseNodeId("node.supplier_invoice.choice"),
  parseNodeId("node.supplier_invoice.end"),
  parseNodeId("node.facility_window.notice"),
  parseNodeId("node.facility_window.end"),
  parseNodeId("node.levy_due.notice"),
  parseNodeId("node.levy_due.end"),
  parseNodeId("node.repair_sign.intro"),
  parseNodeId("node.repair_sign.choice"),
  parseNodeId("node.repair_sign.end"),
  parseNodeId("node.apology.line"),
  parseNodeId("node.apology.end"),
  parseNodeId("node.old_trade_road.departure.line"),
  parseNodeId("node.old_trade_road.departure.end"),
  parseNodeId("node.old_trade_road.investigation.line"),
  parseNodeId("node.old_trade_road.investigation.end"),
] as const);

export const factIdsV1 = Object.freeze([
  parseFactId("fact.war_clue"),
  parseFactId("fact.tutorial_first_service_completed"),
  parseFactId("fact.invoice_checked_this_week"),
] as const);

export const outcomeIdsV1 = Object.freeze([
  parseOutcomeId("outcome.relationship_opportunity"),
  parseOutcomeId("outcome.investigation"),
] as const);

export const checkBandIdsV1 = Object.freeze([
  parseCheckBandId("band.investigation.setback"),
  parseCheckBandId("band.investigation.success-with-cost"),
  parseCheckBandId("band.investigation.complete"),
  parseCheckBandId("band.investigation.exceptional"),
] as const);

export const endingIdsV1 = Object.freeze([
  parseEndingId("ending.stable"),
  parseEndingId("ending.danger"),
  parseEndingId("ending.failed_arrears"),
] as const);

export const reasonIdsV1 = Object.freeze([
  parseReasonId("reason.action.purchase"),
  parseReasonId("reason.action.prepare_food"),
  parseReasonId("reason.action.rest"),
  parseReasonId("reason.action.facility_build"),
  parseReasonId("reason.action.facility_skip"),
  parseReasonId("reason.recovery.balanced_night"),
  parseReasonId("reason.recovery.night_owl_night"),
  parseReasonId("reason.recovery.heroine_night"),
  parseReasonId("reason.service.manual"),
  parseReasonId("reason.service.assisted"),
  parseReasonId("reason.service.delegated"),
  parseReasonId("reason.service.closed"),
  parseReasonId("reason.service.emergency_closed"),
  parseReasonId("reason.ledger.purchase"),
  parseReasonId("reason.ledger.wage"),
  parseReasonId("reason.ledger.opening_fee"),
  parseReasonId("reason.ledger.revenue"),
  parseReasonId("reason.ledger.discarded_food"),
  parseReasonId("reason.ledger.spoiled_ingredient"),
  parseReasonId("reason.ledger.facility_build"),
  parseReasonId("reason.ledger.world_action_cost"),
  parseReasonId("reason.ledger.levy"),
  parseReasonId("reason.modifier.cold_storage_shelf_life"),
  parseReasonId("reason.modifier.comfortable_bed_player_recovery"),
  parseReasonId("reason.modifier.comfortable_bed_heroine_recovery"),
  parseReasonId("reason.modifier.reputation_demand"),
  parseReasonId("reason.modifier.war_clue_demand"),
  parseReasonId("reason.aura.sign_repaired"),
  parseReasonId("reason.aura.heroine_angry"),
  parseReasonId("reason.aura.adventure_strain"),
  parseReasonId("reason.event.tutorial_completed"),
  parseReasonId("reason.event.invoice_checked"),
  parseReasonId("reason.event.helper_unlocked"),
  parseReasonId("reason.obligation.levy_forecast"),
  parseReasonId("reason.relationship.repair_sign"),
  parseReasonId("reason.relationship.repair_sign_declined"),
  parseReasonId("reason.relationship.repair_sign_conflict"),
  parseReasonId("reason.relationship.apology"),
  parseReasonId("reason.investigation.begin"),
  parseReasonId("reason.investigation.setback"),
  parseReasonId("reason.investigation.success_with_cost"),
  parseReasonId("reason.investigation.complete"),
  parseReasonId("reason.investigation.exceptional"),
  parseReasonId("reason.ending.stable"),
  parseReasonId("reason.ending.danger"),
  parseReasonId("reason.ending.arrears"),
  parseReasonId("reason.ending.reputation_crisis"),
  parseReasonId("reason.unavailable.story_window_closed"),
  parseReasonId("reason.unavailable.relationship_resolved"),
  parseReasonId("reason.unavailable.investigation_resolved"),
  parseReasonId("reason.unavailable.mutually_exclusive"),
  parseReasonId("reason.unavailable.heroine_not_angry"),
  parseReasonId("reason.unavailable.facility_decided"),
  parseReasonId("reason.unavailable.tax_not_visible"),
  parseReasonId("reason.unavailable.policy_not_ready"),
  parseReasonId("reason.unavailable.service_mode_locked"),
  parseReasonId("reason.unavailable.helper_locked"),
  parseReasonId("reason.unavailable.intellect_b_required"),
  parseReasonId("reason.debug.state_override"),
  parseReasonId("reason.debug.cash_adjustment"),
  parseReasonId("reason.debug.aura_adjustment"),
  parseReasonId("reason.debug.narrative_jump"),
  parseReasonId("reason.debug.rng_override"),
] as const);

export const weightedGroupIdsV1 = Object.freeze([] as const);
export const questIdsV1 = Object.freeze([] as const);
export const itemIdsV1 = Object.freeze([] as const);

export const serviceModeIdsV1 = Object.freeze([
  parseServiceMode("manual"),
  parseServiceMode("assisted"),
  parseServiceMode("delegated"),
  parseServiceMode("closed"),
] as const);

export const relationshipOutcomeTokensV1 = Object.freeze([
  parseStoryToken("relationship.pending"),
  parseStoryToken("relationship.completed"),
  parseStoryToken("relationship.abandoned"),
  parseStoryToken("relationship.reconciled"),
  parseStoryToken("relationship.unresolved_conflict"),
] as const);

export const investigationOutcomeTokensV1 = Object.freeze([
  parseStoryToken("investigation.not_attempted"),
  parseStoryToken("investigation.missed_by_choice"),
  parseStoryToken("investigation.setback"),
  parseStoryToken("investigation.success_with_cost"),
  parseStoryToken("investigation.complete"),
  parseStoryToken("investigation.exceptional"),
] as const);

export const storyTokenIdsV1 = Object.freeze([
  ...relationshipOutcomeTokensV1,
  ...investigationOutcomeTokensV1,
] as const);

export const pocStageSceneIdsV1 = Object.freeze([
  parseStageSceneId("stage_scene.poc.main_menu"),
  parseStageSceneId("stage_scene.poc.tavern"),
  parseStageSceneId("stage_scene.poc.market"),
  parseStageSceneId("stage_scene.poc.world_map"),
  parseStageSceneId("stage_scene.poc.week_summary"),
] as const);

export const pocStageSceneVariantIdsV1 = Object.freeze([
  parseStageSceneVariantId("stage_variant.poc.main_menu.default"),
  parseStageSceneVariantId("stage_variant.poc.tavern.day"),
  parseStageSceneVariantId("stage_variant.poc.tavern.evening"),
  parseStageSceneVariantId("stage_variant.poc.market.day"),
  parseStageSceneVariantId("stage_variant.poc.world_map.default"),
  parseStageSceneVariantId("stage_variant.poc.week_summary.default"),
] as const);

export const pocInteractionSurfaceIdsV1 = Object.freeze([
  parseInteractionSurfaceId("surface.poc.heroine"),
  parseInteractionSurfaceId("surface.poc.tavern"),
  parseInteractionSurfaceId("surface.poc.market"),
  parseInteractionSurfaceId("surface.poc.world_map"),
] as const);

export const pocInteractionTargetIdsV1 = Object.freeze([
  parseInteractionTargetId("target.poc.heroine.figure"),
  parseInteractionTargetId("target.poc.tavern.service"),
  parseInteractionTargetId("target.poc.market.purchase"),
  parseInteractionTargetId("target.poc.world_map.old_trade_road"),
] as const);

export const pocInteractionBehaviorIdsV1 = Object.freeze([
  parseInteractionBehaviorId("behavior.poc.heroine.open_profile"),
  parseInteractionBehaviorId("behavior.poc.heroine.repair_sign"),
  parseInteractionBehaviorId("behavior.poc.heroine.apologize"),
  parseInteractionBehaviorId("behavior.poc.tavern.service_plan"),
  parseInteractionBehaviorId("behavior.poc.market.purchase"),
  parseInteractionBehaviorId("behavior.poc.world_map.old_trade_road"),
] as const);

export const pocPresentationCharacterIdsV1 = Object.freeze([
  parseCharacterId("character.poc.heroine"),
] as const);

export const pocHeroineCharacterRigIdsV1 = Object.freeze([
  parseCharacterRigId("rig.poc.heroine.default"),
] as const);

export const pocHeroineCharacterPoseIdsV1 = Object.freeze([
  parseCharacterPoseId("pose.poc.heroine.idle"),
] as const);

export const pocHeroineCharacterExpressionIdsV1 = Object.freeze([
  parseCharacterExpressionId("expression.poc.heroine.neutral"),
] as const);

export const pocHeroineCharacterActivityIdsV1 = Object.freeze([
  parseCharacterActivityId("activity.poc.heroine.idle"),
] as const);

export const pocHeroineAppearanceLayerOrderV1 = Object.freeze([
  parseAppearanceLayerId("appearance_layer.poc.heroine.back_hair"),
  parseAppearanceLayerId("appearance_layer.poc.heroine.costume_body"),
  parseAppearanceLayerId("appearance_layer.poc.heroine.face"),
  parseAppearanceLayerId("appearance_layer.poc.heroine.front_hair"),
  parseAppearanceLayerId("appearance_layer.poc.heroine.accessory"),
  parseAppearanceLayerId("appearance_layer.poc.heroine.held_prop"),
  parseAppearanceLayerId("appearance_layer.poc.heroine.foreground_effect"),
] as const);

export const pocHitMapIdsV1 = Object.freeze([parseHitMapId("hit_map.poc.heroine.idle")] as const);

export const pocHitAreaIdsV1 = Object.freeze([
  parseHitAreaId("hit_area.poc.heroine.figure"),
] as const);

export const assetIdsV1 = Object.freeze([
  parseAssetId("asset.poc.character.heroine.back_hair.standard"),
  parseAssetId("asset.poc.character.heroine.costume_body.standard"),
  parseAssetId("asset.poc.character.heroine.face.neutral"),
  parseAssetId("asset.poc.character.heroine.front_hair.standard"),
  parseAssetId("asset.poc.character.heroine.accessory.standard"),
  parseAssetId("asset.poc.character.heroine.static.standard"),
  parseAssetId("asset.poc.background.main_menu.standard"),
  parseAssetId("asset.poc.background.tavern.day.standard"),
  parseAssetId("asset.poc.background.tavern.evening.standard"),
  parseAssetId("asset.poc.background.market.day.standard"),
  parseAssetId("asset.poc.background.world_map.standard"),
  parseAssetId("asset.poc.background.week_summary.standard"),
] as const);

export const pocHeroinePresentationIdsV1 = Object.freeze({
  characterId: pocPresentationCharacterIdsV1[0],
  rigId: pocHeroineCharacterRigIdsV1[0],
  poseId: pocHeroineCharacterPoseIdsV1[0],
  expressionId: pocHeroineCharacterExpressionIdsV1[0],
  activityId: pocHeroineCharacterActivityIdsV1[0],
  hitMapId: pocHitMapIdsV1[0],
  rendererId: "renderer.poc.character.paper_doll",
  staticFallbackAssetId: assetIdsV1[5],
} as const);

export const pocPresentationProviderIdsV1 = Object.freeze([
  parsePresentationProviderId("provider.poc.intent.open_profile"),
  parsePresentationProviderId("provider.poc.semantic.repair_sign_with_heroine"),
  parsePresentationProviderId("provider.poc.semantic.apologize_to_heroine"),
  parsePresentationProviderId("provider.poc.semantic.service_plan"),
  parsePresentationProviderId("provider.poc.semantic.purchase"),
  parsePresentationProviderId("provider.poc.semantic.old_trade_road"),
] as const);

export const pocGameSymbolIdsV1 = Object.freeze([
  "symbol.poc.actor.stamina",
  "symbol.poc.actor.mood",
  "symbol.poc.economy.cash",
  "symbol.poc.tavern.reputation",
  "symbol.poc.obligation.levy",
  "symbol.poc.inventory.ingredient",
  "symbol.poc.relationship.affection",
  "symbol.poc.relationship.teamwork",
  "symbol.poc.action.purchase",
  "symbol.poc.action.service",
  "symbol.poc.overlay.ledger",
  "symbol.poc.overlay.facility",
  "symbol.poc.facility.cold_storage",
  "symbol.poc.facility.comfortable_bed",
] as const);

export const pocSemanticWorkflowActionIdsV1 = Object.freeze([
  parseActionId("action.run_start"),
  parseActionId("action.tavern_opening_start"),
  parseActionId("action.tavern_opening_continue"),
  parseActionId("action.tavern_opening_finalize"),
  parseActionId("action.world_action_complete"),
  parseActionId("action.narrative_advance"),
  parseActionId("action.narrative_choose"),
] as const);

export const pocTextIdsV1 = Object.freeze({
  storyTitle: parseTextId("text.poc.story.title"),
  settingsContentFilterNone: parseTextId("text.poc.settings.content_filter.none"),

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
  actionRunStartLabel: parseTextId("text.poc.action.run_start.label"),
  actionTavernOpeningStartLabel: parseTextId("text.poc.action.tavern_opening_start.label"),
  actionTavernOpeningContinueLabel: parseTextId("text.poc.action.tavern_opening_continue.label"),
  actionTavernOpeningFinalizeLabel: parseTextId("text.poc.action.tavern_opening_finalize.label"),
  actionWorldActionCompleteLabel: parseTextId("text.poc.action.world_action_complete.label"),
  actionNarrativeAdvanceLabel: parseTextId("text.poc.action.narrative_advance.label"),
  actionNarrativeChooseLabel: parseTextId("text.poc.action.narrative_choose.label"),

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

  stageSceneMainMenuAccessibleName: parseTextId("text.poc.stage_scene.main_menu.accessible_name"),
  stageSceneTavernAccessibleName: parseTextId("text.poc.stage_scene.tavern.accessible_name"),
  stageSceneMarketAccessibleName: parseTextId("text.poc.stage_scene.market.accessible_name"),
  stageSceneWorldMapAccessibleName: parseTextId("text.poc.stage_scene.world_map.accessible_name"),
  stageSceneWeekSummaryAccessibleName: parseTextId(
    "text.poc.stage_scene.week_summary.accessible_name",
  ),
  stageVariantMainMenuDefaultAccessibleName: parseTextId(
    "text.poc.stage_variant.main_menu.default.accessible_name",
  ),
  stageVariantTavernDayAccessibleName: parseTextId(
    "text.poc.stage_variant.tavern.day.accessible_name",
  ),
  stageVariantTavernEveningAccessibleName: parseTextId(
    "text.poc.stage_variant.tavern.evening.accessible_name",
  ),
  stageVariantMarketDayAccessibleName: parseTextId(
    "text.poc.stage_variant.market.day.accessible_name",
  ),
  stageVariantWorldMapDefaultAccessibleName: parseTextId(
    "text.poc.stage_variant.world_map.default.accessible_name",
  ),
  stageVariantWeekSummaryDefaultAccessibleName: parseTextId(
    "text.poc.stage_variant.week_summary.default.accessible_name",
  ),
  surfaceHeroineAccessibleName: parseTextId("text.poc.surface.heroine.accessible_name"),
  surfaceTavernAccessibleName: parseTextId("text.poc.surface.tavern.accessible_name"),
  surfaceMarketAccessibleName: parseTextId("text.poc.surface.market.accessible_name"),
  surfaceWorldMapAccessibleName: parseTextId("text.poc.surface.world_map.accessible_name"),
  targetHeroineFigureAccessibleName: parseTextId("text.poc.target.heroine.figure.accessible_name"),
  targetTavernServiceAccessibleName: parseTextId("text.poc.target.tavern.service.accessible_name"),
  targetMarketPurchaseAccessibleName: parseTextId(
    "text.poc.target.market.purchase.accessible_name",
  ),
  targetWorldMapOldTradeRoadAccessibleName: parseTextId(
    "text.poc.target.world_map.old_trade_road.accessible_name",
  ),
  behaviorHeroineOpenProfileName: parseTextId("text.poc.behavior.heroine.open_profile.name"),
  behaviorHeroineOpenProfileDescription: parseTextId(
    "text.poc.behavior.heroine.open_profile.description",
  ),
  behaviorHeroineRepairSignName: parseTextId("text.poc.behavior.heroine.repair_sign.name"),
  behaviorHeroineRepairSignDescription: parseTextId(
    "text.poc.behavior.heroine.repair_sign.description",
  ),
  behaviorHeroineApologizeName: parseTextId("text.poc.behavior.heroine.apologize.name"),
  behaviorHeroineApologizeDescription: parseTextId(
    "text.poc.behavior.heroine.apologize.description",
  ),
  behaviorTavernServicePlanName: parseTextId("text.poc.behavior.tavern.service_plan.name"),
  behaviorTavernServicePlanDescription: parseTextId(
    "text.poc.behavior.tavern.service_plan.description",
  ),
  behaviorMarketPurchaseName: parseTextId("text.poc.behavior.market.purchase.name"),
  behaviorMarketPurchaseDescription: parseTextId("text.poc.behavior.market.purchase.description"),
  behaviorWorldMapOldTradeRoadName: parseTextId("text.poc.behavior.world_map.old_trade_road.name"),
  behaviorWorldMapOldTradeRoadDescription: parseTextId(
    "text.poc.behavior.world_map.old_trade_road.description",
  ),

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

export const textIdsV1 = Object.freeze(Object.values(pocTextIdsV1));

export const pocStoryTitleTextIdV1 = pocTextIdsV1.storyTitle;
export const pocNoContentFilterOptionsTextIdV1 = pocTextIdsV1.settingsContentFilterNone;
