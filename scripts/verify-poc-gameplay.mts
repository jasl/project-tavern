// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const commandV1 = (args: readonly string[]) =>
  Object.freeze(["pnpm", Object.freeze([...args])] as const);

export const pocGameplayVerificationCommandsV1 = Object.freeze([
  commandV1(["verify:materialization"]),
  commandV1(["verify:phase2"]),
  commandV1(["verify:persistence-diagnostics"]),
  commandV1(["--filter", "@project-tavern/story-poc", "run", "test:gameplay"]),
  commandV1(["verify:public-exports"]),
  commandV1(["verify:boundaries"]),
  commandV1(["verify:cycles"]),
  commandV1(["typecheck"]),
  commandV1(["build"]),
] as const);

export function runPocGameplayVerificationV1(
  root: string,
  spawn: typeof spawnSync = spawnSync,
): void {
  for (const [command, args] of pocGameplayVerificationCommandsV1) {
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
  runPocGameplayVerificationV1(root);
}
