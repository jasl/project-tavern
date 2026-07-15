// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function frozenCommandV1(command: string, args: readonly string[]) {
  return Object.freeze([command, Object.freeze([...args])] as const);
}

export const semanticVerificationCommandsV1 = Object.freeze([
  frozenCommandV1("pnpm", ["--filter", "@project-tavern/story-e2e", "verify:semantic"]),
  frozenCommandV1("pnpm", ["--filter", "@project-tavern/story-poc", "verify:semantic"]),
]);

export function runSemanticVerificationV1(root: string, spawn: typeof spawnSync = spawnSync): void {
  for (const [command, args] of semanticVerificationCommandsV1) {
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
  runSemanticVerificationV1(dirname(dirname(fileURLToPath(import.meta.url))));
}
