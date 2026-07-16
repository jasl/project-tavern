// SPDX-License-Identifier: MIT

declare const brandSymbol: unique symbol;

export type Brand<T, TBrand extends string> = T & {
  readonly [brandSymbol]: TBrand;
};

export type DeepReadonly<T> = T extends
  null | undefined | string | number | boolean | bigint | symbol
  ? T
  : T extends (...args: never[]) => unknown
    ? T
    : T extends readonly (infer TItem)[]
      ? readonly DeepReadonly<TItem>[]
      : T extends object
        ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
        : T;

export type ModuleId = Brand<string, "ModuleId">;
export type StateSlotId = Brand<string, "StateSlotId">;
export type StoryId = Brand<string, "StoryId">;
export type SafeInteger = Brand<number, "SafeInteger">;
export type NonNegativeSafeInteger = Brand<number, "NonNegativeSafeInteger">;
export type PositiveSafeInteger = Brand<number, "PositiveSafeInteger">;
export type NonZeroUint32 = Brand<number, "NonZeroUint32">;
export type RunId = Brand<string, "RunId">;
export type Digest = Brand<`sha256:${string}`, "Digest">;

export interface RuntimeSchemaV1<T> {
  parse(value: unknown): T;
}

const stableIdPattern = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/u;
const statePropertyPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/u;
const dangerousProperties = new Set(["__proto__", "prototype", "constructor"]);

function utf8ByteLength(value: string): number {
  let length = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) length += 1;
    else if (code <= 0x7ff) length += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) throw new TypeError("lone surrogate");
      length += 4;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError("lone surrogate");
    } else length += 3;
  }
  return length;
}

function parseStableId(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !stableIdPattern.test(value) ||
    utf8ByteLength(value) < 3 ||
    utf8ByteLength(value) > 96
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  return value;
}

export function parseModuleId(value: unknown): ModuleId {
  return parseStableId(value, "ModuleId") as ModuleId;
}

export function parseStoryId(value: unknown): StoryId {
  return parseStableId(value, "StoryId") as StoryId;
}

export function parseStateSlotId(value: unknown): StateSlotId {
  if (typeof value !== "string") throw new TypeError("invalid StateSlotId");
  const parts = value.split(".");
  if (
    parts.length < 2 ||
    (parts[0] !== "simulation" && parts[0] !== "story") ||
    parts.some((part) => !statePropertyPattern.test(part) || dangerousProperties.has(part))
  ) {
    throw new TypeError("invalid StateSlotId");
  }
  const bytes = utf8ByteLength(value);
  if (bytes < 3 || bytes > 96) throw new TypeError("invalid StateSlotId");
  return value as StateSlotId;
}

function parseInteger(value: unknown, label: string): number {
  if (Object.is(value, -0)) throw new TypeError(`${label}: negative zero`);
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new TypeError(`invalid ${label}`);
  }
  return value;
}

export function parseNonNegativeSafeInteger(value: unknown): NonNegativeSafeInteger {
  const parsed = parseInteger(value, "NonNegativeSafeInteger");
  if (parsed < 0) throw new TypeError("invalid NonNegativeSafeInteger");
  return parsed as NonNegativeSafeInteger;
}

export function parsePositiveSafeInteger(value: unknown): PositiveSafeInteger {
  const parsed = parseInteger(value, "PositiveSafeInteger");
  if (parsed < 1) throw new TypeError("invalid PositiveSafeInteger");
  return parsed as PositiveSafeInteger;
}

export function parseNonZeroUint32(value: unknown): NonZeroUint32 {
  const parsed = parseInteger(value, "NonZeroUint32");
  if (parsed < 1 || parsed > 0xffff_ffff) {
    throw new TypeError("invalid NonZeroUint32");
  }
  return parsed as NonZeroUint32;
}

export function parseRunId(value: unknown): RunId {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value)
  ) {
    throw new TypeError("invalid RunId");
  }
  return value as RunId;
}

export function parseDigest(value: unknown): Digest {
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(value)) {
    throw new TypeError("invalid Digest");
  }
  return value as Digest;
}
