// SPDX-License-Identifier: MIT
import type {
  DeepReadonly,
  HitMapDescriptorV1,
  InteractionActivationV1,
  InteractionTargetId,
  NonNegativeSafeInteger,
} from "@sillymaker/base";
import { useLayoutEffect, useRef } from "react";
import type { ReactElement, ReactNode } from "react";

import { inputHandledV1, inputIgnoredV1 } from "../input/contracts.js";
import type { InputEventV1, InputRouterV1 } from "../input/contracts.js";
import type { InteractionSpatialStateV1, RuntimeInteractionSurfaceV1 } from "./contracts.js";
import { hitTestHitMapV1, normalizeViewportPointV1 } from "./hit-test.js";
import styles from "./InteractionSurface.module.css";

export interface InteractionSurfaceControllerV1 {
  activate(activation: DeepReadonly<InteractionActivationV1>): Promise<unknown>;
}

export interface InteractionSurfacePropsV1<TDescriptor, TInvocation> {
  readonly surface: DeepReadonly<RuntimeInteractionSurfaceV1<TDescriptor, TInvocation>>;
  readonly hitMap: DeepReadonly<HitMapDescriptorV1>;
  readonly spatialState: InteractionSpatialStateV1;
  readonly inputRouter: InputRouterV1;
  readonly controller: InteractionSurfaceControllerV1;
  readonly children?: ReactNode;
}

function hitTargetAtViewportPointV1(
  element: HTMLDivElement | null,
  hitMap: DeepReadonly<HitMapDescriptorV1>,
  point: Readonly<{ readonly x: number; readonly y: number }>,
): InteractionTargetId | null {
  if (element === null) return null;
  const normalizedPoint = normalizeViewportPointV1(point, element.getBoundingClientRect());
  if (normalizedPoint === null) return null;
  return hitTestHitMapV1(hitMap, normalizedPoint)?.targetId ?? null;
}

function handleSpatialInputV1(
  event: DeepReadonly<InputEventV1>,
  element: HTMLDivElement | null,
  hitMap: DeepReadonly<HitMapDescriptorV1>,
  surfaceId: InteractionActivationV1["surfaceId"],
  pendingPointers: Map<NonNegativeSafeInteger, InteractionTargetId>,
  controller: InteractionSurfaceControllerV1,
) {
  switch (event.kind) {
    case "viewport_point": {
      if (event.phase === "begin") {
        const targetId = hitTargetAtViewportPointV1(element, hitMap, event.point);
        if (targetId === null) {
          pendingPointers.delete(event.pointerId);
          return inputIgnoredV1;
        }
        pendingPointers.set(event.pointerId, targetId);
        return inputHandledV1;
      }

      const beganTargetId = pendingPointers.get(event.pointerId);
      pendingPointers.delete(event.pointerId);
      if (beganTargetId === undefined) return inputIgnoredV1;
      const releasedTargetId = hitTargetAtViewportPointV1(element, hitMap, event.point);
      if (releasedTargetId === beganTargetId) {
        void controller.activate(
          Object.freeze({
            surfaceId,
            targetId: releasedTargetId,
            activationKind: "pointer" as const,
          }),
        );
      }
      return inputHandledV1;
    }
    case "pointer_cancel":
      pendingPointers.delete(event.pointerId);
      return inputIgnoredV1;
    case "focus_loss":
      pendingPointers.clear();
      return inputIgnoredV1;
    case "action":
      return inputIgnoredV1;
  }
  return inputIgnoredV1;
}

export function InteractionSurfaceV1<TDescriptor, TInvocation>(
  props: InteractionSurfacePropsV1<TDescriptor, TInvocation>,
): ReactElement {
  const elementRef = useRef<HTMLDivElement>(null);
  const pendingPointersRef = useRef(new Map<NonNegativeSafeInteger, InteractionTargetId>());

  useLayoutEffect(() => {
    const pendingPointers = pendingPointersRef.current;
    pendingPointers.clear();
    if (props.spatialState === "disabled") return undefined;

    const unregister = props.inputRouter.register({
      context: "interaction",
      handle: (event) =>
        handleSpatialInputV1(
          event,
          elementRef.current,
          props.hitMap,
          props.surface.surfaceId,
          pendingPointers,
          props.controller,
        ),
    });
    return () => {
      pendingPointers.clear();
      unregister();
    };
  }, [
    props.controller,
    props.hitMap,
    props.inputRouter,
    props.spatialState,
    props.surface.surfaceId,
  ]);

  return (
    <div
      ref={elementRef}
      className={styles["interaction-surface"]}
      data-interaction-surface-id={props.surface.surfaceId}
      data-interaction-spatial-state={props.spatialState}
    >
      {props.children}
    </div>
  );
}
