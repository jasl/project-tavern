// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";
import { canonicalJsonBytes } from "@sillymaker/base";

import { parseAuraInstanceId, parsePolicyId } from "../gameplay/contracts/ids.js";
import { parseNonNegativeSafeInteger } from "../gameplay/contracts/values.js";
import { descriptorForPocModuleV1 } from "../gameplay/contracts/module-catalog.js";
import {
  pocCalendarInvariantV1,
  pocCalendarOwnerOperationSchemaV1,
  pocCalendarOwnerProposalSchemaV1,
  pocCalendarStateSchemaV1,
} from "../gameplay/modules/calendar/contract.js";
import {
  createInitialPocCalendarStateV1,
  createPocCalendarReadPortV1,
  pocCalendarGameplayModuleV1,
  pocCalendarOwnerV1,
} from "../gameplay/modules/calendar/module.js";
import {
  pocRunInvariantV1,
  pocRunOwnerOperationSchemaV1,
  pocRunOwnerProposalSchemaV1,
  pocRunStateSchemaV1,
} from "../gameplay/modules/run/contract.js";
import {
  createInitialPocRunStateV1,
  createPocRunReadPortV1,
  pocRunGameplayModuleV1,
  pocRunOwnerV1,
} from "../gameplay/modules/run/module.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

const emptyRunDependenciesV1 = Object.freeze({});
const calendarDependenciesV1 = Object.freeze({ policyAp: parseNonNegativeSafeInteger(2) });
const afternoonDependenciesV1 = Object.freeze({ policyAp: parseNonNegativeSafeInteger(3) });
const eveningDependenciesV1 = Object.freeze({ policyAp: parseNonNegativeSafeInteger(1) });
const nextMorningDependenciesV1 = Object.freeze({ policyAp: parseNonNegativeSafeInteger(4) });

function createFixtureCompletionInputV1() {
  const fixture = createPocGameplayFixtureV1();
  const relationship = fixture.snapshot.state.story.outcomes[0];
  const investigation = fixture.snapshot.state.story.outcomes[1];
  if (relationship === undefined || investigation === undefined) {
    throw new TypeError("fixture outcomes are incomplete");
  }
  return {
    endingId: "ending.fixture",
    status: "completed_stable",
    levy: { kind: "paid", levyAmount: 10, cash: { before: 100, after: 90 } },
    reasonIds: ["reason.ending.stable"],
    summary: { relationship, investigation },
    completedAtSequence: 1,
  };
}

describe("PoC Run and Calendar ownership", () => {
  it("starts at setup without consuming an authored action", () => {
    const fixture = createPocGameplayFixtureV1();

    expect(pocRunGameplayModuleV1.createInitialState(fixture.bootstrap)).toEqual({
      status: "setup",
      runId: fixture.bootstrap.runId,
      initialSeed: fixture.bootstrap.rngSeed,
      completion: null,
    });
    expect(pocCalendarGameplayModuleV1.createInitialState(fixture.bootstrap)).toEqual({
      day: 1,
      phase: "morning",
      lifePolicyId: null,
      apRemaining: 0,
      eveningResolved: false,
    });
  });

  it("applies only the owned Calendar slice", () => {
    const state = pocCalendarGameplayModuleV1.createInitialState(
      createPocGameplayFixtureV1().bootstrap,
    );
    const proposal = pocCalendarGameplayModuleV1.owner.propose(
      state,
      { kind: "calendar.policy.choose", policyId: parsePolicyId("policy.fixture") },
      Object.freeze({ policyAp: parseNonNegativeSafeInteger(2) }),
    );

    expect(proposal.kind).toBe("proposed");
    if (proposal.kind === "proposed") {
      expect(pocCalendarGameplayModuleV1.owner.apply(state, proposal.proposal)).toMatchObject({
        lifePolicyId: "policy.fixture",
        apRemaining: 2,
      });
    }
  });

  it("publishes copied frozen read ports and exact owner surfaces", () => {
    const fixture = createPocGameplayFixtureV1();
    const run = pocRunGameplayModuleV1.createInitialState(fixture.bootstrap);
    const calendar = pocCalendarGameplayModuleV1.createInitialState(fixture.bootstrap);

    expect(pocRunGameplayModuleV1).toMatchObject({
      bindingKind: "stateful",
      descriptor: {
        id: "module.run",
        contractRevision: 1,
        stateSlots: ["simulation.run"],
        dependencies: [],
      },
      commandSchema: null,
      querySchema: null,
      queryResultSchema: null,
      queries: null,
    });
    expect(pocRunGameplayModuleV1.stateSchema).toBe(pocRunStateSchemaV1);
    expect(pocRunGameplayModuleV1.descriptor).toBe(descriptorForPocModuleV1("run"));
    expect(pocRunGameplayModuleV1.ownerOperationSchema).toBe(pocRunOwnerOperationSchemaV1);
    expect(pocRunGameplayModuleV1.ownerProposalSchema).toBe(pocRunOwnerProposalSchemaV1);
    expect(pocRunGameplayModuleV1.localInvariants).toEqual([pocRunInvariantV1]);
    expect(pocRunGameplayModuleV1.owner).toBe(pocRunOwnerV1);
    expect(pocRunGameplayModuleV1.createInitialState).toBe(createInitialPocRunStateV1);
    expect(pocRunGameplayModuleV1.createReadPort).toBe(createPocRunReadPortV1);
    expect(pocCalendarGameplayModuleV1).toMatchObject({
      bindingKind: "stateful",
      descriptor: {
        id: "module.calendar",
        contractRevision: 1,
        stateSlots: ["simulation.calendar"],
        dependencies: [],
      },
      commandSchema: null,
      querySchema: null,
      queryResultSchema: null,
      queries: null,
    });
    expect(pocCalendarGameplayModuleV1.stateSchema).toBe(pocCalendarStateSchemaV1);
    expect(pocCalendarGameplayModuleV1.descriptor).toBe(descriptorForPocModuleV1("calendar"));
    expect(pocCalendarGameplayModuleV1.ownerOperationSchema).toBe(
      pocCalendarOwnerOperationSchemaV1,
    );
    expect(pocCalendarGameplayModuleV1.ownerProposalSchema).toBe(pocCalendarOwnerProposalSchemaV1);
    expect(pocCalendarGameplayModuleV1.localInvariants).toEqual([pocCalendarInvariantV1]);
    expect(pocCalendarGameplayModuleV1.owner).toBe(pocCalendarOwnerV1);
    expect(pocCalendarGameplayModuleV1.createInitialState).toBe(createInitialPocCalendarStateV1);
    expect(pocCalendarGameplayModuleV1.createReadPort).toBe(createPocCalendarReadPortV1);

    const runPort = pocRunGameplayModuleV1.createReadPort(run);
    const calendarPort = pocCalendarGameplayModuleV1.createReadPort(calendar);
    expect(runPort).toEqual(run);
    expect(calendarPort).toEqual(calendar);
    expect(runPort).not.toBe(run);
    expect(calendarPort).not.toBe(calendar);
    expect(Object.isFrozen(runPort)).toBe(true);
    expect(Object.isFrozen(calendarPort)).toBe(true);
    expect(runPort).not.toHaveProperty("snapshot");
    expect(calendarPort).not.toHaveProperty("run");
  });

  it("exports the Run and Calendar contracts through the named gameplay barrel", async () => {
    const gameplay = await import("../gameplay/index.js");

    expect(gameplay.pocRunGameplayModuleV1).toBe(pocRunGameplayModuleV1);
    expect(gameplay.pocRunStateSchemaV1).toBe(pocRunStateSchemaV1);
    expect(gameplay.createInitialPocRunStateV1).toBe(createInitialPocRunStateV1);
    expect(gameplay.pocCalendarGameplayModuleV1).toBe(pocCalendarGameplayModuleV1);
    expect(gameplay.pocCalendarStateSchemaV1).toBe(pocCalendarStateSchemaV1);
    expect(gameplay.createInitialPocCalendarStateV1).toBe(createInitialPocCalendarStateV1);
  });

  it("activates and completes only the Run slice with stale-proposal protection", () => {
    const fixture = createPocGameplayFixtureV1();
    const setup = pocRunGameplayModuleV1.createInitialState(fixture.bootstrap);
    const setupBytes = canonicalJsonBytes(setup);
    const activate = pocRunGameplayModuleV1.ownerOperationSchema.parse({
      kind: "run.activate",
    });
    const activation = pocRunGameplayModuleV1.owner.propose(
      setup,
      activate,
      emptyRunDependenciesV1,
    );

    expect(activation).toEqual({
      kind: "proposed",
      proposal: {
        payload: {
          kind: "run.activate",
          before: setup,
          after: { ...setup, status: "active" },
        },
        facts: [],
      },
    });
    expect(canonicalJsonBytes(setup)).toEqual(setupBytes);
    if (activation.kind !== "proposed") throw new TypeError("expected Run activation");
    const active = pocRunGameplayModuleV1.owner.apply(setup, activation.proposal);
    expect(active).toEqual({ ...setup, status: "active" });
    expect(() => pocRunGameplayModuleV1.owner.apply(active, activation.proposal)).toThrow(/stale/u);
    expect(pocRunGameplayModuleV1.owner.propose(active, activate, emptyRunDependenciesV1)).toEqual({
      kind: "rejected",
      rejection: {
        code: "run.invalid_status",
        details: { actual: "active", allowed: ["setup"] },
      },
    });

    const complete = pocRunGameplayModuleV1.ownerOperationSchema.parse({
      kind: "run.complete",
      completion: createFixtureCompletionInputV1(),
    });
    if (complete.kind !== "run.complete") throw new TypeError("expected Run completion operation");
    const completion = pocRunGameplayModuleV1.owner.propose(
      active,
      complete,
      emptyRunDependenciesV1,
    );
    expect(completion.kind).toBe("proposed");
    if (completion.kind !== "proposed") throw new TypeError("expected Run completion");
    expect(completion.proposal.facts).toEqual([
      { kind: "run.completed", completion: complete.completion },
    ]);
    const terminal = pocRunGameplayModuleV1.owner.apply(active, completion.proposal);
    expect(terminal).toEqual({
      ...active,
      status: "completed_stable",
      completion: complete.completion,
    });
    expect(
      pocRunGameplayModuleV1.owner.propose(terminal, complete, emptyRunDependenciesV1),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "run.invalid_status",
        details: { actual: "completed_stable", allowed: ["active"] },
      },
    });
    expect(
      pocRunGameplayModuleV1.owner.propose(terminal, activate, emptyRunDependenciesV1),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "run.invalid_status",
        details: { actual: "completed_stable", allowed: ["setup"] },
      },
    });
    for (const valid of [setup, active, terminal]) {
      expect(
        pocRunGameplayModuleV1.localInvariants.flatMap((invariant) =>
          invariant.check(valid, pocRunGameplayModuleV1.createReadPort(valid)),
        ),
      ).toEqual([]);
    }
  });

  it("rejects invalid Run status and malformed Run DTOs without mutation", () => {
    const fixture = createPocGameplayFixtureV1();
    const setup = pocRunGameplayModuleV1.createInitialState(fixture.bootstrap);
    const setupBytes = canonicalJsonBytes(setup);
    const complete = pocRunGameplayModuleV1.ownerOperationSchema.parse({
      kind: "run.complete",
      completion: createFixtureCompletionInputV1(),
    });

    expect(pocRunGameplayModuleV1.owner.propose(setup, complete, emptyRunDependenciesV1)).toEqual({
      kind: "rejected",
      rejection: {
        code: "run.invalid_status",
        details: { actual: "setup", allowed: ["active"] },
      },
    });
    expect(canonicalJsonBytes(setup)).toEqual(setupBytes);
    expect(() =>
      pocRunGameplayModuleV1.ownerOperationSchema.parse({ kind: "run.activate", extra: true }),
    ).toThrow();
    expect(() =>
      pocRunGameplayModuleV1.ownerOperationSchema.parse({
        kind: "run.complete",
        completion: { ...createFixtureCompletionInputV1(), status: "failed_arrears" },
      }),
    ).toThrow();
    expect(() =>
      pocRunGameplayModuleV1.ownerOperationSchema.parse({
        kind: "run.complete",
        completion: {
          ...createFixtureCompletionInputV1(),
          levy: { kind: "paid", levyAmount: 10, cash: { before: 100, after: 91 } },
        },
      }),
    ).toThrow();
    expect(() =>
      pocRunGameplayModuleV1.ownerOperationSchema.parse({
        kind: "run.complete",
        completion: {
          ...createFixtureCompletionInputV1(),
          levy: { kind: "arrears", levyAmount: 10, availableCash: 9, shortfall: 1 },
        },
      }),
    ).toThrow();
    expect(() =>
      pocRunGameplayModuleV1.ownerOperationSchema.parse({
        kind: "run.complete",
        completion: {
          ...createFixtureCompletionInputV1(),
          status: "failed_arrears",
          levy: { kind: "arrears", levyAmount: 10, availableCash: 9, shortfall: 0 },
        },
      }),
    ).toThrow();
    expect(() =>
      pocRunGameplayModuleV1.ownerProposalSchema.parse({
        payload: { kind: "run.activate", before: setup, after: { ...setup, status: "active" } },
        facts: [
          {
            kind: "calendar.ap_changed",
            value: { before: 0, after: 1 },
            reason: {
              kind: "command",
              commandKind: "actor.prepare_food",
              reasonId: "reason.fixture",
            },
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      Reflect.apply(pocRunGameplayModuleV1.owner.propose, undefined, [
        setup,
        pocRunGameplayModuleV1.ownerOperationSchema.parse({ kind: "run.activate" }),
        Object.freeze({ injected: true }),
      ]),
    ).toThrow();

    const invalidTerminal = pocRunGameplayModuleV1.stateSchema.parse({
      ...setup,
      status: "completed_stable",
    });
    expect(
      pocRunGameplayModuleV1.localInvariants.flatMap((invariant) =>
        invariant.check(invalidTerminal, pocRunGameplayModuleV1.createReadPort(invalidTerminal)),
      ),
    ).not.toHaveLength(0);
    const mismatchedCompletion = pocRunGameplayModuleV1.stateSchema.parse({
      ...setup,
      status: "completed_danger",
      completion: createFixtureCompletionInputV1(),
    });
    expect(
      pocRunGameplayModuleV1.localInvariants.flatMap((invariant) =>
        invariant.check(
          mismatchedCompletion,
          pocRunGameplayModuleV1.createReadPort(mismatchedCompletion),
        ),
      ),
    ).not.toHaveLength(0);
  });

  it("chooses one policy and applies signed or debug AP changes", () => {
    const initial = pocCalendarGameplayModuleV1.createInitialState(
      createPocGameplayFixtureV1().bootstrap,
    );
    const initialBytes = canonicalJsonBytes(initial);
    const choose = pocCalendarGameplayModuleV1.ownerOperationSchema.parse({
      kind: "calendar.policy.choose",
      policyId: "policy.fixture",
    });
    const chosenResult = pocCalendarGameplayModuleV1.owner.propose(
      initial,
      choose,
      calendarDependenciesV1,
    );
    if (chosenResult.kind !== "proposed") throw new TypeError("expected policy proposal");
    expect(chosenResult.proposal.facts).toEqual([
      { kind: "policy.chosen", policyId: "policy.fixture", apRemaining: 2 },
    ]);
    const chosen = pocCalendarGameplayModuleV1.owner.apply(initial, chosenResult.proposal);
    expect(canonicalJsonBytes(initial)).toEqual(initialBytes);
    expect(
      pocCalendarGameplayModuleV1.owner.propose(chosen, choose, calendarDependenciesV1),
    ).toEqual({
      kind: "rejected",
      rejection: { code: "policy.already_chosen", details: { policyId: "policy.fixture" } },
    });

    const spend = pocCalendarGameplayModuleV1.ownerOperationSchema.parse({
      kind: "calendar.ap.adjust",
      delta: -1,
      reason: {
        kind: "command",
        commandKind: "actor.prepare_food",
        reasonId: "reason.fixture",
      },
    });
    const spentResult = pocCalendarGameplayModuleV1.owner.propose(
      chosen,
      spend,
      calendarDependenciesV1,
    );
    if (spentResult.kind !== "proposed") throw new TypeError("expected AP proposal");
    expect(spentResult.proposal.facts).toEqual([
      {
        kind: "calendar.ap_changed",
        value: { before: 2, after: 1 },
        reason: spend.reason,
      },
    ]);
    expect(pocCalendarGameplayModuleV1.owner.apply(chosen, spentResult.proposal)).toMatchObject({
      apRemaining: 1,
    });

    const gain = pocCalendarGameplayModuleV1.ownerOperationSchema.parse({
      ...spend,
      delta: 1,
    });
    const gainedResult = pocCalendarGameplayModuleV1.owner.propose(
      chosen,
      gain,
      calendarDependenciesV1,
    );
    if (gainedResult.kind !== "proposed") throw new TypeError("expected positive AP proposal");
    expect(gainedResult.proposal.facts).toEqual([
      {
        kind: "calendar.ap_changed",
        value: { before: 2, after: 3 },
        reason: gain.reason,
      },
    ]);
    expect(pocCalendarGameplayModuleV1.owner.apply(chosen, gainedResult.proposal)).toMatchObject({
      apRemaining: 3,
    });

    const overspend = pocCalendarGameplayModuleV1.ownerOperationSchema.parse({
      ...spend,
      delta: -3,
    });
    expect(
      pocCalendarGameplayModuleV1.owner.propose(chosen, overspend, calendarDependenciesV1),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "calendar.insufficient_ap",
        details: { required: 3, available: 2 },
      },
    });

    const debugSet = pocCalendarGameplayModuleV1.ownerOperationSchema.parse({
      kind: "calendar.debug.set_ap",
      value: 5,
      reason: {
        kind: "debug",
        commandKind: "debug.calendar.set_ap",
        reasonId: "reason.fixture",
      },
    });
    const debugResult = pocCalendarGameplayModuleV1.owner.propose(
      chosen,
      debugSet,
      calendarDependenciesV1,
    );
    if (debugResult.kind !== "proposed") throw new TypeError("expected debug AP proposal");
    expect(debugResult.proposal.facts).toEqual([
      {
        kind: "calendar.ap_changed",
        value: { before: 2, after: 5 },
        reason: debugSet.reason,
      },
    ]);
    const debugged = pocCalendarGameplayModuleV1.owner.apply(chosen, debugResult.proposal);
    expect(debugged).toMatchObject({ apRemaining: 5 });
    for (const valid of [initial, chosen, debugged]) {
      expect(
        pocCalendarGameplayModuleV1.localInvariants.flatMap((invariant) =>
          invariant.check(valid, pocCalendarGameplayModuleV1.createReadPort(valid)),
        ),
      ).toEqual([]);
    }
  });

  it("owns adjacent phase transitions, evening resolution, and the terminal lock", () => {
    const initial = pocCalendarGameplayModuleV1.createInitialState(
      createPocGameplayFixtureV1().bootstrap,
    );
    const choose = pocCalendarGameplayModuleV1.ownerOperationSchema.parse({
      kind: "calendar.policy.choose",
      policyId: "policy.fixture",
    });
    const chosenResult = pocCalendarGameplayModuleV1.owner.propose(
      initial,
      choose,
      calendarDependenciesV1,
    );
    if (chosenResult.kind !== "proposed") throw new TypeError("expected policy proposal");
    const morning = pocCalendarGameplayModuleV1.owner.apply(initial, chosenResult.proposal);

    const advance = (
      day: number,
      phase: "morning" | "afternoon" | "evening",
      expiredAuraIds: readonly unknown[] = [],
    ) =>
      pocCalendarGameplayModuleV1.ownerOperationSchema.parse({
        kind: "calendar.phase.advance",
        to: { day, phase },
        expiredAuraIds,
        terminalLocked: false,
      });
    const noPolicy = pocCalendarGameplayModuleV1.owner.propose(
      initial,
      advance(1, "afternoon"),
      calendarDependenciesV1,
    );
    expect(noPolicy).toEqual({
      kind: "rejected",
      rejection: {
        code: "run.policy_required",
        details: { commandKind: "calendar.advance_phase" },
      },
    });
    expect(
      pocCalendarGameplayModuleV1.owner.propose(
        morning,
        advance(1, "evening"),
        calendarDependenciesV1,
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "calendar.invalid_phase",
        details: { actual: "morning", allowed: ["afternoon"] },
      },
    });
    expect(
      pocCalendarGameplayModuleV1.owner.propose(
        morning,
        advance(2, "afternoon"),
        afternoonDependenciesV1,
      ),
    ).toMatchObject({
      kind: "rejected",
      rejection: { code: "calendar.invalid_phase" },
    });

    const expiredAuraIds = Object.freeze([
      parseAuraInstanceId("aura:1:1"),
      parseAuraInstanceId("aura:1:0"),
    ]);
    const afternoonResult = pocCalendarGameplayModuleV1.owner.propose(
      morning,
      advance(1, "afternoon", expiredAuraIds),
      afternoonDependenciesV1,
    );
    if (afternoonResult.kind !== "proposed") throw new TypeError("expected afternoon");
    expect(afternoonResult.proposal.payload).toEqual({
      kind: "calendar.phase.advance",
      before: morning,
      after: {
        ...morning,
        phase: "afternoon",
        apRemaining: 3,
      },
    });
    const afternoon = pocCalendarGameplayModuleV1.owner.apply(morning, afternoonResult.proposal);
    expect(() =>
      pocCalendarGameplayModuleV1.owner.apply(afternoon, afternoonResult.proposal),
    ).toThrow(/stale/u);
    expect(afternoonResult.proposal.facts).toEqual([
      {
        kind: "calendar.phase_advanced",
        from: { day: 1, phase: "morning" },
        to: { day: 1, phase: "afternoon" },
        apRemaining: 3,
        expiredAuraIds,
      },
    ]);

    const eveningResult = pocCalendarGameplayModuleV1.owner.propose(
      afternoon,
      advance(1, "evening"),
      eveningDependenciesV1,
    );
    if (eveningResult.kind !== "proposed") throw new TypeError("expected evening");
    const evening = pocCalendarGameplayModuleV1.owner.apply(afternoon, eveningResult.proposal);
    expect(evening).toMatchObject({ apRemaining: 1 });
    expect(
      pocCalendarGameplayModuleV1.owner.propose(
        evening,
        advance(2, "morning"),
        nextMorningDependenciesV1,
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "calendar.phase_blocked",
        details: { blocker: "evening_unresolved" },
      },
    });

    const resolve = pocCalendarGameplayModuleV1.ownerOperationSchema.parse({
      kind: "calendar.evening.resolve",
    });
    expect(
      pocCalendarGameplayModuleV1.owner.propose(morning, resolve, calendarDependenciesV1),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "calendar.invalid_phase",
        details: { actual: "morning", allowed: ["evening"] },
      },
    });
    const resolveResult = pocCalendarGameplayModuleV1.owner.propose(
      evening,
      resolve,
      eveningDependenciesV1,
    );
    if (resolveResult.kind !== "proposed") throw new TypeError("expected evening resolution");
    expect(resolveResult.proposal).toEqual({
      payload: {
        kind: "calendar.evening.resolve",
        before: evening,
        after: { ...evening, eveningResolved: true },
      },
      facts: [],
    });
    const resolved = pocCalendarGameplayModuleV1.owner.apply(evening, resolveResult.proposal);
    expect(
      pocCalendarGameplayModuleV1.owner.propose(
        resolved,
        advance(1, "morning"),
        nextMorningDependenciesV1,
      ),
    ).toMatchObject({
      kind: "rejected",
      rejection: { code: "calendar.invalid_phase" },
    });
    expect(
      pocCalendarGameplayModuleV1.owner.propose(
        resolved,
        advance(3, "morning"),
        nextMorningDependenciesV1,
      ),
    ).toMatchObject({
      kind: "rejected",
      rejection: { code: "calendar.invalid_phase" },
    });
    const nextMorningResult = pocCalendarGameplayModuleV1.owner.propose(
      resolved,
      advance(2, "morning"),
      nextMorningDependenciesV1,
    );
    if (nextMorningResult.kind !== "proposed") throw new TypeError("expected next morning");
    expect(pocCalendarGameplayModuleV1.owner.apply(resolved, nextMorningResult.proposal)).toEqual({
      ...resolved,
      day: 2,
      phase: "morning",
      apRemaining: 4,
      eveningResolved: false,
    });

    const terminalAdvance = pocCalendarGameplayModuleV1.ownerOperationSchema.parse({
      ...advance(1, "afternoon"),
      terminalLocked: true,
    });
    expect(
      pocCalendarGameplayModuleV1.owner.propose(morning, terminalAdvance, afternoonDependenciesV1),
    ).toEqual({
      kind: "rejected",
      rejection: { code: "calendar.phase_blocked", details: { blocker: "levy_due" } },
    });
    for (const valid of [morning, afternoon, evening, resolved]) {
      expect(
        pocCalendarGameplayModuleV1.localInvariants.flatMap((invariant) =>
          invariant.check(valid, pocCalendarGameplayModuleV1.createReadPort(valid)),
        ),
      ).toEqual([]);
    }
  });

  it("strictly validates Calendar DTOs and preserves rejected input bytes", () => {
    const initial = pocCalendarGameplayModuleV1.createInitialState(
      createPocGameplayFixtureV1().bootstrap,
    );
    const initialBytes = canonicalJsonBytes(initial);
    expect(() =>
      pocCalendarGameplayModuleV1.ownerOperationSchema.parse({
        kind: "calendar.policy.choose",
        policyId: "policy.fixture",
        injected: true,
      }),
    ).toThrow();
    expect(() =>
      Reflect.apply(pocCalendarGameplayModuleV1.owner.propose, undefined, [
        initial,
        pocCalendarGameplayModuleV1.ownerOperationSchema.parse({
          kind: "calendar.policy.choose",
          policyId: "policy.fixture",
        }),
        Object.freeze({ policyAp: 2, injected: true }),
      ]),
    ).toThrow();
    expect(() =>
      Reflect.apply(pocCalendarGameplayModuleV1.owner.propose, undefined, [
        initial,
        pocCalendarGameplayModuleV1.ownerOperationSchema.parse({
          kind: "calendar.policy.choose",
          policyId: "policy.fixture",
        }),
        Object.freeze({}),
      ]),
    ).toThrow();
    expect(canonicalJsonBytes(initial)).toEqual(initialBytes);

    const invalidCalendar = pocCalendarGameplayModuleV1.stateSchema.parse({
      ...initial,
      eveningResolved: true,
    });
    expect(
      pocCalendarGameplayModuleV1.localInvariants.flatMap((invariant) =>
        invariant.check(
          invalidCalendar,
          pocCalendarGameplayModuleV1.createReadPort(invalidCalendar),
        ),
      ),
    ).toEqual([
      {
        code: "calendar.invalid",
        details: { day: 1, phase: "morning" },
      },
    ]);
  });

  it("rejects structural DTO bypasses and fully valid foreign owner facts", () => {
    const fixture = createPocGameplayFixtureV1();
    const run = createInitialPocRunStateV1(fixture.bootstrap);
    const calendar = createInitialPocCalendarStateV1(fixture.bootstrap);
    const injectedSymbol = Symbol("injected");

    expect(() => pocRunOwnerOperationSchemaV1.parse([])).toThrow();
    expect(() =>
      pocRunOwnerOperationSchemaV1.parse({ kind: "run.activate", [injectedSymbol]: true }),
    ).toThrow();
    expect(() =>
      pocRunOwnerOperationSchemaV1.parse(
        Object.assign(Object.create({ inherited: true }) as object, { kind: "run.activate" }),
      ),
    ).toThrow();
    let runAccessorRead = false;
    const runAccessorOperation = {};
    Object.defineProperty(runAccessorOperation, "kind", {
      enumerable: true,
      get() {
        runAccessorRead = true;
        return "run.activate";
      },
    });
    expect(() => pocRunOwnerOperationSchemaV1.parse(runAccessorOperation)).toThrow();
    expect(runAccessorRead).toBe(false);
    expect(() => pocRunStateSchemaV1.parse({ ...run, [injectedSymbol]: true })).toThrow();

    const activation = pocRunOwnerV1.propose(
      run,
      pocRunOwnerOperationSchemaV1.parse({ kind: "run.activate" }),
      emptyRunDependenciesV1,
    );
    if (activation.kind !== "proposed") throw new TypeError("expected activation proposal");
    expect(() =>
      pocRunOwnerProposalSchemaV1.parse({
        ...activation.proposal,
        payload: { ...activation.proposal.payload, injected: true },
      }),
    ).toThrow();

    expect(() => pocCalendarOwnerOperationSchemaV1.parse([])).toThrow();
    expect(() =>
      pocCalendarOwnerOperationSchemaV1.parse({
        kind: "calendar.phase.advance",
        to: { day: 1, phase: "afternoon", injected: true },
        expiredAuraIds: [],
        terminalLocked: false,
      }),
    ).toThrow();
    expect(() =>
      pocCalendarOwnerOperationSchemaV1.parse({
        kind: "calendar.evening.resolve",
        [injectedSymbol]: true,
      }),
    ).toThrow();
    expect(() =>
      pocCalendarStateSchemaV1.parse(Object.assign(Object.create(null) as object, calendar)),
    ).toThrow();

    const policy = pocCalendarOwnerV1.propose(
      calendar,
      pocCalendarOwnerOperationSchemaV1.parse({
        kind: "calendar.policy.choose",
        policyId: "policy.fixture",
      }),
      calendarDependenciesV1,
    );
    if (policy.kind !== "proposed") throw new TypeError("expected policy proposal");
    expect(() =>
      pocCalendarOwnerProposalSchemaV1.parse({
        ...policy.proposal,
        payload: { ...policy.proposal.payload, injected: true },
      }),
    ).toThrow();
    expect(() =>
      pocCalendarOwnerProposalSchemaV1.parse({
        payload: policy.proposal.payload,
        facts: [{ kind: "run.completed", completion: createFixtureCompletionInputV1() }],
      }),
    ).toThrow();
  });
});
