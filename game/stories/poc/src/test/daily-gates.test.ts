// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { describe, expect, it } from "vitest";

import { pocBalanceV1, pocServiceDaysV1 } from "../content/balance.js";
import {
  pocCharacterDefinitionsV1,
  pocCustomerSegmentDefinitionsV1,
  pocItemDefinitionsV1,
  pocModifierSourceDefinitionsV1,
  pocReasonDefinitionsV1,
  pocStoryManifestV1,
  pocTextEntriesV1,
} from "../content/core-definitions.js";
import {
  pocIngredientDefinitionsV1,
  pocRecipeDefinitionsV1,
} from "../content/ingredients-recipes.js";
import {
  actionIdsV1,
  characterIdsV1,
  customerSegmentIdsV1,
  factIdsV1,
  ingredientIdsV1,
  itemIdsV1,
  modifierSourceIdsV1,
  outcomeIdsV1,
  pocTextIdsV1,
  reasonIdsV1,
  recipeIdsV1,
  relationshipOutcomeTokensV1,
  investigationOutcomeTokensV1,
  textIdsV1,
} from "../content/ids.js";
import { pocInitialStateV1, pocStateDefinitionsV1 } from "../content/state-definitions.js";
import {
  pocStoryBalanceSchemaV1,
  pocStoryInitialStateSchemaV1,
  pocStoryStateDefinitionsSchemaV1,
} from "../gameplay/index.js";

function expectDeeplyFrozenV1(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeeplyFrozenV1(nested, seen);
}

describe("PoC source economy data", () => {
  it("encodes the closed source economy components", () => {
    expect(pocIngredientDefinitionsV1).toHaveLength(5);
    expect(pocRecipeDefinitionsV1).toHaveLength(4);
    expect(pocBalanceV1.lifePolicies).toHaveLength(2);
    expect(pocCustomerSegmentDefinitionsV1).toHaveLength(2);
    expect(pocStoryManifestV1).toEqual({
      titleTextId: "text.poc.story.title",
      initialSceneId: "scene.manifest_start",
      playableDays: 7,
    });
    expect(pocTextEntriesV1.map(({ textId }) => textId)).toEqual(textIdsV1);
    expect(pocTextEntriesV1.every((entry) => Object.keys(entry).join() === "textId")).toBe(true);
    expect(pocCharacterDefinitionsV1).toEqual([
      {
        characterId: "character.narrator",
        nameTextId: "text.poc.character.narrator.name",
        actorId: null,
      },
      {
        characterId: "character.player",
        nameTextId: "text.poc.character.player.name",
        actorId: "actor.player",
      },
      {
        characterId: "character.heroine",
        nameTextId: "text.poc.character.heroine.name",
        actorId: "actor.heroine",
      },
    ]);
    expect(pocCharacterDefinitionsV1.map(({ characterId }) => characterId)).toEqual(characterIdsV1);
    expect(pocReasonDefinitionsV1.map(({ reasonId }) => reasonId)).toEqual(reasonIdsV1);
    expect(pocReasonDefinitionsV1.map(({ textId }) => textId)).toEqual(
      reasonIdsV1.map((reasonId) => `text.poc.${reasonId}`),
    );
    expect(pocCustomerSegmentDefinitionsV1).toEqual([
      { segmentId: "segment.locals", nameTextId: "text.poc.segment.locals.name" },
      { segmentId: "segment.travelers", nameTextId: "text.poc.segment.travelers.name" },
    ]);
    expect(pocCustomerSegmentDefinitionsV1.map(({ segmentId }) => segmentId)).toEqual(
      customerSegmentIdsV1,
    );
    expect(pocModifierSourceDefinitionsV1).toEqual([
      {
        sourceId: "modifier_source.reputation",
        nameTextId: "text.poc.modifier_source.reputation.name",
      },
      {
        sourceId: "modifier_source.war_clue",
        nameTextId: "text.poc.modifier_source.war_clue.name",
      },
    ]);
    expect(pocModifierSourceDefinitionsV1.map(({ sourceId }) => sourceId)).toEqual(
      modifierSourceIdsV1,
    );
    expect(pocItemDefinitionsV1.map(({ itemId }) => itemId)).toEqual(itemIdsV1);
    expect(pocItemDefinitionsV1).toEqual([]);
  });

  it("encodes exact Ingredient and Recipe values without an alternate valuation model", () => {
    expect(pocIngredientDefinitionsV1).toEqual([
      {
        ingredientId: "ingredient.coarse_grain",
        nameTextId: "text.poc.ingredient.coarse_grain.name",
        unitPrice: 1,
        shelfLifeDays: 7,
        refrigeratable: false,
      },
      {
        ingredientId: "ingredient.root_vegetable",
        nameTextId: "text.poc.ingredient.root_vegetable.name",
        unitPrice: 1,
        shelfLifeDays: 3,
        refrigeratable: true,
      },
      {
        ingredientId: "ingredient.ale",
        nameTextId: "text.poc.ingredient.ale.name",
        unitPrice: 2,
        shelfLifeDays: 7,
        refrigeratable: false,
      },
      {
        ingredientId: "ingredient.fresh_meat",
        nameTextId: "text.poc.ingredient.fresh_meat.name",
        unitPrice: 3,
        shelfLifeDays: 2,
        refrigeratable: true,
      },
      {
        ingredientId: "ingredient.herb",
        nameTextId: "text.poc.ingredient.herb.name",
        unitPrice: 2,
        shelfLifeDays: 3,
        refrigeratable: true,
      },
    ]);
    expect(pocIngredientDefinitionsV1.map(({ ingredientId }) => ingredientId)).toEqual(
      ingredientIdsV1,
    );

    expect(pocRecipeDefinitionsV1).toEqual([
      {
        recipeId: "recipe.grain_root_porridge",
        nameTextId: "text.poc.recipe.grain_root_porridge.name",
        ingredients: [
          { ingredientId: "ingredient.coarse_grain", quantity: 1 },
          { ingredientId: "ingredient.root_vegetable", quantity: 1 },
        ],
        salePrice: 5,
        prepPoints: 1,
        preferences: [
          { segmentId: "segment.locals", value: 3 },
          { segmentId: "segment.travelers", value: 1 },
        ],
      },
      {
        recipeId: "recipe.ale_bread",
        nameTextId: "text.poc.recipe.ale_bread.name",
        ingredients: [
          { ingredientId: "ingredient.coarse_grain", quantity: 1 },
          { ingredientId: "ingredient.ale", quantity: 1 },
        ],
        salePrice: 6,
        prepPoints: 1,
        preferences: [
          { segmentId: "segment.locals", value: 2 },
          { segmentId: "segment.travelers", value: 3 },
        ],
      },
      {
        recipeId: "recipe.hunter_stew",
        nameTextId: "text.poc.recipe.hunter_stew.name",
        ingredients: [
          { ingredientId: "ingredient.fresh_meat", quantity: 1 },
          { ingredientId: "ingredient.root_vegetable", quantity: 1 },
          { ingredientId: "ingredient.herb", quantity: 1 },
        ],
        salePrice: 12,
        prepPoints: 2,
        preferences: [
          { segmentId: "segment.locals", value: 3 },
          { segmentId: "segment.travelers", value: 2 },
        ],
      },
      {
        recipeId: "recipe.traveler_roast",
        nameTextId: "text.poc.recipe.traveler_roast.name",
        ingredients: [
          { ingredientId: "ingredient.fresh_meat", quantity: 1 },
          { ingredientId: "ingredient.ale", quantity: 1 },
          { ingredientId: "ingredient.herb", quantity: 1 },
        ],
        salePrice: 13,
        prepPoints: 2,
        preferences: [
          { segmentId: "segment.locals", value: 1 },
          { segmentId: "segment.travelers", value: 3 },
        ],
      },
    ]);
    expect(pocRecipeDefinitionsV1.map(({ recipeId }) => recipeId)).toEqual(recipeIdsV1);
  });
});

describe("PoC state definitions and initial values", () => {
  it("uses stable-ID order for definitions and exact authored defaults", () => {
    expect(pocStateDefinitionsV1).toEqual({
      facts: [
        {
          factId: "fact.invoice_checked_this_week",
          value: { kind: "boolean", defaultValue: false },
        },
        {
          factId: "fact.tutorial_first_service_completed",
          value: { kind: "boolean", defaultValue: false },
        },
        { factId: "fact.war_clue", value: { kind: "boolean", defaultValue: false } },
      ],
      quests: [],
      outcomes: [
        {
          outcomeId: "outcome.investigation",
          value: {
            kind: "token",
            defaultValue: "investigation.not_attempted",
            allowedValues: investigationOutcomeTokensV1,
          },
        },
        {
          outcomeId: "outcome.relationship_opportunity",
          value: {
            kind: "token",
            defaultValue: "relationship.pending",
            allowedValues: relationshipOutcomeTokensV1,
          },
        },
      ],
    });
    expect(new Set(pocStateDefinitionsV1.facts.map(({ factId }) => factId))).toEqual(
      new Set(factIdsV1),
    );
    expect(new Set(pocStateDefinitionsV1.outcomes.map(({ outcomeId }) => outcomeId))).toEqual(
      new Set(outcomeIdsV1),
    );
    expect(pocStoryStateDefinitionsSchemaV1.parse(pocStateDefinitionsV1)).toEqual(
      pocStateDefinitionsV1,
    );
  });

  it("initializes every source-owned value exactly once", () => {
    expect(pocInitialStateV1).toEqual({
      player: {
        actorId: "actor.player",
        stamina: { current: 10, maximum: 10 },
        mood: 0,
        attributes: { body: "C", social: "C", intellect: "B" },
      },
      heroine: {
        actorId: "actor.heroine",
        stamina: { current: 10, maximum: 10 },
        mood: 0,
      },
      relationship: { affection: 0, teamwork: 0, stage: "cold" },
      cash: 70,
      reputation: 50,
      helper: { unlocked: false, tier: "apprentice" },
      unlockedRecipeIds: recipeIdsV1.toSorted(),
      ingredientBatches: [],
      itemStacks: [],
      auras: [],
    });
    expect(pocStoryInitialStateSchemaV1.parse(pocInitialStateV1)).toEqual(pocInitialStateV1);
    expect(pocInitialStateV1.ingredientBatches).toEqual([]);
    expect(pocInitialStateV1.itemStacks).toEqual([]);
    expect(pocInitialStateV1.auras).toEqual([]);
  });
});

describe("PoC balance", () => {
  it("freezes the exact policy, action-cost, and service-mode tables", () => {
    expect(pocServiceDaysV1).toEqual([1, 2, 3, 4, 5, 6]);
    expect(pocBalanceV1.lifePolicies).toEqual([
      {
        policyId: "policy.balanced",
        nameTextId: "text.poc.policy.balanced.name",
        apByPhase: { morning: 2, afternoon: 2, evening: 2 },
        playerNightRecovery: 3,
        nightRecoveryReasonId: "reason.recovery.balanced_night",
      },
      {
        policyId: "policy.night_owl",
        nameTextId: "text.poc.policy.night_owl.name",
        apByPhase: { morning: 1, afternoon: 2, evening: 3 },
        playerNightRecovery: 2,
        nightRecoveryReasonId: "reason.recovery.night_owl_night",
      },
    ]);
    expect(pocBalanceV1.actionCosts).toEqual([
      {
        action: "inventory.buy",
        apCost: 1,
        playerStaminaCost: 1,
        heroineStaminaCost: 0,
        reasonId: "reason.action.purchase",
      },
      {
        action: "actor.prepare_food",
        apCost: 1,
        playerStaminaCost: 1,
        heroineStaminaCost: 0,
        reasonId: "reason.action.prepare_food",
      },
      {
        action: "actor.rest",
        apCost: 1,
        playerStaminaCost: 0,
        heroineStaminaCost: 0,
        reasonId: "reason.action.rest",
      },
      {
        action: "facility.choose.build",
        apCost: 2,
        playerStaminaCost: 1,
        heroineStaminaCost: 0,
        reasonId: "reason.action.facility_build",
      },
    ]);
    expect(pocBalanceV1.serviceModes).toEqual([
      {
        mode: "manual",
        availability: [
          {
            conditions: [{ kind: "calendar.day_at_least", day: 1 }],
            reasonId: "reason.unavailable.service_mode_locked",
          },
        ],
        confirmation: {
          benefitTextIds: ["text.poc.confirmation.benefit.service_manual_control"],
          mutuallyExcludedActionIds: [],
          majorRiskTextIds: ["text.poc.confirmation.risk.service_manual_stamina"],
        },
        reasonId: "reason.service.manual",
        apCost: 2,
        playerStaminaCost: 3,
        heroineStaminaCost: 3,
        wage: 0,
        baseReceptionCapacity: 10,
        basePreparationPoints: 6,
        teamworkGain: 2,
        preparationPointsPerAction: 4,
      },
      {
        mode: "assisted",
        availability: [
          {
            conditions: [{ kind: "calendar.day_at_least", day: 2 }],
            reasonId: "reason.unavailable.service_mode_locked",
          },
          {
            conditions: [{ kind: "tavern.helper_tier_at_least", tier: "apprentice" }],
            reasonId: "reason.unavailable.helper_locked",
          },
        ],
        confirmation: {
          benefitTextIds: ["text.poc.confirmation.benefit.service_assisted_capacity"],
          mutuallyExcludedActionIds: [],
          majorRiskTextIds: ["text.poc.confirmation.risk.service_assisted_cost"],
        },
        reasonId: "reason.service.assisted",
        apCost: 1,
        playerStaminaCost: 1,
        heroineStaminaCost: 2,
        wage: 5,
        baseReceptionCapacity: 8,
        basePreparationPoints: 6,
        teamworkGain: 1,
        preparationPointsPerAction: 4,
      },
      {
        mode: "delegated",
        availability: [
          {
            conditions: [{ kind: "calendar.day_at_least", day: 3 }],
            reasonId: "reason.unavailable.service_mode_locked",
          },
          {
            conditions: [{ kind: "tavern.helper_tier_at_least", tier: "apprentice" }],
            reasonId: "reason.unavailable.helper_locked",
          },
        ],
        confirmation: {
          benefitTextIds: ["text.poc.confirmation.benefit.service_delegated_recovery"],
          mutuallyExcludedActionIds: [],
          majorRiskTextIds: ["text.poc.confirmation.risk.service_delegated_wage"],
        },
        reasonId: "reason.service.delegated",
        apCost: 0,
        playerStaminaCost: 0,
        heroineStaminaCost: 0,
        wage: 7,
        baseReceptionCapacity: 7,
        basePreparationPoints: 7,
        teamworkGain: 0,
        preparationPointsPerAction: 2,
      },
      {
        mode: "closed",
        availability: [
          {
            conditions: [{ kind: "calendar.day_at_least", day: 3 }],
            reasonId: "reason.unavailable.service_mode_locked",
          },
        ],
        confirmation: {
          benefitTextIds: ["text.poc.confirmation.benefit.service_closed_recovery"],
          mutuallyExcludedActionIds: [],
          majorRiskTextIds: ["text.poc.confirmation.risk.service_closed_income"],
        },
        reasonId: "reason.service.closed",
        apCost: 0,
        playerStaminaCost: 0,
        heroineStaminaCost: 0,
        wage: 0,
        baseReceptionCapacity: 0,
        basePreparationPoints: 0,
        teamworkGain: 0,
        preparationPointsPerAction: 0,
      },
    ]);
  });

  it("freezes demand, ledger, forecast, ending, and interpreter limits", () => {
    expect(Object.keys(pocBalanceV1)).toEqual([
      "lifePolicies",
      "actionCosts",
      "serviceModes",
      "serviceDays",
      "baseDemand",
      "ledgerReasons",
      "emergencyClosure",
      "plannedClosureReasonId",
      "heroineNightRecovery",
      "heroineNightRecoveryReasonId",
      "restRecovery",
      "purchaseLineLimit",
      "menuRecipeLimit",
      "dailyPreparationLimit",
      "openingFee",
      "levyAmount",
      "levyDue",
      "obligationForecast",
      "endingPolicy",
      "maxNarrativeStepsPerCommand",
      "maxNarrativeCallDepth",
    ]);
    expect(pocBalanceV1.baseDemand).toEqual(
      [
        [1, 6, 2],
        [2, 5, 3],
        [3, 7, 2],
        [4, 4, 5],
        [5, 3, 7],
        [6, 6, 4],
      ].flatMap(([day, locals, travelers]) => [
        { day, segmentId: "segment.locals", customers: locals },
        { day, segmentId: "segment.travelers", customers: travelers },
      ]),
    );
    expect(pocBalanceV1.ledgerReasons).toEqual({
      purchase: "reason.ledger.purchase",
      serviceWage: "reason.ledger.wage",
      openingFee: "reason.ledger.opening_fee",
      revenue: "reason.ledger.revenue",
      discardedFood: "reason.ledger.discarded_food",
      spoiledIngredient: "reason.ledger.spoiled_ingredient",
      facilityBuild: "reason.ledger.facility_build",
      worldActionCost: "reason.ledger.world_action_cost",
      levy: "reason.ledger.levy",
    });
    expect(pocBalanceV1).toMatchObject({
      emergencyClosure: {
        reputationPenalty: 1,
        reasonId: "reason.service.emergency_closed",
      },
      plannedClosureReasonId: "reason.service.closed",
      heroineNightRecovery: 3,
      heroineNightRecoveryReasonId: "reason.recovery.heroine_night",
      restRecovery: 3,
      purchaseLineLimit: 5,
      menuRecipeLimit: 2,
      dailyPreparationLimit: 2,
      openingFee: 2,
      levyAmount: 140,
      levyDue: { day: 7, phase: "afternoon" },
      obligationForecast: {
        visibleFrom: { day: 3, phase: "morning" },
        conservativeFrom: { day: 5, phase: "morning" },
        reasonId: "reason.obligation.levy_forecast",
      },
      endingPolicy: {
        stableMinimumCashAfterLevy: 20,
        stableMinimumReputation: 50,
        stableMinimumBuiltFacilities: 1,
        reputationCrisisBelow: 45,
      },
      maxNarrativeStepsPerCommand: 128,
      maxNarrativeCallDepth: 8,
    });
    expect(pocBalanceV1.obligationForecast.recommendations).toEqual([
      {
        textId: "text.poc.obligation.recommendation.personal_service",
        actionId: "action.service_plan",
        appliesTo: ["current_gap"],
      },
      {
        textId: "text.poc.obligation.recommendation.cheap_menu",
        actionId: null,
        appliesTo: ["current_gap"],
      },
      {
        textId: "text.poc.obligation.recommendation.avoid_overbuying",
        actionId: null,
        appliesTo: ["current_gap"],
      },
      {
        textId: "text.poc.obligation.recommendation.committed_plan_review",
        actionId: null,
        appliesTo: ["committed_plan_conservative"],
      },
      {
        textId: "text.poc.obligation.recommendation.replay_ledger",
        actionId: null,
        appliesTo: ["final"],
      },
    ]);
    expect(Object.values(pocBalanceV1.endingPolicy).slice(4)).toEqual([
      "reason.ending.stable",
      "reason.ending.danger",
      "reason.ending.arrears",
      "reason.ending.reputation_crisis",
    ]);
  });

  it("is strict, referentially closed, canonical, and deeply frozen", () => {
    const knownTextIds = new Set<string>(textIdsV1);
    const knownReasonIds = new Set<string>(reasonIdsV1);
    const knownIngredientIds = new Set<string>(ingredientIdsV1);
    const knownSegmentIds = new Set<string>(customerSegmentIdsV1);
    const knownActionIds = new Set<string>(actionIdsV1);

    const referencedTextIds = [
      ...pocCharacterDefinitionsV1.map(({ nameTextId }) => nameTextId),
      ...pocReasonDefinitionsV1.map(({ textId }) => textId),
      ...pocCustomerSegmentDefinitionsV1.map(({ nameTextId }) => nameTextId),
      ...pocModifierSourceDefinitionsV1.map(({ nameTextId }) => nameTextId),
      ...pocIngredientDefinitionsV1.map(({ nameTextId }) => nameTextId),
      ...pocRecipeDefinitionsV1.map(({ nameTextId }) => nameTextId),
      ...pocBalanceV1.lifePolicies.map(({ nameTextId }) => nameTextId),
      ...pocBalanceV1.serviceModes.flatMap(({ confirmation }) => [
        ...confirmation.benefitTextIds,
        ...confirmation.majorRiskTextIds,
      ]),
      ...pocBalanceV1.obligationForecast.recommendations.map(({ textId }) => textId),
    ];
    expect(referencedTextIds.every((textId) => knownTextIds.has(textId))).toBe(true);

    const referencedReasonIds = [
      ...pocBalanceV1.lifePolicies.map(({ nightRecoveryReasonId }) => nightRecoveryReasonId),
      ...pocBalanceV1.actionCosts.map(({ reasonId }) => reasonId),
      ...pocBalanceV1.serviceModes.flatMap(({ reasonId, availability }) => [
        reasonId,
        ...availability.map((gate) => gate.reasonId),
      ]),
      ...Object.values(pocBalanceV1.ledgerReasons),
      pocBalanceV1.emergencyClosure.reasonId,
      pocBalanceV1.plannedClosureReasonId,
      pocBalanceV1.heroineNightRecoveryReasonId,
      pocBalanceV1.obligationForecast.reasonId,
      pocBalanceV1.endingPolicy.stableReasonId,
      pocBalanceV1.endingPolicy.dangerReasonId,
      pocBalanceV1.endingPolicy.arrearsReasonId,
      pocBalanceV1.endingPolicy.reputationCrisisReasonId,
    ];
    expect(referencedReasonIds.every((reasonId) => knownReasonIds.has(reasonId))).toBe(true);
    expect(
      pocRecipeDefinitionsV1.every(
        (recipe) =>
          recipe.ingredients.every(({ ingredientId }) => knownIngredientIds.has(ingredientId)) &&
          recipe.preferences.every(({ segmentId }) => knownSegmentIds.has(segmentId)),
      ),
    ).toBe(true);
    expect(
      pocBalanceV1.obligationForecast.recommendations.every(
        ({ actionId }) => actionId === null || knownActionIds.has(actionId),
      ),
    ).toBe(true);

    expect(pocStoryBalanceSchemaV1.parse(pocBalanceV1)).toEqual(pocBalanceV1);
    expect(() => pocStoryBalanceSchemaV1.parse({ ...pocBalanceV1, extra: true })).toThrow();
    const { maxNarrativeCallDepth: _removed, ...missingBalanceField } = pocBalanceV1;
    expect(() => pocStoryBalanceSchemaV1.parse(missingBalanceField)).toThrow();
    expect(() =>
      pocStoryInitialStateSchemaV1.parse({ ...pocInitialStateV1, extra: true }),
    ).toThrow();
    expect(() =>
      pocStoryStateDefinitionsSchemaV1.parse({ ...pocStateDefinitionsV1, extra: true }),
    ).toThrow();

    expect(pocTextIdsV1.obligationRecommendationPersonalService).toBe(
      "text.poc.obligation.recommendation.personal_service",
    );
    for (const value of [
      pocStoryManifestV1,
      pocTextEntriesV1,
      pocCharacterDefinitionsV1,
      pocReasonDefinitionsV1,
      pocCustomerSegmentDefinitionsV1,
      pocModifierSourceDefinitionsV1,
      pocItemDefinitionsV1,
      pocIngredientDefinitionsV1,
      pocRecipeDefinitionsV1,
      pocStateDefinitionsV1,
      pocInitialStateV1,
      pocServiceDaysV1,
      pocBalanceV1,
    ]) {
      expectDeeplyFrozenV1(value);
    }
  });
});
