// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createTransactionalRngV1,
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
} from "@sillymaker/base";
import type {
  CommandExecutionAttemptEnvelopeV1,
  DeepReadonly,
  GameCommandExecutorV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";
import { createGameSessionV1 } from "@sillymaker/base/runtime";
import type { GameSessionV1 } from "@sillymaker/base/runtime";

import type { E2eBootstrapInputV1, E2eSimulationTypesV1, E2eSnapshotV1 } from "./contracts.js";
import type { E2eGameSimulationV1 } from "./profile.js";
import type {
  E2eGameBootstrapInputV1,
  E2eGameSimulationTypesV1,
  E2eGameSnapshotV1,
} from "./gameplay/contracts/index.js";
import type { E2eGameSimulationV1 as CanonicalE2eGameSimulationV1 } from "./gameplay/game-simulation.js";

type SupportedE2eSimulationTypesV1 = E2eSimulationTypesV1 | E2eGameSimulationTypesV1;

type E2eAttemptForV1<TTypes extends SupportedE2eSimulationTypesV1> =
  CommandExecutionAttemptEnvelopeV1<
    TTypes["snapshot"],
    TTypes["fact"],
    TTypes["rejection"],
    TTypes["fault"],
    TTypes["rngState"],
    TTypes["rngDrawTrace"]
  >;

interface E2eInitialStateSimulationV1<TTypes extends SupportedE2eSimulationTypesV1> {
  createInitialState(bootstrap: DeepReadonly<TTypes["bootstrapInput"]>): TTypes["state"];
}

interface E2eSessionSimulationV1<
  TTypes extends SupportedE2eSimulationTypesV1,
> extends E2eInitialStateSimulationV1<TTypes> {
  readonly commandSchema: RuntimeSchemaV1<TTypes["command"]>;
  readonly commandExecutor: GameCommandExecutorV1<
    TTypes["snapshot"],
    TTypes["command"],
    undefined,
    E2eAttemptForV1<TTypes>
  >;
}

function createInitialSnapshotForTypesV1<TTypes extends SupportedE2eSimulationTypesV1>(
  gameSimulation: E2eInitialStateSimulationV1<TTypes>,
  bootstrap: TTypes["bootstrapInput"],
): TTypes["snapshot"] {
  return Object.freeze({
    state: gameSimulation.createInitialState(bootstrap as DeepReadonly<TTypes["bootstrapInput"]>),
    rng: createTransactionalRngV1(parseNonZeroUint32(bootstrap.rngSeed)).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
  }) as TTypes["snapshot"];
}

function createUnexpectedFaultAttemptV1<TTypes extends SupportedE2eSimulationTypesV1>(
  snapshotValue: DeepReadonly<TTypes["snapshot"]>,
): E2eAttemptForV1<TTypes> {
  const snapshot = snapshotValue as TTypes["snapshot"];
  const rng = createTransactionalRngV1(snapshot.rng);
  return Object.freeze({
    result: Object.freeze({
      kind: "faulted" as const,
      snapshot,
      fault: Object.freeze({ code: "e2e.runtime.unexpected" }) as TTypes["fault"],
    }),
    diagnostics: Object.freeze({
      committedRngBefore: snapshot.rng,
      attemptedDraws: rng.attemptedDraws(),
      candidateRngAfter: rng.candidateState(),
      committedRngAfter: snapshot.rng,
    }),
  });
}

export function createE2eInitialSnapshotV1(
  gameSimulation: E2eGameSimulationV1,
  bootstrap: E2eBootstrapInputV1,
): E2eSnapshotV1;
export function createE2eInitialSnapshotV1(
  gameSimulation: CanonicalE2eGameSimulationV1,
  bootstrap: E2eGameBootstrapInputV1,
): E2eGameSnapshotV1;
export function createE2eInitialSnapshotV1<TTypes extends SupportedE2eSimulationTypesV1>(
  gameSimulation: E2eInitialStateSimulationV1<TTypes>,
  bootstrap: TTypes["bootstrapInput"],
): TTypes["snapshot"] {
  return createInitialSnapshotForTypesV1<TTypes>(gameSimulation, bootstrap);
}

export function createE2eSessionV1(
  gameSimulation: E2eGameSimulationV1,
  bootstrap: E2eBootstrapInputV1,
): GameSessionV1<E2eSimulationTypesV1>;
export function createE2eSessionV1(
  gameSimulation: CanonicalE2eGameSimulationV1,
  bootstrap: E2eGameBootstrapInputV1,
): GameSessionV1<E2eGameSimulationTypesV1>;
export function createE2eSessionV1<TTypes extends SupportedE2eSimulationTypesV1>(
  gameSimulation: E2eSessionSimulationV1<TTypes>,
  bootstrap: TTypes["bootstrapInput"],
): GameSessionV1<TTypes> {
  const created = createGameSessionV1<TTypes>({
    initialSnapshot: createInitialSnapshotForTypesV1<TTypes>(gameSimulation, bootstrap),
    commandSchema: gameSimulation.commandSchema,
    executionContext: undefined,
    executeAttempt(snapshot, command) {
      return gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined);
    },
    normalizeUnexpectedDispatchFault(_error, snapshotValue) {
      return createUnexpectedFaultAttemptV1<TTypes>(snapshotValue);
    },
  });
  return created.session;
}
