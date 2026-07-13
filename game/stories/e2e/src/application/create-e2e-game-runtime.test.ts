// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";
import { createWebHostV1 } from "@sillymaker/web";
import { resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import { createE2eGameRuntimeV1 } from "./create-e2e-game-runtime.js";
import { e2eStoryEntryV1 } from "../story-entry.js";

describe("E2e Game Application runtime", () => {
  it("composes six frozen ports with a narrow temporary Semantic adapter", async () => {
    const application = createE2eGameRuntimeV1({
      resolved: resolveStoryForTestV1(e2eStoryEntryV1),
      host: createWebHostV1({
        seeds: [0x0002_3049],
        uuids: ["00000000-0000-4000-8000-000000000001"],
        now: () => "2026-07-12T00:00:00.000Z",
      }),
    });
    expect(Object.keys(application).sort()).toEqual([
      "capabilities",
      "debugTools",
      "diagnostics",
      "lifecycle",
      "persistence",
      "semantic",
    ]);
    expect(Object.isFrozen(application)).toBe(true);
    expect(Object.keys(application.semantic).sort()).toEqual(["dispatch", "view"]);
    expect(Object.keys(application.semantic.view).sort()).toEqual(["getCurrent", "subscribe"]);
    expect(application.semantic.view).not.toHaveProperty("publish");
    expect(application.semantic.view.getCurrent()).toMatchObject({ count: 0, status: "ready" });
    await expect(application.semantic.dispatch({ kind: "e2e.counter.reject" })).resolves.toEqual({
      kind: "rejected",
      reasons: [{ code: "e2e.counter.rejected" }],
    });
    await expect(
      application.semantic.dispatch({ kind: "invalid.command" } as never),
    ).resolves.toEqual({
      kind: "not_executed",
      code: "validation_failed",
    });
    await expect(application.semantic.dispatch({ kind: "e2e.counter.increment" })).resolves.toEqual(
      { kind: "committed" },
    );
    expect(application.semantic.view.getCurrent()).toMatchObject({ count: 1, status: "ready" });
    await expect(application.semantic.dispatch({ kind: "e2e.counter.fault" })).resolves.toEqual({
      kind: "faulted",
      code: "gameplay_fault",
    });
    expect(application).not.toHaveProperty("commands");
    expect(application).not.toHaveProperty("view");
    expect(application).not.toHaveProperty("player");
    expect(application).not.toHaveProperty("developer");
    expect(application).not.toHaveProperty("snapshot");
    expect(application.capabilities).toEqual({ kind: "unavailable" });
    expect(application.debugTools).toEqual({
      kind: "unavailable",
      code: "phase3_not_installed",
    });
    expect(Object.isFrozen(application.capabilities)).toBe(true);
    expect(Object.isFrozen(application.debugTools)).toBe(true);
    expect(application.lifecycle.createNewSession).toHaveLength(0);
    expect(application.lifecycle.restartSession).toHaveLength(0);
    await expect(application.persistence.getStatus()).resolves.toMatchObject({ available: false });
    await expect(application.persistence.exportSave("manual")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    await expect(application.persistence.exportCurrentSave()).resolves.toMatchObject({
      mediaType: "application/json",
      filename: "project-tavern-e2e-current.json",
    });
  });
});
