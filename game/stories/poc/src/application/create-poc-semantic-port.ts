// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import type {
  DeepReadonly,
  RuntimeSessionStatusV1,
  SemanticGamePortSourceV1,
  SemanticGamePortV1,
} from "@sillymaker/base";
import { createSemanticGamePortV1 } from "@sillymaker/base/runtime";
import type { GameSessionRuntimeControlV1, GameSessionV1 } from "@sillymaker/base/runtime";

import type {
  NarrativeProjectionV1,
  PocGameSimulationTypesV1,
  PocGameSnapshotV1,
  PocGameViewV1,
} from "../gameplay/contracts/types.js";
import type { PocGameSimulationV1 } from "../gameplay/game-simulation.js";
import {
  commandForPocSemanticInvocationV1,
  createPocSemanticActionCatalogV1,
  parsePocSemanticInvocationV1,
  previewPocSemanticInvocationV1,
  projectPocSemanticActionResultV1,
} from "../presentation/semantic-actions.js";
import type {
  PocSemanticActionDescriptorV1,
  PocSemanticActionResultV1,
  PocSemanticInvocationV1,
  PocSemanticPreviewV1,
} from "../presentation/semantic-actions.js";

export type PocSemanticGamePortV1 = SemanticGamePortV1<
  PocGameViewV1,
  NarrativeProjectionV1 | null,
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1,
  PocSemanticPreviewV1,
  PocSemanticActionResultV1,
  RuntimeSessionStatusV1
>;

interface PocSemanticGamePortInputV1 {
  readonly session: GameSessionV1<PocGameSimulationTypesV1>;
  readonly runtimeControl: GameSessionRuntimeControlV1<PocGameSnapshotV1>;
  readonly gameSimulation: PocGameSimulationV1;
  reportSubscriberFailure(error: unknown): void;
}

export function createPocSemanticGamePortV1(
  input: PocSemanticGamePortInputV1,
): PocSemanticGamePortV1 {
  const { gameSimulation, runtimeControl, session } = input;
  const source: SemanticGamePortSourceV1<
    PocGameSimulationTypesV1["state"],
    RuntimeSessionStatusV1
  > = Object.freeze({
    getCurrentState: () => session.getCurrentSnapshot().state,
    getAuthoritativeRevisionToken: () => session.getCurrentSnapshot(),
    getStatus: () => session.getStatus(),
    subscribe: (listener: () => void) => session.subscribe(listener),
    reportSubscriberFailure: (error: unknown) => input.reportSubscriberFailure(error),
    readStateAtQueueFront: <TResult>(
      reader: (state: DeepReadonly<PocGameSimulationTypesV1["state"]>) => TResult,
    ) => runtimeControl.readAtQueueFront((snapshot) => reader(snapshot.state)),
  });

  return createSemanticGamePortV1({
    source,
    createQueries: (state) => gameSimulation.createQueries(state),
    projectGameView: (queries) => gameSimulation.projectGameView(queries),
    projectNarrativeView: (queries) => queries.getNarrativeProjection(),
    actions: (queries) => createPocSemanticActionCatalogV1(queries),
    preview: (queries, invocation) => previewPocSemanticInvocationV1(queries, invocation),
    dispatch: async (invocationValue) => {
      let invocation: PocSemanticInvocationV1;
      try {
        invocation = parsePocSemanticInvocationV1(invocationValue);
      } catch {
        return Object.freeze({
          kind: "not_executed" as const,
          code: "validation_failed" as const,
        });
      }

      return projectPocSemanticActionResultV1(
        await session.dispatch(commandForPocSemanticInvocationV1(invocation)),
      );
    },
  });
}
