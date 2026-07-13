// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createTransactionalRngV1,
  parseNonZeroUint32,
  parseNonNegativeSafeInteger,
} from "@sillymaker/base";
import { createGameSessionV1 } from "@sillymaker/base/runtime";
import type { GameSessionV1 } from "@sillymaker/base/runtime";

import type { E2eBootstrapInputV1, E2eSimulationTypesV1, E2eSnapshotV1 } from "./contracts.js";
import { createE2eFaultAttemptV1 } from "./profile.js";
import type { E2eGameSimulationV1 } from "./profile.js";

export function createE2eInitialSnapshotV1(
  gameSimulation: E2eGameSimulationV1,
  bootstrap: E2eBootstrapInputV1,
): E2eSnapshotV1 {
  return Object.freeze({
    state: gameSimulation.createInitialState(bootstrap),
    rng: createTransactionalRngV1(parseNonZeroUint32(bootstrap.rngSeed)).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
  });
}

export function createE2eSessionV1(
  gameSimulation: E2eGameSimulationV1,
  bootstrap: E2eBootstrapInputV1,
): GameSessionV1<E2eSimulationTypesV1> {
  const created = createGameSessionV1<E2eSimulationTypesV1>({
    initialSnapshot: createE2eInitialSnapshotV1(gameSimulation, bootstrap),
    commandSchema: gameSimulation.commandSchema,
    executionContext: undefined,
    executeAttempt(snapshot, command) {
      return gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined);
    },
    normalizeUnexpectedDispatchFault(_error, snapshot) {
      return createE2eFaultAttemptV1(snapshot, Object.freeze({ code: "e2e.runtime.unexpected" }));
    },
  });
  return created.session;
}
