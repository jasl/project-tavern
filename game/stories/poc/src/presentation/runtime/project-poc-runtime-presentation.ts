// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { isContentRequirementAllowedV1 } from "@sillymaker/base";
import type {
  AssetId,
  DeepReadonly,
  InteractionBehaviorId,
  InteractionSurfaceId,
  StageSceneVariantId,
} from "@sillymaker/base";
import type {
  RuntimeCharacterPresentationV1,
  RuntimeInteractionBehaviorV1,
  RuntimeInteractionSurfaceV1,
  RuntimeInteractionTargetV1,
  RuntimePresentationProjectionV1,
  RuntimeStageSceneV1,
} from "@sillymaker/ui";

import {
  pocHeroineAppearanceLayerOrderV1,
  pocHeroinePresentationIdsV1,
  pocInteractionBehaviorIdsV1,
  pocInteractionSurfaceIdsV1,
  pocInteractionTargetIdsV1,
  pocStageSceneVariantIdsV1,
} from "../../content/ids.js";
import type {
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1,
} from "../semantic-actions.js";
import type {
  PocResolvedPresentationCatalogV1,
  PocRuntimePresentationProjectorV1,
  PocRuntimePresentationProjectionInputV1,
  PocRuntimePresentationViewV1,
} from "./contracts.js";
import { createPocInteractionBehaviorResolverV1 } from "./interaction-behaviors.js";

type PocVariantV1 = PocResolvedPresentationCatalogV1["sceneGraph"]["variants"][number];
type PocRuntimeBehaviorV1 = DeepReadonly<
  RuntimeInteractionBehaviorV1<PocSemanticActionDescriptorV1, PocSemanticInvocationV1>
>;
type PocRuntimeSurfaceV1 = DeepReadonly<
  RuntimeInteractionSurfaceV1<PocSemanticActionDescriptorV1, PocSemanticInvocationV1>
>;
type PocRuntimeTargetV1 = DeepReadonly<
  RuntimeInteractionTargetV1<PocSemanticActionDescriptorV1, PocSemanticInvocationV1>
>;
type PocProjectionV1 = RuntimePresentationProjectionV1<PocRuntimePresentationViewV1, AssetId>;

const heroineAppearanceFallbackPolicyV1 = Object.freeze([
  Object.freeze({
    layerId: pocHeroineAppearanceLayerOrderV1[0],
    fallbackPolicy: "omit" as const,
  }),
  Object.freeze({
    layerId: pocHeroineAppearanceLayerOrderV1[1],
    fallbackPolicy: "character_fallback" as const,
  }),
  Object.freeze({
    layerId: pocHeroineAppearanceLayerOrderV1[2],
    fallbackPolicy: "omit" as const,
  }),
  Object.freeze({
    layerId: pocHeroineAppearanceLayerOrderV1[3],
    fallbackPolicy: "omit" as const,
  }),
  Object.freeze({
    layerId: pocHeroineAppearanceLayerOrderV1[4],
    fallbackPolicy: "omit" as const,
  }),
]);

function requireUniqueV1<TValue>(
  values: readonly TValue[],
  predicate: (value: TValue) => boolean,
  label: string,
): TValue {
  let match: TValue | undefined;
  for (const value of values) {
    if (!predicate(value)) continue;
    if (match !== undefined) throw new TypeError(`duplicate PoC ${label}`);
    match = value;
  }
  if (match === undefined) throw new TypeError(`missing PoC ${label}`);
  return match;
}

function selectVariantIdV1(
  input: DeepReadonly<PocRuntimePresentationProjectionInputV1>,
): StageSceneVariantId {
  if (input.uiState.route === "main_menu") return pocStageSceneVariantIdsV1[0];
  if (input.uiState.primaryOverlayId === "overlay.poc.purchase") {
    return pocStageSceneVariantIdsV1[3];
  }
  if (input.uiState.primaryOverlayId === "overlay.poc.world_action") {
    return pocStageSceneVariantIdsV1[4];
  }
  if (input.uiState.primaryOverlayId === "overlay.poc.run_summary") {
    return pocStageSceneVariantIdsV1[5];
  }
  switch (input.semantic.game.hud.phase) {
    case "morning":
    case "afternoon":
      return pocStageSceneVariantIdsV1[1];
    case "evening":
      return pocStageSceneVariantIdsV1[2];
  }
  throw new TypeError(
    `unsupported PoC presentation phase ${String(input.semantic.game.hud.phase)}`,
  );
}

function selectStageV1(input: DeepReadonly<PocRuntimePresentationProjectionInputV1>): {
  readonly stage: DeepReadonly<RuntimeStageSceneV1>;
  readonly variant: PocVariantV1;
} {
  const variantId = selectVariantIdV1(input);
  const graph = input.resolvedCatalog.sceneGraph;
  const variant = requireUniqueV1(
    graph.variants,
    (candidate) => candidate.variantId === variantId,
    `Stage variant ${variantId}`,
  );
  const scene = requireUniqueV1(
    graph.stageScenes,
    (candidate) => candidate.stageSceneId === variant.stageSceneId,
    `StageScene ${variant.stageSceneId}`,
  );
  if (!scene.variantIds.includes(variant.variantId)) {
    throw new TypeError(`unregistered PoC Stage variant ${variant.variantId}`);
  }
  if (
    !isContentRequirementAllowedV1(
      variant.content.requiredFlags,
      input.contentPreference.allowedFlags,
    )
  ) {
    throw new TypeError(`filtered required PoC Stage variant ${variant.variantId}`);
  }
  return Object.freeze({
    stage: Object.freeze({
      stageSceneId: variant.stageSceneId,
      variantId: variant.variantId,
      rendererId: variant.rendererId,
      background: Object.freeze({
        assetId: variant.backgroundAssetId,
        accessibleNameTextId: variant.accessibleNameTextId,
      }),
      layout: variant.layout,
    }),
    variant,
  });
}

function projectHeroineAppearanceV1(
  catalog: PocResolvedPresentationCatalogV1,
): DeepReadonly<RuntimeCharacterPresentationV1["appearance"]> {
  const policyLayerIds = new Set(heroineAppearanceFallbackPolicyV1.map(({ layerId }) => layerId));
  if (policyLayerIds.size !== heroineAppearanceFallbackPolicyV1.length) {
    throw new TypeError("duplicate PoC heroine fallback policy layer");
  }

  const seen = new Set<string>();
  const appearance = catalog.heroineStandardAppearance.map((pair) => {
    if (seen.has(pair.layerId)) {
      throw new TypeError(`duplicate PoC heroine appearance layer ${pair.layerId}`);
    }
    seen.add(pair.layerId);
    const policy = requireUniqueV1(
      heroineAppearanceFallbackPolicyV1,
      (candidate) => candidate.layerId === pair.layerId,
      `heroine fallback policy ${pair.layerId}`,
    );
    return Object.freeze({
      layerId: pair.layerId,
      assetId: pair.assetId,
      fallbackPolicy: policy.fallbackPolicy,
    });
  });
  for (const policy of heroineAppearanceFallbackPolicyV1) {
    if (!seen.has(policy.layerId)) {
      throw new TypeError(`extra PoC heroine fallback policy ${policy.layerId}`);
    }
  }
  return Object.freeze(appearance);
}

function projectCharactersV1(
  catalog: PocResolvedPresentationCatalogV1,
  variant: PocVariantV1,
): readonly DeepReadonly<RuntimeCharacterPresentationV1>[] {
  const appearance = projectHeroineAppearanceV1(catalog);
  return Object.freeze(
    variant.actors.map((actor) => {
      const character = requireUniqueV1(
        catalog.sceneGraph.characters,
        (candidate) => candidate.characterId === actor.characterId,
        `Character ${actor.characterId}`,
      );
      if (character.characterId !== pocHeroinePresentationIdsV1.characterId) {
        throw new TypeError(`unsupported PoC runtime Character ${character.characterId}`);
      }
      const rig = requireUniqueV1(
        catalog.sceneGraph.characterRigs,
        (candidate) => candidate.rigId === character.defaultRigId,
        `CharacterRig ${character.defaultRigId}`,
      );
      const poseId = rig.poseIds[0];
      const expressionId = rig.expressionIds[0];
      if (poseId === undefined || expressionId === undefined) {
        throw new TypeError(`incomplete PoC CharacterRig ${rig.rigId}`);
      }
      const poseOverride = rig.poseHitMapOverrides.find((candidate) => candidate.poseId === poseId);
      return Object.freeze({
        characterId: character.characterId,
        accessibleNameTextId: character.accessibleNameTextId,
        rendererId: rig.rendererId,
        rigId: rig.rigId,
        poseId,
        expressionId,
        activityId: rig.activityIds[0] ?? null,
        appearance,
        hitMapId: poseOverride?.hitMapId ?? rig.defaultHitMapId,
        anchor: actor.anchor,
        scale: actor.scale,
        staticFallbackAssetId: rig.staticFallbackAssetId,
        fallbackHitMapCompatibility: rig.fallbackHitMapCompatibility,
      }) satisfies DeepReadonly<RuntimeCharacterPresentationV1>;
    }),
  );
}

function requireBehaviorDescriptorV1(
  catalog: PocResolvedPresentationCatalogV1,
  behaviorId: InteractionBehaviorId,
) {
  return requireUniqueV1(
    catalog.sceneGraph.interactionBehaviors,
    (candidate) => candidate.behaviorId === behaviorId,
    `InteractionBehavior ${behaviorId}`,
  );
}

function projectHeroineBehaviorsV1(
  input: DeepReadonly<PocRuntimePresentationProjectionInputV1>,
  resolver: ReturnType<typeof createPocInteractionBehaviorResolverV1>,
): {
  readonly resolutionMode: "direct" | "choose";
  readonly behaviors: readonly PocRuntimeBehaviorV1[];
} {
  const repairCount = resolver.actionMatchCount("action.repair_sign_with_heroine");
  const apologyCount = resolver.actionMatchCount("action.apologize_to_heroine");
  const hasRelationshipAction = repairCount + apologyCount > 0;
  const resolveAllowedV1 = (behaviorId: InteractionBehaviorId): PocRuntimeBehaviorV1 | null => {
    const descriptor = requireBehaviorDescriptorV1(input.resolvedCatalog, behaviorId);
    if (
      !isContentRequirementAllowedV1(
        descriptor.content.requiredFlags,
        input.contentPreference.allowedFlags,
      )
    ) {
      return null;
    }
    return resolver.resolve(descriptor);
  };
  const profile = resolveAllowedV1(pocInteractionBehaviorIdsV1[0]);
  const repair = resolveAllowedV1(pocInteractionBehaviorIdsV1[1]);
  const apology = resolveAllowedV1(pocInteractionBehaviorIdsV1[2]);
  const invalidRelationshipJoin =
    repairCount > 1 ||
    apologyCount > 1 ||
    (repairCount === 1 && repair === null) ||
    (apologyCount === 1 && apology === null);
  const behaviors: PocRuntimeBehaviorV1[] = [];
  if (profile !== null) behaviors.push(profile);
  if (!invalidRelationshipJoin) {
    if (repair !== null) behaviors.push(repair);
    if (apology !== null) behaviors.push(apology);
  }
  return Object.freeze({
    resolutionMode: hasRelationshipAction ? "choose" : "direct",
    behaviors: Object.freeze(behaviors),
  });
}

function projectOrdinaryBehaviorsV1(
  input: DeepReadonly<PocRuntimePresentationProjectionInputV1>,
  behaviorIds: readonly InteractionBehaviorId[],
  resolver: ReturnType<typeof createPocInteractionBehaviorResolverV1>,
): readonly PocRuntimeBehaviorV1[] {
  const behaviors: PocRuntimeBehaviorV1[] = [];
  for (const behaviorId of behaviorIds) {
    const descriptor = requireBehaviorDescriptorV1(input.resolvedCatalog, behaviorId);
    if (
      !isContentRequirementAllowedV1(
        descriptor.content.requiredFlags,
        input.contentPreference.allowedFlags,
      )
    ) {
      continue;
    }
    const behavior = resolver.resolve(descriptor);
    if (behavior !== null) behaviors.push(behavior);
  }
  return Object.freeze(behaviors);
}

function hitMapForSurfaceV1(
  surfaceId: InteractionSurfaceId,
  characters: readonly DeepReadonly<RuntimeCharacterPresentationV1>[],
) {
  if (surfaceId !== pocInteractionSurfaceIdsV1[0] && surfaceId !== pocInteractionSurfaceIdsV1[1]) {
    return null;
  }
  const heroine = requireUniqueV1(
    characters,
    (candidate) => candidate.characterId === pocHeroinePresentationIdsV1.characterId,
    `projected Character ${pocHeroinePresentationIdsV1.characterId}`,
  );
  return heroine.hitMapId;
}

function projectInteractionSurfacesV1(
  input: DeepReadonly<PocRuntimePresentationProjectionInputV1>,
  variant: PocVariantV1,
  characters: readonly DeepReadonly<RuntimeCharacterPresentationV1>[],
): readonly PocRuntimeSurfaceV1[] {
  const resolver = createPocInteractionBehaviorResolverV1(input.semantic.actions);
  return Object.freeze(
    variant.interactionSurfaces.map((placement) => {
      const surface = requireUniqueV1(
        input.resolvedCatalog.sceneGraph.interactionSurfaces,
        (candidate) => candidate.surfaceId === placement.surfaceId,
        `InteractionSurface ${placement.surfaceId}`,
      );
      const entryMode = surface.allowedEntryModes[0];
      if (entryMode === undefined) {
        throw new TypeError(`missing PoC Interaction entry mode ${surface.surfaceId}`);
      }
      const targets = surface.targetBindings.map((binding) => {
        const target = requireUniqueV1(
          input.resolvedCatalog.sceneGraph.interactionTargets,
          (candidate) => candidate.targetId === binding.targetId,
          `InteractionTarget ${binding.targetId}`,
        );
        if (binding.openSurfaceId !== null) {
          if (!binding.allowedResolutionModes.includes("open_surface")) {
            throw new TypeError(`invalid PoC open-surface binding ${binding.targetId}`);
          }
          return Object.freeze({
            targetId: target.targetId,
            accessibleNameTextId: target.accessibleNameTextId,
            resolutionMode: "open_surface" as const,
            openSurfaceId: binding.openSurfaceId,
            behaviors: Object.freeze([]),
          }) satisfies PocRuntimeTargetV1;
        }

        if (
          surface.surfaceId === pocInteractionSurfaceIdsV1[0] &&
          target.targetId === pocInteractionTargetIdsV1[0]
        ) {
          const heroine = projectHeroineBehaviorsV1(input, resolver);
          if (!binding.allowedResolutionModes.includes(heroine.resolutionMode)) {
            throw new TypeError(`invalid PoC heroine resolution mode ${heroine.resolutionMode}`);
          }
          return Object.freeze({
            targetId: target.targetId,
            accessibleNameTextId: target.accessibleNameTextId,
            resolutionMode: heroine.resolutionMode,
            openSurfaceId: null,
            behaviors: heroine.behaviors,
          }) satisfies PocRuntimeTargetV1;
        }

        const resolutionMode = binding.allowedResolutionModes[0];
        if (resolutionMode === undefined || resolutionMode === "open_surface") {
          throw new TypeError(`missing PoC Interaction resolution mode ${binding.targetId}`);
        }
        return Object.freeze({
          targetId: target.targetId,
          accessibleNameTextId: target.accessibleNameTextId,
          resolutionMode,
          openSurfaceId: null,
          behaviors: projectOrdinaryBehaviorsV1(input, target.behaviorIds, resolver),
        }) satisfies PocRuntimeTargetV1;
      });
      return Object.freeze({
        surfaceId: surface.surfaceId,
        accessibleNameTextId: surface.accessibleNameTextId,
        entryMode,
        hitMapId: hitMapForSurfaceV1(surface.surfaceId, characters),
        targets: Object.freeze(targets),
      }) satisfies PocRuntimeSurfaceV1;
    }),
  );
}

/** Projects the frozen PoC catalog over one atomic Semantic publication. */
export function projectPocRuntimePresentationV1(
  input: DeepReadonly<PocRuntimePresentationProjectionInputV1>,
): PocProjectionV1 {
  const { stage, variant } = selectStageV1(input);
  const characters = projectCharactersV1(input.resolvedCatalog, variant);
  const interactionSurfaces = projectInteractionSurfacesV1(input, variant, characters);
  const requiredAssetIds = input.resolvedCatalog.requiredAssetIdsByVariant[variant.variantId];
  if (requiredAssetIds === undefined) {
    throw new TypeError(`missing PoC asset demand ${variant.variantId}`);
  }
  return Object.freeze({
    view: Object.freeze({
      game: input.semantic.game,
      narrative: input.semantic.narrative,
      stage,
      characters,
      interactionSurfaces,
      activeOverlayId: input.uiState.primaryOverlayId,
      activeCueId: input.uiState.activeCueId,
    }),
    requiredAssetIds,
  });
}

export const pocRuntimePresentationProjectorV1: PocRuntimePresentationProjectorV1 = Object.freeze({
  project: projectPocRuntimePresentationV1,
});
