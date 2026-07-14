// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { canonicalJsonBytes } from "@sillymaker/base";
import type {
  DeepReadonly,
  ModuleOwnerProposalEnvelopeV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";

import {
  parseActionId,
  parseActorId,
  parseAuraId,
  parseEndingId,
  parseEventId,
  parseFacilityId,
  parseReasonId,
  parseRelationshipStage,
} from "../../contracts/ids.js";
import type { ActorId, RelationshipStage } from "../../contracts/ids.js";
import { pocDebugCommandKindsV1 } from "../../contracts/types.js";
import type {
  ActorsStateV1,
  ChangeReasonV1,
  PocGameCommandV1,
  PocGameplayFactV1,
  StaminaChangeComponentV1,
} from "../../contracts/types.js";
import {
  deepFreezePocValueV1,
  parseMoodPoint,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseSafeInteger,
} from "../../contracts/values.js";
import type { MoodPoint, NonNegativeSafeInteger, SafeInteger } from "../../contracts/values.js";
import { parseAttributeRank } from "../../contracts/ids.js";

export type PocActorsOwnerOperationV1 =
  | {
      readonly kind: "actors.adjust_stamina";
      readonly actorId: ActorId;
      readonly application: "debit" | "recovery";
      readonly components: readonly [StaminaChangeComponentV1, ...StaminaChangeComponentV1[]];
    }
  | {
      readonly kind: "actors.adjust_mood";
      readonly actorId: ActorId;
      readonly delta: SafeInteger;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "actors.adjust_relationship";
      readonly affectionDelta: SafeInteger;
      readonly teamworkDelta: SafeInteger;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "actors.relationship.stage.set";
      readonly stage: RelationshipStage;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "actors.debug.set_stamina";
      readonly actorId: ActorId;
      readonly value: NonNegativeSafeInteger;
      readonly reasonId: ReturnType<typeof parseReasonId>;
    }
  | {
      readonly kind: "actors.debug.set_mood";
      readonly actorId: ActorId;
      readonly value: MoodPoint;
      readonly reasonId: ReturnType<typeof parseReasonId>;
    }
  | {
      readonly kind: "actors.debug.set_relationship";
      readonly affection: SafeInteger;
      readonly teamwork: NonNegativeSafeInteger;
      readonly stage: RelationshipStage;
      readonly reasonId: ReturnType<typeof parseReasonId>;
    };

export type PocActorsGameplayFactV1 = Extract<
  PocGameplayFactV1,
  {
    readonly kind:
      | "actor.stamina_changed"
      | "actor.mood_changed"
      | "relationship.affection_changed"
      | "relationship.teamwork_changed"
      | "relationship.stage_changed";
  }
>;

export interface PocActorsOwnerProposalPayloadV1 {
  readonly kind: PocActorsOwnerOperationV1["kind"];
  readonly before: ActorsStateV1;
  readonly after: ActorsStateV1;
}

export type PocActorsOwnerProposalV1 = ModuleOwnerProposalEnvelopeV1<
  PocActorsOwnerProposalPayloadV1,
  PocActorsGameplayFactV1
>;

export type PocActorsReadPortV1 = ActorsStateV1;
export type PocActorsDependencyPortsV1 = Readonly<Record<never, never>>;

type PlainDataRecordV1 = Record<string, unknown>;

function exactDataObjectV1(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): PlainDataRecordV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const keys = Reflect.ownKeys(value);
  const expected = new Set(expectedKeys);
  if (
    keys.length !== expected.size ||
    keys.some((key) => typeof key !== "string" || !expected.has(key))
  ) {
    throw new TypeError(`invalid ${label} fields`);
  }
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} field ${key}`);
    }
  }
  return value as PlainDataRecordV1;
}

function exactDataObjectForKindV1(value: unknown, label: string): PlainDataRecordV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const keys = Reflect.ownKeys(value);
  if (!keys.includes("kind")) throw new TypeError(`invalid ${label} fields`);
  for (const key of keys) {
    if (typeof key !== "string") throw new TypeError(`invalid ${label} fields`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} field ${key}`);
    }
  }
  return value as PlainDataRecordV1;
}

function dataPropertyV1(record: PlainDataRecordV1, key: string, label: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined || !("value" in descriptor)) {
    throw new TypeError(`invalid ${label} field ${key}`);
  }
  return descriptor.value;
}

function exactDataArrayV1(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`invalid ${label}`);
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined ||
    !("value" in lengthDescriptor) ||
    typeof lengthDescriptor.value !== "number" ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const length = lengthDescriptor.value;
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== length + 1 ||
    keys.some(
      (key) =>
        typeof key !== "string" ||
        (key !== "length" && (!/^(?:0|[1-9][0-9]*)$/u.test(key) || Number(key) >= length)),
    )
  ) {
    throw new TypeError(`invalid ${label} fields`);
  }
  const result: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} element ${index}`);
    }
    result.push(descriptor.value);
  }
  return Object.freeze(result);
}

function parseStaminaStateV1(value: unknown, label: string) {
  const state = exactDataObjectV1(value, ["current", "maximum"], label);
  return deepFreezePocValueV1({
    current: parseNonNegativeSafeInteger(dataPropertyV1(state, "current", label)),
    maximum: parsePositiveSafeInteger(dataPropertyV1(state, "maximum", label)),
  });
}

function parseActorsStateV1(value: unknown): ActorsStateV1 {
  const state = exactDataObjectV1(value, ["player", "heroine", "relationship"], "Actors State");
  const playerValue = exactDataObjectV1(
    dataPropertyV1(state, "player", "Actors State"),
    ["actorId", "stamina", "mood", "attributes"],
    "Player Actor State",
  );
  const playerActorId = parseActorId(dataPropertyV1(playerValue, "actorId", "Player Actor State"));
  if (playerActorId !== "actor.player") throw new TypeError("invalid Player ActorId");
  const attributes = exactDataObjectV1(
    dataPropertyV1(playerValue, "attributes", "Player Actor State"),
    ["body", "social", "intellect"],
    "Player attributes",
  );
  const heroineValue = exactDataObjectV1(
    dataPropertyV1(state, "heroine", "Actors State"),
    ["actorId", "stamina", "mood"],
    "Heroine Actor State",
  );
  const heroineActorId = parseActorId(
    dataPropertyV1(heroineValue, "actorId", "Heroine Actor State"),
  );
  if (heroineActorId !== "actor.heroine") throw new TypeError("invalid Heroine ActorId");
  const relationship = exactDataObjectV1(
    dataPropertyV1(state, "relationship", "Actors State"),
    ["affection", "teamwork", "stage"],
    "Relationship State",
  );
  return deepFreezePocValueV1({
    player: {
      actorId: "actor.player",
      stamina: parseStaminaStateV1(
        dataPropertyV1(playerValue, "stamina", "Player Actor State"),
        "Player stamina",
      ),
      mood: parseMoodPoint(dataPropertyV1(playerValue, "mood", "Player Actor State")),
      attributes: {
        body: parseAttributeRank(dataPropertyV1(attributes, "body", "Player attributes")),
        social: parseAttributeRank(dataPropertyV1(attributes, "social", "Player attributes")),
        intellect: parseAttributeRank(dataPropertyV1(attributes, "intellect", "Player attributes")),
      },
    },
    heroine: {
      actorId: "actor.heroine",
      stamina: parseStaminaStateV1(
        dataPropertyV1(heroineValue, "stamina", "Heroine Actor State"),
        "Heroine stamina",
      ),
      mood: parseMoodPoint(dataPropertyV1(heroineValue, "mood", "Heroine Actor State")),
    },
    relationship: {
      affection: parseSafeInteger(dataPropertyV1(relationship, "affection", "Relationship State")),
      teamwork: parseNonNegativeSafeInteger(
        dataPropertyV1(relationship, "teamwork", "Relationship State"),
      ),
      stage: parseRelationshipStage(dataPropertyV1(relationship, "stage", "Relationship State")),
    },
  });
}

export const pocActorsStateSchemaV1: RuntimeSchemaV1<ActorsStateV1> = Object.freeze({
  parse: parseActorsStateV1,
});

interface PocActorsInvariantViolationV1 {
  readonly code: "stamina.above_maximum";
  readonly details: {
    readonly actorId: ActorId;
    readonly current: NonNegativeSafeInteger;
    readonly maximum: ReturnType<typeof parsePositiveSafeInteger>;
  };
}

const noActorsInvariantViolationsV1: readonly PocActorsInvariantViolationV1[] = Object.freeze([]);

export const pocActorsInvariantV1 = Object.freeze({
  check(
    stateValue: DeepReadonly<ActorsStateV1>,
    _readPort: PocActorsReadPortV1,
  ): readonly PocActorsInvariantViolationV1[] {
    const state = pocActorsStateSchemaV1.parse(stateValue);
    const violations: PocActorsInvariantViolationV1[] = [];
    for (const actor of [state.player, state.heroine] as const) {
      if (actor.stamina.current > actor.stamina.maximum) {
        violations.push(
          deepFreezePocValueV1({
            code: "stamina.above_maximum" as const,
            details: {
              actorId: actor.actorId,
              current: actor.stamina.current,
              maximum: actor.stamina.maximum,
            },
          }),
        );
      }
    }
    return violations.length === 0
      ? noActorsInvariantViolationsV1
      : deepFreezePocValueV1(violations);
  },
});

const pocGameCommandKindsV1 = Object.freeze([
  "run.start",
  "policy.choose",
  "inventory.buy",
  "actor.prepare_food",
  "actor.rest",
  "story.action.start",
  "facility.choose",
  "tavern.plan.set",
  "tavern.opening.start",
  "tavern.opening.continue",
  "tavern.opening.finalize",
  "world.action.begin",
  "world.action.complete",
  "narrative.advance",
  "narrative.choose",
  "calendar.advance_phase",
  "levy.pay",
] as const satisfies readonly PocGameCommandV1["kind"][]);

function parseChangeReasonV1(value: unknown): ChangeReasonV1 {
  const reason = exactDataObjectForKindV1(value, "Actors change reason");
  const kind = dataPropertyV1(reason, "kind", "Actors change reason");
  const keysByKind: Readonly<Record<ChangeReasonV1["kind"], readonly string[]>> = {
    command: ["kind", "commandKind", "reasonId"],
    debug: ["kind", "commandKind", "reasonId"],
    event: ["kind", "eventId", "reasonId"],
    story_action: ["kind", "actionId", "reasonId"],
    world_action: ["kind", "actionId", "reasonId"],
    aura: ["kind", "auraId", "reasonId"],
    facility: ["kind", "facilityId", "reasonId"],
    ending: ["kind", "endingId", "reasonId"],
  };
  if (typeof kind !== "string" || !Object.hasOwn(keysByKind, kind)) {
    throw new TypeError("invalid Actors change reason kind");
  }
  exactDataObjectV1(value, keysByKind[kind as ChangeReasonV1["kind"]], "Actors change reason");
  const reasonId = parseReasonId(dataPropertyV1(reason, "reasonId", "Actors change reason"));
  if (kind === "command") {
    const commandKind = dataPropertyV1(reason, "commandKind", "Actors change reason");
    if (!pocGameCommandKindsV1.includes(commandKind as PocGameCommandV1["kind"])) {
      throw new TypeError("invalid Actors command change reason");
    }
    return deepFreezePocValueV1({
      kind,
      commandKind: commandKind as PocGameCommandV1["kind"],
      reasonId,
    });
  }
  if (kind === "debug") {
    const commandKind = dataPropertyV1(reason, "commandKind", "Actors change reason");
    if (!pocDebugCommandKindsV1.includes(commandKind as (typeof pocDebugCommandKindsV1)[number])) {
      throw new TypeError("invalid Actors debug change reason");
    }
    return deepFreezePocValueV1({
      kind,
      commandKind: commandKind as (typeof pocDebugCommandKindsV1)[number],
      reasonId,
    });
  }
  if (kind === "event") {
    return deepFreezePocValueV1({
      kind,
      eventId: parseEventId(dataPropertyV1(reason, "eventId", "Actors change reason")),
      reasonId,
    });
  }
  if (kind === "story_action" || kind === "world_action") {
    return deepFreezePocValueV1({
      kind,
      actionId: parseActionId(dataPropertyV1(reason, "actionId", "Actors change reason")),
      reasonId,
    });
  }
  if (kind === "aura") {
    return deepFreezePocValueV1({
      kind,
      auraId: parseAuraId(dataPropertyV1(reason, "auraId", "Actors change reason")),
      reasonId,
    });
  }
  if (kind === "facility") {
    return deepFreezePocValueV1({
      kind,
      facilityId: parseFacilityId(dataPropertyV1(reason, "facilityId", "Actors change reason")),
      reasonId,
    });
  }
  return deepFreezePocValueV1({
    kind: "ending",
    endingId: parseEndingId(dataPropertyV1(reason, "endingId", "Actors change reason")),
    reasonId,
  });
}

function parseStaminaComponentV1(value: unknown): StaminaChangeComponentV1 {
  const component = exactDataObjectV1(
    value,
    ["requestedDelta", "reason"],
    "Actors stamina component",
  );
  return deepFreezePocValueV1({
    requestedDelta: parseSafeInteger(
      dataPropertyV1(component, "requestedDelta", "Actors stamina component"),
    ),
    reason: parseChangeReasonV1(dataPropertyV1(component, "reason", "Actors stamina component")),
  });
}

function parseStaminaComponentsV1(
  value: unknown,
): readonly [StaminaChangeComponentV1, ...StaminaChangeComponentV1[]] {
  const components = exactDataArrayV1(value, "Actors stamina components");
  if (components.length === 0) throw new TypeError("Actors stamina components must not be empty");
  return deepFreezePocValueV1(
    components.map(parseStaminaComponentV1) as [
      StaminaChangeComponentV1,
      ...StaminaChangeComponentV1[],
    ],
  );
}

function parseActorsOwnerOperationV1(value: unknown): PocActorsOwnerOperationV1 {
  const operation = exactDataObjectForKindV1(value, "Actors owner operation");
  const kind = dataPropertyV1(operation, "kind", "Actors owner operation");
  if (kind === "actors.adjust_stamina") {
    exactDataObjectV1(
      value,
      ["kind", "actorId", "application", "components"],
      "Actors owner operation",
    );
    const application = dataPropertyV1(operation, "application", "Actors owner operation");
    if (application !== "debit" && application !== "recovery") {
      throw new TypeError("invalid Actors stamina application");
    }
    return deepFreezePocValueV1({
      kind,
      actorId: parseActorId(dataPropertyV1(operation, "actorId", "Actors owner operation")),
      application,
      components: parseStaminaComponentsV1(
        dataPropertyV1(operation, "components", "Actors owner operation"),
      ),
    });
  }
  if (kind === "actors.adjust_mood") {
    exactDataObjectV1(value, ["kind", "actorId", "delta", "reason"], "Actors owner operation");
    return deepFreezePocValueV1({
      kind,
      actorId: parseActorId(dataPropertyV1(operation, "actorId", "Actors owner operation")),
      delta: parseSafeInteger(dataPropertyV1(operation, "delta", "Actors owner operation")),
      reason: parseChangeReasonV1(dataPropertyV1(operation, "reason", "Actors owner operation")),
    });
  }
  if (kind === "actors.adjust_relationship") {
    exactDataObjectV1(
      value,
      ["kind", "affectionDelta", "teamworkDelta", "reason"],
      "Actors owner operation",
    );
    return deepFreezePocValueV1({
      kind,
      affectionDelta: parseSafeInteger(
        dataPropertyV1(operation, "affectionDelta", "Actors owner operation"),
      ),
      teamworkDelta: parseSafeInteger(
        dataPropertyV1(operation, "teamworkDelta", "Actors owner operation"),
      ),
      reason: parseChangeReasonV1(dataPropertyV1(operation, "reason", "Actors owner operation")),
    });
  }
  if (kind === "actors.relationship.stage.set") {
    exactDataObjectV1(value, ["kind", "stage", "reason"], "Actors owner operation");
    return deepFreezePocValueV1({
      kind,
      stage: parseRelationshipStage(dataPropertyV1(operation, "stage", "Actors owner operation")),
      reason: parseChangeReasonV1(dataPropertyV1(operation, "reason", "Actors owner operation")),
    });
  }
  if (kind === "actors.debug.set_stamina") {
    exactDataObjectV1(value, ["kind", "actorId", "value", "reasonId"], "Actors owner operation");
    return deepFreezePocValueV1({
      kind,
      actorId: parseActorId(dataPropertyV1(operation, "actorId", "Actors owner operation")),
      value: parseNonNegativeSafeInteger(
        dataPropertyV1(operation, "value", "Actors owner operation"),
      ),
      reasonId: parseReasonId(dataPropertyV1(operation, "reasonId", "Actors owner operation")),
    });
  }
  if (kind === "actors.debug.set_mood") {
    exactDataObjectV1(value, ["kind", "actorId", "value", "reasonId"], "Actors owner operation");
    return deepFreezePocValueV1({
      kind,
      actorId: parseActorId(dataPropertyV1(operation, "actorId", "Actors owner operation")),
      value: parseMoodPoint(dataPropertyV1(operation, "value", "Actors owner operation")),
      reasonId: parseReasonId(dataPropertyV1(operation, "reasonId", "Actors owner operation")),
    });
  }
  if (kind === "actors.debug.set_relationship") {
    exactDataObjectV1(
      value,
      ["kind", "affection", "teamwork", "stage", "reasonId"],
      "Actors owner operation",
    );
    return deepFreezePocValueV1({
      kind,
      affection: parseSafeInteger(dataPropertyV1(operation, "affection", "Actors owner operation")),
      teamwork: parseNonNegativeSafeInteger(
        dataPropertyV1(operation, "teamwork", "Actors owner operation"),
      ),
      stage: parseRelationshipStage(dataPropertyV1(operation, "stage", "Actors owner operation")),
      reasonId: parseReasonId(dataPropertyV1(operation, "reasonId", "Actors owner operation")),
    });
  }
  throw new TypeError("invalid Actors owner operation kind");
}

export const pocActorsOwnerOperationSchemaV1: RuntimeSchemaV1<PocActorsOwnerOperationV1> =
  Object.freeze({ parse: parseActorsOwnerOperationV1 });

export function parsePocActorsDependencyPortsV1(value: unknown): PocActorsDependencyPortsV1 {
  const dependencies = exactDataObjectV1(value, [], "Actors dependency ports");
  if (!Object.isFrozen(dependencies)) throw new TypeError("Actors dependency ports must be frozen");
  return Object.freeze({});
}

export const pocActorsDependencyPortsSchemaV1: RuntimeSchemaV1<PocActorsDependencyPortsV1> =
  Object.freeze({ parse: parsePocActorsDependencyPortsV1 });

function parseBeforeAfterV1<TValue>(
  value: unknown,
  label: string,
  parseValue: (input: unknown) => TValue,
) {
  const pair = exactDataObjectV1(value, ["before", "after"], label);
  return deepFreezePocValueV1({
    before: parseValue(dataPropertyV1(pair, "before", label)),
    after: parseValue(dataPropertyV1(pair, "after", label)),
  });
}

function parseActorsFactV1(value: unknown): PocActorsGameplayFactV1 {
  const fact = exactDataObjectForKindV1(value, "Actors Fact");
  const kind = dataPropertyV1(fact, "kind", "Actors Fact");
  if (kind === "actor.stamina_changed") {
    exactDataObjectV1(value, ["kind", "actorId", "value", "components"], "Actors stamina Fact");
    return deepFreezePocValueV1({
      kind,
      actorId: parseActorId(dataPropertyV1(fact, "actorId", "Actors stamina Fact")),
      value: parseBeforeAfterV1(
        dataPropertyV1(fact, "value", "Actors stamina Fact"),
        "Actors stamina change",
        parseNonNegativeSafeInteger,
      ),
      components: parseStaminaComponentsV1(
        dataPropertyV1(fact, "components", "Actors stamina Fact"),
      ),
    });
  }
  if (kind === "actor.mood_changed") {
    exactDataObjectV1(value, ["kind", "actorId", "value", "reason"], "Actors mood Fact");
    return deepFreezePocValueV1({
      kind,
      actorId: parseActorId(dataPropertyV1(fact, "actorId", "Actors mood Fact")),
      value: parseBeforeAfterV1(
        dataPropertyV1(fact, "value", "Actors mood Fact"),
        "Actors mood change",
        parseMoodPoint,
      ),
      reason: parseChangeReasonV1(dataPropertyV1(fact, "reason", "Actors mood Fact")),
    });
  }
  if (kind === "relationship.affection_changed") {
    exactDataObjectV1(value, ["kind", "value", "reason"], "Actors affection Fact");
    return deepFreezePocValueV1({
      kind,
      value: parseBeforeAfterV1(
        dataPropertyV1(fact, "value", "Actors affection Fact"),
        "Actors affection change",
        parseSafeInteger,
      ),
      reason: parseChangeReasonV1(dataPropertyV1(fact, "reason", "Actors affection Fact")),
    });
  }
  if (kind === "relationship.teamwork_changed") {
    exactDataObjectV1(value, ["kind", "value", "reason"], "Actors teamwork Fact");
    return deepFreezePocValueV1({
      kind,
      value: parseBeforeAfterV1(
        dataPropertyV1(fact, "value", "Actors teamwork Fact"),
        "Actors teamwork change",
        parseNonNegativeSafeInteger,
      ),
      reason: parseChangeReasonV1(dataPropertyV1(fact, "reason", "Actors teamwork Fact")),
    });
  }
  if (kind === "relationship.stage_changed") {
    exactDataObjectV1(value, ["kind", "value", "reason"], "Actors stage Fact");
    return deepFreezePocValueV1({
      kind,
      value: parseBeforeAfterV1(
        dataPropertyV1(fact, "value", "Actors stage Fact"),
        "Actors stage change",
        parseRelationshipStage,
      ),
      reason: parseChangeReasonV1(dataPropertyV1(fact, "reason", "Actors stage Fact")),
    });
  }
  throw new TypeError("invalid Actors Fact kind");
}

function canonicalValuesEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.length === rightBytes.length &&
    leftBytes.every((byte, index) => byte === rightBytes[index])
  );
}

export function pocActorsStatesEqualV1(left: ActorsStateV1, right: ActorsStateV1): boolean {
  return canonicalValuesEqualV1(left, right);
}

function stateWithoutPlayerStaminaV1(state: ActorsStateV1) {
  return {
    ...state,
    player: { ...state.player, stamina: null },
  };
}

function stateWithoutHeroineStaminaV1(state: ActorsStateV1) {
  return {
    ...state,
    heroine: { ...state.heroine, stamina: null },
  };
}

function stateWithoutPlayerMoodV1(state: ActorsStateV1) {
  return { ...state, player: { ...state.player, mood: null } };
}

function stateWithoutHeroineMoodV1(state: ActorsStateV1) {
  return { ...state, heroine: { ...state.heroine, mood: null } };
}

function assertValidStaminaStateV1(state: ActorsStateV1): void {
  if (
    state.player.stamina.current > state.player.stamina.maximum ||
    state.heroine.stamina.current > state.heroine.stamina.maximum
  ) {
    throw new TypeError("Actors proposal contains invalid stamina");
  }
}

function assertDebugReasonV1(reason: ChangeReasonV1, commandKind: string): void {
  if (reason.kind !== "debug" || reason.commandKind !== commandKind) {
    throw new TypeError("Actors debug Fact reason is inconsistent");
  }
}

function sumStaminaFactComponentsV1(components: readonly StaminaChangeComponentV1[]): SafeInteger {
  let sum = 0;
  for (const { requestedDelta } of components) {
    if (
      (requestedDelta > 0 && sum > Number.MAX_SAFE_INTEGER - requestedDelta) ||
      (requestedDelta < 0 && sum < Number.MIN_SAFE_INTEGER - requestedDelta)
    ) {
      throw new TypeError("Actors stamina Fact component sum exceeds safe integer bounds");
    }
    sum += requestedDelta;
  }
  return parseSafeInteger(sum);
}

function assertProposalConsistencyV1(proposal: PocActorsOwnerProposalV1): void {
  const { after, before, kind } = proposal.payload;
  assertValidStaminaStateV1(before);
  assertValidStaminaStateV1(after);
  if (kind === "actors.adjust_stamina" || kind === "actors.debug.set_stamina") {
    const [fact] = proposal.facts;
    if (proposal.facts.length !== 1 || fact?.kind !== "actor.stamina_changed") {
      throw new TypeError("Actors stamina proposal is inconsistent");
    }
    const beforeActor = fact.actorId === "actor.player" ? before.player : before.heroine;
    const afterActor = fact.actorId === "actor.player" ? after.player : after.heroine;
    const untouched =
      fact.actorId === "actor.player"
        ? canonicalValuesEqualV1(
            stateWithoutPlayerStaminaV1(before),
            stateWithoutPlayerStaminaV1(after),
          )
        : canonicalValuesEqualV1(
            stateWithoutHeroineStaminaV1(before),
            stateWithoutHeroineStaminaV1(after),
          );
    if (
      !untouched ||
      beforeActor.stamina.maximum !== afterActor.stamina.maximum ||
      fact.value.before !== beforeActor.stamina.current ||
      fact.value.after !== afterActor.stamina.current
    ) {
      throw new TypeError("Actors stamina proposal is inconsistent");
    }
    if (kind === "actors.debug.set_stamina") {
      if (fact.components.length !== 1) {
        throw new TypeError("Actors debug stamina proposal is inconsistent");
      }
      const [component] = fact.components;
      if (
        component === undefined ||
        component.requestedDelta !== fact.value.after - fact.value.before
      ) {
        throw new TypeError("Actors debug stamina proposal is inconsistent");
      }
      assertDebugReasonV1(component.reason, "debug.actor.set_stamina");
    } else {
      const sum = sumStaminaFactComponentsV1(fact.components);
      const beforeCurrent = beforeActor.stamina.current;
      const maximum = beforeActor.stamina.maximum;
      const recoveryAfter =
        sum > 0 && sum > maximum - beforeCurrent ? maximum : beforeCurrent + Math.max(0, sum);
      const debitAfter =
        sum < 0 ? (beforeCurrent + sum >= 0 ? beforeCurrent + sum : null) : recoveryAfter;
      if (fact.value.after !== recoveryAfter && fact.value.after !== debitAfter) {
        throw new TypeError("Actors stamina proposal does not match its ordered components");
      }
    }
    return;
  }
  if (kind === "actors.adjust_mood" || kind === "actors.debug.set_mood") {
    const [fact] = proposal.facts;
    if (proposal.facts.length !== 1 || fact?.kind !== "actor.mood_changed") {
      throw new TypeError("Actors mood proposal is inconsistent");
    }
    const beforeActor = fact.actorId === "actor.player" ? before.player : before.heroine;
    const afterActor = fact.actorId === "actor.player" ? after.player : after.heroine;
    const untouched =
      fact.actorId === "actor.player"
        ? canonicalValuesEqualV1(stateWithoutPlayerMoodV1(before), stateWithoutPlayerMoodV1(after))
        : canonicalValuesEqualV1(
            stateWithoutHeroineMoodV1(before),
            stateWithoutHeroineMoodV1(after),
          );
    if (
      !untouched ||
      fact.value.before !== beforeActor.mood ||
      fact.value.after !== afterActor.mood
    ) {
      throw new TypeError("Actors mood proposal is inconsistent");
    }
    if (kind === "actors.debug.set_mood") {
      assertDebugReasonV1(fact.reason, "debug.actor.set_mood");
    }
    return;
  }
  if (kind === "actors.adjust_relationship") {
    const [affectionFact, teamworkFact] = proposal.facts;
    if (
      proposal.facts.length !== 2 ||
      affectionFact?.kind !== "relationship.affection_changed" ||
      teamworkFact?.kind !== "relationship.teamwork_changed" ||
      !canonicalValuesEqualV1(before.player, after.player) ||
      !canonicalValuesEqualV1(before.heroine, after.heroine) ||
      before.relationship.stage !== after.relationship.stage ||
      affectionFact.value.before !== before.relationship.affection ||
      affectionFact.value.after !== after.relationship.affection ||
      teamworkFact.value.before !== before.relationship.teamwork ||
      teamworkFact.value.after !== after.relationship.teamwork ||
      !canonicalValuesEqualV1(affectionFact.reason, teamworkFact.reason)
    ) {
      throw new TypeError("Actors relationship proposal is inconsistent");
    }
    return;
  }
  if (kind === "actors.relationship.stage.set") {
    const [fact] = proposal.facts;
    if (
      proposal.facts.length !== 1 ||
      fact?.kind !== "relationship.stage_changed" ||
      !canonicalValuesEqualV1(before.player, after.player) ||
      !canonicalValuesEqualV1(before.heroine, after.heroine) ||
      before.relationship.affection !== after.relationship.affection ||
      before.relationship.teamwork !== after.relationship.teamwork ||
      fact.value.before !== before.relationship.stage ||
      fact.value.after !== after.relationship.stage
    ) {
      throw new TypeError("Actors stage proposal is inconsistent");
    }
    return;
  }
  const [affectionFact, teamworkFact, stageFact] = proposal.facts;
  if (
    proposal.facts.length !== 3 ||
    affectionFact?.kind !== "relationship.affection_changed" ||
    teamworkFact?.kind !== "relationship.teamwork_changed" ||
    stageFact?.kind !== "relationship.stage_changed" ||
    !canonicalValuesEqualV1(before.player, after.player) ||
    !canonicalValuesEqualV1(before.heroine, after.heroine) ||
    affectionFact.value.before !== before.relationship.affection ||
    affectionFact.value.after !== after.relationship.affection ||
    teamworkFact.value.before !== before.relationship.teamwork ||
    teamworkFact.value.after !== after.relationship.teamwork ||
    stageFact.value.before !== before.relationship.stage ||
    stageFact.value.after !== after.relationship.stage
  ) {
    throw new TypeError("Actors debug relationship proposal is inconsistent");
  }
  for (const fact of [affectionFact, teamworkFact, stageFact]) {
    assertDebugReasonV1(fact.reason, "debug.relationship.set");
  }
  if (
    !canonicalValuesEqualV1(affectionFact.reason, teamworkFact.reason) ||
    !canonicalValuesEqualV1(affectionFact.reason, stageFact.reason)
  ) {
    throw new TypeError("Actors debug relationship reasons are inconsistent");
  }
}

function parseProposalKindV1(value: unknown): PocActorsOwnerProposalPayloadV1["kind"] {
  if (
    value === "actors.adjust_stamina" ||
    value === "actors.adjust_mood" ||
    value === "actors.adjust_relationship" ||
    value === "actors.relationship.stage.set" ||
    value === "actors.debug.set_stamina" ||
    value === "actors.debug.set_mood" ||
    value === "actors.debug.set_relationship"
  ) {
    return value;
  }
  throw new TypeError("invalid Actors proposal kind");
}

function expectedFactKindsV1(
  kind: PocActorsOwnerProposalPayloadV1["kind"],
): readonly PocActorsGameplayFactV1["kind"][] {
  if (kind === "actors.adjust_stamina" || kind === "actors.debug.set_stamina") {
    return Object.freeze(["actor.stamina_changed"]);
  }
  if (kind === "actors.adjust_mood" || kind === "actors.debug.set_mood") {
    return Object.freeze(["actor.mood_changed"]);
  }
  if (kind === "actors.adjust_relationship") {
    return Object.freeze(["relationship.affection_changed", "relationship.teamwork_changed"]);
  }
  if (kind === "actors.relationship.stage.set") {
    return Object.freeze(["relationship.stage_changed"]);
  }
  return Object.freeze([
    "relationship.affection_changed",
    "relationship.teamwork_changed",
    "relationship.stage_changed",
  ]);
}

export const pocActorsOwnerProposalSchemaV1: RuntimeSchemaV1<PocActorsOwnerProposalV1> =
  Object.freeze({
    parse(value: unknown): PocActorsOwnerProposalV1 {
      const proposal = exactDataObjectV1(value, ["payload", "facts"], "Actors owner proposal");
      const payloadValue = exactDataObjectV1(
        dataPropertyV1(proposal, "payload", "Actors owner proposal"),
        ["kind", "before", "after"],
        "Actors owner proposal payload",
      );
      const kind = parseProposalKindV1(
        dataPropertyV1(payloadValue, "kind", "Actors owner proposal payload"),
      );
      const rawFacts = exactDataArrayV1(
        dataPropertyV1(proposal, "facts", "Actors owner proposal"),
        "Actors owner proposal Facts",
      );
      const expectedKinds = expectedFactKindsV1(kind);
      if (rawFacts.length !== expectedKinds.length) {
        throw new TypeError("invalid Actors owner proposal Facts");
      }
      const facts = rawFacts.map(parseActorsFactV1);
      if (facts.some((fact, index) => fact.kind !== expectedKinds[index])) {
        throw new TypeError("invalid Actors owner proposal Fact order");
      }
      const parsed = deepFreezePocValueV1({
        payload: {
          kind,
          before: pocActorsStateSchemaV1.parse(
            dataPropertyV1(payloadValue, "before", "Actors owner proposal payload"),
          ),
          after: pocActorsStateSchemaV1.parse(
            dataPropertyV1(payloadValue, "after", "Actors owner proposal payload"),
          ),
        },
        facts,
      }) satisfies PocActorsOwnerProposalV1;
      assertProposalConsistencyV1(parsed);
      return parsed;
    },
  });
