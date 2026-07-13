// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parseTextId } from "@sillymaker/base";
import type {
  DeepReadonly,
  RuntimeSessionStatusV1,
  RuntimeSchemaV1,
  SemanticGamePortV1,
  TextId,
} from "@sillymaker/base";
import { createSemanticGamePortV1 } from "@sillymaker/base/runtime";
import type { GameSessionRuntimeControlV1, GameSessionV1 } from "@sillymaker/base/runtime";

import { e2eRejectionReasonSchemaV1 } from "../gameplay/contracts/index.js";
import type {
  E2eGameCommandV1,
  E2eGameQueriesV1,
  E2eGameSimulationTypesV1,
  E2eGameViewV1,
  E2eRejectionReasonV1,
} from "../gameplay/contracts/index.js";
import type { E2eGameSimulationV1 } from "../gameplay/game-simulation.js";
import { requireExactObjectV1 } from "../gameplay/contracts/state.js";

export type E2eNoSemanticParametersV1 = Readonly<Record<string, never>>;

export type E2eSemanticInvocationV1 =
  | {
      readonly actionId: "action.e2e.start";
      readonly parameters: E2eNoSemanticParametersV1;
    }
  | {
      readonly actionId: "action.e2e.increment";
      readonly parameters: E2eNoSemanticParametersV1;
    }
  | {
      readonly actionId: "action.e2e.choose";
      readonly parameters: { readonly choice: "left" | "right" };
    }
  | {
      readonly actionId: "action.e2e.continue";
      readonly parameters: E2eNoSemanticParametersV1;
    }
  | {
      readonly actionId: "action.e2e.complete";
      readonly parameters: E2eNoSemanticParametersV1;
    };

export type E2eSemanticActionDescriptorV1 = {
  readonly [TInvocation in E2eSemanticInvocationV1 as TInvocation["actionId"]]: {
    readonly actionId: TInvocation["actionId"];
    readonly textId: TextId;
    readonly enabled: boolean;
    readonly reasons: readonly DeepReadonly<E2eRejectionReasonV1>[];
    readonly options: readonly DeepReadonly<TInvocation>[];
  };
}[E2eSemanticInvocationV1["actionId"]];

export type E2eSemanticPreviewV1 =
  | { readonly kind: "allowed" }
  | {
      readonly kind: "rejected";
      readonly reasons: readonly DeepReadonly<E2eRejectionReasonV1>[];
    };

export type E2eSemanticActionResultV1 =
  | { readonly kind: "committed" }
  | {
      readonly kind: "rejected";
      readonly reasons: readonly DeepReadonly<E2eRejectionReasonV1>[];
    }
  | {
      readonly kind: "not_executed";
      readonly code:
        "session_unavailable" | "fault_paused" | "hmr_invalidated" | "validation_failed";
    }
  | { readonly kind: "faulted"; readonly code: "gameplay_fault" };

export type E2eSemanticGamePortV1 = SemanticGamePortV1<
  E2eGameViewV1,
  E2eSemanticActionDescriptorV1,
  E2eSemanticInvocationV1,
  E2eSemanticPreviewV1,
  E2eSemanticActionResultV1,
  RuntimeSessionStatusV1
>;
export type E2eSemanticPublicationV1 = ReturnType<E2eSemanticGamePortV1["observe"]>;

type E2eSessionDispatchResultV1 = Awaited<
  ReturnType<GameSessionV1<E2eGameSimulationTypesV1>["dispatch"]>
>;

interface E2eSemanticGamePortInputV1 {
  readonly gameSimulation: E2eGameSimulationV1;
  readonly session: GameSessionV1<E2eGameSimulationTypesV1>;
  readonly runtimeControl: GameSessionRuntimeControlV1<E2eGameSimulationTypesV1["snapshot"]>;
  reportSubscriberFailure(error: unknown): void;
}

const startInvocationV1 = Object.freeze({
  actionId: "action.e2e.start" as const,
  parameters: Object.freeze({}),
});
const incrementInvocationV1 = Object.freeze({
  actionId: "action.e2e.increment" as const,
  parameters: Object.freeze({}),
});
const chooseLeftInvocationV1 = Object.freeze({
  actionId: "action.e2e.choose" as const,
  parameters: Object.freeze({ choice: "left" as const }),
});
const chooseRightInvocationV1 = Object.freeze({
  actionId: "action.e2e.choose" as const,
  parameters: Object.freeze({ choice: "right" as const }),
});
const continueInvocationV1 = Object.freeze({
  actionId: "action.e2e.continue" as const,
  parameters: Object.freeze({}),
});
const completeInvocationV1 = Object.freeze({
  actionId: "action.e2e.complete" as const,
  parameters: Object.freeze({}),
});

const startTextIdV1 = parseTextId("text.e2e.action.start");
const incrementTextIdV1 = parseTextId("text.e2e.increment");
const chooseTextIdV1 = parseTextId("text.e2e.action.choose");
const continueTextIdV1 = parseTextId("text.e2e.action.continue");
const completeTextIdV1 = parseTextId("text.e2e.action.complete");

function freezeReasonsV1(
  reasons: readonly E2eRejectionReasonV1[],
): readonly DeepReadonly<E2eRejectionReasonV1>[] {
  return Object.freeze(
    reasons.map((reason) => e2eRejectionReasonSchemaV1.parse(Object.freeze({ code: reason.code }))),
  );
}

function canAddToCounterV1(queries: E2eGameQueriesV1, amount: number): boolean {
  return queries.counterValue <= Number.MAX_SAFE_INTEGER - amount;
}

function rejectionReasonsForInvocationV1(
  queries: E2eGameQueriesV1,
  invocation: E2eSemanticInvocationV1,
): readonly DeepReadonly<E2eRejectionReasonV1>[] {
  if (queries.runStatus === "complete") {
    return freezeReasonsV1([{ code: "game.run_complete" }]);
  }
  switch (invocation.actionId) {
    case "action.e2e.start":
      return queries.canStart ? Object.freeze([]) : freezeReasonsV1([{ code: "flow.not_idle" }]);
    case "action.e2e.increment":
      return canAddToCounterV1(queries, 1)
        ? Object.freeze([])
        : freezeReasonsV1([{ code: "counter.value_out_of_range" }]);
    case "action.e2e.choose": {
      if (queries.flowStatus !== "choosing" || queries.visibleNodeId !== "choice") {
        return freezeReasonsV1([{ code: "flow.not_choosing" }]);
      }
      return canAddToCounterV1(queries, queries.choiceDeltas[invocation.parameters.choice])
        ? Object.freeze([])
        : freezeReasonsV1([{ code: "counter.value_out_of_range" }]);
    }
    case "action.e2e.continue":
      return queries.flowStatus === "blocked" && queries.visibleNodeId === "rejoin"
        ? Object.freeze([])
        : freezeReasonsV1([{ code: "flow.not_blocked" }]);
    case "action.e2e.complete":
      return queries.canComplete
        ? Object.freeze([])
        : freezeReasonsV1([{ code: "run.not_terminal" }]);
  }
  const unsupported: never = invocation;
  throw new TypeError(`unsupported E2E Semantic action ${String(unsupported)}`);
}

function parseNoParametersV1(value: unknown): E2eNoSemanticParametersV1 {
  requireExactObjectV1(value, [], "E2E Semantic invocation parameters");
  return Object.freeze({});
}

export const e2eSemanticInvocationSchemaV1: RuntimeSchemaV1<E2eSemanticInvocationV1> =
  Object.freeze({
    parse(value: unknown): E2eSemanticInvocationV1 {
      const invocation = requireExactObjectV1(
        value,
        ["actionId", "parameters"],
        "E2E Semantic invocation",
      );
      switch (invocation.actionId) {
        case "action.e2e.start":
          return Object.freeze({
            actionId: invocation.actionId,
            parameters: parseNoParametersV1(invocation.parameters),
          });
        case "action.e2e.increment":
          return Object.freeze({
            actionId: invocation.actionId,
            parameters: parseNoParametersV1(invocation.parameters),
          });
        case "action.e2e.choose": {
          const parameters = requireExactObjectV1(
            invocation.parameters,
            ["choice"],
            "E2E Semantic invocation parameters",
          );
          if (parameters.choice !== "left" && parameters.choice !== "right") {
            throw new TypeError("invalid E2E Semantic invocation parameters choice");
          }
          return Object.freeze({
            actionId: invocation.actionId,
            parameters: Object.freeze({ choice: parameters.choice }),
          });
        }
        case "action.e2e.continue":
          return Object.freeze({
            actionId: invocation.actionId,
            parameters: parseNoParametersV1(invocation.parameters),
          });
        case "action.e2e.complete":
          return Object.freeze({
            actionId: invocation.actionId,
            parameters: parseNoParametersV1(invocation.parameters),
          });
        default:
          throw new TypeError("invalid E2E Semantic invocation actionId");
      }
    },
  });

export function parseE2eSemanticInvocationV1(value: unknown): E2eSemanticInvocationV1 {
  return e2eSemanticInvocationSchemaV1.parse(value);
}

export function createE2eSemanticActionCatalogV1(
  queries: E2eGameQueriesV1,
): readonly E2eSemanticActionDescriptorV1[] {
  const startReasons = rejectionReasonsForInvocationV1(queries, startInvocationV1);
  const incrementReasons = rejectionReasonsForInvocationV1(queries, incrementInvocationV1);
  const chooseLeftReasons = rejectionReasonsForInvocationV1(queries, chooseLeftInvocationV1);
  const chooseRightReasons = rejectionReasonsForInvocationV1(queries, chooseRightInvocationV1);
  const chooseReasons =
    chooseLeftReasons.length === 0 || chooseRightReasons.length === 0
      ? Object.freeze([])
      : chooseLeftReasons;
  const continueReasons = rejectionReasonsForInvocationV1(queries, continueInvocationV1);
  const completeReasons = rejectionReasonsForInvocationV1(queries, completeInvocationV1);
  return Object.freeze([
    Object.freeze({
      actionId: startInvocationV1.actionId,
      textId: startTextIdV1,
      enabled: startReasons.length === 0,
      reasons: startReasons,
      options: Object.freeze([startInvocationV1]),
    }),
    Object.freeze({
      actionId: incrementInvocationV1.actionId,
      textId: incrementTextIdV1,
      enabled: incrementReasons.length === 0,
      reasons: incrementReasons,
      options: Object.freeze([incrementInvocationV1]),
    }),
    Object.freeze({
      actionId: chooseLeftInvocationV1.actionId,
      textId: chooseTextIdV1,
      enabled: chooseReasons.length === 0,
      reasons: chooseReasons,
      options: Object.freeze([chooseLeftInvocationV1, chooseRightInvocationV1]),
    }),
    Object.freeze({
      actionId: continueInvocationV1.actionId,
      textId: continueTextIdV1,
      enabled: continueReasons.length === 0,
      reasons: continueReasons,
      options: Object.freeze([continueInvocationV1]),
    }),
    Object.freeze({
      actionId: completeInvocationV1.actionId,
      textId: completeTextIdV1,
      enabled: completeReasons.length === 0,
      reasons: completeReasons,
      options: Object.freeze([completeInvocationV1]),
    }),
  ] satisfies readonly E2eSemanticActionDescriptorV1[]);
}

export function previewE2eSemanticInvocationV1(
  queries: E2eGameQueriesV1,
  invocationValue: DeepReadonly<E2eSemanticInvocationV1>,
): E2eSemanticPreviewV1 {
  const invocation = parseE2eSemanticInvocationV1(invocationValue);
  const reasons = rejectionReasonsForInvocationV1(queries, invocation);
  return reasons.length === 0
    ? Object.freeze({ kind: "allowed" })
    : Object.freeze({ kind: "rejected", reasons });
}

function commandForInvocationV1(invocation: E2eSemanticInvocationV1): E2eGameCommandV1 {
  switch (invocation.actionId) {
    case "action.e2e.start":
      return Object.freeze({ kind: "e2e.flow.start" });
    case "action.e2e.increment":
      return Object.freeze({ kind: "e2e.counter.increment" });
    case "action.e2e.choose":
      return Object.freeze({ kind: "e2e.flow.choose", choice: invocation.parameters.choice });
    case "action.e2e.continue":
      return Object.freeze({ kind: "e2e.flow.continue" });
    case "action.e2e.complete":
      return Object.freeze({ kind: "e2e.run.complete" });
  }
  const unsupported: never = invocation;
  throw new TypeError(`unsupported E2E Semantic invocation ${String(unsupported)}`);
}

export function projectE2eSemanticActionResultV1(
  result: E2eSessionDispatchResultV1,
): E2eSemanticActionResultV1 {
  if (result.kind === "not_executed") {
    return Object.freeze({ kind: "not_executed", code: result.code });
  }
  switch (result.execution.kind) {
    case "committed":
      return Object.freeze({ kind: "committed" });
    case "rejected":
      return Object.freeze({
        kind: "rejected",
        reasons: freezeReasonsV1(result.execution.reasons),
      });
    case "faulted":
      return Object.freeze({ kind: "faulted", code: "gameplay_fault" });
  }
  const unsupported: never = result.execution;
  throw new TypeError(`unsupported E2E Session result ${String(unsupported)}`);
}

export function createE2eSemanticGamePortV1(
  input: E2eSemanticGamePortInputV1,
): E2eSemanticGamePortV1 {
  const { gameSimulation, runtimeControl, session } = input;
  return createSemanticGamePortV1({
    source: Object.freeze({
      getCurrentState: () => session.getCurrentSnapshot().state,
      getAuthoritativeRevisionToken: () => session.getCurrentSnapshot(),
      getStatus: () => session.getStatus(),
      subscribe: (listener: () => void) => session.subscribe(listener),
      reportSubscriberFailure: (error: unknown) => input.reportSubscriberFailure(error),
      readStateAtQueueFront: <TResult>(
        reader: (state: DeepReadonly<E2eGameSimulationTypesV1["state"]>) => TResult,
      ) => runtimeControl.readAtQueueFront((snapshot) => reader(snapshot.state)),
    }),
    createQueries: gameSimulation.createQueries,
    projectGameView: gameSimulation.projectGameView,
    actions: createE2eSemanticActionCatalogV1,
    preview: previewE2eSemanticInvocationV1,
    dispatch: async (invocationValue) => {
      let invocation: E2eSemanticInvocationV1;
      try {
        invocation = parseE2eSemanticInvocationV1(invocationValue);
      } catch {
        return Object.freeze({ kind: "not_executed" as const, code: "validation_failed" as const });
      }
      return projectE2eSemanticActionResultV1(
        await session.dispatch(commandForInvocationV1(invocation)),
      );
    },
  });
}
