// SPDX-License-Identifier: MIT
import {
  parseAssetId,
  parseLocaleId,
  parseStageSceneId,
  parseStageSceneVariantId,
  parseTextId,
  type AssetId,
  type LocaleId,
  type ResolvedAssetManifestV1,
  type TextId,
} from "@sillymaker/base";
import {
  CodeFallbackStageSceneV1,
  StageSceneHostV1,
  type GameRendererContextV1,
  type PresentationReadPortV1,
  type RuntimeStageSceneV1,
  type StageBackgroundPresentationV1,
  type StageSceneHostPropsV1,
} from "@sillymaker/ui";

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
type RendererContextsV1 = Readonly<{
  readonly background: BackgroundContextV1;
  readonly character: unknown;
  readonly scene_interaction: unknown;
  readonly hud: unknown;
  readonly workspace_overlay: unknown;
  readonly narrative: unknown;
  readonly system: unknown;
}>;
type HostPropsV1 = StageSceneHostPropsV1<SemanticPortV1, PresentationV1, RendererContextsV1>;

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
declare const propsV1: HostPropsV1;
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

parseLocaleId("zh-CN");
gameplayV1;

export type { BackgroundKeysV1, HostPropKeysV1, RendererContextKeysV1, StageKeysV1 };
