// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  type DeepReadonly,
  type NonNegativeSafeInteger,
} from "@sillymaker/base";

import { deepFreezePocValueV1, parseMoney, parseSafeInteger } from "../gameplay/index.js";
import type { PocGameSnapshotV1, PocSimulationProgramV1, SafeInteger } from "../gameplay/index.js";
import {
  createPocBalanceCalibrationProgramV1,
  evaluatePocBalanceCalibrationStepV1,
  pocBalanceCalibrationValuesV1,
  selectPocBalanceCalibrationStepV1,
  type PocBalanceCalibrationSelectionV1,
  type PocBalanceCalibrationStepInputV1,
  type PocBalanceMetricsV1,
  type PocBalanceCalibrationValuesV1,
  type PocStrategyBalanceMetricsV1,
} from "./balance-calibration.js";
import {
  compilePocStrategyMetricsV1,
  type CompiledPocReferenceStrategyV1,
} from "./compile-reference-strategy.js";
import {
  evaluatePocFacilityCounterfactualChecksV1,
  materializePocCounterfactualProgramV1,
} from "./counterfactual-scenarios.js";
import {
  pocReferenceStrategyDefinitionsV1,
  pocReferenceStrategyIdsV1,
  type PocReferenceStrategyIdV1,
} from "./reference-strategy-definitions.js";

export type { PocBalanceMetricsV1, PocStrategyBalanceMetricsV1 };

export interface PocParetoVectorV1 {
  readonly cashMargin: SafeInteger;
  readonly relationshipRank: -1 | 0 | 1 | 2;
  readonly investigationRank: 0 | 1 | 2 | 3 | 4;
  readonly freeAp: NonNegativeSafeInteger;
}

export interface RunPocBalanceCorpusInputV1 {
  readonly firstSeed: 1;
  readonly lastSeed: 1000;
  readonly calibrationValues?: DeepReadonly<PocBalanceCalibrationValuesV1>;
}

export interface PocBalanceCorpusShardV1 {
  readonly firstSeed: number;
  readonly lastSeed: number;
  readonly strategies: Readonly<
    Record<
      PocReferenceStrategyIdV1,
      {
        readonly stableCount: number;
        readonly dangerCount: number;
        readonly arrearsCount: number;
        readonly paidAfterTaxCash: readonly number[];
      }
    >
  >;
  readonly d4CashPressure: Readonly<
    Record<
      "strategy.cash_first" | "strategy.relationship_first" | "strategy.investigation_first",
      number
    >
  >;
  readonly strictDominanceCountByStrategy: Readonly<Record<PocReferenceStrategyIdV1, number>>;
}

interface MutableStrategyMetricsV1 {
  stableCount: number;
  dangerCount: number;
  arrearsCount: number;
  readonly paidAfterTaxCash: number[];
}

function balanceDataRecordV1(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be a data object`);
  }
  return value as Record<string, unknown>;
}

function assertExactBalanceKeysV1(
  record: Record<string, unknown>,
  expectedKeys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(record).toSorted();
  const expected = [...expectedKeys].toSorted();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${label} has unexpected keys`);
  }
}

function parseShardCountV1(value: unknown, maximum: number, label: string): number {
  const parsed = parseNonNegativeSafeInteger(value);
  if (parsed > maximum) throw new TypeError(`${label} exceeds the shard seed count`);
  return parsed;
}

function assertDenseBalanceArrayV1(value: readonly unknown[], label: string): void {
  const keys = Object.keys(value);
  if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) {
    throw new TypeError(`${label} must be a dense undecorated array`);
  }
}

/** Re-admits every worker/merge shard and checks all count/sample identities. */
export function parsePocBalanceCorpusShardV1(
  value: unknown,
  expectedRange?: Readonly<{ readonly firstSeed: number; readonly lastSeed: number }>,
): PocBalanceCorpusShardV1 {
  const shard = balanceDataRecordV1(value, "PoC balance corpus shard");
  assertExactBalanceKeysV1(
    shard,
    ["firstSeed", "lastSeed", "strategies", "d4CashPressure", "strictDominanceCountByStrategy"],
    "PoC balance corpus shard",
  );
  const firstSeed = shard.firstSeed;
  const lastSeed = shard.lastSeed;
  if (
    !Number.isSafeInteger(firstSeed) ||
    !Number.isSafeInteger(lastSeed) ||
    (firstSeed as number) < 1 ||
    (lastSeed as number) > 1000 ||
    (firstSeed as number) > (lastSeed as number)
  ) {
    throw new TypeError("invalid PoC balance corpus shard range");
  }
  if (
    expectedRange !== undefined &&
    (firstSeed !== expectedRange.firstSeed || lastSeed !== expectedRange.lastSeed)
  ) {
    throw new TypeError("PoC balance worker returned the wrong seed range");
  }
  const seedCount = (lastSeed as number) - (firstSeed as number) + 1;

  const strategyValues = balanceDataRecordV1(shard.strategies, "PoC balance shard strategies");
  assertExactBalanceKeysV1(
    strategyValues,
    pocReferenceStrategyIdsV1,
    "PoC balance shard strategies",
  );
  const strategies = Object.fromEntries(
    pocReferenceStrategyIdsV1.map((strategyId) => {
      const metrics = balanceDataRecordV1(
        strategyValues[strategyId],
        `PoC balance shard ${strategyId}`,
      );
      assertExactBalanceKeysV1(
        metrics,
        ["stableCount", "dangerCount", "arrearsCount", "paidAfterTaxCash"],
        `PoC balance shard ${strategyId}`,
      );
      const stableCount = parseShardCountV1(
        metrics.stableCount,
        seedCount,
        `${strategyId} stableCount`,
      );
      const dangerCount = parseShardCountV1(
        metrics.dangerCount,
        seedCount,
        `${strategyId} dangerCount`,
      );
      const arrearsCount = parseShardCountV1(
        metrics.arrearsCount,
        seedCount,
        `${strategyId} arrearsCount`,
      );
      if (stableCount + dangerCount + arrearsCount !== seedCount) {
        throw new TypeError(`${strategyId} ending counts do not equal the shard seed count`);
      }
      if (!Array.isArray(metrics.paidAfterTaxCash)) {
        throw new TypeError(`${strategyId} paidAfterTaxCash must be an array`);
      }
      assertDenseBalanceArrayV1(metrics.paidAfterTaxCash, `${strategyId} paidAfterTaxCash`);
      const paidAfterTaxCash = metrics.paidAfterTaxCash.map((cash) => parseMoney(cash));
      if (paidAfterTaxCash.length !== stableCount + dangerCount) {
        throw new TypeError(`${strategyId} paid samples do not equal paid endings`);
      }
      return [strategyId, { stableCount, dangerCount, arrearsCount, paidAfterTaxCash }] as const;
    }),
  ) as unknown as PocBalanceCorpusShardV1["strategies"];

  const pressureValue = balanceDataRecordV1(shard.d4CashPressure, "PoC balance shard D4 pressure");
  const pressureStrategyIds = [
    "strategy.cash_first",
    "strategy.relationship_first",
    "strategy.investigation_first",
  ] as const;
  assertExactBalanceKeysV1(pressureValue, pressureStrategyIds, "PoC balance shard D4 pressure");
  const d4CashPressure = Object.fromEntries(
    pressureStrategyIds.map((strategyId) => [
      strategyId,
      parseShardCountV1(pressureValue[strategyId], seedCount, `${strategyId} D4 pressure count`),
    ]),
  ) as unknown as PocBalanceCorpusShardV1["d4CashPressure"];

  const dominanceValue = balanceDataRecordV1(
    shard.strictDominanceCountByStrategy,
    "PoC balance shard dominance counts",
  );
  assertExactBalanceKeysV1(
    dominanceValue,
    pocReferenceStrategyIdsV1,
    "PoC balance shard dominance counts",
  );
  const strictDominanceCountByStrategy = Object.fromEntries(
    pocReferenceStrategyIdsV1.map((strategyId) => [
      strategyId,
      parseShardCountV1(dominanceValue[strategyId], seedCount, `${strategyId} dominance count`),
    ]),
  ) as unknown as PocBalanceCorpusShardV1["strictDominanceCountByStrategy"];
  const dominanceTotal = Object.values(strictDominanceCountByStrategy).reduce(
    (total, count) => total + BigInt(count),
    0n,
  );
  if (dominanceTotal > BigInt(seedCount)) {
    throw new TypeError("PoC balance shard dominance counts exceed the shard seed count");
  }

  return deepFreezePocValueV1({
    firstSeed,
    lastSeed,
    strategies,
    d4CashPressure,
    strictDominanceCountByStrategy,
  }) as PocBalanceCorpusShardV1;
}

const relationshipRanksV1 = Object.freeze({
  "relationship.unresolved_conflict": -1,
  "relationship.pending": 0,
  "relationship.abandoned": 0,
  "relationship.reconciled": 1,
  "relationship.completed": 2,
} as const);

const investigationRanksV1 = Object.freeze({
  "investigation.not_attempted": 0,
  "investigation.missed_by_choice": 0,
  "investigation.setback": 1,
  "investigation.success_with_cost": 2,
  "investigation.complete": 3,
  "investigation.exceptional": 4,
} as const);

function createMutableMetricsV1(): Record<PocReferenceStrategyIdV1, MutableStrategyMetricsV1> {
  return Object.fromEntries(
    pocReferenceStrategyIdsV1.map((strategyId) => [
      strategyId,
      { stableCount: 0, dangerCount: 0, arrearsCount: 0, paidAfterTaxCash: [] },
    ]),
  ) as unknown as Record<PocReferenceStrategyIdV1, MutableStrategyMetricsV1>;
}

function createMutableCountsV1(): Record<PocReferenceStrategyIdV1, number> {
  return Object.fromEntries(
    pocReferenceStrategyIdsV1.map((strategyId) => [strategyId, 0]),
  ) as Record<PocReferenceStrategyIdV1, number>;
}

function completionTokenV1(
  compiled: DeepReadonly<CompiledPocReferenceStrategyV1>,
  outcomeId: "outcome.relationship_opportunity" | "outcome.investigation",
): string {
  const completion = compiled.finalView.completion;
  const outcome =
    completion === null
      ? compiled.finalSnapshot.state.story.outcomes.find(
          (candidate) => candidate.outcomeId === outcomeId,
        )
      : outcomeId === "outcome.relationship_opportunity"
        ? completion.summary.relationship
        : completion.summary.investigation;
  if (outcome === undefined || outcome.value.kind !== "token") {
    throw new TypeError(`missing terminal ${outcomeId} token`);
  }
  return outcome.value.value;
}

function safeDifferenceV1(left: number, right: number, label: string): SafeInteger {
  const value = BigInt(left) - BigInt(right);
  if (value < BigInt(Number.MIN_SAFE_INTEGER) || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`${label} exceeds SafeInteger bounds`);
  }
  return parseSafeInteger(Number(value));
}

function assertLedgerInvariantV1(snapshot: DeepReadonly<PocGameSnapshotV1>): void {
  const inventory = snapshot.state.simulation.inventory;
  const expectedCash = inventory.ledger.reduce(
    (cash, entry) => cash + BigInt(entry.cashDelta),
    BigInt(inventory.startingCash),
  );
  if (expectedCash !== BigInt(inventory.cash)) {
    throw new TypeError("PoC balance corpus cash diverged from the authoritative ledger");
  }
}

function paretoVectorV1(
  compiled: DeepReadonly<CompiledPocReferenceStrategyV1>,
  configuredLevy: number,
): PocParetoVectorV1 {
  const completion = compiled.finalView.completion;
  const cashBeforeLevy =
    completion?.levy.kind === "paid"
      ? completion.levy.cash.before
      : completion?.levy.kind === "arrears"
        ? completion.levy.availableCash
        : compiled.finalView.ledger.currentCash;
  const relationshipToken = completionTokenV1(compiled, "outcome.relationship_opportunity");
  const investigationToken = completionTokenV1(compiled, "outcome.investigation");
  if (!Object.hasOwn(relationshipRanksV1, relationshipToken)) {
    throw new TypeError(`unknown relationship outcome ${relationshipToken}`);
  }
  if (!Object.hasOwn(investigationRanksV1, investigationToken)) {
    throw new TypeError(`unknown investigation outcome ${investigationToken}`);
  }
  return deepFreezePocValueV1({
    cashMargin: safeDifferenceV1(cashBeforeLevy, configuredLevy, "PoC cash margin"),
    relationshipRank: relationshipRanksV1[relationshipToken as keyof typeof relationshipRanksV1],
    investigationRank:
      investigationRanksV1[investigationToken as keyof typeof investigationRanksV1],
    freeAp: compiled.freeAp,
  });
}

function recordEndingV1(
  accumulator: MutableStrategyMetricsV1,
  compiled: DeepReadonly<CompiledPocReferenceStrategyV1>,
): void {
  const completion = compiled.finalView.completion;
  if (completion?.status === "completed_stable" && completion.levy.kind === "paid") {
    accumulator.stableCount += 1;
    accumulator.paidAfterTaxCash.push(completion.levy.cash.after);
  } else if (completion?.status === "completed_danger" && completion.levy.kind === "paid") {
    accumulator.dangerCount += 1;
    accumulator.paidAfterTaxCash.push(completion.levy.cash.after);
  } else {
    accumulator.arrearsCount += 1;
  }
}

export function medianPaidAfterTaxCashV1(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  const upper = sorted[midpoint];
  if (upper === undefined) throw new TypeError("missing median sample");
  if (sorted.length % 2 === 1) return upper;
  const lower = sorted[midpoint - 1];
  if (lower === undefined) throw new TypeError("missing lower median sample");
  return (lower + upper) / 2;
}

export function strictParetoDominatesV1(
  candidate: DeepReadonly<PocParetoVectorV1>,
  other: DeepReadonly<PocParetoVectorV1>,
): boolean {
  const noWorse =
    candidate.cashMargin >= other.cashMargin &&
    candidate.relationshipRank >= other.relationshipRank &&
    candidate.investigationRank >= other.investigationRank &&
    candidate.freeAp >= other.freeAp;
  const strictlyBetter =
    candidate.cashMargin > other.cashMargin ||
    candidate.relationshipRank > other.relationshipRank ||
    candidate.investigationRank > other.investigationRank ||
    candidate.freeAp > other.freeAp;
  return noWorse && strictlyBetter;
}

function isPaidV1(compiled: DeepReadonly<CompiledPocReferenceStrategyV1>): boolean {
  return compiled.finalView.completion?.levy.kind === "paid";
}

async function compileForProgramV1(
  strategyId: PocReferenceStrategyIdV1,
  seed: number,
  program: DeepReadonly<PocSimulationProgramV1> | null,
): Promise<CompiledPocReferenceStrategyV1> {
  const definition = pocReferenceStrategyDefinitionsV1[strategyId];
  const parsedSeed = parseNonZeroUint32(seed);
  const compiled = await compilePocStrategyMetricsV1(definition, parsedSeed, program);
  assertLedgerInvariantV1(compiled.finalSnapshot);
  return compiled;
}

export async function runPocBalanceCorpusShardV1(input: {
  readonly firstSeed: number;
  readonly lastSeed: number;
  readonly execution?: "sequential" | "concurrent";
  readonly calibrationValues?: DeepReadonly<PocBalanceCalibrationValuesV1>;
}): Promise<PocBalanceCorpusShardV1> {
  const { firstSeed, lastSeed } = input;
  if (
    !Number.isSafeInteger(firstSeed) ||
    !Number.isSafeInteger(lastSeed) ||
    firstSeed < 1 ||
    lastSeed > 1000 ||
    firstSeed > lastSeed ||
    (input.execution !== undefined &&
      input.execution !== "sequential" &&
      input.execution !== "concurrent")
  ) {
    throw new TypeError("invalid PoC balance corpus shard");
  }
  const baselineProgram = createPocBalanceCalibrationProgramV1(
    input.calibrationValues ?? pocBalanceCalibrationValuesV1(),
  );
  const configuredLevy = baselineProgram.data.balance.levyAmount;
  const strategyMetrics = createMutableMetricsV1();
  const dominanceCounts = createMutableCountsV1();
  const d4PressureCounts = {
    "strategy.cash_first": 0,
    "strategy.relationship_first": 0,
    "strategy.investigation_first": 0,
  };
  const pressureProgram = materializePocCounterfactualProgramV1(
    "d4_cash_pressure",
    baselineProgram,
  );
  const pressureStrategyIdsV1 = [
    "strategy.cash_first",
    "strategy.relationship_first",
    "strategy.investigation_first",
  ] as const;
  const concurrent = input.execution !== "sequential";
  interface SeedCompilationsV1 {
    readonly seed: number;
    readonly baseline: readonly CompiledPocReferenceStrategyV1[];
    readonly pressure: readonly CompiledPocReferenceStrategyV1[];
  }
  async function compileSeedV1(seed: number): Promise<SeedCompilationsV1> {
    const compileBaselineV1 = () =>
      Promise.all(
        pocReferenceStrategyIdsV1.map((strategyId) =>
          compileForProgramV1(strategyId, seed, baselineProgram),
        ),
      );
    const compilePressureV1 = () =>
      Promise.all(
        pressureStrategyIdsV1.map((strategyId) =>
          compileForProgramV1(strategyId, seed, pressureProgram),
        ),
      );
    let baselineCompilations: readonly CompiledPocReferenceStrategyV1[];
    let pressureCompilations: readonly CompiledPocReferenceStrategyV1[];
    if (concurrent) {
      [baselineCompilations, pressureCompilations] = await Promise.all([
        compileBaselineV1(),
        compilePressureV1(),
      ]);
    } else {
      const baseline: CompiledPocReferenceStrategyV1[] = [];
      for (const strategyId of pocReferenceStrategyIdsV1) {
        baseline.push(await compileForProgramV1(strategyId, seed, baselineProgram));
      }
      const pressure: CompiledPocReferenceStrategyV1[] = [];
      for (const strategyId of pressureStrategyIdsV1) {
        pressure.push(await compileForProgramV1(strategyId, seed, pressureProgram));
      }
      baselineCompilations = baseline;
      pressureCompilations = pressure;
    }
    return Object.freeze({
      seed,
      baseline: baselineCompilations,
      pressure: pressureCompilations,
    });
  }
  function recordSeedV1(compilations: SeedCompilationsV1): void {
    const vectors = new Map<PocReferenceStrategyIdV1, PocParetoVectorV1>();
    for (const [index, strategyId] of pocReferenceStrategyIdsV1.entries()) {
      const compiled = compilations.baseline[index];
      if (compiled === undefined) throw new TypeError(`missing baseline result for ${strategyId}`);
      recordEndingV1(strategyMetrics[strategyId], compiled);
      vectors.set(strategyId, paretoVectorV1(compiled, configuredLevy));
    }
    for (const [index, strategyId] of pressureStrategyIdsV1.entries()) {
      const pressure = compilations.pressure[index];
      if (pressure === undefined) throw new TypeError(`missing pressure result for ${strategyId}`);
      if (isPaidV1(pressure)) d4PressureCounts[strategyId] += 1;
    }
    for (const strategyId of pocReferenceStrategyIdsV1) {
      const vector = vectors.get(strategyId);
      if (vector === undefined) throw new TypeError(`missing Pareto vector for ${strategyId}`);
      const dominatesAll = pocReferenceStrategyIdsV1.every((otherId) => {
        if (otherId === strategyId) return true;
        const other = vectors.get(otherId);
        if (other === undefined) throw new TypeError(`missing Pareto vector for ${otherId}`);
        return strictParetoDominatesV1(vector, other);
      });
      if (dominatesAll) dominanceCounts[strategyId] += 1;
    }
  }
  if (concurrent) {
    const seedBatchSizeV1 = 1;
    for (
      let batchFirstSeed = firstSeed;
      batchFirstSeed <= lastSeed;
      batchFirstSeed += seedBatchSizeV1
    ) {
      const batchLastSeed = Math.min(lastSeed, batchFirstSeed + seedBatchSizeV1 - 1);
      const seeds = Array.from(
        { length: batchLastSeed - batchFirstSeed + 1 },
        (_, index) => batchFirstSeed + index,
      );
      const compilations = await Promise.all(seeds.map((seed) => compileSeedV1(seed)));
      for (const seedCompilation of compilations) recordSeedV1(seedCompilation);
    }
  } else {
    for (let seed = firstSeed; seed <= lastSeed; seed += 1) {
      recordSeedV1(await compileSeedV1(seed));
    }
  }

  return deepFreezePocValueV1({
    firstSeed,
    lastSeed,
    strategies: Object.fromEntries(
      pocReferenceStrategyIdsV1.map((strategyId) => {
        const accumulator = strategyMetrics[strategyId];
        return [
          strategyId,
          {
            stableCount: accumulator.stableCount,
            dangerCount: accumulator.dangerCount,
            arrearsCount: accumulator.arrearsCount,
            paidAfterTaxCash: accumulator.paidAfterTaxCash,
          },
        ];
      }),
    ),
    d4CashPressure: d4PressureCounts,
    strictDominanceCountByStrategy: dominanceCounts,
  }) as unknown as PocBalanceCorpusShardV1;
}

export function mergePocBalanceCorpusShardRangeV1(
  shardValues: readonly DeepReadonly<PocBalanceCorpusShardV1>[],
): PocBalanceCorpusShardV1 {
  const shards = shardValues
    .map((shard) => parsePocBalanceCorpusShardV1(shard))
    .sort((left, right) => left.firstSeed - right.firstSeed || left.lastSeed - right.lastSeed);
  const first = shards[0];
  if (first === undefined) throw new TypeError("PoC balance corpus has no shards");
  let expectedFirstSeed = first.firstSeed;
  const strategyMetrics = createMutableMetricsV1();
  const dominanceCounts = createMutableCountsV1();
  const d4PressureCounts = {
    "strategy.cash_first": 0,
    "strategy.relationship_first": 0,
    "strategy.investigation_first": 0,
  };
  for (const shard of shards) {
    if (shard.firstSeed !== expectedFirstSeed || shard.lastSeed < shard.firstSeed) {
      throw new TypeError("PoC balance corpus shards overlap or have a gap");
    }
    expectedFirstSeed = shard.lastSeed + 1;
    for (const strategyId of pocReferenceStrategyIdsV1) {
      const source = shard.strategies[strategyId];
      const target = strategyMetrics[strategyId];
      target.stableCount += source.stableCount;
      target.dangerCount += source.dangerCount;
      target.arrearsCount += source.arrearsCount;
      target.paidAfterTaxCash.push(...source.paidAfterTaxCash);
      dominanceCounts[strategyId] += shard.strictDominanceCountByStrategy[strategyId];
    }
    d4PressureCounts["strategy.cash_first"] += shard.d4CashPressure["strategy.cash_first"];
    d4PressureCounts["strategy.relationship_first"] +=
      shard.d4CashPressure["strategy.relationship_first"];
    d4PressureCounts["strategy.investigation_first"] +=
      shard.d4CashPressure["strategy.investigation_first"];
  }
  const lastSeed = expectedFirstSeed - 1;
  return deepFreezePocValueV1({
    firstSeed: first.firstSeed,
    lastSeed,
    strategies: Object.fromEntries(
      pocReferenceStrategyIdsV1.map((strategyId) => {
        const accumulator = strategyMetrics[strategyId];
        return [
          strategyId,
          {
            stableCount: accumulator.stableCount,
            dangerCount: accumulator.dangerCount,
            arrearsCount: accumulator.arrearsCount,
            paidAfterTaxCash: accumulator.paidAfterTaxCash,
          },
        ];
      }),
    ),
    d4CashPressure: d4PressureCounts,
    strictDominanceCountByStrategy: dominanceCounts,
  }) as unknown as PocBalanceCorpusShardV1;
}

export function mergePocBalanceCorpusShardsV1(
  shardValues: readonly DeepReadonly<PocBalanceCorpusShardV1>[],
): PocBalanceMetricsV1 {
  const merged = mergePocBalanceCorpusShardRangeV1(shardValues);
  if (merged.firstSeed !== 1 || merged.lastSeed !== 1000) {
    throw new TypeError("PoC balance corpus shards do not cover seeds 1..1000");
  }

  const strategies = Object.fromEntries(
    pocReferenceStrategyIdsV1.map((strategyId) => {
      const accumulator = merged.strategies[strategyId];
      const stableCount = parseNonNegativeSafeInteger(accumulator.stableCount);
      const dangerCount = parseNonNegativeSafeInteger(accumulator.dangerCount);
      const arrearsCount = parseNonNegativeSafeInteger(accumulator.arrearsCount);
      return [
        strategyId,
        deepFreezePocValueV1({
          paidCount: parseNonNegativeSafeInteger(stableCount + dangerCount),
          stableCount,
          dangerCount,
          arrearsCount,
          medianPaidAfterTaxCash: medianPaidAfterTaxCashV1(accumulator.paidAfterTaxCash),
        }),
      ];
    }),
  ) as unknown as Record<PocReferenceStrategyIdV1, PocStrategyBalanceMetricsV1>;
  const strictDominanceCountByStrategy = Object.fromEntries(
    pocReferenceStrategyIdsV1.map((strategyId) => [
      strategyId,
      parseNonNegativeSafeInteger(merged.strictDominanceCountByStrategy[strategyId]),
    ]),
  ) as unknown as Record<PocReferenceStrategyIdV1, NonNegativeSafeInteger>;
  const maximumStrictDominance = parseNonNegativeSafeInteger(
    Math.max(...Object.values(strictDominanceCountByStrategy)),
  );

  return deepFreezePocValueV1({
    firstSeed: 1 as const,
    lastSeed: 1000 as const,
    strategies,
    d4CashPressure: {
      cashFirstPaidCount: parseNonNegativeSafeInteger(merged.d4CashPressure["strategy.cash_first"]),
      relationshipFirstPaidCount: parseNonNegativeSafeInteger(
        merged.d4CashPressure["strategy.relationship_first"],
      ),
      investigationFirstPaidCount: parseNonNegativeSafeInteger(
        merged.d4CashPressure["strategy.investigation_first"],
      ),
    },
    strictDominanceCountByStrategy,
    maximumStrictDominance,
  });
}

export interface PocBalanceNodeWorkerV1 {
  once(event: "message", listener: (value: unknown) => void): this;
  once(event: "error", listener: (error: Error) => void): this;
  once(event: "exit", listener: (code: number) => void): this;
  terminate(): Promise<number>;
}

export interface PocBalanceNodeWorkerConstructorV1 {
  new (
    filename: URL,
    options: {
      readonly workerData: {
        readonly kind: "project_tavern_poc_balance_shard_v1";
        readonly firstSeed: number;
        readonly lastSeed: number;
        readonly calibrationValues?: DeepReadonly<PocBalanceCalibrationValuesV1>;
      };
    },
  ): PocBalanceNodeWorkerV1;
}

interface NodeWorkerThreadsV1 {
  readonly Worker: PocBalanceNodeWorkerConstructorV1;
}

const nodeWorkerThreadsSpecifierV1: string = "node:worker_threads";
const balanceWorkerUrlV1 = new URL(
  "../../../../../scripts/verify-poc-balance.mjs",
  import.meta.url,
);

export function runPocBalanceShardWorkerV1(
  Worker: PocBalanceNodeWorkerConstructorV1,
  firstSeed: number,
  lastSeed: number,
  calibrationValues?: DeepReadonly<PocBalanceCalibrationValuesV1>,
): Promise<PocBalanceCorpusShardV1> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(balanceWorkerUrlV1, {
      workerData: {
        kind: "project_tavern_poc_balance_shard_v1",
        firstSeed,
        lastSeed,
        ...(calibrationValues === undefined ? {} : { calibrationValues }),
      },
    });
    let settled = false;
    let message: PocBalanceCorpusShardV1 | undefined;
    worker.once("message", (value) => {
      if (settled) return;
      try {
        message = parsePocBalanceCorpusShardV1(value, { firstSeed, lastSeed });
      } catch (error) {
        settled = true;
        reject(error);
      }
    });
    worker.once("error", (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
    worker.once("exit", (code) => {
      if (settled) return;
      settled = true;
      if (code !== 0) {
        reject(new TypeError(`PoC balance worker exited ${code}`));
      } else if (message === undefined) {
        reject(new TypeError("PoC balance worker exited without a shard"));
      } else {
        resolve(message);
      }
    });
  });
}

export async function runPocBalanceCorpusWorkersForRangeV1(input: {
  readonly firstSeed: number;
  readonly lastSeed: number;
  readonly workerCount: number;
  readonly calibrationValues?: DeepReadonly<PocBalanceCalibrationValuesV1>;
}): Promise<readonly PocBalanceCorpusShardV1[]> {
  if (
    !Number.isSafeInteger(input.workerCount) ||
    input.workerCount < 1 ||
    input.workerCount > 16 ||
    !Number.isSafeInteger(input.firstSeed) ||
    !Number.isSafeInteger(input.lastSeed) ||
    input.firstSeed < 1 ||
    input.lastSeed > 1000 ||
    input.firstSeed > input.lastSeed
  ) {
    throw new TypeError("invalid PoC balance worker range");
  }
  const { Worker } = (await import(nodeWorkerThreadsSpecifierV1)) as NodeWorkerThreadsV1;
  const seedCount = input.lastSeed - input.firstSeed + 1;
  const workerCount = Math.min(input.workerCount, seedCount);
  const baseSize = Math.floor(seedCount / workerCount);
  const remainder = seedCount % workerCount;
  let firstSeed = input.firstSeed;
  const workers: Promise<PocBalanceCorpusShardV1>[] = [];
  for (let index = 0; index < workerCount; index += 1) {
    const size = baseSize + (index < remainder ? 1 : 0);
    const lastSeed = firstSeed + size - 1;
    workers.push(runPocBalanceShardWorkerV1(Worker, firstSeed, lastSeed, input.calibrationValues));
    firstSeed = lastSeed + 1;
  }
  return Object.freeze(await Promise.all(workers));
}

export async function runPocBalanceCorpusV1(
  input: DeepReadonly<RunPocBalanceCorpusInputV1>,
): Promise<PocBalanceMetricsV1> {
  if (input.firstSeed !== 1 || input.lastSeed !== 1000) {
    throw new TypeError("PoC balance corpus is closed to seeds 1..1000");
  }
  const shards = await runPocBalanceCorpusWorkersForRangeV1({
    firstSeed: 1,
    lastSeed: 1000,
    workerCount: 16,
    ...(input.calibrationValues === undefined
      ? {}
      : { calibrationValues: input.calibrationValues }),
  });
  return mergePocBalanceCorpusShardsV1(shards);
}

export async function runPocBalanceCalibrationStepV1(input: {
  readonly iteration: NonNegativeSafeInteger;
  readonly values?: DeepReadonly<PocBalanceCalibrationValuesV1>;
}): Promise<
  DeepReadonly<{
    readonly step: PocBalanceCalibrationStepInputV1;
    readonly selection: PocBalanceCalibrationSelectionV1;
  }>
> {
  const step = await evaluatePocBalanceCalibrationStepV1({
    iteration: input.iteration,
    values: input.values ?? pocBalanceCalibrationValuesV1(),
    evaluationPort: {
      async evaluate(point) {
        const [metrics, counterfactuals] = await Promise.all([
          runPocBalanceCorpusV1({
            firstSeed: 1,
            lastSeed: 1000,
            calibrationValues: point.values,
          }),
          evaluatePocFacilityCounterfactualChecksV1(point.program),
        ]);
        return deepFreezePocValueV1({ metrics, counterfactuals });
      },
    },
  });
  return deepFreezePocValueV1({
    step,
    selection: selectPocBalanceCalibrationStepV1(step),
  });
}
