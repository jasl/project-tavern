// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { canonicalJsonBytes } from "@sillymaker/base";
import type { DeepReadonly, RuntimeSchemaV1 } from "@sillymaker/base";

import {
  parseEndingId,
  parseOutcomeId,
  parseReasonId,
  parseRunId,
  parseRunStatus,
  parseStoryToken,
} from "../../contracts/ids.js";
import type { RunStatus } from "../../contracts/ids.js";
import type {
  OutcomeEntryV1,
  PocGameBootstrapInputV1,
  PocGameplayFactV1,
  RunCompletionV1,
  RunStateV1,
  StoryValueV1,
} from "../../contracts/types.js";
import {
  parseMoney,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
  parseSafeInteger,
} from "../../contracts/values.js";

interface ExactDataObjectV1 {
  read(key: string): unknown;
}

function parseExactDataObjectV1(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): ExactDataObjectV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`invalid ${label}`);
  }

  const expected = new Set(expectedKeys);
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== expected.size ||
    ownKeys.some((key) => typeof key !== "string" || !expected.has(key))
  ) {
    throw new TypeError(`invalid ${label} fields`);
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} field ${key}`);
    }
  }

  return Object.freeze({
    read(key: string): unknown {
      const descriptor = descriptors[key];
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new TypeError(`invalid ${label} field ${key}`);
      }
      return descriptor.value;
    },
  });
}

function readDataDiscriminantV1(value: unknown, key: string, label: string): unknown {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (
    descriptor === undefined ||
    descriptor.get !== undefined ||
    descriptor.set !== undefined ||
    !("value" in descriptor) ||
    descriptor.enumerable !== true
  ) {
    throw new TypeError(`invalid ${label} ${key}`);
  }
  return descriptor.value;
}

function parseExactDataArrayV1(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`invalid ${label}`);
  }

  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined ||
    !("value" in lengthDescriptor) ||
    typeof lengthDescriptor.value !== "number" ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0
  ) {
    throw new TypeError(`invalid ${label}`);
  }

  const length = lengthDescriptor.value;
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== length + 1 ||
    ownKeys.some(
      (key) =>
        typeof key !== "string" ||
        (key !== "length" && (!/^(?:0|[1-9][0-9]*)$/u.test(key) || Number(key) >= length)),
    )
  ) {
    throw new TypeError(`invalid ${label} fields`);
  }

  const items: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} element ${index}`);
    }
    items.push(descriptor.value);
  }
  return Object.freeze(items);
}

function parseTerminalRunStatusV1(value: unknown): RunCompletionV1["status"] {
  if (value === "completed_stable" || value === "completed_danger" || value === "failed_arrears") {
    return value;
  }
  throw new TypeError("invalid Run completion status");
}

function parseStoryValueV1(value: unknown): StoryValueV1 {
  const storyValue = parseExactDataObjectV1(value, ["kind", "value"], "Story value");
  const kind = storyValue.read("kind");
  const innerValue = storyValue.read("value");
  switch (kind) {
    case "boolean":
      if (typeof innerValue !== "boolean") throw new TypeError("invalid boolean Story value");
      return Object.freeze({ kind, value: innerValue });
    case "integer":
      return Object.freeze({ kind, value: parseSafeInteger(innerValue) });
    case "token":
      return Object.freeze({ kind, value: parseStoryToken(innerValue) });
    default:
      throw new TypeError("invalid Story value kind");
  }
}

function parseOutcomeEntryV1(value: unknown): OutcomeEntryV1 {
  const outcome = parseExactDataObjectV1(value, ["outcomeId", "value"], "Outcome entry");
  return Object.freeze({
    outcomeId: parseOutcomeId(outcome.read("outcomeId")),
    value: parseStoryValueV1(outcome.read("value")),
  });
}

function exactNonNegativeDifferenceV1(minuend: number, subtrahend: number, label: string): number {
  if (minuend < subtrahend) throw new TypeError(`invalid ${label}`);
  const difference = minuend - subtrahend;
  if (!Number.isSafeInteger(difference)) throw new TypeError(`invalid ${label}`);
  return difference;
}

function parseLevyResolutionV1(value: unknown): RunCompletionV1["levy"] {
  const kind = readDataDiscriminantV1(value, "kind", "Levy resolution");
  if (kind === "paid") {
    const base = parseExactDataObjectV1(value, ["kind", "levyAmount", "cash"], "Levy resolution");
    const cash = parseExactDataObjectV1(base.read("cash"), ["before", "after"], "Levy cash");
    const levyAmount = parseMoney(base.read("levyAmount"));
    const before = parseMoney(cash.read("before"));
    const after = parseMoney(cash.read("after"));
    if (exactNonNegativeDifferenceV1(before, after, "paid Levy cash delta") !== levyAmount) {
      throw new TypeError("paid Levy cash delta must equal levyAmount");
    }
    return Object.freeze({
      kind,
      levyAmount,
      cash: Object.freeze({ before, after }),
    });
  }
  if (kind === "arrears") {
    const base = parseExactDataObjectV1(
      value,
      ["kind", "levyAmount", "availableCash", "shortfall"],
      "Levy resolution",
    );
    const levyAmount = parseMoney(base.read("levyAmount"));
    const availableCash = parseMoney(base.read("availableCash"));
    const shortfall = parseMoney(base.read("shortfall"));
    const expectedShortfall = exactNonNegativeDifferenceV1(
      levyAmount,
      availableCash,
      "arrears Levy shortfall",
    );
    if (levyAmount <= availableCash || shortfall <= 0 || shortfall !== expectedShortfall) {
      throw new TypeError("invalid arrears Levy shortfall");
    }
    return Object.freeze({
      kind,
      levyAmount,
      availableCash,
      shortfall,
    });
  }
  throw new TypeError("invalid Levy resolution kind");
}

function parseReasonIdsV1(value: unknown): readonly ReturnType<typeof parseReasonId>[] {
  return Object.freeze(parseExactDataArrayV1(value, "Run completion ReasonIds").map(parseReasonId));
}

export function parsePocRunCompletionV1(value: unknown): RunCompletionV1 {
  const completion = parseExactDataObjectV1(
    value,
    ["endingId", "status", "levy", "reasonIds", "summary", "completedAtSequence"],
    "Run completion",
  );
  const summary = parseExactDataObjectV1(
    completion.read("summary"),
    ["relationship", "investigation"],
    "Run completion summary",
  );
  const status = parseTerminalRunStatusV1(completion.read("status"));
  const levy = parseLevyResolutionV1(completion.read("levy"));
  if ((status === "failed_arrears") !== (levy.kind === "arrears")) {
    throw new TypeError("Run completion status does not match Levy resolution");
  }
  return Object.freeze({
    endingId: parseEndingId(completion.read("endingId")),
    status,
    levy,
    reasonIds: parseReasonIdsV1(completion.read("reasonIds")),
    summary: Object.freeze({
      relationship: parseOutcomeEntryV1(summary.read("relationship")),
      investigation: parseOutcomeEntryV1(summary.read("investigation")),
    }),
    completedAtSequence: parsePositiveSafeInteger(completion.read("completedAtSequence")),
  });
}

export const pocRunCompletionSchemaV1: RuntimeSchemaV1<RunCompletionV1> = Object.freeze({
  parse: parsePocRunCompletionV1,
});

export function parsePocRunStateV1(value: unknown): RunStateV1 {
  const state = parseExactDataObjectV1(
    value,
    ["runId", "initialSeed", "status", "completion"],
    "Run State",
  );
  const completion = state.read("completion");
  return Object.freeze({
    runId: parseRunId(state.read("runId")),
    initialSeed: parseNonZeroUint32(state.read("initialSeed")),
    status: parseRunStatus(state.read("status")),
    completion: completion === null ? null : parsePocRunCompletionV1(completion),
  });
}

export const pocRunStateSchemaV1: RuntimeSchemaV1<RunStateV1> = Object.freeze({
  parse: parsePocRunStateV1,
});

export function parsePocRunBootstrapInputV1(value: unknown): PocGameBootstrapInputV1 {
  const bootstrap = parseExactDataObjectV1(value, ["rngSeed", "runId"], "Run bootstrap input");
  return Object.freeze({
    rngSeed: parseNonZeroUint32(bootstrap.read("rngSeed")),
    runId: parseRunId(bootstrap.read("runId")),
  });
}

export type PocRunOwnerOperationV1 =
  | { readonly kind: "run.activate" }
  | { readonly kind: "run.complete"; readonly completion: RunCompletionV1 };

export const pocRunOwnerOperationSchemaV1: RuntimeSchemaV1<PocRunOwnerOperationV1> = Object.freeze({
  parse(value: unknown): PocRunOwnerOperationV1 {
    const kind = readDataDiscriminantV1(value, "kind", "Run owner operation");
    if (kind === "run.activate") {
      parseExactDataObjectV1(value, ["kind"], "Run owner operation");
      return Object.freeze({ kind });
    }
    if (kind === "run.complete") {
      const operation = parseExactDataObjectV1(
        value,
        ["kind", "completion"],
        "Run owner operation",
      );
      return Object.freeze({
        kind,
        completion: parsePocRunCompletionV1(operation.read("completion")),
      });
    }
    throw new TypeError("invalid Run owner operation kind");
  },
});

export type PocRunGameplayFactV1 = Extract<PocGameplayFactV1, { readonly kind: "run.completed" }>;

export type PocRunOwnerProposalV1 =
  | {
      readonly payload: {
        readonly kind: "run.activate";
        readonly before: RunStateV1;
        readonly after: RunStateV1;
      };
      readonly facts: readonly [];
    }
  | {
      readonly payload: {
        readonly kind: "run.complete";
        readonly before: RunStateV1;
        readonly after: RunStateV1;
      };
      readonly facts: readonly [PocRunGameplayFactV1];
    };

function frozenSingletonV1<TValue>(value: TValue): readonly [TValue] {
  return Object.freeze([value] as const);
}

function parseRunCompletedFactV1(value: unknown): PocRunGameplayFactV1 {
  const fact = parseExactDataObjectV1(value, ["kind", "completion"], "Run completion Fact");
  if (fact.read("kind") !== "run.completed") {
    throw new TypeError("invalid Run completion Fact kind");
  }
  return Object.freeze({
    kind: "run.completed",
    completion: parsePocRunCompletionV1(fact.read("completion")),
  });
}

export const pocRunGameplayFactSchemaV1: RuntimeSchemaV1<PocRunGameplayFactV1> = Object.freeze({
  parse: parseRunCompletedFactV1,
});

function canonicalValuesEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.length === rightBytes.length &&
    leftBytes.every((value, index) => value === rightBytes[index])
  );
}

export function pocRunStatesEqualV1(left: RunStateV1, right: RunStateV1): boolean {
  return canonicalValuesEqualV1(left, right);
}

export const pocRunOwnerProposalSchemaV1: RuntimeSchemaV1<PocRunOwnerProposalV1> = Object.freeze({
  parse(value: unknown): PocRunOwnerProposalV1 {
    const proposal = parseExactDataObjectV1(value, ["payload", "facts"], "Run owner proposal");
    const payload = parseExactDataObjectV1(
      proposal.read("payload"),
      ["kind", "before", "after"],
      "Run owner proposal payload",
    );
    const kind = payload.read("kind");
    const before = parsePocRunStateV1(payload.read("before"));
    const after = parsePocRunStateV1(payload.read("after"));
    const facts = parseExactDataArrayV1(proposal.read("facts"), "Run owner proposal Facts");
    if (kind === "run.activate") {
      if (facts.length !== 0) throw new TypeError("Run activation must not emit Facts");
      return Object.freeze({
        payload: Object.freeze({ kind, before, after }),
        facts: Object.freeze([] as const),
      });
    }
    if (kind === "run.complete") {
      if (facts.length !== 1) throw new TypeError("Run completion must emit one Fact");
      const fact = parseRunCompletedFactV1(facts[0]);
      if (
        after.completion === null ||
        after.status !== after.completion.status ||
        !canonicalValuesEqualV1(fact.completion, after.completion)
      ) {
        throw new TypeError("Run completion Fact does not match proposal State");
      }
      return Object.freeze({
        payload: Object.freeze({ kind, before, after }),
        facts: frozenSingletonV1(fact),
      });
    }
    throw new TypeError("invalid Run owner proposal kind");
  },
});

export type PocRunReadPortV1 = RunStateV1;
export type PocRunDependencyPortsV1 = Readonly<Record<never, never>>;

export function parsePocRunDependencyPortsV1(value: unknown): PocRunDependencyPortsV1 {
  parseExactDataObjectV1(value, [], "Run dependency ports");
  if (value === null || typeof value !== "object" || !Object.isFrozen(value)) {
    throw new TypeError("Run dependency ports must be frozen");
  }
  return Object.freeze({});
}

interface PocRunInvariantViolationV1 {
  readonly code: "terminal_state.invalid";
  readonly details: {
    readonly status: RunStatus;
    readonly completionStatus: RunCompletionV1["status"] | null;
  };
}

const noRunInvariantViolationsV1: readonly PocRunInvariantViolationV1[] = Object.freeze([]);

export const pocRunInvariantV1 = Object.freeze({
  check(
    stateValue: DeepReadonly<RunStateV1>,
    _readPort: PocRunReadPortV1,
  ): readonly PocRunInvariantViolationV1[] {
    const state = pocRunStateSchemaV1.parse(stateValue);
    const isNonTerminal = state.status === "setup" || state.status === "active";
    const valid = isNonTerminal
      ? state.completion === null
      : state.completion !== null && state.completion.status === state.status;
    if (valid) return noRunInvariantViolationsV1;
    return Object.freeze([
      Object.freeze({
        code: "terminal_state.invalid" as const,
        details: Object.freeze({
          status: state.status,
          completionStatus: state.completion?.status ?? null,
        }),
      }),
    ]);
  },
});
