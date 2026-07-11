// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { createUiContributionRegistryV1 } from "./registry.js";

describe("UI contribution registry", () => {
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
