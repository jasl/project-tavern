// SPDX-License-Identifier: MIT
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function frozenCommandV1(command, args) {
  return Object.freeze([command, Object.freeze([...args])]);
}

export const releaseVerificationCommandsV1 = Object.freeze([
  frozenCommandV1("pnpm", ["verify"]),
  frozenCommandV1("pnpm", ["release:prepare"]),
  frozenCommandV1("pnpm", ["verify:artifact"]),
  frozenCommandV1("pnpm", ["test:e2e:prebuilt", "--project=chromium"]),
  frozenCommandV1("pnpm", ["release:repro"]),
]);

export function runReleaseVerificationV1(root, spawn = spawnSync) {
  for (const [command, args] of releaseVerificationCommandsV1) {
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
  runReleaseVerificationV1(dirname(dirname(fileURLToPath(import.meta.url))));
}
