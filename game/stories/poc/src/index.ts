// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

export { createPocRuleProvidersV1 } from "./gameplay/index.js";
export type { PocActionInputCatalogV1 } from "./gameplay/index.js";

export {
  materializePocPresentationV1,
  materializePocRulesFromPatchValuesV1,
  materializePocSimulationProgramV1,
  pocBaseRuleProvidersV1,
  pocPresentationPatchSurfaceV1,
  pocSimulationPatchSurfaceV1,
} from "./patch-surfaces.js";

export {
  default,
  definePocStoryV1,
  pocStateContractManifestV1,
  pocStoryDefinitionV1,
  pocStoryEntryV1,
  pocStoryPresentationFacetV1,
  pocStorySimulationFacetV1,
} from "./story-definition.js";
export type {
  PocPresentationV1,
  PocResolvedAssetsV1,
  PocResolvedGameV1,
  PocStageSceneGraphV1,
} from "./story-definition.js";

export {
  pocChecksDescribeProviderSourceDigestV1,
  pocChecksResolveProviderSourceDigestV1,
  pocDemandPreviewProviderSourceDigestV1,
  pocDemandResolveProviderSourceDigestV1,
  pocEndingsEvaluateProviderSourceDigestV1,
  pocTavernPreviewProviderSourceDigestV1,
  pocTavernSettleProviderSourceDigestV1,
} from "./rule-source-digests.generated.js";

export {
  pocAssetPacksV1,
  pocAssetSlotsV1,
  pocHeroineStandardAppearanceV1,
  pocResolvedPresentationCatalogV1,
  pocStandardRequiredAssetIdsByVariantV1,
} from "./presentation/assets.js";
export {
  pocContentMaturityPolicyV1,
  pocStandardContentRequirementV1,
} from "./presentation/content-maturity-policy.js";
export {
  pocInteractionBehaviorsV1,
  pocInteractionSurfacesV1,
  pocInteractionTargetsV1,
} from "./presentation/interaction-catalog.js";
export { pocSceneGraphV1, pocStageRendererIdsV1 } from "./presentation/scene-graph.js";
export { pocTextCatalogsV1, pocZhCnTextCatalogV1 } from "./presentation/text-catalogs/index.js";

export {
  commandForPocSemanticInvocationV1,
  createPocSemanticActionCatalogV1,
  parsePocSemanticInvocationV1,
  pocSemanticInvocationOptionsSchemaByActionV1,
  pocSemanticInvocationSchemaV1,
  PocSemanticInvocationErrorV1,
  previewPocSemanticInvocationV1,
  projectPocSemanticActionResultV1,
} from "./presentation/semantic-actions.js";
export type {
  PocNoSemanticOptionsV1,
  PocSemanticActionDescriptorV1,
  PocSemanticActionOptionV1,
  PocSemanticActionResultV1,
  PocSemanticConfirmationV1,
  PocSemanticDeliveryKindByActionV1,
  PocSemanticFormByActionV1,
  PocSemanticInvocationErrorCodeV1,
  PocSemanticInvocationOptionsByActionV1,
  PocSemanticInvocationV1,
  PocSemanticPreviewV1,
} from "./presentation/semantic-actions.js";
