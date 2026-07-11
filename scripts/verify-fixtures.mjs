// SPDX-License-Identifier: MIT
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
export const fixtureVerificationCommandV1 = Object.freeze([
  "pnpm",
  "--filter",
  "@project-tavern/story-sandbox",
  "verify:fixtures",
]);
export function verifyFixturesV1(root) {
  const [command, ...args] = fixtureVerificationCommandV1;
  if (spawnSync(command, args, { cwd: root, stdio: "inherit" }).status !== 0)
    throw new TypeError("fixture verification failed");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  verifyFixturesV1(dirname(dirname(fileURLToPath(import.meta.url))));
