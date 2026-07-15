// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { canonicalJsonBytes } from "@sillymaker/base";
import type { DeepReadonly } from "@sillymaker/base";

import type {
  CheckRequestV1,
  CheckResultV1,
  ConditionV1,
  NarrativeChoiceV1,
  NarrativeCursorV1,
  NarrativeNodeV1,
  NarrativeRuntimeStateV1,
  NarrativeSceneV1,
  NarrativeSourceV1,
  NarrativeStageStateV1,
  PocEffectIntentV1,
  PocGameplayFactV1,
  PocRejectionReasonV1,
  PocSimulationDataV1,
  StageCueV1,
} from "../../contracts/types.js";
import type { CheckpointId, ChoiceId, SceneId } from "../../contracts/ids.js";
import { deepFreezePocValueV1, parseNonNegativeSafeInteger } from "../../contracts/values.js";
import type { NonNegativeSafeInteger } from "../../contracts/values.js";
import type { PocNarrativeSettledResultV1 } from "./contract.js";

export type PocNarrativeInterpreterInputV1 =
  | {
      readonly kind: "start";
      readonly request: { readonly source: NarrativeSourceV1; readonly sceneId: SceneId };
    }
  | { readonly kind: "advance"; readonly cursor: NarrativeCursorV1 }
  | {
      readonly kind: "choose";
      readonly cursor: NarrativeCursorV1;
      readonly choiceId: ChoiceId;
    }
  | {
      readonly kind: "resume";
      readonly continuation: PocNarrativeContinuationV1;
      readonly resolution: PocNarrativeResolutionV1;
    };

export type PocNarrativeInterpreterRequestV1 =
  | {
      readonly kind: "condition";
      readonly cursor: NarrativeCursorV1;
      readonly conditions: readonly ConditionV1[];
    }
  | {
      readonly kind: "check";
      readonly cursor: NarrativeCursorV1;
      readonly request: CheckRequestV1;
    }
  | {
      readonly kind: "choice";
      readonly cursor: NarrativeCursorV1;
      readonly choice: NarrativeChoiceV1;
    }
  | {
      readonly kind: "effects";
      readonly cursor: NarrativeCursorV1;
      readonly effects: readonly PocEffectIntentV1[];
    }
  | {
      readonly kind: "checkpoint";
      readonly cursor: NarrativeCursorV1;
      readonly checkpointId: CheckpointId;
    };

export interface PocNarrativeContinuationV1 {
  readonly origin:
    | {
        readonly kind: "start";
        readonly request: { readonly source: NarrativeSourceV1; readonly sceneId: SceneId };
      }
    | { readonly kind: "advance"; readonly from: NarrativeCursorV1 }
    | {
        readonly kind: "choose";
        readonly cursor: NarrativeCursorV1;
        readonly choiceId: ChoiceId;
      };
  readonly transientState: NarrativeRuntimeStateV1;
  readonly automaticStepsUsed: NonNegativeSafeInteger;
  readonly pending: PocNarrativeInterpreterRequestV1;
}

export type PocNarrativeCheckDecisionV1 = Pick<CheckResultV1, "checkId" | "actorId" | "bandId">;

export type PocNarrativeResolutionV1 =
  | {
      readonly kind: "condition";
      readonly cursor: NarrativeCursorV1;
      readonly passed: boolean;
    }
  | {
      readonly kind: "check";
      readonly cursor: NarrativeCursorV1;
      readonly decision: PocNarrativeCheckDecisionV1;
    }
  | {
      readonly kind: "choice";
      readonly cursor: NarrativeCursorV1;
      readonly choiceId: ChoiceId;
      readonly visible: true;
      readonly enabled: true;
      readonly checkDecision: PocNarrativeCheckDecisionV1 | null;
    }
  | { readonly kind: "effects_applied"; readonly cursor: NarrativeCursorV1 }
  | { readonly kind: "checkpoint_applied"; readonly cursor: NarrativeCursorV1 };

export type PocNarrativeGameplayFactV1 = Extract<
  PocGameplayFactV1,
  { readonly kind: "narrative.advanced" | "narrative.choice_committed" }
>;

export type PocNarrativeInterpreterRejectionV1 = Extract<
  PocRejectionReasonV1,
  {
    readonly code:
      | "command.unknown_reference"
      | "narrative.inactive"
      | "narrative.cursor_mismatch"
      | "narrative.choice_required";
  }
>;

export type PocNarrativeInterpreterFaultV1 =
  | {
      readonly category: "command_handler";
      readonly code: "narrative.step_limit_exceeded" | "narrative.call_depth_exceeded";
    }
  | {
      readonly category: "engine_invariant";
      readonly code: "narrative.invalid_cursor" | "story.reference_missing";
    };

export type PocNarrativeStepResultV1 =
  | {
      readonly kind: "yielded";
      readonly state: NarrativeRuntimeStateV1;
      readonly effects: readonly PocEffectIntentV1[];
      readonly checkpoints: readonly CheckpointId[];
      readonly gameplayFacts: readonly PocNarrativeGameplayFactV1[];
      readonly request: PocNarrativeInterpreterRequestV1;
      readonly continuation: PocNarrativeContinuationV1;
    }
  | PocNarrativeSettledResultV1
  | { readonly kind: "rejected"; readonly rejection: PocNarrativeInterpreterRejectionV1 }
  | { readonly kind: "faulted"; readonly fault: PocNarrativeInterpreterFaultV1 };

type NarrativeOriginV1 = PocNarrativeContinuationV1["origin"];
type PlainDataRecordV1 = Record<string, unknown>;

function cursorEqualsV1(
  left: DeepReadonly<NarrativeCursorV1> | null,
  right: DeepReadonly<NarrativeCursorV1> | null,
): boolean {
  return (
    left === right ||
    (left !== null &&
      right !== null &&
      left.sceneId === right.sceneId &&
      left.nodeId === right.nodeId)
  );
}

function cloneCursorV1(cursor: DeepReadonly<NarrativeCursorV1>): NarrativeCursorV1 {
  return { sceneId: cursor.sceneId, nodeId: cursor.nodeId };
}

function cloneSourceV1(source: DeepReadonly<NarrativeSourceV1>): NarrativeSourceV1 {
  switch (source.kind) {
    case "manifest_start":
      return { kind: source.kind };
    case "event":
      return { kind: source.kind, eventId: source.eventId };
    case "story_action":
      return { kind: source.kind, actionId: source.actionId };
    case "world_action":
      return { kind: source.kind, actionId: source.actionId };
    case "debug_fixture":
      return { kind: source.kind, fixtureId: source.fixtureId };
  }
  throw new TypeError("unsupported Narrative source");
}

function cloneStageV1(stage: DeepReadonly<NarrativeStageStateV1>): NarrativeStageStateV1 {
  return {
    backgroundAssetId: stage.backgroundAssetId,
    characters: stage.characters.map(({ slot, characterId, poseAssetId }) => ({
      slot,
      characterId,
      poseAssetId,
    })),
    transition: stage.transition,
  };
}

function cloneNarrativeStateV1(
  state: DeepReadonly<NarrativeRuntimeStateV1>,
): NarrativeRuntimeStateV1 {
  return {
    status: state.status,
    source: state.source === null ? null : cloneSourceV1(state.source),
    cursor: state.cursor === null ? null : cloneCursorV1(state.cursor),
    callStack: state.callStack.map(({ sceneId, returnNodeId }) => ({ sceneId, returnNodeId })),
    stage: cloneStageV1(state.stage),
  };
}

function stateAtCursorV1(
  state: DeepReadonly<NarrativeRuntimeStateV1>,
  cursor: NarrativeCursorV1,
): NarrativeRuntimeStateV1 {
  const cloned = cloneNarrativeStateV1(state);
  return { ...cloned, status: "active", cursor };
}

function sceneByIdV1(
  data: DeepReadonly<PocSimulationDataV1>,
  sceneId: SceneId,
): DeepReadonly<NarrativeSceneV1> | undefined {
  return data.narrative.scenes.find((scene) => scene.sceneId === sceneId);
}

function nodeByIdV1(
  scene: DeepReadonly<NarrativeSceneV1>,
  nodeId: NarrativeCursorV1["nodeId"],
): DeepReadonly<NarrativeNodeV1> | undefined {
  return scene.nodes.find((node) => node.nodeId === nodeId);
}

function authoredCursorV1(
  data: DeepReadonly<PocSimulationDataV1>,
  sceneId: SceneId,
  nodeId: NarrativeCursorV1["nodeId"],
): NarrativeCursorV1 | null {
  const scene = sceneByIdV1(data, sceneId);
  if (scene === undefined || nodeByIdV1(scene, nodeId) === undefined) return null;
  return { sceneId, nodeId };
}

function currentNodeV1(
  data: DeepReadonly<PocSimulationDataV1>,
  state: DeepReadonly<NarrativeRuntimeStateV1>,
): {
  readonly scene: DeepReadonly<NarrativeSceneV1>;
  readonly node: DeepReadonly<NarrativeNodeV1>;
} | null {
  if (state.status !== "active" || state.cursor === null || state.source === null) return null;
  const scene = sceneByIdV1(data, state.cursor.sceneId);
  if (scene === undefined) return null;
  const node = nodeByIdV1(scene, state.cursor.nodeId);
  return node === undefined ? null : { scene, node };
}

function narrativeOriginFaultCodeV1(
  data: DeepReadonly<PocSimulationDataV1>,
  state: DeepReadonly<NarrativeRuntimeStateV1>,
  origin: DeepReadonly<NarrativeOriginV1>,
):
  | Extract<PocNarrativeInterpreterFaultV1, { readonly category: "engine_invariant" }>["code"]
  | null {
  if (origin.kind === "start") {
    if (!canonicalValuesEqualV1(origin.request.source, state.source)) {
      return "narrative.invalid_cursor";
    }
    const scene = sceneByIdV1(data, origin.request.sceneId);
    if (scene === undefined || nodeByIdV1(scene, scene.entryNodeId) === undefined) {
      return "story.reference_missing";
    }
    return null;
  }

  const cursor = origin.kind === "advance" ? origin.from : origin.cursor;
  const scene = sceneByIdV1(data, cursor.sceneId);
  const node = scene === undefined ? undefined : nodeByIdV1(scene, cursor.nodeId);
  if (node === undefined) return "story.reference_missing";
  if (origin.kind === "advance") {
    return node.kind === "line" || node.kind === "narration" ? null : "narrative.invalid_cursor";
  }
  if (node.kind !== "choice") return "narrative.invalid_cursor";
  return node.choices.some(({ choiceId }) => choiceId === origin.choiceId)
    ? null
    : "story.reference_missing";
}

function faultedV1(
  category: PocNarrativeInterpreterFaultV1["category"],
  code: PocNarrativeInterpreterFaultV1["code"],
): PocNarrativeStepResultV1 {
  const fault = { category, code } as PocNarrativeInterpreterFaultV1;
  return deepFreezePocValueV1({ kind: "faulted", fault });
}

function rejectedV1(rejection: PocNarrativeInterpreterRejectionV1): PocNarrativeStepResultV1 {
  return deepFreezePocValueV1({ kind: "rejected", rejection });
}

function inactiveV1(commandKind: "narrative.advance" | "narrative.choose") {
  return rejectedV1({ code: "narrative.inactive", details: { commandKind } });
}

function cursorMismatchV1(
  expected: DeepReadonly<NarrativeCursorV1>,
  actual: DeepReadonly<NarrativeCursorV1> | null,
) {
  return rejectedV1({
    code: "narrative.cursor_mismatch",
    details: {
      expected: cloneCursorV1(expected),
      actual: actual === null ? null : cloneCursorV1(actual),
    },
  });
}

function unknownChoiceReferenceV1(
  cursor: DeepReadonly<NarrativeCursorV1>,
  choiceId: ChoiceId,
): PocNarrativeStepResultV1 {
  return rejectedV1({
    code: "command.unknown_reference",
    details: {
      commandKind: "narrative.choose",
      reference: {
        kind: "choice",
        sceneId: cursor.sceneId,
        nodeId: cursor.nodeId,
        choiceId,
      },
    },
  });
}

function canonicalValuesEqualV1(left: unknown, right: unknown): boolean {
  try {
    const leftBytes = canonicalJsonBytes(left);
    const rightBytes = canonicalJsonBytes(right);
    return (
      leftBytes.length === rightBytes.length &&
      leftBytes.every((value, index) => value === rightBytes[index])
    );
  } catch {
    return false;
  }
}

function settledFactsV1(
  origin: DeepReadonly<NarrativeOriginV1>,
  state: DeepReadonly<NarrativeRuntimeStateV1>,
): readonly PocNarrativeGameplayFactV1[] {
  switch (origin.kind) {
    case "start":
      return [];
    case "advance":
      return [
        {
          kind: "narrative.advanced",
          from: cloneCursorV1(origin.from),
          to: state.cursor === null ? null : cloneCursorV1(state.cursor),
        },
      ];
    case "choose":
      return [
        {
          kind: "narrative.choice_committed",
          cursor: cloneCursorV1(origin.cursor),
          choiceId: origin.choiceId,
        },
      ];
  }
  throw new TypeError("unsupported Narrative origin");
}

function settledV1(
  state: DeepReadonly<NarrativeRuntimeStateV1>,
  origin: DeepReadonly<NarrativeOriginV1>,
): PocNarrativeStepResultV1 {
  const result: PocNarrativeSettledResultV1 = {
    kind: "settled",
    state: cloneNarrativeStateV1(state),
    effects: [],
    checkpoints: [],
    gameplayFacts: settledFactsV1(origin, state),
    request: null,
    continuation: null,
  };
  return deepFreezePocValueV1(result);
}

function yieldedV1(
  state: DeepReadonly<NarrativeRuntimeStateV1>,
  origin: DeepReadonly<NarrativeOriginV1>,
  automaticStepsUsed: NonNegativeSafeInteger,
  request: PocNarrativeInterpreterRequestV1,
): PocNarrativeStepResultV1 {
  const transientState = cloneNarrativeStateV1(state);
  const continuation: PocNarrativeContinuationV1 = {
    origin:
      origin.kind === "start"
        ? {
            kind: "start",
            request: {
              source: cloneSourceV1(origin.request.source),
              sceneId: origin.request.sceneId,
            },
          }
        : origin.kind === "advance"
          ? { kind: "advance", from: cloneCursorV1(origin.from) }
          : {
              kind: "choose",
              cursor: cloneCursorV1(origin.cursor),
              choiceId: origin.choiceId,
            },
    transientState,
    automaticStepsUsed,
    pending: request,
  };
  const effects =
    request.kind === "effects"
      ? request.effects
      : request.kind === "choice"
        ? request.choice.effects
        : [];
  const checkpoints = request.kind === "checkpoint" ? [request.checkpointId] : [];
  return deepFreezePocValueV1({
    kind: "yielded",
    state: transientState,
    effects,
    checkpoints,
    gameplayFacts: [],
    request,
    continuation,
  });
}

function applyStageCueV1(
  stage: DeepReadonly<NarrativeStageStateV1>,
  cue: DeepReadonly<StageCueV1>,
): NarrativeStageStateV1 {
  switch (cue.kind) {
    case "background.set":
      return {
        backgroundAssetId: cue.assetId,
        characters: cloneStageV1(stage).characters,
        transition: cue.transition,
      };
    case "character.show": {
      let replaced = false;
      const characters = stage.characters.map(({ slot, characterId, poseAssetId }) => {
        if (slot !== cue.slot) return { slot, characterId, poseAssetId };
        replaced = true;
        return {
          slot: cue.slot,
          characterId: cue.characterId,
          poseAssetId: cue.poseAssetId,
        };
      });
      if (!replaced) {
        characters.push({
          slot: cue.slot,
          characterId: cue.characterId,
          poseAssetId: cue.poseAssetId,
        });
      }
      return {
        backgroundAssetId: stage.backgroundAssetId,
        characters,
        transition: stage.transition,
      };
    }
    case "character.hide":
      return {
        backgroundAssetId: stage.backgroundAssetId,
        characters: stage.characters
          .filter(({ slot }) => slot !== cue.slot)
          .map(({ slot, characterId, poseAssetId }) => ({ slot, characterId, poseAssetId })),
        transition: stage.transition,
      };
    case "stage.clear":
      return { backgroundAssetId: null, characters: [], transition: cue.transition };
  }
  throw new TypeError("unsupported Narrative stage cue");
}

function nextAutomaticStepV1(
  data: DeepReadonly<PocSimulationDataV1>,
  stepsUsed: NonNegativeSafeInteger,
): NonNegativeSafeInteger | null {
  if (stepsUsed >= data.balance.maxNarrativeStepsPerCommand) return null;
  return parseNonNegativeSafeInteger(stepsUsed + 1);
}

function runAutomaticNodesV1(
  data: DeepReadonly<PocSimulationDataV1>,
  initialState: DeepReadonly<NarrativeRuntimeStateV1>,
  origin: DeepReadonly<NarrativeOriginV1>,
  initialStepsUsed: NonNegativeSafeInteger,
): PocNarrativeStepResultV1 {
  let state = cloneNarrativeStateV1(initialState);
  let stepsUsed = initialStepsUsed;

  while (true) {
    const located = currentNodeV1(data, state);
    if (located === null) {
      return faultedV1("engine_invariant", "narrative.invalid_cursor");
    }
    const { scene, node } = located;

    if (node.kind === "line" || node.kind === "narration" || node.kind === "choice") {
      return settledV1(state, origin);
    }

    const nextStepsUsed = nextAutomaticStepV1(data, stepsUsed);
    if (nextStepsUsed === null) {
      return faultedV1("command_handler", "narrative.step_limit_exceeded");
    }
    stepsUsed = nextStepsUsed;
    const cursor = cloneCursorV1(state.cursor as NarrativeCursorV1);

    switch (node.kind) {
      case "condition":
        return yieldedV1(state, origin, stepsUsed, {
          kind: "condition",
          cursor,
          conditions: node.when,
        });
      case "check":
        return yieldedV1(state, origin, stepsUsed, {
          kind: "check",
          cursor,
          request: node.request,
        });
      case "command": {
        if (node.effects.length > 0) {
          return yieldedV1(state, origin, stepsUsed, {
            kind: "effects",
            cursor,
            effects: node.effects,
          });
        }
        const target = authoredCursorV1(data, scene.sceneId, node.nextNodeId);
        if (target === null) return faultedV1("engine_invariant", "story.reference_missing");
        state = stateAtCursorV1(state, target);
        break;
      }
      case "eventCheckpoint":
        return yieldedV1(state, origin, stepsUsed, {
          kind: "checkpoint",
          cursor,
          checkpointId: node.checkpointId,
        });
      case "jump": {
        const target = authoredCursorV1(data, scene.sceneId, node.targetNodeId);
        if (target === null) return faultedV1("engine_invariant", "story.reference_missing");
        state = stateAtCursorV1(state, target);
        break;
      }
      case "call": {
        if (state.callStack.length >= data.balance.maxNarrativeCallDepth) {
          return faultedV1("command_handler", "narrative.call_depth_exceeded");
        }
        if (authoredCursorV1(data, scene.sceneId, node.returnNodeId) === null) {
          return faultedV1("engine_invariant", "story.reference_missing");
        }
        const target = authoredCursorV1(data, node.sceneId, node.entryNodeId);
        if (target === null) return faultedV1("engine_invariant", "story.reference_missing");
        const cloned = cloneNarrativeStateV1(state);
        state = {
          ...cloned,
          cursor: target,
          callStack: [
            ...cloned.callStack,
            { sceneId: scene.sceneId, returnNodeId: node.returnNodeId },
          ],
        };
        break;
      }
      case "return": {
        const frame = state.callStack.at(-1);
        if (frame === undefined) {
          return faultedV1("engine_invariant", "narrative.invalid_cursor");
        }
        const target = authoredCursorV1(data, frame.sceneId, frame.returnNodeId);
        if (target === null) {
          return faultedV1("engine_invariant", "narrative.invalid_cursor");
        }
        const cloned = cloneNarrativeStateV1(state);
        state = {
          ...cloned,
          cursor: target,
          callStack: cloned.callStack.slice(0, -1),
        };
        break;
      }
      case "stageCue": {
        const target = authoredCursorV1(data, scene.sceneId, node.nextNodeId);
        if (target === null) return faultedV1("engine_invariant", "story.reference_missing");
        const cloned = cloneNarrativeStateV1(state);
        state = {
          ...cloned,
          cursor: target,
          stage: applyStageCueV1(cloned.stage, node.cue),
        };
        break;
      }
      case "end": {
        const cloned = cloneNarrativeStateV1(state);
        state = {
          ...cloned,
          status: "completed",
          cursor: null,
          callStack: [],
        };
        return settledV1(state, origin);
      }
    }
  }
}

function plainExactObjectV1(
  value: unknown,
  expectedKeys: readonly string[],
): PlainDataRecordV1 | null {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return null;
  }
  const keys = Reflect.ownKeys(value);
  const expected = new Set(expectedKeys);
  if (
    keys.length !== expected.size ||
    keys.some((key) => typeof key !== "string" || !expected.has(key))
  ) {
    return null;
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
      return null;
    }
  }
  return value as PlainDataRecordV1;
}

function plainExactArrayV1(value: unknown): value is readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return false;
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined ||
    !("value" in lengthDescriptor) ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    lengthDescriptor.enumerable !== false
  ) {
    return false;
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
    return false;
  }
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      return false;
    }
  }
  return true;
}

function strictJsonDataV1(value: unknown, active = new WeakSet<object>()): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value) && !Object.is(value, -0);
  if (typeof value !== "object") return false;
  if (active.has(value)) return false;

  active.add(value);
  try {
    if (Array.isArray(value)) {
      if (!plainExactArrayV1(value)) return false;
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (lengthDescriptor === undefined || !("value" in lengthDescriptor)) return false;
      for (let index = 0; index < lengthDescriptor.value; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (
          descriptor === undefined ||
          !("value" in descriptor) ||
          !strictJsonDataV1(descriptor.value, active)
        ) {
          return false;
        }
      }
      return true;
    }

    if (Object.getPrototypeOf(value) !== Object.prototype) return false;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string")) return false;
    for (const key of keys) {
      if (
        typeof key !== "string" ||
        key === "__proto__" ||
        key === "prototype" ||
        key === "constructor"
      ) {
        return false;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true ||
        !strictJsonDataV1(descriptor.value, active)
      ) {
        return false;
      }
    }
    return true;
  } finally {
    active.delete(value);
  }
}

function strictCursorV1(value: unknown): boolean {
  const cursor = plainExactObjectV1(value, ["sceneId", "nodeId"]);
  return cursor !== null && typeof cursor.sceneId === "string" && typeof cursor.nodeId === "string";
}

function strictSourceV1(value: unknown): boolean {
  const candidate = plainExactObjectV1(value, ["kind"]);
  if (candidate !== null && candidate.kind === "manifest_start") return true;
  if (value === null || typeof value !== "object") return false;
  const kind = Object.getOwnPropertyDescriptor(value, "kind")?.value;
  const key =
    kind === "event"
      ? "eventId"
      : kind === "story_action" || kind === "world_action"
        ? "actionId"
        : kind === "debug_fixture"
          ? "fixtureId"
          : null;
  if (key === null) return false;
  const source = plainExactObjectV1(value, ["kind", key]);
  return source !== null && typeof source[key] === "string";
}

function strictStageV1(value: unknown): boolean {
  const stage = plainExactObjectV1(value, ["backgroundAssetId", "characters", "transition"]);
  if (
    stage === null ||
    (stage.backgroundAssetId !== null && typeof stage.backgroundAssetId !== "string") ||
    (stage.transition !== "cut" && stage.transition !== "fade") ||
    !plainExactArrayV1(stage.characters)
  ) {
    return false;
  }
  const slots = new Set<string>();
  for (const entry of stage.characters) {
    const character = plainExactObjectV1(entry, ["slot", "characterId", "poseAssetId"]);
    if (
      character === null ||
      (character.slot !== "left" && character.slot !== "center" && character.slot !== "right") ||
      typeof character.characterId !== "string" ||
      typeof character.poseAssetId !== "string" ||
      slots.has(character.slot)
    ) {
      return false;
    }
    slots.add(character.slot);
  }
  return true;
}

function strictNarrativeStateV1(value: unknown): boolean {
  if (!strictJsonDataV1(value)) return false;
  const state = plainExactObjectV1(value, ["status", "source", "cursor", "callStack", "stage"]);
  if (
    state === null ||
    !plainExactArrayV1(state.callStack) ||
    !strictStageV1(state.stage) ||
    (state.status !== "idle" && state.status !== "active" && state.status !== "completed")
  ) {
    return false;
  }
  if (
    !state.callStack.every((frame) => {
      const parsed = plainExactObjectV1(frame, ["sceneId", "returnNodeId"]);
      return (
        parsed !== null &&
        typeof parsed.sceneId === "string" &&
        typeof parsed.returnNodeId === "string"
      );
    })
  ) {
    return false;
  }
  if (state.status === "idle") {
    return state.source === null && state.cursor === null && state.callStack.length === 0;
  }
  if (!strictSourceV1(state.source)) return false;
  if (state.status === "active") return strictCursorV1(state.cursor);
  return state.cursor === null && state.callStack.length === 0;
}

function strictOriginV1(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  const kind = Object.getOwnPropertyDescriptor(value, "kind")?.value;
  if (kind === "advance") {
    const origin = plainExactObjectV1(value, ["kind", "from"]);
    return origin !== null && strictCursorV1(origin.from);
  }
  if (kind === "choose") {
    const origin = plainExactObjectV1(value, ["kind", "cursor", "choiceId"]);
    return origin !== null && strictCursorV1(origin.cursor) && typeof origin.choiceId === "string";
  }
  if (kind === "start") {
    const origin = plainExactObjectV1(value, ["kind", "request"]);
    const request = plainExactObjectV1(origin?.request, ["source", "sceneId"]);
    return (
      request !== null && strictSourceV1(request.source) && typeof request.sceneId === "string"
    );
  }
  return false;
}

function strictPendingRequestV1(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  const kind = Object.getOwnPropertyDescriptor(value, "kind")?.value;
  const keysByKind = {
    condition: ["kind", "cursor", "conditions"],
    check: ["kind", "cursor", "request"],
    choice: ["kind", "cursor", "choice"],
    effects: ["kind", "cursor", "effects"],
    checkpoint: ["kind", "cursor", "checkpointId"],
  } as const;
  if (typeof kind !== "string" || !(kind in keysByKind)) return false;
  const request = plainExactObjectV1(value, keysByKind[kind as keyof typeof keysByKind]);
  if (request === null || !strictCursorV1(request.cursor)) return false;
  if (kind === "condition") return plainExactArrayV1(request.conditions);
  if (kind === "effects") return plainExactArrayV1(request.effects);
  if (kind === "checkpoint") return typeof request.checkpointId === "string";
  return request[kind === "check" ? "request" : "choice"] !== null;
}

function strictContinuationV1(value: unknown): boolean {
  if (!strictJsonDataV1(value)) return false;
  const continuation = plainExactObjectV1(value, [
    "origin",
    "transientState",
    "automaticStepsUsed",
    "pending",
  ]);
  return (
    continuation !== null &&
    strictOriginV1(continuation.origin) &&
    strictNarrativeStateV1(continuation.transientState) &&
    typeof continuation.automaticStepsUsed === "number" &&
    Number.isSafeInteger(continuation.automaticStepsUsed) &&
    continuation.automaticStepsUsed >= 0 &&
    !Object.is(continuation.automaticStepsUsed, -0) &&
    strictPendingRequestV1(continuation.pending)
  );
}

function strictCheckDecisionV1(value: unknown): boolean {
  const decision = plainExactObjectV1(value, ["checkId", "actorId", "bandId"]);
  return (
    decision !== null &&
    typeof decision.checkId === "string" &&
    typeof decision.actorId === "string" &&
    typeof decision.bandId === "string"
  );
}

function strictResolutionV1(value: unknown): boolean {
  if (!strictJsonDataV1(value)) return false;
  if (value === null || typeof value !== "object") return false;
  const kind = Object.getOwnPropertyDescriptor(value, "kind")?.value;
  if (kind === "condition") {
    const resolution = plainExactObjectV1(value, ["kind", "cursor", "passed"]);
    return (
      resolution !== null &&
      strictCursorV1(resolution.cursor) &&
      typeof resolution.passed === "boolean"
    );
  }
  if (kind === "check") {
    const resolution = plainExactObjectV1(value, ["kind", "cursor", "decision"]);
    return (
      resolution !== null &&
      strictCursorV1(resolution.cursor) &&
      strictCheckDecisionV1(resolution.decision)
    );
  }
  if (kind === "choice") {
    const resolution = plainExactObjectV1(value, [
      "kind",
      "cursor",
      "choiceId",
      "visible",
      "enabled",
      "checkDecision",
    ]);
    return (
      resolution !== null &&
      strictCursorV1(resolution.cursor) &&
      typeof resolution.choiceId === "string" &&
      resolution.visible === true &&
      resolution.enabled === true &&
      (resolution.checkDecision === null || strictCheckDecisionV1(resolution.checkDecision))
    );
  }
  if (kind === "effects_applied" || kind === "checkpoint_applied") {
    const resolution = plainExactObjectV1(value, ["kind", "cursor"]);
    return resolution !== null && strictCursorV1(resolution.cursor);
  }
  return false;
}

function requestMatchesNodeV1(
  request: DeepReadonly<PocNarrativeInterpreterRequestV1>,
  node: DeepReadonly<NarrativeNodeV1>,
): boolean {
  switch (request.kind) {
    case "condition":
      return node.kind === "condition" && canonicalValuesEqualV1(request.conditions, node.when);
    case "check":
      return node.kind === "check" && canonicalValuesEqualV1(request.request, node.request);
    case "effects":
      return node.kind === "command" && canonicalValuesEqualV1(request.effects, node.effects);
    case "checkpoint":
      return node.kind === "eventCheckpoint" && request.checkpointId === node.checkpointId;
    case "choice":
      return (
        node.kind === "choice" &&
        node.choices.some(
          (choice) =>
            choice.choiceId === request.choice.choiceId &&
            canonicalValuesEqualV1(request.choice, choice),
        )
      );
  }
  throw new TypeError("unsupported Narrative interpreter request");
}

function resumeMismatchV1(
  continuation: DeepReadonly<PocNarrativeContinuationV1>,
  actual: DeepReadonly<NarrativeCursorV1> | null,
): PocNarrativeStepResultV1 {
  return cursorMismatchV1(continuation.pending.cursor, actual);
}

function resumeV1(
  data: DeepReadonly<PocSimulationDataV1>,
  state: DeepReadonly<NarrativeRuntimeStateV1>,
  continuation: DeepReadonly<PocNarrativeContinuationV1>,
  resolution: DeepReadonly<PocNarrativeResolutionV1>,
): PocNarrativeStepResultV1 {
  if (!strictContinuationV1(continuation) || !strictResolutionV1(resolution)) {
    return faultedV1("engine_invariant", "narrative.invalid_cursor");
  }
  if (continuation.automaticStepsUsed > data.balance.maxNarrativeStepsPerCommand) {
    return faultedV1("command_handler", "narrative.step_limit_exceeded");
  }
  if (!canonicalValuesEqualV1(state, continuation.transientState)) {
    return faultedV1("engine_invariant", "narrative.invalid_cursor");
  }
  const originFaultCode = narrativeOriginFaultCodeV1(data, state, continuation.origin);
  if (originFaultCode !== null) {
    return faultedV1("engine_invariant", originFaultCode);
  }
  if (
    state.status !== "active" ||
    state.cursor === null ||
    !cursorEqualsV1(state.cursor, continuation.pending.cursor) ||
    !cursorEqualsV1(resolution.cursor, continuation.pending.cursor)
  ) {
    return resumeMismatchV1(continuation, state.cursor);
  }
  const located = currentNodeV1(data, state);
  if (located === null) return faultedV1("engine_invariant", "narrative.invalid_cursor");
  if (!requestMatchesNodeV1(continuation.pending, located.node)) {
    return resumeMismatchV1(continuation, resolution.cursor);
  }

  let nextNodeId: NarrativeCursorV1["nodeId"] | null = null;
  const pending = continuation.pending;
  switch (pending.kind) {
    case "condition":
      if (resolution.kind !== "condition" || located.node.kind !== "condition") {
        return resumeMismatchV1(continuation, resolution.cursor);
      }
      nextNodeId = resolution.passed ? located.node.passNodeId : located.node.failNodeId;
      break;
    case "check":
      if (
        resolution.kind !== "check" ||
        located.node.kind !== "check" ||
        resolution.decision.checkId !== pending.request.checkId ||
        resolution.decision.actorId !== pending.request.actorId
      ) {
        return resumeMismatchV1(continuation, resolution.cursor);
      }
      nextNodeId =
        located.node.branches.find(({ bandId }) => bandId === resolution.decision.bandId)
          ?.nextNodeId ?? null;
      if (nextNodeId === null) return resumeMismatchV1(continuation, resolution.cursor);
      break;
    case "choice": {
      if (
        resolution.kind !== "choice" ||
        located.node.kind !== "choice" ||
        resolution.choiceId !== pending.choice.choiceId
      ) {
        return resumeMismatchV1(continuation, resolution.cursor);
      }
      const check = pending.choice.check;
      const checkDecision = resolution.checkDecision;
      if (
        (check === undefined && checkDecision !== null) ||
        (check !== undefined &&
          (checkDecision === null ||
            checkDecision.checkId !== check.checkId ||
            checkDecision.actorId !== check.actorId ||
            !data.content.checks.some(
              (definition) =>
                definition.checkId === check.checkId &&
                definition.bands.some(({ bandId }) => bandId === checkDecision.bandId),
            )))
      ) {
        return resumeMismatchV1(continuation, resolution.cursor);
      }
      nextNodeId = pending.choice.nextNodeId;
      break;
    }
    case "effects":
      if (resolution.kind !== "effects_applied" || located.node.kind !== "command") {
        return resumeMismatchV1(continuation, resolution.cursor);
      }
      nextNodeId = located.node.nextNodeId;
      break;
    case "checkpoint":
      if (resolution.kind !== "checkpoint_applied" || located.node.kind !== "eventCheckpoint") {
        return resumeMismatchV1(continuation, resolution.cursor);
      }
      nextNodeId = located.node.nextNodeId;
      break;
  }

  const target = authoredCursorV1(data, located.scene.sceneId, nextNodeId);
  if (target === null) return faultedV1("engine_invariant", "story.reference_missing");
  return runAutomaticNodesV1(
    data,
    stateAtCursorV1(state, target),
    continuation.origin,
    continuation.automaticStepsUsed,
  );
}

export function interpretPocNarrativeStepV1(
  data: DeepReadonly<PocSimulationDataV1>,
  state: DeepReadonly<NarrativeRuntimeStateV1>,
  input: DeepReadonly<PocNarrativeInterpreterInputV1>,
): PocNarrativeStepResultV1 {
  if (!strictNarrativeStateV1(state)) {
    return faultedV1("engine_invariant", "narrative.invalid_cursor");
  }

  switch (input.kind) {
    case "start": {
      if (state.status === "active" || state.cursor !== null || state.callStack.length !== 0) {
        return faultedV1("engine_invariant", "narrative.invalid_cursor");
      }
      const scene = sceneByIdV1(data, input.request.sceneId);
      if (scene === undefined) return faultedV1("engine_invariant", "story.reference_missing");
      const cursor = authoredCursorV1(data, scene.sceneId, scene.entryNodeId);
      if (cursor === null) return faultedV1("engine_invariant", "story.reference_missing");
      const active: NarrativeRuntimeStateV1 = {
        status: "active",
        source: cloneSourceV1(input.request.source),
        cursor,
        callStack: [],
        stage: cloneStageV1(state.stage),
      };
      return runAutomaticNodesV1(
        data,
        active,
        {
          kind: "start",
          request: {
            source: cloneSourceV1(input.request.source),
            sceneId: input.request.sceneId,
          },
        },
        parseNonNegativeSafeInteger(0),
      );
    }
    case "advance": {
      if (state.status !== "active" || state.cursor === null) {
        return inactiveV1("narrative.advance");
      }
      if (!cursorEqualsV1(input.cursor, state.cursor)) {
        return cursorMismatchV1(state.cursor, input.cursor);
      }
      const located = currentNodeV1(data, state);
      if (located === null) return faultedV1("engine_invariant", "narrative.invalid_cursor");
      if (located.node.kind === "choice") {
        return rejectedV1({
          code: "narrative.choice_required",
          details: { cursor: cloneCursorV1(state.cursor) },
        });
      }
      if (located.node.kind !== "line" && located.node.kind !== "narration") {
        return faultedV1("engine_invariant", "narrative.invalid_cursor");
      }
      const target = authoredCursorV1(data, located.scene.sceneId, located.node.nextNodeId);
      if (target === null) return faultedV1("engine_invariant", "story.reference_missing");
      return runAutomaticNodesV1(
        data,
        stateAtCursorV1(state, target),
        { kind: "advance", from: cloneCursorV1(input.cursor) },
        parseNonNegativeSafeInteger(0),
      );
    }
    case "choose": {
      if (state.status !== "active" || state.cursor === null) {
        return inactiveV1("narrative.choose");
      }
      if (!cursorEqualsV1(input.cursor, state.cursor)) {
        return cursorMismatchV1(state.cursor, input.cursor);
      }
      const located = currentNodeV1(data, state);
      if (located === null) return faultedV1("engine_invariant", "narrative.invalid_cursor");
      if (located.node.kind !== "choice") {
        return unknownChoiceReferenceV1(input.cursor, input.choiceId);
      }
      const choice = located.node.choices.find(({ choiceId }) => choiceId === input.choiceId);
      if (choice === undefined) return unknownChoiceReferenceV1(input.cursor, input.choiceId);
      return yieldedV1(
        state,
        {
          kind: "choose",
          cursor: cloneCursorV1(input.cursor),
          choiceId: input.choiceId,
        },
        parseNonNegativeSafeInteger(0),
        {
          kind: "choice",
          cursor: cloneCursorV1(input.cursor),
          choice,
        },
      );
    }
    case "resume":
      return resumeV1(data, state, input.continuation, input.resolution);
  }
  throw new TypeError("unsupported Narrative interpreter input");
}
