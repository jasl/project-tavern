// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { canonicalJsonBytes } from "@sillymaker/base";
import type {
  DeepReadonly,
  ModuleOwnerProposalEnvelopeV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";

import {
  parseActionId,
  parseAssetId,
  parseCharacterId,
  parseChoiceId,
  parseEventId,
  parseFixtureId,
  parseNodeId,
  parseSceneId,
} from "../../contracts/ids.js";
import type {
  CharacterSlotV1,
  NarrativeCallFrameV1,
  NarrativeCharacterStateV1,
  NarrativeCursorV1,
  NarrativeRuntimeStateV1,
  NarrativeSourceV1,
  NarrativeStageStateV1,
  PocGameplayFactV1,
} from "../../contracts/types.js";
import { deepFreezePocValueV1 } from "../../contracts/values.js";

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

function canonicalValuesEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.length === rightBytes.length &&
    leftBytes.every((byte, index) => byte === rightBytes[index])
  );
}

function isDeeplyFrozenDataV1(value: unknown, seen = new WeakSet<object>()): boolean {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return true;
  if (seen.has(value)) return true;
  if (!Object.isFrozen(value)) return false;
  seen.add(value);
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (key === "length" && Array.isArray(value)) continue;
    if (
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      !isDeeplyFrozenDataV1(descriptor.value, seen)
    ) {
      return false;
    }
  }
  return true;
}

function reuseFrozenDataV1<TValue>(source: unknown, parsed: TValue): TValue {
  return isDeeplyFrozenDataV1(source) && canonicalValuesEqualV1(source, parsed)
    ? (source as TValue)
    : parsed;
}

function parseNarrativeStatusV1(value: unknown): NarrativeRuntimeStateV1["status"] {
  if (value !== "idle" && value !== "active" && value !== "completed") {
    throw new TypeError("invalid Narrative status");
  }
  return value;
}

function parseCharacterSlotV1(value: unknown): CharacterSlotV1 {
  if (value !== "left" && value !== "center" && value !== "right") {
    throw new TypeError("invalid Narrative character slot");
  }
  return value;
}

function parseStageTransitionV1(value: unknown): NarrativeStageStateV1["transition"] {
  if (value !== "cut" && value !== "fade") {
    throw new TypeError("invalid Narrative stage transition");
  }
  return value;
}

export function parsePocNarrativeCursorV1(value: unknown): NarrativeCursorV1 {
  const cursor = exactDataObjectV1(value, ["sceneId", "nodeId"], "Narrative cursor");
  return deepFreezePocValueV1({
    sceneId: parseSceneId(dataPropertyV1(cursor, "sceneId", "Narrative cursor")),
    nodeId: parseNodeId(dataPropertyV1(cursor, "nodeId", "Narrative cursor")),
  });
}

export function parsePocNarrativeCallFrameV1(value: unknown): NarrativeCallFrameV1 {
  const frame = exactDataObjectV1(value, ["sceneId", "returnNodeId"], "Narrative call frame");
  return deepFreezePocValueV1({
    sceneId: parseSceneId(dataPropertyV1(frame, "sceneId", "Narrative call frame")),
    returnNodeId: parseNodeId(dataPropertyV1(frame, "returnNodeId", "Narrative call frame")),
  });
}

export function parsePocNarrativeCharacterStateV1(value: unknown): NarrativeCharacterStateV1 {
  const character = exactDataObjectV1(
    value,
    ["slot", "characterId", "poseAssetId"],
    "Narrative character State",
  );
  return deepFreezePocValueV1({
    slot: parseCharacterSlotV1(dataPropertyV1(character, "slot", "Narrative character State")),
    characterId: parseCharacterId(
      dataPropertyV1(character, "characterId", "Narrative character State"),
    ),
    poseAssetId: parseAssetId(
      dataPropertyV1(character, "poseAssetId", "Narrative character State"),
    ),
  });
}

export function parsePocNarrativeStageStateV1(value: unknown): NarrativeStageStateV1 {
  const stage = exactDataObjectV1(
    value,
    ["backgroundAssetId", "characters", "transition"],
    "Narrative stage State",
  );
  const backgroundAssetIdValue = dataPropertyV1(
    stage,
    "backgroundAssetId",
    "Narrative stage State",
  );
  const charactersValue = dataPropertyV1(stage, "characters", "Narrative stage State");
  const parsedCharacters = exactDataArrayV1(charactersValue, "Narrative stage characters").map(
    parsePocNarrativeCharacterStateV1,
  );
  return deepFreezePocValueV1({
    backgroundAssetId:
      backgroundAssetIdValue === null ? null : parseAssetId(backgroundAssetIdValue),
    characters: reuseFrozenDataV1(charactersValue, parsedCharacters),
    transition: parseStageTransitionV1(
      dataPropertyV1(stage, "transition", "Narrative stage State"),
    ),
  });
}

export function parsePocNarrativeSourceV1(value: unknown): NarrativeSourceV1 {
  const candidate = exactDataObjectForKindV1(value, "Narrative source");
  const kind = dataPropertyV1(candidate, "kind", "Narrative source");
  if (kind === "manifest_start") {
    exactDataObjectV1(value, ["kind"], "Narrative source");
    return deepFreezePocValueV1({ kind });
  }
  if (kind === "event") {
    const source = exactDataObjectV1(value, ["kind", "eventId"], "Narrative source");
    return deepFreezePocValueV1({
      kind,
      eventId: parseEventId(dataPropertyV1(source, "eventId", "Narrative source")),
    });
  }
  if (kind === "story_action" || kind === "world_action") {
    const source = exactDataObjectV1(value, ["kind", "actionId"], "Narrative source");
    return deepFreezePocValueV1({
      kind,
      actionId: parseActionId(dataPropertyV1(source, "actionId", "Narrative source")),
    });
  }
  if (kind === "debug_fixture") {
    const source = exactDataObjectV1(value, ["kind", "fixtureId"], "Narrative source");
    return deepFreezePocValueV1({
      kind,
      fixtureId: parseFixtureId(dataPropertyV1(source, "fixtureId", "Narrative source")),
    });
  }
  throw new TypeError("invalid Narrative source kind");
}

export function parsePocNarrativeStateV1(value: unknown): NarrativeRuntimeStateV1 {
  const state = exactDataObjectV1(
    value,
    ["status", "source", "cursor", "callStack", "stage"],
    "Narrative State",
  );
  const sourceValue = dataPropertyV1(state, "source", "Narrative State");
  const cursorValue = dataPropertyV1(state, "cursor", "Narrative State");
  const callStackValue = dataPropertyV1(state, "callStack", "Narrative State");
  const stageValue = dataPropertyV1(state, "stage", "Narrative State");
  const parsedSource = sourceValue === null ? null : parsePocNarrativeSourceV1(sourceValue);
  const parsedCursor = cursorValue === null ? null : parsePocNarrativeCursorV1(cursorValue);
  const parsedCallStack = exactDataArrayV1(callStackValue, "Narrative call stack").map(
    parsePocNarrativeCallFrameV1,
  );
  const parsedStage = parsePocNarrativeStageStateV1(stageValue);
  return deepFreezePocValueV1({
    status: parseNarrativeStatusV1(dataPropertyV1(state, "status", "Narrative State")),
    source: reuseFrozenDataV1(sourceValue, parsedSource),
    cursor: reuseFrozenDataV1(cursorValue, parsedCursor),
    callStack: reuseFrozenDataV1(callStackValue, parsedCallStack),
    stage: reuseFrozenDataV1(stageValue, parsedStage),
  });
}

export const parsePocNarrativeRuntimeStateV1 = parsePocNarrativeStateV1;

export const pocNarrativeStateSchemaV1: RuntimeSchemaV1<NarrativeRuntimeStateV1> = Object.freeze({
  parse: parsePocNarrativeStateV1,
});

export type PocNarrativeInvariantViolationV1 =
  | {
      readonly code: "narrative.invalid_cursor";
      readonly details: { readonly reason: string };
    }
  | {
      readonly code: "collection.duplicate_id";
      readonly details: { readonly collection: string; readonly id: string };
    };

const noNarrativeInvariantViolationsV1: readonly PocNarrativeInvariantViolationV1[] = Object.freeze(
  [],
);

function narrativeInvariantViolationsV1(
  state: NarrativeRuntimeStateV1,
): readonly PocNarrativeInvariantViolationV1[] {
  const violations: PocNarrativeInvariantViolationV1[] = [];
  const invalidState = (reason: string): void => {
    violations.push({ code: "narrative.invalid_cursor", details: { reason } });
  };

  if (state.status === "idle") {
    if (state.source !== null || state.cursor !== null || state.callStack.length !== 0) {
      invalidState("idle_lifecycle_fields");
    }
  } else if (state.status === "active") {
    if (state.source === null || state.cursor === null) invalidState("active_lifecycle_fields");
  } else if (state.source === null || state.cursor !== null || state.callStack.length !== 0) {
    invalidState("completed_lifecycle_fields");
  }

  const seenSlots = new Set<CharacterSlotV1>();
  for (const character of state.stage.characters) {
    if (seenSlots.has(character.slot)) {
      violations.push({
        code: "collection.duplicate_id",
        details: { collection: "story.narrative.stage.characters.slot", id: character.slot },
      });
    }
    seenSlots.add(character.slot);
  }

  return violations.length === 0
    ? noNarrativeInvariantViolationsV1
    : deepFreezePocValueV1(violations);
}

export const pocNarrativeInvariantV1 = Object.freeze({
  check(
    stateValue: DeepReadonly<NarrativeRuntimeStateV1>,
    _readPort: PocNarrativeReadPortV1,
  ): readonly PocNarrativeInvariantViolationV1[] {
    return narrativeInvariantViolationsV1(pocNarrativeStateSchemaV1.parse(stateValue));
  },
});

export function assertValidPocNarrativeStateV1(
  stateValue: DeepReadonly<NarrativeRuntimeStateV1>,
  label: string,
): void {
  const state = pocNarrativeStateSchemaV1.parse(stateValue);
  if (narrativeInvariantViolationsV1(state).length !== 0) {
    throw new TypeError(`${label} violates Narrative invariants`);
  }
}

export function assertValidInitialPocNarrativeStateV1(
  stateValue: DeepReadonly<NarrativeRuntimeStateV1>,
): void {
  const state = pocNarrativeStateSchemaV1.parse(stateValue);
  assertValidPocNarrativeStateV1(state, "initial Narrative State");
  if (
    state.status !== "idle" ||
    state.source !== null ||
    state.cursor !== null ||
    state.callStack.length !== 0 ||
    state.stage.backgroundAssetId !== null ||
    state.stage.characters.length !== 0 ||
    state.stage.transition !== "cut"
  ) {
    throw new TypeError("initial Narrative State must be the canonical idle State");
  }
}

export function pocNarrativeStatesEqualV1(
  left: NarrativeRuntimeStateV1,
  right: NarrativeRuntimeStateV1,
): boolean {
  return canonicalValuesEqualV1(left, right);
}

export type PocNarrativeReadPortV1 = NarrativeRuntimeStateV1;

export type PocNarrativeGameplayFactV1 = Extract<
  PocGameplayFactV1,
  { readonly kind: "narrative.advanced" | "narrative.choice_committed" }
>;

function parsePocNarrativeGameplayFactV1(value: unknown): PocNarrativeGameplayFactV1 {
  const candidate = exactDataObjectForKindV1(value, "Narrative GameplayFact");
  const kind = dataPropertyV1(candidate, "kind", "Narrative GameplayFact");
  if (kind === "narrative.advanced") {
    const fact = exactDataObjectV1(
      value,
      ["kind", "from", "to"],
      "Narrative advanced GameplayFact",
    );
    const toValue = dataPropertyV1(fact, "to", "Narrative advanced GameplayFact");
    return deepFreezePocValueV1({
      kind,
      from: parsePocNarrativeCursorV1(
        dataPropertyV1(fact, "from", "Narrative advanced GameplayFact"),
      ),
      to: toValue === null ? null : parsePocNarrativeCursorV1(toValue),
    });
  }
  if (kind === "narrative.choice_committed") {
    const fact = exactDataObjectV1(
      value,
      ["kind", "cursor", "choiceId"],
      "Narrative choice GameplayFact",
    );
    return deepFreezePocValueV1({
      kind,
      cursor: parsePocNarrativeCursorV1(
        dataPropertyV1(fact, "cursor", "Narrative choice GameplayFact"),
      ),
      choiceId: parseChoiceId(dataPropertyV1(fact, "choiceId", "Narrative choice GameplayFact")),
    });
  }
  throw new TypeError("invalid Narrative GameplayFact kind");
}

export interface PocNarrativeSettledResultV1 {
  readonly kind: "settled";
  readonly state: NarrativeRuntimeStateV1;
  readonly effects: readonly [];
  readonly checkpoints: readonly [];
  readonly gameplayFacts: readonly PocNarrativeGameplayFactV1[];
  readonly request: null;
  readonly continuation: null;
}

export const pocNarrativeSettledResultSchemaV1: RuntimeSchemaV1<PocNarrativeSettledResultV1> =
  Object.freeze({
    parse(value: unknown): PocNarrativeSettledResultV1 {
      const settled = exactDataObjectV1(
        value,
        ["kind", "state", "effects", "checkpoints", "gameplayFacts", "request", "continuation"],
        "Narrative settled result",
      );
      const kind = dataPropertyV1(settled, "kind", "Narrative settled result");
      if (kind !== "settled") throw new TypeError("invalid Narrative settled result kind");
      const effects = exactDataArrayV1(
        dataPropertyV1(settled, "effects", "Narrative settled result"),
        "Narrative settled effects",
      );
      const checkpoints = exactDataArrayV1(
        dataPropertyV1(settled, "checkpoints", "Narrative settled result"),
        "Narrative settled checkpoints",
      );
      if (effects.length !== 0 || checkpoints.length !== 0) {
        throw new TypeError("Narrative settled result cannot retain pending work");
      }
      if (
        dataPropertyV1(settled, "request", "Narrative settled result") !== null ||
        dataPropertyV1(settled, "continuation", "Narrative settled result") !== null
      ) {
        throw new TypeError("Narrative settled result cannot retain a continuation");
      }
      const state = pocNarrativeStateSchemaV1.parse(
        dataPropertyV1(settled, "state", "Narrative settled result"),
      );
      assertValidPocNarrativeStateV1(state, "Narrative settled result State");
      if (state.status === "idle") {
        throw new TypeError("Narrative settled result cannot return idle State");
      }
      const gameplayFacts = exactDataArrayV1(
        dataPropertyV1(settled, "gameplayFacts", "Narrative settled result"),
        "Narrative settled GameplayFacts",
      ).map(parsePocNarrativeGameplayFactV1);
      if (gameplayFacts.length > 1) {
        throw new TypeError("Narrative settled result may emit at most one GameplayFact");
      }
      return deepFreezePocValueV1({
        kind,
        state,
        effects: [],
        checkpoints: [],
        gameplayFacts,
        request: null,
        continuation: null,
      });
    },
  });

export type PocNarrativeNormalOwnerOperationKindV1 =
  "narrative.start" | "narrative.advance" | "narrative.choose" | "narrative.complete";

export type PocNarrativeOwnerOperationV1 =
  | {
      readonly kind: PocNarrativeNormalOwnerOperationKindV1;
      readonly settled: PocNarrativeSettledResultV1;
    }
  | { readonly kind: "narrative.debug.jump"; readonly target: NarrativeCursorV1 };

function parseNarrativeNormalOwnerOperationKindV1(
  value: unknown,
): PocNarrativeNormalOwnerOperationKindV1 {
  if (
    value !== "narrative.start" &&
    value !== "narrative.advance" &&
    value !== "narrative.choose" &&
    value !== "narrative.complete"
  ) {
    throw new TypeError("invalid Narrative owner operation kind");
  }
  return value;
}

export const pocNarrativeOwnerOperationSchemaV1: RuntimeSchemaV1<PocNarrativeOwnerOperationV1> =
  Object.freeze({
    parse(value: unknown): PocNarrativeOwnerOperationV1 {
      const candidate = exactDataObjectForKindV1(value, "Narrative owner operation");
      const kindValue = dataPropertyV1(candidate, "kind", "Narrative owner operation");
      if (kindValue === "narrative.debug.jump") {
        const operation = exactDataObjectV1(value, ["kind", "target"], "Narrative owner operation");
        return deepFreezePocValueV1({
          kind: kindValue,
          target: parsePocNarrativeCursorV1(
            dataPropertyV1(operation, "target", "Narrative owner operation"),
          ),
        });
      }
      const kind = parseNarrativeNormalOwnerOperationKindV1(kindValue);
      const operation = exactDataObjectV1(value, ["kind", "settled"], "Narrative owner operation");
      return deepFreezePocValueV1({
        kind,
        settled: pocNarrativeSettledResultSchemaV1.parse(
          dataPropertyV1(operation, "settled", "Narrative owner operation"),
        ),
      });
    },
  });

export type PocNarrativePresentableNodeKindV1 = "line" | "narration" | "choice";

export interface PocNarrativeSettledDependenciesV1 {
  readonly kind: "narrative.settled";
}

export interface PocNarrativeDebugJumpTargetProofV1 {
  readonly cursor: NarrativeCursorV1;
  readonly nodeKind: PocNarrativePresentableNodeKindV1;
}

export interface PocNarrativeDebugJumpDependenciesV1 {
  readonly kind: "narrative.debug.jump";
  readonly target: PocNarrativeDebugJumpTargetProofV1;
}

export type PocNarrativeDependencyPortsV1 =
  PocNarrativeSettledDependenciesV1 | PocNarrativeDebugJumpDependenciesV1;

function parsePresentableNodeKindV1(value: unknown): PocNarrativePresentableNodeKindV1 {
  if (value !== "line" && value !== "narration" && value !== "choice") {
    throw new TypeError("invalid Narrative presentable node kind");
  }
  return value;
}

export const pocNarrativeDependencyPortsSchemaV1: RuntimeSchemaV1<PocNarrativeDependencyPortsV1> =
  Object.freeze({
    parse(value: unknown): PocNarrativeDependencyPortsV1 {
      const candidate = exactDataObjectForKindV1(value, "Narrative dependency ports");
      const kind = dataPropertyV1(candidate, "kind", "Narrative dependency ports");
      if (kind === "narrative.settled") {
        exactDataObjectV1(value, ["kind"], "Narrative dependency ports");
        return deepFreezePocValueV1({ kind });
      }
      if (kind === "narrative.debug.jump") {
        const dependencies = exactDataObjectV1(
          value,
          ["kind", "target"],
          "Narrative dependency ports",
        );
        const target = exactDataObjectV1(
          dataPropertyV1(dependencies, "target", "Narrative dependency ports"),
          ["cursor", "nodeKind"],
          "Narrative debug target proof",
        );
        return deepFreezePocValueV1({
          kind,
          target: {
            cursor: parsePocNarrativeCursorV1(
              dataPropertyV1(target, "cursor", "Narrative debug target proof"),
            ),
            nodeKind: parsePresentableNodeKindV1(
              dataPropertyV1(target, "nodeKind", "Narrative debug target proof"),
            ),
          },
        });
      }
      throw new TypeError("invalid Narrative dependency port kind");
    },
  });

export interface PocNarrativeOwnerProposalPayloadV1 {
  readonly kind: PocNarrativeOwnerOperationV1["kind"];
  readonly before: NarrativeRuntimeStateV1;
  readonly after: NarrativeRuntimeStateV1;
}

export type PocNarrativeOwnerProposalV1 = ModuleOwnerProposalEnvelopeV1<
  PocNarrativeOwnerProposalPayloadV1,
  PocNarrativeGameplayFactV1
>;

function assertNarrativeSourcePreservedV1(
  before: NarrativeRuntimeStateV1,
  after: NarrativeRuntimeStateV1,
  label: string,
): void {
  if (!canonicalValuesEqualV1(before.source, after.source)) {
    throw new TypeError(`${label} must preserve Narrative source`);
  }
}

function assertNarrativeProposalConsistencyV1(proposal: PocNarrativeOwnerProposalV1): void {
  const { after, before, kind } = proposal.payload;
  assertValidPocNarrativeStateV1(before, "Narrative proposal before State");
  assertValidPocNarrativeStateV1(after, "Narrative proposal after State");

  if (kind === "narrative.start") {
    if (before.status === "active" || after.status === "idle" || proposal.facts.length !== 0) {
      throw new TypeError("Narrative start proposal transition is inconsistent");
    }
    return;
  }

  if (before.status !== "active" || before.cursor === null) {
    throw new TypeError("Narrative proposal requires active before State");
  }

  if (kind === "narrative.advance") {
    const fact = proposal.facts[0];
    if (
      proposal.facts.length !== 1 ||
      fact?.kind !== "narrative.advanced" ||
      !canonicalValuesEqualV1(fact.from, before.cursor) ||
      !canonicalValuesEqualV1(fact.to, after.cursor) ||
      after.status === "idle"
    ) {
      throw new TypeError("Narrative advance proposal transition is inconsistent");
    }
    assertNarrativeSourcePreservedV1(before, after, "Narrative advance proposal");
    return;
  }

  if (kind === "narrative.choose") {
    const fact = proposal.facts[0];
    if (
      proposal.facts.length !== 1 ||
      fact?.kind !== "narrative.choice_committed" ||
      !canonicalValuesEqualV1(fact.cursor, before.cursor) ||
      after.status === "idle"
    ) {
      throw new TypeError("Narrative choose proposal transition is inconsistent");
    }
    assertNarrativeSourcePreservedV1(before, after, "Narrative choose proposal");
    return;
  }

  if (kind === "narrative.complete") {
    if (proposal.facts.length !== 0 || after.status !== "completed") {
      throw new TypeError("Narrative complete proposal transition is inconsistent");
    }
    assertNarrativeSourcePreservedV1(before, after, "Narrative complete proposal");
    return;
  }

  if (
    proposal.facts.length !== 0 ||
    after.status !== "active" ||
    after.cursor === null ||
    after.callStack.length !== 0 ||
    !canonicalValuesEqualV1(before.source, after.source) ||
    !canonicalValuesEqualV1(before.stage, after.stage)
  ) {
    throw new TypeError("Narrative debug jump proposal transition is inconsistent");
  }
}

export const pocNarrativeOwnerProposalSchemaV1: RuntimeSchemaV1<PocNarrativeOwnerProposalV1> =
  Object.freeze({
    parse(value: unknown): PocNarrativeOwnerProposalV1 {
      const proposal = exactDataObjectV1(value, ["payload", "facts"], "Narrative owner proposal");
      const payload = exactDataObjectV1(
        dataPropertyV1(proposal, "payload", "Narrative owner proposal"),
        ["kind", "before", "after"],
        "Narrative owner proposal payload",
      );
      const kindValue = dataPropertyV1(payload, "kind", "Narrative owner proposal payload");
      const kind =
        kindValue === "narrative.debug.jump"
          ? kindValue
          : parseNarrativeNormalOwnerOperationKindV1(kindValue);
      const facts = exactDataArrayV1(
        dataPropertyV1(proposal, "facts", "Narrative owner proposal"),
        "Narrative owner proposal GameplayFacts",
      ).map(parsePocNarrativeGameplayFactV1);
      const parsed = deepFreezePocValueV1({
        payload: {
          kind,
          before: pocNarrativeStateSchemaV1.parse(
            dataPropertyV1(payload, "before", "Narrative owner proposal payload"),
          ),
          after: pocNarrativeStateSchemaV1.parse(
            dataPropertyV1(payload, "after", "Narrative owner proposal payload"),
          ),
        },
        facts,
      }) satisfies PocNarrativeOwnerProposalV1;
      assertNarrativeProposalConsistencyV1(parsed);
      return parsed;
    },
  });
