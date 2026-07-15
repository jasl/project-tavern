// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { canonicalJsonBytes } from "@sillymaker/base";

import { z } from "zod";

import {
  parseCheckBandId as parseRuleCheckBandIdV1,
  parseCustomerSegmentId as parseRuleCustomerSegmentIdV1,
  parseEndingId as parseRuleEndingIdV1,
  parseReasonId as parseRuleReasonIdV1,
  parseRecipeId as parseRuleRecipeIdV1,
  parseStoryToken as parseRuleStoryTokenV1,
} from "./contracts/ids.js";
import {
  PocRuleInvocationErrorV1,
  pocEffectIntentSchemaV1 as pocRuleEffectIntentSchemaV1,
  pocSimulationDataSchemaV1 as pocRuleSimulationDataSchemaV1,
} from "./contracts/schemas.js";
import type {
  AppliedModifierV1,
  CheckInputV1,
  CheckPreviewV1,
  CheckResultV1,
  DemandProjectionInputV1,
  DemandPreviewV1,
  DemandSeedInputV1,
  DemandSeedResultV1,
  EffectIntentV1,
  EndingInputV1,
  EndingResultV1,
  ModifierV1,
  OutcomeEntryV1,
  PocRulesV1,
  PocSimulationDataV1,
  ProgressionEffectIntentV1,
  SettlementDraftV1,
  StoryRuleSlotV1,
  StoryValueV1,
  TavernPreviewInputV1,
  TavernPreviewV1,
  TavernSettlementInputV1,
} from "./contracts/types.js";
import type { DeepReadonly } from "./contracts/values.js";
import {
  deepFreezePocValueV1 as deepFreezeRulesV1,
  parseDayIndex as parseRuleDayIndexV1,
  parseMoney as parseRuleMoneyV1,
  parseNonNegativeSafeInteger as parseRuleNonNegativeSafeIntegerV1,
  parseQuantity as parseRuleQuantityV1,
  parseSafeInteger as parseRuleSafeIntegerV1,
} from "./contracts/values.js";
import { parsePocInventoryLedgerEntryDraftV1 as parseRuleLedgerEntryDraftV1 } from "./modules/inventory/contract.js";
import { parsePocProgressionCheckResultV1 as parseRuleCheckResultV1 } from "./modules/progression/contract.js";
import { parsePocWorkflowModifierV1 as parseRuleModifierV1 } from "./modules/workflow/contract.js";
import { createPocCheckResolverV1 } from "./resolvers/check-resolver.js";
import {
  assertPocTavernPreviewOutputV1 as assertRuleTavernPreviewOutputV1,
  assertPocTavernSettlementOutputV1 as assertRuleTavernSettlementOutputV1,
  createPocTavernSettlementResolverV1,
} from "./resolvers/tavern-settlement-resolver.js";
import { createPocDemandRulesV1 } from "./rules/demand-rules.js";
import { createPocEndingRuleV1 } from "./rules/ending-rule.js";

function parsedRuleValueSchemaV1<T>(label: string, parser: (value: unknown) => T): z.ZodType<T> {
  return z.unknown().transform((value, context): T => {
    try {
      return parser(value);
    } catch {
      context.addIssue({ code: "custom", message: `invalid ${label}` });
      return z.NEVER;
    }
  });
}

const ruleSafeIntegerZodSchemaV1 = parsedRuleValueSchemaV1(
  "rule SafeInteger",
  parseRuleSafeIntegerV1,
);
const ruleNonNegativeSafeIntegerZodSchemaV1 = parsedRuleValueSchemaV1(
  "rule NonNegativeSafeInteger",
  parseRuleNonNegativeSafeIntegerV1,
);
const ruleDayIndexZodSchemaV1 = parsedRuleValueSchemaV1("rule DayIndex", parseRuleDayIndexV1);
const ruleMoneyZodSchemaV1 = parsedRuleValueSchemaV1("rule Money", parseRuleMoneyV1);
const ruleQuantityZodSchemaV1 = parsedRuleValueSchemaV1("rule Quantity", parseRuleQuantityV1);
const ruleCustomerSegmentIdZodSchemaV1 = parsedRuleValueSchemaV1(
  "rule CustomerSegmentId",
  parseRuleCustomerSegmentIdV1,
);
const ruleRecipeIdZodSchemaV1 = parsedRuleValueSchemaV1("rule RecipeId", parseRuleRecipeIdV1);
const ruleCheckBandIdZodSchemaV1 = parsedRuleValueSchemaV1(
  "rule CheckBandId",
  parseRuleCheckBandIdV1,
);
const ruleEndingIdZodSchemaV1 = parsedRuleValueSchemaV1("rule EndingId", parseRuleEndingIdV1);
const ruleReasonIdZodSchemaV1 = parsedRuleValueSchemaV1("rule ReasonId", parseRuleReasonIdV1);
const ruleStoryTokenZodSchemaV1 = parsedRuleValueSchemaV1("rule StoryToken", parseRuleStoryTokenV1);
const ruleIntegerRangeZodSchemaV1 = z
  .strictObject({
    min: ruleSafeIntegerZodSchemaV1,
    max: ruleSafeIntegerZodSchemaV1,
  })
  .superRefine((range, context) => {
    if (range.min > range.max) {
      context.addIssue({ code: "custom", message: "rule range minimum exceeds maximum" });
    }
  });
const ruleModifierZodSchemaV1 = parsedRuleValueSchemaV1("rule Modifier", parseRuleModifierV1);
const ruleAppliedModifierZodSchemaV1: z.ZodType<AppliedModifierV1> = z.strictObject({
  modifier: ruleModifierZodSchemaV1,
  contribution: ruleSafeIntegerZodSchemaV1,
});

function parseRuleEffectIntentV1(value: unknown): EffectIntentV1 {
  return pocRuleEffectIntentSchemaV1.parse(value);
}

const ruleEffectIntentZodSchemaV1 = parsedRuleValueSchemaV1(
  "rule EffectIntent",
  parseRuleEffectIntentV1,
);
const ruleProgressionEffectIntentZodSchemaV1 = parsedRuleValueSchemaV1(
  "rule Progression EffectIntent",
  (value): ProgressionEffectIntentV1 => {
    const effect = parseRuleEffectIntentV1(value);
    if (
      effect.kind !== "fact.set" &&
      effect.kind !== "quest.set" &&
      effect.kind !== "outcome.set"
    ) {
      throw new TypeError("invalid rule Progression EffectIntent kind");
    }
    return effect;
  },
);
const ruleLedgerEntryDraftZodSchemaV1 = parsedRuleValueSchemaV1(
  "rule LedgerEntryDraft",
  parseRuleLedgerEntryDraftV1,
);
const ruleStoryValueZodSchemaV1: z.ZodType<StoryValueV1> = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("boolean"), value: z.boolean() }),
  z.strictObject({ kind: z.literal("integer"), value: ruleSafeIntegerZodSchemaV1 }),
  z.strictObject({ kind: z.literal("token"), value: ruleStoryTokenZodSchemaV1 }),
]);
const ruleOutcomeEntryZodSchemaV1: z.ZodType<OutcomeEntryV1> = z.strictObject({
  outcomeId: parsedRuleValueSchemaV1("rule OutcomeId", (value) => {
    const effect = parseRuleEffectIntentV1({
      kind: "outcome.set",
      outcomeId: value,
      value: { kind: "boolean", value: false },
      reasonId: parseRuleReasonIdV1("reason.rule_output_validation"),
    });
    if (effect.kind !== "outcome.set") throw new TypeError("invalid rule OutcomeId");
    return effect.outcomeId;
  }),
  value: ruleStoryValueZodSchemaV1,
});

const demandSeedResultZodSchemaV1: z.ZodType<DemandSeedResultV1> = z.strictObject({
  lines: z.array(
    z.strictObject({
      day: ruleDayIndexZodSchemaV1,
      segmentId: ruleCustomerSegmentIdZodSchemaV1,
      randomOffset: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
    }),
  ),
});
const demandPreviewZodSchemaV1: z.ZodType<DemandPreviewV1> = z.strictObject({
  day: ruleDayIndexZodSchemaV1,
  lines: z.array(
    z.strictObject({
      segmentId: ruleCustomerSegmentIdZodSchemaV1,
      range: ruleIntegerRangeZodSchemaV1,
      actualCustomers: ruleNonNegativeSafeIntegerZodSchemaV1,
      modifiers: z.array(ruleAppliedModifierZodSchemaV1),
    }),
  ),
});
const tavernOpeningCostsZodSchemaV1 = z.strictObject({
  commitment: z.enum(["prospective", "committed"]),
  modeReasonId: ruleReasonIdZodSchemaV1,
  ap: ruleNonNegativeSafeIntegerZodSchemaV1,
  playerStamina: ruleNonNegativeSafeIntegerZodSchemaV1,
  heroineStamina: ruleNonNegativeSafeIntegerZodSchemaV1,
  cash: z.strictObject({
    wage: ruleMoneyZodSchemaV1,
    openingFee: ruleMoneyZodSchemaV1,
    modifierDelta: ruleSafeIntegerZodSchemaV1,
    total: ruleMoneyZodSchemaV1,
    appliedModifiers: z.array(ruleAppliedModifierZodSchemaV1),
  }),
  ingredientShortages: z.array(
    z.strictObject({
      ingredientId: parsedRuleValueSchemaV1("rule IngredientId", (value) => {
        const effect = parseRuleEffectIntentV1({
          kind: "inventory.consume",
          lines: [{ ingredientId: value, quantity: 1 }],
          reasonId: parseRuleReasonIdV1("reason.rule_output_validation"),
        });
        if (effect.kind !== "inventory.consume") throw new TypeError("invalid rule IngredientId");
        const line = effect.lines[0];
        if (line === undefined) throw new TypeError("missing rule IngredientId");
        return line.ingredientId;
      }),
      quantity: ruleQuantityZodSchemaV1,
    }),
  ),
});
const tavernPreviewZodSchemaV1: z.ZodType<TavernPreviewV1> = z.strictObject({
  basis: z.enum(["current_state", "active_opening_baseline"]),
  allowed: z.boolean(),
  rejectionCodes: z.array(
    z.enum([
      "calendar.insufficient_ap",
      "inventory.insufficient_cash",
      "actor.insufficient_stamina",
      "inventory.insufficient_ingredient",
    ]),
  ),
  openingCosts: tavernOpeningCostsZodSchemaV1,
  receptionCapacity: ruleNonNegativeSafeIntegerZodSchemaV1,
  preparationCapacity: ruleNonNegativeSafeIntegerZodSchemaV1,
  expectedSales: z.array(
    z.strictObject({ recipeId: ruleRecipeIdZodSchemaV1, range: ruleIntegerRangeZodSchemaV1 }),
  ),
  cashDelta: ruleIntegerRangeZodSchemaV1,
});
const settlementDraftZodSchemaV1: z.ZodType<SettlementDraftV1> = z.strictObject({
  orders: z.array(
    z.strictObject({
      segmentId: ruleCustomerSegmentIdZodSchemaV1,
      recipeId: ruleRecipeIdZodSchemaV1,
      potentialCustomers: ruleNonNegativeSafeIntegerZodSchemaV1,
      effectiveOrders: ruleNonNegativeSafeIntegerZodSchemaV1,
      capacityAccepted: ruleNonNegativeSafeIntegerZodSchemaV1,
      actualSales: ruleNonNegativeSafeIntegerZodSchemaV1,
    }),
  ),
  receptionCapacity: ruleNonNegativeSafeIntegerZodSchemaV1,
  preparationCapacity: ruleNonNegativeSafeIntegerZodSchemaV1,
  discardedPortions: z.array(
    z.strictObject({ recipeId: ruleRecipeIdZodSchemaV1, portions: ruleQuantityZodSchemaV1 }),
  ),
  appliedModifiers: z.array(ruleAppliedModifierZodSchemaV1),
  effects: z.array(ruleEffectIntentZodSchemaV1),
  entries: z.array(ruleLedgerEntryDraftZodSchemaV1),
});
const checkPreviewZodSchemaV1: z.ZodType<CheckPreviewV1> = z.strictObject({
  formula: z.literal("2d6+bonuses"),
  totalBonus: ruleSafeIntegerZodSchemaV1,
  possibleTotal: ruleIntegerRangeZodSchemaV1,
  bands: z.array(
    z.strictObject({ bandId: ruleCheckBandIdZodSchemaV1, total: ruleIntegerRangeZodSchemaV1 }),
  ),
});
const checkResultZodSchemaV1 = parsedRuleValueSchemaV1("rule CheckResult", parseRuleCheckResultV1);
const endingResultZodSchemaV1: z.ZodType<EndingResultV1> = z.strictObject({
  endingId: ruleEndingIdZodSchemaV1,
  status: z.enum(["completed_stable", "completed_danger", "failed_arrears"]),
  reasonIds: z.array(ruleReasonIdZodSchemaV1),
  effects: z.array(ruleProgressionEffectIntentZodSchemaV1),
  summary: z.strictObject({
    relationship: ruleOutcomeEntryZodSchemaV1,
    investigation: ruleOutcomeEntryZodSchemaV1,
  }),
});

export const pocRuleOutputSchemaBySlotV1 = Object.freeze({
  "demand.preview": demandPreviewZodSchemaV1,
  "demand.resolve": demandSeedResultZodSchemaV1,
  "tavern.preview": tavernPreviewZodSchemaV1,
  "tavern.settle": settlementDraftZodSchemaV1,
  "checks.describe": checkPreviewZodSchemaV1,
  "checks.resolve": checkResultZodSchemaV1,
  "endings.evaluate": endingResultZodSchemaV1,
});

export const pocStoryRuleSlotsV1: readonly StoryRuleSlotV1[] = deepFreezeRulesV1([
  "demand.preview",
  "demand.resolve",
  "tavern.preview",
  "tavern.settle",
  "checks.describe",
  "checks.resolve",
  "endings.evaluate",
]);

function canonicalRuleValuesEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.byteLength === rightBytes.byteLength &&
    leftBytes.every((byte, index) => byte === rightBytes[index])
  );
}

function safeRuleSumV1(values: readonly number[], label: string): number {
  const total = values.reduce((sum, value) => sum + BigInt(value), 0n);
  if (total < BigInt(Number.MIN_SAFE_INTEGER) || total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new TypeError(`${label} exceeds SafeInteger`);
  }
  return Number(total);
}

function assertDemandPreviewOutputV1(
  input: DeepReadonly<DemandProjectionInputV1>,
  output: DeepReadonly<DemandPreviewV1>,
): void {
  if (output.day !== input.day || output.lines.length !== input.seeds.length) {
    throw new TypeError("Demand preview does not correspond to its input");
  }
  output.lines.forEach((line, index) => {
    const seed = input.seeds[index];
    if (
      seed === undefined ||
      line.segmentId !== seed.segmentId ||
      line.range.min < 0 ||
      line.actualCustomers < line.range.min ||
      line.actualCustomers > line.range.max ||
      (input.day === 1 &&
        (Number(line.range.min) !== Number(line.actualCustomers) ||
          Number(line.range.max) !== Number(line.actualCustomers)))
    ) {
      throw new TypeError("Demand preview line violates its input or range");
    }
    for (const applied of line.modifiers) {
      if (
        applied.modifier.kind !== "demand.add" ||
        applied.modifier.segmentId !== line.segmentId ||
        applied.contribution !== applied.modifier.amount
      ) {
        throw new TypeError("Demand preview contains an inapplicable Modifier");
      }
    }
  });
}

function assertDemandSeedOutputV1(
  input: DeepReadonly<DemandSeedInputV1>,
  output: DeepReadonly<DemandSeedResultV1>,
): void {
  if (output.lines.length !== input.segments.length) {
    throw new TypeError("Demand seed output line count differs from its input");
  }
  output.lines.forEach((line, index) => {
    const segment = input.segments[index];
    if (segment === undefined || line.day !== segment.day || line.segmentId !== segment.segmentId) {
      throw new TypeError("Demand seed output does not correspond to its input line");
    }
  });
}

function sortedStableIdsV1(values: readonly string[]): readonly string[] {
  return [...values].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function assertTavernPreviewOutputV1(
  data: DeepReadonly<PocSimulationDataV1>,
  input: DeepReadonly<TavernPreviewInputV1>,
  output: DeepReadonly<TavernPreviewV1>,
): void {
  const active = input.basis === "active_opening_baseline";
  if (
    output.basis !== input.basis ||
    output.openingCosts.commitment !== (active ? "committed" : "prospective") ||
    output.allowed !== (active || output.rejectionCodes.length === 0)
  ) {
    throw new TypeError("Tavern preview contradicts its invocation basis");
  }
  if (
    active &&
    (!canonicalRuleValuesEqualV1(input.plan, {
      mode: input.session.baseline.mode,
      menu: input.session.baseline.menu,
    }) ||
      output.rejectionCodes.length !== 0 ||
      output.openingCosts.ingredientShortages.length !== 0)
  ) {
    throw new TypeError("active Tavern preview contradicts its committed baseline");
  }
  const modeId = active ? input.session.baseline.mode : input.plan.mode;
  const mode = data.balance.serviceModes.find((entry) => entry.mode === modeId);
  if (mode === undefined || output.openingCosts.modeReasonId !== mode.reasonId) {
    throw new TypeError("Tavern preview does not use its ServiceMode reason");
  }
  const expectedRecipeIds = sortedStableIdsV1(input.plan.menu.map(({ recipeId }) => recipeId));
  if (
    !canonicalRuleValuesEqualV1(
      output.expectedSales.map(({ recipeId }) => recipeId),
      expectedRecipeIds,
    )
  ) {
    throw new TypeError("Tavern preview recipes do not match its plan");
  }
  const portionsByRecipe = new Map(
    input.plan.menu.map(({ recipeId, portions }) => [recipeId, portions]),
  );
  for (const expected of output.expectedSales) {
    const portions = portionsByRecipe.get(expected.recipeId);
    if (portions === undefined || expected.range.min < 0 || expected.range.max > portions) {
      throw new TypeError("Tavern expected sales exceed planned portions");
    }
  }
  const expectedCashTotal = Math.max(
    0,
    safeRuleSumV1(
      [
        output.openingCosts.cash.wage,
        output.openingCosts.cash.openingFee,
        output.openingCosts.cash.modifierDelta,
      ],
      "Tavern opening cash total",
    ),
  );
  if (output.openingCosts.cash.total !== expectedCashTotal) {
    throw new TypeError("Tavern opening cash total is inconsistent");
  }
  assertRuleTavernPreviewOutputV1(data, input, output);
}

function assertTavernSettlementOutputV1(
  data: DeepReadonly<PocSimulationDataV1>,
  input: DeepReadonly<TavernSettlementInputV1>,
  output: DeepReadonly<SettlementDraftV1>,
): void {
  const segments = [...input.session.baseline.demand].sort(
    ({ segmentId: left }, { segmentId: right }) => (left < right ? -1 : left > right ? 1 : 0),
  );
  const prepared = [...input.session.baseline.preparedPortions].sort(
    ({ recipeId: left }, { recipeId: right }) => (left < right ? -1 : left > right ? 1 : 0),
  );
  const expectedPairs = segments.flatMap(({ segmentId }) =>
    prepared.map(({ recipeId }) => `${segmentId}\u0000${recipeId}`),
  );
  const actualPairs = output.orders.map(
    ({ segmentId, recipeId }) => `${segmentId}\u0000${recipeId}`,
  );
  if (!canonicalRuleValuesEqualV1(actualPairs, expectedPairs)) {
    throw new TypeError("Tavern settlement orders do not match demand and prepared recipes");
  }
  const potentialBySegment = new Map(
    segments.map(({ segmentId, actualCustomers }) => [segmentId, actualCustomers]),
  );
  let acceptedTotal = 0n;
  for (const order of output.orders) {
    if (
      order.potentialCustomers !== potentialBySegment.get(order.segmentId) ||
      order.capacityAccepted > order.effectiveOrders ||
      order.actualSales > order.capacityAccepted
    ) {
      throw new TypeError("Tavern settlement order violates allocation bounds");
    }
    acceptedTotal += BigInt(order.capacityAccepted);
  }
  if (acceptedTotal > BigInt(output.receptionCapacity)) {
    throw new TypeError("Tavern settlement exceeds reception capacity");
  }
  const discardedByRecipe = new Map<string, number>();
  for (const discarded of output.discardedPortions) {
    if (discardedByRecipe.has(discarded.recipeId)) {
      throw new TypeError("Tavern settlement duplicates a discarded recipe");
    }
    discardedByRecipe.set(discarded.recipeId, discarded.portions);
  }
  for (const line of prepared) {
    const sold = output.orders
      .filter(({ recipeId }) => recipeId === line.recipeId)
      .reduce((sum, { actualSales }) => sum + BigInt(actualSales), 0n);
    const discarded = BigInt(discardedByRecipe.get(line.recipeId) ?? 0);
    if (sold + discarded !== BigInt(line.portions)) {
      throw new TypeError("Tavern settlement sales and discard do not cover prepared portions");
    }
    discardedByRecipe.delete(line.recipeId);
  }
  if (discardedByRecipe.size !== 0) {
    throw new TypeError("Tavern settlement discards an unprepared recipe");
  }
  assertRuleTavernSettlementOutputV1(data, input, output);
}

const attributeBonusByRankForRuleV1 = Object.freeze({ C: 0, B: 1, A: 2, S: 3, "S+": 4 });

function matchingCheckDefinitionV1(
  data: DeepReadonly<PocSimulationDataV1>,
  input: DeepReadonly<CheckInputV1>,
) {
  const definition = data.content.checks.find(({ checkId }) => checkId === input.checkId);
  if (
    definition === undefined ||
    definition.attribute !== input.attribute ||
    input.attributeBonus !== attributeBonusByRankForRuleV1[input.rank] ||
    !canonicalRuleValuesEqualV1(definition.bands, input.bands)
  ) {
    throw new TypeError("Check invocation does not match its validated definition");
  }
  return definition;
}

function appliedCheckModifiersV1(input: DeepReadonly<CheckInputV1>): readonly AppliedModifierV1[] {
  return input.modifiers
    .filter(
      (modifier): modifier is Extract<ModifierV1, { readonly kind: "check.add" }> =>
        modifier.kind === "check.add" && modifier.checkId === input.checkId,
    )
    .map((modifier) => ({ modifier, contribution: modifier.amount }));
}

function expectedCheckBonusV1(input: DeepReadonly<CheckInputV1>): number {
  return safeRuleSumV1(
    [
      input.attributeBonus,
      input.preparationBonus,
      ...appliedCheckModifiersV1(input).map(({ contribution }) => contribution),
    ],
    "Check total bonus",
  );
}

function assertCheckPreviewOutputV1(
  data: DeepReadonly<PocSimulationDataV1>,
  input: DeepReadonly<CheckInputV1>,
  output: DeepReadonly<CheckPreviewV1>,
): void {
  matchingCheckDefinitionV1(data, input);
  const totalBonus = expectedCheckBonusV1(input);
  const possibleTotal = {
    min: safeRuleSumV1([2, totalBonus], "Check possible minimum"),
    max: safeRuleSumV1([12, totalBonus], "Check possible maximum"),
  };
  const bands = input.bands.map((band) => ({
    bandId: band.bandId,
    total: { min: band.minInclusive, max: band.maxInclusive ?? possibleTotal.max },
  }));
  if (
    output.totalBonus !== totalBonus ||
    !canonicalRuleValuesEqualV1(output.possibleTotal, possibleTotal) ||
    !canonicalRuleValuesEqualV1(output.bands, bands)
  ) {
    throw new TypeError("Check preview violates the 2d6 contract");
  }
}

function assertCheckResultOutputV1(
  data: DeepReadonly<PocSimulationDataV1>,
  input: DeepReadonly<CheckInputV1>,
  output: DeepReadonly<CheckResultV1>,
): void {
  const definition = matchingCheckDefinitionV1(data, input);
  const modifiers = appliedCheckModifiersV1(input);
  const totalBonus = expectedCheckBonusV1(input);
  const total = safeRuleSumV1([...output.dice, totalBonus], "Check result total");
  const band = definition.bands.find(({ bandId }) => bandId === output.bandId);
  if (
    output.checkId !== input.checkId ||
    output.actorId !== input.actorId ||
    output.attributeBonus !== input.attributeBonus ||
    output.preparationBonus !== input.preparationBonus ||
    !canonicalRuleValuesEqualV1(output.modifiers, modifiers) ||
    output.totalBonus !== totalBonus ||
    output.total !== total ||
    band === undefined ||
    total < band.minInclusive ||
    (band.maxInclusive !== null && total > band.maxInclusive) ||
    !canonicalRuleValuesEqualV1(output.effects, band.effects)
  ) {
    throw new TypeError("Check result violates its invocation or outcome band");
  }
}

function expectedEndingStatusV1(
  data: DeepReadonly<PocSimulationDataV1>,
  input: DeepReadonly<EndingInputV1>,
): EndingResultV1["status"] {
  if (input.levy.kind === "arrears") return "failed_arrears";
  const policy = data.balance.endingPolicy;
  return input.cash >= policy.stableMinimumCashAfterLevy &&
    input.reputation >= policy.stableMinimumReputation &&
    input.facilityIds.length >= policy.stableMinimumBuiltFacilities
    ? "completed_stable"
    : "completed_danger";
}

function assertEndingOutputV1(
  data: DeepReadonly<PocSimulationDataV1>,
  input: DeepReadonly<EndingInputV1>,
  output: DeepReadonly<EndingResultV1>,
): void {
  const status = expectedEndingStatusV1(data, input);
  const definitions = data.content.endings.filter((entry) => entry.status === status);
  const definition = definitions[0];
  if (
    definition === undefined ||
    definitions.length !== 1 ||
    output.status !== status ||
    output.endingId !== definition.endingId ||
    !canonicalRuleValuesEqualV1(output.effects, definition.effects)
  ) {
    throw new TypeError("Ending output does not match its unique status definition");
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
  if (!canonicalRuleValuesEqualV1(output.reasonIds, reasonIds)) {
    throw new TypeError("Ending output does not match its policy reasons");
  }
  const outcomes = new Map(input.outcomes.map((entry) => [entry.outcomeId, entry]));
  for (const effect of output.effects) {
    if (effect.kind === "outcome.set") {
      if (!outcomes.has(effect.outcomeId)) {
        throw new TypeError("Ending output effect references an unknown OutcomeId");
      }
      outcomes.set(effect.outcomeId, { outcomeId: effect.outcomeId, value: effect.value });
    }
  }
  const expectedSummary = {
    relationship: outcomes.get(definition.summaryOutcomeIds.relationship),
    investigation: outcomes.get(definition.summaryOutcomeIds.investigation),
  };
  if (
    expectedSummary.relationship === undefined ||
    expectedSummary.investigation === undefined ||
    !canonicalRuleValuesEqualV1(output.summary, expectedSummary)
  ) {
    throw new TypeError("Ending output summary does not match post-effect outcomes");
  }
}

function isRuleThenableV1(value: unknown): boolean {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return false;
  let current: object | null = value;
  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, "then");
    if (descriptor !== undefined) {
      return (
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        ("value" in descriptor && typeof descriptor.value === "function")
      );
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  return false;
}

function parseRuleOutputV1<T>(slot: StoryRuleSlotV1, schema: z.ZodType<T>, value: unknown): T {
  if (isRuleThenableV1(value)) {
    throw new PocRuleInvocationErrorV1(
      "rule.returned_thenable",
      `${slot} rule returned a thenable`,
    );
  }
  try {
    deepFreezeRulesV1(value);
    return deepFreezeRulesV1(schema.parse(value));
  } catch (cause) {
    throw new PocRuleInvocationErrorV1(
      "rule.output_invalid",
      `${slot} rule returned invalid output`,
      { cause },
    );
  }
}

function parseAndAssertRuleOutputV1<T>(
  slot: StoryRuleSlotV1,
  schema: z.ZodType<T>,
  value: unknown,
  assertSemantics: (parsed: T) => void,
): T {
  const parsed = parseRuleOutputV1(slot, schema, value);
  try {
    assertSemantics(parsed);
    return parsed;
  } catch (cause) {
    throw new PocRuleInvocationErrorV1(
      "rule.output_invalid",
      `${slot} rule returned invalid output`,
      { cause },
    );
  }
}

export function createValidatedPocRulesV1(
  dataValue: DeepReadonly<PocSimulationDataV1>,
  providers: DeepReadonly<PocRulesV1>,
): DeepReadonly<PocRulesV1> {
  const data = pocRuleSimulationDataSchemaV1.parse(dataValue);
  return deepFreezeRulesV1({
    demand: {
      preview(input) {
        return parseAndAssertRuleOutputV1(
          "demand.preview",
          pocRuleOutputSchemaBySlotV1["demand.preview"],
          providers.demand.preview(input),
          (output) => assertDemandPreviewOutputV1(input, output),
        );
      },
      resolve(input, rng) {
        return parseAndAssertRuleOutputV1(
          "demand.resolve",
          pocRuleOutputSchemaBySlotV1["demand.resolve"],
          providers.demand.resolve(input, rng),
          (output) => assertDemandSeedOutputV1(input, output),
        );
      },
    },
    tavern: {
      preview(input) {
        return parseAndAssertRuleOutputV1(
          "tavern.preview",
          pocRuleOutputSchemaBySlotV1["tavern.preview"],
          providers.tavern.preview(input),
          (output) => assertTavernPreviewOutputV1(data, input, output),
        );
      },
      settle(input, rng) {
        return parseAndAssertRuleOutputV1(
          "tavern.settle",
          pocRuleOutputSchemaBySlotV1["tavern.settle"],
          providers.tavern.settle(input, rng),
          (output) => assertTavernSettlementOutputV1(data, input, output),
        );
      },
    },
    checks: {
      describe(input) {
        return parseAndAssertRuleOutputV1(
          "checks.describe",
          pocRuleOutputSchemaBySlotV1["checks.describe"],
          providers.checks.describe(input),
          (output) => assertCheckPreviewOutputV1(data, input, output),
        );
      },
      resolve(input, rng) {
        return parseAndAssertRuleOutputV1(
          "checks.resolve",
          pocRuleOutputSchemaBySlotV1["checks.resolve"],
          providers.checks.resolve(input, rng),
          (output) => assertCheckResultOutputV1(data, input, output),
        );
      },
    },
    endings: {
      evaluate(input) {
        return parseAndAssertRuleOutputV1(
          "endings.evaluate",
          pocRuleOutputSchemaBySlotV1["endings.evaluate"],
          providers.endings.evaluate(input),
          (output) => assertEndingOutputV1(data, input, output),
        );
      },
    },
  });
}

export function createPocRulesV1(
  data: DeepReadonly<PocSimulationDataV1>,
): DeepReadonly<PocRulesV1> {
  const tavern = createPocTavernSettlementResolverV1(data);
  const checks = createPocCheckResolverV1(data);
  const endings = createPocEndingRuleV1(data);
  const providers = deepFreezeRulesV1({
    demand: createPocDemandRulesV1(data),
    tavern: { preview: tavern.preview, settle: tavern.settle },
    checks: { describe: checks.describe, resolve: checks.resolve },
    endings: { evaluate: endings.evaluate },
  });
  return createValidatedPocRulesV1(data, providers);
}

export { createPocDemandRulesV1 } from "./rules/demand-rules.js";
export { createPocEndingRuleV1 } from "./rules/ending-rule.js";
export { createPocCheckResolverV1 } from "./resolvers/check-resolver.js";
export { createPocTavernSettlementResolverV1 } from "./resolvers/tavern-settlement-resolver.js";
export {
  createPocSchedulingResolverV1,
  evaluatePocConditionsV1,
} from "./resolvers/scheduling-resolver.js";
export type {
  PocConditionObservationV1,
  PocScheduledEventV1,
  PocSchedulingInputV1,
  PocSchedulingResolverV1,
} from "./resolvers/scheduling-resolver.js";

export {
  collectPocModifiersV1,
  createPocGameCommandExecutorV1,
  previewPocTavernPlanForCandidateV1,
} from "./game-command-executor.js";
export type { PocGameCommandExecutorV1 } from "./game-command-executor.js";

export {
  deepFreezePocValueV1,
  parseSafeInteger,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseUint32,
  parseNonZeroUint32,
  parseDayIndex,
  parseAbsoluteDayIndex,
  parseMoodPoint,
  parseAttributeBonus,
  parseDieFace,
  parseMoney,
  parseQuantity,
} from "./contracts/values.js";

export type {
  Brand,
  DeepReadonly,
  SafeInteger,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
  Uint32,
  NonZeroUint32,
  DayIndex,
  AbsoluteDayIndex,
  MoodPoint,
  AttributeBonus,
  DieFace,
  Money,
  Quantity,
  BeforeAfterV1,
  IntegerRangeV1,
  RatioV1,
} from "./contracts/values.js";

export {
  parseAssetId,
  parseCharacterId,
  parseRunId,
  parseTextId,
  actorIdsV1,
  attributeIdsV1,
  attributeRanksV1,
  relationshipStagesV1,
  calendarPhasesV1,
  serviceModesV1,
  openServiceModesV1,
  helperTiersV1,
  runStatusesV1,
  parseStoryId,
  parsePolicyId,
  parseActionId,
  parseEventId,
  parseCheckpointId,
  parseWeightedGroupId,
  parseSceneId,
  parseNodeId,
  parseChoiceId,
  parseFactId,
  parseQuestId,
  parseOutcomeId,
  parseIngredientId,
  parseItemId,
  parseRecipeId,
  parseFacilityId,
  parseAuraId,
  parseCustomerSegmentId,
  parseModifierSourceId,
  parseCheckId,
  parseCheckBandId,
  parseEndingId,
  parseReasonId,
  parseWorldStepId,
  parseFixtureId,
  parseStoryToken,
  parseFallbackToken,
  parseBatchId,
  parseAuraInstanceId,
  parseOpeningSessionId,
  parseLedgerEntryId,
  parseActorId,
  parseAttributeId,
  parseAttributeRank,
  parseRelationshipStage,
  parseCalendarPhase,
  parseServiceMode,
  parseOpenServiceMode,
  parseHelperTier,
  parseRunStatus,
} from "./contracts/ids.js";

export type {
  AssetId,
  CharacterId,
  RunId,
  TextId,
  StoryId,
  PolicyId,
  ActionId,
  EventId,
  CheckpointId,
  WeightedGroupId,
  SceneId,
  NodeId,
  ChoiceId,
  FactId,
  QuestId,
  OutcomeId,
  IngredientId,
  ItemId,
  RecipeId,
  FacilityId,
  AuraId,
  CustomerSegmentId,
  ModifierSourceId,
  CheckId,
  CheckBandId,
  EndingId,
  ReasonId,
  WorldStepId,
  FixtureId,
  StoryToken,
  FallbackToken,
  BatchId,
  AuraInstanceId,
  OpeningSessionId,
  LedgerEntryId,
  ActorId,
  AttributeId,
  AttributeRank,
  RelationshipStage,
  CalendarPhase,
  ServiceMode,
  OpenServiceMode,
  HelperTier,
  RunStatus,
} from "./contracts/ids.js";

export { pocDebugCommandKindsV1 } from "./contracts/types.js";

export type {
  StaminaStateV1,
  AttributeRanksV1,
  PlayerActorStateV1,
  HeroineActorStateV1,
  RelationshipStateV1,
  ActorsStateV1,
  InventorySourceRefV1,
  InventoryBatchV1,
  ItemStackV1,
  IngredientQuantityV1,
  ItemQuantityV1,
  BatchConsumptionV1,
  AuraTargetV1,
  AuraDurationUnitV1,
  AuraDurationV1,
  AuraDurationPolicyV1,
  AuraSourceRefV1,
  AuraInstanceV1,
  StatusStateV1,
  PlannedRecipeV1,
  TavernPlanV1,
  DemandRandomOffset,
  DemandSeedSegmentStateV1,
  DemandDayStateV1,
  AppliedModifierV1,
  MaterializedDemandSegmentV1,
  MaterializedDemandDayV1,
  FacilityStateV1,
  FacilityDecisionV1,
  FacilityDecisionRecordV1,
  HelperStateV1,
  DailyPreparationStateV1,
  LedgerCategoryV1,
  LedgerSubjectV1,
  LedgerEntryV1,
  LedgerEntryDraftV1,
  InventoryStateV1,
  OpeningOrderLineV1,
  OpeningLedgerV1,
  ClosureHistoryV1,
  ServiceHistoryEntryV1,
  OpeningActorInputsV1,
  OpeningBaselineV1,
  OpeningCheckpointV1,
  OpeningBlockingEventV1,
  OpeningSessionV1,
  WorldActionChoiceV1,
  WorldActionProgressV1,
  WorldActionSessionV1,
  ActiveWorkflowV1,
  TavernStateV1,
  FacilitiesStateV1,
  StoryValueV1,
  FactEntryV1,
  QuestStatusV1,
  QuestEntryV1,
  OutcomeEntryV1,
  NarrativeCursorV1,
  NarrativeCallFrameV1,
  CharacterSlotV1,
  NarrativeCharacterStateV1,
  NarrativeStageStateV1,
  NarrativeSourceV1,
  NarrativeRuntimeStateV1,
  StoryRuntimeStateV1,
  RunStateV1,
  CalendarStateV1,
  PocSimulationStateV1,
  PocGameStateV1,
  PurchaseLineV1,
  FacilityChoiceV1,
  PocGameCommandV1,
  ModifierSourceRefV1,
  ModifierV1,
  EffectIntentV1,
  PocEffectIntentV1,
  PocEffectSourceV1,
  ProgressionEffectIntentV1,
  ChangeReasonV1,
  StaminaChangeComponentV1,
  PocGameplayFactV1,
  CommandReferenceV1,
  WorkflowBlockerV1,
  StoryRuleFaultCodeV1,
  CommandHandlerFaultCodeV1,
  EngineInvariantCodeV1,
  PocRejectionReasonV1,
  ConditionV1,
  AvailabilityGateV1,
  ConfirmationMetadataV1,
  StageCueV1,
  CheckRequestV1,
  NarrativeChoiceV1,
  NarrativeNodeV1,
  CheckBranchV1,
  NarrativeSceneV1,
  TextEntryV1,
  StoryCharacterDefinitionV1,
  ReasonDefinitionV1,
  CustomerSegmentDefinitionV1,
  ModifierSourceDefinitionV1,
  ActionOccupationDefinitionV1,
  ActionPresentationDefinitionV1,
  StoryActionDefinitionV1,
  IngredientDefinitionV1,
  ItemDefinitionV1,
  RecipeIngredientV1,
  SegmentPreferenceV1,
  RecipeDefinitionV1,
  ApByPhaseV1,
  LifePolicyDefinitionV1,
  FacilityDefinitionV1,
  FacilityOpportunityDefinitionV1,
  AuraDefinitionV1,
  WorldActionStepDefinitionV1,
  WorldActionOptionDefinitionV1,
  WorldActionDefinitionV1,
  EventTriggerV1,
  SchedulerContextV1,
  StoryEventDefinitionV1,
  CheckOutcomeBandV1,
  CheckDefinitionV1,
  EndingDefinitionV1,
  StoryValueDefinitionV1,
  FactDefinitionV1,
  QuestDefinitionV1,
  OutcomeDefinitionV1,
  StoryStateDefinitionsV1,
  StoryInitialStateV1,
  FixedActionCostKeyV1,
  ActionCostDefinitionV1,
  ServiceModeDefinitionV1,
  BaseDemandLineV1,
  LedgerReasonBindingsV1,
  EmergencyClosureDefinitionV1,
  ObligationForecastKindV1,
  ObligationRecommendationDefinitionV1,
  ObligationForecastPolicyV1,
  EndingPolicyV1,
  StoryBalanceV1,
  StoryContentV1,
  StorySourceIdentityV1,
  StoryManifestV1,
  PocStoryDataV1,
  PocSimulationManifestV1,
  PocSimulationContentV1,
  PocNarrativeProgramV1,
  PocSimulationDataV1,
  DemandSeedInputLineV1,
  DemandSeedInputV1,
  DemandSeedResultLineV1,
  DemandSeedResultV1,
  DemandProjectionInputV1,
  DemandPreviewLineV1,
  DemandPreviewV1,
  TavernPreviewInputV1,
  TavernOpeningCashCostV1,
  TavernOpeningCostsV1,
  TavernPreviewV1,
  TavernSettlementInputV1,
  SettlementDraftV1,
  CheckInputV1,
  CheckPreviewV1,
  CheckResultV1,
  ResolvedCheckV1,
  LevyResolutionV1,
  EndingInputV1,
  EndingSummaryV1,
  EndingResultV1,
  RunCompletionV1,
  PocRulesV1,
  StoryRuleSlotV1,
  PocSimulationProgramV1,
  CommandCostViewV1,
  ActionViewV1,
  AvailabilityExplanationV1,
  PreviewDeltaTargetV1,
  PreviewChangeV1,
  CommandConfirmationV1,
  CommandPreviewV1,
  NarrativeChoiceProjectionV1,
  NarrativeProjectionV1,
  DemandForecastV1,
  ObligationForecastBaseV1,
  ObligationForecastV1,
  RunStartControlProjectionV1,
  LifePolicyOptionProjectionV1,
  LifePolicySelectionProjectionV1,
  TavernOpeningControlProjectionV1,
  PocHudProjectionV1,
  PocInventoryBatchProjectionV1,
  PocInventoryProjectionV1,
  PocTavernProjectionV1,
  PocFacilitiesProjectionV1,
  PocLedgerProjectionV1,
  PocGameViewStatusV1,
  PocGameViewV1,
  PocGameQueriesV1,
  EngineFaultBaseV1,
  PocEngineFaultV1,
  PocDebugCommandV1,
  PocDebugReferenceV1,
  PocDebugCommandValidationErrorV1,
  PocGameBootstrapInputV1,
  PocGameSnapshotV1,
  PocCommandExecutionDiagnosticsV1,
  PocCommandExecutionAttemptV1,
  PocReplayableDebugExecutionResultV1,
  PocReplayableDebugExecutionAttemptV1,
  PocGameSimulationTypesV1,
} from "./contracts/types.js";

export {
  pocGameplayModuleKeysV1,
  pocGameplayModuleDependenciesV1,
  pocGameplayModuleDescriptorsV1,
  pocStateOwnerKeysV1,
  descriptorForPocModuleV1,
} from "./contracts/module-catalog.js";

export type { PocGameplayModuleKeyV1 } from "./contracts/module-catalog.js";

export {
  pocGameCommandKindsV1,
  pocGameCommandSchemaV1,
  pocDebugCommandSchemaV1,
  pocDebugCommandValidationErrorSchemaV1,
  pocStoryStateDefinitionsSchemaV1,
  pocStoryInitialStateSchemaV1,
  pocStoryBalanceSchemaV1,
  pocSimulationManifestSchemaV1,
  pocSimulationContentSchemaV1,
  pocNarrativeProgramSchemaV1,
  pocSimulationDataSchemaV1,
  pocEffectIntentKindsV1,
  pocEffectIntentSchemaV1,
  pocEffectSourceSchemaV1,
  validatePocEffectBatchForSourceV1,
  validatePocEffectIntentForSourceV1,
} from "./contracts/schemas.js";

export {
  pocGameStateSchemaV1,
  pocGameplayFactKindsV1,
  pocGameplayFactSchemaV1,
} from "./runtime-schemas.js";

export { createPocGameplayModuleTupleV1 } from "./modules/index.js";
export type { PocGameplayModuleTupleV1 } from "./modules/index.js";

export { commitPocCandidateV1, createPocTransactionCandidateV1 } from "./transaction/candidate.js";
export type {
  PocCandidateOwnerResultV1,
  PocTransactionCandidateV1,
} from "./transaction/candidate.js";

export { pocEffectOwnerByKindV1, routePocEffectBatchV1 } from "./transaction/effect-router.js";
export type { PocEffectBatchResultV1 } from "./transaction/effect-router.js";

export { definePocGameplayModuleV1 } from "./contracts/define-poc-gameplay-module.js";

export {
  parsePocRunCompletionV1,
  pocRunCompletionSchemaV1,
  parsePocRunStateV1,
  pocRunStateSchemaV1,
  parsePocRunBootstrapInputV1,
  pocRunOwnerOperationSchemaV1,
  pocRunStatesEqualV1,
  pocRunOwnerProposalSchemaV1,
  parsePocRunDependencyPortsV1,
  pocRunInvariantV1,
} from "./modules/run/contract.js";

export type {
  PocRunOwnerOperationV1,
  PocRunOwnerProposalV1,
  PocRunReadPortV1,
  PocRunDependencyPortsV1,
} from "./modules/run/contract.js";

export {
  createInitialPocRunStateV1,
  createPocRunReadPortV1,
  pocRunOwnerV1,
  pocRunGameplayModuleV1,
} from "./modules/run/module.js";

export {
  pocCalendarStateSchemaV1,
  pocCalendarInvariantV1,
  pocCalendarOwnerOperationSchemaV1,
  pocCalendarDependencyPortsSchemaV1,
  pocCalendarStatesEqualV1,
  pocCalendarOwnerProposalSchemaV1,
} from "./modules/calendar/contract.js";

export type {
  PocCalendarPhasePointV1,
  PocCalendarDebugChangeReasonV1,
  PocCalendarOwnerOperationV1,
  PocCalendarOwnerProposalPayloadV1,
  PocCalendarGameplayFactV1,
  PocCalendarOwnerProposalV1,
  PocCalendarReadPortV1,
  PocCalendarDependencyPortsV1,
} from "./modules/calendar/contract.js";

export {
  createInitialPocCalendarStateV1,
  createPocCalendarReadPortV1,
  pocCalendarOwnerV1,
  pocCalendarGameplayModuleV1,
} from "./modules/calendar/module.js";

export {
  pocActorsStateSchemaV1,
  pocActorsInvariantV1,
  pocActorsOwnerOperationSchemaV1,
  parsePocActorsDependencyPortsV1,
  pocActorsDependencyPortsSchemaV1,
  pocActorsStatesEqualV1,
  pocActorsOwnerProposalSchemaV1,
} from "./modules/actors/contract.js";

export type {
  PocActorsOwnerOperationV1,
  PocActorsGameplayFactV1,
  PocActorsOwnerProposalPayloadV1,
  PocActorsOwnerProposalV1,
  PocActorsReadPortV1,
  PocActorsDependencyPortsV1,
} from "./modules/actors/contract.js";

export {
  createPocActorsReadPortV1,
  pocActorsOwnerV1,
  createPocActorsGameplayModuleV1,
} from "./modules/actors/module.js";

export type { PocActorsGameplayModuleV1 } from "./modules/actors/module.js";

export {
  parsePocAuraTargetV1,
  parsePocAuraDurationV1,
  parsePocAuraInstanceV1,
  parsePocChangeReasonV1,
  pocStatusStateSchemaV1,
  pocStatusDependencyPortsSchemaV1,
  pocStatusOwnerOperationSchemaV1,
  pocStatusStatesEqualV1,
  pocStatusOwnerProposalSchemaV1,
  pocStatusInvariantV1,
} from "./modules/status/contract.js";

export type {
  PocStatusAuraDefinitionPortV1,
  PocStatusDependencyPortsV1,
  PocStatusOwnerOperationV1,
  PocStatusGameplayFactV1,
  PocStatusOwnerProposalPayloadV1,
  PocStatusOwnerProposalV1,
  PocStatusReadPortV1,
} from "./modules/status/contract.js";

export {
  advancePocAuraCountdownsV1,
  createPocStatusReadPortV1,
  pocStatusOwnerV1,
  createPocStatusGameplayModuleV1,
} from "./modules/status/module.js";

export type {
  PocStatusOwnerCapabilityV1,
  PocAuraCountdownInputV1,
  PocAuraCountdownResultV1,
  PocStatusGameplayModuleV1,
} from "./modules/status/module.js";

export {
  parsePocInventoryChangeReasonV1,
  parsePocInventorySourceRefV1,
  parsePocInventoryBatchV1,
  parsePocInventoryItemStackV1,
  parsePocInventoryLedgerSubjectV1,
  parsePocInventoryLedgerEntryV1,
  parsePocInventoryLedgerEntryDraftV1,
  parsePocInventoryStateV1,
  pocInventoryStateSchemaV1,
  pocInventoryOwnerOperationSchemaV1,
  comparePocInventoryBatchIdsV1,
  pocInventoryDependencyPortsSchemaV1,
  pocInventoryOwnerProposalSchemaV1,
  comparePocInventoryLedgerEntryIdsV1,
  comparePocInventoryFifoBatchesV1,
  sortPocInventoryBatchesV1,
  sortPocInventoryItemStacksV1,
  pocInventoryStatesEqualV1,
  pocInventoryInvariantV1,
  assertValidInitialPocInventoryStateV1,
} from "./modules/inventory/contract.js";

export type {
  PocInventoryIngredientPortV1,
  PocInventoryShelfLifeExtensionV1,
  PocInventoryLedgerAppendContextV1,
  PocInventoryOwnerOperationV1,
  PocInventoryDependencyPortsV1,
  PocInventoryGameplayFactV1,
  PocInventoryOwnerProposalPayloadV1,
  PocInventoryOwnerProposalV1,
  PocInventoryReadPortV1,
} from "./modules/inventory/contract.js";

export {
  createPocInventoryReadPortV1,
  pocInventoryOwnerV1,
  createPocInventoryGameplayModuleV1,
} from "./modules/inventory/module.js";

export type { PocInventoryGameplayModuleV1 } from "./modules/inventory/module.js";

export {
  comparePocFacilityIdsV1,
  comparePocFacilityOpportunityIdsV1,
  parsePocFacilityDecisionV1,
  parsePocFacilityChoiceV1,
  parsePocFacilityStateV1,
  parsePocFacilityDecisionRecordV1,
  parsePocFacilitiesStateV1,
  pocFacilitiesStateSchemaV1,
  sortPocFacilityStatesV1,
  sortPocFacilityDecisionRecordsV1,
  pocFacilitiesInvariantV1,
  pocFacilitiesOwnerOperationSchemaV1,
  parsePocFacilitiesDependencyPortsV1,
  pocFacilitiesDependencyPortsSchemaV1,
  pocFacilitiesStatesEqualV1,
  assertValidInitialPocFacilitiesStateV1,
  pocFacilitiesOwnerProposalSchemaV1,
} from "./modules/facilities/contract.js";

export type {
  PocFacilitiesOpportunityPortV1,
  PocFacilitiesOwnerOperationV1,
  PocFacilitiesDependencyPortsV1,
  PocFacilitiesGameplayFactV1,
  PocFacilitiesOwnerProposalPayloadV1,
  PocFacilitiesOwnerProposalV1,
  PocFacilitiesReadPortV1,
} from "./modules/facilities/contract.js";

export {
  createPocFacilitiesReadPortV1,
  pocFacilitiesOwnerV1,
  createInitialPocFacilitiesStateV1,
  pocFacilitiesGameplayModuleV1,
} from "./modules/facilities/module.js";

export {
  parsePocTavernChangeReasonV1,
  parsePocTavernHelperStateV1,
  parsePocTavernPlanV1,
  parsePocTavernDemandDayV1,
  parsePocTavernMaterializedDemandDayV1,
  parsePocTavernOpeningLedgerV1,
  parsePocTavernClosureHistoryV1,
  parsePocTavernServiceHistoryEntryV1,
  parsePocTavernStateV1,
  pocTavernStateSchemaV1,
  pocTavernOwnerOperationSchemaV1,
  pocTavernDependencyPortsSchemaV1,
  pocTavernStatesEqualV1,
  pocTavernInvariantV1,
  assertValidPocTavernStateV1,
  assertValidInitialPocTavernStateV1,
  sortPocTavernRecipeIdsV1,
  pocTavernOwnerProposalSchemaV1,
} from "./modules/tavern/contract.js";

export type {
  PocTavernOwnerOperationV1,
  PocTavernPlanRecipePortV1,
  PocTavernPlanDependenciesV1,
  PocTavernPreparationDependenciesV1,
  PocTavernDependencyPortsV1,
  PocTavernReadPortV1,
  PocTavernGameplayFactV1,
  PocTavernOwnerProposalPayloadV1,
  PocTavernOwnerProposalV1,
} from "./modules/tavern/contract.js";

export {
  createPocTavernReadPortV1,
  pocTavernOwnerV1,
  createPocTavernGameplayModuleV1,
} from "./modules/tavern/module.js";

export type { PocTavernGameplayModuleV1 } from "./modules/tavern/module.js";

export {
  parsePocWorkflowModifierV1,
  parsePocOpeningBaselineV1,
  parsePocWorkflowStateV1,
  pocWorkflowStateSchemaV1,
  pocWorkflowOwnerOperationSchemaV1,
  pocWorkflowDependencyPortsSchemaV1,
  pocWorkflowInvariantV1,
  assertValidPocWorkflowStateV1,
  pocWorkflowOwnerProposalSchemaV1,
  pocWorkflowStatesEqualV1,
} from "./modules/workflow/contract.js";

export type {
  PocWorkflowOwnerOperationV1,
  PocWorkflowStartOpeningDependenciesV1,
  PocWorkflowOpeningCheckpointDependenciesV1,
  PocWorkflowOpeningModifierDependenciesV1,
  PocWorkflowBeginWorldActionDependenciesV1,
  PocWorkflowRecordWorldActionChoiceDependenciesV1,
  PocWorkflowDependencyPortsV1,
  PocWorkflowReadPortV1,
  PocWorkflowGameplayFactV1,
  PocWorkflowOwnerProposalPayloadV1,
  PocWorkflowOwnerProposalV1,
} from "./modules/workflow/contract.js";

export {
  createInitialPocWorkflowStateV1,
  createPocWorkflowReadPortV1,
  pocWorkflowOwnerV1,
  pocWorkflowGameplayModuleV1,
} from "./modules/workflow/module.js";

export {
  parsePocProgressionStoryValueV1,
  parsePocProgressionFactEntryV1,
  parsePocProgressionQuestEntryV1,
  parsePocProgressionOutcomeEntryV1,
  parsePocProgressionChangeReasonV1,
  parsePocProgressionCheckResultV1,
  parsePocProgressionResolvedCheckV1,
  assertPocProgressionCheckFormulaV1,
  assertPocProgressionCheckResultV1,
  parsePocProgressionStateV1,
  pocProgressionStateSchemaV1,
  pocProgressionInvariantV1,
  assertValidPocProgressionStateV1,
  assertValidInitialPocProgressionStateV1,
  pocProgressionStatesEqualV1,
  pocProgressionOwnerOperationSchemaV1,
  pocProgressionDependencyPortsSchemaV1,
  assertPocProgressionStoryValueMatchesDefinitionV1,
  assertPocProgressionFactEntryMatchesDefinitionV1,
  assertPocProgressionQuestEntryMatchesDefinitionV1,
  assertPocProgressionOutcomeEntryMatchesDefinitionV1,
  createPocProgressionResolvedCheckV1,
  pocProgressionOwnerProposalSchemaV1,
} from "./modules/progression/contract.js";

export type {
  PocProgressionStateV1,
  PocProgressionReadPortV1,
  PocProgressionInvariantViolationV1,
  PocProgressionOwnerOperationV1,
  PocProgressionFactSetDependenciesV1,
  PocProgressionQuestSetDependenciesV1,
  PocProgressionOutcomeSetDependenciesV1,
  PocProgressionCheckRecordDependenciesV1,
  PocProgressionDependencyPortsV1,
  PocProgressionGameplayFactV1,
  PocProgressionOwnerProposalPayloadV1,
  PocProgressionOwnerProposalV1,
} from "./modules/progression/contract.js";

export {
  createPocProgressionReadPortV1,
  pocProgressionOwnerV1,
  createPocProgressionGameplayModuleV1,
} from "./modules/progression/module.js";

export type { PocProgressionGameplayModuleV1 } from "./modules/progression/module.js";

export {
  parsePocNarrativeCursorV1,
  parsePocNarrativeCallFrameV1,
  parsePocNarrativeCharacterStateV1,
  parsePocNarrativeStageStateV1,
  parsePocNarrativeSourceV1,
  parsePocNarrativeStateV1,
  parsePocNarrativeRuntimeStateV1,
  pocNarrativeStateSchemaV1,
  pocNarrativeInvariantV1,
  assertValidPocNarrativeStateV1,
  assertValidInitialPocNarrativeStateV1,
  pocNarrativeStatesEqualV1,
  pocNarrativeSettledResultSchemaV1,
  pocNarrativeOwnerOperationSchemaV1,
  pocNarrativeDependencyPortsSchemaV1,
  pocNarrativeOwnerProposalSchemaV1,
} from "./modules/narrative/contract.js";

export type {
  PocNarrativeInvariantViolationV1,
  PocNarrativeReadPortV1,
  PocNarrativeGameplayFactV1,
  PocNarrativeSettledResultV1,
  PocNarrativeNormalOwnerOperationKindV1,
  PocNarrativeOwnerOperationV1,
  PocNarrativePresentableNodeKindV1,
  PocNarrativeSettledDependenciesV1,
  PocNarrativeDebugJumpTargetProofV1,
  PocNarrativeDebugJumpDependenciesV1,
  PocNarrativeDependencyPortsV1,
  PocNarrativeOwnerProposalPayloadV1,
  PocNarrativeOwnerProposalV1,
} from "./modules/narrative/contract.js";

export {
  createPocNarrativeReadPortV1,
  pocNarrativeOwnerV1,
  createInitialPocNarrativeStateV1,
  pocNarrativeGameplayModuleV1,
} from "./modules/narrative/module.js";

export type { PocNarrativeGameplayModuleV1 } from "./modules/narrative/module.js";

export { interpretPocNarrativeStepV1 } from "./modules/narrative/interpreter.js";

export type {
  PocNarrativeInterpreterInputV1,
  PocNarrativeInterpreterRequestV1,
  PocNarrativeContinuationV1,
  PocNarrativeCheckDecisionV1,
  PocNarrativeResolutionV1,
  PocNarrativeInterpreterRejectionV1,
  PocNarrativeInterpreterFaultV1,
  PocNarrativeStepResultV1,
} from "./modules/narrative/interpreter.js";
