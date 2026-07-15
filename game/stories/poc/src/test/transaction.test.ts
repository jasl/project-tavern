// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { createTransactionalRngV1 } from "@sillymaker/base";

import {
  parseIngredientId,
  parseQuantity,
  parseReasonId,
  parseNonZeroUint32,
  parseSafeInteger,
  pocGameplayModuleKeysV1,
  pocSimulationDataSchemaV1,
  type PocSimulationProgramV1,
} from "../gameplay/index.js";
import { createPocGameplayModuleTupleV1 } from "../gameplay/modules/index.js";
import {
  commitPocCandidateV1,
  createPocTransactionCandidateV1,
  type PocTransactionCandidateV1,
} from "../gameplay/transaction/candidate.js";
import {
  pocEffectIntentKindsV1,
  pocEffectOwnerByKindV1,
  routePocEffectBatchV1,
} from "../gameplay/transaction/effect-router.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

describe("PoC transaction candidate", () => {
  it("materializes the fixed typed module tuple from only the five owned initial slices", () => {
    const fixture = createPocGameplayFixtureV1();
    const alternateData = pocSimulationDataSchemaV1.parse({
      ...fixture.program.data,
      stateDefinitions: {
        ...fixture.program.data.stateDefinitions,
        facts: fixture.program.data.stateDefinitions.facts.map((definition, index) =>
          index === 0
            ? { ...definition, value: { kind: "boolean", defaultValue: true } }
            : definition,
        ),
      },
      initialState: {
        ...fixture.program.data.initialState,
        player: { ...fixture.program.data.initialState.player, mood: 1 },
        cash: 101,
        reputation: 51,
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
      },
    });
    const alternateProgram: PocSimulationProgramV1 = Object.freeze({
      data: alternateData,
      rules: fixture.program.rules,
    });
    const first = createPocGameplayModuleTupleV1(fixture.program);
    const second = createPocGameplayModuleTupleV1(alternateProgram);

    expect(first.map(({ descriptor }) => descriptor.id)).toEqual(
      pocGameplayModuleKeysV1.map((key) => `module.${key}`),
    );
    expect(second.map(({ descriptor }) => descriptor)).toEqual(
      first.map(({ descriptor }) => descriptor),
    );
    expect(second[2].createInitialState(fixture.bootstrap)).not.toEqual(
      first[2].createInitialState(fixture.bootstrap),
    );
    expect(second[3].createInitialState(fixture.bootstrap)).not.toEqual(
      first[3].createInitialState(fixture.bootstrap),
    );
    expect(second[4].createInitialState(fixture.bootstrap)).not.toEqual(
      first[4].createInitialState(fixture.bootstrap),
    );
    expect(second[6].createInitialState(fixture.bootstrap)).not.toEqual(
      first[6].createInitialState(fixture.bootstrap),
    );
    expect(second[8].createInitialState(fixture.bootstrap)).not.toEqual(
      first[8].createInitialState(fixture.bootstrap),
    );
    expect(first[2].createInitialState(fixture.bootstrap)).toEqual(
      fixture.snapshot.state.simulation.actors,
    );
  });

  it("maps every effect kind to exactly one owner", () => {
    expect(Object.keys(pocEffectOwnerByKindV1).sort()).toEqual([...pocEffectIntentKindsV1].sort());
  });

  it("commits one validated sequence while preserving the opaque integrity reference", () => {
    const fixture = createPocGameplayFixtureV1({ integrity: "modified" });
    const candidate = createPocTransactionCandidateV1(
      fixture.snapshot,
      fixture.program,
      createPocGameplayModuleTupleV1(fixture.program),
    );
    expect(
      routePocEffectBatchV1(
        candidate,
        [
          {
            kind: "calendar.ap.adjust",
            delta: parseSafeInteger(1),
            reasonId: parseReasonId("reason.fixture"),
          },
        ],
        { kind: "command", commandKind: "run.start" },
      ),
    ).toEqual({ kind: "applied" });

    const committed = commitPocCandidateV1(candidate);
    expect(committed.commandSequence).toBe(fixture.snapshot.commandSequence + 1);
    expect(committed.state.simulation.calendar.apRemaining).toBe(1);
    expect(committed.integrity).toBe(fixture.snapshot.integrity);
    expect(candidate.gameplayFacts().map(({ kind }) => kind)).toEqual(["calendar.ap_changed"]);
  });

  it("replaces RNG only through the debug primitive and restores it on rollback", () => {
    const fixture = createPocGameplayFixtureV1({ integrity: "modified" });
    const candidate = createPocTransactionCandidateV1(
      fixture.snapshot,
      fixture.program,
      createPocGameplayModuleTupleV1(fixture.program),
    );
    candidate.rng().nextInt({ exclusiveMax: 6, purpose: "demand:fixture" });
    const checkpoint = candidate.checkpoint();
    const checkpointRng = candidate.rng();
    const checkpointState = candidate.candidateRngState();
    const replacement = createTransactionalRngV1(parseNonZeroUint32(0x0004_6061)).candidateState();

    candidate.replaceRngForDebug(replacement);
    expect(candidate.candidateRngState()).toEqual(replacement);
    expect(candidate.attemptedDraws()).toEqual([]);

    candidate.rollback(checkpoint);
    expect(candidate.rng()).toBe(checkpointRng);
    expect(candidate.candidateRngState()).toEqual(checkpointState);
    expect(candidate.attemptedDraws()).toHaveLength(1);

    candidate.replaceRngForDebug(replacement);
    const committed = commitPocCandidateV1(candidate);
    expect(committed.rng).toEqual(replacement);
    expect(committed.integrity).toBe(fixture.snapshot.integrity);
  });

  it("preflights every reference before the first owner proposal", () => {
    const fixture = createPocGameplayFixtureV1();
    const candidate = createPocTransactionCandidateV1(
      fixture.snapshot,
      fixture.program,
      createPocGameplayModuleTupleV1(fixture.program),
    );
    expect(() =>
      routePocEffectBatchV1(
        candidate,
        [
          {
            kind: "calendar.ap.adjust",
            delta: parseSafeInteger(1),
            reasonId: parseReasonId("reason.fixture"),
          },
          {
            kind: "calendar.ap.adjust",
            delta: parseSafeInteger(1),
            reasonId: parseReasonId("reason.missing"),
          },
        ],
        { kind: "command", commandKind: "run.start" },
      ),
    ).toThrow(/unknown ReasonId/u);
    expect(candidate.snapshot()).toBe(fixture.snapshot);
    expect(candidate.gameplayFacts()).toEqual([]);
  });

  it("composes router dependencies through selected module read ports", () => {
    const fixture = createPocGameplayFixtureV1();
    const candidate = createPocTransactionCandidateV1(
      fixture.snapshot,
      fixture.program,
      createPocGameplayModuleTupleV1(fixture.program),
    );
    const withoutAggregateReads = new Proxy(candidate, {
      get(target, property, receiver) {
        if (property === "snapshot") {
          return (): never => {
            throw new TypeError("router read the aggregate Snapshot");
          };
        }
        return Reflect.get(target, property, receiver) as unknown;
      },
    }) as PocTransactionCandidateV1;
    const actionId = fixture.program.data.content.storyActions[0]!.actionId;
    const ingredientId = fixture.program.data.content.ingredients[0]!.ingredientId;

    expect(
      routePocEffectBatchV1(
        withoutAggregateReads,
        [
          {
            kind: "calendar.ap.adjust",
            delta: parseSafeInteger(1),
            reasonId: parseReasonId("reason.fixture"),
          },
          {
            kind: "inventory.grant",
            lines: [{ ingredientId, quantity: parseQuantity(1) }],
            source: { kind: "story_action", actionId },
            reasonId: parseReasonId("reason.fixture"),
          },
        ],
        { kind: "story_action", actionId },
      ),
    ).toEqual({ kind: "applied" });
  });

  it("projects authored Ingredients into the Inventory effect port's stable ID order", () => {
    const fixture = createPocGameplayFixtureV1();
    const authored = fixture.program.data.content.ingredients[0]!;
    const earlierIngredientId = parseIngredientId("ingredient.alpha_fixture");
    const program: PocSimulationProgramV1 = Object.freeze({
      data: pocSimulationDataSchemaV1.parse({
        ...fixture.program.data,
        content: {
          ...fixture.program.data.content,
          ingredients: [
            authored,
            {
              ...authored,
              ingredientId: earlierIngredientId,
            },
          ],
        },
      }),
      rules: fixture.program.rules,
    });
    const candidate = createPocTransactionCandidateV1(
      fixture.snapshot,
      program,
      createPocGameplayModuleTupleV1(program),
    );
    const actionId = program.data.content.storyActions[0]!.actionId;

    expect(
      routePocEffectBatchV1(
        candidate,
        [
          {
            kind: "inventory.grant",
            lines: [{ ingredientId: earlierIngredientId, quantity: parseQuantity(1) }],
            source: { kind: "story_action", actionId },
            reasonId: parseReasonId("reason.fixture"),
          },
        ],
        { kind: "story_action", actionId },
      ),
    ).toEqual({ kind: "applied" });
  });

  it("preflights opening modifiers before applying an earlier effect", () => {
    const fixture = createPocGameplayFixtureV1();
    const eventId = fixture.program.data.content.events[0]!.eventId;
    const candidate = createPocTransactionCandidateV1(
      fixture.snapshot,
      fixture.program,
      createPocGameplayModuleTupleV1(fixture.program),
    );
    expect(() =>
      routePocEffectBatchV1(
        candidate,
        [
          {
            kind: "calendar.ap.adjust",
            delta: parseSafeInteger(1),
            reasonId: parseReasonId("reason.fixture"),
          },
          {
            kind: "modifier.add",
            lifetime: "opening_session",
            modifier: {
              kind: "capacity.add",
              source: { kind: "event", eventId },
              modes: ["manual"],
              amount: parseSafeInteger(1),
              reasonId: parseReasonId("reason.fixture"),
            },
            reasonId: parseReasonId("reason.fixture"),
          },
        ],
        { kind: "event", eventId },
      ),
    ).toThrow(/active Opening/u);
    expect(candidate.snapshot()).toBe(fixture.snapshot);
    expect(candidate.gameplayFacts()).toEqual([]);
  });

  it("rolls back an earlier valid effect when a later effect rejects", () => {
    const fixture = createPocGameplayFixtureV1();
    const modules = createPocGameplayModuleTupleV1(fixture.program);
    const candidate = createPocTransactionCandidateV1(fixture.snapshot, fixture.program, modules);
    const result = routePocEffectBatchV1(
      candidate,
      [
        {
          kind: "calendar.ap.adjust",
          delta: parseSafeInteger(1),
          reasonId: parseReasonId("reason.fixture"),
        },
        {
          kind: "inventory.consume",
          lines: [
            {
              ingredientId: fixture.program.data.content.ingredients[0]!.ingredientId,
              quantity: parseQuantity(999),
            },
          ],
          reasonId: parseReasonId("reason.fixture"),
        },
      ],
      { kind: "command", commandKind: "calendar.advance_phase" },
    );

    expect(result.kind).toBe("rejected");
    expect(candidate.snapshot()).toBe(fixture.snapshot);
    expect(candidate.gameplayFacts()).toEqual([]);
  });

  it("restores allocation cursors when a later owner rejects", () => {
    const fixture = createPocGameplayFixtureV1();
    const candidate = createPocTransactionCandidateV1(
      fixture.snapshot,
      fixture.program,
      createPocGameplayModuleTupleV1(fixture.program),
    );
    const ingredientId = fixture.program.data.content.ingredients[0]!.ingredientId;
    const actionId = fixture.program.data.content.storyActions[0]!.actionId;
    const result = routePocEffectBatchV1(
      candidate,
      [
        {
          kind: "inventory.grant",
          lines: [{ ingredientId, quantity: parseQuantity(1) }],
          source: { kind: "story_action", actionId },
          reasonId: parseReasonId("reason.fixture"),
        },
        {
          kind: "inventory.consume",
          lines: [{ ingredientId, quantity: parseQuantity(999) }],
          reasonId: parseReasonId("reason.fixture"),
        },
      ],
      { kind: "story_action", actionId },
    );

    expect(result.kind).toBe("rejected");
    expect(candidate.snapshot()).toBe(fixture.snapshot);
    expect(candidate.nextBatchIndex()).toBe(0);
    expect(candidate.nextLedgerEntryIndex()).toBe(0);
    expect(candidate.gameplayFacts()).toEqual([]);
  });
});
