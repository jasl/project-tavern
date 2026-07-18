// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { spawnSync } from "node:child_process";
import { lstatSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function frozenCommandV1(command: string, args: readonly string[]) {
  return Object.freeze([command, Object.freeze([...args])] as const);
}

interface StagePresentationSpawnResultV1 {
  readonly signal: string | null;
  readonly status: number | null;
}

type StagePresentationSpawnV1 = (
  command: string,
  args: readonly string[],
  options: {
    readonly cwd: string;
    readonly shell: false;
    readonly stdio: "inherit";
  },
) => StagePresentationSpawnResultV1;

const stagePresentationRootEntriesV1 = Object.freeze([
  "dist/e2e/index.html",
  "dist/poc/index.html",
]);

function stagePresentationRootErrorV1(path: string): TypeError & {
  readonly code: "ui.story_presentation_root_missing";
  readonly path: string;
} {
  const error = new TypeError(`Prebuilt Story root is missing or invalid: ${path}`) as TypeError & {
    readonly code: "ui.story_presentation_root_missing";
    readonly path: string;
  };
  Object.defineProperties(error, {
    code: { enumerable: true, value: "ui.story_presentation_root_missing" },
    path: { enumerable: true, value: path },
  });
  return error;
}

export function assertStagePresentationRootsV1(root: string): void {
  for (const path of stagePresentationRootEntriesV1) {
    let stat;
    try {
      stat = lstatSync(join(root, path));
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === "ENOENT" || error.code === "ENOTDIR")
      ) {
        throw stagePresentationRootErrorV1(path);
      }
      throw error;
    }
    if (stat.isSymbolicLink() || !stat.isFile()) throw stagePresentationRootErrorV1(path);
  }
}

export const stagePresentationVerificationCommandsV1 = Object.freeze([
  frozenCommandV1("pnpm", [
    "--filter",
    "@sillymaker/ui",
    "exec",
    "vitest",
    "run",
    "src/runtime/runtime-presentation-store.test.ts",
    "src/stage",
    "src/characters",
    "src/interaction",
  ]),
  frozenCommandV1("pnpm", [
    "--filter",
    "@sillymaker/web",
    "exec",
    "vitest",
    "run",
    "src/preferences",
    "src/routing",
  ]),
  frozenCommandV1("pnpm", [
    "--filter",
    "@project-tavern/story-e2e",
    "exec",
    "vitest",
    "run",
    "src/presentation",
    "src/application",
  ]),
  frozenCommandV1("pnpm", [
    "--filter",
    "@project-tavern/story-poc",
    "exec",
    "vitest",
    "run",
    "src/presentation",
    "src/application",
  ]),
  frozenCommandV1("pnpm", ["test:e2e:interaction"]),
  frozenCommandV1("pnpm", ["verify:stories"]),
  frozenCommandV1("pnpm", ["verify:assets"]),
  frozenCommandV1("pnpm", ["verify:boundaries"]),
  frozenCommandV1("pnpm", ["verify:cycles"]),
  frozenCommandV1("pnpm", ["typecheck"]),
]);

export function runStagePresentationVerificationV1(
  root: string,
  spawn: StagePresentationSpawnV1 = spawnSync,
): void {
  assertStagePresentationRootsV1(root);
  for (const [command, args] of stagePresentationVerificationCommandsV1) {
    const result = spawn(command, args, {
      cwd: root,
      shell: false,
      stdio: "inherit",
    });
    if (result.status !== 0 || result.signal !== null) {
      throw new TypeError(`${command} ${args.join(" ")} failed`);
    }
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runStagePresentationVerificationV1(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));
}
