// SPDX-License-Identifier: MIT
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
export const storyVerificationCommandV1 = Object.freeze([
  "pnpm",
  Object.freeze(["--filter", "@project-tavern/story-sandbox", "test"]),
]);
export function verifyStoriesV1(root) {
  const result = spawnSync(storyVerificationCommandV1[0], storyVerificationCommandV1[1], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) throw new TypeError("Story verification failed");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyStoriesV1(dirname(dirname(fileURLToPath(import.meta.url))));
}
