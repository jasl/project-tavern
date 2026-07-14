// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  parseActionId,
  parseCustomerSegmentId,
  parseFacilityId,
  parseReasonId,
  parseRecipeId,
} from "../gameplay/contracts/ids.js";
import {
  parseDayIndex,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseQuantity,
  parseSafeInteger,
} from "../gameplay/contracts/values.js";
import {
  pocFacilitiesDependencyPortsSchemaV1,
  pocFacilitiesOwnerOperationSchemaV1,
} from "../gameplay/modules/facilities/contract.js";
import {
  createPocFacilitiesReadPortV1,
  pocFacilitiesGameplayModuleV1,
  pocFacilitiesOwnerV1,
} from "../gameplay/modules/facilities/module.js";
import {
  pocTavernDependencyPortsSchemaV1,
  pocTavernOwnerOperationSchemaV1,
  pocTavernOwnerProposalSchemaV1,
} from "../gameplay/modules/tavern/contract.js";
import {
  createPocTavernGameplayModuleV1,
  createPocTavernReadPortV1,
  pocTavernOwnerV1,
} from "../gameplay/modules/tavern/module.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

function requireProposedV1<TProposal>(
  result:
    | { readonly kind: "proposed"; readonly proposal: TProposal }
    | { readonly kind: "rejected"; readonly rejection: unknown },
): TProposal {
  if (result.kind !== "proposed") throw new TypeError("expected proposed owner operation");
  return result.proposal;
}

function tavernPlanDependenciesV1(
  overrides: {
    readonly day?: number;
    readonly phase?: "morning" | "afternoon" | "evening";
    readonly mode?: "manual" | "assisted" | "delegated" | "closed";
    readonly unavailableReasonId?: ReturnType<typeof parseReasonId> | null;
    readonly menuRecipeLimit?: number;
    readonly receptionCapacity?: number;
    readonly preparationCapacity?: number;
    readonly recipes?: readonly {
      readonly recipeId: ReturnType<typeof parseRecipeId>;
      readonly prepPoints: ReturnType<typeof parsePositiveSafeInteger>;
    }[];
  } = {},
) {
  return pocTavernDependencyPortsSchemaV1.parse({
    kind: "tavern.plan.set",
    day: parseDayIndex(overrides.day ?? 1),
    phase: overrides.phase ?? "morning",
    mode: overrides.mode ?? "manual",
    modeReasonId: parseReasonId("reason.fixture"),
    unavailableReasonId: overrides.unavailableReasonId ?? null,
    menuRecipeLimit: parsePositiveSafeInteger(overrides.menuRecipeLimit ?? 4),
    receptionCapacity: parseNonNegativeSafeInteger(overrides.receptionCapacity ?? 2),
    preparationCapacity: parseNonNegativeSafeInteger(overrides.preparationCapacity ?? 2),
    recipes: overrides.recipes ?? [
      {
        recipeId: parseRecipeId("recipe.fixture"),
        prepPoints: parsePositiveSafeInteger(1),
      },
    ],
  });
}

describe("PoC Facilities and Tavern ownership", () => {
  it("exports both owner modules through the Story gameplay barrel", async () => {
    const gameplay = await import("../gameplay/index.js");

    expect(gameplay.pocFacilitiesGameplayModuleV1).toBe(pocFacilitiesGameplayModuleV1);
    expect(gameplay.createPocTavernGameplayModuleV1).toBe(createPocTavernGameplayModuleV1);
  });

  it("keeps Facilities static and closes each Tavern factory over only its initial slice", () => {
    const fixture = createPocGameplayFixtureV1();
    const facilities = fixture.snapshot.state.simulation.facilities;
    const tavern = fixture.snapshot.state.simulation.tavern;
    const alternateTavern = {
      ...tavern,
      reputation: parseNonNegativeSafeInteger(1),
      helper: { unlocked: true, tier: "skilled" as const },
    };

    expect(pocFacilitiesGameplayModuleV1.createInitialState(fixture.bootstrap)).toEqual({
      built: [],
      decisions: [],
    });
    expect(createPocFacilitiesReadPortV1(facilities)).toEqual(facilities);
    const first = createPocTavernGameplayModuleV1(tavern);
    const second = createPocTavernGameplayModuleV1(alternateTavern);
    expect(first.createInitialState(fixture.bootstrap)).toEqual(tavern);
    expect(second.createInitialState(fixture.bootstrap)).toEqual(alternateTavern);
    expect(createPocTavernReadPortV1(tavern)).toEqual(tavern);
    expect(first.createInitialState(fixture.bootstrap)).not.toBe(tavern);
    expect(Object.isFrozen(first.createInitialState(fixture.bootstrap))).toBe(true);
  });

  it("commits one facility choice and never reopens the opportunity", () => {
    const state = createPocGameplayFixtureV1().snapshot.state.simulation.facilities;
    const operation = pocFacilitiesOwnerOperationSchemaV1.parse({
      kind: "facilities.choose",
      opportunityId: parseActionId("action.fixture_facility"),
      choice: { kind: "build", facilityId: parseFacilityId("facility.fixture_bed") },
    });
    const dependencies = pocFacilitiesDependencyPortsSchemaV1.parse({
      kind: "facilities.choose",
      commandSequence: parsePositiveSafeInteger(1),
      opportunity: {
        opportunityId: parseActionId("action.fixture_facility"),
        facilityIds: [parseFacilityId("facility.fixture"), parseFacilityId("facility.fixture_bed")],
        skipReasonId: parseReasonId("reason.fixture"),
      },
      facilityBuildReasonId: parseReasonId("reason.facility_build"),
    });
    const proposal = requireProposedV1(
      pocFacilitiesOwnerV1.propose(state, operation, dependencies),
    );
    const next = pocFacilitiesOwnerV1.apply(state, proposal);

    expect(next.built).toEqual([{ facilityId: "facility.fixture_bed", builtAtSequence: 1 }]);
    expect(next.decisions).toEqual([
      {
        opportunityId: "action.fixture_facility",
        decision: { kind: "built", facilityId: "facility.fixture_bed" },
      },
    ]);
    expect(proposal.facts).toEqual([
      {
        kind: "facility.choice_committed",
        opportunityId: "action.fixture_facility",
        choice: { kind: "built", facilityId: "facility.fixture_bed" },
        reason: {
          kind: "command",
          commandKind: "facility.choose",
          reasonId: "reason.facility_build",
        },
      },
    ]);
    expect(pocFacilitiesOwnerV1.propose(next, operation, dependencies)).toEqual({
      kind: "rejected",
      rejection: {
        code: "facility.choice_committed",
        details: {
          opportunityId: "action.fixture_facility",
          choice: { kind: "built", facilityId: "facility.fixture_bed" },
        },
      },
    });
    expect(pocFacilitiesGameplayModuleV1.descriptor.id).toBe("module.facilities");
    expect(() => pocFacilitiesOwnerV1.apply(next, proposal)).toThrow(/stale/u);
    expect(() =>
      pocFacilitiesOwnerOperationSchemaV1.parse({ ...operation, extra: true }),
    ).toThrow();
  });

  it("records skip provenance and rejects invalid or already-built targets", () => {
    const state = createPocGameplayFixtureV1().snapshot.state.simulation.facilities;
    const baseDependencies = {
      kind: "facilities.choose" as const,
      commandSequence: parsePositiveSafeInteger(2),
      opportunity: {
        opportunityId: parseActionId("action.fixture_facility"),
        facilityIds: [parseFacilityId("facility.fixture"), parseFacilityId("facility.fixture_bed")],
        skipReasonId: parseReasonId("reason.fixture"),
      },
      facilityBuildReasonId: parseReasonId("reason.fixture"),
    };
    const skipped = requireProposedV1(
      pocFacilitiesOwnerV1.propose(
        state,
        {
          kind: "facilities.choose",
          opportunityId: parseActionId("action.fixture_facility"),
          choice: { kind: "skip" },
        },
        baseDependencies,
      ),
    );
    expect(pocFacilitiesOwnerV1.apply(state, skipped)).toEqual({
      built: [],
      decisions: [{ opportunityId: "action.fixture_facility", decision: { kind: "skipped" } }],
    });
    expect(skipped.facts).toEqual([
      {
        kind: "facility.choice_committed",
        opportunityId: "action.fixture_facility",
        choice: { kind: "skipped" },
        reason: {
          kind: "command",
          commandKind: "facility.choose",
          reasonId: "reason.fixture",
        },
      },
    ]);

    expect(
      pocFacilitiesOwnerV1.propose(
        state,
        {
          kind: "facilities.choose",
          opportunityId: parseActionId("action.fixture_facility"),
          choice: { kind: "build", facilityId: parseFacilityId("facility.not_offered") },
        },
        baseDependencies,
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "facility.target_not_offered",
        details: {
          opportunityId: "action.fixture_facility",
          facilityId: "facility.not_offered",
        },
      },
    });

    const builtState = {
      built: [
        {
          facilityId: parseFacilityId("facility.fixture"),
          builtAtSequence: parsePositiveSafeInteger(1),
        },
      ],
      decisions: [
        {
          opportunityId: parseActionId("action.previous_facility"),
          decision: { kind: "built" as const, facilityId: parseFacilityId("facility.fixture") },
        },
      ],
    };
    expect(
      pocFacilitiesOwnerV1.propose(
        builtState,
        {
          kind: "facilities.choose",
          opportunityId: parseActionId("action.fixture_facility"),
          choice: { kind: "build", facilityId: parseFacilityId("facility.fixture") },
        },
        baseDependencies,
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "facility.already_built",
        details: { facilityId: "facility.fixture" },
      },
    });
  });

  it("updates only the Tavern-owned plan through a validated context", () => {
    const state = createPocGameplayFixtureV1().snapshot.state.simulation.tavern;
    const plan = {
      mode: "manual" as const,
      menu: [{ recipeId: parseRecipeId("recipe.fixture"), portions: parseQuantity(1) }],
    };
    const dependencies = tavernPlanDependenciesV1();
    const proposal = requireProposedV1(
      pocTavernOwnerV1.propose(
        state,
        {
          kind: "tavern.plan.set",
          plan,
          reason: {
            kind: "command",
            commandKind: "tavern.plan.set",
            reasonId: parseReasonId("reason.fixture"),
          },
        },
        dependencies,
      ),
    );
    const next = pocTavernOwnerV1.apply(state, proposal);

    expect(next.servicePlan).toEqual(plan);
    expect(next.currentDemand).toBe(state.currentDemand);
    expect(next.helper).toEqual(state.helper);
    expect(createPocTavernGameplayModuleV1(state).descriptor.id).toBe("module.tavern");
    expect(() => pocTavernOwnerV1.apply(next, proposal)).toThrow(/stale/u);
    expect(() =>
      pocTavernOwnerOperationSchemaV1.parse({
        kind: "tavern.plan.set",
        plan,
        reason: {
          kind: "command",
          commandKind: "tavern.plan.set",
          reasonId: parseReasonId("reason.fixture"),
        },
        extra: true,
      }),
    ).toThrow();
    expect(() =>
      pocTavernOwnerV1.propose(
        state,
        {
          kind: "tavern.plan.set",
          plan,
          reason: {
            kind: "command",
            commandKind: "tavern.plan.set",
            reasonId: parseReasonId("reason.fixture"),
          },
        },
        tavernPlanDependenciesV1({ day: 2 }),
      ),
    ).toThrow(/day|preparation/u);
  });

  it("saturates reputation and replaces helper state with exact Facts", () => {
    const state = createPocGameplayFixtureV1().snapshot.state.simulation.tavern;
    const reason = {
      kind: "story_action" as const,
      actionId: parseActionId("action.fixture_story"),
      reasonId: parseReasonId("reason.fixture"),
    };
    const reputation = requireProposedV1(
      pocTavernOwnerV1.propose(
        state,
        { kind: "tavern.reputation.adjust", delta: parseSafeInteger(-100), reason },
        pocTavernDependencyPortsSchemaV1.parse({ kind: "tavern.reputation.adjust" }),
      ),
    );
    expect(pocTavernOwnerV1.apply(state, reputation).reputation).toBe(0);
    expect(reputation.facts).toEqual([
      {
        kind: "reputation.changed",
        value: { before: 50, after: 0 },
        delta: -50,
        reason,
      },
    ]);

    const helper = requireProposedV1(
      pocTavernOwnerV1.propose(
        state,
        {
          kind: "tavern.helper.set",
          helper: { unlocked: true, tier: "skilled" },
          reason,
        },
        pocTavernDependencyPortsSchemaV1.parse({ kind: "tavern.helper.set" }),
      ),
    );
    expect(pocTavernOwnerV1.apply(state, helper).helper).toEqual({
      unlocked: true,
      tier: "skilled",
    });
    expect(helper.facts).toEqual([
      {
        kind: "tavern.helper_changed",
        value: {
          before: { unlocked: false, tier: "apprentice" },
          after: { unlocked: true, tier: "skilled" },
        },
        reason,
      },
    ]);
  });

  it("rejects frozen, unavailable, and structurally invalid Tavern plans in stable order", () => {
    const state = createPocGameplayFixtureV1().snapshot.state.simulation.tavern;
    const reason = {
      kind: "command" as const,
      commandKind: "tavern.plan.set" as const,
      reasonId: parseReasonId("reason.fixture"),
    };
    const validPlan = {
      mode: "manual" as const,
      menu: [{ recipeId: parseRecipeId("recipe.fixture"), portions: parseQuantity(1) }],
    };
    expect(
      pocTavernOwnerV1.propose(
        state,
        { kind: "tavern.plan.set", plan: validPlan, reason },
        tavernPlanDependenciesV1({ phase: "evening" }),
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "tavern.plan_frozen",
        details: { day: 1, phase: "evening" },
      },
    });
    expect(
      pocTavernOwnerV1.propose(
        state,
        { kind: "tavern.plan.set", plan: validPlan, reason },
        tavernPlanDependenciesV1({ unavailableReasonId: parseReasonId("reason.unavailable") }),
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "tavern.service_unavailable",
        details: { mode: "manual", reasonId: "reason.unavailable" },
      },
    });

    const secondRecipe = {
      recipeId: parseRecipeId("recipe.second"),
      prepPoints: parsePositiveSafeInteger(1),
    };
    const invalidCases = [
      {
        expected: "menu_size",
        plan: {
          mode: "manual" as const,
          menu: [
            { recipeId: parseRecipeId("recipe.fixture"), portions: parseQuantity(1) },
            { recipeId: parseRecipeId("recipe.second"), portions: parseQuantity(1) },
          ],
        },
        dependencies: tavernPlanDependenciesV1({
          menuRecipeLimit: 1,
          receptionCapacity: 4,
          preparationCapacity: 4,
          recipes: [
            {
              recipeId: parseRecipeId("recipe.fixture"),
              prepPoints: parsePositiveSafeInteger(1),
            },
            secondRecipe,
          ],
        }),
      },
      {
        expected: "closed_has_menu",
        plan: { mode: "closed" as const, menu: validPlan.menu },
        dependencies: tavernPlanDependenciesV1({ mode: "closed" }),
      },
      {
        expected: "open_has_no_menu",
        plan: { mode: "manual" as const, menu: [] },
        dependencies: tavernPlanDependenciesV1(),
      },
      {
        expected: "duplicate_recipe",
        plan: {
          mode: "manual" as const,
          menu: [
            { recipeId: parseRecipeId("recipe.fixture"), portions: parseQuantity(1) },
            { recipeId: parseRecipeId("recipe.fixture"), portions: parseQuantity(1) },
          ],
        },
        dependencies: tavernPlanDependenciesV1({
          receptionCapacity: 4,
          preparationCapacity: 4,
        }),
      },
      {
        expected: "unknown_recipe",
        plan: {
          mode: "manual" as const,
          menu: [{ recipeId: parseRecipeId("recipe.unknown"), portions: parseQuantity(1) }],
        },
        dependencies: tavernPlanDependenciesV1(),
      },
      {
        expected: "locked_recipe",
        plan: {
          mode: "manual" as const,
          menu: [{ recipeId: parseRecipeId("recipe.second"), portions: parseQuantity(1) }],
        },
        dependencies: tavernPlanDependenciesV1({ recipes: [secondRecipe] }),
      },
      {
        expected: "capacity",
        plan: {
          mode: "manual" as const,
          menu: [{ recipeId: parseRecipeId("recipe.fixture"), portions: parseQuantity(3) }],
        },
        dependencies: tavernPlanDependenciesV1(),
      },
      {
        expected: "preparation_capacity",
        plan: {
          mode: "manual" as const,
          menu: [{ recipeId: parseRecipeId("recipe.fixture"), portions: parseQuantity(2) }],
        },
        dependencies: tavernPlanDependenciesV1({
          receptionCapacity: 4,
          preparationCapacity: 2,
          recipes: [
            {
              recipeId: parseRecipeId("recipe.fixture"),
              prepPoints: parsePositiveSafeInteger(2),
            },
          ],
        }),
      },
    ] as const;

    for (const fixture of invalidCases) {
      expect(
        pocTavernOwnerV1.propose(
          state,
          { kind: "tavern.plan.set", plan: fixture.plan, reason },
          fixture.dependencies,
        ),
      ).toEqual({
        kind: "rejected",
        rejection: { code: "tavern.invalid_plan", details: { reason: fixture.expected } },
      });
    }
  });

  it("installs demand once and materializes only non-null current demand", () => {
    const state = createPocGameplayFixtureV1().snapshot.state.simulation.tavern;
    expect(() =>
      pocTavernOwnerV1.propose(
        state,
        { kind: "tavern.current_demand.set", currentDemand: null },
        pocTavernDependencyPortsSchemaV1.parse({ kind: "tavern.current_demand.set" }),
      ),
    ).toThrow(/demand|clear|materialized|transition/u);

    const demandSeeds = [
      {
        day: parseDayIndex(1),
        segments: [
          {
            segmentId: parseCustomerSegmentId("segment.fixture"),
            baseCustomers: parseNonNegativeSafeInteger(5),
            randomOffset: 0 as const,
          },
        ],
      },
    ];
    const seedsProposal = requireProposedV1(
      pocTavernOwnerV1.propose(
        state,
        { kind: "tavern.demand_seeds.set", demandSeeds },
        pocTavernDependencyPortsSchemaV1.parse({ kind: "tavern.demand_seeds.set" }),
      ),
    );
    const seeded = pocTavernOwnerV1.apply(state, seedsProposal);
    expect(seeded.demandSeeds).toEqual(demandSeeds);
    expect(seedsProposal.facts).toEqual([]);
    expect(() =>
      pocTavernOwnerProposalSchemaV1.parse({
        ...seedsProposal,
        payload: {
          ...seedsProposal.payload,
          after: { ...seedsProposal.payload.after, demandSeeds: [] },
        },
      }),
    ).toThrow(/demand.*seed|initialization|empty/u);
    expect(() =>
      pocTavernOwnerV1.propose(
        seeded,
        { kind: "tavern.demand_seeds.set", demandSeeds },
        pocTavernDependencyPortsSchemaV1.parse({ kind: "tavern.demand_seeds.set" }),
      ),
    ).toThrow(/demand.*seed|already|rewrite/u);

    const demand = {
      day: parseDayIndex(1),
      segments: [
        {
          segmentId: parseCustomerSegmentId("segment.fixture"),
          preview: { min: parseSafeInteger(4), max: parseSafeInteger(6) },
          actualCustomers: parseNonNegativeSafeInteger(5),
          modifiers: [],
        },
      ],
    };
    const materialized = requireProposedV1(
      pocTavernOwnerV1.propose(
        seeded,
        { kind: "tavern.current_demand.set", currentDemand: demand },
        pocTavernDependencyPortsSchemaV1.parse({ kind: "tavern.current_demand.set" }),
      ),
    );
    const withDemand = pocTavernOwnerV1.apply(seeded, materialized);
    expect(withDemand.currentDemand).toEqual(demand);
    expect(materialized.facts).toEqual([{ kind: "demand.materialized", demand }]);
    expect(() =>
      pocTavernOwnerProposalSchemaV1.parse({
        ...materialized,
        payload: { ...materialized.payload, before: withDemand, after: withDemand },
      }),
    ).toThrow(/demand|materialized|transition|rewrite/u);
    expect(() =>
      pocTavernOwnerV1.propose(
        withDemand,
        { kind: "tavern.current_demand.set", currentDemand: demand },
        pocTavernDependencyPortsSchemaV1.parse({ kind: "tavern.current_demand.set" }),
      ),
    ).toThrow(/demand|day|materialized|rewrite/u);

    const nextDay = requireProposedV1(
      pocTavernOwnerV1.propose(
        withDemand,
        { kind: "tavern.preparation.reset", day: parseDayIndex(2) },
        pocTavernDependencyPortsSchemaV1.parse({ kind: "tavern.preparation.reset" }),
      ),
    );
    const advanced = pocTavernOwnerV1.apply(withDemand, nextDay);

    const cleared = requireProposedV1(
      pocTavernOwnerV1.propose(
        advanced,
        { kind: "tavern.current_demand.set", currentDemand: null },
        pocTavernDependencyPortsSchemaV1.parse({ kind: "tavern.current_demand.set" }),
      ),
    );
    expect(pocTavernOwnerV1.apply(advanced, cleared).currentDemand).toBeNull();
    expect(cleared.facts).toEqual([]);
  });

  it("increments, limits, and resets daily preparation", () => {
    const state = createPocGameplayFixtureV1().snapshot.state.simulation.tavern;
    const dependencies = pocTavernDependencyPortsSchemaV1.parse({
      kind: "tavern.preparation.increment",
      dailyPreparationLimit: parsePositiveSafeInteger(1),
      prepareFoodReasonId: parseReasonId("reason.fixture"),
    });
    const incremented = requireProposedV1(
      pocTavernOwnerV1.propose(
        state,
        { kind: "tavern.preparation.increment", day: parseDayIndex(1) },
        dependencies,
      ),
    );
    const prepared = pocTavernOwnerV1.apply(state, incremented);
    expect(prepared.preparation).toEqual({ day: 1, actionCount: 1 });
    expect(incremented.facts).toEqual([
      {
        kind: "food.prepared",
        day: 1,
        actionCount: 1,
        reason: {
          kind: "command",
          commandKind: "actor.prepare_food",
          reasonId: "reason.fixture",
        },
      },
    ]);
    expect(
      pocTavernOwnerV1.propose(
        prepared,
        { kind: "tavern.preparation.increment", day: parseDayIndex(1) },
        dependencies,
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "tavern.preparation_limit_reached",
        details: { current: 1, limit: 1 },
      },
    });
    expect(() =>
      pocTavernOwnerV1.propose(
        prepared,
        { kind: "tavern.preparation.reset", day: parseDayIndex(1) },
        pocTavernDependencyPortsSchemaV1.parse({ kind: "tavern.preparation.reset" }),
      ),
    ).toThrow(/preparation|day|future|advance/u);
    expect(() =>
      pocTavernOwnerV1.propose(
        prepared,
        { kind: "tavern.preparation.reset", day: parseDayIndex(3) },
        pocTavernDependencyPortsSchemaV1.parse({ kind: "tavern.preparation.reset" }),
      ),
    ).toThrow(/preparation|day|next|advance/u);

    const withPlan = {
      ...prepared,
      servicePlan: {
        mode: "manual" as const,
        menu: [{ recipeId: parseRecipeId("recipe.fixture"), portions: parseQuantity(1) }],
      },
    };
    const reset = requireProposedV1(
      pocTavernOwnerV1.propose(
        withPlan,
        { kind: "tavern.preparation.reset", day: parseDayIndex(2) },
        pocTavernDependencyPortsSchemaV1.parse({ kind: "tavern.preparation.reset" }),
      ),
    );
    expect(() =>
      pocTavernOwnerProposalSchemaV1.parse({
        ...reset,
        payload: {
          ...reset.payload,
          after: {
            ...reset.payload.after,
            preparation: { day: parseDayIndex(1), actionCount: parseNonNegativeSafeInteger(0) },
          },
        },
      }),
    ).toThrow(/preparation|reset|future|day/u);
    const resetState = pocTavernOwnerV1.apply(withPlan, reset);
    expect(resetState.preparation).toEqual({
      day: 2,
      actionCount: 0,
    });
    expect(resetState.servicePlan).toBeNull();
    expect(reset.facts).toEqual([]);
  });

  it("appends closure history once and emits its exact closure Fact", () => {
    const state = {
      ...createPocGameplayFixtureV1().snapshot.state.simulation.tavern,
      servicePlan: { mode: "closed" as const, menu: [] },
    };
    const history = {
      kind: "closure" as const,
      closure: {
        day: parseDayIndex(1),
        kind: "planned" as const,
        reasonId: parseReasonId("reason.fixture"),
        reputation: {
          before: parseNonNegativeSafeInteger(50),
          after: parseNonNegativeSafeInteger(50),
        },
      },
    };
    const dependencies = pocTavernDependencyPortsSchemaV1.parse({
      kind: "tavern.service_history.append",
    });
    expect(() =>
      pocTavernOwnerV1.propose(
        state,
        {
          kind: "tavern.service_history.append",
          history: {
            kind: "closure",
            closure: {
              day: parseDayIndex(1),
              kind: "emergency",
              reasonId: parseReasonId("reason.fixture"),
              reputation: {
                before: parseNonNegativeSafeInteger(51),
                after: parseNonNegativeSafeInteger(50),
              },
            },
          },
        },
        dependencies,
      ),
    ).toThrow(/emergency|closed|planned/u);
    const proposal = requireProposedV1(
      pocTavernOwnerV1.propose(
        state,
        { kind: "tavern.service_history.append", history },
        dependencies,
      ),
    );
    const next = pocTavernOwnerV1.apply(state, proposal);
    expect(next.serviceHistory).toEqual([history]);
    expect(next.servicePlan).toEqual({ mode: "closed", menu: [] });
    expect(proposal.facts).toEqual([{ kind: "tavern.planned_closed", closure: history.closure }]);
    expect(() =>
      pocTavernOwnerV1.propose(
        next,
        { kind: "tavern.service_history.append", history },
        dependencies,
      ),
    ).toThrow(/history|day|append/u);

    const futureHistory = {
      kind: "closure" as const,
      closure: { ...history.closure, day: parseDayIndex(2) },
    };
    expect(() =>
      pocTavernOwnerProposalSchemaV1.parse({
        ...proposal,
        payload: {
          ...proposal.payload,
          after: { ...proposal.payload.after, serviceHistory: [futureHistory] },
        },
        facts: [{ kind: "tavern.planned_closed", closure: futureHistory.closure }],
      }),
    ).toThrow(/history|day|preparation|invariant/u);

    const mismatchedReputationHistory = {
      kind: "closure" as const,
      closure: {
        ...history.closure,
        reputation: {
          before: parseNonNegativeSafeInteger(49),
          after: parseNonNegativeSafeInteger(49),
        },
      },
    };
    expect(() =>
      pocTavernOwnerProposalSchemaV1.parse({
        ...proposal,
        payload: {
          ...proposal.payload,
          after: {
            ...proposal.payload.after,
            serviceHistory: [mismatchedReputationHistory],
          },
        },
        facts: [
          {
            kind: "tavern.planned_closed",
            closure: mismatchedReputationHistory.closure,
          },
        ],
      }),
    ).toThrow(/history|reputation|Tavern/u);
  });

  it("forces an emergency closure plan while appending its causal history", () => {
    const state = {
      ...createPocGameplayFixtureV1().snapshot.state.simulation.tavern,
      reputation: parseNonNegativeSafeInteger(49),
      servicePlan: {
        mode: "manual" as const,
        menu: [{ recipeId: parseRecipeId("recipe.fixture"), portions: parseQuantity(1) }],
      },
    };
    const history = {
      kind: "closure" as const,
      closure: {
        day: parseDayIndex(1),
        kind: "emergency" as const,
        reasonId: parseReasonId("reason.fixture"),
        reputation: {
          before: parseNonNegativeSafeInteger(50),
          after: parseNonNegativeSafeInteger(49),
        },
      },
    };
    const proposal = requireProposedV1(
      pocTavernOwnerV1.propose(
        state,
        { kind: "tavern.service_history.append", history },
        pocTavernDependencyPortsSchemaV1.parse({
          kind: "tavern.service_history.append",
        }),
      ),
    );
    const next = pocTavernOwnerV1.apply(state, proposal);

    expect(next.servicePlan).toEqual({ mode: "closed", menu: [] });
    expect(next.serviceHistory).toEqual([history]);
    expect(proposal.facts).toEqual([{ kind: "tavern.emergency_closed", closure: history.closure }]);
  });
});
