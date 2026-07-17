// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createStoryBuildIdentityOwnerV1 } from "./build-story-identity.mjs";

export const e2eBuildIdentityVirtualSpecifierV1 = "virtual:project-tavern/e2e-build-identity";

const repositoryRootV1 = dirname(dirname(fileURLToPath(import.meta.url)));
const ownerV1 = createStoryBuildIdentityOwnerV1({
  label: "E2E",
  storySourceRoot: "game/stories/e2e/src/",
  simulation: {
    entry: "game/stories/e2e/src/simulation/story-simulation-facet.ts",
    forbiddenPrefixes: ["game/stories/e2e/src/presentation/"],
  },
  presentation: {
    entry: "game/stories/e2e/src/presentation/story-presentation-facet.ts",
    forbiddenPrefixes: ["game/stories/e2e/src/simulation/", "game/stories/e2e/src/gameplay/"],
  },
  applicationEntries: [
    "game/stories/e2e/src/application/entry.tsx",
    "scripts/build-story-identity.mjs",
    "scripts/collect-import-closure.mjs",
    "scripts/build-e2e-identity.mjs",
    "vite.config.ts",
  ],
  virtual: {
    specifier: e2eBuildIdentityVirtualSpecifierV1,
    exportName: "e2eBuildIdentityV1",
    pluginName: "project-tavern-e2e-build-identity",
  },
});

/** Collects the production E2E BuildIdentity input from live source bytes. */
export async function collectE2eBuildIdentityV1(root = repositoryRootV1) {
  return await ownerV1.collectBuildIdentityV1(root);
}

/** Returns the exact ESM source consumed by Vite's closed E2E virtual module. */
export function renderE2eBuildIdentityVirtualModuleV1(identity) {
  return ownerV1.renderVirtualModuleV1(identity);
}

/** Creates the production E2E Vite plugin without making the collector depend on Vite. */
export function createE2eBuildIdentityVirtualPluginV1(input) {
  return ownerV1.createVirtualPluginV1(input);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  void collectE2eBuildIdentityV1().then(
    (identity) => console.log(JSON.stringify(identity, null, 2)),
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
