// SPDX-License-Identifier: MIT
import type { GameSnapshotEnvelopeV1 } from "./snapshot.js";
import type { StrictJsonObjectV1 } from "./strict-json.js";
import type {
  DeepReadonly,
  ModuleId,
  NonZeroUint32,
  PositiveSafeInteger,
  RuntimeSchemaV1,
  StateSlotId,
} from "./values.js";

export interface GameBootstrapInputV1 {
  readonly rngSeed: NonZeroUint32;
}

export interface BootstrapEntropyV1 {
  nextUuidV4(): string;
  nextNonZeroUint32(): NonZeroUint32;
}

export interface GameplayModuleDescriptorV1 {
  readonly id: ModuleId;
  readonly contractRevision: PositiveSafeInteger;
  readonly stateSlots: readonly StateSlotId[];
  readonly dependencies: readonly ModuleId[];
}

export interface GameSimulationTypeMapV1<
  TBootstrapInput extends GameBootstrapInputV1 = GameBootstrapInputV1,
  TState = unknown,
  TRngState = unknown,
> {
  readonly bootstrapInput: TBootstrapInput;
  readonly state: TState;
  readonly rngState: TRngState;
  readonly snapshot: GameSnapshotEnvelopeV1<TState, TRngState>;
  readonly rngDrawTrace: unknown;
  readonly command: unknown;
  readonly fact: unknown;
  readonly rejection: unknown;
  readonly fault: unknown;
  readonly debugCommand: unknown;
  readonly debugValidationError: unknown;
  readonly executionContext: unknown;
  readonly queries: unknown;
  readonly viewModel: unknown;
}

export declare const gameSimulationTypeWitnessV1: unique symbol;

export interface GameSimulationTypeWitnessV1<TTypes extends GameSimulationTypeMapV1> {
  readonly [gameSimulationTypeWitnessV1]?: (types: TTypes) => TTypes;
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

export interface ModuleOwnerCapabilityV1<
  TStateSlice,
  TOwnerOperation,
  TOwnerProposal,
  TRejection,
  TDependencyPorts,
> {
  propose(
    state: DeepReadonly<TStateSlice>,
    operation: DeepReadonly<TOwnerOperation>,
    dependencies: TDependencyPorts,
  ): ModuleProposalResultV1<TOwnerProposal, TRejection>;
  apply(state: DeepReadonly<TStateSlice>, proposal: DeepReadonly<TOwnerProposal>): TStateSlice;
}

export interface ModuleQueryCapabilityV1<
  TStateSlice,
  TModuleQuery,
  TModuleQueryResult,
  TDependencyPorts,
> {
  execute(
    state: DeepReadonly<TStateSlice>,
    query: DeepReadonly<TModuleQuery>,
    dependencies: TDependencyPorts,
  ): TModuleQueryResult;
}

export interface GameplayModuleSurfaceV1<
  TTypes extends GameSimulationTypeMapV1,
  TModuleCommand,
  TModuleQuery,
  TModuleQueryResult,
> extends GameSimulationTypeWitnessV1<TTypes> {
  readonly descriptor: GameplayModuleDescriptorV1;
  readonly commandSchema: RuntimeSchemaV1<TModuleCommand> | null;
  readonly querySchema: RuntimeSchemaV1<TModuleQuery> | null;
  readonly queryResultSchema: RuntimeSchemaV1<TModuleQueryResult> | null;
}

export interface StatefulGameplayModuleBindingV1<
  TTypes extends GameSimulationTypeMapV1,
  TStateSlice,
  TModuleCommand,
  TModuleQuery,
  TModuleQueryResult,
  TOwnerOperation,
  TOwnerProposal extends ModuleOwnerProposalEnvelopeV1<unknown, TTypes["fact"]>,
  TReadPort,
  TDependencyPorts,
> extends GameplayModuleSurfaceV1<TTypes, TModuleCommand, TModuleQuery, TModuleQueryResult> {
  readonly bindingKind: "stateful";
  readonly stateSchema: RuntimeSchemaV1<TStateSlice>;
  readonly ownerOperationSchema: RuntimeSchemaV1<TOwnerOperation>;
  readonly ownerProposalSchema: RuntimeSchemaV1<TOwnerProposal>;
  readonly localInvariants: readonly ModuleLocalInvariantV1<TStateSlice, TReadPort>[];
  readonly owner: ModuleOwnerCapabilityV1<
    TStateSlice,
    TOwnerOperation,
    TOwnerProposal,
    TTypes["rejection"],
    TDependencyPorts
  >;
  readonly queries: ModuleQueryCapabilityV1<
    TStateSlice,
    TModuleQuery,
    TModuleQueryResult,
    TDependencyPorts
  > | null;
  createInitialState(bootstrap: DeepReadonly<TTypes["bootstrapInput"]>): TStateSlice;
  createReadPort(state: DeepReadonly<TStateSlice>): TReadPort;
}

export interface StatelessGameplayModuleBindingV1<
  TTypes extends GameSimulationTypeMapV1,
  TModuleCommand,
  TModuleQuery,
  TModuleQueryResult,
  TCapabilities,
> extends GameplayModuleSurfaceV1<TTypes, TModuleCommand, TModuleQuery, TModuleQueryResult> {
  readonly bindingKind: "stateless";
  readonly ownerOperationSchema: null;
  readonly ownerProposalSchema: null;
  readonly owner: null;
  readonly capabilities: TCapabilities;
}

export type GameplayModuleBindingV1<
  TTypes extends GameSimulationTypeMapV1 = GameSimulationTypeMapV1,
  TStateSlice = unknown,
  TModuleCommand = unknown,
  TModuleQuery = unknown,
  TModuleQueryResult = unknown,
  TOwnerOperation = unknown,
  TOwnerProposal extends ModuleOwnerProposalEnvelopeV1<unknown, TTypes["fact"]> =
    ModuleOwnerProposalEnvelopeV1<unknown, TTypes["fact"]>,
  TReadPort = unknown,
  TDependencyPorts = unknown,
> =
  | StatefulGameplayModuleBindingV1<
      TTypes,
      TStateSlice,
      TModuleCommand,
      TModuleQuery,
      TModuleQueryResult,
      TOwnerOperation,
      TOwnerProposal,
      TReadPort,
      TDependencyPorts
    >
  | StatelessGameplayModuleBindingV1<
      TTypes,
      TModuleCommand,
      TModuleQuery,
      TModuleQueryResult,
      TReadPort
    >;

export type GameplayModuleTupleForSimulationV1<
  TTypes extends GameSimulationTypeMapV1,
  TModules extends readonly unknown[],
> = {
  readonly [TIndex in keyof TModules]: TModules[TIndex] extends GameplayModuleBindingV1<
    TTypes,
    infer _TStateSlice,
    infer _TModuleCommand,
    infer _TModuleQuery,
    infer _TModuleQueryResult,
    infer _TOwnerOperation,
    infer _TOwnerProposal,
    infer _TReadPort,
    infer _TDependencyPorts
  >
    ? TModules[TIndex]
    : never;
};

export interface GameCommandExecutorV1<TSnapshot, TCommand, TContext, TAttempt> {
  executeAttempt(
    snapshot: DeepReadonly<TSnapshot>,
    command: DeepReadonly<TCommand>,
    context: TContext,
  ): TAttempt;
}

export type GameDebugCommandValidationResultV1<TValidationError> =
  | { readonly kind: "allowed" }
  | {
      readonly kind: "validation_failed";
      readonly errors: readonly TValidationError[];
    };

export interface GameDebugCommandExecutorV1<
  TSnapshot,
  TDebugCommand,
  TContext,
  TValidationError,
  TAttempt,
> {
  validate(
    snapshot: DeepReadonly<TSnapshot>,
    command: DeepReadonly<TDebugCommand>,
    context: TContext,
  ): GameDebugCommandValidationResultV1<TValidationError>;
  executeAttempt(
    snapshot: DeepReadonly<TSnapshot>,
    command: DeepReadonly<TDebugCommand>,
    context: TContext,
  ): TAttempt;
}

export interface GameSimulationV1<
  TTypes extends GameSimulationTypeMapV1,
  TModules extends readonly unknown[],
  TExecutor extends GameCommandExecutorV1<
    TTypes["snapshot"],
    TTypes["command"],
    TTypes["executionContext"],
    unknown
  >,
  TDebugExecutor extends GameDebugCommandExecutorV1<
    TTypes["snapshot"],
    TTypes["debugCommand"],
    TTypes["executionContext"],
    TTypes["debugValidationError"],
    unknown
  >,
> extends GameSimulationTypeWitnessV1<TTypes> {
  readonly contractRevision: 1;
  readonly modules: GameplayModuleTupleForSimulationV1<TTypes, TModules>;
  readonly stateSchema: RuntimeSchemaV1<TTypes["state"]>;
  readonly commandSchema: RuntimeSchemaV1<TTypes["command"]>;
  readonly factSchema: RuntimeSchemaV1<TTypes["fact"]>;
  readonly rejectionSchema: RuntimeSchemaV1<TTypes["rejection"]>;
  readonly debugCommandSchema: RuntimeSchemaV1<TTypes["debugCommand"]>;
  readonly debugValidationErrorSchema: RuntimeSchemaV1<TTypes["debugValidationError"]>;
  readonly commandExecutor: TExecutor;
  readonly debugCommandExecutor: TDebugExecutor;
  createBootstrapInput(entropy: BootstrapEntropyV1): TTypes["bootstrapInput"];
  createInitialState(bootstrap: DeepReadonly<TTypes["bootstrapInput"]>): TTypes["state"];
  createQueries(state: DeepReadonly<TTypes["state"]>): TTypes["queries"];
  projectGameView(queries: TTypes["queries"]): TTypes["viewModel"];
}
