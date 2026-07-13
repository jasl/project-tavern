// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { goalMaterializationAttestationPathV1, runMaterializeGoalV1 } from "./materialize-goal.mjs";
import {
  ExternalPreconditionError,
  fixedGoalPortsV1,
  goalMaterializationContractIdV1,
  phaseOneBaseCommitV1,
  type ExternalPreconditionCodeV1,
  type GoalMaterializationAdapterV1,
  type GoalMaterializationCommandV1,
} from "./verify-materialization.mjs";

const root = "/repo/project-tavern";
const disposableRoot = "/host/tmp/project-tavern-materialization";
const head = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const packageClosureDigest = `sha256:${"b".repeat(64)}` as const;
const materializationDigest = `sha256:${"c".repeat(64)}` as const;
const acceptedAttestation = new TextEncoder().encode("accepted attestation\n");

type MaterializerFailure =
  | "dirty"
  | "lateDirty"
  | "branch"
  | "phaseBase"
  | "identity"
  | "port"
  | "toolchain"
  | "onlineInstall"
  | "hostPackage"
  | "browserInstall"
  | "browserMissing"
  | "browserRevision"
  | "browserLaunch"
  | "font"
  | "disk"
  | "offlineInstall"
  | "offlineBuild"
  | "contract";

interface FakeState {
  readonly commands: GoalMaterializationCommandV1[];
  readonly boundPorts: Array<{ readonly host: string; readonly port: number }>;
  readonly launchedBrowsers: string[];
  readonly probedFonts: string[];
  readonly files: Map<string, Uint8Array>;
  readonly mutations: string[];
  corruptCandidate: boolean;
  interruptRename: boolean;
}

function commandResult(
  stdout = "",
  exitCode = 0,
): { readonly exitCode: number; readonly stdout: string; readonly stderr: string } {
  return { exitCode, stdout, stderr: exitCode === 0 ? "" : "injected failure" };
}

function commandKey(command: GoalMaterializationCommandV1): string {
  return `${command.executable}\0${command.args.join("\0")}`;
}

function createAdapter(failure?: MaterializerFailure): {
  readonly adapter: GoalMaterializationAdapterV1;
  readonly state: FakeState;
} {
  const state: FakeState = {
    commands: [],
    boundPorts: [],
    launchedBrowsers: [],
    probedFonts: [],
    files: new Map([[goalMaterializationAttestationPathV1(root), acceptedAttestation]]),
    mutations: [],
    corruptCandidate: false,
    interruptRename: false,
  };
  let pendingPath: string | undefined;
  let pendingBytes = new Uint8Array();
  let statusChecks = 0;

  const adapter: GoalMaterializationAdapterV1 = {
    nodeVersion: failure === "toolchain" ? "v26.5.1" : "v26.5.0",
    platform: "darwin",
    arch: "arm64",
    tempDirectory: "/host/tmp",
    run: async (command) => {
      state.commands.push(command);
      const key = commandKey(command);
      if (key === "git\0status\0--porcelain=v1\0--untracked-files=all") {
        statusChecks += 1;
        const dirty = failure === "dirty" || (failure === "lateDirty" && statusChecks > 1);
        if (failure === "lateDirty" && statusChecks > 1) {
          expect(state.mutations.some((mutation) => mutation.startsWith("sync:"))).toBe(true);
        }
        return commandResult(dirty ? " M package.json\n" : "");
      }
      if (key === "git\0symbolic-ref\0--quiet\0--short\0HEAD") {
        return failure === "branch" ? commandResult("", 1) : commandResult("main\n");
      }
      if (key === "git\0rev-parse\0HEAD") return commandResult(`${head}\n`);
      if (key === `git\0merge-base\0--is-ancestor\0${phaseOneBaseCommitV1}\0${head}`) {
        return commandResult("", failure === "phaseBase" ? 1 : 0);
      }
      if (key === "git\0config\0--get\0user.name") {
        return commandResult(failure === "identity" ? "" : "Test User\n");
      }
      if (key === "git\0config\0--get\0user.email") {
        return commandResult(failure === "identity" ? "" : "test@example.invalid\n");
      }
      if (key === "pnpm\0--version") return commandResult("11.11.0\n");
      if (key === "pnpm\0install\0--frozen-lockfile") {
        return commandResult("", failure === "onlineInstall" ? 1 : 0);
      }
      if (key === "pnpm\0exec\0playwright\0install\0chromium\0webkit") {
        return commandResult("", failure === "browserInstall" ? 1 : 0);
      }
      if (key === "pnpm\0install\0--offline\0--frozen-lockfile\0--frozen-store") {
        return commandResult("", failure === "offlineInstall" ? 1 : 0);
      }
      if (key === "pnpm\0build:player") {
        return commandResult("", failure === "offlineBuild" ? 1 : 0);
      }
      throw new Error(`unexpected command ${JSON.stringify(command)}`);
    },
    readMaterializationContract: async () => {
      if (failure === "contract") throw new Error("injected stale contract");
      return {
        contract: {
          schemaRevision: 1,
          pnpm: { version: "11.11.0" },
          playwright: {
            version: "1.61.1",
            browsers: {
              chromium: { revision: "1228" },
              webkit: { revision: "2311" },
            },
          },
          externalPackages: [
            {
              packageKey: "example@1.0.0",
              packageRecord: { resolution: { integrity: "sha512-example" } },
              snapshotRecords: [{ snapshotKey: "example@1.0.0", snapshotRecord: {} }],
            },
          ],
        },
        packageClosureDigest,
        materializationDigest,
      };
    },
    bindPort: async (binding) => {
      state.boundPorts.push(binding);
      if (failure === "port" && binding.port === 41731) throw new Error("address in use");
    },
    diskFreeBytes: async () => (failure === "disk" ? 8 * 1024 ** 3 - 1 : 16 * 1024 ** 3),
    hostPackageClosureAvailable: async () => failure !== "hostPackage",
    inspectBrowser: async (browser) => ({
      revision:
        failure === "browserRevision" && browser === "chromium"
          ? "wrong-revision"
          : browser === "chromium"
            ? "1228"
            : "2311",
      executablePath:
        failure === "browserMissing" && browser === "webkit"
          ? undefined
          : `/host/browsers/${browser}`,
    }),
    probeFont: async (cssPath) => {
      state.probedFonts.push(cssPath);
      return failure === "font" ? [] : [`${cssPath}.woff2`, `${cssPath}.woff`];
    },
    launchBrowser: async (browser, executablePath, fontPaths) => {
      expect(executablePath).toBe(`/host/browsers/${browser}`);
      expect(fontPaths).toHaveLength(4);
      state.launchedBrowsers.push(browser);
      if (failure === "browserLaunch" && browser === "webkit") {
        throw new Error("injected launch failure");
      }
      return { fontLoaded: true };
    },
    createDisposableSource: async (sourceRoot) => {
      expect(sourceRoot).toBe(root);
      return disposableRoot;
    },
    removeDisposableSource: async (path) => {
      expect(path).toBe(disposableRoot);
      state.mutations.push(`remove-disposable:${path}`);
    },
    ensureDirectory: async (path) => {
      state.mutations.push(`mkdir:${path}`);
    },
    readFile: async (path) => {
      const bytes = state.files.get(path);
      if (bytes === undefined) throw new Error(`missing fake file ${path}`);
      if (state.corruptCandidate && path.includes(".candidate-")) {
        return new TextEncoder().encode("{}\n");
      }
      return bytes;
    },
    openExclusive: async (path) => {
      state.mutations.push(`open:${path}`);
      if (state.files.has(path)) throw new Error(`fake exclusive path exists: ${path}`);
      pendingPath = path;
      pendingBytes = new Uint8Array();
      return {
        write: async (bytes) => {
          state.mutations.push(`write:${path}`);
          pendingBytes = Uint8Array.from(bytes);
        },
        sync: async () => {
          state.mutations.push(`sync:${path}`);
        },
        close: async () => {
          state.mutations.push(`close:${path}`);
          if (pendingPath === path) state.files.set(path, pendingBytes);
        },
      };
    },
    rename: async (from, to) => {
      state.mutations.push(`rename:${from}->${to}`);
      if (state.interruptRename) throw new Error("injected rename interruption");
      const bytes = state.files.get(from);
      if (bytes === undefined) throw new Error(`missing rename source ${from}`);
      state.files.set(to, bytes);
      state.files.delete(from);
    },
    remove: async (path) => {
      state.mutations.push(`remove:${path}`);
      state.files.delete(path);
    },
    syncDirectory: async (path) => {
      state.mutations.push(`sync-directory:${path}`);
    },
    uniqueSuffix: () => "test-candidate",
  };
  return { adapter, state };
}

async function expectCode(
  promise: Promise<unknown>,
  code: ExternalPreconditionCodeV1,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ExternalPreconditionError);
    expect(error).toMatchObject({ code });
    expect((error as Error).message).toContain(code);
    return;
  }
  throw new Error(`expected ${code}`);
}

describe("goal materializer", () => {
  it.each<[MaterializerFailure, ExternalPreconditionCodeV1]>([
    ["dirty", "external_precondition.git_worktree_dirty"],
    ["lateDirty", "external_precondition.git_worktree_dirty"],
    ["branch", "external_precondition.git_branch_invalid"],
    ["phaseBase", "external_precondition.phase_base_mismatch"],
    ["identity", "external_precondition.git_identity_missing"],
    ["port", "external_precondition.port_unavailable"],
    ["toolchain", "external_precondition.toolchain_mismatch"],
    ["onlineInstall", "external_precondition.package_materialization_failed"],
    ["hostPackage", "external_precondition.host_package_missing"],
    ["browserInstall", "external_precondition.browser_materialization_failed"],
    ["browserMissing", "external_precondition.browser_missing"],
    ["browserRevision", "external_precondition.browser_revision_mismatch"],
    ["browserLaunch", "external_precondition.browser_launch_failed"],
    ["font", "external_precondition.visual_font_missing"],
    ["disk", "external_precondition.insufficient_disk_space"],
    ["offlineInstall", "external_precondition.offline_install_failed"],
    ["offlineBuild", "external_precondition.offline_build_failed"],
    ["contract", "external_precondition.materialization_stale"],
  ])("maps injected %s failure to %s", async (failure, code) => {
    const { adapter } = createAdapter(failure);
    await expectCode(runMaterializeGoalV1(root, adapter), code);
  });

  it("uses fixed socket probes and structured online/offline argv without a shell", async () => {
    const { adapter, state } = createAdapter();
    await runMaterializeGoalV1(root, adapter);

    expect(state.boundPorts).toEqual(fixedGoalPortsV1);
    expect(state.commands).toEqual([
      {
        executable: "git",
        args: ["status", "--porcelain=v1", "--untracked-files=all"],
        cwd: root,
        network: "forbidden",
      },
      {
        executable: "git",
        args: ["symbolic-ref", "--quiet", "--short", "HEAD"],
        cwd: root,
        network: "forbidden",
      },
      {
        executable: "git",
        args: ["rev-parse", "HEAD"],
        cwd: root,
        network: "forbidden",
      },
      {
        executable: "git",
        args: ["merge-base", "--is-ancestor", phaseOneBaseCommitV1, head],
        cwd: root,
        network: "forbidden",
      },
      {
        executable: "git",
        args: ["config", "--get", "user.name"],
        cwd: root,
        network: "forbidden",
      },
      {
        executable: "git",
        args: ["config", "--get", "user.email"],
        cwd: root,
        network: "forbidden",
      },
      { executable: "pnpm", args: ["--version"], cwd: root, network: "forbidden" },
      {
        executable: "pnpm",
        args: ["install", "--frozen-lockfile"],
        cwd: root,
        network: "allowed",
      },
      {
        executable: "pnpm",
        args: ["exec", "playwright", "install", "chromium", "webkit"],
        cwd: root,
        network: "allowed",
      },
      {
        executable: "pnpm",
        args: ["install", "--offline", "--frozen-lockfile", "--frozen-store"],
        cwd: disposableRoot,
        network: "forbidden",
      },
      {
        executable: "pnpm",
        args: ["build:player"],
        cwd: disposableRoot,
        network: "forbidden",
      },
      {
        executable: "git",
        args: ["status", "--porcelain=v1", "--untracked-files=all"],
        cwd: root,
        network: "forbidden",
      },
      {
        executable: "git",
        args: ["symbolic-ref", "--quiet", "--short", "HEAD"],
        cwd: root,
        network: "forbidden",
      },
      {
        executable: "git",
        args: ["rev-parse", "HEAD"],
        cwd: root,
        network: "forbidden",
      },
    ]);
    for (const command of state.commands) {
      expect(command.args).toBeInstanceOf(Array);
      expect(command).not.toHaveProperty("shell");
      expect(command.executable).not.toMatch(/\s/u);
    }
    expect(state.launchedBrowsers).toEqual(["chromium", "webkit"]);
    expect(state.probedFonts).toEqual([
      resolve(
        root,
        "engine/packages/ui/node_modules/@fontsource/noto-sans-sc/chinese-simplified-400.css",
      ),
      resolve(
        root,
        "engine/packages/ui/node_modules/@fontsource/noto-sans-sc/chinese-simplified-700.css",
      ),
      resolve(
        disposableRoot,
        "engine/packages/ui/node_modules/@fontsource/noto-sans-sc/chinese-simplified-400.css",
      ),
      resolve(
        disposableRoot,
        "engine/packages/ui/node_modules/@fontsource/noto-sans-sc/chinese-simplified-700.css",
      ),
    ]);
  });

  it("validates and atomically replaces only the ignored attestation", async () => {
    const { adapter, state } = createAdapter();
    const result = await runMaterializeGoalV1(root, adapter);
    const target = goalMaterializationAttestationPathV1(root);
    const written = state.files.get(target);
    expect(written).toBeDefined();
    expect(written).not.toEqual(acceptedAttestation);
    const attestation = JSON.parse(new TextDecoder().decode(written)) as Record<string, unknown>;
    expect(attestation).toEqual({
      arch: "arm64",
      branch: "main",
      browsers: {
        chromium: { executableAvailable: true, revision: "1228" },
        webkit: { executableAvailable: true, revision: "2311" },
      },
      contractId: goalMaterializationContractIdV1,
      fixedPorts: fixedGoalPortsV1,
      materializationBaseCommit: head,
      materializationDigest,
      packageClosureDigest,
      platform: "darwin",
      schemaRevision: 1,
      status: "complete",
    });
    expect(result).toEqual(attestation);
    expect(new TextDecoder().decode(written).endsWith("\n")).toBe(true);
    expect(JSON.stringify(attestation)).not.toMatch(
      /Test User|test@example|hostname|credential|\/host\/browsers|\/repo\/project-tavern/u,
    );
    expect(state.mutations).toEqual([
      `remove-disposable:${disposableRoot}`,
      "mkdir:/repo/project-tavern/.project-tavern",
      "open:/repo/project-tavern/.project-tavern/goal-materialization.json.candidate-test-candidate",
      "write:/repo/project-tavern/.project-tavern/goal-materialization.json.candidate-test-candidate",
      "sync:/repo/project-tavern/.project-tavern/goal-materialization.json.candidate-test-candidate",
      "close:/repo/project-tavern/.project-tavern/goal-materialization.json.candidate-test-candidate",
      "rename:/repo/project-tavern/.project-tavern/goal-materialization.json.candidate-test-candidate->/repo/project-tavern/.project-tavern/goal-materialization.json",
      "sync-directory:/repo/project-tavern/.project-tavern",
      "remove:/repo/project-tavern/.project-tavern/goal-materialization.json.candidate-test-candidate",
    ]);
  });

  it("keeps the accepted attestation when candidate validation or rename is interrupted", async () => {
    for (const interruption of ["candidate", "rename"] as const) {
      const { adapter, state } = createAdapter();
      state.corruptCandidate = interruption === "candidate";
      state.interruptRename = interruption === "rename";
      await expectCode(
        runMaterializeGoalV1(root, adapter),
        "external_precondition.materialization_stale",
      );
      expect(state.files.get(goalMaterializationAttestationPathV1(root))).toEqual(
        acceptedAttestation,
      );
      expect([...state.files.keys()].filter((path) => path.includes(".candidate-"))).toEqual([]);
    }
  });

  it("rechecks the clean checkpoint after candidate fsync and before atomic publish", async () => {
    const { adapter, state } = createAdapter("lateDirty");
    await expectCode(
      runMaterializeGoalV1(root, adapter),
      "external_precondition.git_worktree_dirty",
    );
    expect(state.files.get(goalMaterializationAttestationPathV1(root))).toEqual(
      acceptedAttestation,
    );
    expect(state.mutations.some((mutation) => mutation.startsWith("rename:"))).toBe(false);
    expect([...state.files.keys()].filter((path) => path.includes(".candidate-"))).toEqual([]);
  });

  it("freezes the exact root command mapping", async () => {
    const packageJson = JSON.parse(
      await readFile(resolve(import.meta.dirname, "../../package.json"), "utf8"),
    ) as { readonly scripts?: Readonly<Record<string, string>> };
    expect(packageJson.scripts?.["prepare:goal"]).toBe(
      "node --experimental-strip-types scripts/preflight/materialize-goal.mts",
    );
  });
});
