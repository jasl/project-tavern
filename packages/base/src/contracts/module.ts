// SPDX-License-Identifier: MIT
import type {
  DeepReadonly,
  ModuleId,
  PositiveSafeInteger,
  RuntimeSchemaV1,
  StateSlotId,
} from "./values.js";
import type { StrictJsonObjectV1 } from "./strict-json.js";

export interface GameBootstrapInputV1 {
  readonly rngSeed: number;
}

export interface BootstrapEntropyV1 {
  nextUuidV4(): string;
  nextNonZeroUint32(): number;
}

export interface GameModuleDescriptorV1 {
  readonly id: ModuleId;
  readonly contractRevision: PositiveSafeInteger;
  readonly stateSlots: readonly StateSlotId[];
  readonly dependencies: readonly ModuleId[];
}

export interface GameProfileTypeMapV1<
  TBootstrapInput extends GameBootstrapInputV1 = GameBootstrapInputV1,
  TState = unknown,
  TRngState = unknown,
> {
  readonly bootstrapInput: TBootstrapInput;
  readonly state: TState;
  readonly rngState: TRngState;
  readonly snapshot: unknown;
  readonly rngDrawTrace: unknown;
  readonly command: unknown;
  readonly fact: unknown;
  readonly rejection: unknown;
  readonly fault: unknown;
  readonly debugCommand: unknown;
  readonly executionContext: unknown;
  readonly queries: unknown;
  readonly viewModel: unknown;
}

export declare const gameProfileTypesV1: unique symbol;

export interface GameProfileTypeWitnessV1<TTypes extends GameProfileTypeMapV1> {
  readonly [gameProfileTypesV1]?: (types: TTypes) => TTypes;
}

export interface ModuleInvariantViolationV1 {
  readonly code: string;
  readonly details: StrictJsonObjectV1;
}

export interface ModuleLocalInvariantV1<TStateSlice, TReadPort> {
  check(
    state: DeepReadonly<TStateSlice>,
    readPort: TReadPort,
  ): readonly ModuleInvariantViolationV1[];
}

export type ModuleProposalResultV1<TProposal, TRejection> =
  | { readonly kind: "proposed"; readonly proposal: TProposal }
  | { readonly kind: "rejected"; readonly rejection: TRejection };

export interface ModuleOwnerProposalEnvelopeV1<TPayload, TFact> {
  readonly payload: TPayload;
  readonly facts: readonly TFact[];
}

export interface GameModuleSurfaceV1 {
  readonly descriptor: GameModuleDescriptorV1;
  readonly commandSchema: RuntimeSchemaV1<unknown> | null;
  readonly querySchema: RuntimeSchemaV1<unknown> | null;
  readonly queryResultSchema: RuntimeSchemaV1<unknown> | null;
}

export interface StatefulGameModuleBindingV1 extends GameModuleSurfaceV1 {
  readonly bindingKind: "stateful";
  readonly stateSchema: RuntimeSchemaV1<unknown>;
  readonly ownerOperationSchema: RuntimeSchemaV1<unknown>;
  readonly ownerProposalSchema: RuntimeSchemaV1<unknown>;
  readonly localInvariants: readonly ModuleLocalInvariantV1<unknown, unknown>[];
  readonly owner: {
    propose(
      state: unknown,
      operation: unknown,
      dependencies: unknown,
    ): ModuleProposalResultV1<unknown, unknown>;
    apply(state: unknown, proposal: unknown): unknown;
  };
  readonly queries: {
    execute(state: unknown, query: unknown, dependencies: unknown): unknown;
  } | null;
  createInitialState(bootstrap: unknown): unknown;
  createReadPort(state: unknown): unknown;
}

export interface StatelessGameModuleBindingV1 extends GameModuleSurfaceV1 {
  readonly bindingKind: "stateless";
  readonly ownerOperationSchema: null;
  readonly ownerProposalSchema: null;
  readonly owner: null;
  readonly services: unknown;
}

export type GameModuleBindingV1 = StatefulGameModuleBindingV1 | StatelessGameModuleBindingV1;

export interface CommandCoordinatorV1 {
  executeAttempt(snapshot: unknown, command: unknown, context: unknown): unknown;
  createQueries(snapshot: unknown): unknown;
}

export interface GameProfileV1 {
  readonly contractRevision: 1;
  readonly modules: readonly GameModuleBindingV1[];
  readonly stateSchema: RuntimeSchemaV1<unknown>;
  readonly commandSchema: RuntimeSchemaV1<unknown>;
  readonly factSchema: RuntimeSchemaV1<unknown>;
  readonly rejectionSchema: RuntimeSchemaV1<unknown>;
  readonly debugCommandSchema: RuntimeSchemaV1<unknown>;
  readonly coordinator: CommandCoordinatorV1;
  createBootstrapInput(entropy: BootstrapEntropyV1): GameBootstrapInputV1;
  createInitialState(bootstrap: unknown): unknown;
  projectView(snapshot: unknown): unknown;
}
