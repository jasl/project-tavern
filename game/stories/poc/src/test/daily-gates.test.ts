// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { describe, expect, it } from "vitest";

import { pocActionDefinitionsV1 } from "../content/actions.js";
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
import { pocEventDefinitionsV1 } from "../content/events.js";
import {
  pocAuraDefinitionsV1,
  pocFacilityDefinitionsV1,
  pocFacilityOpportunityDefinitionsV1,
} from "../content/facilities-auras.js";
import {
  actionIdsV1,
  auraIdsV1,
  characterIdsV1,
  customerSegmentIdsV1,
  eventIdsV1,
  factIdsV1,
  facilityIdsV1,
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
import { pocNarrativeD1D4V1 } from "../content/narrative/d1-d4.js";
import { pocInitialStateV1, pocStateDefinitionsV1 } from "../content/state-definitions.js";
import {
  pocStoryBalanceSchemaV1,
  pocStoryInitialStateSchemaV1,
  pocStoryStateDefinitionsSchemaV1,
  pocNarrativeProgramSchemaV1,
  type NarrativeNodeV1,
  type NarrativeSceneV1,
} from "../gameplay/index.js";

function expectDeeplyFrozenV1(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeeplyFrozenV1(nested, seen);
}

function narrativeNodeSuccessorsV1(node: NarrativeNodeV1): readonly string[] {
  switch (node.kind) {
    case "line":
    case "narration":
    case "command":
    case "eventCheckpoint":
    case "stageCue":
      return [node.nextNodeId];
    case "choice":
      return node.choices.map(({ nextNodeId }) => nextNodeId);
    case "condition":
      return [node.passNodeId, node.failNodeId];
    case "check":
      return node.branches.map(({ nextNodeId }) => nextNodeId);
    case "jump":
      return [node.targetNodeId];
    case "call":
      return [node.returnNodeId];
    case "return":
    case "end":
      return [];
  }
  return [];
}

function validateNarrativeReachabilityV1(scenes: readonly NarrativeSceneV1[]): readonly string[] {
  const errors: string[] = [];
  const scenesById = new Map<string, NarrativeSceneV1>(
    scenes.map((scene) => [scene.sceneId, scene]),
  );

  for (const scene of scenes) {
    const nodesById = new Map<string, NarrativeNodeV1>(
      scene.nodes.map((node) => [node.nodeId, node]),
    );
    if (nodesById.size !== scene.nodes.length) errors.push(`${scene.sceneId}: duplicate NodeId`);
    if (!nodesById.has(scene.entryNodeId)) errors.push(`${scene.sceneId}: missing entry node`);

    for (const node of scene.nodes) {
      if (node.kind === "call") {
        const target = scenesById.get(node.sceneId);
        if (target === undefined || target.entryNodeId !== node.entryNodeId) {
          errors.push(`${scene.sceneId}/${node.nodeId}: invalid call target`);
        }
      }
      for (const targetId of narrativeNodeSuccessorsV1(node)) {
        if (!nodesById.has(targetId)) {
          errors.push(`${scene.sceneId}/${node.nodeId}: missing target ${targetId}`);
        }
      }
    }

    const reachable = new Set<string>();
    const pending = [scene.entryNodeId as string];
    while (pending.length > 0) {
      const nodeId = pending.pop();
      if (nodeId === undefined || reachable.has(nodeId)) continue;
      reachable.add(nodeId);
      const node = nodesById.get(nodeId);
      if (node !== undefined) pending.push(...narrativeNodeSuccessorsV1(node));
    }
    for (const node of scene.nodes) {
      if (!reachable.has(node.nodeId)) errors.push(`${scene.sceneId}: unreachable ${node.nodeId}`);
    }
  }

  return errors;
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
        nameTextId: "text.poc.service_mode.manual.name",
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
        nameTextId: "text.poc.service_mode.assisted.name",
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
        nameTextId: "text.poc.service_mode.delegated.name",
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
        nameTextId: "text.poc.service_mode.closed.name",
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
      "purchaseQuantityPerLineLimit",
      "menuRecipeLimit",
      "menuPortionsPerRecipeLimit",
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
      purchaseQuantityPerLineLimit: 99,
      menuRecipeLimit: 2,
      menuPortionsPerRecipeLimit: 99,
      dailyPreparationLimit: 2,
      openingFee: 1,
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
      ...pocBalanceV1.serviceModes.flatMap(({ nameTextId, confirmation }) => [
        nameTextId,
        ...confirmation.benefitTextIds,
        ...confirmation.majorRiskTextIds,
      ]),
      ...pocFacilityOpportunityDefinitionsV1.map(({ skipLabelTextId }) => skipLabelTextId),
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
    expect(() =>
      pocStoryBalanceSchemaV1.parse({
        ...pocBalanceV1,
        purchaseQuantityPerLineLimit: 1_000,
      }),
    ).toThrow();
    expect(() =>
      pocStoryBalanceSchemaV1.parse({
        ...pocBalanceV1,
        menuPortionsPerRecipeLimit: 1_000,
      }),
    ).toThrow();
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

describe("PoC D1-D4 authored surface", () => {
  it("freezes the exact early-week content owners", () => {
    expect(pocActionDefinitionsV1.map(({ actionId }) => actionId)).toEqual(actionIdsV1);
    expect(pocAuraDefinitionsV1).toHaveLength(3);
    expect(pocEventDefinitionsV1).toHaveLength(5);
    expect(pocFacilityDefinitionsV1).toHaveLength(2);
    expect(pocFacilityOpportunityDefinitionsV1).toEqual([
      expect.objectContaining({
        opportunityId: "action.facility_window",
        facilityIds: ["facility.cold_storage", "facility.comfortable_bed"],
      }),
    ]);
    expect(pocEventDefinitionsV1.map((event) => event.eventId)).toEqual([
      "event.tutorial_first_service",
      "event.supplier_invoice",
      "event.helper_available",
      "event.facility_window",
      "event.levy_due",
    ]);
    expect(pocNarrativeD1D4V1.map(({ sceneId }) => sceneId)).toEqual([
      "scene.manifest_start",
      "scene.supplier_invoice",
      "scene.facility_window",
      "scene.levy_due",
    ]);
  });

  it("maps all eleven Actions to their exact command and occupation contracts", () => {
    expect(
      pocActionDefinitionsV1.map(
        ({ actionId, labelTextId, commandKind, availablePhases, occupation }) => ({
          actionId,
          labelTextId,
          commandKind,
          availablePhases,
          occupation,
        }),
      ),
    ).toEqual([
      {
        actionId: "action.choose_life_policy",
        labelTextId: "text.poc.action.choose_life_policy.label",
        commandKind: "policy.choose",
        availablePhases: ["morning"],
        occupation: { kind: "none" },
      },
      {
        actionId: "action.purchase",
        labelTextId: "text.poc.action.purchase.label",
        commandKind: "inventory.buy",
        availablePhases: ["morning", "afternoon"],
        occupation: { kind: "current_phase" },
      },
      {
        actionId: "action.prepare_food",
        labelTextId: "text.poc.action.prepare_food.label",
        commandKind: "actor.prepare_food",
        availablePhases: ["morning", "afternoon"],
        occupation: { kind: "current_phase" },
      },
      {
        actionId: "action.rest",
        labelTextId: "text.poc.action.rest.label",
        commandKind: "actor.rest",
        availablePhases: ["morning", "afternoon", "evening"],
        occupation: { kind: "current_phase" },
      },
      {
        actionId: "action.service_plan",
        labelTextId: "text.poc.action.service_plan.label",
        commandKind: "tavern.plan.set",
        availablePhases: ["morning", "afternoon"],
        occupation: { kind: "fixed", phases: ["evening"] },
      },
      {
        actionId: "action.advance_phase",
        labelTextId: "text.poc.action.advance_phase.label",
        commandKind: "calendar.advance_phase",
        availablePhases: ["morning", "afternoon", "evening"],
        occupation: { kind: "none" },
      },
      {
        actionId: "action.pay_levy",
        labelTextId: "text.poc.action.pay_levy.label",
        commandKind: "levy.pay",
        availablePhases: ["afternoon"],
        occupation: { kind: "none" },
      },
      {
        actionId: "action.facility_window",
        labelTextId: "text.poc.action.facility_window.label",
        commandKind: "facility.choose",
        availablePhases: ["morning", "afternoon"],
        occupation: { kind: "current_phase" },
      },
      {
        actionId: "action.repair_sign_with_heroine",
        labelTextId: "text.poc.action.repair_sign_with_heroine.label",
        commandKind: "story.action.start",
        availablePhases: ["afternoon"],
        occupation: { kind: "fixed", phases: ["afternoon"] },
      },
      {
        actionId: "action.old_trade_road",
        labelTextId: "text.poc.action.old_trade_road.label",
        commandKind: "world.action.begin",
        availablePhases: ["morning"],
        occupation: { kind: "fixed", phases: ["morning", "afternoon"] },
      },
      {
        actionId: "action.apologize_to_heroine",
        labelTextId: "text.poc.action.apologize_to_heroine.label",
        commandKind: "story.action.start",
        availablePhases: ["morning", "afternoon"],
        occupation: { kind: "current_phase" },
      },
    ]);
    expect(
      pocActionDefinitionsV1.every(
        (action) =>
          Object.keys(action).join() ===
          "actionId,labelTextId,commandKind,availablePhases,occupation,visibility,availability,confirmation",
      ),
    ).toBe(true);
  });

  it("freezes Action visibility, availability, and confirmation in authored order", () => {
    const emptyConfirmation = {
      benefitTextIds: [],
      mutuallyExcludedActionIds: [],
      majorRiskTextIds: [],
    };
    const activeD1D6Visibility = [
      {
        conditions: [
          { kind: "run.status_is", status: "active" },
          { kind: "calendar.day_at_most", day: 6 },
        ],
        reasonId: "reason.unavailable.story_window_closed",
      },
    ];
    const confirmation = (
      benefitTextId: string,
      majorRiskTextId: string,
      mutuallyExcludedActionIds: readonly string[] = [],
    ) => ({
      benefitTextIds: [benefitTextId],
      mutuallyExcludedActionIds,
      majorRiskTextIds: [majorRiskTextId],
    });

    expect(
      pocActionDefinitionsV1.map(({ visibility, availability, confirmation: metadata }) => ({
        visibility,
        availability,
        confirmation: metadata,
      })),
    ).toEqual([
      { visibility: [], availability: [], confirmation: emptyConfirmation },
      {
        visibility: activeD1D6Visibility,
        availability: [],
        confirmation: confirmation(
          "text.poc.confirmation.benefit.purchase_stock",
          "text.poc.confirmation.risk.purchase_cash",
        ),
      },
      {
        visibility: activeD1D6Visibility,
        availability: [],
        confirmation: confirmation(
          "text.poc.confirmation.benefit.prepare_food",
          "text.poc.confirmation.risk.prepare_food_stamina",
        ),
      },
      {
        visibility: activeD1D6Visibility,
        availability: [],
        confirmation: confirmation(
          "text.poc.confirmation.benefit.rest_recovery",
          "text.poc.confirmation.risk.rest_time",
        ),
      },
      { visibility: activeD1D6Visibility, availability: [], confirmation: emptyConfirmation },
      { visibility: [], availability: [], confirmation: emptyConfirmation },
      {
        visibility: [
          {
            conditions: [{ kind: "calendar.matches", day: 7, phases: ["afternoon"] }],
            reasonId: "reason.unavailable.tax_not_visible",
          },
        ],
        availability: [],
        confirmation: emptyConfirmation,
      },
      {
        visibility: [
          {
            conditions: [{ kind: "calendar.matches", day: 4, phases: ["morning", "afternoon"] }],
            reasonId: "reason.unavailable.story_window_closed",
          },
          {
            conditions: [
              {
                kind: "tavern.facility_opportunity_undecided",
                opportunityId: "action.facility_window",
              },
            ],
            reasonId: "reason.unavailable.facility_decided",
          },
        ],
        availability: [],
        confirmation: emptyConfirmation,
      },
      {
        visibility: [
          {
            conditions: [{ kind: "calendar.matches", day: 5, phases: ["afternoon"] }],
            reasonId: "reason.unavailable.story_window_closed",
          },
          {
            conditions: [
              {
                kind: "outcome.equals",
                outcomeId: "outcome.relationship_opportunity",
                value: { kind: "token", value: "relationship.pending" },
              },
            ],
            reasonId: "reason.unavailable.relationship_resolved",
          },
        ],
        availability: [
          {
            conditions: [
              {
                kind: "outcome.equals",
                outcomeId: "outcome.investigation",
                value: { kind: "token", value: "investigation.not_attempted" },
              },
            ],
            reasonId: "reason.unavailable.mutually_exclusive",
          },
        ],
        confirmation: confirmation(
          "text.poc.confirmation.benefit.repair_sign_relationship",
          "text.poc.confirmation.risk.repair_sign_conflict",
          ["action.old_trade_road"],
        ),
      },
      {
        visibility: [
          {
            conditions: [{ kind: "calendar.matches", day: 5, phases: ["morning"] }],
            reasonId: "reason.unavailable.story_window_closed",
          },
          {
            conditions: [
              {
                kind: "outcome.equals",
                outcomeId: "outcome.investigation",
                value: { kind: "token", value: "investigation.not_attempted" },
              },
            ],
            reasonId: "reason.unavailable.investigation_resolved",
          },
        ],
        availability: [
          {
            conditions: [
              {
                kind: "outcome.equals",
                outcomeId: "outcome.relationship_opportunity",
                value: { kind: "token", value: "relationship.pending" },
              },
            ],
            reasonId: "reason.unavailable.mutually_exclusive",
          },
        ],
        confirmation: confirmation(
          "text.poc.confirmation.benefit.old_trade_road_clue",
          "text.poc.confirmation.risk.old_trade_road_cost",
          ["action.repair_sign_with_heroine"],
        ),
      },
      {
        visibility: [
          {
            conditions: [{ kind: "calendar.matches", day: 6, phases: ["morning", "afternoon"] }],
            reasonId: "reason.unavailable.story_window_closed",
          },
          {
            conditions: [
              {
                kind: "aura.present",
                auraId: "heroine.angry",
                target: { kind: "actor", actorId: "actor.heroine" },
              },
            ],
            reasonId: "reason.unavailable.heroine_not_angry",
          },
        ],
        availability: [],
        confirmation: confirmation(
          "text.poc.confirmation.benefit.apology_reconcile",
          "text.poc.confirmation.risk.apology_window",
        ),
      },
    ]);
  });

  it("freezes exact Facility, opportunity, and Aura definitions", () => {
    expect(pocFacilityDefinitionsV1).toEqual([
      {
        facilityId: "facility.cold_storage",
        nameTextId: "text.poc.facility.cold_storage.name",
        cashCost: 12,
        modifiers: [
          {
            kind: "shelf_life.add_days",
            source: { kind: "facility", facilityId: "facility.cold_storage" },
            ingredientIds: [
              "ingredient.root_vegetable",
              "ingredient.fresh_meat",
              "ingredient.herb",
            ],
            amount: 2,
            reasonId: "reason.modifier.cold_storage_shelf_life",
          },
        ],
        confirmation: {
          benefitTextIds: ["text.poc.confirmation.benefit.cold_storage_shelf_life"],
          mutuallyExcludedActionIds: [],
          majorRiskTextIds: ["text.poc.confirmation.risk.cold_storage_cost"],
        },
      },
      {
        facilityId: "facility.comfortable_bed",
        nameTextId: "text.poc.facility.comfortable_bed.name",
        cashCost: 12,
        modifiers: [
          {
            kind: "recovery.add",
            source: { kind: "facility", facilityId: "facility.comfortable_bed" },
            actorId: "actor.player",
            amount: 2,
            reasonId: "reason.modifier.comfortable_bed_player_recovery",
          },
          {
            kind: "recovery.add",
            source: { kind: "facility", facilityId: "facility.comfortable_bed" },
            actorId: "actor.heroine",
            amount: 1,
            reasonId: "reason.modifier.comfortable_bed_heroine_recovery",
          },
        ],
        confirmation: {
          benefitTextIds: ["text.poc.confirmation.benefit.comfortable_bed_recovery"],
          mutuallyExcludedActionIds: [],
          majorRiskTextIds: ["text.poc.confirmation.risk.comfortable_bed_cost"],
        },
      },
    ]);
    expect(pocFacilityDefinitionsV1.map(({ facilityId }) => facilityId)).toEqual(facilityIdsV1);
    expect(pocFacilityOpportunityDefinitionsV1).toEqual([
      {
        opportunityId: "action.facility_window",
        skipLabelTextId: "text.poc.choice.facility.skip.label",
        availability: [
          {
            conditions: [
              {
                kind: "tavern.facility_opportunity_undecided",
                opportunityId: "action.facility_window",
              },
            ],
            reasonId: "reason.unavailable.facility_decided",
          },
        ],
        facilityIds: ["facility.cold_storage", "facility.comfortable_bed"],
        confirmation: {
          benefitTextIds: ["text.poc.confirmation.benefit.facility_build_permanent"],
          mutuallyExcludedActionIds: [],
          majorRiskTextIds: ["text.poc.confirmation.risk.facility_exclusive_choice"],
        },
        skipConfirmation: {
          benefitTextIds: ["text.poc.confirmation.benefit.facility_skip_cash"],
          mutuallyExcludedActionIds: [],
          majorRiskTextIds: ["text.poc.confirmation.risk.facility_skip_opportunity"],
        },
        skipReasonId: "reason.action.facility_skip",
      },
    ]);

    expect(pocAuraDefinitionsV1).toEqual([
      {
        auraId: "heroine.angry",
        nameTextId: "text.poc.aura.heroine_angry.name",
        reasonId: "reason.aura.heroine_angry",
        durationPolicy: {
          kind: "countdown",
          unit: "day_end",
          defaultRemaining: 2,
          maximumRemaining: 2,
        },
        visibility: "debuff",
        allowedTargets: [{ kind: "actor", actorId: "actor.heroine" }],
        modifiers: [
          {
            kind: "capacity.add",
            source: { kind: "aura", auraId: "heroine.angry" },
            modes: ["manual", "assisted"],
            amount: -1,
            reasonId: "reason.aura.heroine_angry",
          },
          {
            kind: "teamwork_gain.block",
            source: { kind: "aura", auraId: "heroine.angry" },
            reasonId: "reason.aura.heroine_angry",
          },
        ],
      },
      {
        auraId: "tavern.sign_repaired",
        nameTextId: "text.poc.aura.tavern_sign_repaired.name",
        reasonId: "reason.aura.sign_repaired",
        durationPolicy: {
          kind: "countdown",
          unit: "opening",
          defaultRemaining: 1,
          maximumRemaining: 1,
        },
        visibility: "buff",
        allowedTargets: [{ kind: "tavern" }],
        modifiers: [
          {
            kind: "capacity.add",
            source: { kind: "aura", auraId: "tavern.sign_repaired" },
            modes: ["manual", "assisted"],
            amount: 1,
            reasonId: "reason.aura.sign_repaired",
          },
          {
            kind: "prep_points.add",
            source: { kind: "aura", auraId: "tavern.sign_repaired" },
            modes: ["manual", "assisted"],
            amount: 1,
            reasonId: "reason.aura.sign_repaired",
          },
        ],
      },
      {
        auraId: "player.adventure_strain",
        nameTextId: "text.poc.aura.player_adventure_strain.name",
        reasonId: "reason.aura.adventure_strain",
        durationPolicy: {
          kind: "countdown",
          unit: "night_recovery",
          defaultRemaining: 1,
          maximumRemaining: 1,
        },
        visibility: "debuff",
        allowedTargets: [{ kind: "actor", actorId: "actor.player" }],
        modifiers: [
          {
            kind: "recovery.add",
            source: { kind: "aura", auraId: "player.adventure_strain" },
            actorId: "actor.player",
            amount: -2,
            reasonId: "reason.aura.adventure_strain",
          },
        ],
      },
    ]);
    expect(pocAuraDefinitionsV1.map(({ auraId }) => auraId)).toEqual(auraIdsV1);
  });

  it("freezes all five Scheduler Events in authored order", () => {
    expect(pocEventDefinitionsV1).toEqual([
      {
        eventId: "event.tutorial_first_service",
        checkpointId: "checkpoint.tutorial_first_service",
        trigger: {
          kind: "command.succeeded",
          commandKinds: ["tavern.opening.finalize"],
        },
        priority: 400,
        weightedGroupId: null,
        weight: 0,
        when: [
          { kind: "calendar.matches", day: 1, phases: ["evening"] },
          {
            kind: "fact.equals",
            factId: "fact.tutorial_first_service_completed",
            value: { kind: "boolean", value: false },
          },
        ],
        sceneId: null,
        effects: [
          {
            kind: "fact.set",
            factId: "fact.tutorial_first_service_completed",
            value: { kind: "boolean", value: true },
            reasonId: "reason.event.tutorial_completed",
          },
        ],
      },
      {
        eventId: "event.supplier_invoice",
        checkpointId: "checkpoint.supplier_invoice",
        trigger: { kind: "phase.entered", days: [2], phases: ["morning"] },
        priority: 400,
        weightedGroupId: null,
        weight: 0,
        when: [
          {
            kind: "fact.equals",
            factId: "fact.invoice_checked_this_week",
            value: { kind: "boolean", value: false },
          },
        ],
        sceneId: "scene.supplier_invoice",
        effects: [],
      },
      {
        eventId: "event.helper_available",
        checkpointId: "checkpoint.helper_available",
        trigger: { kind: "day.ended", days: [1] },
        priority: 300,
        weightedGroupId: null,
        weight: 0,
        when: [],
        sceneId: null,
        effects: [
          {
            kind: "tavern.helper.set",
            helper: { unlocked: true, tier: "apprentice" },
            reasonId: "reason.event.helper_unlocked",
          },
        ],
      },
      {
        eventId: "event.facility_window",
        checkpointId: "checkpoint.facility_window",
        trigger: { kind: "phase.entered", days: [4], phases: ["morning"] },
        priority: 300,
        weightedGroupId: null,
        weight: 0,
        when: [
          {
            kind: "tavern.facility_opportunity_undecided",
            opportunityId: "action.facility_window",
          },
        ],
        sceneId: "scene.facility_window",
        effects: [],
      },
      {
        eventId: "event.levy_due",
        checkpointId: "checkpoint.levy_due",
        trigger: { kind: "phase.entered", days: [7], phases: ["morning"] },
        priority: 400,
        weightedGroupId: null,
        weight: 0,
        when: [{ kind: "run.status_is", status: "active" }],
        sceneId: "scene.levy_due",
        effects: [],
      },
    ]);
    expect(pocEventDefinitionsV1.map(({ eventId }) => eventId)).toEqual(eventIdsV1);
  });

  it("keeps D1-D4 and levy Narrative structurally closed and reachable", () => {
    expect(pocNarrativeD1D4V1).toEqual([
      {
        sceneId: "scene.manifest_start",
        entryNodeId: "node.manifest_start.card",
        nodes: [
          {
            kind: "narration",
            nodeId: "node.manifest_start.card",
            textId: "text.poc.narrative.manifest_start.card",
            nextNodeId: "node.manifest_start.end",
          },
          { kind: "end", nodeId: "node.manifest_start.end" },
        ],
      },
      {
        sceneId: "scene.supplier_invoice",
        entryNodeId: "node.supplier_invoice.choice",
        nodes: [
          {
            kind: "choice",
            nodeId: "node.supplier_invoice.choice",
            choices: [
              {
                choiceId: "choice.supplier_invoice.intellect_b",
                textId: "text.poc.choice.supplier_invoice.intellect_b.label",
                showWhen: [],
                enableWhen: [{ kind: "actor.rank_at_least", attribute: "intellect", rank: "B" }],
                disabledReasonId: "reason.unavailable.intellect_b_required",
                confirmation: {
                  benefitTextIds: ["text.poc.confirmation.benefit.invoice_inspect"],
                  mutuallyExcludedActionIds: [],
                  majorRiskTextIds: [],
                },
                effects: [
                  {
                    kind: "ledger.append",
                    entry: {
                      category: "story_reward",
                      reasonId: "reason.event.invoice_checked",
                      cashDelta: 4,
                      valuationDelta: 0,
                      subject: { kind: "event", eventId: "event.supplier_invoice" },
                    },
                  },
                  {
                    kind: "fact.set",
                    factId: "fact.invoice_checked_this_week",
                    value: { kind: "boolean", value: true },
                    reasonId: "reason.event.invoice_checked",
                  },
                ],
                nextNodeId: "node.supplier_invoice.end",
              },
              {
                choiceId: "choice.supplier_invoice.pay_normally",
                textId: "text.poc.choice.supplier_invoice.pay_normally.label",
                showWhen: [],
                enableWhen: [],
                confirmation: {
                  benefitTextIds: [],
                  mutuallyExcludedActionIds: [],
                  majorRiskTextIds: ["text.poc.confirmation.risk.invoice_payment"],
                },
                effects: [],
                nextNodeId: "node.supplier_invoice.end",
              },
            ],
          },
          { kind: "end", nodeId: "node.supplier_invoice.end" },
        ],
      },
      {
        sceneId: "scene.facility_window",
        entryNodeId: "node.facility_window.notice",
        nodes: [
          {
            kind: "narration",
            nodeId: "node.facility_window.notice",
            textId: "text.poc.narrative.facility_window.notice",
            nextNodeId: "node.facility_window.end",
          },
          { kind: "end", nodeId: "node.facility_window.end" },
        ],
      },
      {
        sceneId: "scene.levy_due",
        entryNodeId: "node.levy_due.notice",
        nodes: [
          {
            kind: "narration",
            nodeId: "node.levy_due.notice",
            textId: "text.poc.narrative.levy_due.notice",
            nextNodeId: "node.levy_due.end",
          },
          { kind: "end", nodeId: "node.levy_due.end" },
        ],
      },
    ]);
    expect(validateNarrativeReachabilityV1(pocNarrativeD1D4V1)).toEqual([]);
    expect(pocNarrativeProgramSchemaV1.parse({ scenes: pocNarrativeD1D4V1 })).toEqual({
      scenes: pocNarrativeD1D4V1,
    });

    const supplierChoice = pocNarrativeD1D4V1[1]?.nodes[0];
    if (supplierChoice?.kind !== "choice") throw new TypeError("missing supplier choice node");
    expect("check" in supplierChoice.choices[0]!).toBe(false);
    expect("check" in supplierChoice.choices[1]!).toBe(false);
  });

  it("keeps every early-week source recursively frozen and registry-backed", () => {
    for (const value of [
      pocActionDefinitionsV1,
      pocFacilityDefinitionsV1,
      pocFacilityOpportunityDefinitionsV1,
      pocAuraDefinitionsV1,
      pocEventDefinitionsV1,
      pocNarrativeD1D4V1,
    ]) {
      expectDeeplyFrozenV1(value);
    }
  });
});
