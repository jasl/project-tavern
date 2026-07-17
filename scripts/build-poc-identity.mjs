// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createStoryBuildIdentityOwnerV1 } from "./build-story-identity.mjs";

export const pocBuildIdentityVirtualSpecifierV1 = "virtual:project-tavern/poc-build-identity";

const repositoryRootV1 = dirname(dirname(fileURLToPath(import.meta.url)));
const ownerV1 = createStoryBuildIdentityOwnerV1({
  label: "PoC",
  storySourceRoot: "game/stories/poc/src/",
  simulation: {
    entry: "game/stories/poc/src/simulation/story-simulation-facet.ts",
    forbiddenPrefixes: ["game/stories/poc/src/presentation/"],
  },
  presentation: {
    entry: "game/stories/poc/src/presentation/story-presentation-facet.ts",
    forbiddenPrefixes: ["game/stories/poc/src/simulation/", "game/stories/poc/src/gameplay/"],
  },
  applicationEntries: [
    "game/stories/poc/src/application/entry.tsx",
    "scripts/build-story-identity.mjs",
    "scripts/collect-import-closure.mjs",
    "scripts/build-poc-identity.mjs",
    "vite.config.ts",
  ],
  virtual: {
    specifier: pocBuildIdentityVirtualSpecifierV1,
    exportName: "pocBuildIdentityV1",
    pluginName: "project-tavern-poc-build-identity",
  },
});

/** Collects the production PoC BuildIdentity input from live source bytes. */
export async function collectPocBuildIdentityV1(root = repositoryRootV1) {
  return await ownerV1.collectBuildIdentityV1(root);
}

/** Returns the exact ESM source consumed by Vite's closed PoC virtual module. */
export function renderPocBuildIdentityVirtualModuleV1(identity) {
  return ownerV1.renderVirtualModuleV1(identity);
}

/** Creates the production PoC Vite plugin without making the collector depend on Vite. */
export function createPocBuildIdentityVirtualPluginV1(input) {
  return ownerV1.createVirtualPluginV1(input);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  void collectPocBuildIdentityV1().then(
    (identity) => console.log(JSON.stringify(identity, null, 2)),
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
