// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";
import { createWebHostV1 } from "@sillymaker/web";
import { resolveStoryForTestV1, validateToolingFixturesV1 } from "@sillymaker/base/testkit";
import { createE2eGameRuntimeV1 } from "./create-e2e-game-runtime.js";
import { e2eGameCommandSchemaV1 } from "../gameplay/contracts/index.js";
import { e2eStoryEntryV1 } from "../story-entry.js";
import { e2eToolingEntryV1 } from "../tooling.js";

const e2eFixtureIdsV1 = Object.freeze([
  "fixture.e2e.initial",
  "fixture.e2e.choice-left-blocked",
  "fixture.e2e.choice-right-blocked",
  "fixture.e2e.terminal",
]);

const e2eFixtureIdSchemaV1 = Object.freeze({
  parse(value: unknown) {
    if (typeof value !== "string" || !e2eFixtureIdsV1.includes(value)) {
      throw new TypeError("invalid E2E fixture ID");
    }
    return value;
  },
});

function createCountingE2eStoryEntryV1() {
  const sourceDefinition = e2eStoryEntryV1.define();
  const calls = {
    define: 0,
    simulationMaterializer: 0,
    presentationMaterializer: 0,
    createGameSimulation: 0,
  };
  const materializeProgram = (
    values: Parameters<typeof sourceDefinition.simulation.materializeProgram>[0],
  ) => {
    calls.simulationMaterializer += 1;
    return sourceDefinition.simulation.materializeProgram(values);
  };
  const createGameSimulation = (
    program: Parameters<typeof sourceDefinition.simulation.createGameSimulation>[0],
  ) => {
    calls.createGameSimulation += 1;
    return sourceDefinition.simulation.createGameSimulation(program);
  };
  const materializePresentation = (
    values: Parameters<typeof sourceDefinition.presentation.materializePresentation>[0],
  ) => {
    calls.presentationMaterializer += 1;
    return sourceDefinition.presentation.materializePresentation(values);
  };
  const definition = Object.freeze({
    simulation: Object.freeze({
      ...sourceDefinition.simulation,
      materializeProgram,
      createGameSimulation,
    }),
    presentation: Object.freeze({
      ...sourceDefinition.presentation,
      materializePresentation,
    }),
  });
  const entry = Object.freeze({
    ...e2eStoryEntryV1,
    define() {
      calls.define += 1;
      return definition;
    },
  });
  return Object.freeze({
    entry,
    calls: () => Object.freeze({ ...calls }),
  });
}

describe("E2e Game Application runtime", () => {
  it("consumes one resolved simulation without redefining or rematerializing the Story", async () => {
    const fixture = createCountingE2eStoryEntryV1();
    const resolved = resolveStoryForTestV1(fixture.entry);

    expect(fixture.calls()).toEqual({
      define: 2,
      simulationMaterializer: 1,
      presentationMaterializer: 1,
      createGameSimulation: 1,
    });

    const application = createE2eGameRuntimeV1({
      resolved,
      host: createWebHostV1({
        seeds: [0x0002_3049],
        uuids: ["00000000-0000-4000-8000-000000000001"],
        now: () => "2026-07-12T00:00:00.000Z",
      }),
    });
    await expect(application.semantic.dispatch({ kind: "e2e.counter.increment" })).resolves.toEqual(
      { kind: "committed" },
    );
    expect(application.semantic.view.getCurrent().count).toBe(1);
    expect(fixture.calls()).toEqual({
      define: 2,
      simulationMaterializer: 1,
      presentationMaterializer: 1,
      createGameSimulation: 1,
    });
  });

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
    expect(application.semantic.view.getCurrent()).toMatchObject({
      count: 0,
      parity: "even",
      status: "ready",
    });
    await expect(application.semantic.dispatch({ kind: "e2e.test.reject" })).resolves.toEqual({
      kind: "rejected",
      reasons: [{ code: "test.rejected" }],
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
    expect(application.semantic.view.getCurrent()).toMatchObject({
      count: 1,
      parity: "odd",
      status: "ready",
    });
    await expect(application.semantic.dispatch({ kind: "e2e.test.fault" })).resolves.toEqual({
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

  it("keeps four closed canonical command fixtures in the separate tooling entry", () => {
    expect(() =>
      validateToolingFixturesV1(e2eToolingEntryV1, {
        fixtureIdSchema: e2eFixtureIdSchemaV1,
        commandSchema: e2eGameCommandSchemaV1,
      }),
    ).not.toThrow();

    const support = e2eToolingEntryV1.defineToolingSupport();
    expect(support.fixtures.map((fixture) => fixture.fixtureId)).toEqual(e2eFixtureIdsV1);
    expect(support.fixtures[3]?.commands).toEqual([
      { kind: "e2e.flow.start" },
      { kind: "e2e.flow.choose", choice: "right" },
      { kind: "e2e.flow.continue" },
      { kind: "e2e.run.complete" },
    ]);
    expect(Object.isFrozen(support.fixtures)).toBe(true);
  });
});
