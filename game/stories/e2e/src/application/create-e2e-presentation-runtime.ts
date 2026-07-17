// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parseStoryId } from "@sillymaker/base";
import type {
  AssetId,
  ContentPreferencePortV1,
  DeepReadonly,
  GameHostV1,
  LocaleId,
  ReadonlyViewSourceV1,
  ResolvedAssetManifestV1,
  TextId,
} from "@sillymaker/base";
import type { PersistenceRebootstrapDisposalV1 } from "@sillymaker/base/runtime";
import {
  createAssetRegistryV1,
  createInputRouterV1,
  createInteractionControllerV1,
  createInteractionSessionStoreV1,
  createPresentationIntentRouterV1,
  createPresentationReadPortV1,
  createRuntimePresentationStoreV1,
  createSemanticPublicationBridgeV1,
  createViewSourceV1,
  initialInteractionSessionStateV1,
  interactionTargetControlIdV1,
  validateRuntimeInteractionSurfaceV1,
  type AssetRegistryV1,
  type InputRouterV1,
  type InteractionBehaviorControllerV1,
  type InteractionSessionStateV1,
  type InteractionSessionStoreV1,
  type OverlayCloseTopResultV1,
  type OverlayPushDetailResultV1,
  type OverlaySessionStoreV1,
  type PresentationIntentRouterV1,
  type PresentationReadPortV1,
  type RuntimeAssetLoaderV1,
  type RuntimePresentationStoreV1,
} from "@sillymaker/ui";
import {
  createBrowserImageLoaderV1,
  createHashRouterV1,
  createPlayerUiPortsV1,
  createWebContentPreferencePortV1,
  installPointerAdapterV1,
  type BrowserImageLoaderEnvironmentV1,
  type HashRouterEventTargetV1,
  type HashRouterLocationV1,
  type PointerAdapterInputV1,
  type WebRuntimeRebootstrapLifecycleV1,
} from "@sillymaker/web";

import { createE2eGameRuntimeV1 } from "./create-e2e-game-runtime.js";
import type { E2eGameApplicationPortV1 } from "./create-e2e-game-runtime.js";
import { e2eInteractionFixtureV1 } from "../presentation/interaction-fixture.js";
import {
  projectE2eRuntimePresentationV1,
  type E2ePresentationUiStateV1,
  type E2eRuntimePresentationPublicationV1,
} from "../presentation/runtime-presentation.js";
import type { E2eSemanticActionDescriptorV1 } from "../presentation/runtime-presentation.js";
import {
  e2eUiContributionRegistryV1,
  type E2eUiPresentationReadPortV1,
} from "../presentation/ui-contributions.js";
import type { E2eSemanticInvocationV1 } from "../runtime/e2e-semantic-game-port.js";
import type { E2eResolvedGameV1 } from "../story-entry.js";

type E2eAssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];

interface E2ePointerWindowV1 {
  addEventListener(type: "blur", listener: () => void): void;
  removeEventListener(type: "blur", listener: () => void): void;
}

interface E2ePointerDocumentV1 {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(type: "visibilitychange", listener: () => void): void;
  removeEventListener(type: "visibilitychange", listener: () => void): void;
}

interface E2ePresentationBrowserEnvironmentCommonV1 {
  readonly pointerTarget: HTMLElement;
  readonly pointerWindow: E2ePointerWindowV1;
  readonly pointerDocument: E2ePointerDocumentV1;
  readonly location: HashRouterLocationV1;
  readonly hashEventTarget: HashRouterEventTargetV1;
}

export type E2ePresentationBrowserEnvironmentV1 = E2ePresentationBrowserEnvironmentCommonV1 &
  (
    | { readonly assetLoader: RuntimeAssetLoaderV1; readonly imageLoader?: never }
    | {
        readonly assetLoader?: never;
        readonly imageLoader: BrowserImageLoaderEnvironmentV1;
      }
  );

export interface CreateE2ePresentationRuntimeInputV1 {
  readonly resolved: E2eResolvedGameV1;
  readonly host: GameHostV1;
  readonly environment: E2ePresentationBrowserEnvironmentV1;
  readonly rebootstrapDisposition?: DeepReadonly<PersistenceRebootstrapDisposalV1>;
  onRebootstrapLifecycle?(
    lifecycle: WebRuntimeRebootstrapLifecycleV1<PersistenceRebootstrapDisposalV1>,
  ): void;
}

export interface E2ePresentationRuntimeV1 {
  readonly applicationId: "e2e-web";
  readonly resolvedGame: E2eResolvedGameV1;
  readonly application: E2eGameApplicationPortV1;
  readonly playerUi: ReturnType<typeof createPlayerUiPortsV1>;
  readonly contentPreference: ContentPreferencePortV1;
  readonly uiState: ReadonlyViewSourceV1<E2ePresentationUiStateV1>;
  readonly presentation: RuntimePresentationStoreV1<E2eRuntimePresentationPublicationV1>;
  readonly intents: PresentationIntentRouterV1;
  readonly input: InputRouterV1;
  readonly assets: AssetRegistryV1<AssetId, E2eAssetUsageV1, string>;
  readonly presentationRead: PresentationReadPortV1<
    TextId,
    AssetId,
    E2eAssetUsageV1,
    LocaleId,
    string
  >;
  readonly contributions: typeof e2eUiContributionRegistryV1;
  readonly interactionSession: InteractionSessionStoreV1;
  readonly interactionController: InteractionBehaviorControllerV1;
  readonly overlaySession: OverlaySessionStoreV1<string>;
  dispose(): void;
}

type E2eUiStateReducerV1 = (
  current: DeepReadonly<E2ePresentationUiStateV1>,
) => DeepReadonly<E2ePresentationUiStateV1>;

function frozenUiStateV1(input: E2ePresentationUiStateV1): DeepReadonly<E2ePresentationUiStateV1> {
  return Object.freeze({
    route: input.route,
    primaryOverlayId: input.primaryOverlayId,
    interaction: Object.freeze({ ...input.interaction }),
    activeCueId: input.activeCueId,
  });
}

function readonlyUiStateV1(
  source: ReturnType<typeof createViewSourceV1<E2ePresentationUiStateV1>>,
): ReadonlyViewSourceV1<E2ePresentationUiStateV1> {
  return Object.freeze({ getCurrent: source.getCurrent, subscribe: source.subscribe });
}

function sameInteractionStateV1(
  left: DeepReadonly<InteractionSessionStateV1>,
  right: DeepReadonly<InteractionSessionStateV1>,
): boolean {
  return (
    left.activeSurfaceId === right.activeSurfaceId &&
    left.choosingTargetId === right.choosingTargetId &&
    left.returnFocusId === right.returnFocusId
  );
}

function createOverlaySessionV1(
  getPrimaryId: () => string | null,
  setPrimaryId: (overlayId: string | null) => void,
  subscribe: (listener: () => void) => () => void,
): OverlaySessionStoreV1<string> {
  const noPrimaryV1 = Object.freeze({ kind: "rejected" as const, code: "no_primary" as const });
  const duplicateV1 = Object.freeze({ kind: "rejected" as const, code: "duplicate" as const });
  const detailLimitV1 = Object.freeze({
    kind: "rejected" as const,
    code: "detail_limit" as const,
  });
  let cachedPrimaryId: string | null | undefined;
  let cachedSnapshot = Object.freeze({
    primaryId: null as string | null,
    detailIds: Object.freeze([]) as readonly string[],
  });
  const getSnapshot = () => {
    const primaryId = getPrimaryId();
    if (cachedPrimaryId === primaryId) return cachedSnapshot;
    cachedPrimaryId = primaryId;
    cachedSnapshot = Object.freeze({
      primaryId,
      detailIds: Object.freeze([]) as readonly string[],
    });
    return cachedSnapshot;
  };
  return Object.freeze({
    getSnapshot,
    subscribe,
    openPrimary: setPrimaryId,
    pushDetail(id: string): OverlayPushDetailResultV1 {
      const primaryId = getPrimaryId();
      if (primaryId === null) return noPrimaryV1;
      if (primaryId === id) return duplicateV1;
      return detailLimitV1;
    },
    closeTop(): OverlayCloseTopResultV1 {
      if (getPrimaryId() === null) return "already_closed";
      setPrimaryId(null);
      return "primary_closed";
    },
    closeAll(): void {
      if (getPrimaryId() !== null) setPrimaryId(null);
    },
  });
}

export async function createE2ePresentationRuntimeV1(
  input: CreateE2ePresentationRuntimeInputV1,
): Promise<E2ePresentationRuntimeV1> {
  const environment = input.environment;
  const router = createHashRouterV1({
    location: environment.location,
    eventTarget: environment.hashEventTarget,
  });
  const assetLoader =
    environment.assetLoader ?? createBrowserImageLoaderV1(environment.imageLoader);
  const assets = createAssetRegistryV1<AssetId, E2eAssetUsageV1, string>(
    input.resolved.assets,
    assetLoader,
    () => input.host.log.write("warn", "presentation.asset_load_failed", Object.freeze({})),
  );
  const presentationRead = createPresentationReadPortV1({
    catalogs: input.resolved.presentation.textCatalogs,
    locale: input.resolved.presentation.textCatalogs.defaultLocale,
    assets,
  });

  const [application, contentPreference] = await Promise.all([
    createE2eGameRuntimeV1({
      resolved: input.resolved,
      host: input.host,
      ...(input.rebootstrapDisposition === undefined
        ? {}
        : { rebootstrapDisposition: input.rebootstrapDisposition }),
      ...(input.onRebootstrapLifecycle === undefined
        ? {}
        : { onRebootstrapLifecycle: input.onRebootstrapLifecycle }),
    }),
    createWebContentPreferencePortV1({
      records: input.host.records,
      storyId: parseStoryId(input.resolved.provenance.story.id),
      policy: input.resolved.sceneGraph.contentMaturityPolicy,
      reportWarning: () =>
        input.host.log.write("warn", "presentation.content_preference_warning", Object.freeze({})),
    }),
  ]);
  const playerUi = createPlayerUiPortsV1({
    files: input.host.files,
    persistence: application.persistence,
    diagnostics: application.diagnostics,
  });

  const uiStateSource = createViewSourceV1<E2ePresentationUiStateV1>(
    frozenUiStateV1({
      route: router.observe().route,
      primaryOverlayId: null,
      interaction: initialInteractionSessionStateV1,
      activeCueId: null,
    }),
  );
  const uiState = readonlyUiStateV1(uiStateSource);
  const updateUiState = (reducer: E2eUiStateReducerV1): void => {
    const current = uiStateSource.getCurrent();
    const next = reducer(current);
    if (next === current) return;
    uiStateSource.publish(
      frozenUiStateV1({
        route: next.route,
        primaryOverlayId: next.primaryOverlayId,
        interaction: next.interaction,
        activeCueId: next.activeCueId,
      }),
    );
  };

  const unsubscribeRoute = router.subscribe(() => {
    const route = router.observe().route;
    updateUiState((current) =>
      current.route === route ? current : Object.freeze({ ...current, route }),
    );
  });
  const interactionSession = createInteractionSessionStoreV1({
    getSnapshot: () => uiStateSource.getCurrent().interaction,
    subscribe: uiStateSource.subscribe,
    update(reducer) {
      updateUiState((current) => {
        const interaction = reducer(current.interaction);
        return sameInteractionStateV1(interaction, current.interaction)
          ? current
          : Object.freeze({ ...current, interaction });
      });
    },
  });
  const overlaySession = createOverlaySessionV1(
    () => uiStateSource.getCurrent().primaryOverlayId,
    (primaryOverlayId) =>
      updateUiState((current) =>
        current.primaryOverlayId === primaryOverlayId
          ? current
          : Object.freeze({ ...current, primaryOverlayId }),
      ),
    uiStateSource.subscribe,
  );
  const intents = createPresentationIntentRouterV1({
    knownOverlayIds: Object.freeze(["overlay.e2e.test_panel", "overlay.e2e.save"]),
    knownSurfaceIds: Object.freeze(
      input.resolved.sceneGraph.interactionSurfaces.map(({ surfaceId }) => surfaceId),
    ),
    knownCueIds: Object.freeze(e2eInteractionFixtureV1.cueProviders.map(({ cueId }) => cueId)),
    overlay: Object.freeze({
      open: overlaySession.openPrimary,
    }),
    session: Object.freeze({
      open: interactionSession.open,
      leave() {
        interactionSession.leave();
      },
    }),
    cue: Object.freeze({
      play(activeCueId: string) {
        updateUiState((current) =>
          current.activeCueId === activeCueId
            ? current
            : Object.freeze({ ...current, activeCueId }),
        );
      },
    }),
  });
  const semanticBridge = createSemanticPublicationBridgeV1(application.semantic);
  const presentation = createRuntimePresentationStoreV1({
    semantic: semanticBridge,
    resolvedCatalog: input.resolved.sceneGraph,
    contentPreference,
    uiState,
    project: projectE2eRuntimePresentationV1,
    reportFailure: (failure) =>
      input.host.log.write("warn", failure.code, Object.freeze({ summary: failure.summary })),
  });

  const resolveValidatedSurface = (
    publication: DeepReadonly<E2eRuntimePresentationPublicationV1>,
    surfaceId: Parameters<typeof interactionSession.open>[0],
  ) => {
    const matches = publication.view.interactionSurfaces.filter(
      (surface) => surface.surfaceId === surfaceId,
    );
    if (matches.length !== 1 || matches[0] === undefined) return null;
    const validated = validateRuntimeInteractionSurfaceV1(matches[0], {
      revision: publication.revision,
      resolvedSurfaces: input.resolved.sceneGraph.interactionSurfaces,
      runtimeSurfaces: publication.view.interactionSurfaces,
    });
    return validated.spatialState === "enabled" ? validated.surface : null;
  };
  const interactionController = createInteractionControllerV1<
    E2eRuntimePresentationPublicationV1,
    E2eSemanticActionDescriptorV1,
    E2eSemanticInvocationV1,
    Awaited<ReturnType<E2eGameApplicationPortV1["semantic"]["dispatch"]>>,
    ReturnType<PresentationIntentRouterV1["execute"]>
  >({
    presentation,
    resolveSurface: resolveValidatedSurface,
    semantic: application.semantic,
    intents,
    session: interactionSession,
    getReturnFocusId: (activation) =>
      interactionTargetControlIdV1(activation.surfaceId, activation.targetId),
  });
  const inputRouter = createInputRouterV1();
  const pointer = installPointerAdapterV1({
    target: environment.pointerTarget,
    route: inputRouter.route,
    window: environment.pointerWindow as PointerAdapterInputV1["window"],
    document: environment.pointerDocument as PointerAdapterInputV1["document"],
  });

  let preloadController: AbortController | undefined;
  let preloadDisposed = false;
  const preloadRequiredAssets = (): void => {
    preloadController?.abort();
    const controller = new AbortController();
    preloadController = controller;
    const requiredAssetIds = presentation.getSnapshot().requiredAssetIds;
    void assets.preload(requiredAssetIds, controller.signal).catch(() => {
      if (!controller.signal.aborted) {
        input.host.log.write("warn", "presentation.asset_preload_failed", Object.freeze({}));
      }
    });
  };
  const unsubscribePreload = presentation.subscribe(preloadRequiredAssets);
  preloadRequiredAssets();

  let previousStageSceneId = presentation.getSnapshot().view.stage.stageSceneId;
  const unsubscribeStageCleanup = presentation.subscribe(() => {
    const nextStageSceneId = presentation.getSnapshot().view.stage.stageSceneId;
    if (nextStageSceneId === previousStageSceneId) return;
    previousStageSceneId = nextStageSceneId;
    if (interactionSession.getSnapshot().activeSurfaceId !== null) {
      interactionSession.cleanup("stage_scene_replaced");
    }
  });

  let disposed = false;
  const runtime = Object.freeze({
    applicationId: "e2e-web" as const,
    resolvedGame: input.resolved,
    application,
    playerUi,
    contentPreference,
    uiState,
    presentation,
    intents,
    input: inputRouter,
    assets,
    presentationRead: presentationRead as E2eUiPresentationReadPortV1,
    contributions: e2eUiContributionRegistryV1,
    interactionSession,
    interactionController,
    overlaySession,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      pointer.dispose();
      unsubscribeRoute();
      router.dispose();
      if (!preloadDisposed) {
        preloadDisposed = true;
        unsubscribePreload();
        preloadController?.abort();
      }
      unsubscribeStageCleanup();
      presentation.dispose();
      semanticBridge.dispose();
      assets.dispose();
    },
  }) satisfies E2ePresentationRuntimeV1;
  return runtime;
}
