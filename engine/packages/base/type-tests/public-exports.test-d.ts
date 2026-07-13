// SPDX-License-Identifier: MIT
import type {
  AppearanceLayerId,
  AssetId,
  CharacterActivityId,
  CharacterDescriptorV1,
  CharacterExpressionId,
  CharacterId,
  CharacterPlacementV1,
  CharacterPoseId,
  CharacterRigDescriptorV1,
  CharacterRigId,
  ContentMaturityFlagBitV1,
  ContentMaturityFlagDescriptorV1,
  ContentMaturityFlagId,
  ContentMaturityFlagsV1,
  ContentMaturityPolicyV1,
  ContentPreferencePortV1,
  ContentPreferencePresetDescriptorV1,
  ContentPreferencePresetId,
  ContentPreferenceSetResultV1,
  ContentPreferenceV1,
  ContentRequirementV1,
  GameCommandExecutorV1,
  GameDebugCommandExecutorV1,
  GameDebugCommandValidationResultV1,
  GameSimulationTypeMapV1,
  GameSimulationTypeWitnessV1,
  GameSimulationV1,
  GameSnapshotEnvelopeV1,
  GameplayModuleBindingV1,
  GameplayModuleDescriptorV1,
  GameplayModuleSurfaceV1,
  GameplayModuleTupleForSimulationV1,
  HitAreaDescriptorV1,
  HitAreaId,
  HitMapDescriptorV1,
  HitMapId,
  HotfixEntryV1,
  HotfixInstallContextV1,
  InteractionActivationV1,
  InteractionBehaviorDescriptorV1,
  InteractionBehaviorId,
  InteractionEntryModeV1,
  InteractionResolutionModeV1,
  InteractionSurfaceDescriptorV1,
  InteractionSurfaceId,
  InteractionSurfacePlacementV1,
  InteractionSurfaceTargetBindingV1,
  InteractionTargetDescriptorV1,
  InteractionTargetId,
  LocaleId,
  LocalizedTextCatalogV1,
  ModuleId,
  NormalizedCoordinateV1,
  NormalizedExtentV1,
  NormalizedPointV1,
  NormalizedShapeV1,
  PositiveFiniteNumber,
  PatchReplacementPortV1,
  PatchReplacementValuesV1,
  PatchSurfaceV1,
  PresentationCatalogValidationCodeV1,
  PresentationCatalogValidationErrorV1,
  PresentationProviderId,
  ResolvedGameV1,
  StageSceneDescriptorV1,
  StageSceneGraphV1,
  StageSceneId,
  StageScenePresentationV1,
  StageSceneVariantId,
  StateContractManifestV1,
  StateContractModuleManifestV1,
  StateContractSchemaManifestV1,
  StateContractStableReferenceSetV1,
  StatefulGameplayModuleBindingV1,
  StatelessGameplayModuleBindingV1,
  StateSlotId,
  StoryToolingEntryV1,
  StoryToolingSupportV1,
  TextCatalogSetV1,
  TextId,
} from "@sillymaker/base";
import {
  combineContentMaturityFlagsV1,
  definePatchSlot,
  definePresentationPatchSurface,
  defineSimulationPatchSurface,
  digestBytes,
  defineGameSimulation,
  defineGameplayModule,
  emptyContentMaturityFlagsV1,
  findUnknownContentMaturityFlagsV1,
  isContentRequirementAllowedV1,
  parseAppearanceLayerId,
  parseAssetId,
  parseCharacterActivityId,
  parseCharacterExpressionId,
  parseCharacterId,
  parseCharacterPoseId,
  parseCharacterRigId,
  parseContentMaturityFlagBitV1,
  parseContentMaturityFlagId,
  parseContentMaturityFlagsV1,
  parseContentMaturityPolicyV1,
  parseContentPreferencePresetId,
  parseContentPreferenceV1,
  parseHitAreaId,
  parseHitMapId,
  parseInteractionBehaviorId,
  parseInteractionSurfaceId,
  parseInteractionTargetId,
  parseLocaleId,
  parseModuleId,
  parseNormalizedCoordinateV1,
  parseNormalizedExtentV1,
  parsePositiveFiniteNumber,
  parsePresentationProviderId,
  parsePositiveSafeInteger,
  parseStageSceneGraphV1,
  parseStageSceneId,
  parseStageSceneVariantId,
  parseStateSlotId,
  parseTextCatalogSetV1,
  parseTextId,
  requireContentPreferencePresetV1,
  setContentMaturityFlagV1,
  stageSceneGraphSchemaV1,
} from "@sillymaker/base";

export declare const publicSnapshot: GameSnapshotEnvelopeV1<unknown, unknown>;
export const publicModuleId: ModuleId = parseModuleId("synthetic.parity");
export const publicStateSlotId: StateSlotId = parseStateSlotId("simulation.counter");
export const publicLocaleId: LocaleId = parseLocaleId("zh-CN");
export const publicTextCatalogSetV1: TextCatalogSetV1 = parseTextCatalogSetV1({
  defaultLocale: "zh-CN",
  catalogs: [
    {
      locale: "zh-CN",
      fallbackLocale: null,
      entries: [{ textId: "text.synthetic.title", text: "标题" }],
    },
  ],
});
export declare const publicDefineGameSimulation: typeof defineGameSimulation;
export declare const publicDefineGameplayModule: typeof defineGameplayModule;

const typedSimulationPatchSurfaceV1 = defineSimulationPatchSurface({
  delta: definePatchSlot({
    symbolId: "value.synthetic.delta",
    kind: "value",
    contractRevision: parsePositiveSafeInteger(1),
    defaultProviderSourceDigest: digestBytes(Uint8Array.of(1)),
    defaultValue: 1 as number,
  }),
});
const typedPresentationPatchSurfaceV1 = definePresentationPatchSurface({
  title: definePatchSlot({
    symbolId: "text.synthetic.title",
    kind: "text",
    contractRevision: parsePositiveSafeInteger(1),
    defaultProviderSourceDigest: digestBytes(Uint8Array.of(2)),
    defaultValue: "Before" as string,
  }),
});
export const typedHotfixV1: HotfixEntryV1<
  typeof typedSimulationPatchSurfaceV1,
  typeof typedPresentationPatchSurfaceV1
> = {
  manifest: {
    identity: { id: "hotfix.synthetic.typed", revision: parsePositiveSafeInteger(1) },
    targetStoryId: "story.synthetic.typed",
    targetStoryRevision: parsePositiveSafeInteger(1),
    targets: [],
    requires: [],
    conflicts: [],
    supersedes: [],
  },
  sourceDigest: digestBytes(Uint8Array.of(3)),
  install(context) {
    context.simulation.replace("value.synthetic.delta", 2);
    context.presentation.replace("text.synthetic.title", "After");
    // @ts-expect-error Presentation symbols cannot be replaced through the Simulation surface.
    context.simulation.replace("text.synthetic.title", "After");
    // @ts-expect-error Simulation symbols cannot be replaced through the Presentation surface.
    context.presentation.replace("value.synthetic.delta", 2);
    // @ts-expect-error Replacement values must match the selected symbol.
    context.simulation.replace("value.synthetic.delta", "wrong");
  },
};

export const publicPresentationValuesV1 = {
  combineContentMaturityFlagsV1,
  emptyContentMaturityFlagsV1,
  findUnknownContentMaturityFlagsV1,
  isContentRequirementAllowedV1,
  parseAppearanceLayerId,
  parseAssetId,
  parseCharacterActivityId,
  parseCharacterExpressionId,
  parseCharacterId,
  parseCharacterPoseId,
  parseCharacterRigId,
  parseContentMaturityFlagBitV1,
  parseContentMaturityFlagId,
  parseContentMaturityFlagsV1,
  parseContentMaturityPolicyV1,
  parseContentPreferencePresetId,
  parseContentPreferenceV1,
  parseHitAreaId,
  parseHitMapId,
  parseInteractionBehaviorId,
  parseInteractionSurfaceId,
  parseInteractionTargetId,
  parseLocaleId,
  parseNormalizedCoordinateV1,
  parseNormalizedExtentV1,
  parsePositiveFiniteNumber,
  parsePresentationProviderId,
  parseStageSceneGraphV1,
  parseStageSceneId,
  parseStageSceneVariantId,
  parseTextCatalogSetV1,
  parseTextId,
  requireContentPreferencePresetV1,
  setContentMaturityFlagV1,
  stageSceneGraphSchemaV1,
} as const;

export type PublicGameplayTypesV1 = {
  commandExecutor: GameCommandExecutorV1<unknown, unknown, unknown, unknown>;
  debugCommandExecutor: GameDebugCommandExecutorV1<unknown, unknown, unknown, unknown, unknown>;
  debugValidation: GameDebugCommandValidationResultV1<unknown>;
  descriptor: GameplayModuleDescriptorV1;
  module: GameplayModuleBindingV1;
  moduleSurface: GameplayModuleSurfaceV1<GameSimulationTypeMapV1, unknown, unknown, unknown>;
  moduleTuple: GameplayModuleTupleForSimulationV1<GameSimulationTypeMapV1, readonly []>;
  simulation: GameSimulationV1<
    GameSimulationTypeMapV1,
    readonly GameplayModuleBindingV1[],
    GameCommandExecutorV1<unknown, unknown, unknown, unknown>,
    GameDebugCommandExecutorV1<unknown, unknown, unknown, unknown, unknown>
  >;
  stateful: StatefulGameplayModuleBindingV1<
    GameSimulationTypeMapV1,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    { readonly payload: unknown; readonly facts: readonly unknown[] },
    unknown,
    unknown
  >;
  stateless: StatelessGameplayModuleBindingV1<
    GameSimulationTypeMapV1,
    unknown,
    unknown,
    unknown,
    unknown
  >;
  typeMap: GameSimulationTypeMapV1;
  witness: GameSimulationTypeWitnessV1<GameSimulationTypeMapV1>;
};

export type PublicPresentationTypesV1 = {
  appearanceLayerId: AppearanceLayerId;
  assetId: AssetId;
  character: CharacterDescriptorV1;
  characterActivityId: CharacterActivityId;
  characterExpressionId: CharacterExpressionId;
  characterId: CharacterId;
  characterPlacement: CharacterPlacementV1;
  characterPoseId: CharacterPoseId;
  characterRig: CharacterRigDescriptorV1;
  characterRigId: CharacterRigId;
  contentFlag: ContentMaturityFlagDescriptorV1;
  contentFlagBit: ContentMaturityFlagBitV1;
  contentFlagId: ContentMaturityFlagId;
  contentFlags: ContentMaturityFlagsV1;
  contentPolicy: ContentMaturityPolicyV1;
  contentPreference: ContentPreferenceV1;
  contentPreferencePort: ContentPreferencePortV1;
  contentPreferenceResult: ContentPreferenceSetResultV1;
  contentPreset: ContentPreferencePresetDescriptorV1;
  contentPresetId: ContentPreferencePresetId;
  contentRequirement: ContentRequirementV1;
  hitArea: HitAreaDescriptorV1;
  hitAreaId: HitAreaId;
  hitMap: HitMapDescriptorV1;
  hitMapId: HitMapId;
  interactionActivation: InteractionActivationV1;
  interactionBehavior: InteractionBehaviorDescriptorV1;
  interactionBehaviorId: InteractionBehaviorId;
  interactionEntryMode: InteractionEntryModeV1;
  interactionResolutionMode: InteractionResolutionModeV1;
  interactionSurface: InteractionSurfaceDescriptorV1;
  interactionSurfaceId: InteractionSurfaceId;
  interactionSurfacePlacement: InteractionSurfacePlacementV1;
  interactionSurfaceTargetBinding: InteractionSurfaceTargetBindingV1;
  interactionTarget: InteractionTargetDescriptorV1;
  interactionTargetId: InteractionTargetId;
  localeId: LocaleId;
  localizedTextCatalog: LocalizedTextCatalogV1;
  normalizedCoordinate: NormalizedCoordinateV1;
  normalizedExtent: NormalizedExtentV1;
  normalizedPoint: NormalizedPointV1;
  normalizedShape: NormalizedShapeV1;
  positiveFiniteNumber: PositiveFiniteNumber;
  hotfixInstallContext: HotfixInstallContextV1<
    typeof typedSimulationPatchSurfaceV1,
    typeof typedPresentationPatchSurfaceV1
  >;
  patchReplacementPort: PatchReplacementPortV1<
    PatchReplacementValuesV1<typeof typedPresentationPatchSurfaceV1>
  >;
  patchSurface: PatchSurfaceV1<Readonly<Record<never, never>>>;
  presentationError: PresentationCatalogValidationErrorV1;
  presentationErrorCode: PresentationCatalogValidationCodeV1;
  presentationProviderId: PresentationProviderId;
  resolvedGame: ResolvedGameV1<unknown, unknown, unknown, unknown, unknown>;
  stageScene: StageSceneDescriptorV1;
  stageSceneGraph: StageSceneGraphV1;
  stageSceneId: StageSceneId;
  stageScenePresentation: StageScenePresentationV1;
  stageSceneVariantId: StageSceneVariantId;
  stateContractManifest: StateContractManifestV1;
  stateContractModuleManifest: StateContractModuleManifestV1;
  stateContractSchemaManifest: StateContractSchemaManifestV1;
  stateContractStableReferenceSet: StateContractStableReferenceSetV1;
  toolingEntry: StoryToolingEntryV1<unknown>;
  toolingSupport: StoryToolingSupportV1<unknown, unknown>;
  textCatalogSet: TextCatalogSetV1;
  textId: TextId;
};

// @ts-expect-error package internals are intentionally not exported
export type ForbiddenDeepImport = typeof import("@sillymaker/base/src/contracts/snapshot.js");
