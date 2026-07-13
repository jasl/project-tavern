// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { canonicalPresentationJsonBytesV1 } from "@sillymaker/base";

import { e2eContentMaturityPolicyV1 } from "./content-maturity-policy.js";
import { e2eSceneGraphV1 } from "./scene-graph.js";

function containsCenterV1(area: (typeof e2eSceneGraphV1.hitMaps)[number]["targets"][number]) {
  const { shape } = area;
  switch (shape.kind) {
    case "rect":
      return (
        0.5 >= shape.x &&
        0.5 <= shape.x + shape.width &&
        0.5 >= shape.y &&
        0.5 <= shape.y + shape.height
      );
    case "circle":
      return (0.5 - shape.centerX) ** 2 + (0.5 - shape.centerY) ** 2 <= shape.radius ** 2;
    case "polygon": {
      let inside = false;
      for (
        let index = 0, previous = shape.points.length - 1;
        index < shape.points.length;
        index += 1
      ) {
        const currentPoint = shape.points[index];
        const previousPoint = shape.points[previous];
        if (currentPoint === undefined || previousPoint === undefined) continue;
        const crosses =
          currentPoint.y > 0.5 !== previousPoint.y > 0.5 &&
          0.5 <
            ((previousPoint.x - currentPoint.x) * (0.5 - currentPoint.y)) /
              (previousPoint.y - currentPoint.y) +
              currentPoint.x;
        if (crosses) inside = !inside;
        previous = index;
      }
      return inside;
    }
  }
  return false;
}

describe("E2e SceneGraph", () => {
  it("freezes the neutral StageScene, Character, HitMap, and Interaction catalog", () => {
    expect(e2eSceneGraphV1.stageScenes.map((scene) => scene.stageSceneId)).toEqual([
      "stage_scene.e2e.main",
      "stage_scene.e2e.summary",
    ]);
    expect(e2eSceneGraphV1.variants.map((variant) => variant.variantId)).toEqual([
      "stage_variant.e2e.main.default",
      "stage_variant.e2e.summary.default",
    ]);
    expect(e2eSceneGraphV1.characters.map((character) => character.characterId)).toEqual([
      "character.e2e.counter",
    ]);
    expect(e2eSceneGraphV1.interactionSurfaces).toHaveLength(1);
    expect(e2eSceneGraphV1.interactionTargets).toHaveLength(1);
    expect(e2eSceneGraphV1.interactionBehaviors).toHaveLength(1);
    expect(e2eSceneGraphV1.contentMaturityPolicy).toStrictEqual(e2eContentMaturityPolicyV1);
    expect(e2eSceneGraphV1.variants.every((variant) => variant.content.requiredFlags === 0)).toBe(
      true,
    );
    expect(
      e2eSceneGraphV1.interactionBehaviors.every(
        (behavior) => behavior.content.requiredFlags === 0,
      ),
    ).toBe(true);
    expect(Object.isFrozen(e2eSceneGraphV1)).toBe(true);
  });

  it("locks rect/circle/polygon overlap, larger priority, and authored-order ties", () => {
    const areas = e2eSceneGraphV1.hitMaps[0]?.targets ?? [];

    expect(areas.map((area) => area.shape.kind)).toEqual(["rect", "circle", "polygon"]);
    expect(areas.map((area) => area.priority)).toEqual([10, 20, 20]);
    expect(areas.every(containsCenterV1)).toBe(true);
    const winner = areas.reduce((selected, candidate) =>
      candidate.priority > selected.priority ? candidate : selected,
    );
    expect(winner.areaId).toBe("hit_area.e2e.counter.circle");
  });

  it("describes the main gameplay slots, blocking Narrative, and terminal summary", () => {
    const main = e2eSceneGraphV1.variants.find(
      (variant) => variant.variantId === "stage_variant.e2e.main.default",
    );
    const summary = e2eSceneGraphV1.variants.find(
      (variant) => variant.variantId === "stage_variant.e2e.summary.default",
    );

    expect(main?.layout).toEqual({
      kind: "e2e_stage",
      mode: "main",
      slots: ["counter", "flow_visible_node", "normal_actions"],
      narrativeOverlay: {
        kind: "choice_rejoin",
        blocking: true,
        visibleNodeIds: ["choice", "rejoin"],
      },
    });
    expect(summary?.layout).toEqual({
      kind: "e2e_stage",
      mode: "summary",
      slots: ["terminal_summary"],
    });
  });

  it("keeps the Phase 2 descriptor data-only and does not preempt Phase 5B additions", () => {
    const serialized = JSON.stringify(e2eSceneGraphV1);

    expect(() => canonicalPresentationJsonBytesV1(e2eSceneGraphV1)).not.toThrow();
    expect(serialized).not.toMatch(/e2e\.flow\.|e2e\.run\.|"kind":"e2e\./u);
    expect(serialized).not.toMatch(/poc|tavern/iu);
    expect(serialized).not.toContain("stage_variant.e2e.main.active");
    expect(serialized).not.toContain("behavior.e2e.counter.alpha_cue");
    expect(serialized).not.toContain("behavior.e2e.counter.beta_cue");
  });
});
