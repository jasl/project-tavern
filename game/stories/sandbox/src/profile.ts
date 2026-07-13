// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createTransactionalRngV1,
  defineGameModule,
  defineGameProfile,
  parseModuleId,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "@sillymaker/base";
import type {
  BootstrapEntropyV1,
  CommandExecutionAttemptEnvelopeV1,
  GameModuleBindingV1,
  GameProfileV1,
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
  SandboxFactV1,
  SandboxFaultV1,
  SandboxProfileTypesV1,
  SandboxRejectionV1,
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
): CommandExecutionAttemptEnvelopeV1<
  SandboxSnapshotV1,
  SandboxFactV1,
  SandboxRejectionV1,
  SandboxFaultV1,
  SandboxProfileTypesV1["rngState"],
  SandboxProfileTypesV1["rngDrawTrace"]
> {
  const rng = createTransactionalRngV1(snapshot.rng);
  return Object.freeze({
    result: Object.freeze({ kind: "faulted" as const, snapshot, fault }),
    diagnostics: diagnostics(snapshot, rng),
  });
}

const passthrough: RuntimeSchemaV1<unknown> = Object.freeze({ parse: (value: unknown) => value });
const operationSchema: RuntimeSchemaV1<CounterOperationV1> = Object.freeze({
  parse(value: unknown) {
    if (
      value === null ||
      typeof value !== "object" ||
      Object.keys(value).sort().join("\0") !== "kind\0value" ||
      Reflect.get(value, "kind") !== "set"
    )
      throw new TypeError("invalid counter operation");
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

function createModules(): readonly GameModuleBindingV1[] {
  const counter = defineGameModule({
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
    createInitialState(bootstrap: unknown) {
      return Object.freeze({
        value: parseNonNegativeSafeInteger(Reflect.get(bootstrap as object, "initialCount")),
      });
    },
    createReadPort(state: unknown) {
      return sandboxCounterStateSchemaV1.parse(state);
    },
  });
  const parity = defineGameModule({
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
    services: Object.freeze({
      parity(value: number): "even" | "odd" {
        return value % 2 === 0 ? "even" : "odd";
      },
    }),
  });
  return Object.freeze([counter, parity]);
}

export interface SandboxSimulationProgramV1 {
  readonly initialCount: NonNegativeSafeInteger;
}

export interface SandboxProfileV1 extends GameProfileV1 {
  readonly commandSchema: RuntimeSchemaV1<SandboxCommandV1>;
  readonly coordinator: {
    executeAttempt(
      snapshot: SandboxSnapshotV1,
      command: SandboxCommandV1,
      context: undefined,
    ): CommandExecutionAttemptEnvelopeV1<
      SandboxSnapshotV1,
      SandboxFactV1,
      SandboxRejectionV1,
      SandboxFaultV1,
      SandboxProfileTypesV1["rngState"],
      SandboxProfileTypesV1["rngDrawTrace"]
    >;
  } & GameProfileV1["coordinator"];
  createBootstrapInput(entropy: BootstrapEntropyV1): SandboxBootstrapInputV1;
  createInitialState(bootstrap: SandboxBootstrapInputV1): SandboxStateV1;
}

export function createSandboxProfileV1(program: SandboxSimulationProgramV1): SandboxProfileV1 {
  const modules = createModules();
  const counter = modules[0];
  const parity = modules[1];
  if (counter?.bindingKind !== "stateful" || parity?.bindingKind !== "stateless") {
    throw new TypeError("invalid Sandbox Module composition");
  }
  const coordinator = {
    executeAttempt(snapshotValue: unknown, commandValue: unknown) {
      const snapshot = snapshotValue as SandboxSnapshotV1;
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
        value: snapshot.state.counter.value + 1,
      });
      const proposed = counter.owner.propose(snapshot.state.counter, operation, Object.freeze({}));
      if (proposed.kind !== "proposed") throw new TypeError("counter proposal rejected");
      const proposal = proposalSchema.parse(proposed.proposal);
      const nextCounter = sandboxCounterStateSchemaV1.parse(
        counter.owner.apply(snapshot.state.counter, proposal),
      );
      const next = Object.freeze({
        state: Object.freeze({ counter: nextCounter }),
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
    createQueries(snapshotValue: unknown) {
      const snapshot = snapshotValue as SandboxSnapshotV1;
      const parityService = parity.services as { parity(value: number): "even" | "odd" };
      return Object.freeze({
        count: snapshot.state.counter.value,
        parity: parityService.parity(snapshot.state.counter.value),
      });
    },
  } as SandboxProfileV1["coordinator"];
  return defineGameProfile({
    contractRevision: 1 as const,
    modules,
    stateSchema: sandboxStateSchemaV1,
    commandSchema: sandboxCommandSchemaV1,
    factSchema: passthrough,
    rejectionSchema: passthrough,
    debugCommandSchema: passthrough,
    coordinator,
    createBootstrapInput(entropy: BootstrapEntropyV1) {
      return Object.freeze({ rngSeed: entropy.nextNonZeroUint32() });
    },
    createInitialState() {
      return Object.freeze({ counter: Object.freeze({ value: program.initialCount }) });
    },
    projectView(snapshotValue: unknown) {
      return coordinator.createQueries(snapshotValue);
    },
  }) as SandboxProfileV1;
}
