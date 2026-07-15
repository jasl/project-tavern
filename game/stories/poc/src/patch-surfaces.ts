// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  definePatchSlot,
  definePresentationPatchSurface,
  defineSimulationPatchSurface,
  digestCanonical,
  parseDigest,
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

import { assetIdsV1 } from "./content/ids.js";
import {
  pocSimulationDataV1,
  pocStoryDataV1,
  projectPocSimulationDataV1,
} from "./content/story-data.js";
import { createValidatedPocRulesV1, deepFreezePocValueV1 } from "./gameplay/index.js";
import type { PocRulesV1, PocSimulationDataV1, PocSimulationProgramV1 } from "./gameplay/index.js";
import { createPocRuleProvidersV1 } from "./gameplay/rule-providers.js";
import { pocResolvedPresentationCatalogV1 } from "./presentation/assets.js";
import { pocTextCatalogsV1 } from "./presentation/text-catalogs/index.js";
import {
  pocChecksDescribeProviderSourceDigestV1,
  pocChecksResolveProviderSourceDigestV1,
  pocDemandPreviewProviderSourceDigestV1,
  pocDemandResolveProviderSourceDigestV1,
  pocEndingsEvaluateProviderSourceDigestV1,
  pocTavernPreviewProviderSourceDigestV1,
  pocTavernSettleProviderSourceDigestV1,
} from "./rule-source-digests.generated.js";

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
const balancePatchSymbolIdV1 = "value.poc.balance" as const;
const textCatalogPatchSymbolIdV1 = "text.poc.catalogs" as const;

function valueProviderDigestV1(symbolId: string, value: unknown) {
  return digestCanonical("sillymaker:patch-provider:v1", {
    symbolId,
    contractRevision: 1,
    value,
  });
}

export const pocBaseRuleProvidersV1 = createPocRuleProvidersV1(pocSimulationDataV1);

const balanceSlotV1 = definePatchSlot({
  symbolId: balancePatchSymbolIdV1,
  kind: "value",
  contractRevision: patchContractRevisionV1,
  defaultProviderSourceDigest: valueProviderDigestV1(
    balancePatchSymbolIdV1,
    pocStoryDataV1.balance,
  ),
  defaultValue: pocStoryDataV1.balance,
});

const demandPreviewSlotV1 = definePatchSlot({
  symbolId: "demand.preview",
  kind: "rule",
  contractRevision: patchContractRevisionV1,
  defaultProviderSourceDigest: parseDigest(pocDemandPreviewProviderSourceDigestV1),
  defaultValue: pocBaseRuleProvidersV1.demand.preview,
});

const demandResolveSlotV1 = definePatchSlot({
  symbolId: "demand.resolve",
  kind: "rule",
  contractRevision: patchContractRevisionV1,
  defaultProviderSourceDigest: parseDigest(pocDemandResolveProviderSourceDigestV1),
  defaultValue: pocBaseRuleProvidersV1.demand.resolve,
});

const tavernPreviewSlotV1 = definePatchSlot({
  symbolId: "tavern.preview",
  kind: "rule",
  contractRevision: patchContractRevisionV1,
  defaultProviderSourceDigest: parseDigest(pocTavernPreviewProviderSourceDigestV1),
  defaultValue: pocBaseRuleProvidersV1.tavern.preview,
});

const tavernSettleSlotV1 = definePatchSlot({
  symbolId: "tavern.settle",
  kind: "rule",
  contractRevision: patchContractRevisionV1,
  defaultProviderSourceDigest: parseDigest(pocTavernSettleProviderSourceDigestV1),
  defaultValue: pocBaseRuleProvidersV1.tavern.settle,
});

const checksDescribeSlotV1 = definePatchSlot({
  symbolId: "checks.describe",
  kind: "rule",
  contractRevision: patchContractRevisionV1,
  defaultProviderSourceDigest: parseDigest(pocChecksDescribeProviderSourceDigestV1),
  defaultValue: pocBaseRuleProvidersV1.checks.describe,
});

const checksResolveSlotV1 = definePatchSlot({
  symbolId: "checks.resolve",
  kind: "rule",
  contractRevision: patchContractRevisionV1,
  defaultProviderSourceDigest: parseDigest(pocChecksResolveProviderSourceDigestV1),
  defaultValue: pocBaseRuleProvidersV1.checks.resolve,
});

const endingsEvaluateSlotV1 = definePatchSlot({
  symbolId: "endings.evaluate",
  kind: "rule",
  contractRevision: patchContractRevisionV1,
  defaultProviderSourceDigest: parseDigest(pocEndingsEvaluateProviderSourceDigestV1),
  defaultValue: pocBaseRuleProvidersV1.endings.evaluate,
});

export const pocSimulationPatchSurfaceV1 = defineSimulationPatchSurface({
  balance: balanceSlotV1,
  demandPreview: demandPreviewSlotV1,
  demandResolve: demandResolveSlotV1,
  tavernPreview: tavernPreviewSlotV1,
  tavernSettle: tavernSettleSlotV1,
  checksDescribe: checksDescribeSlotV1,
  checksResolve: checksResolveSlotV1,
  endingsEvaluate: endingsEvaluateSlotV1,
});

type PocSimulationPatchValuesV1 = ResolvedPatchValuesV1<typeof pocSimulationPatchSurfaceV1>;

export function materializePocRulesFromPatchValuesV1(
  data: DeepReadonly<PocSimulationDataV1>,
  values: DeepReadonly<PocSimulationPatchValuesV1>,
): DeepReadonly<PocRulesV1> {
  const reboundDefaults = createPocRuleProvidersV1(data);
  const providers: DeepReadonly<PocRulesV1> = {
    demand: {
      preview:
        values.demandPreview === demandPreviewSlotV1.defaultValue
          ? reboundDefaults.demand.preview
          : values.demandPreview,
      resolve:
        values.demandResolve === demandResolveSlotV1.defaultValue
          ? reboundDefaults.demand.resolve
          : values.demandResolve,
    },
    tavern: {
      preview:
        values.tavernPreview === tavernPreviewSlotV1.defaultValue
          ? reboundDefaults.tavern.preview
          : values.tavernPreview,
      settle:
        values.tavernSettle === tavernSettleSlotV1.defaultValue
          ? reboundDefaults.tavern.settle
          : values.tavernSettle,
    },
    checks: {
      describe:
        values.checksDescribe === checksDescribeSlotV1.defaultValue
          ? reboundDefaults.checks.describe
          : values.checksDescribe,
      resolve:
        values.checksResolve === checksResolveSlotV1.defaultValue
          ? reboundDefaults.checks.resolve
          : values.checksResolve,
    },
    endings: {
      evaluate:
        values.endingsEvaluate === endingsEvaluateSlotV1.defaultValue
          ? reboundDefaults.endings.evaluate
          : values.endingsEvaluate,
    },
  };
  return createValidatedPocRulesV1(data, providers);
}

export function materializePocSimulationProgramV1(
  values: DeepReadonly<PocSimulationPatchValuesV1>,
): DeepReadonly<PocSimulationProgramV1> {
  const data = projectPocSimulationDataV1(pocStoryDataV1, values.balance);
  return deepFreezePocValueV1({
    data,
    rules: materializePocRulesFromPatchValuesV1(data, values),
  });
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
  return deepFreezePocValueV1({
    textCatalogs: parseTextCatalogSetV1(values.textCatalogs),
    resolvedCatalog: pocResolvedPresentationCatalogV1,
  });
}
