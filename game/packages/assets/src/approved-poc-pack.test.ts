// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { AssetPackV1 } from "@sillymaker/base";
import { parseDigest, parsePositiveSafeInteger } from "@sillymaker/base";
import { describe, expect, expectTypeOf, it } from "vitest";

import { approvedPocAssetPacksV1 } from "./index.js";

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const approvedRuntimeRoot = "game/packages/assets/runtime/poc/";
const approvedAssetIds = new Set<string>([
  "asset.poc.background.tavern.day.standard",
  "asset.poc.background.tavern.evening.standard",
  "asset.poc.background.main_menu.standard",
  "asset.poc.background.market.day.standard",
  "asset.poc.background.world_map.standard",
  "asset.poc.background.week_summary.standard",
  "asset.poc.character.heroine.static.standard",
  "asset.poc.character.heroine.back_hair.standard",
  "asset.poc.character.heroine.costume_body.standard",
  "asset.poc.character.heroine.face.neutral",
  "asset.poc.character.heroine.front_hair.standard",
  "asset.poc.character.heroine.accessory.standard",
]);

type ImageMetadata = {
  readonly mediaType: AssetPackV1["providers"][number]["mediaType"];
  readonly width: number;
  readonly height: number;
};

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function uint16Le(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true);
}

function uint24Le(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16);
}

function uint32(bytes: Uint8Array, offset: number, littleEndian: boolean): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
    offset,
    littleEndian,
  );
}

function positiveDimensions(
  width: number,
  height: number,
): Pick<ImageMetadata, "width" | "height"> {
  if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) {
    throw new TypeError("runtime image dimensions must be positive safe integers");
  }
  return { width, height };
}

function readPngMetadata(bytes: Uint8Array): ImageMetadata | null {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((byte, index) => bytes[index] === byte)) return null;
  if (bytes.length < 24 || uint32(bytes, 8, false) !== 13 || ascii(bytes, 12, 4) !== "IHDR") {
    throw new TypeError("invalid PNG header");
  }
  return {
    mediaType: "image/png",
    ...positiveDimensions(uint32(bytes, 16, false), uint32(bytes, 20, false)),
  };
}

function readWebpMetadata(bytes: Uint8Array): ImageMetadata | null {
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;
  if (bytes.length < 20 || uint32(bytes, 4, true) + 8 !== bytes.length) {
    throw new TypeError("invalid WebP container");
  }

  for (let offset = 12; offset + 8 <= bytes.length;) {
    const chunkType = ascii(bytes, offset, 4);
    const chunkLength = uint32(bytes, offset + 4, true);
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + chunkLength;
    if (dataEnd > bytes.length) throw new TypeError("invalid WebP chunk bounds");

    if (chunkType === "VP8X") {
      if (chunkLength < 10) throw new TypeError("invalid WebP VP8X header");
      return {
        mediaType: "image/webp",
        ...positiveDimensions(
          uint24Le(bytes, dataOffset + 4) + 1,
          uint24Le(bytes, dataOffset + 7) + 1,
        ),
      };
    }
    if (chunkType === "VP8L") {
      if (chunkLength < 5 || bytes[dataOffset] !== 0x2f) {
        throw new TypeError("invalid WebP VP8L header");
      }
      const b1 = bytes[dataOffset + 1] ?? 0;
      const b2 = bytes[dataOffset + 2] ?? 0;
      const b3 = bytes[dataOffset + 3] ?? 0;
      const b4 = bytes[dataOffset + 4] ?? 0;
      return {
        mediaType: "image/webp",
        ...positiveDimensions(
          1 + b1 + ((b2 & 0x3f) << 8),
          1 + ((b2 & 0xc0) >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10),
        ),
      };
    }
    if (chunkType === "VP8 ") {
      if (
        chunkLength < 10 ||
        bytes[dataOffset + 3] !== 0x9d ||
        bytes[dataOffset + 4] !== 0x01 ||
        bytes[dataOffset + 5] !== 0x2a
      ) {
        throw new TypeError("invalid WebP VP8 header");
      }
      return {
        mediaType: "image/webp",
        ...positiveDimensions(
          uint16Le(bytes, dataOffset + 6) & 0x3fff,
          uint16Le(bytes, dataOffset + 8) & 0x3fff,
        ),
      };
    }
    offset = dataEnd + (chunkLength % 2);
  }
  throw new TypeError("WebP has no image-bearing chunk");
}

function readSvgMetadata(bytes: Uint8Array): ImageMetadata | null {
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/u, "");
  } catch {
    return null;
  }
  const root = /^\s*(?:<\?xml[^>]*>\s*)?<svg(?:\s([^>]*))?>/u.exec(source);
  if (root === null) return null;
  const attributes = root[1] ?? "";
  const readDimension = (name: "width" | "height"): number => {
    const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([1-9]\\d*)(?:px)?["']`, "u").exec(
      attributes,
    );
    if (match?.[1] === undefined) throw new TypeError(`SVG ${name} is missing or invalid`);
    return Number(match[1]);
  };
  return {
    mediaType: "image/svg+xml",
    ...positiveDimensions(readDimension("width"), readDimension("height")),
  };
}

function readImageMetadata(bytes: Uint8Array): ImageMetadata {
  const metadata = readPngMetadata(bytes) ?? readWebpMetadata(bytes) ?? readSvgMetadata(bytes);
  if (metadata === null) throw new TypeError("runtime image magic is unsupported");
  return metadata;
}

function sha256(bytes: Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function verifyApprovedProvider(
  provider: AssetPackV1["providers"][number],
  root = repositoryRoot,
): Promise<void> {
  const segments = provider.runtimePath.split("/");
  expect(provider.runtimePath.startsWith(approvedRuntimeRoot)).toBe(true);
  expect(provider.runtimePath.length).toBeGreaterThan(approvedRuntimeRoot.length);
  expect(
    provider.runtimePath.includes("\\") ||
      provider.runtimePath.includes("?") ||
      provider.runtimePath.includes("#") ||
      provider.runtimePath.includes("\0") ||
      segments.some((segment) => segment === "" || segment === "." || segment === ".."),
  ).toBe(false);
  expect(approvedAssetIds.has(provider.assetId)).toBe(true);

  const approvedRootPath = resolve(root, approvedRuntimeRoot);
  const providerPath = resolve(root, provider.runtimePath);
  const relativePath = relative(approvedRootPath, providerPath);
  expect(
    relativePath.length > 0 && !relativePath.startsWith("..") && !isAbsolute(relativePath),
  ).toBe(true);

  const [realRepositoryRoot, realApprovedRoot, realProviderPath] = await Promise.all([
    realpath(root),
    realpath(approvedRootPath),
    realpath(providerPath),
  ]);
  const realApprovedRelativePath = relative(realRepositoryRoot, realApprovedRoot);
  expect(
    realApprovedRelativePath.length > 0 &&
      !realApprovedRelativePath.startsWith("..") &&
      !isAbsolute(realApprovedRelativePath),
  ).toBe(true);
  const realRelativePath = relative(realApprovedRoot, realProviderPath);
  expect(
    realRelativePath.length > 0 &&
      !realRelativePath.startsWith("..") &&
      !isAbsolute(realRelativePath),
  ).toBe(true);

  const bytes = await readFile(realProviderPath);
  const metadata = readImageMetadata(bytes);
  expect(metadata.mediaType).toBe(provider.mediaType);
  expect(bytes.byteLength).toBe(provider.byteLength);
  expect(sha256(bytes)).toBe(provider.sha256);
  expect(metadata.width).toBe(provider.width);
  expect(metadata.height).toBe(provider.height);
}

describe("approved PoC asset handoff", () => {
  it("keeps an empty handoff legal when no runtime images are approved", () => {
    expectTypeOf(approvedPocAssetPacksV1).toEqualTypeOf<readonly AssetPackV1[]>();
    expect(approvedPocAssetPacksV1).toEqual([]);
    expect(Object.isFrozen(approvedPocAssetPacksV1)).toBe(true);
  });

  it("mechanically verifies every future approved provider", async () => {
    for (const pack of approvedPocAssetPacksV1) {
      expect(pack.identity.id).toMatch(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/u);
      expect(Number.isSafeInteger(pack.identity.revision) && pack.identity.revision > 0).toBe(true);
      expect(new Set(pack.providers.map(({ assetId }) => assetId)).size).toBe(
        pack.providers.length,
      );
      for (const provider of pack.providers) await verifyApprovedProvider(provider);
    }
  });

  it("reads every supported provider media type by magic and dimensions", () => {
    const webpBytes = Uint8Array.of(
      0x52,
      0x49,
      0x46,
      0x46,
      22,
      0,
      0,
      0,
      0x57,
      0x45,
      0x42,
      0x50,
      0x56,
      0x50,
      0x38,
      0x58,
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      2,
      0,
      0,
    );
    const svgBytes = new TextEncoder().encode('<svg width="4" height="5"></svg>');

    expect(readImageMetadata(webpBytes)).toEqual({
      mediaType: "image/webp",
      width: 2,
      height: 3,
    });
    expect(readImageMetadata(svgBytes)).toEqual({
      mediaType: "image/svg+xml",
      width: 4,
      height: 5,
    });
  });

  it("rejects future providers outside the approved mechanical boundary", async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), "project-tavern-approved-assets-"));
    const outsideRoot = await mkdtemp(resolve(tmpdir(), "project-tavern-outside-assets-"));
    const pngBytes = Uint8Array.of(
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      0,
      0,
      0,
      13,
      0x49,
      0x48,
      0x44,
      0x52,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
    );
    const runtimePath = `${approvedRuntimeRoot}synthetic.png`;
    const provider: AssetPackV1["providers"][number] = Object.freeze({
      assetId: "asset.poc.background.tavern.day.standard",
      runtimePath,
      mediaType: "image/png",
      byteLength: parsePositiveSafeInteger(pngBytes.byteLength),
      width: parsePositiveSafeInteger(1),
      height: parsePositiveSafeInteger(1),
      sha256: parseDigest(sha256(pngBytes)),
    });

    try {
      const providerPath = resolve(temporaryRoot, runtimePath);
      await mkdir(dirname(providerPath), { recursive: true });
      await writeFile(providerPath, pngBytes);
      await expect(verifyApprovedProvider(provider, temporaryRoot)).resolves.toBeUndefined();

      await expect(
        verifyApprovedProvider(
          { ...provider, runtimePath: "game/packages/assets/runtime/escape.png" },
          temporaryRoot,
        ),
      ).rejects.toThrow();
      await expect(
        verifyApprovedProvider({ ...provider, assetId: "asset.poc.unknown" }, temporaryRoot),
      ).rejects.toThrow();
      await expect(
        verifyApprovedProvider({ ...provider, mediaType: "image/webp" }, temporaryRoot),
      ).rejects.toThrow();
      await expect(
        verifyApprovedProvider(
          {
            ...provider,
            byteLength: parsePositiveSafeInteger(provider.byteLength + 1),
          },
          temporaryRoot,
        ),
      ).rejects.toThrow();
      await expect(
        verifyApprovedProvider(
          { ...provider, sha256: parseDigest(`sha256:${"0".repeat(64)}`) },
          temporaryRoot,
        ),
      ).rejects.toThrow();
      await expect(
        verifyApprovedProvider({ ...provider, width: parsePositiveSafeInteger(2) }, temporaryRoot),
      ).rejects.toThrow();

      const approvedRootPath = resolve(temporaryRoot, approvedRuntimeRoot);
      await rm(approvedRootPath, { recursive: true, force: true });
      await writeFile(resolve(outsideRoot, "synthetic.png"), pngBytes);
      await symlink(outsideRoot, approvedRootPath, "junction");
      await expect(verifyApprovedProvider(provider, temporaryRoot)).rejects.toThrow();
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });
});
