// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { digestCanonical, resolveGamePackageV1 } from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { parseGameSymbolIdV1 } from "@sillymaker/ui";
import type {
  CreateRuntimePresentationStoreInputV1,
  RuntimeAssetLoaderV1,
  RuntimeAssetLoadRequestV1,
  RuntimePresentationPublicationV1,
  RuntimePresentationStoreV1,
  SemanticPublicationBridgeV1,
  SemanticPublicationSourceV1,
} from "@sillymaker/ui";
import { createWebHostV1 } from "@sillymaker/web";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ownerDisposalsV1 = vi.hoisted(() =>
  Object.freeze({
    gameOwner: vi.fn(),
    pointer: vi.fn(),
    router: vi.fn(),
    preload: vi.fn(),
    semanticBridge: vi.fn(),
    presentationStore: vi.fn(),
  }),
);
const constructionControlV1 = vi.hoisted(() => ({ failPointerInstall: false }));

vi.mock("@sillymaker/web", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sillymaker/web")>();
  const createGameRuntime = async (
    input: Parameters<typeof actual.createGameRuntimeV1>[0],
  ): Promise<unknown> =>
    await actual.createGameRuntimeV1({
      ...input,
      async onRebootstrapLifecycle(lifecycle) {
        const observedLifecycle = Object.freeze({
          invalidationController: lifecycle.invalidationController,
          async disposeForRebootstrap() {
            ownerDisposalsV1.gameOwner();
            return await lifecycle.disposeForRebootstrap();
          },
        });
        await input.onRebootstrapLifecycle?.(observedLifecycle);
      },
    });
  const createHashRouter = ((options: Parameters<typeof actual.createHashRouterV1>[0]) => {
    const router = actual.createHashRouterV1(options);
    return Object.freeze({
      ...router,
      dispose(): void {
        ownerDisposalsV1.router();
        router.dispose();
      },
    });
  }) satisfies typeof actual.createHashRouterV1;
  const installPointerAdapter = ((input: Parameters<typeof actual.installPointerAdapterV1>[0]) => {
    if (constructionControlV1.failPointerInstall) {
      throw new TypeError("poc.test.pointer_install_failed");
    }
    const pointer = actual.installPointerAdapterV1(input);
    return Object.freeze({
      dispose(): void {
        ownerDisposalsV1.pointer();
        pointer.dispose();
      },
    });
  }) satisfies typeof actual.installPointerAdapterV1;
  return {
    ...actual,
    createGameRuntimeV1: createGameRuntime,
    createHashRouterV1: createHashRouter,
    installPointerAdapterV1: installPointerAdapter,
  };
});

vi.mock("@sillymaker/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sillymaker/ui")>();
  function createSemanticBridge<TPublication>(
    source: SemanticPublicationSourceV1<TPublication>,
  ): SemanticPublicationBridgeV1<TPublication> {
    const bridge = actual.createSemanticPublicationBridgeV1(source);
    return Object.freeze({
      ...bridge,
      dispose(): void {
        ownerDisposalsV1.semanticBridge();
        bridge.dispose();
      },
    });
  }
  function createPresentationStore<
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
    const store = actual.createRuntimePresentationStoreV1<
      TSemanticPublication,
      TResolvedCatalog,
      TUiState,
      TView,
      TAssetId
    >(input);
    let subscriptionIndex = 0;
    return Object.freeze({
      ...store,
      subscribe(listener: () => void): () => void {
        const currentIndex = subscriptionIndex;
        subscriptionIndex += 1;
        const unsubscribe = store.subscribe(listener);
        if (currentIndex !== 0) return unsubscribe;
        let subscribed = true;
        return (): void => {
          if (!subscribed) return;
          subscribed = false;
          ownerDisposalsV1.preload();
          unsubscribe();
        };
      },
      dispose(): void {
        ownerDisposalsV1.presentationStore();
        store.dispose();
      },
    });
  }
  return {
    ...actual,
    createRuntimePresentationStoreV1: createPresentationStore,
    createSemanticPublicationBridgeV1: createSemanticBridge,
  };
});

import { createPocPresentationRuntimeV1 } from "./create-poc-presentation-runtime.js";
import { pocGameSymbolIdsV1 } from "../presentation/symbols/poc-game-symbol-ids.js";
import { pocGameSymbolRegistryV1 } from "../presentation/symbols/poc-game-symbols.js";
import { pocStoryEntryV1 } from "../story-definition.js";

const emptyBuildIdentityV1 = Object.freeze({
  engineVersion: "SillyMaker PoC presentation-runtime-test",
  engine: Object.freeze([]),
  storySimulation: Object.freeze([]),
  storyPresentation: Object.freeze([]),
  application: Object.freeze([]),
}) satisfies Parameters<typeof resolveGamePackageV1>[2];

function createHostV1() {
  return createWebHostV1({
    records: createMemoryHostRecordStoreV1(),
    seeds: [0x0002_3049],
    uuids: ["00000000-0000-4000-8000-000000000001"],
    now: () => "2026-07-12T00:00:00.000Z",
  });
}

function createHashFixtureV1(initialHash = "#/play") {
  let hash = initialHash;
  const listeners = new Set<() => void>();
  const removeEventListener = vi.fn((_type: "hashchange", listener: () => void) => {
    listeners.delete(listener);
  });
  return Object.freeze({
    location: Object.freeze({
      get hash() {
        return hash;
      },
      replace(nextHash: string) {
        hash = nextHash;
      },
    }),
    events: Object.freeze({
      addEventListener(_type: "hashchange", listener: () => void) {
        listeners.add(listener);
      },
      removeEventListener,
    }),
    removeEventListener,
  });
}

function createAssetLoaderV1() {
  const dispose = vi.fn();
  const loader = Object.freeze({
    cacheKey: (request: RuntimeAssetLoadRequestV1) => `${request.runtimePath}#${request.sha256}`,
    load: vi.fn(async (request: RuntimeAssetLoadRequestV1) =>
      Object.freeze({ kind: "loaded" as const, url: request.runtimePath }),
    ),
    dispose,
  }) satisfies RuntimeAssetLoaderV1;
  return Object.freeze({ loader, dispose });
}

async function createFixtureV1() {
  const hash = createHashFixtureV1();
  const assets = createAssetLoaderV1();
  let defineCalls = 0;
  const entry = Object.freeze({
    ...pocStoryEntryV1,
    define() {
      defineCalls += 1;
      return pocStoryEntryV1.define();
    },
  });
  const runtime = await createPocPresentationRuntimeV1({
    host: createHostV1(),
    buildIdentity: emptyBuildIdentityV1,
    appBuildId: digestCanonical("sillymaker:application:v1", emptyBuildIdentityV1.application),
    storyEntry: entry,
    pointerTarget: document.createElement("div"),
    location: hash.location,
    hashEvents: hash.events,
    pointerWindow: window,
    pointerDocument: document,
    assetLoader: assets.loader,
  });
  return Object.freeze({ runtime, defineCalls: () => defineCalls, hash, assets });
}

describe("createPocPresentationRuntimeV1", () => {
  beforeEach(() => {
    constructionControlV1.failPointerInstall = false;
    for (const disposal of Object.values(ownerDisposalsV1)) disposal.mockClear();
  });

  it("resolves once and composes one Semantic-to-Presentation publication", async () => {
    const fixture = await createFixtureV1();

    // One Base resolution intentionally evaluates define() twice to prove determinism.
    expect(fixture.defineCalls()).toBe(2);
    expect(fixture.runtime.applicationId).toBe("poc-web");
    expect(fixture.runtime.presentation.getSnapshot().semantic).toBe(
      fixture.runtime.application.semantic.observe(),
    );
    expect(fixture.runtime.contentPreference.observe()).toEqual({ allowedFlags: 0 });
    expect(Object.isFrozen(fixture.runtime.playerUi)).toBe(true);
    expect(Object.isFrozen(fixture.runtime.playerUi.save)).toBe(true);
    expect(Object.isFrozen(fixture.runtime.playerUi.diagnostics)).toBe(true);
    await expect(fixture.runtime.playerUi.save.getStatus()).resolves.toEqual(
      await fixture.runtime.application.persistence.getStatus(),
    );
    expect(fixture.runtime.gameSymbols).toBe(pocGameSymbolRegistryV1);
    for (const symbolId of pocGameSymbolIdsV1) {
      expect(fixture.runtime.gameSymbols.resolve(parseGameSymbolIdV1(symbolId)).kind).toBe("found");
    }

    fixture.runtime.dispose();
  });

  it("reprojects an Overlay route without replacing authoritative runtime objects", async () => {
    const fixture = await createFixtureV1();
    const sessionApplication = fixture.runtime.application;
    const simulation = fixture.runtime.resolvedGame.gameSimulation;
    const semanticRevision = sessionApplication.semantic.observe().revision;

    expect(
      fixture.runtime.intents.execute({
        kind: "overlay.open",
        overlayId: "overlay.poc.purchase",
      }),
    ).toEqual({ kind: "executed" });
    expect(fixture.runtime.presentation.getSnapshot().view.stage.stageSceneId).toBe(
      "stage_scene.poc.market",
    );
    expect(fixture.runtime.application).toBe(sessionApplication);
    expect(fixture.runtime.resolvedGame.gameSimulation).toBe(simulation);
    expect(sessionApplication.semantic.observe().revision).toBe(semanticRevision);

    expect(
      fixture.runtime.intents.execute({
        kind: "overlay.open",
        overlayId: "overlay.poc.save",
      }),
    ).toEqual({ kind: "executed" });
    expect(fixture.runtime.rendering.overlaySession.getSnapshot()).toEqual({
      primaryId: "overlay.poc.save",
      detailIds: [],
    });
    expect(sessionApplication.semantic.observe().revision).toBe(semanticRevision);

    fixture.runtime.dispose();
  });

  it("exports one live UI-session projection from the existing presentation stores", async () => {
    const fixture = await createFixtureV1();
    const runtime = fixture.runtime;
    await runtime.application.semantic.dispatch({
      kind: "invoke",
      actionId: "action.run_start",
      options: {},
    });
    expect(runtime.presentation.getSnapshot().view.narrative?.status).toBe("active");

    expect(
      runtime.intents.execute({
        kind: "overlay.open",
        overlayId: "overlay.poc.purchase",
      }),
    ).toEqual({ kind: "executed" });
    const activeSurfaceId =
      runtime.presentation.getSnapshot().view.interactionSurfaces[0]?.surfaceId;
    if (activeSurfaceId === undefined) throw new TypeError("missing PoC interaction surface");
    runtime.rendering.interactionSession.open(activeSurfaceId, null);
    runtime.rendering.systemDialogSession.openSettings();
    const presentationBefore = runtime.presentation.getSnapshot();
    const semanticBefore = runtime.application.semantic.observe();
    const uiStateBefore = runtime.uiState.getCurrent();
    const presentationListener = vi.fn();
    const semanticListener = vi.fn();
    const uiStateListener = vi.fn();
    const unsubscribePresentation = runtime.presentation.subscribe(presentationListener);
    const unsubscribeSemantic = runtime.application.semantic.subscribe(semanticListener);
    const unsubscribeUiState = runtime.uiState.subscribe(uiStateListener);
    const devDockState: {
      current: { readonly leftOpen: boolean; readonly rightOpen: boolean };
    } = {
      current: Object.freeze({ leftOpen: false, rightOpen: false }),
    };
    const unbindDevDock = runtime.bindDevDockStateReader(() => devDockState.current);
    expect(() =>
      runtime.bindDevDockStateReader(() => Object.freeze({ leftOpen: false, rightOpen: false })),
    ).toThrowError("presentation.poc.devdock_state_reader_already_bound");
    devDockState.current = Object.freeze({ leftOpen: true, rightOpen: false });
    expect(runtime.presentation.getSnapshot()).toBe(presentationBefore);
    expect(runtime.application.semantic.observe()).toBe(semanticBefore);
    expect(runtime.uiState.getCurrent()).toBe(uiStateBefore);
    expect(presentationListener).not.toHaveBeenCalled();
    expect(semanticListener).not.toHaveBeenCalled();
    expect(uiStateListener).not.toHaveBeenCalled();

    const bundle = JSON.parse(
      new TextDecoder().decode((await runtime.application.diagnostics.exportDebugBundle()).bytes),
    ) as {
      readonly uiContext?: {
        readonly presentation: { readonly activeInteractionSurfaceId: string | null } | null;
        readonly session: {
          readonly routeId: string | null;
          readonly primaryOverlayId: string | null;
          readonly detailOverlayIds: readonly string[];
          readonly narrativeOpen: boolean;
          readonly systemDialogOpen: boolean;
          readonly devDock: { readonly leftOpen: boolean; readonly rightOpen: boolean };
        };
      };
    };

    expect(bundle.uiContext).toMatchObject({
      presentation: { activeInteractionSurfaceId: activeSurfaceId },
      session: {
        routeId: "play",
        primaryOverlayId: "overlay.poc.purchase",
        detailOverlayIds: [],
        narrativeOpen: true,
        systemDialogOpen: true,
        devDock: { leftOpen: true, rightOpen: false },
      },
    });
    expect(bundle.uiContext?.session).not.toHaveProperty("activeInteractionSurfaceId");
    expect(runtime.uiState.getCurrent()).toBe(uiStateBefore);
    expect(uiStateListener).not.toHaveBeenCalled();

    unbindDevDock();
    runtime.rendering.systemDialogSession.closeSettings();
    const closedBundle = JSON.parse(
      new TextDecoder().decode((await runtime.application.diagnostics.exportDebugBundle()).bytes),
    ) as {
      readonly uiContext?: {
        readonly session: {
          readonly systemDialogOpen: boolean;
          readonly devDock: { readonly leftOpen: boolean; readonly rightOpen: boolean };
        };
      };
    };
    expect(closedBundle.uiContext?.session.systemDialogOpen).toBe(false);
    expect(closedBundle.uiContext?.session.devDock).toEqual({
      leftOpen: false,
      rightOpen: false,
    });
    unsubscribePresentation();
    unsubscribeSemantic();
    unsubscribeUiState();

    runtime.dispose();
  });

  it("defers lifecycle handoff and disposes the game owner after late construction failure", async () => {
    const hash = createHashFixtureV1();
    const assets = createAssetLoaderV1();
    const onRebootstrapLifecycle = vi.fn();
    constructionControlV1.failPointerInstall = true;

    await expect(
      createPocPresentationRuntimeV1({
        host: createHostV1(),
        buildIdentity: emptyBuildIdentityV1,
        appBuildId: digestCanonical("sillymaker:application:v1", emptyBuildIdentityV1.application),
        pointerTarget: document.createElement("div"),
        location: hash.location,
        hashEvents: hash.events,
        pointerWindow: window,
        pointerDocument: document,
        assetLoader: assets.loader,
        onRebootstrapLifecycle,
      }),
    ).rejects.toThrow("poc.test.pointer_install_failed");

    expect(onRebootstrapLifecycle).not.toHaveBeenCalled();
    expect(ownerDisposalsV1.gameOwner).toHaveBeenCalledOnce();
  });

  it("disposes browser and presentation resources exactly once", async () => {
    const fixture = await createFixtureV1();

    fixture.runtime.dispose();
    fixture.runtime.dispose();
    expect(() =>
      fixture.runtime.bindDevDockStateReader(() =>
        Object.freeze({ leftOpen: false, rightOpen: false }),
      ),
    ).toThrowError("presentation.poc.devdock_state_reader_disposed");

    expect(
      Object.fromEntries(
        Object.entries(ownerDisposalsV1).map(([owner, dispose]) => [
          owner,
          dispose.mock.calls.length,
        ]),
      ),
    ).toEqual({
      gameOwner: 0,
      pointer: 1,
      router: 1,
      preload: 1,
      semanticBridge: 1,
      presentationStore: 1,
    });
    expect(fixture.hash.removeEventListener).toHaveBeenCalledTimes(1);
    expect(fixture.assets.dispose).toHaveBeenCalledTimes(1);
  });
});
