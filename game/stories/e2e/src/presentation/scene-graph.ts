// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { emptyContentMaturityFlagsV1, parseStageSceneGraphV1 } from "@sillymaker/base";

import { e2eContentMaturityPolicyV1 } from "./content-maturity-policy.js";

export const e2eSceneGraphV1 = parseStageSceneGraphV1({
  stageScenes: [
    {
      stageSceneId: "stage_scene.e2e.main",
      variantIds: ["stage_variant.e2e.main.default"],
      defaultVariantId: "stage_variant.e2e.main.default",
    },
    {
      stageSceneId: "stage_scene.e2e.summary",
      variantIds: ["stage_variant.e2e.summary.default"],
      defaultVariantId: "stage_variant.e2e.summary.default",
    },
  ],
  variants: [
    {
      stageSceneId: "stage_scene.e2e.main",
      variantId: "stage_variant.e2e.main.default",
      rendererId: "renderer.e2e.stage.css",
      accessibleNameTextId: "text.e2e.stage.main.name",
      backgroundAssetId: "asset.e2e.background.base",
      layout: {
        kind: "e2e_stage",
        mode: "main",
        slots: ["counter", "flow_visible_node", "normal_actions"],
        narrativeOverlay: {
          kind: "choice_rejoin",
          blocking: true,
          visibleNodeIds: ["choice", "rejoin"],
        },
      },
      actors: [
        {
          characterId: "character.e2e.counter",
          anchor: { x: 0.5, y: 0.75 },
          scale: 1,
        },
      ],
      interactionSurfaces: [
        {
          surfaceId: "surface.e2e.counter",
          anchor: { x: 0.5, y: 0.5 },
        },
      ],
      content: { requiredFlags: emptyContentMaturityFlagsV1 },
    },
    {
      stageSceneId: "stage_scene.e2e.summary",
      variantId: "stage_variant.e2e.summary.default",
      rendererId: "renderer.e2e.stage.css",
      accessibleNameTextId: "text.e2e.stage.summary.name",
      backgroundAssetId: "asset.e2e.background.base",
      layout: {
        kind: "e2e_stage",
        mode: "summary",
        slots: ["terminal_summary"],
      },
      actors: [],
      interactionSurfaces: [],
      content: { requiredFlags: emptyContentMaturityFlagsV1 },
    },
  ],
  characters: [
    {
      characterId: "character.e2e.counter",
      accessibleNameTextId: "text.e2e.character.counter.name",
      defaultRigId: "rig.e2e.counter",
    },
  ],
  characterRigs: [
    {
      rigId: "rig.e2e.counter",
      rendererId: "renderer.e2e.character.layered",
      poseIds: ["pose.e2e.counter.idle"],
      expressionIds: ["expression.e2e.counter.neutral"],
      activityIds: [],
      appearanceLayerOrder: [],
      defaultHitMapId: "hit_map.e2e.counter.idle",
      poseHitMapOverrides: [],
      staticFallbackAssetId: "asset.e2e.character.base",
      fallbackHitMapCompatibility: "compatible",
    },
  ],
  hitMaps: [
    {
      hitMapId: "hit_map.e2e.counter.idle",
      rigId: "rig.e2e.counter",
      poseId: "pose.e2e.counter.idle",
      targets: [
        {
          areaId: "hit_area.e2e.counter.rect",
          targetId: "target.e2e.counter.figure",
          shape: { kind: "rect", x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
          priority: 10,
        },
        {
          areaId: "hit_area.e2e.counter.circle",
          targetId: "target.e2e.counter.figure",
          shape: { kind: "circle", centerX: 0.5, centerY: 0.5, radius: 0.25 },
          priority: 20,
        },
        {
          areaId: "hit_area.e2e.counter.polygon",
          targetId: "target.e2e.counter.figure",
          shape: {
            kind: "polygon",
            points: [
              { x: 0.2, y: 0.2 },
              { x: 0.8, y: 0.2 },
              { x: 0.5, y: 0.8 },
            ],
          },
          priority: 20,
        },
      ],
    },
  ],
  interactionSurfaces: [
    {
      surfaceId: "surface.e2e.counter",
      accessibleNameTextId: "text.e2e.surface.counter.name",
      allowedEntryModes: ["surface_activation"],
      targetBindings: [
        {
          targetId: "target.e2e.counter.figure",
          allowedResolutionModes: ["direct"],
          openSurfaceId: null,
        },
      ],
    },
  ],
  interactionTargets: [
    {
      targetId: "target.e2e.counter.figure",
      accessibleNameTextId: "text.e2e.target.counter.name",
      behaviorIds: ["behavior.e2e.counter.increment"],
    },
  ],
  interactionBehaviors: [
    {
      behaviorId: "behavior.e2e.counter.increment",
      nameTextId: "text.e2e.increment",
      descriptionTextId: "text.e2e.behavior.counter.increment.description",
      providerId: "provider.e2e.semantic.increment",
      content: { requiredFlags: emptyContentMaturityFlagsV1 },
    },
  ],
  contentMaturityPolicy: e2eContentMaturityPolicyV1,
});

export type E2eSceneGraphV1 = typeof e2eSceneGraphV1;
