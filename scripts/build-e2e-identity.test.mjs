// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  collectE2eBuildIdentityV1,
  createE2eBuildIdentityVirtualPluginV1,
  e2eBuildIdentityVirtualSpecifierV1,
  renderE2eBuildIdentityVirtualModuleV1,
} from "./build-e2e-identity.mjs";

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
  suffix = "\n// Task 11 temporary BuildIdentity mutation.\n",
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

test("collects four non-empty production identity facets from live sources", async () => {
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
    "scripts/collect-import-closure.mjs",
    "scripts/build-e2e-identity.mjs",
    "vite.config.ts",
  ]) {
    assert(identity.application.some(({ path }) => path === explicitSource));
  }
});

test("serves the direct collector payload byte-for-byte through the closed Vite module", async () => {
  assert.equal(e2eBuildIdentityVirtualSpecifierV1, "virtual:project-tavern/e2e-build-identity");
  const identity = await collectE2eBuildIdentityV1(repositoryRoot);
  const directSource = renderE2eBuildIdentityVirtualModuleV1(identity);
  const directPlugin = createE2eBuildIdentityVirtualPluginV1(directSource);
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
  );
  assert(loadedConfig);
  const plugins = loadedConfig.config.plugins.flat(Number.POSITIVE_INFINITY);
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

test("rejects testkit and React imports from Node-only Story facets", async () => {
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

test("partitions live source mutations into only their owning facets", async () => {
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
      path: "game/stories/e2e/src/presentation/e2e-renderers.tsx",
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
