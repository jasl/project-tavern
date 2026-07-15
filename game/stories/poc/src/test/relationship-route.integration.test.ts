// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { describe, expect, it } from "vitest";

import type { PocSemanticActionDescriptorV1, PocSemanticInvocationV1 } from "../index.js";
import { parseQuantity } from "../gameplay/index.js";
import {
  createPocStoryHarnessV1,
  fixedPocBootstrapV1,
  type PocStoryHarnessV1,
} from "../testing/poc-story-harness.js";

type SemanticActionIdV1 = PocSemanticInvocationV1["actionId"];

function requireActionV1<TActionId extends SemanticActionIdV1>(
  harness: PocStoryHarnessV1,
  actionId: TActionId,
): Extract<PocSemanticActionDescriptorV1, { readonly actionId: TActionId }> {
  const action = harness.semantic
    .availableActions()
    .find((candidate) => candidate.actionId === actionId);
  if (action === undefined) throw new TypeError(`missing Semantic action ${actionId}`);
  expect(action.enabled, `${actionId} must be enabled`).toBe(true);
  return action as Extract<PocSemanticActionDescriptorV1, { readonly actionId: TActionId }>;
}

async function dispatchDirectV1(
  harness: PocStoryHarnessV1,
  actionId: SemanticActionIdV1,
): Promise<void> {
  const action = requireActionV1(harness, actionId);
  if (action.delivery !== "direct") throw new TypeError(`${actionId} is not a direct action`);
  await expect(harness.semantic.preview(action.directInvocation)).resolves.toMatchObject({
    allowed: true,
  });
  await expect(harness.semantic.dispatch(action.directInvocation)).resolves.toEqual({
    kind: "committed",
  });
}

async function dispatchChoiceV1(
  harness: PocStoryHarnessV1,
  actionId: SemanticActionIdV1,
  optionId: string,
): Promise<void> {
  const action = requireActionV1(harness, actionId);
  if (action.delivery !== "choices") throw new TypeError(`${actionId} is not a choice action`);
  const option = action.options.find((candidate) => candidate.optionId === optionId);
  if (option === undefined) throw new TypeError(`missing ${actionId} option ${optionId}`);
  await expect(harness.semantic.preview(option.invocation)).resolves.toMatchObject({
    allowed: true,
  });
  await expect(harness.semantic.dispatch(option.invocation)).resolves.toEqual({
    kind: "committed",
  });
}

async function dispatchPurchaseV1(
  harness: PocStoryHarnessV1,
  requested: readonly { readonly ingredientId: string; readonly quantity: number }[],
): Promise<void> {
  const action = requireActionV1(harness, "action.purchase");
  if (action.delivery !== "form" || action.form.kind !== "purchase") {
    throw new TypeError("purchase must use the purchase form");
  }
  const lines = requested.map((request) => {
    const ingredient = action.form.input.ingredients.find(
      ({ ingredientId }) => ingredientId === request.ingredientId,
    );
    if (ingredient === undefined) throw new TypeError(`missing Ingredient ${request.ingredientId}`);
    return Object.freeze({
      ingredientId: ingredient.ingredientId,
      quantity: parseQuantity(request.quantity),
    });
  });
  const invocation: Extract<PocSemanticInvocationV1, { readonly actionId: "action.purchase" }> =
    Object.freeze({
      kind: "invoke",
      actionId: "action.purchase",
      options: Object.freeze({ lines: Object.freeze(lines) }),
    });
  await expect(harness.semantic.preview(invocation)).resolves.toMatchObject({ allowed: true });
  const result = await harness.semantic.dispatch(invocation);
  expect(result, JSON.stringify(harness.executedAttempts().at(-1)?.outcome)).toEqual({
    kind: "committed",
  });
}

async function dispatchClosedPlanV1(harness: PocStoryHarnessV1): Promise<void> {
  const action = requireActionV1(harness, "action.service_plan");
  if (action.delivery !== "form" || action.form.kind !== "tavern_plan") {
    throw new TypeError("service plan must use the Tavern-plan form");
  }
  const invocation: Extract<PocSemanticInvocationV1, { readonly actionId: "action.service_plan" }> =
    Object.freeze({
      kind: "invoke",
      actionId: "action.service_plan",
      options: Object.freeze({ plan: Object.freeze({ mode: "closed", menu: Object.freeze([]) }) }),
    });
  await expect(harness.semantic.preview(invocation)).resolves.toMatchObject({ allowed: true });
  await expect(harness.semantic.dispatch(invocation)).resolves.toEqual({ kind: "committed" });
}

async function drainNarrativeV1(
  harness: PocStoryHarnessV1,
  choices: Readonly<Record<string, string>> = {},
): Promise<void> {
  for (let count = 0; harness.semantic.observe().narrative !== null; count += 1) {
    if (count >= 32) throw new RangeError("Narrative did not settle within 32 semantic commands");
    const narrative = harness.semantic.observe().narrative;
    if (narrative === null) return;
    const sceneId = narrative.cursor?.sceneId;
    if (narrative.choices.length > 0) {
      if (sceneId === undefined) throw new TypeError("choice Narrative has no SceneId");
      const choiceId = choices[sceneId];
      if (choiceId === undefined) throw new TypeError(`missing planned choice for ${sceneId}`);
      await dispatchChoiceV1(harness, "action.narrative_choose", choiceId);
    } else {
      await dispatchDirectV1(harness, "action.narrative_advance");
    }
  }
}

async function advanceV1(
  harness: PocStoryHarnessV1,
  choices: Readonly<Record<string, string>> = {},
): Promise<void> {
  await dispatchDirectV1(harness, "action.advance_phase");
  await drainNarrativeV1(harness, choices);
}

function outcomeTokenV1(harness: PocStoryHarnessV1, outcomeId: string): string | null {
  const outcome = harness
    .snapshotForTest()
    .state.story.outcomes.find((candidate) => candidate.outcomeId === outcomeId);
  return outcome?.value.kind === "token" ? outcome.value.value : null;
}

describe("PoC relationship route through SemanticGamePort", () => {
  it("runs D1-D7 start, policy, actions, invoice, facility, conflict, apology, and levy", async () => {
    const harness = createPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });

    await dispatchDirectV1(harness, "action.run_start");
    await drainNarrativeV1(harness);
    await dispatchChoiceV1(harness, "action.choose_life_policy", "policy.balanced");

    await dispatchPurchaseV1(harness, [{ ingredientId: "ingredient.coarse_grain", quantity: 1 }]);
    await dispatchDirectV1(harness, "action.prepare_food");
    await advanceV1(harness);
    await dispatchDirectV1(harness, "action.rest");
    await advanceV1(harness);
    await advanceV1(harness, {
      "scene.supplier_invoice": "choice.supplier_invoice.intellect_b",
    });

    expect(harness.snapshotForTest().state.simulation.calendar).toMatchObject({
      day: 2,
      phase: "morning",
    });
    expect(harness.snapshotForTest().state.story.facts).toContainEqual({
      factId: "fact.invoice_checked_this_week",
      value: { kind: "boolean", value: true },
    });

    for (const day of [2, 3] as const) {
      await advanceV1(harness);
      if (day >= 3) await dispatchClosedPlanV1(harness);
      await advanceV1(harness);
      await advanceV1(harness, day === 3 ? {} : undefined);
    }

    expect(harness.snapshotForTest().state.simulation.calendar).toMatchObject({
      day: 4,
      phase: "morning",
    });
    await dispatchChoiceV1(harness, "action.facility_window", "skip");
    expect(harness.snapshotForTest().state.simulation.facilities.decisions).toContainEqual(
      expect.objectContaining({
        opportunityId: "action.facility_window",
        decision: { kind: "skipped" },
      }),
    );
    await advanceV1(harness);
    await dispatchClosedPlanV1(harness);
    await advanceV1(harness);
    await advanceV1(harness);

    expect(harness.snapshotForTest().state.simulation.calendar).toMatchObject({
      day: 5,
      phase: "morning",
    });
    await advanceV1(harness);
    await dispatchDirectV1(harness, "action.repair_sign_with_heroine");
    await drainNarrativeV1(harness, {
      "scene.repair_sign_with_heroine": "choice.repair_sign.conflict",
    });
    expect(outcomeTokenV1(harness, "outcome.relationship_opportunity")).toBe(
      "relationship.unresolved_conflict",
    );
    expect(outcomeTokenV1(harness, "outcome.investigation")).toBe("investigation.missed_by_choice");
    expect(harness.snapshotForTest().state.simulation.status.auras).toContainEqual(
      expect.objectContaining({ auraId: "heroine.angry" }),
    );
    expect(
      harness.semantic
        .availableActions()
        .some(({ actionId }) => actionId === "action.old_trade_road"),
    ).toBe(false);

    await dispatchClosedPlanV1(harness);
    await advanceV1(harness);
    await advanceV1(harness);
    expect(harness.snapshotForTest().state.simulation.calendar).toMatchObject({
      day: 6,
      phase: "morning",
    });
    await dispatchDirectV1(harness, "action.apologize_to_heroine");
    await drainNarrativeV1(harness);
    expect(outcomeTokenV1(harness, "outcome.relationship_opportunity")).toBe(
      "relationship.reconciled",
    );
    expect(harness.snapshotForTest().state.simulation.actors.relationship.affection).toBe(0);
    expect(
      harness
        .snapshotForTest()
        .state.simulation.status.auras.some(({ auraId }) => auraId === "heroine.angry"),
    ).toBe(false);

    await advanceV1(harness);
    await dispatchClosedPlanV1(harness);
    await advanceV1(harness);
    await advanceV1(harness);
    expect(harness.snapshotForTest().state.simulation.calendar).toMatchObject({
      day: 7,
      phase: "morning",
    });
    await advanceV1(harness);
    await dispatchDirectV1(harness, "action.pay_levy");

    expect(harness.snapshotForTest().state.simulation.run).toMatchObject({
      status: "failed_arrears",
      completion: {
        status: "failed_arrears",
        levy: { kind: "arrears" },
        summary: {
          relationship: { value: { kind: "token", value: "relationship.reconciled" } },
          investigation: { value: { kind: "token", value: "investigation.missed_by_choice" } },
        },
      },
    });
    expect(harness.executedAttempts().length).toBeGreaterThan(0);
    expect(harness.snapshotForTest().integrity.mode).toBe("normal");
  });
});
