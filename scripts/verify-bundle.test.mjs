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

test("pins the closed Vite config and rejects caller build overrides", async (t) => {
  const rootManifest = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
  assert.equal(
    rootManifest.scripts["build:e2e"],
    "vite build --config ./vite.config.ts --mode e2e-web",
  );
  assert.equal(rootManifest.scripts["build:player"], undefined);
  assert.equal(rootManifest.scripts["build:developer"], undefined);

  const unknownMode = spawnSync(
    "pnpm",
    ["exec", "vite", "build", "--config", "./vite.config.ts", "--mode", "unsupported-web"],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.notEqual(unknownMode.status, 0);
  assert.match(
    `${unknownMode.stdout}${unknownMode.stderr}`,
    /unsupported Project Tavern build mode: unsupported-web/u,
  );

  const callerRoot = spawnSync("pnpm", ["build:e2e", "game/stories/e2e"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  assert.notEqual(callerRoot.status, 0);
  assert.match(
    `${callerRoot.stdout}${callerRoot.stderr}`,
    /caller-supplied application root is forbidden/u,
  );

  const forbiddenOutDir = join(tmpdir(), `tavern-forbidden-artifact-${process.pid}`);
  t.after(() => rm(forbiddenOutDir, { recursive: true, force: true }));
  await rm(forbiddenOutDir, { recursive: true, force: true });
  const callerOutDir = spawnSync(
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
      forbiddenOutDir,
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.notEqual(callerOutDir.status, 0);
  assert.match(
    `${callerOutDir.stdout}${callerOutDir.stderr}`,
    /caller-supplied output directory is forbidden/u,
  );
  await assertMissing(forbiddenOutDir);

  const retainedOutput = spawnSync(
    "pnpm",
    [
      "exec",
      "vite",
      "build",
      "--config",
      "./vite.config.ts",
      "--mode",
      "e2e-web",
      "--emptyOutDir=false",
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  assert.notEqual(retainedOutput.status, 0);
  assert.match(
    `${retainedOutput.stdout}${retainedOutput.stderr}`,
    /E2E Artifact build invariants were overridden/u,
  );
});
