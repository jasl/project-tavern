// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly } from "@sillymaker/base";

import {
  pocDebugCommandKindsV1,
  type AuraDurationV1,
  type AuraTargetV1,
  type PocDebugCommandV1,
  type StoryValueV1,
} from "../gameplay/index.js";

function unsupportedFormKindV1(_form: never): never {
  throw new TypeError("unsupported PoC DebugCommand form kind");
}

function copyAuraTargetV1(target: DeepReadonly<AuraTargetV1>): AuraTargetV1 {
  switch (target.kind) {
    case "actor":
      return Object.freeze({ kind: target.kind, actorId: target.actorId });
    case "tavern":
    case "run":
      return Object.freeze({ kind: target.kind });
  }
  return unsupportedFormKindV1(target);
}

function copyAuraDurationV1(duration: DeepReadonly<AuraDurationV1>): AuraDurationV1 {
  switch (duration.kind) {
    case "countdown":
      return Object.freeze({
        kind: duration.kind,
        unit: duration.unit,
        remaining: duration.remaining,
      });
    case "until_cleared":
      return Object.freeze({ kind: duration.kind });
  }
  return unsupportedFormKindV1(duration);
}

function copyStoryValueV1(value: DeepReadonly<StoryValueV1>): StoryValueV1 {
  switch (value.kind) {
    case "boolean":
      return Object.freeze({ kind: value.kind, value: value.value });
    case "integer":
      return Object.freeze({ kind: value.kind, value: value.value });
    case "token":
      return Object.freeze({ kind: value.kind, value: value.value });
  }
  return unsupportedFormKindV1(value);
}

/**
 * Copies one controlled form DTO into the existing PoC DebugCommand union.
 * Gameplay schema, references, current-State policy, and execution stay on GameSimulation.
 */
function toPocDebugCommandV1(form: DeepReadonly<PocDebugCommandV1>): PocDebugCommandV1 {
  switch (form.kind) {
    case "debug.calendar.set_ap":
      return Object.freeze({ kind: form.kind, value: form.value, reasonId: form.reasonId });
    case "debug.actor.set_stamina":
      return Object.freeze({
        kind: form.kind,
        actorId: form.actorId,
        value: form.value,
        reasonId: form.reasonId,
      });
    case "debug.actor.set_mood":
      return Object.freeze({
        kind: form.kind,
        actorId: form.actorId,
        value: form.value,
        reasonId: form.reasonId,
      });
    case "debug.relationship.set":
      return Object.freeze({
        kind: form.kind,
        affection: form.affection,
        teamwork: form.teamwork,
        stage: form.stage,
        reasonId: form.reasonId,
      });
    case "debug.inventory.adjust_cash":
      return Object.freeze({ kind: form.kind, delta: form.delta, reasonId: form.reasonId });
    case "debug.aura.apply":
      return Object.freeze({
        kind: form.kind,
        auraId: form.auraId,
        target: copyAuraTargetV1(form.target),
        duration: copyAuraDurationV1(form.duration),
        reasonId: form.reasonId,
      });
    case "debug.aura.clear":
      return Object.freeze({
        kind: form.kind,
        instanceId: form.instanceId,
        reasonId: form.reasonId,
      });
    case "debug.story.fact.set":
      return Object.freeze({
        kind: form.kind,
        factId: form.factId,
        value: copyStoryValueV1(form.value),
        reasonId: form.reasonId,
      });
    case "debug.narrative.jump":
      return Object.freeze({
        kind: form.kind,
        cursor: Object.freeze({
          sceneId: form.cursor.sceneId,
          nodeId: form.cursor.nodeId,
        }),
        reasonId: form.reasonId,
      });
    case "debug.rng.set":
      return Object.freeze({
        kind: form.kind,
        rng: Object.freeze({
          algorithm: form.rng.algorithm,
          cursor: form.rng.cursor,
          rawDrawCount: form.rng.rawDrawCount,
        }),
        reasonId: form.reasonId,
      });
  }
  return unsupportedFormKindV1(form);
}

export const pocDebugCommandFormAdapterV1 = Object.freeze({
  kinds: pocDebugCommandKindsV1,
  toCommand: toPocDebugCommandV1,
});
