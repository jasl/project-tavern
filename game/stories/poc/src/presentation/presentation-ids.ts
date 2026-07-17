// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  parseAppearanceLayerId,
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
} from "@sillymaker/base";

import { assetIdsV1 } from "../content/asset-ids.js";

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
