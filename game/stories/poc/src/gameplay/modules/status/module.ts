// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly, ModuleOwnerCapabilityV1 } from "@sillymaker/base";

import { definePocGameplayModuleV1 } from "../../contracts/define-poc-gameplay-module.js";
import { descriptorForPocModuleV1 } from "../../contracts/module-catalog.js";
import type {
  AuraDurationUnitV1,
  AuraInstanceV1,
  AuraSourceRefV1,
  ChangeReasonV1,
  PocGameBootstrapInputV1,
  PocRejectionReasonV1,
  StatusStateV1,
} from "../../contracts/types.js";
import { deepFreezePocValueV1 } from "../../contracts/values.js";
import type { AuraInstanceId } from "../../contracts/ids.js";
import {
  assertPocStatusRuntimeAuraIdentityV1,
  assertValidInitialPocStatusStateV1,
  findPocStatusDefinitionV1,
  pocStatusDependencyPortsSchemaV1,
  pocStatusInvariantV1,
  pocStatusOwnerOperationSchemaV1,
  pocStatusOwnerProposalSchemaV1,
  pocStatusStateSchemaV1,
  pocStatusStatesEqualV1,
  positiveAuraRemainingV1,
  sortPocStatusAurasV1,
  validatePocStatusAuraDurationV1,
  validatePocStatusAuraTargetV1,
} from "./contract.js";
import type {
  PocStatusDependencyPortsV1,
  PocStatusGameplayFactV1,
  PocStatusOwnerOperationV1,
  PocStatusOwnerProposalV1,
  PocStatusReadPortV1,
} from "./contract.js";

type PocStatusRejectionV1 = Extract<
  PocRejectionReasonV1,
  { readonly code: "aura.already_present" | "aura.not_found" }
>;

type PocStatusProposalResultV1 =
  | { readonly kind: "proposed"; readonly proposal: PocStatusOwnerProposalV1 }
  | { readonly kind: "rejected"; readonly rejection: PocRejectionReasonV1 };

export type PocStatusOwnerCapabilityV1 = ModuleOwnerCapabilityV1<
  StatusStateV1,
  PocStatusOwnerOperationV1,
  PocStatusOwnerProposalV1,
  PocRejectionReasonV1,
  PocStatusDependencyPortsV1
>;

export interface PocAuraCountdownInputV1 {
  readonly unit: AuraDurationUnitV1;
  readonly instanceIds: readonly AuraInstanceId[];
}

export interface PocAuraCountdownResultV1 {
  readonly state: StatusStateV1;
  readonly expired: readonly AuraInstanceId[];
}

function auraTargetKeyV1(aura: AuraInstanceV1): string {
  return aura.target.kind === "actor"
    ? `${aura.auraId}:actor:${aura.target.actorId}`
    : `${aura.auraId}:${aura.target.kind}`;
}

function rejectedStatusProposalV1(rejection: PocStatusRejectionV1): PocStatusProposalResultV1 {
  return deepFreezePocValueV1({ kind: "rejected", rejection });
}

function proposedStatusChangeV1(
  operation: PocStatusOwnerOperationV1,
  before: StatusStateV1,
  after: StatusStateV1,
  facts: readonly PocStatusGameplayFactV1[],
): PocStatusProposalResultV1 {
  return deepFreezePocValueV1({
    kind: "proposed",
    proposal: pocStatusOwnerProposalSchemaV1.parse({
      payload: { kind: operation.kind, before, after },
      facts,
    }),
  });
}

function sameTargetV1(left: AuraInstanceV1, right: AuraInstanceV1): boolean {
  return auraTargetKeyV1(left) === auraTargetKeyV1(right);
}

function findAuraByTargetV1(
  state: StatusStateV1,
  operation: Extract<PocStatusOwnerOperationV1, { readonly kind: "status.clear" }>,
): AuraInstanceV1 | undefined {
  const targetKey =
    operation.target.kind === "actor"
      ? `${operation.auraId}:actor:${operation.target.actorId}`
      : `${operation.auraId}:${operation.target.kind}`;
  return state.auras.find((aura) => auraTargetKeyV1(aura) === targetKey);
}

function assertNormalAuraSourceReasonV1(source: AuraSourceRefV1, reason: ChangeReasonV1): void {
  if (
    (source.kind === "story_event" &&
      reason.kind === "event" &&
      source.eventId === reason.eventId) ||
    (source.kind === "story_action" &&
      reason.kind === "story_action" &&
      source.actionId === reason.actionId) ||
    (source.kind === "world_action" &&
      reason.kind === "world_action" &&
      source.actionId === reason.actionId) ||
    (source.kind === "facility" &&
      reason.kind === "facility" &&
      source.facilityId === reason.facilityId)
  ) {
    return;
  }
  throw new TypeError("normal Aura source does not match its ChangeReason provenance");
}

function assertDebugAuraSourceReasonV1(
  source: AuraSourceRefV1,
  reasonId: Extract<PocStatusOwnerOperationV1, { readonly kind: "status.debug.apply" }>["reasonId"],
): void {
  if (source.kind !== "debug" || source.reasonId !== reasonId) {
    throw new TypeError("debug Aura source does not match its reasonId");
  }
}

function assertNoAuraTargetConflictV1(state: StatusStateV1, aura: AuraInstanceV1): void {
  if (state.auras.some((candidate) => sameTargetV1(candidate, aura))) {
    throw new TypeError("duplicate Aura target reached the Status proposal helper");
  }
}

function applyAuraV1(
  state: StatusStateV1,
  operation: Extract<
    PocStatusOwnerOperationV1,
    { readonly kind: "status.apply" | "status.debug.apply" }
  >,
  dependencies: PocStatusDependencyPortsV1,
): PocStatusProposalResultV1 {
  const aura = operation.aura;
  const definition = findPocStatusDefinitionV1(dependencies, aura.auraId);
  validatePocStatusAuraTargetV1(aura.target, definition);
  assertPocStatusRuntimeAuraIdentityV1(aura);
  if (operation.kind === "status.apply") {
    assertNormalAuraSourceReasonV1(aura.source, operation.reason);
    validatePocStatusAuraDurationV1(aura.duration, definition, "normal");
  } else {
    assertDebugAuraSourceReasonV1(aura.source, operation.reasonId);
    validatePocStatusAuraDurationV1(aura.duration, definition, "debug");
  }

  const conflict = state.auras.find((candidate) => sameTargetV1(candidate, aura));
  if (conflict !== undefined) {
    return rejectedStatusProposalV1({
      code: "aura.already_present",
      details: { auraId: aura.auraId, target: aura.target },
    });
  }
  assertNoAuraTargetConflictV1(state, aura);
  const after = pocStatusStateSchemaV1.parse({
    auras: sortPocStatusAurasV1([...state.auras, aura]),
  });
  const reason: ChangeReasonV1 =
    operation.kind === "status.apply"
      ? operation.reason
      : {
          kind: "debug",
          commandKind: "debug.aura.apply",
          reasonId: operation.reasonId,
        };
  return proposedStatusChangeV1(operation, state, after, [{ kind: "aura.applied", aura, reason }]);
}

function clearAuraV1(
  state: StatusStateV1,
  operation: Extract<PocStatusOwnerOperationV1, { readonly kind: "status.clear" }>,
): PocStatusProposalResultV1 {
  if (operation.reason.kind === "debug") {
    throw new TypeError("normal Aura clear may not use Debug provenance");
  }
  const aura = findAuraByTargetV1(state, operation);
  if (aura === undefined) {
    return rejectedStatusProposalV1({
      code: "aura.not_found",
      details: { auraId: operation.auraId, target: operation.target },
    });
  }
  const after = pocStatusStateSchemaV1.parse({
    auras: state.auras.filter(({ instanceId }) => instanceId !== aura.instanceId),
  });
  return proposedStatusChangeV1(operation, state, after, [
    { kind: "aura.cleared", instanceId: aura.instanceId, reason: operation.reason },
  ]);
}

function clearDebugAuraV1(
  state: StatusStateV1,
  operation: Extract<PocStatusOwnerOperationV1, { readonly kind: "status.debug.clear_instance" }>,
): PocStatusProposalResultV1 {
  const aura = state.auras.find(({ instanceId }) => instanceId === operation.instanceId);
  if (aura === undefined) {
    throw new TypeError(`unknown debug Aura instance ${operation.instanceId}`);
  }
  const after = pocStatusStateSchemaV1.parse({
    auras: state.auras.filter(({ instanceId }) => instanceId !== operation.instanceId),
  });
  return proposedStatusChangeV1(operation, state, after, [
    {
      kind: "aura.cleared",
      instanceId: operation.instanceId,
      reason: {
        kind: "debug",
        commandKind: "debug.aura.clear",
        reasonId: operation.reasonId,
      },
    },
  ]);
}

function unreachableStatusOwnerOperationV1(operation: never): never {
  throw new TypeError(`unsupported Status owner operation ${String(operation)}`);
}

function isDeeplyFrozenStatusStateV1(state: DeepReadonly<StatusStateV1>): boolean {
  return (
    Object.isFrozen(state) &&
    Object.isFrozen(state.auras) &&
    state.auras.every(
      (aura) =>
        Object.isFrozen(aura) &&
        Object.isFrozen(aura.target) &&
        Object.isFrozen(aura.source) &&
        Object.isFrozen(aura.duration),
    )
  );
}

/** Advances only the exact Aura instances selected by the transaction coordinator. */
export function advancePocAuraCountdownsV1(
  stateValue: DeepReadonly<StatusStateV1>,
  inputValue: DeepReadonly<PocAuraCountdownInputV1>,
): PocAuraCountdownResultV1 {
  const state = pocStatusStateSchemaV1.parse(stateValue);
  const operation = pocStatusOwnerOperationSchemaV1.parse({
    kind: "status.countdown",
    unit: inputValue.unit,
    instanceIds: inputValue.instanceIds,
  });
  if (operation.kind !== "status.countdown") {
    throw new TypeError("invalid Status countdown operation");
  }
  if (operation.instanceIds.length === 0) {
    const unchangedState = isDeeplyFrozenStatusStateV1(stateValue)
      ? (stateValue as StatusStateV1)
      : state;
    return deepFreezePocValueV1({
      state: unchangedState,
      expired: [] as readonly AuraInstanceId[],
    });
  }

  const selected = new Map<AuraInstanceId, AuraInstanceV1>();
  const expired: AuraInstanceId[] = [];
  for (const instanceId of operation.instanceIds) {
    const aura = state.auras.find((candidate) => candidate.instanceId === instanceId);
    if (aura === undefined) throw new TypeError(`unknown Aura countdown instance ${instanceId}`);
    if (aura.duration.kind === "until_cleared") {
      throw new TypeError(`until_cleared Aura ${instanceId} cannot be counted down`);
    }
    if (aura.duration.unit !== operation.unit) {
      throw new TypeError(`Aura countdown unit mismatch for ${instanceId}`);
    }
    if (aura.duration.remaining === 1) {
      expired.push(instanceId);
      continue;
    }
    selected.set(
      instanceId,
      deepFreezePocValueV1({
        ...aura,
        duration: {
          kind: "countdown" as const,
          unit: aura.duration.unit,
          remaining: positiveAuraRemainingV1(aura.duration.remaining - 1),
        },
      }),
    );
  }

  const expiredSet = new Set(expired);
  const after = pocStatusStateSchemaV1.parse({
    auras: state.auras.flatMap((aura) => {
      if (expiredSet.has(aura.instanceId)) return [];
      return [selected.get(aura.instanceId) ?? aura];
    }),
  });
  return deepFreezePocValueV1({ state: after, expired });
}

function countdownAurasV1(
  state: StatusStateV1,
  operation: Extract<PocStatusOwnerOperationV1, { readonly kind: "status.countdown" }>,
  dependencies: PocStatusDependencyPortsV1,
): PocStatusProposalResultV1 {
  for (const instanceId of operation.instanceIds) {
    const aura = state.auras.find((candidate) => candidate.instanceId === instanceId);
    if (aura === undefined) throw new TypeError(`unknown Aura countdown instance ${instanceId}`);
    const definition = findPocStatusDefinitionV1(dependencies, aura.auraId);
    validatePocStatusAuraTargetV1(aura.target, definition);
    validatePocStatusAuraDurationV1(aura.duration, definition, "debug");
  }
  const result = advancePocAuraCountdownsV1(state, operation);
  const beforeById = new Map(state.auras.map((aura) => [aura.instanceId, aura] as const));
  const facts = result.expired.map((instanceId): PocStatusGameplayFactV1 => {
    const aura = beforeById.get(instanceId);
    if (aura === undefined) throw new TypeError(`missing expired Aura ${instanceId}`);
    const definition = findPocStatusDefinitionV1(dependencies, aura.auraId);
    validatePocStatusAuraTargetV1(aura.target, definition);
    validatePocStatusAuraDurationV1(aura.duration, definition, "debug");
    return deepFreezePocValueV1({
      kind: "aura.expired",
      instanceId,
      auraId: aura.auraId,
      reason: {
        kind: "aura",
        auraId: aura.auraId,
        reasonId: definition.reasonId,
      },
    });
  });
  return proposedStatusChangeV1(operation, state, result.state, facts);
}

export function createPocStatusReadPortV1(
  stateValue: DeepReadonly<StatusStateV1>,
): PocStatusReadPortV1 {
  return pocStatusStateSchemaV1.parse(stateValue);
}

export const pocStatusOwnerV1: PocStatusOwnerCapabilityV1 = Object.freeze({
  propose(
    stateValue: DeepReadonly<StatusStateV1>,
    operationValue: DeepReadonly<PocStatusOwnerOperationV1>,
    dependenciesValue: PocStatusDependencyPortsV1,
  ): PocStatusProposalResultV1 {
    const state = pocStatusStateSchemaV1.parse(stateValue);
    const operation = pocStatusOwnerOperationSchemaV1.parse(operationValue);
    const dependencies = pocStatusDependencyPortsSchemaV1.parse(dependenciesValue);
    switch (operation.kind) {
      case "status.apply":
      case "status.debug.apply":
        return applyAuraV1(state, operation, dependencies);
      case "status.clear":
        return clearAuraV1(state, operation);
      case "status.countdown":
        return countdownAurasV1(state, operation, dependencies);
      case "status.debug.clear_instance":
        return clearDebugAuraV1(state, operation);
    }
    return unreachableStatusOwnerOperationV1(operation);
  },
  apply(
    stateValue: DeepReadonly<StatusStateV1>,
    proposalValue: DeepReadonly<PocStatusOwnerProposalV1>,
  ): StatusStateV1 {
    const state = pocStatusStateSchemaV1.parse(stateValue);
    const proposal = pocStatusOwnerProposalSchemaV1.parse(proposalValue);
    if (!pocStatusStatesEqualV1(state, proposal.payload.before)) {
      throw new TypeError("stale Status owner proposal");
    }
    const after = pocStatusStateSchemaV1.parse(proposal.payload.after);
    const violations = pocStatusInvariantV1.check(after, createPocStatusReadPortV1(after));
    if (violations.length > 0) throw new TypeError("Status proposal violates local invariants");
    return after;
  },
});

export function createPocStatusGameplayModuleV1(initialStateValue: DeepReadonly<StatusStateV1>) {
  const initialState = pocStatusStateSchemaV1.parse(initialStateValue);
  assertValidInitialPocStatusStateV1(initialState);
  const createInitialState = (_bootstrap: DeepReadonly<PocGameBootstrapInputV1>): StatusStateV1 =>
    pocStatusStateSchemaV1.parse(initialState);
  const defined = definePocGameplayModuleV1({
    bindingKind: "stateful" as const,
    descriptor: descriptorForPocModuleV1("status"),
    commandSchema: null,
    querySchema: null,
    queryResultSchema: null,
    stateSchema: pocStatusStateSchemaV1,
    ownerOperationSchema: pocStatusOwnerOperationSchemaV1,
    ownerProposalSchema: pocStatusOwnerProposalSchemaV1,
    localInvariants: [pocStatusInvariantV1],
    owner: pocStatusOwnerV1,
    queries: null,
    createInitialState,
    createReadPort: createPocStatusReadPortV1,
  });
  return defined as Omit<typeof defined, "ownerOperationSchema"> & {
    readonly ownerOperationSchema: typeof pocStatusOwnerOperationSchemaV1;
  };
}

export type PocStatusGameplayModuleV1 = ReturnType<typeof createPocStatusGameplayModuleV1>;
