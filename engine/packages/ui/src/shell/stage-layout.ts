// SPDX-License-Identifier: MIT

export const stageLayoutConstantsV1 = Object.freeze({
  basisWidth: 1600,
  basisHeight: 1000,
  maxWidth: 1600,
  landscapeAspectRatio: 1.6,
  portraitReflowThreshold: 4 / 3,
});

export interface StageViewportV1 {
  readonly width: number;
  readonly height: number;
}

export type StageFrameV1 =
  | {
      readonly mode: "landscape";
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly mode: "portrait_reflow";
      readonly width: number;
      readonly height: number;
    };

function assertViewportV1(viewport: StageViewportV1): void {
  if (
    !Number.isFinite(viewport.width) ||
    !Number.isFinite(viewport.height) ||
    viewport.width <= 0 ||
    viewport.height <= 0
  ) {
    throw new RangeError("ui.invalid_viewport");
  }
}

export function computeStageFrameV1(viewport: StageViewportV1): StageFrameV1 {
  assertViewportV1(viewport);

  if (viewport.width / viewport.height < stageLayoutConstantsV1.portraitReflowThreshold) {
    return Object.freeze({
      mode: "portrait_reflow",
      width: viewport.width,
      height: viewport.height,
    });
  }

  const width = Math.min(
    viewport.width,
    stageLayoutConstantsV1.maxWidth,
    viewport.height * stageLayoutConstantsV1.landscapeAspectRatio,
  );

  return Object.freeze({
    mode: "landscape",
    width,
    height: width / stageLayoutConstantsV1.landscapeAspectRatio,
  });
}
