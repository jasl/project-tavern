// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
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
  frozenCommandV1("pnpm", ["build:e2e"]),
  frozenCommandV1("pnpm", ["build:poc"]),
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
