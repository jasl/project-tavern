// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { createUiContributionRegistryV1 } from "./registry.js";

describe("UI contribution registry", () => {
  it("uses only the narrow view slice, semantic port, and presentation in render context", () => {
    const seen: unknown[] = [];
    const registry = createUiContributionRegistryV1<
      { readonly count: number },
      { dispatch(): void },
      { readonly label: string }
    >({
      scenes: [
        {
          id: "renderer.test.scene",
          render(context) {
            seen.push(Object.keys(context));
            return null;
          },
        },
      ],
      overlays: [],
      hud: [],
      gameSymbols: [],
    });

    const rendered = registry.scenes.get("renderer.test.scene")?.render({
      viewSlice: { count: 1 },
      semantic: { dispatch() {} },
      presentation: { label: "计数" },
    });

    expect(rendered).toBeNull();
    expect(seen).toEqual([["viewSlice", "semantic", "presentation"]]);
  });

  it("rejects duplicate IDs across contribution namespaces", () => {
    expect(() =>
      createUiContributionRegistryV1({
        scenes: [{ id: "counter", render: () => null }],
        overlays: [],
        hud: [{ id: "counter", render: () => null }],
        gameSymbols: [],
      }),
    ).toThrow(/duplicate/u);
  });
});
