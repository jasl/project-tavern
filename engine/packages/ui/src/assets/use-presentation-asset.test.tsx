// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import {
  parseAssetId,
  parseLocaleId,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "@sillymaker/base";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePresentationAssetV1 } from "./use-presentation-asset.js";

const assetId = parseAssetId("asset.e2e.deferred");
const usage = "scene_background" as const;

function createDeferredPresentationAssetFixtureV1() {
  const listeners = new Set<() => void>();
  const fallback = Object.freeze({
    delivery: "code_fallback" as const,
    assetId,
    usage,
    fallbackToken: "fallback.e2e.deferred",
  });
  const runtimeImage = Object.freeze({
    delivery: "runtime_image" as const,
    assetId,
    usage,
    url: "/assets/ready.webp",
    width: parsePositiveSafeInteger(1600),
    height: parsePositiveSafeInteger(1000),
    fallbackToken: "fallback.e2e.deferred",
  });
  let result: typeof fallback | typeof runtimeImage = fallback;
  let publication = Object.freeze({ revision: parseNonNegativeSafeInteger(0) });

  const observeAssets = vi.fn(() => publication);
  const subscribeAssets = vi.fn((listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  });
  const asset = vi.fn((requestedAssetId: typeof assetId, requestedUsage: typeof usage) => {
    expect(requestedAssetId).toBe(assetId);
    expect(requestedUsage).toBe(usage);
    return result;
  });

  return {
    fallback,
    runtimeImage,
    observeAssets,
    subscribeAssets,
    asset,
    presentation: Object.freeze({
      locale: parseLocaleId("zh-CN"),
      text: vi.fn(() => {
        throw new TypeError("text is outside this asset-hook fixture");
      }),
      asset,
      observeAssets,
      subscribeAssets,
    }),
    publishReady() {
      result = runtimeImage;
      publication = Object.freeze({ revision: parseNonNegativeSafeInteger(1) });
      for (const listener of listeners) listener();
    },
    listenerCount() {
      return listeners.size;
    },
  };
}

describe("usePresentationAssetV1", () => {
  it("rerenders from code fallback to runtime image through the asset external store", () => {
    const fixture = createDeferredPresentationAssetFixtureV1();
    const beforeSnapshot = fixture.observeAssets();
    expect(fixture.observeAssets()).toBe(beforeSnapshot);

    const rendered = renderHook(() => usePresentationAssetV1(fixture.presentation, assetId, usage));
    expect(rendered.result.current).toBe(fixture.fallback);
    expect(fixture.listenerCount()).toBe(1);

    rendered.rerender();
    expect(rendered.result.current).toBe(fixture.fallback);
    expect(fixture.observeAssets).toHaveReturnedWith(beforeSnapshot);

    act(() => fixture.publishReady());

    expect(rendered.result.current).toBe(fixture.runtimeImage);
    expect(rendered.result.current).toMatchObject({
      delivery: "runtime_image",
      url: "/assets/ready.webp",
    });
    expect(fixture.observeAssets()).not.toBe(beforeSnapshot);
    expect(fixture.asset).toHaveBeenLastCalledWith(assetId, usage);

    rendered.unmount();
    expect(fixture.listenerCount()).toBe(0);
  });
});
