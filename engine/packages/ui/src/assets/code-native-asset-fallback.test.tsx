// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CodeNativeAssetFallbackV1 } from "./code-native-asset-fallback.js";

const interactiveSelector = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  "[data-interaction-target]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

describe("CodeNativeAssetFallbackV1", () => {
  it("renders a visible named fallback without a transparent interactive target", () => {
    const rendered = render(
      <CodeNativeAssetFallbackV1
        fallbackToken="fallback.scene.tavern"
        usage="scene_background"
        accessibleName="酒馆背景"
      />,
    );

    const fallback = screen.getByRole("img", { name: "酒馆背景" });
    expect(fallback).toBeVisible();
    expect(fallback).toHaveAccessibleName("酒馆背景");
    expect(rendered.container.querySelector(interactiveSelector)).toBeNull();
  });

  it("keeps a decorative fallback visible but absent from the accessibility tree", () => {
    const rendered = render(
      <CodeNativeAssetFallbackV1
        fallbackToken="fallback.ui.flourish"
        usage="ui_decoration"
        accessibleName="不应朗读的装饰"
        decorative
      />,
    );

    const fallback = rendered.container.firstElementChild;
    expect(fallback).not.toBeNull();
    expect(fallback).toBeVisible();
    expect(fallback).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img", { name: "不应朗读的装饰" })).toBeNull();
    expect(rendered.container.querySelector(interactiveSelector)).toBeNull();
  });

  it("rejects an empty accessible name for a non-decorative fallback", () => {
    expect(() =>
      render(
        <CodeNativeAssetFallbackV1
          fallbackToken="fallback.character.silhouette"
          usage="character_pose"
          accessibleName="  "
        />,
      ),
    ).toThrow();
  });
});
