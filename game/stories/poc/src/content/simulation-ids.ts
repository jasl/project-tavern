// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { parseCharacterId } from "@sillymaker/base";

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
} from "../gameplay/contracts/ids.js";

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
