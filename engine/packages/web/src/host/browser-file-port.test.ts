// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it, vi } from "vitest";
import { parsePositiveSafeInteger } from "@sillymaker/base";
import { createBrowserFilePortV1 } from "./browser-file-port.js";

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function installFilesV1(input: HTMLInputElement, files: readonly File[]): void {
  Object.defineProperty(input, "files", {
    configurable: true,
    value: Object.freeze({
      length: files.length,
      item: (index: number) => files[index] ?? null,
    }) as unknown as FileList,
  });
}

async function pendingSelectionV1(): Promise<{
  readonly input: HTMLInputElement;
  readonly result: ReturnType<ReturnType<typeof createBrowserFilePortV1>["selectOne"]>;
}> {
  const port = createBrowserFilePortV1();
  const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => undefined);
  const result = port.selectOne({
    acceptedMediaTypes: Object.freeze(["application/json"]),
    maximumBytes: parsePositiveSafeInteger(4),
  });
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (input === null) throw new TypeError("browser picker input was not installed");
  expect(click).toHaveBeenCalledOnce();
  expect(input.accept).toBe("application/json");
  expect(input.multiple).toBe(false);
  return { input, result };
}

describe("createBrowserFilePortV1", () => {
  it("selects the exact bytes of one bounded accepted file", async () => {
    const { input, result } = await pendingSelectionV1();
    installFilesV1(input, [
      new File([Uint8Array.of(1, 2, 3)], "save.json", { type: "application/json" }),
    ]);

    input.dispatchEvent(new Event("change"));

    await expect(result).resolves.toEqual({
      kind: "selected",
      name: "save.json",
      bytes: Uint8Array.of(1, 2, 3),
    });
    expect(input.isConnected).toBe(false);
  });

  it.each(["cancel", "change"] as const)(
    "reports picker cancellation from a %s event without fabricating a selected file",
    async (eventType) => {
      const { input, result } = await pendingSelectionV1();

      input.dispatchEvent(new Event(eventType));

      await expect(result).resolves.toEqual({ kind: "cancelled" });
      expect(input.isConnected).toBe(false);
    },
  );

  it.each([
    {
      label: "oversized",
      file: new File([Uint8Array.of(1, 2, 3, 4, 5)], "save.json", {
        type: "application/json",
      }),
      expected: { kind: "rejected", code: "too_large" },
    },
    {
      label: "unsupported",
      file: new File([Uint8Array.of(1)], "save.txt", { type: "text/plain" }),
      expected: { kind: "rejected", code: "unsupported_type" },
    },
  ])("rejects one $label file at the Host boundary", async ({ file, expected }) => {
    const { input, result } = await pendingSelectionV1();
    installFilesV1(input, [file]);

    input.dispatchEvent(new Event("change"));

    await expect(result).resolves.toEqual(expected);
    expect(input.isConnected).toBe(false);
  });

  it("downloads through a temporary browser anchor and always revokes its URL", async () => {
    const objectUrl = "blob:project-tavern-test";
    const createObjectURL = vi.fn((_blob: Blob) => objectUrl);
    const revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const port = createBrowserFilePortV1({
      document,
      url: Object.freeze({ createObjectURL, revokeObjectURL }),
    });

    await port.download({
      filename: "save.json",
      mediaType: "application/json",
      bytes: Uint8Array.of(7, 8, 9),
    });

    expect(createObjectURL).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob).toMatchObject({ size: 3, type: "application/json" });
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl);
    expect(document.querySelector("a[download]")).toBeNull();
  });
});
