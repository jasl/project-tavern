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
  parseRunId,
  parseStageSceneId,
  parseStageSceneVariantId,
  parseTextId,
} from "@sillymaker/base";
import type {
  AppearanceLayerId,
  AssetId,
  CharacterRigId,
  HitMapId,
  InteractionBehaviorId,
  InteractionSurfaceId,
  InteractionTargetId,
  StageSceneId,
  TextId,
} from "@sillymaker/base";

import { describe, expect, expectTypeOf, it } from "vitest";

import {
  pocReferenceRunIdsV1,
  pocReferenceSeedV1,
  pocStateContractRevisionV1,
  pocStoryIdentityV1,
} from "../content/identity.js";
import {
  actionIdsV1,
  actorIdsV1,
  assetIdsV1,
  auraIdsV1,
  characterIdsV1,
  checkBandIdsV1,
  checkIdsV1,
  checkpointIdsV1,
  choiceIdsV1,
  customerSegmentIdsV1,
  endingIdsV1,
  eventIdsV1,
  factIdsV1,
  facilityIdsV1,
  ingredientIdsV1,
  investigationOutcomeTokensV1,
  itemIdsV1,
  modifierSourceIdsV1,
  nodeIdsV1,
  outcomeIdsV1,
  pocHitAreaIdsV1,
  pocGameSymbolIdsV1,
  pocHeroineCharacterActivityIdsV1,
  pocHeroineCharacterExpressionIdsV1,
  pocHeroineCharacterPoseIdsV1,
  pocHeroineCharacterRigIdsV1,
  pocHeroineAppearanceLayerOrderV1,
  pocHeroinePresentationIdsV1,
  pocHitMapIdsV1,
  pocInteractionBehaviorIdsV1,
  pocInteractionSurfaceIdsV1,
  pocInteractionTargetIdsV1,
  pocNoContentFilterOptionsTextIdV1,
  pocPresentationProviderIdsV1,
  pocPresentationCharacterIdsV1,
  pocSemanticWorkflowActionIdsV1,
  pocStageSceneIdsV1,
  pocStageSceneVariantIdsV1,
  pocStoryTitleTextIdV1,
  pocTextIdsV1,
  policyIdsV1,
  questIdsV1,
  reasonIdsV1,
  recipeIdsV1,
  relationshipOutcomeTokensV1,
  sceneIdsV1,
  serviceModeIdsV1,
  storyTokenIdsV1,
  textIdsV1,
  weightedGroupIdsV1,
  worldStepIdsV1,
} from "../content/ids.js";
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
import type {
  ActionId,
  ActorId,
  CheckBandId,
  EventId,
  IngredientId,
  OutcomeId,
  RecipeId,
  SceneId,
} from "../gameplay/index.js";

function expectDeeplyFrozenV1(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeeplyFrozenV1(nested, seen);
}

describe("week.poc_001 identity", () => {
  it("freezes the Story and six deterministic runs", () => {
    expect(pocStoryIdentityV1).toEqual({ id: "week.poc_001", revision: 1 });
    expect(pocStateContractRevisionV1).toBe(1);
    expect(pocReferenceSeedV1).toBe(0x00023049);
    expect(pocReferenceRunIdsV1).toEqual({
      "strategy.cash_first": "00000000-0000-4000-8000-000000000101",
      "strategy.relationship_first": "00000000-0000-4000-8000-000000000102",
      "strategy.investigation_first": "00000000-0000-4000-8000-000000000103",
      "strategy.full_delegation": "00000000-0000-4000-8000-000000000104",
      "strategy.two_closures_recovery": "00000000-0000-4000-8000-000000000105",
      "strategy.explicit_failure": "00000000-0000-4000-8000-000000000106",
    });
    expect(new Set(Object.values(pocReferenceRunIdsV1)).size).toBe(6);
    expect(Object.values(pocReferenceRunIdsV1).map(parseRunId)).toEqual(
      Object.values(pocReferenceRunIdsV1),
    );
    expectDeeplyFrozenV1(pocStoryIdentityV1);
    expectDeeplyFrozenV1(pocReferenceRunIdsV1);
  });

  it("keeps Event and player Action namespaces distinct", () => {
    expect(eventIdsV1).toHaveLength(5);
    expect(new Set([...eventIdsV1, ...actionIdsV1, ...ingredientIdsV1, ...recipeIdsV1]).size).toBe(
      eventIdsV1.length + actionIdsV1.length + ingredientIdsV1.length + recipeIdsV1.length,
    );
  });

  it("freezes fourteen Story-owned world symbols outside UI", () => {
    expect(pocGameSymbolIdsV1).toHaveLength(14);
    expect(new Set(pocGameSymbolIdsV1).size).toBe(14);
    expect(pocGameSymbolIdsV1.every((id) => id.startsWith("symbol.poc."))).toBe(true);
  });

  it("freezes seven workflow controls outside generic StoryContent actions", () => {
    expect(pocSemanticWorkflowActionIdsV1).toHaveLength(7);
    expect(new Set([...actionIdsV1, ...pocSemanticWorkflowActionIdsV1]).size).toBe(
      actionIdsV1.length + pocSemanticWorkflowActionIdsV1.length,
    );
  });

  it("freezes the PoC heroine renderer identity and seven authored layer slots", () => {
    expect(pocHeroinePresentationIdsV1).toEqual({
      characterId: "character.poc.heroine",
      rigId: "rig.poc.heroine.default",
      poseId: "pose.poc.heroine.idle",
      expressionId: "expression.poc.heroine.neutral",
      activityId: "activity.poc.heroine.idle",
      hitMapId: "hit_map.poc.heroine.idle",
      rendererId: "renderer.poc.character.paper_doll",
      staticFallbackAssetId: "asset.poc.character.heroine.static.standard",
    });
    expect(pocHeroineAppearanceLayerOrderV1).toHaveLength(7);
    expect(new Set(pocHeroineAppearanceLayerOrderV1).size).toBe(7);
  });

  it("freezes the truthful empty content-filter setting label before UI composition", () => {
    expect(pocNoContentFilterOptionsTextIdV1).toBe("text.poc.settings.content_filter.none");
    expect(pocStoryTitleTextIdV1).toBe("text.poc.story.title");
    expect(textIdsV1).toContain(pocStoryTitleTextIdV1);
    expect(itemIdsV1).toEqual([]);
  });
});

describe("closed gameplay content ID catalog", () => {
  it("matches the authored policy, actor, economy, and Scheduler namespaces", () => {
    expect(policyIdsV1).toEqual(["policy.balanced", "policy.night_owl"]);
    expect(actorIdsV1).toEqual(["actor.player", "actor.heroine"]);
    expect(characterIdsV1).toEqual(["character.narrator", "character.player", "character.heroine"]);
    expect(customerSegmentIdsV1).toEqual(["segment.locals", "segment.travelers"]);
    expect(modifierSourceIdsV1).toEqual(["modifier_source.reputation", "modifier_source.war_clue"]);
    expect(eventIdsV1).toEqual([
      "event.tutorial_first_service",
      "event.supplier_invoice",
      "event.helper_available",
      "event.facility_window",
      "event.levy_due",
    ]);
    expect(checkpointIdsV1).toEqual([
      "checkpoint.tutorial_first_service",
      "checkpoint.supplier_invoice",
      "checkpoint.helper_available",
      "checkpoint.facility_window",
      "checkpoint.levy_due",
    ]);
    expect(weightedGroupIdsV1).toEqual([]);
  });

  it("matches every player Action and economy definition in authored order", () => {
    expect(actionIdsV1).toEqual([
      "action.choose_life_policy",
      "action.purchase",
      "action.prepare_food",
      "action.rest",
      "action.service_plan",
      "action.advance_phase",
      "action.pay_levy",
      "action.facility_window",
      "action.repair_sign_with_heroine",
      "action.old_trade_road",
      "action.apologize_to_heroine",
    ]);
    expect(ingredientIdsV1).toEqual([
      "ingredient.coarse_grain",
      "ingredient.root_vegetable",
      "ingredient.ale",
      "ingredient.fresh_meat",
      "ingredient.herb",
    ]);
    expect(recipeIdsV1).toEqual([
      "recipe.grain_root_porridge",
      "recipe.ale_bread",
      "recipe.hunter_stew",
      "recipe.traveler_roast",
    ]);
    expect(facilityIdsV1).toEqual(["facility.cold_storage", "facility.comfortable_bed"]);
    expect(auraIdsV1).toEqual(["heroine.angry", "tavern.sign_repaired", "player.adventure_strain"]);
    expect(serviceModeIdsV1).toEqual(["manual", "assisted", "delegated", "closed"]);
    expect(itemIdsV1).toEqual([]);
  });

  it("matches every Narrative, Progression, Check, and Ending ID", () => {
    expect(choiceIdsV1).toEqual([
      "choice.supplier_invoice.intellect_b",
      "choice.supplier_invoice.pay_normally",
      "choice.repair_sign.cooperate",
      "choice.repair_sign.decline",
      "choice.repair_sign.conflict",
      "choice.old_trade_road.basic",
      "choice.old_trade_road.prepared",
    ]);
    expect(checkIdsV1).toEqual(["check.old_trade_road"]);
    expect(worldStepIdsV1).toEqual([
      "step.old_trade_road.departure",
      "step.old_trade_road.investigation",
    ]);
    expect(sceneIdsV1).toEqual([
      "scene.manifest_start",
      "scene.supplier_invoice",
      "scene.facility_window",
      "scene.levy_due",
      "scene.repair_sign_with_heroine",
      "scene.apologize_to_heroine",
      "scene.old_trade_road.departure",
      "scene.old_trade_road.investigation",
    ]);
    expect(nodeIdsV1).toEqual([
      "node.manifest_start.card",
      "node.manifest_start.end",
      "node.supplier_invoice.choice",
      "node.supplier_invoice.end",
      "node.facility_window.notice",
      "node.facility_window.end",
      "node.levy_due.notice",
      "node.levy_due.end",
      "node.repair_sign.intro",
      "node.repair_sign.choice",
      "node.repair_sign.end",
      "node.apology.line",
      "node.apology.end",
      "node.old_trade_road.departure.line",
      "node.old_trade_road.departure.end",
      "node.old_trade_road.investigation.line",
      "node.old_trade_road.investigation.end",
    ]);
    expect(factIdsV1).toEqual([
      "fact.war_clue",
      "fact.tutorial_first_service_completed",
      "fact.invoice_checked_this_week",
    ]);
    expect(questIdsV1).toEqual([]);
    expect(outcomeIdsV1).toEqual(["outcome.relationship_opportunity", "outcome.investigation"]);
    expect(checkBandIdsV1).toEqual([
      "band.investigation.setback",
      "band.investigation.success-with-cost",
      "band.investigation.complete",
      "band.investigation.exceptional",
    ]);
    expect(endingIdsV1).toEqual(["ending.stable", "ending.danger", "ending.failed_arrears"]);
  });

  it("freezes the complete authored Reason namespace", () => {
    expect(reasonIdsV1).toEqual([
      "reason.action.purchase",
      "reason.action.prepare_food",
      "reason.action.rest",
      "reason.action.facility_build",
      "reason.action.facility_skip",
      "reason.recovery.balanced_night",
      "reason.recovery.night_owl_night",
      "reason.recovery.heroine_night",
      "reason.service.manual",
      "reason.service.assisted",
      "reason.service.delegated",
      "reason.service.closed",
      "reason.service.emergency_closed",
      "reason.ledger.purchase",
      "reason.ledger.wage",
      "reason.ledger.opening_fee",
      "reason.ledger.revenue",
      "reason.ledger.discarded_food",
      "reason.ledger.spoiled_ingredient",
      "reason.ledger.facility_build",
      "reason.ledger.world_action_cost",
      "reason.ledger.levy",
      "reason.modifier.cold_storage_shelf_life",
      "reason.modifier.comfortable_bed_player_recovery",
      "reason.modifier.comfortable_bed_heroine_recovery",
      "reason.modifier.reputation_demand",
      "reason.modifier.war_clue_demand",
      "reason.aura.sign_repaired",
      "reason.aura.heroine_angry",
      "reason.aura.adventure_strain",
      "reason.event.tutorial_completed",
      "reason.event.invoice_checked",
      "reason.event.helper_unlocked",
      "reason.obligation.levy_forecast",
      "reason.relationship.repair_sign",
      "reason.relationship.repair_sign_declined",
      "reason.relationship.repair_sign_conflict",
      "reason.relationship.apology",
      "reason.investigation.begin",
      "reason.investigation.setback",
      "reason.investigation.success_with_cost",
      "reason.investigation.complete",
      "reason.investigation.exceptional",
      "reason.ending.stable",
      "reason.ending.danger",
      "reason.ending.arrears",
      "reason.ending.reputation_crisis",
      "reason.unavailable.story_window_closed",
      "reason.unavailable.relationship_resolved",
      "reason.unavailable.investigation_resolved",
      "reason.unavailable.mutually_exclusive",
      "reason.unavailable.heroine_not_angry",
      "reason.unavailable.facility_decided",
      "reason.unavailable.tax_not_visible",
      "reason.unavailable.policy_not_ready",
      "reason.unavailable.service_mode_locked",
      "reason.unavailable.helper_locked",
      "reason.unavailable.intellect_b_required",
      "reason.debug.state_override",
      "reason.debug.cash_adjustment",
      "reason.debug.aura_adjustment",
      "reason.debug.narrative_jump",
      "reason.debug.rng_override",
    ]);
    expect(reasonIdsV1).toHaveLength(63);
  });

  it("freezes every persistent outcome token before State construction", () => {
    expect(relationshipOutcomeTokensV1).toEqual([
      "relationship.pending",
      "relationship.completed",
      "relationship.abandoned",
      "relationship.reconciled",
      "relationship.unresolved_conflict",
    ]);
    expect(investigationOutcomeTokensV1).toEqual([
      "investigation.not_attempted",
      "investigation.missed_by_choice",
      "investigation.setback",
      "investigation.success_with_cost",
      "investigation.complete",
      "investigation.exceptional",
    ]);
    expect(storyTokenIdsV1).toEqual([
      ...relationshipOutcomeTokensV1,
      ...investigationOutcomeTokensV1,
    ]);
  });
});

describe("closed Story presentation ID catalog", () => {
  it("freezes the exact Stage, Interaction, and heroine identities", () => {
    expect(pocStageSceneIdsV1).toEqual([
      "stage_scene.poc.main_menu",
      "stage_scene.poc.tavern",
      "stage_scene.poc.market",
      "stage_scene.poc.world_map",
      "stage_scene.poc.week_summary",
    ]);
    expect(pocStageSceneVariantIdsV1).toEqual([
      "stage_variant.poc.main_menu.default",
      "stage_variant.poc.tavern.day",
      "stage_variant.poc.tavern.evening",
      "stage_variant.poc.market.day",
      "stage_variant.poc.world_map.default",
      "stage_variant.poc.week_summary.default",
    ]);
    expect(pocInteractionSurfaceIdsV1).toEqual([
      "surface.poc.heroine",
      "surface.poc.tavern",
      "surface.poc.market",
      "surface.poc.world_map",
    ]);
    expect(pocInteractionTargetIdsV1).toEqual([
      "target.poc.heroine.figure",
      "target.poc.tavern.service",
      "target.poc.market.purchase",
      "target.poc.world_map.old_trade_road",
    ]);
    expect(pocInteractionBehaviorIdsV1).toEqual([
      "behavior.poc.heroine.open_profile",
      "behavior.poc.heroine.repair_sign",
      "behavior.poc.heroine.apologize",
      "behavior.poc.tavern.service_plan",
      "behavior.poc.market.purchase",
      "behavior.poc.world_map.old_trade_road",
    ]);
    expect(pocHitAreaIdsV1).toEqual(["hit_area.poc.heroine.figure"]);
    expect(pocPresentationCharacterIdsV1).toEqual(["character.poc.heroine"]);
    expect(pocHeroineCharacterRigIdsV1).toEqual(["rig.poc.heroine.default"]);
    expect(pocHeroineCharacterPoseIdsV1).toEqual(["pose.poc.heroine.idle"]);
    expect(pocHeroineCharacterExpressionIdsV1).toEqual(["expression.poc.heroine.neutral"]);
    expect(pocHeroineCharacterActivityIdsV1).toEqual(["activity.poc.heroine.idle"]);
    expect(pocHitMapIdsV1).toEqual(["hit_map.poc.heroine.idle"]);
    expect(pocPresentationProviderIdsV1).toEqual([
      "provider.poc.intent.open_profile",
      "provider.poc.semantic.repair_sign_with_heroine",
      "provider.poc.semantic.apologize_to_heroine",
      "provider.poc.semantic.service_plan",
      "provider.poc.semantic.purchase",
      "provider.poc.semantic.old_trade_road",
    ]);
  });

  it("freezes the complete fallback asset demand and authored rig order", () => {
    expect(assetIdsV1).toEqual([
      "asset.poc.character.heroine.back_hair.standard",
      "asset.poc.character.heroine.costume_body.standard",
      "asset.poc.character.heroine.face.neutral",
      "asset.poc.character.heroine.front_hair.standard",
      "asset.poc.character.heroine.accessory.standard",
      "asset.poc.character.heroine.static.standard",
      "asset.poc.background.main_menu.standard",
      "asset.poc.background.tavern.day.standard",
      "asset.poc.background.tavern.evening.standard",
      "asset.poc.background.market.day.standard",
      "asset.poc.background.world_map.standard",
      "asset.poc.background.week_summary.standard",
    ]);
    expect(pocHeroineAppearanceLayerOrderV1).toEqual([
      "appearance_layer.poc.heroine.back_hair",
      "appearance_layer.poc.heroine.costume_body",
      "appearance_layer.poc.heroine.face",
      "appearance_layer.poc.heroine.front_hair",
      "appearance_layer.poc.heroine.accessory",
      "appearance_layer.poc.heroine.held_prop",
      "appearance_layer.poc.heroine.foreground_effect",
    ]);
    expect(assetIdsV1.slice(0, 5).map((id) => id.split(".").at(-2))).toEqual([
      "back_hair",
      "costume_body",
      "face",
      "front_hair",
      "accessory",
    ]);
  });

  it("keeps world symbols and workflow controls closed outside generic actions", () => {
    expect(pocGameSymbolIdsV1).toEqual([
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
    ]);
    expect(pocSemanticWorkflowActionIdsV1).toEqual([
      "action.run_start",
      "action.tavern_opening_start",
      "action.tavern_opening_continue",
      "action.tavern_opening_finalize",
      "action.world_action_complete",
      "action.narrative_advance",
      "action.narrative_choose",
    ]);
    expect(new Set([...actionIdsV1, ...pocSemanticWorkflowActionIdsV1]).size).toBe(18);
  });

  it("freezes one complete provisional TextId authority", () => {
    const catalog = new Set<string>(textIdsV1);

    expect(pocNoContentFilterOptionsTextIdV1).toBe("text.poc.settings.content_filter.none");
    expect(pocStoryTitleTextIdV1).toBe("text.poc.story.title");
    expect(textIdsV1).toEqual(Object.values(pocTextIdsV1));
    expect(textIdsV1).toHaveLength(200);
    expect(new Set(textIdsV1).size).toBe(textIdsV1.length);
    expect(textIdsV1.every((id) => id.startsWith("text.poc."))).toBe(true);
    expect(textIdsV1.map(parseTextId)).toEqual(textIdsV1);
    expect(textIdsV1).toContain(pocStoryTitleTextIdV1);
    expect(textIdsV1).toContain(pocNoContentFilterOptionsTextIdV1);
    expect(textIdsV1.some((id) => id.includes("confirmation"))).toBe(true);
    expect(textIdsV1.some((id) => id.includes("obligation"))).toBe(true);
    expect(textIdsV1.some((id) => id.includes("stage"))).toBe(true);
    expect(textIdsV1.some((id) => id.includes("behavior"))).toBe(true);

    for (const reasonId of reasonIdsV1) {
      expect(catalog.has(`text.poc.${reasonId}`), reasonId).toBe(true);
    }
    for (const actionId of [...actionIdsV1, ...pocSemanticWorkflowActionIdsV1]) {
      expect(catalog.has(`text.poc.${actionId}.label`), actionId).toBe(true);
    }
    for (const id of [...ingredientIdsV1, ...recipeIdsV1, ...policyIdsV1, ...facilityIdsV1]) {
      expect(catalog.has(`text.poc.${id}.name`), id).toBe(true);
    }
    for (const choiceId of choiceIdsV1) {
      expect(catalog.has(`text.poc.${choiceId}.label`), choiceId).toBe(true);
    }
    for (const endingId of endingIdsV1) {
      expect(catalog.has(`text.poc.${endingId}.name`), endingId).toBe(true);
    }
    for (const serviceMode of serviceModeIdsV1) {
      expect(catalog.has(`text.poc.service_mode.${serviceMode}.name`), serviceMode).toBe(true);
    }
    expect(pocTextIdsV1.choiceFacilitySkipLabel).toBe("text.poc.choice.facility.skip.label");
  });
});

describe("ID parser, brand, and immutability guarantees", () => {
  it("round-trips every non-empty registry through its public parser", () => {
    const vectors: readonly [
      label: string,
      values: readonly unknown[],
      parser: (value: unknown) => unknown,
    ][] = [
      ["PolicyId", policyIdsV1, parsePolicyId],
      ["ActorId", actorIdsV1, parseActorId],
      ["CharacterId", characterIdsV1, parseCharacterId],
      ["CustomerSegmentId", customerSegmentIdsV1, parseCustomerSegmentId],
      ["ModifierSourceId", modifierSourceIdsV1, parseModifierSourceId],
      ["EventId", eventIdsV1, parseEventId],
      ["CheckpointId", checkpointIdsV1, parseCheckpointId],
      ["ActionId", actionIdsV1, parseActionId],
      ["IngredientId", ingredientIdsV1, parseIngredientId],
      ["RecipeId", recipeIdsV1, parseRecipeId],
      ["FacilityId", facilityIdsV1, parseFacilityId],
      ["AuraId", auraIdsV1, parseAuraId],
      ["ServiceMode", serviceModeIdsV1, parseServiceMode],
      ["ChoiceId", choiceIdsV1, parseChoiceId],
      ["CheckId", checkIdsV1, parseCheckId],
      ["WorldStepId", worldStepIdsV1, parseWorldStepId],
      ["SceneId", sceneIdsV1, parseSceneId],
      ["NodeId", nodeIdsV1, parseNodeId],
      ["FactId", factIdsV1, parseFactId],
      ["OutcomeId", outcomeIdsV1, parseOutcomeId],
      ["CheckBandId", checkBandIdsV1, parseCheckBandId],
      ["EndingId", endingIdsV1, parseEndingId],
      ["ReasonId", reasonIdsV1, parseReasonId],
      ["StoryToken", storyTokenIdsV1, parseStoryToken],
      ["TextId", textIdsV1, parseTextId],
      ["AssetId", assetIdsV1, parseAssetId],
      ["StageSceneId", pocStageSceneIdsV1, parseStageSceneId],
      ["StageSceneVariantId", pocStageSceneVariantIdsV1, parseStageSceneVariantId],
      ["Presentation CharacterId", pocPresentationCharacterIdsV1, parseCharacterId],
      ["CharacterRigId", pocHeroineCharacterRigIdsV1, parseCharacterRigId],
      ["CharacterPoseId", pocHeroineCharacterPoseIdsV1, parseCharacterPoseId],
      ["CharacterExpressionId", pocHeroineCharacterExpressionIdsV1, parseCharacterExpressionId],
      ["CharacterActivityId", pocHeroineCharacterActivityIdsV1, parseCharacterActivityId],
      ["HitMapId", pocHitMapIdsV1, parseHitMapId],
      ["InteractionSurfaceId", pocInteractionSurfaceIdsV1, parseInteractionSurfaceId],
      ["InteractionTargetId", pocInteractionTargetIdsV1, parseInteractionTargetId],
      ["InteractionBehaviorId", pocInteractionBehaviorIdsV1, parseInteractionBehaviorId],
      ["AppearanceLayerId", pocHeroineAppearanceLayerOrderV1, parseAppearanceLayerId],
      ["HitAreaId", pocHitAreaIdsV1, parseHitAreaId],
      ["PresentationProviderId", pocPresentationProviderIdsV1, parsePresentationProviderId],
      ["Workflow ActionId", pocSemanticWorkflowActionIdsV1, parseActionId],
    ];

    for (const [label, values, parser] of vectors) {
      expect(values.map(parser), label).toEqual(values);
    }
    expect(parseCharacterRigId(pocHeroinePresentationIdsV1.rigId)).toBe(
      pocHeroinePresentationIdsV1.rigId,
    );
    expect(parseCharacterPoseId(pocHeroinePresentationIdsV1.poseId)).toBe(
      pocHeroinePresentationIdsV1.poseId,
    );
    expect(parseCharacterExpressionId(pocHeroinePresentationIdsV1.expressionId)).toBe(
      pocHeroinePresentationIdsV1.expressionId,
    );
    expect(parseCharacterActivityId(pocHeroinePresentationIdsV1.activityId)).toBe(
      pocHeroinePresentationIdsV1.activityId,
    );
    expect(parseHitMapId(pocHeroinePresentationIdsV1.hitMapId)).toBe(
      pocHeroinePresentationIdsV1.hitMapId,
    );
  });

  it("keeps Event and Action runtime namespaces mutually exclusive", () => {
    expect(() => parseActionId(eventIdsV1[0])).toThrowError(TypeError);
    expect(() => parseEventId(actionIdsV1[0])).toThrowError(TypeError);
  });

  it("deep-freezes every public registry", () => {
    for (const registry of [
      policyIdsV1,
      actorIdsV1,
      characterIdsV1,
      customerSegmentIdsV1,
      modifierSourceIdsV1,
      eventIdsV1,
      checkpointIdsV1,
      weightedGroupIdsV1,
      actionIdsV1,
      ingredientIdsV1,
      recipeIdsV1,
      facilityIdsV1,
      auraIdsV1,
      serviceModeIdsV1,
      choiceIdsV1,
      checkIdsV1,
      worldStepIdsV1,
      sceneIdsV1,
      nodeIdsV1,
      factIdsV1,
      questIdsV1,
      outcomeIdsV1,
      checkBandIdsV1,
      endingIdsV1,
      reasonIdsV1,
      itemIdsV1,
      relationshipOutcomeTokensV1,
      investigationOutcomeTokensV1,
      storyTokenIdsV1,
      pocTextIdsV1,
      textIdsV1,
      assetIdsV1,
      pocStageSceneIdsV1,
      pocStageSceneVariantIdsV1,
      pocInteractionSurfaceIdsV1,
      pocInteractionTargetIdsV1,
      pocInteractionBehaviorIdsV1,
      pocPresentationCharacterIdsV1,
      pocHeroineCharacterRigIdsV1,
      pocHeroineCharacterPoseIdsV1,
      pocHeroineCharacterExpressionIdsV1,
      pocHeroineCharacterActivityIdsV1,
      pocHitMapIdsV1,
      pocHitAreaIdsV1,
      pocPresentationProviderIdsV1,
      pocHeroinePresentationIdsV1,
      pocHeroineAppearanceLayerOrderV1,
      pocGameSymbolIdsV1,
      pocSemanticWorkflowActionIdsV1,
    ]) {
      expectDeeplyFrozenV1(registry);
    }
  });

  it("keeps compile-time ID brands distinct", () => {
    expectTypeOf<ActionId>().not.toMatchTypeOf<EventId>();
    expectTypeOf<SceneId>().not.toMatchTypeOf<StageSceneId>();
    expectTypeOf<ActorId>().not.toMatchTypeOf<ReturnType<typeof parseCharacterId>>();
    expectTypeOf<IngredientId>().not.toMatchTypeOf<RecipeId>();
    expectTypeOf<OutcomeId>().not.toMatchTypeOf<CheckBandId>();
    expectTypeOf<TextId>().not.toMatchTypeOf<AssetId>();
    expectTypeOf<CharacterRigId>().not.toMatchTypeOf<ReturnType<typeof parseCharacterPoseId>>();
    expectTypeOf<AppearanceLayerId>().not.toMatchTypeOf<HitMapId>();
    expectTypeOf<InteractionSurfaceId>().not.toMatchTypeOf<InteractionTargetId>();
    expectTypeOf<InteractionTargetId>().not.toMatchTypeOf<InteractionBehaviorId>();
  });
});
