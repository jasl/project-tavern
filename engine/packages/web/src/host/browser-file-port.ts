// SPDX-License-Identifier: MIT
import type { HostFilePortV1 } from "@sillymaker/base";

type HostFileSelectionResultV1 = Awaited<ReturnType<HostFilePortV1["selectOne"]>>;

export interface BrowserFilePortEnvironmentV1 {
  readonly document: Document;
  readonly url: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
}

function resolveEnvironmentV1(
  environment: BrowserFilePortEnvironmentV1 | undefined,
): BrowserFilePortEnvironmentV1 {
  return (
    environment ??
    Object.freeze({
      document: globalThis.document,
      url: globalThis.URL,
    })
  );
}

function acceptsMediaTypeV1(
  actualMediaType: string,
  acceptedMediaTypes: readonly string[],
): boolean {
  if (acceptedMediaTypes.length === 0) return true;
  const actual = actualMediaType.trim().toLowerCase();
  return acceptedMediaTypes.some((candidate) => {
    const accepted = candidate.trim().toLowerCase();
    if (accepted === actual || accepted === "*/*") return true;
    const wildcardIndex = accepted.indexOf("/*");
    return wildcardIndex > 0 && accepted.slice(0, wildcardIndex) === actual.split("/", 1)[0];
  });
}

function createSelectionV1(
  environment: BrowserFilePortEnvironmentV1,
  request: Parameters<HostFilePortV1["selectOne"]>[0],
): Promise<HostFileSelectionResultV1> {
  const input = environment.document.createElement("input");
  input.type = "file";
  input.accept = request.acceptedMediaTypes.join(",");
  input.multiple = false;
  input.hidden = true;
  environment.document.body.append(input);

  return new Promise<HostFileSelectionResultV1>((resolve, reject) => {
    let settled = false;
    const cleanupV1 = (): void => {
      input.removeEventListener("change", onChangeV1);
      input.removeEventListener("cancel", onCancelV1);
      input.remove();
    };
    const beginSettlementV1 = (): boolean => {
      if (settled) return false;
      settled = true;
      input.removeEventListener("change", onChangeV1);
      input.removeEventListener("cancel", onCancelV1);
      return true;
    };
    const resolveV1 = (result: HostFileSelectionResultV1): void => {
      cleanupV1();
      resolve(Object.freeze(result));
    };
    const rejectV1 = (error: unknown): void => {
      cleanupV1();
      reject(error);
    };
    const onCancelV1 = (): void => {
      if (!beginSettlementV1()) return;
      resolveV1({ kind: "cancelled" });
    };
    const onChangeV1 = (): void => {
      if (!beginSettlementV1()) return;
      void (async () => {
        const file = input.files?.item(0) ?? null;
        if (file === null) {
          resolveV1({ kind: "cancelled" });
          return;
        }
        if (file.size > request.maximumBytes) {
          resolveV1({ kind: "rejected", code: "too_large" });
          return;
        }
        if (!acceptsMediaTypeV1(file.type, request.acceptedMediaTypes)) {
          resolveV1({ kind: "rejected", code: "unsupported_type" });
          return;
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (bytes.byteLength > request.maximumBytes) {
          resolveV1({ kind: "rejected", code: "too_large" });
          return;
        }
        resolveV1({ kind: "selected", name: file.name, bytes });
      })().catch(rejectV1);
    };

    input.addEventListener("change", onChangeV1);
    input.addEventListener("cancel", onCancelV1);
    try {
      input.click();
    } catch (error) {
      if (beginSettlementV1()) rejectV1(error);
    }
  });
}

/** Creates the browser-owned file picker and download boundary used by Web applications. */
export function createBrowserFilePortV1(
  environment?: BrowserFilePortEnvironmentV1,
): HostFilePortV1 {
  return Object.freeze({
    async selectOne(request: Parameters<HostFilePortV1["selectOne"]>[0]) {
      return await createSelectionV1(resolveEnvironmentV1(environment), request);
    },
    async download(request: Parameters<HostFilePortV1["download"]>[0]) {
      const resolved = resolveEnvironmentV1(environment);
      const payload = Uint8Array.from(request.bytes);
      const url = resolved.url.createObjectURL(
        new Blob([payload.buffer], { type: request.mediaType }),
      );
      try {
        const anchor = resolved.document.createElement("a");
        anchor.href = url;
        anchor.download = request.filename;
        anchor.hidden = true;
        resolved.document.body.append(anchor);
        try {
          anchor.click();
        } finally {
          anchor.remove();
        }
      } finally {
        resolved.url.revokeObjectURL(url);
      }
    },
  });
}
