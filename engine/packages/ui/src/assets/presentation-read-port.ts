// SPDX-License-Identifier: MIT
import type {
  LocaleId,
  PresentationReadPortV1 as BasePresentationReadPortV1,
  ResolvedAssetPresentationV1,
  ResolvedTextPresentationV1,
  TextCatalogSetV1,
  TextId,
} from "@sillymaker/base";
import type { AssetRegistryPublicationV1, AssetRegistryV1 } from "./asset-registry.js";

export interface PresentationReadPortV1<
  TTextId,
  TAssetId,
  TAssetUsage,
  TLocaleId,
  TFallbackToken,
> extends BasePresentationReadPortV1<TTextId, TAssetId, TAssetUsage, TLocaleId, TFallbackToken> {
  observeAssets(): Readonly<AssetRegistryPublicationV1>;
  subscribeAssets(listener: () => void): () => void;
}

export interface CreatePresentationReadPortInputV1<TAssetId, TAssetUsage, TFallbackToken> {
  readonly catalogs: TextCatalogSetV1;
  readonly locale: LocaleId;
  readonly assets: AssetRegistryV1<TAssetId, TAssetUsage, TFallbackToken>;
}

export function createPresentationReadPortV1<TAssetId, TAssetUsage, TFallbackToken>(
  input: CreatePresentationReadPortInputV1<TAssetId, TAssetUsage, TFallbackToken>,
): PresentationReadPortV1<TextId, TAssetId, TAssetUsage, LocaleId, TFallbackToken> {
  const catalogsByLocale = new Map(
    input.catalogs.catalogs.map((catalog) => [catalog.locale, catalog] as const),
  );
  const entriesByLocale = new Map(
    input.catalogs.catalogs.map(
      (catalog) =>
        [
          catalog.locale,
          new Map(catalog.entries.map((entry) => [entry.textId, entry.text] as const)),
        ] as const,
    ),
  );
  const requestedCatalog = catalogsByLocale.get(input.locale);
  if (requestedCatalog === undefined) {
    throw new TypeError(`presentation.locale_unknown:${input.locale}`);
  }

  const resolvedTextCache = new Map<TextId, ResolvedTextPresentationV1<TextId, LocaleId>>();

  const text = (textId: TextId): ResolvedTextPresentationV1<TextId, LocaleId> => {
    const cached = resolvedTextCache.get(textId);
    if (cached !== undefined) return cached;

    let catalog = requestedCatalog;
    while (true) {
      const value = entriesByLocale.get(catalog.locale)?.get(textId);
      if (value !== undefined) {
        const resolved = Object.freeze({
          textId,
          requestedLocale: input.locale,
          resolvedLocale: catalog.locale,
          text: value,
        });
        resolvedTextCache.set(textId, resolved);
        return resolved;
      }
      if (catalog.fallbackLocale === null) break;
      const fallback = catalogsByLocale.get(catalog.fallbackLocale);
      if (fallback === undefined) {
        throw new TypeError(`presentation.locale_fallback_missing:${catalog.fallbackLocale}`);
      }
      catalog = fallback;
    }

    throw new TypeError(`presentation.text_unknown_id:${textId}`);
  };

  const asset = (
    assetId: TAssetId,
    usage: TAssetUsage,
  ): ResolvedAssetPresentationV1<TAssetId, TAssetUsage, TFallbackToken> => {
    const resolved = input.assets.resolve(assetId, usage);
    return Object.isFrozen(resolved) ? resolved : Object.freeze({ ...resolved });
  };
  const observeAssets = () => input.assets.observe();
  const subscribeAssets = (listener: () => void) => input.assets.subscribe(listener);

  return Object.freeze({
    locale: input.locale,
    text,
    asset,
    observeAssets,
    subscribeAssets,
  });
}
