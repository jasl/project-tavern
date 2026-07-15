// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { canonicalJsonBytes, type DeepReadonly } from "@sillymaker/base";

import type { ActionId } from "./contracts/ids.js";
import type {
  ActionPresentationDefinitionV1,
  ActionViewV1,
  AvailabilityExplanationV1,
  CheckInputV1,
  CommandPreviewV1,
  DemandForecastV1,
  LifePolicySelectionProjectionV1,
  NarrativeChoiceProjectionV1,
  NarrativeProjectionV1,
  ObligationForecastKindV1,
  ObligationForecastV1,
  PocFacilitiesProjectionV1,
  PocGameCommandV1,
  PocGameQueriesV1,
  PocGameStateV1,
  PocGameViewStatusV1,
  PocHudProjectionV1,
  PocInventoryProjectionV1,
  PocLedgerProjectionV1,
  PocSimulationDataV1,
  PocSimulationProgramV1,
  PocTavernProjectionV1,
  ResolvedCheckV1,
  RunCompletionV1,
  RunStartControlProjectionV1,
  TavernOpeningControlProjectionV1,
  TavernPlanV1,
  TavernPreviewV1,
} from "./contracts/types.js";
import {
  deepFreezePocValueV1 as deepFreezeOwnedPocValueV1,
  parseAttributeBonus,
  parseMoney,
  parseSafeInteger,
} from "./contracts/values.js";
import { pocGameCommandSchemaV1 } from "./contracts/schemas.js";
import {
  collectPocStateModifiersV1,
  costsForPocActionPresentationV1,
  evaluatePocGameCommandV1,
  explainPocActionAvailabilityV1,
  occupiedPhasesForPocActionV1,
  previewPocTavernPlanV1,
} from "./game-command-evaluation.js";
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
      throw new TypeError("PoC projection inputs must use plain value properties");
    }
    clone[key] = clonePocPlainValueV1(descriptor.value);
  }
  return clone as T;
}

function deepFreezePocValueV1<T>(value: T): T {
  return deepFreezeOwnedPocValueV1(clonePocPlainValueV1(value));
}

function canonicalEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.byteLength === rightBytes.byteLength &&
    leftBytes.every((byte, index) => byte === rightBytes[index])
  );
}

const attributeBonusByRankV1 = Object.freeze({ C: 0, B: 1, A: 2, S: 3, "S+": 4 });
const phaseOrderV1 = Object.freeze({ morning: 0, afternoon: 1, evening: 2 });

function compareCalendarPositionV1(
  left: { readonly day: number; readonly phase: keyof typeof phaseOrderV1 },
  right: { readonly day: number; readonly phase: keyof typeof phaseOrderV1 },
): number {
  return left.day === right.day
    ? phaseOrderV1[left.phase] - phaseOrderV1[right.phase]
    : left.day - right.day;
}

function directCommandForActionV1(
  action: DeepReadonly<ActionPresentationDefinitionV1>,
): PocGameCommandV1 | null {
  switch (action.commandKind) {
    case "actor.prepare_food":
    case "actor.rest":
    case "calendar.advance_phase":
    case "levy.pay":
      return deepFreezePocValueV1({ kind: action.commandKind });
    case "story.action.start":
      return deepFreezePocValueV1({ kind: action.commandKind, actionId: action.actionId });
    default:
      return null;
  }
}

function actionViewV1(
  state: DeepReadonly<PocGameStateV1>,
  program: DeepReadonly<PocSimulationProgramV1>,
  action: DeepReadonly<ActionPresentationDefinitionV1>,
): { readonly explanation: AvailabilityExplanationV1; readonly view: ActionViewV1 } {
  const explanation = explainPocActionAvailabilityV1(state, program, action.actionId);
  const directCommand = directCommandForActionV1(action);
  const directPreview =
    directCommand === null ? null : evaluatePocGameCommandV1(state, program, directCommand);
  const reasons = explanation.reasons;
  const available = explanation.visible && reasons.length === 0;
  const costs =
    directPreview?.allowed === true
      ? directPreview.costs
      : costsForPocActionPresentationV1(program.data, action);
  const view = deepFreezePocValueV1({
    actionId: action.actionId,
    labelTextId: action.labelTextId,
    available,
    costs,
    availablePhases: action.availablePhases,
    occupiedPhases: occupiedPhasesForPocActionV1(state, action),
    confirmation: action.confirmation,
    directCommand,
    rejectionCodes: reasons.map(({ code }) => code),
  });
  return { explanation, view };
}

function checkInputV1(
  state: DeepReadonly<PocGameStateV1>,
  data: DeepReadonly<PocSimulationDataV1>,
  request: DeepReadonly<
    Extract<
      PocSimulationDataV1["narrative"]["scenes"][number]["nodes"][number],
      { readonly kind: "choice" }
    >["choices"][number]["check"]
  >,
): CheckInputV1 | null {
  if (request === undefined) return null;
  const definition = data.content.checks.find(({ checkId }) => checkId === request.checkId);
  if (definition === undefined) throw new TypeError(`missing Check ${request.checkId}`);
  if (request.actorId !== state.simulation.actors.player.actorId) {
    throw new TypeError(`Check actor ${request.actorId} has no attributes`);
  }
  const rank = state.simulation.actors.player.attributes[definition.attribute];
  return deepFreezePocValueV1({
    checkId: definition.checkId,
    actorId: request.actorId,
    attribute: definition.attribute,
    rank,
    attributeBonus: parseAttributeBonus(attributeBonusByRankV1[rank]),
    preparationBonus: request.preparationBonus,
    modifiers: collectPocStateModifiersV1(state, data),
    bands: definition.bands,
  });
}

function narrativeProjectionV1(
  state: DeepReadonly<PocGameStateV1>,
  program: DeepReadonly<PocSimulationProgramV1>,
): NarrativeProjectionV1 | null {
  const narrative = state.story.narrative;
  if (narrative.status !== "active") return null;
  const cursor = narrative.cursor;
  if (cursor === null) throw new TypeError("active Narrative has no cursor");
  const scene = program.data.narrative.scenes.find(({ sceneId }) => sceneId === cursor.sceneId);
  const node = scene?.nodes.find(({ nodeId }) => nodeId === cursor.nodeId);
  if (node === undefined) throw new TypeError("active Narrative cursor is not authored");
  if (node.kind !== "line" && node.kind !== "narration" && node.kind !== "choice") {
    throw new TypeError("active Narrative stopped on a non-presentable node");
  }
  const observation = Object.freeze({ state, narrativeStatus: narrative.status });
  const choices: NarrativeChoiceProjectionV1[] = [];
  if (node.kind === "choice") {
    for (const choice of node.choices) {
      if (!evaluatePocConditionsV1(choice.showWhen, observation, program.data)) continue;
      const enabled = evaluatePocConditionsV1(choice.enableWhen, observation, program.data);
      if (!enabled && choice.disabledReasonId === undefined) {
        throw new TypeError(`disabled Narrative choice ${choice.choiceId} has no ReasonId`);
      }
      const input = checkInputV1(state, program.data, choice.check);
      choices.push({
        choiceId: choice.choiceId,
        textId: choice.textId,
        enabled,
        ...(enabled ? {} : { disabledReasonId: choice.disabledReasonId }),
        ...(input === null
          ? {}
          : { checkPreview: deepFreezePocValueV1(program.rules.checks.describe(input)) }),
        confirmation: choice.confirmation,
      });
    }
  }
  const latest = state.story.resolvedChecks.at(-1);
  return deepFreezePocValueV1({
    status: narrative.status,
    cursor,
    stage: narrative.stage,
    speakerId: node.kind === "line" ? node.speakerId : null,
    textId: node.kind === "line" || node.kind === "narration" ? node.textId : null,
    choices,
    latestResolvedCheck: latest === undefined ? null : cloneResolvedCheckV1(latest),
  });
}

function cloneResolvedCheckV1(check: DeepReadonly<ResolvedCheckV1>): ResolvedCheckV1 {
  return deepFreezePocValueV1({
    checkId: check.checkId,
    actorId: check.actorId,
    dice: [check.dice[0]!, check.dice[1]!],
    attributeBonus: check.attributeBonus,
    preparationBonus: check.preparationBonus,
    modifiers: [...check.modifiers],
    totalBonus: check.totalBonus,
    total: check.total,
    bandId: check.bandId,
    resolvedAtSequence: check.resolvedAtSequence,
  });
}

function isBootstrapStateV1(state: DeepReadonly<PocGameStateV1>): boolean {
  const { run, calendar, tavern, activeWorkflow } = state.simulation;
  const narrative = state.story.narrative;
  return (
    run.status === "setup" &&
    run.completion === null &&
    calendar.lifePolicyId === null &&
    calendar.day === 1 &&
    calendar.phase === "morning" &&
    narrative.status === "idle" &&
    narrative.source === null &&
    narrative.cursor === null &&
    tavern.demandSeeds.length === 0 &&
    tavern.currentDemand === null &&
    activeWorkflow === null
  );
}

function demandForecastV1(
  state: DeepReadonly<PocGameStateV1>,
  data: DeepReadonly<PocSimulationDataV1>,
): DemandForecastV1 | null {
  const { calendar, tavern } = state.simulation;
  if (tavern.demandSeeds.length === 0 || !data.balance.serviceDays.includes(calendar.day)) {
    return null;
  }
  if (tavern.currentDemand?.day !== calendar.day) return null;
  return deepFreezePocValueV1({
    day: tavern.currentDemand.day,
    lines: tavern.currentDemand.segments.map(({ segmentId, preview, modifiers }) => ({
      segmentId,
      range: preview,
      modifiers,
    })),
  });
}

function resolvedServiceDaysV1(state: DeepReadonly<PocGameStateV1>): ReadonlySet<number> {
  return new Set(
    state.simulation.tavern.serviceHistory.map((entry) =>
      entry.kind === "opening" ? entry.opening.day : entry.closure.day,
    ),
  );
}

function obligationRecommendationsV1(
  state: DeepReadonly<PocGameStateV1>,
  program: DeepReadonly<PocSimulationProgramV1>,
  kind: ObligationForecastKindV1,
  atRisk: boolean,
) {
  if (!atRisk) return Object.freeze([]);
  return deepFreezePocValueV1(
    program.data.balance.obligationForecast.recommendations
      .filter(({ appliesTo }) => appliesTo.includes(kind))
      .map(({ textId, actionId }) => {
        if (actionId === null) return { textId, actionId: null };
        const explanation = explainPocActionAvailabilityV1(state, program, actionId);
        return {
          textId,
          actionId: explanation.visible && explanation.available ? actionId : null,
        };
      }),
  );
}

function obligationForecastV1(
  state: DeepReadonly<PocGameStateV1>,
  program: DeepReadonly<PocSimulationProgramV1>,
): ObligationForecastV1 | null {
  const { run, calendar, inventory, activeWorkflow } = state.simulation;
  const policy = program.data.balance.obligationForecast;
  if (run.status !== "setup" && run.status !== "active") {
    return null;
  }
  if (compareCalendarPositionV1(calendar, policy.visibleFrom) < 0) return null;
  const currentGap = parseMoney(
    Math.max(0, Number(program.data.balance.levyAmount) - Number(inventory.cash)),
  );
  const base = {
    currentCash: inventory.cash,
    levyAmount: program.data.balance.levyAmount,
    currentGap,
    reasonId: policy.reasonId,
  } as const;
  const resolved = resolvedServiceDaysV1(state);
  if (program.data.balance.serviceDays.every((day) => resolved.has(day))) {
    const projectedCashAfterLevy = parseSafeInteger(
      Number(inventory.cash) - Number(program.data.balance.levyAmount),
    );
    return deepFreezePocValueV1({
      kind: "final",
      ...base,
      projectedCashAfterLevy,
      recommendations: obligationRecommendationsV1(
        state,
        program,
        "final",
        projectedCashAfterLevy < 0,
      ),
    });
  }
  if (compareCalendarPositionV1(calendar, policy.conservativeFrom) >= 0) {
    let preview: TavernPreviewV1 | null = null;
    if (activeWorkflow?.kind === "opening") {
      const plan: TavernPlanV1 = deepFreezePocValueV1({
        mode: activeWorkflow.baseline.mode,
        menu: activeWorkflow.baseline.menu,
      });
      preview = previewPocTavernPlanV1(state, program, plan);
    } else if (
      activeWorkflow === null &&
      calendar.phase === "evening" &&
      !calendar.eveningResolved &&
      state.simulation.tavern.servicePlan !== null &&
      state.simulation.tavern.servicePlan.mode !== "closed"
    ) {
      const startPreview = evaluatePocGameCommandV1(state, program, {
        kind: "tavern.opening.start",
      });
      if (startPreview.allowed) {
        preview = previewPocTavernPlanV1(state, program, state.simulation.tavern.servicePlan);
      }
    }
    if (preview?.allowed === true) {
      const projectedCashAfterOpening = {
        min: parseSafeInteger(Number(inventory.cash) + Number(preview.cashDelta.min)),
        max: parseSafeInteger(Number(inventory.cash) + Number(preview.cashDelta.max)),
      };
      const projectedCashAfterLevy = {
        min: parseSafeInteger(
          Number(projectedCashAfterOpening.min) - Number(program.data.balance.levyAmount),
        ),
        max: parseSafeInteger(
          Number(projectedCashAfterOpening.max) - Number(program.data.balance.levyAmount),
        ),
      };
      return deepFreezePocValueV1({
        kind: "committed_plan_conservative",
        ...base,
        projectedCashAfterOpening,
        projectedCashAfterLevy,
        recommendations: obligationRecommendationsV1(
          state,
          program,
          "committed_plan_conservative",
          projectedCashAfterLevy.min < 0,
        ),
      });
    }
  }
  return deepFreezePocValueV1({
    kind: "current_gap",
    ...base,
    recommendations: obligationRecommendationsV1(state, program, "current_gap", currentGap > 0),
  });
}

export function createPocGameQueriesV1(
  state: DeepReadonly<PocGameStateV1>,
  program: DeepReadonly<PocSimulationProgramV1>,
): PocGameQueriesV1 {
  function getAvailableActions(): readonly ActionViewV1[] {
    return deepFreezePocValueV1(
      program.data.content.actions
        .map((action) => actionViewV1(state, program, action))
        .filter(({ explanation }) => explanation.visible)
        .map(({ view }) => view),
    );
  }

  function explainAvailability(actionId: ActionId): AvailabilityExplanationV1 {
    return explainPocActionAvailabilityV1(state, program, actionId);
  }

  function previewCommand<C extends PocGameCommandV1>(command: C): CommandPreviewV1<C> {
    const parsed = pocGameCommandSchemaV1.parse(command);
    if (!canonicalEqualV1(command, parsed)) {
      throw new TypeError("Command preview admission changed the command value");
    }
    return evaluatePocGameCommandV1(state, program, parsed as C);
  }

  function previewTavernPlan(plan: TavernPlanV1): TavernPreviewV1 {
    return previewPocTavernPlanV1(state, program, plan);
  }

  function getGameViewStatus(): PocGameViewStatusV1 {
    return state.simulation.run.status === "setup" || state.simulation.run.status === "active"
      ? state.simulation.run.status
      : "terminal";
  }

  function getHudProjection(): PocHudProjectionV1 {
    return deepFreezePocValueV1({
      day: state.simulation.calendar.day,
      phase: state.simulation.calendar.phase,
      apRemaining: state.simulation.calendar.apRemaining,
      cash: state.simulation.inventory.cash,
      reputation: state.simulation.tavern.reputation,
      playerStamina: state.simulation.actors.player.stamina,
      heroineStamina: state.simulation.actors.heroine.stamina,
      heroineMood: state.simulation.actors.heroine.mood,
      relationship: state.simulation.actors.relationship,
      levyAmount: program.data.balance.levyAmount,
    });
  }

  function getInventoryProjection(): PocInventoryProjectionV1 {
    return deepFreezePocValueV1({
      ingredientBatches: state.simulation.inventory.ingredientBatches.map(
        ({
          batchId,
          ingredientId,
          quantity,
          acquiredDay,
          lastUsableDay,
          refrigerationExtended,
        }) => ({
          batchId,
          ingredientId,
          quantity,
          acquiredDay,
          lastUsableDay,
          refrigerationExtended,
        }),
      ),
      itemStacks: state.simulation.inventory.itemStacks.map(({ itemId, quantity }) => ({
        itemId,
        quantity,
      })),
    });
  }

  function getTavernProjection(): PocTavernProjectionV1 {
    const servicePlan = state.simulation.tavern.servicePlan;
    return deepFreezePocValueV1({
      unlockedRecipeIds: [...state.simulation.tavern.unlockedRecipeIds],
      helper: { ...state.simulation.tavern.helper },
      preparation: { ...state.simulation.tavern.preparation },
      servicePlan,
      currentPlanPreview: servicePlan === null ? null : previewTavernPlan(servicePlan),
      serviceHistory: [...state.simulation.tavern.serviceHistory],
    });
  }

  function getFacilitiesProjection(): PocFacilitiesProjectionV1 {
    return deepFreezePocValueV1({
      built: [...state.simulation.facilities.built],
      decisions: [...state.simulation.facilities.decisions],
    });
  }

  function getLedgerProjection(): PocLedgerProjectionV1 {
    return deepFreezePocValueV1({
      startingCash: state.simulation.inventory.startingCash,
      currentCash: state.simulation.inventory.cash,
      entries: [...state.simulation.inventory.ledger],
    });
  }

  function getNarrativeProjection(): NarrativeProjectionV1 | null {
    return narrativeProjectionV1(state, program);
  }

  function getRunStartControl(): RunStartControlProjectionV1 | null {
    if (!isBootstrapStateV1(state)) return null;
    const command = deepFreezePocValueV1({ kind: "run.start" } as const);
    const preview = previewCommand(command);
    if (!preview.allowed) throw new TypeError("Bootstrap run.start preview was rejected");
    return deepFreezePocValueV1({ command, preview });
  }

  function getLifePolicySelection(): LifePolicySelectionProjectionV1 | null {
    const { run, calendar } = state.simulation;
    const narrative = state.story.narrative;
    if (
      run.status !== "setup" ||
      calendar.lifePolicyId !== null ||
      narrative.status !== "completed" ||
      narrative.source?.kind !== "manifest_start"
    ) {
      return null;
    }
    const options = program.data.balance.lifePolicies.map((policy) => {
      const command = deepFreezePocValueV1({
        kind: "policy.choose" as const,
        policyId: policy.policyId,
      });
      const preview = previewCommand(command);
      if (!preview.allowed) throw new TypeError("LifePolicy option preview was rejected");
      return {
        policyId: policy.policyId,
        nameTextId: policy.nameTextId,
        apByPhase: policy.apByPhase,
        playerNightRecovery: policy.playerNightRecovery,
        nightRecoveryReasonId: policy.nightRecoveryReasonId,
        command,
        preview,
      };
    });
    const first = options[0];
    if (first === undefined) throw new TypeError("Story has no LifePolicy option");
    return deepFreezePocValueV1({ options: [first, ...options.slice(1)] });
  }

  function getTavernOpeningControl(): TavernOpeningControlProjectionV1 | null {
    const { calendar, tavern, activeWorkflow } = state.simulation;
    if (state.story.narrative.status === "active" || activeWorkflow?.kind === "world_action") {
      return null;
    }
    let kind: "tavern.opening.start" | "tavern.opening.continue" | "tavern.opening.finalize";
    let controlKind: TavernOpeningControlProjectionV1["kind"];
    if (activeWorkflow?.kind === "opening") {
      if (activeWorkflow.checkpoint === "ready_to_finalize") {
        kind = "tavern.opening.finalize";
        controlKind = "finalize";
      } else {
        kind = "tavern.opening.continue";
        controlKind = "continue";
      }
    } else {
      if (
        calendar.phase !== "evening" ||
        calendar.eveningResolved ||
        tavern.servicePlan === null ||
        tavern.servicePlan.mode === "closed"
      ) {
        return null;
      }
      kind = "tavern.opening.start";
      controlKind = "start";
    }
    const command = deepFreezePocValueV1({ kind });
    const preview = previewCommand(command);
    return deepFreezePocValueV1({
      kind: controlKind,
      command,
      preview,
    }) as TavernOpeningControlProjectionV1;
  }

  function getDemandForecast(): DemandForecastV1 | null {
    return demandForecastV1(state, program.data);
  }

  function getObligationForecast(): ObligationForecastV1 | null {
    return obligationForecastV1(state, program);
  }

  function getResolvedChecks(): readonly ResolvedCheckV1[] {
    return deepFreezePocValueV1(state.story.resolvedChecks.map(cloneResolvedCheckV1));
  }

  function getRunCompletion(): RunCompletionV1 | null {
    return state.simulation.run.completion === null
      ? null
      : deepFreezePocValueV1({ ...state.simulation.run.completion });
  }

  return Object.freeze({
    getAvailableActions,
    explainAvailability,
    previewCommand,
    previewTavernPlan,
    getGameViewStatus,
    getHudProjection,
    getInventoryProjection,
    getTavernProjection,
    getFacilitiesProjection,
    getLedgerProjection,
    getNarrativeProjection,
    getRunStartControl,
    getLifePolicySelection,
    getTavernOpeningControl,
    getDemandForecast,
    getObligationForecast,
    getResolvedChecks,
    getRunCompletion,
  });
}
