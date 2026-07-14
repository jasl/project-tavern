// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { createTransactionalRngV1, parseNonNegativeSafeInteger } from "@sillymaker/base";
import type {
  CommandExecutionAttemptEnvelopeV1,
  DeepReadonly,
  GameDebugCommandExecutorV1,
  RngDrawTraceV1,
  RngStateV1,
} from "@sillymaker/base";

import {
  e2eDebugCommandSchemaV1,
  e2eDebugValidationErrorSchemaV1,
  e2eGameStateSchemaV1,
  e2eGameplayFactSchemaV1,
} from "./contracts/index.js";
import type {
  E2eDebugCommandV1,
  E2eDebugValidationErrorV1,
  E2eGameSnapshotV1,
  E2eGameStateV1,
  E2eGameplayFactV1,
  E2eGameplayFaultV1,
} from "./contracts/index.js";
import type { E2eGameplayModulesV1 } from "./modules/index.js";

export type E2eDebugCommandAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  E2eGameSnapshotV1,
  E2eGameplayFactV1,
  never,
  E2eGameplayFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

export type E2eGameDebugCommandExecutorV1 = GameDebugCommandExecutorV1<
  E2eGameSnapshotV1,
  E2eDebugCommandV1,
  undefined,
  E2eDebugValidationErrorV1,
  E2eDebugCommandAttemptV1
>;

type SnapshotInputV1 = DeepReadonly<E2eGameSnapshotV1>;

type OwnerMutationResultV1 =
  | {
      readonly kind: "applied";
      readonly state: E2eGameStateV1;
      readonly facts: readonly E2eGameplayFactV1[];
    }
  | { readonly kind: "contract_invalid" };

const ownerContractInvalidV1: OwnerMutationResultV1 = Object.freeze({
  kind: "contract_invalid",
});
const allowedV1 = Object.freeze({ kind: "allowed" as const });

function createDiagnosticsV1(snapshot: SnapshotInputV1) {
  const rng = createTransactionalRngV1(snapshot.rng);
  return Object.freeze({
    committedRngBefore: snapshot.rng,
    attemptedDraws: rng.attemptedDraws(),
    candidateRngAfter: snapshot.rng,
    committedRngAfter: snapshot.rng,
  });
}

function createFaultAttemptV1(
  snapshot: SnapshotInputV1,
  code: E2eGameplayFaultV1["code"],
): E2eDebugCommandAttemptV1 {
  return Object.freeze({
    result: Object.freeze({
      kind: "faulted" as const,
      snapshot,
      fault: Object.freeze({ code }),
    }),
    diagnostics: createDiagnosticsV1(snapshot),
  });
}

function createCommittedAttemptV1(
  snapshot: SnapshotInputV1,
  mutation: Extract<OwnerMutationResultV1, { readonly kind: "applied" }>,
): E2eDebugCommandAttemptV1 {
  const nextSnapshot: E2eGameSnapshotV1 = Object.freeze({
    state: mutation.state,
    rng: snapshot.rng,
    commandSequence: parseNonNegativeSafeInteger(snapshot.commandSequence + 1),
    integrity: snapshot.integrity,
  });
  return Object.freeze({
    result: Object.freeze({
      kind: "committed" as const,
      snapshot: nextSnapshot,
      facts: mutation.facts,
    }),
    diagnostics: createDiagnosticsV1(snapshot),
  });
}

function validationFailureV1(error: E2eDebugValidationErrorV1) {
  return Object.freeze({
    kind: "validation_failed" as const,
    errors: Object.freeze([e2eDebugValidationErrorSchemaV1.parse(error)]),
  });
}

function hasToggleableFlowPositionV1(
  flow: DeepReadonly<E2eGameStateV1["simulation"]["flow"]>,
): boolean {
  return (
    (flow.branch === null && flow.nodeId === "choice") ||
    ((flow.branch === "left" || flow.branch === "right") && flow.nodeId === "rejoin")
  );
}

function canSetFlowBlockedV1(
  flow: DeepReadonly<E2eGameStateV1["simulation"]["flow"]>,
  blocked: boolean,
): boolean {
  return (
    hasToggleableFlowPositionV1(flow) &&
    ((flow.status === "choosing" && blocked) || (flow.status === "blocked" && !blocked))
  );
}

function validateCandidateV1(
  modules: E2eGameplayModulesV1,
  state: E2eGameStateV1,
  facts: readonly E2eGameplayFactV1[],
): boolean {
  try {
    e2eGameStateSchemaV1.parse(state);
    for (const fact of facts) e2eGameplayFactSchemaV1.parse(fact);

    const counter = modules[0];
    const counterReadPort = counter.createReadPort(state.simulation.counter);
    for (const invariant of counter.localInvariants) {
      if (invariant.check(state.simulation.counter, counterReadPort).length !== 0) return false;
    }

    const flow = modules[1];
    const flowReadPort = flow.createReadPort(state.simulation.flow);
    for (const invariant of flow.localInvariants) {
      if (invariant.check(state.simulation.flow, flowReadPort).length !== 0) return false;
    }

    const run = modules[2];
    const runReadPort = run.createReadPort(state.simulation.run);
    for (const invariant of run.localInvariants) {
      if (invariant.check(state.simulation.run, runReadPort).length !== 0) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function applyCounterDebugCommandV1(
  modules: E2eGameplayModulesV1,
  snapshot: SnapshotInputV1,
  command: Extract<E2eDebugCommandV1, { readonly kind: "debug.e2e.counter.add" }>,
): OwnerMutationResultV1 {
  const counter = modules[0];
  try {
    const operation = counter.ownerOperationSchema.parse({
      kind: "counter.add",
      amount: command.amount,
    });
    const proposed = counter.owner.propose(
      snapshot.state.simulation.counter,
      operation,
      Object.freeze({}),
    );
    if (proposed.kind !== "proposed") return ownerContractInvalidV1;
    const proposal = counter.ownerProposalSchema.parse(proposed.proposal);
    const nextCounter = counter.stateSchema.parse(
      counter.owner.apply(snapshot.state.simulation.counter, proposal),
    );
    const state: E2eGameStateV1 = Object.freeze({
      simulation: Object.freeze({
        counter: nextCounter,
        flow: snapshot.state.simulation.flow,
        run: snapshot.state.simulation.run,
      }),
    });
    if (!validateCandidateV1(modules, state, proposal.facts)) return ownerContractInvalidV1;
    return Object.freeze({
      kind: "applied" as const,
      state,
      facts: proposal.facts,
    });
  } catch {
    return ownerContractInvalidV1;
  }
}

function applyFlowDebugCommandV1(
  modules: E2eGameplayModulesV1,
  snapshot: SnapshotInputV1,
  command: Extract<E2eDebugCommandV1, { readonly kind: "debug.e2e.flow.set_blocked" }>,
): OwnerMutationResultV1 {
  const counter = modules[0];
  const flow = modules[1];
  try {
    const operation = flow.ownerOperationSchema.parse({
      kind: "flow.set_blocked",
      blocked: command.blocked,
    });
    const dependencies = Object.freeze({
      counter: counter.createReadPort(snapshot.state.simulation.counter),
    });
    const proposed = flow.owner.propose(snapshot.state.simulation.flow, operation, dependencies);
    if (proposed.kind !== "proposed") return ownerContractInvalidV1;
    const proposal = flow.ownerProposalSchema.parse(proposed.proposal);
    const nextFlow = flow.stateSchema.parse(
      flow.owner.apply(snapshot.state.simulation.flow, proposal),
    );
    const state: E2eGameStateV1 = Object.freeze({
      simulation: Object.freeze({
        counter: snapshot.state.simulation.counter,
        flow: nextFlow,
        run: snapshot.state.simulation.run,
      }),
    });
    if (!validateCandidateV1(modules, state, proposal.facts)) return ownerContractInvalidV1;
    return Object.freeze({
      kind: "applied" as const,
      state,
      facts: proposal.facts,
    });
  } catch {
    return ownerContractInvalidV1;
  }
}

export function createE2eGameDebugCommandExecutorV1(
  modules: E2eGameplayModulesV1,
): E2eGameDebugCommandExecutorV1 {
  return Object.freeze({
    validate(
      snapshotValue: SnapshotInputV1,
      commandValue: DeepReadonly<E2eDebugCommandV1>,
      _context: undefined,
    ) {
      const command = e2eDebugCommandSchemaV1.parse(commandValue);
      const state = e2eGameStateSchemaV1.parse(snapshotValue.state);
      switch (command.kind) {
        case "debug.e2e.counter.add":
          return state.simulation.counter.value > Number.MAX_SAFE_INTEGER - command.amount
            ? validationFailureV1({
                code: "debug.e2e.value_out_of_range",
                commandKind: command.kind,
              })
            : allowedV1;
        case "debug.e2e.flow.set_blocked":
          return canSetFlowBlockedV1(state.simulation.flow, command.blocked)
            ? allowedV1
            : validationFailureV1({
                code: "debug.e2e.state_conflict",
                commandKind: command.kind,
              });
        case "debug.e2e.test.validation_failed":
          return validationFailureV1({
            code: "debug.e2e.test_validation_failed",
            commandKind: command.kind,
          });
        case "debug.e2e.test.fault":
          return allowedV1;
      }
      const unsupportedCommand: never = command;
      throw new TypeError(`unsupported E2E DebugCommand ${String(unsupportedCommand)}`);
    },
    executeAttempt(
      snapshotValue: SnapshotInputV1,
      commandValue: DeepReadonly<E2eDebugCommandV1>,
      _context: undefined,
    ) {
      let command: E2eDebugCommandV1;
      try {
        command = e2eDebugCommandSchemaV1.parse(commandValue);
        e2eGameStateSchemaV1.parse(snapshotValue.state);
      } catch {
        return createFaultAttemptV1(snapshotValue, "e2e.runtime.unexpected");
      }

      if (command.kind === "debug.e2e.test.fault") {
        return createFaultAttemptV1(snapshotValue, "e2e.test.fault");
      }
      if (command.kind === "debug.e2e.test.validation_failed") {
        return createFaultAttemptV1(snapshotValue, "e2e.runtime.unexpected");
      }

      const mutation =
        command.kind === "debug.e2e.counter.add"
          ? applyCounterDebugCommandV1(modules, snapshotValue, command)
          : applyFlowDebugCommandV1(modules, snapshotValue, command);
      if (mutation.kind === "contract_invalid") {
        return createFaultAttemptV1(snapshotValue, "e2e.owner.contract_invalid");
      }
      try {
        return createCommittedAttemptV1(snapshotValue, mutation);
      } catch {
        return createFaultAttemptV1(snapshotValue, "e2e.runtime.unexpected");
      }
    },
  });
}
