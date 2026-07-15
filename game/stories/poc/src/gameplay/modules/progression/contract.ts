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
  parseAttributeId,
  parseAuraId,
  parseCheckBandId,
  parseCheckId,
  parseCustomerSegmentId,
  parseEndingId,
  parseEventId,
  parseFacilityId,
  parseFactId,
  parseHelperTier,
  parseIngredientId,
  parseItemId,
  parseModifierSourceId,
  parseOutcomeId,
  parseQuestId,
  parseReasonId,
  parseRecipeId,
  parseRelationshipStage,
  parseServiceMode,
  parseStoryToken,
} from "../../contracts/ids.js";
import { pocDebugCommandKindsV1 } from "../../contracts/types.js";
import type {
  AppliedModifierV1,
  ChangeReasonV1,
  CheckDefinitionV1,
  CheckResultV1,
  EffectIntentV1,
  FactDefinitionV1,
  FactEntryV1,
  ModifierSourceRefV1,
  ModifierV1,
  OutcomeDefinitionV1,
  OutcomeEntryV1,
  PocDebugCommandV1,
  PocGameCommandV1,
  PocGameplayFactV1,
  QuestDefinitionV1,
  QuestEntryV1,
  QuestStatusV1,
  ResolvedCheckV1,
  StoryValueDefinitionV1,
  StoryValueV1,
} from "../../contracts/types.js";
import {
  deepFreezePocValueV1,
  parseAttributeBonus,
  parseDieFace,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseQuantity,
  parseSafeInteger,
} from "../../contracts/values.js";
import type { PositiveSafeInteger } from "../../contracts/values.js";

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

function canonicalValuesEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.length === rightBytes.length &&
    leftBytes.every((value, index) => value === rightBytes[index])
  );
}

function compareStableIdsV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function parsePocProgressionStoryValueV1(value: unknown): StoryValueV1 {
  const storyValue = exactDataObjectV1(value, ["kind", "value"], "Progression Story value");
  const kind = dataPropertyV1(storyValue, "kind", "Progression Story value");
  const innerValue = dataPropertyV1(storyValue, "value", "Progression Story value");
  if (kind === "boolean") {
    if (typeof innerValue !== "boolean") throw new TypeError("invalid boolean Story value");
    return deepFreezePocValueV1({ kind, value: innerValue });
  }
  if (kind === "integer") {
    return deepFreezePocValueV1({ kind, value: parseSafeInteger(innerValue) });
  }
  if (kind === "token") {
    return deepFreezePocValueV1({ kind, value: parseStoryToken(innerValue) });
  }
  throw new TypeError("invalid Progression Story value kind");
}

export function parsePocProgressionFactEntryV1(value: unknown): FactEntryV1 {
  const entry = exactDataObjectV1(value, ["factId", "value"], "Progression Fact entry");
  return deepFreezePocValueV1({
    factId: parseFactId(dataPropertyV1(entry, "factId", "Progression Fact entry")),
    value: parsePocProgressionStoryValueV1(
      dataPropertyV1(entry, "value", "Progression Fact entry"),
    ),
  });
}

function parseQuestStatusV1(value: unknown): QuestStatusV1 {
  if (value !== "locked" && value !== "active" && value !== "completed" && value !== "failed") {
    throw new TypeError("invalid Quest status");
  }
  return value;
}

export function parsePocProgressionQuestEntryV1(value: unknown): QuestEntryV1 {
  const entry = exactDataObjectV1(
    value,
    ["questId", "status", "progress", "target"],
    "Progression Quest entry",
  );
  return deepFreezePocValueV1({
    questId: parseQuestId(dataPropertyV1(entry, "questId", "Progression Quest entry")),
    status: parseQuestStatusV1(dataPropertyV1(entry, "status", "Progression Quest entry")),
    progress: parseNonNegativeSafeInteger(
      dataPropertyV1(entry, "progress", "Progression Quest entry"),
    ),
    target: parsePositiveSafeInteger(dataPropertyV1(entry, "target", "Progression Quest entry")),
  });
}

export function parsePocProgressionOutcomeEntryV1(value: unknown): OutcomeEntryV1 {
  const entry = exactDataObjectV1(value, ["outcomeId", "value"], "Progression Outcome entry");
  return deepFreezePocValueV1({
    outcomeId: parseOutcomeId(dataPropertyV1(entry, "outcomeId", "Progression Outcome entry")),
    value: parsePocProgressionStoryValueV1(
      dataPropertyV1(entry, "value", "Progression Outcome entry"),
    ),
  });
}

function parseModifierSourceRefV1(value: unknown): ModifierSourceRefV1 {
  const candidate = exactDataObjectForKindV1(value, "Progression Modifier source");
  const kind = dataPropertyV1(candidate, "kind", "Progression Modifier source");
  if (kind === "facility") {
    const source = exactDataObjectV1(value, ["kind", "facilityId"], "Progression Modifier source");
    return deepFreezePocValueV1({
      kind,
      facilityId: parseFacilityId(
        dataPropertyV1(source, "facilityId", "Progression Modifier source"),
      ),
    });
  }
  if (kind === "aura") {
    const source = exactDataObjectV1(value, ["kind", "auraId"], "Progression Modifier source");
    return deepFreezePocValueV1({
      kind,
      auraId: parseAuraId(dataPropertyV1(source, "auraId", "Progression Modifier source")),
    });
  }
  if (kind === "event") {
    const source = exactDataObjectV1(value, ["kind", "eventId"], "Progression Modifier source");
    return deepFreezePocValueV1({
      kind,
      eventId: parseEventId(dataPropertyV1(source, "eventId", "Progression Modifier source")),
    });
  }
  if (kind === "story") {
    const source = exactDataObjectV1(value, ["kind", "sourceId"], "Progression Modifier source");
    return deepFreezePocValueV1({
      kind,
      sourceId: parseModifierSourceId(
        dataPropertyV1(source, "sourceId", "Progression Modifier source"),
      ),
    });
  }
  throw new TypeError("invalid Progression Modifier source kind");
}

function parseServiceModesV1(value: unknown): readonly ReturnType<typeof parseServiceMode>[] {
  return deepFreezePocValueV1(
    exactDataArrayV1(value, "Progression Modifier service modes").map(parseServiceMode),
  );
}

function parsePocProgressionModifierV1(value: unknown): ModifierV1 {
  const candidate = exactDataObjectForKindV1(value, "Progression Modifier");
  const kind = dataPropertyV1(candidate, "kind", "Progression Modifier");
  const common = (expectedKeys: readonly string[]) =>
    exactDataObjectV1(value, expectedKeys, "Progression Modifier");
  if (
    kind === "capacity.add" ||
    kind === "prep_points.add" ||
    kind === "demand.add" ||
    kind === "service_cost.add"
  ) {
    const expectedKeys =
      kind === "demand.add"
        ? ["kind", "source", "segmentId", "amount", "reasonId"]
        : ["kind", "source", "modes", "amount", "reasonId"];
    const modifier = common(expectedKeys);
    const source = parseModifierSourceRefV1(
      dataPropertyV1(modifier, "source", "Progression Modifier"),
    );
    const amount = parseSafeInteger(dataPropertyV1(modifier, "amount", "Progression Modifier"));
    const reasonId = parseReasonId(dataPropertyV1(modifier, "reasonId", "Progression Modifier"));
    if (kind === "demand.add") {
      return deepFreezePocValueV1({
        kind,
        source,
        segmentId: parseCustomerSegmentId(
          dataPropertyV1(modifier, "segmentId", "Progression Modifier"),
        ),
        amount,
        reasonId,
      });
    }
    return deepFreezePocValueV1({
      kind,
      source,
      modes: parseServiceModesV1(dataPropertyV1(modifier, "modes", "Progression Modifier")),
      amount,
      reasonId,
    });
  }
  if (kind === "recovery.add") {
    const modifier = common(["kind", "source", "actorId", "amount", "reasonId"]);
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceRefV1(dataPropertyV1(modifier, "source", "Progression Modifier")),
      actorId: parseActorId(dataPropertyV1(modifier, "actorId", "Progression Modifier")),
      amount: parseSafeInteger(dataPropertyV1(modifier, "amount", "Progression Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Progression Modifier")),
    });
  }
  if (kind === "check.add") {
    const modifier = common(["kind", "source", "checkId", "amount", "reasonId"]);
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceRefV1(dataPropertyV1(modifier, "source", "Progression Modifier")),
      checkId: parseCheckId(dataPropertyV1(modifier, "checkId", "Progression Modifier")),
      amount: parseSafeInteger(dataPropertyV1(modifier, "amount", "Progression Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Progression Modifier")),
    });
  }
  if (kind === "shelf_life.add_days") {
    const modifier = common(["kind", "source", "ingredientIds", "amount", "reasonId"]);
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceRefV1(dataPropertyV1(modifier, "source", "Progression Modifier")),
      ingredientIds: exactDataArrayV1(
        dataPropertyV1(modifier, "ingredientIds", "Progression Modifier"),
        "Progression Modifier IngredientIds",
      ).map(parseIngredientId),
      amount: parsePositiveSafeInteger(dataPropertyV1(modifier, "amount", "Progression Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Progression Modifier")),
    });
  }
  if (kind === "teamwork_gain.block") {
    const modifier = common(["kind", "source", "reasonId"]);
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceRefV1(dataPropertyV1(modifier, "source", "Progression Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Progression Modifier")),
    });
  }
  throw new TypeError("invalid Progression Modifier kind");
}

function parseAppliedModifierV1(value: unknown): AppliedModifierV1 {
  const applied = exactDataObjectV1(
    value,
    ["modifier", "contribution"],
    "Progression applied Modifier",
  );
  return deepFreezePocValueV1({
    modifier: parsePocProgressionModifierV1(
      dataPropertyV1(applied, "modifier", "Progression applied Modifier"),
    ),
    contribution: parseSafeInteger(
      dataPropertyV1(applied, "contribution", "Progression applied Modifier"),
    ),
  });
}

function parseInventorySourceRefV1(
  value: unknown,
): Extract<EffectIntentV1, { readonly kind: "inventory.grant" }>["source"] {
  const candidate = exactDataObjectForKindV1(value, "Progression inventory source");
  const kind = dataPropertyV1(candidate, "kind", "Progression inventory source");
  if (kind === "initial" || kind === "debug") {
    const source = exactDataObjectV1(value, ["kind", "reasonId"], "Progression inventory source");
    return deepFreezePocValueV1({
      kind,
      reasonId: parseReasonId(dataPropertyV1(source, "reasonId", "Progression inventory source")),
    });
  }
  if (kind === "purchase") {
    const source = exactDataObjectV1(
      value,
      ["kind", "commandSequence"],
      "Progression inventory source",
    );
    return deepFreezePocValueV1({
      kind,
      commandSequence: parsePositiveSafeInteger(
        dataPropertyV1(source, "commandSequence", "Progression inventory source"),
      ),
    });
  }
  if (kind === "story_action" || kind === "world_action") {
    const source = exactDataObjectV1(value, ["kind", "actionId"], "Progression inventory source");
    return deepFreezePocValueV1({
      kind,
      actionId: parseActionId(dataPropertyV1(source, "actionId", "Progression inventory source")),
    });
  }
  if (kind === "story_event") {
    const source = exactDataObjectV1(value, ["kind", "eventId"], "Progression inventory source");
    return deepFreezePocValueV1({
      kind,
      eventId: parseEventId(dataPropertyV1(source, "eventId", "Progression inventory source")),
    });
  }
  throw new TypeError("invalid Progression inventory source kind");
}

function parseAuraTargetV1(
  value: unknown,
): Extract<EffectIntentV1, { readonly kind: "aura.apply" }>["target"] {
  const candidate = exactDataObjectForKindV1(value, "Progression Aura target");
  const kind = dataPropertyV1(candidate, "kind", "Progression Aura target");
  if (kind === "actor") {
    const target = exactDataObjectV1(value, ["kind", "actorId"], "Progression Aura target");
    return deepFreezePocValueV1({
      kind,
      actorId: parseActorId(dataPropertyV1(target, "actorId", "Progression Aura target")),
    });
  }
  if (kind === "tavern" || kind === "run") {
    exactDataObjectV1(value, ["kind"], "Progression Aura target");
    return deepFreezePocValueV1({ kind });
  }
  throw new TypeError("invalid Progression Aura target kind");
}

function parseAuraSourceRefV1(
  value: unknown,
): Extract<EffectIntentV1, { readonly kind: "aura.apply" }>["source"] {
  const candidate = exactDataObjectForKindV1(value, "Progression Aura source");
  const kind = dataPropertyV1(candidate, "kind", "Progression Aura source");
  if (kind === "initial" || kind === "debug") {
    const source = exactDataObjectV1(value, ["kind", "reasonId"], "Progression Aura source");
    return deepFreezePocValueV1({
      kind,
      reasonId: parseReasonId(dataPropertyV1(source, "reasonId", "Progression Aura source")),
    });
  }
  if (kind === "story_event") {
    const source = exactDataObjectV1(value, ["kind", "eventId"], "Progression Aura source");
    return deepFreezePocValueV1({
      kind,
      eventId: parseEventId(dataPropertyV1(source, "eventId", "Progression Aura source")),
    });
  }
  if (kind === "story_action" || kind === "world_action") {
    const source = exactDataObjectV1(value, ["kind", "actionId"], "Progression Aura source");
    return deepFreezePocValueV1({
      kind,
      actionId: parseActionId(dataPropertyV1(source, "actionId", "Progression Aura source")),
    });
  }
  if (kind === "facility") {
    const source = exactDataObjectV1(value, ["kind", "facilityId"], "Progression Aura source");
    return deepFreezePocValueV1({
      kind,
      facilityId: parseFacilityId(dataPropertyV1(source, "facilityId", "Progression Aura source")),
    });
  }
  throw new TypeError("invalid Progression Aura source kind");
}

function parseAuraDurationV1(
  value: unknown,
): Extract<EffectIntentV1, { readonly kind: "aura.apply" }>["duration"] {
  const candidate = exactDataObjectForKindV1(value, "Progression Aura duration");
  const kind = dataPropertyV1(candidate, "kind", "Progression Aura duration");
  if (kind === "until_cleared") {
    exactDataObjectV1(value, ["kind"], "Progression Aura duration");
    return deepFreezePocValueV1({ kind });
  }
  if (kind === "countdown") {
    const duration = exactDataObjectV1(
      value,
      ["kind", "unit", "remaining"],
      "Progression Aura duration",
    );
    const unit = dataPropertyV1(duration, "unit", "Progression Aura duration");
    if (
      unit !== "phase_end" &&
      unit !== "day_end" &&
      unit !== "opening" &&
      unit !== "night_recovery"
    ) {
      throw new TypeError("invalid Progression Aura duration unit");
    }
    return deepFreezePocValueV1({
      kind,
      unit,
      remaining: parsePositiveSafeInteger(
        dataPropertyV1(duration, "remaining", "Progression Aura duration"),
      ),
    });
  }
  throw new TypeError("invalid Progression Aura duration kind");
}

function parseIngredientLinesV1(value: unknown) {
  return deepFreezePocValueV1(
    exactDataArrayV1(value, "Progression ingredient lines").map((line) => {
      const entry = exactDataObjectV1(
        line,
        ["ingredientId", "quantity"],
        "Progression ingredient line",
      );
      return {
        ingredientId: parseIngredientId(
          dataPropertyV1(entry, "ingredientId", "Progression ingredient line"),
        ),
        quantity: parseQuantity(dataPropertyV1(entry, "quantity", "Progression ingredient line")),
      };
    }),
  );
}

function parseItemLinesV1(value: unknown) {
  return deepFreezePocValueV1(
    exactDataArrayV1(value, "Progression item lines").map((line) => {
      const entry = exactDataObjectV1(line, ["itemId", "quantity"], "Progression item line");
      return {
        itemId: parseItemId(dataPropertyV1(entry, "itemId", "Progression item line")),
        quantity: parseQuantity(dataPropertyV1(entry, "quantity", "Progression item line")),
      };
    }),
  );
}

function parseLedgerSubjectV1(
  value: unknown,
): Extract<EffectIntentV1, { readonly kind: "ledger.append" }>["entry"]["subject"] {
  const candidate = exactDataObjectForKindV1(value, "Progression Ledger subject");
  const kind = dataPropertyV1(candidate, "kind", "Progression Ledger subject");
  if (kind === "levy" || kind === "debug") {
    exactDataObjectV1(value, ["kind"], "Progression Ledger subject");
    return deepFreezePocValueV1({ kind });
  }
  const definitions = {
    ingredient: ["ingredientId", parseIngredientId],
    item: ["itemId", parseItemId],
    recipe: ["recipeId", parseRecipeId],
    facility: ["facilityId", parseFacilityId],
    service_mode: ["mode", parseServiceMode],
    event: ["eventId", parseEventId],
    action: ["actionId", parseActionId],
  } as const;
  if (typeof kind !== "string" || !(kind in definitions)) {
    throw new TypeError("invalid Progression Ledger subject kind");
  }
  const [key, parser] = definitions[kind as keyof typeof definitions];
  const subject = exactDataObjectV1(value, ["kind", key], "Progression Ledger subject");
  const parsed = parser(dataPropertyV1(subject, key, "Progression Ledger subject"));
  switch (kind) {
    case "ingredient":
      return deepFreezePocValueV1({
        kind,
        ingredientId: parsed as ReturnType<typeof parseIngredientId>,
      });
    case "item":
      return deepFreezePocValueV1({ kind, itemId: parsed as ReturnType<typeof parseItemId> });
    case "recipe":
      return deepFreezePocValueV1({ kind, recipeId: parsed as ReturnType<typeof parseRecipeId> });
    case "facility":
      return deepFreezePocValueV1({
        kind,
        facilityId: parsed as ReturnType<typeof parseFacilityId>,
      });
    case "service_mode":
      return deepFreezePocValueV1({ kind, mode: parsed as ReturnType<typeof parseServiceMode> });
    case "event":
      return deepFreezePocValueV1({ kind, eventId: parsed as ReturnType<typeof parseEventId> });
    case "action":
      return deepFreezePocValueV1({ kind, actionId: parsed as ReturnType<typeof parseActionId> });
  }
  throw new TypeError("invalid Progression Ledger subject");
}

function parseLedgerEntryDraftV1(
  value: unknown,
): Extract<EffectIntentV1, { readonly kind: "ledger.append" }>["entry"] {
  if (value === null || typeof value !== "object") {
    throw new TypeError("invalid Progression Ledger entry draft");
  }
  const hasQuantity = Object.prototype.hasOwnProperty.call(value, "quantity");
  const entry = exactDataObjectV1(
    value,
    hasQuantity
      ? ["category", "reasonId", "cashDelta", "valuationDelta", "subject", "quantity"]
      : ["category", "reasonId", "cashDelta", "valuationDelta", "subject"],
    "Progression Ledger entry draft",
  );
  const category = dataPropertyV1(entry, "category", "Progression Ledger entry draft");
  const categories = [
    "purchase",
    "wage",
    "opening_fee",
    "revenue",
    "discarded_food",
    "spoiled_ingredient",
    "facility",
    "world_action",
    "levy",
    "story_reward",
    "story_cost",
    "debug_adjustment",
  ] as const;
  if (
    typeof category !== "string" ||
    !categories.includes(category as (typeof categories)[number])
  ) {
    throw new TypeError("invalid Progression Ledger category");
  }
  const base = {
    category: category as (typeof categories)[number],
    reasonId: parseReasonId(dataPropertyV1(entry, "reasonId", "Progression Ledger entry draft")),
    cashDelta: parseSafeInteger(
      dataPropertyV1(entry, "cashDelta", "Progression Ledger entry draft"),
    ),
    valuationDelta: parseSafeInteger(
      dataPropertyV1(entry, "valuationDelta", "Progression Ledger entry draft"),
    ),
    subject: parseLedgerSubjectV1(
      dataPropertyV1(entry, "subject", "Progression Ledger entry draft"),
    ),
  };
  return hasQuantity
    ? deepFreezePocValueV1({
        ...base,
        quantity: parseQuantity(
          dataPropertyV1(entry, "quantity", "Progression Ledger entry draft"),
        ),
      })
    : deepFreezePocValueV1(base);
}

function parsePocProgressionEffectIntentV1(value: unknown): EffectIntentV1 {
  const candidate = exactDataObjectForKindV1(value, "Progression EffectIntent");
  const kind = dataPropertyV1(candidate, "kind", "Progression EffectIntent");
  const reasonAndDelta = (): {
    readonly delta: ReturnType<typeof parseSafeInteger>;
    readonly reasonId: ReturnType<typeof parseReasonId>;
  } => {
    const effect = exactDataObjectV1(
      value,
      ["kind", "delta", "reasonId"],
      "Progression EffectIntent",
    );
    return {
      delta: parseSafeInteger(dataPropertyV1(effect, "delta", "Progression EffectIntent")),
      reasonId: parseReasonId(dataPropertyV1(effect, "reasonId", "Progression EffectIntent")),
    };
  };
  if (
    kind === "calendar.ap.adjust" ||
    kind === "reputation.adjust" ||
    kind === "relationship.affection.adjust" ||
    kind === "relationship.teamwork.adjust"
  ) {
    return deepFreezePocValueV1({ kind, ...reasonAndDelta() });
  }
  if (kind === "actor.stamina.adjust" || kind === "actor.mood.adjust") {
    const effect = exactDataObjectV1(
      value,
      ["kind", "actorId", "delta", "reasonId"],
      "Progression EffectIntent",
    );
    return deepFreezePocValueV1({
      kind,
      actorId: parseActorId(dataPropertyV1(effect, "actorId", "Progression EffectIntent")),
      delta: parseSafeInteger(dataPropertyV1(effect, "delta", "Progression EffectIntent")),
      reasonId: parseReasonId(dataPropertyV1(effect, "reasonId", "Progression EffectIntent")),
    });
  }
  if (kind === "relationship.stage.set") {
    const effect = exactDataObjectV1(
      value,
      ["kind", "stage", "reasonId"],
      "Progression EffectIntent",
    );
    return deepFreezePocValueV1({
      kind,
      stage: parseRelationshipStage(dataPropertyV1(effect, "stage", "Progression EffectIntent")),
      reasonId: parseReasonId(dataPropertyV1(effect, "reasonId", "Progression EffectIntent")),
    });
  }
  if (kind === "tavern.helper.set") {
    const effect = exactDataObjectV1(
      value,
      ["kind", "helper", "reasonId"],
      "Progression EffectIntent",
    );
    const helper = exactDataObjectV1(
      dataPropertyV1(effect, "helper", "Progression EffectIntent"),
      ["unlocked", "tier"],
      "Progression helper value",
    );
    const unlocked = dataPropertyV1(helper, "unlocked", "Progression helper value");
    if (typeof unlocked !== "boolean") throw new TypeError("invalid Progression helper unlocked");
    return deepFreezePocValueV1({
      kind,
      helper: {
        unlocked,
        tier: parseHelperTier(dataPropertyV1(helper, "tier", "Progression helper value")),
      },
      reasonId: parseReasonId(dataPropertyV1(effect, "reasonId", "Progression EffectIntent")),
    });
  }
  if (kind === "inventory.grant") {
    const effect = exactDataObjectV1(
      value,
      ["kind", "lines", "source", "reasonId"],
      "Progression EffectIntent",
    );
    return deepFreezePocValueV1({
      kind,
      lines: parseIngredientLinesV1(dataPropertyV1(effect, "lines", "Progression EffectIntent")),
      source: parseInventorySourceRefV1(
        dataPropertyV1(effect, "source", "Progression EffectIntent"),
      ),
      reasonId: parseReasonId(dataPropertyV1(effect, "reasonId", "Progression EffectIntent")),
    });
  }
  if (kind === "inventory.consume") {
    const effect = exactDataObjectV1(
      value,
      ["kind", "lines", "reasonId"],
      "Progression EffectIntent",
    );
    return deepFreezePocValueV1({
      kind,
      lines: parseIngredientLinesV1(dataPropertyV1(effect, "lines", "Progression EffectIntent")),
      reasonId: parseReasonId(dataPropertyV1(effect, "reasonId", "Progression EffectIntent")),
    });
  }
  if (kind === "inventory.item.grant" || kind === "inventory.item.consume") {
    const effect = exactDataObjectV1(
      value,
      ["kind", "lines", "reasonId"],
      "Progression EffectIntent",
    );
    return deepFreezePocValueV1({
      kind,
      lines: parseItemLinesV1(dataPropertyV1(effect, "lines", "Progression EffectIntent")),
      reasonId: parseReasonId(dataPropertyV1(effect, "reasonId", "Progression EffectIntent")),
    });
  }
  if (kind === "aura.apply") {
    const effect = exactDataObjectV1(
      value,
      ["kind", "auraId", "target", "source", "duration", "reasonId"],
      "Progression EffectIntent",
    );
    return deepFreezePocValueV1({
      kind,
      auraId: parseAuraId(dataPropertyV1(effect, "auraId", "Progression EffectIntent")),
      target: parseAuraTargetV1(dataPropertyV1(effect, "target", "Progression EffectIntent")),
      source: parseAuraSourceRefV1(dataPropertyV1(effect, "source", "Progression EffectIntent")),
      duration: parseAuraDurationV1(dataPropertyV1(effect, "duration", "Progression EffectIntent")),
      reasonId: parseReasonId(dataPropertyV1(effect, "reasonId", "Progression EffectIntent")),
    });
  }
  if (kind === "aura.clear") {
    const effect = exactDataObjectV1(
      value,
      ["kind", "auraId", "target", "reasonId"],
      "Progression EffectIntent",
    );
    return deepFreezePocValueV1({
      kind,
      auraId: parseAuraId(dataPropertyV1(effect, "auraId", "Progression EffectIntent")),
      target: parseAuraTargetV1(dataPropertyV1(effect, "target", "Progression EffectIntent")),
      reasonId: parseReasonId(dataPropertyV1(effect, "reasonId", "Progression EffectIntent")),
    });
  }
  if (kind === "fact.set") {
    const effect = exactDataObjectV1(
      value,
      ["kind", "factId", "value", "reasonId"],
      "Progression EffectIntent",
    );
    return deepFreezePocValueV1({
      kind,
      factId: parseFactId(dataPropertyV1(effect, "factId", "Progression EffectIntent")),
      value: parsePocProgressionStoryValueV1(
        dataPropertyV1(effect, "value", "Progression EffectIntent"),
      ),
      reasonId: parseReasonId(dataPropertyV1(effect, "reasonId", "Progression EffectIntent")),
    });
  }
  if (kind === "quest.set") {
    const effect = exactDataObjectV1(
      value,
      ["kind", "quest", "reasonId"],
      "Progression EffectIntent",
    );
    return deepFreezePocValueV1({
      kind,
      quest: parsePocProgressionQuestEntryV1(
        dataPropertyV1(effect, "quest", "Progression EffectIntent"),
      ),
      reasonId: parseReasonId(dataPropertyV1(effect, "reasonId", "Progression EffectIntent")),
    });
  }
  if (kind === "outcome.set") {
    const effect = exactDataObjectV1(
      value,
      ["kind", "outcomeId", "value", "reasonId"],
      "Progression EffectIntent",
    );
    return deepFreezePocValueV1({
      kind,
      outcomeId: parseOutcomeId(dataPropertyV1(effect, "outcomeId", "Progression EffectIntent")),
      value: parsePocProgressionStoryValueV1(
        dataPropertyV1(effect, "value", "Progression EffectIntent"),
      ),
      reasonId: parseReasonId(dataPropertyV1(effect, "reasonId", "Progression EffectIntent")),
    });
  }
  if (kind === "modifier.add") {
    const effect = exactDataObjectV1(
      value,
      ["kind", "lifetime", "modifier", "reasonId"],
      "Progression EffectIntent",
    );
    const lifetime = dataPropertyV1(effect, "lifetime", "Progression EffectIntent");
    if (lifetime !== "opening_session") throw new TypeError("invalid Modifier lifetime");
    return deepFreezePocValueV1({
      kind,
      lifetime,
      modifier: parsePocProgressionModifierV1(
        dataPropertyV1(effect, "modifier", "Progression EffectIntent"),
      ),
      reasonId: parseReasonId(dataPropertyV1(effect, "reasonId", "Progression EffectIntent")),
    });
  }
  if (kind === "ledger.append") {
    const effect = exactDataObjectV1(value, ["kind", "entry"], "Progression EffectIntent");
    return deepFreezePocValueV1({
      kind,
      entry: parseLedgerEntryDraftV1(dataPropertyV1(effect, "entry", "Progression EffectIntent")),
    });
  }
  throw new TypeError("invalid Progression EffectIntent kind");
}

function parseStoryValueDefinitionV1(value: unknown): StoryValueDefinitionV1 {
  const candidate = exactDataObjectForKindV1(value, "Progression Story value definition");
  const kind = dataPropertyV1(candidate, "kind", "Progression Story value definition");
  if (kind === "boolean") {
    const definition = exactDataObjectV1(
      value,
      ["kind", "defaultValue"],
      "Progression Story value definition",
    );
    const defaultValue = dataPropertyV1(
      definition,
      "defaultValue",
      "Progression Story value definition",
    );
    if (typeof defaultValue !== "boolean") throw new TypeError("invalid boolean Story default");
    return deepFreezePocValueV1({ kind, defaultValue });
  }
  if (kind === "integer") {
    const definition = exactDataObjectV1(
      value,
      ["kind", "defaultValue", "range"],
      "Progression Story value definition",
    );
    const rangeValue = exactDataObjectV1(
      dataPropertyV1(definition, "range", "Progression Story value definition"),
      ["min", "max"],
      "Progression Story integer range",
    );
    const range = deepFreezePocValueV1({
      min: parseSafeInteger(dataPropertyV1(rangeValue, "min", "Progression Story integer range")),
      max: parseSafeInteger(dataPropertyV1(rangeValue, "max", "Progression Story integer range")),
    });
    const defaultValue = parseSafeInteger(
      dataPropertyV1(definition, "defaultValue", "Progression Story value definition"),
    );
    if (range.min > range.max || defaultValue < range.min || defaultValue > range.max) {
      throw new TypeError("Progression Story integer default is outside its definition range");
    }
    return deepFreezePocValueV1({ kind, defaultValue, range });
  }
  if (kind === "token") {
    const definition = exactDataObjectV1(
      value,
      ["kind", "defaultValue", "allowedValues"],
      "Progression Story value definition",
    );
    const defaultValue = parseStoryToken(
      dataPropertyV1(definition, "defaultValue", "Progression Story value definition"),
    );
    const allowedValues = exactDataArrayV1(
      dataPropertyV1(definition, "allowedValues", "Progression Story value definition"),
      "Progression Story allowed tokens",
    ).map(parseStoryToken);
    if (allowedValues.length === 0 || !allowedValues.includes(defaultValue)) {
      throw new TypeError("Progression Story token default is not allowed");
    }
    if (new Set(allowedValues).size !== allowedValues.length) {
      throw new TypeError("duplicate Progression Story allowed token");
    }
    return deepFreezePocValueV1({ kind, defaultValue, allowedValues });
  }
  throw new TypeError("invalid Progression Story value definition kind");
}

function parseFactDefinitionV1(value: unknown): FactDefinitionV1 {
  const definition = exactDataObjectV1(value, ["factId", "value"], "Progression Fact definition");
  return deepFreezePocValueV1({
    factId: parseFactId(dataPropertyV1(definition, "factId", "Progression Fact definition")),
    value: parseStoryValueDefinitionV1(
      dataPropertyV1(definition, "value", "Progression Fact definition"),
    ),
  });
}

function parseQuestDefinitionV1(value: unknown): QuestDefinitionV1 {
  const definition = exactDataObjectV1(
    value,
    ["questId", "initial"],
    "Progression Quest definition",
  );
  const questId = parseQuestId(
    dataPropertyV1(definition, "questId", "Progression Quest definition"),
  );
  const initial = parsePocProgressionQuestEntryV1(
    dataPropertyV1(definition, "initial", "Progression Quest definition"),
  );
  if (initial.questId !== questId) {
    throw new TypeError("Progression Quest definition initial reference does not match QuestId");
  }
  return deepFreezePocValueV1({ questId, initial });
}

function parseOutcomeDefinitionV1(value: unknown): OutcomeDefinitionV1 {
  const definition = exactDataObjectV1(
    value,
    ["outcomeId", "value"],
    "Progression Outcome definition",
  );
  return deepFreezePocValueV1({
    outcomeId: parseOutcomeId(
      dataPropertyV1(definition, "outcomeId", "Progression Outcome definition"),
    ),
    value: parseStoryValueDefinitionV1(
      dataPropertyV1(definition, "value", "Progression Outcome definition"),
    ),
  });
}

function parseCheckDefinitionV1(value: unknown): CheckDefinitionV1 {
  const definition = exactDataObjectV1(
    value,
    ["checkId", "attribute", "dice", "bands"],
    "Progression Check definition",
  );
  const dice = dataPropertyV1(definition, "dice", "Progression Check definition");
  if (dice !== "2d6") throw new TypeError("Progression Check definition must use 2d6");
  const bands = exactDataArrayV1(
    dataPropertyV1(definition, "bands", "Progression Check definition"),
    "Progression Check bands",
  ).map((bandValue) => {
    const band = exactDataObjectV1(
      bandValue,
      ["bandId", "minInclusive", "maxInclusive", "effects"],
      "Progression Check band",
    );
    const minInclusive = parseSafeInteger(
      dataPropertyV1(band, "minInclusive", "Progression Check band"),
    );
    const maximumValue = dataPropertyV1(band, "maxInclusive", "Progression Check band");
    const maxInclusive = maximumValue === null ? null : parseSafeInteger(maximumValue);
    if (maxInclusive !== null && maxInclusive < minInclusive) {
      throw new TypeError("Progression Check band maximum is below its minimum");
    }
    return deepFreezePocValueV1({
      bandId: parseCheckBandId(dataPropertyV1(band, "bandId", "Progression Check band")),
      minInclusive,
      maxInclusive,
      effects: exactDataArrayV1(
        dataPropertyV1(band, "effects", "Progression Check band"),
        "Progression Check band effects",
      ).map(parsePocProgressionEffectIntentV1),
    });
  });
  if (bands.length === 0) throw new TypeError("Progression Check requires at least one band");
  const bandIds = new Set<string>();
  bands.forEach((band, index) => {
    if (bandIds.has(band.bandId)) throw new TypeError("duplicate Progression CheckBandId");
    bandIds.add(band.bandId);
    if (index === 0) return;
    const previous = bands[index - 1];
    if (
      previous === undefined ||
      previous.maxInclusive === null ||
      previous.maxInclusive === Number.MAX_SAFE_INTEGER ||
      band.minInclusive !== previous.maxInclusive + 1
    ) {
      throw new TypeError("Progression Check bands must be continuous and non-overlapping");
    }
  });
  return deepFreezePocValueV1({
    checkId: parseCheckId(dataPropertyV1(definition, "checkId", "Progression Check definition")),
    attribute: parseAttributeId(
      dataPropertyV1(definition, "attribute", "Progression Check definition"),
    ),
    dice,
    bands,
  });
}

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

function parseCommandKindV1(value: unknown): PocGameCommandV1["kind"] {
  if (
    typeof value !== "string" ||
    !pocGameCommandKindsV1.includes(value as PocGameCommandV1["kind"])
  ) {
    throw new TypeError("invalid Progression command kind");
  }
  return value as PocGameCommandV1["kind"];
}

function parseDebugCommandKindV1(value: unknown): PocDebugCommandV1["kind"] {
  if (
    typeof value !== "string" ||
    !pocDebugCommandKindsV1.includes(value as PocDebugCommandV1["kind"])
  ) {
    throw new TypeError("invalid Progression debug command kind");
  }
  return value as PocDebugCommandV1["kind"];
}

export function parsePocProgressionChangeReasonV1(value: unknown): ChangeReasonV1 {
  const candidate = exactDataObjectForKindV1(value, "Progression change reason");
  const kind = dataPropertyV1(candidate, "kind", "Progression change reason");
  if (kind === "command" || kind === "debug") {
    const reason = exactDataObjectV1(
      value,
      ["kind", "commandKind", "reasonId"],
      "Progression change reason",
    );
    const reasonId = parseReasonId(dataPropertyV1(reason, "reasonId", "Progression change reason"));
    return kind === "command"
      ? deepFreezePocValueV1({
          kind,
          commandKind: parseCommandKindV1(
            dataPropertyV1(reason, "commandKind", "Progression change reason"),
          ),
          reasonId,
        })
      : deepFreezePocValueV1({
          kind,
          commandKind: parseDebugCommandKindV1(
            dataPropertyV1(reason, "commandKind", "Progression change reason"),
          ),
          reasonId,
        });
  }
  const referenceKeys = {
    event: ["eventId", parseEventId],
    story_action: ["actionId", parseActionId],
    world_action: ["actionId", parseActionId],
    aura: ["auraId", parseAuraId],
    facility: ["facilityId", parseFacilityId],
    ending: ["endingId", parseEndingId],
  } as const;
  if (!(typeof kind === "string" && kind in referenceKeys)) {
    throw new TypeError("invalid Progression change reason kind");
  }
  const [referenceKey, parser] = referenceKeys[kind as keyof typeof referenceKeys];
  const reason = exactDataObjectV1(
    value,
    ["kind", referenceKey, "reasonId"],
    "Progression change reason",
  );
  const reference = parser(dataPropertyV1(reason, referenceKey, "Progression change reason"));
  const reasonId = parseReasonId(dataPropertyV1(reason, "reasonId", "Progression change reason"));
  switch (kind) {
    case "event":
      return deepFreezePocValueV1({
        kind,
        eventId: reference as ReturnType<typeof parseEventId>,
        reasonId,
      });
    case "story_action":
    case "world_action":
      return deepFreezePocValueV1({
        kind,
        actionId: reference as ReturnType<typeof parseActionId>,
        reasonId,
      });
    case "aura":
      return deepFreezePocValueV1({
        kind,
        auraId: reference as ReturnType<typeof parseAuraId>,
        reasonId,
      });
    case "facility":
      return deepFreezePocValueV1({
        kind,
        facilityId: reference as ReturnType<typeof parseFacilityId>,
        reasonId,
      });
    case "ending":
      return deepFreezePocValueV1({
        kind,
        endingId: reference as ReturnType<typeof parseEndingId>,
        reasonId,
      });
  }
  throw new TypeError("invalid Progression change reason");
}

export function parsePocProgressionCheckResultV1(value: unknown): CheckResultV1 {
  const result = exactDataObjectV1(
    value,
    [
      "checkId",
      "actorId",
      "dice",
      "attributeBonus",
      "preparationBonus",
      "modifiers",
      "totalBonus",
      "total",
      "bandId",
      "effects",
    ],
    "Progression Check result",
  );
  const dice = exactDataArrayV1(
    dataPropertyV1(result, "dice", "Progression Check result"),
    "Progression Check dice",
  );
  if (dice.length !== 2) throw new TypeError("Progression Check requires exactly two dice");
  const first = dice[0];
  const second = dice[1];
  return deepFreezePocValueV1({
    checkId: parseCheckId(dataPropertyV1(result, "checkId", "Progression Check result")),
    actorId: parseActorId(dataPropertyV1(result, "actorId", "Progression Check result")),
    dice: [parseDieFace(first), parseDieFace(second)],
    attributeBonus: parseAttributeBonus(
      dataPropertyV1(result, "attributeBonus", "Progression Check result"),
    ),
    preparationBonus: parseSafeInteger(
      dataPropertyV1(result, "preparationBonus", "Progression Check result"),
    ),
    modifiers: exactDataArrayV1(
      dataPropertyV1(result, "modifiers", "Progression Check result"),
      "Progression Check modifiers",
    ).map(parseAppliedModifierV1),
    totalBonus: parseSafeInteger(dataPropertyV1(result, "totalBonus", "Progression Check result")),
    total: parseSafeInteger(dataPropertyV1(result, "total", "Progression Check result")),
    bandId: parseCheckBandId(dataPropertyV1(result, "bandId", "Progression Check result")),
    effects: exactDataArrayV1(
      dataPropertyV1(result, "effects", "Progression Check result"),
      "Progression Check effects",
    ).map(parsePocProgressionEffectIntentV1),
  });
}

export function parsePocProgressionResolvedCheckV1(value: unknown): ResolvedCheckV1 {
  const check = exactDataObjectV1(
    value,
    [
      "checkId",
      "actorId",
      "dice",
      "attributeBonus",
      "preparationBonus",
      "modifiers",
      "totalBonus",
      "total",
      "bandId",
      "resolvedAtSequence",
    ],
    "Progression resolved Check",
  );
  const dice = exactDataArrayV1(
    dataPropertyV1(check, "dice", "Progression resolved Check"),
    "Progression resolved Check dice",
  );
  if (dice.length !== 2) throw new TypeError("Progression resolved Check requires two dice");
  return deepFreezePocValueV1({
    checkId: parseCheckId(dataPropertyV1(check, "checkId", "Progression resolved Check")),
    actorId: parseActorId(dataPropertyV1(check, "actorId", "Progression resolved Check")),
    dice: [parseDieFace(dice[0]), parseDieFace(dice[1])],
    attributeBonus: parseAttributeBonus(
      dataPropertyV1(check, "attributeBonus", "Progression resolved Check"),
    ),
    preparationBonus: parseSafeInteger(
      dataPropertyV1(check, "preparationBonus", "Progression resolved Check"),
    ),
    modifiers: exactDataArrayV1(
      dataPropertyV1(check, "modifiers", "Progression resolved Check"),
      "Progression resolved Check modifiers",
    ).map(parseAppliedModifierV1),
    totalBonus: parseSafeInteger(dataPropertyV1(check, "totalBonus", "Progression resolved Check")),
    total: parseSafeInteger(dataPropertyV1(check, "total", "Progression resolved Check")),
    bandId: parseCheckBandId(dataPropertyV1(check, "bandId", "Progression resolved Check")),
    resolvedAtSequence: parsePositiveSafeInteger(
      dataPropertyV1(check, "resolvedAtSequence", "Progression resolved Check"),
    ),
  });
}

function checkedSafeAddV1(left: number, right: number, label: string): number {
  const result = left + right;
  if (!Number.isSafeInteger(result) || Object.is(result, -0)) {
    throw new TypeError(`${label} exceeds safe integer bounds`);
  }
  return result;
}

type CheckFormulaValueV1 = Pick<
  ResolvedCheckV1,
  "checkId" | "dice" | "attributeBonus" | "preparationBonus" | "modifiers" | "totalBonus" | "total"
>;

export function assertPocProgressionCheckFormulaV1(check: CheckFormulaValueV1): void {
  let totalBonus = checkedSafeAddV1(
    check.attributeBonus,
    check.preparationBonus,
    "Progression Check totalBonus",
  );
  for (const applied of check.modifiers) {
    if (
      applied.modifier.kind !== "check.add" ||
      applied.modifier.checkId !== check.checkId ||
      applied.contribution !== applied.modifier.amount
    ) {
      throw new TypeError("Progression Check has an invalid Modifier reference or contribution");
    }
    totalBonus = checkedSafeAddV1(totalBonus, applied.contribution, "Progression Check totalBonus");
  }
  const diceTotal = checkedSafeAddV1(check.dice[0], check.dice[1], "Progression Check dice");
  const total = checkedSafeAddV1(diceTotal, totalBonus, "Progression Check total");
  if (check.totalBonus !== totalBonus || check.total !== total) {
    throw new TypeError("Progression Check result violates the 2d6+bonuses formula");
  }
}

export function assertPocProgressionCheckResultV1(
  definition: CheckDefinitionV1,
  result: CheckResultV1,
): void {
  if (result.checkId !== definition.checkId) {
    throw new TypeError("Progression Check result reference does not match its definition");
  }
  assertPocProgressionCheckFormulaV1(result);
  const band = definition.bands.find(({ bandId }) => bandId === result.bandId);
  if (
    band === undefined ||
    result.total < band.minInclusive ||
    (band.maxInclusive !== null && result.total > band.maxInclusive)
  ) {
    throw new TypeError("Progression Check result does not match its outcome band");
  }
  if (!canonicalValuesEqualV1(result.effects, band.effects)) {
    throw new TypeError("Progression Check result effects do not match its outcome band");
  }
}

export interface PocProgressionStateV1 {
  readonly facts: readonly FactEntryV1[];
  readonly quests: readonly QuestEntryV1[];
  readonly outcomes: readonly OutcomeEntryV1[];
  readonly resolvedChecks: readonly ResolvedCheckV1[];
}

export function parsePocProgressionStateV1(value: unknown): PocProgressionStateV1 {
  const state = exactDataObjectV1(
    value,
    ["facts", "quests", "outcomes", "resolvedChecks"],
    "Progression State",
  );
  return deepFreezePocValueV1({
    facts: exactDataArrayV1(
      dataPropertyV1(state, "facts", "Progression State"),
      "Progression Facts",
    ).map(parsePocProgressionFactEntryV1),
    quests: exactDataArrayV1(
      dataPropertyV1(state, "quests", "Progression State"),
      "Progression Quests",
    ).map(parsePocProgressionQuestEntryV1),
    outcomes: exactDataArrayV1(
      dataPropertyV1(state, "outcomes", "Progression State"),
      "Progression Outcomes",
    ).map(parsePocProgressionOutcomeEntryV1),
    resolvedChecks: exactDataArrayV1(
      dataPropertyV1(state, "resolvedChecks", "Progression State"),
      "Progression resolved Checks",
    ).map(parsePocProgressionResolvedCheckV1),
  });
}

export const pocProgressionStateSchemaV1: RuntimeSchemaV1<PocProgressionStateV1> = Object.freeze({
  parse: parsePocProgressionStateV1,
});

export type PocProgressionReadPortV1 = PocProgressionStateV1;

export type PocProgressionInvariantViolationV1 =
  | {
      readonly code: "collection.duplicate_id" | "collection.unstable_order";
      readonly details: { readonly collection: string; readonly id: string };
    }
  | {
      readonly code: "snapshot.schema";
      readonly details: { readonly collection: string; readonly id: string };
    };

const noProgressionInvariantViolationsV1: readonly PocProgressionInvariantViolationV1[] =
  Object.freeze([]);

function checkStableIdCollectionV1(
  entries: readonly { readonly id: string }[],
  collection: string,
  violations: PocProgressionInvariantViolationV1[],
): void {
  const ids = new Set<string>();
  let previous: string | null = null;
  for (const { id } of entries) {
    if (ids.has(id)) {
      violations.push({
        code: "collection.duplicate_id",
        details: { collection, id },
      });
    } else if (previous !== null && compareStableIdsV1(previous, id) >= 0) {
      violations.push({
        code: "collection.unstable_order",
        details: { collection, id },
      });
    }
    ids.add(id);
    previous = id;
  }
}

export const pocProgressionInvariantV1 = Object.freeze({
  check(
    stateValue: DeepReadonly<PocProgressionStateV1>,
    _readPort: PocProgressionReadPortV1,
  ): readonly PocProgressionInvariantViolationV1[] {
    const state = pocProgressionStateSchemaV1.parse(stateValue);
    const violations: PocProgressionInvariantViolationV1[] = [];
    checkStableIdCollectionV1(
      state.facts.map(({ factId }) => ({ id: factId })),
      "progression.facts.factId",
      violations,
    );
    checkStableIdCollectionV1(
      state.quests.map(({ questId }) => ({ id: questId })),
      "progression.quests.questId",
      violations,
    );
    checkStableIdCollectionV1(
      state.outcomes.map(({ outcomeId }) => ({ id: outcomeId })),
      "progression.outcomes.outcomeId",
      violations,
    );
    const checkIds = new Set<string>();
    let previousSequence = 0;
    for (const check of state.resolvedChecks) {
      if (checkIds.has(check.checkId)) {
        violations.push({
          code: "collection.duplicate_id",
          details: { collection: "progression.resolvedChecks.checkId", id: check.checkId },
        });
      }
      checkIds.add(check.checkId);
      if (check.resolvedAtSequence <= previousSequence) {
        violations.push({
          code: "collection.unstable_order",
          details: {
            collection: "progression.resolvedChecks.resolvedAtSequence",
            id: check.checkId,
          },
        });
      }
      previousSequence = check.resolvedAtSequence;
      try {
        assertPocProgressionCheckFormulaV1(check);
      } catch {
        violations.push({
          code: "snapshot.schema",
          details: { collection: "progression.resolvedChecks.formula", id: check.checkId },
        });
      }
    }
    return violations.length === 0
      ? noProgressionInvariantViolationsV1
      : deepFreezePocValueV1(violations);
  },
});

export function assertValidPocProgressionStateV1(
  stateValue: DeepReadonly<PocProgressionStateV1>,
  label: string,
): void {
  const state = pocProgressionStateSchemaV1.parse(stateValue);
  if (pocProgressionInvariantV1.check(state, state).length !== 0) {
    throw new TypeError(`${label} violates Progression invariants`);
  }
}

export function assertValidInitialPocProgressionStateV1(
  stateValue: DeepReadonly<PocProgressionStateV1>,
): void {
  const state = pocProgressionStateSchemaV1.parse(stateValue);
  assertValidPocProgressionStateV1(state, "initial Progression State");
  if (state.resolvedChecks.length !== 0) {
    throw new TypeError("initial Progression State must have no resolved Checks");
  }
}

export function pocProgressionStatesEqualV1(
  left: PocProgressionStateV1,
  right: PocProgressionStateV1,
): boolean {
  return canonicalValuesEqualV1(left, right);
}

export type PocProgressionOwnerOperationV1 =
  | { readonly kind: "progression.fact.set"; readonly entry: FactEntryV1 }
  | { readonly kind: "progression.quest.set"; readonly entry: QuestEntryV1 }
  | { readonly kind: "progression.outcome.set"; readonly entry: OutcomeEntryV1 }
  | { readonly kind: "progression.check.record"; readonly check: ResolvedCheckV1 };

function parsePocProgressionOwnerOperationV1(value: unknown): PocProgressionOwnerOperationV1 {
  const candidate = exactDataObjectForKindV1(value, "Progression owner operation");
  const kind = dataPropertyV1(candidate, "kind", "Progression owner operation");
  if (kind === "progression.fact.set") {
    const operation = exactDataObjectV1(value, ["kind", "entry"], "Progression owner operation");
    return deepFreezePocValueV1({
      kind,
      entry: parsePocProgressionFactEntryV1(
        dataPropertyV1(operation, "entry", "Progression owner operation"),
      ),
    });
  }
  if (kind === "progression.quest.set") {
    const operation = exactDataObjectV1(value, ["kind", "entry"], "Progression owner operation");
    return deepFreezePocValueV1({
      kind,
      entry: parsePocProgressionQuestEntryV1(
        dataPropertyV1(operation, "entry", "Progression owner operation"),
      ),
    });
  }
  if (kind === "progression.outcome.set") {
    const operation = exactDataObjectV1(value, ["kind", "entry"], "Progression owner operation");
    return deepFreezePocValueV1({
      kind,
      entry: parsePocProgressionOutcomeEntryV1(
        dataPropertyV1(operation, "entry", "Progression owner operation"),
      ),
    });
  }
  if (kind === "progression.check.record") {
    const operation = exactDataObjectV1(value, ["kind", "check"], "Progression owner operation");
    return deepFreezePocValueV1({
      kind,
      check: parsePocProgressionResolvedCheckV1(
        dataPropertyV1(operation, "check", "Progression owner operation"),
      ),
    });
  }
  throw new TypeError("invalid Progression owner operation kind");
}

export const pocProgressionOwnerOperationSchemaV1: RuntimeSchemaV1<PocProgressionOwnerOperationV1> =
  Object.freeze({ parse: parsePocProgressionOwnerOperationV1 });

export interface PocProgressionFactSetDependenciesV1 {
  readonly kind: "progression.fact.set";
  readonly definition: FactDefinitionV1;
  readonly reason: ChangeReasonV1;
}

export interface PocProgressionQuestSetDependenciesV1 {
  readonly kind: "progression.quest.set";
  readonly definition: QuestDefinitionV1;
  readonly reason: ChangeReasonV1;
}

export interface PocProgressionOutcomeSetDependenciesV1 {
  readonly kind: "progression.outcome.set";
  readonly definition: OutcomeDefinitionV1;
  readonly reason: ChangeReasonV1;
}

export interface PocProgressionCheckRecordDependenciesV1 {
  readonly kind: "progression.check.record";
  readonly definition: CheckDefinitionV1;
  readonly result: CheckResultV1;
  readonly commandSequence: PositiveSafeInteger;
}

export type PocProgressionDependencyPortsV1 =
  | PocProgressionFactSetDependenciesV1
  | PocProgressionQuestSetDependenciesV1
  | PocProgressionOutcomeSetDependenciesV1
  | PocProgressionCheckRecordDependenciesV1;

function parsePocProgressionDependencyPortsV1(value: unknown): PocProgressionDependencyPortsV1 {
  const candidate = exactDataObjectForKindV1(value, "Progression dependency ports");
  const kind = dataPropertyV1(candidate, "kind", "Progression dependency ports");
  if (kind === "progression.fact.set") {
    const dependencies = exactDataObjectV1(
      value,
      ["kind", "definition", "reason"],
      "Progression dependency ports",
    );
    return deepFreezePocValueV1({
      kind,
      definition: parseFactDefinitionV1(
        dataPropertyV1(dependencies, "definition", "Progression dependency ports"),
      ),
      reason: parsePocProgressionChangeReasonV1(
        dataPropertyV1(dependencies, "reason", "Progression dependency ports"),
      ),
    });
  }
  if (kind === "progression.quest.set") {
    const dependencies = exactDataObjectV1(
      value,
      ["kind", "definition", "reason"],
      "Progression dependency ports",
    );
    return deepFreezePocValueV1({
      kind,
      definition: parseQuestDefinitionV1(
        dataPropertyV1(dependencies, "definition", "Progression dependency ports"),
      ),
      reason: parsePocProgressionChangeReasonV1(
        dataPropertyV1(dependencies, "reason", "Progression dependency ports"),
      ),
    });
  }
  if (kind === "progression.outcome.set") {
    const dependencies = exactDataObjectV1(
      value,
      ["kind", "definition", "reason"],
      "Progression dependency ports",
    );
    return deepFreezePocValueV1({
      kind,
      definition: parseOutcomeDefinitionV1(
        dataPropertyV1(dependencies, "definition", "Progression dependency ports"),
      ),
      reason: parsePocProgressionChangeReasonV1(
        dataPropertyV1(dependencies, "reason", "Progression dependency ports"),
      ),
    });
  }
  if (kind === "progression.check.record") {
    const dependencies = exactDataObjectV1(
      value,
      ["kind", "definition", "result", "commandSequence"],
      "Progression dependency ports",
    );
    const definition = parseCheckDefinitionV1(
      dataPropertyV1(dependencies, "definition", "Progression dependency ports"),
    );
    const result = parsePocProgressionCheckResultV1(
      dataPropertyV1(dependencies, "result", "Progression dependency ports"),
    );
    assertPocProgressionCheckResultV1(definition, result);
    return deepFreezePocValueV1({
      kind,
      definition,
      result,
      commandSequence: parsePositiveSafeInteger(
        dataPropertyV1(dependencies, "commandSequence", "Progression dependency ports"),
      ),
    });
  }
  throw new TypeError("invalid Progression dependency ports kind");
}

export const pocProgressionDependencyPortsSchemaV1: RuntimeSchemaV1<PocProgressionDependencyPortsV1> =
  Object.freeze({ parse: parsePocProgressionDependencyPortsV1 });

export function assertPocProgressionStoryValueMatchesDefinitionV1(
  value: StoryValueV1,
  definition: StoryValueDefinitionV1,
  label: string,
): void {
  if (value.kind !== definition.kind) {
    throw new TypeError(`${label} kind does not match its definition`);
  }
  if (
    value.kind === "integer" &&
    definition.kind === "integer" &&
    (value.value < definition.range.min || value.value > definition.range.max)
  ) {
    throw new TypeError(`${label} integer value is outside its definition range`);
  }
  if (
    value.kind === "token" &&
    definition.kind === "token" &&
    !definition.allowedValues.includes(value.value)
  ) {
    throw new TypeError(`${label} token value is not allowed by its definition`);
  }
}

export function assertPocProgressionFactEntryMatchesDefinitionV1(
  entry: FactEntryV1,
  definition: FactDefinitionV1,
): void {
  if (entry.factId !== definition.factId) {
    throw new TypeError("Progression Fact reference does not match its definition");
  }
  assertPocProgressionStoryValueMatchesDefinitionV1(
    entry.value,
    definition.value,
    "Progression Fact value",
  );
}

export function assertPocProgressionQuestEntryMatchesDefinitionV1(
  entry: QuestEntryV1,
  definition: QuestDefinitionV1,
): void {
  if (entry.questId !== definition.questId) {
    throw new TypeError("Progression Quest reference does not match its definition");
  }
}

export function assertPocProgressionOutcomeEntryMatchesDefinitionV1(
  entry: OutcomeEntryV1,
  definition: OutcomeDefinitionV1,
): void {
  if (entry.outcomeId !== definition.outcomeId) {
    throw new TypeError("Progression Outcome reference does not match its definition");
  }
  assertPocProgressionStoryValueMatchesDefinitionV1(
    entry.value,
    definition.value,
    "Progression Outcome value",
  );
}

export type PocProgressionGameplayFactV1 = Extract<
  PocGameplayFactV1,
  {
    readonly kind: "fact.set" | "quest.updated" | "outcome.set" | "check.resolved";
  }
>;

function parsePocProgressionGameplayFactV1(value: unknown): PocProgressionGameplayFactV1 {
  const candidate = exactDataObjectForKindV1(value, "Progression GameplayFact");
  const kind = dataPropertyV1(candidate, "kind", "Progression GameplayFact");
  if (kind === "fact.set") {
    const fact = exactDataObjectV1(
      value,
      ["kind", "factId", "value", "reason"],
      "Progression GameplayFact",
    );
    return deepFreezePocValueV1({
      kind,
      factId: parseFactId(dataPropertyV1(fact, "factId", "Progression GameplayFact")),
      value: parsePocProgressionStoryValueV1(
        dataPropertyV1(fact, "value", "Progression GameplayFact"),
      ),
      reason: parsePocProgressionChangeReasonV1(
        dataPropertyV1(fact, "reason", "Progression GameplayFact"),
      ),
    });
  }
  if (kind === "quest.updated") {
    const fact = exactDataObjectV1(value, ["kind", "quest", "reason"], "Progression GameplayFact");
    return deepFreezePocValueV1({
      kind,
      quest: parsePocProgressionQuestEntryV1(
        dataPropertyV1(fact, "quest", "Progression GameplayFact"),
      ),
      reason: parsePocProgressionChangeReasonV1(
        dataPropertyV1(fact, "reason", "Progression GameplayFact"),
      ),
    });
  }
  if (kind === "outcome.set") {
    const fact = exactDataObjectV1(
      value,
      ["kind", "outcomeId", "value", "reason"],
      "Progression GameplayFact",
    );
    return deepFreezePocValueV1({
      kind,
      outcomeId: parseOutcomeId(dataPropertyV1(fact, "outcomeId", "Progression GameplayFact")),
      value: parsePocProgressionStoryValueV1(
        dataPropertyV1(fact, "value", "Progression GameplayFact"),
      ),
      reason: parsePocProgressionChangeReasonV1(
        dataPropertyV1(fact, "reason", "Progression GameplayFact"),
      ),
    });
  }
  if (kind === "check.resolved") {
    const fact = exactDataObjectV1(value, ["kind", "result"], "Progression GameplayFact");
    const result = parsePocProgressionCheckResultV1(
      dataPropertyV1(fact, "result", "Progression GameplayFact"),
    );
    assertPocProgressionCheckFormulaV1(result);
    return deepFreezePocValueV1({ kind, result });
  }
  throw new TypeError("invalid Progression GameplayFact kind");
}

export interface PocProgressionOwnerProposalPayloadV1 {
  readonly kind: PocProgressionOwnerOperationV1["kind"];
  readonly before: PocProgressionStateV1;
  readonly after: PocProgressionStateV1;
}

export type PocProgressionOwnerProposalV1 = ModuleOwnerProposalEnvelopeV1<
  PocProgressionOwnerProposalPayloadV1,
  PocProgressionGameplayFactV1
>;

export function createPocProgressionResolvedCheckV1(
  result: CheckResultV1,
  resolvedAtSequence: PositiveSafeInteger,
): ResolvedCheckV1 {
  return parsePocProgressionResolvedCheckV1({
    checkId: result.checkId,
    actorId: result.actorId,
    dice: result.dice,
    attributeBonus: result.attributeBonus,
    preparationBonus: result.preparationBonus,
    modifiers: result.modifiers,
    totalBonus: result.totalBonus,
    total: result.total,
    bandId: result.bandId,
    resolvedAtSequence,
  });
}

function replaceFactFromGameplayFactV1(
  before: PocProgressionStateV1,
  fact: Extract<PocProgressionGameplayFactV1, { readonly kind: "fact.set" }>,
): PocProgressionStateV1 {
  if (!before.facts.some(({ factId }) => factId === fact.factId)) {
    throw new TypeError("Progression Fact proposal references a missing Fact");
  }
  return pocProgressionStateSchemaV1.parse({
    ...before,
    facts: before.facts.map((entry) =>
      entry.factId === fact.factId ? { factId: fact.factId, value: fact.value } : entry,
    ),
  });
}

function replaceQuestFromGameplayFactV1(
  before: PocProgressionStateV1,
  fact: Extract<PocProgressionGameplayFactV1, { readonly kind: "quest.updated" }>,
): PocProgressionStateV1 {
  if (!before.quests.some(({ questId }) => questId === fact.quest.questId)) {
    throw new TypeError("Progression Quest proposal references a missing Quest");
  }
  return pocProgressionStateSchemaV1.parse({
    ...before,
    quests: before.quests.map((entry) =>
      entry.questId === fact.quest.questId ? fact.quest : entry,
    ),
  });
}

function replaceOutcomeFromGameplayFactV1(
  before: PocProgressionStateV1,
  fact: Extract<PocProgressionGameplayFactV1, { readonly kind: "outcome.set" }>,
): PocProgressionStateV1 {
  if (!before.outcomes.some(({ outcomeId }) => outcomeId === fact.outcomeId)) {
    throw new TypeError("Progression Outcome proposal references a missing Outcome");
  }
  return pocProgressionStateSchemaV1.parse({
    ...before,
    outcomes: before.outcomes.map((entry) =>
      entry.outcomeId === fact.outcomeId ? { outcomeId: fact.outcomeId, value: fact.value } : entry,
    ),
  });
}

function assertPocProgressionProposalConsistencyV1(proposal: PocProgressionOwnerProposalV1): void {
  const { after, before, kind } = proposal.payload;
  assertValidPocProgressionStateV1(before, "Progression proposal before State");
  assertValidPocProgressionStateV1(after, "Progression proposal after State");
  const [fact] = proposal.facts;
  if (proposal.facts.length !== 1 || fact === undefined) {
    throw new TypeError("Progression proposal requires one exact GameplayFact");
  }
  let expected: PocProgressionStateV1;
  if (kind === "progression.fact.set" && fact.kind === "fact.set") {
    expected = replaceFactFromGameplayFactV1(before, fact);
  } else if (kind === "progression.quest.set" && fact.kind === "quest.updated") {
    expected = replaceQuestFromGameplayFactV1(before, fact);
  } else if (kind === "progression.outcome.set" && fact.kind === "outcome.set") {
    expected = replaceOutcomeFromGameplayFactV1(before, fact);
  } else if (kind === "progression.check.record" && fact.kind === "check.resolved") {
    if (after.resolvedChecks.length !== before.resolvedChecks.length + 1) {
      throw new TypeError("Progression Check proposal must append exactly one resolved Check");
    }
    const appended = after.resolvedChecks.at(-1);
    if (appended === undefined) throw new TypeError("missing appended Progression Check");
    const expectedResolved = createPocProgressionResolvedCheckV1(
      fact.result,
      appended.resolvedAtSequence,
    );
    if (!canonicalValuesEqualV1(appended, expectedResolved)) {
      throw new TypeError("Progression Check proposal result does not match appended State");
    }
    expected = pocProgressionStateSchemaV1.parse({
      ...before,
      resolvedChecks: [...before.resolvedChecks, expectedResolved],
    });
  } else {
    throw new TypeError("Progression proposal kind does not match its GameplayFact");
  }
  if (!pocProgressionStatesEqualV1(after, expected)) {
    throw new TypeError("Progression proposal State transition is inconsistent");
  }
}

export const pocProgressionOwnerProposalSchemaV1: RuntimeSchemaV1<PocProgressionOwnerProposalV1> =
  Object.freeze({
    parse(value: unknown): PocProgressionOwnerProposalV1 {
      const proposal = exactDataObjectV1(value, ["payload", "facts"], "Progression owner proposal");
      const payload = exactDataObjectV1(
        dataPropertyV1(proposal, "payload", "Progression owner proposal"),
        ["kind", "before", "after"],
        "Progression owner proposal payload",
      );
      const kind = dataPropertyV1(payload, "kind", "Progression owner proposal payload");
      if (
        kind !== "progression.fact.set" &&
        kind !== "progression.quest.set" &&
        kind !== "progression.outcome.set" &&
        kind !== "progression.check.record"
      ) {
        throw new TypeError("invalid Progression owner proposal kind");
      }
      const parsed = deepFreezePocValueV1({
        payload: {
          kind,
          before: pocProgressionStateSchemaV1.parse(
            dataPropertyV1(payload, "before", "Progression owner proposal payload"),
          ),
          after: pocProgressionStateSchemaV1.parse(
            dataPropertyV1(payload, "after", "Progression owner proposal payload"),
          ),
        },
        facts: exactDataArrayV1(
          dataPropertyV1(proposal, "facts", "Progression owner proposal"),
          "Progression owner proposal Facts",
        ).map(parsePocProgressionGameplayFactV1),
      }) satisfies PocProgressionOwnerProposalV1;
      assertPocProgressionProposalConsistencyV1(parsed);
      return parsed;
    },
  });
