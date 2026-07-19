// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  readFile,
  readlink,
  lstat,
  mkdir,
  mkdtemp,
  open,
  realpath,
  rename,
  rm,
} from "node:fs/promises";
import { createRequire, registerHooks } from "node:module";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
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
  createWorkspace?(input: {
    readonly config: ArtifactBuildConfigV1;
    readonly repositoryRoot: string;
  }): Promise<ArtifactBuildWorkspaceV1>;
  discardWorkspace?(input: {
    readonly config: ArtifactBuildConfigV1;
    readonly repositoryRoot: string;
    readonly workspace: ArtifactBuildWorkspaceV1;
  }): Promise<void>;
  collectBuildIdentity(config: ArtifactBuildConfigV1): Promise<unknown>;
  inspectSource(repositoryRoot: string): Promise<ArtifactSourceIdentityV1>;
  readMaterialization(
    repositoryRoot: string,
  ): Promise<{ readonly materializationDigest: DigestV1 }>;
  readSourceGraphBytes(input: {
    readonly config: ArtifactBuildConfigV1;
    readonly outputRoot: string;
    readonly repositoryRoot: string;
  }): Promise<Uint8Array>;
  readToolVersions(repositoryRoot: string): Promise<ArtifactToolVersionsV1>;
  resolveIdentities(
    config: ArtifactBuildConfigV1,
    buildIdentity: unknown,
  ): Promise<ArtifactResolvedIdentitiesV1>;
  finalizePocArtifact?(input: {
    readonly buildInput: ArtifactBuildInputV1;
    readonly config: ArtifactBuildConfigV1;
    readonly outputRoot: string;
    readonly repositoryRoot: string;
  }): Promise<void>;
  publishWorkspace?(input: {
    readonly config: ArtifactBuildConfigV1;
    readonly repositoryRoot: string;
    readonly workspace: ArtifactBuildWorkspaceV1;
  }): Promise<void>;
  runViteBuild(input: {
    readonly buildIdentity: unknown;
    readonly config: ArtifactBuildConfigV1;
    readonly outputRoot: string;
    readonly repositoryRoot: string;
  }): Promise<void>;
  writeBuildInput(input: {
    readonly bytes: Uint8Array;
    readonly config: ArtifactBuildConfigV1;
    readonly outputRoot: string;
    readonly repositoryRoot: string;
  }): Promise<void>;
}

export interface ArtifactBuildWorkspaceV1 {
  readonly outputRoot: string;
}

export interface ArtifactBuildOptionsV1 {
  readonly requireClean?: boolean;
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

interface ArtifactOutputBoundaryEntryV1 {
  readonly dev: number;
  readonly ino: number;
  readonly path: string;
  readonly realPath: string;
}

interface ArtifactOutputBoundaryV1 {
  readonly entries: readonly ArtifactOutputBoundaryEntryV1[];
  readonly outputRoot: string;
}

interface PinnedDirectoryV1 {
  readonly dev: number;
  readonly handle: Awaited<ReturnType<typeof open>>;
  readonly ino: number;
  readonly path: string;
  readonly realPath: string;
}

interface NodeArtifactBuildWorkspaceAuthorityV1 {
  readonly candidate: PinnedDirectoryV1;
  readonly finalOutputRoot: string;
  readonly parent: PinnedDirectoryV1;
}

const nodeWorkspaceAuthoritiesV1 = new WeakMap<
  ArtifactBuildWorkspaceV1,
  NodeArtifactBuildWorkspaceAuthorityV1
>();
const nodeWorkspaceAuthoritiesByPathV1 = new Map<string, NodeArtifactBuildWorkspaceAuthorityV1>();

function isMissingPathV1(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (Reflect.get(error, "code") === "ENOENT" || Reflect.get(error, "code") === "ENOTDIR")
  );
}

async function capturePinnedDirectoryV1(path: string, label: string): Promise<PinnedDirectoryV1> {
  const absolutePath = resolve(path);
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const [handleMetadata, pathMetadata, actualRealPath] = await Promise.all([
      handle.stat(),
      lstat(absolutePath),
      realpath(absolutePath),
    ]);
    if (
      !handleMetadata.isDirectory() ||
      pathMetadata.isSymbolicLink() ||
      !pathMetadata.isDirectory() ||
      handleMetadata.dev !== pathMetadata.dev ||
      handleMetadata.ino !== pathMetadata.ino
    ) {
      failV1("release.invalid_artifact_target", `${label} is not a pinned real directory`);
    }
    const pinned = Object.freeze({
      dev: handleMetadata.dev,
      handle,
      ino: handleMetadata.ino,
      path: absolutePath,
      realPath: actualRealPath,
    });
    handle = undefined;
    return pinned;
  } catch (error) {
    if (error instanceof TypeError && error.message.startsWith("release.")) throw error;
    return failV1(
      "release.invalid_artifact_target",
      `${label} is unavailable: ${detailFromV1(error)}`,
    );
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function assertPinnedDirectoryV1(directory: PinnedDirectoryV1, label: string): Promise<void> {
  await assertPinnedDirectoryAtPathV1(directory, directory.path, directory.realPath, label);
}

async function assertPinnedDirectoryAtPathV1(
  directory: PinnedDirectoryV1,
  path: string,
  expectedRealPath: string,
  label: string,
): Promise<void> {
  const [handleMetadata, pathMetadata, actualRealPath] = await Promise.all([
    directory.handle.stat(),
    lstat(path),
    realpath(path),
  ]);
  if (
    !handleMetadata.isDirectory() ||
    pathMetadata.isSymbolicLink() ||
    !pathMetadata.isDirectory() ||
    handleMetadata.dev !== directory.dev ||
    handleMetadata.ino !== directory.ino ||
    pathMetadata.dev !== directory.dev ||
    pathMetadata.ino !== directory.ino ||
    actualRealPath !== expectedRealPath
  ) {
    failV1("release.artifact_target_changed", `${label} authority changed`);
  }
}

async function closePinnedDirectoryV1(directory: PinnedDirectoryV1): Promise<void> {
  await directory.handle.close().catch(() => undefined);
}

async function readPinnedFileInDirectoryV1(
  directory: PinnedDirectoryV1,
  name: string,
  label: string,
): Promise<Uint8Array> {
  if (name.length === 0 || name.includes("/") || name.includes("\\")) {
    failV1("release.invalid_artifact_target", `${label} path is invalid`);
  }
  await assertPinnedDirectoryV1(directory, label);
  const path = resolve(directory.path, name);
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const [handleMetadata, pathMetadata, actualRealPath] = await Promise.all([
      handle.stat(),
      lstat(path),
      realpath(path),
    ]);
    if (
      !handleMetadata.isFile() ||
      pathMetadata.isSymbolicLink() ||
      !pathMetadata.isFile() ||
      handleMetadata.dev !== pathMetadata.dev ||
      handleMetadata.ino !== pathMetadata.ino ||
      actualRealPath !== resolve(directory.realPath, name)
    ) {
      failV1("release.invalid_artifact_target", `${label} is not pinned`);
    }
    const bytes = await handle.readFile();
    await assertPinnedDirectoryV1(directory, label);
    return bytes;
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function writePinnedFileInDirectoryV1(
  directory: PinnedDirectoryV1,
  name: string,
  bytes: Uint8Array,
  label: string,
): Promise<void> {
  if (name.length === 0 || name.includes("/") || name.includes("\\")) {
    failV1("release.invalid_artifact_target", `${label} path is invalid`);
  }
  const target = resolve(directory.path, name);
  const candidateName = `${name}.candidate-${process.pid}-${randomUUID()}`;
  const candidate = resolve(directory.path, candidateName);
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  let candidateInstalled = false;
  try {
    await assertPinnedDirectoryV1(directory, label);
    handle = await open(candidate, "wx", 0o644);
    await handle.writeFile(bytes);
    await handle.sync();
    await assertPinnedDirectoryV1(directory, label);
    const [handleMetadata, candidateMetadata, candidateRealPath] = await Promise.all([
      handle.stat(),
      lstat(candidate),
      realpath(candidate),
    ]);
    if (
      !handleMetadata.isFile() ||
      candidateMetadata.isSymbolicLink() ||
      !candidateMetadata.isFile() ||
      handleMetadata.dev !== candidateMetadata.dev ||
      handleMetadata.ino !== candidateMetadata.ino ||
      candidateRealPath !== resolve(directory.realPath, candidateName)
    ) {
      failV1("release.invalid_artifact_target", `${label} candidate is not pinned`);
    }
    const targetMetadata = await lstat(target).catch((error) => {
      if (isMissingPathV1(error)) return undefined;
      throw error;
    });
    if (
      targetMetadata !== undefined &&
      (targetMetadata.isSymbolicLink() || !targetMetadata.isFile())
    ) {
      failV1("release.invalid_artifact_target", `${label} target is unsafe`);
    }
    await rename(candidate, target);
    candidateInstalled = true;
    const [installedMetadata, installedRealPath] = await Promise.all([
      lstat(target),
      realpath(target),
    ]);
    if (
      installedMetadata.isSymbolicLink() ||
      !installedMetadata.isFile() ||
      installedMetadata.dev !== handleMetadata.dev ||
      installedMetadata.ino !== handleMetadata.ino ||
      installedRealPath !== resolve(directory.realPath, name)
    ) {
      failV1("release.invalid_artifact_target", `${label} target changed during installation`);
    }
    await directory.handle.sync();
  } finally {
    await handle?.close().catch(() => undefined);
    if (!candidateInstalled) {
      await assertPinnedDirectoryV1(directory, label)
        .then(() => rm(candidate, { force: true }))
        .catch(() => undefined);
    }
  }
}

function assertRepositoryChildV1(repositoryRoot: string, path: string, label: string): void {
  const repository = resolve(repositoryRoot);
  const child = resolve(path);
  const relativePath = relative(repository, child);
  if (
    relativePath.length === 0 ||
    relativePath.startsWith(`..${sep}`) ||
    relativePath === ".." ||
    isAbsolute(relativePath)
  ) {
    failV1("release.invalid_artifact_target", `${label} must stay inside the repository`);
  }
}

function assertPrivateArtifactWorkspaceV1(
  repositoryRoot: string,
  workspace: ArtifactBuildWorkspaceV1,
): void {
  if (
    !isPlainObjectV1(workspace) ||
    !exactOwnKeysV1(workspace, ["outputRoot"]) ||
    typeof workspace.outputRoot !== "string"
  ) {
    failV1("release.invalid_artifact_target", "Artifact workspace is invalid");
  }
  assertRepositoryChildV1(repositoryRoot, workspace.outputRoot, "Artifact workspace");
  const workspaceRelative = relative(resolve(repositoryRoot), resolve(workspace.outputRoot));
  const parts = workspaceRelative.split(sep);
  if (
    parts.length !== 3 ||
    parts[0] !== ".project-tavern" ||
    parts[1] !== "artifact-builds" ||
    parts[2]?.length === 0
  ) {
    failV1(
      "release.invalid_artifact_target",
      "Artifact workspace must be one private build candidate",
    );
  }
}

async function createArtifactWorkspaceV1(input: {
  readonly config: ArtifactBuildConfigV1;
  readonly repositoryRoot: string;
}): Promise<ArtifactBuildWorkspaceV1> {
  if (resolve(input.repositoryRoot) !== repositoryRootV1) {
    failV1("release.invalid_build_request", "repository root override is forbidden");
  }
  const repository = await capturePinnedDirectoryV1(input.repositoryRoot, "repository root");
  let privateRoot: PinnedDirectoryV1 | undefined;
  let parent: PinnedDirectoryV1 | undefined;
  let candidate: PinnedDirectoryV1 | undefined;
  let candidatePath: string | undefined;
  try {
    const privateRootPath = resolve(input.repositoryRoot, ".project-tavern");
    privateRoot = await capturePinnedDirectoryV1(privateRootPath, "private Artifact root");
    if (privateRoot.realPath !== resolve(repository.realPath, ".project-tavern")) {
      failV1("release.invalid_artifact_target", "private Artifact root escapes the repository");
    }
    const parentPath = resolve(privateRootPath, "artifact-builds");
    await mkdir(parentPath, { mode: 0o700, recursive: true });
    await assertPinnedDirectoryV1(repository, "repository root");
    await assertPinnedDirectoryV1(privateRoot, "private Artifact root");
    parent = await capturePinnedDirectoryV1(parentPath, "private Artifact build parent");
    if (parent.realPath !== resolve(privateRoot.realPath, "artifact-builds")) {
      failV1("release.invalid_artifact_target", "private Artifact build parent escaped");
    }
    await assertPinnedDirectoryV1(privateRoot, "private Artifact root");
    candidatePath = await mkdtemp(resolve(parent.path, `${input.config.applicationId}-`));
    candidate = await capturePinnedDirectoryV1(candidatePath, "private Artifact candidate");
    const candidateName = relative(parent.path, candidate.path);
    if (
      candidateName.length === 0 ||
      candidateName.includes(sep) ||
      candidate.realPath !== resolve(parent.realPath, candidateName)
    ) {
      failV1("release.invalid_artifact_target", "private Artifact candidate escaped");
    }
    const workspace = Object.freeze({ outputRoot: candidate.path });
    nodeWorkspaceAuthoritiesV1.set(
      workspace,
      Object.freeze({
        candidate,
        finalOutputRoot: resolve(input.repositoryRoot, input.config.outDir),
        parent,
      }),
    );
    const authority = nodeWorkspaceAuthoritiesV1.get(workspace);
    if (authority === undefined || nodeWorkspaceAuthoritiesByPathV1.has(candidate.path)) {
      nodeWorkspaceAuthoritiesV1.delete(workspace);
      failV1("release.invalid_artifact_target", "private Artifact workspace registration failed");
    }
    nodeWorkspaceAuthoritiesByPathV1.set(candidate.path, authority);
    candidate = undefined;
    parent = undefined;
    candidatePath = undefined;
    return workspace;
  } catch (error) {
    let cleanupError: unknown;
    if (candidatePath !== undefined && parent !== undefined) {
      if (candidate !== undefined) {
        await closePinnedDirectoryV1(candidate);
        candidate = undefined;
      }
      try {
        await assertPinnedDirectoryV1(parent, "private Artifact build parent");
        await rm(candidatePath, { force: true, recursive: true });
        await parent.handle.sync();
      } catch (caught) {
        cleanupError = caught;
      }
    }
    if (cleanupError !== undefined) {
      failV1(
        "release.artifact_candidate_cleanup_failed",
        `${detailFromV1(error)}; cleanup: ${detailFromV1(cleanupError)}`,
      );
    }
    throw error;
  } finally {
    await closePinnedDirectoryV1(repository);
    if (privateRoot !== undefined) await closePinnedDirectoryV1(privateRoot);
    if (candidate !== undefined) await closePinnedDirectoryV1(candidate);
    if (parent !== undefined) await closePinnedDirectoryV1(parent);
  }
}

function expectNodeWorkspaceAuthorityV1(
  workspace: ArtifactBuildWorkspaceV1,
): NodeArtifactBuildWorkspaceAuthorityV1 {
  const authority = nodeWorkspaceAuthoritiesV1.get(workspace);
  if (
    authority === undefined ||
    workspace.outputRoot !== authority.candidate.path ||
    nodeWorkspaceAuthoritiesByPathV1.get(workspace.outputRoot) !== authority
  ) {
    failV1("release.invalid_artifact_target", "Artifact workspace authority is invalid");
  }
  return authority;
}

function expectNodeWorkspaceAuthorityAtPathV1(
  outputRoot: string,
): NodeArtifactBuildWorkspaceAuthorityV1 {
  const path = resolve(outputRoot);
  const authority = nodeWorkspaceAuthoritiesByPathV1.get(path);
  if (authority === undefined || authority.candidate.path !== path) {
    failV1(
      "release.invalid_artifact_target",
      "private Artifact candidate authority is unavailable",
    );
  }
  return authority;
}

async function discardArtifactWorkspaceV1(input: {
  readonly config: ArtifactBuildConfigV1;
  readonly repositoryRoot: string;
  readonly workspace: ArtifactBuildWorkspaceV1;
}): Promise<void> {
  const authority = expectNodeWorkspaceAuthorityV1(input.workspace);
  nodeWorkspaceAuthoritiesV1.delete(input.workspace);
  nodeWorkspaceAuthoritiesByPathV1.delete(authority.candidate.path);
  try {
    await assertPinnedDirectoryV1(authority.parent, "private Artifact build parent");
    await assertPinnedDirectoryV1(authority.candidate, "private Artifact candidate");
    await closePinnedDirectoryV1(authority.candidate);
    await rm(authority.candidate.path, { force: true, recursive: true });
    await authority.parent.handle.sync();
  } finally {
    await closePinnedDirectoryV1(authority.candidate);
    await closePinnedDirectoryV1(authority.parent);
  }
}

async function publishArtifactWorkspaceV1(input: {
  readonly config: ArtifactBuildConfigV1;
  readonly repositoryRoot: string;
  readonly workspace: ArtifactBuildWorkspaceV1;
}): Promise<void> {
  const authority = expectNodeWorkspaceAuthorityV1(input.workspace);
  if (
    resolve(input.repositoryRoot) !== repositoryRootV1 ||
    authority.finalOutputRoot !== resolve(input.repositoryRoot, input.config.outDir)
  ) {
    failV1("release.invalid_artifact_target", "Artifact publication target is invalid");
  }
  assertRepositoryChildV1(input.repositoryRoot, authority.finalOutputRoot, "Artifact output");
  const repository = await capturePinnedDirectoryV1(input.repositoryRoot, "repository root");
  let outputParent: PinnedDirectoryV1 | undefined;
  let previous: PinnedDirectoryV1 | undefined;
  let backupPath: string | undefined;
  let previousMoved = false;
  let candidateMoved = false;
  try {
    await assertPinnedDirectoryV1(authority.parent, "private Artifact build parent");
    await assertPinnedDirectoryV1(authority.candidate, "private Artifact candidate");
    const outputParentPath = dirname(authority.finalOutputRoot);
    await mkdir(outputParentPath, { recursive: true });
    await assertPinnedDirectoryV1(repository, "repository root");
    outputParent = await capturePinnedDirectoryV1(outputParentPath, "Artifact output parent");
    const outputParentRelative = relative(repository.path, outputParent.path);
    if (
      outputParentRelative.length === 0 ||
      outputParentRelative.startsWith(`..${sep}`) ||
      outputParentRelative === ".." ||
      outputParent.realPath !== resolve(repository.realPath, outputParentRelative)
    ) {
      failV1("release.invalid_artifact_target", "Artifact output parent escaped the repository");
    }
    if (authority.candidate.dev !== outputParent.dev) {
      failV1(
        "release.invalid_artifact_target",
        "private Artifact candidate and final parent must share one filesystem",
      );
    }
    const existingMetadata = await lstat(authority.finalOutputRoot).catch((error) => {
      if (isMissingPathV1(error)) return undefined;
      throw error;
    });
    if (existingMetadata !== undefined) {
      if (existingMetadata.isSymbolicLink() || !existingMetadata.isDirectory()) {
        failV1("release.invalid_artifact_target", "existing Artifact output is unsafe");
      }
      previous = await capturePinnedDirectoryV1(
        authority.finalOutputRoot,
        "existing Artifact output",
      );
      backupPath = `${authority.finalOutputRoot}.previous-${process.pid}-${randomUUID()}`;
      await rename(authority.finalOutputRoot, backupPath);
      previousMoved = true;
      await assertPinnedDirectoryAtPathV1(
        previous,
        backupPath,
        resolve(outputParent.realPath, relative(outputParent.path, backupPath)),
        "previous Artifact output",
      );
    }
    await assertPinnedDirectoryV1(outputParent, "Artifact output parent");
    await assertPinnedDirectoryV1(authority.candidate, "private Artifact candidate");
    await rename(authority.candidate.path, authority.finalOutputRoot);
    candidateMoved = true;
    await assertPinnedDirectoryV1(outputParent, "Artifact output parent");
    await assertPinnedDirectoryAtPathV1(
      authority.candidate,
      authority.finalOutputRoot,
      resolve(outputParent.realPath, relative(outputParent.path, authority.finalOutputRoot)),
      "published Artifact output",
    );
    await Promise.all([outputParent.handle.sync(), authority.parent.handle.sync()]);
    await assertPinnedDirectoryV1(outputParent, "Artifact output parent");
    await assertPinnedDirectoryV1(repository, "repository root");
    nodeWorkspaceAuthoritiesV1.delete(input.workspace);
    nodeWorkspaceAuthoritiesByPathV1.delete(authority.candidate.path);
    candidateMoved = false;
    previousMoved = false;
    if (previous !== undefined && backupPath !== undefined) {
      await closePinnedDirectoryV1(previous);
      previous = undefined;
      const removed = await rm(backupPath, { force: true, recursive: true })
        .then(() => true)
        .catch(() => false);
      if (removed) await outputParent.handle.sync().catch(() => undefined);
    }
  } catch (error) {
    const rollbackErrors: string[] = [];
    if (candidateMoved) {
      try {
        await rename(authority.finalOutputRoot, authority.candidate.path);
        candidateMoved = false;
        await assertPinnedDirectoryV1(authority.candidate, "rolled-back Artifact candidate");
        await assertPinnedDirectoryV1(authority.parent, "private Artifact build parent");
      } catch (rollbackError) {
        rollbackErrors.push(`candidate: ${detailFromV1(rollbackError)}`);
      }
    }
    if (previousMoved && backupPath !== undefined) {
      try {
        await rename(backupPath, authority.finalOutputRoot);
        previousMoved = false;
        if (previous === undefined || outputParent === undefined) {
          failV1("release.artifact_publish_rollback_failed", "previous authority is unavailable");
        }
        await assertPinnedDirectoryV1(outputParent, "Artifact output parent");
        await assertPinnedDirectoryAtPathV1(
          previous,
          authority.finalOutputRoot,
          resolve(outputParent.realPath, relative(outputParent.path, authority.finalOutputRoot)),
          "restored Artifact output",
        );
      } catch (rollbackError) {
        rollbackErrors.push(`previous: ${detailFromV1(rollbackError)}`);
      }
    }
    try {
      await Promise.all([
        authority.parent.handle.sync(),
        ...(outputParent === undefined ? [] : [outputParent.handle.sync()]),
      ]);
    } catch (rollbackError) {
      rollbackErrors.push(`fsync: ${detailFromV1(rollbackError)}`);
    }
    if (rollbackErrors.length > 0) {
      nodeWorkspaceAuthoritiesV1.delete(input.workspace);
      nodeWorkspaceAuthoritiesByPathV1.delete(authority.candidate.path);
      failV1(
        "release.artifact_publish_rollback_failed",
        `${detailFromV1(error)}; ${rollbackErrors.join("; ")}`,
      );
    }
    throw error;
  } finally {
    await closePinnedDirectoryV1(repository);
    if (outputParent !== undefined) await closePinnedDirectoryV1(outputParent);
    if (previous !== undefined) await closePinnedDirectoryV1(previous);
    if (!nodeWorkspaceAuthoritiesV1.has(input.workspace)) {
      await closePinnedDirectoryV1(authority.candidate);
      await closePinnedDirectoryV1(authority.parent);
    }
  }
}

export async function inspectArtifactOutputBoundaryV1(
  repositoryRoot: string,
  config: ArtifactBuildConfigV1,
  requireOutput: boolean,
): Promise<ArtifactOutputBoundaryV1> {
  const root = resolve(repositoryRoot);
  const rootMetadata = await lstat(root).catch((error) =>
    failV1(
      "release.invalid_artifact_target",
      `repository root is unavailable: ${detailFromV1(error)}`,
    ),
  );
  if (rootMetadata.isSymbolicLink() || !rootMetadata.isDirectory()) {
    failV1("release.invalid_artifact_target", "repository root must be a real directory");
  }
  const realRoot = await realpath(root);
  const entries: ArtifactOutputBoundaryEntryV1[] = [
    Object.freeze({
      dev: rootMetadata.dev,
      ino: rootMetadata.ino,
      path: root,
      realPath: realRoot,
    }),
  ];
  let current = root;
  let expectedRealPath = realRoot;
  const parts = config.outDir.split("/");
  for (const [index, part] of parts.entries()) {
    current = resolve(current, part);
    expectedRealPath = resolve(expectedRealPath, part);
    let metadata: Awaited<ReturnType<typeof lstat>>;
    try {
      metadata = await lstat(current);
    } catch (error) {
      if (isMissingPathV1(error) && !requireOutput) break;
      return failV1("release.invalid_artifact_target", `${config.outDir} is unavailable`);
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      failV1("release.invalid_artifact_target", `${config.outDir} has an unsafe ancestor`);
    }
    const actualRealPath = await realpath(current);
    if (actualRealPath !== expectedRealPath) {
      failV1("release.invalid_artifact_target", `${config.outDir} escapes the repository root`);
    }
    entries.push(
      Object.freeze({
        dev: metadata.dev,
        ino: metadata.ino,
        path: current,
        realPath: actualRealPath,
      }),
    );
    if (requireOutput && index === parts.length - 1 && current !== resolve(root, config.outDir)) {
      failV1("release.invalid_artifact_target", `${config.outDir} is not the selected output`);
    }
  }
  if (requireOutput && entries.length !== parts.length + 1) {
    failV1("release.invalid_artifact_target", `${config.outDir} is unavailable`);
  }
  return Object.freeze({
    entries: Object.freeze(entries),
    outputRoot: resolve(root, config.outDir),
  });
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
    const relativePath = absolute.slice(input.repositoryRoot.length + 1);
    if (absolute === input.repositoryRoot || relativePath.startsWith(`..${sep}`)) {
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
  readonly outputRoot: string;
  readonly repositoryRoot: string;
}): Promise<void> {
  if (resolve(input.repositoryRoot) !== repositoryRootV1) {
    failV1("release.invalid_build_request", "repository root override is forbidden");
  }
  const outputRoot = resolve(input.outputRoot);
  assertRepositoryChildV1(input.repositoryRoot, outputRoot, "private Artifact candidate");
  const candidate = expectNodeWorkspaceAuthorityAtPathV1(outputRoot).candidate;
  await assertPinnedDirectoryV1(candidate, "private Artifact candidate");
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
  const plugins = Reflect.get(viteConfig, "plugins");
  if (!Array.isArray(plugins)) {
    failV1("release.invalid_build_config", "closed Vite plugins are unavailable");
  }
  const expectedClosedOutput = resolve(input.repositoryRoot, input.config.outDir);
  const privateOutputPlugin = Object.freeze({
    name: "project-tavern-private-artifact-candidate",
    configResolved(resolvedConfig: {
      readonly root: string;
      readonly build: { readonly outDir: string };
      readonly environments?: unknown;
    }) {
      if (resolve(resolvedConfig.root, resolvedConfig.build.outDir) !== expectedClosedOutput) {
        failV1("release.invalid_build_config", "closed Vite output authority changed");
      }
      const environments = Reflect.get(Object(resolvedConfig), "environments");
      const client = Reflect.get(Object(environments), "client");
      const clientBuild = Reflect.get(Object(client), "build");
      const clientOutDir = Reflect.get(Object(clientBuild), "outDir");
      const rollupOptions = Reflect.get(Object(clientBuild), "rollupOptions");
      const rollupOutput = Reflect.get(Object(rollupOptions), "output");
      const rolldownOptions = Reflect.get(Object(clientBuild), "rolldownOptions");
      const rolldownOutput = Reflect.get(Object(rolldownOptions), "output");
      const hasOutputOverride = (value: unknown): boolean =>
        value !== undefined &&
        (Array.isArray(value) ||
          Reflect.get(Object(value), "dir") !== undefined ||
          Reflect.get(Object(value), "file") !== undefined);
      if (
        typeof clientOutDir !== "string" ||
        resolve(resolvedConfig.root, clientOutDir) !== expectedClosedOutput ||
        hasOutputOverride(rollupOutput) ||
        hasOutputOverride(rolldownOutput)
      ) {
        failV1("release.invalid_build_config", "client Vite output authority changed");
      }
      Reflect.set(resolvedConfig.build, "outDir", outputRoot);
      Reflect.set(clientBuild, "outDir", outputRoot);
    },
  });
  await build({
    ...viteConfig,
    configFile: false,
    mode: input.config.viteMode,
    plugins: [...plugins, privateOutputPlugin],
  });
  await assertPinnedDirectoryV1(candidate, "private Artifact candidate");
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
  readonly outputRoot: string;
  readonly repositoryRoot: string;
}): Promise<Uint8Array> {
  assertRepositoryChildV1(input.repositoryRoot, input.outputRoot, "Artifact candidate");
  const directory = expectNodeWorkspaceAuthorityAtPathV1(input.outputRoot).candidate;
  const bytes = await readPinnedFileInDirectoryV1(
    directory,
    "source-graph.v1.json",
    "source graph",
  );
  validateSourceGraphBytesV1(bytes, input.config);
  return bytes;
}

async function writeBuildInputV1(input: {
  readonly bytes: Uint8Array;
  readonly config: ArtifactBuildConfigV1;
  readonly outputRoot: string;
  readonly repositoryRoot: string;
}): Promise<void> {
  assertRepositoryChildV1(input.repositoryRoot, input.outputRoot, "Artifact candidate");
  const directory = expectNodeWorkspaceAuthorityAtPathV1(input.outputRoot).candidate;
  await writePinnedFileInDirectoryV1(directory, "build-input.json", input.bytes, "build-input");
}

async function finalizePocArtifactV1(input: {
  readonly buildInput: ArtifactBuildInputV1;
  readonly config: ArtifactBuildConfigV1;
  readonly outputRoot: string;
  readonly repositoryRoot: string;
}): Promise<void> {
  if (input.config.story !== "poc") {
    failV1("release.invalid_build_request", "only the PoC Artifact has release postprocessing");
  }
  assertRepositoryChildV1(input.repositoryRoot, input.outputRoot, "Artifact candidate");
  const candidate = expectNodeWorkspaceAuthorityAtPathV1(input.outputRoot).candidate;
  const [prepareModule, verifierModule] = await Promise.all([
    import(new URL("../prepare-artifact.mjs", import.meta.url).href) as Promise<unknown>,
    import(new URL("./verify-poc-artifact.mts", import.meta.url).href) as Promise<
      typeof import("./verify-poc-artifact.mjs")
    >,
  ]);
  const prepareArtifactDirectory = Reflect.get(Object(prepareModule), "prepareArtifactDirectoryV1");
  if (typeof prepareArtifactDirectory !== "function") {
    failV1("release.artifact_preparation_unavailable", "Artifact preparer is unavailable");
  }
  await prepareArtifactDirectory(input.repositoryRoot, candidate.path, {
    dev: candidate.dev,
    ino: candidate.ino,
  });
  await assertPinnedDirectoryV1(candidate, "Artifact candidate");
  await verifierModule.verifyPocArtifactV1(candidate.path, {
    allowDevelopment: input.buildInput.provenanceMode === "development",
  });
  await assertPinnedDirectoryV1(candidate, "Artifact candidate");
}

function createNodeArtifactBuildPortsV1(): ArtifactBuildPortsV1 {
  return Object.freeze({
    repositoryRoot: repositoryRootV1,
    collectBuildIdentity: collectBuildIdentityV1,
    createWorkspace: createArtifactWorkspaceV1,
    discardWorkspace: discardArtifactWorkspaceV1,
    finalizePocArtifact: finalizePocArtifactV1,
    inspectSource: inspectGitSourceV1,
    publishWorkspace: publishArtifactWorkspaceV1,
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
  options: ArtifactBuildOptionsV1 = {},
): Promise<ArtifactBuildInputV1> {
  if (
    !isPlainObjectV1(options) ||
    !exactOwnKeysV1(options, options.requireClean === undefined ? [] : ["requireClean"]) ||
    (options.requireClean !== undefined && typeof options.requireClean !== "boolean")
  ) {
    failV1("release.invalid_build_request", "build options are invalid");
  }
  const config = resolveArtifactBuildConfigV1(request);
  const workspacePorts = [
    ports.createWorkspace,
    ports.discardWorkspace,
    ports.publishWorkspace,
  ].filter((value) => value !== undefined).length;
  if (workspacePorts !== 0 && workspacePorts !== 3) {
    failV1("release.invalid_build_request", "Artifact workspace ports must be complete");
  }
  let workspace: ArtifactBuildWorkspaceV1 | undefined;
  let published = false;
  try {
    const sourceBefore = await ports.inspectSource(ports.repositoryRoot);
    if (options.requireClean === true && sourceBefore.provenanceMode !== "clean_commit") {
      failV1("release.clean_source_required", "release preparation requires a clean source");
    }
    const [buildIdentity, materialization, tools] = await Promise.all([
      ports.collectBuildIdentity(config),
      ports.readMaterialization(ports.repositoryRoot),
      ports.readToolVersions(ports.repositoryRoot),
    ]);
    const identities = await ports.resolveIdentities(config, buildIdentity);
    workspace =
      ports.createWorkspace === undefined
        ? Object.freeze({
            outputRoot: resolve(
              ports.repositoryRoot,
              ".project-tavern",
              "artifact-builds",
              `${config.applicationId}-port-${randomUUID()}`,
            ),
          })
        : await ports.createWorkspace({ config, repositoryRoot: ports.repositoryRoot });
    assertPrivateArtifactWorkspaceV1(ports.repositoryRoot, workspace);
    await ports.runViteBuild({
      buildIdentity,
      config,
      outputRoot: workspace.outputRoot,
      repositoryRoot: ports.repositoryRoot,
    });
    const sourceGraphBytes = await ports.readSourceGraphBytes({
      config,
      outputRoot: workspace.outputRoot,
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
      outputRoot: workspace.outputRoot,
      repositoryRoot: ports.repositoryRoot,
    });
    if (config.story === "poc" && ports.finalizePocArtifact !== undefined) {
      await ports.finalizePocArtifact({
        buildInput: input,
        config,
        outputRoot: workspace.outputRoot,
        repositoryRoot: ports.repositoryRoot,
      });
    }
    if (
      ports.publishWorkspace !== undefined ||
      (config.story === "poc" && ports.finalizePocArtifact !== undefined)
    ) {
      const sourceFinal = await ports.inspectSource(ports.repositoryRoot);
      if (!sameSourceIdentityV1(sourceAfter, sourceFinal)) {
        failV1("release.source_changed", "source identity changed before Artifact publication");
      }
    }
    if (ports.publishWorkspace !== undefined) {
      await ports.publishWorkspace({ config, repositoryRoot: ports.repositoryRoot, workspace });
      published = true;
    }
    return input;
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message.startsWith("release.artifact_publish_rollback_failed:")
    ) {
      throw error;
    }
    if (!published && workspace !== undefined && ports.discardWorkspace !== undefined) {
      try {
        await ports.discardWorkspace({
          config,
          repositoryRoot: ports.repositoryRoot,
          workspace,
        });
      } catch (discardError) {
        failV1(
          "release.artifact_candidate_cleanup_failed",
          `${detailFromV1(error)}; cleanup: ${detailFromV1(discardError)}`,
        );
      }
    }
    throw error;
  }
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

export function parseArtifactBuildCliArgumentsV1(args: readonly string[]): {
  readonly request: ArtifactBuildRequestV1;
  readonly requireClean: boolean;
} {
  const requireClean = args.length === 7 && args[6] === "--require-clean";
  if (args.length !== 6 && !requireClean) {
    failV1("release.invalid_build_request", "unexpected build arguments");
  }
  const request = parseArtifactBuildArgumentsV1(args.slice(0, 6));
  if (requireClean && request.story !== "poc") {
    failV1("release.invalid_build_request", "clean release preparation is PoC-only");
  }
  return Object.freeze({ request, requireClean });
}

const isMainV1 =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainV1) {
  try {
    const { request, requireClean } = parseArtifactBuildCliArgumentsV1(process.argv.slice(2));
    const result = await buildArtifactV1(request, undefined, { requireClean });
    console.log(
      `built ${result.applicationId} ${result.provenanceMode} ${result.sourceGraphDigest}`,
    );
  } catch (error) {
    console.error(detailFromV1(error));
    process.exitCode = 1;
  }
}
