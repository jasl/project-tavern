// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  createValidatedPocRulesV1,
  deepFreezePocValueV1,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseQuantity,
  parseWorldStepId,
  pocGameCommandKindsV1,
  pocGameCommandSchemaV1,
  pocSimulationDataSchemaV1,
  type PocGameCommandV1,
  type PocGameSnapshotV1,
  type PocSimulationProgramV1,
} from "../gameplay/index.js";
import { createPocGameCommandExecutorV1 } from "../gameplay/game-command-executor.js";
import { createPocGameplayModuleTupleV1 } from "../gameplay/modules/index.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

function requireCommittedV1(
  executor: ReturnType<typeof createPocGameCommandExecutorV1>,
  snapshot: PocGameSnapshotV1,
  command: PocGameCommandV1,
): PocGameSnapshotV1 {
  const attempt = executor.executeAttempt(snapshot, command, undefined);
  expect(attempt.result.kind, JSON.stringify(attempt)).toBe("committed");
  if (attempt.result.kind !== "committed") {
    throw new TypeError(`expected ${command.kind} to commit`);
  }
  return attempt.result.snapshot;
}

function createExecutorV1(program: PocSimulationProgramV1) {
  return createPocGameCommandExecutorV1(program, createPocGameplayModuleTupleV1(program));
}

function startAndActivateV1(fixture: ReturnType<typeof createPocGameplayFixtureV1>): {
  readonly executor: ReturnType<typeof createPocGameCommandExecutorV1>;
  readonly snapshot: PocGameSnapshotV1;
} {
  const executor = createExecutorV1(fixture.program);
  const started = requireCommittedV1(executor, fixture.snapshot, { kind: "run.start" });
  const snapshot = requireCommittedV1(executor, started, {
    kind: "policy.choose",
    policyId: fixture.program.data.balance.lifePolicies[0]!.policyId,
  });
  return { executor, snapshot };
}

function replaceSnapshotStateV1(
  snapshot: PocGameSnapshotV1,
  state: PocGameSnapshotV1["state"],
): PocGameSnapshotV1 {
  return deepFreezePocValueV1({ ...snapshot, state });
}

function withNarrativeScenesV1(
  fixture: ReturnType<typeof createPocGameplayFixtureV1>,
  scenes: unknown,
): PocSimulationProgramV1 {
  return withProgramDataV1(fixture, {
    ...fixture.program.data,
    narrative: { scenes },
  });
}

function withProgramDataV1(
  fixture: ReturnType<typeof createPocGameplayFixtureV1>,
  dataValue: unknown,
): PocSimulationProgramV1 {
  const data = pocSimulationDataSchemaV1.parse(dataValue);
  return deepFreezePocValueV1({
    data,
    rules: createValidatedPocRulesV1(data, fixture.program.rules),
  });
}

function withEventsV1(
  fixture: ReturnType<typeof createPocGameplayFixtureV1>,
  events: unknown,
): PocSimulationProgramV1 {
  return withProgramDataV1(fixture, {
    ...fixture.program.data,
    content: { ...fixture.program.data.content, events },
  });
}

describe("PoC core game-command executor", () => {
  it("strictly parses the closed 17-kind command union", () => {
    const fixture = createPocGameplayFixtureV1();
    const policyId = fixture.program.data.balance.lifePolicies[0]!.policyId;
    const ingredientId = fixture.program.data.content.ingredients[0]!.ingredientId;
    const recipeId = fixture.program.data.content.recipes[0]!.recipeId;
    const storyActionId = fixture.program.data.content.storyActions[0]!.actionId;
    const facilityOpportunity = fixture.program.data.content.facilityOpportunities[0]!;
    const worldAction = fixture.program.data.content.worldActions[0]!;
    const narrativeScene = fixture.program.data.narrative.scenes[0]!;
    const narrativeNode = narrativeScene.nodes[0]!;
    const commands: readonly PocGameCommandV1[] = [
      { kind: "run.start" },
      { kind: "policy.choose", policyId },
      { kind: "inventory.buy", lines: [{ ingredientId, quantity: parseQuantity(1) }] },
      { kind: "actor.prepare_food" },
      { kind: "actor.rest" },
      { kind: "story.action.start", actionId: storyActionId },
      {
        kind: "facility.choose",
        opportunityId: facilityOpportunity.opportunityId,
        choice: { kind: "build", facilityId: facilityOpportunity.facilityIds[0]! },
      },
      {
        kind: "tavern.plan.set",
        plan: { mode: "manual", menu: [{ recipeId, portions: parseQuantity(1) }] },
      },
      { kind: "tavern.opening.start" },
      { kind: "tavern.opening.continue" },
      { kind: "tavern.opening.finalize" },
      {
        kind: "world.action.begin",
        actionId: worldAction.actionId,
        optionId: worldAction.options[0]!.optionId,
      },
      { kind: "world.action.complete" },
      { kind: "narrative.advance" },
      {
        kind: "narrative.choose",
        sceneId: narrativeScene.sceneId,
        nodeId: narrativeNode.nodeId,
        choiceId: worldAction.options[0]!.optionId,
      },
      { kind: "calendar.advance_phase" },
      { kind: "levy.pay" },
    ];

    expect(pocGameCommandKindsV1).toEqual(commands.map(({ kind }) => kind));
    expect(Object.isFrozen(pocGameCommandKindsV1)).toBe(true);
    for (const command of commands) {
      const parsed = pocGameCommandSchemaV1.parse(command);
      expect(parsed).toEqual(command);
      expect(Object.isFrozen(parsed)).toBe(true);
    }

    expect(() => pocGameCommandSchemaV1.parse({ kind: "run.start", extra: true })).toThrow();
    expect(() =>
      pocGameCommandSchemaV1.parse({
        kind: "inventory.buy",
        lines: [
          { ingredientId, quantity: 1 },
          { ingredientId, quantity: 1 },
        ],
      }),
    ).toThrow();
    expect(() =>
      pocGameCommandSchemaV1.parse({
        kind: "tavern.plan.set",
        plan: { mode: "closed", menu: [{ recipeId, portions: 1 }] },
      }),
    ).toThrow();
  });

  it("requires the closed generic Action map and player-only Check requests", () => {
    const fixture = createPocGameplayFixtureV1();
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...fixture.program.data,
        content: {
          ...fixture.program.data.content,
          actions: fixture.program.data.content.actions.filter(
            ({ commandKind }) => commandKind !== "inventory.buy",
          ),
        },
      }),
    ).toThrow();

    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...fixture.program.data,
        narrative: {
          scenes: [
            {
              sceneId: "scene.fixture",
              entryNodeId: "node.fixture.choice",
              nodes: [
                {
                  kind: "choice",
                  nodeId: "node.fixture.choice",
                  choices: [
                    {
                      choiceId: "choice.fixture_world",
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
                        actorId: "actor.heroine",
                        preparationBonus: 0,
                      },
                      effects: [],
                      nextNodeId: "node.fixture.end",
                    },
                  ],
                },
                { kind: "end", nodeId: "node.fixture.end" },
              ],
            },
          ],
        },
      }),
    ).toThrow();

    const worldAction = fixture.program.data.content.worldActions[0]!;
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...fixture.program.data,
        content: {
          ...fixture.program.data.content,
          actions: fixture.program.data.content.actions.map((action) =>
            action.actionId === worldAction.actionId
              ? { ...action, occupation: { kind: "fixed", phases: ["morning", "evening"] } }
              : action,
          ),
          worldActions: [
            {
              ...worldAction,
              steps: [worldAction.steps[0], { ...worldAction.steps[1], phase: "evening" }],
            },
          ],
        },
      }),
    ).toThrow();
  });

  it("executes each admitted command exactly once and commits one sequence", () => {
    const fixture = createPocGameplayFixtureV1();
    const modules = createPocGameplayModuleTupleV1(fixture.program);
    const executor = createPocGameCommandExecutorV1(fixture.program, modules);
    const attempt = executor.executeAttempt(fixture.snapshot, { kind: "run.start" }, undefined);

    expect(attempt.result).toMatchObject({ kind: "committed" });
    if (attempt.result.kind === "committed") {
      expect(attempt.result.snapshot.commandSequence).toBe(fixture.snapshot.commandSequence + 1);
      expect(attempt.result.snapshot.state.simulation.run.status).toBe("setup");
      expect(attempt.result.snapshot.state.story.narrative.source?.kind).toBe("manifest_start");
    }
  });

  it("starts cleanly when day one is not a service day", () => {
    const fixture = createPocGameplayFixtureV1();
    const baseDemand = fixture.program.data.balance.baseDemand[0]!;
    const program = withProgramDataV1(fixture, {
      ...fixture.program.data,
      balance: {
        ...fixture.program.data.balance,
        serviceDays: [2],
        baseDemand: [{ ...baseDemand, day: 2 }],
      },
    });
    const executor = createExecutorV1(program);
    const attempt = executor.executeAttempt(fixture.snapshot, { kind: "run.start" }, undefined);
    expect(attempt.result.kind, JSON.stringify(attempt)).toBe("committed");
    if (attempt.result.kind !== "committed") return;
    expect(attempt.result.snapshot.state.simulation.tavern.currentDemand).toBeNull();
    expect(attempt.result.snapshot.state.simulation.tavern.demandSeeds).toMatchObject([{ day: 2 }]);
    expect(attempt.result.facts.some(({ kind }) => kind === "demand.materialized")).toBe(false);
  });

  it("preserves the exact input Snapshot for rejection", () => {
    const fixture = createPocGameplayFixtureV1();
    const modules = createPocGameplayModuleTupleV1(fixture.program);
    const executor = createPocGameCommandExecutorV1(fixture.program, modules);
    const attempt = executor.executeAttempt(
      fixture.snapshot,
      { kind: "policy.choose", policyId: fixture.program.data.balance.lifePolicies[0]!.policyId },
      undefined,
    );

    expect(attempt.result.kind).toBe("rejected");
    expect(attempt.result.snapshot).toBe(fixture.snapshot);
    expect(attempt.diagnostics.candidateRngAfter).toEqual(fixture.snapshot.rng);
    expect(attempt.diagnostics.committedRngAfter).toBe(fixture.snapshot.rng);
  });

  it("classifies thenable and invalid Rule outputs without committing the candidate", () => {
    const fixture = createPocGameplayFixtureV1();
    const thenableResult = Object.fromEntries([[["th", "en"].join(""), () => undefined]]);
    const thenableResolve = (() =>
      thenableResult) as unknown as typeof fixture.program.rules.demand.resolve;
    const thenableProgram = deepFreezePocValueV1<PocSimulationProgramV1>({
      data: fixture.program.data,
      rules: {
        ...fixture.program.rules,
        demand: { ...fixture.program.rules.demand, resolve: thenableResolve },
      },
    });
    const thenable = createExecutorV1(thenableProgram).executeAttempt(
      fixture.snapshot,
      { kind: "run.start" },
      undefined,
    );
    expect(thenable.result).toMatchObject({
      kind: "faulted",
      fault: {
        category: "story_rule",
        code: "rule.returned_thenable",
        ruleSlot: "demand.resolve",
      },
    });
    expect(thenable.result.snapshot).toBe(fixture.snapshot);

    const invalidResolve = (() => ({
      lines: [],
    })) as unknown as typeof fixture.program.rules.demand.resolve;
    const invalidProgram = deepFreezePocValueV1<PocSimulationProgramV1>({
      data: fixture.program.data,
      rules: createValidatedPocRulesV1(fixture.program.data, {
        ...fixture.program.rules,
        demand: { ...fixture.program.rules.demand, resolve: invalidResolve },
      }),
    });
    const invalid = createExecutorV1(invalidProgram).executeAttempt(
      fixture.snapshot,
      { kind: "run.start" },
      undefined,
    );
    expect(invalid.result).toMatchObject({
      kind: "faulted",
      fault: {
        category: "story_rule",
        code: "rule.output_invalid",
        ruleSlot: "demand.resolve",
      },
    });
    expect(invalid.result.snapshot).toBe(fixture.snapshot);
  });

  it("treats modified RunIntegrity as opaque during normal gameplay", () => {
    const fixture = createPocGameplayFixtureV1({ integrity: "modified" });
    const modules = createPocGameplayModuleTupleV1(fixture.program);
    const executor = createPocGameCommandExecutorV1(fixture.program, modules);
    const started = requireCommittedV1(executor, fixture.snapshot, { kind: "run.start" });
    const active = requireCommittedV1(executor, started, {
      kind: "policy.choose",
      policyId: fixture.program.data.balance.lifePolicies[0]!.policyId,
    });
    expect(active.integrity).toBe(fixture.snapshot.integrity);
  });

  it("enforces lifecycle admission before domain handlers", () => {
    const fixture = createPocGameplayFixtureV1();
    const executor = createExecutorV1(fixture.program);
    const beforeStart = executor.executeAttempt(
      fixture.snapshot,
      { kind: "policy.choose", policyId: fixture.program.data.balance.lifePolicies[0]!.policyId },
      undefined,
    );
    expect(beforeStart.result).toMatchObject({
      kind: "rejected",
      reasons: [{ code: "run.not_started" }],
    });

    const started = requireCommittedV1(executor, fixture.snapshot, { kind: "run.start" });
    const policyRequired = executor.executeAttempt(
      started,
      {
        kind: "inventory.buy",
        lines: [
          {
            ingredientId: fixture.program.data.content.ingredients[0]!.ingredientId,
            quantity: parseQuantity(1),
          },
        ],
      },
      undefined,
    );
    expect(policyRequired.result).toMatchObject({
      kind: "rejected",
      reasons: [{ code: "run.policy_required" }],
    });
    const repeated = executor.executeAttempt(started, { kind: "run.start" }, undefined);
    expect(repeated.result).toMatchObject({
      kind: "rejected",
      reasons: [{ code: "run.already_started" }],
    });
  });

  it("commits the independent buy, prepare, rest, StoryAction, Facility, and plan handlers", () => {
    const fixture = createPocGameplayFixtureV1();
    const active = startAndActivateV1(fixture);
    const ingredientId = fixture.program.data.content.ingredients[0]!.ingredientId;
    const purchased = requireCommittedV1(active.executor, active.snapshot, {
      kind: "inventory.buy",
      lines: [{ ingredientId, quantity: parseQuantity(1) }],
    });
    expect(purchased.state.simulation.inventory.ingredientBatches).toHaveLength(1);
    expect(purchased.state.simulation.inventory.cash).toBe(99);

    const prepared = requireCommittedV1(active.executor, active.snapshot, {
      kind: "actor.prepare_food",
    });
    expect(prepared.state.simulation.tavern.preparation.actionCount).toBe(1);
    expect(prepared.state.simulation.actors.player.stamina.current).toBe(9);

    const tired = replaceSnapshotStateV1(active.snapshot, {
      ...active.snapshot.state,
      simulation: {
        ...active.snapshot.state.simulation,
        actors: {
          ...active.snapshot.state.simulation.actors,
          player: {
            ...active.snapshot.state.simulation.actors.player,
            stamina: {
              ...active.snapshot.state.simulation.actors.player.stamina,
              current: parseNonNegativeSafeInteger(8),
            },
          },
        },
      },
    });
    const rested = requireCommittedV1(active.executor, tired, { kind: "actor.rest" });
    expect(rested.state.simulation.actors.player.stamina.current).toBe(10);

    const story = requireCommittedV1(active.executor, active.snapshot, {
      kind: "story.action.start",
      actionId: fixture.program.data.content.storyActions[0]!.actionId,
    });
    expect(story.state.story.narrative.source).toEqual({
      kind: "story_action",
      actionId: fixture.program.data.content.storyActions[0]!.actionId,
    });

    const facility = requireCommittedV1(active.executor, active.snapshot, {
      kind: "facility.choose",
      opportunityId: fixture.program.data.content.facilityOpportunities[0]!.opportunityId,
      choice: {
        kind: "build",
        facilityId: fixture.program.data.content.facilities[0]!.facilityId,
      },
    });
    expect(facility.state.simulation.facilities.built).toHaveLength(1);
    expect(facility.state.simulation.inventory.cash).toBe(95);

    const planned = requireCommittedV1(active.executor, active.snapshot, {
      kind: "tavern.plan.set",
      plan: {
        mode: "manual",
        menu: [
          {
            recipeId: fixture.program.data.content.recipes[0]!.recipeId,
            portions: parseQuantity(1),
          },
        ],
      },
    });
    expect(planned.state.simulation.tavern.servicePlan?.mode).toBe("manual");
  });

  it("publishes StoryAction effects and Narrative before the final started Fact", () => {
    const fixture = createPocGameplayFixtureV1();
    const storyAction = fixture.program.data.content.storyActions[0]!;
    const program = withProgramDataV1(fixture, {
      ...fixture.program.data,
      manifest: { ...fixture.program.data.manifest, initialSceneId: "scene.fixture_manifest" },
      content: {
        ...fixture.program.data.content,
        storyActions: [
          {
            ...storyAction,
            startEffects: [
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
            sceneId: "scene.fixture",
            entryNodeId: "node.fixture.command",
            nodes: [
              {
                kind: "command",
                nodeId: "node.fixture.command",
                effects: [
                  {
                    kind: "fact.set",
                    factId: "fact.fixture",
                    value: { kind: "boolean", value: true },
                    reasonId: "reason.fixture",
                  },
                ],
                nextNodeId: "node.fixture.end",
              },
              { kind: "end", nodeId: "node.fixture.end" },
            ],
          },
          {
            sceneId: "scene.fixture_manifest",
            entryNodeId: "node.fixture_manifest.end",
            nodes: [{ kind: "end", nodeId: "node.fixture_manifest.end" }],
          },
        ],
      },
    });
    const active = startAndActivateV1({ ...fixture, program });
    const attempt = active.executor.executeAttempt(
      active.snapshot,
      { kind: "story.action.start", actionId: storyAction.actionId },
      undefined,
    );
    expect(attempt.result.kind, JSON.stringify(attempt)).toBe("committed");
    if (attempt.result.kind !== "committed") return;
    expect(attempt.result.facts.map(({ kind }) => kind)).toEqual([
      "relationship.affection_changed",
      "relationship.teamwork_changed",
      "fact.set",
      "story.action_started",
    ]);
  });

  it("rejects an unavailable ServiceMode before invoking Tavern preview", () => {
    const fixture = createPocGameplayFixtureV1();
    const firstMode = fixture.program.data.balance.serviceModes[0]!;
    const dataProgram = withProgramDataV1(fixture, {
      ...fixture.program.data,
      balance: {
        ...fixture.program.data.balance,
        serviceModes: [
          {
            ...firstMode,
            availability: [
              {
                conditions: [
                  {
                    kind: "fact.equals",
                    factId: "fact.fixture",
                    value: { kind: "boolean", value: true },
                  },
                ],
                reasonId: "reason.fixture",
              },
            ],
          },
          ...fixture.program.data.balance.serviceModes.slice(1),
        ],
      },
    });
    let previewCalls = 0;
    const program = deepFreezePocValueV1<PocSimulationProgramV1>({
      data: dataProgram.data,
      rules: createValidatedPocRulesV1(dataProgram.data, {
        ...dataProgram.rules,
        tavern: {
          ...dataProgram.rules.tavern,
          preview(input) {
            previewCalls += 1;
            return dataProgram.rules.tavern.preview(input);
          },
        },
      }),
    });
    const active = startAndActivateV1({ ...fixture, program });
    const attempt = active.executor.executeAttempt(
      active.snapshot,
      {
        kind: "tavern.plan.set",
        plan: {
          mode: firstMode.mode,
          menu: [
            {
              recipeId: program.data.content.recipes[0]!.recipeId,
              portions: parseQuantity(1),
            },
          ],
        },
      },
      undefined,
    );
    expect(attempt.result).toMatchObject({
      kind: "rejected",
      reasons: [
        {
          code: "tavern.service_unavailable",
          details: { mode: firstMode.mode, reasonId: "reason.fixture" },
        },
      ],
    });
    expect(previewCalls).toBe(0);
    expect(attempt.result.snapshot).toBe(active.snapshot);
  });

  it("executes Narrative advance and choice through one settled owner proposal", () => {
    const fixture = createPocGameplayFixtureV1();
    const lineProgram = withNarrativeScenesV1(fixture, [
      {
        sceneId: "scene.fixture",
        entryNodeId: "node.fixture.line",
        nodes: [
          {
            kind: "line",
            nodeId: "node.fixture.line",
            speakerId: "character.heroine",
            textId: "text.fixture",
            nextNodeId: "node.fixture.end",
          },
          { kind: "end", nodeId: "node.fixture.end" },
        ],
      },
    ]);
    const lineExecutor = createExecutorV1(lineProgram);
    const atLine = requireCommittedV1(lineExecutor, fixture.snapshot, { kind: "run.start" });
    expect(atLine.state.story.narrative.status).toBe("active");
    const advanced = requireCommittedV1(lineExecutor, atLine, { kind: "narrative.advance" });
    expect(advanced.state.story.narrative.status).toBe("completed");

    const choiceProgram = withNarrativeScenesV1(fixture, [
      {
        sceneId: "scene.fixture",
        entryNodeId: "node.fixture.choice",
        nodes: [
          {
            kind: "choice",
            nodeId: "node.fixture.choice",
            choices: [
              {
                choiceId: "choice.fixture_world",
                textId: "text.fixture",
                showWhen: [],
                enableWhen: [],
                confirmation: {
                  benefitTextIds: [],
                  mutuallyExcludedActionIds: [],
                  majorRiskTextIds: [],
                },
                effects: [],
                nextNodeId: "node.fixture.end",
              },
            ],
          },
          { kind: "end", nodeId: "node.fixture.end" },
        ],
      },
    ]);
    const choiceExecutor = createExecutorV1(choiceProgram);
    const atChoice = requireCommittedV1(choiceExecutor, fixture.snapshot, { kind: "run.start" });
    const choiceScene = choiceProgram.data.narrative.scenes[0]!;
    const choiceNode = choiceScene.nodes[0]!;
    if (choiceNode.kind !== "choice") throw new TypeError("expected fixture choice node");
    const chosen = requireCommittedV1(choiceExecutor, atChoice, {
      kind: "narrative.choose",
      sceneId: choiceScene.sceneId,
      nodeId: choiceNode.nodeId,
      choiceId: choiceNode.choices[0]!.choiceId,
    });
    expect(chosen.state.story.narrative.status).toBe("completed");
  });

  it("rolls back Check RNG, Progression, and choice effects as one Narrative transaction", () => {
    const fixture = createPocGameplayFixtureV1();
    const program = withNarrativeScenesV1(fixture, [
      {
        sceneId: "scene.fixture",
        entryNodeId: "node.fixture.choice",
        nodes: [
          {
            kind: "choice",
            nodeId: "node.fixture.choice",
            choices: [
              {
                choiceId: "choice.fixture_world",
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
                    kind: "inventory.consume",
                    lines: [{ ingredientId: "ingredient.fixture", quantity: parseQuantity(999) }],
                    reasonId: "reason.fixture",
                  },
                ],
                nextNodeId: "node.fixture.end",
              },
            ],
          },
          { kind: "end", nodeId: "node.fixture.end" },
        ],
      },
    ]);
    const executor = createExecutorV1(program);
    const atChoice = requireCommittedV1(executor, fixture.snapshot, { kind: "run.start" });
    const scene = program.data.narrative.scenes[0]!;
    const choiceNode = scene.nodes[0]!;
    if (choiceNode.kind !== "choice") throw new TypeError("expected fixture choice node");
    const attempt = executor.executeAttempt(
      atChoice,
      {
        kind: "narrative.choose",
        sceneId: scene.sceneId,
        nodeId: choiceNode.nodeId,
        choiceId: choiceNode.choices[0]!.choiceId,
      },
      undefined,
    );

    expect(attempt.result).toMatchObject({
      kind: "rejected",
      reasons: [{ code: "inventory.insufficient_ingredient" }],
    });
    expect(attempt.result.snapshot).toBe(atChoice);
    expect(attempt.diagnostics.attemptedDraws).toHaveLength(2);
    expect(attempt.diagnostics.candidateRngAfter).not.toEqual(atChoice.rng);
    expect(attempt.diagnostics.committedRngAfter).toBe(atChoice.rng);
    expect(atChoice.state.story.resolvedChecks).toEqual([]);
  });

  it("faults and rolls back competing Scheduler and command Narrative requests", () => {
    const fixture = createPocGameplayFixtureV1();
    const event = {
      eventId: "event.fixture",
      checkpointId: "checkpoint.fixture",
      trigger: { kind: "command.succeeded", commandKinds: ["story.action.start"] },
      priority: 0,
      weightedGroupId: null,
      weight: 0,
      when: [],
      sceneId: "scene.fixture",
      effects: [],
    };
    const conflictProgram = withEventsV1(fixture, [event]);
    const conflictActive = startAndActivateV1({ ...fixture, program: conflictProgram });
    const conflict = conflictActive.executor.executeAttempt(
      conflictActive.snapshot,
      {
        kind: "story.action.start",
        actionId: conflictProgram.data.content.storyActions[0]!.actionId,
      },
      undefined,
    );
    expect(conflict.result).toMatchObject({
      kind: "faulted",
      fault: { category: "engine_invariant", code: "narrative.blocking_conflict" },
    });
    expect(conflict.result.snapshot).toBe(conflictActive.snapshot);

    const multipleProgram = withEventsV1(fixture, [
      {
        ...event,
        eventId: "event.fixture_a",
        checkpointId: "checkpoint.fixture_a",
        trigger: { kind: "command.succeeded", commandKinds: ["policy.choose"] },
      },
      {
        ...event,
        eventId: "event.fixture_b",
        checkpointId: "checkpoint.fixture_b",
        trigger: { kind: "command.succeeded", commandKinds: ["policy.choose"] },
      },
    ]);
    const multipleExecutor = createExecutorV1(multipleProgram);
    const started = requireCommittedV1(multipleExecutor, fixture.snapshot, { kind: "run.start" });
    const multiple = multipleExecutor.executeAttempt(
      started,
      {
        kind: "policy.choose",
        policyId: multipleProgram.data.balance.lifePolicies[0]!.policyId,
      },
      undefined,
    );
    expect(multiple.result).toMatchObject({
      kind: "faulted",
      fault: { category: "engine_invariant", code: "scheduler.multiple_blocking_events" },
    });
    expect(multiple.result.snapshot).toBe(started);
  });

  it("applies Facility shelf-life extensions to existing and later purchases atomically", () => {
    const fixture = createPocGameplayFixtureV1();
    const facility = fixture.program.data.content.facilities[0]!;
    const program = withProgramDataV1(fixture, {
      ...fixture.program.data,
      content: {
        ...fixture.program.data.content,
        facilities: [
          {
            ...facility,
            modifiers: [
              {
                kind: "shelf_life.add_days",
                source: { kind: "facility", facilityId: facility.facilityId },
                ingredientIds: ["ingredient.fixture"],
                amount: 2,
                reasonId: "reason.fixture",
              },
            ],
          },
          ...fixture.program.data.content.facilities.slice(1),
        ],
      },
    });
    const active = startAndActivateV1({ ...fixture, program });
    const ingredientId = program.data.content.ingredients[0]!.ingredientId;
    const opportunityId = program.data.content.facilityOpportunities[0]!.opportunityId;
    const purchasedBefore = requireCommittedV1(active.executor, active.snapshot, {
      kind: "inventory.buy",
      lines: [{ ingredientId, quantity: parseQuantity(1) }],
    });
    expect(purchasedBefore.state.simulation.inventory.ingredientBatches[0]?.lastUsableDay).toBe(2);

    const built = requireCommittedV1(active.executor, purchasedBefore, {
      kind: "facility.choose",
      opportunityId,
      choice: { kind: "build", facilityId: facility.facilityId },
    });
    expect(built.state.simulation.inventory.ingredientBatches[0]).toMatchObject({
      lastUsableDay: 4,
      refrigerationExtended: true,
    });

    const purchasedAfter = requireCommittedV1(active.executor, built, {
      kind: "inventory.buy",
      lines: [{ ingredientId, quantity: parseQuantity(1) }],
    });
    expect(
      purchasedAfter.state.simulation.inventory.ingredientBatches.map(
        ({ lastUsableDay }) => lastUsableDay,
      ),
    ).toEqual([4, 4]);

    const unaffordableProgram = withProgramDataV1(fixture, {
      ...fixture.program.data,
      content: {
        ...fixture.program.data.content,
        facilities: [
          { ...facility, cashCost: 500 },
          ...fixture.program.data.content.facilities.slice(1),
        ],
      },
    });
    const unaffordableActive = startAndActivateV1({ ...fixture, program: unaffordableProgram });
    const unaffordableOpportunityId =
      unaffordableProgram.data.content.facilityOpportunities[0]!.opportunityId;
    const rejected = unaffordableActive.executor.executeAttempt(
      unaffordableActive.snapshot,
      {
        kind: "facility.choose",
        opportunityId: unaffordableOpportunityId,
        choice: { kind: "build", facilityId: facility.facilityId },
      },
      undefined,
    );
    expect(rejected.result).toMatchObject({
      kind: "rejected",
      reasons: [{ code: "inventory.insufficient_cash" }],
    });
    expect(rejected.result.snapshot).toBe(unaffordableActive.snapshot);
  });

  it("advances evening into the next service day before materializing its demand", () => {
    const fixture = createPocGameplayFixtureV1();
    const firstDemand = fixture.program.data.balance.baseDemand[0]!;
    const program = withProgramDataV1(fixture, {
      ...fixture.program.data,
      balance: {
        ...fixture.program.data.balance,
        serviceDays: [1, 2],
        baseDemand: [firstDemand, { ...firstDemand, day: 2 }],
      },
    });
    const active = startAndActivateV1({ ...fixture, program });
    const afternoon = requireCommittedV1(active.executor, active.snapshot, {
      kind: "calendar.advance_phase",
    });
    const evening = requireCommittedV1(active.executor, afternoon, {
      kind: "calendar.advance_phase",
    });
    const attempt = active.executor.executeAttempt(
      evening,
      { kind: "calendar.advance_phase" },
      undefined,
    );
    expect(attempt.result.kind, JSON.stringify(attempt)).toBe("committed");
    if (attempt.result.kind !== "committed") return;
    expect(attempt.result.facts.map(({ kind }) => kind)).toEqual([
      "actor.stamina_changed",
      "actor.stamina_changed",
      "calendar.phase_advanced",
      "demand.materialized",
    ]);
    expect(attempt.result.snapshot.state.simulation.calendar).toMatchObject({
      day: 2,
      phase: "morning",
      apRemaining: 2,
      eveningResolved: false,
    });
    expect(attempt.result.snapshot.state.simulation.tavern).toMatchObject({
      preparation: { day: 2, actionCount: 0 },
      servicePlan: null,
      currentDemand: { day: 2 },
    });
    expect(attempt.result.snapshot.state.simulation.tavern.serviceHistory).toMatchObject([
      { kind: "closure", closure: { day: 1, kind: "emergency" } },
    ]);
  });

  it("crosses a non-service evening without inventing service history", () => {
    const fixture = createPocGameplayFixtureV1();
    const active = startAndActivateV1(fixture);
    let snapshot = active.snapshot;
    for (let index = 0; index < 5; index += 1) {
      snapshot = requireCommittedV1(active.executor, snapshot, {
        kind: "calendar.advance_phase",
      });
    }
    expect(snapshot.state.simulation.calendar).toMatchObject({
      day: 2,
      phase: "evening",
      eveningResolved: true,
    });
    expect(snapshot.state.simulation.tavern.serviceHistory).toMatchObject([
      { kind: "closure", closure: { day: 1, kind: "emergency" } },
    ]);

    const dayThree = requireCommittedV1(active.executor, snapshot, {
      kind: "calendar.advance_phase",
    });
    expect(dayThree.state.simulation.calendar).toMatchObject({
      day: 3,
      phase: "morning",
      eveningResolved: false,
    });
    expect(dayThree.state.simulation.tavern.serviceHistory).toHaveLength(1);
  });

  it("faults when Calendar progression would preserve a missing resolved service history", () => {
    const fixture = createPocGameplayFixtureV1();
    const active = startAndActivateV1(fixture);
    const afternoon = requireCommittedV1(active.executor, active.snapshot, {
      kind: "calendar.advance_phase",
    });
    const evening = requireCommittedV1(active.executor, afternoon, {
      kind: "calendar.advance_phase",
    });
    const invalid = replaceSnapshotStateV1(evening, {
      ...evening.state,
      simulation: {
        ...evening.state.simulation,
        tavern: { ...evening.state.simulation.tavern, serviceHistory: [] },
      },
    });
    const attempt = active.executor.executeAttempt(
      invalid,
      { kind: "calendar.advance_phase" },
      undefined,
    );
    expect(attempt.result).toMatchObject({
      kind: "faulted",
      fault: { category: "engine_invariant", code: "terminal_state.invalid" },
    });
    expect(attempt.result.snapshot).toBe(invalid);
  });

  it("faults when a persisted WorldAction session no longer matches its authored steps", () => {
    const fixture = createPocGameplayFixtureV1();
    const active = startAndActivateV1(fixture);
    const action = fixture.program.data.content.worldActions[0]!;
    const option = action.options[0]!;
    const sequence = parsePositiveSafeInteger(active.snapshot.commandSequence);
    const invalid = replaceSnapshotStateV1(active.snapshot, {
      ...active.snapshot.state,
      simulation: {
        ...active.snapshot.state.simulation,
        activeWorkflow: {
          kind: "world_action",
          actionId: action.actionId,
          optionId: option.optionId,
          beginStepId: action.steps[0].stepId,
          completionStepId: parseWorldStepId("world_step.fixture.stale"),
          preparationBonus: option.preparationBonus,
          startedAtSequence: sequence,
          startedDay: active.snapshot.state.simulation.calendar.day,
          startedPhase: active.snapshot.state.simulation.calendar.phase,
          progress: "awaiting_completion_phase",
          paidCostEntryIds: [],
          choices: [{ choiceId: option.optionId, committedAtSequence: sequence }],
        },
      },
    });
    const attempt = active.executor.executeAttempt(
      invalid,
      { kind: "calendar.advance_phase" },
      undefined,
    );
    expect(attempt.result).toMatchObject({
      kind: "faulted",
      fault: { category: "engine_invariant", code: "workflow.conflict" },
    });
    expect(attempt.result.snapshot).toBe(invalid);
  });

  it("advances the Calendar and preserves direct-fact order across an emergency closure", () => {
    const fixture = createPocGameplayFixtureV1();
    const active = startAndActivateV1(fixture);
    const afternoon = requireCommittedV1(active.executor, active.snapshot, {
      kind: "calendar.advance_phase",
    });
    expect(afternoon.state.simulation.calendar.phase).toBe("afternoon");
    const attempt = active.executor.executeAttempt(
      afternoon,
      { kind: "calendar.advance_phase" },
      undefined,
    );
    expect(attempt.result.kind, JSON.stringify(attempt)).toBe("committed");
    if (attempt.result.kind !== "committed") return;
    expect(attempt.result.snapshot.state.simulation.calendar).toMatchObject({
      phase: "evening",
      eveningResolved: true,
    });
    expect(attempt.result.snapshot.state.simulation.tavern.reputation).toBe(49);
    expect(attempt.result.facts.map(({ kind }) => kind)).toEqual([
      "reputation.changed",
      "tavern.emergency_closed",
      "calendar.phase_advanced",
    ]);
  });
});
