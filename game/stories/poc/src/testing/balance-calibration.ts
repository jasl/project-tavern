// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type DeepReadonly,
  type NonNegativeSafeInteger,
  type PositiveSafeInteger,
} from "@sillymaker/base";
import { ZodError } from "zod";

import {
  createPocGameSimulationV1,
  createPocRulesV1,
  deepFreezePocValueV1,
  pocSimulationDataSchemaV1,
  pocStoryBalanceSchemaV1,
  type PocSimulationProgramV1,
} from "../gameplay/index.js";
import {
  materializePocSimulationProgramV1,
  pocSimulationPatchSurfaceV1,
} from "../patch-surfaces.js";

import type { PocFacilityCounterfactualChecksV1 } from "./counterfactual-scenarios.js";
import {
  pocReferenceStrategyIdsV1,
  type PocReferenceStrategyIdV1,
} from "./reference-strategy-definitions.js";

export const pocBalanceCalibrationFieldsV1 = Object.freeze([
  "levy",
  "openingFee",
  "assistedWage",
  "delegatedWage",
  "manualGuestCapacity",
  "manualPreparationBase",
  "manualPreparationPerAction",
  "assistedGuestCapacity",
  "assistedPreparationBase",
  "assistedPreparationPerAction",
  "delegatedGuestCapacity",
  "delegatedPreparationBase",
  "delegatedPreparationPerAction",
] as const);

export type PocBalanceCalibrationFieldV1 = (typeof pocBalanceCalibrationFieldsV1)[number];
export type PocBalanceCalibrationDirectionV1 = "decrease" | "increase";

export type PocBalanceCalibrationValuesV1 = Readonly<
  Record<PocBalanceCalibrationFieldV1, NonNegativeSafeInteger>
>;

export interface PocStrategyBalanceMetricsV1 {
  readonly paidCount: NonNegativeSafeInteger;
  readonly stableCount: NonNegativeSafeInteger;
  readonly dangerCount: NonNegativeSafeInteger;
  readonly arrearsCount: NonNegativeSafeInteger;
  readonly medianPaidAfterTaxCash: number | null;
}

export interface PocBalanceMetricsV1 {
  readonly firstSeed: 1;
  readonly lastSeed: 1000;
  readonly strategies: Readonly<Record<PocReferenceStrategyIdV1, PocStrategyBalanceMetricsV1>>;
  readonly d4CashPressure: Readonly<{
    readonly cashFirstPaidCount: NonNegativeSafeInteger;
    readonly relationshipFirstPaidCount: NonNegativeSafeInteger;
    readonly investigationFirstPaidCount: NonNegativeSafeInteger;
  }>;
  readonly strictDominanceCountByStrategy: Readonly<
    Record<PocReferenceStrategyIdV1, NonNegativeSafeInteger>
  >;
  readonly maximumStrictDominance: NonNegativeSafeInteger;
}

export type PocBalanceCounterfactualChecksV1 = PocFacilityCounterfactualChecksV1;

export interface PocBalanceCalibrationEvaluationV1 {
  readonly metrics: PocBalanceMetricsV1;
  readonly counterfactuals: PocBalanceCounterfactualChecksV1;
}

export interface PocBalanceFullReportV1 {
  readonly deficit: NonNegativeSafeInteger;
  readonly evaluation: PocBalanceCalibrationEvaluationV1;
}

export interface PocBalanceCalibrationPointV1 {
  readonly values: DeepReadonly<PocBalanceCalibrationValuesV1>;
  readonly program: DeepReadonly<PocSimulationProgramV1>;
}

export interface PocBalanceCalibrationEvaluationPortV1 {
  readonly evaluate: (
    point: DeepReadonly<PocBalanceCalibrationPointV1>,
  ) => Promise<DeepReadonly<PocBalanceCalibrationEvaluationV1>>;
}

export interface EvaluatePocBalanceCalibrationStepInputV1 {
  readonly iteration: NonNegativeSafeInteger;
  readonly values: DeepReadonly<PocBalanceCalibrationValuesV1>;
  readonly evaluationPort: PocBalanceCalibrationEvaluationPortV1;
}

export interface PocBalanceCalibrationNeighborV1 {
  readonly field: PocBalanceCalibrationFieldV1;
  readonly direction: PocBalanceCalibrationDirectionV1;
  readonly step: PositiveSafeInteger;
  readonly beforeValue: NonNegativeSafeInteger;
  readonly afterValue: NonNegativeSafeInteger;
}

export interface PocBalanceCalibrationEvaluatedNeighborV1 extends PocBalanceCalibrationNeighborV1 {
  readonly evaluation: PocBalanceCalibrationEvaluationV1;
}

export interface PocBalanceCalibrationStepInputV1 {
  /** Number of calibration changes already applied. The twelfth change is index 11. */
  readonly iteration: NonNegativeSafeInteger;
  readonly values: PocBalanceCalibrationValuesV1;
  readonly evaluation: PocBalanceCalibrationEvaluationV1;
  readonly candidates: readonly PocBalanceCalibrationEvaluatedNeighborV1[];
}

export interface PocBalanceCalibrationCandidateV1 {
  readonly kind: "candidate";
  readonly field: PocBalanceCalibrationFieldV1;
  readonly direction: PocBalanceCalibrationDirectionV1;
  readonly step: PositiveSafeInteger;
  readonly beforeValue: NonNegativeSafeInteger;
  readonly afterValue: NonNegativeSafeInteger;
  readonly beforeDeficit: NonNegativeSafeInteger;
  readonly afterDeficit: NonNegativeSafeInteger;
  readonly metrics: PocBalanceMetricsV1;
}

export type PocBalanceCalibrationSelectionV1 =
  | PocBalanceCalibrationCandidateV1
  | {
      readonly kind: "balance_contract_unsatisfied";
      readonly reason: "no_improving_neighbor" | "iteration_limit";
      readonly metrics: PocBalanceMetricsV1;
      readonly candidates: readonly PocBalanceCalibrationCandidateV1[];
    };

export interface PocBalanceCalibrationRunV1 {
  readonly step: PocBalanceCalibrationStepInputV1;
  readonly selection: PocBalanceCalibrationSelectionV1;
}

export interface PocBalanceCalibrationRunExpectationV1 {
  readonly iteration: NonNegativeSafeInteger;
  readonly values: DeepReadonly<PocBalanceCalibrationValuesV1>;
}

const calibrationIterationLimitV1 = parseNonNegativeSafeInteger(12);
const booleanFailurePenaltyV1 = parseNonNegativeSafeInteger(1001);
const unitStepV1 = parsePositiveSafeInteger(1);
const levyStepV1 = parsePositiveSafeInteger(2);

const calibrationFieldIndexV1 = new Map<PocBalanceCalibrationFieldV1, number>(
  pocBalanceCalibrationFieldsV1.map((field, index) => [field, index] as const),
);
const balanceCorpusSizeV1 = 1000;
const d4CashPressureKeysV1 = Object.freeze([
  "cashFirstPaidCount",
  "relationshipFirstPaidCount",
  "investigationFirstPaidCount",
] as const);
const counterfactualKeysV1 = Object.freeze([
  "comfortableBedRecovery",
  "investigationColdStorageShelfLife",
  "fullDelegationColdStorageShelfLife",
] as const);

function failCalibrationValuesV1(detail: string): never {
  throw new TypeError(`invalid PoC balance calibration values: ${detail}`);
}

function failCalibrationEvaluationV1(detail: string): never {
  throw new TypeError(`invalid PoC balance calibration evaluation: ${detail}`);
}

function failCalibrationEvidenceV1(detail: string): never {
  throw new TypeError(`invalid PoC balance calibration evidence: ${detail}`);
}

function failPocBalanceFullReportV1(detail: string): never {
  throw new TypeError(`invalid PoC balance full report: ${detail}`);
}

function failPocBalanceEvidenceV1(detail: string, path: string): never {
  throw new TypeError(`invalid PoC balance evidence: ${detail} at ${path || "/"}`);
}

function balanceEvidencePointerSegmentV1(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function assertValidBalanceEvidenceStringV1(value: string, path: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (index + 1 >= value.length || next < 0xdc00 || next > 0xdfff) {
        failPocBalanceEvidenceV1("string contains a lone surrogate", path);
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      failPocBalanceEvidenceV1("string contains a lone surrogate", path);
    }
  }
}

function compareBalanceEvidenceCodePointsV1(left: string, right: string): number {
  const leftPoints = Array.from(left, (value) => value.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (value) => value.codePointAt(0) ?? 0);
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}

function balanceEvidenceUtf8V1(value: string): Uint8Array {
  const bytes: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const first = value.charCodeAt(index);
    let codePoint = first;
    if (first >= 0xd800 && first <= 0xdbff) {
      const second = value.charCodeAt(index + 1);
      codePoint = 0x1_0000 + ((first - 0xd800) << 10) + (second - 0xdc00);
      index += 1;
    }
    if (codePoint <= 0x7f) bytes.push(codePoint);
    else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return Uint8Array.from(bytes);
}

/** Canonical balance-evidence JSON, extended only for exactly representable safe half-integers. */
export function canonicalPocBalanceEvidenceBytesV1(value: unknown): Uint8Array {
  const active = new Set<object>();

  const encode = (current: unknown, path: string): string => {
    if (current === null) return "null";
    if (typeof current === "boolean") return current ? "true" : "false";
    if (typeof current === "string") {
      assertValidBalanceEvidenceStringV1(current, path);
      return JSON.stringify(current);
    }
    if (typeof current === "number") {
      if (!Number.isFinite(current)) {
        return failPocBalanceEvidenceV1("number must be finite", path);
      }
      if (Object.is(current, -0)) {
        return failPocBalanceEvidenceV1("number must not be negative zero", path);
      }
      if (Number.isSafeInteger(current)) return String(current);
      if (current < 0 || !Number.isSafeInteger(current * 2)) {
        return failPocBalanceEvidenceV1(
          "number must be a safe integer or non-negative exact safe half-integer",
          path,
        );
      }
      return String(current);
    }
    if (
      typeof current === "undefined" ||
      typeof current === "symbol" ||
      typeof current === "bigint"
    ) {
      return failPocBalanceEvidenceV1("unsupported value", path);
    }
    if (typeof current === "function") {
      return failPocBalanceEvidenceV1("functions are forbidden", path);
    }

    const object = current as object;
    if (active.has(object)) return failPocBalanceEvidenceV1("cyclic value", path);
    active.add(object);
    try {
      if (Array.isArray(object)) {
        if (
          Object.getPrototypeOf(object) !== Array.prototype ||
          Object.getOwnPropertySymbols(object).length !== 0
        ) {
          return failPocBalanceEvidenceV1("array must be a plain dense array", path);
        }
        const descriptors = Object.getOwnPropertyDescriptors(object);
        const keys = Object.keys(descriptors).filter((key) => key !== "length");
        if (keys.length !== object.length || keys.some((key, index) => key !== String(index))) {
          return failPocBalanceEvidenceV1("array must be dense and undecorated", path);
        }
        const values: string[] = [];
        for (let index = 0; index < object.length; index += 1) {
          const descriptor = descriptors[String(index)];
          if (
            descriptor === undefined ||
            descriptor.get !== undefined ||
            descriptor.set !== undefined ||
            !("value" in descriptor) ||
            descriptor.enumerable !== true
          ) {
            return failPocBalanceEvidenceV1(
              "array must contain enumerable data elements",
              `${path}/${String(index)}`,
            );
          }
          values.push(encode(descriptor.value, `${path}/${String(index)}`));
        }
        return `[${values.join(",")}]`;
      }

      if (
        Object.getPrototypeOf(object) !== Object.prototype ||
        Object.getOwnPropertySymbols(object).length !== 0
      ) {
        return failPocBalanceEvidenceV1("object must be a plain string-keyed data object", path);
      }
      const descriptors = Object.getOwnPropertyDescriptors(object);
      const keys = Object.keys(descriptors).sort(compareBalanceEvidenceCodePointsV1);
      const members: string[] = [];
      for (const key of keys) {
        assertValidBalanceEvidenceStringV1(key, path);
        const propertyPath = `${path}/${balanceEvidencePointerSegmentV1(key)}`;
        const descriptor = descriptors[key];
        if (
          descriptor === undefined ||
          descriptor.get !== undefined ||
          descriptor.set !== undefined ||
          !("value" in descriptor) ||
          descriptor.enumerable !== true
        ) {
          return failPocBalanceEvidenceV1(
            "object fields must be enumerable data fields",
            propertyPath,
          );
        }
        members.push(`${JSON.stringify(key)}:${encode(descriptor.value, propertyPath)}`);
      }
      return `{${members.join(",")}}`;
    } finally {
      active.delete(object);
    }
  };

  return balanceEvidenceUtf8V1(encode(value, ""));
}

function exactCalibrationRecordV1(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
  fail: (detail: string) => never,
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return fail(`${label} must be a data object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (
    (prototype !== Object.prototype && prototype !== null) ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    return fail(`${label} must be a plain string-keyed data object`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actualKeys = Object.keys(descriptors).toSorted();
  const canonicalKeys = [...expectedKeys].toSorted();
  if (
    actualKeys.length !== canonicalKeys.length ||
    actualKeys.some((key, index) => key !== canonicalKeys[index]) ||
    Object.values(descriptors).some(
      (descriptor) =>
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true,
    )
  ) {
    return fail(`${label} has unexpected or hidden fields`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function denseCalibrationArrayV1(value: unknown, label: string): readonly unknown[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    return failCalibrationEvidenceV1(`${label} must be a plain dense array`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors).filter((key) => key !== "length");
  if (
    keys.length !== value.length ||
    keys.some((key, index) => key !== String(index)) ||
    keys.some((key) => {
      const descriptor = descriptors[key];
      return (
        descriptor === undefined ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      );
    })
  ) {
    return failCalibrationEvidenceV1(`${label} must be a plain dense array`);
  }
  return value;
}

function parseCalibrationCountV1(value: unknown, label: string): NonNegativeSafeInteger {
  let parsed: NonNegativeSafeInteger;
  try {
    parsed = parseNonNegativeSafeInteger(value);
  } catch {
    return failCalibrationEvaluationV1(`${label} must be a NonNegativeSafeInteger`);
  }
  if (parsed > balanceCorpusSizeV1) {
    return failCalibrationEvaluationV1(`${label} exceeds the complete corpus size`);
  }
  return parsed;
}

function parseCalibrationMedianV1(
  value: unknown,
  paidCount: NonNegativeSafeInteger,
  label: string,
): number | null {
  if (value === null) {
    if (paidCount !== 0) {
      return failCalibrationEvaluationV1(`${label} is null despite paid samples`);
    }
    return null;
  }
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    Object.is(value, -0) ||
    value < 0 ||
    (!Number.isSafeInteger(value) && !Number.isSafeInteger(value - 0.5)) ||
    paidCount === 0
  ) {
    return failCalibrationEvaluationV1(
      `${label} must be a finite non-negative integer or half-integer backed by paid samples`,
    );
  }
  return value;
}

function parseStrategyBalanceMetricsV1(
  value: unknown,
  strategyId: PocReferenceStrategyIdV1,
): PocStrategyBalanceMetricsV1 {
  const metrics = exactCalibrationRecordV1(
    value,
    ["paidCount", "stableCount", "dangerCount", "arrearsCount", "medianPaidAfterTaxCash"],
    `${strategyId} metrics`,
    failCalibrationEvaluationV1,
  );
  const paidCount = parseCalibrationCountV1(metrics.paidCount, `${strategyId}.paidCount`);
  const stableCount = parseCalibrationCountV1(metrics.stableCount, `${strategyId}.stableCount`);
  const dangerCount = parseCalibrationCountV1(metrics.dangerCount, `${strategyId}.dangerCount`);
  const arrearsCount = parseCalibrationCountV1(metrics.arrearsCount, `${strategyId}.arrearsCount`);
  if (BigInt(stableCount) + BigInt(dangerCount) + BigInt(arrearsCount) !== 1000n) {
    return failCalibrationEvaluationV1(`${strategyId} ending counts do not equal 1000`);
  }
  if (BigInt(stableCount) + BigInt(dangerCount) !== BigInt(paidCount)) {
    return failCalibrationEvaluationV1(`${strategyId} paidCount does not equal paid endings`);
  }
  return Object.freeze({
    paidCount,
    stableCount,
    dangerCount,
    arrearsCount,
    medianPaidAfterTaxCash: parseCalibrationMedianV1(
      metrics.medianPaidAfterTaxCash,
      paidCount,
      `${strategyId}.medianPaidAfterTaxCash`,
    ),
  });
}

function parsePocBalanceMetricsV1(value: unknown): PocBalanceMetricsV1 {
  const metrics = exactCalibrationRecordV1(
    value,
    [
      "firstSeed",
      "lastSeed",
      "strategies",
      "d4CashPressure",
      "strictDominanceCountByStrategy",
      "maximumStrictDominance",
    ],
    "metrics",
    failCalibrationEvaluationV1,
  );
  if (metrics.firstSeed !== 1 || metrics.lastSeed !== 1000) {
    return failCalibrationEvaluationV1("metrics must cover seeds 1..1000");
  }

  const strategyValues = exactCalibrationRecordV1(
    metrics.strategies,
    pocReferenceStrategyIdsV1,
    "strategy metrics",
    failCalibrationEvaluationV1,
  );
  const strategies = Object.freeze(
    Object.fromEntries(
      pocReferenceStrategyIdsV1.map((strategyId) => [
        strategyId,
        parseStrategyBalanceMetricsV1(strategyValues[strategyId], strategyId),
      ]),
    ) as unknown as Readonly<Record<PocReferenceStrategyIdV1, PocStrategyBalanceMetricsV1>>,
  );

  const pressureValue = exactCalibrationRecordV1(
    metrics.d4CashPressure,
    d4CashPressureKeysV1,
    "D4 cash-pressure metrics",
    failCalibrationEvaluationV1,
  );
  const d4CashPressure = Object.freeze({
    cashFirstPaidCount: parseCalibrationCountV1(
      pressureValue.cashFirstPaidCount,
      "d4CashPressure.cashFirstPaidCount",
    ),
    relationshipFirstPaidCount: parseCalibrationCountV1(
      pressureValue.relationshipFirstPaidCount,
      "d4CashPressure.relationshipFirstPaidCount",
    ),
    investigationFirstPaidCount: parseCalibrationCountV1(
      pressureValue.investigationFirstPaidCount,
      "d4CashPressure.investigationFirstPaidCount",
    ),
  });

  const dominanceValue = exactCalibrationRecordV1(
    metrics.strictDominanceCountByStrategy,
    pocReferenceStrategyIdsV1,
    "strict-dominance metrics",
    failCalibrationEvaluationV1,
  );
  const strictDominanceCountByStrategy = Object.freeze(
    Object.fromEntries(
      pocReferenceStrategyIdsV1.map((strategyId) => [
        strategyId,
        parseCalibrationCountV1(
          dominanceValue[strategyId],
          `strictDominanceCountByStrategy.${strategyId}`,
        ),
      ]),
    ) as unknown as Readonly<Record<PocReferenceStrategyIdV1, NonNegativeSafeInteger>>,
  );
  const dominanceTotal = Object.values(strictDominanceCountByStrategy).reduce(
    (total, count) => total + BigInt(count),
    0n,
  );
  if (dominanceTotal > 1000n) {
    return failCalibrationEvaluationV1("strict-dominance counts exceed the corpus size");
  }
  const maximumStrictDominance = parseCalibrationCountV1(
    metrics.maximumStrictDominance,
    "maximumStrictDominance",
  );
  if (maximumStrictDominance !== Math.max(...Object.values(strictDominanceCountByStrategy))) {
    return failCalibrationEvaluationV1(
      "maximumStrictDominance does not equal the maximum strategy count",
    );
  }

  return Object.freeze({
    firstSeed: 1,
    lastSeed: 1000,
    strategies,
    d4CashPressure,
    strictDominanceCountByStrategy,
    maximumStrictDominance,
  });
}

function parsePocBalanceCalibrationEvaluationV1(value: unknown): PocBalanceCalibrationEvaluationV1 {
  const evaluation = exactCalibrationRecordV1(
    value,
    ["metrics", "counterfactuals"],
    "evaluation",
    failCalibrationEvaluationV1,
  );
  const counterfactualValue = exactCalibrationRecordV1(
    evaluation.counterfactuals,
    counterfactualKeysV1,
    "counterfactual checks",
    failCalibrationEvaluationV1,
  );
  const counterfactuals = Object.fromEntries(
    counterfactualKeysV1.map((key) => {
      const check = counterfactualValue[key];
      if (typeof check !== "boolean") {
        return failCalibrationEvaluationV1(`${key} counterfactual must be boolean`);
      }
      return [key, check] as const;
    }),
  ) as unknown as PocBalanceCounterfactualChecksV1;
  return deepFreezePocValueV1({
    metrics: parsePocBalanceMetricsV1(evaluation.metrics),
    counterfactuals,
  });
}

function defaultPocCalibrationProgramV1(): DeepReadonly<PocSimulationProgramV1> {
  const { slots } = pocSimulationPatchSurfaceV1;
  return materializePocSimulationProgramV1({
    balance: slots.balance.defaultValue,
    demandPreview: slots.demandPreview.defaultValue,
    demandResolve: slots.demandResolve.defaultValue,
    tavernPreview: slots.tavernPreview.defaultValue,
    tavernSettle: slots.tavernSettle.defaultValue,
    checksDescribe: slots.checksDescribe.defaultValue,
    checksResolve: slots.checksResolve.defaultValue,
    endingsEvaluate: slots.endingsEvaluate.defaultValue,
  });
}

function serviceModeValueV1(
  values: PocBalanceCalibrationValuesV1,
  mode: "manual" | "assisted" | "delegated" | "closed",
  field: "wage" | "baseReceptionCapacity" | "basePreparationPoints" | "preparationPointsPerAction",
  fallback: number,
): number {
  if (mode === "closed" || (mode === "manual" && field === "wage")) return fallback;
  const prefix = mode === "manual" ? "manual" : mode === "assisted" ? "assisted" : "delegated";
  const suffix =
    field === "wage"
      ? "Wage"
      : field === "baseReceptionCapacity"
        ? "GuestCapacity"
        : field === "basePreparationPoints"
          ? "PreparationBase"
          : "PreparationPerAction";
  const calibrationField = `${prefix}${suffix}` as PocBalanceCalibrationFieldV1;
  if (!pocBalanceCalibrationFieldsV1.includes(calibrationField)) {
    throw new TypeError(`unsupported calibration service field ${calibrationField}`);
  }
  return values[calibrationField];
}

export function pocBalanceCalibrationValuesV1(): PocBalanceCalibrationValuesV1 {
  const balance = defaultPocCalibrationProgramV1().data.balance;
  const mode = (id: "manual" | "assisted" | "delegated") => {
    const value = balance.serviceModes.find((candidate) => candidate.mode === id);
    if (value === undefined) throw new TypeError(`missing calibration ServiceMode ${id}`);
    return value;
  };
  const manual = mode("manual");
  const assisted = mode("assisted");
  const delegated = mode("delegated");
  return deepFreezePocValueV1({
    levy: parseNonNegativeSafeInteger(balance.levyAmount),
    openingFee: parseNonNegativeSafeInteger(balance.openingFee),
    assistedWage: parseNonNegativeSafeInteger(assisted.wage),
    delegatedWage: parseNonNegativeSafeInteger(delegated.wage),
    manualGuestCapacity: parseNonNegativeSafeInteger(manual.baseReceptionCapacity),
    manualPreparationBase: parseNonNegativeSafeInteger(manual.basePreparationPoints),
    manualPreparationPerAction: parseNonNegativeSafeInteger(manual.preparationPointsPerAction),
    assistedGuestCapacity: parseNonNegativeSafeInteger(assisted.baseReceptionCapacity),
    assistedPreparationBase: parseNonNegativeSafeInteger(assisted.basePreparationPoints),
    assistedPreparationPerAction: parseNonNegativeSafeInteger(assisted.preparationPointsPerAction),
    delegatedGuestCapacity: parseNonNegativeSafeInteger(delegated.baseReceptionCapacity),
    delegatedPreparationBase: parseNonNegativeSafeInteger(delegated.basePreparationPoints),
    delegatedPreparationPerAction: parseNonNegativeSafeInteger(
      delegated.preparationPointsPerAction,
    ),
  });
}

function parsePocBalanceCalibrationValuesV1(
  valuesValue: DeepReadonly<PocBalanceCalibrationValuesV1>,
): PocBalanceCalibrationValuesV1 {
  const values = exactCalibrationRecordV1(
    valuesValue,
    pocBalanceCalibrationFieldsV1,
    "calibration values",
    failCalibrationValuesV1,
  );
  return deepFreezePocValueV1(
    Object.fromEntries(
      pocBalanceCalibrationFieldsV1.map((field) => {
        try {
          return [field, parseNonNegativeSafeInteger(values[field])] as const;
        } catch {
          return failCalibrationValuesV1(`${field} must be a NonNegativeSafeInteger`);
        }
      }),
    ) as unknown as PocBalanceCalibrationValuesV1,
  );
}

export function createPocBalanceCalibrationProgramV1(
  valuesValue: DeepReadonly<PocBalanceCalibrationValuesV1>,
): DeepReadonly<PocSimulationProgramV1> {
  const values = parsePocBalanceCalibrationValuesV1(valuesValue);
  const baseProgram = defaultPocCalibrationProgramV1();
  const balance = pocStoryBalanceSchemaV1.parse({
    ...baseProgram.data.balance,
    levyAmount: values.levy,
    openingFee: values.openingFee,
    serviceModes: baseProgram.data.balance.serviceModes.map((serviceMode) => ({
      ...serviceMode,
      wage: serviceModeValueV1(values, serviceMode.mode, "wage", serviceMode.wage),
      baseReceptionCapacity: serviceModeValueV1(
        values,
        serviceMode.mode,
        "baseReceptionCapacity",
        serviceMode.baseReceptionCapacity,
      ),
      basePreparationPoints: serviceModeValueV1(
        values,
        serviceMode.mode,
        "basePreparationPoints",
        serviceMode.basePreparationPoints,
      ),
      preparationPointsPerAction: serviceModeValueV1(
        values,
        serviceMode.mode,
        "preparationPointsPerAction",
        serviceMode.preparationPointsPerAction,
      ),
    })),
  });
  const data = pocSimulationDataSchemaV1.parse({ ...baseProgram.data, balance });
  const program = deepFreezePocValueV1<PocSimulationProgramV1>({
    data,
    rules: createPocRulesV1(data),
  });
  createPocGameSimulationV1(program);
  return program;
}

function createPocBalanceCalibrationPointV1(
  valuesValue: DeepReadonly<PocBalanceCalibrationValuesV1>,
): DeepReadonly<PocBalanceCalibrationPointV1> {
  const values = parsePocBalanceCalibrationValuesV1(valuesValue);
  return Object.freeze({
    values,
    program: createPocBalanceCalibrationProgramV1(values),
  });
}

function calibrationStepV1(field: PocBalanceCalibrationFieldV1): PositiveSafeInteger {
  return field === "levy" ? levyStepV1 : unitStepV1;
}

function lowerBoundDeficitV1(value: number, minimum: number): number {
  return value < minimum ? minimum - value : 0;
}

function upperBoundDeficitV1(value: number, maximum: number): number {
  return value > maximum ? value - maximum : 0;
}

function rangeDeficitV1(value: number, minimum: number, maximum: number): number {
  return lowerBoundDeficitV1(value, minimum) + upperBoundDeficitV1(value, maximum);
}

function checkedDeficitSumV1(parts: readonly number[]): NonNegativeSafeInteger {
  const total = parts.reduce((sum, part) => sum + BigInt(part), 0n);
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("PoC balance deficit exceeds NonNegativeSafeInteger bounds");
  }
  return parseNonNegativeSafeInteger(Number(total));
}

/**
 * Computes the exact section 14.4 distance. Numeric thresholds use distance to the nearest
 * legal boundary; facility counterfactuals and the Pareto condition use the fixed 1001 penalty.
 */
export function calculatePocBalanceDeficitV1(
  evaluation: PocBalanceCalibrationEvaluationV1,
): NonNegativeSafeInteger {
  const { metrics, counterfactuals } = evaluation;
  const delegation = metrics.strategies["strategy.full_delegation"];
  const delegationMedianDeficit =
    delegation.medianPaidAfterTaxCash === null
      ? booleanFailurePenaltyV1
      : Math.ceil(rangeDeficitV1(delegation.medianPaidAfterTaxCash, 0, 35));

  return checkedDeficitSumV1([
    lowerBoundDeficitV1(metrics.strategies["strategy.cash_first"].paidCount, 900),
    lowerBoundDeficitV1(metrics.strategies["strategy.relationship_first"].paidCount, 900),
    lowerBoundDeficitV1(metrics.strategies["strategy.investigation_first"].paidCount, 900),
    rangeDeficitV1(delegation.paidCount, 850, 950),
    delegationMedianDeficit,
    lowerBoundDeficitV1(metrics.strategies["strategy.two_closures_recovery"].paidCount, 700),
    upperBoundDeficitV1(metrics.strategies["strategy.explicit_failure"].paidCount, 200),
    lowerBoundDeficitV1(metrics.d4CashPressure.cashFirstPaidCount, 750),
    lowerBoundDeficitV1(metrics.d4CashPressure.relationshipFirstPaidCount, 750),
    lowerBoundDeficitV1(metrics.d4CashPressure.investigationFirstPaidCount, 750),
    metrics.maximumStrictDominance <= 800 ? 0 : booleanFailurePenaltyV1,
    counterfactuals.comfortableBedRecovery ? 0 : booleanFailurePenaltyV1,
    counterfactuals.investigationColdStorageShelfLife ? 0 : booleanFailurePenaltyV1,
    counterfactuals.fullDelegationColdStorageShelfLife ? 0 : booleanFailurePenaltyV1,
  ]);
}

/** Re-admits an untrusted canonical full report and derives its claimed deficit locally. */
export function admitPocBalanceFullReportV1(value: unknown): DeepReadonly<PocBalanceFullReportV1> {
  canonicalPocBalanceEvidenceBytesV1(value);
  const report = exactCalibrationRecordV1(
    value,
    ["deficit", "evaluation"],
    "full report",
    failPocBalanceFullReportV1,
  );
  let claimedDeficit: NonNegativeSafeInteger;
  try {
    claimedDeficit = parseNonNegativeSafeInteger(report.deficit);
  } catch {
    return failPocBalanceFullReportV1("deficit must be a NonNegativeSafeInteger");
  }
  const evaluation = parsePocBalanceCalibrationEvaluationV1(report.evaluation);
  const derivedDeficit = calculatePocBalanceDeficitV1(evaluation);
  if (claimedDeficit !== derivedDeficit) {
    return failPocBalanceFullReportV1("claimed deficit does not match the admitted evaluation");
  }
  return deepFreezePocValueV1({ deficit: derivedDeficit, evaluation });
}

function neighborAfterValueV1(
  beforeValue: NonNegativeSafeInteger,
  direction: PocBalanceCalibrationDirectionV1,
  step: PositiveSafeInteger,
): NonNegativeSafeInteger | null {
  const after =
    direction === "decrease"
      ? BigInt(beforeValue) - BigInt(step)
      : BigInt(beforeValue) + BigInt(step);
  if (after < 0n || after > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return parseNonNegativeSafeInteger(Number(after));
}

function enumerateNumericPocBalanceCalibrationNeighborsV1(
  values: PocBalanceCalibrationValuesV1,
): readonly PocBalanceCalibrationNeighborV1[] {
  const neighbors: PocBalanceCalibrationNeighborV1[] = [];
  for (const field of pocBalanceCalibrationFieldsV1) {
    const beforeValue = parseNonNegativeSafeInteger(values[field]);
    const step = calibrationStepV1(field);
    for (const direction of ["decrease", "increase"] as const) {
      const afterValue = neighborAfterValueV1(beforeValue, direction, step);
      if (afterValue === null) continue;
      neighbors.push(Object.freeze({ field, direction, step, beforeValue, afterValue }));
    }
  }
  return Object.freeze(neighbors);
}

interface MaterializedPocBalanceCalibrationNeighborV1 {
  readonly neighbor: PocBalanceCalibrationNeighborV1;
  readonly point: DeepReadonly<PocBalanceCalibrationPointV1>;
}

function valuesForCalibrationNeighborV1(
  values: PocBalanceCalibrationValuesV1,
  neighbor: PocBalanceCalibrationNeighborV1,
): PocBalanceCalibrationValuesV1 {
  return parsePocBalanceCalibrationValuesV1({
    ...values,
    [neighbor.field]: neighbor.afterValue,
  });
}

function materializeLegalPocBalanceCalibrationNeighborsV1(
  values: PocBalanceCalibrationValuesV1,
): readonly MaterializedPocBalanceCalibrationNeighborV1[] {
  const materialized: MaterializedPocBalanceCalibrationNeighborV1[] = [];
  for (const neighbor of enumerateNumericPocBalanceCalibrationNeighborsV1(values)) {
    const candidateValues = valuesForCalibrationNeighborV1(values, neighbor);
    let point: DeepReadonly<PocBalanceCalibrationPointV1>;
    try {
      point = createPocBalanceCalibrationPointV1(candidateValues);
    } catch (error) {
      if (error instanceof ZodError) continue;
      throw error;
    }
    materialized.push(Object.freeze({ neighbor, point }));
  }
  return Object.freeze(materialized);
}

/**
 * Enumerates canonical legal neighbors in field order and with decrease before increase. Numeric
 * bounds are checked first; each remaining neighbor must materialize as a complete valid Program.
 */
export function enumeratePocBalanceCalibrationNeighborsV1(
  valuesValue: DeepReadonly<PocBalanceCalibrationValuesV1>,
): readonly PocBalanceCalibrationNeighborV1[] {
  const current = createPocBalanceCalibrationPointV1(valuesValue);
  return Object.freeze(
    materializeLegalPocBalanceCalibrationNeighborsV1(current.values).map(
      ({ neighbor }) => neighbor,
    ),
  );
}

async function evaluatePocBalanceCalibrationPointV1(
  evaluationPort: PocBalanceCalibrationEvaluationPortV1,
  point: DeepReadonly<PocBalanceCalibrationPointV1>,
): Promise<DeepReadonly<PocBalanceCalibrationEvaluationV1>> {
  if (typeof evaluationPort.evaluate !== "function") {
    throw new TypeError("PoC balance calibration requires an async evaluation port");
  }
  const evaluation = await evaluationPort.evaluate(point);
  return parsePocBalanceCalibrationEvaluationV1(evaluation);
}

/**
 * Evaluates the current point followed by canonical legal neighbors. Corpus evaluation stops only
 * at the first zero-deficit neighbor; when no neighbor reaches zero, the complete legal set is
 * evaluated so the selector has closed evidence.
 */
export async function evaluatePocBalanceCalibrationStepV1(
  input: EvaluatePocBalanceCalibrationStepInputV1,
): Promise<PocBalanceCalibrationStepInputV1> {
  const iteration = parseNonNegativeSafeInteger(input.iteration);
  const current = createPocBalanceCalibrationPointV1(input.values);
  const evaluation = await evaluatePocBalanceCalibrationPointV1(input.evaluationPort, current);
  if (calculatePocBalanceDeficitV1(evaluation) === 0) {
    throw new TypeError("PoC balance calibration current point already satisfies the contract");
  }

  const candidates: PocBalanceCalibrationEvaluatedNeighborV1[] = [];
  for (const { neighbor, point } of materializeLegalPocBalanceCalibrationNeighborsV1(
    current.values,
  )) {
    const neighborEvaluation = await evaluatePocBalanceCalibrationPointV1(
      input.evaluationPort,
      point,
    );
    candidates.push(Object.freeze({ ...neighbor, evaluation: neighborEvaluation }));
    if (calculatePocBalanceDeficitV1(neighborEvaluation) === 0) break;
  }

  return Object.freeze({
    iteration,
    values: current.values,
    evaluation,
    candidates: Object.freeze(candidates),
  });
}

function directionIndexV1(direction: PocBalanceCalibrationDirectionV1): number {
  return direction === "decrease" ? 0 : 1;
}

function compareCandidatesV1(
  left: PocBalanceCalibrationCandidateV1,
  right: PocBalanceCalibrationCandidateV1,
): number {
  if (left.afterDeficit !== right.afterDeficit) {
    return left.afterDeficit - right.afterDeficit;
  }
  const leftFieldIndex = calibrationFieldIndexV1.get(left.field);
  const rightFieldIndex = calibrationFieldIndexV1.get(right.field);
  if (leftFieldIndex === undefined || rightFieldIndex === undefined) {
    throw new TypeError("unknown PoC balance calibration field");
  }
  if (leftFieldIndex !== rightFieldIndex) return leftFieldIndex - rightFieldIndex;
  return directionIndexV1(left.direction) - directionIndexV1(right.direction);
}

function evaluatedCandidateV1(
  beforeDeficit: NonNegativeSafeInteger,
  canonical: PocBalanceCalibrationNeighborV1,
  evaluated: PocBalanceCalibrationEvaluatedNeighborV1,
): PocBalanceCalibrationCandidateV1 {
  return Object.freeze({
    kind: "candidate",
    field: canonical.field,
    direction: canonical.direction,
    step: canonical.step,
    beforeValue: canonical.beforeValue,
    afterValue: canonical.afterValue,
    beforeDeficit,
    afterDeficit: calculatePocBalanceDeficitV1(evaluated.evaluation),
    metrics: evaluated.evaluation.metrics,
  });
}

function sameCalibrationNeighborV1(
  left: PocBalanceCalibrationNeighborV1,
  right: PocBalanceCalibrationNeighborV1,
): boolean {
  return (
    left.field === right.field &&
    left.direction === right.direction &&
    left.step === right.step &&
    left.beforeValue === right.beforeValue &&
    left.afterValue === right.afterValue
  );
}

function parsePocBalanceCalibrationEvaluatedNeighborV1(
  value: unknown,
): PocBalanceCalibrationEvaluatedNeighborV1 {
  const candidate = exactCalibrationRecordV1(
    value,
    ["field", "direction", "step", "beforeValue", "afterValue", "evaluation"],
    "evaluated neighbor",
    failCalibrationEvidenceV1,
  );
  const field = candidate.field;
  if (
    typeof field !== "string" ||
    !calibrationFieldIndexV1.has(field as PocBalanceCalibrationFieldV1)
  ) {
    return failCalibrationEvidenceV1("evaluated neighbor has an unknown field");
  }
  const direction = candidate.direction;
  if (direction !== "decrease" && direction !== "increase") {
    return failCalibrationEvidenceV1("evaluated neighbor has an invalid direction");
  }
  let step: PositiveSafeInteger;
  let beforeValue: NonNegativeSafeInteger;
  let afterValue: NonNegativeSafeInteger;
  try {
    step = parsePositiveSafeInteger(candidate.step);
    beforeValue = parseNonNegativeSafeInteger(candidate.beforeValue);
    afterValue = parseNonNegativeSafeInteger(candidate.afterValue);
  } catch {
    return failCalibrationEvidenceV1(
      "evaluated neighbor scalar fields must be positive/non-negative safe integers",
    );
  }
  return Object.freeze({
    field: field as PocBalanceCalibrationFieldV1,
    direction,
    step,
    beforeValue,
    afterValue,
    evaluation: parsePocBalanceCalibrationEvaluationV1(candidate.evaluation),
  });
}

function parsePocBalanceCalibrationStepInputV1(value: unknown): PocBalanceCalibrationStepInputV1 {
  const input = exactCalibrationRecordV1(
    value,
    ["iteration", "values", "evaluation", "candidates"],
    "selector input",
    failCalibrationEvidenceV1,
  );
  let iteration: NonNegativeSafeInteger;
  try {
    iteration = parseNonNegativeSafeInteger(input.iteration);
  } catch {
    return failCalibrationEvidenceV1("iteration must be a NonNegativeSafeInteger");
  }
  return Object.freeze({
    iteration,
    values: parsePocBalanceCalibrationValuesV1(
      input.values as DeepReadonly<PocBalanceCalibrationValuesV1>,
    ),
    evaluation: parsePocBalanceCalibrationEvaluationV1(input.evaluation),
    candidates: Object.freeze(
      denseCalibrationArrayV1(input.candidates, "evaluated neighbors").map((candidate) =>
        parsePocBalanceCalibrationEvaluatedNeighborV1(candidate),
      ),
    ),
  });
}

function validatePocBalanceCalibrationEvidenceV1(
  currentValues: PocBalanceCalibrationValuesV1,
  beforeDeficit: NonNegativeSafeInteger,
  evaluatedNeighbors: readonly PocBalanceCalibrationEvaluatedNeighborV1[],
): readonly PocBalanceCalibrationCandidateV1[] {
  const legalNeighbors = materializeLegalPocBalanceCalibrationNeighborsV1(currentValues).map(
    ({ neighbor }) => neighbor,
  );
  if (evaluatedNeighbors.length > legalNeighbors.length) {
    throw new TypeError(
      "PoC balance calibration evidence exceeds the canonical legal neighbor set",
    );
  }

  const seen = new Set<string>();
  const candidates = evaluatedNeighbors.map((evaluated, index) => {
    const key = `${evaluated.field}:${evaluated.direction}`;
    if (seen.has(key)) throw new TypeError(`duplicate PoC balance calibration candidate ${key}`);
    seen.add(key);
    const canonical = legalNeighbors[index];
    if (canonical === undefined || !sameCalibrationNeighborV1(canonical, evaluated)) {
      throw new TypeError(
        `PoC balance calibration evidence is not the canonical neighbor at index ${String(index)}`,
      );
    }
    return evaluatedCandidateV1(beforeDeficit, canonical, evaluated);
  });

  const isCompleteCanonicalSet = candidates.length === legalNeighbors.length;
  const firstZeroDeficit = candidates.findIndex(({ afterDeficit }) => afterDeficit === 0);
  if (
    !isCompleteCanonicalSet &&
    (firstZeroDeficit < 0 || firstZeroDeficit !== candidates.length - 1)
  ) {
    throw new TypeError(
      "PoC balance calibration evidence is neither complete nor a canonical prefix ending at the first zero-deficit neighbor",
    );
  }
  return Object.freeze(candidates);
}

/**
 * Selects the strictly best neighbor. Equal improvements use field order and then prefer the
 * decrease direction. At index 12 no thirteenth calibration change is admitted.
 */
export function selectPocBalanceCalibrationStepV1(
  input: PocBalanceCalibrationStepInputV1,
): PocBalanceCalibrationSelectionV1 {
  const parsedInput = parsePocBalanceCalibrationStepInputV1(input);
  const { iteration } = parsedInput;
  const current = createPocBalanceCalibrationPointV1(parsedInput.values);
  const beforeDeficit = calculatePocBalanceDeficitV1(parsedInput.evaluation);
  const evidence = validatePocBalanceCalibrationEvidenceV1(
    current.values,
    beforeDeficit,
    parsedInput.candidates,
  );
  if (beforeDeficit === 0) {
    throw new TypeError("PoC balance calibration current point already satisfies the contract");
  }
  const frozenCandidates = Object.freeze([...evidence].sort(compareCandidatesV1));

  if (iteration >= calibrationIterationLimitV1) {
    return Object.freeze({
      kind: "balance_contract_unsatisfied",
      reason: "iteration_limit",
      metrics: parsedInput.evaluation.metrics,
      candidates: frozenCandidates,
    });
  }

  const selected = frozenCandidates.find(({ afterDeficit }) => afterDeficit < beforeDeficit);
  if (selected !== undefined) return selected;
  return Object.freeze({
    kind: "balance_contract_unsatisfied",
    reason: "no_improving_neighbor",
    metrics: parsedInput.evaluation.metrics,
    candidates: frozenCandidates,
  });
}

function balanceEvidenceBytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** Re-admits an untrusted calibration result and independently derives its claimed selection. */
export function admitPocBalanceCalibrationRunV1(
  value: unknown,
  expected: PocBalanceCalibrationRunExpectationV1,
): DeepReadonly<PocBalanceCalibrationRunV1> {
  canonicalPocBalanceEvidenceBytesV1(value);
  const run = exactCalibrationRecordV1(
    value,
    ["step", "selection"],
    "calibration run",
    failCalibrationEvidenceV1,
  );
  const expectedIteration = (() => {
    try {
      return parseNonNegativeSafeInteger(expected.iteration);
    } catch {
      return failCalibrationEvidenceV1("expected iteration must be a NonNegativeSafeInteger");
    }
  })();
  const expectedValues = parsePocBalanceCalibrationValuesV1(expected.values);
  const step = parsePocBalanceCalibrationStepInputV1(run.step);
  if (step.iteration !== expectedIteration) {
    return failCalibrationEvidenceV1("calibration run iteration does not match the request");
  }
  if (pocBalanceCalibrationFieldsV1.some((field) => step.values[field] !== expectedValues[field])) {
    return failCalibrationEvidenceV1("calibration run values do not match the request");
  }

  const derivedSelection = selectPocBalanceCalibrationStepV1(step);
  const suppliedBytes = canonicalPocBalanceEvidenceBytesV1(run.selection);
  const derivedBytes = canonicalPocBalanceEvidenceBytesV1(derivedSelection);
  if (!balanceEvidenceBytesEqualV1(suppliedBytes, derivedBytes)) {
    return failCalibrationEvidenceV1("calibration run selection does not match local selection");
  }

  return deepFreezePocValueV1({ step, selection: derivedSelection });
}

function fixtureStrategyMetricsV1(
  paidCountValue: number,
  medianPaidAfterTaxCash: number,
): PocBalanceMetricsV1["strategies"]["strategy.cash_first"] {
  const paidCount = parseNonNegativeSafeInteger(paidCountValue);
  return Object.freeze({
    paidCount,
    stableCount: paidCount,
    dangerCount: parseNonNegativeSafeInteger(0),
    arrearsCount: parseNonNegativeSafeInteger(1000 - paidCount),
    medianPaidAfterTaxCash,
  });
}

function calibrationMetricsFixtureV1(corePaidCount: number): PocBalanceMetricsV1 {
  const dominanceCounts = Object.freeze({
    "strategy.cash_first": parseNonNegativeSafeInteger(800),
    "strategy.relationship_first": parseNonNegativeSafeInteger(0),
    "strategy.investigation_first": parseNonNegativeSafeInteger(0),
    "strategy.full_delegation": parseNonNegativeSafeInteger(0),
    "strategy.two_closures_recovery": parseNonNegativeSafeInteger(0),
    "strategy.explicit_failure": parseNonNegativeSafeInteger(0),
  });
  return Object.freeze({
    firstSeed: 1,
    lastSeed: 1000,
    strategies: Object.freeze({
      "strategy.cash_first": fixtureStrategyMetricsV1(corePaidCount, 50),
      "strategy.relationship_first": fixtureStrategyMetricsV1(corePaidCount, 40),
      "strategy.investigation_first": fixtureStrategyMetricsV1(corePaidCount, 80),
      "strategy.full_delegation": fixtureStrategyMetricsV1(900, 20),
      "strategy.two_closures_recovery": fixtureStrategyMetricsV1(700, 25),
      "strategy.explicit_failure": fixtureStrategyMetricsV1(200, 0),
    }),
    d4CashPressure: Object.freeze({
      cashFirstPaidCount: parseNonNegativeSafeInteger(750),
      relationshipFirstPaidCount: parseNonNegativeSafeInteger(750),
      investigationFirstPaidCount: parseNonNegativeSafeInteger(750),
    }),
    strictDominanceCountByStrategy: dominanceCounts,
    maximumStrictDominance: parseNonNegativeSafeInteger(800),
  });
}

const passingCounterfactualChecksV1 = Object.freeze({
  comfortableBedRecovery: true,
  investigationColdStorageShelfLife: true,
  fullDelegationColdStorageShelfLife: true,
});

/** Deterministic test fixture whose equal best candidates exercise both tie-break levels. */
export function calibrationCandidateFixtureV1(): PocBalanceCalibrationStepInputV1 {
  const values: PocBalanceCalibrationValuesV1 = Object.freeze({
    levy: parseNonNegativeSafeInteger(140),
    openingFee: parseNonNegativeSafeInteger(2),
    assistedWage: parseNonNegativeSafeInteger(5),
    delegatedWage: parseNonNegativeSafeInteger(7),
    manualGuestCapacity: parseNonNegativeSafeInteger(10),
    manualPreparationBase: parseNonNegativeSafeInteger(6),
    manualPreparationPerAction: parseNonNegativeSafeInteger(4),
    assistedGuestCapacity: parseNonNegativeSafeInteger(8),
    assistedPreparationBase: parseNonNegativeSafeInteger(6),
    assistedPreparationPerAction: parseNonNegativeSafeInteger(4),
    delegatedGuestCapacity: parseNonNegativeSafeInteger(7),
    delegatedPreparationBase: parseNonNegativeSafeInteger(7),
    delegatedPreparationPerAction: parseNonNegativeSafeInteger(2),
  });
  const currentEvaluation = Object.freeze({
    metrics: calibrationMetricsFixtureV1(899),
    counterfactuals: passingCounterfactualChecksV1,
  });
  const passingEvaluation = Object.freeze({
    metrics: calibrationMetricsFixtureV1(900),
    counterfactuals: passingCounterfactualChecksV1,
  });
  const neighbors = enumeratePocBalanceCalibrationNeighborsV1(values);
  return Object.freeze({
    iteration: parseNonNegativeSafeInteger(0),
    values,
    evaluation: currentEvaluation,
    candidates: Object.freeze(
      neighbors.map((neighbor) =>
        Object.freeze({
          ...neighbor,
          evaluation:
            neighbor.field === "levy" ||
            (neighbor.field === "openingFee" && neighbor.direction === "decrease")
              ? passingEvaluation
              : currentEvaluation,
        }),
      ),
    ),
  });
}
