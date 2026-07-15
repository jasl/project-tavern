// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly, ModuleOwnerCapabilityV1 } from "@sillymaker/base";

import { definePocGameplayModuleV1 } from "../../contracts/define-poc-gameplay-module.js";
import { parseOpeningSessionId } from "../../contracts/ids.js";
import { descriptorForPocModuleV1 } from "../../contracts/module-catalog.js";
import type {
  ActiveWorkflowV1,
  OpeningCheckpointV1,
  OpeningSessionV1,
  PocGameBootstrapInputV1,
  PocRejectionReasonV1,
  WorldActionProgressV1,
  WorldActionSessionV1,
} from "../../contracts/types.js";
import { deepFreezePocValueV1 } from "../../contracts/values.js";
import {
  assertValidPocWorkflowStateV1,
  pocWorkflowDependencyPortsSchemaV1,
  pocWorkflowInvariantV1,
  pocWorkflowOwnerOperationSchemaV1,
  pocWorkflowOwnerProposalSchemaV1,
  pocWorkflowStateSchemaV1,
  pocWorkflowStatesEqualV1,
} from "./contract.js";
import type {
  PocWorkflowBeginWorldActionDependenciesV1,
  PocWorkflowDependencyPortsV1,
  PocWorkflowGameplayFactV1,
  PocWorkflowOwnerOperationV1,
  PocWorkflowOwnerProposalV1,
  PocWorkflowReadPortV1,
} from "./contract.js";

type PocWorkflowProposalResultV1 =
  | { readonly kind: "proposed"; readonly proposal: PocWorkflowOwnerProposalV1 }
  | { readonly kind: "rejected"; readonly rejection: PocRejectionReasonV1 };

type PocWorkflowOwnerRejectionV1 = Extract<
  PocRejectionReasonV1,
  {
    readonly code:
      | "tavern.opening_active"
      | "tavern.opening_missing"
      | "tavern.opening_checkpoint_blocked"
      | "tavern.opening_continue_not_needed"
      | "tavern.opening_not_ready"
      | "workflow.conflict"
      | "workflow.missing"
      | "engine.invariant_rejected";
  }
>;

function rejectedWorkflowChangeV1(
  rejection: PocWorkflowOwnerRejectionV1,
): PocWorkflowProposalResultV1 {
  return deepFreezePocValueV1({ kind: "rejected", rejection });
}

function proposedWorkflowChangeV1(
  kind: PocWorkflowOwnerOperationV1["kind"],
  before: ActiveWorkflowV1 | null,
  activeWorkflow: ActiveWorkflowV1 | null,
  facts: readonly PocWorkflowGameplayFactV1[],
): PocWorkflowProposalResultV1 {
  return deepFreezePocValueV1({
    kind: "proposed",
    proposal: pocWorkflowOwnerProposalSchemaV1.parse({
      payload: { kind, before, activeWorkflow },
      facts,
    }),
  });
}

function workflowConflictV1(
  activeKind: ActiveWorkflowV1["kind"],
  attemptedKind: ActiveWorkflowV1["kind"],
): PocWorkflowProposalResultV1 {
  return rejectedWorkflowChangeV1({
    code: "workflow.conflict",
    details: { activeKind, attemptedKind },
  });
}

function workflowInvariantRejectionV1(
  invariantCode: Extract<
    PocWorkflowOwnerRejectionV1,
    { readonly code: "engine.invariant_rejected" }
  >["details"]["invariantCode"],
): PocWorkflowProposalResultV1 {
  return rejectedWorkflowChangeV1({
    code: "engine.invariant_rejected",
    details: { invariantCode },
  });
}

function openingMissingV1(
  commandKind: Extract<
    PocWorkflowOwnerRejectionV1,
    { readonly code: "tavern.opening_missing" }
  >["details"]["commandKind"],
): PocWorkflowProposalResultV1 {
  return rejectedWorkflowChangeV1({
    code: "tavern.opening_missing",
    details: { commandKind },
  });
}

function openingBlockedV1(state: OpeningSessionV1): PocWorkflowProposalResultV1 {
  return rejectedWorkflowChangeV1({
    code: "tavern.opening_checkpoint_blocked",
    details: {
      checkpoint: state.checkpoint,
      eventId: state.blockingEvent?.eventId ?? null,
    },
  });
}

function nextOpeningCheckpointV1(checkpoint: OpeningCheckpointV1): OpeningCheckpointV1 | null {
  if (checkpoint === "started") return "middle";
  if (checkpoint === "middle") return "before_finalize";
  if (checkpoint === "before_finalize") return "ready_to_finalize";
  return null;
}

function assertOpeningDependencyCheckpointV1(
  state: OpeningSessionV1,
  checkpoint: OpeningCheckpointV1,
): void {
  if (state.checkpoint !== checkpoint) {
    throw new TypeError("Workflow Opening dependency checkpoint does not match State");
  }
}

function proposeOpeningStartV1(
  state: ActiveWorkflowV1 | null,
  operation: Extract<PocWorkflowOwnerOperationV1, { readonly kind: "workflow.start_opening" }>,
  dependencies: Extract<PocWorkflowDependencyPortsV1, { readonly kind: "workflow.start_opening" }>,
): PocWorkflowProposalResultV1 {
  if (state?.kind === "opening") {
    return rejectedWorkflowChangeV1({
      code: "tavern.opening_active",
      details: { sessionId: state.sessionId },
    });
  }
  if (state?.kind === "world_action") return workflowConflictV1(state.kind, "opening");
  if (operation.baseline.startedAtSequence !== dependencies.commandSequence) {
    throw new TypeError("Workflow Opening baseline sequence does not match command sequence");
  }
  const sessionId = parseOpeningSessionId(`opening:${dependencies.commandSequence}`);
  const activeWorkflow = pocWorkflowStateSchemaV1.parse({
    kind: "opening",
    sessionId,
    checkpoint: "started",
    baseline: operation.baseline,
    triggeredEventIds: [],
    sessionModifiers: [],
    blockingEvent: null,
  });
  return proposedWorkflowChangeV1(operation.kind, state, activeWorkflow, [
    { kind: "opening.started", sessionId, checkpoint: "started" },
  ]);
}

function proposeOpeningEventRecordV1(
  state: OpeningSessionV1,
  operation: Extract<
    PocWorkflowOwnerOperationV1,
    { readonly kind: "workflow.record_opening_event" }
  >,
  dependencies: Extract<
    PocWorkflowDependencyPortsV1,
    { readonly kind: "workflow.record_opening_event" }
  >,
): PocWorkflowProposalResultV1 {
  assertOpeningDependencyCheckpointV1(state, dependencies.checkpoint);
  if (state.blockingEvent !== null) {
    throw new TypeError("Workflow cannot record another Opening event while blocked");
  }
  if (state.triggeredEventIds.includes(operation.eventId)) {
    return workflowInvariantRejectionV1("collection.duplicate_id");
  }
  const activeWorkflow = pocWorkflowStateSchemaV1.parse({
    ...state,
    triggeredEventIds: [...state.triggeredEventIds, operation.eventId],
  });
  return proposedWorkflowChangeV1(operation.kind, state, activeWorkflow, []);
}

function proposeOpeningBlockingEventSetV1(
  state: OpeningSessionV1,
  operation: Extract<
    PocWorkflowOwnerOperationV1,
    { readonly kind: "workflow.set_opening_blocking_event" }
  >,
  dependencies: Extract<
    PocWorkflowDependencyPortsV1,
    { readonly kind: "workflow.set_opening_blocking_event" }
  >,
): PocWorkflowProposalResultV1 {
  assertOpeningDependencyCheckpointV1(state, dependencies.checkpoint);
  if (state.blockingEvent !== null) {
    throw new TypeError("Workflow Opening already has a blocking event");
  }
  if (!state.triggeredEventIds.includes(operation.blockingEvent.eventId)) {
    throw new TypeError("Workflow Opening blocking event has not been triggered");
  }
  const activeWorkflow = pocWorkflowStateSchemaV1.parse({
    ...state,
    blockingEvent: operation.blockingEvent,
  });
  return proposedWorkflowChangeV1(operation.kind, state, activeWorkflow, []);
}

function proposeOpeningBlockingEventClearV1(
  state: OpeningSessionV1,
  operation: Extract<
    PocWorkflowOwnerOperationV1,
    { readonly kind: "workflow.clear_opening_blocking_event" }
  >,
): PocWorkflowProposalResultV1 {
  if (state.blockingEvent?.eventId !== operation.eventId) {
    throw new TypeError("Workflow Opening blocking event clear does not match active event");
  }
  const activeWorkflow = pocWorkflowStateSchemaV1.parse({
    ...state,
    blockingEvent: null,
  });
  return proposedWorkflowChangeV1(operation.kind, state, activeWorkflow, []);
}

function proposeOpeningModifierAddV1(
  state: OpeningSessionV1,
  operation: Extract<
    PocWorkflowOwnerOperationV1,
    { readonly kind: "workflow.add_opening_modifier" }
  >,
  dependencies: Extract<
    PocWorkflowDependencyPortsV1,
    { readonly kind: "workflow.add_opening_modifier" }
  >,
): PocWorkflowProposalResultV1 {
  if (
    operation.modifier.source.kind !== "event" ||
    operation.modifier.source.eventId !== dependencies.sourceEventId ||
    !state.triggeredEventIds.includes(dependencies.sourceEventId)
  ) {
    throw new TypeError("Workflow Opening Modifier source does not match a triggered event");
  }
  const sourceIndex = state.triggeredEventIds.indexOf(dependencies.sourceEventId);
  const previousSource = state.sessionModifiers.at(-1)?.source;
  const previousSourceIndex =
    previousSource?.kind === "event" ? state.triggeredEventIds.indexOf(previousSource.eventId) : -1;
  if (sourceIndex < previousSourceIndex) {
    throw new TypeError("Workflow Opening Modifier source reverses event causal order");
  }
  const activeWorkflow = pocWorkflowStateSchemaV1.parse({
    ...state,
    sessionModifiers: [...state.sessionModifiers, operation.modifier],
  });
  return proposedWorkflowChangeV1(operation.kind, state, activeWorkflow, []);
}

function proposeOpeningCheckpointAdvanceV1(
  state: OpeningSessionV1,
  operation: Extract<
    PocWorkflowOwnerOperationV1,
    { readonly kind: "workflow.advance_opening_checkpoint" }
  >,
): PocWorkflowProposalResultV1 {
  if (state.blockingEvent !== null) return openingBlockedV1(state);
  const checkpoint = nextOpeningCheckpointV1(state.checkpoint);
  if (checkpoint === null) {
    return rejectedWorkflowChangeV1({
      code: "tavern.opening_continue_not_needed",
      details: { checkpoint: "ready_to_finalize" },
    });
  }
  const activeWorkflow = pocWorkflowStateSchemaV1.parse({ ...state, checkpoint });
  return proposedWorkflowChangeV1(operation.kind, state, activeWorkflow, [
    {
      kind: "opening.checkpoint_advanced",
      sessionId: state.sessionId,
      from: state.checkpoint,
      to: checkpoint,
    },
  ]);
}

function proposeOpeningFinalizeV1(
  state: OpeningSessionV1,
  operation: Extract<PocWorkflowOwnerOperationV1, { readonly kind: "workflow.finalize_opening" }>,
): PocWorkflowProposalResultV1 {
  if (state.blockingEvent !== null) return openingBlockedV1(state);
  if (state.checkpoint !== "ready_to_finalize") {
    return rejectedWorkflowChangeV1({
      code: "tavern.opening_not_ready",
      details: { checkpoint: state.checkpoint },
    });
  }
  return proposedWorkflowChangeV1(operation.kind, state, null, []);
}

function proposeWorldActionStartV1(
  state: ActiveWorkflowV1 | null,
  operation: Extract<PocWorkflowOwnerOperationV1, { readonly kind: "workflow.begin_world_action" }>,
  dependencies: PocWorkflowBeginWorldActionDependenciesV1,
): PocWorkflowProposalResultV1 {
  if (state !== null) return workflowConflictV1(state.kind, "world_action");
  if (dependencies.beginStepId === dependencies.completionStepId) {
    throw new TypeError("Workflow WorldAction steps must be distinct");
  }
  if (new Set(dependencies.paidCostEntryIds).size !== dependencies.paidCostEntryIds.length) {
    throw new TypeError("Workflow WorldAction paid LedgerEntryIds must be unique");
  }
  const activeWorkflow = pocWorkflowStateSchemaV1.parse({
    kind: "world_action",
    actionId: operation.actionId,
    optionId: operation.optionId,
    beginStepId: dependencies.beginStepId,
    completionStepId: dependencies.completionStepId,
    preparationBonus: dependencies.preparationBonus,
    startedAtSequence: dependencies.startedAtSequence,
    startedDay: dependencies.startedDay,
    startedPhase: dependencies.startedPhase,
    progress: "begin_scene",
    paidCostEntryIds: dependencies.paidCostEntryIds,
    choices: [],
  });
  return proposedWorkflowChangeV1(operation.kind, state, activeWorkflow, [
    {
      kind: "world.action_started",
      actionId: operation.actionId,
      stepId: dependencies.beginStepId,
    },
  ]);
}

function proposeWorldActionChoiceRecordV1(
  state: WorldActionSessionV1,
  operation: Extract<
    PocWorkflowOwnerOperationV1,
    { readonly kind: "workflow.record_world_action_choice" }
  >,
  dependencies: Extract<
    PocWorkflowDependencyPortsV1,
    { readonly kind: "workflow.record_world_action_choice" }
  >,
): PocWorkflowProposalResultV1 {
  if (state.progress !== "begin_scene" && state.progress !== "completion_scene") {
    throw new TypeError("invalid Workflow WorldAction choice progress transition");
  }
  if (state.choices.some(({ choiceId }) => choiceId === operation.choiceId)) {
    return workflowInvariantRejectionV1("collection.duplicate_id");
  }
  const previousSequence = state.choices.at(-1)?.committedAtSequence ?? state.startedAtSequence;
  if (dependencies.committedAtSequence <= previousSequence) {
    throw new TypeError("Workflow WorldAction choice sequence must strictly increase");
  }
  const activeWorkflow = pocWorkflowStateSchemaV1.parse({
    ...state,
    choices: [
      ...state.choices,
      {
        choiceId: operation.choiceId,
        committedAtSequence: dependencies.committedAtSequence,
      },
    ],
  });
  return proposedWorkflowChangeV1(operation.kind, state, activeWorkflow, []);
}

function proposeWorldActionProgressV1(
  state: WorldActionSessionV1,
  kind:
    | "workflow.finish_world_action_begin_scene"
    | "workflow.enter_world_action_completion_scene"
    | "workflow.finish_world_action_completion_scene",
): PocWorkflowProposalResultV1 {
  const expected: WorldActionProgressV1 =
    kind === "workflow.finish_world_action_begin_scene"
      ? "begin_scene"
      : kind === "workflow.enter_world_action_completion_scene"
        ? "awaiting_completion_phase"
        : "completion_scene";
  const progress: WorldActionProgressV1 =
    kind === "workflow.finish_world_action_begin_scene"
      ? "awaiting_completion_phase"
      : kind === "workflow.enter_world_action_completion_scene"
        ? "completion_scene"
        : "ready_to_complete";
  if (state.progress !== expected) {
    throw new TypeError("invalid Workflow WorldAction progress transition");
  }
  const activeWorkflow = pocWorkflowStateSchemaV1.parse({ ...state, progress });
  return proposedWorkflowChangeV1(kind, state, activeWorkflow, []);
}

function proposeWorldActionCompleteV1(
  state: WorldActionSessionV1,
  operation: Extract<
    PocWorkflowOwnerOperationV1,
    { readonly kind: "workflow.complete_world_action" }
  >,
): PocWorkflowProposalResultV1 {
  if (state.progress !== "ready_to_complete") {
    throw new TypeError("invalid Workflow WorldAction completion progress transition");
  }
  return proposedWorkflowChangeV1(operation.kind, state, null, [
    { kind: "world.action_completed", actionId: state.actionId, bandId: operation.bandId },
  ]);
}

export function createPocWorkflowReadPortV1(
  stateValue: DeepReadonly<ActiveWorkflowV1 | null>,
): PocWorkflowReadPortV1 {
  return pocWorkflowStateSchemaV1.parse(stateValue);
}

export const pocWorkflowOwnerV1: ModuleOwnerCapabilityV1<
  ActiveWorkflowV1 | null,
  PocWorkflowOwnerOperationV1,
  PocWorkflowOwnerProposalV1,
  PocRejectionReasonV1,
  PocWorkflowDependencyPortsV1
> = Object.freeze({
  propose(
    stateValue: DeepReadonly<ActiveWorkflowV1 | null>,
    operationValue: DeepReadonly<PocWorkflowOwnerOperationV1>,
    dependenciesValue: PocWorkflowDependencyPortsV1,
  ): PocWorkflowProposalResultV1 {
    const state = pocWorkflowStateSchemaV1.parse(stateValue);
    assertValidPocWorkflowStateV1(state, "Workflow State");
    const operation = pocWorkflowOwnerOperationSchemaV1.parse(operationValue);
    const dependencies = pocWorkflowDependencyPortsSchemaV1.parse(dependenciesValue);
    if (operation.kind !== dependencies.kind) {
      throw new TypeError("Workflow operation and dependency kinds do not match");
    }

    if (operation.kind === "workflow.start_opening") {
      if (dependencies.kind !== operation.kind) throw new TypeError("Workflow dependency mismatch");
      return proposeOpeningStartV1(state, operation, dependencies);
    }
    if (operation.kind === "workflow.begin_world_action") {
      if (dependencies.kind !== operation.kind) throw new TypeError("Workflow dependency mismatch");
      return proposeWorldActionStartV1(state, operation, dependencies);
    }

    if (
      operation.kind === "workflow.record_opening_event" ||
      operation.kind === "workflow.set_opening_blocking_event" ||
      operation.kind === "workflow.clear_opening_blocking_event" ||
      operation.kind === "workflow.add_opening_modifier" ||
      operation.kind === "workflow.advance_opening_checkpoint" ||
      operation.kind === "workflow.finalize_opening"
    ) {
      if (state === null) {
        if (operation.kind === "workflow.advance_opening_checkpoint") {
          return openingMissingV1("tavern.opening.continue");
        }
        if (operation.kind === "workflow.finalize_opening") {
          return openingMissingV1("tavern.opening.finalize");
        }
        throw new TypeError("Workflow Opening owner operation requires an active Opening");
      }
      if (state.kind !== "opening") return workflowConflictV1(state.kind, "opening");
      if (operation.kind === "workflow.record_opening_event") {
        if (dependencies.kind !== operation.kind)
          throw new TypeError("Workflow dependency mismatch");
        return proposeOpeningEventRecordV1(state, operation, dependencies);
      }
      if (operation.kind === "workflow.set_opening_blocking_event") {
        if (dependencies.kind !== operation.kind)
          throw new TypeError("Workflow dependency mismatch");
        return proposeOpeningBlockingEventSetV1(state, operation, dependencies);
      }
      if (operation.kind === "workflow.clear_opening_blocking_event") {
        return proposeOpeningBlockingEventClearV1(state, operation);
      }
      if (operation.kind === "workflow.add_opening_modifier") {
        if (dependencies.kind !== operation.kind)
          throw new TypeError("Workflow dependency mismatch");
        return proposeOpeningModifierAddV1(state, operation, dependencies);
      }
      if (operation.kind === "workflow.advance_opening_checkpoint") {
        return proposeOpeningCheckpointAdvanceV1(state, operation);
      }
      return proposeOpeningFinalizeV1(state, operation);
    }

    if (state === null) {
      if (operation.kind === "workflow.complete_world_action") {
        return rejectedWorkflowChangeV1({
          code: "workflow.missing",
          details: {
            expectedKind: "world_action",
            commandKind: "world.action.complete",
          },
        });
      }
      throw new TypeError("Workflow WorldAction owner operation requires an active WorldAction");
    }
    if (state.kind !== "world_action") return workflowConflictV1(state.kind, "world_action");
    if (operation.kind === "workflow.record_world_action_choice") {
      if (dependencies.kind !== operation.kind) throw new TypeError("Workflow dependency mismatch");
      return proposeWorldActionChoiceRecordV1(state, operation, dependencies);
    }
    if (
      operation.kind === "workflow.finish_world_action_begin_scene" ||
      operation.kind === "workflow.enter_world_action_completion_scene" ||
      operation.kind === "workflow.finish_world_action_completion_scene"
    ) {
      return proposeWorldActionProgressV1(state, operation.kind);
    }
    return proposeWorldActionCompleteV1(state, operation);
  },

  apply(
    stateValue: DeepReadonly<ActiveWorkflowV1 | null>,
    proposalValue: DeepReadonly<PocWorkflowOwnerProposalV1>,
  ): ActiveWorkflowV1 | null {
    const state = pocWorkflowStateSchemaV1.parse(stateValue);
    assertValidPocWorkflowStateV1(state, "Workflow State");
    const proposal = pocWorkflowOwnerProposalSchemaV1.parse(proposalValue);
    if (!pocWorkflowStatesEqualV1(state, proposal.payload.before)) {
      throw new TypeError("stale Workflow owner proposal");
    }
    assertValidPocWorkflowStateV1(proposal.payload.activeWorkflow, "Workflow proposal");
    return deepFreezePocValueV1(proposalValue.payload.activeWorkflow as ActiveWorkflowV1 | null);
  },
});

export function createInitialPocWorkflowStateV1(
  _bootstrap: DeepReadonly<PocGameBootstrapInputV1>,
): ActiveWorkflowV1 | null {
  return null;
}

export const pocWorkflowGameplayModuleV1 = definePocGameplayModuleV1({
  bindingKind: "stateful",
  descriptor: descriptorForPocModuleV1("workflow"),
  commandSchema: null,
  querySchema: null,
  queryResultSchema: null,
  stateSchema: pocWorkflowStateSchemaV1,
  ownerOperationSchema: pocWorkflowOwnerOperationSchemaV1,
  ownerProposalSchema: pocWorkflowOwnerProposalSchemaV1,
  localInvariants: Object.freeze([pocWorkflowInvariantV1]),
  owner: pocWorkflowOwnerV1,
  queries: null,
  createInitialState: createInitialPocWorkflowStateV1,
  createReadPort: createPocWorkflowReadPortV1,
});
