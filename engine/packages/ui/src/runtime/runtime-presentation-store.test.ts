// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { access, readdir, readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

import {
  findUnknownContentMaturityFlagsV1,
  parseAssetId,
  parseContentMaturityPolicyV1,
  parseContentPreferenceV1,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "@sillymaker/base";
import type {
  AssetId,
  ContentMaturityPolicyV1,
  ContentPreferencePortV1,
  ContentPreferenceSetResultV1,
  ContentPreferenceV1,
  DeepReadonly,
  NonNegativeSafeInteger,
  ReadonlyViewSourceV1,
  ResolvedAssetManifestV1,
} from "@sillymaker/base";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  createAssetRegistryV1,
  type AssetRegistryV1,
  type RuntimeAssetLoaderV1,
} from "../assets/asset-registry.js";
import { createSemanticPublicationBridgeV1 } from "./semantic-publication-bridge.js";
import {
  RuntimePresentationConstructionErrorV1,
  createRuntimePresentationStoreV1,
  type PresentationRuntimeFailureV1,
  type RuntimePresentationProjectionInputV1,
  type RuntimePresentationProjectionV1,
} from "./runtime-presentation-store.js";
import { useRuntimePresentationV1 } from "./use-runtime-presentation.js";

interface TestGameViewV1 {
  readonly token: "game.0" | "game.1" | "game.extra";
  readonly scene: "base" | "extra";
}

interface TestNarrativeViewV1 {
  readonly token: "narrative.0" | "narrative.1";
}

interface TestActionV1 {
  readonly actionId: "action.0" | "action.1";
}

interface TestSemanticPublicationV1 {
  readonly revision: NonNegativeSafeInteger;
  readonly game: DeepReadonly<TestGameViewV1>;
  readonly narrative: DeepReadonly<TestNarrativeViewV1>;
  readonly actions: readonly DeepReadonly<TestActionV1>[];
}

interface TestResolvedCatalogV1 {
  readonly baseBackgroundAssetId: AssetId;
  readonly baseCharacterAssetId: AssetId;
  readonly alphaBackgroundAssetId: AssetId;
  readonly betaBackgroundAssetId: AssetId;
}

interface TestUiStateV1 {
  readonly primaryOverlayId: string | null;
}

interface TestPresentationViewV1 {
  readonly gameToken: DeepReadonly<TestGameViewV1>;
  readonly narrativeToken: DeepReadonly<TestNarrativeViewV1>;
  readonly actionToken: readonly DeepReadonly<TestActionV1>[];
  readonly primaryOverlayId: string | null;
  readonly allowedFlags: ContentPreferenceV1["allowedFlags"];
}

type TestProjectionInputV1 = RuntimePresentationProjectionInputV1<
  TestSemanticPublicationV1,
  TestResolvedCatalogV1,
  TestUiStateV1
>;
type TestProjectionV1 = RuntimePresentationProjectionV1<TestPresentationViewV1, AssetId>;

const game0 = Object.freeze({ token: "game.0" as const, scene: "base" as const });
const game1 = Object.freeze({ token: "game.1" as const, scene: "base" as const });
const extraSceneGameView = Object.freeze({
  token: "game.extra" as const,
  scene: "extra" as const,
});
const narrative0 = Object.freeze({ token: "narrative.0" as const });
const narrative1 = Object.freeze({ token: "narrative.1" as const });
const actions0 = Object.freeze([Object.freeze({ actionId: "action.0" as const })]);
const actions1 = Object.freeze([Object.freeze({ actionId: "action.1" as const })]);

const baseBackgroundAssetIdV1 = parseAssetId("asset.e2e.background.base");
const baseCharacterAssetIdV1 = parseAssetId("asset.e2e.character.base");
const alphaBackgroundAssetIdV1 = parseAssetId("asset.e2e.background.alpha");
const betaBackgroundAssetIdV1 = parseAssetId("asset.e2e.background.beta");

const resolvedCatalogV1: DeepReadonly<TestResolvedCatalogV1> = Object.freeze({
  baseBackgroundAssetId: baseBackgroundAssetIdV1,
  baseCharacterAssetId: baseCharacterAssetIdV1,
  alphaBackgroundAssetId: alphaBackgroundAssetIdV1,
  betaBackgroundAssetId: betaBackgroundAssetIdV1,
});

const testContentPolicyV1 = parseContentMaturityPolicyV1({
  policyRevision: 1,
  flags: [
    {
      id: "content.alpha",
      flag: 1,
      nameTextId: "text.content.alpha.name",
      descriptionTextId: "text.content.alpha.description",
    },
    {
      id: "content.beta",
      flag: 2,
      nameTextId: "text.content.beta.name",
      descriptionTextId: "text.content.beta.description",
    },
  ],
  presets: [],
  defaultAllowedFlags: 0,
});

function createTrackedSemanticSourceV1(initial: DeepReadonly<TestSemanticPublicationV1>) {
  let current = initial;
  let reads = 0;
  let unsubscribes = 0;
  const listeners = new Set<() => void>();
  const detachedListeners = new Set<() => void>();
  return Object.freeze({
    source: Object.freeze({
      observe() {
        reads += 1;
        return current;
      },
      subscribe(listener: () => void) {
        listeners.add(listener);
        detachedListeners.add(listener);
        let subscribed = true;
        return () => {
          if (!subscribed) return;
          subscribed = false;
          unsubscribes += 1;
          listeners.delete(listener);
        };
      },
    }),
    publish(value: DeepReadonly<TestSemanticPublicationV1>) {
      current = value;
      for (const listener of [...listeners]) listener();
    },
    notifyDetached() {
      for (const listener of [...detachedListeners]) listener();
    },
    current: () => current,
    reads: () => reads,
    unsubscribes: () => unsubscribes,
  });
}

function createTrackedContentPreferenceV1(policy: DeepReadonly<ContentMaturityPolicyV1>) {
  let current = Object.freeze({ allowedFlags: policy.defaultAllowedFlags });
  let reads = 0;
  let unsubscribes = 0;
  const listeners = new Set<() => void>();
  const detachedListeners = new Set<() => void>();
  const port: ContentPreferencePortV1 = Object.freeze({
    observe() {
      reads += 1;
      return current;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      detachedListeners.add(listener);
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        unsubscribes += 1;
        listeners.delete(listener);
      };
    },
    async set(value: DeepReadonly<ContentPreferenceV1>): Promise<ContentPreferenceSetResultV1> {
      let parsed: ContentPreferenceV1;
      try {
        parsed = parseContentPreferenceV1(value);
      } catch {
        return Object.freeze({
          kind: "rejected" as const,
          code: "content_maturity.invalid_preference" as const,
        });
      }
      if (findUnknownContentMaturityFlagsV1(policy, parsed.allowedFlags) !== 0) {
        return Object.freeze({
          kind: "rejected" as const,
          code: "content_maturity.unknown_flags" as const,
        });
      }
      current = Object.freeze({ allowedFlags: parsed.allowedFlags });
      for (const listener of [...listeners]) listener();
      return Object.freeze({ kind: "updated" as const, preference: current });
    },
  });
  return Object.freeze({
    port,
    current: () => current,
    reads: () => reads,
    unsubscribes: () => unsubscribes,
    notifyDetached() {
      for (const listener of [...detachedListeners]) listener();
    },
  });
}

function createTrackedUiStateV1(initial: DeepReadonly<TestUiStateV1>) {
  let current = initial;
  let reads = 0;
  let unsubscribes = 0;
  const listeners = new Set<() => void>();
  const detachedListeners = new Set<() => void>();
  const source: ReadonlyViewSourceV1<TestUiStateV1> = Object.freeze({
    getCurrent() {
      reads += 1;
      return current;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      detachedListeners.add(listener);
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        unsubscribes += 1;
        listeners.delete(listener);
      };
    },
  });
  return Object.freeze({
    source,
    publish(value: DeepReadonly<TestUiStateV1>) {
      current = value;
      for (const listener of [...listeners]) listener();
    },
    current: () => current,
    reads: () => reads,
    unsubscribes: () => unsubscribes,
    notifyDetached() {
      for (const listener of [...detachedListeners]) listener();
    },
  });
}

function semanticPublicationV1(input: {
  readonly revision: number;
  readonly game: DeepReadonly<TestGameViewV1>;
  readonly narrative: DeepReadonly<TestNarrativeViewV1>;
  readonly actions: readonly DeepReadonly<TestActionV1>[];
}): DeepReadonly<TestSemanticPublicationV1> {
  return Object.freeze({
    revision: parseNonNegativeSafeInteger(input.revision),
    game: input.game,
    narrative: input.narrative,
    actions: input.actions,
  });
}

interface RuntimePresentationFixtureOptionsV1 {
  readonly reportFailure?: (failure: DeepReadonly<PresentationRuntimeFailureV1>) => void;
}

function createRuntimePresentationStoreFixtureV1(
  options: RuntimePresentationFixtureOptionsV1 = {},
) {
  const semanticSource = createTrackedSemanticSourceV1(
    semanticPublicationV1({ revision: 0, game: game0, narrative: narrative0, actions: actions0 }),
  );
  const semantic = createSemanticPublicationBridgeV1(semanticSource.source);
  const preferenceSource = createTrackedContentPreferenceV1(testContentPolicyV1);
  const uiStateSource = createTrackedUiStateV1(Object.freeze({ primaryOverlayId: null }));
  const failures: Array<DeepReadonly<PresentationRuntimeFailureV1>> = [];
  const projectInputs: TestProjectionInputV1[] = [];
  let throwOnNext = false;
  let duplicateOnNext = false;
  let lastProjectedAssetIds: AssetId[] = [];

  const project = (input: TestProjectionInputV1): TestProjectionV1 => {
    projectInputs.push(input);
    if (throwOnNext) {
      throwOnNext = false;
      throw new Error("fixture projection");
    }
    const useAlpha =
      input.semantic.game.scene === "extra" &&
      input.contentPreference.allowedFlags === testContentPolicyV1.flags[0]!.flag;
    const assets = [
      useAlpha
        ? input.resolvedCatalog.alphaBackgroundAssetId
        : input.resolvedCatalog.baseBackgroundAssetId,
      input.resolvedCatalog.baseCharacterAssetId,
    ];
    if (duplicateOnNext) {
      duplicateOnNext = false;
      assets.push(assets[0]!);
    }
    lastProjectedAssetIds = assets;
    return Object.freeze({
      view: Object.freeze({
        gameToken: input.semantic.game,
        narrativeToken: input.semantic.narrative,
        actionToken: input.semantic.actions,
        primaryOverlayId: input.uiState.primaryOverlayId,
        allowedFlags: input.contentPreference.allowedFlags,
      }),
      requiredAssetIds: assets,
    });
  };

  const store = createRuntimePresentationStoreV1({
    semantic,
    resolvedCatalog: resolvedCatalogV1,
    contentPreference: preferenceSource.port,
    uiState: uiStateSource.source,
    project,
    reportFailure(failure) {
      if (options.reportFailure !== undefined) {
        options.reportFailure(failure);
      } else {
        failures.push(failure);
      }
    },
  });

  return Object.freeze({
    store,
    semantic,
    preference: preferenceSource.port,
    uiState: Object.freeze({
      getCurrent: uiStateSource.source.getCurrent,
      subscribe: uiStateSource.source.subscribe,
      publish: uiStateSource.publish,
    }),
    testContentFlag: testContentPolicyV1.flags[0]!,
    projectInputs,
    projectCount: () => projectInputs.length,
    failures: () => Object.freeze([...failures]),
    lastProjectedAssetIds: () => lastProjectedAssetIds,
    throwOnNextProjection() {
      throwOnNext = true;
    },
    duplicateOnNextProjection() {
      duplicateOnNext = true;
    },
    publishSemantic(input: {
      readonly game: DeepReadonly<TestGameViewV1>;
      readonly narrative: DeepReadonly<TestNarrativeViewV1>;
      readonly actions: readonly DeepReadonly<TestActionV1>[];
    }) {
      const next = semanticPublicationV1({
        revision: semanticSource.current().revision + 1,
        ...input,
      });
      semanticSource.publish(next);
      return next;
    },
    semanticReads: semanticSource.reads,
    preferenceReads: preferenceSource.reads,
    uiStateReads: uiStateSource.reads,
    semanticUnsubscribes: semanticSource.unsubscribes,
    preferenceUnsubscribes: preferenceSource.unsubscribes,
    uiStateUnsubscribes: uiStateSource.unsubscribes,
    notifyDetached() {
      semanticSource.notifyDetached();
      preferenceSource.notifyDetached();
      uiStateSource.notifyDetached();
    },
  });
}

function createConstructionHarnessV1(
  project: (input: TestProjectionInputV1) => TestProjectionV1,
  reportFailure: (failure: DeepReadonly<PresentationRuntimeFailureV1>) => void = vi.fn(),
) {
  const semanticSource = createTrackedSemanticSourceV1(
    semanticPublicationV1({ revision: 0, game: game0, narrative: narrative0, actions: actions0 }),
  );
  const preferenceSource = createTrackedContentPreferenceV1(testContentPolicyV1);
  const uiStateSource = createTrackedUiStateV1(Object.freeze({ primaryOverlayId: null }));
  const semantic = createSemanticPublicationBridgeV1(semanticSource.source);
  return Object.freeze({
    construct: () =>
      createRuntimePresentationStoreV1({
        semantic,
        resolvedCatalog: resolvedCatalogV1,
        contentPreference: preferenceSource.port,
        uiState: uiStateSource.source,
        project,
        reportFailure,
      }),
    semanticUnsubscribes: semanticSource.unsubscribes,
    preferenceUnsubscribes: preferenceSource.unsubscribes,
    uiStateUnsubscribes: uiStateSource.unsubscribes,
  });
}

type ResolvedAssetEntryV1 = ResolvedAssetManifestV1["assets"][number];
type AssetUsageV1 = ResolvedAssetEntryV1["usage"];

function codeFallbackAssetV1(
  assetId: AssetId,
  usage: AssetUsageV1,
): Extract<ResolvedAssetEntryV1, { readonly delivery: "code_fallback" }> {
  return Object.freeze({
    assetId,
    kind: usage === "character_pose" ? "character" : "background",
    usage,
    overridePolicy: "replaceable",
    fallbackToken: `fallback.${assetId}`,
    width: parsePositiveSafeInteger(1_600),
    height: parsePositiveSafeInteger(1_000),
    loadGroup: "scene",
    safeArea: null,
    pivot: null,
    delivery: "code_fallback",
    provider: null,
    overrideChain: Object.freeze([]),
  });
}

function assetManifestV1(assets: readonly ResolvedAssetEntryV1[]): ResolvedAssetManifestV1 {
  return Object.freeze({
    packs: Object.freeze([]),
    slots: Object.freeze(
      assets.map((asset) =>
        Object.freeze({
          assetId: asset.assetId,
          kind: asset.kind,
          usage: asset.usage,
          overridePolicy: asset.overridePolicy,
          fallbackToken: asset.fallbackToken,
          width: asset.width,
          height: asset.height,
          loadGroup: asset.loadGroup,
          safeArea: asset.safeArea,
          pivot: asset.pivot,
        }),
      ),
    ),
    assets: Object.freeze([...assets]),
  });
}

function createRuntimePresentationAssetFixtureV1() {
  const presentation = createRuntimePresentationStoreFixtureV1();
  const assets = [
    codeFallbackAssetV1(baseBackgroundAssetIdV1, "scene_background"),
    codeFallbackAssetV1(baseCharacterAssetIdV1, "character_pose"),
    codeFallbackAssetV1(alphaBackgroundAssetIdV1, "scene_background"),
    codeFallbackAssetV1(betaBackgroundAssetIdV1, "scene_background"),
  ];
  const loader: RuntimeAssetLoaderV1 = Object.freeze({
    cacheKey: (request: Parameters<RuntimeAssetLoaderV1["cacheKey"]>[0]) =>
      `${request.runtimePath}#${request.sha256}`,
    async load() {
      throw new Error("code fallback should not load");
    },
    dispose: vi.fn(),
  });
  const delegate = createAssetRegistryV1(assetManifestV1(assets), loader, vi.fn());
  const calls: AssetId[][] = [];
  const assetRegistry: AssetRegistryV1<AssetId, AssetUsageV1, string> = Object.freeze({
    observe: delegate.observe,
    subscribe: delegate.subscribe,
    resolve: delegate.resolve,
    dispose: delegate.dispose,
    async preload(assetIds: readonly AssetId[], signal: AbortSignal) {
      calls.push([...assetIds]);
      return await delegate.preload(assetIds, signal);
    },
  });
  return Object.freeze({
    ...presentation,
    assetRegistry,
    signal: new AbortController().signal,
    preloadCalls: () => calls.map((call) => [...call]),
  });
}

async function collectProductionImportsV1(directory: string): Promise<string> {
  const repositoryRoot = resolve(import.meta.dirname, "../../../../..");
  const absoluteDirectory = resolve(repositoryRoot, directory);
  const collectFiles = async (currentDirectory: string): Promise<readonly string[]> => {
    const entries = await readdir(currentDirectory, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry): Promise<readonly string[]> => {
        const path = resolve(currentDirectory, entry.name);
        if (entry.isDirectory()) return await collectFiles(path);
        if (
          !entry.isFile() ||
          !/\.tsx?$/u.test(entry.name) ||
          /\.(?:test|spec)(?:-d)?\.tsx?$/u.test(entry.name)
        ) {
          return [];
        }
        return [path];
      }),
    );
    return nested.flat().toSorted();
  };
  const importPattern =
    /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["'][^"']+["']|import\s*\(\s*["'][^"']+["']\s*\)/gu;
  const imports = await Promise.all(
    (await collectFiles(absoluteDirectory)).map(async (filename) => {
      const source = await readFile(filename, "utf8");
      return [...source.matchAll(importPattern)].map((match) => match[0]);
    }),
  );
  return imports.flat().toSorted().join("\n");
}

async function existingSourcePathV1(rawPath: string): Promise<string | null> {
  const extension = extname(rawPath);
  const candidates =
    extension === ".js"
      ? [`${rawPath.slice(0, -3)}.ts`, `${rawPath.slice(0, -3)}.tsx`]
      : extension === ""
        ? [rawPath, `${rawPath}.ts`, `${rawPath}.tsx`, resolve(rawPath, "index.ts")]
        : [rawPath];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {}
  }
  return null;
}

async function collectNodeImportClosureV1(entry: string): Promise<string> {
  const repositoryRoot = resolve(import.meta.dirname, "../../../../..");
  const queue = [resolve(repositoryRoot, entry)];
  const visited = new Set<string>();
  const output = new Set<string>();
  const staticPattern = /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/gu;
  while (queue.length > 0) {
    const file = queue.shift();
    if (file === undefined || visited.has(file)) continue;
    visited.add(file);
    output.add(file.slice(repositoryRoot.length + 1));
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(staticPattern)) {
      const specifier = match[1];
      if (specifier === undefined) continue;
      output.add(specifier);
      if (!specifier.startsWith(".")) continue;
      const target = await existingSourcePathV1(resolve(dirname(file), specifier));
      if (target === null) throw new TypeError(`missing closure import: ${specifier}`);
      queue.push(target);
    }
  }
  return [...output].toSorted().join("\n");
}

describe("RuntimePresentationStoreV1", () => {
  it("projects one view from the exact atomic Semantic publication", () => {
    const fixture = createRuntimePresentationStoreFixtureV1();
    const semantic1 = fixture.publishSemantic({
      game: game1,
      narrative: narrative1,
      actions: actions1,
    });
    const published = fixture.store.getSnapshot();

    expect(published.semantic).toBe(semantic1);
    expect(published.view.gameToken).toBe(game1);
    expect(published.view.narrativeToken).toBe(narrative1);
    expect(published.view.actionToken).toBe(actions1);
    expect(fixture.projectInputs.at(-1)?.semantic).toBe(semantic1);
  });

  it("caches one immutable initial publication and reads every source once per notification", () => {
    const fixture = createRuntimePresentationStoreFixtureV1();
    const initial = fixture.store.getSnapshot();
    const initialReads = [
      fixture.semanticReads(),
      fixture.preferenceReads(),
      fixture.uiStateReads(),
      fixture.projectCount(),
    ];

    expect(initial.revision).toBe(0);
    expect(fixture.store.getSnapshot()).toBe(initial);
    expect(Object.isFrozen(initial)).toBe(true);
    expect(Object.isFrozen(initial.requiredAssetIds)).toBe(true);
    expect(Object.isFrozen(fixture.projectInputs[0])).toBe(true);

    fixture.publishSemantic({ game: game1, narrative: narrative1, actions: actions1 });
    expect([
      fixture.semanticReads(),
      fixture.preferenceReads(),
      fixture.uiStateReads(),
      fixture.projectCount(),
    ]).toEqual(initialReads.map((value) => value + 1));
    expect(fixture.projectInputs.at(-1)?.resolvedCatalog).toBe(resolvedCatalogV1);
  });

  it("reprojects preference and UI state without inventing a Semantic revision", async () => {
    const fixture = createRuntimePresentationStoreFixtureV1();
    const semantic = fixture.semantic.getSnapshot();
    const initialPresentationRevision = fixture.store.getSnapshot().revision;

    await fixture.preference.set({ allowedFlags: fixture.testContentFlag.flag });
    fixture.uiState.publish({ primaryOverlayId: "overlay.fixture" });

    expect(fixture.store.getSnapshot()).toMatchObject({
      revision: initialPresentationRevision + 2,
      semantic,
    });
    expect(fixture.store.getSnapshot().semantic.revision).toBe(semantic.revision);
  });

  it("publishes the exact allowed asset list in first-use order", () => {
    const fixture = createRuntimePresentationStoreFixtureV1();
    fixture.publishSemantic({ game: extraSceneGameView, narrative: narrative1, actions: [] });

    expect(fixture.store.getSnapshot().requiredAssetIds).toEqual([
      "asset.e2e.background.base",
      "asset.e2e.character.base",
    ]);
    expect(fixture.store.getSnapshot().requiredAssetIds).not.toContain(
      "asset.e2e.background.alpha",
    );
    expect(fixture.store.getSnapshot().requiredAssetIds).not.toContain("asset.e2e.background.beta");
  });

  it("defensively copies the projector asset list", () => {
    const fixture = createRuntimePresentationStoreFixtureV1();
    const published = fixture.store.getSnapshot();
    fixture.lastProjectedAssetIds().push(alphaBackgroundAssetIdV1);

    expect(published.requiredAssetIds).toEqual([baseBackgroundAssetIdV1, baseCharacterAssetIdV1]);
  });

  it("rejects duplicate demanded assets, preserves the old publication, and later recovers", () => {
    const fixture = createRuntimePresentationStoreFixtureV1();
    const listener = vi.fn();
    fixture.store.subscribe(listener);
    const before = fixture.store.getSnapshot();
    fixture.duplicateOnNextProjection();

    fixture.publishSemantic({ game: game1, narrative: narrative1, actions: actions1 });
    expect(fixture.store.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(fixture.failures()).toHaveLength(1);
    expect(fixture.failures()[0]).toMatchObject({ code: "presentation.projection_failed" });

    const recoveredSemantic = fixture.publishSemantic({
      game: extraSceneGameView,
      narrative: narrative1,
      actions: actions1,
    });
    expect(fixture.store.getSnapshot().revision).toBe(before.revision + 1);
    expect(fixture.store.getSnapshot().semantic).toBe(recoveredSemantic);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("isolates a throwing subscriber and keeps the committed publication", () => {
    const fixture = createRuntimePresentationStoreFixtureV1();
    const second = vi.fn(() => {
      expect(fixture.store.getSnapshot().semantic.game).toBe(game1);
    });
    fixture.store.subscribe(() => {
      throw new Error("presentation-listener");
    });
    fixture.store.subscribe(second);

    fixture.publishSemantic({ game: game1, narrative: narrative1, actions: actions1 });

    expect(second).toHaveBeenCalledOnce();
    expect(fixture.failures()).toHaveLength(1);
    expect(fixture.failures()[0]).toMatchObject({ code: "presentation.subscriber_failed" });
    expect(fixture.store.getSnapshot().semantic.game).toBe(game1);
  });

  it("disposes every upstream subscription exactly once and ignores detached notifications", () => {
    const fixture = createRuntimePresentationStoreFixtureV1();
    const before = fixture.store.getSnapshot();
    const projectCount = fixture.projectCount();

    fixture.store.dispose();
    fixture.store.dispose();
    fixture.notifyDetached();

    expect(fixture.semanticUnsubscribes()).toBe(1);
    expect(fixture.preferenceUnsubscribes()).toBe(1);
    expect(fixture.uiStateUnsubscribes()).toBe(1);
    expect(fixture.store.getSnapshot()).toBe(before);
    expect(fixture.projectCount()).toBe(projectCount);
  });

  it("isolates a throwing failure sink, preserves the prior snapshot, and later recovers", () => {
    const fixture = createRuntimePresentationStoreFixtureV1({
      reportFailure: () => {
        throw new Error("diagnostic-sink");
      },
    });
    const before = fixture.store.getSnapshot();
    fixture.throwOnNextProjection();

    expect(() =>
      fixture.publishSemantic({ game: game1, narrative: narrative1, actions: actions1 }),
    ).not.toThrow();
    expect(fixture.store.getSnapshot()).toBe(before);

    const recovered = fixture.publishSemantic({
      game: extraSceneGameView,
      narrative: narrative1,
      actions: actions1,
    });
    expect(fixture.store.getSnapshot().semantic).toBe(recovered);
    expect(fixture.store.getSnapshot().revision).toBe(before.revision + 1);
  });

  it("rejects construction when no valid initial projection exists and cleans subscriptions", () => {
    const failures: Array<DeepReadonly<PresentationRuntimeFailureV1>> = [];
    const harness = createConstructionHarnessV1(
      () => {
        throw new Error("initial projector");
      },
      (failure) => {
        failures.push(failure);
        throw new Error("diagnostic-sink");
      },
    );

    let constructionError: unknown;
    try {
      harness.construct();
    } catch (error) {
      constructionError = error;
    }
    expect(constructionError).toBeInstanceOf(RuntimePresentationConstructionErrorV1);
    expect(constructionError).toMatchObject({ code: "presentation.initial_projection_failed" });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ code: "presentation.initial_projection_failed" });
    expect(harness.semanticUnsubscribes()).toBe(1);
    expect(harness.preferenceUnsubscribes()).toBe(1);
    expect(harness.uiStateUnsubscribes()).toBe(1);
  });

  it("rejects duplicate initial asset demand as a construction failure", () => {
    const reportFailure = vi.fn();
    const harness = createConstructionHarnessV1(
      (input) =>
        Object.freeze({
          view: Object.freeze({
            gameToken: input.semantic.game,
            narrativeToken: input.semantic.narrative,
            actionToken: input.semantic.actions,
            primaryOverlayId: input.uiState.primaryOverlayId,
            allowedFlags: input.contentPreference.allowedFlags,
          }),
          requiredAssetIds: [baseBackgroundAssetIdV1, baseBackgroundAssetIdV1],
        }),
      reportFailure,
    );

    expect(harness.construct).toThrowError(RuntimePresentationConstructionErrorV1);
    expect(reportFailure).toHaveBeenCalledOnce();
    expect(reportFailure).toHaveBeenCalledWith(
      expect.objectContaining({ code: "presentation.initial_projection_failed" }),
    );
  });

  it("exposes the cached store snapshot through the React external-store hook", () => {
    const fixture = createRuntimePresentationStoreFixtureV1();
    const beforeProjects = fixture.projectCount();
    const hook = renderHook(() => useRuntimePresentationV1(fixture.store));

    expect(hook.result.current).toBe(fixture.store.getSnapshot());
    hook.rerender();
    expect(hook.result.current).toBe(fixture.store.getSnapshot());
    expect(fixture.projectCount()).toBe(beforeProjects);

    act(() => fixture.uiState.publish({ primaryOverlayId: "overlay.hook" }));
    expect(hook.result.current).toBe(fixture.store.getSnapshot());
    expect(hook.result.current.view.primaryOverlayId).toBe("overlay.hook");
  });

  it("preloads only the exact IDs resolved by one publication", async () => {
    const fixture = createRuntimePresentationAssetFixtureV1();
    const publication = fixture.store.getSnapshot();

    await fixture.assetRegistry.preload(publication.requiredAssetIds, fixture.signal);

    expect(fixture.preloadCalls()).toEqual([
      ["asset.e2e.background.base", "asset.e2e.character.base"],
    ]);
    expect(JSON.stringify(fixture.preloadCalls())).not.toMatch(/scene|overlay|extra/u);
  });

  it("keeps generic runtime and Story Web projection closures separated", async () => {
    const runtimeImports = await collectProductionImportsV1("engine/packages/ui/src/runtime");
    expect(runtimeImports).toContain("@sillymaker/base");
    expect(runtimeImports).not.toMatch(/stories\/|apps\/web|@project-tavern\//u);

    expect(await collectNodeImportClosureV1("game/stories/e2e/src/story-entry.ts")).not.toMatch(
      /runtime-presentation|\.tsx|react/u,
    );
  });
});
