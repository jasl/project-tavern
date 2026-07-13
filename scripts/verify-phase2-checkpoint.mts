// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function frozenCommandV1(command: string, args: readonly string[]) {
  return Object.freeze([command, Object.freeze([...args])] as const);
}

export const phase2CheckpointCommandsV1 = Object.freeze([
  frozenCommandV1("pnpm", ["format:check"]),
  frozenCommandV1("pnpm", ["verify:docs"]),
  frozenCommandV1("pnpm", ["lint"]),
  frozenCommandV1("pnpm", ["verify:boundaries"]),
  frozenCommandV1("pnpm", ["verify:cycles"]),
  frozenCommandV1("pnpm", ["verify:public-exports"]),
  frozenCommandV1("pnpm", ["verify:stories"]),
  frozenCommandV1("pnpm", ["verify:assets"]),
  frozenCommandV1("pnpm", ["verify:ui"]),
  frozenCommandV1("pnpm", ["test:scripts"]),
  frozenCommandV1("pnpm", ["typecheck"]),
  frozenCommandV1("pnpm", ["test"]),
  frozenCommandV1("pnpm", ["build"]),
]);

export function runPhase2CheckpointV1(root: string, spawn: typeof spawnSync = spawnSync): void {
  for (const [command, args] of phase2CheckpointCommandsV1) {
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
  runPhase2CheckpointV1(dirname(dirname(fileURLToPath(import.meta.url))));
}
