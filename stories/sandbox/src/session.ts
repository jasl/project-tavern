// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createTransactionalRngV1,
  faultAttemptV1,
  parseNonZeroUint32,
  parseNonNegativeSafeInteger,
} from "@project-tavern/base";
import { createEngineSessionV1 } from "@project-tavern/base/runtime";
import type { EngineSessionV1 } from "@project-tavern/base/runtime";

import type {
  SandboxBootstrapInputV1,
  SandboxFaultV1,
  SandboxProfileTypesV1,
  SandboxSnapshotV1,
} from "./contracts.js";
import type { SandboxProfileV1 } from "./profile.js";

export function createSandboxInitialSnapshotV1(
  profile: SandboxProfileV1,
  bootstrap: SandboxBootstrapInputV1,
): SandboxSnapshotV1 {
  return Object.freeze({
    state: profile.createInitialState(bootstrap),
    rng: createTransactionalRngV1(parseNonZeroUint32(bootstrap.rngSeed)).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
  });
}

export function createSandboxSessionV1(
  profile: SandboxProfileV1,
  bootstrap: SandboxBootstrapInputV1,
): EngineSessionV1<SandboxProfileTypesV1> {
  const created = createEngineSessionV1<SandboxProfileTypesV1>({
    initialSnapshot: createSandboxInitialSnapshotV1(profile, bootstrap),
    commandSchema: profile.commandSchema,
    executionContext: undefined,
    executeAttempt(snapshot, command) {
      return profile.coordinator.executeAttempt(snapshot, command, undefined);
    },
    normalizeUnexpectedDispatchFault(_error, snapshot) {
      const rng = createTransactionalRngV1(snapshot.rng);
      const fault: SandboxFaultV1 = Object.freeze({ code: "sandbox.runtime.unexpected" });
      return faultAttemptV1(snapshot, rng, fault);
    },
  });
  return created.session;
}
