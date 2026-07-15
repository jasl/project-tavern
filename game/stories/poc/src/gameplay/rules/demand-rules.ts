// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { RuleRngV1 } from "@sillymaker/base";

import {
  parseActorId,
  parseAuraId,
  parseCheckId,
  parseCustomerSegmentId,
  parseEventId,
  parseFacilityId,
  parseFactId,
  parseIngredientId,
  parseModifierSourceId,
  parseReasonId,
  parseRunId,
  parseServiceMode,
  parseStoryToken,
} from "../contracts/ids.js";
import { pocSimulationDataSchemaV1 } from "../contracts/schemas.js";
import type {
  AppliedModifierV1,
  DemandProjectionInputV1,
  DemandRandomOffset,
  DemandSeedInputV1,
  FactEntryV1,
  ModifierSourceRefV1,
  ModifierV1,
  PocRulesV1,
  PocSimulationDataV1,
  StoryValueV1,
} from "../contracts/types.js";
import {
  deepFreezePocValueV1,
  parseDayIndex,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseSafeInteger,
} from "../contracts/values.js";
import type { DeepReadonly, NonNegativeSafeInteger, SafeInteger } from "../contracts/values.js";

type PlainDataRecordV1 = Record<string, unknown>;

const pocLocalSegmentIdV1 = "segment.locals";
const pocTravelerSegmentIdV1 = "segment.travelers";
const pocWarClueFactIdV1 = "fact.war_clue";
const reputationModifierSourceIdV1 = "modifier_source.reputation";
const warClueModifierSourceIdV1 = "modifier_source.war_clue";
const reputationDemandReasonIdV1 = "reason.modifier.reputation_demand";
const warClueDemandReasonIdV1 = "reason.modifier.war_clue_demand";

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

function parseDemandRandomOffsetV1(value: unknown): DemandRandomOffset {
  if (value !== -1 && value !== 0 && value !== 1) {
    throw new TypeError("invalid Demand random offset");
  }
  return value;
}

function parseStoryValueV1(value: unknown): StoryValueV1 {
  const parsed = exactDataObjectV1(value, ["kind", "value"], "Demand Story value");
  const kind = dataPropertyV1(parsed, "kind", "Demand Story value");
  const innerValue = dataPropertyV1(parsed, "value", "Demand Story value");
  if (kind === "boolean") {
    if (typeof innerValue !== "boolean") throw new TypeError("invalid Demand boolean value");
    return deepFreezePocValueV1({ kind, value: innerValue });
  }
  if (kind === "integer") {
    return deepFreezePocValueV1({ kind, value: parseSafeInteger(innerValue) });
  }
  if (kind === "token") {
    return deepFreezePocValueV1({ kind, value: parseStoryToken(innerValue) });
  }
  throw new TypeError("invalid Demand Story value kind");
}

function parseFactEntryV1(value: unknown): FactEntryV1 {
  const parsed = exactDataObjectV1(value, ["factId", "value"], "Demand Fact entry");
  return deepFreezePocValueV1({
    factId: parseFactId(dataPropertyV1(parsed, "factId", "Demand Fact entry")),
    value: parseStoryValueV1(dataPropertyV1(parsed, "value", "Demand Fact entry")),
  });
}

function parseModifierSourceV1(value: unknown): ModifierSourceRefV1 {
  const candidate = exactDataObjectForKindV1(value, "Demand Modifier source");
  const kind = dataPropertyV1(candidate, "kind", "Demand Modifier source");
  if (kind === "facility") {
    const source = exactDataObjectV1(value, ["kind", "facilityId"], "Demand Modifier source");
    return deepFreezePocValueV1({
      kind,
      facilityId: parseFacilityId(dataPropertyV1(source, "facilityId", "Demand Modifier source")),
    });
  }
  if (kind === "aura") {
    const source = exactDataObjectV1(value, ["kind", "auraId"], "Demand Modifier source");
    return deepFreezePocValueV1({
      kind,
      auraId: parseAuraId(dataPropertyV1(source, "auraId", "Demand Modifier source")),
    });
  }
  if (kind === "event") {
    const source = exactDataObjectV1(value, ["kind", "eventId"], "Demand Modifier source");
    return deepFreezePocValueV1({
      kind,
      eventId: parseEventId(dataPropertyV1(source, "eventId", "Demand Modifier source")),
    });
  }
  if (kind === "story") {
    const source = exactDataObjectV1(value, ["kind", "sourceId"], "Demand Modifier source");
    return deepFreezePocValueV1({
      kind,
      sourceId: parseModifierSourceId(dataPropertyV1(source, "sourceId", "Demand Modifier source")),
    });
  }
  throw new TypeError("invalid Demand Modifier source kind");
}

function parseModesV1(value: unknown): readonly ReturnType<typeof parseServiceMode>[] {
  return deepFreezePocValueV1(
    exactDataArrayV1(value, "Demand Modifier modes").map(parseServiceMode),
  );
}

function parseModifierV1(value: unknown): ModifierV1 {
  const candidate = exactDataObjectForKindV1(value, "Demand Modifier");
  const kind = dataPropertyV1(candidate, "kind", "Demand Modifier");
  if (kind === "teamwork_gain.block") {
    const modifier = exactDataObjectV1(value, ["kind", "source", "reasonId"], "Demand Modifier");
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceV1(dataPropertyV1(modifier, "source", "Demand Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Demand Modifier")),
    });
  }
  if (kind === "recovery.add") {
    const modifier = exactDataObjectV1(
      value,
      ["kind", "source", "actorId", "amount", "reasonId"],
      "Demand Modifier",
    );
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceV1(dataPropertyV1(modifier, "source", "Demand Modifier")),
      actorId: parseActorId(dataPropertyV1(modifier, "actorId", "Demand Modifier")),
      amount: parseSafeInteger(dataPropertyV1(modifier, "amount", "Demand Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Demand Modifier")),
    });
  }
  if (kind === "demand.add") {
    const modifier = exactDataObjectV1(
      value,
      ["kind", "source", "segmentId", "amount", "reasonId"],
      "Demand Modifier",
    );
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceV1(dataPropertyV1(modifier, "source", "Demand Modifier")),
      segmentId: parseCustomerSegmentId(dataPropertyV1(modifier, "segmentId", "Demand Modifier")),
      amount: parseSafeInteger(dataPropertyV1(modifier, "amount", "Demand Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Demand Modifier")),
    });
  }
  if (kind === "check.add") {
    const modifier = exactDataObjectV1(
      value,
      ["kind", "source", "checkId", "amount", "reasonId"],
      "Demand Modifier",
    );
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceV1(dataPropertyV1(modifier, "source", "Demand Modifier")),
      checkId: parseCheckId(dataPropertyV1(modifier, "checkId", "Demand Modifier")),
      amount: parseSafeInteger(dataPropertyV1(modifier, "amount", "Demand Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Demand Modifier")),
    });
  }
  if (kind === "shelf_life.add_days") {
    const modifier = exactDataObjectV1(
      value,
      ["kind", "source", "ingredientIds", "amount", "reasonId"],
      "Demand Modifier",
    );
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceV1(dataPropertyV1(modifier, "source", "Demand Modifier")),
      ingredientIds: exactDataArrayV1(
        dataPropertyV1(modifier, "ingredientIds", "Demand Modifier"),
        "Demand Modifier IngredientIds",
      ).map(parseIngredientId),
      amount: parsePositiveSafeInteger(dataPropertyV1(modifier, "amount", "Demand Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Demand Modifier")),
    });
  }
  if (kind === "capacity.add" || kind === "prep_points.add" || kind === "service_cost.add") {
    const modifier = exactDataObjectV1(
      value,
      ["kind", "source", "modes", "amount", "reasonId"],
      "Demand Modifier",
    );
    return deepFreezePocValueV1({
      kind,
      source: parseModifierSourceV1(dataPropertyV1(modifier, "source", "Demand Modifier")),
      modes: parseModesV1(dataPropertyV1(modifier, "modes", "Demand Modifier")),
      amount: parseSafeInteger(dataPropertyV1(modifier, "amount", "Demand Modifier")),
      reasonId: parseReasonId(dataPropertyV1(modifier, "reasonId", "Demand Modifier")),
    });
  }
  throw new TypeError("invalid Demand Modifier kind");
}

function parseDemandSeedInputV1(value: unknown): DemandSeedInputV1 {
  const parsed = exactDataObjectV1(value, ["runId", "segments"], "Demand seed input");
  const segments = exactDataArrayV1(
    dataPropertyV1(parsed, "segments", "Demand seed input"),
    "Demand seed segments",
  ).map((line) => {
    const segment = exactDataObjectV1(
      line,
      ["day", "segmentId", "baseCustomers"],
      "Demand seed line",
    );
    return deepFreezePocValueV1({
      day: parseDayIndex(dataPropertyV1(segment, "day", "Demand seed line")),
      segmentId: parseCustomerSegmentId(dataPropertyV1(segment, "segmentId", "Demand seed line")),
      baseCustomers: parseNonNegativeSafeInteger(
        dataPropertyV1(segment, "baseCustomers", "Demand seed line"),
      ),
    });
  });
  const keys = new Set(segments.map(({ day, segmentId }) => `${day}:${segmentId}`));
  if (keys.size !== segments.length) throw new TypeError("duplicate Demand seed line");
  return deepFreezePocValueV1({
    runId: parseRunId(dataPropertyV1(parsed, "runId", "Demand seed input")),
    segments,
  });
}

function parseDemandProjectionInputV1(value: unknown): DemandProjectionInputV1 {
  const parsed = exactDataObjectV1(
    value,
    ["day", "seeds", "reputation", "facts", "modifiers"],
    "Demand projection input",
  );
  const seeds = exactDataArrayV1(
    dataPropertyV1(parsed, "seeds", "Demand projection input"),
    "Demand projection seeds",
  ).map((seedValue) => {
    const seed = exactDataObjectV1(
      seedValue,
      ["segmentId", "baseCustomers", "randomOffset"],
      "Demand projection seed",
    );
    return deepFreezePocValueV1({
      segmentId: parseCustomerSegmentId(
        dataPropertyV1(seed, "segmentId", "Demand projection seed"),
      ),
      baseCustomers: parseNonNegativeSafeInteger(
        dataPropertyV1(seed, "baseCustomers", "Demand projection seed"),
      ),
      randomOffset: parseDemandRandomOffsetV1(
        dataPropertyV1(seed, "randomOffset", "Demand projection seed"),
      ),
    });
  });
  if (new Set(seeds.map(({ segmentId }) => segmentId)).size !== seeds.length) {
    throw new TypeError("duplicate Demand projection segment");
  }
  return deepFreezePocValueV1({
    day: parseDayIndex(dataPropertyV1(parsed, "day", "Demand projection input")),
    seeds,
    reputation: parseNonNegativeSafeInteger(
      dataPropertyV1(parsed, "reputation", "Demand projection input"),
    ),
    facts: exactDataArrayV1(
      dataPropertyV1(parsed, "facts", "Demand projection input"),
      "Demand projection Facts",
    ).map(parseFactEntryV1),
    modifiers: exactDataArrayV1(
      dataPropertyV1(parsed, "modifiers", "Demand projection input"),
      "Demand projection Modifiers",
    ).map(parseModifierV1),
  });
}

function parseDrawResultV1(value: unknown, exclusiveMax: number): NonNegativeSafeInteger {
  const parsed = parseNonNegativeSafeInteger(value);
  if (parsed >= exclusiveMax) throw new TypeError("Demand RNG draw out of range");
  return parsed;
}

function drawDemandOffsetV1(rng: RuleRngV1, purpose: string): DemandRandomOffset {
  const draw = parseDrawResultV1(
    rng.nextInt({ exclusiveMax: parsePositiveSafeInteger(3), purpose }),
    3,
  );
  return draw === 0 ? -1 : draw === 1 ? 0 : 1;
}

function nonNegativeSafeSumV1(values: readonly number[], label: string): NonNegativeSafeInteger {
  const total = values.reduce((sum, value) => sum + BigInt(value), 0n);
  if (total <= 0n) return parseNonNegativeSafeInteger(0);
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new TypeError(`${label} exceeds NonNegativeSafeInteger`);
  }
  return parseNonNegativeSafeInteger(Number(total));
}

function reputationContributionV1(reputation: NonNegativeSafeInteger): SafeInteger {
  const raw = Math.trunc((reputation - 50) / 4);
  return parseSafeInteger(raw < -2 ? -2 : raw > 2 ? 2 : raw);
}

function hasDemandBindingV1(
  data: PocSimulationDataV1,
  segmentId: string,
  sourceId: string,
  reasonId: string,
): boolean {
  return (
    data.content.customerSegments.some((entry) => entry.segmentId === segmentId) &&
    data.content.modifierSources.some((entry) => entry.sourceId === sourceId) &&
    data.content.reasons.some((entry) => entry.reasonId === reasonId)
  );
}

function derivedDemandModifiersV1(
  data: PocSimulationDataV1,
  input: DemandProjectionInputV1,
  segmentId: ReturnType<typeof parseCustomerSegmentId>,
): readonly AppliedModifierV1[] {
  const applied: AppliedModifierV1[] = [];
  if (
    input.day > 1 &&
    segmentId === pocLocalSegmentIdV1 &&
    hasDemandBindingV1(
      data,
      pocLocalSegmentIdV1,
      reputationModifierSourceIdV1,
      reputationDemandReasonIdV1,
    )
  ) {
    const contribution = reputationContributionV1(input.reputation);
    if (contribution !== 0) {
      const modifier: Extract<ModifierV1, { readonly kind: "demand.add" }> = {
        kind: "demand.add",
        source: { kind: "story", sourceId: parseModifierSourceId(reputationModifierSourceIdV1) },
        segmentId,
        amount: contribution,
        reasonId: parseReasonId(reputationDemandReasonIdV1),
      };
      applied.push({ modifier, contribution });
    }
  }
  const warClue = input.facts.find(({ factId }) => factId === pocWarClueFactIdV1);
  if (
    input.day === 6 &&
    segmentId === pocTravelerSegmentIdV1 &&
    warClue?.value.kind === "boolean" &&
    warClue.value.value &&
    hasDemandBindingV1(
      data,
      pocTravelerSegmentIdV1,
      warClueModifierSourceIdV1,
      warClueDemandReasonIdV1,
    )
  ) {
    const contribution = parseSafeInteger(2);
    const modifier: Extract<ModifierV1, { readonly kind: "demand.add" }> = {
      kind: "demand.add",
      source: { kind: "story", sourceId: parseModifierSourceId(warClueModifierSourceIdV1) },
      segmentId,
      amount: contribution,
      reasonId: parseReasonId(warClueDemandReasonIdV1),
    };
    applied.push({ modifier, contribution });
  }
  for (const modifier of input.modifiers) {
    if (modifier.kind === "demand.add" && modifier.segmentId === segmentId) {
      applied.push({ modifier, contribution: modifier.amount });
    }
  }
  return deepFreezePocValueV1(applied);
}

/** Creates the deterministic PoC demand seed and projection rules. */
export function createPocDemandRulesV1(
  dataValue: DeepReadonly<PocSimulationDataV1>,
): DeepReadonly<PocRulesV1["demand"]> {
  const data = pocSimulationDataSchemaV1.parse(dataValue);
  const provider: PocRulesV1["demand"] = {
    preview(inputValue) {
      const input = parseDemandProjectionInputV1(inputValue);
      return deepFreezePocValueV1({
        day: input.day,
        lines: input.seeds.map((seed) => {
          const modifiers = derivedDemandModifiersV1(data, input, seed.segmentId);
          const deterministicTerms = [
            seed.baseCustomers,
            ...modifiers.map(({ contribution }) => contribution),
          ];
          const actualCustomers = nonNegativeSafeSumV1(
            [...deterministicTerms, seed.randomOffset],
            "Demand actual customers",
          );
          const minimum =
            input.day === 1
              ? actualCustomers
              : nonNegativeSafeSumV1([...deterministicTerms, -1], "Demand minimum");
          const maximum =
            input.day === 1
              ? actualCustomers
              : nonNegativeSafeSumV1([...deterministicTerms, 1], "Demand maximum");
          return deepFreezePocValueV1({
            segmentId: seed.segmentId,
            range: { min: parseSafeInteger(minimum), max: parseSafeInteger(maximum) },
            actualCustomers,
            modifiers,
          });
        }),
      });
    },
    resolve(inputValue, rng) {
      const input = parseDemandSeedInputV1(inputValue);
      return deepFreezePocValueV1({
        lines: input.segments.map((segment) => ({
          day: segment.day,
          segmentId: segment.segmentId,
          randomOffset: drawDemandOffsetV1(
            rng,
            `demand:${input.runId}:${segment.day}:${segment.segmentId}`,
          ),
        })),
      });
    },
  };
  return deepFreezePocValueV1(provider);
}
