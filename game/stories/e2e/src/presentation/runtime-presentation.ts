// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  isContentRequirementAllowedV1,
  parseStageSceneId,
  parseStageSceneVariantId,
} from "@sillymaker/base";
import type {
  AssetId,
  DeepReadonly,
  InteractionBehaviorId,
  InteractionSurfaceId,
  PresentationProviderId,
} from "@sillymaker/base";
import type {
  InteractionSessionStateV1,
  RuntimeCharacterPresentationV1,
  RuntimeInteractionBehaviorV1,
  RuntimeInteractionSurfaceV1,
  RuntimeInteractionTargetV1,
  RuntimePresentationProjectionInputV1,
  RuntimePresentationProjectionV1,
  RuntimePresentationPublicationV1,
  RuntimeStageSceneV1,
} from "@sillymaker/ui";

import type { E2eGameViewV1 } from "../gameplay/contracts/index.js";
import type {
  E2eSemanticActionDescriptorV1,
  E2eSemanticInvocationV1,
  E2eSemanticPublicationV1,
} from "../runtime/e2e-semantic-game-port.js";
import { e2eInteractionFixtureV1 } from "./interaction-fixture.js";
import type { E2eSceneGraphV1 } from "./scene-graph.js";

export type {
  E2eSemanticActionDescriptorV1,
  E2eSemanticGamePortV1,
  E2eSemanticPublicationV1,
} from "../runtime/e2e-semantic-game-port.js";

export type E2ePresentationRouteV1 = "main_menu" | "play";

export function isE2eNarrativeOpenV1(status: E2eGameViewV1["flow"]["status"]): boolean {
  return status === "choosing" || status === "blocked";
}

export interface E2ePresentationUiStateV1 {
  readonly route: E2ePresentationRouteV1;
  readonly primaryOverlayId: string | null;
  readonly interaction: InteractionSessionStateV1;
  readonly activeCueId: string | null;
}

export interface E2eRuntimePresentationViewV1 {
  readonly route: E2ePresentationRouteV1;
  readonly game: DeepReadonly<E2eGameViewV1>;
  readonly narrative: null;
  readonly stage: RuntimeStageSceneV1;
  readonly characters: readonly RuntimeCharacterPresentationV1[];
  readonly interactionSurfaces: readonly RuntimeInteractionSurfaceV1<
    E2eSemanticActionDescriptorV1,
    E2eSemanticInvocationV1
  >[];
  readonly activeOverlayId: string | null;
  readonly activeCueId: string | null;
}

export type E2eRuntimePresentationPublicationV1 = RuntimePresentationPublicationV1<
  E2eSemanticPublicationV1,
  E2eRuntimePresentationViewV1,
  AssetId
>;

type E2eProjectionInputV1 = RuntimePresentationProjectionInputV1<
  E2eSemanticPublicationV1,
  E2eSceneGraphV1,
  E2ePresentationUiStateV1
>;

type E2eProjectionV1 = RuntimePresentationProjectionV1<E2eRuntimePresentationViewV1, AssetId>;

type E2eVariantV1 = DeepReadonly<E2eSceneGraphV1["variants"][number]>;
type E2eIncrementDescriptorV1 = Extract<
  E2eSemanticActionDescriptorV1,
  { readonly actionId: "action.e2e.increment" }
>;

const emptyAppearanceV1 = Object.freeze([]) satisfies readonly [];
const mainStageSceneIdV1 = parseStageSceneId("stage_scene.e2e.main");
const summaryStageSceneIdV1 = parseStageSceneId("stage_scene.e2e.summary");
const mainDefaultVariantIdV1 = parseStageSceneVariantId("stage_variant.e2e.main.default");
const mainActiveVariantIdV1 = parseStageSceneVariantId("stage_variant.e2e.main.active");
const summaryDefaultVariantIdV1 = parseStageSceneVariantId("stage_variant.e2e.summary.default");

function requireUniqueV1<T>(
  values: readonly T[],
  predicate: (value: T) => boolean,
  label: string,
): T {
  let match: T | undefined;
  for (const value of values) {
    if (!predicate(value)) continue;
    if (match !== undefined) throw new TypeError(`duplicate E2E ${label}`);
    match = value;
  }
  if (match === undefined) throw new TypeError(`missing E2E ${label}`);
  return match;
}

function requireIncrementDescriptorV1(
  actions: readonly DeepReadonly<E2eSemanticActionDescriptorV1>[],
): DeepReadonly<E2eIncrementDescriptorV1> {
  return requireUniqueV1(
    actions.filter(
      (action): action is DeepReadonly<E2eIncrementDescriptorV1> =>
        action.actionId === "action.e2e.increment",
    ),
    () => true,
    "increment Semantic descriptor",
  );
}

function requireIncrementInvocationV1(
  descriptor: DeepReadonly<E2eIncrementDescriptorV1>,
): DeepReadonly<E2eSemanticInvocationV1> {
  if (descriptor.options.length !== 1) {
    throw new TypeError("invalid E2E increment Semantic options");
  }
  const invocation = descriptor.options[0];
  if (invocation === undefined || invocation.actionId !== descriptor.actionId) {
    throw new TypeError("invalid E2E increment Semantic invocation");
  }
  return invocation;
}

function selectStageV1(input: DeepReadonly<E2eProjectionInputV1>): {
  readonly stage: DeepReadonly<RuntimeStageSceneV1>;
  readonly variant: E2eVariantV1;
} {
  const stageSceneId = input.semantic.game.terminal ? summaryStageSceneIdV1 : mainStageSceneIdV1;
  const variantId = input.semantic.game.terminal
    ? summaryDefaultVariantIdV1
    : input.semantic.game.flow.status === "idle"
      ? mainDefaultVariantIdV1
      : mainActiveVariantIdV1;
  const scene = requireUniqueV1(
    input.resolvedCatalog.stageScenes,
    (candidate) => candidate.stageSceneId === stageSceneId,
    `StageScene ${stageSceneId}`,
  );
  if (!scene.variantIds.some((candidate) => candidate === variantId)) {
    throw new TypeError(`missing E2E StageScene variant ${variantId}`);
  }
  const variant = requireUniqueV1(
    input.resolvedCatalog.variants,
    (candidate) => candidate.stageSceneId === stageSceneId && candidate.variantId === variantId,
    `Stage variant ${variantId}`,
  );
  if (
    !isContentRequirementAllowedV1(
      variant.content.requiredFlags,
      input.contentPreference.allowedFlags,
    )
  ) {
    throw new TypeError(`filtered required E2E Stage variant ${variantId}`);
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

function projectCharactersV1(
  catalog: DeepReadonly<E2eSceneGraphV1>,
  variant: E2eVariantV1,
): readonly DeepReadonly<RuntimeCharacterPresentationV1>[] {
  return Object.freeze(
    variant.actors.map((actor) => {
      const character = requireUniqueV1(
        catalog.characters,
        (candidate) => candidate.characterId === actor.characterId,
        `Character ${actor.characterId}`,
      );
      const rig = requireUniqueV1(
        catalog.characterRigs,
        (candidate) => candidate.rigId === character.defaultRigId,
        `CharacterRig ${character.defaultRigId}`,
      );
      const poseId = rig.poseIds[0];
      const expressionId = rig.expressionIds[0];
      if (poseId === undefined || expressionId === undefined) {
        throw new TypeError(`incomplete E2E CharacterRig ${rig.rigId}`);
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
        appearance: emptyAppearanceV1,
        hitMapId: poseOverride?.hitMapId ?? rig.defaultHitMapId,
        anchor: actor.anchor,
        scale: actor.scale,
        staticFallbackAssetId: rig.staticFallbackAssetId,
        fallbackHitMapCompatibility: rig.fallbackHitMapCompatibility,
      }) satisfies DeepReadonly<RuntimeCharacterPresentationV1>;
    }),
  );
}

function semanticProviderV1(providerId: PresentationProviderId) {
  return e2eInteractionFixtureV1.semanticProviders.filter(
    (candidate) => candidate.providerId === providerId,
  );
}

function cueProviderV1(providerId: PresentationProviderId) {
  return e2eInteractionFixtureV1.cueProviders.filter(
    (candidate) => candidate.providerId === providerId,
  );
}

function projectBehaviorV1(
  behaviorId: InteractionBehaviorId,
  catalog: DeepReadonly<E2eSceneGraphV1>,
  increment: DeepReadonly<E2eIncrementDescriptorV1>,
  incrementInvocation: DeepReadonly<E2eSemanticInvocationV1>,
): {
  readonly behavior: DeepReadonly<
    RuntimeInteractionBehaviorV1<E2eSemanticActionDescriptorV1, E2eSemanticInvocationV1>
  >;
  readonly cueId: string | null;
  readonly cueAssetId: AssetId | null;
} {
  const descriptor = requireUniqueV1(
    catalog.interactionBehaviors,
    (candidate) => candidate.behaviorId === behaviorId,
    `InteractionBehavior ${behaviorId}`,
  );
  const semanticProviders = semanticProviderV1(descriptor.providerId);
  const cueProviders = cueProviderV1(descriptor.providerId);
  if (semanticProviders.length + cueProviders.length !== 1) {
    throw new TypeError(`invalid E2E Interaction provider ${descriptor.providerId}`);
  }

  const semanticProvider = semanticProviders[0];
  if (semanticProvider !== undefined) {
    if (semanticProvider.actionId !== increment.actionId) {
      throw new TypeError(`invalid E2E Semantic provider ${semanticProvider.providerId}`);
    }
    return Object.freeze({
      behavior: Object.freeze({
        behaviorId: descriptor.behaviorId,
        nameTextId: descriptor.nameTextId,
        descriptionTextId: descriptor.descriptionTextId,
        requiredFlags: descriptor.content.requiredFlags,
        isDefault: true,
        route: Object.freeze({
          kind: "semantic_invocation",
          descriptor: increment,
          invocation: incrementInvocation,
        }),
      }),
      cueId: null,
      cueAssetId: null,
    });
  }

  const cueProvider = cueProviders[0];
  if (
    cueProvider === undefined ||
    cueProvider.behaviorId !== descriptor.behaviorId ||
    cueProvider.requiredFlags !== descriptor.content.requiredFlags
  ) {
    throw new TypeError(`invalid E2E cue provider ${descriptor.providerId}`);
  }
  return Object.freeze({
    behavior: Object.freeze({
      behaviorId: descriptor.behaviorId,
      nameTextId: descriptor.nameTextId,
      descriptionTextId: descriptor.descriptionTextId,
      requiredFlags: descriptor.content.requiredFlags,
      isDefault: false,
      route: Object.freeze({
        kind: "presentation_intent",
        intent: Object.freeze({
          kind: "presentation.play_cue",
          cueId: cueProvider.cueId,
        }),
      }),
    }),
    cueId: cueProvider.cueId,
    cueAssetId: cueProvider.assetId,
  });
}

function hitMapForSurfaceV1(
  surfaceId: InteractionSurfaceId,
  characters: readonly DeepReadonly<RuntimeCharacterPresentationV1>[],
) {
  const binding = requireUniqueV1(
    e2eInteractionFixtureV1.surfaceCharacterBindings,
    (candidate) => candidate.surfaceId === surfaceId,
    `surface-character binding ${surfaceId}`,
  );
  const character = requireUniqueV1(
    characters,
    (candidate) => candidate.characterId === binding.characterId,
    `projected Character ${binding.characterId}`,
  );
  return character.hitMapId;
}

function projectInteractionSurfacesV1(
  input: DeepReadonly<E2eProjectionInputV1>,
  variant: E2eVariantV1,
  characters: readonly DeepReadonly<RuntimeCharacterPresentationV1>[],
  increment: DeepReadonly<E2eIncrementDescriptorV1>,
): {
  readonly surfaces: readonly DeepReadonly<
    RuntimeInteractionSurfaceV1<E2eSemanticActionDescriptorV1, E2eSemanticInvocationV1>
  >[];
  readonly cueIds: readonly string[];
  readonly cueAssetIds: readonly AssetId[];
} {
  const incrementInvocation = requireIncrementInvocationV1(increment);
  const cueIds: string[] = [];
  const cueAssetIds: AssetId[] = [];
  const surfaces = variant.interactionSurfaces.map((placement) => {
    const surface = requireUniqueV1(
      input.resolvedCatalog.interactionSurfaces,
      (candidate) => candidate.surfaceId === placement.surfaceId,
      `InteractionSurface ${placement.surfaceId}`,
    );
    const entryMode = surface.allowedEntryModes[0];
    if (entryMode === undefined) {
      throw new TypeError(`missing E2E Interaction entry mode ${surface.surfaceId}`);
    }
    const targets = surface.targetBindings.map((binding) => {
      const target = requireUniqueV1(
        input.resolvedCatalog.interactionTargets,
        (candidate) => candidate.targetId === binding.targetId,
        `InteractionTarget ${binding.targetId}`,
      );
      const resolutionMode = binding.allowedResolutionModes[0];
      if (resolutionMode === undefined) {
        throw new TypeError(`missing E2E Interaction resolution mode ${binding.targetId}`);
      }
      const behaviors: Array<
        DeepReadonly<
          RuntimeInteractionBehaviorV1<E2eSemanticActionDescriptorV1, E2eSemanticInvocationV1>
        >
      > = [];
      for (const behaviorId of target.behaviorIds) {
        const descriptor = requireUniqueV1(
          input.resolvedCatalog.interactionBehaviors,
          (candidate) => candidate.behaviorId === behaviorId,
          `InteractionBehavior ${behaviorId}`,
        );
        const projected = projectBehaviorV1(
          behaviorId,
          input.resolvedCatalog,
          increment,
          incrementInvocation,
        );
        if (
          !isContentRequirementAllowedV1(
            descriptor.content.requiredFlags,
            input.contentPreference.allowedFlags,
          )
        ) {
          continue;
        }
        behaviors.push(projected.behavior);
        if (projected.cueId !== null) cueIds.push(projected.cueId);
        if (projected.cueAssetId !== null) cueAssetIds.push(projected.cueAssetId);
      }
      if (resolutionMode === "direct") {
        const defaultCount = behaviors.filter((behavior) => behavior.isDefault).length;
        if (defaultCount !== 1) {
          throw new TypeError(`invalid E2E direct behavior count ${target.targetId}`);
        }
      }
      return Object.freeze({
        targetId: target.targetId,
        accessibleNameTextId: target.accessibleNameTextId,
        resolutionMode,
        openSurfaceId: binding.openSurfaceId,
        behaviors: Object.freeze(behaviors),
      }) satisfies DeepReadonly<
        RuntimeInteractionTargetV1<E2eSemanticActionDescriptorV1, E2eSemanticInvocationV1>
      >;
    });
    return Object.freeze({
      surfaceId: surface.surfaceId,
      accessibleNameTextId: surface.accessibleNameTextId,
      entryMode,
      hitMapId: hitMapForSurfaceV1(surface.surfaceId, characters),
      targets: Object.freeze(targets),
    }) satisfies DeepReadonly<
      RuntimeInteractionSurfaceV1<E2eSemanticActionDescriptorV1, E2eSemanticInvocationV1>
    >;
  });
  return Object.freeze({
    surfaces: Object.freeze(surfaces),
    cueIds: Object.freeze(cueIds),
    cueAssetIds: Object.freeze(cueAssetIds),
  });
}

function appendRequiredAssetV1(assetIds: AssetId[], assetId: AssetId | null): void {
  if (assetId === null || assetIds.includes(assetId)) return;
  assetIds.push(assetId);
}

/** Projects one immutable renderer view from the current atomic Semantic publication. */
export function projectE2eRuntimePresentationV1(
  input: DeepReadonly<E2eProjectionInputV1>,
): E2eProjectionV1 {
  const increment = requireIncrementDescriptorV1(input.semantic.actions);
  const { stage, variant } = selectStageV1(input);
  const characters = projectCharactersV1(input.resolvedCatalog, variant);
  const interaction = projectInteractionSurfacesV1(input, variant, characters, increment);
  const requiredAssetIds: AssetId[] = [];
  appendRequiredAssetV1(requiredAssetIds, stage.background.assetId);
  for (const cueAssetId of interaction.cueAssetIds) {
    appendRequiredAssetV1(requiredAssetIds, cueAssetId);
  }
  for (const character of characters) {
    for (const appearance of character.appearance) {
      appendRequiredAssetV1(requiredAssetIds, appearance.assetId);
    }
    appendRequiredAssetV1(requiredAssetIds, character.staticFallbackAssetId);
  }
  const activeCueId = interaction.cueIds.includes(input.uiState.activeCueId ?? "")
    ? input.uiState.activeCueId
    : null;
  return Object.freeze({
    view: Object.freeze({
      route: input.uiState.route,
      game: input.semantic.game,
      narrative: input.semantic.narrative,
      stage,
      characters,
      interactionSurfaces: interaction.surfaces,
      activeOverlayId: input.uiState.primaryOverlayId,
      activeCueId,
    }),
    requiredAssetIds: Object.freeze(requiredAssetIds),
  });
}
