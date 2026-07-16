// SPDX-License-Identifier: MIT
import type { RuntimeAssetLoaderV1, RuntimeAssetLoadRequestV1 } from "@sillymaker/ui/assets";

export interface BrowserImageLoaderEnvironmentV1 {
  readonly resolveRuntimeUrl: (runtimePath: string) => string;
  readonly createImage: () => HTMLImageElement;
}

type BrowserImageLoadResultV1 = Awaited<ReturnType<RuntimeAssetLoaderV1["load"]>>;
type AbortPendingLoadV1 = () => void;

const abortedResultV1 = Object.freeze({ kind: "aborted" as const });
const fetchFailedResultV1 = Object.freeze({
  kind: "failed" as const,
  code: "fetch_failed" as const,
});
const decodeFailedResultV1 = Object.freeze({
  kind: "failed" as const,
  code: "decode_failed" as const,
});

/**
 * Creates the browser-only adapter that resolves and decodes one exact runtime image request.
 * Every pending image owns an isolated settlement path so caller abort and loader disposal can
 * synchronously detach browser handlers before the returned Promise settles.
 */
export function createBrowserImageLoaderV1(
  environment: BrowserImageLoaderEnvironmentV1,
): RuntimeAssetLoaderV1 {
  const pendingLoads = new Set<AbortPendingLoadV1>();
  let disposed = false;

  const loader: RuntimeAssetLoaderV1 = Object.freeze({
    cacheKey(request: RuntimeAssetLoadRequestV1) {
      return `${environment.resolveRuntimeUrl(request.runtimePath)}#${request.sha256}`;
    },

    load(request: RuntimeAssetLoadRequestV1, signal: AbortSignal) {
      if (disposed || signal.aborted) return Promise.resolve(abortedResultV1);

      let finalUrl: string;
      let image: HTMLImageElement;
      try {
        finalUrl = environment.resolveRuntimeUrl(request.runtimePath);
        image = environment.createImage();
      } catch {
        return Promise.resolve(fetchFailedResultV1);
      }

      return new Promise<BrowserImageLoadResultV1>((resolve) => {
        let settled = false;

        const detachHandlers = (): void => {
          Object.assign(image, { onload: null, onerror: null });
        };

        const settle = (result: BrowserImageLoadResultV1, clearSource = false): void => {
          if (settled) return;
          settled = true;
          detachHandlers();
          signal.removeEventListener("abort", abortPendingLoad);
          pendingLoads.delete(abortPendingLoad);
          if (clearSource) image.src = "";
          resolve(result);
        };

        const abortPendingLoad: AbortPendingLoadV1 = () => {
          settle(abortedResultV1, true);
        };

        const decodeLoadedImage = async (): Promise<void> => {
          detachHandlers();
          try {
            await image.decode();
            settle(
              disposed || signal.aborted
                ? abortedResultV1
                : Object.freeze({ kind: "loaded" as const, url: finalUrl }),
              disposed || signal.aborted,
            );
          } catch {
            settle(
              disposed || signal.aborted ? abortedResultV1 : decodeFailedResultV1,
              disposed || signal.aborted,
            );
          }
        };

        Object.assign(image, {
          onload: () => {
            void decodeLoadedImage();
          },
          onerror: () => {
            settle(fetchFailedResultV1);
          },
        });
        signal.addEventListener("abort", abortPendingLoad, { once: true });
        pendingLoads.add(abortPendingLoad);

        if (disposed || signal.aborted) {
          abortPendingLoad();
          return;
        }

        try {
          image.src = finalUrl;
        } catch {
          settle(fetchFailedResultV1);
        }
      });
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      for (const abortPendingLoad of [...pendingLoads]) abortPendingLoad();
    },
  });

  return loader;
}
