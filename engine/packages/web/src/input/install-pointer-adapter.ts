// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type { NonNegativeSafeInteger } from "@sillymaker/base";
import type { InputEventV1 } from "@sillymaker/ui";

const nativeSemanticControlSelectorV1 = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  "summary",
  '[contenteditable="true"]',
  '[data-native-semantic-control="true"]',
].join(",");

type PointerTypeV1 = "mouse" | "touch" | "pen";

interface ActivePointerV1 {
  readonly pointerId: NonNegativeSafeInteger;
  readonly pointerType: PointerTypeV1;
}

export interface PointerAdapterInputV1 {
  readonly target: HTMLElement;
  readonly route: (event: InputEventV1) => void;
  readonly window: Pick<Window, "addEventListener" | "removeEventListener">;
  readonly document: Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener">;
}

export interface InstalledPointerAdapterV1 {
  dispose(): void;
}

function parsePointerIdV1(pointerId: number): NonNegativeSafeInteger | undefined {
  try {
    return parseNonNegativeSafeInteger(pointerId);
  } catch {
    return undefined;
  }
}

function parsePointerTypeV1(pointerType: string): PointerTypeV1 | undefined {
  switch (pointerType) {
    case "mouse":
    case "touch":
    case "pen":
      return pointerType;
    default:
      return undefined;
  }
}

function hasFiniteViewportPointV1(event: PointerEvent): boolean {
  return Number.isFinite(event.clientX) && Number.isFinite(event.clientY);
}

function isWithinNativeSemanticControlV1(event: Event): boolean {
  const target = event.target as { closest?: (selector: string) => Element | null } | null;
  if (target?.closest === undefined) return false;
  return target.closest(nativeSemanticControlSelectorV1) !== null;
}

function viewportPointEventV1(
  phase: "begin" | "activate",
  event: PointerEvent,
  activePointer: ActivePointerV1,
): InputEventV1 {
  return Object.freeze({
    kind: "viewport_point",
    phase,
    point: Object.freeze({ x: event.clientX, y: event.clientY }),
    pointerId: activePointer.pointerId,
    pointerType: activePointer.pointerType,
  });
}

function pointerCancelEventV1(pointerId: NonNegativeSafeInteger): InputEventV1 {
  return Object.freeze({ kind: "pointer_cancel", pointerId });
}

const focusLossEventV1 = Object.freeze({ kind: "focus_loss" } as const satisfies InputEventV1);

export function installPointerAdapterV1(input: PointerAdapterInputV1): InstalledPointerAdapterV1 {
  let activePointer: ActivePointerV1 | undefined;
  let disposed = false;

  const releaseCapture = (pointerId: NonNegativeSafeInteger): void => {
    try {
      if (input.target.hasPointerCapture(pointerId)) {
        input.target.releasePointerCapture(pointerId);
      }
    } catch {
      // Capture can already have been released by the browser during lifecycle cleanup.
    }
  };

  const clearActivePointer = (release: boolean): ActivePointerV1 | undefined => {
    const cleared = activePointer;
    activePointer = undefined;
    if (release && cleared !== undefined) {
      releaseCapture(cleared.pointerId);
    }
    return cleared;
  };

  const cancelActivePointer = (release: boolean): void => {
    const cancelled = clearActivePointer(false);
    if (cancelled === undefined) return;
    try {
      input.route(pointerCancelEventV1(cancelled.pointerId));
    } finally {
      if (release) releaseCapture(cancelled.pointerId);
    }
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (
      disposed ||
      activePointer !== undefined ||
      !event.isPrimary ||
      isWithinNativeSemanticControlV1(event) ||
      !hasFiniteViewportPointV1(event)
    ) {
      return;
    }

    const pointerId = parsePointerIdV1(event.pointerId);
    const pointerType = parsePointerTypeV1(event.pointerType);
    if (pointerId === undefined || pointerType === undefined) return;

    const accepted = Object.freeze({ pointerId, pointerType });
    activePointer = accepted;
    try {
      input.target.setPointerCapture(pointerId);
      input.route(viewportPointEventV1("begin", event, accepted));
    } catch (error) {
      clearActivePointer(true);
      throw error;
    }
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (disposed || !event.isPrimary) return;
    const accepted = activePointer;
    if (accepted === undefined || event.pointerId !== accepted.pointerId) return;

    if (isWithinNativeSemanticControlV1(event)) {
      cancelActivePointer(true);
      return;
    }
    if (!hasFiniteViewportPointV1(event)) {
      cancelActivePointer(true);
      return;
    }

    try {
      input.route(viewportPointEventV1("activate", event, accepted));
    } finally {
      activePointer = undefined;
      releaseCapture(accepted.pointerId);
    }
  };

  const onPointerCancel = (event: PointerEvent): void => {
    if (disposed) return;
    const accepted = activePointer;
    if (accepted === undefined || event.pointerId !== accepted.pointerId) return;
    cancelActivePointer(true);
  };

  const onLostPointerCapture = (event: PointerEvent): void => {
    if (disposed) return;
    const accepted = activePointer;
    if (accepted === undefined || event.pointerId !== accepted.pointerId) return;
    cancelActivePointer(false);
  };

  const onFocusLoss = (): void => {
    if (disposed) return;
    const accepted = clearActivePointer(false);
    try {
      input.route(focusLossEventV1);
    } finally {
      if (accepted !== undefined) releaseCapture(accepted.pointerId);
    }
  };

  const onVisibilityChange = (): void => {
    if (input.document.visibilityState === "hidden") onFocusLoss();
  };

  input.target.addEventListener("pointerdown", onPointerDown);
  input.target.addEventListener("pointerup", onPointerUp);
  input.target.addEventListener("pointercancel", onPointerCancel);
  input.target.addEventListener("lostpointercapture", onLostPointerCapture);
  input.window.addEventListener("blur", onFocusLoss);
  input.document.addEventListener("visibilitychange", onVisibilityChange);

  return Object.freeze({
    dispose(): void {
      if (disposed) return;
      disposed = true;
      input.target.removeEventListener("pointerdown", onPointerDown);
      input.target.removeEventListener("pointerup", onPointerUp);
      input.target.removeEventListener("pointercancel", onPointerCancel);
      input.target.removeEventListener("lostpointercapture", onLostPointerCapture);
      input.window.removeEventListener("blur", onFocusLoss);
      input.document.removeEventListener("visibilitychange", onVisibilityChange);
      clearActivePointer(true);
    },
  });
}
