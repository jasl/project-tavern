// SPDX-License-Identifier: MIT
import type { DeepReadonly } from "@sillymaker/base";

export interface SemanticPublicationSourceV1<TPublication> {
  observe(): DeepReadonly<TPublication>;
  subscribe(listener: () => void): () => void;
}

export interface SemanticPublicationBridgeV1<TPublication> {
  getSnapshot(): DeepReadonly<TPublication>;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

export function createSemanticPublicationBridgeV1<TPublication>(
  source: SemanticPublicationSourceV1<TPublication>,
): SemanticPublicationBridgeV1<TPublication> {
  const subscriptions = new Set<() => void>();
  let disposed = false;

  const getSnapshot = (): DeepReadonly<TPublication> => source.observe();

  const subscribe = (listener: () => void): (() => void) => {
    if (disposed) throw new TypeError("ui.semantic_bridge_disposed");

    const unsubscribeFromSource = source.subscribe(listener);
    let subscribed = true;
    const unsubscribe = (): void => {
      if (!subscribed) return;
      subscribed = false;
      subscriptions.delete(unsubscribe);
      unsubscribeFromSource();
    };
    subscriptions.add(unsubscribe);
    return unsubscribe;
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    for (const unsubscribe of [...subscriptions]) unsubscribe();
  };

  return Object.freeze({ getSnapshot, subscribe, dispose });
}
