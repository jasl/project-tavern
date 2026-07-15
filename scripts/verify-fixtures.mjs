// SPDX-License-Identifier: MIT
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function frozenCommandV1(command, args) {
  return Object.freeze([command, Object.freeze([...args])]);
}

export const fixtureVerificationCommandsV1 = Object.freeze([
  frozenCommandV1("pnpm", ["--filter", "@project-tavern/story-e2e", "verify:fixtures"]),
  frozenCommandV1("pnpm", ["--filter", "@project-tavern/story-poc", "verify:fixtures"]),
]);

export function verifyFixturesV1(root, spawn = spawnSync) {
  for (const [command, args] of fixtureVerificationCommandsV1) {
    const result = spawn(command, args, { cwd: root, shell: false, stdio: "inherit" });
    if (result.status !== 0) {
      throw new TypeError(`${command} ${args.join(" ")} failed`);
    }
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyFixturesV1(dirname(dirname(fileURLToPath(import.meta.url))));
}
