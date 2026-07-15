// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  deepFreezePocValueV1,
  parseChoiceId,
  parseMoney,
  parseNodeId,
  parseQuantity,
  parseSceneId,
  type PocGameCommandV1,
  type PocGameSnapshotV1,
  type PocSimulationProgramV1,
} from "../gameplay/index.js";
import {
  evaluatePocGameCommandV1,
  explainPocActionAvailabilityV1,
  previewPocTavernPlanV1,
} from "../gameplay/game-command-evaluation.js";
import { createPocGameCommandExecutorV1 } from "../gameplay/game-command-executor.js";
import { createPocGameplayModuleTupleV1 } from "../gameplay/modules/index.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

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

function startAndActivateV1(): {
  readonly fixture: ReturnType<typeof createPocGameplayFixtureV1>;
  readonly executor: ExecutorV1;
  readonly snapshot: PocGameSnapshotV1;
} {
  const fixture = createPocGameplayFixtureV1();
  const executor = createExecutorV1(fixture.program);
  const started = requireCommittedV1(executor, fixture.snapshot, { kind: "run.start" });
  const snapshot = requireCommittedV1(executor, started, {
    kind: "policy.choose",
    policyId: fixture.program.data.balance.lifePolicies[0]!.policyId,
  });
  return { fixture, executor, snapshot };
}

describe("PoC command evaluation", () => {
  it("keeps preview and execution parity across all seventeen command kinds", () => {
    const fixture = createPocGameplayFixtureV1();
    const executor = createExecutorV1(fixture.program);
    const facility = fixture.program.data.content.facilityOpportunities[0]!;
    const storyAction = fixture.program.data.content.storyActions[0]!;
    const worldAction = fixture.program.data.content.worldActions[0]!;
    const commands: readonly PocGameCommandV1[] = [
      { kind: "run.start" },
      {
        kind: "policy.choose",
        policyId: fixture.program.data.balance.lifePolicies[0]!.policyId,
      },
      {
        kind: "inventory.buy",
        lines: [
          {
            ingredientId: fixture.program.data.content.ingredients[0]!.ingredientId,
            quantity: parseQuantity(1),
          },
        ],
      },
      { kind: "actor.prepare_food" },
      { kind: "actor.rest" },
      { kind: "story.action.start", actionId: storyAction.actionId },
      { kind: "facility.choose", opportunityId: facility.opportunityId, choice: { kind: "skip" } },
      { kind: "tavern.plan.set", plan: { mode: "closed", menu: [] } },
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
        sceneId: parseSceneId("scene.fixture_missing"),
        nodeId: parseNodeId("node.fixture_missing"),
        choiceId: parseChoiceId("choice.fixture_missing"),
      },
      { kind: "calendar.advance_phase" },
      { kind: "levy.pay" },
    ];

    expect(commands.map(({ kind }) => kind)).toEqual([
      "run.start",
      "policy.choose",
      "inventory.buy",
      "actor.prepare_food",
      "actor.rest",
      "story.action.start",
      "facility.choose",
      "tavern.plan.set",
      "tavern.opening.start",
      "tavern.opening.continue",
      "tavern.opening.finalize",
      "world.action.begin",
      "world.action.complete",
      "narrative.advance",
      "narrative.choose",
      "calendar.advance_phase",
      "levy.pay",
    ]);

    for (const command of commands) {
      const preview = evaluatePocGameCommandV1(fixture.snapshot.state, fixture.program, command);
      const attempt = executor.executeAttempt(fixture.snapshot, command, undefined);
      if (preview.allowed) {
        expect(attempt.result.kind, command.kind).toBe("committed");
      } else {
        expect(attempt.result, command.kind).toMatchObject({
          kind: "rejected",
          reasons: preview.reasons,
        });
      }
    }
  });

  it("shares ordinary lifecycle rejection details with execution", () => {
    const fixture = createPocGameplayFixtureV1();
    const executor = createExecutorV1(fixture.program);
    const started = requireCommittedV1(executor, fixture.snapshot, { kind: "run.start" });
    const command = { kind: "run.start" } as const;

    const preview = evaluatePocGameCommandV1(started.state, fixture.program, command);
    const attempt = executor.executeAttempt(started, command, undefined);

    expect(preview.allowed).toBe(false);
    if (preview.allowed) throw new TypeError("expected repeated run.start rejection");
    expect(preview).toEqual({
      allowed: false,
      command,
      reasons: [{ code: "run.already_started", details: {} }],
    });
    expect(attempt.result).toMatchObject({
      kind: "rejected",
      reasons: preview.reasons,
    });
  });

  it("shares action guards without mutating State or consuming RNG", () => {
    const fixture = createPocGameplayFixtureV1();
    const executor = createExecutorV1(fixture.program);
    const command = { kind: "actor.rest" } as const;
    const state = fixture.snapshot.state;
    const rngBefore = fixture.snapshot.rng;

    const preview = evaluatePocGameCommandV1(state, fixture.program, command);
    const attempt = executor.executeAttempt(fixture.snapshot, command, undefined);

    expect(preview.allowed).toBe(false);
    if (preview.allowed) throw new TypeError("expected pre-start actor.rest rejection");
    expect(preview).toEqual({
      allowed: false,
      command,
      reasons: [{ code: "run.not_started", details: { commandKind: "actor.rest" } }],
    });
    expect(attempt.result).toMatchObject({ kind: "rejected", reasons: preview.reasons });
    expect(fixture.snapshot.state).toBe(state);
    expect(fixture.snapshot.rng).toBe(rngBefore);
  });

  it("previews an active Opening only from its frozen baseline", () => {
    const active = startAndActivateV1();
    const ingredientId = active.fixture.program.data.content.ingredients[0]!.ingredientId;
    const recipeId = active.fixture.program.data.content.recipes[0]!.recipeId;
    const plan = deepFreezePocValueV1({
      mode: "manual" as const,
      menu: [{ recipeId, portions: parseQuantity(1) }],
    });
    let snapshot = requireCommittedV1(active.executor, active.snapshot, {
      kind: "inventory.buy",
      lines: [{ ingredientId, quantity: parseQuantity(1) }],
    });
    snapshot = requireCommittedV1(active.executor, snapshot, { kind: "tavern.plan.set", plan });
    snapshot = requireCommittedV1(active.executor, snapshot, { kind: "calendar.advance_phase" });
    snapshot = requireCommittedV1(active.executor, snapshot, { kind: "calendar.advance_phase" });
    snapshot = requireCommittedV1(active.executor, snapshot, { kind: "tavern.opening.start" });
    const workflow = snapshot.state.simulation.activeWorkflow;
    expect(workflow?.kind).toBe("opening");
    if (workflow?.kind !== "opening") throw new TypeError("expected active Opening");

    const stateWithUnrelatedCurrentCash = deepFreezePocValueV1({
      ...snapshot.state,
      simulation: {
        ...snapshot.state.simulation,
        inventory: {
          ...snapshot.state.simulation.inventory,
          cash: parseMoney(0),
        },
      },
    });
    const preview = previewPocTavernPlanV1(stateWithUnrelatedCurrentCash, active.fixture.program, {
      menu: plan.menu,
      mode: plan.mode,
    });

    expect(preview.basis).toBe("active_opening_baseline");
    expect(preview.openingCosts.commitment).toBe("committed");
    expect(preview.openingCosts.cash.total).toBe(
      workflow.baseline.cashAtStart.before - workflow.baseline.cashAtStart.after,
    );
  });

  it("keeps parameterized planning available without choosing a representative mode", () => {
    const active = startAndActivateV1();
    const action = active.fixture.program.data.content.actions.find(
      ({ commandKind }) => commandKind === "tavern.plan.set",
    );
    expect(action).toBeDefined();
    if (action === undefined) throw new TypeError("missing Tavern plan Action");

    const explanation = explainPocActionAvailabilityV1(
      active.snapshot.state,
      active.fixture.program,
      action.actionId,
    );

    expect(explanation).toMatchObject({ visible: true, available: true, reasons: [] });
  });

  it("strictly admits Tavern calculations and merges State-semantic plan guards", () => {
    const active = startAndActivateV1();
    const recipe = active.fixture.program.data.content.recipes[0]!;
    expect(() =>
      previewPocTavernPlanV1(active.snapshot.state, active.fixture.program, {
        mode: "closed",
        menu: [{ recipeId: recipe.recipeId, portions: parseQuantity(1) }],
      }),
    ).toThrow();

    const lockedState = deepFreezePocValueV1({
      ...active.snapshot.state,
      simulation: {
        ...active.snapshot.state.simulation,
        tavern: {
          ...active.snapshot.state.simulation.tavern,
          unlockedRecipeIds: [],
        },
      },
    });
    const preview = previewPocTavernPlanV1(lockedState, active.fixture.program, {
      mode: "manual",
      menu: [{ recipeId: recipe.recipeId, portions: parseQuantity(1) }],
    });
    expect(preview.allowed).toBe(false);
    expect(preview.rejectionCodes[0]).toBe("tavern.invalid_plan");
  });

  it("previews arrears without claiming that levy payment spends the remaining cash", () => {
    const active = startAndActivateV1();
    const { levyDue, levyAmount } = active.fixture.program.data.balance;
    const program = deepFreezePocValueV1<PocSimulationProgramV1>({
      ...active.fixture.program,
      data: {
        ...active.fixture.program.data,
        content: {
          ...active.fixture.program.data.content,
          actions: active.fixture.program.data.content.actions.map((action) =>
            action.commandKind === "levy.pay"
              ? { ...action, availablePhases: [levyDue.phase] }
              : action,
          ),
        },
      },
    });
    const state = deepFreezePocValueV1({
      ...active.snapshot.state,
      simulation: {
        ...active.snapshot.state.simulation,
        calendar: {
          ...active.snapshot.state.simulation.calendar,
          day: levyDue.day,
          phase: levyDue.phase,
        },
        inventory: {
          ...active.snapshot.state.simulation.inventory,
          cash: parseMoney(Number(levyAmount) - 1),
        },
      },
    });

    const preview = evaluatePocGameCommandV1(state, program, {
      kind: "levy.pay",
    });

    expect(preview, JSON.stringify(preview)).toMatchObject({ allowed: true, costs: { cash: 0 } });
  });

  it("maps Tavern preview failures to the exact Story rule slot during execution", () => {
    const active = startAndActivateV1();
    const brokenProgram = deepFreezePocValueV1<PocSimulationProgramV1>({
      data: active.fixture.program.data,
      rules: {
        ...active.fixture.program.rules,
        tavern: {
          ...active.fixture.program.rules.tavern,
          preview() {
            throw new TypeError("fixture Tavern preview failure");
          },
        },
      },
    });
    const executor = createExecutorV1(brokenProgram);
    const recipeId = brokenProgram.data.content.recipes[0]!.recipeId;
    const attempt = executor.executeAttempt(
      active.snapshot,
      {
        kind: "tavern.plan.set",
        plan: { mode: "manual", menu: [{ recipeId, portions: parseQuantity(1) }] },
      },
      undefined,
    );

    expect(attempt.result).toMatchObject({
      kind: "faulted",
      fault: { category: "story_rule", code: "rule.threw", ruleSlot: "tavern.preview" },
    });
    expect(attempt.result.snapshot).toBe(active.snapshot);
  });
});
