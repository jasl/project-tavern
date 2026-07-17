// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parseStageSceneGraphV1 } from "@sillymaker/base";

import { assetIdsV1 } from "../content/asset-ids.js";
import { pocTextIdsV1 } from "../content/text-ids.js";
import {
  pocHeroineAppearanceLayerOrderV1,
  pocHeroineCharacterActivityIdsV1,
  pocHeroineCharacterExpressionIdsV1,
  pocHeroineCharacterPoseIdsV1,
  pocHeroinePresentationIdsV1,
  pocHitAreaIdsV1,
  pocInteractionSurfaceIdsV1,
  pocInteractionTargetIdsV1,
  pocStageSceneIdsV1,
  pocStageSceneVariantIdsV1,
} from "./presentation-ids.js";
import {
  pocContentMaturityPolicyV1,
  pocStandardContentRequirementV1,
} from "./content-maturity-policy.js";
import {
  pocInteractionBehaviorsV1,
  pocInteractionSurfacesV1,
  pocInteractionTargetsV1,
} from "./interaction-catalog.js";

export const pocStageRendererIdsV1 = Object.freeze({
  mainMenu: "renderer.poc.stage.main_menu",
  tavern: "renderer.poc.stage.tavern",
  market: "renderer.poc.stage.market",
  worldMap: "renderer.poc.stage.world_map",
  weekSummary: "renderer.poc.stage.week_summary",
} as const);

const pocStageLayoutV1 = Object.freeze({
  kind: "poc_stage_v1",
  logicalWidth: 1600,
  logicalHeight: 1000,
  safeArea: Object.freeze({ x: 133, y: 0, width: 1334, height: 1000 }),
} as const);

const pocHeroinePlacementV1 = Object.freeze({
  characterId: pocHeroinePresentationIdsV1.characterId,
  anchor: Object.freeze({ x: 0.6625, y: 0.93 }),
  scale: 1,
} as const);

const pocNeutralSurfaceAnchorV1 = Object.freeze({ x: 0.5, y: 0.5 });

const pocTavernSurfacePlacementsV1 = Object.freeze([
  Object.freeze({
    surfaceId: pocInteractionSurfaceIdsV1[1],
    anchor: pocNeutralSurfaceAnchorV1,
  }),
  Object.freeze({
    surfaceId: pocInteractionSurfaceIdsV1[0],
    anchor: pocNeutralSurfaceAnchorV1,
  }),
] as const);

export const pocSceneGraphV1 = parseStageSceneGraphV1({
  stageScenes: [
    {
      stageSceneId: pocStageSceneIdsV1[0],
      variantIds: [pocStageSceneVariantIdsV1[0]],
      defaultVariantId: pocStageSceneVariantIdsV1[0],
    },
    {
      stageSceneId: pocStageSceneIdsV1[1],
      variantIds: [pocStageSceneVariantIdsV1[1], pocStageSceneVariantIdsV1[2]],
      defaultVariantId: pocStageSceneVariantIdsV1[1],
    },
    {
      stageSceneId: pocStageSceneIdsV1[2],
      variantIds: [pocStageSceneVariantIdsV1[3]],
      defaultVariantId: pocStageSceneVariantIdsV1[3],
    },
    {
      stageSceneId: pocStageSceneIdsV1[3],
      variantIds: [pocStageSceneVariantIdsV1[4]],
      defaultVariantId: pocStageSceneVariantIdsV1[4],
    },
    {
      stageSceneId: pocStageSceneIdsV1[4],
      variantIds: [pocStageSceneVariantIdsV1[5]],
      defaultVariantId: pocStageSceneVariantIdsV1[5],
    },
  ],
  variants: [
    {
      stageSceneId: pocStageSceneIdsV1[0],
      variantId: pocStageSceneVariantIdsV1[0],
      rendererId: pocStageRendererIdsV1.mainMenu,
      accessibleNameTextId: pocTextIdsV1.stageVariantMainMenuDefaultAccessibleName,
      backgroundAssetId: assetIdsV1[6],
      layout: pocStageLayoutV1,
      actors: [],
      interactionSurfaces: [],
      content: pocStandardContentRequirementV1,
    },
    {
      stageSceneId: pocStageSceneIdsV1[1],
      variantId: pocStageSceneVariantIdsV1[1],
      rendererId: pocStageRendererIdsV1.tavern,
      accessibleNameTextId: pocTextIdsV1.stageVariantTavernDayAccessibleName,
      backgroundAssetId: assetIdsV1[7],
      layout: pocStageLayoutV1,
      actors: [pocHeroinePlacementV1],
      interactionSurfaces: pocTavernSurfacePlacementsV1,
      content: pocStandardContentRequirementV1,
    },
    {
      stageSceneId: pocStageSceneIdsV1[1],
      variantId: pocStageSceneVariantIdsV1[2],
      rendererId: pocStageRendererIdsV1.tavern,
      accessibleNameTextId: pocTextIdsV1.stageVariantTavernEveningAccessibleName,
      backgroundAssetId: assetIdsV1[8],
      layout: pocStageLayoutV1,
      actors: [pocHeroinePlacementV1],
      interactionSurfaces: pocTavernSurfacePlacementsV1,
      content: pocStandardContentRequirementV1,
    },
    {
      stageSceneId: pocStageSceneIdsV1[2],
      variantId: pocStageSceneVariantIdsV1[3],
      rendererId: pocStageRendererIdsV1.market,
      accessibleNameTextId: pocTextIdsV1.stageVariantMarketDayAccessibleName,
      backgroundAssetId: assetIdsV1[9],
      layout: pocStageLayoutV1,
      actors: [],
      interactionSurfaces: [
        { surfaceId: pocInteractionSurfaceIdsV1[2], anchor: pocNeutralSurfaceAnchorV1 },
      ],
      content: pocStandardContentRequirementV1,
    },
    {
      stageSceneId: pocStageSceneIdsV1[3],
      variantId: pocStageSceneVariantIdsV1[4],
      rendererId: pocStageRendererIdsV1.worldMap,
      accessibleNameTextId: pocTextIdsV1.stageVariantWorldMapDefaultAccessibleName,
      backgroundAssetId: assetIdsV1[10],
      layout: pocStageLayoutV1,
      actors: [],
      interactionSurfaces: [
        { surfaceId: pocInteractionSurfaceIdsV1[3], anchor: pocNeutralSurfaceAnchorV1 },
      ],
      content: pocStandardContentRequirementV1,
    },
    {
      stageSceneId: pocStageSceneIdsV1[4],
      variantId: pocStageSceneVariantIdsV1[5],
      rendererId: pocStageRendererIdsV1.weekSummary,
      accessibleNameTextId: pocTextIdsV1.stageVariantWeekSummaryDefaultAccessibleName,
      backgroundAssetId: assetIdsV1[11],
      layout: pocStageLayoutV1,
      actors: [],
      interactionSurfaces: [],
      content: pocStandardContentRequirementV1,
    },
  ],
  characters: [
    {
      characterId: pocHeroinePresentationIdsV1.characterId,
      accessibleNameTextId: pocTextIdsV1.characterHeroineName,
      defaultRigId: pocHeroinePresentationIdsV1.rigId,
    },
  ],
  characterRigs: [
    {
      rigId: pocHeroinePresentationIdsV1.rigId,
      rendererId: pocHeroinePresentationIdsV1.rendererId,
      poseIds: pocHeroineCharacterPoseIdsV1,
      expressionIds: pocHeroineCharacterExpressionIdsV1,
      activityIds: pocHeroineCharacterActivityIdsV1,
      appearanceLayerOrder: pocHeroineAppearanceLayerOrderV1,
      defaultHitMapId: pocHeroinePresentationIdsV1.hitMapId,
      poseHitMapOverrides: [],
      staticFallbackAssetId: pocHeroinePresentationIdsV1.staticFallbackAssetId,
      fallbackHitMapCompatibility: "compatible",
    },
  ],
  hitMaps: [
    {
      hitMapId: pocHeroinePresentationIdsV1.hitMapId,
      rigId: pocHeroinePresentationIdsV1.rigId,
      poseId: pocHeroinePresentationIdsV1.poseId,
      targets: [
        {
          areaId: pocHitAreaIdsV1[0],
          targetId: pocInteractionTargetIdsV1[0],
          shape: { kind: "rect", x: 0.45, y: 0.05, width: 0.43, height: 0.9 },
          priority: 0,
        },
      ],
    },
  ],
  interactionSurfaces: pocInteractionSurfacesV1,
  interactionTargets: pocInteractionTargetsV1,
  interactionBehaviors: pocInteractionBehaviorsV1,
  contentMaturityPolicy: pocContentMaturityPolicyV1,
});
