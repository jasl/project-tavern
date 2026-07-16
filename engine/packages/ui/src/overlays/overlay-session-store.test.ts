// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";
import {
  createOverlaySessionStoreV1,
  maximumOverlayDetailDepthV1,
} from "./overlay-session-store.js";

describe("createOverlaySessionStoreV1", () => {
  it("keeps one primary Overlay and at most four ordered details", () => {
    const store = createOverlaySessionStoreV1<string>();
    store.openPrimary("inventory");
    expect(store.pushDetail("ingredient-1")).toEqual({ kind: "opened" });
    expect(store.pushDetail("source-1")).toEqual({ kind: "opened" });
    expect(store.pushDetail("supplier-1")).toEqual({ kind: "opened" });
    expect(store.pushDetail("history-1")).toEqual({ kind: "opened" });

    const beforeRejection = store.getSnapshot();
    expect(store.pushDetail("fifth-detail")).toEqual({
      kind: "rejected",
      code: "detail_limit",
    });
    expect(store.getSnapshot()).toBe(beforeRejection);
    expect(store.getSnapshot()).toEqual({
      primaryId: "inventory",
      detailIds: ["ingredient-1", "source-1", "supplier-1", "history-1"],
    });
    expect(maximumOverlayDetailDepthV1).toBe(4);
  });

  it("publishes deeply frozen external-store snapshots with stable identity", () => {
    const store = createOverlaySessionStoreV1<string>();
    const initial = store.getSnapshot();

    expect(store.getSnapshot()).toBe(initial);
    expect(Object.isFrozen(initial)).toBe(true);
    expect(Object.isFrozen(initial.detailIds)).toBe(true);
    expect(Object.isFrozen(store)).toBe(true);

    store.openPrimary("inventory");
    const opened = store.getSnapshot();
    expect(opened).not.toBe(initial);
    expect(store.getSnapshot()).toBe(opened);
    expect(Object.isFrozen(opened)).toBe(true);
    expect(Object.isFrozen(opened.detailIds)).toBe(true);
  });

  it("rejects details without a primary and duplicate IDs across the whole stack", () => {
    const store = createOverlaySessionStoreV1<string>();

    expect(store.pushDetail("ingredient")).toEqual({
      kind: "rejected",
      code: "no_primary",
    });
    store.openPrimary("inventory");
    expect(store.pushDetail("inventory")).toEqual({
      kind: "rejected",
      code: "duplicate",
    });
    expect(store.pushDetail("ingredient")).toEqual({ kind: "opened" });
    expect(store.pushDetail("ingredient")).toEqual({
      kind: "rejected",
      code: "duplicate",
    });
  });

  it("replaces a primary and clears every detail in one publication", () => {
    const store = createOverlaySessionStoreV1<string>();
    const listener = vi.fn();
    store.subscribe(listener);
    store.openPrimary("inventory");
    store.pushDetail("ingredient");
    store.pushDetail("supplier");
    listener.mockClear();

    store.openPrimary("ledger");

    expect(listener).toHaveBeenCalledOnce();
    expect(store.getSnapshot()).toEqual({ primaryId: "ledger", detailIds: [] });
  });

  it("closes details from the top before closing the primary", () => {
    const store = createOverlaySessionStoreV1<string>();
    store.openPrimary("inventory");
    store.pushDetail("ingredient");
    store.pushDetail("supplier");

    expect(store.closeTop()).toBe("detail_closed");
    expect(store.getSnapshot()).toEqual({
      primaryId: "inventory",
      detailIds: ["ingredient"],
    });
    expect(store.closeTop()).toBe("detail_closed");
    expect(store.closeTop()).toBe("primary_closed");
    expect(store.getSnapshot()).toEqual({ primaryId: null, detailIds: [] });
    expect(store.closeTop()).toBe("already_closed");
  });

  it("supports idempotent subscription cleanup and no-op closeAll", () => {
    const store = createOverlaySessionStoreV1<string>();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.closeAll();
    expect(listener).not.toHaveBeenCalled();
    store.openPrimary("inventory");
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    unsubscribe();
    store.closeAll();
    expect(listener).toHaveBeenCalledOnce();
  });

  it("returns frozen opened and rejected results", () => {
    const store = createOverlaySessionStoreV1<string>();
    const rejected = store.pushDetail("detail");
    store.openPrimary("primary");
    const opened = store.pushDetail("detail");

    expect(Object.isFrozen(rejected)).toBe(true);
    expect(Object.isFrozen(opened)).toBe(true);
  });
});
