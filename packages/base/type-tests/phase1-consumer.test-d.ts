// SPDX-License-Identifier: MIT
import type {
  BootstrapEntropyV1,
  GameBootstrapInputV1,
  GameBootstrapResolutionResultV1,
  GamePackageResolutionFailureCodeV1,
  GamePackageResolutionFailureV1,
  GamePackageResolutionResultV1,
  GameProfileTypeMapV1,
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
} from "@project-tavern/base";
import {
  createGameSnapshotEnvelopeSchemaV1,
  createSaveRecordEnvelopeSchemaV1,
  createTransactionalRngV1,
  defineGameModule,
  defineGamePackage,
  defineGameProfile,
  defineStoryDevelopmentEntry,
  parseModuleId,
  parseNonZeroUint32,
  parseRunId,
  parseStateSlotId,
  resolveGamePackageV1,
  rngStateV1Schema,
} from "@project-tavern/base";
import { createEngineSessionV1 } from "@project-tavern/base/runtime";
import {
  createFixedBootstrapEntropyV1,
  createSyntheticCounterGamePackageV1,
  resolveStoryForTestV1,
  strictJsonRoundTripV1,
  validateDevelopmentFixturesV1,
  validateStoryV1,
} from "@project-tavern/base/testkit";

export type Phase1ConsumerTypesV1 = {
  entropy: BootstrapEntropyV1;
  bootstrap: GameBootstrapInputV1;
  bootstrapResolution: GameBootstrapResolutionResultV1<unknown, unknown>;
  packageResolution: GamePackageResolutionResultV1<unknown>;
  packageResolutionFailure: GamePackageResolutionFailureV1;
  packageResolutionFailureCode: GamePackageResolutionFailureCodeV1;
  profile: GameProfileTypeMapV1<GameBootstrapInputV1, unknown, unknown>;
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
  defineGameModule: typeof defineGameModule;
  defineGamePackage: typeof defineGamePackage;
  defineGameProfile: typeof defineGameProfile;
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

// @ts-expect-error parsers do not carry a V1 suffix
export { parseModuleIdV1 } from "@project-tavern/base";
// @ts-expect-error parsers do not carry a V1 suffix
export { parseNonZeroUint32V1 } from "@project-tavern/base";
// @ts-expect-error parsers do not carry a V1 suffix
export { parseStateSlotIdV1 } from "@project-tavern/base";
// @ts-expect-error import closure belongs to scripts, never Base/testkit
export { buildImportClosureV1 } from "@project-tavern/base/testkit";
