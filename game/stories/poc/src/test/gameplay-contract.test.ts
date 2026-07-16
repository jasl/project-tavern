// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
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
  parseActionId,
  parseCheckpointId,
  parseEventId,
  parseOpeningSessionId,
  parseReasonId,
  parseRecipeId,
  parseSceneId,
} from "../gameplay/contracts/ids.js";
import {
  pocDebugCommandSchemaV1,
  pocDebugCommandValidationErrorSchemaV1,
  pocEffectIntentKindsV1,
  pocEffectIntentSchemaV1,
  pocEffectSourceSchemaV1,
  pocSimulationDataSchemaV1,
  pocStoryBalanceSchemaV1,
  runtimeSchemaV1,
  validatePocEffectIntentForSourceV1,
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
  type PocEffectSourceV1,
  type PocGameplayFactV1,
  type PocReplayableDebugExecutionAttemptV1,
  type PocRejectionReasonV1,
  type PocSimulationProgramV1,
  type TavernPreviewInputV1,
} from "../gameplay/contracts/types.js";
import {
  pocGameStateSchemaV1,
  pocGameplayFactKindsV1,
  pocGameplayFactSchemaV1,
} from "../gameplay/runtime-schemas.js";
import {
  deepFreezePocValueV1,
  parseMoney,
  parseNonNegativeSafeInteger,
  parseQuantity,
} from "../gameplay/contracts/values.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

describe("PoC gameplay contract", () => {
  it("reuses only identities returned by the same runtime schema", () => {
    let refinementCount = 0;
    let transformCount = 0;
    const underlyingSchema = z
      .strictObject({ value: z.number().int().nonnegative() })
      .superRefine(() => {
        refinementCount += 1;
      })
      .transform(({ value }) => {
        transformCount += 1;
        return { value };
      });
    const schema = runtimeSchemaV1(underlyingSchema);

    const parsed = schema.parse({ value: 1 });
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(refinementCount).toBe(1);
    expect(transformCount).toBe(1);

    expect(schema.parse(parsed)).toBe(parsed);
    expect(refinementCount).toBe(1);
    expect(transformCount).toBe(1);

    const externalFrozenEqual = Object.freeze({ value: 1 });
    const reparsedExternal = schema.parse(externalFrozenEqual);
    expect(reparsedExternal).toEqual(parsed);
    expect(reparsedExternal).not.toBe(externalFrozenEqual);
    expect(refinementCount).toBe(2);
    expect(transformCount).toBe(2);

    const siblingSchema = runtimeSchemaV1(underlyingSchema);
    expect(siblingSchema.parse(parsed)).not.toBe(parsed);
    expect(refinementCount).toBe(3);
    expect(transformCount).toBe(3);

    const proxyMarker = new TypeError("proxy cache miss");
    const wrappedParsed = new Proxy(parsed, {
      getPrototypeOf() {
        throw proxyMarker;
      },
    });
    expect(() => schema.parse(wrappedParsed)).toThrow(proxyMarker);

    const mutableInput = { value: 2 };
    const parsedMutableInput = schema.parse(mutableInput);
    mutableInput.value = -1;
    expect(parsedMutableInput).toEqual({ value: 2 });
    expect(() => schema.parse(mutableInput)).toThrow();
    expect(() => schema.parse({ value: 1, unexpected: true })).toThrow();

    let primitiveTransformCount = 0;
    const primitiveSchema = runtimeSchemaV1(
      z.string().transform((value) => {
        primitiveTransformCount += 1;
        return value.trim();
      }),
    );
    const primitive = primitiveSchema.parse(" value ");
    expect(primitive).toBe("value");
    expect(primitiveSchema.parse(primitive)).toBe("value");
    expect(primitiveTransformCount).toBe(2);

    const nestedSchema = runtimeSchemaV1(
      z.strictObject({ entries: z.array(z.strictObject({ value: z.number().int() })) }),
    );
    const nested = nestedSchema.parse({ entries: [{ value: 1 }] });
    expect(Object.isFrozen(nested)).toBe(true);
    expect(Object.isFrozen(nested.entries)).toBe(true);
    expect(Object.isFrozen(nested.entries[0])).toBe(true);
    expect(nestedSchema.parse(nested)).toBe(nested);
    expect(() => Object.defineProperty(nested.entries[0], "value", { value: 2 })).toThrow();
  });

  it("shares strict aggregate State and GameplayFact schemas", () => {
    const fixture = createPocGameplayFixtureV1();
    expect(pocGameStateSchemaV1.parse(fixture.snapshot.state)).toEqual(fixture.snapshot.state);
    expect(() =>
      pocGameStateSchemaV1.parse({ ...fixture.snapshot.state, unexpected: true }),
    ).toThrow();
    expect(() =>
      pocGameStateSchemaV1.parse({
        ...fixture.snapshot.state,
        simulation: { ...fixture.snapshot.state.simulation, unexpected: true },
      }),
    ).toThrow();
    expect(() =>
      pocGameStateSchemaV1.parse({
        ...fixture.snapshot.state,
        story: { ...fixture.snapshot.state.story, unexpected: true },
      }),
    ).toThrow();

    const fact: PocGameplayFactV1 = {
      kind: "calendar.ap_changed",
      value: {
        before: parseNonNegativeSafeInteger(0),
        after: parseNonNegativeSafeInteger(1),
      },
      reason: {
        kind: "command",
        commandKind: "run.start",
        reasonId: parseReasonId("reason.fixture"),
      },
    };
    expect(pocGameplayFactSchemaV1.parse(fact)).toEqual(fact);
    expect(() => pocGameplayFactSchemaV1.parse({ ...fact, unexpected: true })).toThrow();

    expect(pocGameplayFactKindsV1).toHaveLength(46);
    expect(new Set(pocGameplayFactKindsV1).size).toBe(46);
    const executorFacts: readonly PocGameplayFactV1[] = [
      {
        kind: "run.started",
        runId: fixture.bootstrap.runId,
        initialSeed: fixture.bootstrap.rngSeed,
        demandSeeds: [],
      },
      { kind: "food.discarded", portions: [], entries: [] },
      {
        kind: "story.action_started",
        actionId: parseActionId("action.fixture_story"),
        sceneId: parseSceneId("scene.fixture"),
      },
      {
        kind: "scheduler.event_triggered",
        checkpointId: parseCheckpointId("checkpoint.fixture"),
        eventId: parseEventId("event.fixture"),
      },
      {
        kind: "service.orders_created",
        sessionId: parseOpeningSessionId("opening:1"),
        orders: [],
      },
      {
        kind: "service.capacity_limited",
        sessionId: parseOpeningSessionId("opening:1"),
        receptionCapacity: parseNonNegativeSafeInteger(1),
        preparationCapacity: parseNonNegativeSafeInteger(1),
      },
      {
        kind: "service.sale",
        sessionId: parseOpeningSessionId("opening:1"),
        recipeId: parseRecipeId("recipe.fixture"),
        quantity: parseQuantity(1),
        revenue: parseNonNegativeSafeInteger(1),
      },
      {
        kind: "levy.paid",
        amount: parseMoney(1),
        cash: { before: parseMoney(2), after: parseMoney(1) },
      },
    ];
    for (const executorFact of executorFacts) {
      expect(pocGameplayFactSchemaV1.parse(executorFact)).toEqual(executorFact);
    }
  });

  it("strictly validates every Effect kind against one explicit batch source", () => {
    const data = createPocGameplayFixtureV1().program.data;
    expect(pocEffectIntentKindsV1).toEqual([
      "calendar.ap.adjust",
      "reputation.adjust",
      "actor.stamina.adjust",
      "actor.mood.adjust",
      "relationship.affection.adjust",
      "relationship.teamwork.adjust",
      "relationship.stage.set",
      "tavern.helper.set",
      "inventory.grant",
      "inventory.consume",
      "inventory.item.grant",
      "inventory.item.consume",
      "aura.apply",
      "aura.clear",
      "fact.set",
      "quest.set",
      "outcome.set",
      "modifier.add",
      "ledger.append",
    ]);
    const source: PocEffectSourceV1 = { kind: "command", commandKind: "run.start" };
    const effect = {
      kind: "calendar.ap.adjust" as const,
      delta: 1,
      reasonId: "reason.fixture",
    };
    expect(pocEffectSourceSchemaV1.parse(source)).toEqual(source);
    expect(pocEffectIntentSchemaV1.parse(effect)).toEqual(effect);
    expect(validatePocEffectIntentForSourceV1(effect, source, data)).toEqual(effect);
    expect(() => pocEffectIntentSchemaV1.parse({ ...effect, unexpected: true })).toThrow();
    expect(() =>
      validatePocEffectIntentForSourceV1({ ...effect, reasonId: "reason.missing" }, source, data),
    ).toThrow(/unknown ReasonId/u);
    expect(() =>
      validatePocEffectIntentForSourceV1(
        {
          kind: "inventory.grant",
          lines: [{ ingredientId: "ingredient.fixture", quantity: 1 }],
          source: { kind: "story_action", actionId: "action.fixture_story" },
          reasonId: "reason.fixture",
        },
        { kind: "event", eventId: "event.fixture" },
        data,
      ),
    ).toThrow(/source.*provenance/u);

    expect(() =>
      validatePocEffectIntentForSourceV1(
        effect,
        { kind: "ending", endingId: data.content.endings[0]!.endingId },
        data,
      ),
    ).toThrow(/Ending batches accept only Progression/u);

    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        content: {
          ...data.content,
          storyActions: data.content.storyActions.map((action, index) =>
            index === 0
              ? {
                  ...action,
                  startEffects: [
                    {
                      kind: "ledger.append",
                      entry: {
                        category: "purchase",
                        reasonId: "reason.fixture",
                        cashDelta: -1,
                        valuationDelta: 1,
                        subject: { kind: "ingredient", ingredientId: "ingredient.fixture" },
                        quantity: 1,
                      },
                    },
                  ],
                }
              : action,
          ),
        },
      }),
    ).toThrow(/dedicated owner operation/u);
  });

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
    expectTypeOf<
      Extract<TavernPreviewInputV1, { readonly basis: "current_state" }>
    >().toHaveProperty("resources");
    expectTypeOf<
      Extract<TavernPreviewInputV1, { readonly basis: "active_opening_baseline" }>
    >().toHaveProperty("session");
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
    expect(data.content.endings.map((ending) => Object.keys(ending))).toEqual([
      ["endingId", "status", "nameTextId", "summaryOutcomeIds", "effects"],
      ["endingId", "status", "nameTextId", "summaryOutcomeIds", "effects"],
      ["endingId", "status", "nameTextId", "summaryOutcomeIds", "effects"],
    ]);
    expect(data.content.endings.map(({ endingId, status }) => ({ endingId, status }))).toEqual([
      { endingId: "ending.fixture", status: "completed_stable" },
      { endingId: "ending.fixture_danger", status: "completed_danger" },
      { endingId: "ending.fixture_arrears", status: "failed_arrears" },
    ]);
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
      "purchaseQuantityPerLineLimit",
      "menuRecipeLimit",
      "menuPortionsPerRecipeLimit",
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

  it("binds every terminal status and ending summary role explicitly", () => {
    const data = createPocGameplayFixtureV1().program.data;
    const [stable, danger, arrears] = data.content.endings;
    if (stable === undefined || danger === undefined || arrears === undefined) {
      throw new TypeError("incomplete ending fixture");
    }

    const parseWithEndings = (endings: readonly unknown[]) =>
      pocSimulationDataSchemaV1.parse({
        ...data,
        content: { ...data.content, endings },
      });

    expect(() => parseWithEndings(data.content.endings.toReversed())).not.toThrow();
    expect(() => parseWithEndings([stable, danger])).toThrow();
    expect(() =>
      parseWithEndings([stable, { ...danger, status: "completed_stable" }, arrears]),
    ).toThrow();
    expect(() =>
      parseWithEndings([
        stable,
        {
          ...danger,
          summaryOutcomeIds: {
            relationship: danger.summaryOutcomeIds.investigation,
            investigation: danger.summaryOutcomeIds.relationship,
          },
        },
        arrears,
      ]),
    ).toThrow();
    expect(() =>
      parseWithEndings([
        {
          ...stable,
          summaryOutcomeIds: {
            relationship: stable.summaryOutcomeIds.relationship,
            investigation: stable.summaryOutcomeIds.relationship,
          },
        },
        danger,
        arrears,
      ]),
    ).toThrow();
    expect(() =>
      parseWithEndings([
        {
          ...stable,
          summaryOutcomeIds: {
            ...stable.summaryOutcomeIds,
            relationship: "outcome.fixture.missing",
          },
        },
        danger,
        arrears,
      ]),
    ).toThrow();
    expect(() =>
      parseWithEndings([
        {
          ...stable,
          effects: [
            {
              kind: "reputation.adjust",
              delta: 1,
              reasonId: "reason.fixture",
            },
          ],
        },
        danger,
        arrears,
      ]),
    ).toThrow();
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
