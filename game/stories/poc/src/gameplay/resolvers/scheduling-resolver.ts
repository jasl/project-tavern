// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { parseCalendarPhase, parseCheckpointId, parseOpeningSessionId } from "../contracts/ids.js";
import { pocSimulationDataSchemaV1 } from "../contracts/schemas.js";
import type {
  AuraTargetV1,
  ConditionV1,
  EffectIntentV1,
  EventTriggerV1,
  NarrativeRuntimeStateV1,
  PocGameCommandV1,
  PocGameStateV1,
  PocSimulationDataV1,
  SchedulerContextV1,
  StoryEventDefinitionV1,
  StoryValueV1,
} from "../contracts/types.js";
import { deepFreezePocValueV1, parseDayIndex } from "../contracts/values.js";
import type { DeepReadonly } from "../contracts/values.js";
import { pocActorsStateSchemaV1 } from "../modules/actors/contract.js";
import { pocCalendarStateSchemaV1 } from "../modules/calendar/contract.js";
import { pocFacilitiesStateSchemaV1 } from "../modules/facilities/contract.js";
import { pocInventoryStateSchemaV1 } from "../modules/inventory/contract.js";
import { pocNarrativeStateSchemaV1 } from "../modules/narrative/contract.js";
import { pocProgressionStateSchemaV1 } from "../modules/progression/contract.js";
import { pocRunStateSchemaV1 } from "../modules/run/contract.js";
import { pocStatusStateSchemaV1 } from "../modules/status/contract.js";
import { pocTavernStateSchemaV1 } from "../modules/tavern/contract.js";
import { pocWorkflowStateSchemaV1 } from "../modules/workflow/contract.js";

type PlainDataRecordV1 = Record<string, unknown>;

const attributeRankOrderV1 = Object.freeze(["C", "B", "A", "S", "S+"] as const);
const helperTierOrderV1 = Object.freeze(["apprentice", "skilled", "senior", "master"] as const);
const pocGameCommandKindsV1 = new Set<PocGameCommandV1["kind"]>([
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
]);

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

function parseCommandKindV1(value: unknown): PocGameCommandV1["kind"] {
  if (typeof value !== "string" || !pocGameCommandKindsV1.has(value as PocGameCommandV1["kind"])) {
    throw new TypeError("invalid Scheduler command kind");
  }
  return value as PocGameCommandV1["kind"];
}

function parseSchedulerContextV1(value: unknown): SchedulerContextV1 {
  const candidate = exactDataObjectV1(
    value,
    Reflect.has(value as object, "kind") ? Reflect.ownKeys(value as object).map(String) : [],
    "Scheduler context",
  );
  const kind = dataPropertyV1(candidate, "kind", "Scheduler context");
  if (kind === "phase.entered") {
    const context = exactDataObjectV1(value, ["kind", "day", "phase"], "Scheduler context");
    return deepFreezePocValueV1({
      kind,
      day: parseDayIndex(dataPropertyV1(context, "day", "Scheduler context")),
      phase: parseCalendarPhase(dataPropertyV1(context, "phase", "Scheduler context")),
    });
  }
  if (kind === "command.succeeded") {
    const context = exactDataObjectV1(value, ["kind", "commandKind"], "Scheduler context");
    return deepFreezePocValueV1({
      kind,
      commandKind: parseCommandKindV1(dataPropertyV1(context, "commandKind", "Scheduler context")),
    });
  }
  if (
    kind === "opening.started" ||
    kind === "opening.middle" ||
    kind === "opening.before_finalize"
  ) {
    const context = exactDataObjectV1(value, ["kind", "sessionId"], "Scheduler context");
    return deepFreezePocValueV1({
      kind,
      sessionId: parseOpeningSessionId(dataPropertyV1(context, "sessionId", "Scheduler context")),
    });
  }
  if (kind === "day.ended") {
    const context = exactDataObjectV1(value, ["kind", "day"], "Scheduler context");
    return deepFreezePocValueV1({
      kind,
      day: parseDayIndex(dataPropertyV1(context, "day", "Scheduler context")),
    });
  }
  if (kind === "week.ended") {
    exactDataObjectV1(value, ["kind"], "Scheduler context");
    return deepFreezePocValueV1({ kind });
  }
  if (kind === "story.explicit") {
    const context = exactDataObjectV1(value, ["kind", "checkpointId"], "Scheduler context");
    return deepFreezePocValueV1({
      kind,
      checkpointId: parseCheckpointId(dataPropertyV1(context, "checkpointId", "Scheduler context")),
    });
  }
  throw new TypeError("invalid Scheduler context kind");
}

function sameStoryValueV1(
  left: DeepReadonly<StoryValueV1>,
  right: DeepReadonly<StoryValueV1>,
): boolean {
  return left.kind === right.kind && left.value === right.value;
}

function sameAuraTargetV1(
  left: DeepReadonly<AuraTargetV1>,
  right: DeepReadonly<AuraTargetV1>,
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "actor" && right.kind === "actor") return left.actorId === right.actorId;
  return true;
}

function hasCompleteDemandSeedsV1(
  state: DeepReadonly<PocGameStateV1>,
  data: DeepReadonly<PocSimulationDataV1>,
): boolean {
  const expectedDays = data.balance.serviceDays;
  const expectedSegments = data.content.customerSegments.map(({ segmentId }) => segmentId);
  const seeds = state.simulation.tavern.demandSeeds;
  if (seeds.length !== expectedDays.length) return false;
  return expectedDays.every((day) => {
    const matchingDays = seeds.filter((seed) => seed.day === day);
    if (matchingDays.length !== 1) return false;
    const segments = matchingDays[0]?.segments;
    return (
      segments !== undefined &&
      segments.length === expectedSegments.length &&
      expectedSegments.every(
        (segmentId) => segments.filter((segment) => segment.segmentId === segmentId).length === 1,
      )
    );
  });
}

function conditionMatchesV1(
  condition: DeepReadonly<ConditionV1>,
  observation: DeepReadonly<PocConditionObservationV1>,
  data: DeepReadonly<PocSimulationDataV1>,
): boolean {
  const state = observation.state;
  switch (condition.kind) {
    case "actor.rank_at_least":
      return (
        attributeRankOrderV1.indexOf(
          state.simulation.actors.player.attributes[condition.attribute],
        ) >= attributeRankOrderV1.indexOf(condition.rank)
      );
    case "relationship.stage_is":
      return state.simulation.actors.relationship.stage === condition.stage;
    case "relationship.affection_at_least":
      return state.simulation.actors.relationship.affection >= condition.value;
    case "fact.equals": {
      const fact = state.story.facts.find(({ factId }) => factId === condition.factId);
      return fact !== undefined && sameStoryValueV1(fact.value, condition.value);
    }
    case "quest.status_is":
      return state.story.quests.some(
        ({ questId, status }) => questId === condition.questId && status === condition.status,
      );
    case "outcome.equals": {
      const outcome = state.story.outcomes.find(
        ({ outcomeId }) => outcomeId === condition.outcomeId,
      );
      return outcome !== undefined && sameStoryValueV1(outcome.value, condition.value);
    }
    case "aura.present":
      return state.simulation.status.auras.some(
        ({ auraId, target }) =>
          auraId === condition.auraId && sameAuraTargetV1(target, condition.target),
      );
    case "inventory.ingredient_at_least": {
      let available = 0;
      for (const batch of state.simulation.inventory.ingredientBatches) {
        if (batch.ingredientId !== condition.ingredientId) continue;
        if (batch.quantity >= condition.quantity - available) return true;
        available += batch.quantity;
      }
      return false;
    }
    case "tavern.helper_tier_at_least": {
      const helper = state.simulation.tavern.helper;
      return (
        helper.unlocked &&
        helperTierOrderV1.indexOf(helper.tier) >= helperTierOrderV1.indexOf(condition.tier)
      );
    }
    case "tavern.facility_opportunity_undecided":
      return !state.simulation.facilities.decisions.some(
        ({ opportunityId }) => opportunityId === condition.opportunityId,
      );
    case "tavern.reputation_at_least":
      return state.simulation.tavern.reputation >= condition.value;
    case "calendar.day_at_least":
      return state.simulation.calendar.day >= condition.day;
    case "calendar.day_at_most":
      return state.simulation.calendar.day <= condition.day;
    case "calendar.matches":
      return (
        state.simulation.calendar.day === condition.day &&
        condition.phases.includes(state.simulation.calendar.phase)
      );
    case "narrative.not_active":
      return observation.narrativeStatus !== "active";
    case "run.started":
      return hasCompleteDemandSeedsV1(state, data);
    case "run.status_is":
      return state.simulation.run.status === condition.status;
    default: {
      const exhaustive: never = condition;
      throw new TypeError(`invalid Condition kind: ${String(exhaustive)}`);
    }
  }
}

export interface PocConditionObservationV1 {
  readonly state: DeepReadonly<PocGameStateV1>;
  readonly narrativeStatus: NarrativeRuntimeStateV1["status"];
}

export function evaluatePocConditionsV1(
  conditions: readonly DeepReadonly<ConditionV1>[],
  observation: DeepReadonly<PocConditionObservationV1>,
  data: DeepReadonly<PocSimulationDataV1>,
): boolean {
  return conditions.every((condition) => conditionMatchesV1(condition, observation, data));
}

function triggerMatchesV1(
  trigger: DeepReadonly<EventTriggerV1>,
  context: DeepReadonly<SchedulerContextV1>,
): boolean {
  switch (trigger.kind) {
    case "phase.entered":
      return (
        context.kind === trigger.kind &&
        trigger.days.includes(context.day) &&
        trigger.phases.includes(context.phase)
      );
    case "command.succeeded":
      return context.kind === trigger.kind && trigger.commandKinds.includes(context.commandKind);
    case "opening.started":
    case "opening.middle":
    case "opening.before_finalize":
    case "week.ended":
      return context.kind === trigger.kind;
    case "day.ended":
      return context.kind === trigger.kind && trigger.days.includes(context.day);
    case "story.explicit":
      return context.kind === trigger.kind && trigger.checkpointId === context.checkpointId;
    default: {
      const exhaustive: never = trigger;
      throw new TypeError(`invalid Event trigger kind: ${String(exhaustive)}`);
    }
  }
}

function compareScheduledEventsV1(
  left: DeepReadonly<StoryEventDefinitionV1>,
  right: DeepReadonly<StoryEventDefinitionV1>,
): number {
  if (left.priority !== right.priority) return right.priority - left.priority;
  if (left.eventId < right.eventId) return -1;
  if (left.eventId > right.eventId) return 1;
  return 0;
}

function parsePocGameStateV1(value: unknown): PocGameStateV1 {
  const state = exactDataObjectV1(value, ["simulation", "story"], "Gameplay State");
  const simulation = exactDataObjectV1(
    dataPropertyV1(state, "simulation", "Gameplay State"),
    ["run", "calendar", "actors", "inventory", "status", "facilities", "tavern", "activeWorkflow"],
    "Gameplay Simulation State",
  );
  const story = exactDataObjectV1(
    dataPropertyV1(state, "story", "Gameplay State"),
    ["facts", "quests", "outcomes", "resolvedChecks", "narrative"],
    "Gameplay Story State",
  );
  const progression = pocProgressionStateSchemaV1.parse({
    facts: dataPropertyV1(story, "facts", "Gameplay Story State"),
    quests: dataPropertyV1(story, "quests", "Gameplay Story State"),
    outcomes: dataPropertyV1(story, "outcomes", "Gameplay Story State"),
    resolvedChecks: dataPropertyV1(story, "resolvedChecks", "Gameplay Story State"),
  });
  return deepFreezePocValueV1({
    simulation: {
      run: pocRunStateSchemaV1.parse(
        dataPropertyV1(simulation, "run", "Gameplay Simulation State"),
      ),
      calendar: pocCalendarStateSchemaV1.parse(
        dataPropertyV1(simulation, "calendar", "Gameplay Simulation State"),
      ),
      actors: pocActorsStateSchemaV1.parse(
        dataPropertyV1(simulation, "actors", "Gameplay Simulation State"),
      ),
      inventory: pocInventoryStateSchemaV1.parse(
        dataPropertyV1(simulation, "inventory", "Gameplay Simulation State"),
      ),
      status: pocStatusStateSchemaV1.parse(
        dataPropertyV1(simulation, "status", "Gameplay Simulation State"),
      ),
      facilities: pocFacilitiesStateSchemaV1.parse(
        dataPropertyV1(simulation, "facilities", "Gameplay Simulation State"),
      ),
      tavern: pocTavernStateSchemaV1.parse(
        dataPropertyV1(simulation, "tavern", "Gameplay Simulation State"),
      ),
      activeWorkflow: pocWorkflowStateSchemaV1.parse(
        dataPropertyV1(simulation, "activeWorkflow", "Gameplay Simulation State"),
      ),
    },
    story: {
      ...progression,
      narrative: pocNarrativeStateSchemaV1.parse(
        dataPropertyV1(story, "narrative", "Gameplay Story State"),
      ),
    },
  });
}

function parseSchedulingInputV1(value: unknown): PocSchedulingInputV1 {
  const input = exactDataObjectV1(value, ["context", "observation"], "Scheduling input");
  const observation = exactDataObjectV1(
    dataPropertyV1(input, "observation", "Scheduling input"),
    ["state", "narrativeStatus"],
    "Condition observation",
  );
  const narrativeStatus = dataPropertyV1(observation, "narrativeStatus", "Condition observation");
  if (
    narrativeStatus !== "idle" &&
    narrativeStatus !== "active" &&
    narrativeStatus !== "completed"
  ) {
    throw new TypeError("invalid Condition observation narrativeStatus");
  }
  const state = parsePocGameStateV1(dataPropertyV1(observation, "state", "Condition observation"));
  return {
    context: parseSchedulerContextV1(dataPropertyV1(input, "context", "Scheduling input")),
    observation: {
      state,
      narrativeStatus,
    },
  };
}

export interface PocSchedulingInputV1 {
  readonly context: SchedulerContextV1;
  readonly observation: PocConditionObservationV1;
}

export interface PocScheduledEventV1 {
  readonly eventId: StoryEventDefinitionV1["eventId"];
  readonly checkpointId: StoryEventDefinitionV1["checkpointId"];
  readonly sceneId: StoryEventDefinitionV1["sceneId"];
  readonly effects: readonly EffectIntentV1[];
}

export interface PocSchedulingResolverV1 {
  resolve(input: DeepReadonly<PocSchedulingInputV1>): readonly PocScheduledEventV1[];
}

export function createPocSchedulingResolverV1(
  dataValue: DeepReadonly<PocSimulationDataV1>,
): DeepReadonly<PocSchedulingResolverV1> {
  const data = pocSimulationDataSchemaV1.parse(dataValue);
  if (data.content.events.some(({ weightedGroupId }) => weightedGroupId !== null)) {
    throw new TypeError("weighted Scheduler groups are not implemented in the PoC resolver");
  }
  return deepFreezePocValueV1({
    resolve(inputValue: DeepReadonly<PocSchedulingInputV1>): readonly PocScheduledEventV1[] {
      const input = parseSchedulingInputV1(inputValue);
      return deepFreezePocValueV1(
        data.content.events
          .filter(
            (event) =>
              triggerMatchesV1(event.trigger, input.context) &&
              evaluatePocConditionsV1(event.when, input.observation, data),
          )
          .toSorted(compareScheduledEventsV1)
          .map(({ eventId, checkpointId, sceneId, effects }) => ({
            eventId,
            checkpointId,
            sceneId,
            effects,
          })),
      );
    },
  });
}
