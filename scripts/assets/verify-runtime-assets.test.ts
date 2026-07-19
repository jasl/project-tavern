// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { ResolvedAssetManifestV1 } from "../../engine/packages/base/src/index.js";
import { describe, expect, it } from "vitest";

import {
  runtimeAssetStoryChecksV1,
  verifyRuntimeAssetStoryChecksV1,
  verifyRuntimeAssetsV1,
  type RuntimeAssetStoryCheckV1,
} from "./verify-runtime-assets.mjs";
import type {
  RuntimeAssetValidationEnvironmentV1,
  RuntimeAssetValidationErrorV1,
} from "./validate-runtime.mjs";

function emptyManifestV1(): ResolvedAssetManifestV1 {
  return Object.freeze({
    packs: Object.freeze([]),
    slots: Object.freeze([]),
    assets: Object.freeze([]),
  });
}

describe("closed runtime asset verification", () => {
  it("freezes the maintained PoC Story check", () => {
    expect(runtimeAssetStoryChecksV1.map(({ storyId }) => storyId)).toEqual(["week.poc_001"]);
    expect(Object.isFrozen(runtimeAssetStoryChecksV1)).toBe(true);
    for (const check of runtimeAssetStoryChecksV1) expect(Object.isFrozen(check)).toBe(true);
  });

  it("resolves every closed Story once and validates its exact manifest in order", async () => {
    const manifests = [emptyManifestV1(), emptyManifestV1()] as const;
    const resolutionCalls: string[] = [];
    const validationCalls: ResolvedAssetManifestV1[] = [];
    const stories = manifests.map((manifest, index): RuntimeAssetStoryCheckV1 =>
      Object.freeze({
        storyId: `story.test.${String(index + 1)}`,
        resolveAssets() {
          resolutionCalls.push(this.storyId);
          return manifest;
        },
      }),
    );
    const environment: RuntimeAssetValidationEnvironmentV1 = Object.freeze({
      repositoryRoot: "/repo/project-tavern",
      async readFile(path: string) {
        throw new Error(`unexpected read: ${path}`);
      },
      async realpath(path: string) {
        throw new Error(`unexpected realpath: ${path}`);
      },
    });

    const verified = await verifyRuntimeAssetStoryChecksV1(
      stories,
      environment,
      async (manifest) => {
        validationCalls.push(manifest);
        return Object.freeze({ errors: Object.freeze([]) });
      },
    );

    expect(resolutionCalls).toEqual(["story.test.1", "story.test.2"]);
    expect(validationCalls).toEqual(manifests);
    expect(verified).toEqual(["story.test.1", "story.test.2"]);
    expect(Object.isFrozen(verified)).toBe(true);
  });

  it("resolves the live fallback-only manifest without any runtime file access", async () => {
    const reads: string[] = [];
    const realpaths: string[] = [];
    const root = resolve(import.meta.dirname, "../..");
    const environment: RuntimeAssetValidationEnvironmentV1 = Object.freeze({
      repositoryRoot: root,
      async readFile(path: string) {
        reads.push(path);
        throw new Error(`fallback-only verification read ${path}`);
      },
      async realpath(path: string) {
        realpaths.push(path);
        throw new Error(`fallback-only verification resolved ${path}`);
      },
    });

    await expect(verifyRuntimeAssetsV1(root, { environment })).resolves.toEqual(["week.poc_001"]);
    expect(reads).toEqual([]);
    expect(realpaths).toEqual([]);
  }, 30_000);

  it("reports bounded Story and asset identities after checking the closed set", async () => {
    const manifest = emptyManifestV1();
    const resolutionCalls: string[] = [];
    const stories = ["story.test.first", "story.test.second"].map(
      (storyId): RuntimeAssetStoryCheckV1 =>
        Object.freeze({
          storyId,
          resolveAssets() {
            resolutionCalls.push(storyId);
            return manifest;
          },
        }),
    );
    const error: RuntimeAssetValidationErrorV1 = Object.freeze({
      assetId: "asset.test.invalid",
      code: "asset.runtime_hash_mismatch",
    });

    await expect(
      verifyRuntimeAssetStoryChecksV1(
        stories,
        Object.freeze({
          repositoryRoot: "/repo/project-tavern",
          async readFile() {
            return new Uint8Array();
          },
          async realpath(path: string) {
            return path;
          },
        }),
        async () => {
          return Object.freeze({ errors: Object.freeze([error]) });
        },
      ),
    ).rejects.toThrow(
      "story.test.first:asset.test.invalid:asset.runtime_hash_mismatch\n" +
        "story.test.second:asset.test.invalid:asset.runtime_hash_mismatch",
    );
    expect(resolutionCalls).toEqual(["story.test.first", "story.test.second"]);
  });

  it("imports only the Base resolver, validator, and Node-only PoC Story entry", async () => {
    const source = await readFile(new URL("./verify-runtime-assets.mts", import.meta.url), "utf8");
    const dynamicSpecifiers = [...source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/gu)].flatMap(
      (match) => (match[1] === undefined ? [] : [match[1]]),
    );

    expect(dynamicSpecifiers).toEqual([
      "../../engine/packages/base/src/index.js",
      "../../game/stories/poc/src/story-definition.js",
      "./validate-runtime.mjs",
    ]);
    expect(dynamicSpecifiers.every((specifier) => !specifier.includes("/testkit"))).toBe(true);
    expect(
      dynamicSpecifiers.some((specifier) => /\.tsx$|\/application\/|\/tooling\b/u.test(specifier)),
    ).toBe(false);
  });
});
