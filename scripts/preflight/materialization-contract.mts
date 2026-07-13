// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { createHash, randomUUID } from "node:crypto";
import { open, readFile, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";

export const materializationInputsV1 = Object.freeze({
  pnpmVersion: "11.11.0",
  playwrightVersion: "1.61.1",
  chromiumRevision: "1228",
  webkitRevision: "2311",
});

export type MaterializationContractErrorCodeV1 =
  | "materialization_contract.lock_invalid"
  | "materialization_contract.package_duplicate"
  | "materialization_contract.package_missing"
  | "materialization_contract.snapshot_duplicate"
  | "materialization_contract.snapshot_missing"
  | "materialization_contract.strict_json_invalid"
  | "materialization_contract.schema_invalid"
  | "materialization_contract.noncanonical"
  | "materialization_contract.stale";

export class MaterializationContractError extends Error {
  readonly name = "MaterializationContractError";
  readonly code: MaterializationContractErrorCodeV1;

  constructor(code: MaterializationContractErrorCodeV1, detail: string) {
    super(`${code}: ${detail}`);
    this.code = code;
  }
}

export type StrictJsonPrimitiveV1 = null | boolean | string | number;
export type StrictJsonValueV1 =
  StrictJsonPrimitiveV1 | StrictJsonObjectV1 | readonly StrictJsonValueV1[];
export interface StrictJsonObjectV1 {
  readonly [key: string]: StrictJsonValueV1;
}

export interface MaterializationSnapshotRecordV1 {
  readonly snapshotKey: string;
  readonly snapshotRecord: StrictJsonObjectV1;
}

export interface MaterializationExternalPackageV1 {
  readonly packageKey: string;
  readonly packageRecord: StrictJsonObjectV1;
  readonly snapshotRecords: readonly MaterializationSnapshotRecordV1[];
}

export type ExternalPackageClosureV1 = readonly MaterializationExternalPackageV1[];

export interface MaterializationContractV1 {
  readonly schemaRevision: 1;
  readonly pnpm: { readonly version: string };
  readonly playwright: {
    readonly version: string;
    readonly browsers: {
      readonly chromium: { readonly revision: string };
      readonly webkit: { readonly revision: string };
    };
  };
  readonly externalPackages: ExternalPackageClosureV1;
}

export interface MaterializationCandidateHandleV1 {
  readonly write: (bytes: Uint8Array) => Promise<void>;
  readonly sync: () => Promise<void>;
  readonly close: () => Promise<void>;
}

export interface MaterializationContractIoV1 {
  readonly readFile: (path: string) => Promise<Uint8Array>;
  readonly openExclusive: (path: string) => Promise<MaterializationCandidateHandleV1>;
  readonly rename: (from: string, to: string) => Promise<void>;
  readonly remove: (path: string) => Promise<void>;
  readonly syncDirectory: (path: string) => Promise<void>;
  readonly uniqueSuffix: () => string;
}

export interface MaterializationContractReadResultV1 {
  readonly contract: MaterializationContractV1;
  readonly packageClosureDigest: `sha256:${string}`;
  readonly materializationDigest: `sha256:${string}`;
}

const dangerousKeys = new Set(["__proto__", "prototype", "constructor"]);
const localReferencePattern = /^(?:file|link|workspace):/u;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const strictJsonLimits = Object.freeze({
  maxBytes: 4 * 1024 * 1024,
  maxDepth: 128,
  maxArrayItems: 100_000,
  maxObjectMembers: 100_000,
  maxNodes: 500_000,
  maxStringBytes: 1024 * 1024,
});

function fail(code: MaterializationContractErrorCodeV1, detail: string): never {
  throw new MaterializationContractError(code, detail);
}

function compareCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (value) => value.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (value) => value.codePointAt(0) ?? 0);
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}

function hasLoneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (index + 1 >= value.length || next < 0xdc00 || next > 0xdfff) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return true;
  }
  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertPlainObject(
  value: unknown,
  code: MaterializationContractErrorCodeV1,
  path: string,
): Record<string, unknown> {
  if (!isPlainObject(value)) fail(code, `${path} must be a plain object`);
  return value;
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  path: string,
): void {
  const actual = Object.keys(value).toSorted(compareCodePoints);
  const sortedExpected = [...expected].sort(compareCodePoints);
  if (JSON.stringify(actual) !== JSON.stringify(sortedExpected)) {
    fail("materialization_contract.schema_invalid", `${path} has unexpected or missing fields`);
  }
}

function normalizeStrictJsonV1(
  value: unknown,
  path = "/",
  active = new Set<object>(),
): StrictJsonValueV1 {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (hasLoneSurrogate(value)) {
      fail("materialization_contract.strict_json_invalid", `${path} contains a lone surrogate`);
    }
    if (encoder.encode(value).byteLength > strictJsonLimits.maxStringBytes) {
      fail("materialization_contract.strict_json_invalid", `${path} exceeds the string limit`);
    }
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isInteger(value)) {
      fail("materialization_contract.strict_json_invalid", `${path} must be an integer`);
    }
    if (!Number.isSafeInteger(value)) {
      fail("materialization_contract.strict_json_invalid", `${path} must be a safe integer`);
    }
    if (Object.is(value, -0)) {
      fail("materialization_contract.strict_json_invalid", `${path} must not be negative zero`);
    }
    return value;
  }
  if (typeof value !== "object" || value === null) {
    fail("materialization_contract.strict_json_invalid", `${path} is not strict JSON`);
  }
  if (active.has(value)) {
    fail("materialization_contract.strict_json_invalid", `${path} contains a cycle`);
  }
  active.add(value);
  try {
    if (Array.isArray(value)) {
      if (value.length > strictJsonLimits.maxArrayItems) {
        fail("materialization_contract.strict_json_invalid", `${path} exceeds the array limit`);
      }
      return value.map((entry, index) => {
        if (!Object.hasOwn(value, index)) {
          fail("materialization_contract.strict_json_invalid", `${path}/${index} is sparse`);
        }
        return normalizeStrictJsonV1(entry, `${path}/${index}`, active);
      });
    }
    const record = assertPlainObject(value, "materialization_contract.strict_json_invalid", path);
    const descriptors = Object.getOwnPropertyDescriptors(record);
    const keys = Object.keys(descriptors).sort(compareCodePoints);
    if (keys.length > strictJsonLimits.maxObjectMembers) {
      fail("materialization_contract.strict_json_invalid", `${path} exceeds the object limit`);
    }
    const normalized: Record<string, StrictJsonValueV1> = {};
    for (const key of keys) {
      if (hasLoneSurrogate(key)) {
        fail("materialization_contract.strict_json_invalid", `${path}/${key} is not Unicode`);
      }
      if (dangerousKeys.has(key)) {
        fail("materialization_contract.strict_json_invalid", `${path}/${key} is forbidden`);
      }
      const descriptor = descriptors[key];
      if (descriptor?.get !== undefined || descriptor?.set !== undefined) {
        fail("materialization_contract.strict_json_invalid", `${path}/${key} is an accessor`);
      }
      normalized[key] = normalizeStrictJsonV1(descriptor?.value, `${path}/${key}`, active);
    }
    return normalized;
  } finally {
    active.delete(value);
  }
}

function canonicalJsonTextV1(value: unknown): string {
  return JSON.stringify(normalizeStrictJsonV1(value));
}

function prettyJsonV1(value: StrictJsonValueV1, depth = 0, prefixWidth = 0): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const compact = `[${value.map((entry) => JSON.stringify(entry)).join(", ")}]`;
    if (
      value.every((entry) => entry === null || typeof entry !== "object") &&
      prefixWidth + compact.length <= 100
    ) {
      return compact;
    }
    const indentation = "  ".repeat(depth + 1);
    return `[\n${value
      .map((entry) => `${indentation}${prettyJsonV1(entry, depth + 1, indentation.length)}`)
      .join(",\n")}\n${"  ".repeat(depth)}]`;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) return "{}";
  return `{\n${entries
    .map(([key, entry]) => {
      const prefix = `${"  ".repeat(depth + 1)}${JSON.stringify(key)}: `;
      return `${prefix}${prettyJsonV1(entry, depth + 1, prefix.length)}`;
    })
    .join(",\n")}\n${"  ".repeat(depth)}}`;
}

function canonicalPrettyJsonBytesV1(value: unknown): Uint8Array {
  return encoder.encode(`${prettyJsonV1(normalizeStrictJsonV1(value))}\n`);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  return left.every((value, index) => value === right[index]);
}

function decodeUtf8V1(bytes: Uint8Array, label: string): string {
  try {
    return decoder.decode(bytes);
  } catch {
    return fail("materialization_contract.strict_json_invalid", `${label} is not UTF-8`);
  }
}

function parseStrictJsonValueV1(bytes: Uint8Array): StrictJsonValueV1 {
  if (bytes.byteLength > strictJsonLimits.maxBytes) {
    fail("materialization_contract.strict_json_invalid", "tracked JSON exceeds the byte limit");
  }
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("materialization_contract.strict_json_invalid", "tracked JSON contains a UTF-8 BOM");
  }
  const text = decodeUtf8V1(bytes, "tracked JSON");
  let index = 0;
  let nodes = 0;

  const syntax = (detail: string): never =>
    fail("materialization_contract.strict_json_invalid", `${detail} at offset ${index}`);
  const skipWhitespace = (): void => {
    while (
      text[index] === " " ||
      text[index] === "\n" ||
      text[index] === "\r" ||
      text[index] === "\t"
    ) {
      index += 1;
    }
    if (text[index] === "/") syntax("comments are forbidden");
  };
  const parseString = (): string => {
    const start = index;
    if (text[index] !== '"') syntax("expected a string");
    index += 1;
    while (index < text.length) {
      const character = text[index];
      if (character === '"') {
        index += 1;
        let parsed: unknown;
        try {
          parsed = JSON.parse(text.slice(start, index));
        } catch {
          return syntax("invalid string");
        }
        if (typeof parsed !== "string" || hasLoneSurrogate(parsed)) {
          return syntax("invalid string");
        }
        if (encoder.encode(parsed).byteLength > strictJsonLimits.maxStringBytes) {
          return syntax("string exceeds the byte limit");
        }
        return parsed;
      }
      if (character === "\\") {
        index += 1;
        const escape = text[index];
        if (escape === "u") {
          if (!/^[0-9a-fA-F]{4}$/u.test(text.slice(index + 1, index + 5))) {
            return syntax("invalid Unicode escape");
          }
          index += 5;
          continue;
        }
        if (!['"', "\\", "/", "b", "f", "n", "r", "t"].includes(escape ?? "")) {
          return syntax("invalid escape");
        }
        index += 1;
        continue;
      }
      if ((character?.charCodeAt(0) ?? 0) < 0x20) syntax("invalid string character");
      index += 1;
    }
    return syntax("unterminated string");
  };
  const parseNumber = (): number => {
    const start = index;
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(text.slice(index));
    if (match === null) return syntax("invalid value");
    index += match[0].length;
    const value = Number(match[0]);
    if (!Number.isInteger(value)) return syntax(`non-integer number at ${start}`);
    if (!Number.isSafeInteger(value)) return syntax(`unsafe integer at ${start}`);
    if (Object.is(value, -0)) return syntax(`negative zero at ${start}`);
    return value;
  };
  const parseValue = (depth: number): StrictJsonValueV1 => {
    skipWhitespace();
    if (depth > strictJsonLimits.maxDepth) syntax("maximum depth exceeded");
    nodes += 1;
    if (nodes > strictJsonLimits.maxNodes) syntax("maximum node count exceeded");
    const character = text[index];
    if (character === '"') return parseString();
    if (character === "[") {
      index += 1;
      const values: StrictJsonValueV1[] = [];
      skipWhitespace();
      if (text[index] === "]") {
        index += 1;
        return values;
      }
      while (true) {
        if (values.length >= strictJsonLimits.maxArrayItems) syntax("array limit exceeded");
        values.push(parseValue(depth + 1));
        skipWhitespace();
        if (text[index] === "]") {
          index += 1;
          return values;
        }
        if (text[index] !== ",") syntax("expected an array comma");
        index += 1;
        skipWhitespace();
        if (text[index] === "]") syntax("trailing commas are forbidden");
      }
    }
    if (character === "{") {
      index += 1;
      const record: Record<string, StrictJsonValueV1> = {};
      const keys = new Set<string>();
      skipWhitespace();
      if (text[index] === "}") {
        index += 1;
        return record;
      }
      while (true) {
        if (keys.size >= strictJsonLimits.maxObjectMembers) syntax("object limit exceeded");
        const key = parseString();
        if (dangerousKeys.has(key)) syntax("dangerous object key");
        if (keys.has(key)) syntax("duplicate object key");
        keys.add(key);
        skipWhitespace();
        if (text[index] !== ":") syntax("expected an object colon");
        index += 1;
        record[key] = parseValue(depth + 1);
        skipWhitespace();
        if (text[index] === "}") {
          index += 1;
          return record;
        }
        if (text[index] !== ",") syntax("expected an object comma");
        index += 1;
        skipWhitespace();
        if (text[index] === "}") syntax("trailing commas are forbidden");
      }
    }
    if (text.startsWith("true", index)) {
      index += 4;
      return true;
    }
    if (text.startsWith("false", index)) {
      index += 5;
      return false;
    }
    if (text.startsWith("null", index)) {
      index += 4;
      return null;
    }
    return parseNumber();
  };

  const value = parseValue(1);
  skipWhitespace();
  if (index !== text.length) syntax("unexpected trailing input");
  return value;
}

function assertNoLocalReferencesV1(value: StrictJsonValueV1, path: string): void {
  if (typeof value === "string") {
    if (localReferencePattern.test(value)) {
      fail("materialization_contract.lock_invalid", `${path} contains a local reference`);
    }
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoLocalReferencesV1(entry, `${path}/${index}`));
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    assertNoLocalReferencesV1(entry, `${path}/${key}`);
  }
}

function normalizeRecordV1(value: unknown, path: string): StrictJsonObjectV1 {
  const normalized = normalizeStrictJsonV1(value, path);
  if (!isPlainObject(normalized)) {
    fail("materialization_contract.lock_invalid", `${path} must be an object record`);
  }
  assertNoLocalReferencesV1(normalized, path);
  return normalized;
}

function parsePnpmLockfileV1(source: string): {
  readonly packages: Record<string, unknown>;
  readonly snapshots: Record<string, unknown>;
} {
  let parsed: unknown;
  try {
    parsed = parseYaml(source, {
      strict: true,
      uniqueKeys: true,
      stringKeys: true,
      maxAliasCount: 0,
    });
  } catch (error) {
    return fail(
      "materialization_contract.lock_invalid",
      error instanceof Error ? error.message : "pnpm lockfile parse failed",
    );
  }
  const root = assertPlainObject(parsed, "materialization_contract.lock_invalid", "lockfile");
  if (!Object.hasOwn(root, "packages")) {
    fail("materialization_contract.package_missing", "lockfile packages are missing");
  }
  if (!Object.hasOwn(root, "snapshots")) {
    fail("materialization_contract.snapshot_missing", "lockfile snapshots are missing");
  }
  return {
    packages: assertPlainObject(
      root.packages,
      "materialization_contract.package_missing",
      "lockfile packages",
    ),
    snapshots: assertPlainObject(
      root.snapshots,
      "materialization_contract.snapshot_missing",
      "lockfile snapshots",
    ),
  };
}

export function deriveExternalPackageClosureV1(source: string): ExternalPackageClosureV1 {
  if (typeof source !== "string" || source.length === 0) {
    fail("materialization_contract.lock_invalid", "pnpm lockfile source is empty");
  }
  const { packages, snapshots } = parsePnpmLockfileV1(source);
  const packageKeys = Object.keys(packages).sort(compareCodePoints);
  const snapshotKeys = Object.keys(snapshots).sort(compareCodePoints);
  if (packageKeys.length === 0) {
    fail("materialization_contract.package_missing", "external package closure is empty");
  }
  if (snapshotKeys.length === 0) {
    fail("materialization_contract.snapshot_missing", "external snapshot closure is empty");
  }
  const grouped = new Map<string, MaterializationSnapshotRecordV1[]>();
  for (const packageKey of packageKeys) {
    if (localReferencePattern.test(packageKey)) {
      fail("materialization_contract.lock_invalid", `${packageKey} is a local package key`);
    }
    grouped.set(packageKey, []);
  }
  for (const snapshotKey of snapshotKeys) {
    const matches = packageKeys
      .filter((packageKey) =>
        snapshotKey === packageKey ? true : snapshotKey.startsWith(`${packageKey}(`),
      )
      .sort((left, right) => right.length - left.length || compareCodePoints(left, right));
    const packageKey = matches[0];
    if (packageKey === undefined) {
      fail(
        "materialization_contract.package_missing",
        `snapshot ${snapshotKey} has no package record`,
      );
    }
    if (matches[1]?.length === packageKey.length) {
      fail("materialization_contract.lock_invalid", `snapshot ${snapshotKey} is ambiguous`);
    }
    grouped.get(packageKey)?.push({
      snapshotKey,
      snapshotRecord: normalizeRecordV1(snapshots[snapshotKey], `snapshots/${snapshotKey}`),
    });
  }
  return packageKeys.map((packageKey) => {
    const snapshotRecords = grouped.get(packageKey) ?? [];
    if (snapshotRecords.length === 0) {
      fail(
        "materialization_contract.snapshot_missing",
        `package ${packageKey} has no snapshot record`,
      );
    }
    return {
      packageKey,
      packageRecord: normalizeRecordV1(packages[packageKey], `packages/${packageKey}`),
      snapshotRecords: snapshotRecords.toSorted((left, right) =>
        compareCodePoints(left.snapshotKey, right.snapshotKey),
      ),
    };
  });
}

function assertNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0 || hasLoneSurrogate(value)) {
    fail("materialization_contract.schema_invalid", `${path} must be a non-empty string`);
  }
  return value;
}

function validateExternalPackageClosureV1(value: unknown): ExternalPackageClosureV1 {
  if (!Array.isArray(value) || value.length === 0) {
    fail("materialization_contract.package_missing", "externalPackages must not be empty");
  }
  const packageKeys = new Set<string>();
  const validated: MaterializationExternalPackageV1[] = [];
  let previousPackageKey: string | undefined;
  for (const [packageIndex, candidate] of value.entries()) {
    const entry = assertPlainObject(
      candidate,
      "materialization_contract.schema_invalid",
      `externalPackages/${packageIndex}`,
    );
    assertExactKeys(
      entry,
      ["packageKey", "packageRecord", "snapshotRecords"],
      `externalPackages/${packageIndex}`,
    );
    const packageKey = assertNonEmptyString(
      entry.packageKey,
      `externalPackages/${packageIndex}/packageKey`,
    );
    if (packageKeys.has(packageKey)) {
      fail("materialization_contract.package_duplicate", `duplicate package ${packageKey}`);
    }
    if (
      previousPackageKey !== undefined &&
      compareCodePoints(previousPackageKey, packageKey) >= 0
    ) {
      fail("materialization_contract.schema_invalid", "externalPackages are not sorted");
    }
    packageKeys.add(packageKey);
    previousPackageKey = packageKey;
    if (!Array.isArray(entry.snapshotRecords) || entry.snapshotRecords.length === 0) {
      fail(
        "materialization_contract.snapshot_missing",
        `package ${packageKey} has no snapshot records`,
      );
    }
    const snapshotKeys = new Set<string>();
    const snapshotRecords: MaterializationSnapshotRecordV1[] = [];
    let previousSnapshotKey: string | undefined;
    for (const [snapshotIndex, snapshotCandidate] of entry.snapshotRecords.entries()) {
      const snapshot = assertPlainObject(
        snapshotCandidate,
        "materialization_contract.schema_invalid",
        `externalPackages/${packageIndex}/snapshotRecords/${snapshotIndex}`,
      );
      assertExactKeys(
        snapshot,
        ["snapshotKey", "snapshotRecord"],
        `externalPackages/${packageIndex}/snapshotRecords/${snapshotIndex}`,
      );
      const snapshotKey = assertNonEmptyString(
        snapshot.snapshotKey,
        `externalPackages/${packageIndex}/snapshotRecords/${snapshotIndex}/snapshotKey`,
      );
      if (snapshotKeys.has(snapshotKey)) {
        fail("materialization_contract.snapshot_duplicate", `duplicate snapshot ${snapshotKey}`);
      }
      if (
        previousSnapshotKey !== undefined &&
        compareCodePoints(previousSnapshotKey, snapshotKey) >= 0
      ) {
        fail("materialization_contract.schema_invalid", `${packageKey} snapshots are not sorted`);
      }
      if (snapshotKey !== packageKey && !snapshotKey.startsWith(`${packageKey}(`)) {
        fail(
          "materialization_contract.package_missing",
          `snapshot ${snapshotKey} does not belong to ${packageKey}`,
        );
      }
      snapshotKeys.add(snapshotKey);
      previousSnapshotKey = snapshotKey;
      snapshotRecords.push({
        snapshotKey,
        snapshotRecord: normalizeRecordV1(
          snapshot.snapshotRecord,
          `externalPackages/${packageIndex}/snapshotRecords/${snapshotIndex}/snapshotRecord`,
        ),
      });
    }
    validated.push({
      packageKey,
      packageRecord: normalizeRecordV1(
        entry.packageRecord,
        `externalPackages/${packageIndex}/packageRecord`,
      ),
      snapshotRecords,
    });
  }
  return validated;
}

export function validateMaterializationContractV1(value: unknown): MaterializationContractV1 {
  const root = assertPlainObject(
    value,
    "materialization_contract.schema_invalid",
    "materialization contract",
  );
  assertExactKeys(root, ["externalPackages", "playwright", "pnpm", "schemaRevision"], "/");
  if (root.schemaRevision !== 1) {
    fail("materialization_contract.schema_invalid", "schemaRevision must equal 1");
  }
  const pnpm = assertPlainObject(root.pnpm, "materialization_contract.schema_invalid", "pnpm");
  assertExactKeys(pnpm, ["version"], "/pnpm");
  const playwright = assertPlainObject(
    root.playwright,
    "materialization_contract.schema_invalid",
    "playwright",
  );
  assertExactKeys(playwright, ["browsers", "version"], "/playwright");
  const browsers = assertPlainObject(
    playwright.browsers,
    "materialization_contract.schema_invalid",
    "playwright/browsers",
  );
  assertExactKeys(browsers, ["chromium", "webkit"], "/playwright/browsers");
  const chromium = assertPlainObject(
    browsers.chromium,
    "materialization_contract.schema_invalid",
    "playwright/browsers/chromium",
  );
  const webkit = assertPlainObject(
    browsers.webkit,
    "materialization_contract.schema_invalid",
    "playwright/browsers/webkit",
  );
  assertExactKeys(chromium, ["revision"], "/playwright/browsers/chromium");
  assertExactKeys(webkit, ["revision"], "/playwright/browsers/webkit");
  const chromiumRevision = assertNonEmptyString(
    chromium.revision,
    "/playwright/browsers/chromium/revision",
  );
  const webkitRevision = assertNonEmptyString(
    webkit.revision,
    "/playwright/browsers/webkit/revision",
  );
  if (!/^\d+$/u.test(chromiumRevision) || !/^\d+$/u.test(webkitRevision)) {
    fail("materialization_contract.schema_invalid", "browser revisions must be decimal strings");
  }
  return {
    schemaRevision: 1,
    pnpm: { version: assertNonEmptyString(pnpm.version, "/pnpm/version") },
    playwright: {
      version: assertNonEmptyString(playwright.version, "/playwright/version"),
      browsers: {
        chromium: { revision: chromiumRevision },
        webkit: { revision: webkitRevision },
      },
    },
    externalPackages: validateExternalPackageClosureV1(root.externalPackages),
  };
}

export function createMaterializationContractV1(source: string): MaterializationContractV1 {
  return validateMaterializationContractV1({
    schemaRevision: 1,
    pnpm: { version: materializationInputsV1.pnpmVersion },
    playwright: {
      version: materializationInputsV1.playwrightVersion,
      browsers: {
        chromium: { revision: materializationInputsV1.chromiumRevision },
        webkit: { revision: materializationInputsV1.webkitRevision },
      },
    },
    externalPackages: deriveExternalPackageClosureV1(source),
  });
}

function digestCanonicalV1(domain: string, value: unknown): `sha256:${string}` {
  const hash = createHash("sha256");
  hash.update(domain, "utf8");
  hash.update(Uint8Array.of(0));
  hash.update(canonicalJsonTextV1(value), "utf8");
  return `sha256:${hash.digest("hex")}`;
}

export function computePackageClosureDigestV1(
  closure: ExternalPackageClosureV1,
): `sha256:${string}` {
  return digestCanonicalV1(
    "project-tavern:external-package-closure:v1",
    validateExternalPackageClosureV1(closure),
  );
}

export function computeMaterializationDigestV1(
  contract: MaterializationContractV1,
): `sha256:${string}` {
  return digestCanonicalV1(
    "project-tavern:goal-materialization:v1",
    validateMaterializationContractV1(contract),
  );
}

export function serializeMaterializationContractV1(
  contract: MaterializationContractV1,
): Uint8Array {
  return canonicalPrettyJsonBytesV1(validateMaterializationContractV1(contract));
}

export function parseMaterializationContractV1(bytes: Uint8Array): MaterializationContractV1 {
  const contract = validateMaterializationContractV1(parseStrictJsonValueV1(bytes));
  if (!equalBytes(serializeMaterializationContractV1(contract), bytes)) {
    fail("materialization_contract.noncanonical", "tracked contract bytes are not canonical");
  }
  return contract;
}

export function createNodeMaterializationContractIoV1(): MaterializationContractIoV1 {
  return {
    readFile: async (path) => readFile(path),
    openExclusive: async (path) => {
      const handle = await open(path, "wx", 0o666);
      return {
        write: async (bytes) => {
          await handle.writeFile(bytes);
        },
        sync: async () => {
          await handle.sync();
        },
        close: async () => {
          await handle.close();
        },
      };
    },
    rename: async (from, to) => rename(from, to),
    remove: async (path) => rm(path, { force: true }),
    syncDirectory: async (path) => {
      const handle = await open(path, "r");
      try {
        await handle.sync();
      } finally {
        await handle.close();
      }
    },
    uniqueSuffix: () => `${process.pid}-${randomUUID()}`,
  };
}

function materializationPathsV1(root: string): {
  readonly lockfile: string;
  readonly contract: string;
} {
  return {
    lockfile: resolve(root, "pnpm-lock.yaml"),
    contract: resolve(root, "scripts/preflight/materialization-lock.json"),
  };
}

export async function readMaterializationContractV1(
  root: string,
  io: MaterializationContractIoV1 = createNodeMaterializationContractIoV1(),
): Promise<MaterializationContractReadResultV1> {
  const paths = materializationPathsV1(root);
  const [lockfileBytes, contractBytes] = await Promise.all([
    io.readFile(paths.lockfile),
    io.readFile(paths.contract),
  ]);
  const expected = createMaterializationContractV1(decodeUtf8V1(lockfileBytes, "pnpm lockfile"));
  const contract = parseMaterializationContractV1(contractBytes);
  if (!equalBytes(serializeMaterializationContractV1(expected), contractBytes)) {
    fail("materialization_contract.stale", "tracked contract does not match pnpm-lock.yaml");
  }
  return {
    contract,
    packageClosureDigest: computePackageClosureDigestV1(contract.externalPackages),
    materializationDigest: computeMaterializationDigestV1(contract),
  };
}

export async function writeMaterializationContractV1(
  root: string,
  io: MaterializationContractIoV1 = createNodeMaterializationContractIoV1(),
): Promise<MaterializationContractReadResultV1> {
  const paths = materializationPathsV1(root);
  const lockfileBytes = await io.readFile(paths.lockfile);
  const contract = createMaterializationContractV1(decodeUtf8V1(lockfileBytes, "pnpm lockfile"));
  const bytes = serializeMaterializationContractV1(contract);
  const candidate = `${paths.contract}.candidate-${io.uniqueSuffix()}`;
  try {
    const handle = await io.openExclusive(candidate);
    try {
      await handle.write(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    const candidateBytes = await io.readFile(candidate);
    const candidateContract = parseMaterializationContractV1(candidateBytes);
    if (
      !equalBytes(candidateBytes, bytes) ||
      computeMaterializationDigestV1(candidateContract) !== computeMaterializationDigestV1(contract)
    ) {
      fail("materialization_contract.noncanonical", "writer candidate validation failed");
    }
    await io.rename(candidate, paths.contract);
    await io.syncDirectory(dirname(paths.contract));
  } finally {
    await io.remove(candidate);
  }
  return {
    contract,
    packageClosureDigest: computePackageClosureDigestV1(contract.externalPackages),
    materializationDigest: computeMaterializationDigestV1(contract),
  };
}

export function assertMaterializationWriterIsolationV1(scripts: unknown): void {
  const mappings = assertPlainObject(
    scripts,
    "materialization_contract.schema_invalid",
    "package scripts",
  );
  const writer = mappings["update:materialization-lock"];
  if (
    writer !==
    "node --experimental-strip-types scripts/preflight/materialization-contract.mts --write"
  ) {
    fail("materialization_contract.schema_invalid", "update writer mapping is not exact");
  }
  for (const [name, command] of Object.entries(mappings)) {
    if (name !== "verify" && !name.startsWith("verify:") && name !== "prepare:goal") continue;
    if (typeof command !== "string") {
      fail("materialization_contract.schema_invalid", `${name} is not a command string`);
    }
    if (
      command.includes("update:materialization-lock") ||
      command.includes("materialization-contract.mts") ||
      command.includes("--write")
    ) {
      fail("materialization_contract.schema_invalid", `${name} can reach the contract writer`);
    }
  }
}

const isMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const root = resolve(import.meta.dirname, "../..");
  const commandArguments = process.argv.slice(2);
  if (commandArguments.length === 1 && commandArguments[0] === "--write") {
    const result = await writeMaterializationContractV1(root);
    console.log(`materialization contract written ${result.materializationDigest}`);
  } else if (commandArguments.length === 0) {
    const result = await readMaterializationContractV1(root);
    console.log(`materialization contract verified ${result.materializationDigest}`);
  } else {
    throw new TypeError("usage: materialization-contract.mts [--write]");
  }
}
