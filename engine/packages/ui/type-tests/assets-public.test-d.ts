// SPDX-License-Identifier: MIT
import {
  parseAssetId,
  parseLocaleId,
  parseTextId,
  type AssetId,
  type LocaleId,
  type ResolvedAssetManifestV1,
  type TextId,
} from "@sillymaker/base";
import {
  CodeNativeAssetFallbackV1 as RootCodeNativeAssetFallbackV1,
  createAssetRegistryV1 as createRootAssetRegistryV1,
  createPresentationReadPortV1 as createRootPresentationReadPortV1,
  usePresentationAssetV1 as useRootPresentationAssetV1,
} from "@sillymaker/ui";
import {
  CodeNativeAssetFallbackV1,
  createAssetRegistryV1,
  createPresentationReadPortV1,
  usePresentationAssetV1,
  type AssetRegistryV1,
  type PresentationReadPortV1,
  type RuntimeAssetLoaderV1,
  type RuntimeAssetLoadRequestV1,
} from "@sillymaker/ui/assets";

type EqualV1<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;
type AssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];

type PublicRegistryKeysV1 = ExpectV1<
  EqualV1<
    keyof AssetRegistryV1<AssetId, AssetUsageV1, string>,
    "dispose" | "observe" | "preload" | "resolve" | "subscribe"
  >
>;
type PublicPresentationKeysV1 = ExpectV1<
  EqualV1<
    keyof PresentationReadPortV1<TextId, AssetId, AssetUsageV1, LocaleId, string>,
    "asset" | "locale" | "observeAssets" | "subscribeAssets" | "text"
  >
>;
type PublicLoaderRequestKeysV1 = ExpectV1<
  EqualV1<
    keyof RuntimeAssetLoadRequestV1,
    "height" | "mediaType" | "runtimePath" | "sha256" | "width"
  >
>;

declare const registryV1: AssetRegistryV1<AssetId, AssetUsageV1, string>;
declare const presentationV1: PresentationReadPortV1<
  TextId,
  AssetId,
  AssetUsageV1,
  LocaleId,
  string
>;
declare const loaderV1: RuntimeAssetLoaderV1;
declare const signalV1: AbortSignal;

const assetIdV1 = parseAssetId("asset.synthetic.scene");
const localeIdV1 = parseLocaleId("zh-CN");
const textIdV1 = parseTextId("text.synthetic.scene");
const assetV1 = presentationV1.asset(assetIdV1, "scene_background");

presentationV1.locale satisfies LocaleId;
presentationV1.text(textIdV1);
presentationV1.observeAssets();
presentationV1.subscribeAssets(() => undefined);
void registryV1.preload([assetIdV1], signalV1);
registryV1.resolve(assetIdV1, "scene_background");
loaderV1.cacheKey({
  runtimePath: "runtime/scene.webp",
  mediaType: "image/webp",
  sha256: {} as RuntimeAssetLoadRequestV1["sha256"],
  width: {} as RuntimeAssetLoadRequestV1["width"],
  height: {} as RuntimeAssetLoadRequestV1["height"],
});

if (assetV1.delivery === "runtime_image") {
  assetV1.url;
  // @ts-expect-error the renderer-facing asset value does not expose the manifest path
  assetV1.runtimePath;
  // @ts-expect-error the renderer-facing asset value does not expose provider records
  assetV1.provider;
  // @ts-expect-error the renderer-facing asset value does not expose authored load groups
  assetV1.loadGroup;
}

// @ts-expect-error preload accepts exact AssetId values, not an authored load group
void registryV1.preload("scene", signalV1);
// @ts-expect-error preload has no load-group overload
void registryV1.preload([assetIdV1], signalV1, "scene");
// @ts-expect-error catalogs stay closed inside the PresentationReadPort
presentationV1.catalogs;
// @ts-expect-error the PresentationReadPort never exposes the registry itself
presentationV1.assets;

const rootFactoryV1: typeof createAssetRegistryV1 = createRootAssetRegistryV1;
const rootPresentationFactoryV1: typeof createPresentationReadPortV1 =
  createRootPresentationReadPortV1;
const rootFallbackV1: typeof CodeNativeAssetFallbackV1 = RootCodeNativeAssetFallbackV1;
const rootHookV1: typeof usePresentationAssetV1 = useRootPresentationAssetV1;

localeIdV1;
rootFactoryV1;
rootPresentationFactoryV1;
rootFallbackV1;
rootHookV1;

// @ts-expect-error Story identity is not part of the neutral asset package
export type { StoryId as ForbiddenStoryIdV1 } from "@sillymaker/ui/assets";
// @ts-expect-error Snapshot authority is not part of the neutral asset package
export type { GameSnapshotEnvelopeV1 as ForbiddenGameSnapshotV1 } from "@sillymaker/ui/assets";
// @ts-expect-error GameSession authority is not part of the neutral asset package
export type { GameSessionV1 as ForbiddenGameSessionV1 } from "@sillymaker/ui/assets";
// @ts-expect-error the DOM image loader belongs to the Web Host package
export { createBrowserImageLoaderV1 as ForbiddenBrowserImageLoaderV1 } from "@sillymaker/ui/assets";

export type { PublicLoaderRequestKeysV1, PublicPresentationKeysV1, PublicRegistryKeysV1 };
