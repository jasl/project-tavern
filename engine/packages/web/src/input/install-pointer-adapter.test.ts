// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import type { InputEventV1 } from "@sillymaker/ui";
import { describe, expect, it, vi } from "vitest";

import { installPointerAdapterV1 } from "./install-pointer-adapter.js";

type PointerEventTypeV1 = "pointerdown" | "pointerup" | "pointercancel" | "lostpointercapture";

interface PointerEventFieldsV1 {
  readonly pointerId?: number;
  readonly pointerType?: string;
  readonly isPrimary?: boolean;
  readonly clientX?: number;
  readonly clientY?: number;
}

class TestDocumentLifecycleV1 extends EventTarget {
  visibilityState: DocumentVisibilityState = "visible";
}

function dispatchPointerEventV1(
  target: Element,
  type: PointerEventTypeV1,
  fields: PointerEventFieldsV1 = {},
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: fields.pointerId ?? 1 },
    pointerType: { value: fields.pointerType ?? "touch" },
    isPrimary: { value: fields.isPrimary ?? true },
    clientX: { value: fields.clientX ?? 123 },
    clientY: { value: fields.clientY ?? 456 },
  });
  target.dispatchEvent(event);
}

function createPointerFixtureV1() {
  const target = document.createElement("div");
  const routedEvents: InputEventV1[] = [];
  const capturedPointerIds = new Set<number>();
  const setPointerCapture = vi.fn((pointerId: number) => capturedPointerIds.add(pointerId));
  const releasePointerCapture = vi.fn((pointerId: number) => capturedPointerIds.delete(pointerId));
  const hasPointerCapture = vi.fn((pointerId: number) => capturedPointerIds.has(pointerId));
  Object.defineProperties(target, {
    setPointerCapture: { configurable: true, value: setPointerCapture },
    releasePointerCapture: { configurable: true, value: releasePointerCapture },
    hasPointerCapture: { configurable: true, value: hasPointerCapture },
  });

  const addEventListener = vi.spyOn(target, "addEventListener");
  const removeEventListener = vi.spyOn(target, "removeEventListener");
  const windowLifecycle = new EventTarget();
  const documentLifecycle = new TestDocumentLifecycleV1();
  const adapter = installPointerAdapterV1({
    target,
    route: (event) => routedEvents.push(event),
    window: windowLifecycle as unknown as Pick<Window, "addEventListener" | "removeEventListener">,
    document: documentLifecycle as unknown as Pick<
      Document,
      "visibilityState" | "addEventListener" | "removeEventListener"
    >,
  });

  const dispatch = (
    type: PointerEventTypeV1,
    fields: PointerEventFieldsV1 = {},
    eventTarget: Element = target,
  ) => dispatchPointerEventV1(eventTarget, type, fields);

  return {
    target,
    routedEvents,
    capturedPointerIds,
    setPointerCapture,
    releasePointerCapture,
    hasPointerCapture,
    addEventListener,
    removeEventListener,
    windowLifecycle,
    documentLifecycle,
    adapter,
    dispatch,
  };
}

describe("installPointerAdapterV1", () => {
  it.each(["mouse", "touch", "pen"] as const)(
    "routes one %s begin/activate pair in viewport CSS coordinates without click duplication",
    (pointerType) => {
      const fixture = createPointerFixtureV1();
      const click = vi.fn();
      fixture.target.addEventListener("click", click);

      fixture.dispatch("pointerdown", { pointerType });
      fixture.dispatch("pointerup", { pointerType });
      fixture.target.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(fixture.routedEvents).toEqual([
        {
          kind: "viewport_point",
          phase: "begin",
          point: { x: 123, y: 456 },
          pointerId: 1,
          pointerType,
        },
        {
          kind: "viewport_point",
          phase: "activate",
          point: { x: 123, y: 456 },
          pointerId: 1,
          pointerType,
        },
      ]);
      expect(click).toHaveBeenCalledOnce();
      expect(fixture.addEventListener.mock.calls.filter(([type]) => type === "click")).toHaveLength(
        1,
      );
      expect(fixture.setPointerCapture).toHaveBeenCalledExactlyOnceWith(1);
      expect(fixture.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(1);
      expect(fixture.capturedPointerIds).toEqual(new Set());
    },
  );

  it.each([
    ["button", () => document.createElement("button")],
    [
      "link",
      () => {
        const element = document.createElement("a");
        element.href = "/settings";
        return element;
      },
    ],
    ["input", () => document.createElement("input")],
    ["select", () => document.createElement("select")],
    ["textarea", () => document.createElement("textarea")],
    ["summary", () => document.createElement("summary")],
    [
      "contenteditable",
      () => {
        const element = document.createElement("div");
        element.setAttribute("contenteditable", "true");
        return element;
      },
    ],
    [
      "explicit native semantic control",
      () => {
        const element = document.createElement("div");
        element.dataset.nativeSemanticControl = "true";
        return element;
      },
    ],
  ] as const)("leaves a %s and its descendants to native semantic activation", (_name, create) => {
    const fixture = createPointerFixtureV1();
    const control = create();
    const descendant = document.createElement("span");
    control.append(descendant);
    fixture.target.append(control);
    const click = vi.fn((event: Event) => event.preventDefault());
    control.addEventListener("click", click);

    fixture.dispatch("pointerdown", {}, descendant);
    fixture.dispatch("pointerup", {}, descendant);
    descendant.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(fixture.routedEvents).toEqual([]);
    expect(fixture.setPointerCapture).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalledOnce();
  });

  it("accepts only one primary pointer and ignores mismatched pointer lifecycle events", () => {
    const fixture = createPointerFixtureV1();

    fixture.dispatch("pointerdown", { pointerId: 8, isPrimary: false });
    fixture.dispatch("pointerdown", { pointerId: 7 });
    fixture.dispatch("pointerdown", { pointerId: 8 });
    fixture.dispatch("pointerup", { pointerId: 8 });
    fixture.dispatch("pointerup", { pointerId: 7 });

    expect(fixture.routedEvents).toEqual([
      {
        kind: "viewport_point",
        phase: "begin",
        point: { x: 123, y: 456 },
        pointerId: 7,
        pointerType: "touch",
      },
      {
        kind: "viewport_point",
        phase: "activate",
        point: { x: 123, y: 456 },
        pointerId: 7,
        pointerType: "touch",
      },
    ]);
    expect(fixture.setPointerCapture).toHaveBeenCalledExactlyOnceWith(7);
    expect(fixture.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(7);
  });

  it("cancels an accepted pointer when matching pointerup bubbles from a native control", () => {
    const fixture = createPointerFixtureV1();
    const button = document.createElement("button");
    const descendant = document.createElement("span");
    button.append(descendant);
    fixture.target.append(button);
    fixture.dispatch("pointerdown", { pointerId: 7 });

    fixture.dispatch("pointerup", { pointerId: 7 }, descendant);

    expect(fixture.routedEvents).toEqual([
      {
        kind: "viewport_point",
        phase: "begin",
        point: { x: 123, y: 456 },
        pointerId: 7,
        pointerType: "touch",
      },
      { kind: "pointer_cancel", pointerId: 7 },
    ]);
    expect(fixture.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(7);
  });

  it.each(["pointercancel", "lostpointercapture"] as const)(
    "cancels an accepted pointer when matching %s bubbles from a native control",
    (eventType) => {
      const fixture = createPointerFixtureV1();
      const button = document.createElement("button");
      const descendant = document.createElement("span");
      button.append(descendant);
      fixture.target.append(button);
      fixture.dispatch("pointerdown", { pointerId: 7 });
      if (eventType === "lostpointercapture") fixture.capturedPointerIds.delete(7);

      fixture.dispatch(eventType, { pointerId: 7 }, descendant);
      fixture.dispatch("pointerdown", { pointerId: 9 });

      expect(fixture.routedEvents.at(-2)).toEqual({ kind: "pointer_cancel", pointerId: 7 });
      expect(fixture.routedEvents.at(-1)).toEqual({
        kind: "viewport_point",
        phase: "begin",
        point: { x: 123, y: 456 },
        pointerId: 9,
        pointerType: "touch",
      });
    },
  );

  it.each([
    [Number.NaN, 456],
    [Number.POSITIVE_INFINITY, 456],
    [123, Number.NEGATIVE_INFINITY],
  ])("rejects a nonfinite pointerdown coordinate (%s, %s)", (clientX, clientY) => {
    const fixture = createPointerFixtureV1();

    fixture.dispatch("pointerdown", { clientX, clientY });

    expect(fixture.routedEvents).toEqual([]);
    expect(fixture.setPointerCapture).not.toHaveBeenCalled();
  });

  it("cancels an accepted pointer whose pointerup coordinates are nonfinite", () => {
    const fixture = createPointerFixtureV1();
    fixture.dispatch("pointerdown", { pointerId: 7 });

    fixture.dispatch("pointerup", { pointerId: 7, clientX: Number.NaN });

    expect(fixture.routedEvents.at(-1)).toEqual({ kind: "pointer_cancel", pointerId: 7 });
    expect(fixture.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(7);
    expect(fixture.capturedPointerIds).toEqual(new Set());
  });

  it("routes pointercancel once and releases the accepted pointer capture", () => {
    const fixture = createPointerFixtureV1();
    fixture.dispatch("pointerdown", { pointerId: 7 });

    fixture.dispatch("pointercancel", { pointerId: 8 });
    fixture.dispatch("pointercancel", { pointerId: 7 });
    fixture.dispatch("lostpointercapture", { pointerId: 7 });

    expect(fixture.routedEvents.at(-1)).toEqual({ kind: "pointer_cancel", pointerId: 7 });
    expect(fixture.routedEvents.filter(({ kind }) => kind === "pointer_cancel")).toHaveLength(1);
    expect(fixture.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(7);
    expect(fixture.capturedPointerIds).toEqual(new Set());
  });

  it("routes cancellation for an unexpected loss of the accepted pointer capture", () => {
    const fixture = createPointerFixtureV1();
    fixture.dispatch("pointerdown", { pointerId: 7 });
    fixture.capturedPointerIds.delete(7);

    fixture.dispatch("lostpointercapture", { pointerId: 7 });

    expect(fixture.routedEvents.at(-1)).toEqual({ kind: "pointer_cancel", pointerId: 7 });
    expect(fixture.releasePointerCapture).not.toHaveBeenCalled();
  });

  it("routes one focus_loss on window blur and clears an accepted pointer", () => {
    const fixture = createPointerFixtureV1();
    fixture.dispatch("pointerdown", { pointerId: 7 });

    fixture.windowLifecycle.dispatchEvent(new Event("blur"));

    expect(fixture.routedEvents.at(-1)).toEqual({ kind: "focus_loss" });
    expect(fixture.routedEvents.filter(({ kind }) => kind === "focus_loss")).toHaveLength(1);
    expect(fixture.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(7);
    expect(fixture.capturedPointerIds).toEqual(new Set());
  });

  it("routes focus_loss only when document visibility becomes hidden", () => {
    const fixture = createPointerFixtureV1();

    fixture.documentLifecycle.dispatchEvent(new Event("visibilitychange"));
    fixture.documentLifecycle.visibilityState = "hidden";
    fixture.documentLifecycle.dispatchEvent(new Event("visibilitychange"));

    expect(fixture.routedEvents).toEqual([{ kind: "focus_loss" }]);
  });

  it("disposes idempotently, releases capture, and removes every installed listener", () => {
    const fixture = createPointerFixtureV1();
    fixture.dispatch("pointerdown", { pointerId: 7 });
    fixture.routedEvents.length = 0;

    fixture.adapter.dispose();
    fixture.adapter.dispose();
    fixture.dispatch("pointerup", { pointerId: 7 });
    fixture.dispatch("pointerdown", { pointerId: 9 });
    fixture.windowLifecycle.dispatchEvent(new Event("blur"));
    fixture.documentLifecycle.visibilityState = "hidden";
    fixture.documentLifecycle.dispatchEvent(new Event("visibilitychange"));

    expect(fixture.routedEvents).toEqual([]);
    expect(fixture.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(7);
    expect(fixture.capturedPointerIds).toEqual(new Set());
    expect(fixture.removeEventListener.mock.calls.map(([type]) => type)).toEqual([
      "pointerdown",
      "pointerup",
      "pointercancel",
      "lostpointercapture",
    ]);
  });
});
