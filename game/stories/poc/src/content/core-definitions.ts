// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import type { TextId } from "@sillymaker/base";

import {
  deepFreezePocValueV1,
  parsePositiveSafeInteger,
  type CustomerSegmentDefinitionV1,
  type DeepReadonly,
  type ItemDefinitionV1,
  type ModifierSourceDefinitionV1,
  type ReasonDefinitionV1,
  type StoryCharacterDefinitionV1,
  type StoryManifestV1,
  type TextEntryV1,
} from "../gameplay/index.js";
import {
  actorIdsV1,
  characterIdsV1,
  customerSegmentIdsV1,
  itemIdsV1,
  modifierSourceIdsV1,
  pocStoryTitleTextIdV1,
  pocTextIdsV1,
  reasonIdsV1,
  sceneIdsV1,
  textIdsV1,
} from "./ids.js";

function requireRegisteredTextIdV1(expected: string): TextId {
  const textId = textIdsV1.find((candidate) => candidate === expected);
  if (textId === undefined) {
    throw new TypeError(`missing registered TextId: ${expected}`);
  }
  return textId;
}

export const pocStoryManifestV1: DeepReadonly<StoryManifestV1> = deepFreezePocValueV1({
  titleTextId: pocStoryTitleTextIdV1,
  initialSceneId: sceneIdsV1[0],
  playableDays: parsePositiveSafeInteger(7),
});

export const pocTextEntriesV1: DeepReadonly<readonly TextEntryV1[]> = deepFreezePocValueV1(
  textIdsV1.map((textId) => ({ textId })),
);

export const pocCharacterDefinitionsV1: DeepReadonly<readonly StoryCharacterDefinitionV1[]> =
  deepFreezePocValueV1([
    {
      characterId: characterIdsV1[0],
      nameTextId: pocTextIdsV1.characterNarratorName,
      actorId: null,
    },
    {
      characterId: characterIdsV1[1],
      nameTextId: pocTextIdsV1.characterPlayerName,
      actorId: actorIdsV1[0],
    },
    {
      characterId: characterIdsV1[2],
      nameTextId: pocTextIdsV1.characterHeroineName,
      actorId: actorIdsV1[1],
    },
  ]);

export const pocReasonDefinitionsV1: DeepReadonly<readonly ReasonDefinitionV1[]> =
  deepFreezePocValueV1(
    reasonIdsV1.map((reasonId) => ({
      reasonId,
      textId: requireRegisteredTextIdV1(`text.poc.${reasonId}`),
    })),
  );

export const pocCustomerSegmentDefinitionsV1: DeepReadonly<readonly CustomerSegmentDefinitionV1[]> =
  deepFreezePocValueV1([
    {
      segmentId: customerSegmentIdsV1[0],
      nameTextId: pocTextIdsV1.segmentLocalsName,
    },
    {
      segmentId: customerSegmentIdsV1[1],
      nameTextId: pocTextIdsV1.segmentTravelersName,
    },
  ]);

export const pocModifierSourceDefinitionsV1: DeepReadonly<readonly ModifierSourceDefinitionV1[]> =
  deepFreezePocValueV1([
    {
      sourceId: modifierSourceIdsV1[0],
      nameTextId: pocTextIdsV1.modifierSourceReputationName,
    },
    {
      sourceId: modifierSourceIdsV1[1],
      nameTextId: pocTextIdsV1.modifierSourceWarClueName,
    },
  ]);

export const pocItemDefinitionsV1: DeepReadonly<readonly ItemDefinitionV1[]> = deepFreezePocValueV1(
  [...itemIdsV1],
);
