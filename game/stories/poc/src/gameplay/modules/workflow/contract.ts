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
  parseAttributeRank,
  parseAuraId,
  parseBatchId,
  parseCalendarPhase,
  parseCheckBandId,
  parseCheckId,
  parseChoiceId,
  parseCustomerSegmentId,
  parseEventId,
  parseFacilityId,
  parseHelperTier,
  parseIngredientId,
  parseLedgerEntryId,
  parseModifierSourceId,
  parseOpeningSessionId,
  parseOpenServiceMode,
  parseReasonId,
  parseRecipeId,
  parseRelationshipStage,
  parseSceneId,
  parseServiceMode,
  parseWorldStepId,
} from "../../contracts/ids.js";
import type {
  ActionId,
  CalendarPhase,
  CheckBandId,
  ChoiceId,
  EventId,
  LedgerEntryId,
  WorldStepId,
} from "../../contracts/ids.js";
import type {
  ActiveWorkflowV1,
  AppliedModifierV1,
  AttributeRanksV1,
  BatchConsumptionV1,
  HelperStateV1,
  MaterializedDemandSegmentV1,
  ModifierSourceRefV1,
  ModifierV1,
  OpeningBaselineV1,
  OpeningBlockingEventV1,
  OpeningCheckpointV1,
  OpeningSessionV1,
  PlannedRecipeV1,
  PocGameplayFactV1,
  RelationshipStateV1,
  WorldActionChoiceV1,
  WorldActionProgressV1,
  WorldActionSessionV1,
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
import type { DayIndex, PositiveSafeInteger, SafeInteger } from "../../contracts/values.js";

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
  const result: unknown[] = [];
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
    result.push(descriptor.value);
  }
  return result;
}

function canonicalValuesEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.length === rightBytes.length &&
    leftBytes.every((byte, index) => byte === rightBytes[index])
  );
}

function isDeeplyFrozenDataV1(value: unknown, seen = new WeakSet<object>()): boolean {
  if (value === null || typeof value !== "object") return true;
  if (seen.has(value)) return false;
  if (!Object.isFrozen(value)) return false;
  seen.add(value);
  const prototype = Object.getPrototypeOf(value);
  if (Array.isArray(value)) {
    if (prototype !== Array.prototype) return false;
  } else if (prototype !== Object.prototype) {
    return false;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
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
  return Object.getOwnPropertySymbols(value).length === 0;
}

function reuseFrozenParsedValueV1<TValue>(value: unknown, parsed: TValue): TValue {
  return isDeeplyFrozenDataV1(value) && canonicalValuesEqualV1(value, parsed)
    ? (value as TValue)
    : parsed;
}

function parseOpeningCheckpointV1(value: unknown): OpeningCheckpointV1 {
  if (
    value !== "started" &&
    value !== "middle" &&
    value !== "before_finalize" &&
    value !== "ready_to_finalize"
  ) {
    throw new TypeError("invalid Opening checkpoint");
  }
  return value;
}

function parseWorldActionProgressV1(value: unknown): WorldActionProgressV1 {
  if (
    value !== "begin_scene" &&
    value !== "awaiting_completion_phase" &&
    value !== "completion_scene" &&
    value !== "ready_to_complete"
  ) {
    throw new TypeError("invalid WorldAction progress");
  }
  return value;
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

function parsePlannedRecipeV1(value: unknown): PlannedRecipeV1 {
  const recipe = exactDataObjectV1(value, ["recipeId", "portions"], "Workflow planned Recipe");
  return deepFreezePocValueV1({
    recipeId: parseRecipeId(dataPropertyV1(recipe, "recipeId", "Workflow planned Recipe")),
    portions: parseQuantity(dataPropertyV1(recipe, "portions", "Workflow planned Recipe")),
  });
}

function parseBatchConsumptionV1(value: unknown): BatchConsumptionV1 {
  const consumption = exactDataObjectV1(
    value,
    ["batchId", "ingredientId", "quantity"],
    "Workflow batch consumption",
  );
  return deepFreezePocValueV1({
    batchId: parseBatchId(dataPropertyV1(consumption, "batchId", "Workflow batch consumption")),
    ingredientId: parseIngredientId(
      dataPropertyV1(consumption, "ingredientId", "Workflow batch consumption"),
    ),
    quantity: parseQuantity(dataPropertyV1(consumption, "quantity", "Workflow batch consumption")),
  });
}

function parseAttributeRanksV1(value: unknown): AttributeRanksV1 {
  const attributes = exactDataObjectV1(
    value,
    ["body", "social", "intellect"],
    "Workflow actor attributes",
  );
  return deepFreezePocValueV1({
    body: parseAttributeRank(dataPropertyV1(attributes, "body", "Workflow actor attributes")),
    social: parseAttributeRank(dataPropertyV1(attributes, "social", "Workflow actor attributes")),
    intellect: parseAttributeRank(
      dataPropertyV1(attributes, "intellect", "Workflow actor attributes"),
    ),
  });
}

function parseRelationshipStateV1(value: unknown): RelationshipStateV1 {
  const relationship = exactDataObjectV1(
    value,
    ["affection", "teamwork", "stage"],
    "Workflow relationship State",
  );
  return deepFreezePocValueV1({
    affection: parseSafeInteger(
      dataPropertyV1(relationship, "affection", "Workflow relationship State"),
    ),
    teamwork: parseNonNegativeSafeInteger(
      dataPropertyV1(relationship, "teamwork", "Workflow relationship State"),
    ),
    stage: parseRelationshipStage(
      dataPropertyV1(relationship, "stage", "Workflow relationship State"),
    ),
  });
}

function parseHelperStateV1(value: unknown): HelperStateV1 {
  const helper = exactDataObjectV1(value, ["unlocked", "tier"], "Workflow helper State");
  const unlocked = dataPropertyV1(helper, "unlocked", "Workflow helper State");
  if (typeof unlocked !== "boolean") throw new TypeError("invalid Workflow helper unlocked flag");
  return deepFreezePocValueV1({
    unlocked,
    tier: parseHelperTier(dataPropertyV1(helper, "tier", "Workflow helper State")),
  });
}

function parseModifierSourceV1(value: unknown): ModifierSourceRefV1 {
  const candidate = exactDataObjectForKindV1(value, "Workflow Modifier source");
  const kind = dataPropertyV1(candidate, "kind", "Workflow Modifier source");
  if (kind === "facility") {
    const source = exactDataObjectV1(value, ["kind", "facilityId"], "Workflow Modifier source");
    return deepFreezePocValueV1({
      kind,
      facilityId: parseFacilityId(dataPropertyV1(source, "facilityId", "Workflow Modifier source")),
    });
  }
  if (kind === "aura") {
    const source = exactDataObjectV1(value, ["kind", "auraId"], "Workflow Modifier source");
    return deepFreezePocValueV1({
      kind,
      auraId: parseAuraId(dataPropertyV1(source, "auraId", "Workflow Modifier source")),
    });
  }
  if (kind === "event") {
    const source = exactDataObjectV1(value, ["kind", "eventId"], "Workflow Modifier source");
    return deepFreezePocValueV1({
      kind,
      eventId: parseEventId(dataPropertyV1(source, "eventId", "Workflow Modifier source")),
    });
  }
  if (kind === "story") {
    const source = exactDataObjectV1(value, ["kind", "sourceId"], "Workflow Modifier source");
    return deepFreezePocValueV1({
      kind,
      sourceId: parseModifierSourceId(
        dataPropertyV1(source, "sourceId", "Workflow Modifier source"),
      ),
    });
  }
  throw new TypeError("invalid Workflow Modifier source kind");
}

function parseServiceModesV1(value: unknown): readonly ReturnType<typeof parseServiceMode>[] {
  return deepFreezePocValueV1(
    exactDataArrayV1(value, "Workflow Modifier modes").map(parseServiceMode),
  );
}

export function parsePocWorkflowModifierV1(value: unknown): ModifierV1 {
  const candidate = exactDataObjectForKindV1(value, "Workflow Modifier");
  const kind = dataPropertyV1(candidate, "kind", "Workflow Modifier");
  if (kind === "teamwork_gain.block") {
    const modifier = exactDataObjectV1(value, ["kind", "source", "reasonId"], "Workflow Modifier");
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceV1(dataPropertyV1(modifier, "source", "Workflow Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Workflow Modifier")),
    });
  }
  if (kind === "recovery.add") {
    const modifier = exactDataObjectV1(
      value,
      ["kind", "source", "actorId", "amount", "reasonId"],
      "Workflow Modifier",
    );
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceV1(dataPropertyV1(modifier, "source", "Workflow Modifier")),
      actorId: parseActorId(dataPropertyV1(modifier, "actorId", "Workflow Modifier")),
      amount: parseSafeInteger(dataPropertyV1(modifier, "amount", "Workflow Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Workflow Modifier")),
    });
  }
  if (kind === "demand.add") {
    const modifier = exactDataObjectV1(
      value,
      ["kind", "source", "segmentId", "amount", "reasonId"],
      "Workflow Modifier",
    );
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceV1(dataPropertyV1(modifier, "source", "Workflow Modifier")),
      segmentId: parseCustomerSegmentId(dataPropertyV1(modifier, "segmentId", "Workflow Modifier")),
      amount: parseSafeInteger(dataPropertyV1(modifier, "amount", "Workflow Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Workflow Modifier")),
    });
  }
  if (kind === "check.add") {
    const modifier = exactDataObjectV1(
      value,
      ["kind", "source", "checkId", "amount", "reasonId"],
      "Workflow Modifier",
    );
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceV1(dataPropertyV1(modifier, "source", "Workflow Modifier")),
      checkId: parseCheckId(dataPropertyV1(modifier, "checkId", "Workflow Modifier")),
      amount: parseSafeInteger(dataPropertyV1(modifier, "amount", "Workflow Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Workflow Modifier")),
    });
  }
  if (kind === "shelf_life.add_days") {
    const modifier = exactDataObjectV1(
      value,
      ["kind", "source", "ingredientIds", "amount", "reasonId"],
      "Workflow Modifier",
    );
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceV1(dataPropertyV1(modifier, "source", "Workflow Modifier")),
      ingredientIds: exactDataArrayV1(
        dataPropertyV1(modifier, "ingredientIds", "Workflow Modifier"),
        "Workflow Modifier IngredientIds",
      ).map(parseIngredientId),
      amount: parsePositiveSafeInteger(dataPropertyV1(modifier, "amount", "Workflow Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Workflow Modifier")),
    });
  }
  if (kind === "capacity.add" || kind === "prep_points.add" || kind === "service_cost.add") {
    const modifier = exactDataObjectV1(
      value,
      ["kind", "source", "modes", "amount", "reasonId"],
      "Workflow Modifier",
    );
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceV1(dataPropertyV1(modifier, "source", "Workflow Modifier")),
      modes: parseServiceModesV1(dataPropertyV1(modifier, "modes", "Workflow Modifier")),
      amount: parseSafeInteger(dataPropertyV1(modifier, "amount", "Workflow Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Workflow Modifier")),
    });
  }
  throw new TypeError("invalid Workflow Modifier kind");
}

function parseAppliedModifierV1(value: unknown): AppliedModifierV1 {
  const applied = exactDataObjectV1(
    value,
    ["modifier", "contribution"],
    "Workflow applied Modifier",
  );
  return deepFreezePocValueV1({
    modifier: parsePocWorkflowModifierV1(
      dataPropertyV1(applied, "modifier", "Workflow applied Modifier"),
    ),
    contribution: parseSafeInteger(
      dataPropertyV1(applied, "contribution", "Workflow applied Modifier"),
    ),
  });
}

function parseMaterializedDemandSegmentV1(value: unknown): MaterializedDemandSegmentV1 {
  const segment = exactDataObjectV1(
    value,
    ["segmentId", "preview", "actualCustomers", "modifiers"],
    "Workflow demand segment",
  );
  const previewValue = exactDataObjectV1(
    dataPropertyV1(segment, "preview", "Workflow demand segment"),
    ["min", "max"],
    "Workflow demand preview",
  );
  const preview = deepFreezePocValueV1({
    min: parseSafeInteger(dataPropertyV1(previewValue, "min", "Workflow demand preview")),
    max: parseSafeInteger(dataPropertyV1(previewValue, "max", "Workflow demand preview")),
  });
  const actualCustomers = parseNonNegativeSafeInteger(
    dataPropertyV1(segment, "actualCustomers", "Workflow demand segment"),
  );
  if (
    preview.min < 0 ||
    preview.min > preview.max ||
    actualCustomers < preview.min ||
    actualCustomers > preview.max
  ) {
    throw new TypeError("invalid Workflow demand range");
  }
  return deepFreezePocValueV1({
    segmentId: parseCustomerSegmentId(
      dataPropertyV1(segment, "segmentId", "Workflow demand segment"),
    ),
    preview,
    actualCustomers,
    modifiers: exactDataArrayV1(
      dataPropertyV1(segment, "modifiers", "Workflow demand segment"),
      "Workflow demand Modifiers",
    ).map(parseAppliedModifierV1),
  });
}

function parseOpeningActorInputsV1(value: unknown): OpeningBaselineV1["actors"] {
  const actors = exactDataObjectV1(
    value,
    ["playerAttributes", "heroineMood", "relationship", "helper"],
    "Workflow Opening actor inputs",
  );
  return deepFreezePocValueV1({
    playerAttributes: parseAttributeRanksV1(
      dataPropertyV1(actors, "playerAttributes", "Workflow Opening actor inputs"),
    ),
    heroineMood: parseMoodPoint(
      dataPropertyV1(actors, "heroineMood", "Workflow Opening actor inputs"),
    ),
    relationship: parseRelationshipStateV1(
      dataPropertyV1(actors, "relationship", "Workflow Opening actor inputs"),
    ),
    helper: parseHelperStateV1(dataPropertyV1(actors, "helper", "Workflow Opening actor inputs")),
  });
}

export function parsePocOpeningBaselineV1(value: unknown): OpeningBaselineV1 {
  const baseline = exactDataObjectV1(
    value,
    [
      "startedAtSequence",
      "day",
      "mode",
      "preparationActionCount",
      "ap",
      "playerStamina",
      "heroineStamina",
      "cashAtStart",
      "reputationBeforeStart",
      "menu",
      "preparedPortions",
      "consumedIngredients",
      "demand",
      "actors",
      "facilityIds",
      "modifiers",
      "startEntryIds",
    ],
    "Workflow Opening baseline",
  );
  const parsed = deepFreezePocValueV1({
    startedAtSequence: parsePositiveSafeInteger(
      dataPropertyV1(baseline, "startedAtSequence", "Workflow Opening baseline"),
    ),
    day: parseDayIndex(dataPropertyV1(baseline, "day", "Workflow Opening baseline")),
    mode: parseOpenServiceMode(dataPropertyV1(baseline, "mode", "Workflow Opening baseline")),
    preparationActionCount: parseNonNegativeSafeInteger(
      dataPropertyV1(baseline, "preparationActionCount", "Workflow Opening baseline"),
    ),
    ap: parseNonNegativeBeforeAfterV1(
      dataPropertyV1(baseline, "ap", "Workflow Opening baseline"),
      "Workflow Opening AP",
    ),
    playerStamina: parseNonNegativeBeforeAfterV1(
      dataPropertyV1(baseline, "playerStamina", "Workflow Opening baseline"),
      "Workflow Opening player Stamina",
    ),
    heroineStamina: parseNonNegativeBeforeAfterV1(
      dataPropertyV1(baseline, "heroineStamina", "Workflow Opening baseline"),
      "Workflow Opening heroine Stamina",
    ),
    cashAtStart: parseMoneyBeforeAfterV1(
      dataPropertyV1(baseline, "cashAtStart", "Workflow Opening baseline"),
      "Workflow Opening cash",
    ),
    reputationBeforeStart: parseNonNegativeSafeInteger(
      dataPropertyV1(baseline, "reputationBeforeStart", "Workflow Opening baseline"),
    ),
    menu: exactDataArrayV1(
      dataPropertyV1(baseline, "menu", "Workflow Opening baseline"),
      "Workflow Opening menu",
    ).map(parsePlannedRecipeV1),
    preparedPortions: exactDataArrayV1(
      dataPropertyV1(baseline, "preparedPortions", "Workflow Opening baseline"),
      "Workflow Opening prepared portions",
    ).map(parsePlannedRecipeV1),
    consumedIngredients: exactDataArrayV1(
      dataPropertyV1(baseline, "consumedIngredients", "Workflow Opening baseline"),
      "Workflow Opening consumed ingredients",
    ).map(parseBatchConsumptionV1),
    demand: exactDataArrayV1(
      dataPropertyV1(baseline, "demand", "Workflow Opening baseline"),
      "Workflow Opening demand",
    ).map(parseMaterializedDemandSegmentV1),
    actors: parseOpeningActorInputsV1(
      dataPropertyV1(baseline, "actors", "Workflow Opening baseline"),
    ),
    facilityIds: exactDataArrayV1(
      dataPropertyV1(baseline, "facilityIds", "Workflow Opening baseline"),
      "Workflow Opening FacilityIds",
    ).map(parseFacilityId),
    modifiers: exactDataArrayV1(
      dataPropertyV1(baseline, "modifiers", "Workflow Opening baseline"),
      "Workflow Opening Modifiers",
    ).map(parsePocWorkflowModifierV1),
    startEntryIds: exactDataArrayV1(
      dataPropertyV1(baseline, "startEntryIds", "Workflow Opening baseline"),
      "Workflow Opening start LedgerEntryIds",
    ).map(parseLedgerEntryId),
  }) satisfies OpeningBaselineV1;
  return reuseFrozenParsedValueV1(value, parsed);
}

function parseOpeningBlockingEventV1(value: unknown): OpeningBlockingEventV1 {
  const blocking = exactDataObjectV1(
    value,
    ["eventId", "sceneId"],
    "Workflow Opening blocking event",
  );
  return deepFreezePocValueV1({
    eventId: parseEventId(dataPropertyV1(blocking, "eventId", "Workflow Opening blocking event")),
    sceneId: parseSceneId(dataPropertyV1(blocking, "sceneId", "Workflow Opening blocking event")),
  });
}

function parseOpeningSessionV1(value: unknown): OpeningSessionV1 {
  const session = exactDataObjectV1(
    value,
    [
      "kind",
      "sessionId",
      "checkpoint",
      "baseline",
      "triggeredEventIds",
      "sessionModifiers",
      "blockingEvent",
    ],
    "Workflow Opening Session",
  );
  if (dataPropertyV1(session, "kind", "Workflow Opening Session") !== "opening") {
    throw new TypeError("invalid Workflow Opening Session kind");
  }
  const blockingEvent = dataPropertyV1(session, "blockingEvent", "Workflow Opening Session");
  return deepFreezePocValueV1({
    kind: "opening",
    sessionId: parseOpeningSessionId(
      dataPropertyV1(session, "sessionId", "Workflow Opening Session"),
    ),
    checkpoint: parseOpeningCheckpointV1(
      dataPropertyV1(session, "checkpoint", "Workflow Opening Session"),
    ),
    baseline: parsePocOpeningBaselineV1(
      dataPropertyV1(session, "baseline", "Workflow Opening Session"),
    ),
    triggeredEventIds: exactDataArrayV1(
      dataPropertyV1(session, "triggeredEventIds", "Workflow Opening Session"),
      "Workflow Opening triggered EventIds",
    ).map(parseEventId),
    sessionModifiers: exactDataArrayV1(
      dataPropertyV1(session, "sessionModifiers", "Workflow Opening Session"),
      "Workflow Opening Session Modifiers",
    ).map(parsePocWorkflowModifierV1),
    blockingEvent: blockingEvent === null ? null : parseOpeningBlockingEventV1(blockingEvent),
  });
}

function parseWorldActionChoiceV1(value: unknown): WorldActionChoiceV1 {
  const choice = exactDataObjectV1(
    value,
    ["choiceId", "committedAtSequence"],
    "Workflow WorldAction choice",
  );
  return deepFreezePocValueV1({
    choiceId: parseChoiceId(dataPropertyV1(choice, "choiceId", "Workflow WorldAction choice")),
    committedAtSequence: parsePositiveSafeInteger(
      dataPropertyV1(choice, "committedAtSequence", "Workflow WorldAction choice"),
    ),
  });
}

function parseWorldActionSessionV1(value: unknown): WorldActionSessionV1 {
  const session = exactDataObjectV1(
    value,
    [
      "kind",
      "actionId",
      "optionId",
      "beginStepId",
      "completionStepId",
      "preparationBonus",
      "startedAtSequence",
      "startedDay",
      "startedPhase",
      "progress",
      "paidCostEntryIds",
      "choices",
    ],
    "Workflow WorldAction Session",
  );
  if (dataPropertyV1(session, "kind", "Workflow WorldAction Session") !== "world_action") {
    throw new TypeError("invalid Workflow WorldAction Session kind");
  }
  return deepFreezePocValueV1({
    kind: "world_action",
    actionId: parseActionId(dataPropertyV1(session, "actionId", "Workflow WorldAction Session")),
    optionId: parseChoiceId(dataPropertyV1(session, "optionId", "Workflow WorldAction Session")),
    beginStepId: parseWorldStepId(
      dataPropertyV1(session, "beginStepId", "Workflow WorldAction Session"),
    ),
    completionStepId: parseWorldStepId(
      dataPropertyV1(session, "completionStepId", "Workflow WorldAction Session"),
    ),
    preparationBonus: parseSafeInteger(
      dataPropertyV1(session, "preparationBonus", "Workflow WorldAction Session"),
    ),
    startedAtSequence: parsePositiveSafeInteger(
      dataPropertyV1(session, "startedAtSequence", "Workflow WorldAction Session"),
    ),
    startedDay: parseDayIndex(
      dataPropertyV1(session, "startedDay", "Workflow WorldAction Session"),
    ),
    startedPhase: parseCalendarPhase(
      dataPropertyV1(session, "startedPhase", "Workflow WorldAction Session"),
    ),
    progress: parseWorldActionProgressV1(
      dataPropertyV1(session, "progress", "Workflow WorldAction Session"),
    ),
    paidCostEntryIds: exactDataArrayV1(
      dataPropertyV1(session, "paidCostEntryIds", "Workflow WorldAction Session"),
      "Workflow WorldAction paid LedgerEntryIds",
    ).map(parseLedgerEntryId),
    choices: exactDataArrayV1(
      dataPropertyV1(session, "choices", "Workflow WorldAction Session"),
      "Workflow WorldAction choices",
    ).map(parseWorldActionChoiceV1),
  });
}

export function parsePocWorkflowStateV1(value: unknown): ActiveWorkflowV1 | null {
  if (value === null) return null;
  const candidate = exactDataObjectForKindV1(value, "Workflow State");
  const kind = dataPropertyV1(candidate, "kind", "Workflow State");
  const parsed =
    kind === "opening"
      ? parseOpeningSessionV1(value)
      : kind === "world_action"
        ? parseWorldActionSessionV1(value)
        : (() => {
            throw new TypeError("invalid Workflow State kind");
          })();
  return reuseFrozenParsedValueV1(value, parsed);
}

export const pocWorkflowStateSchemaV1: RuntimeSchemaV1<ActiveWorkflowV1 | null> = Object.freeze({
  parse: parsePocWorkflowStateV1,
});

export type PocWorkflowOwnerOperationV1 =
  | { readonly kind: "workflow.start_opening"; readonly baseline: OpeningBaselineV1 }
  | { readonly kind: "workflow.record_opening_event"; readonly eventId: EventId }
  | {
      readonly kind: "workflow.set_opening_blocking_event";
      readonly blockingEvent: OpeningBlockingEventV1;
    }
  | { readonly kind: "workflow.clear_opening_blocking_event"; readonly eventId: EventId }
  | { readonly kind: "workflow.add_opening_modifier"; readonly modifier: ModifierV1 }
  | { readonly kind: "workflow.advance_opening_checkpoint" }
  | { readonly kind: "workflow.finalize_opening" }
  | {
      readonly kind: "workflow.begin_world_action";
      readonly actionId: ActionId;
      readonly optionId: ChoiceId;
    }
  | { readonly kind: "workflow.record_world_action_choice"; readonly choiceId: ChoiceId }
  | { readonly kind: "workflow.finish_world_action_begin_scene" }
  | { readonly kind: "workflow.enter_world_action_completion_scene" }
  | { readonly kind: "workflow.finish_world_action_completion_scene" }
  | { readonly kind: "workflow.complete_world_action"; readonly bandId: CheckBandId | null };

const pocWorkflowOperationKindsV1 = Object.freeze([
  "workflow.start_opening",
  "workflow.record_opening_event",
  "workflow.set_opening_blocking_event",
  "workflow.clear_opening_blocking_event",
  "workflow.add_opening_modifier",
  "workflow.advance_opening_checkpoint",
  "workflow.finalize_opening",
  "workflow.begin_world_action",
  "workflow.record_world_action_choice",
  "workflow.finish_world_action_begin_scene",
  "workflow.enter_world_action_completion_scene",
  "workflow.finish_world_action_completion_scene",
  "workflow.complete_world_action",
] as const satisfies readonly PocWorkflowOwnerOperationV1["kind"][]);

function parseWorkflowOperationKindV1(value: unknown): PocWorkflowOwnerOperationV1["kind"] {
  if (
    typeof value !== "string" ||
    !pocWorkflowOperationKindsV1.includes(value as PocWorkflowOwnerOperationV1["kind"])
  ) {
    throw new TypeError("invalid Workflow owner operation kind");
  }
  return value as PocWorkflowOwnerOperationV1["kind"];
}

export const pocWorkflowOwnerOperationSchemaV1: RuntimeSchemaV1<PocWorkflowOwnerOperationV1> =
  Object.freeze({
    parse(value: unknown): PocWorkflowOwnerOperationV1 {
      const candidate = exactDataObjectForKindV1(value, "Workflow owner operation");
      const kind = parseWorkflowOperationKindV1(
        dataPropertyV1(candidate, "kind", "Workflow owner operation"),
      );
      if (kind === "workflow.start_opening") {
        const operation = exactDataObjectV1(
          value,
          ["kind", "baseline"],
          "Workflow owner operation",
        );
        return deepFreezePocValueV1({
          kind,
          baseline: parsePocOpeningBaselineV1(
            dataPropertyV1(operation, "baseline", "Workflow owner operation"),
          ),
        });
      }
      if (
        kind === "workflow.record_opening_event" ||
        kind === "workflow.clear_opening_blocking_event"
      ) {
        const operation = exactDataObjectV1(value, ["kind", "eventId"], "Workflow owner operation");
        return deepFreezePocValueV1({
          kind,
          eventId: parseEventId(dataPropertyV1(operation, "eventId", "Workflow owner operation")),
        });
      }
      if (kind === "workflow.set_opening_blocking_event") {
        const operation = exactDataObjectV1(
          value,
          ["kind", "blockingEvent"],
          "Workflow owner operation",
        );
        return deepFreezePocValueV1({
          kind,
          blockingEvent: parseOpeningBlockingEventV1(
            dataPropertyV1(operation, "blockingEvent", "Workflow owner operation"),
          ),
        });
      }
      if (kind === "workflow.add_opening_modifier") {
        const operation = exactDataObjectV1(
          value,
          ["kind", "modifier"],
          "Workflow owner operation",
        );
        return deepFreezePocValueV1({
          kind,
          modifier: parsePocWorkflowModifierV1(
            dataPropertyV1(operation, "modifier", "Workflow owner operation"),
          ),
        });
      }
      if (kind === "workflow.begin_world_action") {
        const operation = exactDataObjectV1(
          value,
          ["kind", "actionId", "optionId"],
          "Workflow owner operation",
        );
        return deepFreezePocValueV1({
          kind,
          actionId: parseActionId(
            dataPropertyV1(operation, "actionId", "Workflow owner operation"),
          ),
          optionId: parseChoiceId(
            dataPropertyV1(operation, "optionId", "Workflow owner operation"),
          ),
        });
      }
      if (kind === "workflow.record_world_action_choice") {
        const operation = exactDataObjectV1(
          value,
          ["kind", "choiceId"],
          "Workflow owner operation",
        );
        return deepFreezePocValueV1({
          kind,
          choiceId: parseChoiceId(
            dataPropertyV1(operation, "choiceId", "Workflow owner operation"),
          ),
        });
      }
      if (kind === "workflow.complete_world_action") {
        const operation = exactDataObjectV1(value, ["kind", "bandId"], "Workflow owner operation");
        const bandId = dataPropertyV1(operation, "bandId", "Workflow owner operation");
        return deepFreezePocValueV1({
          kind,
          bandId: bandId === null ? null : parseCheckBandId(bandId),
        });
      }
      exactDataObjectV1(value, ["kind"], "Workflow owner operation");
      return deepFreezePocValueV1({ kind });
    },
  });

export interface PocWorkflowStartOpeningDependenciesV1 {
  readonly kind: "workflow.start_opening";
  readonly commandSequence: PositiveSafeInteger;
}

export type PocWorkflowOpeningCheckpointDependenciesV1 =
  | {
      readonly kind: "workflow.record_opening_event";
      readonly checkpoint: OpeningCheckpointV1;
    }
  | {
      readonly kind: "workflow.set_opening_blocking_event";
      readonly checkpoint: OpeningCheckpointV1;
    };

export interface PocWorkflowOpeningModifierDependenciesV1 {
  readonly kind: "workflow.add_opening_modifier";
  readonly sourceEventId: EventId;
}

export interface PocWorkflowBeginWorldActionDependenciesV1 {
  readonly kind: "workflow.begin_world_action";
  readonly beginStepId: WorldStepId;
  readonly completionStepId: WorldStepId;
  readonly preparationBonus: SafeInteger;
  readonly startedAtSequence: PositiveSafeInteger;
  readonly startedDay: DayIndex;
  readonly startedPhase: CalendarPhase;
  readonly paidCostEntryIds: readonly LedgerEntryId[];
}

export interface PocWorkflowRecordWorldActionChoiceDependenciesV1 {
  readonly kind: "workflow.record_world_action_choice";
  readonly committedAtSequence: PositiveSafeInteger;
}

type PocWorkflowKindOnlyDependencyPortsV1 = {
  readonly kind: Exclude<
    PocWorkflowOwnerOperationV1["kind"],
    | "workflow.start_opening"
    | "workflow.record_opening_event"
    | "workflow.set_opening_blocking_event"
    | "workflow.add_opening_modifier"
    | "workflow.begin_world_action"
    | "workflow.record_world_action_choice"
  >;
};

export type PocWorkflowDependencyPortsV1 =
  | PocWorkflowStartOpeningDependenciesV1
  | PocWorkflowOpeningCheckpointDependenciesV1
  | PocWorkflowOpeningModifierDependenciesV1
  | PocWorkflowBeginWorldActionDependenciesV1
  | PocWorkflowRecordWorldActionChoiceDependenciesV1
  | PocWorkflowKindOnlyDependencyPortsV1;

export const pocWorkflowDependencyPortsSchemaV1: RuntimeSchemaV1<PocWorkflowDependencyPortsV1> =
  Object.freeze({
    parse(value: unknown): PocWorkflowDependencyPortsV1 {
      const candidate = exactDataObjectForKindV1(value, "Workflow dependency ports");
      const kind = parseWorkflowOperationKindV1(
        dataPropertyV1(candidate, "kind", "Workflow dependency ports"),
      );
      if (kind === "workflow.start_opening") {
        const dependencies = exactDataObjectV1(
          value,
          ["kind", "commandSequence"],
          "Workflow dependency ports",
        );
        return deepFreezePocValueV1({
          kind,
          commandSequence: parsePositiveSafeInteger(
            dataPropertyV1(dependencies, "commandSequence", "Workflow dependency ports"),
          ),
        });
      }
      if (
        kind === "workflow.record_opening_event" ||
        kind === "workflow.set_opening_blocking_event"
      ) {
        const dependencies = exactDataObjectV1(
          value,
          ["kind", "checkpoint"],
          "Workflow dependency ports",
        );
        return deepFreezePocValueV1({
          kind,
          checkpoint: parseOpeningCheckpointV1(
            dataPropertyV1(dependencies, "checkpoint", "Workflow dependency ports"),
          ),
        });
      }
      if (kind === "workflow.add_opening_modifier") {
        const dependencies = exactDataObjectV1(
          value,
          ["kind", "sourceEventId"],
          "Workflow dependency ports",
        );
        return deepFreezePocValueV1({
          kind,
          sourceEventId: parseEventId(
            dataPropertyV1(dependencies, "sourceEventId", "Workflow dependency ports"),
          ),
        });
      }
      if (kind === "workflow.begin_world_action") {
        const dependencies = exactDataObjectV1(
          value,
          [
            "kind",
            "beginStepId",
            "completionStepId",
            "preparationBonus",
            "startedAtSequence",
            "startedDay",
            "startedPhase",
            "paidCostEntryIds",
          ],
          "Workflow dependency ports",
        );
        return deepFreezePocValueV1({
          kind,
          beginStepId: parseWorldStepId(
            dataPropertyV1(dependencies, "beginStepId", "Workflow dependency ports"),
          ),
          completionStepId: parseWorldStepId(
            dataPropertyV1(dependencies, "completionStepId", "Workflow dependency ports"),
          ),
          preparationBonus: parseSafeInteger(
            dataPropertyV1(dependencies, "preparationBonus", "Workflow dependency ports"),
          ),
          startedAtSequence: parsePositiveSafeInteger(
            dataPropertyV1(dependencies, "startedAtSequence", "Workflow dependency ports"),
          ),
          startedDay: parseDayIndex(
            dataPropertyV1(dependencies, "startedDay", "Workflow dependency ports"),
          ),
          startedPhase: parseCalendarPhase(
            dataPropertyV1(dependencies, "startedPhase", "Workflow dependency ports"),
          ),
          paidCostEntryIds: exactDataArrayV1(
            dataPropertyV1(dependencies, "paidCostEntryIds", "Workflow dependency ports"),
            "Workflow dependency paid LedgerEntryIds",
          ).map(parseLedgerEntryId),
        });
      }
      if (kind === "workflow.record_world_action_choice") {
        const dependencies = exactDataObjectV1(
          value,
          ["kind", "committedAtSequence"],
          "Workflow dependency ports",
        );
        return deepFreezePocValueV1({
          kind,
          committedAtSequence: parsePositiveSafeInteger(
            dataPropertyV1(dependencies, "committedAtSequence", "Workflow dependency ports"),
          ),
        });
      }
      exactDataObjectV1(value, ["kind"], "Workflow dependency ports");
      return deepFreezePocValueV1({ kind });
    },
  });

function uniqueValuesV1(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function stableValuesV1(values: readonly string[]): boolean {
  return values.every((value, index) => index === 0 || (values[index - 1] ?? "") < value);
}

interface PocWorkflowInvariantViolationV1 {
  readonly code: "workflow.conflict" | "opening.invalid_checkpoint";
  readonly details: { readonly reason: string };
}

function workflowInvariantViolationsV1(
  state: ActiveWorkflowV1 | null,
): readonly PocWorkflowInvariantViolationV1[] {
  if (state === null) return Object.freeze([]);
  const violations: PocWorkflowInvariantViolationV1[] = [];
  const report = (code: PocWorkflowInvariantViolationV1["code"], reason: string): void => {
    violations.push({ code, details: { reason } });
  };
  if (state.kind === "opening") {
    const baseline = state.baseline;
    if (state.sessionId !== `opening:${baseline.startedAtSequence}`) {
      report("workflow.conflict", "opening_session_identity");
    }
    if (
      baseline.ap.after > baseline.ap.before ||
      baseline.playerStamina.after > baseline.playerStamina.before ||
      baseline.heroineStamina.after > baseline.heroineStamina.before ||
      baseline.cashAtStart.after > baseline.cashAtStart.before
    ) {
      report("workflow.conflict", "opening_start_resource_delta");
    }
    if (
      baseline.menu.length === 0 ||
      baseline.menu.length > 16 ||
      !uniqueValuesV1(baseline.menu.map(({ recipeId }) => recipeId))
    ) {
      report("workflow.conflict", "opening_menu");
    }
    if (
      !uniqueValuesV1(baseline.preparedPortions.map(({ recipeId }) => recipeId)) ||
      !uniqueValuesV1(baseline.consumedIngredients.map(({ batchId }) => batchId)) ||
      !stableValuesV1(baseline.demand.map(({ segmentId }) => segmentId)) ||
      !stableValuesV1(baseline.facilityIds) ||
      !uniqueValuesV1(baseline.startEntryIds)
    ) {
      report("workflow.conflict", "opening_baseline_collections");
    }
    if (!uniqueValuesV1(state.triggeredEventIds)) {
      report("workflow.conflict", "opening_triggered_events");
    }
    if (
      state.blockingEvent !== null &&
      !state.triggeredEventIds.includes(state.blockingEvent.eventId)
    ) {
      report("opening.invalid_checkpoint", "opening_blocking_event_not_triggered");
    }
    let previousModifierSourceIndex = -1;
    if (
      state.sessionModifiers.some(({ source }) => {
        if (source.kind !== "event") return true;
        const sourceIndex = state.triggeredEventIds.indexOf(source.eventId);
        if (sourceIndex < previousModifierSourceIndex) return true;
        previousModifierSourceIndex = sourceIndex;
        return sourceIndex < 0;
      })
    ) {
      report("workflow.conflict", "opening_session_modifier_source");
    }
  } else {
    if (state.beginStepId === state.completionStepId) {
      report("workflow.conflict", "world_action_step_identity");
    }
    if (!uniqueValuesV1(state.paidCostEntryIds)) {
      report("workflow.conflict", "world_action_paid_entries");
    }
    let previousSequence = state.startedAtSequence;
    const choiceIds = new Set<ChoiceId>();
    for (const choice of state.choices) {
      if (choiceIds.has(choice.choiceId) || choice.committedAtSequence <= previousSequence) {
        report("workflow.conflict", "world_action_choices");
        break;
      }
      choiceIds.add(choice.choiceId);
      previousSequence = choice.committedAtSequence;
    }
  }
  return deepFreezePocValueV1(violations);
}

export const pocWorkflowInvariantV1 = Object.freeze({
  check(
    stateValue: DeepReadonly<ActiveWorkflowV1 | null>,
    _readPort: PocWorkflowReadPortV1,
  ): readonly PocWorkflowInvariantViolationV1[] {
    return workflowInvariantViolationsV1(pocWorkflowStateSchemaV1.parse(stateValue));
  },
});

export function assertValidPocWorkflowStateV1(
  stateValue: DeepReadonly<ActiveWorkflowV1 | null>,
  label: string,
): void {
  const state = pocWorkflowStateSchemaV1.parse(stateValue);
  if (workflowInvariantViolationsV1(state).length !== 0) {
    throw new TypeError(`${label} violates Workflow invariants`);
  }
}

export type PocWorkflowReadPortV1 = ActiveWorkflowV1 | null;

export type PocWorkflowGameplayFactV1 = Extract<
  PocGameplayFactV1,
  {
    readonly kind:
      | "opening.started"
      | "opening.checkpoint_advanced"
      | "world.action_started"
      | "world.action_completed";
  }
>;

export interface PocWorkflowOwnerProposalPayloadV1 {
  readonly kind: PocWorkflowOwnerOperationV1["kind"];
  readonly before: ActiveWorkflowV1 | null;
  readonly activeWorkflow: ActiveWorkflowV1 | null;
}

export type PocWorkflowOwnerProposalV1 = ModuleOwnerProposalEnvelopeV1<
  PocWorkflowOwnerProposalPayloadV1,
  PocWorkflowGameplayFactV1
>;

function parseWorkflowFactV1(value: unknown): PocWorkflowGameplayFactV1 {
  const candidate = exactDataObjectForKindV1(value, "Workflow GameplayFact");
  const kind = dataPropertyV1(candidate, "kind", "Workflow GameplayFact");
  if (kind === "opening.started") {
    const fact = exactDataObjectV1(
      value,
      ["kind", "sessionId", "checkpoint"],
      "Workflow GameplayFact",
    );
    return deepFreezePocValueV1({
      kind,
      sessionId: parseOpeningSessionId(dataPropertyV1(fact, "sessionId", "Workflow GameplayFact")),
      checkpoint: parseOpeningCheckpointV1(
        dataPropertyV1(fact, "checkpoint", "Workflow GameplayFact"),
      ),
    });
  }
  if (kind === "opening.checkpoint_advanced") {
    const fact = exactDataObjectV1(
      value,
      ["kind", "sessionId", "from", "to"],
      "Workflow GameplayFact",
    );
    return deepFreezePocValueV1({
      kind,
      sessionId: parseOpeningSessionId(dataPropertyV1(fact, "sessionId", "Workflow GameplayFact")),
      from: parseOpeningCheckpointV1(dataPropertyV1(fact, "from", "Workflow GameplayFact")),
      to: parseOpeningCheckpointV1(dataPropertyV1(fact, "to", "Workflow GameplayFact")),
    });
  }
  if (kind === "world.action_started") {
    const fact = exactDataObjectV1(value, ["kind", "actionId", "stepId"], "Workflow GameplayFact");
    return deepFreezePocValueV1({
      kind,
      actionId: parseActionId(dataPropertyV1(fact, "actionId", "Workflow GameplayFact")),
      stepId: parseWorldStepId(dataPropertyV1(fact, "stepId", "Workflow GameplayFact")),
    });
  }
  if (kind === "world.action_completed") {
    const fact = exactDataObjectV1(value, ["kind", "actionId", "bandId"], "Workflow GameplayFact");
    const bandId = dataPropertyV1(fact, "bandId", "Workflow GameplayFact");
    return deepFreezePocValueV1({
      kind,
      actionId: parseActionId(dataPropertyV1(fact, "actionId", "Workflow GameplayFact")),
      bandId: bandId === null ? null : parseCheckBandId(bandId),
    });
  }
  throw new TypeError("invalid Workflow GameplayFact kind");
}

export const pocWorkflowGameplayFactSchemaV1: RuntimeSchemaV1<PocWorkflowGameplayFactV1> =
  Object.freeze({ parse: parseWorkflowFactV1 });

function nextOpeningCheckpointV1(checkpoint: OpeningCheckpointV1): OpeningCheckpointV1 | null {
  if (checkpoint === "started") return "middle";
  if (checkpoint === "middle") return "before_finalize";
  if (checkpoint === "before_finalize") return "ready_to_finalize";
  return null;
}

function assertNoFactsV1(proposal: PocWorkflowOwnerProposalV1): void {
  if (proposal.facts.length !== 0) throw new TypeError("Workflow proposal has unexpected Facts");
}

function assertCanonicalStateV1(
  actual: ActiveWorkflowV1 | null,
  expected: ActiveWorkflowV1 | null,
  label: string,
): void {
  if (!canonicalValuesEqualV1(actual, expected)) throw new TypeError(`invalid ${label} transition`);
}

function assertWorkflowProposalConsistencyV1(proposal: PocWorkflowOwnerProposalV1): void {
  const { activeWorkflow: after, before, kind } = proposal.payload;
  assertValidPocWorkflowStateV1(before, "Workflow proposal before State");
  assertValidPocWorkflowStateV1(after, "Workflow proposal active State");

  if (kind === "workflow.start_opening") {
    if (before !== null || after?.kind !== "opening" || after.checkpoint !== "started") {
      throw new TypeError("invalid Workflow Opening start proposal");
    }
    const [fact] = proposal.facts;
    if (
      proposal.facts.length !== 1 ||
      fact?.kind !== "opening.started" ||
      fact.sessionId !== after.sessionId ||
      fact.checkpoint !== after.checkpoint
    ) {
      throw new TypeError("invalid Workflow Opening start Fact");
    }
    return;
  }
  if (kind === "workflow.begin_world_action") {
    if (before !== null || after?.kind !== "world_action" || after.progress !== "begin_scene") {
      throw new TypeError("invalid Workflow WorldAction start proposal");
    }
    const [fact] = proposal.facts;
    if (
      proposal.facts.length !== 1 ||
      fact?.kind !== "world.action_started" ||
      fact.actionId !== after.actionId ||
      fact.stepId !== after.beginStepId
    ) {
      throw new TypeError("invalid Workflow WorldAction start Fact");
    }
    return;
  }
  if (kind === "workflow.finalize_opening") {
    if (before?.kind !== "opening" || before.checkpoint !== "ready_to_finalize" || after !== null) {
      throw new TypeError("invalid Workflow Opening finalize proposal");
    }
    assertNoFactsV1(proposal);
    return;
  }
  if (kind === "workflow.complete_world_action") {
    if (
      before?.kind !== "world_action" ||
      before.progress !== "ready_to_complete" ||
      after !== null
    ) {
      throw new TypeError("invalid Workflow WorldAction completion proposal");
    }
    const [fact] = proposal.facts;
    if (
      proposal.facts.length !== 1 ||
      fact?.kind !== "world.action_completed" ||
      fact.actionId !== before.actionId
    ) {
      throw new TypeError("invalid Workflow WorldAction completion Fact");
    }
    return;
  }
  if (before?.kind === "opening" && after?.kind === "opening") {
    if (kind === "workflow.record_opening_event") {
      if (
        after.triggeredEventIds.length !== before.triggeredEventIds.length + 1 ||
        !canonicalValuesEqualV1(after.triggeredEventIds.slice(0, -1), before.triggeredEventIds)
      ) {
        throw new TypeError("invalid Workflow Opening event append");
      }
      assertCanonicalStateV1(
        after,
        { ...before, triggeredEventIds: after.triggeredEventIds },
        kind,
      );
    } else if (kind === "workflow.set_opening_blocking_event") {
      if (before.blockingEvent !== null || after.blockingEvent === null) {
        throw new TypeError("invalid Workflow Opening blocking-event set");
      }
      assertCanonicalStateV1(after, { ...before, blockingEvent: after.blockingEvent }, kind);
    } else if (kind === "workflow.clear_opening_blocking_event") {
      if (before.blockingEvent === null || after.blockingEvent !== null) {
        throw new TypeError("invalid Workflow Opening blocking-event clear");
      }
      assertCanonicalStateV1(after, { ...before, blockingEvent: null }, kind);
    } else if (kind === "workflow.add_opening_modifier") {
      if (
        after.sessionModifiers.length !== before.sessionModifiers.length + 1 ||
        !canonicalValuesEqualV1(after.sessionModifiers.slice(0, -1), before.sessionModifiers)
      ) {
        throw new TypeError("invalid Workflow Opening Modifier append");
      }
      assertCanonicalStateV1(after, { ...before, sessionModifiers: after.sessionModifiers }, kind);
    } else if (kind === "workflow.advance_opening_checkpoint") {
      const next = nextOpeningCheckpointV1(before.checkpoint);
      if (next === null || after.checkpoint !== next) {
        throw new TypeError("invalid Workflow Opening checkpoint advance");
      }
      assertCanonicalStateV1(after, { ...before, checkpoint: next }, kind);
      const [fact] = proposal.facts;
      if (
        proposal.facts.length !== 1 ||
        fact?.kind !== "opening.checkpoint_advanced" ||
        fact.sessionId !== before.sessionId ||
        fact.from !== before.checkpoint ||
        fact.to !== next
      ) {
        throw new TypeError("invalid Workflow Opening checkpoint Fact");
      }
      return;
    } else {
      throw new TypeError("invalid Workflow Opening proposal kind");
    }
    assertNoFactsV1(proposal);
    return;
  }
  if (before?.kind === "world_action" && after?.kind === "world_action") {
    if (kind === "workflow.record_world_action_choice") {
      if (
        after.choices.length !== before.choices.length + 1 ||
        !canonicalValuesEqualV1(after.choices.slice(0, -1), before.choices)
      ) {
        throw new TypeError("invalid Workflow WorldAction choice append");
      }
      assertCanonicalStateV1(after, { ...before, choices: after.choices }, kind);
    } else {
      const expectedProgress =
        kind === "workflow.finish_world_action_begin_scene"
          ? "awaiting_completion_phase"
          : kind === "workflow.enter_world_action_completion_scene"
            ? "completion_scene"
            : kind === "workflow.finish_world_action_completion_scene"
              ? "ready_to_complete"
              : null;
      if (expectedProgress === null || after.progress !== expectedProgress) {
        throw new TypeError("invalid Workflow WorldAction progress transition");
      }
      assertCanonicalStateV1(after, { ...before, progress: expectedProgress }, kind);
    }
    assertNoFactsV1(proposal);
    return;
  }
  throw new TypeError("invalid Workflow owner proposal transition");
}

export const pocWorkflowOwnerProposalSchemaV1: RuntimeSchemaV1<PocWorkflowOwnerProposalV1> =
  Object.freeze({
    parse(value: unknown): PocWorkflowOwnerProposalV1 {
      const proposal = exactDataObjectV1(value, ["payload", "facts"], "Workflow owner proposal");
      const payload = exactDataObjectV1(
        dataPropertyV1(proposal, "payload", "Workflow owner proposal"),
        ["kind", "before", "activeWorkflow"],
        "Workflow owner proposal payload",
      );
      const parsed = deepFreezePocValueV1({
        payload: {
          kind: parseWorkflowOperationKindV1(
            dataPropertyV1(payload, "kind", "Workflow owner proposal payload"),
          ),
          before: pocWorkflowStateSchemaV1.parse(
            dataPropertyV1(payload, "before", "Workflow owner proposal payload"),
          ),
          activeWorkflow: pocWorkflowStateSchemaV1.parse(
            dataPropertyV1(payload, "activeWorkflow", "Workflow owner proposal payload"),
          ),
        },
        facts: exactDataArrayV1(
          dataPropertyV1(proposal, "facts", "Workflow owner proposal"),
          "Workflow owner proposal Facts",
        ).map(parseWorkflowFactV1),
      }) satisfies PocWorkflowOwnerProposalV1;
      assertWorkflowProposalConsistencyV1(parsed);
      return parsed;
    },
  });

export function pocWorkflowStatesEqualV1(
  left: ActiveWorkflowV1 | null,
  right: ActiveWorkflowV1 | null,
): boolean {
  return canonicalValuesEqualV1(left, right);
}
