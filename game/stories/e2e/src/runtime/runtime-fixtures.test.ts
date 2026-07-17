// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import {
  mkdtemp,
  mkdir,
  open,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
  type FileHandle,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJsonBytes, digestBytes } from "@sillymaker/base";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  buildReviewedRecordProvenanceV1,
  buildRuntimeFixtureSetV1,
  classifyRuntimeFixtureV1,
  createRuntimeFixtureVerificationContextV1,
  replayTrackedDebugBundleV1,
  runtimeFixturePayloadNamesV1,
} from "../../scripts/runtime-fixture-builder.mjs";
import {
  regenerateRuntimeFixturesV1,
  type RuntimeFixtureGenerationCheckpointV1,
} from "../../scripts/regenerate-runtime-fixtures.mjs";
import {
  verifyRuntimeFixtureDirectoryStructureV1,
  verifyRuntimeFixtureDirectoryV1,
} from "../../scripts/verify-runtime-fixtures.mjs";
import {
  isRuntimeFixtureProvenanceCurrentV1,
  parseRuntimeFixtureProvenanceV1,
  runtimeFixtureProvenanceV1,
} from "./runtime-fixture-provenance.js";

const trackedRuntimeFixtureDirectoryV1 = new URL("../test/fixtures/runtime/", import.meta.url);
const trackedRuntimeFixtureParentV1 = fileURLToPath(new URL("../test/fixtures/", import.meta.url));
const runtimeFixtureWriterPathV1 = fileURLToPath(
  new URL("../../scripts/regenerate-runtime-fixtures.mts", import.meta.url),
);
const temporaryDirectoriesV1: string[] = [];
const temporaryChildrenV1: ChildProcess[] = [];
const transactionCheckpointsV1 = Object.freeze([
  "prepared",
  "old-renamed",
  "new-renamed",
  "swapped-journal",
] as const satisfies readonly RuntimeFixtureGenerationCheckpointV1[]);
type RuntimeFixtureSetV1 = Awaited<ReturnType<typeof buildRuntimeFixtureSetV1>>;

interface TransactionTreeEntryV1 {
  readonly path: string;
  readonly kind: "directory" | "file" | "other";
  readonly bytes?: string;
}

async function createTemporaryFixtureParentV1(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "project-tavern-runtime-fixtures-"));
  temporaryDirectoriesV1.push(directory);
  return directory;
}

async function readTrackedRuntimeFixtureV1(filename: string): Promise<Uint8Array> {
  return await readFile(new URL(filename, trackedRuntimeFixtureDirectoryV1));
}

async function writeFixtureSetV1(
  directory: string,
  fixtureSet: RuntimeFixtureSetV1,
): Promise<void> {
  await mkdir(directory);
  await Promise.all(
    [...fixtureSet.files].map(async ([filename, bytes]) => {
      await writeFile(join(directory, filename), bytes);
    }),
  );
}

async function expectFixtureSetV1(
  directory: string,
  fixtureSet: RuntimeFixtureSetV1,
): Promise<void> {
  await expect(
    verifyRuntimeFixtureDirectoryV1({
      directory,
      verificationContext: fixtureSet.verificationContext,
      compareWithFixtureSet: fixtureSet,
    }),
  ).resolves.toMatchObject({ fileCount: 11, payloadCount: 10 });
}

async function expectAbsentPathV1(path: string): Promise<void> {
  await expect(stat(path)).rejects.toMatchObject({ code: "ENOENT" });
}

async function snapshotTransactionTreeV1(
  parentDirectory: string,
): Promise<readonly TransactionTreeEntryV1[]> {
  const snapshot: TransactionTreeEntryV1[] = [];
  const visit = async (directory: string, prefix: string): Promise<void> => {
    const entries = (await readdir(directory, { withFileTypes: true })).toSorted((left, right) =>
      left.name.localeCompare(right.name),
    );
    for (const entry of entries) {
      const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        snapshot.push(Object.freeze({ path, kind: "directory" }));
        await visit(absolutePath, path);
      } else if (entry.isFile()) {
        snapshot.push(
          Object.freeze({
            path,
            kind: "file",
            bytes: Buffer.from(await readFile(absolutePath)).toString("hex"),
          }),
        );
      } else {
        snapshot.push(Object.freeze({ path, kind: "other" }));
      }
    }
  };
  await visit(parentDirectory, "");
  return Object.freeze(snapshot);
}

async function snapshotOptionalDirectoryV1(directory: string): Promise<
  | Readonly<{ readonly exists: false }>
  | Readonly<{
      readonly exists: true;
      readonly tree: readonly TransactionTreeEntryV1[];
    }>
> {
  try {
    const directoryStats = await stat(directory);
    if (!directoryStats.isDirectory()) {
      return Object.freeze({
        exists: true,
        tree: Object.freeze([Object.freeze({ path: ".", kind: "other" as const })]),
      });
    }
  } catch (error) {
    if (error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return Object.freeze({ exists: false });
    }
    throw error;
  }
  return Object.freeze({
    exists: true,
    tree: await snapshotTransactionTreeV1(directory),
  });
}

async function readChildOutputV1(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : new Uint8Array(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function removeTemporaryChildV1(child: ChildProcess): void {
  const index = temporaryChildrenV1.indexOf(child);
  if (index !== -1) temporaryChildrenV1.splice(index, 1);
}

async function interruptWriterChildV1(
  targetDirectory: string,
  checkpoint: RuntimeFixtureGenerationCheckpointV1,
): Promise<void> {
  const child = spawn(
    process.execPath,
    [
      "--experimental-strip-types",
      runtimeFixtureWriterPathV1,
      "--target-directory",
      targetDirectory,
      "--test-checkpoint",
      checkpoint,
    ],
    {
      cwd: process.cwd(),
      shell: false,
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    },
  );
  temporaryChildrenV1.push(child);
  if (child.stdout === null || child.stderr === null) {
    throw new TypeError("runtime fixture writer child stdio is unavailable");
  }
  const stdoutPromise = readChildOutputV1(child.stdout);
  const stderrPromise = readChildOutputV1(child.stderr);
  const closePromise = once(child, "close");
  const ready = await Promise.race([
    once(child, "message").then(([message]) =>
      Object.freeze({ kind: "message" as const, message }),
    ),
    closePromise.then(([code, signal]) => Object.freeze({ kind: "closed" as const, code, signal })),
  ]);
  if (ready.kind === "closed") {
    const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise]);
    removeTemporaryChildV1(child);
    throw new TypeError(
      `runtime fixture writer exited before checkpoint (${String(ready.code)}/${String(ready.signal)}): ${stdout}${stderr}`,
    );
  }
  expect(ready.message).toEqual({
    kind: "runtime_fixture_generation.checkpoint",
    checkpoint,
  });
  expect(child.kill("SIGINT")).toBe(true);
  const [code, signal] = await closePromise;
  await Promise.all([stdoutPromise, stderrPromise]);
  removeTemporaryChildV1(child);
  expect(code).toBeNull();
  expect(signal).toBe("SIGINT");
}

async function expectNoTransactionResidueV1(parentDirectory: string): Promise<void> {
  const entries = await readdir(parentDirectory);
  expect(
    entries.filter(
      (entry) =>
        entry.startsWith(".runtime-fixtures.next-") ||
        entry === ".runtime-fixtures.previous" ||
        entry === ".runtime-fixtures.transaction.v1.json",
    ),
  ).toEqual([]);
}

afterEach(async () => {
  await Promise.all(
    temporaryChildrenV1.splice(0).map(async (child) => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      const closed = once(child, "close").catch(() => undefined);
      child.kill("SIGKILL");
      await closed;
    }),
  );
  await Promise.all(
    temporaryDirectoriesV1.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

describe("runtime fixture provenance modes", () => {
  it("keeps diagnostic-only drift nonblocking for verification and strict for generation", () => {
    const diagnosticDrift = parseRuntimeFixtureProvenanceV1({
      ...runtimeFixtureProvenanceV1,
      diagnosticAtGeneration: {
        ...runtimeFixtureProvenanceV1.diagnosticAtGeneration,
        appBuildId: digestBytes(Uint8Array.of(1)),
      },
    });

    expect(
      isRuntimeFixtureProvenanceCurrentV1(
        diagnosticDrift,
        runtimeFixtureProvenanceV1,
        "read_only_verification",
      ),
    ).toBe(true);
    expect(
      isRuntimeFixtureProvenanceCurrentV1(
        diagnosticDrift,
        runtimeFixtureProvenanceV1,
        "fixture_generation",
      ),
    ).toBe(false);
  });

  it("rejects blocking provenance drift in both modes", () => {
    const blockingDrift = parseRuntimeFixtureProvenanceV1({
      ...runtimeFixtureProvenanceV1,
      blocking: {
        ...runtimeFixtureProvenanceV1.blocking,
        engineDigest: digestBytes(Uint8Array.of(2)),
      },
    });

    expect(
      isRuntimeFixtureProvenanceCurrentV1(
        blockingDrift,
        runtimeFixtureProvenanceV1,
        "read_only_verification",
      ),
    ).toBe(false);
    expect(
      isRuntimeFixtureProvenanceCurrentV1(
        blockingDrift,
        runtimeFixtureProvenanceV1,
        "fixture_generation",
      ),
    ).toBe(false);
  });

  it("rebuilds read-only payloads from the reviewed diagnostic evidence", async () => {
    const syntheticFrozen = parseRuntimeFixtureProvenanceV1({
      ...runtimeFixtureProvenanceV1,
      blocking: {
        ...runtimeFixtureProvenanceV1.blocking,
        engineDigest: digestBytes(Uint8Array.of(3)),
      },
      diagnosticAtGeneration: {
        ...runtimeFixtureProvenanceV1.diagnosticAtGeneration,
        storyDigest: digestBytes(Uint8Array.of(4)),
        presentationDigest: digestBytes(Uint8Array.of(5)),
        patchSet: {
          digest: digestBytes(Uint8Array.of(6)),
          simulationDigest: digestBytes(Uint8Array.of(7)),
          presentationDigest: digestBytes(Uint8Array.of(8)),
          appliedHotfixes: [],
        },
        engineVersion: "reviewed-engine-version",
      },
    });
    expect(buildReviewedRecordProvenanceV1(syntheticFrozen)).toEqual({
      story: {
        id: syntheticFrozen.blocking.storyId,
        revision: syntheticFrozen.blocking.storyRevision,
        digest: syntheticFrozen.diagnosticAtGeneration.storyDigest,
      },
      engine: {
        version: syntheticFrozen.diagnosticAtGeneration.engineVersion,
        digest: syntheticFrozen.blocking.engineDigest,
      },
      resolved: {
        stateContractRevision: syntheticFrozen.blocking.stateContractRevision,
        stateContractDigest: syntheticFrozen.blocking.stateContractDigest,
        simulationDigest: syntheticFrozen.blocking.simulationDigest,
        presentationDigest: syntheticFrozen.diagnosticAtGeneration.presentationDigest,
        patchSet: syntheticFrozen.diagnosticAtGeneration.patchSet,
      },
    });

    const fixtureSet = await buildRuntimeFixtureSetV1({
      provenanceMode: "read_only_verification",
    });
    const bytes = fixtureSet.files.get("manual-terminal.v1.json");
    if (bytes === undefined) throw new TypeError("missing rebuilt manual runtime fixture");
    const decoded = JSON.parse(Buffer.from(bytes).toString("utf8")) as {
      readonly provenance: unknown;
    };
    const frozen = runtimeFixtureProvenanceV1;

    expect(fixtureSet.verificationContext.recordProvenance).toEqual({
      story: {
        id: frozen.blocking.storyId,
        revision: frozen.blocking.storyRevision,
        digest: frozen.diagnosticAtGeneration.storyDigest,
      },
      engine: {
        version: frozen.diagnosticAtGeneration.engineVersion,
        digest: frozen.blocking.engineDigest,
      },
      resolved: {
        stateContractRevision: frozen.blocking.stateContractRevision,
        stateContractDigest: frozen.blocking.stateContractDigest,
        simulationDigest: frozen.blocking.simulationDigest,
        presentationDigest: frozen.diagnosticAtGeneration.presentationDigest,
        patchSet: frozen.diagnosticAtGeneration.patchSet,
      },
    });
    expect(decoded.provenance).toEqual(fixtureSet.verificationContext.recordProvenance);
  });
});

describe("reviewed E2E runtime fixtures", () => {
  let verificationContextV1: Awaited<ReturnType<typeof createRuntimeFixtureVerificationContextV1>>;

  beforeAll(async () => {
    verificationContextV1 = await createRuntimeFixtureVerificationContextV1();
  });

  it.each([
    ["auto-current-flow-blocked.v1.json", "exact", "normal"],
    ["auto-previous-recovery.v1.json", "exact", "normal"],
    ["quick-narrative-branch.v1.json", "exact", "normal"],
    ["manual-terminal.v1.json", "exact", "normal"],
    ["manual-modified-cheat.v1.json", "exact", "modified"],
    ["adoption-exact-patchset.v1.json", "adopted", "normal"],
    ["adoption-lineage-limit.v1.json", "compatibility.lineage_limit", "normal"],
    ["corrupt-state-digest.v1.json", "digest.state_mismatch", "normal"],
    ["future-format-revision.v1.json", "envelope.unsupported_revision", "normal"],
  ] as const)("keeps %s in its reviewed class", async (filename, expected, integrity) => {
    const result = await classifyRuntimeFixtureV1(
      filename,
      await readTrackedRuntimeFixtureV1(filename),
      verificationContextV1,
    );
    expect(result).toEqual({ classification: expected, integrityMode: integrity });
  });

  it("authoritatively replays the tracked debug bundle", async () => {
    const bytes = await readTrackedRuntimeFixtureV1("debug-flow-command-log.v1.json");
    await expect(replayTrackedDebugBundleV1(bytes, verificationContextV1)).resolves.toMatchObject({
      authoritative: true,
      identityMatch: true,
      matches: true,
      finalIntegrity: { mode: "modified" },
    });
  });

  it("tracks exactly ten payloads plus a non-self-listed manifest", async () => {
    expect(runtimeFixturePayloadNamesV1).toHaveLength(10);
    expect(runtimeFixturePayloadNamesV1).toEqual([...runtimeFixturePayloadNamesV1].toSorted());
    expect(runtimeFixturePayloadNamesV1).not.toContain("manifest.v1.json");
    await expect(
      verifyRuntimeFixtureDirectoryV1({
        directory: trackedRuntimeFixtureDirectoryV1,
        verificationContext: verificationContextV1,
        compareWithBuilder: true,
      }),
    ).resolves.toMatchObject({ fileCount: 11, payloadCount: 10 });
  });
});

describe("runtime fixture directory transaction recovery", () => {
  let oldFixtureSetV1: RuntimeFixtureSetV1;
  let newFixtureSetV1: RuntimeFixtureSetV1;

  beforeAll(async () => {
    [oldFixtureSetV1, newFixtureSetV1] = await Promise.all([
      buildRuntimeFixtureSetV1({ generatedAt: "2026-07-13T00:00:00.000Z" }),
      buildRuntimeFixtureSetV1({ generatedAt: "2026-07-14T00:00:00.000Z" }),
    ]);
    const expectedNames = [...runtimeFixturePayloadNamesV1, "manifest.v1.json"].toSorted();
    expect([...oldFixtureSetV1.files.keys()].toSorted()).toEqual(expectedNames);
    expect([...newFixtureSetV1.files.keys()].toSorted()).toEqual(expectedNames);
    for (const filename of expectedNames) {
      const oldBytes = oldFixtureSetV1.files.get(filename);
      const newBytes = newFixtureSetV1.files.get(filename);
      expect(oldBytes, `missing old fixture ${filename}`).toBeInstanceOf(Uint8Array);
      expect(newBytes, `missing new fixture ${filename}`).toBeInstanceOf(Uint8Array);
      expect(
        Buffer.from(oldBytes ?? []).equals(Buffer.from(newBytes ?? [])),
        `${filename} must be byte-distinct across reviewed sets`,
      ).toBe(false);
    }

    const verificationParent = await mkdtemp(
      join(tmpdir(), "project-tavern-runtime-fixture-set-verification-"),
    );
    try {
      const oldDirectory = join(verificationParent, "old");
      const newDirectory = join(verificationParent, "new");
      await Promise.all([
        writeFixtureSetV1(oldDirectory, oldFixtureSetV1),
        writeFixtureSetV1(newDirectory, newFixtureSetV1),
      ]);
      await Promise.all([
        expectFixtureSetV1(oldDirectory, oldFixtureSetV1),
        expectFixtureSetV1(newDirectory, newFixtureSetV1),
      ]);
    } finally {
      await rm(verificationParent, { recursive: true, force: true });
    }
  });

  it("replaces a structurally valid historical target after generator-source drift", async () => {
    const parentDirectory = await createTemporaryFixtureParentV1();
    const targetDirectory = join(parentDirectory, "runtime");
    await writeFixtureSetV1(targetDirectory, oldFixtureSetV1);
    const staleGeneratorSourceDigest = `sha256:${"f".repeat(64)}`;
    expect(oldFixtureSetV1.manifest.generatorSourceDigest).not.toBe(staleGeneratorSourceDigest);
    await writeFile(
      join(targetDirectory, "manifest.v1.json"),
      canonicalJsonBytes({
        ...oldFixtureSetV1.manifest,
        generatorSourceDigest: staleGeneratorSourceDigest,
      }),
    );

    await expect(
      verifyRuntimeFixtureDirectoryV1({
        directory: targetDirectory,
        verificationContext: newFixtureSetV1.verificationContext,
      }),
    ).rejects.toThrow("runtime fixture generator source digest drifted");
    await expect(
      verifyRuntimeFixtureDirectoryStructureV1({ directory: targetDirectory }),
    ).resolves.toMatchObject({ fileCount: 11, payloadCount: 10 });

    await expect(
      regenerateRuntimeFixturesV1({ targetDirectory, fixtureSet: newFixtureSetV1 }),
    ).resolves.toMatchObject({
      code: "runtime_fixture_generation.generated",
      targetPresent: true,
    });
    await expectFixtureSetV1(targetDirectory, newFixtureSetV1);
    await expectNoTransactionResidueV1(parentDirectory);
  });

  it.each(["fixtureSet", "onCheckpoint"] as const)(
    "rejects the %s test seam for the canonical tracked target before recovery",
    async (testSeam) => {
      const before = await snapshotOptionalDirectoryV1(trackedRuntimeFixtureParentV1);
      const onCheckpoint = vi.fn();
      await expect(
        regenerateRuntimeFixturesV1({
          targetDirectory: trackedRuntimeFixtureDirectoryV1,
          ...(testSeam === "fixtureSet" ? { fixtureSet: newFixtureSetV1 } : { onCheckpoint }),
        }),
      ).rejects.toMatchObject({
        code: "runtime_fixture_generation.tracked_target_test_seam_forbidden",
      });
      expect(onCheckpoint).not.toHaveBeenCalled();
      expect(await snapshotOptionalDirectoryV1(trackedRuntimeFixtureParentV1)).toEqual(before);
    },
  );

  it("rejects a symlinked parent alias of the canonical tracked target", async () => {
    const temporaryParent = await createTemporaryFixtureParentV1();
    const aliasParent = join(temporaryParent, "tracked-fixtures-alias");
    const aliasTarget = join(aliasParent, "runtime");
    await symlink(trackedRuntimeFixtureParentV1, aliasParent, "dir");
    const before = await snapshotOptionalDirectoryV1(trackedRuntimeFixtureParentV1);

    await expect(
      regenerateRuntimeFixturesV1({
        targetDirectory: aliasTarget,
        fixtureSet: newFixtureSetV1,
      }),
    ).rejects.toMatchObject({
      code: "runtime_fixture_generation.tracked_target_alias",
    });
    expect(await snapshotOptionalDirectoryV1(trackedRuntimeFixtureParentV1)).toEqual(before);
  });

  it.each(transactionCheckpointsV1)(
    "recovers exact reviewed bytes after a real child SIGINT at %s",
    async (checkpoint) => {
      const parentDirectory = await createTemporaryFixtureParentV1();
      const targetDirectory = join(parentDirectory, "runtime");
      await writeFixtureSetV1(targetDirectory, oldFixtureSetV1);
      await expectFixtureSetV1(targetDirectory, oldFixtureSetV1);

      await interruptWriterChildV1(targetDirectory, checkpoint);

      const expectsNew = checkpoint === "swapped-journal";
      await expect(
        regenerateRuntimeFixturesV1({ targetDirectory, fixtureSet: newFixtureSetV1 }),
      ).resolves.toMatchObject({
        code: expectsNew
          ? "runtime_fixture_generation.recovered_commit"
          : "runtime_fixture_generation.recovered_rollback",
        targetPresent: true,
      });
      await expectFixtureSetV1(targetDirectory, expectsNew ? newFixtureSetV1 : oldFixtureSetV1);
      await expectNoTransactionResidueV1(parentDirectory);
    },
  );

  it.each(transactionCheckpointsV1)(
    "recovers exact reviewed bytes after an injected throw at %s",
    async (checkpoint) => {
      const parentDirectory = await createTemporaryFixtureParentV1();
      const targetDirectory = join(parentDirectory, "runtime");
      await writeFixtureSetV1(targetDirectory, oldFixtureSetV1);

      await expect(
        regenerateRuntimeFixturesV1({
          targetDirectory,
          fixtureSet: newFixtureSetV1,
          onCheckpoint(reached) {
            if (reached === checkpoint) {
              throw new TypeError(`injected throw at ${reached}`);
            }
          },
        }),
      ).rejects.toThrow(`injected throw at ${checkpoint}`);

      const expectsNew = checkpoint === "swapped-journal";
      await expect(
        regenerateRuntimeFixturesV1({ targetDirectory, fixtureSet: newFixtureSetV1 }),
      ).resolves.toMatchObject({
        code: expectsNew
          ? "runtime_fixture_generation.recovered_commit"
          : "runtime_fixture_generation.recovered_rollback",
        targetPresent: true,
      });
      await expectFixtureSetV1(targetDirectory, expectsNew ? newFixtureSetV1 : oldFixtureSetV1);
      await expectNoTransactionResidueV1(parentDirectory);
    },
  );

  it.each(["prepared", "new-renamed", "swapped-journal"] as const)(
    "recovers an exact first-generation state after %s",
    async (checkpoint) => {
      const parentDirectory = await createTemporaryFixtureParentV1();
      const targetDirectory = join(parentDirectory, "runtime");

      await expect(
        regenerateRuntimeFixturesV1({
          targetDirectory,
          fixtureSet: newFixtureSetV1,
          onCheckpoint(reached) {
            if (reached === checkpoint) throw new TypeError(`first generation ${reached}`);
          },
        }),
      ).rejects.toThrow(`first generation ${checkpoint}`);

      const expectsNew = checkpoint === "swapped-journal";
      await expect(
        regenerateRuntimeFixturesV1({ targetDirectory, fixtureSet: newFixtureSetV1 }),
      ).resolves.toMatchObject({
        code: expectsNew
          ? "runtime_fixture_generation.recovered_commit"
          : "runtime_fixture_generation.recovered_rollback",
        targetPresent: expectsNew,
      });
      if (expectsNew) {
        await expectFixtureSetV1(targetDirectory, newFixtureSetV1);
      } else {
        await expectAbsentPathV1(targetDirectory);
        expect(await readdir(parentDirectory)).toEqual([]);
      }
      await expectNoTransactionResidueV1(parentDirectory);
    },
  );

  it.each([
    ["malformed journal", "prepared"],
    ["unverifiable previous", "old-renamed"],
    ["extra next directory", "prepared"],
    ["unknown candidate bytes", "prepared"],
    ["unknown transaction sibling", "prepared"],
  ] as const)("preserves the entire ambiguous tree for %s", async (scenario, checkpoint) => {
    const parentDirectory = await createTemporaryFixtureParentV1();
    const targetDirectory = join(parentDirectory, "runtime");
    await writeFixtureSetV1(targetDirectory, oldFixtureSetV1);
    await expect(
      regenerateRuntimeFixturesV1({
        targetDirectory,
        fixtureSet: newFixtureSetV1,
        onCheckpoint(reached) {
          if (reached === checkpoint) throw new TypeError(`leave ${scenario}`);
        },
      }),
    ).rejects.toThrow(`leave ${scenario}`);

    if (scenario === "malformed journal") {
      await writeFile(join(parentDirectory, ".runtime-fixtures.transaction.v1.json"), "{");
    } else if (scenario === "unverifiable previous") {
      await writeFile(
        join(parentDirectory, ".runtime-fixtures.previous", "manual-terminal.v1.json"),
        "invalid previous bytes",
      );
    } else if (scenario === "extra next directory") {
      const extraNext = join(parentDirectory, ".runtime-fixtures.next-999999");
      await mkdir(extraNext);
      await writeFile(join(extraNext, "evidence.bin"), "extra next evidence");
    } else if (scenario === "unknown candidate bytes") {
      const nextName = (await readdir(parentDirectory)).find((entry) =>
        entry.startsWith(".runtime-fixtures.next-"),
      );
      expect(nextName).toBeDefined();
      await writeFile(join(parentDirectory, nextName ?? "", "unknown.bin"), "unknown bytes");
    } else {
      await writeFile(
        join(parentDirectory, ".runtime-fixtures.mystery"),
        "unknown transaction evidence",
      );
    }

    const before = await snapshotTransactionTreeV1(parentDirectory);
    await expect(
      regenerateRuntimeFixturesV1({ targetDirectory, fixtureSet: newFixtureSetV1 }),
    ).rejects.toMatchObject({ code: "runtime_fixture_generation.recovery_ambiguous" });
    expect(await snapshotTransactionTreeV1(parentDirectory)).toEqual(before);
  });

  it("preserves an orphan next tree when the no-journal target is unknown", async () => {
    const parentDirectory = await createTemporaryFixtureParentV1();
    const targetDirectory = join(parentDirectory, "runtime");
    const orphanNext = join(parentDirectory, ".runtime-fixtures.next-999999");
    await Promise.all([mkdir(targetDirectory), mkdir(orphanNext)]);
    await Promise.all([
      writeFile(join(targetDirectory, "unknown.bin"), "unknown target bytes"),
      writeFile(join(orphanNext, "partial.bin"), "partial candidate bytes"),
    ]);

    const before = await snapshotTransactionTreeV1(parentDirectory);
    await expect(
      regenerateRuntimeFixturesV1({ targetDirectory, fixtureSet: newFixtureSetV1 }),
    ).rejects.toMatchObject({ code: "runtime_fixture_generation.recovery_ambiguous" });
    expect(await snapshotTransactionTreeV1(parentDirectory)).toEqual(before);
  });

  it("fsyncs the parent directory immediately before every checkpoint", async () => {
    const parentDirectory = await createTemporaryFixtureParentV1();
    const targetDirectory = join(parentDirectory, "runtime");
    await writeFixtureSetV1(targetDirectory, oldFixtureSetV1);
    const parentStats = await stat(parentDirectory);
    const parentIdentity = Object.freeze({ dev: parentStats.dev, ino: parentStats.ino });
    const probe = await open(parentDirectory, "r");
    const fileHandlePrototype = Object.getPrototypeOf(probe) as {
      sync: FileHandle["sync"];
    };
    const originalSync = fileHandlePrototype.sync;
    await probe.close();
    const durabilityEvents: Array<Readonly<{ dev: number; ino: number }>> = [];
    const observations: Array<
      Readonly<{
        checkpoint: RuntimeFixtureGenerationCheckpointV1;
        eventCount: number;
        lastEvent: Readonly<{ dev: number; ino: number }> | undefined;
      }>
    > = [];
    const syncSpy = vi.spyOn(fileHandlePrototype, "sync").mockImplementation(async function (
      this: FileHandle,
    ): Promise<void> {
      await originalSync.call(this);
      const syncedStats = await this.stat();
      durabilityEvents.push(Object.freeze({ dev: syncedStats.dev, ino: syncedStats.ino }));
    });
    let previousEventCount = 0;
    try {
      await regenerateRuntimeFixturesV1({
        targetDirectory,
        fixtureSet: newFixtureSetV1,
        onCheckpoint(checkpoint) {
          const eventCount = durabilityEvents.length;
          const lastEvent = durabilityEvents.at(-1);
          expect(eventCount).toBeGreaterThan(previousEventCount);
          expect(lastEvent).toEqual(parentIdentity);
          observations.push(Object.freeze({ checkpoint, eventCount, lastEvent }));
          previousEventCount = eventCount;
        },
      });
    } finally {
      syncSpy.mockRestore();
    }

    expect(observations.map(({ checkpoint }) => checkpoint)).toEqual(transactionCheckpointsV1);
    for (let index = 1; index < observations.length; index += 1) {
      expect(observations[index]?.eventCount).toBeGreaterThan(
        observations[index - 1]?.eventCount ?? 0,
      );
    }
    expect(observations.every(({ lastEvent }) => lastEvent?.dev === parentIdentity.dev)).toBe(true);
    expect(observations.every(({ lastEvent }) => lastEvent?.ino === parentIdentity.ino)).toBe(true);
    await expectFixtureSetV1(targetDirectory, newFixtureSetV1);
    await expectNoTransactionResidueV1(parentDirectory);
  });
});
