// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { canonicalJsonBytes, type DeepReadonly } from "@sillymaker/base";

import type { ActionId, IngredientId, ReasonId } from "./contracts/ids.js";
import type {
  ActionPresentationDefinitionV1,
  AvailabilityExplanationV1,
  AvailabilityGateV1,
  CommandConfirmationV1,
  CommandCostViewV1,
  CommandPreviewV1,
  ConfirmationMetadataV1,
  ModifierV1,
  PocGameCommandV1,
  PocGameStateV1,
  PocRejectionReasonV1,
  PocSimulationDataV1,
  PocSimulationProgramV1,
  PreviewChangeV1,
  TavernPlanV1,
  TavernPreviewInputV1,
  TavernPreviewV1,
} from "./contracts/types.js";
import { pocGameCommandSchemaV1 } from "./contracts/schemas.js";
import {
  deepFreezePocValueV1 as deepFreezeOwnedPocValueV1,
  parseMoney,
  parseNonNegativeSafeInteger,
  parseQuantity,
  parseSafeInteger,
} from "./contracts/values.js";
import { interpretPocNarrativeStepV1 } from "./modules/narrative/interpreter.js";
import { evaluatePocConditionsV1 } from "./resolvers/scheduling-resolver.js";

function clonePocPlainValueV1<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((entry) => clonePocPlainValueV1(entry)) as T;
  }
  const clone: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor)) {
      throw new TypeError("PoC data must use plain value properties");
    }
    clone[key] = clonePocPlainValueV1(descriptor.value);
  }
  return clone as T;
}

function deepFreezePocValueV1<T>(value: T): T {
  return deepFreezeOwnedPocValueV1(clonePocPlainValueV1(value));
}

const emptyConfirmationV1: ConfirmationMetadataV1 = deepFreezePocValueV1({
  benefitTextIds: [],
  mutuallyExcludedActionIds: [],
  majorRiskTextIds: [],
});

const zeroCostsV1: CommandCostViewV1 = deepFreezePocValueV1({
  ap: parseNonNegativeSafeInteger(0),
  playerStamina: parseNonNegativeSafeInteger(0),
  heroineStamina: parseNonNegativeSafeInteger(0),
  cash: parseMoney(0),
});

export type PocCommandEvaluationRuleInvokerV1 = <T>(slot: "tavern.preview", invoke: () => T) => T;

const invokePocEvaluationRuleDirectlyV1: PocCommandEvaluationRuleInvokerV1 = (_slot, invoke) =>
  invoke();

function canonicalEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.byteLength === rightBytes.byteLength &&
    leftBytes.every((byte, index) => byte === rightBytes[index])
  );
}

function observationV1(state: DeepReadonly<PocGameStateV1>) {
  return Object.freeze({ state, narrativeStatus: state.story.narrative.status });
}

function firstUnavailableReasonV1(
  gates: readonly DeepReadonly<AvailabilityGateV1>[],
  state: DeepReadonly<PocGameStateV1>,
  data: DeepReadonly<PocSimulationDataV1>,
): ReasonId | null {
  const observation = observationV1(state);
  for (const gate of gates) {
    if (!evaluatePocConditionsV1(gate.conditions, observation, data)) return gate.reasonId;
  }
  return null;
}

function allUnavailableReasonIdsV1(
  gates: readonly DeepReadonly<AvailabilityGateV1>[],
  state: DeepReadonly<PocGameStateV1>,
  data: DeepReadonly<PocSimulationDataV1>,
): readonly ReasonId[] {
  const observation = observationV1(state);
  return deepFreezePocValueV1(
    gates
      .filter((gate) => !evaluatePocConditionsV1(gate.conditions, observation, data))
      .map(({ reasonId }) => reasonId),
  );
}

function sourceOrderV1(
  left: DeepReadonly<PocGameStateV1["simulation"]["status"]["auras"][number]>,
  right: DeepReadonly<PocGameStateV1["simulation"]["status"]["auras"][number]>,
): number {
  if (left.appliedAtSequence !== right.appliedAtSequence) {
    return left.appliedAtSequence - right.appliedAtSequence;
  }
  return left.instanceId < right.instanceId ? -1 : left.instanceId > right.instanceId ? 1 : 0;
}

export function collectPocStateModifiersV1(
  state: DeepReadonly<PocGameStateV1>,
  data: DeepReadonly<PocSimulationDataV1>,
): readonly ModifierV1[] {
  const modifiers: ModifierV1[] = [];
  for (const built of [...state.simulation.facilities.built].sort(
    ({ facilityId: left }, { facilityId: right }) => (left < right ? -1 : left > right ? 1 : 0),
  )) {
    const definition = data.content.facilities.find(
      ({ facilityId }) => facilityId === built.facilityId,
    );
    if (definition === undefined) throw new TypeError(`missing Facility ${built.facilityId}`);
    modifiers.push(...definition.modifiers);
  }
  for (const aura of [...state.simulation.status.auras].sort(sourceOrderV1)) {
    const definition = data.content.auras.find(({ auraId }) => auraId === aura.auraId);
    if (definition === undefined) throw new TypeError(`missing Aura ${aura.auraId}`);
    modifiers.push(...definition.modifiers);
  }
  const workflow = state.simulation.activeWorkflow;
  if (workflow?.kind === "opening") modifiers.push(...workflow.sessionModifiers);
  return deepFreezePocValueV1(modifiers);
}

export function resolvePocActionPresentationV1(
  data: DeepReadonly<PocSimulationDataV1>,
  commandKind: PocGameCommandV1["kind"],
  actionId?: ActionId,
): DeepReadonly<ActionPresentationDefinitionV1> {
  const matches = data.content.actions.filter(
    (action) =>
      action.commandKind === commandKind &&
      (actionId === undefined || action.actionId === actionId),
  );
  if (matches.length !== 1 || matches[0] === undefined) {
    throw new TypeError(`missing unique Action presentation for ${commandKind}`);
  }
  return matches[0];
}

export function evaluatePocActionPresentationRejectionV1(
  state: DeepReadonly<PocGameStateV1>,
  data: DeepReadonly<PocSimulationDataV1>,
  action: DeepReadonly<ActionPresentationDefinitionV1>,
): PocRejectionReasonV1 | null {
  const phase = state.simulation.calendar.phase;
  if (!action.availablePhases.includes(phase)) {
    return deepFreezePocValueV1({
      code: "calendar.invalid_phase",
      details: { actual: phase, allowed: action.availablePhases },
    });
  }
  const reasonId = firstUnavailableReasonV1(
    [...action.visibility, ...action.availability],
    state,
    data,
  );
  return reasonId === null
    ? null
    : deepFreezePocValueV1({
        code: "action.unavailable",
        details: { actionId: action.actionId, reasonId },
      });
}

export function evaluatePocLifecycleRejectionV1(
  state: DeepReadonly<PocGameStateV1>,
  command: DeepReadonly<PocGameCommandV1>,
): PocRejectionReasonV1 | null {
  const { run, activeWorkflow, tavern, calendar } = state.simulation;
  const narrative = state.story.narrative;
  if (command.kind === "run.start") {
    return tavern.demandSeeds.length > 0 || narrative.status !== "idle"
      ? deepFreezePocValueV1({ code: "run.already_started", details: {} })
      : null;
  }
  if (tavern.demandSeeds.length === 0) {
    return deepFreezePocValueV1({
      code: "run.not_started",
      details: { commandKind: command.kind },
    });
  }
  if (run.status !== "setup" && run.status !== "active") {
    return deepFreezePocValueV1({
      code: "run.invalid_status",
      details: { actual: run.status, allowed: ["setup", "active"] },
    });
  }
  if (narrative.status === "active") {
    if (command.kind === "narrative.advance" || command.kind === "narrative.choose") return null;
    if (narrative.cursor === null) throw new TypeError("active Narrative has no cursor");
    return deepFreezePocValueV1({
      code: "command.blocked_by_narrative",
      details: { commandKind: command.kind, cursor: narrative.cursor },
    });
  }
  if (calendar.lifePolicyId === null && command.kind !== "policy.choose") {
    return deepFreezePocValueV1({
      code: "run.policy_required",
      details: { commandKind: command.kind },
    });
  }
  if (activeWorkflow === null) return null;
  if (activeWorkflow.kind === "opening") {
    if (
      command.kind === "tavern.opening.start" ||
      command.kind === "tavern.opening.continue" ||
      command.kind === "tavern.opening.finalize" ||
      command.kind === "calendar.advance_phase"
    ) {
      return null;
    }
    return deepFreezePocValueV1({
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
  return allowed
    ? null
    : deepFreezePocValueV1({
        code: "command.blocked_by_workflow",
        details: {
          commandKind: command.kind,
          blocker: { kind: "world_action", progress: activeWorkflow.progress },
        },
      });
}

function fixedActionCostV1(
  data: DeepReadonly<PocSimulationDataV1>,
  key: DeepReadonly<PocSimulationDataV1>["balance"]["actionCosts"][number]["action"],
): DeepReadonly<PocSimulationDataV1>["balance"]["actionCosts"][number] {
  const matches = data.balance.actionCosts.filter(({ action }) => action === key);
  if (matches.length !== 1 || matches[0] === undefined) {
    throw new TypeError(`missing ActionCost ${key}`);
  }
  return matches[0];
}

function costsV1(
  ap: number,
  playerStamina: number,
  heroineStamina: number,
  cash: number,
): CommandCostViewV1 {
  return deepFreezePocValueV1({
    ap: parseNonNegativeSafeInteger(ap),
    playerStamina: parseNonNegativeSafeInteger(playerStamina),
    heroineStamina: parseNonNegativeSafeInteger(heroineStamina),
    cash: parseMoney(cash),
  });
}

function resourceRejectionV1(
  state: DeepReadonly<PocGameStateV1>,
  costs: DeepReadonly<CommandCostViewV1>,
): PocRejectionReasonV1 | null {
  const { calendar, actors, inventory } = state.simulation;
  if (costs.ap > calendar.apRemaining) {
    return deepFreezePocValueV1({
      code: "calendar.insufficient_ap",
      details: { required: costs.ap, available: calendar.apRemaining },
    });
  }
  if (costs.playerStamina > actors.player.stamina.current) {
    return deepFreezePocValueV1({
      code: "actor.insufficient_stamina",
      details: {
        actorId: actors.player.actorId,
        required: costs.playerStamina,
        available: actors.player.stamina.current,
      },
    });
  }
  if (costs.heroineStamina > actors.heroine.stamina.current) {
    return deepFreezePocValueV1({
      code: "actor.insufficient_stamina",
      details: {
        actorId: actors.heroine.actorId,
        required: costs.heroineStamina,
        available: actors.heroine.stamina.current,
      },
    });
  }
  if (costs.cash > inventory.cash) {
    return deepFreezePocValueV1({
      code: "inventory.insufficient_cash",
      details: { required: costs.cash, available: inventory.cash },
    });
  }
  return null;
}

function mergeConfirmationV1(
  sources: readonly DeepReadonly<ConfirmationMetadataV1>[],
): ConfirmationMetadataV1 {
  return deepFreezePocValueV1({
    benefitTextIds: sources.flatMap(({ benefitTextIds }) => benefitTextIds),
    mutuallyExcludedActionIds: sources.flatMap(
      ({ mutuallyExcludedActionIds }) => mutuallyExcludedActionIds,
    ),
    majorRiskTextIds: sources.flatMap(({ majorRiskTextIds }) => majorRiskTextIds),
  });
}

function commandActionIdV1(command: DeepReadonly<PocGameCommandV1>): ActionId | undefined {
  if (command.kind === "story.action.start" || command.kind === "world.action.begin") {
    return command.actionId;
  }
  if (command.kind === "facility.choose") return command.opportunityId;
  return undefined;
}

function commandHasActionPresentationV1(command: DeepReadonly<PocGameCommandV1>): boolean {
  return (
    command.kind === "policy.choose" ||
    command.kind === "inventory.buy" ||
    command.kind === "actor.prepare_food" ||
    command.kind === "actor.rest" ||
    command.kind === "story.action.start" ||
    command.kind === "facility.choose" ||
    command.kind === "tavern.plan.set" ||
    command.kind === "world.action.begin" ||
    command.kind === "calendar.advance_phase" ||
    command.kind === "levy.pay"
  );
}

function commandPresentationV1(
  command: DeepReadonly<PocGameCommandV1>,
  data: DeepReadonly<PocSimulationDataV1>,
): DeepReadonly<ActionPresentationDefinitionV1> | null {
  return commandHasActionPresentationV1(command)
    ? resolvePocActionPresentationV1(data, command.kind, commandActionIdV1(command))
    : null;
}

function commandConfirmationV1<C extends PocGameCommandV1>(
  command: DeepReadonly<C>,
  data: DeepReadonly<PocSimulationDataV1>,
  presentation: DeepReadonly<ActionPresentationDefinitionV1> | null,
): CommandConfirmationV1<C> {
  if (
    command.kind === "run.start" ||
    command.kind === "tavern.opening.start" ||
    command.kind === "tavern.opening.continue" ||
    command.kind === "tavern.opening.finalize" ||
    command.kind === "world.action.complete" ||
    command.kind === "narrative.advance"
  ) {
    return null as CommandConfirmationV1<C>;
  }
  const sources: DeepReadonly<ConfirmationMetadataV1>[] = [];
  if (presentation !== null) sources.push(presentation.confirmation);
  if (command.kind === "tavern.plan.set") {
    const selectedMode = data.balance.serviceModes.find(
      ({ mode: candidateMode }) => candidateMode === command.plan.mode,
    );
    if (selectedMode !== undefined) sources.push(selectedMode.confirmation);
  } else if (command.kind === "facility.choose") {
    const opportunity = data.content.facilityOpportunities.find(
      ({ opportunityId }) => opportunityId === command.opportunityId,
    );
    if (opportunity !== undefined) {
      sources.push(opportunity.confirmation);
      if (command.choice.kind === "skip") sources.push(opportunity.skipConfirmation);
      else {
        const selectedFacilityId = command.choice.facilityId;
        const facility = data.content.facilities.find(
          ({ facilityId }) => facilityId === selectedFacilityId,
        );
        if (facility !== undefined) sources.push(facility.confirmation);
      }
    }
  } else if (command.kind === "world.action.begin") {
    const option = data.content.worldActions
      .find(({ actionId }) => actionId === command.actionId)
      ?.options.find(({ optionId }) => optionId === command.optionId);
    if (option !== undefined) sources.push(option.confirmation);
  } else if (command.kind === "narrative.choose") {
    const choice = data.narrative.scenes
      .find(({ sceneId }) => sceneId === command.sceneId)
      ?.nodes.find(({ nodeId }) => nodeId === command.nodeId);
    if (choice?.kind === "choice") {
      const selected = choice.choices.find(({ choiceId }) => choiceId === command.choiceId);
      if (selected !== undefined) sources.push(selected.confirmation);
    }
  }
  return mergeConfirmationV1(
    sources.length === 0 ? [emptyConfirmationV1] : sources,
  ) as CommandConfirmationV1<C>;
}

function unknownReferenceV1(
  command: DeepReadonly<PocGameCommandV1>,
  reference: Extract<
    PocRejectionReasonV1,
    { readonly code: "command.unknown_reference" }
  >["details"]["reference"],
): PocRejectionReasonV1 {
  return deepFreezePocValueV1({
    code: "command.unknown_reference",
    details: { commandKind: command.kind, reference },
  });
}

function planStructuralRejectionV1(
  state: DeepReadonly<PocGameStateV1>,
  data: DeepReadonly<PocSimulationDataV1>,
  command: Extract<DeepReadonly<PocGameCommandV1>, { readonly kind: "tavern.plan.set" }>,
): PocRejectionReasonV1 | null {
  const { plan } = command;
  const mode = data.balance.serviceModes.find(({ mode: candidate }) => candidate === plan.mode);
  if (mode === undefined) throw new TypeError(`missing ServiceMode ${plan.mode}`);
  for (const line of plan.menu) {
    if (!data.content.recipes.some(({ recipeId }) => recipeId === line.recipeId)) {
      return unknownReferenceV1(command, { kind: "recipe", recipeId: line.recipeId });
    }
  }
  if (state.simulation.calendar.phase === "evening") {
    return deepFreezePocValueV1({
      code: "tavern.plan_frozen",
      details: { day: state.simulation.calendar.day, phase: "evening" },
    });
  }
  if (plan.menu.length > Math.min(16, data.balance.menuRecipeLimit)) {
    return deepFreezePocValueV1({ code: "tavern.invalid_plan", details: { reason: "menu_size" } });
  }
  if (plan.mode === "closed" && plan.menu.length !== 0) {
    return deepFreezePocValueV1({
      code: "tavern.invalid_plan",
      details: { reason: "closed_has_menu" },
    });
  }
  if (plan.mode !== "closed" && plan.menu.length === 0) {
    return deepFreezePocValueV1({
      code: "tavern.invalid_plan",
      details: { reason: "open_has_no_menu" },
    });
  }
  const recipeIds = new Set<string>();
  for (const line of plan.menu) {
    if (recipeIds.has(line.recipeId)) {
      return deepFreezePocValueV1({
        code: "tavern.invalid_plan",
        details: { reason: "duplicate_recipe" },
      });
    }
    recipeIds.add(line.recipeId);
  }
  const unlocked = new Set(state.simulation.tavern.unlockedRecipeIds);
  if (plan.menu.some(({ recipeId }) => !unlocked.has(recipeId))) {
    return deepFreezePocValueV1({
      code: "tavern.invalid_plan",
      details: { reason: "locked_recipe" },
    });
  }
  if (plan.menu.some(({ portions }) => portions > data.balance.menuPortionsPerRecipeLimit)) {
    return deepFreezePocValueV1({
      code: "tavern.invalid_plan",
      details: { reason: "portion_limit" },
    });
  }
  const unavailableReasonId = firstUnavailableReasonV1(mode.availability, state, data);
  return unavailableReasonId === null
    ? null
    : deepFreezePocValueV1({
        code: "tavern.service_unavailable",
        details: { mode: mode.mode, reasonId: unavailableReasonId },
      });
}

function parseTavernPreviewPlanV1(plan: DeepReadonly<TavernPlanV1>): TavernPlanV1 {
  const command = pocGameCommandSchemaV1.parse({ kind: "tavern.plan.set", plan });
  if (command.kind !== "tavern.plan.set") {
    throw new TypeError("Tavern preview parser returned another command kind");
  }
  return command.plan;
}

function tavernPreviewSemanticRejectionsV1(
  state: DeepReadonly<PocGameStateV1>,
  data: DeepReadonly<PocSimulationDataV1>,
  plan: DeepReadonly<TavernPlanV1>,
): readonly PocRejectionReasonV1[] {
  if (!data.balance.serviceModes.some(({ mode: candidate }) => candidate === plan.mode)) {
    throw new TypeError(`unknown Tavern ServiceMode: ${plan.mode}`);
  }
  for (const line of plan.menu) {
    if (!data.content.recipes.some(({ recipeId }) => recipeId === line.recipeId)) {
      throw new TypeError(`unknown Tavern RecipeId: ${line.recipeId}`);
    }
  }
  const rejection = planStructuralRejectionV1(state, data, {
    kind: "tavern.plan.set",
    plan,
  });
  return rejection === null || rejection.code === "tavern.plan_frozen"
    ? Object.freeze([])
    : deepFreezePocValueV1([rejection]);
}

function tavernPreviewCapacityRejectionsV1(
  data: DeepReadonly<PocSimulationDataV1>,
  plan: DeepReadonly<TavernPlanV1>,
  preview: DeepReadonly<TavernPreviewV1>,
): readonly PocRejectionReasonV1[] {
  const portions = plan.menu.reduce((sum, line) => sum + line.portions, 0);
  if (portions > preview.receptionCapacity) {
    return deepFreezePocValueV1([{ code: "tavern.invalid_plan", details: { reason: "capacity" } }]);
  }
  const preparationPoints = plan.menu.reduce((sum, line) => {
    const recipe = data.content.recipes.find(({ recipeId }) => recipeId === line.recipeId);
    if (recipe === undefined) throw new TypeError(`unknown Tavern RecipeId: ${line.recipeId}`);
    return sum + line.portions * recipe.prepPoints;
  }, 0);
  return preparationPoints > preview.preparationCapacity
    ? deepFreezePocValueV1([
        { code: "tavern.invalid_plan", details: { reason: "preparation_capacity" } },
      ])
    : Object.freeze([]);
}

function currentStateTavernInputV1(
  state: DeepReadonly<PocGameStateV1>,
  data: DeepReadonly<PocSimulationDataV1>,
  plan: DeepReadonly<TavernPlanV1>,
): TavernPreviewInputV1 {
  const available = new Map<IngredientId, bigint>();
  for (const batch of state.simulation.inventory.ingredientBatches) {
    const quantity = (available.get(batch.ingredientId) ?? 0n) + BigInt(batch.quantity);
    if (quantity > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new TypeError("available ingredient quantity exceeds safe integer bounds");
    }
    available.set(batch.ingredientId, quantity);
  }
  return deepFreezePocValueV1({
    basis: "current_state",
    day: state.simulation.calendar.day,
    plan,
    preparationActionCount: state.simulation.tavern.preparation.actionCount,
    availableIngredients: [...available]
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([ingredientId, quantity]) => ({
        ingredientId,
        quantity: parseQuantity(Number(quantity)),
      })),
    demand: state.simulation.tavern.currentDemand?.segments ?? [],
    actors: {
      playerAttributes: state.simulation.actors.player.attributes,
      heroineMood: state.simulation.actors.heroine.mood,
      relationship: state.simulation.actors.relationship,
      helper: state.simulation.tavern.helper,
    },
    facilityIds: state.simulation.facilities.built.map(({ facilityId }) => facilityId),
    modifiers: collectPocStateModifiersV1(state, data),
    resources: {
      apRemaining: state.simulation.calendar.apRemaining,
      cash: state.simulation.inventory.cash,
      playerStamina: state.simulation.actors.player.stamina.current,
      heroineStamina: state.simulation.actors.heroine.stamina.current,
    },
  });
}

export function previewPocTavernPlanV1(
  state: DeepReadonly<PocGameStateV1>,
  program: DeepReadonly<PocSimulationProgramV1>,
  plan: DeepReadonly<TavernPlanV1>,
  invokeRule: PocCommandEvaluationRuleInvokerV1 = invokePocEvaluationRuleDirectlyV1,
): TavernPreviewV1 {
  const parsedPlan = parseTavernPreviewPlanV1(plan);
  const workflow = state.simulation.activeWorkflow;
  const semantic =
    workflow?.kind === "opening"
      ? Object.freeze([])
      : tavernPreviewSemanticRejectionsV1(state, program.data, parsedPlan);
  let input: TavernPreviewInputV1;
  if (workflow?.kind === "opening") {
    const baselinePlan = { mode: workflow.baseline.mode, menu: workflow.baseline.menu };
    if (!canonicalEqualV1(parsedPlan, baselinePlan)) {
      throw new TypeError("active Opening preview plan must match its frozen baseline");
    }
    input = deepFreezePocValueV1({
      basis: "active_opening_baseline",
      plan: baselinePlan,
      session: workflow,
    });
  } else {
    input = currentStateTavernInputV1(state, program.data, parsedPlan);
  }
  const preview = deepFreezePocValueV1(
    invokeRule("tavern.preview", () => program.rules.tavern.preview(input)),
  );
  if (workflow?.kind === "opening") return preview;
  const capacity =
    semantic.length === 0
      ? tavernPreviewCapacityRejectionsV1(program.data, parsedPlan, preview)
      : Object.freeze([]);
  const guardCodes = [...semantic, ...capacity].map(({ code }) => code);
  if (guardCodes.length === 0) return preview;
  return deepFreezePocValueV1({
    ...preview,
    allowed: false,
    rejectionCodes: [...guardCodes, ...preview.rejectionCodes],
  });
}

function purchaseCashCostV1(
  data: DeepReadonly<PocSimulationDataV1>,
  command: Extract<DeepReadonly<PocGameCommandV1>, { readonly kind: "inventory.buy" }>,
): number | PocRejectionReasonV1 {
  if (command.lines.length > data.balance.purchaseLineLimit) {
    return deepFreezePocValueV1({
      code: "inventory.line_limit_exceeded",
      details: {
        actual: command.lines.length,
        limit: data.balance.purchaseLineLimit,
      },
    }) as PocRejectionReasonV1;
  }
  const seen = new Set<string>();
  let total = 0n;
  for (const line of command.lines) {
    if (line.quantity <= 0 || line.quantity > data.balance.purchaseQuantityPerLineLimit) {
      return deepFreezePocValueV1({
        code: "inventory.invalid_quantity",
        details: { ingredientId: line.ingredientId, quantity: parseSafeInteger(line.quantity) },
      });
    }
    if (seen.has(line.ingredientId)) {
      return deepFreezePocValueV1({
        code: "inventory.duplicate_line",
        details: { ingredientId: line.ingredientId },
      });
    }
    seen.add(line.ingredientId);
    const ingredient = data.content.ingredients.find(
      ({ ingredientId }) => ingredientId === line.ingredientId,
    );
    if (ingredient === undefined) {
      return unknownReferenceV1(command, {
        kind: "ingredient",
        ingredientId: line.ingredientId,
      });
    }
    total += BigInt(ingredient.unitPrice) * BigInt(line.quantity);
  }
  const value = Number(total);
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("purchase cost exceeds Money");
  return value;
}

function allowedPreviewV1<C extends PocGameCommandV1>(
  command: DeepReadonly<C>,
  costs: DeepReadonly<CommandCostViewV1>,
  changes: readonly DeepReadonly<PreviewChangeV1>[],
  confirmation: CommandConfirmationV1<C>,
): CommandPreviewV1<C> {
  return deepFreezePocValueV1({
    allowed: true,
    command,
    costs,
    changes,
    unknownReasonIds: [],
    confirmation,
  }) as CommandPreviewV1<C>;
}

function rejectedPreviewV1<C extends PocGameCommandV1>(
  command: DeepReadonly<C>,
  reason: DeepReadonly<PocRejectionReasonV1>,
): CommandPreviewV1<C> {
  return deepFreezePocValueV1({
    allowed: false,
    command,
    reasons: [reason],
  }) as CommandPreviewV1<C>;
}

function narrativeRejectionV1(
  state: DeepReadonly<PocGameStateV1>,
  data: DeepReadonly<PocSimulationDataV1>,
  command: Extract<
    DeepReadonly<PocGameCommandV1>,
    { readonly kind: "narrative.advance" | "narrative.choose" }
  >,
): PocRejectionReasonV1 | null {
  const narrative = state.story.narrative;
  if (command.kind === "narrative.advance" && narrative.cursor === null) {
    return deepFreezePocValueV1({
      code: "narrative.inactive",
      details: { commandKind: command.kind },
    });
  }
  const input =
    command.kind === "narrative.advance"
      ? ({ kind: "advance", cursor: narrative.cursor! } as const)
      : ({
          kind: "choose",
          cursor: { sceneId: command.sceneId, nodeId: command.nodeId },
          choiceId: command.choiceId,
        } as const);
  const step = interpretPocNarrativeStepV1(data, narrative, input);
  if (step.kind === "rejected") return step.rejection;
  if (step.kind === "faulted") throw new TypeError(`Narrative preview fault: ${step.fault.code}`);
  if (command.kind === "narrative.choose" && step.kind === "yielded") {
    if (step.request.kind !== "choice")
      throw new TypeError("Narrative choice did not yield choice");
    const choice = step.request.choice;
    if (!evaluatePocConditionsV1(choice.showWhen, observationV1(state), data)) {
      return deepFreezePocValueV1({
        code: "narrative.choice_hidden",
        details: { choiceId: choice.choiceId },
      });
    }
    if (!evaluatePocConditionsV1(choice.enableWhen, observationV1(state), data)) {
      if (choice.disabledReasonId === undefined)
        throw new TypeError("disabled choice has no reason");
      return deepFreezePocValueV1({
        code: "narrative.choice_disabled",
        details: { choiceId: choice.choiceId, reasonId: choice.disabledReasonId },
      });
    }
  }
  return null;
}

function openingRejectionV1(
  state: DeepReadonly<PocGameStateV1>,
  program: DeepReadonly<PocSimulationProgramV1>,
  command: Extract<
    DeepReadonly<PocGameCommandV1>,
    {
      readonly kind: "tavern.opening.start" | "tavern.opening.continue" | "tavern.opening.finalize";
    }
  >,
  invokeRule: PocCommandEvaluationRuleInvokerV1,
): { readonly reason: PocRejectionReasonV1 | null; readonly costs: CommandCostViewV1 } {
  const { calendar, tavern, activeWorkflow } = state.simulation;
  if (command.kind === "tavern.opening.continue" || command.kind === "tavern.opening.finalize") {
    if (activeWorkflow?.kind !== "opening") {
      return {
        reason: deepFreezePocValueV1({
          code: "tavern.opening_missing",
          details: { commandKind: command.kind },
        }),
        costs: zeroCostsV1,
      };
    }
    if (activeWorkflow.blockingEvent !== null) {
      return {
        reason: deepFreezePocValueV1({
          code: "tavern.opening_checkpoint_blocked",
          details: {
            checkpoint: activeWorkflow.checkpoint,
            eventId: activeWorkflow.blockingEvent.eventId,
          },
        }),
        costs: zeroCostsV1,
      };
    }
    if (command.kind === "tavern.opening.continue") {
      return {
        reason:
          activeWorkflow.checkpoint === "ready_to_finalize"
            ? deepFreezePocValueV1({
                code: "tavern.opening_continue_not_needed",
                details: { checkpoint: "ready_to_finalize" },
              })
            : null,
        costs: zeroCostsV1,
      };
    }
    return {
      reason:
        activeWorkflow.checkpoint === "ready_to_finalize"
          ? null
          : deepFreezePocValueV1({
              code: "tavern.opening_not_ready",
              details: { checkpoint: activeWorkflow.checkpoint },
            }),
      costs: zeroCostsV1,
    };
  }
  if (calendar.phase !== "evening") {
    return {
      reason: deepFreezePocValueV1({
        code: "calendar.invalid_phase",
        details: { actual: calendar.phase, allowed: ["evening"] },
      }),
      costs: zeroCostsV1,
    };
  }
  if (calendar.eveningResolved) {
    return {
      reason: deepFreezePocValueV1({
        code: "tavern.evening_resolved",
        details: { day: calendar.day, planMode: tavern.servicePlan?.mode ?? null },
      }),
      costs: zeroCostsV1,
    };
  }
  if (activeWorkflow?.kind === "opening") {
    return {
      reason: deepFreezePocValueV1({
        code: "tavern.opening_active",
        details: { sessionId: activeWorkflow.sessionId },
      }),
      costs: zeroCostsV1,
    };
  }
  if (activeWorkflow?.kind === "world_action") {
    return {
      reason: deepFreezePocValueV1({
        code: "workflow.conflict",
        details: { activeKind: "world_action", attemptedKind: "opening" },
      }),
      costs: zeroCostsV1,
    };
  }
  const plan = tavern.servicePlan;
  if (plan === null) {
    return {
      reason: deepFreezePocValueV1({
        code: "tavern.opening_plan_missing",
        details: { day: calendar.day },
      }),
      costs: zeroCostsV1,
    };
  }
  if (plan.mode === "closed") {
    return {
      reason: deepFreezePocValueV1({
        code: "tavern.evening_resolved",
        details: { day: calendar.day, planMode: "closed" },
      }),
      costs: zeroCostsV1,
    };
  }
  const structural = planStructuralRejectionV1(state, program.data, {
    kind: "tavern.plan.set",
    plan,
  });
  if (structural !== null && structural.code !== "tavern.plan_frozen") {
    return { reason: structural, costs: zeroCostsV1 };
  }
  const preview = previewPocTavernPlanV1(state, program, plan, invokeRule);
  const costs = costsV1(
    preview.openingCosts.ap,
    preview.openingCosts.playerStamina,
    preview.openingCosts.heroineStamina,
    preview.openingCosts.cash.total,
  );
  let resource = resourceRejectionV1(state, costs);
  if (resource === null && preview.openingCosts.ingredientShortages.length > 0) {
    const shortage = preview.openingCosts.ingredientShortages[0]!;
    const available = state.simulation.inventory.ingredientBatches
      .filter(({ ingredientId }) => ingredientId === shortage.ingredientId)
      .reduce((sum, { quantity }) => sum + quantity, 0);
    resource = deepFreezePocValueV1({
      code: "inventory.insufficient_ingredient",
      details: {
        ingredientId: shortage.ingredientId,
        required: shortage.quantity,
        available: parseNonNegativeSafeInteger(available),
      },
    });
  }
  return { reason: resource, costs };
}

function evaluateCommandDetailsV1<C extends PocGameCommandV1>(
  state: DeepReadonly<PocGameStateV1>,
  program: DeepReadonly<PocSimulationProgramV1>,
  command: DeepReadonly<C>,
  invokeRule: PocCommandEvaluationRuleInvokerV1,
): {
  readonly reason: PocRejectionReasonV1 | null;
  readonly costs: CommandCostViewV1;
  readonly changes: readonly PreviewChangeV1[];
  readonly presentation: DeepReadonly<ActionPresentationDefinitionV1> | null;
} {
  const data = program.data;
  const lifecycle = evaluatePocLifecycleRejectionV1(state, command);
  if (lifecycle !== null) {
    return { reason: lifecycle, costs: zeroCostsV1, changes: [], presentation: null };
  }
  let presentation: DeepReadonly<ActionPresentationDefinitionV1> | null = null;
  let costs = zeroCostsV1;

  if (command.kind === "run.start") {
    return { reason: null, costs, changes: [], presentation };
  }
  if (command.kind === "policy.choose") {
    const policy = data.balance.lifePolicies.find(({ policyId }) => policyId === command.policyId);
    if (policy === undefined) {
      return {
        reason: unknownReferenceV1(command, { kind: "policy", policyId: command.policyId }),
        costs,
        changes: [],
        presentation,
      };
    }
    if (state.simulation.calendar.lifePolicyId !== null) {
      return {
        reason: deepFreezePocValueV1({
          code: "policy.already_chosen",
          details: { policyId: state.simulation.calendar.lifePolicyId },
        }),
        costs,
        changes: [],
        presentation,
      };
    }
  }

  if (
    command.kind === "story.action.start" &&
    !data.content.storyActions.some(({ actionId }) => actionId === command.actionId)
  ) {
    return {
      reason: unknownReferenceV1(command, { kind: "action", actionId: command.actionId }),
      costs,
      changes: [],
      presentation,
    };
  }

  if (command.kind === "facility.choose") {
    const opportunity = data.content.facilityOpportunities.find(
      ({ opportunityId }) => opportunityId === command.opportunityId,
    );
    if (opportunity === undefined) {
      return {
        reason: unknownReferenceV1(command, {
          kind: "facility_opportunity",
          opportunityId: command.opportunityId,
        }),
        costs,
        changes: [],
        presentation,
      };
    }
    const existing = state.simulation.facilities.decisions.find(
      ({ opportunityId }) => opportunityId === command.opportunityId,
    );
    if (existing !== undefined) {
      return {
        reason: deepFreezePocValueV1({
          code: "facility.choice_committed",
          details: { opportunityId: existing.opportunityId, choice: existing.decision },
        }),
        costs,
        changes: [],
        presentation,
      };
    }
  }

  if (command.kind === "world.action.begin") {
    const action = data.content.worldActions.find(({ actionId }) => actionId === command.actionId);
    if (action === undefined) {
      return {
        reason: unknownReferenceV1(command, { kind: "action", actionId: command.actionId }),
        costs,
        changes: [],
        presentation,
      };
    }
    if (!action.options.some(({ optionId }) => optionId === command.optionId)) {
      return {
        reason: unknownReferenceV1(command, {
          kind: "world_option",
          actionId: command.actionId,
          optionId: command.optionId,
        }),
        costs,
        changes: [],
        presentation,
      };
    }
  }

  if (command.kind === "tavern.plan.set" && state.simulation.calendar.phase === "evening") {
    return {
      reason: deepFreezePocValueV1({
        code: "tavern.plan_frozen",
        details: {
          day: state.simulation.calendar.day,
          phase: state.simulation.calendar.phase,
        },
      }),
      costs,
      changes: [],
      presentation,
    };
  }

  if (command.kind === "levy.pay") {
    const due = data.balance.levyDue;
    const calendar = state.simulation.calendar;
    if (calendar.day !== due.day || calendar.phase !== due.phase) {
      return {
        reason: deepFreezePocValueV1({
          code: "levy.not_due",
          details: { day: calendar.day, phase: calendar.phase },
        }),
        costs,
        changes: [],
        presentation,
      };
    }
  }

  if (command.kind === "calendar.advance_phase") {
    const { calendar, activeWorkflow } = state.simulation;
    if (
      calendar.day === data.balance.levyDue.day &&
      calendar.phase === data.balance.levyDue.phase
    ) {
      return {
        reason: deepFreezePocValueV1({
          code: "calendar.phase_blocked",
          details: { blocker: "levy_due" },
        }),
        costs,
        changes: [],
        presentation,
      };
    }
    if (activeWorkflow?.kind === "opening") {
      return {
        reason: deepFreezePocValueV1({
          code: "calendar.phase_blocked",
          details: { blocker: "opening" },
        }),
        costs,
        changes: [],
        presentation,
      };
    }
    if (
      activeWorkflow?.kind === "world_action" &&
      activeWorkflow.progress !== "awaiting_completion_phase"
    ) {
      return {
        reason: deepFreezePocValueV1({
          code: "calendar.phase_blocked",
          details: { blocker: "world_action" },
        }),
        costs,
        changes: [],
        presentation,
      };
    }
  }

  if (commandHasActionPresentationV1(command)) {
    presentation = commandPresentationV1(command, data);
    if (presentation === null) throw new TypeError("missing command presentation");
    const genericActionReason = evaluatePocActionPresentationRejectionV1(state, data, presentation);
    let actionReason: PocRejectionReasonV1 | null = genericActionReason;
    if (genericActionReason?.code === "action.unavailable") {
      if (command.kind === "facility.choose") {
        actionReason = deepFreezePocValueV1({
          code: "facility.unavailable",
          details: {
            opportunityId: command.opportunityId,
            facilityId: command.choice.kind === "build" ? command.choice.facilityId : null,
            reasonId: genericActionReason.details.reasonId,
          },
        });
      } else if (command.kind === "world.action.begin") {
        actionReason = deepFreezePocValueV1({
          code: "world.action_unavailable",
          details: {
            actionId: command.actionId,
            optionId: null,
            reasonId: genericActionReason.details.reasonId,
          },
        });
      }
    }
    if (actionReason !== null) {
      return { reason: actionReason, costs, changes: [], presentation };
    }
  }

  switch (command.kind) {
    case "policy.choose":
      break;
    case "inventory.buy": {
      const purchase = purchaseCashCostV1(data, command);
      if (typeof purchase !== "number") {
        return { reason: purchase, costs, changes: [], presentation };
      }
      const fixed = fixedActionCostV1(data, command.kind);
      costs = costsV1(fixed.apCost, fixed.playerStaminaCost, fixed.heroineStaminaCost, purchase);
      break;
    }
    case "actor.prepare_food": {
      const preparation = state.simulation.tavern.preparation;
      const limit = data.balance.dailyPreparationLimit;
      if (preparation.actionCount >= limit) {
        return {
          reason: deepFreezePocValueV1({
            code: "tavern.preparation_limit_reached",
            details: { current: preparation.actionCount, limit },
          }),
          costs,
          changes: [],
          presentation,
        };
      }
      const fixed = fixedActionCostV1(data, command.kind);
      costs = costsV1(fixed.apCost, fixed.playerStaminaCost, fixed.heroineStaminaCost, 0);
      break;
    }
    case "actor.rest": {
      const player = state.simulation.actors.player;
      if (player.stamina.current >= player.stamina.maximum) {
        return {
          reason: deepFreezePocValueV1({
            code: "actor.stamina_at_maximum",
            details: { actorId: player.actorId, maximum: player.stamina.maximum },
          }),
          costs,
          changes: [],
          presentation,
        };
      }
      const fixed = fixedActionCostV1(data, command.kind);
      costs = costsV1(fixed.apCost, fixed.playerStaminaCost, fixed.heroineStaminaCost, 0);
      break;
    }
    case "story.action.start":
      break;
    case "facility.choose": {
      const opportunity = data.content.facilityOpportunities.find(
        ({ opportunityId }) => opportunityId === command.opportunityId,
      );
      if (opportunity === undefined) throw new TypeError("Facility opportunity guard diverged");
      const unavailable = firstUnavailableReasonV1(opportunity.availability, state, data);
      const facilityId = command.choice.kind === "build" ? command.choice.facilityId : null;
      if (unavailable !== null) {
        return {
          reason: deepFreezePocValueV1({
            code: "facility.unavailable",
            details: { opportunityId: command.opportunityId, facilityId, reasonId: unavailable },
          }),
          costs,
          changes: [],
          presentation,
        };
      }
      if (command.choice.kind === "build") {
        const selectedFacilityId = command.choice.facilityId;
        const facility = data.content.facilities.find(
          ({ facilityId: id }) => id === selectedFacilityId,
        );
        if (facility === undefined) {
          return {
            reason: unknownReferenceV1(command, {
              kind: "facility",
              facilityId: selectedFacilityId,
            }),
            costs,
            changes: [],
            presentation,
          };
        }
        if (!opportunity.facilityIds.includes(facility.facilityId)) {
          return {
            reason: deepFreezePocValueV1({
              code: "facility.target_not_offered",
              details: {
                opportunityId: opportunity.opportunityId,
                facilityId: facility.facilityId,
              },
            }),
            costs,
            changes: [],
            presentation,
          };
        }
        if (
          state.simulation.facilities.built.some(
            ({ facilityId: builtFacilityId }) => builtFacilityId === facility.facilityId,
          )
        ) {
          return {
            reason: deepFreezePocValueV1({
              code: "facility.already_built",
              details: { facilityId: facility.facilityId },
            }),
            costs,
            changes: [],
            presentation,
          };
        }
        const fixed = fixedActionCostV1(data, "facility.choose.build");
        costs = costsV1(
          fixed.apCost,
          fixed.playerStaminaCost,
          fixed.heroineStaminaCost,
          facility.cashCost,
        );
      }
      break;
    }
    case "tavern.plan.set": {
      const planRejection = planStructuralRejectionV1(state, data, command);
      if (planRejection !== null) {
        return { reason: planRejection, costs, changes: [], presentation };
      }
      const preview = previewPocTavernPlanV1(state, program, command.plan, invokeRule);
      const portions = command.plan.menu.reduce((sum, line) => sum + line.portions, 0);
      if (portions > preview.receptionCapacity) {
        return {
          reason: deepFreezePocValueV1({
            code: "tavern.invalid_plan",
            details: { reason: "capacity" },
          }),
          costs,
          changes: [],
          presentation,
        };
      }
      const preparationPoints = command.plan.menu.reduce((sum, line) => {
        const recipe = data.content.recipes.find(({ recipeId }) => recipeId === line.recipeId);
        return sum + line.portions * (recipe?.prepPoints ?? 0);
      }, 0);
      if (preparationPoints > preview.preparationCapacity) {
        return {
          reason: deepFreezePocValueV1({
            code: "tavern.invalid_plan",
            details: { reason: "preparation_capacity" },
          }),
          costs,
          changes: [],
          presentation,
        };
      }
      break;
    }
    case "tavern.opening.start":
    case "tavern.opening.continue":
    case "tavern.opening.finalize": {
      const opening = openingRejectionV1(state, program, command, invokeRule);
      return {
        reason: opening.reason,
        costs: opening.costs,
        changes: [],
        presentation,
      };
    }
    case "world.action.begin": {
      const action = data.content.worldActions.find(
        ({ actionId }) => actionId === command.actionId,
      );
      if (action === undefined) throw new TypeError("WorldAction guard diverged");
      const option = action.options.find(({ optionId }) => optionId === command.optionId);
      if (option === undefined) throw new TypeError("WorldAction option guard diverged");
      const unavailable = firstUnavailableReasonV1(action.availability, state, data);
      if (unavailable !== null) {
        return {
          reason: deepFreezePocValueV1({
            code: "world.action_unavailable",
            details: { actionId: action.actionId, optionId: null, reasonId: unavailable },
          }),
          costs,
          changes: [],
          presentation,
        };
      }
      const optionUnavailable = firstUnavailableReasonV1(option.availability, state, data);
      if (optionUnavailable !== null) {
        return {
          reason: deepFreezePocValueV1({
            code: "world.action_unavailable",
            details: {
              actionId: action.actionId,
              optionId: option.optionId,
              reasonId: optionUnavailable,
            },
          }),
          costs,
          changes: [],
          presentation,
        };
      }
      const begin = action.steps[0];
      if (begin === undefined)
        throw new TypeError(`WorldAction ${action.actionId} has no begin step`);
      if (state.simulation.calendar.phase !== begin.phase) {
        return {
          reason: deepFreezePocValueV1({
            code: "world.action_wrong_phase",
            details: {
              actionId: action.actionId,
              expected: begin.phase,
              actual: state.simulation.calendar.phase,
            },
          }),
          costs,
          changes: [],
          presentation,
        };
      }
      costs = costsV1(
        begin.apCost,
        action.playerStaminaCost,
        0,
        action.baseCashCost + option.additionalCashCost,
      );
      break;
    }
    case "world.action.complete": {
      const workflow = state.simulation.activeWorkflow;
      if (workflow?.kind !== "world_action") {
        return {
          reason: deepFreezePocValueV1({
            code: "workflow.missing",
            details: { expectedKind: "world_action", commandKind: command.kind },
          }),
          costs,
          changes: [],
          presentation,
        };
      }
      const action = data.content.worldActions.find(
        ({ actionId }) => actionId === workflow.actionId,
      );
      if (action === undefined) throw new TypeError(`missing WorldAction ${workflow.actionId}`);
      const completion = action.steps[1];
      if (completion === undefined) {
        throw new TypeError(`WorldAction ${action.actionId} has no completion step`);
      }
      if (state.simulation.calendar.phase !== completion.phase) {
        return {
          reason: deepFreezePocValueV1({
            code: "world.action_wrong_phase",
            details: {
              actionId: action.actionId,
              expected: completion.phase,
              actual: state.simulation.calendar.phase,
            },
          }),
          costs,
          changes: [],
          presentation,
        };
      }
      costs = costsV1(completion.apCost, 0, 0, 0);
      break;
    }
    case "narrative.advance":
    case "narrative.choose": {
      const narrative = narrativeRejectionV1(state, data, command);
      if (narrative !== null) {
        return { reason: narrative, costs, changes: [], presentation };
      }
      break;
    }
    case "calendar.advance_phase": {
      const workflow = state.simulation.activeWorkflow;
      if (workflow?.kind === "world_action") {
        const action = data.content.worldActions.find(
          ({ actionId }) => actionId === workflow.actionId,
        );
        const target =
          state.simulation.calendar.phase === "morning"
            ? "afternoon"
            : state.simulation.calendar.phase === "afternoon"
              ? "evening"
              : "morning";
        if (action?.steps[1]?.phase !== target) {
          return {
            reason: deepFreezePocValueV1({
              code: "calendar.phase_blocked",
              details: { blocker: "world_action" },
            }),
            costs,
            changes: [],
            presentation,
          };
        }
      }
      break;
    }
    case "levy.pay": {
      costs = costsV1(
        0,
        0,
        0,
        state.simulation.inventory.cash >= data.balance.levyAmount ? data.balance.levyAmount : 0,
      );
      break;
    }
  }
  const resource = resourceRejectionV1(state, costs);
  return { reason: resource, costs, changes: [], presentation };
}

export function evaluatePocGameCommandV1<C extends PocGameCommandV1>(
  state: DeepReadonly<PocGameStateV1>,
  program: DeepReadonly<PocSimulationProgramV1>,
  command: C,
  invokeRule: PocCommandEvaluationRuleInvokerV1 = invokePocEvaluationRuleDirectlyV1,
): CommandPreviewV1<C> {
  const readonlyCommand = command as unknown as DeepReadonly<C>;
  const details = evaluateCommandDetailsV1(state, program, readonlyCommand, invokeRule);
  if (details.reason !== null) return rejectedPreviewV1(readonlyCommand, details.reason);
  return allowedPreviewV1(
    readonlyCommand,
    details.costs,
    details.changes,
    commandConfirmationV1(readonlyCommand, program.data, details.presentation),
  );
}

function representativeCommandV1(
  action: DeepReadonly<ActionPresentationDefinitionV1>,
  data: DeepReadonly<PocSimulationDataV1>,
): PocGameCommandV1 | null {
  switch (action.commandKind) {
    case "policy.choose":
      return { kind: action.commandKind, policyId: data.balance.lifePolicies[0]!.policyId };
    case "inventory.buy":
      return { kind: action.commandKind, lines: [] };
    case "tavern.plan.set":
      return { kind: action.commandKind, plan: { mode: "closed", menu: [] } };
    case "facility.choose":
      return {
        kind: action.commandKind,
        opportunityId: action.actionId,
        choice: { kind: "skip" },
      };
    case "world.action.begin": {
      const world = data.content.worldActions.find(({ actionId }) => actionId === action.actionId);
      const option = world?.options[0];
      return option === undefined
        ? null
        : { kind: action.commandKind, actionId: action.actionId, optionId: option.optionId };
    }
    case "story.action.start":
      return { kind: action.commandKind, actionId: action.actionId };
    case "actor.prepare_food":
    case "actor.rest":
    case "calendar.advance_phase":
    case "levy.pay":
      return { kind: action.commandKind };
    default:
      return null;
  }
}

function directCommandForActionV1(
  action: DeepReadonly<ActionPresentationDefinitionV1>,
): PocGameCommandV1 | null {
  switch (action.commandKind) {
    case "story.action.start":
      return deepFreezePocValueV1({ kind: action.commandKind, actionId: action.actionId });
    case "actor.prepare_food":
    case "actor.rest":
    case "calendar.advance_phase":
    case "levy.pay":
      return deepFreezePocValueV1({ kind: action.commandKind });
    default:
      return null;
  }
}

function actionDomainReasonsV1(
  state: DeepReadonly<PocGameStateV1>,
  program: DeepReadonly<PocSimulationProgramV1>,
  action: DeepReadonly<ActionPresentationDefinitionV1>,
): readonly PocRejectionReasonV1[] {
  const { data } = program;
  const reasons: PocRejectionReasonV1[] = [];
  const directCommand = directCommandForActionV1(action);
  if (directCommand !== null) {
    const preview = evaluatePocGameCommandV1(state, program, directCommand);
    if (!preview.allowed) {
      const first = preview.reasons[0];
      if (
        first !== undefined &&
        first.code !== "calendar.invalid_phase" &&
        first.code !== "action.unavailable" &&
        first.code !== "facility.unavailable" &&
        first.code !== "world.action_unavailable"
      ) {
        return preview.reasons;
      }
    }
  } else {
    const representative = representativeCommandV1(action, data);
    if (representative !== null) {
      const lifecycle = evaluatePocLifecycleRejectionV1(state, representative);
      if (lifecycle !== null) return deepFreezePocValueV1([lifecycle]);
      if (
        representative.kind === "policy.choose" &&
        state.simulation.calendar.lifePolicyId !== null
      ) {
        return deepFreezePocValueV1([
          {
            code: "policy.already_chosen",
            details: { policyId: state.simulation.calendar.lifePolicyId },
          },
        ]);
      }
      if (representative.kind === "facility.choose") {
        const existing = state.simulation.facilities.decisions.find(
          ({ opportunityId }) => opportunityId === representative.opportunityId,
        );
        if (existing !== undefined) {
          return deepFreezePocValueV1([
            {
              code: "facility.choice_committed",
              details: { opportunityId: existing.opportunityId, choice: existing.decision },
            },
          ]);
        }
      }
      if (
        representative.kind === "tavern.plan.set" &&
        state.simulation.calendar.phase === "evening"
      ) {
        return deepFreezePocValueV1([
          {
            code: "tavern.plan_frozen",
            details: { day: state.simulation.calendar.day, phase: "evening" },
          },
        ]);
      }
    }
  }
  if (!action.availablePhases.includes(state.simulation.calendar.phase)) {
    reasons.push({
      code: "calendar.invalid_phase",
      details: {
        actual: state.simulation.calendar.phase,
        allowed: action.availablePhases,
      },
    });
  }
  for (const reasonId of allUnavailableReasonIdsV1(
    [...action.visibility, ...action.availability],
    state,
    data,
  )) {
    if (action.commandKind === "facility.choose") {
      reasons.push({
        code: "facility.unavailable",
        details: { opportunityId: action.actionId, facilityId: null, reasonId },
      });
    } else if (action.commandKind === "world.action.begin") {
      reasons.push({
        code: "world.action_unavailable",
        details: { actionId: action.actionId, optionId: null, reasonId },
      });
    } else {
      reasons.push({
        code: "action.unavailable",
        details: { actionId: action.actionId, reasonId },
      });
    }
  }
  if (action.commandKind === "facility.choose") {
    const opportunity = data.content.facilityOpportunities.find(
      ({ opportunityId }) => opportunityId === action.actionId,
    );
    if (opportunity !== undefined) {
      for (const reasonId of allUnavailableReasonIdsV1(opportunity.availability, state, data)) {
        reasons.push({
          code: "facility.unavailable",
          details: { opportunityId: action.actionId, facilityId: null, reasonId },
        });
      }
    }
  }
  if (action.commandKind === "world.action.begin") {
    const world = data.content.worldActions.find(({ actionId }) => actionId === action.actionId);
    if (world !== undefined) {
      for (const reasonId of allUnavailableReasonIdsV1(world.availability, state, data)) {
        reasons.push({
          code: "world.action_unavailable",
          details: { actionId: action.actionId, optionId: null, reasonId },
        });
      }
    }
  }
  if (reasons.length === 0 && directCommand !== null) {
    const preview = evaluatePocGameCommandV1(state, program, directCommand);
    if (!preview.allowed) return preview.reasons;
  }
  if (reasons.length === 0 && action.commandKind === "inventory.buy") {
    const fixed = fixedActionCostV1(data, action.commandKind);
    const resource = resourceRejectionV1(
      state,
      costsV1(fixed.apCost, fixed.playerStaminaCost, fixed.heroineStaminaCost, 0),
    );
    if (resource !== null) return deepFreezePocValueV1([resource]);
  }
  return deepFreezePocValueV1(reasons);
}

export function explainPocActionAvailabilityV1(
  state: DeepReadonly<PocGameStateV1>,
  program: DeepReadonly<PocSimulationProgramV1>,
  actionId: ActionId,
): AvailabilityExplanationV1 {
  const { data } = program;
  const action = data.content.actions.find(({ actionId: candidate }) => candidate === actionId);
  if (action === undefined) throw new TypeError(`missing Action ${actionId}`);
  const visible = allUnavailableReasonIdsV1(action.visibility, state, data).length === 0;
  const reasons = actionDomainReasonsV1(state, program, action);
  return deepFreezePocValueV1({
    actionId,
    visible,
    available: visible && reasons.length === 0,
    reasons,
  });
}

export function costsForPocActionPresentationV1(
  data: DeepReadonly<PocSimulationDataV1>,
  action: DeepReadonly<ActionPresentationDefinitionV1>,
): CommandCostViewV1 {
  if (
    action.commandKind === "inventory.buy" ||
    action.commandKind === "actor.prepare_food" ||
    action.commandKind === "actor.rest"
  ) {
    const fixed = fixedActionCostV1(data, action.commandKind);
    return costsV1(fixed.apCost, fixed.playerStaminaCost, fixed.heroineStaminaCost, 0);
  }
  return zeroCostsV1;
}

export function occupiedPhasesForPocActionV1(
  state: DeepReadonly<PocGameStateV1>,
  action: DeepReadonly<ActionPresentationDefinitionV1>,
) {
  if (action.occupation.kind === "none") return Object.freeze([]);
  if (action.occupation.kind === "current_phase") {
    return deepFreezePocValueV1([state.simulation.calendar.phase]);
  }
  return action.occupation.phases;
}

export { emptyConfirmationV1 as pocEmptyConfirmationV1, zeroCostsV1 as pocZeroCostsV1 };
