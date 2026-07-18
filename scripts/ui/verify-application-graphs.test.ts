// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { resolve } from "node:path";

import { canonicalJsonBytes, digestBytes } from "../../engine/packages/base/src/index.js";
import { describe, expect, it } from "vitest";
import { parseAst } from "vite";

import { collectApplicationGraphV1 } from "./source-graph-plugin.mjs";
import { verifyApplicationGraphsV1 } from "./verify-application-graphs.mjs";

interface GraphNodeFixtureV1 {
  id: string;
  owningPackage: string;
}

interface GraphEdgeFixtureV1 {
  from: string;
  kind: "dynamic" | "static";
  to: string;
}

interface GraphChunkFixtureV1 {
  dynamicImports: string[];
  entry: string | null;
  fileName: string;
  imports: string[];
}

interface GraphManifestFixtureV1 {
  applicationId: "e2e-web" | "poc-web";
  chunks: GraphChunkFixtureV1[];
  contractRevision: 1;
  dynamicSpecifiers: string[];
  edges: GraphEdgeFixtureV1[];
  entry: string;
  nodes: GraphNodeFixtureV1[];
}

type GraphFixturePairV1 = { e2e: GraphManifestFixtureV1; poc: GraphManifestFixtureV1 };

const compareTextV1 = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

function sortManifestV1(manifest: GraphManifestFixtureV1): GraphManifestFixtureV1 {
  manifest.nodes.sort((left, right) => compareTextV1(left.id, right.id));
  manifest.edges.sort(
    (left, right) =>
      compareTextV1(left.from, right.from) ||
      compareTextV1(left.kind, right.kind) ||
      compareTextV1(left.to, right.to),
  );
  manifest.dynamicSpecifiers.sort(compareTextV1);
  manifest.chunks.sort((left, right) => compareTextV1(left.fileName, right.fileName));
  for (const chunk of manifest.chunks) {
    chunk.imports.sort(compareTextV1);
    chunk.dynamicImports.sort(compareTextV1);
  }
  return manifest;
}

function createManifestV1(story: "e2e" | "poc"): GraphManifestFixtureV1 {
  const packageName = `@project-tavern/story-${story}`;
  const applicationId = `${story}-web` as const;
  const storyRoot = `game/stories/${story}`;
  const html = `${storyRoot}/index.html`;
  const applicationEntry = `${storyRoot}/src/application/entry.tsx`;
  const storyEntry =
    story === "e2e" ? `${storyRoot}/src/index.ts` : `${storyRoot}/src/story-definition.ts`;
  const gameRuntime = `${storyRoot}/src/application/create-${story}-game-runtime.ts`;
  const presentationRuntime = `${storyRoot}/src/application/create-${story}-presentation-runtime.ts`;
  const toolingEntry =
    story === "e2e" ? `${storyRoot}/src/tooling.ts` : `${storyRoot}/src/tooling/index.ts`;
  const toolingUiEntry = `${storyRoot}/src/tooling-ui/index.ts`;
  const toolingPanel = `${storyRoot}/src/tooling-ui/ui-contributions.tsx`;
  const toolingSpecifier = `${packageName}/tooling`;
  const toolingUiSpecifier = `${packageName}/tooling-ui`;
  const prefix = story === "e2e" ? "e2e" : "poc";
  return sortManifestV1({
    applicationId,
    chunks: [
      {
        dynamicImports: [`assets/${prefix}-tooling-ui.js`, `assets/${prefix}-tooling.js`],
        entry: html,
        fileName: `assets/${prefix}-application.js`,
        imports: [],
      },
      {
        dynamicImports: [],
        entry: toolingUiEntry,
        fileName: `assets/${prefix}-tooling-ui.js`,
        imports: [`assets/${prefix}-tooling.js`],
      },
      {
        dynamicImports: [],
        entry: toolingEntry,
        fileName: `assets/${prefix}-tooling.js`,
        imports: [],
      },
    ],
    contractRevision: 1,
    dynamicSpecifiers: [toolingSpecifier, toolingUiSpecifier],
    edges: [
      { from: html, kind: "static", to: applicationEntry },
      { from: html, kind: "static", to: "virtual:vite/modulepreload-polyfill.js" },
      { from: applicationEntry, kind: "static", to: gameRuntime },
      { from: applicationEntry, kind: "static", to: presentationRuntime },
      { from: applicationEntry, kind: "static", to: "engine/packages/web/src/index.ts" },
      { from: applicationEntry, kind: "static", to: storyEntry },
      {
        from: applicationEntry,
        kind: "static",
        to: `virtual:project-tavern/${story}-build-identity`,
      },
      { from: gameRuntime, kind: "dynamic", to: toolingEntry },
      { from: presentationRuntime, kind: "dynamic", to: toolingUiEntry },
      { from: toolingUiEntry, kind: "static", to: toolingPanel },
    ],
    entry: applicationEntry,
    nodes: [
      { id: "engine/packages/web/src/index.ts", owningPackage: "@sillymaker/web" },
      { id: html, owningPackage: packageName },
      { id: applicationEntry, owningPackage: packageName },
      { id: gameRuntime, owningPackage: packageName },
      { id: presentationRuntime, owningPackage: packageName },
      { id: storyEntry, owningPackage: packageName },
      { id: toolingEntry, owningPackage: packageName },
      { id: toolingUiEntry, owningPackage: packageName },
      { id: toolingPanel, owningPackage: packageName },
      {
        id: `virtual:project-tavern/${story}-build-identity`,
        owningPackage: packageName,
      },
      { id: "virtual:vite/modulepreload-polyfill.js", owningPackage: "vite" },
    ],
  });
}

function projectGraphFixtureV1(
  mutate?: (manifests: GraphFixturePairV1) => void,
  replaceBytes?: (manifests: GraphFixturePairV1) => Partial<Record<"e2e" | "poc", Uint8Array>>,
) {
  const root = "/project-tavern-fixture";
  const manifests: GraphFixturePairV1 = {
    e2e: createManifestV1("e2e"),
    poc: createManifestV1("poc"),
  };
  mutate?.(manifests);
  sortManifestV1(manifests.e2e);
  sortManifestV1(manifests.poc);
  const replacements = replaceBytes?.(manifests) ?? {};
  const bytes = {
    e2e: replacements.e2e ?? canonicalJsonBytes(manifests.e2e),
    poc: replacements.poc ?? canonicalJsonBytes(manifests.poc),
  };
  const paths = {
    e2e: resolve(root, "dist/e2e/source-graph.v1.json"),
    poc: resolve(root, "dist/poc/source-graph.v1.json"),
  };
  const reads: string[] = [];
  return {
    bytes,
    input: {
      root,
      readFile: async (path: string): Promise<Uint8Array> => {
        reads.push(path);
        if (path === paths.e2e) return bytes.e2e;
        if (path === paths.poc) return bytes.poc;
        throw Object.assign(new Error(`ENOENT: ${path}`), { code: "ENOENT" });
      },
    },
    manifests,
    paths,
    reads,
  };
}

function addNodeAndEdgeV1(
  manifest: GraphManifestFixtureV1,
  node: GraphNodeFixtureV1,
  edge: GraphEdgeFixtureV1,
): void {
  manifest.nodes.push(node);
  manifest.edges.push(edge);
}

describe("application graph verification", () => {
  it("exposes a build-only collector that rejects raw unknown virtuals and nonliteral imports", async () => {
    const plugin = collectApplicationGraphV1({
      applicationId: "e2e-web",
      entry: "game/stories/e2e/src/application/entry.tsx",
      htmlEntry: "game/stories/e2e/index.html",
      repositoryRoot: "/project-tavern-fixture",
    });
    expect(plugin.apply).toBe("build");
    expect(plugin.name).toMatch(/source-graph/u);

    const hookHandler = (hook: unknown): ((...args: unknown[]) => unknown) => {
      if (typeof hook === "function") return hook as (...args: unknown[]) => unknown;
      if (typeof hook === "object" && hook !== null) {
        const handler = Reflect.get(hook, "handler");
        if (typeof handler === "function") return handler as (...args: unknown[]) => unknown;
      }
      throw new TypeError("missing collector hook");
    };
    const context = {
      error(error: unknown): never {
        throw error instanceof Error ? error : new TypeError(String(error));
      },
      parse: parseAst,
    };
    const transform = hookHandler(plugin.transform);
    await expect(
      Promise.resolve(
        transform.call(
          context,
          'const target = "@project-tavern/story-e2e/tooling"; void import(target);',
          "/project-tavern-fixture/game/stories/e2e/src/application/entry.tsx",
        ),
      ),
    ).rejects.toThrow(/ui\.application_graph_forbidden/u);
    expect(() =>
      hookHandler(plugin.load).call(context, "\0virtual:unknown/application-graph"),
    ).toThrow(/ui\.application_graph_forbidden/u);
    expect(() =>
      hookHandler(plugin.load).call(
        context,
        "/project-tavern-fixture/game/stories/e2e/src/tooling.ts?graph-variant",
      ),
    ).toThrow(/ui\.application_graph_forbidden/u);
    const moduleParsed = hookHandler(plugin.moduleParsed);
    const finalModuleInfo = (id: string, code: string) => ({
      code,
      dynamicallyImportedIds: [],
      id,
      importedIds: [],
    });
    expect(() =>
      moduleParsed.call(
        context,
        finalModuleInfo(
          "/project-tavern-fixture/game/stories/e2e/src/tooling.ts",
          "export function inspect(history) { return history.length; }",
        ),
      ),
    ).not.toThrow();
    expect(() =>
      moduleParsed.call(
        context,
        finalModuleInfo(
          "/project-tavern-fixture/game/stories/e2e/src/tooling.ts",
          "function shadow(document) { return document; } function leak() { return document.body; }",
        ),
      ),
    ).toThrow(/ui\.application_graph_forbidden/u);
    for (const browserGlobal of [
      "Audio",
      "DOMParser",
      "EventTarget",
      "HTMLFormElement",
      "HTMLIFrameElement",
      "HTMLVideoElement",
      "Path2D",
      "Range",
    ]) {
      expect(() =>
        moduleParsed.call(
          context,
          finalModuleInfo(
            "/project-tavern-fixture/game/stories/e2e/src/tooling.ts",
            `export const value = new ${browserGlobal}();`,
          ),
        ),
      ).toThrow(/ui\.application_graph_forbidden/u);
    }
    expect(() =>
      moduleParsed.call(
        context,
        finalModuleInfo(
          "/project-tavern-fixture/game/stories/e2e/src/tooling.ts",
          "function inspect() { if (true) { var document = { body: null }; } return document.body; } export { inspect };",
        ),
      ),
    ).not.toThrow();
    expect(() =>
      moduleParsed.call(
        context,
        finalModuleInfo(
          "/project-tavern-fixture/game/stories/e2e/src/application/entry.tsx",
          'const target = "./late-transform.js"; void import(target);',
        ),
      ),
    ).toThrow(/ui\.application_graph_forbidden/u);

    const generateBundle = hookHandler(plugin.generateBundle);
    const bundleContext = { ...context, emitFile: () => "source-graph" };
    for (const fileName of ["admin.html?variant", "leak.js.map#variant"]) {
      expect(() =>
        generateBundle.call(
          bundleContext,
          {},
          {
            "index.html": { fileName: "index.html", source: "", type: "asset" },
            [fileName]: { fileName, source: "", type: "asset" },
          },
        ),
      ).toThrow(/query|fragment/u);
    }
    for (const fileName of ["assets/art-source/aigc/leak.js", "assets/references/leak.js"]) {
      expect(() =>
        generateBundle.call(
          bundleContext,
          {},
          {
            "index.html": { fileName: "index.html", source: "", type: "asset" },
            [fileName]: { fileName, source: "", type: "asset" },
          },
        ),
      ).toThrow(/forbidden source tree/u);
    }
    expect(() =>
      generateBundle.call(
        bundleContext,
        {},
        {
          "index.html": { fileName: "index.html", source: "", type: "asset" },
          "entry.js": {
            code: "//# sourceMappingURL=data:application/json;base64,e30=",
            dynamicImports: [],
            facadeModuleId: null,
            fileName: "entry.js",
            imports: [],
            map: null,
            type: "chunk",
          },
        },
      ),
    ).toThrow(/source.?map/u);
    expect(() =>
      generateBundle.call(
        bundleContext,
        {},
        {
          "index.html": { fileName: "index.html", source: "", type: "asset" },
          "spaced.css": {
            fileName: "spaced.css",
            source: "body {} /* # sourceMappingURL=data:application/json;base64,e30= */",
            type: "asset",
          },
        },
      ),
    ).toThrow(/source.?map/u);
    expect(() =>
      generateBundle.call(
        bundleContext,
        {},
        {
          "index.html": { fileName: "index.html", source: "", type: "asset" },
          "styles.css": {
            fileName: "styles.css",
            source: "body {} /*# sourceMappingURL=data:application/json;base64,e30= */",
            type: "asset",
          },
        },
      ),
    ).toThrow(/source.?map/u);
    expect(() =>
      generateBundle.call(
        bundleContext,
        {},
        {
          "index.html": { fileName: "index.html", source: "", type: "asset" },
          "tooling.js": {
            code: "document.body;",
            dynamicImports: [],
            facadeModuleId: "/project-tavern-fixture/game/stories/e2e/src/tooling.ts",
            fileName: "tooling.js",
            imports: [],
            map: null,
            type: "chunk",
          },
        },
      ),
    ).toThrow(/browser globals/u);
    for (const code of [
      'import "https://evil.example/runtime.js";',
      'void import("https://evil.example/runtime.js");',
    ]) {
      expect(() =>
        generateBundle.call(
          bundleContext,
          {},
          {
            "index.html": { fileName: "index.html", source: "", type: "asset" },
            "entry.js": {
              code,
              dynamicImports: [],
              facadeModuleId: null,
              fileName: "entry.js",
              imports: [],
              map: null,
              type: "chunk",
            },
          },
        ),
      ).toThrow(/metadata|relative/u);
    }
  });

  it("accepts exactly the two Story-owned application roots", async () => {
    const fixture = projectGraphFixtureV1();
    const result = await verifyApplicationGraphsV1(fixture.input);
    expect(result.applications).toEqual([
      { id: "e2e-web", root: "game/stories/e2e/src/application/entry.tsx" },
      { id: "poc-web", root: "game/stories/poc/src/application/entry.tsx" },
    ]);
    expect(result.developerRoots).toEqual([]);
  });

  it("allows only each active Story's fixed Node-safe and browser tooling exports", async () => {
    const result = await verifyApplicationGraphsV1(projectGraphFixtureV1().input);
    expect(result.dynamicSpecifiers).toEqual([
      "@project-tavern/story-e2e/tooling",
      "@project-tavern/story-e2e/tooling-ui",
      "@project-tavern/story-poc/tooling",
      "@project-tavern/story-poc/tooling-ui",
    ]);
  });

  it("reads two exact canonical source-graph manifests and reports their digests", async () => {
    const fixture = projectGraphFixtureV1();
    const result = await verifyApplicationGraphsV1(fixture.input);
    expect(fixture.reads).toEqual([fixture.paths.e2e, fixture.paths.poc]);
    expect(result.manifests).toEqual([
      {
        applicationId: "e2e-web",
        digest: digestBytes(result.manifestBytes.e2e),
        path: "dist/e2e/source-graph.v1.json",
      },
      {
        applicationId: "poc-web",
        digest: digestBytes(result.manifestBytes.poc),
        path: "dist/poc/source-graph.v1.json",
      },
    ]);
    expect(result.manifestBytes.poc).toEqual(canonicalJsonBytes(result.manifestValues.poc));
  });

  it.each([
    [
      "web imports a Story",
      (pair: GraphFixturePairV1) =>
        addNodeAndEdgeV1(
          pair.e2e,
          { id: "game/stories/poc/src/index.ts", owningPackage: "@project-tavern/story-poc" },
          {
            from: "engine/packages/web/src/index.ts",
            kind: "static",
            to: "game/stories/poc/src/index.ts",
          },
        ),
    ],
    [
      "E2E imports PoC",
      (pair: GraphFixturePairV1) =>
        addNodeAndEdgeV1(
          pair.e2e,
          { id: "game/stories/poc/src/index.ts", owningPackage: "@project-tavern/story-poc" },
          {
            from: "game/stories/e2e/src/index.ts",
            kind: "static",
            to: "game/stories/poc/src/index.ts",
          },
        ),
    ],
    [
      "default Story closure imports TSX",
      (pair: GraphFixturePairV1) =>
        addNodeAndEdgeV1(
          pair.e2e,
          {
            id: "game/stories/e2e/src/forbidden-default.tsx",
            owningPackage: "@project-tavern/story-e2e",
          },
          {
            from: "game/stories/e2e/src/index.ts",
            kind: "static",
            to: "game/stories/e2e/src/forbidden-default.tsx",
          },
        ),
    ],
    [
      "production imports AIGC",
      (pair: GraphFixturePairV1) =>
        addNodeAndEdgeV1(
          pair.poc,
          { id: "art-source/aigc/leak.ts", owningPackage: "@project-tavern/story-poc" },
          {
            from: "game/stories/poc/src/story-definition.ts",
            kind: "static",
            to: "art-source/aigc/leak.ts",
          },
        ),
    ],
    [
      "production imports references",
      (pair: GraphFixturePairV1) =>
        addNodeAndEdgeV1(
          pair.poc,
          { id: "references/leak.ts", owningPackage: "@sillymaker/web" },
          {
            from: "engine/packages/web/src/index.ts",
            kind: "static",
            to: "references/leak.ts",
          },
        ),
    ],
    [
      "a third HTML root",
      (pair: GraphFixturePairV1) =>
        addNodeAndEdgeV1(
          pair.e2e,
          { id: "game/stories/e2e/admin.html", owningPackage: "@project-tavern/story-e2e" },
          {
            from: "game/stories/e2e/src/application/entry.tsx",
            kind: "static",
            to: "game/stories/e2e/admin.html",
          },
        ),
    ],
  ])("rejects %s", async (_name, mutate) => {
    await expect(verifyApplicationGraphsV1(projectGraphFixtureV1(mutate).input)).rejects.toThrow(
      /ui\.application_graph_forbidden/u,
    );
  });

  it("checks every present default Story root instead of allowing a safe root to mask another", async () => {
    const fixture = projectGraphFixtureV1((pair) => {
      addNodeAndEdgeV1(
        pair.poc,
        {
          id: "game/stories/poc/src/index.ts",
          owningPackage: "@project-tavern/story-poc",
        },
        {
          from: "game/stories/poc/src/application/entry.tsx",
          kind: "static",
          to: "game/stories/poc/src/index.ts",
        },
      );
      addNodeAndEdgeV1(
        pair.poc,
        {
          id: "game/stories/poc/src/forbidden-default.tsx",
          owningPackage: "@project-tavern/story-poc",
        },
        {
          from: "game/stories/poc/src/story-definition.ts",
          kind: "static",
          to: "game/stories/poc/src/forbidden-default.tsx",
        },
      );
    });
    await expect(verifyApplicationGraphsV1(fixture.input)).rejects.toThrow(
      /ui\.application_graph_forbidden/u,
    );
  });

  it.each([
    ["absolute", "/tmp/leak.ts"],
    ["backslash", "game\\stories\\poc\\leak.ts"],
    ["parent traversal", "game/stories/poc/../leak.ts"],
    ["unknown virtual", "virtual:unknown/module"],
  ])("rejects a %s node ID", async (_name, id) => {
    const fixture = projectGraphFixtureV1((pair) => {
      addNodeAndEdgeV1(
        pair.poc,
        { id, owningPackage: "@project-tavern/story-poc" },
        { from: "game/stories/poc/src/story-definition.ts", kind: "static", to: id },
      );
    });
    await expect(verifyApplicationGraphsV1(fixture.input)).rejects.toThrow(
      /ui\.application_graph_forbidden/u,
    );
  });

  it("rejects source maps and unexpected tooling specifiers", async () => {
    const sourceMap = projectGraphFixtureV1((pair) => {
      pair.poc.chunks.push({
        dynamicImports: [],
        entry: null,
        fileName: "assets/poc-application.js.map",
        imports: [],
      });
    });
    await expect(verifyApplicationGraphsV1(sourceMap.input)).rejects.toThrow(
      /ui\.application_graph_forbidden/u,
    );

    const specifier = projectGraphFixtureV1((pair) => {
      pair.poc.dynamicSpecifiers.push("@project-tavern/story-poc/secret");
    });
    await expect(verifyApplicationGraphsV1(specifier.input)).rejects.toThrow(
      /ui\.application_graph_forbidden/u,
    );
  });

  it.each([
    [
      "a dangling edge endpoint",
      (pair: GraphFixturePairV1) =>
        pair.e2e.edges.push({
          from: "game/stories/e2e/src/index.ts",
          kind: "static",
          to: "game/stories/e2e/src/missing.ts",
        }),
    ],
    [
      "an orphan node",
      (pair: GraphFixturePairV1) =>
        pair.e2e.nodes.push({
          id: "game/stories/e2e/src/orphan.ts",
          owningPackage: "@project-tavern/story-e2e",
        }),
    ],
    [
      "a duplicate node",
      (pair: GraphFixturePairV1) => pair.e2e.nodes.push({ ...pair.e2e.nodes[0]! }),
    ],
    [
      "a dangling chunk import",
      (pair: GraphFixturePairV1) => pair.e2e.chunks[0]!.imports.push("assets/missing-shared.js"),
    ],
    [
      "an orphan chunk",
      (pair: GraphFixturePairV1) =>
        pair.e2e.chunks.push({
          dynamicImports: [],
          entry: null,
          fileName: "assets/orphan.js",
          imports: [],
        }),
    ],
    [
      "React in the default Story closure",
      (pair: GraphFixturePairV1) =>
        addNodeAndEdgeV1(
          pair.e2e,
          {
            id: "node_modules/.pnpm/react@19.2.4/node_modules/react/index.js",
            owningPackage: "react",
          },
          {
            from: "game/stories/e2e/src/index.ts",
            kind: "static",
            to: "node_modules/.pnpm/react@19.2.4/node_modules/react/index.js",
          },
        ),
    ],
    [
      "UI in the Node-safe tooling closure",
      (pair: GraphFixturePairV1) =>
        addNodeAndEdgeV1(
          pair.poc,
          { id: "engine/packages/ui/src/index.ts", owningPackage: "@sillymaker/ui" },
          {
            from: "game/stories/poc/src/tooling/index.ts",
            kind: "static",
            to: "engine/packages/ui/src/index.ts",
          },
        ),
    ],
    [
      "TSX in the Node-safe tooling closure",
      (pair: GraphFixturePairV1) =>
        addNodeAndEdgeV1(
          pair.poc,
          {
            id: "game/stories/poc/src/tooling/forbidden.tsx",
            owningPackage: "@project-tavern/story-poc",
          },
          {
            from: "game/stories/poc/src/tooling/index.ts",
            kind: "static",
            to: "game/stories/poc/src/tooling/forbidden.tsx",
          },
        ),
    ],
  ])("rejects %s", async (_name, mutate) => {
    await expect(verifyApplicationGraphsV1(projectGraphFixtureV1(mutate).input)).rejects.toThrow(
      /ui\.application_graph_forbidden/u,
    );
  });

  it("rejects unsorted and duplicate collection records", async () => {
    const unsorted = projectGraphFixtureV1(undefined, (pair) => {
      pair.e2e.nodes.reverse();
      return { e2e: canonicalJsonBytes(pair.e2e) };
    });
    await expect(verifyApplicationGraphsV1(unsorted.input)).rejects.toThrow(
      /ui\.application_graph_forbidden/u,
    );

    const duplicateSpecifier = projectGraphFixtureV1((pair) => {
      pair.poc.dynamicSpecifiers.push(pair.poc.dynamicSpecifiers[0]!);
    });
    await expect(verifyApplicationGraphsV1(duplicateSpecifier.input)).rejects.toThrow(
      /ui\.application_graph_forbidden/u,
    );
  });

  it("rejects an unexpected developer entry and a displaced fixed tooling import", async () => {
    const developerEntry = projectGraphFixtureV1((pair) => {
      const entry = "game/stories/e2e/src/application/developer-entry.ts";
      pair.e2e.nodes.push({ id: entry, owningPackage: "@project-tavern/story-e2e" });
      pair.e2e.edges.push({
        from: "game/stories/e2e/src/application/entry.tsx",
        kind: "static",
        to: entry,
      });
      pair.e2e.chunks[0]!.dynamicImports.push("assets/developer-entry.js");
      pair.e2e.chunks.push({
        dynamicImports: [],
        entry,
        fileName: "assets/developer-entry.js",
        imports: [],
      });
    });
    await expect(verifyApplicationGraphsV1(developerEntry.input)).rejects.toThrow(
      /ui\.application_graph_forbidden/u,
    );

    const displacedTooling = projectGraphFixtureV1((pair) => {
      const edge = pair.poc.edges.find(
        (candidate) =>
          candidate.kind === "dynamic" && candidate.to === "game/stories/poc/src/tooling/index.ts",
      );
      if (edge === undefined) throw new TypeError("fixture tooling edge is missing");
      edge.from = "game/stories/poc/src/application/entry.tsx";
    });
    await expect(verifyApplicationGraphsV1(displacedTooling.input)).rejects.toThrow(
      /ui\.application_graph_forbidden/u,
    );
  });

  it("rejects a graph node without a declared workspace, dependency, or virtual owner", async () => {
    const fixture = projectGraphFixtureV1((pair) => {
      addNodeAndEdgeV1(
        pair.e2e,
        { id: "scripts/private-build-input.ts", owningPackage: "private-build-input" },
        {
          from: "game/stories/e2e/src/application/entry.tsx",
          kind: "static",
          to: "scripts/private-build-input.ts",
        },
      );
    });
    await expect(verifyApplicationGraphsV1(fixture.input)).rejects.toThrow(
      /ui\.application_graph_forbidden/u,
    );
  });

  it("rejects internal package owners disguised as node_modules dependencies", async () => {
    const fixture = projectGraphFixtureV1((pair) => {
      const disguised = "node_modules/@project-tavern/story-poc/index.js";
      addNodeAndEdgeV1(
        pair.e2e,
        { id: disguised, owningPackage: "@project-tavern/story-poc" },
        {
          from: "game/stories/e2e/src/application/entry.tsx",
          kind: "static",
          to: disguised,
        },
      );
    });
    await expect(verifyApplicationGraphsV1(fixture.input)).rejects.toThrow(
      /ui\.application_graph_forbidden/u,
    );

    const nestedFixture = projectGraphFixtureV1((pair) => {
      const disguised = "engine/packages/web/node_modules/@project-tavern/story-poc/index.js";
      addNodeAndEdgeV1(
        pair.e2e,
        { id: disguised, owningPackage: "@sillymaker/web" },
        {
          from: "engine/packages/web/src/index.ts",
          kind: "static",
          to: disguised,
        },
      );
    });
    await expect(verifyApplicationGraphsV1(nestedFixture.input)).rejects.toThrow(
      /ui\.application_graph_forbidden/u,
    );
  });

  it("requires one explicit chunk entry for each fixed tooling export", async () => {
    const fixture = projectGraphFixtureV1((pair) => {
      const toolingChunk = pair.e2e.chunks.find(
        (chunk) => chunk.entry === "game/stories/e2e/src/tooling.ts",
      );
      if (toolingChunk === undefined) throw new TypeError("fixture tooling chunk is missing");
      toolingChunk.entry = null;
    });
    await expect(verifyApplicationGraphsV1(fixture.input)).rejects.toThrow(
      /ui\.application_graph_forbidden/u,
    );

    const eagerChunk = projectGraphFixtureV1((pair) => {
      const applicationChunk = pair.e2e.chunks.find(
        (chunk) => chunk.entry === "game/stories/e2e/index.html",
      );
      if (applicationChunk === undefined) throw new TypeError("fixture entry chunk is missing");
      const toolingFile = "assets/e2e-tooling.js";
      applicationChunk.dynamicImports = applicationChunk.dynamicImports.filter(
        (fileName) => fileName !== toolingFile,
      );
      applicationChunk.imports.push(toolingFile);
    });
    await expect(verifyApplicationGraphsV1(eagerChunk.input)).rejects.toThrow(
      /ui\.application_graph_forbidden/u,
    );
  });

  it("rejects eager or bypass ingress into fixed tooling closures", async () => {
    const eagerToolingUi = projectGraphFixtureV1((pair) => {
      pair.poc.edges.push({
        from: "game/stories/poc/src/application/entry.tsx",
        kind: "static",
        to: "game/stories/poc/src/tooling-ui/index.ts",
      });
    });
    await expect(verifyApplicationGraphsV1(eagerToolingUi.input)).rejects.toThrow(
      /ui\.application_graph_forbidden/u,
    );

    const internalBypass = projectGraphFixtureV1((pair) => {
      const internal = "game/stories/e2e/src/tooling/debug-command-form-adapter.ts";
      pair.e2e.nodes.push({ id: internal, owningPackage: "@project-tavern/story-e2e" });
      pair.e2e.edges.push(
        { from: "game/stories/e2e/src/tooling.ts", kind: "static", to: internal },
        {
          from: "game/stories/e2e/src/application/entry.tsx",
          kind: "static",
          to: internal,
        },
      );
    });
    await expect(verifyApplicationGraphsV1(internalBypass.input)).rejects.toThrow(
      /ui\.application_graph_forbidden/u,
    );

    const diamondBypass = projectGraphFixtureV1((pair) => {
      const shared = "game/stories/e2e/src/shared-tooling-dependency.ts";
      const internal = "game/stories/e2e/src/tooling/internal-adapter.ts";
      pair.e2e.nodes.push(
        { id: shared, owningPackage: "@project-tavern/story-e2e" },
        { id: internal, owningPackage: "@project-tavern/story-e2e" },
      );
      pair.e2e.edges.push(
        { from: "game/stories/e2e/src/tooling.ts", kind: "static", to: shared },
        {
          from: "game/stories/e2e/src/application/entry.tsx",
          kind: "static",
          to: shared,
        },
        { from: shared, kind: "static", to: internal },
      );
    });
    await expect(verifyApplicationGraphsV1(diamondBypass.input)).rejects.toThrow(
      /ui\.application_graph_forbidden/u,
    );
  });

  it("strict-decodes exact manifest objects before applying graph policy", async () => {
    const extraKey = projectGraphFixtureV1(undefined, (pair) => ({
      e2e: canonicalJsonBytes({ ...pair.e2e, generatedAt: "forbidden" }),
    }));
    await expect(verifyApplicationGraphsV1(extraKey.input)).rejects.toThrow(
      /ui\.application_graph_invalid/u,
    );

    const missingKey = projectGraphFixtureV1(undefined, (pair) => {
      const { chunks: _chunks, ...withoutChunks } = pair.poc;
      return { poc: canonicalJsonBytes(withoutChunks) };
    });
    await expect(verifyApplicationGraphsV1(missingKey.input)).rejects.toThrow(
      /ui\.application_graph_invalid/u,
    );

    const nestedExtraKey = projectGraphFixtureV1(undefined, (pair) => ({
      poc: canonicalJsonBytes({
        ...pair.poc,
        nodes: pair.poc.nodes.map((node, index) =>
          index === 0 ? { ...node, absolutePath: "/tmp/leak" } : node,
        ),
      }),
    }));
    await expect(verifyApplicationGraphsV1(nestedExtraKey.input)).rejects.toThrow(
      /ui\.application_graph_invalid/u,
    );
  });

  it("distinguishes missing, invalid, and noncanonical manifests", async () => {
    const missing = projectGraphFixtureV1();
    missing.input.readFile = async () => {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    };
    await expect(verifyApplicationGraphsV1(missing.input)).rejects.toThrow(
      /ui\.application_graph_missing/u,
    );

    const unreadable = projectGraphFixtureV1();
    unreadable.input.readFile = async () => {
      throw Object.assign(new Error("EACCES"), { code: "EACCES" });
    };
    await expect(verifyApplicationGraphsV1(unreadable.input)).rejects.toMatchObject({
      code: "ui.application_graph_invalid",
    });

    const invalid = projectGraphFixtureV1(undefined, () => ({
      e2e: new TextEncoder().encode('{"contractRevision":1,"contractRevision":1}'),
    }));
    await expect(verifyApplicationGraphsV1(invalid.input)).rejects.toThrow(
      /ui\.application_graph_invalid/u,
    );

    const noncanonical = projectGraphFixtureV1(undefined, (pair) => ({
      poc: new TextEncoder().encode(`${new TextDecoder().decode(canonicalJsonBytes(pair.poc))}\n`),
    }));
    await expect(verifyApplicationGraphsV1(noncanonical.input)).rejects.toThrow(
      /ui\.application_graph_noncanonical/u,
    );
  });
});
