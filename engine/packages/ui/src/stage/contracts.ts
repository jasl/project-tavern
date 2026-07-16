// SPDX-License-Identifier: MIT
import type {
  AssetId,
  DeepReadonly,
  LocaleId,
  ResolvedAssetManifestV1,
  StageSceneId,
  StageSceneVariantId,
  StrictJsonObjectV1,
  TextId,
} from "@sillymaker/base";

import type { PresentationReadPortV1 } from "../assets/presentation-read-port.js";
import type {
  GameRendererContextV1,
  UiContributionRegistryV1,
  UiRendererNamespaceV1,
} from "../contributions/types.js";

type StageAssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];

export type StagePresentationReadPortV1 = PresentationReadPortV1<
  TextId,
  AssetId,
  StageAssetUsageV1,
  LocaleId,
  string
>;

export interface StageBackgroundPresentationV1 {
  readonly assetId: AssetId;
  readonly accessibleNameTextId: TextId;
}

export interface RuntimeStageSceneV1 {
  readonly stageSceneId: StageSceneId;
  readonly variantId: StageSceneVariantId;
  readonly rendererId: string;
  readonly background: StageBackgroundPresentationV1;
  readonly layout: StrictJsonObjectV1;
}

export type StageSceneHostRendererContextsV1<
  TSemanticPort,
  TPresentation,
  TContexts extends Readonly<Record<UiRendererNamespaceV1, unknown>>,
> = Readonly<
  Omit<TContexts, "background"> & {
    readonly background: GameRendererContextV1<RuntimeStageSceneV1, TSemanticPort, TPresentation>;
  }
>;

export interface StageSceneHostPropsV1<
  TSemanticPort,
  TPresentation extends StagePresentationReadPortV1,
  TContexts extends Readonly<Record<UiRendererNamespaceV1, unknown>> & {
    readonly background: GameRendererContextV1<RuntimeStageSceneV1, TSemanticPort, TPresentation>;
  },
> {
  readonly stage: DeepReadonly<RuntimeStageSceneV1>;
  readonly contributions: UiContributionRegistryV1<
    StageSceneHostRendererContextsV1<TSemanticPort, TPresentation, TContexts>
  >;
  readonly semantic: TSemanticPort;
  readonly presentation: TPresentation;
}
