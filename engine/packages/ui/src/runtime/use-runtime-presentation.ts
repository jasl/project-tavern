// SPDX-License-Identifier: MIT
import { useSyncExternalStore } from "react";
import type { DeepReadonly } from "@sillymaker/base";

import type { RuntimePresentationStoreV1 } from "./runtime-presentation-store.js";

export function useRuntimePresentationV1<TPublication>(
  store: RuntimePresentationStoreV1<TPublication>,
): DeepReadonly<TPublication> {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
