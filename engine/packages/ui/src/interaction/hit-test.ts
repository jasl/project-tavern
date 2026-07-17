// SPDX-License-Identifier: MIT
import {
  parseNormalizedCoordinateV1,
  type HitAreaDescriptorV1,
  type HitMapDescriptorV1,
  type NormalizedPointV1,
  type NormalizedShapeV1,
} from "@sillymaker/base";

type ViewportPointV1 = Readonly<{ x: number; y: number }>;
type ViewportRectV1 = Readonly<Pick<DOMRectReadOnly, "left" | "top" | "width" | "height">>;

const coordinateUlpFactorV1 = 8;

function coordinateToleranceV1(...values: readonly number[]): number {
  const scale = values.reduce((largest, value) => Math.max(largest, Math.abs(value)), 0);
  return Number.EPSILON * coordinateUlpFactorV1 * scale;
}

function isWithinInclusiveBoundaryV1(value: number, minimum: number, maximum: number): boolean {
  const tolerance = coordinateToleranceV1(value, minimum, maximum);
  return value >= minimum - tolerance && value <= maximum + tolerance;
}

function isFiniteViewportRectV1(rect: ViewportRectV1): boolean {
  return (
    Number.isFinite(rect.left) &&
    Number.isFinite(rect.top) &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height) &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function canonicalizeZeroV1(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function clampNormalizedBoundaryV1(value: number): number | null {
  if (!isWithinInclusiveBoundaryV1(value, 0, 1)) return null;
  return canonicalizeZeroV1(Math.min(1, Math.max(0, value)));
}

export function normalizeViewportPointV1(
  point: ViewportPointV1,
  rect: ViewportRectV1,
): NormalizedPointV1 | null {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !isFiniteViewportRectV1(rect)) {
    return null;
  }

  const normalizedX = clampNormalizedBoundaryV1((point.x - rect.left) / rect.width);
  const normalizedY = clampNormalizedBoundaryV1((point.y - rect.top) / rect.height);
  if (normalizedX === null || normalizedY === null) return null;

  return Object.freeze({
    x: parseNormalizedCoordinateV1(normalizedX),
    y: parseNormalizedCoordinateV1(normalizedY),
  });
}

function pointIsNormalizedV1(point: NormalizedPointV1): boolean {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    point.x >= 0 &&
    point.x <= 1 &&
    point.y >= 0 &&
    point.y <= 1
  );
}

function pointOnSegmentV1(
  point: NormalizedPointV1,
  start: NormalizedPointV1,
  end: NormalizedPointV1,
): boolean {
  const edgeX = end.x - start.x;
  const edgeY = end.y - start.y;
  const pointDeltaX = point.x - start.x;
  const pointDeltaY = point.y - start.y;
  const edgeLength = Math.hypot(edgeX, edgeY);
  if (edgeLength === 0) return false;

  const firstProduct = edgeX * pointDeltaY;
  const secondProduct = edgeY * pointDeltaX;
  const orientation = firstProduct - secondProduct;
  const distanceFromLine = Math.abs(orientation) / edgeLength;
  const lineDistanceTolerance = coordinateToleranceV1(
    point.x,
    point.y,
    start.x,
    start.y,
    end.x,
    end.y,
    edgeLength,
  );
  return (
    distanceFromLine <= lineDistanceTolerance &&
    isWithinInclusiveBoundaryV1(point.x, Math.min(start.x, end.x), Math.max(start.x, end.x)) &&
    isWithinInclusiveBoundaryV1(point.y, Math.min(start.y, end.y), Math.max(start.y, end.y))
  );
}

/** Uses an inclusive edge check before applying the deterministic even/odd crossing rule. */
function polygonContainsPointV1(
  points: readonly NormalizedPointV1[],
  point: NormalizedPointV1,
): boolean {
  if (points.length < 3) return false;

  let inside = false;
  let previous = points[points.length - 1]!;
  for (const current of points) {
    if (pointOnSegmentV1(point, previous, current)) return true;

    const crossesHorizontalRay = current.y > point.y !== previous.y > point.y;
    if (crossesHorizontalRay) {
      const crossingX =
        ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;
      if (point.x < crossingX) inside = !inside;
    }
    previous = current;
  }
  return inside;
}

function shapeContainsPointV1(shape: NormalizedShapeV1, point: NormalizedPointV1): boolean {
  switch (shape.kind) {
    case "rect":
      return (
        isWithinInclusiveBoundaryV1(point.x, shape.x, shape.x + shape.width) &&
        isWithinInclusiveBoundaryV1(point.y, shape.y, shape.y + shape.height)
      );
    case "circle": {
      const deltaX = point.x - shape.centerX;
      const deltaY = point.y - shape.centerY;
      const distance = Math.hypot(deltaX, deltaY);
      const tolerance = coordinateToleranceV1(
        point.x,
        point.y,
        shape.centerX,
        shape.centerY,
        shape.radius,
        distance,
      );
      return distance <= shape.radius + tolerance;
    }
    case "polygon":
      return polygonContainsPointV1(shape.points, point);
  }
  return false;
}

interface WinningAreaV1 {
  readonly area: HitAreaDescriptorV1;
  readonly priority: number;
  readonly authoredIndex: number;
}

export function hitTestHitMapV1(
  hitMap: HitMapDescriptorV1,
  point: NormalizedPointV1,
): HitAreaDescriptorV1 | null {
  if (!pointIsNormalizedV1(point)) return null;

  let winner: WinningAreaV1 | null = null;
  for (let authoredIndex = 0; authoredIndex < hitMap.targets.length; authoredIndex += 1) {
    const area = hitMap.targets[authoredIndex]!;
    if (!shapeContainsPointV1(area.shape, point)) continue;

    if (
      winner === null ||
      area.priority > winner.priority ||
      (area.priority === winner.priority && authoredIndex < winner.authoredIndex)
    ) {
      winner = { area, priority: area.priority, authoredIndex };
    }
  }
  return winner?.area ?? null;
}
