// SPDX-License-Identifier: MIT
import { useSyncExternalStore } from "react";
import type { DeepReadonly, ReadonlyViewSourceV1 } from "@sillymaker/base";

export interface MutableViewSourceV1<TViewModel> extends ReadonlyViewSourceV1<TViewModel> {
  publish(value: DeepReadonly<TViewModel>): void;
}

export function createViewSourceV1<TViewModel>(
  initial: DeepReadonly<TViewModel>,
): MutableViewSourceV1<TViewModel> {
  let current = initial;
  const listeners = new Set<() => void>();
  return Object.freeze({
    getCurrent: () => current,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish(value: DeepReadonly<TViewModel>) {
      current = value;
      for (const listener of [...listeners]) listener();
    },
  });
}

export function useReadonlyViewV1<TViewModel>(
  source: ReadonlyViewSourceV1<TViewModel>,
): DeepReadonly<TViewModel> {
  return useSyncExternalStore(source.subscribe, source.getCurrent, source.getCurrent);
}
