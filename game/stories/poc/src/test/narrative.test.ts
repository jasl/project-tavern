// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { pocSimulationDataSchemaV1 } from "../gameplay/contracts/schemas.js";
import type {
  NarrativeCursorV1,
  NarrativeRuntimeStateV1,
  PocSimulationDataV1,
} from "../gameplay/contracts/types.js";
import {
  parseActorId,
  parseCheckBandId,
  parseCheckId,
  parseChoiceId,
  parseNodeId,
  parseSceneId,
} from "../gameplay/contracts/ids.js";
import { deepFreezePocValueV1, parseNonNegativeSafeInteger } from "../gameplay/contracts/values.js";
import {
  interpretPocNarrativeStepV1,
  type PocNarrativeContinuationV1,
  type PocNarrativeResolutionV1,
  type PocNarrativeStepResultV1,
} from "../gameplay/modules/narrative/interpreter.js";
import {
  assertValidPocNarrativeStateV1,
  pocNarrativeOwnerOperationSchemaV1,
  pocNarrativeStateSchemaV1,
} from "../gameplay/modules/narrative/contract.js";
import {
  createInitialPocNarrativeStateV1,
  pocNarrativeGameplayModuleV1,
  pocNarrativeOwnerV1,
} from "../gameplay/modules/narrative/module.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

const idleNarrativeStateV1: NarrativeRuntimeStateV1 = deepFreezePocValueV1({
  status: "idle",
  source: null,
  cursor: null,
  callStack: [],
  stage: { backgroundAssetId: null, characters: [], transition: "cut" },
});

interface NarrativeSceneInputV1 {
  readonly sceneId: string;
  readonly entryNodeId: string;
  readonly nodes: readonly unknown[];
}

function narrativeDataV1(
  scenes: readonly NarrativeSceneInputV1[],
  limits: { readonly steps?: number; readonly depth?: number } = {},
): PocSimulationDataV1 {
  const base = createPocGameplayFixtureV1().program.data;
  const hasExplicitCheckpoint = scenes.some((scene) =>
    scene.nodes.some(
      (node) =>
        node !== null &&
        typeof node === "object" &&
        "kind" in node &&
        node.kind === "eventCheckpoint" &&
        "checkpointId" in node &&
        node.checkpointId === "checkpoint.fixture_explicit",
    ),
  );
  return pocSimulationDataSchemaV1.parse({
    ...base,
    manifest: { ...base.manifest, initialSceneId: scenes[0]?.sceneId },
    balance: {
      ...base.balance,
      maxNarrativeStepsPerCommand: limits.steps ?? base.balance.maxNarrativeStepsPerCommand,
      maxNarrativeCallDepth: limits.depth ?? base.balance.maxNarrativeCallDepth,
    },
    content: {
      ...base.content,
      events: hasExplicitCheckpoint
        ? [
            ...base.content.events,
            {
              eventId: "event.fixture_explicit",
              checkpointId: "checkpoint.fixture_explicit",
              trigger: {
                kind: "story.explicit",
                checkpointId: "checkpoint.fixture_explicit",
              },
              priority: 0,
              weightedGroupId: null,
              weight: 0,
              when: [],
              sceneId: null,
              effects: [],
            },
          ]
        : base.content.events,
    },
    narrative: { scenes: [...base.narrative.scenes, ...scenes] },
  });
}

function startV1(data: PocSimulationDataV1, sceneId: string): PocNarrativeStepResultV1 {
  return interpretPocNarrativeStepV1(data, idleNarrativeStateV1, {
    kind: "start",
    request: { source: { kind: "manifest_start" }, sceneId: parseSceneId(sceneId) },
  });
}

function expectYieldedV1(result: PocNarrativeStepResultV1) {
  expect(result.kind).toBe("yielded");
  if (result.kind !== "yielded") throw new TypeError("expected yielded Narrative result");
  return result;
}

function expectSettledV1(result: PocNarrativeStepResultV1) {
  expect(result.kind).toBe("settled");
  if (result.kind !== "settled") throw new TypeError("expected settled Narrative result");
  return result;
}

function resumeV1(
  data: PocSimulationDataV1,
  continuation: PocNarrativeContinuationV1,
  resolution: PocNarrativeResolutionV1,
): PocNarrativeStepResultV1 {
  return interpretPocNarrativeStepV1(data, continuation.transientState, {
    kind: "resume",
    continuation,
    resolution,
  });
}

function lineNodeV1(nodeId: string, nextNodeId: string) {
  return {
    kind: "line" as const,
    nodeId,
    speakerId: "character.heroine",
    textId: "text.fixture",
    nextNodeId,
  };
}

function cursorV1(sceneId: string, nodeId: string): NarrativeCursorV1 {
  return {
    sceneId: parseSceneId(sceneId),
    nodeId: parseNodeId(nodeId),
  };
}

describe("PoC Narrative interpreter", () => {
  it("starts at a presentable line and advances to the next presentable node", () => {
    const data = narrativeDataV1([
      {
        sceneId: "scene.start",
        entryNodeId: "node.start",
        nodes: [
          lineNodeV1("node.start", "node.second"),
          lineNodeV1("node.second", "node.end"),
          { kind: "end", nodeId: "node.end" },
        ],
      },
    ]);

    const started = expectSettledV1(startV1(data, "scene.start"));
    expect(started.state).toMatchObject({
      status: "active",
      source: { kind: "manifest_start" },
      cursor: { sceneId: "scene.start", nodeId: "node.start" },
    });
    expect(started.gameplayFacts).toEqual([]);

    const advanced = expectSettledV1(
      interpretPocNarrativeStepV1(data, started.state, {
        kind: "advance",
        cursor: cursorV1("scene.start", "node.start"),
      }),
    );
    expect(advanced.state.cursor).toEqual({ sceneId: "scene.start", nodeId: "node.second" });
    expect(advanced.gameplayFacts).toEqual([
      {
        kind: "narrative.advanced",
        from: { sceneId: "scene.start", nodeId: "node.start" },
        to: { sceneId: "scene.start", nodeId: "node.second" },
      },
    ]);
  });

  it("returns stable inactive, stale-cursor, choice-required, and unknown-reference results", () => {
    const choiceCursor = cursorV1("scene.guards", "node.guards.choice");
    const data = narrativeDataV1([
      {
        sceneId: "scene.guards",
        entryNodeId: "node.guards.choice",
        nodes: [
          {
            kind: "choice",
            nodeId: "node.guards.choice",
            choices: [
              {
                choiceId: "choice.guards.valid",
                textId: "text.fixture",
                showWhen: [],
                enableWhen: [],
                confirmation: {
                  benefitTextIds: [],
                  mutuallyExcludedActionIds: [],
                  majorRiskTextIds: [],
                },
                effects: [],
                nextNodeId: "node.guards.end",
              },
            ],
          },
          { kind: "end", nodeId: "node.guards.end" },
        ],
      },
    ]);
    const active = expectSettledV1(startV1(data, "scene.guards")).state;

    expect(
      interpretPocNarrativeStepV1(data, idleNarrativeStateV1, {
        kind: "advance",
        cursor: choiceCursor,
      }),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "narrative.inactive",
        details: { commandKind: "narrative.advance" },
      },
    });
    expect(
      interpretPocNarrativeStepV1(data, active, {
        kind: "advance",
        cursor: choiceCursor,
      }),
    ).toEqual({
      kind: "rejected",
      rejection: { code: "narrative.choice_required", details: { cursor: choiceCursor } },
    });
    expect(
      interpretPocNarrativeStepV1(data, active, {
        kind: "choose",
        cursor: choiceCursor,
        choiceId: parseChoiceId("choice.guards.missing"),
      }),
    ).toMatchObject({
      kind: "rejected",
      rejection: { code: "command.unknown_reference" },
    });
    const staleCursor = cursorV1("scene.guards", "node.guards.stale");
    expect(
      interpretPocNarrativeStepV1(data, active, {
        kind: "choose",
        cursor: staleCursor,
        choiceId: parseChoiceId("choice.guards.valid"),
      }),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "narrative.cursor_mismatch",
        details: { expected: choiceCursor, actual: staleCursor },
      },
    });
    expect(startV1(data, "scene.missing")).toEqual({
      kind: "faulted",
      fault: { category: "engine_invariant", code: "story.reference_missing" },
    });
  });

  it("branches by stable ChoiceId and rejoins one shared node", () => {
    const choiceCursor = cursorV1("scene.branch", "node.choice");
    const data = narrativeDataV1([
      {
        sceneId: "scene.branch",
        entryNodeId: "node.choice",
        nodes: [
          {
            kind: "choice",
            nodeId: "node.choice",
            choices: [
              {
                choiceId: "choice.left",
                textId: "text.fixture",
                showWhen: [],
                enableWhen: [],
                confirmation: {
                  benefitTextIds: [],
                  mutuallyExcludedActionIds: [],
                  majorRiskTextIds: [],
                },
                check: {
                  checkId: "check.fixture",
                  actorId: "actor.player",
                  preparationBonus: 0,
                },
                effects: [
                  {
                    kind: "fact.set",
                    factId: "fact.fixture",
                    value: { kind: "boolean", value: true },
                    reasonId: "reason.fixture",
                  },
                ],
                nextNodeId: "node.left_jump",
              },
              {
                choiceId: "choice.right",
                textId: "text.fixture",
                showWhen: [],
                enableWhen: [],
                confirmation: {
                  benefitTextIds: [],
                  mutuallyExcludedActionIds: [],
                  majorRiskTextIds: [],
                },
                effects: [],
                nextNodeId: "node.right_jump",
              },
            ],
          },
          { kind: "jump", nodeId: "node.left_jump", targetNodeId: "node.shared" },
          { kind: "jump", nodeId: "node.right_jump", targetNodeId: "node.shared" },
          lineNodeV1("node.shared", "node.end"),
          { kind: "end", nodeId: "node.end" },
        ],
      },
    ]);
    const started = expectSettledV1(startV1(data, "scene.branch"));

    const choose = (choiceId: "choice.left" | "choice.right") => {
      const yielded = expectYieldedV1(
        interpretPocNarrativeStepV1(data, started.state, {
          kind: "choose",
          cursor: choiceCursor,
          choiceId: parseChoiceId(choiceId),
        }),
      );
      expect(yielded.request).toMatchObject({ kind: "choice", cursor: choiceCursor });
      const effects = yielded.request.kind === "choice" ? yielded.request.choice.effects : [];
      expect(yielded.effects).toEqual(effects);
      expect(yielded.checkpoints).toEqual([]);
      const settled = expectSettledV1(
        resumeV1(data, yielded.continuation, {
          kind: "choice",
          cursor: choiceCursor,
          choiceId: parseChoiceId(choiceId),
          visible: true,
          enabled: true,
          checkDecision:
            choiceId === "choice.left"
              ? {
                  checkId: parseCheckId("check.fixture"),
                  actorId: parseActorId("actor.player"),
                  bandId: parseCheckBandId("band.fixture"),
                }
              : null,
        }),
      );
      return { effects, settled };
    };

    const left = choose("choice.left");
    const right = choose("choice.right");
    expect(left.settled.state.cursor?.nodeId).toBe("node.shared");
    expect(right.settled.state.cursor?.nodeId).toBe("node.shared");
    expect(left.effects).not.toEqual(right.effects);
    expect(left.settled.gameplayFacts).toEqual([
      { kind: "narrative.choice_committed", cursor: choiceCursor, choiceId: "choice.left" },
    ]);
  });

  it("yields an Effect before a later Condition observes the refreshed candidate", () => {
    const data = narrativeDataV1([
      {
        sceneId: "scene.effect_order",
        entryNodeId: "node.line",
        nodes: [
          lineNodeV1("node.line", "node.effect"),
          {
            kind: "command",
            nodeId: "node.effect",
            effects: [
              {
                kind: "fact.set",
                factId: "fact.fixture",
                value: { kind: "boolean", value: true },
                reasonId: "reason.fixture",
              },
            ],
            nextNodeId: "node.condition",
          },
          {
            kind: "condition",
            nodeId: "node.condition",
            when: [
              {
                kind: "fact.equals",
                factId: "fact.fixture",
                value: { kind: "boolean", value: true },
              },
            ],
            passNodeId: "node.pass",
            failNodeId: "node.fail",
          },
          lineNodeV1("node.pass", "node.end"),
          lineNodeV1("node.fail", "node.end"),
          { kind: "end", nodeId: "node.end" },
        ],
      },
    ]);
    const started = expectSettledV1(startV1(data, "scene.effect_order"));
    const effect = expectYieldedV1(
      interpretPocNarrativeStepV1(data, started.state, {
        kind: "advance",
        cursor: cursorV1("scene.effect_order", "node.line"),
      }),
    );
    expect(effect.request.kind).toBe("effects");
    expect(effect.effects).toEqual([
      {
        kind: "fact.set",
        factId: "fact.fixture",
        value: { kind: "boolean", value: true },
        reasonId: "reason.fixture",
      },
    ]);
    expect(effect.checkpoints).toEqual([]);
    expect(effect.continuation.automaticStepsUsed).toBe(1);

    const condition = expectYieldedV1(
      resumeV1(data, effect.continuation, {
        kind: "effects_applied",
        cursor: cursorV1("scene.effect_order", "node.effect"),
      }),
    );
    expect(condition.request.kind).toBe("condition");
    expect(condition.continuation.automaticStepsUsed).toBe(2);

    const settled = expectSettledV1(
      resumeV1(data, condition.continuation, {
        kind: "condition",
        cursor: cursorV1("scene.effect_order", "node.condition"),
        passed: true,
      }),
    );
    expect(settled.state.cursor?.nodeId).toBe("node.pass");
  });

  it("keeps an event checkpoint ahead of the following Condition", () => {
    const data = narrativeDataV1([
      {
        sceneId: "scene.checkpoint_order",
        entryNodeId: "node.line",
        nodes: [
          lineNodeV1("node.line", "node.checkpoint"),
          {
            kind: "eventCheckpoint",
            nodeId: "node.checkpoint",
            checkpointId: "checkpoint.fixture_explicit",
            nextNodeId: "node.condition",
          },
          {
            kind: "condition",
            nodeId: "node.condition",
            when: [{ kind: "narrative.not_active" }],
            passNodeId: "node.pass",
            failNodeId: "node.fail",
          },
          lineNodeV1("node.pass", "node.end"),
          lineNodeV1("node.fail", "node.end"),
          { kind: "end", nodeId: "node.end" },
        ],
      },
    ]);
    const started = expectSettledV1(startV1(data, "scene.checkpoint_order"));
    const checkpoint = expectYieldedV1(
      interpretPocNarrativeStepV1(data, started.state, {
        kind: "advance",
        cursor: cursorV1("scene.checkpoint_order", "node.line"),
      }),
    );
    expect(checkpoint.request).toMatchObject({
      kind: "checkpoint",
      cursor: { sceneId: "scene.checkpoint_order", nodeId: "node.checkpoint" },
      checkpointId: "checkpoint.fixture_explicit",
    });
    expect(checkpoint.effects).toEqual([]);
    expect(checkpoint.checkpoints).toEqual(["checkpoint.fixture_explicit"]);
    expect(checkpoint.state.cursor?.nodeId).toBe("node.checkpoint");

    const condition = expectYieldedV1(
      resumeV1(data, checkpoint.continuation, {
        kind: "checkpoint_applied",
        cursor: cursorV1("scene.checkpoint_order", "node.checkpoint"),
      }),
    );
    expect(condition.request.kind).toBe("condition");
  });

  it("handles Check decisions without persisting or duplicating Check facts", () => {
    const data = narrativeDataV1([
      {
        sceneId: "scene.check",
        entryNodeId: "node.check",
        nodes: [
          {
            kind: "check",
            nodeId: "node.check",
            request: {
              checkId: "check.fixture",
              actorId: "actor.player",
              preparationBonus: 0,
            },
            branches: [{ bandId: "band.fixture", nextNodeId: "node.result" }],
          },
          lineNodeV1("node.result", "node.end"),
          { kind: "end", nodeId: "node.end" },
        ],
      },
    ]);
    const yielded = expectYieldedV1(startV1(data, "scene.check"));
    expect(yielded.request).toMatchObject({
      kind: "check",
      cursor: { sceneId: "scene.check", nodeId: "node.check" },
      request: { checkId: "check.fixture", actorId: "actor.player" },
    });
    expect(yielded.gameplayFacts).toEqual([]);

    const settled = expectSettledV1(
      resumeV1(data, yielded.continuation, {
        kind: "check",
        cursor: cursorV1("scene.check", "node.check"),
        decision: {
          checkId: parseCheckId("check.fixture"),
          actorId: parseActorId("actor.player"),
          bandId: parseCheckBandId("band.fixture"),
        },
      }),
    );
    expect(settled.state.cursor?.nodeId).toBe("node.result");
    expect(settled.gameplayFacts).toEqual([]);
  });

  it("applies stage cues, call/return, and end without committing an internal cursor", () => {
    const data = narrativeDataV1([
      {
        sceneId: "scene.stage",
        entryNodeId: "node.stage.line",
        nodes: [
          lineNodeV1("node.stage.line", "node.stage.background"),
          {
            kind: "stageCue",
            nodeId: "node.stage.background",
            cue: { kind: "background.set", assetId: "asset.fixture", transition: "fade" },
            nextNodeId: "node.stage.show",
          },
          {
            kind: "stageCue",
            nodeId: "node.stage.show",
            cue: {
              kind: "character.show",
              slot: "left",
              characterId: "character.heroine",
              poseAssetId: "asset.fixture.pose",
            },
            nextNodeId: "node.stage.call",
          },
          {
            kind: "call",
            nodeId: "node.stage.call",
            sceneId: "scene.sub",
            entryNodeId: "node.sub.narration",
            returnNodeId: "node.stage.hide",
          },
          {
            kind: "stageCue",
            nodeId: "node.stage.hide",
            cue: { kind: "character.hide", slot: "left" },
            nextNodeId: "node.stage.clear",
          },
          {
            kind: "stageCue",
            nodeId: "node.stage.clear",
            cue: { kind: "stage.clear", transition: "fade" },
            nextNodeId: "node.stage.end",
          },
          { kind: "end", nodeId: "node.stage.end" },
        ],
      },
      {
        sceneId: "scene.sub",
        entryNodeId: "node.sub.narration",
        nodes: [
          {
            kind: "narration",
            nodeId: "node.sub.narration",
            textId: "text.fixture",
            nextNodeId: "node.sub.return",
          },
          { kind: "return", nodeId: "node.sub.return" },
        ],
      },
    ]);
    const started = expectSettledV1(startV1(data, "scene.stage"));
    const called = expectSettledV1(
      interpretPocNarrativeStepV1(data, started.state, {
        kind: "advance",
        cursor: cursorV1("scene.stage", "node.stage.line"),
      }),
    );
    expect(called.state.cursor).toEqual(cursorV1("scene.sub", "node.sub.narration"));
    expect(called.state.callStack).toEqual([
      { sceneId: "scene.stage", returnNodeId: "node.stage.hide" },
    ]);
    expect(called.state.stage).toEqual({
      backgroundAssetId: "asset.fixture",
      characters: [
        {
          slot: "left",
          characterId: "character.heroine",
          poseAssetId: "asset.fixture.pose",
        },
      ],
      transition: "fade",
    });

    const completed = expectSettledV1(
      interpretPocNarrativeStepV1(data, called.state, {
        kind: "advance",
        cursor: cursorV1("scene.sub", "node.sub.narration"),
      }),
    );
    expect(completed.state).toMatchObject({
      status: "completed",
      source: { kind: "manifest_start" },
      cursor: null,
      callStack: [],
      stage: { backgroundAssetId: null, characters: [], transition: "fade" },
    });
  });

  it("preserves authored character insertion order while replacing slots in place", () => {
    const data = narrativeDataV1([
      {
        sceneId: "scene.stage_order",
        entryNodeId: "node.stage_order.center",
        nodes: [
          {
            kind: "stageCue",
            nodeId: "node.stage_order.center",
            cue: {
              kind: "character.show",
              slot: "center",
              characterId: "character.heroine",
              poseAssetId: "asset.fixture.center",
            },
            nextNodeId: "node.stage_order.left",
          },
          {
            kind: "stageCue",
            nodeId: "node.stage_order.left",
            cue: {
              kind: "character.show",
              slot: "left",
              characterId: "character.player",
              poseAssetId: "asset.fixture.left",
            },
            nextNodeId: "node.stage_order.replace_center",
          },
          {
            kind: "stageCue",
            nodeId: "node.stage_order.replace_center",
            cue: {
              kind: "character.show",
              slot: "center",
              characterId: "character.player",
              poseAssetId: "asset.fixture.center_replaced",
            },
            nextNodeId: "node.stage_order.line",
          },
          lineNodeV1("node.stage_order.line", "node.stage_order.end"),
          { kind: "end", nodeId: "node.stage_order.end" },
        ],
      },
    ]);
    const settled = expectSettledV1(startV1(data, "scene.stage_order"));
    expect(settled.state.stage.characters).toEqual([
      {
        slot: "center",
        characterId: "character.player",
        poseAssetId: "asset.fixture.center_replaced",
      },
      {
        slot: "left",
        characterId: "character.player",
        poseAssetId: "asset.fixture.left",
      },
    ]);
  });

  it("preserves the automatic-step counter across an Effect yield", () => {
    const effectThenJumpsV1 = (jumpCount: number): NarrativeSceneInputV1 => ({
      sceneId: "scene.cross_yield",
      entryNodeId: "node.cross_yield.effect",
      nodes: [
        {
          kind: "command",
          nodeId: "node.cross_yield.effect",
          effects: [
            {
              kind: "fact.set",
              factId: "fact.fixture",
              value: { kind: "boolean", value: true },
              reasonId: "reason.fixture",
            },
          ],
          nextNodeId: "node.cross_yield.jump.0",
        },
        ...Array.from({ length: jumpCount }, (_, index) => ({
          kind: "jump" as const,
          nodeId: `node.cross_yield.jump.${index}`,
          targetNodeId:
            index + 1 === jumpCount
              ? "node.cross_yield.present"
              : `node.cross_yield.jump.${index + 1}`,
        })),
        lineNodeV1("node.cross_yield.present", "node.cross_yield.end"),
        { kind: "end", nodeId: "node.cross_yield.end" },
      ],
    });
    const runV1 = (jumpCount: number) => {
      const data = narrativeDataV1([effectThenJumpsV1(jumpCount)]);
      const effect = expectYieldedV1(startV1(data, "scene.cross_yield"));
      expect(effect.continuation.automaticStepsUsed).toBe(1);
      return resumeV1(data, effect.continuation, {
        kind: "effects_applied",
        cursor: cursorV1("scene.cross_yield", "node.cross_yield.effect"),
      });
    };

    expect(expectSettledV1(runV1(127)).state.cursor?.nodeId).toBe("node.cross_yield.present");
    expect(runV1(128)).toEqual({
      kind: "faulted",
      fault: { category: "command_handler", code: "narrative.step_limit_exceeded" },
    });
  });

  it("accepts the exact automatic-step and call-depth limits and faults one past them", () => {
    const jumpSceneV1 = (count: number): NarrativeSceneInputV1 => ({
      sceneId: "scene.steps",
      entryNodeId: "node.jump.0",
      nodes: [
        ...Array.from({ length: count }, (_, index) => ({
          kind: "jump" as const,
          nodeId: `node.jump.${index}`,
          targetNodeId: index + 1 === count ? "node.present" : `node.jump.${index + 1}`,
        })),
        lineNodeV1("node.present", "node.end"),
        { kind: "end", nodeId: "node.end" },
      ],
    });
    expect(
      expectSettledV1(startV1(narrativeDataV1([jumpSceneV1(128)]), "scene.steps")).state.cursor
        ?.nodeId,
    ).toBe("node.present");
    expect(startV1(narrativeDataV1([jumpSceneV1(129)]), "scene.steps")).toEqual({
      kind: "faulted",
      fault: { category: "command_handler", code: "narrative.step_limit_exceeded" },
    });

    const callScenesV1 = (depth: number): readonly NarrativeSceneInputV1[] =>
      Array.from({ length: depth + 1 }, (_, index) => {
        const sceneId = `scene.call.${index}`;
        if (index === depth) {
          return {
            sceneId,
            entryNodeId: `node.call.${index}.present`,
            nodes: [
              lineNodeV1(`node.call.${index}.present`, `node.call.${index}.end`),
              { kind: "end", nodeId: `node.call.${index}.end` },
            ],
          };
        }
        return {
          sceneId,
          entryNodeId: `node.call.${index}`,
          nodes: [
            {
              kind: "call",
              nodeId: `node.call.${index}`,
              sceneId: `scene.call.${index + 1}`,
              entryNodeId:
                index + 1 === depth ? `node.call.${index + 1}.present` : `node.call.${index + 1}`,
              returnNodeId: `node.call.${index}.return`,
            },
            lineNodeV1(`node.call.${index}.return`, `node.call.${index}.end`),
            { kind: "end", nodeId: `node.call.${index}.end` },
          ],
        };
      });

    const depthEight = expectSettledV1(startV1(narrativeDataV1(callScenesV1(8)), "scene.call.0"));
    expect(depthEight.state.callStack).toHaveLength(8);
    expect(startV1(narrativeDataV1(callScenesV1(9)), "scene.call.0")).toEqual({
      kind: "faulted",
      fault: { category: "command_handler", code: "narrative.call_depth_exceeded" },
    });
  });

  it("round-trips continuations as strict JSON and rejects uncorrelated resumes", () => {
    const data = narrativeDataV1([
      {
        sceneId: "scene.resume",
        entryNodeId: "node.condition",
        nodes: [
          {
            kind: "condition",
            nodeId: "node.condition",
            when: [{ kind: "run.started" }],
            passNodeId: "node.pass",
            failNodeId: "node.fail",
          },
          lineNodeV1("node.pass", "node.end"),
          lineNodeV1("node.fail", "node.end"),
          { kind: "end", nodeId: "node.end" },
        ],
      },
    ]);
    const yielded = expectYieldedV1(startV1(data, "scene.resume"));
    const continuation = JSON.parse(
      JSON.stringify(yielded.continuation),
    ) as PocNarrativeContinuationV1;
    const settled = expectSettledV1(
      interpretPocNarrativeStepV1(data, continuation.transientState, {
        kind: "resume",
        continuation,
        resolution: {
          kind: "condition",
          cursor: cursorV1("scene.resume", "node.condition"),
          passed: true,
        },
      }),
    );
    expect(settled.state.cursor?.nodeId).toBe("node.pass");

    const wrongKind = resumeV1(data, yielded.continuation, {
      kind: "effects_applied",
      cursor: cursorV1("scene.resume", "node.condition"),
    });
    expect(wrongKind.kind).toBe("rejected");

    const wrongCursor = resumeV1(data, yielded.continuation, {
      kind: "condition",
      cursor: cursorV1("scene.resume", "node.other"),
      passed: true,
    });
    expect(wrongCursor.kind).toBe("rejected");
  });

  it("faults malformed or tampered continuation data without invoking accessors", () => {
    const data = narrativeDataV1([
      {
        sceneId: "scene.hostile_resume",
        entryNodeId: "node.hostile.condition",
        nodes: [
          {
            kind: "condition",
            nodeId: "node.hostile.condition",
            when: [{ kind: "run.started" }],
            passNodeId: "node.hostile.pass",
            failNodeId: "node.hostile.fail",
          },
          lineNodeV1("node.hostile.pass", "node.hostile.end"),
          lineNodeV1("node.hostile.fail", "node.hostile.end"),
          { kind: "end", nodeId: "node.hostile.end" },
        ],
      },
    ]);
    const yielded = expectYieldedV1(startV1(data, "scene.hostile_resume"));
    const hostile = JSON.parse(JSON.stringify(yielded.continuation)) as Record<string, unknown>;
    let accessorReads = 0;
    Object.defineProperty(hostile, "pending", {
      enumerable: true,
      get() {
        accessorReads += 1;
        return yielded.continuation.pending;
      },
    });

    const result = interpretPocNarrativeStepV1(data, yielded.state, {
      kind: "resume",
      continuation: hostile as unknown as PocNarrativeContinuationV1,
      resolution: {
        kind: "condition",
        cursor: cursorV1("scene.hostile_resume", "node.hostile.condition"),
        passed: true,
      },
    });
    expect(result).toEqual({
      kind: "faulted",
      fault: { category: "engine_invariant", code: "narrative.invalid_cursor" },
    });
    expect(accessorReads).toBe(0);

    const forgedOrigin = JSON.parse(
      JSON.stringify(yielded.continuation),
    ) as PocNarrativeContinuationV1;
    const forgedOriginResult = interpretPocNarrativeStepV1(data, yielded.state, {
      kind: "resume",
      continuation: {
        ...forgedOrigin,
        origin: {
          kind: "choose",
          cursor: cursorV1("scene.not_real", "node.not_real"),
          choiceId: parseChoiceId("choice.not_real"),
        },
      },
      resolution: {
        kind: "condition",
        cursor: cursorV1("scene.hostile_resume", "node.hostile.condition"),
        passed: true,
      },
    });
    expect(forgedOriginResult).toEqual({
      kind: "faulted",
      fault: { category: "engine_invariant", code: "story.reference_missing" },
    });

    const overLimit = JSON.parse(
      JSON.stringify(yielded.continuation),
    ) as PocNarrativeContinuationV1;
    const overLimitResult = interpretPocNarrativeStepV1(data, yielded.state, {
      kind: "resume",
      continuation: {
        ...overLimit,
        automaticStepsUsed: parseNonNegativeSafeInteger(129),
      },
      resolution: {
        kind: "condition",
        cursor: cursorV1("scene.hostile_resume", "node.hostile.condition"),
        passed: true,
      },
    });
    expect(overLimitResult).toEqual({
      kind: "faulted",
      fault: { category: "command_handler", code: "narrative.step_limit_exceeded" },
    });
  });
});

describe("PoC Narrative owner and module", () => {
  it("accepts only settled structural results and rejects stale proposals", () => {
    const fixture = createPocGameplayFixtureV1();
    const data = narrativeDataV1([
      {
        sceneId: "scene.owner",
        entryNodeId: "node.owner.first",
        nodes: [
          lineNodeV1("node.owner.first", "node.owner.second"),
          lineNodeV1("node.owner.second", "node.owner.end"),
          { kind: "end", nodeId: "node.owner.end" },
        ],
      },
    ]);
    const initial = createInitialPocNarrativeStateV1(fixture.bootstrap);
    const started = expectSettledV1(startV1(data, "scene.owner"));
    const startProposal = pocNarrativeOwnerV1.propose(
      initial,
      { kind: "narrative.start", settled: started },
      { kind: "narrative.settled" },
    );
    expect(startProposal.kind).toBe("proposed");
    if (startProposal.kind !== "proposed") throw new TypeError("expected start proposal");
    const active = pocNarrativeOwnerV1.apply(initial, startProposal.proposal);

    const advanced = expectSettledV1(
      interpretPocNarrativeStepV1(data, active, {
        kind: "advance",
        cursor: cursorV1("scene.owner", "node.owner.first"),
      }),
    );
    const advanceProposal = pocNarrativeOwnerV1.propose(
      active,
      { kind: "narrative.advance", settled: advanced },
      { kind: "narrative.settled" },
    );
    expect(advanceProposal.kind).toBe("proposed");
    if (advanceProposal.kind !== "proposed") {
      throw new TypeError("expected advance proposal");
    }
    expect(() => pocNarrativeOwnerV1.apply(initial, advanceProposal.proposal)).toThrow(
      /stale Narrative owner proposal/u,
    );
    expect(pocNarrativeOwnerV1.apply(active, advanceProposal.proposal).cursor?.nodeId).toBe(
      "node.owner.second",
    );

    expect(() =>
      pocNarrativeOwnerOperationSchemaV1.parse({
        kind: "narrative.advance",
        settled: { ...advanced, kind: "yielded" },
      }),
    ).toThrow();
  });

  it("uses a presentable-node proof for an absolute debug jump", () => {
    const data = narrativeDataV1([
      {
        sceneId: "scene.debug",
        entryNodeId: "node.debug.first",
        nodes: [
          lineNodeV1("node.debug.first", "node.debug.second"),
          lineNodeV1("node.debug.second", "node.debug.end"),
          { kind: "end", nodeId: "node.debug.end" },
        ],
      },
    ]);
    const active = expectSettledV1(startV1(data, "scene.debug")).state;
    const target = cursorV1("scene.debug", "node.debug.second");
    const proposal = pocNarrativeOwnerV1.propose(
      active,
      { kind: "narrative.debug.jump", target },
      { kind: "narrative.debug.jump", target: { cursor: target, nodeKind: "line" } },
    );
    expect(proposal.kind).toBe("proposed");
    if (proposal.kind !== "proposed") throw new TypeError("expected debug jump proposal");
    expect(pocNarrativeOwnerV1.apply(active, proposal.proposal)).toMatchObject({
      status: "active",
      source: active.source,
      cursor: target,
      callStack: [],
      stage: active.stage,
    });
  });

  it("strictly parses canonical state and exposes the Narrative state slot", () => {
    const fixture = createPocGameplayFixtureV1();
    const initial = createInitialPocNarrativeStateV1(fixture.bootstrap);
    expect(
      Object.isFrozen(pocNarrativeStateSchemaV1.parse(JSON.parse(JSON.stringify(initial)))),
    ).toBe(true);
    expect(() => pocNarrativeStateSchemaV1.parse({ ...initial, extra: true })).toThrow();
    expect(() =>
      assertValidPocNarrativeStateV1({ ...initial, status: "active" }, "invalid active Narrative"),
    ).toThrow(/violates Narrative invariants/u);
    expect(pocNarrativeGameplayModuleV1.descriptor.stateSlots).toEqual(["story.narrative"]);
  });
});
