// SPDX-License-Identifier: MIT
import { parseDigest, parsePositiveSafeInteger } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import { createBrowserImageLoaderV1 } from "./create-browser-image-loader.js";

const runtimePathV1 = "game/packages/assets/e2e/scene.png";
const runtimeUrlV1 = `https://game.example.test/runtime/${runtimePathV1}`;
const runtimeRequestV1 = Object.freeze({
  runtimePath: runtimePathV1,
  mediaType: "image/png" as const,
  sha256: parseDigest(`sha256:${"a".repeat(64)}`),
  width: parsePositiveSafeInteger(1024),
  height: parsePositiveSafeInteger(768),
});

type ImageEventHandlerV1 = HTMLImageElement["onload"];

function createFakeImageV1(decode: () => Promise<void> = async () => undefined) {
  let source = "";
  const assignedSources: string[] = [];
  const image = {
    onload: null as ImageEventHandlerV1,
    onerror: null as ImageEventHandlerV1,
    decode: vi.fn(decode),
    get src() {
      return source;
    },
    set src(value: string) {
      source = value;
      assignedSources.push(value);
    },
  };

  function dispatch(handler: ImageEventHandlerV1, type: "load" | "error"): void {
    handler?.call(image as unknown as GlobalEventHandlers, new Event(type));
  }

  return Object.freeze({
    element: image as unknown as HTMLImageElement,
    image,
    assignedSources,
    dispatchLoad: () => dispatch(image.onload, "load"),
    dispatchError: () => dispatch(image.onerror, "error"),
  });
}

function createLoaderFixtureV1(decode?: () => Promise<void>) {
  const fakeImage = createFakeImageV1(decode);
  const resolveRuntimeUrl = vi.fn((runtimePath: string) => {
    if (runtimePath !== runtimePathV1) {
      throw new TypeError(`unexpected runtime path: ${runtimePath}`);
    }
    return runtimeUrlV1;
  });
  const createImage = vi.fn(() => fakeImage.element);
  const loader = createBrowserImageLoaderV1(
    Object.freeze({
      resolveRuntimeUrl,
      createImage,
    }),
  );

  return Object.freeze({ loader, fakeImage, resolveRuntimeUrl, createImage });
}

function deferredV1<TValue>(): {
  readonly promise: Promise<TValue>;
  readonly resolve: (value: TValue) => void;
  readonly reject: (reason?: unknown) => void;
} {
  let resolve!: (value: TValue) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<TValue>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return Object.freeze({ promise, resolve, reject });
}

describe("browser image loader", () => {
  it("builds the resolved URL and digest cache key without image I/O", () => {
    const fixture = createLoaderFixtureV1();

    expect(fixture.loader.cacheKey(runtimeRequestV1)).toBe(
      `${runtimeUrlV1}#${runtimeRequestV1.sha256}`,
    );
    expect(fixture.resolveRuntimeUrl).toHaveBeenCalledExactlyOnceWith(runtimePathV1);
    expect(fixture.createImage).not.toHaveBeenCalled();
    expect(fixture.fakeImage.assignedSources).toEqual([]);
    expect(fixture.fakeImage.image.decode).not.toHaveBeenCalled();
  });

  it("loads only the supplied runtime path and decodes after the image load event", async () => {
    const fixture = createLoaderFixtureV1();
    const result = fixture.loader.load(runtimeRequestV1, new AbortController().signal);

    expect(fixture.resolveRuntimeUrl).toHaveBeenCalledExactlyOnceWith(runtimePathV1);
    expect(fixture.createImage).toHaveBeenCalledOnce();
    expect(fixture.fakeImage.assignedSources).toEqual([runtimeUrlV1]);
    expect(fixture.fakeImage.image.decode).not.toHaveBeenCalled();

    fixture.fakeImage.dispatchLoad();

    await expect(result).resolves.toEqual({ kind: "loaded", url: runtimeUrlV1 });
    expect(fixture.fakeImage.image.decode).toHaveBeenCalledOnce();
  });

  it("maps an image error event to fetch_failed without decoding", async () => {
    const fixture = createLoaderFixtureV1();
    const result = fixture.loader.load(runtimeRequestV1, new AbortController().signal);

    fixture.fakeImage.dispatchError();

    await expect(result).resolves.toEqual({ kind: "failed", code: "fetch_failed" });
    expect(fixture.fakeImage.image.decode).not.toHaveBeenCalled();
  });

  it("maps a decode rejection to decode_failed", async () => {
    const fixture = createLoaderFixtureV1(async () => {
      throw new DOMException("invalid image bytes", "EncodingError");
    });
    const result = fixture.loader.load(runtimeRequestV1, new AbortController().signal);

    fixture.fakeImage.dispatchLoad();

    await expect(result).resolves.toEqual({ kind: "failed", code: "decode_failed" });
    expect(fixture.fakeImage.image.decode).toHaveBeenCalledOnce();
  });

  it("aborts a pending load and detaches the image handlers and source", async () => {
    const fixture = createLoaderFixtureV1();
    const controller = new AbortController();
    const result = fixture.loader.load(runtimeRequestV1, controller.signal);

    expect(fixture.fakeImage.image.onload).toBeTypeOf("function");
    expect(fixture.fakeImage.image.onerror).toBeTypeOf("function");
    expect(fixture.fakeImage.image.src).toBe(runtimeUrlV1);

    controller.abort();

    await expect(result).resolves.toEqual({ kind: "aborted" });
    expect(fixture.fakeImage.image.onload).toBeNull();
    expect(fixture.fakeImage.image.onerror).toBeNull();
    expect(fixture.fakeImage.image.src).toBe("");
    expect(fixture.fakeImage.image.decode).not.toHaveBeenCalled();
  });

  it("disposes a pending load and detaches the image handlers and source", async () => {
    const fixture = createLoaderFixtureV1();
    const result = fixture.loader.load(runtimeRequestV1, new AbortController().signal);

    fixture.loader.dispose();

    await expect(result).resolves.toEqual({ kind: "aborted" });
    expect(fixture.fakeImage.image.onload).toBeNull();
    expect(fixture.fakeImage.image.onerror).toBeNull();
    expect(fixture.fakeImage.image.src).toBe("");
    expect(fixture.fakeImage.image.decode).not.toHaveBeenCalled();
  });

  it("keeps an abort authoritative when decode resolves late", async () => {
    const decode = deferredV1<void>();
    const fixture = createLoaderFixtureV1(() => decode.promise);
    const controller = new AbortController();
    const result = fixture.loader.load(runtimeRequestV1, controller.signal);

    fixture.fakeImage.dispatchLoad();
    expect(fixture.fakeImage.image.decode).toHaveBeenCalledOnce();
    controller.abort();

    await expect(result).resolves.toEqual({ kind: "aborted" });
    expect(fixture.fakeImage.image.src).toBe("");
    decode.resolve();
    await Promise.resolve();
    await expect(result).resolves.toEqual({ kind: "aborted" });
  });

  it("keeps disposal authoritative when decode rejects late", async () => {
    const decode = deferredV1<void>();
    const fixture = createLoaderFixtureV1(() => decode.promise);
    const result = fixture.loader.load(runtimeRequestV1, new AbortController().signal);

    fixture.fakeImage.dispatchLoad();
    expect(fixture.fakeImage.image.decode).toHaveBeenCalledOnce();
    fixture.loader.dispose();

    await expect(result).resolves.toEqual({ kind: "aborted" });
    expect(fixture.fakeImage.image.src).toBe("");
    decode.reject(new DOMException("late decode failure", "EncodingError"));
    await Promise.resolve();
    await expect(result).resolves.toEqual({ kind: "aborted" });
  });
});
