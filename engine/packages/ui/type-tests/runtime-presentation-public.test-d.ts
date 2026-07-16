// SPDX-License-Identifier: MIT
import type { ContentPreferencePortV1, DeepReadonly, ReadonlyViewSourceV1 } from "@sillymaker/base";
import {
  RuntimePresentationConstructionErrorV1,
  createRuntimePresentationStoreV1,
  useRuntimePresentationV1,
  type CreateRuntimePresentationStoreInputV1,
  type PresentationRuntimeFailureV1,
  type RuntimePresentationProjectionInputV1,
  type RuntimePresentationProjectionV1,
  type RuntimePresentationPublicationV1,
  type RuntimePresentationStoreV1,
  type SemanticPublicationBridgeV1,
} from "@sillymaker/ui";

type EqualV1<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

interface SemanticV1 {
  readonly revision: number;
  readonly game: { readonly count: number };
  readonly narrative: null;
  readonly actions: readonly [];
}

interface CatalogV1 {
  readonly catalogId: "catalog.synthetic";
}

interface UiStateV1 {
  readonly overlayId: string | null;
}

interface ViewV1 {
  readonly count: number;
}

type ProjectionInputV1 = RuntimePresentationProjectionInputV1<SemanticV1, CatalogV1, UiStateV1>;
type ProjectionV1 = RuntimePresentationProjectionV1<ViewV1, string>;
type PublicationV1 = RuntimePresentationPublicationV1<SemanticV1, ViewV1, string>;
type StoreV1 = RuntimePresentationStoreV1<PublicationV1>;
type CreateInputV1 = CreateRuntimePresentationStoreInputV1<
  SemanticV1,
  CatalogV1,
  UiStateV1,
  ViewV1,
  string
>;

type ProjectionInputKeysV1 = ExpectV1<
  EqualV1<keyof ProjectionInputV1, "contentPreference" | "resolvedCatalog" | "semantic" | "uiState">
>;
type ProjectionForbiddenKeysV1 = ExpectV1<
  EqualV1<
    Extract<
      keyof ProjectionInputV1,
      | "capabilities"
      | "createQueries"
      | "debugTools"
      | "diagnostics"
      | "owner"
      | "persistence"
      | "queries"
      | "rng"
      | "sequence"
      | "session"
      | "snapshot"
    >,
    never
  >
>;
type ProjectionKeysV1 = ExpectV1<EqualV1<keyof ProjectionV1, "requiredAssetIds" | "view">>;
type PublicationKeysV1 = ExpectV1<
  EqualV1<keyof PublicationV1, "requiredAssetIds" | "revision" | "semantic" | "view">
>;
type StoreKeysV1 = ExpectV1<EqualV1<keyof StoreV1, "dispose" | "getSnapshot" | "subscribe">>;
type CreateInputKeysV1 = ExpectV1<
  EqualV1<
    keyof CreateInputV1,
    "contentPreference" | "project" | "reportFailure" | "resolvedCatalog" | "semantic" | "uiState"
  >
>;
type FailureCodesV1 = ExpectV1<
  EqualV1<
    PresentationRuntimeFailureV1["code"],
    | "presentation.asset_preload_failed"
    | "presentation.initial_projection_failed"
    | "presentation.projection_failed"
    | "presentation.subscriber_failed"
  >
>;

declare const semanticV1: SemanticPublicationBridgeV1<SemanticV1>;
declare const preferenceV1: ContentPreferencePortV1;
declare const uiStateV1: ReadonlyViewSourceV1<UiStateV1>;
declare const catalogV1: DeepReadonly<CatalogV1>;

const storeV1 = createRuntimePresentationStoreV1({
  semantic: semanticV1,
  resolvedCatalog: catalogV1,
  contentPreference: preferenceV1,
  uiState: uiStateV1,
  project(input): ProjectionV1 {
    return { view: { count: input.semantic.game.count }, requiredAssetIds: [] };
  },
  reportFailure() {},
});
storeV1 satisfies StoreV1;
const useStoreV1: (store: StoreV1) => DeepReadonly<PublicationV1> = useRuntimePresentationV1;
void useStoreV1;

declare const inputV1: ProjectionInputV1;
// @ts-expect-error projector input has no Gameplay query factory
inputV1.createQueries;
// @ts-expect-error projector input has no Snapshot
inputV1.snapshot;
// @ts-expect-error projector input has no GameSession
inputV1.session;
// @ts-expect-error projector input has no owner port
inputV1.owner;
// @ts-expect-error projector input has no RNG
inputV1.rng;
// @ts-expect-error projector input has no sequence
inputV1.sequence;
// @ts-expect-error projector input has no persistence port
inputV1.persistence;
// @ts-expect-error projector input has no diagnostics port
inputV1.diagnostics;
// @ts-expect-error projector input has no capability port
inputV1.capabilities;
// @ts-expect-error projector input has no DebugTools
inputV1.debugTools;

// @ts-expect-error the read-only store cannot publish
storeV1.publish({});
// @ts-expect-error the read-only store cannot replace a Snapshot
storeV1.setSnapshot({});
// @ts-expect-error the read-only store does not expose its projector
storeV1.project;

const constructionErrorV1 = new RuntimePresentationConstructionErrorV1();
constructionErrorV1.code satisfies "presentation.initial_projection_failed";

export type {
  CreateInputKeysV1,
  FailureCodesV1,
  ProjectionForbiddenKeysV1,
  ProjectionInputKeysV1,
  ProjectionKeysV1,
  PublicationKeysV1,
  StoreKeysV1,
};
