// SPDX-License-Identifier: MIT
import type {
  GameCommandExecutorV1,
  GameDebugCommandExecutorV1,
  GameDebugCommandValidationResultV1,
  GameSimulationTypeMapV1,
  GameSimulationTypeWitnessV1,
  GameSimulationV1,
  GameSnapshotEnvelopeV1,
  GameplayModuleBindingV1,
  GameplayModuleDescriptorV1,
  GameplayModuleSurfaceV1,
  GameplayModuleTupleForSimulationV1,
  ModuleId,
  StatefulGameplayModuleBindingV1,
  StatelessGameplayModuleBindingV1,
  StateSlotId,
} from "@sillymaker/base";
import {
  defineGameSimulation,
  defineGameplayModule,
  parseModuleId,
  parseStateSlotId,
} from "@sillymaker/base";

export declare const publicSnapshot: GameSnapshotEnvelopeV1<unknown, unknown>;
export const publicModuleId: ModuleId = parseModuleId("synthetic.parity");
export const publicStateSlotId: StateSlotId = parseStateSlotId("simulation.counter");
export declare const publicDefineGameSimulation: typeof defineGameSimulation;
export declare const publicDefineGameplayModule: typeof defineGameplayModule;

export type PublicGameplayTypesV1 = {
  commandExecutor: GameCommandExecutorV1<unknown, unknown, unknown, unknown>;
  debugCommandExecutor: GameDebugCommandExecutorV1<unknown, unknown, unknown, unknown, unknown>;
  debugValidation: GameDebugCommandValidationResultV1<unknown>;
  descriptor: GameplayModuleDescriptorV1;
  module: GameplayModuleBindingV1;
  moduleSurface: GameplayModuleSurfaceV1<GameSimulationTypeMapV1, unknown, unknown, unknown>;
  moduleTuple: GameplayModuleTupleForSimulationV1<GameSimulationTypeMapV1, readonly []>;
  simulation: GameSimulationV1<
    GameSimulationTypeMapV1,
    readonly GameplayModuleBindingV1[],
    GameCommandExecutorV1<unknown, unknown, unknown, unknown>,
    GameDebugCommandExecutorV1<unknown, unknown, unknown, unknown, unknown>
  >;
  stateful: StatefulGameplayModuleBindingV1<
    GameSimulationTypeMapV1,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    { readonly payload: unknown; readonly facts: readonly unknown[] },
    unknown,
    unknown
  >;
  stateless: StatelessGameplayModuleBindingV1<
    GameSimulationTypeMapV1,
    unknown,
    unknown,
    unknown,
    unknown
  >;
  typeMap: GameSimulationTypeMapV1;
  witness: GameSimulationTypeWitnessV1<GameSimulationTypeMapV1>;
};

// @ts-expect-error package internals are intentionally not exported
export type ForbiddenDeepImport = typeof import("@sillymaker/base/src/contracts/snapshot.js");
