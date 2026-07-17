// SPDX-License-Identifier: MIT
import {
  parseCharacterPoseId,
  parseCharacterRigId,
  parseHitAreaId,
  parseHitMapId,
  parseInteractionTargetId,
  parseNonNegativeSafeInteger,
  parseNormalizedCoordinateV1,
  parseNormalizedExtentV1,
  type HitAreaDescriptorV1,
  type HitMapDescriptorV1,
  type NormalizedPointV1,
  type NormalizedShapeV1,
} from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import { hitTestHitMapV1, normalizeViewportPointV1 } from "./hit-test.js";

function viewportPointV1(x: number, y: number): Readonly<{ x: number; y: number }> {
  return Object.freeze({ x, y });
}

function normalizedPointV1(x: number, y: number): NormalizedPointV1 {
  return Object.freeze({
    x: parseNormalizedCoordinateV1(x),
    y: parseNormalizedCoordinateV1(y),
  });
}

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

function rectShapeV1(x: number, y: number, width: number, height: number): NormalizedShapeV1 {
  return Object.freeze({
    kind: "rect",
    x: parseNormalizedCoordinateV1(x),
    y: parseNormalizedCoordinateV1(y),
    width: parseNormalizedExtentV1(width),
    height: parseNormalizedExtentV1(height),
  });
}

function circleShapeV1(centerX: number, centerY: number, radius: number): NormalizedShapeV1 {
  return Object.freeze({
    kind: "circle",
    centerX: parseNormalizedCoordinateV1(centerX),
    centerY: parseNormalizedCoordinateV1(centerY),
    radius: parseNormalizedExtentV1(radius),
  });
}

function polygonShapeV1(points: readonly NormalizedPointV1[]): NormalizedShapeV1 {
  return Object.freeze({ kind: "polygon", points: Object.freeze([...points]) });
}

function hitAreaV1(
  areaName: string,
  targetName: string,
  shape: NormalizedShapeV1,
  priority = 0,
): HitAreaDescriptorV1 {
  return Object.freeze({
    areaId: parseHitAreaId(`area.synthetic.${areaName}`),
    targetId: parseInteractionTargetId(`target.synthetic.${targetName}`),
    shape,
    priority: parseNonNegativeSafeInteger(priority),
  });
}

function hitMapV1(targets: readonly HitAreaDescriptorV1[]): HitMapDescriptorV1 {
  return Object.freeze({
    hitMapId: parseHitMapId("hit_map.synthetic.geometry"),
    rigId: parseCharacterRigId("rig.synthetic.guide"),
    poseId: parseCharacterPoseId("pose.synthetic.guide.standing"),
    targets: Object.freeze([...targets]),
  });
}

function hitShapeV1(
  shape: NormalizedShapeV1,
  point: NormalizedPointV1,
): HitAreaDescriptorV1 | null {
  const area = hitAreaV1("shape", "shape", shape);
  return hitTestHitMapV1(hitMapV1([area]), point);
}

describe("normalizeViewportPointV1", () => {
  const characterRect = domRectV1(100, 200, 200, 400);

  it("normalizes a finite point inside the current character rectangle", () => {
    expect(normalizeViewportPointV1(viewportPointV1(150, 300), characterRect)).toEqual(
      normalizedPointV1(0.25, 0.25),
    );
  });

  it.each([
    [viewportPointV1(100, 200), normalizedPointV1(0, 0)],
    [viewportPointV1(300, 200), normalizedPointV1(1, 0)],
    [viewportPointV1(100, 600), normalizedPointV1(0, 1)],
    [viewportPointV1(300, 600), normalizedPointV1(1, 1)],
  ] as const)("includes the character rectangle boundary at %o", (point, expected) => {
    expect(normalizeViewportPointV1(point, characterRect)).toEqual(expected);
  });

  it("clamps a decimal CSS boundary that rounds one ulp beyond normalized one", () => {
    const decimalRect = domRectV1(0.1, 0.2, 0.2, 0.4);

    expect(
      normalizeViewportPointV1(
        viewportPointV1(decimalRect.left + decimalRect.width, decimalRect.top + decimalRect.height),
        decimalRect,
      ),
    ).toEqual(normalizedPointV1(1, 1));
  });

  it.each([
    viewportPointV1(99, 400),
    viewportPointV1(301, 400),
    viewportPointV1(200, 199),
    viewportPointV1(200, 601),
  ])("returns null outside the character rectangle at %o", (point) => {
    expect(normalizeViewportPointV1(point, characterRect)).toBeNull();
  });

  it.each([
    domRectV1(100, 200, 0, 400),
    domRectV1(100, 200, 200, 0),
    domRectV1(Number.NaN, 200, 200, 400),
    domRectV1(100, Number.POSITIVE_INFINITY, 200, 400),
    domRectV1(100, 200, Number.NaN, 400),
    domRectV1(100, 200, 200, Number.POSITIVE_INFINITY),
  ])("returns null for a zero or non-finite character rectangle", (rect) => {
    expect(normalizeViewportPointV1(viewportPointV1(150, 300), rect)).toBeNull();
  });

  it.each([viewportPointV1(Number.NaN, 300), viewportPointV1(150, Number.POSITIVE_INFINITY)])(
    "returns null for a non-finite viewport point",
    (point) => {
      expect(normalizeViewportPointV1(point, characterRect)).toBeNull();
    },
  );
});

describe("hitTestHitMapV1", () => {
  const rect = rectShapeV1(0.125, 0.25, 0.5, 0.25);
  const circle = circleShapeV1(0.5, 0.5, 0.25);
  const polygon = polygonShapeV1([
    normalizedPointV1(0.125, 0.125),
    normalizedPointV1(0.875, 0.125),
    normalizedPointV1(0.875, 0.875),
    normalizedPointV1(0.125, 0.875),
  ]);

  it.each([
    ["rect", rect, normalizedPointV1(0.25, 0.375)],
    ["circle", circle, normalizedPointV1(0.5, 0.625)],
    ["polygon", polygon, normalizedPointV1(0.5, 0.5)],
  ] as const)("hits a bounded normalized %s shape", (_kind, shape, point) => {
    expect(hitShapeV1(shape, point)?.targetId).toBe(
      parseInteractionTargetId("target.synthetic.shape"),
    );
  });

  it.each([
    ["rect", rect, normalizedPointV1(0.125, 0.25)],
    ["rect", rect, normalizedPointV1(0.625, 0.5)],
    ["circle", circle, normalizedPointV1(0.25, 0.5)],
    ["circle", circle, normalizedPointV1(0.75, 0.5)],
    ["polygon", polygon, normalizedPointV1(0.5, 0.125)],
    ["polygon", polygon, normalizedPointV1(0.875, 0.875)],
  ] as const)("includes the authored %s boundary", (_kind, shape, point) => {
    expect(hitShapeV1(shape, point)).not.toBeNull();
  });

  it("includes decimal rect and circle boundaries within a bounded floating tolerance", () => {
    const decimalRect = rectShapeV1(0.7, 0.2, 0.1, 0.3);
    const decimalCircle = circleShapeV1(0.6, 0.5, 0.2);

    expect(hitShapeV1(decimalRect, normalizedPointV1(0.8, 0.5))).not.toBeNull();
    expect(hitShapeV1(decimalCircle, normalizedPointV1(0.8, 0.5))).not.toBeNull();
  });

  it("includes a point on a non-axis-aligned decimal polygon edge", () => {
    const decimalPolygon = polygonShapeV1([
      normalizedPointV1(0.1, 0.1),
      normalizedPointV1(0.2, 0.3),
      normalizedPointV1(0.2, 0.1),
    ]);

    expect(hitShapeV1(decimalPolygon, normalizedPointV1(0.15, 0.2))).not.toBeNull();
  });

  it("does not inflate a tiny valid circle by applying a squared-distance tolerance", () => {
    const tinyCircle = circleShapeV1(0.5, 0.5, 1e-9);

    expect(hitShapeV1(tinyCircle, normalizedPointV1(0.500_000_01, 0.5))).toBeNull();
  });

  it("does not inflate a tiny valid polygon with a fixed cross-product tolerance", () => {
    const tinyTriangle = polygonShapeV1([
      normalizedPointV1(0.5, 0.5),
      normalizedPointV1(0.500_000_01, 0.500_000_01),
      normalizedPointV1(0.500_000_01, 0.5),
    ]);

    expect(hitShapeV1(tinyTriangle, normalizedPointV1(0.500_000_002, 0.500_000_009))).toBeNull();
  });

  it.each([
    ["rect", rect, normalizedPointV1(0.75, 0.375)],
    ["circle", circle, normalizedPointV1(0.875, 0.5)],
    ["polygon", polygon, normalizedPointV1(0.9, 0.5)],
  ] as const)("misses a point outside the authored %s shape", (_kind, shape, point) => {
    expect(hitShapeV1(shape, point)).toBeNull();
  });

  it("uses larger priority, then earlier descriptor order, without mutating the HitMap", () => {
    const overlap = rectShapeV1(0, 0, 1, 1);
    const low = hitAreaV1("first", "first", overlap, 10);
    const high = hitAreaV1("high", "high", overlap, 20);
    const samePriorityLater = hitAreaV1("same_priority_later", "same_priority_later", overlap, 20);
    const hitMap = hitMapV1([low, high, samePriorityLater]);
    const authoredTargets = hitMap.targets;
    const authoredOrder = authoredTargets.map((target) => target.targetId);

    expect(hitTestHitMapV1(hitMap, normalizedPointV1(0.5, 0.5))?.targetId).toBe(high.targetId);
    expect(hitMap.targets).toBe(authoredTargets);
    expect(hitMap.targets.map((target) => target.targetId)).toEqual(authoredOrder);
    expect(Object.isFrozen(hitMap)).toBe(true);
    expect(Object.isFrozen(hitMap.targets)).toBe(true);
  });
});
