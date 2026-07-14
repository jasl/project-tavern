// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function frozenCommandV1(command: string, args: readonly string[]) {
  return Object.freeze([command, Object.freeze([...args])] as const);
}

export const persistenceDiagnosticsCommandsV1 = Object.freeze([
  frozenCommandV1("pnpm", ["verify:materialization"]),
  frozenCommandV1("pnpm", ["verify:phase2"]),
  frozenCommandV1("pnpm", ["--filter", "@sillymaker/base", "run", "test:runtime"]),
  frozenCommandV1("pnpm", ["--filter", "@sillymaker/web", "run", "test:host"]),
  frozenCommandV1("pnpm", ["--filter", "@project-tavern/story-e2e", "run", "test:runtime"]),
  frozenCommandV1("pnpm", ["verify:runtime-fixtures"]),
  frozenCommandV1("pnpm", ["verify:public-exports"]),
  frozenCommandV1("pnpm", ["test:scripts"]),
  frozenCommandV1("pnpm", ["verify:boundaries"]),
  frozenCommandV1("pnpm", ["build:e2e"]),
  frozenCommandV1("pnpm", ["verify:bundle"]),
  frozenCommandV1("pnpm", ["verify:artifact"]),
]);

export function runPersistenceDiagnosticsV1(
  root: string,
  spawn: typeof spawnSync = spawnSync,
): void {
  for (const [command, args] of persistenceDiagnosticsCommandsV1) {
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
  runPersistenceDiagnosticsV1(root);
}
