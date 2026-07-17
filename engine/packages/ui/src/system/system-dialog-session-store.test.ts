// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";
import { createSystemDialogSessionStoreV1 } from "./system-dialog-session-store.js";

describe("createSystemDialogSessionStoreV1", () => {
  it("publishes frozen external-store snapshots with stable identity", () => {
    const store = createSystemDialogSessionStoreV1();
    const initial = store.getSnapshot();

    expect(initial).toEqual({ settingsOpen: false });
    expect(Object.isFrozen(initial)).toBe(true);
    expect(store.getSnapshot()).toBe(initial);

    store.openSettings();
    const opened = store.getSnapshot();
    expect(opened).toEqual({ settingsOpen: true });
    expect(opened).not.toBe(initial);
    expect(Object.isFrozen(opened)).toBe(true);
    expect(store.getSnapshot()).toBe(opened);

    store.closeSettings();
    const closed = store.getSnapshot();
    expect(closed).toEqual({ settingsOpen: false });
    expect(closed).not.toBe(opened);
    expect(Object.isFrozen(closed)).toBe(true);
    expect(store.getSnapshot()).toBe(closed);
  });

  it("notifies exactly once per real transition and keeps open and close idempotent", () => {
    const store = createSystemDialogSessionStoreV1();
    const notifications: boolean[] = [];
    const listener = vi.fn(() => {
      notifications.push(store.getSnapshot().settingsOpen);
    });
    const unsubscribe = store.subscribe(listener);

    const initial = store.getSnapshot();
    store.closeSettings();
    expect(store.getSnapshot()).toBe(initial);

    store.openSettings();
    const opened = store.getSnapshot();
    store.openSettings();
    expect(store.getSnapshot()).toBe(opened);

    store.closeSettings();
    const closed = store.getSnapshot();
    store.closeSettings();
    expect(store.getSnapshot()).toBe(closed);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(notifications).toEqual([true, false]);

    unsubscribe();
    store.openSettings();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
