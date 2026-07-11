// SPDX-License-Identifier: MIT
import type { DeepReadonly, NonNegativeSafeInteger, PositiveSafeInteger } from "./values.js";

export type RuntimeSessionStatusV1 =
  | "ready"
  | "busy"
  | "fault_paused"
  | "hmr_invalidated";

export type SessionDispatchOperationResultV1<TExecutionResult> =
  | { readonly kind: "executed"; readonly execution: TExecutionResult }
  | {
      readonly kind: "not_executed";
      readonly code:
        | "session_unavailable"
        | "fault_paused"
        | "hmr_invalidated"
        | "validation_failed";
    };

export type SessionAnchorResultV1 =
  | { readonly kind: "anchored"; readonly commandSequence: NonNegativeSafeInteger }
  | {
      readonly kind: "rejected";
      readonly code: "busy" | "fault_paused" | "hmr_invalidated" | "validation_failed";
    }
  | { readonly kind: "faulted"; readonly code: string };

export interface ResolvedTextPresentationV1<TTextId, TLocaleId> {
  readonly textId: TTextId;
  readonly requestedLocale: TLocaleId;
  readonly resolvedLocale: TLocaleId;
  readonly text: string;
}

export type ResolvedAssetPresentationV1<
  TAssetId,
  TAssetUsage,
  TFallbackToken,
> =
  | {
      readonly delivery: "code_fallback";
      readonly assetId: TAssetId;
      readonly usage: TAssetUsage;
      readonly fallbackToken: TFallbackToken;
    }
  | {
      readonly delivery: "runtime_image";
      readonly assetId: TAssetId;
      readonly usage: TAssetUsage;
      readonly url: string;
      readonly width: PositiveSafeInteger;
      readonly height: PositiveSafeInteger;
      readonly fallbackToken: TFallbackToken;
    };

export interface PresentationReadPortV1<
  TTextId,
  TAssetId,
  TAssetUsage,
  TLocaleId,
  TFallbackToken,
> {
  readonly locale: TLocaleId;
  text(textId: TTextId): ResolvedTextPresentationV1<TTextId, TLocaleId>;
  asset(
    assetId: TAssetId,
    usage: TAssetUsage,
  ): ResolvedAssetPresentationV1<TAssetId, TAssetUsage, TFallbackToken>;
}

export interface RuntimeViewModelEnvelopeV1<
  TSceneId,
  TGameView,
  TNarrativeView,
  TPersistenceView,
  TNoticeTextId,
> {
  readonly revision: NonNegativeSafeInteger;
  readonly sessionStatus: RuntimeSessionStatusV1;
  readonly activeSceneId: TSceneId;
  readonly game: DeepReadonly<TGameView>;
  readonly narrative: DeepReadonly<TNarrativeView>;
  readonly persistence: DeepReadonly<TPersistenceView>;
  readonly noticeTextIds: readonly TNoticeTextId[];
}
