// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assertPocBalanceFullReportV1,
  assertPocProvisionalBalanceReportV1,
  buildPocBalanceFullReportV1,
  pocBalanceSmokeVerificationCommandV1,
  pocProvisionalBalanceReportV1,
  runPocBalanceCliV1,
  runPocBalanceSmokeVerificationV1,
} from "./verify-poc-balance.mjs";

function fixtureCanonicalJsonBytesV1(value) {
  return new TextEncoder().encode(JSON.stringify(value));
}

test("owns one frozen read-only PoC balance smoke command", () => {
  assert.deepEqual(pocBalanceSmokeVerificationCommandV1, [
    "pnpm",
    ["--filter", "@project-tavern/story-poc", "verify:balance:smoke"],
  ]);
  assert(Object.isFrozen(pocBalanceSmokeVerificationCommandV1));
  assert(Object.isFrozen(pocBalanceSmokeVerificationCommandV1[1]));
  assert(
    !pocBalanceSmokeVerificationCommandV1
      .flat(2)
      .some((token) => /update|regenerate|write|publish|deploy/u.test(token)),
  );
});

test("stops smoke on failure without enabling a shell", () => {
  const calls = [];
  const injectedSpawn = (command, args, options) => {
    calls.push([command, args, options]);
    return { status: 1 };
  };
  assert.throws(
    () => runPocBalanceSmokeVerificationV1("/repo/project-tavern", injectedSpawn),
    /pnpm --filter @project-tavern\/story-poc verify:balance:smoke failed/u,
  );
  assert.deepEqual(calls, [
    [
      "pnpm",
      ["--filter", "@project-tavern/story-poc", "verify:balance:smoke"],
      { cwd: "/repo/project-tavern", shell: false, stdio: "inherit" },
    ],
  ]);
});

test("builds a complete report through injected deterministic ports", async () => {
  const calls = [];
  const values = Object.freeze({ levy: 140 });
  const metrics = Object.freeze({ kind: "metrics" });
  const counterfactuals = Object.freeze({ kind: "counterfactuals" });
  const report = await buildPocBalanceFullReportV1(
    async () => ({
      calibration: {
        pocBalanceCalibrationValuesV1() {
          calls.push("values");
          return values;
        },
        calculatePocBalanceDeficitV1(evaluation) {
          calls.push(["deficit", evaluation]);
          return 0;
        },
      },
      metrics: {
        async evaluatePocBalanceCalibrationValuesV1(input) {
          calls.push(["evaluate", input]);
          return Object.freeze({ metrics, counterfactuals });
        },
      },
    }),
    64,
  );
  assert.equal(report.deficit, 0);
  assert.deepEqual(report.evaluation, { metrics, counterfactuals });
  assert.deepEqual(calls, [
    "values",
    ["evaluate", { values, workerCount: 64 }],
    ["deficit", { metrics, counterfactuals }],
  ]);
});

test("rejects a nonzero frozen-threshold deficit", () => {
  const passing = { deficit: 0, evaluation: {} };
  assert.equal(assertPocBalanceFullReportV1(passing), passing);
  assert.throws(
    () => assertPocBalanceFullReportV1({ deficit: 0, evaluation: null }),
    /invalid PoC balance full report/u,
  );
  assert.throws(
    () => assertPocBalanceFullReportV1({ deficit: 49, evaluation: {} }),
    /balance_contract_unsatisfied deficit=49/u,
  );
});

test("qualifies only the exact reviewed provisional report", () => {
  assert.equal(
    assertPocProvisionalBalanceReportV1(pocProvisionalBalanceReportV1),
    pocProvisionalBalanceReportV1,
  );
  assert.throws(
    () => assertPocBalanceFullReportV1(pocProvisionalBalanceReportV1),
    /balance_contract_unsatisfied deficit=49/u,
  );
  assert(Object.isFrozen(pocProvisionalBalanceReportV1));
  assert(Object.isFrozen(pocProvisionalBalanceReportV1.evaluation.metrics.strategies));
  assert.throws(
    () =>
      assertPocProvisionalBalanceReportV1({
        ...pocProvisionalBalanceReportV1,
        deficit: 48,
      }),
    /does not match the reviewed baseline/u,
  );
});

test("runs the default CLI through the complete report ports exactly once", async () => {
  const calls = [];
  const output = [];
  const values = Object.freeze({ levy: 140 });
  const status = await runPocBalanceCliV1({
    args: [],
    loadRuntime: async () => ({
      base: {
        canonicalJsonBytes() {
          throw new TypeError("Base integer-only codec must not encode balance evidence");
        },
      },
      calibration: {
        admitPocBalanceFullReportV1(report) {
          calls.push(["admit", report]);
          return report;
        },
        canonicalPocBalanceEvidenceBytesV1: fixtureCanonicalJsonBytesV1,
        pocBalanceCalibrationValuesV1() {
          calls.push("values");
          return values;
        },
        calculatePocBalanceDeficitV1(received) {
          calls.push(["deficit", received]);
          return 0;
        },
      },
      metrics: {
        async evaluatePocBalanceCalibrationValuesV1(received) {
          calls.push(["evaluate", received]);
          return Object.freeze({
            metrics: Object.freeze({ firstSeed: 1, lastSeed: 1000 }),
            counterfactuals: Object.freeze({ comfortableBedRecovery: true }),
          });
        },
      },
    }),
    writeStdout(value) {
      output.push(value);
    },
  });

  assert.equal(status, 0);
  assert.equal(calls.filter((call) => Array.isArray(call) && call[0] === "evaluate").length, 1);
  assert.deepEqual(
    calls.find((call) => Array.isArray(call) && call[0] === "evaluate"),
    ["evaluate", { values, workerCount: 16 }],
  );
  assert.deepEqual(calls.at(-1), [
    "admit",
    {
      deficit: 0,
      evaluation: {
        metrics: { firstSeed: 1, lastSeed: 1000 },
        counterfactuals: { comfortableBedRecovery: true },
      },
    },
  ]);
  assert.match(output.join(""), /^PoC balance report /u);
});

test("routes an explicit strict worker count without adding scheduling to report bytes", async () => {
  const admittedReports = [];
  const metricInputs = [];
  const output = [];
  const status = await runPocBalanceCliV1({
    args: ["--workers=64"],
    loadRuntime: async () => ({
      base: { canonicalJsonBytes: fixtureCanonicalJsonBytesV1 },
      calibration: {
        admitPocBalanceFullReportV1(report) {
          admittedReports.push(report);
          return report;
        },
        canonicalPocBalanceEvidenceBytesV1: fixtureCanonicalJsonBytesV1,
        pocBalanceCalibrationValuesV1() {
          return Object.freeze({ levy: 140 });
        },
        calculatePocBalanceDeficitV1() {
          return 0;
        },
      },
      metrics: {
        async evaluatePocBalanceCalibrationValuesV1(input) {
          metricInputs.push(input);
          return Object.freeze({
            metrics: Object.freeze({ firstSeed: 1, lastSeed: 1000 }),
            counterfactuals: Object.freeze({ comfortableBedRecovery: true }),
          });
        },
      },
    }),
    writeStdout(value) {
      output.push(value);
    },
  });

  assert.equal(status, 0);
  assert.equal(admittedReports.length, 1);
  assert.deepEqual(metricInputs, [{ values: { levy: 140 }, workerCount: 64 }]);
  assert(!output.join("").includes("worker"));
});

test("requires Story full-report admission before strict output", async () => {
  const output = [];
  const runtimeWithoutAdmission = {
    base: { canonicalJsonBytes: fixtureCanonicalJsonBytesV1 },
    calibration: {
      canonicalPocBalanceEvidenceBytesV1: fixtureCanonicalJsonBytesV1,
      pocBalanceCalibrationValuesV1() {
        return Object.freeze({ levy: 140 });
      },
      calculatePocBalanceDeficitV1() {
        return 0;
      },
    },
    metrics: {
      async evaluatePocBalanceCalibrationValuesV1() {
        return Object.freeze({
          metrics: Object.freeze({ firstSeed: 1, lastSeed: 1000 }),
          counterfactuals: Object.freeze({ comfortableBedRecovery: true }),
        });
      },
    },
  };

  await assert.rejects(
    () =>
      runPocBalanceCliV1({
        args: [],
        loadRuntime: async () => runtimeWithoutAdmission,
        writeStdout(value) {
          output.push(value);
        },
      }),
    /full-report admission is unavailable/u,
  );
  assert.deepEqual(output, []);

  await assert.rejects(
    () =>
      runPocBalanceCliV1({
        args: [],
        loadRuntime: async () => ({
          ...runtimeWithoutAdmission,
          calibration: {
            ...runtimeWithoutAdmission.calibration,
            admitPocBalanceFullReportV1() {
              throw new TypeError("Story full-report admission rejected the evidence");
            },
          },
        }),
        writeStdout(value) {
          output.push(value);
        },
      }),
    /admission rejected the evidence/u,
  );
  assert.deepEqual(output, []);
});

test("applies the strict zero-deficit threshold to the admitted report", async () => {
  const calls = [];
  await assert.rejects(
    () =>
      runPocBalanceCliV1({
        args: [],
        loadRuntime: async () => ({
          base: { canonicalJsonBytes: fixtureCanonicalJsonBytesV1 },
          calibration: {
            admitPocBalanceFullReportV1(report) {
              calls.push(["admit", report.deficit]);
              return { deficit: 1, evaluation: {} };
            },
            canonicalPocBalanceEvidenceBytesV1(report) {
              calls.push(["encode", report.deficit]);
              return fixtureCanonicalJsonBytesV1(report);
            },
            pocBalanceCalibrationValuesV1() {
              return Object.freeze({ levy: 140 });
            },
            calculatePocBalanceDeficitV1() {
              return 0;
            },
          },
          metrics: {
            async evaluatePocBalanceCalibrationValuesV1() {
              return Object.freeze({
                metrics: Object.freeze({}),
                counterfactuals: Object.freeze({}),
              });
            },
          },
        }),
        writeStdout() {},
      }),
    /balance_contract_unsatisfied deficit=1/u,
  );
  assert.deepEqual(calls, [
    ["admit", 0],
    ["encode", 1],
  ]);
});

test("runs calibration through one injected read-only selection port", async () => {
  const values = Object.freeze({ levy: 140 });
  const selection = Object.freeze({ kind: "candidate", field: "levy", afterValue: 138 });
  const calibration = Object.freeze({
    step: Object.freeze({ candidates: [], medianPaidAfterTaxCash: 5.5 }),
    selection,
  });
  const calls = [];
  const output = [];
  const status = await runPocBalanceCliV1({
    args: ["--calibrate", "--iteration=7", "--workers=32"],
    loadRuntime: async () => ({
      base: {
        canonicalJsonBytes() {
          throw new TypeError("Base integer-only codec must not encode balance evidence");
        },
      },
      calibration: {
        canonicalPocBalanceEvidenceBytesV1: fixtureCanonicalJsonBytesV1,
        pocBalanceCalibrationValuesV1() {
          return values;
        },
      },
      metrics: {
        async runPocBalanceCalibrationStepV1(input) {
          calls.push(input);
          return calibration;
        },
      },
    }),
    writeStdout(value) {
      output.push(value);
    },
  });

  assert.equal(status, 0);
  assert.deepEqual(calls, [{ iteration: 7, values, workerCount: 32 }]);
  assert.equal(output.join(""), `PoC balance calibration ${JSON.stringify(calibration)}\n`);

  const defaultIterationCalls = [];
  const defaultIterationStatus = await runPocBalanceCliV1({
    args: ["--calibrate", "--workers=64"],
    loadRuntime: async () => ({
      base: { canonicalJsonBytes: fixtureCanonicalJsonBytesV1 },
      calibration: {
        canonicalPocBalanceEvidenceBytesV1: fixtureCanonicalJsonBytesV1,
        pocBalanceCalibrationValuesV1() {
          return values;
        },
      },
      metrics: {
        async runPocBalanceCalibrationStepV1(input) {
          defaultIterationCalls.push(input);
          return calibration;
        },
      },
    }),
    writeStdout() {},
  });
  assert.equal(defaultIterationStatus, 0);
  assert.deepEqual(defaultIterationCalls, [{ iteration: 0, values, workerCount: 64 }]);
});

test("qualifies the provisional CLI without weakening the default full gate", async () => {
  const output = [];
  const metricInputs = [];
  const status = await runPocBalanceCliV1({
    args: ["--qualify-provisional", "--workers=63"],
    loadRuntime: async () => ({
      base: { canonicalJsonBytes: fixtureCanonicalJsonBytesV1 },
      calibration: {
        admitPocBalanceFullReportV1(report) {
          return report;
        },
        canonicalPocBalanceEvidenceBytesV1: fixtureCanonicalJsonBytesV1,
        pocBalanceCalibrationValuesV1() {
          return Object.freeze({ levy: 140 });
        },
        calculatePocBalanceDeficitV1() {
          return pocProvisionalBalanceReportV1.deficit;
        },
      },
      metrics: {
        async evaluatePocBalanceCalibrationValuesV1(input) {
          metricInputs.push(input);
          return pocProvisionalBalanceReportV1.evaluation;
        },
      },
    }),
    writeStdout(value) {
      output.push(value);
    },
  });

  assert.equal(status, 0);
  assert.equal(metricInputs[0]?.workerCount, 63);
  assert.match(output.join(""), /^PoC balance report /u);
});

test("rejects unsupported CLI arguments before loading runtime", async () => {
  const invalidArgs = [
    ["--unknown"],
    ["--workers=0"],
    ["--workers=65"],
    ["--workers=01"],
    ["--workers=16", "--workers=16"],
    ["--smoke", "--workers=16"],
    ["--qualify-provisional", "--workers=16", "--workers=16"],
    ["--workers=16", "--qualify-provisional"],
    ["--calibrate", "--iteration=13"],
    ["--calibrate", "--workers=16", "--iteration=7"],
    ["--calibrate", "--iteration=7", "--workers=16", "--workers=16"],
    ["--calibrate", "--iteration=7", "--unknown"],
  ];
  for (const args of invalidArgs) {
    let loaded = false;
    await assert.rejects(
      () =>
        runPocBalanceCliV1({
          args,
          loadRuntime: async () => {
            loaded = true;
            throw new TypeError("must not load");
          },
        }),
      /usage: verify-poc-balance/u,
    );
    assert.equal(loaded, false, args.join(" "));
  }
});

test("maps stable root and Story aliases without changing full-gate meaning", async () => {
  const rootPackage = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  const storyPackage = JSON.parse(
    await readFile(new URL("../game/stories/poc/package.json", import.meta.url), "utf8"),
  );
  assert.equal(rootPackage.scripts["verify:balance"], "node scripts/verify-poc-balance.mjs");
  assert.equal(
    rootPackage.scripts["verify:balance:smoke"],
    "node scripts/verify-poc-balance.mjs --smoke",
  );
  assert.equal(
    storyPackage.scripts["verify:balance"],
    "node ../../../scripts/verify-poc-balance.mjs",
  );
  assert.equal(
    storyPackage.scripts["verify:balance:smoke"],
    "vitest run src/test/balance-1000-seeds.test.ts",
  );
  assert.equal(
    storyPackage.scripts["calibrate:balance"],
    "node ../../../scripts/verify-poc-balance.mjs --calibrate",
  );
});
