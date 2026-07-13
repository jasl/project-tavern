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

import { createSandboxGameSimulationV1 } from "./profile.js";
import type { SandboxGameSimulationV1, SandboxSimulationProgramV1 } from "./profile.js";
import {
  materializeSandboxPresentationV1,
  sandboxAssetSlotsV1,
  sandboxTextCatalogsV1,
} from "./presentation.js";
import type { SandboxPresentationProgramV1 } from "./presentation.js";

type SandboxInitialCountSlotV1 = PatchSlotDescriptorV1<
  "value",
  ReturnType<typeof parseNonNegativeSafeInteger>,
  "sandbox.counter.initial-value"
>;
type SandboxSimulationPatchSurfaceV1 = PatchSurfaceV1<
  { readonly initialCount: ReturnType<typeof parseNonNegativeSafeInteger> },
  { readonly initialCount: SandboxInitialCountSlotV1 }
>;
type SandboxPresentationPatchSurfaceV1 = PatchSurfaceV1<
  Readonly<Record<never, never>>,
  Readonly<Record<never, never>>
>;

const initialCountSlot: SandboxInitialCountSlotV1 = definePatchSlot({
  symbolId: "sandbox.counter.initial-value",
  kind: "value" as const,
  contractRevision: parsePositiveSafeInteger(1),
  defaultProviderSourceDigest: digestCanonical("sillymaker:patch-provider:v1", {
    source: "story.sandbox",
    symbol: "sandbox.counter.initial-value",
    revision: 1,
  }),
  defaultValue: parseNonNegativeSafeInteger(0),
});
const simulationPatchSurface: SandboxSimulationPatchSurfaceV1 = defineSimulationPatchSurface({
  initialCount: initialCountSlot,
});
const presentationPatchSurface: SandboxPresentationPatchSurfaceV1 = definePresentationPatchSurface(
  {},
);
const sandboxAssetPacksV1: readonly [] = Object.freeze([]);

function materializeSandboxSimulationProgramV1(values: {
  readonly initialCount: number;
}): SandboxSimulationProgramV1 {
  return Object.freeze({ initialCount: parseNonNegativeSafeInteger(values.initialCount) });
}

export const sandboxSceneGraphV1 = parseStageSceneGraphV1({
  stageScenes: [
    {
      stageSceneId: "stage_scene.sandbox.counter",
      variantIds: ["stage_scene_variant.sandbox.counter.default"],
      defaultVariantId: "stage_scene_variant.sandbox.counter.default",
    },
  ],
  variants: [
    {
      stageSceneId: "stage_scene.sandbox.counter",
      variantId: "stage_scene_variant.sandbox.counter.default",
      rendererId: "renderer.sandbox.counter",
      accessibleNameTextId: "text.sandbox.counter",
      backgroundAssetId: "asset.sandbox.counter",
      layout: { kind: "sandbox_counter" },
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

const sandboxStateContractManifestV1 = Object.freeze({
  contractRevision: 1 as const,
  aggregateStateSchema: Object.freeze({
    schemaId: "schema.sandbox.game-state",
    revision: parsePositiveSafeInteger(1),
  }),
  moduleStateSchemas: Object.freeze([
    Object.freeze({
      moduleId: parseModuleId("sandbox.counter"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze([parseStateSlotId("simulation.counter")]),
      stateSchema: Object.freeze({
        schemaId: "schema.sandbox.counter-state",
        revision: parsePositiveSafeInteger(1),
      }),
    }),
  ]),
  persistentIrSchemas: Object.freeze([]),
  stableReferenceSets: Object.freeze([]),
}) satisfies StateContractManifestV1;

interface SandboxSimulationFacetV1 {
  readonly stateContractRevision: ReturnType<typeof parsePositiveSafeInteger>;
  readonly stateContractManifest: typeof sandboxStateContractManifestV1;
  readonly data: { readonly kind: "sandbox-counter-v1" };
  readonly rules: { readonly increment: ReturnType<typeof parsePositiveSafeInteger> };
  readonly narrativeProgram: null;
  readonly patchSurface: typeof simulationPatchSurface;
  readonly materializeProgram: typeof materializeSandboxSimulationProgramV1;
  readonly createGameSimulation: typeof createSandboxGameSimulationV1;
}

interface SandboxPresentationFacetV1 {
  readonly uiSceneGraph: typeof sandboxSceneGraphV1;
  readonly textCatalogs: typeof sandboxTextCatalogsV1;
  readonly assetSlots: typeof sandboxAssetSlotsV1;
  readonly assetPacks: readonly [];
  readonly patchSurface: typeof presentationPatchSurface;
  readonly materializePresentation: typeof materializeSandboxPresentationV1;
}

interface SandboxStoryDefinitionV1 {
  readonly simulation: SandboxSimulationFacetV1;
  readonly presentation: SandboxPresentationFacetV1;
}

function createDefinition(): SandboxStoryDefinitionV1 {
  return Object.freeze({
    simulation: Object.freeze({
      stateContractRevision: parsePositiveSafeInteger(1),
      stateContractManifest: sandboxStateContractManifestV1,
      data: Object.freeze({ kind: "sandbox-counter-v1" }),
      rules: Object.freeze({ increment: parsePositiveSafeInteger(1) }),
      narrativeProgram: null,
      patchSurface: simulationPatchSurface,
      materializeProgram: materializeSandboxSimulationProgramV1,
      createGameSimulation: createSandboxGameSimulationV1,
    }),
    presentation: Object.freeze({
      uiSceneGraph: sandboxSceneGraphV1,
      textCatalogs: sandboxTextCatalogsV1,
      assetSlots: sandboxAssetSlotsV1,
      assetPacks: sandboxAssetPacksV1,
      patchSurface: presentationPatchSurface,
      materializePresentation: materializeSandboxPresentationV1,
    }),
  });
}

export const sandboxStoryEntryV1 = defineGamePackage({
  contractRevision: 1,
  identity: Object.freeze({
    id: "story.sandbox",
    revision: parsePositiveSafeInteger(1),
  }),
  define: createDefinition,
});

export type SandboxResolvedGameV1 = ResolvedGameV1<
  SandboxGameSimulationV1,
  SandboxSimulationProgramV1,
  SandboxPresentationProgramV1,
  typeof sandboxSceneGraphV1,
  ResolvedAssetManifestV1
>;
