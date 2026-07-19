// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import "@testing-library/jest-dom/vitest";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { GameSymbolV1, parseGameSymbolIdV1 } from "@sillymaker/ui";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { pocGameSymbolIdsV1 } from "../../content/ids.js";
import {
  pocGameSymbolIdsByRoleV1,
  pocGameSymbolProvidersV1,
  pocGameSymbolRegistryV1,
} from "./poc-game-symbols.js";

afterEach(cleanup);

describe("PoC world symbols", () => {
  it("registers the stable Story symbol tuple outside renderer namespaces", () => {
    expect(pocGameSymbolIdsV1).toHaveLength(14);
    expect(pocGameSymbolProvidersV1.map(({ symbolId }) => symbolId)).toEqual(pocGameSymbolIdsV1);
    expect(Object.isFrozen(pocGameSymbolIdsByRoleV1)).toBe(true);
    expect(Object.isFrozen(pocGameSymbolProvidersV1)).toBe(true);
    expect(Object.values(pocGameSymbolIdsByRoleV1)).toEqual(pocGameSymbolIdsV1);
    expect(pocGameSymbolProvidersV1.every(({ component }) => typeof component === "function")).toBe(
      true,
    );
    expect(
      pocGameSymbolProvidersV1.every(({ symbolId }) => !symbolId.startsWith("renderer.")),
    ).toBe(true);
  });

  it.each([16, 20, 24, 32] as const)("renders a named world symbol at %ipx", (size) => {
    render(
      <GameSymbolV1
        registry={pocGameSymbolRegistryV1}
        symbolId={pocGameSymbolIdsByRoleV1.stamina}
        size={size}
        accessibleName="体力"
      />,
    );

    const symbol = screen.getByRole("img", { name: "体力" });
    expect(symbol).toHaveStyle({ width: `${size}px`, height: `${size}px` });
    expect(symbol).toHaveAttribute("focusable", "false");
    expect(symbol).not.toHaveAttribute("tabindex");
  });

  it("supports decorative symbols and the visible named unknown-symbol fallback", () => {
    const missingSymbolId = parseGameSymbolIdV1("symbol.poc.test_missing");
    const rendered = render(
      <GameSymbolV1
        registry={pocGameSymbolRegistryV1}
        symbolId={pocGameSymbolIdsByRoleV1.ingredient}
        size={20}
        decorative
      />,
    );
    expect(rendered.container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();

    rendered.rerender(
      <GameSymbolV1
        registry={pocGameSymbolRegistryV1}
        symbolId={missingSymbolId}
        size={24}
        accessibleName="未知资源"
      />,
    );
    expect(pocGameSymbolRegistryV1.resolve(missingSymbolId)).toEqual({
      kind: "not_found",
      code: "ui.game_symbol_not_found",
    });
    expect(screen.getByRole("img", { name: "未知资源" })).toBeVisible();
  });

  it("keeps Story symbol providers code-native, noninteractive, and Lucide-free", async () => {
    const source = await readFile(resolve(import.meta.dirname, "poc-game-symbols.tsx"), "utf8");
    expect(source).not.toMatch(/lucide/iu);
    expect(source).not.toMatch(/gameplay\//u);

    for (const [index, provider] of pocGameSymbolProvidersV1.entries()) {
      const rendered = render(
        <GameSymbolV1
          registry={pocGameSymbolRegistryV1}
          symbolId={provider.symbolId}
          size={20}
          accessibleName={`世界符号 ${index}`}
        />,
      );
      expect(rendered.container.querySelector("button, a, input, [tabindex]")).toBeNull();
      rendered.unmount();
    }
  });
});
