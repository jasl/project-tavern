// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  parseActionId,
  parseActorId,
  parseBatchId,
  parseCheckBandId,
  parseCheckId,
  parseChoiceId,
  parseCustomerSegmentId,
  parseEventId,
  parseFactId,
  parseIngredientId,
  parseOutcomeId,
  parseQuestId,
  parseReasonId,
  parseRecipeId,
  parseSceneId,
  parseStoryToken,
  parseWorldStepId,
} from "../gameplay/contracts/ids.js";
import type {
  ChangeReasonV1,
  CheckDefinitionV1,
  CheckResultV1,
  FactDefinitionV1,
  OpeningBaselineV1,
  OutcomeDefinitionV1,
  QuestDefinitionV1,
  ResolvedCheckV1,
} from "../gameplay/contracts/types.js";
import {
  parseAttributeBonus,
  parseDayIndex,
  parseDieFace,
  parseMoney,
  parseMoodPoint,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseQuantity,
  parseSafeInteger,
} from "../gameplay/contracts/values.js";
import {
  pocProgressionDependencyPortsSchemaV1,
  pocProgressionOwnerOperationSchemaV1,
} from "../gameplay/modules/progression/contract.js";
import {
  createPocProgressionGameplayModuleV1,
  createPocProgressionReadPortV1,
  pocProgressionOwnerV1,
} from "../gameplay/modules/progression/module.js";
import {
  pocWorkflowDependencyPortsSchemaV1,
  pocWorkflowOwnerOperationSchemaV1,
} from "../gameplay/modules/workflow/contract.js";
import type { PocWorkflowDependencyPortsV1 } from "../gameplay/modules/workflow/contract.js";
import {
  createPocWorkflowReadPortV1,
  pocWorkflowGameplayModuleV1,
  pocWorkflowOwnerV1,
} from "../gameplay/modules/workflow/module.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

function requireProposedV1<TProposal>(
  result:
    | { readonly kind: "proposed"; readonly proposal: TProposal }
    | { readonly kind: "rejected"; readonly rejection: unknown },
): TProposal {
  if (result.kind !== "proposed") throw new TypeError("expected proposed owner operation");
  return result.proposal;
}

function openingBaselineFixtureV1(): OpeningBaselineV1 {
  const simulation = createPocGameplayFixtureV1().snapshot.state.simulation;
  return {
    startedAtSequence: parsePositiveSafeInteger(1),
    day: parseDayIndex(1),
    mode: "manual",
    preparationActionCount: parseNonNegativeSafeInteger(0),
    ap: {
      before: parseNonNegativeSafeInteger(1),
      after: parseNonNegativeSafeInteger(0),
    },
    playerStamina: {
      before: parseNonNegativeSafeInteger(10),
      after: parseNonNegativeSafeInteger(9),
    },
    heroineStamina: {
      before: parseNonNegativeSafeInteger(10),
      after: parseNonNegativeSafeInteger(9),
    },
    cashAtStart: { before: parseMoney(100), after: parseMoney(100) },
    reputationBeforeStart: simulation.tavern.reputation,
    menu: [{ recipeId: parseRecipeId("recipe.fixture"), portions: parseQuantity(1) }],
    preparedPortions: [{ recipeId: parseRecipeId("recipe.fixture"), portions: parseQuantity(1) }],
    consumedIngredients: [
      {
        batchId: parseBatchId("batch:initial:0"),
        ingredientId: parseIngredientId("ingredient.fixture"),
        quantity: parseQuantity(1),
      },
    ],
    demand: [
      {
        segmentId: parseCustomerSegmentId("segment.fixture"),
        preview: { min: parseSafeInteger(1), max: parseSafeInteger(1) },
        actualCustomers: parseNonNegativeSafeInteger(1),
        modifiers: [],
      },
    ],
    actors: {
      playerAttributes: simulation.actors.player.attributes,
      heroineMood: parseMoodPoint(simulation.actors.heroine.mood),
      relationship: simulation.actors.relationship,
      helper: simulation.tavern.helper,
    },
    facilityIds: [],
    modifiers: [],
    startEntryIds: [],
  };
}

function workflowDependenciesV1(kind: PocWorkflowDependencyPortsV1["kind"]) {
  return pocWorkflowDependencyPortsSchemaV1.parse({ kind });
}

function worldBeginDependenciesV1() {
  return pocWorkflowDependencyPortsSchemaV1.parse({
    kind: "workflow.begin_world_action",
    beginStepId: parseWorldStepId("world_step.fixture.begin"),
    completionStepId: parseWorldStepId("world_step.fixture.complete"),
    preparationBonus: parseSafeInteger(0),
    startedAtSequence: parsePositiveSafeInteger(1),
    startedDay: parseDayIndex(1),
    startedPhase: "morning",
    paidCostEntryIds: [],
  });
}

function progressionInitialV1() {
  const story = createPocGameplayFixtureV1().snapshot.state.story;
  return {
    facts: story.facts,
    quests: story.quests,
    outcomes: story.outcomes,
    resolvedChecks: story.resolvedChecks,
  };
}

function fixtureFactDefinitionV1(): FactDefinitionV1 {
  const definition = createPocGameplayFixtureV1().program.data.stateDefinitions.facts.find(
    ({ factId }) => factId === "fact.fixture",
  );
  if (definition === undefined) throw new TypeError("missing fixture Fact definition");
  return definition;
}

function fixtureQuestDefinitionV1(): QuestDefinitionV1 {
  const definition = createPocGameplayFixtureV1().program.data.stateDefinitions.quests.find(
    ({ questId }) => questId === "quest.fixture",
  );
  if (definition === undefined) throw new TypeError("missing fixture Quest definition");
  return definition;
}

function fixtureOutcomeDefinitionV1(): OutcomeDefinitionV1 {
  const definition = createPocGameplayFixtureV1().program.data.stateDefinitions.outcomes.find(
    ({ outcomeId }) => outcomeId === "outcome.fixture.relationship",
  );
  if (definition === undefined) throw new TypeError("missing fixture Outcome definition");
  return definition;
}

function fixtureCheckDefinitionV1(): CheckDefinitionV1 {
  const definition = createPocGameplayFixtureV1().program.data.content.checks.find(
    ({ checkId }) => checkId === "check.fixture",
  );
  if (definition === undefined) throw new TypeError("missing fixture Check definition");
  return definition;
}

function fixtureReasonV1(): ChangeReasonV1 {
  return {
    kind: "event",
    eventId: parseEventId("event.fixture"),
    reasonId: parseReasonId("reason.fixture"),
  };
}

function checkResultFixtureV1(): CheckResultV1 {
  return {
    checkId: parseCheckId("check.fixture"),
    actorId: parseActorId("actor.player"),
    dice: [parseDieFace(3), parseDieFace(4)],
    attributeBonus: parseAttributeBonus(0),
    preparationBonus: parseSafeInteger(0),
    modifiers: [],
    totalBonus: parseSafeInteger(0),
    total: parseSafeInteger(7),
    bandId: parseCheckBandId("band.fixture"),
    effects: [],
  };
}

function resolvedCheckFixtureV1(sequence = 1): ResolvedCheckV1 {
  const result = checkResultFixtureV1();
  return {
    checkId: result.checkId,
    actorId: result.actorId,
    dice: result.dice,
    attributeBonus: result.attributeBonus,
    preparationBonus: result.preparationBonus,
    modifiers: result.modifiers,
    totalBonus: result.totalBonus,
    total: result.total,
    bandId: result.bandId,
    resolvedAtSequence: parsePositiveSafeInteger(sequence),
  };
}

function contributionCheckFixtureV1(): {
  readonly definition: CheckDefinitionV1;
  readonly result: CheckResultV1;
  readonly check: ResolvedCheckV1;
} {
  const checkId = parseCheckId("check.fixture_contribution");
  const effect = {
    kind: "reputation.adjust" as const,
    delta: parseSafeInteger(1),
    reasonId: parseReasonId("reason.fixture"),
  };
  const modifier = {
    modifier: {
      kind: "check.add" as const,
      source: { kind: "event" as const, eventId: parseEventId("event.fixture") },
      checkId,
      amount: parseSafeInteger(2),
      reasonId: parseReasonId("reason.fixture"),
    },
    contribution: parseSafeInteger(2),
  };
  const result: CheckResultV1 = {
    checkId,
    actorId: parseActorId("actor.player"),
    dice: [parseDieFace(3), parseDieFace(4)],
    attributeBonus: parseAttributeBonus(1),
    preparationBonus: parseSafeInteger(1),
    modifiers: [modifier],
    totalBonus: parseSafeInteger(4),
    total: parseSafeInteger(11),
    bandId: parseCheckBandId("band.fixture_high"),
    effects: [effect],
  };
  return {
    definition: {
      checkId,
      attribute: fixtureCheckDefinitionV1().attribute,
      dice: "2d6",
      bands: [
        {
          bandId: parseCheckBandId("band.fixture_low"),
          minInclusive: parseSafeInteger(2),
          maxInclusive: parseSafeInteger(10),
          effects: [],
        },
        {
          bandId: parseCheckBandId("band.fixture_high"),
          minInclusive: parseSafeInteger(11),
          maxInclusive: null,
          effects: [effect],
        },
      ],
    },
    result,
    check: {
      checkId: result.checkId,
      actorId: result.actorId,
      dice: result.dice,
      attributeBonus: result.attributeBonus,
      preparationBonus: result.preparationBonus,
      modifiers: result.modifiers,
      totalBonus: result.totalBonus,
      total: result.total,
      bandId: result.bandId,
      resolvedAtSequence: parsePositiveSafeInteger(1),
    },
  };
}

describe("PoC Workflow and Progression ownership", () => {
  it("exports the static Workflow and data-bound Progression modules", async () => {
    const fixture = createPocGameplayFixtureV1();
    const initial = progressionInitialV1();
    const alternate = {
      ...initial,
      facts: [
        {
          factId: parseFactId("fact.fixture"),
          value: { kind: "boolean" as const, value: true },
        },
      ],
    };
    const first = createPocProgressionGameplayModuleV1(initial);
    const second = createPocProgressionGameplayModuleV1(alternate);
    const gameplay = await import("../gameplay/index.js");

    expect(pocWorkflowGameplayModuleV1.createInitialState(fixture.bootstrap)).toBeNull();
    expect(createPocWorkflowReadPortV1(null)).toBeNull();
    expect(first.createInitialState(fixture.bootstrap)).toEqual(initial);
    expect(second.createInitialState(fixture.bootstrap)).toEqual(alternate);
    expect(first.createInitialState(fixture.bootstrap)).not.toEqual(
      second.createInitialState(fixture.bootstrap),
    );
    expect(Object.isFrozen(first.createInitialState(fixture.bootstrap))).toBe(true);
    expect(Object.isFrozen(first.createInitialState(fixture.bootstrap).facts)).toBe(true);
    expect(Object.isFrozen(second.createInitialState(fixture.bootstrap).facts[0])).toBe(true);
    expect(Object.isFrozen(second.createInitialState(fixture.bootstrap).facts[0]?.value)).toBe(
      true,
    );
    expect(createPocProgressionReadPortV1(initial)).toEqual(initial);
    expect(pocWorkflowGameplayModuleV1.descriptor.id).toBe("module.workflow");
    expect(first.descriptor.id).toBe("module.progression");
    expect(gameplay.pocWorkflowGameplayModuleV1).toBe(pocWorkflowGameplayModuleV1);
    expect(gameplay.createPocProgressionGameplayModuleV1).toBe(
      createPocProgressionGameplayModuleV1,
    );
    expect(() =>
      createPocProgressionGameplayModuleV1({
        ...initial,
        resolvedChecks: [resolvedCheckFixtureV1()],
      }),
    ).toThrow(/initial|resolved.?check/u);
    const unstableInitialStates = [
      {
        ...initial,
        facts: [
          { factId: parseFactId("fact.z"), value: { kind: "boolean" as const, value: true } },
          { factId: parseFactId("fact.a"), value: { kind: "boolean" as const, value: false } },
        ],
      },
      {
        ...initial,
        quests: [
          {
            questId: parseQuestId("quest.z"),
            status: "active" as const,
            progress: parseNonNegativeSafeInteger(0),
            target: parsePositiveSafeInteger(1),
          },
          {
            questId: parseQuestId("quest.a"),
            status: "locked" as const,
            progress: parseNonNegativeSafeInteger(0),
            target: parsePositiveSafeInteger(1),
          },
        ],
      },
      {
        ...initial,
        outcomes: [
          {
            outcomeId: parseOutcomeId("outcome.z"),
            value: { kind: "token" as const, value: parseStoryToken("token.fixture.neutral") },
          },
          {
            outcomeId: parseOutcomeId("outcome.a"),
            value: { kind: "token" as const, value: parseStoryToken("token.fixture.neutral") },
          },
        ],
      },
    ];
    for (const unstable of unstableInitialStates) {
      expect(() => createPocProgressionGameplayModuleV1(unstable)).toThrow(
        /invariant|order|stable/u,
      );
    }
  });

  it("keeps one Opening baseline through exact checkpoint transitions", () => {
    const baseline = openingBaselineFixtureV1();
    const started = requireProposedV1(
      pocWorkflowOwnerV1.propose(
        null,
        { kind: "workflow.start_opening", baseline },
        pocWorkflowDependencyPortsSchemaV1.parse({
          kind: "workflow.start_opening",
          commandSequence: parsePositiveSafeInteger(1),
        }),
      ),
    );
    let state = pocWorkflowOwnerV1.apply(null, started);

    expect(state).toMatchObject({
      kind: "opening",
      sessionId: "opening:1",
      checkpoint: "started",
      triggeredEventIds: [],
      sessionModifiers: [],
      blockingEvent: null,
    });
    if (state?.kind !== "opening") throw new TypeError("expected Opening workflow");
    if (started.payload.activeWorkflow?.kind !== "opening") {
      throw new TypeError("expected proposed Opening workflow");
    }
    expect(state.baseline).toBe(started.payload.activeWorkflow.baseline);
    expect(started.facts).toEqual([
      { kind: "opening.started", sessionId: "opening:1", checkpoint: "started" },
    ]);
    expect(
      pocWorkflowOwnerV1.propose(
        state,
        { kind: "workflow.finalize_opening" },
        workflowDependenciesV1("workflow.finalize_opening"),
      ),
    ).toEqual({
      kind: "rejected",
      rejection: { code: "tavern.opening_not_ready", details: { checkpoint: "started" } },
    });

    const expectedTransitions = [
      ["started", "middle"],
      ["middle", "before_finalize"],
      ["before_finalize", "ready_to_finalize"],
    ] as const;
    for (const [from, to] of expectedTransitions) {
      if (state?.kind !== "opening") throw new TypeError("expected Opening workflow");
      const previous = state;
      const proposal = requireProposedV1(
        pocWorkflowOwnerV1.propose(
          state,
          { kind: "workflow.advance_opening_checkpoint" },
          workflowDependenciesV1("workflow.advance_opening_checkpoint"),
        ),
      );
      state = pocWorkflowOwnerV1.apply(state, proposal);
      expect(state).toEqual({ ...previous, checkpoint: to });
      expect(proposal.facts).toEqual([
        {
          kind: "opening.checkpoint_advanced",
          sessionId: "opening:1",
          from,
          to,
        },
      ]);
    }
    expect(
      pocWorkflowOwnerV1.propose(
        state,
        { kind: "workflow.advance_opening_checkpoint" },
        workflowDependenciesV1("workflow.advance_opening_checkpoint"),
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "tavern.opening_continue_not_needed",
        details: { checkpoint: "ready_to_finalize" },
      },
    });
    const finalized = requireProposedV1(
      pocWorkflowOwnerV1.propose(
        state,
        { kind: "workflow.finalize_opening" },
        workflowDependenciesV1("workflow.finalize_opening"),
      ),
    );
    expect(pocWorkflowOwnerV1.apply(state, finalized)).toBeNull();
    expect(finalized.facts).toEqual([]);
    expect(() => pocWorkflowOwnerV1.apply(state, started)).toThrow(/stale/u);
  });

  it("separates Opening event recording, modifiers, blocking, and continuation", () => {
    const started = requireProposedV1(
      pocWorkflowOwnerV1.propose(
        null,
        { kind: "workflow.start_opening", baseline: openingBaselineFixtureV1() },
        pocWorkflowDependencyPortsSchemaV1.parse({
          kind: "workflow.start_opening",
          commandSequence: parsePositiveSafeInteger(1),
        }),
      ),
    );
    let state = pocWorkflowOwnerV1.apply(null, started);
    const recorded = requireProposedV1(
      pocWorkflowOwnerV1.propose(
        state,
        { kind: "workflow.record_opening_event", eventId: parseEventId("event.fixture") },
        pocWorkflowDependencyPortsSchemaV1.parse({
          kind: "workflow.record_opening_event",
          checkpoint: "started",
        }),
      ),
    );
    state = pocWorkflowOwnerV1.apply(state, recorded);
    expect(
      pocWorkflowOwnerV1.propose(
        state,
        { kind: "workflow.record_opening_event", eventId: parseEventId("event.fixture") },
        pocWorkflowDependencyPortsSchemaV1.parse({
          kind: "workflow.record_opening_event",
          checkpoint: "started",
        }),
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "engine.invariant_rejected",
        details: { invariantCode: "collection.duplicate_id" },
      },
    });
    const modifier = {
      kind: "check.add" as const,
      source: { kind: "event" as const, eventId: parseEventId("event.fixture") },
      checkId: parseCheckId("check.fixture"),
      amount: parseSafeInteger(1),
      reasonId: parseReasonId("reason.fixture"),
    };
    const modified = requireProposedV1(
      pocWorkflowOwnerV1.propose(
        state,
        { kind: "workflow.add_opening_modifier", modifier },
        pocWorkflowDependencyPortsSchemaV1.parse({
          kind: "workflow.add_opening_modifier",
          sourceEventId: parseEventId("event.fixture"),
        }),
      ),
    );
    state = pocWorkflowOwnerV1.apply(state, modified);
    const blocked = requireProposedV1(
      pocWorkflowOwnerV1.propose(
        state,
        {
          kind: "workflow.set_opening_blocking_event",
          blockingEvent: {
            eventId: parseEventId("event.fixture"),
            sceneId: parseSceneId("scene.fixture"),
          },
        },
        pocWorkflowDependencyPortsSchemaV1.parse({
          kind: "workflow.set_opening_blocking_event",
          checkpoint: "started",
        }),
      ),
    );
    state = pocWorkflowOwnerV1.apply(state, blocked);

    expect(state).toMatchObject({
      kind: "opening",
      checkpoint: "started",
      triggeredEventIds: ["event.fixture"],
      sessionModifiers: [modifier],
      blockingEvent: { eventId: "event.fixture", sceneId: "scene.fixture" },
    });
    expect(() =>
      pocWorkflowOwnerV1.propose(
        state,
        {
          kind: "workflow.set_opening_blocking_event",
          blockingEvent: {
            eventId: parseEventId("event.fixture"),
            sceneId: parseSceneId("scene.fixture"),
          },
        },
        pocWorkflowDependencyPortsSchemaV1.parse({
          kind: "workflow.set_opening_blocking_event",
          checkpoint: "started",
        }),
      ),
    ).toThrow(/blocking|multiple/u);
    expect(
      pocWorkflowOwnerV1.propose(
        state,
        { kind: "workflow.advance_opening_checkpoint" },
        workflowDependenciesV1("workflow.advance_opening_checkpoint"),
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "tavern.opening_checkpoint_blocked",
        details: { checkpoint: "started", eventId: "event.fixture" },
      },
    });

    const cleared = requireProposedV1(
      pocWorkflowOwnerV1.propose(
        state,
        {
          kind: "workflow.clear_opening_blocking_event",
          eventId: parseEventId("event.fixture"),
        },
        workflowDependenciesV1("workflow.clear_opening_blocking_event"),
      ),
    );
    const unblocked = pocWorkflowOwnerV1.apply(state, cleared);
    expect(unblocked).toMatchObject({
      kind: "opening",
      checkpoint: "started",
      triggeredEventIds: ["event.fixture"],
      sessionModifiers: [modifier],
      blockingEvent: null,
    });
  });

  it("rejects Workflow replay chronology mismatches", () => {
    const baseline = {
      ...openingBaselineFixtureV1(),
      startedAtSequence: parsePositiveSafeInteger(2),
    };
    expect(() =>
      pocWorkflowOwnerV1.propose(
        null,
        { kind: "workflow.start_opening", baseline },
        pocWorkflowDependencyPortsSchemaV1.parse({
          kind: "workflow.start_opening",
          commandSequence: parsePositiveSafeInteger(1),
        }),
      ),
    ).toThrow(/baseline|sequence/u);

    const started = requireProposedV1(
      pocWorkflowOwnerV1.propose(
        null,
        {
          kind: "workflow.begin_world_action",
          actionId: parseActionId("action.fixture_world"),
          optionId: parseChoiceId("choice.fixture_world"),
        },
        worldBeginDependenciesV1(),
      ),
    );
    const state = pocWorkflowOwnerV1.apply(null, started);
    expect(() =>
      pocWorkflowOwnerV1.propose(
        state,
        {
          kind: "workflow.record_world_action_choice",
          choiceId: parseChoiceId("choice.fixture_world_narrative"),
        },
        pocWorkflowDependencyPortsSchemaV1.parse({
          kind: "workflow.record_world_action_choice",
          committedAtSequence: parsePositiveSafeInteger(1),
        }),
      ),
    ).toThrow(/choice|sequence/u);
  });

  it("preserves Opening modifier source order across triggered events", () => {
    const started = requireProposedV1(
      pocWorkflowOwnerV1.propose(
        null,
        { kind: "workflow.start_opening", baseline: openingBaselineFixtureV1() },
        pocWorkflowDependencyPortsSchemaV1.parse({
          kind: "workflow.start_opening",
          commandSequence: parsePositiveSafeInteger(1),
        }),
      ),
    );
    let state = pocWorkflowOwnerV1.apply(null, started);
    for (const eventId of [parseEventId("event.fixture_a"), parseEventId("event.fixture_b")]) {
      const recorded = requireProposedV1(
        pocWorkflowOwnerV1.propose(
          state,
          { kind: "workflow.record_opening_event", eventId },
          pocWorkflowDependencyPortsSchemaV1.parse({
            kind: "workflow.record_opening_event",
            checkpoint: "started",
          }),
        ),
      );
      state = pocWorkflowOwnerV1.apply(state, recorded);
    }
    const modifierFor = (eventId: ReturnType<typeof parseEventId>) => ({
      kind: "check.add" as const,
      source: { kind: "event" as const, eventId },
      checkId: parseCheckId("check.fixture"),
      amount: parseSafeInteger(1),
      reasonId: parseReasonId("reason.fixture"),
    });
    const latest = requireProposedV1(
      pocWorkflowOwnerV1.propose(
        state,
        {
          kind: "workflow.add_opening_modifier",
          modifier: modifierFor(parseEventId("event.fixture_b")),
        },
        pocWorkflowDependencyPortsSchemaV1.parse({
          kind: "workflow.add_opening_modifier",
          sourceEventId: parseEventId("event.fixture_b"),
        }),
      ),
    );
    state = pocWorkflowOwnerV1.apply(state, latest);
    expect(() =>
      pocWorkflowOwnerV1.propose(
        state,
        {
          kind: "workflow.add_opening_modifier",
          modifier: modifierFor(parseEventId("event.fixture_a")),
        },
        pocWorkflowDependencyPortsSchemaV1.parse({
          kind: "workflow.add_opening_modifier",
          sourceEventId: parseEventId("event.fixture_a"),
        }),
      ),
    ).toThrow(/causal|modifier|order|source/u);
  });

  it("rejects concurrent Workflow installation with exact conflict details", () => {
    const started = requireProposedV1(
      pocWorkflowOwnerV1.propose(
        null,
        { kind: "workflow.start_opening", baseline: openingBaselineFixtureV1() },
        pocWorkflowDependencyPortsSchemaV1.parse({
          kind: "workflow.start_opening",
          commandSequence: parsePositiveSafeInteger(1),
        }),
      ),
    );
    const opening = pocWorkflowOwnerV1.apply(null, started);

    expect(
      pocWorkflowOwnerV1.propose(
        opening,
        {
          kind: "workflow.begin_world_action",
          actionId: parseActionId("action.fixture_world"),
          optionId: parseChoiceId("choice.fixture_world"),
        },
        worldBeginDependenciesV1(),
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "workflow.conflict",
        details: { activeKind: "opening", attemptedKind: "world_action" },
      },
    });
    expect(() =>
      pocWorkflowOwnerOperationSchemaV1.parse({
        kind: "workflow.advance_opening_checkpoint",
        extra: true,
      }),
    ).toThrow();
  });

  it("advances one WorldAction through the exact four progress values", () => {
    const started = requireProposedV1(
      pocWorkflowOwnerV1.propose(
        null,
        {
          kind: "workflow.begin_world_action",
          actionId: parseActionId("action.fixture_world"),
          optionId: parseChoiceId("choice.fixture_world"),
        },
        worldBeginDependenciesV1(),
      ),
    );
    let state = pocWorkflowOwnerV1.apply(null, started);
    expect(state).toMatchObject({
      kind: "world_action",
      actionId: "action.fixture_world",
      optionId: "choice.fixture_world",
      progress: "begin_scene",
      paidCostEntryIds: [],
      choices: [],
    });
    expect(started.facts).toEqual([
      {
        kind: "world.action_started",
        actionId: "action.fixture_world",
        stepId: "world_step.fixture.begin",
      },
    ]);

    const choice = requireProposedV1(
      pocWorkflowOwnerV1.propose(
        state,
        {
          kind: "workflow.record_world_action_choice",
          choiceId: parseChoiceId("choice.fixture_world_narrative"),
        },
        pocWorkflowDependencyPortsSchemaV1.parse({
          kind: "workflow.record_world_action_choice",
          committedAtSequence: parsePositiveSafeInteger(2),
        }),
      ),
    );
    state = pocWorkflowOwnerV1.apply(state, choice);
    expect(state).toMatchObject({
      kind: "world_action",
      progress: "begin_scene",
      choices: [{ choiceId: "choice.fixture_world_narrative", committedAtSequence: 2 }],
    });

    const transitions = [
      ["workflow.finish_world_action_begin_scene", "awaiting_completion_phase"],
      ["workflow.enter_world_action_completion_scene", "completion_scene"],
      ["workflow.finish_world_action_completion_scene", "ready_to_complete"],
    ] as const;
    for (const [kind, expected] of transitions) {
      if (state?.kind !== "world_action") throw new TypeError("expected WorldAction workflow");
      const previous = state;
      const proposal = requireProposedV1(
        pocWorkflowOwnerV1.propose(state, { kind }, workflowDependenciesV1(kind)),
      );
      state = pocWorkflowOwnerV1.apply(state, proposal);
      expect(state).toEqual({ ...previous, progress: expected });
      expect(proposal.facts).toEqual([]);
    }
    const completed = requireProposedV1(
      pocWorkflowOwnerV1.propose(
        state,
        {
          kind: "workflow.complete_world_action",
          bandId: parseCheckBandId("band.fixture"),
        },
        workflowDependenciesV1("workflow.complete_world_action"),
      ),
    );
    expect(pocWorkflowOwnerV1.apply(state, completed)).toBeNull();
    expect(completed.facts).toEqual([
      {
        kind: "world.action_completed",
        actionId: "action.fixture_world",
        bandId: "band.fixture",
      },
    ]);
    expect(
      pocWorkflowOwnerV1.propose(
        null,
        { kind: "workflow.complete_world_action", bandId: null },
        workflowDependenciesV1("workflow.complete_world_action"),
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "workflow.missing",
        details: { expectedKind: "world_action", commandKind: "world.action.complete" },
      },
    });
  });

  it("rejects illegal WorldAction progress skips without changing state", () => {
    const started = requireProposedV1(
      pocWorkflowOwnerV1.propose(
        null,
        {
          kind: "workflow.begin_world_action",
          actionId: parseActionId("action.fixture_world"),
          optionId: parseChoiceId("choice.fixture_world"),
        },
        worldBeginDependenciesV1(),
      ),
    );
    const state = pocWorkflowOwnerV1.apply(null, started);
    expect(() =>
      pocWorkflowOwnerV1.propose(
        state,
        { kind: "workflow.enter_world_action_completion_scene" },
        workflowDependenciesV1("workflow.enter_world_action_completion_scene"),
      ),
    ).toThrow(/progress|transition/u);
    expect(state).toMatchObject({ kind: "world_action", progress: "begin_scene" });
  });

  it("replaces declared Fact, Quest, and Outcome values in place with exact Facts", () => {
    const state = progressionInitialV1();
    const reason = fixtureReasonV1();
    const factProposal = requireProposedV1(
      pocProgressionOwnerV1.propose(
        state,
        {
          kind: "progression.fact.set",
          entry: {
            factId: parseFactId("fact.fixture"),
            value: { kind: "boolean", value: true },
          },
        },
        pocProgressionDependencyPortsSchemaV1.parse({
          kind: "progression.fact.set",
          definition: fixtureFactDefinitionV1(),
          reason,
        }),
      ),
    );
    const withFact = pocProgressionOwnerV1.apply(state, factProposal);
    expect(withFact.facts).toEqual([
      { factId: "fact.fixture", value: { kind: "boolean", value: true } },
    ]);
    expect(factProposal.facts).toEqual([
      {
        kind: "fact.set",
        factId: "fact.fixture",
        value: { kind: "boolean", value: true },
        reason,
      },
    ]);

    const quest = {
      questId: parseQuestId("quest.fixture"),
      status: "active" as const,
      progress: parseNonNegativeSafeInteger(1),
      target: parsePositiveSafeInteger(2),
    };
    const questProposal = requireProposedV1(
      pocProgressionOwnerV1.propose(
        withFact,
        { kind: "progression.quest.set", entry: quest },
        pocProgressionDependencyPortsSchemaV1.parse({
          kind: "progression.quest.set",
          definition: fixtureQuestDefinitionV1(),
          reason,
        }),
      ),
    );
    const withQuest = pocProgressionOwnerV1.apply(withFact, questProposal);
    expect(withQuest.quests).toEqual([quest]);
    expect(questProposal.facts).toEqual([{ kind: "quest.updated", quest, reason }]);

    const outcome = {
      outcomeId: parseOutcomeId("outcome.fixture.relationship"),
      value: { kind: "token" as const, value: parseStoryToken("token.fixture.neutral") },
    };
    const outcomeProposal = requireProposedV1(
      pocProgressionOwnerV1.propose(
        withQuest,
        { kind: "progression.outcome.set", entry: outcome },
        pocProgressionDependencyPortsSchemaV1.parse({
          kind: "progression.outcome.set",
          definition: fixtureOutcomeDefinitionV1(),
          reason,
        }),
      ),
    );
    const next = pocProgressionOwnerV1.apply(withQuest, outcomeProposal);
    expect(next.outcomes.map(({ outcomeId }) => outcomeId)).toEqual(
      state.outcomes.map(({ outcomeId }) => outcomeId),
    );
    expect(next.outcomes).toContainEqual(outcome);
    expect(outcomeProposal.facts).toEqual([
      {
        kind: "outcome.set",
        outcomeId: "outcome.fixture.relationship",
        value: outcome.value,
        reason,
      },
    ]);
    expect(next.resolvedChecks).toEqual(state.resolvedChecks);
    expect(() => pocProgressionOwnerV1.apply(next, factProposal)).toThrow(/stale/u);
  });

  it("rejects missing Progression references and definition-incompatible values", () => {
    const state = progressionInitialV1();
    const dependencies = pocProgressionDependencyPortsSchemaV1.parse({
      kind: "progression.fact.set",
      definition: fixtureFactDefinitionV1(),
      reason: fixtureReasonV1(),
    });

    expect(() =>
      pocProgressionOwnerV1.propose(
        state,
        {
          kind: "progression.fact.set",
          entry: {
            factId: parseFactId("fact.unknown"),
            value: { kind: "boolean", value: true },
          },
        },
        dependencies,
      ),
    ).toThrow(/fact|definition|reference/u);
    expect(() =>
      pocProgressionOwnerV1.propose(
        state,
        {
          kind: "progression.fact.set",
          entry: {
            factId: parseFactId("fact.fixture"),
            value: { kind: "integer", value: parseSafeInteger(1) },
          },
        },
        dependencies,
      ),
    ).toThrow(/fact|value|boolean|definition/u);
    expect(() =>
      pocProgressionOwnerOperationSchemaV1.parse({
        kind: "progression.fact.set",
        entry: state.facts[0],
        extra: true,
      }),
    ).toThrow();
    expect(() =>
      pocProgressionOwnerV1.propose(
        state,
        {
          kind: "progression.quest.set",
          entry: {
            questId: parseQuestId("quest.unknown"),
            status: "active",
            progress: parseNonNegativeSafeInteger(0),
            target: parsePositiveSafeInteger(1),
          },
        },
        pocProgressionDependencyPortsSchemaV1.parse({
          kind: "progression.quest.set",
          definition: fixtureQuestDefinitionV1(),
          reason: fixtureReasonV1(),
        }),
      ),
    ).toThrow(/definition|quest|reference/u);
    expect(() =>
      pocProgressionOwnerV1.propose(
        state,
        {
          kind: "progression.outcome.set",
          entry: {
            outcomeId: parseOutcomeId("outcome.unknown"),
            value: { kind: "token", value: parseStoryToken("token.fixture.neutral") },
          },
        },
        pocProgressionDependencyPortsSchemaV1.parse({
          kind: "progression.outcome.set",
          definition: fixtureOutcomeDefinitionV1(),
          reason: fixtureReasonV1(),
        }),
      ),
    ).toThrow(/definition|outcome|reference/u);
    expect(() =>
      pocProgressionOwnerV1.propose(
        state,
        {
          kind: "progression.outcome.set",
          entry: {
            outcomeId: parseOutcomeId("outcome.fixture.relationship"),
            value: { kind: "token", value: parseStoryToken("token.fixture.unknown") },
          },
        },
        pocProgressionDependencyPortsSchemaV1.parse({
          kind: "progression.outcome.set",
          definition: fixtureOutcomeDefinitionV1(),
          reason: fixtureReasonV1(),
        }),
      ),
    ).toThrow(/definition|outcome|token|value/u);
  });

  it("records one resolved Check with its validated result and rejects duplicates", () => {
    const state = progressionInitialV1();
    const result = checkResultFixtureV1();
    const dependencies = pocProgressionDependencyPortsSchemaV1.parse({
      kind: "progression.check.record",
      definition: fixtureCheckDefinitionV1(),
      result,
      commandSequence: parsePositiveSafeInteger(1),
    });
    const proposal = requireProposedV1(
      pocProgressionOwnerV1.propose(
        state,
        { kind: "progression.check.record", check: resolvedCheckFixtureV1() },
        dependencies,
      ),
    );
    const next = pocProgressionOwnerV1.apply(state, proposal);

    expect(next.resolvedChecks).toEqual([resolvedCheckFixtureV1()]);
    expect(proposal.facts).toEqual([{ kind: "check.resolved", result }]);
    expect(
      pocProgressionOwnerV1.propose(
        next,
        { kind: "progression.check.record", check: resolvedCheckFixtureV1(2) },
        pocProgressionDependencyPortsSchemaV1.parse({
          kind: "progression.check.record",
          definition: fixtureCheckDefinitionV1(),
          result,
          commandSequence: parsePositiveSafeInteger(2),
        }),
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "engine.invariant_rejected",
        details: { invariantCode: "collection.duplicate_id" },
      },
    });
    expect(() =>
      Reflect.apply(pocProgressionOwnerV1.propose, pocProgressionOwnerV1, [
        next,
        { kind: "progression.check.record", check: resolvedCheckFixtureV1(2) },
        {
          kind: "progression.check.record",
          definition: fixtureCheckDefinitionV1(),
          result,
          commandSequence: parsePositiveSafeInteger(2),
          extra: true,
        },
      ]),
    ).toThrow(/dependenc|field|invalid/u);
  });

  it("rejects Check formula, band, effects, and sequence mismatches", () => {
    const state = progressionInitialV1();
    const result = checkResultFixtureV1();
    const definition = fixtureCheckDefinitionV1();

    expect(() =>
      pocProgressionOwnerV1.propose(
        state,
        {
          kind: "progression.check.record",
          check: { ...resolvedCheckFixtureV1(), total: parseSafeInteger(8) },
        },
        pocProgressionDependencyPortsSchemaV1.parse({
          kind: "progression.check.record",
          definition,
          result,
          commandSequence: parsePositiveSafeInteger(1),
        }),
      ),
    ).toThrow(/check|result|formula|total/u);
    expect(() =>
      pocProgressionOwnerV1.propose(
        state,
        { kind: "progression.check.record", check: resolvedCheckFixtureV1(2) },
        pocProgressionDependencyPortsSchemaV1.parse({
          kind: "progression.check.record",
          definition,
          result,
          commandSequence: parsePositiveSafeInteger(1),
        }),
      ),
    ).toThrow(/check|sequence|command/u);
    expect(() =>
      pocProgressionDependencyPortsSchemaV1.parse({
        kind: "progression.check.record",
        definition,
        result: { ...result, bandId: parseCheckBandId("band.unknown") },
        commandSequence: parsePositiveSafeInteger(1),
      }),
    ).toThrow(/band|check|result/u);

    const contribution = contributionCheckFixtureV1();
    const contributionDependencies = pocProgressionDependencyPortsSchemaV1.parse({
      kind: "progression.check.record",
      definition: contribution.definition,
      result: contribution.result,
      commandSequence: parsePositiveSafeInteger(1),
    });
    expect(
      requireProposedV1(
        pocProgressionOwnerV1.propose(
          state,
          { kind: "progression.check.record", check: contribution.check },
          contributionDependencies,
        ),
      ).facts,
    ).toEqual([{ kind: "check.resolved", result: contribution.result }]);
    expect(() =>
      pocProgressionDependencyPortsSchemaV1.parse({
        kind: "progression.check.record",
        definition: contribution.definition,
        result: { ...contribution.result, totalBonus: parseSafeInteger(3) },
        commandSequence: parsePositiveSafeInteger(1),
      }),
    ).toThrow(/bonus|formula|result|total/u);
    expect(() =>
      pocProgressionDependencyPortsSchemaV1.parse({
        kind: "progression.check.record",
        definition: contribution.definition,
        result: {
          ...contribution.result,
          bandId: parseCheckBandId("band.fixture_low"),
        },
        commandSequence: parsePositiveSafeInteger(1),
      }),
    ).toThrow(/band|result|total/u);
    expect(() =>
      pocProgressionDependencyPortsSchemaV1.parse({
        kind: "progression.check.record",
        definition: contribution.definition,
        result: { ...contribution.result, effects: [] },
        commandSequence: parsePositiveSafeInteger(1),
      }),
    ).toThrow(/effect|band|result/u);
  });
});
