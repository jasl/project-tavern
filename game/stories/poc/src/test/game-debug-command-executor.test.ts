// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it, vi } from "vitest";

import { rngStateV1Schema } from "@sillymaker/base";

import {
  pocDebugCommandSchemaV1,
  pocDebugCommandValidationErrorSchemaV1,
  pocSimulationDataSchemaV1,
} from "../gameplay/contracts/schemas.js";
import type {
  PocDebugCommandV1,
  PocGameSnapshotV1,
  PocSimulationProgramV1,
} from "../gameplay/contracts/types.js";
import {
  deepFreezePocValueV1,
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
} from "../gameplay/contracts/values.js";
import { createPocGameDebugCommandExecutorV1 } from "../gameplay/game-debug-command-executor.js";
import { createPocGameplayModuleTupleV1 } from "../gameplay/modules/index.js";
import type { PocGameplayModuleTupleV1 } from "../gameplay/modules/index.js";
import { pocGameStateSchemaV1 } from "../gameplay/runtime-schemas.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

function commandV1(value: unknown): PocDebugCommandV1 {
  return pocDebugCommandSchemaV1.parse(value);
}

function snapshotWithV1(
  snapshot: PocGameSnapshotV1,
  state: PocGameSnapshotV1["state"],
): PocGameSnapshotV1 {
  return deepFreezePocValueV1({ ...snapshot, state });
}

function snapshotWithAuraV1(snapshot: PocGameSnapshotV1): PocGameSnapshotV1 {
  return deepFreezePocValueV1({
    ...snapshot,
    commandSequence: parseNonNegativeSafeInteger(1),
    state: pocGameStateSchemaV1.parse({
      ...snapshot.state,
      simulation: {
        ...snapshot.state.simulation,
        status: {
          auras: [
            {
              instanceId: "aura:1:0",
              auraId: "aura.fixture_timed",
              target: { kind: "actor", actorId: "actor.player" },
              source: { kind: "debug", reasonId: "reason.fixture" },
              duration: { kind: "countdown", unit: "day_end", remaining: 2 },
              appliedAtSequence: 1,
            },
          ],
        },
      },
    }),
  });
}

function createNarrativeFixtureV1(): {
  readonly program: PocSimulationProgramV1;
  readonly snapshot: PocGameSnapshotV1;
} {
  const fixture = createPocGameplayFixtureV1();
  const nodes = [
    {
      kind: "line",
      nodeId: "node.debug.line",
      speakerId: "character.heroine",
      textId: "text.fixture",
      nextNodeId: "node.debug.second",
    },
    {
      kind: "narration",
      nodeId: "node.debug.second",
      textId: "text.fixture",
      nextNodeId: "node.debug.end",
    },
    { kind: "end", nodeId: "node.debug.end" },
  ] as const;
  const data = pocSimulationDataSchemaV1.parse({
    ...fixture.program.data,
    narrative: {
      scenes: [
        ...fixture.program.data.narrative.scenes,
        { sceneId: "scene.debug", entryNodeId: "node.debug.line", nodes },
      ],
    },
  });
  const program = deepFreezePocValueV1({ ...fixture.program, data });
  const snapshot = snapshotWithV1(
    fixture.snapshot,
    pocGameStateSchemaV1.parse({
      ...fixture.snapshot.state,
      story: {
        ...fixture.snapshot.state.story,
        narrative: {
          status: "active",
          source: { kind: "manifest_start" },
          cursor: { sceneId: "scene.debug", nodeId: "node.debug.line" },
          callStack: [],
          stage: fixture.snapshot.state.story.narrative.stage,
        },
      },
    }),
  );
  return { program, snapshot };
}

function executeV1(
  program: PocSimulationProgramV1,
  snapshot: PocGameSnapshotV1,
  command: PocDebugCommandV1,
) {
  const executor = createPocGameDebugCommandExecutorV1(
    program,
    createPocGameplayModuleTupleV1(program),
  );
  expect(executor.validate(snapshot, command, undefined)).toEqual({ kind: "allowed" });
  return executor.executeAttempt(snapshot, command, undefined);
}

describe("PoC GameDebugCommandExecutor", () => {
  it("exposes one frozen validator/attempt surface separate from Queries", () => {
    const fixture = createPocGameplayFixtureV1();
    const executor = createPocGameDebugCommandExecutorV1(
      fixture.program,
      createPocGameplayModuleTupleV1(fixture.program),
    );

    expect(Object.keys(executor).sort()).toEqual(["executeAttempt", "validate"]);
    expect(Object.isFrozen(executor)).toBe(true);
    expect(executor).not.toHaveProperty("createQueries");
    expect(executor).not.toHaveProperty("markRunModifiedV1");
  });

  it("validates and commits every replayable kind through its owner path", () => {
    const fixture = createPocGameplayFixtureV1({ integrity: "modified" });
    const narrative = createNarrativeFixtureV1();
    const nextRng = rngStateV1Schema.parse({
      algorithm: "xorshift32-v1",
      cursor: parseNonZeroUint32(17),
      rawDrawCount: parseNonNegativeSafeInteger(4),
    });
    const vectors = [
      {
        program: fixture.program,
        snapshot: fixture.snapshot,
        command: commandV1({
          kind: "debug.calendar.set_ap",
          value: 5,
          reasonId: "reason.fixture",
        }),
        observe: (snapshot: PocGameSnapshotV1) => snapshot.state.simulation.calendar.apRemaining,
        expected: 5,
      },
      {
        program: fixture.program,
        snapshot: fixture.snapshot,
        command: commandV1({
          kind: "debug.actor.set_stamina",
          actorId: "actor.player",
          value: 5,
          reasonId: "reason.fixture",
        }),
        observe: (snapshot: PocGameSnapshotV1) =>
          snapshot.state.simulation.actors.player.stamina.current,
        expected: 5,
      },
      {
        program: fixture.program,
        snapshot: fixture.snapshot,
        command: commandV1({
          kind: "debug.actor.set_mood",
          actorId: "actor.heroine",
          value: 2,
          reasonId: "reason.fixture",
        }),
        observe: (snapshot: PocGameSnapshotV1) => snapshot.state.simulation.actors.heroine.mood,
        expected: 2,
      },
      {
        program: fixture.program,
        snapshot: fixture.snapshot,
        command: commandV1({
          kind: "debug.relationship.set",
          affection: 9,
          teamwork: 8,
          stage: "trust",
          reasonId: "reason.fixture",
        }),
        observe: (snapshot: PocGameSnapshotV1) => snapshot.state.simulation.actors.relationship,
        expected: { affection: 9, teamwork: 8, stage: "trust" },
      },
      {
        program: fixture.program,
        snapshot: fixture.snapshot,
        command: commandV1({
          kind: "debug.inventory.adjust_cash",
          delta: 10,
          reasonId: "reason.fixture",
        }),
        observe: (snapshot: PocGameSnapshotV1) => snapshot.state.simulation.inventory.cash,
        expected: 110,
      },
      {
        program: fixture.program,
        snapshot: fixture.snapshot,
        command: commandV1({
          kind: "debug.aura.apply",
          auraId: "aura.fixture_timed",
          target: { kind: "actor", actorId: "actor.player" },
          duration: { kind: "countdown", unit: "day_end", remaining: 2 },
          reasonId: "reason.fixture",
        }),
        observe: (snapshot: PocGameSnapshotV1) => snapshot.state.simulation.status.auras.length,
        expected: 1,
      },
      {
        program: fixture.program,
        snapshot: snapshotWithAuraV1(fixture.snapshot),
        command: commandV1({
          kind: "debug.aura.clear",
          instanceId: "aura:1:0",
          reasonId: "reason.fixture",
        }),
        observe: (snapshot: PocGameSnapshotV1) => snapshot.state.simulation.status.auras.length,
        expected: 0,
      },
      {
        program: fixture.program,
        snapshot: fixture.snapshot,
        command: commandV1({
          kind: "debug.story.fact.set",
          factId: "fact.fixture",
          value: { kind: "boolean", value: true },
          reasonId: "reason.fixture",
        }),
        observe: (snapshot: PocGameSnapshotV1) => snapshot.state.story.facts[0]?.value,
        expected: { kind: "boolean", value: true },
      },
      {
        program: narrative.program,
        snapshot: narrative.snapshot,
        command: commandV1({
          kind: "debug.narrative.jump",
          cursor: { sceneId: "scene.debug", nodeId: "node.debug.second" },
          reasonId: "reason.fixture",
        }),
        observe: (snapshot: PocGameSnapshotV1) => snapshot.state.story.narrative.cursor,
        expected: { sceneId: "scene.debug", nodeId: "node.debug.second" },
      },
      {
        program: fixture.program,
        snapshot: fixture.snapshot,
        command: commandV1({
          kind: "debug.rng.set",
          rng: nextRng,
          reasonId: "reason.fixture",
        }),
        observe: (snapshot: PocGameSnapshotV1) => snapshot.rng,
        expected: nextRng,
      },
    ] as const;

    for (const vector of vectors) {
      const attempt = executeV1(vector.program, vector.snapshot, vector.command);
      if (attempt.result.kind === "faulted") {
        throw new TypeError(`${vector.command.kind}: ${JSON.stringify(attempt.result.fault)}`);
      }
      expect(attempt.result, vector.command.kind).toMatchObject({ kind: "committed" });
      if (attempt.result.kind !== "committed") throw new TypeError("expected committed attempt");
      expect(vector.observe(attempt.result.snapshot), vector.command.kind).toEqual(vector.expected);
      expect(attempt.result.snapshot.commandSequence).toBe(vector.snapshot.commandSequence + 1);
      expect(attempt.result.snapshot.integrity).toBe(vector.snapshot.integrity);
      expect(attempt.result).not.toHaveProperty("reasons");
      expect(attempt.diagnostics.attemptedDraws).toEqual([]);
    }
  });

  it("returns ordered queue-front reference and state validation errors", () => {
    const fixture = createPocGameplayFixtureV1();
    const executor = createPocGameDebugCommandExecutorV1(
      fixture.program,
      createPocGameplayModuleTupleV1(fixture.program),
    );
    const unknownReason = commandV1({
      kind: "debug.calendar.set_ap",
      value: 1,
      reasonId: "reason.unknown",
    });
    const inactiveJump = commandV1({
      kind: "debug.narrative.jump",
      cursor: { sceneId: "scene.fixture", nodeId: "node.fixture.end" },
      reasonId: "reason.fixture",
    });

    expect(executor.validate(fixture.snapshot, unknownReason, undefined)).toEqual({
      kind: "validation_failed",
      errors: [
        {
          code: "debug.unknown_reference",
          commandKind: "debug.calendar.set_ap",
          reference: { kind: "reason", reasonId: "reason.unknown" },
        },
      ],
    });
    expect(executor.validate(fixture.snapshot, inactiveJump, undefined)).toEqual({
      kind: "validation_failed",
      errors: [
        {
          code: "debug.unknown_reference",
          commandKind: "debug.narrative.jump",
          reference: {
            kind: "narrative_node",
            sceneId: "scene.fixture",
            nodeId: "node.fixture.end",
          },
        },
        {
          code: "debug.state_conflict",
          commandKind: "debug.narrative.jump",
          conflict: "narrative_inactive",
        },
      ],
    });
    expect(fixture.snapshot.commandSequence).toBe(0);
  });

  it("uses bigint and canonical decimal strings for unsafe cash results", () => {
    const fixture = createPocGameplayFixtureV1();
    const maxCashSnapshot = snapshotWithV1(
      fixture.snapshot,
      pocGameStateSchemaV1.parse({
        ...fixture.snapshot.state,
        simulation: {
          ...fixture.snapshot.state.simulation,
          inventory: {
            ...fixture.snapshot.state.simulation.inventory,
            startingCash: Number.MAX_SAFE_INTEGER,
            cash: Number.MAX_SAFE_INTEGER,
          },
        },
      }),
    );
    const executor = createPocGameDebugCommandExecutorV1(
      fixture.program,
      createPocGameplayModuleTupleV1(fixture.program),
    );

    expect(
      executor.validate(
        maxCashSnapshot,
        commandV1({
          kind: "debug.inventory.adjust_cash",
          delta: 1,
          reasonId: "reason.fixture",
        }),
        undefined,
      ),
    ).toEqual({
      kind: "validation_failed",
      errors: [
        {
          code: "debug.value_out_of_range",
          commandKind: "debug.inventory.adjust_cash",
          field: "cash_delta_result",
          actual: "9007199254740992",
          minimum: 0,
          maximum: Number.MAX_SAFE_INTEGER,
        },
      ],
    });
    expect(
      executor.validate(
        fixture.snapshot,
        commandV1({
          kind: "debug.inventory.adjust_cash",
          delta: -101,
          reasonId: "reason.fixture",
        }),
        undefined,
      ),
    ).toMatchObject({
      kind: "validation_failed",
      errors: [{ actual: "-1" }],
    });

    const cashRangeError = (actual: string) => ({
      code: "debug.value_out_of_range",
      commandKind: "debug.inventory.adjust_cash",
      field: "cash_delta_result",
      actual,
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER,
    });
    for (const actual of ["0", "9007199254740992", "-1"]) {
      expect(pocDebugCommandValidationErrorSchemaV1.parse(cashRangeError(actual))).toMatchObject({
        actual,
      });
    }
    for (const actual of ["+1", "01", "-0", "1.0", " 1"]) {
      expect(() => pocDebugCommandValidationErrorSchemaV1.parse(cashRangeError(actual))).toThrow();
    }
  });

  it("validates stamina, Aura policy/conflicts, and Story values before opening a candidate", () => {
    const fixture = createPocGameplayFixtureV1();
    const executor = createPocGameDebugCommandExecutorV1(
      fixture.program,
      createPocGameplayModuleTupleV1(fixture.program),
    );

    expect(
      executor.validate(
        fixture.snapshot,
        commandV1({
          kind: "debug.actor.set_stamina",
          actorId: "actor.player",
          value: 11,
          reasonId: "reason.fixture",
        }),
        undefined,
      ),
    ).toMatchObject({
      kind: "validation_failed",
      errors: [{ code: "debug.value_out_of_range", maximum: 10 }],
    });
    expect(
      executor.validate(
        snapshotWithAuraV1(fixture.snapshot),
        commandV1({
          kind: "debug.aura.apply",
          auraId: "aura.fixture_timed",
          target: { kind: "actor", actorId: "actor.heroine" },
          duration: { kind: "countdown", unit: "day_end", remaining: 3 },
          reasonId: "reason.fixture",
        }),
        undefined,
      ),
    ).toEqual({
      kind: "validation_failed",
      errors: [
        {
          code: "debug.value_out_of_range",
          commandKind: "debug.aura.apply",
          field: "aura_duration",
          actual: 3,
          minimum: 1,
          maximum: 2,
        },
        {
          code: "debug.aura_target_not_allowed",
          commandKind: "debug.aura.apply",
          auraId: "aura.fixture_timed",
          target: { kind: "actor", actorId: "actor.heroine" },
        },
      ],
    });
    expect(
      executor.validate(
        snapshotWithAuraV1(fixture.snapshot),
        commandV1({
          kind: "debug.aura.apply",
          auraId: "aura.fixture_timed",
          target: { kind: "actor", actorId: "actor.player" },
          duration: { kind: "countdown", unit: "day_end", remaining: 2 },
          reasonId: "reason.fixture",
        }),
        undefined,
      ),
    ).toMatchObject({
      kind: "validation_failed",
      errors: [{ code: "debug.state_conflict", conflict: "aura_already_present" }],
    });
    expect(
      executor.validate(
        fixture.snapshot,
        commandV1({
          kind: "debug.story.fact.set",
          factId: "fact.fixture",
          value: { kind: "integer", value: 1 },
          reasonId: "reason.fixture",
        }),
        undefined,
      ),
    ).toMatchObject({
      kind: "validation_failed",
      errors: [{ code: "debug.story_value_invalid", factId: "fact.fixture" }],
    });
  });

  it("provides at least one semantic validation failure for every replayable kind", () => {
    const fixture = createPocGameplayFixtureV1();
    const executor = createPocGameDebugCommandExecutorV1(
      fixture.program,
      createPocGameplayModuleTupleV1(fixture.program),
    );
    const rng = fixture.snapshot.rng;
    const vectors = [
      {
        command: commandV1({
          kind: "debug.calendar.set_ap",
          value: 1,
          reasonId: "reason.unknown",
        }),
        code: "debug.unknown_reference",
      },
      {
        command: commandV1({
          kind: "debug.actor.set_stamina",
          actorId: "actor.player",
          value: 11,
          reasonId: "reason.fixture",
        }),
        code: "debug.value_out_of_range",
      },
      {
        command: commandV1({
          kind: "debug.actor.set_mood",
          actorId: "actor.heroine",
          value: 1,
          reasonId: "reason.unknown",
        }),
        code: "debug.unknown_reference",
      },
      {
        command: commandV1({
          kind: "debug.relationship.set",
          affection: 1,
          teamwork: 1,
          stage: "cold",
          reasonId: "reason.unknown",
        }),
        code: "debug.unknown_reference",
      },
      {
        command: commandV1({
          kind: "debug.inventory.adjust_cash",
          delta: -101,
          reasonId: "reason.fixture",
        }),
        code: "debug.value_out_of_range",
      },
      {
        command: commandV1({
          kind: "debug.aura.apply",
          auraId: "aura.unknown",
          target: { kind: "run" },
          duration: { kind: "until_cleared" },
          reasonId: "reason.fixture",
        }),
        code: "debug.unknown_reference",
      },
      {
        command: commandV1({
          kind: "debug.aura.clear",
          instanceId: "aura:9:0",
          reasonId: "reason.fixture",
        }),
        code: "debug.unknown_reference",
      },
      {
        command: commandV1({
          kind: "debug.story.fact.set",
          factId: "fact.fixture",
          value: { kind: "integer", value: 1 },
          reasonId: "reason.fixture",
        }),
        code: "debug.story_value_invalid",
      },
      {
        command: commandV1({
          kind: "debug.narrative.jump",
          cursor: { sceneId: "scene.fixture", nodeId: "node.fixture.end" },
          reasonId: "reason.fixture",
        }),
        code: "debug.unknown_reference",
      },
      {
        command: commandV1({
          kind: "debug.rng.set",
          rng,
          reasonId: "reason.unknown",
        }),
        code: "debug.unknown_reference",
      },
    ] as const;

    for (const { command, code } of vectors) {
      const validation = executor.validate(fixture.snapshot, command, undefined);
      expect(validation.kind, command.kind).toBe("validation_failed");
      if (validation.kind !== "validation_failed") {
        throw new TypeError("expected DebugCommand validation failure");
      }
      expect(validation.errors[0], command.kind).toMatchObject({
        code,
        commandKind: command.kind,
      });
      expect(fixture.snapshot.commandSequence).toBe(0);
    }
  });

  it("normalizes an owner rejection after allowed validation to one faulted attempt", () => {
    const fixture = createPocGameplayFixtureV1({ integrity: "modified" });
    const modules = createPocGameplayModuleTupleV1(fixture.program);
    const reject = vi.fn(() =>
      deepFreezePocValueV1({
        kind: "rejected" as const,
        rejection: {
          code: "calendar.insufficient_ap" as const,
          details: { required: 1, available: 0 },
        },
      }),
    ) as unknown as (typeof modules)[1]["owner"]["propose"];
    const rejectingModules = Object.freeze([
      modules[0],
      Object.freeze({
        ...modules[1],
        owner: Object.freeze({ ...modules[1].owner, propose: reject }),
      }),
      modules[2],
      modules[3],
      modules[4],
      modules[5],
      modules[6],
      modules[7],
      modules[8],
      modules[9],
    ] as const) as PocGameplayModuleTupleV1;
    const executor = createPocGameDebugCommandExecutorV1(fixture.program, rejectingModules);
    const command = commandV1({
      kind: "debug.calendar.set_ap",
      value: 1,
      reasonId: "reason.fixture",
    });

    expect(executor.validate(fixture.snapshot, command, undefined)).toEqual({ kind: "allowed" });
    const attempt = executor.executeAttempt(fixture.snapshot, command, undefined);

    expect(reject).toHaveBeenCalledOnce();
    expect(attempt.result.kind).toBe("faulted");
    expect(attempt.result).not.toHaveProperty("reasons");
    expect(attempt.result.snapshot).toBe(fixture.snapshot);
    expect(attempt.diagnostics.committedRngBefore).toBe(fixture.snapshot.rng);
    expect(attempt.diagnostics.candidateRngAfter).toEqual(fixture.snapshot.rng);
    expect(attempt.diagnostics.committedRngAfter).toBe(fixture.snapshot.rng);
    expect(attempt.diagnostics.attemptedDraws).toEqual([]);
    expect(fixture.snapshot.commandSequence).toBe(0);
  });

  it("normalizes direct execution of a validation failure to a fault without mutation", () => {
    const fixture = createPocGameplayFixtureV1({ integrity: "modified" });
    const executor = createPocGameDebugCommandExecutorV1(
      fixture.program,
      createPocGameplayModuleTupleV1(fixture.program),
    );
    const command = commandV1({
      kind: "debug.inventory.adjust_cash",
      delta: -101,
      reasonId: "reason.fixture",
    });
    const attempt = executor.executeAttempt(fixture.snapshot, command, undefined);

    expect(attempt.result.kind).toBe("faulted");
    expect(attempt.result.snapshot).toBe(fixture.snapshot);
    expect(attempt.result).not.toHaveProperty("reasons");
    expect(attempt.diagnostics.committedRngBefore).toBe(fixture.snapshot.rng);
    expect(attempt.diagnostics.committedRngAfter).toBe(fixture.snapshot.rng);
    expect(attempt.diagnostics.attemptedDraws).toEqual([]);
    expect(fixture.snapshot.commandSequence).toBe(0);
    expect(fixture.snapshot.integrity.mode).toBe("modified");
  });
});
