// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import {
  emptyContentMaturityFlagsV1,
  parseCharacterPoseId,
  parseCharacterRigId,
  parseHitAreaId,
  parseHitMapId,
  parseInteractionBehaviorId,
  parseInteractionSurfaceId,
  parseInteractionTargetId,
  parseNonNegativeSafeInteger,
  parseNormalizedCoordinateV1,
  parseNormalizedExtentV1,
  parseTextId,
  type DeepReadonly,
  type HitMapDescriptorV1,
  type InteractionActivationV1,
} from "@sillymaker/base";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { inputHandledV1 } from "../input/contracts.js";
import { createInputRouterV1 } from "../input/input-router.js";
import type { RuntimeInteractionSurfaceV1 } from "./contracts.js";
import { InteractionSurfaceV1 } from "./InteractionSurface.js";

afterEach(cleanup);

interface TestDescriptorV1 {
  readonly actionId: string;
  readonly enabled: boolean;
  readonly reasons: readonly never[];
}

interface TestInvocationV1 {
  readonly actionId: string;
  readonly parameters: Readonly<Record<string, never>>;
}

const surfaceIdV1 = parseInteractionSurfaceId("surface.synthetic.heroine.stage");
const targetIdV1 = parseInteractionTargetId("target.synthetic.heroine.figure");
const hitMapIdV1 = parseHitMapId("hit_map.synthetic.heroine.standing");

const runtimeSurfaceV1 = Object.freeze({
  surfaceId: surfaceIdV1,
  accessibleNameTextId: parseTextId("text.synthetic.surface.heroine.stage.name"),
  entryMode: "always_active" as const,
  hitMapId: hitMapIdV1,
  targets: Object.freeze([
    Object.freeze({
      targetId: targetIdV1,
      accessibleNameTextId: parseTextId("text.synthetic.target.heroine.figure.name"),
      resolutionMode: "direct" as const,
      openSurfaceId: null,
      behaviors: Object.freeze([
        Object.freeze({
          behaviorId: parseInteractionBehaviorId("behavior.synthetic.heroine.greet"),
          nameTextId: parseTextId("text.synthetic.behavior.heroine.greet.name"),
          descriptionTextId: null,
          requiredFlags: emptyContentMaturityFlagsV1,
          isDefault: true,
          route: Object.freeze({
            kind: "semantic_invocation" as const,
            descriptor: Object.freeze({
              actionId: "action.synthetic.heroine.greet",
              enabled: true,
              reasons: Object.freeze([]),
            }),
            invocation: Object.freeze({
              actionId: "action.synthetic.heroine.greet",
              parameters: Object.freeze({}),
            }),
          }),
        }),
      ]),
    }),
  ]),
}) satisfies DeepReadonly<RuntimeInteractionSurfaceV1<TestDescriptorV1, TestInvocationV1>>;

const hitMapV1 = Object.freeze({
  hitMapId: hitMapIdV1,
  rigId: parseCharacterRigId("rig.synthetic.heroine"),
  poseId: parseCharacterPoseId("pose.synthetic.heroine.standing"),
  targets: Object.freeze([
    Object.freeze({
      areaId: parseHitAreaId("area.synthetic.heroine.figure"),
      targetId: targetIdV1,
      shape: Object.freeze({
        kind: "rect" as const,
        x: parseNormalizedCoordinateV1(0),
        y: parseNormalizedCoordinateV1(0),
        width: parseNormalizedExtentV1(1),
        height: parseNormalizedExtentV1(1),
      }),
      priority: parseNonNegativeSafeInteger(0),
    }),
  ]),
}) satisfies DeepReadonly<HitMapDescriptorV1>;

function domRectV1(left: number, top: number, width: number, height: number): DOMRectReadOnly {
  const right = left + width;
  const bottom = top + height;
  return Object.freeze({
    x: left,
    y: top,
    left,
    top,
    right,
    bottom,
    width,
    height,
    toJSON: () => ({ bottom, height, left, right, top, width, x: left, y: top }),
  });
}

function renderSpatialSurfaceV1() {
  const inputRouter = createInputRouterV1();
  const activate = vi.fn(async (_activation: DeepReadonly<InteractionActivationV1>) =>
    Object.freeze({ kind: "dispatched" as const }),
  );
  const controller = Object.freeze({
    activate,
    activateBehavior: vi.fn(async () => Object.freeze({ kind: "dispatched" as const })),
  });
  const rendered = render(
    <InteractionSurfaceV1
      surface={runtimeSurfaceV1}
      hitMap={hitMapV1}
      spatialState="enabled"
      inputRouter={inputRouter}
      controller={controller}
    >
      <span>女主立绘</span>
    </InteractionSurfaceV1>,
  );
  const surfaceElement = rendered.container.firstElementChild;
  if (!(surfaceElement instanceof HTMLElement)) {
    throw new TypeError("test fixture expected one spatial surface element");
  }
  vi.spyOn(surfaceElement, "getBoundingClientRect").mockReturnValue(domRectV1(100, 200, 200, 400));
  return Object.freeze({ inputRouter, activate, surfaceElement });
}

describe("InteractionSurfaceV1", () => {
  it.each(["mouse", "touch", "pen"] as const)(
    "activates one spatial target exactly once for one %s operation",
    async (pointerType) => {
      const fixture = renderSpatialSurfaceV1();
      const pointerId = parseNonNegativeSafeInteger(7);
      const point = Object.freeze({ x: 150, y: 300 });

      act(() => {
        expect(
          fixture.inputRouter.route({
            kind: "viewport_point",
            phase: "begin",
            point,
            pointerId,
            pointerType,
          }),
        ).toEqual({ kind: "handled", context: "interaction" });
      });
      expect(fixture.activate).not.toHaveBeenCalled();

      act(() => {
        expect(
          fixture.inputRouter.route({
            kind: "viewport_point",
            phase: "activate",
            point,
            pointerId,
            pointerType,
          }),
        ).toEqual({ kind: "handled", context: "interaction" });
      });
      fireEvent.click(fixture.surfaceElement);

      await waitFor(() => {
        expect(fixture.activate).toHaveBeenCalledExactlyOnceWith(
          Object.freeze({
            surfaceId: surfaceIdV1,
            targetId: targetIdV1,
            activationKind: "pointer",
          }),
        );
      });
    },
  );

  it("does not let an active Overlay operation reach Interaction or Gameplay", () => {
    const fixture = renderSpatialSurfaceV1();
    const overlayHandler = vi.fn(() => inputHandledV1);
    const gameplayHandler = vi.fn(() => inputHandledV1);
    fixture.inputRouter.register({ context: "overlay", handle: overlayHandler });
    fixture.inputRouter.register({ context: "gameplay", handle: gameplayHandler });
    const event = Object.freeze({
      kind: "viewport_point" as const,
      phase: "activate" as const,
      point: Object.freeze({ x: 150, y: 300 }),
      pointerId: parseNonNegativeSafeInteger(11),
      pointerType: "touch" as const,
    });

    expect(fixture.inputRouter.route(event)).toEqual({ kind: "handled", context: "overlay" });
    expect(overlayHandler).toHaveBeenCalledExactlyOnceWith(event);
    expect(fixture.activate).not.toHaveBeenCalled();
    expect(gameplayHandler).not.toHaveBeenCalled();
  });
});
