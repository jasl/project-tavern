// SPDX-License-Identifier: MIT
import type { DeepReadonly, PositiveSafeInteger } from "./values.js";

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

export interface StorySimulationFacetV1<
  TProfile,
  TData,
  TRules,
  TNarrativeProgram,
  TSimulationPatchSurface,
  TSimulationProgram,
> {
  readonly stateContractRevision: PositiveSafeInteger;
  readonly data: TData;
  readonly rules: TRules;
  readonly narrativeProgram: TNarrativeProgram;
  readonly patchSurface: TSimulationPatchSurface;
  materializeProgram(
    values: DeepReadonly<ResolvedPatchValuesV1<TSimulationPatchSurface>>,
  ): TSimulationProgram;
  createProfile(program: DeepReadonly<TSimulationProgram>): TProfile;
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

export interface StoryDevelopmentEntryV1<TDevelopmentSupport> {
  readonly contractRevision: 1;
  readonly storyIdentity: StorySourceIdentityV1;
  defineDevelopmentSupport(): TDevelopmentSupport;
}

export interface StoryDevelopmentSupportV1<TFixtureId, TCommand> {
  readonly fixtures: readonly {
    readonly fixtureId: TFixtureId;
    readonly seed: number;
    readonly commands: readonly TCommand[];
  }[];
}
