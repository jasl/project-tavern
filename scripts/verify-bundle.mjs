// SPDX-License-Identifier: MIT
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { collectManagedPaths } from "./collect-import-closure.mjs";

export function verifyPlayerBundleFixtureV1(manifest) {
  const errors = [];
  for (const path of manifest.paths) {
    if (path.startsWith("engine/packages/web/src/developer/")) {
      errors.push(`Player closure reached Developer path: ${path}`);
    } else if (
      path === "game/stories/sandbox/src/development.ts" ||
      path === "game/stories/sandbox/src/application/developer-entry.tsx"
    ) {
      errors.push(`Player closure reached Story development path: ${path}`);
    } else if (path.startsWith("engine/packages/base/src/testkit/")) {
      errors.push(`Player closure reached Base testkit: ${path}`);
    } else if (path === "references" || path.startsWith("references/")) {
      errors.push(`Player closure reached references: ${path}`);
    } else if (path === "art-source/aigc" || path.startsWith("art-source/aigc/")) {
      errors.push(`Player closure reached AIGC source: ${path}`);
    } else if (path.endsWith(".map")) {
      errors.push(`Player closure reached source map: ${path}`);
    } else if (isAbsolute(path) || /^[A-Za-z]:[\\/]/u.test(path)) {
      errors.push(`Player closure contains absolute path: ${path}`);
    }
  }
  return errors;
}

export async function verifyBrowserClosuresV1(root) {
  const player = await collectManagedPaths(root, [
    "game/stories/sandbox/src/application/player-entry.tsx",
  ]);
  const developer = await collectManagedPaths(root, [
    "game/stories/sandbox/src/application/developer-entry.tsx",
  ]);
  const errors = verifyPlayerBundleFixtureV1({ paths: player });
  for (const required of [
    "game/stories/sandbox/src/application/developer-entry.tsx",
    "game/stories/sandbox/src/development.ts",
    "engine/packages/web/src/developer/index.ts",
  ]) {
    if (!developer.includes(required)) errors.push(`Developer closure missing marker: ${required}`);
  }
  return errors;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const errors = await verifyBrowserClosuresV1(root);
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("browser bundle closures verified");
  }
}
