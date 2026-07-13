// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createTransactionalRngV1,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "@sillymaker/base";
import type {
  CommandExecutionAttemptEnvelopeV1,
  DeepReadonly,
  GameCommandExecutorV1,
  PositiveSafeInteger,
  RngDrawTraceV1,
  RngStateV1,
  RuleRngV1,
} from "@sillymaker/base";

import {
  e2eGameCommandSchemaV1,
  e2eGameStateSchemaV1,
  e2eGameplayFactSchemaV1,
  e2eGameplayFaultSchemaV1,
  e2eRejectionReasonSchemaV1,
} from "./contracts/index.js";
import type {
  E2eCounterStateV1,
  E2eFlowStateV1,
  E2eGameCommandV1,
  E2eGameSnapshotV1,
  E2eGameStateV1,
  E2eGameplayFactV1,
  E2eGameplayFaultV1,
  E2eRejectionReasonV1,
  E2eRunStateV1,
} from "./contracts/index.js";
import type {
  CounterOwnerProposalV1,
  E2eGameplayModulesV1,
  FlowOwnerProposalV1,
} from "./modules/index.js";

export type E2eGameCommandAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  E2eGameSnapshotV1,
  E2eGameplayFactV1,
  E2eRejectionReasonV1,
  E2eGameplayFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

export type E2eGameCommandExecutorV1 = GameCommandExecutorV1<
  E2eGameSnapshotV1,
  E2eGameCommandV1,
  undefined,
  E2eGameCommandAttemptV1
>;

type OwnerStepV1<TState> =
  | {
      readonly kind: "applied";
      readonly state: TState;
      readonly facts: readonly E2eGameplayFactV1[];
    }
  | { readonly kind: "rejected"; readonly rejection: E2eRejectionReasonV1 }
  | { readonly kind: "contract_invalid" };

type OwnerProposalStepV1<TProposal> =
  | {
      readonly kind: "proposed";
      readonly proposal: TProposal;
      readonly facts: readonly E2eGameplayFactV1[];
    }
  | { readonly kind: "rejected"; readonly rejection: E2eRejectionReasonV1 }
  | { readonly kind: "contract_invalid" };

const noDependenciesV1 = Object.freeze({});

function attemptedDrawsV1(rng: RuleRngV1, committedBefore: RngStateV1): readonly RngDrawTraceV1[] {
  const draws = rng.attemptedDraws();
  return Object.freeze(
    draws.map((draw, index) =>
      index === 0
        ? Object.freeze({
            ...draw,
            before: committedBefore,
          })
        : draw,
    ),
  );
}

function diagnosticsV1(snapshot: E2eGameSnapshotV1, rng: RuleRngV1, committedAfter: RngStateV1) {
  return Object.freeze({
    committedRngBefore: snapshot.rng,
    attemptedDraws: attemptedDrawsV1(rng, snapshot.rng),
    candidateRngAfter: rng.candidateState(),
    committedRngAfter: committedAfter,
  });
}

function rejectAttemptV1(
  snapshot: E2eGameSnapshotV1,
  rng: RuleRngV1,
  rejectionValue: unknown,
): E2eGameCommandAttemptV1 {
  const rejection = e2eRejectionReasonSchemaV1.parse(rejectionValue);
  return Object.freeze({
    result: Object.freeze({
      kind: "rejected" as const,
      snapshot,
      reasons: Object.freeze([rejection]),
    }),
    diagnostics: diagnosticsV1(snapshot, rng, snapshot.rng),
  });
}

function faultAttemptV1(
  snapshot: E2eGameSnapshotV1,
  rng: RuleRngV1,
  faultValue: unknown,
): E2eGameCommandAttemptV1 {
  const fault = e2eGameplayFaultSchemaV1.parse(faultValue);
  return Object.freeze({
    result: Object.freeze({ kind: "faulted" as const, snapshot, fault }),
    diagnostics: diagnosticsV1(snapshot, rng, snapshot.rng),
  });
}

function commitAttemptV1(
  snapshot: E2eGameSnapshotV1,
  rng: RuleRngV1,
  state: E2eGameStateV1,
  factValues: readonly E2eGameplayFactV1[],
): E2eGameCommandAttemptV1 {
  const facts = Object.freeze(factValues.map((fact) => e2eGameplayFactSchemaV1.parse(fact)));
  const hasDraws = rng.attemptedDraws().length > 0;
  const committedRng = hasDraws ? rng.candidateState() : snapshot.rng;
  const committed = Object.freeze({
    state,
    rng: committedRng,
    commandSequence: parseNonNegativeSafeInteger(snapshot.commandSequence + 1),
  });
  return Object.freeze({
    result: Object.freeze({ kind: "committed" as const, snapshot: committed, facts }),
    diagnostics: diagnosticsV1(snapshot, rng, committedRng),
  });
}

function parseOwnerFactsV1(facts: readonly E2eGameplayFactV1[]) {
  return Object.freeze(facts.map((fact) => e2eGameplayFactSchemaV1.parse(fact)));
}

function proposeCounterOwnerV1(
  modules: E2eGameplayModulesV1,
  state: E2eCounterStateV1,
  operationValue: unknown,
): OwnerProposalStepV1<CounterOwnerProposalV1> {
  const binding = modules[0];
  try {
    const operation = binding.ownerOperationSchema.parse(operationValue);
    const proposed = binding.owner.propose(state, operation, noDependenciesV1);
    if (proposed.kind === "rejected") {
      return Object.freeze({
        kind: "rejected" as const,
        rejection: e2eRejectionReasonSchemaV1.parse(proposed.rejection),
      });
    }
    const proposal = binding.ownerProposalSchema.parse(proposed.proposal);
    return Object.freeze({
      kind: "proposed" as const,
      proposal,
      facts: parseOwnerFactsV1(proposal.facts),
    });
  } catch {
    return Object.freeze({ kind: "contract_invalid" as const });
  }
}

function applyCounterProposalV1(
  modules: E2eGameplayModulesV1,
  state: E2eCounterStateV1,
  proposal: CounterOwnerProposalV1,
): E2eCounterStateV1 {
  const binding = modules[0];
  return binding.stateSchema.parse(binding.owner.apply(state, proposal));
}

function applyCounterOwnerV1(
  modules: E2eGameplayModulesV1,
  state: E2eCounterStateV1,
  operationValue: unknown,
): OwnerStepV1<E2eCounterStateV1> {
  const proposed = proposeCounterOwnerV1(modules, state, operationValue);
  if (proposed.kind !== "proposed") return proposed;
  try {
    return Object.freeze({
      kind: "applied" as const,
      state: applyCounterProposalV1(modules, state, proposed.proposal),
      facts: proposed.facts,
    });
  } catch {
    return Object.freeze({ kind: "contract_invalid" as const });
  }
}

function proposeFlowOwnerV1(
  modules: E2eGameplayModulesV1,
  state: E2eFlowStateV1,
  counter: E2eCounterStateV1,
  operationValue: unknown,
): OwnerProposalStepV1<FlowOwnerProposalV1> {
  const binding = modules[1];
  try {
    const dependencies = Object.freeze({
      counter: modules[0].createReadPort(counter),
    });
    const operation = binding.ownerOperationSchema.parse(operationValue);
    const proposed = binding.owner.propose(state, operation, dependencies);
    if (proposed.kind === "rejected") {
      return Object.freeze({
        kind: "rejected" as const,
        rejection: e2eRejectionReasonSchemaV1.parse(proposed.rejection),
      });
    }
    const proposal = binding.ownerProposalSchema.parse(proposed.proposal);
    return Object.freeze({
      kind: "proposed" as const,
      proposal,
      facts: parseOwnerFactsV1(proposal.facts),
    });
  } catch {
    return Object.freeze({ kind: "contract_invalid" as const });
  }
}

function applyFlowProposalV1(
  modules: E2eGameplayModulesV1,
  state: E2eFlowStateV1,
  proposal: FlowOwnerProposalV1,
): E2eFlowStateV1 {
  const binding = modules[1];
  return binding.stateSchema.parse(binding.owner.apply(state, proposal));
}

function applyFlowOwnerV1(
  modules: E2eGameplayModulesV1,
  state: E2eFlowStateV1,
  counter: E2eCounterStateV1,
  operationValue: unknown,
): OwnerStepV1<E2eFlowStateV1> {
  const proposed = proposeFlowOwnerV1(modules, state, counter, operationValue);
  if (proposed.kind !== "proposed") return proposed;
  try {
    return Object.freeze({
      kind: "applied" as const,
      state: applyFlowProposalV1(modules, state, proposed.proposal),
      facts: proposed.facts,
    });
  } catch {
    return Object.freeze({ kind: "contract_invalid" as const });
  }
}

function applyRunOwnerV1(
  modules: E2eGameplayModulesV1,
  state: E2eRunStateV1,
  operationValue: unknown,
): OwnerStepV1<E2eRunStateV1> {
  const binding = modules[2];
  try {
    const operation = binding.ownerOperationSchema.parse(operationValue);
    const proposed = binding.owner.propose(state, operation, noDependenciesV1);
    if (proposed.kind === "rejected") {
      return Object.freeze({
        kind: "rejected" as const,
        rejection: e2eRejectionReasonSchemaV1.parse(proposed.rejection),
      });
    }
    const proposal = binding.ownerProposalSchema.parse(proposed.proposal);
    const nextState = binding.stateSchema.parse(binding.owner.apply(state, proposal));
    return Object.freeze({
      kind: "applied" as const,
      state: nextState,
      facts: parseOwnerFactsV1(proposal.facts),
    });
  } catch {
    return Object.freeze({ kind: "contract_invalid" as const });
  }
}

function validateCandidateV1(
  modules: E2eGameplayModulesV1,
  counter: E2eCounterStateV1,
  flow: E2eFlowStateV1,
  run: E2eRunStateV1,
): E2eGameStateV1 {
  const candidate = Object.freeze({
    simulation: Object.freeze({ counter, flow, run }),
  });
  e2eGameStateSchemaV1.parse(candidate);

  const bindings = [
    [modules[0], counter],
    [modules[1], flow],
    [modules[2], run],
  ] as const;
  for (const [binding, state] of bindings) {
    const readPort = binding.createReadPort(state as never);
    for (const invariant of binding.localInvariants) {
      const violations = invariant.check(state as never, readPort as never);
      if (!Array.isArray(violations) || violations.length > 0) {
        throw new TypeError("E2E candidate violates a module invariant");
      }
    }
  }
  return candidate;
}

function ownerFailureAttemptV1(
  step:
    | { readonly kind: "applied" }
    | { readonly kind: "proposed" }
    | { readonly kind: "rejected"; readonly rejection: E2eRejectionReasonV1 }
    | { readonly kind: "contract_invalid" },
  snapshot: E2eGameSnapshotV1,
  rng: RuleRngV1,
): E2eGameCommandAttemptV1 | null {
  if (step.kind === "rejected") return rejectAttemptV1(snapshot, rng, step.rejection);
  if (step.kind === "contract_invalid") {
    return faultAttemptV1(snapshot, rng, { code: "e2e.owner.contract_invalid" });
  }
  return null;
}

export interface E2eTerminalGuardInputV1 {
  readonly counterValue: number;
  readonly flowStatus: E2eFlowStateV1["status"];
  readonly nodeId: E2eFlowStateV1["nodeId"];
  readonly runStatus: E2eRunStateV1["status"];
}

export function canCompleteE2eRunV1(
  input: DeepReadonly<E2eTerminalGuardInputV1>,
  terminalThreshold: PositiveSafeInteger,
): boolean {
  return (
    input.runStatus === "active" &&
    input.flowStatus === "resolved" &&
    input.nodeId === "done" &&
    input.counterValue >= terminalThreshold
  );
}

export function createE2eGameCommandExecutorV1(
  modules: E2eGameplayModulesV1,
  terminalThresholdValue: PositiveSafeInteger,
): E2eGameCommandExecutorV1 {
  const terminalThreshold = parsePositiveSafeInteger(terminalThresholdValue);

  return Object.freeze({
    executeAttempt(
      snapshotValue: DeepReadonly<E2eGameSnapshotV1>,
      commandValue: DeepReadonly<E2eGameCommandV1>,
      _context: undefined,
    ): E2eGameCommandAttemptV1 {
      const command = e2eGameCommandSchemaV1.parse(commandValue);
      const snapshot = snapshotValue as E2eGameSnapshotV1;
      const rng = createTransactionalRngV1(snapshot.rng);
      let counter = snapshot.state.simulation.counter;
      let flow = snapshot.state.simulation.flow;
      let run = snapshot.state.simulation.run;
      const facts: E2eGameplayFactV1[] = [];

      try {
        let runPort;
        try {
          runPort = modules[2].createReadPort(run);
        } catch {
          return faultAttemptV1(snapshot, rng, { code: "e2e.owner.contract_invalid" });
        }
        if (runPort.status === "complete") {
          return rejectAttemptV1(snapshot, rng, { code: "game.run_complete" });
        }

        if (command.kind === "e2e.test.reject") {
          return rejectAttemptV1(snapshot, rng, { code: "test.rejected" });
        }
        if (command.kind === "e2e.test.fault") {
          return faultAttemptV1(snapshot, rng, { code: "e2e.test.fault" });
        }

        if (command.kind === "e2e.counter.increment") {
          const step = applyCounterOwnerV1(modules, counter, {
            kind: "counter.add",
            amount: 1,
          });
          const failure = ownerFailureAttemptV1(step, snapshot, rng);
          if (failure !== null) return failure;
          if (step.kind !== "applied") throw new TypeError("unreachable Counter owner result");
          counter = step.state;
          facts.push(...step.facts);
        } else if (command.kind === "e2e.counter.roll") {
          const rolled = rng.nextInt({
            exclusiveMax: command.maximum,
            purpose: "check:e2e.counter.roll",
          });
          const step = applyCounterOwnerV1(modules, counter, {
            kind: "counter.set",
            value: parseNonNegativeSafeInteger(rolled + 1),
          });
          const failure = ownerFailureAttemptV1(step, snapshot, rng);
          if (failure !== null) return failure;
          if (step.kind !== "applied") throw new TypeError("unreachable Counter owner result");
          counter = step.state;
          facts.push(...step.facts);
        } else if (command.kind === "e2e.flow.start") {
          const step = applyFlowOwnerV1(modules, flow, counter, { kind: "flow.start" });
          const failure = ownerFailureAttemptV1(step, snapshot, rng);
          if (failure !== null) return failure;
          if (step.kind !== "applied") throw new TypeError("unreachable Flow owner result");
          flow = step.state;
          facts.push(...step.facts);
        } else if (command.kind === "e2e.flow.choose") {
          let flowPort;
          try {
            flowPort = modules[1].createReadPort(flow);
          } catch {
            return faultAttemptV1(snapshot, rng, { code: "e2e.owner.contract_invalid" });
          }
          if (
            flowPort.status !== "choosing" ||
            flowPort.branch !== null ||
            flowPort.nodeId !== "choice"
          ) {
            return rejectAttemptV1(snapshot, rng, { code: "flow.not_choosing" });
          }

          let delta;
          try {
            delta = modules[3].capabilities.resolveChoiceDelta(command.choice);
          } catch {
            return faultAttemptV1(snapshot, rng, { code: "e2e.runtime.unexpected" });
          }
          const counterProposal = proposeCounterOwnerV1(modules, counter, {
            kind: "counter.add",
            amount: delta,
          });
          const counterFailure = ownerFailureAttemptV1(counterProposal, snapshot, rng);
          if (counterFailure !== null) return counterFailure;
          if (counterProposal.kind !== "proposed") {
            throw new TypeError("unreachable Counter proposal result");
          }

          const flowProposal = proposeFlowOwnerV1(modules, flow, counter, {
            kind: "flow.choose",
            choice: command.choice,
          });
          const flowFailure = ownerFailureAttemptV1(flowProposal, snapshot, rng);
          if (flowFailure !== null) return flowFailure;
          if (flowProposal.kind !== "proposed") {
            throw new TypeError("unreachable Flow proposal result");
          }

          try {
            const nextCounter = applyCounterProposalV1(modules, counter, counterProposal.proposal);
            const nextFlow = applyFlowProposalV1(modules, flow, flowProposal.proposal);
            counter = nextCounter;
            flow = nextFlow;
          } catch {
            return faultAttemptV1(snapshot, rng, { code: "e2e.owner.contract_invalid" });
          }
          facts.push(...counterProposal.facts, ...flowProposal.facts);
        } else if (command.kind === "e2e.flow.continue") {
          const step = applyFlowOwnerV1(modules, flow, counter, { kind: "flow.continue" });
          const failure = ownerFailureAttemptV1(step, snapshot, rng);
          if (failure !== null) return failure;
          if (step.kind !== "applied") throw new TypeError("unreachable Flow owner result");
          flow = step.state;
          facts.push(...step.facts);
        } else if (command.kind === "e2e.run.complete") {
          let terminalInput: E2eTerminalGuardInputV1;
          try {
            const counterPort = modules[0].createReadPort(counter);
            const flowPort = modules[1].createReadPort(flow);
            const currentRunPort = modules[2].createReadPort(run);
            terminalInput = Object.freeze({
              counterValue: counterPort.value,
              flowStatus: flowPort.status,
              nodeId: flowPort.nodeId,
              runStatus: currentRunPort.status,
            });
          } catch {
            return faultAttemptV1(snapshot, rng, { code: "e2e.owner.contract_invalid" });
          }
          if (!canCompleteE2eRunV1(terminalInput, terminalThreshold)) {
            return rejectAttemptV1(snapshot, rng, { code: "run.not_terminal" });
          }
          const step = applyRunOwnerV1(modules, run, {
            kind: "run.complete",
            terminal: {
              flowStatus: terminalInput.flowStatus,
              nodeId: terminalInput.nodeId,
              counterValue: terminalInput.counterValue,
              terminalThreshold,
            },
          });
          const failure = ownerFailureAttemptV1(step, snapshot, rng);
          if (failure !== null) return failure;
          if (step.kind !== "applied") throw new TypeError("unreachable Run owner result");
          run = step.state;
          facts.push(...step.facts);
        } else {
          const unsupportedCommand: never = command;
          throw new TypeError(`unsupported E2E command ${String(unsupportedCommand)}`);
        }

        let candidate;
        try {
          candidate = validateCandidateV1(modules, counter, flow, run);
        } catch {
          return faultAttemptV1(snapshot, rng, { code: "e2e.owner.contract_invalid" });
        }
        return commitAttemptV1(snapshot, rng, candidate, facts);
      } catch {
        return faultAttemptV1(snapshot, rng, { code: "e2e.runtime.unexpected" });
      }
    },
  });
}
