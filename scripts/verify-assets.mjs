// SPDX-License-Identifier: MIT
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
export const assetVerificationCommandV1 = Object.freeze([
  "pnpm",
  "exec",
  "vitest",
  "run",
  "--project",
  "contract",
  "game/stories/e2e/src/story-contract.test.ts",
]);
export function verifyAssetsV1(root) {
  const [command, ...args] = assetVerificationCommandV1;
  if (spawnSync(command, args, { cwd: root, stdio: "inherit" }).status !== 0)
    throw new TypeError("asset verification failed");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  verifyAssetsV1(dirname(dirname(fileURLToPath(import.meta.url))));
