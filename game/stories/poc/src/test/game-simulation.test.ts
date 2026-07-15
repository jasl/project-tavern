// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  defineGameSimulation,
  parseModuleId,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "@sillymaker/base";
import type {
  BootstrapEntropyV1,
  DeepReadonly,
  StatefulGameplayModuleBindingV1,
} from "@sillymaker/base";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  createInitialPocGameStateV1,
  createPocGameBootstrapInputV1,
  createPocGameSimulationV1,
} from "../gameplay/game-simulation.js";
import {
  pocGameplayModuleDescriptorsV1,
  pocGameplayModuleKeysV1,
} from "../gameplay/contracts/module-catalog.js";
import {
  pocRejectionReasonSchemaV1,
  pocSimulationDataSchemaV1,
} from "../gameplay/contracts/schemas.js";
import type {
  PocGameSimulationTypesV1,
  PocRejectionReasonV1,
  PocSimulationProgramV1,
} from "../gameplay/contracts/types.js";
import {
  deepFreezePocValueV1,
  parseMoney,
  parseNonZeroUint32,
} from "../gameplay/contracts/values.js";
import {
  createPocGameplayModuleTupleV1,
  type PocGameplayModuleTupleV1,
} from "../gameplay/modules/index.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

interface ForeignSimulationTypesV1 extends PocGameSimulationTypesV1 {
  readonly foreignSimulation: true;
}

type ForeignGameplayBindingV1 =
  PocGameplayModuleTupleV1[0] extends StatefulGameplayModuleBindingV1<
    PocGameSimulationTypesV1,
    infer TStateSlice,
    infer TModuleCommand,
    infer TModuleQuery,
    infer TModuleQueryResult,
    infer TOwnerOperation,
    infer TOwnerProposal,
    infer TReadPort,
    infer TDependencyPorts
  >
    ? StatefulGameplayModuleBindingV1<
        ForeignSimulationTypesV1,
        TStateSlice,
        TModuleCommand,
        TModuleQuery,
        TModuleQueryResult,
        TOwnerOperation,
        TOwnerProposal,
        TReadPort,
        TDependencyPorts
      >
    : never;

function exhaustiveRejectionCodesV1<const TCodes extends readonly PocRejectionReasonV1["code"][]>(
  codes: TCodes &
    (Exclude<PocRejectionReasonV1["code"], TCodes[number]> extends never
      ? unknown
      : {
          readonly missing: Exclude<PocRejectionReasonV1["code"], TCodes[number]>;
        }),
): TCodes {
  return codes;
}

const pocRejectionCodesV1 = exhaustiveRejectionCodesV1([
  "run.invalid_status",
  "run.already_started",
  "run.not_started",
  "run.policy_required",
  "command.unknown_reference",
  "command.blocked_by_narrative",
  "command.blocked_by_workflow",
  "policy.already_chosen",
  "calendar.invalid_phase",
  "calendar.insufficient_ap",
  "calendar.phase_blocked",
  "action.unavailable",
  "actor.insufficient_stamina",
  "actor.stamina_at_maximum",
  "tavern.preparation_limit_reached",
  "inventory.invalid_quantity",
  "inventory.duplicate_line",
  "inventory.line_limit_exceeded",
  "inventory.insufficient_cash",
  "inventory.insufficient_ingredient",
  "facility.unavailable",
  "facility.target_not_offered",
  "facility.already_built",
  "facility.choice_committed",
  "aura.already_present",
  "aura.not_found",
  "tavern.invalid_plan",
  "tavern.plan_frozen",
  "tavern.service_unavailable",
  "tavern.opening_plan_missing",
  "tavern.evening_resolved",
  "tavern.opening_active",
  "tavern.opening_missing",
  "tavern.opening_checkpoint_blocked",
  "tavern.opening_continue_not_needed",
  "tavern.opening_not_ready",
  "workflow.conflict",
  "workflow.missing",
  "world.action_unavailable",
  "world.action_wrong_phase",
  "narrative.inactive",
  "narrative.cursor_mismatch",
  "narrative.choice_required",
  "narrative.choice_hidden",
  "narrative.choice_disabled",
  "levy.not_due",
  "story.rule_rejected",
  "engine.invariant_rejected",
] as const);

describe("PoC GameSimulation", () => {
  it("keeps foreign bindings outside the PoC compile-time type witness", () => {
    expectTypeOf<ForeignGameplayBindingV1>().not.toMatchTypeOf<PocGameplayModuleTupleV1[number]>();
  });

  it("rejects a duplicate State owner at runtime", () => {
    const fixture = createPocGameplayFixtureV1();
    const simulation = createPocGameSimulationV1(fixture.program);
    const duplicateRun = Object.freeze({
      ...simulation.modules[0],
      descriptor: Object.freeze({
        id: parseModuleId("module.duplicate_run"),
        contractRevision: parsePositiveSafeInteger(1),
        stateSlots: Object.freeze([parseStateSlotId("simulation.run")]),
        dependencies: Object.freeze([]),
      }),
    });
    const modules = Object.freeze([...simulation.modules, duplicateRun]);
    const defineUnsafe = defineGameSimulation<PocGameSimulationTypesV1>() as unknown as (
      value: unknown,
    ) => unknown;

    expect(() => defineUnsafe({ ...simulation, modules })).toThrow(/duplicate State slot/u);
  });

  it("draws bootstrap entropy exactly once in the frozen order", () => {
    const calls: string[] = [];
    const expectedSeed = parseNonZeroUint32(0x1020_3040);
    const expectedRunId = "00000000-0000-4000-8000-000000000412";
    const entropy: BootstrapEntropyV1 = Object.freeze({
      nextNonZeroUint32() {
        calls.push("nextNonZeroUint32");
        return expectedSeed;
      },
      nextUuidV4() {
        calls.push("nextUuidV4");
        return expectedRunId;
      },
    });

    const bootstrap = createPocGameBootstrapInputV1(entropy);

    expect(bootstrap).toEqual({ rngSeed: expectedSeed, runId: expectedRunId });
    expect(Object.isFrozen(bootstrap)).toBe(true);
    expect(calls).toEqual(["nextNonZeroUint32", "nextUuidV4"]);
  });

  it("assembles initial State from the exact fixed module tuple", () => {
    const fixture = createPocGameplayFixtureV1();
    const modules = createPocGameplayModuleTupleV1(fixture.program);
    const run = modules[0].createInitialState(fixture.bootstrap);
    const calendar = modules[1].createInitialState(fixture.bootstrap);
    const actors = modules[2].createInitialState(fixture.bootstrap);
    const status = modules[3].createInitialState(fixture.bootstrap);
    const inventory = modules[4].createInitialState(fixture.bootstrap);
    const facilities = modules[5].createInitialState(fixture.bootstrap);
    const tavern = modules[6].createInitialState(fixture.bootstrap);
    const activeWorkflow = modules[7].createInitialState(fixture.bootstrap);
    const progression = modules[8].createInitialState(fixture.bootstrap);
    const narrative = modules[9].createInitialState(fixture.bootstrap);

    expect(modules.map(({ descriptor }) => descriptor.id)).toEqual(
      pocGameplayModuleKeysV1.map((key) => `module.${key}`),
    );
    expect(modules.map(({ descriptor }) => descriptor)).toEqual(pocGameplayModuleDescriptorsV1);
    expect(createInitialPocGameStateV1(modules, fixture.bootstrap)).toEqual({
      simulation: {
        run,
        calendar,
        actors,
        inventory,
        status,
        facilities,
        tavern,
        activeWorkflow,
      },
      story: {
        facts: progression.facts,
        quests: progression.quests,
        outcomes: progression.outcomes,
        resolvedChecks: progression.resolvedChecks,
        narrative,
      },
    });
    expect(createInitialPocGameStateV1(modules, fixture.bootstrap)).toEqual(fixture.snapshot.state);
  });

  it("closes schemas, executors, queries, and projection over one program", () => {
    const fixture = createPocGameplayFixtureV1();
    const simulation = createPocGameSimulationV1(fixture.program);

    expect(Object.isFrozen(simulation)).toBe(true);
    expect(simulation.modules).toHaveLength(10);
    expect("createQueries" in simulation.commandExecutor).toBe(false);
    expect("createQueries" in simulation.debugCommandExecutor).toBe(false);
    expect(simulation.stateSchema.parse(fixture.snapshot.state)).toEqual(fixture.snapshot.state);
    expect(simulation.createInitialState(fixture.bootstrap)).toEqual(fixture.snapshot.state);
    expect({
      maxNarrativeStepsPerCommand: fixture.program.data.balance.maxNarrativeStepsPerCommand,
      maxNarrativeCallDepth: fixture.program.data.balance.maxNarrativeCallDepth,
    }).toEqual({
      maxNarrativeStepsPerCommand: 128,
      maxNarrativeCallDepth: 8,
    });
    const queries = simulation.createQueries(fixture.snapshot.state);
    expect(simulation.projectGameView(queries)).toMatchObject({
      status: "setup",
      hud: { day: 1, phase: "morning" },
      runStartControl: { command: { kind: "run.start" } },
    });
  });

  it("keeps ordinary lifecycle rejection details state-only and strict", () => {
    expect(pocRejectionReasonSchemaV1.parse({ code: "run.already_started", details: {} })).toEqual({
      code: "run.already_started",
      details: {},
    });
    expect(() =>
      pocRejectionReasonSchemaV1.parse({
        code: "run.already_started",
        details: { commandSequence: 1 },
      }),
    ).toThrow();
  });

  it("strict-parses one complete vector for every rejection code", () => {
    const cursor = { sceneId: "scene.fixture", nodeId: "node.fixture" } as const;
    const vectors: readonly unknown[] = [
      {
        code: "run.invalid_status",
        details: { actual: "setup", allowed: ["active"] },
      },
      { code: "run.already_started", details: {} },
      { code: "run.not_started", details: { commandKind: "actor.rest" } },
      { code: "run.policy_required", details: { commandKind: "actor.rest" } },
      {
        code: "command.unknown_reference",
        details: {
          commandKind: "policy.choose",
          reference: { kind: "policy", policyId: "policy.fixture" },
        },
      },
      {
        code: "command.blocked_by_narrative",
        details: { commandKind: "actor.rest", cursor },
      },
      {
        code: "command.blocked_by_workflow",
        details: {
          commandKind: "actor.rest",
          blocker: { kind: "opening", checkpoint: "started" },
        },
      },
      { code: "policy.already_chosen", details: { policyId: "policy.fixture" } },
      {
        code: "calendar.invalid_phase",
        details: { actual: "morning", allowed: ["afternoon"] },
      },
      { code: "calendar.insufficient_ap", details: { required: 1, available: 0 } },
      { code: "calendar.phase_blocked", details: { blocker: "narrative" } },
      {
        code: "action.unavailable",
        details: { actionId: "action.fixture", reasonId: "reason.fixture" },
      },
      {
        code: "actor.insufficient_stamina",
        details: { actorId: "actor.player", required: 1, available: 0 },
      },
      {
        code: "actor.stamina_at_maximum",
        details: { actorId: "actor.player", maximum: 1 },
      },
      { code: "tavern.preparation_limit_reached", details: { current: 1, limit: 1 } },
      {
        code: "inventory.invalid_quantity",
        details: { ingredientId: "ingredient.fixture", quantity: -1 },
      },
      {
        code: "inventory.duplicate_line",
        details: { ingredientId: "ingredient.fixture" },
      },
      { code: "inventory.line_limit_exceeded", details: { actual: 1, limit: 1 } },
      { code: "inventory.insufficient_cash", details: { required: 1, available: 0 } },
      {
        code: "inventory.insufficient_ingredient",
        details: { ingredientId: "ingredient.fixture", required: 1, available: 0 },
      },
      {
        code: "facility.unavailable",
        details: {
          opportunityId: "action.fixture",
          facilityId: null,
          reasonId: "reason.fixture",
        },
      },
      {
        code: "facility.target_not_offered",
        details: { opportunityId: "action.fixture", facilityId: "facility.fixture" },
      },
      { code: "facility.already_built", details: { facilityId: "facility.fixture" } },
      {
        code: "facility.choice_committed",
        details: {
          opportunityId: "action.fixture",
          choice: { kind: "built", facilityId: "facility.fixture" },
        },
      },
      {
        code: "aura.already_present",
        details: { auraId: "aura.fixture", target: { kind: "run" } },
      },
      {
        code: "aura.not_found",
        details: { auraId: "aura.fixture", target: { kind: "run" } },
      },
      { code: "tavern.invalid_plan", details: { reason: "menu_size" } },
      { code: "tavern.plan_frozen", details: { day: 1, phase: "morning" } },
      {
        code: "tavern.service_unavailable",
        details: { mode: "manual", reasonId: "reason.fixture" },
      },
      { code: "tavern.opening_plan_missing", details: { day: 1 } },
      { code: "tavern.evening_resolved", details: { day: 1, planMode: null } },
      { code: "tavern.opening_active", details: { sessionId: "opening:1" } },
      {
        code: "tavern.opening_missing",
        details: { commandKind: "tavern.opening.continue" },
      },
      {
        code: "tavern.opening_checkpoint_blocked",
        details: { checkpoint: "started", eventId: null },
      },
      {
        code: "tavern.opening_continue_not_needed",
        details: { checkpoint: "ready_to_finalize" },
      },
      { code: "tavern.opening_not_ready", details: { checkpoint: "started" } },
      {
        code: "workflow.conflict",
        details: { activeKind: "opening", attemptedKind: "world_action" },
      },
      {
        code: "workflow.missing",
        details: { expectedKind: "world_action", commandKind: "world.action.complete" },
      },
      {
        code: "world.action_unavailable",
        details: {
          actionId: "action.fixture",
          optionId: null,
          reasonId: "reason.fixture",
        },
      },
      {
        code: "world.action_wrong_phase",
        details: { actionId: "action.fixture", expected: "evening", actual: "morning" },
      },
      { code: "narrative.inactive", details: { commandKind: "narrative.advance" } },
      { code: "narrative.cursor_mismatch", details: { expected: cursor, actual: null } },
      { code: "narrative.choice_required", details: { cursor } },
      { code: "narrative.choice_hidden", details: { choiceId: "choice.fixture" } },
      {
        code: "narrative.choice_disabled",
        details: { choiceId: "choice.fixture", reasonId: "reason.fixture" },
      },
      { code: "levy.not_due", details: { day: 1, phase: "morning" } },
      {
        code: "story.rule_rejected",
        details: { slot: "demand.preview", reasonId: "reason.fixture" },
      },
      {
        code: "engine.invariant_rejected",
        details: { invariantCode: "snapshot.schema" },
      },
    ];

    const parsed = vectors.map((vector) => pocRejectionReasonSchemaV1.parse(vector));
    expect(parsed.map(({ code }) => code)).toEqual(pocRejectionCodesV1);
    expect(
      parsed.every((reason) => Object.isFrozen(reason) && Object.isFrozen(reason.details)),
    ).toBe(true);
    expect(() =>
      pocRejectionReasonSchemaV1.parse({
        code: "run.invalid_status",
        details: { actual: "setup" },
      }),
    ).toThrow();
    expect(() =>
      pocRejectionReasonSchemaV1.parse({
        code: "run.invalid_status",
        details: { actual: "setup", allowed: ["active"] },
        extra: true,
      }),
    ).toThrow();
  });

  it("does not leak program-bound initial owner values between compositions", () => {
    const fixture = createPocGameplayFixtureV1();
    const alternateData = pocSimulationDataSchemaV1.parse({
      ...fixture.program.data,
      initialState: {
        ...fixture.program.data.initialState,
        cash: parseMoney(fixture.program.data.initialState.cash + 1),
      },
    });
    const alternateProgram = deepFreezePocValueV1<PocSimulationProgramV1>({
      data: alternateData,
      rules: fixture.program.rules,
    });
    const first = createPocGameSimulationV1(fixture.program);
    const second = createPocGameSimulationV1(alternateProgram);

    expect(first.createInitialState(fixture.bootstrap).simulation.inventory.cash).toBe(
      fixture.program.data.initialState.cash,
    );
    expect(second.createInitialState(fixture.bootstrap).simulation.inventory.cash).toBe(
      alternateData.initialState.cash,
    );
    expect(first.createInitialState(fixture.bootstrap).simulation.inventory.cash).not.toBe(
      second.createInitialState(fixture.bootstrap).simulation.inventory.cash,
    );
  });

  it("retains and invokes the supplied post-Hotfix rule provider", () => {
    const fixture = createPocGameplayFixtureV1();
    const resolve = vi.fn(fixture.program.rules.demand.resolve);
    const program: PocSimulationProgramV1 = Object.freeze({
      data: fixture.program.data,
      rules: Object.freeze({
        ...fixture.program.rules,
        demand: Object.freeze({ ...fixture.program.rules.demand, resolve }),
      }),
    });
    const simulation = createPocGameSimulationV1(program);

    const attempt = simulation.commandExecutor.executeAttempt(
      fixture.snapshot,
      { kind: "run.start" },
      undefined,
    );

    expect(attempt.result.kind).toBe("committed");
    expect(resolve).toHaveBeenCalled();
  });

  it("rejects invalid program-owned Narrative limits at composition", () => {
    const fixture = createPocGameplayFixtureV1();
    const invalid = {
      ...fixture.program,
      data: {
        ...fixture.program.data,
        balance: {
          ...fixture.program.data.balance,
          maxNarrativeStepsPerCommand: 0,
        },
      },
    } as unknown as DeepReadonly<PocSimulationProgramV1>;

    expect(() => createPocGameSimulationV1(invalid)).toThrow();
  });
});
