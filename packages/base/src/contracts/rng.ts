// SPDX-License-Identifier: MIT
import type {
  Brand,
  DeepReadonly,
  NonNegativeSafeInteger,
  NonZeroUint32,
  PositiveSafeInteger,
  RuntimeSchemaV1,
} from "./values.js";
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "./values.js";

type Uint32 = Brand<number, "Uint32">;

export interface RngStateV1 {
  readonly algorithm: "xorshift32-v1";
  readonly cursor: Uint32;
  readonly rawDrawCount: NonNegativeSafeInteger;
}

export interface RuleDrawRequestV1 {
  readonly exclusiveMax: number;
  readonly purpose: string;
}

export interface RngDrawTraceV1 {
  readonly ordinal: PositiveSafeInteger;
  readonly purpose: string;
  readonly exclusiveMax: PositiveSafeInteger;
  readonly result: NonNegativeSafeInteger;
  readonly before: RngStateV1;
  readonly after: RngStateV1;
}

export interface RuleRngV1 {
  nextInt(request: DeepReadonly<RuleDrawRequestV1>): NonNegativeSafeInteger;
  candidateState(): RngStateV1;
  attemptedDraws(): readonly RngDrawTraceV1[];
}

function parseUint32(value: unknown): Uint32 {
  if (
    Object.is(value, -0) ||
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 0xffff_ffff
  ) {
    throw new TypeError("invalid Uint32");
  }
  return value as Uint32;
}

export const rngStateV1Schema: RuntimeSchemaV1<RngStateV1> = Object.freeze({
  parse(value: unknown): RngStateV1 {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Object.getOwnPropertySymbols(value).length > 0
    ) {
      throw new TypeError("invalid RngStateV1");
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Object.keys(descriptors).sort().join("\0") !== "algorithm\0cursor\0rawDrawCount") {
      throw new TypeError("invalid RngStateV1 fields");
    }
    for (const descriptor of Object.values(descriptors)) {
      if (descriptor.get !== undefined || descriptor.set !== undefined) {
        throw new TypeError("RngStateV1 accessors are forbidden");
      }
    }
    if (descriptors.algorithm?.value !== "xorshift32-v1") {
      throw new TypeError("invalid RngStateV1 algorithm");
    }
    return Object.freeze({
      algorithm: "xorshift32-v1",
      cursor: parseUint32(descriptors.cursor?.value),
      rawDrawCount: parseNonNegativeSafeInteger(descriptors.rawDrawCount?.value),
    });
  },
});

function parsePurpose(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 128 ||
    !/^(?:demand|check|scheduler):[a-z0-9._:-]+$/u.test(value)
  ) {
    throw new TypeError("invalid RNG purpose");
  }
  return value;
}

function state(cursor: number, rawDrawCount: number): RngStateV1 {
  return Object.freeze({
    algorithm: "xorshift32-v1",
    cursor: parseUint32(cursor),
    rawDrawCount: parseNonNegativeSafeInteger(rawDrawCount),
  });
}

export function createTransactionalRngV1(input: NonZeroUint32): RuleRngV1;
export function createTransactionalRngV1(input: DeepReadonly<RngStateV1>): RuleRngV1;
export function createTransactionalRngV1(
  input: NonZeroUint32 | DeepReadonly<RngStateV1>,
): RuleRngV1 {
  const initial = typeof input === "number" ? state(input, 0) : rngStateV1Schema.parse(input);
  let cursor = initial.cursor as number;
  let rawDrawCount = initial.rawDrawCount as number;
  const traces: RngDrawTraceV1[] = [];

  const nextRaw = (purpose: string, exclusiveMax: PositiveSafeInteger): number => {
    const before = state(cursor, rawDrawCount);
    let next = cursor >>> 0;
    next = (next ^ ((next << 13) >>> 0)) >>> 0;
    next = (next ^ (next >>> 17)) >>> 0;
    next = (next ^ ((next << 5) >>> 0)) >>> 0;
    cursor = next;
    rawDrawCount += 1;
    const after = state(cursor, rawDrawCount);
    traces.push(
      Object.freeze({
        ordinal: parsePositiveSafeInteger(traces.length + 1),
        purpose,
        exclusiveMax,
        result: parseNonNegativeSafeInteger(next % exclusiveMax),
        before,
        after,
      }),
    );
    return next;
  };

  return Object.freeze({
    nextInt(request: DeepReadonly<RuleDrawRequestV1>): NonNegativeSafeInteger {
      if (
        request === null ||
        typeof request !== "object" ||
        Array.isArray(request) ||
        Object.getPrototypeOf(request) !== Object.prototype ||
        Object.keys(request).sort().join("\0") !== "exclusiveMax\0purpose"
      ) {
        throw new TypeError("invalid RuleDrawRequestV1");
      }
      const exclusiveMax = parsePositiveSafeInteger(request.exclusiveMax);
      if (exclusiveMax > 0x1_0000_0000) {
        throw new TypeError("exclusiveMax exceeds uint32 range");
      }
      const purpose = parsePurpose(request.purpose);
      const limit = Math.floor(0x1_0000_0000 / exclusiveMax) * exclusiveMax;
      let raw;
      do {
        raw = nextRaw(purpose, exclusiveMax);
      } while (raw >= limit);
      return parseNonNegativeSafeInteger(raw % exclusiveMax);
    },
    candidateState(): RngStateV1 {
      return state(cursor, rawDrawCount);
    },
    attemptedDraws(): readonly RngDrawTraceV1[] {
      return Object.freeze([...traces]);
    },
  });
}
