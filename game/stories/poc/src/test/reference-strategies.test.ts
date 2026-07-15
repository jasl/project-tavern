// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { canonicalJsonBytes } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import type { PocSemanticInvocationV1 } from "../presentation/semantic-actions.js";
import {
  compilePocReferenceStrategyV1,
  selectPocReferencePlanV1,
} from "../testing/compile-reference-strategy.js";
import {
  pocReferenceStrategyDefinitionsV1,
  type PocReferencePlanDecisionV1,
  type PocReferenceStrategyIdV1,
} from "../testing/reference-strategy-definitions.js";
import {
  readPocCommandFixtureV1,
  runPocReferenceStrategyV1,
} from "../testing/run-reference-strategy.js";

type PocReferencePlanObservationV1 = Parameters<typeof selectPocReferencePlanV1>[1];

const sparseNoClueObservationV1 = Object.freeze({
  warClue: false,
  cash: 0,
  stamina: 0,
  inventory: Object.freeze([]),
  demand: Object.freeze([]),
  checkBand: null,
  rejectionDiagnostics: Object.freeze([]),
}) satisfies PocReferencePlanObservationV1;

const noisyNoClueObservationV1 = Object.freeze({
  warClue: false,
  cash: 999,
  stamina: 10,
  inventory: Object.freeze([
    Object.freeze({ ingredientId: "ingredient.fresh_meat", quantity: 99, lastUsableDay: 7 }),
  ]),
  demand: Object.freeze([Object.freeze({ segmentId: "segment.travelers", count: 99 })]),
  checkBand: "band.investigation.exceptional",
  rejectionDiagnostics: Object.freeze([
    Object.freeze({ code: "inventory.insufficient_cash", available: 0, required: 999 }),
  ]),
}) satisfies PocReferencePlanObservationV1;

const sparseClueObservationV1 = Object.freeze({
  ...sparseNoClueObservationV1,
  warClue: true,
}) satisfies PocReferencePlanObservationV1;

const noisyClueObservationV1 = Object.freeze({
  ...noisyNoClueObservationV1,
  warClue: true,
}) satisfies PocReferencePlanObservationV1;

function requireDaySixDecisionV1(strategyId: PocReferenceStrategyIdV1): PocReferencePlanDecisionV1 {
  const definition = pocReferenceStrategyDefinitionsV1[strategyId];
  const daySix = definition.days.find(({ day }) => day === 6);
  if (daySix === undefined) throw new TypeError(`${strategyId} is missing D6`);
  return daySix.plan;
}

function planInvocationV1(
  decision: PocReferencePlanDecisionV1,
  observation: PocReferencePlanObservationV1,
): Extract<PocSemanticInvocationV1, { readonly actionId: "action.service_plan" }> {
  return Object.freeze({
    kind: "invoke",
    actionId: "action.service_plan",
    options: Object.freeze({ plan: selectPocReferencePlanV1(decision, observation) }),
  });
}

describe("PoC reference strategy command fixtures", () => {
  for (const definition of Object.values(pocReferenceStrategyDefinitionsV1)) {
    it(`${definition.strategyId} matches its reviewed semantic fixture`, async () => {
      const compiled = await compilePocReferenceStrategyV1(definition);
      const stored = await readPocCommandFixtureV1(definition.strategyId);
      const replayed = await runPocReferenceStrategyV1(stored);

      expect(canonicalJsonBytes(compiled.fixture)).toEqual(canonicalJsonBytes(stored));
      expect(stored.entries.map(({ order }) => order)).toEqual(
        stored.entries.map((_, index) => index),
      );
      expect(stored.entries.every((entry) => entry.commandSequence >= 0)).toBe(true);
      expect(compiled.results.every((result) => result.kind === "committed")).toBe(true);
      expect(compiled.finalView.status).toBe("terminal");
      expect(compiled.finalSnapshot.integrity.mode).toBe("normal");
      expect(canonicalJsonBytes(replayed.results)).toEqual(canonicalJsonBytes(compiled.results));
      expect(canonicalJsonBytes(replayed.finalView)).toEqual(
        canonicalJsonBytes(compiled.finalView),
      );
      expect(canonicalJsonBytes(replayed.finalSnapshot)).toEqual(
        canonicalJsonBytes(compiled.finalSnapshot),
      );
    }, 15_000);
  }
});

describe("PoC reference strategy closed plan decisions", () => {
  it("keeps a fixed plan byte-identical across every observed field", () => {
    const decision = requireDaySixDecisionV1("strategy.cash_first");
    expect(decision.kind).toBe("fixed");
    if (decision.kind !== "fixed") throw new TypeError("cash-first D6 plan must be fixed");

    const sparse = planInvocationV1(decision, sparseNoClueObservationV1);
    const noisy = planInvocationV1(decision, noisyClueObservationV1);

    expect(canonicalJsonBytes(sparse)).toEqual(canonicalJsonBytes(noisy));
    expect(sparse.options.plan).toEqual(decision.plan);
  });

  it.each(["strategy.investigation_first", "strategy.full_delegation"] as const)(
    "%s selects its D6 plan only from the committed war clue",
    (strategyId) => {
      const decision = requireDaySixDecisionV1(strategyId);
      expect(decision.kind).toBe("select_d6_plan_from_war_clue");
      if (decision.kind !== "select_d6_plan_from_war_clue") {
        throw new TypeError(`${strategyId} D6 plan must use the closed war-clue decision`);
      }

      const sparseNoClue = planInvocationV1(decision, sparseNoClueObservationV1);
      const noisyNoClue = planInvocationV1(decision, noisyNoClueObservationV1);
      const sparseClue = planInvocationV1(decision, sparseClueObservationV1);
      const noisyClue = planInvocationV1(decision, noisyClueObservationV1);

      expect(canonicalJsonBytes(sparseNoClue)).toEqual(canonicalJsonBytes(noisyNoClue));
      expect(canonicalJsonBytes(sparseClue)).toEqual(canonicalJsonBytes(noisyClue));
      expect(sparseNoClue.options.plan).toEqual(decision.noCluePlan);
      expect(sparseClue.options.plan).toEqual(decision.cluePlan);
      expect(canonicalJsonBytes(sparseNoClue)).not.toEqual(canonicalJsonBytes(sparseClue));
    },
  );

  it("rejects every undeclared state-dependent decision", () => {
    expect(() =>
      Reflect.apply(selectPocReferencePlanV1, undefined, [
        Object.freeze({ kind: "cash_below_levy" }),
        sparseNoClueObservationV1,
      ]),
    ).toThrow(/closed decision/u);
  });
});
