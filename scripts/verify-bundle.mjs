// SPDX-License-Identifier: MIT
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { collectManagedPaths } from "./collect-import-closure.mjs";

export function verifyGameArtifactClosureV1(manifest) {
  const errors = [];
  for (const path of manifest.paths) {
    if (path.startsWith("engine/packages/base/src/testkit/")) {
      errors.push(`Artifact closure reached Base testkit: ${path}`);
    } else if (path === "references" || path.startsWith("references/")) {
      errors.push(`Artifact closure reached references: ${path}`);
    } else if (path === "art-source/aigc" || path.startsWith("art-source/aigc/")) {
      errors.push(`Artifact closure reached AIGC source: ${path}`);
    } else if (path.endsWith(".map")) {
      errors.push(`Artifact closure reached source map: ${path}`);
    } else if (isAbsolute(path) || /^[A-Za-z]:[\\/]/u.test(path)) {
      errors.push(`Artifact closure contains absolute path: ${path}`);
    }
  }
  return errors;
}

export async function verifyE2eArtifactClosureV1(root) {
  const paths = await collectManagedPaths(root, ["game/stories/e2e/src/application/entry.tsx"]);
  return verifyGameArtifactClosureV1({ paths });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const errors = await verifyE2eArtifactClosureV1(root);
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("E2E Game Artifact closure verified");
  }
}
