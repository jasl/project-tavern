// SPDX-License-Identifier: MIT
import type { DeepReadonly, InteractionSurfaceId, InteractionTargetId } from "@sillymaker/base";

export interface InteractionSessionStateV1 {
  readonly activeSurfaceId: InteractionSurfaceId | null;
  readonly choosingTargetId: InteractionTargetId | null;
  readonly returnFocusId: string | null;
}

export type InteractionSessionCleanupReasonV1 =
  "pointer_cancel" | "focus_loss" | "stage_scene_replaced";

export type InteractionSessionStateReducerV1 = (
  current: DeepReadonly<InteractionSessionStateV1>,
) => DeepReadonly<InteractionSessionStateV1>;

export interface InteractionSessionStateLensV1 {
  getSnapshot(): DeepReadonly<InteractionSessionStateV1>;
  subscribe(listener: () => void): () => void;
  update(reducer: InteractionSessionStateReducerV1): void;
}

export interface InteractionSessionStoreV1 {
  getSnapshot(): DeepReadonly<InteractionSessionStateV1>;
  subscribe(listener: () => void): () => void;
  open(surfaceId: InteractionSurfaceId, returnFocusId: string | null): void;
  openChoice(
    surfaceId: InteractionSurfaceId,
    targetId: InteractionTargetId,
    returnFocusId: string | null,
  ): void;
  leave(): string | null;
  cleanup(reason: InteractionSessionCleanupReasonV1): void;
}

export const initialInteractionSessionStateV1: DeepReadonly<InteractionSessionStateV1> =
  Object.freeze({
    activeSurfaceId: null,
    choosingTargetId: null,
    returnFocusId: null,
  });

function frozenInteractionSessionStateV1(
  activeSurfaceId: InteractionSurfaceId,
  choosingTargetId: InteractionTargetId | null,
  returnFocusId: string | null,
): DeepReadonly<InteractionSessionStateV1> {
  return Object.freeze({ activeSurfaceId, choosingTargetId, returnFocusId });
}

export function createInteractionSessionStoreV1(
  lens: InteractionSessionStateLensV1,
): InteractionSessionStoreV1 {
  return Object.freeze({
    getSnapshot(): DeepReadonly<InteractionSessionStateV1> {
      return lens.getSnapshot();
    },

    subscribe(listener: () => void): () => void {
      return lens.subscribe(listener);
    },

    open(surfaceId: InteractionSurfaceId, returnFocusId: string | null): void {
      lens.update(() => frozenInteractionSessionStateV1(surfaceId, null, returnFocusId));
    },

    openChoice(
      surfaceId: InteractionSurfaceId,
      targetId: InteractionTargetId,
      returnFocusId: string | null,
    ): void {
      lens.update(() => frozenInteractionSessionStateV1(surfaceId, targetId, returnFocusId));
    },

    leave(): string | null {
      let returnFocusId: string | null = null;
      lens.update((current) => {
        returnFocusId = current.returnFocusId;
        return initialInteractionSessionStateV1;
      });
      return returnFocusId;
    },

    cleanup(reason: InteractionSessionCleanupReasonV1): void {
      void reason;
      lens.update(() => initialInteractionSessionStateV1);
    },
  });
}
