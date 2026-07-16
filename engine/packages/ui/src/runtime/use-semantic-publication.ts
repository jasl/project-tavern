// SPDX-License-Identifier: MIT
import type { DeepReadonly } from "@sillymaker/base";
import { useSyncExternalStore } from "react";
import type { SemanticPublicationBridgeV1 } from "./semantic-publication-bridge.js";

export function useSemanticPublicationV1<TPublication>(
  bridge: SemanticPublicationBridgeV1<TPublication>,
): DeepReadonly<TPublication> {
  return useSyncExternalStore(bridge.subscribe, bridge.getSnapshot, bridge.getSnapshot);
}
