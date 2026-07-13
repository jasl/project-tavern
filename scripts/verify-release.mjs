// SPDX-License-Identifier: MIT
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { collectManagedPaths } from "./collect-import-closure.mjs";
import { prepareArtifactDirectoryV1 } from "./prepare-artifact.mjs";
import { verifyArtifactDirectoryV1 } from "./verify-artifact.mjs";
import { verifyPlayerBundleFixtureV1 } from "./verify-bundle.mjs";

export function compareReleaseManifestsV1(first, second) {
  const firstPaths = first.files.map((entry) => entry.path);
  const secondPaths = second.files.map((entry) => entry.path);
  if (
    JSON.stringify(firstPaths) !== JSON.stringify(secondPaths) &&
    JSON.stringify(firstPaths.toSorted()) === JSON.stringify(secondPaths.toSorted())
  ) {
    return ["release manifest order differs"];
  }
  const errors = [];
  const secondByPath = new Map(second.files.map((entry) => [entry.path, entry]));
  for (const entry of first.files) {
    const candidate = secondByPath.get(entry.path);
    if (candidate === undefined) errors.push(`release file missing: ${entry.path}`);
    else if (candidate.byteLength !== entry.byteLength || candidate.digest !== entry.digest) {
      errors.push(`release bytes differ: ${entry.path}`);
    }
  }
  for (const entry of second.files) {
    if (!firstPaths.includes(entry.path)) errors.push(`release file added: ${entry.path}`);
  }
  return errors;
}

async function buildRelease(root, artifactRoot) {
  const result = spawnSync("pnpm", ["build:player"], {
    cwd: root,
    env: { ...process.env, TAVERN_OUT_DIR: artifactRoot },
    encoding: "utf8",
  });
  if (result.status !== 0)
    throw new TypeError(`Player build failed\n${result.stdout}${result.stderr}`);
  return prepareArtifactDirectoryV1(root, artifactRoot);
}

export async function verifyReleaseReproducibilityV1(root) {
  const playerClosure = await collectManagedPaths(root, [
    "game/stories/e2e/src/application/player-entry.tsx",
  ]);
  const closureErrors = verifyPlayerBundleFixtureV1({ paths: playerClosure });
  if (closureErrors.length > 0) return closureErrors;
  const firstRoot = await mkdtemp(join(tmpdir(), "tavern-release-a-"));
  const secondRoot = await mkdtemp(join(tmpdir(), "tavern-release-b-"));
  try {
    const first = await buildRelease(root, firstRoot);
    const second = await buildRelease(root, secondRoot);
    const artifactErrors = [
      ...(await verifyArtifactDirectoryV1(firstRoot)),
      ...(await verifyArtifactDirectoryV1(secondRoot)),
    ];
    if (artifactErrors.length > 0) return artifactErrors;
    const manifestErrors = compareReleaseManifestsV1(first, second);
    if (manifestErrors.length > 0) return manifestErrors;
    const firstBytes = await readFile(join(firstRoot, "artifact-manifest.v1.json"));
    const secondBytes = await readFile(join(secondRoot, "artifact-manifest.v1.json"));
    return firstBytes.equals(secondBytes) ? [] : ["release manifest bytes differ"];
  } finally {
    await Promise.all([
      rm(firstRoot, { recursive: true, force: true }),
      rm(secondRoot, { recursive: true, force: true }),
    ]);
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const errors = await verifyReleaseReproducibilityV1(root);
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("clean Player release builds are reproducible");
  }
}
