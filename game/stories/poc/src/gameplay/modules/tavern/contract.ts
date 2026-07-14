// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { canonicalJsonBytes } from "@sillymaker/base";
import type {
  DeepReadonly,
  ModuleOwnerProposalEnvelopeV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";

import {
  parseActionId,
  parseActorId,
  parseAuraId,
  parseCalendarPhase,
  parseCheckId,
  parseCustomerSegmentId,
  parseEndingId,
  parseEventId,
  parseFacilityId,
  parseHelperTier,
  parseIngredientId,
  parseLedgerEntryId,
  parseModifierSourceId,
  parseOpeningSessionId,
  parseReasonId,
  parseRecipeId,
  parseServiceMode,
  parseOpenServiceMode,
} from "../../contracts/ids.js";
import { pocDebugCommandKindsV1 } from "../../contracts/types.js";
import type {
  AppliedModifierV1,
  ChangeReasonV1,
  ClosureHistoryV1,
  DailyPreparationStateV1,
  DemandDayStateV1,
  DemandRandomOffset,
  DemandSeedSegmentStateV1,
  HelperStateV1,
  MaterializedDemandDayV1,
  MaterializedDemandSegmentV1,
  ModifierSourceRefV1,
  ModifierV1,
  OpeningLedgerV1,
  OpeningOrderLineV1,
  PlannedRecipeV1,
  PocDebugCommandV1,
  PocGameCommandV1,
  PocGameplayFactV1,
  ServiceHistoryEntryV1,
  TavernPlanV1,
  TavernStateV1,
} from "../../contracts/types.js";
import {
  deepFreezePocValueV1,
  parseDayIndex,
  parseMoney,
  parseMoodPoint,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseQuantity,
  parseSafeInteger,
} from "../../contracts/values.js";
import type {
  DayIndex,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
  SafeInteger,
} from "../../contracts/values.js";
import type { CalendarPhase, ReasonId, RecipeId, ServiceMode } from "../../contracts/ids.js";

type PlainDataRecordV1 = Record<string, unknown>;

const pocGameCommandKindsV1 = Object.freeze([
  "run.start",
  "policy.choose",
  "inventory.buy",
  "actor.prepare_food",
  "actor.rest",
  "story.action.start",
  "facility.choose",
  "tavern.plan.set",
  "tavern.opening.start",
  "tavern.opening.continue",
  "tavern.opening.finalize",
  "world.action.begin",
  "world.action.complete",
  "narrative.advance",
  "narrative.choose",
  "calendar.advance_phase",
  "levy.pay",
] as const satisfies readonly PocGameCommandV1["kind"][]);

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

function exactDataObjectForKindV1(value: unknown, label: string): PlainDataRecordV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const keys = Reflect.ownKeys(value);
  if (!keys.includes("kind") || keys.some((key) => typeof key !== "string")) {
    throw new TypeError(`invalid ${label} fields`);
  }
  for (const key of keys) {
    if (typeof key !== "string") throw new TypeError(`invalid ${label} fields`);
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
    throw new TypeError(`invalid ${label} field ${key}`);
  }
  return descriptor.value;
}

function exactDataArrayV1(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`invalid ${label}`);
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined ||
    !("value" in lengthDescriptor) ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    lengthDescriptor.enumerable !== false
  ) {
    throw new TypeError(`invalid ${label} length`);
  }
  const length = lengthDescriptor.value;
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== length + 1 ||
    keys.some(
      (key) =>
        typeof key !== "string" ||
        (key !== "length" && (!/^(?:0|[1-9][0-9]*)$/u.test(key) || Number(key) >= length)),
    )
  ) {
    throw new TypeError(`invalid ${label} fields`);
  }
  const parsed: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} element ${index}`);
    }
    parsed.push(descriptor.value);
  }
  return parsed;
}

function parseCommandKindV1(value: unknown): PocGameCommandV1["kind"] {
  if (
    typeof value !== "string" ||
    !pocGameCommandKindsV1.includes(value as PocGameCommandV1["kind"])
  ) {
    throw new TypeError("invalid PoC command kind");
  }
  return value as PocGameCommandV1["kind"];
}

function parseDebugCommandKindV1(value: unknown): PocDebugCommandV1["kind"] {
  if (
    typeof value !== "string" ||
    !pocDebugCommandKindsV1.includes(value as PocDebugCommandV1["kind"])
  ) {
    throw new TypeError("invalid PoC debug command kind");
  }
  return value as PocDebugCommandV1["kind"];
}

export function parsePocTavernChangeReasonV1(value: unknown): ChangeReasonV1 {
  const candidate = exactDataObjectForKindV1(value, "Tavern change reason");
  const kind = dataPropertyV1(candidate, "kind", "Tavern change reason");
  const expectedKeys = (() => {
    if (kind === "command" || kind === "debug") return ["kind", "commandKind", "reasonId"];
    if (kind === "event") return ["kind", "eventId", "reasonId"];
    if (kind === "story_action" || kind === "world_action") {
      return ["kind", "actionId", "reasonId"];
    }
    if (kind === "aura") return ["kind", "auraId", "reasonId"];
    if (kind === "facility") return ["kind", "facilityId", "reasonId"];
    if (kind === "ending") return ["kind", "endingId", "reasonId"];
    throw new TypeError("invalid Tavern change reason kind");
  })();
  const reason = exactDataObjectV1(value, expectedKeys, "Tavern change reason");
  const reasonId = parseReasonId(dataPropertyV1(reason, "reasonId", "Tavern change reason"));
  if (kind === "command") {
    return deepFreezePocValueV1({
      kind,
      commandKind: parseCommandKindV1(
        dataPropertyV1(reason, "commandKind", "Tavern change reason"),
      ),
      reasonId,
    });
  }
  if (kind === "debug") {
    return deepFreezePocValueV1({
      kind,
      commandKind: parseDebugCommandKindV1(
        dataPropertyV1(reason, "commandKind", "Tavern change reason"),
      ),
      reasonId,
    });
  }
  if (kind === "event") {
    return deepFreezePocValueV1({
      kind,
      eventId: parseEventId(dataPropertyV1(reason, "eventId", "Tavern change reason")),
      reasonId,
    });
  }
  if (kind === "story_action" || kind === "world_action") {
    return deepFreezePocValueV1({
      kind,
      actionId: parseActionId(dataPropertyV1(reason, "actionId", "Tavern change reason")),
      reasonId,
    });
  }
  if (kind === "aura") {
    return deepFreezePocValueV1({
      kind,
      auraId: parseAuraId(dataPropertyV1(reason, "auraId", "Tavern change reason")),
      reasonId,
    });
  }
  if (kind === "facility") {
    return deepFreezePocValueV1({
      kind,
      facilityId: parseFacilityId(dataPropertyV1(reason, "facilityId", "Tavern change reason")),
      reasonId,
    });
  }
  if (kind === "ending") {
    return deepFreezePocValueV1({
      kind,
      endingId: parseEndingId(dataPropertyV1(reason, "endingId", "Tavern change reason")),
      reasonId,
    });
  }
  throw new TypeError("invalid Tavern change reason");
}

export function parsePocTavernHelperStateV1(value: unknown): HelperStateV1 {
  const helper = exactDataObjectV1(value, ["unlocked", "tier"], "Tavern helper State");
  const unlocked = dataPropertyV1(helper, "unlocked", "Tavern helper State");
  if (typeof unlocked !== "boolean") throw new TypeError("invalid Tavern helper unlocked flag");
  return deepFreezePocValueV1({
    unlocked,
    tier: parseHelperTier(dataPropertyV1(helper, "tier", "Tavern helper State")),
  });
}

export function parsePocTavernPlanV1(value: unknown): TavernPlanV1 {
  const plan = exactDataObjectV1(value, ["mode", "menu"], "Tavern plan");
  return deepFreezePocValueV1({
    mode: parseServiceMode(dataPropertyV1(plan, "mode", "Tavern plan")),
    menu: exactDataArrayV1(dataPropertyV1(plan, "menu", "Tavern plan"), "Tavern plan menu").map(
      (line) => {
        const recipe = exactDataObjectV1(line, ["recipeId", "portions"], "Tavern planned recipe");
        return {
          recipeId: parseRecipeId(dataPropertyV1(recipe, "recipeId", "Tavern planned recipe")),
          portions: parseQuantity(dataPropertyV1(recipe, "portions", "Tavern planned recipe")),
        } satisfies PlannedRecipeV1;
      },
    ),
  });
}

function parseDemandRandomOffsetV1(value: unknown): DemandRandomOffset {
  if (value !== -1 && value !== 0 && value !== 1) {
    throw new TypeError("invalid Tavern demand random offset");
  }
  return value;
}

function parsePocTavernDemandSeedSegmentV1(value: unknown): DemandSeedSegmentStateV1 {
  const segment = exactDataObjectV1(
    value,
    ["segmentId", "baseCustomers", "randomOffset"],
    "Tavern demand seed segment",
  );
  return deepFreezePocValueV1({
    segmentId: parseCustomerSegmentId(
      dataPropertyV1(segment, "segmentId", "Tavern demand seed segment"),
    ),
    baseCustomers: parseNonNegativeSafeInteger(
      dataPropertyV1(segment, "baseCustomers", "Tavern demand seed segment"),
    ),
    randomOffset: parseDemandRandomOffsetV1(
      dataPropertyV1(segment, "randomOffset", "Tavern demand seed segment"),
    ),
  });
}

export function parsePocTavernDemandDayV1(value: unknown): DemandDayStateV1 {
  const day = exactDataObjectV1(value, ["day", "segments"], "Tavern demand seed day");
  return deepFreezePocValueV1({
    day: parseDayIndex(dataPropertyV1(day, "day", "Tavern demand seed day")),
    segments: exactDataArrayV1(
      dataPropertyV1(day, "segments", "Tavern demand seed day"),
      "Tavern demand seed segments",
    ).map(parsePocTavernDemandSeedSegmentV1),
  });
}

function parseModifierSourceV1(value: unknown): ModifierSourceRefV1 {
  const candidate = exactDataObjectForKindV1(value, "Tavern Modifier source");
  const kind = dataPropertyV1(candidate, "kind", "Tavern Modifier source");
  if (kind === "facility") {
    const source = exactDataObjectV1(value, ["kind", "facilityId"], "Tavern Modifier source");
    return deepFreezePocValueV1({
      kind,
      facilityId: parseFacilityId(dataPropertyV1(source, "facilityId", "Tavern Modifier source")),
    });
  }
  if (kind === "aura") {
    const source = exactDataObjectV1(value, ["kind", "auraId"], "Tavern Modifier source");
    return deepFreezePocValueV1({
      kind,
      auraId: parseAuraId(dataPropertyV1(source, "auraId", "Tavern Modifier source")),
    });
  }
  if (kind === "event") {
    const source = exactDataObjectV1(value, ["kind", "eventId"], "Tavern Modifier source");
    return deepFreezePocValueV1({
      kind,
      eventId: parseEventId(dataPropertyV1(source, "eventId", "Tavern Modifier source")),
    });
  }
  if (kind === "story") {
    const source = exactDataObjectV1(value, ["kind", "sourceId"], "Tavern Modifier source");
    return deepFreezePocValueV1({
      kind,
      sourceId: parseModifierSourceId(dataPropertyV1(source, "sourceId", "Tavern Modifier source")),
    });
  }
  throw new TypeError("invalid Tavern Modifier source kind");
}

function parseServiceModesV1(value: unknown, label: string): readonly ServiceMode[] {
  return deepFreezePocValueV1(exactDataArrayV1(value, label).map(parseServiceMode));
}

function parseModifierV1(value: unknown): ModifierV1 {
  const candidate = exactDataObjectForKindV1(value, "Tavern Modifier");
  const kind = dataPropertyV1(candidate, "kind", "Tavern Modifier");
  if (kind === "teamwork_gain.block") {
    const modifier = exactDataObjectV1(value, ["kind", "source", "reasonId"], "Tavern Modifier");
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceV1(dataPropertyV1(modifier, "source", "Tavern Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Tavern Modifier")),
    });
  }
  if (kind === "recovery.add") {
    const modifier = exactDataObjectV1(
      value,
      ["kind", "source", "actorId", "amount", "reasonId"],
      "Tavern Modifier",
    );
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceV1(dataPropertyV1(modifier, "source", "Tavern Modifier")),
      actorId: parseActorId(dataPropertyV1(modifier, "actorId", "Tavern Modifier")),
      amount: parseSafeInteger(dataPropertyV1(modifier, "amount", "Tavern Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Tavern Modifier")),
    });
  }
  if (kind === "demand.add") {
    const modifier = exactDataObjectV1(
      value,
      ["kind", "source", "segmentId", "amount", "reasonId"],
      "Tavern Modifier",
    );
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceV1(dataPropertyV1(modifier, "source", "Tavern Modifier")),
      segmentId: parseCustomerSegmentId(dataPropertyV1(modifier, "segmentId", "Tavern Modifier")),
      amount: parseSafeInteger(dataPropertyV1(modifier, "amount", "Tavern Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Tavern Modifier")),
    });
  }
  if (kind === "check.add") {
    const modifier = exactDataObjectV1(
      value,
      ["kind", "source", "checkId", "amount", "reasonId"],
      "Tavern Modifier",
    );
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceV1(dataPropertyV1(modifier, "source", "Tavern Modifier")),
      checkId: parseCheckId(dataPropertyV1(modifier, "checkId", "Tavern Modifier")),
      amount: parseSafeInteger(dataPropertyV1(modifier, "amount", "Tavern Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Tavern Modifier")),
    });
  }
  if (kind === "shelf_life.add_days") {
    const modifier = exactDataObjectV1(
      value,
      ["kind", "source", "ingredientIds", "amount", "reasonId"],
      "Tavern Modifier",
    );
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceV1(dataPropertyV1(modifier, "source", "Tavern Modifier")),
      ingredientIds: exactDataArrayV1(
        dataPropertyV1(modifier, "ingredientIds", "Tavern Modifier"),
        "Tavern Modifier IngredientIds",
      ).map(parseIngredientId),
      amount: parsePositiveSafeInteger(dataPropertyV1(modifier, "amount", "Tavern Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Tavern Modifier")),
    });
  }
  if (kind === "capacity.add" || kind === "prep_points.add" || kind === "service_cost.add") {
    const modifier = exactDataObjectV1(
      value,
      ["kind", "source", "modes", "amount", "reasonId"],
      "Tavern Modifier",
    );
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceV1(dataPropertyV1(modifier, "source", "Tavern Modifier")),
      modes: parseServiceModesV1(
        dataPropertyV1(modifier, "modes", "Tavern Modifier"),
        "Tavern Modifier modes",
      ),
      amount: parseSafeInteger(dataPropertyV1(modifier, "amount", "Tavern Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Tavern Modifier")),
    });
  }
  throw new TypeError("invalid Tavern Modifier kind");
}

function parseAppliedModifierV1(value: unknown): AppliedModifierV1 {
  const applied = exactDataObjectV1(value, ["modifier", "contribution"], "Tavern applied Modifier");
  return deepFreezePocValueV1({
    modifier: parseModifierV1(dataPropertyV1(applied, "modifier", "Tavern applied Modifier")),
    contribution: parseSafeInteger(
      dataPropertyV1(applied, "contribution", "Tavern applied Modifier"),
    ),
  });
}

function parseIntegerRangeV1(value: unknown, label: string) {
  const range = exactDataObjectV1(value, ["min", "max"], label);
  return deepFreezePocValueV1({
    min: parseSafeInteger(dataPropertyV1(range, "min", label)),
    max: parseSafeInteger(dataPropertyV1(range, "max", label)),
  });
}

function parseMaterializedDemandSegmentV1(value: unknown): MaterializedDemandSegmentV1 {
  const segment = exactDataObjectV1(
    value,
    ["segmentId", "preview", "actualCustomers", "modifiers"],
    "Tavern materialized demand segment",
  );
  return deepFreezePocValueV1({
    segmentId: parseCustomerSegmentId(
      dataPropertyV1(segment, "segmentId", "Tavern materialized demand segment"),
    ),
    preview: parseIntegerRangeV1(
      dataPropertyV1(segment, "preview", "Tavern materialized demand segment"),
      "Tavern materialized demand preview",
    ),
    actualCustomers: parseNonNegativeSafeInteger(
      dataPropertyV1(segment, "actualCustomers", "Tavern materialized demand segment"),
    ),
    modifiers: exactDataArrayV1(
      dataPropertyV1(segment, "modifiers", "Tavern materialized demand segment"),
      "Tavern materialized demand modifiers",
    ).map(parseAppliedModifierV1),
  });
}

export function parsePocTavernMaterializedDemandDayV1(value: unknown): MaterializedDemandDayV1 {
  const day = exactDataObjectV1(value, ["day", "segments"], "Tavern materialized demand day");
  return deepFreezePocValueV1({
    day: parseDayIndex(dataPropertyV1(day, "day", "Tavern materialized demand day")),
    segments: exactDataArrayV1(
      dataPropertyV1(day, "segments", "Tavern materialized demand day"),
      "Tavern materialized demand segments",
    ).map(parseMaterializedDemandSegmentV1),
  });
}

function parseOpeningOrderLineV1(value: unknown): OpeningOrderLineV1 {
  const line = exactDataObjectV1(
    value,
    [
      "segmentId",
      "recipeId",
      "potentialCustomers",
      "effectiveOrders",
      "capacityAccepted",
      "actualSales",
    ],
    "Tavern Opening order line",
  );
  return deepFreezePocValueV1({
    segmentId: parseCustomerSegmentId(
      dataPropertyV1(line, "segmentId", "Tavern Opening order line"),
    ),
    recipeId: parseRecipeId(dataPropertyV1(line, "recipeId", "Tavern Opening order line")),
    potentialCustomers: parseNonNegativeSafeInteger(
      dataPropertyV1(line, "potentialCustomers", "Tavern Opening order line"),
    ),
    effectiveOrders: parseNonNegativeSafeInteger(
      dataPropertyV1(line, "effectiveOrders", "Tavern Opening order line"),
    ),
    capacityAccepted: parseNonNegativeSafeInteger(
      dataPropertyV1(line, "capacityAccepted", "Tavern Opening order line"),
    ),
    actualSales: parseNonNegativeSafeInteger(
      dataPropertyV1(line, "actualSales", "Tavern Opening order line"),
    ),
  });
}

function parseNonNegativeBeforeAfterV1(value: unknown, label: string) {
  const pair = exactDataObjectV1(value, ["before", "after"], label);
  return deepFreezePocValueV1({
    before: parseNonNegativeSafeInteger(dataPropertyV1(pair, "before", label)),
    after: parseNonNegativeSafeInteger(dataPropertyV1(pair, "after", label)),
  });
}

function parseMoneyBeforeAfterV1(value: unknown, label: string) {
  const pair = exactDataObjectV1(value, ["before", "after"], label);
  return deepFreezePocValueV1({
    before: parseMoney(dataPropertyV1(pair, "before", label)),
    after: parseMoney(dataPropertyV1(pair, "after", label)),
  });
}

function parseMoodBeforeAfterV1(value: unknown, label: string) {
  const pair = exactDataObjectV1(value, ["before", "after"], label);
  return deepFreezePocValueV1({
    before: parseMoodPoint(dataPropertyV1(pair, "before", label)),
    after: parseMoodPoint(dataPropertyV1(pair, "after", label)),
  });
}

export function parsePocTavernOpeningLedgerV1(value: unknown): OpeningLedgerV1 {
  const ledger = exactDataObjectV1(
    value,
    [
      "sessionId",
      "day",
      "mode",
      "preparationActionCount",
      "menu",
      "orders",
      "receptionCapacity",
      "preparationCapacity",
      "discardedPortions",
      "entryIds",
      "ap",
      "playerStamina",
      "heroineStamina",
      "cash",
      "reputation",
      "teamwork",
      "heroineMood",
      "triggeredEventIds",
      "appliedModifiers",
    ],
    "Tavern Opening ledger",
  );
  const parseMenu = (key: "menu" | "discardedPortions"): readonly PlannedRecipeV1[] =>
    exactDataArrayV1(
      dataPropertyV1(ledger, key, "Tavern Opening ledger"),
      `Tavern Opening ledger ${key}`,
    ).map((line) => {
      const recipe = exactDataObjectV1(
        line,
        ["recipeId", "portions"],
        "Tavern Opening ledger recipe",
      );
      return deepFreezePocValueV1({
        recipeId: parseRecipeId(dataPropertyV1(recipe, "recipeId", "Tavern Opening ledger recipe")),
        portions: parseQuantity(dataPropertyV1(recipe, "portions", "Tavern Opening ledger recipe")),
      });
    });
  return deepFreezePocValueV1({
    sessionId: parseOpeningSessionId(dataPropertyV1(ledger, "sessionId", "Tavern Opening ledger")),
    day: parseDayIndex(dataPropertyV1(ledger, "day", "Tavern Opening ledger")),
    mode: parseOpenServiceMode(dataPropertyV1(ledger, "mode", "Tavern Opening ledger")),
    preparationActionCount: parseNonNegativeSafeInteger(
      dataPropertyV1(ledger, "preparationActionCount", "Tavern Opening ledger"),
    ),
    menu: parseMenu("menu"),
    orders: exactDataArrayV1(
      dataPropertyV1(ledger, "orders", "Tavern Opening ledger"),
      "Tavern Opening ledger orders",
    ).map(parseOpeningOrderLineV1),
    receptionCapacity: parseNonNegativeSafeInteger(
      dataPropertyV1(ledger, "receptionCapacity", "Tavern Opening ledger"),
    ),
    preparationCapacity: parseNonNegativeSafeInteger(
      dataPropertyV1(ledger, "preparationCapacity", "Tavern Opening ledger"),
    ),
    discardedPortions: parseMenu("discardedPortions"),
    entryIds: exactDataArrayV1(
      dataPropertyV1(ledger, "entryIds", "Tavern Opening ledger"),
      "Tavern Opening ledger entry IDs",
    ).map(parseLedgerEntryId),
    ap: parseNonNegativeBeforeAfterV1(
      dataPropertyV1(ledger, "ap", "Tavern Opening ledger"),
      "Tavern Opening AP",
    ),
    playerStamina: parseNonNegativeBeforeAfterV1(
      dataPropertyV1(ledger, "playerStamina", "Tavern Opening ledger"),
      "Tavern Opening player stamina",
    ),
    heroineStamina: parseNonNegativeBeforeAfterV1(
      dataPropertyV1(ledger, "heroineStamina", "Tavern Opening ledger"),
      "Tavern Opening heroine stamina",
    ),
    cash: parseMoneyBeforeAfterV1(
      dataPropertyV1(ledger, "cash", "Tavern Opening ledger"),
      "Tavern Opening cash",
    ),
    reputation: parseNonNegativeBeforeAfterV1(
      dataPropertyV1(ledger, "reputation", "Tavern Opening ledger"),
      "Tavern Opening reputation",
    ),
    teamwork: parseNonNegativeBeforeAfterV1(
      dataPropertyV1(ledger, "teamwork", "Tavern Opening ledger"),
      "Tavern Opening teamwork",
    ),
    heroineMood: parseMoodBeforeAfterV1(
      dataPropertyV1(ledger, "heroineMood", "Tavern Opening ledger"),
      "Tavern Opening heroine mood",
    ),
    triggeredEventIds: exactDataArrayV1(
      dataPropertyV1(ledger, "triggeredEventIds", "Tavern Opening ledger"),
      "Tavern Opening triggered EventIds",
    ).map(parseEventId),
    appliedModifiers: exactDataArrayV1(
      dataPropertyV1(ledger, "appliedModifiers", "Tavern Opening ledger"),
      "Tavern Opening applied Modifiers",
    ).map(parseAppliedModifierV1),
  });
}

export function parsePocTavernClosureHistoryV1(value: unknown): ClosureHistoryV1 {
  const closure = exactDataObjectV1(
    value,
    ["day", "kind", "reasonId", "reputation"],
    "Tavern closure history",
  );
  const kind = dataPropertyV1(closure, "kind", "Tavern closure history");
  if (kind !== "planned" && kind !== "emergency") {
    throw new TypeError("invalid Tavern closure history kind");
  }
  return deepFreezePocValueV1({
    day: parseDayIndex(dataPropertyV1(closure, "day", "Tavern closure history")),
    kind,
    reasonId: parseReasonId(dataPropertyV1(closure, "reasonId", "Tavern closure history")),
    reputation: parseNonNegativeBeforeAfterV1(
      dataPropertyV1(closure, "reputation", "Tavern closure history"),
      "Tavern closure reputation",
    ),
  });
}

export function parsePocTavernServiceHistoryEntryV1(value: unknown): ServiceHistoryEntryV1 {
  const candidate = exactDataObjectForKindV1(value, "Tavern service history entry");
  const kind = dataPropertyV1(candidate, "kind", "Tavern service history entry");
  if (kind === "opening") {
    const entry = exactDataObjectV1(value, ["kind", "opening"], "Tavern service history entry");
    return deepFreezePocValueV1({
      kind,
      opening: parsePocTavernOpeningLedgerV1(
        dataPropertyV1(entry, "opening", "Tavern service history entry"),
      ),
    });
  }
  if (kind === "closure") {
    const entry = exactDataObjectV1(value, ["kind", "closure"], "Tavern service history entry");
    return deepFreezePocValueV1({
      kind,
      closure: parsePocTavernClosureHistoryV1(
        dataPropertyV1(entry, "closure", "Tavern service history entry"),
      ),
    });
  }
  throw new TypeError("invalid Tavern service history kind");
}

function parseDailyPreparationStateV1(value: unknown): DailyPreparationStateV1 {
  const preparation = exactDataObjectV1(value, ["day", "actionCount"], "Tavern daily preparation");
  return deepFreezePocValueV1({
    day: parseDayIndex(dataPropertyV1(preparation, "day", "Tavern daily preparation")),
    actionCount: parseNonNegativeSafeInteger(
      dataPropertyV1(preparation, "actionCount", "Tavern daily preparation"),
    ),
  });
}

function isDeeplyFrozenDataV1(value: unknown, seen = new WeakSet<object>()): boolean {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return true;
  if (seen.has(value) || !Object.isFrozen(value)) return false;
  seen.add(value);
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (key === "length" && Array.isArray(value)) continue;
    if (
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      !isDeeplyFrozenDataV1(descriptor.value, seen)
    ) {
      return false;
    }
  }
  return true;
}

function reuseFrozenDataV1<TValue>(source: unknown, parsed: TValue): TValue {
  return isDeeplyFrozenDataV1(source) && canonicalValuesEqualV1(source, parsed)
    ? (source as TValue)
    : parsed;
}

export function parsePocTavernStateV1(value: unknown): TavernStateV1 {
  const state = exactDataObjectV1(
    value,
    [
      "reputation",
      "unlockedRecipeIds",
      "helper",
      "preparation",
      "servicePlan",
      "demandSeeds",
      "currentDemand",
      "serviceHistory",
    ],
    "Tavern State",
  );
  const unlockedRecipeIdsValue = dataPropertyV1(state, "unlockedRecipeIds", "Tavern State");
  const helperValue = dataPropertyV1(state, "helper", "Tavern State");
  const preparationValue = dataPropertyV1(state, "preparation", "Tavern State");
  const servicePlan = dataPropertyV1(state, "servicePlan", "Tavern State");
  const demandSeedsValue = dataPropertyV1(state, "demandSeeds", "Tavern State");
  const currentDemand = dataPropertyV1(state, "currentDemand", "Tavern State");
  const serviceHistoryValue = dataPropertyV1(state, "serviceHistory", "Tavern State");
  const parsedUnlockedRecipeIds = exactDataArrayV1(
    unlockedRecipeIdsValue,
    "Tavern unlocked RecipeIds",
  ).map(parseRecipeId);
  const parsedHelper = parsePocTavernHelperStateV1(helperValue);
  const parsedPreparation = parseDailyPreparationStateV1(preparationValue);
  const parsedServicePlan = servicePlan === null ? null : parsePocTavernPlanV1(servicePlan);
  const parsedDemandSeeds = exactDataArrayV1(demandSeedsValue, "Tavern demand seed days").map(
    parsePocTavernDemandDayV1,
  );
  const parsedCurrentDemand =
    currentDemand === null ? null : parsePocTavernMaterializedDemandDayV1(currentDemand);
  const parsedServiceHistory = exactDataArrayV1(serviceHistoryValue, "Tavern service history").map(
    parsePocTavernServiceHistoryEntryV1,
  );
  const parsed = deepFreezePocValueV1({
    reputation: parseNonNegativeSafeInteger(dataPropertyV1(state, "reputation", "Tavern State")),
    unlockedRecipeIds: reuseFrozenDataV1(unlockedRecipeIdsValue, parsedUnlockedRecipeIds),
    helper: reuseFrozenDataV1(helperValue, parsedHelper),
    preparation: reuseFrozenDataV1(preparationValue, parsedPreparation),
    servicePlan: reuseFrozenDataV1(servicePlan, parsedServicePlan),
    demandSeeds: reuseFrozenDataV1(demandSeedsValue, parsedDemandSeeds),
    currentDemand: reuseFrozenDataV1(currentDemand, parsedCurrentDemand),
    serviceHistory: reuseFrozenDataV1(serviceHistoryValue, parsedServiceHistory),
  });
  return parsed;
}

export const pocTavernStateSchemaV1: RuntimeSchemaV1<TavernStateV1> = Object.freeze({
  parse: parsePocTavernStateV1,
});

export type PocTavernOwnerOperationV1 =
  | {
      readonly kind: "tavern.reputation.adjust";
      readonly delta: SafeInteger;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "tavern.helper.set";
      readonly helper: HelperStateV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "tavern.plan.set";
      readonly plan: TavernPlanV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "tavern.demand_seeds.set";
      readonly demandSeeds: readonly DemandDayStateV1[];
    }
  | {
      readonly kind: "tavern.current_demand.set";
      readonly currentDemand: MaterializedDemandDayV1 | null;
    }
  | { readonly kind: "tavern.preparation.increment"; readonly day: DayIndex }
  | { readonly kind: "tavern.preparation.reset"; readonly day: DayIndex }
  | {
      readonly kind: "tavern.service_history.append";
      readonly history: ServiceHistoryEntryV1;
    };

function parseTavernOperationKindV1(value: unknown): PocTavernOwnerOperationV1["kind"] {
  if (
    value !== "tavern.reputation.adjust" &&
    value !== "tavern.helper.set" &&
    value !== "tavern.plan.set" &&
    value !== "tavern.demand_seeds.set" &&
    value !== "tavern.current_demand.set" &&
    value !== "tavern.preparation.increment" &&
    value !== "tavern.preparation.reset" &&
    value !== "tavern.service_history.append"
  ) {
    throw new TypeError("invalid Tavern owner operation kind");
  }
  return value;
}

export const pocTavernOwnerOperationSchemaV1: RuntimeSchemaV1<PocTavernOwnerOperationV1> =
  Object.freeze({
    parse(value: unknown): PocTavernOwnerOperationV1 {
      const candidate = exactDataObjectForKindV1(value, "Tavern owner operation");
      const kind = parseTavernOperationKindV1(
        dataPropertyV1(candidate, "kind", "Tavern owner operation"),
      );
      if (kind === "tavern.reputation.adjust") {
        const operation = exactDataObjectV1(
          value,
          ["kind", "delta", "reason"],
          "Tavern owner operation",
        );
        return deepFreezePocValueV1({
          kind,
          delta: parseSafeInteger(dataPropertyV1(operation, "delta", "Tavern owner operation")),
          reason: parsePocTavernChangeReasonV1(
            dataPropertyV1(operation, "reason", "Tavern owner operation"),
          ),
        });
      }
      if (kind === "tavern.helper.set") {
        const operation = exactDataObjectV1(
          value,
          ["kind", "helper", "reason"],
          "Tavern owner operation",
        );
        return deepFreezePocValueV1({
          kind,
          helper: parsePocTavernHelperStateV1(
            dataPropertyV1(operation, "helper", "Tavern owner operation"),
          ),
          reason: parsePocTavernChangeReasonV1(
            dataPropertyV1(operation, "reason", "Tavern owner operation"),
          ),
        });
      }
      if (kind === "tavern.plan.set") {
        const operation = exactDataObjectV1(
          value,
          ["kind", "plan", "reason"],
          "Tavern owner operation",
        );
        return deepFreezePocValueV1({
          kind,
          plan: parsePocTavernPlanV1(dataPropertyV1(operation, "plan", "Tavern owner operation")),
          reason: parsePocTavernChangeReasonV1(
            dataPropertyV1(operation, "reason", "Tavern owner operation"),
          ),
        });
      }
      if (kind === "tavern.demand_seeds.set") {
        const operation = exactDataObjectV1(
          value,
          ["kind", "demandSeeds"],
          "Tavern owner operation",
        );
        return deepFreezePocValueV1({
          kind,
          demandSeeds: exactDataArrayV1(
            dataPropertyV1(operation, "demandSeeds", "Tavern owner operation"),
            "Tavern owner demand seed days",
          ).map(parsePocTavernDemandDayV1),
        });
      }
      if (kind === "tavern.current_demand.set") {
        const operation = exactDataObjectV1(
          value,
          ["kind", "currentDemand"],
          "Tavern owner operation",
        );
        const currentDemand = dataPropertyV1(operation, "currentDemand", "Tavern owner operation");
        return deepFreezePocValueV1({
          kind,
          currentDemand:
            currentDemand === null ? null : parsePocTavernMaterializedDemandDayV1(currentDemand),
        });
      }
      if (kind === "tavern.preparation.increment" || kind === "tavern.preparation.reset") {
        const operation = exactDataObjectV1(value, ["kind", "day"], "Tavern owner operation");
        return deepFreezePocValueV1({
          kind,
          day: parseDayIndex(dataPropertyV1(operation, "day", "Tavern owner operation")),
        });
      }
      const operation = exactDataObjectV1(value, ["kind", "history"], "Tavern owner operation");
      return deepFreezePocValueV1({
        kind,
        history: parsePocTavernServiceHistoryEntryV1(
          dataPropertyV1(operation, "history", "Tavern owner operation"),
        ),
      });
    },
  });

export interface PocTavernPlanRecipePortV1 {
  readonly recipeId: RecipeId;
  readonly prepPoints: PositiveSafeInteger;
}

export interface PocTavernPlanDependenciesV1 {
  readonly kind: "tavern.plan.set";
  readonly day: DayIndex;
  readonly phase: CalendarPhase;
  readonly mode: ServiceMode;
  readonly modeReasonId: ReasonId;
  readonly unavailableReasonId: ReasonId | null;
  readonly menuRecipeLimit: PositiveSafeInteger;
  readonly receptionCapacity: NonNegativeSafeInteger;
  readonly preparationCapacity: NonNegativeSafeInteger;
  readonly recipes: readonly PocTavernPlanRecipePortV1[];
}

export interface PocTavernPreparationDependenciesV1 {
  readonly kind: "tavern.preparation.increment";
  readonly dailyPreparationLimit: PositiveSafeInteger;
  readonly prepareFoodReasonId: ReasonId;
}

type PocTavernKindOnlyDependencyPortsV1 = {
  readonly kind: Exclude<
    PocTavernOwnerOperationV1["kind"],
    "tavern.plan.set" | "tavern.preparation.increment"
  >;
};

export type PocTavernDependencyPortsV1 =
  | PocTavernPlanDependenciesV1
  | PocTavernPreparationDependenciesV1
  | PocTavernKindOnlyDependencyPortsV1;

function parsePlanRecipePortV1(value: unknown): PocTavernPlanRecipePortV1 {
  const recipe = exactDataObjectV1(value, ["recipeId", "prepPoints"], "Tavern plan Recipe port");
  return deepFreezePocValueV1({
    recipeId: parseRecipeId(dataPropertyV1(recipe, "recipeId", "Tavern plan Recipe port")),
    prepPoints: parsePositiveSafeInteger(
      dataPropertyV1(recipe, "prepPoints", "Tavern plan Recipe port"),
    ),
  });
}

export const pocTavernDependencyPortsSchemaV1: RuntimeSchemaV1<PocTavernDependencyPortsV1> =
  Object.freeze({
    parse(value: unknown): PocTavernDependencyPortsV1 {
      const candidate = exactDataObjectForKindV1(value, "Tavern dependency ports");
      const kind = parseTavernOperationKindV1(
        dataPropertyV1(candidate, "kind", "Tavern dependency ports"),
      );
      if (kind === "tavern.plan.set") {
        const dependencies = exactDataObjectV1(
          value,
          [
            "kind",
            "day",
            "phase",
            "mode",
            "modeReasonId",
            "unavailableReasonId",
            "menuRecipeLimit",
            "receptionCapacity",
            "preparationCapacity",
            "recipes",
          ],
          "Tavern dependency ports",
        );
        const unavailableReasonId = dataPropertyV1(
          dependencies,
          "unavailableReasonId",
          "Tavern dependency ports",
        );
        const recipes = exactDataArrayV1(
          dataPropertyV1(dependencies, "recipes", "Tavern dependency ports"),
          "Tavern plan Recipe ports",
        ).map(parsePlanRecipePortV1);
        const seenRecipeIds = new Set<RecipeId>();
        for (const recipe of recipes) {
          if (seenRecipeIds.has(recipe.recipeId)) {
            throw new TypeError("duplicate Tavern plan Recipe port");
          }
          seenRecipeIds.add(recipe.recipeId);
        }
        return deepFreezePocValueV1({
          kind,
          day: parseDayIndex(dataPropertyV1(dependencies, "day", "Tavern dependency ports")),
          phase: parseCalendarPhase(
            dataPropertyV1(dependencies, "phase", "Tavern dependency ports"),
          ),
          mode: parseServiceMode(dataPropertyV1(dependencies, "mode", "Tavern dependency ports")),
          modeReasonId: parseReasonId(
            dataPropertyV1(dependencies, "modeReasonId", "Tavern dependency ports"),
          ),
          unavailableReasonId:
            unavailableReasonId === null ? null : parseReasonId(unavailableReasonId),
          menuRecipeLimit: parsePositiveSafeInteger(
            dataPropertyV1(dependencies, "menuRecipeLimit", "Tavern dependency ports"),
          ),
          receptionCapacity: parseNonNegativeSafeInteger(
            dataPropertyV1(dependencies, "receptionCapacity", "Tavern dependency ports"),
          ),
          preparationCapacity: parseNonNegativeSafeInteger(
            dataPropertyV1(dependencies, "preparationCapacity", "Tavern dependency ports"),
          ),
          recipes,
        });
      }
      if (kind === "tavern.preparation.increment") {
        const dependencies = exactDataObjectV1(
          value,
          ["kind", "dailyPreparationLimit", "prepareFoodReasonId"],
          "Tavern dependency ports",
        );
        return deepFreezePocValueV1({
          kind,
          dailyPreparationLimit: parsePositiveSafeInteger(
            dataPropertyV1(dependencies, "dailyPreparationLimit", "Tavern dependency ports"),
          ),
          prepareFoodReasonId: parseReasonId(
            dataPropertyV1(dependencies, "prepareFoodReasonId", "Tavern dependency ports"),
          ),
        });
      }
      exactDataObjectV1(value, ["kind"], "Tavern dependency ports");
      return deepFreezePocValueV1({ kind });
    },
  });

function canonicalValuesEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.length === rightBytes.length &&
    leftBytes.every((byte, index) => byte === rightBytes[index])
  );
}

export function pocTavernStatesEqualV1(left: TavernStateV1, right: TavernStateV1): boolean {
  return canonicalValuesEqualV1(left, right);
}

function hasStrictlyIncreasingStringsV1(values: readonly string[]): boolean {
  return values.every((value, index) => index === 0 || (values[index - 1] ?? "") < value);
}

function hasUniqueValuesV1(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function planIsStructurallyValidV1(plan: TavernPlanV1): boolean {
  if (plan.menu.length > 16) return false;
  if (plan.mode === "closed") return plan.menu.length === 0;
  return plan.menu.length > 0 && hasUniqueValuesV1(plan.menu.map(({ recipeId }) => recipeId));
}

function demandSeedDayIsValidV1(day: DemandDayStateV1): boolean {
  return hasStrictlyIncreasingStringsV1(day.segments.map(({ segmentId }) => segmentId));
}

function materializedDemandDayIsValidV1(day: MaterializedDemandDayV1): boolean {
  return (
    hasStrictlyIncreasingStringsV1(day.segments.map(({ segmentId }) => segmentId)) &&
    day.segments.every(
      ({ preview, actualCustomers }) =>
        preview.min >= 0 &&
        preview.min <= preview.max &&
        actualCustomers >= preview.min &&
        actualCustomers <= preview.max,
    )
  );
}

function serviceHistoryDayV1(entry: ServiceHistoryEntryV1): DayIndex {
  return entry.kind === "opening" ? entry.opening.day : entry.closure.day;
}

function openingLedgerIsStructurallyValidV1(ledger: OpeningLedgerV1): boolean {
  if (
    ledger.menu.length === 0 ||
    ledger.menu.length > 16 ||
    !hasUniqueValuesV1(ledger.menu.map(({ recipeId }) => recipeId)) ||
    !hasUniqueValuesV1(ledger.entryIds) ||
    !hasUniqueValuesV1(ledger.triggeredEventIds) ||
    !hasUniqueValuesV1(ledger.discardedPortions.map(({ recipeId }) => recipeId))
  ) {
    return false;
  }
  return ledger.orders.every(
    ({ potentialCustomers, effectiveOrders, capacityAccepted, actualSales }) =>
      effectiveOrders <= potentialCustomers &&
      capacityAccepted <= effectiveOrders &&
      actualSales <= capacityAccepted,
  );
}

interface PocTavernInvariantViolationV1 {
  readonly code: "tavern.invalid";
  readonly details: { readonly reason: string };
}

function tavernInvariantViolationsV1(
  state: TavernStateV1,
): readonly PocTavernInvariantViolationV1[] {
  const violations: PocTavernInvariantViolationV1[] = [];
  const report = (reason: string): void => {
    violations.push({ code: "tavern.invalid", details: { reason } });
  };

  if (!hasStrictlyIncreasingStringsV1(state.unlockedRecipeIds)) {
    report("unlocked_recipes_not_stable");
  }
  if (state.servicePlan !== null && !planIsStructurallyValidV1(state.servicePlan)) {
    report("service_plan_invalid");
  }
  if (
    !state.demandSeeds.every(demandSeedDayIsValidV1) ||
    state.demandSeeds.some(
      ({ day }, index) => index > 0 && day <= (state.demandSeeds[index - 1]?.day ?? 0),
    )
  ) {
    report("demand_seeds_not_stable");
  }
  if (state.currentDemand !== null) {
    if (!materializedDemandDayIsValidV1(state.currentDemand)) {
      report("current_demand_invalid");
    }
    if (state.currentDemand.day > state.preparation.day) {
      report("current_demand_from_future_day");
    }
    const seedDay = state.demandSeeds.find(({ day }) => day === state.currentDemand?.day);
    if (
      seedDay === undefined ||
      !canonicalValuesEqualV1(
        seedDay.segments.map(({ segmentId }) => segmentId),
        state.currentDemand.segments.map(({ segmentId }) => segmentId),
      )
    ) {
      report("current_demand_seed_mismatch");
    }
  }
  if (
    state.serviceHistory.some((entry, index) => {
      if (entry.kind === "opening" && !openingLedgerIsStructurallyValidV1(entry.opening)) {
        return true;
      }
      if (
        entry.kind === "closure" &&
        ((entry.closure.kind === "planned" &&
          entry.closure.reputation.before !== entry.closure.reputation.after) ||
          entry.closure.reputation.after > entry.closure.reputation.before)
      ) {
        return true;
      }
      return (
        serviceHistoryDayV1(entry) > state.preparation.day ||
        (index > 0 &&
          serviceHistoryDayV1(entry) <=
            serviceHistoryDayV1(state.serviceHistory[index - 1] as ServiceHistoryEntryV1))
      );
    })
  ) {
    report("service_history_invalid");
  }
  return deepFreezePocValueV1(violations);
}

export const pocTavernInvariantV1 = Object.freeze({
  check(
    stateValue: DeepReadonly<TavernStateV1>,
    _readPort: PocTavernReadPortV1,
  ): readonly PocTavernInvariantViolationV1[] {
    return tavernInvariantViolationsV1(pocTavernStateSchemaV1.parse(stateValue));
  },
});

export function assertValidPocTavernStateV1(state: TavernStateV1, label: string): void {
  if (tavernInvariantViolationsV1(state).length !== 0) {
    throw new TypeError(`${label} violates Tavern invariants`);
  }
}

export function assertValidInitialPocTavernStateV1(state: TavernStateV1): void {
  assertValidPocTavernStateV1(state, "initial Tavern State");
  if (
    state.preparation.day !== 1 ||
    state.preparation.actionCount !== 0 ||
    state.servicePlan !== null ||
    state.demandSeeds.length !== 0 ||
    state.currentDemand !== null ||
    state.serviceHistory.length !== 0
  ) {
    throw new TypeError("initial Tavern State must have reset transient and history fields");
  }
}

export function sortPocTavernRecipeIdsV1(recipeIds: readonly RecipeId[]): readonly RecipeId[] {
  return deepFreezePocValueV1(
    [...recipeIds].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)),
  );
}

export type PocTavernReadPortV1 = TavernStateV1;

export type PocTavernGameplayFactV1 = Extract<
  PocGameplayFactV1,
  {
    readonly kind:
      | "demand.materialized"
      | "food.prepared"
      | "reputation.changed"
      | "tavern.helper_changed"
      | "tavern.plan_set"
      | "tavern.planned_closed"
      | "tavern.emergency_closed"
      | "opening.finalized";
  }
>;

export interface PocTavernOwnerProposalPayloadV1 {
  readonly kind: PocTavernOwnerOperationV1["kind"];
  readonly before: TavernStateV1;
  readonly after: TavernStateV1;
}

export type PocTavernOwnerProposalV1 = ModuleOwnerProposalEnvelopeV1<
  PocTavernOwnerProposalPayloadV1,
  PocTavernGameplayFactV1
>;

function parseReputationFactV1(
  value: unknown,
): Extract<PocTavernGameplayFactV1, { readonly kind: "reputation.changed" }> {
  const fact = exactDataObjectV1(
    value,
    ["kind", "value", "delta", "reason"],
    "Tavern reputation Fact",
  );
  if (dataPropertyV1(fact, "kind", "Tavern reputation Fact") !== "reputation.changed") {
    throw new TypeError("invalid Tavern reputation Fact kind");
  }
  return deepFreezePocValueV1({
    kind: "reputation.changed",
    value: parseNonNegativeBeforeAfterV1(
      dataPropertyV1(fact, "value", "Tavern reputation Fact"),
      "Tavern reputation Fact value",
    ),
    delta: parseSafeInteger(dataPropertyV1(fact, "delta", "Tavern reputation Fact")),
    reason: parsePocTavernChangeReasonV1(dataPropertyV1(fact, "reason", "Tavern reputation Fact")),
  });
}

function parseHelperFactV1(
  value: unknown,
): Extract<PocTavernGameplayFactV1, { readonly kind: "tavern.helper_changed" }> {
  const fact = exactDataObjectV1(value, ["kind", "value", "reason"], "Tavern helper Fact");
  if (dataPropertyV1(fact, "kind", "Tavern helper Fact") !== "tavern.helper_changed") {
    throw new TypeError("invalid Tavern helper Fact kind");
  }
  const pair = exactDataObjectV1(
    dataPropertyV1(fact, "value", "Tavern helper Fact"),
    ["before", "after"],
    "Tavern helper Fact value",
  );
  return deepFreezePocValueV1({
    kind: "tavern.helper_changed",
    value: {
      before: parsePocTavernHelperStateV1(
        dataPropertyV1(pair, "before", "Tavern helper Fact value"),
      ),
      after: parsePocTavernHelperStateV1(dataPropertyV1(pair, "after", "Tavern helper Fact value")),
    },
    reason: parsePocTavernChangeReasonV1(dataPropertyV1(fact, "reason", "Tavern helper Fact")),
  });
}

function parsePlanFactV1(
  value: unknown,
): Extract<PocTavernGameplayFactV1, { readonly kind: "tavern.plan_set" }> {
  const fact = exactDataObjectV1(value, ["kind", "plan", "reason"], "Tavern plan Fact");
  if (dataPropertyV1(fact, "kind", "Tavern plan Fact") !== "tavern.plan_set") {
    throw new TypeError("invalid Tavern plan Fact kind");
  }
  return deepFreezePocValueV1({
    kind: "tavern.plan_set",
    plan: parsePocTavernPlanV1(dataPropertyV1(fact, "plan", "Tavern plan Fact")),
    reason: parsePocTavernChangeReasonV1(dataPropertyV1(fact, "reason", "Tavern plan Fact")),
  });
}

function parseDemandFactV1(
  value: unknown,
): Extract<PocTavernGameplayFactV1, { readonly kind: "demand.materialized" }> {
  const fact = exactDataObjectV1(value, ["kind", "demand"], "Tavern demand Fact");
  if (dataPropertyV1(fact, "kind", "Tavern demand Fact") !== "demand.materialized") {
    throw new TypeError("invalid Tavern demand Fact kind");
  }
  return deepFreezePocValueV1({
    kind: "demand.materialized",
    demand: parsePocTavernMaterializedDemandDayV1(
      dataPropertyV1(fact, "demand", "Tavern demand Fact"),
    ),
  });
}

function parseFoodPreparedFactV1(
  value: unknown,
): Extract<PocTavernGameplayFactV1, { readonly kind: "food.prepared" }> {
  const fact = exactDataObjectV1(
    value,
    ["kind", "day", "actionCount", "reason"],
    "Tavern food-prepared Fact",
  );
  if (dataPropertyV1(fact, "kind", "Tavern food-prepared Fact") !== "food.prepared") {
    throw new TypeError("invalid Tavern food-prepared Fact kind");
  }
  return deepFreezePocValueV1({
    kind: "food.prepared",
    day: parseDayIndex(dataPropertyV1(fact, "day", "Tavern food-prepared Fact")),
    actionCount: parseNonNegativeSafeInteger(
      dataPropertyV1(fact, "actionCount", "Tavern food-prepared Fact"),
    ),
    reason: parsePocTavernChangeReasonV1(
      dataPropertyV1(fact, "reason", "Tavern food-prepared Fact"),
    ),
  });
}

function parseClosureFactV1(
  value: unknown,
): Extract<
  PocTavernGameplayFactV1,
  { readonly kind: "tavern.planned_closed" | "tavern.emergency_closed" }
> {
  const fact = exactDataObjectV1(value, ["kind", "closure"], "Tavern closure Fact");
  const kind = dataPropertyV1(fact, "kind", "Tavern closure Fact");
  if (kind !== "tavern.planned_closed" && kind !== "tavern.emergency_closed") {
    throw new TypeError("invalid Tavern closure Fact kind");
  }
  return deepFreezePocValueV1({
    kind,
    closure: parsePocTavernClosureHistoryV1(dataPropertyV1(fact, "closure", "Tavern closure Fact")),
  });
}

function parseOpeningFinalizedFactV1(
  value: unknown,
): Extract<PocTavernGameplayFactV1, { readonly kind: "opening.finalized" }> {
  const fact = exactDataObjectV1(value, ["kind", "ledger"], "Tavern finalized Fact");
  if (dataPropertyV1(fact, "kind", "Tavern finalized Fact") !== "opening.finalized") {
    throw new TypeError("invalid Tavern finalized Fact kind");
  }
  return deepFreezePocValueV1({
    kind: "opening.finalized",
    ledger: parsePocTavernOpeningLedgerV1(dataPropertyV1(fact, "ledger", "Tavern finalized Fact")),
  });
}

function parseTavernFactV1(value: unknown): PocTavernGameplayFactV1 {
  const candidate = exactDataObjectForKindV1(value, "Tavern GameplayFact");
  const kind = dataPropertyV1(candidate, "kind", "Tavern GameplayFact");
  if (kind === "reputation.changed") return parseReputationFactV1(value);
  if (kind === "tavern.helper_changed") return parseHelperFactV1(value);
  if (kind === "tavern.plan_set") return parsePlanFactV1(value);
  if (kind === "demand.materialized") return parseDemandFactV1(value);
  if (kind === "food.prepared") return parseFoodPreparedFactV1(value);
  if (kind === "tavern.planned_closed" || kind === "tavern.emergency_closed") {
    return parseClosureFactV1(value);
  }
  if (kind === "opening.finalized") return parseOpeningFinalizedFactV1(value);
  throw new TypeError("invalid Tavern GameplayFact kind");
}

const tavernStateKeysV1 = Object.freeze([
  "reputation",
  "unlockedRecipeIds",
  "helper",
  "preparation",
  "servicePlan",
  "demandSeeds",
  "currentDemand",
  "serviceHistory",
] as const satisfies readonly (keyof TavernStateV1)[]);

function assertUnchangedTavernFieldsV1(
  before: TavernStateV1,
  after: TavernStateV1,
  ...changed: readonly (keyof TavernStateV1)[]
): void {
  const changedFields = new Set(changed);
  for (const key of tavernStateKeysV1) {
    if (!changedFields.has(key) && !canonicalValuesEqualV1(before[key], after[key])) {
      throw new TypeError(`Tavern proposal changes unrelated field ${key}`);
    }
  }
}

function assertExactFactKindsV1(
  facts: readonly PocTavernGameplayFactV1[],
  expected: readonly PocTavernGameplayFactV1["kind"][],
): void {
  if (
    !canonicalValuesEqualV1(
      facts.map(({ kind }) => kind),
      expected,
    )
  ) {
    throw new TypeError("Tavern proposal has invalid Fact order");
  }
}

function assertTavernProposalConsistencyV1(proposal: PocTavernOwnerProposalV1): void {
  const { before, after, kind } = proposal.payload;
  assertValidPocTavernStateV1(before, "Tavern proposal before State");
  assertValidPocTavernStateV1(after, "Tavern proposal after State");

  if (kind === "tavern.reputation.adjust") {
    assertExactFactKindsV1(proposal.facts, ["reputation.changed"]);
    assertUnchangedTavernFieldsV1(before, after, "reputation");
    const fact = proposal.facts[0];
    const delta = after.reputation - before.reputation;
    if (
      fact?.kind !== "reputation.changed" ||
      fact.value.before !== before.reputation ||
      fact.value.after !== after.reputation ||
      fact.delta !== delta
    ) {
      throw new TypeError("Tavern reputation proposal is inconsistent");
    }
    return;
  }
  if (kind === "tavern.helper.set") {
    assertExactFactKindsV1(proposal.facts, ["tavern.helper_changed"]);
    assertUnchangedTavernFieldsV1(before, after, "helper");
    const fact = proposal.facts[0];
    if (
      fact?.kind !== "tavern.helper_changed" ||
      !canonicalValuesEqualV1(fact.value.before, before.helper) ||
      !canonicalValuesEqualV1(fact.value.after, after.helper)
    ) {
      throw new TypeError("Tavern helper proposal is inconsistent");
    }
    return;
  }
  if (kind === "tavern.plan.set") {
    assertExactFactKindsV1(proposal.facts, ["tavern.plan_set"]);
    assertUnchangedTavernFieldsV1(before, after, "servicePlan");
    const fact = proposal.facts[0];
    if (
      after.servicePlan === null ||
      fact?.kind !== "tavern.plan_set" ||
      !canonicalValuesEqualV1(fact.plan, after.servicePlan) ||
      fact.reason.kind !== "command" ||
      fact.reason.commandKind !== "tavern.plan.set"
    ) {
      throw new TypeError("Tavern plan proposal is inconsistent");
    }
    return;
  }
  if (kind === "tavern.demand_seeds.set") {
    assertExactFactKindsV1(proposal.facts, []);
    assertUnchangedTavernFieldsV1(before, after, "demandSeeds");
    if (before.demandSeeds.length !== 0 || after.demandSeeds.length === 0) {
      throw new TypeError("Tavern demand seeds require one non-empty initialization");
    }
    return;
  }
  if (kind === "tavern.current_demand.set") {
    assertUnchangedTavernFieldsV1(before, after, "currentDemand");
    if (after.currentDemand === null) {
      assertExactFactKindsV1(proposal.facts, []);
      if (before.currentDemand === null || before.currentDemand.day >= before.preparation.day) {
        throw new TypeError(
          "Tavern current demand clear requires demand from an earlier materialized day",
        );
      }
      return;
    }
    assertExactFactKindsV1(proposal.facts, ["demand.materialized"]);
    const fact = proposal.facts[0];
    if (
      fact?.kind !== "demand.materialized" ||
      !canonicalValuesEqualV1(fact.demand, after.currentDemand) ||
      after.currentDemand.day !== after.preparation.day ||
      (before.currentDemand !== null && after.currentDemand.day <= before.currentDemand.day)
    ) {
      throw new TypeError("Tavern demand proposal is inconsistent");
    }
    return;
  }
  if (kind === "tavern.preparation.increment") {
    assertExactFactKindsV1(proposal.facts, ["food.prepared"]);
    assertUnchangedTavernFieldsV1(before, after, "preparation");
    const fact = proposal.facts[0];
    if (
      fact?.kind !== "food.prepared" ||
      after.preparation.day !== before.preparation.day ||
      before.preparation.actionCount === Number.MAX_SAFE_INTEGER ||
      after.preparation.actionCount !== before.preparation.actionCount + 1 ||
      fact.day !== after.preparation.day ||
      fact.actionCount !== after.preparation.actionCount ||
      fact.reason.kind !== "command" ||
      fact.reason.commandKind !== "actor.prepare_food"
    ) {
      throw new TypeError("Tavern preparation proposal is inconsistent");
    }
    return;
  }
  if (kind === "tavern.preparation.reset") {
    assertExactFactKindsV1(proposal.facts, []);
    assertUnchangedTavernFieldsV1(before, after, "preparation", "servicePlan");
    if (
      before.preparation.day === Number.MAX_SAFE_INTEGER ||
      after.preparation.day !== before.preparation.day + 1 ||
      after.preparation.actionCount !== 0 ||
      after.servicePlan !== null
    ) {
      throw new TypeError("Tavern preparation reset proposal is inconsistent");
    }
    return;
  }

  assertUnchangedTavernFieldsV1(before, after, "serviceHistory", "servicePlan");
  if (
    after.serviceHistory.length !== before.serviceHistory.length + 1 ||
    !canonicalValuesEqualV1(
      after.serviceHistory.slice(0, before.serviceHistory.length),
      before.serviceHistory,
    )
  ) {
    throw new TypeError("Tavern service history proposal is not append-only");
  }
  const appended = after.serviceHistory.at(-1);
  const appendedDay = appended?.kind === "opening" ? appended.opening.day : appended?.closure.day;
  const appendedReputationAfter =
    appended?.kind === "opening"
      ? appended.opening.reputation.after
      : appended?.closure.reputation.after;
  if (appendedDay !== after.preparation.day || appendedReputationAfter !== after.reputation) {
    throw new TypeError("Tavern service history must match current day and reputation");
  }
  if (appended?.kind === "opening") {
    assertExactFactKindsV1(proposal.facts, ["opening.finalized"]);
    const fact = proposal.facts[0];
    if (
      fact?.kind !== "opening.finalized" ||
      !canonicalValuesEqualV1(fact.ledger, appended.opening) ||
      !canonicalValuesEqualV1(before.servicePlan, after.servicePlan) ||
      after.servicePlan === null ||
      after.servicePlan.mode === "closed" ||
      after.servicePlan.mode !== appended.opening.mode ||
      !canonicalValuesEqualV1(after.servicePlan.menu, appended.opening.menu)
    ) {
      throw new TypeError("Tavern Opening history proposal is inconsistent");
    }
    return;
  }
  if (appended?.kind === "closure") {
    const expectedKind =
      appended.closure.kind === "planned" ? "tavern.planned_closed" : "tavern.emergency_closed";
    assertExactFactKindsV1(proposal.facts, [expectedKind]);
    const fact = proposal.facts[0];
    if (
      (fact?.kind !== "tavern.planned_closed" && fact?.kind !== "tavern.emergency_closed") ||
      fact.kind !== expectedKind ||
      !canonicalValuesEqualV1(fact.closure, appended.closure) ||
      after.servicePlan?.mode !== "closed" ||
      (appended.closure.kind === "planned" && before.servicePlan?.mode !== "closed") ||
      (appended.closure.kind === "emergency" && before.servicePlan?.mode === "closed")
    ) {
      throw new TypeError("Tavern closure history proposal is inconsistent");
    }
    return;
  }
  throw new TypeError("Tavern service history proposal has no appended entry");
}

export const pocTavernOwnerProposalSchemaV1: RuntimeSchemaV1<PocTavernOwnerProposalV1> =
  Object.freeze({
    parse(value: unknown): PocTavernOwnerProposalV1 {
      const proposal = exactDataObjectV1(value, ["payload", "facts"], "Tavern owner proposal");
      const payload = exactDataObjectV1(
        dataPropertyV1(proposal, "payload", "Tavern owner proposal"),
        ["kind", "before", "after"],
        "Tavern owner proposal payload",
      );
      const parsed = deepFreezePocValueV1({
        payload: {
          kind: parseTavernOperationKindV1(
            dataPropertyV1(payload, "kind", "Tavern owner proposal payload"),
          ),
          before: parsePocTavernStateV1(
            dataPropertyV1(payload, "before", "Tavern owner proposal payload"),
          ),
          after: parsePocTavernStateV1(
            dataPropertyV1(payload, "after", "Tavern owner proposal payload"),
          ),
        },
        facts: exactDataArrayV1(
          dataPropertyV1(proposal, "facts", "Tavern owner proposal"),
          "Tavern owner proposal Facts",
        ).map(parseTavernFactV1),
      }) satisfies PocTavernOwnerProposalV1;
      assertTavernProposalConsistencyV1(parsed);
      return parsed;
    },
  });
