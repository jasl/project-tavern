// SPDX-License-Identifier: MIT
import {
  digestBytes,
  parseAssetId,
  parsePositiveSafeInteger,
  type AssetId,
  type Digest,
  type ResolvedAssetManifestV1,
} from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";
import {
  createAssetRegistryV1,
  type RuntimeAssetLoadRequestV1,
  type RuntimeAssetLoaderV1,
} from "./asset-registry.js";

type LoaderSettlementV1 = Awaited<ReturnType<RuntimeAssetLoaderV1["load"]>>;
type ResolvedAssetEntryV1 = ResolvedAssetManifestV1["assets"][number];
type AssetUsageV1 = ResolvedAssetEntryV1["usage"];
type RuntimeAssetEntryV1 = Extract<ResolvedAssetEntryV1, { readonly delivery: "runtime_image" }>;

const neverAbortedSignal = new AbortController().signal;
const sceneUsageV1: AssetUsageV1 = "scene_background";
const characterUsageV1: AssetUsageV1 = "character_pose";

function assetId(value: string): AssetId {
  return parseAssetId(value);
}

function digestV1(label: string): Digest {
  return digestBytes(new TextEncoder().encode(`asset-registry:${label}`));
}

function runtimeAssetV1(input: {
  readonly assetId: AssetId;
  readonly runtimePath: string;
  readonly sha256?: Digest;
  readonly usage?: AssetUsageV1;
  readonly fallbackToken?: string;
}): RuntimeAssetEntryV1 {
  const providerIdentity = Object.freeze({
    id: "assets.e2e",
    revision: parsePositiveSafeInteger(1),
    digest: digestV1("provider"),
  });

  return Object.freeze({
    assetId: input.assetId,
    kind: input.usage === characterUsageV1 ? "character" : "background",
    usage: input.usage ?? sceneUsageV1,
    overridePolicy: "replaceable",
    fallbackToken: input.fallbackToken ?? `fallback.${input.assetId}`,
    width: parsePositiveSafeInteger(1_600),
    height: parsePositiveSafeInteger(1_000),
    loadGroup: "scene",
    safeArea: null,
    pivot: null,
    runtimePath: input.runtimePath,
    mediaType: "image/webp",
    byteLength: parsePositiveSafeInteger(1),
    sha256: input.sha256 ?? digestV1(input.runtimePath),
    delivery: "runtime_image",
    provider: Object.freeze({ kind: "asset_pack", identity: providerIdentity }),
    overrideChain: Object.freeze([
      Object.freeze({ kind: "asset_pack" as const, identity: providerIdentity }),
    ]),
  });
}

function codeFallbackAssetV1(input: {
  readonly assetId: AssetId;
  readonly usage?: AssetUsageV1;
  readonly fallbackToken?: string;
}): Extract<ResolvedAssetEntryV1, { readonly delivery: "code_fallback" }> {
  return Object.freeze({
    assetId: input.assetId,
    kind: input.usage === characterUsageV1 ? "character" : "background",
    usage: input.usage ?? sceneUsageV1,
    overridePolicy: "replaceable",
    fallbackToken: input.fallbackToken ?? `fallback.${input.assetId}`,
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

function manifestV1(assets: readonly ResolvedAssetEntryV1[]): ResolvedAssetManifestV1 {
  const providerIdentity = Object.freeze({
    id: "assets.e2e",
    revision: parsePositiveSafeInteger(1),
    digest: digestV1("provider"),
  });
  const slots = assets.map((entry) =>
    Object.freeze({
      assetId: entry.assetId,
      kind: entry.kind,
      usage: entry.usage,
      overridePolicy: entry.overridePolicy,
      fallbackToken: entry.fallbackToken,
      width: entry.width,
      height: entry.height,
      loadGroup: entry.loadGroup,
      safeArea: entry.safeArea,
      pivot: entry.pivot,
    }),
  );

  return Object.freeze({
    packs: Object.freeze([providerIdentity]),
    slots: Object.freeze(slots),
    assets: Object.freeze([...assets]),
  });
}

function cacheKeyV1(request: RuntimeAssetLoadRequestV1): string {
  return `${request.runtimePath}#${request.sha256}`;
}

function fakeLoaderV1(
  settlements: ReadonlyMap<string, LoaderSettlementV1>,
): RuntimeAssetLoaderV1 & {
  readonly calls: string[];
  readonly signals: AbortSignal[];
  readonly dispose: ReturnType<typeof vi.fn>;
} {
  const calls: string[] = [];
  const signals: AbortSignal[] = [];
  const dispose = vi.fn();

  return Object.freeze({
    calls,
    signals,
    cacheKey: cacheKeyV1,
    load(request: RuntimeAssetLoadRequestV1, signal: AbortSignal) {
      const key = cacheKeyV1(request);
      calls.push(key);
      signals.push(signal);
      const settlement = settlements.get(key);
      if (settlement === undefined) {
        return Promise.resolve({ kind: "failed" as const, code: "fetch_failed" as const });
      }
      return Promise.resolve(settlement);
    },
    dispose,
  });
}

function deferredV1<TValue>(): {
  readonly promise: Promise<TValue>;
  readonly resolve: (value: TValue) => void;
} {
  let resolve!: (value: TValue) => void;
  const promise = new Promise<TValue>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return Object.freeze({ promise, resolve });
}

describe("AssetRegistryV1", () => {
  it("rejects duplicate resolved asset IDs at construction", () => {
    const duplicateId = assetId("asset.e2e.duplicate");
    const first = runtimeAssetV1({
      assetId: duplicateId,
      runtimePath: "assets/duplicate-first.webp",
    });
    const second = runtimeAssetV1({
      assetId: duplicateId,
      runtimePath: "assets/duplicate-second.webp",
    });
    const single = manifestV1([first]);
    const duplicateManifest = Object.freeze({
      ...single,
      assets: Object.freeze([first, second]),
    });

    expect(() =>
      createAssetRegistryV1(duplicateManifest, fakeLoaderV1(new Map()), vi.fn()),
    ).toThrow("asset.registry_duplicate_id");
  });

  it("loads only exact demanded IDs in first-occurrence order", async () => {
    const firstId = assetId("asset.e2e.first");
    const secondId = assetId("asset.e2e.second");
    const filteredId = assetId("asset.e2e.filtered");
    const first = runtimeAssetV1({ assetId: firstId, runtimePath: "assets/first.webp" });
    const second = runtimeAssetV1({ assetId: secondId, runtimePath: "assets/second.webp" });
    const filtered = runtimeAssetV1({
      assetId: filteredId,
      runtimePath: "assets/filtered.webp",
    });
    const loader = fakeLoaderV1(
      new Map([
        [
          `${second.runtimePath}#${second.sha256}`,
          { kind: "loaded" as const, url: "/assets/second.webp" },
        ],
        [
          `${first.runtimePath}#${first.sha256}`,
          { kind: "loaded" as const, url: "/assets/first.webp" },
        ],
      ]),
    );
    const registry = createAssetRegistryV1(manifestV1([first, second, filtered]), loader, vi.fn());

    await expect(
      registry.preload([secondId, firstId, secondId], neverAbortedSignal),
    ).resolves.toEqual([
      { assetId: secondId, status: "loaded" },
      { assetId: firstId, status: "loaded" },
    ]);
    expect(loader.calls).toEqual([
      `${second.runtimePath}#${second.sha256}`,
      `${first.runtimePath}#${first.sha256}`,
    ]);
    expect(loader.calls.join("\n")).not.toContain("filtered");
  });

  it("keeps a code fallback demand free of I/O and readiness publications", async () => {
    const fallbackId = assetId("asset.e2e.code-fallback");
    const fallback = codeFallbackAssetV1({
      assetId: fallbackId,
      fallbackToken: "fallback.e2e.code-fallback",
    });
    const loader = fakeLoaderV1(new Map());
    const registry = createAssetRegistryV1(manifestV1([fallback]), loader, vi.fn());
    const initialPublication = registry.observe();
    const listener = vi.fn();
    registry.subscribe(listener);

    await expect(registry.preload([fallbackId, fallbackId], neverAbortedSignal)).resolves.toEqual([
      { assetId: fallbackId, status: "fallback", faultCode: null },
    ]);
    expect(loader.calls).toEqual([]);
    expect(registry.observe()).toBe(initialPublication);
    expect(listener).not.toHaveBeenCalled();
    expect(registry.resolve(fallbackId, sceneUsageV1)).toEqual({
      delivery: "code_fallback",
      assetId: fallbackId,
      usage: sceneUsageV1,
      fallbackToken: "fallback.e2e.code-fallback",
    });
  });

  it("deduplicates a final URL and digest while mapping readiness to every ID", async () => {
    const firstId = assetId("asset.e2e.scene-a");
    const secondId = assetId("asset.e2e.scene-b");
    const sharedDigest = digestV1("shared");
    const first = runtimeAssetV1({
      assetId: firstId,
      runtimePath: "assets/shared.webp",
      sha256: sharedDigest,
    });
    const second = runtimeAssetV1({
      assetId: secondId,
      runtimePath: "assets/shared.webp",
      sha256: sharedDigest,
    });
    const key = `${first.runtimePath}#${sharedDigest}`;
    const loader = fakeLoaderV1(
      new Map([[key, { kind: "loaded" as const, url: "/assets/shared.webp" }]]),
    );
    const registry = createAssetRegistryV1(manifestV1([first, second]), loader, vi.fn());

    await expect(registry.preload([firstId, secondId], neverAbortedSignal)).resolves.toEqual([
      { assetId: firstId, status: "loaded" },
      { assetId: secondId, status: "loaded" },
    ]);
    expect(loader.calls).toEqual([key]);
    expect(registry.resolve(firstId, sceneUsageV1)).toMatchObject({
      delivery: "runtime_image",
      assetId: firstId,
      url: "/assets/shared.webp",
    });
    expect(registry.resolve(secondId, sceneUsageV1)).toMatchObject({
      delivery: "runtime_image",
      assetId: secondId,
      url: "/assets/shared.webp",
    });
  });

  it("atomically publishes every ID sharing one settled load in a single revision", async () => {
    const firstId = assetId("asset.e2e.atomic-a");
    const secondId = assetId("asset.e2e.atomic-b");
    const sharedDigest = digestV1("atomic-shared");
    const first = runtimeAssetV1({
      assetId: firstId,
      runtimePath: "assets/atomic-shared.webp",
      sha256: sharedDigest,
    });
    const second = runtimeAssetV1({
      assetId: secondId,
      runtimePath: "assets/atomic-shared.webp",
      sha256: sharedDigest,
    });
    const settlement = deferredV1<LoaderSettlementV1>();
    const calls: string[] = [];
    const loader = Object.freeze({
      cacheKey: cacheKeyV1,
      load(request: RuntimeAssetLoadRequestV1) {
        calls.push(cacheKeyV1(request));
        return settlement.promise;
      },
      dispose: vi.fn(),
    }) satisfies RuntimeAssetLoaderV1;
    const registry = createAssetRegistryV1(manifestV1([first, second]), loader, vi.fn());
    const initialPublication = registry.observe();
    const seenPublications: unknown[] = [];
    const seenDeliveries: string[][] = [];
    const listener = vi.fn(() => {
      seenPublications.push(registry.observe());
      seenDeliveries.push([
        registry.resolve(firstId, sceneUsageV1).delivery,
        registry.resolve(secondId, sceneUsageV1).delivery,
      ]);
    });
    registry.subscribe(listener);

    const preload = registry.preload([firstId, secondId], neverAbortedSignal);
    await Promise.resolve();
    settlement.resolve({ kind: "loaded", url: "/assets/atomic-shared.webp" });
    await expect(preload).resolves.toEqual([
      { assetId: firstId, status: "loaded" },
      { assetId: secondId, status: "loaded" },
    ]);

    const settledPublication = registry.observe();
    expect(calls).toHaveLength(1);
    expect(settledPublication).not.toBe(initialPublication);
    expect(settledPublication.revision).toBe(initialPublication.revision + 1);
    expect(registry.observe()).toBe(settledPublication);
    expect(listener).toHaveBeenCalledOnce();
    expect(seenPublications).toEqual([settledPublication]);
    expect(seenDeliveries).toEqual([["runtime_image", "runtime_image"]]);
  });

  it("isolates a throwing subscriber after committing shared readiness", async () => {
    const firstId = assetId("asset.e2e.subscriber-a");
    const secondId = assetId("asset.e2e.subscriber-b");
    const sharedDigest = digestV1("subscriber-shared");
    const first = runtimeAssetV1({
      assetId: firstId,
      runtimePath: "assets/subscriber-shared.webp",
      sha256: sharedDigest,
    });
    const second = runtimeAssetV1({
      assetId: secondId,
      runtimePath: "assets/subscriber-shared.webp",
      sha256: sharedDigest,
    });
    const settlement = deferredV1<LoaderSettlementV1>();
    const loader = Object.freeze({
      cacheKey: cacheKeyV1,
      load() {
        return settlement.promise;
      },
      dispose: vi.fn(),
    }) satisfies RuntimeAssetLoaderV1;
    const diagnostics = vi.fn();
    const registry = createAssetRegistryV1(manifestV1([first, second]), loader, diagnostics);
    const initialRevision = registry.observe().revision;
    const throwingListener = vi.fn(() => {
      throw new Error("subscriber unavailable");
    });
    const healthyDeliveries: string[][] = [];
    const healthyListener = vi.fn(() => {
      healthyDeliveries.push([
        registry.resolve(firstId, sceneUsageV1).delivery,
        registry.resolve(secondId, sceneUsageV1).delivery,
      ]);
    });
    registry.subscribe(throwingListener);
    registry.subscribe(healthyListener);

    const preload = registry.preload([firstId, secondId], neverAbortedSignal);
    settlement.resolve({ kind: "loaded", url: "/assets/subscriber-shared.webp" });

    await expect(preload).resolves.toEqual([
      { assetId: firstId, status: "loaded" },
      { assetId: secondId, status: "loaded" },
    ]);
    expect(registry.observe().revision).toBe(initialRevision + 1);
    expect(throwingListener).toHaveBeenCalledOnce();
    expect(healthyListener).toHaveBeenCalledOnce();
    expect(healthyDeliveries).toEqual([["runtime_image", "runtime_image"]]);
    expect(registry.resolve(firstId, sceneUsageV1).delivery).toBe("runtime_image");
    expect(registry.resolve(secondId, sceneUsageV1).delivery).toBe("runtime_image");
  });

  it("isolates an item failure and keeps the rest of the demand usable", async () => {
    const failedId = assetId("asset.e2e.failed");
    const loadedId = assetId("asset.e2e.loaded");
    const failed = runtimeAssetV1({ assetId: failedId, runtimePath: "assets/failed.webp" });
    const loaded = runtimeAssetV1({ assetId: loadedId, runtimePath: "assets/loaded.webp" });
    const loader = fakeLoaderV1(
      new Map([
        [
          `${failed.runtimePath}#${failed.sha256}`,
          { kind: "failed" as const, code: "decode_failed" as const },
        ],
        [
          `${loaded.runtimePath}#${loaded.sha256}`,
          { kind: "loaded" as const, url: "/assets/loaded.webp" },
        ],
      ]),
    );
    const registry = createAssetRegistryV1(manifestV1([failed, loaded]), loader, vi.fn());

    await expect(registry.preload([failedId, loadedId], neverAbortedSignal)).resolves.toEqual([
      { assetId: failedId, status: "fallback", faultCode: "asset.decode_failed" },
      { assetId: loadedId, status: "loaded" },
    ]);
    expect(registry.resolve(failedId, sceneUsageV1)).toMatchObject({
      delivery: "code_fallback",
      assetId: failedId,
    });
    expect(registry.resolve(loadedId, sceneUsageV1)).toMatchObject({
      delivery: "runtime_image",
      assetId: loadedId,
      url: "/assets/loaded.webp",
    });
  });

  it("rejects an unknown ID before starting any I/O", async () => {
    const knownId = assetId("asset.e2e.known");
    const unknownId = assetId("asset.e2e.unknown");
    const known = runtimeAssetV1({ assetId: knownId, runtimePath: "assets/known.webp" });
    const loader = fakeLoaderV1(new Map());
    const registry = createAssetRegistryV1(manifestV1([known]), loader, vi.fn());

    await expect(registry.preload([knownId, unknownId], neverAbortedSignal)).rejects.toThrow(
      "asset.registry_unknown_id",
    );
    expect(loader.calls).toEqual([]);
  });

  it("does not start I/O for an already-aborted caller", async () => {
    const demandedId = assetId("asset.e2e.aborted-before-start");
    const demanded = runtimeAssetV1({
      assetId: demandedId,
      runtimePath: "assets/aborted-before-start.webp",
    });
    const loader = fakeLoaderV1(new Map());
    const registry = createAssetRegistryV1(manifestV1([demanded]), loader, vi.fn());
    const caller = new AbortController();
    caller.abort();

    await expect(registry.preload([demandedId], caller.signal)).resolves.toEqual([
      { assetId: demandedId, status: "aborted" },
    ]);
    expect(loader.calls).toEqual([]);
  });

  it("lets one caller abort without cancelling a shared load", async () => {
    const demandedId = assetId("asset.e2e.shared-abort");
    const demanded = runtimeAssetV1({
      assetId: demandedId,
      runtimePath: "assets/shared-abort.webp",
    });
    const settlement = deferredV1<LoaderSettlementV1>();
    const calls: string[] = [];
    const signals: AbortSignal[] = [];
    const dispose = vi.fn();
    const loader = Object.freeze({
      calls,
      signals,
      cacheKey: cacheKeyV1,
      load(request: RuntimeAssetLoadRequestV1, signal: AbortSignal) {
        calls.push(cacheKeyV1(request));
        signals.push(signal);
        return settlement.promise;
      },
      dispose,
    }) satisfies RuntimeAssetLoaderV1 & {
      readonly calls: string[];
      readonly signals: AbortSignal[];
    };
    const registry = createAssetRegistryV1(manifestV1([demanded]), loader, vi.fn());
    const firstCaller = new AbortController();

    const firstPreload = registry.preload([demandedId], firstCaller.signal);
    const secondPreload = registry.preload([demandedId], neverAbortedSignal);
    await Promise.resolve();
    firstCaller.abort();

    await expect(firstPreload).resolves.toEqual([{ assetId: demandedId, status: "aborted" }]);
    expect(loader.calls).toHaveLength(1);
    expect(loader.signals[0]?.aborted).toBe(false);

    settlement.resolve({ kind: "loaded", url: "/assets/shared-abort.webp" });
    await expect(secondPreload).resolves.toEqual([{ assetId: demandedId, status: "loaded" }]);
    expect(registry.resolve(demandedId, sceneUsageV1)).toMatchObject({
      delivery: "runtime_image",
      url: "/assets/shared-abort.webp",
    });
  });

  it("deduplicates one diagnostic for a shared failure in the same load cycle", async () => {
    const firstId = assetId("asset.e2e.failed-a");
    const secondId = assetId("asset.e2e.failed-b");
    const sharedDigest = digestV1("shared-failure");
    const first = runtimeAssetV1({
      assetId: firstId,
      runtimePath: "assets/shared-failure.webp",
      sha256: sharedDigest,
    });
    const second = runtimeAssetV1({
      assetId: secondId,
      runtimePath: "assets/shared-failure.webp",
      sha256: sharedDigest,
    });
    const key = `${first.runtimePath}#${sharedDigest}`;
    const loader = fakeLoaderV1(
      new Map([[key, { kind: "failed" as const, code: "decode_failed" as const }]]),
    );
    const diagnostics = vi.fn(() => {
      throw new Error("diagnostic sink unavailable");
    });
    const registry = createAssetRegistryV1(manifestV1([first, second]), loader, diagnostics);

    await expect(registry.preload([firstId, secondId], neverAbortedSignal)).resolves.toEqual([
      { assetId: firstId, status: "fallback", faultCode: "asset.decode_failed" },
      { assetId: secondId, status: "fallback", faultCode: "asset.decode_failed" },
    ]);
    await expect(registry.preload([secondId], neverAbortedSignal)).resolves.toEqual([
      { assetId: secondId, status: "fallback", faultCode: "asset.decode_failed" },
    ]);
    expect(loader.calls).toEqual([key]);
    expect(diagnostics).toHaveBeenCalledTimes(1);
    expect(diagnostics).toHaveBeenCalledWith(
      expect.objectContaining({
        finalUrl: "assets/shared-failure.webp",
        digest: sharedDigest,
        faultCode: "asset.decode_failed",
        loadCycle: 1,
      }),
    );
  });

  it("uses the validated fallback before readiness and for a usage mismatch", async () => {
    const demandedId = assetId("asset.e2e.usage");
    const demanded = runtimeAssetV1({
      assetId: demandedId,
      runtimePath: "assets/usage.webp",
      fallbackToken: "fallback.usage",
    });
    const key = `${demanded.runtimePath}#${demanded.sha256}`;
    const loader = fakeLoaderV1(
      new Map([[key, { kind: "loaded" as const, url: "/assets/usage.webp" }]]),
    );
    const diagnostics = vi.fn();
    const registry = createAssetRegistryV1(manifestV1([demanded]), loader, diagnostics);

    expect(registry.resolve(demandedId, sceneUsageV1)).toEqual({
      delivery: "code_fallback",
      assetId: demandedId,
      usage: sceneUsageV1,
      fallbackToken: "fallback.usage",
    });
    await registry.preload([demandedId], neverAbortedSignal);
    expect(registry.resolve(demandedId, sceneUsageV1)).toMatchObject({
      delivery: "runtime_image",
      url: "/assets/usage.webp",
    });
    expect(registry.resolve(demandedId, characterUsageV1)).toEqual({
      delivery: "code_fallback",
      assetId: demandedId,
      usage: characterUsageV1,
      fallbackToken: "fallback.usage",
    });
    expect(diagnostics).toHaveBeenCalledWith(
      expect.objectContaining({
        finalUrl: "assets/usage.webp",
        digest: demanded.sha256,
        faultCode: "asset.usage_mismatch",
      }),
    );
  });

  it("dispose aborts owned work, clears listeners, and closes the loader once", async () => {
    const demandedId = assetId("asset.e2e.disposed");
    const demanded = runtimeAssetV1({
      assetId: demandedId,
      runtimePath: "assets/disposed.webp",
    });
    const calls: string[] = [];
    const signals: AbortSignal[] = [];
    const dispose = vi.fn();
    const loader = Object.freeze({
      calls,
      signals,
      cacheKey: cacheKeyV1,
      load(request: RuntimeAssetLoadRequestV1, signal: AbortSignal) {
        calls.push(cacheKeyV1(request));
        signals.push(signal);
        return new Promise<LoaderSettlementV1>((resolve) => {
          signal.addEventListener(
            "abort",
            () => resolve(Object.freeze({ kind: "aborted" as const })),
            { once: true },
          );
        });
      },
      dispose,
    }) satisfies RuntimeAssetLoaderV1 & {
      readonly calls: string[];
      readonly signals: AbortSignal[];
    };
    const registry = createAssetRegistryV1(manifestV1([demanded]), loader, vi.fn());
    const listener = vi.fn();
    registry.subscribe(listener);

    const preload = registry.preload([demandedId], neverAbortedSignal);
    await Promise.resolve();
    registry.dispose();
    registry.dispose();

    expect(loader.calls).toHaveLength(1);
    expect(loader.signals[0]?.aborted).toBe(true);
    expect(loader.dispose).toHaveBeenCalledOnce();
    await expect(preload).resolves.toEqual([{ assetId: demandedId, status: "aborted" }]);
    expect(listener).not.toHaveBeenCalled();
    await expect(registry.preload([demandedId], neverAbortedSignal)).rejects.toThrow(
      "asset.registry_disposed",
    );
  });
});
