// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type { DeepReadonly, SemanticPublicationV1 } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";
import { createSemanticPublicationBridgeV1 } from "./semantic-publication-bridge.js";
import type { SemanticPublicationSourceV1 } from "./semantic-publication-bridge.js";

interface TestGameViewV1 {
  readonly count: number;
}

interface TestNarrativeViewV1 {
  readonly nodeId: string;
}

interface TestActionDescriptorV1 {
  readonly actionId: "action.test.increment";
  readonly enabled: boolean;
}

type TestStatusV1 = "busy" | "ready";
type TestPublicationV1 = DeepReadonly<
  SemanticPublicationV1<TestGameViewV1, TestNarrativeViewV1, TestActionDescriptorV1, TestStatusV1>
>;

function createPublicationV1(
  revision: number,
  status: TestStatusV1,
  references?: {
    readonly game: TestPublicationV1["game"];
    readonly narrative: TestPublicationV1["narrative"];
    readonly actions: TestPublicationV1["actions"];
  },
): TestPublicationV1 {
  const game = references?.game ?? Object.freeze({ count: revision });
  const narrative = references?.narrative ?? Object.freeze({ nodeId: `node.${revision}` });
  const actions =
    references?.actions ??
    Object.freeze([Object.freeze({ actionId: "action.test.increment" as const, enabled: true })]);
  return Object.freeze({
    revision: parseNonNegativeSafeInteger(revision),
    status,
    game,
    narrative,
    actions,
  });
}

function createSemanticPublicationSourceFixtureV1(initial: TestPublicationV1) {
  let publication = initial;
  const listeners = new Set<() => void>();
  const subscriberFailures: unknown[] = [];
  const sourceUnsubscribers: ReturnType<typeof vi.fn<() => void>>[] = [];
  const observe = vi.fn(() => publication);
  const availableActions = vi.fn(() => publication.actions);
  const subscribe = vi.fn((listener: () => void) => {
    listeners.add(listener);
    let active = true;
    const unsubscribe = vi.fn(() => {
      if (!active) return;
      active = false;
      listeners.delete(listener);
    });
    sourceUnsubscribers.push(unsubscribe);
    return unsubscribe;
  });
  const source = Object.freeze({
    observe,
    subscribe,
    availableActions,
  }) satisfies SemanticPublicationSourceV1<TestPublicationV1> & {
    readonly availableActions: typeof availableActions;
  };

  return {
    source,
    subscriberFailures,
    sourceUnsubscribers,
    publish(next: TestPublicationV1): void {
      publication = next;
      for (const listener of [...listeners]) {
        try {
          listener();
        } catch (error) {
          subscriberFailures.push(error);
        }
      }
    },
    listenerCount(): number {
      return listeners.size;
    },
  };
}

describe("createSemanticPublicationBridgeV1", () => {
  it("observes the initial complete publication as the exact source reference", () => {
    const publication0 = createPublicationV1(0, "ready");
    const fixture = createSemanticPublicationSourceFixtureV1(publication0);
    const bridge = createSemanticPublicationBridgeV1(fixture.source);

    expect(bridge.getSnapshot()).toBe(publication0);
    expect(bridge.getSnapshot().game).toBe(publication0.game);
    expect(bridge.getSnapshot().narrative).toBe(publication0.narrative);
    expect(bridge.getSnapshot().actions).toBe(publication0.actions);
    expect(fixture.source.availableActions).not.toHaveBeenCalled();

    bridge.dispose();
  });

  it("publishes one complete immutable reference to multiple direct source listeners", () => {
    const publication0 = createPublicationV1(0, "ready");
    const publication1 = createPublicationV1(1, "ready");
    const fixture = createSemanticPublicationSourceFixtureV1(publication0);
    const bridge = createSemanticPublicationBridgeV1(fixture.source);
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    const unsubscribeA = bridge.subscribe(listenerA);
    const unsubscribeB = bridge.subscribe(listenerB);

    expect(fixture.source.subscribe).toHaveBeenCalledTimes(2);
    expect(fixture.listenerCount()).toBe(2);

    fixture.publish(publication1);

    expect(bridge.getSnapshot()).toBe(publication1);
    expect(bridge.getSnapshot().game).toBe(publication1.game);
    expect(bridge.getSnapshot().narrative).toBe(publication1.narrative);
    expect(bridge.getSnapshot().actions).toBe(publication1.actions);
    expect(listenerA).toHaveBeenCalledOnce();
    expect(listenerB).toHaveBeenCalledOnce();
    expect(fixture.source.availableActions).not.toHaveBeenCalled();

    unsubscribeA();
    unsubscribeB();
    bridge.dispose();
  });

  it("keeps game, narrative, and actions references for a status-only publication", () => {
    const publication0 = createPublicationV1(4, "ready");
    const statusOnly = createPublicationV1(4, "busy", publication0);
    const fixture = createSemanticPublicationSourceFixtureV1(publication0);
    const bridge = createSemanticPublicationBridgeV1(fixture.source);
    const unsubscribe = bridge.subscribe(vi.fn());

    fixture.publish(statusOnly);

    expect(bridge.getSnapshot()).toBe(statusOnly);
    expect(bridge.getSnapshot()).toMatchObject({ revision: 4, status: "busy" });
    expect(bridge.getSnapshot().game).toBe(publication0.game);
    expect(bridge.getSnapshot().narrative).toBe(publication0.narrative);
    expect(bridge.getSnapshot().actions).toBe(publication0.actions);
    expect(fixture.source.availableActions).not.toHaveBeenCalled();

    unsubscribe();
    bridge.dispose();
  });

  it("retains source subscriber-failure isolation without corrupting the bridge", () => {
    const publication0 = createPublicationV1(0, "ready");
    const publication1 = createPublicationV1(1, "busy");
    const fixture = createSemanticPublicationSourceFixtureV1(publication0);
    const bridge = createSemanticPublicationBridgeV1(fixture.source);
    const subscriberError = new Error("semantic subscriber failed");
    const survivor = vi.fn();
    bridge.subscribe(() => {
      throw subscriberError;
    });
    bridge.subscribe(survivor);

    expect(() => fixture.publish(publication1)).not.toThrow();
    expect(fixture.subscriberFailures).toEqual([subscriberError]);
    expect(survivor).toHaveBeenCalledOnce();
    expect(bridge.getSnapshot()).toBe(publication1);
    expect(fixture.listenerCount()).toBe(2);

    bridge.dispose();
  });

  it("makes listener unsubscription and bridge disposal idempotent", () => {
    const publication0 = createPublicationV1(0, "ready");
    const publication1 = createPublicationV1(1, "ready");
    const fixture = createSemanticPublicationSourceFixtureV1(publication0);
    const bridge = createSemanticPublicationBridgeV1(fixture.source);
    const removedListener = vi.fn();
    const disposedListener = vi.fn();
    const unsubscribe = bridge.subscribe(removedListener);
    bridge.subscribe(disposedListener);

    unsubscribe();
    unsubscribe();
    expect(fixture.sourceUnsubscribers[0]).toHaveBeenCalledOnce();

    bridge.dispose();
    bridge.dispose();
    expect(fixture.sourceUnsubscribers[1]).toHaveBeenCalledOnce();
    expect(fixture.listenerCount()).toBe(0);

    fixture.publish(publication1);
    expect(removedListener).not.toHaveBeenCalled();
    expect(disposedListener).not.toHaveBeenCalled();
    expect(() => bridge.subscribe(vi.fn())).toThrowError("ui.semantic_bridge_disposed");
  });
});
