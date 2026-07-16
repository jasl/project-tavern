// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type {
  ContentPreferencePortV1,
  ContentPreferenceV1,
  DeepReadonly,
  NonNegativeSafeInteger,
  ReadonlyViewSourceV1,
  StrictJsonObjectV1,
} from "@sillymaker/base";

import type { SemanticPublicationBridgeV1 } from "./semantic-publication-bridge.js";

export interface RuntimePresentationProjectionInputV1<
  TSemanticPublication,
  TResolvedCatalog,
  TUiState,
> {
  readonly semantic: DeepReadonly<TSemanticPublication>;
  readonly resolvedCatalog: DeepReadonly<TResolvedCatalog>;
  readonly contentPreference: DeepReadonly<ContentPreferenceV1>;
  readonly uiState: DeepReadonly<TUiState>;
}

export interface RuntimePresentationProjectionV1<TView, TAssetId> {
  readonly view: DeepReadonly<TView>;
  readonly requiredAssetIds: readonly TAssetId[];
}

export interface PresentationRuntimeFailureV1 {
  readonly code:
    | "presentation.initial_projection_failed"
    | "presentation.projection_failed"
    | "presentation.subscriber_failed"
    | "presentation.asset_preload_failed";
  readonly summary: string;
  readonly details: StrictJsonObjectV1;
}

export class RuntimePresentationConstructionErrorV1 extends Error {
  readonly code = "presentation.initial_projection_failed" as const;

  constructor() {
    super("Initial runtime presentation projection failed.");
    this.name = "RuntimePresentationConstructionErrorV1";
  }
}

export interface RuntimePresentationPublicationV1<TSemanticPublication, TView, TAssetId> {
  readonly revision: NonNegativeSafeInteger;
  readonly semantic: DeepReadonly<TSemanticPublication>;
  readonly view: DeepReadonly<TView>;
  readonly requiredAssetIds: readonly TAssetId[];
}

export interface RuntimePresentationStoreV1<TPublication> {
  getSnapshot(): DeepReadonly<TPublication>;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

export interface CreateRuntimePresentationStoreInputV1<
  TSemanticPublication,
  TResolvedCatalog,
  TUiState,
  TView,
  TAssetId,
> {
  readonly semantic: SemanticPublicationBridgeV1<TSemanticPublication>;
  readonly resolvedCatalog: DeepReadonly<TResolvedCatalog>;
  readonly contentPreference: ContentPreferencePortV1;
  readonly uiState: ReadonlyViewSourceV1<TUiState>;
  project(
    input: RuntimePresentationProjectionInputV1<TSemanticPublication, TResolvedCatalog, TUiState>,
  ): RuntimePresentationProjectionV1<TView, TAssetId>;
  reportFailure(failure: DeepReadonly<PresentationRuntimeFailureV1>): void;
}

const emptyFailureDetailsV1: StrictJsonObjectV1 = Object.freeze({});

function presentationFailureV1(
  code: PresentationRuntimeFailureV1["code"],
): DeepReadonly<PresentationRuntimeFailureV1> {
  const summary =
    code === "presentation.initial_projection_failed"
      ? "Initial runtime presentation projection failed."
      : code === "presentation.projection_failed"
        ? "Runtime presentation projection failed."
        : code === "presentation.subscriber_failed"
          ? "Runtime presentation subscriber failed."
          : "Runtime presentation asset preload failed.";
  return Object.freeze({ code, summary, details: emptyFailureDetailsV1 });
}

function freezeRequiredAssetIdsV1<TAssetId>(assetIds: readonly TAssetId[]): readonly TAssetId[] {
  const frozen = Object.freeze([...assetIds]);
  if (new Set(frozen).size !== frozen.length) {
    throw new TypeError("presentation.duplicate_required_asset_id");
  }
  return frozen;
}

export function createRuntimePresentationStoreV1<
  TSemanticPublication,
  TResolvedCatalog,
  TUiState,
  TView,
  TAssetId,
>(
  input: CreateRuntimePresentationStoreInputV1<
    TSemanticPublication,
    TResolvedCatalog,
    TUiState,
    TView,
    TAssetId
  >,
): RuntimePresentationStoreV1<
  RuntimePresentationPublicationV1<TSemanticPublication, TView, TAssetId>
> {
  type PublicationV1 = RuntimePresentationPublicationV1<TSemanticPublication, TView, TAssetId>;

  const listeners = new Set<() => void>();
  const upstreamUnsubscribes: Array<() => void> = [];
  let disposed = false;
  let constructing = true;
  let current!: DeepReadonly<PublicationV1>;

  const reportFailure = (code: PresentationRuntimeFailureV1["code"]): void => {
    try {
      input.reportFailure(presentationFailureV1(code));
    } catch {
      // Diagnostics are best effort and cannot change a presentation outcome.
    }
  };

  const projectAt = (revision: NonNegativeSafeInteger): DeepReadonly<PublicationV1> => {
    const semantic = input.semantic.getSnapshot();
    const contentPreference = input.contentPreference.observe();
    const uiState = input.uiState.getCurrent();
    const projectionInput = Object.freeze({
      semantic,
      resolvedCatalog: input.resolvedCatalog,
      contentPreference,
      uiState,
    });
    const projection = input.project(projectionInput);
    const publication = Object.freeze({
      revision,
      semantic,
      view: projection.view,
      requiredAssetIds: freezeRequiredAssetIdsV1(projection.requiredAssetIds),
    }) satisfies PublicationV1;
    return publication as DeepReadonly<PublicationV1>;
  };

  const notify = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        reportFailure("presentation.subscriber_failed");
      }
    }
  };

  const projectFromSourceNotification = (): void => {
    if (disposed || constructing) return;
    let next: DeepReadonly<PublicationV1>;
    try {
      next = projectAt(parseNonNegativeSafeInteger(current.revision + 1));
    } catch {
      reportFailure("presentation.projection_failed");
      return;
    }
    current = next;
    notify();
  };

  const cleanupUpstream = (): void => {
    for (const unsubscribe of upstreamUnsubscribes.splice(0)) {
      try {
        unsubscribe();
      } catch {
        // A broken upstream disposer cannot prevent the remaining cleanup.
      }
    }
  };

  try {
    upstreamUnsubscribes.push(input.semantic.subscribe(projectFromSourceNotification));
    upstreamUnsubscribes.push(input.contentPreference.subscribe(projectFromSourceNotification));
    upstreamUnsubscribes.push(input.uiState.subscribe(projectFromSourceNotification));
    current = projectAt(parseNonNegativeSafeInteger(0));
    constructing = false;
  } catch {
    disposed = true;
    cleanupUpstream();
    reportFailure("presentation.initial_projection_failed");
    throw new RuntimePresentationConstructionErrorV1();
  }

  return Object.freeze({
    getSnapshot: () => current,
    subscribe(listener: () => void) {
      if (disposed) throw new TypeError("ui.runtime_presentation_store_disposed");
      listeners.add(listener);
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cleanupUpstream();
      listeners.clear();
    },
  });
}
