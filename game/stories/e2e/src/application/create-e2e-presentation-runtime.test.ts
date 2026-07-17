// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { HostFilePortV1 } from "@sillymaker/base";
import { createMemoryHostRecordStoreV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import type { RuntimeAssetLoaderV1, RuntimeAssetLoadRequestV1 } from "@sillymaker/ui";
import { createWebHostV1 } from "@sillymaker/web";
import { describe, expect, it, vi } from "vitest";

import { createE2ePresentationRuntimeV1 } from "./create-e2e-presentation-runtime.js";
import {
  e2eAlphaFlagV1,
  e2eContentMaturityPolicyV1,
} from "../presentation/content-maturity-policy.js";
import { e2eApplicationTextIdsV1 } from "../presentation/text-catalogs.js";
import { e2eStoryEntryV1 } from "../story-entry.js";

function createEventTargetFixtureV1() {
  const listeners = new Map<string, Set<() => void>>();
  return Object.freeze({
    target: Object.freeze({
      addEventListener(type: string, listener: () => void) {
        const current = listeners.get(type) ?? new Set<() => void>();
        current.add(listener);
        listeners.set(type, current);
      },
      removeEventListener(type: string, listener: () => void) {
        listeners.get(type)?.delete(listener);
      },
    }),
    emit(type: string) {
      for (const listener of [...(listeners.get(type) ?? [])]) listener();
    },
    listenerCount(type: string) {
      return listeners.get(type)?.size ?? 0;
    },
  });
}

function createRuntimeEnvironmentFixtureV1(hash: string) {
  const hashEvents = createEventTargetFixtureV1();
  const pointerWindow = createEventTargetFixtureV1();
  const pointerDocument = createEventTargetFixtureV1();
  const pointerTarget = document.createElement("div");
  const removePointerListener = vi.spyOn(pointerTarget, "removeEventListener");
  const location = {
    hash,
    replace: vi.fn((nextHash: string) => {
      location.hash = nextHash;
    }),
  };
  const disposeLoader = vi.fn();
  const assetLoader = Object.freeze({
    cacheKey: ({ runtimePath, sha256 }: RuntimeAssetLoadRequestV1) => `${runtimePath}#${sha256}`,
    load: vi.fn(async () =>
      Object.freeze({ kind: "failed" as const, code: "fetch_failed" as const }),
    ),
    dispose: disposeLoader,
  }) satisfies RuntimeAssetLoaderV1;

  return Object.freeze({
    environment: Object.freeze({
      pointerTarget,
      pointerWindow: pointerWindow.target,
      pointerDocument: Object.freeze({
        ...pointerDocument.target,
        visibilityState: "visible" as const,
      }),
      location,
      hashEventTarget: hashEvents.target,
      assetLoader,
    }),
    location,
    hashEvents,
    pointerWindow,
    pointerDocument,
    removePointerListener,
    disposeLoader,
  });
}

function createHostV1(files?: HostFilePortV1) {
  return createWebHostV1({
    records: createMemoryHostRecordStoreV1(),
    seeds: [0x0002_3049],
    uuids: ["00000000-0000-4000-8000-000000000401"],
    now: () => "2026-07-17T00:00:00.000Z",
    ...(files === undefined ? {} : { files }),
  });
}

describe("createE2ePresentationRuntimeV1", () => {
  it("composes one Semantic bridge, complete UI state, and one presentation publication", async () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const browser = createRuntimeEnvironmentFixtureV1("#/play");
    const runtime = await createE2ePresentationRuntimeV1({
      resolved,
      host: createHostV1(),
      environment: browser.environment,
    });

    try {
      expect(runtime.applicationId).toBe("e2e-web");
      expect(runtime.resolvedGame).toBe(resolved);
      expect(runtime.presentation.getSnapshot().semantic).toBe(
        runtime.application.semantic.observe(),
      );
      expect(runtime.uiState.getCurrent()).toMatchObject({
        route: "play",
        primaryOverlayId: null,
        activeCueId: null,
      });
      expect(runtime.uiState).not.toHaveProperty("publish");
      expect(runtime.presentation.getSnapshot().view.route).toBe("play");
      expect(runtime.contentPreference.observe()).toEqual({
        allowedFlags: e2eContentMaturityPolicyV1.defaultAllowedFlags,
      });
      for (const descriptor of [
        ...e2eContentMaturityPolicyV1.flags,
        ...e2eContentMaturityPolicyV1.presets,
      ]) {
        expect(runtime.presentationRead.text(descriptor.nameTextId).text.trim()).not.toBe("");
        expect(runtime.presentationRead.text(descriptor.descriptionTextId).text.trim()).not.toBe(
          "",
        );
      }
      for (const [textId, expected] of [
        [e2eApplicationTextIdsV1.interactionEntry, "与测试计数器互动"],
        [e2eApplicationTextIdsV1.semanticStatus, "语义状态"],
        [e2eApplicationTextIdsV1.semanticRevision, "修订"],
        [e2eApplicationTextIdsV1.openTestPanel, "打开测试面板"],
        [e2eApplicationTextIdsV1.save, "保存"],
        [e2eApplicationTextIdsV1.settings, "设置"],
        [e2eApplicationTextIdsV1.close, "关闭"],
        [e2eApplicationTextIdsV1.emptySettings, "没有可用设置。"],
        [e2eApplicationTextIdsV1.exportDebugBundle, "导出调试包"],
        [e2eApplicationTextIdsV1.exportingDebugBundle, "正在导出调试包…"],
        [e2eApplicationTextIdsV1.debugBundleExported, "调试包已导出"],
        [e2eApplicationTextIdsV1.debugBundleExportFailed, "调试包导出失败"],
      ] as const) {
        expect(runtime.presentationRead.text(textId).text).toBe(expected);
      }

      const before = runtime.presentation.getSnapshot();
      await runtime.application.semantic.dispatch({
        actionId: "action.e2e.increment",
        parameters: {},
      });
      expect(runtime.presentation.getSnapshot().revision).toBeGreaterThan(before.revision);
      expect(runtime.presentation.getSnapshot().semantic).toBe(
        runtime.application.semantic.observe(),
      );

      await runtime.contentPreference.set({ allowedFlags: e2eAlphaFlagV1 });
      const latest = runtime.presentation.getSnapshot();
      const surface = latest.view.interactionSurfaces[0];
      const target = surface?.targets[0];
      const alphaBehavior = target?.behaviors.find(
        ({ behaviorId }) => behaviorId === "behavior.e2e.counter.alpha_cue",
      );
      if (surface === undefined || target === undefined || alphaBehavior === undefined) {
        throw new TypeError("missing alpha behavior in latest E2E publication");
      }
      await expect(
        runtime.interactionController.activateBehavior(
          Object.freeze({
            surfaceId: surface.surfaceId,
            targetId: target.targetId,
            activationKind: "semantic_control" as const,
          }),
          alphaBehavior.behaviorId,
        ),
      ).resolves.toMatchObject({ kind: "intent_executed" });
      expect(runtime.uiState.getCurrent().activeCueId).toBe("cue.e2e.counter.alpha");
    } finally {
      runtime.dispose();
    }
  });

  it("composes player-safe file UI ports and one OverlaySession over the published UI state", async () => {
    const selectOne = vi.fn(async (_request: Parameters<HostFilePortV1["selectOne"]>[0]) =>
      Object.freeze({ kind: "cancelled" as const }),
    );
    const download = vi.fn(
      async (_request: Parameters<HostFilePortV1["download"]>[0]) => undefined,
    );
    const runtime = await createE2ePresentationRuntimeV1({
      resolved: resolveStoryForTestV1(e2eStoryEntryV1),
      host: createHostV1(Object.freeze({ selectOne, download })),
      environment: createRuntimeEnvironmentFixtureV1("#/play").environment,
    });

    try {
      expect(Object.isFrozen(runtime.playerUi)).toBe(true);
      await expect(runtime.playerUi.save.importSave()).resolves.toEqual({ kind: "cancelled" });
      expect(selectOne).toHaveBeenCalledOnce();
      expect(await runtime.application.persistence.getStatus()).toEqual(
        await runtime.playerUi.save.getStatus(),
      );

      const debugBundle = await runtime.playerUi.diagnostics.exportDebugBundle();
      expect(download).toHaveBeenCalledExactlyOnceWith({
        filename: debugBundle.filename,
        mediaType: debugBundle.mediaType,
        bytes: debugBundle.bytes,
      });

      const initialOverlay = runtime.overlaySession.getSnapshot();
      expect(initialOverlay).toEqual({ primaryId: null, detailIds: [] });
      expect(runtime.overlaySession.getSnapshot()).toBe(initialOverlay);

      runtime.overlaySession.openPrimary("overlay.e2e.save");
      expect(runtime.uiState.getCurrent().primaryOverlayId).toBe("overlay.e2e.save");
      expect(runtime.presentation.getSnapshot().view.activeOverlayId).toBe("overlay.e2e.save");
      expect(runtime.overlaySession.getSnapshot()).toEqual({
        primaryId: "overlay.e2e.save",
        detailIds: [],
      });
      expect(runtime.overlaySession.closeTop()).toBe("primary_closed");
      expect(runtime.uiState.getCurrent().primaryOverlayId).toBeNull();
      expect(runtime.presentation.getSnapshot().view.activeOverlayId).toBeNull();
      expect(runtime.overlaySession.closeTop()).toBe("already_closed");
    } finally {
      runtime.dispose();
    }
  });

  it("keeps Interaction active across a variant change and cleans it on StageScene replacement", async () => {
    const runtime = await createE2ePresentationRuntimeV1({
      resolved: resolveStoryForTestV1(e2eStoryEntryV1),
      host: createHostV1(),
      environment: createRuntimeEnvironmentFixtureV1("#/play").environment,
    });

    try {
      const initialStage = runtime.presentation.getSnapshot().view.stage;
      const surface = runtime.presentation.getSnapshot().view.interactionSurfaces[0];
      if (surface === undefined) throw new TypeError("missing E2E interaction surface");
      runtime.interactionSession.open(surface.surfaceId, "e2e-interaction-entry");

      await runtime.application.semantic.dispatch({
        actionId: "action.e2e.start",
        parameters: {},
      });
      const activeStage = runtime.presentation.getSnapshot().view.stage;
      expect(activeStage.stageSceneId).toBe(initialStage.stageSceneId);
      expect(activeStage.variantId).not.toBe(initialStage.variantId);
      expect(runtime.interactionSession.getSnapshot().activeSurfaceId).toBe(surface.surfaceId);

      await runtime.application.semantic.dispatch({
        actionId: "action.e2e.choose",
        parameters: { choice: "right" },
      });
      await runtime.application.semantic.dispatch({
        actionId: "action.e2e.continue",
        parameters: {},
      });
      expect(runtime.presentation.getSnapshot().view.stage.stageSceneId).toBe(
        initialStage.stageSceneId,
      );
      expect(runtime.interactionSession.getSnapshot().activeSurfaceId).toBe(surface.surfaceId);

      await runtime.application.semantic.dispatch({
        actionId: "action.e2e.complete",
        parameters: {},
      });
      expect(runtime.presentation.getSnapshot().view.stage.stageSceneId).not.toBe(
        initialStage.stageSceneId,
      );
      expect(runtime.interactionSession.getSnapshot()).toEqual({
        activeSurfaceId: null,
        choosingTargetId: null,
        returnFocusId: null,
      });
    } finally {
      runtime.dispose();
    }
  });

  it("recovers an unknown hash through the same route lens and disposes browser adapters once", async () => {
    const browser = createRuntimeEnvironmentFixtureV1("#/unknown");
    const abortPreload = vi.spyOn(AbortController.prototype, "abort");
    const runtime = await createE2ePresentationRuntimeV1({
      resolved: resolveStoryForTestV1(e2eStoryEntryV1),
      host: createHostV1(),
      environment: browser.environment,
    });

    expect(browser.location.replace).toHaveBeenCalledOnce();
    expect(browser.location.replace).toHaveBeenCalledWith("#/");
    expect(runtime.uiState.getCurrent().route).toBe("main_menu");
    expect(runtime.presentation.getSnapshot().view.route).toBe("main_menu");
    expect(browser.hashEvents.listenerCount("hashchange")).toBe(1);

    browser.location.hash = "#/play";
    browser.hashEvents.emit("hashchange");
    expect(runtime.uiState.getCurrent().route).toBe("play");
    expect(runtime.presentation.getSnapshot().view.route).toBe("play");

    const abortCallsBeforeDispose = abortPreload.mock.calls.length;
    try {
      runtime.dispose();
      runtime.dispose();
      expect(browser.hashEvents.listenerCount("hashchange")).toBe(0);
      expect(browser.pointerWindow.listenerCount("blur")).toBe(0);
      expect(browser.pointerDocument.listenerCount("visibilitychange")).toBe(0);
      expect(browser.removePointerListener).toHaveBeenCalledTimes(4);
      expect(abortPreload).toHaveBeenCalledTimes(abortCallsBeforeDispose + 1);
      expect(browser.disposeLoader).toHaveBeenCalledOnce();
      expect(() => runtime.presentation.subscribe(() => undefined)).toThrow(
        "ui.runtime_presentation_store_disposed",
      );
    } finally {
      abortPreload.mockRestore();
    }
  });
});
