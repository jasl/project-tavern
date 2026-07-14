// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly, ModuleOwnerCapabilityV1 } from "@sillymaker/base";

import { definePocGameplayModuleV1 } from "../../contracts/define-poc-gameplay-module.js";
import { descriptorForPocModuleV1 } from "../../contracts/module-catalog.js";
import type { ReasonId } from "../../contracts/ids.js";
import type {
  ActorsStateV1,
  ChangeReasonV1,
  PocGameBootstrapInputV1,
  PocRejectionReasonV1,
  StaminaChangeComponentV1,
} from "../../contracts/types.js";
import {
  deepFreezePocValueV1,
  parseMoodPoint,
  parseNonNegativeSafeInteger,
  parseSafeInteger,
} from "../../contracts/values.js";
import type { MoodPoint, NonNegativeSafeInteger, SafeInteger } from "../../contracts/values.js";
import {
  parsePocActorsDependencyPortsV1,
  pocActorsInvariantV1,
  pocActorsOwnerOperationSchemaV1,
  pocActorsOwnerProposalSchemaV1,
  pocActorsStateSchemaV1,
  pocActorsStatesEqualV1,
} from "./contract.js";
import type {
  PocActorsDependencyPortsV1,
  PocActorsGameplayFactV1,
  PocActorsOwnerOperationV1,
  PocActorsOwnerProposalV1,
  PocActorsReadPortV1,
} from "./contract.js";

type PocActorsProposalResultV1 =
  | { readonly kind: "proposed"; readonly proposal: PocActorsOwnerProposalV1 }
  | { readonly kind: "rejected"; readonly rejection: PocRejectionReasonV1 };

type StaminaRejectionV1 = Extract<
  PocRejectionReasonV1,
  { readonly code: "actor.insufficient_stamina" }
>;

function proposedActorsChangeV1(
  kind: PocActorsOwnerOperationV1["kind"],
  before: ActorsStateV1,
  after: ActorsStateV1,
  facts: readonly PocActorsGameplayFactV1[],
): PocActorsProposalResultV1 {
  return deepFreezePocValueV1({
    kind: "proposed",
    proposal: pocActorsOwnerProposalSchemaV1.parse({
      payload: { kind, before, after },
      facts,
    }),
  });
}

function rejectedActorsChangeV1(rejection: StaminaRejectionV1): PocActorsProposalResultV1 {
  return deepFreezePocValueV1({ kind: "rejected", rejection });
}

function assertValidActorsStateV1(state: ActorsStateV1, label: string): void {
  const violations = pocActorsInvariantV1.check(state, createPocActorsReadPortV1(state));
  if (violations.length !== 0) throw new TypeError(`${label} has invalid stamina`);
}

function sumStaminaComponentsV1(
  components: readonly [StaminaChangeComponentV1, ...StaminaChangeComponentV1[]],
): SafeInteger {
  let sum = 0;
  for (const { requestedDelta } of components) {
    if (
      (requestedDelta > 0 && sum > Number.MAX_SAFE_INTEGER - requestedDelta) ||
      (requestedDelta < 0 && sum < Number.MIN_SAFE_INTEGER - requestedDelta)
    ) {
      throw new TypeError("Actors stamina component sum exceeds safe integer bounds");
    }
    sum += requestedDelta;
  }
  return parseSafeInteger(sum);
}

function saturatingSafeIntegerAddV1(current: SafeInteger, delta: SafeInteger): SafeInteger {
  if (delta > 0 && current > Number.MAX_SAFE_INTEGER - delta) {
    return parseSafeInteger(Number.MAX_SAFE_INTEGER);
  }
  if (delta < 0 && current < Number.MIN_SAFE_INTEGER - delta) {
    return parseSafeInteger(Number.MIN_SAFE_INTEGER);
  }
  return parseSafeInteger(current + delta);
}

function saturatingNonNegativeAddV1(
  current: NonNegativeSafeInteger,
  delta: SafeInteger,
): NonNegativeSafeInteger {
  if (delta < 0 && current < 0 - delta) return parseNonNegativeSafeInteger(0);
  if (delta > 0 && current > Number.MAX_SAFE_INTEGER - delta) {
    return parseNonNegativeSafeInteger(Number.MAX_SAFE_INTEGER);
  }
  return parseNonNegativeSafeInteger(current + delta);
}

function saturatingMoodAddV1(current: MoodPoint, delta: SafeInteger): MoodPoint {
  if (delta > 2 - current) return parseMoodPoint(2);
  if (delta < -2 - current) return parseMoodPoint(-2);
  return parseMoodPoint(current + delta);
}

function actorStaminaV1(state: ActorsStateV1, actorId: "actor.player" | "actor.heroine") {
  return actorId === "actor.player" ? state.player.stamina : state.heroine.stamina;
}

function actorMoodV1(state: ActorsStateV1, actorId: "actor.player" | "actor.heroine") {
  return actorId === "actor.player" ? state.player.mood : state.heroine.mood;
}

function withActorStaminaV1(
  state: ActorsStateV1,
  actorId: "actor.player" | "actor.heroine",
  current: NonNegativeSafeInteger,
): ActorsStateV1 {
  if (actorId === "actor.player") {
    return pocActorsStateSchemaV1.parse({
      ...state,
      player: { ...state.player, stamina: { ...state.player.stamina, current } },
    });
  }
  return pocActorsStateSchemaV1.parse({
    ...state,
    heroine: { ...state.heroine, stamina: { ...state.heroine.stamina, current } },
  });
}

function withActorMoodV1(
  state: ActorsStateV1,
  actorId: "actor.player" | "actor.heroine",
  mood: MoodPoint,
): ActorsStateV1 {
  if (actorId === "actor.player") {
    return pocActorsStateSchemaV1.parse({
      ...state,
      player: { ...state.player, mood },
    });
  }
  return pocActorsStateSchemaV1.parse({
    ...state,
    heroine: { ...state.heroine, mood },
  });
}

function debugReasonV1(
  commandKind: "debug.actor.set_stamina" | "debug.actor.set_mood" | "debug.relationship.set",
  reasonId: ReasonId,
): Extract<ChangeReasonV1, { readonly kind: "debug" }> {
  return deepFreezePocValueV1({ kind: "debug", commandKind, reasonId });
}

export function createPocActorsReadPortV1(
  stateValue: DeepReadonly<ActorsStateV1>,
): PocActorsReadPortV1 {
  return pocActorsStateSchemaV1.parse(stateValue);
}

export const pocActorsOwnerV1: ModuleOwnerCapabilityV1<
  ActorsStateV1,
  PocActorsOwnerOperationV1,
  PocActorsOwnerProposalV1,
  PocRejectionReasonV1,
  PocActorsDependencyPortsV1
> = Object.freeze({
  propose(
    stateValue: DeepReadonly<ActorsStateV1>,
    operationValue: DeepReadonly<PocActorsOwnerOperationV1>,
    dependenciesValue: PocActorsDependencyPortsV1,
  ): PocActorsProposalResultV1 {
    const state = pocActorsStateSchemaV1.parse(stateValue);
    assertValidActorsStateV1(state, "Actors State");
    const operation = pocActorsOwnerOperationSchemaV1.parse(operationValue);
    parsePocActorsDependencyPortsV1(dependenciesValue);

    if (operation.kind === "actors.adjust_stamina") {
      const stamina = actorStaminaV1(state, operation.actorId);
      const sum = sumStaminaComponentsV1(operation.components);
      let nextCurrent: NonNegativeSafeInteger;
      if (operation.application === "debit") {
        if (sum < 0) {
          const required = parseNonNegativeSafeInteger(0 - sum);
          if (required > stamina.current) {
            return rejectedActorsChangeV1({
              code: "actor.insufficient_stamina",
              details: {
                actorId: operation.actorId,
                required,
                available: stamina.current,
              },
            });
          }
        }
        nextCurrent =
          sum > 0 && stamina.current > stamina.maximum - sum
            ? parseNonNegativeSafeInteger(stamina.maximum)
            : parseNonNegativeSafeInteger(stamina.current + sum);
      } else {
        const effectiveRecovery = Math.max(0, sum);
        nextCurrent =
          effectiveRecovery > stamina.maximum - stamina.current
            ? parseNonNegativeSafeInteger(stamina.maximum)
            : parseNonNegativeSafeInteger(stamina.current + effectiveRecovery);
      }
      const after = withActorStaminaV1(state, operation.actorId, nextCurrent);
      return proposedActorsChangeV1(operation.kind, state, after, [
        {
          kind: "actor.stamina_changed",
          actorId: operation.actorId,
          value: { before: stamina.current, after: nextCurrent },
          components: operation.components,
        },
      ]);
    }

    if (operation.kind === "actors.adjust_mood") {
      const beforeMood = actorMoodV1(state, operation.actorId);
      const afterMood = saturatingMoodAddV1(beforeMood, operation.delta);
      const after = withActorMoodV1(state, operation.actorId, afterMood);
      return proposedActorsChangeV1(operation.kind, state, after, [
        {
          kind: "actor.mood_changed",
          actorId: operation.actorId,
          value: { before: beforeMood, after: afterMood },
          reason: operation.reason,
        },
      ]);
    }

    if (operation.kind === "actors.adjust_relationship") {
      const affection = saturatingSafeIntegerAddV1(
        state.relationship.affection,
        operation.affectionDelta,
      );
      const teamwork = saturatingNonNegativeAddV1(
        state.relationship.teamwork,
        operation.teamworkDelta,
      );
      const after = pocActorsStateSchemaV1.parse({
        ...state,
        relationship: { ...state.relationship, affection, teamwork },
      });
      return proposedActorsChangeV1(operation.kind, state, after, [
        {
          kind: "relationship.affection_changed",
          value: { before: state.relationship.affection, after: affection },
          reason: operation.reason,
        },
        {
          kind: "relationship.teamwork_changed",
          value: { before: state.relationship.teamwork, after: teamwork },
          reason: operation.reason,
        },
      ]);
    }

    if (operation.kind === "actors.relationship.stage.set") {
      const after = pocActorsStateSchemaV1.parse({
        ...state,
        relationship: { ...state.relationship, stage: operation.stage },
      });
      return proposedActorsChangeV1(operation.kind, state, after, [
        {
          kind: "relationship.stage_changed",
          value: { before: state.relationship.stage, after: operation.stage },
          reason: operation.reason,
        },
      ]);
    }

    if (operation.kind === "actors.debug.set_stamina") {
      const stamina = actorStaminaV1(state, operation.actorId);
      if (operation.value > stamina.maximum) {
        throw new TypeError("Actors debug stamina exceeds maximum");
      }
      const reason = debugReasonV1("debug.actor.set_stamina", operation.reasonId);
      const component = deepFreezePocValueV1({
        requestedDelta: parseSafeInteger(operation.value - stamina.current),
        reason,
      });
      const after = withActorStaminaV1(state, operation.actorId, operation.value);
      return proposedActorsChangeV1(operation.kind, state, after, [
        {
          kind: "actor.stamina_changed",
          actorId: operation.actorId,
          value: { before: stamina.current, after: operation.value },
          components: deepFreezePocValueV1([component]),
        },
      ]);
    }

    if (operation.kind === "actors.debug.set_mood") {
      const beforeMood = actorMoodV1(state, operation.actorId);
      const reason = debugReasonV1("debug.actor.set_mood", operation.reasonId);
      const after = withActorMoodV1(state, operation.actorId, operation.value);
      return proposedActorsChangeV1(operation.kind, state, after, [
        {
          kind: "actor.mood_changed",
          actorId: operation.actorId,
          value: { before: beforeMood, after: operation.value },
          reason,
        },
      ]);
    }

    const reason = debugReasonV1("debug.relationship.set", operation.reasonId);
    const after = pocActorsStateSchemaV1.parse({
      ...state,
      relationship: {
        affection: operation.affection,
        teamwork: operation.teamwork,
        stage: operation.stage,
      },
    });
    return proposedActorsChangeV1(operation.kind, state, after, [
      {
        kind: "relationship.affection_changed",
        value: { before: state.relationship.affection, after: operation.affection },
        reason,
      },
      {
        kind: "relationship.teamwork_changed",
        value: { before: state.relationship.teamwork, after: operation.teamwork },
        reason,
      },
      {
        kind: "relationship.stage_changed",
        value: { before: state.relationship.stage, after: operation.stage },
        reason,
      },
    ]);
  },

  apply(
    stateValue: DeepReadonly<ActorsStateV1>,
    proposalValue: DeepReadonly<PocActorsOwnerProposalV1>,
  ): ActorsStateV1 {
    const state = pocActorsStateSchemaV1.parse(stateValue);
    assertValidActorsStateV1(state, "Actors State");
    const proposal = pocActorsOwnerProposalSchemaV1.parse(proposalValue);
    if (!pocActorsStatesEqualV1(state, proposal.payload.before)) {
      throw new TypeError("stale Actors owner proposal");
    }
    assertValidActorsStateV1(proposal.payload.after, "Actors proposal");
    return pocActorsStateSchemaV1.parse(proposal.payload.after);
  },
});

function definePocActorsGameplayModuleV1(initialStateValue: DeepReadonly<ActorsStateV1>) {
  const initialState = pocActorsStateSchemaV1.parse(initialStateValue);
  assertValidActorsStateV1(initialState, "initial Actors State");
  return definePocGameplayModuleV1({
    bindingKind: "stateful" as const,
    descriptor: descriptorForPocModuleV1("actors"),
    commandSchema: null,
    querySchema: null,
    queryResultSchema: null,
    stateSchema: pocActorsStateSchemaV1,
    ownerOperationSchema: pocActorsOwnerOperationSchemaV1,
    ownerProposalSchema: pocActorsOwnerProposalSchemaV1,
    localInvariants: Object.freeze([pocActorsInvariantV1]),
    owner: pocActorsOwnerV1,
    queries: null,
    createInitialState(_bootstrap: DeepReadonly<PocGameBootstrapInputV1>): ActorsStateV1 {
      return pocActorsStateSchemaV1.parse(initialState);
    },
    createReadPort: createPocActorsReadPortV1,
  });
}

export type PocActorsGameplayModuleV1 = ReturnType<typeof definePocActorsGameplayModuleV1>;

export function createPocActorsGameplayModuleV1(
  initialStateValue: DeepReadonly<ActorsStateV1>,
): PocActorsGameplayModuleV1 {
  return definePocActorsGameplayModuleV1(initialStateValue);
}
