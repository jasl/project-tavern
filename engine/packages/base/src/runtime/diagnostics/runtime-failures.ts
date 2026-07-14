// SPDX-License-Identifier: MIT
import {
  runtimeOperationFaultSchemaV1,
  type RuntimeOperationFaultV1,
} from "../../contracts/diagnostics.js";
import type { IsoUtcInstant } from "../../contracts/host.js";
import { parsePositiveSafeInteger } from "../../contracts/values.js";
import { scrubRuntimeOperationFaultV1 } from "./privacy.js";

type RuntimeFailureIdentityV1 = RuntimeOperationFaultV1 extends infer TFault
  ? TFault extends RuntimeOperationFaultV1
    ? Pick<TFault, "category" | "code">
    : never
  : never;

export interface RuntimeFailureBufferV1 {
  append(failure: RuntimeOperationFaultV1): void;
  entries(): readonly RuntimeOperationFaultV1[];
}

export type RuntimeFailureAppendPortV1 = Pick<RuntimeFailureBufferV1, "append">;

interface NormalizeRuntimeFailureInputV1 {
  readonly occurredAt: IsoUtcInstant;
  readonly operation: string;
  readonly error: unknown;
}

type NormalizeRuntimeFailureV1 = NormalizeRuntimeFailureInputV1 & RuntimeFailureIdentityV1;

interface CreateRuntimeFailureReporterInputV1 {
  readonly failures: RuntimeFailureAppendPortV1;
  readonly now: () => IsoUtcInstant;
  readonly operation: string;
}

type CreateRuntimeFailureReporterV1 = CreateRuntimeFailureReporterInputV1 &
  RuntimeFailureIdentityV1;

const runtimeFailureMaximumEntriesV1 = 50;

function readDataPropertyV1(value: unknown, key: PropertyKey): unknown {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) {
    return undefined;
  }
  try {
    let current: object | null = value;
    const seen = new Set<object>();
    while (current !== null && !seen.has(current)) {
      seen.add(current);
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor !== undefined) {
        return descriptor.get === undefined && descriptor.set === undefined
          ? descriptor.value
          : undefined;
      }
      current = Object.getPrototypeOf(current);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function primitiveTextV1(value: unknown): string | undefined {
  switch (typeof value) {
    case "string":
      return value.length === 0 ? undefined : value;
    case "number":
    case "bigint":
    case "boolean":
      return String(value);
    case "symbol":
      return value.description === undefined ? "Symbol" : `Symbol(${value.description})`;
    default:
      return undefined;
  }
}

function errorMessageV1(error: unknown): string {
  return (
    primitiveTextV1(error) ??
    primitiveTextV1(readDataPropertyV1(error, "message")) ??
    "Unknown runtime failure"
  );
}

function errorStackV1(error: unknown): string | undefined {
  try {
    if (error instanceof Error) return primitiveTextV1(error.stack);
  } catch {
    return undefined;
  }
  return primitiveTextV1(readDataPropertyV1(error, "stack"));
}

function errorCauseV1(
  error: unknown,
): { readonly name: string; readonly message: string } | undefined {
  const causeValue = readDataPropertyV1(error, "cause");
  if (causeValue === undefined) return undefined;
  const message = errorMessageV1(causeValue);
  const name =
    primitiveTextV1(readDataPropertyV1(causeValue, "name")) ??
    (typeof causeValue === "object" && causeValue !== null ? "Error" : "Cause");
  return Object.freeze({ name, message });
}

/** Converts an unknown thrown value into the closed, privacy-scrubbed runtime fault contract. */
export function normalizeRuntimeFailureV1(
  input: NormalizeRuntimeFailureV1,
): RuntimeOperationFaultV1 {
  const stackValue = errorStackV1(input.error);
  const cause = errorCauseV1(input.error);
  return runtimeOperationFaultSchemaV1.parse(
    scrubRuntimeOperationFaultV1({
      occurredAt: input.occurredAt,
      operation: input.operation,
      message: errorMessageV1(input.error),
      ...(stackValue === undefined ? {} : { stack: stackValue }),
      ...(cause === undefined ? {} : { cause }),
      category: input.category,
      code: input.code,
    } as RuntimeOperationFaultV1),
  );
}

/** Creates an append-ordered recent-failure buffer with immutable published snapshots. */
export function createRuntimeFailureBufferV1(
  input: {
    readonly limit?: number;
  } = {},
): RuntimeFailureBufferV1 {
  const limit = parsePositiveSafeInteger(input.limit ?? runtimeFailureMaximumEntriesV1);
  if (limit > runtimeFailureMaximumEntriesV1) {
    throw new TypeError(`RuntimeFailure limit exceeds ${runtimeFailureMaximumEntriesV1}`);
  }

  let published: readonly RuntimeOperationFaultV1[] = Object.freeze([]);

  return Object.freeze({
    append(failure: RuntimeOperationFaultV1) {
      const scrubbed = runtimeOperationFaultSchemaV1.parse(scrubRuntimeOperationFaultV1(failure));
      const retainedStart = Math.max(0, published.length - limit + 1);
      published = Object.freeze([...published.slice(retainedStart), scrubbed]);
    },
    entries: () => published,
  });
}

/** Creates a diagnostic-only error reporter that cannot interrupt its caller. */
export function createRuntimeFailureReporterV1(
  input: CreateRuntimeFailureReporterV1,
): (error: unknown) => void {
  return (error: unknown): void => {
    try {
      input.failures.append(
        normalizeRuntimeFailureV1({
          occurredAt: input.now(),
          operation: input.operation,
          category: input.category,
          code: input.code,
          error,
        } as NormalizeRuntimeFailureV1),
      );
    } catch {
      // Runtime failure reporting is diagnostic-only and cannot interrupt authoritative work.
    }
  };
}

/** Creates the one-shot failure reporter for a terminal HMR identity invalidation. */
export function createRuntimeHmrInvalidationReporterV1(input: {
  readonly failures: RuntimeFailureAppendPortV1;
  readonly now: () => IsoUtcInstant;
}): () => void {
  let reported = false;
  const report = createRuntimeFailureReporterV1({
    failures: input.failures,
    now: input.now,
    operation: "runtime.hmr_invalidation",
    category: "runtime",
    code: "runtime.hmr_invalidated",
  });

  return (): void => {
    if (reported) return;
    reported = true;
    report("Resolved game identity changed during HMR");
  };
}
