// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  canonicalJsonBytes,
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
} from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import { parseSafeInteger } from "../gameplay/index.js";
import {
  admitPocBalanceFullReportV1,
  admitPocBalanceCalibrationRunV1,
  calibrationCandidateFixtureV1,
  calculatePocBalanceDeficitV1,
  canonicalPocBalanceEvidenceBytesV1,
  createPocBalanceCalibrationProgramV1,
  enumeratePocBalanceCalibrationNeighborsV1,
  evaluatePocBalanceCalibrationStepV1,
  pocBalanceCalibrationValuesV1,
  selectPocBalanceCalibrationStepV1,
} from "../testing/balance-calibration.js";
import {
  evaluatePocBalanceCalibrationValuesV1,
  mergePocBalanceCorpusShardRangeV1,
  medianPaidAfterTaxCashV1,
  partitionPocBalanceSeedRangeV1,
  parsePocBalanceCorpusShardV1,
  runPocBalanceCorpusShardV1,
  runPocBalanceCorpusWorkersForRangeV1,
  runPocBalanceShardWorkerV1,
  strictParetoDominatesV1,
  type PocBalanceNodeWorkerConstructorV1,
  type PocBalanceNodeWorkerV1,
} from "../testing/balance-metrics.js";
import {
  accumulatePocSurrenderedActionPointsV1,
  compilePocStrategyForSeedV1,
} from "../testing/compile-reference-strategy.js";
import {
  createPocCounterfactualScenarioV1,
  mutateCounterfactualProgramForTestV1,
  runPocFacilityCounterfactualsV1,
} from "../testing/counterfactual-scenarios.js";
import { pocReferenceStrategyDefinitionsV1 } from "../testing/reference-strategy-definitions.js";

describe("PoC deterministic balance lab", () => {
  it("uses all four Pareto components", () => {
    const baseline = {
      cashMargin: parseSafeInteger(10),
      relationshipRank: 1,
      investigationRank: 2,
      freeAp: parseNonNegativeSafeInteger(3),
    } as const;
    expect(
      strictParetoDominatesV1({ ...baseline, cashMargin: parseSafeInteger(11) }, baseline),
    ).toBe(true);
    expect(strictParetoDominatesV1({ ...baseline, relationshipRank: 2 }, baseline)).toBe(true);
    expect(strictParetoDominatesV1({ ...baseline, investigationRank: 3 }, baseline)).toBe(true);
    expect(
      strictParetoDominatesV1({ ...baseline, freeAp: parseNonNegativeSafeInteger(4) }, baseline),
    ).toBe(true);
    expect(strictParetoDominatesV1(baseline, baseline)).toBe(false);
    expect(
      strictParetoDominatesV1(
        {
          ...baseline,
          cashMargin: parseSafeInteger(9),
          freeAp: parseNonNegativeSafeInteger(4),
        },
        baseline,
      ),
    ).toBe(false);
  });

  it("uses exact even medians and an explicit empty result", () => {
    expect(medianPaidAfterTaxCashV1([10, 1, 9, 2])).toBe(5.5);
    expect(medianPaidAfterTaxCashV1([3])).toBe(3);
    expect(medianPaidAfterTaxCashV1([])).toBeNull();
  });

  it("canonicalizes integer balance evidence byte-identically to Base and exact halves as x.5", () => {
    const integerOnly = {
      "\u{10000}": [0, 1, true, null, "\u{1f37a}"],
      "\ue000": { z: -12, a: "tavern" },
    };
    expect(canonicalPocBalanceEvidenceBytesV1(integerOnly)).toEqual(
      canonicalJsonBytes(integerOnly),
    );
    expect(new TextDecoder().decode(canonicalPocBalanceEvidenceBytesV1({ positive: 7.5 }))).toBe(
      '{"positive":7.5}',
    );
  });

  it("rejects non-canonical balance evidence without invoking accessors", () => {
    let getterCalled = false;
    const getter = {};
    Object.defineProperty(getter, "value", {
      enumerable: true,
      get() {
        getterCalled = true;
        return 1;
      },
    });
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    const customObject = Object.create(null) as Record<string, unknown>;
    customObject.value = 1;
    const sparse = [1];
    sparse.length = 3;
    sparse[2] = 3;

    for (const value of [
      0.25,
      -0.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      -0,
      Number.MAX_SAFE_INTEGER + 1,
      getter,
      sparse,
      Object.assign([1], { extra: 2 }),
      Object.setPrototypeOf([1], null),
      customObject,
      cycle,
      "\ud800",
      { ["\udfff"]: 1 },
    ]) {
      expect(() => canonicalPocBalanceEvidenceBytesV1(value)).toThrow();
    }
    expect(getterCalled).toBe(false);
  });

  it("freezes every complete-corpus threshold boundary and ending invariant", () => {
    const fixture = calibrationCandidateFixtureV1();
    const passing = fixture.candidates[0]?.evaluation;
    if (passing === undefined) throw new TypeError("missing passing balance evaluation");
    expect(calculatePocBalanceDeficitV1(passing)).toBe(0);
    for (const metrics of Object.values(passing.metrics.strategies)) {
      expect(metrics.stableCount + metrics.dangerCount + metrics.arrearsCount).toBe(1000);
      expect(metrics.paidCount).toBe(metrics.stableCount + metrics.dangerCount);
    }

    const withStrategy = (
      strategyId: keyof typeof passing.metrics.strategies,
      changes: Partial<(typeof passing.metrics.strategies)[typeof strategyId]>,
    ) => ({
      ...passing,
      metrics: {
        ...passing.metrics,
        strategies: {
          ...passing.metrics.strategies,
          [strategyId]: { ...passing.metrics.strategies[strategyId], ...changes },
        },
      },
    });
    expect(
      calculatePocBalanceDeficitV1(
        withStrategy("strategy.cash_first", { paidCount: parseNonNegativeSafeInteger(899) }),
      ),
    ).toBe(1);
    expect(
      calculatePocBalanceDeficitV1(
        withStrategy("strategy.relationship_first", {
          paidCount: parseNonNegativeSafeInteger(899),
        }),
      ),
    ).toBe(1);
    expect(
      calculatePocBalanceDeficitV1(
        withStrategy("strategy.investigation_first", {
          paidCount: parseNonNegativeSafeInteger(899),
        }),
      ),
    ).toBe(1);
    expect(
      calculatePocBalanceDeficitV1(
        withStrategy("strategy.full_delegation", {
          paidCount: parseNonNegativeSafeInteger(850),
        }),
      ),
    ).toBe(0);
    expect(
      calculatePocBalanceDeficitV1(
        withStrategy("strategy.full_delegation", {
          paidCount: parseNonNegativeSafeInteger(950),
        }),
      ),
    ).toBe(0);
    expect(
      calculatePocBalanceDeficitV1(
        withStrategy("strategy.full_delegation", {
          paidCount: parseNonNegativeSafeInteger(849),
        }),
      ),
    ).toBe(1);
    expect(
      calculatePocBalanceDeficitV1(
        withStrategy("strategy.full_delegation", { medianPaidAfterTaxCash: 0 }),
      ),
    ).toBe(0);
    expect(
      calculatePocBalanceDeficitV1(
        withStrategy("strategy.full_delegation", { medianPaidAfterTaxCash: 35 }),
      ),
    ).toBe(0);
    expect(
      calculatePocBalanceDeficitV1(
        withStrategy("strategy.full_delegation", { medianPaidAfterTaxCash: -1 }),
      ),
    ).toBe(1);
    expect(
      calculatePocBalanceDeficitV1(
        withStrategy("strategy.full_delegation", { medianPaidAfterTaxCash: 36 }),
      ),
    ).toBe(1);
    expect(
      calculatePocBalanceDeficitV1(
        withStrategy("strategy.full_delegation", {
          paidCount: parseNonNegativeSafeInteger(951),
        }),
      ),
    ).toBe(1);
    expect(
      calculatePocBalanceDeficitV1(
        withStrategy("strategy.full_delegation", { medianPaidAfterTaxCash: null }),
      ),
    ).toBe(1001);
    expect(
      calculatePocBalanceDeficitV1(
        withStrategy("strategy.two_closures_recovery", {
          paidCount: parseNonNegativeSafeInteger(699),
        }),
      ),
    ).toBe(1);
    expect(
      calculatePocBalanceDeficitV1(
        withStrategy("strategy.explicit_failure", {
          paidCount: parseNonNegativeSafeInteger(201),
        }),
      ),
    ).toBe(1);

    for (const field of [
      "cashFirstPaidCount",
      "relationshipFirstPaidCount",
      "investigationFirstPaidCount",
    ] as const) {
      expect(
        calculatePocBalanceDeficitV1({
          ...passing,
          metrics: {
            ...passing.metrics,
            d4CashPressure: {
              ...passing.metrics.d4CashPressure,
              [field]: parseNonNegativeSafeInteger(749),
            },
          },
        }),
      ).toBe(1);
    }
    expect(
      calculatePocBalanceDeficitV1({
        ...passing,
        metrics: {
          ...passing.metrics,
          maximumStrictDominance: parseNonNegativeSafeInteger(801),
        },
      }),
    ).toBe(1001);
    for (const field of Object.keys(passing.counterfactuals) as Array<
      keyof typeof passing.counterfactuals
    >) {
      expect(
        calculatePocBalanceDeficitV1({
          ...passing,
          counterfactuals: { ...passing.counterfactuals, [field]: false },
        }),
      ).toBe(1001);
    }
  }, 30_000);

  it("counts AP only when a committed phase advance surrenders it", () => {
    expect(
      accumulatePocSurrenderedActionPointsV1({
        total: 3,
        before: 2,
        actionId: "action.advance_phase",
        resultKind: "committed",
      }),
    ).toBe(5);
    expect(
      accumulatePocSurrenderedActionPointsV1({
        total: 3,
        before: 2,
        actionId: "action.advance_phase",
        resultKind: "rejected",
      }),
    ).toBe(3);
    expect(
      accumulatePocSurrenderedActionPointsV1({
        total: 3,
        before: 2,
        actionId: "action.rest",
        resultKind: "committed",
      }),
    ).toBe(3);
  });

  it("runs one fixed seed through byte-identical sequential and worker smoke", async () => {
    const [sequential, workerShards] = await Promise.all([
      runPocBalanceCorpusShardV1({
        firstSeed: 1,
        lastSeed: 1,
        execution: "sequential",
      }),
      runPocBalanceCorpusWorkersForRangeV1({
        firstSeed: 1,
        lastSeed: 1,
        workerCount: 1,
      }),
    ]);
    const merged = mergePocBalanceCorpusShardRangeV1(workerShards);
    expect(canonicalJsonBytes(merged)).toEqual(canonicalJsonBytes(sequential));
    for (const strategy of Object.values(merged.strategies)) {
      expect(strategy.stableCount + strategy.dangerCount + strategy.arrearsCount).toBe(1);
    }
    expect(Object.isFrozen(merged)).toBe(true);

    const syntheticSecond = Object.freeze({ ...sequential, firstSeed: 2, lastSeed: 2 });
    const twoShardMerge = mergePocBalanceCorpusShardRangeV1([syntheticSecond, sequential]);
    const forwardMerge = mergePocBalanceCorpusShardRangeV1([sequential, syntheticSecond]);
    expect(canonicalJsonBytes(twoShardMerge)).toEqual(canonicalJsonBytes(forwardMerge));
    expect(twoShardMerge.firstSeed).toBe(1);
    expect(twoShardMerge.lastSeed).toBe(2);
    for (const strategy of Object.values(twoShardMerge.strategies)) {
      expect(strategy.stableCount + strategy.dangerCount + strategy.arrearsCount).toBe(2);
    }
    expect(() =>
      mergePocBalanceCorpusShardRangeV1([
        sequential,
        Object.freeze({ ...syntheticSecond, firstSeed: 3, lastSeed: 3 }),
      ]),
    ).toThrow(/overlap or have a gap/u);
    expect(() => mergePocBalanceCorpusShardRangeV1([sequential, sequential])).toThrow(
      /overlap or have a gap/u,
    );
  }, 120_000);

  it("partitions the complete corpus into frozen contiguous worker ranges", () => {
    const ranges = partitionPocBalanceSeedRangeV1({
      firstSeed: 1,
      lastSeed: 1000,
      workerCount: 64,
    });

    expect(ranges).toHaveLength(64);
    expect(Object.isFrozen(ranges)).toBe(true);
    expect(ranges[0]).toEqual({ firstSeed: 1, lastSeed: 16 });
    expect(ranges[39]).toEqual({ firstSeed: 625, lastSeed: 640 });
    expect(ranges[40]).toEqual({ firstSeed: 641, lastSeed: 655 });
    expect(ranges[63]).toEqual({ firstSeed: 986, lastSeed: 1000 });
    expect(
      ranges.slice(0, 40).every(({ firstSeed, lastSeed }) => lastSeed - firstSeed === 15),
    ).toBe(true);
    expect(ranges.slice(40).every(({ firstSeed, lastSeed }) => lastSeed - firstSeed === 14)).toBe(
      true,
    );
    for (const [index, range] of ranges.entries()) {
      expect(Object.isFrozen(range)).toBe(true);
      if (index > 0) expect(range.firstSeed).toBe((ranges[index - 1]?.lastSeed ?? 0) + 1);
    }

    expect(partitionPocBalanceSeedRangeV1({ firstSeed: 1, lastSeed: 1, workerCount: 64 })).toEqual([
      { firstSeed: 1, lastSeed: 1 },
    ]);
    for (const workerCount of [0, 65, 1.5]) {
      expect(() =>
        partitionPocBalanceSeedRangeV1({ firstSeed: 1, lastSeed: 1000, workerCount }),
      ).toThrow(/invalid PoC balance worker range/u);
    }
  });

  it("evaluates one requested calibration point through the shared explicit-worker ports", async () => {
    const fixture = calibrationCandidateFixtureV1();
    const values = fixture.values;
    const program = Object.freeze({ kind: "program" });
    const metrics = fixture.evaluation.metrics;
    const counterfactuals = fixture.evaluation.counterfactuals;
    const calls: unknown[] = [];

    const evaluation = await evaluatePocBalanceCalibrationValuesV1(
      { values, workerCount: 64 },
      {
        createProgram(received) {
          calls.push(["program", received]);
          return program as never;
        },
        async runCorpus(received) {
          calls.push(["metrics", received]);
          return metrics;
        },
        async evaluateCounterfactuals(received) {
          calls.push(["counterfactuals", received]);
          return counterfactuals;
        },
      },
    );

    expect(evaluation).toEqual({ metrics, counterfactuals });
    expect(Object.isFrozen(evaluation)).toBe(true);
    expect(calls).toEqual([
      ["program", values],
      ["metrics", { firstSeed: 1, lastSeed: 1000, workerCount: 64, calibrationValues: values }],
      ["counterfactuals", program],
    ]);
  });

  it("re-admits worker shards and waits for a clean worker exit", async () => {
    const strategyMetrics = Object.freeze({
      stableCount: 1,
      dangerCount: 0,
      arrearsCount: 0,
      paidAfterTaxCash: Object.freeze([0]),
    });
    const validShard = Object.freeze({
      firstSeed: 1,
      lastSeed: 1,
      strategies: Object.freeze({
        "strategy.cash_first": strategyMetrics,
        "strategy.relationship_first": strategyMetrics,
        "strategy.investigation_first": strategyMetrics,
        "strategy.full_delegation": strategyMetrics,
        "strategy.two_closures_recovery": strategyMetrics,
        "strategy.explicit_failure": strategyMetrics,
      }),
      d4CashPressure: Object.freeze({
        "strategy.cash_first": 1,
        "strategy.relationship_first": 1,
        "strategy.investigation_first": 1,
      }),
      strictDominanceCountByStrategy: Object.freeze({
        "strategy.cash_first": 0,
        "strategy.relationship_first": 0,
        "strategy.investigation_first": 0,
        "strategy.full_delegation": 0,
        "strategy.two_closures_recovery": 0,
        "strategy.explicit_failure": 0,
      }),
    });
    expect(parsePocBalanceCorpusShardV1(validShard)).toEqual(validShard);
    expect(() => parsePocBalanceCorpusShardV1(validShard, { firstSeed: 2, lastSeed: 2 })).toThrow(
      /wrong seed range/u,
    );
    expect(() =>
      parsePocBalanceCorpusShardV1({
        ...validShard,
        strategies: {
          ...validShard.strategies,
          "strategy.cash_first": { ...strategyMetrics, paidAfterTaxCash: [] },
        },
      }),
    ).toThrow(/paid samples do not equal paid endings/u);
    expect(() =>
      parsePocBalanceCorpusShardV1({
        ...validShard,
        strategies: {
          ...validShard.strategies,
          "strategy.cash_first": { ...strategyMetrics, paidAfterTaxCash: [-1] },
        },
      }),
    ).toThrow();
    expect(() =>
      parsePocBalanceCorpusShardV1({
        ...validShard,
        strategies: {
          ...validShard.strategies,
          "strategy.cash_first": {
            ...strategyMetrics,
            paidAfterTaxCash: Object.assign([0], { extra: "worker-byte" }),
          },
        },
      }),
    ).toThrow(/dense undecorated array/u);
    expect(() =>
      parsePocBalanceCorpusShardV1({
        ...validShard,
        strictDominanceCountByStrategy: {
          ...validShard.strictDominanceCountByStrategy,
          "strategy.cash_first": 1,
          "strategy.relationship_first": 1,
        },
      }),
    ).toThrow(/dominance counts exceed the shard seed count/u);

    class FaultAfterMessageWorkerV1 implements PocBalanceNodeWorkerV1 {
      readonly #listeners: {
        message?: (value: unknown) => void;
        error?: (error: Error) => void;
        exit?: (code: number) => void;
      } = {};

      constructor(
        _filename: URL,
        _options: ConstructorParameters<PocBalanceNodeWorkerConstructorV1>[1],
      ) {
        queueMicrotask(() => {
          this.#listeners.message?.(validShard);
          this.#listeners.exit?.(1);
        });
      }

      once(event: "message", listener: (value: unknown) => void): this;
      once(event: "error", listener: (error: Error) => void): this;
      once(event: "exit", listener: (code: number) => void): this;
      once(
        event: "message" | "error" | "exit",
        listener: ((value: unknown) => void) | ((error: Error) => void) | ((code: number) => void),
      ): this {
        if (event === "message") this.#listeners.message = listener as (value: unknown) => void;
        if (event === "error") this.#listeners.error = listener as (error: Error) => void;
        if (event === "exit") this.#listeners.exit = listener as (code: number) => void;
        return this;
      }

      async terminate(): Promise<number> {
        return 0;
      }
    }

    await expect(runPocBalanceShardWorkerV1(FaultAfterMessageWorkerV1, 1, 1)).rejects.toThrow(
      /worker exited 1/u,
    );
  });

  it("selects the seed-17 D6 plan from the committed war clue", async () => {
    const definition = pocReferenceStrategyDefinitionsV1["strategy.investigation_first"];
    const compiled = await compilePocStrategyForSeedV1(definition, parseNonZeroUint32(17));
    const clueFact = compiled.finalSnapshot.state.story.facts.find(
      ({ factId }) => factId === "fact.war_clue",
    );
    const warClue = clueFact?.value.kind === "boolean" ? clueFact.value.value : false;
    const committedWarClue = compiled.attempts.some(
      ({ outcome }) =>
        outcome.kind === "committed" &&
        outcome.facts.some(
          (fact) =>
            fact.kind === "fact.set" &&
            fact.factId === "fact.war_clue" &&
            fact.value.kind === "boolean" &&
            fact.value.value,
        ),
    );
    expect(clueFact?.value).toEqual({ kind: "boolean", value: true });
    expect(warClue).toBe(true);
    expect(committedWarClue).toBe(true);

    const daySix = definition.days.find(({ day }) => day === 6);
    if (daySix?.plan.kind !== "select_d6_plan_from_war_clue") {
      throw new TypeError("investigation strategy has no closed D6 clue decision");
    }
    const invocation = compiled.fixture.entries.find(
      (entry) => entry.day === 6 && entry.invocation.actionId === "action.service_plan",
    )?.invocation;
    if (invocation?.actionId !== "action.service_plan") {
      throw new TypeError("seed-17 compilation has no D6 service plan");
    }
    expect(invocation.options.plan).toEqual(
      warClue ? daySix.plan.cluePlan : daySix.plan.noCluePlan,
    );
  }, 30_000);

  it("builds immutable counterfactual programs before Session creation", async () => {
    const pressure = createPocCounterfactualScenarioV1({
      kind: "d4_cash_pressure",
      strategyId: "strategy.cash_first",
      seed: 1,
    });
    expect(Object.isFrozen(pressure)).toBe(true);
    expect(pressure.provenance.overrides).toEqual([
      { field: "facilityBuildCost", before: 12, after: 24 },
    ]);
    expect(() => mutateCounterfactualProgramForTestV1(pressure)).toThrow();

    const effects = await runPocFacilityCounterfactualsV1();
    expect(effects.withoutBed.d6ManualResult).toMatchObject({ kind: "rejected" });
    expect(effects.withoutColdStorage.d4FreshMeatSpoiledAtDay).toBe(5);
  }, 120_000);

  it("chooses one deterministic strictly improving calibration neighbor", () => {
    const selected = selectPocBalanceCalibrationStepV1(calibrationCandidateFixtureV1());
    expect(selected).toMatchObject({
      field: "levy",
      direction: "decrease",
      step: 2,
    });
    if (selected.kind !== "candidate") throw new TypeError("expected calibration candidate");
    expect(selected.afterDeficit).toBeLessThan(selected.beforeDeficit);

    expect(
      selectPocBalanceCalibrationStepV1({
        ...calibrationCandidateFixtureV1(),
        iteration: parseNonNegativeSafeInteger(12),
      }),
    ).toMatchObject({
      kind: "balance_contract_unsatisfied",
      reason: "iteration_limit",
    });
  }, 30_000);

  it("re-admits a canonical remote calibration run against the requested point", () => {
    const step = calibrationCandidateFixtureV1();
    const selection = selectPocBalanceCalibrationStepV1(step);
    const admitted = admitPocBalanceCalibrationRunV1(
      { step, selection: { ...selection } },
      { iteration: step.iteration, values: step.values },
    );

    expect(canonicalPocBalanceEvidenceBytesV1(admitted)).toEqual(
      canonicalPocBalanceEvidenceBytesV1({ step, selection }),
    );
    expect(admitted.selection).toEqual(selection);
    expect(Object.isFrozen(admitted)).toBe(true);
    expect(Object.isFrozen(admitted.step)).toBe(true);
    expect(Object.isFrozen(admitted.step.values)).toBe(true);
    expect(Object.isFrozen(admitted.step.candidates)).toBe(true);
    expect(Object.isFrozen(admitted.selection)).toBe(true);
  }, 30_000);

  it("admits only a canonical complete full balance report with a derived deficit", () => {
    const fixture = calibrationCandidateFixtureV1();
    const evaluation = fixture.candidates[0]?.evaluation;
    if (evaluation === undefined) throw new TypeError("missing passing balance evaluation");

    const report = { deficit: 0, evaluation };
    const admitted = admitPocBalanceFullReportV1(report);

    expect(canonicalPocBalanceEvidenceBytesV1(admitted)).toEqual(
      canonicalPocBalanceEvidenceBytesV1(report),
    );
    expect(admitted).toEqual(report);
    expect(Object.isFrozen(admitted)).toBe(true);
    expect(Object.isFrozen(admitted.evaluation)).toBe(true);
    expect(Object.isFrozen(admitted.evaluation.metrics)).toBe(true);
    expect(Object.isFrozen(admitted.evaluation.metrics.strategies)).toBe(true);
    expect(Object.isFrozen(admitted.evaluation.counterfactuals)).toBe(true);
  });

  it("rejects malformed full balance reports before threshold acceptance", () => {
    const fixture = calibrationCandidateFixtureV1();
    const evaluation = fixture.candidates[0]?.evaluation;
    if (evaluation === undefined) throw new TypeError("missing passing balance evaluation");
    const cashFirst = evaluation.metrics.strategies["strategy.cash_first"];

    const invalidReports = [
      { label: "null report", report: null },
      { label: "missing evaluation", report: { deficit: 0 } },
      { label: "null evaluation", report: { deficit: 0, evaluation: null } },
      { label: "extra report field", report: { deficit: 0, evaluation, extra: true } },
      { label: "negative deficit", report: { deficit: -1, evaluation } },
      { label: "fractional deficit", report: { deficit: 0.5, evaluation } },
      {
        label: "unsafe deficit",
        report: { deficit: Number.MAX_SAFE_INTEGER + 1, evaluation },
      },
      {
        label: "corpus range",
        report: {
          deficit: 0,
          evaluation: {
            ...evaluation,
            metrics: { ...evaluation.metrics, firstSeed: 2 },
          },
        },
      },
      {
        label: "ending count identity",
        report: {
          deficit: 0,
          evaluation: {
            ...evaluation,
            metrics: {
              ...evaluation.metrics,
              strategies: {
                ...evaluation.metrics.strategies,
                "strategy.cash_first": { ...cashFirst, stableCount: 0 },
              },
            },
          },
        },
      },
      {
        label: "count range",
        report: {
          deficit: 0,
          evaluation: {
            ...evaluation,
            metrics: {
              ...evaluation.metrics,
              d4CashPressure: {
                ...evaluation.metrics.d4CashPressure,
                cashFirstPaidCount: 1001,
              },
            },
          },
        },
      },
      {
        label: "median domain",
        report: {
          deficit: 0,
          evaluation: {
            ...evaluation,
            metrics: {
              ...evaluation.metrics,
              strategies: {
                ...evaluation.metrics.strategies,
                "strategy.cash_first": { ...cashFirst, medianPaidAfterTaxCash: 0.25 },
              },
            },
          },
        },
      },
      {
        label: "counterfactual domain",
        report: {
          deficit: 0,
          evaluation: {
            ...evaluation,
            counterfactuals: {
              ...evaluation.counterfactuals,
              comfortableBedRecovery: "true",
            },
          },
        },
      },
      { label: "claimed deficit", report: { deficit: 1, evaluation } },
    ] as const;

    for (const { label, report } of invalidReports) {
      expect(() => admitPocBalanceFullReportV1(report), label).toThrow();
    }
  });

  it("rejects mismatched, partial, out-of-order, and forged remote calibration runs", () => {
    const step = calibrationCandidateFixtureV1();
    const selection = selectPocBalanceCalibrationStepV1(step);
    if (selection.kind !== "candidate") throw new TypeError("expected calibration candidate");
    const [first, second] = step.candidates;
    if (first === undefined || second === undefined) {
      throw new TypeError("missing calibration evidence fixtures");
    }
    const expected = { iteration: step.iteration, values: step.values };
    const admit = (value: unknown) => admitPocBalanceCalibrationRunV1(value, expected);

    expect(() =>
      admitPocBalanceCalibrationRunV1(
        { step, selection },
        { iteration: parseNonNegativeSafeInteger(1), values: step.values },
      ),
    ).toThrow();
    expect(() =>
      admitPocBalanceCalibrationRunV1(
        { step, selection },
        {
          iteration: step.iteration,
          values: { ...step.values, levy: parseNonNegativeSafeInteger(138) },
        },
      ),
    ).toThrow();
    expect(() => admit({ step, selection, extra: true })).toThrow();
    expect(() =>
      admit({
        step: { ...step, candidates: [{ ...first, evaluation: step.evaluation }] },
        selection,
      }),
    ).toThrow();
    expect(() => admit({ step: { ...step, candidates: [second] }, selection })).toThrow();
    expect(() =>
      admit({
        step,
        selection: { kind: "candidate", field: selection.field },
      }),
    ).toThrow();
    expect(() =>
      admit({
        step,
        selection: {
          ...selection,
          afterDeficit: parseNonNegativeSafeInteger(selection.afterDeficit + 1),
        },
      }),
    ).toThrow();
  }, 30_000);

  it("evaluates the current point and only the canonical prefix through the first zero deficit", async () => {
    const fixture = calibrationCandidateFixtureV1();
    const passing = fixture.candidates[0];
    if (passing === undefined) throw new TypeError("missing passing calibration neighbor");
    const calls: unknown[] = [];
    const step = await evaluatePocBalanceCalibrationStepV1({
      iteration: fixture.iteration,
      values: fixture.values,
      evaluationPort: {
        async evaluate(point) {
          calls.push(point.values);
          return calls.length === 1 ? fixture.evaluation : passing.evaluation;
        },
      },
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual(fixture.values);
    expect(calls[1]).toEqual({
      ...fixture.values,
      [passing.field]: passing.afterValue,
    });
    expect(step.candidates).toHaveLength(1);
    expect(selectPocBalanceCalibrationStepV1(step)).toMatchObject({
      kind: "candidate",
      field: "levy",
      direction: "decrease",
      afterDeficit: 0,
    });
  }, 30_000);

  it("rejects partial, out-of-order, and duplicate calibration evidence", () => {
    const fixture = calibrationCandidateFixtureV1();
    const [first, second] = fixture.candidates;
    if (first === undefined || second === undefined) {
      throw new TypeError("missing calibration evidence fixtures");
    }
    const nonzeroFirst = { ...first, evaluation: fixture.evaluation };

    expect(() =>
      selectPocBalanceCalibrationStepV1({
        ...fixture,
        candidates: [nonzeroFirst],
      }),
    ).toThrow(/neither complete nor a canonical prefix/u);
    expect(() =>
      selectPocBalanceCalibrationStepV1({
        ...fixture,
        candidates: [second],
      }),
    ).toThrow(/not the canonical neighbor/u);
    expect(() =>
      selectPocBalanceCalibrationStepV1({
        ...fixture,
        candidates: [nonzeroFirst, nonzeroFirst],
      }),
    ).toThrow(/duplicate PoC balance calibration candidate/u);
  }, 30_000);

  it("rejects forged calibration evaluations before selecting a neighbor", () => {
    const fixture = calibrationCandidateFixtureV1();
    const first = fixture.candidates[0];
    if (first === undefined) throw new TypeError("missing calibration evidence fixture");
    const passing = first.evaluation;
    const selectWithEvaluation = (evaluation: typeof passing) =>
      selectPocBalanceCalibrationStepV1({
        ...fixture,
        candidates: [{ ...first, evaluation }],
      });
    const cashFirst = passing.metrics.strategies["strategy.cash_first"];
    const explicitFailure = passing.metrics.strategies["strategy.explicit_failure"];

    const forgedEvaluations = [
      {
        label: "closed corpus range",
        evaluation: {
          ...passing,
          metrics: { ...passing.metrics, firstSeed: 2 },
        },
      },
      {
        label: "ending identities",
        evaluation: {
          ...passing,
          metrics: {
            ...passing.metrics,
            strategies: {
              ...passing.metrics.strategies,
              "strategy.cash_first": {
                ...cashFirst,
                stableCount: parseNonNegativeSafeInteger(0),
                dangerCount: parseNonNegativeSafeInteger(0),
                arrearsCount: parseNonNegativeSafeInteger(0),
              },
            },
          },
        },
      },
      {
        label: "strategy keys",
        evaluation: {
          ...passing,
          metrics: {
            ...passing.metrics,
            strategies: {
              ...passing.metrics.strategies,
              "strategy.undeclared": cashFirst,
            },
          },
        },
      },
      {
        label: "paid sample identity",
        evaluation: {
          ...passing,
          metrics: {
            ...passing.metrics,
            strategies: {
              ...passing.metrics.strategies,
              "strategy.explicit_failure": {
                ...explicitFailure,
                paidCount: parseNonNegativeSafeInteger(0),
                stableCount: parseNonNegativeSafeInteger(0),
                dangerCount: parseNonNegativeSafeInteger(0),
                arrearsCount: parseNonNegativeSafeInteger(1000),
                medianPaidAfterTaxCash: 1,
              },
            },
          },
        },
      },
      {
        label: "median sample domain",
        evaluation: {
          ...passing,
          metrics: {
            ...passing.metrics,
            strategies: {
              ...passing.metrics.strategies,
              "strategy.cash_first": {
                ...cashFirst,
                medianPaidAfterTaxCash: 0.25,
              },
            },
          },
        },
      },
      {
        label: "integer pressure counts",
        evaluation: {
          ...passing,
          metrics: {
            ...passing.metrics,
            d4CashPressure: {
              ...passing.metrics.d4CashPressure,
              cashFirstPaidCount: 750.5,
            },
          },
        },
      },
      {
        label: "pressure count range",
        evaluation: {
          ...passing,
          metrics: {
            ...passing.metrics,
            d4CashPressure: {
              ...passing.metrics.d4CashPressure,
              cashFirstPaidCount: 1001,
            },
          },
        },
      },
      {
        label: "derived dominance maximum",
        evaluation: {
          ...passing,
          metrics: {
            ...passing.metrics,
            strictDominanceCountByStrategy: {
              ...passing.metrics.strictDominanceCountByStrategy,
              "strategy.cash_first": parseNonNegativeSafeInteger(1),
            },
            maximumStrictDominance: parseNonNegativeSafeInteger(0),
          },
        },
      },
      {
        label: "dominance count identity",
        evaluation: {
          ...passing,
          metrics: {
            ...passing.metrics,
            strictDominanceCountByStrategy: {
              ...passing.metrics.strictDominanceCountByStrategy,
              "strategy.cash_first": parseNonNegativeSafeInteger(1000),
              "strategy.relationship_first": parseNonNegativeSafeInteger(1),
            },
            maximumStrictDominance: parseNonNegativeSafeInteger(1000),
          },
        },
      },
      {
        label: "boolean counterfactuals",
        evaluation: {
          ...passing,
          counterfactuals: {
            ...passing.counterfactuals,
            comfortableBedRecovery: "true",
          },
        },
      },
      {
        label: "exact threshold input shape",
        evaluation: { ...passing, undeclaredThresholdInput: true },
      },
    ] as unknown as readonly { readonly label: string; readonly evaluation: typeof passing }[];

    for (const { label, evaluation } of forgedEvaluations) {
      expect(() => selectWithEvaluation(evaluation), label).toThrow(
        /invalid PoC balance calibration evaluation/u,
      );
    }
    for (const medianPaidAfterTaxCash of [5.5, Number.MAX_SAFE_INTEGER]) {
      expect(
        selectWithEvaluation({
          ...passing,
          metrics: {
            ...passing.metrics,
            strategies: {
              ...passing.metrics.strategies,
              "strategy.cash_first": {
                ...cashFirst,
                medianPaidAfterTaxCash,
              },
            },
          },
        }),
      ).toMatchObject({ kind: "candidate", field: first.field });
    }
    expect(() =>
      selectPocBalanceCalibrationStepV1({
        ...fixture,
        evaluation: forgedEvaluations[0]!.evaluation,
      }),
    ).toThrow(/invalid PoC balance calibration evaluation/u);
    expect(() =>
      selectPocBalanceCalibrationStepV1({
        ...fixture,
        values: { ...fixture.values, undeclaredCalibrationField: 1 },
      } as typeof fixture),
    ).toThrow(/invalid PoC balance calibration values/u);
  }, 30_000);

  it("rejects forged calibration evaluation-port results before selection", async () => {
    const fixture = calibrationCandidateFixtureV1();
    const first = fixture.candidates[0];
    if (first === undefined) throw new TypeError("missing calibration evidence fixture");
    const invalidEvaluation = {
      ...first.evaluation,
      metrics: {
        ...first.evaluation.metrics,
        d4CashPressure: {
          ...first.evaluation.metrics.d4CashPressure,
          cashFirstPaidCount: 750.5,
        },
      },
    } as typeof first.evaluation;

    await expect(
      evaluatePocBalanceCalibrationStepV1({
        iteration: fixture.iteration,
        values: fixture.values,
        evaluationPort: {
          async evaluate() {
            return invalidEvaluation;
          },
        },
      }),
    ).rejects.toThrow(/invalid PoC balance calibration evaluation/u);

    let calls = 0;
    await expect(
      evaluatePocBalanceCalibrationStepV1({
        iteration: fixture.iteration,
        values: fixture.values,
        evaluationPort: {
          async evaluate() {
            calls += 1;
            return calls === 1 ? fixture.evaluation : invalidEvaluation;
          },
        },
      }),
    ).rejects.toThrow(/invalid PoC balance calibration evaluation/u);
    expect(calls).toBe(2);
  }, 30_000);

  it("materializes the first real calibration neighbor as an immutable Program", () => {
    const values = pocBalanceCalibrationValuesV1();
    const firstNeighbor = enumeratePocBalanceCalibrationNeighborsV1(values)[0];
    expect(firstNeighbor).toEqual({
      field: "levy",
      direction: "decrease",
      step: 2,
      beforeValue: values.levy,
      afterValue: values.levy - 2,
    });
    if (firstNeighbor === undefined) throw new TypeError("missing first calibration neighbor");

    const program = createPocBalanceCalibrationProgramV1({
      ...values,
      [firstNeighbor.field]: firstNeighbor.afterValue,
    });
    expect(program.data.balance.levyAmount).toBe(firstNeighbor.afterValue);
    expect(Object.isFrozen(program)).toBe(true);
    expect(Object.isFrozen(program.data)).toBe(true);
    expect(Object.isFrozen(program.data.balance)).toBe(true);
    expect(Object.isFrozen(program.rules)).toBe(true);
  }, 30_000);
});
