// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, realpath, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const projectLegalFilesV1 = Object.freeze([
  "LICENSE.md",
  "LICENSES/CC-BY-NC-SA-4.0.txt",
  "LICENSES/MIT.txt",
  "LICENSES/PolyForm-Noncommercial-1.0.0.txt",
  "NOTICE",
  "THIRD_PARTY_NOTICES.md",
  "TRADEMARKS.md",
]);

async function loadManifestModuleV1() {
  return await import(new URL("./release/create-artifact-manifest.mts", import.meta.url).href);
}

export async function listArtifactFilesV1(root) {
  const module = await loadManifestModuleV1();
  return await module.listArtifactFilesV1(root);
}

export async function createArtifactManifestV1(root) {
  const module = await loadManifestModuleV1();
  return await module.createArtifactManifestV1(root);
}

function isMissingV1(error) {
  return typeof error === "object" && error !== null && Reflect.get(error, "code") === "ENOENT";
}

function detailFromV1(error) {
  return error instanceof Error ? error.message : String(error);
}

async function captureArtifactRootV1(artifactRoot, expectedIdentity) {
  const path = resolve(artifactRoot);
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const [handleMetadata, pathMetadata, actualRealPath] = await Promise.all([
      handle.stat(),
      lstat(path),
      realpath(path),
    ]);
    if (
      !handleMetadata.isDirectory() ||
      pathMetadata.isSymbolicLink() ||
      !pathMetadata.isDirectory() ||
      handleMetadata.dev !== pathMetadata.dev ||
      handleMetadata.ino !== pathMetadata.ino
    ) {
      throw new TypeError(
        "release.invalid_artifact_target: Artifact root must be a pinned real directory",
      );
    }
    if (
      expectedIdentity !== undefined &&
      (handleMetadata.dev !== expectedIdentity.dev || handleMetadata.ino !== expectedIdentity.ino)
    ) {
      throw new TypeError(
        "release.invalid_artifact_target: Artifact root identity changed before preparation",
      );
    }
    const authority = Object.freeze({
      dev: handleMetadata.dev,
      handle,
      ino: handleMetadata.ino,
      path,
      realPath: actualRealPath,
    });
    handle = undefined;
    return authority;
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message.startsWith("release.invalid_artifact_target:")
    ) {
      throw error;
    }
    throw new TypeError(
      `release.invalid_artifact_target: Artifact root is unavailable: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function assertArtifactRootUnchangedV1(authority) {
  await assertArtifactRootAtPathV1(authority, authority.path, authority.realPath);
}

async function assertArtifactRootAtPathV1(authority, path, expectedRealPath) {
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
    throw new TypeError("release.invalid_artifact_target: Artifact root authority changed");
  }
}

async function requireSafeDirectoryV1(path, label) {
  const metadata = await lstat(path).catch((error) => {
    if (isMissingV1(error)) return undefined;
    throw error;
  });
  if (metadata === undefined) {
    await mkdir(path);
    const created = await lstat(path);
    if (created.isSymbolicLink() || !created.isDirectory()) {
      throw new TypeError(`release.invalid_artifact_target: ${label}`);
    }
    return;
  }
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
    throw new TypeError(`release.invalid_artifact_target: ${label}`);
  }
}

async function resolveSafeLegalTargetV1(authority, path) {
  await assertArtifactRootUnchangedV1(authority);
  const parts = path.split("/");
  let parent = authority.path;
  let expectedRealParent = authority.realPath;
  for (const part of parts.slice(0, -1)) {
    parent = resolve(parent, part);
    expectedRealParent = resolve(expectedRealParent, part);
    await requireSafeDirectoryV1(parent, path);
    if ((await realpath(parent)) !== expectedRealParent) {
      throw new TypeError(`release.invalid_artifact_target: ${path}`);
    }
  }
  const target = resolve(parent, parts.at(-1));
  const targetMetadata = await lstat(target).catch((error) => {
    if (isMissingV1(error)) return undefined;
    throw error;
  });
  if (
    targetMetadata !== undefined &&
    (targetMetadata.isSymbolicLink() || !targetMetadata.isFile())
  ) {
    throw new TypeError(`release.invalid_artifact_target: ${path}`);
  }
  await assertArtifactRootUnchangedV1(authority);
  return { expectedRealTarget: resolve(authority.realPath, ...parts), parent, target };
}

async function assertPinnedFilePathV1(handle, path, expectedRealPath, label) {
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
    throw new TypeError(`release.invalid_artifact_target: ${label}`);
  }
}

async function copyLegalFileNoFollowV1(
  bytes,
  target,
  expectedRealTarget,
  parent,
  path,
  rootAuthority,
) {
  const candidateSuffix = `.candidate-${process.pid}-${randomUUID()}`;
  const candidate = `${target}${candidateSuffix}`;
  const expectedRealCandidate = `${expectedRealTarget}${candidateSuffix}`;
  let candidateHandle;
  let failure;
  let installed = false;
  try {
    await assertArtifactRootUnchangedV1(rootAuthority);
    candidateHandle = await open(candidate, "wx", 0o644);
    await assertPinnedFilePathV1(candidateHandle, candidate, expectedRealCandidate, path);
    await candidateHandle.writeFile(bytes);
    await candidateHandle.sync();
    await requireSafeDirectoryV1(parent, path);
    if ((await realpath(parent)) !== dirname(expectedRealTarget)) {
      throw new TypeError(`release.invalid_artifact_target: ${path}`);
    }
    await assertPinnedFilePathV1(candidateHandle, candidate, expectedRealCandidate, path);
    const targetMetadata = await lstat(target).catch((error) => {
      if (isMissingV1(error)) return undefined;
      throw error;
    });
    if (
      targetMetadata !== undefined &&
      (targetMetadata.isSymbolicLink() || !targetMetadata.isFile())
    ) {
      throw new TypeError(`release.invalid_artifact_target: ${path}`);
    }
    await rename(candidate, target);
    installed = true;
    await assertPinnedFilePathV1(candidateHandle, target, expectedRealTarget, path);
    await assertArtifactRootUnchangedV1(rootAuthority);
  } catch (error) {
    failure = error;
  }
  let cleanupFailure;
  if (!installed && candidateHandle !== undefined) {
    try {
      await assertArtifactRootUnchangedV1(rootAuthority);
      await assertPinnedFilePathV1(candidateHandle, candidate, expectedRealCandidate, path);
      await rm(candidate);
      await assertArtifactRootUnchangedV1(rootAuthority);
    } catch (error) {
      cleanupFailure = error;
    }
  }
  await candidateHandle?.close().catch(() => undefined);
  if (failure !== undefined && cleanupFailure !== undefined) {
    throw new TypeError(
      `${detailFromV1(failure)}; candidate cleanup failed: ${detailFromV1(cleanupFailure)}`,
    );
  }
  if (failure !== undefined) throw failure;
  if (cleanupFailure !== undefined) throw cleanupFailure;
}

async function readProjectLegalSourcesV1(repositoryRoot, realRepositoryRoot) {
  const sources = [];
  for (const path of projectLegalFilesV1) {
    const source = resolve(repositoryRoot, path);
    const expectedRealSource = resolve(realRepositoryRoot, ...path.split("/"));
    let handle;
    try {
      const metadata = await lstat(source);
      if (metadata.isSymbolicLink() || !metadata.isFile()) {
        throw new TypeError(`release.invalid_legal_authority: ${path}`);
      }
      handle = await open(source, constants.O_RDONLY | constants.O_NOFOLLOW);
      await assertPinnedFilePathV1(handle, source, expectedRealSource, path);
      const bytes = await handle.readFile();
      await assertPinnedFilePathV1(handle, source, expectedRealSource, path);
      sources.push(Object.freeze({ bytes, path }));
    } catch (error) {
      if (
        error instanceof TypeError &&
        (error.message.startsWith("release.invalid_legal_authority:") ||
          error.message.startsWith("release.invalid_artifact_target:"))
      ) {
        throw error;
      }
      throw new TypeError(`release.invalid_legal_authority: ${path}: ${detailFromV1(error)}`, {
        cause: error,
      });
    } finally {
      await handle?.close().catch(() => undefined);
    }
  }
  return sources;
}

async function copyProjectLegalFilesForRootIdentityV1(
  repositoryRoot,
  artifactRoot,
  expectedIdentity,
) {
  const realRepositoryRoot = await realpath(resolve(repositoryRoot));
  const rootAuthority = await captureArtifactRootV1(artifactRoot, expectedIdentity);
  try {
    const sources = await readProjectLegalSourcesV1(repositoryRoot, realRepositoryRoot);
    const prepared = [];
    for (const { bytes, path } of sources) {
      const { expectedRealTarget, parent, target } = await resolveSafeLegalTargetV1(
        rootAuthority,
        path,
      );
      prepared.push(Object.freeze({ bytes, expectedRealTarget, parent, path, target }));
    }
    for (const { bytes, expectedRealTarget, parent, path, target } of prepared) {
      await copyLegalFileNoFollowV1(bytes, target, expectedRealTarget, parent, path, rootAuthority);
    }
    await rootAuthority.handle.sync();
  } finally {
    await rootAuthority.handle.close().catch(() => undefined);
  }
}

export async function copyProjectLegalFilesV1(repositoryRoot, artifactRoot) {
  await copyProjectLegalFilesForRootIdentityV1(repositoryRoot, artifactRoot, undefined);
}

export async function prepareArtifactDirectoryV1(repositoryRoot, artifactRoot, expectedIdentity) {
  const authority = await captureArtifactRootV1(artifactRoot, expectedIdentity);
  const identity = Object.freeze({ dev: authority.dev, ino: authority.ino });
  try {
    await copyProjectLegalFilesForRootIdentityV1(repositoryRoot, artifactRoot, identity);
    await assertArtifactRootUnchangedV1(authority);
    const module = await loadManifestModuleV1();
    const manifest = await module.writeArtifactManifestV1(artifactRoot, identity);
    await assertArtifactRootUnchangedV1(authority);
    return manifest;
  } finally {
    await authority.handle.close().catch(() => undefined);
  }
}

const isMainV1 =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainV1) {
  try {
    const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
    const args = process.argv.slice(2);
    if (args.length > 1) {
      throw new TypeError("release.invalid_artifact_arguments: expected one Artifact directory");
    }
    const artifactRoot = resolve(args[0] ?? resolve(repositoryRoot, "dist/poc"));
    const manifest = await prepareArtifactDirectoryV1(repositoryRoot, artifactRoot);
    console.log(`prepared PoC Game Artifact with ${String(manifest.files.length)} files`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
