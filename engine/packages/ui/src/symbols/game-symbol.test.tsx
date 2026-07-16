// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameSymbolV1 } from "./game-symbol.js";
import {
  createGameSymbolRegistryV1,
  parseGameSymbolIdV1,
  type GameSymbolProviderV1,
  type GameSymbolRenderPropsV1,
} from "./game-symbol-registry.js";

const symbolId = parseGameSymbolIdV1("symbol.e2e.stamina");
const interactiveSelector = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  "[data-interaction-target]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function StorySymbolV1(props: GameSymbolRenderPropsV1) {
  const decorative = props.decorative === true;

  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : props.accessibleName}
      aria-hidden={decorative ? true : undefined}
      data-testid="story-symbol-provider"
      style={{ width: props.size, height: props.size }}
    />
  );
}

function ThrowingStorySymbolV1(_props: GameSymbolRenderPropsV1): never {
  throw new Error("synthetic Story symbol provider failure");
}

function registryV1(component: GameSymbolProviderV1["component"] = StorySymbolV1) {
  return createGameSymbolRegistryV1([Object.freeze({ symbolId, component })]);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("GameSymbolV1", () => {
  it.each([16, 20, 24, 32] as const)("forwards the supported %ipx size exactly", (size) => {
    render(
      <GameSymbolV1
        registry={registryV1()}
        symbolId={symbolId}
        size={size}
        accessibleName="体力"
      />,
    );

    expect(screen.getByRole("img", { name: "体力" })).toHaveStyle({
      width: `${size}px`,
      height: `${size}px`,
    });
  });

  it("forwards named accessibility without hiding the provider", () => {
    render(
      <GameSymbolV1
        registry={registryV1()}
        symbolId={symbolId}
        size={24}
        accessibleName="主角体力"
      />,
    );

    const rendered = screen.getByRole("img", { name: "主角体力" });
    expect(rendered).toBeVisible();
    expect(rendered).not.toHaveAttribute("aria-hidden");
  });

  it("forwards decorative accessibility and removes the provider from the accessibility tree", () => {
    const rendered = render(
      <GameSymbolV1 registry={registryV1()} symbolId={symbolId} size={20} decorative />,
    );

    const provider = screen.getByTestId("story-symbol-provider");
    expect(provider).toBeVisible();
    expect(provider).toHaveAttribute("aria-hidden", "true");
    expect(rendered.queryByRole("img")).toBeNull();
  });

  it("rejects unsupported sizes at the runtime boundary", () => {
    const invalidProps = {
      registry: registryV1(),
      symbolId,
      size: 18,
      accessibleName: "体力",
    } as unknown as ComponentProps<typeof GameSymbolV1>;

    expect(() => render(<GameSymbolV1 {...invalidProps} />)).toThrow();
  });

  it("rejects an empty accessible name instead of creating an unnamed semantic image", () => {
    expect(() =>
      render(
        <GameSymbolV1 registry={registryV1()} symbolId={symbolId} size={24} accessibleName="   " />,
      ),
    ).toThrow();
  });

  it("renders a visible named code-native fallback for an unknown provider", () => {
    const rendered = render(
      <GameSymbolV1
        registry={createGameSymbolRegistryV1([])}
        symbolId={parseGameSymbolIdV1("symbol.e2e.unknown")}
        size={24}
        accessibleName="未知资源"
      />,
    );

    expect(screen.getByRole("img", { name: "未知资源" })).toBeVisible();
    expect(rendered.container.querySelector(interactiveSelector)).toBeNull();
  });

  it("contains a throwing Story provider and renders the same visible code-native fallback", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const rendered = render(
      <GameSymbolV1
        registry={registryV1(ThrowingStorySymbolV1)}
        symbolId={symbolId}
        size={32}
        accessibleName="体力暂不可用"
      />,
    );

    expect(screen.getByRole("img", { name: "体力暂不可用" })).toBeVisible();
    expect(rendered.container.querySelector(interactiveSelector)).toBeNull();
  });
});
