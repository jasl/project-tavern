// SPDX-License-Identifier: MIT
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function frozenCommandV1(command: string, args: readonly string[]) {
  return Object.freeze([command, Object.freeze([...args])] as const);
}

export const uiRuntimeVerificationCommandsV1 = Object.freeze([
  frozenCommandV1("pnpm", ["--filter", "@sillymaker/ui", "test"]),
  frozenCommandV1("pnpm", [
    "--filter",
    "@sillymaker/web",
    "exec",
    "vitest",
    "run",
    "src/assets",
    "src/input",
  ]),
  frozenCommandV1("pnpm", ["exec", "vitest", "run", "scripts/assets"]),
  frozenCommandV1("pnpm", ["lint:styles"]),
  frozenCommandV1("pnpm", ["verify:assets"]),
]);

export function runUiRuntimeVerificationV1(
  root: string,
  spawn: typeof spawnSync = spawnSync,
): void {
  for (const [command, args] of uiRuntimeVerificationCommandsV1) {
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
  runUiRuntimeVerificationV1(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));
}
