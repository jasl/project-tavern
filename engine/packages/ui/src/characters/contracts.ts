// SPDX-License-Identifier: MIT
import type {
  AppearanceLayerId,
  AssetId,
  CharacterActivityId,
  CharacterExpressionId,
  CharacterId,
  CharacterPoseId,
  CharacterRigId,
  DeepReadonly,
  HitMapId,
  InteractionTargetId,
  LocaleId,
  NormalizedPointV1,
  PositiveFiniteNumber,
  ResolvedAssetManifestV1,
  TextId,
} from "@sillymaker/base";

import type { PresentationReadPortV1 } from "../assets/presentation-read-port.js";
import type {
  GameRendererContextV1,
  UiContributionRegistryV1,
  UiRendererNamespaceV1,
} from "../contributions/types.js";

type CharacterAssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];

export type CharacterPresentationReadPortV1 = PresentationReadPortV1<
  TextId,
  AssetId,
  CharacterAssetUsageV1,
  LocaleId,
  string
>;

export interface RuntimeAppearanceLayerV1 {
  readonly layerId: AppearanceLayerId;
  readonly assetId: AssetId;
  readonly fallbackPolicy: "omit" | "character_fallback";
}

export interface RuntimeCharacterPresentationV1 {
  readonly characterId: CharacterId;
  readonly accessibleNameTextId: TextId;
  readonly rendererId: string;
  readonly rigId: CharacterRigId;
  readonly poseId: CharacterPoseId;
  readonly expressionId: CharacterExpressionId;
  readonly activityId: CharacterActivityId | null;
  readonly appearance: readonly RuntimeAppearanceLayerV1[];
  readonly hitMapId: HitMapId | null;
  readonly anchor: NormalizedPointV1;
  readonly scale: PositiveFiniteNumber;
  readonly staticFallbackAssetId: AssetId | null;
  readonly fallbackHitMapCompatibility: "compatible" | "incompatible";
}

export interface CharacterRendererContributionV1 {
  readonly rendererId: string;
  readonly kind: "static" | "paper_doll" | "adapter";
  mapStoryPose?(poseId: CharacterPoseId): string | null;
  mapStoryCue?(cueId: string): string | null;
  mapExternalTarget?(externalTargetId: string): InteractionTargetId | null;
}

export interface CharacterRendererRegistryV1 {
  resolve(rendererId: string):
    | {
        readonly kind: "found";
        readonly contribution: CharacterRendererContributionV1;
      }
    | {
        readonly kind: "not_found";
        readonly code: "ui.character_renderer_not_found";
      };
}

export type CharacterHostRendererContextsV1<
  TSemanticPort,
  TPresentation,
  TContexts extends Readonly<Record<UiRendererNamespaceV1, unknown>>,
> = Readonly<
  Omit<TContexts, "character"> & {
    readonly character: GameRendererContextV1<
      RuntimeCharacterPresentationV1,
      TSemanticPort,
      TPresentation
    >;
  }
>;

export interface CharacterHostPropsV1<
  TSemanticPort,
  TPresentation extends CharacterPresentationReadPortV1,
  TContexts extends Readonly<Record<UiRendererNamespaceV1, unknown>> & {
    readonly character: GameRendererContextV1<
      RuntimeCharacterPresentationV1,
      TSemanticPort,
      TPresentation
    >;
  },
> {
  readonly character: DeepReadonly<RuntimeCharacterPresentationV1>;
  readonly contributions: UiContributionRegistryV1<
    CharacterHostRendererContextsV1<TSemanticPort, TPresentation, TContexts>
  >;
  readonly semantic: TSemanticPort;
  readonly presentation: TPresentation;
}
