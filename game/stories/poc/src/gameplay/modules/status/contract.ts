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
  parseAuraInstanceId,
  parseEndingId,
  parseEventId,
  parseFacilityId,
  parseReasonId,
} from "../../contracts/ids.js";
import { pocDebugCommandKindsV1 } from "../../contracts/types.js";
import type {
  AuraDurationPolicyV1,
  AuraDurationUnitV1,
  AuraDurationV1,
  AuraInstanceV1,
  AuraSourceRefV1,
  AuraTargetV1,
  ChangeReasonV1,
  PocDebugCommandV1,
  PocGameCommandV1,
  PocGameplayFactV1,
  StatusStateV1,
} from "../../contracts/types.js";
import {
  deepFreezePocValueV1,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "../../contracts/values.js";
import type { PositiveSafeInteger } from "../../contracts/values.js";
import type { AuraId, AuraInstanceId, ReasonId } from "../../contracts/ids.js";

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
  const expected = new Set(expectedKeys);
  const keys = Reflect.ownKeys(value);
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
  if (!keys.includes("kind") || keys.some((key) => typeof key !== "string")) {
    throw new TypeError(`invalid ${label} fields`);
  }
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
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    lengthDescriptor.enumerable !== false
  ) {
    throw new TypeError(`invalid ${label} length`);
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
  const parsed: unknown[] = [];
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
    parsed.push(descriptor.value);
  }
  return parsed;
}

function parseAuraDurationUnitV1(value: unknown): AuraDurationUnitV1 {
  if (
    value !== "phase_end" &&
    value !== "day_end" &&
    value !== "opening" &&
    value !== "night_recovery"
  ) {
    throw new TypeError("invalid Aura duration unit");
  }
  return value;
}

export function parsePocAuraTargetV1(value: unknown): AuraTargetV1 {
  const candidate = exactDataObjectForKindV1(value, "Aura target");
  const kind = dataPropertyV1(candidate, "kind", "Aura target");
  if (kind === "actor") {
    const target = exactDataObjectV1(value, ["kind", "actorId"], "Aura target");
    return deepFreezePocValueV1({
      kind,
      actorId: parseActorId(dataPropertyV1(target, "actorId", "Aura target")),
    });
  }
  if (kind === "tavern" || kind === "run") {
    exactDataObjectV1(value, ["kind"], "Aura target");
    return deepFreezePocValueV1({ kind });
  }
  throw new TypeError("invalid Aura target kind");
}

export function parsePocAuraDurationV1(value: unknown): AuraDurationV1 {
  const candidate = exactDataObjectForKindV1(value, "Aura duration");
  const kind = dataPropertyV1(candidate, "kind", "Aura duration");
  if (kind === "countdown") {
    const duration = exactDataObjectV1(value, ["kind", "unit", "remaining"], "Aura duration");
    return deepFreezePocValueV1({
      kind,
      unit: parseAuraDurationUnitV1(dataPropertyV1(duration, "unit", "Aura duration")),
      remaining: parsePositiveSafeInteger(dataPropertyV1(duration, "remaining", "Aura duration")),
    });
  }
  if (kind === "until_cleared") {
    exactDataObjectV1(value, ["kind"], "Aura duration");
    return deepFreezePocValueV1({ kind });
  }
  throw new TypeError("invalid Aura duration kind");
}

function parsePocAuraDurationPolicyV1(value: unknown): AuraDurationPolicyV1 {
  const candidate = exactDataObjectForKindV1(value, "Aura duration policy");
  const kind = dataPropertyV1(candidate, "kind", "Aura duration policy");
  if (kind === "countdown") {
    const policy = exactDataObjectV1(
      value,
      ["kind", "unit", "defaultRemaining", "maximumRemaining"],
      "Aura duration policy",
    );
    const defaultRemaining = parsePositiveSafeInteger(
      dataPropertyV1(policy, "defaultRemaining", "Aura duration policy"),
    );
    const maximumRemaining = parsePositiveSafeInteger(
      dataPropertyV1(policy, "maximumRemaining", "Aura duration policy"),
    );
    if (defaultRemaining > maximumRemaining) {
      throw new TypeError("Aura default duration exceeds maximum");
    }
    return deepFreezePocValueV1({
      kind,
      unit: parseAuraDurationUnitV1(dataPropertyV1(policy, "unit", "Aura duration policy")),
      defaultRemaining,
      maximumRemaining,
    });
  }
  if (kind === "until_cleared") {
    exactDataObjectV1(value, ["kind"], "Aura duration policy");
    return deepFreezePocValueV1({ kind });
  }
  throw new TypeError("invalid Aura duration policy kind");
}

function parsePocAuraSourceRefV1(value: unknown): AuraSourceRefV1 {
  const candidate = exactDataObjectForKindV1(value, "Aura source");
  const kind = dataPropertyV1(candidate, "kind", "Aura source");
  if (kind === "initial" || kind === "debug") {
    const source = exactDataObjectV1(value, ["kind", "reasonId"], "Aura source");
    return deepFreezePocValueV1({
      kind,
      reasonId: parseReasonId(dataPropertyV1(source, "reasonId", "Aura source")),
    });
  }
  if (kind === "story_event") {
    const source = exactDataObjectV1(value, ["kind", "eventId"], "Aura source");
    return deepFreezePocValueV1({
      kind,
      eventId: parseEventId(dataPropertyV1(source, "eventId", "Aura source")),
    });
  }
  if (kind === "story_action" || kind === "world_action") {
    const source = exactDataObjectV1(value, ["kind", "actionId"], "Aura source");
    return deepFreezePocValueV1({
      kind,
      actionId: parseActionId(dataPropertyV1(source, "actionId", "Aura source")),
    });
  }
  if (kind === "facility") {
    const source = exactDataObjectV1(value, ["kind", "facilityId"], "Aura source");
    return deepFreezePocValueV1({
      kind,
      facilityId: parseFacilityId(dataPropertyV1(source, "facilityId", "Aura source")),
    });
  }
  throw new TypeError("invalid Aura source kind");
}

export function parsePocAuraInstanceV1(value: unknown): AuraInstanceV1 {
  const aura = exactDataObjectV1(
    value,
    ["instanceId", "auraId", "target", "source", "duration", "appliedAtSequence"],
    "Aura instance",
  );
  return deepFreezePocValueV1({
    instanceId: parseAuraInstanceId(dataPropertyV1(aura, "instanceId", "Aura instance")),
    auraId: parseAuraId(dataPropertyV1(aura, "auraId", "Aura instance")),
    target: parsePocAuraTargetV1(dataPropertyV1(aura, "target", "Aura instance")),
    source: parsePocAuraSourceRefV1(dataPropertyV1(aura, "source", "Aura instance")),
    duration: parsePocAuraDurationV1(dataPropertyV1(aura, "duration", "Aura instance")),
    appliedAtSequence: parseNonNegativeSafeInteger(
      dataPropertyV1(aura, "appliedAtSequence", "Aura instance"),
    ),
  });
}

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

function parseCommandKindV1(value: unknown): PocGameCommandV1["kind"] {
  if (
    typeof value !== "string" ||
    !pocGameCommandKindsV1.includes(value as PocGameCommandV1["kind"])
  ) {
    throw new TypeError("invalid PoC command kind");
  }
  return value as PocGameCommandV1["kind"];
}

function parseDebugCommandKindV1(value: unknown): PocDebugCommandV1["kind"] {
  if (
    typeof value !== "string" ||
    !pocDebugCommandKindsV1.includes(value as PocDebugCommandV1["kind"])
  ) {
    throw new TypeError("invalid PoC debug command kind");
  }
  return value as PocDebugCommandV1["kind"];
}

export function parsePocChangeReasonV1(value: unknown): ChangeReasonV1 {
  const candidate = exactDataObjectForKindV1(value, "Status change reason");
  const kind = dataPropertyV1(candidate, "kind", "Status change reason");
  const expectedKeys =
    kind === "command" || kind === "debug"
      ? ["kind", "commandKind", "reasonId"]
      : kind === "event"
        ? ["kind", "eventId", "reasonId"]
        : kind === "story_action" || kind === "world_action"
          ? ["kind", "actionId", "reasonId"]
          : kind === "aura"
            ? ["kind", "auraId", "reasonId"]
            : kind === "facility"
              ? ["kind", "facilityId", "reasonId"]
              : kind === "ending"
                ? ["kind", "endingId", "reasonId"]
                : null;
  if (expectedKeys === null) throw new TypeError("invalid Status change reason kind");
  const reason = exactDataObjectV1(value, expectedKeys, "Status change reason");
  const reasonId = parseReasonId(dataPropertyV1(reason, "reasonId", "Status change reason"));
  if (kind === "command") {
    return deepFreezePocValueV1({
      kind,
      commandKind: parseCommandKindV1(
        dataPropertyV1(reason, "commandKind", "Status change reason"),
      ),
      reasonId,
    });
  }
  if (kind === "debug") {
    return deepFreezePocValueV1({
      kind,
      commandKind: parseDebugCommandKindV1(
        dataPropertyV1(reason, "commandKind", "Status change reason"),
      ),
      reasonId,
    });
  }
  if (kind === "event") {
    return deepFreezePocValueV1({
      kind,
      eventId: parseEventId(dataPropertyV1(reason, "eventId", "Status change reason")),
      reasonId,
    });
  }
  if (kind === "story_action" || kind === "world_action") {
    return deepFreezePocValueV1({
      kind,
      actionId: parseActionId(dataPropertyV1(reason, "actionId", "Status change reason")),
      reasonId,
    });
  }
  if (kind === "aura") {
    return deepFreezePocValueV1({
      kind,
      auraId: parseAuraId(dataPropertyV1(reason, "auraId", "Status change reason")),
      reasonId,
    });
  }
  if (kind === "facility") {
    return deepFreezePocValueV1({
      kind,
      facilityId: parseFacilityId(dataPropertyV1(reason, "facilityId", "Status change reason")),
      reasonId,
    });
  }
  if (kind === "ending") {
    return deepFreezePocValueV1({
      kind,
      endingId: parseEndingId(dataPropertyV1(reason, "endingId", "Status change reason")),
      reasonId,
    });
  }
  throw new TypeError("invalid Status change reason");
}

export const pocStatusStateSchemaV1: RuntimeSchemaV1<StatusStateV1> = Object.freeze({
  parse(value: unknown): StatusStateV1 {
    const state = exactDataObjectV1(value, ["auras"], "Status State");
    return deepFreezePocValueV1({
      auras: exactDataArrayV1(dataPropertyV1(state, "auras", "Status State"), "Status Auras").map(
        parsePocAuraInstanceV1,
      ),
    });
  },
});

export interface PocStatusAuraDefinitionPortV1 {
  readonly auraId: AuraId;
  readonly reasonId: ReasonId;
  readonly durationPolicy: AuraDurationPolicyV1;
  readonly allowedTargets: readonly AuraTargetV1[];
}

export interface PocStatusDependencyPortsV1 {
  readonly auraDefinitions: readonly PocStatusAuraDefinitionPortV1[];
}

function auraTargetKeyV1(target: AuraTargetV1): string {
  return target.kind === "actor" ? `actor:${target.actorId}` : target.kind;
}

function parseAuraDefinitionPortV1(value: unknown): PocStatusAuraDefinitionPortV1 {
  const definition = exactDataObjectV1(
    value,
    ["auraId", "reasonId", "durationPolicy", "allowedTargets"],
    "Status Aura definition port",
  );
  const allowedTargets = exactDataArrayV1(
    dataPropertyV1(definition, "allowedTargets", "Status Aura definition port"),
    "Status Aura allowed targets",
  ).map(parsePocAuraTargetV1);
  const targetKeys = allowedTargets.map(auraTargetKeyV1);
  if (new Set(targetKeys).size !== targetKeys.length) {
    throw new TypeError("duplicate Status Aura allowed target");
  }
  return deepFreezePocValueV1({
    auraId: parseAuraId(dataPropertyV1(definition, "auraId", "Status Aura definition port")),
    reasonId: parseReasonId(dataPropertyV1(definition, "reasonId", "Status Aura definition port")),
    durationPolicy: parsePocAuraDurationPolicyV1(
      dataPropertyV1(definition, "durationPolicy", "Status Aura definition port"),
    ),
    allowedTargets,
  });
}

export const pocStatusDependencyPortsSchemaV1: RuntimeSchemaV1<PocStatusDependencyPortsV1> =
  Object.freeze({
    parse(value: unknown): PocStatusDependencyPortsV1 {
      const dependencies = exactDataObjectV1(value, ["auraDefinitions"], "Status dependency ports");
      const auraDefinitions = exactDataArrayV1(
        dataPropertyV1(dependencies, "auraDefinitions", "Status dependency ports"),
        "Status Aura definitions",
      ).map(parseAuraDefinitionPortV1);
      const auraIds = auraDefinitions.map(({ auraId }) => auraId);
      if (new Set(auraIds).size !== auraIds.length) {
        throw new TypeError("duplicate Status Aura definition");
      }
      return deepFreezePocValueV1({ auraDefinitions });
    },
  });

export type PocStatusOwnerOperationV1 =
  | {
      readonly kind: "status.apply";
      readonly aura: AuraInstanceV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "status.clear";
      readonly auraId: AuraId;
      readonly target: AuraTargetV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "status.countdown";
      readonly unit: AuraDurationUnitV1;
      readonly instanceIds: readonly AuraInstanceId[];
    }
  | {
      readonly kind: "status.debug.apply";
      readonly aura: AuraInstanceV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "status.debug.clear_instance";
      readonly instanceId: AuraInstanceId;
      readonly reasonId: ReasonId;
    };

interface PocStatusOwnerOperationRuntimeSchemaV1 {
  parse<const TValue extends { readonly kind: PocStatusOwnerOperationV1["kind"] }>(
    value: TValue,
  ): Extract<PocStatusOwnerOperationV1, { readonly kind: TValue["kind"] }>;
  parse(value: unknown): PocStatusOwnerOperationV1;
}

function parseUniqueAuraInstanceIdsV1(value: unknown): readonly AuraInstanceId[] {
  const instanceIds = exactDataArrayV1(value, "Status countdown instance IDs").map(
    parseAuraInstanceId,
  );
  if (new Set(instanceIds).size !== instanceIds.length) {
    throw new TypeError("duplicate Status countdown AuraInstanceId");
  }
  return deepFreezePocValueV1(instanceIds);
}

export const pocStatusOwnerOperationSchemaV1 = Object.freeze({
  parse(value: unknown): PocStatusOwnerOperationV1 {
    const candidate = exactDataObjectForKindV1(value, "Status owner operation");
    const kind = dataPropertyV1(candidate, "kind", "Status owner operation");
    if (kind === "status.apply") {
      const operation = exactDataObjectV1(
        value,
        ["kind", "aura", "reason"],
        "Status owner operation",
      );
      return deepFreezePocValueV1({
        kind,
        aura: parsePocAuraInstanceV1(dataPropertyV1(operation, "aura", "Status owner operation")),
        reason: parsePocChangeReasonV1(
          dataPropertyV1(operation, "reason", "Status owner operation"),
        ),
      });
    }
    if (kind === "status.clear") {
      const operation = exactDataObjectV1(
        value,
        ["kind", "auraId", "target", "reason"],
        "Status owner operation",
      );
      return deepFreezePocValueV1({
        kind,
        auraId: parseAuraId(dataPropertyV1(operation, "auraId", "Status owner operation")),
        target: parsePocAuraTargetV1(dataPropertyV1(operation, "target", "Status owner operation")),
        reason: parsePocChangeReasonV1(
          dataPropertyV1(operation, "reason", "Status owner operation"),
        ),
      });
    }
    if (kind === "status.countdown") {
      const operation = exactDataObjectV1(
        value,
        ["kind", "unit", "instanceIds"],
        "Status owner operation",
      );
      return deepFreezePocValueV1({
        kind,
        unit: parseAuraDurationUnitV1(dataPropertyV1(operation, "unit", "Status owner operation")),
        instanceIds: parseUniqueAuraInstanceIdsV1(
          dataPropertyV1(operation, "instanceIds", "Status owner operation"),
        ),
      });
    }
    if (kind === "status.debug.apply") {
      const operation = exactDataObjectV1(
        value,
        ["kind", "aura", "reasonId"],
        "Status owner operation",
      );
      return deepFreezePocValueV1({
        kind,
        aura: parsePocAuraInstanceV1(dataPropertyV1(operation, "aura", "Status owner operation")),
        reasonId: parseReasonId(dataPropertyV1(operation, "reasonId", "Status owner operation")),
      });
    }
    if (kind === "status.debug.clear_instance") {
      const operation = exactDataObjectV1(
        value,
        ["kind", "instanceId", "reasonId"],
        "Status owner operation",
      );
      return deepFreezePocValueV1({
        kind,
        instanceId: parseAuraInstanceId(
          dataPropertyV1(operation, "instanceId", "Status owner operation"),
        ),
        reasonId: parseReasonId(dataPropertyV1(operation, "reasonId", "Status owner operation")),
      });
    }
    throw new TypeError("invalid Status owner operation kind");
  },
}) as PocStatusOwnerOperationRuntimeSchemaV1;

export type PocStatusGameplayFactV1 = Extract<
  PocGameplayFactV1,
  { readonly kind: "aura.applied" | "aura.cleared" | "aura.expired" }
>;

export interface PocStatusOwnerProposalPayloadV1 {
  readonly kind: PocStatusOwnerOperationV1["kind"];
  readonly before: StatusStateV1;
  readonly after: StatusStateV1;
}

export type PocStatusOwnerProposalV1 = ModuleOwnerProposalEnvelopeV1<
  PocStatusOwnerProposalPayloadV1,
  PocStatusGameplayFactV1
>;

function parseStatusFactV1(value: unknown): PocStatusGameplayFactV1 {
  const candidate = exactDataObjectForKindV1(value, "Status Fact");
  const kind = dataPropertyV1(candidate, "kind", "Status Fact");
  if (kind === "aura.applied") {
    const fact = exactDataObjectV1(value, ["kind", "aura", "reason"], "Status Fact");
    return deepFreezePocValueV1({
      kind,
      aura: parsePocAuraInstanceV1(dataPropertyV1(fact, "aura", "Status Fact")),
      reason: parsePocChangeReasonV1(dataPropertyV1(fact, "reason", "Status Fact")),
    });
  }
  if (kind === "aura.cleared") {
    const fact = exactDataObjectV1(value, ["kind", "instanceId", "reason"], "Status Fact");
    return deepFreezePocValueV1({
      kind,
      instanceId: parseAuraInstanceId(dataPropertyV1(fact, "instanceId", "Status Fact")),
      reason: parsePocChangeReasonV1(dataPropertyV1(fact, "reason", "Status Fact")),
    });
  }
  if (kind === "aura.expired") {
    const fact = exactDataObjectV1(
      value,
      ["kind", "instanceId", "auraId", "reason"],
      "Status Fact",
    );
    return deepFreezePocValueV1({
      kind,
      instanceId: parseAuraInstanceId(dataPropertyV1(fact, "instanceId", "Status Fact")),
      auraId: parseAuraId(dataPropertyV1(fact, "auraId", "Status Fact")),
      reason: parsePocChangeReasonV1(dataPropertyV1(fact, "reason", "Status Fact")),
    });
  }
  throw new TypeError("invalid Status Fact kind");
}

export const pocStatusGameplayFactSchemaV1: RuntimeSchemaV1<PocStatusGameplayFactV1> =
  Object.freeze({ parse: parseStatusFactV1 });

function canonicalValuesEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.length === rightBytes.length &&
    leftBytes.every((value, index) => value === rightBytes[index])
  );
}

export function pocStatusStatesEqualV1(left: StatusStateV1, right: StatusStateV1): boolean {
  return canonicalValuesEqualV1(left, right);
}

function auraMapsV1(state: StatusStateV1): ReadonlyMap<AuraInstanceId, AuraInstanceV1> {
  return new Map(state.auras.map((aura) => [aura.instanceId, aura] as const));
}

function assertApplyProposalConsistencyV1(proposal: PocStatusOwnerProposalV1): void {
  if (proposal.facts.length !== 1 || proposal.facts[0]?.kind !== "aura.applied") {
    throw new TypeError("Status apply proposal must emit one applied Fact");
  }
  const fact = proposal.facts[0];
  const source = fact.aura.source;
  const reason = fact.reason;
  const matchingReason =
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
      source.facilityId === reason.facilityId) ||
    (source.kind === "debug" &&
      reason.kind === "debug" &&
      reason.commandKind === "debug.aura.apply" &&
      source.reasonId === reason.reasonId);
  if (
    !matchingReason ||
    (proposal.payload.kind === "status.debug.apply") !== (source.kind === "debug")
  ) {
    throw new TypeError("Status applied Fact has invalid source provenance");
  }
  const before = auraMapsV1(proposal.payload.before);
  const after = auraMapsV1(proposal.payload.after);
  if (
    after.size !== before.size + 1 ||
    before.has(fact.aura.instanceId) ||
    !canonicalValuesEqualV1(after.get(fact.aura.instanceId), fact.aura)
  ) {
    throw new TypeError("Status apply proposal does not match its Fact");
  }
  for (const [instanceId, aura] of before) {
    if (!canonicalValuesEqualV1(after.get(instanceId), aura)) {
      throw new TypeError("Status apply proposal changed an existing Aura");
    }
  }
}

function assertClearProposalConsistencyV1(proposal: PocStatusOwnerProposalV1): void {
  if (proposal.facts.length !== 1 || proposal.facts[0]?.kind !== "aura.cleared") {
    throw new TypeError("Status clear proposal must emit one cleared Fact");
  }
  const fact = proposal.facts[0];
  const isDebugProposal = proposal.payload.kind === "status.debug.clear_instance";
  const hasDebugClearReason =
    fact.reason.kind === "debug" && fact.reason.commandKind === "debug.aura.clear";
  if (isDebugProposal !== hasDebugClearReason) {
    throw new TypeError("Status debug clear Fact has invalid provenance");
  }
  const before = auraMapsV1(proposal.payload.before);
  const after = auraMapsV1(proposal.payload.after);
  if (
    before.size !== after.size + 1 ||
    !before.has(fact.instanceId) ||
    after.has(fact.instanceId)
  ) {
    throw new TypeError("Status clear proposal does not match its Fact");
  }
  for (const [instanceId, aura] of after) {
    if (!canonicalValuesEqualV1(before.get(instanceId), aura)) {
      throw new TypeError("Status clear proposal changed a retained Aura");
    }
  }
}

function assertCountdownProposalConsistencyV1(proposal: PocStatusOwnerProposalV1): void {
  if (proposal.facts.some((fact) => fact.kind !== "aura.expired")) {
    throw new TypeError("Status countdown proposal emitted a foreign Fact");
  }
  const before = auraMapsV1(proposal.payload.before);
  const after = auraMapsV1(proposal.payload.after);
  const expiredIds = new Set<AuraInstanceId>();
  let affectedUnit: AuraDurationUnitV1 | null = null;
  for (const fact of proposal.facts) {
    if (fact.kind !== "aura.expired") throw new TypeError("invalid Status countdown Fact");
    const expired = before.get(fact.instanceId);
    if (
      expired === undefined ||
      expired.duration.kind !== "countdown" ||
      expired.duration.remaining !== 1 ||
      after.has(fact.instanceId) ||
      expired.auraId !== fact.auraId ||
      fact.reason.kind !== "aura" ||
      fact.reason.auraId !== fact.auraId ||
      expiredIds.has(fact.instanceId)
    ) {
      throw new TypeError("Status expiry Fact does not match proposal State");
    }
    if (affectedUnit !== null && affectedUnit !== expired.duration.unit) {
      throw new TypeError("Status countdown proposal mixes lifecycle units");
    }
    affectedUnit = expired.duration.unit;
    expiredIds.add(fact.instanceId);
  }
  if (after.size !== before.size - expiredIds.size) {
    throw new TypeError("Status countdown proposal removed an unexplained Aura");
  }
  for (const [instanceId, afterAura] of after) {
    const beforeAura = before.get(instanceId);
    if (beforeAura === undefined) throw new TypeError("Status countdown proposal added an Aura");
    if (canonicalValuesEqualV1(beforeAura, afterAura)) continue;
    if (
      beforeAura.duration.kind !== "countdown" ||
      afterAura.duration.kind !== "countdown" ||
      beforeAura.duration.unit !== afterAura.duration.unit ||
      beforeAura.duration.remaining <= 1 ||
      afterAura.duration.remaining !== beforeAura.duration.remaining - 1 ||
      !canonicalValuesEqualV1({ ...beforeAura, duration: afterAura.duration }, afterAura)
    ) {
      throw new TypeError("Status countdown proposal made an invalid decrement");
    }
    if (affectedUnit !== null && affectedUnit !== beforeAura.duration.unit) {
      throw new TypeError("Status countdown proposal mixes lifecycle units");
    }
    affectedUnit = beforeAura.duration.unit;
  }
}

function parseProposalKindV1(value: unknown): PocStatusOwnerOperationV1["kind"] {
  if (
    value === "status.apply" ||
    value === "status.clear" ||
    value === "status.countdown" ||
    value === "status.debug.apply" ||
    value === "status.debug.clear_instance"
  ) {
    return value;
  }
  throw new TypeError("invalid Status proposal kind");
}

function assertProposalConsistencyV1(proposal: PocStatusOwnerProposalV1): void {
  if (proposal.payload.kind === "status.apply" || proposal.payload.kind === "status.debug.apply") {
    assertApplyProposalConsistencyV1(proposal);
    return;
  }
  if (
    proposal.payload.kind === "status.clear" ||
    proposal.payload.kind === "status.debug.clear_instance"
  ) {
    assertClearProposalConsistencyV1(proposal);
    return;
  }
  assertCountdownProposalConsistencyV1(proposal);
}

export const pocStatusOwnerProposalSchemaV1: RuntimeSchemaV1<PocStatusOwnerProposalV1> =
  Object.freeze({
    parse(value: unknown): PocStatusOwnerProposalV1 {
      const proposal = exactDataObjectV1(value, ["payload", "facts"], "Status owner proposal");
      const payload = exactDataObjectV1(
        dataPropertyV1(proposal, "payload", "Status owner proposal"),
        ["kind", "before", "after"],
        "Status owner proposal payload",
      );
      const kind = parseProposalKindV1(
        dataPropertyV1(payload, "kind", "Status owner proposal payload"),
      );
      const parsed = deepFreezePocValueV1({
        payload: {
          kind,
          before: pocStatusStateSchemaV1.parse(
            dataPropertyV1(payload, "before", "Status owner proposal payload"),
          ),
          after: pocStatusStateSchemaV1.parse(
            dataPropertyV1(payload, "after", "Status owner proposal payload"),
          ),
        },
        facts: exactDataArrayV1(
          dataPropertyV1(proposal, "facts", "Status owner proposal"),
          "Status owner proposal Facts",
        ).map(parseStatusFactV1),
      }) satisfies PocStatusOwnerProposalV1;
      assertProposalConsistencyV1(parsed);
      return parsed;
    },
  });

export type PocStatusReadPortV1 = StatusStateV1;

type PocStatusInvariantViolationV1 =
  | {
      readonly code: "collection.duplicate_id";
      readonly details: { readonly collection: string; readonly id: string };
    }
  | {
      readonly code: "collection.unstable_order";
      readonly details: { readonly collection: string; readonly id: string };
    }
  | {
      readonly code: "snapshot.schema";
      readonly details: { readonly collection: string; readonly id: string };
    };

function auraIdentityPartsV1(instanceId: AuraInstanceId): readonly [string, number] {
  const [, sequence, index] = instanceId.split(":");
  if (sequence === undefined || index === undefined) {
    throw new TypeError("invalid AuraInstanceId");
  }
  return [sequence, Number(index)] as const;
}

function compareAuraInstanceIdsV1(left: AuraInstanceId, right: AuraInstanceId): number {
  const [leftSequence, leftIndex] = auraIdentityPartsV1(left);
  const [rightSequence, rightIndex] = auraIdentityPartsV1(right);
  if (leftSequence === rightSequence) return leftIndex - rightIndex;
  if (leftSequence === "initial") return -1;
  if (rightSequence === "initial") return 1;
  return Number(leftSequence) - Number(rightSequence);
}

function hasValidAuraSequenceV1(aura: AuraInstanceV1): boolean {
  const [sequence] = auraIdentityPartsV1(aura.instanceId);
  if (aura.source.kind === "initial") {
    return sequence === "initial" && aura.appliedAtSequence === 0;
  }
  return (
    sequence !== "initial" &&
    aura.appliedAtSequence > 0 &&
    Number(sequence) === aura.appliedAtSequence
  );
}

const noStatusInvariantViolationsV1: readonly PocStatusInvariantViolationV1[] = Object.freeze([]);

export const pocStatusInvariantV1 = Object.freeze({
  check(
    stateValue: DeepReadonly<StatusStateV1>,
    _readPort: PocStatusReadPortV1,
  ): readonly PocStatusInvariantViolationV1[] {
    const state = pocStatusStateSchemaV1.parse(stateValue);
    const violations: PocStatusInvariantViolationV1[] = [];
    const instanceIds = new Set<AuraInstanceId>();
    const targetKeys = new Set<string>();
    let previous: AuraInstanceId | null = null;
    for (const aura of state.auras) {
      if (instanceIds.has(aura.instanceId)) {
        violations.push(
          deepFreezePocValueV1({
            code: "collection.duplicate_id" as const,
            details: { collection: "status.auras.instanceId", id: aura.instanceId },
          }),
        );
      }
      instanceIds.add(aura.instanceId);
      const targetKey = `${aura.auraId}:${auraTargetKeyV1(aura.target)}`;
      if (targetKeys.has(targetKey)) {
        violations.push(
          deepFreezePocValueV1({
            code: "collection.duplicate_id" as const,
            details: { collection: "status.auras.target", id: targetKey },
          }),
        );
      }
      targetKeys.add(targetKey);
      if (previous !== null && compareAuraInstanceIdsV1(previous, aura.instanceId) >= 0) {
        violations.push(
          deepFreezePocValueV1({
            code: "collection.unstable_order" as const,
            details: { collection: "status.auras", id: aura.instanceId },
          }),
        );
      }
      previous = aura.instanceId;
      if (!hasValidAuraSequenceV1(aura)) {
        violations.push(
          deepFreezePocValueV1({
            code: "snapshot.schema" as const,
            details: { collection: "status.auras.provenance", id: aura.instanceId },
          }),
        );
      }
    }
    return violations.length === 0
      ? noStatusInvariantViolationsV1
      : deepFreezePocValueV1(violations);
  },
});

export function assertValidInitialPocStatusStateV1(state: StatusStateV1): void {
  const violations = pocStatusInvariantV1.check(state, state);
  const duplicate = violations.find(({ code }) => code === "collection.duplicate_id");
  if (duplicate !== undefined) throw new TypeError("duplicate initial Status Aura");
  if (violations.length > 0) throw new TypeError("invalid initial Status Aura lifecycle");
  state.auras.forEach((aura, index) => {
    if (
      aura.instanceId !== `aura:initial:${index}` ||
      aura.source.kind !== "initial" ||
      aura.appliedAtSequence !== 0
    ) {
      throw new TypeError("invalid initial Status Aura provenance");
    }
  });
}

export function sortPocStatusAurasV1(auras: readonly AuraInstanceV1[]): readonly AuraInstanceV1[] {
  return deepFreezePocValueV1(
    [...auras].sort((left, right) => compareAuraInstanceIdsV1(left.instanceId, right.instanceId)),
  );
}

export function findPocStatusDefinitionV1(
  dependencies: PocStatusDependencyPortsV1,
  auraId: AuraId,
): PocStatusAuraDefinitionPortV1 {
  const definition = dependencies.auraDefinitions.find((candidate) => candidate.auraId === auraId);
  if (definition === undefined) throw new TypeError(`unknown Status Aura definition ${auraId}`);
  return definition;
}

export function validatePocStatusAuraTargetV1(
  target: AuraTargetV1,
  definition: PocStatusAuraDefinitionPortV1,
): void {
  const targetKey = auraTargetKeyV1(target);
  if (!definition.allowedTargets.some((candidate) => auraTargetKeyV1(candidate) === targetKey)) {
    throw new TypeError(`Aura target is not allowed for ${definition.auraId}`);
  }
}

export function validatePocStatusAuraDurationV1(
  duration: AuraDurationV1,
  definition: PocStatusAuraDefinitionPortV1,
  application: "normal" | "debug",
): void {
  const policy = definition.durationPolicy;
  if (policy.kind !== duration.kind)
    throw new TypeError("Aura duration kind does not match policy");
  if (policy.kind === "until_cleared" || duration.kind === "until_cleared") return;
  if (policy.unit !== duration.unit)
    throw new TypeError("Aura duration unit does not match policy");
  if (application === "normal" && duration.remaining !== policy.defaultRemaining) {
    throw new TypeError("normal Aura duration must equal the authored default duration");
  }
  if (duration.remaining > policy.maximumRemaining) {
    throw new TypeError("Aura duration exceeds authored maximum");
  }
}

export function assertPocStatusRuntimeAuraIdentityV1(aura: AuraInstanceV1): void {
  if (!hasValidAuraSequenceV1(aura) || aura.source.kind === "initial") {
    throw new TypeError("invalid runtime Aura instance provenance");
  }
}

export function positiveAuraRemainingV1(value: number): PositiveSafeInteger {
  return parsePositiveSafeInteger(value);
}
