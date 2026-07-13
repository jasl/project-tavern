// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { parseNonZeroUint32 } from "@sillymaker/base";
import { createFixedBootstrapEntropyV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import { sandboxStoryEntryV1 } from "./story-entry.js";
import { createSandboxSessionV1 } from "./session.js";

describe("Sandbox walking skeleton", () => {
  it("changes state only through one typed command", async () => {
    const resolved = resolveStoryForTestV1(sandboxStoryEntryV1);
    const entropy = createFixedBootstrapEntropyV1({
      uuids: ["00000000-0000-4000-8000-000000000001"],
      seeds: [parseNonZeroUint32(0x0002_3049)],
    });
    const session = createSandboxSessionV1(
      resolved.gameSimulation,
      resolved.gameSimulation.createBootstrapInput(entropy),
    );
    const pending = session.dispatch({ kind: "sandbox.counter.increment" });
    expect(session.getStatus()).toBe("busy");
    await expect(pending).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    expect(session.getCurrentSnapshot().state.simulation.counter.value).toBe(1);
    expect(resolved.presentation.textCatalogs.catalogs[0]?.entries).toContainEqual({
      textId: "text.sandbox.counter",
      text: "计数",
    });
    const counterAsset = resolved.assets.assets.find(
      (asset) => asset.assetId === "asset.sandbox.counter",
    );
    expect(counterAsset?.delivery).toBe("code_fallback");
  });
});
