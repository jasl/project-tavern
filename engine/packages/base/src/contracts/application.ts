// SPDX-License-Identifier: MIT
import type { RuntimeSessionStatusV1 } from "./presentation.js";
import type { Brand, DeepReadonly, NonNegativeSafeInteger } from "./values.js";

export interface ReadonlyViewSourceV1<TViewModel> {
  getCurrent(): DeepReadonly<TViewModel>;
  subscribe(listener: () => void): () => void;
}

export interface MutableViewPublisherV1<TViewModel> extends ReadonlyViewSourceV1<TViewModel> {
  publish(value: DeepReadonly<TViewModel>): void;
}

export function createReadonlyViewSourceV1<TViewModel>(
  initial: DeepReadonly<TViewModel>,
): MutableViewPublisherV1<TViewModel> {
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

export interface GameApplicationPortV1<
  TSemantic,
  TLifecycle,
  TPersistence,
  TDiagnostics,
  TCapabilities,
  TDebugTools,
> {
  readonly semantic: TSemantic;
  readonly lifecycle: TLifecycle;
  readonly persistence: TPersistence;
  readonly diagnostics: TDiagnostics;
  readonly capabilities: TCapabilities;
  readonly debugTools: TDebugTools;
}

export interface SessionLifecyclePortV1<TAnchorResult> {
  createNewSession(): Promise<TAnchorResult>;
  restartSession(): Promise<TAnchorResult>;
}

export type SaveSlotIdV1 = "auto.current" | "auto.previous" | "quick" | "manual";
export type PlayerWritableSaveSlotIdV1 = "quick" | "manual";
export type SessionLeaseOwnerId = Brand<string, "SessionLeaseOwnerId">;
export type LeaseHandoffRequestId = Brand<string, "LeaseHandoffRequestId">;

export interface SessionLeasePortV1<TLeaseStatus, TLeaseOperationResult> {
  getStatus(): Promise<TLeaseStatus>;
  requestHandoff(): Promise<TLeaseOperationResult>;
  approveHandoff(requestId: LeaseHandoffRequestId): Promise<TLeaseOperationResult>;
  takeOver(): Promise<TLeaseOperationResult>;
  release(): Promise<TLeaseOperationResult>;
}

export interface PlayerPersistencePortV1<
  TSlotSummary,
  TPersistenceStatus,
  TPersistenceResult,
  TExportedSave,
  TSaveExportResult,
  TLeaseStatus,
  TLeaseOperationResult,
> {
  readonly lease: SessionLeasePortV1<TLeaseStatus, TLeaseOperationResult>;
  listSlots(): Promise<readonly TSlotSummary[]>;
  getStatus(): Promise<TPersistenceStatus>;
  save(slot: PlayerWritableSaveSlotIdV1): Promise<TPersistenceResult>;
  load(slot: SaveSlotIdV1): Promise<TPersistenceResult>;
  clear(slot: SaveSlotIdV1): Promise<TPersistenceResult>;
  exportSave(slot: SaveSlotIdV1): Promise<TSaveExportResult>;
  exportCurrentSave(): Promise<TExportedSave>;
  importSave(bytes: Uint8Array): Promise<TPersistenceResult>;
}

export interface PlayerDiagnosticsPortV1<TDebugBundle> {
  exportDebugBundle(): Promise<TDebugBundle>;
}

export interface SemanticPublicationV1<TGameView, TActionDescriptor, TStatus> {
  readonly revision: NonNegativeSafeInteger;
  readonly status: DeepReadonly<TStatus>;
  readonly game: DeepReadonly<TGameView>;
  readonly actions: readonly DeepReadonly<TActionDescriptor>[];
}

export interface SemanticGamePortV1<
  TGameView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
  TStatus = RuntimeSessionStatusV1,
> {
  observe(): DeepReadonly<SemanticPublicationV1<TGameView, TActionDescriptor, TStatus>>;
  subscribe(listener: () => void): () => void;
  availableActions(): readonly DeepReadonly<TActionDescriptor>[];
  preview(invocation: DeepReadonly<TInvocation>): Promise<TPreview>;
  dispatch(invocation: DeepReadonly<TInvocation>): Promise<TResult>;
  waitForIdle(
    afterRevision?: NonNegativeSafeInteger,
  ): Promise<DeepReadonly<SemanticPublicationV1<TGameView, TActionDescriptor, TStatus>>>;
}

export interface SemanticGamePortSourceV1<TState, TStatus> {
  getCurrentState(): DeepReadonly<TState>;
  getAuthoritativeRevisionToken(): object;
  getStatus(): DeepReadonly<TStatus>;
  subscribe(listener: () => void): () => void;
  reportSubscriberFailure(error: unknown): void;
  readStateAtQueueFront<TResult>(
    reader: (state: DeepReadonly<TState>) => TResult,
  ): Promise<TResult>;
}

export interface SemanticGamePortInputV1<
  TState,
  TStatus,
  TQueries,
  TGameView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
> {
  readonly source: SemanticGamePortSourceV1<TState, TStatus>;
  createQueries(state: DeepReadonly<TState>): TQueries;
  projectGameView(queries: TQueries): TGameView;
  actions(queries: TQueries): readonly TActionDescriptor[];
  preview(queries: TQueries, invocation: DeepReadonly<TInvocation>): TPreview;
  dispatch(invocation: DeepReadonly<TInvocation>): Promise<TResult>;
}

export interface UiRendererBindingV1<TId, TViewModel, TViewSlice, TRenderer> {
  readonly id: TId;
  select(view: DeepReadonly<TViewModel>): DeepReadonly<TViewSlice>;
  readonly renderer: TRenderer;
}

export interface UiContributionSetV1<
  TSceneBinding,
  TOverlayBinding,
  THudBinding,
  TGameSymbolProvider,
> {
  readonly scenes: readonly TSceneBinding[];
  readonly overlays: readonly TOverlayBinding[];
  readonly hud: readonly THudBinding[];
  readonly gameSymbols: readonly TGameSymbolProvider[];
}
