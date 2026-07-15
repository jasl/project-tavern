// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  createPocGameCommandExecutorV1,
  createPocTavernSettlementResolverV1,
  createValidatedPocRulesV1,
  deepFreezePocValueV1,
  parseQuantity,
  pocSimulationDataSchemaV1,
  type PocGameCommandV1,
  type PocGameSnapshotV1,
  type PocRulesV1,
  type PocSimulationDataV1,
  type PocSimulationProgramV1,
} from "../gameplay/index.js";
import { createPocGameplayModuleTupleV1 } from "../gameplay/modules/index.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

type FixtureV1 = ReturnType<typeof createPocGameplayFixtureV1>;
type ExecutorV1 = ReturnType<typeof createPocGameCommandExecutorV1>;

function createExecutorV1(program: PocSimulationProgramV1): ExecutorV1 {
  return createPocGameCommandExecutorV1(program, createPocGameplayModuleTupleV1(program));
}

function requireCommittedV1(
  executor: ExecutorV1,
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

function withProgramDataV1(
  fixture: FixtureV1,
  dataValue: unknown,
  rulesForData: (data: PocSimulationDataV1, fixtureRules: PocRulesV1) => PocRulesV1 = (
    _data,
    fixtureRules,
  ) => fixtureRules,
): PocSimulationProgramV1 {
  const data = pocSimulationDataSchemaV1.parse(dataValue);
  return deepFreezePocValueV1({
    data,
    rules: createValidatedPocRulesV1(data, rulesForData(data, fixture.program.rules)),
  });
}

function startAndActivateV1(fixture: FixtureV1): {
  readonly executor: ExecutorV1;
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

function openingReadySnapshotV1(
  fixture: FixtureV1,
  options: { readonly buyIngredient?: boolean } = {},
): {
  readonly executor: ExecutorV1;
  readonly snapshot: PocGameSnapshotV1;
} {
  const active = startAndActivateV1(fixture);
  const ingredientId = fixture.program.data.content.ingredients[0]!.ingredientId;
  const recipeId = fixture.program.data.content.recipes[0]!.recipeId;
  let snapshot = active.snapshot;
  if (options.buyIngredient !== false) {
    snapshot = requireCommittedV1(active.executor, snapshot, {
      kind: "inventory.buy",
      lines: [{ ingredientId, quantity: parseQuantity(1) }],
    });
  }
  snapshot = requireCommittedV1(active.executor, snapshot, {
    kind: "tavern.plan.set",
    plan: { mode: "manual", menu: [{ recipeId, portions: parseQuantity(1) }] },
  });
  snapshot = requireCommittedV1(active.executor, snapshot, { kind: "calendar.advance_phase" });
  snapshot = requireCommittedV1(active.executor, snapshot, { kind: "calendar.advance_phase" });
  expect(snapshot.state.simulation.calendar.phase).toBe("evening");
  return { executor: active.executor, snapshot };
}

function continueOpeningToReadyV1(
  executor: ExecutorV1,
  started: PocGameSnapshotV1,
): PocGameSnapshotV1 {
  let snapshot = started;
  if (snapshot.state.story.narrative.status === "active") {
    snapshot = requireCommittedV1(executor, snapshot, { kind: "narrative.advance" });
  }
  for (const checkpoint of ["middle", "before_finalize", "ready_to_finalize"] as const) {
    snapshot = requireCommittedV1(executor, snapshot, { kind: "tavern.opening.continue" });
    expect(snapshot.state.simulation.activeWorkflow).toMatchObject({
      kind: "opening",
      checkpoint,
    });
  }
  return snapshot;
}

function createOpeningInterruptionFixtureV1(): FixtureV1 {
  const fixture = createPocGameplayFixtureV1();
  const program = withProgramDataV1(
    fixture,
    {
      ...fixture.program.data,
      balance: {
        ...fixture.program.data.balance,
        openingFee: 2,
        serviceModes: fixture.program.data.balance.serviceModes.map((mode) =>
          mode.mode === "manual" ? { ...mode, wage: 3 } : mode,
        ),
      },
      content: {
        ...fixture.program.data.content,
        recipes: fixture.program.data.content.recipes.map((recipe) => ({
          ...recipe,
          preferences: recipe.preferences.map((preference) => ({
            ...preference,
            value: 3,
          })),
        })),
        events: [
          ...fixture.program.data.content.events,
          {
            eventId: "event.fixture_opening_interrupt",
            checkpointId: "checkpoint.fixture_opening_interrupt",
            trigger: { kind: "opening.started" },
            priority: 10,
            weightedGroupId: null,
            weight: 0,
            when: [],
            sceneId: "scene.fixture_opening_interrupt",
            effects: [],
          },
        ],
      },
      narrative: {
        scenes: [
          ...fixture.program.data.narrative.scenes,
          {
            sceneId: "scene.fixture_opening_interrupt",
            entryNodeId: "node.fixture_opening_interrupt.line",
            nodes: [
              {
                kind: "narration",
                nodeId: "node.fixture_opening_interrupt.line",
                textId: "text.fixture",
                nextNodeId: "node.fixture_opening_interrupt.end",
              },
              { kind: "end", nodeId: "node.fixture_opening_interrupt.end" },
            ],
          },
        ],
      },
    },
    (data, fixtureRules) => ({
      ...fixtureRules,
      tavern: createPocTavernSettlementResolverV1(data),
    }),
  );
  return deepFreezePocValueV1({ ...fixture, program });
}

function createWorldActionFixtureV1(
  options: { readonly baseCashCost?: number; readonly conflict?: boolean } = {},
): FixtureV1 {
  const fixture = createPocGameplayFixtureV1();
  const worldAction = fixture.program.data.content.worldActions[0]!;
  const program = withProgramDataV1(fixture, {
    ...fixture.program.data,
    content: {
      ...fixture.program.data.content,
      worldActions: [
        {
          ...worldAction,
          baseCashCost: options.baseCashCost ?? 4,
          playerStaminaCost: 3,
          beginEffects: [
            {
              kind: "relationship.affection.adjust",
              delta: 2,
              reasonId: "reason.fixture",
            },
          ],
          options: [
            {
              ...worldAction.options[0],
              additionalCashCost: 4,
              preparationBonus: 1,
              beginEffects: [
                {
                  kind: "relationship.teamwork.adjust",
                  delta: 3,
                  reasonId: "reason.fixture",
                },
              ],
            },
          ],
          steps: [
            { ...worldAction.steps[0], sceneId: "scene.fixture_world_begin" },
            { ...worldAction.steps[1], sceneId: "scene.fixture_world_complete" },
          ],
        },
      ],
      checks: fixture.program.data.content.checks.map((check) => ({
        ...check,
        bands: check.bands.map((band) => ({
          ...band,
          effects: [
            {
              kind: "fact.set",
              factId: "fact.fixture",
              value: { kind: "boolean", value: true },
              reasonId: "reason.fixture",
            },
          ],
        })),
      })),
      events: options.conflict
        ? [
            ...fixture.program.data.content.events,
            {
              eventId: "event.fixture_world_conflict",
              checkpointId: "checkpoint.fixture_world_conflict",
              trigger: { kind: "command.succeeded", commandKinds: ["world.action.begin"] },
              priority: 10,
              weightedGroupId: null,
              weight: 0,
              when: [],
              sceneId: "scene.fixture_world_begin",
              effects: [],
            },
          ]
        : fixture.program.data.content.events,
    },
    narrative: {
      scenes: [
        ...fixture.program.data.narrative.scenes,
        {
          sceneId: "scene.fixture_world_begin",
          entryNodeId: "node.fixture_world_begin.line",
          nodes: [
            {
              kind: "narration",
              nodeId: "node.fixture_world_begin.line",
              textId: "text.fixture",
              nextNodeId: "node.fixture_world_begin.end",
            },
            { kind: "end", nodeId: "node.fixture_world_begin.end" },
          ],
        },
        {
          sceneId: "scene.fixture_world_complete",
          entryNodeId: "node.fixture_world_complete.line",
          nodes: [
            {
              kind: "narration",
              nodeId: "node.fixture_world_complete.line",
              textId: "text.fixture",
              nextNodeId: "node.fixture_world_complete.end",
            },
            { kind: "end", nodeId: "node.fixture_world_complete.end" },
          ],
        },
      ],
    },
  });
  return deepFreezePocValueV1({ ...fixture, program });
}

function createLevyFixtureV1(
  levyAmount: number,
  options: { readonly terminalEvents?: boolean } = {},
): FixtureV1 {
  const fixture = createPocGameplayFixtureV1();
  const program = withProgramDataV1(fixture, {
    ...fixture.program.data,
    balance: {
      ...fixture.program.data.balance,
      levyAmount,
      levyDue: { day: 7, phase: "afternoon" },
    },
    content: {
      ...fixture.program.data.content,
      events: options.terminalEvents
        ? [
            ...fixture.program.data.content.events,
            {
              eventId: "event.fixture_levy_command",
              checkpointId: "checkpoint.fixture_levy_command",
              trigger: { kind: "command.succeeded", commandKinds: ["levy.pay"] },
              priority: 10,
              weightedGroupId: null,
              weight: 0,
              when: [],
              sceneId: null,
              effects: [
                {
                  kind: "fact.set",
                  factId: "fact.fixture",
                  value: { kind: "boolean", value: true },
                  reasonId: "reason.fixture",
                },
              ],
            },
            {
              eventId: "event.fixture_week_end",
              checkpointId: "checkpoint.fixture_week_end",
              trigger: { kind: "week.ended" },
              priority: 10,
              weightedGroupId: null,
              weight: 0,
              when: [
                {
                  kind: "fact.equals",
                  factId: "fact.fixture",
                  value: { kind: "boolean", value: true },
                },
              ],
              sceneId: null,
              effects: [
                {
                  kind: "quest.set",
                  quest: {
                    questId: "quest.fixture",
                    status: "completed",
                    progress: 1,
                    target: 1,
                  },
                  reasonId: "reason.fixture",
                },
              ],
            },
          ]
        : fixture.program.data.content.events,
    },
  });
  return deepFreezePocValueV1({ ...fixture, program });
}

function reachLevyDueV1(
  fixture: FixtureV1,
  buildFacility: boolean,
): {
  readonly executor: ExecutorV1;
  readonly snapshot: PocGameSnapshotV1;
} {
  const active = startAndActivateV1(fixture);
  let snapshot = active.snapshot;
  if (buildFacility) {
    const opportunity = fixture.program.data.content.facilityOpportunities[0]!;
    snapshot = requireCommittedV1(active.executor, snapshot, {
      kind: "facility.choose",
      opportunityId: opportunity.opportunityId,
      choice: { kind: "build", facilityId: opportunity.facilityIds[0]! },
    });
  }
  snapshot = requireCommittedV1(active.executor, snapshot, {
    kind: "tavern.plan.set",
    plan: { mode: "closed", menu: [] },
  });
  while (
    snapshot.state.simulation.calendar.day !== 7 ||
    snapshot.state.simulation.calendar.phase !== "afternoon"
  ) {
    snapshot = requireCommittedV1(active.executor, snapshot, { kind: "calendar.advance_phase" });
  }
  return { executor: active.executor, snapshot };
}

describe("PoC workflow game-command executor", () => {
  it("charges Opening costs once across interruption, continuation, and finalization", () => {
    const fixture = createOpeningInterruptionFixtureV1();
    const ready = openingReadySnapshotV1(fixture);
    const ledgerLengthBeforeStart = ready.snapshot.state.simulation.inventory.ledger.length;
    const attempt = ready.executor.executeAttempt(
      ready.snapshot,
      { kind: "tavern.opening.start" },
      undefined,
    );
    expect(attempt.result.kind, JSON.stringify(attempt)).toBe("committed");
    if (attempt.result.kind !== "committed") return;

    const started = attempt.result.snapshot;
    const opening = started.state.simulation.activeWorkflow;
    expect(opening).toMatchObject({ kind: "opening", checkpoint: "started" });
    if (opening?.kind !== "opening") return;
    expect(started.state.story.narrative).toMatchObject({
      status: "active",
      source: { kind: "event", eventId: "event.fixture_opening_interrupt" },
    });
    expect(opening.blockingEvent).toMatchObject({
      eventId: "event.fixture_opening_interrupt",
    });
    expect(opening.baseline).toMatchObject({
      mode: "manual",
      ap: { before: 2, after: 1 },
      playerStamina: { before: 10, after: 9 },
      heroineStamina: { before: 10, after: 9 },
      cashAtStart: { before: 99, after: 94 },
    });
    expect(
      started.state.simulation.inventory.ledger
        .slice(ledgerLengthBeforeStart)
        .map(({ category, cashDelta }) => ({ category, cashDelta })),
    ).toEqual([
      { category: "wage", cashDelta: -3 },
      { category: "opening_fee", cashDelta: -2 },
    ]);
    expect(opening.baseline.startEntryIds).toEqual(
      started.state.simulation.inventory.ledger
        .slice(ledgerLengthBeforeStart)
        .map(({ entryId }) => entryId),
    );

    const readyToFinalize = continueOpeningToReadyV1(ready.executor, started);
    expect(readyToFinalize.state.simulation.inventory.cash).toBe(94);
    expect(readyToFinalize.state.simulation.inventory.ledger).toEqual(
      started.state.simulation.inventory.ledger,
    );
    expect(readyToFinalize.state.simulation.activeWorkflow).toMatchObject({
      kind: "opening",
      checkpoint: "ready_to_finalize",
      baseline: opening.baseline,
      triggeredEventIds: ["event.fixture_opening_interrupt"],
      blockingEvent: null,
    });

    const finalizedAttempt = ready.executor.executeAttempt(
      readyToFinalize,
      { kind: "tavern.opening.finalize" },
      undefined,
    );
    expect(finalizedAttempt.result.kind, JSON.stringify(finalizedAttempt)).toBe("committed");
    if (finalizedAttempt.result.kind !== "committed") return;
    const finalized = finalizedAttempt.result.snapshot;
    expect(finalized.state.simulation.activeWorkflow).toBeNull();
    expect(finalized.state.simulation.calendar.eveningResolved).toBe(true);
    expect(finalized.state.simulation.tavern.serviceHistory).toHaveLength(1);
    const history = finalized.state.simulation.tavern.serviceHistory[0];
    expect(history).toMatchObject({
      kind: "opening",
      opening: {
        sessionId: opening.sessionId,
        ap: opening.baseline.ap,
        playerStamina: opening.baseline.playerStamina,
        heroineStamina: opening.baseline.heroineStamina,
        cash: { before: 99, after: 97 },
        triggeredEventIds: ["event.fixture_opening_interrupt"],
      },
    });
    expect(finalized.state.simulation.inventory.cash).toBe(97);
    expect(finalizedAttempt.result.facts.map(({ kind }) => kind)).toContain("opening.finalized");
  });

  it("rejects an unaffordable Opening and rolls a settlement fault back to its baseline", () => {
    const fixture = createOpeningInterruptionFixtureV1();
    const missingIngredient = openingReadySnapshotV1(fixture, { buyIngredient: false });
    const rejected = missingIngredient.executor.executeAttempt(
      missingIngredient.snapshot,
      { kind: "tavern.opening.start" },
      undefined,
    );
    expect(rejected.result).toMatchObject({
      kind: "rejected",
      reasons: [{ code: "inventory.insufficient_ingredient" }],
    });
    expect(rejected.result.snapshot).toBe(missingIngredient.snapshot);
    expect(rejected.diagnostics.committedRngAfter).toBe(missingIngredient.snapshot.rng);

    const brokenProgram = withProgramDataV1(fixture, fixture.program.data, (data, fixtureRules) => {
      const tavern = createPocTavernSettlementResolverV1(data);
      return {
        ...fixtureRules,
        tavern: {
          preview: tavern.preview,
          settle() {
            throw new TypeError("fixture settlement failure");
          },
        },
      };
    });
    const brokenFixture = deepFreezePocValueV1({ ...fixture, program: brokenProgram });
    const brokenReady = openingReadySnapshotV1(brokenFixture);
    const brokenStarted = requireCommittedV1(brokenReady.executor, brokenReady.snapshot, {
      kind: "tavern.opening.start",
    });
    const brokenFinalizeReady = continueOpeningToReadyV1(brokenReady.executor, brokenStarted);
    const baseline = brokenFinalizeReady.state.simulation.activeWorkflow;
    const faulted = brokenReady.executor.executeAttempt(
      brokenFinalizeReady,
      { kind: "tavern.opening.finalize" },
      undefined,
    );
    expect(faulted.result).toMatchObject({
      kind: "faulted",
      fault: {
        category: "story_rule",
        code: "rule.threw",
        ruleSlot: "tavern.settle",
      },
    });
    expect(faulted.result.snapshot).toBe(brokenFinalizeReady);
    expect(faulted.result.snapshot.state.simulation.activeWorkflow).toBe(baseline);
    expect(faulted.result.snapshot.state.simulation.inventory.cash).toBe(94);
    expect(faulted.result.snapshot.state.simulation.tavern.serviceHistory).toEqual([]);
  });

  it("runs the two WorldAction scenes, costs, check, and effects without a third Narrative", () => {
    const fixture = createWorldActionFixtureV1();
    const active = startAndActivateV1(fixture);
    const action = fixture.program.data.content.worldActions[0]!;
    const begunAttempt = active.executor.executeAttempt(
      active.snapshot,
      {
        kind: "world.action.begin",
        actionId: action.actionId,
        optionId: action.options[0]!.optionId,
      },
      undefined,
    );
    expect(begunAttempt.result.kind, JSON.stringify(begunAttempt)).toBe("committed");
    if (begunAttempt.result.kind !== "committed") return;
    let snapshot = begunAttempt.result.snapshot;
    expect(snapshot.state.simulation.activeWorkflow).toMatchObject({
      kind: "world_action",
      progress: "begin_scene",
      preparationBonus: 1,
    });
    const workflow = snapshot.state.simulation.activeWorkflow;
    if (workflow?.kind !== "world_action") return;
    const worldCostEntries = snapshot.state.simulation.inventory.ledger.filter(
      ({ category }) => category === "world_action",
    );
    expect(worldCostEntries).toHaveLength(1);
    expect(worldCostEntries[0]).toMatchObject({
      cashDelta: -8,
      subject: { kind: "action", actionId: action.actionId },
    });
    expect(workflow.paidCostEntryIds).toEqual(worldCostEntries.map(({ entryId }) => entryId));
    expect(snapshot.state.simulation.calendar.apRemaining).toBe(1);
    expect(snapshot.state.simulation.inventory.cash).toBe(92);
    expect(snapshot.state.simulation.actors.player.stamina.current).toBe(7);
    expect(snapshot.state.simulation.actors.relationship).toMatchObject({
      affection: 2,
      teamwork: 3,
    });
    expect(snapshot.state.story.narrative).toMatchObject({
      status: "active",
      source: { kind: "world_action", actionId: action.actionId },
      cursor: { sceneId: "scene.fixture_world_begin" },
    });

    snapshot = requireCommittedV1(active.executor, snapshot, { kind: "narrative.advance" });
    expect(snapshot.state.simulation.activeWorkflow).toMatchObject({
      kind: "world_action",
      progress: "awaiting_completion_phase",
    });
    snapshot = requireCommittedV1(active.executor, snapshot, { kind: "calendar.advance_phase" });
    expect(snapshot.state.simulation.activeWorkflow).toMatchObject({
      kind: "world_action",
      progress: "completion_scene",
    });
    expect(snapshot.state.story.narrative.cursor).toMatchObject({
      sceneId: "scene.fixture_world_complete",
    });
    snapshot = requireCommittedV1(active.executor, snapshot, { kind: "narrative.advance" });
    expect(snapshot.state.simulation.activeWorkflow).toMatchObject({
      kind: "world_action",
      progress: "ready_to_complete",
    });
    const completedAttempt = active.executor.executeAttempt(
      snapshot,
      { kind: "world.action.complete" },
      undefined,
    );
    expect(completedAttempt.result.kind, JSON.stringify(completedAttempt)).toBe("committed");
    if (completedAttempt.result.kind !== "committed") return;
    snapshot = completedAttempt.result.snapshot;
    expect(snapshot.state.simulation.activeWorkflow).toBeNull();
    expect(snapshot.state.story.narrative).toMatchObject({
      status: "completed",
      source: { kind: "world_action", actionId: action.actionId },
      cursor: null,
    });
    expect(snapshot.state.story.resolvedChecks).toHaveLength(1);
    expect(snapshot.state.story.resolvedChecks[0]).toMatchObject({
      checkId: action.checkId,
      preparationBonus: 1,
      resolvedAtSequence: snapshot.commandSequence,
    });
    expect(snapshot.state.story.facts).toContainEqual({
      factId: "fact.fixture",
      value: { kind: "boolean", value: true },
    });
    expect(snapshot.state.simulation.calendar.apRemaining).toBe(1);
    expect(snapshot.state.simulation.inventory.cash).toBe(92);
    expect(snapshot.state.simulation.actors.player.stamina.current).toBe(7);
    expect(completedAttempt.diagnostics.attemptedDraws).toHaveLength(2);
    expect(completedAttempt.result.facts.map(({ kind }) => kind)).toContain(
      "world.action_completed",
    );
  });

  it("rejects invalid WorldAction transitions and atomically rolls back resource/conflict paths", () => {
    const fixture = createWorldActionFixtureV1();
    const active = startAndActivateV1(fixture);
    const missing = active.executor.executeAttempt(
      active.snapshot,
      { kind: "world.action.complete" },
      undefined,
    );
    expect(missing.result).toMatchObject({
      kind: "rejected",
      reasons: [{ code: "workflow.missing" }],
    });
    expect(missing.result.snapshot).toBe(active.snapshot);

    const expensiveFixture = createWorldActionFixtureV1({ baseCashCost: 101 });
    const expensiveActive = startAndActivateV1(expensiveFixture);
    const expensiveAction = expensiveFixture.program.data.content.worldActions[0]!;
    const insufficient = expensiveActive.executor.executeAttempt(
      expensiveActive.snapshot,
      {
        kind: "world.action.begin",
        actionId: expensiveAction.actionId,
        optionId: expensiveAction.options[0]!.optionId,
      },
      undefined,
    );
    expect(insufficient.result).toMatchObject({
      kind: "rejected",
      reasons: [{ code: "inventory.insufficient_cash" }],
    });
    expect(insufficient.result.snapshot).toBe(expensiveActive.snapshot);
    expect(insufficient.diagnostics.committedRngAfter).toBe(expensiveActive.snapshot.rng);

    const conflictFixture = createWorldActionFixtureV1({ conflict: true });
    const conflictActive = startAndActivateV1(conflictFixture);
    const conflictAction = conflictFixture.program.data.content.worldActions[0]!;
    const conflict = conflictActive.executor.executeAttempt(
      conflictActive.snapshot,
      {
        kind: "world.action.begin",
        actionId: conflictAction.actionId,
        optionId: conflictAction.options[0]!.optionId,
      },
      undefined,
    );
    expect(conflict.result).toMatchObject({
      kind: "faulted",
      fault: { category: "engine_invariant", code: "narrative.blocking_conflict" },
    });
    expect(conflict.result.snapshot).toBe(conflictActive.snapshot);
    expect(conflict.result.snapshot.state.simulation.inventory.cash).toBe(100);
    expect(conflict.result.snapshot.state.simulation.actors.player.stamina.current).toBe(10);
    expect(conflict.diagnostics.committedRngAfter).toBe(conflictActive.snapshot.rng);
  });

  it("guards levy due time and orders command.succeeded before week.ended", () => {
    const notDueFixture = createLevyFixtureV1(75);
    const notDueActive = startAndActivateV1(notDueFixture);
    const afternoon = requireCommittedV1(notDueActive.executor, notDueActive.snapshot, {
      kind: "calendar.advance_phase",
    });
    const notDue = notDueActive.executor.executeAttempt(afternoon, { kind: "levy.pay" }, undefined);
    expect(notDue.result).toMatchObject({
      kind: "rejected",
      reasons: [{ code: "levy.not_due", details: { day: 1, phase: "afternoon" } }],
    });
    expect(notDue.result.snapshot).toBe(afternoon);

    const paidFixture = createLevyFixtureV1(75, { terminalEvents: true });
    const paidDue = reachLevyDueV1(paidFixture, true);
    const paidAttempt = paidDue.executor.executeAttempt(
      paidDue.snapshot,
      { kind: "levy.pay" },
      undefined,
    );
    expect(paidAttempt.result.kind, JSON.stringify(paidAttempt)).toBe("committed");
    if (paidAttempt.result.kind !== "committed") return;
    const paid = paidAttempt.result.snapshot;
    expect(paid.state.simulation.run).toMatchObject({
      status: "completed_stable",
      completion: { status: "completed_stable", levy: { kind: "paid" } },
    });
    expect(paid.state.simulation.inventory.cash).toBe(20);
    expect(paid.state.simulation.calendar).toMatchObject({ day: 7, phase: "afternoon" });
    expect(paid.state.simulation.run.completion?.completedAtSequence).toBe(paid.commandSequence);
    expect(paid.state.story.facts).toContainEqual({
      factId: "fact.fixture",
      value: { kind: "boolean", value: true },
    });
    expect(paid.state.story.quests).toContainEqual({
      questId: "quest.fixture",
      status: "completed",
      progress: 1,
      target: 1,
    });
    const terminalFacts = paidAttempt.result.facts;
    const completedIndex = terminalFacts.findIndex(({ kind }) => kind === "run.completed");
    const commandEventIndex = terminalFacts.findIndex(
      (fact) =>
        fact.kind === "scheduler.event_triggered" && fact.eventId === "event.fixture_levy_command",
    );
    const factSetIndex = terminalFacts.findIndex(({ kind }) => kind === "fact.set");
    const weekEventIndex = terminalFacts.findIndex(
      (fact) =>
        fact.kind === "scheduler.event_triggered" && fact.eventId === "event.fixture_week_end",
    );
    const questIndex = terminalFacts.findIndex(({ kind }) => kind === "quest.updated");
    for (const factIndex of [
      completedIndex,
      commandEventIndex,
      factSetIndex,
      weekEventIndex,
      questIndex,
    ]) {
      expect(factIndex).toBeGreaterThanOrEqual(0);
    }
    expect(completedIndex).toBeLessThan(commandEventIndex);
    expect(commandEventIndex).toBeLessThan(factSetIndex);
    expect(factSetIndex).toBeLessThan(weekEventIndex);
    expect(weekEventIndex).toBeLessThan(questIndex);
    expect(paidAttempt.result.facts.filter(({ kind }) => kind === "run.completed")).toHaveLength(1);

    const duplicate = paidDue.executor.executeAttempt(paid, { kind: "levy.pay" }, undefined);
    expect(duplicate.result).toMatchObject({
      kind: "rejected",
      reasons: [{ code: "run.invalid_status" }],
    });
    expect(duplicate.result.snapshot).toBe(paid);
  });

  it("records arrears without a debit and rolls back an Ending fault", () => {
    const arrearsFixture = createLevyFixtureV1(101);
    const arrearsDue = reachLevyDueV1(arrearsFixture, false);
    const arrears = requireCommittedV1(arrearsDue.executor, arrearsDue.snapshot, {
      kind: "levy.pay",
    });
    expect(arrears.state.simulation.run).toMatchObject({
      status: "failed_arrears",
      completion: {
        status: "failed_arrears",
        levy: { kind: "arrears", availableCash: 100, shortfall: 1 },
      },
    });
    expect(arrears.state.simulation.inventory.cash).toBe(100);
    expect(arrears.state.simulation.inventory.ledger.at(-1)?.category).not.toBe("levy");

    const baseFaultFixture = createLevyFixtureV1(75);
    const faultProgram = withProgramDataV1(
      baseFaultFixture,
      baseFaultFixture.program.data,
      (_data, fixtureRules) => ({
        ...fixtureRules,
        endings: {
          evaluate() {
            throw new TypeError("fixture ending failure");
          },
        },
      }),
    );
    const faultFixture = deepFreezePocValueV1({
      ...baseFaultFixture,
      program: faultProgram,
    });
    const faultDue = reachLevyDueV1(faultFixture, false);
    const faulted = faultDue.executor.executeAttempt(
      faultDue.snapshot,
      { kind: "levy.pay" },
      undefined,
    );
    expect(faulted.result).toMatchObject({
      kind: "faulted",
      fault: {
        category: "story_rule",
        code: "rule.threw",
        ruleSlot: "endings.evaluate",
      },
    });
    expect(faulted.result.snapshot).toBe(faultDue.snapshot);
    expect(faulted.result.snapshot.state.simulation.inventory.cash).toBe(100);
    expect(faulted.result.snapshot.state.simulation.run).toMatchObject({
      status: "active",
      completion: null,
    });
    expect(faulted.result.snapshot.state.simulation.inventory.ledger).toEqual(
      faultDue.snapshot.state.simulation.inventory.ledger,
    );
  });
});
