// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type DigestV1 = `sha256:${string}`;

export type BalanceFreezeVerificationErrorCodeV1 =
  | "external_precondition.balance_freeze_evidence_missing"
  | "balance_freeze.attestation_identity_mismatch"
  | "balance_freeze.attestation_invalid"
  | "balance_freeze.evidence_pair_mismatch"
  | "balance_freeze.final_history_invalid"
  | "balance_freeze.protected_path_changed"
  | "balance_freeze.report_invalid"
  | "balance_freeze.report_not_passing"
  | "balance_freeze.report_trailer_mismatch"
  | "balance_freeze.save_bytes_mismatch"
  | "balance_freeze.save_inventory_mismatch"
  | "balance_freeze.save_provenance_mismatch"
  | "balance_freeze.source_identity_invalid";

export class BalanceFreezeVerificationError extends Error {
  readonly name = "BalanceFreezeVerificationError";
  readonly code: BalanceFreezeVerificationErrorCodeV1;

  constructor(code: BalanceFreezeVerificationErrorCodeV1, detail: string) {
    super(`${code}: ${detail}`);
    this.code = code;
  }
}

export interface BalanceFreezeHistoryCommitV1 {
  readonly calibrationFinal: readonly string[];
  readonly calibrationIndex: readonly string[];
  readonly calibrationReportSha256: readonly string[];
  readonly calibrationSteps: readonly string[];
  readonly commit: string;
}

export interface FinalBalanceSourceIdentityV1 {
  readonly archiveSha256: DigestV1;
  readonly materializationDigest: DigestV1;
  readonly nodeVersion: string;
  readonly packageClosureDigest: DigestV1;
  readonly pnpmLockSha256: DigestV1;
  readonly pnpmVersion: string;
  readonly sourceTree: string;
}

export interface BalanceFreezeAdmissionV1 {
  readonly admitFullReport: (value: unknown) => unknown;
  readonly encodeEvidence: (value: unknown) => Uint8Array;
  readonly frozenSaveProvenanceBytes: Uint8Array;
  readonly liveSaveProvenanceBytes: Uint8Array;
}

export interface BalanceFreezePortsV1 {
  readonly repositoryRoot: string;
  readonly digestBytes: (bytes: Uint8Array) => DigestV1;
  readonly inspectFinalSource: (commit: string) => Promise<FinalBalanceSourceIdentityV1>;
  readonly isAncestor: (ancestor: string, descendant: string) => Promise<boolean>;
  readonly listFirstParentHistory: () => Promise<{
    readonly head: string;
    readonly history: readonly BalanceFreezeHistoryCommitV1[];
  }>;
  readonly listProtectedChanges: (
    finalCommit: string,
    headCommit: string,
  ) => Promise<readonly string[]>;
  readonly listTreePaths: (commit: string) => Promise<readonly string[]>;
  readonly loadAdmission: () => Promise<BalanceFreezeAdmissionV1>;
  readonly readBlob: (commit: string, path: string) => Promise<Uint8Array>;
  readonly readEvidenceFile: (path: string) => Promise<Uint8Array>;
}

export interface VerifyBalanceFreezeOptionsV1 {
  readonly evidenceRoot?: string;
  readonly ports?: BalanceFreezePortsV1;
}

export interface BalanceFreezeVerificationResultV1 {
  readonly finalCommit: string;
  readonly reportSha256: DigestV1;
  readonly sourceArchiveSha256: DigestV1;
  readonly sourceTree: string;
  readonly steps: number;
}

const repositoryRootV1 = resolve(import.meta.dirname, "../..");
const reportPrefixV1 = "PoC balance report ";
const digestPatternV1 = /^sha256:[0-9a-f]{64}$/u;
const objectIdPatternV1 = /^[0-9a-f]{40}$/u;
const exactNodeVersionV1 = "v26.5.0";
const exactPnpmVersionV1 = "11.11.0";
const exactNodeArchiveSha256V1 =
  "sha256:9f619528f1db5ddc41dccf54211066fb42228d69a156733c69cb9d6cc92e358c";
const exactPnpmArchiveSha256V1 =
  "sha256:df4699e897012ab14df2cc6eaa942910e830eb7fcaa420a2a1421a9461fd9108";
const strictAttestationContractIdV1 = "project-tavern.poc-balance-remote-strict-execution.v1";
const saveFixtureDirectoryV1 = "game/stories/poc/src/test/fixtures/saves";
export const balanceFreezeProtectedPathsV1 = Object.freeze([
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
  saveFixtureDirectoryV1,
  "pnpm-lock.yaml",
]);
export const expectedPocSaveFixturePathsV1 = Object.freeze(
  [
    "save.auto-current-corrupt.json",
    "save.auto-opening.json",
    "save.auto-previous-valid.json",
    "save.digest-mismatch.json",
    "save.future-format.json",
    "save.manual-completed.json",
    "save.quick-world-action.json",
    "save.revision-mismatch.json",
  ].map((name) => `${saveFixtureDirectoryV1}/${name}`),
);
const attestationFieldsV1 = Object.freeze([
  "schemaRevision",
  "contractId",
  "sourceCommit",
  "sourceTree",
  "sourceArchiveSha256",
  "pnpmLockSha256",
  "materializationDigest",
  "packageClosureDigest",
  "nodeVersion",
  "nodeArchiveSha256",
  "pnpmVersion",
  "pnpmArchiveSha256",
  "platform",
  "arch",
  "availableParallelism",
  "workerCount",
  "firstSeed",
  "lastSeed",
  "seedCount",
  "evaluationSha256",
  "reportSha256",
] as const);
const decoderV1 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const encoderV1 = new TextEncoder();
const commandOutputLimitV1 = 32 * 1024 * 1024;

function failV1(code: BalanceFreezeVerificationErrorCodeV1, detail: string): never {
  throw new BalanceFreezeVerificationError(code, detail);
}

function detailFromV1(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function equalBytesV1(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.byteLength === right.byteLength && left.every((value, index) => value === right[index])
  );
}

function decodeUtf8V1(bytes: Uint8Array, label: string): string {
  try {
    return decoderV1.decode(bytes);
  } catch {
    throw new TypeError(`${label} is not UTF-8`);
  }
}

function exactRecordV1(
  value: unknown,
  expectedFields: readonly string[],
  label: string,
): Readonly<Record<string, unknown>> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new TypeError(`${label} must be a plain data object`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Object.keys(descriptors).toSorted();
  const expected = [...expectedFields].toSorted();
  if (
    actual.length !== expected.length ||
    actual.some((field, index) => field !== expected[index]) ||
    Object.values(descriptors).some(
      (descriptor) =>
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true,
    )
  ) {
    throw new TypeError(`${label} has unexpected or hidden fields`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function parseDigestV1(value: unknown, label: string): DigestV1 {
  if (typeof value !== "string" || !digestPatternV1.test(value)) {
    throw new TypeError(`${label} must be a lowercase SHA-256 digest`);
  }
  return value as DigestV1;
}

function parseObjectIdV1(value: unknown, label: string): string {
  if (typeof value !== "string" || !objectIdPatternV1.test(value)) {
    throw new TypeError(`${label} must be a lowercase Git object ID`);
  }
  return value;
}

function parsePositiveSafeIntegerV1(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new TypeError(`${label} must be a PositiveSafeInteger`);
  }
  return value as number;
}

interface ParsedStrictAttestationV1 {
  readonly arch: string;
  readonly availableParallelism: number;
  readonly contractId: string;
  readonly evaluationSha256: DigestV1;
  readonly firstSeed: number;
  readonly lastSeed: number;
  readonly materializationDigest: DigestV1;
  readonly nodeArchiveSha256: DigestV1;
  readonly nodeVersion: string;
  readonly packageClosureDigest: DigestV1;
  readonly platform: string;
  readonly pnpmArchiveSha256: DigestV1;
  readonly pnpmLockSha256: DigestV1;
  readonly pnpmVersion: string;
  readonly reportSha256: DigestV1;
  readonly schemaRevision: number;
  readonly seedCount: number;
  readonly sourceArchiveSha256: DigestV1;
  readonly sourceCommit: string;
  readonly sourceTree: string;
  readonly workerCount: number;
}

function parseStrictAttestationV1(
  bytes: Uint8Array,
  encodeEvidence: (value: unknown) => Uint8Array,
): ParsedStrictAttestationV1 {
  try {
    const text = decodeUtf8V1(bytes, "strict attestation");
    if (
      text.length === 0 ||
      text.includes("\r") ||
      text.includes("\n") ||
      text.charCodeAt(0) === 0xfeff
    ) {
      throw new TypeError("strict attestation must be one canonical JSON value without LF");
    }
    const parsed: unknown = JSON.parse(text);
    if (!equalBytesV1(encodeEvidence(parsed), bytes)) {
      throw new TypeError("strict attestation bytes are not Story-canonical");
    }
    const value = exactRecordV1(parsed, attestationFieldsV1, "strict attestation");
    const availableParallelism = parsePositiveSafeIntegerV1(
      value.availableParallelism,
      "availableParallelism",
    );
    const workerCount = parsePositiveSafeIntegerV1(value.workerCount, "workerCount");
    if (workerCount > 64 || availableParallelism < workerCount) {
      throw new TypeError("strict attestation parallelism is invalid");
    }
    return Object.freeze({
      arch: typeof value.arch === "string" ? value.arch : "",
      availableParallelism,
      contractId: typeof value.contractId === "string" ? value.contractId : "",
      evaluationSha256: parseDigestV1(value.evaluationSha256, "evaluationSha256"),
      firstSeed: parsePositiveSafeIntegerV1(value.firstSeed, "firstSeed"),
      lastSeed: parsePositiveSafeIntegerV1(value.lastSeed, "lastSeed"),
      materializationDigest: parseDigestV1(value.materializationDigest, "materializationDigest"),
      nodeArchiveSha256: parseDigestV1(value.nodeArchiveSha256, "nodeArchiveSha256"),
      nodeVersion: typeof value.nodeVersion === "string" ? value.nodeVersion : "",
      packageClosureDigest: parseDigestV1(value.packageClosureDigest, "packageClosureDigest"),
      platform: typeof value.platform === "string" ? value.platform : "",
      pnpmArchiveSha256: parseDigestV1(value.pnpmArchiveSha256, "pnpmArchiveSha256"),
      pnpmLockSha256: parseDigestV1(value.pnpmLockSha256, "pnpmLockSha256"),
      pnpmVersion: typeof value.pnpmVersion === "string" ? value.pnpmVersion : "",
      reportSha256: parseDigestV1(value.reportSha256, "reportSha256"),
      schemaRevision: parsePositiveSafeIntegerV1(value.schemaRevision, "schemaRevision"),
      seedCount: parsePositiveSafeIntegerV1(value.seedCount, "seedCount"),
      sourceArchiveSha256: parseDigestV1(value.sourceArchiveSha256, "sourceArchiveSha256"),
      sourceCommit: parseObjectIdV1(value.sourceCommit, "sourceCommit"),
      sourceTree: parseObjectIdV1(value.sourceTree, "sourceTree"),
      workerCount,
    });
  } catch (error) {
    return failV1("balance_freeze.attestation_invalid", detailFromV1(error));
  }
}

interface AdmittedReportV1 {
  readonly deficit: number;
  readonly evaluation: unknown;
}

function parseReportV1(bytes: Uint8Array, admission: BalanceFreezeAdmissionV1): AdmittedReportV1 {
  let admitted: unknown;
  try {
    const text = decodeUtf8V1(bytes, "balance report");
    if (
      !text.startsWith(reportPrefixV1) ||
      !text.endsWith("\n") ||
      text.slice(0, -1).includes("\n") ||
      text.includes("\r") ||
      text.charCodeAt(0) === 0xfeff
    ) {
      throw new TypeError("balance report must be one canonical prefixed LF line");
    }
    const payloadText = text.slice(reportPrefixV1.length, -1);
    const parsed: unknown = JSON.parse(payloadText);
    const canonicalPayload = admission.encodeEvidence(parsed);
    if (!equalBytesV1(canonicalPayload, encoderV1.encode(payloadText))) {
      throw new TypeError("balance report payload is not Story-canonical");
    }
    admitted = admission.admitFullReport(parsed);
    if (!equalBytesV1(admission.encodeEvidence(admitted), canonicalPayload)) {
      throw new TypeError("full-report admission changed the canonical value");
    }
  } catch (error) {
    return failV1("balance_freeze.report_invalid", detailFromV1(error));
  }
  if (admitted === null || typeof admitted !== "object" || Array.isArray(admitted)) {
    return failV1("balance_freeze.report_invalid", "full-report admission returned no report");
  }
  const report = admitted as Partial<AdmittedReportV1>;
  if (report.deficit !== 0 || report.evaluation === undefined) {
    return failV1(
      "balance_freeze.report_not_passing",
      "the admitted full report has a nonzero derived deficit",
    );
  }
  return Object.freeze({ deficit: 0, evaluation: report.evaluation });
}

interface FinalHistoryV1 {
  readonly commit: string;
  readonly reportSha256: DigestV1;
  readonly steps: number;
}

function singleTrailerV1(values: readonly string[], label: string): string {
  if (values.length !== 1 || values[0] === undefined || values[0].length === 0) {
    return failV1("balance_freeze.final_history_invalid", `${label} must occur exactly once`);
  }
  return values[0];
}

function discoverFinalHistoryV1(
  head: string,
  history: readonly BalanceFreezeHistoryCommitV1[],
): FinalHistoryV1 {
  if (
    !objectIdPatternV1.test(head) ||
    history.length === 0 ||
    history.at(-1)?.commit !== head ||
    history.some((entry) => !objectIdPatternV1.test(entry.commit))
  ) {
    return failV1("balance_freeze.final_history_invalid", "first-parent history is incomplete");
  }
  const finals = history.filter(
    (entry) =>
      entry.calibrationFinal.length > 0 ||
      entry.calibrationSteps.length > 0 ||
      entry.calibrationReportSha256.length > 0,
  );
  if (finals.length !== 1) {
    return failV1(
      "balance_freeze.final_history_invalid",
      "first-parent history must contain one final balance commit",
    );
  }
  const final = finals[0];
  if (final === undefined || singleTrailerV1(final.calibrationFinal, "final trailer") !== "true") {
    return failV1("balance_freeze.final_history_invalid", "final trailer must equal true");
  }
  const stepsText = singleTrailerV1(final.calibrationSteps, "steps trailer");
  if (!/^(?:0|[1-9]\d*)$/u.test(stepsText)) {
    return failV1("balance_freeze.final_history_invalid", "steps trailer is not canonical");
  }
  const steps = Number(stepsText);
  if (!Number.isSafeInteger(steps) || steps < 0 || steps > 12) {
    return failV1("balance_freeze.final_history_invalid", "steps trailer is outside 0..12");
  }
  const reportSha256 = singleTrailerV1(final.calibrationReportSha256, "report SHA-256 trailer");
  if (!digestPatternV1.test(reportSha256)) {
    return failV1("balance_freeze.final_history_invalid", "report trailer is not a digest");
  }
  const finalIndex = history.indexOf(final);
  const indices: number[] = [];
  for (const [index, entry] of history.entries()) {
    if (entry.calibrationIndex.length === 0) continue;
    if (index >= finalIndex || entry.calibrationIndex.length !== 1) {
      return failV1(
        "balance_freeze.final_history_invalid",
        "calibration indices must occur exactly once before final",
      );
    }
    const value = entry.calibrationIndex[0] ?? "";
    if (!/^[1-9]\d*$/u.test(value)) {
      return failV1("balance_freeze.final_history_invalid", "calibration index is invalid");
    }
    indices.push(Number(value));
  }
  if (indices.length !== steps || indices.some((value, index) => value !== index + 1)) {
    return failV1(
      "balance_freeze.final_history_invalid",
      "calibration indices do not equal the final step count",
    );
  }
  return Object.freeze({
    commit: final.commit,
    reportSha256: reportSha256 as DigestV1,
    steps,
  });
}

function sameSortedPathsV1(actual: readonly string[], expected: readonly string[]): boolean {
  const sortedActual = [...actual].toSorted();
  const sortedExpected = [...expected].toSorted();
  return (
    sortedActual.length === sortedExpected.length &&
    sortedActual.every((path, index) => path === sortedExpected[index])
  );
}

function assertAttestationIdentityV1(input: {
  readonly attestation: ParsedStrictAttestationV1;
  readonly evaluationSha256: DigestV1;
  readonly finalCommit: string;
  readonly reportSha256: DigestV1;
  readonly source: FinalBalanceSourceIdentityV1;
}): void {
  const { attestation, evaluationSha256, finalCommit, reportSha256, source } = input;
  if (
    attestation.schemaRevision !== 1 ||
    attestation.contractId !== strictAttestationContractIdV1 ||
    attestation.sourceCommit !== finalCommit ||
    attestation.sourceTree !== source.sourceTree ||
    attestation.sourceArchiveSha256 !== source.archiveSha256 ||
    attestation.pnpmLockSha256 !== source.pnpmLockSha256 ||
    attestation.materializationDigest !== source.materializationDigest ||
    attestation.packageClosureDigest !== source.packageClosureDigest ||
    attestation.nodeVersion !== exactNodeVersionV1 ||
    source.nodeVersion !== exactNodeVersionV1 ||
    attestation.nodeArchiveSha256 !== exactNodeArchiveSha256V1 ||
    attestation.pnpmVersion !== exactPnpmVersionV1 ||
    source.pnpmVersion !== exactPnpmVersionV1 ||
    attestation.pnpmArchiveSha256 !== exactPnpmArchiveSha256V1 ||
    attestation.platform !== "linux" ||
    attestation.arch !== "x64" ||
    attestation.availableParallelism !== 64 ||
    attestation.workerCount !== 64 ||
    attestation.firstSeed !== 1 ||
    attestation.lastSeed !== 1000 ||
    attestation.seedCount !== 1000 ||
    attestation.reportSha256 !== reportSha256 ||
    attestation.evaluationSha256 !== evaluationSha256
  ) {
    failV1(
      "balance_freeze.attestation_identity_mismatch",
      "strict attestation differs from the admitted final source/report identity",
    );
  }
}

function defaultEvidenceRootV1(): string {
  const explicit = process.env.PROJECT_TAVERN_BALANCE_EVIDENCE_DIR;
  if (explicit !== undefined && explicit.length > 0) return resolve(explicit);
  const stateHome = process.env.XDG_STATE_HOME;
  const base =
    stateHome !== undefined && stateHome.length > 0 ? stateHome : join(homedir(), ".local/state");
  return resolve(base, "project-tavern/balance-freeze");
}

async function readEvidenceV1(
  ports: BalanceFreezePortsV1,
  directory: string,
): Promise<{
  readonly attestationA: Uint8Array;
  readonly attestationB: Uint8Array;
  readonly reportA: Uint8Array;
  readonly reportB: Uint8Array;
}> {
  try {
    const [reportA, reportB, attestationA, attestationB] = await Promise.all([
      ports.readEvidenceFile(join(directory, "final-a.report.txt")),
      ports.readEvidenceFile(join(directory, "final-b.report.txt")),
      ports.readEvidenceFile(join(directory, "final-a.attestation.json")),
      ports.readEvidenceFile(join(directory, "final-b.attestation.json")),
    ]);
    return Object.freeze({ attestationA, attestationB, reportA, reportB });
  } catch (error) {
    return failV1(
      "external_precondition.balance_freeze_evidence_missing",
      `cannot read the retained A/B evidence: ${detailFromV1(error)}`,
    );
  }
}

export async function verifyBalanceFreezeV1(
  options: VerifyBalanceFreezeOptionsV1 = {},
): Promise<BalanceFreezeVerificationResultV1> {
  const ports = options.ports ?? createNodeBalanceFreezePortsV1(repositoryRootV1);
  const { head, history } = await ports.listFirstParentHistory();
  const final = discoverFinalHistoryV1(head, history);
  if (!(await ports.isAncestor(final.commit, head))) {
    return failV1(
      "balance_freeze.final_history_invalid",
      "the final balance commit is not an ancestor of the current HEAD",
    );
  }
  const evidence = await readEvidenceV1(
    ports,
    join(options.evidenceRoot ?? defaultEvidenceRootV1(), final.commit),
  );
  if (
    !equalBytesV1(evidence.reportA, evidence.reportB) ||
    !equalBytesV1(evidence.attestationA, evidence.attestationB)
  ) {
    return failV1(
      "balance_freeze.evidence_pair_mismatch",
      "final A/B report or strict-attestation bytes differ",
    );
  }

  const admission = await ports.loadAdmission();
  const admittedReport = parseReportV1(evidence.reportA, admission);
  const reportSha256 = ports.digestBytes(evidence.reportA);
  if (reportSha256 !== final.reportSha256) {
    return failV1(
      "balance_freeze.report_trailer_mismatch",
      "the whole canonical report line does not match the final trailer",
    );
  }
  const attestation = parseStrictAttestationV1(evidence.attestationA, admission.encodeEvidence);
  const source = await ports.inspectFinalSource(final.commit);
  const evaluationSha256 = ports.digestBytes(admission.encodeEvidence(admittedReport.evaluation));
  assertAttestationIdentityV1({
    attestation,
    evaluationSha256,
    finalCommit: final.commit,
    reportSha256,
    source,
  });

  const protectedChanges = await ports.listProtectedChanges(final.commit, head);
  if (protectedChanges.length > 0) {
    return failV1(
      "balance_freeze.protected_path_changed",
      `later first-parent commits touched frozen paths: ${protectedChanges.join(", ")}`,
    );
  }
  if (!equalBytesV1(admission.liveSaveProvenanceBytes, admission.frozenSaveProvenanceBytes)) {
    return failV1(
      "balance_freeze.save_provenance_mismatch",
      "the complete live Save provenance projection differs from the reviewed tuple",
    );
  }

  const [finalPaths, headPaths] = await Promise.all([
    ports.listTreePaths(final.commit),
    ports.listTreePaths(head),
  ]);
  if (
    !sameSortedPathsV1(finalPaths, expectedPocSaveFixturePathsV1) ||
    !sameSortedPathsV1(headPaths, expectedPocSaveFixturePathsV1)
  ) {
    return failV1(
      "balance_freeze.save_inventory_mismatch",
      "the tracked Save inventory is not the reviewed eight-file set",
    );
  }
  for (const path of expectedPocSaveFixturePathsV1) {
    const [finalBytes, headBytes] = await Promise.all([
      ports.readBlob(final.commit, path),
      ports.readBlob(head, path),
    ]);
    if (!equalBytesV1(finalBytes, headBytes)) {
      return failV1(
        "balance_freeze.save_bytes_mismatch",
        `${path} differs from its reviewed final-commit blob`,
      );
    }
  }

  return Object.freeze({
    finalCommit: final.commit,
    reportSha256,
    sourceArchiveSha256: source.archiveSha256,
    sourceTree: source.sourceTree,
    steps: final.steps,
  });
}

export interface GitCommandResultV1 {
  readonly status: number;
  readonly stderr: Uint8Array;
  readonly stdout: Uint8Array;
}

export interface BalanceFreezeNodeAdapterV1 {
  readonly hashGitArchive: (args: readonly string[]) => Promise<DigestV1>;
  readonly loadAdmission: () => Promise<BalanceFreezeAdmissionV1>;
  readonly readFile: (path: string) => Promise<Uint8Array>;
  readonly runGit: (
    args: readonly string[],
    acceptedStatuses?: readonly number[],
  ) => Promise<GitCommandResultV1>;
}

export function createBalanceFreezeGitEnvironmentV1(
  source: NodeJS.ProcessEnv = process.env,
): Readonly<Record<string, string>> {
  const path = source.PATH;
  if (path === undefined || path.length === 0) {
    throw new TypeError("balance_freeze.git_environment_invalid: PATH is unavailable");
  }
  const temporary =
    source.TMPDIR === undefined || source.TMPDIR.length === 0 ? "/tmp" : source.TMPDIR;
  return Object.freeze({
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
    PATH: path,
    TMPDIR: temporary,
    TZ: "UTC",
    XDG_CONFIG_HOME: "/dev/null",
  });
}

async function runGitV1(
  root: string,
  args: readonly string[],
  acceptedStatuses: readonly number[] = [0],
): Promise<GitCommandResultV1> {
  return await new Promise<GitCommandResultV1>((resolvePromise, rejectPromise) => {
    const child = spawn("git", [...args], {
      cwd: root,
      env: createBalanceFreezeGitEnvironmentV1(),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let terminalError: Error | undefined;
    const recordChunk = (target: Buffer[], chunk: Buffer, stream: "stdout" | "stderr") => {
      if (terminalError !== undefined) return;
      if (stream === "stdout") stdoutBytes += chunk.byteLength;
      else stderrBytes += chunk.byteLength;
      if (stdoutBytes > commandOutputLimitV1 || stderrBytes > commandOutputLimitV1) {
        terminalError = new Error(`git ${args[0] ?? "command"} exceeded its output limit`);
        child.kill("SIGKILL");
        return;
      }
      target.push(chunk);
    };
    child.stdout.on("data", (chunk: Buffer) => recordChunk(stdout, chunk, "stdout"));
    child.stderr.on("data", (chunk: Buffer) => recordChunk(stderr, chunk, "stderr"));
    child.on("error", (error) => {
      terminalError ??= error;
    });
    child.on("close", (status, signal) => {
      if (terminalError !== undefined) {
        rejectPromise(terminalError);
        return;
      }
      const exitStatus = status ?? -1;
      const stderrBytesValue = Buffer.concat(stderr);
      if (signal !== null || !acceptedStatuses.includes(exitStatus)) {
        rejectPromise(
          new Error(
            `git ${args.join(" ")} failed status=${String(status)} signal=${String(signal)}: ${decodeUtf8V1(stderrBytesValue, "git stderr").slice(0, 4096)}`,
          ),
        );
        return;
      }
      resolvePromise(
        Object.freeze({
          status: exitStatus,
          stderr: Uint8Array.from(stderrBytesValue),
          stdout: Uint8Array.from(Buffer.concat(stdout)),
        }),
      );
    });
  });
}

async function hashGitArchiveV1(root: string, args: readonly string[]): Promise<DigestV1> {
  return await new Promise<DigestV1>((resolvePromise, rejectPromise) => {
    const child = spawn("git", [...args], {
      cwd: root,
      env: createBalanceFreezeGitEnvironmentV1(),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const hash = createHash("sha256");
    const stderr: Buffer[] = [];
    let stderrBytes = 0;
    let terminalError: Error | undefined;
    child.stdout.on("data", (chunk: Buffer) => {
      if (terminalError === undefined) hash.update(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (terminalError !== undefined) return;
      stderrBytes += chunk.byteLength;
      if (stderrBytes > commandOutputLimitV1) {
        terminalError = new Error("git archive exceeded its diagnostic limit");
        child.kill("SIGKILL");
        return;
      }
      stderr.push(chunk);
    });
    child.on("error", (error) => {
      terminalError ??= error;
    });
    child.on("close", (status, signal) => {
      if (terminalError !== undefined) {
        rejectPromise(terminalError);
        return;
      }
      if (status !== 0 || signal !== null) {
        rejectPromise(
          new Error(
            `git archive failed status=${String(status)} signal=${String(signal)}: ${decodeUtf8V1(Buffer.concat(stderr), "git archive stderr").slice(0, 4096)}`,
          ),
        );
        return;
      }
      resolvePromise(`sha256:${hash.digest("hex")}`);
    });
  });
}

function oneLineV1(bytes: Uint8Array, label: string): string {
  const value = decodeUtf8V1(bytes, label);
  if (!value.endsWith("\n") || value.slice(0, -1).includes("\n") || value.includes("\r")) {
    throw new TypeError(`${label} is not one LF-terminated line`);
  }
  return value.slice(0, -1);
}

function trailerValuesV1(value: string): readonly string[] {
  return value.length === 0 ? Object.freeze([]) : Object.freeze(value.split("\x1d"));
}

async function listFirstParentHistoryV1(adapter: BalanceFreezeNodeAdapterV1): Promise<{
  readonly head: string;
  readonly history: readonly BalanceFreezeHistoryCommitV1[];
}> {
  const head = oneLineV1((await adapter.runGit(["rev-parse", "HEAD"])).stdout, "Git HEAD");
  const format =
    "%H%x1f%(trailers:key=Balance-Calibration-Index,valueonly,separator=%x1d)%x1f%(trailers:key=Balance-Calibration-Final,valueonly,separator=%x1d)%x1f%(trailers:key=Balance-Calibration-Steps,valueonly,separator=%x1d)%x1f%(trailers:key=Balance-Calibration-Report-SHA256,valueonly,separator=%x1d)%x1e";
  const output = decodeUtf8V1(
    (await adapter.runGit(["log", "--first-parent", "--reverse", `--format=${format}`, head]))
      .stdout,
    "first-parent history",
  );
  const history = output
    .split("\x1e")
    .map((record) => record.replace(/^\n+/u, "").replace(/\n+$/u, ""))
    .filter((record) => record.length > 0)
    .map((record): BalanceFreezeHistoryCommitV1 => {
      const fields = record.split("\x1f");
      if (fields.length !== 5 || fields[0] === undefined) {
        throw new TypeError("first-parent trailer framing is invalid");
      }
      return Object.freeze({
        calibrationFinal: trailerValuesV1(fields[2] ?? ""),
        calibrationIndex: trailerValuesV1(fields[1] ?? ""),
        calibrationReportSha256: trailerValuesV1(fields[4] ?? ""),
        calibrationSteps: trailerValuesV1(fields[3] ?? ""),
        commit: fields[0],
      });
    });
  return Object.freeze({ head, history: Object.freeze(history) });
}

async function inspectFinalSourceV1(
  adapter: BalanceFreezeNodeAdapterV1,
  commit: string,
): Promise<FinalBalanceSourceIdentityV1> {
  try {
    const [treeResult, archiveSha256, lockBytes, contractBytes, nodeBytes, packageBytes] =
      await Promise.all([
        adapter.runGit(["rev-parse", `${commit}^{tree}`]),
        adapter.hashGitArchive(["archive", "--format=tar", commit]),
        adapter.runGit(["show", `${commit}:pnpm-lock.yaml`]).then(({ stdout }) => stdout),
        adapter
          .runGit(["show", `${commit}:scripts/preflight/materialization-lock.json`])
          .then(({ stdout }) => stdout),
        adapter.runGit(["show", `${commit}:.node-version`]).then(({ stdout }) => stdout),
        adapter.runGit(["show", `${commit}:package.json`]).then(({ stdout }) => stdout),
      ]);
    const materialization = (await import(
      new URL("../preflight/materialization-contract.mts", import.meta.url).href
    )) as typeof import("../preflight/materialization-contract.mjs");
    const lockText = decodeUtf8V1(lockBytes, "final pnpm lockfile");
    const expectedContract = materialization.createMaterializationContractV1(lockText);
    const trackedContract = materialization.parseMaterializationContractV1(contractBytes);
    if (
      !equalBytesV1(
        materialization.serializeMaterializationContractV1(expectedContract),
        contractBytes,
      )
    ) {
      throw new TypeError("final materialization contract is stale");
    }
    const nodeVersionText = decodeUtf8V1(nodeBytes, "final .node-version");
    if (nodeVersionText !== "26.5.0\n") {
      throw new TypeError("final .node-version differs from the exact checkpoint");
    }
    const packageText = decodeUtf8V1(packageBytes, "final package.json");
    const packageValue: unknown = JSON.parse(packageText);
    const packageRecord = exactRecordV1(
      packageValue,
      Object.keys(packageValue as Record<string, unknown>),
      "final package.json",
    );
    if (
      packageRecord.packageManager !== "pnpm@11.11.0" ||
      trackedContract.pnpm.version !== exactPnpmVersionV1
    ) {
      throw new TypeError("final pnpm identity differs from the exact checkpoint");
    }
    const sourceTree = oneLineV1(treeResult.stdout, "final source tree");
    parseObjectIdV1(sourceTree, "final source tree");
    return Object.freeze({
      archiveSha256,
      materializationDigest: materialization.computeMaterializationDigestV1(trackedContract),
      nodeVersion: exactNodeVersionV1,
      packageClosureDigest: materialization.computePackageClosureDigestV1(
        trackedContract.externalPackages,
      ),
      pnpmLockSha256: `sha256:${createHash("sha256").update(lockBytes).digest("hex")}`,
      pnpmVersion: exactPnpmVersionV1,
      sourceTree,
    });
  } catch (error) {
    return failV1("balance_freeze.source_identity_invalid", detailFromV1(error));
  }
}

export async function loadBalanceFreezeAdmissionV1(): Promise<BalanceFreezeAdmissionV1> {
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        if (specifier.endsWith(".mjs")) {
          return nextResolve(`${specifier.slice(0, -4)}.mts`, context);
        }
        if (specifier.endsWith(".js")) {
          return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
        }
        throw error;
      }
    },
  });
  try {
    const [base, testkit, calibration, story, provenance] = await Promise.all([
      import("../../engine/packages/base/src/index.js"),
      import("../../engine/packages/base/src/testkit/index.js"),
      import(
        new URL("../../game/stories/poc/src/testing/balance-calibration.ts", import.meta.url).href
      ),
      import("../../game/stories/poc/src/story-definition.js"),
      import(
        new URL("../../game/stories/poc/src/testing/save-fixture-provenance.ts", import.meta.url)
          .href
      ),
    ]);
    const resolved = testkit.resolveStoryForTestV1(story.pocStoryEntryV1);
    const live = provenance.projectPocSaveFixtureProvenanceV1({
      appBuildId: base.digestCanonical("sillymaker:application:v1", []),
      provenance: resolved.provenance,
    });
    return Object.freeze({
      admitFullReport: calibration.admitPocBalanceFullReportV1,
      encodeEvidence: calibration.canonicalPocBalanceEvidenceBytesV1,
      frozenSaveProvenanceBytes: base.canonicalJsonBytes(provenance.pocSaveFixtureProvenanceV1),
      liveSaveProvenanceBytes: base.canonicalJsonBytes(live),
    });
  } finally {
    hooks.deregister();
  }
}

export function createNodeBalanceFreezePortsV1(
  root: string = repositoryRootV1,
  injectedAdapter?: BalanceFreezeNodeAdapterV1,
): BalanceFreezePortsV1 {
  const repositoryRoot = resolve(root);
  const adapter: BalanceFreezeNodeAdapterV1 =
    injectedAdapter ??
    Object.freeze({
      hashGitArchive: async (args: readonly string[]) =>
        await hashGitArchiveV1(repositoryRoot, args),
      loadAdmission: loadBalanceFreezeAdmissionV1,
      readFile: async (path: string) => readFile(path),
      runGit: async (args: readonly string[], acceptedStatuses?: readonly number[]) =>
        await runGitV1(repositoryRoot, args, acceptedStatuses),
    });
  return Object.freeze({
    digestBytes: (bytes: Uint8Array): DigestV1 =>
      `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    inspectFinalSource: async (commit) => await inspectFinalSourceV1(adapter, commit),
    isAncestor: async (ancestor, descendant) =>
      (await adapter.runGit(["merge-base", "--is-ancestor", ancestor, descendant], [0, 1]))
        .status === 0,
    listFirstParentHistory: async () => await listFirstParentHistoryV1(adapter),
    listProtectedChanges: async (finalCommit, headCommit) => {
      const commitsText = decodeUtf8V1(
        (
          await adapter.runGit([
            "rev-list",
            "--first-parent",
            "--reverse",
            `${finalCommit}..${headCommit}`,
          ])
        ).stdout,
        "post-final first-parent commits",
      );
      const commits = commitsText.split("\n").filter((value) => value.length > 0);
      const changes: string[] = [];
      for (const commit of commits) {
        const pathsText = decodeUtf8V1(
          (
            await adapter.runGit([
              "diff",
              "--name-only",
              `${commit}^1`,
              commit,
              "--",
              ...balanceFreezeProtectedPathsV1,
            ])
          ).stdout,
          `protected diff for ${commit}`,
        );
        for (const path of pathsText.split("\n").filter((value) => value.length > 0)) {
          changes.push(`${commit}:${path}`);
        }
      }
      return Object.freeze(changes);
    },
    listTreePaths: async (commit) => {
      const output = decodeUtf8V1(
        (
          await adapter.runGit([
            "ls-tree",
            "-r",
            "--name-only",
            commit,
            "--",
            saveFixtureDirectoryV1,
          ])
        ).stdout,
        `Save inventory at ${commit}`,
      );
      return Object.freeze(output.split("\n").filter((value) => value.length > 0));
    },
    loadAdmission: adapter.loadAdmission,
    readBlob: async (commit, path) => (await adapter.runGit(["show", `${commit}:${path}`])).stdout,
    readEvidenceFile: adapter.readFile,
    repositoryRoot,
  } satisfies BalanceFreezePortsV1);
}

const isMainV1 =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainV1) {
  try {
    if (process.argv.length !== 2) {
      throw new TypeError("verify:balance:freeze accepts no arguments");
    }
    const result = await verifyBalanceFreezeV1();
    console.log(`frozen balance evidence verified ${result.finalCommit} ${result.reportSha256}`);
  } catch (error) {
    console.error(detailFromV1(error));
    process.exitCode = 1;
  }
}
