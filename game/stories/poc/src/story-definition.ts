// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { defineGamePackage } from "@sillymaker/base";
import type { ResolvedGameV1 } from "@sillymaker/base";

import { pocStoryIdentityV1 } from "./content/identity.js";
import type { PocGameSimulationV1 } from "./gameplay/game-simulation.js";
import type { materializePocSimulationProgramV1 } from "./simulation/patch-surface.js";
import {
  pocStateContractManifestV1,
  pocStorySimulationFacetV1,
} from "./simulation/story-simulation-facet.js";
import {
  pocStoryPresentationFacetV1,
  type PocPresentationV1,
  type PocResolvedAssetsV1,
  type PocStageSceneGraphV1,
} from "./presentation/story-presentation-facet.js";

export { pocStateContractManifestV1, pocStorySimulationFacetV1 };
export { pocStoryPresentationFacetV1 };
export type { PocPresentationV1, PocResolvedAssetsV1, PocStageSceneGraphV1 };

export const pocStoryDefinitionV1 = Object.freeze({
  simulation: pocStorySimulationFacetV1,
  presentation: pocStoryPresentationFacetV1,
});

export function definePocStoryV1(): typeof pocStoryDefinitionV1 {
  return pocStoryDefinitionV1;
}

export const pocStoryEntryV1 = defineGamePackage({
  contractRevision: 1 as const,
  identity: pocStoryIdentityV1,
  define: definePocStoryV1,
});

export type PocResolvedGameV1 = ResolvedGameV1<
  PocGameSimulationV1,
  ReturnType<typeof materializePocSimulationProgramV1>,
  PocPresentationV1,
  PocStageSceneGraphV1,
  PocResolvedAssetsV1
>;

export default pocStoryEntryV1;
