// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJsonBytes } from "../../engine/packages/base/src/index.js";
import {
  admitPocBalanceFullReportV1,
  canonicalPocBalanceEvidenceBytesV1,
  type PocBalanceFullReportV1,
} from "../../game/stories/poc/src/testing/balance-calibration.js";
import { describe, expect, it, vi } from "vitest";

import {
  computeMaterializationDigestV1,
  computePackageClosureDigestV1,
  createMaterializationContractV1,
  serializeMaterializationContractV1,
} from "../preflight/materialization-contract.mjs";
import {
  balanceFreezeProtectedPathsV1,
  createBalanceFreezeGitEnvironmentV1,
  createNodeBalanceFreezePortsV1,
  expectedPocSaveFixturePathsV1,
  loadBalanceFreezeAdmissionV1,
  verifyBalanceFreezeV1,
  type BalanceFreezeAdmissionV1,
  type BalanceFreezeHistoryCommitV1,
  type BalanceFreezeNodeAdapterV1,
  type BalanceFreezePortsV1,
  type FinalBalanceSourceIdentityV1,
  type GitCommandResultV1,
} from "./verify-balance-freeze.mjs";

const encoderV1 = new TextEncoder();
const reportPrefixV1 = "PoC balance report ";
const finalCommitV1 = "a".repeat(40);
const stepCommitV1 = "b".repeat(40);
const headCommitV1 = "c".repeat(40);
const finalTreeV1 = "d".repeat(40);
const nodeArchiveSha256V1 =
  "sha256:9f619528f1db5ddc41dccf54211066fb42228d69a156733c69cb9d6cc92e358c";
const pnpmArchiveSha256V1 =
  "sha256:df4699e897012ab14df2cc6eaa942910e830eb7fcaa420a2a1421a9461fd9108";
const expectedSavePathsOracleV1 = Object.freeze([
  "game/stories/poc/src/test/fixtures/saves/save.auto-current-corrupt.json",
  "game/stories/poc/src/test/fixtures/saves/save.auto-opening.json",
  "game/stories/poc/src/test/fixtures/saves/save.auto-previous-valid.json",
  "game/stories/poc/src/test/fixtures/saves/save.digest-mismatch.json",
  "game/stories/poc/src/test/fixtures/saves/save.future-format.json",
  "game/stories/poc/src/test/fixtures/saves/save.manual-completed.json",
  "game/stories/poc/src/test/fixtures/saves/save.quick-world-action.json",
  "game/stories/poc/src/test/fixtures/saves/save.revision-mismatch.json",
]);
const protectedPathsOracleV1 = Object.freeze([
  "docs/poc/balance-v0.md",
  "game/stories/poc/src/content/balance.ts",
  "game/stories/poc/src/testing/balance-metrics.ts",
  "game/stories/poc/src/testing/balance-calibration.ts",
  "game/stories/poc/src/testing/counterfactual-scenarios.ts",
  "game/stories/poc/src/testing/compile-reference-strategy.ts",
  "game/stories/poc/src/testing/reference-strategy-definitions.ts",
  "game/stories/poc/src/testing/run-reference-strategy.ts",
  "game/stories/poc/src/test/balance-1000-seeds.test.ts",
  "game/stories/poc/src/test/daily-gates.test.ts",
  "game/stories/poc/src/test/ending-forecast.test.ts",
  "game/stories/poc/src/testing/save-fixture-provenance.ts",
  "game/stories/poc/src/test/fixtures/commands",
  "game/stories/poc/src/tooling-fixtures.ts",
  "game/stories/poc/package.json",
  "scripts/verify-poc-balance.mjs",
  "scripts/verify-poc-balance.test.mjs",
  "scripts/run-poc-balance-remote.mjs",
  "scripts/run-poc-balance-remote.test.mjs",
  "game/stories/poc/src/test/fixtures/golden",
  "game/stories/poc/src/test/fixtures/saves",
  "pnpm-lock.yaml",
]);

function digestBytesV1(bytes: Uint8Array): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function validReportV1(): PocBalanceFullReportV1 {
  return admitPocBalanceFullReportV1({
    deficit: 0,
    evaluation: {
      counterfactuals: {
        comfortableBedRecovery: true,
        fullDelegationColdStorageShelfLife: true,
        investigationColdStorageShelfLife: true,
      },
      metrics: {
        d4CashPressure: {
          cashFirstPaidCount: 1000,
          investigationFirstPaidCount: 1000,
          relationshipFirstPaidCount: 999,
        },
        firstSeed: 1,
        lastSeed: 1000,
        maximumStrictDominance: 0,
        strategies: {
          "strategy.cash_first": {
            arrearsCount: 0,
            dangerCount: 0,
            medianPaidAfterTaxCash: 137,
            paidCount: 1000,
            stableCount: 1000,
          },
          "strategy.explicit_failure": {
            arrearsCount: 1000,
            dangerCount: 0,
            medianPaidAfterTaxCash: null,
            paidCount: 0,
            stableCount: 0,
          },
          "strategy.full_delegation": {
            arrearsCount: 93,
            dangerCount: 674,
            medianPaidAfterTaxCash: 20,
            paidCount: 907,
            stableCount: 233,
          },
          "strategy.investigation_first": {
            arrearsCount: 0,
            dangerCount: 87,
            medianPaidAfterTaxCash: 61,
            paidCount: 1000,
            stableCount: 913,
          },
          "strategy.relationship_first": {
            arrearsCount: 0,
            dangerCount: 13,
            medianPaidAfterTaxCash: 50,
            paidCount: 1000,
            stableCount: 987,
          },
          "strategy.two_closures_recovery": {
            arrearsCount: 30,
            dangerCount: 239,
            medianPaidAfterTaxCash: 28,
            paidCount: 970,
            stableCount: 731,
          },
        },
        strictDominanceCountByStrategy: {
          "strategy.cash_first": 0,
          "strategy.explicit_failure": 0,
          "strategy.full_delegation": 0,
          "strategy.investigation_first": 0,
          "strategy.relationship_first": 0,
          "strategy.two_closures_recovery": 0,
        },
      },
    },
  });
}

function reportBytesV1(report: unknown): Uint8Array {
  return encoderV1.encode(
    `${reportPrefixV1}${new TextDecoder().decode(canonicalPocBalanceEvidenceBytesV1(report))}\n`,
  );
}

function sourceIdentityV1(): FinalBalanceSourceIdentityV1 {
  return {
    archiveSha256: `sha256:${"1".repeat(64)}`,
    materializationDigest: `sha256:${"2".repeat(64)}`,
    nodeVersion: "v26.5.0",
    packageClosureDigest: `sha256:${"3".repeat(64)}`,
    pnpmLockSha256: `sha256:${"4".repeat(64)}`,
    pnpmVersion: "11.11.0",
    sourceTree: finalTreeV1,
  };
}

function historyCommitV1(
  commit: string,
  trailers: Partial<Omit<BalanceFreezeHistoryCommitV1, "commit">> = {},
): BalanceFreezeHistoryCommitV1 {
  return {
    calibrationFinal: [],
    calibrationIndex: [],
    calibrationReportSha256: [],
    calibrationSteps: [],
    commit,
    ...trailers,
  };
}

function attestationValueV1(
  reportBytes: Uint8Array,
  source: FinalBalanceSourceIdentityV1,
  report: PocBalanceFullReportV1,
): Record<string, unknown> {
  return {
    arch: "x64",
    availableParallelism: 64,
    contractId: "project-tavern.poc-balance-remote-strict-execution.v1",
    evaluationSha256: digestBytesV1(canonicalPocBalanceEvidenceBytesV1(report.evaluation)),
    firstSeed: 1,
    lastSeed: 1000,
    materializationDigest: source.materializationDigest,
    nodeArchiveSha256: nodeArchiveSha256V1,
    nodeVersion: source.nodeVersion,
    packageClosureDigest: source.packageClosureDigest,
    platform: "linux",
    pnpmArchiveSha256: pnpmArchiveSha256V1,
    pnpmLockSha256: source.pnpmLockSha256,
    pnpmVersion: source.pnpmVersion,
    reportSha256: digestBytesV1(reportBytes),
    schemaRevision: 1,
    seedCount: 1000,
    sourceArchiveSha256: source.archiveSha256,
    sourceCommit: finalCommitV1,
    sourceTree: source.sourceTree,
    workerCount: 64,
  };
}

function attestationBytesV1(value: unknown): Uint8Array {
  return canonicalPocBalanceEvidenceBytesV1(value);
}

interface FixtureOverridesV1 {
  readonly admission?: BalanceFreezeAdmissionV1;
  readonly attestationA?: Uint8Array;
  readonly attestationB?: Uint8Array;
  readonly evidenceReadFailure?: string;
  readonly finalSavePaths?: readonly string[];
  readonly headSavePaths?: readonly string[];
  readonly history?: readonly BalanceFreezeHistoryCommitV1[];
  readonly isAncestor?: boolean;
  readonly protectedChanges?: readonly string[];
  readonly reportA?: Uint8Array;
  readonly reportB?: Uint8Array;
  readonly source?: FinalBalanceSourceIdentityV1;
  readonly staleSavePath?: string;
}

function fixtureV1(overrides: FixtureOverridesV1 = {}): {
  readonly ports: BalanceFreezePortsV1;
  readonly report: PocBalanceFullReportV1;
  readonly source: FinalBalanceSourceIdentityV1;
} {
  const report = validReportV1();
  const reportBytes = reportBytesV1(report);
  const source = overrides.source ?? sourceIdentityV1();
  const attestationBytes = attestationBytesV1(attestationValueV1(reportBytes, source, report));
  const evidence = new Map<string, Uint8Array>([
    ["final-a.report.txt", overrides.reportA ?? reportBytes],
    ["final-b.report.txt", overrides.reportB ?? reportBytes],
    ["final-a.attestation.json", overrides.attestationA ?? attestationBytes],
    ["final-b.attestation.json", overrides.attestationB ?? attestationBytes],
  ]);
  const reportDigest = digestBytesV1(reportBytes);
  const history = overrides.history ?? [
    historyCommitV1(stepCommitV1, { calibrationIndex: ["1"] }),
    historyCommitV1(finalCommitV1, {
      calibrationFinal: ["true"],
      calibrationReportSha256: [reportDigest],
      calibrationSteps: ["1"],
    }),
    historyCommitV1(headCommitV1),
  ];
  const finalSavePaths = overrides.finalSavePaths ?? expectedSavePathsOracleV1;
  const headSavePaths = overrides.headSavePaths ?? expectedSavePathsOracleV1;
  const admission =
    overrides.admission ??
    ({
      admitFullReport: admitPocBalanceFullReportV1,
      encodeEvidence: canonicalPocBalanceEvidenceBytesV1,
      frozenSaveProvenanceBytes: canonicalJsonBytes({ complete: "reviewed" }),
      liveSaveProvenanceBytes: canonicalJsonBytes({ complete: "reviewed" }),
    } satisfies BalanceFreezeAdmissionV1);

  const ports: BalanceFreezePortsV1 = {
    digestBytes: digestBytesV1,
    inspectFinalSource: vi.fn(async () => source),
    isAncestor: vi.fn(async () => overrides.isAncestor ?? true),
    listFirstParentHistory: vi.fn(async () => ({ head: headCommitV1, history })),
    listProtectedChanges: vi.fn(async () => overrides.protectedChanges ?? []),
    listTreePaths: vi.fn(async (commit) =>
      commit === finalCommitV1 ? finalSavePaths : headSavePaths,
    ),
    loadAdmission: vi.fn(async () => admission),
    readBlob: vi.fn(async (commit, path) =>
      encoderV1.encode(
        commit === headCommitV1 && path === overrides.staleSavePath
          ? `stale:${path}`
          : `final:${path}`,
      ),
    ),
    readEvidenceFile: vi.fn(async (path) => {
      const name = path.split("/").at(-1) ?? "";
      if (name === overrides.evidenceReadFailure) throw new Error("ENOENT");
      const bytes = evidence.get(name);
      if (bytes === undefined) throw new Error(`missing fixture evidence ${name}`);
      return bytes;
    }),
    repositoryRoot: "/repo",
  };
  return { ports, report, source };
}

function changedReportV1(transform: (report: PocBalanceFullReportV1) => unknown): Uint8Array {
  return reportBytesV1(transform(validReportV1()));
}

function errorCodeV1(code: string): (error: unknown) => boolean {
  return (error) => {
    expect(error).toMatchObject({ code });
    return true;
  };
}

function commandResultV1(stdout = "", status = 0): GitCommandResultV1 {
  return Object.freeze({
    status,
    stderr: new Uint8Array(),
    stdout: encoderV1.encode(stdout),
  });
}

async function resolveRuntimeImportV1(importer: URL, specifier: string): Promise<URL | undefined> {
  if (!specifier.startsWith(".") || /\.(?:css|json|svg)$/u.test(specifier)) return undefined;
  const exact = new URL(specifier, importer);
  const candidates = [
    exact,
    ...(exact.pathname.endsWith(".mjs")
      ? [new URL(`${exact.href.slice(0, -4)}.mts`)]
      : exact.pathname.endsWith(".js")
        ? [new URL(`${exact.href.slice(0, -3)}.ts`), new URL(`${exact.href.slice(0, -3)}.tsx`)]
        : []),
  ];
  for (const candidate of candidates) {
    try {
      await readFile(candidate);
      return candidate;
    } catch {
      // Try the next source extension used by the Node strip-types closure.
    }
  }
  throw new Error(`unresolved relative runtime import ${specifier} from ${importer.href}`);
}

function runtimeImportSpecifiersV1(source: string): readonly string[] {
  const specifiers: string[] = [];
  const staticImports = /(?:^|\n)\s*import\s+(?!type\b|\()([\s\S]*?);/gu;
  for (const match of source.matchAll(staticImports)) {
    const statement = match[1] ?? "";
    const from = /\bfrom\s+["']([^"']+)["']\s*$/u.exec(statement);
    const sideEffect = /^["']([^"']+)["']\s*$/u.exec(statement);
    const specifier = from?.[1] ?? sideEffect?.[1];
    if (specifier !== undefined) specifiers.push(specifier);
  }
  for (const match of source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/gu)) {
    if (match[1] !== undefined) specifiers.push(match[1]);
  }
  for (const match of source.matchAll(
    /\bnew\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/gu,
  )) {
    if (match[1] !== undefined) specifiers.push(match[1]);
  }
  for (const match of source.matchAll(/(?:^|\n)\s*export\s+([\s\S]*?);/gu)) {
    const statement = match[1] ?? "";
    if (statement.startsWith("type ")) continue;
    const named = /^\{([\s\S]*?)\}\s+from\s+/u.exec(statement);
    if (
      named !== null &&
      (named[1] ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .every((entry) => entry.startsWith("type "))
    ) {
      continue;
    }
    const from = /\bfrom\s+["']([^"']+)["']\s*$/u.exec(statement);
    if (from?.[1] !== undefined) specifiers.push(from[1]);
  }
  return Object.freeze(specifiers);
}

async function collectRuntimeImportClosureV1(entry: URL): Promise<ReadonlySet<string>> {
  const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
  const visited = new Set<string>();
  const pending = [entry];
  while (pending.length > 0) {
    const sourceUrl = pending.pop();
    if (sourceUrl === undefined) continue;
    const path = fileURLToPath(sourceUrl);
    if (visited.has(path)) continue;
    visited.add(path);
    const source = await readFile(sourceUrl, "utf8");
    for (const specifier of runtimeImportSpecifiersV1(source)) {
      const resolved = await resolveRuntimeImportV1(sourceUrl, specifier);
      if (resolved !== undefined) pending.push(resolved);
    }
  }
  return new Set([...visited].map((path) => relative(repositoryRoot, path).replaceAll("\\", "/")));
}

const syntheticLockV1 = `lockfileVersion: '9.0'
settings:
  autoInstallPeers: true
importers:
  .:
    dependencies:
      alpha:
        specifier: 1.0.0
        version: 1.0.0
packages:
  alpha@1.0.0:
    resolution:
      integrity: sha512-alpha
snapshots:
  alpha@1.0.0: {}
`;

describe("verifyBalanceFreezeV1", () => {
  it("admits the frozen A/B evidence and binds the final source and Save bytes", async () => {
    const { ports } = fixtureV1();

    await expect(verifyBalanceFreezeV1({ evidenceRoot: "/evidence", ports })).resolves.toEqual({
      finalCommit: finalCommitV1,
      reportSha256: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
      sourceArchiveSha256: `sha256:${"1".repeat(64)}`,
      sourceTree: finalTreeV1,
      steps: 1,
    });
    expect(ports.readEvidenceFile).toHaveBeenCalledTimes(4);
    expect(ports.listProtectedChanges).toHaveBeenCalledWith(finalCommitV1, headCommitV1);
    expect(ports.readBlob).toHaveBeenCalledTimes(expectedSavePathsOracleV1.length * 2);
  });

  it.each([
    "final-a.report.txt",
    "final-b.report.txt",
    "final-a.attestation.json",
    "final-b.attestation.json",
  ])("reports stable missing-evidence authority for %s", async (name) => {
    const { ports } = fixtureV1({ evidenceReadFailure: name });

    await expect(verifyBalanceFreezeV1({ evidenceRoot: "/evidence", ports })).rejects.toSatisfy(
      errorCodeV1("external_precondition.balance_freeze_evidence_missing"),
    );
  });

  it.each([
    {
      label: "report",
      patch: { reportB: encoderV1.encode("different report\n") },
    },
    {
      label: "attestation",
      patch: { attestationB: encoderV1.encode("different attestation") },
    },
  ] as const)("rejects unequal A/B $label bytes before admission", async ({ patch }) => {
    const { ports } = fixtureV1(patch);

    await expect(verifyBalanceFreezeV1({ evidenceRoot: "/evidence", ports })).rejects.toSatisfy(
      errorCodeV1("balance_freeze.evidence_pair_mismatch"),
    );
  });

  it.each([
    {
      label: "malformed report framing",
      patch: { reportA: encoderV1.encode("{}\n"), reportB: encoderV1.encode("{}\n") },
      code: "balance_freeze.report_invalid",
    },
    {
      label: "noncanonical report payload",
      patch: {
        reportA: encoderV1.encode(
          `PoC balance report ${JSON.stringify(validReportV1(), null, 2)}\n`,
        ),
        reportB: encoderV1.encode(
          `PoC balance report ${JSON.stringify(validReportV1(), null, 2)}\n`,
        ),
      },
      code: "balance_freeze.report_invalid",
    },
    {
      label: "malformed attestation",
      patch: {
        attestationA: encoderV1.encode("not-json"),
        attestationB: encoderV1.encode("not-json"),
      },
      code: "balance_freeze.attestation_invalid",
    },
  ] as const)("rejects $label", async ({ code, patch }) => {
    const { ports } = fixtureV1(patch);

    await expect(verifyBalanceFreezeV1({ evidenceRoot: "/evidence", ports })).rejects.toSatisfy(
      errorCodeV1(code),
    );
  });

  it("rejects an admitted nonzero deficit", async () => {
    const nonzeroBytes = changedReportV1((report) => ({
      ...report,
      deficit: 1,
      evaluation: {
        ...report.evaluation,
        metrics: {
          ...report.evaluation.metrics,
          strategies: {
            ...report.evaluation.metrics.strategies,
            "strategy.cash_first": {
              ...report.evaluation.metrics.strategies["strategy.cash_first"],
              arrearsCount: 101,
              paidCount: 899,
              stableCount: 899,
            },
          },
        },
      },
    }));
    const { ports } = fixtureV1({ reportA: nonzeroBytes, reportB: nonzeroBytes });

    await expect(verifyBalanceFreezeV1({ evidenceRoot: "/evidence", ports })).rejects.toSatisfy(
      errorCodeV1("balance_freeze.report_not_passing"),
    );
  });

  it("rejects a claimed deficit that differs from the admitted evaluation", async () => {
    const mismatchedBytes = changedReportV1((report) => ({ ...report, deficit: 1 }));
    const { ports } = fixtureV1({ reportA: mismatchedBytes, reportB: mismatchedBytes });

    await expect(verifyBalanceFreezeV1({ evidenceRoot: "/evidence", ports })).rejects.toSatisfy(
      errorCodeV1("balance_freeze.report_invalid"),
    );
  });

  it("hashes the complete report prefix and LF bytes for the final trailer", async () => {
    const fixture = fixtureV1();
    const reportDigest = digestBytesV1(reportBytesV1(fixture.report));
    const payloadDigest = digestBytesV1(canonicalPocBalanceEvidenceBytesV1(fixture.report));
    const history = [
      historyCommitV1(stepCommitV1, { calibrationIndex: ["1"] }),
      historyCommitV1(finalCommitV1, {
        calibrationFinal: ["true"],
        calibrationReportSha256: [payloadDigest],
        calibrationSteps: ["1"],
      }),
      historyCommitV1(headCommitV1),
    ];
    expect(payloadDigest).not.toBe(reportDigest);

    await expect(
      verifyBalanceFreezeV1({
        evidenceRoot: "/evidence",
        ports: fixtureV1({ history }).ports,
      }),
    ).rejects.toSatisfy(errorCodeV1("balance_freeze.report_trailer_mismatch"));
  });

  it.each([
    ["sourceCommit", "e".repeat(40)],
    ["sourceTree", "e".repeat(40)],
    ["sourceArchiveSha256", `sha256:${"e".repeat(64)}`],
    ["pnpmLockSha256", `sha256:${"e".repeat(64)}`],
    ["materializationDigest", `sha256:${"e".repeat(64)}`],
    ["packageClosureDigest", `sha256:${"e".repeat(64)}`],
    ["nodeVersion", "v26.5.1"],
    ["nodeArchiveSha256", `sha256:${"e".repeat(64)}`],
    ["pnpmVersion", "11.11.1"],
    ["pnpmArchiveSha256", `sha256:${"e".repeat(64)}`],
    ["availableParallelism", 65],
    ["workerCount", 63],
    ["firstSeed", 2],
    ["lastSeed", 999],
    ["seedCount", 999],
  ] as const)("rejects attested %s identity drift", async (field, value) => {
    const report = validReportV1();
    const reportBytes = reportBytesV1(report);
    const source = sourceIdentityV1();
    const attestation = { ...attestationValueV1(reportBytes, source, report), [field]: value };
    const bytes = attestationBytesV1(attestation);
    const { ports } = fixtureV1({ attestationA: bytes, attestationB: bytes });

    await expect(verifyBalanceFreezeV1({ evidenceRoot: "/evidence", ports })).rejects.toSatisfy(
      errorCodeV1("balance_freeze.attestation_identity_mismatch"),
    );
  });

  it("rejects an attestation with missing or additional fields", async () => {
    const report = validReportV1();
    const reportBytes = reportBytesV1(report);
    const source = sourceIdentityV1();
    const { workerCount: _removed, ...incomplete } = attestationValueV1(
      reportBytes,
      source,
      report,
    );
    const bytes = attestationBytesV1({ ...incomplete, extra: true });
    const { ports } = fixtureV1({ attestationA: bytes, attestationB: bytes });

    await expect(verifyBalanceFreezeV1({ evidenceRoot: "/evidence", ports })).rejects.toSatisfy(
      errorCodeV1("balance_freeze.attestation_invalid"),
    );
  });

  it("hashes the admitted evaluation canonical bytes", async () => {
    const report = validReportV1();
    const reportBytes = reportBytesV1(report);
    const source = sourceIdentityV1();
    const attestation = {
      ...attestationValueV1(reportBytes, source, report),
      evaluationSha256: digestBytesV1(canonicalPocBalanceEvidenceBytesV1(report)),
    };
    const bytes = attestationBytesV1(attestation);
    const { ports } = fixtureV1({ attestationA: bytes, attestationB: bytes });

    await expect(verifyBalanceFreezeV1({ evidenceRoot: "/evidence", ports })).rejects.toSatisfy(
      errorCodeV1("balance_freeze.attestation_identity_mismatch"),
    );
  });

  it("requires the final commit to remain on the live first-parent ancestry", async () => {
    const { ports } = fixtureV1({ isAncestor: false });

    await expect(verifyBalanceFreezeV1({ evidenceRoot: "/evidence", ports })).rejects.toSatisfy(
      errorCodeV1("balance_freeze.final_history_invalid"),
    );
  });

  it("rejects duplicate finals and a discontinuous calibration-step count", async () => {
    const reportDigest = digestBytesV1(reportBytesV1(validReportV1()));
    const duplicateFinal = historyCommitV1("e".repeat(40), {
      calibrationFinal: ["true"],
      calibrationReportSha256: [reportDigest],
      calibrationSteps: ["1"],
    });
    const { ports } = fixtureV1({
      history: [
        historyCommitV1(stepCommitV1, { calibrationIndex: ["2"] }),
        duplicateFinal,
        historyCommitV1(finalCommitV1, {
          calibrationFinal: ["true"],
          calibrationReportSha256: [reportDigest],
          calibrationSteps: ["1"],
        }),
        historyCommitV1(headCommitV1),
      ],
    });

    await expect(verifyBalanceFreezeV1({ evidenceRoot: "/evidence", ports })).rejects.toSatisfy(
      errorCodeV1("balance_freeze.final_history_invalid"),
    );
  });

  it("rejects every later first-parent commit that touches a protected path", async () => {
    const { ports } = fixtureV1({
      protectedChanges: [
        `${headCommitV1}:game/stories/poc/src/test/fixtures/saves/save.auto-opening.json`,
      ],
    });

    await expect(verifyBalanceFreezeV1({ evidenceRoot: "/evidence", ports })).rejects.toSatisfy(
      errorCodeV1("balance_freeze.protected_path_changed"),
    );
  });

  it("compares the complete live Save provenance rather than blocking fields only", async () => {
    const admission: BalanceFreezeAdmissionV1 = {
      admitFullReport: admitPocBalanceFullReportV1,
      encodeEvidence: canonicalPocBalanceEvidenceBytesV1,
      frozenSaveProvenanceBytes: canonicalJsonBytes({
        blocking: { simulationDigest: `sha256:${"1".repeat(64)}` },
        captures: { savedAt: "reviewed" },
        diagnosticAtGeneration: { storyDigest: `sha256:${"2".repeat(64)}` },
      }),
      liveSaveProvenanceBytes: canonicalJsonBytes({
        blocking: { simulationDigest: `sha256:${"1".repeat(64)}` },
        captures: { savedAt: "reviewed" },
        diagnosticAtGeneration: { storyDigest: `sha256:${"3".repeat(64)}` },
      }),
    };
    const { ports } = fixtureV1({ admission });

    await expect(verifyBalanceFreezeV1({ evidenceRoot: "/evidence", ports })).rejects.toSatisfy(
      errorCodeV1("balance_freeze.save_provenance_mismatch"),
    );
  });

  it.each([
    {
      label: "missing final Save",
      patch: { finalSavePaths: expectedSavePathsOracleV1.slice(1) },
    },
    {
      label: "extra current Save",
      patch: { headSavePaths: [...expectedSavePathsOracleV1, "save.unreviewed.json"] },
    },
  ] as const)("rejects $label inventory", async ({ patch }) => {
    const { ports } = fixtureV1(patch);

    await expect(verifyBalanceFreezeV1({ evidenceRoot: "/evidence", ports })).rejects.toSatisfy(
      errorCodeV1("balance_freeze.save_inventory_mismatch"),
    );
  });

  it("requires every current tracked Save blob to equal the reviewed final blob", async () => {
    const staleSavePath = expectedSavePathsOracleV1[0]!;
    const { ports } = fixtureV1({ staleSavePath });

    await expect(verifyBalanceFreezeV1({ evidenceRoot: "/evidence", ports })).rejects.toSatisfy(
      errorCodeV1("balance_freeze.save_bytes_mismatch"),
    );
  });

  it("freezes independent exact Save and protected-path inventories", () => {
    expect(expectedPocSaveFixturePathsV1).toEqual(expectedSavePathsOracleV1);
    expect(balanceFreezeProtectedPathsV1).toEqual(protectedPathsOracleV1);
  });

  it("constructs a closed Git environment from adversarial inherited variables", () => {
    const inherited: NodeJS.ProcessEnv = {
      BASH_ENV: "/attacker/bash-env",
      DYLD_INSERT_LIBRARIES: "/attacker/inject.dylib",
      GIT_ALTERNATE_OBJECT_DIRECTORIES: "/attacker/objects",
      GIT_ATTR_NOSYSTEM: "0",
      GIT_COMMON_DIR: "/attacker/common",
      GIT_CONFIG: "/attacker/config",
      GIT_CONFIG_COUNT: "2",
      GIT_CONFIG_GLOBAL: "/attacker/global",
      GIT_CONFIG_KEY_0: "core.attributesFile",
      GIT_CONFIG_KEY_1: "core.hooksPath",
      GIT_CONFIG_NOSYSTEM: "0",
      GIT_CONFIG_PARAMETERS: "'core.attributesFile'='/attacker/attributes'",
      GIT_CONFIG_SYSTEM: "/attacker/system",
      GIT_CONFIG_VALUE_0: "/attacker/attributes",
      GIT_CONFIG_VALUE_1: "/attacker/hooks",
      GIT_DIR: "/attacker/repository",
      GIT_EXEC_PATH: "/attacker/git-core",
      GIT_INDEX_FILE: "/attacker/index",
      GIT_NAMESPACE: "attacker",
      GIT_NO_LAZY_FETCH: "0",
      GIT_NO_REPLACE_OBJECTS: "0",
      GIT_OBJECT_DIRECTORY: "/attacker/object-directory",
      GIT_OPTIONAL_LOCKS: "1",
      GIT_REPLACE_REF_BASE: "refs/attacker/replace/",
      GIT_SHALLOW_FILE: "/attacker/shallow",
      GIT_WORK_TREE: "/attacker/worktree",
      HOME: "/attacker/home",
      LANG: "malicious-locale",
      LC_ALL: "malicious-locale",
      LD_PRELOAD: "/attacker/preload.so",
      NODE_OPTIONS: "--require=/attacker/node-hook.cjs",
      PATH: "/safe/bin:/usr/bin:/bin",
      TMPDIR: "/safe/tmp",
      XDG_CONFIG_HOME: "/attacker/xdg",
    };

    expect(createBalanceFreezeGitEnvironmentV1(inherited)).toEqual({
      GIT_ATTR_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_SYSTEM: "/dev/null",
      GIT_NO_LAZY_FETCH: "1",
      GIT_NO_REPLACE_OBJECTS: "1",
      GIT_OPTIONAL_LOCKS: "0",
      HOME: "/dev/null",
      LANG: "C",
      LC_ALL: "C",
      PATH: "/safe/bin:/usr/bin:/bin",
      TMPDIR: "/safe/tmp",
      TZ: "UTC",
      XDG_CONFIG_HOME: "/dev/null",
    });
    expect(inherited.GIT_CONFIG_COUNT).toBe("2");
  });

  it("recomputes final source identity from exact final blobs and raw archive argv", async () => {
    const contract = createMaterializationContractV1(syntheticLockV1);
    const contractBytes = serializeMaterializationContractV1(contract);
    const archiveSha256 = `sha256:${"5".repeat(64)}` as const;
    const runGit = vi.fn(async (args: readonly string[]): Promise<GitCommandResultV1> => {
      const command = args.join(" ");
      if (command === `rev-parse ${finalCommitV1}^{tree}`) {
        return commandResultV1(`${finalTreeV1}\n`);
      }
      if (command === `show ${finalCommitV1}:pnpm-lock.yaml`) {
        return commandResultV1(syntheticLockV1);
      }
      if (command === `show ${finalCommitV1}:scripts/preflight/materialization-lock.json`) {
        return { ...commandResultV1(), stdout: contractBytes };
      }
      if (command === `show ${finalCommitV1}:.node-version`) {
        return commandResultV1("26.5.0\n");
      }
      if (command === `show ${finalCommitV1}:package.json`) {
        return commandResultV1('{"packageManager":"pnpm@11.11.0"}\n');
      }
      throw new Error(`unexpected git command ${command}`);
    });
    const hashGitArchive = vi.fn(async () => archiveSha256);
    const adapter: BalanceFreezeNodeAdapterV1 = {
      hashGitArchive,
      loadAdmission: async () => fixtureV1().ports.loadAdmission(),
      readFile: async () => new Uint8Array(),
      runGit,
    };
    const ports = createNodeBalanceFreezePortsV1("/repo", adapter);

    await expect(ports.inspectFinalSource(finalCommitV1)).resolves.toEqual({
      archiveSha256,
      materializationDigest: computeMaterializationDigestV1(contract),
      nodeVersion: "v26.5.0",
      packageClosureDigest: computePackageClosureDigestV1(contract.externalPackages),
      pnpmLockSha256: digestBytesV1(encoderV1.encode(syntheticLockV1)),
      pnpmVersion: "11.11.0",
      sourceTree: finalTreeV1,
    });
    expect(hashGitArchive).toHaveBeenCalledWith(["archive", "--format=tar", finalCommitV1]);
  });

  it("audits every later first-parent commit with the complete independent protected union", async () => {
    const laterA = "e".repeat(40);
    const laterB = "f".repeat(40);
    const runGit = vi.fn(async (args: readonly string[]): Promise<GitCommandResultV1> => {
      if (args[0] === "rev-list") return commandResultV1(`${laterA}\n${laterB}\n`);
      if (args[0] === "diff") return commandResultV1();
      throw new Error(`unexpected git command ${args.join(" ")}`);
    });
    const adapter: BalanceFreezeNodeAdapterV1 = {
      hashGitArchive: async () => `sha256:${"0".repeat(64)}`,
      loadAdmission: async () => fixtureV1().ports.loadAdmission(),
      readFile: async () => new Uint8Array(),
      runGit,
    };
    const ports = createNodeBalanceFreezePortsV1("/repo", adapter);

    await expect(ports.listProtectedChanges(finalCommitV1, headCommitV1)).resolves.toEqual([]);
    const diffCalls = runGit.mock.calls.map(([args]) => args).filter((args) => args[0] === "diff");
    expect(diffCalls).toHaveLength(2);
    expect(diffCalls.map((args) => args.slice(2, 5))).toEqual([
      [`${laterA}^1`, laterA, "--"],
      [`${laterB}^1`, laterB, "--"],
    ]);
    for (const args of diffCalls) expect(args.slice(5)).toEqual(protectedPathsOracleV1);
  });

  it("loads and compares the complete live resolved Save provenance", async () => {
    const admission = await loadBalanceFreezeAdmissionV1();
    const source = await readFile(new URL("./verify-balance-freeze.mts", import.meta.url), "utf8");

    expect(admission.liveSaveProvenanceBytes).toEqual(admission.frozenSaveProvenanceBytes);
    expect(source).toContain("resolveStoryForTestV1");
    expect(source).toContain("pocStoryEntryV1");
    expect(source).toContain("projectPocSaveFixtureProvenanceV1");
    expect(source).not.toContain("isPocSaveFixtureProvenanceCurrentV1");
  });

  it("keeps the recursive runtime import closure admission-only", async () => {
    const closure = await collectRuntimeImportClosureV1(
      new URL("./verify-balance-freeze.mts", import.meta.url),
    );
    const source = await readFile(new URL("./verify-balance-freeze.mts", import.meta.url), "utf8");

    expect(closure).toContain("game/stories/poc/src/testing/balance-calibration.ts");
    expect(closure).toContain("game/stories/poc/src/testing/save-fixture-provenance.ts");
    expect(closure).not.toContain("game/stories/poc/src/testing/balance-metrics.ts");
    expect(closure).not.toContain("game/stories/poc/src/testing/counterfactual-scenarios.ts");
    expect(closure).not.toContain("game/stories/poc/src/testing/compile-reference-strategy.ts");
    expect(closure).not.toContain("game/stories/poc/src/testing/run-reference-strategy.ts");
    expect(closure).not.toContain("game/stories/poc/src/testing/save-fixture-builder.ts");
    expect(closure).not.toContain("scripts/verify-poc-balance.mjs");
    expect(closure).not.toContain("scripts/run-poc-balance-remote.mjs");
    expect(source).not.toMatch(
      /\b(?:evaluatePocBalance|selectPocBalance|runPocBalanceRemote|writePocSaveFixtures|updatePocGolden)\w*\s*\(/u,
    );
  });
});
