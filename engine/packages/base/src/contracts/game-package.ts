// SPDX-License-Identifier: MIT
import type { BuildProvenanceV1 } from "./provenance.js";
import type { DeepReadonly, ModuleId, PositiveSafeInteger, StateSlotId } from "./values.js";

export interface StorySourceIdentityV1 {
  readonly id: string;
  readonly revision: PositiveSafeInteger;
}

export declare const patchSurfaceValuesV1: unique symbol;

export interface PatchSurfaceValueMapWitnessV1<TValues> {
  readonly [patchSurfaceValuesV1]?: (values: TValues) => TValues;
}

export type ResolvedPatchValuesV1<TSurface> =
  TSurface extends PatchSurfaceValueMapWitnessV1<infer TValues> ? TValues : never;

export interface StateContractSchemaManifestV1 {
  readonly schemaId: string;
  readonly revision: PositiveSafeInteger;
}

export interface StateContractModuleManifestV1 {
  readonly moduleId: ModuleId;
  readonly moduleContractRevision: PositiveSafeInteger;
  readonly stateSlots: readonly StateSlotId[];
  readonly stateSchema: StateContractSchemaManifestV1;
}

export interface StateContractStableReferenceSetV1 {
  readonly setId: string;
  readonly ids: readonly string[];
}

export interface StateContractManifestV1 {
  readonly contractRevision: 1;
  readonly aggregateStateSchema: StateContractSchemaManifestV1;
  readonly moduleStateSchemas: readonly StateContractModuleManifestV1[];
  readonly persistentIrSchemas: readonly StateContractSchemaManifestV1[];
  readonly stableReferenceSets: readonly StateContractStableReferenceSetV1[];
}

export interface StorySimulationFacetV1<
  TGameSimulation,
  TData,
  TRules,
  TNarrativeProgram,
  TSimulationPatchSurface,
  TSimulationProgram,
> {
  readonly stateContractRevision: PositiveSafeInteger;
  readonly stateContractManifest: StateContractManifestV1;
  readonly data: TData;
  readonly rules: TRules;
  readonly narrativeProgram: TNarrativeProgram;
  readonly patchSurface: TSimulationPatchSurface;
  materializeProgram(
    values: DeepReadonly<ResolvedPatchValuesV1<TSimulationPatchSurface>>,
  ): TSimulationProgram;
  createGameSimulation(program: DeepReadonly<TSimulationProgram>): TGameSimulation;
}

export interface StoryPresentationFacetV1<
  TUiSceneGraph,
  TTextCatalogs,
  TAssetSlots,
  TAssetPacks,
  TPresentationPatchSurface,
  TPresentationProgram,
> {
  readonly uiSceneGraph: TUiSceneGraph;
  readonly textCatalogs: TTextCatalogs;
  readonly assetSlots: TAssetSlots;
  readonly assetPacks: TAssetPacks;
  readonly patchSurface: TPresentationPatchSurface;
  materializePresentation(
    values: DeepReadonly<ResolvedPatchValuesV1<TPresentationPatchSurface>>,
  ): TPresentationProgram;
}

export interface StoryDefinitionV1<TSimulationFacet, TPresentationFacet> {
  readonly simulation: TSimulationFacet;
  readonly presentation: TPresentationFacet;
}

export interface GamePackageV1<TSimulationFacet, TPresentationFacet> {
  readonly contractRevision: 1;
  readonly identity: StorySourceIdentityV1;
  define(): StoryDefinitionV1<TSimulationFacet, TPresentationFacet>;
}

export interface ResolvedGameV1<
  TGameSimulation,
  TSimulationProgram,
  TPresentation,
  TSceneGraph,
  TAssets,
> {
  readonly provenance: BuildProvenanceV1;
  readonly gameSimulation: TGameSimulation;
  readonly simulationProgram: TSimulationProgram;
  readonly presentation: TPresentation;
  readonly sceneGraph: TSceneGraph;
  readonly assets: TAssets;
  readonly frozen: true;
}

export interface StoryToolingEntryV1<TToolingSupport> {
  readonly contractRevision: 1;
  readonly storyIdentity: StorySourceIdentityV1;
  defineToolingSupport(): TToolingSupport;
}

export interface StoryToolingSupportV1<TFixture, TNote> {
  readonly fixtures: readonly TFixture[];
  readonly notes: readonly TNote[];
}
