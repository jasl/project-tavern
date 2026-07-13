// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  definePatchSlot,
  definePresentationPatchSurface,
  digestCanonical,
  parsePositiveSafeInteger,
  parseTextCatalogSetV1,
} from "@sillymaker/base";
import type { DeepReadonly, ResolvedPatchValuesV1, TextCatalogSetV1 } from "@sillymaker/base";

import { e2eTextCatalogsV1 } from "./text-catalogs.js";

export const e2eTextCatalogPatchSymbolIdV1 = "text.catalogs" as const;

export const e2eTextCatalogSlotV1 = definePatchSlot({
  symbolId: e2eTextCatalogPatchSymbolIdV1,
  kind: "text",
  contractRevision: parsePositiveSafeInteger(1),
  defaultProviderSourceDigest: digestCanonical("sillymaker:patch-provider:v1", {
    symbolId: e2eTextCatalogPatchSymbolIdV1,
    contractRevision: 1,
    value: e2eTextCatalogsV1,
  }),
  defaultValue: e2eTextCatalogsV1,
});

export const e2ePresentationPatchSurfaceV1 = definePresentationPatchSurface({
  textCatalogs: e2eTextCatalogSlotV1,
});

type E2ePresentationPatchValuesV1 = ResolvedPatchValuesV1<typeof e2ePresentationPatchSurfaceV1>;

export interface E2ePresentationV1 {
  readonly textCatalogs: TextCatalogSetV1;
}

export function materializeE2ePresentationV1(
  values: DeepReadonly<E2ePresentationPatchValuesV1>,
): E2ePresentationV1 {
  return Object.freeze({ textCatalogs: parseTextCatalogSetV1(values.textCatalogs) });
}

export const e2eAssetSlotsV1 = Object.freeze([
  Object.freeze({
    assetId: "asset.e2e.background.base",
    kind: "background" as const,
    usage: "scene_background" as const,
    overridePolicy: "replaceable" as const,
    fallbackToken: "fallback.e2e.background.base",
    width: parsePositiveSafeInteger(1280),
    height: parsePositiveSafeInteger(720),
    loadGroup: "bootstrap" as const,
    safeArea: null,
    pivot: null,
  }),
  Object.freeze({
    assetId: "asset.e2e.character.base",
    kind: "character" as const,
    usage: "character_pose" as const,
    overridePolicy: "replaceable" as const,
    fallbackToken: "fallback.e2e.character.base",
    width: parsePositiveSafeInteger(512),
    height: parsePositiveSafeInteger(768),
    loadGroup: "scene" as const,
    safeArea: null,
    pivot: null,
  }),
  Object.freeze({
    assetId: "asset.e2e.counter",
    kind: "ui" as const,
    usage: "ui_decoration" as const,
    overridePolicy: "replaceable" as const,
    fallbackToken: "symbol.counter",
    width: parsePositiveSafeInteger(64),
    height: parsePositiveSafeInteger(64),
    loadGroup: "bootstrap" as const,
    safeArea: null,
    pivot: null,
  }),
]);

export const e2eAssetPacksV1 = Object.freeze([]) satisfies readonly [];
