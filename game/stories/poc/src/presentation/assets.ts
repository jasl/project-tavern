// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { approvedPocAssetPacksV1 } from "@project-tavern/assets";
import type { AssetPackV1, StageSceneVariantId } from "@sillymaker/base";

import {
  assetIdsV1,
  pocHeroineAppearanceLayerOrderV1,
  pocStageSceneVariantIdsV1,
} from "../content/ids.js";
import { pocSceneGraphV1 } from "./scene-graph.js";

function deepFreezePresentationDataV1<TValue>(value: TValue): TValue {
  const seen = new WeakSet<object>();

  function freeze(current: unknown): void {
    if (current === null || typeof current !== "object" || seen.has(current)) return;
    seen.add(current);
    for (const key of Reflect.ownKeys(current)) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor?.get !== undefined || descriptor?.set !== undefined) {
        throw new TypeError("presentation data accessors are forbidden");
      }
      freeze(descriptor?.value);
    }
    Object.freeze(current);
  }

  freeze(value);
  return value;
}

const pocBackgroundSafeAreaV1 = Object.freeze({
  x: 213,
  y: 0,
  width: 2134,
  height: 1600,
});

const pocCharacterSafeAreaV1 = Object.freeze({
  x: 133,
  y: 0,
  width: 1334,
  height: 1000,
});

const pocHeroineFootPivotV1 = Object.freeze({ x: 1060, y: 930 });

export const pocAssetSlotsV1 = deepFreezePresentationDataV1([
  {
    assetId: assetIdsV1[0],
    kind: "character",
    usage: "character_pose",
    overridePolicy: "replaceable",
    fallbackToken: "fallback.poc.character.heroine.back_hair.standard",
    width: 1600,
    height: 1000,
    loadGroup: "scene",
    safeArea: pocCharacterSafeAreaV1,
    pivot: pocHeroineFootPivotV1,
  },
  {
    assetId: assetIdsV1[1],
    kind: "character",
    usage: "character_pose",
    overridePolicy: "replaceable",
    fallbackToken: "fallback.poc.character.heroine.costume_body.standard",
    width: 1600,
    height: 1000,
    loadGroup: "scene",
    safeArea: pocCharacterSafeAreaV1,
    pivot: pocHeroineFootPivotV1,
  },
  {
    assetId: assetIdsV1[2],
    kind: "character",
    usage: "character_pose",
    overridePolicy: "replaceable",
    fallbackToken: "fallback.poc.character.heroine.face.neutral",
    width: 1600,
    height: 1000,
    loadGroup: "scene",
    safeArea: pocCharacterSafeAreaV1,
    pivot: pocHeroineFootPivotV1,
  },
  {
    assetId: assetIdsV1[3],
    kind: "character",
    usage: "character_pose",
    overridePolicy: "replaceable",
    fallbackToken: "fallback.poc.character.heroine.front_hair.standard",
    width: 1600,
    height: 1000,
    loadGroup: "scene",
    safeArea: pocCharacterSafeAreaV1,
    pivot: pocHeroineFootPivotV1,
  },
  {
    assetId: assetIdsV1[4],
    kind: "character",
    usage: "character_pose",
    overridePolicy: "replaceable",
    fallbackToken: "fallback.poc.character.heroine.accessory.standard",
    width: 1600,
    height: 1000,
    loadGroup: "scene",
    safeArea: pocCharacterSafeAreaV1,
    pivot: pocHeroineFootPivotV1,
  },
  {
    assetId: assetIdsV1[5],
    kind: "character",
    usage: "character_pose",
    overridePolicy: "replaceable",
    fallbackToken: "fallback.poc.character.heroine.static.standard",
    width: 1600,
    height: 1000,
    loadGroup: "scene",
    safeArea: pocCharacterSafeAreaV1,
    pivot: pocHeroineFootPivotV1,
  },
  {
    assetId: assetIdsV1[6],
    kind: "background",
    usage: "scene_background",
    overridePolicy: "replaceable",
    fallbackToken: "fallback.poc.background.main_menu.standard",
    width: 2560,
    height: 1600,
    loadGroup: "bootstrap",
    safeArea: pocBackgroundSafeAreaV1,
    pivot: null,
  },
  {
    assetId: assetIdsV1[7],
    kind: "background",
    usage: "scene_background",
    overridePolicy: "replaceable",
    fallbackToken: "fallback.poc.background.tavern.day.standard",
    width: 2560,
    height: 1600,
    loadGroup: "scene",
    safeArea: pocBackgroundSafeAreaV1,
    pivot: null,
  },
  {
    assetId: assetIdsV1[8],
    kind: "background",
    usage: "scene_background",
    overridePolicy: "replaceable",
    fallbackToken: "fallback.poc.background.tavern.evening.standard",
    width: 2560,
    height: 1600,
    loadGroup: "scene",
    safeArea: pocBackgroundSafeAreaV1,
    pivot: null,
  },
  {
    assetId: assetIdsV1[9],
    kind: "background",
    usage: "scene_background",
    overridePolicy: "replaceable",
    fallbackToken: "fallback.poc.background.market.day.standard",
    width: 2560,
    height: 1600,
    loadGroup: "scene",
    safeArea: pocBackgroundSafeAreaV1,
    pivot: null,
  },
  {
    assetId: assetIdsV1[10],
    kind: "background",
    usage: "scene_background",
    overridePolicy: "replaceable",
    fallbackToken: "fallback.poc.background.world_map.standard",
    width: 2560,
    height: 1600,
    loadGroup: "scene",
    safeArea: pocBackgroundSafeAreaV1,
    pivot: null,
  },
  {
    assetId: assetIdsV1[11],
    kind: "background",
    usage: "scene_background",
    overridePolicy: "replaceable",
    fallbackToken: "fallback.poc.background.week_summary.standard",
    width: 2560,
    height: 1600,
    loadGroup: "scene",
    safeArea: pocBackgroundSafeAreaV1,
    pivot: null,
  },
] as const);

export const pocAssetPacksV1: readonly AssetPackV1[] = approvedPocAssetPacksV1;

export const pocHeroineStandardAppearanceV1 = deepFreezePresentationDataV1([
  {
    layerId: pocHeroineAppearanceLayerOrderV1[0],
    assetId: assetIdsV1[0],
    fallbackPolicy: "omit",
  },
  {
    layerId: pocHeroineAppearanceLayerOrderV1[1],
    assetId: assetIdsV1[1],
    fallbackPolicy: "character_fallback",
  },
  {
    layerId: pocHeroineAppearanceLayerOrderV1[2],
    assetId: assetIdsV1[2],
    fallbackPolicy: "omit",
  },
  {
    layerId: pocHeroineAppearanceLayerOrderV1[3],
    assetId: assetIdsV1[3],
    fallbackPolicy: "omit",
  },
  {
    layerId: pocHeroineAppearanceLayerOrderV1[4],
    assetId: assetIdsV1[4],
    fallbackPolicy: "omit",
  },
] as const);

const pocHeroineStandardDemandV1 = Object.freeze([
  ...pocHeroineStandardAppearanceV1.map(({ assetId }) => assetId),
  assetIdsV1[5],
]);

export const pocStandardRequiredAssetIdsByVariantV1 = deepFreezePresentationDataV1({
  [pocStageSceneVariantIdsV1[0]]: [assetIdsV1[6]],
  [pocStageSceneVariantIdsV1[1]]: [assetIdsV1[7], ...pocHeroineStandardDemandV1],
  [pocStageSceneVariantIdsV1[2]]: [assetIdsV1[8], ...pocHeroineStandardDemandV1],
  [pocStageSceneVariantIdsV1[3]]: [assetIdsV1[9]],
  [pocStageSceneVariantIdsV1[4]]: [assetIdsV1[10]],
  [pocStageSceneVariantIdsV1[5]]: [assetIdsV1[11]],
} as Readonly<Record<StageSceneVariantId, readonly (typeof assetIdsV1)[number][]>>);

export const pocResolvedPresentationCatalogV1 = deepFreezePresentationDataV1({
  sceneGraph: pocSceneGraphV1,
  heroineStandardAppearance: pocHeroineStandardAppearanceV1,
  requiredAssetIdsByVariant: pocStandardRequiredAssetIdsByVariantV1,
});
