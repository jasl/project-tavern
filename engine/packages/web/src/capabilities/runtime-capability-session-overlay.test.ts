// SPDX-License-Identifier: MIT
import type {
  DeepReadonly,
  RuntimeCapabilitiesV1,
  RuntimeCapabilityIdV1,
  RuntimeCapabilityOperationResultV1,
  RuntimeCapabilityPortV1,
} from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import { createRuntimeCapabilitySessionOverlayV1 } from "./runtime-capability-session-overlay.js";

const capabilityFieldsV1 = Object.freeze({
  debug_tools: "debugTools",
  cheats: "cheats",
  automation_bridge: "automationBridge",
} satisfies Record<RuntimeCapabilityIdV1, keyof RuntimeCapabilitiesV1>);

function freezeStateV1(state: RuntimeCapabilitiesV1): DeepReadonly<RuntimeCapabilitiesV1> {
  return Object.freeze({ ...state });
}

function createCapabilityPreferenceFixtureV1(initial: RuntimeCapabilitiesV1) {
  let current = freezeStateV1(initial);
  const listeners = new Set<() => void>();
  const writes: { readonly capability: RuntimeCapabilityIdV1; readonly enabled: boolean }[] = [];
  let subscribeCount = 0;
  let unsubscribeCount = 0;
  const publish = (next: RuntimeCapabilitiesV1): void => {
    current = freezeStateV1(next);
    for (const listener of [...listeners]) listener();
  };
  const port: RuntimeCapabilityPortV1 = Object.freeze({
    state: Object.freeze({
      getCurrent: () => current,
      subscribe(listener: () => void) {
        subscribeCount += 1;
        listeners.add(listener);
        let subscribed = true;
        return () => {
          if (!subscribed) return;
          subscribed = false;
          unsubscribeCount += 1;
          listeners.delete(listener);
        };
      },
    }),
    async setEnabled(capability: RuntimeCapabilityIdV1, enabled: boolean) {
      writes.push(Object.freeze({ capability, enabled }));
      const field = capabilityFieldsV1[capability];
      if (current[field] === enabled) {
        return Object.freeze({ kind: "unchanged" as const, state: current });
      }
      publish({ ...current, [field]: enabled });
      return Object.freeze({ kind: "updated" as const, state: current });
    },
  });
  return Object.freeze({
    port,
    publish,
    writes: () => [...writes],
    subscribeCount: () => subscribeCount,
    unsubscribeCount: () => unsubscribeCount,
    listenerCount: () => listeners.size,
  });
}

describe("runtime capability session overlay", () => {
  it("applies persisted OR requested for all fields without an initial persisted write", async () => {
    const persisted = createCapabilityPreferenceFixtureV1({
      debugTools: false,
      cheats: true,
      automationBridge: false,
    });
    const overlay = createRuntimeCapabilitySessionOverlayV1(persisted.port, [
      "debug_tools",
      "automation_bridge",
    ]);

    expect(overlay.persisted).toBe(persisted.port);
    expect(overlay.sessionRequested).toEqual(["debug_tools", "automation_bridge"]);
    expect(Object.isFrozen(overlay.sessionRequested)).toBe(true);
    expect(overlay.state.getCurrent()).toEqual({
      debugTools: true,
      cheats: true,
      automationBridge: true,
    });
    expect(persisted.writes()).toEqual([]);

    await expect(overlay.setEnabled("debug_tools", false)).resolves.toEqual({
      kind: "unchanged",
      state: { debugTools: true, cheats: true, automationBridge: true },
    });
    expect(persisted.writes()).toEqual([{ capability: "debug_tools", enabled: false }]);
  });

  it("preserves persisted true values when the requested set is absent", () => {
    const persisted = createCapabilityPreferenceFixtureV1({
      debugTools: true,
      cheats: false,
      automationBridge: true,
    });

    const overlay = createRuntimeCapabilitySessionOverlayV1(persisted.port, []);

    expect(overlay.state.getCurrent()).toEqual(persisted.port.state.getCurrent());
    expect(overlay.sessionRequested).toEqual([]);
  });

  it("copies the requested IDs before freezing its page-session authority", () => {
    const persisted = createCapabilityPreferenceFixtureV1({
      debugTools: false,
      cheats: false,
      automationBridge: false,
    });
    const requested: RuntimeCapabilityIdV1[] = ["debug_tools"];
    const overlay = createRuntimeCapabilitySessionOverlayV1(persisted.port, requested);

    requested[0] = "cheats";

    expect(overlay.sessionRequested).toEqual(["debug_tools"]);
    expect(overlay.state.getCurrent()).toEqual({
      debugTools: true,
      cheats: false,
      automationBridge: false,
    });
  });

  it("maps every persisted operation result state through the effective OR view", async () => {
    const persisted = createCapabilityPreferenceFixtureV1({
      debugTools: false,
      cheats: false,
      automationBridge: false,
    });
    const results: RuntimeCapabilityOperationResultV1[] = [
      Object.freeze({
        kind: "updated" as const,
        state: freezeStateV1({ debugTools: false, cheats: true, automationBridge: false }),
      }),
      Object.freeze({
        kind: "unchanged" as const,
        state: freezeStateV1({ debugTools: false, cheats: false, automationBridge: false }),
      }),
      Object.freeze({
        kind: "rejected" as const,
        code: "conflict" as const,
        state: freezeStateV1({ debugTools: false, cheats: true, automationBridge: false }),
      }),
      Object.freeze({
        kind: "rejected" as const,
        code: "unavailable" as const,
        state: freezeStateV1({ debugTools: false, cheats: false, automationBridge: false }),
      }),
    ];
    const setEnabled = vi.fn<RuntimeCapabilityPortV1["setEnabled"]>(async () => {
      const result = results.shift();
      if (result === undefined) throw new Error("missing result fixture");
      return result;
    });
    const port = Object.freeze({ ...persisted.port, setEnabled });
    const overlay = createRuntimeCapabilitySessionOverlayV1(port, ["debug_tools"]);

    await expect(overlay.setEnabled("cheats", true)).resolves.toEqual({
      kind: "updated",
      state: { debugTools: true, cheats: true, automationBridge: false },
    });
    await expect(overlay.setEnabled("cheats", false)).resolves.toEqual({
      kind: "unchanged",
      state: { debugTools: true, cheats: false, automationBridge: false },
    });
    await expect(overlay.setEnabled("cheats", true)).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
      state: { debugTools: true, cheats: true, automationBridge: false },
    });
    await expect(overlay.setEnabled("cheats", false)).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
      state: { debugTools: true, cheats: false, automationBridge: false },
    });
  });

  it("suppresses persisted updates masked by a session request and isolates listeners", () => {
    const persisted = createCapabilityPreferenceFixtureV1({
      debugTools: true,
      cheats: false,
      automationBridge: false,
    });
    const overlay = createRuntimeCapabilitySessionOverlayV1(persisted.port, ["debug_tools"]);
    const first = vi.fn(() => {
      throw new Error("listener failed");
    });
    const second = vi.fn();
    overlay.state.subscribe(first);
    overlay.state.subscribe(second);

    persisted.publish({ debugTools: false, cheats: false, automationBridge: false });
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();

    persisted.publish({ debugTools: false, cheats: true, automationBridge: false });
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    expect(overlay.state.getCurrent()).toEqual({
      debugTools: true,
      cheats: true,
      automationBridge: false,
    });
  });

  it("disposes its persisted subscription and listeners exactly once", () => {
    const persisted = createCapabilityPreferenceFixtureV1({
      debugTools: false,
      cheats: false,
      automationBridge: false,
    });
    const overlay = createRuntimeCapabilitySessionOverlayV1(persisted.port, []);
    const listener = vi.fn();
    overlay.state.subscribe(listener);

    expect(persisted.subscribeCount()).toBe(1);
    expect(persisted.listenerCount()).toBe(1);
    overlay.dispose();
    overlay.dispose();

    expect(persisted.unsubscribeCount()).toBe(1);
    expect(persisted.listenerCount()).toBe(0);
    persisted.publish({ debugTools: true, cheats: true, automationBridge: true });
    expect(listener).not.toHaveBeenCalled();
    expect(overlay.state.getCurrent()).toEqual({
      debugTools: false,
      cheats: false,
      automationBridge: false,
    });
  });
});
