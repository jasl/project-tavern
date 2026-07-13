// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createTransactionalRngV1,
  parseNonZeroUint32,
  parseNonNegativeSafeInteger,
} from "@sillymaker/base";
import { createGameSessionV1 } from "@sillymaker/base/runtime";
import type { GameSessionV1 } from "@sillymaker/base/runtime";

import type {
  SandboxBootstrapInputV1,
  SandboxSimulationTypesV1,
  SandboxSnapshotV1,
} from "./contracts.js";
import { createSandboxFaultAttemptV1 } from "./profile.js";
import type { SandboxGameSimulationV1 } from "./profile.js";

export function createSandboxInitialSnapshotV1(
  gameSimulation: SandboxGameSimulationV1,
  bootstrap: SandboxBootstrapInputV1,
): SandboxSnapshotV1 {
  return Object.freeze({
    state: gameSimulation.createInitialState(bootstrap),
    rng: createTransactionalRngV1(parseNonZeroUint32(bootstrap.rngSeed)).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
  });
}

export function createSandboxSessionV1(
  gameSimulation: SandboxGameSimulationV1,
  bootstrap: SandboxBootstrapInputV1,
): GameSessionV1<SandboxSimulationTypesV1> {
  const created = createGameSessionV1<SandboxSimulationTypesV1>({
    initialSnapshot: createSandboxInitialSnapshotV1(gameSimulation, bootstrap),
    commandSchema: gameSimulation.commandSchema,
    executionContext: undefined,
    executeAttempt(snapshot, command) {
      return gameSimulation.commandExecutor.executeAttempt(snapshot, command, undefined);
    },
    normalizeUnexpectedDispatchFault(_error, snapshot) {
      return createSandboxFaultAttemptV1(
        snapshot,
        Object.freeze({ code: "sandbox.runtime.unexpected" }),
      );
    },
  });
  return created.session;
}
