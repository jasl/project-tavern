// SPDX-License-Identifier: MIT
import { useSyncExternalStore } from "react";
import type { DeepReadonly, ReadonlyViewSourceV1 } from "@project-tavern/base";

export function useReadonlyViewV1<TViewModel>(
  source: ReadonlyViewSourceV1<TViewModel>,
): DeepReadonly<TViewModel> {
  return useSyncExternalStore(source.subscribe, source.getCurrent, source.getCurrent);
}
