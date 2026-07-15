// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  createTransactionalRngV1,
  type DeepReadonly,
  type GameCommandExecutorV1,
  type RuleRngV1,
} from "@sillymaker/base";

import { PocRuleInvocationErrorV1, pocGameCommandSchemaV1 } from "./contracts/schemas.js";
import type {
  ActionPresentationDefinitionV1,
  ActiveWorkflowV1,
  AvailabilityGateV1,
  AuraInstanceV1,
  ChangeReasonV1,
  CheckInputV1,
  CheckResultV1,
  DemandDayStateV1,
  DemandProjectionInputV1,
  FacilityDefinitionV1,
  MaterializedDemandDayV1,
  ModifierV1,
  NarrativeCursorV1,
  NarrativeRuntimeStateV1,
  NarrativeSourceV1,
  PocCommandExecutionAttemptV1,
  PocEffectSourceV1,
  PocEngineFaultV1,
  PocGameCommandV1,
  PocGameSnapshotV1,
  PocGameplayFactV1,
  PocRejectionReasonV1,
  PocSimulationDataV1,
  PocSimulationProgramV1,
  SchedulerContextV1,
  StoryRuleSlotV1,
  TavernPlanV1,
  TavernPreviewInputV1,
  TavernPreviewV1,
} from "./contracts/types.js";
import type { ActionId, AuraInstanceId, IngredientId, ReasonId } from "./contracts/ids.js";
import {
  deepFreezePocValueV1,
  parseAttributeBonus,
  parseDayIndex,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseQuantity,
  parseSafeInteger,
} from "./contracts/values.js";
import type { PocInventoryIngredientPortV1 } from "./modules/inventory/contract.js";
import {
  interpretPocNarrativeStepV1,
  type PocNarrativeInterpreterInputV1,
  type PocNarrativeInterpreterRequestV1,
  type PocNarrativeResolutionV1,
  type PocNarrativeStepResultV1,
} from "./modules/narrative/interpreter.js";
import type { PocGameplayModuleTupleV1 } from "./modules/index.js";
import {
  createPocSchedulingResolverV1,
  evaluatePocConditionsV1,
} from "./resolvers/scheduling-resolver.js";
import {
  commitPocCandidateV1,
  createPocTransactionCandidateV1,
  type PocCandidateOwnerResultV1,
  type PocTransactionCandidateV1,
} from "./transaction/candidate.js";
import { routePocEffectBatchV1 } from "./transaction/effect-router.js";

export interface PocGameCommandExecutorV1 extends GameCommandExecutorV1<
  PocGameSnapshotV1,
  PocGameCommandV1,
  undefined,
  PocCommandExecutionAttemptV1
> {}

class PocRejectedCommandV1 {
  constructor(readonly rejection: PocRejectionReasonV1) {}
}

class PocFaultedCommandV1 {
  constructor(readonly fault: PocEngineFaultV1) {}
}

interface PocBlockingNarrativeRequestV1 {
  readonly source: NarrativeSourceV1;
  readonly sceneId: NarrativeCursorV1["sceneId"];
}

const noDependenciesV1 = Object.freeze({});
const attributeBonusByRankV1 = Object.freeze({ C: 0, B: 1, A: 2, S: 3, "S+": 4 });

function attemptDiagnosticsV1(
  committedBefore: PocGameSnapshotV1["rng"],
  committedAfter: PocGameSnapshotV1["rng"],
  rng: RuleRngV1,
) {
  return Object.freeze({
    committedRngBefore: committedBefore,
    attemptedDraws: rng.attemptedDraws(),
    candidateRngAfter: rng.candidateState(),
    committedRngAfter: committedAfter,
  });
}

function committedAttemptV1(
  before: PocGameSnapshotV1,
  after: PocGameSnapshotV1,
  rng: RuleRngV1,
  facts: readonly PocGameplayFactV1[],
): PocCommandExecutionAttemptV1 {
  return Object.freeze({
    result: Object.freeze({ kind: "committed", snapshot: after, facts: Object.freeze([...facts]) }),
    diagnostics: attemptDiagnosticsV1(before.rng, after.rng, rng),
  });
}

function rejectedAttemptV1(
  snapshot: PocGameSnapshotV1,
  rng: RuleRngV1,
  reasons: readonly PocRejectionReasonV1[],
): PocCommandExecutionAttemptV1 {
  return Object.freeze({
    result: Object.freeze({
      kind: "rejected",
      snapshot,
      reasons: Object.freeze([...reasons]),
    }),
    diagnostics: attemptDiagnosticsV1(snapshot.rng, snapshot.rng, rng),
  });
}

function faultedAttemptV1(
  snapshot: PocGameSnapshotV1,
  rng: RuleRngV1,
  fault: PocEngineFaultV1,
): PocCommandExecutionAttemptV1 {
  return Object.freeze({
    result: Object.freeze({ kind: "faulted", snapshot, fault }),
    diagnostics: attemptDiagnosticsV1(snapshot.rng, snapshot.rng, rng),
  });
}

function calendarDependenciesV1(policyAp: ReturnType<typeof parseNonNegativeSafeInteger>) {
  return Object.freeze({ policyAp });
}

function errorMessageV1(error: unknown): string {
  return error instanceof Error ? error.message : "unknown command failure";
}

function errorStackV1(error: unknown): string | undefined {
  return error instanceof Error && typeof error.stack === "string" ? error.stack : undefined;
}

function commandHandlerFaultV1(error: unknown): PocEngineFaultV1 {
  const stack = errorStackV1(error);
  return deepFreezePocValueV1({
    category: "command_handler",
    code: "command.handler_threw",
    ruleSlot: null,
    message: errorMessageV1(error),
    ...(stack === undefined ? {} : { stack }),
  });
}

function engineInvariantFaultV1(
  code: Extract<PocEngineFaultV1, { readonly category: "engine_invariant" }>["code"],
  error: unknown,
): PocEngineFaultV1 {
  const stack = errorStackV1(error);
  return deepFreezePocValueV1({
    category: "engine_invariant",
    code,
    ruleSlot: null,
    message: errorMessageV1(error),
    ...(stack === undefined ? {} : { stack }),
  });
}

function storyRuleFaultV1(
  slot: StoryRuleSlotV1,
  error: unknown,
  override?: Extract<PocEngineFaultV1, { readonly category: "story_rule" }>["code"],
): PocEngineFaultV1 {
  const message = errorMessageV1(error);
  const code =
    override ?? (error instanceof PocRuleInvocationErrorV1 ? error.faultCode : "rule.threw");
  const stack = errorStackV1(error);
  return deepFreezePocValueV1({
    category: "story_rule",
    code,
    ruleSlot: slot,
    message,
    ...(stack === undefined ? {} : { stack }),
  });
}

function rejectV1(rejection: PocRejectionReasonV1): never {
  throw new PocRejectedCommandV1(deepFreezePocValueV1(rejection));
}

function faultV1(fault: PocEngineFaultV1): never {
  throw new PocFaultedCommandV1(fault);
}

function requireAppliedV1(result: PocCandidateOwnerResultV1): void {
  if (result.kind === "rejected") rejectV1(result.rejection);
}

function commandReasonV1(
  commandKind: PocGameCommandV1["kind"],
  reasonId: ReasonId,
): Extract<ChangeReasonV1, { readonly kind: "command" }> {
  return deepFreezePocValueV1({ kind: "command", commandKind, reasonId });
}

function calendarPolicyApV1(
  candidate: PocTransactionCandidateV1,
  data: DeepReadonly<PocSimulationDataV1>,
) {
  const calendar = candidate.calendarReadPort();
  if (calendar.lifePolicyId === null) return parseNonNegativeSafeInteger(0);
  const policy = data.balance.lifePolicies.find(
    ({ policyId }) => policyId === calendar.lifePolicyId,
  );
  if (policy === undefined) {
    faultV1(engineInvariantFaultV1("story.reference_missing", new TypeError("missing policy")));
  }
  return policy.apByPhase[calendar.phase];
}

function selectedReadPortsV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
) {
  const snapshot = candidate.snapshot();
  return {
    run: modules[0].createReadPort(snapshot.state.simulation.run),
    calendar: modules[1].createReadPort(snapshot.state.simulation.calendar),
    actors: modules[2].createReadPort(snapshot.state.simulation.actors),
    status: modules[3].createReadPort(snapshot.state.simulation.status),
    inventory: modules[4].createReadPort(snapshot.state.simulation.inventory),
    facilities: modules[5].createReadPort(snapshot.state.simulation.facilities),
    tavern: modules[6].createReadPort(snapshot.state.simulation.tavern),
    workflow: modules[7].createReadPort(snapshot.state.simulation.activeWorkflow),
    progression: modules[8].createReadPort({
      facts: snapshot.state.story.facts,
      quests: snapshot.state.story.quests,
      outcomes: snapshot.state.story.outcomes,
      resolvedChecks: snapshot.state.story.resolvedChecks,
    }),
    narrative: modules[9].createReadPort(snapshot.state.story.narrative),
  };
}

function sourceOrderV1(left: AuraInstanceV1, right: AuraInstanceV1): number {
  if (left.appliedAtSequence !== right.appliedAtSequence) {
    return left.appliedAtSequence - right.appliedAtSequence;
  }
  return left.instanceId < right.instanceId ? -1 : left.instanceId > right.instanceId ? 1 : 0;
}

export function collectPocModifiersV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
): readonly ModifierV1[] {
  const data = candidate.data();
  const ports = selectedReadPortsV1(candidate, modules);
  const modifiers: ModifierV1[] = [];
  for (const built of [...ports.facilities.built].sort(
    ({ facilityId: left }, { facilityId: right }) => (left < right ? -1 : left > right ? 1 : 0),
  )) {
    const definition = data.content.facilities.find(
      ({ facilityId }) => facilityId === built.facilityId,
    );
    if (definition === undefined) {
      faultV1(
        engineInvariantFaultV1(
          "story.reference_missing",
          new TypeError(`missing Facility ${built.facilityId}`),
        ),
      );
    }
    modifiers.push(...definition.modifiers);
  }
  for (const aura of [...ports.status.auras].sort(sourceOrderV1)) {
    const definition = data.content.auras.find(({ auraId }) => auraId === aura.auraId);
    if (definition === undefined) {
      faultV1(
        engineInvariantFaultV1(
          "story.reference_missing",
          new TypeError(`missing Aura ${aura.auraId}`),
        ),
      );
    }
    modifiers.push(...definition.modifiers);
  }
  if (ports.workflow?.kind === "opening") modifiers.push(...ports.workflow.sessionModifiers);
  return deepFreezePocValueV1(modifiers);
}

function inventoryIngredientsV1(
  data: DeepReadonly<PocSimulationDataV1>,
): readonly PocInventoryIngredientPortV1[] {
  return deepFreezePocValueV1(
    data.content.ingredients.map(({ ingredientId, unitPrice, shelfLifeDays, refrigeratable }) => ({
      ingredientId,
      unitPrice,
      shelfLifeDays,
      refrigeratable,
    })),
  );
}

function addShelfLifeDaysV1(
  totals: Map<IngredientId, number>,
  ingredientId: IngredientId,
  amount: number,
): void {
  const total = (totals.get(ingredientId) ?? 0) + amount;
  if (!Number.isSafeInteger(total) || total <= 0) {
    faultV1(
      engineInvariantFaultV1(
        "story.value_invalid",
        new TypeError(`Shelf-life extension for ${ingredientId} exceeds safe integer bounds`),
      ),
    );
  }
  totals.set(ingredientId, total);
}

function builtShelfLifeExtensionsV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
) {
  const ports = selectedReadPortsV1(candidate, modules);
  const built = new Set(ports.facilities.built.map(({ facilityId }) => facilityId));
  const totals = new Map<IngredientId, number>();
  for (const facility of candidate.data().content.facilities) {
    if (!built.has(facility.facilityId)) continue;
    for (const modifier of facility.modifiers) {
      if (modifier.kind !== "shelf_life.add_days") continue;
      for (const ingredientId of modifier.ingredientIds) {
        addShelfLifeDaysV1(totals, ingredientId, modifier.amount);
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

function conditionObservationV1(
  candidate: PocTransactionCandidateV1,
  narrativeStatus?: NarrativeRuntimeStateV1["status"],
) {
  const state = candidate.snapshot().state;
  return deepFreezePocValueV1({
    state,
    narrativeStatus: narrativeStatus ?? state.story.narrative.status,
  });
}

function actionPresentationV1(
  candidate: PocTransactionCandidateV1,
  commandKind: PocGameCommandV1["kind"],
  actionId?: ActionId,
): ActionPresentationDefinitionV1 {
  const matches = candidate
    .data()
    .content.actions.filter(
      (action) =>
        action.commandKind === commandKind &&
        (actionId === undefined || action.actionId === actionId),
    );
  if (matches.length !== 1 || matches[0] === undefined) {
    faultV1(
      engineInvariantFaultV1(
        "story.reference_missing",
        new TypeError(`missing unique Action presentation for ${commandKind}`),
      ),
    );
  }
  return matches[0];
}

function guardActionV1(
  candidate: PocTransactionCandidateV1,
  commandKind: PocGameCommandV1["kind"],
  actionId?: ActionId,
): ActionPresentationDefinitionV1 {
  const action = actionPresentationV1(candidate, commandKind, actionId);
  const calendar = candidate.calendarReadPort();
  if (!action.availablePhases.includes(calendar.phase)) {
    rejectV1({
      code: "calendar.invalid_phase",
      details: { actual: calendar.phase, allowed: action.availablePhases },
    });
  }
  const observation = conditionObservationV1(candidate);
  for (const gate of [...action.visibility, ...action.availability]) {
    if (!evaluatePocConditionsV1(gate.conditions, observation, candidate.data())) {
      rejectV1({
        code: "action.unavailable",
        details: { actionId: action.actionId, reasonId: gate.reasonId },
      });
    }
  }
  return action;
}

function routeEffectsV1(
  candidate: PocTransactionCandidateV1,
  effects: readonly DeepReadonly<Parameters<typeof routePocEffectBatchV1>[1][number]>[],
  source: DeepReadonly<PocEffectSourceV1>,
  ruleSlot?: StoryRuleSlotV1,
): void {
  try {
    const result = routePocEffectBatchV1(candidate, effects, source);
    if (result.kind === "rejected") rejectV1(result.rejection);
  } catch (error) {
    if (error instanceof PocRejectedCommandV1 || error instanceof PocFaultedCommandV1) throw error;
    if (ruleSlot !== undefined) faultV1(storyRuleFaultV1(ruleSlot, error, "effect.invalid"));
    throw error;
  }
}

function invokeRuleV1<T>(slot: StoryRuleSlotV1, invoke: () => T): T {
  try {
    const result = invoke();
    let current: object | null =
      (typeof result === "object" || typeof result === "function") && result !== null
        ? result
        : null;
    while (current !== null) {
      const descriptor = Object.getOwnPropertyDescriptor(current, "then");
      if (
        descriptor !== undefined &&
        (descriptor.get !== undefined ||
          descriptor.set !== undefined ||
          ("value" in descriptor && typeof descriptor.value === "function"))
      ) {
        faultV1(
          storyRuleFaultV1(
            slot,
            new TypeError(`${slot} rule returned a thenable`),
            "rule.returned_thenable",
          ),
        );
      }
      current = Object.getPrototypeOf(current) as object | null;
    }
    return result;
  } catch (error) {
    if (error instanceof PocFaultedCommandV1) throw error;
    return faultV1(storyRuleFaultV1(slot, error));
  }
}

function fixedActionCostV1(
  candidate: PocTransactionCandidateV1,
  key: DeepReadonly<PocSimulationDataV1>["balance"]["actionCosts"][number]["action"],
) {
  const matches = candidate.data().balance.actionCosts.filter(({ action }) => action === key);
  if (matches.length !== 1 || matches[0] === undefined) {
    faultV1(
      engineInvariantFaultV1("story.reference_missing", new TypeError(`missing ActionCost ${key}`)),
    );
  }
  return matches[0];
}

function payFixedActionCostV1(
  candidate: PocTransactionCandidateV1,
  commandKind: PocGameCommandV1["kind"],
  key: DeepReadonly<PocSimulationDataV1>["balance"]["actionCosts"][number]["action"],
): void {
  const cost = fixedActionCostV1(candidate, key);
  const reason = commandReasonV1(commandKind, cost.reasonId);
  if (cost.apCost > 0) {
    requireAppliedV1(
      candidate.applyCalendar(
        { kind: "calendar.ap.adjust", delta: parseSafeInteger(-Number(cost.apCost)), reason },
        calendarDependenciesV1(calendarPolicyApV1(candidate, candidate.data())),
      ),
    );
  }
  if (cost.playerStaminaCost > 0) {
    requireAppliedV1(
      candidate.applyActors(
        {
          kind: "actors.adjust_stamina",
          actorId: "actor.player",
          application: "debit",
          components: [
            { requestedDelta: parseSafeInteger(-Number(cost.playerStaminaCost)), reason },
          ],
        },
        noDependenciesV1,
      ),
    );
  }
  if (cost.heroineStaminaCost > 0) {
    requireAppliedV1(
      candidate.applyActors(
        {
          kind: "actors.adjust_stamina",
          actorId: "actor.heroine",
          application: "debit",
          components: [
            { requestedDelta: parseSafeInteger(-Number(cost.heroineStaminaCost)), reason },
          ],
        },
        noDependenciesV1,
      ),
    );
  }
}

function materializeDemandV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  day: ReturnType<typeof parseDayIndex>,
): MaterializedDemandDayV1 | null {
  if (!program.data.balance.serviceDays.includes(day)) return null;
  const ports = selectedReadPortsV1(candidate, modules);
  const tavern = ports.tavern;
  const seedDay = tavern.demandSeeds.find((entry) => entry.day === day);
  if (seedDay === undefined) {
    faultV1(
      engineInvariantFaultV1(
        "story.reference_missing",
        new TypeError(`missing demand seeds for day ${day}`),
      ),
    );
  }
  const input: DemandProjectionInputV1 = deepFreezePocValueV1({
    day,
    seeds: seedDay.segments,
    reputation: tavern.reputation,
    facts: ports.progression.facts,
    modifiers: collectPocModifiersV1(candidate, modules),
  });
  const preview = invokeRuleV1("demand.preview", () => program.rules.demand.preview(input));
  return deepFreezePocValueV1({
    day,
    segments: preview.lines.map(({ segmentId, range, actualCustomers, modifiers }) => ({
      segmentId,
      preview: range,
      actualCustomers,
      modifiers,
    })),
  });
}

function installDemandSeedsV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
): readonly DemandDayStateV1[] {
  const run = selectedReadPortsV1(candidate, modules).run;
  const input = deepFreezePocValueV1({
    runId: run.runId,
    segments: program.data.balance.baseDemand.map(({ day, segmentId, customers }) => ({
      day,
      segmentId,
      baseCustomers: customers,
    })),
  });
  const resolved = invokeRuleV1("demand.resolve", () =>
    program.rules.demand.resolve(input, candidate.rng()),
  );
  const offsetByLine = new Map(
    resolved.lines.map((line) => [`${line.day}\u0000${line.segmentId}`, line.randomOffset]),
  );
  const demandSeeds = program.data.balance.serviceDays.map((day) => ({
    day,
    segments: program.data.content.customerSegments.map(({ segmentId }) => {
      const base = program.data.balance.baseDemand.find(
        (line) => line.day === day && line.segmentId === segmentId,
      );
      const randomOffset = offsetByLine.get(`${day}\u0000${segmentId}`);
      if (base === undefined || randomOffset === undefined) {
        faultV1(
          engineInvariantFaultV1(
            "story.reference_missing",
            new TypeError(`incomplete demand line ${day}/${segmentId}`),
          ),
        );
      }
      return { segmentId, baseCustomers: base.customers, randomOffset };
    }),
  }));
  requireAppliedV1(
    candidate.applyTavern(
      { kind: "tavern.demand_seeds.set", demandSeeds },
      { kind: "tavern.demand_seeds.set" },
    ),
  );
  return deepFreezePocValueV1(demandSeeds);
}

function schedulerObservationV1(
  candidate: PocTransactionCandidateV1,
  narrativeStatus?: NarrativeRuntimeStateV1["status"],
) {
  return deepFreezePocValueV1({
    state: candidate.snapshot().state,
    narrativeStatus: narrativeStatus ?? candidate.snapshot().state.story.narrative.status,
  });
}

function applySchedulerContextV1(
  candidate: PocTransactionCandidateV1,
  context: SchedulerContextV1,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
  blockingRequests: PocBlockingNarrativeRequestV1[],
  narrativeStatus?: NarrativeRuntimeStateV1["status"],
): void {
  const events = scheduler.resolve({
    context,
    observation: schedulerObservationV1(candidate, narrativeStatus),
  });
  for (const event of events) {
    const workflow = candidate.workflowReadPort();
    if (workflow?.kind === "opening") {
      requireAppliedV1(
        candidate.applyWorkflow(
          { kind: "workflow.record_opening_event", eventId: event.eventId },
          { kind: "workflow.record_opening_event", checkpoint: workflow.checkpoint },
        ),
      );
    }
    candidate.appendGameplayFact({
      kind: "scheduler.event_triggered",
      checkpointId: event.checkpointId,
      eventId: event.eventId,
    });
    routeEffectsV1(candidate, event.effects, { kind: "event", eventId: event.eventId });
    if (event.sceneId !== null) {
      blockingRequests.push({
        source: { kind: "event", eventId: event.eventId },
        sceneId: event.sceneId,
      });
    }
  }
}

function narrativeEffectSourceV1(
  source: DeepReadonly<NarrativeSourceV1>,
  commandKind: PocGameCommandV1["kind"],
): PocEffectSourceV1 {
  switch (source.kind) {
    case "event":
      return { kind: "event", eventId: source.eventId };
    case "story_action":
      return { kind: "story_action", actionId: source.actionId };
    case "world_action":
      return { kind: "world_action", actionId: source.actionId };
    case "manifest_start":
    case "debug_fixture":
      return { kind: "command", commandKind };
  }
  const exhaustive: never = source;
  throw new TypeError(`unsupported Narrative source ${String(exhaustive)}`);
}

function modifierReasonV1(
  modifier: DeepReadonly<ModifierV1>,
  commandKind: PocGameCommandV1["kind"],
): ChangeReasonV1 {
  switch (modifier.source.kind) {
    case "facility":
      return {
        kind: "facility",
        facilityId: modifier.source.facilityId,
        reasonId: modifier.reasonId,
      };
    case "aura":
      return { kind: "aura", auraId: modifier.source.auraId, reasonId: modifier.reasonId };
    case "event":
      return { kind: "event", eventId: modifier.source.eventId, reasonId: modifier.reasonId };
    case "story":
      return { kind: "command", commandKind, reasonId: modifier.reasonId };
  }
  const exhaustive: never = modifier.source;
  throw new TypeError(`unsupported Modifier source ${String(exhaustive)}`);
}

function resolveNarrativeCheckV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  request: DeepReadonly<PocNarrativeInterpreterRequestV1 & { readonly kind: "check" }>["request"],
  source: DeepReadonly<PocEffectSourceV1>,
): CheckResultV1 {
  const definition = program.data.content.checks.find(({ checkId }) => checkId === request.checkId);
  if (definition === undefined) {
    faultV1(
      engineInvariantFaultV1(
        "story.reference_missing",
        new TypeError(`missing Check ${request.checkId}`),
      ),
    );
  }
  const actors = selectedReadPortsV1(candidate, modules).actors;
  if (request.actorId !== actors.player.actorId) {
    faultV1(
      engineInvariantFaultV1(
        "story.reference_missing",
        new TypeError(`Check actor ${request.actorId} has no attributes`),
      ),
    );
  }
  const rank = actors.player.attributes[definition.attribute];
  const input: CheckInputV1 = deepFreezePocValueV1({
    checkId: definition.checkId,
    actorId: request.actorId,
    attribute: definition.attribute,
    rank,
    attributeBonus: parseAttributeBonus(attributeBonusByRankV1[rank]),
    preparationBonus: request.preparationBonus,
    modifiers: collectPocModifiersV1(candidate, modules),
    bands: definition.bands,
  });
  const result = invokeRuleV1("checks.resolve", () =>
    program.rules.checks.resolve(input, candidate.rng()),
  );
  const { effects: _effects, ...resolved } = result;
  requireAppliedV1(
    candidate.applyProgression(
      {
        kind: "progression.check.record",
        check: { ...resolved, resolvedAtSequence: candidate.nextCommandSequence() },
      },
      {
        kind: "progression.check.record",
        definition,
        result,
        commandSequence: candidate.nextCommandSequence(),
      },
    ),
  );
  routeEffectsV1(candidate, result.effects, source, "checks.resolve");
  return result;
}

function interpreterFaultV1(
  result: Extract<PocNarrativeStepResultV1, { readonly kind: "faulted" }>,
): PocEngineFaultV1 {
  return deepFreezePocValueV1({
    category: result.fault.category,
    code: result.fault.code,
    ruleSlot: null,
    message: `Narrative interpreter fault: ${result.fault.code}`,
  } as PocEngineFaultV1);
}

function applyNarrativeWorkflowCompletionV1(
  candidate: PocTransactionCandidateV1,
  before: DeepReadonly<ActiveWorkflowV1 | null>,
  source: DeepReadonly<NarrativeSourceV1 | null>,
  settled: DeepReadonly<NarrativeRuntimeStateV1>,
): void {
  if (settled.status !== "completed" || source === null || before === null) return;
  if (
    before.kind === "opening" &&
    before.blockingEvent !== null &&
    source.kind === "event" &&
    source.eventId === before.blockingEvent.eventId
  ) {
    requireAppliedV1(
      candidate.applyWorkflow(
        { kind: "workflow.clear_opening_blocking_event", eventId: source.eventId },
        { kind: "workflow.clear_opening_blocking_event" },
      ),
    );
    return;
  }
  if (before.kind !== "world_action" || source.kind !== "world_action") return;
  if (before.progress === "begin_scene") {
    requireAppliedV1(
      candidate.applyWorkflow(
        { kind: "workflow.finish_world_action_begin_scene" },
        { kind: "workflow.finish_world_action_begin_scene" },
      ),
    );
  } else if (before.progress === "completion_scene") {
    requireAppliedV1(
      candidate.applyWorkflow(
        { kind: "workflow.finish_world_action_completion_scene" },
        { kind: "workflow.finish_world_action_completion_scene" },
      ),
    );
  }
}

function driveNarrativeV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
  blockingRequests: PocBlockingNarrativeRequestV1[],
  commandKind: PocGameCommandV1["kind"],
  operationKind: "narrative.start" | "narrative.advance" | "narrative.choose",
  input: DeepReadonly<PocNarrativeInterpreterInputV1>,
): void {
  const beforeWorkflow = selectedReadPortsV1(candidate, modules).workflow;
  let state = selectedReadPortsV1(candidate, modules).narrative;
  let step = interpretPocNarrativeStepV1(program.data, state, input);

  while (step.kind === "yielded") {
    const continuation = step.continuation;
    const request = step.request;
    const source = continuation.transientState.source;
    if (source === null) {
      faultV1(
        engineInvariantFaultV1(
          "narrative.invalid_cursor",
          new TypeError("active Narrative has no source"),
        ),
      );
    }
    const effectSource = narrativeEffectSourceV1(source, commandKind);
    let resolution: PocNarrativeResolutionV1;
    switch (request.kind) {
      case "condition":
        resolution = {
          kind: "condition",
          cursor: request.cursor,
          passed: evaluatePocConditionsV1(
            request.conditions,
            conditionObservationV1(candidate, continuation.transientState.status),
            program.data,
          ),
        };
        break;
      case "check": {
        const result = resolveNarrativeCheckV1(
          candidate,
          modules,
          program,
          request.request,
          effectSource,
        );
        resolution = {
          kind: "check",
          cursor: request.cursor,
          decision: {
            checkId: result.checkId,
            actorId: result.actorId,
            bandId: result.bandId,
          },
        };
        break;
      }
      case "choice": {
        const observation = conditionObservationV1(candidate, continuation.transientState.status);
        if (!evaluatePocConditionsV1(request.choice.showWhen, observation, program.data)) {
          rejectV1({
            code: "narrative.choice_hidden",
            details: { choiceId: request.choice.choiceId },
          });
        }
        if (!evaluatePocConditionsV1(request.choice.enableWhen, observation, program.data)) {
          if (request.choice.disabledReasonId === undefined) {
            faultV1(
              engineInvariantFaultV1(
                "story.reference_missing",
                new TypeError("disabled Narrative choice has no ReasonId"),
              ),
            );
          }
          rejectV1({
            code: "narrative.choice_disabled",
            details: {
              choiceId: request.choice.choiceId,
              reasonId: request.choice.disabledReasonId,
            },
          });
        }
        const checkResult =
          request.choice.check === undefined
            ? null
            : resolveNarrativeCheckV1(
                candidate,
                modules,
                program,
                request.choice.check,
                effectSource,
              );
        routeEffectsV1(candidate, request.choice.effects, effectSource);
        resolution = {
          kind: "choice",
          cursor: request.cursor,
          choiceId: request.choice.choiceId,
          visible: true,
          enabled: true,
          checkDecision:
            checkResult === null
              ? null
              : {
                  checkId: checkResult.checkId,
                  actorId: checkResult.actorId,
                  bandId: checkResult.bandId,
                },
        };
        break;
      }
      case "effects":
        routeEffectsV1(candidate, request.effects, effectSource);
        resolution = { kind: "effects_applied", cursor: request.cursor };
        break;
      case "checkpoint":
        applySchedulerContextV1(
          candidate,
          { kind: "story.explicit", checkpointId: request.checkpointId },
          scheduler,
          blockingRequests,
          continuation.transientState.status,
        );
        resolution = { kind: "checkpoint_applied", cursor: request.cursor };
        break;
    }
    state = continuation.transientState;
    step = interpretPocNarrativeStepV1(program.data, state, {
      kind: "resume",
      continuation,
      resolution,
    });
  }

  if (step.kind === "rejected") rejectV1(step.rejection);
  if (step.kind === "faulted") faultV1(interpreterFaultV1(step));
  requireAppliedV1(
    candidate.applyNarrative({ kind: operationKind, settled: step }, { kind: "narrative.settled" }),
  );
  applyNarrativeWorkflowCompletionV1(candidate, beforeWorkflow, step.state.source, step.state);
}

function settleBlockingNarrativesV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
  blockingRequests: PocBlockingNarrativeRequestV1[],
  commandKind: PocGameCommandV1["kind"],
  handlerRequest: PocBlockingNarrativeRequestV1 | null,
): void {
  if (blockingRequests.length > 1) {
    faultV1(
      engineInvariantFaultV1(
        "scheduler.multiple_blocking_events",
        new TypeError("multiple Scheduler scenes selected"),
      ),
    );
  }
  const schedulerRequest = blockingRequests[0];
  if (schedulerRequest !== undefined && handlerRequest !== null) {
    faultV1(
      engineInvariantFaultV1(
        "narrative.blocking_conflict",
        new TypeError("Scheduler scene conflicts with command Narrative"),
      ),
    );
  }
  const request = handlerRequest ?? schedulerRequest;
  if (request === undefined) return;
  if (selectedReadPortsV1(candidate, modules).narrative.status === "active") {
    faultV1(
      engineInvariantFaultV1(
        "narrative.blocking_conflict",
        new TypeError("Scheduler scene conflicts with command Narrative"),
      ),
    );
  }
  const workflow = candidate.workflowReadPort();
  if (schedulerRequest !== undefined && workflow?.kind === "opening") {
    if (schedulerRequest.source.kind !== "event") {
      faultV1(
        engineInvariantFaultV1(
          "workflow.conflict",
          new TypeError("Opening Scheduler scene has non-Event source"),
        ),
      );
    }
    requireAppliedV1(
      candidate.applyWorkflow(
        {
          kind: "workflow.set_opening_blocking_event",
          blockingEvent: {
            eventId: schedulerRequest.source.eventId,
            sceneId: schedulerRequest.sceneId,
          },
        },
        { kind: "workflow.set_opening_blocking_event", checkpoint: workflow.checkpoint },
      ),
    );
  }
  driveNarrativeV1(
    candidate,
    modules,
    program,
    scheduler,
    blockingRequests,
    commandKind,
    "narrative.start",
    { kind: "start", request },
  );
}

function unknownReferenceV1(
  commandKind: PocGameCommandV1["kind"],
  reference: Extract<
    PocRejectionReasonV1,
    { readonly code: "command.unknown_reference" }
  >["details"]["reference"],
): never {
  rejectV1({ code: "command.unknown_reference", details: { commandKind, reference } });
}

function applyCommandSchedulerV1(
  candidate: PocTransactionCandidateV1,
  commandKind: PocGameCommandV1["kind"],
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
  blockingRequests: PocBlockingNarrativeRequestV1[],
): void {
  applySchedulerContextV1(
    candidate,
    { kind: "command.succeeded", commandKind },
    scheduler,
    blockingRequests,
  );
}

function finishCommandSchedulerV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
  commandKind: PocGameCommandV1["kind"],
): void {
  const blockingRequests: PocBlockingNarrativeRequestV1[] = [];
  applyCommandSchedulerV1(candidate, commandKind, scheduler, blockingRequests);
  settleBlockingNarrativesV1(
    candidate,
    modules,
    program,
    scheduler,
    blockingRequests,
    commandKind,
    null,
  );
}

function currentStateTavernPreviewInputV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  plan: DeepReadonly<TavernPlanV1>,
): TavernPreviewInputV1 {
  const ports = selectedReadPortsV1(candidate, modules);
  const available = new Map<IngredientId, number>();
  for (const batch of ports.inventory.ingredientBatches) {
    const current = available.get(batch.ingredientId) ?? 0;
    if (current > Number.MAX_SAFE_INTEGER - batch.quantity) {
      faultV1(
        engineInvariantFaultV1(
          "resource.negative",
          new TypeError("available ingredient quantity exceeds safe integer bounds"),
        ),
      );
    }
    available.set(batch.ingredientId, current + batch.quantity);
  }
  return deepFreezePocValueV1({
    basis: "current_state",
    day: ports.calendar.day,
    plan,
    preparationActionCount: ports.tavern.preparation.actionCount,
    availableIngredients: [...available]
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([ingredientId, quantity]) => ({
        ingredientId,
        quantity: parseQuantity(quantity),
      })),
    demand: ports.tavern.currentDemand?.segments ?? [],
    actors: {
      playerAttributes: ports.actors.player.attributes,
      heroineMood: ports.actors.heroine.mood,
      relationship: ports.actors.relationship,
      helper: ports.tavern.helper,
    },
    facilityIds: ports.facilities.built.map(({ facilityId }) => facilityId),
    modifiers: collectPocModifiersV1(candidate, modules),
    resources: {
      apRemaining: ports.calendar.apRemaining,
      cash: ports.inventory.cash,
      playerStamina: ports.actors.player.stamina.current,
      heroineStamina: ports.actors.heroine.stamina.current,
    },
  });
}

export function previewPocTavernPlanForCandidateV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  plan: DeepReadonly<TavernPlanV1>,
): TavernPreviewV1 {
  const input = currentStateTavernPreviewInputV1(candidate, modules, plan);
  return invokeRuleV1("tavern.preview", () => program.rules.tavern.preview(input));
}

function actionUnavailableReasonV1(
  gates: readonly DeepReadonly<AvailabilityGateV1>[],
  candidate: PocTransactionCandidateV1,
): ReasonId | null {
  const observation = conditionObservationV1(candidate);
  for (const gate of gates) {
    if (!evaluatePocConditionsV1(gate.conditions, observation, candidate.data())) {
      return gate.reasonId;
    }
  }
  return null;
}

function recoveryComponentsV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  actorId: "actor.player" | "actor.heroine",
  base: number,
  baseReason: ChangeReasonV1,
  commandKind: PocGameCommandV1["kind"],
) {
  const components: {
    readonly requestedDelta: ReturnType<typeof parseSafeInteger>;
    readonly reason: ChangeReasonV1;
  }[] = [{ requestedDelta: parseSafeInteger(base), reason: baseReason }];
  for (const modifier of collectPocModifiersV1(candidate, modules)) {
    if (modifier.kind !== "recovery.add" || modifier.actorId !== actorId) continue;
    components.push({
      requestedDelta: modifier.amount,
      reason: modifierReasonV1(modifier, commandKind),
    });
  }
  const first = components[0];
  if (first === undefined) throw new TypeError("missing recovery base component");
  return deepFreezePocValueV1([first, ...components.slice(1)] as const);
}

function runStartV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
): void {
  const ports = selectedReadPortsV1(candidate, modules);
  const demandSeeds = installDemandSeedsV1(candidate, modules, program);
  candidate.appendGameplayFact({
    kind: "run.started",
    runId: ports.run.runId,
    initialSeed: ports.run.initialSeed,
    demandSeeds,
  });
  const demand = materializeDemandV1(candidate, modules, program, ports.calendar.day);
  if (demand !== null) {
    requireAppliedV1(
      candidate.applyTavern(
        { kind: "tavern.current_demand.set", currentDemand: demand },
        { kind: "tavern.current_demand.set" },
      ),
    );
  }
  const blockingRequests: PocBlockingNarrativeRequestV1[] = [];
  const handlerRequest: PocBlockingNarrativeRequestV1 = {
    source: { kind: "manifest_start" },
    sceneId: program.data.manifest.initialSceneId,
  };
  applyCommandSchedulerV1(candidate, "run.start", scheduler, blockingRequests);
  settleBlockingNarrativesV1(
    candidate,
    modules,
    program,
    scheduler,
    blockingRequests,
    "run.start",
    handlerRequest,
  );
}

function choosePolicyV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
  command: Extract<PocGameCommandV1, { readonly kind: "policy.choose" }>,
): void {
  const policy = program.data.balance.lifePolicies.find(
    ({ policyId }) => policyId === command.policyId,
  );
  if (policy === undefined) {
    unknownReferenceV1(command.kind, { kind: "policy", policyId: command.policyId });
  }
  guardActionV1(candidate, command.kind);
  const calendar = candidate.calendarReadPort();
  requireAppliedV1(
    candidate.applyCalendar(
      { kind: "calendar.policy.choose", policyId: command.policyId },
      calendarDependenciesV1(policy.apByPhase[calendar.phase]),
    ),
  );
  requireAppliedV1(candidate.applyRun({ kind: "run.activate" }, noDependenciesV1));
  finishCommandSchedulerV1(candidate, modules, program, scheduler, command.kind);
}

function buyInventoryV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
  command: Extract<PocGameCommandV1, { readonly kind: "inventory.buy" }>,
): void {
  guardActionV1(candidate, command.kind);
  const ingredientIds = new Set(
    candidate.data().content.ingredients.map(({ ingredientId }) => ingredientId),
  );
  for (const line of command.lines) {
    if (!ingredientIds.has(line.ingredientId)) {
      unknownReferenceV1(command.kind, {
        kind: "ingredient",
        ingredientId: line.ingredientId,
      });
    }
  }
  payFixedActionCostV1(candidate, command.kind, "inventory.buy");
  requireAppliedV1(
    candidate.applyInventory(
      {
        kind: "inventory.purchase",
        lines: command.lines,
        reasonId: candidate.data().balance.ledgerReasons.purchase,
      },
      {
        kind: "inventory.purchase",
        commandSequence: candidate.nextCommandSequence(),
        day: candidate.calendarReadPort().day,
        nextBatchIndex: candidate.nextBatchIndex(),
        nextLedgerEntryIndex: candidate.nextLedgerEntryIndex(),
        purchaseLineLimit: candidate.data().balance.purchaseLineLimit,
        purchaseReasonId: candidate.data().balance.ledgerReasons.purchase,
        ingredients: inventoryIngredientsV1(candidate.data()),
        shelfLifeExtensions: builtShelfLifeExtensionsV1(candidate, modules),
      },
    ),
  );
  finishCommandSchedulerV1(candidate, modules, program, scheduler, command.kind);
}

function prepareFoodV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
): void {
  guardActionV1(candidate, "actor.prepare_food");
  const tavern = selectedReadPortsV1(candidate, modules).tavern;
  const limit = candidate.data().balance.dailyPreparationLimit;
  if (tavern.preparation.actionCount >= limit) {
    rejectV1({
      code: "tavern.preparation_limit_reached",
      details: { current: tavern.preparation.actionCount, limit },
    });
  }
  payFixedActionCostV1(candidate, "actor.prepare_food", "actor.prepare_food");
  const cost = fixedActionCostV1(candidate, "actor.prepare_food");
  requireAppliedV1(
    candidate.applyTavern(
      { kind: "tavern.preparation.increment", day: candidate.calendarReadPort().day },
      {
        kind: "tavern.preparation.increment",
        dailyPreparationLimit: limit,
        prepareFoodReasonId: cost.reasonId,
      },
    ),
  );
  finishCommandSchedulerV1(candidate, modules, program, scheduler, "actor.prepare_food");
}

function restActorV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
): void {
  guardActionV1(candidate, "actor.rest");
  const player = selectedReadPortsV1(candidate, modules).actors.player;
  if (Number(player.stamina.current) >= Number(player.stamina.maximum)) {
    rejectV1({
      code: "actor.stamina_at_maximum",
      details: { actorId: player.actorId, maximum: player.stamina.maximum },
    });
  }
  const cost = fixedActionCostV1(candidate, "actor.rest");
  payFixedActionCostV1(candidate, "actor.rest", "actor.rest");
  requireAppliedV1(
    candidate.applyActors(
      {
        kind: "actors.adjust_stamina",
        actorId: player.actorId,
        application: "recovery",
        components: recoveryComponentsV1(
          candidate,
          modules,
          "actor.player",
          candidate.data().balance.restRecovery,
          commandReasonV1("actor.rest", cost.reasonId),
          "actor.rest",
        ),
      },
      noDependenciesV1,
    ),
  );
  finishCommandSchedulerV1(candidate, modules, program, scheduler, "actor.rest");
}

function storyActionV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
  command: Extract<PocGameCommandV1, { readonly kind: "story.action.start" }>,
): void {
  const action = program.data.content.storyActions.find(
    ({ actionId }) => actionId === command.actionId,
  );
  if (action === undefined) {
    unknownReferenceV1(command.kind, { kind: "action", actionId: command.actionId });
  }
  guardActionV1(candidate, command.kind, command.actionId);
  routeEffectsV1(candidate, action.startEffects, {
    kind: "story_action",
    actionId: command.actionId,
  });
  const blockingRequests: PocBlockingNarrativeRequestV1[] = [];
  const handlerRequest: PocBlockingNarrativeRequestV1 | null =
    action.sceneId === null
      ? null
      : {
          source: { kind: "story_action", actionId: command.actionId },
          sceneId: action.sceneId,
        };
  applyCommandSchedulerV1(candidate, command.kind, scheduler, blockingRequests);
  settleBlockingNarrativesV1(
    candidate,
    modules,
    program,
    scheduler,
    blockingRequests,
    command.kind,
    handlerRequest,
  );
  candidate.appendGameplayFact({
    kind: "story.action_started",
    actionId: command.actionId,
    sceneId: action.sceneId,
  });
}

function facilityShelfLifeExtensionsV1(facility: DeepReadonly<FacilityDefinitionV1>): readonly {
  readonly ingredientId: IngredientId;
  readonly days: ReturnType<typeof parsePositiveSafeInteger>;
}[] {
  const totals = new Map<IngredientId, number>();
  for (const modifier of facility.modifiers) {
    if (modifier.kind !== "shelf_life.add_days") continue;
    for (const ingredientId of modifier.ingredientIds) {
      addShelfLifeDaysV1(totals, ingredientId, modifier.amount);
    }
  }
  return deepFreezePocValueV1(
    [...totals]
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([ingredientId, days]) => ({ ingredientId, days: parsePositiveSafeInteger(days) })),
  );
}

function chooseFacilityV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
  command: Extract<PocGameCommandV1, { readonly kind: "facility.choose" }>,
): void {
  const opportunity = program.data.content.facilityOpportunities.find(
    ({ opportunityId }) => opportunityId === command.opportunityId,
  );
  if (opportunity === undefined) {
    unknownReferenceV1(command.kind, {
      kind: "facility_opportunity",
      opportunityId: command.opportunityId,
    });
  }
  const facilityId = command.choice.kind === "build" ? command.choice.facilityId : null;
  const presentation = actionPresentationV1(candidate, command.kind, command.opportunityId);
  const calendar = candidate.calendarReadPort();
  if (!presentation.availablePhases.includes(calendar.phase)) {
    rejectV1({
      code: "calendar.invalid_phase",
      details: { actual: calendar.phase, allowed: presentation.availablePhases },
    });
  }
  const presentationUnavailable = actionUnavailableReasonV1(
    [...presentation.visibility, ...presentation.availability],
    candidate,
  );
  if (presentationUnavailable !== null) {
    rejectV1({
      code: "facility.unavailable",
      details: {
        opportunityId: command.opportunityId,
        facilityId,
        reasonId: presentationUnavailable,
      },
    });
  }
  const unavailable = actionUnavailableReasonV1(opportunity.availability, candidate);
  if (unavailable !== null) {
    rejectV1({
      code: "facility.unavailable",
      details: { opportunityId: command.opportunityId, facilityId, reasonId: unavailable },
    });
  }
  let facility: DeepReadonly<FacilityDefinitionV1> | null = null;
  if (command.choice.kind === "build") {
    const buildFacilityId = command.choice.facilityId;
    facility =
      program.data.content.facilities.find(({ facilityId: id }) => id === buildFacilityId) ?? null;
    if (facility === null) {
      unknownReferenceV1(command.kind, {
        kind: "facility",
        facilityId: buildFacilityId,
      });
    }
    if (!opportunity.facilityIds.includes(buildFacilityId)) {
      rejectV1({
        code: "facility.target_not_offered",
        details: {
          opportunityId: command.opportunityId,
          facilityId: buildFacilityId,
        },
      });
    }
    payFixedActionCostV1(candidate, command.kind, "facility.choose.build");
  }
  const buildReason = fixedActionCostV1(candidate, "facility.choose.build").reasonId;
  requireAppliedV1(
    candidate.applyFacilities(
      {
        kind: "facilities.choose",
        opportunityId: command.opportunityId,
        choice: command.choice,
      },
      {
        kind: "facilities.choose",
        commandSequence: candidate.nextCommandSequence(),
        opportunity: {
          opportunityId: opportunity.opportunityId,
          facilityIds: opportunity.facilityIds,
          skipReasonId: opportunity.skipReasonId,
        },
        facilityBuildReasonId: buildReason,
      },
    ),
  );
  if (facility !== null) {
    const extensions = facilityShelfLifeExtensionsV1(facility);
    const extensionIds = new Set(extensions.map(({ ingredientId }) => ingredientId));
    const inventory = selectedReadPortsV1(candidate, modules).inventory;
    const affectedBatchIds = inventory.ingredientBatches
      .filter(
        ({ ingredientId, refrigerationExtended }) =>
          extensionIds.has(ingredientId) && !refrigerationExtended,
      )
      .map(({ batchId }) => batchId)
      .toSorted();
    const reason: ChangeReasonV1 = {
      kind: "facility",
      facilityId: facility.facilityId,
      reasonId: program.data.balance.ledgerReasons.facilityBuild,
    };
    requireAppliedV1(
      candidate.applyInventory(
        {
          kind: "inventory.ledger.append",
          entries: [
            {
              category: "facility",
              reasonId: program.data.balance.ledgerReasons.facilityBuild,
              cashDelta: parseSafeInteger(-Number(facility.cashCost)),
              valuationDelta: parseSafeInteger(0),
              subject: { kind: "facility", facilityId: facility.facilityId },
            },
          ],
        },
        {
          kind: "inventory.ledger.append",
          commandSequence: candidate.nextCommandSequence(),
          nextLedgerEntryIndex: candidate.nextLedgerEntryIndex(),
          ledgerReasons: program.data.balance.ledgerReasons,
          context: {
            kind: "accepted_facility_build",
            reason,
            facilityId: facility.facilityId,
            affectedBatchIds,
            ingredients: inventoryIngredientsV1(program.data),
            shelfLifeExtensions: extensions,
          },
        },
      ),
    );
  }
  finishCommandSchedulerV1(candidate, modules, program, scheduler, command.kind);
}

function setTavernPlanV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
  command: Extract<PocGameCommandV1, { readonly kind: "tavern.plan.set" }>,
): void {
  guardActionV1(candidate, command.kind);
  const mode = program.data.balance.serviceModes.find(
    ({ mode: candidateMode }) => candidateMode === command.plan.mode,
  );
  if (mode === undefined) {
    faultV1(
      engineInvariantFaultV1(
        "story.reference_missing",
        new TypeError(`missing ServiceMode ${command.plan.mode}`),
      ),
    );
  }
  for (const recipe of command.plan.menu) {
    if (!program.data.content.recipes.some(({ recipeId }) => recipeId === recipe.recipeId)) {
      unknownReferenceV1(command.kind, { kind: "recipe", recipeId: recipe.recipeId });
    }
  }
  if (command.plan.menu.length > program.data.balance.menuRecipeLimit) {
    rejectV1({ code: "tavern.invalid_plan", details: { reason: "menu_size" } });
  }
  const unlockedRecipeIds = new Set(
    selectedReadPortsV1(candidate, modules).tavern.unlockedRecipeIds,
  );
  if (command.plan.menu.some(({ recipeId }) => !unlockedRecipeIds.has(recipeId))) {
    rejectV1({ code: "tavern.invalid_plan", details: { reason: "locked_recipe" } });
  }
  const unavailableReasonId = actionUnavailableReasonV1(mode.availability, candidate);
  if (unavailableReasonId !== null) {
    rejectV1({
      code: "tavern.service_unavailable",
      details: { mode: mode.mode, reasonId: unavailableReasonId },
    });
  }
  const preview = previewPocTavernPlanForCandidateV1(candidate, modules, program, command.plan);
  requireAppliedV1(
    candidate.applyTavern(
      {
        kind: "tavern.plan.set",
        plan: command.plan,
        reason: commandReasonV1(command.kind, mode.reasonId),
      },
      {
        kind: "tavern.plan.set",
        day: candidate.calendarReadPort().day,
        phase: candidate.calendarReadPort().phase,
        mode: mode.mode,
        modeReasonId: mode.reasonId,
        unavailableReasonId,
        menuRecipeLimit: program.data.balance.menuRecipeLimit,
        receptionCapacity: preview.receptionCapacity,
        preparationCapacity: preview.preparationCapacity,
        recipes: program.data.content.recipes.map(({ recipeId, prepPoints }) => ({
          recipeId,
          prepPoints,
        })),
      },
    ),
  );
  finishCommandSchedulerV1(candidate, modules, program, scheduler, command.kind);
}

function advanceNarrativeV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
): void {
  const cursor = selectedReadPortsV1(candidate, modules).narrative.cursor;
  if (cursor === null) {
    rejectV1({
      code: "narrative.inactive",
      details: { commandKind: "narrative.advance" },
    });
  }
  const blockingRequests: PocBlockingNarrativeRequestV1[] = [];
  driveNarrativeV1(
    candidate,
    modules,
    program,
    scheduler,
    blockingRequests,
    "narrative.advance",
    "narrative.advance",
    { kind: "advance", cursor },
  );
  applyCommandSchedulerV1(candidate, "narrative.advance", scheduler, blockingRequests);
  settleBlockingNarrativesV1(
    candidate,
    modules,
    program,
    scheduler,
    blockingRequests,
    "narrative.advance",
    null,
  );
}

function chooseNarrativeV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
  command: Extract<PocGameCommandV1, { readonly kind: "narrative.choose" }>,
): void {
  const blockingRequests: PocBlockingNarrativeRequestV1[] = [];
  driveNarrativeV1(
    candidate,
    modules,
    program,
    scheduler,
    blockingRequests,
    command.kind,
    "narrative.choose",
    {
      kind: "choose",
      cursor: { sceneId: command.sceneId, nodeId: command.nodeId },
      choiceId: command.choiceId,
    },
  );
  applyCommandSchedulerV1(candidate, command.kind, scheduler, blockingRequests);
  settleBlockingNarrativesV1(
    candidate,
    modules,
    program,
    scheduler,
    blockingRequests,
    command.kind,
    null,
  );
}

function statusDependenciesV1(data: DeepReadonly<PocSimulationDataV1>) {
  return deepFreezePocValueV1({
    auraDefinitions: data.content.auras.map(
      ({ auraId, reasonId, durationPolicy, allowedTargets }) => ({
        auraId,
        reasonId,
        durationPolicy,
        allowedTargets,
      }),
    ),
  });
}

function countdownAurasV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  unit: "phase_end" | "day_end" | "night_recovery",
): readonly AuraInstanceId[] {
  const selected = selectedReadPortsV1(candidate, modules).status.auras.filter(
    (aura) => aura.duration.kind === "countdown" && aura.duration.unit === unit,
  );
  const expired = selected
    .filter((aura) => aura.duration.kind === "countdown" && aura.duration.remaining === 1)
    .map(({ instanceId }) => instanceId);
  requireAppliedV1(
    candidate.applyStatus(
      {
        kind: "status.countdown",
        unit,
        instanceIds: selected.map(({ instanceId }) => instanceId),
      },
      statusDependenciesV1(candidate.data()),
    ),
  );
  return deepFreezePocValueV1(expired);
}

function appendClosureV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  kind: "planned" | "emergency",
): void {
  const data = candidate.data();
  const calendar = candidate.calendarReadPort();
  const before = selectedReadPortsV1(candidate, modules).tavern.reputation;
  const reasonId =
    kind === "planned"
      ? data.balance.plannedClosureReasonId
      : data.balance.emergencyClosure.reasonId;
  if (kind === "emergency") {
    requireAppliedV1(
      candidate.applyTavern(
        {
          kind: "tavern.reputation.adjust",
          delta: parseSafeInteger(-Number(data.balance.emergencyClosure.reputationPenalty)),
          reason: commandReasonV1("calendar.advance_phase", reasonId),
        },
        { kind: "tavern.reputation.adjust" },
      ),
    );
  }
  const after = selectedReadPortsV1(candidate, modules).tavern.reputation;
  requireAppliedV1(
    candidate.applyTavern(
      {
        kind: "tavern.service_history.append",
        history: {
          kind: "closure",
          closure: {
            day: calendar.day,
            kind,
            reasonId,
            reputation: { before, after },
          },
        },
      },
      { kind: "tavern.service_history.append" },
    ),
  );
}

function policyForCandidateV1(
  candidate: PocTransactionCandidateV1,
  data: DeepReadonly<PocSimulationDataV1>,
) {
  const policyId = candidate.calendarReadPort().lifePolicyId;
  const policy = data.balance.lifePolicies.find(({ policyId: id }) => id === policyId);
  if (policy === undefined) {
    faultV1(
      engineInvariantFaultV1(
        "story.reference_missing",
        new TypeError(`missing selected Policy ${String(policyId)}`),
      ),
    );
  }
  return policy;
}

function applyNightRecoveryV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
): void {
  const policy = policyForCandidateV1(candidate, candidate.data());
  requireAppliedV1(
    candidate.applyActors(
      {
        kind: "actors.adjust_stamina",
        actorId: "actor.player",
        application: "recovery",
        components: recoveryComponentsV1(
          candidate,
          modules,
          "actor.player",
          policy.playerNightRecovery,
          commandReasonV1("calendar.advance_phase", policy.nightRecoveryReasonId),
          "calendar.advance_phase",
        ),
      },
      noDependenciesV1,
    ),
  );
  requireAppliedV1(
    candidate.applyActors(
      {
        kind: "actors.adjust_stamina",
        actorId: "actor.heroine",
        application: "recovery",
        components: recoveryComponentsV1(
          candidate,
          modules,
          "actor.heroine",
          candidate.data().balance.heroineNightRecovery,
          commandReasonV1(
            "calendar.advance_phase",
            candidate.data().balance.heroineNightRecoveryReasonId,
          ),
          "calendar.advance_phase",
        ),
      },
      noDependenciesV1,
    ),
  );
}

function advanceCalendarV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
): void {
  const before = candidate.calendarReadPort();
  if (
    before.day === program.data.balance.levyDue.day &&
    before.phase === program.data.balance.levyDue.phase
  ) {
    rejectV1({ code: "calendar.phase_blocked", details: { blocker: "levy_due" } });
  }
  const workflow = selectedReadPortsV1(candidate, modules).workflow;
  if (workflow?.kind === "opening") {
    rejectV1({ code: "calendar.phase_blocked", details: { blocker: "opening" } });
  }
  if (workflow?.kind === "world_action" && workflow.progress !== "awaiting_completion_phase") {
    rejectV1({ code: "calendar.phase_blocked", details: { blocker: "world_action" } });
  }
  guardActionV1(candidate, "calendar.advance_phase");

  const to =
    before.phase === "morning"
      ? { day: before.day, phase: "afternoon" as const }
      : before.phase === "afternoon"
        ? { day: before.day, phase: "evening" as const }
        : { day: parseDayIndex(before.day + 1), phase: "morning" as const };
  if (workflow?.kind === "world_action") {
    const action = program.data.content.worldActions.find(
      ({ actionId }) => actionId === workflow.actionId,
    );
    if (action === undefined) {
      faultV1(
        engineInvariantFaultV1(
          "story.reference_missing",
          new TypeError(`missing WorldAction ${workflow.actionId}`),
        ),
      );
    }
    const begin = action.steps[0];
    const completion = action.steps[1];
    if (begin === undefined || completion === undefined) {
      faultV1(
        engineInvariantFaultV1(
          "story.reference_missing",
          new TypeError(`WorldAction ${workflow.actionId} does not have two steps`),
        ),
      );
    }
    if (
      begin.stepId !== workflow.beginStepId ||
      completion.stepId !== workflow.completionStepId ||
      begin.phase !== workflow.startedPhase
    ) {
      faultV1(
        engineInvariantFaultV1(
          "workflow.conflict",
          new TypeError("WorldAction session does not match its authored steps"),
        ),
      );
    }
    if (completion.phase !== to.phase) {
      rejectV1({ code: "calendar.phase_blocked", details: { blocker: "world_action" } });
    }
  }

  let eveningResolvedByCommand = false;
  const isServiceDay = program.data.balance.serviceDays.includes(before.day);
  const plan = selectedReadPortsV1(candidate, modules).tavern.servicePlan;
  if (before.phase === "afternoon" && to.phase === "evening") {
    if (!isServiceDay) {
      eveningResolvedByCommand = true;
    } else if (plan?.mode === "closed") {
      appendClosureV1(candidate, modules, "planned");
      eveningResolvedByCommand = true;
    } else if (plan === null) {
      appendClosureV1(candidate, modules, "emergency");
      eveningResolvedByCommand = true;
    }
  }
  if (before.phase === "evening" && !before.eveningResolved) {
    if (workflow !== null) {
      rejectV1({
        code: "calendar.phase_blocked",
        details: { blocker: "world_action" },
      });
    }
    appendClosureV1(candidate, modules, "emergency");
    requireAppliedV1(
      candidate.applyCalendar(
        { kind: "calendar.evening.resolve" },
        calendarDependenciesV1(calendarPolicyApV1(candidate, program.data)),
      ),
    );
  }

  const expiredAuraIds: AuraInstanceId[] = [];
  if (before.phase === "evening") {
    const spoilReason = commandReasonV1(
      "calendar.advance_phase",
      program.data.balance.ledgerReasons.spoiledIngredient,
    );
    requireAppliedV1(
      candidate.applyInventory(
        { kind: "inventory.spoil", day: before.day, reason: spoilReason },
        {
          kind: "inventory.spoil",
          commandSequence: candidate.nextCommandSequence(),
          nextLedgerEntryIndex: candidate.nextLedgerEntryIndex(),
          spoiledIngredientReasonId: program.data.balance.ledgerReasons.spoiledIngredient,
          ingredients: inventoryIngredientsV1(program.data),
        },
      ),
    );
    expiredAuraIds.push(...countdownAurasV1(candidate, modules, "phase_end"));
    expiredAuraIds.push(...countdownAurasV1(candidate, modules, "day_end"));
    applyNightRecoveryV1(candidate, modules);
    expiredAuraIds.push(...countdownAurasV1(candidate, modules, "night_recovery"));
  } else {
    expiredAuraIds.push(...countdownAurasV1(candidate, modules, "phase_end"));
  }

  const policy = policyForCandidateV1(candidate, program.data);
  requireAppliedV1(
    candidate.applyCalendar(
      {
        kind: "calendar.phase.advance",
        to,
        expiredAuraIds,
        terminalLocked: false,
      },
      calendarDependenciesV1(policy.apByPhase[to.phase]),
    ),
  );
  if (before.phase === "evening") {
    requireAppliedV1(
      candidate.applyTavern(
        { kind: "tavern.preparation.reset", day: to.day },
        { kind: "tavern.preparation.reset" },
      ),
    );
  }
  if (to.phase === "evening" && eveningResolvedByCommand) {
    requireAppliedV1(
      candidate.applyCalendar(
        { kind: "calendar.evening.resolve" },
        calendarDependenciesV1(policy.apByPhase[to.phase]),
      ),
    );
  }
  if (before.phase === "evening") {
    const demand = materializeDemandV1(candidate, modules, program, to.day);
    const current = selectedReadPortsV1(candidate, modules).tavern.currentDemand;
    if (demand !== null || current !== null) {
      requireAppliedV1(
        candidate.applyTavern(
          { kind: "tavern.current_demand.set", currentDemand: demand },
          { kind: "tavern.current_demand.set" },
        ),
      );
    }
  }

  const blockingRequests: PocBlockingNarrativeRequestV1[] = [];
  let handlerRequest: PocBlockingNarrativeRequestV1 | null = null;
  if (workflow?.kind === "world_action") {
    const action = program.data.content.worldActions.find(
      ({ actionId }) => actionId === workflow.actionId,
    );
    const completion = action?.steps[1];
    if (completion === undefined) {
      faultV1(
        engineInvariantFaultV1(
          "story.reference_missing",
          new TypeError(`missing WorldAction ${workflow.actionId}`),
        ),
      );
    }
    requireAppliedV1(
      candidate.applyWorkflow(
        { kind: "workflow.enter_world_action_completion_scene" },
        { kind: "workflow.enter_world_action_completion_scene" },
      ),
    );
    handlerRequest = {
      source: { kind: "world_action", actionId: workflow.actionId },
      sceneId: completion.sceneId,
    };
  }
  applyCommandSchedulerV1(candidate, "calendar.advance_phase", scheduler, blockingRequests);
  if (before.phase === "evening") {
    applySchedulerContextV1(
      candidate,
      { kind: "day.ended", day: before.day },
      scheduler,
      blockingRequests,
    );
    if (Number(before.day) === Number(program.data.manifest.playableDays)) {
      applySchedulerContextV1(candidate, { kind: "week.ended" }, scheduler, blockingRequests);
    }
  }
  applySchedulerContextV1(
    candidate,
    { kind: "phase.entered", day: to.day, phase: to.phase },
    scheduler,
    blockingRequests,
  );
  settleBlockingNarrativesV1(
    candidate,
    modules,
    program,
    scheduler,
    blockingRequests,
    "calendar.advance_phase",
    handlerRequest,
  );
}

function notImplementedFaultV1(commandKind: PocGameCommandV1["kind"]): PocEngineFaultV1 {
  return deepFreezePocValueV1({
    category: "command_handler",
    code: "command.handler_not_implemented",
    ruleSlot: null,
    message: `Command handler is not implemented yet: ${commandKind}`,
  });
}

function guardLifecycleV1(snapshot: PocGameSnapshotV1, command: PocGameCommandV1): void {
  const { run, activeWorkflow, tavern, calendar } = snapshot.state.simulation;
  const narrative = snapshot.state.story.narrative;
  if (command.kind === "run.start") {
    if (
      snapshot.commandSequence > 0 ||
      tavern.demandSeeds.length > 0 ||
      narrative.status !== "idle"
    ) {
      if (snapshot.commandSequence <= 0) {
        faultV1(
          engineInvariantFaultV1(
            "terminal_state.invalid",
            new TypeError("pre-start Snapshot has materialized lifecycle state"),
          ),
        );
      }
      rejectV1({
        code: "run.already_started",
        details: { commandSequence: parsePositiveSafeInteger(snapshot.commandSequence) },
      });
    }
    return;
  }
  if (snapshot.commandSequence === 0 || tavern.demandSeeds.length === 0) {
    rejectV1({
      code: "run.not_started",
      details: { commandKind: command.kind },
    });
  }
  if (run.status !== "setup" && run.status !== "active") {
    rejectV1({
      code: "run.invalid_status",
      details: { actual: run.status, allowed: ["setup", "active"] },
    });
  }
  if (narrative.status === "active") {
    if (command.kind === "narrative.advance" || command.kind === "narrative.choose") return;
    if (narrative.cursor === null) {
      faultV1(
        engineInvariantFaultV1(
          "narrative.invalid_cursor",
          new TypeError("active Narrative has no cursor"),
        ),
      );
    }
    rejectV1({
      code: "command.blocked_by_narrative",
      details: { commandKind: command.kind, cursor: narrative.cursor },
    });
  }
  if (calendar.lifePolicyId === null && command.kind !== "policy.choose") {
    rejectV1({ code: "run.policy_required", details: { commandKind: command.kind } });
  }
  if (activeWorkflow === null) return;
  if (activeWorkflow.kind === "opening") {
    if (
      command.kind === "tavern.opening.continue" ||
      command.kind === "tavern.opening.finalize" ||
      command.kind === "calendar.advance_phase"
    ) {
      return;
    }
    rejectV1({
      code: "command.blocked_by_workflow",
      details: {
        commandKind: command.kind,
        blocker: { kind: "opening", checkpoint: activeWorkflow.checkpoint },
      },
    });
  }
  const allowed =
    (activeWorkflow.progress === "awaiting_completion_phase" &&
      command.kind === "calendar.advance_phase") ||
    (activeWorkflow.progress === "ready_to_complete" && command.kind === "world.action.complete");
  if (!allowed) {
    rejectV1({
      code: "command.blocked_by_workflow",
      details: {
        commandKind: command.kind,
        blocker: { kind: "world_action", progress: activeWorkflow.progress },
      },
    });
  }
}

function assertCoreAggregateV1(
  candidate: PocTransactionCandidateV1,
  command: PocGameCommandV1,
): void {
  const snapshot = candidate.snapshot();
  const { run, calendar, tavern, activeWorkflow } = snapshot.state.simulation;
  const data = candidate.data();
  const setupRelation = run.status === "setup" && calendar.lifePolicyId === null;
  const activeRelation = run.status === "active" && calendar.lifePolicyId !== null;
  if (
    !setupRelation &&
    !activeRelation &&
    run.status !== "completed_stable" &&
    run.status !== "completed_danger" &&
    run.status !== "failed_arrears"
  ) {
    faultV1(
      engineInvariantFaultV1(
        "terminal_state.invalid",
        new TypeError("Run status and selected Policy diverged"),
      ),
    );
  }
  const expectedDays = data.balance.serviceDays;
  const expectedSegments = data.content.customerSegments.map(({ segmentId }) => segmentId);
  if (tavern.preparation.day !== calendar.day) {
    faultV1(
      engineInvariantFaultV1(
        "terminal_state.invalid",
        new TypeError("Tavern preparation day does not match Calendar day"),
      ),
    );
  }
  const historyDays = tavern.serviceHistory.map((entry) =>
    entry.kind === "opening" ? entry.opening.day : entry.closure.day,
  );
  const historyOrderValid = historyDays.every(
    (day, index) => index === 0 || Number(historyDays[index - 1]) < Number(day),
  );
  const historyCoverageValid =
    historyOrderValid &&
    historyDays.every((day) => expectedDays.includes(day)) &&
    expectedDays.every((day) => {
      const count = historyDays.filter((historyDay) => historyDay === day).length;
      const resolved =
        Number(day) < Number(calendar.day) || (day === calendar.day && calendar.eveningResolved);
      return count === (resolved ? 1 : 0);
    }) &&
    (expectedDays.includes(calendar.day) ||
      calendar.eveningResolved === (calendar.phase === "evening"));
  if (!historyCoverageValid) {
    faultV1(
      engineInvariantFaultV1(
        "terminal_state.invalid",
        new TypeError("Service history does not match resolved service days"),
      ),
    );
  }
  const seedsValid =
    tavern.demandSeeds.length === expectedDays.length &&
    expectedDays.every((day) => {
      const entry = tavern.demandSeeds.find((seed) => seed.day === day);
      return (
        entry !== undefined &&
        entry.segments.length === expectedSegments.length &&
        expectedSegments.every((segmentId) =>
          entry.segments.some((segment) => segment.segmentId === segmentId),
        )
      );
    });
  if (!seedsValid) {
    faultV1(
      engineInvariantFaultV1(
        "terminal_state.invalid",
        new TypeError("Demand seeds are incomplete"),
      ),
    );
  }
  const serviceDay = expectedDays.includes(calendar.day);
  if (
    serviceDay !== (tavern.currentDemand !== null) ||
    (tavern.currentDemand !== null && tavern.currentDemand.day !== calendar.day)
  ) {
    faultV1(
      engineInvariantFaultV1(
        "terminal_state.invalid",
        new TypeError("currentDemand does not match the current service day"),
      ),
    );
  }
  if (Number(calendar.day) > Number(data.manifest.playableDays)) {
    faultV1(
      engineInvariantFaultV1(
        "calendar.invalid",
        new TypeError("Calendar day exceeds the Story manifest"),
      ),
    );
  }
  if (
    command.kind === "run.start" &&
    snapshot.state.story.narrative.source?.kind !== "manifest_start"
  ) {
    faultV1(
      engineInvariantFaultV1(
        "narrative.invalid_cursor",
        new TypeError("run.start did not establish manifest Narrative"),
      ),
    );
  }
  if (
    activeWorkflow?.kind === "opening" &&
    activeWorkflow.blockingEvent !== null &&
    (snapshot.state.story.narrative.status !== "active" ||
      snapshot.state.story.narrative.source?.kind !== "event" ||
      snapshot.state.story.narrative.source.eventId !== activeWorkflow.blockingEvent.eventId)
  ) {
    faultV1(
      engineInvariantFaultV1(
        "workflow.conflict",
        new TypeError("Opening blocking Event and Narrative diverged"),
      ),
    );
  }
}

function dispatchCoreCommandV1(
  candidate: PocTransactionCandidateV1,
  command: PocGameCommandV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  modules: PocGameplayModuleTupleV1,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
): void {
  guardLifecycleV1(candidate.snapshot(), command);
  switch (command.kind) {
    case "run.start":
      runStartV1(candidate, modules, program, scheduler);
      return;
    case "policy.choose":
      choosePolicyV1(candidate, modules, program, scheduler, command);
      return;
    case "inventory.buy":
      buyInventoryV1(candidate, modules, program, scheduler, command);
      return;
    case "actor.prepare_food":
      prepareFoodV1(candidate, modules, program, scheduler);
      return;
    case "actor.rest":
      restActorV1(candidate, modules, program, scheduler);
      return;
    case "story.action.start":
      storyActionV1(candidate, modules, program, scheduler, command);
      return;
    case "facility.choose":
      chooseFacilityV1(candidate, modules, program, scheduler, command);
      return;
    case "tavern.plan.set":
      setTavernPlanV1(candidate, modules, program, scheduler, command);
      return;
    case "narrative.advance":
      advanceNarrativeV1(candidate, modules, program, scheduler);
      return;
    case "narrative.choose":
      chooseNarrativeV1(candidate, modules, program, scheduler, command);
      return;
    case "calendar.advance_phase":
      advanceCalendarV1(candidate, modules, program, scheduler);
      return;
    case "tavern.opening.start":
    case "tavern.opening.continue":
    case "tavern.opening.finalize":
    case "world.action.begin":
    case "world.action.complete":
    case "levy.pay":
      return faultV1(notImplementedFaultV1(command.kind));
  }
  const exhaustive: never = command;
  throw new TypeError(`unsupported command ${String(exhaustive)}`);
}

function executePocCommandAttemptV1(
  snapshot: PocGameSnapshotV1,
  command: PocGameCommandV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  modules: PocGameplayModuleTupleV1,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
): PocCommandExecutionAttemptV1 {
  let candidate: PocTransactionCandidateV1;
  try {
    candidate = createPocTransactionCandidateV1(snapshot, program, modules);
  } catch (error) {
    const rng = createTransactionalRngV1(snapshot.rng);
    return faultedAttemptV1(snapshot, rng, engineInvariantFaultV1("snapshot.schema", error));
  }
  const attemptRng: RuleRngV1 = candidate.rng();
  try {
    dispatchCoreCommandV1(candidate, command, program, modules, scheduler);
    assertCoreAggregateV1(candidate, command);
    const facts = candidate.gameplayFacts();
    const committed = commitPocCandidateV1(candidate);
    return committedAttemptV1(snapshot, committed, attemptRng, facts);
  } catch (error) {
    if (error instanceof PocRejectedCommandV1) {
      return rejectedAttemptV1(snapshot, attemptRng, [error.rejection]);
    }
    if (error instanceof PocFaultedCommandV1) {
      return faultedAttemptV1(snapshot, attemptRng, error.fault);
    }
    return faultedAttemptV1(snapshot, attemptRng, commandHandlerFaultV1(error));
  }
}

export function createPocGameCommandExecutorV1(
  program: DeepReadonly<PocSimulationProgramV1>,
  modules: PocGameplayModuleTupleV1,
): PocGameCommandExecutorV1 {
  const scheduler = createPocSchedulingResolverV1(program.data);
  return Object.freeze({
    executeAttempt(
      snapshot: DeepReadonly<PocGameSnapshotV1>,
      command: DeepReadonly<PocGameCommandV1>,
      context: undefined,
    ): PocCommandExecutionAttemptV1 {
      if (context !== undefined) throw new TypeError("PoC execution context must be undefined");
      const parsed = pocGameCommandSchemaV1.parse(command);
      return executePocCommandAttemptV1(
        snapshot as PocGameSnapshotV1,
        parsed,
        program,
        modules,
        scheduler,
      );
    },
  });
}
