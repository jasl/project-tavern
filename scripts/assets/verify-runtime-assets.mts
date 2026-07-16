// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile, realpath as resolveRealpath } from "node:fs/promises";
import { registerHooks } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  DeepReadonly,
  ResolvedAssetManifestV1,
} from "../../engine/packages/base/src/index.js";

import type {
  RuntimeAssetValidationEnvironmentV1,
  RuntimeAssetValidationErrorV1,
} from "./validate-runtime.mjs";

async function loadRuntimeAssetModulesV1() {
  const typeStripHooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        if (specifier.endsWith(".mjs")) {
          return nextResolve(`${specifier.slice(0, -4)}.mts`, context);
        }
        if (specifier.endsWith(".js")) {
          return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
        }
        throw error;
      }
    },
  });

  try {
    return await Promise.all([
      import("../../engine/packages/base/src/index.js"),
      import("../../game/stories/e2e/src/story-entry.js"),
      import("../../game/stories/poc/src/story-definition.js"),
      import("./validate-runtime.mjs"),
    ]);
  } finally {
    typeStripHooks.deregister();
  }
}

const [baseModuleV1, e2eStoryModuleV1, pocStoryModuleV1, validatorModuleV1] =
  await loadRuntimeAssetModulesV1();

const { resolveGamePackageV1 } = baseModuleV1;
const { e2eStoryEntryV1 } = e2eStoryModuleV1;
const { pocStoryEntryV1 } = pocStoryModuleV1;
const { validateRuntimeAssetManifestV1 } = validatorModuleV1;

const runtimeAssetVerificationBuildIdentityV1 = Object.freeze({
  engineVersion: "SillyMaker runtime asset verification",
  engine: Object.freeze([]),
  storySimulation: Object.freeze([]),
  storyPresentation: Object.freeze([]),
  application: Object.freeze([]),
}) satisfies Parameters<typeof resolveGamePackageV1>[2];

const emptyRuntimeAssetHotfixSetV1 = Object.freeze([]);

export interface RuntimeAssetStoryCheckV1 {
  readonly storyId: string;
  resolveAssets(): ResolvedAssetManifestV1;
}

function resolutionFailureMessageV1(
  storyId: string,
  result: Extract<ReturnType<typeof resolveGamePackageV1>, { readonly kind: "failed" }>,
): string {
  return `${storyId}:${result.failure.code}:${String(
    result.failure.details.message ?? "Story resolution failed",
  )}`;
}

export const runtimeAssetStoryChecksV1: readonly RuntimeAssetStoryCheckV1[] = Object.freeze([
  Object.freeze({
    storyId: e2eStoryEntryV1.identity.id,
    resolveAssets(): ResolvedAssetManifestV1 {
      const result = resolveGamePackageV1(
        e2eStoryEntryV1,
        emptyRuntimeAssetHotfixSetV1,
        runtimeAssetVerificationBuildIdentityV1,
      );
      if (result.kind === "failed") {
        throw new TypeError(resolutionFailureMessageV1(this.storyId, result));
      }
      return result.resolved.assets;
    },
  }),
  Object.freeze({
    storyId: pocStoryEntryV1.identity.id,
    resolveAssets(): ResolvedAssetManifestV1 {
      const result = resolveGamePackageV1(
        pocStoryEntryV1,
        emptyRuntimeAssetHotfixSetV1,
        runtimeAssetVerificationBuildIdentityV1,
      );
      if (result.kind === "failed") {
        throw new TypeError(resolutionFailureMessageV1(this.storyId, result));
      }
      return result.resolved.assets;
    },
  }),
]);

export type RuntimeAssetManifestValidatorV1 = (
  manifest: DeepReadonly<ResolvedAssetManifestV1>,
  environment: RuntimeAssetValidationEnvironmentV1,
) => Promise<{ readonly errors: readonly RuntimeAssetValidationErrorV1[] }>;

export interface RuntimeAssetVerificationOptionsV1 {
  readonly environment?: RuntimeAssetValidationEnvironmentV1;
  readonly validate?: RuntimeAssetManifestValidatorV1;
}

function createNodeRuntimeAssetEnvironmentV1(root: string): RuntimeAssetValidationEnvironmentV1 {
  const repositoryRoot = resolve(root);
  return Object.freeze({
    repositoryRoot,
    async readFile(repositoryRelativePath: string): Promise<Uint8Array> {
      return new Uint8Array(await readFile(join(repositoryRoot, repositoryRelativePath)));
    },
    async realpath(repositoryRelativePath: string): Promise<string> {
      return resolveRealpath(join(repositoryRoot, repositoryRelativePath));
    },
  });
}

export async function verifyRuntimeAssetStoryChecksV1(
  stories: readonly RuntimeAssetStoryCheckV1[],
  environment: RuntimeAssetValidationEnvironmentV1,
  validate: RuntimeAssetManifestValidatorV1 = validateRuntimeAssetManifestV1,
): Promise<readonly string[]> {
  const failures: string[] = [];
  const verifiedStoryIds: string[] = [];

  for (const story of stories) {
    const manifest = story.resolveAssets();
    const result = await validate(manifest, environment);
    verifiedStoryIds.push(story.storyId);
    for (const error of result.errors) {
      failures.push(`${story.storyId}:${error.assetId}:${error.code}`);
    }
  }

  if (failures.length > 0) throw new TypeError(failures.join("\n"));
  return Object.freeze(verifiedStoryIds);
}

/** Resolves the fixed Story set and validates each resolved manifest without discovering files. */
export async function verifyRuntimeAssetsV1(
  root: string,
  options: RuntimeAssetVerificationOptionsV1 = {},
): Promise<readonly string[]> {
  return verifyRuntimeAssetStoryChecksV1(
    runtimeAssetStoryChecksV1,
    options.environment ?? createNodeRuntimeAssetEnvironmentV1(root),
    options.validate ?? validateRuntimeAssetManifestV1,
  );
}

const isMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    await verifyRuntimeAssetsV1(resolve(import.meta.dirname, "../.."));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "runtime asset verification failed");
    process.exitCode = 1;
  }
}
