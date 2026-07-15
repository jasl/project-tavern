// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { RuleRngV1 } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import {
  createPocRulesV1,
  createValidatedPocRulesV1,
  deepFreezePocValueV1,
  parseAbsoluteDayIndex,
  parseActionId,
  parseAttributeBonus,
  parseAuraId,
  parseAuraInstanceId,
  parseBatchId,
  parseCheckBandId,
  parseCheckId,
  parseCheckpointId,
  parseCustomerSegmentId,
  parseDayIndex,
  parseEventId,
  parseFacilityId,
  parseFactId,
  parseIngredientId,
  parseMoney,
  parseModifierSourceId,
  parseNonNegativeSafeInteger,
  parseOutcomeId,
  parsePositiveSafeInteger,
  parseQuantity,
  parseQuestId,
  parseRecipeId,
  parseReasonId,
  parseSafeInteger,
  parseStoryToken,
  parseWeightedGroupId,
  pocSimulationDataSchemaV1,
  pocRuleOutputSchemaBySlotV1,
  pocStoryRuleSlotsV1,
  pocWorkflowStateSchemaV1,
  type CheckInputV1,
  type ConditionV1,
  type DemandProjectionInputV1,
  type DemandSeedInputV1,
  type EndingInputV1,
  type ModifierV1,
  type OpeningSessionV1,
  type PocGameStateV1,
  type PocSimulationDataV1,
  type SettlementDraftV1,
  type TavernPlanV1,
  type TavernPreviewInputV1,
  type TavernPreviewV1,
} from "../gameplay/index.js";
import {
  createPocSchedulingResolverV1,
  evaluatePocConditionsV1,
  type PocConditionObservationV1,
} from "../gameplay/resolvers/scheduling-resolver.js";
import { createPocTavernSettlementResolverV1 } from "../gameplay/resolvers/tavern-settlement-resolver.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

type RuleDrawRequestV1 = Parameters<RuleRngV1["nextInt"]>[0];

interface TracedRuleRngV1 {
  readonly rng: RuleRngV1;
  readonly requests: RuleDrawRequestV1[];
  assertExhausted(): void;
}

function tracedRuleRngV1(draws: readonly number[]): TracedRuleRngV1 {
  const remaining = [...draws];
  const requests: RuleDrawRequestV1[] = [];
  return {
    requests,
    rng: {
      nextInt(request) {
        requests.push(structuredClone(request));
        const next = remaining.shift();
        if (next === undefined) throw new TypeError("unexpected rule draw");
        if (!Number.isSafeInteger(next) || next < 0 || next >= request.exclusiveMax) {
          throw new TypeError("invalid fixed rule draw");
        }
        return parseNonNegativeSafeInteger(next);
      },
      candidateState() {
        throw new TypeError("fixed test RNG has no candidate state");
      },
      attemptedDraws() {
        return [];
      },
    },
    assertExhausted() {
      expect(remaining).toEqual([]);
    },
  };
}

function noDrawRuleRngV1(): RuleRngV1 {
  return {
    nextInt() {
      throw new TypeError("deterministic resolver consumed RNG");
    },
    candidateState() {
      throw new TypeError("no-draw test RNG has no candidate state");
    },
    attemptedDraws() {
      return [];
    },
  };
}

function createCheckInputV1(overrides: Partial<CheckInputV1> = {}): CheckInputV1 {
  return deepFreezePocValueV1({
    checkId: parseCheckId("check.fixture"),
    actorId: "actor.player",
    attribute: "intellect",
    rank: "B",
    attributeBonus: parseAttributeBonus(1),
    preparationBonus: parseSafeInteger(0),
    modifiers: [],
    bands: [
      {
        bandId: parseCheckBandId("band.fixture"),
        minInclusive: parseSafeInteger(2),
        maxInclusive: null,
        effects: [],
      },
    ],
    ...overrides,
  });
}

function createEndingInputV1(
  overrides: {
    readonly cash?: number;
    readonly reputation?: number;
    readonly facilityIds?: readonly ReturnType<typeof parseFacilityId>[];
    readonly levyKind?: "paid" | "arrears";
    readonly outcomes?: EndingInputV1["outcomes"];
  } = {},
): EndingInputV1 {
  const fixture = createPocGameplayFixtureV1();
  const cash = parseMoney(overrides.cash ?? 20);
  const levyAmount = parseMoney(10);
  return deepFreezePocValueV1({
    cash,
    levy:
      overrides.levyKind === "arrears"
        ? {
            kind: "arrears" as const,
            levyAmount,
            availableCash: parseMoney(5),
            shortfall: parseMoney(5),
          }
        : {
            kind: "paid" as const,
            levyAmount,
            cash: { before: parseMoney(cash + levyAmount), after: cash },
          },
    reputation: parseNonNegativeSafeInteger(overrides.reputation ?? 50),
    facilityIds: overrides.facilityIds ?? [parseFacilityId("facility.fixture")],
    relationship: fixture.snapshot.state.simulation.actors.relationship,
    facts: fixture.snapshot.state.story.facts,
    quests: fixture.snapshot.state.story.quests,
    outcomes: overrides.outcomes ?? fixture.snapshot.state.story.outcomes,
    auras: fixture.snapshot.state.simulation.status.auras,
  });
}

function createTavernDataV1(): PocSimulationDataV1 {
  const base = createPocGameplayFixtureV1().program.data;
  return pocSimulationDataSchemaV1.parse({
    ...base,
    initialState: {
      ...base.initialState,
      unlockedRecipeIds: ["recipe.a", "recipe.b"],
    },
    balance: {
      ...base.balance,
      serviceDays: [2],
      baseDemand: [
        { day: 2, segmentId: "segment.a", customers: 3 },
        { day: 2, segmentId: "segment.b", customers: 3 },
      ],
      openingFee: 2,
      serviceModes: base.balance.serviceModes.map((mode) =>
        mode.mode === "manual"
          ? {
              ...mode,
              baseReceptionCapacity: 4,
              basePreparationPoints: 4,
            }
          : mode,
      ),
    },
    content: {
      ...base.content,
      customerSegments: [
        { segmentId: "segment.a", nameTextId: "text.fixture" },
        { segmentId: "segment.b", nameTextId: "text.fixture" },
      ],
      recipes: [
        {
          recipeId: "recipe.a",
          nameTextId: "text.fixture",
          ingredients: [{ ingredientId: "ingredient.fixture", quantity: 1 }],
          salePrice: 5,
          prepPoints: 1,
          preferences: [
            { segmentId: "segment.a", value: 3 },
            { segmentId: "segment.b", value: 3 },
          ],
        },
        {
          recipeId: "recipe.b",
          nameTextId: "text.fixture",
          ingredients: [{ ingredientId: "ingredient.fixture", quantity: 1 }],
          salePrice: 7,
          prepPoints: 1,
          preferences: [
            { segmentId: "segment.a", value: 3 },
            { segmentId: "segment.b", value: 3 },
          ],
        },
      ],
    },
  });
}

function createTavernPlanV1(): TavernPlanV1 {
  return deepFreezePocValueV1({
    mode: "manual",
    menu: [
      { recipeId: parseRecipeId("recipe.b"), portions: parseQuantity(3) },
      { recipeId: parseRecipeId("recipe.a"), portions: parseQuantity(1) },
    ],
  });
}

function createOpeningSessionV1(
  plan = createTavernPlanV1(),
  modifiers: readonly ModifierV1[] = [],
  sessionModifiers: readonly ModifierV1[] = [],
  cashAfter = 98,
): OpeningSessionV1 {
  const fixture = createPocGameplayFixtureV1();
  const parsed = pocWorkflowStateSchemaV1.parse({
    kind: "opening",
    sessionId: "opening:1",
    checkpoint: "ready_to_finalize",
    baseline: {
      startedAtSequence: 1,
      day: 2,
      mode: "manual",
      preparationActionCount: 0,
      ap: { before: 2, after: 1 },
      playerStamina: { before: 10, after: 9 },
      heroineStamina: { before: 2, after: 1 },
      cashAtStart: { before: 100, after: cashAfter },
      reputationBeforeStart: 50,
      menu: plan.menu,
      preparedPortions: plan.menu,
      consumedIngredients: [
        {
          batchId: "batch:1:0",
          ingredientId: "ingredient.fixture",
          quantity: 4,
        },
      ],
      demand: [
        {
          segmentId: "segment.a",
          preview: { min: 1, max: 3 },
          actualCustomers: 3,
          modifiers: [],
        },
        {
          segmentId: "segment.b",
          preview: { min: 1, max: 3 },
          actualCustomers: 3,
          modifiers: [],
        },
      ],
      actors: {
        playerAttributes: fixture.snapshot.state.simulation.actors.player.attributes,
        heroineMood: fixture.snapshot.state.simulation.actors.heroine.mood,
        relationship: fixture.snapshot.state.simulation.actors.relationship,
        helper: fixture.snapshot.state.simulation.tavern.helper,
      },
      facilityIds: [],
      modifiers,
      startEntryIds: [],
    },
    triggeredEventIds: [],
    sessionModifiers,
    blockingEvent: null,
  });
  if (parsed?.kind !== "opening") throw new TypeError("invalid opening fixture");
  return parsed;
}

function createCurrentTavernInputV1(
  overrides: Partial<Extract<TavernPreviewInputV1, { readonly basis: "current_state" }>> = {},
): Extract<TavernPreviewInputV1, { readonly basis: "current_state" }> {
  const fixture = createPocGameplayFixtureV1();
  return deepFreezePocValueV1({
    basis: "current_state",
    day: parseDayIndex(2),
    plan: createTavernPlanV1(),
    preparationActionCount: parseNonNegativeSafeInteger(0),
    availableIngredients: [
      { ingredientId: parseIngredientId("ingredient.fixture"), quantity: parseQuantity(4) },
    ],
    demand: [
      {
        segmentId: parseCustomerSegmentId("segment.a"),
        preview: { min: parseSafeInteger(1), max: parseSafeInteger(3) },
        actualCustomers: parseNonNegativeSafeInteger(3),
        modifiers: [],
      },
      {
        segmentId: parseCustomerSegmentId("segment.b"),
        preview: { min: parseSafeInteger(1), max: parseSafeInteger(3) },
        actualCustomers: parseNonNegativeSafeInteger(3),
        modifiers: [],
      },
    ],
    actors: {
      playerAttributes: fixture.snapshot.state.simulation.actors.player.attributes,
      heroineMood: fixture.snapshot.state.simulation.actors.heroine.mood,
      relationship: fixture.snapshot.state.simulation.actors.relationship,
      helper: fixture.snapshot.state.simulation.tavern.helper,
    },
    facilityIds: [],
    modifiers: [],
    resources: {
      apRemaining: parseNonNegativeSafeInteger(1),
      cash: parseMoney(2),
      playerStamina: parseNonNegativeSafeInteger(1),
      heroineStamina: parseNonNegativeSafeInteger(1),
    },
    ...overrides,
  });
}

function expectPreviewContainsSettlementV1(
  preview: TavernPreviewV1,
  draft: SettlementDraftV1,
): void {
  preview.expectedSales.forEach((expected) => {
    const actual = draft.orders
      .filter(({ recipeId }) => recipeId === expected.recipeId)
      .reduce((sum, { actualSales }) => sum + actualSales, 0);
    expect(actual).toBeGreaterThanOrEqual(expected.range.min);
    expect(actual).toBeLessThanOrEqual(expected.range.max);
  });
  const finalizeCashDelta = draft.entries.reduce((sum, entry) => sum + entry.cashDelta, 0);
  const actualCashDelta =
    preview.openingCosts.commitment === "prospective"
      ? finalizeCashDelta - preview.openingCosts.cash.total
      : finalizeCashDelta;
  expect(actualCashDelta).toBeGreaterThanOrEqual(preview.cashDelta.min);
  expect(actualCashDelta).toBeLessThanOrEqual(preview.cashDelta.max);
}

function createConditionObservationV1(): PocConditionObservationV1 {
  const fixture = createPocGameplayFixtureV1();
  const state: PocGameStateV1 = deepFreezePocValueV1({
    ...fixture.snapshot.state,
    simulation: {
      ...fixture.snapshot.state.simulation,
      run: { ...fixture.snapshot.state.simulation.run, status: "active" },
      actors: {
        ...fixture.snapshot.state.simulation.actors,
        player: {
          ...fixture.snapshot.state.simulation.actors.player,
          attributes: { body: "A", social: "B", intellect: "S" },
        },
        relationship: {
          ...fixture.snapshot.state.simulation.actors.relationship,
          affection: parseSafeInteger(3),
        },
      },
      inventory: {
        ...fixture.snapshot.state.simulation.inventory,
        ingredientBatches: [
          {
            batchId: parseBatchId("batch:1:0"),
            ingredientId: parseIngredientId("ingredient.fixture"),
            quantity: parseQuantity(1),
            acquiredDay: parseDayIndex(1),
            lastUsableDay: parseAbsoluteDayIndex(2),
            refrigerationExtended: false,
            source: { kind: "initial", reasonId: parseReasonId("reason.fixture") },
          },
          {
            batchId: parseBatchId("batch:1:1"),
            ingredientId: parseIngredientId("ingredient.fixture"),
            quantity: parseQuantity(2),
            acquiredDay: parseDayIndex(1),
            lastUsableDay: parseAbsoluteDayIndex(2),
            refrigerationExtended: false,
            source: { kind: "initial", reasonId: parseReasonId("reason.fixture") },
          },
        ],
      },
      status: {
        auras: [
          {
            instanceId: parseAuraInstanceId("aura:1:0"),
            auraId: parseAuraId("aura.fixture_timed"),
            target: { kind: "actor", actorId: "actor.player" },
            source: { kind: "initial", reasonId: parseReasonId("reason.fixture") },
            duration: {
              kind: "countdown",
              unit: "day_end",
              remaining: parsePositiveSafeInteger(1),
            },
            appliedAtSequence: parseNonNegativeSafeInteger(1),
          },
        ],
      },
      tavern: {
        ...fixture.snapshot.state.simulation.tavern,
        helper: { unlocked: true, tier: "skilled" },
        demandSeeds: [
          {
            day: parseDayIndex(1),
            segments: [
              {
                segmentId: parseCustomerSegmentId("segment.fixture"),
                baseCustomers: parseNonNegativeSafeInteger(1),
                randomOffset: 0,
              },
            ],
          },
        ],
      },
    },
  });
  return deepFreezePocValueV1({ state, narrativeStatus: "idle" });
}

describe("PoC pure rules and resolvers", () => {
  it("resolves fixed demand and 2d6 vectors without mutating inputs", () => {
    const fixture = createPocGameplayFixtureV1();
    const rules = createPocRulesV1(fixture.program.data);
    expect(Object.keys(rules)).toEqual(["demand", "tavern", "checks", "endings"]);
    expect(Object.keys(rules.demand)).toEqual(["preview", "resolve"]);
    expect(Object.keys(rules.tavern)).toEqual(["preview", "settle"]);
    expect(Object.keys(rules.checks)).toEqual(["describe", "resolve"]);
    expect(Object.keys(rules.endings)).toEqual(["evaluate"]);
    expect(rules).not.toHaveProperty("scheduling");
    expect(pocStoryRuleSlotsV1).toEqual([
      "demand.preview",
      "demand.resolve",
      "tavern.preview",
      "tavern.settle",
      "checks.describe",
      "checks.resolve",
      "endings.evaluate",
    ]);

    const demandInput: DemandSeedInputV1 = deepFreezePocValueV1({
      runId: fixture.bootstrap.runId,
      segments: [
        {
          day: parseDayIndex(1),
          segmentId: parseCustomerSegmentId("segment.fixture"),
          baseCustomers: parseNonNegativeSafeInteger(1),
        },
      ],
    });
    const demandBefore = structuredClone(demandInput);
    const demandRng = tracedRuleRngV1([2]);
    expect(rules.demand.resolve(demandInput, demandRng.rng).lines[0]?.randomOffset).toBe(1);
    demandRng.assertExhausted();
    expect(demandRng.requests).toEqual([
      {
        exclusiveMax: 3,
        purpose: `demand:${fixture.bootstrap.runId}:1:segment.fixture`,
      },
    ]);
    expect(demandInput).toEqual(demandBefore);

    const checkInput = createCheckInputV1();
    const checkBefore = structuredClone(checkInput);
    const checkRng = tracedRuleRngV1([3, 2]);
    const check = rules.checks.resolve(checkInput, checkRng.rng);
    expect(check).toMatchObject({ dice: [4, 3], totalBonus: 1, total: 8 });
    expect(checkRng.requests).toEqual([
      { exclusiveMax: 6, purpose: "check:check.fixture:die:1" },
      { exclusiveMax: 6, purpose: "check:check.fixture:die:2" },
    ]);
    expect(checkInput).toEqual(checkBefore);
    expect(() =>
      rules.checks.describe(
        createCheckInputV1({
          bands: [
            {
              bandId: parseCheckBandId("band.fixture"),
              minInclusive: parseSafeInteger(2),
              maxInclusive: null,
              effects: [
                {
                  kind: "fact.set",
                  factId: parseFactId("fact.fixture"),
                  value: { kind: "boolean", value: true },
                  reasonId: parseReasonId("reason.fixture"),
                },
              ],
            },
          ],
        }),
      ),
    ).toThrow("validated definition");
    const overflowReturningModifiers: readonly ModifierV1[] = [
      parseSafeInteger(Number.MAX_SAFE_INTEGER),
      parseSafeInteger(2),
      parseSafeInteger(-Number.MAX_SAFE_INTEGER),
    ].map((amount) => ({
      kind: "check.add",
      source: { kind: "story", sourceId: parseModifierSourceId("modifier.fixture") },
      checkId: parseCheckId("check.fixture"),
      amount,
      reasonId: parseReasonId("reason.fixture"),
    }));
    expect(
      rules.checks.describe(createCheckInputV1({ modifiers: overflowReturningModifiers })),
    ).toMatchObject({ totalBonus: 3, possibleTotal: { min: 5, max: 15 } });
  });

  it("previews D1 exactly and later demand as a conservative range", () => {
    const rules = createPocRulesV1(createPocGameplayFixtureV1().program.data);
    const modifier: ModifierV1 = {
      kind: "demand.add",
      source: { kind: "story", sourceId: parseModifierSourceId("modifier.fixture") },
      segmentId: parseCustomerSegmentId("segment.fixture"),
      amount: parseSafeInteger(2),
      reasonId: parseReasonId("reason.fixture"),
    };
    const base: Omit<DemandProjectionInputV1, "day" | "seeds"> = {
      reputation: parseNonNegativeSafeInteger(50),
      facts: createPocGameplayFixtureV1().snapshot.state.story.facts,
      modifiers: [modifier],
    };
    expect(
      rules.demand.preview({
        ...base,
        day: parseDayIndex(1),
        seeds: [
          {
            segmentId: parseCustomerSegmentId("segment.fixture"),
            baseCustomers: parseNonNegativeSafeInteger(1),
            randomOffset: 1,
          },
        ],
      }),
    ).toEqual({
      day: 1,
      lines: [
        {
          segmentId: "segment.fixture",
          range: { min: 4, max: 4 },
          actualCustomers: 4,
          modifiers: [{ modifier, contribution: 2 }],
        },
      ],
    });
    expect(
      rules.demand.preview({
        ...base,
        day: parseDayIndex(2),
        seeds: [
          {
            segmentId: parseCustomerSegmentId("segment.fixture"),
            baseCustomers: parseNonNegativeSafeInteger(5),
            randomOffset: -1,
          },
        ],
      }).lines[0],
    ).toMatchObject({ range: { min: 6, max: 8 }, actualCustomers: 6 });

    const cancellationModifiers: readonly ModifierV1[] = [
      parseSafeInteger(Number.MAX_SAFE_INTEGER),
      parseSafeInteger(2),
      parseSafeInteger(-Number.MAX_SAFE_INTEGER),
    ].map((amount) => ({
      kind: "demand.add",
      source: { kind: "story", sourceId: parseModifierSourceId("modifier.fixture") },
      segmentId: parseCustomerSegmentId("segment.fixture"),
      amount,
      reasonId: parseReasonId("reason.fixture"),
    }));
    expect(
      rules.demand.preview({
        ...base,
        day: parseDayIndex(1),
        seeds: [
          {
            segmentId: parseCustomerSegmentId("segment.fixture"),
            baseCustomers: parseNonNegativeSafeInteger(1),
            randomOffset: 0,
          },
        ],
        modifiers: cancellationModifiers,
      }),
    ).toMatchObject({ lines: [{ range: { min: 3, max: 3 }, actualCustomers: 3 }] });
  });

  it("canonicalizes a zero reputation contribution instead of producing negative zero", () => {
    const fixture = createPocGameplayFixtureV1();
    const data = pocSimulationDataSchemaV1.parse({
      ...fixture.program.data,
      balance: {
        ...fixture.program.data.balance,
        serviceDays: [1, 2],
        baseDemand: [
          ...fixture.program.data.balance.baseDemand,
          { day: 1, segmentId: "segment.locals", customers: 5 },
          { day: 2, segmentId: "segment.fixture", customers: 1 },
          { day: 2, segmentId: "segment.locals", customers: 5 },
        ],
      },
      content: {
        ...fixture.program.data.content,
        customerSegments: [
          ...fixture.program.data.content.customerSegments,
          { segmentId: "segment.locals", nameTextId: "text.fixture" },
        ],
        modifierSources: [
          ...fixture.program.data.content.modifierSources,
          { sourceId: "modifier_source.reputation", nameTextId: "text.fixture" },
        ],
        reasons: [
          ...fixture.program.data.content.reasons,
          { reasonId: "reason.modifier.reputation_demand", textId: "text.fixture" },
        ],
      },
    });

    expect(
      createPocRulesV1(data).demand.preview({
        day: parseDayIndex(2),
        seeds: [
          {
            segmentId: parseCustomerSegmentId("segment.locals"),
            baseCustomers: parseNonNegativeSafeInteger(5),
            randomOffset: 0,
          },
        ],
        reputation: parseNonNegativeSafeInteger(49),
        facts: fixture.snapshot.state.story.facts,
        modifiers: [],
      }),
    ).toMatchObject({
      lines: [{ range: { min: 4, max: 6 }, actualCustomers: 5, modifiers: [] }],
    });
  });

  it("keeps current-state trial calculation distinct from an active opening", () => {
    const resolver = createPocTavernSettlementResolverV1(createTavernDataV1());
    expect(resolver.preview(createCurrentTavernInputV1())).toMatchObject({
      basis: "current_state",
      allowed: true,
      rejectionCodes: [],
      openingCosts: {
        commitment: "prospective",
        modeReasonId: "reason.fixture",
        ap: 1,
        playerStamina: 1,
        heroineStamina: 1,
        cash: { wage: 0, openingFee: 2, modifierDelta: 0, total: 2 },
        ingredientShortages: [],
      },
    });
    expect(
      resolver.preview(
        createCurrentTavernInputV1({
          resources: {
            apRemaining: parseNonNegativeSafeInteger(0),
            cash: parseMoney(2),
            playerStamina: parseNonNegativeSafeInteger(1),
            heroineStamina: parseNonNegativeSafeInteger(1),
          },
        }),
      ),
    ).toMatchObject({ allowed: false, rejectionCodes: ["calendar.insufficient_ap"] });

    const plan = createTavernPlanV1();
    const session = createOpeningSessionV1(plan);
    const active = deepFreezePocValueV1({
      basis: "active_opening_baseline" as const,
      plan,
      session,
    });
    expect(resolver.preview(active)).toMatchObject({
      basis: "active_opening_baseline",
      openingCosts: { commitment: "committed", ingredientShortages: [] },
    });
    const differentPlan = deepFreezePocValueV1({
      ...plan,
      menu: [
        { recipeId: parseRecipeId("recipe.b"), portions: parseQuantity(2) },
        { recipeId: parseRecipeId("recipe.a"), portions: parseQuantity(1) },
      ],
    });
    expect(() => resolver.preview({ ...active, plan: differentPlan })).toThrow();
    expect(() =>
      resolver.preview({ ...createCurrentTavernInputV1(), extra: true } as never),
    ).toThrow();
  });

  it("uses stable largest remainders for reception and planned-portion caps", () => {
    const resolver = createPocTavernSettlementResolverV1(createTavernDataV1());
    const session = createOpeningSessionV1();
    const draft = resolver.settle({ session }, noDrawRuleRngV1());
    expect(draft.orders).toEqual([
      {
        segmentId: "segment.a",
        recipeId: "recipe.a",
        potentialCustomers: 3,
        effectiveOrders: 2,
        capacityAccepted: 1,
        actualSales: 1,
      },
      {
        segmentId: "segment.a",
        recipeId: "recipe.b",
        potentialCustomers: 3,
        effectiveOrders: 1,
        capacityAccepted: 1,
        actualSales: 1,
      },
      {
        segmentId: "segment.b",
        recipeId: "recipe.a",
        potentialCustomers: 3,
        effectiveOrders: 2,
        capacityAccepted: 1,
        actualSales: 0,
      },
      {
        segmentId: "segment.b",
        recipeId: "recipe.b",
        potentialCustomers: 3,
        effectiveOrders: 1,
        capacityAccepted: 1,
        actualSales: 1,
      },
    ]);
    expect(draft).toMatchObject({
      receptionCapacity: 4,
      preparationCapacity: 4,
      discardedPortions: [{ recipeId: "recipe.b", portions: 1 }],
      appliedModifiers: [],
    });
    expect(draft.entries.reduce((sum, entry) => sum + entry.cashDelta, 0)).toBe(19);
    expect(draft.effects).toEqual(
      expect.arrayContaining([
        {
          kind: "relationship.teamwork.adjust",
          delta: 1,
          reasonId: "reason.fixture",
        },
        {
          kind: "actor.mood.adjust",
          actorId: "actor.heroine",
          delta: -1,
          reasonId: "reason.fixture",
        },
      ]),
    );

    const currentPreview = resolver.preview(createCurrentTavernInputV1());
    expect(currentPreview.expectedSales).toEqual([
      { recipeId: "recipe.a", range: { min: 1, max: 1 } },
      { recipeId: "recipe.b", range: { min: 0, max: 2 } },
    ]);
    expect(currentPreview.cashDelta).toEqual({ min: 3, max: 17 });
    expectPreviewContainsSettlementV1(currentPreview, draft);
    const activePreview = resolver.preview({
      basis: "active_opening_baseline",
      plan: createTavernPlanV1(),
      session,
    });
    expect(activePreview.cashDelta).toEqual({ min: 5, max: 19 });
    expectPreviewContainsSettlementV1(activePreview, draft);
  });

  it("clamps aggregate Tavern modifiers once and preserves their provenance", () => {
    const serviceCost: ModifierV1 = {
      kind: "service_cost.add",
      source: { kind: "story", sourceId: parseModifierSourceId("modifier.fixture") },
      modes: ["manual"],
      amount: parseSafeInteger(-5),
      reasonId: parseReasonId("reason.fixture_adjust"),
    };
    const capacityDown: ModifierV1 = {
      kind: "capacity.add",
      source: { kind: "story", sourceId: parseModifierSourceId("modifier.fixture") },
      modes: ["manual"],
      amount: parseSafeInteger(-9),
      reasonId: parseReasonId("reason.fixture.aura"),
    };
    const preparationDown: ModifierV1 = {
      kind: "prep_points.add",
      source: { kind: "story", sourceId: parseModifierSourceId("modifier.fixture") },
      modes: ["manual"],
      amount: parseSafeInteger(-9),
      reasonId: parseReasonId("reason.fixture.mood"),
    };
    const laterCapacity: ModifierV1 = {
      kind: "capacity.add",
      source: { kind: "event", eventId: parseEventId("event.fixture") },
      modes: ["manual"],
      amount: parseSafeInteger(3),
      reasonId: parseReasonId("reason.fixture_consume"),
    };
    const resolver = createPocTavernSettlementResolverV1(createTavernDataV1());
    const session = createOpeningSessionV1(
      createTavernPlanV1(),
      [serviceCost, capacityDown, preparationDown],
      [laterCapacity],
      100,
    );
    const draft = resolver.settle({ session }, noDrawRuleRngV1());
    expect(draft.receptionCapacity).toBe(0);
    expect(draft.preparationCapacity).toBe(0);
    expect(draft.appliedModifiers).toEqual([
      { modifier: serviceCost, contribution: -5 },
      { modifier: capacityDown, contribution: -9 },
      { modifier: preparationDown, contribution: -9 },
      { modifier: laterCapacity, contribution: 3 },
    ]);
    expect(draft.effects).toContainEqual({
      kind: "reputation.adjust",
      delta: -1,
      reasonId: "reason.fixture",
    });
  });

  it("evaluates endings from typed policy, definition identity, and post-effect outcomes", () => {
    const base = createPocGameplayFixtureV1().program.data;
    const stable = base.content.endings.find(({ status }) => status === "completed_stable");
    if (stable === undefined) throw new TypeError("missing stable ending fixture");
    const stateDefinitions = {
      ...base.stateDefinitions,
      outcomes: base.stateDefinitions.outcomes.map((definition) =>
        definition.outcomeId === "outcome.fixture.relationship" && definition.value.kind === "token"
          ? {
              ...definition,
              value: {
                ...definition.value,
                allowedValues: [...definition.value.allowedValues, "token.fixture.completed"],
              },
            }
          : definition,
      ),
    };
    const stableWithEffect = {
      ...stable,
      effects: [
        {
          kind: "outcome.set" as const,
          outcomeId: "outcome.fixture.relationship",
          value: { kind: "token" as const, value: "token.fixture.completed" },
          reasonId: "reason.fixture",
        },
      ],
    };
    const data = pocSimulationDataSchemaV1.parse({
      ...base,
      stateDefinitions,
      content: {
        ...base.content,
        endings: [base.content.endings[1], base.content.endings[2], stableWithEffect],
      },
    });
    const evaluate = createPocRulesV1(data).endings.evaluate;
    const input = createEndingInputV1();
    const before = structuredClone(input);
    expect(evaluate(input)).toMatchObject({
      endingId: "ending.fixture",
      status: "completed_stable",
      reasonIds: ["reason.ending.stable"],
      effects: stableWithEffect.effects,
      summary: {
        relationship: {
          outcomeId: "outcome.fixture.relationship",
          value: { kind: "token", value: "token.fixture.completed" },
        },
        investigation: { outcomeId: "outcome.fixture.investigation" },
      },
    });
    expect(input).toEqual(before);
    expect(
      [
        { cash: 19, reputation: 50, facilityIds: [parseFacilityId("facility.fixture")] },
        { cash: 20, reputation: 49, facilityIds: [parseFacilityId("facility.fixture")] },
        { cash: 20, reputation: 50, facilityIds: [] },
      ].map((entry) => evaluate(createEndingInputV1(entry))),
    ).toEqual([
      expect.objectContaining({ status: "completed_danger" }),
      expect.objectContaining({ status: "completed_danger" }),
      expect.objectContaining({ status: "completed_danger" }),
    ]);
    expect(evaluate(createEndingInputV1({ cash: 19, reputation: 45 }))).toMatchObject({
      reasonIds: ["reason.ending.danger"],
    });
    expect(evaluate(createEndingInputV1({ cash: 19, reputation: 44 }))).toMatchObject({
      reasonIds: ["reason.ending.danger", "reason.ending.reputation_crisis"],
    });
    expect(evaluate(createEndingInputV1({ levyKind: "arrears" }))).toMatchObject({
      endingId: "ending.fixture_arrears",
      status: "failed_arrears",
      reasonIds: ["reason.ending.arrears"],
    });

    const alternate = pocSimulationDataSchemaV1.parse({
      ...base,
      balance: {
        ...base.balance,
        endingPolicy: {
          ...base.balance.endingPolicy,
          stableMinimumCashAfterLevy: 21,
          stableReasonId: "reason.fixture.alternate_stable",
          dangerReasonId: "reason.fixture.alternate_danger",
        },
      },
      content: {
        ...base.content,
        reasons: [
          ...base.content.reasons,
          { reasonId: "reason.fixture.alternate_danger", textId: "text.fixture" },
          { reasonId: "reason.fixture.alternate_stable", textId: "text.fixture" },
        ],
      },
    });
    expect(createPocRulesV1(alternate).endings.evaluate(createEndingInputV1())).toMatchObject({
      endingId: "ending.fixture_danger",
      status: "completed_danger",
      reasonIds: ["reason.fixture.alternate_danger"],
    });
  });

  it("evaluates all seventeen Condition kinds against one immutable observation", () => {
    const data = createPocGameplayFixtureV1().program.data;
    const observation = createConditionObservationV1();
    const conditions: readonly ConditionV1[] = [
      { kind: "actor.rank_at_least", attribute: "body", rank: "B" },
      { kind: "relationship.stage_is", stage: "cold" },
      { kind: "relationship.affection_at_least", value: parseSafeInteger(3) },
      {
        kind: "fact.equals",
        factId: parseFactId("fact.fixture"),
        value: { kind: "boolean", value: false },
      },
      {
        kind: "quest.status_is",
        questId: parseQuestId("quest.fixture"),
        status: "locked",
      },
      {
        kind: "outcome.equals",
        outcomeId: parseOutcomeId("outcome.fixture.relationship"),
        value: { kind: "token", value: parseStoryToken("token.fixture.neutral") },
      },
      {
        kind: "aura.present",
        auraId: parseAuraId("aura.fixture_timed"),
        target: { kind: "actor", actorId: "actor.player" },
      },
      {
        kind: "inventory.ingredient_at_least",
        ingredientId: parseIngredientId("ingredient.fixture"),
        quantity: parseQuantity(3),
      },
      { kind: "tavern.helper_tier_at_least", tier: "skilled" },
      {
        kind: "tavern.facility_opportunity_undecided",
        opportunityId: parseActionId("action.fixture_facility"),
      },
      { kind: "tavern.reputation_at_least", value: parseNonNegativeSafeInteger(50) },
      { kind: "calendar.day_at_least", day: parseDayIndex(1) },
      { kind: "calendar.day_at_most", day: parseDayIndex(1) },
      { kind: "calendar.matches", day: parseDayIndex(1), phases: ["morning"] },
      { kind: "narrative.not_active" },
      { kind: "run.started" },
      { kind: "run.status_is", status: "active" },
    ];
    const before = structuredClone(observation);
    expect(evaluatePocConditionsV1(conditions, observation, data)).toBe(true);
    expect(evaluatePocConditionsV1([], observation, data)).toBe(true);
    expect(
      evaluatePocConditionsV1(
        [...conditions, { kind: "actor.rank_at_least", attribute: "social", rank: "S" }],
        observation,
        data,
      ),
    ).toBe(false);
    expect(
      evaluatePocConditionsV1(
        [
          {
            kind: "aura.present",
            auraId: parseAuraId("aura.fixture_timed"),
            target: { kind: "tavern" },
          },
        ],
        observation,
        data,
      ),
    ).toBe(false);
    expect(observation).toEqual(before);
  });

  it("schedules all same-context candidates by priority then EventId without applying effects", () => {
    const base = createPocGameplayFixtureV1().program.data;
    const event = base.content.events[0];
    if (event === undefined) throw new TypeError("missing scheduling fixture event");
    const makeEvent = (
      eventId: string,
      priority: number,
      when: readonly ConditionV1[] = [],
      effects: typeof event.effects = [],
    ) => ({
      ...event,
      eventId: parseEventId(eventId),
      checkpointId: parseCheckpointId(eventId.replace("event.", "checkpoint.")),
      priority: parseSafeInteger(priority),
      when,
      effects,
    });
    const orderedData = deepFreezePocValueV1({
      ...base,
      content: {
        ...base.content,
        events: [
          makeEvent("event.fixture_low", 10),
          makeEvent("event.fixture_z", 20),
          makeEvent("event.fixture_a", 20),
        ],
      },
    });
    const observation = createConditionObservationV1();
    const input = deepFreezePocValueV1({
      context: { kind: "phase.entered" as const, day: parseDayIndex(1), phase: "morning" as const },
      observation,
    });
    const before = structuredClone(input);
    const resolver = createPocSchedulingResolverV1(orderedData);
    expect(resolver.resolve(input).map(({ eventId }) => eventId)).toEqual([
      "event.fixture_a",
      "event.fixture_z",
      "event.fixture_low",
    ]);
    expect(input).toEqual(before);
    const dayGetter = vi.fn(() => observation.state.simulation.calendar.day);
    const calendarWithAccessor = { ...observation.state.simulation.calendar };
    Object.defineProperty(calendarWithAccessor, "day", {
      configurable: true,
      enumerable: true,
      get: dayGetter,
    });
    expect(() =>
      resolver.resolve({
        ...input,
        observation: {
          ...observation,
          state: {
            ...observation.state,
            simulation: {
              ...observation.state.simulation,
              calendar: calendarWithAccessor,
            },
          },
        },
      }),
    ).toThrow();
    expect(dayGetter).not.toHaveBeenCalled();

    const enableEffect = {
      kind: "fact.set" as const,
      factId: parseFactId("fact.fixture"),
      value: { kind: "boolean" as const, value: true },
      reasonId: parseReasonId("reason.fixture"),
    };
    const snapshotData = deepFreezePocValueV1({
      ...base,
      content: {
        ...base.content,
        events: [
          makeEvent("event.fixture_enable", 20, [], [enableEffect]),
          makeEvent("event.fixture_requires", 10, [
            {
              kind: "fact.equals",
              factId: parseFactId("fact.fixture"),
              value: { kind: "boolean", value: true },
            },
          ]),
        ],
      },
    });
    expect(
      createPocSchedulingResolverV1(snapshotData)
        .resolve(input)
        .map(({ eventId }) => eventId),
    ).toEqual(["event.fixture_enable"]);
  });

  it("rejects unsupported weighted pools and never reads platform entropy or time", () => {
    const base = createPocGameplayFixtureV1().program.data;
    const event = base.content.events[0];
    if (event === undefined) throw new TypeError("missing scheduling fixture event");
    const weightedData = deepFreezePocValueV1({
      ...base,
      content: {
        ...base.content,
        events: [
          {
            ...event,
            weightedGroupId: parseWeightedGroupId("weighted.fixture"),
            weight: parseNonNegativeSafeInteger(1),
          },
        ],
      },
    });
    expect(() => createPocSchedulingResolverV1(weightedData)).toThrow();

    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new TypeError("Math.random is forbidden");
    });
    const now = vi.spyOn(Date, "now").mockImplementation(() => {
      throw new TypeError("Date.now is forbidden");
    });
    try {
      const rules = createPocRulesV1(base);
      const rng = tracedRuleRngV1([1, 0, 0]);
      rules.demand.resolve(
        {
          runId: createPocGameplayFixtureV1().bootstrap.runId,
          segments: [
            {
              day: parseDayIndex(1),
              segmentId: parseCustomerSegmentId("segment.fixture"),
              baseCustomers: parseNonNegativeSafeInteger(1),
            },
          ],
        },
        rng.rng,
      );
      rules.checks.resolve(createCheckInputV1(), rng.rng);
      rules.endings.evaluate(createEndingInputV1());
      expect(random).not.toHaveBeenCalled();
      expect(now).not.toHaveBeenCalled();
      expect(Object.isFrozen(rules)).toBe(true);
    } finally {
      random.mockRestore();
      now.mockRestore();
    }
  });

  it("strictly validates all patched rule outputs before exposing them", () => {
    const fixture = createPocGameplayFixtureV1();
    const data = fixture.program.data;
    const baseRules = createPocRulesV1(data);
    expect(Object.keys(pocRuleOutputSchemaBySlotV1)).toEqual(pocStoryRuleSlotsV1);

    const demandInput: DemandProjectionInputV1 = deepFreezePocValueV1({
      day: parseDayIndex(1),
      seeds: [
        {
          segmentId: parseCustomerSegmentId("segment.fixture"),
          baseCustomers: parseNonNegativeSafeInteger(1),
          randomOffset: 0,
        },
      ],
      reputation: parseNonNegativeSafeInteger(50),
      facts: fixture.snapshot.state.story.facts,
      modifiers: [],
    });
    const validDemand = baseRules.demand.preview(demandInput);
    const extraOutputRules = createValidatedPocRulesV1(data, {
      ...baseRules,
      demand: {
        ...baseRules.demand,
        preview() {
          return { ...validDemand, extra: true } as never;
        },
      },
    });
    expect(() => extraOutputRules.demand.preview(demandInput)).toThrow("invalid output");

    const invalidRangeRules = createValidatedPocRulesV1(data, {
      ...baseRules,
      demand: {
        ...baseRules.demand,
        preview() {
          return {
            ...validDemand,
            lines: validDemand.lines.map((line) => ({
              ...line,
              range: { min: line.actualCustomers + 1, max: line.actualCustomers + 1 },
            })),
          } as never;
        },
      },
    });
    expect(() => invalidRangeRules.demand.preview(demandInput)).toThrow("invalid output");
    const negativeRangeRules = createValidatedPocRulesV1(data, {
      ...baseRules,
      demand: {
        ...baseRules.demand,
        preview() {
          return {
            ...validDemand,
            lines: validDemand.lines.map((line) => ({
              ...line,
              range: { min: -1, max: line.actualCustomers },
            })),
          } as never;
        },
      },
    });
    expect(() => negativeRangeRules.demand.preview(demandInput)).toThrow("invalid output");

    const thenableRules = createValidatedPocRulesV1(data, {
      ...baseRules,
      demand: {
        ...baseRules.demand,
        preview() {
          return Promise.resolve(validDemand) as never;
        },
      },
    });
    expect(() => thenableRules.demand.preview(demandInput)).toThrow("returned a thenable");

    const demandSeedInput: DemandSeedInputV1 = deepFreezePocValueV1({
      runId: fixture.bootstrap.runId,
      segments: [
        {
          day: parseDayIndex(1),
          segmentId: parseCustomerSegmentId("segment.fixture"),
          baseCustomers: parseNonNegativeSafeInteger(1),
        },
      ],
    });
    const validDemandSeed = baseRules.demand.resolve(demandSeedInput, tracedRuleRngV1([1]).rng);
    const mismatchedDemandSeedRules = createValidatedPocRulesV1(data, {
      ...baseRules,
      demand: {
        ...baseRules.demand,
        resolve() {
          return {
            lines: validDemandSeed.lines.map((line) => ({
              ...line,
              day: parseDayIndex(line.day + 1),
            })),
          };
        },
      },
    });
    expect(() =>
      mismatchedDemandSeedRules.demand.resolve(demandSeedInput, noDrawRuleRngV1()),
    ).toThrow("invalid output");

    const tavernData = createTavernDataV1();
    const tavernBaseRules = createPocRulesV1(tavernData);
    const settlementInput = { session: createOpeningSessionV1() };
    const validDraft = tavernBaseRules.tavern.settle(settlementInput, noDrawRuleRngV1());
    const undeclaredEffectRules = createValidatedPocRulesV1(tavernData, {
      ...tavernBaseRules,
      tavern: {
        ...tavernBaseRules.tavern,
        settle() {
          return { ...validDraft, effects: [{ kind: "undeclared.effect" }] } as never;
        },
      },
    });
    expect(() => undeclaredEffectRules.tavern.settle(settlementInput, noDrawRuleRngV1())).toThrow(
      "invalid output",
    );
    const forgedSettlementRules = createValidatedPocRulesV1(tavernData, {
      ...tavernBaseRules,
      tavern: {
        ...tavernBaseRules.tavern,
        settle() {
          return {
            ...validDraft,
            effects: [
              {
                kind: "calendar.ap.adjust",
                delta: parseSafeInteger(0),
                reasonId: parseReasonId("reason.fixture"),
              },
            ],
            entries: [],
          };
        },
      },
    });
    expect(() => forgedSettlementRules.tavern.settle(settlementInput, noDrawRuleRngV1())).toThrow(
      "invalid output",
    );
    const invalidAllocationRules = createValidatedPocRulesV1(tavernData, {
      ...tavernBaseRules,
      tavern: {
        ...tavernBaseRules.tavern,
        settle() {
          return {
            ...validDraft,
            orders: validDraft.orders.map((line, index) =>
              index === 0 ? { ...line, actualSales: line.capacityAccepted + 1 } : line,
            ),
          } as never;
        },
      },
    });
    expect(() => invalidAllocationRules.tavern.settle(settlementInput, noDrawRuleRngV1())).toThrow(
      "invalid output",
    );
    const forgedCapacityRules = createValidatedPocRulesV1(tavernData, {
      ...tavernBaseRules,
      tavern: {
        ...tavernBaseRules.tavern,
        settle() {
          return {
            ...validDraft,
            receptionCapacity: validDraft.receptionCapacity + 1,
            preparationCapacity: validDraft.preparationCapacity + 1,
          } as never;
        },
      },
    });
    expect(() => forgedCapacityRules.tavern.settle(settlementInput, noDrawRuleRngV1())).toThrow(
      "invalid output",
    );

    const tavernPreviewInput = createCurrentTavernInputV1();
    const validTavernPreview = tavernBaseRules.tavern.preview(tavernPreviewInput);
    const freeOpeningRules = createValidatedPocRulesV1(tavernData, {
      ...tavernBaseRules,
      tavern: {
        ...tavernBaseRules.tavern,
        preview() {
          return {
            ...validTavernPreview,
            allowed: true,
            rejectionCodes: [],
            openingCosts: {
              ...validTavernPreview.openingCosts,
              ap: 0,
              playerStamina: 0,
              heroineStamina: 0,
              cash: {
                ...validTavernPreview.openingCosts.cash,
                wage: 0,
                openingFee: 0,
                modifierDelta: 0,
                total: 0,
                appliedModifiers: [],
              },
            },
          } as never;
        },
      },
    });
    expect(() => freeOpeningRules.tavern.preview(tavernPreviewInput)).toThrow("invalid output");
    const mismatchedBasisRules = createValidatedPocRulesV1(tavernData, {
      ...tavernBaseRules,
      tavern: {
        ...tavernBaseRules.tavern,
        preview() {
          return { ...validTavernPreview, basis: "active_opening_baseline" } as never;
        },
      },
    });
    expect(() => mismatchedBasisRules.tavern.preview(tavernPreviewInput)).toThrow("invalid output");

    const checkInput = createCheckInputV1();
    const validCheckPreview = baseRules.checks.describe(checkInput);
    const invalidCheckPreviewRules = createValidatedPocRulesV1(data, {
      ...baseRules,
      checks: {
        ...baseRules.checks,
        describe() {
          return { ...validCheckPreview, totalBonus: validCheckPreview.totalBonus + 1 } as never;
        },
      },
    });
    expect(() => invalidCheckPreviewRules.checks.describe(checkInput)).toThrow("invalid output");

    const validCheckResult = baseRules.checks.resolve(checkInput, tracedRuleRngV1([3, 2]).rng);
    const invalidCheckResultRules = createValidatedPocRulesV1(data, {
      ...baseRules,
      checks: {
        ...baseRules.checks,
        resolve() {
          return { ...validCheckResult, total: validCheckResult.total + 1 } as never;
        },
      },
    });
    expect(() => invalidCheckResultRules.checks.resolve(checkInput, noDrawRuleRngV1())).toThrow(
      "invalid output",
    );

    const endingInput = createEndingInputV1();
    const validEnding = baseRules.endings.evaluate(endingInput);
    const mismatchedEndingRules = createValidatedPocRulesV1(data, {
      ...baseRules,
      endings: {
        evaluate() {
          return { ...validEnding, status: "completed_danger" } as never;
        },
      },
    });
    expect(() => mismatchedEndingRules.endings.evaluate(endingInput)).toThrow("invalid output");
  });
});
