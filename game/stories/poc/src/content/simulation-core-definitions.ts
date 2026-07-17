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
} from "../gameplay/index.js";
import {
  actorIdsV1,
  characterIdsV1,
  customerSegmentIdsV1,
  itemIdsV1,
  modifierSourceIdsV1,
  reasonIdsV1,
  sceneIdsV1,
} from "./simulation-ids.js";
import { pocSimulationTextIdsV1 } from "./simulation-text-ids.js";

const simulationTextIdsV1 = Object.freeze(Object.values(pocSimulationTextIdsV1));

function requireRegisteredSimulationTextIdV1(expected: string): TextId {
  const textId = simulationTextIdsV1.find((candidate) => candidate === expected);
  if (textId === undefined) {
    throw new TypeError(`missing registered simulation TextId: ${expected}`);
  }
  return textId;
}

export const pocSimulationManifestV1 = deepFreezePocValueV1({
  initialSceneId: sceneIdsV1[0],
  playableDays: parsePositiveSafeInteger(7),
});

export const pocCharacterDefinitionsV1: DeepReadonly<readonly StoryCharacterDefinitionV1[]> =
  deepFreezePocValueV1([
    {
      characterId: characterIdsV1[0],
      nameTextId: pocSimulationTextIdsV1.characterNarratorName,
      actorId: null,
    },
    {
      characterId: characterIdsV1[1],
      nameTextId: pocSimulationTextIdsV1.characterPlayerName,
      actorId: actorIdsV1[0],
    },
    {
      characterId: characterIdsV1[2],
      nameTextId: pocSimulationTextIdsV1.characterHeroineName,
      actorId: actorIdsV1[1],
    },
  ]);

export const pocReasonDefinitionsV1: DeepReadonly<readonly ReasonDefinitionV1[]> =
  deepFreezePocValueV1(
    reasonIdsV1.map((reasonId) => ({
      reasonId,
      textId: requireRegisteredSimulationTextIdV1(`text.poc.${reasonId}`),
    })),
  );

export const pocCustomerSegmentDefinitionsV1: DeepReadonly<readonly CustomerSegmentDefinitionV1[]> =
  deepFreezePocValueV1([
    {
      segmentId: customerSegmentIdsV1[0],
      nameTextId: pocSimulationTextIdsV1.segmentLocalsName,
    },
    {
      segmentId: customerSegmentIdsV1[1],
      nameTextId: pocSimulationTextIdsV1.segmentTravelersName,
    },
  ]);

export const pocModifierSourceDefinitionsV1: DeepReadonly<readonly ModifierSourceDefinitionV1[]> =
  deepFreezePocValueV1([
    {
      sourceId: modifierSourceIdsV1[0],
      nameTextId: pocSimulationTextIdsV1.modifierSourceReputationName,
    },
    {
      sourceId: modifierSourceIdsV1[1],
      nameTextId: pocSimulationTextIdsV1.modifierSourceWarClueName,
    },
  ]);

export const pocItemDefinitionsV1: DeepReadonly<readonly ItemDefinitionV1[]> = deepFreezePocValueV1(
  [...itemIdsV1],
);
