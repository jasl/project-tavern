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
  const program = Object.freeze({ kind: "program" });
  const metrics = Object.freeze({ kind: "metrics" });
  const counterfactuals = Object.freeze({ kind: "counterfactuals" });
  const report = await buildPocBalanceFullReportV1(async () => ({
    calibration: {
      pocBalanceCalibrationValuesV1() {
        calls.push("values");
        return values;
      },
      createPocBalanceCalibrationProgramV1(received) {
        calls.push(["program", received]);
        return program;
      },
      calculatePocBalanceDeficitV1(evaluation) {
        calls.push(["deficit", evaluation]);
        return 0;
      },
    },
    counterfactuals: {
      async evaluatePocFacilityCounterfactualChecksV1(received) {
        calls.push(["counterfactuals", received]);
        return counterfactuals;
      },
    },
    metrics: {
      async runPocBalanceCorpusV1(input) {
        calls.push(["metrics", input]);
        return metrics;
      },
    },
  }));
  assert.equal(report.deficit, 0);
  assert.deepEqual(report.evaluation, { metrics, counterfactuals });
  assert.deepEqual(calls, [
    "values",
    ["program", values],
    ["metrics", { firstSeed: 1, lastSeed: 1000, calibrationValues: values }],
    ["counterfactuals", program],
    ["deficit", { metrics, counterfactuals }],
  ]);
});

test("rejects a nonzero frozen-threshold deficit", () => {
  const passing = { deficit: 0 };
  assert.equal(assertPocBalanceFullReportV1(passing), passing);
  assert.throws(
    () => assertPocBalanceFullReportV1({ deficit: 49 }),
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
  const program = Object.freeze({ kind: "program" });
  const status = await runPocBalanceCliV1({
    args: [],
    loadRuntime: async () => ({
      base: { canonicalJsonBytes: fixtureCanonicalJsonBytesV1 },
      calibration: {
        pocBalanceCalibrationValuesV1() {
          calls.push("values");
          return values;
        },
        createPocBalanceCalibrationProgramV1(received) {
          calls.push(["program", received]);
          return program;
        },
        calculatePocBalanceDeficitV1(received) {
          calls.push(["deficit", received]);
          return 0;
        },
      },
      counterfactuals: {
        async evaluatePocFacilityCounterfactualChecksV1(received) {
          calls.push(["counterfactuals", received]);
          return Object.freeze({ comfortableBedRecovery: true });
        },
      },
      metrics: {
        async runPocBalanceCorpusV1(received) {
          calls.push(["metrics", received]);
          return Object.freeze({ firstSeed: 1, lastSeed: 1000 });
        },
      },
    }),
    writeStdout(value) {
      output.push(value);
    },
  });

  assert.equal(status, 0);
  assert.equal(calls.filter((call) => Array.isArray(call) && call[0] === "metrics").length, 1);
  assert.match(output.join(""), /^PoC balance report /u);
});

test("runs calibration through one injected read-only selection port", async () => {
  const values = Object.freeze({ levy: 140 });
  const selection = Object.freeze({ kind: "candidate", field: "levy", afterValue: 138 });
  const calibration = Object.freeze({ step: Object.freeze({ candidates: [] }), selection });
  const calls = [];
  const output = [];
  const status = await runPocBalanceCliV1({
    args: ["--calibrate", "--iteration=7"],
    loadRuntime: async () => ({
      base: { canonicalJsonBytes: fixtureCanonicalJsonBytesV1 },
      calibration: {
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
  assert.deepEqual(calls, [{ iteration: 7, values }]);
  assert.equal(output.join(""), `PoC balance calibration ${JSON.stringify(calibration)}\n`);
});

test("qualifies the provisional CLI without weakening the default full gate", async () => {
  const output = [];
  const status = await runPocBalanceCliV1({
    args: ["--qualify-provisional"],
    loadRuntime: async () => ({
      base: { canonicalJsonBytes: fixtureCanonicalJsonBytesV1 },
      calibration: {
        pocBalanceCalibrationValuesV1() {
          return Object.freeze({ levy: 140 });
        },
        createPocBalanceCalibrationProgramV1() {
          return Object.freeze({ kind: "program" });
        },
        calculatePocBalanceDeficitV1() {
          return pocProvisionalBalanceReportV1.deficit;
        },
      },
      counterfactuals: {
        async evaluatePocFacilityCounterfactualChecksV1() {
          return pocProvisionalBalanceReportV1.evaluation.counterfactuals;
        },
      },
      metrics: {
        async runPocBalanceCorpusV1() {
          return pocProvisionalBalanceReportV1.evaluation.metrics;
        },
      },
    }),
    writeStdout(value) {
      output.push(value);
    },
  });

  assert.equal(status, 0);
  assert.match(output.join(""), /^PoC balance report /u);
});

test("rejects unsupported CLI arguments before loading runtime", async () => {
  let loaded = false;
  await assert.rejects(
    () =>
      runPocBalanceCliV1({
        args: ["--unknown"],
        loadRuntime: async () => {
          loaded = true;
          throw new TypeError("must not load");
        },
      }),
    /usage: verify-poc-balance/u,
  );
  assert.equal(loaded, false);
  await assert.rejects(
    () => runPocBalanceCliV1({ args: ["--calibrate", "--iteration=13"] }),
    /usage: verify-poc-balance/u,
  );
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
