// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  parseAssetId,
  parseCharacterId,
  parseInteractionBehaviorId,
  parseInteractionSurfaceId,
  parsePresentationProviderId,
} from "@sillymaker/base";

import { e2eAlphaFlagV1, e2eBetaFlagV1 } from "./content-maturity-policy.js";
import { e2eSceneGraphV1 } from "./scene-graph.js";

const counterCharacterIdV1 = parseCharacterId("character.e2e.counter");
const counterSurfaceIdV1 = parseInteractionSurfaceId("surface.e2e.counter");

export const e2eInteractionFixtureV1 = Object.freeze({
  stageScenes: e2eSceneGraphV1.stageScenes,
  surfaceCharacterBindings: Object.freeze([
    Object.freeze({
      surfaceId: counterSurfaceIdV1,
      characterId: counterCharacterIdV1,
    }),
  ]),
  semanticProviders: Object.freeze([
    Object.freeze({
      providerId: parsePresentationProviderId("provider.e2e.semantic.increment"),
      actionId: "action.e2e.increment" as const,
    }),
  ]),
  cueProviders: Object.freeze([
    Object.freeze({
      providerId: parsePresentationProviderId("provider.e2e.presentation.alpha_cue"),
      behaviorId: parseInteractionBehaviorId("behavior.e2e.counter.alpha_cue"),
      cueId: "cue.e2e.counter.alpha" as const,
      assetId: parseAssetId("asset.e2e.background.alpha"),
      requiredFlags: e2eAlphaFlagV1,
    }),
    Object.freeze({
      providerId: parsePresentationProviderId("provider.e2e.presentation.beta_cue"),
      behaviorId: parseInteractionBehaviorId("behavior.e2e.counter.beta_cue"),
      cueId: "cue.e2e.counter.beta" as const,
      assetId: parseAssetId("asset.e2e.background.beta"),
      requiredFlags: e2eBetaFlagV1,
    }),
  ]),
});

export type E2eInteractionFixtureV1 = typeof e2eInteractionFixtureV1;
