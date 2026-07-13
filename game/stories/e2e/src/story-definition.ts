// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { e2eStoryPresentationFacetV1 } from "./presentation/story-presentation-facet.js";
import { e2eStorySimulationFacetV1 } from "./simulation/story-simulation-facet.js";

export { e2eStateContractManifestV1 } from "./simulation/story-simulation-facet.js";

export const e2eStoryDefinitionV1 = Object.freeze({
  simulation: e2eStorySimulationFacetV1,
  presentation: e2eStoryPresentationFacetV1,
});

export function defineE2eStoryV1(): typeof e2eStoryDefinitionV1 {
  return e2eStoryDefinitionV1;
}
