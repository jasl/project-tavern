// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  defineGamePackage,
  definePatchSlot,
  definePresentationPatchSurface,
  defineSimulationPatchSurface,
  digestCanonical,
  emptyContentMaturityFlagsV1,
  parseModuleId,
  parseStageSceneGraphV1,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "@sillymaker/base";
import type {
  PatchSlotDescriptorV1,
  PatchSurfaceV1,
  ResolvedAssetManifestV1,
  ResolvedGameV1,
  StateContractManifestV1,
} from "@sillymaker/base";

import { createE2eGameSimulationV1 } from "./profile.js";
import type { E2eGameSimulationV1, E2eSimulationProgramV1 } from "./profile.js";
import {
  materializeE2ePresentationV1,
  e2eAssetSlotsV1,
  e2eTextCatalogsV1,
} from "./presentation.js";
import type { E2ePresentationProgramV1 } from "./presentation.js";

type E2eInitialCountSlotV1 = PatchSlotDescriptorV1<
  "value",
  ReturnType<typeof parseNonNegativeSafeInteger>,
  "e2e.counter.initial-value"
>;
type E2eSimulationPatchSurfaceV1 = PatchSurfaceV1<
  { readonly initialCount: ReturnType<typeof parseNonNegativeSafeInteger> },
  { readonly initialCount: E2eInitialCountSlotV1 }
>;
type E2ePresentationPatchSurfaceV1 = PatchSurfaceV1<
  Readonly<Record<never, never>>,
  Readonly<Record<never, never>>
>;

const initialCountSlot: E2eInitialCountSlotV1 = definePatchSlot({
  symbolId: "e2e.counter.initial-value",
  kind: "value" as const,
  contractRevision: parsePositiveSafeInteger(1),
  defaultProviderSourceDigest: digestCanonical("sillymaker:patch-provider:v1", {
    source: "story.e2e",
    symbol: "e2e.counter.initial-value",
    revision: 1,
  }),
  defaultValue: parseNonNegativeSafeInteger(0),
});
const simulationPatchSurface: E2eSimulationPatchSurfaceV1 = defineSimulationPatchSurface({
  initialCount: initialCountSlot,
});
const presentationPatchSurface: E2ePresentationPatchSurfaceV1 = definePresentationPatchSurface({});
const e2eAssetPacksV1: readonly [] = Object.freeze([]);

function materializeE2eSimulationProgramV1(values: {
  readonly initialCount: number;
}): E2eSimulationProgramV1 {
  return Object.freeze({ initialCount: parseNonNegativeSafeInteger(values.initialCount) });
}

export const e2eSceneGraphV1 = parseStageSceneGraphV1({
  stageScenes: [
    {
      stageSceneId: "stage_scene.e2e.counter",
      variantIds: ["stage_scene_variant.e2e.counter.default"],
      defaultVariantId: "stage_scene_variant.e2e.counter.default",
    },
  ],
  variants: [
    {
      stageSceneId: "stage_scene.e2e.counter",
      variantId: "stage_scene_variant.e2e.counter.default",
      rendererId: "renderer.e2e.counter",
      accessibleNameTextId: "text.e2e.counter",
      backgroundAssetId: "asset.e2e.counter",
      layout: { kind: "e2e_counter" },
      actors: [],
      interactionSurfaces: [],
      content: { requiredFlags: emptyContentMaturityFlagsV1 },
    },
  ],
  characters: [],
  characterRigs: [],
  hitMaps: [],
  interactionSurfaces: [],
  interactionTargets: [],
  interactionBehaviors: [],
  contentMaturityPolicy: {
    policyRevision: 1,
    flags: [],
    presets: [],
    defaultAllowedFlags: emptyContentMaturityFlagsV1,
  },
});

const e2eStateContractManifestV1 = Object.freeze({
  contractRevision: 1 as const,
  aggregateStateSchema: Object.freeze({
    schemaId: "schema.e2e.game-state",
    revision: parsePositiveSafeInteger(1),
  }),
  moduleStateSchemas: Object.freeze([
    Object.freeze({
      moduleId: parseModuleId("e2e.counter"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze([parseStateSlotId("simulation.counter")]),
      stateSchema: Object.freeze({
        schemaId: "schema.e2e.counter-state",
        revision: parsePositiveSafeInteger(1),
      }),
    }),
  ]),
  persistentIrSchemas: Object.freeze([]),
  stableReferenceSets: Object.freeze([]),
}) satisfies StateContractManifestV1;

interface E2eSimulationFacetV1 {
  readonly stateContractRevision: ReturnType<typeof parsePositiveSafeInteger>;
  readonly stateContractManifest: typeof e2eStateContractManifestV1;
  readonly data: { readonly kind: "e2e-counter-v1" };
  readonly rules: { readonly increment: ReturnType<typeof parsePositiveSafeInteger> };
  readonly narrativeProgram: null;
  readonly patchSurface: typeof simulationPatchSurface;
  readonly materializeProgram: typeof materializeE2eSimulationProgramV1;
  readonly createGameSimulation: typeof createE2eGameSimulationV1;
}

interface E2ePresentationFacetV1 {
  readonly uiSceneGraph: typeof e2eSceneGraphV1;
  readonly textCatalogs: typeof e2eTextCatalogsV1;
  readonly assetSlots: typeof e2eAssetSlotsV1;
  readonly assetPacks: readonly [];
  readonly patchSurface: typeof presentationPatchSurface;
  readonly materializePresentation: typeof materializeE2ePresentationV1;
}

interface E2eStoryDefinitionV1 {
  readonly simulation: E2eSimulationFacetV1;
  readonly presentation: E2ePresentationFacetV1;
}

function createDefinition(): E2eStoryDefinitionV1 {
  return Object.freeze({
    simulation: Object.freeze({
      stateContractRevision: parsePositiveSafeInteger(1),
      stateContractManifest: e2eStateContractManifestV1,
      data: Object.freeze({ kind: "e2e-counter-v1" }),
      rules: Object.freeze({ increment: parsePositiveSafeInteger(1) }),
      narrativeProgram: null,
      patchSurface: simulationPatchSurface,
      materializeProgram: materializeE2eSimulationProgramV1,
      createGameSimulation: createE2eGameSimulationV1,
    }),
    presentation: Object.freeze({
      uiSceneGraph: e2eSceneGraphV1,
      textCatalogs: e2eTextCatalogsV1,
      assetSlots: e2eAssetSlotsV1,
      assetPacks: e2eAssetPacksV1,
      patchSurface: presentationPatchSurface,
      materializePresentation: materializeE2ePresentationV1,
    }),
  });
}

export const e2eStoryEntryV1 = defineGamePackage({
  contractRevision: 1,
  identity: Object.freeze({
    id: "story.e2e",
    revision: parsePositiveSafeInteger(1),
  }),
  define: createDefinition,
});

export type E2eResolvedGameV1 = ResolvedGameV1<
  E2eGameSimulationV1,
  E2eSimulationProgramV1,
  E2ePresentationProgramV1,
  typeof e2eSceneGraphV1,
  ResolvedAssetManifestV1
>;
