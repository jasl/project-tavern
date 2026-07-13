// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { defineGamePackage, parsePositiveSafeInteger } from "@sillymaker/base";
import type { ResolvedAssetManifestV1, ResolvedGameV1 } from "@sillymaker/base";

import type { E2eGameSimulationV1 } from "./gameplay/game-simulation.js";
import type { E2ePresentationV1 } from "./presentation/presentation-program.js";
import { e2eSceneGraphV1 } from "./presentation/scene-graph.js";
import type { E2eSimulationProgramV1 } from "./simulation/program.js";
import { defineE2eStoryV1 } from "./story-definition.js";

export const e2eStoryEntryV1 = defineGamePackage({
  contractRevision: 1 as const,
  identity: Object.freeze({
    id: "story.e2e",
    revision: parsePositiveSafeInteger(1),
  }),
  define: defineE2eStoryV1,
});

export type E2eResolvedGameV1 = ResolvedGameV1<
  E2eGameSimulationV1,
  E2eSimulationProgramV1,
  E2ePresentationV1,
  typeof e2eSceneGraphV1,
  ResolvedAssetManifestV1
>;
