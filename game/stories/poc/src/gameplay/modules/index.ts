// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly, GameplayModuleTupleForSimulationV1 } from "@sillymaker/base";

import type {
  PocGameSimulationTypesV1,
  PocSimulationProgramV1,
  StoryValueDefinitionV1,
  StoryValueV1,
} from "../contracts/types.js";
import { parseDayIndex, parseNonNegativeSafeInteger } from "../contracts/values.js";
import {
  createPocActorsGameplayModuleV1,
  type PocActorsGameplayModuleV1,
} from "./actors/module.js";
import { pocCalendarGameplayModuleV1 } from "./calendar/module.js";
import { pocFacilitiesGameplayModuleV1 } from "./facilities/module.js";
import {
  createPocInventoryGameplayModuleV1,
  type PocInventoryGameplayModuleV1,
} from "./inventory/module.js";
import {
  pocNarrativeGameplayModuleV1,
  type PocNarrativeGameplayModuleV1,
} from "./narrative/module.js";
import {
  createPocProgressionGameplayModuleV1,
  type PocProgressionGameplayModuleV1,
} from "./progression/module.js";
import { pocRunGameplayModuleV1 } from "./run/module.js";
import {
  createPocStatusGameplayModuleV1,
  type PocStatusGameplayModuleV1,
} from "./status/module.js";
import {
  createPocTavernGameplayModuleV1,
  type PocTavernGameplayModuleV1,
} from "./tavern/module.js";
import { pocWorkflowGameplayModuleV1 } from "./workflow/module.js";

type PocGameplayModuleTupleMembersV1 = readonly [
  typeof pocRunGameplayModuleV1,
  typeof pocCalendarGameplayModuleV1,
  PocActorsGameplayModuleV1,
  PocStatusGameplayModuleV1,
  PocInventoryGameplayModuleV1,
  typeof pocFacilitiesGameplayModuleV1,
  PocTavernGameplayModuleV1,
  typeof pocWorkflowGameplayModuleV1,
  PocProgressionGameplayModuleV1,
  PocNarrativeGameplayModuleV1,
];

export type PocGameplayModuleTupleV1 = GameplayModuleTupleForSimulationV1<
  PocGameSimulationTypesV1,
  PocGameplayModuleTupleMembersV1
>;

function initialStoryValueV1(definition: DeepReadonly<StoryValueDefinitionV1>): StoryValueV1 {
  switch (definition.kind) {
    case "boolean":
      return Object.freeze({ kind: "boolean", value: definition.defaultValue });
    case "integer":
      return Object.freeze({ kind: "integer", value: definition.defaultValue });
    case "token":
      return Object.freeze({ kind: "token", value: definition.defaultValue });
  }
  throw new TypeError(`unsupported StoryValue definition ${String(definition)}`);
}

export function createPocGameplayModuleTupleV1(
  program: DeepReadonly<PocSimulationProgramV1>,
): PocGameplayModuleTupleV1 {
  const initial = program.data.initialState;
  const definitions = program.data.stateDefinitions;
  const dayOne = parseDayIndex(1);

  const actors = createPocActorsGameplayModuleV1({
    player: initial.player,
    heroine: initial.heroine,
    relationship: initial.relationship,
  });
  const status = createPocStatusGameplayModuleV1({ auras: initial.auras });
  const inventory = createPocInventoryGameplayModuleV1({
    startingCash: initial.cash,
    cash: initial.cash,
    ingredientBatches: initial.ingredientBatches,
    itemStacks: initial.itemStacks,
    ledger: [],
  });
  const tavern = createPocTavernGameplayModuleV1({
    reputation: initial.reputation,
    unlockedRecipeIds: initial.unlockedRecipeIds,
    helper: initial.helper,
    preparation: { day: dayOne, actionCount: parseNonNegativeSafeInteger(0) },
    servicePlan: null,
    demandSeeds: [],
    currentDemand: null,
    serviceHistory: [],
  });
  const progression = createPocProgressionGameplayModuleV1({
    facts: definitions.facts.map((definition) => ({
      factId: definition.factId,
      value: initialStoryValueV1(definition.value),
    })),
    quests: definitions.quests.map(({ initial: quest }) => quest),
    outcomes: definitions.outcomes.map((definition) => ({
      outcomeId: definition.outcomeId,
      value: initialStoryValueV1(definition.value),
    })),
    resolvedChecks: [],
  });

  const modules = [
    pocRunGameplayModuleV1,
    pocCalendarGameplayModuleV1,
    actors,
    status,
    inventory,
    pocFacilitiesGameplayModuleV1,
    tavern,
    pocWorkflowGameplayModuleV1,
    progression,
    pocNarrativeGameplayModuleV1,
  ] as const satisfies PocGameplayModuleTupleV1;
  return Object.freeze(modules);
}
