// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import {
  createHashRouterV1,
  type HashRouterEventTargetV1,
  type HashRouterLocationV1,
} from "./hash-router.js";

function createHashEnvironmentV1(initialHash: string) {
  let hash = initialHash;
  const pathname = "/project-tavern/preview/";
  const listeners = new Set<() => void>();
  const replace = vi.fn((nextHash: string) => {
    hash = nextHash;
  });
  const addEventListener = vi.fn((type: "hashchange", listener: () => void) => {
    if (type !== "hashchange") throw new TypeError(`unexpected event type ${type}`);
    listeners.add(listener);
  });
  const removeEventListener = vi.fn((type: "hashchange", listener: () => void) => {
    if (type !== "hashchange") throw new TypeError(`unexpected event type ${type}`);
    listeners.delete(listener);
  });
  const location = Object.freeze({
    get hash() {
      return hash;
    },
    pathname,
    replace,
  }) satisfies HashRouterLocationV1 & { readonly pathname: string };
  const eventTarget = Object.freeze({
    addEventListener,
    removeEventListener,
  }) satisfies HashRouterEventTargetV1;

  return Object.freeze({
    location,
    eventTarget,
    replace,
    addEventListener,
    removeEventListener,
    setHash(nextHash: string) {
      hash = nextHash;
    },
    emitHashChange() {
      for (const listener of [...listeners]) listener();
    },
    listenerCount: () => listeners.size,
  });
}

describe("createHashRouterV1", () => {
  it.each([
    ["#/", "main_menu"],
    ["#/play", "play"],
  ] as const)("maps the canonical %s hash to %s", (hash, route) => {
    const fixture = createHashEnvironmentV1(hash);
    const router = createHashRouterV1({
      location: fixture.location,
      eventTarget: fixture.eventTarget,
    });

    expect(router.observe()).toEqual({ route, hash });
    expect(Object.isFrozen(router.observe())).toBe(true);
    expect(Object.isFrozen(router)).toBe(true);
    expect(fixture.replace).not.toHaveBeenCalled();
    expect(fixture.addEventListener).toHaveBeenCalledOnce();
    expect(fixture.listenerCount()).toBe(1);

    router.dispose();
  });

  it.each([
    "",
    "#",
    "play",
    "#/unknown",
    "#//play",
    "#/play/",
    "#/?mode=play",
    "#/play?mode=test",
    "#/%70lay",
    "#/%",
  ])("synchronously replaces the non-canonical hash %j without touching pathname", (hash) => {
    const fixture = createHashEnvironmentV1(hash);
    const pathname = fixture.location.pathname;

    const router = createHashRouterV1({
      location: fixture.location,
      eventTarget: fixture.eventTarget,
    });

    expect(fixture.replace).toHaveBeenCalledOnce();
    expect(fixture.replace).toHaveBeenCalledWith("#/");
    expect(fixture.location.pathname).toBe(pathname);
    expect(router.observe()).toEqual({ route: "main_menu", hash: "#/" });

    router.dispose();
  });

  it("uses one native listener and notifies subscribers only for distinct publications", () => {
    const fixture = createHashEnvironmentV1("#/");
    const router = createHashRouterV1({
      location: fixture.location,
      eventTarget: fixture.eventTarget,
    });
    const initial = router.observe();
    const listener = vi.fn();
    const unsubscribe = router.subscribe(listener);

    fixture.setHash("#/play");
    fixture.emitHashChange();
    const play = router.observe();
    expect(play).toEqual({ route: "play", hash: "#/play" });
    expect(play).not.toBe(initial);
    expect(listener).toHaveBeenCalledOnce();

    fixture.emitHashChange();
    expect(router.observe()).toBe(play);
    expect(listener).toHaveBeenCalledOnce();

    fixture.setHash("#/unknown");
    fixture.emitHashChange();
    const recovered = router.observe();
    expect(fixture.replace).toHaveBeenCalledWith("#/");
    expect(recovered).toEqual({ route: "main_menu", hash: "#/" });
    expect(listener).toHaveBeenCalledTimes(2);

    fixture.emitHashChange();
    expect(router.observe()).toBe(recovered);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(fixture.addEventListener).toHaveBeenCalledOnce();

    unsubscribe();
    unsubscribe();
    fixture.setHash("#/play");
    fixture.emitHashChange();
    expect(router.observe()).toEqual({ route: "play", hash: "#/play" });
    expect(listener).toHaveBeenCalledTimes(2);

    router.dispose();
  });

  it("disposes the native listener and every subscription exactly once", () => {
    const fixture = createHashEnvironmentV1("#/");
    const router = createHashRouterV1({
      location: fixture.location,
      eventTarget: fixture.eventTarget,
    });
    const initial = router.observe();
    const listener = vi.fn();
    const unsubscribe = router.subscribe(listener);

    router.dispose();
    router.dispose();
    unsubscribe();
    unsubscribe();

    expect(fixture.removeEventListener).toHaveBeenCalledOnce();
    expect(fixture.listenerCount()).toBe(0);
    fixture.setHash("#/play");
    fixture.emitHashChange();
    expect(router.observe()).toBe(initial);
    expect(listener).not.toHaveBeenCalled();

    const lateListener = vi.fn();
    const unsubscribeLate = router.subscribe(lateListener);
    unsubscribeLate();
    unsubscribeLate();
    fixture.emitHashChange();
    expect(lateListener).not.toHaveBeenCalled();
  });
});
