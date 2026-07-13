// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  resolveStoryForTestV1,
  validateStoryV1,
  validateToolingFixturesV1,
} from "@sillymaker/base/testkit";

import { e2eToolingEntryV1 } from "./development.js";
import { e2eCommandSchemaV1 } from "./contracts.js";
import { e2eSceneGraphV1, e2eStoryEntryV1 } from "./story-entry.js";

describe("E2e Story contract", () => {
  it("resolves a static GameSimulation with one state owner and one stateless capability", () => {
    expect(() => validateStoryV1(e2eStoryEntryV1)).not.toThrow();
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    expect(resolved.gameSimulation.modules).toHaveLength(2);
    const [counter, parity] = resolved.gameSimulation.modules;
    expect(counter?.bindingKind).toBe("stateful");
    expect(parity).toMatchObject({
      bindingKind: "stateless",
      owner: null,
      ownerOperationSchema: null,
      ownerProposalSchema: null,
    });
    expect(parity).toHaveProperty("capabilities.resolveParity");
    expect(parity).not.toHaveProperty("services");
    expect(parity).not.toHaveProperty("stateSchema");
    expect(parity).not.toHaveProperty("createInitialState");
    expect(Object.isFrozen(resolved.gameSimulation)).toBe(true);
    expect(resolved.sceneGraph).toStrictEqual(e2eSceneGraphV1);
    expect(resolved.sceneGraph.stageScenes).toEqual([
      expect.objectContaining({ stageSceneId: "stage_scene.e2e.counter" }),
    ]);
    expect(resolved.presentation.textCatalogs).toBeDefined();
  });

  it("keeps fixtures in the separate tooling entry", () => {
    expect(e2eStoryEntryV1).not.toHaveProperty("tooling");
    expect(() =>
      validateToolingFixturesV1(e2eToolingEntryV1, {
        fixtureIdSchema: {
          parse(value) {
            if (value !== "fixture.e2e.session-zero") {
              throw new TypeError("invalid E2e fixture ID");
            }
            return value;
          },
        },
        commandSchema: e2eCommandSchemaV1,
      }),
    ).not.toThrow();
  });
});
