// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { pocEndingDefinitionsV1 } from "../content/checks-endings.js";
import { actionIdsV1, outcomeIdsV1, pocTextIdsV1 } from "../content/ids.js";
import { pocSimulationDataV1 } from "../content/story-data.js";
import {
  createPocGameQueriesV1,
  createPocGameSimulationV1,
  createPocRulesV1,
  deepFreezePocValueV1,
  parseAbsoluteDayIndex,
  parseBatchId,
  parseDayIndex,
  parseMoney,
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
  parseQuantity,
  parseRunId,
  pocGameStateSchemaV1,
  type EndingInputV1,
} from "../gameplay/index.js";

const productionProgramV1 = Object.freeze({
  data: pocSimulationDataV1,
  rules: createPocRulesV1(pocSimulationDataV1),
});

const productionBaseStateV1 = createPocGameSimulationV1(productionProgramV1).createInitialState({
  rngSeed: parseNonZeroUint32(0x0002_3049),
  runId: parseRunId("00000000-0000-4000-8000-000000000406"),
});

interface ForecastOptionsV1 {
  readonly day: number;
  readonly phase?: "morning" | "afternoon" | "evening";
  readonly cash?: number;
  readonly committedPlan?: boolean;
  readonly allServiceDaysResolved?: boolean;
}

function createForecastHarnessV1(options: ForecastOptionsV1) {
  const data = pocSimulationDataV1;
  const day = parseDayIndex(options.day);
  const phase = options.phase ?? "morning";
  const cash = parseMoney(options.cash ?? 70);
  const policy = data.balance.lifePolicies[0];
  const recipe = data.content.recipes[0];
  if (policy === undefined || recipe === undefined) {
    throw new TypeError("PoC forecast fixture requires policy and recipe data");
  }
  const plan = deepFreezePocValueV1({
    mode: "manual" as const,
    menu: [{ recipeId: recipe.recipeId, portions: parseQuantity(1) }],
  });
  const demandSeeds = data.balance.serviceDays.map((serviceDay) => ({
    day: serviceDay,
    segments: data.balance.baseDemand
      .filter((line) => line.day === serviceDay)
      .map(({ segmentId, customers }) => ({
        segmentId,
        baseCustomers: customers,
        randomOffset: 0 as const,
      })),
  }));
  const currentDemandLines = data.balance.baseDemand.filter((line) => line.day === day);
  const resolvedDays =
    options.allServiceDaysResolved === true
      ? data.balance.serviceDays
      : options.committedPlan === true
        ? data.balance.serviceDays.filter((serviceDay) => serviceDay < day)
        : [];
  const ingredientBatches =
    options.committedPlan === true
      ? recipe.ingredients.map((line, index) => ({
          batchId: parseBatchId(`batch:1:${String(index)}`),
          ingredientId: line.ingredientId,
          quantity: line.quantity,
          acquiredDay: day,
          lastUsableDay: parseAbsoluteDayIndex(day),
          refrigerationExtended: false,
          source: {
            kind: "purchase" as const,
            commandSequence: parsePositiveSafeInteger(1),
          },
        }))
      : [];
  const state = pocGameStateSchemaV1.parse({
    simulation: {
      ...productionBaseStateV1.simulation,
      run: { ...productionBaseStateV1.simulation.run, status: "active" },
      calendar: {
        day,
        phase,
        lifePolicyId: policy.policyId,
        apRemaining: policy.apByPhase[phase],
        eveningResolved: false,
      },
      inventory: {
        ...productionBaseStateV1.simulation.inventory,
        startingCash: cash,
        cash,
        ingredientBatches,
        ledger: [],
      },
      tavern: {
        ...productionBaseStateV1.simulation.tavern,
        preparation: { day, actionCount: parseNonNegativeSafeInteger(0) },
        servicePlan: options.committedPlan === true ? plan : null,
        demandSeeds,
        currentDemand:
          currentDemandLines.length === 0
            ? null
            : {
                day,
                segments: currentDemandLines.map(({ segmentId, customers }) => ({
                  segmentId,
                  preview: { min: customers, max: customers },
                  actualCustomers: customers,
                  modifiers: [],
                })),
              },
        serviceHistory: resolvedDays.map((serviceDay) => ({
          kind: "closure" as const,
          closure: {
            day: serviceDay,
            kind: "planned" as const,
            reasonId: data.balance.plannedClosureReasonId,
            reputation: {
              before: data.initialState.reputation,
              after: data.initialState.reputation,
            },
          },
        })),
      },
      activeWorkflow: null,
    },
    story: productionBaseStateV1.story,
  });
  return Object.freeze({
    plan,
    state,
    queries: createPocGameQueriesV1(state, productionProgramV1),
  });
}

interface EndingOptionsV1 {
  readonly levyKind: "paid" | "arrears";
  readonly cash: number;
  readonly reputation?: number;
  readonly builtFacility?: boolean;
}

function createEndingInputV1(options: EndingOptionsV1): EndingInputV1 {
  const cash = parseMoney(options.cash);
  const levyAmount = pocSimulationDataV1.balance.levyAmount;
  const facility = pocSimulationDataV1.content.facilities[0];
  if (facility === undefined) throw new TypeError("missing PoC Facility");
  return deepFreezePocValueV1<EndingInputV1>({
    cash,
    levy:
      options.levyKind === "paid"
        ? {
            kind: "paid",
            levyAmount,
            cash: { before: parseMoney(cash + levyAmount), after: cash },
          }
        : {
            kind: "arrears",
            levyAmount,
            availableCash: cash,
            shortfall: parseMoney(levyAmount - cash),
          },
    reputation: parseNonNegativeSafeInteger(options.reputation ?? 50),
    facilityIds: options.builtFacility === false ? [] : [facility.facilityId],
    relationship: productionBaseStateV1.simulation.actors.relationship,
    facts: productionBaseStateV1.story.facts,
    quests: productionBaseStateV1.story.quests,
    outcomes: productionBaseStateV1.story.outcomes,
    auras: productionBaseStateV1.simulation.status.auras,
  });
}

describe("PoC obligation forecast and endings", () => {
  it("uses current, committed-plan, and final forecast bases", () => {
    expect(createForecastHarnessV1({ day: 2 }).queries.getObligationForecast()).toBeNull();
    expect(createForecastHarnessV1({ day: 4 }).queries.getObligationForecast()).toEqual({
      kind: "current_gap",
      currentCash: 70,
      levyAmount: 140,
      currentGap: 70,
      reasonId: "reason.obligation.levy_forecast",
      recommendations: [
        {
          textId: pocTextIdsV1.obligationRecommendationPersonalService,
          actionId: actionIdsV1[4],
        },
        { textId: pocTextIdsV1.obligationRecommendationCheapMenu, actionId: null },
        { textId: pocTextIdsV1.obligationRecommendationAvoidOverbuying, actionId: null },
      ],
    });

    expect(
      createForecastHarnessV1({ day: 5, committedPlan: true }).queries.getObligationForecast(),
    ).toMatchObject({ kind: "current_gap" });

    const committed = createForecastHarnessV1({
      day: 5,
      phase: "evening",
      committedPlan: true,
    });
    const preview = committed.queries.previewTavernPlan(committed.plan);
    expect(preview).toMatchObject({ allowed: true, cashDelta: { min: 3, max: 3 } });
    expect(committed.queries.getObligationForecast()).toEqual({
      kind: "committed_plan_conservative",
      currentCash: 70,
      levyAmount: 140,
      currentGap: 70,
      reasonId: "reason.obligation.levy_forecast",
      projectedCashAfterOpening: { min: 73, max: 73 },
      projectedCashAfterLevy: { min: -67, max: -67 },
      recommendations: [
        { textId: pocTextIdsV1.obligationRecommendationCommittedPlanReview, actionId: null },
      ],
    });
    if (!preview.allowed) throw new TypeError("committed Tavern preview must be allowed");
    expect(committed.queries.getObligationForecast()).toMatchObject({
      projectedCashAfterOpening: {
        min: 70 + preview.cashDelta.min,
        max: 70 + preview.cashDelta.max,
      },
      projectedCashAfterLevy: {
        min: 70 + preview.cashDelta.min - 140,
        max: 70 + preview.cashDelta.max - 140,
      },
    });

    expect(
      createForecastHarnessV1({
        day: 7,
        allServiceDaysResolved: true,
      }).queries.getObligationForecast(),
    ).toEqual({
      kind: "final",
      currentCash: 70,
      levyAmount: 140,
      currentGap: 70,
      reasonId: "reason.obligation.levy_forecast",
      projectedCashAfterLevy: -70,
      recommendations: [
        { textId: pocTextIdsV1.obligationRecommendationReplayLedger, actionId: null },
      ],
    });
  });

  it("nulls unavailable recommendation actions and suppresses advice when no gap remains", () => {
    expect(
      createForecastHarnessV1({ day: 4, phase: "evening" }).queries.getObligationForecast(),
    ).toMatchObject({
      kind: "current_gap",
      recommendations: [
        { textId: pocTextIdsV1.obligationRecommendationPersonalService, actionId: null },
        { textId: pocTextIdsV1.obligationRecommendationCheapMenu, actionId: null },
        { textId: pocTextIdsV1.obligationRecommendationAvoidOverbuying, actionId: null },
      ],
    });
    expect(
      createForecastHarnessV1({ day: 4, cash: 140 }).queries.getObligationForecast(),
    ).toMatchObject({ kind: "current_gap", currentGap: 0, recommendations: [] });
    expect(
      createForecastHarnessV1({
        day: 7,
        cash: 140,
        allServiceDaysResolved: true,
      }).queries.getObligationForecast(),
    ).toMatchObject({
      kind: "final",
      currentGap: 0,
      projectedCashAfterLevy: 0,
      recommendations: [],
    });
  });

  it("binds each terminal status to one authored ending and common summary outcomes", () => {
    expect(pocEndingDefinitionsV1).toEqual([
      {
        endingId: "ending.stable",
        status: "completed_stable",
        nameTextId: pocTextIdsV1.endingStableName,
        summaryOutcomeIds: {
          relationship: outcomeIdsV1[0],
          investigation: outcomeIdsV1[1],
        },
        effects: [],
      },
      {
        endingId: "ending.danger",
        status: "completed_danger",
        nameTextId: pocTextIdsV1.endingDangerName,
        summaryOutcomeIds: {
          relationship: outcomeIdsV1[0],
          investigation: outcomeIdsV1[1],
        },
        effects: [],
      },
      {
        endingId: "ending.failed_arrears",
        status: "failed_arrears",
        nameTextId: pocTextIdsV1.endingFailedArrearsName,
        summaryOutcomeIds: {
          relationship: outcomeIdsV1[0],
          investigation: outcomeIdsV1[1],
        },
        effects: [],
      },
    ]);
  });

  it.each([
    [
      createEndingInputV1({ levyKind: "paid", cash: 20 }),
      "ending.stable",
      "completed_stable",
      ["reason.ending.stable"],
    ],
    [
      createEndingInputV1({ levyKind: "paid", cash: 19 }),
      "ending.danger",
      "completed_danger",
      ["reason.ending.danger"],
    ],
    [
      createEndingInputV1({ levyKind: "arrears", cash: 139 }),
      "ending.failed_arrears",
      "failed_arrears",
      ["reason.ending.arrears"],
    ],
  ] as const)("maps an ending vector to %s", (input, endingId, status, reasonIds) => {
    const before = structuredClone(input);
    const result = productionProgramV1.rules.endings.evaluate(input);
    expect(result).toEqual({
      endingId,
      status,
      reasonIds,
      effects: [],
      summary: {
        relationship: {
          outcomeId: "outcome.relationship_opportunity",
          value: { kind: "token", value: "relationship.pending" },
        },
        investigation: {
          outcomeId: "outcome.investigation",
          value: { kind: "token", value: "investigation.not_attempted" },
        },
      },
    });
    expect(input).toEqual(before);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result).not.toHaveProperty("then");
  });

  it("applies all stable thresholds and the reputation-crisis boundary", () => {
    const evaluate = productionProgramV1.rules.endings.evaluate;
    expect(
      [
        createEndingInputV1({ levyKind: "paid", cash: 19 }),
        createEndingInputV1({ levyKind: "paid", cash: 20, reputation: 49 }),
        createEndingInputV1({ levyKind: "paid", cash: 20, builtFacility: false }),
      ].map((input) => evaluate(input).status),
    ).toEqual(["completed_danger", "completed_danger", "completed_danger"]);
    expect(
      evaluate(createEndingInputV1({ levyKind: "paid", cash: 19, reputation: 45 })).reasonIds,
    ).toEqual(["reason.ending.danger"]);
    expect(
      evaluate(createEndingInputV1({ levyKind: "paid", cash: 19, reputation: 44 })).reasonIds,
    ).toEqual(["reason.ending.danger", "reason.ending.reputation_crisis"]);

    const arrears = createEndingInputV1({ levyKind: "arrears", cash: 139 });
    const before = structuredClone(arrears);
    expect(arrears.levy).toEqual({
      kind: "arrears",
      levyAmount: 140,
      availableCash: 139,
      shortfall: 1,
    });
    expect(evaluate(arrears).status).toBe("failed_arrears");
    expect(arrears).toEqual(before);

    const invalidInput = {
      ...createEndingInputV1({ levyKind: "paid", cash: 20 }),
      cash: Number.NaN,
    } as unknown as EndingInputV1;
    expect(() => evaluate(invalidInput)).toThrow();
  });
});
