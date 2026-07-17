// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";

import {
  collectE2eBuildIdentityV1,
  createE2eBuildIdentityVirtualPluginV1,
  e2eBuildIdentityVirtualSpecifierV1,
  renderE2eBuildIdentityVirtualModuleV1,
} from "./build-e2e-identity.mjs";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const facetNames = Object.freeze(["engine", "storySimulation", "storyPresentation", "application"]);
const identityMutationLockPath = join(
  tmpdir(),
  `project-tavern-build-identity-${process.ppid}.lock`,
);
let ownsIdentityMutationLock = false;

function isAlreadyExistsError(error) {
  return typeof error === "object" && error !== null && Reflect.get(error, "code") === "EEXIST";
}

async function acquireIdentityMutationLock() {
  const deadline = Date.now() + 30_000;
  while (true) {
    try {
      await mkdir(identityMutationLockPath);
      ownsIdentityMutationLock = true;
      return;
    } catch (error) {
      if (!isAlreadyExistsError(error)) throw error;
      if (Date.now() >= deadline) {
        throw new TypeError("timed out acquiring the BuildIdentity test mutation lock", {
          cause: error,
        });
      }
      await delay(10);
    }
  }
}

before(async () => {
  await acquireIdentityMutationLock();
});

after(async () => {
  if (!ownsIdentityMutationLock) return;
  ownsIdentityMutationLock = false;
  await rm(identityMutationLockPath, { force: true, recursive: true });
});

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
    assert.equal(
      record.sha256,
      `sha256:${createHash("sha256")
        .update(await readFile(join(repositoryRoot, record.path)))
        .digest("hex")}`,
    );
  }
}

function changedFacets(previousIdentity, nextIdentity) {
  return facetNames.filter(
    (facet) => JSON.stringify(previousIdentity[facet]) !== JSON.stringify(nextIdentity[facet]),
  );
}

async function withTemporarySourceMutation(
  path,
  run,
  suffix = "\n// Task 10 temporary BuildIdentity mutation.\n",
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
  const dependency = "scripts/build-e2e-identity-hmr-fixture.mjs";
  const absoluteDependency = join(repositoryRoot, dependency);
  await writeFile(absoluteDependency, "export const hmrFixtureV1 = true;\n");
  try {
    return await withTemporarySourceMutation(
      "scripts/build-e2e-identity.mjs",
      () => run(dependency),
      '\nimport "./build-e2e-identity-hmr-fixture.mjs";\n',
    );
  } finally {
    await rm(absoluteDependency, { force: true });
  }
}

void test("collects four non-empty production identity facets from live sources", async () => {
  const identity = await collectE2eBuildIdentityV1(repositoryRoot);
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

  assert(identity.engine.some(({ path }) => path === "engine/packages/base/src/index.ts"));
  assert(identity.engine.some(({ path }) => path === "engine/packages/base/src/runtime/index.ts"));
  assert(!identity.engine.some(({ path }) => path.endsWith("package.json")));
  assert(
    identity.storySimulation.some(
      ({ path }) => path === "game/stories/e2e/src/simulation/story-simulation-facet.ts",
    ),
  );
  assert(
    identity.storyPresentation.some(
      ({ path }) => path === "game/stories/e2e/src/presentation/story-presentation-facet.ts",
    ),
  );

  for (const records of [identity.storySimulation, identity.storyPresentation]) {
    assert(!records.some(({ path }) => path.startsWith("engine/packages/base/")));
    assert(!records.some(({ path }) => path.endsWith(".tsx")));
  }
  assert(!identity.storySimulation.some(({ path }) => path.includes("/presentation/")));
  assert(
    !identity.storyPresentation.some(
      ({ path }) => path.includes("/simulation/") || path.includes("/gameplay/"),
    ),
  );

  for (const explicitSource of [
    "game/stories/e2e/src/tooling.ts",
    "game/stories/e2e/src/tooling-ui/index.ts",
    "engine/packages/ui/src/assets/index.ts",
    "engine/packages/ui/src/debug/index.ts",
    "engine/packages/ui/src/diagnostics/index.ts",
    "scripts/build-story-identity.mjs",
    "scripts/collect-import-closure.mjs",
    "scripts/build-e2e-identity.mjs",
    "vite.config.ts",
  ]) {
    assert(identity.application.some(({ path }) => path === explicitSource));
  }
});

void test("serves the direct collector payload byte-for-byte through the closed Vite module", async () => {
  assert.equal(e2eBuildIdentityVirtualSpecifierV1, "virtual:project-tavern/e2e-build-identity");
  const identity = await collectE2eBuildIdentityV1(repositoryRoot);
  const directSource = renderE2eBuildIdentityVirtualModuleV1(identity);
  const directPlugin = createE2eBuildIdentityVirtualPluginV1({
    root: repositoryRoot,
    initialIdentity: identity,
  });
  const viteModuleSpecifier = "vite";
  const { loadConfigFromFile } = await import(viteModuleSpecifier);
  const loadedConfig = await loadConfigFromFile(
    {
      command: "build",
      mode: "e2e-web",
      isSsrBuild: false,
      isPreview: false,
    },
    join(repositoryRoot, "vite.config.ts"),
    repositoryRoot,
    "silent",
    undefined,
    "native",
  );
  assert(loadedConfig);
  const plugins = loadedConfig.config.plugins.flat(Number.POSITIVE_INFINITY);
  assert.deepEqual(
    plugins
      .filter(
        (candidate) =>
          candidate?.name?.startsWith("project-tavern-") &&
          candidate.name.endsWith("-build-identity"),
      )
      .map(({ name }) => name),
    ["project-tavern-e2e-build-identity"],
  );
  const plugin = plugins.find(
    (candidate) => candidate?.name === "project-tavern-e2e-build-identity",
  );
  assert(plugin);
  const resolvedId = plugin.resolveId(e2eBuildIdentityVirtualSpecifierV1);
  assert.equal(resolvedId, `\0${e2eBuildIdentityVirtualSpecifierV1}`);
  assert.equal(plugin.load(resolvedId), directSource);
  assert.equal(plugin.load(e2eBuildIdentityVirtualSpecifierV1), null);
  assert.equal(
    directPlugin.load(directPlugin.resolveId(e2eBuildIdentityVirtualSpecifierV1)),
    directSource,
  );
  assert(!directSource.includes(repositoryRoot));
  assert.match(directSource, /^export const e2eBuildIdentityV1 = /u);
  assert.equal(
    directSource,
    renderE2eBuildIdentityVirtualModuleV1(await collectE2eBuildIdentityV1(repositoryRoot)),
  );
});

void test("refreshes and propagates the virtual identity module only for live payload changes", async () => {
  const identity = await collectE2eBuildIdentityV1(repositoryRoot);
  const plugin = createE2eBuildIdentityVirtualPluginV1({
    root: repositoryRoot,
    initialIdentity: identity,
  });
  const resolvedId = plugin.resolveId(e2eBuildIdentityVirtualSpecifierV1);
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

  const initialWatchedPaths = new Set(watched.flat());
  assert(initialWatchedPaths.has(join(repositoryRoot, "engine/packages/base/package.json")));
  for (const facet of facetNames) {
    for (const record of identity[facet]) {
      assert(initialWatchedPaths.has(join(repositoryRoot, record.path)), record.path);
    }
  }

  const initialSource = plugin.load(resolvedId);
  await withTemporaryClosureDependency(async (dependency) => {
    const propagated = await plugin.handleHotUpdate({
      timestamp: 101,
      modules: [changedModule],
      server,
    });
    assert.deepEqual(propagated, [changedModule, virtualModule]);
    assert.equal(invalidations.length, 1);
    assert.equal(invalidations[0][0], virtualModule);
    assert(invalidations[0][1] instanceof Set);
    assert.equal(invalidations[0][2], 101);
    assert.equal(invalidations[0][3], true);
    assert.notEqual(plugin.load(resolvedId), initialSource);
    assert(watched.at(-1).includes(join(repositoryRoot, dependency)));
    assert.equal(
      plugin.load(resolvedId),
      renderE2eBuildIdentityVirtualModuleV1(await collectE2eBuildIdentityV1(repositoryRoot)),
    );

    const unchanged = await plugin.handleHotUpdate({
      timestamp: 102,
      modules: [changedModule],
      server,
    });
    assert.equal(unchanged, undefined);
    assert.equal(invalidations.length, 1);
  });
  assert.equal(watched.length, 3);
});

void test("marks the production E2E entry as a real Vite self-accept boundary", async () => {
  const viteModuleSpecifier = "vite";
  const { createServer } = await import(viteModuleSpecifier);
  const server = await createServer({
    configFile: join(repositoryRoot, "vite.config.ts"),
    mode: "e2e-web",
    logLevel: "silent",
    server: { middlewareMode: true },
    optimizeDeps: { disabled: true },
  });
  try {
    const entryUrl = "/src/application/entry.tsx";
    const transformed = await server.transformRequest(entryUrl);
    assert(transformed);
    const entryModule = await server.moduleGraph.getModuleByUrl(entryUrl);
    assert(entryModule);
    assert.equal(entryModule.isSelfAccepting, true);
  } finally {
    await server.close();
  }
});

void test("rejects testkit and React imports from Node-only Story facets", async () => {
  const path = "game/stories/e2e/src/simulation/story-simulation-facet.ts";
  const cases = [
    {
      suffix: '\nimport "@sillymaker/base/testkit";\n',
      expected: /testkit source/u,
    },
    {
      suffix: '\nimport "react";\n',
      expected: /contains React/u,
    },
    {
      suffix: '\nimport "react-dom/client";\n',
      expected: /contains React/u,
    },
  ];

  for (const { suffix, expected } of cases) {
    await withTemporarySourceMutation(
      path,
      async () => {
        await assert.rejects(collectE2eBuildIdentityV1(repositoryRoot), expected);
      },
      suffix,
    );
  }
});

void test("partitions live source mutations into only their owning facets", async () => {
  const baseline = await collectE2eBuildIdentityV1(repositoryRoot);
  const cases = [
    {
      path: "engine/packages/base/src/contracts/digest.ts",
      expected: ["engine", "application"],
    },
    {
      path: "game/stories/e2e/src/gameplay/game-command-executor.ts",
      expected: ["storySimulation", "application"],
    },
    {
      path: "game/stories/e2e/src/presentation/scene-graph.ts",
      expected: ["storyPresentation", "application"],
    },
    {
      path: "game/stories/e2e/src/application/e2e-application-root.tsx",
      expected: ["application"],
    },
    {
      path: "game/stories/e2e/src/tooling-ui/index.ts",
      expected: ["application"],
    },
  ];

  for (const { path, expected } of cases) {
    assert(
      facetNames.some((facet) => baseline[facet].some((record) => record.path === path)),
      `${path} is absent from the baseline identity`,
    );
    await withTemporarySourceMutation(path, async () => {
      const changed = await collectE2eBuildIdentityV1(repositoryRoot);
      assert.deepEqual(changedFacets(baseline, changed), expected, path);
    });
  }
});
