// SPDX-License-Identifier: MIT
import {
  parseInteractionSurfaceId,
  parseInteractionTargetId,
  type DeepReadonly,
} from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import {
  createInteractionSessionStoreV1,
  initialInteractionSessionStateV1,
  type InteractionSessionStateV1,
} from "./interaction-session-store.js";

interface TestPresentationUiStateV1 {
  readonly route: "main_menu" | "play";
  readonly primaryOverlayId: string | null;
  readonly interaction: InteractionSessionStateV1;
  readonly activeCueId: string | null;
}

type InteractionStateReducerV1 = (
  current: DeepReadonly<InteractionSessionStateV1>,
) => DeepReadonly<InteractionSessionStateV1>;

const stageSurfaceIdV1 = parseInteractionSurfaceId("surface.e2e.stage");
const detailSurfaceIdV1 = parseInteractionSurfaceId("surface.e2e.detail");
const alphaTargetIdV1 = parseInteractionTargetId("target.e2e.alpha");

function interactionStateV1(
  input: {
    readonly activeSurfaceId?: InteractionSessionStateV1["activeSurfaceId"];
    readonly choosingTargetId?: InteractionSessionStateV1["choosingTargetId"];
    readonly returnFocusId?: string | null;
  } = {},
): DeepReadonly<InteractionSessionStateV1> {
  return Object.freeze({
    activeSurfaceId: input.activeSurfaceId ?? null,
    choosingTargetId: input.choosingTargetId ?? null,
    returnFocusId: input.returnFocusId ?? null,
  });
}

function presentationUiStateV1(
  input: {
    readonly route?: TestPresentationUiStateV1["route"];
    readonly primaryOverlayId?: string | null;
    readonly interaction?: DeepReadonly<InteractionSessionStateV1>;
    readonly activeCueId?: string | null;
  } = {},
): DeepReadonly<TestPresentationUiStateV1> {
  return Object.freeze({
    route: input.route ?? "play",
    primaryOverlayId: input.primaryOverlayId ?? null,
    interaction: input.interaction ?? initialInteractionSessionStateV1,
    activeCueId: input.activeCueId ?? null,
  });
}

function createPresentationUiStateFixtureV1(
  initial: DeepReadonly<TestPresentationUiStateV1> = presentationUiStateV1(),
) {
  let current = initial;
  let subscribeCalls = 0;
  let unsubscribeCalls = 0;
  let updateCalls = 0;
  const reducerInputs: Array<DeepReadonly<InteractionSessionStateV1>> = [];
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const interactionLens = Object.freeze({
    getSnapshot: () => current.interaction,
    subscribe(listener: () => void): () => void {
      subscribeCalls += 1;
      listeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        unsubscribeCalls += 1;
        listeners.delete(listener);
      };
    },
    update(reducer: InteractionStateReducerV1): void {
      const reducerInput = current.interaction;
      reducerInputs.push(reducerInput);
      const interaction = reducer(reducerInput);
      updateCalls += 1;
      current = Object.freeze({ ...current, interaction });
      notify();
    },
  });

  return Object.freeze({
    interactionLens,
    current: () => current,
    publish(value: DeepReadonly<TestPresentationUiStateV1>): void {
      current = value;
      notify();
    },
    reducerInputs: () => Object.freeze([...reducerInputs]),
    subscribeCalls: () => subscribeCalls,
    unsubscribeCalls: () => unsubscribeCalls,
    updateCalls: () => updateCalls,
  });
}

describe("createInteractionSessionStoreV1", () => {
  it("reads and subscribes through the supplied application-state lens without a second store", () => {
    const fixture = createPresentationUiStateFixtureV1();
    const store = createInteractionSessionStoreV1(fixture.interactionLens);

    expect(fixture.subscribeCalls()).toBe(0);
    expect(store.getSnapshot()).toBe(fixture.current().interaction);

    const externallyOpened = interactionStateV1({
      activeSurfaceId: detailSurfaceIdV1,
      returnFocusId: "control.external.detail",
    });
    fixture.publish(
      presentationUiStateV1({
        route: "main_menu",
        primaryOverlayId: "overlay.e2e.external",
        interaction: externallyOpened,
        activeCueId: "cue.e2e.external",
      }),
    );
    expect(store.getSnapshot()).toBe(externallyOpened);

    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    expect(fixture.subscribeCalls()).toBe(1);

    const externallyReplaced = interactionStateV1({
      activeSurfaceId: stageSurfaceIdV1,
      choosingTargetId: alphaTargetIdV1,
      returnFocusId: "control.external.stage",
    });
    fixture.publish(presentationUiStateV1({ interaction: externallyReplaced }));
    expect(listener).toHaveBeenCalledOnce();
    expect(store.getSnapshot()).toBe(externallyReplaced);

    unsubscribe();
    unsubscribe();
    fixture.publish(presentationUiStateV1());
    expect(listener).toHaveBeenCalledOnce();
    expect(fixture.unsubscribeCalls()).toBe(1);
    expect(Object.isFrozen(store)).toBe(true);
  });

  it("opens, opens a choice atomically, and leaves while preserving sibling UI state", () => {
    const fixture = createPresentationUiStateFixtureV1(
      presentationUiStateV1({
        primaryOverlayId: "overlay.e2e.inventory",
        activeCueId: "cue.e2e.ambient",
      }),
    );
    const store = createInteractionSessionStoreV1(fixture.interactionLens);
    const initialApplicationState = fixture.current();

    store.open(stageSurfaceIdV1, "control.e2e.heroine");
    const opened = store.getSnapshot();
    expect(opened).toEqual({
      activeSurfaceId: stageSurfaceIdV1,
      choosingTargetId: null,
      returnFocusId: "control.e2e.heroine",
    });
    expect(Object.isFrozen(opened)).toBe(true);
    expect(fixture.reducerInputs()).toEqual([initialApplicationState.interaction]);
    expect(fixture.current()).toMatchObject({
      route: "play",
      primaryOverlayId: "overlay.e2e.inventory",
      activeCueId: "cue.e2e.ambient",
    });

    fixture.publish(
      presentationUiStateV1({
        primaryOverlayId: "overlay.e2e.settings",
        interaction: opened,
        activeCueId: "cue.e2e.external",
      }),
    );
    const writesBeforeOpenChoice = fixture.updateCalls();
    store.openChoice(detailSurfaceIdV1, alphaTargetIdV1, "control.e2e.choice");
    const choosing = store.getSnapshot();
    expect(choosing).toEqual({
      activeSurfaceId: detailSurfaceIdV1,
      choosingTargetId: alphaTargetIdV1,
      returnFocusId: "control.e2e.choice",
    });
    expect(Object.isFrozen(choosing)).toBe(true);
    expect(fixture.updateCalls()).toBe(writesBeforeOpenChoice + 1);
    expect(fixture.reducerInputs().at(-1)).toBe(opened);
    expect(fixture.current()).toMatchObject({
      primaryOverlayId: "overlay.e2e.settings",
      activeCueId: "cue.e2e.external",
    });

    expect(store.leave()).toBe("control.e2e.choice");
    expect(store.getSnapshot()).toEqual(initialInteractionSessionStateV1);
    expect(Object.isFrozen(store.getSnapshot())).toBe(true);
    expect(fixture.current()).toMatchObject({
      primaryOverlayId: "overlay.e2e.settings",
      activeCueId: "cue.e2e.external",
    });
    expect(fixture.updateCalls()).toBe(3);
  });

  it("accepts a null return-focus owner without inventing a DOM identity", () => {
    const fixture = createPresentationUiStateFixtureV1();
    const store = createInteractionSessionStoreV1(fixture.interactionLens);

    store.open(stageSurfaceIdV1, null);

    expect(store.getSnapshot().returnFocusId).toBeNull();
    expect(store.leave()).toBeNull();
    expect(store.getSnapshot()).toEqual(initialInteractionSessionStateV1);
  });

  it.each(["pointer_cancel", "focus_loss", "stage_scene_replaced"] as const)(
    "clears the complete transient interaction state after %s",
    (reason) => {
      const fixture = createPresentationUiStateFixtureV1();
      const store = createInteractionSessionStoreV1(fixture.interactionLens);
      store.openChoice(detailSurfaceIdV1, alphaTargetIdV1, "control.e2e.detail");
      const beforeCleanupWrites = fixture.updateCalls();

      store.cleanup(reason);

      expect(fixture.updateCalls()).toBe(beforeCleanupWrites + 1);
      expect(store.getSnapshot()).toEqual(initialInteractionSessionStateV1);
      expect(Object.isFrozen(store.getSnapshot())).toBe(true);
      expect(fixture.current().interaction).toBe(store.getSnapshot());
    },
  );
});
