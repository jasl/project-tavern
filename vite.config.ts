import { createRequire } from "node:module";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin, UserConfig } from "vite";

import {
  resolveArtifactBuildConfigByApplicationIdV1,
  type ArtifactApplicationIdV1,
  type ArtifactBuildConfigV1,
  // @ts-expect-error -- the repository runs this Node-safe TypeScript source directly.
} from "./scripts/release/build-config.mts";

const repositoryRoot = import.meta.dirname;
const requireFromConfigV1 = createRequire(import.meta.url);

interface BuildIdentityModuleV1 {
  collect(root: string): Promise<unknown>;
  createPlugin(input: { readonly root: string; readonly initialIdentity: unknown }): Plugin;
}

function loadBuildIdentityModuleV1(application: ArtifactBuildConfigV1): BuildIdentityModuleV1 {
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

export async function collectProjectTavernBuildIdentityV1(
  applicationId: ArtifactApplicationIdV1,
): Promise<unknown> {
  const application = resolveArtifactBuildConfigByApplicationIdV1(applicationId);
  return await loadBuildIdentityModuleV1(application).collect(repositoryRoot);
}

export async function createProjectTavernViteConfigV1(input: {
  readonly applicationId: ArtifactApplicationIdV1;
  readonly initialBuildIdentity?: unknown;
}): Promise<UserConfig> {
  const application = resolveArtifactBuildConfigByApplicationIdV1(input.applicationId);
  const identity = loadBuildIdentityModuleV1(application);
  const initialBuildIdentity =
    input.initialBuildIdentity ?? (await identity.collect(repositoryRoot));

  return {
    root: resolve(repositoryRoot, application.storyRoot),
    base: application.base,
    publicDir: false,
    plugins: [
      identity.createPlugin({ root: repositoryRoot, initialIdentity: initialBuildIdentity }),
      react(),
    ],
    build: {
      outDir: resolve(repositoryRoot, application.outDir),
      emptyOutDir: true,
      sourcemap: application.sourcemap,
      rollupOptions: {
        input: resolve(repositoryRoot, application.applicationHtml),
      },
    },
  } satisfies UserConfig;
}

export default defineConfig(async () =>
  createProjectTavernViteConfigV1({ applicationId: "poc-web" }),
);
