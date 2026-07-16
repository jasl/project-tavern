// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, expectTypeOf, it } from "vitest";

import type { PocSemanticGamePortV1 } from "../application/create-poc-semantic-port.js";
import { ingredientIdsV1, policyIdsV1, recipeIdsV1 } from "../content/ids.js";
import { parseQuantity } from "../gameplay/index.js";
import {
  consumeLastApInvocationV1,
  createBlockedPocStoryHarnessV1,
  createPocReplacementPublicationHarnessV1,
  createPocSemanticResultFixtureV1,
  createPocStoryHarnessV1,
  createQueriesCountingPocStoryHarnessV1,
  extraSemanticInvocationV1,
  fixedPocBootstrapV1,
  requiresApInvocationV1,
} from "../testing/poc-story-harness.js";

async function enterActiveRunV1(semantic: PocSemanticGamePortV1): Promise<void> {
  await expect(
    semantic.dispatch({ kind: "invoke", actionId: "action.run_start", options: {} }),
  ).resolves.toEqual({ kind: "committed" });
  for (let count = 0; semantic.observe().narrative !== null; count += 1) {
    if (count >= 32) throw new RangeError("manifest Narrative did not settle");
    await expect(
      semantic.dispatch({ kind: "invoke", actionId: "action.narrative_advance", options: {} }),
    ).resolves.toEqual({ kind: "committed" });
  }
  await expect(
    semantic.dispatch({
      kind: "invoke",
      actionId: "action.choose_life_policy",
      options: { policyId: policyIdsV1[1] },
    }),
  ).resolves.toEqual({ kind: "committed" });
}

function collectObjectKeysRecursivelyV1(value: unknown): readonly string[] {
  const keys = new Set<string>();
  const pending: unknown[] = [value];
  const visited = new Set<object>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === null || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    for (const [key, nested] of Object.entries(current)) {
      keys.add(key);
      pending.push(nested);
    }
  }
  return [...keys].sort();
}

describe("PoC SemanticGamePort integration", () => {
  it("returns domain rejections for purchase and service quantities above Story limits", async () => {
    const harness = createPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });
    await enterActiveRunV1(harness.semantic);

    const purchase = {
      kind: "invoke" as const,
      actionId: "action.purchase" as const,
      options: {
        lines: [{ ingredientId: ingredientIdsV1[0], quantity: parseQuantity(100) }],
      },
    };
    await expect(harness.semantic.preview(purchase)).resolves.toMatchObject({
      allowed: false,
      reasons: [
        {
          code: "inventory.invalid_quantity",
          details: { ingredientId: ingredientIdsV1[0], quantity: 100 },
        },
      ],
    });
    await expect(harness.semantic.dispatch(purchase)).resolves.toMatchObject({
      kind: "rejected",
      reasons: [{ code: "inventory.invalid_quantity" }],
    });

    const servicePlan = {
      kind: "invoke" as const,
      actionId: "action.service_plan" as const,
      options: {
        plan: {
          mode: "manual" as const,
          menu: [{ recipeId: recipeIdsV1[0], portions: parseQuantity(100) }],
        },
      },
    };
    await expect(harness.semantic.preview(servicePlan)).resolves.toMatchObject({
      allowed: false,
      reasons: [{ code: "tavern.invalid_plan", details: { reason: "portion_limit" } }],
    });
    await expect(harness.semantic.dispatch(servicePlan)).resolves.toMatchObject({
      kind: "rejected",
      reasons: [{ code: "tavern.invalid_plan", details: { reason: "portion_limit" } }],
    });
  });

  it("exposes only legal visible actions and waits by revision", async () => {
    const harness = createPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });
    expectTypeOf(harness.semantic).toEqualTypeOf<PocSemanticGamePortV1>();
    const before = harness.semantic.observe();
    const integrityBefore = harness.snapshotForTest().integrity;

    expect(before.revision).toBe(0);
    expect(before.status).toBe("ready");
    expect(harness.semantic.availableActions()).toBe(before.actions);
    expect(before.narrative).toBeNull();
    expect(before.game).not.toHaveProperty("narrative");
    expect(before.actions.map((entry) => entry.actionId)).toContain("action.run_start");
    expect(integrityBefore).toEqual({
      mode: "normal",
      mutationCount: 0,
      firstMutationSequence: null,
      reasons: [],
    });

    const nextIdle = harness.semantic.waitForIdle(before.revision);
    const published: number[] = [];
    const unsubscribe = harness.semantic.subscribe(() => {
      published.push(harness.semantic.observe().revision);
    });

    await expect(
      harness.semantic.dispatch({
        kind: "invoke",
        actionId: "action.run_start",
        options: {},
      }),
    ).resolves.toEqual({ kind: "committed" });
    await expect(nextIdle).resolves.toMatchObject({ revision: 1, status: "ready" });
    expect(harness.semantic.observe()).not.toHaveProperty("snapshot");
    expect(published).toContain(1);
    expect(harness.snapshotForTest().integrity).toBe(integrityBefore);
    unsubscribe();
  });

  it("previews at the FIFO front against the latest committed state", async () => {
    const harness = await createBlockedPocStoryHarnessV1();
    const attemptsBefore = harness.executedAttempts().length;
    const dispatch = harness.semantic.dispatch(consumeLastApInvocationV1());
    const preview = harness.semantic.preview(requiresApInvocationV1());

    harness.releaseQueueFront();

    await expect(dispatch).resolves.toEqual({ kind: "committed" });
    await expect(preview).resolves.toMatchObject({
      allowed: false,
      reasons: [{ code: "calendar.insufficient_ap" }],
    });
    expect(harness.executedAttempts()).toHaveLength(attemptsBefore + 1);
  });

  it.each(["lifecycle", "load"] as const)(
    "publishes an authoritative revision for an equivalent-state %s replacement",
    async (source) => {
      const harness = createPocReplacementPublicationHarnessV1(source);
      const before = harness.semantic.observe();
      const stateBefore = harness.snapshotForTest().state;
      const published = harness.nextSemanticPublication();

      await harness.replaceWithEquivalentStateAtQueueFront();

      const replacement = await published;
      expect(replacement).toMatchObject({ revision: before.revision + 1, status: "ready" });
      expect(replacement.game).toEqual(before.game);
      expect(replacement.game).not.toBe(before.game);
      expect(replacement.narrative).toEqual(before.narrative);
      expect(replacement.actions).toEqual(before.actions);
      expect(replacement.actions).not.toBe(before.actions);
      expect(harness.snapshotForTest().state).toEqual(stateBefore);
      expect(harness.semantic.observe()).toBe(replacement);
      expect(replacement).not.toHaveProperty("snapshot");
    },
  );

  it("publishes Gameplay, Narrative, and actions from the same Queries instance", async () => {
    const harness = createQueriesCountingPocStoryHarnessV1();
    const initial = harness.semantic.observe();

    expect(harness.createQueriesCalls()).toBe(1);
    expect(initial.game).toEqual(harness.projectedGameViewFromWitness());
    expect(initial.narrative).toBe(harness.projectedNarrativeFromWitness());
    expect(initial.actions).toEqual(harness.projectedActionsFromWitness());

    await harness.publishBusyReadyWithoutReplacement();

    const statusOnly = harness.semantic.observe();
    expect(statusOnly.revision).toBe(initial.revision);
    expect(statusOnly.status).toBe("ready");
    expect(statusOnly.game).toBe(initial.game);
    expect(statusOnly.narrative).toBe(initial.narrative);
    expect(statusOnly.actions).toBe(initial.actions);
    expect(harness.createQueriesCalls()).toBe(1);
  });

  it.each([
    ["committed", { kind: "committed" }],
    [
      "rejected",
      {
        kind: "rejected",
        reasons: [{ code: "calendar.insufficient_ap", details: { required: 1, available: 0 } }],
      },
    ],
    ["faulted", { kind: "faulted", code: "gameplay_fault" }],
    ["not_executed", { kind: "not_executed", code: "fault_paused" }],
  ] as const)("projects a player-safe %s dispatch result", async (source, expected) => {
    const result = await createPocSemanticResultFixtureV1(source).dispatch();

    expect(result).toEqual(expected);
    expect(collectObjectKeysRecursivelyV1(result)).not.toEqual(
      expect.arrayContaining([
        "snapshot",
        "state",
        "rng",
        "facts",
        "fault",
        "attempt",
        "commandLog",
      ]),
    );
  });

  it("rejects malformed runtime invocations before dispatch admission", async () => {
    const harness = createPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });
    const before = harness.semantic.observe();
    const snapshotBefore = harness.snapshotForTest();
    const attemptsBefore = harness.executedAttempts().length;

    await expect(
      Reflect.apply(harness.semantic.dispatch, harness.semantic, [extraSemanticInvocationV1()]),
    ).resolves.toEqual({ kind: "not_executed", code: "validation_failed" });

    expect(harness.semantic.observe()).toBe(before);
    expect(harness.snapshotForTest()).toBe(snapshotBefore);
    expect(harness.executedAttempts()).toHaveLength(attemptsBefore);
  });
});
