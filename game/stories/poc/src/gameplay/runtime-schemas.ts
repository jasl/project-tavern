// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import type { RuntimeSchemaV1 } from "@sillymaker/base";

import {
  parseActionId,
  parseCheckpointId,
  parseEventId,
  parseOpeningSessionId,
  parseRecipeId,
  parseRunId,
  parseSceneId,
} from "./contracts/ids.js";
import type { PocGameStateV1, PocGameplayFactV1 } from "./contracts/types.js";
import {
  deepFreezePocValueV1,
  parseMoney,
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parseQuantity,
} from "./contracts/values.js";
import {
  pocActorsGameplayFactSchemaV1,
  pocActorsStateSchemaV1,
} from "./modules/actors/contract.js";
import {
  pocCalendarGameplayFactSchemaV1,
  pocCalendarStateSchemaV1,
} from "./modules/calendar/contract.js";
import {
  pocFacilitiesGameplayFactSchemaV1,
  pocFacilitiesStateSchemaV1,
} from "./modules/facilities/contract.js";
import {
  parsePocInventoryLedgerEntryV1,
  pocInventoryGameplayFactSchemaV1,
  pocInventoryStateSchemaV1,
} from "./modules/inventory/contract.js";
import {
  pocNarrativeGameplayFactSchemaV1,
  pocNarrativeStateSchemaV1,
} from "./modules/narrative/contract.js";
import {
  pocProgressionGameplayFactSchemaV1,
  pocProgressionStateSchemaV1,
} from "./modules/progression/contract.js";
import { pocRunGameplayFactSchemaV1, pocRunStateSchemaV1 } from "./modules/run/contract.js";
import {
  pocStatusGameplayFactSchemaV1,
  pocStatusStateSchemaV1,
} from "./modules/status/contract.js";
import {
  parsePocTavernDemandDayV1,
  parsePocTavernOpeningOrderLineV1,
  parsePocTavernPlannedRecipeV1,
  pocTavernGameplayFactSchemaV1,
  pocTavernStateSchemaV1,
} from "./modules/tavern/contract.js";
import {
  pocWorkflowGameplayFactSchemaV1,
  pocWorkflowStateSchemaV1,
} from "./modules/workflow/contract.js";

type PlainDataRecordV1 = Record<string, unknown>;

function exactDataObjectV1(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): PlainDataRecordV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const expected = new Set(expectedKeys);
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== expected.size ||
    keys.some((key) => typeof key !== "string" || !expected.has(key))
  ) {
    throw new TypeError(`invalid ${label} fields`);
  }
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} field ${key}`);
    }
  }
  return value as PlainDataRecordV1;
}

function dataPropertyV1(record: PlainDataRecordV1, key: string, label: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined || !("value" in descriptor)) {
    throw new TypeError(`missing ${label} field ${key}`);
  }
  return descriptor.value;
}

function dataObjectForKindV1(value: unknown, label: string): PlainDataRecordV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, "kind");
  if (
    descriptor === undefined ||
    descriptor.get !== undefined ||
    descriptor.set !== undefined ||
    !("value" in descriptor) ||
    descriptor.enumerable !== true
  ) {
    throw new TypeError(`invalid ${label} kind`);
  }
  return value as PlainDataRecordV1;
}

function exactDataArrayV1(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`invalid ${label}`);
  }
  const keys = Reflect.ownKeys(value);
  const expectedKeys = [
    ...Array.from({ length: value.length }, (_, index) => String(index)),
    "length",
  ];
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new TypeError(`invalid ${label} fields`);
  }
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} item ${index}`);
    }
  }
  return value;
}

function parsePocGameStateV1(value: unknown): PocGameStateV1 {
  const state = exactDataObjectV1(value, ["simulation", "story"], "Gameplay State");
  const simulation = exactDataObjectV1(
    dataPropertyV1(state, "simulation", "Gameplay State"),
    ["run", "calendar", "actors", "inventory", "status", "facilities", "tavern", "activeWorkflow"],
    "Gameplay Simulation State",
  );
  const story = exactDataObjectV1(
    dataPropertyV1(state, "story", "Gameplay State"),
    ["facts", "quests", "outcomes", "resolvedChecks", "narrative"],
    "Gameplay Story State",
  );
  const progression = pocProgressionStateSchemaV1.parse({
    facts: dataPropertyV1(story, "facts", "Gameplay Story State"),
    quests: dataPropertyV1(story, "quests", "Gameplay Story State"),
    outcomes: dataPropertyV1(story, "outcomes", "Gameplay Story State"),
    resolvedChecks: dataPropertyV1(story, "resolvedChecks", "Gameplay Story State"),
  });
  return deepFreezePocValueV1({
    simulation: {
      run: pocRunStateSchemaV1.parse(
        dataPropertyV1(simulation, "run", "Gameplay Simulation State"),
      ),
      calendar: pocCalendarStateSchemaV1.parse(
        dataPropertyV1(simulation, "calendar", "Gameplay Simulation State"),
      ),
      actors: pocActorsStateSchemaV1.parse(
        dataPropertyV1(simulation, "actors", "Gameplay Simulation State"),
      ),
      inventory: pocInventoryStateSchemaV1.parse(
        dataPropertyV1(simulation, "inventory", "Gameplay Simulation State"),
      ),
      status: pocStatusStateSchemaV1.parse(
        dataPropertyV1(simulation, "status", "Gameplay Simulation State"),
      ),
      facilities: pocFacilitiesStateSchemaV1.parse(
        dataPropertyV1(simulation, "facilities", "Gameplay Simulation State"),
      ),
      tavern: pocTavernStateSchemaV1.parse(
        dataPropertyV1(simulation, "tavern", "Gameplay Simulation State"),
      ),
      activeWorkflow: pocWorkflowStateSchemaV1.parse(
        dataPropertyV1(simulation, "activeWorkflow", "Gameplay Simulation State"),
      ),
    },
    story: {
      ...progression,
      narrative: pocNarrativeStateSchemaV1.parse(
        dataPropertyV1(story, "narrative", "Gameplay Story State"),
      ),
    },
  });
}

export const pocGameStateSchemaV1: RuntimeSchemaV1<PocGameStateV1> = Object.freeze({
  parse: parsePocGameStateV1,
});

type PocGameplayFactKindV1 = PocGameplayFactV1["kind"];
type PocGameplayFactParserV1 = (value: unknown) => PocGameplayFactV1;

function parseRunStartedFactV1(value: unknown): PocGameplayFactV1 {
  const fact = exactDataObjectV1(
    value,
    ["kind", "runId", "initialSeed", "demandSeeds"],
    "run.started Fact",
  );
  if (dataPropertyV1(fact, "kind", "run.started Fact") !== "run.started") {
    throw new TypeError("invalid run.started Fact kind");
  }
  return deepFreezePocValueV1({
    kind: "run.started",
    runId: parseRunId(dataPropertyV1(fact, "runId", "run.started Fact")),
    initialSeed: parseNonZeroUint32(dataPropertyV1(fact, "initialSeed", "run.started Fact")),
    demandSeeds: exactDataArrayV1(
      dataPropertyV1(fact, "demandSeeds", "run.started Fact"),
      "run.started demandSeeds",
    ).map(parsePocTavernDemandDayV1),
  });
}

function parseFoodDiscardedFactV1(value: unknown): PocGameplayFactV1 {
  const fact = exactDataObjectV1(value, ["kind", "portions", "entries"], "food.discarded Fact");
  if (dataPropertyV1(fact, "kind", "food.discarded Fact") !== "food.discarded") {
    throw new TypeError("invalid food.discarded Fact kind");
  }
  return deepFreezePocValueV1({
    kind: "food.discarded",
    portions: exactDataArrayV1(
      dataPropertyV1(fact, "portions", "food.discarded Fact"),
      "food.discarded portions",
    ).map(parsePocTavernPlannedRecipeV1),
    entries: exactDataArrayV1(
      dataPropertyV1(fact, "entries", "food.discarded Fact"),
      "food.discarded entries",
    ).map(parsePocInventoryLedgerEntryV1),
  });
}

function parseStoryActionStartedFactV1(value: unknown): PocGameplayFactV1 {
  const fact = exactDataObjectV1(
    value,
    ["kind", "actionId", "sceneId"],
    "story.action_started Fact",
  );
  if (dataPropertyV1(fact, "kind", "story.action_started Fact") !== "story.action_started") {
    throw new TypeError("invalid story.action_started Fact kind");
  }
  const sceneId = dataPropertyV1(fact, "sceneId", "story.action_started Fact");
  return deepFreezePocValueV1({
    kind: "story.action_started",
    actionId: parseActionId(dataPropertyV1(fact, "actionId", "story.action_started Fact")),
    sceneId: sceneId === null ? null : parseSceneId(sceneId),
  });
}

function parseSchedulerEventTriggeredFactV1(value: unknown): PocGameplayFactV1 {
  const fact = exactDataObjectV1(
    value,
    ["kind", "checkpointId", "eventId"],
    "scheduler.event_triggered Fact",
  );
  if (
    dataPropertyV1(fact, "kind", "scheduler.event_triggered Fact") !== "scheduler.event_triggered"
  ) {
    throw new TypeError("invalid scheduler.event_triggered Fact kind");
  }
  return deepFreezePocValueV1({
    kind: "scheduler.event_triggered",
    checkpointId: parseCheckpointId(
      dataPropertyV1(fact, "checkpointId", "scheduler.event_triggered Fact"),
    ),
    eventId: parseEventId(dataPropertyV1(fact, "eventId", "scheduler.event_triggered Fact")),
  });
}

function parseServiceOrdersCreatedFactV1(value: unknown): PocGameplayFactV1 {
  const fact = exactDataObjectV1(
    value,
    ["kind", "sessionId", "orders"],
    "service.orders_created Fact",
  );
  if (dataPropertyV1(fact, "kind", "service.orders_created Fact") !== "service.orders_created") {
    throw new TypeError("invalid service.orders_created Fact kind");
  }
  return deepFreezePocValueV1({
    kind: "service.orders_created",
    sessionId: parseOpeningSessionId(
      dataPropertyV1(fact, "sessionId", "service.orders_created Fact"),
    ),
    orders: exactDataArrayV1(
      dataPropertyV1(fact, "orders", "service.orders_created Fact"),
      "service.orders_created orders",
    ).map(parsePocTavernOpeningOrderLineV1),
  });
}

function parseServiceCapacityLimitedFactV1(value: unknown): PocGameplayFactV1 {
  const fact = exactDataObjectV1(
    value,
    ["kind", "sessionId", "receptionCapacity", "preparationCapacity"],
    "service.capacity_limited Fact",
  );
  if (
    dataPropertyV1(fact, "kind", "service.capacity_limited Fact") !== "service.capacity_limited"
  ) {
    throw new TypeError("invalid service.capacity_limited Fact kind");
  }
  return deepFreezePocValueV1({
    kind: "service.capacity_limited",
    sessionId: parseOpeningSessionId(
      dataPropertyV1(fact, "sessionId", "service.capacity_limited Fact"),
    ),
    receptionCapacity: parseNonNegativeSafeInteger(
      dataPropertyV1(fact, "receptionCapacity", "service.capacity_limited Fact"),
    ),
    preparationCapacity: parseNonNegativeSafeInteger(
      dataPropertyV1(fact, "preparationCapacity", "service.capacity_limited Fact"),
    ),
  });
}

function parseServiceSaleFactV1(value: unknown): PocGameplayFactV1 {
  const fact = exactDataObjectV1(
    value,
    ["kind", "sessionId", "recipeId", "quantity", "revenue"],
    "service.sale Fact",
  );
  if (dataPropertyV1(fact, "kind", "service.sale Fact") !== "service.sale") {
    throw new TypeError("invalid service.sale Fact kind");
  }
  return deepFreezePocValueV1({
    kind: "service.sale",
    sessionId: parseOpeningSessionId(dataPropertyV1(fact, "sessionId", "service.sale Fact")),
    recipeId: parseRecipeId(dataPropertyV1(fact, "recipeId", "service.sale Fact")),
    quantity: parseQuantity(dataPropertyV1(fact, "quantity", "service.sale Fact")),
    revenue: parseNonNegativeSafeInteger(dataPropertyV1(fact, "revenue", "service.sale Fact")),
  });
}

function parseLevyPaidFactV1(value: unknown): PocGameplayFactV1 {
  const fact = exactDataObjectV1(value, ["kind", "amount", "cash"], "levy.paid Fact");
  if (dataPropertyV1(fact, "kind", "levy.paid Fact") !== "levy.paid") {
    throw new TypeError("invalid levy.paid Fact kind");
  }
  const cash = exactDataObjectV1(
    dataPropertyV1(fact, "cash", "levy.paid Fact"),
    ["before", "after"],
    "levy.paid cash",
  );
  return deepFreezePocValueV1({
    kind: "levy.paid",
    amount: parseMoney(dataPropertyV1(fact, "amount", "levy.paid Fact")),
    cash: {
      before: parseMoney(dataPropertyV1(cash, "before", "levy.paid cash")),
      after: parseMoney(dataPropertyV1(cash, "after", "levy.paid cash")),
    },
  });
}

const pocGameplayFactParsersV1 = Object.freeze({
  "run.started": parseRunStartedFactV1,
  "policy.chosen": pocCalendarGameplayFactSchemaV1.parse,
  "demand.materialized": pocTavernGameplayFactSchemaV1.parse,
  "calendar.ap_changed": pocCalendarGameplayFactSchemaV1.parse,
  "calendar.phase_advanced": pocCalendarGameplayFactSchemaV1.parse,
  "actor.stamina_changed": pocActorsGameplayFactSchemaV1.parse,
  "actor.mood_changed": pocActorsGameplayFactSchemaV1.parse,
  "relationship.affection_changed": pocActorsGameplayFactSchemaV1.parse,
  "relationship.teamwork_changed": pocActorsGameplayFactSchemaV1.parse,
  "relationship.stage_changed": pocActorsGameplayFactSchemaV1.parse,
  "inventory.purchased": pocInventoryGameplayFactSchemaV1.parse,
  "inventory.consumed": pocInventoryGameplayFactSchemaV1.parse,
  "inventory.ingredient_granted": pocInventoryGameplayFactSchemaV1.parse,
  "inventory.item_granted": pocInventoryGameplayFactSchemaV1.parse,
  "inventory.item_consumed": pocInventoryGameplayFactSchemaV1.parse,
  "inventory.spoiled": pocInventoryGameplayFactSchemaV1.parse,
  "food.prepared": pocTavernGameplayFactSchemaV1.parse,
  "food.discarded": parseFoodDiscardedFactV1,
  "cash.changed": pocInventoryGameplayFactSchemaV1.parse,
  "reputation.changed": pocTavernGameplayFactSchemaV1.parse,
  "tavern.helper_changed": pocTavernGameplayFactSchemaV1.parse,
  "story.action_started": parseStoryActionStartedFactV1,
  "facility.choice_committed": pocFacilitiesGameplayFactSchemaV1.parse,
  "aura.applied": pocStatusGameplayFactSchemaV1.parse,
  "aura.cleared": pocStatusGameplayFactSchemaV1.parse,
  "aura.expired": pocStatusGameplayFactSchemaV1.parse,
  "tavern.plan_set": pocTavernGameplayFactSchemaV1.parse,
  "tavern.planned_closed": pocTavernGameplayFactSchemaV1.parse,
  "tavern.emergency_closed": pocTavernGameplayFactSchemaV1.parse,
  "opening.started": pocWorkflowGameplayFactSchemaV1.parse,
  "opening.checkpoint_advanced": pocWorkflowGameplayFactSchemaV1.parse,
  "scheduler.event_triggered": parseSchedulerEventTriggeredFactV1,
  "service.orders_created": parseServiceOrdersCreatedFactV1,
  "service.capacity_limited": parseServiceCapacityLimitedFactV1,
  "service.sale": parseServiceSaleFactV1,
  "opening.finalized": pocTavernGameplayFactSchemaV1.parse,
  "world.action_started": pocWorkflowGameplayFactSchemaV1.parse,
  "world.action_completed": pocWorkflowGameplayFactSchemaV1.parse,
  "narrative.advanced": pocNarrativeGameplayFactSchemaV1.parse,
  "narrative.choice_committed": pocNarrativeGameplayFactSchemaV1.parse,
  "check.resolved": pocProgressionGameplayFactSchemaV1.parse,
  "fact.set": pocProgressionGameplayFactSchemaV1.parse,
  "quest.updated": pocProgressionGameplayFactSchemaV1.parse,
  "outcome.set": pocProgressionGameplayFactSchemaV1.parse,
  "levy.paid": parseLevyPaidFactV1,
  "run.completed": pocRunGameplayFactSchemaV1.parse,
} satisfies Record<PocGameplayFactKindV1, PocGameplayFactParserV1>);

export const pocGameplayFactKindsV1 = Object.freeze(
  Object.keys(pocGameplayFactParsersV1) as PocGameplayFactKindV1[],
);

export const pocGameplayFactSchemaV1: RuntimeSchemaV1<PocGameplayFactV1> = Object.freeze({
  parse(value: unknown): PocGameplayFactV1 {
    const candidate = dataObjectForKindV1(value, "GameplayFact");
    const kind = dataPropertyV1(candidate, "kind", "GameplayFact");
    if (typeof kind !== "string" || !Object.hasOwn(pocGameplayFactParsersV1, kind)) {
      throw new TypeError("invalid GameplayFact kind");
    }
    return pocGameplayFactParsersV1[kind as PocGameplayFactKindV1](value);
  },
});
