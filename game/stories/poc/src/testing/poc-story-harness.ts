// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
  createTransactionalRngV1,
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parseRunId,
  rngStateV1Schema,
} from "@sillymaker/base";
import type { DeepReadonly, IsoUtcInstant } from "@sillymaker/base";
import {
  createGameSessionV1,
  createRuntimeFailureBufferV1,
  createRuntimeFailureReporterV1,
} from "@sillymaker/base/runtime";
import type { GameSessionCompositionV1, GameSessionV1 } from "@sillymaker/base/runtime";
import { resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import { pocRejectionReasonSchemaV1 } from "../gameplay/contracts/schemas.js";
import { parseIngredientId, parsePolicyId } from "../gameplay/contracts/ids.js";
import { parseQuantity } from "../gameplay/contracts/values.js";
import type {
  PocGameBootstrapInputV1,
  PocGameQueriesV1,
  PocGameSimulationTypesV1,
  PocGameSnapshotV1,
} from "../gameplay/contracts/types.js";
import type { PocGameSimulationV1 } from "../gameplay/game-simulation.js";
import { pocGameStateSchemaV1 } from "../gameplay/runtime-schemas.js";
import {
  projectPocSemanticActionResultV1,
  type PocSemanticActionResultV1,
  type PocSemanticInvocationV1,
} from "../presentation/semantic-actions.js";
import type { PocResolvedGameV1 } from "../story-definition.js";
import { pocStoryEntryV1 } from "../story-definition.js";
import {
  createPocSemanticGamePortV1,
  type PocSemanticGamePortV1,
} from "../application/create-poc-semantic-port.js";

export type PocHarnessAttemptV1 = ReturnType<
  GameSessionCompositionV1<PocGameSimulationTypesV1>["commandLog"]["entries"]
>[number];

export interface PocStoryHarnessV1 {
  readonly semantic: PocSemanticGamePortV1;
  snapshotForTest(): DeepReadonly<PocGameSnapshotV1>;
  executedAttempts(): readonly DeepReadonly<PocHarnessAttemptV1>[];
}

interface InternalPocStoryHarnessV1 extends PocStoryHarnessV1 {
  readonly runtimeControl: GameSessionCompositionV1<PocGameSimulationTypesV1>["runtimeControl"];
}

interface CreateInternalPocStoryHarnessInputV1 {
  readonly bootstrap: DeepReadonly<PocGameBootstrapInputV1>;
  readonly resolved?: PocResolvedGameV1;
  readonly semanticSimulation?: PocGameSimulationV1;
}

type PocSessionDispatchResultV1 = Awaited<
  ReturnType<GameSessionV1<PocGameSimulationTypesV1>["dispatch"]>
>;

const noOptionsV1 = Object.freeze({});
const consumeLastApInvocationValueV1 = Object.freeze({
  kind: "invoke" as const,
  actionId: "action.purchase" as const,
  options: Object.freeze({
    lines: Object.freeze([
      Object.freeze({
        ingredientId: parseIngredientId("ingredient.coarse_grain"),
        quantity: parseQuantity(1),
      }),
    ]),
  }),
});
const requiresApInvocationValueV1 = Object.freeze({
  kind: "invoke" as const,
  actionId: "action.prepare_food" as const,
  options: noOptionsV1,
});

function createInitialSnapshotV1(
  gameSimulation: PocGameSimulationV1,
  bootstrap: DeepReadonly<PocGameBootstrapInputV1>,
): PocGameSnapshotV1 {
  return Object.freeze({
    state: gameSimulation.createInitialState(bootstrap),
    rng: createTransactionalRngV1(bootstrap.rngSeed).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  });
}

function createInternalPocStoryHarnessV1(
  input: CreateInternalPocStoryHarnessInputV1,
): InternalPocStoryHarnessV1 {
  const resolved = input.resolved ?? resolveStoryForTestV1(pocStoryEntryV1);
  const gameSimulation = resolved.gameSimulation;
  const runtimeFailures = createRuntimeFailureBufferV1();
  const reportObserverFailure = createRuntimeFailureReporterV1({
    failures: runtimeFailures,
    now: () => "2026-07-15T00:00:00.000Z" as IsoUtcInstant,
    operation: "runtime.observer_notification_failed",
    category: "runtime",
    code: "runtime.async_operation_failed",
  });
  const created = createGameSessionV1<PocGameSimulationTypesV1>({
    initialSnapshot: createInitialSnapshotV1(gameSimulation, input.bootstrap),
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
    gameSimulation: input.semanticSimulation ?? gameSimulation,
    session: created.session,
    runtimeControl: created.runtimeControl,
    reportSubscriberFailure: reportObserverFailure,
  });

  return Object.freeze({
    semantic,
    runtimeControl: created.runtimeControl,
    snapshotForTest: () => created.session.getCurrentSnapshot(),
    executedAttempts: () => created.commandLog.entries(),
  });
}

function publicHarnessV1(internal: InternalPocStoryHarnessV1): PocStoryHarnessV1 {
  return Object.freeze({
    semantic: internal.semantic,
    snapshotForTest: internal.snapshotForTest,
    executedAttempts: internal.executedAttempts,
  });
}

async function requireCommittedSemanticV1(
  semantic: PocSemanticGamePortV1,
  invocation: DeepReadonly<PocSemanticInvocationV1>,
): Promise<void> {
  const result = await semantic.dispatch(invocation);
  if (result.kind !== "committed") {
    throw new TypeError(`expected committed Semantic dispatch, received ${result.kind}`);
  }
}

async function enterNightOwlRunV1(semantic: PocSemanticGamePortV1): Promise<void> {
  await requireCommittedSemanticV1(
    semantic,
    Object.freeze({ kind: "invoke", actionId: "action.run_start", options: noOptionsV1 }),
  );
  for (let count = 0; semantic.observe().narrative !== null; count += 1) {
    if (count >= 32) throw new RangeError("manifest Narrative did not settle");
    await requireCommittedSemanticV1(
      semantic,
      Object.freeze({
        kind: "invoke",
        actionId: "action.narrative_advance",
        options: noOptionsV1,
      }),
    );
  }
  await requireCommittedSemanticV1(
    semantic,
    Object.freeze({
      kind: "invoke",
      actionId: "action.choose_life_policy",
      options: Object.freeze({ policyId: parsePolicyId("policy.night_owl") }),
    }),
  );
}

export function fixedPocBootstrapV1(): PocGameBootstrapInputV1 {
  return Object.freeze({
    rngSeed: parseNonZeroUint32(0x0002_3049),
    runId: parseRunId("00000000-0000-4000-8000-000000000101"),
  });
}

export function createPocStoryHarnessV1(input: {
  readonly bootstrap: DeepReadonly<PocGameBootstrapInputV1>;
}): PocStoryHarnessV1 {
  return publicHarnessV1(createInternalPocStoryHarnessV1(input));
}

export function consumeLastApInvocationV1(): Extract<
  PocSemanticInvocationV1,
  { readonly actionId: "action.purchase" }
> {
  return consumeLastApInvocationValueV1;
}

export function requiresApInvocationV1(): Extract<
  PocSemanticInvocationV1,
  { readonly actionId: "action.prepare_food" }
> {
  return requiresApInvocationValueV1;
}

export interface BlockedPocStoryHarnessV1 extends PocStoryHarnessV1 {
  releaseQueueFront(): void;
}

export async function createBlockedPocStoryHarnessV1(): Promise<BlockedPocStoryHarnessV1> {
  const internal = createInternalPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });
  await enterNightOwlRunV1(internal.semantic);
  if (internal.snapshotForTest().state.simulation.calendar.apRemaining !== 1) {
    throw new TypeError("night-owl D1 setup did not leave exactly one AP");
  }

  let releaseQueueFront = (): void => {
    throw new TypeError("queue-front barrier was not initialized");
  };
  const barrier = new Promise<void>((resolve) => {
    releaseQueueFront = resolve;
  });
  const queueFront = internal.runtimeControl.enqueueAuthoritative(
    async () => {
      await barrier;
      return Object.freeze({ kind: "preserve" as const, result: undefined });
    },
    (error): never => {
      throw error;
    },
  );
  void queueFront.catch(() => undefined);

  return Object.freeze({
    ...publicHarnessV1(internal),
    releaseQueueFront,
  });
}

export interface PocReplacementPublicationHarnessV1 extends PocStoryHarnessV1 {
  nextSemanticPublication(): ReturnType<PocSemanticGamePortV1["waitForIdle"]>;
  replaceWithEquivalentStateAtQueueFront(): Promise<void>;
}

export function createPocReplacementPublicationHarnessV1(
  source: "lifecycle" | "load",
): PocReplacementPublicationHarnessV1 {
  const internal = createInternalPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });
  return Object.freeze({
    ...publicHarnessV1(internal),
    nextSemanticPublication: () =>
      internal.semantic.waitForIdle(internal.semantic.observe().revision),
    async replaceWithEquivalentStateAtQueueFront() {
      await internal.runtimeControl.enqueueAuthoritative(
        async (current) =>
          Object.freeze({
            kind: "replace" as const,
            snapshot: createGameSnapshotEnvelopeSchemaV1(
              pocGameStateSchemaV1,
              rngStateV1Schema,
            ).parse(current),
            result: source,
            anchor: "replace_replay_base" as const,
          }),
        (error): never => {
          throw error;
        },
      );
    },
  });
}

export interface QueriesCountingPocStoryHarnessV1 extends PocStoryHarnessV1 {
  createQueriesCalls(): number;
  projectedGameViewFromWitness(): ReturnType<PocGameSimulationV1["projectGameView"]>;
  projectedNarrativeFromWitness(): ReturnType<PocGameQueriesV1["getNarrativeProjection"]>;
  projectedActionsFromWitness(): ReturnType<PocSemanticGamePortV1["availableActions"]>;
  publishBusyReadyWithoutReplacement(): Promise<void>;
}

export function createQueriesCountingPocStoryHarnessV1(): QueriesCountingPocStoryHarnessV1 {
  const resolved = resolveStoryForTestV1(pocStoryEntryV1);
  const gameSimulation = resolved.gameSimulation;
  let createQueriesCalls = 0;
  let currentWitness: PocGameQueriesV1 | undefined;
  let projectedGame: ReturnType<PocGameSimulationV1["projectGameView"]> | undefined;
  let projectedNarrative: ReturnType<PocGameQueriesV1["getNarrativeProjection"]> = null;
  let narrativeCaptured = false;

  const semanticSimulation: PocGameSimulationV1 = Object.freeze({
    ...gameSimulation,
    createQueries(
      state: Parameters<PocGameSimulationV1["createQueries"]>[0],
    ): ReturnType<PocGameSimulationV1["createQueries"]> {
      createQueriesCalls += 1;
      const queries = gameSimulation.createQueries(state);
      const witness: PocGameQueriesV1 = Object.freeze({
        ...queries,
        getNarrativeProjection() {
          projectedNarrative = queries.getNarrativeProjection();
          narrativeCaptured = true;
          return projectedNarrative;
        },
      });
      currentWitness = witness;
      return witness;
    },
    projectGameView(
      queries: Parameters<PocGameSimulationV1["projectGameView"]>[0],
    ): ReturnType<PocGameSimulationV1["projectGameView"]> {
      if (queries !== currentWitness) throw new TypeError("GameView used different Queries");
      projectedGame = gameSimulation.projectGameView(queries);
      return projectedGame;
    },
  });
  const internal = createInternalPocStoryHarnessV1({
    bootstrap: fixedPocBootstrapV1(),
    resolved,
    semanticSimulation,
  });
  const initialPublication = internal.semantic.observe();
  const projectedActions = initialPublication.actions;
  if (!narrativeCaptured) throw new TypeError("Narrative witness was not projected");

  return Object.freeze({
    ...publicHarnessV1(internal),
    createQueriesCalls: () => createQueriesCalls,
    projectedGameViewFromWitness() {
      if (projectedGame === undefined) throw new TypeError("GameView witness was not projected");
      return projectedGame;
    },
    projectedNarrativeFromWitness: () => projectedNarrative,
    projectedActionsFromWitness: () => projectedActions,
    async publishBusyReadyWithoutReplacement() {
      await internal.runtimeControl.readAtQueueFront(() => undefined);
    },
  });
}

export function extraSemanticInvocationV1(): unknown {
  return Object.freeze({
    kind: "invoke",
    actionId: "action.run_start",
    options: noOptionsV1,
    unexpected: true,
  });
}

export function createPocSemanticResultFixtureV1(
  source: {
    readonly kind: "committed" | "rejected" | "faulted" | "not_executed";
  }["kind"],
): { readonly dispatch: () => Promise<PocSemanticActionResultV1> } {
  const resolved = resolveStoryForTestV1(pocStoryEntryV1);
  const snapshot = createInitialSnapshotV1(resolved.gameSimulation, fixedPocBootstrapV1());
  let result: PocSessionDispatchResultV1;
  switch (source) {
    case "committed":
      result = Object.freeze({
        kind: "executed",
        execution: Object.freeze({ kind: "committed", snapshot, facts: Object.freeze([]) }),
      });
      break;
    case "rejected":
      result = Object.freeze({
        kind: "executed",
        execution: Object.freeze({
          kind: "rejected",
          snapshot,
          reasons: Object.freeze([
            pocRejectionReasonSchemaV1.parse({
              code: "calendar.insufficient_ap",
              details: { required: 1, available: 0 },
            }),
          ]),
        }),
      });
      break;
    case "faulted":
      result = Object.freeze({
        kind: "executed",
        execution: Object.freeze({
          kind: "faulted",
          snapshot,
          fault: Object.freeze({
            category: "command_handler" as const,
            code: "command.handler_threw" as const,
            ruleSlot: null,
            message: "private test fault",
          }),
        }),
      });
      break;
    case "not_executed":
      result = Object.freeze({ kind: "not_executed", code: "fault_paused" });
      break;
  }

  return Object.freeze({
    dispatch: async () => projectPocSemanticActionResultV1(result),
  });
}
