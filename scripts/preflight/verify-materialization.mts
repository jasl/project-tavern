// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { randomUUID } from "node:crypto";
import {
  access,
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readlink,
  rename,
  rm,
  statfs,
  symlink,
} from "node:fs/promises";
import { createServer } from "node:net";
import { arch as hostArch, platform as hostPlatform, tmpdir } from "node:os";
import { dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import type { MaterializationContractReadResultV1 } from "./materialization-contract.mjs";

const contractModuleV1 = (await import(
  new URL("./materialization-contract.mts", import.meta.url).href
)) as typeof import("./materialization-contract.mjs");
const {
  computePackageClosureDigestV1,
  deriveExternalPackageClosureV1,
  readMaterializationContractV1,
} = contractModuleV1;

export const phaseOneBaseCommitV1 = "4e9c2bd5b06f3cc6f338d30ff43bc6e0188f74d2";
export const goalMaterializationContractIdV1 = "project-tavern-goal-materialization-v1";
export const fixedGoalPortsV1 = Object.freeze([
  Object.freeze({ host: "127.0.0.1", port: 4173 }),
  Object.freeze({ host: "127.0.0.1", port: 41731 }),
  Object.freeze({ host: "127.0.0.1", port: 41732 }),
]);

const exactNodeVersionV1 = "v26.5.0";
const exactPnpmVersionV1 = "11.11.0";
const minimumFreeBytesV1 = 8 * 1024 ** 3;
const commandOutputLimitV1 = 2 * 1024 * 1024;
const commandTimeoutMillisecondsV1 = 10 * 60 * 1000;
const browserNamesV1 = ["chromium", "webkit"] as const;
const fontCssPathsV1 = [
  "engine/packages/ui/node_modules/@fontsource/noto-sans-sc/chinese-simplified-400.css",
  "engine/packages/ui/node_modules/@fontsource/noto-sans-sc/chinese-simplified-700.css",
] as const;

export type ExternalPreconditionCodeV1 =
  | "external_precondition.git_worktree_dirty"
  | "external_precondition.git_branch_invalid"
  | "external_precondition.phase_base_mismatch"
  | "external_precondition.git_identity_missing"
  | "external_precondition.port_unavailable"
  | "external_precondition.toolchain_mismatch"
  | "external_precondition.package_materialization_failed"
  | "external_precondition.host_package_missing"
  | "external_precondition.host_platform_mismatch"
  | "external_precondition.browser_materialization_failed"
  | "external_precondition.browser_missing"
  | "external_precondition.browser_revision_mismatch"
  | "external_precondition.browser_launch_failed"
  | "external_precondition.visual_font_missing"
  | "external_precondition.insufficient_disk_space"
  | "external_precondition.offline_install_failed"
  | "external_precondition.offline_build_failed"
  | "external_precondition.materialization_stale";

export class ExternalPreconditionError extends Error {
  readonly name = "ExternalPreconditionError";
  readonly code: ExternalPreconditionCodeV1;

  constructor(code: ExternalPreconditionCodeV1, detail: string) {
    super(`${code}: ${detail}`);
    this.code = code;
  }
}

export interface GoalMaterializationCommandV1 {
  readonly executable: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly network: "allowed" | "forbidden";
}

export interface GoalMaterializationCommandResultV1 {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface GoalMaterializationCandidateHandleV1 {
  readonly write: (bytes: Uint8Array) => Promise<void>;
  readonly sync: () => Promise<void>;
  readonly close: () => Promise<void>;
}

export interface GoalBrowserInspectionV1 {
  readonly revision: string;
  readonly executablePath: string | undefined;
}

export interface GoalMaterializationAdapterV1 {
  readonly nodeVersion: string;
  readonly platform: string;
  readonly arch: string;
  readonly tempDirectory: string;
  readonly run: (
    command: GoalMaterializationCommandV1,
  ) => Promise<GoalMaterializationCommandResultV1>;
  readonly readMaterializationContract: (
    root: string,
  ) => Promise<MaterializationContractReadResultV1>;
  readonly bindPort: (binding: { readonly host: string; readonly port: number }) => Promise<void>;
  readonly diskFreeBytes: (path: string) => Promise<number>;
  readonly hostPackageClosureAvailable: (
    contract: MaterializationContractReadResultV1,
  ) => Promise<boolean>;
  readonly inspectBrowser: (
    browser: (typeof browserNamesV1)[number],
  ) => Promise<GoalBrowserInspectionV1>;
  readonly probeFont: (cssPath: string) => Promise<readonly string[]>;
  readonly launchBrowser: (
    browser: (typeof browserNamesV1)[number],
    executablePath: string,
    fontPaths: readonly string[],
  ) => Promise<{ readonly fontLoaded: boolean }>;
  readonly createDisposableSource: (root: string) => Promise<string>;
  readonly removeDisposableSource: (path: string) => Promise<void>;
  readonly ensureDirectory: (path: string) => Promise<void>;
  readonly readFile: (path: string) => Promise<Uint8Array>;
  readonly openExclusive: (path: string) => Promise<GoalMaterializationCandidateHandleV1>;
  readonly rename: (from: string, to: string) => Promise<void>;
  readonly remove: (path: string) => Promise<void>;
  readonly syncDirectory: (path: string) => Promise<void>;
  readonly uniqueSuffix: () => string;
}

export interface GoalMaterializationAttestationV1 {
  readonly schemaRevision: 1;
  readonly contractId: typeof goalMaterializationContractIdV1;
  readonly status: "complete";
  readonly materializationBaseCommit: string;
  readonly branch: string;
  readonly fixedPorts: typeof fixedGoalPortsV1;
  readonly materializationDigest: `sha256:${string}`;
  readonly packageClosureDigest: `sha256:${string}`;
  readonly platform: string;
  readonly arch: string;
  readonly browsers: {
    readonly chromium: { readonly revision: string; readonly executableAvailable: true };
    readonly webkit: { readonly revision: string; readonly executableAvailable: true };
  };
}

interface RepositoryPreconditionsV1 {
  readonly branch: string;
  readonly head: string;
  readonly contract: MaterializationContractReadResultV1;
}

function fail(code: ExternalPreconditionCodeV1, detail: string): never {
  throw new ExternalPreconditionError(code, detail);
}

function detailFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  path: string,
): void {
  const actual = Object.keys(value).toSorted();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new TypeError(`${path} has unexpected or missing fields`);
  }
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${path} must be a non-empty string`);
  }
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      if (index + 1 >= value.length) throw new TypeError(`${path} contains a lone surrogate`);
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) {
        throw new TypeError(`${path} contains a lone surrogate`);
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError(`${path} contains a lone surrogate`);
    }
  }
  return value;
}

function digest(value: unknown, path: string): `sha256:${string}` {
  const parsed = nonEmptyString(value, path);
  if (!/^sha256:[0-9a-f]{64}$/u.test(parsed)) throw new TypeError(`${path} is not a SHA-256`);
  return parsed as `sha256:${string}`;
}

function browserEvidence(
  value: unknown,
  path: string,
): {
  readonly revision: string;
  readonly executableAvailable: true;
} {
  if (!isPlainObject(value)) throw new TypeError(`${path} must be an object`);
  exactKeys(value, ["executableAvailable", "revision"], path);
  if (value.executableAvailable !== true) {
    throw new TypeError(`${path}/executableAvailable must be true`);
  }
  const revision = nonEmptyString(value.revision, `${path}/revision`);
  if (!/^\d+$/u.test(revision)) throw new TypeError(`${path}/revision must be decimal`);
  return { executableAvailable: true, revision };
}

function validateGoalMaterializationAttestationV1(
  value: unknown,
): GoalMaterializationAttestationV1 {
  if (!isPlainObject(value)) throw new TypeError("attestation must be an object");
  exactKeys(
    value,
    [
      "arch",
      "branch",
      "browsers",
      "contractId",
      "fixedPorts",
      "materializationBaseCommit",
      "materializationDigest",
      "packageClosureDigest",
      "platform",
      "schemaRevision",
      "status",
    ],
    "attestation",
  );
  if (value.schemaRevision !== 1) throw new TypeError("schemaRevision must equal 1");
  if (value.contractId !== goalMaterializationContractIdV1) {
    throw new TypeError("contractId is not recognized");
  }
  if (value.status !== "complete") throw new TypeError("status must equal complete");
  const materializationBaseCommit = nonEmptyString(
    value.materializationBaseCommit,
    "materializationBaseCommit",
  );
  if (!/^[0-9a-f]{40}$/u.test(materializationBaseCommit)) {
    throw new TypeError("materializationBaseCommit must be a full Git SHA-1");
  }
  const branch = nonEmptyString(value.branch, "branch");
  const platform = nonEmptyString(value.platform, "platform");
  const arch = nonEmptyString(value.arch, "arch");
  if (!Array.isArray(value.fixedPorts) || value.fixedPorts.length !== fixedGoalPortsV1.length) {
    throw new TypeError("fixedPorts does not match the contract");
  }
  for (const [index, expected] of fixedGoalPortsV1.entries()) {
    const actual = value.fixedPorts[index];
    if (!isPlainObject(actual)) throw new TypeError(`fixedPorts/${index} must be an object`);
    exactKeys(actual, ["host", "port"], `fixedPorts/${index}`);
    if (actual.host !== expected.host || actual.port !== expected.port) {
      throw new TypeError("fixedPorts does not match the contract");
    }
  }
  if (!isPlainObject(value.browsers)) throw new TypeError("browsers must be an object");
  exactKeys(value.browsers, ["chromium", "webkit"], "browsers");
  return {
    arch,
    branch,
    browsers: {
      chromium: browserEvidence(value.browsers.chromium, "browsers/chromium"),
      webkit: browserEvidence(value.browsers.webkit, "browsers/webkit"),
    },
    contractId: goalMaterializationContractIdV1,
    fixedPorts: fixedGoalPortsV1,
    materializationBaseCommit,
    materializationDigest: digest(value.materializationDigest, "materializationDigest"),
    packageClosureDigest: digest(value.packageClosureDigest, "packageClosureDigest"),
    platform,
    schemaRevision: 1,
    status: "complete",
  };
}

export function serializeGoalMaterializationAttestationV1(value: unknown): Uint8Array {
  const attestation = validateGoalMaterializationAttestationV1(value);
  const canonical = {
    arch: attestation.arch,
    branch: attestation.branch,
    browsers: {
      chromium: {
        executableAvailable: true,
        revision: attestation.browsers.chromium.revision,
      },
      webkit: {
        executableAvailable: true,
        revision: attestation.browsers.webkit.revision,
      },
    },
    contractId: goalMaterializationContractIdV1,
    fixedPorts: fixedGoalPortsV1,
    materializationBaseCommit: attestation.materializationBaseCommit,
    materializationDigest: attestation.materializationDigest,
    packageClosureDigest: attestation.packageClosureDigest,
    platform: attestation.platform,
    schemaRevision: 1,
    status: "complete",
  };
  return new TextEncoder().encode(`${JSON.stringify(canonical, null, 2)}\n`);
}

export function parseGoalMaterializationAttestationV1(
  bytes: Uint8Array,
): GoalMaterializationAttestationV1 {
  if (bytes.byteLength > 64 * 1024) throw new TypeError("attestation is too large");
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new TypeError("attestation has a UTF-8 BOM");
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new TypeError("attestation is not UTF-8");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new TypeError("attestation is not JSON");
  }
  const attestation = validateGoalMaterializationAttestationV1(parsed);
  const canonical = serializeGoalMaterializationAttestationV1(attestation);
  if (
    canonical.byteLength !== bytes.byteLength ||
    !canonical.every((byte, i) => byte === bytes[i])
  ) {
    throw new TypeError("attestation is not canonical");
  }
  return attestation;
}

async function run(
  adapter: GoalMaterializationAdapterV1,
  root: string,
  executable: string,
  args: readonly string[],
  network: "allowed" | "forbidden" = "forbidden",
): Promise<GoalMaterializationCommandResultV1> {
  return adapter.run({ executable, args, cwd: root, network });
}

async function requireSuccess(
  result: Promise<GoalMaterializationCommandResultV1>,
  code: ExternalPreconditionCodeV1,
  detail: string,
): Promise<GoalMaterializationCommandResultV1> {
  let resolved: GoalMaterializationCommandResultV1;
  try {
    resolved = await result;
  } catch (error) {
    return fail(code, `${detail}: ${detailFrom(error)}`);
  }
  if (resolved.exitCode !== 0) {
    const suffix = resolved.stderr.trim();
    fail(code, suffix.length === 0 ? detail : `${detail}: ${suffix}`);
  }
  return resolved;
}

async function assertCleanWorktreeV1(
  root: string,
  adapter: GoalMaterializationAdapterV1,
): Promise<void> {
  const result = await requireSuccess(
    run(adapter, root, "git", ["status", "--porcelain=v1", "--untracked-files=all"]),
    "external_precondition.git_worktree_dirty",
    "cannot inspect Git worktree",
  );
  if (result.stdout.trim().length !== 0) {
    fail("external_precondition.git_worktree_dirty", "tracked or untracked worktree changes exist");
  }
}

async function readBranchV1(root: string, adapter: GoalMaterializationAdapterV1): Promise<string> {
  const result = await requireSuccess(
    run(adapter, root, "git", ["symbolic-ref", "--quiet", "--short", "HEAD"]),
    "external_precondition.git_branch_invalid",
    "HEAD is detached or the branch is unavailable",
  );
  const branch = result.stdout.trim();
  if (branch.length === 0) fail("external_precondition.git_branch_invalid", "branch is empty");
  return branch;
}

async function readHeadV1(root: string, adapter: GoalMaterializationAdapterV1): Promise<string> {
  const result = await requireSuccess(
    run(adapter, root, "git", ["rev-parse", "HEAD"]),
    "external_precondition.phase_base_mismatch",
    "cannot resolve HEAD",
  );
  const head = result.stdout.trim();
  if (!/^[0-9a-f]{40}$/u.test(head)) {
    fail("external_precondition.phase_base_mismatch", "HEAD is not a full Git SHA-1");
  }
  return head;
}

async function assertAncestorV1(
  root: string,
  adapter: GoalMaterializationAdapterV1,
  ancestor: string,
  head: string,
): Promise<void> {
  const result = await run(adapter, root, "git", ["merge-base", "--is-ancestor", ancestor, head]);
  if (result.exitCode !== 0) {
    fail("external_precondition.phase_base_mismatch", `${ancestor} is not an ancestor of ${head}`);
  }
}

async function assertGitIdentityV1(
  root: string,
  adapter: GoalMaterializationAdapterV1,
): Promise<void> {
  for (const key of ["user.name", "user.email"] as const) {
    const result = await requireSuccess(
      run(adapter, root, "git", ["config", "--get", key]),
      "external_precondition.git_identity_missing",
      `${key} is unavailable`,
    );
    if (result.stdout.trim().length === 0) {
      fail("external_precondition.git_identity_missing", `${key} is empty`);
    }
  }
}

async function assertPortsV1(adapter: GoalMaterializationAdapterV1): Promise<void> {
  for (const binding of fixedGoalPortsV1) {
    try {
      await adapter.bindPort(binding);
    } catch (error) {
      fail(
        "external_precondition.port_unavailable",
        `${binding.host}:${binding.port} cannot be bound: ${detailFrom(error)}`,
      );
    }
  }
}

async function assertToolchainV1(
  root: string,
  adapter: GoalMaterializationAdapterV1,
): Promise<void> {
  if (adapter.nodeVersion !== exactNodeVersionV1) {
    fail(
      "external_precondition.toolchain_mismatch",
      `Node ${exactNodeVersionV1} is required; found ${adapter.nodeVersion}`,
    );
  }
  const pnpm = await requireSuccess(
    run(adapter, root, "pnpm", ["--version"]),
    "external_precondition.toolchain_mismatch",
    "cannot read pnpm version",
  );
  if (pnpm.stdout.trim() !== exactPnpmVersionV1) {
    fail(
      "external_precondition.toolchain_mismatch",
      `pnpm ${exactPnpmVersionV1} is required; found ${pnpm.stdout.trim()}`,
    );
  }
}

async function readContractV1(
  root: string,
  adapter: GoalMaterializationAdapterV1,
): Promise<MaterializationContractReadResultV1> {
  try {
    return await adapter.readMaterializationContract(root);
  } catch (error) {
    return fail(
      "external_precondition.materialization_stale",
      `tracked materialization contract is invalid: ${detailFrom(error)}`,
    );
  }
}

async function assertDiskV1(adapter: GoalMaterializationAdapterV1): Promise<void> {
  let available: number;
  try {
    available = await adapter.diskFreeBytes(adapter.tempDirectory);
  } catch (error) {
    return fail(
      "external_precondition.insufficient_disk_space",
      `cannot inspect free space: ${detailFrom(error)}`,
    );
  }
  if (!Number.isSafeInteger(available) || available < minimumFreeBytesV1) {
    fail(
      "external_precondition.insufficient_disk_space",
      `at least ${minimumFreeBytesV1} bytes of free space are required`,
    );
  }
}

async function inspectRepositoryPreconditionsV1(
  root: string,
  adapter: GoalMaterializationAdapterV1,
): Promise<RepositoryPreconditionsV1> {
  await assertCleanWorktreeV1(root, adapter);
  const branch = await readBranchV1(root, adapter);
  const head = await readHeadV1(root, adapter);
  await assertAncestorV1(root, adapter, phaseOneBaseCommitV1, head);
  await assertGitIdentityV1(root, adapter);
  await assertPortsV1(adapter);
  await assertToolchainV1(root, adapter);
  const contract = await readContractV1(root, adapter);
  await assertDiskV1(adapter);
  return { branch, contract, head };
}

async function assertHostClosureV1(
  adapter: GoalMaterializationAdapterV1,
  contract: MaterializationContractReadResultV1,
): Promise<void> {
  let available: boolean;
  try {
    available = await adapter.hostPackageClosureAvailable(contract);
  } catch (error) {
    return fail(
      "external_precondition.host_package_missing",
      `cannot inspect host package closure: ${detailFrom(error)}`,
    );
  }
  if (!available) {
    fail("external_precondition.host_package_missing", "host package/store closure is incomplete");
  }
}

async function inspectBrowsersV1(
  adapter: GoalMaterializationAdapterV1,
  contract: MaterializationContractReadResultV1,
): Promise<{
  readonly chromium: { readonly revision: string; readonly executablePath: string };
  readonly webkit: { readonly revision: string; readonly executablePath: string };
}> {
  const result: Partial<
    Record<
      (typeof browserNamesV1)[number],
      { readonly revision: string; readonly executablePath: string }
    >
  > = {};
  for (const browser of browserNamesV1) {
    let inspection: GoalBrowserInspectionV1;
    try {
      inspection = await adapter.inspectBrowser(browser);
    } catch (error) {
      return fail(
        "external_precondition.browser_missing",
        `${browser} cannot be inspected: ${detailFrom(error)}`,
      );
    }
    if (inspection.executablePath === undefined || inspection.executablePath.length === 0) {
      fail("external_precondition.browser_missing", `${browser} executable is missing`);
    }
    const expected = contract.contract.playwright.browsers[browser].revision;
    if (inspection.revision !== expected) {
      fail(
        "external_precondition.browser_revision_mismatch",
        `${browser} revision ${expected} is required; found ${inspection.revision}`,
      );
    }
    result[browser] = {
      executablePath: inspection.executablePath,
      revision: inspection.revision,
    };
  }
  const chromium = result.chromium;
  const webkit = result.webkit;
  if (chromium === undefined || webkit === undefined) {
    return fail("external_precondition.browser_missing", "browser inspection is incomplete");
  }
  return { chromium, webkit };
}

async function inspectFontsV1(
  root: string,
  adapter: GoalMaterializationAdapterV1,
): Promise<readonly string[]> {
  const fontPaths: string[] = [];
  for (const relativePath of fontCssPathsV1) {
    const cssPath = resolve(root, relativePath);
    let paths: readonly string[];
    try {
      paths = await adapter.probeFont(cssPath);
    } catch (error) {
      return fail(
        "external_precondition.visual_font_missing",
        `${cssPath} cannot be read: ${detailFrom(error)}`,
      );
    }
    if (paths.length < 2) {
      fail("external_precondition.visual_font_missing", `${cssPath} has incomplete font binaries`);
    }
    fontPaths.push(...paths);
  }
  if (fontPaths.length < 4) {
    fail("external_precondition.visual_font_missing", "required 400/700 font binaries are missing");
  }
  return fontPaths;
}

async function assertBrowserLaunchesV1(
  adapter: GoalMaterializationAdapterV1,
  browsers: Awaited<ReturnType<typeof inspectBrowsersV1>>,
  fontPaths: readonly string[],
): Promise<void> {
  for (const browser of browserNamesV1) {
    let launch: { readonly fontLoaded: boolean };
    try {
      launch = await adapter.launchBrowser(browser, browsers[browser].executablePath, fontPaths);
    } catch (error) {
      return fail(
        "external_precondition.browser_launch_failed",
        `${browser} cannot launch: ${detailFrom(error)}`,
      );
    }
    if (!launch.fontLoaded) {
      fail("external_precondition.visual_font_missing", `${browser} could not load local fonts`);
    }
  }
}

async function readAttestationV1(
  root: string,
  adapter: GoalMaterializationAdapterV1,
): Promise<GoalMaterializationAttestationV1> {
  try {
    const bytes = await adapter.readFile(
      resolve(root, ".project-tavern/goal-materialization.json"),
    );
    return parseGoalMaterializationAttestationV1(bytes);
  } catch (error) {
    return fail(
      "external_precondition.materialization_stale",
      `local materialization attestation is invalid: ${detailFrom(error)}`,
    );
  }
}

async function assertDisposableVerificationV1(
  root: string,
  adapter: GoalMaterializationAdapterV1,
  buildScript: "build" | "build:e2e",
  browsers: Awaited<ReturnType<typeof inspectBrowsersV1>>,
): Promise<void> {
  let disposable: string | undefined;
  try {
    disposable = await adapter.createDisposableSource(root);
    const relativeToRoot = relative(root, disposable);
    if (
      relativeToRoot === "" ||
      (!relativeToRoot.startsWith(`..${sep}`) && relativeToRoot !== "..")
    ) {
      fail(
        "external_precondition.offline_install_failed",
        "disposable source must be outside root",
      );
    }
    await requireSuccess(
      run(adapter, disposable, "pnpm", [
        "install",
        "--offline",
        "--frozen-lockfile",
        "--frozen-store",
      ]),
      "external_precondition.offline_install_failed",
      "disposable offline install failed",
    );
    await requireSuccess(
      run(adapter, disposable, "pnpm", [buildScript]),
      "external_precondition.offline_build_failed",
      `disposable ${buildScript} failed`,
    );
    const disposableFontPaths = await inspectFontsV1(disposable, adapter);
    await assertBrowserLaunchesV1(adapter, browsers, disposableFontPaths);
  } catch (error) {
    if (error instanceof ExternalPreconditionError) throw error;
    fail("external_precondition.offline_install_failed", detailFrom(error));
  } finally {
    if (disposable !== undefined) {
      try {
        await adapter.removeDisposableSource(disposable);
      } catch {
        // A failed cleanup must not mask the primary precondition result.
      }
    }
  }
}

export const goalMaterializationWorkflowSupportV1 = Object.freeze({
  assertCleanWorktreeV1,
  assertDisposableVerificationV1,
  assertHostClosureV1,
  fail,
  inspectBrowsersV1,
  inspectFontsV1,
  inspectRepositoryPreconditionsV1,
  readBranchV1,
  readHeadV1,
  requireSuccess,
  run,
});

export async function verifyGoalMaterializationV1(
  root: string,
  adapter: GoalMaterializationAdapterV1 = createNodeGoalMaterializationAdapterV1(root),
): Promise<GoalMaterializationAttestationV1> {
  const repository = await inspectRepositoryPreconditionsV1(root, adapter);
  const attestation = await readAttestationV1(root, adapter);
  if (attestation.branch !== repository.branch) {
    fail("external_precondition.git_branch_invalid", "attested branch differs from current branch");
  }
  if (attestation.platform !== adapter.platform || attestation.arch !== adapter.arch) {
    fail("external_precondition.host_platform_mismatch", "attested host platform differs");
  }
  if (
    attestation.materializationDigest !== repository.contract.materializationDigest ||
    attestation.packageClosureDigest !== repository.contract.packageClosureDigest
  ) {
    fail("external_precondition.materialization_stale", "attested contract digest is stale");
  }
  await assertAncestorV1(root, adapter, attestation.materializationBaseCommit, repository.head);
  await assertHostClosureV1(adapter, repository.contract);
  const browsers = await inspectBrowsersV1(adapter, repository.contract);
  for (const browser of browserNamesV1) {
    if (attestation.browsers[browser].revision !== browsers[browser].revision) {
      fail(
        "external_precondition.browser_revision_mismatch",
        `${browser} differs from attestation`,
      );
    }
  }
  const fontPaths = await inspectFontsV1(root, adapter);
  if (fontPaths.length < 4) {
    fail("external_precondition.visual_font_missing", "host font inspection is incomplete");
  }
  await assertDisposableVerificationV1(root, adapter, "build", browsers);
  await assertCleanWorktreeV1(root, adapter);
  const finalBranch = await readBranchV1(root, adapter);
  if (finalBranch !== repository.branch) {
    fail("external_precondition.git_branch_invalid", "branch changed during verification");
  }
  const finalHead = await readHeadV1(root, adapter);
  if (finalHead !== repository.head) {
    fail("external_precondition.phase_base_mismatch", "HEAD changed during verification");
  }
  return attestation;
}

function appendOutput(current: string, chunk: Buffer): string {
  const remaining = commandOutputLimitV1 - Buffer.byteLength(current);
  if (remaining <= 0) return current;
  return current + chunk.subarray(0, remaining).toString("utf8");
}

async function runNodeCommandV1(
  command: GoalMaterializationCommandV1,
): Promise<GoalMaterializationCommandResultV1> {
  const environment: NodeJS.ProcessEnv = { ...process.env, CI: "1", GIT_OPTIONAL_LOCKS: "0" };
  if (command.network === "forbidden") {
    environment.PNPM_CONFIG_OFFLINE = "true";
    environment.npm_config_offline = "true";
    environment.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
  } else {
    delete environment.PNPM_CONFIG_OFFLINE;
    delete environment.npm_config_offline;
    delete environment.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD;
  }
  return new Promise((resolveResult) => {
    const child = spawn(command.executable, [...command.args], {
      cwd: command.cwd,
      env: environment,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const finish = (result: GoalMaterializationCommandResultV1): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolveResult(result);
    };
    child.stdout.on("data", (chunk: Buffer) => {
      stdout = appendOutput(stdout, chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = appendOutput(stderr, chunk);
    });
    timeout = setTimeout(() => {
      child.kill("SIGKILL");
      child.stdout.destroy();
      child.stderr.destroy();
      child.unref();
      finish({ exitCode: 124, stderr: `${stderr}\ncommand timed out`, stdout });
    }, commandTimeoutMillisecondsV1);
    child.once("error", (error) => {
      finish({ exitCode: 127, stderr: error.message, stdout });
    });
    child.once("close", (code) => {
      finish({ exitCode: code ?? 1, stderr, stdout });
    });
  });
}

async function bindAndClosePortV1(binding: {
  readonly host: string;
  readonly port: number;
}): Promise<void> {
  await new Promise<void>((resolveBinding, rejectBinding) => {
    const server = createServer();
    server.unref();
    server.once("error", rejectBinding);
    server.listen({ exclusive: true, host: binding.host, port: binding.port }, () => {
      server.close((error) => (error === undefined ? resolveBinding() : rejectBinding(error)));
    });
  });
}

async function existsV1(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function safeTrackedPathV1(root: string, trackedPath: string): string | undefined {
  if (
    trackedPath.length === 0 ||
    isAbsolute(trackedPath) ||
    trackedPath.split("/").some((part) => part === "..")
  ) {
    throw new TypeError(`unsafe tracked path: ${trackedPath}`);
  }
  if (
    trackedPath === "references" ||
    trackedPath.startsWith("references/") ||
    trackedPath === "art-source/aigc" ||
    trackedPath.startsWith("art-source/aigc/")
  ) {
    return undefined;
  }
  const absolute = resolve(root, trackedPath);
  const relativePath = relative(root, absolute);
  if (relativePath.startsWith(`..${sep}`) || relativePath === "..") {
    throw new TypeError(`tracked path escapes root: ${trackedPath}`);
  }
  return absolute;
}

async function createTrackedDisposableSourceV1(root: string): Promise<string> {
  const listing = await runNodeCommandV1({
    executable: "git",
    args: ["ls-files", "-z", "--cached"],
    cwd: root,
    network: "forbidden",
  });
  if (listing.exitCode !== 0) throw new Error(`git ls-files failed: ${listing.stderr}`);
  const parent = await mkdtemp(resolve(tmpdir(), "project-tavern-materialization-"));
  const destination = resolve(parent, "source");
  await mkdir(destination, { recursive: true });
  try {
    for (const trackedPath of listing.stdout.split("\0").filter((path) => path.length > 0)) {
      const source = safeTrackedPathV1(root, trackedPath);
      if (source === undefined) continue;
      const target = resolve(destination, trackedPath);
      await mkdir(dirname(target), { recursive: true });
      const metadata = await lstat(source);
      if (metadata.isSymbolicLink()) {
        const link = await readlink(source);
        if (isAbsolute(link)) throw new TypeError(`tracked symlink is absolute: ${trackedPath}`);
        const resolvedLink = resolve(dirname(source), link);
        const relativeLink = relative(root, resolvedLink);
        if (
          relativeLink === ".." ||
          relativeLink.startsWith(`..${sep}`) ||
          relativeLink === "references" ||
          relativeLink.startsWith(`references${sep}`) ||
          relativeLink === ["art-source", "aigc"].join(sep) ||
          relativeLink.startsWith(`art-source${sep}aigc${sep}`)
        ) {
          throw new TypeError(
            `tracked symlink target is outside the disposable closure: ${trackedPath}`,
          );
        }
        await symlink(link, target);
      } else if (metadata.isFile()) {
        await copyFile(source, target);
        await chmod(target, metadata.mode & 0o777);
      } else {
        throw new TypeError(`tracked entry is not a file or symlink: ${trackedPath}`);
      }
    }
    return destination;
  } catch (error) {
    await rm(parent, { force: true, recursive: true });
    throw error;
  }
}

async function inspectInstalledBrowserV1(
  browser: (typeof browserNamesV1)[number],
): Promise<GoalBrowserInspectionV1> {
  const playwright = await import("@playwright/test");
  const executablePath = playwright[browser].executablePath();
  const match = new RegExp(`(?:^|[\\/])${browser}-(\\d+)(?:[\\/]|$)`, "u").exec(executablePath);
  return {
    executablePath: (await existsV1(executablePath)) ? executablePath : undefined,
    revision: match?.[1] ?? "unknown",
  };
}

async function probeFontCssV1(cssPath: string): Promise<readonly string[]> {
  const css = await readFile(cssPath, "utf8");
  const filesRoot = resolve(dirname(cssPath), "files");
  const paths: string[] = [];
  for (const match of css.matchAll(/url\((?:['"])?([^'")]+)(?:['"])?\)/gu)) {
    const reference = match[1];
    if (reference === undefined) continue;
    const path = resolve(dirname(cssPath), reference);
    if (!path.startsWith(`${filesRoot}${sep}`) || ![".woff", ".woff2"].includes(extname(path))) {
      throw new TypeError(`font CSS contains an unsupported URL: ${reference}`);
    }
    const bytes = await readFile(path);
    if (bytes.byteLength === 0) throw new TypeError(`font binary is empty: ${path}`);
    paths.push(path);
  }
  return [...new Set(paths)];
}

async function launchAndLoadFontsV1(
  browserName: (typeof browserNamesV1)[number],
  executablePath: string,
  fontPaths: readonly string[],
): Promise<{ readonly fontLoaded: boolean }> {
  const playwright = await import("@playwright/test");
  const browser = await playwright[browserName].launch({ executablePath });
  try {
    const page = await browser.newPage();
    try {
      const faces: string[] = [];
      const requests: Array<{ readonly family: string; readonly weight: string }> = [];
      for (const [index, path] of fontPaths.entries()) {
        const bytes = await readFile(path);
        const format = extname(path) === ".woff2" ? "woff2" : "woff";
        const family = `GoalMaterializationFont${index}`;
        const weight = /-(400|700)-normal\.(?:woff2?|woff)$/u.exec(path)?.[1];
        if (weight === undefined) throw new TypeError(`unexpected visual font path: ${path}`);
        requests.push({ family, weight });
        faces.push(
          `@font-face{font-family:'${family}';src:url(data:font/${format};base64,${Buffer.from(bytes).toString("base64")}) format('${format}');font-weight:${weight};font-style:normal}`,
        );
      }
      await page.setContent(`<style>${faces.join("")}</style><p id="sample">旅店物化验证</p>`, {
        waitUntil: "load",
      });
      const fontLoaded = await page.evaluate(async (requestedFonts) => {
        const loaded = await Promise.all(
          requestedFonts.map(({ family, weight }) =>
            document.fonts.load(`${weight} 16px "${family}"`, "旅店"),
          ),
        );
        await document.fonts.ready;
        return loaded.every((fontFaces, index) => {
          const request = requestedFonts[index];
          return (
            request !== undefined &&
            fontFaces.length > 0 &&
            document.fonts.check(`${request.weight} 16px "${request.family}"`, "旅店")
          );
        });
      }, requests);
      return { fontLoaded };
    } catch {
      return { fontLoaded: false };
    }
  } finally {
    await browser.close();
  }
}

export function createNodeGoalMaterializationAdapterV1(root: string): GoalMaterializationAdapterV1 {
  return {
    arch: hostArch(),
    bindPort: bindAndClosePortV1,
    createDisposableSource: createTrackedDisposableSourceV1,
    diskFreeBytes: async (path) => {
      const stats = await statfs(path);
      const available = stats.bavail * stats.bsize;
      return Math.min(Number.MAX_SAFE_INTEGER, available);
    },
    ensureDirectory: async (path) => {
      await mkdir(path, { recursive: true });
    },
    hostPackageClosureAvailable: async (contract) => {
      const store = await runNodeCommandV1({
        executable: "pnpm",
        args: ["store", "path", "--silent"],
        cwd: root,
        network: "forbidden",
      });
      if (store.exitCode !== 0 || !(await existsV1(store.stdout.trim()))) return false;
      const status = await runNodeCommandV1({
        executable: "pnpm",
        args: ["store", "status", "--silent"],
        cwd: root,
        network: "forbidden",
      });
      if (status.exitCode !== 0) return false;
      try {
        const virtualLock = await readFile(resolve(root, "node_modules/.pnpm/lock.yaml"), "utf8");
        const closure = deriveExternalPackageClosureV1(virtualLock);
        return computePackageClosureDigestV1(closure) === contract.packageClosureDigest;
      } catch {
        return false;
      }
    },
    inspectBrowser: inspectInstalledBrowserV1,
    launchBrowser: launchAndLoadFontsV1,
    nodeVersion: process.version,
    openExclusive: async (path) => {
      const handle = await open(path, "wx", 0o600);
      return {
        close: async () => handle.close(),
        sync: async () => handle.sync(),
        write: async (bytes) => {
          await handle.writeFile(bytes);
        },
      };
    },
    platform: hostPlatform(),
    probeFont: probeFontCssV1,
    readFile: async (path) => readFile(path),
    readMaterializationContract: async (path) => readMaterializationContractV1(path),
    remove: async (path) => rm(path, { force: true }),
    removeDisposableSource: async (path) => rm(dirname(path), { force: true, recursive: true }),
    rename: async (from, to) => rename(from, to),
    run: runNodeCommandV1,
    syncDirectory: async (path) => {
      const handle = await open(path, "r");
      try {
        await handle.sync();
      } finally {
        await handle.close();
      }
    },
    tempDirectory: tmpdir(),
    uniqueSuffix: () => `${process.pid}-${randomUUID()}`,
  };
}

const isMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  if (process.argv.length !== 2) throw new TypeError("usage: verify-materialization.mts");
  const root = resolve(import.meta.dirname, "../..");
  const result = await verifyGoalMaterializationV1(root);
  console.log(`goal materialization verified ${result.materializationDigest}`);
}
