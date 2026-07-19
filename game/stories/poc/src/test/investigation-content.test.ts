// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { createTransactionalRngV1, parseNonZeroUint32, parseRunId } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import { pocActionDefinitionsV1 } from "../content/actions.js";
import { pocCheckDefinitionsV1, pocWorldActionDefinitionsV1 } from "../content/checks-endings.js";
import { customerSegmentIdsV1 } from "../content/ids.js";
import { pocInvestigationNarrativeV1 } from "../content/narrative/investigation.js";
import {
  createPocCheckResolverV1,
  deepFreezePocValueV1,
  parseAttributeBonus,
  parsePositiveSafeInteger,
  parseSafeInteger,
  pocEffectIntentSchemaV1,
  pocNarrativeProgramSchemaV1,
  type CheckDefinitionV1,
  type CheckInputV1,
  type DeepReadonly,
  type NarrativeNodeV1,
  type NarrativeSceneV1,
  type PocSimulationDataV1,
} from "../gameplay/index.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

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
      for (const targetId of narrativeNodeSuccessorsV1(node)) {
        if (!nodesById.has(targetId)) {
          errors.push(`${scene.sceneId}/${node.nodeId}: missing target ${targetId}`);
        }
      }
      if (!reachable.has(node.nodeId)) errors.push(`${scene.sceneId}: unreachable ${node.nodeId}`);
    }
  }
  return errors;
}

function effectlessInvestigationCheckV1(): DeepReadonly<CheckDefinitionV1> {
  const definition = pocCheckDefinitionsV1[0];
  if (definition === undefined) throw new TypeError("missing investigation Check definition");
  return deepFreezePocValueV1({
    ...definition,
    bands: definition.bands.map((band) => ({ ...band, effects: [] })),
  });
}

function resolveReferenceInvestigationCheckV1(preparationBonus: number) {
  const fixture = createPocGameplayFixtureV1();
  const definition = effectlessInvestigationCheckV1();
  const data: DeepReadonly<PocSimulationDataV1> = deepFreezePocValueV1({
    ...fixture.program.data,
    content: {
      ...fixture.program.data.content,
      checks: [...fixture.program.data.content.checks, definition],
    },
  });
  const resolver = createPocCheckResolverV1(data);
  const rng = createTransactionalRngV1(parseNonZeroUint32(0x0002_3049));
  const runId = parseRunId("00000000-0000-4000-8000-000000000103");
  for (let day = 1; day <= 6; day += 1) {
    for (const segmentId of customerSegmentIdsV1) {
      expect(
        rng.nextInt({
          exclusiveMax: parsePositiveSafeInteger(3),
          purpose: `demand:${runId}:${day}:${segmentId}`,
        }),
      ).toBe(1);
    }
  }
  const input: DeepReadonly<CheckInputV1> = deepFreezePocValueV1({
    checkId: definition.checkId,
    actorId: "actor.player",
    attribute: definition.attribute,
    rank: "B",
    attributeBonus: parseAttributeBonus(1),
    preparationBonus: parseSafeInteger(preparationBonus),
    modifiers: [],
    bands: definition.bands,
  });
  const result = resolver.resolve(input, rng);
  expect(rng.attemptedDraws()).toHaveLength(14);
  return result;
}

describe("PoC investigation WorldAction", () => {
  it("authors the sole two-stage WorldAction and its options", () => {
    expect(pocWorldActionDefinitionsV1).toEqual([
      {
        actionId: "action.old_trade_road",
        nameTextId: "text.poc.action.old_trade_road.label",
        availability: [],
        reasonId: "reason.investigation.begin",
        baseCashCost: 4,
        playerStaminaCost: 3,
        beginEffects: [
          {
            kind: "outcome.set",
            outcomeId: "outcome.relationship_opportunity",
            value: { kind: "token", value: "relationship.abandoned" },
            reasonId: "reason.investigation.begin",
          },
        ],
        options: [
          {
            optionId: "choice.old_trade_road.basic",
            labelTextId: "text.poc.choice.old_trade_road.basic.label",
            availability: [],
            additionalCashCost: 0,
            preparationBonus: 0,
            beginEffects: [],
            confirmation: {
              benefitTextIds: [],
              mutuallyExcludedActionIds: [],
              majorRiskTextIds: [],
            },
          },
          {
            optionId: "choice.old_trade_road.prepared",
            labelTextId: "text.poc.choice.old_trade_road.prepared.label",
            availability: [],
            additionalCashCost: 4,
            preparationBonus: 1,
            beginEffects: [],
            confirmation: {
              benefitTextIds: ["text.poc.confirmation.benefit.old_trade_road_prepared"],
              mutuallyExcludedActionIds: [],
              majorRiskTextIds: ["text.poc.confirmation.risk.old_trade_road_prepared_cost"],
            },
          },
        ],
        steps: [
          {
            stepId: "step.old_trade_road.departure",
            phase: "morning",
            apCost: 1,
            sceneId: "scene.old_trade_road.departure",
          },
          {
            stepId: "step.old_trade_road.investigation",
            phase: "afternoon",
            apCost: 2,
            sceneId: "scene.old_trade_road.investigation",
          },
        ],
        checkId: "check.old_trade_road",
      },
    ]);
  });

  it("retains the Task 3 Action gate and mutual exclusion instead of duplicating it", () => {
    expect(pocActionDefinitionsV1[9]).toMatchObject({
      actionId: "action.old_trade_road",
      visibility: [
        {
          conditions: [{ kind: "calendar.matches", day: 5, phases: ["morning"] }],
          reasonId: "reason.unavailable.story_window_closed",
        },
        {
          conditions: [
            {
              kind: "outcome.equals",
              outcomeId: "outcome.investigation",
              value: { kind: "token", value: "investigation.not_attempted" },
            },
          ],
          reasonId: "reason.unavailable.investigation_resolved",
        },
      ],
      availability: [
        {
          conditions: [
            {
              kind: "outcome.equals",
              outcomeId: "outcome.relationship_opportunity",
              value: { kind: "token", value: "relationship.pending" },
            },
          ],
          reasonId: "reason.unavailable.mutually_exclusive",
        },
      ],
      confirmation: {
        benefitTextIds: ["text.poc.confirmation.benefit.old_trade_road_clue"],
        mutuallyExcludedActionIds: ["action.repair_sign_with_heroine"],
        majorRiskTextIds: ["text.poc.confirmation.risk.old_trade_road_cost"],
      },
    });
  });
});

describe("PoC investigation Check", () => {
  it("authors all four bands with exact rewards, consequences, and provenance", () => {
    expect(pocCheckDefinitionsV1).toEqual([
      {
        checkId: "check.old_trade_road",
        attribute: "intellect",
        dice: "2d6",
        bands: [
          {
            bandId: "band.investigation.setback",
            minInclusive: 2,
            maxInclusive: 5,
            effects: [
              {
                kind: "inventory.grant",
                lines: [{ ingredientId: "ingredient.herb", quantity: 1 }],
                source: { kind: "world_action", actionId: "action.old_trade_road" },
                reasonId: "reason.investigation.setback",
              },
              {
                kind: "aura.apply",
                auraId: "player.adventure_strain",
                target: { kind: "actor", actorId: "actor.player" },
                source: { kind: "world_action", actionId: "action.old_trade_road" },
                duration: { kind: "countdown", unit: "night_recovery", remaining: 1 },
                reasonId: "reason.investigation.setback",
              },
              {
                kind: "outcome.set",
                outcomeId: "outcome.investigation",
                value: { kind: "token", value: "investigation.setback" },
                reasonId: "reason.investigation.setback",
              },
            ],
          },
          {
            bandId: "band.investigation.success-with-cost",
            minInclusive: 6,
            maxInclusive: 8,
            effects: [
              {
                kind: "inventory.grant",
                lines: [
                  { ingredientId: "ingredient.fresh_meat", quantity: 1 },
                  { ingredientId: "ingredient.herb", quantity: 2 },
                ],
                source: { kind: "world_action", actionId: "action.old_trade_road" },
                reasonId: "reason.investigation.success_with_cost",
              },
              {
                kind: "outcome.set",
                outcomeId: "outcome.investigation",
                value: { kind: "token", value: "investigation.success_with_cost" },
                reasonId: "reason.investigation.success_with_cost",
              },
            ],
          },
          {
            bandId: "band.investigation.complete",
            minInclusive: 9,
            maxInclusive: 11,
            effects: [
              {
                kind: "inventory.grant",
                lines: [
                  { ingredientId: "ingredient.fresh_meat", quantity: 2 },
                  { ingredientId: "ingredient.herb", quantity: 3 },
                ],
                source: { kind: "world_action", actionId: "action.old_trade_road" },
                reasonId: "reason.investigation.complete",
              },
              {
                kind: "fact.set",
                factId: "fact.war_clue",
                value: { kind: "boolean", value: true },
                reasonId: "reason.investigation.complete",
              },
              {
                kind: "outcome.set",
                outcomeId: "outcome.investigation",
                value: { kind: "token", value: "investigation.complete" },
                reasonId: "reason.investigation.complete",
              },
            ],
          },
          {
            bandId: "band.investigation.exceptional",
            minInclusive: 12,
            maxInclusive: null,
            effects: [
              {
                kind: "inventory.grant",
                lines: [
                  { ingredientId: "ingredient.fresh_meat", quantity: 3 },
                  { ingredientId: "ingredient.herb", quantity: 4 },
                ],
                source: { kind: "world_action", actionId: "action.old_trade_road" },
                reasonId: "reason.investigation.exceptional",
              },
              {
                kind: "fact.set",
                factId: "fact.war_clue",
                value: { kind: "boolean", value: true },
                reasonId: "reason.investigation.exceptional",
              },
              {
                kind: "reputation.adjust",
                delta: 1,
                reasonId: "reason.investigation.exceptional",
              },
              {
                kind: "outcome.set",
                outcomeId: "outcome.investigation",
                value: { kind: "token", value: "investigation.exceptional" },
                reasonId: "reason.investigation.exceptional",
              },
            ],
          },
        ],
      },
    ]);
    for (const definition of pocCheckDefinitionsV1) {
      for (const band of definition.bands) {
        expect(band.effects.map((effect) => pocEffectIntentSchemaV1.parse(effect))).toEqual(
          band.effects,
        );
      }
    }
  });

  it("keeps the reference basic and prepared totals at 8 and 9 after demand draws", () => {
    const basic = resolveReferenceInvestigationCheckV1(0);
    const prepared = resolveReferenceInvestigationCheckV1(1);
    expect(basic).toMatchObject({
      dice: [4, 3],
      attributeBonus: 1,
      preparationBonus: 0,
      totalBonus: 1,
      total: 8,
      bandId: "band.investigation.success-with-cost",
      effects: [],
    });
    expect(prepared).toMatchObject({
      dice: [4, 3],
      attributeBonus: 1,
      preparationBonus: 1,
      totalBonus: 2,
      total: 9,
      bandId: "band.investigation.complete",
      effects: [],
    });
  });
});

describe("PoC investigation Narrative", () => {
  it("uses exactly the two Workflow-owned presentation scenes", () => {
    expect(pocInvestigationNarrativeV1).toEqual([
      {
        sceneId: "scene.old_trade_road.departure",
        entryNodeId: "node.old_trade_road.departure.line",
        nodes: [
          {
            kind: "narration",
            nodeId: "node.old_trade_road.departure.line",
            textId: "text.poc.narrative.old_trade_road.departure.line",
            nextNodeId: "node.old_trade_road.departure.end",
          },
          { kind: "end", nodeId: "node.old_trade_road.departure.end" },
        ],
      },
      {
        sceneId: "scene.old_trade_road.investigation",
        entryNodeId: "node.old_trade_road.investigation.line",
        nodes: [
          {
            kind: "narration",
            nodeId: "node.old_trade_road.investigation.line",
            textId: "text.poc.narrative.old_trade_road.investigation.line",
            nextNodeId: "node.old_trade_road.investigation.end",
          },
          { kind: "end", nodeId: "node.old_trade_road.investigation.end" },
        ],
      },
    ]);
  });

  it("is strict, reachable, and recursively frozen", () => {
    expect(pocNarrativeProgramSchemaV1.parse({ scenes: pocInvestigationNarrativeV1 })).toEqual({
      scenes: pocInvestigationNarrativeV1,
    });
    expect(validateNarrativeReachabilityV1(pocInvestigationNarrativeV1)).toEqual([]);
    expectDeeplyFrozenV1(pocInvestigationNarrativeV1);
    expectDeeplyFrozenV1(pocWorldActionDefinitionsV1);
    expectDeeplyFrozenV1(pocCheckDefinitionsV1);
  });
});
