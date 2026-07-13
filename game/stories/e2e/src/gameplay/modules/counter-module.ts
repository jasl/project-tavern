// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  defineGameplayModule,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "@sillymaker/base";
import type {
  NonNegativeSafeInteger,
  PositiveSafeInteger,
  RuntimeSchemaV1,
} from "@sillymaker/base";

import { e2eCounterModuleIdV1, e2eCounterStateSlotIdV1 } from "../contracts/ids.js";
import { e2eCounterStateSchemaV1, initialCounterStateV1 } from "../contracts/index.js";
import type {
  E2eCounterStateV1,
  E2eGameSimulationTypesV1,
  E2eGameplayFactV1,
  E2eRejectionReasonV1,
} from "../contracts/index.js";

export type CounterOwnerOperationV1 =
  | {
      readonly kind: "counter.add";
      readonly amount: PositiveSafeInteger;
    }
  | {
      readonly kind: "counter.set";
      readonly value: NonNegativeSafeInteger;
    };

type CounterChangedFactV1 = Extract<E2eGameplayFactV1, { readonly kind: "counter.changed" }>;

export interface CounterOwnerProposalV1 {
  readonly payload: {
    readonly value: NonNegativeSafeInteger;
  };
  readonly facts: readonly CounterChangedFactV1[];
}

export interface CounterReadPortV1 {
  readonly value: NonNegativeSafeInteger;
}

interface CounterInvariantViolationV1 {
  readonly code: "counter.value_out_of_range";
  readonly details: {
    readonly value: number;
  };
}

type PlainDataRecordV1 = Record<string, unknown>;

function requirePlainDataRecordV1(value: unknown, label: string): PlainDataRecordV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`invalid ${label}`);
  }

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") throw new TypeError(`invalid ${label}`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      !descriptor.enumerable
    ) {
      throw new TypeError(`invalid ${label}`);
    }
  }
  return value as PlainDataRecordV1;
}

function requireExactKeysV1(
  record: PlainDataRecordV1,
  expectedKeys: readonly string[],
  label: string,
): void {
  const actualKeys = Object.keys(record);
  const expected = new Set(expectedKeys);
  if (actualKeys.length !== expected.size || actualKeys.some((key) => !expected.has(key))) {
    throw new TypeError(`invalid ${label}`);
  }
}

function parseExactRecordV1(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): PlainDataRecordV1 {
  const record = requirePlainDataRecordV1(value, label);
  requireExactKeysV1(record, expectedKeys, label);
  return record;
}

function readDataPropertyV1(record: PlainDataRecordV1, key: string, label: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined || !("value" in descriptor)) throw new TypeError(`invalid ${label}`);
  return descriptor.value;
}

function parseSingletonFactArrayV1(value: unknown): CounterChangedFactV1 {
  if (value === null || !Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError("invalid Counter owner proposal facts");
  }
  const ownKeys = Reflect.ownKeys(value);
  if (
    value.length !== 1 ||
    ownKeys.length !== 2 ||
    !ownKeys.includes("0") ||
    !ownKeys.includes("length") ||
    ownKeys.some((key) => typeof key !== "string")
  ) {
    throw new TypeError("invalid Counter owner proposal facts");
  }
  const item = Object.getOwnPropertyDescriptor(value, "0");
  if (
    item === undefined ||
    item.get !== undefined ||
    item.set !== undefined ||
    !("value" in item) ||
    !item.enumerable
  ) {
    throw new TypeError("invalid Counter owner proposal facts");
  }

  const fact = parseExactRecordV1(
    item.value,
    ["kind", "before", "after"],
    "Counter owner proposal Fact",
  );
  if (readDataPropertyV1(fact, "kind", "Counter owner proposal Fact") !== "counter.changed") {
    throw new TypeError("invalid Counter owner proposal Fact");
  }
  return Object.freeze({
    kind: "counter.changed",
    before: parseNonNegativeSafeInteger(
      readDataPropertyV1(fact, "before", "Counter owner proposal Fact"),
    ),
    after: parseNonNegativeSafeInteger(
      readDataPropertyV1(fact, "after", "Counter owner proposal Fact"),
    ),
  });
}

const counterOwnerOperationSchemaV1: RuntimeSchemaV1<CounterOwnerOperationV1> = Object.freeze({
  parse(value: unknown): CounterOwnerOperationV1 {
    const operation = requirePlainDataRecordV1(value, "Counter owner operation");
    const kind = readDataPropertyV1(operation, "kind", "Counter owner operation");
    if (kind === "counter.add") {
      requireExactKeysV1(operation, ["kind", "amount"], "Counter owner operation");
      return Object.freeze({
        kind,
        amount: parsePositiveSafeInteger(
          readDataPropertyV1(operation, "amount", "Counter owner operation"),
        ),
      });
    }
    if (kind === "counter.set") {
      requireExactKeysV1(operation, ["kind", "value"], "Counter owner operation");
      return Object.freeze({
        kind,
        value: parseNonNegativeSafeInteger(
          readDataPropertyV1(operation, "value", "Counter owner operation"),
        ),
      });
    }
    throw new TypeError("invalid Counter owner operation");
  },
});

const counterOwnerProposalSchemaV1: RuntimeSchemaV1<CounterOwnerProposalV1> = Object.freeze({
  parse(value: unknown): CounterOwnerProposalV1 {
    const proposal = parseExactRecordV1(value, ["payload", "facts"], "Counter owner proposal");
    const payload = parseExactRecordV1(
      readDataPropertyV1(proposal, "payload", "Counter owner proposal"),
      ["value"],
      "Counter owner proposal payload",
    );
    const fact = parseSingletonFactArrayV1(
      readDataPropertyV1(proposal, "facts", "Counter owner proposal"),
    );
    return Object.freeze({
      payload: Object.freeze({
        value: parseNonNegativeSafeInteger(
          readDataPropertyV1(payload, "value", "Counter owner proposal payload"),
        ),
      }),
      facts: Object.freeze([fact]),
    });
  },
});

const noInvariantViolationsV1: readonly CounterInvariantViolationV1[] = Object.freeze([]);

const counterNonNegativeInvariantV1 = Object.freeze({
  check(state: Readonly<E2eCounterStateV1>): readonly CounterInvariantViolationV1[] {
    if (state.value >= 0) return noInvariantViolationsV1;
    return Object.freeze([
      Object.freeze({
        code: "counter.value_out_of_range",
        details: Object.freeze({ value: state.value }),
      }),
    ]);
  },
});

function parseNoDependenciesV1(value: unknown): void {
  const dependencies = parseExactRecordV1(value, [], "Counter dependency ports");
  if (!Object.isFrozen(dependencies)) {
    throw new TypeError("Counter dependency ports must be frozen");
  }
}

function createCounterProposalV1(
  before: NonNegativeSafeInteger,
  after: NonNegativeSafeInteger,
): CounterOwnerProposalV1 {
  return counterOwnerProposalSchemaV1.parse({
    payload: { value: after },
    facts: [{ kind: "counter.changed", before, after }],
  });
}

export const counterModuleV1 = defineGameplayModule<E2eGameSimulationTypesV1>()({
  bindingKind: "stateful" as const,
  descriptor: {
    id: e2eCounterModuleIdV1,
    contractRevision: parsePositiveSafeInteger(1),
    stateSlots: [e2eCounterStateSlotIdV1],
    dependencies: [],
  },
  commandSchema: null,
  querySchema: null,
  queryResultSchema: null,
  stateSchema: e2eCounterStateSchemaV1,
  ownerOperationSchema: counterOwnerOperationSchemaV1,
  ownerProposalSchema: counterOwnerProposalSchemaV1,
  localInvariants: [counterNonNegativeInvariantV1],
  owner: {
    propose(stateValue, operationValue, dependencyPorts) {
      const state = e2eCounterStateSchemaV1.parse(stateValue);
      const operation = counterOwnerOperationSchemaV1.parse(operationValue);
      parseNoDependenciesV1(dependencyPorts);

      if (
        operation.kind === "counter.add" &&
        state.value > Number.MAX_SAFE_INTEGER - operation.amount
      ) {
        const rejection = Object.freeze({
          code: "counter.value_out_of_range" as const,
        }) satisfies E2eRejectionReasonV1;
        return Object.freeze({ kind: "rejected" as const, rejection });
      }

      const nextValue =
        operation.kind === "counter.add"
          ? parseNonNegativeSafeInteger(state.value + operation.amount)
          : operation.value;
      return Object.freeze({
        kind: "proposed" as const,
        proposal: createCounterProposalV1(state.value, nextValue),
      });
    },
    apply(stateValue, proposalValue) {
      const state = e2eCounterStateSchemaV1.parse(stateValue);
      const proposal = counterOwnerProposalSchemaV1.parse(proposalValue);
      const [fact] = proposal.facts;
      if (
        fact === undefined ||
        fact.before !== state.value ||
        fact.after !== proposal.payload.value
      ) {
        throw new TypeError("Counter owner proposal does not match current State");
      }
      return e2eCounterStateSchemaV1.parse({ value: proposal.payload.value });
    },
  },
  queries: null,
  createInitialState() {
    return e2eCounterStateSchemaV1.parse(initialCounterStateV1);
  },
  createReadPort(stateValue) {
    const state = e2eCounterStateSchemaV1.parse(stateValue);
    return Object.freeze({ value: state.value });
  },
});
