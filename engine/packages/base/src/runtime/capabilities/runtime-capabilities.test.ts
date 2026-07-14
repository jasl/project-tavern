// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { createRuntimeCapabilityPortV1 } from "./runtime-capabilities.js";

const allDisabledV1 = Object.freeze({
  debugTools: false,
  cheats: false,
  automationBridge: false,
});

function deferredV1() {
  let resolve!: () => void;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return Object.freeze({ promise, resolve });
}

describe("Runtime capability port", () => {
  it("starts from a frozen exact state and skips unchanged persistence", async () => {
    const persist = vi.fn(async () => Object.freeze({ kind: "committed" as const }));
    const port = createRuntimeCapabilityPortV1({ initialState: allDisabledV1, persist });

    expect(port.state.getCurrent()).toEqual(allDisabledV1);
    expect(Object.isFrozen(port)).toBe(true);
    expect(Object.isFrozen(port.state.getCurrent())).toBe(true);
    expect(port.state).not.toHaveProperty("publish");
    await expect(port.setEnabled("debug_tools", false)).resolves.toEqual({
      kind: "unchanged",
      state: allDisabledV1,
    });
    expect(persist).not.toHaveBeenCalled();
  });

  it("publishes one committed immutable preference", async () => {
    const persist = vi.fn(async () => Object.freeze({ kind: "committed" as const }));
    const port = createRuntimeCapabilityPortV1({ initialState: allDisabledV1, persist });
    const listener = vi.fn();
    port.state.subscribe(listener);

    const result = await port.setEnabled("debug_tools", true);

    expect(persist).toHaveBeenCalledOnce();
    expect(persist).toHaveBeenCalledWith(
      allDisabledV1,
      Object.freeze({ debugTools: true, cheats: false, automationBridge: false }),
    );
    expect(result).toEqual({
      kind: "updated",
      state: { debugTools: true, cheats: false, automationBridge: false },
    });
    expect(result.state).toBe(port.state.getCurrent());
    expect(Object.isFrozen(result.state)).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("serializes same-port writes and evaluates unchanged inside the FIFO", async () => {
    const first = deferredV1();
    const observations: unknown[] = [];
    const persist = vi.fn(async (previous: unknown, next: unknown) => {
      observations.push(Object.freeze({ previous, next }));
      if (observations.length === 1) await first.promise;
      return Object.freeze({ kind: "committed" as const });
    });
    const port = createRuntimeCapabilityPortV1({ initialState: allDisabledV1, persist });

    const enableDebug = port.setEnabled("debug_tools", true);
    const enableCheats = port.setEnabled("cheats", true);
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    first.resolve();
    await expect(Promise.all([enableDebug, enableCheats])).resolves.toMatchObject([
      { kind: "updated" },
      { kind: "updated" },
    ]);

    expect(observations).toEqual([
      {
        previous: allDisabledV1,
        next: { debugTools: true, cheats: false, automationBridge: false },
      },
      {
        previous: { debugTools: true, cheats: false, automationBridge: false },
        next: { debugTools: true, cheats: true, automationBridge: false },
      },
    ]);
  });

  it("publishes conflict state and converts storage faults to unavailable", async () => {
    const conflictState = Object.freeze({
      debugTools: false,
      cheats: false,
      automationBridge: true,
    });
    const conflict = createRuntimeCapabilityPortV1({
      initialState: allDisabledV1,
      persist: async () => Object.freeze({ kind: "conflict" as const, state: conflictState }),
    });
    await expect(conflict.setEnabled("debug_tools", true)).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
      state: conflictState,
    });
    expect(conflict.state.getCurrent()).toEqual(conflictState);

    const unavailable = createRuntimeCapabilityPortV1({
      initialState: allDisabledV1,
      persist: async () => {
        throw new Error("storage offline");
      },
    });
    await expect(unavailable.setEnabled("debug_tools", true)).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
      state: allDisabledV1,
    });
    expect(unavailable.state.getCurrent()).toEqual(allDisabledV1);
  });

  it("settles a failed write without poisoning the following FIFO operation", async () => {
    let calls = 0;
    const port = createRuntimeCapabilityPortV1({
      initialState: allDisabledV1,
      persist: async () => {
        calls += 1;
        if (calls === 1) throw new Error("first write failed");
        return Object.freeze({ kind: "committed" as const });
      },
    });

    await expect(port.setEnabled("debug_tools", true)).resolves.toMatchObject({
      kind: "rejected",
      code: "unavailable",
    });
    await expect(port.setEnabled("cheats", true)).resolves.toMatchObject({ kind: "updated" });
    expect(port.state.getCurrent()).toEqual({
      debugTools: false,
      cheats: true,
      automationBridge: false,
    });
  });

  it("rejects malformed programmer inputs without opening persistence", async () => {
    const persist = vi.fn(async () => Object.freeze({ kind: "committed" as const }));
    const port = createRuntimeCapabilityPortV1({ initialState: allDisabledV1, persist });

    await expect(port.setEnabled("unknown" as never, true)).rejects.toBeInstanceOf(TypeError);
    await expect(port.setEnabled("debug_tools", 1 as never)).rejects.toBeInstanceOf(TypeError);
    expect(persist).not.toHaveBeenCalled();
    expect(port.state.getCurrent()).toEqual(allDisabledV1);
  });
});
