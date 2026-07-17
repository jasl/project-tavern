// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { buildImportClosureRecordsV1, collectImportClosure } from "./collect-import-closure.mjs";

const engineEntriesV1 = Object.freeze([
  "engine/packages/base/src/index.ts",
  "engine/packages/base/src/runtime/index.ts",
]);
const basePackageManifestV1 = "engine/packages/base/package.json";
const identityRecordKeysV1 = Object.freeze([
  "engine",
  "storySimulation",
  "storyPresentation",
  "application",
]);
const testPathPatternV1 = /(?:^|\/)(?:(?:__tests__|tests?)(?:\/|$)|[^/]+\.(?:test|spec)\.[^/]+$)/u;

function requireNonEmptyStringV1(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} is invalid`);
  }
  return value;
}

function requireIdentifierV1(value, label) {
  const identifier = requireNonEmptyStringV1(value, label);
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(identifier)) {
    throw new TypeError(`${label} is invalid`);
  }
  return identifier;
}

function requireStringArrayV1(value, label) {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string" || entry.length === 0)
  ) {
    throw new TypeError(`${label} is invalid`);
  }
  return Object.freeze([...value]);
}

function normalizeFacetInputV1(value, label) {
  if (typeof value !== "object" || value === null) {
    throw new TypeError(`${label} is invalid`);
  }
  return Object.freeze({
    entry: requireNonEmptyStringV1(Reflect.get(value, "entry"), `${label} entry`),
    forbiddenPrefixes: requireStringArrayV1(
      Reflect.get(value, "forbiddenPrefixes"),
      `${label} forbidden prefixes`,
    ),
  });
}

function normalizeOwnerInputV1(input) {
  if (typeof input !== "object" || input === null) {
    throw new TypeError("Story BuildIdentity owner input is invalid");
  }
  const storySourceRoot = requireNonEmptyStringV1(
    Reflect.get(input, "storySourceRoot"),
    "Story BuildIdentity source root",
  );
  if (!storySourceRoot.endsWith("/")) {
    throw new TypeError("Story BuildIdentity source root must end with a slash");
  }
  const virtual = Reflect.get(input, "virtual");
  if (typeof virtual !== "object" || virtual === null) {
    throw new TypeError("Story BuildIdentity virtual module input is invalid");
  }
  return Object.freeze({
    label: requireNonEmptyStringV1(Reflect.get(input, "label"), "Story BuildIdentity label"),
    storySourceRoot,
    applicationSourceRoot: `${storySourceRoot}application/`,
    simulation: normalizeFacetInputV1(Reflect.get(input, "simulation"), "Story simulation facet"),
    presentation: normalizeFacetInputV1(
      Reflect.get(input, "presentation"),
      "Story presentation facet",
    ),
    applicationEntries: requireStringArrayV1(
      Reflect.get(input, "applicationEntries"),
      "Story application entries",
    ),
    virtual: Object.freeze({
      specifier: requireNonEmptyStringV1(
        Reflect.get(virtual, "specifier"),
        "Story BuildIdentity virtual specifier",
      ),
      exportName: requireIdentifierV1(
        Reflect.get(virtual, "exportName"),
        "Story BuildIdentity virtual export",
      ),
      pluginName: requireNonEmptyStringV1(
        Reflect.get(virtual, "pluginName"),
        "Story BuildIdentity plugin name",
      ),
    }),
  });
}

function throwClosureErrorsV1(label, errors) {
  if (errors.length > 0) {
    throw new TypeError(`${label} import closure invalid:\n${errors.join("\n")}`);
  }
}

function assertNoReactImportsV1(label, externalImports) {
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

function assertProductionPathsV1(label, paths) {
  if (paths.length === 0) throw new TypeError(`${label} import closure is empty`);
  for (const path of paths) {
    if (testPathPatternV1.test(path)) {
      throw new TypeError(`${label} import closure contains test source: ${path}`);
    }
    if (path.includes("/testkit/")) {
      throw new TypeError(`${label} import closure contains testkit source: ${path}`);
    }
    if (path.includes("/testing/")) {
      throw new TypeError(`${label} import closure contains testing source: ${path}`);
    }
  }
}

async function collectEngineRecordsV1(root) {
  const closure = await collectImportClosure(root, engineEntriesV1);
  throwClosureErrorsV1("engine", closure.errors);
  assertNoReactImportsV1("engine", closure.externalImports);
  assertProductionPathsV1("engine", closure.paths);
  const tsxPath = closure.paths.find((path) => path.endsWith(".tsx"));
  if (tsxPath !== undefined) {
    throw new TypeError(`engine import closure contains TSX: ${tsxPath}`);
  }
  const foreignPath = closure.paths.find((path) => !path.startsWith("engine/packages/base/"));
  if (foreignPath !== undefined) {
    throw new TypeError(`engine import closure contains non-Base source: ${foreignPath}`);
  }
  return await buildImportClosureRecordsV1(root, closure.paths, "engine");
}

async function collectStoryFacetRecordsV1(root, config, input) {
  const closure = await collectImportClosure(root, [input.entry]);
  throwClosureErrorsV1(input.label, closure.errors);
  assertNoReactImportsV1(input.label, closure.externalImports);
  assertProductionPathsV1(input.label, closure.paths);

  const storyPaths = closure.paths.filter((path) => !path.startsWith("engine/packages/base/"));
  for (const path of storyPaths) {
    if (path.endsWith(".tsx")) {
      throw new TypeError(`${input.label} import closure contains TSX: ${path}`);
    }
    if (path.startsWith(config.applicationSourceRoot)) {
      throw new TypeError(`${input.label} import closure contains application source: ${path}`);
    }
    if (input.forbiddenPrefixes.some((prefix) => path.startsWith(prefix))) {
      throw new TypeError(`${input.label} import closure crosses Story facets: ${path}`);
    }
  }
  return await buildImportClosureRecordsV1(root, storyPaths, input.facet);
}

async function collectApplicationRecordsV1(root, config) {
  const closure = await collectImportClosure(root, config.applicationEntries);
  throwClosureErrorsV1("application", closure.errors);
  assertProductionPathsV1("application", closure.paths);
  if (closure.paths.some((path) => path.includes(config.virtual.specifier))) {
    throw new TypeError("application import closure contains its virtual BuildIdentity module");
  }
  return await buildImportClosureRecordsV1(root, closure.paths, "application");
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

function collectIdentityWatchPathsV1(root, identity, label) {
  if (typeof identity !== "object" || identity === null) {
    throw new TypeError(`${label} BuildIdentity is invalid`);
  }
  const paths = new Set([resolve(root, basePackageManifestV1)]);
  for (const key of identityRecordKeysV1) {
    const records = Reflect.get(identity, key);
    if (!Array.isArray(records)) {
      throw new TypeError(`${label} BuildIdentity ${key} records are invalid`);
    }
    for (const record of records) {
      const path =
        typeof record === "object" && record !== null ? Reflect.get(record, "path") : null;
      if (typeof path !== "string" || path.length === 0) {
        throw new TypeError(`${label} BuildIdentity ${key} record path is invalid`);
      }
      paths.add(resolve(root, path));
    }
  }
  return Object.freeze([...paths].sort());
}

/**
 * Creates a Story-specific live-byte collector and its closed virtual-module owner without taking
 * a Vite dependency. Story wrappers retain their public names and bind only configuration here.
 */
export function createStoryBuildIdentityOwnerV1(input) {
  const config = normalizeOwnerInputV1(input);

  async function collectBuildIdentityV1(inputRoot) {
    const root = resolve(requireNonEmptyStringV1(inputRoot, `${config.label} BuildIdentity root`));
    const [engineVersion, engine, storySimulation, storyPresentation, application] =
      await Promise.all([
        readEngineVersionV1(root),
        collectEngineRecordsV1(root),
        collectStoryFacetRecordsV1(root, config, {
          entry: config.simulation.entry,
          facet: "story_simulation",
          label: "story simulation",
          forbiddenPrefixes: config.simulation.forbiddenPrefixes,
        }),
        collectStoryFacetRecordsV1(root, config, {
          entry: config.presentation.entry,
          facet: "story_presentation",
          label: "story presentation",
          forbiddenPrefixes: config.presentation.forbiddenPrefixes,
        }),
        collectApplicationRecordsV1(root, config),
      ]);

    return Object.freeze({
      engineVersion,
      engine,
      storySimulation,
      storyPresentation,
      application,
    });
  }

  function renderVirtualModuleV1(identity) {
    return `export const ${config.virtual.exportName} = ${JSON.stringify(identity)};\n`;
  }

  function createVirtualPluginV1(pluginInput) {
    if (typeof pluginInput !== "object" || pluginInput === null) {
      throw new TypeError(`${config.label} BuildIdentity virtual plugin input is invalid`);
    }
    const inputRoot = Reflect.get(pluginInput, "root");
    if (typeof inputRoot !== "string" || inputRoot.length === 0) {
      throw new TypeError(`${config.label} BuildIdentity virtual plugin root is invalid`);
    }
    const root = resolve(inputRoot);
    const initialIdentity = Reflect.get(pluginInput, "initialIdentity");
    let source = renderVirtualModuleV1(initialIdentity);
    const initialWatchPaths = collectIdentityWatchPathsV1(root, initialIdentity, config.label);
    const resolvedId = `\0${config.virtual.specifier}`;
    let refreshTail = Promise.resolve();

    async function refreshForHotUpdateV1(context) {
      const identity = await collectBuildIdentityV1(root);
      context.server.watcher.add(collectIdentityWatchPathsV1(root, identity, config.label));
      const nextSource = renderVirtualModuleV1(identity);
      if (nextSource === source) return undefined;

      source = nextSource;
      const virtualModule = context.server.moduleGraph.getModuleById(resolvedId);
      if (virtualModule === undefined) return context.modules;
      context.server.moduleGraph.invalidateModule(
        virtualModule,
        new Set(),
        context.timestamp,
        true,
      );
      return [...new Set([...context.modules, virtualModule])];
    }

    return Object.freeze({
      name: config.virtual.pluginName,
      resolveId(id) {
        return id === config.virtual.specifier ? resolvedId : null;
      },
      load(id) {
        return id === resolvedId ? source : null;
      },
      configureServer(server) {
        server.watcher.add(initialWatchPaths);
      },
      handleHotUpdate(context) {
        const refresh = refreshTail.then(
          () => refreshForHotUpdateV1(context),
          () => refreshForHotUpdateV1(context),
        );
        refreshTail = refresh.then(
          () => undefined,
          () => undefined,
        );
        return refresh;
      },
    });
  }

  return Object.freeze({
    collectBuildIdentityV1,
    renderVirtualModuleV1,
    createVirtualPluginV1,
  });
}
