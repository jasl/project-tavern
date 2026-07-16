// SPDX-License-Identifier: MIT
import type { DeepReadonly } from "@sillymaker/base";

export const maximumOverlayDetailDepthV1 = 4 as const;

export interface OverlaySessionStateV1<TOverlayId> {
  readonly primaryId: TOverlayId | null;
  readonly detailIds: readonly TOverlayId[];
}

export type OverlayPushDetailResultV1 =
  | { readonly kind: "opened" }
  | {
      readonly kind: "rejected";
      readonly code: "no_primary" | "duplicate" | "detail_limit";
    };

export type OverlayCloseTopResultV1 = "detail_closed" | "primary_closed" | "already_closed";

export interface OverlaySessionStoreV1<TOverlayId> {
  getSnapshot(): DeepReadonly<OverlaySessionStateV1<TOverlayId>>;
  subscribe(listener: () => void): () => void;
  openPrimary(id: TOverlayId): void;
  pushDetail(id: TOverlayId): OverlayPushDetailResultV1;
  closeTop(): OverlayCloseTopResultV1;
  closeAll(): void;
}

const openedResultV1 = Object.freeze({ kind: "opened" as const });
const noPrimaryResultV1 = Object.freeze({ kind: "rejected" as const, code: "no_primary" as const });
const duplicateResultV1 = Object.freeze({ kind: "rejected" as const, code: "duplicate" as const });
const detailLimitResultV1 = Object.freeze({
  kind: "rejected" as const,
  code: "detail_limit" as const,
});

function frozenStateV1<TOverlayId>(
  primaryId: TOverlayId | null,
  detailIds: readonly TOverlayId[],
): OverlaySessionStateV1<TOverlayId> {
  return Object.freeze({ primaryId, detailIds: Object.freeze([...detailIds]) });
}

function includesIdV1<TOverlayId>(ids: readonly TOverlayId[], candidate: TOverlayId): boolean {
  return ids.includes(candidate);
}

export function createOverlaySessionStoreV1<TOverlayId>(): OverlaySessionStoreV1<TOverlayId> {
  let state = frozenStateV1<TOverlayId>(null, []);
  const listeners = new Set<() => void>();

  const publishV1 = (primaryId: TOverlayId | null, detailIds: readonly TOverlayId[]): void => {
    state = frozenStateV1(primaryId, detailIds);
    for (const listener of [...listeners]) listener();
  };

  return Object.freeze({
    getSnapshot(): DeepReadonly<OverlaySessionStateV1<TOverlayId>> {
      return state as DeepReadonly<OverlaySessionStateV1<TOverlayId>>;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        listeners.delete(listener);
      };
    },

    openPrimary(id: TOverlayId): void {
      if (state.primaryId !== null && includesIdV1([state.primaryId], id)) {
        if (state.detailIds.length > 0) publishV1(id, []);
        return;
      }
      publishV1(id, []);
    },

    pushDetail(id: TOverlayId): OverlayPushDetailResultV1 {
      if (state.primaryId === null) return noPrimaryResultV1;
      if (includesIdV1([state.primaryId, ...state.detailIds], id)) return duplicateResultV1;
      if (state.detailIds.length >= maximumOverlayDetailDepthV1) return detailLimitResultV1;
      publishV1(state.primaryId, [...state.detailIds, id]);
      return openedResultV1;
    },

    closeTop(): OverlayCloseTopResultV1 {
      if (state.primaryId === null) return "already_closed";
      if (state.detailIds.length > 0) {
        publishV1(state.primaryId, state.detailIds.slice(0, -1));
        return "detail_closed";
      }
      publishV1(null, []);
      return "primary_closed";
    },

    closeAll(): void {
      if (state.primaryId === null) return;
      publishV1(null, []);
    },
  });
}
