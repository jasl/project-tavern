// SPDX-License-Identifier: MIT
import type {
  BootstrapEntropyV1,
  GameApplicationPortV1,
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
  LocaleId,
  LocalizedTextCatalogV1,
  ModuleId,
  NonZeroUint32,
  PatchSetAdoptionDeclarationV1,
  PersistenceStatusV1,
  ResolvedAssetPresentationV1,
  ResolvedPatchValuesV1,
  ResolvedTextPresentationV1,
  RunId,
  RunIntegrityReasonV1,
  RunIntegrityV1,
  RuntimeFaultBaseV1,
  RuntimeOperationFaultV1,
  SaveSlotHealthV1,
  SaveSlotSummaryV1,
  StateSlotId,
  StoryToolingEntryV1,
  TextCatalogSetV1,
} from "@sillymaker/base";
import {
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
  createSaveRecordEnvelopeSchemaV1,
  createTransactionalRngV1,
  defineGameplayModule,
  defineGamePackage,
  defineGameSimulation,
  defineStoryToolingEntry,
  parseModuleId,
  parseNonZeroUint32,
  parseLocaleId,
  parseRunId,
  parseStateSlotId,
  parseTextCatalogSetV1,
  resolveGamePackageV1,
  rngStateV1Schema,
  runIntegrityV1Schema,
} from "@sillymaker/base";
import { createGameSessionV1 } from "@sillymaker/base/runtime";
import type {
  GameSessionCompositionV1,
  GameSessionInputV1,
  GameSessionRuntimeControlV1,
  GameSessionV1,
} from "@sillymaker/base/runtime";
import {
  createFixedBootstrapEntropyV1,
  createSyntheticCounterGamePackageV1,
  resolveStoryForTestV1,
  strictJsonRoundTripV1,
  validateToolingFixturesV1,
  validateStoryV1,
} from "@sillymaker/base/testkit";

export type Phase1ConsumerTypesV1 = {
  application: GameApplicationPortV1<unknown, unknown, unknown, unknown, unknown, unknown>;
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
  gameSession: GameSessionV1<GameSimulationTypeMapV1>;
  gameSessionComposition: GameSessionCompositionV1<GameSimulationTypeMapV1>;
  gameSessionInput: GameSessionInputV1<GameSimulationTypeMapV1>;
  gameSessionRuntimeControl: GameSessionRuntimeControlV1<unknown>;
  simulationContract: GameSimulationV1<
    GameSimulationTypeMapV1,
    readonly GameplayModuleBindingV1[],
    GameCommandExecutorV1<unknown, unknown, unknown, unknown>,
    GameDebugCommandExecutorV1<unknown, unknown, unknown, unknown, unknown>
  >;
  moduleId: ModuleId;
  localeId: LocaleId;
  localizedTextCatalog: LocalizedTextCatalogV1;
  seed: NonZeroUint32;
  adoption: PatchSetAdoptionDeclarationV1;
  persistenceStatus: PersistenceStatusV1;
  assetPresentation: ResolvedAssetPresentationV1<unknown, unknown, unknown>;
  patchValues: ResolvedPatchValuesV1<unknown>;
  textPresentation: ResolvedTextPresentationV1<unknown, unknown>;
  textCatalogSet: TextCatalogSetV1;
  runId: RunId;
  runIntegrity: RunIntegrityV1;
  runIntegrityReason: RunIntegrityReasonV1;
  runtimeFaultBase: RuntimeFaultBaseV1;
  runtimeOperationFault: RuntimeOperationFaultV1;
  saveSlotHealth: SaveSlotHealthV1;
  saveSlotSummary: SaveSlotSummaryV1;
  stateSlotId: StateSlotId;
  tooling: StoryToolingEntryV1<unknown>;
};

export type Phase1ConsumerValuesV1 = {
  createGameSession: typeof createGameSessionV1;
  createFixedBootstrapEntropy: typeof createFixedBootstrapEntropyV1;
  createGameSnapshotEnvelopeSchema: typeof createGameSnapshotEnvelopeSchemaV1;
  createPristineRunIntegrity: typeof createPristineRunIntegrityV1;
  createSaveRecordEnvelopeSchema: typeof createSaveRecordEnvelopeSchemaV1;
  createSyntheticCounterGamePackage: typeof createSyntheticCounterGamePackageV1;
  createTransactionalRng: typeof createTransactionalRngV1;
  defineGameplayModule: typeof defineGameplayModule;
  defineGamePackage: typeof defineGamePackage;
  defineGameSimulation: typeof defineGameSimulation;
  defineStoryToolingEntry: typeof defineStoryToolingEntry;
  parseModuleId: typeof parseModuleId;
  parseNonZeroUint32: typeof parseNonZeroUint32;
  parseLocaleId: typeof parseLocaleId;
  parseRunId: typeof parseRunId;
  parseStateSlotId: typeof parseStateSlotId;
  parseTextCatalogSet: typeof parseTextCatalogSetV1;
  resolveGamePackage: typeof resolveGamePackageV1;
  resolveStoryForTest: typeof resolveStoryForTestV1;
  rngStateSchema: typeof rngStateV1Schema;
  runIntegritySchema: typeof runIntegrityV1Schema;
  strictJsonRoundTrip: typeof strictJsonRoundTripV1;
  validateToolingFixtures: typeof validateToolingFixturesV1;
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

export const inferredResolvedGameV1 = resolveStoryForTestV1(createSyntheticCounterGamePackageV1());
export const inferredSyntheticProgramKindV1: "synthetic-counter" =
  inferredResolvedGameV1.simulationProgram.kind;
export const inferredSyntheticPresentationKindV1: "synthetic-presentation" =
  inferredResolvedGameV1.presentation.kind;
export const inferredSyntheticStageSceneIdV1: import("@sillymaker/base").StageSceneId =
  inferredResolvedGameV1.sceneGraph.stageScenes[0]!.stageSceneId;
export const inferredSyntheticGameProjectionV1 =
  inferredResolvedGameV1.gameSimulation.projectGameView;

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
// @ts-expect-error removed after the Story tooling rename
export type OldDevelopmentEntry = import("@sillymaker/base").StoryDevelopmentEntryV1<unknown>;
// @ts-expect-error removed after the Story tooling rename
export { defineStoryDevelopmentEntry } from "@sillymaker/base";
// @ts-expect-error removed after the Story tooling rename
export { validateDevelopmentFixturesV1 } from "@sillymaker/base/testkit";
// @ts-expect-error replaced by ResolvedGameV1
export type OldResolvedStory = import("@sillymaker/base").ResolvedStoryV1;
// @ts-expect-error removed after the GameSession rename
export type { EngineSessionV1 as OldEngineSessionV1 } from "@sillymaker/base/runtime";
// @ts-expect-error removed after the GameSession rename
export type { EngineSessionRuntimeControlV1 as OldEngineSessionRuntimeControlV1 } from "@sillymaker/base/runtime";
// @ts-expect-error removed after the GameSession rename
export { createEngineSessionV1 } from "@sillymaker/base/runtime";
// @ts-expect-error RunIntegrity mutation authority is Session-internal
export { markRunModifiedV1 } from "@sillymaker/base";
// @ts-expect-error RunIntegrity mutation authority is Session-internal
export type ForbiddenIntegrityDirectiveV1 = import("@sillymaker/base").IntegrityDirectiveV1;
// @ts-expect-error RunIntegrity mutation authority is not exposed by the runtime barrel
export { markRunModifiedV1 as runtimeMarkRunModifiedV1 } from "@sillymaker/base/runtime";
// @ts-expect-error RunIntegrity directives are not exposed by the runtime barrel
export type { IntegrityDirectiveV1 } from "@sillymaker/base/runtime";
// @ts-expect-error import closure belongs to scripts, never Base/testkit
export { buildImportClosureV1 } from "@sillymaker/base/testkit";
