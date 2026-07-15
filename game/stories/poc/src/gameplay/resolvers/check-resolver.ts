// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { canonicalJsonBytes } from "@sillymaker/base";
import type { RuleRngV1 } from "@sillymaker/base";

import {
  parseActorId,
  parseAttributeId,
  parseAttributeRank,
  parseCheckBandId,
  parseCheckId,
} from "../contracts/ids.js";
import type { AttributeRank } from "../contracts/ids.js";
import { pocSimulationDataSchemaV1 } from "../contracts/schemas.js";
import type {
  AppliedModifierV1,
  CheckInputV1,
  CheckOutcomeBandV1,
  CheckPreviewV1,
  CheckResultV1,
  EffectIntentV1,
  PocSimulationDataV1,
} from "../contracts/types.js";
import {
  deepFreezePocValueV1,
  parseAttributeBonus,
  parseDieFace,
  parseSafeInteger,
} from "../contracts/values.js";
import type { DeepReadonly } from "../contracts/values.js";
import { parsePocWorkflowModifierV1 } from "../modules/workflow/contract.js";

type PlainDataRecordV1 = Record<string, unknown>;

const attributeBonusByRankV1: Readonly<Record<AttributeRank, number>> = Object.freeze({
  C: 0,
  B: 1,
  A: 2,
  S: 3,
  "S+": 4,
});

function dataEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.byteLength === rightBytes.byteLength &&
    leftBytes.every((byte, index) => byte === rightBytes[index])
  );
}

function sumSafeIntegersV1(
  values: readonly number[],
  label: string,
): ReturnType<typeof parseSafeInteger> {
  const total = values.reduce((sum, value) => sum + BigInt(value), 0n);
  if (total < BigInt(Number.MIN_SAFE_INTEGER) || total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new TypeError(`${label} exceeds SafeInteger bounds`);
  }
  return parseSafeInteger(Number(total));
}

function assertMatchingCheckDefinitionV1(
  input: DeepReadonly<CheckInputV1>,
  data: DeepReadonly<PocSimulationDataV1>,
): void {
  const definition = data.content.checks.find(({ checkId }) => checkId === input.checkId);
  if (
    definition === undefined ||
    definition.attribute !== input.attribute ||
    !dataEqualV1(definition.bands, input.bands)
  ) {
    throw new TypeError("Check input does not match a validated definition");
  }
}

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
  return value;
}

function cloneDataValueV1<TValue>(value: TValue, label: string): TValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
      throw new TypeError(`invalid ${label} number`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return exactDataArrayV1(value, label).map((entry) => cloneDataValueV1(entry, label)) as TValue;
  }
  if (typeof value !== "object") throw new TypeError(`invalid ${label}`);
  const keys = Reflect.ownKeys(value);
  if (
    Object.getPrototypeOf(value) !== Object.prototype ||
    keys.some((key) => typeof key !== "string")
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const clone: PlainDataRecordV1 = {};
  for (const key of keys) {
    if (typeof key !== "string") throw new TypeError(`invalid ${label} field`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} field`);
    }
    clone[key] = cloneDataValueV1(descriptor.value, label);
  }
  return clone as TValue;
}

function parseBandV1(value: unknown): CheckOutcomeBandV1 {
  const band = exactDataObjectV1(
    value,
    ["bandId", "minInclusive", "maxInclusive", "effects"],
    "Check outcome band",
  );
  const minInclusive = parseSafeInteger(dataPropertyV1(band, "minInclusive", "Check outcome band"));
  const rawMaximum = dataPropertyV1(band, "maxInclusive", "Check outcome band");
  const maxInclusive = rawMaximum === null ? null : parseSafeInteger(rawMaximum);
  if (maxInclusive !== null && maxInclusive < minInclusive) {
    throw new TypeError("invalid Check outcome band range");
  }
  const effects = exactDataArrayV1(
    dataPropertyV1(band, "effects", "Check outcome band"),
    "Check outcome effects",
  ).map((effect) => cloneDataValueV1(effect, "Check outcome effect") as EffectIntentV1);
  return deepFreezePocValueV1({
    bandId: parseCheckBandId(dataPropertyV1(band, "bandId", "Check outcome band")),
    minInclusive,
    maxInclusive,
    effects,
  });
}

function parseCheckInputV1(value: unknown): CheckInputV1 {
  const input = exactDataObjectV1(
    value,
    [
      "checkId",
      "actorId",
      "attribute",
      "rank",
      "attributeBonus",
      "preparationBonus",
      "modifiers",
      "bands",
    ],
    "Check input",
  );
  const rank = parseAttributeRank(dataPropertyV1(input, "rank", "Check input"));
  const attributeBonus = parseAttributeBonus(
    dataPropertyV1(input, "attributeBonus", "Check input"),
  );
  if (attributeBonus !== attributeBonusByRankV1[rank]) {
    throw new TypeError("Check rank and attributeBonus disagree");
  }
  const bands = exactDataArrayV1(dataPropertyV1(input, "bands", "Check input"), "Check bands").map(
    parseBandV1,
  );
  if (bands.length === 0 || new Set(bands.map(({ bandId }) => bandId)).size !== bands.length) {
    throw new TypeError("invalid Check bands");
  }
  return deepFreezePocValueV1({
    checkId: parseCheckId(dataPropertyV1(input, "checkId", "Check input")),
    actorId: parseActorId(dataPropertyV1(input, "actorId", "Check input")),
    attribute: parseAttributeId(dataPropertyV1(input, "attribute", "Check input")),
    rank,
    attributeBonus,
    preparationBonus: parseSafeInteger(dataPropertyV1(input, "preparationBonus", "Check input")),
    modifiers: exactDataArrayV1(
      dataPropertyV1(input, "modifiers", "Check input"),
      "Check modifiers",
    ).map(parsePocWorkflowModifierV1),
    bands,
  });
}

function describeCheckV1(inputValue: unknown): CheckPreviewV1 {
  const input = parseCheckInputV1(inputValue);
  const modifiers: AppliedModifierV1[] = input.modifiers
    .filter(
      (modifier): modifier is Extract<typeof modifier, { readonly kind: "check.add" }> =>
        modifier.kind === "check.add" && modifier.checkId === input.checkId,
    )
    .map((modifier) => ({ modifier, contribution: modifier.amount }));
  const totalBonus = sumSafeIntegersV1(
    [
      input.attributeBonus,
      input.preparationBonus,
      ...modifiers.map(({ contribution }) => contribution),
    ],
    "Check totalBonus",
  );
  const possibleTotal = deepFreezePocValueV1({
    min: sumSafeIntegersV1([2, totalBonus], "Check possible minimum"),
    max: sumSafeIntegersV1([12, totalBonus], "Check possible maximum"),
  });
  for (let total: number = possibleTotal.min; total <= possibleTotal.max; total += 1) {
    const matches = input.bands.filter(
      (band) =>
        total >= band.minInclusive && (band.maxInclusive === null || total <= band.maxInclusive),
    );
    if (matches.length !== 1)
      throw new TypeError("Check bands do not cover each possible total once");
  }
  return deepFreezePocValueV1({
    formula: "2d6+bonuses",
    totalBonus,
    possibleTotal,
    bands: input.bands.map((band) => ({
      bandId: band.bandId,
      total: {
        min: band.minInclusive,
        max: band.maxInclusive ?? possibleTotal.max,
      },
    })),
  });
}

export interface PocCheckResolverV1 {
  describe(input: DeepReadonly<CheckInputV1>): CheckPreviewV1;
  resolve(input: DeepReadonly<CheckInputV1>, rng: RuleRngV1): CheckResultV1;
}

export function createPocCheckResolverV1(
  dataValue: DeepReadonly<PocSimulationDataV1>,
): DeepReadonly<PocCheckResolverV1> {
  const data = pocSimulationDataSchemaV1.parse(dataValue);
  return deepFreezePocValueV1({
    describe(input: DeepReadonly<CheckInputV1>): CheckPreviewV1 {
      const parsed = parseCheckInputV1(input);
      assertMatchingCheckDefinitionV1(parsed, data);
      return describeCheckV1(parsed);
    },
    resolve(inputValue: DeepReadonly<CheckInputV1>, rng: RuleRngV1): CheckResultV1 {
      const input = parseCheckInputV1(inputValue);
      assertMatchingCheckDefinitionV1(input, data);
      const preview = describeCheckV1(input);
      const firstDie = parseDieFace(
        rng.nextInt({ exclusiveMax: 6, purpose: `check:${input.checkId}:die:1` }) + 1,
      );
      const secondDie = parseDieFace(
        rng.nextInt({ exclusiveMax: 6, purpose: `check:${input.checkId}:die:2` }) + 1,
      );
      const total = sumSafeIntegersV1(
        [firstDie, secondDie, preview.totalBonus],
        "Check resolved total",
      );
      const matchingBands = input.bands.filter(
        (band) =>
          total >= band.minInclusive && (band.maxInclusive === null || total <= band.maxInclusive),
      );
      const band = matchingBands[0];
      if (band === undefined || matchingBands.length !== 1) {
        throw new TypeError("Check total does not select exactly one band");
      }
      const modifiers = input.modifiers
        .filter(
          (modifier): modifier is Extract<typeof modifier, { readonly kind: "check.add" }> =>
            modifier.kind === "check.add" && modifier.checkId === input.checkId,
        )
        .map((modifier) => ({ modifier, contribution: modifier.amount }));
      return deepFreezePocValueV1({
        checkId: input.checkId,
        actorId: input.actorId,
        dice: [firstDie, secondDie] as const,
        attributeBonus: input.attributeBonus,
        preparationBonus: input.preparationBonus,
        modifiers,
        totalBonus: preview.totalBonus,
        total,
        bandId: band.bandId,
        effects: band.effects.map((effect) => cloneDataValueV1(effect, "Check result effect")),
      });
    },
  });
}
