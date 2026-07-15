// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { z } from "zod";
import {
  canonicalJsonBytes,
  parseAssetId,
  rngStateV1Schema,
  type RuntimeSchemaV1,
} from "@sillymaker/base";
import {
  parseActionId,
  parseAuraId,
  parseAuraInstanceId,
  parseBatchId,
  parseCharacterId,
  parseCheckBandId,
  parseCheckId,
  parseCheckpointId,
  parseChoiceId,
  parseCustomerSegmentId,
  parseEndingId,
  parseEventId,
  parseFactId,
  parseFacilityId,
  parseIngredientId,
  parseItemId,
  parseLedgerEntryId,
  parseModifierSourceId,
  parseNodeId,
  parseOpeningSessionId,
  parseOutcomeId,
  parsePolicyId,
  parseQuestId,
  parseReasonId,
  parseRecipeId,
  parseSceneId,
  parseStoryToken,
  parseTextId,
  parseWeightedGroupId,
  parseWorldStepId,
} from "./ids.js";
import type {
  DemandForecastV1,
  LifePolicySelectionProjectionV1,
  ObligationForecastV1,
  PocDebugCommandV1,
  PocDebugCommandValidationErrorV1,
  PocEffectIntentV1,
  PocEffectSourceV1,
  PocFacilitiesProjectionV1,
  PocGameCommandV1,
  PocGameViewV1,
  PocHudProjectionV1,
  PocInventoryProjectionV1,
  PocLedgerProjectionV1,
  PocRejectionReasonV1,
  PocNarrativeProgramV1,
  PocSimulationContentV1,
  PocSimulationDataV1,
  PocSimulationManifestV1,
  PocTavernProjectionV1,
  RunStartControlProjectionV1,
  StoryBalanceV1,
  StoryInitialStateV1,
  StoryStateDefinitionsV1,
  TavernOpeningControlProjectionV1,
} from "./types.js";

import {
  deepFreezePocValueV1,
  parseAbsoluteDayIndex,
  parseAttributeBonus,
  parseDayIndex,
  parseDieFace,
  parseMoney,
  parseMoodPoint,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseQuantity,
  parseSafeInteger,
} from "./values.js";

export class PocRuleInvocationErrorV1 extends TypeError {
  readonly faultCode: "rule.returned_thenable" | "rule.output_invalid";

  constructor(
    faultCode: "rule.returned_thenable" | "rule.output_invalid",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "PocRuleInvocationErrorV1";
    this.faultCode = faultCode;
  }
}

const dangerousObjectKeysV1 = new Set(["__proto__", "prototype", "constructor"]);

/** Rejects values that could observe parsing or cannot participate in Canonical JSON. */
function assertCanonicalDataV1(value: unknown): void {
  const active = new Set<object>();

  const visit = (current: unknown, path: string): void => {
    if (current === null || typeof current === "boolean" || typeof current === "string") return;
    if (typeof current === "number") {
      if (!Number.isSafeInteger(current) || Object.is(current, -0)) {
        throw new TypeError(`invalid canonical number at ${path}`);
      }
      return;
    }
    if (typeof current !== "object") {
      throw new TypeError(`non-JSON value at ${path}`);
    }
    if (active.has(current)) throw new TypeError(`cyclic value at ${path}`);
    if (Object.getOwnPropertySymbols(current).length > 0) {
      throw new TypeError(`symbol property at ${path}`);
    }

    active.add(current);
    try {
      const descriptors = Object.getOwnPropertyDescriptors(current);
      if (Array.isArray(current)) {
        if (Object.getPrototypeOf(current) !== Array.prototype) {
          throw new TypeError(`custom array prototype at ${path}`);
        }
        const expectedKeys = Array.from({ length: current.length }, (_, index) => String(index));
        const actualKeys = Object.keys(descriptors).filter((key) => key !== "length");
        if (
          actualKeys.length !== expectedKeys.length ||
          actualKeys.some((key, index) => key !== expectedKeys[index])
        ) {
          throw new TypeError(`sparse or decorated array at ${path}`);
        }
        for (let index = 0; index < current.length; index += 1) {
          const descriptor = descriptors[String(index)];
          if (
            descriptor === undefined ||
            descriptor.get !== undefined ||
            descriptor.set !== undefined ||
            descriptor.enumerable !== true
          ) {
            throw new TypeError(`invalid array element at ${path}/${index}`);
          }
          visit(descriptor.value, `${path}/${index}`);
        }
        return;
      }

      if (Object.getPrototypeOf(current) !== Object.prototype) {
        throw new TypeError(`custom object prototype at ${path}`);
      }
      for (const [key, descriptor] of Object.entries(descriptors)) {
        if (dangerousObjectKeysV1.has(key)) throw new TypeError(`dangerous key at ${path}`);
        if (
          descriptor.get !== undefined ||
          descriptor.set !== undefined ||
          descriptor.enumerable !== true
        ) {
          throw new TypeError(`accessor or hidden property at ${path}/${key}`);
        }
        visit(descriptor.value, `${path}/${key}`);
      }
    } finally {
      active.delete(current);
    }
  };

  visit(value, "");
  canonicalJsonBytes(value);
}

function parsedValueSchemaV1<T>(label: string, parser: (value: unknown) => T): z.ZodType<T> {
  return z.unknown().transform((value, context): T => {
    try {
      return parser(value);
    } catch {
      context.addIssue({ code: "custom", message: `invalid ${label}` });
      return z.NEVER;
    }
  });
}

/**
 * @internal Runtime schemas are pure and deterministic. Each schema may therefore treat only its
 * own deeply frozen outputs as validated identity tokens on later admission.
 */
export function runtimeSchemaV1<T>(schema: z.ZodType<T>): RuntimeSchemaV1<T> {
  const validatedOutputs = new WeakSet<object>();

  return Object.freeze({
    parse(value: unknown): T {
      if (
        ((typeof value === "object" && value !== null) || typeof value === "function") &&
        validatedOutputs.has(value)
      ) {
        return value as T;
      }

      assertCanonicalDataV1(value);
      const parsed = schema.parse(value);
      canonicalJsonBytes(parsed);
      const frozen = deepFreezePocValueV1(parsed);
      if ((typeof frozen === "object" && frozen !== null) || typeof frozen === "function") {
        validatedOutputs.add(frozen);
      }
      return frozen;
    },
  });
}

const safeIntegerZodSchemaV1 = parsedValueSchemaV1("SafeInteger", parseSafeInteger);
const nonNegativeSafeIntegerZodSchemaV1 = parsedValueSchemaV1(
  "NonNegativeSafeInteger",
  parseNonNegativeSafeInteger,
);
const positiveSafeIntegerZodSchemaV1 = parsedValueSchemaV1(
  "PositiveSafeInteger",
  parsePositiveSafeInteger,
);
const dayIndexZodSchemaV1 = parsedValueSchemaV1("DayIndex", parseDayIndex);
const absoluteDayIndexZodSchemaV1 = parsedValueSchemaV1("AbsoluteDayIndex", parseAbsoluteDayIndex);
const moodPointZodSchemaV1 = parsedValueSchemaV1("MoodPoint", parseMoodPoint);
const moneyZodSchemaV1 = parsedValueSchemaV1("Money", parseMoney);
const quantityZodSchemaV1 = parsedValueSchemaV1("Quantity", parseQuantity);
const attributeBonusZodSchemaV1 = parsedValueSchemaV1("AttributeBonus", parseAttributeBonus);
const dieFaceZodSchemaV1 = parsedValueSchemaV1("DieFace", parseDieFace);

const actionIdZodSchemaV1 = parsedValueSchemaV1("ActionId", parseActionId);
const auraIdZodSchemaV1 = parsedValueSchemaV1("AuraId", parseAuraId);
const auraInstanceIdZodSchemaV1 = parsedValueSchemaV1("AuraInstanceId", parseAuraInstanceId);
const batchIdZodSchemaV1 = parsedValueSchemaV1("BatchId", parseBatchId);
const characterIdZodSchemaV1 = parsedValueSchemaV1("CharacterId", parseCharacterId);
const checkBandIdZodSchemaV1 = parsedValueSchemaV1("CheckBandId", parseCheckBandId);
const checkIdZodSchemaV1 = parsedValueSchemaV1("CheckId", parseCheckId);
const checkpointIdZodSchemaV1 = parsedValueSchemaV1("CheckpointId", parseCheckpointId);
const choiceIdZodSchemaV1 = parsedValueSchemaV1("ChoiceId", parseChoiceId);
const customerSegmentIdZodSchemaV1 = parsedValueSchemaV1(
  "CustomerSegmentId",
  parseCustomerSegmentId,
);
const endingIdZodSchemaV1 = parsedValueSchemaV1("EndingId", parseEndingId);
const eventIdZodSchemaV1 = parsedValueSchemaV1("EventId", parseEventId);
const factIdZodSchemaV1 = parsedValueSchemaV1("FactId", parseFactId);
const facilityIdZodSchemaV1 = parsedValueSchemaV1("FacilityId", parseFacilityId);
const ingredientIdZodSchemaV1 = parsedValueSchemaV1("IngredientId", parseIngredientId);
const itemIdZodSchemaV1 = parsedValueSchemaV1("ItemId", parseItemId);
const ledgerEntryIdZodSchemaV1 = parsedValueSchemaV1("LedgerEntryId", parseLedgerEntryId);
const modifierSourceIdZodSchemaV1 = parsedValueSchemaV1("ModifierSourceId", parseModifierSourceId);
const nodeIdZodSchemaV1 = parsedValueSchemaV1("NodeId", parseNodeId);
const openingSessionIdZodSchemaV1 = parsedValueSchemaV1("OpeningSessionId", parseOpeningSessionId);
const outcomeIdZodSchemaV1 = parsedValueSchemaV1("OutcomeId", parseOutcomeId);
const policyIdZodSchemaV1 = parsedValueSchemaV1("PolicyId", parsePolicyId);
const questIdZodSchemaV1 = parsedValueSchemaV1("QuestId", parseQuestId);
const reasonIdZodSchemaV1 = parsedValueSchemaV1("ReasonId", parseReasonId);
const recipeIdZodSchemaV1 = parsedValueSchemaV1("RecipeId", parseRecipeId);
const sceneIdZodSchemaV1 = parsedValueSchemaV1("SceneId", parseSceneId);
const storyTokenZodSchemaV1 = parsedValueSchemaV1("StoryToken", parseStoryToken);
const textIdZodSchemaV1 = parsedValueSchemaV1("TextId", parseTextId);
const weightedGroupIdZodSchemaV1 = parsedValueSchemaV1("WeightedGroupId", parseWeightedGroupId);
const worldStepIdZodSchemaV1 = parsedValueSchemaV1("WorldStepId", parseWorldStepId);
const assetIdZodSchemaV1 = parsedValueSchemaV1("AssetId", parseAssetId);

const actorIdZodSchemaV1 = z.enum(["actor.player", "actor.heroine"]);
const attributeIdZodSchemaV1 = z.enum(["body", "social", "intellect"]);
const attributeRankZodSchemaV1 = z.enum(["C", "B", "A", "S", "S+"]);
const relationshipStageZodSchemaV1 = z.enum([
  "stranger",
  "dislike",
  "cold",
  "friendly",
  "trust",
  "admiration",
  "lovers",
]);
const calendarPhaseZodSchemaV1 = z.enum(["morning", "afternoon", "evening"]);
const serviceModeZodSchemaV1 = z.enum(["manual", "assisted", "delegated", "closed"]);
const helperTierZodSchemaV1 = z.enum(["apprentice", "skilled", "senior", "master"]);
const questStatusZodSchemaV1 = z.enum(["locked", "active", "completed", "failed"]);

function exhaustivePocGameCommandKindsV1<const TKinds extends readonly PocGameCommandV1["kind"][]>(
  kinds: TKinds &
    (Exclude<PocGameCommandV1["kind"], TKinds[number]> extends never
      ? unknown
      : { readonly __missingCommandKinds: Exclude<PocGameCommandV1["kind"], TKinds[number]> }),
): TKinds {
  return kinds;
}

export const pocGameCommandKindsV1 = Object.freeze(
  exhaustivePocGameCommandKindsV1([
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
  ] as const),
);

const pocGameCommandKindZodSchemaV1 = z.enum(pocGameCommandKindsV1);

const purchaseLineZodSchemaV1 = z.strictObject({
  ingredientId: ingredientIdZodSchemaV1,
  quantity: quantityZodSchemaV1,
});

const purchaseLinesZodSchemaV1 = z
  .array(purchaseLineZodSchemaV1)
  .min(1)
  .max(64)
  .superRefine((lines, context) => {
    const seen = new Set<string>();
    for (const [index, line] of lines.entries()) {
      if (seen.has(line.ingredientId)) {
        context.addIssue({
          code: "custom",
          message: "duplicate inventory purchase ingredient",
          path: [index, "ingredientId"],
        });
      }
      seen.add(line.ingredientId);
    }
  });

const facilityChoiceZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("build"), facilityId: facilityIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("skip") }),
]);

const plannedRecipeZodSchemaV1 = z.strictObject({
  recipeId: recipeIdZodSchemaV1,
  portions: quantityZodSchemaV1,
});

const tavernPlanZodSchemaV1 = z
  .strictObject({
    mode: serviceModeZodSchemaV1,
    menu: z.array(plannedRecipeZodSchemaV1).max(16),
  })
  .superRefine((plan, context) => {
    if (plan.mode === "closed") {
      if (plan.menu.length !== 0) {
        context.addIssue({
          code: "custom",
          message: "closed Tavern plan must have an empty menu",
          path: ["menu"],
        });
      }
      return;
    }
    if (plan.menu.length === 0) {
      context.addIssue({
        code: "custom",
        message: "open Tavern plan must have a non-empty menu",
        path: ["menu"],
      });
    }
    const seen = new Set<string>();
    for (const [index, recipe] of plan.menu.entries()) {
      if (seen.has(recipe.recipeId)) {
        context.addIssue({
          code: "custom",
          message: "duplicate Tavern plan recipe",
          path: ["menu", index, "recipeId"],
        });
      }
      seen.add(recipe.recipeId);
    }
  });

const pocGameCommandZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("run.start") }),
  z.strictObject({ kind: z.literal("policy.choose"), policyId: policyIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("inventory.buy"), lines: purchaseLinesZodSchemaV1 }),
  z.strictObject({ kind: z.literal("actor.prepare_food") }),
  z.strictObject({ kind: z.literal("actor.rest") }),
  z.strictObject({ kind: z.literal("story.action.start"), actionId: actionIdZodSchemaV1 }),
  z.strictObject({
    kind: z.literal("facility.choose"),
    opportunityId: actionIdZodSchemaV1,
    choice: facilityChoiceZodSchemaV1,
  }),
  z.strictObject({ kind: z.literal("tavern.plan.set"), plan: tavernPlanZodSchemaV1 }),
  z.strictObject({ kind: z.literal("tavern.opening.start") }),
  z.strictObject({ kind: z.literal("tavern.opening.continue") }),
  z.strictObject({ kind: z.literal("tavern.opening.finalize") }),
  z.strictObject({
    kind: z.literal("world.action.begin"),
    actionId: actionIdZodSchemaV1,
    optionId: choiceIdZodSchemaV1,
  }),
  z.strictObject({ kind: z.literal("world.action.complete") }),
  z.strictObject({ kind: z.literal("narrative.advance") }),
  z.strictObject({
    kind: z.literal("narrative.choose"),
    sceneId: sceneIdZodSchemaV1,
    nodeId: nodeIdZodSchemaV1,
    choiceId: choiceIdZodSchemaV1,
  }),
  z.strictObject({ kind: z.literal("calendar.advance_phase") }),
  z.strictObject({ kind: z.literal("levy.pay") }),
]);

export const pocGameCommandSchemaV1: RuntimeSchemaV1<PocGameCommandV1> = runtimeSchemaV1(
  pocGameCommandZodSchemaV1 as z.ZodType<PocGameCommandV1>,
);

const pocEffectSourceZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("command"), commandKind: pocGameCommandKindZodSchemaV1 }),
  z.strictObject({ kind: z.literal("event"), eventId: eventIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("story_action"), actionId: actionIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("world_action"), actionId: actionIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("aura"), auraId: auraIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("facility"), facilityId: facilityIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("ending"), endingId: endingIdZodSchemaV1 }),
]);

const debugCommandKindZodSchemaV1 = z.enum([
  "debug.calendar.set_ap",
  "debug.actor.set_stamina",
  "debug.actor.set_mood",
  "debug.relationship.set",
  "debug.inventory.adjust_cash",
  "debug.aura.apply",
  "debug.aura.clear",
  "debug.story.fact.set",
  "debug.narrative.jump",
  "debug.rng.set",
]);

const integerRangeZodSchemaV1 = z
  .strictObject({ min: safeIntegerZodSchemaV1, max: safeIntegerZodSchemaV1 })
  .refine(({ min, max }) => min <= max, "range minimum exceeds maximum");

const staminaStateZodSchemaV1 = z
  .strictObject({
    current: nonNegativeSafeIntegerZodSchemaV1,
    maximum: positiveSafeIntegerZodSchemaV1,
  })
  .refine(({ current, maximum }) => current <= maximum, "stamina exceeds maximum");

const attributeRanksZodSchemaV1 = z.strictObject({
  body: attributeRankZodSchemaV1,
  social: attributeRankZodSchemaV1,
  intellect: attributeRankZodSchemaV1,
});

const playerActorStateZodSchemaV1 = z.strictObject({
  actorId: z.literal("actor.player"),
  stamina: staminaStateZodSchemaV1,
  mood: moodPointZodSchemaV1,
  attributes: attributeRanksZodSchemaV1,
});

const heroineActorStateZodSchemaV1 = z.strictObject({
  actorId: z.literal("actor.heroine"),
  stamina: staminaStateZodSchemaV1,
  mood: moodPointZodSchemaV1,
});

const relationshipStateZodSchemaV1 = z.strictObject({
  affection: safeIntegerZodSchemaV1,
  teamwork: nonNegativeSafeIntegerZodSchemaV1,
  stage: relationshipStageZodSchemaV1,
});

const helperStateZodSchemaV1 = z.strictObject({
  unlocked: z.boolean(),
  tier: helperTierZodSchemaV1,
});

const storyValueZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("boolean"), value: z.boolean() }),
  z.strictObject({ kind: z.literal("integer"), value: safeIntegerZodSchemaV1 }),
  z.strictObject({ kind: z.literal("token"), value: storyTokenZodSchemaV1 }),
]);

const questEntryZodSchemaV1 = z.strictObject({
  questId: questIdZodSchemaV1,
  status: questStatusZodSchemaV1,
  progress: nonNegativeSafeIntegerZodSchemaV1,
  target: positiveSafeIntegerZodSchemaV1,
});

const auraTargetZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("actor"), actorId: actorIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("tavern") }),
  z.strictObject({ kind: z.literal("run") }),
]);

const auraDurationZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("countdown"),
    unit: z.enum(["phase_end", "day_end", "opening", "night_recovery"]),
    remaining: positiveSafeIntegerZodSchemaV1,
  }),
  z.strictObject({ kind: z.literal("until_cleared") }),
]);

const auraDurationPolicyZodSchemaV1 = z
  .discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("countdown"),
      unit: z.enum(["phase_end", "day_end", "opening", "night_recovery"]),
      defaultRemaining: positiveSafeIntegerZodSchemaV1,
      maximumRemaining: positiveSafeIntegerZodSchemaV1,
    }),
    z.strictObject({ kind: z.literal("until_cleared") }),
  ])
  .refine(
    (duration) =>
      duration.kind === "until_cleared" || duration.defaultRemaining <= duration.maximumRemaining,
    "Aura default duration exceeds maximum",
  );

const inventorySourceRefZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("initial"), reasonId: reasonIdZodSchemaV1 }),
  z.strictObject({
    kind: z.literal("purchase"),
    commandSequence: positiveSafeIntegerZodSchemaV1,
  }),
  z.strictObject({ kind: z.literal("story_action"), actionId: actionIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("world_action"), actionId: actionIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("story_event"), eventId: eventIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("debug"), reasonId: reasonIdZodSchemaV1 }),
]);

const auraSourceRefZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("initial"), reasonId: reasonIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("story_event"), eventId: eventIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("story_action"), actionId: actionIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("facility"), facilityId: facilityIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("world_action"), actionId: actionIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("debug"), reasonId: reasonIdZodSchemaV1 }),
]);

const auraInstanceZodSchemaV1 = z.strictObject({
  instanceId: auraInstanceIdZodSchemaV1,
  auraId: auraIdZodSchemaV1,
  target: auraTargetZodSchemaV1,
  source: auraSourceRefZodSchemaV1,
  duration: auraDurationZodSchemaV1,
  appliedAtSequence: nonNegativeSafeIntegerZodSchemaV1,
});

const inventoryBatchZodSchemaV1 = z.strictObject({
  batchId: batchIdZodSchemaV1,
  ingredientId: ingredientIdZodSchemaV1,
  quantity: quantityZodSchemaV1,
  acquiredDay: dayIndexZodSchemaV1,
  lastUsableDay: absoluteDayIndexZodSchemaV1,
  refrigerationExtended: z.boolean(),
  source: inventorySourceRefZodSchemaV1,
});

const itemStackZodSchemaV1 = z.strictObject({
  itemId: itemIdZodSchemaV1,
  quantity: quantityZodSchemaV1,
});

const narrativeCursorZodSchemaV1 = z.strictObject({
  sceneId: sceneIdZodSchemaV1,
  nodeId: nodeIdZodSchemaV1,
});

const rngStateZodSchemaV1 = parsedValueSchemaV1("RngStateV1", (value) =>
  rngStateV1Schema.parse(value),
);

const pocDebugCommandZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("debug.calendar.set_ap"),
    value: nonNegativeSafeIntegerZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("debug.actor.set_stamina"),
    actorId: actorIdZodSchemaV1,
    value: nonNegativeSafeIntegerZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("debug.actor.set_mood"),
    actorId: actorIdZodSchemaV1,
    value: moodPointZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("debug.relationship.set"),
    affection: safeIntegerZodSchemaV1,
    teamwork: nonNegativeSafeIntegerZodSchemaV1,
    stage: relationshipStageZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("debug.inventory.adjust_cash"),
    delta: safeIntegerZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("debug.aura.apply"),
    auraId: auraIdZodSchemaV1,
    target: auraTargetZodSchemaV1,
    duration: auraDurationZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("debug.aura.clear"),
    instanceId: auraInstanceIdZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("debug.story.fact.set"),
    factId: factIdZodSchemaV1,
    value: storyValueZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("debug.narrative.jump"),
    cursor: narrativeCursorZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("debug.rng.set"),
    rng: rngStateZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
]);

export const pocDebugCommandSchemaV1: RuntimeSchemaV1<PocDebugCommandV1> = runtimeSchemaV1(
  pocDebugCommandZodSchemaV1 as z.ZodType<PocDebugCommandV1>,
);

const reasonDebugReferenceZodSchemaV1 = z.strictObject({
  kind: z.literal("reason"),
  reasonId: reasonIdZodSchemaV1,
});
const actorDebugReferenceZodSchemaV1 = z.strictObject({
  kind: z.literal("actor"),
  actorId: actorIdZodSchemaV1,
});
const auraDebugReferenceZodSchemaV1 = z.strictObject({
  kind: z.literal("aura"),
  auraId: auraIdZodSchemaV1,
});
const auraInstanceDebugReferenceZodSchemaV1 = z.strictObject({
  kind: z.literal("aura_instance"),
  instanceId: auraInstanceIdZodSchemaV1,
});
const factDebugReferenceZodSchemaV1 = z.strictObject({
  kind: z.literal("fact"),
  factId: factIdZodSchemaV1,
});
const narrativeNodeDebugReferenceZodSchemaV1 = z.strictObject({
  kind: z.literal("narrative_node"),
  sceneId: sceneIdZodSchemaV1,
  nodeId: nodeIdZodSchemaV1,
});

const pocDebugCommandValidationErrorZodSchemaV1 = z.union([
  z.strictObject({
    code: z.literal("debug.unknown_reference"),
    commandKind: debugCommandKindZodSchemaV1,
    reference: reasonDebugReferenceZodSchemaV1,
  }),
  z.strictObject({
    code: z.literal("debug.unknown_reference"),
    commandKind: z.enum(["debug.actor.set_stamina", "debug.actor.set_mood"]),
    reference: actorDebugReferenceZodSchemaV1,
  }),
  z.strictObject({
    code: z.literal("debug.unknown_reference"),
    commandKind: z.literal("debug.aura.apply"),
    reference: auraDebugReferenceZodSchemaV1,
  }),
  z.strictObject({
    code: z.literal("debug.unknown_reference"),
    commandKind: z.literal("debug.aura.clear"),
    reference: auraInstanceDebugReferenceZodSchemaV1,
  }),
  z.strictObject({
    code: z.literal("debug.unknown_reference"),
    commandKind: z.literal("debug.story.fact.set"),
    reference: factDebugReferenceZodSchemaV1,
  }),
  z.strictObject({
    code: z.literal("debug.unknown_reference"),
    commandKind: z.literal("debug.narrative.jump"),
    reference: narrativeNodeDebugReferenceZodSchemaV1,
  }),
  z.strictObject({
    code: z.literal("debug.value_out_of_range"),
    commandKind: z.literal("debug.actor.set_stamina"),
    field: z.literal("stamina"),
    actual: safeIntegerZodSchemaV1,
    minimum: z.literal(0),
    maximum: nonNegativeSafeIntegerZodSchemaV1,
  }),
  z.strictObject({
    code: z.literal("debug.value_out_of_range"),
    commandKind: z.literal("debug.inventory.adjust_cash"),
    field: z.literal("cash_delta_result"),
    actual: z.string().regex(/^(?:0|-?[1-9]\d*)$/u),
    minimum: z.literal(0),
    maximum: safeIntegerZodSchemaV1,
  }),
  z.strictObject({
    code: z.literal("debug.value_out_of_range"),
    commandKind: z.literal("debug.aura.apply"),
    field: z.literal("aura_duration"),
    actual: safeIntegerZodSchemaV1,
    minimum: z.literal(1),
    maximum: positiveSafeIntegerZodSchemaV1,
  }),
  z.strictObject({
    code: z.literal("debug.story_value_invalid"),
    commandKind: z.literal("debug.story.fact.set"),
    factId: factIdZodSchemaV1,
    value: storyValueZodSchemaV1,
  }),
  z.strictObject({
    code: z.literal("debug.aura_target_not_allowed"),
    commandKind: z.literal("debug.aura.apply"),
    auraId: auraIdZodSchemaV1,
    target: auraTargetZodSchemaV1,
  }),
  z.strictObject({
    code: z.literal("debug.aura_duration_policy_mismatch"),
    commandKind: z.literal("debug.aura.apply"),
    auraId: auraIdZodSchemaV1,
    requested: auraDurationZodSchemaV1,
    expected: auraDurationPolicyZodSchemaV1,
  }),
  z.strictObject({
    code: z.literal("debug.state_conflict"),
    commandKind: z.literal("debug.aura.apply"),
    conflict: z.literal("aura_already_present"),
  }),
  z.strictObject({
    code: z.literal("debug.state_conflict"),
    commandKind: z.literal("debug.narrative.jump"),
    conflict: z.literal("narrative_inactive"),
  }),
]);

export const pocDebugCommandValidationErrorSchemaV1: RuntimeSchemaV1<PocDebugCommandValidationErrorV1> =
  runtimeSchemaV1(
    pocDebugCommandValidationErrorZodSchemaV1 as z.ZodType<PocDebugCommandValidationErrorV1>,
  );

const runStatusZodSchemaV1 = z.enum([
  "setup",
  "active",
  "completed_stable",
  "completed_danger",
  "failed_arrears",
]);
const nonRunStartPocGameCommandKindZodSchemaV1 = z.enum([
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
]);
const openingCheckpointZodSchemaV1 = z.enum([
  "started",
  "middle",
  "before_finalize",
  "ready_to_finalize",
]);
const worldActionProgressZodSchemaV1 = z.enum([
  "begin_scene",
  "awaiting_completion_phase",
  "completion_scene",
  "ready_to_complete",
]);
const activeWorkflowKindZodSchemaV1 = z.enum(["opening", "world_action"]);
const commandReferenceZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("policy"), policyId: policyIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("action"), actionId: actionIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("ingredient"), ingredientId: ingredientIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("recipe"), recipeId: recipeIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("facility"), facilityId: facilityIdZodSchemaV1 }),
  z.strictObject({
    kind: z.literal("facility_opportunity"),
    opportunityId: actionIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("world_option"),
    actionId: actionIdZodSchemaV1,
    optionId: choiceIdZodSchemaV1,
  }),
  z.strictObject({ kind: z.literal("scene"), sceneId: sceneIdZodSchemaV1 }),
  z.strictObject({
    kind: z.literal("node"),
    sceneId: sceneIdZodSchemaV1,
    nodeId: nodeIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("choice"),
    sceneId: sceneIdZodSchemaV1,
    nodeId: nodeIdZodSchemaV1,
    choiceId: choiceIdZodSchemaV1,
  }),
]);
const workflowBlockerZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("opening"), checkpoint: openingCheckpointZodSchemaV1 }),
  z.strictObject({ kind: z.literal("world_action"), progress: worldActionProgressZodSchemaV1 }),
]);
const facilityDecisionZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("built"), facilityId: facilityIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("skipped") }),
]);
const storyRuleSlotZodSchemaV1 = z.enum([
  "demand.preview",
  "demand.resolve",
  "tavern.preview",
  "tavern.settle",
  "checks.describe",
  "checks.resolve",
  "endings.evaluate",
]);
const engineInvariantCodeZodSchemaV1 = z.enum([
  "snapshot.schema",
  "rng.invalid",
  "resource.negative",
  "stamina.above_maximum",
  "calendar.invalid",
  "workflow.conflict",
  "scheduler.multiple_blocking_events",
  "narrative.blocking_conflict",
  "opening.invalid_checkpoint",
  "narrative.invalid_cursor",
  "story.reference_missing",
  "story.value_invalid",
  "collection.duplicate_id",
  "collection.unstable_order",
  "ledger.unbalanced",
  "terminal_state.invalid",
]);

const pocRejectionReasonZodSchemaV1 = z.discriminatedUnion("code", [
  z.strictObject({
    code: z.literal("run.invalid_status"),
    details: z.strictObject({
      actual: runStatusZodSchemaV1,
      allowed: z.array(runStatusZodSchemaV1),
    }),
  }),
  z.strictObject({ code: z.literal("run.already_started"), details: z.strictObject({}) }),
  z.strictObject({
    code: z.literal("run.not_started"),
    details: z.strictObject({ commandKind: nonRunStartPocGameCommandKindZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("run.policy_required"),
    details: z.strictObject({ commandKind: pocGameCommandKindZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("command.unknown_reference"),
    details: z.strictObject({
      commandKind: pocGameCommandKindZodSchemaV1,
      reference: commandReferenceZodSchemaV1,
    }),
  }),
  z.strictObject({
    code: z.literal("command.blocked_by_narrative"),
    details: z.strictObject({
      commandKind: pocGameCommandKindZodSchemaV1,
      cursor: narrativeCursorZodSchemaV1,
    }),
  }),
  z.strictObject({
    code: z.literal("command.blocked_by_workflow"),
    details: z.strictObject({
      commandKind: pocGameCommandKindZodSchemaV1,
      blocker: workflowBlockerZodSchemaV1,
    }),
  }),
  z.strictObject({
    code: z.literal("policy.already_chosen"),
    details: z.strictObject({ policyId: policyIdZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("calendar.invalid_phase"),
    details: z.strictObject({
      actual: calendarPhaseZodSchemaV1,
      allowed: z.array(calendarPhaseZodSchemaV1),
    }),
  }),
  z.strictObject({
    code: z.literal("calendar.insufficient_ap"),
    details: z.strictObject({
      required: nonNegativeSafeIntegerZodSchemaV1,
      available: nonNegativeSafeIntegerZodSchemaV1,
    }),
  }),
  z.strictObject({
    code: z.literal("calendar.phase_blocked"),
    details: z.strictObject({
      blocker: z.enum(["narrative", "opening", "world_action", "evening_unresolved", "levy_due"]),
    }),
  }),
  z.strictObject({
    code: z.literal("action.unavailable"),
    details: z.strictObject({ actionId: actionIdZodSchemaV1, reasonId: reasonIdZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("actor.insufficient_stamina"),
    details: z.strictObject({
      actorId: actorIdZodSchemaV1,
      required: nonNegativeSafeIntegerZodSchemaV1,
      available: nonNegativeSafeIntegerZodSchemaV1,
    }),
  }),
  z.strictObject({
    code: z.literal("actor.stamina_at_maximum"),
    details: z.strictObject({
      actorId: actorIdZodSchemaV1,
      maximum: positiveSafeIntegerZodSchemaV1,
    }),
  }),
  z.strictObject({
    code: z.literal("tavern.preparation_limit_reached"),
    details: z.strictObject({
      current: nonNegativeSafeIntegerZodSchemaV1,
      limit: positiveSafeIntegerZodSchemaV1,
    }),
  }),
  z.strictObject({
    code: z.literal("inventory.invalid_quantity"),
    details: z.strictObject({
      ingredientId: ingredientIdZodSchemaV1,
      quantity: safeIntegerZodSchemaV1,
    }),
  }),
  z.strictObject({
    code: z.literal("inventory.duplicate_line"),
    details: z.strictObject({ ingredientId: ingredientIdZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("inventory.line_limit_exceeded"),
    details: z.strictObject({
      actual: positiveSafeIntegerZodSchemaV1,
      limit: positiveSafeIntegerZodSchemaV1,
    }),
  }),
  z.strictObject({
    code: z.literal("inventory.insufficient_cash"),
    details: z.strictObject({ required: moneyZodSchemaV1, available: moneyZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("inventory.insufficient_ingredient"),
    details: z.strictObject({
      ingredientId: ingredientIdZodSchemaV1,
      required: quantityZodSchemaV1,
      available: nonNegativeSafeIntegerZodSchemaV1,
    }),
  }),
  z.strictObject({
    code: z.literal("facility.unavailable"),
    details: z.strictObject({
      opportunityId: actionIdZodSchemaV1,
      facilityId: facilityIdZodSchemaV1.nullable(),
      reasonId: reasonIdZodSchemaV1,
    }),
  }),
  z.strictObject({
    code: z.literal("facility.target_not_offered"),
    details: z.strictObject({
      opportunityId: actionIdZodSchemaV1,
      facilityId: facilityIdZodSchemaV1,
    }),
  }),
  z.strictObject({
    code: z.literal("facility.already_built"),
    details: z.strictObject({ facilityId: facilityIdZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("facility.choice_committed"),
    details: z.strictObject({
      opportunityId: actionIdZodSchemaV1,
      choice: facilityDecisionZodSchemaV1,
    }),
  }),
  z.strictObject({
    code: z.literal("aura.already_present"),
    details: z.strictObject({ auraId: auraIdZodSchemaV1, target: auraTargetZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("aura.not_found"),
    details: z.strictObject({ auraId: auraIdZodSchemaV1, target: auraTargetZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("tavern.invalid_plan"),
    details: z.strictObject({
      reason: z.enum([
        "menu_size",
        "closed_has_menu",
        "open_has_no_menu",
        "duplicate_recipe",
        "unknown_recipe",
        "locked_recipe",
        "capacity",
        "preparation_capacity",
      ]),
    }),
  }),
  z.strictObject({
    code: z.literal("tavern.plan_frozen"),
    details: z.strictObject({ day: dayIndexZodSchemaV1, phase: calendarPhaseZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("tavern.service_unavailable"),
    details: z.strictObject({ mode: serviceModeZodSchemaV1, reasonId: reasonIdZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("tavern.opening_plan_missing"),
    details: z.strictObject({ day: dayIndexZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("tavern.evening_resolved"),
    details: z.strictObject({
      day: dayIndexZodSchemaV1,
      planMode: serviceModeZodSchemaV1.nullable(),
    }),
  }),
  z.strictObject({
    code: z.literal("tavern.opening_active"),
    details: z.strictObject({ sessionId: openingSessionIdZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("tavern.opening_missing"),
    details: z.strictObject({
      commandKind: z.enum(["tavern.opening.continue", "tavern.opening.finalize"]),
    }),
  }),
  z.strictObject({
    code: z.literal("tavern.opening_checkpoint_blocked"),
    details: z.strictObject({
      checkpoint: openingCheckpointZodSchemaV1,
      eventId: eventIdZodSchemaV1.nullable(),
    }),
  }),
  z.strictObject({
    code: z.literal("tavern.opening_continue_not_needed"),
    details: z.strictObject({ checkpoint: z.literal("ready_to_finalize") }),
  }),
  z.strictObject({
    code: z.literal("tavern.opening_not_ready"),
    details: z.strictObject({ checkpoint: openingCheckpointZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("workflow.conflict"),
    details: z.strictObject({
      activeKind: activeWorkflowKindZodSchemaV1,
      attemptedKind: activeWorkflowKindZodSchemaV1,
    }),
  }),
  z.strictObject({
    code: z.literal("workflow.missing"),
    details: z.strictObject({
      expectedKind: activeWorkflowKindZodSchemaV1,
      commandKind: z.literal("world.action.complete"),
    }),
  }),
  z.strictObject({
    code: z.literal("world.action_unavailable"),
    details: z.strictObject({
      actionId: actionIdZodSchemaV1,
      optionId: choiceIdZodSchemaV1.nullable(),
      reasonId: reasonIdZodSchemaV1,
    }),
  }),
  z.strictObject({
    code: z.literal("world.action_wrong_phase"),
    details: z.strictObject({
      actionId: actionIdZodSchemaV1,
      expected: calendarPhaseZodSchemaV1,
      actual: calendarPhaseZodSchemaV1,
    }),
  }),
  z.strictObject({
    code: z.literal("narrative.inactive"),
    details: z.strictObject({ commandKind: z.enum(["narrative.advance", "narrative.choose"]) }),
  }),
  z.strictObject({
    code: z.literal("narrative.cursor_mismatch"),
    details: z.strictObject({
      expected: narrativeCursorZodSchemaV1,
      actual: narrativeCursorZodSchemaV1.nullable(),
    }),
  }),
  z.strictObject({
    code: z.literal("narrative.choice_required"),
    details: z.strictObject({ cursor: narrativeCursorZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("narrative.choice_hidden"),
    details: z.strictObject({ choiceId: choiceIdZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("narrative.choice_disabled"),
    details: z.strictObject({ choiceId: choiceIdZodSchemaV1, reasonId: reasonIdZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("levy.not_due"),
    details: z.strictObject({ day: dayIndexZodSchemaV1, phase: calendarPhaseZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("story.rule_rejected"),
    details: z.strictObject({ slot: storyRuleSlotZodSchemaV1, reasonId: reasonIdZodSchemaV1 }),
  }),
  z.strictObject({
    code: z.literal("engine.invariant_rejected"),
    details: z.strictObject({ invariantCode: engineInvariantCodeZodSchemaV1 }),
  }),
]);

export const pocRejectionReasonSchemaV1: RuntimeSchemaV1<PocRejectionReasonV1> = runtimeSchemaV1(
  pocRejectionReasonZodSchemaV1 as z.ZodType<PocRejectionReasonV1>,
);

const ingredientQuantityZodSchemaV1 = z.strictObject({
  ingredientId: ingredientIdZodSchemaV1,
  quantity: quantityZodSchemaV1,
});

const itemQuantityZodSchemaV1 = z.strictObject({
  itemId: itemIdZodSchemaV1,
  quantity: quantityZodSchemaV1,
});

const ledgerSubjectZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("ingredient"), ingredientId: ingredientIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("item"), itemId: itemIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("recipe"), recipeId: recipeIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("facility"), facilityId: facilityIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("service_mode"), mode: serviceModeZodSchemaV1 }),
  z.strictObject({ kind: z.literal("event"), eventId: eventIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("action"), actionId: actionIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("levy") }),
  z.strictObject({ kind: z.literal("debug") }),
]);

const ledgerEntryDraftZodSchemaV1 = z.strictObject({
  category: z.enum([
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
  ]),
  reasonId: reasonIdZodSchemaV1,
  cashDelta: safeIntegerZodSchemaV1,
  valuationDelta: safeIntegerZodSchemaV1,
  subject: ledgerSubjectZodSchemaV1,
  quantity: quantityZodSchemaV1.optional(),
});

const modifierSourceRefZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("facility"), facilityId: facilityIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("aura"), auraId: auraIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("event"), eventId: eventIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("story"), sourceId: modifierSourceIdZodSchemaV1 }),
]);

const modifierZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("capacity.add"),
    source: modifierSourceRefZodSchemaV1,
    modes: z.array(serviceModeZodSchemaV1),
    amount: safeIntegerZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("prep_points.add"),
    source: modifierSourceRefZodSchemaV1,
    modes: z.array(serviceModeZodSchemaV1),
    amount: safeIntegerZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("recovery.add"),
    source: modifierSourceRefZodSchemaV1,
    actorId: actorIdZodSchemaV1,
    amount: safeIntegerZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("demand.add"),
    source: modifierSourceRefZodSchemaV1,
    segmentId: customerSegmentIdZodSchemaV1,
    amount: safeIntegerZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("check.add"),
    source: modifierSourceRefZodSchemaV1,
    checkId: checkIdZodSchemaV1,
    amount: safeIntegerZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("shelf_life.add_days"),
    source: modifierSourceRefZodSchemaV1,
    ingredientIds: z.array(ingredientIdZodSchemaV1),
    amount: positiveSafeIntegerZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("teamwork_gain.block"),
    source: modifierSourceRefZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("service_cost.add"),
    source: modifierSourceRefZodSchemaV1,
    modes: z.array(serviceModeZodSchemaV1),
    amount: safeIntegerZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
]);

const factSetEffectIntentZodSchemaV1 = z.strictObject({
  kind: z.literal("fact.set"),
  factId: factIdZodSchemaV1,
  value: storyValueZodSchemaV1,
  reasonId: reasonIdZodSchemaV1,
});

const questSetEffectIntentZodSchemaV1 = z.strictObject({
  kind: z.literal("quest.set"),
  quest: questEntryZodSchemaV1,
  reasonId: reasonIdZodSchemaV1,
});

const outcomeSetEffectIntentZodSchemaV1 = z.strictObject({
  kind: z.literal("outcome.set"),
  outcomeId: outcomeIdZodSchemaV1,
  value: storyValueZodSchemaV1,
  reasonId: reasonIdZodSchemaV1,
});

const progressionEffectIntentZodSchemaV1 = z.discriminatedUnion("kind", [
  factSetEffectIntentZodSchemaV1,
  questSetEffectIntentZodSchemaV1,
  outcomeSetEffectIntentZodSchemaV1,
]);

const effectIntentZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("calendar.ap.adjust"),
    delta: safeIntegerZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("reputation.adjust"),
    delta: safeIntegerZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("actor.stamina.adjust"),
    actorId: actorIdZodSchemaV1,
    delta: safeIntegerZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("actor.mood.adjust"),
    actorId: actorIdZodSchemaV1,
    delta: safeIntegerZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("relationship.affection.adjust"),
    delta: safeIntegerZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("relationship.teamwork.adjust"),
    delta: safeIntegerZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("relationship.stage.set"),
    stage: relationshipStageZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("tavern.helper.set"),
    helper: helperStateZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("inventory.grant"),
    lines: z.array(ingredientQuantityZodSchemaV1),
    source: inventorySourceRefZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("inventory.consume"),
    lines: z.array(ingredientQuantityZodSchemaV1),
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("inventory.item.grant"),
    lines: z.array(itemQuantityZodSchemaV1),
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("inventory.item.consume"),
    lines: z.array(itemQuantityZodSchemaV1),
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("aura.apply"),
    auraId: auraIdZodSchemaV1,
    target: auraTargetZodSchemaV1,
    source: auraSourceRefZodSchemaV1,
    duration: auraDurationZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("aura.clear"),
    auraId: auraIdZodSchemaV1,
    target: auraTargetZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  factSetEffectIntentZodSchemaV1,
  questSetEffectIntentZodSchemaV1,
  outcomeSetEffectIntentZodSchemaV1,
  z.strictObject({
    kind: z.literal("modifier.add"),
    lifetime: z.literal("opening_session"),
    modifier: modifierZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({ kind: z.literal("ledger.append"), entry: ledgerEntryDraftZodSchemaV1 }),
]);

export const pocEffectIntentKindsV1 = Object.freeze([
  "calendar.ap.adjust",
  "reputation.adjust",
  "actor.stamina.adjust",
  "actor.mood.adjust",
  "relationship.affection.adjust",
  "relationship.teamwork.adjust",
  "relationship.stage.set",
  "tavern.helper.set",
  "inventory.grant",
  "inventory.consume",
  "inventory.item.grant",
  "inventory.item.consume",
  "aura.apply",
  "aura.clear",
  "fact.set",
  "quest.set",
  "outcome.set",
  "modifier.add",
  "ledger.append",
] as const satisfies readonly PocEffectIntentV1["kind"][]);

export const pocEffectIntentSchemaV1: RuntimeSchemaV1<PocEffectIntentV1> = runtimeSchemaV1(
  effectIntentZodSchemaV1 as z.ZodType<PocEffectIntentV1>,
);

export const pocEffectSourceSchemaV1: RuntimeSchemaV1<PocEffectSourceV1> = runtimeSchemaV1(
  pocEffectSourceZodSchemaV1 as z.ZodType<PocEffectSourceV1>,
);

const conditionZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("actor.rank_at_least"),
    attribute: attributeIdZodSchemaV1,
    rank: attributeRankZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("relationship.stage_is"),
    stage: relationshipStageZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("relationship.affection_at_least"),
    value: safeIntegerZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("fact.equals"),
    factId: factIdZodSchemaV1,
    value: storyValueZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("quest.status_is"),
    questId: questIdZodSchemaV1,
    status: questStatusZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("outcome.equals"),
    outcomeId: outcomeIdZodSchemaV1,
    value: storyValueZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("aura.present"),
    auraId: auraIdZodSchemaV1,
    target: auraTargetZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("inventory.ingredient_at_least"),
    ingredientId: ingredientIdZodSchemaV1,
    quantity: quantityZodSchemaV1,
  }),
  z.strictObject({ kind: z.literal("tavern.helper_tier_at_least"), tier: helperTierZodSchemaV1 }),
  z.strictObject({
    kind: z.literal("tavern.facility_opportunity_undecided"),
    opportunityId: actionIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("tavern.reputation_at_least"),
    value: nonNegativeSafeIntegerZodSchemaV1,
  }),
  z.strictObject({ kind: z.literal("calendar.day_at_least"), day: dayIndexZodSchemaV1 }),
  z.strictObject({ kind: z.literal("calendar.day_at_most"), day: dayIndexZodSchemaV1 }),
  z.strictObject({
    kind: z.literal("calendar.matches"),
    day: dayIndexZodSchemaV1,
    phases: z.array(calendarPhaseZodSchemaV1),
  }),
  z.strictObject({ kind: z.literal("narrative.not_active") }),
  z.strictObject({ kind: z.literal("run.started") }),
  z.strictObject({
    kind: z.literal("run.status_is"),
    status: z.enum(["setup", "active", "completed_stable", "completed_danger", "failed_arrears"]),
  }),
]);

const availabilityGateZodSchemaV1 = z.strictObject({
  conditions: z.array(conditionZodSchemaV1),
  reasonId: reasonIdZodSchemaV1,
});

const confirmationMetadataZodSchemaV1 = z.strictObject({
  benefitTextIds: z.array(textIdZodSchemaV1),
  mutuallyExcludedActionIds: z.array(actionIdZodSchemaV1),
  majorRiskTextIds: z.array(textIdZodSchemaV1),
});

const checkRequestZodSchemaV1 = z.strictObject({
  checkId: checkIdZodSchemaV1,
  actorId: z.literal("actor.player"),
  preparationBonus: safeIntegerZodSchemaV1,
});

const narrativeChoiceZodSchemaV1 = z.strictObject({
  choiceId: choiceIdZodSchemaV1,
  textId: textIdZodSchemaV1,
  showWhen: z.array(conditionZodSchemaV1),
  enableWhen: z.array(conditionZodSchemaV1),
  disabledReasonId: reasonIdZodSchemaV1.optional(),
  confirmation: confirmationMetadataZodSchemaV1,
  check: checkRequestZodSchemaV1.optional(),
  effects: z.array(effectIntentZodSchemaV1),
  nextNodeId: nodeIdZodSchemaV1,
});

const stageCueZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("background.set"),
    assetId: assetIdZodSchemaV1,
    transition: z.enum(["cut", "fade"]),
  }),
  z.strictObject({
    kind: z.literal("character.show"),
    slot: z.enum(["left", "center", "right"]),
    characterId: characterIdZodSchemaV1,
    poseAssetId: assetIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("character.hide"),
    slot: z.enum(["left", "center", "right"]),
  }),
  z.strictObject({
    kind: z.literal("stage.clear"),
    transition: z.enum(["cut", "fade"]),
  }),
]);

const checkBranchZodSchemaV1 = z.strictObject({
  bandId: checkBandIdZodSchemaV1,
  nextNodeId: nodeIdZodSchemaV1,
});

const narrativeNodeZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("line"),
    nodeId: nodeIdZodSchemaV1,
    speakerId: characterIdZodSchemaV1,
    textId: textIdZodSchemaV1,
    nextNodeId: nodeIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("narration"),
    nodeId: nodeIdZodSchemaV1,
    textId: textIdZodSchemaV1,
    nextNodeId: nodeIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("choice"),
    nodeId: nodeIdZodSchemaV1,
    choices: z.array(narrativeChoiceZodSchemaV1),
  }),
  z.strictObject({
    kind: z.literal("condition"),
    nodeId: nodeIdZodSchemaV1,
    when: z.array(conditionZodSchemaV1),
    passNodeId: nodeIdZodSchemaV1,
    failNodeId: nodeIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("check"),
    nodeId: nodeIdZodSchemaV1,
    request: checkRequestZodSchemaV1,
    branches: z.array(checkBranchZodSchemaV1),
  }),
  z.strictObject({
    kind: z.literal("command"),
    nodeId: nodeIdZodSchemaV1,
    effects: z.array(effectIntentZodSchemaV1),
    nextNodeId: nodeIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("eventCheckpoint"),
    nodeId: nodeIdZodSchemaV1,
    checkpointId: checkpointIdZodSchemaV1,
    nextNodeId: nodeIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("jump"),
    nodeId: nodeIdZodSchemaV1,
    targetNodeId: nodeIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("call"),
    nodeId: nodeIdZodSchemaV1,
    sceneId: sceneIdZodSchemaV1,
    entryNodeId: nodeIdZodSchemaV1,
    returnNodeId: nodeIdZodSchemaV1,
  }),
  z.strictObject({ kind: z.literal("return"), nodeId: nodeIdZodSchemaV1 }),
  z.strictObject({
    kind: z.literal("stageCue"),
    nodeId: nodeIdZodSchemaV1,
    cue: stageCueZodSchemaV1,
    nextNodeId: nodeIdZodSchemaV1,
  }),
  z.strictObject({ kind: z.literal("end"), nodeId: nodeIdZodSchemaV1 }),
]);

const narrativeSceneZodSchemaV1 = z.strictObject({
  sceneId: sceneIdZodSchemaV1,
  entryNodeId: nodeIdZodSchemaV1,
  nodes: z.array(narrativeNodeZodSchemaV1),
});

const storyValueDefinitionZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("boolean"), defaultValue: z.boolean() }),
  z
    .strictObject({
      kind: z.literal("integer"),
      defaultValue: safeIntegerZodSchemaV1,
      range: integerRangeZodSchemaV1,
    })
    .refine(
      ({ defaultValue, range }) => defaultValue >= range.min && defaultValue <= range.max,
      "Story integer default is outside its declared range",
    ),
  z
    .strictObject({
      kind: z.literal("token"),
      defaultValue: storyTokenZodSchemaV1,
      allowedValues: z.array(storyTokenZodSchemaV1).min(1),
    })
    .refine(
      ({ defaultValue, allowedValues }) => allowedValues.includes(defaultValue),
      "Story token default is not allowed",
    ),
]);

const factDefinitionZodSchemaV1 = z.strictObject({
  factId: factIdZodSchemaV1,
  value: storyValueDefinitionZodSchemaV1,
});
const questDefinitionZodSchemaV1 = z.strictObject({
  questId: questIdZodSchemaV1,
  initial: questEntryZodSchemaV1,
});
const outcomeDefinitionZodSchemaV1 = z.strictObject({
  outcomeId: outcomeIdZodSchemaV1,
  value: storyValueDefinitionZodSchemaV1,
});

const storyStateDefinitionsZodSchemaV1 = z.strictObject({
  facts: z.array(factDefinitionZodSchemaV1),
  quests: z.array(questDefinitionZodSchemaV1),
  outcomes: z.array(outcomeDefinitionZodSchemaV1),
});

export const pocStoryStateDefinitionsSchemaV1: RuntimeSchemaV1<StoryStateDefinitionsV1> =
  runtimeSchemaV1(storyStateDefinitionsZodSchemaV1 as z.ZodType<StoryStateDefinitionsV1>);

const storyInitialStateZodSchemaV1 = z.strictObject({
  player: playerActorStateZodSchemaV1,
  heroine: heroineActorStateZodSchemaV1,
  relationship: relationshipStateZodSchemaV1,
  cash: moneyZodSchemaV1,
  reputation: nonNegativeSafeIntegerZodSchemaV1,
  helper: helperStateZodSchemaV1,
  unlockedRecipeIds: z.array(recipeIdZodSchemaV1),
  ingredientBatches: z.array(inventoryBatchZodSchemaV1),
  itemStacks: z.array(itemStackZodSchemaV1),
  auras: z.array(auraInstanceZodSchemaV1),
});

export const pocStoryInitialStateSchemaV1: RuntimeSchemaV1<StoryInitialStateV1> = runtimeSchemaV1(
  storyInitialStateZodSchemaV1 as z.ZodType<StoryInitialStateV1>,
);

const actionCostDefinitionZodSchemaV1 = z.strictObject({
  action: z.enum(["inventory.buy", "actor.prepare_food", "actor.rest", "facility.choose.build"]),
  apCost: nonNegativeSafeIntegerZodSchemaV1,
  playerStaminaCost: nonNegativeSafeIntegerZodSchemaV1,
  heroineStaminaCost: nonNegativeSafeIntegerZodSchemaV1,
  reasonId: reasonIdZodSchemaV1,
});

const apByPhaseZodSchemaV1 = z.strictObject({
  morning: nonNegativeSafeIntegerZodSchemaV1,
  afternoon: nonNegativeSafeIntegerZodSchemaV1,
  evening: nonNegativeSafeIntegerZodSchemaV1,
});

const lifePolicyDefinitionZodSchemaV1 = z.strictObject({
  policyId: policyIdZodSchemaV1,
  nameTextId: textIdZodSchemaV1,
  apByPhase: apByPhaseZodSchemaV1,
  playerNightRecovery: nonNegativeSafeIntegerZodSchemaV1,
  nightRecoveryReasonId: reasonIdZodSchemaV1,
});

const serviceModeDefinitionZodSchemaV1 = z.strictObject({
  mode: serviceModeZodSchemaV1,
  nameTextId: textIdZodSchemaV1,
  availability: z.array(availabilityGateZodSchemaV1),
  confirmation: confirmationMetadataZodSchemaV1,
  reasonId: reasonIdZodSchemaV1,
  apCost: nonNegativeSafeIntegerZodSchemaV1,
  playerStaminaCost: nonNegativeSafeIntegerZodSchemaV1,
  heroineStaminaCost: nonNegativeSafeIntegerZodSchemaV1,
  wage: moneyZodSchemaV1,
  baseReceptionCapacity: nonNegativeSafeIntegerZodSchemaV1,
  basePreparationPoints: nonNegativeSafeIntegerZodSchemaV1,
  teamworkGain: nonNegativeSafeIntegerZodSchemaV1,
  preparationPointsPerAction: nonNegativeSafeIntegerZodSchemaV1,
});

const baseDemandLineZodSchemaV1 = z.strictObject({
  day: dayIndexZodSchemaV1,
  segmentId: customerSegmentIdZodSchemaV1,
  customers: nonNegativeSafeIntegerZodSchemaV1,
});

const ledgerReasonBindingsZodSchemaV1 = z.strictObject({
  purchase: reasonIdZodSchemaV1,
  serviceWage: reasonIdZodSchemaV1,
  openingFee: reasonIdZodSchemaV1,
  revenue: reasonIdZodSchemaV1,
  discardedFood: reasonIdZodSchemaV1,
  spoiledIngredient: reasonIdZodSchemaV1,
  facilityBuild: reasonIdZodSchemaV1,
  worldActionCost: reasonIdZodSchemaV1,
  levy: reasonIdZodSchemaV1,
});

const emergencyClosureDefinitionZodSchemaV1 = z.strictObject({
  reputationPenalty: nonNegativeSafeIntegerZodSchemaV1,
  reasonId: reasonIdZodSchemaV1,
});

const obligationRecommendationDefinitionZodSchemaV1 = z.strictObject({
  textId: textIdZodSchemaV1,
  actionId: actionIdZodSchemaV1.nullable(),
  appliesTo: z.array(z.enum(["current_gap", "committed_plan_conservative", "final"])),
});

const dayPhaseZodSchemaV1 = z.strictObject({
  day: dayIndexZodSchemaV1,
  phase: calendarPhaseZodSchemaV1,
});

const obligationForecastPolicyZodSchemaV1 = z.strictObject({
  visibleFrom: dayPhaseZodSchemaV1,
  conservativeFrom: dayPhaseZodSchemaV1,
  reasonId: reasonIdZodSchemaV1,
  recommendations: z.array(obligationRecommendationDefinitionZodSchemaV1),
});

const endingPolicyZodSchemaV1 = z.strictObject({
  stableMinimumCashAfterLevy: moneyZodSchemaV1,
  stableMinimumReputation: nonNegativeSafeIntegerZodSchemaV1,
  stableMinimumBuiltFacilities: positiveSafeIntegerZodSchemaV1,
  reputationCrisisBelow: nonNegativeSafeIntegerZodSchemaV1,
  stableReasonId: reasonIdZodSchemaV1,
  dangerReasonId: reasonIdZodSchemaV1,
  arrearsReasonId: reasonIdZodSchemaV1,
  reputationCrisisReasonId: reasonIdZodSchemaV1,
});

const pocStoryBalanceZodSchemaV1 = z
  .strictObject({
    lifePolicies: z.tuple([lifePolicyDefinitionZodSchemaV1], lifePolicyDefinitionZodSchemaV1),
    actionCosts: z.array(actionCostDefinitionZodSchemaV1),
    serviceModes: z.array(serviceModeDefinitionZodSchemaV1),
    serviceDays: z.array(dayIndexZodSchemaV1),
    baseDemand: z.array(baseDemandLineZodSchemaV1),
    ledgerReasons: ledgerReasonBindingsZodSchemaV1,
    emergencyClosure: emergencyClosureDefinitionZodSchemaV1,
    plannedClosureReasonId: reasonIdZodSchemaV1,
    heroineNightRecovery: nonNegativeSafeIntegerZodSchemaV1,
    heroineNightRecoveryReasonId: reasonIdZodSchemaV1,
    restRecovery: nonNegativeSafeIntegerZodSchemaV1,
    purchaseLineLimit: positiveSafeIntegerZodSchemaV1.refine((value) => value <= 64),
    menuRecipeLimit: positiveSafeIntegerZodSchemaV1,
    dailyPreparationLimit: positiveSafeIntegerZodSchemaV1,
    openingFee: moneyZodSchemaV1,
    levyAmount: moneyZodSchemaV1,
    levyDue: dayPhaseZodSchemaV1,
    obligationForecast: obligationForecastPolicyZodSchemaV1,
    endingPolicy: endingPolicyZodSchemaV1,
    maxNarrativeStepsPerCommand: positiveSafeIntegerZodSchemaV1,
    maxNarrativeCallDepth: positiveSafeIntegerZodSchemaV1,
  })
  .superRefine((balance, context) => {
    const actionCosts = balance.actionCosts.map(({ action }) => action);
    const requiredActionCosts = [
      "inventory.buy",
      "actor.prepare_food",
      "actor.rest",
      "facility.choose.build",
    ] as const;
    if (
      actionCosts.length !== requiredActionCosts.length ||
      requiredActionCosts.some((action) => !actionCosts.includes(action))
    ) {
      context.addIssue({ code: "custom", message: "actionCosts must cover the closed four keys" });
    }
    const modes = balance.serviceModes.map(({ mode }) => mode);
    if (
      modes.length !== 4 ||
      (["manual", "assisted", "delegated", "closed"] as const).some((mode) => !modes.includes(mode))
    ) {
      context.addIssue({
        code: "custom",
        message: "serviceModes must cover the closed four modes",
      });
    }
  });

export const pocStoryBalanceSchemaV1: RuntimeSchemaV1<StoryBalanceV1> = runtimeSchemaV1(
  pocStoryBalanceZodSchemaV1 as z.ZodType<StoryBalanceV1>,
);

const storyCharacterDefinitionZodSchemaV1 = z.strictObject({
  characterId: characterIdZodSchemaV1,
  nameTextId: textIdZodSchemaV1,
  actorId: actorIdZodSchemaV1.nullable(),
});
const reasonDefinitionZodSchemaV1 = z.strictObject({
  reasonId: reasonIdZodSchemaV1,
  textId: textIdZodSchemaV1,
});
const customerSegmentDefinitionZodSchemaV1 = z.strictObject({
  segmentId: customerSegmentIdZodSchemaV1,
  nameTextId: textIdZodSchemaV1,
});
const modifierSourceDefinitionZodSchemaV1 = z.strictObject({
  sourceId: modifierSourceIdZodSchemaV1,
  nameTextId: textIdZodSchemaV1,
});
const actionOccupationDefinitionZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("none") }),
  z.strictObject({ kind: z.literal("current_phase") }),
  z.strictObject({ kind: z.literal("fixed"), phases: z.array(calendarPhaseZodSchemaV1).min(1) }),
]);
const actionPresentationDefinitionZodSchemaV1 = z.strictObject({
  actionId: actionIdZodSchemaV1,
  labelTextId: textIdZodSchemaV1,
  commandKind: pocGameCommandKindZodSchemaV1,
  availablePhases: z.array(calendarPhaseZodSchemaV1).min(1),
  occupation: actionOccupationDefinitionZodSchemaV1,
  visibility: z.array(availabilityGateZodSchemaV1),
  availability: z.array(availabilityGateZodSchemaV1),
  confirmation: confirmationMetadataZodSchemaV1,
});
const storyActionDefinitionZodSchemaV1 = z.strictObject({
  actionId: actionIdZodSchemaV1,
  sceneId: sceneIdZodSchemaV1.nullable(),
  startEffects: z.array(effectIntentZodSchemaV1),
});
const ingredientDefinitionZodSchemaV1 = z.strictObject({
  ingredientId: ingredientIdZodSchemaV1,
  nameTextId: textIdZodSchemaV1,
  unitPrice: moneyZodSchemaV1,
  shelfLifeDays: positiveSafeIntegerZodSchemaV1,
  refrigeratable: z.boolean(),
});
const itemDefinitionZodSchemaV1 = z.strictObject({
  itemId: itemIdZodSchemaV1,
  nameTextId: textIdZodSchemaV1,
});
const recipeDefinitionZodSchemaV1 = z.strictObject({
  recipeId: recipeIdZodSchemaV1,
  nameTextId: textIdZodSchemaV1,
  ingredients: z.array(
    z.strictObject({ ingredientId: ingredientIdZodSchemaV1, quantity: quantityZodSchemaV1 }),
  ),
  salePrice: moneyZodSchemaV1,
  prepPoints: positiveSafeIntegerZodSchemaV1,
  preferences: z.array(
    z.strictObject({
      segmentId: customerSegmentIdZodSchemaV1,
      value: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    }),
  ),
});
const facilityDefinitionZodSchemaV1 = z.strictObject({
  facilityId: facilityIdZodSchemaV1,
  nameTextId: textIdZodSchemaV1,
  cashCost: moneyZodSchemaV1,
  modifiers: z.array(modifierZodSchemaV1),
  confirmation: confirmationMetadataZodSchemaV1,
});
const facilityOpportunityDefinitionZodSchemaV1 = z.strictObject({
  opportunityId: actionIdZodSchemaV1,
  skipLabelTextId: textIdZodSchemaV1,
  availability: z.array(availabilityGateZodSchemaV1),
  facilityIds: z.array(facilityIdZodSchemaV1),
  confirmation: confirmationMetadataZodSchemaV1,
  skipConfirmation: confirmationMetadataZodSchemaV1,
  skipReasonId: reasonIdZodSchemaV1,
});
const auraDefinitionZodSchemaV1 = z.strictObject({
  auraId: auraIdZodSchemaV1,
  nameTextId: textIdZodSchemaV1,
  reasonId: reasonIdZodSchemaV1,
  durationPolicy: auraDurationPolicyZodSchemaV1,
  visibility: z.enum(["buff", "debuff", "hidden"]),
  allowedTargets: z.array(auraTargetZodSchemaV1),
  modifiers: z.array(modifierZodSchemaV1),
});
const worldActionStepDefinitionZodSchemaV1 = z.strictObject({
  stepId: worldStepIdZodSchemaV1,
  phase: calendarPhaseZodSchemaV1,
  apCost: nonNegativeSafeIntegerZodSchemaV1,
  sceneId: sceneIdZodSchemaV1,
});
const worldActionOptionDefinitionZodSchemaV1 = z.strictObject({
  optionId: choiceIdZodSchemaV1,
  labelTextId: textIdZodSchemaV1,
  availability: z.array(availabilityGateZodSchemaV1),
  additionalCashCost: moneyZodSchemaV1,
  preparationBonus: safeIntegerZodSchemaV1,
  beginEffects: z.array(effectIntentZodSchemaV1),
  confirmation: confirmationMetadataZodSchemaV1,
});
const worldActionDefinitionZodSchemaV1 = z.strictObject({
  actionId: actionIdZodSchemaV1,
  nameTextId: textIdZodSchemaV1,
  availability: z.array(availabilityGateZodSchemaV1),
  reasonId: reasonIdZodSchemaV1,
  baseCashCost: moneyZodSchemaV1,
  playerStaminaCost: nonNegativeSafeIntegerZodSchemaV1,
  beginEffects: z.array(effectIntentZodSchemaV1),
  options: z.array(worldActionOptionDefinitionZodSchemaV1),
  steps: z.tuple([worldActionStepDefinitionZodSchemaV1, worldActionStepDefinitionZodSchemaV1]),
  checkId: checkIdZodSchemaV1.nullable(),
});
const eventTriggerZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("phase.entered"),
    days: z.array(dayIndexZodSchemaV1).min(1),
    phases: z.array(calendarPhaseZodSchemaV1).min(1),
  }),
  z.strictObject({
    kind: z.literal("command.succeeded"),
    commandKinds: z.array(pocGameCommandKindZodSchemaV1).min(1),
  }),
  z.strictObject({ kind: z.literal("opening.started") }),
  z.strictObject({ kind: z.literal("opening.middle") }),
  z.strictObject({ kind: z.literal("opening.before_finalize") }),
  z.strictObject({ kind: z.literal("day.ended"), days: z.array(dayIndexZodSchemaV1).min(1) }),
  z.strictObject({ kind: z.literal("week.ended") }),
  z.strictObject({ kind: z.literal("story.explicit"), checkpointId: checkpointIdZodSchemaV1 }),
]);
const storyEventDefinitionZodSchemaV1 = z.strictObject({
  eventId: eventIdZodSchemaV1,
  checkpointId: checkpointIdZodSchemaV1,
  trigger: eventTriggerZodSchemaV1,
  priority: safeIntegerZodSchemaV1,
  weightedGroupId: weightedGroupIdZodSchemaV1.nullable(),
  weight: nonNegativeSafeIntegerZodSchemaV1,
  when: z.array(conditionZodSchemaV1),
  sceneId: sceneIdZodSchemaV1.nullable(),
  effects: z.array(effectIntentZodSchemaV1),
});
const checkDefinitionZodSchemaV1 = z.strictObject({
  checkId: checkIdZodSchemaV1,
  attribute: attributeIdZodSchemaV1,
  dice: z.literal("2d6"),
  bands: z.array(
    z.strictObject({
      bandId: checkBandIdZodSchemaV1,
      minInclusive: safeIntegerZodSchemaV1,
      maxInclusive: safeIntegerZodSchemaV1.nullable(),
      effects: z.array(effectIntentZodSchemaV1),
    }),
  ),
});
const endingDefinitionZodSchemaV1 = z.strictObject({
  endingId: endingIdZodSchemaV1,
  status: z.enum(["completed_stable", "completed_danger", "failed_arrears"]),
  nameTextId: textIdZodSchemaV1,
  summaryOutcomeIds: z.strictObject({
    relationship: outcomeIdZodSchemaV1,
    investigation: outcomeIdZodSchemaV1,
  }),
  effects: z.array(progressionEffectIntentZodSchemaV1),
});

const pocSimulationManifestZodSchemaV1 = z.strictObject({
  initialSceneId: sceneIdZodSchemaV1,
  playableDays: positiveSafeIntegerZodSchemaV1,
});
export const pocSimulationManifestSchemaV1: RuntimeSchemaV1<PocSimulationManifestV1> =
  runtimeSchemaV1(pocSimulationManifestZodSchemaV1 as z.ZodType<PocSimulationManifestV1>);

const pocSimulationContentZodSchemaV1 = z.strictObject({
  characters: z.array(storyCharacterDefinitionZodSchemaV1),
  reasons: z.array(reasonDefinitionZodSchemaV1),
  actions: z.array(actionPresentationDefinitionZodSchemaV1),
  storyActions: z.array(storyActionDefinitionZodSchemaV1),
  customerSegments: z.array(customerSegmentDefinitionZodSchemaV1),
  modifierSources: z.array(modifierSourceDefinitionZodSchemaV1),
  ingredients: z.array(ingredientDefinitionZodSchemaV1),
  items: z.array(itemDefinitionZodSchemaV1),
  recipes: z.array(recipeDefinitionZodSchemaV1),
  facilities: z.array(facilityDefinitionZodSchemaV1),
  facilityOpportunities: z.array(facilityOpportunityDefinitionZodSchemaV1),
  auras: z.array(auraDefinitionZodSchemaV1),
  worldActions: z.array(worldActionDefinitionZodSchemaV1),
  events: z.array(storyEventDefinitionZodSchemaV1),
  checks: z.array(checkDefinitionZodSchemaV1),
  endings: z.array(endingDefinitionZodSchemaV1),
});
export const pocSimulationContentSchemaV1: RuntimeSchemaV1<PocSimulationContentV1> =
  runtimeSchemaV1(pocSimulationContentZodSchemaV1 as z.ZodType<PocSimulationContentV1>);

const pocNarrativeProgramZodSchemaV1 = z.strictObject({
  scenes: z.array(narrativeSceneZodSchemaV1),
});
export const pocNarrativeProgramSchemaV1: RuntimeSchemaV1<PocNarrativeProgramV1> = runtimeSchemaV1(
  pocNarrativeProgramZodSchemaV1 as z.ZodType<PocNarrativeProgramV1>,
);

type AggregateValidationPathV1 = readonly (string | number)[];

interface AggregateValidationContextV1 {
  addIssue(issue: {
    readonly code: "custom";
    readonly message: string;
    readonly path?: (string | number)[];
  }): void;
}

function addAggregateValidationIssueV1(
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
  message: string,
): void {
  context.addIssue({ code: "custom", message, path: [...path] });
}

function validateUniqueValuesV1(
  values: readonly (string | number)[],
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
  label: string,
): void {
  const seen = new Set<string | number>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      addAggregateValidationIssueV1(context, [...path, index], `duplicate ${label}: ${value}`);
    }
    seen.add(value);
  });
}

function validateCatalogOrderV1(
  values: readonly (string | number)[],
  catalogOrder: readonly (string | number)[],
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
  label: string,
): void {
  const orderIndex = new Map<string | number, number>();
  catalogOrder.forEach((value, index) => orderIndex.set(value, index));
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (previous === undefined || current === undefined) continue;
    const previousIndex = orderIndex.get(previous);
    const currentIndex = orderIndex.get(current);
    if (
      previousIndex !== undefined &&
      currentIndex !== undefined &&
      previousIndex >= currentIndex
    ) {
      addAggregateValidationIssueV1(
        context,
        [...path, index],
        `${label} values must follow catalog order`,
      );
    }
  }
}

function validateUniqueEntriesV1<T>(
  entries: readonly T[],
  readId: (entry: T) => string,
  idField: string,
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
  label: string,
): void {
  const seen = new Set<string>();
  entries.forEach((entry, index) => {
    const value = readId(entry);
    if (seen.has(value)) {
      addAggregateValidationIssueV1(
        context,
        [...path, index, idField],
        `duplicate ${label}: ${value}`,
      );
    }
    seen.add(value);
  });
}

function compareStableIdsV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function validateStableIdAscendingOrderV1<T>(
  entries: readonly T[],
  readId: (entry: T) => string,
  idField: string,
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
  label: string,
): void {
  for (let index = 1; index < entries.length; index += 1) {
    const previous = entries[index - 1];
    const current = entries[index];
    if (
      previous !== undefined &&
      current !== undefined &&
      compareStableIdsV1(readId(previous), readId(current)) > 0
    ) {
      addAggregateValidationIssueV1(
        context,
        [...path, index, idField],
        `${label} entries must use strict stable-ID ascending order`,
      );
    }
  }
}

function validateReferenceV1(
  knownIds: ReadonlySet<string>,
  value: string,
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
  label: string,
): void {
  if (!knownIds.has(value)) {
    addAggregateValidationIssueV1(context, path, `unknown ${label}: ${value}`);
  }
}

type ParsedStoryValueV1 = z.output<typeof storyValueZodSchemaV1>;
type ParsedStoryValueDefinitionV1 = z.output<typeof storyValueDefinitionZodSchemaV1>;
type ParsedConditionV1 = z.output<typeof conditionZodSchemaV1>;
type ParsedAvailabilityGateV1 = z.output<typeof availabilityGateZodSchemaV1>;
type ParsedConfirmationMetadataV1 = z.output<typeof confirmationMetadataZodSchemaV1>;
type ParsedAuraTargetV1 = z.output<typeof auraTargetZodSchemaV1>;
type ParsedAuraDurationV1 = z.output<typeof auraDurationZodSchemaV1>;
type ParsedAuraDefinitionV1 = z.output<typeof auraDefinitionZodSchemaV1>;
type ParsedInventorySourceRefV1 = z.output<typeof inventorySourceRefZodSchemaV1>;
type ParsedAuraSourceRefV1 = z.output<typeof auraSourceRefZodSchemaV1>;
type ParsedModifierSourceRefV1 = z.output<typeof modifierSourceRefZodSchemaV1>;
type ParsedModifierV1 = z.output<typeof modifierZodSchemaV1>;
type ParsedEffectIntentV1 = z.output<typeof effectIntentZodSchemaV1>;
type ParsedLedgerSubjectV1 = z.output<typeof ledgerSubjectZodSchemaV1>;

interface AggregateReferenceCatalogV1 {
  readonly actionIds: ReadonlySet<string>;
  readonly auraIds: ReadonlySet<string>;
  readonly auraDefinitions: ReadonlyMap<string, ParsedAuraDefinitionV1>;
  readonly checkIds: ReadonlySet<string>;
  readonly endingIds: ReadonlySet<string>;
  readonly eventIds: ReadonlySet<string>;
  readonly facilityIds: ReadonlySet<string>;
  readonly factIds: ReadonlySet<string>;
  readonly ingredientIds: ReadonlySet<string>;
  readonly itemIds: ReadonlySet<string>;
  readonly modifierSourceIds: ReadonlySet<string>;
  readonly outcomeIds: ReadonlySet<string>;
  readonly opportunityIds: ReadonlySet<string>;
  readonly questIds: ReadonlySet<string>;
  readonly reasonIds: ReadonlySet<string>;
  readonly recipeIds: ReadonlySet<string>;
  readonly segmentIds: ReadonlySet<string>;
  readonly storyActionIds: ReadonlySet<string>;
  readonly worldActionIds: ReadonlySet<string>;
  readonly factDefinitions: ReadonlyMap<string, ParsedStoryValueDefinitionV1>;
  readonly outcomeDefinitions: ReadonlyMap<string, ParsedStoryValueDefinitionV1>;
}

function createAggregateReferenceCatalogV1(data: PocSimulationDataV1): AggregateReferenceCatalogV1 {
  return {
    actionIds: new Set(data.content.actions.map(({ actionId }) => actionId)),
    auraIds: new Set(data.content.auras.map(({ auraId }) => auraId)),
    auraDefinitions: new Map(
      data.content.auras.map((aura) => [aura.auraId, aura as ParsedAuraDefinitionV1]),
    ),
    checkIds: new Set(data.content.checks.map(({ checkId }) => checkId)),
    endingIds: new Set(data.content.endings.map(({ endingId }) => endingId)),
    eventIds: new Set(data.content.events.map(({ eventId }) => eventId)),
    facilityIds: new Set(data.content.facilities.map(({ facilityId }) => facilityId)),
    factIds: new Set(data.stateDefinitions.facts.map(({ factId }) => factId)),
    ingredientIds: new Set(data.content.ingredients.map(({ ingredientId }) => ingredientId)),
    itemIds: new Set(data.content.items.map(({ itemId }) => itemId)),
    modifierSourceIds: new Set(data.content.modifierSources.map(({ sourceId }) => sourceId)),
    outcomeIds: new Set(data.stateDefinitions.outcomes.map(({ outcomeId }) => outcomeId)),
    opportunityIds: new Set(
      data.content.facilityOpportunities.map(({ opportunityId }) => opportunityId),
    ),
    questIds: new Set(data.stateDefinitions.quests.map(({ questId }) => questId)),
    reasonIds: new Set(data.content.reasons.map(({ reasonId }) => reasonId)),
    recipeIds: new Set(data.content.recipes.map(({ recipeId }) => recipeId)),
    segmentIds: new Set(data.content.customerSegments.map(({ segmentId }) => segmentId)),
    storyActionIds: new Set(data.content.storyActions.map(({ actionId }) => actionId)),
    worldActionIds: new Set(data.content.worldActions.map(({ actionId }) => actionId)),
    factDefinitions: new Map(
      data.stateDefinitions.facts.map(({ factId, value }) => [
        factId,
        value as ParsedStoryValueDefinitionV1,
      ]),
    ),
    outcomeDefinitions: new Map(
      data.stateDefinitions.outcomes.map(({ outcomeId, value }) => [
        outcomeId,
        value as ParsedStoryValueDefinitionV1,
      ]),
    ),
  };
}

function auraTargetKeyV1(target: ParsedAuraTargetV1): string {
  return target.kind === "actor" ? `actor:${target.actorId}` : target.kind;
}

function validateAuraApplicationV1(
  auraId: string,
  target: ParsedAuraTargetV1,
  duration: ParsedAuraDurationV1,
  references: AggregateReferenceCatalogV1,
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
): void {
  const definition = references.auraDefinitions.get(auraId);
  if (definition === undefined) return;
  const allowedTargetKeys = new Set(definition.allowedTargets.map(auraTargetKeyV1));
  if (!allowedTargetKeys.has(auraTargetKeyV1(target))) {
    addAggregateValidationIssueV1(
      context,
      [...path, "target"],
      "Aura target is not allowed by its definition",
    );
  }
  if (definition.durationPolicy.kind !== duration.kind) {
    addAggregateValidationIssueV1(
      context,
      [...path, "duration"],
      "Aura duration kind does not match its definition",
    );
    return;
  }
  if (
    definition.durationPolicy.kind === "countdown" &&
    duration.kind === "countdown" &&
    (definition.durationPolicy.unit !== duration.unit ||
      duration.remaining !== definition.durationPolicy.defaultRemaining ||
      duration.remaining > definition.durationPolicy.maximumRemaining)
  ) {
    addAggregateValidationIssueV1(
      context,
      [...path, "duration"],
      "Aura countdown is incompatible with its definition",
    );
  }
}

function validateStoryValueV1(
  value: ParsedStoryValueV1,
  definition: ParsedStoryValueDefinitionV1 | undefined,
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
): void {
  if (definition === undefined) return;
  if (value.kind !== definition.kind) {
    addAggregateValidationIssueV1(context, path, "Story value kind does not match its definition");
    return;
  }
  if (
    value.kind === "integer" &&
    definition.kind === "integer" &&
    (value.value < definition.range.min || value.value > definition.range.max)
  ) {
    addAggregateValidationIssueV1(context, path, "Story integer value is outside its range");
  }
  if (
    value.kind === "token" &&
    definition.kind === "token" &&
    !definition.allowedValues.includes(value.value)
  ) {
    addAggregateValidationIssueV1(context, path, "Story token value is not allowed");
  }
}

function validateConfirmationMetadataV1(
  confirmation: ParsedConfirmationMetadataV1,
  references: AggregateReferenceCatalogV1,
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
): void {
  validateUniqueValuesV1(
    confirmation.benefitTextIds,
    context,
    [...path, "benefitTextIds"],
    "TextId",
  );
  validateUniqueValuesV1(
    confirmation.majorRiskTextIds,
    context,
    [...path, "majorRiskTextIds"],
    "TextId",
  );
  validateUniqueValuesV1(
    confirmation.mutuallyExcludedActionIds,
    context,
    [...path, "mutuallyExcludedActionIds"],
    "ActionId",
  );
  confirmation.mutuallyExcludedActionIds.forEach((actionId, index) => {
    validateReferenceV1(
      references.actionIds,
      actionId,
      context,
      [...path, "mutuallyExcludedActionIds", index],
      "ActionId",
    );
  });
}

function validateInventorySourceRefV1(
  source: ParsedInventorySourceRefV1,
  references: AggregateReferenceCatalogV1,
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
): void {
  switch (source.kind) {
    case "initial":
    case "debug":
      validateReferenceV1(
        references.reasonIds,
        source.reasonId,
        context,
        [...path, "reasonId"],
        "ReasonId",
      );
      return;
    case "story_action":
      validateReferenceV1(
        references.storyActionIds,
        source.actionId,
        context,
        [...path, "actionId"],
        "StoryAction ActionId",
      );
      return;
    case "world_action":
      validateReferenceV1(
        references.worldActionIds,
        source.actionId,
        context,
        [...path, "actionId"],
        "WorldAction ActionId",
      );
      return;
    case "story_event":
      validateReferenceV1(
        references.eventIds,
        source.eventId,
        context,
        [...path, "eventId"],
        "EventId",
      );
      return;
    case "purchase":
      return;
  }
}

function validateAuraSourceRefV1(
  source: ParsedAuraSourceRefV1,
  references: AggregateReferenceCatalogV1,
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
): void {
  switch (source.kind) {
    case "initial":
    case "debug":
      validateReferenceV1(
        references.reasonIds,
        source.reasonId,
        context,
        [...path, "reasonId"],
        "ReasonId",
      );
      return;
    case "story_event":
      validateReferenceV1(
        references.eventIds,
        source.eventId,
        context,
        [...path, "eventId"],
        "EventId",
      );
      return;
    case "story_action":
      validateReferenceV1(
        references.storyActionIds,
        source.actionId,
        context,
        [...path, "actionId"],
        "StoryAction ActionId",
      );
      return;
    case "facility":
      validateReferenceV1(
        references.facilityIds,
        source.facilityId,
        context,
        [...path, "facilityId"],
        "FacilityId",
      );
      return;
    case "world_action":
      validateReferenceV1(
        references.worldActionIds,
        source.actionId,
        context,
        [...path, "actionId"],
        "WorldAction ActionId",
      );
      return;
  }
}

function validateModifierSourceRefV1(
  source: ParsedModifierSourceRefV1,
  references: AggregateReferenceCatalogV1,
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
): void {
  switch (source.kind) {
    case "facility":
      validateReferenceV1(
        references.facilityIds,
        source.facilityId,
        context,
        [...path, "facilityId"],
        "FacilityId",
      );
      return;
    case "aura":
      validateReferenceV1(
        references.auraIds,
        source.auraId,
        context,
        [...path, "auraId"],
        "AuraId",
      );
      return;
    case "event":
      validateReferenceV1(
        references.eventIds,
        source.eventId,
        context,
        [...path, "eventId"],
        "EventId",
      );
      return;
    case "story":
      validateReferenceV1(
        references.modifierSourceIds,
        source.sourceId,
        context,
        [...path, "sourceId"],
        "ModifierSourceId",
      );
      return;
  }
}

function validateConditionV1(
  condition: ParsedConditionV1,
  references: AggregateReferenceCatalogV1,
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
): void {
  switch (condition.kind) {
    case "fact.equals":
      validateReferenceV1(
        references.factIds,
        condition.factId,
        context,
        [...path, "factId"],
        "FactId",
      );
      validateStoryValueV1(
        condition.value,
        references.factDefinitions.get(condition.factId),
        context,
        [...path, "value"],
      );
      return;
    case "quest.status_is":
      validateReferenceV1(
        references.questIds,
        condition.questId,
        context,
        [...path, "questId"],
        "QuestId",
      );
      return;
    case "outcome.equals":
      validateReferenceV1(
        references.outcomeIds,
        condition.outcomeId,
        context,
        [...path, "outcomeId"],
        "OutcomeId",
      );
      validateStoryValueV1(
        condition.value,
        references.outcomeDefinitions.get(condition.outcomeId),
        context,
        [...path, "value"],
      );
      return;
    case "aura.present":
      validateReferenceV1(
        references.auraIds,
        condition.auraId,
        context,
        [...path, "auraId"],
        "AuraId",
      );
      return;
    case "inventory.ingredient_at_least":
      validateReferenceV1(
        references.ingredientIds,
        condition.ingredientId,
        context,
        [...path, "ingredientId"],
        "IngredientId",
      );
      return;
    case "tavern.facility_opportunity_undecided":
      validateReferenceV1(
        references.opportunityIds,
        condition.opportunityId,
        context,
        [...path, "opportunityId"],
        "OpportunityId",
      );
      return;
    case "calendar.matches":
      validateUniqueValuesV1(condition.phases, context, [...path, "phases"], "CalendarPhase");
      return;
    case "actor.rank_at_least":
    case "relationship.stage_is":
    case "relationship.affection_at_least":
    case "tavern.helper_tier_at_least":
    case "tavern.reputation_at_least":
    case "calendar.day_at_least":
    case "calendar.day_at_most":
    case "narrative.not_active":
    case "run.started":
    case "run.status_is":
      return;
  }
}

function validateAvailabilityGatesV1(
  gates: readonly ParsedAvailabilityGateV1[],
  references: AggregateReferenceCatalogV1,
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
): void {
  gates.forEach((gate, gateIndex) => {
    validateReferenceV1(
      references.reasonIds,
      gate.reasonId,
      context,
      [...path, gateIndex, "reasonId"],
      "ReasonId",
    );
    gate.conditions.forEach((condition, conditionIndex) => {
      validateConditionV1(condition, references, context, [
        ...path,
        gateIndex,
        "conditions",
        conditionIndex,
      ]);
    });
  });
}

function validateModifierV1(
  modifier: ParsedModifierV1,
  references: AggregateReferenceCatalogV1,
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
): void {
  validateReferenceV1(
    references.reasonIds,
    modifier.reasonId,
    context,
    [...path, "reasonId"],
    "ReasonId",
  );
  validateModifierSourceRefV1(modifier.source, references, context, [...path, "source"]);
  switch (modifier.kind) {
    case "capacity.add":
    case "prep_points.add":
    case "service_cost.add":
      validateUniqueValuesV1(modifier.modes, context, [...path, "modes"], "ServiceMode");
      return;
    case "demand.add":
      validateReferenceV1(
        references.segmentIds,
        modifier.segmentId,
        context,
        [...path, "segmentId"],
        "CustomerSegmentId",
      );
      return;
    case "check.add":
      validateReferenceV1(
        references.checkIds,
        modifier.checkId,
        context,
        [...path, "checkId"],
        "CheckId",
      );
      return;
    case "shelf_life.add_days":
      validateUniqueValuesV1(
        modifier.ingredientIds,
        context,
        [...path, "ingredientIds"],
        "IngredientId",
      );
      modifier.ingredientIds.forEach((ingredientId, index) => {
        validateReferenceV1(
          references.ingredientIds,
          ingredientId,
          context,
          [...path, "ingredientIds", index],
          "IngredientId",
        );
      });
      return;
    case "recovery.add":
    case "teamwork_gain.block":
      return;
  }
}

function validateLedgerSubjectV1(
  subject: ParsedLedgerSubjectV1,
  references: AggregateReferenceCatalogV1,
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
): void {
  switch (subject.kind) {
    case "ingredient":
      validateReferenceV1(
        references.ingredientIds,
        subject.ingredientId,
        context,
        [...path, "ingredientId"],
        "IngredientId",
      );
      return;
    case "item":
      validateReferenceV1(
        references.itemIds,
        subject.itemId,
        context,
        [...path, "itemId"],
        "ItemId",
      );
      return;
    case "recipe":
      validateReferenceV1(
        references.recipeIds,
        subject.recipeId,
        context,
        [...path, "recipeId"],
        "RecipeId",
      );
      return;
    case "facility":
      validateReferenceV1(
        references.facilityIds,
        subject.facilityId,
        context,
        [...path, "facilityId"],
        "FacilityId",
      );
      return;
    case "event":
      validateReferenceV1(
        references.eventIds,
        subject.eventId,
        context,
        [...path, "eventId"],
        "EventId",
      );
      return;
    case "action":
      validateReferenceV1(
        references.actionIds,
        subject.actionId,
        context,
        [...path, "actionId"],
        "ActionId",
      );
      return;
    case "service_mode":
    case "levy":
    case "debug":
      return;
  }
}

function validateEffectIntentV1(
  effect: ParsedEffectIntentV1,
  references: AggregateReferenceCatalogV1,
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
): void {
  if ("reasonId" in effect) {
    validateReferenceV1(
      references.reasonIds,
      effect.reasonId,
      context,
      [...path, "reasonId"],
      "ReasonId",
    );
  }
  switch (effect.kind) {
    case "inventory.grant":
      validateUniqueEntriesV1(
        effect.lines,
        ({ ingredientId }) => ingredientId,
        "ingredientId",
        context,
        [...path, "lines"],
        "IngredientId",
      );
      effect.lines.forEach((line, index) =>
        validateReferenceV1(
          references.ingredientIds,
          line.ingredientId,
          context,
          [...path, "lines", index, "ingredientId"],
          "IngredientId",
        ),
      );
      validateInventorySourceRefV1(effect.source, references, context, [...path, "source"]);
      return;
    case "inventory.consume":
      validateUniqueEntriesV1(
        effect.lines,
        ({ ingredientId }) => ingredientId,
        "ingredientId",
        context,
        [...path, "lines"],
        "IngredientId",
      );
      effect.lines.forEach((line, index) =>
        validateReferenceV1(
          references.ingredientIds,
          line.ingredientId,
          context,
          [...path, "lines", index, "ingredientId"],
          "IngredientId",
        ),
      );
      return;
    case "inventory.item.grant":
    case "inventory.item.consume":
      validateUniqueEntriesV1(
        effect.lines,
        ({ itemId }) => itemId,
        "itemId",
        context,
        [...path, "lines"],
        "ItemId",
      );
      effect.lines.forEach((line, index) =>
        validateReferenceV1(
          references.itemIds,
          line.itemId,
          context,
          [...path, "lines", index, "itemId"],
          "ItemId",
        ),
      );
      return;
    case "aura.apply":
      validateReferenceV1(
        references.auraIds,
        effect.auraId,
        context,
        [...path, "auraId"],
        "AuraId",
      );
      validateAuraSourceRefV1(effect.source, references, context, [...path, "source"]);
      validateAuraApplicationV1(
        effect.auraId,
        effect.target,
        effect.duration,
        references,
        context,
        path,
      );
      return;
    case "aura.clear":
      validateReferenceV1(
        references.auraIds,
        effect.auraId,
        context,
        [...path, "auraId"],
        "AuraId",
      );
      return;
    case "fact.set":
      validateReferenceV1(
        references.factIds,
        effect.factId,
        context,
        [...path, "factId"],
        "FactId",
      );
      validateStoryValueV1(effect.value, references.factDefinitions.get(effect.factId), context, [
        ...path,
        "value",
      ]);
      return;
    case "quest.set":
      validateReferenceV1(
        references.questIds,
        effect.quest.questId,
        context,
        [...path, "quest", "questId"],
        "QuestId",
      );
      return;
    case "outcome.set":
      validateReferenceV1(
        references.outcomeIds,
        effect.outcomeId,
        context,
        [...path, "outcomeId"],
        "OutcomeId",
      );
      validateStoryValueV1(
        effect.value,
        references.outcomeDefinitions.get(effect.outcomeId),
        context,
        [...path, "value"],
      );
      return;
    case "modifier.add":
      validateModifierV1(effect.modifier, references, context, [...path, "modifier"]);
      return;
    case "ledger.append":
      validateReferenceV1(
        references.reasonIds,
        effect.entry.reasonId,
        context,
        [...path, "entry", "reasonId"],
        "ReasonId",
      );
      validateLedgerSubjectV1(effect.entry.subject, references, context, [
        ...path,
        "entry",
        "subject",
      ]);
      return;
    case "calendar.ap.adjust":
    case "reputation.adjust":
    case "actor.stamina.adjust":
    case "actor.mood.adjust":
    case "relationship.affection.adjust":
    case "relationship.teamwork.adjust":
    case "relationship.stage.set":
    case "tavern.helper.set":
      return;
  }
}

function validateEffectIntentsV1(
  effects: readonly ParsedEffectIntentV1[],
  references: AggregateReferenceCatalogV1,
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
): void {
  effects.forEach((effect, index) => {
    validateEffectIntentV1(effect, references, context, [...path, index]);
  });
}

type StaticEffectOwnerV1 =
  | { readonly kind: "story_action"; readonly actionId: string }
  | { readonly kind: "world_action"; readonly actionId: string }
  | { readonly kind: "story_event"; readonly eventId: string };

function validateEffectSourceProvenanceV1(
  effects: readonly ParsedEffectIntentV1[],
  owner: StaticEffectOwnerV1,
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
): void {
  const source = (
    owner.kind === "story_event"
      ? { kind: "event", eventId: owner.eventId }
      : { kind: owner.kind, actionId: owner.actionId }
  ) as PocEffectSourceV1;
  effects.forEach((effect, effectIndex) => {
    validatePocEffectSourceProvenanceV1(effect as PocEffectIntentV1, source, context, [
      ...path,
      effectIndex,
    ]);
  });
}

const pocSimulationDataZodSchemaV1 = z
  .strictObject({
    dataRevision: z.literal(1),
    manifest: pocSimulationManifestZodSchemaV1,
    stateDefinitions: storyStateDefinitionsZodSchemaV1,
    initialState: storyInitialStateZodSchemaV1,
    balance: pocStoryBalanceZodSchemaV1,
    content: pocSimulationContentZodSchemaV1,
    narrative: pocNarrativeProgramZodSchemaV1,
  })
  .superRefine((data, context) => {
    validateUniqueEntriesV1(
      data.stateDefinitions.facts,
      ({ factId }) => factId,
      "factId",
      context,
      ["stateDefinitions", "facts"],
      "FactId",
    );
    validateStableIdAscendingOrderV1(
      data.stateDefinitions.facts,
      ({ factId }) => factId,
      "factId",
      context,
      ["stateDefinitions", "facts"],
      "FactId",
    );
    validateUniqueEntriesV1(
      data.stateDefinitions.quests,
      ({ questId }) => questId,
      "questId",
      context,
      ["stateDefinitions", "quests"],
      "QuestId",
    );
    validateStableIdAscendingOrderV1(
      data.stateDefinitions.quests,
      ({ questId }) => questId,
      "questId",
      context,
      ["stateDefinitions", "quests"],
      "QuestId",
    );
    validateUniqueEntriesV1(
      data.stateDefinitions.outcomes,
      ({ outcomeId }) => outcomeId,
      "outcomeId",
      context,
      ["stateDefinitions", "outcomes"],
      "OutcomeId",
    );
    validateStableIdAscendingOrderV1(
      data.stateDefinitions.outcomes,
      ({ outcomeId }) => outcomeId,
      "outcomeId",
      context,
      ["stateDefinitions", "outcomes"],
      "OutcomeId",
    );

    const contentIdCollections: readonly [readonly { readonly id: string }[], string, string][] = [
      [
        data.content.characters.map(({ characterId }) => ({ id: characterId })),
        "characters",
        "CharacterId",
      ],
      [data.content.reasons.map(({ reasonId }) => ({ id: reasonId })), "reasons", "ReasonId"],
      [data.content.actions.map(({ actionId }) => ({ id: actionId })), "actions", "ActionId"],
      [
        data.content.storyActions.map(({ actionId }) => ({ id: actionId })),
        "storyActions",
        "StoryAction ActionId",
      ],
      [
        data.content.customerSegments.map(({ segmentId }) => ({ id: segmentId })),
        "customerSegments",
        "CustomerSegmentId",
      ],
      [
        data.content.modifierSources.map(({ sourceId }) => ({ id: sourceId })),
        "modifierSources",
        "ModifierSourceId",
      ],
      [
        data.content.ingredients.map(({ ingredientId }) => ({ id: ingredientId })),
        "ingredients",
        "IngredientId",
      ],
      [data.content.items.map(({ itemId }) => ({ id: itemId })), "items", "ItemId"],
      [data.content.recipes.map(({ recipeId }) => ({ id: recipeId })), "recipes", "RecipeId"],
      [
        data.content.facilities.map(({ facilityId }) => ({ id: facilityId })),
        "facilities",
        "FacilityId",
      ],
      [
        data.content.facilityOpportunities.map(({ opportunityId }) => ({ id: opportunityId })),
        "facilityOpportunities",
        "OpportunityId",
      ],
      [data.content.auras.map(({ auraId }) => ({ id: auraId })), "auras", "AuraId"],
      [
        data.content.worldActions.map(({ actionId }) => ({ id: actionId })),
        "worldActions",
        "WorldAction ActionId",
      ],
      [data.content.events.map(({ eventId }) => ({ id: eventId })), "events", "EventId"],
      [data.content.checks.map(({ checkId }) => ({ id: checkId })), "checks", "CheckId"],
      [data.content.endings.map(({ endingId }) => ({ id: endingId })), "endings", "EndingId"],
    ];
    for (const [entries, field, label] of contentIdCollections) {
      validateUniqueEntriesV1(entries, ({ id }) => id, "id", context, ["content", field], label);
    }
    validateUniqueEntriesV1(
      data.narrative.scenes,
      ({ sceneId }) => sceneId,
      "sceneId",
      context,
      ["narrative", "scenes"],
      "SceneId",
    );

    const actionIds = new Set(data.content.actions.map(({ actionId }) => actionId));
    const auraIds = new Set(data.content.auras.map(({ auraId }) => auraId));
    const characterIds = new Set(data.content.characters.map(({ characterId }) => characterId));
    const checkIds = new Set(data.content.checks.map(({ checkId }) => checkId));
    const endingIds = new Set(data.content.endings.map(({ endingId }) => endingId));
    const eventIds = new Set(data.content.events.map(({ eventId }) => eventId));
    const facilityIds = new Set(data.content.facilities.map(({ facilityId }) => facilityId));
    const factIds = new Set(data.stateDefinitions.facts.map(({ factId }) => factId));
    const ingredientIds = new Set(data.content.ingredients.map(({ ingredientId }) => ingredientId));
    const itemIds = new Set(data.content.items.map(({ itemId }) => itemId));
    const modifierSourceIds = new Set(data.content.modifierSources.map(({ sourceId }) => sourceId));
    const outcomeIds = new Set(data.stateDefinitions.outcomes.map(({ outcomeId }) => outcomeId));
    const opportunityIds = new Set(
      data.content.facilityOpportunities.map(({ opportunityId }) => opportunityId),
    );
    const questIds = new Set(data.stateDefinitions.quests.map(({ questId }) => questId));
    const reasonIds = new Set(data.content.reasons.map(({ reasonId }) => reasonId));
    const recipeIds = new Set(data.content.recipes.map(({ recipeId }) => recipeId));
    const customerSegmentIds = new Set(
      data.content.customerSegments.map(({ segmentId }) => segmentId),
    );
    const storyActionIds = new Set(data.content.storyActions.map(({ actionId }) => actionId));
    const worldActionIds = new Set(data.content.worldActions.map(({ actionId }) => actionId));
    const sceneIds = new Set(data.narrative.scenes.map(({ sceneId }) => sceneId));
    const auraDefinitionById = new Map<string, ParsedAuraDefinitionV1>();
    data.content.auras.forEach((aura) => auraDefinitionById.set(aura.auraId, aura));
    const factDefinitions = new Map<string, ParsedStoryValueDefinitionV1>();
    data.stateDefinitions.facts.forEach(({ factId, value }) => {
      factDefinitions.set(factId, value);
      if (value.kind === "token") {
        validateUniqueValuesV1(
          value.allowedValues,
          context,
          ["stateDefinitions", "facts", factDefinitions.size - 1, "value", "allowedValues"],
          "StoryToken",
        );
      }
    });
    const outcomeDefinitions = new Map<string, ParsedStoryValueDefinitionV1>();
    data.stateDefinitions.outcomes.forEach(({ outcomeId, value }, index) => {
      outcomeDefinitions.set(outcomeId, value);
      if (value.kind === "token") {
        validateUniqueValuesV1(
          value.allowedValues,
          context,
          ["stateDefinitions", "outcomes", index, "value", "allowedValues"],
          "StoryToken",
        );
      }
    });
    data.stateDefinitions.quests.forEach((quest, index) => {
      if (quest.initial.questId !== quest.questId) {
        addAggregateValidationIssueV1(
          context,
          ["stateDefinitions", "quests", index, "initial", "questId"],
          "Quest initial state must reference its owning QuestId",
        );
      }
    });
    const references: AggregateReferenceCatalogV1 = {
      actionIds,
      auraIds,
      auraDefinitions: auraDefinitionById,
      checkIds,
      endingIds,
      eventIds,
      facilityIds,
      factIds,
      ingredientIds,
      itemIds,
      modifierSourceIds,
      outcomeIds,
      opportunityIds,
      questIds,
      reasonIds,
      recipeIds,
      segmentIds: customerSegmentIds,
      storyActionIds,
      worldActionIds,
      factDefinitions,
      outcomeDefinitions,
    };
    if (!sceneIds.has(data.manifest.initialSceneId)) {
      addAggregateValidationIssueV1(
        context,
        ["manifest", "initialSceneId"],
        `unknown SceneId: ${data.manifest.initialSceneId}`,
      );
    }

    validateUniqueValuesV1(
      data.initialState.unlockedRecipeIds,
      context,
      ["initialState", "unlockedRecipeIds"],
      "RecipeId",
    );
    data.initialState.unlockedRecipeIds.forEach((recipeId, index) => {
      validateReferenceV1(
        recipeIds,
        recipeId,
        context,
        ["initialState", "unlockedRecipeIds", index],
        "RecipeId",
      );
    });
    validateUniqueEntriesV1(
      data.initialState.ingredientBatches,
      ({ batchId }) => batchId,
      "batchId",
      context,
      ["initialState", "ingredientBatches"],
      "BatchId",
    );
    data.initialState.ingredientBatches.forEach((batch, index) => {
      validateReferenceV1(
        ingredientIds,
        batch.ingredientId,
        context,
        ["initialState", "ingredientBatches", index, "ingredientId"],
        "IngredientId",
      );
      validateInventorySourceRefV1(batch.source, references, context, [
        "initialState",
        "ingredientBatches",
        index,
        "source",
      ]);
    });
    validateUniqueEntriesV1(
      data.initialState.itemStacks,
      ({ itemId }) => itemId,
      "itemId",
      context,
      ["initialState", "itemStacks"],
      "ItemId",
    );
    data.initialState.itemStacks.forEach((stack, index) => {
      validateReferenceV1(
        itemIds,
        stack.itemId,
        context,
        ["initialState", "itemStacks", index, "itemId"],
        "ItemId",
      );
    });
    validateUniqueEntriesV1(
      data.initialState.auras,
      ({ instanceId }) => instanceId,
      "instanceId",
      context,
      ["initialState", "auras"],
      "AuraInstanceId",
    );
    const initialAuraTargetKeys = new Set<string>();
    data.initialState.auras.forEach((aura, index) => {
      const auraPath = ["initialState", "auras", index] as const;
      const expectedInstanceId = `aura:initial:${index}`;
      if (aura.instanceId !== expectedInstanceId) {
        addAggregateValidationIssueV1(
          context,
          [...auraPath, "instanceId"],
          `initial Aura instanceId must be ${expectedInstanceId}`,
        );
      }
      validateReferenceV1(auraIds, aura.auraId, context, [...auraPath, "auraId"], "AuraId");
      validateAuraSourceRefV1(aura.source, references, context, [...auraPath, "source"]);
      if (aura.source.kind !== "initial") {
        addAggregateValidationIssueV1(
          context,
          [...auraPath, "source", "kind"],
          "initial Aura source must be initial",
        );
      }
      if (aura.appliedAtSequence !== 0) {
        addAggregateValidationIssueV1(
          context,
          [...auraPath, "appliedAtSequence"],
          "initial Aura appliedAtSequence must be 0",
        );
      }
      const targetKey = `${aura.auraId}:${auraTargetKeyV1(aura.target)}`;
      if (initialAuraTargetKeys.has(targetKey)) {
        addAggregateValidationIssueV1(
          context,
          [...auraPath, "target"],
          `duplicate initial Aura target: ${targetKey}`,
        );
      }
      initialAuraTargetKeys.add(targetKey);
      const definition = auraDefinitionById.get(aura.auraId);
      if (definition === undefined) return;
      const allowedTargetKeys = new Set(definition.allowedTargets.map(auraTargetKeyV1));
      if (!allowedTargetKeys.has(auraTargetKeyV1(aura.target))) {
        addAggregateValidationIssueV1(
          context,
          [...auraPath, "target"],
          "initial Aura target is not allowed by its definition",
        );
      }
      if (definition.durationPolicy.kind !== aura.duration.kind) {
        addAggregateValidationIssueV1(
          context,
          [...auraPath, "duration"],
          "initial Aura duration kind does not match its definition",
        );
        return;
      }
      if (
        definition.durationPolicy.kind === "countdown" &&
        aura.duration.kind === "countdown" &&
        (definition.durationPolicy.unit !== aura.duration.unit ||
          aura.duration.remaining !== definition.durationPolicy.defaultRemaining ||
          aura.duration.remaining > definition.durationPolicy.maximumRemaining)
      ) {
        addAggregateValidationIssueV1(
          context,
          [...auraPath, "duration"],
          "initial Aura countdown is incompatible with its definition",
        );
      }
    });

    data.content.recipes.forEach((recipe, recipeIndex) => {
      validateUniqueEntriesV1(
        recipe.ingredients,
        ({ ingredientId }) => ingredientId,
        "ingredientId",
        context,
        ["content", "recipes", recipeIndex, "ingredients"],
        "IngredientId",
      );
      recipe.ingredients.forEach((ingredient, ingredientIndex) => {
        validateReferenceV1(
          ingredientIds,
          ingredient.ingredientId,
          context,
          ["content", "recipes", recipeIndex, "ingredients", ingredientIndex, "ingredientId"],
          "IngredientId",
        );
      });
    });

    validateUniqueValuesV1(
      data.balance.serviceDays,
      context,
      ["balance", "serviceDays"],
      "DayIndex",
    );
    const serviceDays = new Set(data.balance.serviceDays);
    const demandKeys = new Set<string>();
    data.balance.baseDemand.forEach((line, lineIndex) => {
      const key = `${line.day}:${line.segmentId}`;
      if (demandKeys.has(key)) {
        addAggregateValidationIssueV1(
          context,
          ["balance", "baseDemand", lineIndex],
          `duplicate base demand key: ${key}`,
        );
      }
      demandKeys.add(key);
      if (!serviceDays.has(line.day)) {
        addAggregateValidationIssueV1(
          context,
          ["balance", "baseDemand", lineIndex, "day"],
          `base demand uses a non-service day: ${line.day}`,
        );
      }
      validateReferenceV1(
        customerSegmentIds,
        line.segmentId,
        context,
        ["balance", "baseDemand", lineIndex, "segmentId"],
        "CustomerSegmentId",
      );
    });
    data.balance.serviceDays.forEach((day) => {
      customerSegmentIds.forEach((segmentId) => {
        const key = `${day}:${segmentId}`;
        if (!demandKeys.has(key)) {
          addAggregateValidationIssueV1(
            context,
            ["balance", "baseDemand"],
            `missing base demand key: ${key}`,
          );
        }
      });
    });

    validateUniqueEntriesV1(
      data.balance.lifePolicies,
      ({ policyId }) => policyId,
      "policyId",
      context,
      ["balance", "lifePolicies"],
      "PolicyId",
    );
    data.balance.lifePolicies.forEach((policy, policyIndex) => {
      validateReferenceV1(
        reasonIds,
        policy.nightRecoveryReasonId,
        context,
        ["balance", "lifePolicies", policyIndex, "nightRecoveryReasonId"],
        "ReasonId",
      );
    });
    validateUniqueEntriesV1(
      data.balance.actionCosts,
      ({ action }) => action,
      "action",
      context,
      ["balance", "actionCosts"],
      "ActionCost key",
    );
    data.balance.actionCosts.forEach((cost, costIndex) => {
      validateReferenceV1(
        reasonIds,
        cost.reasonId,
        context,
        ["balance", "actionCosts", costIndex, "reasonId"],
        "ReasonId",
      );
    });
    validateUniqueEntriesV1(
      data.balance.serviceModes,
      ({ mode }) => mode,
      "mode",
      context,
      ["balance", "serviceModes"],
      "ServiceMode",
    );
    data.balance.serviceModes.forEach((mode, modeIndex) => {
      const modePath = ["balance", "serviceModes", modeIndex] as const;
      validateReferenceV1(reasonIds, mode.reasonId, context, [...modePath, "reasonId"], "ReasonId");
      validateAvailabilityGatesV1(mode.availability, references, context, [
        ...modePath,
        "availability",
      ]);
      validateConfirmationMetadataV1(mode.confirmation, references, context, [
        ...modePath,
        "confirmation",
      ]);
    });
    data.balance.serviceDays.forEach((day, dayIndex) => {
      if (day > data.manifest.playableDays) {
        addAggregateValidationIssueV1(
          context,
          ["balance", "serviceDays", dayIndex],
          `service day exceeds playableDays: ${day}`,
        );
      }
    });
    if (data.balance.levyDue.day > data.manifest.playableDays) {
      addAggregateValidationIssueV1(
        context,
        ["balance", "levyDue", "day"],
        "levyDue exceeds playableDays",
      );
    }
    if (data.balance.obligationForecast.visibleFrom.day > data.manifest.playableDays) {
      addAggregateValidationIssueV1(
        context,
        ["balance", "obligationForecast", "visibleFrom", "day"],
        "obligation forecast visibility exceeds playableDays",
      );
    }
    if (data.balance.obligationForecast.conservativeFrom.day > data.manifest.playableDays) {
      addAggregateValidationIssueV1(
        context,
        ["balance", "obligationForecast", "conservativeFrom", "day"],
        "obligation forecast conservative boundary exceeds playableDays",
      );
    }
    data.balance.obligationForecast.recommendations.forEach(
      (recommendation, recommendationIndex) => {
        validateUniqueValuesV1(
          recommendation.appliesTo,
          context,
          ["balance", "obligationForecast", "recommendations", recommendationIndex, "appliesTo"],
          "ObligationForecastKind",
        );
        if (recommendation.actionId !== null) {
          validateReferenceV1(
            actionIds,
            recommendation.actionId,
            context,
            ["balance", "obligationForecast", "recommendations", recommendationIndex, "actionId"],
            "ActionId",
          );
        }
      },
    );

    const actionById = new Map<string, (typeof data.content.actions)[number]>();
    data.content.actions.forEach((action) => actionById.set(action.actionId, action));
    const validateSpecializedActionV1 = (
      actionId: string,
      expectedCommandKind: "story.action.start" | "facility.choose" | "world.action.begin",
      path: AggregateValidationPathV1,
    ): void => {
      const action = actionById.get(actionId);
      validateReferenceV1(actionIds, actionId, context, path, "ActionId");
      if (action !== undefined && action.commandKind !== expectedCommandKind) {
        addAggregateValidationIssueV1(
          context,
          path,
          `ActionId ${actionId} does not use ${expectedCommandKind}`,
        );
      }
    };

    data.content.actions.forEach((action, actionIndex) => {
      const actionPath = ["content", "actions", actionIndex] as const;
      validateUniqueValuesV1(
        action.availablePhases,
        context,
        [...actionPath, "availablePhases"],
        "CalendarPhase",
      );
      if (action.occupation.kind === "fixed") {
        validateUniqueValuesV1(
          action.occupation.phases,
          context,
          [...actionPath, "occupation", "phases"],
          "CalendarPhase",
        );
      }
      validateAvailabilityGatesV1(action.visibility, references, context, [
        ...actionPath,
        "visibility",
      ]);
      validateAvailabilityGatesV1(action.availability, references, context, [
        ...actionPath,
        "availability",
      ]);
      validateConfirmationMetadataV1(action.confirmation, references, context, [
        ...actionPath,
        "confirmation",
      ]);
    });
    const genericActionCommandKinds = [
      "policy.choose",
      "inventory.buy",
      "actor.prepare_food",
      "actor.rest",
      "tavern.plan.set",
      "calendar.advance_phase",
      "levy.pay",
    ] as const;
    for (const commandKind of genericActionCommandKinds) {
      const matches = data.content.actions.filter((action) => action.commandKind === commandKind);
      if (matches.length !== 1) {
        addAggregateValidationIssueV1(
          context,
          ["content", "actions"],
          `commandKind ${commandKind} requires exactly one generic Action presentation`,
        );
      }
    }

    data.content.storyActions.forEach((action, actionIndex) => {
      const actionPath = ["content", "storyActions", actionIndex] as const;
      validateSpecializedActionV1(action.actionId, "story.action.start", [
        ...actionPath,
        "actionId",
      ]);
      if (action.sceneId !== null) {
        validateReferenceV1(
          sceneIds,
          action.sceneId,
          context,
          [...actionPath, "sceneId"],
          "SceneId",
        );
      }
      validateEffectIntentsV1(action.startEffects, references, context, [
        ...actionPath,
        "startEffects",
      ]);
      validateEffectSourceProvenanceV1(
        action.startEffects,
        { kind: "story_action", actionId: action.actionId },
        context,
        [...actionPath, "startEffects"],
      );
    });

    data.content.recipes.forEach((recipe, recipeIndex) => {
      validateUniqueEntriesV1(
        recipe.preferences,
        ({ segmentId }) => segmentId,
        "segmentId",
        context,
        ["content", "recipes", recipeIndex, "preferences"],
        "CustomerSegmentId",
      );
      recipe.preferences.forEach((preference, preferenceIndex) => {
        validateReferenceV1(
          customerSegmentIds,
          preference.segmentId,
          context,
          ["content", "recipes", recipeIndex, "preferences", preferenceIndex, "segmentId"],
          "CustomerSegmentId",
        );
      });
    });

    data.content.facilities.forEach((facility, facilityIndex) => {
      facility.modifiers.forEach((modifier, modifierIndex) => {
        const modifierPath = [
          "content",
          "facilities",
          facilityIndex,
          "modifiers",
          modifierIndex,
        ] as const;
        validateModifierV1(modifier, references, context, [...modifierPath]);
        if (
          modifier.source.kind !== "facility" ||
          modifier.source.facilityId !== facility.facilityId
        ) {
          addAggregateValidationIssueV1(
            context,
            [...modifierPath, "source"],
            `Facility modifier source must be ${facility.facilityId}`,
          );
        }
      });
      validateConfirmationMetadataV1(facility.confirmation, references, context, [
        "content",
        "facilities",
        facilityIndex,
        "confirmation",
      ]);
    });

    data.content.facilityOpportunities.forEach((opportunity, opportunityIndex) => {
      const opportunityPath = ["content", "facilityOpportunities", opportunityIndex] as const;
      validateSpecializedActionV1(opportunity.opportunityId, "facility.choose", [
        ...opportunityPath,
        "opportunityId",
      ]);
      validateUniqueValuesV1(
        opportunity.facilityIds,
        context,
        [...opportunityPath, "facilityIds"],
        "FacilityId",
      );
      opportunity.facilityIds.forEach((facilityId, facilityIndex) => {
        validateReferenceV1(
          facilityIds,
          facilityId,
          context,
          [...opportunityPath, "facilityIds", facilityIndex],
          "FacilityId",
        );
      });
      validateAvailabilityGatesV1(opportunity.availability, references, context, [
        ...opportunityPath,
        "availability",
      ]);
      validateConfirmationMetadataV1(opportunity.confirmation, references, context, [
        ...opportunityPath,
        "confirmation",
      ]);
      validateConfirmationMetadataV1(opportunity.skipConfirmation, references, context, [
        ...opportunityPath,
        "skipConfirmation",
      ]);
      validateReferenceV1(
        reasonIds,
        opportunity.skipReasonId,
        context,
        [...opportunityPath, "skipReasonId"],
        "ReasonId",
      );
    });

    data.content.auras.forEach((aura, auraIndex) => {
      const auraPath = ["content", "auras", auraIndex] as const;
      validateReferenceV1(reasonIds, aura.reasonId, context, [...auraPath, "reasonId"], "ReasonId");
      validateUniqueValuesV1(
        aura.allowedTargets.map((target) =>
          target.kind === "actor" ? `actor:${target.actorId}` : target.kind,
        ),
        context,
        [...auraPath, "allowedTargets"],
        "AuraTarget",
      );
      aura.modifiers.forEach((modifier, modifierIndex) => {
        const modifierPath = [...auraPath, "modifiers", modifierIndex] as const;
        validateModifierV1(modifier, references, context, [...modifierPath]);
        if (modifier.source.kind !== "aura" || modifier.source.auraId !== aura.auraId) {
          addAggregateValidationIssueV1(
            context,
            [...modifierPath, "source"],
            `Aura modifier source must be ${aura.auraId}`,
          );
        }
      });
    });

    data.content.worldActions.forEach((worldAction, worldActionIndex) => {
      const actionPath = ["content", "worldActions", worldActionIndex] as const;
      validateSpecializedActionV1(worldAction.actionId, "world.action.begin", [
        ...actionPath,
        "actionId",
      ]);
      validateReferenceV1(
        reasonIds,
        worldAction.reasonId,
        context,
        [...actionPath, "reasonId"],
        "ReasonId",
      );
      validateAvailabilityGatesV1(worldAction.availability, references, context, [
        ...actionPath,
        "availability",
      ]);
      validateEffectIntentsV1(worldAction.beginEffects, references, context, [
        ...actionPath,
        "beginEffects",
      ]);
      validateEffectSourceProvenanceV1(
        worldAction.beginEffects,
        { kind: "world_action", actionId: worldAction.actionId },
        context,
        [...actionPath, "beginEffects"],
      );
      validateUniqueEntriesV1(
        worldAction.options,
        ({ optionId }) => optionId,
        "optionId",
        context,
        [...actionPath, "options"],
        "ChoiceId",
      );
      worldAction.options.forEach((option, optionIndex) => {
        const optionPath = [...actionPath, "options", optionIndex] as const;
        validateAvailabilityGatesV1(option.availability, references, context, [
          ...optionPath,
          "availability",
        ]);
        validateEffectIntentsV1(option.beginEffects, references, context, [
          ...optionPath,
          "beginEffects",
        ]);
        validateEffectSourceProvenanceV1(
          option.beginEffects,
          { kind: "world_action", actionId: worldAction.actionId },
          context,
          [...optionPath, "beginEffects"],
        );
        validateConfirmationMetadataV1(option.confirmation, references, context, [
          ...optionPath,
          "confirmation",
        ]);
      });
      validateUniqueEntriesV1(
        worldAction.steps,
        ({ stepId }) => stepId,
        "stepId",
        context,
        [...actionPath, "steps"],
        "WorldStepId",
      );
      worldAction.steps.forEach((step, stepIndex) => {
        const stepPath = [...actionPath, "steps", stepIndex] as const;
        validateReferenceV1(sceneIds, step.sceneId, context, [...stepPath, "sceneId"], "SceneId");
      });
      const beginPhase = worldAction.steps[0].phase;
      const expectedCompletionPhase =
        beginPhase === "morning" ? "afternoon" : beginPhase === "afternoon" ? "evening" : "morning";
      if (worldAction.steps[1].phase !== expectedCompletionPhase) {
        addAggregateValidationIssueV1(
          context,
          [...actionPath, "steps", 1, "phase"],
          `WorldAction completion phase must immediately follow ${beginPhase}`,
        );
      }
      if (worldAction.checkId !== null) {
        validateReferenceV1(
          checkIds,
          worldAction.checkId,
          context,
          [...actionPath, "checkId"],
          "CheckId",
        );
      }
    });

    const eventCheckpointIds = new Set<string>();
    const explicitEventCheckpointIds = new Set<string>();
    data.content.events.forEach((event, eventIndex) => {
      const eventPath = ["content", "events", eventIndex] as const;
      if (eventCheckpointIds.has(event.checkpointId)) {
        addAggregateValidationIssueV1(
          context,
          [...eventPath, "checkpointId"],
          `duplicate CheckpointId: ${event.checkpointId}`,
        );
      }
      eventCheckpointIds.add(event.checkpointId);
      if (event.weightedGroupId === null && event.weight !== 0) {
        addAggregateValidationIssueV1(
          context,
          [...eventPath, "weight"],
          "unweighted Event must have weight 0",
        );
      }
      if (event.weightedGroupId !== null && event.weight <= 0) {
        addAggregateValidationIssueV1(
          context,
          [...eventPath, "weight"],
          "weighted Event must have positive weight",
        );
      }
      if (event.sceneId !== null) {
        validateReferenceV1(sceneIds, event.sceneId, context, [...eventPath, "sceneId"], "SceneId");
      }
      event.when.forEach((condition, conditionIndex) => {
        validateConditionV1(condition, references, context, [...eventPath, "when", conditionIndex]);
      });
      validateEffectIntentsV1(event.effects, references, context, [...eventPath, "effects"]);
      validateEffectSourceProvenanceV1(
        event.effects,
        { kind: "story_event", eventId: event.eventId },
        context,
        [...eventPath, "effects"],
      );
      switch (event.trigger.kind) {
        case "phase.entered":
          validateUniqueValuesV1(
            event.trigger.days,
            context,
            [...eventPath, "trigger", "days"],
            "DayIndex",
          );
          validateCatalogOrderV1(
            event.trigger.days,
            [1, 2, 3, 4, 5, 6, 7],
            context,
            [...eventPath, "trigger", "days"],
            "DayIndex",
          );
          event.trigger.days.forEach((day, dayIndex) => {
            if (day > data.manifest.playableDays) {
              addAggregateValidationIssueV1(
                context,
                [...eventPath, "trigger", "days", dayIndex],
                `Event day exceeds playableDays: ${day}`,
              );
            }
          });
          validateUniqueValuesV1(
            event.trigger.phases,
            context,
            [...eventPath, "trigger", "phases"],
            "CalendarPhase",
          );
          validateCatalogOrderV1(
            event.trigger.phases,
            calendarPhaseZodSchemaV1.options,
            context,
            [...eventPath, "trigger", "phases"],
            "CalendarPhase",
          );
          break;
        case "day.ended":
          validateUniqueValuesV1(
            event.trigger.days,
            context,
            [...eventPath, "trigger", "days"],
            "DayIndex",
          );
          validateCatalogOrderV1(
            event.trigger.days,
            [1, 2, 3, 4, 5, 6, 7],
            context,
            [...eventPath, "trigger", "days"],
            "DayIndex",
          );
          event.trigger.days.forEach((day, dayIndex) => {
            if (day > data.manifest.playableDays) {
              addAggregateValidationIssueV1(
                context,
                [...eventPath, "trigger", "days", dayIndex],
                `Event day exceeds playableDays: ${day}`,
              );
            }
          });
          break;
        case "command.succeeded":
          validateUniqueValuesV1(
            event.trigger.commandKinds,
            context,
            [...eventPath, "trigger", "commandKinds"],
            "CommandKind",
          );
          validateCatalogOrderV1(
            event.trigger.commandKinds,
            pocGameCommandKindZodSchemaV1.options,
            context,
            [...eventPath, "trigger", "commandKinds"],
            "CommandKind",
          );
          break;
        case "story.explicit":
          explicitEventCheckpointIds.add(event.trigger.checkpointId);
          break;
        case "opening.started":
        case "opening.middle":
        case "opening.before_finalize":
        case "week.ended":
          break;
      }
      const requiresTerminalSafeEffects =
        event.trigger.kind === "week.ended" ||
        (event.trigger.kind === "command.succeeded" &&
          event.trigger.commandKinds.includes("levy.pay"));
      if (
        (event.trigger.kind === "story.explicit" || requiresTerminalSafeEffects) &&
        event.sceneId !== null
      ) {
        addAggregateValidationIssueV1(
          context,
          [...eventPath, "sceneId"],
          `${event.trigger.kind} Event must not start a Scene`,
        );
      }
      if (requiresTerminalSafeEffects) {
        event.effects.forEach((effect, effectIndex) => {
          if (effect.kind !== "fact.set" && effect.kind !== "quest.set") {
            addAggregateValidationIssueV1(
              context,
              [...eventPath, "effects", effectIndex],
              `${event.trigger.kind} Event effect must set a Fact or Quest`,
            );
          }
        });
      }
    });

    const checkBandIdsByCheck = new Map<string, ReadonlySet<string>>();
    data.content.checks.forEach((check, checkIndex) => {
      validateUniqueEntriesV1(
        check.bands,
        ({ bandId }) => bandId,
        "bandId",
        context,
        ["content", "checks", checkIndex, "bands"],
        "CheckBandId",
      );
      const bandIds = new Set<string>();
      check.bands.forEach((band, bandIndex) => {
        bandIds.add(band.bandId);
        validateEffectIntentsV1(band.effects, references, context, [
          "content",
          "checks",
          checkIndex,
          "bands",
          bandIndex,
          "effects",
        ]);
      });
      checkBandIdsByCheck.set(check.checkId, bandIds);
    });

    const terminalEndingStatuses = [
      "completed_stable",
      "completed_danger",
      "failed_arrears",
    ] as const;
    terminalEndingStatuses.forEach((status) => {
      const matchingEndingIndexes = data.content.endings.flatMap((ending, endingIndex) =>
        ending.status === status ? [endingIndex] : [],
      );
      if (matchingEndingIndexes.length !== 1) {
        addAggregateValidationIssueV1(
          context,
          ["content", "endings"],
          `Ending status ${status} must have exactly one definition`,
        );
      }
    });

    const sharedSummaryOutcomeIds = data.content.endings[0]?.summaryOutcomeIds;
    data.content.endings.forEach((ending, endingIndex) => {
      const endingPath = ["content", "endings", endingIndex] as const;
      const { investigation, relationship } = ending.summaryOutcomeIds;
      validateReferenceV1(
        outcomeIds,
        relationship,
        context,
        [...endingPath, "summaryOutcomeIds", "relationship"],
        "OutcomeId",
      );
      validateReferenceV1(
        outcomeIds,
        investigation,
        context,
        [...endingPath, "summaryOutcomeIds", "investigation"],
        "OutcomeId",
      );
      if (relationship === investigation) {
        addAggregateValidationIssueV1(
          context,
          [...endingPath, "summaryOutcomeIds"],
          "Ending relationship and investigation summary OutcomeIds must differ",
        );
      }
      if (
        sharedSummaryOutcomeIds !== undefined &&
        (relationship !== sharedSummaryOutcomeIds.relationship ||
          investigation !== sharedSummaryOutcomeIds.investigation)
      ) {
        addAggregateValidationIssueV1(
          context,
          [...endingPath, "summaryOutcomeIds"],
          "Ending definitions must share the same summary OutcomeIds",
        );
      }
      validateEffectIntentsV1(ending.effects, references, context, [...endingPath, "effects"]);
    });

    for (const action of data.content.actions) {
      if (action.commandKind === "story.action.start" && !storyActionIds.has(action.actionId)) {
        addAggregateValidationIssueV1(
          context,
          ["content", "storyActions"],
          `missing StoryAction definition: ${action.actionId}`,
        );
      }
      if (action.commandKind === "facility.choose" && !opportunityIds.has(action.actionId)) {
        addAggregateValidationIssueV1(
          context,
          ["content", "facilityOpportunities"],
          `missing FacilityOpportunity definition: ${action.actionId}`,
        );
      }
      if (action.commandKind === "world.action.begin" && !worldActionIds.has(action.actionId)) {
        addAggregateValidationIssueV1(
          context,
          ["content", "worldActions"],
          `missing WorldAction definition: ${action.actionId}`,
        );
      }
    }

    const sceneNodeIds = new Map<string, ReadonlySet<string>>();
    const narrativeEventCheckpointIds = new Set<string>();
    data.narrative.scenes.forEach((scene, sceneIndex) => {
      validateUniqueEntriesV1(
        scene.nodes,
        ({ nodeId }) => nodeId,
        "nodeId",
        context,
        ["narrative", "scenes", sceneIndex, "nodes"],
        "NodeId",
      );
      const nodeIds = new Set(scene.nodes.map(({ nodeId }) => nodeId));
      sceneNodeIds.set(scene.sceneId, nodeIds);
      validateReferenceV1(
        nodeIds,
        scene.entryNodeId,
        context,
        ["narrative", "scenes", sceneIndex, "entryNodeId"],
        "NodeId",
      );
    });
    data.narrative.scenes.forEach((scene, sceneIndex) => {
      const nodeIds = sceneNodeIds.get(scene.sceneId);
      if (nodeIds === undefined) return;
      scene.nodes.forEach((node, nodeIndex) => {
        const nodePath = ["narrative", "scenes", sceneIndex, "nodes", nodeIndex] as const;
        const validateLocalNode = (nodeId: string, field: string): void => {
          validateReferenceV1(nodeIds, nodeId, context, [...nodePath, field], "NodeId");
        };
        switch (node.kind) {
          case "line":
            validateReferenceV1(
              characterIds,
              node.speakerId,
              context,
              [...nodePath, "speakerId"],
              "CharacterId",
            );
            validateLocalNode(node.nextNodeId, "nextNodeId");
            break;
          case "narration":
            validateLocalNode(node.nextNodeId, "nextNodeId");
            break;
          case "choice":
            validateUniqueEntriesV1(
              node.choices,
              ({ choiceId }) => choiceId,
              "choiceId",
              context,
              [...nodePath, "choices"],
              "ChoiceId",
            );
            node.choices.forEach((choice, choiceIndex) => {
              const choicePath = [...nodePath, "choices", choiceIndex] as const;
              choice.showWhen.forEach((condition, conditionIndex) => {
                validateConditionV1(condition, references, context, [
                  ...choicePath,
                  "showWhen",
                  conditionIndex,
                ]);
              });
              choice.enableWhen.forEach((condition, conditionIndex) => {
                validateConditionV1(condition, references, context, [
                  ...choicePath,
                  "enableWhen",
                  conditionIndex,
                ]);
              });
              if (choice.disabledReasonId !== undefined) {
                validateReferenceV1(
                  reasonIds,
                  choice.disabledReasonId,
                  context,
                  [...choicePath, "disabledReasonId"],
                  "ReasonId",
                );
              }
              validateConfirmationMetadataV1(choice.confirmation, references, context, [
                ...choicePath,
                "confirmation",
              ]);
              if (choice.check !== undefined) {
                validateReferenceV1(
                  checkIds,
                  choice.check.checkId,
                  context,
                  [...choicePath, "check", "checkId"],
                  "CheckId",
                );
              }
              validateEffectIntentsV1(choice.effects, references, context, [
                ...choicePath,
                "effects",
              ]);
              validateReferenceV1(
                nodeIds,
                choice.nextNodeId,
                context,
                [...choicePath, "nextNodeId"],
                "NodeId",
              );
            });
            break;
          case "condition":
            node.when.forEach((condition, conditionIndex) => {
              validateConditionV1(condition, references, context, [
                ...nodePath,
                "when",
                conditionIndex,
              ]);
            });
            validateLocalNode(node.passNodeId, "passNodeId");
            validateLocalNode(node.failNodeId, "failNodeId");
            break;
          case "check": {
            validateReferenceV1(
              checkIds,
              node.request.checkId,
              context,
              [...nodePath, "request", "checkId"],
              "CheckId",
            );
            validateUniqueEntriesV1(
              node.branches,
              ({ bandId }) => bandId,
              "bandId",
              context,
              [...nodePath, "branches"],
              "CheckBandId",
            );
            const checkBandIds = checkBandIdsByCheck.get(node.request.checkId);
            const branchIds = new Set<string>(node.branches.map(({ bandId }) => bandId));
            node.branches.forEach((branch, branchIndex) => {
              if (checkBandIds !== undefined) {
                validateReferenceV1(
                  checkBandIds,
                  branch.bandId,
                  context,
                  [...nodePath, "branches", branchIndex, "bandId"],
                  "CheckBandId",
                );
              }
              validateReferenceV1(
                nodeIds,
                branch.nextNodeId,
                context,
                [...nodePath, "branches", branchIndex, "nextNodeId"],
                "NodeId",
              );
            });
            checkBandIds?.forEach((bandId) => {
              if (!branchIds.has(bandId)) {
                addAggregateValidationIssueV1(
                  context,
                  [...nodePath, "branches"],
                  `missing CheckBand branch: ${bandId}`,
                );
              }
            });
            break;
          }
          case "command":
            validateEffectIntentsV1(node.effects, references, context, [...nodePath, "effects"]);
            validateLocalNode(node.nextNodeId, "nextNodeId");
            break;
          case "eventCheckpoint":
            narrativeEventCheckpointIds.add(node.checkpointId);
            validateReferenceV1(
              explicitEventCheckpointIds,
              node.checkpointId,
              context,
              [...nodePath, "checkpointId"],
              "explicit event CheckpointId",
            );
            validateLocalNode(node.nextNodeId, "nextNodeId");
            break;
          case "jump":
            validateLocalNode(node.targetNodeId, "targetNodeId");
            break;
          case "call": {
            validateReferenceV1(
              sceneIds,
              node.sceneId,
              context,
              [...nodePath, "sceneId"],
              "SceneId",
            );
            const targetNodeIds = sceneNodeIds.get(node.sceneId);
            if (targetNodeIds !== undefined) {
              validateReferenceV1(
                targetNodeIds,
                node.entryNodeId,
                context,
                [...nodePath, "entryNodeId"],
                "NodeId",
              );
            }
            validateLocalNode(node.returnNodeId, "returnNodeId");
            break;
          }
          case "stageCue":
            if (node.cue.kind === "character.show") {
              validateReferenceV1(
                characterIds,
                node.cue.characterId,
                context,
                [...nodePath, "cue", "characterId"],
                "CharacterId",
              );
            }
            validateLocalNode(node.nextNodeId, "nextNodeId");
            break;
          case "return":
          case "end":
            break;
        }
      });
    });
    explicitEventCheckpointIds.forEach((checkpointId) => {
      validateReferenceV1(
        narrativeEventCheckpointIds,
        checkpointId,
        context,
        ["content", "events"],
        "Narrative event CheckpointId",
      );
    });

    const requiredReasonIds = [
      ...data.balance.actionCosts.map(({ reasonId }) => reasonId),
      ...data.balance.serviceModes.map(({ reasonId }) => reasonId),
      ...Object.values(data.balance.ledgerReasons),
      data.balance.emergencyClosure.reasonId,
      data.balance.plannedClosureReasonId,
      data.balance.heroineNightRecoveryReasonId,
      data.balance.obligationForecast.reasonId,
      ...Object.values(data.balance.endingPolicy).filter(
        (value): value is (typeof data.content.reasons)[number]["reasonId"] =>
          typeof value === "string",
      ),
    ];
    requiredReasonIds.forEach((reasonId, index) => {
      validateReferenceV1(
        reasonIds,
        reasonId,
        context,
        ["balance", "referencedReasonIds", index],
        "ReasonId",
      );
    });
  });

export const pocSimulationDataSchemaV1: RuntimeSchemaV1<PocSimulationDataV1> = runtimeSchemaV1(
  pocSimulationDataZodSchemaV1 as z.ZodType<PocSimulationDataV1>,
);

function validatePocEffectSourceReferenceV1(
  source: PocEffectSourceV1,
  references: AggregateReferenceCatalogV1,
  context: AggregateValidationContextV1,
): void {
  switch (source.kind) {
    case "command":
      return;
    case "event":
      validateReferenceV1(
        references.eventIds,
        source.eventId,
        context,
        ["source", "eventId"],
        "EventId",
      );
      return;
    case "story_action":
      validateReferenceV1(
        references.storyActionIds,
        source.actionId,
        context,
        ["source", "actionId"],
        "StoryAction ActionId",
      );
      return;
    case "world_action":
      validateReferenceV1(
        references.worldActionIds,
        source.actionId,
        context,
        ["source", "actionId"],
        "WorldAction ActionId",
      );
      return;
    case "aura":
      validateReferenceV1(
        references.auraIds,
        source.auraId,
        context,
        ["source", "auraId"],
        "AuraId",
      );
      return;
    case "facility":
      validateReferenceV1(
        references.facilityIds,
        source.facilityId,
        context,
        ["source", "facilityId"],
        "FacilityId",
      );
      return;
    case "ending":
      validateReferenceV1(
        references.endingIds,
        source.endingId,
        context,
        ["source", "endingId"],
        "EndingId",
      );
      return;
  }
}

function addEffectSourceProvenanceIssueV1(
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
  message: string,
): void {
  addAggregateValidationIssueV1(context, path, `Effect source provenance mismatch: ${message}`);
}

function validatePocEffectSourceProvenanceV1(
  effect: PocEffectIntentV1,
  source: PocEffectSourceV1,
  context: AggregateValidationContextV1,
  path: AggregateValidationPathV1,
): void {
  if (
    source.kind === "ending" &&
    effect.kind !== "fact.set" &&
    effect.kind !== "quest.set" &&
    effect.kind !== "outcome.set"
  ) {
    addEffectSourceProvenanceIssueV1(
      context,
      path,
      "Ending batches accept only Progression Effect intents",
    );
    return;
  }

  if (effect.kind === "inventory.grant") {
    const matches =
      (source.kind === "event" &&
        effect.source.kind === "story_event" &&
        effect.source.eventId === source.eventId) ||
      (source.kind === "story_action" &&
        effect.source.kind === "story_action" &&
        effect.source.actionId === source.actionId) ||
      (source.kind === "world_action" &&
        effect.source.kind === "world_action" &&
        effect.source.actionId === source.actionId);
    if (!matches) {
      addEffectSourceProvenanceIssueV1(
        context,
        [...path, "source"],
        "Inventory grant source must equal its Event or Action batch source",
      );
    }
    return;
  }

  if (effect.kind === "aura.apply") {
    const matches =
      (source.kind === "event" &&
        effect.source.kind === "story_event" &&
        effect.source.eventId === source.eventId) ||
      (source.kind === "story_action" &&
        effect.source.kind === "story_action" &&
        effect.source.actionId === source.actionId) ||
      (source.kind === "world_action" &&
        effect.source.kind === "world_action" &&
        effect.source.actionId === source.actionId) ||
      (source.kind === "facility" &&
        effect.source.kind === "facility" &&
        effect.source.facilityId === source.facilityId);
    if (!matches) {
      addEffectSourceProvenanceIssueV1(
        context,
        [...path, "source"],
        "Aura application source must equal its Event, Action, or Facility batch source",
      );
    }
    return;
  }

  if (effect.kind === "modifier.add") {
    if (
      source.kind !== "event" ||
      effect.modifier.source.kind !== "event" ||
      effect.modifier.source.eventId !== source.eventId
    ) {
      addEffectSourceProvenanceIssueV1(
        context,
        [...path, "modifier", "source"],
        "Opening modifier source must equal its Event batch source",
      );
    }
    return;
  }

  if (effect.kind !== "ledger.append") return;

  const { category, subject } = effect.entry;
  const subjectPath = [...path, "entry", "subject"];
  if (category === "story_cost" || category === "story_reward") {
    const matches =
      (source.kind === "event" && subject.kind === "event" && subject.eventId === source.eventId) ||
      (source.kind === "story_action" &&
        subject.kind === "action" &&
        subject.actionId === source.actionId) ||
      (source.kind === "world_action" &&
        subject.kind === "action" &&
        subject.actionId === source.actionId);
    if (!matches) {
      addEffectSourceProvenanceIssueV1(
        context,
        subjectPath,
        "Story ledger subject must equal its Event or Action batch source",
      );
    }
    return;
  }
  if (category === "world_action") {
    if (
      source.kind !== "world_action" ||
      subject.kind !== "action" ||
      subject.actionId !== source.actionId
    ) {
      addEffectSourceProvenanceIssueV1(
        context,
        subjectPath,
        "World-action ledger subject must equal its WorldAction batch source",
      );
    }
    return;
  }
  if (category === "wage" || category === "opening_fee") {
    if (
      source.kind !== "command" ||
      source.commandKind !== "tavern.opening.start" ||
      subject.kind !== "service_mode"
    ) {
      addEffectSourceProvenanceIssueV1(
        context,
        subjectPath,
        "Opening ledger entries require tavern.opening.start and a service_mode subject",
      );
    }
    return;
  }
  if (category === "revenue" || category === "discarded_food") {
    if (
      source.kind !== "command" ||
      source.commandKind !== "tavern.opening.finalize" ||
      subject.kind !== "recipe"
    ) {
      addEffectSourceProvenanceIssueV1(
        context,
        subjectPath,
        "Finalization ledger entries require tavern.opening.finalize and a recipe subject",
      );
    }
    return;
  }
  if (category === "levy") {
    if (source.kind !== "command" || source.commandKind !== "levy.pay" || subject.kind !== "levy") {
      addEffectSourceProvenanceIssueV1(
        context,
        subjectPath,
        "Levy ledger entries require levy.pay and a levy subject",
      );
    }
    return;
  }
  addEffectSourceProvenanceIssueV1(
    context,
    [...path, "entry", "category"],
    `${category} ledger entries require a dedicated owner operation`,
  );
}

export function validatePocEffectBatchForSourceV1(
  effectValues: readonly unknown[],
  sourceValue: unknown,
  dataValue: unknown,
): readonly PocEffectIntentV1[] {
  assertCanonicalDataV1(effectValues);
  if (!Array.isArray(effectValues) || Object.getPrototypeOf(effectValues) !== Array.prototype) {
    throw new TypeError("invalid Effect batch");
  }
  const data = pocSimulationDataSchemaV1.parse(dataValue);
  const source = pocEffectSourceSchemaV1.parse(sourceValue);
  const effects = effectValues.map((effect) => pocEffectIntentSchemaV1.parse(effect));
  const references = createAggregateReferenceCatalogV1(data);
  const issues: { readonly message: string; readonly path: readonly (string | number)[] }[] = [];
  const context: AggregateValidationContextV1 = {
    addIssue(issue): void {
      issues.push({ message: issue.message, path: issue.path ?? [] });
    },
  };

  validatePocEffectSourceReferenceV1(source, references, context);
  effects.forEach((effect, index) => {
    const path = ["effects", index] as const;
    validateEffectIntentV1(effect as ParsedEffectIntentV1, references, context, path);
    validatePocEffectSourceProvenanceV1(effect, source, context, path);
  });
  if (issues.length > 0) {
    throw new TypeError(
      issues.map(({ message, path }) => `${path.join(".") || "effects"}: ${message}`).join("; "),
    );
  }
  return deepFreezePocValueV1(effects);
}

export function validatePocEffectIntentForSourceV1(
  effectValue: unknown,
  sourceValue: unknown,
  dataValue: unknown,
): PocEffectIntentV1 {
  const [effect] = validatePocEffectBatchForSourceV1([effectValue], sourceValue, dataValue);
  if (effect === undefined) throw new TypeError("missing Effect");
  return effect;
}

function canonicalValuesEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.byteLength === rightBytes.byteLength &&
    leftBytes.every((byte, index) => byte === rightBytes[index])
  );
}

function beforeAfterZodSchemaV1<TValue>(valueSchema: z.ZodType<TValue>) {
  return z.strictObject({ before: valueSchema, after: valueSchema });
}

const openServiceModeZodSchemaV1 = z.enum(["manual", "assisted", "delegated"]);

const appliedModifierZodSchemaV1 = z.strictObject({
  modifier: modifierZodSchemaV1,
  contribution: safeIntegerZodSchemaV1,
});

const pocRejectionCodesV1 = new Set<PocRejectionReasonV1["code"]>(
  pocRejectionReasonZodSchemaV1.options.map(
    (option) => option.shape.code.value as PocRejectionReasonV1["code"],
  ),
);

const pocRejectionCodeZodSchemaV1 = z.custom<PocRejectionReasonV1["code"]>(
  (value) =>
    typeof value === "string" && pocRejectionCodesV1.has(value as PocRejectionReasonV1["code"]),
  "invalid Poc rejection code",
);

const pocInventoryBatchProjectionZodSchemaV1 = z.strictObject({
  batchId: batchIdZodSchemaV1,
  ingredientId: ingredientIdZodSchemaV1,
  quantity: quantityZodSchemaV1,
  acquiredDay: dayIndexZodSchemaV1,
  lastUsableDay: absoluteDayIndexZodSchemaV1,
  refrigerationExtended: z.boolean(),
});

const dailyPreparationStateZodSchemaV1 = z.strictObject({
  day: dayIndexZodSchemaV1,
  actionCount: nonNegativeSafeIntegerZodSchemaV1,
});

const facilityStateZodSchemaV1 = z.strictObject({
  facilityId: facilityIdZodSchemaV1,
  builtAtSequence: positiveSafeIntegerZodSchemaV1,
});

const facilityDecisionRecordZodSchemaV1 = z.strictObject({
  opportunityId: actionIdZodSchemaV1,
  decision: facilityDecisionZodSchemaV1,
});

const ledgerEntryZodSchemaV1 = z.strictObject({
  entryId: ledgerEntryIdZodSchemaV1,
  category: z.enum([
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
  ]),
  reasonId: reasonIdZodSchemaV1,
  cashDelta: safeIntegerZodSchemaV1,
  valuationDelta: safeIntegerZodSchemaV1,
  subject: ledgerSubjectZodSchemaV1,
  quantity: quantityZodSchemaV1.optional(),
});

const openingOrderLineZodSchemaV1 = z.strictObject({
  segmentId: customerSegmentIdZodSchemaV1,
  recipeId: recipeIdZodSchemaV1,
  potentialCustomers: nonNegativeSafeIntegerZodSchemaV1,
  effectiveOrders: nonNegativeSafeIntegerZodSchemaV1,
  capacityAccepted: nonNegativeSafeIntegerZodSchemaV1,
  actualSales: nonNegativeSafeIntegerZodSchemaV1,
});

const openingLedgerZodSchemaV1 = z.strictObject({
  sessionId: openingSessionIdZodSchemaV1,
  day: dayIndexZodSchemaV1,
  mode: openServiceModeZodSchemaV1,
  preparationActionCount: nonNegativeSafeIntegerZodSchemaV1,
  menu: z.array(plannedRecipeZodSchemaV1),
  orders: z.array(openingOrderLineZodSchemaV1),
  receptionCapacity: nonNegativeSafeIntegerZodSchemaV1,
  preparationCapacity: nonNegativeSafeIntegerZodSchemaV1,
  discardedPortions: z.array(plannedRecipeZodSchemaV1),
  entryIds: z.array(ledgerEntryIdZodSchemaV1),
  ap: beforeAfterZodSchemaV1(nonNegativeSafeIntegerZodSchemaV1),
  playerStamina: beforeAfterZodSchemaV1(nonNegativeSafeIntegerZodSchemaV1),
  heroineStamina: beforeAfterZodSchemaV1(nonNegativeSafeIntegerZodSchemaV1),
  cash: beforeAfterZodSchemaV1(moneyZodSchemaV1),
  reputation: beforeAfterZodSchemaV1(nonNegativeSafeIntegerZodSchemaV1),
  teamwork: beforeAfterZodSchemaV1(nonNegativeSafeIntegerZodSchemaV1),
  heroineMood: beforeAfterZodSchemaV1(moodPointZodSchemaV1),
  triggeredEventIds: z.array(eventIdZodSchemaV1),
  appliedModifiers: z.array(appliedModifierZodSchemaV1),
});

const closureHistoryZodSchemaV1 = z.strictObject({
  day: dayIndexZodSchemaV1,
  kind: z.enum(["planned", "emergency"]),
  reasonId: reasonIdZodSchemaV1,
  reputation: beforeAfterZodSchemaV1(nonNegativeSafeIntegerZodSchemaV1),
});

const serviceHistoryEntryZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("opening"), opening: openingLedgerZodSchemaV1 }),
  z.strictObject({ kind: z.literal("closure"), closure: closureHistoryZodSchemaV1 }),
]);

const tavernOpeningCashCostZodSchemaV1 = z.strictObject({
  wage: moneyZodSchemaV1,
  openingFee: moneyZodSchemaV1,
  modifierDelta: safeIntegerZodSchemaV1,
  total: moneyZodSchemaV1,
  appliedModifiers: z.array(appliedModifierZodSchemaV1),
});

const tavernOpeningCostsZodSchemaV1 = z.strictObject({
  commitment: z.enum(["prospective", "committed"]),
  modeReasonId: reasonIdZodSchemaV1,
  ap: nonNegativeSafeIntegerZodSchemaV1,
  playerStamina: nonNegativeSafeIntegerZodSchemaV1,
  heroineStamina: nonNegativeSafeIntegerZodSchemaV1,
  cash: tavernOpeningCashCostZodSchemaV1,
  ingredientShortages: z.array(ingredientQuantityZodSchemaV1),
});

const tavernPreviewZodSchemaV1 = z.strictObject({
  basis: z.enum(["current_state", "active_opening_baseline"]),
  allowed: z.boolean(),
  rejectionCodes: z.array(pocRejectionCodeZodSchemaV1),
  openingCosts: tavernOpeningCostsZodSchemaV1,
  receptionCapacity: nonNegativeSafeIntegerZodSchemaV1,
  preparationCapacity: nonNegativeSafeIntegerZodSchemaV1,
  expectedSales: z.array(
    z.strictObject({ recipeId: recipeIdZodSchemaV1, range: integerRangeZodSchemaV1 }),
  ),
  cashDelta: integerRangeZodSchemaV1,
});

const pocHudProjectionZodSchemaV1 = z.strictObject({
  day: dayIndexZodSchemaV1,
  phase: calendarPhaseZodSchemaV1,
  apRemaining: nonNegativeSafeIntegerZodSchemaV1,
  cash: moneyZodSchemaV1,
  reputation: nonNegativeSafeIntegerZodSchemaV1,
  playerStamina: staminaStateZodSchemaV1,
  heroineStamina: staminaStateZodSchemaV1,
  heroineMood: moodPointZodSchemaV1,
  relationship: relationshipStateZodSchemaV1,
  levyAmount: moneyZodSchemaV1,
});

const pocInventoryProjectionZodSchemaV1 = z.strictObject({
  ingredientBatches: z.array(pocInventoryBatchProjectionZodSchemaV1),
  itemStacks: z.array(itemStackZodSchemaV1),
});

const pocTavernProjectionZodSchemaV1 = z
  .strictObject({
    unlockedRecipeIds: z.array(recipeIdZodSchemaV1),
    helper: helperStateZodSchemaV1,
    preparation: dailyPreparationStateZodSchemaV1,
    servicePlan: tavernPlanZodSchemaV1.nullable(),
    currentPlanPreview: tavernPreviewZodSchemaV1.nullable(),
    serviceHistory: z.array(serviceHistoryEntryZodSchemaV1),
  })
  .superRefine(({ servicePlan, currentPlanPreview }, context) => {
    if ((servicePlan === null) !== (currentPlanPreview === null)) {
      context.addIssue({
        code: "custom",
        message: "Tavern plan and current preview must be present together",
        path: ["currentPlanPreview"],
      });
    }
  });

const pocFacilitiesProjectionZodSchemaV1 = z.strictObject({
  built: z.array(facilityStateZodSchemaV1),
  decisions: z.array(facilityDecisionRecordZodSchemaV1),
});

const pocLedgerProjectionZodSchemaV1 = z.strictObject({
  startingCash: moneyZodSchemaV1,
  currentCash: moneyZodSchemaV1,
  entries: z.array(ledgerEntryZodSchemaV1),
});

export const pocHudProjectionSchemaV1: RuntimeSchemaV1<PocHudProjectionV1> = runtimeSchemaV1(
  pocHudProjectionZodSchemaV1 as z.ZodType<PocHudProjectionV1>,
);

export const pocInventoryProjectionSchemaV1: RuntimeSchemaV1<PocInventoryProjectionV1> =
  runtimeSchemaV1(pocInventoryProjectionZodSchemaV1 as z.ZodType<PocInventoryProjectionV1>);

export const pocTavernProjectionSchemaV1: RuntimeSchemaV1<PocTavernProjectionV1> = runtimeSchemaV1(
  pocTavernProjectionZodSchemaV1 as z.ZodType<PocTavernProjectionV1>,
);

export const pocFacilitiesProjectionSchemaV1: RuntimeSchemaV1<PocFacilitiesProjectionV1> =
  runtimeSchemaV1(pocFacilitiesProjectionZodSchemaV1 as z.ZodType<PocFacilitiesProjectionV1>);

export const pocLedgerProjectionSchemaV1: RuntimeSchemaV1<PocLedgerProjectionV1> = runtimeSchemaV1(
  pocLedgerProjectionZodSchemaV1 as z.ZodType<PocLedgerProjectionV1>,
);

const commandCostViewZodSchemaV1 = z.strictObject({
  ap: nonNegativeSafeIntegerZodSchemaV1,
  playerStamina: nonNegativeSafeIntegerZodSchemaV1,
  heroineStamina: nonNegativeSafeIntegerZodSchemaV1,
  cash: moneyZodSchemaV1,
});

const confirmationMetadataProjectionZodSchemaV1 = z.strictObject({
  benefitTextIds: z.array(textIdZodSchemaV1),
  mutuallyExcludedActionIds: z.array(actionIdZodSchemaV1),
  majorRiskTextIds: z.array(textIdZodSchemaV1),
});

const previewDeltaTargetZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("cash") }),
  z.strictObject({ kind: z.literal("reputation") }),
  z.strictObject({ kind: z.literal("calendar.ap") }),
  z.strictObject({ kind: z.literal("actor.stamina"), actorId: actorIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("actor.mood"), actorId: actorIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("relationship.affection") }),
  z.strictObject({ kind: z.literal("relationship.teamwork") }),
  z.strictObject({ kind: z.literal("ingredient"), ingredientId: ingredientIdZodSchemaV1 }),
  z.strictObject({ kind: z.literal("item"), itemId: itemIdZodSchemaV1 }),
]);

const previewChangeZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("numeric"),
    target: previewDeltaTargetZodSchemaV1,
    delta: integerRangeZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("relationship.stage.set"),
    stage: relationshipStageZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("tavern.helper.set"),
    helper: helperStateZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("aura.apply"),
    auraId: auraIdZodSchemaV1,
    target: auraTargetZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("aura.clear"),
    auraId: auraIdZodSchemaV1,
    target: auraTargetZodSchemaV1,
    reasonId: reasonIdZodSchemaV1,
  }),
  factSetEffectIntentZodSchemaV1,
  questSetEffectIntentZodSchemaV1,
  outcomeSetEffectIntentZodSchemaV1,
]);

function allowedCommandPreviewZodSchemaV1<TCommand extends PocGameCommandV1>(
  commandSchema: z.ZodType<TCommand>,
  confirmationSchema: z.ZodType,
) {
  return z.strictObject({
    allowed: z.literal(true),
    command: commandSchema,
    costs: commandCostViewZodSchemaV1,
    changes: z.array(previewChangeZodSchemaV1),
    unknownReasonIds: z.array(reasonIdZodSchemaV1),
    confirmation: confirmationSchema,
  });
}

function rejectedCommandPreviewZodSchemaV1<TCommand extends PocGameCommandV1>(
  commandSchema: z.ZodType<TCommand>,
) {
  return z.strictObject({
    allowed: z.literal(false),
    command: commandSchema,
    reasons: z.array(pocRejectionReasonZodSchemaV1),
  });
}

function addCommandPreviewEqualityIssueV1(
  command: PocGameCommandV1,
  previewCommand: PocGameCommandV1,
  context: z.core.$RefinementCtx,
): void {
  if (canonicalValuesEqualV1(command, previewCommand)) return;
  context.addIssue({
    code: "custom",
    message: "Control command and preview.command must be Canonical JSON equal",
    path: ["preview", "command"],
  });
}

const runStartCommandZodSchemaV1 = z.strictObject({ kind: z.literal("run.start") });
const runStartControlProjectionZodSchemaV1 = z
  .strictObject({
    command: runStartCommandZodSchemaV1,
    preview: allowedCommandPreviewZodSchemaV1(runStartCommandZodSchemaV1, z.null()),
  })
  .superRefine(({ command, preview }, context) => {
    addCommandPreviewEqualityIssueV1(command, preview.command, context);
  });

const policyChooseCommandZodSchemaV1 = z.strictObject({
  kind: z.literal("policy.choose"),
  policyId: policyIdZodSchemaV1,
});

const lifePolicyOptionProjectionZodSchemaV1 = z
  .strictObject({
    policyId: policyIdZodSchemaV1,
    nameTextId: textIdZodSchemaV1,
    apByPhase: apByPhaseZodSchemaV1,
    playerNightRecovery: nonNegativeSafeIntegerZodSchemaV1,
    nightRecoveryReasonId: reasonIdZodSchemaV1,
    command: policyChooseCommandZodSchemaV1,
    preview: allowedCommandPreviewZodSchemaV1(
      policyChooseCommandZodSchemaV1,
      confirmationMetadataProjectionZodSchemaV1,
    ),
  })
  .superRefine(({ policyId, command, preview }, context) => {
    if (policyId !== command.policyId) {
      context.addIssue({
        code: "custom",
        message: "LifePolicy option policyId must equal command.policyId",
        path: ["command", "policyId"],
      });
    }
    addCommandPreviewEqualityIssueV1(command, preview.command, context);
  });

const lifePolicySelectionProjectionZodSchemaV1 = z.strictObject({
  options: z.array(lifePolicyOptionProjectionZodSchemaV1).min(1),
});

function tavernOpeningControlBranchZodSchemaV1<
  TControlKind extends "start" | "continue" | "finalize",
  TCommandKind extends
    "tavern.opening.start" | "tavern.opening.continue" | "tavern.opening.finalize",
>(controlKind: TControlKind, commandKind: TCommandKind) {
  const commandSchema = z.strictObject({ kind: z.literal(commandKind) });
  const pocCommandSchema = commandSchema as unknown as z.ZodType<PocGameCommandV1>;
  return z
    .strictObject({
      kind: z.literal(controlKind),
      command: commandSchema,
      preview: z.union([
        allowedCommandPreviewZodSchemaV1(pocCommandSchema, z.null()),
        rejectedCommandPreviewZodSchemaV1(pocCommandSchema),
      ]),
    })
    .superRefine(({ command, preview }, context) => {
      addCommandPreviewEqualityIssueV1(command as PocGameCommandV1, preview.command, context);
    });
}

const tavernOpeningControlProjectionZodSchemaV1 = z.union([
  tavernOpeningControlBranchZodSchemaV1("start", "tavern.opening.start"),
  tavernOpeningControlBranchZodSchemaV1("continue", "tavern.opening.continue"),
  tavernOpeningControlBranchZodSchemaV1("finalize", "tavern.opening.finalize"),
]);

const demandForecastZodSchemaV1 = z.strictObject({
  day: dayIndexZodSchemaV1,
  lines: z.array(
    z.strictObject({
      segmentId: customerSegmentIdZodSchemaV1,
      range: integerRangeZodSchemaV1,
      modifiers: z.array(appliedModifierZodSchemaV1),
    }),
  ),
});

const obligationRecommendationZodSchemaV1 = z.strictObject({
  textId: textIdZodSchemaV1,
  actionId: actionIdZodSchemaV1.nullable(),
});

const obligationForecastBaseZodShapeV1 = {
  currentCash: moneyZodSchemaV1,
  levyAmount: moneyZodSchemaV1,
  currentGap: moneyZodSchemaV1,
  reasonId: reasonIdZodSchemaV1,
  recommendations: z.array(obligationRecommendationZodSchemaV1),
} as const;

const obligationForecastZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("current_gap"), ...obligationForecastBaseZodShapeV1 }),
  z.strictObject({
    kind: z.literal("committed_plan_conservative"),
    ...obligationForecastBaseZodShapeV1,
    projectedCashAfterOpening: integerRangeZodSchemaV1,
    projectedCashAfterLevy: integerRangeZodSchemaV1,
  }),
  z.strictObject({
    kind: z.literal("final"),
    ...obligationForecastBaseZodShapeV1,
    projectedCashAfterLevy: safeIntegerZodSchemaV1,
  }),
]);

const actionViewZodSchemaV1 = z.strictObject({
  actionId: actionIdZodSchemaV1,
  labelTextId: textIdZodSchemaV1,
  available: z.boolean(),
  costs: commandCostViewZodSchemaV1,
  availablePhases: z.array(calendarPhaseZodSchemaV1),
  occupiedPhases: z.array(calendarPhaseZodSchemaV1),
  confirmation: confirmationMetadataProjectionZodSchemaV1,
  directCommand: pocGameCommandZodSchemaV1.nullable(),
  rejectionCodes: z.array(pocRejectionCodeZodSchemaV1),
});

const resolvedCheckZodSchemaV1 = z.strictObject({
  checkId: checkIdZodSchemaV1,
  actorId: actorIdZodSchemaV1,
  dice: z.tuple([dieFaceZodSchemaV1, dieFaceZodSchemaV1]),
  attributeBonus: attributeBonusZodSchemaV1,
  preparationBonus: safeIntegerZodSchemaV1,
  modifiers: z.array(appliedModifierZodSchemaV1),
  totalBonus: safeIntegerZodSchemaV1,
  total: safeIntegerZodSchemaV1,
  bandId: checkBandIdZodSchemaV1,
  resolvedAtSequence: positiveSafeIntegerZodSchemaV1,
});

const outcomeEntryZodSchemaV1 = z.strictObject({
  outcomeId: outcomeIdZodSchemaV1,
  value: storyValueZodSchemaV1,
});

const levyResolutionZodSchemaV1 = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("paid"),
    levyAmount: moneyZodSchemaV1,
    cash: beforeAfterZodSchemaV1(moneyZodSchemaV1),
  }),
  z.strictObject({
    kind: z.literal("arrears"),
    levyAmount: moneyZodSchemaV1,
    availableCash: moneyZodSchemaV1,
    shortfall: moneyZodSchemaV1,
  }),
]);

const runCompletionZodSchemaV1 = z.strictObject({
  endingId: endingIdZodSchemaV1,
  status: z.enum(["completed_stable", "completed_danger", "failed_arrears"]),
  levy: levyResolutionZodSchemaV1,
  reasonIds: z.array(reasonIdZodSchemaV1),
  summary: z.strictObject({
    relationship: outcomeEntryZodSchemaV1,
    investigation: outcomeEntryZodSchemaV1,
  }),
  completedAtSequence: positiveSafeIntegerZodSchemaV1,
});

const pocGameViewZodSchemaV1 = z
  .strictObject({
    status: z.enum(["setup", "active", "terminal"]),
    hud: pocHudProjectionZodSchemaV1,
    actions: z.array(actionViewZodSchemaV1),
    runStartControl: runStartControlProjectionZodSchemaV1.nullable(),
    lifePolicySelection: lifePolicySelectionProjectionZodSchemaV1.nullable(),
    tavernOpeningControl: tavernOpeningControlProjectionZodSchemaV1.nullable(),
    demandForecast: demandForecastZodSchemaV1.nullable(),
    obligationForecast: obligationForecastZodSchemaV1.nullable(),
    inventory: pocInventoryProjectionZodSchemaV1,
    tavern: pocTavernProjectionZodSchemaV1,
    facilities: pocFacilitiesProjectionZodSchemaV1,
    ledger: pocLedgerProjectionZodSchemaV1,
    resolvedChecks: z.array(resolvedCheckZodSchemaV1),
    completion: runCompletionZodSchemaV1.nullable(),
  })
  .superRefine(({ status, hud, ledger, completion }, context) => {
    if (hud.cash !== ledger.currentCash) {
      context.addIssue({
        code: "custom",
        message: "HUD cash must equal Ledger currentCash",
        path: ["hud", "cash"],
      });
    }
    if ((status === "terminal") !== (completion !== null)) {
      context.addIssue({
        code: "custom",
        message: "GameView terminal status and completion must be present together",
        path: ["completion"],
      });
    }
  });

export const pocRunStartControlProjectionSchemaV1: RuntimeSchemaV1<RunStartControlProjectionV1> =
  runtimeSchemaV1(runStartControlProjectionZodSchemaV1 as z.ZodType<RunStartControlProjectionV1>);

export const pocLifePolicySelectionProjectionSchemaV1: RuntimeSchemaV1<LifePolicySelectionProjectionV1> =
  runtimeSchemaV1(
    lifePolicySelectionProjectionZodSchemaV1 as unknown as z.ZodType<LifePolicySelectionProjectionV1>,
  );

export const pocTavernOpeningControlProjectionSchemaV1: RuntimeSchemaV1<TavernOpeningControlProjectionV1> =
  runtimeSchemaV1(
    tavernOpeningControlProjectionZodSchemaV1 as z.ZodType<TavernOpeningControlProjectionV1>,
  );

export const pocDemandForecastSchemaV1: RuntimeSchemaV1<DemandForecastV1> = runtimeSchemaV1(
  demandForecastZodSchemaV1 as z.ZodType<DemandForecastV1>,
);

export const pocObligationForecastSchemaV1: RuntimeSchemaV1<ObligationForecastV1> = runtimeSchemaV1(
  obligationForecastZodSchemaV1 as z.ZodType<ObligationForecastV1>,
);

export const pocGameViewSchemaV1: RuntimeSchemaV1<PocGameViewV1> = runtimeSchemaV1(
  pocGameViewZodSchemaV1 as z.ZodType<PocGameViewV1>,
);
