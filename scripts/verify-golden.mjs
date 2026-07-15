// SPDX-License-Identifier: MIT
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
export const goldenVerificationCommandV1 = Object.freeze([
  Object.freeze([
    "pnpm",
    Object.freeze(["--filter", "@project-tavern/story-e2e", "verify:golden"]),
  ]),
  Object.freeze([
    "pnpm",
    Object.freeze(["--filter", "@project-tavern/story-poc", "verify:golden"]),
  ]),
]);
export function verifyGoldenV1(root) {
  for (const [command, args] of goldenVerificationCommandV1) {
    if (spawnSync(command, args, { cwd: root, stdio: "inherit" }).status !== 0)
      throw new TypeError("golden verification failed");
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  verifyGoldenV1(dirname(dirname(fileURLToPath(import.meta.url))));
