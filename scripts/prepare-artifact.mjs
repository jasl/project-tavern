// SPDX-License-Identifier: MIT
import { createHash } from "node:crypto";
import { copyFile, lstat, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const projectLegalFilesV1 = Object.freeze([
  "CONTRIBUTING.md",
  "LICENSE.md",
  "LICENSES/CC-BY-NC-SA-4.0.txt",
  "LICENSES/MIT.txt",
  "LICENSES/PolyForm-Noncommercial-1.0.0.txt",
  "NOTICE",
  "THIRD_PARTY_NOTICES.md",
  "TRADEMARKS.md",
]);

const posix = (root, path) => relative(root, path).split(sep).join("/");
const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

export async function listArtifactFilesV1(root) {
  const files = [];
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const metadata = await lstat(path);
      if (metadata.isSymbolicLink())
        throw new TypeError(`artifact symlink is forbidden: ${posix(root, path)}`);
      if (metadata.isDirectory()) await walk(path);
      else if (metadata.isFile() && posix(root, path) !== "artifact-manifest.v1.json") {
        files.push(posix(root, path));
      }
    }
  };
  await walk(root);
  return files.toSorted();
}

export async function createArtifactManifestV1(root) {
  const files = await listArtifactFilesV1(root);
  return {
    schemaRevision: 1,
    base: "./",
    files: await Promise.all(
      files.map(async (path) => {
        const bytes = await readFile(join(root, path));
        return { path, byteLength: bytes.byteLength, digest: digest(bytes) };
      }),
    ),
  };
}

export async function prepareArtifactDirectoryV1(repositoryRoot, artifactRoot) {
  for (const path of projectLegalFilesV1) {
    const target = join(artifactRoot, path);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(repositoryRoot, path), target);
  }
  const manifest = await createArtifactManifestV1(artifactRoot);
  await writeFile(
    join(artifactRoot, "artifact-manifest.v1.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return manifest;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  const artifactRoot = resolve(process.argv[2] ?? join(repositoryRoot, "dist/player"));
  await prepareArtifactDirectoryV1(repositoryRoot, artifactRoot);
  console.log(`prepared Player artifact: ${artifactRoot}`);
}
