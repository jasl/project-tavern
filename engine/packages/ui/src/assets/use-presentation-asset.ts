// SPDX-License-Identifier: MIT
import type { ResolvedAssetPresentationV1 } from "@sillymaker/base";
import { useSyncExternalStore } from "react";
import type { PresentationReadPortV1 } from "./presentation-read-port.js";

export function usePresentationAssetV1<TTextId, TAssetId, TAssetUsage, TLocaleId, TFallbackToken>(
  presentation: PresentationReadPortV1<TTextId, TAssetId, TAssetUsage, TLocaleId, TFallbackToken>,
  assetId: TAssetId,
  usage: TAssetUsage,
): ResolvedAssetPresentationV1<TAssetId, TAssetUsage, TFallbackToken> {
  useSyncExternalStore(presentation.subscribeAssets, presentation.observeAssets);
  return presentation.asset(assetId, usage);
}
