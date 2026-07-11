// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { digestBytes, digestCanonical } from "../contracts/digest.js";
import { parsePositiveSafeInteger } from "../contracts/values.js";
import { resolveAssetManifestV1 } from "./asset-resolver.js";

const bytes = new TextEncoder().encode("synthetic-image");
const provider = Object.freeze({
  assetId: "asset.synthetic",
  runtimePath: "images/synthetic.png",
  mediaType: "image/png" as const,
  byteLength: parsePositiveSafeInteger(bytes.length),
  width: parsePositiveSafeInteger(1),
  height: parsePositiveSafeInteger(1),
  sha256: digestBytes(bytes),
});
const pack = Object.freeze({
  identity: Object.freeze({
    id: "assets.synthetic",
    revision: parsePositiveSafeInteger(1),
  }),
  providers: Object.freeze([provider]),
});
const slot = Object.freeze({
  assetId: "asset.synthetic",
  kind: "ui" as const,
  usage: "ui_decoration" as const,
  overridePolicy: "replaceable" as const,
  fallbackToken: "fallback.synthetic",
  width: parsePositiveSafeInteger(1),
  height: parsePositiveSafeInteger(1),
  loadGroup: "bootstrap" as const,
  safeArea: null,
  pivot: null,
});

describe("Asset resolver", () => {
  it("computes identity from the exact provider projection", () => {
    const resolved = resolveAssetManifestV1([slot], [pack]);
    expect(resolved.packs[0]?.digest).toBe(
      digestCanonical("project-tavern:asset-pack:v1", {
        identity: { id: pack.identity.id, revision: pack.identity.revision },
        providers: pack.providers,
      }),
    );
    expect(resolved.assets[0]?.delivery).toBe("runtime_image");
  });

  it("keeps declared slots as fallbacks without packs", () => {
    const resolved = resolveAssetManifestV1([slot], []);
    expect(resolved.assets).toHaveLength(1);
    expect(resolved.assets[0]?.delivery).toBe("code_fallback");
  });

  it("rejects unsafe runtime paths", () => {
    expect(() =>
      resolveAssetManifestV1(
        [slot],
        [{ ...pack, providers: [{ ...provider, runtimePath: "../escape.png" }] }],
      ),
    ).toThrow("asset path invalid");
  });
});
