// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type {
  DeepReadonly,
  ModuleOwnerProposalEnvelopeV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";

import {
  calendarPhasesV1,
  parseActionId,
  parseAuraId,
  parseAuraInstanceId,
  parseEndingId,
  parseEventId,
  parseFacilityId,
  parsePolicyId,
  parseReasonId,
} from "../../contracts/ids.js";
import { pocDebugCommandKindsV1 } from "../../contracts/types.js";
import type {
  CalendarStateV1,
  ChangeReasonV1,
  PocDebugCommandV1,
  PocGameCommandV1,
  PocGameplayFactV1,
} from "../../contracts/types.js";
import {
  deepFreezePocValueV1,
  parseDayIndex,
  parseNonNegativeSafeInteger,
  parseSafeInteger,
} from "../../contracts/values.js";
import type { DayIndex, NonNegativeSafeInteger, SafeInteger } from "../../contracts/values.js";
import type { AuraInstanceId, CalendarPhase, PolicyId, ReasonId } from "../../contracts/ids.js";

export interface PocCalendarPhasePointV1 {
  readonly day: DayIndex;
  readonly phase: CalendarPhase;
}

export interface PocCalendarDebugChangeReasonV1 {
  readonly kind: "debug";
  readonly commandKind: "debug.calendar.set_ap";
  readonly reasonId: ReasonId;
}

export type PocCalendarOwnerOperationV1 =
  | {
      readonly kind: "calendar.policy.choose";
      readonly policyId: PolicyId;
    }
  | {
      readonly kind: "calendar.ap.adjust";
      readonly delta: SafeInteger;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "calendar.phase.advance";
      readonly to: PocCalendarPhasePointV1;
      readonly expiredAuraIds: readonly AuraInstanceId[];
      readonly terminalLocked: boolean;
    }
  | { readonly kind: "calendar.evening.resolve" }
  | {
      readonly kind: "calendar.debug.set_ap";
      readonly value: NonNegativeSafeInteger;
      readonly reason: PocCalendarDebugChangeReasonV1;
    };

export interface PocCalendarOwnerProposalPayloadV1 {
  readonly kind: PocCalendarOwnerOperationV1["kind"];
  readonly before: CalendarStateV1;
  readonly after: CalendarStateV1;
}

export type PocCalendarGameplayFactV1 = Extract<
  PocGameplayFactV1,
  {
    readonly kind: "policy.chosen" | "calendar.ap_changed" | "calendar.phase_advanced";
  }
>;

export type PocCalendarOwnerProposalV1 = ModuleOwnerProposalEnvelopeV1<
  PocCalendarOwnerProposalPayloadV1,
  PocCalendarGameplayFactV1
>;

export type PocCalendarReadPortV1 = CalendarStateV1;

export interface PocCalendarDependencyPortsV1 {
  readonly policyAp: NonNegativeSafeInteger;
}

interface PocCalendarInvariantViolationV1 {
  readonly code: "calendar.invalid";
  readonly details: {
    readonly day: number;
    readonly phase: CalendarPhase;
  };
}

type PlainDataRecordV1 = Record<string, unknown>;

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
    lengthDescriptor.get !== undefined ||
    lengthDescriptor.set !== undefined ||
    lengthDescriptor.enumerable !== false
  ) {
    throw new TypeError(`invalid ${label} length`);
  }
  const length = lengthDescriptor.value;
  const keys = Reflect.ownKeys(value);
  if (
    !Number.isSafeInteger(length) ||
    length < 0 ||
    keys.length !== length + 1 ||
    keys.some((key) => typeof key !== "string")
  ) {
    throw new TypeError(`invalid ${label}`);
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
      throw new TypeError(`invalid ${label} element`);
    }
    parsed.push(descriptor.value);
  }
  return parsed;
}

function parseCalendarPhaseV1(value: unknown): CalendarPhase {
  if (typeof value !== "string" || !calendarPhasesV1.includes(value as CalendarPhase)) {
    throw new TypeError("invalid CalendarPhase");
  }
  return value as CalendarPhase;
}

function parseCalendarPointV1(value: unknown, label: string): PocCalendarPhasePointV1 {
  const point = exactDataObjectV1(value, ["day", "phase"], label);
  return deepFreezePocValueV1({
    day: parseDayIndex(dataPropertyV1(point, "day", label)),
    phase: parseCalendarPhaseV1(dataPropertyV1(point, "phase", label)),
  });
}

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

function parseChangeReasonV1(value: unknown): ChangeReasonV1 {
  const reason = exactDataObjectV1(
    value,
    (() => {
      const kind = dataPropertyV1(
        exactDataObjectForKindV1(value, "Calendar change reason"),
        "kind",
        "Calendar change reason",
      );
      if (kind === "command" || kind === "debug") return ["kind", "commandKind", "reasonId"];
      if (kind === "event") return ["kind", "eventId", "reasonId"];
      if (kind === "story_action" || kind === "world_action") {
        return ["kind", "actionId", "reasonId"];
      }
      if (kind === "aura") return ["kind", "auraId", "reasonId"];
      if (kind === "facility") return ["kind", "facilityId", "reasonId"];
      if (kind === "ending") return ["kind", "endingId", "reasonId"];
      throw new TypeError("invalid Calendar change reason kind");
    })(),
    "Calendar change reason",
  );
  const kind = dataPropertyV1(reason, "kind", "Calendar change reason");
  const reasonId = parseReasonId(dataPropertyV1(reason, "reasonId", "Calendar change reason"));
  if (kind === "command") {
    return deepFreezePocValueV1({
      kind,
      commandKind: parseCommandKindV1(
        dataPropertyV1(reason, "commandKind", "Calendar change reason"),
      ),
      reasonId,
    });
  }
  if (kind === "debug") {
    return deepFreezePocValueV1({
      kind,
      commandKind: parseDebugCommandKindV1(
        dataPropertyV1(reason, "commandKind", "Calendar change reason"),
      ),
      reasonId,
    });
  }
  if (kind === "event") {
    return deepFreezePocValueV1({
      kind,
      eventId: parseEventId(dataPropertyV1(reason, "eventId", "Calendar change reason")),
      reasonId,
    });
  }
  if (kind === "story_action" || kind === "world_action") {
    return deepFreezePocValueV1({
      kind,
      actionId: parseActionId(dataPropertyV1(reason, "actionId", "Calendar change reason")),
      reasonId,
    });
  }
  if (kind === "aura") {
    return deepFreezePocValueV1({
      kind,
      auraId: parseAuraId(dataPropertyV1(reason, "auraId", "Calendar change reason")),
      reasonId,
    });
  }
  if (kind === "facility") {
    return deepFreezePocValueV1({
      kind,
      facilityId: parseFacilityId(dataPropertyV1(reason, "facilityId", "Calendar change reason")),
      reasonId,
    });
  }
  if (kind === "ending") {
    return deepFreezePocValueV1({
      kind,
      endingId: parseEndingId(dataPropertyV1(reason, "endingId", "Calendar change reason")),
      reasonId,
    });
  }
  throw new TypeError("invalid Calendar change reason");
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

export const pocCalendarStateSchemaV1: RuntimeSchemaV1<CalendarStateV1> = Object.freeze({
  parse(value: unknown): CalendarStateV1 {
    const state = exactDataObjectV1(
      value,
      ["day", "phase", "lifePolicyId", "apRemaining", "eveningResolved"],
      "Calendar State",
    );
    const lifePolicyIdValue = dataPropertyV1(state, "lifePolicyId", "Calendar State");
    const eveningResolved = dataPropertyV1(state, "eveningResolved", "Calendar State");
    if (eveningResolved !== true && eveningResolved !== false) {
      throw new TypeError("invalid Calendar State eveningResolved");
    }
    return deepFreezePocValueV1({
      day: parseDayIndex(dataPropertyV1(state, "day", "Calendar State")),
      phase: parseCalendarPhaseV1(dataPropertyV1(state, "phase", "Calendar State")),
      lifePolicyId: lifePolicyIdValue === null ? null : parsePolicyId(lifePolicyIdValue),
      apRemaining: parseNonNegativeSafeInteger(
        dataPropertyV1(state, "apRemaining", "Calendar State"),
      ),
      eveningResolved,
    });
  },
});

const noCalendarInvariantViolationsV1: readonly PocCalendarInvariantViolationV1[] = Object.freeze(
  [],
);

export const pocCalendarInvariantV1 = Object.freeze({
  check(
    stateValue: DeepReadonly<CalendarStateV1>,
    _readPort: PocCalendarReadPortV1,
  ): readonly PocCalendarInvariantViolationV1[] {
    const state = pocCalendarStateSchemaV1.parse(stateValue);
    if (!state.eveningResolved || state.phase === "evening") {
      return noCalendarInvariantViolationsV1;
    }
    return deepFreezePocValueV1([
      {
        code: "calendar.invalid",
        details: { day: state.day, phase: state.phase },
      },
    ]);
  },
});

function parseAuraInstanceIdsV1(value: unknown, label: string): readonly AuraInstanceId[] {
  const parsed = exactDataArrayV1(value, label).map(parseAuraInstanceId);
  if (new Set(parsed).size !== parsed.length) throw new TypeError(`duplicate ${label}`);
  return deepFreezePocValueV1(parsed);
}

interface PocCalendarOwnerOperationRuntimeSchemaV1 {
  parse<const TValue extends { readonly kind: PocCalendarOwnerOperationV1["kind"] }>(
    value: TValue,
  ): Extract<PocCalendarOwnerOperationV1, { readonly kind: TValue["kind"] }>;
  parse(value: unknown): PocCalendarOwnerOperationV1;
}

export const pocCalendarOwnerOperationSchemaV1 = Object.freeze({
  parse(value: unknown): PocCalendarOwnerOperationV1 {
    const candidate = exactDataObjectForKindV1(value, "Calendar owner operation");
    const kind = dataPropertyV1(candidate, "kind", "Calendar owner operation");
    if (kind === "calendar.policy.choose") {
      const operation = exactDataObjectV1(value, ["kind", "policyId"], "Calendar owner operation");
      return deepFreezePocValueV1({
        kind,
        policyId: parsePolicyId(dataPropertyV1(operation, "policyId", "Calendar owner operation")),
      });
    }
    if (kind === "calendar.ap.adjust") {
      const operation = exactDataObjectV1(
        value,
        ["kind", "delta", "reason"],
        "Calendar owner operation",
      );
      return deepFreezePocValueV1({
        kind,
        delta: parseSafeInteger(dataPropertyV1(operation, "delta", "Calendar owner operation")),
        reason: parseChangeReasonV1(
          dataPropertyV1(operation, "reason", "Calendar owner operation"),
        ),
      });
    }
    if (kind === "calendar.phase.advance") {
      const operation = exactDataObjectV1(
        value,
        ["kind", "to", "expiredAuraIds", "terminalLocked"],
        "Calendar owner operation",
      );
      const terminalLocked = dataPropertyV1(
        operation,
        "terminalLocked",
        "Calendar owner operation",
      );
      if (terminalLocked !== true && terminalLocked !== false) {
        throw new TypeError("invalid Calendar owner operation terminalLocked");
      }
      return deepFreezePocValueV1({
        kind,
        to: parseCalendarPointV1(
          dataPropertyV1(operation, "to", "Calendar owner operation"),
          "Calendar owner operation target",
        ),
        expiredAuraIds: parseAuraInstanceIdsV1(
          dataPropertyV1(operation, "expiredAuraIds", "Calendar owner operation"),
          "Calendar owner operation expiredAuraIds",
        ),
        terminalLocked,
      });
    }
    if (kind === "calendar.evening.resolve") {
      exactDataObjectV1(value, ["kind"], "Calendar owner operation");
      return deepFreezePocValueV1({ kind });
    }
    if (kind === "calendar.debug.set_ap") {
      const operation = exactDataObjectV1(
        value,
        ["kind", "value", "reason"],
        "Calendar owner operation",
      );
      const reason = parseChangeReasonV1(
        dataPropertyV1(operation, "reason", "Calendar owner operation"),
      );
      if (reason.kind !== "debug" || reason.commandKind !== "debug.calendar.set_ap") {
        throw new TypeError("invalid Calendar debug AP reason");
      }
      return deepFreezePocValueV1({
        kind,
        value: parseNonNegativeSafeInteger(
          dataPropertyV1(operation, "value", "Calendar owner operation"),
        ),
        reason: {
          kind: reason.kind,
          commandKind: reason.commandKind,
          reasonId: reason.reasonId,
        },
      });
    }
    throw new TypeError("invalid Calendar owner operation kind");
  },
}) as PocCalendarOwnerOperationRuntimeSchemaV1;

export const pocCalendarDependencyPortsSchemaV1: RuntimeSchemaV1<PocCalendarDependencyPortsV1> =
  Object.freeze({
    parse(value: unknown): PocCalendarDependencyPortsV1 {
      const dependencies = exactDataObjectV1(value, ["policyAp"], "Calendar dependency ports");
      if (!Object.isFrozen(dependencies)) {
        throw new TypeError("Calendar dependency ports must be frozen");
      }
      return deepFreezePocValueV1({
        policyAp: parseNonNegativeSafeInteger(
          dataPropertyV1(dependencies, "policyAp", "Calendar dependency ports"),
        ),
      });
    },
  });

function parseBeforeAfterApV1(value: unknown): {
  readonly before: NonNegativeSafeInteger;
  readonly after: NonNegativeSafeInteger;
} {
  const pair = exactDataObjectV1(value, ["before", "after"], "Calendar AP change");
  return deepFreezePocValueV1({
    before: parseNonNegativeSafeInteger(dataPropertyV1(pair, "before", "Calendar AP change")),
    after: parseNonNegativeSafeInteger(dataPropertyV1(pair, "after", "Calendar AP change")),
  });
}

function parsePolicyChosenFactV1(
  value: unknown,
): Extract<PocCalendarGameplayFactV1, { readonly kind: "policy.chosen" }> {
  const fact = exactDataObjectV1(
    value,
    ["kind", "policyId", "apRemaining"],
    "Calendar policy Fact",
  );
  if (dataPropertyV1(fact, "kind", "Calendar policy Fact") !== "policy.chosen") {
    throw new TypeError("invalid Calendar policy Fact kind");
  }
  return deepFreezePocValueV1({
    kind: "policy.chosen",
    policyId: parsePolicyId(dataPropertyV1(fact, "policyId", "Calendar policy Fact")),
    apRemaining: parseNonNegativeSafeInteger(
      dataPropertyV1(fact, "apRemaining", "Calendar policy Fact"),
    ),
  });
}

function parseApChangedFactV1(
  value: unknown,
): Extract<PocCalendarGameplayFactV1, { readonly kind: "calendar.ap_changed" }> {
  const fact = exactDataObjectV1(value, ["kind", "value", "reason"], "Calendar AP Fact");
  if (dataPropertyV1(fact, "kind", "Calendar AP Fact") !== "calendar.ap_changed") {
    throw new TypeError("invalid Calendar AP Fact kind");
  }
  return deepFreezePocValueV1({
    kind: "calendar.ap_changed",
    value: parseBeforeAfterApV1(dataPropertyV1(fact, "value", "Calendar AP Fact")),
    reason: parseChangeReasonV1(dataPropertyV1(fact, "reason", "Calendar AP Fact")),
  });
}

function parsePhaseAdvancedFactV1(
  value: unknown,
): Extract<PocCalendarGameplayFactV1, { readonly kind: "calendar.phase_advanced" }> {
  const fact = exactDataObjectV1(
    value,
    ["kind", "from", "to", "apRemaining", "expiredAuraIds"],
    "Calendar phase Fact",
  );
  if (dataPropertyV1(fact, "kind", "Calendar phase Fact") !== "calendar.phase_advanced") {
    throw new TypeError("invalid Calendar phase Fact kind");
  }
  return deepFreezePocValueV1({
    kind: "calendar.phase_advanced",
    from: parseCalendarPointV1(
      dataPropertyV1(fact, "from", "Calendar phase Fact"),
      "Calendar phase Fact source",
    ),
    to: parseCalendarPointV1(
      dataPropertyV1(fact, "to", "Calendar phase Fact"),
      "Calendar phase Fact target",
    ),
    apRemaining: parseNonNegativeSafeInteger(
      dataPropertyV1(fact, "apRemaining", "Calendar phase Fact"),
    ),
    expiredAuraIds: parseAuraInstanceIdsV1(
      dataPropertyV1(fact, "expiredAuraIds", "Calendar phase Fact"),
      "Calendar phase Fact expiredAuraIds",
    ),
  });
}

function parseProposalKindV1(value: unknown): PocCalendarOwnerProposalPayloadV1["kind"] {
  if (
    value === "calendar.policy.choose" ||
    value === "calendar.ap.adjust" ||
    value === "calendar.phase.advance" ||
    value === "calendar.evening.resolve" ||
    value === "calendar.debug.set_ap"
  ) {
    return value;
  }
  throw new TypeError("invalid Calendar proposal kind");
}

export function pocCalendarStatesEqualV1(left: CalendarStateV1, right: CalendarStateV1): boolean {
  return (
    left.day === right.day &&
    left.phase === right.phase &&
    left.lifePolicyId === right.lifePolicyId &&
    left.apRemaining === right.apRemaining &&
    left.eveningResolved === right.eveningResolved
  );
}

function sameCalendarFieldsExceptApV1(left: CalendarStateV1, right: CalendarStateV1): boolean {
  return (
    left.day === right.day &&
    left.phase === right.phase &&
    left.lifePolicyId === right.lifePolicyId &&
    left.eveningResolved === right.eveningResolved
  );
}

function isAdjacentPhaseV1(before: CalendarStateV1, after: CalendarStateV1): boolean {
  if (before.phase === "morning") {
    return after.day === before.day && after.phase === "afternoon";
  }
  if (before.phase === "afternoon") {
    return after.day === before.day && after.phase === "evening";
  }
  return (
    before.eveningResolved &&
    before.day < Number.MAX_SAFE_INTEGER &&
    after.day === before.day + 1 &&
    after.phase === "morning"
  );
}

function assertProposalConsistencyV1(proposal: PocCalendarOwnerProposalV1): void {
  const { before, after, kind } = proposal.payload;
  if (kind === "calendar.policy.choose") {
    const [fact] = proposal.facts;
    if (
      proposal.facts.length !== 1 ||
      fact?.kind !== "policy.chosen" ||
      before.lifePolicyId !== null ||
      after.lifePolicyId === null ||
      before.day !== after.day ||
      before.phase !== after.phase ||
      before.eveningResolved !== after.eveningResolved ||
      fact.policyId !== after.lifePolicyId ||
      fact.apRemaining !== after.apRemaining
    ) {
      throw new TypeError("Calendar policy proposal is inconsistent");
    }
    return;
  }
  if (kind === "calendar.ap.adjust" || kind === "calendar.debug.set_ap") {
    const [fact] = proposal.facts;
    if (
      proposal.facts.length !== 1 ||
      fact?.kind !== "calendar.ap_changed" ||
      !sameCalendarFieldsExceptApV1(before, after) ||
      fact.value.before !== before.apRemaining ||
      fact.value.after !== after.apRemaining ||
      (kind === "calendar.debug.set_ap" &&
        (fact.reason.kind !== "debug" || fact.reason.commandKind !== "debug.calendar.set_ap"))
    ) {
      throw new TypeError("Calendar AP proposal is inconsistent");
    }
    return;
  }
  if (kind === "calendar.phase.advance") {
    const [fact] = proposal.facts;
    if (
      proposal.facts.length !== 1 ||
      fact?.kind !== "calendar.phase_advanced" ||
      before.lifePolicyId === null ||
      before.lifePolicyId !== after.lifePolicyId ||
      after.eveningResolved ||
      !isAdjacentPhaseV1(before, after) ||
      fact.from.day !== before.day ||
      fact.from.phase !== before.phase ||
      fact.to.day !== after.day ||
      fact.to.phase !== after.phase ||
      fact.apRemaining !== after.apRemaining
    ) {
      throw new TypeError("Calendar phase proposal is inconsistent");
    }
    return;
  }
  if (
    proposal.facts.length !== 0 ||
    before.phase !== "evening" ||
    after.phase !== "evening" ||
    !after.eveningResolved ||
    before.day !== after.day ||
    before.lifePolicyId !== after.lifePolicyId ||
    before.apRemaining !== after.apRemaining
  ) {
    throw new TypeError("Calendar evening proposal is inconsistent");
  }
}

function parseProposalFactsV1(
  value: unknown,
  kind: PocCalendarOwnerProposalPayloadV1["kind"],
): readonly PocCalendarGameplayFactV1[] {
  const facts = exactDataArrayV1(value, "Calendar owner proposal Facts");
  if (kind === "calendar.evening.resolve") {
    if (facts.length !== 0) throw new TypeError("invalid Calendar evening proposal Facts");
    return deepFreezePocValueV1([]);
  }
  if (facts.length !== 1) throw new TypeError("invalid Calendar owner proposal Facts");
  const fact = facts[0];
  if (kind === "calendar.policy.choose") {
    return deepFreezePocValueV1([parsePolicyChosenFactV1(fact)]);
  }
  if (kind === "calendar.phase.advance") {
    return deepFreezePocValueV1([parsePhaseAdvancedFactV1(fact)]);
  }
  return deepFreezePocValueV1([parseApChangedFactV1(fact)]);
}

export const pocCalendarOwnerProposalSchemaV1: RuntimeSchemaV1<PocCalendarOwnerProposalV1> =
  Object.freeze({
    parse(value: unknown): PocCalendarOwnerProposalV1 {
      const proposal = exactDataObjectV1(value, ["payload", "facts"], "Calendar owner proposal");
      const payloadValue = exactDataObjectV1(
        dataPropertyV1(proposal, "payload", "Calendar owner proposal"),
        ["kind", "before", "after"],
        "Calendar owner proposal payload",
      );
      const kind = parseProposalKindV1(
        dataPropertyV1(payloadValue, "kind", "Calendar owner proposal payload"),
      );
      const parsed = deepFreezePocValueV1({
        payload: {
          kind,
          before: pocCalendarStateSchemaV1.parse(
            dataPropertyV1(payloadValue, "before", "Calendar owner proposal payload"),
          ),
          after: pocCalendarStateSchemaV1.parse(
            dataPropertyV1(payloadValue, "after", "Calendar owner proposal payload"),
          ),
        },
        facts: parseProposalFactsV1(
          dataPropertyV1(proposal, "facts", "Calendar owner proposal"),
          kind,
        ),
      }) satisfies PocCalendarOwnerProposalV1;
      assertProposalConsistencyV1(parsed);
      return parsed;
    },
  });
