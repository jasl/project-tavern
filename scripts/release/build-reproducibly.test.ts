// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { promisify } from "node:util";
import { mkdir, mkdtemp, readFile, realpath, rm, utimes, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  canonicalArtifactJsonBytesV1,
  writeArtifactManifestV1,
} from "./create-artifact-manifest.mjs";
import {
  assertForbiddenArchiveAuthorityAbsentV1,
  assertReproducibleArtifactSetV1,
  buildReproduciblyV1,
  compareArtifactDirectoriesV1,
  createArchiveInstallInvocationV1,
  createVerifiedArchiveChildInvocationV1,
  inspectReproducibleSourceV1,
  parseReproducibleBuildArgumentsV1,
  runNodeCommandV1,
  snapshotArtifactV1,
  validateTarArchiveV1,
  verifyTrackedTreeEntriesV1,
  type ReproducibleCommandResultV1,
  type ReproducibleBuildPortsV1,
  type ReproducibleBuildStagePortsV1,
  type ReproducibleSourceAuthorityV1,
  type ReproducibleSourceInspectionPortsV1,
  type PreparedArchiveV1,
} from "./build-reproducibly.mjs";

const digest = (character: string) => `sha256:${character.repeat(64)}` as const;
const objectId = (character: string) => character.repeat(40);
const temporaryRootsV1: string[] = [];
const repositoryRootV1 = resolve(import.meta.dirname, "../..");
const execFileAsyncV1 = promisify(execFile);

const toolsV1 = Object.freeze({
  node: "v26.5.0",
  pnpm: "11.11.0",
  typescript: "7.0.2",
  vite: "8.1.4",
});

const frozenSourceV1 = Object.freeze({
  materializationDigest: digest("2"),
  sourceCommit: objectId("3"),
  sourceTree: objectId("4"),
  tools: toolsV1,
});

async function createArtifactFixtureV1(
  input: {
    readonly buildInput?: Readonly<Record<string, unknown>>;
    readonly payload?: string;
  } = {},
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "project-tavern-repro-artifact-"));
  temporaryRootsV1.push(root);
  await writeArtifactFixtureV1(root, input);
  return root;
}

async function writeArtifactFixtureV1(
  root: string,
  input: {
    readonly buildInput?: Readonly<Record<string, unknown>>;
    readonly payload?: string;
  } = {},
): Promise<void> {
  await mkdir(join(root, "assets"), { recursive: true });
  await Promise.all([
    writeFile(
      join(root, "build-input.json"),
      canonicalArtifactJsonBytesV1(
        input.buildInput ?? {
          materializationDigest: frozenSourceV1.materializationDigest,
          provenanceMode: "clean_commit",
          sourceCommit: frozenSourceV1.sourceCommit,
          sourceTree: frozenSourceV1.sourceTree,
          tools: frozenSourceV1.tools,
        },
      ),
    ),
    writeFile(join(root, "index.html"), "<!doctype html><title>Project Tavern</title>"),
    writeFile(join(root, "assets/app.js"), input.payload ?? "export const value = 1;"),
  ]);
  await writeArtifactManifestV1(root);
}

afterEach(async () => {
  await Promise.all(
    temporaryRootsV1.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe("compareArtifactDirectoriesV1", () => {
  it("compares sorted file sets and exact digests rather than mtimes", async () => {
    const buildA = await createArtifactFixtureV1();
    const buildB = await createArtifactFixtureV1();
    await utimes(join(buildB, "assets/app.js"), new Date(1_000), new Date(9_000_000));

    await expect(compareArtifactDirectoriesV1(buildA, buildB)).resolves.toEqual({
      equal: true,
      differences: [],
    });
  });

  it("reports a deterministic payload difference", async () => {
    const buildA = await createArtifactFixtureV1();
    const buildB = await createArtifactFixtureV1({ payload: "export const value = 2;" });

    const result = await compareArtifactDirectoriesV1(buildA, buildB);
    expect(result.equal).toBe(false);
    expect(result.differences).toEqual(["assets/app.js"]);
  });

  it("rejects a detached manifest byte change even when payload tuples are unchanged", async () => {
    const buildA = await createArtifactFixtureV1();
    const buildB = await createArtifactFixtureV1();
    await writeFile(join(buildB, "artifact-manifest.json"), "{}\n");

    await expect(compareArtifactDirectoriesV1(buildA, buildB)).rejects.toThrow(
      /release\.repro_manifest_mismatch/u,
    );
  });
});

describe("assertReproducibleArtifactSetV1", () => {
  it("requires archive A, archive B, and the actual handoff to be byte-identical", async () => {
    const buildA = await createArtifactFixtureV1();
    const buildB = await createArtifactFixtureV1();
    const handoff = await createArtifactFixtureV1();

    await expect(
      assertReproducibleArtifactSetV1({ buildA, buildB, expected: frozenSourceV1, handoff }),
    ).resolves.toMatchObject({ manifestDigest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u) });
  });

  it("returns the exact once-captured handoff digest when the source mutates after capture", async () => {
    const buildA = await createArtifactFixtureV1();
    const buildB = await createArtifactFixtureV1();
    const handoff = await createArtifactFixtureV1();
    const expectedHandoffDigest = (await snapshotArtifactV1(handoff)).manifestDigest;
    const snapshotArtifact = vi.fn(async (directory: string) => {
      const snapshot = await snapshotArtifactV1(directory);
      if (directory === handoff) {
        await Promise.all([
          writeFile(join(handoff, "artifact-manifest.json"), "{}\n"),
          writeFile(join(handoff, "build-input.json"), "{}\n"),
        ]);
      }
      return snapshot;
    });

    await expect(
      assertReproducibleArtifactSetV1(
        { buildA, buildB, expected: frozenSourceV1, handoff },
        { snapshotArtifact },
      ),
    ).resolves.toEqual({ manifestDigest: expectedHandoffDigest });
    expect(snapshotArtifact.mock.calls.map(([directory]) => directory)).toEqual([
      buildA,
      buildB,
      handoff,
    ]);
  });

  it("rejects a parallel internal build that differs from the prepared handoff", async () => {
    const buildA = await createArtifactFixtureV1();
    const buildB = await createArtifactFixtureV1();
    const handoff = await createArtifactFixtureV1({ payload: "export const value = 2;" });

    await expect(
      assertReproducibleArtifactSetV1({ buildA, buildB, expected: frozenSourceV1, handoff }),
    ).rejects.toThrow(/release\.repro_artifact_mismatch/u);
  });

  it.each([
    {
      label: "development provenance",
      patch: { provenanceMode: "development", sourceTree: null },
    },
    { label: "stale source tree", patch: { sourceTree: objectId("9") } },
    { label: "stale materialization", patch: { materializationDigest: digest("9") } },
    { label: "stale toolchain", patch: { tools: { ...toolsV1, vite: "8.1.5" } } },
  ])("rejects handoff $label", async ({ patch }) => {
    const buildInput = {
      materializationDigest: frozenSourceV1.materializationDigest,
      provenanceMode: "clean_commit",
      sourceCommit: frozenSourceV1.sourceCommit,
      sourceTree: frozenSourceV1.sourceTree,
      tools: frozenSourceV1.tools,
      ...patch,
    };
    const buildA = await createArtifactFixtureV1();
    const buildB = await createArtifactFixtureV1();
    const handoff = await createArtifactFixtureV1({ buildInput });

    await expect(
      assertReproducibleArtifactSetV1({ buildA, buildB, expected: frozenSourceV1, handoff }),
    ).rejects.toThrow(/release\.repro_handoff_provenance/u);
  });
});

describe("archive command contract", () => {
  it("freezes the only offline install argv and one resolved store", () => {
    const invocation = createArchiveInstallInvocationV1({
      cwd: "/tmp/archive-a",
      frozenStoreDir: "/pnpm/store",
      storeDir: "/pnpm/store",
    });

    expect(invocation).toMatchObject({
      args: ["install", "--offline", "--frozen-lockfile", "--store-dir", "/pnpm/store"],
      cwd: "/tmp/archive-a",
      executable: "pnpm",
      shell: false,
    });
    expect(Object.keys(invocation.env).join("\n")).not.toMatch(/registry|proxy/u);
    expect(invocation.env).toMatchObject({
      CI: "1",
      GIT_NO_LAZY_FETCH: "1",
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
      PNPM_CONFIG_OFFLINE: "true",
      npm_config_offline: "true",
    });
  });

  it.each([
    { frozenStoreDir: "/pnpm/store", storeDir: "/pnpm/other" },
    { frozenStoreDir: "/pnpm/store", storeDir: "relative/store" },
    {
      frozenStoreDir: "/pnpm/store",
      storeDir: "/pnpm/store",
      registry: "https://registry.example.invalid",
    },
  ])("rejects a store or registry-facing override %#", (input) => {
    expect(() =>
      createArchiveInstallInvocationV1({ cwd: "/tmp/archive-a", ...input } as never),
    ).toThrow(/release\.invalid_repro_command/u);
  });

  it("uses one structured child mode without provenance arguments or a shell string", () => {
    expect(createVerifiedArchiveChildInvocationV1({ cwd: "/tmp/archive-a" })).toMatchObject({
      args: [
        "--experimental-strip-types",
        "scripts/release/build-reproducibly.mts",
        "--internal-build-verified-archive",
      ],
      cwd: "/tmp/archive-a",
      executable: process.execPath,
      shell: false,
    });
  });

  it("keeps public reproducibility argument-free and closes every provenance override", () => {
    expect(parseReproducibleBuildArgumentsV1([])).toEqual({ mode: "outer" });
    expect(parseReproducibleBuildArgumentsV1(["--internal-build-verified-archive"])).toEqual({
      mode: "verified_archive_child",
    });
    for (const args of [
      ["--source-commit", objectId("3")],
      ["--source-tree", objectId("4")],
      ["--materialization-digest", digest("2")],
      ["--verified-archive-input", "/tmp/input.json"],
    ]) {
      expect(() => parseReproducibleBuildArgumentsV1(args)).toThrow(
        /release\.invalid_repro_arguments/u,
      );
    }
  });
});

describe("runNodeCommandV1", () => {
  function createFakeChildV1() {
    const stdin = Object.assign(new EventEmitter(), { end: vi.fn() });
    const child = Object.assign(new EventEmitter(), {
      kill: vi.fn(() => true),
      stderr: new EventEmitter(),
      stdin,
      stdout: new EventEmitter(),
    });
    return child;
  }

  it.each(["child error", "output limit"] as const)(
    "kills on %s but rejects only after close",
    async (failureKind) => {
      const child = createFakeChildV1();
      const command = createArchiveInstallInvocationV1({
        cwd: "/tmp/archive-a",
        frozenStoreDir: "/pnpm/store",
        storeDir: "/pnpm/store",
      });
      const childFailure = new Error("spawn failed");
      const commandPromise = runNodeCommandV1(command, {
        outputLimitBytes: 8,
        spawn: vi.fn(() => child) as never,
      });
      let outcome: "pending" | "rejected" | "resolved" = "pending";
      void commandPromise.then(
        () => {
          outcome = "resolved";
        },
        () => {
          outcome = "rejected";
        },
      );

      if (failureKind === "child error") child.emit("error", childFailure);
      else child.stdout.emit("data", Buffer.from("123456789"));
      await Promise.resolve();

      expect(child.kill).toHaveBeenCalledWith("SIGKILL");
      expect(outcome).toBe("pending");
      child.emit("close", null, "SIGKILL");
      if (failureKind === "child error") await expect(commandPromise).rejects.toBe(childFailure);
      else await expect(commandPromise).rejects.toThrow(/release\.repro_command_output_too_large/u);
      expect(outcome).toBe("rejected");
    },
  );
});

describe("archive byte and extraction authority", () => {
  it("accepts the exact local git-archive format including its embedded commit header", async () => {
    const root = await mkdtemp(join(tmpdir(), "project-tavern-repro-tar-"));
    temporaryRootsV1.push(root);
    const archive = join(root, "source.tar");
    await execFileAsyncV1("git", ["archive", "--format=tar", `--output=${archive}`, "HEAD"], {
      cwd: repositoryRootV1,
    });

    const archiveBytes = await readFile(archive);
    expect(() => validateTarArchiveV1(archiveBytes)).not.toThrow();
  });

  it("rejects altered extracted payload bytes even if a tar commit header could remain valid", async () => {
    const root = await mkdtemp(join(tmpdir(), "project-tavern-repro-tree-"));
    temporaryRootsV1.push(root);
    const path = join(root, "source.txt");
    const original = new TextEncoder().encode("frozen source\n");
    await writeFile(path, original, { mode: 0o644 });
    const blobObjectId = createHash("sha1")
      .update(`blob ${String(original.byteLength)}\0`)
      .update(original)
      .digest("hex");
    const entries = [{ mode: "100644", objectId: blobObjectId, path: "source.txt" }] as const;

    await expect(verifyTrackedTreeEntriesV1(root, entries)).resolves.toBeUndefined();
    await writeFile(path, "altered source\n");
    await expect(verifyTrackedTreeEntriesV1(root, entries)).rejects.toThrow(
      /release\.repro_tree_mismatch/u,
    );
  });

  it("requires both Git metadata and the ignored host attestation to remain outside extraction", async () => {
    const root = await mkdtemp(join(tmpdir(), "project-tavern-repro-boundary-"));
    temporaryRootsV1.push(root);
    await expect(assertForbiddenArchiveAuthorityAbsentV1(root)).resolves.toBeUndefined();

    await mkdir(join(root, ".git"));
    await expect(assertForbiddenArchiveAuthorityAbsentV1(root)).rejects.toThrow(
      /release\.repro_archive_invalid/u,
    );
    await rm(join(root, ".git"), { recursive: true });
    await mkdir(join(root, ".project-tavern"));
    await writeFile(join(root, ".project-tavern/goal-materialization.json"), "{}\n");
    await expect(assertForbiddenArchiveAuthorityAbsentV1(root)).rejects.toThrow(
      /release\.repro_archive_invalid/u,
    );
  });
});

describe("buildReproduciblyV1 sibling settlement", () => {
  function commandResultV1(stdout = "", exitCode = 0): ReproducibleCommandResultV1 {
    return {
      exitCode,
      stderr: new Uint8Array(),
      stdout: new TextEncoder().encode(stdout),
    };
  }

  async function createOrchestrationFixtureV1() {
    const temporaryRepositoryRoot = await mkdtemp(
      join(tmpdir(), "project-tavern-repro-orchestration-"),
    );
    temporaryRootsV1.push(temporaryRepositoryRoot);
    const repositoryRoot = await realpath(temporaryRepositoryRoot);
    const store = join(repositoryRoot, "store");
    const temporaryRoot = join(repositoryRoot, "temporary");
    await Promise.all([mkdir(store), writeArtifactFixtureV1(join(repositoryRoot, "dist/poc"))]);
    const events: string[] = [];
    const runCommand = vi.fn(async (command: { executable: string; args: readonly string[] }) => {
      const key = [command.executable, ...command.args].join("\0");
      if (key === "pnpm\0verify:materialization") return commandResultV1();
      if (key === "git\0symbolic-ref\0--quiet\0--short\0HEAD") {
        return commandResultV1("main\n");
      }
      if (key === "git\0rev-parse\0HEAD") return commandResultV1(`${objectId("3")}\n`);
      if (key === "git\0rev-parse\0HEAD^{tree}") return commandResultV1(`${objectId("4")}\n`);
      if (key === "git\0status\0--porcelain=v1\0-z\0--untracked-files=all") {
        return commandResultV1();
      }
      if (key === `git\0merge-base\0--is-ancestor\0${objectId("1")}\0${objectId("3")}`) {
        return commandResultV1();
      }
      if (key === "pnpm\0store\0path\0--silent") return commandResultV1(`${store}\n`);
      if (
        key ===
        `git\0ls-tree\0-r\0-z\0--format=%(objectmode)%x09%(objectname)%x09%(path)\0${objectId("3")}`
      ) {
        return commandResultV1(`100644\t${objectId("5")}\tpackage.json\0`);
      }
      throw new TypeError(`unexpected orchestration command: ${key}`);
    });
    const ports: ReproducibleBuildPortsV1 = {
      createTemporaryDirectory: async () => {
        await mkdir(temporaryRoot);
        return temporaryRoot;
      },
      readSourceAuthority: async () => ({
        ...frozenSourceV1,
        branch: "main",
        materializationBaseCommit: objectId("1"),
        packageClosureDigest: digest("8"),
      }),
      removeTemporaryDirectory: async (path) => {
        events.push("cleanup");
        await rm(path, { force: true, recursive: true });
      },
      repositoryRoot,
      runCommand,
      verifyArtifact: async () => undefined,
    };
    const prepared = (index: "a" | "b"): PreparedArchiveV1 => ({
      archiveDigest: digest(index),
      archivePath: join(temporaryRoot, `source-${index}.tar`),
      sourceRoot: join(temporaryRoot, `source-${index}`),
    });
    return { events, ports, prepared };
  }

  it("waits for the delayed archive-prep sibling before cleanup after failure", async () => {
    const { events, ports, prepared } = await createOrchestrationFixtureV1();
    const sibling = Promise.withResolvers<PreparedArchiveV1>();
    const failure = new Error("archive A failed");
    const prepareArchive = vi.fn(async ({ index }: { readonly index: "a" | "b" }) => {
      if (index === "a") throw failure;
      const result = await sibling.promise;
      events.push("archive-b-complete");
      return result;
    });
    const stages: ReproducibleBuildStagePortsV1 = {
      installAndBuildArchive: vi.fn(async () => {
        throw new Error("install must not start");
      }),
      prepareArchive,
    };

    const observed = buildReproduciblyV1(ports, stages).then(
      () => undefined,
      (error: unknown) => error,
    );
    await Promise.race([
      vi.waitFor(() => expect(prepareArchive).toHaveBeenCalledTimes(2)),
      observed.then((error) => Promise.reject(error)),
    ]);
    expect(events).toEqual([]);
    sibling.resolve(prepared("b"));

    await expect(observed).resolves.toBe(failure);
    expect(events).toEqual(["archive-b-complete", "cleanup"]);
  });

  it("waits for the delayed install/build sibling before cleanup after failure", async () => {
    const { events, ports, prepared } = await createOrchestrationFixtureV1();
    const sibling = Promise.withResolvers<string>();
    const failure = new Error("build A failed");
    const installAndBuildArchive = vi.fn(
      async ({ archive }: { readonly archive: PreparedArchiveV1 }) => {
        if (archive.sourceRoot.endsWith("source-a")) throw failure;
        const result = await sibling.promise;
        events.push("build-b-complete");
        return result;
      },
    );
    const stages: ReproducibleBuildStagePortsV1 = {
      installAndBuildArchive,
      prepareArchive: vi.fn(async ({ index }) => prepared(index)),
    };

    const observed = buildReproduciblyV1(ports, stages).then(
      () => undefined,
      (error: unknown) => error,
    );
    await Promise.race([
      vi.waitFor(() => expect(installAndBuildArchive).toHaveBeenCalledTimes(2)),
      observed.then((error) => Promise.reject(error)),
    ]);
    expect(events).toEqual([]);
    sibling.resolve("/unused/build-b");

    await expect(observed).resolves.toBe(failure);
    expect(events).toEqual(["build-b-complete", "cleanup"]);
  });
});

describe("inspectReproducibleSourceV1", () => {
  const authorityV1: ReproducibleSourceAuthorityV1 = Object.freeze({
    branch: "main",
    materializationBaseCommit: objectId("1"),
    materializationDigest: digest("2"),
    packageClosureDigest: digest("8"),
    tools: toolsV1,
  });

  function commandResultV1(stdout = "", exitCode = 0, stderr = ""): ReproducibleCommandResultV1 {
    return {
      exitCode,
      stderr: new TextEncoder().encode(stderr),
      stdout: new TextEncoder().encode(stdout),
    };
  }

  function createInspectionPortsV1(
    input: {
      readonly ancestorExitCode?: number;
      readonly attached?: boolean;
      readonly status?: string;
    } = {},
  ): ReproducibleSourceInspectionPortsV1 & {
    readonly runCommand: ReturnType<typeof vi.fn>;
  } {
    const runCommand = vi.fn(async (command: { executable: string; args: readonly string[] }) => {
      const key = [command.executable, ...command.args].join("\0");
      if (key === "pnpm\0verify:materialization") return commandResultV1();
      if (key === "git\0symbolic-ref\0--quiet\0--short\0HEAD") {
        return input.attached === false ? commandResultV1("", 1) : commandResultV1("main\n");
      }
      if (key === "git\0rev-parse\0HEAD") return commandResultV1(`${objectId("3")}\n`);
      if (key === "git\0rev-parse\0HEAD^{tree}") return commandResultV1(`${objectId("4")}\n`);
      if (key === "git\0status\0--porcelain=v1\0-z\0--untracked-files=all") {
        return commandResultV1(input.status ?? "");
      }
      if (
        key ===
        `git\0merge-base\0--is-ancestor\0${authorityV1.materializationBaseCommit}\0${objectId("3")}`
      ) {
        return commandResultV1("", input.ancestorExitCode ?? 0);
      }
      throw new TypeError(`unexpected command: ${key}`);
    });
    return {
      readSourceAuthority: vi.fn(async () => authorityV1),
      repositoryRoot: "/virtual/project-tavern",
      runCommand,
    };
  }

  it("freezes a clean attached descendant only after materialization verification", async () => {
    const ports = createInspectionPortsV1();

    await expect(inspectReproducibleSourceV1(ports)).resolves.toEqual({
      ...frozenSourceV1,
      branch: "main",
      materializationBaseCommit: authorityV1.materializationBaseCommit,
      packageClosureDigest: authorityV1.packageClosureDigest,
    });
    expect(ports.runCommand.mock.calls[0]?.[0]).toMatchObject({
      args: ["verify:materialization"],
      executable: "pnpm",
      shell: false,
    });
    expect(
      ports.runCommand.mock.calls.filter(
        ([command]) =>
          command.executable === "pnpm" && command.args[0] === "verify:materialization",
      ),
    ).toHaveLength(1);
  });

  it.each([
    { input: { status: " M package.json\0" }, code: "release.repro_dirty_source" },
    { input: { attached: false }, code: "release.repro_detached_head" },
    { input: { ancestorExitCode: 1 }, code: "release.repro_source_not_descendant" },
  ])("rejects invalid source authority: $code", async ({ code, input }) => {
    await expect(inspectReproducibleSourceV1(createInspectionPortsV1(input))).rejects.toThrow(code);
  });

  it("propagates stale materialization authority and never freezes source", async () => {
    const ports = createInspectionPortsV1();
    const stalePorts = {
      ...ports,
      readSourceAuthority: vi.fn(async () => {
        throw new TypeError("release.repro_materialization_stale: digest mismatch");
      }),
    };

    await expect(inspectReproducibleSourceV1(stalePorts)).rejects.toThrow(
      /release\.repro_materialization_stale/u,
    );
  });
});
