// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type {
  AssetId,
  ContentPreferencePortV1,
  DeepReadonly,
  Digest,
  GameHostV1,
  InteractionSurfaceId,
  ReadonlyViewSourceV1,
  ResolvedAssetManifestV1,
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
  createSystemDialogSessionStoreV1,
  createUiContributionRegistryV1,
  createViewSourceV1,
  initialInteractionSessionStateV1,
  interactionTargetControlIdV1,
  validateRuntimeInteractionSurfaceV1,
} from "@sillymaker/ui";
import type {
  AssetRegistryV1,
  GameSymbolRegistryV1,
  InputRouterV1,
  InteractionSessionStoreV1,
  OverlayCloseTopResultV1,
  OverlayPushDetailResultV1,
  OverlaySessionStoreV1,
  PresentationIntentRouterV1,
  PresentationReadPortV1,
  RuntimeAssetLoaderV1,
  RuntimeInteractionSurfaceV1,
  RuntimePresentationStoreV1,
  SystemDialogSessionStoreV1,
  UiContributionRegistryV1,
} from "@sillymaker/ui";
import { createDebugUiContextV1 } from "@sillymaker/ui/diagnostics";
import type { DebugUiSessionProjectionInputV1 } from "@sillymaker/ui/diagnostics";
import type { DevDockOpenStateV1 } from "@sillymaker/ui/debug";
import type { DevDockContributionSetV1 } from "@sillymaker/ui/debug";
import {
  createBrowserImageLoaderV1,
  createGameBootstrapControllerV1,
  createHashRouterV1,
  createPlayerUiPortsV1,
  createWebContentPreferencePortV1,
  installBrowserAutomationBridgeV1,
  installPointerAdapterV1,
  parseCapabilityRequestV1,
} from "@sillymaker/web";
import type {
  HashRouterEventTargetV1,
  HashRouterLocationV1,
  PointerAdapterInputV1,
  RuntimeCapabilitySessionOverlayV1,
  WebRuntimeRebootstrapLifecycleV1,
} from "@sillymaker/web";

import { pocStoryIdentityV1 } from "../content/identity.js";
import { pocContentMaturityPolicyV1 } from "../presentation/content-maturity-policy.js";
import type {
  PocOverlayIdV1,
  PocPresentationUiStateV1,
  PocRuntimePresentationPublicationV1,
} from "../presentation/runtime/contracts.js";
import { isPocNarrativeOpenV1 } from "../presentation/runtime/contracts.js";
import { projectPocRuntimePresentationV1 } from "../presentation/runtime/project-poc-runtime-presentation.js";
import type {
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1,
} from "../presentation/semantic-actions.js";
import { pocGameSymbolRegistryV1 } from "../presentation/symbols/poc-game-symbols.js";
import {
  pocUiContributionsV1,
  type PocUiPresentationReadPortV1,
  type PocUiRendererContextsV1,
} from "../presentation/ui-contributions.js";
import { pocStoryEntryV1, type PocResolvedGameV1 } from "../story-definition.js";
import type { PocGameApplicationPortV1 } from "./create-poc-game-application.js";
import { createPocGameRuntimeV1 } from "./create-poc-game-runtime.js";

type BuildIdentityInputV1 = Parameters<
  (typeof import("@sillymaker/base"))["resolveGamePackageV1"]
>[2];
type PocAssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];
type PocAssetRegistryV1 = AssetRegistryV1<AssetId, PocAssetUsageV1, string>;
type PocPresentationReadPortV1 = PresentationReadPortV1<
  Parameters<PocUiPresentationReadPortV1["text"]>[0],
  AssetId,
  PocAssetUsageV1,
  PocUiPresentationReadPortV1["locale"],
  string
>;
type PocRuntimeSurfaceV1 = RuntimeInteractionSurfaceV1<
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1
>;

export const pocApplicationIdV1 = "poc-web" as const;
const pocToolingUiSpecifierV1 = "@project-tavern/story-poc/tooling-ui" as const;

type PocToolingUiModuleV1 = {
  readonly pocToolingUiContributionsV1: typeof import("../tooling-ui/index.js").pocToolingUiContributionsV1;
};

export type PocToolingUiLoaderV1 = (
  specifier: typeof pocToolingUiSpecifierV1,
) => Promise<PocToolingUiModuleV1>;

const pocOverlayIdsV1 = Object.freeze([
  "overlay.poc.policy",
  "overlay.poc.inventory",
  "overlay.poc.purchase",
  "overlay.poc.tavern_plan",
  "overlay.poc.facility",
  "overlay.poc.world_action",
  "overlay.poc.ledger",
  "overlay.poc.relationship",
  "overlay.poc.run_summary",
  "overlay.poc.save",
] as const satisfies readonly PocOverlayIdV1[]);

const noPresentationCueIdsV1 = Object.freeze([]) as readonly string[];
const closedDevDockStateV1 = Object.freeze({
  leftOpen: false,
  rightOpen: false,
}) satisfies DevDockOpenStateV1;

export interface PocInteractionSurfaceResolutionV1 {
  readonly surface: DeepReadonly<PocRuntimeSurfaceV1>;
  readonly spatialState: "enabled" | "disabled";
  readonly faults: readonly unknown[];
}

export interface PocPresentationRuntimeV1 {
  readonly applicationId: typeof pocApplicationIdV1;
  readonly resolvedGame: PocResolvedGameV1;
  readonly application: PocGameApplicationPortV1;
  readonly capabilitySession: RuntimeCapabilitySessionOverlayV1;
  readonly playerUi: ReturnType<typeof createPlayerUiPortsV1>;
  readonly contentPreference: ContentPreferencePortV1;
  readonly uiState: ReadonlyViewSourceV1<PocPresentationUiStateV1>;
  readonly presentation: RuntimePresentationStoreV1<PocRuntimePresentationPublicationV1>;
  readonly intents: PresentationIntentRouterV1;
  readonly input: InputRouterV1;
  readonly assets: PocAssetRegistryV1;
  readonly presentationRead: PocPresentationReadPortV1;
  readonly contributions: UiContributionRegistryV1<PocUiRendererContextsV1>;
  readonly gameSymbols: GameSymbolRegistryV1;
  loadToolingUiContributions(): Promise<DevDockContributionSetV1>;
  bindDevDockStateReader(reader: () => DeepReadonly<DevDockOpenStateV1>): () => void;
  readonly rendering: Readonly<{
    readonly interactionSession: InteractionSessionStoreV1;
    readonly interactionController: ReturnType<typeof createInteractionControllerV1>;
    readonly overlaySession: OverlaySessionStoreV1<PocOverlayIdV1>;
    readonly systemDialogSession: SystemDialogSessionStoreV1;
    resolveInteractionSurface(
      publication: DeepReadonly<PocRuntimePresentationPublicationV1>,
      surfaceId: InteractionSurfaceId,
    ): PocInteractionSurfaceResolutionV1 | null;
  }>;
  dispose(): void;
}

export interface CreatePocPresentationRuntimeInputV1 {
  readonly host: GameHostV1;
  readonly buildIdentity: BuildIdentityInputV1;
  readonly appBuildId: Digest;
  readonly pointerTarget: HTMLElement;
  readonly storyEntry?: typeof pocStoryEntryV1;
  readonly location?: HashRouterLocationV1;
  readonly hashEvents?: HashRouterEventTargetV1;
  readonly pointerWindow?: PointerAdapterInputV1["window"];
  readonly pointerDocument?: PointerAdapterInputV1["document"];
  readonly assetLoader?: RuntimeAssetLoaderV1;
  readonly capabilitySearch?: string;
  readonly loadToolingUi?: PocToolingUiLoaderV1;
  readonly rebootstrapDisposition?: DeepReadonly<PersistenceRebootstrapDisposalV1>;
  onConstructionFailureDisposition?(disposition: PersistenceRebootstrapDisposalV1): void;
  onRebootstrapLifecycle?(
    lifecycle: WebRuntimeRebootstrapLifecycleV1<PersistenceRebootstrapDisposalV1>,
  ): void | PromiseLike<void>;
}

function browserLocationV1(): HashRouterLocationV1 {
  if (typeof location === "undefined") throw new TypeError("poc.hash_location_unavailable");
  return location;
}

function browserCapabilitySearchV1(): string {
  return typeof location === "undefined" ? "" : location.search;
}

function browserPointerWindowV1(): PointerAdapterInputV1["window"] {
  if (typeof window === "undefined") throw new TypeError("poc.pointer_window_unavailable");
  return window;
}

function browserPointerDocumentV1(): PointerAdapterInputV1["document"] {
  if (typeof document === "undefined") throw new TypeError("poc.pointer_document_unavailable");
  return document;
}

function createDefaultAssetLoaderV1(): RuntimeAssetLoaderV1 {
  if (typeof document === "undefined" || typeof Image === "undefined") {
    throw new TypeError("poc.asset_loader_environment_unavailable");
  }
  return createBrowserImageLoaderV1({
    resolveRuntimeUrl: (runtimePath) => new URL(runtimePath, document.baseURI).href,
    createImage: () => new Image(),
  });
}

function readonlyUiStateV1(
  source: ReturnType<typeof createViewSourceV1<PocPresentationUiStateV1>>,
): ReadonlyViewSourceV1<PocPresentationUiStateV1> {
  return Object.freeze({ getCurrent: source.getCurrent, subscribe: source.subscribe });
}

function createOverlaySessionV1(
  getPrimaryId: () => PocOverlayIdV1 | null,
  setPrimaryId: (overlayId: PocOverlayIdV1 | null) => void,
  subscribe: (listener: () => void) => () => void,
): OverlaySessionStoreV1<PocOverlayIdV1> {
  const noPrimaryV1 = Object.freeze({ kind: "rejected" as const, code: "no_primary" as const });
  const duplicateV1 = Object.freeze({ kind: "rejected" as const, code: "duplicate" as const });
  const detailLimitV1 = Object.freeze({
    kind: "rejected" as const,
    code: "detail_limit" as const,
  });
  let cachedPrimaryId: PocOverlayIdV1 | null | undefined;
  let cachedSnapshot = Object.freeze({
    primaryId: null as PocOverlayIdV1 | null,
    detailIds: Object.freeze([]) as readonly PocOverlayIdV1[],
  });
  const getSnapshotV1 = () => {
    const primaryId = getPrimaryId();
    if (cachedPrimaryId === primaryId) return cachedSnapshot;
    cachedPrimaryId = primaryId;
    cachedSnapshot = Object.freeze({
      primaryId,
      detailIds: Object.freeze([]) as readonly PocOverlayIdV1[],
    });
    return cachedSnapshot;
  };
  return Object.freeze({
    getSnapshot: getSnapshotV1,
    subscribe,
    openPrimary: setPrimaryId,
    pushDetail(id: PocOverlayIdV1): OverlayPushDetailResultV1 {
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

function findOnlyRuntimeSurfaceV1(
  publication: DeepReadonly<PocRuntimePresentationPublicationV1>,
  surfaceId: InteractionSurfaceId,
): DeepReadonly<PocRuntimeSurfaceV1> | null {
  const matches = publication.view.interactionSurfaces.filter(
    (surface) => surface.surfaceId === surfaceId,
  );
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

export async function createPocPresentationRuntimeV1(
  input: CreatePocPresentationRuntimeInputV1,
): Promise<PocPresentationRuntimeV1> {
  const storyEntry = input.storyEntry ?? pocStoryEntryV1;
  const preferencePromise = createWebContentPreferencePortV1({
    records: input.host.records,
    storyId: pocStoryIdentityV1.id,
    policy: pocContentMaturityPolicyV1,
    reportWarning: () =>
      input.host.log.write("warn", "presentation.content_preference_warning", Object.freeze({})),
  });
  const bootstrapPromise = createGameBootstrapControllerV1({
    host: input.host,
    buildIdentity: input.buildIdentity,
  })(storyEntry, []);
  const [contentPreference, bootstrapped] = await Promise.all([
    preferencePromise,
    bootstrapPromise,
  ]);
  if (bootstrapped.kind !== "ready") {
    throw new TypeError(`PoC bootstrap failed: ${bootstrapped.code}`);
  }

  const resolvedGame = bootstrapped.resolved as PocResolvedGameV1;
  const capabilityRequest = parseCapabilityRequestV1(
    input.capabilitySearch ?? browserCapabilitySearchV1(),
  );
  const sessionRequestedCapabilities =
    capabilityRequest.kind === "accepted" ? capabilityRequest.requested : Object.freeze([]);
  let diagnosticsPresentation:
    RuntimePresentationStoreV1<PocRuntimePresentationPublicationV1> | undefined;
  let readDiagnosticsUiSession:
    | ((
        publication: DeepReadonly<PocRuntimePresentationPublicationV1>,
      ) => DebugUiSessionProjectionInputV1)
    | undefined;
  let readDiagnosticsDevDockState: (() => DeepReadonly<DevDockOpenStateV1>) | undefined;
  let capturedLifecycle:
    WebRuntimeRebootstrapLifecycleV1<PersistenceRebootstrapDisposalV1> | undefined;
  let capturedCapabilitySession: RuntimeCapabilitySessionOverlayV1 | undefined;
  const application = await createPocGameRuntimeV1({
    resolved: resolvedGame,
    host: input.host,
    appBuildId: input.appBuildId,
    sessionRequestedCapabilities,
    readUiContext() {
      const presentation = diagnosticsPresentation?.getSnapshot();
      const readUiSession = readDiagnosticsUiSession;
      if (presentation === undefined || readUiSession === undefined) return undefined;
      const contentPreferenceSnapshot = contentPreference.observe();
      const uiSession = readUiSession(presentation);
      return createDebugUiContextV1({
        presentation,
        contentPolicy: pocContentMaturityPolicyV1,
        contentPreference: contentPreferenceSnapshot,
        uiSession,
      });
    },
    ...(input.rebootstrapDisposition === undefined
      ? {}
      : { rebootstrapDisposition: input.rebootstrapDisposition }),
    onCapabilitySession(session) {
      if (capturedCapabilitySession !== undefined) {
        throw new TypeError("PoC presentation runtime received duplicate capability session");
      }
      capturedCapabilitySession = session;
    },
    onRebootstrapLifecycle(lifecycle) {
      if (capturedLifecycle !== undefined) {
        throw new TypeError("PoC presentation runtime received duplicate HMR lifecycle");
      }
      capturedLifecycle = lifecycle;
    },
  });
  const capabilitySession = capturedCapabilitySession;
  if (capabilitySession === undefined) {
    throw new TypeError("PoC presentation runtime did not capture a capability session");
  }
  let completedRuntime: PocPresentationRuntimeV1 | undefined;
  let automationBridgeForCleanup: ReturnType<typeof installBrowserAutomationBridgeV1> | undefined;
  const presentationCleanups: (() => void)[] = [];
  presentationCleanups.push(() => capabilitySession.dispose());
  let presentationDisposed = false;
  const disposePresentationConstructionV1 = (): void => {
    if (presentationDisposed) return;
    presentationDisposed = true;
    automationBridgeForCleanup?.dispose();
    diagnosticsPresentation = undefined;
    readDiagnosticsUiSession = undefined;
    readDiagnosticsDevDockState = undefined;
    for (const cleanup of presentationCleanups.toReversed()) {
      try {
        cleanup();
      } catch {
        // The first construction or lifecycle failure remains authoritative.
      }
    }
  };
  try {
    const playerUi = createPlayerUiPortsV1({
      files: input.host.files,
      persistence: application.persistence,
      diagnostics: application.diagnostics,
    });

    const loadToolingUi: PocToolingUiLoaderV1 =
      input.loadToolingUi ??
      (async () => (await import("@project-tavern/story-poc/tooling-ui")) as PocToolingUiModuleV1);
    let cachedToolingUiContributions: DevDockContributionSetV1 | undefined;
    let toolingUiAttempt: Promise<DevDockContributionSetV1> | undefined;
    const loadToolingUiContributions = async (): Promise<DevDockContributionSetV1> => {
      if (presentationDisposed) {
        throw new TypeError("presentation.poc.tooling_ui_disposed");
      }
      if (!capabilitySession.state.getCurrent().debugTools) {
        throw new TypeError("presentation.poc.tooling_ui_capability_disabled");
      }
      if (cachedToolingUiContributions !== undefined) return cachedToolingUiContributions;
      if (toolingUiAttempt !== undefined) return await toolingUiAttempt;
      const attempt = (async () => {
        const module = await loadToolingUi(pocToolingUiSpecifierV1);
        if (presentationDisposed) {
          throw new TypeError("presentation.poc.tooling_ui_disposed");
        }
        const contributions = module.pocToolingUiContributionsV1({
          debugTools: application.debugTools,
          effectiveCapabilities: capabilitySession.state,
          persistedCapabilities: capabilitySession.persisted,
          sessionRequested: capabilitySession.sessionRequested,
        });
        cachedToolingUiContributions = contributions;
        return contributions;
      })();
      toolingUiAttempt = attempt;
      try {
        return await attempt;
      } finally {
        if (toolingUiAttempt === attempt) toolingUiAttempt = undefined;
      }
    };

    const locationPort = input.location ?? browserLocationV1();
    const router = createHashRouterV1({
      location: locationPort,
      ...(input.hashEvents === undefined ? {} : { eventTarget: input.hashEvents }),
    });
    presentationCleanups.push(() => router.dispose());
    const uiStateSource = createViewSourceV1<PocPresentationUiStateV1>(
      Object.freeze({
        route: router.observe().route,
        primaryOverlayId: null,
        interaction: initialInteractionSessionStateV1,
        activeCueId: null,
      }),
    );
    const uiState = readonlyUiStateV1(uiStateSource);
    const updateUiStateV1 = (
      update: (current: DeepReadonly<PocPresentationUiStateV1>) => PocPresentationUiStateV1,
    ): void => {
      const current = uiStateSource.getCurrent();
      const next = Object.freeze(update(current));
      if (
        next.route === current.route &&
        next.primaryOverlayId === current.primaryOverlayId &&
        next.interaction === current.interaction &&
        next.activeCueId === current.activeCueId
      ) {
        return;
      }
      uiStateSource.publish(next);
    };

    const interactionSession = createInteractionSessionStoreV1({
      getSnapshot: () => uiStateSource.getCurrent().interaction,
      subscribe: uiStateSource.subscribe,
      update(reducer) {
        updateUiStateV1((current) =>
          Object.freeze({ ...current, interaction: reducer(current.interaction) }),
        );
      },
    });
    const overlaySession = createOverlaySessionV1(
      () => uiStateSource.getCurrent().primaryOverlayId,
      (primaryOverlayId) =>
        updateUiStateV1((current) => Object.freeze({ ...current, primaryOverlayId })),
      uiStateSource.subscribe,
    );
    const systemDialogSession = createSystemDialogSessionStoreV1();
    presentationCleanups.push(() => systemDialogSession.closeSettings());
    readDiagnosticsUiSession = (publication) => {
      const currentUiState = uiStateSource.getCurrent();
      const currentOverlay = overlaySession.getSnapshot();
      const currentSystemDialog = systemDialogSession.getSnapshot();
      const currentDevDock = readDiagnosticsDevDockState?.() ?? closedDevDockStateV1;
      return Object.freeze({
        routeId: currentUiState.route,
        primaryOverlayId: currentOverlay.primaryId,
        detailOverlayIds: Object.freeze([...currentOverlay.detailIds]),
        narrativeOpen: isPocNarrativeOpenV1(publication.view.narrative),
        systemDialogOpen: currentSystemDialog.settingsOpen,
        devDock: Object.freeze({
          leftOpen: currentDevDock.leftOpen,
          rightOpen: currentDevDock.rightOpen,
        }),
        activeInteractionSurfaceId: currentUiState.interaction.activeSurfaceId,
      });
    };

    const intents = createPresentationIntentRouterV1({
      knownOverlayIds: pocOverlayIdsV1,
      knownSurfaceIds: resolvedGame.sceneGraph.interactionSurfaces.map(
        ({ surfaceId }) => surfaceId,
      ),
      knownCueIds: noPresentationCueIdsV1,
      overlay: Object.freeze({
        open: (overlayId: string) => overlaySession.openPrimary(overlayId as PocOverlayIdV1),
      }),
      session: interactionSession,
      cue: Object.freeze({
        play: (activeCueId: string) =>
          updateUiStateV1((current) => Object.freeze({ ...current, activeCueId })),
      }),
    });

    const semanticBridge = createSemanticPublicationBridgeV1(application.semantic);
    presentationCleanups.push(() => semanticBridge.dispose());
    const presentation = createRuntimePresentationStoreV1({
      semantic: semanticBridge,
      resolvedCatalog: resolvedGame.presentation.resolvedCatalog,
      contentPreference,
      uiState,
      project: projectPocRuntimePresentationV1,
      reportFailure: (failure) =>
        input.host.log.write("warn", failure.code, Object.freeze({ summary: failure.summary })),
    });
    presentationCleanups.push(() => presentation.dispose());

    diagnosticsPresentation = presentation;

    const assetLoader = input.assetLoader ?? createDefaultAssetLoaderV1();
    const assets = createAssetRegistryV1<AssetId, PocAssetUsageV1, string>(
      resolvedGame.assets,
      assetLoader,
      () => input.host.log.write("warn", "presentation.asset_load_failed", Object.freeze({})),
    );
    presentationCleanups.push(() => assets.dispose());
    const presentationRead = createPresentationReadPortV1({
      catalogs: resolvedGame.presentation.textCatalogs,
      locale: resolvedGame.presentation.textCatalogs.defaultLocale,
      assets,
    }) as PocPresentationReadPortV1;
    const contributions = createUiContributionRegistryV1<PocUiRendererContextsV1>([
      pocUiContributionsV1,
    ]);
    const inputRouter = createInputRouterV1();

    const resolveInteractionSurfaceV1 = (
      publication: DeepReadonly<PocRuntimePresentationPublicationV1>,
      surfaceId: InteractionSurfaceId,
    ): PocInteractionSurfaceResolutionV1 | null => {
      const surface = findOnlyRuntimeSurfaceV1(publication, surfaceId);
      if (surface === null) return null;
      const validation = validateRuntimeInteractionSurfaceV1(surface, {
        revision: publication.revision,
        resolvedSurfaces: resolvedGame.sceneGraph.interactionSurfaces,
        runtimeSurfaces: publication.view.interactionSurfaces,
      });
      return Object.freeze({
        surface: validation.surface,
        spatialState: validation.spatialState,
        faults: validation.faults,
      });
    };

    const interactionController = createInteractionControllerV1({
      presentation,
      resolveSurface(publication, surfaceId) {
        return resolveInteractionSurfaceV1(publication, surfaceId)?.surface ?? null;
      },
      semantic: application.semantic,
      intents,
      session: interactionSession,
      getReturnFocusId: (activation) =>
        interactionTargetControlIdV1(activation.surfaceId, activation.targetId),
    });

    const pointer = installPointerAdapterV1({
      target: input.pointerTarget,
      route: inputRouter.route,
      window: input.pointerWindow ?? browserPointerWindowV1(),
      document: input.pointerDocument ?? browserPointerDocumentV1(),
    });
    presentationCleanups.push(() => pointer.dispose());
    const unsubscribeRouter = router.subscribe(() => {
      const route = router.observe().route;
      updateUiStateV1((current) => Object.freeze({ ...current, route }));
    });
    presentationCleanups.push(unsubscribeRouter);

    let preloadController = new AbortController();
    const preloadCurrentV1 = (): void => {
      preloadController.abort();
      const controller = new AbortController();
      preloadController = controller;
      void assets
        .preload(presentation.getSnapshot().requiredAssetIds, controller.signal)
        .catch(() => {
          if (!controller.signal.aborted) {
            input.host.log.write("warn", "presentation.asset_preload_failed", Object.freeze({}));
          }
        });
    };
    preloadCurrentV1();
    const unsubscribePreload = presentation.subscribe(preloadCurrentV1);
    presentationCleanups.push(() => {
      preloadController.abort();
      unsubscribePreload();
    });

    let previousStageSceneId = presentation.getSnapshot().view.stage.stageSceneId;
    const unsubscribeStageCleanup = presentation.subscribe(() => {
      const nextStageSceneId = presentation.getSnapshot().view.stage.stageSceneId;
      if (nextStageSceneId === previousStageSceneId) return;
      previousStageSceneId = nextStageSceneId;
      if (interactionSession.getSnapshot().activeSurfaceId !== null) {
        interactionSession.cleanup("stage_scene_replaced");
      }
    });
    presentationCleanups.push(unsubscribeStageCleanup);

    const bindDevDockStateReader = (
      reader: () => DeepReadonly<DevDockOpenStateV1>,
    ): (() => void) => {
      if (presentationDisposed) {
        throw new TypeError("presentation.poc.devdock_state_reader_disposed");
      }
      if (readDiagnosticsDevDockState !== undefined) {
        throw new TypeError("presentation.poc.devdock_state_reader_already_bound");
      }
      readDiagnosticsDevDockState = reader;
      let active = true;
      return (): void => {
        if (!active) return;
        active = false;
        if (readDiagnosticsDevDockState === reader) {
          readDiagnosticsDevDockState = undefined;
        }
      };
    };

    const runtime = Object.freeze({
      applicationId: pocApplicationIdV1,
      resolvedGame,
      application,
      capabilitySession,
      playerUi,
      contentPreference,
      uiState,
      presentation,
      intents,
      input: inputRouter,
      assets,
      presentationRead,
      contributions,
      gameSymbols: pocGameSymbolRegistryV1,
      loadToolingUiContributions,
      bindDevDockStateReader,
      rendering: Object.freeze({
        interactionSession,
        interactionController,
        overlaySession,
        systemDialogSession,
        resolveInteractionSurface: resolveInteractionSurfaceV1,
      }),
      dispose(): void {
        disposePresentationConstructionV1();
      },
    }) satisfies PocPresentationRuntimeV1;
    completedRuntime = runtime;
    const lifecycle = capturedLifecycle;
    if (lifecycle === undefined) {
      throw new TypeError("PoC presentation runtime did not capture an HMR lifecycle");
    }
    const automationBridge = installBrowserAutomationBridgeV1({
      semantic: application.semantic,
      capabilities: capabilitySession,
    });
    automationBridgeForCleanup = automationBridge;
    const presentationLifecycle = Object.freeze({
      invalidationController: lifecycle.invalidationController,
      async disposeForRebootstrap() {
        automationBridge.dispose();
        return await lifecycle.disposeForRebootstrap();
      },
    }) satisfies WebRuntimeRebootstrapLifecycleV1<PersistenceRebootstrapDisposalV1>;
    await input.onRebootstrapLifecycle?.(presentationLifecycle);
    return runtime;
  } catch (error) {
    completedRuntime?.dispose();
    disposePresentationConstructionV1();
    const lifecycle = capturedLifecycle;
    if (lifecycle !== undefined) {
      try {
        const disposition = await lifecycle.disposeForRebootstrap();
        input.onConstructionFailureDisposition?.(disposition);
      } catch {
        // Construction failure remains authoritative over best-effort game-owner cleanup.
      }
    }
    throw error;
  }
}
