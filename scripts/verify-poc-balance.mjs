// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { isMainThread, parentPort, workerData } from "node:worker_threads";

export const pocBalanceSmokeVerificationCommandV1 = Object.freeze([
  "pnpm",
  Object.freeze(["--filter", "@project-tavern/story-poc", "verify:balance:smoke"]),
]);

function deepFreezeEvidenceV1(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreezeEvidenceV1(nested);
  return Object.freeze(value);
}

export const pocProvisionalBalanceReportV1 = deepFreezeEvidenceV1({
  deficit: 49,
  evaluation: {
    metrics: {
      firstSeed: 1,
      lastSeed: 1000,
      strategies: {
        "strategy.cash_first": {
          paidCount: 1000,
          stableCount: 1000,
          dangerCount: 0,
          arrearsCount: 0,
          medianPaidAfterTaxCash: 131,
        },
        "strategy.relationship_first": {
          paidCount: 1000,
          stableCount: 970,
          dangerCount: 30,
          arrearsCount: 0,
          medianPaidAfterTaxCash: 44,
        },
        "strategy.investigation_first": {
          paidCount: 1000,
          stableCount: 909,
          dangerCount: 91,
          arrearsCount: 0,
          medianPaidAfterTaxCash: 55,
        },
        "strategy.full_delegation": {
          paidCount: 801,
          stableCount: 90,
          dangerCount: 711,
          arrearsCount: 199,
          medianPaidAfterTaxCash: 14,
        },
        "strategy.two_closures_recovery": {
          paidCount: 970,
          stableCount: 562,
          dangerCount: 408,
          arrearsCount: 30,
          medianPaidAfterTaxCash: 24,
        },
        "strategy.explicit_failure": {
          paidCount: 0,
          stableCount: 0,
          dangerCount: 0,
          arrearsCount: 1000,
          medianPaidAfterTaxCash: null,
        },
      },
      d4CashPressure: {
        cashFirstPaidCount: 1000,
        relationshipFirstPaidCount: 994,
        investigationFirstPaidCount: 999,
      },
      strictDominanceCountByStrategy: {
        "strategy.cash_first": 0,
        "strategy.relationship_first": 0,
        "strategy.investigation_first": 0,
        "strategy.full_delegation": 0,
        "strategy.two_closures_recovery": 0,
        "strategy.explicit_failure": 0,
      },
      maximumStrictDominance: 0,
    },
    counterfactuals: {
      comfortableBedRecovery: true,
      investigationColdStorageShelfLife: true,
      fullDelegationColdStorageShelfLife: true,
    },
  },
});

export function runPocBalanceSmokeVerificationV1(root, spawn = spawnSync) {
  const [command, args] = pocBalanceSmokeVerificationCommandV1;
  const result = spawn(command, args, {
    cwd: root,
    shell: false,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new TypeError(`${command} ${args.join(" ")} failed`);
  }
}

export function assertPocBalanceFullReportV1(report) {
  if (
    report === null ||
    typeof report !== "object" ||
    !Number.isSafeInteger(report.deficit) ||
    report.deficit < 0
  ) {
    throw new TypeError("invalid PoC balance full report");
  }
  if (report.deficit !== 0) {
    throw new TypeError(`balance_contract_unsatisfied deficit=${report.deficit}`);
  }
  return report;
}

export function assertPocProvisionalBalanceReportV1(report) {
  if (!isDeepStrictEqual(report, pocProvisionalBalanceReportV1)) {
    throw new TypeError("PoC provisional balance report does not match the reviewed baseline");
  }
  return report;
}

let hooksInstalledV1 = false;

async function installTypeStripHooksV1() {
  if (hooksInstalledV1) return;
  const { registerHooks } = await import("node:module");
  registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        if (specifier.endsWith(".js")) {
          return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
        }
        throw error;
      }
    },
  });
  hooksInstalledV1 = true;
}

async function loadPocBalanceRuntimeV1() {
  await installTypeStripHooksV1();
  const [base, calibration, counterfactuals, metrics] = await Promise.all([
    import("../engine/packages/base/src/index.ts"),
    import("../game/stories/poc/src/testing/balance-calibration.ts"),
    import("../game/stories/poc/src/testing/counterfactual-scenarios.ts"),
    import("../game/stories/poc/src/testing/balance-metrics.ts"),
  ]);
  return { base, calibration, counterfactuals, metrics };
}

function parsePocBalanceWorkerCountV1(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 64) {
    throw new TypeError("invalid PoC balance worker count");
  }
  return value;
}

export async function buildPocBalanceFullReportV1(
  loadRuntime = loadPocBalanceRuntimeV1,
  workerCount = 16,
) {
  const admittedWorkerCount = parsePocBalanceWorkerCountV1(workerCount);
  const { calibration, metrics } = await loadRuntime();
  const values = calibration.pocBalanceCalibrationValuesV1();
  const evaluation = await metrics.evaluatePocBalanceCalibrationValuesV1({
    values,
    workerCount: admittedWorkerCount,
  });
  return Object.freeze({
    deficit: calibration.calculatePocBalanceDeficitV1(evaluation),
    evaluation,
  });
}

async function runBalanceShardWorkerV1() {
  if (
    workerData === null ||
    typeof workerData !== "object" ||
    workerData.kind !== "project_tavern_poc_balance_shard_v1" ||
    !Number.isSafeInteger(workerData.firstSeed) ||
    !Number.isSafeInteger(workerData.lastSeed) ||
    (workerData.calibrationValues !== undefined &&
      (workerData.calibrationValues === null ||
        typeof workerData.calibrationValues !== "object" ||
        Array.isArray(workerData.calibrationValues))) ||
    parentPort === null
  ) {
    throw new TypeError("invalid PoC balance worker data");
  }
  await installTypeStripHooksV1();
  const { runPocBalanceCorpusShardV1 } =
    await import("../game/stories/poc/src/testing/balance-metrics.ts");
  const shard = await runPocBalanceCorpusShardV1({
    firstSeed: workerData.firstSeed,
    lastSeed: workerData.lastSeed,
    ...(workerData.calibrationValues === undefined
      ? {}
      : { calibrationValues: workerData.calibrationValues }),
  });
  process.stderr.write(
    `PoC balance shard ${workerData.firstSeed}-${workerData.lastSeed} complete\n`,
  );
  parentPort.postMessage(shard, []);
}

export async function runPocBalanceCliV1({
  args,
  root = dirname(dirname(fileURLToPath(import.meta.url))),
  spawn = spawnSync,
  loadRuntime = loadPocBalanceRuntimeV1,
  writeStdout = (value) => process.stdout.write(value),
}) {
  if (!Array.isArray(args)) throw new TypeError("PoC balance CLI args must be an array");
  const usage = () => {
    throw new TypeError(
      "usage: verify-poc-balance.mjs [--workers=1..64|--smoke|--calibrate [--iteration=0..12] [--workers=1..64]|--qualify-provisional [--workers=1..64]]",
    );
  };
  if (args.some((argument) => typeof argument !== "string")) usage();
  const workerMatchV1 = (argument) =>
    typeof argument === "string" ? /^--workers=([1-9]|[1-5][0-9]|6[0-4])$/u.exec(argument) : null;
  const iterationMatchV1 = (argument) =>
    typeof argument === "string" ? /^--iteration=(0|[1-9]|1[0-2])$/u.exec(argument) : null;

  let mode = "strict";
  let calibrationIteration = 0;
  let workerCount = 16;
  let index = 0;
  const first = args[0];
  if (first === "--smoke") {
    mode = "smoke";
    index = 1;
  } else if (first === "--calibrate") {
    mode = "calibrate";
    index = 1;
    const iterationMatch = iterationMatchV1(args[index]);
    if (iterationMatch !== null) {
      calibrationIteration = Number(iterationMatch[1]);
      index += 1;
    }
    const workerMatch = workerMatchV1(args[index]);
    if (workerMatch !== null) {
      workerCount = Number(workerMatch[1]);
      index += 1;
    }
  } else if (first === "--qualify-provisional") {
    mode = "qualify";
    index = 1;
    const workerMatch = workerMatchV1(args[index]);
    if (workerMatch !== null) {
      workerCount = Number(workerMatch[1]);
      index += 1;
    }
  } else if (first !== undefined) {
    const workerMatch = workerMatchV1(first);
    if (workerMatch === null) usage();
    workerCount = Number(workerMatch[1]);
    index = 1;
  }
  if (index !== args.length) usage();
  workerCount = parsePocBalanceWorkerCountV1(workerCount);

  if (mode === "smoke") {
    runPocBalanceSmokeVerificationV1(root, spawn);
    return 0;
  }

  const runtime = await loadRuntime();
  if (mode === "calibrate") {
    const calibration = await runtime.metrics.runPocBalanceCalibrationStepV1({
      iteration: calibrationIteration,
      values: runtime.calibration.pocBalanceCalibrationValuesV1(),
      workerCount,
    });
    writeStdout(
      `PoC balance calibration ${new TextDecoder().decode(
        runtime.calibration.canonicalPocBalanceEvidenceBytesV1(calibration),
      )}\n`,
    );
    return calibration.selection.kind === "balance_contract_unsatisfied" ? 1 : 0;
  }

  const report = await buildPocBalanceFullReportV1(async () => runtime, workerCount);
  writeStdout(
    `PoC balance report ${new TextDecoder().decode(
      runtime.calibration.canonicalPocBalanceEvidenceBytesV1(report),
    )}\n`,
  );
  if (mode === "qualify") {
    assertPocProvisionalBalanceReportV1(report);
  } else {
    assertPocBalanceFullReportV1(report);
  }
  return 0;
}

async function runMainV1() {
  process.exitCode = await runPocBalanceCliV1({ args: process.argv.slice(2) });
}

if (!isMainThread) {
  await runBalanceShardWorkerV1();
} else if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runMainV1();
}
