// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { describe, expect, it } from "vitest";

import { pocActionDefinitionsV1 } from "../content/actions.js";
import {
  pocRelationshipNarrativeV1,
  pocRelationshipStoryActionDefinitionsV1,
} from "../content/narrative/relationship.js";
import {
  pocEffectIntentSchemaV1,
  pocNarrativeProgramSchemaV1,
  type NarrativeNodeV1,
  type NarrativeSceneV1,
} from "../gameplay/index.js";

function expectDeeplyFrozenV1(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeeplyFrozenV1(nested, seen);
}

function narrativeNodeSuccessorsV1(node: NarrativeNodeV1): readonly string[] {
  switch (node.kind) {
    case "line":
    case "narration":
    case "command":
    case "eventCheckpoint":
    case "stageCue":
      return [node.nextNodeId];
    case "choice":
      return node.choices.map(({ nextNodeId }) => nextNodeId);
    case "condition":
      return [node.passNodeId, node.failNodeId];
    case "check":
      return node.branches.map(({ nextNodeId }) => nextNodeId);
    case "jump":
      return [node.targetNodeId];
    case "call":
      return [node.returnNodeId];
    case "return":
    case "end":
      return [];
  }
  return [];
}

function validateNarrativeReachabilityV1(scenes: readonly NarrativeSceneV1[]): readonly string[] {
  const errors: string[] = [];

  for (const scene of scenes) {
    const nodesById = new Map<string, NarrativeNodeV1>(
      scene.nodes.map((node) => [node.nodeId, node]),
    );
    if (nodesById.size !== scene.nodes.length) errors.push(`${scene.sceneId}: duplicate NodeId`);
    if (!nodesById.has(scene.entryNodeId)) errors.push(`${scene.sceneId}: missing entry node`);

    for (const node of scene.nodes) {
      for (const targetId of narrativeNodeSuccessorsV1(node)) {
        if (!nodesById.has(targetId)) {
          errors.push(`${scene.sceneId}/${node.nodeId}: missing target ${targetId}`);
        }
      }
    }

    const reachable = new Set<string>();
    const pending: string[] = [scene.entryNodeId];
    while (pending.length > 0) {
      const nodeId = pending.pop();
      if (nodeId === undefined || reachable.has(nodeId)) continue;
      reachable.add(nodeId);
      const node = nodesById.get(nodeId);
      if (node !== undefined) pending.push(...narrativeNodeSuccessorsV1(node));
    }
    for (const node of scene.nodes) {
      if (!reachable.has(node.nodeId)) errors.push(`${scene.sceneId}: unreachable ${node.nodeId}`);
    }
  }

  return errors;
}

describe("PoC relationship StoryActions", () => {
  it("authors repair and apology as the exact start transactions", () => {
    expect(pocRelationshipStoryActionDefinitionsV1).toEqual([
      {
        actionId: "action.repair_sign_with_heroine",
        sceneId: "scene.repair_sign_with_heroine",
        startEffects: [],
      },
      {
        actionId: "action.apologize_to_heroine",
        sceneId: "scene.apologize_to_heroine",
        startEffects: [
          {
            kind: "calendar.ap.adjust",
            delta: -1,
            reasonId: "reason.relationship.apology",
          },
          {
            kind: "relationship.affection.adjust",
            delta: 1,
            reasonId: "reason.relationship.apology",
          },
          {
            kind: "aura.clear",
            auraId: "heroine.angry",
            target: { kind: "actor", actorId: "actor.heroine" },
            reasonId: "reason.relationship.apology",
          },
          {
            kind: "outcome.set",
            outcomeId: "outcome.relationship_opportunity",
            value: { kind: "token", value: "relationship.reconciled" },
            reasonId: "reason.relationship.apology",
          },
        ],
      },
    ]);
    expect(
      pocRelationshipStoryActionDefinitionsV1[1]?.startEffects.map(({ kind }) => kind),
    ).not.toContain("relationship.stage.set");
    expect(
      pocRelationshipStoryActionDefinitionsV1[1]?.startEffects.map(({ kind }) => kind),
    ).not.toContain("actor.mood.adjust");
    for (const action of pocRelationshipStoryActionDefinitionsV1) {
      expect(action.startEffects.map((effect) => pocEffectIntentSchemaV1.parse(effect))).toEqual(
        action.startEffects,
      );
    }
  });

  it("retains the Task 3 lifecycle gates instead of defining a second start condition", () => {
    expect(pocActionDefinitionsV1[8]).toMatchObject({
      actionId: "action.repair_sign_with_heroine",
      visibility: [
        {
          conditions: [{ kind: "calendar.matches", day: 5, phases: ["afternoon"] }],
          reasonId: "reason.unavailable.story_window_closed",
        },
        {
          conditions: [
            {
              kind: "outcome.equals",
              outcomeId: "outcome.relationship_opportunity",
              value: { kind: "token", value: "relationship.pending" },
            },
          ],
          reasonId: "reason.unavailable.relationship_resolved",
        },
      ],
      availability: [
        {
          conditions: [
            {
              kind: "outcome.equals",
              outcomeId: "outcome.investigation",
              value: { kind: "token", value: "investigation.not_attempted" },
            },
          ],
          reasonId: "reason.unavailable.mutually_exclusive",
        },
      ],
    });
    expect(pocActionDefinitionsV1[10]).toMatchObject({
      actionId: "action.apologize_to_heroine",
      visibility: [
        {
          conditions: [{ kind: "calendar.matches", day: 6, phases: ["morning", "afternoon"] }],
          reasonId: "reason.unavailable.story_window_closed",
        },
        {
          conditions: [
            {
              kind: "aura.present",
              auraId: "heroine.angry",
              target: { kind: "actor", actorId: "actor.heroine" },
            },
          ],
          reasonId: "reason.unavailable.heroine_not_angry",
        },
      ],
    });
  });
});

describe("PoC relationship Narrative", () => {
  it("encodes the complete repair branch with exact effect order and provenance", () => {
    expect(pocRelationshipNarrativeV1[0]).toEqual({
      sceneId: "scene.repair_sign_with_heroine",
      entryNodeId: "node.repair_sign.intro",
      nodes: [
        {
          kind: "narration",
          nodeId: "node.repair_sign.intro",
          textId: "text.poc.narrative.repair_sign.intro",
          nextNodeId: "node.repair_sign.choice",
        },
        {
          kind: "choice",
          nodeId: "node.repair_sign.choice",
          choices: [
            {
              choiceId: "choice.repair_sign.cooperate",
              textId: "text.poc.choice.repair_sign.cooperate.label",
              showWhen: [],
              enableWhen: [],
              confirmation: {
                benefitTextIds: ["text.poc.confirmation.benefit.repair_sign_relationship"],
                mutuallyExcludedActionIds: ["action.old_trade_road"],
                majorRiskTextIds: [],
              },
              effects: [
                {
                  kind: "calendar.ap.adjust",
                  delta: -2,
                  reasonId: "reason.relationship.repair_sign",
                },
                {
                  kind: "actor.stamina.adjust",
                  actorId: "actor.player",
                  delta: -1,
                  reasonId: "reason.relationship.repair_sign",
                },
                {
                  kind: "actor.stamina.adjust",
                  actorId: "actor.heroine",
                  delta: -1,
                  reasonId: "reason.relationship.repair_sign",
                },
                {
                  kind: "relationship.affection.adjust",
                  delta: 3,
                  reasonId: "reason.relationship.repair_sign",
                },
                {
                  kind: "actor.mood.adjust",
                  actorId: "actor.heroine",
                  delta: 1,
                  reasonId: "reason.relationship.repair_sign",
                },
                {
                  kind: "aura.apply",
                  auraId: "tavern.sign_repaired",
                  target: { kind: "tavern" },
                  source: {
                    kind: "story_action",
                    actionId: "action.repair_sign_with_heroine",
                  },
                  duration: { kind: "countdown", unit: "opening", remaining: 1 },
                  reasonId: "reason.relationship.repair_sign",
                },
                {
                  kind: "outcome.set",
                  outcomeId: "outcome.relationship_opportunity",
                  value: { kind: "token", value: "relationship.completed" },
                  reasonId: "reason.relationship.repair_sign",
                },
                {
                  kind: "outcome.set",
                  outcomeId: "outcome.investigation",
                  value: { kind: "token", value: "investigation.missed_by_choice" },
                  reasonId: "reason.relationship.repair_sign",
                },
              ],
              nextNodeId: "node.repair_sign.end",
            },
            {
              choiceId: "choice.repair_sign.decline",
              textId: "text.poc.choice.repair_sign.decline.label",
              showWhen: [],
              enableWhen: [],
              confirmation: {
                benefitTextIds: [],
                mutuallyExcludedActionIds: ["action.old_trade_road"],
                majorRiskTextIds: [],
              },
              effects: [
                {
                  kind: "outcome.set",
                  outcomeId: "outcome.relationship_opportunity",
                  value: { kind: "token", value: "relationship.abandoned" },
                  reasonId: "reason.relationship.repair_sign_declined",
                },
                {
                  kind: "outcome.set",
                  outcomeId: "outcome.investigation",
                  value: { kind: "token", value: "investigation.missed_by_choice" },
                  reasonId: "reason.relationship.repair_sign_declined",
                },
              ],
              nextNodeId: "node.repair_sign.end",
            },
            {
              choiceId: "choice.repair_sign.conflict",
              textId: "text.poc.choice.repair_sign.conflict.label",
              showWhen: [],
              enableWhen: [],
              confirmation: {
                benefitTextIds: [],
                mutuallyExcludedActionIds: ["action.old_trade_road"],
                majorRiskTextIds: ["text.poc.confirmation.risk.repair_sign_conflict"],
              },
              effects: [
                {
                  kind: "relationship.affection.adjust",
                  delta: -1,
                  reasonId: "reason.relationship.repair_sign_conflict",
                },
                {
                  kind: "aura.apply",
                  auraId: "heroine.angry",
                  target: { kind: "actor", actorId: "actor.heroine" },
                  source: {
                    kind: "story_action",
                    actionId: "action.repair_sign_with_heroine",
                  },
                  duration: { kind: "countdown", unit: "day_end", remaining: 2 },
                  reasonId: "reason.relationship.repair_sign_conflict",
                },
                {
                  kind: "outcome.set",
                  outcomeId: "outcome.relationship_opportunity",
                  value: { kind: "token", value: "relationship.unresolved_conflict" },
                  reasonId: "reason.relationship.repair_sign_conflict",
                },
                {
                  kind: "outcome.set",
                  outcomeId: "outcome.investigation",
                  value: { kind: "token", value: "investigation.missed_by_choice" },
                  reasonId: "reason.relationship.repair_sign_conflict",
                },
              ],
              nextNodeId: "node.repair_sign.end",
            },
          ],
        },
        { kind: "end", nodeId: "node.repair_sign.end" },
      ],
    });
  });

  it("keeps apology presentation separate from its atomic start effects", () => {
    expect(pocRelationshipNarrativeV1[1]).toEqual({
      sceneId: "scene.apologize_to_heroine",
      entryNodeId: "node.apology.line",
      nodes: [
        {
          kind: "line",
          nodeId: "node.apology.line",
          speakerId: "character.heroine",
          textId: "text.poc.narrative.apology.line",
          nextNodeId: "node.apology.end",
        },
        { kind: "end", nodeId: "node.apology.end" },
      ],
    });
  });

  it("is strict, reachable, and recursively frozen", () => {
    expect(pocNarrativeProgramSchemaV1.parse({ scenes: pocRelationshipNarrativeV1 })).toEqual({
      scenes: pocRelationshipNarrativeV1,
    });
    expect(validateNarrativeReachabilityV1(pocRelationshipNarrativeV1)).toEqual([]);
    expectDeeplyFrozenV1(pocRelationshipNarrativeV1);
    expectDeeplyFrozenV1(pocRelationshipStoryActionDefinitionsV1);
  });
});
