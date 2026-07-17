// SPDX-License-Identifier: MIT
export type {
  InteractionActivationV1,
  InteractionEntryModeV1,
  InteractionResolutionModeV1,
} from "@sillymaker/base";

export type {
  PresentationFaultV1,
  PresentationIntentV1,
  RuntimeInteractionBehaviorRouteV1,
  RuntimeInteractionBehaviorV1,
  RuntimeInteractionSurfaceV1,
  RuntimeInteractionTargetV1,
} from "./contracts.js";
export { hitTestHitMapV1, normalizeViewportPointV1 } from "./hit-test.js";
export { validateRuntimeInteractionSurfaceV1 } from "./runtime-interaction-validation.js";
