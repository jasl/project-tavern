// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ExternalPreconditionError,
  fixedGoalPortsV1,
  goalMaterializationContractIdV1,
  phaseOneBaseCommitV1,
  serializeGoalMaterializationAttestationV1,
  verifyGoalMaterializationV1,
  type ExternalPreconditionCodeV1,
  type GoalMaterializationAdapterV1,
  type GoalMaterializationAttestationV1,
  type GoalMaterializationCommandV1,
} from "./verify-materialization.mjs";
import { goalMaterializationAttestationPathV1 } from "./materialize-goal.mjs";

const root = "/repo/project-tavern";
const disposableRoot = "/host/tmp/project-tavern-verification";
const materializationBaseCommit = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const head = "dddddddddddddddddddddddddddddddddddddddd";
const packageClosureDigest = `sha256:${"b".repeat(64)}` as const;
const materializationDigest = `sha256:${"c".repeat(64)}` as const;
const stableFailureCodes = [
  "external_precondition.git_worktree_dirty",
  "external_precondition.git_branch_invalid",
  "external_precondition.phase_base_mismatch",
  "external_precondition.git_identity_missing",
  "external_precondition.port_unavailable",
  "external_precondition.toolchain_mismatch",
  "external_precondition.package_materialization_failed",
  "external_precondition.host_package_missing",
  "external_precondition.host_platform_mismatch",
  "external_precondition.browser_materialization_failed",
  "external_precondition.browser_missing",
  "external_precondition.browser_revision_mismatch",
  "external_precondition.browser_launch_failed",
  "external_precondition.visual_font_missing",
  "external_precondition.insufficient_disk_space",
  "external_precondition.offline_install_failed",
  "external_precondition.offline_build_failed",
  "external_precondition.materialization_stale",
] as const satisfies readonly ExternalPreconditionCodeV1[];

type VerifierFailure =
  | "dirty"
  | "branch"
  | "phaseBase"
  | "materializationBase"
  | "identity"
  | "port"
  | "toolchain"
  | "hostPackage"
  | "platform"
  | "browserMissing"
  | "browserRevision"
  | "browserLaunch"
  | "fontMissing"
  | "fontUnloadable"
  | "disk"
  | "offlineInstall"
  | "offlineBuild"
  | "contract"
  | "attestationMissing"
  | "attestationInvalid"
  | "attestationDigest"
  | "attestationBranch";

interface FakeState {
  readonly commands: GoalMaterializationCommandV1[];
  readonly boundPorts: Array<{ readonly host: string; readonly port: number }>;
  readonly launchedBrowsers: string[];
  readonly probedFonts: string[];
  readonly mutations: string[];
}

function validAttestation(
  overrides: Partial<GoalMaterializationAttestationV1> = {},
): GoalMaterializationAttestationV1 {
  return {
    schemaRevision: 1,
    contractId: goalMaterializationContractIdV1,
    status: "complete",
    materializationBaseCommit,
    branch: "main",
    fixedPorts: fixedGoalPortsV1,
    materializationDigest,
    packageClosureDigest,
    platform: "darwin",
    arch: "arm64",
    browsers: {
      chromium: { revision: "1228", executableAvailable: true },
      webkit: { revision: "2311", executableAvailable: true },
    },
    ...overrides,
  };
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

function createAdapter(failure?: VerifierFailure): {
  readonly adapter: GoalMaterializationAdapterV1;
  readonly state: FakeState;
} {
  const state: FakeState = {
    commands: [],
    boundPorts: [],
    launchedBrowsers: [],
    probedFonts: [],
    mutations: [],
  };
  const attestation = validAttestation({
    ...(failure === "platform" ? { platform: "linux" as const } : {}),
    ...(failure === "attestationDigest"
      ? { materializationDigest: `sha256:${"e".repeat(64)}` as const }
      : {}),
    ...(failure === "attestationBranch" ? { branch: "unexpected" } : {}),
  });

  const adapter: GoalMaterializationAdapterV1 = {
    nodeVersion: failure === "toolchain" ? "v25.0.0" : "v26.5.0",
    platform: "darwin",
    arch: "arm64",
    tempDirectory: "/host/tmp",
    run: async (command) => {
      state.commands.push(command);
      const key = commandKey(command);
      if (key === "git\0status\0--porcelain=v1\0--untracked-files=all") {
        return commandResult(failure === "dirty" ? " M tracked.ts\n" : "");
      }
      if (key === "git\0symbolic-ref\0--quiet\0--short\0HEAD") {
        return failure === "branch" ? commandResult("", 1) : commandResult("main\n");
      }
      if (key === "git\0rev-parse\0HEAD") return commandResult(`${head}\n`);
      if (key === `git\0merge-base\0--is-ancestor\0${phaseOneBaseCommitV1}\0${head}`) {
        return commandResult("", failure === "phaseBase" ? 1 : 0);
      }
      if (key === `git\0merge-base\0--is-ancestor\0${materializationBaseCommit}\0${head}`) {
        return commandResult("", failure === "materializationBase" ? 1 : 0);
      }
      if (key === "git\0config\0--get\0user.name") {
        return commandResult(failure === "identity" ? "" : "Test User\n");
      }
      if (key === "git\0config\0--get\0user.email") {
        return commandResult(failure === "identity" ? "" : "test@example.invalid\n");
      }
      if (key === "pnpm\0--version") return commandResult("11.11.0\n");
      if (key === "pnpm\0install\0--offline\0--frozen-lockfile\0--frozen-store") {
        return commandResult("", failure === "offlineInstall" ? 1 : 0);
      }
      if (key === "pnpm\0build") {
        return commandResult("", failure === "offlineBuild" ? 1 : 0);
      }
      throw new Error(`unexpected command ${JSON.stringify(command)}`);
    },
    readMaterializationContract: async () => {
      if (failure === "contract") throw new Error("injected stale tracked contract");
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
      if (failure === "port" && binding.port === 4173) throw new Error("address in use");
    },
    diskFreeBytes: async () => (failure === "disk" ? 0 : 16 * 1024 ** 3),
    hostPackageClosureAvailable: async () => failure !== "hostPackage",
    inspectBrowser: async (browser) => ({
      revision:
        failure === "browserRevision" && browser === "webkit"
          ? "wrong-revision"
          : browser === "chromium"
            ? "1228"
            : "2311",
      executablePath:
        failure === "browserMissing" && browser === "chromium"
          ? undefined
          : `/host/browsers/${browser}`,
    }),
    probeFont: async (cssPath) => {
      state.probedFonts.push(cssPath);
      return failure === "fontMissing" ? [] : [`${cssPath}.woff2`, `${cssPath}.woff`];
    },
    launchBrowser: async (browser, executablePath, fontPaths) => {
      expect(executablePath).toBe(`/host/browsers/${browser}`);
      expect(fontPaths).toHaveLength(4);
      state.launchedBrowsers.push(browser);
      if (failure === "browserLaunch" && browser === "chromium") {
        throw new Error("injected browser launch failure");
      }
      return { fontLoaded: failure !== "fontUnloadable" };
    },
    createDisposableSource: async (sourceRoot) => {
      expect(sourceRoot).toBe(root);
      state.mutations.push(`create-disposable:${disposableRoot}`);
      return disposableRoot;
    },
    removeDisposableSource: async (path) => {
      expect(path).toBe(disposableRoot);
      state.mutations.push(`remove-disposable:${path}`);
    },
    ensureDirectory: async (path) => {
      state.mutations.push(`forbidden-mkdir:${path}`);
      throw new Error("verifier attempted a tracked/local attestation write");
    },
    readFile: async (path) => {
      expect(path).toBe(goalMaterializationAttestationPathV1(root));
      if (failure === "attestationMissing") throw new Error("missing attestation");
      if (failure === "attestationInvalid") return new TextEncoder().encode("{}\n");
      return serializeGoalMaterializationAttestationV1(attestation);
    },
    openExclusive: async (path) => {
      state.mutations.push(`forbidden-open:${path}`);
      throw new Error("verifier opened a writer");
    },
    rename: async (from, to) => {
      state.mutations.push(`forbidden-rename:${from}->${to}`);
      throw new Error("verifier renamed a file");
    },
    remove: async (path) => {
      state.mutations.push(`forbidden-remove:${path}`);
      throw new Error("verifier removed a tracked/local file");
    },
    syncDirectory: async (path) => {
      state.mutations.push(`forbidden-sync-directory:${path}`);
      throw new Error("verifier synced the attestation directory");
    },
    uniqueSuffix: () => {
      throw new Error("verifier requested a writer suffix");
    },
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

describe("goal materialization verifier", () => {
  it("freezes the complete stable external-precondition taxonomy", () => {
    expect(stableFailureCodes).toHaveLength(18);
    expect(new Set(stableFailureCodes).size).toBe(18);
    for (const code of stableFailureCodes) {
      const error = new ExternalPreconditionError(code, "injected detail");
      expect(error).toMatchObject({ name: "ExternalPreconditionError", code });
      expect(error.message).toContain(code);
    }
  });

  it.each<[VerifierFailure, ExternalPreconditionCodeV1]>([
    ["dirty", "external_precondition.git_worktree_dirty"],
    ["branch", "external_precondition.git_branch_invalid"],
    ["phaseBase", "external_precondition.phase_base_mismatch"],
    ["materializationBase", "external_precondition.phase_base_mismatch"],
    ["identity", "external_precondition.git_identity_missing"],
    ["port", "external_precondition.port_unavailable"],
    ["toolchain", "external_precondition.toolchain_mismatch"],
    ["hostPackage", "external_precondition.host_package_missing"],
    ["platform", "external_precondition.host_platform_mismatch"],
    ["browserMissing", "external_precondition.browser_missing"],
    ["browserRevision", "external_precondition.browser_revision_mismatch"],
    ["browserLaunch", "external_precondition.browser_launch_failed"],
    ["fontMissing", "external_precondition.visual_font_missing"],
    ["fontUnloadable", "external_precondition.visual_font_missing"],
    ["disk", "external_precondition.insufficient_disk_space"],
    ["offlineInstall", "external_precondition.offline_install_failed"],
    ["offlineBuild", "external_precondition.offline_build_failed"],
    ["contract", "external_precondition.materialization_stale"],
    ["attestationMissing", "external_precondition.materialization_stale"],
    ["attestationInvalid", "external_precondition.materialization_stale"],
    ["attestationDigest", "external_precondition.materialization_stale"],
    ["attestationBranch", "external_precondition.git_branch_invalid"],
  ])("maps injected %s failure to %s", async (failure, code) => {
    const { adapter } = createAdapter(failure);
    await expectCode(verifyGoalMaterializationV1(root, adapter), code);
  });

  it("uses only structured offline commands and leaves tracked/local attestation state read-only", async () => {
    const { adapter, state } = createAdapter();
    const result = await verifyGoalMaterializationV1(root, adapter);
    expect(result).toEqual(validAttestation());
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
        executable: "git",
        args: ["merge-base", "--is-ancestor", materializationBaseCommit, head],
        cwd: root,
        network: "forbidden",
      },
      {
        executable: "pnpm",
        args: ["install", "--offline", "--frozen-lockfile", "--frozen-store"],
        cwd: disposableRoot,
        network: "forbidden",
      },
      {
        executable: "pnpm",
        args: ["build"],
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
    expect(state.commands.every((command) => command.network === "forbidden")).toBe(true);
    for (const command of state.commands) {
      expect(command.args).toBeInstanceOf(Array);
      expect(command).not.toHaveProperty("shell");
      expect(command.executable).not.toMatch(/\s/u);
    }
    expect(state.mutations).toEqual([
      `create-disposable:${disposableRoot}`,
      `remove-disposable:${disposableRoot}`,
    ]);
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

  it("strictly rejects unrecognized attestation fields", () => {
    const invalid: unknown = {
      ...validAttestation(),
      absoluteRepositoryPath: root,
    };
    expect(() => serializeGoalMaterializationAttestationV1(invalid)).toThrow();
  });

  it("freezes the exact root command mapping", async () => {
    const packageJson = JSON.parse(
      await readFile(resolve(import.meta.dirname, "../../package.json"), "utf8"),
    ) as { readonly scripts?: Readonly<Record<string, string>> };
    expect(packageJson.scripts?.["verify:materialization"]).toBe(
      "node --experimental-strip-types scripts/preflight/verify-materialization.mts",
    );
  });
});
