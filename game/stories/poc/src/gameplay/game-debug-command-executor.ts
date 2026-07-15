// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly, GameDebugCommandExecutorV1 } from "@sillymaker/base";

import { pocDebugCommandValidationErrorSchemaV1 } from "./contracts/schemas.js";
import type {
  AuraDurationPolicyV1,
  AuraDurationV1,
  AuraTargetV1,
  ChangeReasonV1,
  NarrativeNodeV1,
  PocDebugCommandV1,
  PocDebugCommandValidationErrorV1,
  PocEngineFaultV1,
  PocGameSnapshotV1,
  PocReplayableDebugExecutionAttemptV1,
  PocSimulationProgramV1,
  StoryValueDefinitionV1,
  StoryValueV1,
} from "./contracts/types.js";
import {
  deepFreezePocValueV1,
  parseNonNegativeSafeInteger,
  parseSafeInteger,
} from "./contracts/values.js";
import type { NonNegativeSafeInteger } from "./contracts/values.js";
import type { PocGameplayModuleTupleV1 } from "./modules/index.js";
import type { PocStatusDependencyPortsV1 } from "./modules/status/contract.js";
import {
  commitPocCandidateV1,
  createPocTransactionCandidateV1,
  type PocCandidateOwnerResultV1,
  type PocTransactionCandidateV1,
} from "./transaction/candidate.js";

export interface PocGameDebugCommandExecutorV1 extends GameDebugCommandExecutorV1<
  PocGameSnapshotV1,
  PocDebugCommandV1,
  undefined,
  PocDebugCommandValidationErrorV1,
  PocReplayableDebugExecutionAttemptV1
> {}

type SnapshotInputV1 = DeepReadonly<PocGameSnapshotV1>;

const allowedV1 = Object.freeze({ kind: "allowed" as const });

function validationFailedV1(errors: readonly PocDebugCommandValidationErrorV1[]) {
  return Object.freeze({
    kind: "validation_failed" as const,
    errors: Object.freeze(
      errors.map((error) => pocDebugCommandValidationErrorSchemaV1.parse(error)),
    ),
  });
}

function errorMessageV1(error: unknown): string {
  return error instanceof Error ? error.message : "unknown debug command failure";
}

function errorStackV1(error: unknown): string | undefined {
  return error instanceof Error && typeof error.stack === "string" ? error.stack : undefined;
}

function debugContractFaultV1(error: unknown): PocEngineFaultV1 {
  const stack = errorStackV1(error);
  return deepFreezePocValueV1({
    category: "command_handler",
    code: "command.handler_threw",
    ruleSlot: null,
    message: errorMessageV1(error),
    ...(stack === undefined ? {} : { stack }),
  });
}

function attemptDiagnosticsV1(
  snapshot: PocGameSnapshotV1,
  candidate: PocTransactionCandidateV1 | undefined,
  committedAfter: PocGameSnapshotV1["rng"],
) {
  return Object.freeze({
    committedRngBefore: snapshot.rng,
    attemptedDraws: Object.freeze([...(candidate?.attemptedDraws() ?? [])]),
    candidateRngAfter: candidate?.candidateRngState() ?? snapshot.rng,
    committedRngAfter: committedAfter,
  });
}

function committedAttemptV1(
  before: PocGameSnapshotV1,
  after: PocGameSnapshotV1,
  candidate: PocTransactionCandidateV1,
): PocReplayableDebugExecutionAttemptV1 {
  return Object.freeze({
    result: Object.freeze({
      kind: "committed" as const,
      snapshot: after,
      facts: Object.freeze([...candidate.gameplayFacts()]),
    }),
    diagnostics: attemptDiagnosticsV1(before, candidate, after.rng),
  });
}

function faultedAttemptV1(
  snapshot: PocGameSnapshotV1,
  candidate: PocTransactionCandidateV1 | undefined,
  error: unknown,
): PocReplayableDebugExecutionAttemptV1 {
  return Object.freeze({
    result: Object.freeze({
      kind: "faulted" as const,
      snapshot,
      fault: debugContractFaultV1(error),
    }),
    diagnostics: attemptDiagnosticsV1(snapshot, candidate, snapshot.rng),
  });
}

function reasonExistsV1(
  program: DeepReadonly<PocSimulationProgramV1>,
  reasonId: PocDebugCommandV1["reasonId"],
): boolean {
  return program.data.content.reasons.some((reason) => reason.reasonId === reasonId);
}

function actorStaminaMaximumV1(
  snapshot: SnapshotInputV1,
  actorId: Extract<PocDebugCommandV1, { readonly kind: "debug.actor.set_stamina" }>["actorId"],
): NonNegativeSafeInteger | undefined {
  if (actorId === "actor.player") {
    return parseNonNegativeSafeInteger(snapshot.state.simulation.actors.player.stamina.maximum);
  }
  if (actorId === "actor.heroine") {
    return parseNonNegativeSafeInteger(snapshot.state.simulation.actors.heroine.stamina.maximum);
  }
  return undefined;
}

function auraTargetKeyV1(target: DeepReadonly<AuraTargetV1>): string {
  return target.kind === "actor" ? `actor:${target.actorId}` : target.kind;
}

function durationPolicyMatchesV1(
  duration: DeepReadonly<AuraDurationV1>,
  policy: DeepReadonly<AuraDurationPolicyV1>,
): boolean {
  if (duration.kind !== policy.kind) return false;
  return duration.kind === "until_cleared" || policy.kind === "until_cleared"
    ? true
    : duration.unit === policy.unit;
}

function storyValueMatchesDefinitionV1(
  value: DeepReadonly<StoryValueV1>,
  definition: DeepReadonly<StoryValueDefinitionV1>,
): boolean {
  if (value.kind !== definition.kind) return false;
  switch (definition.kind) {
    case "boolean":
      return value.kind === "boolean";
    case "integer":
      return (
        value.kind === "integer" &&
        value.value >= definition.range.min &&
        value.value <= definition.range.max
      );
    case "token":
      return value.kind === "token" && definition.allowedValues.includes(value.value);
  }
  const unsupported: never = definition;
  throw new TypeError(`unsupported Story value definition ${JSON.stringify(unsupported)}`);
}

type PresentableNarrativeNodeV1 = Extract<
  NarrativeNodeV1,
  { readonly kind: "line" | "narration" | "choice" }
>;

function findPresentableNarrativeNodeV1(
  program: DeepReadonly<PocSimulationProgramV1>,
  sceneId: Extract<
    PocDebugCommandV1,
    { readonly kind: "debug.narrative.jump" }
  >["cursor"]["sceneId"],
  nodeId: Extract<PocDebugCommandV1, { readonly kind: "debug.narrative.jump" }>["cursor"]["nodeId"],
): DeepReadonly<PresentableNarrativeNodeV1> | undefined {
  const node = program.data.narrative.scenes
    .find((scene) => scene.sceneId === sceneId)
    ?.nodes.find((candidate) => candidate.nodeId === nodeId);
  return node?.kind === "line" || node?.kind === "narration" || node?.kind === "choice"
    ? node
    : undefined;
}

function validateCommandV1(
  snapshot: SnapshotInputV1,
  command: DeepReadonly<PocDebugCommandV1>,
  program: DeepReadonly<PocSimulationProgramV1>,
): readonly PocDebugCommandValidationErrorV1[] {
  const errors: PocDebugCommandValidationErrorV1[] = [];
  if (!reasonExistsV1(program, command.reasonId)) {
    errors.push({
      code: "debug.unknown_reference",
      commandKind: command.kind,
      reference: { kind: "reason", reasonId: command.reasonId },
    });
  }

  switch (command.kind) {
    case "debug.calendar.set_ap":
    case "debug.actor.set_mood":
    case "debug.relationship.set":
    case "debug.rng.set":
      break;
    case "debug.actor.set_stamina": {
      const maximum = actorStaminaMaximumV1(snapshot, command.actorId);
      if (maximum === undefined) {
        errors.push({
          code: "debug.unknown_reference",
          commandKind: command.kind,
          reference: { kind: "actor", actorId: command.actorId },
        });
      } else if (command.value > maximum) {
        errors.push({
          code: "debug.value_out_of_range",
          commandKind: command.kind,
          field: "stamina",
          actual: parseSafeInteger(command.value),
          minimum: 0,
          maximum,
        });
      }
      break;
    }
    case "debug.inventory.adjust_cash": {
      const actual = BigInt(snapshot.state.simulation.inventory.cash) + BigInt(command.delta);
      if (actual < 0n || actual > BigInt(Number.MAX_SAFE_INTEGER)) {
        errors.push({
          code: "debug.value_out_of_range",
          commandKind: command.kind,
          field: "cash_delta_result",
          actual: actual.toString(10),
          minimum: 0,
          maximum: parseSafeInteger(Number.MAX_SAFE_INTEGER),
        });
      }
      break;
    }
    case "debug.aura.apply": {
      const definition = program.data.content.auras.find((aura) => aura.auraId === command.auraId);
      if (definition === undefined) {
        errors.push({
          code: "debug.unknown_reference",
          commandKind: command.kind,
          reference: { kind: "aura", auraId: command.auraId },
        });
        break;
      }
      if (
        command.duration.kind === "countdown" &&
        definition.durationPolicy.kind === "countdown" &&
        command.duration.remaining > definition.durationPolicy.maximumRemaining
      ) {
        errors.push({
          code: "debug.value_out_of_range",
          commandKind: command.kind,
          field: "aura_duration",
          actual: parseSafeInteger(command.duration.remaining),
          minimum: 1,
          maximum: definition.durationPolicy.maximumRemaining,
        });
      }
      if (
        !definition.allowedTargets.some(
          (allowedTarget) => auraTargetKeyV1(allowedTarget) === auraTargetKeyV1(command.target),
        )
      ) {
        errors.push({
          code: "debug.aura_target_not_allowed",
          commandKind: command.kind,
          auraId: command.auraId,
          target: command.target,
        });
      }
      if (!durationPolicyMatchesV1(command.duration, definition.durationPolicy)) {
        errors.push({
          code: "debug.aura_duration_policy_mismatch",
          commandKind: command.kind,
          auraId: command.auraId,
          requested: command.duration,
          expected: definition.durationPolicy,
        });
      }
      if (
        snapshot.state.simulation.status.auras.some(
          (aura) =>
            aura.auraId === command.auraId &&
            auraTargetKeyV1(aura.target) === auraTargetKeyV1(command.target),
        )
      ) {
        errors.push({
          code: "debug.state_conflict",
          commandKind: command.kind,
          conflict: "aura_already_present",
        });
      }
      break;
    }
    case "debug.aura.clear":
      if (
        !snapshot.state.simulation.status.auras.some(
          (aura) => aura.instanceId === command.instanceId,
        )
      ) {
        errors.push({
          code: "debug.unknown_reference",
          commandKind: command.kind,
          reference: { kind: "aura_instance", instanceId: command.instanceId },
        });
      }
      break;
    case "debug.story.fact.set": {
      const definition = program.data.stateDefinitions.facts.find(
        (fact) => fact.factId === command.factId,
      );
      if (definition === undefined) {
        errors.push({
          code: "debug.unknown_reference",
          commandKind: command.kind,
          reference: { kind: "fact", factId: command.factId },
        });
      } else if (!storyValueMatchesDefinitionV1(command.value, definition.value)) {
        errors.push({
          code: "debug.story_value_invalid",
          commandKind: command.kind,
          factId: command.factId,
          value: command.value,
        });
      }
      break;
    }
    case "debug.narrative.jump": {
      const node = findPresentableNarrativeNodeV1(
        program,
        command.cursor.sceneId,
        command.cursor.nodeId,
      );
      if (node === undefined) {
        errors.push({
          code: "debug.unknown_reference",
          commandKind: command.kind,
          reference: {
            kind: "narrative_node",
            sceneId: command.cursor.sceneId,
            nodeId: command.cursor.nodeId,
          },
        });
      }
      if (snapshot.state.story.narrative.status !== "active") {
        errors.push({
          code: "debug.state_conflict",
          commandKind: command.kind,
          conflict: "narrative_inactive",
        });
      }
      break;
    }
    default: {
      const unsupported: never = command;
      throw new TypeError(`unsupported PoC DebugCommand ${JSON.stringify(unsupported)}`);
    }
  }
  return errors;
}

function statusDependenciesV1(
  program: DeepReadonly<PocSimulationProgramV1>,
): PocStatusDependencyPortsV1 {
  return deepFreezePocValueV1({
    auraDefinitions: program.data.content.auras.map(
      ({ auraId, reasonId, durationPolicy, allowedTargets }) => ({
        auraId,
        reasonId,
        durationPolicy,
        allowedTargets,
      }),
    ),
  });
}

function calendarPolicyApV1(
  candidate: PocTransactionCandidateV1,
  program: DeepReadonly<PocSimulationProgramV1>,
): NonNegativeSafeInteger {
  const lifePolicyId = candidate.calendarReadPort().lifePolicyId;
  if (lifePolicyId === null) return parseNonNegativeSafeInteger(0);
  const policy = program.data.balance.lifePolicies.find(
    (candidatePolicy) => candidatePolicy.policyId === lifePolicyId,
  );
  if (policy === undefined) throw new TypeError(`unknown life policy ${lifePolicyId}`);
  return policy.apByPhase[candidate.calendarReadPort().phase];
}

function debugReasonV1(command: DeepReadonly<PocDebugCommandV1>): ChangeReasonV1 {
  return deepFreezePocValueV1({
    kind: "debug",
    commandKind: command.kind,
    reasonId: command.reasonId,
  });
}

function requireAppliedV1(result: PocCandidateOwnerResultV1): void {
  if (result.kind === "rejected") {
    throw new TypeError(`debug owner rejected an allowed command: ${result.rejection.code}`);
  }
}

function executeCommandV1(
  candidate: PocTransactionCandidateV1,
  command: DeepReadonly<PocDebugCommandV1>,
  program: DeepReadonly<PocSimulationProgramV1>,
): void {
  const emptyDependencies = Object.freeze({});
  switch (command.kind) {
    case "debug.calendar.set_ap":
      requireAppliedV1(
        candidate.applyCalendar(
          {
            kind: "calendar.debug.set_ap",
            value: command.value,
            reason: {
              kind: "debug",
              commandKind: command.kind,
              reasonId: command.reasonId,
            },
          },
          Object.freeze({ policyAp: calendarPolicyApV1(candidate, program) }),
        ),
      );
      return;
    case "debug.actor.set_stamina":
      requireAppliedV1(
        candidate.applyActors(
          {
            kind: "actors.debug.set_stamina",
            actorId: command.actorId,
            value: command.value,
            reasonId: command.reasonId,
          },
          emptyDependencies,
        ),
      );
      return;
    case "debug.actor.set_mood":
      requireAppliedV1(
        candidate.applyActors(
          {
            kind: "actors.debug.set_mood",
            actorId: command.actorId,
            value: command.value,
            reasonId: command.reasonId,
          },
          emptyDependencies,
        ),
      );
      return;
    case "debug.relationship.set":
      requireAppliedV1(
        candidate.applyActors(
          {
            kind: "actors.debug.set_relationship",
            affection: command.affection,
            teamwork: command.teamwork,
            stage: command.stage,
            reasonId: command.reasonId,
          },
          emptyDependencies,
        ),
      );
      return;
    case "debug.inventory.adjust_cash":
      requireAppliedV1(
        candidate.applyInventory(
          {
            kind: "inventory.debug.adjust_cash",
            delta: command.delta,
            reasonId: command.reasonId,
          },
          Object.freeze({
            kind: "inventory.debug.adjust_cash",
            commandSequence: candidate.nextCommandSequence(),
            nextLedgerEntryIndex: candidate.nextLedgerEntryIndex(),
          }),
        ),
      );
      return;
    case "debug.aura.apply":
      requireAppliedV1(
        candidate.applyStatus(
          {
            kind: "status.debug.apply",
            aura: {
              instanceId: candidate.allocateAuraInstanceId(),
              auraId: command.auraId,
              target: command.target,
              source: { kind: "debug", reasonId: command.reasonId },
              duration: command.duration,
              appliedAtSequence: parseNonNegativeSafeInteger(candidate.nextCommandSequence()),
            },
            reasonId: command.reasonId,
          },
          statusDependenciesV1(program),
        ),
      );
      return;
    case "debug.aura.clear":
      requireAppliedV1(
        candidate.applyStatus(
          {
            kind: "status.debug.clear_instance",
            instanceId: command.instanceId,
            reasonId: command.reasonId,
          },
          statusDependenciesV1(program),
        ),
      );
      return;
    case "debug.story.fact.set": {
      const definition = program.data.stateDefinitions.facts.find(
        (fact) => fact.factId === command.factId,
      );
      if (definition === undefined) throw new TypeError(`unknown Story Fact ${command.factId}`);
      requireAppliedV1(
        candidate.applyProgression(
          {
            kind: "progression.fact.set",
            entry: { factId: command.factId, value: command.value },
          },
          deepFreezePocValueV1({
            kind: "progression.fact.set",
            definition,
            reason: debugReasonV1(command),
          }),
        ),
      );
      return;
    }
    case "debug.narrative.jump": {
      const node = findPresentableNarrativeNodeV1(
        program,
        command.cursor.sceneId,
        command.cursor.nodeId,
      );
      if (node === undefined) throw new TypeError("unknown presentable Narrative node");
      requireAppliedV1(
        candidate.applyNarrative(
          { kind: "narrative.debug.jump", target: command.cursor },
          deepFreezePocValueV1({
            kind: "narrative.debug.jump",
            target: { cursor: command.cursor, nodeKind: node.kind },
          }),
        ),
      );
      return;
    }
    case "debug.rng.set":
      candidate.replaceRngForDebug(command.rng);
      return;
    default: {
      const unsupported: never = command;
      throw new TypeError(`unsupported PoC DebugCommand ${JSON.stringify(unsupported)}`);
    }
  }
}

export function createPocGameDebugCommandExecutorV1(
  program: DeepReadonly<PocSimulationProgramV1>,
  modules: PocGameplayModuleTupleV1,
): PocGameDebugCommandExecutorV1 {
  return Object.freeze({
    validate(
      snapshot: SnapshotInputV1,
      command: DeepReadonly<PocDebugCommandV1>,
      _context: undefined,
    ) {
      const errors = validateCommandV1(snapshot, command, program);
      return errors.length === 0 ? allowedV1 : validationFailedV1(errors);
    },
    executeAttempt(
      snapshotValue: SnapshotInputV1,
      command: DeepReadonly<PocDebugCommandV1>,
      _context: undefined,
    ): PocReplayableDebugExecutionAttemptV1 {
      const snapshot = snapshotValue as PocGameSnapshotV1;
      let candidate: PocTransactionCandidateV1 | undefined;
      try {
        const errors = validateCommandV1(snapshotValue, command, program);
        if (errors.length !== 0) {
          throw new TypeError(`DebugCommand failed queue-front validation: ${errors[0]?.code}`);
        }
        candidate = createPocTransactionCandidateV1(snapshotValue, program, modules);
        executeCommandV1(candidate, command, program);
        const committed = commitPocCandidateV1(candidate);
        return committedAttemptV1(snapshot, committed, candidate);
      } catch (error) {
        return faultedAttemptV1(snapshot, candidate, error);
      }
    },
  });
}
