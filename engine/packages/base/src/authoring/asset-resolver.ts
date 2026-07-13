// SPDX-License-Identifier: MIT
import type {
  AssetPackDigestProjectionV1,
  AssetPackResolvedIdentityV1,
  AssetPackV1,
  AssetProviderEntryV1,
  AssetProviderRefV1,
  AssetSlotDefinitionV1,
  ResolvedAssetEntryV1,
  ResolvedAssetManifestV1,
} from "../contracts/assets.js";
import type { AssetHotfixReplacementV1 } from "./hotfix-resolver.js";
import { digestCanonical } from "../contracts/digest.js";
import { parseDigest, parsePositiveSafeInteger } from "../contracts/values.js";
import { deepFreezeAuthoringValueV1 } from "./define-gameplay-module.js";

function validateRuntimePath(path: string): void {
  const segments = path.split("/");
  if (
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("?") ||
    path.includes("#") ||
    path.includes("\0") ||
    segments.some((segment) => segment === "" || segment === "." || segment === "..") ||
    segments[0] === "art-source" ||
    segments[0] === "references"
  ) {
    throw new TypeError("asset path invalid");
  }
}

function fallback(slot: AssetSlotDefinitionV1): ResolvedAssetEntryV1 {
  return Object.freeze({
    ...slot,
    delivery: "code_fallback" as const,
    provider: null,
    overrideChain: Object.freeze([]),
  });
}

export function resolveAssetManifestV1(
  authoredSlots: readonly AssetSlotDefinitionV1[],
  authoredPacks: readonly AssetPackV1[],
  assetHotfixes: readonly AssetHotfixReplacementV1[] = [],
): ResolvedAssetManifestV1 {
  const slots = authoredSlots.map((slot) => {
    parsePositiveSafeInteger(slot.width);
    parsePositiveSafeInteger(slot.height);
    return deepFreezeAuthoringValueV1({ ...slot });
  });
  if (new Set(slots.map((slot) => slot.assetId)).size !== slots.length) {
    throw new TypeError("duplicate asset slot");
  }
  const slotsById = new Map(slots.map((slot) => [slot.assetId, slot]));
  const resolvedById = new Map(slots.map((slot) => [slot.assetId, fallback(slot)]));
  const packs: AssetPackResolvedIdentityV1[] = [];

  for (const pack of authoredPacks) {
    parsePositiveSafeInteger(pack.identity.revision);
    if (!/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/u.test(pack.identity.id)) {
      throw new TypeError("invalid Asset Pack ID");
    }
    if (
      new Set(pack.providers.map((provider) => provider.assetId)).size !== pack.providers.length
    ) {
      throw new TypeError("duplicate Asset Pack provider");
    }
    for (const provider of pack.providers) {
      validateRuntimePath(provider.runtimePath);
      parsePositiveSafeInteger(provider.byteLength);
      parsePositiveSafeInteger(provider.width);
      parsePositiveSafeInteger(provider.height);
      parseDigest(provider.sha256);
    }
    const projection: AssetPackDigestProjectionV1 = {
      identity: {
        id: pack.identity.id,
        revision: pack.identity.revision,
      },
      providers: pack.providers,
    };
    const identity = Object.freeze({
      ...projection.identity,
      digest: digestCanonical("sillymaker:asset-pack:v1", projection),
    });
    packs.push(identity);
    const providerRef: AssetProviderRefV1 = Object.freeze({
      kind: "asset_pack",
      identity,
    });

    for (const provider of pack.providers) {
      const slot = slotsById.get(provider.assetId);
      if (!slot) throw new TypeError(`asset slot unknown: ${provider.assetId}`);
      if (provider.width !== slot.width || provider.height !== slot.height) {
        throw new TypeError(`asset dimensions mismatch: ${provider.assetId}`);
      }
      const current = resolvedById.get(provider.assetId);
      if (!current) throw new TypeError(`asset slot unknown: ${provider.assetId}`);
      if (current.delivery === "runtime_image" && slot.overridePolicy === "sealed") {
        throw new TypeError(`asset slot sealed: ${provider.assetId}`);
      }
      const chain =
        current.delivery === "runtime_image"
          ? [...current.overrideChain, providerRef]
          : [providerRef];
      resolvedById.set(
        provider.assetId,
        Object.freeze({
          ...slot,
          ...provider,
          delivery: "runtime_image" as const,
          provider: providerRef,
          overrideChain: Object.freeze(chain),
        }),
      );
    }
  }

  const hotfixedAssetIds = new Set<string>();
  for (const hotfix of assetHotfixes) {
    if (hotfixedAssetIds.has(hotfix.assetId)) {
      throw new TypeError(`duplicate asset Hotfix: ${hotfix.assetId}`);
    }
    hotfixedAssetIds.add(hotfix.assetId);
    const slot = slotsById.get(hotfix.assetId);
    if (!slot) throw new TypeError(`asset slot unknown: ${hotfix.assetId}`);
    if (slot.overridePolicy === "sealed") {
      throw new TypeError(`asset slot sealed: ${hotfix.assetId}`);
    }
    if (
      hotfix.provider === null ||
      typeof hotfix.provider !== "object" ||
      Array.isArray(hotfix.provider) ||
      Object.getPrototypeOf(hotfix.provider) !== Object.prototype
    ) {
      throw new TypeError(`invalid asset Hotfix provider: ${hotfix.assetId}`);
    }
    const provider = hotfix.provider as AssetProviderEntryV1;
    if (provider.assetId !== hotfix.assetId) {
      throw new TypeError(`asset Hotfix provider mismatch: ${hotfix.assetId}`);
    }
    validateRuntimePath(provider.runtimePath);
    parsePositiveSafeInteger(provider.byteLength);
    parsePositiveSafeInteger(provider.width);
    parsePositiveSafeInteger(provider.height);
    parseDigest(provider.sha256);
    if (provider.width !== slot.width || provider.height !== slot.height) {
      throw new TypeError(`asset dimensions mismatch: ${hotfix.assetId}`);
    }
    const current = resolvedById.get(hotfix.assetId);
    if (!current) throw new TypeError(`asset slot unknown: ${hotfix.assetId}`);
    const providerRef: AssetProviderRefV1 = Object.freeze({
      kind: "hotfix",
      identity: hotfix.hotfixIdentity,
    });
    resolvedById.set(
      hotfix.assetId,
      Object.freeze({
        ...slot,
        ...provider,
        delivery: "runtime_image" as const,
        provider: providerRef,
        overrideChain: Object.freeze([...current.overrideChain, providerRef]),
      }),
    );
  }

  return deepFreezeAuthoringValueV1({
    packs,
    slots,
    assets: slots.map((slot) => resolvedById.get(slot.assetId) as ResolvedAssetEntryV1),
  });
}
