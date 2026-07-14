// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  parseNonNegativeSafeInteger as parseBaseNonNegativeSafeInteger,
  parseNonZeroUint32 as parseBaseNonZeroUint32,
  parsePositiveSafeInteger as parseBasePositiveSafeInteger,
} from "@sillymaker/base";
import type { Brand } from "@sillymaker/base";

export type { Brand, DeepReadonly } from "@sillymaker/base";

export type SafeInteger = Brand<number, "SafeInteger">;
export type NonNegativeSafeInteger = Brand<number, "NonNegativeSafeInteger">;
export type PositiveSafeInteger = Brand<number, "PositiveSafeInteger">;
export type Uint32 = Brand<number, "Uint32">;
export type NonZeroUint32 = Brand<number, "NonZeroUint32">;
export type DayIndex = Brand<number, "DayIndex">;
export type AbsoluteDayIndex = Brand<number, "AbsoluteDayIndex">;
export type MoodPoint = Brand<number, "MoodPoint">;
export type AttributeBonus = Brand<number, "AttributeBonus">;
export type DieFace = Brand<number, "DieFace">;
export type Money = Brand<number, "Money">;
export type Quantity = Brand<number, "Quantity">;

export interface BeforeAfterV1<TValue> {
  readonly before: TValue;
  readonly after: TValue;
}

export interface IntegerRangeV1 {
  readonly min: SafeInteger;
  readonly max: SafeInteger;
}

export interface RatioV1 {
  readonly numerator: NonNegativeSafeInteger;
  readonly denominator: PositiveSafeInteger;
}

const dangerousObjectKeysV1 = new Set(["__proto__", "prototype", "constructor"]);

/** Deep-freezes validated PoC data and rule-provider objects without invoking user code. */
export function deepFreezePocValueV1<TValue>(value: TValue): TValue {
  const seen = new WeakSet<object>();
  const active = new WeakSet<object>();

  const freeze = (current: unknown, functionPrototypeOwner?: object): void => {
    if ((typeof current !== "object" && typeof current !== "function") || current === null) {
      return;
    }
    if (active.has(current)) throw new TypeError("cyclic PoC value");
    if (seen.has(current)) return;
    seen.add(current);

    if (Object.getOwnPropertySymbols(current).length > 0) {
      throw new TypeError("PoC value symbol properties are forbidden");
    }
    const descriptors = Object.getOwnPropertyDescriptors(current);
    if (
      Object.values(descriptors).some(
        (descriptor) => descriptor.get !== undefined || descriptor.set !== undefined,
      )
    ) {
      throw new TypeError("PoC value accessors are forbidden");
    }

    active.add(current);
    try {
      if (typeof current === "function") {
        for (const [key, descriptor] of Object.entries(descriptors)) {
          freeze(descriptor.value, key === "prototype" ? current : undefined);
        }
      } else if (Array.isArray(current)) {
        if (Object.getPrototypeOf(current) !== Array.prototype) {
          throw new TypeError("custom PoC array prototypes are forbidden");
        }
        const keys = Object.keys(descriptors).filter((key) => key !== "length");
        if (keys.length !== current.length || keys.some((key, index) => key !== String(index))) {
          throw new TypeError("sparse or decorated PoC arrays are forbidden");
        }
        for (const key of keys) freeze(descriptors[key]?.value);
      } else {
        const prototype = Object.getPrototypeOf(current);
        if (prototype !== Object.prototype && prototype !== null) {
          throw new TypeError("custom PoC object prototypes are forbidden");
        }
        for (const [key, descriptor] of Object.entries(descriptors)) {
          if (
            functionPrototypeOwner !== undefined &&
            key === "constructor" &&
            descriptor.value === functionPrototypeOwner
          ) {
            continue;
          }
          if (
            dangerousObjectKeysV1.has(key) ||
            (functionPrototypeOwner === undefined && descriptor.enumerable !== true)
          ) {
            throw new TypeError("hidden or dangerous PoC fields are forbidden");
          }
          freeze(descriptor.value);
        }
      }
      Object.freeze(current);
    } finally {
      active.delete(current);
    }
  };

  freeze(value);
  return value;
}

function parseIntegerInRange(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    Object.is(value, -0) ||
    value < minimum ||
    value > maximum
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  return value;
}

export function parseSafeInteger(value: unknown): SafeInteger {
  return parseIntegerInRange(
    value,
    "SafeInteger",
    Number.MIN_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,
  ) as SafeInteger;
}

export function parseNonNegativeSafeInteger(value: unknown): NonNegativeSafeInteger {
  return parseBaseNonNegativeSafeInteger(value) as NonNegativeSafeInteger;
}

export function parsePositiveSafeInteger(value: unknown): PositiveSafeInteger {
  return parseBasePositiveSafeInteger(value) as PositiveSafeInteger;
}

export function parseUint32(value: unknown): Uint32 {
  return parseIntegerInRange(value, "Uint32", 0, 0xffff_ffff) as Uint32;
}

export function parseNonZeroUint32(value: unknown): NonZeroUint32 {
  return parseBaseNonZeroUint32(value) as NonZeroUint32;
}

export function parseDayIndex(value: unknown): DayIndex {
  return parseIntegerInRange(value, "DayIndex", 1, Number.MAX_SAFE_INTEGER) as DayIndex;
}

export function parseAbsoluteDayIndex(value: unknown): AbsoluteDayIndex {
  return parseIntegerInRange(
    value,
    "AbsoluteDayIndex",
    1,
    Number.MAX_SAFE_INTEGER,
  ) as AbsoluteDayIndex;
}

export function parseMoodPoint(value: unknown): MoodPoint {
  return parseIntegerInRange(value, "MoodPoint", -2, 2) as MoodPoint;
}

export function parseAttributeBonus(value: unknown): AttributeBonus {
  return parseIntegerInRange(value, "AttributeBonus", 0, 4) as AttributeBonus;
}

export function parseDieFace(value: unknown): DieFace {
  return parseIntegerInRange(value, "DieFace", 1, 6) as DieFace;
}

export function parseMoney(value: unknown): Money {
  return parseIntegerInRange(value, "Money", 0, Number.MAX_SAFE_INTEGER) as Money;
}

export function parseQuantity(value: unknown): Quantity {
  return parseIntegerInRange(value, "Quantity", 1, Number.MAX_SAFE_INTEGER) as Quantity;
}
