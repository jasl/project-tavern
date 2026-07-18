// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { link, mkdtemp, open, readFile, realpath, rm, stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

const expectedNodeVersionV1 = "v26.5.0";
const expectedPnpmVersionV1 = "11.11.0";
const expectedNodeArchiveSha256V1 =
  "sha256:9f619528f1db5ddc41dccf54211066fb42228d69a156733c69cb9d6cc92e358c";
const expectedPnpmArchiveSha256V1 =
  "sha256:df4699e897012ab14df2cc6eaa942910e830eb7fcaa420a2a1421a9461fd9108";
const remoteContractIdV1 = "project-tavern.poc-balance-remote-execution.v1";
const remoteResultContractIdV1 = "project-tavern.poc-balance-remote-result.v1";
const strictRemoteContractIdV1 = "project-tavern.poc-balance-remote-strict-execution.v1";
const strictRemoteResultContractIdV1 = "project-tavern.poc-balance-remote-strict-result.v1";
const semanticPrefixV1 = "PoC balance calibration ";
const strictSemanticPrefixV1 = "PoC balance report ";
const maximumRemoteEnvelopeBytesV1 = 32 * 1024 * 1024;
const maximumCommandStderrBytesV1 = 4 * 1024 * 1024;
const decoderV1 = new TextDecoder("utf-8", { fatal: true });
const encoderV1 = new TextEncoder();

function failV1(code, detail) {
  throw new TypeError(`${code}: ${detail}`);
}

function usageV1() {
  return failV1(
    "usage: run-poc-balance-remote.mjs",
    "(--iteration=0..12 [--prior-after-sha256=sha256:<64-hex>] | --strict) --host=<ssh-target> --remote-root=Workspace --workers=1..64 --attestation-out=<absolute-local-path>",
  );
}

function assertPlainRecordV1(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    return failV1("balance_remote_schema_invalid", `${label} must be a plain object`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Object.values(descriptors).some(
      (descriptor) =>
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true,
    )
  ) {
    return failV1("balance_remote_schema_invalid", `${label} has hidden fields`);
  }
  return value;
}

function assertExactKeysV1(record, expected, label) {
  const actual = Object.keys(record).toSorted();
  const sortedExpected = [...expected].toSorted();
  if (
    actual.length !== sortedExpected.length ||
    actual.some((key, index) => key !== sortedExpected[index])
  ) {
    failV1("balance_remote_schema_invalid", `${label} has unexpected or missing fields`);
  }
}

function normalizeControllerJsonV1(value, active = new Set()) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
      return failV1("balance_remote_schema_invalid", "controller JSON number is invalid");
    }
    return value;
  }
  if (typeof value !== "object" || value === null || active.has(value)) {
    return failV1("balance_remote_schema_invalid", "controller JSON value is invalid");
  }
  active.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.keys(value).length !== value.length) {
        return failV1("balance_remote_schema_invalid", "controller JSON array is sparse");
      }
      return value.map((entry) => normalizeControllerJsonV1(entry, active));
    }
    const record = assertPlainRecordV1(value, "controller JSON object");
    return Object.fromEntries(
      Object.keys(record)
        .toSorted()
        .map((key) => [key, normalizeControllerJsonV1(record[key], active)]),
    );
  } finally {
    active.delete(value);
  }
}

function canonicalControllerJsonBytesV1(value) {
  return encoderV1.encode(JSON.stringify(normalizeControllerJsonV1(value)));
}

function sha256BytesV1(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function defaultHashFileV1(path) {
  return sha256BytesV1(await readFile(path));
}

function strictDigestV1(value, label) {
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(value)) {
    return failV1("balance_remote_schema_invalid", `${label} is not a lowercase SHA-256`);
  }
  return value;
}

function strictObjectIdV1(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/u.test(value)) {
    return failV1("balance_remote_schema_invalid", `${label} is not a lowercase Git object ID`);
  }
  return value;
}

function parseSshTargetV1(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 253) usageV1();
  const match =
    /^(?:([A-Za-z0-9][A-Za-z0-9._-]{0,31})@)?([A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?)$/u.exec(
      value,
    );
  if (match === null) usageV1();
  const hostname = match[2];
  if (hostname === undefined) usageV1();
  if (/^[0-9.]+$/u.test(hostname)) {
    const octets = hostname.split(".");
    if (
      octets.length !== 4 ||
      octets.some((octet) => !/^(?:0|[1-9][0-9]{0,2})$/u.test(octet) || Number(octet) > 255)
    ) {
      usageV1();
    }
  } else if (
    hostname.split(".").some((label) => {
      return (
        label.length < 1 ||
        label.length > 63 ||
        label.startsWith("-") ||
        label.endsWith("-") ||
        !/^[A-Za-z0-9-]+$/u.test(label)
      );
    })
  ) {
    usageV1();
  }
  return value;
}

export function parsePocBalanceRemoteArgumentsV1(args) {
  if (!Array.isArray(args) || args.some((argument) => typeof argument !== "string")) usageV1();
  if (args[0] === "--strict") {
    const hostMatch = /^--host=(.+)$/u.exec(args[1] ?? "");
    const rootMatch = /^--remote-root=(.+)$/u.exec(args[2] ?? "");
    const workersMatch = /^--workers=([1-9]|[1-5][0-9]|6[0-4])$/u.exec(args[3] ?? "");
    const attestationMatch = /^--attestation-out=(.+)$/u.exec(args[4] ?? "");
    if (
      hostMatch === null ||
      rootMatch?.[1] !== "Workspace" ||
      workersMatch === null ||
      attestationMatch === null ||
      args.length !== 5
    ) {
      usageV1();
    }
    const attestationOut = attestationMatch[1];
    if (
      !isAbsolute(attestationOut) ||
      attestationOut.includes("\0") ||
      attestationOut.includes("\n") ||
      attestationOut.includes("\r")
    ) {
      usageV1();
    }
    return Object.freeze({
      mode: "strict",
      host: parseSshTargetV1(hostMatch[1]),
      remoteRoot: "Workspace",
      workers: Number(workersMatch[1]),
      attestationOut,
    });
  }
  const iterationMatch = /^--iteration=(0|[1-9]|1[0-2])$/u.exec(args[0] ?? "");
  if (iterationMatch === null) usageV1();
  const iteration = Number(iterationMatch[1]);
  let index = 1;
  let priorAfterEvaluationSha256 = null;
  if (iteration > 0) {
    const priorMatch = /^--prior-after-sha256=(sha256:[0-9a-f]{64})$/u.exec(args[index] ?? "");
    if (priorMatch === null) usageV1();
    priorAfterEvaluationSha256 = priorMatch[1];
    index += 1;
  } else if (args[index]?.startsWith("--prior-after-sha256=")) {
    usageV1();
  }
  const hostMatch = /^--host=(.+)$/u.exec(args[index] ?? "");
  const rootMatch = /^--remote-root=(.+)$/u.exec(args[index + 1] ?? "");
  const workersMatch = /^--workers=([1-9]|[1-5][0-9]|6[0-4])$/u.exec(args[index + 2] ?? "");
  const attestationMatch = /^--attestation-out=(.+)$/u.exec(args[index + 3] ?? "");
  if (
    hostMatch === null ||
    rootMatch?.[1] !== "Workspace" ||
    workersMatch === null ||
    attestationMatch === null ||
    args.length !== index + 4
  ) {
    usageV1();
  }
  const attestationOut = attestationMatch[1];
  if (
    !isAbsolute(attestationOut) ||
    attestationOut.includes("\0") ||
    attestationOut.includes("\n") ||
    attestationOut.includes("\r")
  ) {
    usageV1();
  }
  return Object.freeze({
    iteration,
    priorAfterEvaluationSha256,
    host: parseSshTargetV1(hostMatch[1]),
    remoteRoot: "Workspace",
    workers: Number(workersMatch[1]),
    attestationOut,
  });
}

function boundedDiagnosticV1(value) {
  const bytes = encoderV1.encode(typeof value === "string" ? value : "");
  const bounded = bytes.subarray(0, 4096);
  let text;
  try {
    text = decoderV1.decode(bounded);
  } catch {
    text = "<non-UTF-8 stderr>";
  }
  return Array.from(text, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return (codePoint >= 0 && codePoint <= 8) ||
      codePoint === 11 ||
      codePoint === 12 ||
      (codePoint >= 14 && codePoint <= 31) ||
      codePoint === 127
      ? "?"
      : character;
  })
    .join("")
    .trim();
}

function commandEnvironmentV1() {
  return Object.fromEntries(
    ["HOME", "LANG", "LC_ALL", "PATH", "SSH_AUTH_SOCK", "TMPDIR"]
      .filter((key) => typeof process.env[key] === "string")
      .map((key) => [key, process.env[key]]),
  );
}

function gitProofEnvironmentV1() {
  return {
    ...commandEnvironmentV1(),
    GIT_ATTR_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  };
}

export function runPocBalanceRemoteCommandV1(command, args, options = {}) {
  if (typeof command !== "string" || !Array.isArray(args) || options.shell !== false) {
    return Promise.reject(new TypeError("balance_remote_command_invalid: shell:false is required"));
  }
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? commandEnvironmentV1(),
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let overflow = null;
    child.stdout.on("data", (chunk) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes > (options.maxStdoutBytes ?? maximumRemoteEnvelopeBytesV1)) {
        overflow = "stdout";
        child.kill("SIGKILL");
        return;
      }
      stdout.push(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderrBytes += chunk.byteLength;
      if (stderrBytes > (options.maxStderrBytes ?? maximumCommandStderrBytesV1)) {
        overflow = "stderr";
        child.kill("SIGKILL");
        return;
      }
      stderr.push(chunk);
      options.onStderr?.(chunk);
    });
    child.stdin.on("error", (error) => {
      if (error.code !== "EPIPE") rejectCommand(error);
    });
    child.once("error", rejectCommand);
    child.once("close", (status, signal) => {
      if (overflow !== null) {
        rejectCommand(new TypeError(`balance_remote_command_output_limit: ${overflow}`));
        return;
      }
      let stdoutText;
      let stderrText;
      try {
        stdoutText = decoderV1.decode(Buffer.concat(stdout));
        stderrText = decoderV1.decode(Buffer.concat(stderr));
      } catch {
        rejectCommand(new TypeError("balance_remote_command_utf8_invalid"));
        return;
      }
      resolveCommand({
        status,
        signal,
        stdout: stdoutText,
        stderr: stderrText,
        stderrForwarded: typeof options.onStderr === "function",
      });
    });
    if (options.input === undefined) child.stdin.end();
    else child.stdin.end(options.input);
  });
}

async function requireCommandSuccessV1(runCommand, command, args, options, errorCode) {
  const result = await runCommand(command, args, { ...options, shell: false });
  if (result.status !== 0 || result.signal) {
    failV1(
      errorCode,
      `${command} status=${String(result.status)} signal=${String(result.signal ?? "none")} stderr=${boundedDiagnosticV1(result.stderr)}`,
    );
  }
  return result.stdout;
}

async function defaultReadMaterializationContractV1(root) {
  const module = await import("./preflight/materialization-contract.mts");
  return module.readMaterializationContractV1(root);
}

export async function inspectPocBalanceRemoteSourceV1({
  root,
  runCommand = runPocBalanceRemoteCommandV1,
  createTemporaryDirectory = () => mkdtemp(join(tmpdir(), "project-tavern-balance-source-")),
  removeTemporaryDirectory = (path) => rm(path, { force: true, recursive: true }),
  hashFile = defaultHashFileV1,
  readArchive = readFile,
  readMaterializationContract = defaultReadMaterializationContractV1,
}) {
  let temporaryDirectory;
  try {
    const commandOptions = { cwd: root, shell: false };
    const status = await requireCommandSuccessV1(
      runCommand,
      "git",
      ["status", "--porcelain=v1", "--untracked-files=all"],
      commandOptions,
      "balance_remote_source_status_failed",
    );
    if (status !== "") failV1("balance_remote_source_dirty", "worktree is not clean");

    const branchResult = await runCommand(
      "git",
      ["symbolic-ref", "--quiet", "--short", "HEAD"],
      commandOptions,
    );
    if (branchResult.status !== 0) {
      failV1("balance_remote_source_detached", "HEAD must be attached to main");
    }
    if (branchResult.stdout !== "main\n") {
      failV1("balance_remote_source_branch", "source branch must be main");
    }

    const nodeVersion = await requireCommandSuccessV1(
      runCommand,
      "node",
      ["--version"],
      commandOptions,
      "balance_remote_local_toolchain_mismatch",
    );
    const pnpmVersion = await requireCommandSuccessV1(
      runCommand,
      "pnpm",
      ["--version"],
      commandOptions,
      "balance_remote_local_toolchain_mismatch",
    );
    if (
      nodeVersion !== `${expectedNodeVersionV1}\n` ||
      pnpmVersion !== `${expectedPnpmVersionV1}\n`
    ) {
      failV1(
        "balance_remote_local_toolchain_mismatch",
        `expected ${expectedNodeVersionV1}/${expectedPnpmVersionV1}`,
      );
    }
    await requireCommandSuccessV1(
      runCommand,
      "pnpm",
      ["verify:materialization"],
      commandOptions,
      "balance_remote_materialization_invalid",
    );

    const sourceCommit = strictObjectIdV1(
      (
        await requireCommandSuccessV1(
          runCommand,
          "git",
          ["rev-parse", "HEAD"],
          commandOptions,
          "balance_remote_source_identity_failed",
        )
      ).trim(),
      "sourceCommit",
    );
    const sourceTree = strictObjectIdV1(
      (
        await requireCommandSuccessV1(
          runCommand,
          "git",
          ["rev-parse", "HEAD^{tree}"],
          commandOptions,
          "balance_remote_source_identity_failed",
        )
      ).trim(),
      "sourceTree",
    );
    const pnpmLockSha256 = strictDigestV1(
      await hashFile(resolve(root, "pnpm-lock.yaml")),
      "pnpmLockSha256",
    );
    const materialization = await readMaterializationContract(root);
    const provisionalSource = {
      sourceCommit,
      sourceTree,
      pnpmLockSha256,
      materializationDigest: strictDigestV1(
        materialization.materializationDigest,
        "materializationDigest",
      ),
      packageClosureDigest: strictDigestV1(
        materialization.packageClosureDigest,
        "packageClosureDigest",
      ),
    };
    temporaryDirectory = await createTemporaryDirectory();
    const archivePath = join(temporaryDirectory, "source.tar");
    await requireCommandSuccessV1(
      runCommand,
      "git",
      ["archive", "--format=tar", `--output=${archivePath}`, sourceCommit],
      commandOptions,
      "balance_remote_archive_failed",
    );
    const archiveBytes = await readArchive(archivePath);
    if (!(archiveBytes instanceof Uint8Array)) {
      failV1("balance_remote_archive_source_mismatch", "archive reader did not return bytes");
    }
    const embeddedCommit = (
      await requireCommandSuccessV1(
        runCommand,
        "git",
        ["get-tar-commit-id"],
        { ...commandOptions, input: archiveBytes },
        "balance_remote_archive_source_mismatch",
      )
    ).trim();
    if (embeddedCommit !== sourceCommit) {
      failV1("balance_remote_archive_source_mismatch", "archive commit does not equal frozen HEAD");
    }
    const sourceArchiveSha256 = strictDigestV1(await hashFile(archivePath), "sourceArchiveSha256");

    const [postStatus, postCommit, postTree, postLockSha256] = await Promise.all([
      requireCommandSuccessV1(
        runCommand,
        "git",
        ["status", "--porcelain=v1", "--untracked-files=all"],
        commandOptions,
        "balance_remote_source_status_failed",
      ),
      requireCommandSuccessV1(
        runCommand,
        "git",
        ["rev-parse", "HEAD"],
        commandOptions,
        "balance_remote_source_identity_failed",
      ),
      requireCommandSuccessV1(
        runCommand,
        "git",
        ["rev-parse", "HEAD^{tree}"],
        commandOptions,
        "balance_remote_source_identity_failed",
      ),
      hashFile(resolve(root, "pnpm-lock.yaml")),
    ]);
    if (
      postStatus !== "" ||
      postCommit.trim() !== sourceCommit ||
      postTree.trim() !== sourceTree ||
      postLockSha256 !== pnpmLockSha256
    ) {
      failV1("balance_remote_source_changed", "source changed while archive was created");
    }
    return Object.freeze({
      archivePath,
      temporaryDirectory,
      sourceCommit,
      sourceTree,
      sourceArchiveSha256,
      pnpmLockSha256,
      materializationDigest: provisionalSource.materializationDigest,
      packageClosureDigest: provisionalSource.packageClosureDigest,
    });
  } catch (error) {
    if (temporaryDirectory !== undefined) await removeTemporaryDirectory(temporaryDirectory);
    throw error;
  }
}

const remotePrepareProgramV1 = String.raw`// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { lstat, mkdir, realpath, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, relative } from "node:path";

const home = await realpath(homedir());
const root = join(home, "Workspace", "project-tavern-worker");
const nodePath = join(root, "toolchains", "node-v26.5.0-linux-x64", "bin", "node");
const pnpmPath = join(root, "toolchains", "pnpm-11.11.0", "pnpm");
const storePath = join(root, "store", "pnpm-v11");
const incomingPath = join(root, "incoming");
const runsPath = join(root, "runs");

function insideHome(path) {
  const value = relative(home, path);
  return value !== "" && value !== ".." && !value.startsWith("../") && !value.startsWith("/");
}
async function requireDirectory(path) {
  const entry = await lstat(path);
  if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error("remote directory boundary invalid");
  if (!insideHome(await realpath(path))) throw new Error("remote directory escaped HOME");
}
async function marker(path, expected) {
  const value = (await readFile(path, "utf8")).trim();
  if (value !== expected && value !== "sha256:" + expected) throw new Error("toolchain archive marker mismatch");
}

await requireDirectory(join(home, "Workspace"));
await requireDirectory(root);
await requireDirectory(dirname(dirname(nodePath)));
await requireDirectory(dirname(pnpmPath));
await requireDirectory(storePath);
await marker(join(root, "toolchains", "node-v26.5.0-linux-x64", ".archive-sha256"), "9f619528f1db5ddc41dccf54211066fb42228d69a156733c69cb9d6cc92e358c");
await marker(join(root, "toolchains", "pnpm-11.11.0", ".archive-sha256"), "df4699e897012ab14df2cc6eaa942910e830eb7fcaa420a2a1421a9461fd9108");
await mkdir(incomingPath, { recursive: true, mode: 0o700 });
await mkdir(runsPath, { recursive: true, mode: 0o700 });
await requireDirectory(incomingPath);
await requireDirectory(runsPath);
`;

const remoteRunnerProgramV1 = String.raw`// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdtemp, readFile, realpath, rm, unlink } from "node:fs/promises";
import { availableParallelism, homedir } from "node:os";
import { dirname, join, relative } from "node:path";

const commonExpectedKeys = [
  "--archive-relative=", "--source-commit=", "--source-tree=", "--archive-sha256=",
  "--lock-sha256=", "--materialization-digest=", "--package-closure-digest="
];
const strictMode = process.argv[commonExpectedKeys.length + 2] === "--strict=true";
const expectedKeys = [
  ...commonExpectedKeys,
  strictMode ? "--strict=" : "--iteration=",
  "--workers="
];
if (process.argv.length !== expectedKeys.length + 2) throw new Error("remote argv invalid");
const values = {};
for (let index = 0; index < expectedKeys.length; index += 1) {
  const argument = process.argv[index + 2];
  const prefix = expectedKeys[index];
  if (!argument.startsWith(prefix)) throw new Error("remote argv order invalid");
  values[prefix] = argument.slice(prefix.length);
}
const digestPattern = /^sha256:[0-9a-f]{64}$/u;
const objectPattern = /^[0-9a-f]{40}$/u;
const iterationPattern = /^(?:0|[1-9]|1[0-2])$/u;
const workersPattern = /^(?:[1-9]|[1-5][0-9]|6[0-4])$/u;
if (!objectPattern.test(values["--source-commit="]) || !objectPattern.test(values["--source-tree="])) throw new Error("remote object identity invalid");
for (const key of ["--archive-sha256=", "--lock-sha256=", "--materialization-digest=", "--package-closure-digest="]) {
  if (!digestPattern.test(values[key])) throw new Error("remote digest invalid");
}
if (
  (strictMode ? values["--strict="] !== "true" : !iterationPattern.test(values["--iteration="])) ||
  !workersPattern.test(values["--workers="])
) throw new Error("remote scalar invalid");

const home = await realpath(homedir());
const root = join(home, "Workspace", "project-tavern-worker");
const archivePath = join(home, values["--archive-relative="]);
const nodePath = join(root, "toolchains", "node-v26.5.0-linux-x64", "bin", "node");
const pnpmPath = join(root, "toolchains", "pnpm-11.11.0", "pnpm");
const storePath = join(root, "store", "pnpm-v11");
const runsPath = join(root, "runs");
function inside(path, parent) {
  const value = relative(parent, path);
  return value !== "" && value !== ".." && !value.startsWith("../") && !value.startsWith("/");
}
if (!inside(archivePath, root)) throw new Error("remote archive escaped root");
for (const path of [root, dirname(dirname(nodePath)), dirname(pnpmPath), storePath, dirname(archivePath), runsPath]) {
  const entry = await lstat(path);
  if (!entry.isDirectory() || entry.isSymbolicLink() || !inside(await realpath(path), home)) throw new Error("remote path boundary invalid");
}
if (await realpath(process.execPath) !== await realpath(nodePath)) throw new Error("remote node path mismatch");
if (process.version !== "v26.5.0" || process.platform !== "linux" || process.arch !== "x64") throw new Error("remote runtime mismatch");
const parallelism = availableParallelism();
const workers = Number(values["--workers="]);
if (!Number.isSafeInteger(parallelism) || parallelism < workers) throw new Error("remote parallelism insufficient");
async function marker(path, expected) {
  const value = (await readFile(path, "utf8")).trim();
  if (value !== expected && value !== "sha256:" + expected) throw new Error("toolchain archive marker mismatch");
}
await marker(join(root, "toolchains", "node-v26.5.0-linux-x64", ".archive-sha256"), "9f619528f1db5ddc41dccf54211066fb42228d69a156733c69cb9d6cc92e358c");
await marker(join(root, "toolchains", "pnpm-11.11.0", ".archive-sha256"), "df4699e897012ab14df2cc6eaa942910e830eb7fcaa420a2a1421a9461fd9108");
const cleanEnv = {
  HOME: home,
  PATH: dirname(nodePath) + ":" + dirname(pnpmPath) + ":/usr/bin:/bin",
  LANG: "C.UTF-8",
  LC_ALL: "C.UTF-8",
  COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
  npm_config_offline: "true",
  GIT_ATTR_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1"
};
function checked(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, env: cleanEnv, shell: false, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.signal || result.status !== 0) throw new Error("remote command failed status=" + String(result.status) + " stderr=" + String(result.stderr).slice(0, 4096));
  return result.stdout;
}
function runCalibration(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: cleanEnv, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    child.stdout.on("data", (chunk) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes > 32 * 1024 * 1024) {
        child.kill("SIGKILL");
        reject(new Error("remote calibration stdout limit exceeded"));
        return;
      }
      stdout.push(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderrBytes += chunk.byteLength;
      if (stderrBytes > 64 * 1024 * 1024) {
        child.kill("SIGKILL");
        reject(new Error("remote calibration stderr limit exceeded"));
        return;
      }
      process.stderr.write(chunk);
    });
    child.once("error", reject);
    child.once("close", (status, signal) => {
      if (signal) {
        reject(new Error("remote calibration signaled " + signal));
        return;
      }
      resolve({ status, stdout: Buffer.concat(stdout).toString("utf8") });
    });
  });
}
if (checked(pnpmPath, ["--version"], root).trim() !== "11.11.0") throw new Error("remote pnpm mismatch");
const archiveBytes = await readFile(archivePath);
const archiveDigest = "sha256:" + createHash("sha256").update(archiveBytes).digest("hex");
if (archiveDigest !== values["--archive-sha256="]) throw new Error("remote archive digest mismatch");

function tarEntries(bytes) {
  const result = [];
  let offset = 0;
  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const text = (start, length) => Buffer.from(header.subarray(start, start + length)).toString("utf8").replace(/\0.*$/u, "");
    const name = text(0, 100);
    const prefix = text(345, 155);
    const path = prefix ? prefix + "/" + name : name;
    const sizeText = text(124, 12).trim();
    const size = sizeText === "" ? 0 : Number.parseInt(sizeText, 8);
    const type = String.fromCharCode(header[156] || 48);
    if (!Number.isSafeInteger(size) || size < 0) throw new Error("remote tar size invalid");
    if (path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => part === "..")) throw new Error("remote tar path invalid");
    if (type === "1" || type === "2") throw new Error("remote tar links forbidden");
    if (!["0", "5", "g", "x", "L"].includes(type)) throw new Error("remote tar type invalid");
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    if (dataEnd > bytes.length) throw new Error("remote tar truncated");
    result.push({ path, type, bytes: bytes.subarray(dataStart, dataEnd) });
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  return result;
}
const entries = tarEntries(archiveBytes);
const pax = entries.filter((entry) => entry.type === "g").map((entry) => Buffer.from(entry.bytes).toString("utf8")).join("\n");
if (!pax.includes("comment=" + values["--source-commit="] + "\n")) throw new Error("remote embedded commit mismatch");

const runDirectory = await mkdtemp(join(runsPath, "run-"));
try {
  checked("tar", ["-xf", archivePath, "-C", runDirectory], root);
  const lockDigest = "sha256:" + createHash("sha256").update(await readFile(join(runDirectory, "pnpm-lock.yaml"))).digest("hex");
  if (lockDigest !== values["--lock-sha256="]) throw new Error("remote lock digest mismatch");
  checked("git", ["init", "-q"], runDirectory);
  checked("git", ["add", "-f", "--all"], runDirectory);
  const reconstructedTree = checked("git", ["write-tree"], runDirectory).trim();
  if (reconstructedTree !== values["--source-tree="]) throw new Error("remote source tree mismatch");
  await rm(join(runDirectory, ".git"), { recursive: true, force: true });
  // pnpm install --offline --frozen-lockfile; this exact invocation creates no semantic evidence.
  checked(pnpmPath, ["--filter", "@project-tavern/story-poc...", "install", "--prod", "--offline", "--frozen-lockfile", "--store-dir", storePath], runDirectory);
  const cliArgs = strictMode
    ? ["scripts/verify-poc-balance.mjs", "--workers=" + values["--workers="]]
    : ["scripts/verify-poc-balance.mjs", "--calibrate", "--iteration=" + values["--iteration="], "--workers=" + values["--workers="]];
  const cli = await runCalibration(nodePath, cliArgs, runDirectory);
  if (strictMode && cli.status !== 0) {
    throw new Error("remote strict balance failed status=" + String(cli.status));
  }
  if (!strictMode && cli.status !== 0 && cli.status !== 1) {
    throw new Error("remote calibration failed status=" + String(cli.status));
  }
  const envelope = strictMode
    ? {
        arch: process.arch,
        availableParallelism: parallelism,
        contractId: "project-tavern.poc-balance-remote-strict-result.v1",
        firstSeed: 1,
        lastSeed: 1000,
        materializationDigest: values["--materialization-digest="],
        nodeArchiveSha256: "sha256:9f619528f1db5ddc41dccf54211066fb42228d69a156733c69cb9d6cc92e358c",
        nodeVersion: process.version,
        packageClosureDigest: values["--package-closure-digest="],
        platform: process.platform,
        pnpmArchiveSha256: "sha256:df4699e897012ab14df2cc6eaa942910e830eb7fcaa420a2a1421a9461fd9108",
        pnpmLockSha256: values["--lock-sha256="],
        pnpmVersion: "11.11.0",
        schemaRevision: 1,
        semanticExitStatus: cli.status,
        semanticStdout: cli.stdout,
        sourceArchiveSha256: archiveDigest,
        sourceCommit: values["--source-commit="],
        sourceTree: values["--source-tree="],
        workerCount: workers
      }
    : {
        arch: process.arch,
        availableParallelism: parallelism,
        contractId: "project-tavern.poc-balance-remote-result.v1",
        firstSeed: 1,
        iteration: Number(values["--iteration="]),
        lastSeed: 1000,
        materializationDigest: values["--materialization-digest="],
        nodeArchiveSha256: "sha256:9f619528f1db5ddc41dccf54211066fb42228d69a156733c69cb9d6cc92e358c",
        nodeVersion: process.version,
        packageClosureDigest: values["--package-closure-digest="],
        platform: process.platform,
        pnpmArchiveSha256: "sha256:df4699e897012ab14df2cc6eaa942910e830eb7fcaa420a2a1421a9461fd9108",
        pnpmLockSha256: values["--lock-sha256="],
        pnpmVersion: "11.11.0",
        schemaRevision: 1,
        semanticExitStatus: cli.status,
        semanticStdout: cli.stdout,
        sourceArchiveSha256: archiveDigest,
        sourceCommit: values["--source-commit="],
        sourceTree: values["--source-tree="],
        workerCount: workers
      };
  process.stdout.write(JSON.stringify(envelope) + "\n");
  process.exitCode = cli.status;
} finally {
  await rm(runDirectory, { recursive: true, force: true });
  await unlink(archivePath).catch(() => {});
}
`;

function sshOptionsV1() {
  return ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes"];
}

function remoteNodeRelativePathV1(options) {
  return `${options.remoteRoot}/project-tavern-worker/toolchains/node-v26.5.0-linux-x64/bin/node`;
}

export async function runPocBalanceRemoteTransportV1({
  source,
  options,
  runCommand = runPocBalanceRemoteCommandV1,
  createTransferId = randomUUID,
  writeStderr = (value) => process.stderr.write(value),
}) {
  const transferId = createTransferId();
  if (typeof transferId !== "string" || !/^[A-Za-z0-9-]{1,80}$/u.test(transferId)) {
    failV1("balance_remote_transfer_id_invalid", "transfer ID is unsafe");
  }
  const remoteArchiveRelative = `${options.remoteRoot}/project-tavern-worker/incoming/${source.sourceCommit}-${transferId}.tar`;
  const commonSsh = [...sshOptionsV1(), "--", options.host];
  const remoteNode = remoteNodeRelativePathV1(options);
  const preflight = await runCommand(
    "ssh",
    [...commonSsh, remoteNode, "--input-type=module", "-"],
    { shell: false, input: remotePrepareProgramV1 },
  );
  if (preflight.status !== 0 || preflight.signal) {
    failV1(
      "balance_remote_preflight_failed",
      `status=${String(preflight.status)} stderr=${boundedDiagnosticV1(preflight.stderr)}`,
    );
  }
  const transfer = await runCommand(
    "scp",
    [...sshOptionsV1(), "--", source.archivePath, `${options.host}:${remoteArchiveRelative}`],
    { shell: false },
  );
  if (transfer.status !== 0 || transfer.signal) {
    failV1(
      "balance_remote_archive_transfer_failed",
      `status=${String(transfer.status)} stderr=${boundedDiagnosticV1(transfer.stderr)}`,
    );
  }
  const execution = await runCommand(
    "ssh",
    [
      ...commonSsh,
      remoteNode,
      "--input-type=module",
      "-",
      `--archive-relative=${remoteArchiveRelative}`,
      `--source-commit=${source.sourceCommit}`,
      `--source-tree=${source.sourceTree}`,
      `--archive-sha256=${source.sourceArchiveSha256}`,
      `--lock-sha256=${source.pnpmLockSha256}`,
      `--materialization-digest=${source.materializationDigest}`,
      `--package-closure-digest=${source.packageClosureDigest}`,
      ...(options.mode === "strict"
        ? ["--strict=true"]
        : [`--iteration=${String(options.iteration)}`]),
      `--workers=${String(options.workers)}`,
    ],
    {
      shell: false,
      input: remoteRunnerProgramV1,
      maxStdoutBytes: maximumRemoteEnvelopeBytesV1,
      maxStderrBytes: maximumCommandStderrBytesV1,
      onStderr: writeStderr,
    },
  );
  if (execution.stderr && execution.stderrForwarded !== true) writeStderr(execution.stderr);
  const acceptedStatus =
    options.mode === "strict"
      ? execution.status === 0
      : execution.status !== null && execution.status >= 0 && execution.status <= 1;
  if (execution.signal || !acceptedStatus) {
    failV1(
      "balance_remote_execution_failed",
      `status=${String(execution.status)} signal=${String(execution.signal ?? "none")} stderr=${boundedDiagnosticV1(execution.stderr)}`,
    );
  }
  return Object.freeze({ status: execution.status, stdout: execution.stdout });
}

function parseRemoteEnvelopeV1(text, source, options) {
  if (
    typeof text !== "string" ||
    encoderV1.encode(text).byteLength > maximumRemoteEnvelopeBytesV1
  ) {
    return failV1("balance_remote_result_framing", "remote result exceeds its byte limit");
  }
  if (!text.endsWith("\n") || text.slice(0, -1).includes("\n") || text.includes("\r")) {
    return failV1("balance_remote_result_framing", "remote result must be one canonical LF line");
  }
  const payloadText = text.slice(0, -1);
  if (payloadText.charCodeAt(0) === 0xfeff) {
    return failV1("balance_remote_result_framing", "remote result must not contain a BOM");
  }
  let value;
  try {
    value = JSON.parse(payloadText);
  } catch {
    return failV1("balance_remote_result_framing", "remote result is not JSON");
  }
  const record = assertPlainRecordV1(value, "remote result");
  assertExactKeysV1(
    record,
    [
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
      "iteration",
      "firstSeed",
      "lastSeed",
      "semanticExitStatus",
      "semanticStdout",
    ],
    "remote result",
  );
  if (decoderV1.decode(canonicalControllerJsonBytesV1(record)) !== payloadText) {
    failV1("balance_remote_result_noncanonical", "remote result bytes are not canonical");
  }
  if (record.schemaRevision !== 1 || record.contractId !== remoteResultContractIdV1) {
    failV1("balance_remote_result_contract_mismatch", "remote result contract is unsupported");
  }
  for (const key of [
    "sourceCommit",
    "sourceTree",
    "sourceArchiveSha256",
    "pnpmLockSha256",
    "materializationDigest",
    "packageClosureDigest",
  ]) {
    if (record[key] !== source[key]) {
      failV1("balance_remote_source_mismatch", `${key} differs from the local archive`);
    }
  }
  if (
    record.nodeVersion !== expectedNodeVersionV1 ||
    record.nodeArchiveSha256 !== expectedNodeArchiveSha256V1 ||
    record.pnpmVersion !== expectedPnpmVersionV1 ||
    record.pnpmArchiveSha256 !== expectedPnpmArchiveSha256V1
  ) {
    failV1("balance_remote_toolchain_mismatch", "remote exact toolchain identity differs");
  }
  if (record.platform !== "linux" || record.arch !== "x64") {
    failV1("balance_remote_platform_mismatch", "remote platform must be linux/x64");
  }
  if (
    !Number.isSafeInteger(record.availableParallelism) ||
    record.availableParallelism < options.workers
  ) {
    failV1(
      "balance_remote_parallelism_insufficient",
      "availableParallelism is below the requested worker count",
    );
  }
  if (
    record.workerCount !== options.workers ||
    record.iteration !== options.iteration ||
    record.firstSeed !== 1 ||
    record.lastSeed !== 1000 ||
    (record.semanticExitStatus !== 0 && record.semanticExitStatus !== 1) ||
    typeof record.semanticStdout !== "string"
  ) {
    failV1("balance_remote_result_contract_mismatch", "remote run inputs differ");
  }
  return Object.freeze(record);
}

function parseStrictRemoteEnvelopeV1(text, source, options) {
  if (
    typeof text !== "string" ||
    encoderV1.encode(text).byteLength > maximumRemoteEnvelopeBytesV1
  ) {
    return failV1("balance_remote_strict_result_framing", "remote result exceeds its byte limit");
  }
  if (!text.endsWith("\n") || text.slice(0, -1).includes("\n") || text.includes("\r")) {
    return failV1(
      "balance_remote_strict_result_framing",
      "remote result must be one canonical LF line",
    );
  }
  const payloadText = text.slice(0, -1);
  if (payloadText.charCodeAt(0) === 0xfeff) {
    return failV1("balance_remote_strict_result_framing", "remote result must not contain a BOM");
  }
  let value;
  try {
    value = JSON.parse(payloadText);
  } catch {
    return failV1("balance_remote_strict_result_framing", "remote result is not JSON");
  }
  const record = assertPlainRecordV1(value, "strict remote result");
  assertExactKeysV1(
    record,
    [
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
      "semanticExitStatus",
      "semanticStdout",
    ],
    "strict remote result",
  );
  if (decoderV1.decode(canonicalControllerJsonBytesV1(record)) !== payloadText) {
    failV1("balance_remote_strict_result_noncanonical", "remote result bytes are not canonical");
  }
  if (record.schemaRevision !== 1 || record.contractId !== strictRemoteResultContractIdV1) {
    failV1(
      "balance_remote_strict_result_contract_mismatch",
      "strict remote result contract is unsupported",
    );
  }
  for (const key of [
    "sourceCommit",
    "sourceTree",
    "sourceArchiveSha256",
    "pnpmLockSha256",
    "materializationDigest",
    "packageClosureDigest",
  ]) {
    if (record[key] !== source[key]) {
      failV1("balance_remote_source_mismatch", `${key} differs from the local archive`);
    }
  }
  if (
    record.nodeVersion !== expectedNodeVersionV1 ||
    record.nodeArchiveSha256 !== expectedNodeArchiveSha256V1 ||
    record.pnpmVersion !== expectedPnpmVersionV1 ||
    record.pnpmArchiveSha256 !== expectedPnpmArchiveSha256V1
  ) {
    failV1("balance_remote_toolchain_mismatch", "remote exact toolchain identity differs");
  }
  if (record.platform !== "linux" || record.arch !== "x64") {
    failV1("balance_remote_platform_mismatch", "remote platform must be linux/x64");
  }
  if (
    !Number.isSafeInteger(record.availableParallelism) ||
    record.availableParallelism < options.workers
  ) {
    failV1(
      "balance_remote_parallelism_insufficient",
      "availableParallelism is below the requested worker count",
    );
  }
  if (
    record.workerCount !== options.workers ||
    record.firstSeed !== 1 ||
    record.lastSeed !== 1000 ||
    record.semanticExitStatus !== 0 ||
    typeof record.semanticStdout !== "string"
  ) {
    failV1(
      record.semanticExitStatus !== 0
        ? "balance_remote_strict_exit_semantics_mismatch"
        : "balance_remote_strict_result_contract_mismatch",
      "strict remote run inputs or exit status differ",
    );
  }
  return Object.freeze(record);
}

function parseSemanticEvidenceV1(stdout, runtime, options) {
  if (
    typeof stdout !== "string" ||
    !stdout.startsWith(semanticPrefixV1) ||
    !stdout.endsWith("\n") ||
    stdout.slice(0, -1).includes("\n") ||
    stdout.includes("\r") ||
    stdout.charCodeAt(0) === 0xfeff
  ) {
    return failV1(
      "balance_remote_evidence_framing",
      "semantic stdout must be one prefixed canonical LF line",
    );
  }
  const payloadText = stdout.slice(semanticPrefixV1.length, -1);
  let value;
  try {
    value = JSON.parse(payloadText);
  } catch {
    return failV1("balance_remote_evidence_framing", "semantic payload is not JSON");
  }
  let canonicalBytes;
  try {
    canonicalBytes = runtime.encodeEvidence(value);
  } catch (error) {
    return failV1(
      "balance_remote_evidence_invalid",
      error instanceof Error ? error.message : "Story codec rejected evidence",
    );
  }
  if (!(canonicalBytes instanceof Uint8Array)) {
    failV1("balance_remote_runtime_invalid", "Story evidence codec did not return bytes");
  }
  if (decoderV1.decode(canonicalBytes) !== payloadText) {
    failV1("balance_remote_evidence_noncanonical", "semantic payload is not canonical");
  }
  let admitted;
  try {
    admitted = runtime.admitRemoteRun(value, {
      iteration: options.iteration,
      values: runtime.currentValues(),
    });
  } catch (error) {
    return failV1(
      "balance_remote_evidence_invalid",
      error instanceof Error ? error.message : "Story admission rejected evidence",
    );
  }
  return Object.freeze({ admitted, canonicalBytes });
}

function parseStrictSemanticReportV1(stdout, runtime) {
  if (
    typeof stdout !== "string" ||
    !stdout.startsWith(strictSemanticPrefixV1) ||
    !stdout.endsWith("\n") ||
    stdout.slice(0, -1).includes("\n") ||
    stdout.includes("\r") ||
    stdout.charCodeAt(0) === 0xfeff
  ) {
    return failV1(
      "balance_remote_strict_report_framing",
      "strict semantic stdout must be one report-prefixed canonical LF line",
    );
  }
  const payloadText = stdout.slice(strictSemanticPrefixV1.length, -1);
  let value;
  try {
    value = JSON.parse(payloadText);
  } catch {
    return failV1("balance_remote_strict_report_framing", "strict report payload is not JSON");
  }
  let canonicalBytes;
  try {
    canonicalBytes = runtime.encodeEvidence(value);
  } catch (error) {
    return failV1(
      "balance_remote_strict_report_invalid",
      error instanceof Error ? error.message : "Story codec rejected strict report",
    );
  }
  if (!(canonicalBytes instanceof Uint8Array)) {
    failV1("balance_remote_runtime_invalid", "Story report codec did not return bytes");
  }
  if (decoderV1.decode(canonicalBytes) !== payloadText) {
    failV1("balance_remote_strict_report_noncanonical", "strict report payload is not canonical");
  }
  let admitted;
  try {
    admitted = runtime.admitFullReport(value);
  } catch (error) {
    return failV1(
      "balance_remote_strict_report_invalid",
      error instanceof Error ? error.message : "Story admission rejected strict report",
    );
  }
  let admittedBytes;
  try {
    admittedBytes = runtime.encodeEvidence(admitted);
  } catch (error) {
    return failV1(
      "balance_remote_strict_report_invalid",
      error instanceof Error ? error.message : "Story codec rejected admitted strict report",
    );
  }
  if (!(admittedBytes instanceof Uint8Array) || !isDeepStrictEqual(admittedBytes, canonicalBytes)) {
    failV1(
      "balance_remote_strict_report_invalid",
      "admitted strict report differs from canonical remote bytes",
    );
  }
  if (admitted?.deficit !== 0) {
    failV1("balance_remote_strict_report_unsatisfied", "strict report deficit must equal zero");
  }
  return Object.freeze({ admitted, canonicalBytes });
}

function evidenceBytesV1(runtime, value, label) {
  const bytes = runtime.encodeEvidence(value);
  if (!(bytes instanceof Uint8Array)) {
    failV1("balance_remote_runtime_invalid", `${label} codec did not return bytes`);
  }
  return bytes;
}

function selectedCandidateEvaluationV1(run) {
  const selection = run.selection;
  if (selection.kind !== "candidate") return null;
  const matching = run.step.candidates.filter(
    (candidate) =>
      candidate.field === selection.field &&
      candidate.direction === selection.direction &&
      candidate.step === selection.step &&
      candidate.beforeValue === selection.beforeValue &&
      candidate.afterValue === selection.afterValue,
  );
  if (matching.length !== 1) {
    failV1(
      "balance_remote_evidence_invalid",
      "selected candidate is not unique in admitted evidence",
    );
  }
  return matching[0].evaluation;
}

export async function writePocBalanceRemoteAttestationV1(path, bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.at(-1) === 0x0a) {
    failV1("balance_remote_attestation_invalid", "attestation bytes are required");
  }
  const parent = dirname(path);
  const parentEntry = await stat(parent);
  if (!parentEntry.isDirectory()) {
    failV1("balance_remote_attestation_path_invalid", "parent must be a directory");
  }
  const parentReal = await realpath(parent);
  const target = join(parentReal, basename(path));
  const candidate = join(parentReal, `.${randomUUID()}.balance-attestation.tmp`);
  let handle;
  let targetLinked = false;
  try {
    handle = await open(candidate, "wx", 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await link(candidate, target);
    targetLinked = true;
    await unlink(candidate);
    const directoryHandle = await open(parentReal, "r");
    try {
      await directoryHandle.sync();
    } finally {
      await directoryHandle.close();
    }
  } catch (error) {
    if (handle !== undefined) await handle.close().catch(() => {});
    await rm(candidate, { force: true }).catch(() => {});
    if (targetLinked) await unlink(target).catch(() => {});
    failV1(
      "balance_remote_attestation_publish_failed",
      error instanceof Error ? error.message : "atomic publish failed",
    );
  }
}

let typeStripHooksInstalledV1 = false;

async function installTypeStripHooksV1() {
  if (typeStripHooksInstalledV1) return;
  const { registerHooks } = await import("node:module");
  registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        if (specifier.endsWith(".js")) return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
        throw error;
      }
    },
  });
  typeStripHooksInstalledV1 = true;
}

async function loadFrozenReplayModulesV1({ temporaryDirectory, source }) {
  await installTypeStripHooksV1();
  const cacheKey = `${source.sourceCommit}-${randomUUID()}`;
  return import(
    `${
      pathToFileURL(join(temporaryDirectory, "game/stories/poc/src/testing/balance-calibration.ts"))
        .href
    }?source=${cacheKey}`
  );
}

export async function loadPocBalanceFrozenReplayRuntimeV1({
  source,
  root,
  options,
  runCommand = runPocBalanceRemoteCommandV1,
  createTemporaryDirectory = () => mkdtemp(join(tmpdir(), "project-tavern-balance-replay-")),
  removeTemporaryDirectory = (path) => rm(path, { force: true, recursive: true }),
  removePath = (path) => rm(path, { force: true, recursive: true }),
  hashFile = defaultHashFileV1,
  readArchive = readFile,
  loadRuntimeModules = loadFrozenReplayModulesV1,
}) {
  if ((await hashFile(source.archivePath)) !== source.sourceArchiveSha256) {
    failV1("balance_remote_local_archive_changed", "frozen archive digest changed before replay");
  }
  const archiveBytes = await readArchive(source.archivePath);
  if (!(archiveBytes instanceof Uint8Array)) {
    failV1("balance_remote_local_archive_changed", "archive reader did not return bytes");
  }
  const embeddedCommit = (
    await requireCommandSuccessV1(
      runCommand,
      "git",
      ["get-tar-commit-id"],
      { cwd: root, shell: false, input: archiveBytes },
      "balance_remote_local_archive_changed",
    )
  ).trim();
  if (embeddedCommit !== source.sourceCommit) {
    failV1("balance_remote_local_archive_changed", "archive commit changed before replay");
  }
  const storePath = (
    await requireCommandSuccessV1(
      runCommand,
      "pnpm",
      ["store", "path", "--silent"],
      { cwd: root, shell: false },
      "balance_remote_local_store_invalid",
    )
  ).trim();
  if (!isAbsolute(storePath)) {
    failV1("balance_remote_local_store_invalid", "pnpm store path must be absolute");
  }
  const temporaryDirectory = await createTemporaryDirectory();
  try {
    await requireCommandSuccessV1(
      runCommand,
      "tar",
      ["-xf", source.archivePath, "-C", temporaryDirectory],
      { cwd: root, shell: false },
      "balance_remote_local_archive_extract_failed",
    );
    await requireCommandSuccessV1(
      runCommand,
      "git",
      ["init", "-q"],
      { cwd: temporaryDirectory, env: gitProofEnvironmentV1(), shell: false },
      "balance_remote_local_tree_mismatch",
    );
    await requireCommandSuccessV1(
      runCommand,
      "git",
      ["add", "-f", "--all"],
      { cwd: temporaryDirectory, env: gitProofEnvironmentV1(), shell: false },
      "balance_remote_local_tree_mismatch",
    );
    const reconstructedTree = (
      await requireCommandSuccessV1(
        runCommand,
        "git",
        ["write-tree"],
        { cwd: temporaryDirectory, env: gitProofEnvironmentV1(), shell: false },
        "balance_remote_local_tree_mismatch",
      )
    ).trim();
    if (reconstructedTree !== source.sourceTree) {
      failV1("balance_remote_local_tree_mismatch", "extracted archive tree differs from source");
    }
    await removePath(join(temporaryDirectory, ".git"));
    await requireCommandSuccessV1(
      runCommand,
      "pnpm",
      [
        "--filter",
        "@project-tavern/story-poc...",
        "install",
        "--prod",
        "--offline",
        "--frozen-lockfile",
        "--store-dir",
        storePath,
      ],
      { cwd: temporaryDirectory, shell: false },
      "balance_remote_local_install_failed",
    );
    const calibration = await loadRuntimeModules({
      temporaryDirectory,
      source,
    });
    if (options.mode === "strict") {
      for (const name of ["canonicalPocBalanceEvidenceBytesV1", "admitPocBalanceFullReportV1"]) {
        if (typeof calibration[name] !== "function") {
          failV1("balance_remote_runtime_invalid", `missing runtime export ${name}`);
        }
      }
      return Object.freeze({
        encodeEvidence: calibration.canonicalPocBalanceEvidenceBytesV1,
        admitFullReport: calibration.admitPocBalanceFullReportV1,
        async cleanup() {
          await removeTemporaryDirectory(temporaryDirectory);
        },
      });
    }
    for (const name of [
      "canonicalPocBalanceEvidenceBytesV1",
      "pocBalanceCalibrationValuesV1",
      "admitPocBalanceCalibrationRunV1",
    ]) {
      if (typeof calibration[name] !== "function") {
        failV1("balance_remote_runtime_invalid", `missing runtime export ${name}`);
      }
    }
    const values = calibration.pocBalanceCalibrationValuesV1();
    return Object.freeze({
      encodeEvidence: calibration.canonicalPocBalanceEvidenceBytesV1,
      currentValues() {
        return values;
      },
      admitRemoteRun(value) {
        return calibration.admitPocBalanceCalibrationRunV1(value, {
          iteration: options.iteration,
          values,
        });
      },
      async cleanup() {
        await removeTemporaryDirectory(temporaryDirectory);
      },
    });
  } catch (error) {
    await removeTemporaryDirectory(temporaryDirectory);
    throw error;
  }
}

function defaultPortsV1(root) {
  return Object.freeze({
    inspectSource: () => inspectPocBalanceRemoteSourceV1({ root }),
    runRemote: ({ source, options, writeStderr }) =>
      runPocBalanceRemoteTransportV1({ source, options, writeStderr }),
    loadRuntime: ({ source, options }) =>
      loadPocBalanceFrozenReplayRuntimeV1({ source, root, options }),
    writeAttestation: writePocBalanceRemoteAttestationV1,
    cleanupSource: (source) => rm(source.temporaryDirectory, { force: true, recursive: true }),
  });
}

export async function runPocBalanceRemoteCliV1({
  args,
  root = dirname(dirname(fileURLToPath(import.meta.url))),
  ports = defaultPortsV1(root),
  writeStdout = (value) => process.stdout.write(value),
  writeStderr = (value) => process.stderr.write(value),
}) {
  const options = parsePocBalanceRemoteArgumentsV1(args);
  const attestationRelative = relative(resolve(root), resolve(options.attestationOut));
  if (
    attestationRelative === "" ||
    (!attestationRelative.startsWith("..") && !isAbsolute(attestationRelative))
  ) {
    failV1(
      "balance_remote_attestation_path_invalid",
      "attestation output must remain outside the repository",
    );
  }
  let source;
  let runtime;
  try {
    source = await ports.inspectSource({ root, options });
    const remoteRaw = await ports.runRemote({ source, options, writeStderr });
    const remoteExecution =
      typeof remoteRaw === "string" ? { status: 0, stdout: remoteRaw } : remoteRaw;
    if (
      remoteExecution === null ||
      typeof remoteExecution !== "object" ||
      (remoteExecution.status !== 0 && remoteExecution.status !== 1) ||
      typeof remoteExecution.stdout !== "string"
    ) {
      failV1("balance_remote_execution_invalid", "transport returned an invalid result");
    }
    const envelope =
      options.mode === "strict"
        ? parseStrictRemoteEnvelopeV1(remoteExecution.stdout, source, options)
        : parseRemoteEnvelopeV1(remoteExecution.stdout, source, options);
    if (envelope.semanticExitStatus !== remoteExecution.status) {
      failV1(
        options.mode === "strict"
          ? "balance_remote_strict_exit_semantics_mismatch"
          : "balance_remote_exit_semantics_mismatch",
        "SSH status differs from the reported semantic exit status",
      );
    }
    runtime = await ports.loadRuntime({ source, options });
    if (options.mode === "strict") {
      for (const name of ["encodeEvidence", "admitFullReport"]) {
        if (typeof runtime?.[name] !== "function") {
          failV1("balance_remote_runtime_invalid", `missing strict runtime port ${name}`);
        }
      }
      const semantic = parseStrictSemanticReportV1(envelope.semanticStdout, runtime);
      const reportSha256 = sha256BytesV1(encoderV1.encode(envelope.semanticStdout));
      const evaluationSha256 = sha256BytesV1(
        evidenceBytesV1(runtime, semantic.admitted.evaluation, "strict evaluation"),
      );
      const attestation = Object.freeze({
        schemaRevision: 1,
        contractId: strictRemoteContractIdV1,
        sourceCommit: source.sourceCommit,
        sourceTree: source.sourceTree,
        sourceArchiveSha256: source.sourceArchiveSha256,
        pnpmLockSha256: source.pnpmLockSha256,
        materializationDigest: source.materializationDigest,
        packageClosureDigest: source.packageClosureDigest,
        nodeVersion: expectedNodeVersionV1,
        nodeArchiveSha256: expectedNodeArchiveSha256V1,
        pnpmVersion: expectedPnpmVersionV1,
        pnpmArchiveSha256: expectedPnpmArchiveSha256V1,
        platform: "linux",
        arch: "x64",
        availableParallelism: envelope.availableParallelism,
        workerCount: options.workers,
        firstSeed: 1,
        lastSeed: 1000,
        seedCount: 1000,
        evaluationSha256,
        reportSha256,
      });
      const attestationBytes = evidenceBytesV1(runtime, attestation, "strict attestation");
      await ports.writeAttestation(options.attestationOut, attestationBytes);
      writeStdout(envelope.semanticStdout);
      return 0;
    }
    for (const name of ["encodeEvidence", "currentValues", "admitRemoteRun"]) {
      if (typeof runtime?.[name] !== "function") {
        failV1("balance_remote_runtime_invalid", `missing runtime port ${name}`);
      }
    }
    const semantic = parseSemanticEvidenceV1(envelope.semanticStdout, runtime, options);
    const run = semantic.admitted;
    const currentValues = runtime.currentValues();
    if (
      run?.step?.iteration !== options.iteration ||
      !isDeepStrictEqual(run.step.values, currentValues)
    ) {
      failV1("balance_remote_evidence_invalid", "step identity differs from frozen local values");
    }

    const remoteBeforeBytes = evidenceBytesV1(runtime, run.step.evaluation, "before evaluation");
    const beforeEvaluationSha256 = sha256BytesV1(remoteBeforeBytes);
    if (options.iteration > 0 && beforeEvaluationSha256 !== options.priorAfterEvaluationSha256) {
      failV1(
        "balance_remote_prior_evaluation_mismatch",
        "remote current evaluation does not match the prior accepted after digest",
      );
    }

    const evidenceSha256 = sha256BytesV1(encoderV1.encode(envelope.semanticStdout));
    const publishAttestationV1 = async (afterEvaluationSha256) => {
      const attestation = Object.freeze({
        schemaRevision: 1,
        contractId: remoteContractIdV1,
        sourceCommit: source.sourceCommit,
        sourceTree: source.sourceTree,
        sourceArchiveSha256: source.sourceArchiveSha256,
        pnpmLockSha256: source.pnpmLockSha256,
        materializationDigest: source.materializationDigest,
        packageClosureDigest: source.packageClosureDigest,
        nodeVersion: expectedNodeVersionV1,
        nodeArchiveSha256: expectedNodeArchiveSha256V1,
        pnpmVersion: expectedPnpmVersionV1,
        pnpmArchiveSha256: expectedPnpmArchiveSha256V1,
        platform: "linux",
        arch: "x64",
        availableParallelism: envelope.availableParallelism,
        workerCount: options.workers,
        iteration: options.iteration,
        firstSeed: 1,
        lastSeed: 1000,
        evidenceSha256,
        beforeEvaluationSha256,
        afterEvaluationSha256,
      });
      const attestationBytes = evidenceBytesV1(runtime, attestation, "attestation");
      await ports.writeAttestation(options.attestationOut, attestationBytes);
    };

    if (run.selection.kind === "balance_contract_unsatisfied") {
      if (remoteExecution.status !== 1) {
        failV1(
          "balance_remote_exit_semantics_mismatch",
          "unsatisfied evidence must use remote status 1",
        );
      }
      await publishAttestationV1(null);
      writeStdout(envelope.semanticStdout);
      return 1;
    }
    if (run.selection.kind !== "candidate" || remoteExecution.status !== 0) {
      failV1(
        "balance_remote_exit_semantics_mismatch",
        "candidate evidence must use remote status 0",
      );
    }

    const remoteSelectedEvaluation = selectedCandidateEvaluationV1(run);
    const remoteSelectedBytes = evidenceBytesV1(
      runtime,
      remoteSelectedEvaluation,
      "remote selected evaluation",
    );
    const afterEvaluationSha256 = sha256BytesV1(remoteSelectedBytes);
    await publishAttestationV1(afterEvaluationSha256);
    writeStdout(envelope.semanticStdout);
    return 0;
  } finally {
    try {
      if (runtime?.cleanup !== undefined) await runtime.cleanup();
    } finally {
      if (source !== undefined) await ports.cleanupSource(source);
    }
  }
}

async function runMainV1() {
  try {
    process.exitCode = await runPocBalanceRemoteCliV1({ args: process.argv.slice(2) });
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runMainV1();
}
