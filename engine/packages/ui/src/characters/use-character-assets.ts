// SPDX-License-Identifier: MIT
import type { ResolvedAssetManifestV1, ResolvedAssetPresentationV1 } from "@sillymaker/base";
import { useSyncExternalStore } from "react";

import type { CharacterPresentationReadPortV1, RuntimeAppearanceLayerV1 } from "./contracts.js";

export interface ResolvedCharacterAppearanceLayerV1 {
  readonly layer: Readonly<RuntimeAppearanceLayerV1>;
  readonly asset: ResolvedAssetPresentationV1<
    RuntimeAppearanceLayerV1["assetId"],
    ResolvedAssetManifestV1["assets"][number]["usage"],
    string
  >;
}

/** Resolves a variable-length appearance with one stable registry subscription. */
export function useCharacterAssetsV1(
  presentation: CharacterPresentationReadPortV1,
  appearance: readonly Readonly<RuntimeAppearanceLayerV1>[],
): readonly Readonly<ResolvedCharacterAppearanceLayerV1>[] {
  useSyncExternalStore(presentation.subscribeAssets, presentation.observeAssets);

  return Object.freeze(
    appearance.map((layer) =>
      Object.freeze({
        layer,
        asset: presentation.asset(layer.assetId, "character_pose"),
      }),
    ),
  );
}
