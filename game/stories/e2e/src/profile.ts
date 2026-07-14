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

import { e2eCommandSchemaV1, e2eCounterStateSchemaV1, e2eStateSchemaV1 } from "./contracts.js";
import type {
  E2eBootstrapInputV1,
  E2eCommandV1,
  E2eDebugValidationErrorV1,
  E2eFactV1,
  E2eFaultV1,
  E2eRejectionV1,
  E2eSimulationTypesV1,
  E2eSnapshotV1,
  E2eStateV1,
} from "./contracts.js";

interface CounterOperationV1 {
  readonly kind: "set";
  readonly value: NonNegativeSafeInteger;
}

interface CounterProposalV1 {
  readonly payload: CounterOperationV1;
  readonly facts: readonly E2eFactV1[];
}

type E2eCommandAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  E2eSnapshotV1,
  E2eFactV1,
  E2eRejectionV1,
  E2eFaultV1,
  E2eSimulationTypesV1["rngState"],
  E2eSimulationTypesV1["rngDrawTrace"]
>;

function diagnostics(snapshot: E2eSnapshotV1, rng: RuleRngV1, committedAfter = snapshot.rng) {
  return Object.freeze({
    committedRngBefore: snapshot.rng,
    attemptedDraws: rng.attemptedDraws(),
    candidateRngAfter: rng.candidateState(),
    committedRngAfter: committedAfter,
  });
}

export function createE2eFaultAttemptV1(
  snapshot: E2eSnapshotV1,
  fault: E2eFaultV1,
): E2eCommandAttemptV1 {
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
    throw new TypeError("E2e does not support debug commands");
  },
});

const debugValidationErrorSchema: RuntimeSchemaV1<E2eDebugValidationErrorV1> = Object.freeze({
  parse(value: unknown) {
    if (
      value === null ||
      typeof value !== "object" ||
      Object.keys(value).join("\0") !== "code" ||
      Reflect.get(value, "code") !== "e2e.debug.unsupported"
    ) {
      throw new TypeError("invalid E2e debug validation error");
    }
    return Object.freeze({ code: "e2e.debug.unsupported" as const });
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
    return Object.freeze({ payload, facts: Object.freeze([...facts]) as readonly E2eFactV1[] });
  },
});

function createGameplayModules(program: E2eSimulationProgramV1) {
  const counter = defineGameplayModule<E2eSimulationTypesV1>()({
    bindingKind: "stateful" as const,
    descriptor: {
      id: parseModuleId("e2e.counter"),
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: [parseStateSlotId("simulation.counter")],
      dependencies: [],
    },
    commandSchema: e2eCommandSchemaV1,
    querySchema: null,
    queryResultSchema: null,
    stateSchema: e2eCounterStateSchemaV1,
    ownerOperationSchema: operationSchema,
    ownerProposalSchema: proposalSchema,
    localInvariants: [],
    owner: {
      propose(stateValue: unknown, operationValue: unknown) {
        const state = e2eCounterStateSchemaV1.parse(stateValue);
        const operation = operationSchema.parse(operationValue);
        return Object.freeze({
          kind: "proposed" as const,
          proposal: Object.freeze({
            payload: operation,
            facts: Object.freeze([
              Object.freeze({
                kind: "e2e.counter.changed" as const,
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
      return e2eCounterStateSchemaV1.parse(state);
    },
  });
  const parity = defineGameplayModule<E2eSimulationTypesV1>()({
    bindingKind: "stateless" as const,
    descriptor: {
      id: parseModuleId("e2e.parity"),
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: [],
      dependencies: [parseModuleId("e2e.counter")],
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

export interface E2eSimulationProgramV1 {
  readonly initialCount: NonNegativeSafeInteger;
}

export function createE2eGameSimulationV1(program: E2eSimulationProgramV1) {
  const modules = createGameplayModules(program);
  const counter = modules[0];
  const parity = modules[1];
  const commandExecutor = Object.freeze({
    executeAttempt(
      snapshot: E2eSnapshotV1,
      commandValue: E2eCommandV1,
      _context: undefined,
    ): E2eCommandAttemptV1 {
      const command = e2eCommandSchemaV1.parse(commandValue);
      const rng = createTransactionalRngV1(snapshot.rng);
      if (command.kind === "e2e.counter.reject") {
        return Object.freeze({
          result: Object.freeze({
            kind: "rejected" as const,
            snapshot,
            reasons: Object.freeze([Object.freeze({ code: "e2e.counter.rejected" as const })]),
          }),
          diagnostics: diagnostics(snapshot, rng),
        });
      }
      if (command.kind === "e2e.counter.fault") {
        return createE2eFaultAttemptV1(
          snapshot,
          Object.freeze({ code: "e2e.counter.fault" as const }),
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
      const nextCounter = e2eCounterStateSchemaV1.parse(
        counter.owner.apply(snapshot.state.simulation.counter, proposal),
      );
      const next = Object.freeze({
        state: Object.freeze({ simulation: Object.freeze({ counter: nextCounter }) }),
        rng: rng.candidateState(),
        commandSequence: parseNonNegativeSafeInteger(snapshot.commandSequence + 1),
        integrity: snapshot.integrity,
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
      _snapshot: E2eSnapshotV1,
      _command: never,
      _context: undefined,
    ): {
      readonly kind: "validation_failed";
      readonly errors: readonly E2eDebugValidationErrorV1[];
    } {
      return Object.freeze({
        kind: "validation_failed",
        errors: Object.freeze([Object.freeze({ code: "e2e.debug.unsupported" })]),
      });
    },
    executeAttempt(
      _snapshot: E2eSnapshotV1,
      _command: never,
      _context: undefined,
    ): E2eCommandAttemptV1 {
      throw new TypeError("E2e does not support debug commands");
    },
  });

  return defineGameSimulation<E2eSimulationTypesV1>()({
    contractRevision: 1 as const,
    modules,
    stateSchema: e2eStateSchemaV1,
    commandSchema: e2eCommandSchemaV1,
    factSchema: passthroughSchema<E2eFactV1>(),
    rejectionSchema: passthroughSchema<E2eRejectionV1>(),
    debugCommandSchema: neverSchema,
    debugValidationErrorSchema,
    commandExecutor,
    debugCommandExecutor,
    createBootstrapInput(entropy: BootstrapEntropyV1): E2eBootstrapInputV1 {
      return Object.freeze({ rngSeed: entropy.nextNonZeroUint32() });
    },
    createInitialState(_bootstrap: E2eBootstrapInputV1): E2eStateV1 {
      return Object.freeze({
        simulation: Object.freeze({
          counter: Object.freeze({ value: program.initialCount }),
        }),
      });
    },
    createQueries(state: E2eStateV1): E2eSimulationTypesV1["queries"] {
      return Object.freeze({
        count: state.simulation.counter.value,
        parity: parity.capabilities.resolveParity(state.simulation.counter.value),
      });
    },
    projectGameView(queries: E2eSimulationTypesV1["queries"]): E2eSimulationTypesV1["viewModel"] {
      return Object.freeze({ count: queries.count, parity: queries.parity });
    },
  });
}

export type E2eGameSimulationV1 = ReturnType<typeof createE2eGameSimulationV1>;
