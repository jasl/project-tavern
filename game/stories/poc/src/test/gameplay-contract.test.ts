// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  CommandExecutionAttemptEnvelopeV1,
  GameSimulationTypeMapV1,
  GameSnapshotEnvelopeV1,
  NonZeroUint32,
  RngDrawTraceV1,
  RngStateV1,
  RunId,
} from "@sillymaker/base";
import {
  descriptorForPocModuleV1,
  pocGameplayModuleDependenciesV1,
  pocGameplayModuleDescriptorsV1,
  pocGameplayModuleKeysV1,
  pocStateOwnerKeysV1,
} from "../gameplay/contracts/module-catalog.js";
import { definePocGameplayModuleV1 } from "../gameplay/contracts/define-poc-gameplay-module.js";
import {
  pocDebugCommandSchemaV1,
  pocDebugCommandValidationErrorSchemaV1,
  pocSimulationDataSchemaV1,
  pocStoryBalanceSchemaV1,
} from "../gameplay/contracts/schemas.js";
import {
  pocDebugCommandKindsV1,
  type PocCommandExecutionAttemptV1,
  type PocDebugCommandV1,
  type PocDebugCommandValidationErrorV1,
  type PocEngineFaultV1,
  type PocGameBootstrapInputV1,
  type PocGameCommandV1,
  type PocGameQueriesV1,
  type PocGameSimulationTypesV1,
  type PocGameSnapshotV1,
  type PocGameStateV1,
  type PocGameViewV1,
  type PocGameplayFactV1,
  type PocReplayableDebugExecutionAttemptV1,
  type PocRejectionReasonV1,
  type PocSimulationProgramV1,
} from "../gameplay/contracts/types.js";
import { deepFreezePocValueV1 } from "../gameplay/contracts/values.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

describe("PoC gameplay contract", () => {
  it("owns exactly ten stateful slices inside the PoC Story", () => {
    expect(pocGameplayModuleKeysV1).toEqual([
      "run",
      "calendar",
      "actors",
      "status",
      "inventory",
      "facilities",
      "tavern",
      "workflow",
      "progression",
      "narrative",
    ]);
    expect(pocStateOwnerKeysV1).toEqual(pocGameplayModuleKeysV1);
    expect(pocStateOwnerKeysV1).toBe(pocGameplayModuleKeysV1);
    expect(Object.keys(pocGameplayModuleDependenciesV1)).toEqual(pocGameplayModuleKeysV1);
    expect(
      pocGameplayModuleDescriptorsV1.map(({ contractRevision, dependencies, id }) => ({
        id,
        contractRevision,
        dependencies,
      })),
    ).toEqual(
      pocGameplayModuleKeysV1.map((key) => ({
        id: `module.${key}`,
        contractRevision: 1,
        dependencies: [],
      })),
    );
    expect(pocGameplayModuleDescriptorsV1.map((entry) => entry.stateSlots)).toEqual([
      ["simulation.run"],
      ["simulation.calendar"],
      ["simulation.actors"],
      ["simulation.status"],
      ["simulation.inventory"],
      ["simulation.facilities"],
      ["simulation.tavern"],
      ["simulation.activeWorkflow"],
      ["story.facts", "story.quests", "story.outcomes", "story.resolvedChecks"],
      ["story.narrative"],
    ]);
    expect(
      Object.values(pocGameplayModuleDependenciesV1).every((value) => value.length === 0),
    ).toBe(true);
    for (const [index, key] of pocGameplayModuleKeysV1.entries()) {
      const descriptor = pocGameplayModuleDescriptorsV1[index];
      expect(descriptorForPocModuleV1(key)).toBe(descriptor);
      expect(Object.keys(descriptor ?? {})).toEqual([
        "id",
        "contractRevision",
        "stateSlots",
        "dependencies",
      ]);
      expect(Object.isFrozen(descriptor)).toBe(true);
      expect(Object.isFrozen(descriptor?.stateSlots)).toBe(true);
      expect(Object.isFrozen(descriptor?.dependencies)).toBe(true);
    }
    expect(() => Reflect.apply(descriptorForPocModuleV1, undefined, ["unknown"])).toThrow();
    expect(typeof definePocGameplayModuleV1).toBe("function");
  });

  it("closes one simulation type map", () => {
    expectTypeOf<PocGameSimulationTypesV1>().toMatchTypeOf<GameSimulationTypeMapV1>();
    expectTypeOf<
      PocGameSimulationTypesV1["bootstrapInput"]
    >().toEqualTypeOf<PocGameBootstrapInputV1>();
    expectTypeOf<PocGameBootstrapInputV1>().toEqualTypeOf<{
      readonly rngSeed: NonZeroUint32;
      readonly runId: RunId;
    }>();
    expectTypeOf<PocGameSimulationTypesV1["state"]>().toEqualTypeOf<PocGameStateV1>();
    expectTypeOf<PocGameSimulationTypesV1["rngState"]>().toEqualTypeOf<RngStateV1>();
    expectTypeOf<PocGameSimulationTypesV1["snapshot"]>().toEqualTypeOf<PocGameSnapshotV1>();
    expectTypeOf<PocGameSnapshotV1>().toEqualTypeOf<
      GameSnapshotEnvelopeV1<PocGameStateV1, RngStateV1>
    >();
    expectTypeOf<PocGameSimulationTypesV1["rngDrawTrace"]>().toEqualTypeOf<RngDrawTraceV1>();
    expectTypeOf<PocGameSimulationTypesV1["command"]>().toEqualTypeOf<PocGameCommandV1>();
    expectTypeOf<PocGameSimulationTypesV1["fact"]>().toEqualTypeOf<PocGameplayFactV1>();
    expectTypeOf<PocGameSimulationTypesV1["rejection"]>().toEqualTypeOf<PocRejectionReasonV1>();
    expectTypeOf<PocGameSimulationTypesV1["fault"]>().toEqualTypeOf<PocEngineFaultV1>();
    expectTypeOf<PocGameSimulationTypesV1["debugCommand"]>().toEqualTypeOf<PocDebugCommandV1>();
    expectTypeOf<
      PocGameSimulationTypesV1["debugValidationError"]
    >().toEqualTypeOf<PocDebugCommandValidationErrorV1>();
    expectTypeOf<PocGameSimulationTypesV1["executionContext"]>().toEqualTypeOf<undefined>();
    expectTypeOf<PocGameSimulationTypesV1["queries"]>().toEqualTypeOf<PocGameQueriesV1>();
    expectTypeOf<PocGameSimulationTypesV1["viewModel"]>().toEqualTypeOf<PocGameViewV1>();
    expectTypeOf<PocCommandExecutionAttemptV1>().toEqualTypeOf<
      CommandExecutionAttemptEnvelopeV1<
        PocGameSnapshotV1,
        PocGameplayFactV1,
        PocRejectionReasonV1,
        PocEngineFaultV1,
        RngStateV1,
        RngDrawTraceV1
      >
    >();
    expectTypeOf<
      Extract<PocReplayableDebugExecutionAttemptV1["result"], { readonly kind: "rejected" }>
    >().toEqualTypeOf<never>();
    expectTypeOf<PocSimulationProgramV1>().toHaveProperty("data");
    expectTypeOf<PocSimulationProgramV1>().toHaveProperty("rules");
  });

  it("keeps replayable debug commands closed to the simulation-owned ten kinds", () => {
    expect(pocDebugCommandKindsV1).toEqual([
      "debug.calendar.set_ap",
      "debug.actor.set_stamina",
      "debug.actor.set_mood",
      "debug.relationship.set",
      "debug.inventory.adjust_cash",
      "debug.aura.apply",
      "debug.aura.clear",
      "debug.story.fact.set",
      "debug.narrative.jump",
      "debug.rng.set",
    ]);
    expect(() => pocDebugCommandSchemaV1.parse({ kind: "debug.fixture.load" })).toThrow();
    expect(() =>
      pocDebugCommandSchemaV1.parse({
        kind: "debug.calendar.set_ap",
        value: 1,
        reasonId: "reason.fixture.debug",
        extra: true,
      }),
    ).toThrow();
    expect(
      pocDebugCommandValidationErrorSchemaV1.parse({
        code: "debug.unknown_reference",
        commandKind: "debug.calendar.set_ap",
        reference: { kind: "reason", reasonId: "reason.fixture.missing" },
      }),
    ).toEqual({
      code: "debug.unknown_reference",
      commandKind: "debug.calendar.set_ap",
      reference: { kind: "reason", reasonId: "reason.fixture.missing" },
    });
    expect(() =>
      pocDebugCommandValidationErrorSchemaV1.parse({
        code: "debug.unknown_reference",
        commandKind: "debug.fixture.load",
        reference: { kind: "fixture", fixtureId: "fixture.poc.invalid" },
      }),
    ).toThrow();
  });

  it("strictly projects the complete simulation data contract", () => {
    const fixture = createPocGameplayFixtureV1();
    const data = pocSimulationDataSchemaV1.parse(fixture.program.data);

    expect(Object.keys(data)).toEqual([
      "dataRevision",
      "manifest",
      "stateDefinitions",
      "initialState",
      "balance",
      "content",
      "narrative",
    ]);
    expect(Object.keys(data.manifest)).toEqual(["initialSceneId", "playableDays"]);
    expect(Object.keys(data.content)).toEqual([
      "characters",
      "reasons",
      "actions",
      "storyActions",
      "customerSegments",
      "modifierSources",
      "ingredients",
      "items",
      "recipes",
      "facilities",
      "facilityOpportunities",
      "auras",
      "worldActions",
      "events",
      "checks",
      "endings",
    ]);
    expect(Object.keys(data.narrative)).toEqual(["scenes"]);
    expect(Object.keys(data.balance)).toEqual([
      "lifePolicies",
      "actionCosts",
      "serviceModes",
      "serviceDays",
      "baseDemand",
      "ledgerReasons",
      "emergencyClosure",
      "plannedClosureReasonId",
      "heroineNightRecovery",
      "heroineNightRecoveryReasonId",
      "restRecovery",
      "purchaseLineLimit",
      "menuRecipeLimit",
      "dailyPreparationLimit",
      "openingFee",
      "levyAmount",
      "levyDue",
      "obligationForecast",
      "endingPolicy",
      "maxNarrativeStepsPerCommand",
      "maxNarrativeCallDepth",
    ]);
    expect(data.balance.endingPolicy).toEqual({
      stableMinimumCashAfterLevy: 20,
      stableMinimumReputation: 50,
      stableMinimumBuiltFacilities: 1,
      reputationCrisisBelow: 45,
      stableReasonId: "reason.ending.stable",
      dangerReasonId: "reason.ending.danger",
      arrearsReasonId: "reason.ending.arrears",
      reputationCrisisReasonId: "reason.ending.reputation_crisis",
    });
    expect(data.balance.maxNarrativeStepsPerCommand).toBe(128);
    expect(data.balance.maxNarrativeCallDepth).toBe(8);
    expect(Object.isFrozen(data)).toBe(true);
    expect(Object.isFrozen(data.content)).toBe(true);
    expect(Object.isFrozen(data.balance.endingPolicy)).toBe(true);

    expect(() => pocSimulationDataSchemaV1.parse({ ...data, presentation: {} })).toThrow();
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        content: { ...data.content, texts: [] },
      }),
    ).toThrow();
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        content: { ...data.content, modules: pocGameplayModuleDescriptorsV1 },
      }),
    ).toThrow();
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        narrative: { ...data.narrative, execute: () => undefined },
      }),
    ).toThrow();

    const { stableReasonId: _stableReasonId, ...incompleteEndingPolicy } =
      data.balance.endingPolicy;
    expect(() =>
      pocStoryBalanceSchemaV1.parse({
        ...data.balance,
        endingPolicy: incompleteEndingPolicy,
      }),
    ).toThrow();
    expect(() => pocStoryBalanceSchemaV1.parse({ ...data.balance, extra: true })).toThrow();

    const recipe = data.content.recipes[0];
    const scene = data.narrative.scenes[0];
    const storyAction = data.content.storyActions[0];
    const event = data.content.events[0];
    const check = data.content.checks[0];
    const worldAction = data.content.worldActions[0];
    const worldActionPresentation = data.content.actions.find(
      ({ actionId }) => actionId === worldAction?.actionId,
    );
    if (
      recipe === undefined ||
      scene === undefined ||
      storyAction === undefined ||
      event === undefined ||
      check === undefined ||
      worldAction === undefined ||
      worldActionPresentation === undefined
    ) {
      throw new TypeError("incomplete fixture");
    }
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        content: {
          ...data.content,
          recipes: [
            {
              ...recipe,
              ingredients: [{ ingredientId: "ingredient.missing", quantity: 1 }],
            },
          ],
        },
      }),
    ).toThrow();
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        initialState: {
          ...data.initialState,
          unlockedRecipeIds: ["recipe.missing"],
        },
      }),
    ).toThrow();
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        narrative: {
          scenes: [{ ...scene, entryNodeId: "node.missing" }],
        },
      }),
    ).toThrow();
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        content: { ...data.content, recipes: [recipe, recipe] },
      }),
    ).toThrow();
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        balance: { ...data.balance, baseDemand: [] },
      }),
    ).toThrow();
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        content: {
          ...data.content,
          storyActions: [{ ...storyAction, sceneId: "scene.missing" }],
        },
      }),
    ).toThrow();
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        narrative: {
          scenes: [
            {
              sceneId: scene.sceneId,
              entryNodeId: "node.fixture.line",
              nodes: [
                {
                  kind: "line",
                  nodeId: "node.fixture.line",
                  speakerId: "character.player",
                  textId: "text.fixture",
                  nextNodeId: "node.missing",
                },
              ],
            },
          ],
        },
      }),
    ).toThrow();
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        content: { ...data.content, events: [{ ...event, weight: 1 }] },
      }),
    ).toThrow();
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        content: {
          ...data.content,
          events: [{ ...event, trigger: { kind: "week.ended" }, sceneId: scene.sceneId }],
        },
      }),
    ).toThrow();
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        content: {
          ...data.content,
          events: [
            {
              ...event,
              trigger: {
                kind: "story.explicit",
                checkpointId: "checkpoint.unlinked",
              },
              sceneId: null,
            },
          ],
        },
      }),
    ).toThrow();
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        content: {
          ...data.content,
          actions: [
            ...data.content.actions,
            { ...worldActionPresentation, actionId: "action.fixture_world_second" },
          ],
          worldActions: [worldAction, { ...worldAction, actionId: "action.fixture_world_second" }],
          checks: [check, { ...check, checkId: "check.fixture_second" }],
        },
      }),
    ).not.toThrow();
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        initialState: {
          ...data.initialState,
          auras: [
            {
              instanceId: "aura:initial:0",
              auraId: "aura.fixture_timed",
              target: { kind: "actor", actorId: "actor.player" },
              source: { kind: "initial", reasonId: "reason.fixture" },
              duration: { kind: "countdown", unit: "day_end", remaining: 1 },
              appliedAtSequence: 0,
            },
          ],
        },
      }),
    ).toThrow();
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        content: {
          ...data.content,
          storyActions: [
            {
              ...storyAction,
              startEffects: [
                {
                  kind: "aura.apply",
                  auraId: "aura.fixture_timed",
                  target: { kind: "actor", actorId: "actor.player" },
                  source: { kind: "story_action", actionId: storyAction.actionId },
                  duration: { kind: "countdown", unit: "day_end", remaining: 1 },
                  reasonId: "reason.fixture.aura",
                },
              ],
            },
          ],
        },
      }),
    ).toThrow();
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        content: {
          ...data.content,
          storyActions: [
            {
              ...storyAction,
              startEffects: [
                {
                  kind: "ledger.append",
                  entry: {
                    category: "story_reward",
                    reasonId: "reason.fixture",
                    cashDelta: 0,
                    valuationDelta: 0,
                    subject: { kind: "action", actionId: worldAction.actionId },
                  },
                },
              ],
            },
          ],
        },
      }),
    ).toThrow();
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        content: {
          ...data.content,
          events: [
            {
              ...event,
              checkpointId: "checkpoint.fixture.explicit",
              trigger: {
                kind: "story.explicit",
                checkpointId: "checkpoint.fixture.explicit",
              },
              sceneId: null,
              effects: [
                {
                  kind: "relationship.affection.adjust",
                  delta: 1,
                  reasonId: "reason.fixture",
                },
              ],
            },
          ],
        },
        narrative: {
          scenes: [
            {
              sceneId: scene.sceneId,
              entryNodeId: "node.fixture.checkpoint",
              nodes: [
                {
                  kind: "eventCheckpoint",
                  nodeId: "node.fixture.checkpoint",
                  checkpointId: "checkpoint.fixture.explicit",
                  nextNodeId: "node.fixture.end",
                },
                { kind: "end", nodeId: "node.fixture.end" },
              ],
            },
          ],
        },
      }),
    ).not.toThrow();
  });

  it("rejects reversed stable-ID order in explicit state-definition collections", () => {
    const data = createPocGameplayFixtureV1().program.data;
    const fact = data.stateDefinitions.facts[0];
    const quest = data.stateDefinitions.quests[0];
    if (fact === undefined || quest === undefined) {
      throw new TypeError("incomplete state-definition fixture");
    }

    function parseStateDefinitionsError(stateDefinitions: unknown): Error {
      try {
        pocSimulationDataSchemaV1.parse({ ...data, stateDefinitions });
      } catch (error) {
        if (error instanceof Error) return error;
        throw error;
      }
      throw new TypeError("expected state-definition rejection");
    }

    function expectStableOrderFailure(stateDefinitions: unknown, label: string): void {
      expect(parseStateDefinitionsError(stateDefinitions).message).toContain(
        `${label} entries must use strict stable-ID ascending order`,
      );
    }

    expectStableOrderFailure(
      {
        ...data.stateDefinitions,
        facts: [{ ...fact, factId: "fact.fixture_second" }, fact],
      },
      "FactId",
    );
    expectStableOrderFailure(
      {
        ...data.stateDefinitions,
        quests: [
          {
            ...quest,
            questId: "quest.fixture_second",
            initial: { ...quest.initial, questId: "quest.fixture_second" },
          },
          quest,
        ],
      },
      "QuestId",
    );
    expectStableOrderFailure(
      {
        ...data.stateDefinitions,
        outcomes: data.stateDefinitions.outcomes.toReversed(),
      },
      "OutcomeId",
    );

    const duplicateError = parseStateDefinitionsError({
      ...data.stateDefinitions,
      facts: [fact, fact],
    });
    expect(duplicateError.message).toContain(`duplicate FactId: ${fact.factId}`);
    expect(duplicateError.message).not.toContain(
      "FactId entries must use strict stable-ID ascending order",
    );
  });

  it("deep-freezes non-enumerable rule-provider state", () => {
    const hiddenState = { calls: 0 };
    const provider = () => undefined;
    Object.defineProperty(provider, "hiddenState", {
      configurable: true,
      enumerable: false,
      value: hiddenState,
      writable: true,
    });

    deepFreezePocValueV1(provider);

    expect(Object.isFrozen(provider)).toBe(true);
    expect(Object.isFrozen(hiddenState)).toBe(true);

    function constructableProvider(): void {}
    const prototypeDescriptor = Object.getOwnPropertyDescriptor(constructableProvider, "prototype");
    const prototypeValue: unknown = prototypeDescriptor?.value;
    if (typeof prototypeValue !== "object" || prototypeValue === null) {
      throw new TypeError("missing function prototype");
    }
    const prototypeState = { calls: 0 };
    Object.defineProperty(prototypeValue, "hiddenState", {
      configurable: true,
      enumerable: false,
      value: prototypeState,
      writable: true,
    });

    deepFreezePocValueV1(constructableProvider);

    expect(Object.isFrozen(constructableProvider)).toBe(true);
    expect(Object.isFrozen(prototypeValue)).toBe(true);
    expect(Object.isFrozen(prototypeState)).toBe(true);
  });

  it("exports the contract through the named gameplay barrel", async () => {
    const gameplay = await import("../gameplay/index.js");
    expect(gameplay.pocGameplayModuleDescriptorsV1).toBe(pocGameplayModuleDescriptorsV1);
    expect(gameplay.pocSimulationDataSchemaV1).toBe(pocSimulationDataSchemaV1);
    expect(gameplay.pocDebugCommandSchemaV1).toBe(pocDebugCommandSchemaV1);
  });
});
