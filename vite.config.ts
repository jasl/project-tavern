import { createRequire } from "node:module";
import { basename, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin, UserConfig } from "vite";

import {
  resolveArtifactBuildConfigByApplicationIdV1,
  type ArtifactApplicationIdV1,
  type ArtifactBuildConfigV1,
  // @ts-expect-error -- Node's strip-types runtime intentionally loads the tracked .mts source.
} from "./scripts/release/build-config.mts";

const repositoryRoot = import.meta.dirname;
const requireFromConfigV1 = createRequire(import.meta.url);
const internalViteApplicationModesV1 = new Set<ArtifactApplicationIdV1>(["e2e-web", "poc-web"]);

interface SelectedBuildIdentityModuleV1 {
  collect(root: string): Promise<unknown>;
  createPlugin(input: { readonly root: string; readonly initialIdentity: unknown }): Plugin;
}

interface SourceGraphInputV1 {
  readonly applicationId: ArtifactApplicationIdV1;
  readonly entry: string;
  readonly htmlEntry: string;
  readonly repositoryRoot: string;
}

interface SourceGraphModuleV1 {
  collect(input: SourceGraphInputV1): Plugin;
}

function loadSelectedBuildIdentityModuleV1(
  application: ArtifactBuildConfigV1,
): SelectedBuildIdentityModuleV1 {
  const loaded: unknown = requireFromConfigV1(resolve(repositoryRoot, application.identityModule));
  if (typeof loaded !== "object" || loaded === null) {
    throw new TypeError("Story BuildIdentity collector module is invalid");
  }
  const collect = Reflect.get(loaded, application.collectIdentityExport);
  const createPlugin = Reflect.get(loaded, application.createIdentityPluginExport);
  if (typeof collect !== "function" || typeof createPlugin !== "function") {
    throw new TypeError("Story BuildIdentity collector module is invalid");
  }
  return Object.freeze({
    collect: (root: string) => collect(root) as Promise<unknown>,
    createPlugin: (input: { readonly root: string; readonly initialIdentity: unknown }) =>
      createPlugin(input) as Plugin,
  });
}

function loadSourceGraphModuleV1(): SourceGraphModuleV1 {
  const loaded: unknown = requireFromConfigV1(
    resolve(repositoryRoot, "scripts/ui/source-graph-plugin.mts"),
  );
  if (typeof loaded !== "object" || loaded === null) {
    throw new TypeError("application source graph collector module is invalid");
  }
  const collect = Reflect.get(loaded, "collectApplicationGraphV1");
  if (typeof collect !== "function") {
    throw new TypeError("application source graph collector module is invalid");
  }
  return Object.freeze({
    collect: (input: SourceGraphInputV1) => collect(input) as Plugin,
  });
}

function rejectDirectViteBuildV1(argv: readonly string[]): void {
  const entry = argv[1];
  if (entry === undefined || !["vite", "vite.js"].includes(basename(entry))) return;
  if (argv.slice(2).includes("build")) {
    throw new TypeError(
      "release.invalid_build_request: direct Vite builds are forbidden; use the Story x Host builder",
    );
  }
}

function parseInternalViteModeV1(mode: string): ArtifactApplicationIdV1 {
  if (!internalViteApplicationModesV1.has(mode as ArtifactApplicationIdV1)) {
    throw new TypeError(`unsupported Project Tavern build mode: ${mode}`);
  }
  return mode as ArtifactApplicationIdV1;
}

export async function collectProjectTavernBuildIdentityV1(
  applicationId: ArtifactApplicationIdV1,
): Promise<unknown> {
  const application = resolveArtifactBuildConfigByApplicationIdV1(applicationId);
  return await loadSelectedBuildIdentityModuleV1(application).collect(repositoryRoot);
}

export async function createProjectTavernViteConfigV1(input: {
  readonly applicationId: ArtifactApplicationIdV1;
  readonly initialBuildIdentity?: unknown;
}): Promise<UserConfig> {
  const application = resolveArtifactBuildConfigByApplicationIdV1(input.applicationId);
  const html = resolve(repositoryRoot, application.applicationHtml);
  const storyRoot = resolve(repositoryRoot, application.storyRoot);
  const applicationOutDir = resolve(repositoryRoot, application.outDir);
  const htmlName = basename(html);
  const identity = loadSelectedBuildIdentityModuleV1(application);
  const sourceGraph = loadSourceGraphModuleV1();
  const initialBuildIdentity =
    input.initialBuildIdentity ?? (await identity.collect(repositoryRoot));

  return {
    root: storyRoot,
    base: application.base,
    publicDir: false,
    plugins: [
      identity.createPlugin({
        root: repositoryRoot,
        initialIdentity: initialBuildIdentity,
      }),
      react(),
      {
        name: "project-tavern-closed-application-root",
        configResolved(config) {
          const actualOutDir = resolve(config.root, config.build.outDir);
          if (resolve(config.root) !== storyRoot) {
            throw new TypeError(`caller-supplied application root is forbidden: ${config.root}`);
          }
          if (actualOutDir !== applicationOutDir) {
            throw new TypeError(`caller-supplied output directory is forbidden: ${actualOutDir}`);
          }
          if (config.publicDir !== "") {
            throw new TypeError("Story Artifact public directory must remain disabled");
          }
          if (
            config.command === "build" &&
            (config.base !== application.base ||
              config.build.emptyOutDir !== true ||
              config.build.sourcemap !== application.sourcemap)
          ) {
            throw new TypeError("Story Artifact build invariants were overridden");
          }
        },
      },
      {
        name: "project-tavern-index-html",
        enforce: "post",
        generateBundle(_options, bundle) {
          const htmlEntry = Object.entries(bundle).find(([, output]) =>
            output.fileName.endsWith(htmlName),
          );
          if (htmlEntry === undefined) {
            throw new TypeError(`missing ${application.applicationId} HTML output`);
          }
          const [, output] = htmlEntry;
          output.fileName = "index.html";
        },
      },
      sourceGraph.collect({
        applicationId: application.applicationId,
        repositoryRoot,
        htmlEntry: application.applicationHtml,
        entry: application.applicationEntry,
      }),
    ],
    build: {
      outDir: applicationOutDir,
      emptyOutDir: true,
      sourcemap: application.sourcemap,
      rollupOptions: { input: html },
    },
  } satisfies UserConfig;
}

export default defineConfig(async ({ mode }) => {
  rejectDirectViteBuildV1(process.argv);
  const applicationId = parseInternalViteModeV1(mode);
  return await createProjectTavernViteConfigV1({ applicationId });
});
