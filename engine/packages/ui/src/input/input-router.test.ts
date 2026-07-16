// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";
import {
  inputHandledV1,
  inputIgnoredV1,
  parseInputActionIdV1,
  systemInputActionIdsV1,
  type InputContextIdV1,
  type InputEventV1,
  type InputHandlerResultV1,
} from "./contracts.js";
import { createInputRouterV1 } from "./input-router.js";

const precedenceV1 = Object.freeze([
  "debug",
  "system",
  "overlay",
  "narrative",
  "interaction",
  "gameplay",
] as const satisfies readonly InputContextIdV1[]);

function actionEventV1(actionId = "story.e2e.custom_action"): InputEventV1 {
  return Object.freeze({ kind: "action", actionId: parseInputActionIdV1(actionId) });
}

describe("InputActionIdV1", () => {
  it("accepts open Story-owned stable action IDs without changing their bytes", () => {
    expect(parseInputActionIdV1("story.e2e.custom_action")).toBe("story.e2e.custom_action");
    expect(parseInputActionIdV1("input.future.gamepad-confirm")).toBe(
      "input.future.gamepad-confirm",
    );
  });

  it.each([
    "",
    "   ",
    "action",
    "Action.e2e.confirm",
    "action/e2e/confirm",
    "action..confirm",
    7,
    null,
  ])("rejects an invalid open action ID: %j", (value) => {
    expect(() => parseInputActionIdV1(value as string)).toThrowError("ui.invalid_input_action_id");
  });

  it("publishes exactly four frozen engine-owned system action constants", () => {
    expect(systemInputActionIdsV1).toEqual({
      confirm: "ui.confirm",
      cancel: "ui.cancel",
      openMenu: "ui.open_menu",
      narrativeAdvance: "narrative.advance",
    });
    expect(Object.keys(systemInputActionIdsV1)).toEqual([
      "confirm",
      "cancel",
      "openMenu",
      "narrativeAdvance",
    ]);
    expect(Object.isFrozen(systemInputActionIdsV1)).toBe(true);
    expect(Object.isFrozen(inputHandledV1)).toBe(true);
    expect(Object.isFrozen(inputIgnoredV1)).toBe(true);
  });
});

describe("createInputRouterV1", () => {
  it("routes through the fixed debug-to-gameplay precedence", () => {
    const router = createInputRouterV1();
    const calls: InputContextIdV1[] = [];

    for (const context of precedenceV1.toReversed()) {
      router.register({
        context,
        handle: () => {
          calls.push(context);
          return context === "gameplay" ? inputHandledV1 : inputIgnoredV1;
        },
      });
    }

    expect(router.route(actionEventV1())).toEqual({ kind: "handled", context: "gameplay" });
    expect(calls).toEqual(precedenceV1);
  });

  it("never falls through after the first handled context", () => {
    const router = createInputRouterV1();
    const debug = vi.fn(() => inputIgnoredV1);
    const system = vi.fn(() => inputIgnoredV1);
    const overlay = vi.fn(() => inputHandledV1);
    const narrative = vi.fn(() => inputHandledV1);
    const interaction = vi.fn(() => inputHandledV1);
    const gameplay = vi.fn(() => inputHandledV1);

    router.register({ context: "gameplay", handle: gameplay });
    router.register({ context: "interaction", handle: interaction });
    router.register({ context: "narrative", handle: narrative });
    router.register({ context: "overlay", handle: overlay });
    router.register({ context: "system", handle: system });
    router.register({ context: "debug", handle: debug });

    expect(router.route({ kind: "action", actionId: systemInputActionIdsV1.cancel })).toEqual({
      kind: "handled",
      context: "overlay",
    });
    expect(debug).toHaveBeenCalledOnce();
    expect(system).toHaveBeenCalledOnce();
    expect(overlay).toHaveBeenCalledOnce();
    expect(narrative).not.toHaveBeenCalled();
    expect(interaction).not.toHaveBeenCalled();
    expect(gameplay).not.toHaveBeenCalled();
  });

  it("lets an ignored Overlay fall through to Interaction before Gameplay", () => {
    const router = createInputRouterV1();
    const overlay = vi.fn(() => inputIgnoredV1);
    const interaction = vi.fn(() => inputHandledV1);
    const gameplay = vi.fn(() => inputHandledV1);
    router.register({ context: "gameplay", handle: gameplay });
    router.register({ context: "interaction", handle: interaction });
    router.register({ context: "overlay", handle: overlay });

    const event = Object.freeze({
      kind: "viewport_point" as const,
      phase: "activate" as const,
      point: Object.freeze({ x: 320, y: 240 }),
      pointerId: parseNonNegativeSafeInteger(7),
      pointerType: "touch" as const,
    });
    expect(router.route(event)).toEqual({ kind: "handled", context: "interaction" });
    expect(overlay).toHaveBeenCalledWith(event);
    expect(interaction).toHaveBeenCalledWith(event);
    expect(gameplay).not.toHaveBeenCalled();
  });

  it("uses LIFO order within one context and continues only after ignored", () => {
    const router = createInputRouterV1();
    const calls: string[] = [];
    router.register({
      context: "interaction",
      handle: () => {
        calls.push("oldest");
        return inputHandledV1;
      },
    });
    router.register({
      context: "interaction",
      handle: () => {
        calls.push("middle");
        return inputHandledV1;
      },
    });
    router.register({
      context: "interaction",
      handle: () => {
        calls.push("newest");
        return inputIgnoredV1;
      },
    });

    expect(router.route(actionEventV1())).toEqual({ kind: "handled", context: "interaction" });
    expect(calls).toEqual(["newest", "middle"]);
  });

  it("defers registrations made during dispatch until the next event", () => {
    const router = createInputRouterV1();
    const calls: string[] = [];
    let debugRegistered = false;
    router.register({
      context: "system",
      handle: () => {
        calls.push("system");
        if (!debugRegistered) {
          debugRegistered = true;
          router.register({
            context: "debug",
            handle: () => {
              calls.push("late-debug");
              return inputHandledV1;
            },
          });
        }
        return inputIgnoredV1;
      },
    });
    router.register({
      context: "gameplay",
      handle: () => {
        calls.push("gameplay");
        return inputHandledV1;
      },
    });

    expect(router.route(actionEventV1())).toEqual({ kind: "handled", context: "gameplay" });
    expect(calls).toEqual(["system", "gameplay"]);

    calls.length = 0;
    expect(router.route(actionEventV1())).toEqual({ kind: "handled", context: "debug" });
    expect(calls).toEqual(["late-debug"]);
  });

  it("defers unregistrations made during dispatch until the next event", () => {
    const router = createInputRouterV1();
    const calls: string[] = [];
    const unregisterInteraction = router.register({
      context: "interaction",
      handle: () => {
        calls.push("interaction");
        return inputHandledV1;
      },
    });
    router.register({
      context: "overlay",
      handle: () => {
        calls.push("overlay");
        unregisterInteraction();
        return inputIgnoredV1;
      },
    });
    router.register({
      context: "gameplay",
      handle: () => {
        calls.push("gameplay");
        return inputHandledV1;
      },
    });

    expect(router.route(actionEventV1())).toEqual({ kind: "handled", context: "interaction" });
    expect(calls).toEqual(["overlay", "interaction"]);

    calls.length = 0;
    expect(router.route(actionEventV1())).toEqual({ kind: "handled", context: "gameplay" });
    expect(calls).toEqual(["overlay", "gameplay"]);
  });

  it("returns an idempotent unregister operation without disturbing retained handlers", () => {
    const router = createInputRouterV1();
    const retained = vi.fn(() => inputHandledV1);
    const removed = vi.fn(() => inputHandledV1);
    router.register({ context: "narrative", handle: retained });
    const unregister = router.register({ context: "narrative", handle: removed });

    unregister();
    unregister();

    expect(router.route(actionEventV1())).toEqual({ kind: "handled", context: "narrative" });
    expect(removed).not.toHaveBeenCalled();
    expect(retained).toHaveBeenCalledOnce();
  });

  it("routes clearTransientInput as one focus_loss event through the same precedence", () => {
    const router = createInputRouterV1();
    const overlay = vi.fn(() => inputIgnoredV1);
    const interaction = vi.fn(() => inputHandledV1);
    const gameplay = vi.fn(() => inputHandledV1);
    router.register({ context: "gameplay", handle: gameplay });
    router.register({ context: "interaction", handle: interaction });
    router.register({ context: "overlay", handle: overlay });

    expect(router.clearTransientInput()).toBeUndefined();
    expect(overlay).toHaveBeenCalledWith({ kind: "focus_loss" });
    expect(interaction).toHaveBeenCalledWith({ kind: "focus_loss" });
    expect(gameplay).not.toHaveBeenCalled();
  });

  it("returns frozen public results for both handled and fully ignored routes", () => {
    const router = createInputRouterV1();
    const ignored = router.route(actionEventV1());
    router.register({ context: "system", handle: () => inputHandledV1 });
    const handled = router.route(actionEventV1());

    expect(ignored).toEqual({ kind: "ignored" });
    expect(handled).toEqual({ kind: "handled", context: "system" });
    expect(Object.isFrozen(router)).toBe(true);
    expect(Object.isFrozen(ignored)).toBe(true);
    expect(Object.isFrozen(handled)).toBe(true);
  });

  it.each([
    { point: { x: Number.NaN, y: 0 }, label: "NaN x" },
    { point: { x: Number.POSITIVE_INFINITY, y: 0 }, label: "infinite x" },
    { point: { x: 0, y: Number.NEGATIVE_INFINITY }, label: "infinite y" },
  ])("rejects nonfinite viewport coordinates before dispatch: $label", ({ point }) => {
    const router = createInputRouterV1();
    const handle = vi.fn(() => inputHandledV1);
    router.register({ context: "interaction", handle });
    const malformed = {
      kind: "viewport_point",
      phase: "begin",
      point,
      pointerId: parseNonNegativeSafeInteger(1),
      pointerType: "mouse",
    } as InputEventV1;

    expect(() => router.route(malformed)).toThrowError("ui.invalid_input_event");
    expect(handle).not.toHaveBeenCalled();
  });

  it.each([
    { kind: "action", actionId: "not stable" },
    {
      kind: "viewport_point",
      phase: "move",
      point: { x: 1, y: 2 },
      pointerId: 1,
      pointerType: "mouse",
    },
    {
      kind: "viewport_point",
      phase: "begin",
      point: { x: 1, y: 2 },
      pointerId: -1,
      pointerType: "mouse",
    },
    {
      kind: "viewport_point",
      phase: "begin",
      point: { x: 1, y: 2 },
      pointerId: 1,
      pointerType: "trackpad",
    },
    { kind: "pointer_cancel", pointerId: -0 },
    { kind: "pointer_cancel", pointerId: Number.MAX_SAFE_INTEGER + 1 },
    { kind: "unknown" },
    null,
  ])("rejects a malformed device-independent event: %j", (event) => {
    const router = createInputRouterV1();
    expect(() => router.route(event as InputEventV1)).toThrowError("ui.invalid_input_event");
  });

  it.each([
    {
      label: "action capability",
      event: { kind: "action", actionId: "story.e2e.inspect", debugTools: {} },
    },
    { label: "focus-loss Snapshot", event: { kind: "focus_loss", snapshot: {} } },
    {
      label: "viewport PointerEvent",
      event: {
        kind: "viewport_point",
        phase: "begin",
        point: { x: 1, y: 2 },
        pointerId: 1,
        pointerType: "mouse",
        pointerEvent: {},
      },
    },
    {
      label: "renderer-local point",
      event: {
        kind: "viewport_point",
        phase: "begin",
        point: { x: 1, y: 2, localX: 0.5 },
        pointerId: 1,
        pointerType: "mouse",
      },
    },
    {
      label: "cancel Story value",
      event: { kind: "pointer_cancel", pointerId: 1, storyId: "story.e2e" },
    },
  ])("rejects an extra field at the device-independent boundary: $label", ({ event }) => {
    const router = createInputRouterV1();
    const handle = vi.fn(() => inputHandledV1);
    router.register({ context: "interaction", handle });

    expect(() => router.route(event as unknown as InputEventV1)).toThrowError(
      "ui.invalid_input_event",
    );
    expect(handle).not.toHaveBeenCalled();
  });

  it("rejects an inherited authority value instead of forwarding a custom prototype", () => {
    const router = createInputRouterV1();
    const handle = vi.fn(() => inputHandledV1);
    router.register({ context: "interaction", handle });
    const event = Object.assign(Object.create({ snapshot: {} }) as object, {
      kind: "focus_loss",
    });

    expect(() => router.route(event as InputEventV1)).toThrowError("ui.invalid_input_event");
    expect(handle).not.toHaveBeenCalled();
  });

  it("accepts all four event variants and passes the original immutable values", () => {
    const router = createInputRouterV1();
    const events: InputEventV1[] = [
      actionEventV1(),
      Object.freeze({
        kind: "viewport_point",
        phase: "begin",
        point: Object.freeze({ x: -12.5, y: 300.25 }),
        pointerId: parseNonNegativeSafeInteger(0),
        pointerType: "pen",
      }),
      Object.freeze({ kind: "pointer_cancel", pointerId: parseNonNegativeSafeInteger(0) }),
      Object.freeze({ kind: "focus_loss" }),
    ];
    const handle = vi.fn((_event: InputEventV1): InputHandlerResultV1 => inputHandledV1);
    router.register({ context: "interaction", handle });

    for (const event of events) {
      expect(router.route(event)).toEqual({ kind: "handled", context: "interaction" });
    }
    expect(handle.mock.calls.map(([event]) => event)).toEqual(events);
    for (const [index, event] of events.entries()) {
      expect(handle.mock.calls[index]?.[0]).toBe(event);
    }
  });

  it.each([
    { registration: null, label: "null" },
    { registration: { context: "modal", handle: () => inputHandledV1 }, label: "context" },
    { registration: { context: "overlay", handle: "handled" }, label: "handler" },
  ])("rejects an invalid registration: $label", ({ registration }) => {
    const router = createInputRouterV1();
    expect(() =>
      router.register(
        registration as {
          readonly context: InputContextIdV1;
          readonly handle: (event: InputEventV1) => InputHandlerResultV1;
        },
      ),
    ).toThrowError("ui.invalid_input_registration");
  });

  it("rejects an invalid handler result instead of treating it as fallthrough", () => {
    const router = createInputRouterV1();
    const lower = vi.fn(() => inputHandledV1);
    router.register({ context: "gameplay", handle: lower });
    router.register({
      context: "overlay",
      handle: () => ({ kind: "maybe" }) as unknown as InputHandlerResultV1,
    });

    expect(() => router.route(actionEventV1())).toThrowError("ui.invalid_input_handler_result");
    expect(lower).not.toHaveBeenCalled();
  });
});
