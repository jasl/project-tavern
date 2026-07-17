// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  deepFreezePocValueV1,
  type DeepReadonly,
  type StoryManifestV1,
  type TextEntryV1,
} from "../gameplay/index.js";
import { pocSimulationManifestV1 } from "./simulation-core-definitions.js";
import { pocStoryTitleTextIdV1, textIdsV1 } from "./text-ids.js";

export {
  pocCharacterDefinitionsV1,
  pocCustomerSegmentDefinitionsV1,
  pocItemDefinitionsV1,
  pocModifierSourceDefinitionsV1,
  pocReasonDefinitionsV1,
  pocSimulationManifestV1,
} from "./simulation-core-definitions.js";

export const pocStoryManifestV1: DeepReadonly<StoryManifestV1> = deepFreezePocValueV1({
  titleTextId: pocStoryTitleTextIdV1,
  initialSceneId: pocSimulationManifestV1.initialSceneId,
  playableDays: pocSimulationManifestV1.playableDays,
});

export const pocTextEntriesV1: DeepReadonly<readonly TextEntryV1[]> = deepFreezePocValueV1(
  textIdsV1.map((textId) => ({ textId })),
);
