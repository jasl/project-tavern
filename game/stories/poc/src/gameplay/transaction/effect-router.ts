// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import type { DeepReadonly } from "@sillymaker/base";

import {
  pocEffectSourceSchemaV1,
  validatePocEffectBatchForSourceV1,
} from "../contracts/schemas.js";
import type {
  ChangeReasonV1,
  PocEffectIntentV1,
  PocEffectSourceV1,
  PocRejectionReasonV1,
} from "../contracts/types.js";
import {
  deepFreezePocValueV1,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseSafeInteger,
} from "../contracts/values.js";
import type { IngredientId, ReasonId } from "../contracts/ids.js";
import type {
  PocInventoryIngredientPortV1,
  PocInventoryShelfLifeExtensionV1,
} from "../modules/inventory/contract.js";
import type { PocTransactionCandidateV1 } from "./candidate.js";

export { pocEffectIntentKindsV1 } from "../contracts/schemas.js";

export const pocEffectOwnerByKindV1 = Object.freeze({
  "calendar.ap.adjust": "calendar",
  "reputation.adjust": "tavern",
  "actor.stamina.adjust": "actors",
  "actor.mood.adjust": "actors",
  "relationship.affection.adjust": "actors",
  "relationship.teamwork.adjust": "actors",
  "relationship.stage.set": "actors",
  "tavern.helper.set": "tavern",
  "inventory.grant": "inventory",
  "inventory.consume": "inventory",
  "inventory.item.grant": "inventory",
  "inventory.item.consume": "inventory",
  "aura.apply": "status",
  "aura.clear": "status",
  "fact.set": "progression",
  "quest.set": "progression",
  "outcome.set": "progression",
  "modifier.add": "workflow",
  "ledger.append": "inventory",
} as const satisfies Record<
  PocEffectIntentV1["kind"],
  "calendar" | "tavern" | "actors" | "inventory" | "status" | "progression" | "workflow"
>);

export type PocEffectBatchResultV1 =
  | { readonly kind: "applied" }
  | { readonly kind: "rejected"; readonly rejection: PocRejectionReasonV1 };

function appliedBatchV1(): PocEffectBatchResultV1 {
  return Object.freeze({ kind: "applied" });
}

function rejectedBatchV1(rejection: PocRejectionReasonV1): PocEffectBatchResultV1 {
  return deepFreezePocValueV1({ kind: "rejected", rejection });
}

function changeReasonV1(source: PocEffectSourceV1, reasonId: ReasonId): ChangeReasonV1 {
  switch (source.kind) {
    case "command":
      return deepFreezePocValueV1({ kind: source.kind, commandKind: source.commandKind, reasonId });
    case "event":
      return deepFreezePocValueV1({ kind: source.kind, eventId: source.eventId, reasonId });
    case "story_action":
    case "world_action":
      return deepFreezePocValueV1({ kind: source.kind, actionId: source.actionId, reasonId });
    case "aura":
      return deepFreezePocValueV1({ kind: source.kind, auraId: source.auraId, reasonId });
    case "facility":
      return deepFreezePocValueV1({ kind: source.kind, facilityId: source.facilityId, reasonId });
    case "ending":
      return deepFreezePocValueV1({ kind: source.kind, endingId: source.endingId, reasonId });
  }
  throw new TypeError(`unsupported Effect source ${String(source)}`);
}

function calendarPolicyApV1(candidate: PocTransactionCandidateV1) {
  const calendar = candidate.calendarReadPort();
  if (calendar.lifePolicyId === null) return parseNonNegativeSafeInteger(0);
  const policy = candidate
    .data()
    .balance.lifePolicies.find(({ policyId }) => policyId === calendar.lifePolicyId);
  if (policy === undefined) throw new TypeError("selected LifePolicy is missing from Program data");
  return policy.apByPhase[calendar.phase];
}

function statusDependenciesV1(candidate: PocTransactionCandidateV1) {
  return deepFreezePocValueV1({
    auraDefinitions: candidate
      .data()
      .content.auras.map(({ auraId, reasonId, durationPolicy, allowedTargets }) => ({
        auraId,
        reasonId,
        durationPolicy,
        allowedTargets,
      })),
  });
}

function inventoryIngredientsV1(
  candidate: PocTransactionCandidateV1,
): readonly PocInventoryIngredientPortV1[] {
  return deepFreezePocValueV1(
    candidate
      .data()
      .content.ingredients.map(({ ingredientId, unitPrice, shelfLifeDays, refrigeratable }) => ({
        ingredientId,
        unitPrice,
        shelfLifeDays,
        refrigeratable,
      })),
  );
}

function inventoryShelfLifeExtensionsV1(
  candidate: PocTransactionCandidateV1,
): readonly PocInventoryShelfLifeExtensionV1[] {
  const builtIds = new Set(
    candidate.facilitiesReadPort().built.map(({ facilityId }) => facilityId),
  );
  const totals = new Map<IngredientId, number>();
  for (const facility of candidate.data().content.facilities) {
    if (!builtIds.has(facility.facilityId)) continue;
    for (const modifier of facility.modifiers) {
      if (modifier.kind !== "shelf_life.add_days") continue;
      for (const ingredientId of modifier.ingredientIds) {
        const current = totals.get(ingredientId) ?? 0;
        if (current > Number.MAX_SAFE_INTEGER - modifier.amount) {
          throw new TypeError("shelf-life extension exceeds safe integer bounds");
        }
        totals.set(ingredientId, current + modifier.amount);
      }
    }
  }
  return deepFreezePocValueV1(
    [...totals]
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([ingredientId, days]) => ({
        ingredientId,
        days: parsePositiveSafeInteger(days),
      })),
  );
}

function assertModifierBatchPreflightV1(
  candidate: PocTransactionCandidateV1,
  effects: readonly PocEffectIntentV1[],
  source: PocEffectSourceV1,
): void {
  for (const effect of effects) {
    if (effect.kind !== "modifier.add") continue;
    const workflow = candidate.workflowReadPort();
    if (
      source.kind !== "event" ||
      workflow?.kind !== "opening" ||
      !workflow.triggeredEventIds.includes(source.eventId) ||
      effect.modifier.source.kind !== "event" ||
      effect.modifier.source.eventId !== source.eventId
    ) {
      throw new TypeError(
        "modifier.add requires its already-triggered Event in the active Opening",
      );
    }
  }
}

function applyEffectV1(
  candidate: PocTransactionCandidateV1,
  effect: PocEffectIntentV1,
  source: PocEffectSourceV1,
): PocEffectBatchResultV1 {
  const reasonId = effect.kind === "ledger.append" ? effect.entry.reasonId : effect.reasonId;
  const reason = changeReasonV1(source, reasonId);

  switch (effect.kind) {
    case "calendar.ap.adjust": {
      const result = candidate.applyCalendar(
        { kind: "calendar.ap.adjust", delta: effect.delta, reason },
        Object.freeze({ policyAp: calendarPolicyApV1(candidate) }),
      );
      return result.kind === "applied" ? appliedBatchV1() : rejectedBatchV1(result.rejection);
    }
    case "reputation.adjust": {
      const result = candidate.applyTavern(
        { kind: "tavern.reputation.adjust", delta: effect.delta, reason },
        { kind: "tavern.reputation.adjust" },
      );
      return result.kind === "applied" ? appliedBatchV1() : rejectedBatchV1(result.rejection);
    }
    case "actor.stamina.adjust": {
      const result = candidate.applyActors(
        {
          kind: "actors.adjust_stamina",
          actorId: effect.actorId,
          application: effect.delta < 0 ? "debit" : "recovery",
          components: [{ requestedDelta: effect.delta, reason }],
        },
        Object.freeze({}),
      );
      return result.kind === "applied" ? appliedBatchV1() : rejectedBatchV1(result.rejection);
    }
    case "actor.mood.adjust": {
      const result = candidate.applyActors(
        { kind: "actors.adjust_mood", actorId: effect.actorId, delta: effect.delta, reason },
        Object.freeze({}),
      );
      return result.kind === "applied" ? appliedBatchV1() : rejectedBatchV1(result.rejection);
    }
    case "relationship.affection.adjust":
    case "relationship.teamwork.adjust": {
      const result = candidate.applyActors(
        {
          kind: "actors.adjust_relationship",
          affectionDelta:
            effect.kind === "relationship.affection.adjust" ? effect.delta : parseSafeInteger(0),
          teamworkDelta:
            effect.kind === "relationship.teamwork.adjust" ? effect.delta : parseSafeInteger(0),
          reason,
        },
        Object.freeze({}),
      );
      return result.kind === "applied" ? appliedBatchV1() : rejectedBatchV1(result.rejection);
    }
    case "relationship.stage.set": {
      const result = candidate.applyActors(
        { kind: "actors.relationship.stage.set", stage: effect.stage, reason },
        Object.freeze({}),
      );
      return result.kind === "applied" ? appliedBatchV1() : rejectedBatchV1(result.rejection);
    }
    case "tavern.helper.set": {
      const result = candidate.applyTavern(
        { kind: "tavern.helper.set", helper: effect.helper, reason },
        { kind: "tavern.helper.set" },
      );
      return result.kind === "applied" ? appliedBatchV1() : rejectedBatchV1(result.rejection);
    }
    case "inventory.grant": {
      const result = candidate.applyInventory(
        {
          kind: "inventory.grant",
          lines: effect.lines,
          source: effect.source,
          reason,
        },
        {
          kind: "inventory.grant",
          commandSequence: candidate.nextCommandSequence(),
          day: candidate.calendarReadPort().day,
          nextBatchIndex: candidate.nextBatchIndex(),
          nextLedgerEntryIndex: candidate.nextLedgerEntryIndex(),
          ingredients: inventoryIngredientsV1(candidate),
          shelfLifeExtensions: inventoryShelfLifeExtensionsV1(candidate),
        },
      );
      return result.kind === "applied" ? appliedBatchV1() : rejectedBatchV1(result.rejection);
    }
    case "inventory.consume": {
      const result = candidate.applyInventory(
        { kind: "inventory.consume", lines: effect.lines, reason },
        { kind: "inventory.consume" },
      );
      return result.kind === "applied" ? appliedBatchV1() : rejectedBatchV1(result.rejection);
    }
    case "inventory.item.grant":
    case "inventory.item.consume": {
      const operationKind = effect.kind;
      const result = candidate.applyInventory(
        { kind: operationKind, lines: effect.lines, reason },
        { kind: operationKind },
      );
      return result.kind === "applied" ? appliedBatchV1() : rejectedBatchV1(result.rejection);
    }
    case "aura.apply": {
      const result = candidate.applyStatus(
        {
          kind: "status.apply",
          aura: {
            instanceId: candidate.allocateAuraInstanceId(),
            auraId: effect.auraId,
            target: effect.target,
            source: effect.source,
            duration: effect.duration,
            appliedAtSequence: parseNonNegativeSafeInteger(candidate.nextCommandSequence()),
          },
          reason,
        },
        statusDependenciesV1(candidate),
      );
      return result.kind === "applied" ? appliedBatchV1() : rejectedBatchV1(result.rejection);
    }
    case "aura.clear": {
      const result = candidate.applyStatus(
        { kind: "status.clear", auraId: effect.auraId, target: effect.target, reason },
        statusDependenciesV1(candidate),
      );
      return result.kind === "applied" ? appliedBatchV1() : rejectedBatchV1(result.rejection);
    }
    case "fact.set": {
      const definition = candidate
        .data()
        .stateDefinitions.facts.find(({ factId }) => factId === effect.factId);
      if (definition === undefined) throw new TypeError(`missing Fact definition ${effect.factId}`);
      const result = candidate.applyProgression(
        { kind: "progression.fact.set", entry: { factId: effect.factId, value: effect.value } },
        { kind: "progression.fact.set", definition, reason },
      );
      return result.kind === "applied" ? appliedBatchV1() : rejectedBatchV1(result.rejection);
    }
    case "quest.set": {
      const definition = candidate
        .data()
        .stateDefinitions.quests.find(({ questId }) => questId === effect.quest.questId);
      if (definition === undefined)
        throw new TypeError(`missing Quest definition ${effect.quest.questId}`);
      const result = candidate.applyProgression(
        { kind: "progression.quest.set", entry: effect.quest },
        { kind: "progression.quest.set", definition, reason },
      );
      return result.kind === "applied" ? appliedBatchV1() : rejectedBatchV1(result.rejection);
    }
    case "outcome.set": {
      const definition = candidate
        .data()
        .stateDefinitions.outcomes.find(({ outcomeId }) => outcomeId === effect.outcomeId);
      if (definition === undefined) {
        throw new TypeError(`missing Outcome definition ${effect.outcomeId}`);
      }
      const result = candidate.applyProgression(
        {
          kind: "progression.outcome.set",
          entry: { outcomeId: effect.outcomeId, value: effect.value },
        },
        { kind: "progression.outcome.set", definition, reason },
      );
      return result.kind === "applied" ? appliedBatchV1() : rejectedBatchV1(result.rejection);
    }
    case "modifier.add": {
      if (source.kind !== "event") throw new TypeError("modifier.add requires Event source");
      const result = candidate.applyWorkflow(
        { kind: "workflow.add_opening_modifier", modifier: effect.modifier },
        { kind: "workflow.add_opening_modifier", sourceEventId: source.eventId },
      );
      return result.kind === "applied" ? appliedBatchV1() : rejectedBatchV1(result.rejection);
    }
    case "ledger.append": {
      const result = candidate.applyInventory(
        { kind: "inventory.ledger.append", entries: [effect.entry] },
        {
          kind: "inventory.ledger.append",
          commandSequence: candidate.nextCommandSequence(),
          nextLedgerEntryIndex: candidate.nextLedgerEntryIndex(),
          ledgerReasons: candidate.data().balance.ledgerReasons,
          context: { kind: "effect_or_direct", reason },
        },
      );
      return result.kind === "applied" ? appliedBatchV1() : rejectedBatchV1(result.rejection);
    }
  }
  throw new TypeError(`unsupported Effect intent ${String(effect)}`);
}

export function routePocEffectBatchV1(
  candidate: PocTransactionCandidateV1,
  effectValues: readonly DeepReadonly<PocEffectIntentV1>[],
  sourceValue: DeepReadonly<PocEffectSourceV1>,
): PocEffectBatchResultV1 {
  const checkpoint = candidate.checkpoint();
  try {
    const source = pocEffectSourceSchemaV1.parse(sourceValue);
    const effects = validatePocEffectBatchForSourceV1(effectValues, source, candidate.data());
    assertModifierBatchPreflightV1(candidate, effects, source);
    for (const effect of effects) {
      const result = applyEffectV1(candidate, effect, source);
      if (result.kind === "rejected") {
        candidate.rollback(checkpoint);
        return result;
      }
    }
    return appliedBatchV1();
  } catch (error) {
    candidate.rollback(checkpoint);
    throw error;
  }
}
