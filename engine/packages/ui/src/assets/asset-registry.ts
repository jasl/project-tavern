// SPDX-License-Identifier: MIT
import {
  parseNonNegativeSafeInteger,
  type AssetId,
  type DeepReadonly,
  type Digest,
  type NonNegativeSafeInteger,
  type PositiveSafeInteger,
  type ResolvedAssetManifestV1,
  type ResolvedAssetPresentationV1,
} from "@sillymaker/base";

type AssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];

export type AssetLoadFaultCodeV1 =
  "asset.fetch_failed" | "asset.decode_failed" | "asset.usage_mismatch";

export type AssetLoadResultV1<TAssetId> =
  | { readonly assetId: TAssetId; readonly status: "loaded" }
  | {
      readonly assetId: TAssetId;
      readonly status: "fallback";
      readonly faultCode: AssetLoadFaultCodeV1 | null;
    }
  | { readonly assetId: TAssetId; readonly status: "aborted" };

export interface RuntimeAssetLoadRequestV1 {
  readonly runtimePath: string;
  readonly mediaType: "image/webp" | "image/png" | "image/svg+xml";
  readonly sha256: Digest;
  readonly width: PositiveSafeInteger;
  readonly height: PositiveSafeInteger;
}

export type RuntimeAssetLoaderSettlementV1 =
  | { readonly kind: "loaded"; readonly url: string }
  | { readonly kind: "failed"; readonly code: "fetch_failed" | "decode_failed" }
  | { readonly kind: "aborted" };

export interface RuntimeAssetLoaderV1 {
  cacheKey(request: DeepReadonly<RuntimeAssetLoadRequestV1>): string;
  load(
    request: DeepReadonly<RuntimeAssetLoadRequestV1>,
    signal: AbortSignal,
  ): Promise<RuntimeAssetLoaderSettlementV1>;
  dispose(): void;
}

export interface AssetRegistryPublicationV1 {
  readonly revision: NonNegativeSafeInteger;
}

export interface AssetRegistryDiagnosticV1 {
  readonly finalUrl: string;
  readonly digest: Digest;
  readonly faultCode: AssetLoadFaultCodeV1;
  readonly loadCycle: NonNegativeSafeInteger;
}

export type AssetRegistryDiagnosticSinkV1 = (
  diagnostic: DeepReadonly<AssetRegistryDiagnosticV1>,
) => void;

export interface AssetRegistryV1<TAssetId, TAssetUsage, TFallbackToken> {
  observe(): DeepReadonly<AssetRegistryPublicationV1>;
  subscribe(listener: () => void): () => void;
  preload(
    assetIds: readonly TAssetId[],
    signal: AbortSignal,
  ): Promise<readonly AssetLoadResultV1<TAssetId>[]>;
  resolve(
    assetId: TAssetId,
    usage: TAssetUsage,
  ): ResolvedAssetPresentationV1<TAssetId, TAssetUsage, TFallbackToken>;
  dispose(): void;
}

type RuntimeLoadFaultCodeV1 = Extract<
  AssetLoadFaultCodeV1,
  "asset.fetch_failed" | "asset.decode_failed"
>;

type RuntimeAssetStateV1 =
  | { readonly kind: "unloaded" }
  | { readonly kind: "loaded"; readonly url: string }
  | { readonly kind: "failed"; readonly faultCode: RuntimeLoadFaultCodeV1 }
  | { readonly kind: "aborted" };

interface RegistryAssetRecordV1 {
  readonly assetId: string;
  readonly usage: AssetUsageV1;
  readonly fallbackToken: string;
  readonly width: PositiveSafeInteger;
  readonly height: PositiveSafeInteger;
  readonly runtime: {
    readonly request: DeepReadonly<RuntimeAssetLoadRequestV1>;
    readonly cacheKey: string;
    readonly finalUrl: string;
  } | null;
}

interface SharedRuntimeLoadV1 {
  readonly controller: AbortController;
  readonly loadCycle: NonNegativeSafeInteger;
  readonly promise: Promise<RuntimeAssetLoaderSettlementV1>;
}

const unloadedStateV1 = Object.freeze({ kind: "unloaded" as const });
const abortedStateV1 = Object.freeze({ kind: "aborted" as const });
const callerAbortedV1 = Symbol("asset.registry_caller_aborted");

function registryFailureV1(
  code: "asset.registry_duplicate_id" | "asset.registry_unknown_id" | "asset.registry_disposed",
): TypeError {
  return new TypeError(code);
}

function finalUrlFromCacheKeyV1(cacheKey: string, digest: Digest): string {
  const suffix = `#${digest}`;
  return cacheKey.endsWith(suffix) ? cacheKey.slice(0, -suffix.length) : cacheKey;
}

function normalizeLoaderSettlementV1(value: unknown): RuntimeAssetLoaderSettlementV1 {
  if (typeof value !== "object" || value === null) {
    return Object.freeze({ kind: "failed", code: "fetch_failed" });
  }
  const candidate = value as {
    readonly kind?: unknown;
    readonly url?: unknown;
    readonly code?: unknown;
  };
  if (
    candidate.kind === "loaded" &&
    typeof candidate.url === "string" &&
    candidate.url.length > 0
  ) {
    return Object.freeze({ kind: "loaded", url: candidate.url });
  }
  if (
    candidate.kind === "failed" &&
    (candidate.code === "fetch_failed" || candidate.code === "decode_failed")
  ) {
    return Object.freeze({ kind: "failed", code: candidate.code });
  }
  if (candidate.kind === "aborted") return Object.freeze({ kind: "aborted" });
  return Object.freeze({ kind: "failed", code: "fetch_failed" });
}

function uniqueAssetIdsV1<TAssetId>(assetIds: readonly TAssetId[]): readonly TAssetId[] {
  const seen = new Set<TAssetId>();
  const unique: TAssetId[] = [];
  for (const assetId of assetIds) {
    if (seen.has(assetId)) continue;
    seen.add(assetId);
    unique.push(assetId);
  }
  return Object.freeze(unique);
}

function frozenLoadResultV1<TAssetId>(
  assetId: TAssetId,
  settlement: RuntimeAssetLoaderSettlementV1,
): AssetLoadResultV1<TAssetId> {
  switch (settlement.kind) {
    case "loaded":
      return Object.freeze({ assetId, status: "loaded" });
    case "failed":
      return Object.freeze({
        assetId,
        status: "fallback",
        faultCode: `asset.${settlement.code}` as RuntimeLoadFaultCodeV1,
      });
    case "aborted":
      return Object.freeze({ assetId, status: "aborted" });
    default:
      throw new TypeError("asset.registry_invalid_loader_settlement");
  }
}

/**
 * Waits for registry-owned work while allowing one caller to stop waiting without
 * forwarding that caller's AbortSignal to the shared loader.
 */
function waitForSharedLoadV1(
  promise: Promise<RuntimeAssetLoaderSettlementV1>,
  signal: AbortSignal,
): Promise<RuntimeAssetLoaderSettlementV1 | typeof callerAbortedV1> {
  if (signal.aborted) return Promise.resolve(callerAbortedV1);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: RuntimeAssetLoaderSettlementV1 | typeof callerAbortedV1): void => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      resolve(value);
    };
    const onAbort = (): void => finish(callerAbortedV1);

    signal.addEventListener("abort", onAbort, { once: true });
    void promise.then((value) => finish(value));
  });
}

/** Creates the exact-demand, registry-lifetime runtime asset cache. */
export function createAssetRegistryV1<
  TAssetId extends string = AssetId,
  TAssetUsage extends AssetUsageV1 = AssetUsageV1,
  TFallbackToken extends string = string,
>(
  manifest: DeepReadonly<ResolvedAssetManifestV1>,
  loader: RuntimeAssetLoaderV1,
  reportDiagnostic: AssetRegistryDiagnosticSinkV1,
): AssetRegistryV1<TAssetId, TAssetUsage, TFallbackToken> {
  const recordsById = new Map<string, RegistryAssetRecordV1>();

  for (const entry of manifest.assets) {
    if (recordsById.has(entry.assetId)) {
      throw registryFailureV1("asset.registry_duplicate_id");
    }
    recordsById.set(
      entry.assetId,
      Object.freeze({
        assetId: entry.assetId,
        usage: entry.usage,
        fallbackToken: entry.fallbackToken,
        width: entry.width,
        height: entry.height,
        runtime: null,
      }),
    );
  }

  const recordsByCacheKey = new Map<string, RegistryAssetRecordV1[]>();
  for (const entry of manifest.assets) {
    if (entry.delivery !== "runtime_image") continue;
    const request = Object.freeze({
      runtimePath: entry.runtimePath,
      mediaType: entry.mediaType,
      sha256: entry.sha256,
      width: entry.width,
      height: entry.height,
    });
    const cacheKey = loader.cacheKey(request);
    const record = Object.freeze({
      assetId: entry.assetId,
      usage: entry.usage,
      fallbackToken: entry.fallbackToken,
      width: entry.width,
      height: entry.height,
      runtime: Object.freeze({
        request,
        cacheKey,
        finalUrl: finalUrlFromCacheKeyV1(cacheKey, entry.sha256),
      }),
    });
    recordsById.set(entry.assetId, record);
    const sharedRecords = recordsByCacheKey.get(cacheKey);
    if (sharedRecords === undefined) recordsByCacheKey.set(cacheKey, [record]);
    else sharedRecords.push(record);
  }

  const statesById = new Map<string, RuntimeAssetStateV1>();
  for (const record of recordsById.values()) {
    if (record.runtime !== null) statesById.set(record.assetId, unloadedStateV1);
  }

  const sharedLoads = new Map<string, SharedRuntimeLoadV1>();
  const reportedDiagnostics = new Set<string>();
  const listeners = new Set<() => void>();
  let disposed = false;
  let publication: DeepReadonly<AssetRegistryPublicationV1> = Object.freeze({
    revision: parseNonNegativeSafeInteger(0),
  });

  const emitDiagnosticV1 = (
    record: RegistryAssetRecordV1,
    faultCode: AssetLoadFaultCodeV1,
    loadCycle: NonNegativeSafeInteger,
  ): void => {
    if (record.runtime === null) return;
    const identity = JSON.stringify([
      record.runtime.finalUrl,
      record.runtime.request.sha256,
      faultCode,
      loadCycle,
    ]);
    if (reportedDiagnostics.has(identity)) return;
    reportedDiagnostics.add(identity);
    try {
      reportDiagnostic(
        Object.freeze({
          finalUrl: record.runtime.finalUrl,
          digest: record.runtime.request.sha256,
          faultCode,
          loadCycle,
        }),
      );
    } catch {
      // Diagnostic reporting is non-authoritative and cannot interrupt registry work.
    }
  };

  const publishSharedSettlementV1 = (
    cacheKey: string,
    settlement: RuntimeAssetLoaderSettlementV1,
    loadCycle: NonNegativeSafeInteger,
  ): void => {
    const sharedRecords = recordsByCacheKey.get(cacheKey) ?? [];
    let state: RuntimeAssetStateV1;
    switch (settlement.kind) {
      case "loaded":
        state = Object.freeze({ kind: "loaded", url: settlement.url });
        break;
      case "failed":
        state = Object.freeze({
          kind: "failed",
          faultCode: `asset.${settlement.code}` as RuntimeLoadFaultCodeV1,
        });
        break;
      case "aborted":
        state = abortedStateV1;
        break;
    }

    for (const record of sharedRecords) statesById.set(record.assetId, state);

    publication = Object.freeze({
      revision: parseNonNegativeSafeInteger(publication.revision + 1),
    });

    if (settlement.kind === "failed") {
      const first = sharedRecords[0];
      if (first !== undefined) {
        emitDiagnosticV1(first, `asset.${settlement.code}` as RuntimeLoadFaultCodeV1, loadCycle);
      }
    }

    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // Subscribers are isolated after the immutable publication is committed.
      }
    }
  };

  const startSharedLoadV1 = (record: RegistryAssetRecordV1): SharedRuntimeLoadV1 => {
    const runtime = record.runtime;
    if (runtime === null) throw new TypeError("asset.registry_internal_fallback_load");
    const existing = sharedLoads.get(runtime.cacheKey);
    if (existing !== undefined) return existing;

    const controller = new AbortController();
    const loadCycle = parseNonNegativeSafeInteger(1);
    let requested: Promise<RuntimeAssetLoaderSettlementV1>;
    try {
      requested = loader.load(runtime.request, controller.signal);
    } catch {
      requested = Promise.resolve(Object.freeze({ kind: "failed", code: "fetch_failed" }));
    }
    const promise = requested
      .then(normalizeLoaderSettlementV1)
      .catch((): RuntimeAssetLoaderSettlementV1 =>
        Object.freeze({ kind: "failed", code: "fetch_failed" }),
      )
      .then((settlement) => {
        publishSharedSettlementV1(runtime.cacheKey, settlement, loadCycle);
        return settlement;
      });
    const shared = Object.freeze({ controller, loadCycle, promise });
    sharedLoads.set(runtime.cacheKey, shared);
    return shared;
  };

  const loadForCallerV1 = async (
    assetId: TAssetId,
    record: RegistryAssetRecordV1,
    signal: AbortSignal,
  ): Promise<AssetLoadResultV1<TAssetId>> => {
    if (record.runtime === null) {
      return Object.freeze({ assetId, status: "fallback", faultCode: null });
    }
    const shared = startSharedLoadV1(record);
    const settlement = await waitForSharedLoadV1(shared.promise, signal);
    if (settlement === callerAbortedV1) return Object.freeze({ assetId, status: "aborted" });
    return frozenLoadResultV1(assetId, settlement);
  };

  const registry: AssetRegistryV1<TAssetId, TAssetUsage, TFallbackToken> = Object.freeze({
    observe: () => publication,

    subscribe(listener: () => void) {
      if (disposed) throw registryFailureV1("asset.registry_disposed");
      listeners.add(listener);
      let subscribed = true;
      return (): void => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },

    async preload(
      assetIds: readonly TAssetId[],
      signal: AbortSignal,
    ): Promise<readonly AssetLoadResultV1<TAssetId>[]> {
      if (disposed) throw registryFailureV1("asset.registry_disposed");
      const uniqueIds = uniqueAssetIdsV1(assetIds);
      const records = uniqueIds.map((requestedId) => {
        const record = recordsById.get(requestedId);
        if (record === undefined) throw registryFailureV1("asset.registry_unknown_id");
        return Object.freeze({ requestedId, record });
      });
      if (signal.aborted) {
        return Object.freeze(
          records.map(({ requestedId }) =>
            Object.freeze({ assetId: requestedId, status: "aborted" as const }),
          ),
        );
      }
      const results = await Promise.all(
        records.map(({ requestedId, record }) => loadForCallerV1(requestedId, record, signal)),
      );
      return Object.freeze(results);
    },

    resolve(assetId: TAssetId, usage: TAssetUsage) {
      const record = recordsById.get(assetId);
      if (record === undefined) throw registryFailureV1("asset.registry_unknown_id");

      if (usage !== record.usage) {
        if (record.runtime !== null) {
          const cycle =
            sharedLoads.get(record.runtime.cacheKey)?.loadCycle ?? parseNonNegativeSafeInteger(0);
          emitDiagnosticV1(record, "asset.usage_mismatch", cycle);
        }
        return Object.freeze({
          delivery: "code_fallback" as const,
          assetId,
          usage,
          fallbackToken: record.fallbackToken as TFallbackToken,
        });
      }

      const state = statesById.get(record.assetId) ?? unloadedStateV1;
      if (record.runtime !== null && state.kind === "loaded") {
        return Object.freeze({
          delivery: "runtime_image" as const,
          assetId,
          usage,
          url: state.url,
          width: record.width,
          height: record.height,
          fallbackToken: record.fallbackToken as TFallbackToken,
        });
      }
      return Object.freeze({
        delivery: "code_fallback" as const,
        assetId,
        usage,
        fallbackToken: record.fallbackToken as TFallbackToken,
      });
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      for (const shared of sharedLoads.values()) shared.controller.abort();
      try {
        loader.dispose();
      } catch {
        // Disposal remains idempotent even when a Host adapter reports failure.
      }
    },
  });

  return registry;
}
