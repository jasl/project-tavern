// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { open, lstat, readdir, realpath, rename, rm } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

type DigestV1 = `sha256:${string}`;

export interface ArtifactManifestEntryV1 {
  readonly byteLength: number;
  readonly digest: DigestV1;
  readonly path: string;
}

export interface ArtifactManifestV1 {
  readonly base: "./";
  readonly files: readonly ArtifactManifestEntryV1[];
  readonly schemaRevision: 1;
}

export interface ArtifactRootIdentityV1 {
  readonly dev: number;
  readonly ino: number;
}

export const artifactManifestFileV1 = "artifact-manifest.json";
export const legacyArtifactManifestFileV1 = "artifact-manifest.v1.json";

const excludedManifestPathsV1 = new Set([artifactManifestFileV1]);
const encoderV1 = new TextEncoder();

interface ArtifactRootAuthorityV1 {
  readonly dev: number;
  readonly handle: Awaited<ReturnType<typeof open>>;
  readonly ino: number;
  readonly path: string;
  readonly realPath: string;
}

function compareTextV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failV1(detail: string): never {
  throw new TypeError(`release.invalid_artifact_payload: ${detail}`);
}

function detailFromV1(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function assertValidStringV1(value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (index + 1 >= value.length || next < 0xdc00 || next > 0xdfff) {
        failV1("manifest contains a lone surrogate");
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      failV1("manifest contains a lone surrogate");
    }
  }
}

function compareCodePointsV1(left: string, right: string): number {
  const leftPoints = Array.from(left, (value) => value.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (value) => value.codePointAt(0) ?? 0);
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}

function canonicalJsonTextV1(value: unknown, active = new Set<object>()): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") {
    assertValidStringV1(value);
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
      failV1("manifest contains a noncanonical number");
    }
    return JSON.stringify(value);
  }
  if (typeof value !== "object" || active.has(value)) {
    return failV1("manifest is not canonical JSON data");
  }
  active.add(value);
  try {
    if (Array.isArray(value)) {
      const entries: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) failV1("manifest contains a sparse array");
        entries.push(canonicalJsonTextV1(value[index], active));
      }
      return `[${entries.join(",")}]`;
    }
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      return failV1("manifest contains a non-plain object");
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const entries = Object.keys(descriptors)
      .sort(compareCodePointsV1)
      .map((key) => {
        const descriptor = descriptors[key];
        if (
          descriptor === undefined ||
          descriptor.get !== undefined ||
          descriptor.set !== undefined
        ) {
          return failV1("manifest contains an accessor");
        }
        assertValidStringV1(key);
        return `${JSON.stringify(key)}:${canonicalJsonTextV1(descriptor.value, active)}`;
      });
    return `{${entries.join(",")}}`;
  } finally {
    active.delete(value);
  }
}

export function canonicalArtifactJsonBytesV1(value: unknown): Uint8Array {
  return encoderV1.encode(canonicalJsonTextV1(value));
}

function digestBytesV1(bytes: Uint8Array): DigestV1 {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function toPosixRelativePathV1(root: string, absolutePath: string): string {
  const path = relative(root, absolutePath).split(sep).join("/");
  if (
    path.length === 0 ||
    path.includes("\\") ||
    path.startsWith("/") ||
    isAbsolute(path) ||
    path.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    failV1("payload path escaped the Artifact root");
  }
  return path;
}

async function resolveArtifactRootV1(
  root: string,
  expectedIdentity?: ArtifactRootIdentityV1,
): Promise<ArtifactRootAuthorityV1> {
  const absoluteRoot = resolve(root);
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(absoluteRoot, constants.O_RDONLY | constants.O_NOFOLLOW);
    const [handleMetadata, pathMetadata, actualRealPath] = await Promise.all([
      handle.stat(),
      lstat(absoluteRoot),
      realpath(absoluteRoot),
    ]);
    if (
      !handleMetadata.isDirectory() ||
      pathMetadata.isSymbolicLink() ||
      !pathMetadata.isDirectory() ||
      handleMetadata.dev !== pathMetadata.dev ||
      handleMetadata.ino !== pathMetadata.ino
    ) {
      failV1("Artifact root must be a pinned real directory");
    }
    if (
      expectedIdentity !== undefined &&
      (handleMetadata.dev !== expectedIdentity.dev || handleMetadata.ino !== expectedIdentity.ino)
    ) {
      failV1("Artifact root identity changed before manifest publication");
    }
    const authority = Object.freeze({
      dev: handleMetadata.dev,
      handle,
      ino: handleMetadata.ino,
      path: absoluteRoot,
      realPath: actualRealPath,
    });
    handle = undefined;
    return authority;
  } catch (error) {
    if (error instanceof TypeError && error.message.startsWith("release.")) throw error;
    return failV1("Artifact root is unavailable");
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function assertArtifactRootUnchangedV1(authority: ArtifactRootAuthorityV1): Promise<void> {
  await assertArtifactRootAtPathV1(authority, authority.path, authority.realPath);
}

async function assertArtifactRootAtPathV1(
  authority: ArtifactRootAuthorityV1,
  path: string,
  expectedRealPath: string,
): Promise<void> {
  const [handleMetadata, pathMetadata, actualRealPath] = await Promise.all([
    authority.handle.stat(),
    lstat(path),
    realpath(path),
  ]);
  if (
    !handleMetadata.isDirectory() ||
    pathMetadata.isSymbolicLink() ||
    !pathMetadata.isDirectory() ||
    handleMetadata.dev !== authority.dev ||
    handleMetadata.ino !== authority.ino ||
    pathMetadata.dev !== authority.dev ||
    pathMetadata.ino !== authority.ino ||
    actualRealPath !== expectedRealPath
  ) {
    failV1("Artifact root authority changed");
  }
}

async function assertPinnedArtifactFileV1(
  authority: ArtifactRootAuthorityV1,
  handle: Awaited<ReturnType<typeof open>>,
  path: string,
  expectedRealPath: string,
  label: string,
): Promise<{ readonly dev: number; readonly ino: number }> {
  await assertArtifactRootUnchangedV1(authority);
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
    actualRealPath !== expectedRealPath
  ) {
    failV1(`${label} is not pinned inside the Artifact root`);
  }
  await assertArtifactRootUnchangedV1(authority);
  return Object.freeze({ dev: handleMetadata.dev, ino: handleMetadata.ino });
}

function assertNormalizedPayloadPathV1(path: string): readonly string[] {
  const parts = path.split("/");
  if (
    path.length === 0 ||
    path.includes("\\") ||
    path.startsWith("/") ||
    isAbsolute(path) ||
    parts.some((part) => part === "" || part === "." || part === "..")
  ) {
    failV1("payload path escaped the Artifact root");
  }
  return parts;
}

async function readArtifactPayloadBytesWithAuthorityV1(
  authority: ArtifactRootAuthorityV1,
  path: string,
): Promise<Uint8Array> {
  const parts = assertNormalizedPayloadPathV1(path);
  await assertArtifactRootUnchangedV1(authority);
  let parent = authority.path;
  let expectedRealParent = authority.realPath;
  for (const part of parts.slice(0, -1)) {
    parent = resolve(parent, part);
    expectedRealParent = resolve(expectedRealParent, part);
    const metadata = await lstat(parent).catch(() =>
      failV1(`payload parent is unavailable: ${path}`),
    );
    if (
      metadata.isSymbolicLink() ||
      !metadata.isDirectory() ||
      (await realpath(parent)) !== expectedRealParent
    ) {
      failV1(`payload parent is unsafe: ${path}`);
    }
  }
  const target = resolve(parent, parts.at(-1) as string);
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
    const [metadata, pathMetadata, realTarget] = await Promise.all([
      handle.stat(),
      lstat(target),
      realpath(target),
    ]);
    if (
      !metadata.isFile() ||
      pathMetadata.isSymbolicLink() ||
      !pathMetadata.isFile() ||
      metadata.dev !== pathMetadata.dev ||
      metadata.ino !== pathMetadata.ino ||
      realTarget !== resolve(authority.realPath, ...parts)
    ) {
      failV1(`payload is not pinned inside the Artifact root: ${path}`);
    }
    const bytes = await handle.readFile();
    const [afterHandleMetadata, afterPathMetadata, afterRealTarget] = await Promise.all([
      handle.stat(),
      lstat(target),
      realpath(target),
    ]);
    if (
      afterHandleMetadata.dev !== metadata.dev ||
      afterHandleMetadata.ino !== metadata.ino ||
      afterHandleMetadata.size !== metadata.size ||
      afterPathMetadata.isSymbolicLink() ||
      !afterPathMetadata.isFile() ||
      afterPathMetadata.dev !== metadata.dev ||
      afterPathMetadata.ino !== metadata.ino ||
      afterRealTarget !== resolve(authority.realPath, ...parts)
    ) {
      failV1(`payload changed during inspection: ${path}`);
    }
    await assertArtifactRootUnchangedV1(authority);
    return bytes;
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message.startsWith("release.invalid_artifact_payload:")
    ) {
      throw error;
    }
    return failV1(`payload is unavailable or unsafe: ${path}`);
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

export async function readArtifactPayloadBytesV1(root: string, path: string): Promise<Uint8Array> {
  const authority = await resolveArtifactRootV1(root);
  try {
    return await readArtifactPayloadBytesWithAuthorityV1(authority, path);
  } finally {
    await authority.handle.close().catch(() => undefined);
  }
}

async function listArtifactFilesWithAuthorityV1(
  authority: ArtifactRootAuthorityV1,
): Promise<readonly string[]> {
  const files: string[] = [];

  const walkV1 = async (directory: string): Promise<void> => {
    await assertArtifactRootUnchangedV1(authority);
    const directoryMetadata = await lstat(directory);
    const directoryRelative = relative(authority.path, directory);
    const expectedRealDirectory =
      directoryRelative.length === 0
        ? authority.realPath
        : resolve(authority.realPath, ...directoryRelative.split(sep));
    if (
      directoryMetadata.isSymbolicLink() ||
      !directoryMetadata.isDirectory() ||
      (await realpath(directory)) !== expectedRealDirectory
    ) {
      failV1("payload directory escaped the Artifact root");
    }
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => compareTextV1(left.name, right.name));
    for (const entry of entries) {
      const absolutePath = resolve(directory, entry.name);
      const path = toPosixRelativePathV1(authority.path, absolutePath);
      const metadata = await lstat(absolutePath);
      if (metadata.isSymbolicLink()) {
        failV1(`symbolic link is forbidden: ${path}`);
      }
      if (metadata.isDirectory()) {
        await walkV1(absolutePath);
      } else if (metadata.isFile()) {
        if (path === legacyArtifactManifestFileV1) {
          failV1("legacy manifest is a forbidden second authority");
        }
        if (!excludedManifestPathsV1.has(path)) files.push(path);
      } else {
        failV1(`unsupported non-file Artifact entry: ${path}`);
      }
    }
    await assertArtifactRootUnchangedV1(authority);
  };

  await walkV1(authority.path);
  return Object.freeze(files.sort(compareTextV1));
}

export async function listArtifactFilesV1(root: string): Promise<readonly string[]> {
  const authority = await resolveArtifactRootV1(root);
  try {
    return await listArtifactFilesWithAuthorityV1(authority);
  } finally {
    await authority.handle.close().catch(() => undefined);
  }
}

async function createArtifactManifestWithAuthorityV1(
  authority: ArtifactRootAuthorityV1,
): Promise<ArtifactManifestV1> {
  const paths = await listArtifactFilesWithAuthorityV1(authority);
  const files: ArtifactManifestEntryV1[] = [];
  for (const path of paths) {
    const bytes = await readArtifactPayloadBytesWithAuthorityV1(authority, path);
    files.push(
      Object.freeze({
        byteLength: bytes.byteLength,
        digest: digestBytesV1(bytes),
        path,
      }),
    );
  }
  const finalPaths = await listArtifactFilesWithAuthorityV1(authority);
  if (
    finalPaths.length !== paths.length ||
    finalPaths.some((path, index) => path !== paths[index])
  ) {
    failV1("Artifact payload set changed during manifest creation");
  }
  for (const entry of files) {
    const bytes = await readArtifactPayloadBytesWithAuthorityV1(authority, entry.path);
    if (bytes.byteLength !== entry.byteLength || digestBytesV1(bytes) !== entry.digest) {
      failV1(`payload changed during manifest creation: ${entry.path}`);
    }
  }
  return Object.freeze({
    base: "./",
    files: Object.freeze(files),
    schemaRevision: 1,
  });
}

export async function createArtifactManifestV1(root: string): Promise<ArtifactManifestV1> {
  const authority = await resolveArtifactRootV1(root);
  try {
    return await createArtifactManifestWithAuthorityV1(authority);
  } finally {
    await authority.handle.close().catch(() => undefined);
  }
}

export function artifactManifestBytesV1(manifest: ArtifactManifestV1): Uint8Array {
  return canonicalArtifactJsonBytesV1(manifest);
}

export async function writeArtifactManifestV1(
  root: string,
  expectedIdentity?: ArtifactRootIdentityV1,
): Promise<ArtifactManifestV1> {
  const authority = await resolveArtifactRootV1(root, expectedIdentity);
  const target = resolve(authority.path, artifactManifestFileV1);
  const candidate = `${target}.candidate-${process.pid}-${randomUUID()}`;
  const expectedRealCandidate = resolve(authority.realPath, relative(authority.path, candidate));
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  let installed = false;
  let failure: unknown;
  let result: ArtifactManifestV1 | undefined;
  try {
    const manifest = await createArtifactManifestWithAuthorityV1(authority);
    await assertArtifactRootUnchangedV1(authority);
    handle = await open(candidate, "wx", 0o644);
    await assertPinnedArtifactFileV1(
      authority,
      handle,
      candidate,
      expectedRealCandidate,
      "manifest candidate",
    );
    const bytes = artifactManifestBytesV1(manifest);
    await handle.writeFile(bytes);
    await handle.sync();
    const handleIdentity = await assertPinnedArtifactFileV1(
      authority,
      handle,
      candidate,
      expectedRealCandidate,
      "manifest candidate",
    );
    const targetMetadata = await lstat(target).catch((error) => {
      if (Reflect.get(Object(error), "code") === "ENOENT") return undefined;
      throw error;
    });
    if (
      targetMetadata !== undefined &&
      (targetMetadata.isSymbolicLink() || !targetMetadata.isFile())
    ) {
      failV1("manifest target is unsafe");
    }
    await rename(candidate, target);
    installed = true;
    const [installedMetadata, installedRealPath, installedBytes] = await Promise.all([
      lstat(target),
      realpath(target),
      readArtifactPayloadBytesWithAuthorityV1(authority, artifactManifestFileV1),
    ]);
    if (
      installedMetadata.isSymbolicLink() ||
      !installedMetadata.isFile() ||
      installedMetadata.dev !== handleIdentity.dev ||
      installedMetadata.ino !== handleIdentity.ino ||
      installedRealPath !== resolve(authority.realPath, artifactManifestFileV1) ||
      installedBytes.byteLength !== bytes.byteLength ||
      installedBytes.some((byte, index) => byte !== bytes[index])
    ) {
      failV1("manifest target changed during installation");
    }
    await authority.handle.sync();
    result = manifest;
  } catch (error) {
    failure = error;
  }
  let cleanupFailure: unknown;
  if (!installed && handle !== undefined) {
    try {
      await assertPinnedArtifactFileV1(
        authority,
        handle,
        candidate,
        expectedRealCandidate,
        "manifest candidate before cleanup",
      );
      await rm(candidate);
      await authority.handle.sync();
    } catch (error) {
      cleanupFailure = error;
    }
  }
  await handle?.close().catch(() => undefined);
  await authority.handle.close().catch(() => undefined);
  if (failure !== undefined && cleanupFailure !== undefined) {
    throw new TypeError(
      `${detailFromV1(failure)}; manifest candidate cleanup failed: ${detailFromV1(cleanupFailure)}`,
      { cause: new AggregateError([failure, cleanupFailure]) },
    );
  }
  if (failure !== undefined) throw failure;
  if (cleanupFailure !== undefined) throw cleanupFailure;
  if (result === undefined) return failV1("manifest publication produced no result");
  return result;
}

const isMainV1 =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainV1) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 1 || args[0] === undefined) {
      failV1("expected one Artifact directory");
    }
    const manifest = await writeArtifactManifestV1(args[0]);
    console.log(`wrote ${artifactManifestFileV1} with ${String(manifest.files.length)} files`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
