// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { collectManagedPaths } from "./collect-import-closure.mjs";
import { verifyGameArtifactClosureV1 } from "./verify-bundle.mjs";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

async function assertMissing(path) {
  await assert.rejects(
    stat(path),
    (error) => error instanceof Error && "code" in error && error.code === "ENOENT",
  );
}

test("collects one E2E application closure", async () => {
  const paths = await collectManagedPaths(repositoryRoot, [
    "game/stories/e2e/src/application/entry.tsx",
  ]);
  assert(paths.includes("game/stories/e2e/src/application/entry.tsx"));
  assert(!paths.some((path) => path.includes("developer-entry")));
  assert(!paths.some((path) => path.includes("player-entry")));
});

test("forbids testkit and source archives but permits future tooling chunks", () => {
  assert.deepEqual(
    verifyGameArtifactClosureV1({
      paths: [
        "game/stories/e2e/src/tooling/index.ts",
        "engine/packages/base/src/testkit/private.ts",
      ],
    }),
    ["Artifact closure reached Base testkit: engine/packages/base/src/testkit/private.ts"],
  );
});

test("rejects references, AIGC source, source maps, and absolute paths", () => {
  const errors = verifyGameArtifactClosureV1({
    paths: ["references/a.ts", "art-source/aigc/openai/a.png", "assets/app.js.map", "/tmp/app.js"],
  });
  assert.equal(errors.length, 4);
});

test("removes the legacy dual-root files and Developer export", async () => {
  for (const path of [
    "engine/packages/web/src/developer/development-panel.tsx",
    "engine/packages/web/src/developer/index.ts",
    "game/stories/e2e/developer.html",
    "game/stories/e2e/player.html",
    "game/stories/e2e/src/application/developer-entry.tsx",
    "game/stories/e2e/src/application/player-entry.tsx",
  ]) {
    await assertMissing(join(repositoryRoot, path));
  }
  const webManifest = JSON.parse(
    await readFile(join(repositoryRoot, "engine/packages/web/package.json"), "utf8"),
  );
  assert.deepEqual(webManifest.exports, { ".": "./src/index.ts" });
});

test("pins the closed Story × Host wrapper and rejects caller build overrides", async (t) => {
  const rootManifest = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
  assert.equal(
    rootManifest.scripts["build:e2e"],
    "node --experimental-strip-types scripts/release/build-artifact.mts --story e2e --host web --out-dir dist/e2e",
  );
  assert.equal(
    rootManifest.scripts["build:poc"],
    "node --experimental-strip-types scripts/release/build-artifact.mts --story poc --host web --out-dir dist/poc",
  );
  assert.equal(rootManifest.scripts["build:player"], undefined);
  assert.equal(rootManifest.scripts["build:developer"], undefined);
  assert.equal(rootManifest.scripts["build:e2e-player"], undefined);
  assert.doesNotMatch(rootManifest.scripts["build:e2e"], /vite build|--mode/u);
  assert.doesNotMatch(rootManifest.scripts["build:poc"], /vite build|--mode/u);

  const directViteOutDir = join(tmpdir(), `tavern-direct-vite-${process.pid}`);
  t.after(() => rm(directViteOutDir, { recursive: true, force: true }));
  await rm(directViteOutDir, { recursive: true, force: true });
  const directVite = spawnSync(
    "pnpm",
    [
      "exec",
      "vite",
      "build",
      "--config",
      "./vite.config.ts",
      "--mode",
      "e2e-web",
      "--outDir",
      directViteOutDir,
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.notEqual(directVite.status, 0);
  assert.match(`${directVite.stdout}${directVite.stderr}`, /release\.invalid_build_request/u);
  await assertMissing(directViteOutDir);

  const unknownStory = spawnSync(
    "node",
    [
      "--experimental-strip-types",
      "scripts/release/build-artifact.mts",
      "--story",
      "demo",
      "--host",
      "web",
      "--out-dir",
      "dist/poc",
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.notEqual(unknownStory.status, 0);
  assert.match(`${unknownStory.stdout}${unknownStory.stderr}`, /release\.invalid_build_request/u);

  const callerRoot = spawnSync("pnpm", ["build:e2e", "game/stories/e2e"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  assert.notEqual(callerRoot.status, 0);
  assert.match(`${callerRoot.stdout}${callerRoot.stderr}`, /release\.invalid_build_request/u);

  const forbiddenOutDir = join(tmpdir(), `tavern-forbidden-artifact-${process.pid}`);
  t.after(() => rm(forbiddenOutDir, { recursive: true, force: true }));
  await rm(forbiddenOutDir, { recursive: true, force: true });
  const callerOutDir = spawnSync(
    "node",
    [
      "--experimental-strip-types",
      "scripts/release/build-artifact.mts",
      "--story",
      "e2e",
      "--host",
      "web",
      "--outDir",
      forbiddenOutDir,
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.notEqual(callerOutDir.status, 0);
  assert.match(`${callerOutDir.stdout}${callerOutDir.stderr}`, /release\.invalid_build_request/u);
  await assertMissing(forbiddenOutDir);

  const retainedOutput = spawnSync(
    "node",
    [
      "--experimental-strip-types",
      "scripts/release/build-artifact.mts",
      "--story",
      "e2e",
      "--host",
      "web",
      "--out-dir",
      "dist/e2e",
      "--emptyOutDir=false",
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.notEqual(retainedOutput.status, 0);
  assert.match(
    `${retainedOutput.stdout}${retainedOutput.stderr}`,
    /release\.invalid_build_request/u,
  );
});
