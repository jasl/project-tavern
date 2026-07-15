// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { canonicalJsonBytes } from "@sillymaker/base";
import type {
  DeepReadonly,
  ModuleOwnerProposalEnvelopeV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";

import { parseActionId, parseFacilityId, parseReasonId } from "../../contracts/ids.js";
import type { ActionId, FacilityId, ReasonId } from "../../contracts/ids.js";
import type {
  ChangeReasonV1,
  FacilitiesStateV1,
  FacilityChoiceV1,
  FacilityDecisionRecordV1,
  FacilityDecisionV1,
  FacilityStateV1,
  PocGameplayFactV1,
} from "../../contracts/types.js";
import { deepFreezePocValueV1, parsePositiveSafeInteger } from "../../contracts/values.js";
import type { PositiveSafeInteger } from "../../contracts/values.js";

export interface PocFacilitiesOpportunityPortV1 {
  readonly opportunityId: ActionId;
  readonly facilityIds: readonly FacilityId[];
  readonly skipReasonId: ReasonId;
}

export interface PocFacilitiesOwnerOperationV1 {
  readonly kind: "facilities.choose";
  readonly opportunityId: ActionId;
  readonly choice: FacilityChoiceV1;
}

export interface PocFacilitiesDependencyPortsV1 {
  readonly kind: "facilities.choose";
  readonly commandSequence: PositiveSafeInteger;
  readonly opportunity: PocFacilitiesOpportunityPortV1;
  readonly facilityBuildReasonId: ReasonId;
}

export type PocFacilitiesGameplayFactV1 = Extract<
  PocGameplayFactV1,
  { readonly kind: "facility.choice_committed" }
>;

export interface PocFacilitiesOwnerProposalPayloadV1 {
  readonly kind: PocFacilitiesOwnerOperationV1["kind"];
  readonly before: FacilitiesStateV1;
  readonly after: FacilitiesStateV1;
}

export type PocFacilitiesOwnerProposalV1 = ModuleOwnerProposalEnvelopeV1<
  PocFacilitiesOwnerProposalPayloadV1,
  PocFacilitiesGameplayFactV1
>;

export type PocFacilitiesReadPortV1 = FacilitiesStateV1;

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

function compareStableIdsV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertUniqueStableOrderV1(values: readonly string[], label: string): void {
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (
      previous === undefined ||
      current === undefined ||
      compareStableIdsV1(previous, current) >= 0
    ) {
      throw new TypeError(`${label} must be unique and stably ordered`);
    }
  }
}

export function comparePocFacilityIdsV1(left: FacilityId, right: FacilityId): number {
  return compareStableIdsV1(left, right);
}

export function comparePocFacilityOpportunityIdsV1(left: ActionId, right: ActionId): number {
  return compareStableIdsV1(left, right);
}

export function parsePocFacilityDecisionV1(value: unknown): FacilityDecisionV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError("invalid Facility decision");
  }
  const kindDescriptor = Object.getOwnPropertyDescriptor(value, "kind");
  if (
    kindDescriptor === undefined ||
    kindDescriptor.get !== undefined ||
    kindDescriptor.set !== undefined ||
    !("value" in kindDescriptor)
  ) {
    throw new TypeError("invalid Facility decision kind");
  }
  const kind = kindDescriptor.value;
  if (kind === "skipped") {
    exactDataObjectV1(value, ["kind"], "Facility decision");
    return deepFreezePocValueV1({ kind });
  }
  if (kind === "built") {
    const decision = exactDataObjectV1(value, ["kind", "facilityId"], "Facility decision");
    return deepFreezePocValueV1({
      kind,
      facilityId: parseFacilityId(dataPropertyV1(decision, "facilityId", "Facility decision")),
    });
  }
  throw new TypeError("invalid Facility decision kind");
}

export function parsePocFacilityChoiceV1(value: unknown): FacilityChoiceV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError("invalid Facility choice");
  }
  const kindDescriptor = Object.getOwnPropertyDescriptor(value, "kind");
  if (kindDescriptor === undefined || !("value" in kindDescriptor)) {
    throw new TypeError("invalid Facility choice kind");
  }
  const kind = kindDescriptor.value;
  if (kind === "skip") {
    exactDataObjectV1(value, ["kind"], "Facility choice");
    return deepFreezePocValueV1({ kind });
  }
  if (kind === "build") {
    const choice = exactDataObjectV1(value, ["kind", "facilityId"], "Facility choice");
    return deepFreezePocValueV1({
      kind,
      facilityId: parseFacilityId(dataPropertyV1(choice, "facilityId", "Facility choice")),
    });
  }
  throw new TypeError("invalid Facility choice kind");
}

export function parsePocFacilityStateV1(value: unknown): FacilityStateV1 {
  const state = exactDataObjectV1(value, ["facilityId", "builtAtSequence"], "Facility State");
  return deepFreezePocValueV1({
    facilityId: parseFacilityId(dataPropertyV1(state, "facilityId", "Facility State")),
    builtAtSequence: parsePositiveSafeInteger(
      dataPropertyV1(state, "builtAtSequence", "Facility State"),
    ),
  });
}

export function parsePocFacilityDecisionRecordV1(value: unknown): FacilityDecisionRecordV1 {
  const record = exactDataObjectV1(
    value,
    ["opportunityId", "decision"],
    "Facility decision record",
  );
  return deepFreezePocValueV1({
    opportunityId: parseActionId(
      dataPropertyV1(record, "opportunityId", "Facility decision record"),
    ),
    decision: parsePocFacilityDecisionV1(
      dataPropertyV1(record, "decision", "Facility decision record"),
    ),
  });
}

export function parsePocFacilitiesStateV1(value: unknown): FacilitiesStateV1 {
  const state = exactDataObjectV1(value, ["built", "decisions"], "Facilities State");
  return deepFreezePocValueV1({
    built: exactDataArrayV1(
      dataPropertyV1(state, "built", "Facilities State"),
      "built Facilities",
    ).map(parsePocFacilityStateV1),
    decisions: exactDataArrayV1(
      dataPropertyV1(state, "decisions", "Facilities State"),
      "Facility decisions",
    ).map(parsePocFacilityDecisionRecordV1),
  });
}

export const pocFacilitiesStateSchemaV1: RuntimeSchemaV1<FacilitiesStateV1> = Object.freeze({
  parse: parsePocFacilitiesStateV1,
});

export function sortPocFacilityStatesV1(
  values: readonly DeepReadonly<FacilityStateV1>[],
): readonly FacilityStateV1[] {
  return deepFreezePocValueV1(
    values
      .map(parsePocFacilityStateV1)
      .sort((left, right) => comparePocFacilityIdsV1(left.facilityId, right.facilityId)),
  );
}

export function sortPocFacilityDecisionRecordsV1(
  values: readonly DeepReadonly<FacilityDecisionRecordV1>[],
): readonly FacilityDecisionRecordV1[] {
  return deepFreezePocValueV1(
    values
      .map(parsePocFacilityDecisionRecordV1)
      .sort((left, right) =>
        comparePocFacilityOpportunityIdsV1(left.opportunityId, right.opportunityId),
      ),
  );
}

type PocFacilitiesInvariantViolationV1 =
  | {
      readonly code: "collection.duplicate_id" | "collection.unstable_order";
      readonly details: { readonly collection: string; readonly id: string };
    }
  | {
      readonly code: "facilities.build_decision_mismatch";
      readonly details: { readonly facilityId: string; readonly decisionCount: number };
    };

const noFacilitiesInvariantViolationsV1: readonly PocFacilitiesInvariantViolationV1[] =
  Object.freeze([]);

export const pocFacilitiesInvariantV1 = Object.freeze({
  check(
    stateValue: DeepReadonly<FacilitiesStateV1>,
    _readPort: PocFacilitiesReadPortV1,
  ): readonly PocFacilitiesInvariantViolationV1[] {
    const state = pocFacilitiesStateSchemaV1.parse(stateValue);
    const violations: PocFacilitiesInvariantViolationV1[] = [];
    const builtIds = new Set<FacilityId>();
    let previousFacilityId: FacilityId | null = null;
    for (const built of state.built) {
      if (builtIds.has(built.facilityId)) {
        violations.push({
          code: "collection.duplicate_id",
          details: { collection: "facilities.built.facilityId", id: built.facilityId },
        });
      } else if (
        previousFacilityId !== null &&
        comparePocFacilityIdsV1(previousFacilityId, built.facilityId) >= 0
      ) {
        violations.push({
          code: "collection.unstable_order",
          details: { collection: "facilities.built.facilityId", id: built.facilityId },
        });
      }
      builtIds.add(built.facilityId);
      previousFacilityId = built.facilityId;
    }

    const opportunityIds = new Set<ActionId>();
    const builtDecisionCounts = new Map<FacilityId, number>();
    let previousOpportunityId: ActionId | null = null;
    for (const record of state.decisions) {
      if (opportunityIds.has(record.opportunityId)) {
        violations.push({
          code: "collection.duplicate_id",
          details: { collection: "facilities.decisions.opportunityId", id: record.opportunityId },
        });
      } else if (
        previousOpportunityId !== null &&
        comparePocFacilityOpportunityIdsV1(previousOpportunityId, record.opportunityId) >= 0
      ) {
        violations.push({
          code: "collection.unstable_order",
          details: { collection: "facilities.decisions.opportunityId", id: record.opportunityId },
        });
      }
      opportunityIds.add(record.opportunityId);
      previousOpportunityId = record.opportunityId;
      if (record.decision.kind === "built") {
        builtDecisionCounts.set(
          record.decision.facilityId,
          (builtDecisionCounts.get(record.decision.facilityId) ?? 0) + 1,
        );
      }
    }

    const referencedFacilityIds = new Set<FacilityId>([...builtIds, ...builtDecisionCounts.keys()]);
    for (const facilityId of [...referencedFacilityIds].sort(comparePocFacilityIdsV1)) {
      const decisionCount = builtDecisionCounts.get(facilityId) ?? 0;
      if (!builtIds.has(facilityId) || decisionCount !== 1) {
        violations.push({
          code: "facilities.build_decision_mismatch",
          details: { facilityId, decisionCount },
        });
      }
    }
    return violations.length === 0
      ? noFacilitiesInvariantViolationsV1
      : deepFreezePocValueV1(violations);
  },
});

function parseFacilitiesOwnerOperationV1(value: unknown): PocFacilitiesOwnerOperationV1 {
  const operation = exactDataObjectV1(
    value,
    ["kind", "opportunityId", "choice"],
    "Facilities owner operation",
  );
  const kind = dataPropertyV1(operation, "kind", "Facilities owner operation");
  if (kind !== "facilities.choose") throw new TypeError("invalid Facilities owner operation kind");
  return deepFreezePocValueV1({
    kind,
    opportunityId: parseActionId(
      dataPropertyV1(operation, "opportunityId", "Facilities owner operation"),
    ),
    choice: parsePocFacilityChoiceV1(
      dataPropertyV1(operation, "choice", "Facilities owner operation"),
    ),
  });
}

export const pocFacilitiesOwnerOperationSchemaV1: RuntimeSchemaV1<PocFacilitiesOwnerOperationV1> =
  Object.freeze({ parse: parseFacilitiesOwnerOperationV1 });

function parseOpportunityPortV1(value: unknown): PocFacilitiesOpportunityPortV1 {
  const opportunity = exactDataObjectV1(
    value,
    ["opportunityId", "facilityIds", "skipReasonId"],
    "Facilities opportunity port",
  );
  const facilityIds = exactDataArrayV1(
    dataPropertyV1(opportunity, "facilityIds", "Facilities opportunity port"),
    "Facilities opportunity IDs",
  ).map(parseFacilityId);
  assertUniqueStableOrderV1(facilityIds, "Facilities opportunity IDs");
  return deepFreezePocValueV1({
    opportunityId: parseActionId(
      dataPropertyV1(opportunity, "opportunityId", "Facilities opportunity port"),
    ),
    facilityIds,
    skipReasonId: parseReasonId(
      dataPropertyV1(opportunity, "skipReasonId", "Facilities opportunity port"),
    ),
  });
}

export function parsePocFacilitiesDependencyPortsV1(
  value: unknown,
): PocFacilitiesDependencyPortsV1 {
  const dependencies = exactDataObjectV1(
    value,
    ["kind", "commandSequence", "opportunity", "facilityBuildReasonId"],
    "Facilities dependency ports",
  );
  const kind = dataPropertyV1(dependencies, "kind", "Facilities dependency ports");
  if (kind !== "facilities.choose") throw new TypeError("invalid Facilities dependency port kind");
  return deepFreezePocValueV1({
    kind,
    commandSequence: parsePositiveSafeInteger(
      dataPropertyV1(dependencies, "commandSequence", "Facilities dependency ports"),
    ),
    opportunity: parseOpportunityPortV1(
      dataPropertyV1(dependencies, "opportunity", "Facilities dependency ports"),
    ),
    facilityBuildReasonId: parseReasonId(
      dataPropertyV1(dependencies, "facilityBuildReasonId", "Facilities dependency ports"),
    ),
  });
}

export const pocFacilitiesDependencyPortsSchemaV1: RuntimeSchemaV1<PocFacilitiesDependencyPortsV1> =
  Object.freeze({ parse: parsePocFacilitiesDependencyPortsV1 });

function parseFacilityChoiceFactV1(value: unknown): PocFacilitiesGameplayFactV1 {
  const fact = exactDataObjectV1(
    value,
    ["kind", "opportunityId", "choice", "reason"],
    "Facilities choice Fact",
  );
  const kind = dataPropertyV1(fact, "kind", "Facilities choice Fact");
  if (kind !== "facility.choice_committed") throw new TypeError("invalid Facilities Fact kind");
  const reasonValue = exactDataObjectV1(
    dataPropertyV1(fact, "reason", "Facilities choice Fact"),
    ["kind", "commandKind", "reasonId"],
    "Facilities choice reason",
  );
  const reasonKind = dataPropertyV1(reasonValue, "kind", "Facilities choice reason");
  const commandKind = dataPropertyV1(reasonValue, "commandKind", "Facilities choice reason");
  if (reasonKind !== "command" || commandKind !== "facility.choose") {
    throw new TypeError("Facilities choice Fact requires facility.choose command reason");
  }
  const reason: Extract<ChangeReasonV1, { readonly kind: "command" }> = deepFreezePocValueV1({
    kind: reasonKind,
    commandKind,
    reasonId: parseReasonId(dataPropertyV1(reasonValue, "reasonId", "Facilities choice reason")),
  });
  return deepFreezePocValueV1({
    kind,
    opportunityId: parseActionId(dataPropertyV1(fact, "opportunityId", "Facilities choice Fact")),
    choice: parsePocFacilityDecisionV1(dataPropertyV1(fact, "choice", "Facilities choice Fact")),
    reason,
  });
}

export const pocFacilitiesGameplayFactSchemaV1: RuntimeSchemaV1<PocFacilitiesGameplayFactV1> =
  Object.freeze({ parse: parseFacilityChoiceFactV1 });

function canonicalValuesEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.length === rightBytes.length &&
    leftBytes.every((byte, index) => byte === rightBytes[index])
  );
}

export function pocFacilitiesStatesEqualV1(
  left: FacilitiesStateV1,
  right: FacilitiesStateV1,
): boolean {
  return canonicalValuesEqualV1(left, right);
}

function assertValidFacilitiesStateV1(state: FacilitiesStateV1, label: string): void {
  if (pocFacilitiesInvariantV1.check(state, state).length !== 0) {
    throw new TypeError(`${label} violates Facilities collection invariants`);
  }
}

export function assertValidInitialPocFacilitiesStateV1(
  stateValue: DeepReadonly<FacilitiesStateV1>,
): void {
  const state = pocFacilitiesStateSchemaV1.parse(stateValue);
  assertValidFacilitiesStateV1(state, "initial Facilities State");
  if (state.built.length !== 0 || state.decisions.length !== 0) {
    throw new TypeError("initial Facilities State must be empty");
  }
}

function assertProposalConsistencyV1(proposal: PocFacilitiesOwnerProposalV1): void {
  const { after, before } = proposal.payload;
  assertValidFacilitiesStateV1(before, "Facilities proposal before State");
  assertValidFacilitiesStateV1(after, "Facilities proposal after State");
  const [fact] = proposal.facts;
  if (proposal.facts.length !== 1 || fact === undefined) {
    throw new TypeError("Facilities choice proposal requires one exact Fact");
  }
  if (before.decisions.some(({ opportunityId }) => opportunityId === fact.opportunityId)) {
    throw new TypeError("Facilities choice proposal reuses a committed opportunity");
  }
  const expectedDecisions = sortPocFacilityDecisionRecordsV1([
    ...before.decisions,
    { opportunityId: fact.opportunityId, decision: fact.choice },
  ]);
  let expectedBuilt = before.built;
  if (fact.choice.kind === "built") {
    const facilityId = fact.choice.facilityId;
    if (before.built.some((built) => built.facilityId === facilityId)) {
      throw new TypeError("Facilities choice proposal rebuilds an existing facility");
    }
    const added = after.built.filter((built) => built.facilityId === facilityId);
    if (added.length !== 1) {
      throw new TypeError("Facilities build proposal has no exact built State");
    }
    expectedBuilt = sortPocFacilityStatesV1([...before.built, added[0] as FacilityStateV1]);
  }
  if (
    !canonicalValuesEqualV1(after.decisions, expectedDecisions) ||
    !canonicalValuesEqualV1(after.built, expectedBuilt)
  ) {
    throw new TypeError("Facilities choice proposal State transition is inconsistent");
  }
}

export const pocFacilitiesOwnerProposalSchemaV1: RuntimeSchemaV1<PocFacilitiesOwnerProposalV1> =
  Object.freeze({
    parse(value: unknown): PocFacilitiesOwnerProposalV1 {
      const proposal = exactDataObjectV1(value, ["payload", "facts"], "Facilities owner proposal");
      const payload = exactDataObjectV1(
        dataPropertyV1(proposal, "payload", "Facilities owner proposal"),
        ["kind", "before", "after"],
        "Facilities owner proposal payload",
      );
      const kind = dataPropertyV1(payload, "kind", "Facilities owner proposal payload");
      if (kind !== "facilities.choose") throw new TypeError("invalid Facilities proposal kind");
      const facts = exactDataArrayV1(
        dataPropertyV1(proposal, "facts", "Facilities owner proposal"),
        "Facilities owner proposal Facts",
      ).map(parseFacilityChoiceFactV1);
      const parsed = deepFreezePocValueV1({
        payload: {
          kind,
          before: pocFacilitiesStateSchemaV1.parse(
            dataPropertyV1(payload, "before", "Facilities owner proposal payload"),
          ),
          after: pocFacilitiesStateSchemaV1.parse(
            dataPropertyV1(payload, "after", "Facilities owner proposal payload"),
          ),
        },
        facts,
      }) satisfies PocFacilitiesOwnerProposalV1;
      assertProposalConsistencyV1(parsed);
      return parsed;
    },
  });
