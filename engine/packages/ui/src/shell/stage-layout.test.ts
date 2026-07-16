// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { computeStageFrameV1, stageLayoutConstantsV1 } from "./stage-layout.js";

describe("computeStageFrameV1", () => {
  it.each([
    [
      { width: 1024, height: 768 },
      { mode: "landscape", width: 1024, height: 640 },
    ],
    [
      { width: 768, height: 1024 },
      { mode: "portrait_reflow", width: 768, height: 1024 },
    ],
    [
      { width: 1600, height: 1000 },
      { mode: "landscape", width: 1600, height: 1000 },
    ],
    [
      { width: 2560, height: 1080 },
      { mode: "landscape", width: 1600, height: 1000 },
    ],
  ] as const)("computes the capped Stage for %o", (viewport, expected) => {
    expect(computeStageFrameV1(viewport)).toEqual(expected);
  });

  it("keeps the exact 4:3 boundary in landscape mode", () => {
    expect(computeStageFrameV1({ width: 800, height: 600 })).toEqual({
      mode: "landscape",
      width: 800,
      height: 500,
    });
  });

  it.each([
    { width: 0, height: 1000 },
    { width: 1600, height: 0 },
    { width: -1, height: 1000 },
    { width: 1600, height: -1 },
    { width: Number.NaN, height: 1000 },
    { width: 1600, height: Number.POSITIVE_INFINITY },
  ])("rejects invalid viewport dimensions with a stable code", (viewport) => {
    expect(() => computeStageFrameV1(viewport)).toThrowError("ui.invalid_viewport");
  });

  it("exports a frozen Stage basis shared by layout witnesses", () => {
    expect(Object.isFrozen(stageLayoutConstantsV1)).toBe(true);
    expect(stageLayoutConstantsV1).toEqual({
      basisWidth: 1600,
      basisHeight: 1000,
      maxWidth: 1600,
      landscapeAspectRatio: 1.6,
      portraitReflowThreshold: 4 / 3,
    });
  });
});
