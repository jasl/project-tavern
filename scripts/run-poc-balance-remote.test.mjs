// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  inspectPocBalanceRemoteSourceV1,
  loadPocBalanceFrozenReplayRuntimeV1,
  parsePocBalanceRemoteArgumentsV1,
  runPocBalanceRemoteCliV1,
  runPocBalanceRemoteCommandV1,
  runPocBalanceRemoteTransportV1,
  writePocBalanceRemoteAttestationV1,
} from "./run-poc-balance-remote.mjs";

const digest = (character) => `sha256:${character.repeat(64)}`;
const commit = "a".repeat(40);
const tree = "b".repeat(40);
const nodeArchiveSha256 = "sha256:9f619528f1db5ddc41dccf54211066fb42228d69a156733c69cb9d6cc92e358c";
const pnpmArchiveSha256 = "sha256:df4699e897012ab14df2cc6eaa942910e830eb7fcaa420a2a1421a9461fd9108";

function canonicalValueV1(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalValueV1);
  return Object.fromEntries(
    Object.keys(value)
      .toSorted()
      .map((key) => [key, canonicalValueV1(value[key])]),
  );
}

function encodeEvidenceV1(value) {
  return new TextEncoder().encode(JSON.stringify(canonicalValueV1(value)));
}

function sourceFixtureV1(overrides = {}) {
  return Object.freeze({
    archivePath: "/tmp/project-tavern-source/source.tar",
    temporaryDirectory: "/tmp/project-tavern-source",
    sourceCommit: commit,
    sourceTree: tree,
    sourceArchiveSha256: digest("c"),
    pnpmLockSha256: digest("d"),
    materializationDigest: digest("e"),
    packageClosureDigest: digest("f"),
    ...overrides,
  });
}

function calibrationFixtureV1(overrides = {}) {
  const currentEvaluation = Object.freeze({ median: 10.5, score: 3 });
  const selectedEvaluation = Object.freeze({ median: 11.5, score: 2 });
  const candidate = Object.freeze({
    field: "levy",
    direction: "decrease",
    step: 2,
    beforeValue: 140,
    afterValue: 138,
    evaluation: selectedEvaluation,
  });
  const step = Object.freeze({
    iteration: 0,
    values: Object.freeze({ levy: 140 }),
    evaluation: currentEvaluation,
    candidates: Object.freeze([candidate]),
  });
  const selection = Object.freeze({
    kind: "candidate",
    field: "levy",
    direction: "decrease",
    step: 2,
    beforeValue: 140,
    afterValue: 138,
    beforeDeficit: 3,
    afterDeficit: 2,
    metrics: Object.freeze({ median: 11.5 }),
  });
  return Object.freeze({
    step,
    selection,
    currentEvaluation,
    selectedEvaluation,
    ...overrides,
  });
}

function semanticStdoutV1(calibration) {
  return `PoC balance calibration ${new TextDecoder().decode(
    encodeEvidenceV1({ step: calibration.step, selection: calibration.selection }),
  )}\n`;
}

function remoteEnvelopeV1(source, options, semanticStdout, overrides = {}) {
  return {
    schemaRevision: 1,
    contractId: "project-tavern.poc-balance-remote-result.v1",
    sourceCommit: source.sourceCommit,
    sourceTree: source.sourceTree,
    sourceArchiveSha256: source.sourceArchiveSha256,
    pnpmLockSha256: source.pnpmLockSha256,
    materializationDigest: source.materializationDigest,
    packageClosureDigest: source.packageClosureDigest,
    nodeVersion: "v26.5.0",
    nodeArchiveSha256,
    pnpmVersion: "11.11.0",
    pnpmArchiveSha256,
    platform: "linux",
    arch: "x64",
    availableParallelism: 64,
    workerCount: options.workers,
    iteration: options.iteration,
    firstSeed: 1,
    lastSeed: 1000,
    semanticExitStatus: 0,
    semanticStdout,
    ...overrides,
  };
}

function validArgsV1(overrides = {}) {
  const values = {
    iteration: "0",
    host: "calibrator@10.0.0.110",
    remoteRoot: "Workspace",
    workers: "64",
    attestationOut: "/private/tmp/balance-attestation.json",
    ...overrides,
  };
  return [
    `--iteration=${values.iteration}`,
    ...(values.priorAfter === undefined ? [] : [`--prior-after-sha256=${values.priorAfter}`]),
    `--host=${values.host}`,
    `--remote-root=${values.remoteRoot}`,
    `--workers=${values.workers}`,
    `--attestation-out=${values.attestationOut}`,
  ];
}

function controllerFixtureV1({
  options = parsePocBalanceRemoteArgumentsV1(validArgsV1()),
  source = sourceFixtureV1(),
  calibration = calibrationFixtureV1(),
  envelopeOverrides,
  semanticOverride,
  evaluateValues,
  remoteStatus = 0,
} = {}) {
  const semanticStdout = semanticOverride ?? semanticStdoutV1(calibration);
  const envelope = remoteEnvelopeV1(source, options, semanticStdout, {
    semanticExitStatus: remoteStatus,
    ...envelopeOverrides,
  });
  const writes = [];
  const evaluations = [];
  const ports = {
    async inspectSource() {
      return source;
    },
    async runRemote() {
      return {
        status: remoteStatus,
        stdout: `${new TextDecoder().decode(encodeEvidenceV1(envelope))}\n`,
      };
    },
    async loadRuntime() {
      return {
        encodeEvidence: encodeEvidenceV1,
        currentValues() {
          return Object.freeze({ levy: 140 });
        },
        admitRemoteRun(value) {
          assert.deepEqual(value, { step: calibration.step, selection: calibration.selection });
          return Object.freeze({ step: calibration.step, selection: calibration.selection });
        },
        async evaluateValues(values) {
          evaluations.push(values);
          if (evaluateValues !== undefined) return evaluateValues(values);
          return values.levy === 140
            ? calibration.currentEvaluation
            : calibration.selectedEvaluation;
        },
      };
    },
    async writeAttestation(path, bytes) {
      writes.push({ path, bytes: new Uint8Array(bytes) });
    },
    async cleanupSource(received) {
      assert.equal(received, source);
    },
  };
  return { options, source, calibration, envelope, writes, evaluations, ports };
}

test("parses only the fixed direct argument order and a strict SSH target", () => {
  assert.deepEqual(parsePocBalanceRemoteArgumentsV1(validArgsV1()), {
    iteration: 0,
    priorAfterEvaluationSha256: null,
    host: "calibrator@10.0.0.110",
    remoteRoot: "Workspace",
    workers: 64,
    attestationOut: "/private/tmp/balance-attestation.json",
  });

  const chained = parsePocBalanceRemoteArgumentsV1(
    validArgsV1({ iteration: "7", priorAfter: digest("7") }),
  );
  assert.equal(chained.iteration, 7);
  assert.equal(chained.priorAfterEvaluationSha256, digest("7"));

  const invalid = [
    [],
    validArgsV1({ iteration: "13" }),
    validArgsV1({ workers: "0" }),
    validArgsV1({ workers: "65" }),
    validArgsV1({ host: "-oProxyCommand=bad" }),
    validArgsV1({ host: "10.0.0.999" }),
    validArgsV1({ host: "user@host:22" }),
    validArgsV1({ host: "user name@host" }),
    validArgsV1({ remoteRoot: "Workspace/other" }),
    validArgsV1({ attestationOut: "relative.json" }),
    validArgsV1({ iteration: "1" }),
    validArgsV1({ priorAfter: digest("7") }),
    [
      "--host=10.0.0.110",
      "--iteration=0",
      "--remote-root=Workspace",
      "--workers=64",
      "--attestation-out=/tmp/a.json",
    ],
    [...validArgsV1(), "--unknown=true"],
  ];
  for (const args of invalid) {
    assert.throws(() => parsePocBalanceRemoteArgumentsV1(args), /usage: run-poc-balance-remote/u);
  }
});

function sourceCommandFixtureV1(overrides = {}) {
  const calls = [];
  const outputs = {
    status: "",
    branch: "main\n",
    commit: `${commit}\n`,
    tree: `${tree}\n`,
    embeddedCommit: `${commit}\n`,
    nodeVersion: "v26.5.0\n",
    pnpmVersion: "11.11.0\n",
    materializationStatus: "goal materialization verified\n",
    ...overrides,
  };
  const runCommand = async (command, args, options) => {
    calls.push({ command, args, options });
    assert.equal(options.shell, false);
    if (command === "node" && args[0] === "--version") {
      return { status: 0, stdout: outputs.nodeVersion, stderr: "" };
    }
    if (command === "pnpm" && args[0] === "--version") {
      return { status: 0, stdout: outputs.pnpmVersion, stderr: "" };
    }
    if (command === "pnpm" && args[0] === "verify:materialization") {
      return { status: 0, stdout: outputs.materializationStatus, stderr: "" };
    }
    if (args[0] === "status") return { status: 0, stdout: outputs.status, stderr: "" };
    if (args[0] === "symbolic-ref") {
      return { status: outputs.branchStatus ?? 0, stdout: outputs.branch, stderr: "" };
    }
    if (args[0] === "rev-parse" && args[1] === "HEAD") {
      return { status: 0, stdout: outputs.commit, stderr: "" };
    }
    if (args[0] === "rev-parse" && args[1] === "HEAD^{tree}") {
      return { status: 0, stdout: outputs.tree, stderr: "" };
    }
    if (args[0] === "archive") return { status: 0, stdout: "", stderr: "" };
    if (args[0] === "get-tar-commit-id") {
      return { status: 0, stdout: outputs.embeddedCommit, stderr: "" };
    }
    throw new Error(`unexpected command ${command} ${args.join(" ")}`);
  };
  return { calls, runCommand };
}

async function inspectSourceFixtureV1(commandFixture) {
  return inspectPocBalanceRemoteSourceV1({
    root: "/repo/project-tavern",
    runCommand: commandFixture.runCommand,
    async createTemporaryDirectory() {
      return "/tmp/project-tavern-source";
    },
    async hashFile(path) {
      return path.endsWith("pnpm-lock.yaml") ? digest("d") : digest("c");
    },
    async readArchive() {
      return new TextEncoder().encode("fixture tar bytes");
    },
    async readMaterializationContract() {
      return {
        materializationDigest: digest("e"),
        packageClosureDigest: digest("f"),
      };
    },
  });
}

test("rejects dirty, detached, non-main, and wrong local toolchain sources before archiving", async () => {
  await assert.rejects(
    () => inspectSourceFixtureV1(sourceCommandFixtureV1({ status: " M tracked.ts\n" })),
    /balance_remote_source_dirty/u,
  );
  await assert.rejects(
    () => inspectSourceFixtureV1(sourceCommandFixtureV1({ branchStatus: 1, branch: "" })),
    /balance_remote_source_detached/u,
  );
  await assert.rejects(
    () => inspectSourceFixtureV1(sourceCommandFixtureV1({ branch: "topic\n" })),
    /balance_remote_source_branch/u,
  );
  await assert.rejects(
    () => inspectSourceFixtureV1(sourceCommandFixtureV1({ nodeVersion: "v24.15.0\n" })),
    /balance_remote_local_toolchain_mismatch/u,
  );
  await assert.rejects(
    () => inspectSourceFixtureV1(sourceCommandFixtureV1({ pnpmVersion: "11.10.0\n" })),
    /balance_remote_local_toolchain_mismatch/u,
  );
});

test("treats an early-closing successful stdin consumer by its exit status", async () => {
  const result = await runPocBalanceRemoteCommandV1(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      'process.stdin.once("data", () => { process.stdout.write("accepted\\n"); process.exit(0); });',
    ],
    {
      shell: false,
      input: new Uint8Array(12 * 1024 * 1024),
    },
  );

  assert.equal(result.status, 0);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, "accepted\n");
});

test("archives the complete frozen clean commit and rechecks source identity", async () => {
  const fixture = sourceCommandFixtureV1();
  const source = await inspectSourceFixtureV1(fixture);
  assert.deepEqual(source, sourceFixtureV1());
  const archiveCall = fixture.calls.find((call) => call.args[0] === "archive");
  assert(archiveCall);
  assert.deepEqual(archiveCall.args, [
    "archive",
    "--format=tar",
    "--output=/tmp/project-tavern-source/source.tar",
    commit,
  ]);
  assert(fixture.calls.every((call) => call.options.shell === false));
  assert.equal(fixture.calls.filter((call) => call.args[0] === "status").length, 2);
  assert.equal(
    fixture.calls.filter((call) => call.args[0] === "rev-parse" && call.args[1] === "HEAD").length,
    2,
  );
  const embeddedCommitCall = fixture.calls.find(
    (call) => call.command === "git" && call.args[0] === "get-tar-commit-id",
  );
  assert(embeddedCommitCall);
  assert.deepEqual(embeddedCommitCall.args, ["get-tar-commit-id"]);
  assert(embeddedCommitCall.options.input instanceof Uint8Array);
});

test("rejects a non-HEAD archive and a source that changes while it is archived", async () => {
  await assert.rejects(
    () => inspectSourceFixtureV1(sourceCommandFixtureV1({ embeddedCommit: `${"9".repeat(40)}\n` })),
    /balance_remote_archive_source_mismatch/u,
  );

  const fixture = sourceCommandFixtureV1();
  let statusCalls = 0;
  const original = fixture.runCommand;
  fixture.runCommand = async (command, args, options) => {
    const result = await original(command, args, options);
    if (args[0] === "status") {
      statusCalls += 1;
      if (statusCalls === 2) return { status: 0, stdout: " M changed.ts\n", stderr: "" };
    }
    return result;
  };
  await assert.rejects(() => inspectSourceFixtureV1(fixture), /balance_remote_source_changed/u);
});

test("uses shell-free scp/ssh argv and the preprovisioned HOME-relative toolchain", async () => {
  const source = sourceFixtureV1();
  const options = parsePocBalanceRemoteArgumentsV1(validArgsV1());
  const calls = [];
  const remoteStdout = `${JSON.stringify({ ok: true })}\n`;
  const result = await runPocBalanceRemoteTransportV1({
    source,
    options,
    createTransferId: () => "transfer-123",
    writeStderr() {},
    async runCommand(command, args, commandOptions) {
      calls.push({ command, args, options: commandOptions });
      assert.equal(commandOptions.shell, false);
      if (command === "scp") return { status: 0, stdout: "", stderr: "" };
      return { status: 0, stdout: remoteStdout, stderr: "shard progress\n" };
    },
  });
  assert.deepEqual(result, { status: 0, stdout: remoteStdout });
  assert.equal(calls.length, 3);
  assert.equal(calls[0].command, "ssh");
  assert.equal(calls[1].command, "scp");
  assert.deepEqual(calls[1].args.slice(0, 5), [
    "-o",
    "BatchMode=yes",
    "-o",
    "StrictHostKeyChecking=yes",
    "--",
  ]);
  assert.match(calls[1].args.at(-1), /^calibrator@10\.0\.0\.110:Workspace\//u);
  assert.equal(calls[2].command, "ssh");
  assert(
    calls[2].args.includes(
      "Workspace/project-tavern-worker/toolchains/node-v26.5.0-linux-x64/bin/node",
    ),
  );
  assert(calls[2].options.input.includes("pnpm install"));
  assert(calls[2].options.input.includes("--offline"));
  assert(calls[2].options.input.includes("--frozen-lockfile"));
  assert(calls[2].options.input.includes("pnpm-11.11.0"));
  assert(calls[2].options.input.includes("pnpm-v11"));
  assert(
    !calls.flatMap((call) => call.args).some((value) => /goal-materialization\.json/u.test(value)),
  );
});

test("loads local replay ports only after extracting the same frozen archive and installing offline", async () => {
  const source = sourceFixtureV1();
  const options = parsePocBalanceRemoteArgumentsV1(validArgsV1());
  const calls = [];
  const removals = [];
  const runtime = await loadPocBalanceFrozenReplayRuntimeV1({
    source,
    root: "/repo/project-tavern",
    options,
    async runCommand(command, args, commandOptions) {
      calls.push({ command, args, options: commandOptions });
      assert.equal(commandOptions.shell, false);
      if (command === "git" && args[0] === "get-tar-commit-id") {
        return { status: 0, stdout: `${source.sourceCommit}\n`, stderr: "" };
      }
      if (command === "git" && args[0] === "write-tree") {
        return { status: 0, stdout: `${source.sourceTree}\n`, stderr: "" };
      }
      if (command === "pnpm" && args[0] === "store") {
        return { status: 0, stdout: "/store/pnpm-v11\n", stderr: "" };
      }
      return { status: 0, stdout: "", stderr: "" };
    },
    async hashFile() {
      return source.sourceArchiveSha256;
    },
    async readArchive() {
      return new TextEncoder().encode("fixture tar bytes");
    },
    async createTemporaryDirectory() {
      return "/tmp/frozen-replay";
    },
    async removeTemporaryDirectory(path) {
      removals.push(path);
    },
    async removePath(path) {
      removals.push(path);
    },
    async loadRuntimeModules(input) {
      assert.equal(input.temporaryDirectory, "/tmp/frozen-replay");
      assert.equal(input.source, source);
      return [
        {
          canonicalPocBalanceEvidenceBytesV1: encodeEvidenceV1,
          pocBalanceCalibrationValuesV1: () => Object.freeze({ levy: 140 }),
          admitPocBalanceCalibrationRunV1: (value) => value,
        },
        {
          evaluatePocBalanceCalibrationValuesV1: async (inputValue) =>
            Object.freeze({ values: inputValue.values }),
        },
      ];
    },
  });
  assert.deepEqual(calls[2], {
    command: "tar",
    args: ["-xf", source.archivePath, "-C", "/tmp/frozen-replay"],
    options: { cwd: "/repo/project-tavern", shell: false },
  });
  assert.deepEqual(calls[6], {
    command: "pnpm",
    args: [
      "--filter",
      "@project-tavern/story-poc...",
      "install",
      "--prod",
      "--offline",
      "--frozen-lockfile",
      "--store-dir",
      "/store/pnpm-v11",
    ],
    options: { cwd: "/tmp/frozen-replay", shell: false },
  });
  assert.deepEqual(runtime.currentValues(), { levy: 140 });
  assert.deepEqual(await runtime.evaluateValues({ levy: 138 }), { values: { levy: 138 } });
  await runtime.cleanup();
  assert.deepEqual(removals, ["/tmp/frozen-replay/.git", "/tmp/frozen-replay"]);
});

test("surfaces bounded remote nonzero diagnostics and never treats stdout as evidence", async () => {
  const source = sourceFixtureV1();
  const options = parsePocBalanceRemoteArgumentsV1(validArgsV1());
  let call = 0;
  await assert.rejects(
    () =>
      runPocBalanceRemoteTransportV1({
        source,
        options,
        createTransferId: () => "transfer-123",
        writeStderr() {},
        async runCommand() {
          call += 1;
          if (call <= 2) return { status: 0, stdout: "", stderr: "" };
          return {
            status: 7,
            stdout: "PoC balance calibration untrusted\n",
            stderr: `remote exploded ${"x".repeat(10_000)}`,
          };
        },
      }),
    (error) => {
      assert.match(error.message, /balance_remote_execution_failed.*status=7/u);
      assert.match(error.message, /remote exploded/u);
      assert(!error.message.includes("untrusted"));
      assert(error.message.length < 5000);
      return true;
    },
  );
});

test("admits remote evidence, replays current and selected evaluations, and writes canonical attestation", async () => {
  const fixture = controllerFixtureV1();
  const stdout = [];
  const status = await runPocBalanceRemoteCliV1({
    args: validArgsV1(),
    ports: fixture.ports,
    writeStdout(value) {
      stdout.push(value);
    },
  });
  assert.equal(status, 0);
  assert.equal(stdout.join(""), semanticStdoutV1(fixture.calibration));
  assert.deepEqual(fixture.evaluations, [{ levy: 140 }, { levy: 138 }]);
  assert.equal(fixture.writes.length, 1);
  assert.equal(fixture.writes[0].path, "/private/tmp/balance-attestation.json");
  const attestationText = new TextDecoder().decode(fixture.writes[0].bytes);
  assert.notEqual(attestationText.at(-1), "\n");
  const attestation = JSON.parse(attestationText);
  assert.deepEqual(Object.keys(attestation).toSorted(), [
    "afterEvaluationSha256",
    "arch",
    "availableParallelism",
    "beforeEvaluationSha256",
    "contractId",
    "evidenceSha256",
    "firstSeed",
    "iteration",
    "lastSeed",
    "materializationDigest",
    "nodeArchiveSha256",
    "nodeVersion",
    "packageClosureDigest",
    "platform",
    "pnpmArchiveSha256",
    "pnpmLockSha256",
    "pnpmVersion",
    "schemaRevision",
    "sourceArchiveSha256",
    "sourceCommit",
    "sourceTree",
    "workerCount",
  ]);
  assert.equal(attestation.contractId, "project-tavern.poc-balance-remote-execution.v1");
  const beforeHash = await crypto.subtle.digest(
    "SHA-256",
    encodeEvidenceV1(fixture.calibration.currentEvaluation),
  );
  assert.equal(
    attestation.beforeEvaluationSha256,
    `sha256:${Buffer.from(beforeHash).toString("hex")}`,
  );
  assert.match(attestation.beforeEvaluationSha256, /^sha256:[0-9a-f]{64}$/u);
  assert.match(attestation.afterEvaluationSha256, /^sha256:[0-9a-f]{64}$/u);
  assert.match(attestation.evidenceSha256, /^sha256:[0-9a-f]{64}$/u);
  assert(!/host|10\.0\.0\.110|Workspace|private|tmp|time|elapsed|shard/u.test(attestationText));
});

test("publishes attestation bytes once without following or replacing the target", async () => {
  const directory = await mkdtemp(join(tmpdir(), "project-tavern-attestation-test-"));
  try {
    const target = join(directory, "attestation.json");
    const bytes = encodeEvidenceV1({ contractId: "fixture", schemaRevision: 1 });
    await writePocBalanceRemoteAttestationV1(target, bytes);
    assert((await readFile(target)).equals(Buffer.from(bytes)));
    await assert.rejects(
      () => writePocBalanceRemoteAttestationV1(target, bytes),
      /balance_remote_attestation_publish_failed/u,
    );

    const symlinkTarget = join(directory, "symlink-attestation.json");
    await symlink(target, symlinkTarget);
    await assert.rejects(
      () => writePocBalanceRemoteAttestationV1(symlinkTarget, bytes),
      /balance_remote_attestation_publish_failed/u,
    );
    assert((await readFile(target)).equals(Buffer.from(bytes)));
    await assert.rejects(
      () =>
        writePocBalanceRemoteAttestationV1(join(directory, "newline.json"), Buffer.from("{}\n")),
      /balance_remote_attestation_invalid/u,
    );
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("admits status one only for canonical unsatisfied evidence and attests a null after digest", async () => {
  const base = calibrationFixtureV1();
  const calibration = Object.freeze({
    ...base,
    step: Object.freeze({ ...base.step, candidates: Object.freeze([]) }),
    selection: Object.freeze({
      kind: "balance_contract_unsatisfied",
      reason: "no_improving_neighbor",
      metrics: Object.freeze({ median: 10.5 }),
      candidates: Object.freeze([]),
    }),
  });
  const fixture = controllerFixtureV1({ calibration, remoteStatus: 1 });
  const stdout = [];
  const status = await runPocBalanceRemoteCliV1({
    args: validArgsV1(),
    ports: fixture.ports,
    writeStdout(value) {
      stdout.push(value);
    },
  });
  assert.equal(status, 1);
  assert.equal(stdout.join(""), semanticStdoutV1(calibration));
  assert.deepEqual(fixture.evaluations, [{ levy: 140 }]);
  assert.equal(fixture.writes.length, 1);
  const attestation = JSON.parse(new TextDecoder().decode(fixture.writes[0].bytes));
  assert.equal(attestation.afterEvaluationSha256, null);

  const wrongExit = controllerFixtureV1({ calibration, remoteStatus: 0 });
  await assert.rejects(
    () => runPocBalanceRemoteCliV1({ args: validArgsV1(), ports: wrongExit.ports }),
    /balance_remote_exit_semantics_mismatch/u,
  );
  assert.equal(wrongExit.writes.length, 0);

  const candidateAtOne = controllerFixtureV1({ remoteStatus: 1 });
  await assert.rejects(
    () => runPocBalanceRemoteCliV1({ args: validArgsV1(), ports: candidateAtOne.ports }),
    /balance_remote_exit_semantics_mismatch/u,
  );
  assert.equal(candidateAtOne.writes.length, 0);
});

test("rejects remote source, toolchain, platform, and parallelism mismatches before runtime load", async () => {
  const cases = [
    [{ sourceCommit: "9".repeat(40) }, /balance_remote_source_mismatch/u],
    [{ nodeVersion: "v24.15.0" }, /balance_remote_toolchain_mismatch/u],
    [{ pnpmVersion: "11.10.0" }, /balance_remote_toolchain_mismatch/u],
    [{ platform: "darwin" }, /balance_remote_platform_mismatch/u],
    [{ arch: "arm64" }, /balance_remote_platform_mismatch/u],
    [{ availableParallelism: 63 }, /balance_remote_parallelism_insufficient/u],
  ];
  for (const [envelopeOverrides, expected] of cases) {
    const fixture = controllerFixtureV1({ envelopeOverrides });
    let loaded = false;
    fixture.ports.loadRuntime = async () => {
      loaded = true;
      throw new Error("must not load");
    };
    await assert.rejects(
      () => runPocBalanceRemoteCliV1({ args: validArgsV1(), ports: fixture.ports }),
      expected,
    );
    assert.equal(loaded, false);
    assert.equal(fixture.writes.length, 0);
  }
});

test("rejects noncanonical, extra-line, and structurally invalid semantic evidence", async () => {
  const calibration = calibrationFixtureV1();
  const noncanonical = `PoC balance calibration ${JSON.stringify({
    selection: calibration.selection,
    step: calibration.step,
  })}\n`;
  const cases = [
    [noncanonical, /balance_remote_evidence_noncanonical/u],
    [`${semanticStdoutV1(calibration)}extra\n`, /balance_remote_evidence_framing/u],
    ["PoC balance report {}\n", /balance_remote_evidence_framing/u],
  ];
  for (const [semanticOverride, expected] of cases) {
    const fixture = controllerFixtureV1({ semanticOverride });
    await assert.rejects(
      () => runPocBalanceRemoteCliV1({ args: validArgsV1(), ports: fixture.ports }),
      expected,
    );
    assert.equal(fixture.writes.length, 0);
  }
});

test("rejects a local current-baseline mismatch at iteration zero", async () => {
  const fixture = controllerFixtureV1({
    evaluateValues(values) {
      return values.levy === 140 ? { median: 9.5, score: 4 } : { median: 11.5, score: 2 };
    },
  });
  await assert.rejects(
    () => runPocBalanceRemoteCliV1({ args: validArgsV1(), ports: fixture.ports }),
    /balance_remote_baseline_mismatch/u,
  );
  assert.equal(fixture.writes.length, 0);
});

test("rejects selector admission and selected-candidate evaluation mismatches", async () => {
  const admission = controllerFixtureV1();
  admission.ports.loadRuntime = async () => ({
    encodeEvidence: encodeEvidenceV1,
    currentValues: () => ({ levy: 140 }),
    admitRemoteRun() {
      throw new TypeError("selector differs");
    },
    evaluateValues: async () => ({ median: 10.5, score: 3 }),
  });
  await assert.rejects(
    () => runPocBalanceRemoteCliV1({ args: validArgsV1(), ports: admission.ports }),
    /balance_remote_evidence_invalid.*selector differs/u,
  );

  const selected = controllerFixtureV1({
    evaluateValues(values) {
      return values.levy === 140 ? { median: 10.5, score: 3 } : { median: 12.5, score: 1 };
    },
  });
  await assert.rejects(
    () => runPocBalanceRemoteCliV1({ args: validArgsV1(), ports: selected.ports }),
    /balance_remote_selected_evaluation_mismatch/u,
  );
  assert.equal(selected.writes.length, 0);
});

test("accepts an admitted first-zero candidate prefix but rejects a nonzero partial prefix", async () => {
  const base = calibrationFixtureV1();
  const selectedEvaluation = Object.freeze({ median: 11.5, score: 0 });
  const step = Object.freeze({
    ...base.step,
    candidates: Object.freeze([
      Object.freeze({ ...base.step.candidates[0], evaluation: selectedEvaluation }),
    ]),
  });
  const selection = Object.freeze({
    ...base.selection,
    afterDeficit: 0,
  });
  const calibration = Object.freeze({
    ...base,
    step,
    selection,
    selectedEvaluation,
  });
  const accepted = controllerFixtureV1({ calibration });
  assert.equal(
    await runPocBalanceRemoteCliV1({
      args: validArgsV1(),
      ports: accepted.ports,
      writeStdout() {},
    }),
    0,
  );

  const rejected = controllerFixtureV1();
  rejected.ports.loadRuntime = async () => ({
    encodeEvidence: encodeEvidenceV1,
    currentValues: () => ({ levy: 140 }),
    admitRemoteRun() {
      throw new TypeError("nonzero evidence ends before canonical neighbor set");
    },
    evaluateValues: async () => base.currentEvaluation,
  });
  await assert.rejects(
    () => runPocBalanceRemoteCliV1({ args: validArgsV1(), ports: rejected.ports }),
    /balance_remote_evidence_invalid.*nonzero evidence ends/u,
  );
});

test("chains iteration greater than zero to an explicit prior local after digest", async () => {
  const calibration = calibrationFixtureV1();
  const prior = await crypto.subtle.digest(
    "SHA-256",
    encodeEvidenceV1(calibration.currentEvaluation),
  );
  const priorDigest = `sha256:${Buffer.from(prior).toString("hex")}`;
  const args = validArgsV1({ iteration: "1", priorAfter: priorDigest });
  const options = parsePocBalanceRemoteArgumentsV1(args);
  const step = Object.freeze({ ...calibration.step, iteration: 1 });
  const fixture = controllerFixtureV1({
    options,
    calibration: Object.freeze({ ...calibration, step }),
  });
  const status = await runPocBalanceRemoteCliV1({
    args,
    ports: fixture.ports,
    writeStdout() {},
  });
  assert.equal(status, 0);
  assert.deepEqual(fixture.evaluations, [{ levy: 138 }]);
  const attestation = JSON.parse(new TextDecoder().decode(fixture.writes[0].bytes));
  assert.equal(attestation.beforeEvaluationSha256, priorDigest);

  const mismatchArgs = validArgsV1({ iteration: "1", priorAfter: digest("1") });
  const mismatch = controllerFixtureV1({
    options: parsePocBalanceRemoteArgumentsV1(mismatchArgs),
    calibration: Object.freeze({ ...calibration, step }),
  });
  await assert.rejects(
    () => runPocBalanceRemoteCliV1({ args: mismatchArgs, ports: mismatch.ports }),
    /balance_remote_prior_evaluation_mismatch/u,
  );
});

test("always cleans the frozen source when replay cleanup fails", async () => {
  const fixture = controllerFixtureV1();
  let sourceCleanups = 0;
  const loadRuntime = fixture.ports.loadRuntime;
  fixture.ports.loadRuntime = async (...args) => ({
    ...(await loadRuntime(...args)),
    async cleanup() {
      throw new TypeError("replay cleanup failed");
    },
  });
  fixture.ports.cleanupSource = async () => {
    sourceCleanups += 1;
  };

  await assert.rejects(
    () =>
      runPocBalanceRemoteCliV1({
        args: validArgsV1(),
        ports: fixture.ports,
        writeStdout() {},
      }),
    /replay cleanup failed/u,
  );
  assert.equal(sourceCleanups, 1);
});

test("maps the persistent Story remote calibration alias", async () => {
  const storyPackage = JSON.parse(
    await readFile(new URL("../game/stories/poc/package.json", import.meta.url), "utf8"),
  );
  assert.equal(
    storyPackage.scripts["calibrate:balance:remote"],
    "node ../../../scripts/run-poc-balance-remote.mjs",
  );
});
