// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  parseCharacterExpressionId,
  parseCharacterPoseId,
  parseInteractionTargetId,
} from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import { createCharacterRendererRegistryV1 } from "./character-renderer-registry.js";
import type { CharacterRendererContributionV1 } from "./contracts.js";

const standingPoseIdV1 = parseCharacterPoseId("pose.synthetic.guide.standing");
const neutralExpressionIdV1 = parseCharacterExpressionId("expression.synthetic.guide.neutral");
const figureTargetIdV1 = parseInteractionTargetId("target.synthetic.guide.figure");

function createFakeAdapterV1(rendererId: string): CharacterRendererContributionV1 {
  const poses = new Map([[standingPoseIdV1, "Standing"]] as const);
  const cues = new Map<string, string>([["cue.synthetic.guide.greet", "Greet"]]);
  const targets = new Map<string, typeof figureTargetIdV1>([["Body", figureTargetIdV1]]);

  return Object.freeze({
    rendererId,
    kind: "adapter",
    mapStoryPose: (poseId) => poses.get(poseId) ?? null,
    mapStoryCue: (cueId) => cues.get(cueId) ?? null,
    mapExternalTarget: (externalTargetId) => targets.get(externalTargetId) ?? null,
  } satisfies CharacterRendererContributionV1);
}

describe("CharacterRendererRegistryV1", () => {
  it("resolves frozen adapter metadata without becoming a React component registry", () => {
    const staticContribution = Object.freeze({
      rendererId: "renderer.synthetic.static",
      kind: "static" as const,
    });
    const adapter = createFakeAdapterV1("renderer.synthetic.fake_adapter");
    const registry = createCharacterRendererRegistryV1([staticContribution, adapter]);

    const found = registry.resolve(adapter.rendererId);
    expect(found).toEqual({ kind: "found", contribution: adapter });
    expect(Object.isFrozen(found)).toBe(true);
    expect(Object.isFrozen(registry)).toBe(true);
    expect(found).not.toHaveProperty("component");
    expect(registry.resolve("renderer.synthetic.missing")).toEqual({
      kind: "not_found",
      code: "ui.character_renderer_not_found",
    });
  });

  it("rejects duplicate and empty renderer IDs in authored order", () => {
    const first = Object.freeze({
      rendererId: "renderer.synthetic.shared",
      kind: "static" as const,
    });
    const duplicate = Object.freeze({
      rendererId: "renderer.synthetic.shared",
      kind: "paper_doll" as const,
    });

    expect(() => createCharacterRendererRegistryV1([first, duplicate])).toThrowError(
      "ui.duplicate_character_renderer_id:renderer.synthetic.shared",
    );
    expect(() =>
      createCharacterRendererRegistryV1([
        Object.freeze({ rendererId: "  ", kind: "adapter" as const }),
      ]),
    ).toThrowError("ui.empty_character_renderer_id:0");
  });

  it("maps stable Story pose and cue IDs outward and external hit areas inward", () => {
    const adapter = createFakeAdapterV1("renderer.synthetic.fake_adapter");

    expect(adapter.mapStoryPose?.(standingPoseIdV1)).toBe("Standing");
    expect(adapter.mapStoryPose?.(parseCharacterPoseId("pose.synthetic.guide.unknown"))).toBeNull();
    expect(adapter.mapStoryCue?.("cue.synthetic.guide.greet")).toBe("Greet");
    expect(adapter.mapStoryCue?.("cue.synthetic.guide.unknown")).toBeNull();
    expect(adapter.mapExternalTarget?.("Body")).toBe(figureTargetIdV1);
    expect(adapter.mapExternalTarget?.("Unknown")).toBeNull();
  });

  it("keeps committed pose and expression outside adapter mapping", () => {
    const adapter = createFakeAdapterV1("renderer.synthetic.fake_adapter");
    const committedPresentation = Object.freeze({
      poseId: standingPoseIdV1,
      expressionId: neutralExpressionIdV1,
    });
    const gameplayWitness = Object.freeze({ relationship: 3, cash: "120.50" });

    adapter.mapStoryPose?.(committedPresentation.poseId);
    adapter.mapStoryCue?.("cue.synthetic.guide.greet");
    adapter.mapExternalTarget?.("Body");

    expect(committedPresentation).toEqual({
      poseId: standingPoseIdV1,
      expressionId: neutralExpressionIdV1,
    });
    expect(gameplayWitness).toEqual({ relationship: 3, cash: "120.50" });
  });

  it("keeps the production metadata seam free of Live2D or Cubism SDK imports", async () => {
    const productionSources = await Promise.all(
      ["contracts.ts", "character-renderer-registry.ts"].map((filename) =>
        readFile(resolve(import.meta.dirname, filename), "utf8"),
      ),
    );
    const packageManifest = await readFile(
      resolve(import.meta.dirname, "../../package.json"),
      "utf8",
    );

    expect(productionSources.join("\n")).not.toMatch(
      /(?:from\s+["'][^"']*(?:live2d|cubism)|import\s*\([^)]*(?:live2d|cubism))/iu,
    );
    expect(packageManifest).not.toMatch(/(?:live2d|cubism)/iu);
  });
});
