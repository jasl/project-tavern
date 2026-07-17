// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  definePatchSlot,
  definePresentationPatchSurface,
  digestCanonical,
  parsePositiveSafeInteger,
  parseTextCatalogSetV1,
} from "@sillymaker/base";
import type {
  DeepReadonly,
  Digest,
  PatchSlotDescriptorV1,
  PositiveSafeInteger,
  ResolvedPatchValuesV1,
} from "@sillymaker/base";

import { assetIdsV1 } from "../content/asset-ids.js";
import { pocResolvedPresentationCatalogV1 } from "./assets.js";
import { pocTextCatalogsV1 } from "./text-catalogs/index.js";

export interface PocAssetPatchProviderV1 {
  readonly assetId: string;
  readonly runtimePath: string;
  readonly mediaType: "image/webp" | "image/png" | "image/svg+xml";
  readonly byteLength: PositiveSafeInteger;
  readonly width: PositiveSafeInteger;
  readonly height: PositiveSafeInteger;
  readonly sha256: Digest;
}

const patchContractRevisionV1 = parsePositiveSafeInteger(1);
const textCatalogPatchSymbolIdV1 = "text.poc.catalogs" as const;

function valueProviderDigestV1(symbolId: string, value: unknown) {
  return digestCanonical("sillymaker:patch-provider:v1", {
    symbolId,
    contractRevision: 1,
    value,
  });
}

function deepFreezePresentationPatchValueV1<TValue>(value: TValue): TValue {
  const seen = new WeakSet<object>();

  function freeze(current: unknown): void {
    if (current === null || typeof current !== "object" || seen.has(current)) return;
    seen.add(current);
    for (const key of Reflect.ownKeys(current)) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor?.get !== undefined || descriptor?.set !== undefined) {
        throw new TypeError("presentation patch values cannot contain accessors");
      }
      freeze(descriptor?.value);
    }
    Object.freeze(current);
  }

  freeze(value);
  return value;
}

const textCatalogSlotV1 = definePatchSlot({
  symbolId: textCatalogPatchSymbolIdV1,
  kind: "text",
  contractRevision: patchContractRevisionV1,
  defaultProviderSourceDigest: valueProviderDigestV1(textCatalogPatchSymbolIdV1, pocTextCatalogsV1),
  defaultValue: pocTextCatalogsV1,
});

function definePocAssetPatchSlotV1(
  assetId: (typeof assetIdsV1)[number],
): PatchSlotDescriptorV1<"asset", PocAssetPatchProviderV1 | null> {
  return definePatchSlot({
    symbolId: assetId,
    kind: "asset",
    contractRevision: patchContractRevisionV1,
    defaultProviderSourceDigest: valueProviderDigestV1(assetId, null),
    defaultValue: null as PocAssetPatchProviderV1 | null,
  });
}

export const pocPresentationPatchSurfaceV1 = definePresentationPatchSurface({
  textCatalogs: textCatalogSlotV1,
  heroineBackHair: definePocAssetPatchSlotV1(assetIdsV1[0]),
  heroineCostumeBody: definePocAssetPatchSlotV1(assetIdsV1[1]),
  heroineFace: definePocAssetPatchSlotV1(assetIdsV1[2]),
  heroineFrontHair: definePocAssetPatchSlotV1(assetIdsV1[3]),
  heroineAccessory: definePocAssetPatchSlotV1(assetIdsV1[4]),
  heroineStatic: definePocAssetPatchSlotV1(assetIdsV1[5]),
  backgroundMainMenu: definePocAssetPatchSlotV1(assetIdsV1[6]),
  backgroundTavernDay: definePocAssetPatchSlotV1(assetIdsV1[7]),
  backgroundTavernEvening: definePocAssetPatchSlotV1(assetIdsV1[8]),
  backgroundMarketDay: definePocAssetPatchSlotV1(assetIdsV1[9]),
  backgroundWorldMap: definePocAssetPatchSlotV1(assetIdsV1[10]),
  backgroundWeekSummary: definePocAssetPatchSlotV1(assetIdsV1[11]),
});

type PocPresentationPatchValuesV1 = ResolvedPatchValuesV1<typeof pocPresentationPatchSurfaceV1>;

export function materializePocPresentationV1(values: DeepReadonly<PocPresentationPatchValuesV1>) {
  return deepFreezePresentationPatchValueV1({
    textCatalogs: parseTextCatalogSetV1(values.textCatalogs),
    resolvedCatalog: pocResolvedPresentationCatalogV1,
  });
}
