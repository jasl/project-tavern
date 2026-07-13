// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildImportClosureRecordsV1, collectImportClosure } from "./collect-import-closure.mjs";

export const e2eBuildIdentityVirtualSpecifierV1 = "virtual:project-tavern/e2e-build-identity";

const repositoryRootV1 = dirname(dirname(fileURLToPath(import.meta.url)));
const engineEntriesV1 = Object.freeze([
  "engine/packages/base/src/index.ts",
  "engine/packages/base/src/runtime/index.ts",
]);
const storySimulationEntryV1 = "game/stories/e2e/src/simulation/story-simulation-facet.ts";
const storyPresentationEntryV1 = "game/stories/e2e/src/presentation/story-presentation-facet.ts";
const applicationEntriesV1 = Object.freeze([
  "game/stories/e2e/src/application/entry.tsx",
  "scripts/collect-import-closure.mjs",
  "scripts/build-e2e-identity.mjs",
  "vite.config.ts",
]);
const basePackageManifestV1 = "engine/packages/base/package.json";
const testPathPatternV1 = /(?:^|\/)(?:(?:__tests__|tests?)(?:\/|$)|[^/]+\.(?:test|spec)\.[^/]+$)/u;

function throwClosureErrors(label, errors) {
  if (errors.length > 0) {
    throw new TypeError(`${label} import closure invalid:\n${errors.join("\n")}`);
  }
}

function assertNoReactImports(label, externalImports) {
  const forbidden = externalImports.filter(
    ({ specifier }) =>
      specifier === "react" ||
      specifier.startsWith("react/") ||
      specifier === "react-dom" ||
      specifier.startsWith("react-dom/"),
  );
  if (forbidden.length > 0) {
    throw new TypeError(
      `${label} import closure contains React: ${forbidden
        .map(({ owner, specifier }) => `${owner} -> ${specifier}`)
        .join(", ")}`,
    );
  }
}

function assertProductionPaths(label, paths) {
  if (paths.length === 0) throw new TypeError(`${label} import closure is empty`);
  for (const path of paths) {
    if (testPathPatternV1.test(path)) {
      throw new TypeError(`${label} import closure contains test source: ${path}`);
    }
    if (path.includes("/testkit/")) {
      throw new TypeError(`${label} import closure contains testkit source: ${path}`);
    }
  }
}

async function collectEngineRecordsV1(root) {
  const closure = await collectImportClosure(root, engineEntriesV1);
  throwClosureErrors("engine", closure.errors);
  assertNoReactImports("engine", closure.externalImports);
  assertProductionPaths("engine", closure.paths);
  const tsxPath = closure.paths.find((path) => path.endsWith(".tsx"));
  if (tsxPath !== undefined) {
    throw new TypeError(`engine import closure contains TSX: ${tsxPath}`);
  }
  const foreignPath = closure.paths.find((path) => !path.startsWith("engine/packages/base/"));
  if (foreignPath !== undefined) {
    throw new TypeError(`engine import closure contains non-Base source: ${foreignPath}`);
  }
  return buildImportClosureRecordsV1(root, closure.paths, "engine");
}

async function collectStoryFacetRecordsV1(root, input) {
  const closure = await collectImportClosure(root, [input.entry]);
  throwClosureErrors(input.label, closure.errors);
  assertNoReactImports(input.label, closure.externalImports);
  assertProductionPaths(input.label, closure.paths);

  const storyPaths = closure.paths.filter((path) => !path.startsWith("engine/packages/base/"));
  for (const path of storyPaths) {
    if (path.endsWith(".tsx")) {
      throw new TypeError(`${input.label} import closure contains TSX: ${path}`);
    }
    if (path.startsWith("game/stories/e2e/src/application/")) {
      throw new TypeError(`${input.label} import closure contains application source: ${path}`);
    }
    if (input.forbiddenPath(path)) {
      throw new TypeError(`${input.label} import closure crosses Story facets: ${path}`);
    }
  }
  return buildImportClosureRecordsV1(root, storyPaths, input.facet);
}

async function collectApplicationRecordsV1(root) {
  const closure = await collectImportClosure(root, applicationEntriesV1);
  throwClosureErrors("application", closure.errors);
  assertProductionPaths("application", closure.paths);
  if (closure.paths.some((path) => path.includes(e2eBuildIdentityVirtualSpecifierV1))) {
    throw new TypeError("application import closure contains its virtual BuildIdentity module");
  }
  return buildImportClosureRecordsV1(root, closure.paths, "application");
}

async function readEngineVersionV1(root) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(resolve(root, basePackageManifestV1), "utf8"));
  } catch (error) {
    throw new TypeError("reviewed @sillymaker/base package metadata is unreadable", {
      cause: error,
    });
  }
  if (
    manifest?.name !== "@sillymaker/base" ||
    typeof manifest.version !== "string" ||
    !/^[\x20-\x7e]{1,64}$/u.test(manifest.version)
  ) {
    throw new TypeError("reviewed @sillymaker/base package metadata is invalid");
  }
  return manifest.version;
}

/**
 * Collects the one production E2E BuildIdentity input from live source bytes. Story facets stop at
 * the Base boundary, while the application facet intentionally covers the complete Artifact root.
 */
export async function collectE2eBuildIdentityV1(root = repositoryRootV1) {
  const [engineVersion, engine, storySimulation, storyPresentation, application] =
    await Promise.all([
      readEngineVersionV1(root),
      collectEngineRecordsV1(root),
      collectStoryFacetRecordsV1(root, {
        entry: storySimulationEntryV1,
        facet: "story_simulation",
        label: "story simulation",
        forbiddenPath: (path) => path.startsWith("game/stories/e2e/src/presentation/"),
      }),
      collectStoryFacetRecordsV1(root, {
        entry: storyPresentationEntryV1,
        facet: "story_presentation",
        label: "story presentation",
        forbiddenPath: (path) =>
          path.startsWith("game/stories/e2e/src/simulation/") ||
          path.startsWith("game/stories/e2e/src/gameplay/"),
      }),
      collectApplicationRecordsV1(root),
    ]);

  return Object.freeze({
    engineVersion,
    engine,
    storySimulation,
    storyPresentation,
    application,
  });
}

/** Returns the exact ESM source consumed by Vite's closed virtual module. */
export function renderE2eBuildIdentityVirtualModuleV1(identity) {
  return `export const e2eBuildIdentityV1 = ${JSON.stringify(identity)};\n`;
}

/** Creates the production Vite plugin without making the Node collector depend on Vite. */
export function createE2eBuildIdentityVirtualPluginV1(source) {
  if (typeof source !== "string" || source.length === 0) {
    throw new TypeError("E2E BuildIdentity virtual module source is empty");
  }
  const resolvedId = `\0${e2eBuildIdentityVirtualSpecifierV1}`;
  return Object.freeze({
    name: "project-tavern-e2e-build-identity",
    resolveId(id) {
      return id === e2eBuildIdentityVirtualSpecifierV1 ? resolvedId : null;
    },
    load(id) {
      return id === resolvedId ? source : null;
    },
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  void collectE2eBuildIdentityV1().then(
    (identity) => console.log(JSON.stringify(identity, null, 2)),
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
