// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createTransactionalRngV1,
  defineGameSimulation,
  defineGameplayModule,
  parseModuleId,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "@sillymaker/base";
import type {
  BootstrapEntropyV1,
  CommandExecutionAttemptEnvelopeV1,
  NonNegativeSafeInteger,
  RuntimeSchemaV1,
  RuleRngV1,
} from "@sillymaker/base";

import {
  sandboxCommandSchemaV1,
  sandboxCounterStateSchemaV1,
  sandboxStateSchemaV1,
} from "./contracts.js";
import type {
  SandboxBootstrapInputV1,
  SandboxCommandV1,
  SandboxDebugValidationErrorV1,
  SandboxFactV1,
  SandboxFaultV1,
  SandboxRejectionV1,
  SandboxSimulationTypesV1,
  SandboxSnapshotV1,
  SandboxStateV1,
} from "./contracts.js";

interface CounterOperationV1 {
  readonly kind: "set";
  readonly value: NonNegativeSafeInteger;
}

interface CounterProposalV1 {
  readonly payload: CounterOperationV1;
  readonly facts: readonly SandboxFactV1[];
}

type SandboxCommandAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  SandboxSnapshotV1,
  SandboxFactV1,
  SandboxRejectionV1,
  SandboxFaultV1,
  SandboxSimulationTypesV1["rngState"],
  SandboxSimulationTypesV1["rngDrawTrace"]
>;

function diagnostics(snapshot: SandboxSnapshotV1, rng: RuleRngV1, committedAfter = snapshot.rng) {
  return Object.freeze({
    committedRngBefore: snapshot.rng,
    attemptedDraws: rng.attemptedDraws(),
    candidateRngAfter: rng.candidateState(),
    committedRngAfter: committedAfter,
  });
}

export function createSandboxFaultAttemptV1(
  snapshot: SandboxSnapshotV1,
  fault: SandboxFaultV1,
): SandboxCommandAttemptV1 {
  const rng = createTransactionalRngV1(snapshot.rng);
  return Object.freeze({
    result: Object.freeze({ kind: "faulted" as const, snapshot, fault }),
    diagnostics: diagnostics(snapshot, rng),
  });
}

function passthroughSchema<T>(): RuntimeSchemaV1<T> {
  return Object.freeze({ parse: (value: unknown) => value as T });
}

const neverSchema: RuntimeSchemaV1<never> = Object.freeze({
  parse() {
    throw new TypeError("Sandbox does not support debug commands");
  },
});

const debugValidationErrorSchema: RuntimeSchemaV1<SandboxDebugValidationErrorV1> = Object.freeze({
  parse(value: unknown) {
    if (
      value === null ||
      typeof value !== "object" ||
      Object.keys(value).join("\0") !== "code" ||
      Reflect.get(value, "code") !== "sandbox.debug.unsupported"
    ) {
      throw new TypeError("invalid Sandbox debug validation error");
    }
    return Object.freeze({ code: "sandbox.debug.unsupported" as const });
  },
});

const operationSchema: RuntimeSchemaV1<CounterOperationV1> = Object.freeze({
  parse(value: unknown) {
    if (
      value === null ||
      typeof value !== "object" ||
      Object.keys(value).sort().join("\0") !== "kind\0value" ||
      Reflect.get(value, "kind") !== "set"
    ) {
      throw new TypeError("invalid counter operation");
    }
    return Object.freeze({
      kind: "set" as const,
      value: parseNonNegativeSafeInteger(Reflect.get(value, "value")),
    });
  },
});

const proposalSchema: RuntimeSchemaV1<CounterProposalV1> = Object.freeze({
  parse(value: unknown) {
    if (value === null || typeof value !== "object") throw new TypeError("invalid proposal");
    const payload = operationSchema.parse(Reflect.get(value, "payload"));
    const facts = Reflect.get(value, "facts");
    if (!Array.isArray(facts) || facts.length !== 1) throw new TypeError("invalid facts");
    return Object.freeze({ payload, facts: Object.freeze([...facts]) as readonly SandboxFactV1[] });
  },
});

function createGameplayModules(program: SandboxSimulationProgramV1) {
  const counter = defineGameplayModule<SandboxSimulationTypesV1>()({
    bindingKind: "stateful" as const,
    descriptor: {
      id: parseModuleId("sandbox.counter"),
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: [parseStateSlotId("simulation.counter")],
      dependencies: [],
    },
    commandSchema: sandboxCommandSchemaV1,
    querySchema: null,
    queryResultSchema: null,
    stateSchema: sandboxCounterStateSchemaV1,
    ownerOperationSchema: operationSchema,
    ownerProposalSchema: proposalSchema,
    localInvariants: [],
    owner: {
      propose(stateValue: unknown, operationValue: unknown) {
        const state = sandboxCounterStateSchemaV1.parse(stateValue);
        const operation = operationSchema.parse(operationValue);
        return Object.freeze({
          kind: "proposed" as const,
          proposal: Object.freeze({
            payload: operation,
            facts: Object.freeze([
              Object.freeze({
                kind: "sandbox.counter.changed" as const,
                before: state.value,
                after: operation.value,
              }),
            ]),
          }),
        });
      },
      apply(_state: unknown, proposalValue: unknown) {
        const proposal = proposalSchema.parse(proposalValue);
        return Object.freeze({ value: proposal.payload.value });
      },
    },
    queries: null,
    createInitialState() {
      return Object.freeze({ value: program.initialCount });
    },
    createReadPort(state: unknown) {
      return sandboxCounterStateSchemaV1.parse(state);
    },
  });
  const parity = defineGameplayModule<SandboxSimulationTypesV1>()({
    bindingKind: "stateless" as const,
    descriptor: {
      id: parseModuleId("sandbox.parity"),
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: [],
      dependencies: [parseModuleId("sandbox.counter")],
    },
    commandSchema: null,
    querySchema: null,
    queryResultSchema: null,
    ownerOperationSchema: null,
    ownerProposalSchema: null,
    owner: null,
    capabilities: Object.freeze({
      resolveParity(value: number): "even" | "odd" {
        return value % 2 === 0 ? "even" : "odd";
      },
    }),
  });
  return Object.freeze([counter, parity] as const);
}

export interface SandboxSimulationProgramV1 {
  readonly initialCount: NonNegativeSafeInteger;
}

export function createSandboxGameSimulationV1(program: SandboxSimulationProgramV1) {
  const modules = createGameplayModules(program);
  const counter = modules[0];
  const parity = modules[1];
  const commandExecutor = Object.freeze({
    executeAttempt(
      snapshot: SandboxSnapshotV1,
      commandValue: SandboxCommandV1,
      _context: undefined,
    ): SandboxCommandAttemptV1 {
      const command = sandboxCommandSchemaV1.parse(commandValue);
      const rng = createTransactionalRngV1(snapshot.rng);
      if (command.kind === "sandbox.counter.reject") {
        return Object.freeze({
          result: Object.freeze({
            kind: "rejected" as const,
            snapshot,
            reasons: Object.freeze([Object.freeze({ code: "sandbox.counter.rejected" as const })]),
          }),
          diagnostics: diagnostics(snapshot, rng),
        });
      }
      if (command.kind === "sandbox.counter.fault") {
        return createSandboxFaultAttemptV1(
          snapshot,
          Object.freeze({ code: "sandbox.counter.fault" as const }),
        );
      }
      const operation = operationSchema.parse({
        kind: "set",
        value: snapshot.state.simulation.counter.value + 1,
      });
      const proposed = counter.owner.propose(
        snapshot.state.simulation.counter,
        operation,
        Object.freeze({}),
      );
      if (proposed.kind !== "proposed") throw new TypeError("counter proposal rejected");
      const proposal = proposalSchema.parse(proposed.proposal);
      const nextCounter = sandboxCounterStateSchemaV1.parse(
        counter.owner.apply(snapshot.state.simulation.counter, proposal),
      );
      const next = Object.freeze({
        state: Object.freeze({ simulation: Object.freeze({ counter: nextCounter }) }),
        rng: rng.candidateState(),
        commandSequence: parseNonNegativeSafeInteger(snapshot.commandSequence + 1),
      });
      return Object.freeze({
        result: Object.freeze({
          kind: "committed" as const,
          snapshot: next,
          facts: proposal.facts,
        }),
        diagnostics: diagnostics(snapshot, rng, next.rng),
      });
    },
  });
  const debugCommandExecutor = Object.freeze({
    validate(
      _snapshot: SandboxSnapshotV1,
      _command: never,
      _context: undefined,
    ): {
      readonly kind: "validation_failed";
      readonly errors: readonly SandboxDebugValidationErrorV1[];
    } {
      return Object.freeze({
        kind: "validation_failed",
        errors: Object.freeze([Object.freeze({ code: "sandbox.debug.unsupported" })]),
      });
    },
    executeAttempt(
      _snapshot: SandboxSnapshotV1,
      _command: never,
      _context: undefined,
    ): SandboxCommandAttemptV1 {
      throw new TypeError("Sandbox does not support debug commands");
    },
  });

  return defineGameSimulation<SandboxSimulationTypesV1>()({
    contractRevision: 1 as const,
    modules,
    stateSchema: sandboxStateSchemaV1,
    commandSchema: sandboxCommandSchemaV1,
    factSchema: passthroughSchema<SandboxFactV1>(),
    rejectionSchema: passthroughSchema<SandboxRejectionV1>(),
    debugCommandSchema: neverSchema,
    debugValidationErrorSchema,
    commandExecutor,
    debugCommandExecutor,
    createBootstrapInput(entropy: BootstrapEntropyV1): SandboxBootstrapInputV1 {
      return Object.freeze({ rngSeed: entropy.nextNonZeroUint32() });
    },
    createInitialState(_bootstrap: SandboxBootstrapInputV1): SandboxStateV1 {
      return Object.freeze({
        simulation: Object.freeze({
          counter: Object.freeze({ value: program.initialCount }),
        }),
      });
    },
    createQueries(state: SandboxStateV1): SandboxSimulationTypesV1["queries"] {
      return Object.freeze({
        count: state.simulation.counter.value,
        parity: parity.capabilities.resolveParity(state.simulation.counter.value),
      });
    },
    projectGameView(
      queries: SandboxSimulationTypesV1["queries"],
    ): SandboxSimulationTypesV1["viewModel"] {
      return Object.freeze({ count: queries.count, parity: queries.parity });
    },
  });
}

export type SandboxGameSimulationV1 = ReturnType<typeof createSandboxGameSimulationV1>;
