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
  ChangeReasonV1,
  CheckInputV1,
  CheckResultV1,
  DemandDayStateV1,
  DemandProjectionInputV1,
  EndingInputV1,
  FacilityDefinitionV1,
  IngredientQuantityV1,
  LedgerEntryDraftV1,
  LedgerEntryV1,
  LevyResolutionV1,
  MaterializedDemandDayV1,
  ModifierV1,
  NarrativeCursorV1,
  NarrativeRuntimeStateV1,
  NarrativeSourceV1,
  OpeningBaselineV1,
  OpeningLedgerV1,
  OpeningSessionV1,
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
  ServiceModeDefinitionV1,
  StoryRuleSlotV1,
  TavernPlanV1,
  TavernPreviewV1,
  WorldActionDefinitionV1,
  WorldActionSessionV1,
} from "./contracts/types.js";
import type {
  ActionId,
  AuraId,
  AuraInstanceId,
  IngredientId,
  LedgerEntryId,
  OpenServiceMode,
  ReasonId,
  RecipeId,
} from "./contracts/ids.js";
import {
  deepFreezePocValueV1,
  parseAttributeBonus,
  parseDayIndex,
  parseMoney,
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
  collectPocStateModifiersV1,
  evaluatePocActionPresentationRejectionV1,
  evaluatePocGameCommandV1,
  evaluatePocLifecycleRejectionV1,
  previewPocTavernPlanV1,
  resolvePocActionPresentationV1,
} from "./game-command-evaluation.js";
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

function safeIntegerFromBigIntV1(
  value: bigint,
  label: string,
): ReturnType<typeof parseSafeInteger> {
  if (value < BigInt(Number.MIN_SAFE_INTEGER) || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new TypeError(`${label} exceeds safe integer bounds`);
  }
  return parseSafeInteger(Number(value));
}

function nonNegativeSafeIntegerFromBigIntV1(
  value: bigint,
  label: string,
): ReturnType<typeof parseNonNegativeSafeInteger> {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new TypeError(`${label} exceeds non-negative safe integer bounds`);
  }
  return parseNonNegativeSafeInteger(Number(value));
}

function quantityFromBigIntV1(value: bigint, label: string): ReturnType<typeof parseQuantity> {
  if (value <= 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new TypeError(`${label} exceeds Quantity bounds`);
  }
  return parseQuantity(Number(value));
}

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

export function collectPocModifiersV1(
  candidate: PocTransactionCandidateV1,
  _modules: PocGameplayModuleTupleV1,
): readonly ModifierV1[] {
  return collectPocStateModifiersV1(candidate.snapshot().state, candidate.data());
}

function inventoryIngredientsV1(
  data: DeepReadonly<PocSimulationDataV1>,
): readonly PocInventoryIngredientPortV1[] {
  return deepFreezePocValueV1(
    data.content.ingredients
      .map(({ ingredientId, unitPrice, shelfLifeDays, refrigeratable }) => ({
        ingredientId,
        unitPrice,
        shelfLifeDays,
        refrigeratable,
      }))
      .toSorted(({ ingredientId: left }, { ingredientId: right }) =>
        left < right ? -1 : left > right ? 1 : 0,
      ),
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
  return resolvePocActionPresentationV1(candidate.data(), commandKind, actionId);
}

function guardActionV1(
  candidate: PocTransactionCandidateV1,
  commandKind: PocGameCommandV1["kind"],
  actionId?: ActionId,
): ActionPresentationDefinitionV1 {
  const action = actionPresentationV1(candidate, commandKind, actionId);
  const rejection = evaluatePocActionPresentationRejectionV1(
    candidate.snapshot().state,
    candidate.data(),
    action,
  );
  if (rejection !== null) rejectV1(rejection);
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
  if (before.kind !== "world_action") return;
  if (source.kind !== "world_action" || source.actionId !== before.actionId) {
    faultV1(
      engineInvariantFaultV1(
        "workflow.conflict",
        new TypeError("WorldAction Narrative source does not match its active session"),
      ),
    );
  }
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
        if (source.kind === "world_action") {
          const workflow = candidate.workflowReadPort();
          if (workflow?.kind !== "world_action" || workflow.actionId !== source.actionId) {
            faultV1(
              engineInvariantFaultV1(
                "workflow.conflict",
                new TypeError("WorldAction Narrative choice has no matching active session"),
              ),
            );
          }
          requireAppliedV1(
            candidate.applyWorkflow(
              {
                kind: "workflow.record_world_action_choice",
                choiceId: request.choice.choiceId,
              },
              {
                kind: "workflow.record_world_action_choice",
                committedAtSequence: candidate.nextCommandSequence(),
              },
            ),
          );
        }
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

export function previewPocTavernPlanForCandidateV1(
  candidate: PocTransactionCandidateV1,
  _modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  plan: DeepReadonly<TavernPlanV1>,
): TavernPreviewV1 {
  return previewPocTavernPlanV1(candidate.snapshot().state, program, plan, invokeRuleV1);
}

function openingModeForPlanV1(
  data: DeepReadonly<PocSimulationDataV1>,
  plan: DeepReadonly<TavernPlanV1>,
): DeepReadonly<ServiceModeDefinitionV1> & { readonly mode: OpenServiceMode } {
  const mode = data.balance.serviceModes.find(({ mode: value }) => value === plan.mode);
  if (mode === undefined || mode.mode === "closed") {
    faultV1(
      engineInvariantFaultV1(
        "story.reference_missing",
        new TypeError(`missing open ServiceMode ${plan.mode}`),
      ),
    );
  }
  return mode as DeepReadonly<ServiceModeDefinitionV1> & { readonly mode: OpenServiceMode };
}

function requiredOpeningIngredientsV1(
  data: DeepReadonly<PocSimulationDataV1>,
  plan: DeepReadonly<TavernPlanV1>,
): readonly IngredientQuantityV1[] {
  const totals = new Map<IngredientId, bigint>();
  for (const planned of plan.menu) {
    const recipe = data.content.recipes.find(({ recipeId }) => recipeId === planned.recipeId);
    if (recipe === undefined) {
      faultV1(
        engineInvariantFaultV1(
          "story.reference_missing",
          new TypeError(`missing Recipe ${planned.recipeId}`),
        ),
      );
    }
    for (const ingredient of recipe.ingredients) {
      totals.set(
        ingredient.ingredientId,
        (totals.get(ingredient.ingredientId) ?? 0n) +
          BigInt(ingredient.quantity) * BigInt(planned.portions),
      );
    }
  }
  return deepFreezePocValueV1(
    [...totals]
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([ingredientId, quantity]) => ({
        ingredientId,
        quantity: quantityFromBigIntV1(quantity, `Opening ingredient ${ingredientId}`),
      })),
  );
}

function openingBaselineModifiersV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  mode: Exclude<TavernPlanV1["mode"], "closed">,
): readonly ModifierV1[] {
  return deepFreezePocValueV1(
    collectPocModifiersV1(candidate, modules).filter((modifier) => {
      if (modifier.kind === "teamwork_gain.block") return true;
      if (
        modifier.kind === "capacity.add" ||
        modifier.kind === "prep_points.add" ||
        modifier.kind === "service_cost.add"
      ) {
        return modifier.modes.includes(mode);
      }
      return false;
    }),
  );
}

function appendDirectLedgerEntriesV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  entries: readonly LedgerEntryDraftV1[],
  reason: ChangeReasonV1,
): readonly LedgerEntryV1[] {
  if (entries.length === 0) return Object.freeze([]);
  const beforeLength = selectedReadPortsV1(candidate, modules).inventory.ledger.length;
  requireAppliedV1(
    candidate.applyInventory(
      { kind: "inventory.ledger.append", entries },
      {
        kind: "inventory.ledger.append",
        commandSequence: candidate.nextCommandSequence(),
        nextLedgerEntryIndex: candidate.nextLedgerEntryIndex(),
        ledgerReasons: candidate.data().balance.ledgerReasons,
        context: { kind: "effect_or_direct", reason },
      },
    ),
  );
  const materialized = selectedReadPortsV1(candidate, modules).inventory.ledger.slice(beforeLength);
  if (materialized.length !== entries.length) {
    faultV1(
      engineInvariantFaultV1(
        "ledger.unbalanced",
        new TypeError("Inventory materialized an unexpected direct-ledger line count"),
      ),
    );
  }
  return deepFreezePocValueV1(materialized);
}

function openingContextForCheckpointV1(
  session: DeepReadonly<OpeningSessionV1>,
): SchedulerContextV1 | null {
  if (session.checkpoint === "ready_to_finalize") return null;
  return deepFreezePocValueV1({
    kind:
      session.checkpoint === "started"
        ? "opening.started"
        : session.checkpoint === "middle"
          ? "opening.middle"
          : "opening.before_finalize",
    sessionId: session.sessionId,
  });
}

function worldActionSessionDefinitionV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  session: DeepReadonly<WorldActionSessionV1>,
): {
  readonly action: DeepReadonly<WorldActionDefinitionV1>;
  readonly option: DeepReadonly<WorldActionDefinitionV1["options"][number]>;
  readonly begin: DeepReadonly<WorldActionDefinitionV1["steps"][0]>;
  readonly completion: DeepReadonly<WorldActionDefinitionV1["steps"][1]>;
} {
  const action = candidate
    .data()
    .content.worldActions.find(({ actionId }) => actionId === session.actionId);
  if (action === undefined) {
    faultV1(
      engineInvariantFaultV1(
        "story.reference_missing",
        new TypeError(`missing WorldAction ${session.actionId}`),
      ),
    );
  }
  const option = action.options.find(({ optionId }) => optionId === session.optionId);
  const begin = action.steps[0];
  const completion = action.steps[1];
  if (option === undefined || begin === undefined || completion === undefined) {
    faultV1(
      engineInvariantFaultV1(
        "workflow.conflict",
        new TypeError("WorldAction session references a missing authored member"),
      ),
    );
  }
  const expectedCashCost = parseMoney(
    safeIntegerFromBigIntV1(
      BigInt(action.baseCashCost) + BigInt(option.additionalCashCost),
      `WorldAction ${action.actionId} cash cost`,
    ),
  );
  const inventory = selectedReadPortsV1(candidate, modules).inventory;
  const paidEntries = session.paidCostEntryIds.map((entryId) =>
    inventory.ledger.find((candidateEntry) => candidateEntry.entryId === entryId),
  );
  const paidEntriesValid =
    paidEntries.length === (expectedCashCost === 0 ? 0 : 1) &&
    paidEntries.every(
      (entry) =>
        entry?.category === "world_action" &&
        entry.reasonId === candidate.data().balance.ledgerReasons.worldActionCost &&
        entry.cashDelta === 0 - Number(expectedCashCost) &&
        entry.valuationDelta === 0 &&
        entry.quantity === undefined &&
        entry.subject.kind === "action" &&
        entry.subject.actionId === session.actionId,
    );
  if (
    begin.stepId !== session.beginStepId ||
    completion.stepId !== session.completionStepId ||
    begin.phase !== session.startedPhase ||
    session.startedDay !== candidate.calendarReadPort().day ||
    option.preparationBonus !== session.preparationBonus ||
    !paidEntriesValid
  ) {
    faultV1(
      engineInvariantFaultV1(
        "workflow.conflict",
        new TypeError("WorldAction session does not match its authored definition"),
      ),
    );
  }
  return { action, option, begin, completion };
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
    const { completion } = worldActionSessionDefinitionV1(candidate, modules, workflow);
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
    const { completion } = worldActionSessionDefinitionV1(candidate, modules, workflow);
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

function openingSessionV1(candidate: PocTransactionCandidateV1): OpeningSessionV1 {
  const workflow = candidate.workflowReadPort();
  if (workflow === null || workflow.kind !== "opening") {
    faultV1(
      engineInvariantFaultV1(
        "workflow.conflict",
        new TypeError("Opening checkpoint processing lost its active session"),
      ),
    );
  }
  return workflow;
}

function rejectOpeningResourceShortageV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  preview: DeepReadonly<TavernPreviewV1>,
  requiredIngredients: readonly DeepReadonly<IngredientQuantityV1>[],
): void {
  const ports = selectedReadPortsV1(candidate, modules);
  if (ports.calendar.apRemaining < preview.openingCosts.ap) {
    rejectV1({
      code: "calendar.insufficient_ap",
      details: { required: preview.openingCosts.ap, available: ports.calendar.apRemaining },
    });
  }
  if (ports.actors.player.stamina.current < preview.openingCosts.playerStamina) {
    rejectV1({
      code: "actor.insufficient_stamina",
      details: {
        actorId: ports.actors.player.actorId,
        required: preview.openingCosts.playerStamina,
        available: ports.actors.player.stamina.current,
      },
    });
  }
  if (ports.actors.heroine.stamina.current < preview.openingCosts.heroineStamina) {
    rejectV1({
      code: "actor.insufficient_stamina",
      details: {
        actorId: ports.actors.heroine.actorId,
        required: preview.openingCosts.heroineStamina,
        available: ports.actors.heroine.stamina.current,
      },
    });
  }
  if (ports.inventory.cash < preview.openingCosts.cash.total) {
    rejectV1({
      code: "inventory.insufficient_cash",
      details: { required: preview.openingCosts.cash.total, available: ports.inventory.cash },
    });
  }
  for (const required of requiredIngredients) {
    const available = ports.inventory.ingredientBatches
      .filter(({ ingredientId }) => ingredientId === required.ingredientId)
      .reduce((sum, { quantity }) => sum + quantity, 0);
    if (available < required.quantity) {
      rejectV1({
        code: "inventory.insufficient_ingredient",
        details: {
          ingredientId: required.ingredientId,
          required: required.quantity,
          available: parseNonNegativeSafeInteger(available),
        },
      });
    }
  }
  if (!preview.allowed) {
    faultV1(
      storyRuleFaultV1(
        "tavern.preview",
        new TypeError("Tavern preview rejected without a matching resource shortage"),
        "rule.output_invalid",
      ),
    );
  }
}

function payOpeningCostsV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  preview: DeepReadonly<TavernPreviewV1>,
  mode: ReturnType<typeof openingModeForPlanV1>,
): readonly LedgerEntryId[] {
  const modeReason = commandReasonV1("tavern.opening.start", mode.reasonId);
  if (preview.openingCosts.ap > 0) {
    requireAppliedV1(
      candidate.applyCalendar(
        {
          kind: "calendar.ap.adjust",
          delta: parseSafeInteger(-Number(preview.openingCosts.ap)),
          reason: modeReason,
        },
        calendarDependenciesV1(calendarPolicyApV1(candidate, candidate.data())),
      ),
    );
  }
  for (const [actorId, amount] of [
    ["actor.player", preview.openingCosts.playerStamina],
    ["actor.heroine", preview.openingCosts.heroineStamina],
  ] as const) {
    if (amount === 0) continue;
    requireAppliedV1(
      candidate.applyActors(
        {
          kind: "actors.adjust_stamina",
          actorId,
          application: "debit",
          components: [{ requestedDelta: parseSafeInteger(-Number(amount)), reason: modeReason }],
        },
        noDependenciesV1,
      ),
    );
  }

  const total = Number(preview.openingCosts.cash.total);
  const wageCharge = Math.min(Number(preview.openingCosts.cash.wage), total);
  const openingFeeCharge = total - wageCharge;
  const entries: LedgerEntryId[] = [];
  const wage = appendDirectLedgerEntriesV1(
    candidate,
    modules,
    [
      {
        category: "wage",
        reasonId: candidate.data().balance.ledgerReasons.serviceWage,
        cashDelta: parseSafeInteger(wageCharge === 0 ? 0 : -wageCharge),
        valuationDelta: parseSafeInteger(0),
        subject: { kind: "service_mode", mode: mode.mode },
      },
    ],
    commandReasonV1("tavern.opening.start", candidate.data().balance.ledgerReasons.serviceWage),
  );
  entries.push(...wage.map(({ entryId }) => entryId));
  const openingFee = appendDirectLedgerEntriesV1(
    candidate,
    modules,
    [
      {
        category: "opening_fee",
        reasonId: candidate.data().balance.ledgerReasons.openingFee,
        cashDelta: parseSafeInteger(openingFeeCharge === 0 ? 0 : -openingFeeCharge),
        valuationDelta: parseSafeInteger(0),
        subject: { kind: "service_mode", mode: mode.mode },
      },
    ],
    commandReasonV1("tavern.opening.start", candidate.data().balance.ledgerReasons.openingFee),
  );
  entries.push(...openingFee.map(({ entryId }) => entryId));
  return deepFreezePocValueV1(entries);
}

function finishOpeningStartContextsV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
): void {
  const blockingRequests: PocBlockingNarrativeRequestV1[] = [];
  applyCommandSchedulerV1(candidate, "tavern.opening.start", scheduler, blockingRequests);
  while (true) {
    const session = openingSessionV1(candidate);
    const context = openingContextForCheckpointV1(session);
    if (context === null) break;
    applySchedulerContextV1(candidate, context, scheduler, blockingRequests);
    if (blockingRequests.length > 0) break;
    requireAppliedV1(
      candidate.applyWorkflow(
        { kind: "workflow.advance_opening_checkpoint" },
        { kind: "workflow.advance_opening_checkpoint" },
      ),
    );
  }
  settleBlockingNarrativesV1(
    candidate,
    modules,
    program,
    scheduler,
    blockingRequests,
    "tavern.opening.start",
    null,
  );
}

function startOpeningV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
): void {
  const ports = selectedReadPortsV1(candidate, modules);
  if (ports.calendar.phase !== "evening") {
    rejectV1({
      code: "calendar.invalid_phase",
      details: { actual: ports.calendar.phase, allowed: ["evening"] },
    });
  }
  if (ports.calendar.eveningResolved) {
    rejectV1({
      code: "tavern.evening_resolved",
      details: { day: ports.calendar.day, planMode: ports.tavern.servicePlan?.mode ?? null },
    });
  }
  if (ports.workflow?.kind === "opening") {
    rejectV1({
      code: "tavern.opening_active",
      details: { sessionId: ports.workflow.sessionId },
    });
  }
  if (ports.workflow?.kind === "world_action") {
    rejectV1({
      code: "workflow.conflict",
      details: { activeKind: "world_action", attemptedKind: "opening" },
    });
  }
  const plan = ports.tavern.servicePlan;
  if (plan === null) {
    rejectV1({ code: "tavern.opening_plan_missing", details: { day: ports.calendar.day } });
  }
  if (plan.mode === "closed") {
    rejectV1({
      code: "tavern.evening_resolved",
      details: { day: ports.calendar.day, planMode: "closed" },
    });
  }
  if (plan.menu.length > program.data.balance.menuRecipeLimit) {
    rejectV1({ code: "tavern.invalid_plan", details: { reason: "menu_size" } });
  }
  const unlocked = new Set(ports.tavern.unlockedRecipeIds);
  for (const line of plan.menu) {
    if (!program.data.content.recipes.some(({ recipeId }) => recipeId === line.recipeId)) {
      faultV1(
        engineInvariantFaultV1(
          "story.reference_missing",
          new TypeError(`Opening plan references missing Recipe ${line.recipeId}`),
        ),
      );
    }
    if (!unlocked.has(line.recipeId)) {
      rejectV1({ code: "tavern.invalid_plan", details: { reason: "locked_recipe" } });
    }
  }
  const mode = openingModeForPlanV1(program.data, plan);
  const unavailableReasonId = actionUnavailableReasonV1(mode.availability, candidate);
  if (unavailableReasonId !== null) {
    rejectV1({
      code: "tavern.service_unavailable",
      details: { mode: mode.mode, reasonId: unavailableReasonId },
    });
  }
  const currentDemand = ports.tavern.currentDemand;
  if (currentDemand?.day !== ports.calendar.day) {
    faultV1(
      engineInvariantFaultV1(
        "terminal_state.invalid",
        new TypeError("Opening plan has no materialized demand for the current day"),
      ),
    );
  }
  const requiredIngredients = requiredOpeningIngredientsV1(program.data, plan);
  const preview = previewPocTavernPlanForCandidateV1(candidate, modules, program, plan);
  rejectOpeningResourceShortageV1(candidate, modules, preview, requiredIngredients);

  const before = selectedReadPortsV1(candidate, modules);
  const baselineModifiers = openingBaselineModifiersV1(candidate, modules, mode.mode);
  const startEntryIds = payOpeningCostsV1(candidate, modules, preview, mode);
  const factCount = candidate.gameplayFacts().length;
  requireAppliedV1(
    candidate.applyInventory(
      {
        kind: "inventory.consume",
        lines: requiredIngredients,
        reason: commandReasonV1("tavern.opening.start", mode.reasonId),
      },
      { kind: "inventory.consume" },
    ),
  );
  const consumedFact = candidate
    .gameplayFacts()
    .slice(factCount)
    .find(({ kind }) => kind === "inventory.consumed");
  if (consumedFact === undefined || consumedFact.kind !== "inventory.consumed") {
    faultV1(
      engineInvariantFaultV1(
        "ledger.unbalanced",
        new TypeError("Opening ingredient debit did not materialize its consumption Fact"),
      ),
    );
  }
  const afterCosts = selectedReadPortsV1(candidate, modules);
  const baseline: OpeningBaselineV1 = deepFreezePocValueV1({
    startedAtSequence: candidate.nextCommandSequence(),
    day: before.calendar.day,
    mode: mode.mode,
    preparationActionCount: before.tavern.preparation.actionCount,
    ap: { before: before.calendar.apRemaining, after: afterCosts.calendar.apRemaining },
    playerStamina: {
      before: before.actors.player.stamina.current,
      after: afterCosts.actors.player.stamina.current,
    },
    heroineStamina: {
      before: before.actors.heroine.stamina.current,
      after: afterCosts.actors.heroine.stamina.current,
    },
    cashAtStart: { before: before.inventory.cash, after: afterCosts.inventory.cash },
    reputationBeforeStart: before.tavern.reputation,
    menu: plan.menu,
    preparedPortions: plan.menu,
    consumedIngredients: consumedFact.lines,
    demand: currentDemand.segments,
    actors: {
      playerAttributes: before.actors.player.attributes,
      heroineMood: before.actors.heroine.mood,
      relationship: before.actors.relationship,
      helper: before.tavern.helper,
    },
    facilityIds: before.facilities.built.map(({ facilityId }) => facilityId),
    modifiers: baselineModifiers,
    startEntryIds,
  });
  requireAppliedV1(
    candidate.applyWorkflow(
      { kind: "workflow.start_opening", baseline },
      { kind: "workflow.start_opening", commandSequence: candidate.nextCommandSequence() },
    ),
  );
  finishOpeningStartContextsV1(candidate, modules, program, scheduler);
}

function continueOpeningV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
): void {
  requireAppliedV1(
    candidate.applyWorkflow(
      { kind: "workflow.advance_opening_checkpoint" },
      { kind: "workflow.advance_opening_checkpoint" },
    ),
  );
  const blockingRequests: PocBlockingNarrativeRequestV1[] = [];
  applyCommandSchedulerV1(candidate, "tavern.opening.continue", scheduler, blockingRequests);
  const context = openingContextForCheckpointV1(openingSessionV1(candidate));
  if (context !== null) {
    applySchedulerContextV1(candidate, context, scheduler, blockingRequests);
  }
  settleBlockingNarrativesV1(
    candidate,
    modules,
    program,
    scheduler,
    blockingRequests,
    "tavern.opening.continue",
    null,
  );
}

function countdownApplicableOpeningAurasV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  appliedModifiers: DeepReadonly<OpeningLedgerV1["appliedModifiers"]>,
): void {
  const applicableAuraIds = new Set<AuraId>();
  for (const { modifier } of appliedModifiers) {
    if (modifier.source.kind === "aura") applicableAuraIds.add(modifier.source.auraId);
  }
  const instanceIds = selectedReadPortsV1(candidate, modules)
    .status.auras.filter(
      (aura) =>
        applicableAuraIds.has(aura.auraId) &&
        aura.duration.kind === "countdown" &&
        aura.duration.unit === "opening",
    )
    .map(({ instanceId }) => instanceId);
  requireAppliedV1(
    candidate.applyStatus(
      { kind: "status.countdown", unit: "opening", instanceIds },
      statusDependenciesV1(candidate.data()),
    ),
  );
}

function finalizeOpeningV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
): void {
  const session = candidate.workflowReadPort();
  const validationCheckpoint = candidate.checkpoint();
  requireAppliedV1(
    candidate.applyWorkflow(
      { kind: "workflow.finalize_opening" },
      { kind: "workflow.finalize_opening" },
    ),
  );
  candidate.rollback(validationCheckpoint);
  if (session === null || session.kind !== "opening") {
    faultV1(
      engineInvariantFaultV1(
        "workflow.conflict",
        new TypeError("Opening finalize validation returned without an Opening session"),
      ),
    );
  }

  const draft = invokeRuleV1("tavern.settle", () =>
    program.rules.tavern.settle({ session }, candidate.rng()),
  );
  candidate.appendGameplayFact({
    kind: "service.orders_created",
    sessionId: session.sessionId,
    orders: draft.orders,
  });
  candidate.appendGameplayFact({
    kind: "service.capacity_limited",
    sessionId: session.sessionId,
    receptionCapacity: draft.receptionCapacity,
    preparationCapacity: draft.preparationCapacity,
  });

  const salesByRecipe = new Map<RecipeId, bigint>();
  for (const order of draft.orders) {
    salesByRecipe.set(
      order.recipeId,
      (salesByRecipe.get(order.recipeId) ?? 0n) + BigInt(order.actualSales),
    );
  }
  for (const [recipeId, quantity] of [...salesByRecipe].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  )) {
    if (quantity === 0n) continue;
    const recipe = program.data.content.recipes.find(
      ({ recipeId: candidateRecipeId }) => candidateRecipeId === recipeId,
    );
    if (recipe === undefined) {
      faultV1(
        engineInvariantFaultV1(
          "story.reference_missing",
          new TypeError(`missing Opening sale Recipe ${recipeId}`),
        ),
      );
    }
    candidate.appendGameplayFact({
      kind: "service.sale",
      sessionId: session.sessionId,
      recipeId,
      quantity: quantityFromBigIntV1(quantity, `Opening sale quantity ${recipeId}`),
      revenue: nonNegativeSafeIntegerFromBigIntV1(
        quantity * BigInt(recipe.salePrice),
        `Opening sale revenue ${recipeId}`,
      ),
    });
  }

  const settlementEntries: LedgerEntryV1[] = [];
  const discardedEntries: LedgerEntryV1[] = [];
  for (const entry of draft.entries) {
    const [materialized] = appendDirectLedgerEntriesV1(
      candidate,
      modules,
      [entry],
      commandReasonV1("tavern.opening.finalize", entry.reasonId),
    );
    if (materialized === undefined) {
      faultV1(
        engineInvariantFaultV1(
          "ledger.unbalanced",
          new TypeError("Opening settlement ledger entry was not materialized"),
        ),
      );
    }
    settlementEntries.push(materialized);
    if (materialized.category === "discarded_food") discardedEntries.push(materialized);
  }
  if (draft.discardedPortions.length > 0) {
    candidate.appendGameplayFact({
      kind: "food.discarded",
      portions: draft.discardedPortions,
      entries: discardedEntries,
    });
  }

  routeEffectsV1(
    candidate,
    draft.effects,
    { kind: "command", commandKind: "tavern.opening.finalize" },
    "tavern.settle",
  );
  countdownApplicableOpeningAurasV1(candidate, modules, draft.appliedModifiers);

  const after = selectedReadPortsV1(candidate, modules);
  const ledger: OpeningLedgerV1 = deepFreezePocValueV1({
    sessionId: session.sessionId,
    day: session.baseline.day,
    mode: session.baseline.mode,
    preparationActionCount: session.baseline.preparationActionCount,
    menu: session.baseline.menu,
    orders: draft.orders,
    receptionCapacity: draft.receptionCapacity,
    preparationCapacity: draft.preparationCapacity,
    discardedPortions: draft.discardedPortions,
    entryIds: [
      ...session.baseline.startEntryIds,
      ...settlementEntries.map(({ entryId }) => entryId),
    ],
    ap: session.baseline.ap,
    playerStamina: session.baseline.playerStamina,
    heroineStamina: session.baseline.heroineStamina,
    cash: { before: session.baseline.cashAtStart.before, after: after.inventory.cash },
    reputation: {
      before: session.baseline.reputationBeforeStart,
      after: after.tavern.reputation,
    },
    teamwork: {
      before: session.baseline.actors.relationship.teamwork,
      after: after.actors.relationship.teamwork,
    },
    heroineMood: {
      before: session.baseline.actors.heroineMood,
      after: after.actors.heroine.mood,
    },
    triggeredEventIds: session.triggeredEventIds,
    appliedModifiers: draft.appliedModifiers,
  });
  requireAppliedV1(
    candidate.applyTavern(
      { kind: "tavern.service_history.append", history: { kind: "opening", opening: ledger } },
      { kind: "tavern.service_history.append" },
    ),
  );
  requireAppliedV1(
    candidate.applyWorkflow(
      { kind: "workflow.finalize_opening" },
      { kind: "workflow.finalize_opening" },
    ),
  );
  requireAppliedV1(
    candidate.applyCalendar(
      { kind: "calendar.evening.resolve" },
      calendarDependenciesV1(calendarPolicyApV1(candidate, program.data)),
    ),
  );
  finishCommandSchedulerV1(candidate, modules, program, scheduler, "tavern.opening.finalize");
}

function beginWorldActionV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
  command: Extract<PocGameCommandV1, { readonly kind: "world.action.begin" }>,
): void {
  const action = program.data.content.worldActions.find(
    ({ actionId }) => actionId === command.actionId,
  );
  if (action === undefined) {
    unknownReferenceV1(command.kind, { kind: "action", actionId: command.actionId });
  }
  const option = action.options.find(({ optionId }) => optionId === command.optionId);
  if (option === undefined) {
    unknownReferenceV1(command.kind, {
      kind: "world_option",
      actionId: command.actionId,
      optionId: command.optionId,
    });
  }
  guardActionV1(candidate, command.kind, command.actionId);
  const actionUnavailable = actionUnavailableReasonV1(action.availability, candidate);
  if (actionUnavailable !== null) {
    rejectV1({
      code: "world.action_unavailable",
      details: { actionId: action.actionId, optionId: null, reasonId: actionUnavailable },
    });
  }
  const optionUnavailable = actionUnavailableReasonV1(option.availability, candidate);
  if (optionUnavailable !== null) {
    rejectV1({
      code: "world.action_unavailable",
      details: {
        actionId: action.actionId,
        optionId: option.optionId,
        reasonId: optionUnavailable,
      },
    });
  }
  const begin = action.steps[0];
  const completion = action.steps[1];
  if (begin === undefined || completion === undefined) {
    faultV1(
      engineInvariantFaultV1(
        "story.reference_missing",
        new TypeError(`WorldAction ${action.actionId} does not have exactly two steps`),
      ),
    );
  }
  const calendar = candidate.calendarReadPort();
  if (calendar.phase !== begin.phase) {
    rejectV1({
      code: "world.action_wrong_phase",
      details: { actionId: action.actionId, expected: begin.phase, actual: calendar.phase },
    });
  }
  const actionReason = commandReasonV1(command.kind, action.reasonId);
  if (begin.apCost > 0) {
    requireAppliedV1(
      candidate.applyCalendar(
        {
          kind: "calendar.ap.adjust",
          delta: parseSafeInteger(-Number(begin.apCost)),
          reason: actionReason,
        },
        calendarDependenciesV1(calendarPolicyApV1(candidate, program.data)),
      ),
    );
  }
  if (action.playerStaminaCost > 0) {
    requireAppliedV1(
      candidate.applyActors(
        {
          kind: "actors.adjust_stamina",
          actorId: "actor.player",
          application: "debit",
          components: [
            {
              requestedDelta: parseSafeInteger(-Number(action.playerStaminaCost)),
              reason: actionReason,
            },
          ],
        },
        noDependenciesV1,
      ),
    );
  }
  const cashCost = parseMoney(
    safeIntegerFromBigIntV1(
      BigInt(action.baseCashCost) + BigInt(option.additionalCashCost),
      `WorldAction ${action.actionId} cash cost`,
    ),
  );
  const paidEntries =
    cashCost === 0
      ? Object.freeze([])
      : appendDirectLedgerEntriesV1(
          candidate,
          modules,
          [
            {
              category: "world_action",
              reasonId: program.data.balance.ledgerReasons.worldActionCost,
              cashDelta: parseSafeInteger(0 - Number(cashCost)),
              valuationDelta: parseSafeInteger(0),
              subject: { kind: "action", actionId: action.actionId },
            },
          ],
          {
            kind: "world_action",
            actionId: action.actionId,
            reasonId: program.data.balance.ledgerReasons.worldActionCost,
          },
        );
  routeEffectsV1(candidate, action.beginEffects, {
    kind: "world_action",
    actionId: action.actionId,
  });
  routeEffectsV1(candidate, option.beginEffects, {
    kind: "world_action",
    actionId: action.actionId,
  });
  requireAppliedV1(
    candidate.applyWorkflow(
      {
        kind: "workflow.begin_world_action",
        actionId: action.actionId,
        optionId: option.optionId,
      },
      {
        kind: "workflow.begin_world_action",
        beginStepId: begin.stepId,
        completionStepId: completion.stepId,
        preparationBonus: option.preparationBonus,
        startedAtSequence: candidate.nextCommandSequence(),
        startedDay: calendar.day,
        startedPhase: calendar.phase,
        paidCostEntryIds: paidEntries.map(({ entryId }) => entryId),
      },
    ),
  );
  const blockingRequests: PocBlockingNarrativeRequestV1[] = [];
  applyCommandSchedulerV1(candidate, command.kind, scheduler, blockingRequests);
  settleBlockingNarrativesV1(
    candidate,
    modules,
    program,
    scheduler,
    blockingRequests,
    command.kind,
    {
      source: { kind: "world_action", actionId: action.actionId },
      sceneId: begin.sceneId,
    },
  );
}

function completeWorldActionV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
): void {
  const session = candidate.workflowReadPort();
  const validationCheckpoint = candidate.checkpoint();
  requireAppliedV1(
    candidate.applyWorkflow(
      { kind: "workflow.complete_world_action", bandId: null },
      { kind: "workflow.complete_world_action" },
    ),
  );
  candidate.rollback(validationCheckpoint);
  if (session === null || session.kind !== "world_action") {
    faultV1(
      engineInvariantFaultV1(
        "workflow.conflict",
        new TypeError("WorldAction completion validation returned without a session"),
      ),
    );
  }
  const { action, completion } = worldActionSessionDefinitionV1(candidate, modules, session);
  const calendar = candidate.calendarReadPort();
  if (calendar.phase !== completion.phase) {
    rejectV1({
      code: "world.action_wrong_phase",
      details: {
        actionId: action.actionId,
        expected: completion.phase,
        actual: calendar.phase,
      },
    });
  }
  if (completion.apCost > 0) {
    requireAppliedV1(
      candidate.applyCalendar(
        {
          kind: "calendar.ap.adjust",
          delta: parseSafeInteger(-Number(completion.apCost)),
          reason: commandReasonV1("world.action.complete", action.reasonId),
        },
        calendarDependenciesV1(calendarPolicyApV1(candidate, program.data)),
      ),
    );
  }
  const result =
    action.checkId === null
      ? null
      : resolveNarrativeCheckV1(
          candidate,
          modules,
          program,
          {
            checkId: action.checkId,
            actorId: "actor.player",
            preparationBonus: session.preparationBonus,
          },
          { kind: "world_action", actionId: action.actionId },
        );
  requireAppliedV1(
    candidate.applyWorkflow(
      { kind: "workflow.complete_world_action", bandId: result?.bandId ?? null },
      { kind: "workflow.complete_world_action" },
    ),
  );
  finishCommandSchedulerV1(candidate, modules, program, scheduler, "world.action.complete");
}

function payLevyV1(
  candidate: PocTransactionCandidateV1,
  modules: PocGameplayModuleTupleV1,
  program: DeepReadonly<PocSimulationProgramV1>,
  scheduler: ReturnType<typeof createPocSchedulingResolverV1>,
): void {
  const calendar = candidate.calendarReadPort();
  const due = program.data.balance.levyDue;
  if (calendar.day !== due.day || calendar.phase !== due.phase) {
    rejectV1({
      code: "levy.not_due",
      details: { day: calendar.day, phase: calendar.phase },
    });
  }
  guardActionV1(candidate, "levy.pay");
  const cashBefore = selectedReadPortsV1(candidate, modules).inventory.cash;
  const levyAmount = program.data.balance.levyAmount;
  let levy: LevyResolutionV1;
  if (cashBefore >= levyAmount) {
    appendDirectLedgerEntriesV1(
      candidate,
      modules,
      [
        {
          category: "levy",
          reasonId: program.data.balance.ledgerReasons.levy,
          cashDelta: parseSafeInteger(-Number(levyAmount)),
          valuationDelta: parseSafeInteger(0),
          subject: { kind: "levy" },
        },
      ],
      commandReasonV1("levy.pay", program.data.balance.ledgerReasons.levy),
    );
    const cashAfter = selectedReadPortsV1(candidate, modules).inventory.cash;
    levy = deepFreezePocValueV1({
      kind: "paid",
      levyAmount,
      cash: { before: cashBefore, after: cashAfter },
    });
    candidate.appendGameplayFact({
      kind: "levy.paid",
      amount: levyAmount,
      cash: levy.cash,
    });
  } else {
    levy = deepFreezePocValueV1({
      kind: "arrears",
      levyAmount,
      availableCash: cashBefore,
      shortfall: parseMoney(
        safeIntegerFromBigIntV1(BigInt(levyAmount) - BigInt(cashBefore), "Levy arrears shortfall"),
      ),
    });
  }

  const ports = selectedReadPortsV1(candidate, modules);
  const endingInput: EndingInputV1 = deepFreezePocValueV1({
    cash: ports.inventory.cash,
    levy,
    reputation: ports.tavern.reputation,
    facilityIds: ports.facilities.built.map(({ facilityId }) => facilityId),
    relationship: ports.actors.relationship,
    facts: ports.progression.facts,
    quests: ports.progression.quests,
    outcomes: ports.progression.outcomes,
    auras: ports.status.auras,
  });
  const ending = invokeRuleV1("endings.evaluate", () =>
    program.rules.endings.evaluate(endingInput),
  );
  const definition = program.data.content.endings.find(
    ({ endingId }) => endingId === ending.endingId,
  );
  if (definition === undefined || definition.status !== ending.status) {
    faultV1(
      storyRuleFaultV1(
        "endings.evaluate",
        new TypeError("Ending result does not match its authored terminal definition"),
        "rule.output_invalid",
      ),
    );
  }
  routeEffectsV1(
    candidate,
    ending.effects,
    { kind: "ending", endingId: ending.endingId },
    "endings.evaluate",
  );
  requireAppliedV1(
    candidate.applyRun(
      {
        kind: "run.complete",
        completion: {
          endingId: ending.endingId,
          status: ending.status,
          levy,
          reasonIds: ending.reasonIds,
          summary: ending.summary,
          completedAtSequence: candidate.nextCommandSequence(),
        },
      },
      noDependenciesV1,
    ),
  );
  const blockingRequests: PocBlockingNarrativeRequestV1[] = [];
  applyCommandSchedulerV1(candidate, "levy.pay", scheduler, blockingRequests);
  applySchedulerContextV1(candidate, { kind: "week.ended" }, scheduler, blockingRequests);
  settleBlockingNarrativesV1(
    candidate,
    modules,
    program,
    scheduler,
    blockingRequests,
    "levy.pay",
    null,
  );
}

function guardLifecycleV1(snapshot: PocGameSnapshotV1, command: PocGameCommandV1): void {
  const rejection = evaluatePocLifecycleRejectionV1(snapshot.state, command);
  const stateLooksStarted =
    snapshot.state.simulation.tavern.demandSeeds.length > 0 ||
    snapshot.state.story.narrative.status !== "idle";
  if (
    (snapshot.commandSequence === 0 && stateLooksStarted) ||
    (snapshot.commandSequence > 0 && !stateLooksStarted)
  ) {
    faultV1(
      engineInvariantFaultV1(
        "terminal_state.invalid",
        new TypeError("Snapshot sequence disagrees with State-visible lifecycle"),
      ),
    );
  }
  if (rejection !== null) rejectV1(rejection);
}

function assertNeverCommandV1(command: never): never {
  throw new TypeError(`unhandled PoC command: ${JSON.stringify(command)}`);
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
  const evaluation = evaluatePocGameCommandV1(
    candidate.snapshot().state,
    program,
    command,
    invokeRuleV1,
  );
  if (!evaluation.allowed) {
    const reason = evaluation.reasons[0];
    if (reason === undefined) {
      faultV1(
        engineInvariantFaultV1(
          "terminal_state.invalid",
          new TypeError("command evaluator rejected without a reason"),
        ),
      );
    }
    rejectV1(reason);
  }
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
      startOpeningV1(candidate, modules, program, scheduler);
      return;
    case "tavern.opening.continue":
      continueOpeningV1(candidate, modules, program, scheduler);
      return;
    case "tavern.opening.finalize":
      finalizeOpeningV1(candidate, modules, program, scheduler);
      return;
    case "world.action.begin":
      beginWorldActionV1(candidate, modules, program, scheduler, command);
      return;
    case "world.action.complete":
      completeWorldActionV1(candidate, modules, program, scheduler);
      return;
    case "levy.pay":
      payLevyV1(candidate, modules, program, scheduler);
      return;
  }
  return assertNeverCommandV1(command);
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
