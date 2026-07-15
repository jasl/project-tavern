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
type IngredientRequestV1 = { readonly ingredientId: string; readonly quantity: number };
type MenuRequestV1 = { readonly recipeId: string; readonly portions: number };

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

async function directV1(harness: PocStoryHarnessV1, actionId: SemanticActionIdV1): Promise<void> {
  const action = requireActionV1(harness, actionId);
  if (action.delivery !== "direct") throw new TypeError(`${actionId} is not direct`);
  await expect(harness.semantic.preview(action.directInvocation)).resolves.toMatchObject({
    allowed: true,
  });
  const result = await harness.semantic.dispatch(action.directInvocation);
  expect(result, JSON.stringify(harness.executedAttempts().at(-1)?.outcome)).toEqual({
    kind: "committed",
  });
}

async function chooseV1(
  harness: PocStoryHarnessV1,
  actionId: SemanticActionIdV1,
  optionId: string,
): Promise<void> {
  const action = requireActionV1(harness, actionId);
  if (action.delivery !== "choices") throw new TypeError(`${actionId} is not choices`);
  const option = action.options.find((candidate) => candidate.optionId === optionId);
  if (option === undefined) throw new TypeError(`missing ${actionId} option ${optionId}`);
  await expect(harness.semantic.preview(option.invocation)).resolves.toMatchObject({
    allowed: true,
  });
  await expect(harness.semantic.dispatch(option.invocation)).resolves.toEqual({
    kind: "committed",
  });
}

async function drainV1(
  harness: PocStoryHarnessV1,
  choices: Readonly<Record<string, string>> = {},
): Promise<void> {
  for (let count = 0; harness.semantic.observe().narrative !== null; count += 1) {
    if (count >= 32) throw new RangeError("Narrative did not settle within 32 commands");
    const narrative = harness.semantic.observe().narrative;
    if (narrative === null) return;
    if (narrative.choices.length === 0) {
      await directV1(harness, "action.narrative_advance");
      continue;
    }
    const sceneId = narrative.cursor?.sceneId;
    if (sceneId === undefined) throw new TypeError("choice Narrative has no SceneId");
    const choiceId = choices[sceneId];
    if (choiceId === undefined) throw new TypeError(`missing choice for ${sceneId}`);
    await chooseV1(harness, "action.narrative_choose", choiceId);
  }
}

async function advanceV1(
  harness: PocStoryHarnessV1,
  choices: Readonly<Record<string, string>> = {},
): Promise<void> {
  await directV1(harness, "action.advance_phase");
  await drainV1(harness, choices);
}

async function purchaseV1(
  harness: PocStoryHarnessV1,
  requested: readonly IngredientRequestV1[],
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

async function planV1(
  harness: PocStoryHarnessV1,
  mode: "manual" | "closed",
  requested: readonly MenuRequestV1[],
): Promise<void> {
  const action = requireActionV1(harness, "action.service_plan");
  if (action.delivery !== "form" || action.form.kind !== "tavern_plan") {
    throw new TypeError("service plan must use the Tavern-plan form");
  }
  const menu = requested.map((request) => {
    const recipe = action.form.input.recipes.find(({ recipeId }) => recipeId === request.recipeId);
    if (recipe === undefined) throw new TypeError(`missing Recipe ${request.recipeId}`);
    return Object.freeze({ recipeId: recipe.recipeId, portions: parseQuantity(request.portions) });
  });
  const invocation: Extract<PocSemanticInvocationV1, { readonly actionId: "action.service_plan" }> =
    Object.freeze({
      kind: "invoke",
      actionId: "action.service_plan",
      options: Object.freeze({ plan: Object.freeze({ mode, menu: Object.freeze(menu) }) }),
    });
  await expect(harness.semantic.preview(invocation)).resolves.toMatchObject({ allowed: true });
  await expect(harness.semantic.dispatch(invocation)).resolves.toEqual({ kind: "committed" });
}

async function runOpeningV1(harness: PocStoryHarnessV1): Promise<void> {
  await directV1(harness, "action.tavern_opening_start");
  await drainV1(harness);
  await directV1(harness, "action.tavern_opening_finalize");
  await drainV1(harness);
}

async function startBalancedV1(harness: PocStoryHarnessV1): Promise<void> {
  await directV1(harness, "action.run_start");
  await drainV1(harness);
  await chooseV1(harness, "action.choose_life_policy", "policy.balanced");
}

async function finishManualDayV1(
  harness: PocStoryHarnessV1,
  menu: readonly MenuRequestV1[],
): Promise<void> {
  await planV1(harness, "manual", menu);
  await advanceV1(harness);
  await runOpeningV1(harness);
  await advanceV1(harness, {
    "scene.supplier_invoice": "choice.supplier_invoice.intellect_b",
  });
}

describe("PoC terminal routes through SemanticGamePort", () => {
  it("earns and pays the levy, then locks every terminal gameplay mutation", async () => {
    const harness = createPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });
    await startBalancedV1(harness);

    await purchaseV1(harness, [
      { ingredientId: "ingredient.fresh_meat", quantity: 7 },
      { ingredientId: "ingredient.root_vegetable", quantity: 7 },
      { ingredientId: "ingredient.herb", quantity: 7 },
    ]);
    await directV1(harness, "action.prepare_food");
    await advanceV1(harness);
    await directV1(harness, "action.prepare_food");
    await directV1(harness, "action.rest");
    await finishManualDayV1(harness, [{ recipeId: "recipe.hunter_stew", portions: 7 }]);

    await purchaseV1(harness, [
      { ingredientId: "ingredient.fresh_meat", quantity: 7 },
      { ingredientId: "ingredient.root_vegetable", quantity: 7 },
      { ingredientId: "ingredient.herb", quantity: 7 },
    ]);
    await directV1(harness, "action.prepare_food");
    await advanceV1(harness);
    await directV1(harness, "action.prepare_food");
    await directV1(harness, "action.rest");
    await finishManualDayV1(harness, [{ recipeId: "recipe.hunter_stew", portions: 7 }]);

    await purchaseV1(harness, [
      { ingredientId: "ingredient.coarse_grain", quantity: 8 },
      { ingredientId: "ingredient.ale", quantity: 9 },
      { ingredientId: "ingredient.fresh_meat", quantity: 10 },
      { ingredientId: "ingredient.root_vegetable", quantity: 9 },
      { ingredientId: "ingredient.herb", quantity: 10 },
    ]);
    await directV1(harness, "action.prepare_food");
    await advanceV1(harness);
    await directV1(harness, "action.prepare_food");
    await directV1(harness, "action.rest");
    await finishManualDayV1(harness, [
      { recipeId: "recipe.ale_bread", portions: 4 },
      { recipeId: "recipe.hunter_stew", portions: 5 },
    ]);

    expect(harness.snapshotForTest().state.simulation.calendar).toMatchObject({
      day: 4,
      phase: "morning",
    });
    await directV1(harness, "action.prepare_food");
    await directV1(harness, "action.prepare_food");
    await advanceV1(harness);
    await chooseV1(harness, "action.facility_window", "facility.comfortable_bed");
    await finishManualDayV1(harness, [
      { recipeId: "recipe.grain_root_porridge", portions: 4 },
      { recipeId: "recipe.traveler_roast", portions: 5 },
    ]);

    await purchaseV1(harness, [
      { ingredientId: "ingredient.coarse_grain", quantity: 2 },
      { ingredientId: "ingredient.root_vegetable", quantity: 2 },
      { ingredientId: "ingredient.fresh_meat", quantity: 6 },
      { ingredientId: "ingredient.ale", quantity: 6 },
      { ingredientId: "ingredient.herb", quantity: 6 },
    ]);
    await directV1(harness, "action.prepare_food");
    await advanceV1(harness);
    await directV1(harness, "action.prepare_food");
    await directV1(harness, "action.rest");
    await finishManualDayV1(harness, [
      { recipeId: "recipe.grain_root_porridge", portions: 2 },
      { recipeId: "recipe.traveler_roast", portions: 6 },
    ]);

    await purchaseV1(harness, [
      { ingredientId: "ingredient.coarse_grain", quantity: 4 },
      { ingredientId: "ingredient.root_vegetable", quantity: 9 },
      { ingredientId: "ingredient.fresh_meat", quantity: 5 },
      { ingredientId: "ingredient.herb", quantity: 5 },
    ]);
    await directV1(harness, "action.prepare_food");
    await advanceV1(harness);
    await directV1(harness, "action.prepare_food");
    await directV1(harness, "action.rest");
    await finishManualDayV1(harness, [
      { recipeId: "recipe.grain_root_porridge", portions: 4 },
      { recipeId: "recipe.hunter_stew", portions: 5 },
    ]);

    expect(harness.snapshotForTest().state.simulation.calendar).toMatchObject({
      day: 7,
      phase: "morning",
    });
    await advanceV1(harness);
    await directV1(harness, "action.pay_levy");

    const terminalSnapshot = harness.snapshotForTest();
    const terminalPublication = harness.semantic.observe();
    expect(terminalSnapshot.state.simulation.calendar).toMatchObject({
      day: 7,
      phase: "afternoon",
    });
    expect(terminalSnapshot.state.simulation.run).toMatchObject({
      status: "completed_stable",
      completion: { status: "completed_stable", levy: { kind: "paid" } },
    });
    expect(terminalSnapshot.state.simulation.tavern.serviceHistory).toHaveLength(6);
    expect(terminalSnapshot.integrity.mode).toBe("normal");

    const forbidden: Extract<
      PocSemanticInvocationV1,
      { readonly actionId: "action.advance_phase" }
    > = Object.freeze({
      kind: "invoke",
      actionId: "action.advance_phase",
      options: Object.freeze({}),
    });
    await expect(harness.semantic.dispatch(forbidden)).resolves.toMatchObject({
      kind: "rejected",
      reasons: [{ code: "run.invalid_status" }],
    });
    expect(harness.snapshotForTest()).toBe(terminalSnapshot);
    const afterRejectedAttempt = harness.semantic.observe();
    expect(afterRejectedAttempt.revision).toBe(terminalPublication.revision);
    expect(afterRejectedAttempt.game).toBe(terminalPublication.game);
    expect(afterRejectedAttempt.narrative).toBe(terminalPublication.narrative);
    expect(afterRejectedAttempt.actions).toBe(terminalPublication.actions);
  });

  it("distinguishes emergency and planned closures before an arrears terminal", async () => {
    const harness = createPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });
    await startBalancedV1(harness);

    await advanceV1(harness);
    await advanceV1(harness);
    await advanceV1(harness, {
      "scene.supplier_invoice": "choice.supplier_invoice.intellect_b",
    });
    await advanceV1(harness);
    await advanceV1(harness);
    await advanceV1(harness);

    for (const day of [3, 4, 5, 6] as const) {
      if (day === 4) await chooseV1(harness, "action.facility_window", "skip");
      await advanceV1(harness);
      await planV1(harness, "closed", []);
      await advanceV1(harness);
      await advanceV1(harness);
    }

    const closures = harness
      .snapshotForTest()
      .state.simulation.tavern.serviceHistory.map((entry) => {
        if (entry.kind !== "closure") throw new TypeError("closure route recorded an Opening");
        return entry.closure;
      });
    expect(closures.map(({ day, kind }) => [day, kind])).toEqual([
      [1, "emergency"],
      [2, "emergency"],
      [3, "planned"],
      [4, "planned"],
      [5, "planned"],
      [6, "planned"],
    ]);
    expect(closures.slice(0, 2).map(({ reputation }) => reputation)).toEqual([
      { before: 50, after: 49 },
      { before: 49, after: 48 },
    ]);
    expect(
      closures.slice(2).every(({ reputation }) => reputation.before === reputation.after),
    ).toBe(true);

    expect(harness.snapshotForTest().state.simulation.calendar).toMatchObject({
      day: 7,
      phase: "morning",
    });
    await advanceV1(harness);
    await directV1(harness, "action.pay_levy");
    expect(harness.snapshotForTest().state.simulation.run).toMatchObject({
      status: "failed_arrears",
      completion: {
        status: "failed_arrears",
        levy: { kind: "arrears", availableCash: 74, shortfall: 66 },
      },
    });
    expect(harness.snapshotForTest().state.simulation.inventory.cash).toBe(74);
    expect(harness.snapshotForTest().integrity.mode).toBe("normal");
  });
});
