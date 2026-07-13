// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import {
  resolveStoryForTestV1,
  validateStoryV1,
  validateToolingFixturesV1,
} from "@sillymaker/base/testkit";

import { sandboxToolingEntryV1 } from "./development.js";
import { sandboxCommandSchemaV1 } from "./contracts.js";
import { sandboxSceneGraphV1, sandboxStoryEntryV1 } from "./story-entry.js";

describe("Sandbox Story contract", () => {
  it("resolves a static GameSimulation with one state owner and one stateless capability", () => {
    expect(() => validateStoryV1(sandboxStoryEntryV1)).not.toThrow();
    const resolved = resolveStoryForTestV1(sandboxStoryEntryV1);
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
    expect(resolved.sceneGraph).toStrictEqual(sandboxSceneGraphV1);
    expect(resolved.sceneGraph.stageScenes).toEqual([
      expect.objectContaining({ stageSceneId: "stage_scene.sandbox.counter" }),
    ]);
    expect(resolved.presentation.textCatalogs).toBeDefined();
  });

  it("keeps fixtures in the separate tooling entry", () => {
    expect(sandboxStoryEntryV1).not.toHaveProperty("tooling");
    expect(() =>
      validateToolingFixturesV1(sandboxToolingEntryV1, {
        fixtureIdSchema: {
          parse(value) {
            if (value !== "fixture.sandbox.session-zero") {
              throw new TypeError("invalid Sandbox fixture ID");
            }
            return value;
          },
        },
        commandSchema: sandboxCommandSchemaV1,
      }),
    ).not.toThrow();
  });
});
