// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createInputRouterV1 } from "../input/input-router.js";
import { useInputRouterV1 } from "../input/input-context.js";
import { GameShell } from "./game-shell.js";

afterEach(cleanup);

function completeLayersV1() {
  return Object.freeze({
    background: <span>背景</span>,
    character: null,
    sceneInteraction: null,
    hud: <InputRouterWitnessV1 />,
    workspaceOverlay: null,
    narrative: <span>叙事</span>,
    system: null,
  });
}

let witnessedRouterV1: ReturnType<typeof createInputRouterV1> | null = null;

function InputRouterWitnessV1() {
  witnessedRouterV1 = useInputRouterV1();
  return <span>输入路由已连接</span>;
}

describe("GameShell", () => {
  it("provides the exact Input router and passes the seven resolved layers to the Stage", () => {
    const inputRouter = createInputRouterV1();

    render(
      <GameShell
        accessibleName="测试游戏舞台"
        layers={completeLayersV1()}
        inputRouter={inputRouter}
      />,
    );

    expect(screen.getByRole("main", { name: "测试游戏舞台" })).toBeVisible();
    expect(screen.getByText("背景")).toBeVisible();
    expect(screen.getByText("叙事")).toBeVisible();
    expect(screen.getByText("输入路由已连接")).toBeVisible();
    expect(witnessedRouterV1).toBe(inputRouter);
    expect(screen.getAllByTestId(/^stage-/u)).toHaveLength(7);
  });

  it("renders optional ultrawide fill outside the capped Stage as noninteractive content", () => {
    const inputRouter = createInputRouterV1();

    render(
      <GameShell
        accessibleName="测试游戏舞台"
        layers={completeLayersV1()}
        inputRouter={inputRouter}
        backdrop={<button type="button">不可交互装饰</button>}
      />,
    );

    const backdrop = screen.getByTestId("game-shell-backdrop");
    const stage = screen.getByRole("main", { name: "测试游戏舞台" });
    expect(backdrop).toHaveAttribute("aria-hidden", "true");
    expect(backdrop).toHaveAttribute("inert");
    expect(backdrop).not.toContainElement(stage);
    expect(stage.parentElement).not.toBe(backdrop);
  });

  it("keeps ultrawide fill pointer-transparent and removes motion when requested", async () => {
    const css = await readFile(resolve(import.meta.dirname, "game-shell.module.css"), "utf8");
    const backdropRule = css.match(/\.game-shell__backdrop\s*\{(?<body>[^}]*)\}/u);

    expect(backdropRule?.groups?.body).toContain("pointer-events: none");
    expect(css).toMatch(
      /\.game-shell__action\s*\{[^}]*min-block-size:\s*var\(--silly-target-min-size\);[^}]*min-inline-size:\s*var\(--silly-target-min-size\);/su,
    );
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("transition: none !important");
  });
});
