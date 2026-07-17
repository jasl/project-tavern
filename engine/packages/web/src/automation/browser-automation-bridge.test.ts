// SPDX-License-Identifier: MIT
import type {
  DeepReadonly,
  NonNegativeSafeInteger,
  RuntimeCapabilitiesV1,
  RuntimeCapabilityIdV1,
  RuntimeCapabilityPortV1,
  SemanticGamePortV1,
  SemanticPublicationV1,
} from "@sillymaker/base";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  installBrowserAutomationBridgeV1,
  type BrowserAutomationBridgeV1,
  type InstalledBrowserAutomationBridgeV1,
} from "./browser-automation-bridge.js";

interface TestGameViewV1 {
  readonly value: string;
}

interface TestNarrativeViewV1 {
  readonly text: string;
}

interface TestActionDescriptorV1 {
  readonly id: string;
  readonly enabled: boolean;
}

interface TestInvocationV1 {
  readonly kind: "invoke";
  readonly actionId: string;
}

interface TestPreviewV1 {
  readonly kind: "previewed";
  readonly actionId: string;
}

interface TestResultV1 {
  readonly kind: "committed";
  readonly actionId: string;
}

type TestPublicationV1 = DeepReadonly<
  SemanticPublicationV1<
    TestGameViewV1,
    TestNarrativeViewV1,
    TestActionDescriptorV1,
    "idle" | "busy"
  >
>;

type TestAutomationBridgeV1 = BrowserAutomationBridgeV1<
  SemanticPublicationV1<
    TestGameViewV1,
    TestNarrativeViewV1,
    TestActionDescriptorV1,
    "idle" | "busy"
  >,
  TestInvocationV1,
  TestPreviewV1,
  TestResultV1
>;

type TestSemanticPortV1 = SemanticGamePortV1<
  TestGameViewV1,
  TestNarrativeViewV1,
  TestActionDescriptorV1,
  TestInvocationV1,
  TestPreviewV1,
  TestResultV1,
  "idle" | "busy"
>;

const allDisabledV1 = Object.freeze({
  debugTools: false,
  cheats: false,
  automationBridge: false,
}) satisfies RuntimeCapabilitiesV1;

function freezeCapabilitiesV1(state: RuntimeCapabilitiesV1): DeepReadonly<RuntimeCapabilitiesV1> {
  return Object.freeze({ ...state });
}

function createCapabilityFixtureV1(automationBridge: boolean) {
  let current = freezeCapabilitiesV1({ ...allDisabledV1, automationBridge });
  const listeners = new Set<() => void>();
  let subscribeCount = 0;
  let unsubscribeCount = 0;
  const capabilityFields = Object.freeze({
    debug_tools: "debugTools",
    cheats: "cheats",
    automation_bridge: "automationBridge",
  } satisfies Record<RuntimeCapabilityIdV1, keyof RuntimeCapabilitiesV1>);
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
      const field = capabilityFields[capability];
      if (current[field] === enabled) {
        return Object.freeze({ kind: "unchanged" as const, state: current });
      }
      current = freezeCapabilitiesV1({ ...current, [field]: enabled });
      for (const listener of [...listeners]) listener();
      return Object.freeze({ kind: "updated" as const, state: current });
    },
  });
  return Object.freeze({
    port,
    subscribeCount: () => subscribeCount,
    unsubscribeCount: () => unsubscribeCount,
    listenerCount: () => listeners.size,
  });
}

function createPublicationV1(revision = 0): TestPublicationV1 {
  const actions = Object.freeze([
    Object.freeze({ id: "action.test", enabled: true }),
  ]) satisfies readonly DeepReadonly<TestActionDescriptorV1>[];
  return Object.freeze({
    revision: revision as NonNegativeSafeInteger,
    status: "idle" as const,
    game: Object.freeze({ value: `game-${revision}` }),
    narrative: Object.freeze({ text: `narrative-${revision}` }),
    actions,
  });
}

function createSemanticFixtureV1(input?: {
  readonly dispatch?: TestSemanticPortV1["dispatch"];
  readonly preview?: TestSemanticPortV1["preview"];
  readonly waitForIdle?: TestSemanticPortV1["waitForIdle"];
}) {
  const publication = createPublicationV1();
  const invocation = Object.freeze({
    kind: "invoke" as const,
    actionId: "action.test",
  });
  const previewValue = Object.freeze({
    kind: "previewed" as const,
    actionId: invocation.actionId,
  });
  const result = Object.freeze({
    kind: "committed" as const,
    actionId: invocation.actionId,
  });
  const observe = vi.fn<TestSemanticPortV1["observe"]>(() => publication);
  const availableActions = vi.fn<TestSemanticPortV1["availableActions"]>(() => publication.actions);
  const preview = vi.fn<TestSemanticPortV1["preview"]>(
    input?.preview ?? (async () => previewValue),
  );
  const dispatch = vi.fn<TestSemanticPortV1["dispatch"]>(input?.dispatch ?? (async () => result));
  const waitForIdle = vi.fn<TestSemanticPortV1["waitForIdle"]>(
    input?.waitForIdle ?? (async () => publication),
  );
  const port: TestSemanticPortV1 = Object.freeze({
    observe,
    subscribe: vi.fn(() => () => undefined),
    availableActions,
    preview,
    dispatch,
    waitForIdle,
  });
  return Object.freeze({
    port,
    publication,
    invocation,
    previewValue,
    result,
    observe,
    availableActions,
    preview,
    dispatch,
    waitForIdle,
  });
}

const liveInstallations = new Set<InstalledBrowserAutomationBridgeV1>();

function readAutomationGlobalV1(): TestAutomationBridgeV1 | undefined {
  return Object.getOwnPropertyDescriptor(globalThis, "__SILLYMAKER_AUTOMATION_V1__")?.value as
    TestAutomationBridgeV1 | undefined;
}

function createAutomationFixtureV1(input: {
  readonly automationBridge: boolean;
  readonly semantic?: ReturnType<typeof createSemanticFixtureV1>;
}) {
  const capabilities = createCapabilityFixtureV1(input.automationBridge);
  const semantic = input.semantic ?? createSemanticFixtureV1();
  const installation = installBrowserAutomationBridgeV1({
    capabilities: capabilities.port,
    semantic: semantic.port,
  });
  liveInstallations.add(installation);
  const dispose = (): void => {
    installation.dispose();
    liveInstallations.delete(installation);
  };
  return Object.freeze({ capabilities, semantic, installation, dispose });
}

afterEach(() => {
  for (const installation of [...liveInstallations]) installation.dispose();
  liveInstallations.clear();
  Reflect.deleteProperty(globalThis, "__SILLYMAKER_AUTOMATION_V1__");
});

describe("browser automation bridge", () => {
  it("installs no global facade until automation_bridge becomes effective", () => {
    const fixture = createAutomationFixtureV1({ automationBridge: false });

    expect(readAutomationGlobalV1()).toBeUndefined();

    fixture.dispose();
  });

  it("returns the current atomic publication and the same actions reference", () => {
    const fixture = createAutomationFixtureV1({ automationBridge: true });
    const bridge = readAutomationGlobalV1();
    expect(bridge).toBeDefined();
    if (bridge === undefined) throw new Error("missing automation bridge");

    const observed = bridge.observe();
    const available = bridge.availableActions();

    expect(observed.kind).toBe("ok");
    expect(available.kind).toBe("ok");
    if (observed.kind === "ok" && available.kind === "ok") {
      expect(observed.value).toBe(fixture.semantic.publication);
      expect(available.value).toBe(observed.value.actions);
    }
    expect(fixture.semantic.observe).toHaveBeenCalledTimes(1);
    expect(fixture.semantic.availableActions).toHaveBeenCalledTimes(1);
    fixture.dispose();
  });

  it("installs and removes one exact non-enumerable global property", async () => {
    const fixture = createAutomationFixtureV1({ automationBridge: true });
    const installed = readAutomationGlobalV1();

    expect(installed).toBeDefined();
    expect(Object.getOwnPropertyDescriptor(globalThis, "__SILLYMAKER_AUTOMATION_V1__")).toEqual({
      configurable: true,
      enumerable: false,
      value: installed,
      writable: false,
    });

    await fixture.capabilities.port.setEnabled("automation_bridge", false);

    expect(Object.hasOwn(globalThis, "__SILLYMAKER_AUTOMATION_V1__")).toBe(false);
    fixture.dispose();
  });

  it("revokes every method retained before disablement", async () => {
    const fixture = createAutomationFixtureV1({ automationBridge: true });
    const captured = readAutomationGlobalV1();
    expect(captured).toBeDefined();
    if (captured === undefined) throw new Error("missing automation bridge");

    await fixture.capabilities.port.setEnabled("automation_bridge", false);

    expect(captured.observe()).toEqual({ kind: "capability_disabled" });
    expect(captured.availableActions()).toEqual({ kind: "capability_disabled" });
    await expect(captured.waitForIdle()).resolves.toEqual({ kind: "capability_disabled" });
    await expect(captured.preview(fixture.semantic.invocation)).resolves.toEqual({
      kind: "capability_disabled",
    });
    await expect(captured.dispatch(fixture.semantic.invocation)).resolves.toEqual({
      kind: "capability_disabled",
    });
    expect(fixture.semantic.observe).not.toHaveBeenCalled();
    expect(fixture.semantic.availableActions).not.toHaveBeenCalled();
    expect(fixture.semantic.waitForIdle).not.toHaveBeenCalled();
    expect(fixture.semantic.preview).not.toHaveBeenCalled();
    expect(fixture.semantic.dispatch).not.toHaveBeenCalled();
    fixture.dispose();
  });

  it("never revives a revoked facade when capability is re-enabled", async () => {
    const fixture = createAutomationFixtureV1({ automationBridge: true });
    const revoked = readAutomationGlobalV1();
    expect(revoked).toBeDefined();
    if (revoked === undefined) throw new Error("missing automation bridge");

    await fixture.capabilities.port.setEnabled("automation_bridge", false);
    await fixture.capabilities.port.setEnabled("automation_bridge", true);
    const current = readAutomationGlobalV1();

    expect(current).toBeDefined();
    expect(current).not.toBe(revoked);
    expect(revoked.observe()).toEqual({ kind: "capability_disabled" });
    expect(current?.observe().kind).toBe("ok");
    fixture.dispose();
    fixture.dispose();
    expect(Object.hasOwn(globalThis, "__SILLYMAKER_AUTOMATION_V1__")).toBe(false);
  });

  it.each(["preview", "dispatch", "waitForIdle"] as const)(
    "lets an admitted %s call settle but rejects every later call",
    async (method) => {
      let resolve!: (value: TestPreviewV1 | TestResultV1 | TestPublicationV1) => void;
      let admitted!: () => void;
      const admittedPromise = new Promise<void>((settle) => {
        admitted = settle;
      });
      const pending = new Promise<TestPreviewV1 | TestResultV1 | TestPublicationV1>((settle) => {
        resolve = settle;
      });
      const base = createSemanticFixtureV1();
      const semantic = createSemanticFixtureV1({
        ...(method === "preview"
          ? {
              preview: async () => {
                admitted();
                return (await pending) as TestPreviewV1;
              },
            }
          : {}),
        ...(method === "dispatch"
          ? {
              dispatch: async () => {
                admitted();
                return (await pending) as TestResultV1;
              },
            }
          : {}),
        ...(method === "waitForIdle"
          ? {
              waitForIdle: async () => {
                admitted();
                return (await pending) as TestPublicationV1;
              },
            }
          : {}),
      });
      const fixture = createAutomationFixtureV1({ automationBridge: true, semantic });
      const bridge = readAutomationGlobalV1();
      expect(bridge).toBeDefined();
      if (bridge === undefined) throw new Error("missing automation bridge");
      const inFlight =
        method === "preview"
          ? bridge.preview(semantic.invocation)
          : method === "dispatch"
            ? bridge.dispatch(semantic.invocation)
            : bridge.waitForIdle();

      await admittedPromise;
      await fixture.capabilities.port.setEnabled("automation_bridge", false);
      const expected =
        method === "preview"
          ? base.previewValue
          : method === "dispatch"
            ? base.result
            : base.publication;
      resolve(expected);

      await expect(inFlight).resolves.toEqual({ kind: "ok", value: expected });
      const rejected =
        method === "preview"
          ? bridge.preview(semantic.invocation)
          : method === "dispatch"
            ? bridge.dispatch(semantic.invocation)
            : bridge.waitForIdle();
      await expect(rejected).resolves.toEqual({ kind: "capability_disabled" });
      const delegate = semantic[method];
      expect(delegate).toHaveBeenCalledTimes(1);
      fixture.dispose();
    },
  );

  it("never overwrites a facade owned by another live installer", () => {
    const owner = createAutomationFixtureV1({ automationBridge: true });
    const owned = readAutomationGlobalV1();

    expect(() => createAutomationFixtureV1({ automationBridge: true })).toThrowError(
      "automation.bridge_already_installed",
    );
    expect(readAutomationGlobalV1()).toBe(owned);
    owner.dispose();
  });

  it("reserves one owner even while the capability is disabled", () => {
    const owner = createAutomationFixtureV1({ automationBridge: false });

    expect(() => createAutomationFixtureV1({ automationBridge: false })).toThrowError(
      "automation.bridge_already_installed",
    );

    owner.dispose();
  });

  it("exposes no debug, presentation, interaction, persistence, or state authority", () => {
    const fixture = createAutomationFixtureV1({ automationBridge: true });
    const bridge = readAutomationGlobalV1();
    expect(bridge).toBeDefined();
    if (bridge === undefined) throw new Error("missing automation bridge");

    expect(Object.isFrozen(bridge)).toBe(true);
    expect(Object.keys(bridge).toSorted()).toEqual([
      "availableActions",
      "contractRevision",
      "dispatch",
      "observe",
      "preview",
      "waitForIdle",
    ]);
    fixture.dispose();
  });

  it("freezes successful envelopes without cloning delegated values or invocations", async () => {
    const fixture = createAutomationFixtureV1({ automationBridge: true });
    const bridge = readAutomationGlobalV1();
    expect(bridge).toBeDefined();
    if (bridge === undefined) throw new Error("missing automation bridge");

    const observed = bridge.observe();
    const actions = bridge.availableActions();
    const preview = await bridge.preview(fixture.semantic.invocation);
    const dispatched = await bridge.dispatch(fixture.semantic.invocation);
    const idle = await bridge.waitForIdle(0 as NonNegativeSafeInteger);

    for (const result of [observed, actions, preview, dispatched, idle]) {
      expect(Object.isFrozen(result)).toBe(true);
    }
    expect(observed).toEqual({ kind: "ok", value: fixture.semantic.publication });
    expect(actions).toEqual({ kind: "ok", value: fixture.semantic.publication.actions });
    expect(preview).toEqual({ kind: "ok", value: fixture.semantic.previewValue });
    expect(dispatched).toEqual({ kind: "ok", value: fixture.semantic.result });
    expect(idle).toEqual({ kind: "ok", value: fixture.semantic.publication });
    expect(fixture.semantic.preview).toHaveBeenCalledWith(fixture.semantic.invocation);
    expect(fixture.semantic.dispatch).toHaveBeenCalledWith(fixture.semantic.invocation);
    expect(fixture.semantic.waitForIdle).toHaveBeenCalledWith(0);
    fixture.dispose();
  });

  it("disposes once, revokes captured generations, and leaves a foreign replacement intact", () => {
    const fixture = createAutomationFixtureV1({ automationBridge: true });
    const captured = readAutomationGlobalV1();
    expect(captured).toBeDefined();
    if (captured === undefined) throw new Error("missing automation bridge");
    const foreign = Object.freeze({ foreign: true });
    Object.defineProperty(globalThis, "__SILLYMAKER_AUTOMATION_V1__", {
      configurable: true,
      enumerable: false,
      value: foreign,
      writable: false,
    });

    fixture.dispose();
    fixture.dispose();

    expect(readAutomationGlobalV1()).toBe(foreign);
    expect(captured.observe()).toEqual({ kind: "capability_disabled" });
    expect(fixture.capabilities.subscribeCount()).toBe(1);
    expect(fixture.capabilities.unsubscribeCount()).toBe(1);
    expect(fixture.capabilities.listenerCount()).toBe(0);
  });
});
