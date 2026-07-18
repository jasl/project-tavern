// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { spawnSync } from "node:child_process";
import { registerHooks } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { collectImportClosure } from "./collect-import-closure.mjs";

const e2eNodeClosureEntriesV1 = Object.freeze([
  "game/stories/e2e/src/index.ts",
  "game/stories/e2e/src/presentation/scene-graph.ts",
]);

function frozenCommandV1(command: string, args: readonly string[]) {
  return Object.freeze([command, Object.freeze([...args])] as const);
}

export const phase2RuntimeCommandsV1 = Object.freeze([
  frozenCommandV1("pnpm", ["verify:materialization"]),
  frozenCommandV1("pnpm", ["verify:public-exports"]),
  frozenCommandV1("pnpm", ["verify:boundaries"]),
  frozenCommandV1("pnpm", ["verify:cycles"]),
  frozenCommandV1("pnpm", ["verify:stories"]),
  frozenCommandV1("pnpm", ["--filter", "@project-tavern/story-e2e", "verify:fixtures"]),
  frozenCommandV1("pnpm", ["--filter", "@project-tavern/story-e2e", "verify:golden"]),
  frozenCommandV1("pnpm", ["verify:determinism"]),
  frozenCommandV1("pnpm", ["--filter", "@project-tavern/story-e2e", "verify:semantic"]),
  frozenCommandV1("pnpm", ["typecheck"]),
  frozenCommandV1("pnpm", ["test"]),
  frozenCommandV1("pnpm", ["build:e2e"]),
  frozenCommandV1("pnpm", ["verify:bundle"]),
  frozenCommandV1("pnpm", ["verify:artifact"]),
  frozenCommandV1("pnpm", ["test:e2e:smoke"]),
]);

/**
 * Verifies the default E2E Story closure from live source paths, then imports the same entries
 * through Node's strip-only TypeScript runtime. The temporary resolver only maps the repository's
 * explicit `.js` runtime specifiers back to their checked-in `.ts` sources.
 */
export async function verifyE2eNodeClosureV1(root: string): Promise<readonly string[]> {
  const closure = await collectImportClosure(root, e2eNodeClosureEntriesV1);
  if (closure.errors.length > 0) {
    throw new TypeError(`E2E Node closure is invalid:\n${closure.errors.join("\n")}`);
  }

  const forbiddenPaths = closure.paths.filter(
    (path) =>
      path.endsWith(".tsx") ||
      path.startsWith("game/stories/e2e/src/application/") ||
      path === "game/stories/e2e/src/tooling.ts",
  );
  if (forbiddenPaths.length > 0) {
    throw new TypeError(`E2E Node closure contains forbidden paths: ${forbiddenPaths.join(", ")}`);
  }

  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        if (specifier.endsWith(".js")) {
          return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
        }
        throw error;
      }
    },
  });

  try {
    const [storyModule, sceneGraphModule] = await Promise.all(
      e2eNodeClosureEntriesV1.map((path) => import(pathToFileURL(join(root, path)).href)),
    );
    if (
      !Object.hasOwn(storyModule, "e2eStoryEntryV1") ||
      !Object.hasOwn(sceneGraphModule, "e2eSceneGraphV1")
    ) {
      throw new TypeError("E2E Node closure is missing its default Story or SceneGraph export");
    }
  } finally {
    hooks.deregister();
  }

  return closure.paths;
}

export function runPhase2RuntimeV1(root: string, spawn: typeof spawnSync = spawnSync): void {
  for (const [command, args] of phase2RuntimeCommandsV1) {
    const result = spawn(command, args, {
      cwd: root,
      shell: false,
      stdio: "inherit",
    });
    if (result.status !== 0) {
      throw new TypeError(`${command} ${args.join(" ")} failed`);
    }
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  await verifyE2eNodeClosureV1(root);
  runPhase2RuntimeV1(root);
}
