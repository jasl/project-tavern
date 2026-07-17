// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  deepFreezePocValueV1,
  pocStoryInitialStateSchemaV1,
  pocStoryStateDefinitionsSchemaV1,
  type StoryInitialStateV1,
  type StoryStateDefinitionsV1,
} from "../gameplay/index.js";
import {
  actorIdsV1,
  factIdsV1,
  investigationOutcomeTokensV1,
  outcomeIdsV1,
  questIdsV1,
  recipeIdsV1,
  relationshipOutcomeTokensV1,
} from "./simulation-ids.js";

const [playerActorIdV1, heroineActorIdV1] = actorIdsV1;
if (playerActorIdV1 !== "actor.player" || heroineActorIdV1 !== "actor.heroine") {
  throw new TypeError("PoC Actor registry order does not match the initial-state contract");
}

const [warClueFactIdV1, tutorialFactIdV1, invoiceFactIdV1] = factIdsV1;
if (
  warClueFactIdV1 === undefined ||
  tutorialFactIdV1 === undefined ||
  invoiceFactIdV1 === undefined
) {
  throw new TypeError("PoC Fact registry is incomplete");
}

const [relationshipOutcomeIdV1, investigationOutcomeIdV1] = outcomeIdsV1;
if (relationshipOutcomeIdV1 === undefined || investigationOutcomeIdV1 === undefined) {
  throw new TypeError("PoC Outcome registry is incomplete");
}

export const pocStateDefinitionsV1: StoryStateDefinitionsV1 = deepFreezePocValueV1(
  pocStoryStateDefinitionsSchemaV1.parse({
    facts: [
      {
        factId: invoiceFactIdV1,
        value: { kind: "boolean", defaultValue: false },
      },
      {
        factId: tutorialFactIdV1,
        value: { kind: "boolean", defaultValue: false },
      },
      {
        factId: warClueFactIdV1,
        value: { kind: "boolean", defaultValue: false },
      },
    ],
    quests: questIdsV1,
    outcomes: [
      {
        outcomeId: investigationOutcomeIdV1,
        value: {
          kind: "token",
          defaultValue: investigationOutcomeTokensV1[0],
          allowedValues: investigationOutcomeTokensV1,
        },
      },
      {
        outcomeId: relationshipOutcomeIdV1,
        value: {
          kind: "token",
          defaultValue: relationshipOutcomeTokensV1[0],
          allowedValues: relationshipOutcomeTokensV1,
        },
      },
    ],
  }),
);

export const pocInitialStateV1: StoryInitialStateV1 = deepFreezePocValueV1(
  pocStoryInitialStateSchemaV1.parse({
    player: {
      actorId: playerActorIdV1,
      stamina: { current: 10, maximum: 10 },
      mood: 0,
      attributes: { body: "C", social: "C", intellect: "B" },
    },
    heroine: {
      actorId: heroineActorIdV1,
      stamina: { current: 10, maximum: 10 },
      mood: 0,
    },
    relationship: { affection: 0, teamwork: 0, stage: "cold" },
    cash: 70,
    reputation: 50,
    helper: { unlocked: false, tier: "apprentice" },
    unlockedRecipeIds: recipeIdsV1.toSorted(),
    ingredientBatches: [],
    itemStacks: [],
    auras: [],
  }),
);
