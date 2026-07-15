// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  parseActionId,
  parseActorId,
  parseAuraId,
  parseAuraInstanceId,
  parseEventId,
  parseFacilityId,
  parseFactId,
  parseOutcomeId,
  parseQuestId,
  parseReasonId,
  parseRelationshipStage,
  parseStoryToken,
} from "../contracts/ids.js";
import { pocSimulationDataSchemaV1 } from "../contracts/schemas.js";
import type {
  AuraDurationV1,
  AuraInstanceV1,
  AuraSourceRefV1,
  AuraTargetV1,
  EndingInputV1,
  EndingResultV1,
  FactEntryV1,
  OutcomeEntryV1,
  PocRulesV1,
  PocSimulationDataV1,
  ProgressionEffectIntentV1,
  QuestEntryV1,
  RelationshipStateV1,
  StoryValueV1,
} from "../contracts/types.js";
import {
  deepFreezePocValueV1,
  parseMoney,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseSafeInteger,
} from "../contracts/values.js";
import type { DeepReadonly } from "../contracts/values.js";

type PlainDataRecordV1 = Record<string, unknown>;
type TerminalStatusV1 = EndingResultV1["status"];

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
    throw new TypeError(`missing ${label} field ${key}`);
  }
  return descriptor.value;
}

function exactDataArrayV1(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`invalid ${label}`);
  }
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== value.length + 1 ||
    keys[value.length] !== "length" ||
    keys.slice(0, value.length).some((key, index) => key !== String(index))
  ) {
    throw new TypeError(`invalid ${label} fields`);
  }
  const parsed: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
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

function parseStoryValueV1(value: unknown): StoryValueV1 {
  const parsed = exactDataObjectV1(value, ["kind", "value"], "Ending Story value");
  const kind = dataPropertyV1(parsed, "kind", "Ending Story value");
  const innerValue = dataPropertyV1(parsed, "value", "Ending Story value");
  if (kind === "boolean") {
    if (typeof innerValue !== "boolean") throw new TypeError("invalid Ending boolean value");
    return deepFreezePocValueV1({ kind, value: innerValue });
  }
  if (kind === "integer") {
    return deepFreezePocValueV1({ kind, value: parseSafeInteger(innerValue) });
  }
  if (kind === "token") {
    return deepFreezePocValueV1({ kind, value: parseStoryToken(innerValue) });
  }
  throw new TypeError("invalid Ending Story value kind");
}

function parseFactEntryV1(value: unknown): FactEntryV1 {
  const parsed = exactDataObjectV1(value, ["factId", "value"], "Ending Fact entry");
  return deepFreezePocValueV1({
    factId: parseFactId(dataPropertyV1(parsed, "factId", "Ending Fact entry")),
    value: parseStoryValueV1(dataPropertyV1(parsed, "value", "Ending Fact entry")),
  });
}

function parseQuestEntryV1(value: unknown): QuestEntryV1 {
  const parsed = exactDataObjectV1(
    value,
    ["questId", "status", "progress", "target"],
    "Ending Quest entry",
  );
  const status = dataPropertyV1(parsed, "status", "Ending Quest entry");
  if (status !== "locked" && status !== "active" && status !== "completed" && status !== "failed") {
    throw new TypeError("invalid Ending Quest status");
  }
  return deepFreezePocValueV1({
    questId: parseQuestId(dataPropertyV1(parsed, "questId", "Ending Quest entry")),
    status,
    progress: parseNonNegativeSafeInteger(dataPropertyV1(parsed, "progress", "Ending Quest entry")),
    target: parsePositiveSafeInteger(dataPropertyV1(parsed, "target", "Ending Quest entry")),
  });
}

function parseOutcomeEntryV1(value: unknown): OutcomeEntryV1 {
  const parsed = exactDataObjectV1(value, ["outcomeId", "value"], "Ending Outcome entry");
  return deepFreezePocValueV1({
    outcomeId: parseOutcomeId(dataPropertyV1(parsed, "outcomeId", "Ending Outcome entry")),
    value: parseStoryValueV1(dataPropertyV1(parsed, "value", "Ending Outcome entry")),
  });
}

function parseRelationshipV1(value: unknown): RelationshipStateV1 {
  const parsed = exactDataObjectV1(
    value,
    ["affection", "teamwork", "stage"],
    "Ending Relationship State",
  );
  return deepFreezePocValueV1({
    affection: parseSafeInteger(dataPropertyV1(parsed, "affection", "Ending Relationship State")),
    teamwork: parseNonNegativeSafeInteger(
      dataPropertyV1(parsed, "teamwork", "Ending Relationship State"),
    ),
    stage: parseRelationshipStage(dataPropertyV1(parsed, "stage", "Ending Relationship State")),
  });
}

function parseAuraTargetV1(value: unknown): AuraTargetV1 {
  const candidate = exactDataObjectForKindV1(value, "Ending Aura target");
  const kind = dataPropertyV1(candidate, "kind", "Ending Aura target");
  if (kind === "actor") {
    const target = exactDataObjectV1(value, ["kind", "actorId"], "Ending Aura target");
    return deepFreezePocValueV1({
      kind,
      actorId: parseActorId(dataPropertyV1(target, "actorId", "Ending Aura target")),
    });
  }
  if (kind === "tavern" || kind === "run") {
    exactDataObjectV1(value, ["kind"], "Ending Aura target");
    return deepFreezePocValueV1({ kind });
  }
  throw new TypeError("invalid Ending Aura target kind");
}

function parseAuraSourceV1(value: unknown): AuraSourceRefV1 {
  const candidate = exactDataObjectForKindV1(value, "Ending Aura source");
  const kind = dataPropertyV1(candidate, "kind", "Ending Aura source");
  if (kind === "initial" || kind === "debug") {
    const source = exactDataObjectV1(value, ["kind", "reasonId"], "Ending Aura source");
    return deepFreezePocValueV1({
      kind,
      reasonId: parseReasonId(dataPropertyV1(source, "reasonId", "Ending Aura source")),
    });
  }
  if (kind === "story_event") {
    const source = exactDataObjectV1(value, ["kind", "eventId"], "Ending Aura source");
    return deepFreezePocValueV1({
      kind,
      eventId: parseEventId(dataPropertyV1(source, "eventId", "Ending Aura source")),
    });
  }
  if (kind === "story_action" || kind === "world_action") {
    const source = exactDataObjectV1(value, ["kind", "actionId"], "Ending Aura source");
    return deepFreezePocValueV1({
      kind,
      actionId: parseActionId(dataPropertyV1(source, "actionId", "Ending Aura source")),
    });
  }
  if (kind === "facility") {
    const source = exactDataObjectV1(value, ["kind", "facilityId"], "Ending Aura source");
    return deepFreezePocValueV1({
      kind,
      facilityId: parseFacilityId(dataPropertyV1(source, "facilityId", "Ending Aura source")),
    });
  }
  throw new TypeError("invalid Ending Aura source kind");
}

function parseAuraDurationV1(value: unknown): AuraDurationV1 {
  const candidate = exactDataObjectForKindV1(value, "Ending Aura duration");
  const kind = dataPropertyV1(candidate, "kind", "Ending Aura duration");
  if (kind === "until_cleared") {
    exactDataObjectV1(value, ["kind"], "Ending Aura duration");
    return deepFreezePocValueV1({ kind });
  }
  if (kind === "countdown") {
    const duration = exactDataObjectV1(
      value,
      ["kind", "unit", "remaining"],
      "Ending Aura duration",
    );
    const unit = dataPropertyV1(duration, "unit", "Ending Aura duration");
    if (
      unit !== "phase_end" &&
      unit !== "day_end" &&
      unit !== "opening" &&
      unit !== "night_recovery"
    ) {
      throw new TypeError("invalid Ending Aura duration unit");
    }
    return deepFreezePocValueV1({
      kind,
      unit,
      remaining: parsePositiveSafeInteger(
        dataPropertyV1(duration, "remaining", "Ending Aura duration"),
      ),
    });
  }
  throw new TypeError("invalid Ending Aura duration kind");
}

function parseAuraInstanceV1(value: unknown): AuraInstanceV1 {
  const parsed = exactDataObjectV1(
    value,
    ["instanceId", "auraId", "target", "source", "duration", "appliedAtSequence"],
    "Ending Aura instance",
  );
  return deepFreezePocValueV1({
    instanceId: parseAuraInstanceId(dataPropertyV1(parsed, "instanceId", "Ending Aura instance")),
    auraId: parseAuraId(dataPropertyV1(parsed, "auraId", "Ending Aura instance")),
    target: parseAuraTargetV1(dataPropertyV1(parsed, "target", "Ending Aura instance")),
    source: parseAuraSourceV1(dataPropertyV1(parsed, "source", "Ending Aura instance")),
    duration: parseAuraDurationV1(dataPropertyV1(parsed, "duration", "Ending Aura instance")),
    appliedAtSequence: parseNonNegativeSafeInteger(
      dataPropertyV1(parsed, "appliedAtSequence", "Ending Aura instance"),
    ),
  });
}

function parseLevyV1(value: unknown): EndingInputV1["levy"] {
  const candidate = exactDataObjectForKindV1(value, "Ending levy");
  const kind = dataPropertyV1(candidate, "kind", "Ending levy");
  if (kind === "paid") {
    const parsed = exactDataObjectV1(value, ["kind", "levyAmount", "cash"], "Ending levy");
    const cash = exactDataObjectV1(
      dataPropertyV1(parsed, "cash", "Ending levy"),
      ["before", "after"],
      "Ending levy cash",
    );
    return deepFreezePocValueV1({
      kind,
      levyAmount: parseMoney(dataPropertyV1(parsed, "levyAmount", "Ending levy")),
      cash: {
        before: parseMoney(dataPropertyV1(cash, "before", "Ending levy cash")),
        after: parseMoney(dataPropertyV1(cash, "after", "Ending levy cash")),
      },
    });
  }
  if (kind === "arrears") {
    const parsed = exactDataObjectV1(
      value,
      ["kind", "levyAmount", "availableCash", "shortfall"],
      "Ending levy",
    );
    return deepFreezePocValueV1({
      kind,
      levyAmount: parseMoney(dataPropertyV1(parsed, "levyAmount", "Ending levy")),
      availableCash: parseMoney(dataPropertyV1(parsed, "availableCash", "Ending levy")),
      shortfall: parseMoney(dataPropertyV1(parsed, "shortfall", "Ending levy")),
    });
  }
  throw new TypeError("invalid Ending levy kind");
}

function assertUniqueIdsV1(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) throw new TypeError(`duplicate ${label}`);
}

function parseEndingInputV1(value: unknown): EndingInputV1 {
  const parsed = exactDataObjectV1(
    value,
    [
      "cash",
      "levy",
      "reputation",
      "facilityIds",
      "relationship",
      "facts",
      "quests",
      "outcomes",
      "auras",
    ],
    "Ending input",
  );
  const facilityIds = exactDataArrayV1(
    dataPropertyV1(parsed, "facilityIds", "Ending input"),
    "Ending FacilityIds",
  ).map(parseFacilityId);
  const facts = exactDataArrayV1(
    dataPropertyV1(parsed, "facts", "Ending input"),
    "Ending Facts",
  ).map(parseFactEntryV1);
  const quests = exactDataArrayV1(
    dataPropertyV1(parsed, "quests", "Ending input"),
    "Ending Quests",
  ).map(parseQuestEntryV1);
  const outcomes = exactDataArrayV1(
    dataPropertyV1(parsed, "outcomes", "Ending input"),
    "Ending Outcomes",
  ).map(parseOutcomeEntryV1);
  const auras = exactDataArrayV1(
    dataPropertyV1(parsed, "auras", "Ending input"),
    "Ending Auras",
  ).map(parseAuraInstanceV1);
  assertUniqueIdsV1(facilityIds, "Ending FacilityId");
  assertUniqueIdsV1(
    facts.map(({ factId }) => factId),
    "Ending FactId",
  );
  assertUniqueIdsV1(
    quests.map(({ questId }) => questId),
    "Ending QuestId",
  );
  assertUniqueIdsV1(
    outcomes.map(({ outcomeId }) => outcomeId),
    "Ending OutcomeId",
  );
  assertUniqueIdsV1(
    auras.map(({ instanceId }) => instanceId),
    "Ending AuraInstanceId",
  );
  return deepFreezePocValueV1({
    cash: parseMoney(dataPropertyV1(parsed, "cash", "Ending input")),
    levy: parseLevyV1(dataPropertyV1(parsed, "levy", "Ending input")),
    reputation: parseNonNegativeSafeInteger(dataPropertyV1(parsed, "reputation", "Ending input")),
    facilityIds,
    relationship: parseRelationshipV1(dataPropertyV1(parsed, "relationship", "Ending input")),
    facts,
    quests,
    outcomes,
    auras,
  });
}

function replaceUniqueV1<TEntry>(
  entries: readonly TEntry[],
  matches: (entry: TEntry) => boolean,
  replacement: TEntry,
  label: string,
): readonly TEntry[] {
  let count = 0;
  const next = entries.map((entry) => {
    if (!matches(entry)) return entry;
    count += 1;
    return replacement;
  });
  if (count !== 1) throw new TypeError(`Ending effect requires one ${label}`);
  return next;
}

function applyEndingEffectsV1(
  input: EndingInputV1,
  effects: readonly ProgressionEffectIntentV1[],
): {
  readonly facts: readonly FactEntryV1[];
  readonly quests: readonly QuestEntryV1[];
  readonly outcomes: readonly OutcomeEntryV1[];
} {
  let facts = input.facts;
  let quests = input.quests;
  let outcomes = input.outcomes;
  for (const effect of effects) {
    if (effect.kind === "fact.set") {
      facts = replaceUniqueV1(
        facts,
        ({ factId }) => factId === effect.factId,
        deepFreezePocValueV1({ factId: effect.factId, value: effect.value }),
        `FactId ${effect.factId}`,
      );
      continue;
    }
    if (effect.kind === "quest.set") {
      quests = replaceUniqueV1(
        quests,
        ({ questId }) => questId === effect.quest.questId,
        effect.quest,
        `QuestId ${effect.quest.questId}`,
      );
      continue;
    }
    if (effect.kind === "outcome.set") {
      outcomes = replaceUniqueV1(
        outcomes,
        ({ outcomeId }) => outcomeId === effect.outcomeId,
        deepFreezePocValueV1({ outcomeId: effect.outcomeId, value: effect.value }),
        `OutcomeId ${effect.outcomeId}`,
      );
      continue;
    }
    const exhaustive: never = effect;
    throw new TypeError(`unsupported Ending effect ${String(exhaustive)}`);
  }
  return deepFreezePocValueV1({ facts, quests, outcomes });
}

function requiredOutcomeV1(
  outcomes: readonly OutcomeEntryV1[],
  outcomeId: OutcomeEntryV1["outcomeId"],
): OutcomeEntryV1 {
  const matches = outcomes.filter((entry) => entry.outcomeId === outcomeId);
  if (matches.length !== 1 || matches[0] === undefined) {
    throw new TypeError(`Ending summary requires OutcomeId ${outcomeId}`);
  }
  return matches[0];
}

function classifyEndingV1(data: PocSimulationDataV1, input: EndingInputV1): TerminalStatusV1 {
  if (input.levy.kind === "arrears") return "failed_arrears";
  const policy = data.balance.endingPolicy;
  return input.cash >= policy.stableMinimumCashAfterLevy &&
    input.reputation >= policy.stableMinimumReputation &&
    input.facilityIds.length >= policy.stableMinimumBuiltFacilities
    ? "completed_stable"
    : "completed_danger";
}

/** Creates the data-driven PoC ending evaluator. */
export function createPocEndingRuleV1(
  dataValue: DeepReadonly<PocSimulationDataV1>,
): DeepReadonly<PocRulesV1["endings"]> {
  const data = pocSimulationDataSchemaV1.parse(dataValue);
  const provider: PocRulesV1["endings"] = {
    evaluate(inputValue) {
      const input = parseEndingInputV1(inputValue);
      if (
        input.facilityIds.some(
          (facilityId) => !data.content.facilities.some((entry) => entry.facilityId === facilityId),
        )
      ) {
        throw new TypeError("Ending input references an unknown FacilityId");
      }
      const status = classifyEndingV1(data, input);
      const definitions = data.content.endings.filter((entry) => entry.status === status);
      const ending = definitions[0];
      if (definitions.length !== 1 || ending === undefined) {
        throw new TypeError(`Ending data requires one definition for ${status}`);
      }
      const policy = data.balance.endingPolicy;
      const reasonIds =
        status === "failed_arrears"
          ? [policy.arrearsReasonId]
          : status === "completed_stable"
            ? [policy.stableReasonId]
            : input.reputation < policy.reputationCrisisBelow
              ? [policy.dangerReasonId, policy.reputationCrisisReasonId]
              : [policy.dangerReasonId];
      const projected = applyEndingEffectsV1(input, ending.effects);
      return deepFreezePocValueV1({
        endingId: ending.endingId,
        status,
        reasonIds,
        effects: ending.effects,
        summary: {
          relationship: requiredOutcomeV1(
            projected.outcomes,
            ending.summaryOutcomeIds.relationship,
          ),
          investigation: requiredOutcomeV1(
            projected.outcomes,
            ending.summaryOutcomeIds.investigation,
          ),
        },
      });
    },
  };
  return deepFreezePocValueV1(provider);
}
