// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import type { ResolvedAssetManifestV1 } from "@sillymaker/base";

import { pocAssetPacksV1, pocAssetSlotsV1 } from "./assets.js";
import { materializePocPresentationV1, pocPresentationPatchSurfaceV1 } from "./patch-surface.js";
import { pocSceneGraphV1 } from "./scene-graph.js";
import { pocTextCatalogsV1 } from "./text-catalogs/index.js";

export const pocStoryPresentationFacetV1 = Object.freeze({
  uiSceneGraph: pocSceneGraphV1,
  textCatalogs: pocTextCatalogsV1,
  assetSlots: pocAssetSlotsV1,
  assetPacks: pocAssetPacksV1,
  patchSurface: pocPresentationPatchSurfaceV1,
  materializePresentation: materializePocPresentationV1,
});

export type PocPresentationV1 = ReturnType<typeof materializePocPresentationV1>;
export type PocStageSceneGraphV1 = typeof pocSceneGraphV1;
export type PocResolvedAssetsV1 = ResolvedAssetManifestV1;
