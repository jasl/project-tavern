// SPDX-License-Identifier: MIT
import {
  parseAppearanceLayerId,
  parseAssetId,
  parseCharacterExpressionId,
  parseCharacterId,
  parseCharacterPoseId,
  parseCharacterRigId,
  parseHitMapId,
  parseLocaleId,
  parseNormalizedCoordinateV1,
  parsePositiveFiniteNumber,
  parseStageSceneId,
  parseStageSceneVariantId,
  parseTextId,
  type AssetId,
  type LocaleId,
  type ResolvedAssetManifestV1,
  type TextId,
} from "@sillymaker/base";
import {
  CharacterHostV1,
  CodeFallbackStageSceneV1,
  PaperDollCharacterRendererV1,
  StageSceneHostV1,
  StaticCharacterRendererV1,
  createCharacterRendererRegistryV1,
  type CharacterHostPropsV1,
  type CharacterRendererContributionV1,
  type CharacterRendererRegistryV1,
  type GameRendererContextV1,
  type PresentationReadPortV1,
  type RuntimeAppearanceLayerV1,
  type RuntimeCharacterPresentationV1,
  type RuntimeStageSceneV1,
  type StageBackgroundPresentationV1,
  type StageSceneHostPropsV1,
} from "@sillymaker/ui";
// @ts-expect-error The variable-length asset hook remains package-private.
import { useCharacterAssetsV1 } from "@sillymaker/ui";

type EqualV1<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;
type AssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];

interface SemanticPortV1 {
  readonly revision: number;
}

type PresentationV1 = PresentationReadPortV1<TextId, AssetId, AssetUsageV1, LocaleId, string>;
type BackgroundContextV1 = GameRendererContextV1<
  RuntimeStageSceneV1,
  SemanticPortV1,
  PresentationV1
>;
type CharacterContextV1 = GameRendererContextV1<
  RuntimeCharacterPresentationV1,
  SemanticPortV1,
  PresentationV1
>;
type RendererContextsV1 = Readonly<{
  readonly background: BackgroundContextV1;
  readonly character: CharacterContextV1;
  readonly scene_interaction: unknown;
  readonly hud: unknown;
  readonly workspace_overlay: unknown;
  readonly narrative: unknown;
  readonly system: unknown;
}>;
type HostPropsV1 = StageSceneHostPropsV1<SemanticPortV1, PresentationV1, RendererContextsV1>;
type CharacterHostPropsTestV1 = CharacterHostPropsV1<
  SemanticPortV1,
  PresentationV1,
  RendererContextsV1
>;

type BackgroundKeysV1 = ExpectV1<
  EqualV1<keyof StageBackgroundPresentationV1, "accessibleNameTextId" | "assetId">
>;
type StageKeysV1 = ExpectV1<
  EqualV1<
    keyof RuntimeStageSceneV1,
    "background" | "layout" | "rendererId" | "stageSceneId" | "variantId"
  >
>;
type HostPropKeysV1 = ExpectV1<
  EqualV1<keyof HostPropsV1, "contributions" | "presentation" | "semantic" | "stage">
>;
type RendererContextKeysV1 = ExpectV1<
  EqualV1<keyof BackgroundContextV1, "presentation" | "semantic" | "viewSlice">
>;
type AppearanceLayerKeysV1 = ExpectV1<
  EqualV1<keyof RuntimeAppearanceLayerV1, "assetId" | "fallbackPolicy" | "layerId">
>;
type CharacterKeysV1 = ExpectV1<
  EqualV1<
    keyof RuntimeCharacterPresentationV1,
    | "accessibleNameTextId"
    | "activityId"
    | "anchor"
    | "appearance"
    | "characterId"
    | "expressionId"
    | "fallbackHitMapCompatibility"
    | "hitMapId"
    | "poseId"
    | "rendererId"
    | "rigId"
    | "scale"
    | "staticFallbackAssetId"
  >
>;
type CharacterHostPropKeysV1 = ExpectV1<
  EqualV1<
    keyof CharacterHostPropsTestV1,
    "character" | "contributions" | "presentation" | "semantic"
  >
>;
type CharacterRendererContextKeysV1 = ExpectV1<
  EqualV1<keyof CharacterContextV1, "presentation" | "semantic" | "viewSlice">
>;
type CharacterContributionKeysV1 = ExpectV1<
  EqualV1<
    keyof CharacterRendererContributionV1,
    "kind" | "mapExternalTarget" | "mapStoryCue" | "mapStoryPose" | "rendererId"
  >
>;
type CharacterRegistryKeysV1 = ExpectV1<EqualV1<keyof CharacterRendererRegistryV1, "resolve">>;

const stageV1: RuntimeStageSceneV1 = {
  stageSceneId: parseStageSceneId("stage_scene.synthetic.main"),
  variantId: parseStageSceneVariantId("stage_variant.synthetic.main.default"),
  rendererId: "renderer.synthetic.background",
  background: {
    assetId: parseAssetId("asset.synthetic.background"),
    accessibleNameTextId: parseTextId("text.synthetic.background.name"),
  },
  layout: {},
};
const appearanceLayerV1: RuntimeAppearanceLayerV1 = {
  layerId: parseAppearanceLayerId("layer.synthetic.guide.body"),
  assetId: parseAssetId("asset.synthetic.guide.body"),
  fallbackPolicy: "character_fallback",
};
const characterV1: RuntimeCharacterPresentationV1 = {
  characterId: parseCharacterId("character.synthetic.guide"),
  accessibleNameTextId: parseTextId("text.synthetic.guide.name"),
  rendererId: "renderer.synthetic.paper_doll",
  rigId: parseCharacterRigId("rig.synthetic.guide"),
  poseId: parseCharacterPoseId("pose.synthetic.guide.standing"),
  expressionId: parseCharacterExpressionId("expression.synthetic.guide.neutral"),
  activityId: null,
  appearance: [appearanceLayerV1],
  hitMapId: parseHitMapId("hit_map.synthetic.guide.standing"),
  anchor: {
    x: parseNormalizedCoordinateV1(0.5),
    y: parseNormalizedCoordinateV1(0.8),
  },
  scale: parsePositiveFiniteNumber(1),
  staticFallbackAssetId: parseAssetId("asset.synthetic.guide.static"),
  fallbackHitMapCompatibility: "compatible",
};
declare const propsV1: HostPropsV1;
declare const characterPropsV1: CharacterHostPropsTestV1;
declare const presentationV1: PresentationV1;
declare const semanticV1: SemanticPortV1;

StageSceneHostV1({
  stage: stageV1,
  contributions: propsV1.contributions,
  semantic: semanticV1,
  presentation: presentationV1,
});
CodeFallbackStageSceneV1({
  accessibleName: "合成场景",
  fallbackToken: "fallback.synthetic.background",
});
CharacterHostV1({
  character: characterV1,
  contributions: characterPropsV1.contributions,
  semantic: semanticV1,
  presentation: presentationV1,
});
StaticCharacterRendererV1({
  viewSlice: characterV1,
  semantic: semanticV1,
  presentation: presentationV1,
});
PaperDollCharacterRendererV1({
  viewSlice: characterV1,
  semantic: semanticV1,
  presentation: presentationV1,
});
createCharacterRendererRegistryV1([
  {
    rendererId: "renderer.synthetic.paper_doll",
    kind: "paper_doll",
  },
]).resolve("renderer.synthetic.paper_doll");

stageV1.stageSceneId satisfies ReturnType<typeof parseStageSceneId>;
stageV1.variantId satisfies ReturnType<typeof parseStageSceneVariantId>;

interface SyntheticGameplayViewV1 {
  readonly count: number;
}

// @ts-expect-error UI runtime Stage is not a Gameplay view.
const gameplayV1: SyntheticGameplayViewV1 = stageV1;
// @ts-expect-error Stage host never exposes Session.
stageV1.gameSession;
// @ts-expect-error Stage host never exposes Snapshot.
stageV1.snapshot;
// @ts-expect-error Stage host never exposes Gameplay queries.
stageV1.queries;
// @ts-expect-error Stage host never exposes Calendar.
stageV1.calendar;
// @ts-expect-error characters arrive through a later presentation slice.
stageV1.actors;
// @ts-expect-error interaction surfaces arrive through a later presentation slice.
stageV1.interactionSurfaces;
// @ts-expect-error runtime transport paths stay behind the asset read port.
stageV1.background.runtimePath;
// @ts-expect-error Character projection never exposes Session.
characterV1.gameSession;
// @ts-expect-error Character projection never exposes Snapshot.
characterV1.snapshot;
// @ts-expect-error Character projection never exposes Gameplay queries.
characterV1.queries;
// @ts-expect-error Character projection never exposes Calendar.
characterV1.calendar;
// @ts-expect-error Character fallback is data, not a renderer-to-renderer edge.
characterV1.staticFallbackRendererId;
// @ts-expect-error Character projection never carries executable interaction callbacks.
characterV1.onActivate;
// @ts-expect-error Asset transport paths stay behind the presentation read port.
appearanceLayerV1.runtimePath;
// @ts-expect-error Adapter metadata is not a second React component registry.
(({}) as CharacterRendererContributionV1).component;
// @ts-expect-error Cue execution is not part of the metadata mapping seam.
(({}) as CharacterRendererContributionV1).playCue;
// @ts-expect-error Cue clearing is not part of the metadata mapping seam.
(({}) as CharacterRendererContributionV1).clearCue;

parseLocaleId("zh-CN");
gameplayV1;
useCharacterAssetsV1;

export type {
  AppearanceLayerKeysV1,
  BackgroundKeysV1,
  CharacterContributionKeysV1,
  CharacterHostPropKeysV1,
  CharacterKeysV1,
  CharacterRegistryKeysV1,
  CharacterRendererContextKeysV1,
  HostPropKeysV1,
  RendererContextKeysV1,
  StageKeysV1,
};
