// SPDX-License-Identifier: MIT
import type { Digest, PositiveSafeInteger } from "./values.js";

export type AssetUsageV1 =
  | "scene_background"
  | "character_pose"
  | "story_prop"
  | "ui_decoration";

export interface AssetSafeAreaV1 {
  readonly x: number;
  readonly y: number;
  readonly width: PositiveSafeInteger;
  readonly height: PositiveSafeInteger;
}

export interface AssetPivotV1 {
  readonly x: number;
  readonly y: number;
}

export interface AssetPackSourceIdentityV1 {
  readonly id: string;
  readonly revision: PositiveSafeInteger;
}

export interface AssetPackResolvedIdentityV1
  extends AssetPackSourceIdentityV1 {
  readonly digest: Digest;
}

export interface AssetSlotDefinitionV1 {
  readonly assetId: string;
  readonly kind: "background" | "character" | "prop" | "ui";
  readonly usage: AssetUsageV1;
  readonly overridePolicy: "sealed" | "replaceable";
  readonly fallbackToken: string;
  readonly width: PositiveSafeInteger;
  readonly height: PositiveSafeInteger;
  readonly loadGroup: "bootstrap" | "scene" | "overlay";
  readonly safeArea: AssetSafeAreaV1 | null;
  readonly pivot: AssetPivotV1 | null;
}

export interface AssetProviderEntryV1 {
  readonly assetId: string;
  readonly runtimePath: string;
  readonly mediaType: "image/webp" | "image/png" | "image/svg+xml";
  readonly byteLength: PositiveSafeInteger;
  readonly width: PositiveSafeInteger;
  readonly height: PositiveSafeInteger;
  readonly sha256: Digest;
}

export interface AssetPackV1 {
  readonly identity: AssetPackSourceIdentityV1;
  readonly providers: readonly AssetProviderEntryV1[];
}

export interface AssetPackDigestProjectionV1 {
  readonly identity: AssetPackSourceIdentityV1;
  readonly providers: readonly AssetProviderEntryV1[];
}

export type AssetProviderRefV1 =
  | { readonly kind: "asset_pack"; readonly identity: AssetPackResolvedIdentityV1 }
  | { readonly kind: "hotfix"; readonly identity: { readonly id: string; readonly revision: PositiveSafeInteger; readonly digest: Digest } };

export type ResolvedAssetEntryV1 =
  | (AssetSlotDefinitionV1 & {
      readonly delivery: "code_fallback";
      readonly provider: null;
      readonly overrideChain: readonly AssetProviderRefV1[];
    })
  | (AssetSlotDefinitionV1 &
      AssetProviderEntryV1 & {
        readonly delivery: "runtime_image";
        readonly provider: AssetProviderRefV1;
        readonly overrideChain: readonly AssetProviderRefV1[];
      });

export interface ResolvedAssetManifestV1 {
  readonly packs: readonly AssetPackResolvedIdentityV1[];
  readonly slots: readonly AssetSlotDefinitionV1[];
  readonly assets: readonly ResolvedAssetEntryV1[];
}
