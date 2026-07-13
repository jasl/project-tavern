// SPDX-License-Identifier: MIT
import type {
  BootstrapEntropyV1,
  GameBootstrapInputV1,
  GameBootstrapResolutionResultV1,
  GamePackageResolutionFailureCodeV1,
  GamePackageResolutionFailureV1,
  GamePackageResolutionResultV1,
  GameCommandExecutorV1,
  GameDebugCommandExecutorV1,
  GameDebugCommandValidationResultV1,
  GameSimulationTypeMapV1,
  GameSimulationV1,
  GameplayModuleBindingV1,
  GameplayModuleTupleForSimulationV1,
  ModuleId,
  NonZeroUint32,
  PatchSetAdoptionDeclarationV1,
  PersistenceStatusV1,
  ResolvedAssetPresentationV1,
  ResolvedPatchValuesV1,
  ResolvedTextPresentationV1,
  RunId,
  RuntimeFaultBaseV1,
  RuntimeOperationFaultV1,
  SaveSlotHealthV1,
  SaveSlotSummaryV1,
  StateSlotId,
  StoryDevelopmentEntryV1,
} from "@sillymaker/base";
import {
  createGameSnapshotEnvelopeSchemaV1,
  createSaveRecordEnvelopeSchemaV1,
  createTransactionalRngV1,
  defineGameplayModule,
  defineGamePackage,
  defineGameSimulation,
  defineStoryDevelopmentEntry,
  parseModuleId,
  parseNonZeroUint32,
  parseRunId,
  parseStateSlotId,
  resolveGamePackageV1,
  rngStateV1Schema,
} from "@sillymaker/base";
import { createEngineSessionV1 } from "@sillymaker/base/runtime";
import {
  createFixedBootstrapEntropyV1,
  createSyntheticCounterGamePackageV1,
  resolveStoryForTestV1,
  strictJsonRoundTripV1,
  validateDevelopmentFixturesV1,
  validateStoryV1,
} from "@sillymaker/base/testkit";

export type Phase1ConsumerTypesV1 = {
  entropy: BootstrapEntropyV1;
  bootstrap: GameBootstrapInputV1;
  bootstrapResolution: GameBootstrapResolutionResultV1<unknown, unknown>;
  packageResolution: GamePackageResolutionResultV1<unknown>;
  packageResolutionFailure: GamePackageResolutionFailureV1;
  packageResolutionFailureCode: GamePackageResolutionFailureCodeV1;
  commandExecutor: GameCommandExecutorV1<unknown, unknown, unknown, unknown>;
  debugCommandExecutor: GameDebugCommandExecutorV1<unknown, unknown, unknown, unknown, unknown>;
  debugValidation: GameDebugCommandValidationResultV1<unknown>;
  simulation: GameSimulationTypeMapV1<GameBootstrapInputV1, unknown, unknown>;
  simulationContract: GameSimulationV1<
    GameSimulationTypeMapV1,
    readonly GameplayModuleBindingV1[],
    GameCommandExecutorV1<unknown, unknown, unknown, unknown>,
    GameDebugCommandExecutorV1<unknown, unknown, unknown, unknown, unknown>
  >;
  moduleId: ModuleId;
  seed: NonZeroUint32;
  adoption: PatchSetAdoptionDeclarationV1;
  persistenceStatus: PersistenceStatusV1;
  assetPresentation: ResolvedAssetPresentationV1<unknown, unknown, unknown>;
  patchValues: ResolvedPatchValuesV1<unknown>;
  textPresentation: ResolvedTextPresentationV1<unknown, unknown>;
  runId: RunId;
  runtimeFaultBase: RuntimeFaultBaseV1;
  runtimeOperationFault: RuntimeOperationFaultV1;
  saveSlotHealth: SaveSlotHealthV1;
  saveSlotSummary: SaveSlotSummaryV1;
  stateSlotId: StateSlotId;
  development: StoryDevelopmentEntryV1<unknown>;
};

export type Phase1ConsumerValuesV1 = {
  createEngineSession: typeof createEngineSessionV1;
  createFixedBootstrapEntropy: typeof createFixedBootstrapEntropyV1;
  createGameSnapshotEnvelopeSchema: typeof createGameSnapshotEnvelopeSchemaV1;
  createSaveRecordEnvelopeSchema: typeof createSaveRecordEnvelopeSchemaV1;
  createSyntheticCounterGamePackage: typeof createSyntheticCounterGamePackageV1;
  createTransactionalRng: typeof createTransactionalRngV1;
  defineGameplayModule: typeof defineGameplayModule;
  defineGamePackage: typeof defineGamePackage;
  defineGameSimulation: typeof defineGameSimulation;
  defineStoryDevelopmentEntry: typeof defineStoryDevelopmentEntry;
  parseModuleId: typeof parseModuleId;
  parseNonZeroUint32: typeof parseNonZeroUint32;
  parseRunId: typeof parseRunId;
  parseStateSlotId: typeof parseStateSlotId;
  resolveGamePackage: typeof resolveGamePackageV1;
  resolveStoryForTest: typeof resolveStoryForTestV1;
  rngStateSchema: typeof rngStateV1Schema;
  strictJsonRoundTrip: typeof strictJsonRoundTripV1;
  validateDevelopmentFixtures: typeof validateDevelopmentFixturesV1;
  validateStory: typeof validateStoryV1;
};

export type GameplayModuleDefinitionV1 = ReturnType<
  typeof defineGameplayModule<GameSimulationTypeMapV1>
>;
export type GameSimulationDefinitionV1 = ReturnType<
  typeof defineGameSimulation<GameSimulationTypeMapV1>
>;

interface WitnessTypesAV1 extends GameSimulationTypeMapV1<
  GameBootstrapInputV1,
  { readonly simulation: { readonly a: number } },
  { readonly cursor: number }
> {
  readonly command: { readonly kind: "witness.a" };
}

interface WitnessTypesBV1 extends GameSimulationTypeMapV1<
  GameBootstrapInputV1,
  { readonly simulation: { readonly b: number } },
  { readonly cursor: number }
> {
  readonly command: { readonly kind: "witness.b" };
}

type AssertNever<TValue extends never> = TValue;
export type CrossWitnessModuleIsRejectedV1 = AssertNever<
  GameplayModuleTupleForSimulationV1<
    WitnessTypesAV1,
    readonly [GameplayModuleBindingV1<WitnessTypesBV1>]
  >[0]
>;

// @ts-expect-error the public helper requires defineGameplayModule<TTypes>()(binding)
export type ForbiddenOneStageGameplayModuleInputV1 = Parameters<typeof defineGameplayModule>[0];
// @ts-expect-error the public helper requires defineGameSimulation<TTypes>()(simulation)
export type ForbiddenOneStageGameSimulationInputV1 = Parameters<typeof defineGameSimulation>[0];

// @ts-expect-error parsers do not carry a V1 suffix
export { parseModuleIdV1 } from "@sillymaker/base";
// @ts-expect-error parsers do not carry a V1 suffix
export { parseNonZeroUint32V1 } from "@sillymaker/base";
// @ts-expect-error parsers do not carry a V1 suffix
export { parseStateSlotIdV1 } from "@sillymaker/base";
// @ts-expect-error removed after Phase 1
export type OldProfile = import("@sillymaker/base").GameProfileV1;
// @ts-expect-error removed after Phase 1
export { defineGameProfile } from "@sillymaker/base";
// @ts-expect-error removed after Phase 1
export type OldModule = import("@sillymaker/base").GameModuleBindingV1;
// @ts-expect-error removed after Phase 1
export { defineGameModule } from "@sillymaker/base";
// @ts-expect-error removed after Phase 1
export type OldCoordinator = import("@sillymaker/base").CommandCoordinatorV1;
// @ts-expect-error import closure belongs to scripts, never Base/testkit
export { buildImportClosureV1 } from "@sillymaker/base/testkit";
