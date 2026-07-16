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
export const runtimeAssetVerificationCommandV1 = Object.freeze([
  "node",
  "--experimental-strip-types",
  "scripts/assets/verify-runtime-assets.mts",
]);
export const assetVerificationCommandsV1 = Object.freeze([
  assetVerificationCommandV1,
  runtimeAssetVerificationCommandV1,
]);
export function verifyAssetsV1(root, spawn = spawnSync) {
  for (const [command, ...args] of assetVerificationCommandsV1) {
    const result = spawn(command, args, {
      cwd: root,
      shell: false,
      stdio: "inherit",
    });
    if (result.status !== 0 || (result.signal !== null && result.signal !== undefined)) {
      throw new TypeError(`asset verification failed: ${command} ${args.join(" ")}`);
    }
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  verifyAssetsV1(dirname(dirname(fileURLToPath(import.meta.url))));
