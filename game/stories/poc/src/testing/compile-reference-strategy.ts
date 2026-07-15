// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  canonicalJsonBytes,
  createPristineRunIntegrityV1,
  createTransactionalRngV1,
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parseRunId,
  type DeepReadonly,
  type IsoUtcInstant,
  type NonNegativeSafeInteger,
  type NonZeroUint32,
  type RunId,
  type RuntimeSchemaV1,
} from "@sillymaker/base";
import {
  createGameSessionV1,
  createRuntimeFailureBufferV1,
  createRuntimeFailureReporterV1,
} from "@sillymaker/base/runtime";
import type { GameSessionCompositionV1 } from "@sillymaker/base/runtime";

import { pocReferenceRunIdsV1, pocStoryIdentityV1 } from "../content/identity.js";
import {
  deepFreezePocValueV1,
  parseCalendarPhase,
  parseDayIndex,
  parseQuantity,
  parseStoryId,
  createPocGameSimulationV1,
  pocGameCommandSchemaV1,
  type CalendarPhase,
  type DayIndex,
  type IngredientId,
  type PocGameBootstrapInputV1,
  type PocGameCommandV1,
  type PocGameSimulationTypesV1,
  type PocGameSnapshotV1,
  type PocGameViewV1,
  type PocSimulationProgramV1,
  type TavernPlanV1,
} from "../gameplay/index.js";
import {
  commandForPocSemanticInvocationV1,
  pocSemanticInvocationSchemaV1,
  type PocSemanticActionDescriptorV1,
  type PocSemanticActionResultV1,
  type PocSemanticInvocationV1,
} from "../presentation/semantic-actions.js";
import { pocReferenceToolingFixtureByStrategyIdV1 } from "../tooling-fixtures.js";
import { createPocSemanticGamePortV1 } from "../application/create-poc-semantic-port.js";
import { pocStoryEntryV1 } from "../story-definition.js";
import { resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import type { PocHarnessAttemptV1, PocStoryHarnessV1 } from "./poc-story-harness.js";
import {
  pocReferenceStrategyDefinitionsV1,
  pocReferenceStrategyIdsV1,
  type PocReferenceDayDefinitionV1,
  type PocReferencePlanDecisionV1,
  type PocReferencePurchaseTargetV1,
  type PocReferenceScheduledActionV1,
  type PocReferenceStrategyDefinitionV1,
  type PocReferenceStrategyIdV1,
} from "./reference-strategy-definitions.js";

export interface PocReferenceCommandFixtureEntryV1 {
  readonly order: NonNegativeSafeInteger;
  readonly day: DayIndex;
  readonly phase: CalendarPhase;
  readonly commandSequence: NonNegativeSafeInteger;
  readonly invocation: DeepReadonly<PocSemanticInvocationV1>;
}

export interface PocReferenceCommandFixtureV1 {
  readonly schemaRevision: 1;
  readonly storyIdentity: typeof pocStoryIdentityV1;
  readonly strategyId: PocReferenceStrategyIdV1;
  readonly seed: NonZeroUint32;
  readonly runId: RunId;
  readonly entries: readonly DeepReadonly<PocReferenceCommandFixtureEntryV1>[];
}

export interface CompiledPocReferenceStrategyV1 {
  readonly strategyId: PocReferenceStrategyIdV1;
  readonly fixture: DeepReadonly<PocReferenceCommandFixtureV1>;
  readonly results: readonly DeepReadonly<PocSemanticActionResultV1>[];
  readonly finalView: DeepReadonly<PocGameViewV1>;
  readonly finalSnapshot: DeepReadonly<PocGameSnapshotV1>;
  readonly freeAp: NonNegativeSafeInteger;
  readonly attempts: readonly DeepReadonly<PocHarnessAttemptV1>[];
}

export interface PocReferencePlanObservationV1 {
  readonly warClue: boolean;
  readonly cash: number;
  readonly stamina: number;
  readonly inventory: readonly unknown[];
  readonly demand: readonly unknown[];
  readonly checkBand: string | null;
  readonly rejectionDiagnostics: readonly unknown[];
}

interface ExactDataRecordV1 {
  readonly [key: string]: unknown;
}

interface CompileContextV1 {
  readonly definition: DeepReadonly<PocReferenceStrategyDefinitionV1>;
  readonly seed: NonZeroUint32;
  readonly harness: PocStoryHarnessV1;
  readonly entries: PocReferenceCommandFixtureEntryV1[];
  readonly results: DeepReadonly<PocSemanticActionResultV1>[];
  readonly recordEvidence: boolean;
  warClue: boolean;
  stopped: boolean;
  freeAp: number;
  commandCount: number;
}

interface PurchaseTargetV1 {
  readonly day: DayIndex;
  readonly plan: DeepReadonly<TavernPlanV1>;
}

interface MutableBatchV1 {
  readonly ingredientId: IngredientId;
  readonly lastUsableDay: number;
  readonly stableId: string;
  remaining: number;
}

export function accumulatePocSurrenderedActionPointsV1(input: {
  readonly total: number;
  readonly before: number;
  readonly actionId: PocSemanticInvocationV1["actionId"];
  readonly resultKind: PocSemanticActionResultV1["kind"];
}): NonNegativeSafeInteger {
  const total = parseNonNegativeSafeInteger(input.total);
  const before = parseNonNegativeSafeInteger(input.before);
  if (input.actionId !== "action.advance_phase" || input.resultKind !== "committed") return total;

  const next = BigInt(total) + BigInt(before);
  if (next > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("reference strategy surrendered AP exceeds NonNegativeSafeInteger bounds");
  }
  return parseNonNegativeSafeInteger(Number(next));
}

const semanticActionIdsV1 = new Set<PocSemanticInvocationV1["actionId"]>([
  "action.choose_life_policy",
  "action.purchase",
  "action.prepare_food",
  "action.rest",
  "action.service_plan",
  "action.advance_phase",
  "action.pay_levy",
  "action.facility_window",
  "action.repair_sign_with_heroine",
  "action.old_trade_road",
  "action.apologize_to_heroine",
  "action.run_start",
  "action.tavern_opening_start",
  "action.tavern_opening_continue",
  "action.tavern_opening_finalize",
  "action.world_action_complete",
  "action.narrative_advance",
  "action.narrative_choose",
]);
const referenceStrategyIdSetV1 = new Set<string>(pocReferenceStrategyIdsV1);
const defaultPocGameSimulationV1 = resolveStoryForTestV1(pocStoryEntryV1).gameSimulation;
const programSimulationCacheV1 = new WeakMap<
  object,
  ReturnType<typeof createPocGameSimulationV1>
>();

function simulationForProgramV1(program: DeepReadonly<PocSimulationProgramV1>) {
  const cached = programSimulationCacheV1.get(program as object);
  if (cached !== undefined) return cached;
  const created = createPocGameSimulationV1(program);
  programSimulationCacheV1.set(program as object, created);
  return created;
}

function createProgramHarnessV1(
  program: DeepReadonly<PocSimulationProgramV1> | null,
  bootstrap: DeepReadonly<PocGameBootstrapInputV1>,
): PocStoryHarnessV1 {
  const gameSimulation =
    program === null ? defaultPocGameSimulationV1 : simulationForProgramV1(program);
  const initialSnapshot: PocGameSnapshotV1 = Object.freeze({
    state: gameSimulation.createInitialState(bootstrap),
    rng: createTransactionalRngV1(bootstrap.rngSeed).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  });
  const runtimeFailures = createRuntimeFailureBufferV1();
  const reportObserverFailure = createRuntimeFailureReporterV1({
    failures: runtimeFailures,
    now: () => "2026-07-15T00:00:00.000Z" as IsoUtcInstant,
    operation: "runtime.observer_notification_failed",
    category: "runtime",
    code: "runtime.async_operation_failed",
  });
  const created = createGameSessionV1<PocGameSimulationTypesV1>({
    initialSnapshot,
    commandSchema: gameSimulation.commandSchema,
    executionContext: undefined,
    executeAttempt: (snapshot, command) =>
      gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined),
    normalizeUnexpectedDispatchFault(error): never {
      throw error;
    },
    onObserverFailure: reportObserverFailure,
  });
  const semantic = createPocSemanticGamePortV1({
    gameSimulation,
    session: created.session,
    runtimeControl: created.runtimeControl,
    reportSubscriberFailure: reportObserverFailure,
  });
  const commandLog: GameSessionCompositionV1<PocGameSimulationTypesV1>["commandLog"] =
    created.commandLog;
  return Object.freeze({
    semantic,
    snapshotForTest: () => created.session.getCurrentSnapshot(),
    executedAttempts: () => commandLog.entries(),
  });
}

function exactDataRecordV1(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): ExactDataRecordV1 {
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
  return value as ExactDataRecordV1;
}

function dataPropertyV1(record: ExactDataRecordV1, key: string, label: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (
    descriptor === undefined ||
    descriptor.get !== undefined ||
    descriptor.set !== undefined ||
    !("value" in descriptor) ||
    descriptor.enumerable !== true
  ) {
    throw new TypeError(`invalid ${label} field ${key}`);
  }
  return descriptor.value;
}

function exactDataArrayV1(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`invalid ${label}`);
  }
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== value.length + 1 ||
    keys[value.length] !== "length" ||
    keys.slice(0, value.length).some((key, index) => key !== String(index))
  ) {
    throw new TypeError(`invalid ${label} fields`);
  }
  return value;
}

function parseReferenceStrategyIdV1(value: unknown): PocReferenceStrategyIdV1 {
  if (typeof value !== "string" || !referenceStrategyIdSetV1.has(value)) {
    throw new TypeError("invalid PoC reference StrategyId");
  }
  return value as PocReferenceStrategyIdV1;
}

function parseFixtureEntryV1(value: unknown, index: number): PocReferenceCommandFixtureEntryV1 {
  const entry = exactDataRecordV1(
    value,
    ["order", "day", "phase", "commandSequence", "invocation"],
    "PoC reference command fixture entry",
  );
  const order = parseNonNegativeSafeInteger(
    dataPropertyV1(entry, "order", "PoC reference command fixture entry"),
  );
  if (order !== index) throw new TypeError("PoC reference command fixture order is not contiguous");
  const day = parseDayIndex(dataPropertyV1(entry, "day", "PoC reference command fixture entry"));
  if (day > 7) throw new TypeError("PoC reference command fixture day exceeds D7");
  const commandSequence = parseNonNegativeSafeInteger(
    dataPropertyV1(entry, "commandSequence", "PoC reference command fixture entry"),
  );
  if (commandSequence !== index) {
    throw new TypeError("PoC reference command fixture sequence is not contiguous");
  }
  return deepFreezePocValueV1({
    order,
    day,
    phase: parseCalendarPhase(
      dataPropertyV1(entry, "phase", "PoC reference command fixture entry"),
    ),
    commandSequence,
    invocation: pocSemanticInvocationSchemaV1.parse(
      dataPropertyV1(entry, "invocation", "PoC reference command fixture entry"),
    ),
  });
}

export const pocReferenceCommandFixtureSchemaV1: RuntimeSchemaV1<PocReferenceCommandFixtureV1> =
  Object.freeze({
    parse(value: unknown): PocReferenceCommandFixtureV1 {
      const fixture = exactDataRecordV1(
        value,
        ["schemaRevision", "storyIdentity", "strategyId", "seed", "runId", "entries"],
        "PoC reference command fixture",
      );
      if (dataPropertyV1(fixture, "schemaRevision", "PoC reference command fixture") !== 1) {
        throw new TypeError("invalid PoC reference command fixture schema revision");
      }
      const identity = exactDataRecordV1(
        dataPropertyV1(fixture, "storyIdentity", "PoC reference command fixture"),
        ["id", "revision"],
        "PoC reference command fixture Story identity",
      );
      const storyId = parseStoryId(
        dataPropertyV1(identity, "id", "PoC reference command fixture Story identity"),
      );
      const storyRevision = dataPropertyV1(
        identity,
        "revision",
        "PoC reference command fixture Story identity",
      );
      if (storyId !== pocStoryIdentityV1.id || storyRevision !== pocStoryIdentityV1.revision) {
        throw new TypeError("PoC reference command fixture Story identity mismatch");
      }
      const strategyId = parseReferenceStrategyIdV1(
        dataPropertyV1(fixture, "strategyId", "PoC reference command fixture"),
      );
      const runId = parseRunId(dataPropertyV1(fixture, "runId", "PoC reference command fixture"));
      if (runId !== pocReferenceRunIdsV1[strategyId]) {
        throw new TypeError("PoC reference command fixture RunId mismatch");
      }
      const entries = exactDataArrayV1(
        dataPropertyV1(fixture, "entries", "PoC reference command fixture"),
        "PoC reference command fixture entries",
      ).map(parseFixtureEntryV1);
      return deepFreezePocValueV1({
        schemaRevision: 1 as const,
        storyIdentity: pocStoryIdentityV1,
        strategyId,
        seed: parseNonZeroUint32(dataPropertyV1(fixture, "seed", "PoC reference command fixture")),
        runId,
        entries,
      });
    },
  });

export function canonicalPocReferenceCommandFixtureBytesV1(
  fixtureValue: DeepReadonly<PocReferenceCommandFixtureV1>,
): Uint8Array {
  const fixture = pocReferenceCommandFixtureSchemaV1.parse(fixtureValue);
  const sorted = JSON.parse(new TextDecoder().decode(canonicalJsonBytes(fixture))) as unknown;
  return new TextEncoder().encode(`${JSON.stringify(sorted, null, 2)}\n`);
}

export function selectPocReferencePlanV1(
  decision: DeepReadonly<PocReferencePlanDecisionV1>,
  observation: DeepReadonly<PocReferencePlanObservationV1>,
): DeepReadonly<TavernPlanV1> {
  switch (decision.kind) {
    case "fixed":
      return decision.plan;
    case "select_d6_plan_from_war_clue":
      return observation.warClue ? decision.cluePlan : decision.noCluePlan;
  }
  throw new TypeError("unsupported PoC reference closed decision");
}

function canonicalBytesEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.length === rightBytes.length &&
    leftBytes.every((value, index) => value === rightBytes[index])
  );
}

function invocationValueForPocToolingCommandV1(command: DeepReadonly<PocGameCommandV1>): unknown {
  const emptyOptions = Object.freeze({});
  switch (command.kind) {
    case "run.start":
      return { kind: "invoke", actionId: "action.run_start", options: emptyOptions };
    case "policy.choose":
      return {
        kind: "invoke",
        actionId: "action.choose_life_policy",
        options: { policyId: command.policyId },
      };
    case "inventory.buy":
      return { kind: "invoke", actionId: "action.purchase", options: { lines: command.lines } };
    case "actor.prepare_food":
      return { kind: "invoke", actionId: "action.prepare_food", options: emptyOptions };
    case "actor.rest":
      return { kind: "invoke", actionId: "action.rest", options: emptyOptions };
    case "story.action.start":
      if (
        command.actionId !== "action.repair_sign_with_heroine" &&
        command.actionId !== "action.apologize_to_heroine"
      ) {
        throw new TypeError(`unsupported PoC tooling StoryAction ${command.actionId}`);
      }
      return { kind: "invoke", actionId: command.actionId, options: emptyOptions };
    case "facility.choose":
      if (command.opportunityId !== "action.facility_window") {
        throw new TypeError(
          `unsupported PoC tooling facility opportunity ${command.opportunityId}`,
        );
      }
      return {
        kind: "invoke",
        actionId: "action.facility_window",
        options: { choice: command.choice },
      };
    case "tavern.plan.set":
      return { kind: "invoke", actionId: "action.service_plan", options: { plan: command.plan } };
    case "tavern.opening.start":
      return { kind: "invoke", actionId: "action.tavern_opening_start", options: emptyOptions };
    case "tavern.opening.continue":
      return {
        kind: "invoke",
        actionId: "action.tavern_opening_continue",
        options: emptyOptions,
      };
    case "tavern.opening.finalize":
      return {
        kind: "invoke",
        actionId: "action.tavern_opening_finalize",
        options: emptyOptions,
      };
    case "world.action.begin":
      if (command.actionId !== "action.old_trade_road") {
        throw new TypeError(`unsupported PoC tooling WorldAction ${command.actionId}`);
      }
      return {
        kind: "invoke",
        actionId: "action.old_trade_road",
        options: { optionId: command.optionId },
      };
    case "world.action.complete":
      return { kind: "invoke", actionId: "action.world_action_complete", options: emptyOptions };
    case "narrative.advance":
      return { kind: "invoke", actionId: "action.narrative_advance", options: emptyOptions };
    case "narrative.choose":
      return {
        kind: "invoke",
        actionId: "action.narrative_choose",
        options: {
          sceneId: command.sceneId,
          nodeId: command.nodeId,
          choiceId: command.choiceId,
        },
      };
    case "calendar.advance_phase":
      return { kind: "invoke", actionId: "action.advance_phase", options: emptyOptions };
    case "levy.pay":
      return { kind: "invoke", actionId: "action.pay_levy", options: emptyOptions };
  }
  const unsupported: never = command;
  throw new TypeError(`unsupported PoC tooling command ${String(unsupported)}`);
}

function invocationForPocToolingCommandV1(
  commandValue: DeepReadonly<PocGameCommandV1>,
): DeepReadonly<PocSemanticInvocationV1> {
  const command = pocGameCommandSchemaV1.parse(commandValue);
  const invocation = pocSemanticInvocationSchemaV1.parse(
    invocationValueForPocToolingCommandV1(command),
  );
  if (!canonicalBytesEqualV1(commandForPocSemanticInvocationV1(invocation), command)) {
    throw new TypeError("PoC tooling command does not round-trip through its Semantic invocation");
  }
  return invocation;
}

function requireActionV1<TActionId extends PocSemanticInvocationV1["actionId"]>(
  harness: PocStoryHarnessV1,
  actionId: TActionId,
): Extract<PocSemanticActionDescriptorV1, { readonly actionId: TActionId }> {
  const action = harness.semantic
    .availableActions()
    .find((candidate) => candidate.actionId === actionId);
  if (action === undefined) throw new TypeError(`missing Semantic action ${actionId}`);
  return action as Extract<PocSemanticActionDescriptorV1, { readonly actionId: TActionId }>;
}

function planObservationV1(context: CompileContextV1): PocReferencePlanObservationV1 {
  const view = context.harness.semantic.observe().game;
  return Object.freeze({
    warClue: context.warClue,
    cash: view.hud.cash,
    stamina: view.hud.playerStamina.current,
    inventory: view.inventory.ingredientBatches,
    demand: view.demandForecast === null ? Object.freeze([]) : Object.freeze([view.demandForecast]),
    checkBand: view.resolvedChecks.at(-1)?.bandId ?? null,
    rejectionDiagnostics: Object.freeze(
      context.results.filter((result) => result.kind !== "committed"),
    ),
  });
}

function captureWarClueV1(context: CompileContextV1): void {
  const attempt = context.harness.executedAttempts().at(-1);
  if (attempt?.outcome.kind !== "committed") return;
  for (const fact of attempt.outcome.facts) {
    if (
      fact.kind === "fact.set" &&
      fact.factId === "fact.war_clue" &&
      fact.value.kind === "boolean"
    ) {
      context.warClue = fact.value.value;
    }
  }
}

async function dispatchInvocationV1(
  context: CompileContextV1,
  invocationValue: DeepReadonly<PocSemanticInvocationV1>,
): Promise<boolean> {
  if (context.stopped) return false;
  const invocation = pocSemanticInvocationSchemaV1.parse(invocationValue);
  if (!semanticActionIdsV1.has(invocation.actionId)) {
    throw new TypeError(`unknown Semantic invocation ${invocation.actionId}`);
  }
  const before = context.harness.semantic.observe();
  const snapshot = context.harness.snapshotForTest();
  const order = parseNonNegativeSafeInteger(context.commandCount);
  if (snapshot.commandSequence !== order) {
    throw new TypeError("reference compiler command sequence diverged from fixture order");
  }
  const action = requireActionV1(context.harness, invocation.actionId);
  if (action.actionId !== invocation.actionId) throw new TypeError("Semantic action mismatch");
  await context.harness.semantic.preview(invocation);
  const result = await context.harness.semantic.dispatch(invocation);
  context.commandCount = parseNonNegativeSafeInteger(context.commandCount + 1);
  if (context.recordEvidence) {
    context.entries.push(
      deepFreezePocValueV1({
        order,
        day: before.game.hud.day,
        phase: before.game.hud.phase,
        commandSequence: snapshot.commandSequence,
        invocation,
      }),
    );
    context.results.push(result);
  }

  if (context.recordEvidence) {
    const attempt = context.harness.executedAttempts().at(-1);
    if (
      result.kind !== "not_executed" &&
      (attempt === undefined || attempt.commandSequence.before !== snapshot.commandSequence)
    ) {
      throw new TypeError("reference compiler lost same-attempt CommandLog evidence");
    }
  }
  if (result.kind !== "committed") {
    context.stopped = true;
    return false;
  }
  context.freeAp = accumulatePocSurrenderedActionPointsV1({
    total: context.freeAp,
    before: before.game.hud.apRemaining,
    actionId: invocation.actionId,
    resultKind: result.kind,
  });
  await context.harness.semantic.waitForIdle(before.revision);
  if (invocation.actionId === "action.world_action_complete") captureWarClueV1(context);
  if (context.recordEvidence) context.harness.semantic.availableActions();
  return true;
}

async function dispatchDirectV1(
  context: CompileContextV1,
  actionId: Extract<
    PocSemanticInvocationV1,
    { readonly options: Readonly<Record<string, never>> }
  >["actionId"],
): Promise<boolean> {
  const action = requireActionV1(context.harness, actionId);
  if (action.delivery !== "direct") throw new TypeError(`${actionId} is not direct`);
  return dispatchInvocationV1(context, action.directInvocation);
}

async function dispatchChoiceV1(
  context: CompileContextV1,
  actionId:
    | "action.choose_life_policy"
    | "action.facility_window"
    | "action.old_trade_road"
    | "action.narrative_choose",
  optionId: string,
): Promise<boolean> {
  const action = requireActionV1(context.harness, actionId);
  if (action.delivery !== "choices") throw new TypeError(`${actionId} is not choices`);
  const option = action.options.find((candidate) => candidate.optionId === optionId);
  if (option === undefined) throw new TypeError(`missing ${actionId} option ${optionId}`);
  return dispatchInvocationV1(context, option.invocation);
}

async function drainNarrativeV1(
  context: CompileContextV1,
  choiceByScene: Readonly<Record<string, string>> = {},
): Promise<boolean> {
  for (let count = 0; context.harness.semantic.observe().narrative !== null; count += 1) {
    if (count >= 64) throw new RangeError("reference Narrative did not settle");
    const narrative = context.harness.semantic.observe().narrative;
    if (narrative === null) return true;
    if (narrative.choices.length === 0) {
      if (!(await dispatchDirectV1(context, "action.narrative_advance"))) return false;
      continue;
    }
    const sceneId = narrative.cursor?.sceneId;
    if (sceneId === undefined) throw new TypeError("choice Narrative has no SceneId");
    const choiceId = choiceByScene[sceneId];
    if (choiceId === undefined) throw new TypeError(`missing reference choice for ${sceneId}`);
    if (!(await dispatchChoiceV1(context, "action.narrative_choose", choiceId))) return false;
  }
  return true;
}

async function advancePhaseV1(context: CompileContextV1): Promise<boolean> {
  if (!(await dispatchDirectV1(context, "action.advance_phase"))) return false;
  return drainNarrativeV1(context, {
    "scene.supplier_invoice": "choice.supplier_invoice.intellect_b",
  });
}

function safeQuantityProductV1(left: number, right: number, label: string): number {
  const value = BigInt(left) * BigInt(right);
  if (value <= 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`${label} exceeds Quantity bounds`);
  }
  return Number(value);
}

function addDemandV1(
  demands: Map<IngredientId, Map<number, number>>,
  ingredientId: IngredientId,
  day: number,
  quantity: number,
): void {
  const byDay = demands.get(ingredientId) ?? new Map<number, number>();
  const next = BigInt(byDay.get(day) ?? 0) + BigInt(quantity);
  if (next > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError("purchase demand overflow");
  byDay.set(day, Number(next));
  demands.set(ingredientId, byDay);
}

function targetPlansV1(
  context: CompileContextV1,
  target: PocReferencePurchaseTargetV1,
): readonly PurchaseTargetV1[] {
  const day = context.harness.semantic.observe().game.hud.day;
  const currentIndex = context.definition.days.findIndex((candidate) => candidate.day === day);
  if (currentIndex < 0) throw new TypeError(`reference definition has no D${day}`);
  let rows: readonly DeepReadonly<PocReferenceDayDefinitionV1>[];
  if (target === "current") {
    rows = [context.definition.days[currentIndex]!];
  } else if (target === "current_and_next") {
    const next = context.definition.days[currentIndex + 1];
    if (next === undefined) throw new TypeError("current-and-next purchase has no next day");
    rows = [context.definition.days[currentIndex]!, next];
  } else {
    rows = context.definition.days.filter(({ day: targetDay }) => targetDay >= 4 && targetDay <= 6);
    if (rows.length !== 3) throw new TypeError("D4-D6 purchase target is incomplete");
  }
  return deepFreezePocValueV1(
    rows.map((row) => ({
      day: row.day,
      plan:
        target === "d4_d5_d6_clue" && row.plan.kind === "select_d6_plan_from_war_clue"
          ? row.plan.cluePlan
          : selectPocReferencePlanV1(row.plan, planObservationV1(context)),
    })),
  );
}

function purchaseLinesV1(
  context: CompileContextV1,
  target: PocReferencePurchaseTargetV1,
): readonly {
  readonly ingredientId: IngredientId;
  readonly quantity: ReturnType<typeof parseQuantity>;
}[] {
  const purchase = requireActionV1(context.harness, "action.purchase");
  const planAction = requireActionV1(context.harness, "action.service_plan");
  if (purchase.delivery !== "form" || purchase.form.kind !== "purchase") {
    throw new TypeError("purchase Semantic action has no purchase form");
  }
  if (planAction.delivery !== "form" || planAction.form.kind !== "tavern_plan") {
    throw new TypeError("service-plan Semantic action has no Tavern form");
  }
  const targets = targetPlansV1(context, target);
  const recipeById = new Map(
    planAction.form.input.recipes.map((recipe) => [recipe.recipeId, recipe] as const),
  );
  const demands = new Map<IngredientId, Map<number, number>>();
  for (const targetPlan of targets) {
    for (const line of targetPlan.plan.menu) {
      const recipe = recipeById.get(line.recipeId);
      if (recipe === undefined) throw new TypeError(`missing unlocked Recipe ${line.recipeId}`);
      for (const ingredient of recipe.ingredients) {
        addDemandV1(
          demands,
          ingredient.ingredientId,
          targetPlan.day,
          safeQuantityProductV1(
            ingredient.quantity,
            line.portions,
            `Recipe ${line.recipeId} ingredient demand`,
          ),
        );
      }
    }
  }

  const plannedRefrigeration = target === "d4_d5_d6_clue";
  const view = context.harness.semantic.observe().game;
  const ingredientById = new Map(
    purchase.form.input.ingredients.map(
      (ingredient) => [ingredient.ingredientId, ingredient] as const,
    ),
  );
  const batchesByIngredient = new Map<IngredientId, MutableBatchV1[]>();
  for (const batch of view.inventory.ingredientBatches) {
    const ingredient = ingredientById.get(batch.ingredientId);
    if (ingredient === undefined) throw new TypeError(`missing Ingredient ${batch.ingredientId}`);
    const extension =
      plannedRefrigeration && ingredient.refrigeratable && !batch.refrigerationExtended ? 2 : 0;
    const batches = batchesByIngredient.get(batch.ingredientId) ?? [];
    batches.push({
      ingredientId: batch.ingredientId,
      remaining: batch.quantity,
      lastUsableDay: batch.lastUsableDay + extension,
      stableId: batch.batchId,
    });
    batchesByIngredient.set(batch.ingredientId, batches);
  }
  for (const batches of batchesByIngredient.values()) {
    batches.sort((left, right) =>
      left.lastUsableDay !== right.lastUsableDay
        ? left.lastUsableDay - right.lastUsableDay
        : left.stableId < right.stableId
          ? -1
          : left.stableId > right.stableId
            ? 1
            : 0,
    );
  }

  const shortages = new Map<IngredientId, number>();
  for (const [ingredientId, byDay] of demands) {
    const ingredient = ingredientById.get(ingredientId);
    if (ingredient === undefined) throw new TypeError(`missing Ingredient ${ingredientId}`);
    const batches = batchesByIngredient.get(ingredientId) ?? [];
    const newBatchLastUsableDay =
      view.hud.day +
      ingredient.shelfLifeDays -
      1 +
      (plannedRefrigeration && ingredient.refrigeratable ? 2 : 0);
    let shortage = 0;
    for (const [targetDay, requested] of [...byDay].sort(([left], [right]) => left - right)) {
      let remaining = requested;
      for (const batch of batches) {
        if (remaining === 0 || batch.lastUsableDay < targetDay || batch.remaining === 0) continue;
        const consumed = Math.min(remaining, batch.remaining);
        batch.remaining -= consumed;
        remaining -= consumed;
      }
      if (remaining > 0 && newBatchLastUsableDay < targetDay) {
        throw new TypeError(`new ${ingredientId} would spoil before D${targetDay}`);
      }
      shortage += remaining;
    }
    if (shortage > 0) shortages.set(ingredientId, shortage);
  }

  return deepFreezePocValueV1(
    [...shortages]
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([ingredientId, quantity]) => ({ ingredientId, quantity: parseQuantity(quantity) })),
  );
}

async function dispatchPurchaseV1(
  context: CompileContextV1,
  target: PocReferencePurchaseTargetV1,
): Promise<boolean> {
  const lines = purchaseLinesV1(context, target);
  if (lines.length === 0) return true;
  return dispatchInvocationV1(
    context,
    deepFreezePocValueV1({
      kind: "invoke",
      actionId: "action.purchase",
      options: { lines },
    }),
  );
}

async function dispatchPlanV1(
  context: CompileContextV1,
  decision: DeepReadonly<PocReferencePlanDecisionV1>,
): Promise<boolean> {
  const action = requireActionV1(context.harness, "action.service_plan");
  if (action.delivery !== "form" || action.form.kind !== "tavern_plan") {
    throw new TypeError("service-plan Semantic action has no Tavern form");
  }
  const plan = selectPocReferencePlanV1(decision, planObservationV1(context));
  if (!action.form.input.serviceModes.some(({ mode }) => mode === plan.mode)) {
    throw new TypeError(`missing ServiceMode ${plan.mode}`);
  }
  for (const line of plan.menu) {
    if (!action.form.input.recipes.some(({ recipeId }) => recipeId === line.recipeId)) {
      throw new TypeError(`missing unlocked Recipe ${line.recipeId}`);
    }
  }
  return dispatchInvocationV1(
    context,
    deepFreezePocValueV1({
      kind: "invoke",
      actionId: "action.service_plan",
      options: { plan },
    }),
  );
}

async function executeScheduledActionV1(
  context: CompileContextV1,
  action: DeepReadonly<PocReferenceScheduledActionV1>,
): Promise<boolean> {
  switch (action.kind) {
    case "purchase":
      return dispatchPurchaseV1(context, action.target);
    case "prepare_food":
      return dispatchDirectV1(context, "action.prepare_food");
    case "rest":
      return dispatchDirectV1(context, "action.rest");
    case "build_facility":
      return dispatchChoiceV1(context, "action.facility_window", action.facilityId);
    case "repair_sign":
      if (!(await dispatchDirectV1(context, "action.repair_sign_with_heroine"))) return false;
      return drainNarrativeV1(context, {
        "scene.repair_sign_with_heroine": action.choiceId,
      });
    case "begin_old_trade_road":
      if (!(await dispatchChoiceV1(context, "action.old_trade_road", action.optionId)))
        return false;
      return drainNarrativeV1(context);
    case "complete_old_trade_road":
      return dispatchDirectV1(context, "action.world_action_complete");
  }
  const unsupported: never = action;
  throw new TypeError(`unsupported reference action ${String(unsupported)}`);
}

async function executeActionsV1(
  context: CompileContextV1,
  actions: readonly DeepReadonly<PocReferenceScheduledActionV1>[],
): Promise<boolean> {
  for (const action of actions) {
    if (!(await executeScheduledActionV1(context, action))) return false;
  }
  return true;
}

function finalizeCompilationV1(context: CompileContextV1): CompiledPocReferenceStrategyV1 {
  const fixture = pocReferenceCommandFixtureSchemaV1.parse({
    schemaRevision: 1,
    storyIdentity: pocStoryIdentityV1,
    strategyId: context.definition.strategyId,
    seed: context.seed,
    runId: context.definition.runId,
    entries: context.entries,
  });
  return Object.freeze({
    strategyId: context.definition.strategyId,
    fixture,
    results: Object.freeze([...context.results]),
    finalView: context.harness.semantic.observe().game,
    finalSnapshot: context.harness.snapshotForTest(),
    freeAp: parseNonNegativeSafeInteger(context.freeAp),
    attempts: context.recordEvidence
      ? Object.freeze([...context.harness.executedAttempts()])
      : Object.freeze([]),
  });
}

function createCompileContextV1(
  definition: DeepReadonly<PocReferenceStrategyDefinitionV1>,
  seedValue: NonZeroUint32,
  program: DeepReadonly<PocSimulationProgramV1> | null,
  recordEvidence: boolean,
): CompileContextV1 {
  const registered = pocReferenceStrategyDefinitionsV1[definition.strategyId];
  if (
    registered !== definition ||
    definition.runId !== pocReferenceRunIdsV1[definition.strategyId]
  ) {
    throw new TypeError("reference compiler requires one registered frozen strategy definition");
  }
  const seed = parseNonZeroUint32(seedValue);
  return {
    definition,
    seed,
    harness: createProgramHarnessV1(
      program,
      Object.freeze({ rngSeed: seed, runId: definition.runId }),
    ),
    entries: [],
    results: [],
    recordEvidence,
    warClue: false,
    stopped: false,
    freeAp: 0,
    commandCount: 0,
  };
}

async function compilePocStrategyForSeedAndProgramV1(
  definition: DeepReadonly<PocReferenceStrategyDefinitionV1>,
  seedValue: NonZeroUint32,
  program: DeepReadonly<PocSimulationProgramV1> | null,
  recordEvidence: boolean,
): Promise<CompiledPocReferenceStrategyV1> {
  const context = createCompileContextV1(definition, seedValue, program, recordEvidence);

  if (!(await dispatchDirectV1(context, "action.run_start"))) return finalizeCompilationV1(context);
  if (!(await drainNarrativeV1(context))) return finalizeCompilationV1(context);
  if (!(await dispatchChoiceV1(context, "action.choose_life_policy", definition.policyId))) {
    return finalizeCompilationV1(context);
  }

  for (const day of definition.days) {
    if (!(await executeActionsV1(context, day.morningActions)))
      return finalizeCompilationV1(context);
    if (!(await advancePhaseV1(context))) return finalizeCompilationV1(context);
    if (!(await executeActionsV1(context, day.afternoonActions))) {
      return finalizeCompilationV1(context);
    }
    if (!(await dispatchPlanV1(context, day.plan))) return finalizeCompilationV1(context);
    if (!(await advancePhaseV1(context))) return finalizeCompilationV1(context);
    for (let index = 0; index < day.beforeServiceActions.length; index += 1) {
      if (!(await dispatchDirectV1(context, "action.rest"))) {
        return finalizeCompilationV1(context);
      }
    }
    const selectedPlan = selectPocReferencePlanV1(day.plan, planObservationV1(context));
    if (selectedPlan.mode !== "closed") {
      if (!(await dispatchDirectV1(context, "action.tavern_opening_start"))) {
        return finalizeCompilationV1(context);
      }
      if (!(await dispatchDirectV1(context, "action.tavern_opening_finalize"))) {
        return finalizeCompilationV1(context);
      }
    }
    if (!(await advancePhaseV1(context))) return finalizeCompilationV1(context);
  }

  if (!(await advancePhaseV1(context))) return finalizeCompilationV1(context);
  await dispatchDirectV1(context, "action.pay_levy");
  return finalizeCompilationV1(context);
}

export function compilePocStrategyForSeedV1(
  definition: DeepReadonly<PocReferenceStrategyDefinitionV1>,
  seedValue: NonZeroUint32,
): Promise<CompiledPocReferenceStrategyV1> {
  return compilePocStrategyForSeedAndProgramV1(definition, seedValue, null, true);
}

export function compilePocStrategyWithProgramV1(
  definition: DeepReadonly<PocReferenceStrategyDefinitionV1>,
  seedValue: NonZeroUint32,
  program: DeepReadonly<PocSimulationProgramV1>,
): Promise<CompiledPocReferenceStrategyV1> {
  return compilePocStrategyForSeedAndProgramV1(definition, seedValue, program, true);
}

export function compilePocStrategyMetricsV1(
  definition: DeepReadonly<PocReferenceStrategyDefinitionV1>,
  seedValue: NonZeroUint32,
  program: DeepReadonly<PocSimulationProgramV1> | null = null,
): Promise<CompiledPocReferenceStrategyV1> {
  return compilePocStrategyForSeedAndProgramV1(definition, seedValue, program, false);
}

export async function executePocToolingCommandsV1(
  strategyId: PocReferenceStrategyIdV1,
  commands: readonly DeepReadonly<PocGameCommandV1>[],
): Promise<CompiledPocReferenceStrategyV1> {
  const source = pocReferenceToolingFixtureByStrategyIdV1[strategyId];
  if (source === undefined || commands !== source.commands) {
    throw new TypeError("PoC tooling compilation requires the authoritative command reference");
  }
  const definition = pocReferenceStrategyDefinitionsV1[strategyId];
  const context = createCompileContextV1(definition, source.seed, null, true);

  for (const [order, commandValue] of commands.entries()) {
    const command = pocGameCommandSchemaV1.parse(commandValue);
    const invocation = invocationForPocToolingCommandV1(command);
    if (!(await dispatchInvocationV1(context, invocation))) {
      throw new TypeError(`${strategyId} tooling command ${order} did not commit`);
    }
    const attempt = context.harness.executedAttempts().at(-1);
    if (
      attempt === undefined ||
      attempt.source !== "game" ||
      attempt.commandSequence.before !== order ||
      !canonicalBytesEqualV1(attempt.command, command)
    ) {
      throw new TypeError(`${strategyId} tooling command ${order} lost same-attempt evidence`);
    }
  }

  const compiled = finalizeCompilationV1(context);
  if (
    compiled.fixture.entries.length !== commands.length ||
    compiled.attempts.length !== commands.length ||
    compiled.results.length !== commands.length
  ) {
    throw new TypeError(`${strategyId} tooling compilation produced an incomplete run`);
  }
  return compiled;
}

export async function compilePocToolingCommandsV1(
  strategyId: PocReferenceStrategyIdV1,
  commands: readonly DeepReadonly<PocGameCommandV1>[],
): Promise<DeepReadonly<PocReferenceCommandFixtureV1>> {
  return (await executePocToolingCommandsV1(strategyId, commands)).fixture;
}

export function compilePocReferenceStrategyV1(
  definition: DeepReadonly<PocReferenceStrategyDefinitionV1>,
): Promise<CompiledPocReferenceStrategyV1> {
  if (pocReferenceStrategyDefinitionsV1[definition.strategyId] !== definition) {
    throw new TypeError("reference compilation requires one registered frozen strategy definition");
  }
  const source = pocReferenceToolingFixtureByStrategyIdV1[definition.strategyId];
  return executePocToolingCommandsV1(definition.strategyId, source.commands);
}
