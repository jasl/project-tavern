// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly, RuntimeSchemaV1 } from "@sillymaker/base";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import type {
  PocGameCommandV1,
  PocGameQueriesV1,
  PocGameSnapshotV1,
  PocGameStateV1,
} from "../gameplay/index.js";
import {
  deepFreezePocValueV1,
  pocDemandForecastSchemaV1,
  pocFacilitiesProjectionSchemaV1,
  pocGameCommandSchemaV1,
  pocGameStateSchemaV1,
  pocGameViewSchemaV1,
  pocHudProjectionSchemaV1,
  pocInventoryProjectionSchemaV1,
  pocLedgerProjectionSchemaV1,
  pocLifePolicySelectionProjectionSchemaV1,
  pocRunStartControlProjectionSchemaV1,
  pocTavernOpeningControlProjectionSchemaV1,
  pocTavernProjectionSchemaV1,
  parseDayIndex,
  parsePositiveSafeInteger,
  parseQuantity,
} from "../gameplay/index.js";
import { createPocGameCommandExecutorV1 } from "../gameplay/game-command-executor.js";
import { createPocGameQueriesV1 } from "../gameplay/game-queries.js";
import { projectPocGameViewV1 } from "../gameplay/game-view-projector.js";
import { createPocGameplayModuleTupleV1 } from "../gameplay/modules/index.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

function omitKeyV1(
  value: Readonly<Record<string, unknown>>,
  omittedKey: string,
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== omittedKey));
}

function expectDeeplyFrozenV1(value: unknown, seen = new WeakSet<object>()): void {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeeplyFrozenV1(nested, seen);
}

function expectStrictRuntimeSchemaV1(
  schema: RuntimeSchemaV1<unknown>,
  value: Readonly<Record<string, unknown>>,
): void {
  const parsed = schema.parse(value);
  expect(parsed).toEqual(value);
  expectDeeplyFrozenV1(parsed);
  for (const key of Object.keys(value)) {
    expect(() => schema.parse(omitKeyV1(value, key)), `missing ${key}`).toThrow();
  }
  expect(() => schema.parse({ ...value, extra: true })).toThrow();
}

function requireCommittedV1(
  executor: ReturnType<typeof createPocGameCommandExecutorV1>,
  snapshot: PocGameSnapshotV1,
  command: PocGameCommandV1,
): PocGameSnapshotV1 {
  const attempt = executor.executeAttempt(snapshot, command, undefined);
  expect(attempt.result.kind, `${command.kind}: ${JSON.stringify(attempt.result)}`).toBe(
    "committed",
  );
  if (attempt.result.kind !== "committed") throw new TypeError(`${command.kind} did not commit`);
  return attempt.result.snapshot;
}

describe("PoC GameQueries", () => {
  it("accepts Gameplay State only and exposes the exact immutable method set", () => {
    expectTypeOf(createPocGameQueriesV1).parameter(0).toEqualTypeOf<DeepReadonly<PocGameStateV1>>();
    expectTypeOf(createPocGameQueriesV1).returns.toEqualTypeOf<PocGameQueriesV1>();

    const fixture = createPocGameplayFixtureV1();
    const queries = createPocGameQueriesV1(fixture.snapshot.state, fixture.program);
    expect(Object.isFrozen(queries)).toBe(true);
    expect(Object.keys(queries)).toEqual([
      "getAvailableActions",
      "getActionInputCatalog",
      "explainAvailability",
      "previewCommand",
      "previewTavernPlan",
      "getGameViewStatus",
      "getHudProjection",
      "getInventoryProjection",
      "getTavernProjection",
      "getFacilitiesProjection",
      "getLedgerProjection",
      "getNarrativeProjection",
      "getRunStartControl",
      "getLifePolicySelection",
      "getTavernOpeningControl",
      "getDemandForecast",
      "getObligationForecast",
      "getResolvedChecks",
      "getRunCompletion",
    ]);
  });

  it("projects bounded action inputs from the closed Program and current unlocks", () => {
    const fixture = createPocGameplayFixtureV1();
    const queries = createPocGameQueriesV1(fixture.snapshot.state, fixture.program);
    const catalog = queries.getActionInputCatalog();

    expect(catalog).toEqual({
      purchase: {
        lineLimit: 4,
        ingredients: [
          {
            ingredientId: "ingredient.fixture",
            nameTextId: "text.fixture",
            unitPrice: 1,
            shelfLifeDays: 2,
            refrigeratable: true,
          },
        ],
      },
      tavernPlan: {
        recipeLimit: 2,
        serviceModes: fixture.program.data.balance.serviceModes.map(
          ({
            availability: _availability,
            reasonId: _reasonId,
            teamworkGain: _teamworkGain,
            ...mode
          }) => mode,
        ),
        recipes: [
          {
            recipeId: "recipe.fixture",
            nameTextId: "text.fixture",
            ingredients: [{ ingredientId: "ingredient.fixture", quantity: 1 }],
            salePrice: 3,
            prepPoints: 1,
          },
        ],
      },
      facility: {
        options: [
          {
            opportunityId: "action.fixture_facility",
            choice: { kind: "build", facilityId: "facility.fixture" },
            labelTextId: "text.fixture",
            cashCost: 5,
            confirmation: {
              benefitTextIds: [],
              mutuallyExcludedActionIds: [],
              majorRiskTextIds: [],
            },
          },
          {
            opportunityId: "action.fixture_facility",
            choice: { kind: "build", facilityId: "facility.fixture_bed" },
            labelTextId: "text.fixture",
            cashCost: 5,
            confirmation: {
              benefitTextIds: [],
              mutuallyExcludedActionIds: [],
              majorRiskTextIds: [],
            },
          },
          {
            opportunityId: "action.fixture_facility",
            choice: { kind: "skip" },
            labelTextId: "text.fixture",
            cashCost: 0,
            confirmation: {
              benefitTextIds: [],
              mutuallyExcludedActionIds: [],
              majorRiskTextIds: [],
            },
          },
        ],
      },
      worldAction: {
        options: [
          {
            actionId: "action.fixture_world",
            optionId: "choice.fixture_world",
            labelTextId: "text.fixture",
            baseCashCost: 0,
            additionalCashCost: 0,
            playerStaminaCost: 0,
            confirmation: {
              benefitTextIds: [],
              mutuallyExcludedActionIds: [],
              majorRiskTextIds: [],
            },
          },
        ],
      },
    });
    expectDeeplyFrozenV1(catalog);
    expect(catalog).not.toHaveProperty("state");
    expect(catalog.tavernPlan.serviceModes[0]).not.toHaveProperty("availability");
    expect(catalog.tavernPlan.serviceModes[0]).not.toHaveProperty("reasonId");
    expect(catalog.tavernPlan.serviceModes[0]).not.toHaveProperty("teamworkGain");
    expect(catalog.tavernPlan.recipes[0]).not.toHaveProperty("preferences");

    const lockedState = pocGameStateSchemaV1.parse({
      ...fixture.snapshot.state,
      simulation: {
        ...fixture.snapshot.state.simulation,
        tavern: { ...fixture.snapshot.state.simulation.tavern, unlockedRecipeIds: [] },
      },
    });
    expect(
      createPocGameQueriesV1(lockedState, fixture.program).getActionInputCatalog().tavernPlan
        .recipes,
    ).toEqual([]);

    const cappedProgram = deepFreezePocValueV1({
      ...fixture.program,
      data: {
        ...fixture.program.data,
        balance: {
          ...fixture.program.data.balance,
          menuRecipeLimit: parsePositiveSafeInteger(32),
        },
      },
    });
    expect(
      createPocGameQueriesV1(fixture.snapshot.state, cappedProgram).getActionInputCatalog()
        .tavernPlan.recipeLimit,
    ).toBe(16);
  });

  it("projects setup without leaking Snapshot-only or private gameplay fields", () => {
    const fixture = createPocGameplayFixtureV1();
    const queries = createPocGameQueriesV1(fixture.snapshot.state, fixture.program);
    const view = projectPocGameViewV1(queries);

    expect(queries.getGameViewStatus()).toBe("setup");
    expect(queries.getRunStartControl()).toMatchObject({
      command: { kind: "run.start" },
      preview: { allowed: true, confirmation: null },
    });
    expect(queries.previewCommand({ kind: "actor.rest" })).toMatchObject({ allowed: false });
    expect(view).toMatchObject({
      status: "setup",
      hud: { day: 1, phase: "morning" },
      runStartControl: { command: { kind: "run.start" } },
    });
    expect(view).not.toHaveProperty("narrative");
    expect(view).not.toHaveProperty("integrity");
    expect(view).not.toHaveProperty("rng");
    expect(view).not.toHaveProperty("commandSequence");
    expect(queries.getNarrativeProjection()).toBeNull();

    const inventory = queries.getInventoryProjection();
    expect(Object.keys(inventory)).toEqual(["ingredientBatches", "itemStacks"]);
    expect(inventory.ingredientBatches.every((batch) => !("source" in batch))).toBe(true);
    const tavern = queries.getTavernProjection();
    expect(Object.keys(tavern)).toEqual([
      "unlockedRecipeIds",
      "helper",
      "preparation",
      "servicePlan",
      "currentPlanPreview",
      "serviceHistory",
    ]);
    expect(tavern).not.toHaveProperty("demandSeeds");
    expect(tavern).not.toHaveProperty("currentDemand");
    expect(tavern.currentPlanPreview).toBeNull();
  });

  it("returns deeply frozen projections and a GameView assembled only from queries", () => {
    const fixture = createPocGameplayFixtureV1();
    const queries = createPocGameQueriesV1(fixture.snapshot.state, fixture.program);
    const projections = [
      queries.getHudProjection(),
      queries.getInventoryProjection(),
      queries.getTavernProjection(),
      queries.getFacilitiesProjection(),
      queries.getLedgerProjection(),
      queries.getResolvedChecks(),
      projectPocGameViewV1(queries),
    ];

    for (const projection of projections) expect(Object.isFrozen(projection)).toBe(true);
  });

  it("builds GameView by calling each authoritative getter exactly once", () => {
    const fixture = createPocGameplayFixtureV1();
    const queries = createPocGameQueriesV1(fixture.snapshot.state, fixture.program);
    const getters = {
      getGameViewStatus: vi.fn(() => queries.getGameViewStatus()),
      getHudProjection: vi.fn(() => queries.getHudProjection()),
      getAvailableActions: vi.fn(() => queries.getAvailableActions()),
      getRunStartControl: vi.fn(() => queries.getRunStartControl()),
      getLifePolicySelection: vi.fn(() => queries.getLifePolicySelection()),
      getTavernOpeningControl: vi.fn(() => queries.getTavernOpeningControl()),
      getDemandForecast: vi.fn(() => queries.getDemandForecast()),
      getObligationForecast: vi.fn(() => queries.getObligationForecast()),
      getInventoryProjection: vi.fn(() => queries.getInventoryProjection()),
      getTavernProjection: vi.fn(() => queries.getTavernProjection()),
      getFacilitiesProjection: vi.fn(() => queries.getFacilitiesProjection()),
      getLedgerProjection: vi.fn(() => queries.getLedgerProjection()),
      getResolvedChecks: vi.fn(() => queries.getResolvedChecks()),
      getRunCompletion: vi.fn(() => queries.getRunCompletion()),
      getNarrativeProjection: vi.fn(() => queries.getNarrativeProjection()),
    };
    const wrapped: PocGameQueriesV1 = Object.freeze({ ...queries, ...getters });

    projectPocGameViewV1(wrapped);

    for (const [name, getter] of Object.entries(getters)) {
      if (name === "getNarrativeProjection") expect(getter).not.toHaveBeenCalled();
      else expect(getter, name).toHaveBeenCalledTimes(1);
    }
  });

  it("validates the five exact strict projection DTOs without private State fields", () => {
    const fixture = createPocGameplayFixtureV1();
    const state = pocGameStateSchemaV1.parse({
      ...fixture.snapshot.state,
      simulation: {
        ...fixture.snapshot.state.simulation,
        inventory: {
          ...fixture.snapshot.state.simulation.inventory,
          ingredientBatches: [
            {
              batchId: "batch:initial:0",
              ingredientId: "ingredient.fixture",
              quantity: 2,
              acquiredDay: 1,
              lastUsableDay: 2,
              refrigerationExtended: false,
              source: { kind: "initial", reasonId: "reason.fixture" },
            },
          ],
          itemStacks: [{ itemId: "item.fixture", quantity: 1 }],
        },
      },
    });
    const queries = createPocGameQueriesV1(state, fixture.program);
    const hud = queries.getHudProjection();
    const inventory = queries.getInventoryProjection();
    const tavern = queries.getTavernProjection();
    const facilities = queries.getFacilitiesProjection();
    const ledger = queries.getLedgerProjection();

    expect(Object.keys(hud)).toEqual([
      "day",
      "phase",
      "apRemaining",
      "cash",
      "reputation",
      "playerStamina",
      "heroineStamina",
      "heroineMood",
      "relationship",
      "levyAmount",
    ]);
    expect(Object.keys(inventory)).toEqual(["ingredientBatches", "itemStacks"]);
    expect(Object.keys(inventory.ingredientBatches[0] ?? {})).toEqual([
      "batchId",
      "ingredientId",
      "quantity",
      "acquiredDay",
      "lastUsableDay",
      "refrigerationExtended",
    ]);
    expect(inventory.ingredientBatches[0]).not.toHaveProperty("source");
    expect(Object.keys(tavern)).toEqual([
      "unlockedRecipeIds",
      "helper",
      "preparation",
      "servicePlan",
      "currentPlanPreview",
      "serviceHistory",
    ]);
    expect(tavern).not.toHaveProperty("demandSeeds");
    expect(tavern).not.toHaveProperty("currentDemand");
    expect(Object.keys(facilities)).toEqual(["built", "decisions"]);
    expect(Object.keys(ledger)).toEqual(["startingCash", "currentCash", "entries"]);

    const strictCases = [
      [pocHudProjectionSchemaV1, hud],
      [pocInventoryProjectionSchemaV1, inventory],
      [pocTavernProjectionSchemaV1, tavern],
      [pocFacilitiesProjectionSchemaV1, facilities],
      [pocLedgerProjectionSchemaV1, ledger],
    ] as const;
    for (const [schema, projection] of strictCases) {
      expectStrictRuntimeSchemaV1(
        schema as RuntimeSchemaV1<unknown>,
        projection as unknown as Readonly<Record<string, unknown>>,
      );
      expectDeeplyFrozenV1(projection);
    }

    const [batch] = inventory.ingredientBatches;
    expect(batch).toBeDefined();
    expect(() =>
      pocInventoryProjectionSchemaV1.parse({
        ...inventory,
        ingredientBatches: [{ ...batch, source: { kind: "initial" } }],
      }),
    ).toThrow();
    for (const key of Object.keys(batch ?? {})) {
      expect(() =>
        pocInventoryProjectionSchemaV1.parse({
          ...inventory,
          ingredientBatches: [
            omitKeyV1(batch as unknown as Readonly<Record<string, unknown>>, key),
          ],
        }),
      ).toThrow();
    }
  });

  it("projects demand ranges without hidden materialized actuals", () => {
    const fixture = createPocGameplayFixtureV1();
    const state = pocGameStateSchemaV1.parse({
      ...fixture.snapshot.state,
      simulation: {
        ...fixture.snapshot.state.simulation,
        tavern: {
          ...fixture.snapshot.state.simulation.tavern,
          demandSeeds: [{ day: 1, segments: [] }],
          currentDemand: {
            day: 1,
            segments: [
              {
                segmentId: "segment.fixture",
                preview: { min: 1, max: 3 },
                actualCustomers: 2,
                modifiers: [],
              },
            ],
          },
        },
      },
    });
    const forecast = createPocGameQueriesV1(state, fixture.program).getDemandForecast();
    expect(Object.keys(forecast?.lines[0] ?? {})).toEqual(["segmentId", "range", "modifiers"]);
    expect(forecast?.lines[0]).not.toHaveProperty("actualCustomers");
    expect(forecast?.lines[0]).not.toHaveProperty("randomOffset");
    expect(pocDemandForecastSchemaV1.parse(forecast)).toEqual(forecast);
  });

  it("validates control equality refinements and preserves exact preview commands", () => {
    const fixture = createPocGameplayFixtureV1();
    const setupQueries = createPocGameQueriesV1(fixture.snapshot.state, fixture.program);
    const runStart = setupQueries.getRunStartControl();
    expect(runStart).not.toBeNull();
    expectStrictRuntimeSchemaV1(
      pocRunStartControlProjectionSchemaV1 as RuntimeSchemaV1<unknown>,
      runStart as unknown as Readonly<Record<string, unknown>>,
    );

    const purchaseCommand = pocGameCommandSchemaV1.parse({
      kind: "inventory.buy",
      lines: [{ ingredientId: "ingredient.fixture", quantity: 1 }],
    });
    const purchasePreview = setupQueries.previewCommand(purchaseCommand);
    expect(purchasePreview.command).toEqual(purchaseCommand);

    const completedManifestState = pocGameStateSchemaV1.parse({
      ...fixture.snapshot.state,
      simulation: {
        ...fixture.snapshot.state.simulation,
        tavern: {
          ...fixture.snapshot.state.simulation.tavern,
          demandSeeds: [{ day: 1, segments: [] }],
        },
      },
      story: {
        ...fixture.snapshot.state.story,
        narrative: {
          ...fixture.snapshot.state.story.narrative,
          status: "completed",
          source: { kind: "manifest_start" },
        },
      },
    });
    const lifePolicySelection = createPocGameQueriesV1(
      completedManifestState,
      fixture.program,
    ).getLifePolicySelection();
    expect(lifePolicySelection).not.toBeNull();
    const parsedSelection = pocLifePolicySelectionProjectionSchemaV1.parse(lifePolicySelection);
    expect(parsedSelection).toEqual(lifePolicySelection);
    const option = lifePolicySelection?.options[0];
    expect(option).toBeDefined();
    expect(() =>
      pocLifePolicySelectionProjectionSchemaV1.parse({
        options: [
          {
            ...option,
            preview: {
              ...option?.preview,
              command: { kind: "policy.choose", policyId: "policy.different" },
            },
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      pocLifePolicySelectionProjectionSchemaV1.parse({
        options: [{ ...option, policyId: "policy.different" }],
      }),
    ).toThrow();
    expect(() => pocLifePolicySelectionProjectionSchemaV1.parse({ options: [] })).toThrow();

    const openingState = pocGameStateSchemaV1.parse({
      ...fixture.snapshot.state,
      simulation: {
        ...fixture.snapshot.state.simulation,
        run: { ...fixture.snapshot.state.simulation.run, status: "active" },
        calendar: {
          ...fixture.snapshot.state.simulation.calendar,
          phase: "evening",
          lifePolicyId: "policy.fixture",
          apRemaining: 2,
        },
        tavern: {
          ...fixture.snapshot.state.simulation.tavern,
          servicePlan: {
            mode: "manual",
            menu: [{ recipeId: "recipe.fixture", portions: 1 }],
          },
        },
      },
    });
    const openingControl = createPocGameQueriesV1(
      openingState,
      fixture.program,
    ).getTavernOpeningControl();
    expect(openingControl?.kind).toBe("start");
    expect(pocTavernOpeningControlProjectionSchemaV1.parse(openingControl)).toEqual(openingControl);
    expect(() =>
      pocTavernOpeningControlProjectionSchemaV1.parse({
        ...openingControl,
        preview: {
          ...openingControl?.preview,
          command: { kind: "tavern.opening.continue" },
        },
      }),
    ).toThrow();
    expect(() =>
      pocTavernOpeningControlProjectionSchemaV1.parse({
        ...openingControl,
        command: { kind: "tavern.opening.continue" },
      }),
    ).toThrow();
    const narrativeBlockedState = deepFreezePocValueV1({
      ...openingState,
      story: {
        ...openingState.story,
        narrative: { ...openingState.story.narrative, status: "active" as const },
      },
    });
    expect(
      createPocGameQueriesV1(narrativeBlockedState, fixture.program).getTavernOpeningControl(),
    ).toBeNull();
  });

  it("validates the exact strict GameView and its cross-projection cash invariant", () => {
    const fixture = createPocGameplayFixtureV1();
    const view = projectPocGameViewV1(
      createPocGameQueriesV1(fixture.snapshot.state, fixture.program),
    );
    expect(Object.keys(view)).toEqual([
      "status",
      "hud",
      "actions",
      "runStartControl",
      "lifePolicySelection",
      "tavernOpeningControl",
      "demandForecast",
      "obligationForecast",
      "inventory",
      "tavern",
      "facilities",
      "ledger",
      "resolvedChecks",
      "completion",
    ]);
    expectStrictRuntimeSchemaV1(
      pocGameViewSchemaV1 as RuntimeSchemaV1<unknown>,
      view as unknown as Readonly<Record<string, unknown>>,
    );
    expectDeeplyFrozenV1(view);
    expect(() =>
      pocGameViewSchemaV1.parse({
        ...view,
        hud: { ...view.hud, cash: Number(view.hud.cash) + 1 },
      }),
    ).toThrow();
    expect(() =>
      pocGameViewSchemaV1.parse({
        ...view,
        tavern: { ...view.tavern, currentDemand: null },
      }),
    ).toThrow();
  });

  it("projects the full frozen-plan obligation and Opening-control lifecycle", () => {
    const fixture = createPocGameplayFixtureV1();
    const laterVisibilityProgram = deepFreezePocValueV1({
      ...fixture.program,
      data: {
        ...fixture.program.data,
        balance: {
          ...fixture.program.data.balance,
          obligationForecast: {
            ...fixture.program.data.balance.obligationForecast,
            visibleFrom: { day: parseDayIndex(2), phase: "morning" as const },
            conservativeFrom: { day: parseDayIndex(2), phase: "afternoon" as const },
          },
        },
      },
    });
    expect(
      createPocGameQueriesV1(
        fixture.snapshot.state,
        laterVisibilityProgram,
      ).getObligationForecast(),
    ).toBeNull();
    const executor = createPocGameCommandExecutorV1(
      fixture.program,
      createPocGameplayModuleTupleV1(fixture.program),
    );
    let snapshot = requireCommittedV1(executor, fixture.snapshot, { kind: "run.start" });
    snapshot = requireCommittedV1(executor, snapshot, {
      kind: "policy.choose",
      policyId: fixture.program.data.balance.lifePolicies[0]!.policyId,
    });
    const worldAction = fixture.program.data.content.worldActions[0]!;
    const worldSnapshot = requireCommittedV1(executor, snapshot, {
      kind: "world.action.begin",
      actionId: worldAction.actionId,
      optionId: worldAction.options[0]!.optionId,
    });
    expect(worldSnapshot.state.simulation.activeWorkflow?.kind).toBe("world_action");
    expect(
      createPocGameQueriesV1(worldSnapshot.state, fixture.program).getTavernOpeningControl(),
    ).toBeNull();
    expect(
      createPocGameQueriesV1(snapshot.state, fixture.program).getObligationForecast(),
    ).toMatchObject({ kind: "current_gap" });

    const ingredientId = fixture.program.data.content.ingredients[0]!.ingredientId;
    const recipeId = fixture.program.data.content.recipes[0]!.recipeId;
    snapshot = requireCommittedV1(executor, snapshot, {
      kind: "inventory.buy",
      lines: [{ ingredientId, quantity: parseQuantity(1) }],
    });
    snapshot = requireCommittedV1(executor, snapshot, {
      kind: "tavern.plan.set",
      plan: { mode: "manual", menu: [{ recipeId, portions: parseQuantity(1) }] },
    });
    snapshot = requireCommittedV1(executor, snapshot, { kind: "calendar.advance_phase" });
    expect(
      createPocGameQueriesV1(snapshot.state, fixture.program).getObligationForecast(),
    ).toMatchObject({ kind: "current_gap" });

    snapshot = requireCommittedV1(executor, snapshot, { kind: "calendar.advance_phase" });
    let queries = createPocGameQueriesV1(snapshot.state, fixture.program);
    expect(queries.getTavernOpeningControl()).toMatchObject({ kind: "start" });
    expect(queries.getObligationForecast()).toMatchObject({
      kind: "committed_plan_conservative",
    });

    snapshot = requireCommittedV1(executor, snapshot, { kind: "tavern.opening.start" });
    queries = createPocGameQueriesV1(snapshot.state, fixture.program);
    const activeForecast = queries.getObligationForecast();
    expect(activeForecast).toMatchObject({
      kind: "committed_plan_conservative",
    });
    const activeWorkflow = snapshot.state.simulation.activeWorkflow;
    expect(activeWorkflow?.kind).toBe("opening");
    if (activeWorkflow?.kind !== "opening") throw new TypeError("Opening did not stay active");
    const activePlan = {
      mode: activeWorkflow.baseline.mode,
      menu: activeWorkflow.baseline.menu,
    } as const;
    const activePreview = queries.previewTavernPlan(activePlan);
    if (activeForecast?.kind !== "committed_plan_conservative") {
      throw new TypeError("missing committed obligation forecast");
    }
    expect(activeForecast.projectedCashAfterOpening.min).toBe(
      Number(snapshot.state.simulation.inventory.cash) + Number(activePreview.cashDelta.min),
    );

    for (let step = 0; step < 8; step += 1) {
      const control = createPocGameQueriesV1(
        snapshot.state,
        fixture.program,
      ).getTavernOpeningControl();
      if (control?.kind === "finalize") break;
      expect(control?.kind).toBe("continue");
      snapshot = requireCommittedV1(executor, snapshot, { kind: "tavern.opening.continue" });
    }
    expect(
      createPocGameQueriesV1(snapshot.state, fixture.program).getTavernOpeningControl()?.kind,
    ).toBe("finalize");
    snapshot = requireCommittedV1(executor, snapshot, { kind: "tavern.opening.finalize" });
    queries = createPocGameQueriesV1(snapshot.state, fixture.program);
    expect(queries.getTavernOpeningControl()).toBeNull();
    expect(queries.getObligationForecast()).toMatchObject({ kind: "final" });
  });
});
