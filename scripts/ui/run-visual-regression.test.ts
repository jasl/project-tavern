// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile, readdir, symlink, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import {
  compareLocalVisualEnvironmentV1,
  createVisualPlaywrightInvocationV1,
  decodeLocalVisualEnvironmentV1,
  encodeLocalVisualEnvironmentV1,
  localVisualEnvironmentFieldPathsV1,
  parseVisualRegressionModeV1,
  probeLocalVisualEnvironmentV1,
  runVisualRegressionV1,
  visualBaselineNamesV1,
  type LocalVisualEnvironmentV1,
  type VisualEnvironmentProbeAdapterV1,
  type VisualRegressionRunnerAdapterV1,
} from "./run-visual-regression.mjs";

const cleanupTasksV1: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const cleanup of cleanupTasksV1.splice(0).toReversed()) await cleanup();
});

const environmentV1: LocalVisualEnvironmentV1 = Object.freeze({
  revision: 1,
  os: "darwin",
  arch: "arm64",
  playwrightVersion: "1.61.1",
  chromiumRevision: "1228",
  chromiumVersion: "149.0.7827.55",
  fontPackage: "@fontsource/noto-sans-sc",
  fontVersion: "5.2.9",
  deviceScaleFactor: 1,
  viewport: Object.freeze({ width: 1600, height: 1000 }),
  reducedMotion: "reduce",
});

async function createRepositoryFixtureV1(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "tavern-visual-runner-"));
  cleanupTasksV1.push(async () => rm(root, { force: true, recursive: true }));
  await mkdir(join(root, "engine/packages/web/e2e/__screenshots__/chromium"), {
    recursive: true,
  });
  return root;
}

function pngCrc32V1(bytes: Uint8Array): number {
  let crc = 0xffff_ffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb8_8320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffff_ffff) >>> 0;
}

function pngChunkV1(type: string, data: Uint8Array): Buffer {
  const chunk = Buffer.alloc(12 + data.byteLength);
  chunk.writeUInt32BE(data.byteLength, 0);
  chunk.write(type, 4, "ascii");
  chunk.set(data, 8);
  chunk.writeUInt32BE(pngCrc32V1(chunk.subarray(4, 8 + data.byteLength)), 8 + data.byteLength);
  return chunk;
}

function pngV1(width = 1600, height = 1000, marker?: number): Uint8Array {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const chunks = [pngChunkV1("IHDR", header)];
  if (marker !== undefined) chunks.push(pngChunkV1("tEXt", Buffer.from(`marker=${marker}`)));
  chunks.push(
    pngChunkV1("IDAT", Buffer.from([0x78, 0x9c, 0x03, 0x00, 0x00, 0x00, 0x00, 0x01])),
    pngChunkV1("IEND", new Uint8Array()),
  );
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ...chunks]);
}

async function writeTrackedBaselinesV1(
  root: string,
  environment: LocalVisualEnvironmentV1 = environmentV1,
): Promise<void> {
  const baselineRoot = resolve(root, "engine/packages/web/e2e/__screenshots__/chromium");
  await Promise.all([
    writeFile(
      join(baselineRoot, "environment.v1.json"),
      encodeLocalVisualEnvironmentV1(environment),
    ),
    ...visualBaselineNamesV1.map((name) => writeFile(join(baselineRoot, name), pngV1())),
  ]);
}

function successfulRunnerAdapterV1(
  overrides: Partial<VisualRegressionRunnerAdapterV1> = {},
): VisualRegressionRunnerAdapterV1 {
  return {
    createRunId: () => "run-1",
    probeEnvironment: async () => ({
      environment: environmentV1,
      materializationDigest: `sha256:${"a".repeat(64)}`,
    }),
    runPlaywright: async () => ({ exitCode: 0, stderr: "", stdout: "" }),
    ...overrides,
  };
}

function canonicalAttestationV1(): Uint8Array {
  const attestation = {
    arch: "arm64",
    branch: "main",
    browsers: {
      chromium: { executableAvailable: true, revision: "1228" },
      webkit: { executableAvailable: true, revision: "2311" },
    },
    contractId: "project-tavern-goal-materialization-v1",
    fixedPorts: [
      { host: "127.0.0.1", port: 4173 },
      { host: "127.0.0.1", port: 41731 },
      { host: "127.0.0.1", port: 41732 },
    ],
    materializationBaseCommit: "4e9c2bd5b06f3cc6f338d30ff43bc6e0188f74d2",
    materializationDigest: `sha256:${"a".repeat(64)}`,
    packageClosureDigest: `sha256:${"b".repeat(64)}`,
    platform: "darwin",
    schemaRevision: 1,
    status: "complete",
  };
  return new TextEncoder().encode(`${JSON.stringify(attestation, null, 2)}\n`);
}

function probeAdapterV1(calls: string[]): VisualEnvironmentProbeAdapterV1 {
  return {
    arch: "arm64",
    inspectChromium: async () => {
      calls.push("chromium");
      return { executablePath: "/materialized/chromium", revision: "1228" };
    },
    launchChromiumVersion: async () => {
      calls.push("launch");
      return "149.0.7827.55";
    },
    pathIsRegularFile: async () => {
      calls.push("executable");
      return true;
    },
    platform: "darwin",
    probeFontCss: async (path) => {
      calls.push(path.endsWith("400.css") ? "font-400" : "font-700");
      return [path.replace(".css", "-latin.woff2"), path.replace(".css", "-chinese.woff2")];
    },
    readFile: async (path) => {
      if (path.endsWith("goal-materialization.json")) {
        calls.push("attestation");
        return canonicalAttestationV1();
      }
      if (path.endsWith("node_modules/@playwright/test/package.json")) {
        calls.push("installed-playwright");
        return new TextEncoder().encode(JSON.stringify({ version: "1.61.1" }));
      }
      if (path.endsWith("node_modules/@fontsource/noto-sans-sc/package.json")) {
        calls.push("installed-font");
        return new TextEncoder().encode(JSON.stringify({ version: "5.2.9" }));
      }
      if (path.endsWith("engine/packages/ui/package.json")) {
        calls.push("ui-package");
        return new TextEncoder().encode(
          JSON.stringify({ dependencies: { "@fontsource/noto-sans-sc": "5.2.9" } }),
        );
      }
      if (path.endsWith("package.json")) {
        calls.push("root-package");
        return new TextEncoder().encode(
          JSON.stringify({ devDependencies: { "@playwright/test": "1.61.1" } }),
        );
      }
      throw new Error(`unexpected read ${path}`);
    },
    readMaterializationContract: async () => {
      calls.push("contract");
      return {
        contract: {
          externalPackages: [
            {
              packageKey: "@fontsource/noto-sans-sc@5.2.9",
              packageRecord: {},
              snapshotRecords: [
                { snapshotKey: "@fontsource/noto-sans-sc@5.2.9", snapshotRecord: {} },
              ],
            },
            {
              packageKey: "@playwright/test@1.61.1",
              packageRecord: {},
              snapshotRecords: [{ snapshotKey: "@playwright/test@1.61.1", snapshotRecord: {} }],
            },
          ],
          playwright: {
            browsers: { chromium: { revision: "1228" }, webkit: { revision: "2311" } },
            version: "1.61.1",
          },
          pnpm: { version: "11.11.0" },
          schemaRevision: 1,
        },
        materializationDigest: `sha256:${"a".repeat(64)}`,
        packageClosureDigest: `sha256:${"b".repeat(64)}`,
      };
    },
  };
}

describe("host-local visual environment contract", () => {
  it("compares every fingerprint field in declaration order", () => {
    expect(localVisualEnvironmentFieldPathsV1).toEqual([
      "revision",
      "os",
      "arch",
      "playwrightVersion",
      "chromiumRevision",
      "chromiumVersion",
      "fontPackage",
      "fontVersion",
      "deviceScaleFactor",
      "viewport.width",
      "viewport.height",
      "reducedMotion",
    ]);
    expect(compareLocalVisualEnvironmentV1(environmentV1, environmentV1)).toEqual({
      kind: "compatible",
    });
    expect(
      compareLocalVisualEnvironmentV1(environmentV1, {
        ...environmentV1,
        chromiumVersion: "150.0.0.0",
      }),
    ).toEqual({
      kind: "incompatible",
      code: "visual_environment_mismatch",
      fields: ["chromiumVersion"],
    });

    const entirelyDifferent = {
      revision: 1,
      os: "linux",
      arch: "x64",
      playwrightVersion: "1.61.2",
      chromiumRevision: "1229",
      chromiumVersion: "150.0.0.0",
      fontPackage: "@fontsource/other",
      fontVersion: "6.0.0",
      deviceScaleFactor: 2,
      viewport: { width: 800, height: 500 },
      reducedMotion: "no-preference",
    } as unknown as LocalVisualEnvironmentV1;
    expect(compareLocalVisualEnvironmentV1(environmentV1, entirelyDifferent)).toMatchObject({
      fields: localVisualEnvironmentFieldPathsV1.filter((field) => field !== "revision"),
    });
  });

  it("strict-decodes only the exact canonical V1 record", () => {
    const bytes = encodeLocalVisualEnvironmentV1(environmentV1);
    expect(decodeLocalVisualEnvironmentV1(bytes)).toEqual(environmentV1);
    expect(() =>
      decodeLocalVisualEnvironmentV1(
        new TextEncoder().encode(JSON.stringify({ ...environmentV1, unknown: true })),
      ),
    ).toThrow(/visual_environment_invalid/u);
    const { arch: _arch, ...missing } = environmentV1;
    expect(() =>
      decodeLocalVisualEnvironmentV1(new TextEncoder().encode(JSON.stringify(missing))),
    ).toThrow(/visual_environment_invalid/u);
    expect(() =>
      decodeLocalVisualEnvironmentV1(
        new TextEncoder().encode(`${JSON.stringify(environmentV1, null, 2)}\n`),
      ),
    ).toThrow(/visual_environment_noncanonical/u);
  });

  it("freezes the only accepted CLI modes and structured Playwright arguments", () => {
    expect(parseVisualRegressionModeV1(["verify"])).toBe("verify");
    expect(parseVisualRegressionModeV1(["update"])).toBe("update");
    for (const invalid of [[], ["verify", "extra"], ["write"], ["--update-snapshots"]]) {
      expect(() => parseVisualRegressionModeV1(invalid)).toThrow(/usage/u);
    }
    expect(
      createVisualPlaywrightInvocationV1("verify", ".project-tavern/visual-runs/run-1"),
    ).toEqual({
      command: "pnpm",
      args: [
        "test:e2e:ui",
        "--project=chromium",
        "--grep",
        "@visual",
        "--output=.project-tavern/visual-runs/run-1",
      ],
    });
    expect(
      createVisualPlaywrightInvocationV1("update", ".project-tavern/visual-runs/run-1"),
    ).toEqual({
      command: "pnpm",
      args: [
        "test:e2e:ui",
        "--project=chromium",
        "--grep",
        "@visual",
        "--output=.project-tavern/visual-runs/run-1",
        "--update-snapshots",
      ],
    });
  });

  it("probes the accepted materialization, pinned packages, fonts, and Chromium in order", async () => {
    const calls: string[] = [];
    await expect(probeLocalVisualEnvironmentV1("/repo", probeAdapterV1(calls))).resolves.toEqual({
      environment: environmentV1,
      materializationDigest: `sha256:${"a".repeat(64)}`,
    });
    expect(calls).toEqual([
      "contract",
      "attestation",
      "root-package",
      "ui-package",
      "installed-playwright",
      "installed-font",
      "chromium",
      "executable",
      "font-400",
      "font-700",
      "launch",
    ]);
  });

  it("stops on stale attestation before package, font, or browser probes", async () => {
    const calls: string[] = [];
    const adapter = probeAdapterV1(calls);
    const originalRead = adapter.readFile;
    const stale: VisualEnvironmentProbeAdapterV1 = {
      ...adapter,
      readFile: async (path) => {
        if (!path.endsWith("goal-materialization.json")) return originalRead(path);
        calls.push("attestation");
        const value = JSON.parse(new TextDecoder().decode(canonicalAttestationV1())) as Record<
          string,
          unknown
        >;
        value.materializationDigest = `sha256:${"c".repeat(64)}`;
        return new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`);
      },
    };
    await expect(probeLocalVisualEnvironmentV1("/repo", stale)).rejects.toMatchObject({
      code: "external_precondition.materialization_stale",
    });
    expect(calls).toEqual(["contract", "attestation"]);
  });

  it.each([
    [
      "Playwright",
      "node_modules/@playwright/test/package.json",
      "2.0.0",
      "external_precondition.materialization_stale",
    ],
    [
      "font",
      "node_modules/@fontsource/noto-sans-sc/package.json",
      "6.0.0",
      "external_precondition.visual_font_missing",
    ],
  ] as const)(
    "rejects installed %s drift before the browser probe",
    async (_label, suffix, version, code) => {
      const calls: string[] = [];
      const adapter = probeAdapterV1(calls);
      const originalRead = adapter.readFile;
      await expect(
        probeLocalVisualEnvironmentV1("/repo", {
          ...adapter,
          readFile: async (path) =>
            path.endsWith(suffix)
              ? new TextEncoder().encode(JSON.stringify({ version }))
              : originalRead(path),
        }),
      ).rejects.toMatchObject({ code });
      expect(calls).not.toContain("chromium");
    },
  );
});

describe.sequential("host-local visual runner", () => {
  it.each(["verify", "update"] as const)(
    "rejects a visual-runs symlink escape before launching %s",
    async (mode) => {
      const root = await createRepositoryFixtureV1();
      await writeTrackedBaselinesV1(root);
      const outside = await mkdtemp(join(tmpdir(), "tavern-visual-runs-escape-"));
      cleanupTasksV1.push(async () => rm(outside, { force: true, recursive: true }));
      await mkdir(resolve(root, ".project-tavern"));
      await symlink(outside, resolve(root, ".project-tavern/visual-runs"));
      let launches = 0;

      await expect(
        runVisualRegressionV1(
          root,
          mode,
          successfulRunnerAdapterV1({
            createRunId: () => `run-${mode}-symlink-escape`,
            runPlaywright: async () => {
              launches += 1;
              return { exitCode: 0, stderr: "", stdout: "" };
            },
          }),
        ),
      ).rejects.toMatchObject({ code: "visual_runner_invalid" });
      expect(launches).toBe(0);
      expect(await readdir(outside)).toEqual([]);
    },
  );

  it("rejects a visual-diagnostics symlink escape before writing an environment mismatch", async () => {
    const root = await createRepositoryFixtureV1();
    await writeTrackedBaselinesV1(root, { ...environmentV1, chromiumVersion: "148.0.0.0" });
    const outside = await mkdtemp(join(tmpdir(), "tavern-visual-diagnostics-escape-"));
    cleanupTasksV1.push(async () => rm(outside, { force: true, recursive: true }));
    await mkdir(resolve(root, ".project-tavern"));
    await symlink(outside, resolve(root, ".project-tavern/visual-diagnostics"));
    let launches = 0;

    await expect(
      runVisualRegressionV1(
        root,
        "verify",
        successfulRunnerAdapterV1({
          createRunId: () => "run-diagnostics-symlink-escape",
          runPlaywright: async () => {
            launches += 1;
            return { exitCode: 0, stderr: "", stdout: "" };
          },
        }),
      ),
    ).rejects.toMatchObject({ code: "visual_runner_invalid" });
    expect(launches).toBe(0);
    expect(await readdir(outside)).toEqual([]);
  });

  it("records an environment mismatch and launches no browser suite", async () => {
    const root = await createRepositoryFixtureV1();
    await writeTrackedBaselinesV1(root, { ...environmentV1, chromiumVersion: "148.0.0.0" });
    let launches = 0;
    await expect(
      runVisualRegressionV1(
        root,
        "verify",
        successfulRunnerAdapterV1({
          runPlaywright: async () => {
            launches += 1;
            return { exitCode: 0, stderr: "", stdout: "" };
          },
        }),
      ),
    ).rejects.toMatchObject({ code: "visual_environment_mismatch" });
    expect(launches).toBe(0);
    const diagnosticPath = resolve(
      root,
      ".project-tavern/visual-diagnostics/run-1/environment-mismatch.v1.json",
    );
    const diagnostic = JSON.parse(await readFile(diagnosticPath, "utf8")) as Record<
      string,
      unknown
    >;
    expect(diagnostic).toMatchObject({
      code: "visual_environment_mismatch",
      current: { environment: environmentV1 },
      revision: 1,
    });
    expect(JSON.stringify(diagnostic)).toBe(await readFile(diagnosticPath, "utf8"));
    expect(JSON.stringify(diagnostic)).toContain("sha256:");
  });

  it("verifies read-only with the focused Playwright command and never reaches materialization", async () => {
    const root = await createRepositoryFixtureV1();
    await writeTrackedBaselinesV1(root);
    const before = await Promise.all([
      readFile(
        resolve(root, "engine/packages/web/e2e/__screenshots__/chromium/environment.v1.json"),
      ),
      ...visualBaselineNamesV1.map((name) =>
        readFile(resolve(root, "engine/packages/web/e2e/__screenshots__/chromium", name)),
      ),
    ]);
    const calls: Parameters<VisualRegressionRunnerAdapterV1["runPlaywright"]>[0][] = [];
    const result = await runVisualRegressionV1(
      root,
      "verify",
      successfulRunnerAdapterV1({
        runPlaywright: async (input) => {
          calls.push(input);
          return { exitCode: 0, stderr: "", stdout: "" };
        },
      }),
    );
    expect(result).toMatchObject({ exitCode: 0, mode: "verify" });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      command: "pnpm",
      args: [
        "test:e2e:ui",
        "--project=chromium",
        "--grep",
        "@visual",
        "--output=.project-tavern/visual-runs/run-1",
      ],
    });
    expect(calls[0]?.args.join(" ")).not.toContain("verify:materialization");
    expect(calls[0]?.environment.PROJECT_TAVERN_VISUAL_SNAPSHOT_ROOT).toBeUndefined();
    expect(calls[0]?.environment).toMatchObject({
      CI: "1",
      PNPM_CONFIG_OFFLINE: "true",
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
      npm_config_offline: "true",
    });
    const after = await Promise.all([
      readFile(
        resolve(root, "engine/packages/web/e2e/__screenshots__/chromium/environment.v1.json"),
      ),
      ...visualBaselineNamesV1.map((name) =>
        readFile(resolve(root, "engine/packages/web/e2e/__screenshots__/chromium", name)),
      ),
    ]);
    expect(after).toEqual(before);
  });

  it("rejects a verifier child that changes any tracked baseline byte", async () => {
    const root = await createRepositoryFixtureV1();
    await writeTrackedBaselinesV1(root);
    const changedPath = resolve(
      root,
      "engine/packages/web/e2e/__screenshots__/chromium/poc-stage-standard.png",
    );
    await expect(
      runVisualRegressionV1(
        root,
        "verify",
        successfulRunnerAdapterV1({
          createRunId: () => "run-tracked-write",
          runPlaywright: async () => {
            await writeFile(changedPath, pngV1(1600, 1000, 1));
            return { exitCode: 0, stderr: "", stdout: "" };
          },
        }),
      ),
    ).rejects.toMatchObject({ code: "visual_runner_invalid" });
  });

  it("validates every update candidate before atomically replacing the complete set", async () => {
    const root = await createRepositoryFixtureV1();
    await writeTrackedBaselinesV1(root, { ...environmentV1, chromiumVersion: "old" });
    const result = await runVisualRegressionV1(
      root,
      "update",
      successfulRunnerAdapterV1({
        runPlaywright: async (input) => {
          const candidate = input.environment.PROJECT_TAVERN_VISUAL_SNAPSHOT_ROOT;
          if (candidate === undefined) throw new TypeError("missing candidate root");
          const chromiumCandidate = join(candidate, "chromium");
          await mkdir(chromiumCandidate, { recursive: true });
          await Promise.all(
            visualBaselineNamesV1.map((name, index) =>
              writeFile(join(chromiumCandidate, name), pngV1(1600, 1000, index)),
            ),
          );
          return { exitCode: 0, stderr: "", stdout: "" };
        },
      }),
    );
    expect(result).toMatchObject({ exitCode: 0, mode: "update" });
    const baselineRoot = resolve(root, "engine/packages/web/e2e/__screenshots__/chromium");
    expect(
      decodeLocalVisualEnvironmentV1(await readFile(join(baselineRoot, "environment.v1.json"))),
    ).toEqual(environmentV1);
    for (const [index, name] of visualBaselineNamesV1.entries()) {
      expect(await readFile(join(baselineRoot, name))).toEqual(pngV1(1600, 1000, index));
    }
    expect((await readdir(baselineRoot)).toSorted()).toEqual(
      ["environment.v1.json", ...visualBaselineNamesV1].toSorted(),
    );
  });

  it("rolls back prior backups when a later atomic replacement step fails", async () => {
    const root = await createRepositoryFixtureV1();
    await writeTrackedBaselinesV1(root);
    const baselineRoot = resolve(root, "engine/packages/web/e2e/__screenshots__/chromium");
    const before = await Promise.all([
      readFile(join(baselineRoot, "environment.v1.json")),
      ...visualBaselineNamesV1.map((name) => readFile(join(baselineRoot, name))),
    ]);
    await mkdir(join(baselineRoot, ".poc-devdock-overlay.png.backup-run-atomic-failure"));

    await expect(
      runVisualRegressionV1(
        root,
        "update",
        successfulRunnerAdapterV1({
          createRunId: () => "run-atomic-failure",
          runPlaywright: async (input) => {
            const candidate = input.environment.PROJECT_TAVERN_VISUAL_SNAPSHOT_ROOT;
            if (candidate === undefined) throw new TypeError("missing candidate root");
            const chromiumCandidate = join(candidate, "chromium");
            await mkdir(chromiumCandidate, { recursive: true });
            await Promise.all(
              visualBaselineNamesV1.map((name) =>
                writeFile(join(chromiumCandidate, name), pngV1(1600, 1000, 7)),
              ),
            );
            return { exitCode: 0, stderr: "", stdout: "" };
          },
        }),
      ),
    ).rejects.toThrow();

    const after = await Promise.all([
      readFile(join(baselineRoot, "environment.v1.json")),
      ...visualBaselineNamesV1.map((name) => readFile(join(baselineRoot, name))),
    ]);
    expect(after).toEqual(before);
    expect((await readdir(baselineRoot)).filter((name) => name.includes(".candidate-"))).toEqual(
      [],
    );
    await expect(
      readFile(join(baselineRoot, ".poc-stage-standard.png.backup-run-atomic-failure")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("leaves the accepted set untouched when any candidate is missing, extra, empty, truncated, or malformed", async () => {
    for (const defect of ["missing", "extra", "empty", "truncated", "dimensions"] as const) {
      const root = await createRepositoryFixtureV1();
      await writeTrackedBaselinesV1(root);
      const baselineRoot = resolve(root, "engine/packages/web/e2e/__screenshots__/chromium");
      const before = await Promise.all([
        readFile(join(baselineRoot, "environment.v1.json")),
        ...visualBaselineNamesV1.map((name) => readFile(join(baselineRoot, name))),
      ]);
      await expect(
        runVisualRegressionV1(
          root,
          "update",
          successfulRunnerAdapterV1({
            createRunId: () => `run-${defect}`,
            runPlaywright: async (input) => {
              const candidate = input.environment.PROJECT_TAVERN_VISUAL_SNAPSHOT_ROOT;
              if (candidate === undefined) throw new TypeError("missing candidate root");
              const chromiumCandidate = join(candidate, "chromium");
              await mkdir(chromiumCandidate, { recursive: true });
              const names =
                defect === "missing" ? visualBaselineNamesV1.slice(1) : visualBaselineNamesV1;
              await Promise.all(
                names.map((name) =>
                  writeFile(
                    join(chromiumCandidate, name),
                    name === visualBaselineNamesV1[0]
                      ? defect === "dimensions"
                        ? pngV1(800, 500)
                        : defect === "empty"
                          ? new Uint8Array()
                          : defect === "truncated"
                            ? pngV1().slice(0, 33)
                            : pngV1()
                      : pngV1(),
                  ),
                ),
              );
              if (defect === "extra") {
                await writeFile(join(chromiumCandidate, "fourth.png"), pngV1());
              }
              return { exitCode: 0, stderr: "", stdout: "" };
            },
          }),
        ),
      ).rejects.toThrow(/visual_(?:candidate|png)_invalid/u);
      const after = await Promise.all([
        readFile(join(baselineRoot, "environment.v1.json")),
        ...visualBaselineNamesV1.map((name) => readFile(join(baselineRoot, name))),
      ]);
      expect(after).toEqual(before);
    }
  });

  it("rejects a candidate changed during hashing before touching tracked bytes", async () => {
    const root = await createRepositoryFixtureV1();
    await writeTrackedBaselinesV1(root);
    const baselineRoot = resolve(root, "engine/packages/web/e2e/__screenshots__/chromium");
    const before = await Promise.all([
      readFile(join(baselineRoot, "environment.v1.json")),
      ...visualBaselineNamesV1.map((name) => readFile(join(baselineRoot, name))),
    ]);
    let changed = false;
    await expect(
      runVisualRegressionV1(
        root,
        "update",
        successfulRunnerAdapterV1({
          afterCandidateRead: async (path) => {
            if (changed) return;
            changed = true;
            await writeFile(path, pngV1(1600, 1000, 9));
          },
          createRunId: () => "run-racing-candidate",
          runPlaywright: async (input) => {
            const candidate = input.environment.PROJECT_TAVERN_VISUAL_SNAPSHOT_ROOT;
            if (candidate === undefined) throw new TypeError("missing candidate root");
            const chromiumCandidate = join(candidate, "chromium");
            await mkdir(chromiumCandidate, { recursive: true });
            await Promise.all(
              visualBaselineNamesV1.map((name) =>
                writeFile(join(chromiumCandidate, name), pngV1()),
              ),
            );
            return { exitCode: 0, stderr: "", stdout: "" };
          },
        }),
      ),
    ).rejects.toThrow(/visual_candidate_invalid.*changed while hashing/u);
    expect(changed).toBe(true);
    const after = await Promise.all([
      readFile(join(baselineRoot, "environment.v1.json")),
      ...visualBaselineNamesV1.map((name) => readFile(join(baselineRoot, name))),
    ]);
    expect(after).toEqual(before);
  });

  it("preserves a complete declared screenshot mismatch triplet and canonical manifest", async () => {
    const root = await createRepositoryFixtureV1();
    await writeTrackedBaselinesV1(root);
    const result = await runVisualRegressionV1(
      root,
      "verify",
      successfulRunnerAdapterV1({
        runPlaywright: async (input) => {
          const outputRoot = resolve(root, input.args.at(-1)?.replace("--output=", "") ?? "");
          const resultRoot = join(outputRoot, "visual-case");
          await mkdir(resultRoot, { recursive: true });
          await Promise.all([
            writeFile(join(resultRoot, "poc-stage-standard-actual.png"), pngV1()),
            writeFile(join(resultRoot, "poc-stage-standard-diff.png"), pngV1()),
            writeFile(
              input.environment.PROJECT_TAVERN_VISUAL_REPORT_PATH ?? "",
              JSON.stringify({
                errors: [],
                suites: [
                  {
                    specs: [
                      {
                        title: "@visual PoC standard stage",
                        tests: [
                          {
                            expectedStatus: "passed",
                            projectName: "chromium",
                            results: [
                              {
                                error: { message: "expect(page).toHaveScreenshot failed" },
                                status: "failed",
                              },
                            ],
                            status: "unexpected",
                          },
                        ],
                      },
                    ],
                  },
                ],
              }),
            ),
          ]);
          return { exitCode: 1, stderr: "", stdout: "1 failed" };
        },
      }),
    );
    expect(result).toMatchObject({ exitCode: 1, mode: "verify" });
    const diagnosticsRoot = resolve(root, ".project-tavern/visual-diagnostics/run-1");
    const manifestPath = join(diagnosticsRoot, "screenshot-mismatches.v1.json");
    const manifestText = await readFile(manifestPath, "utf8");
    const manifest = JSON.parse(manifestText) as Record<string, unknown>;
    expect(JSON.stringify(manifest)).toBe(manifestText);
    expect(manifest).toMatchObject({
      environment: environmentV1,
      materializationDigest: `sha256:${"a".repeat(64)}`,
      mismatches: [{ name: "poc-stage-standard.png" }],
      revision: 1,
    });
    expect((await readdir(diagnosticsRoot)).toSorted()).toEqual([
      "poc-stage-standard-actual.png",
      "poc-stage-standard-diff.png",
      "poc-stage-standard-expected.png",
      "screenshot-mismatches.v1.json",
    ]);
  });

  it("rejects missing, partial, duplicate, or extra screenshot mismatch evidence", async () => {
    for (const defect of ["missing", "partial", "duplicate", "extra"] as const) {
      const root = await createRepositoryFixtureV1();
      await writeTrackedBaselinesV1(root);
      const baselineRoot = resolve(root, "engine/packages/web/e2e/__screenshots__/chromium");
      const before = await Promise.all([
        readFile(join(baselineRoot, "environment.v1.json")),
        ...visualBaselineNamesV1.map((name) => readFile(join(baselineRoot, name))),
      ]);

      await expect(
        runVisualRegressionV1(
          root,
          "verify",
          successfulRunnerAdapterV1({
            createRunId: () => `run-${defect}-mismatch-evidence`,
            runPlaywright: async (input) => {
              const outputRoot = resolve(root, input.args.at(-1)?.replace("--output=", "") ?? "");
              const resultRoot = join(outputRoot, "visual-case");
              await mkdir(resultRoot, { recursive: true });
              const actualPath = join(resultRoot, "poc-stage-standard-actual.png");
              const diffPath = join(resultRoot, "poc-stage-standard-diff.png");
              if (defect !== "missing") await writeFile(actualPath, pngV1());
              if (defect === "duplicate") {
                const duplicateRoot = join(outputRoot, "duplicate-case");
                await mkdir(duplicateRoot, { recursive: true });
                await writeFile(join(duplicateRoot, "poc-stage-standard-actual.png"), pngV1());
              }
              if (defect === "duplicate" || defect === "extra") {
                await writeFile(diffPath, pngV1());
              }
              if (defect === "extra") {
                await writeFile(join(resultRoot, "undeclared-actual.png"), pngV1());
              }
              await writeFile(
                input.environment.PROJECT_TAVERN_VISUAL_REPORT_PATH ?? "",
                JSON.stringify({
                  errors: [],
                  suites: [
                    {
                      specs: [
                        {
                          title: "@visual PoC standard stage",
                          tests: [
                            {
                              expectedStatus: "passed",
                              projectName: "chromium",
                              results: [
                                {
                                  error: { message: "expect(page).toHaveScreenshot failed" },
                                  status: "failed",
                                },
                              ],
                              status: "unexpected",
                            },
                          ],
                        },
                      ],
                    },
                  ],
                }),
              );
              return { exitCode: 1, stderr: "", stdout: "1 failed" };
            },
          }),
        ),
      ).rejects.toThrow(
        new RegExp(`visual_candidate_invalid.*${defect === "missing" ? "missing" : defect}`, "u"),
      );

      const after = await Promise.all([
        readFile(join(baselineRoot, "environment.v1.json")),
        ...visualBaselineNamesV1.map((name) => readFile(join(baselineRoot, name))),
      ]);
      expect(after).toEqual(before);
      await expect(
        readdir(resolve(root, ".project-tavern/visual-diagnostics")),
      ).rejects.toMatchObject({ code: "ENOENT" });
    }
  });
});

describe("visual source ownership", () => {
  it("leaves @visual only in the dedicated executable source and removes the legacy writer", async () => {
    const repositoryRoot = resolve(import.meta.dirname, "../..");
    const e2eRoot = resolve(repositoryRoot, "engine/packages/web/e2e");
    const entries = await readdir(e2eRoot, { recursive: true, withFileTypes: true });
    const visualSources: string[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !/\.(?:spec|test)\.[cm]?[jt]sx?$/u.test(entry.name)) continue;
      const path = resolve(entry.parentPath, entry.name);
      if ((await readFile(path, "utf8")).includes("@visual")) {
        visualSources.push(relative(e2eRoot, path));
      }
    }
    expect(visualSources.toSorted()).toEqual(["visual-regression.spec.ts"]);
    expect(await readFile(resolve(e2eRoot, "walking-skeleton.spec.ts"), "utf8")).not.toContain(
      "@visual",
    );
    const rootPackage = JSON.parse(
      await readFile(resolve(repositoryRoot, "package.json"), "utf8"),
    ) as { readonly scripts?: Readonly<Record<string, unknown>> };
    expect(rootPackage.scripts).not.toHaveProperty("update:screenshots");
    expect(rootPackage.scripts).toMatchObject({
      "update:ui-snapshots":
        "node --experimental-strip-types scripts/ui/run-visual-regression.mts update",
      "verify:ui-visual":
        "node --experimental-strip-types scripts/ui/run-visual-regression.mts verify",
    });
    await expect(readFile(resolve(e2eRoot, "__screenshots__/e2e-shell.png"))).rejects.toMatchObject(
      {
        code: "ENOENT",
      },
    );
    const runnerSource = await readFile(
      resolve(repositoryRoot, "scripts/ui/run-visual-regression.mts"),
      "utf8",
    );
    expect(runnerSource).not.toContain("verify:materialization");
    const configSource = await readFile(
      resolve(repositoryRoot, "engine/packages/web/playwright.ui.config.ts"),
      "utf8",
    );
    expect(configSource).toContain('"{testDir}/__screenshots__/{projectName}/{arg}{ext}"');
    expect(configSource).toContain('updateSnapshots: "none"');
    expect(configSource).toContain(
      'assertVisualRunOutputPathV1("PROJECT_TAVERN_VISUAL_SNAPSHOT_ROOT"',
    );
    expect(configSource).toContain(
      'assertVisualRunOutputPathV1("PROJECT_TAVERN_VISUAL_REPORT_PATH"',
    );
    expect(configSource.match(/grepInvert: \/@visual\/u/gu)).toHaveLength(2);
    const prettierIgnore = await readFile(resolve(repositoryRoot, ".prettierignore"), "utf8");
    expect(
      prettierIgnore
        .split(/\r?\n/u)
        .filter((line) => line.includes("engine/packages/web/e2e/__screenshots__")),
    ).toEqual(["engine/packages/web/e2e/__screenshots__/chromium/environment.v1.json"]);
  });
});
