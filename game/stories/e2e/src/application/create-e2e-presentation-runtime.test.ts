// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { digestBytes, type HostAtomicRecordStoreV1, type HostFilePortV1 } from "@sillymaker/base";
import { createMemoryHostRecordStoreV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import type { PersistenceRebootstrapDisposalV1 } from "@sillymaker/base/runtime";
import type { RuntimeAssetLoaderV1, RuntimeAssetLoadRequestV1 } from "@sillymaker/ui";
import { createWebHostV1 } from "@sillymaker/web";
import type { WebRuntimeRebootstrapLifecycleV1 } from "@sillymaker/web";
import { describe, expect, it, vi } from "vitest";

import { createE2eDebugBundleCodecV1, createE2eGameRuntimeV1 } from "./create-e2e-game-runtime.js";
import { createE2ePresentationRuntimeV1 } from "./create-e2e-presentation-runtime.js";
import {
  e2eAlphaFlagV1,
  e2eContentMaturityPolicyV1,
} from "../presentation/content-maturity-policy.js";
import { e2eApplicationTextIdsV1 } from "../presentation/text-catalogs.js";
import { e2eStoryEntryV1 } from "../story-entry.js";

const automationGlobalKeyV1 = "__SILLYMAKER_AUTOMATION_V1__" as const;

function readAutomationGlobalV1() {
  return globalThis[automationGlobalKeyV1];
}

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

function createRuntimeEnvironmentFixtureV1(hash: string, capabilitySearch = "") {
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
  const globalPresenceDuringLoaderDispose: boolean[] = [];
  const disposeLoader = vi.fn(() => {
    globalPresenceDuringLoaderDispose.push(
      Object.hasOwn(globalThis, "__SILLYMAKER_AUTOMATION_V1__"),
    );
  });
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
      capabilitySearch,
      assetLoader,
    }),
    location,
    hashEvents,
    pointerWindow,
    pointerDocument,
    removePointerListener,
    disposeLoader,
    globalPresenceDuringLoaderDispose,
  });
}

function createHostV1(
  files?: HostFilePortV1,
  records: HostAtomicRecordStoreV1 = createMemoryHostRecordStoreV1(),
  ownerUuid = "00000000-0000-4000-8000-000000000401",
) {
  return createWebHostV1({
    records,
    seeds: [0x0002_3049],
    uuids: [ownerUuid],
    now: () => "2026-07-17T00:00:00.000Z",
    ...(files === undefined ? {} : { files }),
  });
}

function decodeDebugBundleJsonV1(bytes: Uint8Array): Readonly<Record<string, unknown>> {
  const decoded: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (decoded === null || typeof decoded !== "object" || Array.isArray(decoded)) {
    throw new TypeError("invalid exported E2E DebugBundle JSON");
  }
  return decoded as Readonly<Record<string, unknown>>;
}

async function readLeaseOwnerIdV1(records: HostAtomicRecordStoreV1): Promise<unknown> {
  const leaseRecords = await records.list("lease");
  const lease = leaseRecords[0];
  if (lease === undefined) return undefined;
  return decodeDebugBundleJsonV1(lease.bytes).ownerId;
}

function createDelayedSettingsFailureV1(): Readonly<{
  records: HostAtomicRecordStoreV1;
  readStarted: Promise<void>;
  fail(error: unknown): void;
}> {
  const memory = createMemoryHostRecordStoreV1();
  let markReadStarted: (() => void) | undefined;
  const readStarted = new Promise<void>((resolve) => {
    markReadStarted = resolve;
  });
  let rejectSettingsRead: ((error: unknown) => void) | undefined;
  const failedSettingsRead = new Promise<never>((_resolve, reject) => {
    rejectSettingsRead = reject;
  });
  const records = Object.freeze({
    async read(
      namespace: Parameters<HostAtomicRecordStoreV1["read"]>[0],
      key: Parameters<HostAtomicRecordStoreV1["read"]>[1],
    ) {
      if (namespace === "settings" && String(key).startsWith("content-maturity.v1:")) {
        markReadStarted?.();
        return await failedSettingsRead;
      }
      return await memory.read(namespace, key);
    },
    async list(namespace: Parameters<HostAtomicRecordStoreV1["list"]>[0]) {
      return await memory.list(namespace);
    },
    async commit(mutations: Parameters<HostAtomicRecordStoreV1["commit"]>[0]) {
      return await memory.commit(mutations);
    },
  }) satisfies HostAtomicRecordStoreV1;
  return Object.freeze({
    records,
    readStarted,
    fail(error: unknown): void {
      if (rejectSettingsRead === undefined) {
        throw new TypeError("settings read did not start");
      }
      rejectSettingsRead(error);
    },
  });
}

function createLifecycleObservationRecordsV1() {
  const memory = createMemoryHostRecordStoreV1();
  const globalPresenceDuringObservedCommits: boolean[] = [];
  let observing = false;
  const records = Object.freeze({
    async read(
      namespace: Parameters<HostAtomicRecordStoreV1["read"]>[0],
      key: Parameters<HostAtomicRecordStoreV1["read"]>[1],
    ) {
      return await memory.read(namespace, key);
    },
    async list(namespace: Parameters<HostAtomicRecordStoreV1["list"]>[0]) {
      return await memory.list(namespace);
    },
    async commit(mutations: Parameters<HostAtomicRecordStoreV1["commit"]>[0]) {
      if (observing) {
        globalPresenceDuringObservedCommits.push(
          Object.hasOwn(globalThis, "__SILLYMAKER_AUTOMATION_V1__"),
        );
      }
      return await memory.commit(mutations);
    },
  }) satisfies HostAtomicRecordStoreV1;
  return Object.freeze({
    records,
    beginObservation(): void {
      observing = true;
    },
    globalPresenceDuringObservedCommits,
  });
}

describe("createE2ePresentationRuntimeV1", () => {
  it("composes URL-requested capabilities and retries only the fixed browser tooling entry", async () => {
    const records = createMemoryHostRecordStoreV1();
    const loadFailure = new TypeError("e2e.tooling_ui_load_failed");
    const loadToolingUi = vi.fn(async (specifier: "@project-tavern/story-e2e/tooling-ui") => {
      expect(specifier).toBe("@project-tavern/story-e2e/tooling-ui");
      if (loadToolingUi.mock.calls.length === 1) throw loadFailure;
      return await import("../tooling-ui/index.js");
    });
    const runtime = await createE2ePresentationRuntimeV1({
      resolved: resolveStoryForTestV1(e2eStoryEntryV1),
      host: createHostV1(undefined, records),
      environment: createRuntimeEnvironmentFixtureV1(
        "#/play",
        "?capability=debug_tools&capability=cheats",
      ).environment,
      loadToolingUi,
    });

    try {
      expect(runtime.application.capabilities).toBe(runtime.capabilitySession);
      expect(runtime.capabilitySession.sessionRequested).toEqual(["debug_tools", "cheats"]);
      expect(runtime.capabilitySession.persisted.state.getCurrent()).toEqual({
        debugTools: false,
        cheats: false,
        automationBridge: false,
      });
      expect(runtime.application.capabilities.state.getCurrent()).toEqual({
        debugTools: true,
        cheats: true,
        automationBridge: false,
      });
      expect(loadToolingUi).not.toHaveBeenCalled();
      await expect(runtime.application.debugTools.listFixtures()).resolves.toMatchObject({
        kind: "listed",
      });
      expect(loadToolingUi).not.toHaveBeenCalled();
      expect(await records.list("settings")).toEqual([]);

      await expect(runtime.loadToolingUiContributions()).rejects.toBe(loadFailure);
      const first = await runtime.loadToolingUiContributions();
      const second = await runtime.loadToolingUiContributions();
      expect(second).toBe(first);
      expect(first.panels.map(({ id }) => id)).toEqual([
        "e2e.capabilities",
        "e2e.diagnostics",
        "e2e.fixtures",
        "e2e.commands",
      ]);
      expect(loadToolingUi).toHaveBeenCalledTimes(2);

      runtime.dispose();
      await expect(runtime.loadToolingUiContributions()).rejects.toThrow(
        "presentation.e2e.tooling_ui_disposed",
      );
    } finally {
      runtime.dispose();
    }
  });

  it("turns a rejected capability request into an empty non-persistent session overlay", async () => {
    const loadToolingUi = vi.fn(
      async (_specifier: "@project-tavern/story-e2e/tooling-ui") =>
        await import("../tooling-ui/index.js"),
    );
    const runtime = await createE2ePresentationRuntimeV1({
      resolved: resolveStoryForTestV1(e2eStoryEntryV1),
      host: createHostV1(),
      environment: createRuntimeEnvironmentFixtureV1(
        "#/play",
        "?capability=debug_tools&capability=unknown",
      ).environment,
      loadToolingUi,
    });

    try {
      expect(runtime.capabilitySession.sessionRequested).toEqual([]);
      expect(runtime.application.capabilities.state.getCurrent()).toEqual({
        debugTools: false,
        cheats: false,
        automationBridge: false,
      });
      await expect(runtime.application.debugTools.listFixtures()).resolves.toEqual({
        kind: "capability_disabled",
      });
      await expect(runtime.loadToolingUiContributions()).rejects.toThrow(
        "presentation.e2e.tooling_ui_capability_disabled",
      );
      expect(loadToolingUi).not.toHaveBeenCalled();
    } finally {
      runtime.dispose();
    }
  });

  it("keeps the Automation global absent for a default URL", async () => {
    const runtime = await createE2ePresentationRuntimeV1({
      resolved: resolveStoryForTestV1(e2eStoryEntryV1),
      host: createHostV1(),
      environment: createRuntimeEnvironmentFixtureV1("#/play").environment,
    });

    try {
      expect(runtime.capabilitySession.sessionRequested).toEqual([]);
      expect(Object.hasOwn(globalThis, "__SILLYMAKER_AUTOMATION_V1__")).toBe(false);
    } finally {
      runtime.dispose();
    }
  });

  it("installs one session-only Automation facade for the explicit URL capability", async () => {
    const records = createMemoryHostRecordStoreV1();
    const runtime = await createE2ePresentationRuntimeV1({
      resolved: resolveStoryForTestV1(e2eStoryEntryV1),
      host: createHostV1(undefined, records),
      environment: createRuntimeEnvironmentFixtureV1("#/play", "?capability=automation_bridge")
        .environment,
    });

    try {
      const bridge = readAutomationGlobalV1();
      expect(runtime.capabilitySession.sessionRequested).toEqual(["automation_bridge"]);
      expect(bridge?.contractRevision).toBe(1);
      const observed = bridge?.observe();
      expect(observed?.kind).toBe("ok");
      if (observed?.kind === "ok") {
        expect(observed.value).toBe(runtime.application.semantic.observe());
      }
      expect(await records.list("settings")).toEqual([]);
    } finally {
      runtime.dispose();
    }
  });

  it("revokes a captured Automation facade before normal runtime disposal continues", async () => {
    let lifecycle: WebRuntimeRebootstrapLifecycleV1<PersistenceRebootstrapDisposalV1> | undefined;
    const browser = createRuntimeEnvironmentFixtureV1("#/play", "?capability=automation_bridge");
    const runtime = await createE2ePresentationRuntimeV1({
      resolved: resolveStoryForTestV1(e2eStoryEntryV1),
      host: createHostV1(),
      environment: browser.environment,
      onRebootstrapLifecycle(value) {
        lifecycle = value;
      },
    });
    const captured = readAutomationGlobalV1();
    if (captured === undefined) throw new TypeError("missing E2E Automation facade");

    runtime.dispose();
    expect(Object.hasOwn(globalThis, "__SILLYMAKER_AUTOMATION_V1__")).toBe(false);
    expect(captured.observe()).toEqual({ kind: "capability_disabled" });
    expect(browser.globalPresenceDuringLoaderDispose).toEqual([false]);
    await lifecycle?.disposeForRebootstrap();
  });

  it("revokes Automation before the wrapped HMR lifecycle releases persistence", async () => {
    const observed = createLifecycleObservationRecordsV1();
    let lifecycle: WebRuntimeRebootstrapLifecycleV1<PersistenceRebootstrapDisposalV1> | undefined;
    const runtime = await createE2ePresentationRuntimeV1({
      resolved: resolveStoryForTestV1(e2eStoryEntryV1),
      host: createHostV1(undefined, observed.records, "00000000-0000-4000-8000-000000000405"),
      environment: createRuntimeEnvironmentFixtureV1("#/play", "?capability=automation_bridge")
        .environment,
      onRebootstrapLifecycle(value) {
        lifecycle = value;
      },
    });

    try {
      expect(readAutomationGlobalV1()).toBeDefined();
      observed.beginObservation();
      await lifecycle?.disposeForRebootstrap();
      expect(Object.hasOwn(globalThis, "__SILLYMAKER_AUTOMATION_V1__")).toBe(false);
      expect(observed.globalPresenceDuringObservedCommits.length).toBeGreaterThan(0);
      expect(observed.globalPresenceDuringObservedCommits.every((present) => !present)).toBe(true);
    } finally {
      runtime.dispose();
    }
  });

  it("keeps RunIntegrity normal after an ordinary Automation dispatch", async () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const runtime = await createE2ePresentationRuntimeV1({
      resolved,
      host: createHostV1(),
      environment: createRuntimeEnvironmentFixtureV1("#/play", "?capability=automation_bridge")
        .environment,
    });

    try {
      const bridge = readAutomationGlobalV1();
      if (bridge === undefined) throw new TypeError("missing E2E Automation facade");
      const codec = createE2eDebugBundleCodecV1(resolved.gameSimulation.stateSchema);
      const before = codec.bundleSchema.parse(
        decodeDebugBundleJsonV1((await runtime.application.diagnostics.exportDebugBundle()).bytes),
      );
      const dispatched = await bridge.dispatch({
        actionId: "action.e2e.increment",
        parameters: {},
      });
      expect(dispatched.kind).toBe("ok");
      const after = codec.bundleSchema.parse(
        decodeDebugBundleJsonV1((await runtime.application.diagnostics.exportDebugBundle()).bytes),
      );
      expect(before.currentSnapshot.integrity).toEqual({
        mode: "normal",
        reasons: [],
        firstMutationSequence: null,
        mutationCount: 0,
      });
      expect(after.currentSnapshot.integrity).toEqual(before.currentSnapshot.integrity);
    } finally {
      runtime.dispose();
    }
  });

  it("refuses a second live Story root without replacing the first Automation owner", async () => {
    const first = await createE2ePresentationRuntimeV1({
      resolved: resolveStoryForTestV1(e2eStoryEntryV1),
      host: createHostV1(),
      environment: createRuntimeEnvironmentFixtureV1("#/play", "?capability=automation_bridge")
        .environment,
    });
    const owned = readAutomationGlobalV1();
    if (owned === undefined) throw new TypeError("missing first E2E Automation facade");

    try {
      await expect(
        createE2ePresentationRuntimeV1({
          resolved: resolveStoryForTestV1(e2eStoryEntryV1),
          host: createHostV1(
            undefined,
            createMemoryHostRecordStoreV1(),
            "00000000-0000-4000-8000-000000000406",
          ),
          environment: createRuntimeEnvironmentFixtureV1("#/play").environment,
        }),
      ).rejects.toThrowError("automation.bridge_already_installed");
      expect(readAutomationGlobalV1()).toBe(owned);
      expect(owned.observe().kind).toBe("ok");
    } finally {
      first.dispose();
    }
  });

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

  it("projects the current route, Overlay, Interaction, Narrative, and System session from one export-time presentation", async () => {
    const resolved = resolveStoryForTestV1(e2eStoryEntryV1);
    const browser = createRuntimeEnvironmentFixtureV1("#/");
    const runtime = await createE2ePresentationRuntimeV1({
      resolved,
      host: createHostV1(),
      environment: browser.environment,
    });
    const unsubscribers: Array<() => void> = [];

    try {
      browser.location.hash = "#/play";
      browser.hashEvents.emit("hashchange");
      runtime.overlaySession.openPrimary("overlay.e2e.save");
      const surface = runtime.presentation.getSnapshot().view.interactionSurfaces[0];
      if (surface === undefined) throw new TypeError("missing E2E interaction surface");
      runtime.interactionSession.open(surface.surfaceId, "e2e-interaction-entry");
      runtime.systemDialogSession.openSettings();
      await runtime.application.semantic.dispatch({
        actionId: "action.e2e.start",
        parameters: {},
      });

      const presentationBefore = runtime.presentation.getSnapshot();
      const semanticBefore = runtime.application.semantic.observe();
      const uiStateBefore = runtime.uiState.getCurrent();
      const systemDialogBefore = runtime.systemDialogSession.getSnapshot();
      const presentationsDuringExport: Array<typeof presentationBefore> = [];
      const presentationListener = vi.fn(() => {
        presentationsDuringExport.push(runtime.presentation.getSnapshot());
      });
      const uiStateListener = vi.fn();
      const semanticListener = vi.fn();
      const systemDialogListener = vi.fn();
      unsubscribers.push(
        runtime.presentation.subscribe(presentationListener),
        runtime.application.semantic.subscribe(semanticListener),
        runtime.uiState.subscribe(uiStateListener),
        runtime.systemDialogSession.subscribe(systemDialogListener),
      );
      const devDockState: {
        current: { readonly leftOpen: boolean; readonly rightOpen: boolean };
      } = {
        current: Object.freeze({ leftOpen: false, rightOpen: false }),
      };
      const unbindDevDock = runtime.bindDevDockStateReader(() => devDockState.current);
      expect(() =>
        runtime.bindDevDockStateReader(() => Object.freeze({ leftOpen: false, rightOpen: false })),
      ).toThrowError("presentation.e2e.devdock_state_reader_already_bound");
      devDockState.current = Object.freeze({ leftOpen: false, rightOpen: true });
      expect(runtime.presentation.getSnapshot()).toBe(presentationBefore);
      expect(runtime.application.semantic.observe()).toBe(semanticBefore);
      expect(runtime.uiState.getCurrent()).toBe(uiStateBefore);
      expect(presentationListener).not.toHaveBeenCalled();
      expect(semanticListener).not.toHaveBeenCalled();
      expect(uiStateListener).not.toHaveBeenCalled();
      const hashListenerCountBefore = browser.hashEvents.listenerCount("hashchange");

      const exported = await runtime.application.diagnostics.exportDebugBundle();
      const decoded = createE2eDebugBundleCodecV1(
        resolved.gameSimulation.stateSchema,
      ).bundleSchema.parse(decodeDebugBundleJsonV1(exported.bytes));
      const exportedPresentation = [presentationBefore, ...presentationsDuringExport].find(
        ({ revision }) => revision === decoded.uiContext?.presentation?.presentationRevision,
      );
      if (exportedPresentation === undefined) {
        throw new TypeError("missing export-time E2E presentation publication");
      }

      expect(decoded.uiContext).toMatchObject({
        revision: 1,
        presentation: {
          presentationRevision: exportedPresentation.revision,
          stageSceneId: exportedPresentation.view.stage.stageSceneId,
          variantId: exportedPresentation.view.stage.variantId,
          stageRendererId: exportedPresentation.view.stage.rendererId,
          visibleInteractionSurfaceIds: [surface.surfaceId],
          activeInteractionSurfaceId: surface.surfaceId,
          contentPolicyRevision: e2eContentMaturityPolicyV1.policyRevision,
          allowedContentFlags: e2eContentMaturityPolicyV1.defaultAllowedFlags,
        },
        session: {
          routeId: "play",
          primaryOverlayId: "overlay.e2e.save",
          detailOverlayIds: [],
          narrativeOpen: true,
          systemDialogOpen: true,
          devDock: { leftOpen: false, rightOpen: true },
        },
      });
      expect(runtime.application.semantic.observe().revision).toBe(semanticBefore.revision);
      expect(runtime.uiState.getCurrent()).toBe(uiStateBefore);
      expect(runtime.systemDialogSession.getSnapshot()).toBe(systemDialogBefore);
      expect(uiStateListener).not.toHaveBeenCalled();
      expect(systemDialogListener).not.toHaveBeenCalled();
      expect(browser.hashEvents.listenerCount("hashchange")).toBe(hashListenerCountBefore);

      unbindDevDock();
      const fallbackExport = await runtime.application.diagnostics.exportDebugBundle();
      const fallbackDecoded = createE2eDebugBundleCodecV1(
        resolved.gameSimulation.stateSchema,
      ).bundleSchema.parse(decodeDebugBundleJsonV1(fallbackExport.bytes));
      expect(fallbackDecoded.uiContext?.session.devDock).toEqual({
        leftOpen: false,
        rightOpen: false,
      });
      expect(uiStateListener).not.toHaveBeenCalled();
    } finally {
      for (const unsubscribe of unsubscribers) unsubscribe();
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

      const debugBundle = await runtime.playerUi.diagnostics.prepareDebugBundle();
      expect(debugBundle).not.toHaveProperty("bytes");
      expect(download).not.toHaveBeenCalled();

      await runtime.playerUi.diagnostics.savePreparedDebugBundle();
      const downloaded = download.mock.calls[0]?.[0];
      if (downloaded === undefined) throw new TypeError("missing saved Debug Bundle");
      expect(download).toHaveBeenCalledExactlyOnceWith({
        filename: debugBundle.filename,
        mediaType: debugBundle.mediaType,
        bytes: downloaded.bytes,
      });
      expect(downloaded.bytes.byteLength).toBe(debugBundle.encodedByteLength);
      expect(digestBytes(downloaded.bytes)).toBe(debugBundle.digest);

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

  it("omits uiContext when the headless game runtime has no bound presentation reader", async () => {
    let lifecycle: WebRuntimeRebootstrapLifecycleV1<PersistenceRebootstrapDisposalV1> | undefined;
    const application = await createE2eGameRuntimeV1({
      resolved: resolveStoryForTestV1(e2eStoryEntryV1),
      host: createHostV1(),
      onRebootstrapLifecycle(nextLifecycle) {
        lifecycle = nextLifecycle;
      },
    });

    try {
      const exported = await application.diagnostics.exportDebugBundle();
      expect(decodeDebugBundleJsonV1(exported.bytes)).not.toHaveProperty("uiContext");
    } finally {
      await lifecycle?.disposeForRebootstrap();
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
      expect(() =>
        runtime.bindDevDockStateReader(() => Object.freeze({ leftOpen: false, rightOpen: false })),
      ).toThrowError("presentation.e2e.devdock_state_reader_disposed");
    } finally {
      abortPreload.mockRestore();
    }
  });

  it("hands off the HMR lifecycle only after presentation owners bind and cleans a rejected handoff", async () => {
    const records = createMemoryHostRecordStoreV1();
    const browser = createRuntimeEnvironmentFixtureV1("#/play");
    const handoffFailure = new TypeError("e2e.lifecycle_handoff_failed");
    const onConstructionFailureDisposition = vi.fn();
    const observations: Array<Readonly<{ blur: number; visibility: number }>> = [];

    await expect(
      createE2ePresentationRuntimeV1({
        resolved: resolveStoryForTestV1(e2eStoryEntryV1),
        host: createHostV1(undefined, records, "00000000-0000-4000-8000-000000000403"),
        environment: browser.environment,
        onConstructionFailureDisposition,
        onRebootstrapLifecycle() {
          observations.push(
            Object.freeze({
              blur: browser.pointerWindow.listenerCount("blur"),
              visibility: browser.pointerDocument.listenerCount("visibilitychange"),
            }),
          );
          return Promise.reject(handoffFailure);
        },
      }),
    ).rejects.toBe(handoffFailure);

    expect(observations).toEqual([{ blur: 1, visibility: 1 }]);
    expect(onConstructionFailureDisposition).toHaveBeenCalledWith(
      expect.objectContaining({ ownership: "released" }),
    );
    expect(await readLeaseOwnerIdV1(records)).toBeNull();
    expect(browser.hashEvents.listenerCount("hashchange")).toBe(0);
    expect(browser.pointerWindow.listenerCount("blur")).toBe(0);
    expect(browser.pointerDocument.listenerCount("visibilitychange")).toBe(0);
    expect(browser.disposeLoader).toHaveBeenCalledOnce();
  });

  it("awaits cleanup when preference construction fails after the game owner is live", async () => {
    const delayed = createDelayedSettingsFailureV1();
    const browser = createRuntimeEnvironmentFixtureV1("#/play");
    const ownerId = "00000000-0000-4000-8000-000000000404";
    const preferenceFailure = new TypeError("e2e.preference_construction_failed");
    const creation = createE2ePresentationRuntimeV1({
      resolved: resolveStoryForTestV1(e2eStoryEntryV1),
      host: createHostV1(undefined, delayed.records, ownerId),
      environment: browser.environment,
    });

    await delayed.readStarted;
    await vi.waitFor(async () => {
      expect(await readLeaseOwnerIdV1(delayed.records)).toBe(ownerId);
    });
    delayed.fail(preferenceFailure);

    await expect(creation).rejects.toBe(preferenceFailure);
    expect(await readLeaseOwnerIdV1(delayed.records)).toBeNull();
    expect(browser.hashEvents.listenerCount("hashchange")).toBe(0);
    expect(browser.pointerWindow.listenerCount("blur")).toBe(0);
    expect(browser.pointerDocument.listenerCount("visibilitychange")).toBe(0);
    expect(browser.disposeLoader).toHaveBeenCalledOnce();
  });
});
