// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { canonicalJsonBytes } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import {
  parseActionId,
  parseActorId,
  parseAuraId,
  parseAuraInstanceId,
  parseReasonId,
  relationshipStagesV1,
} from "../gameplay/contracts/ids.js";
import type {
  ActorsStateV1,
  AuraDurationPolicyV1,
  AuraDurationUnitV1,
  AuraInstanceV1,
  ChangeReasonV1,
} from "../gameplay/contracts/types.js";
import {
  parseMoodPoint,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseSafeInteger,
} from "../gameplay/contracts/values.js";
import {
  pocActorsInvariantV1,
  pocActorsOwnerOperationSchemaV1,
  pocActorsOwnerProposalSchemaV1,
  pocActorsStateSchemaV1,
} from "../gameplay/modules/actors/contract.js";
import {
  createPocActorsGameplayModuleV1,
  createPocActorsReadPortV1,
  pocActorsOwnerV1,
} from "../gameplay/modules/actors/module.js";
import {
  pocStatusDependencyPortsSchemaV1,
  pocStatusInvariantV1,
  pocStatusOwnerOperationSchemaV1,
  pocStatusOwnerProposalSchemaV1,
  pocStatusStateSchemaV1,
} from "../gameplay/modules/status/contract.js";
import {
  advancePocAuraCountdownsV1,
  createPocStatusGameplayModuleV1,
  createPocStatusReadPortV1,
  pocStatusOwnerV1,
} from "../gameplay/modules/status/module.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

const emptyActorsDependenciesV1 = Object.freeze({});

function requireProposedV1<TProposal>(
  result:
    | { readonly kind: "proposed"; readonly proposal: TProposal }
    | { readonly kind: "rejected"; readonly rejection: unknown },
): TProposal {
  if (result.kind !== "proposed") throw new TypeError("expected proposed owner operation");
  return result.proposal;
}

function fixtureCommandReasonV1(
  reasonId = "reason.fixture.action",
): Extract<ChangeReasonV1, { readonly kind: "command" }> {
  return Object.freeze({
    kind: "command",
    commandKind: "actor.rest",
    reasonId: parseReasonId(reasonId),
  });
}

function fixtureStoryActionReasonV1(
  reasonId = "reason.fixture.aura",
): Extract<ChangeReasonV1, { readonly kind: "story_action" }> {
  return Object.freeze({
    kind: "story_action",
    actionId: parseActionId("action.fixture_story"),
    reasonId: parseReasonId(reasonId),
  });
}

function actorsStateV1(
  overrides: {
    readonly playerCurrent?: number;
    readonly playerMaximum?: number;
    readonly heroineMood?: number;
    readonly affection?: number;
    readonly teamwork?: number;
  } = {},
): ActorsStateV1 {
  const fixture = createPocGameplayFixtureV1();
  const current = fixture.snapshot.state.simulation.actors;
  return pocActorsStateSchemaV1.parse({
    ...current,
    player: {
      ...current.player,
      stamina: {
        current: overrides.playerCurrent ?? current.player.stamina.current,
        maximum: overrides.playerMaximum ?? current.player.stamina.maximum,
      },
    },
    heroine: {
      ...current.heroine,
      mood: overrides.heroineMood ?? current.heroine.mood,
    },
    relationship: {
      ...current.relationship,
      affection: overrides.affection ?? current.relationship.affection,
      teamwork: overrides.teamwork ?? current.relationship.teamwork,
    },
  });
}

function statusDependenciesV1(
  durationPolicy: AuraDurationPolicyV1 = {
    kind: "countdown",
    unit: "day_end",
    defaultRemaining: parsePositiveSafeInteger(2),
    maximumRemaining: parsePositiveSafeInteger(2),
  },
) {
  return pocStatusDependencyPortsSchemaV1.parse({
    auraDefinitions: [
      {
        auraId: parseAuraId("aura.fixture_timed"),
        reasonId: parseReasonId("reason.fixture.aura"),
        durationPolicy,
        allowedTargets: [{ kind: "actor", actorId: parseActorId("actor.player") }],
      },
    ],
  });
}

function auraInstanceV1(
  duration: AuraInstanceV1["duration"] = {
    kind: "countdown",
    unit: "day_end",
    remaining: parsePositiveSafeInteger(2),
  },
  options: {
    readonly instanceId?: string;
    readonly targetActorId?: "actor.player" | "actor.heroine";
  } = {},
): AuraInstanceV1 {
  return Object.freeze({
    instanceId: parseAuraInstanceId(options.instanceId ?? "aura:1:0"),
    auraId: parseAuraId("aura.fixture_timed"),
    target: {
      kind: "actor" as const,
      actorId: parseActorId(options.targetActorId ?? "actor.player"),
    },
    source: {
      kind: "story_action" as const,
      actionId: parseActionId("action.fixture_story"),
    },
    duration,
    appliedAtSequence: parseNonNegativeSafeInteger(1),
  });
}

describe("PoC Actors ownership", () => {
  it("binds only its validated initial owner slice without cross-instance leakage", async () => {
    const fixture = createPocGameplayFixtureV1();
    const firstInitial = actorsStateV1();
    const secondInitial = actorsStateV1({ affection: -7, teamwork: 4 });
    const first = createPocActorsGameplayModuleV1(firstInitial);
    const second = createPocActorsGameplayModuleV1(secondInitial);

    expect(first.descriptor).toMatchObject({
      id: "module.actors",
      contractRevision: 1,
      stateSlots: ["simulation.actors"],
      dependencies: [],
    });
    expect(first.createInitialState(fixture.bootstrap)).toEqual(firstInitial);
    expect(second.createInitialState(fixture.bootstrap)).toEqual(secondInitial);
    expect(first.createInitialState(fixture.bootstrap)).not.toEqual(secondInitial);
    expect(first.owner).toBe(pocActorsOwnerV1);
    expect(first.stateSchema).toBe(pocActorsStateSchemaV1);
    expect(first.ownerOperationSchema).toBe(pocActorsOwnerOperationSchemaV1);
    expect(first.ownerProposalSchema).toBe(pocActorsOwnerProposalSchemaV1);
    expect(first.localInvariants).toEqual([pocActorsInvariantV1]);

    const gameplay = await import("../gameplay/index.js");
    expect(gameplay.createPocActorsGameplayModuleV1).toBe(createPocActorsGameplayModuleV1);
    expect(gameplay.pocActorsStateSchemaV1).toBe(pocActorsStateSchemaV1);
  });

  it("saturates relationship counters only at their declared numeric domains", () => {
    const state = actorsStateV1();
    const reason = fixtureCommandReasonV1();
    const proposal = requireProposedV1(
      pocActorsOwnerV1.propose(
        state,
        pocActorsOwnerOperationSchemaV1.parse({
          kind: "actors.adjust_relationship",
          affectionDelta: -200,
          teamworkDelta: 3,
          reason,
        }),
        emptyActorsDependenciesV1,
      ),
    );
    const next = pocActorsOwnerV1.apply(state, proposal);

    expect(next.relationship).toEqual({ affection: -200, teamwork: 3, stage: "cold" });
    expect(proposal.facts).toEqual([
      {
        kind: "relationship.affection_changed",
        value: { before: 0, after: -200 },
        reason,
      },
      {
        kind: "relationship.teamwork_changed",
        value: { before: 0, after: 3 },
        reason,
      },
    ]);

    const vectors = [
      {
        state: actorsStateV1({ affection: Number.MAX_SAFE_INTEGER - 1 }),
        affectionDelta: 10,
        teamworkDelta: 0,
        expectedAffection: Number.MAX_SAFE_INTEGER,
        expectedTeamwork: 0,
      },
      {
        state: actorsStateV1({ affection: Number.MIN_SAFE_INTEGER + 1 }),
        affectionDelta: -10,
        teamworkDelta: 0,
        expectedAffection: Number.MIN_SAFE_INTEGER,
        expectedTeamwork: 0,
      },
      {
        state: actorsStateV1({ teamwork: 0 }),
        affectionDelta: 0,
        teamworkDelta: -10,
        expectedAffection: 0,
        expectedTeamwork: 0,
      },
      {
        state: actorsStateV1({ teamwork: Number.MAX_SAFE_INTEGER - 1 }),
        affectionDelta: 0,
        teamworkDelta: 10,
        expectedAffection: 0,
        expectedTeamwork: Number.MAX_SAFE_INTEGER,
      },
    ] as const;
    for (const vector of vectors) {
      const saturated = requireProposedV1(
        pocActorsOwnerV1.propose(
          vector.state,
          {
            kind: "actors.adjust_relationship",
            affectionDelta: parseSafeInteger(vector.affectionDelta),
            teamworkDelta: parseSafeInteger(vector.teamworkDelta),
            reason,
          },
          emptyActorsDependenciesV1,
        ),
      );
      expect(pocActorsOwnerV1.apply(vector.state, saturated).relationship).toMatchObject({
        affection: vector.expectedAffection,
        teamwork: vector.expectedTeamwork,
        stage: "cold",
      });
    }
  });

  it("keeps ordered stamina components and distinguishes debit from recovery", () => {
    const state = actorsStateV1();
    const actionReason = fixtureCommandReasonV1("reason.fixture.action");
    const auraReason = Object.freeze({
      kind: "aura" as const,
      auraId: parseAuraId("aura.fixture_timed"),
      reasonId: parseReasonId("reason.fixture.aura"),
    });
    const components = Object.freeze([
      Object.freeze({ requestedDelta: parseSafeInteger(-2), reason: actionReason }),
      Object.freeze({ requestedDelta: parseSafeInteger(1), reason: auraReason }),
    ] as const);
    const debit = requireProposedV1(
      pocActorsOwnerV1.propose(
        state,
        {
          kind: "actors.adjust_stamina",
          actorId: parseActorId("actor.player"),
          application: "debit",
          components,
        },
        emptyActorsDependenciesV1,
      ),
    );
    const debited = pocActorsOwnerV1.apply(state, debit);
    expect(debited.player.stamina.current).toBe(9);
    expect(debit.facts).toEqual([
      {
        kind: "actor.stamina_changed",
        actorId: "actor.player",
        value: { before: 10, after: 9 },
        components,
      },
    ]);
    expect(() =>
      pocActorsOwnerProposalSchemaV1.parse({
        ...debit,
        payload: { ...debit.payload, after: actorsStateV1({ playerCurrent: 0 }) },
        facts: [
          {
            ...debit.facts[0],
            value: { before: 10, after: 0 },
          },
        ],
      }),
    ).toThrow(/ordered components/u);

    const beforeBytes = canonicalJsonBytes(state);
    expect(
      pocActorsOwnerV1.propose(
        state,
        {
          kind: "actors.adjust_stamina",
          actorId: parseActorId("actor.player"),
          application: "debit",
          components: [{ requestedDelta: parseSafeInteger(-11), reason: actionReason }],
        },
        emptyActorsDependenciesV1,
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "actor.insufficient_stamina",
        details: { actorId: "actor.player", required: 11, available: 10 },
      },
    });
    expect(canonicalJsonBytes(state)).toEqual(beforeBytes);

    const half = actorsStateV1({ playerCurrent: 5 });
    const recovered = requireProposedV1(
      pocActorsOwnerV1.propose(
        half,
        {
          kind: "actors.adjust_stamina",
          actorId: parseActorId("actor.player"),
          application: "recovery",
          components: [
            { requestedDelta: parseSafeInteger(10), reason: actionReason },
            { requestedDelta: parseSafeInteger(-2), reason: auraReason },
          ],
        },
        emptyActorsDependenciesV1,
      ),
    );
    expect(pocActorsOwnerV1.apply(half, recovered).player.stamina.current).toBe(10);

    const cancelled = requireProposedV1(
      pocActorsOwnerV1.propose(
        half,
        {
          kind: "actors.adjust_stamina",
          actorId: parseActorId("actor.player"),
          application: "recovery",
          components: [
            { requestedDelta: parseSafeInteger(1), reason: actionReason },
            { requestedDelta: parseSafeInteger(-5), reason: auraReason },
          ],
        },
        emptyActorsDependenciesV1,
      ),
    );
    expect(pocActorsOwnerV1.apply(half, cancelled).player.stamina.current).toBe(5);
    expect(() =>
      pocActorsOwnerV1.propose(
        half,
        {
          kind: "actors.adjust_stamina",
          actorId: parseActorId("actor.player"),
          application: "recovery",
          components: [
            { requestedDelta: parseSafeInteger(Number.MAX_SAFE_INTEGER), reason: actionReason },
            { requestedDelta: parseSafeInteger(1), reason: auraReason },
            { requestedDelta: parseSafeInteger(Number.MIN_SAFE_INTEGER), reason: actionReason },
          ],
        },
        emptyActorsDependenciesV1,
      ),
    ).toThrow(/safe integer bounds/u);
  });

  it("clamps mood, supports explicit stage/debug writes, and rejects stale proposals", () => {
    const state = actorsStateV1();
    const reason = fixtureCommandReasonV1("reason.fixture.mood");
    const mood = requireProposedV1(
      pocActorsOwnerV1.propose(
        state,
        {
          kind: "actors.adjust_mood",
          actorId: parseActorId("actor.heroine"),
          delta: parseSafeInteger(-10),
          reason,
        },
        emptyActorsDependenciesV1,
      ),
    );
    expect(pocActorsOwnerV1.apply(state, mood).heroine.mood).toBe(-2);
    expect(mood.facts).toEqual([
      {
        kind: "actor.mood_changed",
        actorId: "actor.heroine",
        value: { before: 0, after: -2 },
        reason,
      },
    ]);

    for (const stage of relationshipStagesV1) {
      const stageProposal = requireProposedV1(
        pocActorsOwnerV1.propose(
          state,
          { kind: "actors.relationship.stage.set", stage, reason },
          emptyActorsDependenciesV1,
        ),
      );
      expect(pocActorsOwnerV1.apply(state, stageProposal).relationship.stage).toBe(stage);
    }

    const debug = requireProposedV1(
      pocActorsOwnerV1.propose(
        state,
        {
          kind: "actors.debug.set_relationship",
          affection: parseSafeInteger(9),
          teamwork: parseNonNegativeSafeInteger(8),
          stage: "trust",
          reasonId: parseReasonId("reason.fixture"),
        },
        emptyActorsDependenciesV1,
      ),
    );
    expect(debug.facts.map((fact) => fact.kind)).toEqual([
      "relationship.affection_changed",
      "relationship.teamwork_changed",
      "relationship.stage_changed",
    ]);
    const debugged = pocActorsOwnerV1.apply(state, debug);
    expect(debugged.relationship).toEqual({ affection: 9, teamwork: 8, stage: "trust" });
    expect(() => pocActorsOwnerV1.apply(debugged, debug)).toThrow(/stale/u);

    expect(() =>
      pocActorsOwnerV1.propose(
        state,
        {
          kind: "actors.debug.set_stamina",
          actorId: parseActorId("actor.player"),
          value: parseNonNegativeSafeInteger(11),
          reasonId: parseReasonId("reason.fixture"),
        },
        emptyActorsDependenciesV1,
      ),
    ).toThrow(/exceeds maximum/u);
    const debugMood = requireProposedV1(
      pocActorsOwnerV1.propose(
        state,
        {
          kind: "actors.debug.set_mood",
          actorId: parseActorId("actor.heroine"),
          value: parseMoodPoint(2),
          reasonId: parseReasonId("reason.fixture"),
        },
        emptyActorsDependenciesV1,
      ),
    );
    expect(pocActorsOwnerV1.apply(state, debugMood).heroine.mood).toBe(2);
    expect(debugMood.facts[0]).toMatchObject({
      reason: { kind: "debug", commandKind: "debug.actor.set_mood" },
    });
  });

  it("enforces strict DTOs, local stamina invariants, and frozen owner-only read ports", () => {
    expect(() =>
      pocActorsOwnerOperationSchemaV1.parse({
        kind: "actors.adjust_stamina",
        actorId: "actor.player",
        application: "debit",
        components: [],
      }),
    ).toThrow();
    expect(() =>
      pocActorsOwnerOperationSchemaV1.parse({
        kind: "actors.adjust_mood",
        actorId: "actor.heroine",
        delta: 1,
        reason: fixtureCommandReasonV1(),
        extra: true,
      }),
    ).toThrow();
    const withSymbol = {
      kind: "actors.adjust_mood",
      actorId: "actor.heroine",
      delta: 1,
      reason: fixtureCommandReasonV1(),
      [Symbol("hidden")]: true,
    };
    expect(() => pocActorsOwnerOperationSchemaV1.parse(withSymbol)).toThrow();

    const invalid = pocActorsStateSchemaV1.parse({
      ...actorsStateV1(),
      player: {
        ...actorsStateV1().player,
        stamina: { current: 11, maximum: 10 },
      },
    });
    expect(pocActorsInvariantV1.check(invalid, createPocActorsReadPortV1(invalid))).toEqual([
      {
        code: "stamina.above_maximum",
        details: { actorId: "actor.player", current: 11, maximum: 10 },
      },
    ]);
    expect(() => createPocActorsGameplayModuleV1(invalid)).toThrow(/stamina/u);

    const state = actorsStateV1();
    const port = createPocActorsReadPortV1(state);
    expect(port).toEqual(state);
    expect(port).not.toBe(state);
    expect(Object.isFrozen(port)).toBe(true);
    expect(Object.isFrozen(port.player.stamina)).toBe(true);
    expect(port).not.toHaveProperty("snapshot");
    expect(port).not.toHaveProperty("status");

    const valid = requireProposedV1(
      pocActorsOwnerV1.propose(
        state,
        {
          kind: "actors.adjust_mood",
          actorId: parseActorId("actor.heroine"),
          delta: parseSafeInteger(1),
          reason: fixtureCommandReasonV1(),
        },
        emptyActorsDependenciesV1,
      ),
    );
    expect(Object.isFrozen(valid)).toBe(true);
    expect(Object.isFrozen(valid.facts)).toBe(true);
    expect(() =>
      pocActorsOwnerProposalSchemaV1.parse({
        ...valid,
        facts: [{ kind: "run.started" }],
      }),
    ).toThrow();
  });
});

describe("PoC Status ownership", () => {
  it("binds only its validated initial owner slice and exports a fixed module surface", async () => {
    const fixture = createPocGameplayFixtureV1();
    const empty = pocStatusStateSchemaV1.parse({ auras: [] });
    const initialAura = pocStatusStateSchemaV1.parse({
      auras: [
        {
          instanceId: "aura:initial:0",
          auraId: "aura.fixture_timed",
          target: { kind: "actor", actorId: "actor.player" },
          source: { kind: "initial", reasonId: "reason.fixture.aura" },
          duration: { kind: "countdown", unit: "day_end", remaining: 2 },
          appliedAtSequence: 0,
        },
      ],
    });
    const first = createPocStatusGameplayModuleV1(empty);
    const second = createPocStatusGameplayModuleV1(initialAura);

    expect(first.descriptor).toMatchObject({
      id: "module.status",
      contractRevision: 1,
      stateSlots: ["simulation.status"],
      dependencies: [],
    });
    expect(first.createInitialState(fixture.bootstrap)).toEqual(empty);
    expect(second.createInitialState(fixture.bootstrap)).toEqual(initialAura);
    expect(first.createInitialState(fixture.bootstrap)).not.toEqual(initialAura);
    expect(first.owner).toBe(pocStatusOwnerV1);
    expect(first.stateSchema).toBe(pocStatusStateSchemaV1);
    expect(first.ownerOperationSchema).toBe(pocStatusOwnerOperationSchemaV1);
    expect(first.ownerProposalSchema).toBe(pocStatusOwnerProposalSchemaV1);
    expect(first.localInvariants).toEqual([pocStatusInvariantV1]);

    const gameplay = await import("../gameplay/index.js");
    expect(gameplay.createPocStatusGameplayModuleV1).toBe(createPocStatusGameplayModuleV1);
    expect(gameplay.pocStatusStateSchemaV1).toBe(pocStatusStateSchemaV1);
  });

  it("applies and clears one exact Aura while preserving source and reason", () => {
    const state = pocStatusStateSchemaV1.parse({ auras: [] });
    const dependencies = statusDependenciesV1();
    const aura = auraInstanceV1();
    const reason = fixtureStoryActionReasonV1();
    const apply = requireProposedV1(
      pocStatusOwnerV1.propose(
        state,
        pocStatusOwnerOperationSchemaV1.parse({ kind: "status.apply", aura, reason }),
        dependencies,
      ),
    );
    expect(apply.facts).toEqual([{ kind: "aura.applied", aura, reason }]);
    const applied = pocStatusOwnerV1.apply(state, apply);
    expect(applied.auras).toEqual([aura]);
    expect(
      pocStatusOwnerV1.propose(
        applied,
        {
          kind: "status.apply",
          aura: {
            ...aura,
            instanceId: parseAuraInstanceId("aura:2:0"),
            appliedAtSequence: parseNonNegativeSafeInteger(2),
          },
          reason,
        },
        dependencies,
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "aura.already_present",
        details: { auraId: "aura.fixture_timed", target: aura.target },
      },
    });

    const clearReason = fixtureCommandReasonV1();
    const clear = requireProposedV1(
      pocStatusOwnerV1.propose(
        applied,
        {
          kind: "status.clear",
          auraId: parseAuraId("aura.fixture_timed"),
          target: aura.target,
          reason: clearReason,
        },
        dependencies,
      ),
    );
    expect(clear.facts).toEqual([
      { kind: "aura.cleared", instanceId: aura.instanceId, reason: clearReason },
    ]);
    expect(() =>
      pocStatusOwnerProposalSchemaV1.parse({
        ...clear,
        facts: [
          {
            kind: "aura.cleared",
            instanceId: aura.instanceId,
            reason: {
              kind: "debug",
              commandKind: "debug.aura.clear",
              reasonId: parseReasonId("reason.fixture"),
            },
          },
        ],
      }),
    ).toThrow(/provenance/u);
    expect(() =>
      pocStatusOwnerProposalSchemaV1.parse({
        ...clear,
        payload: { ...clear.payload, kind: "status.debug.clear_instance" },
      }),
    ).toThrow(/provenance/u);
    expect(pocStatusOwnerV1.apply(applied, clear)).toEqual({ auras: [] });
    expect(
      pocStatusOwnerV1.propose(
        state,
        {
          kind: "status.clear",
          auraId: parseAuraId("aura.fixture_timed"),
          target: aura.target,
          reason: clearReason,
        },
        dependencies,
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "aura.not_found",
        details: { auraId: "aura.fixture_timed", target: aura.target },
      },
    });
  });

  it("decrements only explicit matching countdowns and emits ordered expiry reasons", () => {
    const reason = fixtureStoryActionReasonV1();
    for (const unit of [
      "phase_end",
      "day_end",
      "opening",
      "night_recovery",
    ] as const satisfies readonly AuraDurationUnitV1[]) {
      const dependencies = statusDependenciesV1({
        kind: "countdown",
        unit,
        defaultRemaining: parsePositiveSafeInteger(2),
        maximumRemaining: parsePositiveSafeInteger(2),
      });
      const aura = auraInstanceV1({
        kind: "countdown",
        unit,
        remaining: parsePositiveSafeInteger(2),
      });
      const empty = pocStatusStateSchemaV1.parse({ auras: [] });
      const appliedProposal = requireProposedV1(
        pocStatusOwnerV1.propose(empty, { kind: "status.apply", aura, reason }, dependencies),
      );
      const applied = pocStatusOwnerV1.apply(empty, appliedProposal);
      const first = requireProposedV1(
        pocStatusOwnerV1.propose(
          applied,
          { kind: "status.countdown", unit, instanceIds: [aura.instanceId] },
          dependencies,
        ),
      );
      const remaining = pocStatusOwnerV1.apply(applied, first);
      expect(remaining.auras[0]?.duration).toEqual({ kind: "countdown", unit, remaining: 1 });
      expect(first.facts).toEqual([]);

      const second = requireProposedV1(
        pocStatusOwnerV1.propose(
          remaining,
          { kind: "status.countdown", unit, instanceIds: [aura.instanceId] },
          dependencies,
        ),
      );
      expect(pocStatusOwnerV1.apply(remaining, second)).toEqual({ auras: [] });
      expect(second.facts).toEqual([
        {
          kind: "aura.expired",
          instanceId: aura.instanceId,
          auraId: aura.auraId,
          reason: {
            kind: "aura",
            auraId: aura.auraId,
            reasonId: "reason.fixture.aura",
          },
        },
      ]);
    }

    const state = pocStatusStateSchemaV1.parse({
      auras: [auraInstanceV1()],
    });
    const unchanged = advancePocAuraCountdownsV1(state, {
      unit: "phase_end",
      instanceIds: [],
    });
    expect(unchanged.state).toBe(state);
    expect(unchanged.expired).toEqual([]);
    expect(() =>
      advancePocAuraCountdownsV1(state, {
        unit: "phase_end",
        instanceIds: [parseAuraInstanceId("aura:1:0")],
      }),
    ).toThrow(/unit/u);

    const rollbackState = pocStatusStateSchemaV1.parse({
      auras: [
        auraInstanceV1(),
        {
          ...auraInstanceV1(
            {
              kind: "countdown",
              unit: "phase_end",
              remaining: parsePositiveSafeInteger(2),
            },
            { instanceId: "aura:1:1" },
          ),
          auraId: parseAuraId("aura.fixture_second"),
        },
      ],
    });
    const rollbackBytes = canonicalJsonBytes(rollbackState);
    expect(() =>
      advancePocAuraCountdownsV1(rollbackState, {
        unit: "day_end",
        instanceIds: [parseAuraInstanceId("aura:1:0"), parseAuraInstanceId("aura:1:1")],
      }),
    ).toThrow(/unit/u);
    expect(canonicalJsonBytes(rollbackState)).toEqual(rollbackBytes);

    const invalidCountdownVectors = [
      {
        state: pocStatusStateSchemaV1.parse({
          auras: [
            {
              ...auraInstanceV1(),
              auraId: parseAuraId("aura.fixture_unknown"),
            },
          ],
        }),
        unit: "day_end",
        error: /unknown Status Aura definition/u,
      },
      {
        state: pocStatusStateSchemaV1.parse({
          auras: [auraInstanceV1(undefined, { targetActorId: "actor.heroine" })],
        }),
        unit: "day_end",
        error: /target/u,
      },
      {
        state: pocStatusStateSchemaV1.parse({
          auras: [
            auraInstanceV1({
              kind: "countdown",
              unit: "phase_end",
              remaining: parsePositiveSafeInteger(2),
            }),
          ],
        }),
        unit: "phase_end",
        error: /duration unit/u,
      },
      {
        state: pocStatusStateSchemaV1.parse({
          auras: [
            auraInstanceV1({
              kind: "countdown",
              unit: "day_end",
              remaining: parsePositiveSafeInteger(3),
            }),
          ],
        }),
        unit: "day_end",
        error: /maximum/u,
      },
    ] as const;
    for (const vector of invalidCountdownVectors) {
      const stateBytes = canonicalJsonBytes(vector.state);
      expect(() =>
        pocStatusOwnerV1.propose(
          vector.state,
          {
            kind: "status.countdown",
            unit: vector.unit,
            instanceIds: [parseAuraInstanceId("aura:1:0")],
          },
          statusDependenciesV1(),
        ),
      ).toThrow(vector.error);
      expect(canonicalJsonBytes(vector.state)).toEqual(stateBytes);
    }
  });

  it("keeps until-cleared Auras out of countdown and constrains normal/debug application", () => {
    const untilPolicy = Object.freeze({ kind: "until_cleared" as const });
    const dependencies = statusDependenciesV1(untilPolicy);
    const aura = auraInstanceV1(untilPolicy);
    const state = pocStatusStateSchemaV1.parse({ auras: [] });
    const reason = fixtureStoryActionReasonV1();
    const appliedProposal = requireProposedV1(
      pocStatusOwnerV1.propose(state, { kind: "status.apply", aura, reason }, dependencies),
    );
    const applied = pocStatusOwnerV1.apply(state, appliedProposal);
    expect(() =>
      advancePocAuraCountdownsV1(applied, {
        unit: "day_end",
        instanceIds: [aura.instanceId],
      }),
    ).toThrow(/until_cleared/u);

    expect(() =>
      pocStatusOwnerV1.propose(
        state,
        {
          kind: "status.apply",
          aura: auraInstanceV1({
            kind: "countdown",
            unit: "day_end",
            remaining: parsePositiveSafeInteger(1),
          }),
          reason,
        },
        dependencies,
      ),
    ).toThrow(/duration/u);
    expect(() =>
      pocStatusOwnerV1.propose(
        state,
        {
          kind: "status.apply",
          aura: auraInstanceV1(untilPolicy, { targetActorId: "actor.heroine" }),
          reason,
        },
        dependencies,
      ),
    ).toThrow(/target/u);
    expect(() =>
      pocStatusOwnerV1.propose(
        state,
        {
          kind: "status.apply",
          aura,
          reason: {
            ...reason,
            actionId: parseActionId("action.fixture_wrong_source"),
          },
        },
        dependencies,
      ),
    ).toThrow(/source|provenance/u);
    expect(() =>
      pocStatusOwnerV1.propose(
        state,
        {
          kind: "status.apply",
          aura: {
            ...aura,
            source: {
              kind: "initial",
              reasonId: parseReasonId("reason.fixture.aura"),
            },
          },
          reason,
        },
        dependencies,
      ),
    ).toThrow(/runtime Aura instance provenance/u);

    const countdownDependencies = statusDependenciesV1({
      kind: "countdown",
      unit: "day_end",
      defaultRemaining: parsePositiveSafeInteger(2),
      maximumRemaining: parsePositiveSafeInteger(3),
    });
    const debugAura = Object.freeze({
      ...auraInstanceV1({
        kind: "countdown",
        unit: "day_end",
        remaining: parsePositiveSafeInteger(3),
      }),
      source: { kind: "debug" as const, reasonId: parseReasonId("reason.fixture") },
    });
    const debug = requireProposedV1(
      pocStatusOwnerV1.propose(
        state,
        {
          kind: "status.debug.apply",
          aura: debugAura,
          reasonId: parseReasonId("reason.fixture"),
        },
        countdownDependencies,
      ),
    );
    expect(debug.facts).toEqual([
      {
        kind: "aura.applied",
        aura: debugAura,
        reason: {
          kind: "debug",
          commandKind: "debug.aura.apply",
          reasonId: "reason.fixture",
        },
      },
    ]);
    expect(() =>
      pocStatusOwnerV1.propose(
        state,
        {
          kind: "status.debug.apply",
          aura,
          reasonId: parseReasonId("reason.fixture"),
        },
        countdownDependencies,
      ),
    ).toThrow(/debug Aura source/u);
    expect(() =>
      pocStatusOwnerV1.propose(
        state,
        {
          kind: "status.debug.apply",
          aura: {
            ...debugAura,
            duration: {
              kind: "countdown",
              unit: "day_end",
              remaining: parsePositiveSafeInteger(4),
            },
          },
          reasonId: parseReasonId("reason.fixture"),
        },
        countdownDependencies,
      ),
    ).toThrow(/maximum/u);

    const debugApplied = pocStatusOwnerV1.apply(state, debug);
    const debugClear = requireProposedV1(
      pocStatusOwnerV1.propose(
        debugApplied,
        {
          kind: "status.debug.clear_instance",
          instanceId: debugAura.instanceId,
          reasonId: parseReasonId("reason.fixture.clear"),
        },
        countdownDependencies,
      ),
    );
    expect(debugClear.facts).toEqual([
      {
        kind: "aura.cleared",
        instanceId: debugAura.instanceId,
        reason: {
          kind: "debug",
          commandKind: "debug.aura.clear",
          reasonId: "reason.fixture.clear",
        },
      },
    ]);
    expect(pocStatusOwnerV1.apply(debugApplied, debugClear)).toEqual({ auras: [] });
  });

  it("rejects malformed lifecycle data and preserves immutable stale-proposal protection", () => {
    const state = pocStatusStateSchemaV1.parse({ auras: [] });
    const dependencies = statusDependenciesV1();
    const aura = auraInstanceV1();
    const reason = fixtureStoryActionReasonV1();
    const beforeBytes = canonicalJsonBytes(state);
    const proposal = requireProposedV1(
      pocStatusOwnerV1.propose(state, { kind: "status.apply", aura, reason }, dependencies),
    );
    expect(canonicalJsonBytes(state)).toEqual(beforeBytes);
    expect(Object.isFrozen(proposal)).toBe(true);
    expect(Object.isFrozen(proposal.facts)).toBe(true);
    const applied = pocStatusOwnerV1.apply(state, proposal);
    expect(() => pocStatusOwnerV1.apply(applied, proposal)).toThrow(/stale/u);

    expect(() =>
      pocStatusOwnerOperationSchemaV1.parse({
        kind: "status.apply",
        aura,
        reason,
        extra: true,
      }),
    ).toThrow();
    expect(() =>
      pocStatusOwnerProposalSchemaV1.parse({
        ...proposal,
        facts: [{ kind: "aura.cleared", instanceId: aura.instanceId, reason }],
      }),
    ).toThrow();
    expect(() =>
      createPocStatusGameplayModuleV1({
        auras: [
          aura,
          {
            ...aura,
            instanceId: parseAuraInstanceId("aura:2:0"),
            appliedAtSequence: parseNonNegativeSafeInteger(2),
          },
        ],
      }),
    ).toThrow(/duplicate/u);

    const port = createPocStatusReadPortV1(applied);
    expect(port).toEqual(applied);
    expect(port).not.toBe(applied);
    expect(Object.isFrozen(port)).toBe(true);
    expect(Object.isFrozen(port.auras)).toBe(true);
    expect(port).not.toHaveProperty("snapshot");
    expect(pocStatusInvariantV1.check(applied, port)).toEqual([]);
  });
});
