// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  e2eAssetPacksV1,
  e2eAssetSlotsV1,
  e2ePresentationPatchSurfaceV1,
  materializeE2ePresentationV1,
} from "./presentation-program.js";
import { e2eSceneGraphV1 } from "./scene-graph.js";
import { e2eTextCatalogsV1 } from "./text-catalogs.js";

export const e2eStoryPresentationFacetV1 = Object.freeze({
  uiSceneGraph: e2eSceneGraphV1,
  textCatalogs: e2eTextCatalogsV1,
  assetSlots: e2eAssetSlotsV1,
  assetPacks: e2eAssetPacksV1,
  patchSurface: e2ePresentationPatchSurfaceV1,
  materializePresentation: materializeE2ePresentationV1,
});
