// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { GameStageLayersV1, StageLayerIdV1 } from "./game-stage.js";
import { GameStageV1, stageLayerIdsV1 } from "./game-stage.js";

afterEach(cleanup);

function completeSevenLayerFixtureV1(): GameStageLayersV1 {
  return Object.freeze({
    background: <p>背景</p>,
    character: <p>角色</p>,
    sceneInteraction: <button type="button">场景交互</button>,
    hud: <button type="button">状态操作</button>,
    workspaceOverlay: <section aria-label="工作区">工作区内容</section>,
    narrative: <section aria-label="叙事">叙事内容</section>,
    system: <div role="status">系统状态</div>,
  });
}

describe("GameStageV1", () => {
  it("always renders the seven fixed layers in authoritative DOM order", () => {
    render(<GameStageV1 accessibleName="游戏舞台" layers={completeSevenLayerFixtureV1()} />);

    const stage = screen.getByRole("main", { name: "游戏舞台" });
    expect(stage).toBeVisible();
    expect(
      within(stage)
        .getAllByTestId(/^stage-/u)
        .map((node) => node.dataset.stageLayer),
    ).toEqual(stageLayerIdsV1);

    expect(screen.getByTestId("stage-background")).toHaveAttribute(
      "data-stage-layer",
      "background",
    );
    expect(screen.getByTestId("stage-character")).toHaveAttribute("data-stage-layer", "character");
    expect(screen.getByTestId("stage-scene-interaction")).toHaveAttribute(
      "data-stage-layer",
      "scene_interaction",
    );
    expect(screen.getByTestId("stage-hud")).toHaveAttribute("data-stage-layer", "hud");
    expect(screen.getByTestId("stage-workspace-overlay")).toHaveAttribute(
      "data-stage-layer",
      "workspace_overlay",
    );
    expect(screen.getByTestId("stage-narrative")).toHaveAttribute("data-stage-layer", "narrative");
    expect(screen.getByTestId("stage-system")).toHaveAttribute("data-stage-layer", "system");
  });

  it("keeps empty layer hosts mounted without changing their order", () => {
    const layers = Object.freeze({
      background: null,
      character: null,
      sceneInteraction: null,
      hud: null,
      workspaceOverlay: null,
      narrative: null,
      system: null,
    }) satisfies GameStageLayersV1;

    render(<GameStageV1 accessibleName="空舞台" layers={layers} />);

    expect(screen.getAllByTestId(/^stage-/u).map((node) => node.dataset.stageLayer)).toEqual(
      stageLayerIdsV1,
    );
  });

  it("marks only scene interaction as the Pointer Adapter surface", () => {
    render(<GameStageV1 accessibleName="游戏舞台" layers={completeSevenLayerFixtureV1()} />);

    const pointerSurfaces = document.querySelectorAll('[data-stage-pointer-surface="true"]');
    expect(pointerSurfaces).toHaveLength(1);
    expect(pointerSurfaces[0]).toBe(screen.getByTestId("stage-scene-interaction"));
  });

  it("preserves semantic controls and regions in the upper layers", () => {
    render(<GameStageV1 accessibleName="游戏舞台" layers={completeSevenLayerFixtureV1()} />);

    expect(screen.getByRole("button", { name: "状态操作" })).toBeVisible();
    expect(screen.getByRole("region", { name: "工作区" })).toBeVisible();
    expect(screen.getByRole("region", { name: "叙事" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("系统状态");
  });

  it("exports the exact frozen layer ID sequence", () => {
    expect(Object.isFrozen(stageLayerIdsV1)).toBe(true);
    expect(stageLayerIdsV1).toEqual([
      "background",
      "character",
      "scene_interaction",
      "hud",
      "workspace_overlay",
      "narrative",
      "system",
    ] satisfies readonly StageLayerIdV1[]);
  });

  it("keeps the CSS Stage basis, z-order, safe area, and motion policy explicit", async () => {
    const css = await readFile(resolve(import.meta.dirname, "game-stage.module.css"), "utf8");

    expect(css).toContain("var(--silly-stage-max-width)");
    expect(css).toContain("var(--silly-stage-aspect-ratio)");
    expect(css).toMatch(/calc\(100dvh \* 8 \/ 5\)/u);
    expect(css).toMatch(/@media \(aspect-ratio < 4 \/ 3\)/u);
    expect(css).toContain("block-size: 100dvh");
    expect(css).toContain("var(--silly-safe-area-block-start)");
    expect(css).toContain("var(--silly-safe-area-inline-end)");
    expect(css).toContain("@container game-stage");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("transition: none");

    for (const layerId of stageLayerIdsV1) {
      expect(css).toContain(`var(--silly-stage-z-${layerId.replaceAll("_", "-")})`);
    }
  });
});
