// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { ArtifactToolVersionsV1, VerifiedArchiveBuildInputV1 } from "./build-artifact.mjs";
import type { ArtifactManifestEntryV1 } from "./create-artifact-manifest.mjs";

const buildArtifactModuleV1 = (await import(
  new URL("./build-artifact.mts", import.meta.url).href
)) as typeof import("./build-artifact.mjs");
const manifestModuleV1 = (await import(
  new URL("./create-artifact-manifest.mts", import.meta.url).href
)) as typeof import("./create-artifact-manifest.mjs");
const verifierModuleV1 = (await import(
  new URL("./verify-poc-artifact.mts", import.meta.url).href
)) as typeof import("./verify-poc-artifact.mjs");

type DigestV1 = `sha256:${string}`;

export interface ArtifactComparisonResultV1 {
  readonly differences: readonly string[];
  readonly equal: boolean;
}

export interface ReproducibleCommandV1 {
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
  readonly executable: string;
  readonly input?: Uint8Array;
  readonly shell: false;
}

export interface ReproducibleCommandResultV1 {
  readonly exitCode: number;
  readonly stderr: Uint8Array;
  readonly stdout: Uint8Array;
}

export interface ReproducibleSourceAuthorityV1 {
  readonly branch: string;
  readonly materializationBaseCommit: string;
  readonly materializationDigest: DigestV1;
  readonly packageClosureDigest: DigestV1;
  readonly tools: ArtifactToolVersionsV1;
}

export interface ReproducibleSourceInspectionPortsV1 {
  readonly readSourceAuthority: () => Promise<ReproducibleSourceAuthorityV1>;
  readonly repositoryRoot: string;
  readonly runCommand: (command: ReproducibleCommandV1) => Promise<ReproducibleCommandResultV1>;
}

export interface FrozenReproducibleSourceV1 extends ReproducibleSourceAuthorityV1 {
  readonly sourceCommit: string;
  readonly sourceTree: string;
}

export interface ReproducibleBuildPortsV1 extends ReproducibleSourceInspectionPortsV1 {
  readonly createTemporaryDirectory: () => Promise<string>;
  readonly removeTemporaryDirectory: (path: string) => Promise<void>;
  readonly verifyArtifact: (path: string) => Promise<void>;
}

export interface ReproducibleBuildResultV1 {
  readonly manifestDigest: DigestV1;
  readonly materializationDigest: DigestV1;
  readonly sourceCommit: string;
  readonly sourceTree: string;
}

export interface ArtifactSnapshotV1 {
  readonly buildInputBytes: Uint8Array;
  readonly files: readonly ArtifactManifestEntryV1[];
  readonly manifestBytes: Uint8Array;
  readonly manifestDigest: DigestV1;
}

export interface ReproducibleArtifactSetPortsV1 {
  readonly snapshotArtifact: (directory: string) => Promise<ArtifactSnapshotV1>;
}

export interface ReproducibleCommandExecutionPortsV1 {
  readonly outputLimitBytes: number;
  readonly spawn: typeof spawn;
}

export interface TrackedTreeEntryV1 {
  readonly mode: "100644" | "100755" | "120000";
  readonly objectId: string;
  readonly path: string;
}

export interface PreparedArchiveV1 {
  readonly archiveDigest: DigestV1;
  readonly archivePath: string;
  readonly sourceRoot: string;
}

export interface PinnedStoreV1 {
  readonly dev: number;
  readonly ino: number;
  readonly path: string;
  readonly realPath: string;
}

export interface ReproducibleBuildStagePortsV1 {
  readonly installAndBuildArchive: (input: {
    readonly archive: PreparedArchiveV1;
    readonly ports: ReproducibleBuildPortsV1;
    readonly source: FrozenReproducibleSourceV1;
    readonly store: PinnedStoreV1;
    readonly trackedEntries: readonly TrackedTreeEntryV1[];
  }) => Promise<string>;
  readonly prepareArchive: (input: {
    readonly index: "a" | "b";
    readonly ports: ReproducibleBuildPortsV1;
    readonly source: FrozenReproducibleSourceV1;
    readonly temporaryRoot: string;
    readonly trackedEntries: readonly TrackedTreeEntryV1[];
  }) => Promise<PreparedArchiveV1>;
}

const repositoryRootV1 = resolve(import.meta.dirname, "../..");
const verifiedArchiveInputRelativeV1 = ".project-tavern/reproducible-build-input.v1.json";
const objectIdPatternV1 = /^[0-9a-f]{40}$/u;
const digestPatternV1 = /^sha256:[0-9a-f]{64}$/u;
const decoderV1 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const encoderV1 = new TextEncoder();
const commandOutputLimitV1 = 128 * 1024 * 1024;
const maxVerifiedInputBytesV1 = 64 * 1024;

function failV1(code: string, detail: string): never {
  throw new TypeError(`${code}: ${detail}`);
}

function detailFromV1(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function compareTextV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function equalBytesV1(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

function digestBytesV1(bytes: Uint8Array): DigestV1 {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function isPlainObjectV1(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactDataObjectV1(
  value: unknown,
  expectedKeys: readonly string[],
  code: string,
  path: string,
): Record<string, unknown> {
  if (!isPlainObjectV1(value)) failV1(code, `${path} must be a plain object`);
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== expectedKeys.length ||
    !keys.every((key) => typeof key === "string" && expectedKeys.includes(key))
  ) {
    failV1(code, `${path} has unexpected or missing fields`);
  }
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      failV1(code, `${path}/${key} must be an enumerable data property`);
    }
  }
  return value;
}

function decodeOneLineV1(bytes: Uint8Array, code: string, path: string): string {
  let value: string;
  try {
    value = decoderV1.decode(bytes).trim();
  } catch (error) {
    return failV1(code, `${path} is not UTF-8: ${detailFromV1(error)}`);
  }
  if (value.length === 0 || value.includes("\n") || value.includes("\r")) {
    failV1(code, `${path} must be exactly one line`);
  }
  return value;
}

function assertObjectIdV1(value: unknown, code: string, path: string): asserts value is string {
  if (typeof value !== "string" || !objectIdPatternV1.test(value)) {
    failV1(code, `${path} must be a full lowercase Git object ID`);
  }
}

function assertDigestV1(value: unknown, code: string, path: string): asserts value is DigestV1 {
  if (typeof value !== "string" || !digestPatternV1.test(value)) {
    failV1(code, `${path} must be a SHA-256 digest`);
  }
}

function assertSafeRelativePathV1(path: string, code: string): void {
  if (
    path.length === 0 ||
    path.includes("\\") ||
    path.includes("\0") ||
    path.includes("\n") ||
    path.includes("\r") ||
    path.startsWith("/") ||
    isAbsolute(path) ||
    path.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    failV1(code, `unsafe archive path: ${JSON.stringify(path)}`);
  }
}

type ReproducibleEnvironmentProfileV1 = "archive" | "host_attestation" | "source";

function closedEnvironmentV1(
  cwd: string,
  profile: ReproducibleEnvironmentProfileV1,
): Readonly<Record<string, string>> {
  const path = process.env.PATH;
  if (path === undefined || path.length === 0) {
    failV1("release.invalid_repro_command", "PATH is unavailable");
  }
  const isolated = profile === "archive";
  const home = isolated
    ? resolve(cwd, ".project-tavern/repro-home")
    : (process.env.HOME ?? tmpdir());
  const temporary = isolated
    ? resolve(cwd, ".project-tavern/repro-tmp")
    : (process.env.TMPDIR ?? tmpdir());
  const environment: Record<string, string> = {
    CI: "1",
    GIT_NO_LAZY_FETCH: "1",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_OPTIONAL_LOCKS: "0",
    HOME: home,
    LANG: "C",
    LC_ALL: "C",
    PATH: path,
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
    PNPM_CONFIG_OFFLINE: "true",
    TMPDIR: temporary,
    TZ: "UTC",
    npm_config_offline: "true",
  };
  if (profile !== "host_attestation") {
    environment.GIT_CONFIG_GLOBAL = "/dev/null";
    environment.GIT_CONFIG_NOSYSTEM = "1";
    environment.GIT_CONFIG_SYSTEM = "/dev/null";
  }
  if (isolated) {
    environment.XDG_CACHE_HOME = resolve(home, ".cache");
    environment.XDG_CONFIG_HOME = resolve(home, ".config");
    environment.XDG_DATA_HOME = resolve(home, ".local/share");
  } else {
    for (const key of ["XDG_CACHE_HOME", "XDG_CONFIG_HOME", "XDG_DATA_HOME"] as const) {
      const value = process.env[key];
      if (value !== undefined && value.length > 0) environment[key] = value;
    }
  }
  return Object.freeze(environment);
}

function commandV1(input: {
  readonly args: readonly string[];
  readonly cwd: string;
  readonly executable: string;
  readonly input?: Uint8Array;
  readonly profile?: ReproducibleEnvironmentProfileV1;
}): ReproducibleCommandV1 {
  const base = {
    args: Object.freeze([...input.args]),
    cwd: resolve(input.cwd),
    env: closedEnvironmentV1(input.cwd, input.profile ?? "source"),
    executable: input.executable,
    shell: false as const,
  };
  return Object.freeze(
    input.input === undefined ? base : { ...base, input: new Uint8Array(input.input) },
  );
}

const nodeCommandExecutionPortsV1: ReproducibleCommandExecutionPortsV1 = Object.freeze({
  outputLimitBytes: commandOutputLimitV1,
  spawn,
});

export async function runNodeCommandV1(
  command: ReproducibleCommandV1,
  execution: ReproducibleCommandExecutionPortsV1 = nodeCommandExecutionPortsV1,
): Promise<ReproducibleCommandResultV1> {
  return await new Promise((resolveResult, rejectResult) => {
    if (typeof command.executable !== "string") {
      rejectResult(new TypeError("release.invalid_repro_command: shell commands are forbidden"));
      return;
    }
    const hasInput = command.input !== undefined;
    const child = execution.spawn(command.executable, [...command.args], {
      cwd: command.cwd,
      env: { ...command.env },
      shell: false,
      stdio: [hasInput ? "pipe" : "ignore", "pipe", "pipe"],
    });
    const stdin = child.stdin;
    const stdoutStream = child.stdout;
    const stderrStream = child.stderr;
    if (stdoutStream === null || stderrStream === null || (hasInput && stdin === null)) {
      try {
        child.kill("SIGKILL");
      } catch {
        // The invalid stdio contract remains authoritative.
      }
      rejectResult(new TypeError("release.invalid_repro_command: child stdio contract failed"));
      return;
    }
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let outputBytes = 0;
    let closed = false;
    let hasTerminalFailure = false;
    let terminalFailure: unknown;
    const requestFailureV1 = (error: unknown): void => {
      if (closed || hasTerminalFailure) return;
      hasTerminalFailure = true;
      terminalFailure = error;
      try {
        child.kill("SIGKILL");
      } catch {
        // The first terminal failure remains authoritative; close still owns settlement.
      }
    };
    const collectV1 = (target: Buffer[], chunk: Buffer): void => {
      if (hasTerminalFailure) return;
      outputBytes += chunk.byteLength;
      if (outputBytes > execution.outputLimitBytes) {
        requestFailureV1(new TypeError("release.repro_command_output_too_large"));
        return;
      }
      target.push(chunk);
    };
    stdoutStream.on("data", (chunk: Buffer) => collectV1(stdout, chunk));
    stderrStream.on("data", (chunk: Buffer) => collectV1(stderr, chunk));
    child.once("error", requestFailureV1);
    child.once("close", (code, signal) => {
      if (closed) return;
      closed = true;
      if (hasTerminalFailure) {
        rejectResult(terminalFailure);
        return;
      }
      resolveResult({
        exitCode: signal === null ? (code ?? 1) : 128,
        stderr: Buffer.concat(stderr),
        stdout: Buffer.concat(stdout),
      });
    });
    if (hasInput && stdin !== null) {
      stdin.once("error", requestFailureV1);
      try {
        stdin.end(command.input);
      } catch (error) {
        requestFailureV1(error);
      }
    }
  });
}

async function requireCommandV1(
  ports: Pick<ReproducibleSourceInspectionPortsV1, "runCommand">,
  command: ReproducibleCommandV1,
  code: string,
): Promise<Uint8Array> {
  const result = await ports.runCommand(command);
  if (result.exitCode !== 0) {
    const output = (["stdout", "stderr"] as const)
      .map((stream) => {
        if (result[stream].byteLength === 0) return "";
        try {
          const decoded = decoderV1.decode(result[stream]).trim();
          return decoded.length === 0 ? "" : `${stream}: ${decoded}`;
        } catch {
          return `${stream}: non-UTF-8 output`;
        }
      })
      .filter((value) => value.length > 0)
      .join("; ");
    failV1(
      code,
      `${command.executable} exited ${String(result.exitCode)}${output.length === 0 ? "" : `: ${output}`}`,
    );
  }
  return result.stdout;
}

export function createArchiveInstallInvocationV1(input: {
  readonly cwd: string;
  readonly frozenStoreDir: string;
  readonly storeDir: string;
}): ReproducibleCommandV1 {
  const record = assertExactDataObjectV1(
    input,
    ["cwd", "frozenStoreDir", "storeDir"],
    "release.invalid_repro_command",
    "archiveInstall",
  );
  if (
    typeof record.cwd !== "string" ||
    typeof record.frozenStoreDir !== "string" ||
    typeof record.storeDir !== "string" ||
    !isAbsolute(record.cwd) ||
    !isAbsolute(record.storeDir) ||
    resolve(record.frozenStoreDir) !== record.frozenStoreDir ||
    resolve(record.storeDir) !== record.storeDir ||
    record.storeDir !== record.frozenStoreDir
  ) {
    failV1("release.invalid_repro_command", "archive install must use one frozen absolute store");
  }
  return commandV1({
    args: ["install", "--offline", "--frozen-lockfile", "--store-dir", record.storeDir],
    cwd: record.cwd,
    executable: "pnpm",
    profile: "archive",
  });
}

export function createVerifiedArchiveChildInvocationV1(input: {
  readonly cwd: string;
}): ReproducibleCommandV1 {
  const record = assertExactDataObjectV1(
    input,
    ["cwd"],
    "release.invalid_repro_command",
    "archiveChild",
  );
  if (typeof record.cwd !== "string" || !isAbsolute(record.cwd)) {
    failV1("release.invalid_repro_command", "archive child cwd must be absolute");
  }
  return commandV1({
    args: [
      "--experimental-strip-types",
      "scripts/release/build-reproducibly.mts",
      "--internal-build-verified-archive",
    ],
    cwd: record.cwd,
    executable: process.execPath,
    profile: "archive",
  });
}

export function parseReproducibleBuildArgumentsV1(args: readonly string[]): {
  readonly mode: "outer" | "verified_archive_child";
} {
  if (args.length === 0) return Object.freeze({ mode: "outer" });
  if (args.length === 1 && args[0] === "--internal-build-verified-archive") {
    return Object.freeze({ mode: "verified_archive_child" });
  }
  return failV1(
    "release.invalid_repro_arguments",
    "release:repro accepts no source, tree, materialization, or input overrides",
  );
}

export async function snapshotArtifactV1(directory: string): Promise<ArtifactSnapshotV1> {
  const manifest = await manifestModuleV1.createArtifactManifestV1(directory);
  const expectedManifestBytes = manifestModuleV1.artifactManifestBytesV1(manifest);
  const [actualManifestBytes, buildInputBytes] = await Promise.all([
    manifestModuleV1.readArtifactPayloadBytesV1(directory, manifestModuleV1.artifactManifestFileV1),
    manifestModuleV1.readArtifactPayloadBytesV1(directory, "build-input.json"),
  ]);
  if (!equalBytesV1(expectedManifestBytes, actualManifestBytes)) {
    failV1(
      "release.repro_manifest_mismatch",
      "detached artifact-manifest.json bytes do not describe the exact payload",
    );
  }
  const buildInputEntry = manifest.files.find((entry) => entry.path === "build-input.json");
  if (
    buildInputEntry === undefined ||
    buildInputEntry.byteLength !== buildInputBytes.byteLength ||
    buildInputEntry.digest !== digestBytesV1(buildInputBytes)
  ) {
    failV1(
      "release.repro_manifest_mismatch",
      "captured build-input.json bytes do not match the artifact payload tuple",
    );
  }
  return Object.freeze({
    buildInputBytes,
    files: manifest.files,
    manifestBytes: actualManifestBytes,
    manifestDigest: digestBytesV1(actualManifestBytes),
  });
}

function compareArtifactSnapshotsV1(
  leftSnapshot: ArtifactSnapshotV1,
  rightSnapshot: ArtifactSnapshotV1,
): ArtifactComparisonResultV1 {
  const leftByPath = new Map(leftSnapshot.files.map((entry) => [entry.path, entry] as const));
  const rightByPath = new Map(rightSnapshot.files.map((entry) => [entry.path, entry] as const));
  const paths = [...new Set([...leftByPath.keys(), ...rightByPath.keys()])].sort(compareTextV1);
  const differences = paths.filter((path) => {
    const leftEntry = leftByPath.get(path);
    const rightEntry = rightByPath.get(path);
    return (
      leftEntry === undefined ||
      rightEntry === undefined ||
      leftEntry.byteLength !== rightEntry.byteLength ||
      leftEntry.digest !== rightEntry.digest
    );
  });
  if (
    differences.length === 0 &&
    (leftSnapshot.manifestDigest !== rightSnapshot.manifestDigest ||
      !equalBytesV1(leftSnapshot.manifestBytes, rightSnapshot.manifestBytes))
  ) {
    failV1(
      "release.repro_manifest_mismatch",
      "detached manifest digests differ for equal payload tuples",
    );
  }
  return Object.freeze({
    differences: Object.freeze(differences),
    equal: differences.length === 0,
  });
}

export async function compareArtifactDirectoriesV1(
  left: string,
  right: string,
): Promise<ArtifactComparisonResultV1> {
  const [leftSnapshot, rightSnapshot] = await Promise.all([
    snapshotArtifactV1(left),
    snapshotArtifactV1(right),
  ]);
  return compareArtifactSnapshotsV1(leftSnapshot, rightSnapshot);
}

function decodeArtifactAuthorityV1(
  bytes: Uint8Array,
  expected: Readonly<{
    materializationDigest: DigestV1;
    sourceCommit: string;
    sourceTree: string;
    tools: ArtifactToolVersionsV1;
  }>,
  label: string,
): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoderV1.decode(bytes));
  } catch (error) {
    return failV1(
      "release.repro_handoff_provenance",
      `${label} build-input is invalid: ${detailFromV1(error)}`,
    );
  }
  if (!isPlainObjectV1(parsed)) {
    failV1("release.repro_handoff_provenance", `${label} build-input must be an object`);
  }
  const tools = isPlainObjectV1(parsed.tools) ? parsed.tools : undefined;
  if (
    parsed.provenanceMode !== "clean_commit" ||
    parsed.sourceCommit !== expected.sourceCommit ||
    parsed.sourceTree !== expected.sourceTree ||
    parsed.materializationDigest !== expected.materializationDigest ||
    tools?.node !== expected.tools.node ||
    tools?.pnpm !== expected.tools.pnpm ||
    tools?.typescript !== expected.tools.typescript ||
    tools?.vite !== expected.tools.vite
  ) {
    failV1(
      "release.repro_handoff_provenance",
      `${label} does not carry the frozen clean source/materialization/tool identity`,
    );
  }
}

async function assertArtifactAuthorityV1(
  directory: string,
  expected: Readonly<{
    materializationDigest: DigestV1;
    sourceCommit: string;
    sourceTree: string;
    tools: ArtifactToolVersionsV1;
  }>,
  label: string,
): Promise<void> {
  const bytes = await manifestModuleV1.readArtifactPayloadBytesV1(directory, "build-input.json");
  decodeArtifactAuthorityV1(bytes, expected, label);
}

export async function assertReproducibleArtifactSetV1(
  input: {
    readonly buildA: string;
    readonly buildB: string;
    readonly expected: Readonly<{
      materializationDigest: DigestV1;
      sourceCommit: string;
      sourceTree: string;
      tools: ArtifactToolVersionsV1;
    }>;
    readonly handoff: string;
  },
  ports: ReproducibleArtifactSetPortsV1 = Object.freeze({
    snapshotArtifact: snapshotArtifactV1,
  }),
): Promise<{ readonly manifestDigest: DigestV1 }> {
  const record = assertExactDataObjectV1(
    input,
    ["buildA", "buildB", "expected", "handoff"],
    "release.repro_artifact_mismatch",
    "reproducibilitySet",
  );
  if (
    typeof record.buildA !== "string" ||
    typeof record.buildB !== "string" ||
    typeof record.handoff !== "string" ||
    !isPlainObjectV1(record.expected)
  ) {
    failV1("release.repro_artifact_mismatch", "reproducibility set is malformed");
  }
  const expected = input.expected;
  const [buildASnapshot, buildBSnapshot, handoffSnapshot] = await Promise.all([
    ports.snapshotArtifact(input.buildA),
    ports.snapshotArtifact(input.buildB),
    ports.snapshotArtifact(input.handoff),
  ]);
  decodeArtifactAuthorityV1(buildASnapshot.buildInputBytes, expected, "archive A");
  decodeArtifactAuthorityV1(buildBSnapshot.buildInputBytes, expected, "archive B");
  decodeArtifactAuthorityV1(handoffSnapshot.buildInputBytes, expected, "handoff");
  const ab = compareArtifactSnapshotsV1(buildASnapshot, buildBSnapshot);
  const ah = compareArtifactSnapshotsV1(buildASnapshot, handoffSnapshot);
  const bh = compareArtifactSnapshotsV1(buildBSnapshot, handoffSnapshot);
  if (!ab.equal || !ah.equal || !bh.equal) {
    const differences = [...new Set([...ab.differences, ...ah.differences, ...bh.differences])]
      .sort(compareTextV1)
      .join(", ");
    failV1(
      "release.repro_artifact_mismatch",
      `archive A, archive B, and handoff differ${differences.length === 0 ? "" : `: ${differences}`}`,
    );
  }
  return Object.freeze({
    manifestDigest: handoffSnapshot.manifestDigest,
  });
}

export async function inspectReproducibleSourceV1(
  ports: ReproducibleSourceInspectionPortsV1,
): Promise<FrozenReproducibleSourceV1> {
  const root = resolve(ports.repositoryRoot);
  await requireCommandV1(
    ports,
    commandV1({
      args: ["verify:materialization"],
      cwd: root,
      executable: "pnpm",
      profile: "host_attestation",
    }),
    "release.repro_materialization_invalid",
  );
  const authority = await ports.readSourceAuthority();
  assertObjectIdV1(
    authority.materializationBaseCommit,
    "release.repro_materialization_stale",
    "materializationBaseCommit",
  );
  assertDigestV1(
    authority.materializationDigest,
    "release.repro_materialization_stale",
    "materializationDigest",
  );
  assertDigestV1(
    authority.packageClosureDigest,
    "release.repro_materialization_stale",
    "packageClosureDigest",
  );
  const branchResult = await ports.runCommand(
    commandV1({
      args: ["symbolic-ref", "--quiet", "--short", "HEAD"],
      cwd: root,
      executable: "git",
    }),
  );
  if (branchResult.exitCode !== 0) {
    failV1("release.repro_detached_head", "HEAD must be attached to its attested branch");
  }
  const branch = decodeOneLineV1(branchResult.stdout, "release.repro_detached_head", "branch");
  if (branch !== authority.branch) {
    failV1(
      "release.repro_materialization_stale",
      "attached branch differs from the materialization attestation",
    );
  }
  const [headBytes, treeBytes, statusBytes] = await Promise.all([
    requireCommandV1(
      ports,
      commandV1({ args: ["rev-parse", "HEAD"], cwd: root, executable: "git" }),
      "release.repro_source_identity_invalid",
    ),
    requireCommandV1(
      ports,
      commandV1({ args: ["rev-parse", "HEAD^{tree}"], cwd: root, executable: "git" }),
      "release.repro_source_identity_invalid",
    ),
    requireCommandV1(
      ports,
      commandV1({
        args: ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
        cwd: root,
        executable: "git",
      }),
      "release.repro_source_identity_invalid",
    ),
  ]);
  if (statusBytes.byteLength !== 0) {
    failV1("release.repro_dirty_source", "reproducibility requires an exact clean source");
  }
  const sourceCommit = decodeOneLineV1(headBytes, "release.repro_source_identity_invalid", "HEAD");
  const sourceTree = decodeOneLineV1(
    treeBytes,
    "release.repro_source_identity_invalid",
    "HEAD tree",
  );
  assertObjectIdV1(sourceCommit, "release.repro_source_identity_invalid", "sourceCommit");
  assertObjectIdV1(sourceTree, "release.repro_source_identity_invalid", "sourceTree");
  const ancestor = await ports.runCommand(
    commandV1({
      args: ["merge-base", "--is-ancestor", authority.materializationBaseCommit, sourceCommit],
      cwd: root,
      executable: "git",
    }),
  );
  if (ancestor.exitCode !== 0) {
    failV1(
      "release.repro_source_not_descendant",
      "source does not descend from the materialization checkpoint",
    );
  }
  const [finalHead, finalTree, finalStatus] = await Promise.all([
    requireCommandV1(
      ports,
      commandV1({ args: ["rev-parse", "HEAD"], cwd: root, executable: "git" }),
      "release.repro_source_changed",
    ),
    requireCommandV1(
      ports,
      commandV1({ args: ["rev-parse", "HEAD^{tree}"], cwd: root, executable: "git" }),
      "release.repro_source_changed",
    ),
    requireCommandV1(
      ports,
      commandV1({
        args: ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
        cwd: root,
        executable: "git",
      }),
      "release.repro_source_changed",
    ),
  ]);
  if (
    decodeOneLineV1(finalHead, "release.repro_source_changed", "final HEAD") !== sourceCommit ||
    decodeOneLineV1(finalTree, "release.repro_source_changed", "final tree") !== sourceTree ||
    finalStatus.byteLength !== 0
  ) {
    failV1("release.repro_source_changed", "source changed while authority was frozen");
  }
  return Object.freeze({
    ...authority,
    branch,
    sourceCommit,
    sourceTree,
  });
}

function parseTrackedTreeEntriesV1(bytes: Uint8Array): readonly TrackedTreeEntryV1[] {
  let text: string;
  try {
    text = decoderV1.decode(bytes);
  } catch (error) {
    return failV1(
      "release.repro_tree_invalid",
      `Git tree listing is not UTF-8: ${detailFromV1(error)}`,
    );
  }
  if (text.length === 0 || !text.endsWith("\0")) {
    failV1("release.repro_tree_invalid", "Git tree listing is empty or not NUL terminated");
  }
  const entries = text
    .slice(0, -1)
    .split("\0")
    .map((record): TrackedTreeEntryV1 => {
      const first = record.indexOf("\t");
      const second = record.indexOf("\t", first + 1);
      if (first <= 0 || second <= first + 1) {
        return failV1("release.repro_tree_invalid", "Git tree record is malformed");
      }
      const mode = record.slice(0, first);
      const objectId = record.slice(first + 1, second);
      const path = record.slice(second + 1);
      if (mode !== "100644" && mode !== "100755" && mode !== "120000") {
        return failV1("release.repro_tree_invalid", `unsupported tracked mode: ${mode}`);
      }
      assertObjectIdV1(objectId, "release.repro_tree_invalid", `${path} object ID`);
      assertSafeRelativePathV1(path, "release.repro_tree_invalid");
      return Object.freeze({ mode, objectId, path });
    })
    .sort((left, right) => compareTextV1(left.path, right.path));
  for (let index = 1; index < entries.length; index += 1) {
    if (entries[index - 1]?.path === entries[index]?.path) {
      failV1("release.repro_tree_invalid", `duplicate tracked path: ${entries[index]?.path}`);
    }
  }
  return Object.freeze(entries);
}

export function validateTarArchiveV1(bytes: Uint8Array): void {
  const concretePaths = new Set<string>();
  let offset = 0;
  let sawTerminator = false;
  while (offset + 512 <= bytes.byteLength) {
    const header = bytes.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      sawTerminator = true;
      if (!bytes.subarray(offset).every((byte) => byte === 0)) {
        failV1("release.repro_archive_invalid", "tar contains data after its terminator");
      }
      break;
    }
    const textV1 = (start: number, length: number): string => {
      const field = header.subarray(start, start + length);
      const zero = field.indexOf(0);
      return decoderV1.decode(zero === -1 ? field : field.subarray(0, zero));
    };
    const storedChecksumText = textV1(148, 8).trim();
    const storedChecksum = Number.parseInt(storedChecksumText, 8);
    let checksum = 0;
    for (let index = 0; index < header.byteLength; index += 1) {
      checksum += index >= 148 && index < 156 ? 0x20 : (header[index] ?? 0);
    }
    if (!Number.isSafeInteger(storedChecksum) || storedChecksum !== checksum) {
      failV1("release.repro_archive_invalid", "tar header checksum is invalid");
    }
    const name = textV1(0, 100);
    const prefix = textV1(345, 155);
    const rawPath = prefix.length === 0 ? name : `${prefix}/${name}`;
    const typeByte = header[156] ?? 0;
    const type = typeByte === 0 ? "0" : String.fromCharCode(typeByte);
    const sizeText = textV1(124, 12).trim();
    const size = sizeText.length === 0 ? 0 : Number.parseInt(sizeText, 8);
    if (!Number.isSafeInteger(size) || size < 0) {
      failV1("release.repro_archive_invalid", "tar entry size is invalid");
    }
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    if (dataEnd > bytes.byteLength) {
      failV1("release.repro_archive_invalid", "tar entry is truncated");
    }
    if (type === "g") {
      if (!decoderV1.decode(bytes.subarray(dataStart, dataEnd)).includes("comment=")) {
        failV1("release.repro_archive_invalid", "tar global header lacks commit provenance");
      }
    } else {
      const path = type === "5" ? rawPath.replace(/\/$/u, "") : rawPath;
      assertSafeRelativePathV1(path, "release.repro_archive_invalid");
      if (
        path === ".git" ||
        path.startsWith(".git/") ||
        path === ".project-tavern/goal-materialization.json"
      ) {
        failV1("release.repro_archive_invalid", `archive contains forbidden authority: ${path}`);
      }
      if (concretePaths.has(path)) {
        failV1("release.repro_archive_invalid", `archive contains duplicate path: ${path}`);
      }
      concretePaths.add(path);
      if (type === "2") {
        const link = textV1(157, 100);
        if (link.length === 0 || isAbsolute(link) || link.includes("\\")) {
          failV1("release.repro_archive_invalid", `unsafe symlink target: ${path}`);
        }
        const target = resolve("/archive", dirname(path), link);
        if (target !== "/archive" && !target.startsWith("/archive/")) {
          failV1("release.repro_archive_invalid", `symlink escapes archive: ${path}`);
        }
      } else if (type !== "0" && type !== "5") {
        failV1("release.repro_archive_invalid", `unsupported tar entry type ${type}`);
      }
    }
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  if (!sawTerminator) {
    failV1("release.repro_archive_invalid", "tar terminator is missing");
  }
}

export async function assertForbiddenArchiveAuthorityAbsentV1(root: string): Promise<void> {
  for (const path of [".git", ".project-tavern/goal-materialization.json"] as const) {
    const metadata = await lstat(resolve(root, path)).catch((error) => {
      if (Reflect.get(Object(error), "code") === "ENOENT") return undefined;
      throw error;
    });
    if (metadata !== undefined) {
      failV1("release.repro_archive_invalid", `extracted archive contains ${path}`);
    }
  }
}

export async function verifyTrackedTreeEntriesV1(
  root: string,
  entries: readonly TrackedTreeEntryV1[],
): Promise<void> {
  for (const entry of entries) {
    const path = resolve(root, ...entry.path.split("/"));
    const relativePath = relative(root, path);
    if (relativePath === ".." || relativePath.startsWith(`..${sep}`)) {
      failV1("release.repro_tree_mismatch", `${entry.path} escaped the archive root`);
    }
    const metadata = await lstat(path).catch((error) =>
      failV1("release.repro_tree_mismatch", `${entry.path} is unavailable: ${detailFromV1(error)}`),
    );
    let bytes: Uint8Array;
    if (entry.mode === "120000") {
      if (!metadata.isSymbolicLink()) {
        failV1("release.repro_tree_mismatch", `${entry.path} is not the tracked symlink`);
      }
      const target = await readlink(path);
      const resolvedTarget = resolve(dirname(path), target);
      if (
        isAbsolute(target) ||
        (resolvedTarget !== root && !resolvedTarget.startsWith(`${root}${sep}`))
      ) {
        failV1("release.repro_tree_mismatch", `${entry.path} symlink escapes the archive`);
      }
      bytes = encoderV1.encode(target);
    } else {
      if (!metadata.isFile() || metadata.isSymbolicLink()) {
        failV1("release.repro_tree_mismatch", `${entry.path} is not the tracked file`);
      }
      const executable = (metadata.mode & 0o111) !== 0;
      if (executable !== (entry.mode === "100755")) {
        failV1("release.repro_tree_mismatch", `${entry.path} executable mode changed`);
      }
      bytes = await readFile(path);
    }
    const objectId = createHash("sha1")
      .update(`blob ${String(bytes.byteLength)}\0`)
      .update(bytes)
      .digest("hex");
    if (objectId !== entry.objectId) {
      failV1("release.repro_tree_mismatch", `${entry.path} bytes differ from the frozen tree`);
    }
  }
}

async function reconstructExtractedTreeV1(
  ports: ReproducibleBuildPortsV1,
  sourceRoot: string,
  expectedTree: string,
): Promise<void> {
  await assertForbiddenArchiveAuthorityAbsentV1(sourceRoot);
  try {
    await requireCommandV1(
      ports,
      commandV1({
        args: ["init", "--quiet", "--object-format=sha1"],
        cwd: sourceRoot,
        executable: "git",
        profile: "archive",
      }),
      "release.repro_tree_mismatch",
    );
    await requireCommandV1(
      ports,
      commandV1({
        args: ["-c", "core.autocrlf=false", "-c", "core.filemode=true", "add", "-f", "--all"],
        cwd: sourceRoot,
        executable: "git",
        profile: "archive",
      }),
      "release.repro_tree_mismatch",
    );
    const actualTree = decodeOneLineV1(
      await requireCommandV1(
        ports,
        commandV1({ args: ["write-tree"], cwd: sourceRoot, executable: "git", profile: "archive" }),
        "release.repro_tree_mismatch",
      ),
      "release.repro_tree_mismatch",
      "reconstructed tree",
    );
    if (actualTree !== expectedTree) {
      failV1(
        "release.repro_tree_mismatch",
        `reconstructed ${actualTree} instead of ${expectedTree}`,
      );
    }
  } finally {
    await rm(resolve(sourceRoot, ".git"), { force: true, recursive: true });
  }
  await assertForbiddenArchiveAuthorityAbsentV1(sourceRoot);
}

async function prepareArchiveV1(input: {
  readonly index: "a" | "b";
  readonly ports: ReproducibleBuildPortsV1;
  readonly source: FrozenReproducibleSourceV1;
  readonly temporaryRoot: string;
  readonly trackedEntries: readonly TrackedTreeEntryV1[];
}): Promise<PreparedArchiveV1> {
  const archivePath = resolve(input.temporaryRoot, `source-${input.index}.tar`);
  const sourceRoot = resolve(input.temporaryRoot, `source-${input.index}`);
  await mkdir(sourceRoot, { mode: 0o700 });
  await requireCommandV1(
    input.ports,
    commandV1({
      args: ["archive", "--format=tar", `--output=${archivePath}`, input.source.sourceCommit],
      cwd: input.ports.repositoryRoot,
      executable: "git",
    }),
    "release.repro_archive_invalid",
  );
  const archiveBytes = await readFile(archivePath);
  validateTarArchiveV1(archiveBytes);
  const archiveDigest = digestBytesV1(archiveBytes);
  const embeddedCommit = decodeOneLineV1(
    await requireCommandV1(
      input.ports,
      commandV1({
        args: ["get-tar-commit-id"],
        cwd: input.ports.repositoryRoot,
        executable: "git",
        input: archiveBytes,
      }),
      "release.repro_archive_invalid",
    ),
    "release.repro_archive_invalid",
    `archive ${input.index} embedded commit`,
  );
  if (embeddedCommit !== input.source.sourceCommit) {
    failV1("release.repro_archive_invalid", `archive ${input.index} embedded commit differs`);
  }
  await requireCommandV1(
    input.ports,
    commandV1({
      args: ["-xf", archivePath, "-C", sourceRoot],
      cwd: input.temporaryRoot,
      executable: "tar",
    }),
    "release.repro_archive_invalid",
  );
  if (digestBytesV1(await readFile(archivePath)) !== archiveDigest) {
    failV1("release.repro_archive_invalid", `archive ${input.index} changed during extraction`);
  }
  await Promise.all([
    mkdir(resolve(sourceRoot, ".project-tavern/repro-home"), {
      mode: 0o700,
      recursive: true,
    }),
    mkdir(resolve(sourceRoot, ".project-tavern/repro-tmp"), {
      mode: 0o700,
      recursive: true,
    }),
  ]);
  await reconstructExtractedTreeV1(input.ports, sourceRoot, input.source.sourceTree);
  await verifyTrackedTreeEntriesV1(sourceRoot, input.trackedEntries);
  return Object.freeze({ archiveDigest, archivePath, sourceRoot });
}

async function readVerifiedArchiveInputFileV1(root: string): Promise<VerifiedArchiveBuildInputV1> {
  const path = resolve(root, verifiedArchiveInputRelativeV1);
  const bytes = await readFile(path);
  if (bytes.byteLength === 0 || bytes.byteLength > maxVerifiedInputBytesV1) {
    failV1("release.invalid_verified_archive_input", "verified input size is invalid");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoderV1.decode(bytes));
  } catch (error) {
    return failV1(
      "release.invalid_verified_archive_input",
      `verified input is invalid JSON: ${detailFromV1(error)}`,
    );
  }
  const canonical = manifestModuleV1.canonicalArtifactJsonBytesV1(parsed);
  if (!equalBytesV1(canonical, bytes)) {
    failV1("release.invalid_verified_archive_input", "verified input is not canonical JSON");
  }
  return parsed as VerifiedArchiveBuildInputV1;
}

async function runVerifiedArchiveChildV1(): Promise<void> {
  const input = await readVerifiedArchiveInputFileV1(repositoryRootV1);
  const result = await buildArtifactModuleV1.buildArtifactFromVerifiedArchiveV1(input);
  if (
    result.provenanceMode !== "clean_commit" ||
    result.sourceCommit !== input.sourceCommit ||
    result.sourceTree !== input.sourceTree ||
    result.materializationDigest !== input.materializationDigest
  ) {
    failV1(
      "release.invalid_verified_archive_input",
      "archive builder returned different authority",
    );
  }
  console.log(`built verified archive ${result.sourceCommit} ${result.sourceGraphDigest}`);
}

async function createNodeSourceAuthorityV1(
  root: string,
  runCommand: ReproducibleSourceInspectionPortsV1["runCommand"],
): Promise<ReproducibleSourceAuthorityV1> {
  const [contractModule, attestationModule, attestationBytes, packageBytes] = await Promise.all([
    import(new URL("../preflight/materialization-contract.mts", import.meta.url).href) as Promise<
      typeof import("../preflight/materialization-contract.mjs")
    >,
    import(new URL("../preflight/verify-materialization.mts", import.meta.url).href) as Promise<
      typeof import("../preflight/verify-materialization.mjs")
    >,
    readFile(resolve(root, ".project-tavern/goal-materialization.json")),
    readFile(resolve(root, "package.json")),
  ]);
  const [contract, attestation, pnpmVersionBytes] = await Promise.all([
    contractModule.readMaterializationContractV1(root),
    Promise.resolve(attestationModule.parseGoalMaterializationAttestationV1(attestationBytes)),
    requireCommandV1(
      { runCommand },
      commandV1({ args: ["--version"], cwd: root, executable: "pnpm" }),
      "release.repro_materialization_stale",
    ),
  ]);
  if (
    contract.materializationDigest !== attestation.materializationDigest ||
    contract.packageClosureDigest !== attestation.packageClosureDigest
  ) {
    failV1(
      "release.repro_materialization_stale",
      "ignored attestation differs from the tracked contract/package closure",
    );
  }
  let manifest: unknown;
  try {
    manifest = JSON.parse(decoderV1.decode(packageBytes));
  } catch (error) {
    return failV1(
      "release.repro_materialization_stale",
      `package.json is invalid: ${detailFromV1(error)}`,
    );
  }
  if (!isPlainObjectV1(manifest) || !isPlainObjectV1(manifest.devDependencies)) {
    failV1("release.repro_materialization_stale", "root tool identities are unavailable");
  }
  const pnpm = decodeOneLineV1(
    pnpmVersionBytes,
    "release.repro_materialization_stale",
    "pnpm version",
  );
  const typescript = manifest.devDependencies.typescript;
  const vite = manifest.devDependencies.vite;
  if (
    process.version !== "v26.5.0" ||
    pnpm !== "11.11.0" ||
    manifest.packageManager !== "pnpm@11.11.0" ||
    typescript !== "7.0.2" ||
    vite !== "8.1.4"
  ) {
    failV1("release.repro_materialization_stale", "exact materialized tools differ");
  }
  return Object.freeze({
    branch: attestation.branch,
    materializationBaseCommit: attestation.materializationBaseCommit,
    materializationDigest: contract.materializationDigest,
    packageClosureDigest: contract.packageClosureDigest,
    tools: Object.freeze({ node: process.version, pnpm, typescript, vite }),
  });
}

function createNodeReproducibleBuildPortsV1(): ReproducibleBuildPortsV1 {
  const runCommand = runNodeCommandV1;
  return Object.freeze({
    createTemporaryDirectory: async () =>
      mkdtemp(resolve(tmpdir(), "project-tavern-reproducible-")),
    readSourceAuthority: async () => createNodeSourceAuthorityV1(repositoryRootV1, runCommand),
    removeTemporaryDirectory: async (path: string) => rm(path, { force: true, recursive: true }),
    repositoryRoot: repositoryRootV1,
    runCommand,
    verifyArtifact: verifierModuleV1.verifyPocArtifactV1,
  });
}

async function resolvePinnedStoreV1(ports: ReproducibleBuildPortsV1): Promise<PinnedStoreV1> {
  const output = await requireCommandV1(
    ports,
    commandV1({
      args: ["store", "path", "--silent"],
      cwd: ports.repositoryRoot,
      executable: "pnpm",
    }),
    "release.repro_store_invalid",
  );
  const path = decodeOneLineV1(output, "release.repro_store_invalid", "pnpm store path");
  if (!isAbsolute(path) || resolve(path) !== path) {
    failV1("release.repro_store_invalid", "pnpm store path must be canonical and absolute");
  }
  const [metadata, actualPath] = await Promise.all([lstat(path), realpath(path)]);
  if (metadata.isSymbolicLink() || !metadata.isDirectory() || actualPath !== path) {
    failV1("release.repro_store_invalid", "pnpm store must be one real directory");
  }
  return Object.freeze({ dev: metadata.dev, ino: metadata.ino, path, realPath: actualPath });
}

async function assertPinnedStoreV1(store: PinnedStoreV1): Promise<void> {
  const [metadata, actualPath] = await Promise.all([lstat(store.path), realpath(store.path)]);
  if (
    metadata.isSymbolicLink() ||
    !metadata.isDirectory() ||
    metadata.dev !== store.dev ||
    metadata.ino !== store.ino ||
    actualPath !== store.realPath
  ) {
    failV1("release.repro_store_changed", "frozen pnpm store authority changed");
  }
}

async function assertLiveSourceStillFrozenV1(
  ports: ReproducibleBuildPortsV1,
  source: FrozenReproducibleSourceV1,
): Promise<void> {
  const [branch, head, tree, status] = await Promise.all([
    requireCommandV1(
      ports,
      commandV1({
        args: ["symbolic-ref", "--quiet", "--short", "HEAD"],
        cwd: ports.repositoryRoot,
        executable: "git",
      }),
      "release.repro_source_changed",
    ),
    requireCommandV1(
      ports,
      commandV1({ args: ["rev-parse", "HEAD"], cwd: ports.repositoryRoot, executable: "git" }),
      "release.repro_source_changed",
    ),
    requireCommandV1(
      ports,
      commandV1({
        args: ["rev-parse", "HEAD^{tree}"],
        cwd: ports.repositoryRoot,
        executable: "git",
      }),
      "release.repro_source_changed",
    ),
    requireCommandV1(
      ports,
      commandV1({
        args: ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
        cwd: ports.repositoryRoot,
        executable: "git",
      }),
      "release.repro_source_changed",
    ),
  ]);
  if (
    decodeOneLineV1(branch, "release.repro_source_changed", "branch") !== source.branch ||
    decodeOneLineV1(head, "release.repro_source_changed", "HEAD") !== source.sourceCommit ||
    decodeOneLineV1(tree, "release.repro_source_changed", "HEAD tree") !== source.sourceTree ||
    status.byteLength !== 0
  ) {
    failV1("release.repro_source_changed", "live source changed during reproducibility proof");
  }
}

async function installAndBuildArchiveV1(input: {
  readonly archive: PreparedArchiveV1;
  readonly ports: ReproducibleBuildPortsV1;
  readonly source: FrozenReproducibleSourceV1;
  readonly store: PinnedStoreV1;
  readonly trackedEntries: readonly TrackedTreeEntryV1[];
}): Promise<string> {
  const privateRoot = resolve(input.archive.sourceRoot, ".project-tavern");
  await Promise.all([
    mkdir(resolve(privateRoot, "repro-home"), { mode: 0o700, recursive: true }),
    mkdir(resolve(privateRoot, "repro-tmp"), { mode: 0o700, recursive: true }),
  ]);
  const verifiedInput: VerifiedArchiveBuildInputV1 = Object.freeze({
    materializationDigest: input.source.materializationDigest,
    schemaRevision: 1,
    sourceCommit: input.source.sourceCommit,
    sourceTree: input.source.sourceTree,
    tools: input.source.tools,
  });
  const inputBytes = manifestModuleV1.canonicalArtifactJsonBytesV1(verifiedInput);
  const inputPath = resolve(input.archive.sourceRoot, verifiedArchiveInputRelativeV1);
  await writeFile(inputPath, inputBytes, { flag: "wx", mode: 0o600 });
  await assertPinnedStoreV1(input.store);
  await requireCommandV1(
    input.ports,
    createArchiveInstallInvocationV1({
      cwd: input.archive.sourceRoot,
      frozenStoreDir: input.store.path,
      storeDir: input.store.path,
    }),
    "release.repro_install_failed",
  );
  await assertPinnedStoreV1(input.store);
  await verifyTrackedTreeEntriesV1(input.archive.sourceRoot, input.trackedEntries);
  if (!equalBytesV1(await readFile(inputPath), inputBytes)) {
    failV1("release.invalid_verified_archive_input", "verified input changed during install");
  }
  await requireCommandV1(
    input.ports,
    createVerifiedArchiveChildInvocationV1({ cwd: input.archive.sourceRoot }),
    "release.repro_build_failed",
  );
  await assertPinnedStoreV1(input.store);
  await verifyTrackedTreeEntriesV1(input.archive.sourceRoot, input.trackedEntries);
  await assertForbiddenArchiveAuthorityAbsentV1(input.archive.sourceRoot);
  if (
    !equalBytesV1(await readFile(inputPath), inputBytes) ||
    digestBytesV1(await readFile(input.archive.archivePath)) !== input.archive.archiveDigest
  ) {
    failV1("release.repro_archive_invalid", "archive or verified input changed during build");
  }
  const artifact = resolve(input.archive.sourceRoot, "dist/poc");
  await input.ports.verifyArtifact(artifact);
  await assertArtifactAuthorityV1(artifact, input.source, "verified archive");
  return artifact;
}

async function awaitSettledPairV1<Left, Right>(
  left: () => Promise<Left>,
  right: () => Promise<Right>,
): Promise<readonly [Left, Right]> {
  const [leftResult, rightResult] = await Promise.allSettled([
    Promise.resolve().then(left),
    Promise.resolve().then(right),
  ]);
  if (leftResult.status === "rejected") throw leftResult.reason;
  if (rightResult.status === "rejected") throw rightResult.reason;
  return Object.freeze([leftResult.value, rightResult.value]) as readonly [Left, Right];
}

const nodeReproducibleBuildStagesV1: ReproducibleBuildStagePortsV1 = Object.freeze({
  installAndBuildArchive: installAndBuildArchiveV1,
  prepareArchive: prepareArchiveV1,
});

export async function buildReproduciblyV1(
  ports: ReproducibleBuildPortsV1 = createNodeReproducibleBuildPortsV1(),
  stages: ReproducibleBuildStagePortsV1 = nodeReproducibleBuildStagesV1,
): Promise<ReproducibleBuildResultV1> {
  const source = await inspectReproducibleSourceV1(ports);
  const handoff = resolve(ports.repositoryRoot, "dist/poc");
  await ports.verifyArtifact(handoff);
  await assertArtifactAuthorityV1(handoff, source, "handoff");
  const store = await resolvePinnedStoreV1(ports);
  const treeBytes = await requireCommandV1(
    ports,
    commandV1({
      args: [
        "ls-tree",
        "-r",
        "-z",
        "--format=%(objectmode)%x09%(objectname)%x09%(path)",
        source.sourceCommit,
      ],
      cwd: ports.repositoryRoot,
      executable: "git",
    }),
    "release.repro_tree_invalid",
  );
  const trackedEntries = parseTrackedTreeEntriesV1(treeBytes);
  let temporaryRoot: string | undefined;
  try {
    const createdTemporaryRoot = await ports.createTemporaryDirectory();
    temporaryRoot = createdTemporaryRoot;
    const [archiveA, archiveB] = await awaitSettledPairV1(
      () =>
        stages.prepareArchive({
          index: "a",
          ports,
          source,
          temporaryRoot: createdTemporaryRoot,
          trackedEntries,
        }),
      () =>
        stages.prepareArchive({
          index: "b",
          ports,
          source,
          temporaryRoot: createdTemporaryRoot,
          trackedEntries,
        }),
    );
    const [buildA, buildB] = await awaitSettledPairV1(
      () =>
        stages.installAndBuildArchive({ archive: archiveA, ports, source, store, trackedEntries }),
      () =>
        stages.installAndBuildArchive({ archive: archiveB, ports, source, store, trackedEntries }),
    );
    await assertLiveSourceStillFrozenV1(ports, source);
    const comparison = await assertReproducibleArtifactSetV1({
      buildA,
      buildB,
      expected: source,
      handoff,
    });
    await assertLiveSourceStillFrozenV1(ports, source);
    return Object.freeze({
      manifestDigest: comparison.manifestDigest,
      materializationDigest: source.materializationDigest,
      sourceCommit: source.sourceCommit,
      sourceTree: source.sourceTree,
    });
  } finally {
    if (temporaryRoot !== undefined) await ports.removeTemporaryDirectory(temporaryRoot);
  }
}

const isMainV1 =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainV1) {
  try {
    const { mode } = parseReproducibleBuildArgumentsV1(process.argv.slice(2));
    if (mode === "verified_archive_child") {
      await runVerifiedArchiveChildV1();
    } else {
      const result = await buildReproduciblyV1();
      console.log(
        `reproducible ${result.sourceCommit} ${result.sourceTree} ${result.manifestDigest}`,
      );
    }
  } catch (error) {
    console.error(detailFromV1(error));
    process.exitCode = 1;
  }
}
