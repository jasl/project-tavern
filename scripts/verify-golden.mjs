// SPDX-License-Identifier: MIT
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
export const goldenVerificationCommandV1 = Object.freeze([
  "pnpm",
  "--filter",
  "@project-tavern/story-e2e",
  "verify:golden",
]);
export function verifyGoldenV1(root) {
  const [command, ...args] = goldenVerificationCommandV1;
  if (spawnSync(command, args, { cwd: root, stdio: "inherit" }).status !== 0)
    throw new TypeError("golden verification failed");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  verifyGoldenV1(dirname(dirname(fileURLToPath(import.meta.url))));
