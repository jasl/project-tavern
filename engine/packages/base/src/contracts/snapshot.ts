// SPDX-License-Identifier: MIT
import type { NonNegativeSafeInteger, RuntimeSchemaV1 } from "./values.js";
import { parseNonNegativeSafeInteger } from "./values.js";

export type RunIntegrityReasonV1 =
  | {
      readonly kind: "debug_command";
      readonly commandKind: string;
      readonly sequence: NonNegativeSafeInteger;
    }
  | {
      readonly kind: "fixture_anchor";
      readonly fixtureId: string;
      readonly sequence: NonNegativeSafeInteger;
    }
  | {
      readonly kind: "debug_bundle_anchor";
      readonly sequence: NonNegativeSafeInteger;
    };

export interface RunIntegrityV1 {
  readonly mode: "normal" | "modified";
  readonly mutationCount: NonNegativeSafeInteger;
  readonly firstMutationSequence: NonNegativeSafeInteger | null;
  readonly reasons: readonly RunIntegrityReasonV1[];
}

export interface GameSnapshotEnvelopeV1<TState, TRngState> {
  readonly state: TState;
  readonly rng: TRngState;
  readonly commandSequence: NonNegativeSafeInteger;
  readonly integrity: RunIntegrityV1;
}

function dataObjectDescriptorsV1(
  value: unknown,
  label: string,
): Readonly<Record<string, PropertyDescriptor>> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length > 0
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const descriptor of Object.values(descriptors)) {
    if (
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`${label} accessors and hidden fields are forbidden`);
    }
  }
  return descriptors;
}

function exactDataObjectV1(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): Readonly<Record<string, PropertyDescriptor>> {
  const descriptors = dataObjectDescriptorsV1(value, label);
  const keys = Object.keys(descriptors).sort();
  if (keys.join("\0") !== [...expectedKeys].sort().join("\0")) {
    throw new TypeError(`invalid ${label} fields`);
  }
  return descriptors;
}

function stringValueV1(value: unknown, label: string): string {
  if (typeof value !== "string") throw new TypeError(`invalid ${label}`);
  return value;
}

/** @internal Used only by the Session-owned integrity finalizer. */
export function parseRunIntegrityReasonV1(value: unknown): RunIntegrityReasonV1 {
  const base = dataObjectDescriptorsV1(value, "RunIntegrityReasonV1");
  const kind = base.kind?.value;
  if (kind === "debug_bundle_anchor") {
    const fields = exactDataObjectV1(value, ["kind", "sequence"], "RunIntegrityReasonV1");
    return Object.freeze({
      kind,
      sequence: parseNonNegativeSafeInteger(fields.sequence?.value),
    });
  }
  if (kind === "debug_command") {
    const fields = exactDataObjectV1(
      value,
      ["kind", "commandKind", "sequence"],
      "RunIntegrityReasonV1",
    );
    return Object.freeze({
      kind,
      commandKind: stringValueV1(fields.commandKind?.value, "RunIntegrity commandKind"),
      sequence: parseNonNegativeSafeInteger(fields.sequence?.value),
    });
  }
  if (kind === "fixture_anchor") {
    const fields = exactDataObjectV1(
      value,
      ["kind", "fixtureId", "sequence"],
      "RunIntegrityReasonV1",
    );
    return Object.freeze({
      kind,
      fixtureId: stringValueV1(fields.fixtureId?.value, "RunIntegrity fixtureId"),
      sequence: parseNonNegativeSafeInteger(fields.sequence?.value),
    });
  }
  throw new TypeError("invalid RunIntegrity reason kind");
}

function parseReasonsV1(value: unknown): readonly RunIntegrityReasonV1[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError("invalid RunIntegrity reasons");
  }
  if (value.length > 16) throw new TypeError("RunIntegrity reasons exceed the limit");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const expectedKeys = Array.from({ length: value.length }, (_, index) => String(index));
  const actualKeys = Object.keys(descriptors)
    .filter((key) => key !== "length")
    .sort((left, right) => Number(left) - Number(right));
  if (
    Object.getOwnPropertySymbols(value).length > 0 ||
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new TypeError("invalid RunIntegrity reasons fields");
  }
  const seenKinds = new Set<RunIntegrityReasonV1["kind"]>();
  const parsed = expectedKeys.map((key) => {
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError("RunIntegrity reason accessors are forbidden");
    }
    const reason = parseRunIntegrityReasonV1(descriptor.value);
    if (seenKinds.has(reason.kind)) throw new TypeError("duplicate RunIntegrity reason kind");
    seenKinds.add(reason.kind);
    return reason;
  });
  return Object.freeze(parsed);
}

export const runIntegrityV1Schema: RuntimeSchemaV1<RunIntegrityV1> = Object.freeze({
  parse(value: unknown): RunIntegrityV1 {
    const fields = exactDataObjectV1(
      value,
      ["mode", "mutationCount", "firstMutationSequence", "reasons"],
      "RunIntegrityV1",
    );
    const mode = fields.mode?.value;
    if (mode !== "normal" && mode !== "modified") {
      throw new TypeError("invalid RunIntegrity mode");
    }
    const mutationCount = parseNonNegativeSafeInteger(fields.mutationCount?.value);
    const firstValue = fields.firstMutationSequence?.value;
    const firstMutationSequence =
      firstValue === null ? null : parseNonNegativeSafeInteger(firstValue);
    const reasons = parseReasonsV1(fields.reasons?.value);
    const pristine = mutationCount === 0 && firstMutationSequence === null && reasons.length === 0;
    const modified =
      mutationCount > 0 &&
      firstMutationSequence !== null &&
      reasons.length > 0 &&
      reasons.length <= mutationCount;
    if ((mode === "normal" && !pristine) || (mode === "modified" && !modified)) {
      throw new TypeError("inconsistent RunIntegrity mode");
    }
    return Object.freeze({ mode, mutationCount, firstMutationSequence, reasons });
  },
});

export function createPristineRunIntegrityV1(): RunIntegrityV1 {
  return Object.freeze({
    mode: "normal",
    mutationCount: parseNonNegativeSafeInteger(0),
    firstMutationSequence: null,
    reasons: Object.freeze([]),
  });
}

export function createGameSnapshotEnvelopeSchemaV1<TState, TRngState>(
  stateSchema: RuntimeSchemaV1<TState>,
  rngStateSchema: RuntimeSchemaV1<TRngState>,
): RuntimeSchemaV1<GameSnapshotEnvelopeV1<TState, TRngState>> {
  return Object.freeze({
    parse(value: unknown): GameSnapshotEnvelopeV1<TState, TRngState> {
      const descriptors = exactDataObjectV1(
        value,
        ["state", "rng", "commandSequence", "integrity"],
        "GameSnapshotEnvelopeV1",
      );
      return Object.freeze({
        state: stateSchema.parse(descriptors.state?.value),
        rng: rngStateSchema.parse(descriptors.rng?.value),
        commandSequence: parseNonNegativeSafeInteger(descriptors.commandSequence?.value),
        integrity: runIntegrityV1Schema.parse(descriptors.integrity?.value),
      });
    },
  });
}
