// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  pocPresentationChromeTextIdsV1,
  pocScenePresentationTextIdsV1,
  pocSemanticWorkflowTextIdsV1,
} from "../presentation/presentation-text-ids.js";
import {
  pocSimulationCatalogTextIdsV1,
  pocSimulationConfirmationTextIdsV1,
  pocSimulationDefinitionTextIdsV1,
} from "./simulation-text-ids.js";

export const pocTextIdsV1 = Object.freeze({
  ...pocPresentationChromeTextIdsV1,
  ...pocSimulationDefinitionTextIdsV1,
  ...pocSemanticWorkflowTextIdsV1,
  ...pocSimulationCatalogTextIdsV1,
  ...pocScenePresentationTextIdsV1,
  ...pocSimulationConfirmationTextIdsV1,
});

export const textIdsV1 = Object.freeze(Object.values(pocTextIdsV1));

export const pocStoryTitleTextIdV1 = pocTextIdsV1.storyTitle;
export const pocNoContentFilterOptionsTextIdV1 = pocTextIdsV1.settingsContentFilterNone;
