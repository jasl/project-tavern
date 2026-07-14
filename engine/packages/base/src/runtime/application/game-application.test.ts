// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  createCapabilityDisabledDebugToolsPortV1,
  createGameApplicationV1,
} from "./game-application.js";

describe("Game Application composition", () => {
  it("freezes one exact six-port application without replacing injected identities", () => {
    const ports = Object.freeze({
      semantic: Object.freeze({ kind: "semantic" }),
      lifecycle: Object.freeze({ kind: "lifecycle" }),
      persistence: Object.freeze({ kind: "persistence" }),
      diagnostics: Object.freeze({ kind: "diagnostics" }),
      capabilities: Object.freeze({ kind: "capabilities" }),
      debugTools: Object.freeze({ kind: "debugTools" }),
    });
    const application = createGameApplicationV1(
      Object.freeze({ ...ports, snapshot: Object.freeze({ forbidden: true }) }),
    );

    expect(Object.keys(application).sort()).toEqual([
      "capabilities",
      "debugTools",
      "diagnostics",
      "lifecycle",
      "persistence",
      "semantic",
    ]);
    expect(Object.isFrozen(application)).toBe(true);
    expect(application).not.toHaveProperty("snapshot");
    for (const key of Object.keys(ports) as (keyof typeof ports)[]) {
      expect(application[key]).toBe(ports[key]);
    }
  });

  it("resolves the same frozen capability-disabled result from every DebugTools method", async () => {
    const debugTools = createCapabilityDisabledDebugToolsPortV1<
      string,
      never,
      string,
      never,
      never,
      never,
      never,
      never,
      never
    >();
    const bytes = new Uint8Array();
    const results = await Promise.all([
      debugTools.listFixtures(),
      debugTools.executeDebugCommand("debug.command"),
      debugTools.anchorFixture("fixture.one"),
      debugTools.inspectDebugBundle(bytes),
      debugTools.anchorDebugBundle(bytes),
      debugTools.replayAuthoritatively(bytes),
      debugTools.inspectReplayBestEffort(bytes),
      debugTools.queryDiagnostics(undefined as never),
    ]);

    expect(Object.isFrozen(debugTools)).toBe(true);
    for (const result of results) {
      expect(result).toEqual({ kind: "capability_disabled" });
      expect(result).toBe(results[0]);
      expect(Object.isFrozen(result)).toBe(true);
    }
  });
});
