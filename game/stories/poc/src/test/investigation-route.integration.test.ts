// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { describe, expect, it } from "vitest";

import type { PocSemanticActionDescriptorV1, PocSemanticInvocationV1 } from "../index.js";
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

async function closedPlanV1(harness: PocStoryHarnessV1): Promise<void> {
  const action = requireActionV1(harness, "action.service_plan");
  if (action.delivery !== "form" || action.form.kind !== "tavern_plan") {
    throw new TypeError("service plan must be a Tavern form");
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

function outcomeV1(harness: PocStoryHarnessV1, outcomeId: string): string | null {
  const entry = harness
    .snapshotForTest()
    .state.story.outcomes.find((candidate) => candidate.outcomeId === outcomeId);
  return entry?.value.kind === "token" ? entry.value.value : null;
}

describe("PoC investigation route through SemanticGamePort", () => {
  it("occupies the D5 opportunity, resolves prepared 2D6 once, and reaches arrears terminal", async () => {
    const harness = createPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });
    await directV1(harness, "action.run_start");
    await drainV1(harness);
    await chooseV1(harness, "action.choose_life_policy", "policy.balanced");

    await advanceV1(harness);
    await advanceV1(harness);
    await advanceV1(harness, {
      "scene.supplier_invoice": "choice.supplier_invoice.intellect_b",
    });
    await advanceV1(harness);
    await advanceV1(harness);
    await advanceV1(harness);

    expect(harness.snapshotForTest().state.simulation.calendar).toMatchObject({
      day: 3,
      phase: "morning",
    });
    await advanceV1(harness);
    await closedPlanV1(harness);
    await advanceV1(harness);
    await advanceV1(harness);

    expect(harness.snapshotForTest().state.simulation.calendar).toMatchObject({
      day: 4,
      phase: "morning",
    });
    await chooseV1(harness, "action.facility_window", "skip");
    await advanceV1(harness);
    await closedPlanV1(harness);
    await advanceV1(harness);
    await advanceV1(harness);

    expect(harness.snapshotForTest().state.simulation.calendar).toMatchObject({
      day: 5,
      phase: "morning",
    });
    await chooseV1(harness, "action.old_trade_road", "choice.old_trade_road.prepared");
    expect(outcomeV1(harness, "outcome.relationship_opportunity")).toBe("relationship.abandoned");
    expect(harness.snapshotForTest().state.simulation.inventory.cash).toBe(66);
    expect(harness.snapshotForTest().state.simulation.actors.player.stamina.current).toBe(7);
    await drainV1(harness);
    expect(harness.snapshotForTest().state.simulation.activeWorkflow).toMatchObject({
      kind: "world_action",
      progress: "awaiting_completion_phase",
      preparationBonus: 1,
    });

    await advanceV1(harness);
    expect(harness.snapshotForTest().state.simulation.activeWorkflow).toMatchObject({
      kind: "world_action",
      progress: "ready_to_complete",
    });
    await directV1(harness, "action.world_action_complete");
    expect(harness.snapshotForTest().state.story.resolvedChecks).toHaveLength(1);
    expect(harness.snapshotForTest().state.story.resolvedChecks[0]).toMatchObject({
      checkId: "check.old_trade_road",
      dice: [4, 3],
      preparationBonus: 1,
      total: 9,
      bandId: "band.investigation.complete",
    });
    expect(outcomeV1(harness, "outcome.investigation")).toBe("investigation.complete");
    expect(harness.snapshotForTest().state.story.facts).toContainEqual({
      factId: "fact.war_clue",
      value: { kind: "boolean", value: true },
    });
    expect(
      harness.semantic
        .availableActions()
        .some(({ actionId }) => actionId === "action.repair_sign_with_heroine"),
    ).toBe(false);

    await closedPlanV1(harness);
    await advanceV1(harness);
    await advanceV1(harness);
    await advanceV1(harness);
    await closedPlanV1(harness);
    await advanceV1(harness);
    await advanceV1(harness);
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
        levy: { kind: "arrears" },
        summary: {
          relationship: { value: { kind: "token", value: "relationship.abandoned" } },
          investigation: { value: { kind: "token", value: "investigation.complete" } },
        },
      },
    });
    expect(harness.snapshotForTest().integrity.mode).toBe("normal");
    expect(harness.executedAttempts().length).toBeGreaterThan(0);
  });
});
