// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  collectPocBuildIdentityV1,
  createPocBuildIdentityVirtualPluginV1,
  pocBuildIdentityVirtualSpecifierV1,
  renderPocBuildIdentityVirtualModuleV1,
} from "./build-poc-identity.mjs";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const facetNames = Object.freeze(["engine", "storySimulation", "storyPresentation", "application"]);

function assertWorkspaceRelativePath(path) {
  assert(path.length > 0);
  assert(!path.startsWith("/"));
  assert(!path.includes("\\"));
  assert(!path.split("/").some((part) => part === "" || part === "." || part === ".."));
  assert(!path.split("/").includes("references"));
}

async function assertLiveRecords(records, facet) {
  assert(records.length > 0);
  assert(Object.isFrozen(records));
  assert.deepEqual(
    records.map(({ path }) => path),
    records.map(({ path }) => path).toSorted(),
  );
  assert.equal(new Set(records.map(({ path }) => path)).size, records.length);

  for (const record of records) {
    assert(Object.isFrozen(record));
    assert.deepEqual(Object.keys(record).toSorted(), ["facet", "path", "sha256"]);
    assert.equal(record.facet, facet);
    assertWorkspaceRelativePath(record.path);
    assert(
      !/(?:^|\/)(?:(?:__tests__|tests?)(?:\/|$)|[^/]+\.(?:test|spec)\.[^/]+$)/u.test(record.path),
    );
    assert(!record.path.includes("/testkit/"));
    assert(!record.path.includes("/testing/"));
    assert.equal(
      record.sha256,
      `sha256:${createHash("sha256")
        .update(await readFile(join(repositoryRoot, record.path)))
        .digest("hex")}`,
    );
  }
}

function changedFacets(before, after) {
  return facetNames.filter(
    (facet) => JSON.stringify(before[facet]) !== JSON.stringify(after[facet]),
  );
}

async function withTemporarySourceMutation(
  path,
  run,
  suffix = "\n// Task 10 temporary PoC BuildIdentity mutation.\n",
) {
  const absolutePath = join(repositoryRoot, path);
  const original = await readFile(absolutePath);
  try {
    await writeFile(absolutePath, Buffer.concat([original, Buffer.from(suffix)]));
    return await run();
  } finally {
    await writeFile(absolutePath, original);
  }
}

async function withTemporaryClosureDependency(run) {
  const dependency = "scripts/build-poc-identity-hmr-fixture.mjs";
  const absoluteDependency = join(repositoryRoot, dependency);
  await writeFile(absoluteDependency, "export const hmrFixtureV1 = true;\n");
  try {
    return await withTemporarySourceMutation(
      "scripts/build-poc-identity.mjs",
      () => run(dependency),
      '\nimport "./build-poc-identity-hmr-fixture.mjs";\n',
    );
  } finally {
    await rm(absoluteDependency, { force: true });
  }
}

void test("collects four non-empty PoC identity facets and the production tooling closure", async () => {
  const identity = await collectPocBuildIdentityV1(repositoryRoot);
  assert(Object.isFrozen(identity));
  assert.deepEqual(Object.keys(identity), [
    "engineVersion",
    "engine",
    "storySimulation",
    "storyPresentation",
    "application",
  ]);
  assert.equal(identity.engineVersion, "0.0.0");
  await assertLiveRecords(identity.engine, "engine");
  await assertLiveRecords(identity.storySimulation, "story_simulation");
  await assertLiveRecords(identity.storyPresentation, "story_presentation");
  await assertLiveRecords(identity.application, "application");

  assert(
    identity.storySimulation.some(
      ({ path }) => path === "game/stories/poc/src/simulation/story-simulation-facet.ts",
    ),
  );
  assert(
    identity.storyPresentation.some(
      ({ path }) => path === "game/stories/poc/src/presentation/story-presentation-facet.ts",
    ),
  );
  assert(!identity.storySimulation.some(({ path }) => path.includes("/presentation/")));
  assert(
    !identity.storyPresentation.some(
      ({ path }) => path.includes("/simulation/") || path.includes("/gameplay/"),
    ),
  );
  for (const records of [identity.storySimulation, identity.storyPresentation]) {
    assert(!records.some(({ path }) => path.startsWith("engine/packages/base/")));
    assert(!records.some(({ path }) => path.endsWith(".tsx")));
  }

  for (const explicitSource of [
    "game/stories/poc/src/tooling/index.ts",
    "scripts/build-story-identity.mjs",
    "scripts/collect-import-closure.mjs",
    "scripts/build-poc-identity.mjs",
    "vite.config.ts",
  ]) {
    assert(
      identity.application.some(({ path }) => path === explicitSource),
      explicitSource,
    );
  }
});

void test("serves the direct PoC collector payload through its closed virtual module", async () => {
  assert.equal(pocBuildIdentityVirtualSpecifierV1, "virtual:project-tavern/poc-build-identity");
  const identity = await collectPocBuildIdentityV1(repositoryRoot);
  const source = renderPocBuildIdentityVirtualModuleV1(identity);
  const plugin = createPocBuildIdentityVirtualPluginV1({
    root: repositoryRoot,
    initialIdentity: identity,
  });
  const resolvedId = plugin.resolveId(pocBuildIdentityVirtualSpecifierV1);
  const viteModuleSpecifier = "vite";
  const { loadConfigFromFile } = await import(viteModuleSpecifier);
  const loadedConfig = await loadConfigFromFile(
    {
      command: "build",
      mode: "poc-web",
      isSsrBuild: false,
      isPreview: false,
    },
    join(repositoryRoot, "vite.config.ts"),
    repositoryRoot,
    "silent",
  );
  assert(loadedConfig);
  const vitePlugins = loadedConfig.config.plugins.flat(Number.POSITIVE_INFINITY);
  assert.deepEqual(
    vitePlugins
      .filter(
        (candidate) =>
          candidate?.name?.startsWith("project-tavern-") &&
          candidate.name.endsWith("-build-identity"),
      )
      .map(({ name }) => name),
    ["project-tavern-poc-build-identity"],
  );
  const vitePlugin = vitePlugins.find(
    (candidate) => candidate?.name === "project-tavern-poc-build-identity",
  );
  assert(vitePlugin);
  const viteResolvedId = vitePlugin.resolveId(pocBuildIdentityVirtualSpecifierV1);

  assert.equal(plugin.name, "project-tavern-poc-build-identity");
  assert.equal(resolvedId, `\0${pocBuildIdentityVirtualSpecifierV1}`);
  assert.equal(plugin.load(resolvedId), source);
  assert.equal(viteResolvedId, `\0${pocBuildIdentityVirtualSpecifierV1}`);
  assert.equal(vitePlugin.load(viteResolvedId), source);
  assert.equal(plugin.load(pocBuildIdentityVirtualSpecifierV1), null);
  assert(!source.includes(repositoryRoot));
  assert.match(source, /^export const pocBuildIdentityV1 = /u);
  assert.equal(
    source,
    renderPocBuildIdentityVirtualModuleV1(await collectPocBuildIdentityV1(repositoryRoot)),
  );
});

void test("refreshes the PoC virtual module only when live closure bytes change", async () => {
  const identity = await collectPocBuildIdentityV1(repositoryRoot);
  const plugin = createPocBuildIdentityVirtualPluginV1({
    root: repositoryRoot,
    initialIdentity: identity,
  });
  const resolvedId = plugin.resolveId(pocBuildIdentityVirtualSpecifierV1);
  const changedModule = Object.freeze({ id: "changed-source" });
  const virtualModule = Object.freeze({ id: resolvedId });
  const watched = [];
  const invalidations = [];
  const server = {
    watcher: {
      add(paths) {
        watched.push([...paths]);
      },
    },
    moduleGraph: {
      getModuleById(id) {
        return id === resolvedId ? virtualModule : undefined;
      },
      invalidateModule(...input) {
        invalidations.push(input);
      },
    },
  };
  plugin.configureServer(server);

  const initialSource = plugin.load(resolvedId);
  await withTemporaryClosureDependency(async (dependency) => {
    const propagated = await plugin.handleHotUpdate({
      timestamp: 201,
      modules: [changedModule],
      server,
    });
    assert.deepEqual(propagated, [changedModule, virtualModule]);
    assert.equal(invalidations.length, 1);
    assert.equal(invalidations[0][0], virtualModule);
    assert(invalidations[0][1] instanceof Set);
    assert.equal(invalidations[0][2], 201);
    assert.equal(invalidations[0][3], true);
    assert.notEqual(plugin.load(resolvedId), initialSource);
    assert(watched.at(-1).includes(join(repositoryRoot, dependency)));

    const unchanged = await plugin.handleHotUpdate({
      timestamp: 202,
      modules: [changedModule],
      server,
    });
    assert.equal(unchanged, undefined);
    assert.equal(invalidations.length, 1);
  });
  assert.equal(watched.length, 3);
});

void test("partitions PoC source mutations into only their owning identity facets", async () => {
  const baseline = await collectPocBuildIdentityV1(repositoryRoot);
  const cases = [
    {
      path: "engine/packages/base/src/contracts/digest.ts",
      expected: ["engine", "application"],
    },
    {
      path: "game/stories/poc/src/gameplay/game-command-executor.ts",
      expected: ["storySimulation", "application"],
    },
    {
      path: "game/stories/poc/src/presentation/scene-graph.ts",
      expected: ["storyPresentation", "application"],
    },
    {
      path: "game/stories/poc/src/application/poc-application-root.tsx",
      expected: ["application"],
    },
  ];

  for (const { path, expected } of cases) {
    assert(
      facetNames.some((facet) => baseline[facet].some((record) => record.path === path)),
      `${path} is absent from the baseline identity`,
    );
    await withTemporarySourceMutation(path, async () => {
      const changed = await collectPocBuildIdentityV1(repositoryRoot);
      assert.deepEqual(changedFacets(baseline, changed), expected, path);
    });
  }
});
