// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { createHash, randomUUID } from "node:crypto";
import { readFile, readlink, lstat, mkdir, open, rename, rm } from "node:fs/promises";
import { createRequire, registerHooks } from "node:module";
import { isAbsolute, resolve, sep } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { ArtifactBuildConfigV1, ArtifactBuildRequestV1 } from "./build-config.mjs";

const buildConfigModuleV1 = (await import(
  new URL("./build-config.mts", import.meta.url).href
)) as typeof import("./build-config.mjs");
const { resolveArtifactBuildConfigV1 } = buildConfigModuleV1;

type DigestV1 = `sha256:${string}`;
type ProvenanceModeV1 = "clean_commit" | "development";

export interface ArtifactSourceIdentityV1 {
  readonly provenanceMode: ProvenanceModeV1;
  readonly sourceCommit: string;
  readonly sourceTree: string | null;
  readonly worktreeDigest?: DigestV1;
}

export interface ArtifactToolVersionsV1 {
  readonly node: string;
  readonly pnpm: string;
  readonly typescript: string;
  readonly vite: string;
}

export interface ArtifactResolvedIdentitiesV1 {
  readonly application: { readonly digest: DigestV1 };
  readonly engine: { readonly digest: DigestV1; readonly version: string };
  readonly resolvedGame: {
    readonly patchSet: unknown;
    readonly presentationDigest: DigestV1;
    readonly simulationDigest: DigestV1;
    readonly stateContractDigest: DigestV1;
    readonly stateContractRevision: number;
  };
  readonly story: { readonly digest: DigestV1; readonly id: string; readonly revision: number };
}

export interface ArtifactBuildInputV1 {
  readonly applicationHtml: string;
  readonly applicationId: ArtifactBuildConfigV1["applicationId"];
  readonly host: ArtifactBuildConfigV1["host"];
  readonly identities: ArtifactResolvedIdentitiesV1;
  readonly materializationDigest: DigestV1;
  readonly provenanceMode: ProvenanceModeV1;
  readonly schemaRevision: 1;
  readonly sourceCommit: string;
  readonly sourceGraphDigest: DigestV1;
  readonly sourceTree: string | null;
  readonly story: ArtifactBuildConfigV1["story"];
  readonly tools: ArtifactToolVersionsV1;
}

export interface ArtifactBuildPortsV1 {
  readonly repositoryRoot: string;
  collectBuildIdentity(config: ArtifactBuildConfigV1): Promise<unknown>;
  inspectSource(repositoryRoot: string): Promise<ArtifactSourceIdentityV1>;
  readMaterialization(
    repositoryRoot: string,
  ): Promise<{ readonly materializationDigest: DigestV1 }>;
  readSourceGraphBytes(input: {
    readonly config: ArtifactBuildConfigV1;
    readonly repositoryRoot: string;
  }): Promise<Uint8Array>;
  readToolVersions(repositoryRoot: string): Promise<ArtifactToolVersionsV1>;
  resolveIdentities(
    config: ArtifactBuildConfigV1,
    buildIdentity: unknown,
  ): Promise<ArtifactResolvedIdentitiesV1>;
  runViteBuild(input: {
    readonly buildIdentity: unknown;
    readonly config: ArtifactBuildConfigV1;
    readonly repositoryRoot: string;
  }): Promise<void>;
  writeBuildInput(input: {
    readonly bytes: Uint8Array;
    readonly config: ArtifactBuildConfigV1;
    readonly repositoryRoot: string;
  }): Promise<void>;
}

interface BaseReleaseFunctionsV1 {
  readonly canonicalJsonBytes: (value: unknown) => Uint8Array;
  readonly digestBytes: (bytes: Uint8Array) => DigestV1;
  readonly digestCanonical: (domain: "sillymaker:application:v1", value: unknown) => DigestV1;
}

const repositoryRootV1 = resolve(import.meta.dirname, "../..");
const exactNodeVersionV1 = "v26.5.0";
const exactPnpmVersionV1 = "11.11.0";
const objectIdPatternV1 = /^[0-9a-f]{40}$/u;
const digestPatternV1 = /^sha256:[0-9a-f]{64}$/u;
const decoderV1 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const commandOutputLimitV1 = 128 * 1024 * 1024;

function loadBaseReleaseFunctionsV1(): BaseReleaseFunctionsV1 {
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        if (specifier.endsWith(".js")) {
          return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
        }
        throw error;
      }
    },
  });
  const requireFromBuilderV1 = createRequire(import.meta.url);
  try {
    const canonicalModule: unknown = requireFromBuilderV1(
      resolve(repositoryRootV1, "engine/packages/base/src/contracts/canonical-json.ts"),
    );
    const digestModule: unknown = requireFromBuilderV1(
      resolve(repositoryRootV1, "engine/packages/base/src/contracts/digest.ts"),
    );
    const canonicalJsonBytes = Reflect.get(Object(canonicalModule), "canonicalJsonBytes");
    const digestBytes = Reflect.get(Object(digestModule), "digestBytes");
    const digestCanonical = Reflect.get(Object(digestModule), "digestCanonical");
    if (
      typeof canonicalJsonBytes !== "function" ||
      typeof digestBytes !== "function" ||
      typeof digestCanonical !== "function"
    ) {
      throw new TypeError("release.base_contract_unavailable: JSON identity functions missing");
    }
    return Object.freeze({
      canonicalJsonBytes: canonicalJsonBytes as BaseReleaseFunctionsV1["canonicalJsonBytes"],
      digestBytes: digestBytes as BaseReleaseFunctionsV1["digestBytes"],
      digestCanonical: digestCanonical as BaseReleaseFunctionsV1["digestCanonical"],
    });
  } finally {
    hooks.deregister();
  }
}

const { canonicalJsonBytes, digestBytes, digestCanonical } = loadBaseReleaseFunctionsV1();

function failV1(code: string, detail: string): never {
  throw new TypeError(`${code}: ${detail}`);
}

function detailFromV1(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function assertObjectIdV1(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || !objectIdPatternV1.test(value)) {
    failV1("release.invalid_source_provenance", `${path} must be a full lowercase Git object ID`);
  }
}

function assertDigestV1(value: unknown, path: string): asserts value is DigestV1 {
  if (typeof value !== "string" || !digestPatternV1.test(value)) {
    failV1("release.invalid_build_identity", `${path} must be a SHA-256 digest`);
  }
}

function equalBytesV1(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

function exactOwnKeysV1(value: object, expected: readonly string[]): boolean {
  const keys = Reflect.ownKeys(value);
  return (
    keys.length === expected.length &&
    keys.every((key) => typeof key === "string" && expected.includes(key))
  );
}

function isPlainObjectV1(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function inspectDataRecordV1(
  value: unknown,
  expected: readonly string[],
  path: string,
  code = "release.invalid_build_identity",
): Record<string, unknown> {
  if (!isPlainObjectV1(value) || !exactOwnKeysV1(value, expected)) {
    failV1(code, `${path} has unexpected or missing fields`);
  }
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      failV1(code, `${path}/${key} must be a data property`);
    }
  }
  return value;
}

function normalizeResolvedIdentitiesV1(value: unknown): ArtifactResolvedIdentitiesV1 {
  const identities = inspectDataRecordV1(
    value,
    ["application", "engine", "resolvedGame", "story"],
    "identities",
  );
  const application = inspectDataRecordV1(identities.application, ["digest"], "application");
  const engine = inspectDataRecordV1(identities.engine, ["digest", "version"], "engine");
  const story = inspectDataRecordV1(identities.story, ["digest", "id", "revision"], "story");
  const resolvedGame = inspectDataRecordV1(
    identities.resolvedGame,
    [
      "patchSet",
      "presentationDigest",
      "simulationDigest",
      "stateContractDigest",
      "stateContractRevision",
    ],
    "resolvedGame",
  );
  assertDigestV1(application.digest, "application/digest");
  assertDigestV1(engine.digest, "engine/digest");
  assertDigestV1(story.digest, "story/digest");
  assertDigestV1(resolvedGame.presentationDigest, "resolvedGame/presentationDigest");
  assertDigestV1(resolvedGame.simulationDigest, "resolvedGame/simulationDigest");
  assertDigestV1(resolvedGame.stateContractDigest, "resolvedGame/stateContractDigest");
  if (typeof engine.version !== "string" || engine.version.length === 0) {
    failV1("release.invalid_build_identity", "engine/version must be non-empty");
  }
  if (typeof story.id !== "string" || story.id.length === 0) {
    failV1("release.invalid_build_identity", "story/id must be non-empty");
  }
  for (const [path, candidate] of [
    ["story/revision", story.revision],
    ["resolvedGame/stateContractRevision", resolvedGame.stateContractRevision],
  ] as const) {
    if (!Number.isSafeInteger(candidate) || (candidate as number) <= 0) {
      failV1("release.invalid_build_identity", `${path} must be a positive safe integer`);
    }
  }
  canonicalJsonBytes(resolvedGame.patchSet);
  return Object.freeze({
    application: Object.freeze({ digest: application.digest }),
    engine: Object.freeze({ digest: engine.digest, version: engine.version }),
    resolvedGame: Object.freeze({
      patchSet: resolvedGame.patchSet,
      presentationDigest: resolvedGame.presentationDigest,
      simulationDigest: resolvedGame.simulationDigest,
      stateContractDigest: resolvedGame.stateContractDigest,
      stateContractRevision: resolvedGame.stateContractRevision as number,
    }),
    story: Object.freeze({
      digest: story.digest,
      id: story.id,
      revision: story.revision as number,
    }),
  }) as ArtifactResolvedIdentitiesV1;
}

function normalizeToolVersionsV1(value: ArtifactToolVersionsV1): ArtifactToolVersionsV1 {
  const tools = inspectDataRecordV1(value, ["node", "pnpm", "typescript", "vite"], "tools");
  for (const name of ["node", "pnpm", "typescript", "vite"] as const) {
    if (typeof tools[name] !== "string" || tools[name].length === 0) {
      failV1("release.invalid_build_identity", `tools/${name} must be non-empty`);
    }
  }
  return Object.freeze({
    node: tools.node as string,
    pnpm: tools.pnpm as string,
    typescript: tools.typescript as string,
    vite: tools.vite as string,
  });
}

export function createArtifactBuildInputV1(input: {
  readonly config: ArtifactBuildConfigV1;
  readonly identities: ArtifactResolvedIdentitiesV1;
  readonly materializationDigest: DigestV1;
  readonly source: Omit<ArtifactSourceIdentityV1, "worktreeDigest">;
  readonly sourceGraphDigest: DigestV1;
  readonly tools: ArtifactToolVersionsV1;
}): ArtifactBuildInputV1 {
  const source = input.source;
  assertObjectIdV1(source.sourceCommit, "sourceCommit");
  if (source.provenanceMode === "clean_commit") {
    assertObjectIdV1(source.sourceTree, "sourceTree");
  } else if (source.provenanceMode === "development") {
    if (source.sourceTree !== null) {
      failV1("release.invalid_source_provenance", "development sourceTree must be null");
    }
  } else {
    failV1("release.invalid_source_provenance", "provenanceMode is unsupported");
  }
  assertDigestV1(input.materializationDigest, "materializationDigest");
  assertDigestV1(input.sourceGraphDigest, "sourceGraphDigest");
  const identities = normalizeResolvedIdentitiesV1(input.identities);
  const tools = normalizeToolVersionsV1(input.tools);
  return Object.freeze({
    applicationHtml: input.config.applicationHtml,
    applicationId: input.config.applicationId,
    host: input.config.host,
    identities,
    materializationDigest: input.materializationDigest,
    provenanceMode: source.provenanceMode,
    schemaRevision: 1,
    sourceCommit: source.sourceCommit,
    sourceGraphDigest: input.sourceGraphDigest,
    sourceTree: source.sourceTree,
    story: input.config.story,
    tools,
  });
}

interface CommandResultV1 {
  readonly stderr: Uint8Array;
  readonly stdout: Uint8Array;
}

async function runCommandV1(
  executable: string,
  args: readonly string[],
  cwd: string,
): Promise<CommandResultV1> {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(executable, args, {
      cwd,
      env: process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let size = 0;
    let settled = false;
    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      rejectPromise(error);
    };
    const collect = (target: Buffer[], chunk: Buffer) => {
      size += chunk.byteLength;
      if (size > commandOutputLimitV1) {
        child.kill("SIGKILL");
        rejectOnce(new TypeError("release.command_output_too_large"));
        return;
      }
      target.push(chunk);
    };
    child.stdout.on("data", (chunk: Buffer) => collect(stdout, chunk));
    child.stderr.on("data", (chunk: Buffer) => collect(stderr, chunk));
    child.once("error", rejectOnce);
    child.once("close", (code, signal) => {
      if (settled) return;
      const stdoutBytes = Buffer.concat(stdout);
      const stderrBytes = Buffer.concat(stderr);
      if (code !== 0) {
        settled = true;
        let detail = signal === null ? `exit ${String(code)}` : `signal ${signal}`;
        try {
          const decoded = decoderV1.decode(stderrBytes).trim();
          if (decoded.length > 0) detail = `${detail}: ${decoded}`;
        } catch {
          detail = `${detail}: non-UTF-8 stderr`;
        }
        rejectPromise(new TypeError(`release.command_failed: ${executable} ${detail}`));
        return;
      }
      settled = true;
      resolvePromise({ stderr: stderrBytes, stdout: stdoutBytes });
    });
  });
}

function decodeOneLineV1(bytes: Uint8Array, path: string): string {
  const value = decoderV1.decode(bytes).trim();
  if (value.length === 0 || value.includes("\n") || value.includes("\r")) {
    failV1("release.invalid_source_provenance", `${path} is not one line`);
  }
  return value;
}

function updateLengthDelimitedHashV1(hash: ReturnType<typeof createHash>, bytes: Uint8Array): void {
  hash.update(String(bytes.byteLength));
  hash.update("\0");
  hash.update(bytes);
  hash.update("\0");
}

function decodeNullDelimitedPathsV1(bytes: Uint8Array): readonly string[] {
  const decoded = decoderV1.decode(bytes);
  if (decoded.length === 0) return Object.freeze([]);
  if (!decoded.endsWith("\0")) {
    failV1("release.invalid_source_provenance", "Git path list is not NUL terminated");
  }
  const paths = decoded.slice(0, -1).split("\0");
  for (const path of paths) {
    if (
      path.length === 0 ||
      isAbsolute(path) ||
      path.includes("\\") ||
      path.split("/").some((part) => part === "" || part === "." || part === "..")
    ) {
      failV1("release.invalid_source_provenance", "Git returned an unsafe untracked path");
    }
  }
  return Object.freeze(paths);
}

async function digestWorktreeV1(input: {
  readonly diff: Uint8Array;
  readonly repositoryRoot: string;
  readonly status: Uint8Array;
  readonly untracked: Uint8Array;
}): Promise<DigestV1> {
  const hash = createHash("sha256");
  updateLengthDelimitedHashV1(hash, input.status);
  updateLengthDelimitedHashV1(hash, input.diff);
  for (const path of decodeNullDelimitedPathsV1(input.untracked)) {
    const absolute = resolve(input.repositoryRoot, path);
    const relative = absolute.slice(input.repositoryRoot.length + 1);
    if (absolute === input.repositoryRoot || relative.startsWith(`..${sep}`)) {
      failV1("release.invalid_source_provenance", "untracked path escaped repository root");
    }
    updateLengthDelimitedHashV1(hash, new TextEncoder().encode(path));
    const metadata = await lstat(absolute);
    if (metadata.isSymbolicLink()) {
      updateLengthDelimitedHashV1(hash, new TextEncoder().encode("symlink"));
      updateLengthDelimitedHashV1(hash, new TextEncoder().encode(await readlink(absolute)));
    } else if (metadata.isFile()) {
      updateLengthDelimitedHashV1(hash, new TextEncoder().encode("file"));
      updateLengthDelimitedHashV1(hash, await readFile(absolute));
    } else {
      failV1("release.invalid_source_provenance", `unsupported untracked entry: ${path}`);
    }
  }
  return `sha256:${hash.digest("hex")}`;
}

async function inspectGitSourceV1(repositoryRoot: string): Promise<ArtifactSourceIdentityV1> {
  const headBefore = decodeOneLineV1(
    (await runCommandV1("git", ["rev-parse", "HEAD"], repositoryRoot)).stdout,
    "HEAD",
  );
  const treeBefore = decodeOneLineV1(
    (await runCommandV1("git", ["rev-parse", "HEAD^{tree}"], repositoryRoot)).stdout,
    "HEAD tree",
  );
  assertObjectIdV1(headBefore, "sourceCommit");
  assertObjectIdV1(treeBefore, "sourceTree");
  const [status, diff, untracked] = await Promise.all([
    runCommandV1(
      "git",
      ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
      repositoryRoot,
    ),
    runCommandV1("git", ["diff", "--binary", "--no-ext-diff", "HEAD", "--"], repositoryRoot),
    runCommandV1("git", ["ls-files", "--others", "--exclude-standard", "-z"], repositoryRoot),
  ]);
  const headAfter = decodeOneLineV1(
    (await runCommandV1("git", ["rev-parse", "HEAD"], repositoryRoot)).stdout,
    "HEAD",
  );
  const treeAfter = decodeOneLineV1(
    (await runCommandV1("git", ["rev-parse", "HEAD^{tree}"], repositoryRoot)).stdout,
    "HEAD tree",
  );
  if (headBefore !== headAfter || treeBefore !== treeAfter) {
    failV1("release.source_changed", "HEAD changed while source provenance was inspected");
  }
  const worktreeDigest = await digestWorktreeV1({
    diff: diff.stdout,
    repositoryRoot,
    status: status.stdout,
    untracked: untracked.stdout,
  });
  const clean = status.stdout.byteLength === 0;
  if (clean && (diff.stdout.byteLength !== 0 || untracked.stdout.byteLength !== 0)) {
    failV1("release.invalid_source_provenance", "Git cleanliness evidence disagrees");
  }
  return Object.freeze({
    provenanceMode: clean ? "clean_commit" : "development",
    sourceCommit: headBefore,
    sourceTree: clean ? treeBefore : null,
    worktreeDigest,
  });
}

function sameSourceIdentityV1(
  left: ArtifactSourceIdentityV1,
  right: ArtifactSourceIdentityV1,
): boolean {
  return (
    left.provenanceMode === right.provenanceMode &&
    left.sourceCommit === right.sourceCommit &&
    left.sourceTree === right.sourceTree &&
    left.worktreeDigest === right.worktreeDigest
  );
}

async function collectBuildIdentityV1(config: ArtifactBuildConfigV1): Promise<unknown> {
  const requireFromBuilderV1 = createRequire(import.meta.url);
  const loaded: unknown = requireFromBuilderV1(resolve(repositoryRootV1, config.identityModule));
  const collect = Reflect.get(Object(loaded), config.collectIdentityExport);
  if (typeof collect !== "function") {
    failV1("release.build_identity_unavailable", "selected Story collector is invalid");
  }
  return await collect(repositoryRootV1);
}

async function resolveArtifactIdentitiesV1(
  config: ArtifactBuildConfigV1,
  buildIdentity: unknown,
): Promise<ArtifactResolvedIdentitiesV1> {
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
    const baseModule = await import("../../engine/packages/base/src/index.js");
    const storyModule: unknown =
      config.story === "poc"
        ? await import("../../game/stories/poc/src/story-definition.js")
        : await import("../../game/stories/e2e/src/story-entry.js");
    const storyEntry =
      config.story === "poc"
        ? Reflect.get(Object(storyModule), "pocStoryEntryV1")
        : Reflect.get(Object(storyModule), "e2eStoryEntryV1");
    if (storyEntry === undefined) {
      failV1("release.build_identity_unavailable", "selected Story entry is unavailable");
    }
    const resolution = baseModule.resolveGamePackageV1(storyEntry, [], buildIdentity as never);
    if (resolution.kind === "failed") {
      failV1(
        "release.story_resolution_failed",
        `${resolution.failure.code}: ${String(resolution.failure.details.message ?? "failed")}`,
      );
    }
    const provenance = resolution.resolved.provenance;
    return normalizeResolvedIdentitiesV1({
      application: {
        digest: digestCanonical(
          "sillymaker:application:v1",
          (buildIdentity as { readonly application?: unknown }).application,
        ),
      },
      engine: provenance.engine,
      resolvedGame: provenance.resolved,
      story: provenance.story,
    });
  } finally {
    hooks.deregister();
  }
}

async function readMaterializationV1(
  repositoryRoot: string,
): Promise<{ readonly materializationDigest: DigestV1 }> {
  const [contractModule, verifierModule, attestationBytes] = await Promise.all([
    import(new URL("../preflight/materialization-contract.mts", import.meta.url).href) as Promise<
      typeof import("../preflight/materialization-contract.mjs")
    >,
    import(new URL("../preflight/verify-materialization.mts", import.meta.url).href) as Promise<
      typeof import("../preflight/verify-materialization.mjs")
    >,
    readFile(resolve(repositoryRoot, ".project-tavern/goal-materialization.json")),
  ]);
  const [contract, attestation] = await Promise.all([
    contractModule.readMaterializationContractV1(repositoryRoot),
    Promise.resolve(verifierModule.parseGoalMaterializationAttestationV1(attestationBytes)),
  ]);
  if (
    contract.materializationDigest !== attestation.materializationDigest ||
    contract.packageClosureDigest !== attestation.packageClosureDigest
  ) {
    failV1("release.materialization_mismatch", "attestation does not match tracked contract");
  }
  assertDigestV1(contract.materializationDigest, "materializationDigest");
  return Object.freeze({ materializationDigest: contract.materializationDigest });
}

async function readToolVersionsV1(repositoryRoot: string): Promise<ArtifactToolVersionsV1> {
  const manifestBytes = await readFile(resolve(repositoryRoot, "package.json"));
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoderV1.decode(manifestBytes));
  } catch (error) {
    failV1("release.toolchain_mismatch", `package.json is invalid: ${detailFromV1(error)}`);
  }
  if (!isPlainObjectV1(parsed) || !isPlainObjectV1(parsed.devDependencies)) {
    failV1("release.toolchain_mismatch", "root devDependencies are unavailable");
  }
  const typescript = parsed.devDependencies.typescript;
  const vite = parsed.devDependencies.vite;
  const pnpm = decodeOneLineV1(
    (await runCommandV1("pnpm", ["--version"], repositoryRoot)).stdout,
    "pnpm version",
  );
  if (
    process.version !== exactNodeVersionV1 ||
    pnpm !== exactPnpmVersionV1 ||
    parsed.packageManager !== `pnpm@${exactPnpmVersionV1}` ||
    typeof typescript !== "string" ||
    typeof vite !== "string" ||
    !/^\d+\.\d+\.\d+$/u.test(typescript) ||
    !/^\d+\.\d+\.\d+$/u.test(vite)
  ) {
    failV1("release.toolchain_mismatch", "materialized Node/pnpm/TypeScript/Vite do not match");
  }
  return Object.freeze({
    node: process.version,
    pnpm,
    typescript,
    vite,
  });
}

async function runViteBuildV1(input: {
  readonly buildIdentity: unknown;
  readonly config: ArtifactBuildConfigV1;
  readonly repositoryRoot: string;
}): Promise<void> {
  if (resolve(input.repositoryRoot) !== repositoryRootV1) {
    failV1("release.invalid_build_request", "repository root override is forbidden");
  }
  const [{ build }, configModule] = await Promise.all([
    import("vite"),
    import(new URL("../../vite.config.ts", import.meta.url).href) as Promise<
      typeof import("../../vite.config.js")
    >,
  ]);
  const createConfig = Reflect.get(Object(configModule), "createProjectTavernViteConfigV1");
  if (typeof createConfig !== "function") {
    failV1("release.invalid_build_config", "closed Vite config factory is unavailable");
  }
  const viteConfig = (await createConfig({
    applicationId: input.config.applicationId,
    initialBuildIdentity: input.buildIdentity,
  })) as Record<string, unknown>;
  await build({
    ...viteConfig,
    configFile: false,
    mode: input.config.viteMode,
  });
}

function validateSourceGraphBytesV1(bytes: Uint8Array, config: ArtifactBuildConfigV1): void {
  if (bytes.byteLength === 0 || bytes.byteLength > 4 * 1024 * 1024) {
    failV1("release.source_graph_invalid", "source graph size is invalid");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoderV1.decode(bytes));
  } catch (error) {
    failV1("release.source_graph_invalid", detailFromV1(error));
  }
  const graph = inspectDataRecordV1(
    parsed,
    ["applicationId", "chunks", "contractRevision", "dynamicSpecifiers", "edges", "entry", "nodes"],
    "sourceGraph",
    "release.source_graph_invalid",
  );
  if (
    graph.contractRevision !== 1 ||
    graph.applicationId !== config.applicationId ||
    graph.entry !== config.applicationEntry ||
    !Array.isArray(graph.nodes) ||
    !Array.isArray(graph.edges) ||
    !Array.isArray(graph.dynamicSpecifiers) ||
    !Array.isArray(graph.chunks)
  ) {
    failV1("release.source_graph_invalid", "source graph does not match selected application");
  }
  let canonical: Uint8Array;
  try {
    canonical = canonicalJsonBytes(parsed);
  } catch (error) {
    failV1("release.source_graph_invalid", detailFromV1(error));
  }
  if (!equalBytesV1(canonical, bytes)) {
    failV1("release.source_graph_noncanonical", "source graph bytes are not canonical JSON");
  }
}

async function readSourceGraphBytesV1(input: {
  readonly config: ArtifactBuildConfigV1;
  readonly repositoryRoot: string;
}): Promise<Uint8Array> {
  const bytes = await readFile(
    resolve(input.repositoryRoot, input.config.outDir, "source-graph.v1.json"),
  );
  validateSourceGraphBytesV1(bytes, input.config);
  return bytes;
}

async function writeBuildInputV1(input: {
  readonly bytes: Uint8Array;
  readonly config: ArtifactBuildConfigV1;
  readonly repositoryRoot: string;
}): Promise<void> {
  const directory = resolve(input.repositoryRoot, input.config.outDir);
  await mkdir(directory, { recursive: true });
  const target = resolve(directory, "build-input.json");
  const candidate = `${target}.candidate-${process.pid}-${randomUUID()}`;
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(candidate, "wx", 0o644);
    await handle.writeFile(input.bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(candidate, target);
    const directoryHandle = await open(directory, "r");
    try {
      await directoryHandle.sync();
    } finally {
      await directoryHandle.close();
    }
  } finally {
    await handle?.close().catch(() => undefined);
    await rm(candidate, { force: true });
  }
}

function createNodeArtifactBuildPortsV1(): ArtifactBuildPortsV1 {
  return Object.freeze({
    repositoryRoot: repositoryRootV1,
    collectBuildIdentity: collectBuildIdentityV1,
    inspectSource: inspectGitSourceV1,
    readMaterialization: readMaterializationV1,
    readSourceGraphBytes: readSourceGraphBytesV1,
    readToolVersions: readToolVersionsV1,
    resolveIdentities: resolveArtifactIdentitiesV1,
    runViteBuild: runViteBuildV1,
    writeBuildInput: writeBuildInputV1,
  });
}

export async function buildArtifactV1(
  request: ArtifactBuildRequestV1,
  ports: ArtifactBuildPortsV1 = createNodeArtifactBuildPortsV1(),
): Promise<ArtifactBuildInputV1> {
  const config = resolveArtifactBuildConfigV1(request);
  const sourceBefore = await ports.inspectSource(ports.repositoryRoot);
  const [buildIdentity, materialization, tools] = await Promise.all([
    ports.collectBuildIdentity(config),
    ports.readMaterialization(ports.repositoryRoot),
    ports.readToolVersions(ports.repositoryRoot),
  ]);
  const identities = await ports.resolveIdentities(config, buildIdentity);
  await ports.runViteBuild({
    buildIdentity,
    config,
    repositoryRoot: ports.repositoryRoot,
  });
  const sourceGraphBytes = await ports.readSourceGraphBytes({
    config,
    repositoryRoot: ports.repositoryRoot,
  });
  validateSourceGraphBytesV1(sourceGraphBytes, config);
  const sourceAfter = await ports.inspectSource(ports.repositoryRoot);
  if (!sameSourceIdentityV1(sourceBefore, sourceAfter)) {
    failV1("release.source_changed", "source identity changed during Artifact construction");
  }
  const input = createArtifactBuildInputV1({
    config,
    identities,
    materializationDigest: materialization.materializationDigest,
    source: sourceAfter,
    sourceGraphDigest: digestBytes(sourceGraphBytes),
    tools,
  });
  await ports.writeBuildInput({
    bytes: canonicalJsonBytes(input),
    config,
    repositoryRoot: ports.repositoryRoot,
  });
  return input;
}

export function parseArtifactBuildArgumentsV1(args: readonly string[]): ArtifactBuildRequestV1 {
  if (
    args.length !== 6 ||
    args[0] !== "--story" ||
    args[2] !== "--host" ||
    args[4] !== "--out-dir"
  ) {
    failV1("release.invalid_build_request", "expected closed --story/--host/--out-dir arguments");
  }
  const request = {
    story: args[1],
    host: args[3],
    outDir: args[5],
  } as ArtifactBuildRequestV1;
  resolveArtifactBuildConfigV1(request);
  return request;
}

const isMainV1 =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainV1) {
  try {
    const request = parseArtifactBuildArgumentsV1(process.argv.slice(2));
    const result = await buildArtifactV1(request);
    console.log(
      `built ${result.applicationId} ${result.provenanceMode} ${result.sourceGraphDigest}`,
    );
  } catch (error) {
    console.error(detailFromV1(error));
    process.exitCode = 1;
  }
}
