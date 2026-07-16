// SPDX-License-Identifier: MIT
import {
  digestBytes,
  parsePositiveSafeInteger,
  type ResolvedAssetManifestV1,
} from "../../engine/packages/base/src/index.js";
import { describe, expect, it } from "vitest";

import {
  validateRuntimeAssetManifestV1,
  type RuntimeAssetValidationEnvironmentV1,
} from "./validate-runtime.mjs";

const validPngV1 = Uint8Array.of(
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
  0x00,
  0x00,
  0x00,
  0x0d,
  0x49,
  0x48,
  0x44,
  0x52,
  0x00,
  0x00,
  0x00,
  0x01,
  0x00,
  0x00,
  0x00,
  0x01,
  0x08,
  0x06,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
);

const oneV1 = parsePositiveSafeInteger(1);
const providerIdentityV1 = Object.freeze({
  id: "test.runtime-pack",
  revision: oneV1,
  digest: digestBytes(new TextEncoder().encode("test.runtime-pack")),
});
const providerRefV1 = Object.freeze({ kind: "asset_pack" as const, identity: providerIdentityV1 });

type ResolvedRuntimeAssetEntryV1 = Extract<
  ResolvedAssetManifestV1["assets"][number],
  { readonly delivery: "runtime_image" }
>;

interface RuntimeProviderFixtureV1 {
  readonly assetId: string;
  readonly runtimePath: string;
  readonly bytes?: Uint8Array;
  readonly mediaType?: ResolvedRuntimeAssetEntryV1["mediaType"];
  readonly byteLength?: number;
  readonly sha256?: ResolvedRuntimeAssetEntryV1["sha256"];
  readonly width?: number;
  readonly height?: number;
}

function createManifestV1(
  providers: readonly RuntimeProviderFixtureV1[],
  fallbackAssetIds: readonly string[] = [],
): ResolvedAssetManifestV1 {
  const providerByAssetId = new Map<string, RuntimeProviderFixtureV1>();
  for (const provider of providers) {
    if (providerByAssetId.has(provider.assetId)) {
      throw new TypeError(`duplicate test provider: ${provider.assetId}`);
    }
    providerByAssetId.set(provider.assetId, provider);
  }

  const slots: Array<ResolvedAssetManifestV1["slots"][number]> = [
    ...fallbackAssetIds.map((assetId) => ({
      assetId,
      kind: "background" as const,
      usage: "scene_background" as const,
      overridePolicy: "replaceable" as const,
      fallbackToken: `${assetId}.fallback`,
      width: oneV1,
      height: oneV1,
      loadGroup: "scene" as const,
      safeArea: null,
      pivot: null,
    })),
    ...providers
      .filter(({ assetId }, index) => {
        return providers.findIndex((provider) => provider.assetId === assetId) === index;
      })
      .filter(({ assetId }) => !fallbackAssetIds.includes(assetId))
      .map(({ assetId, width = 1, height = 1 }) => ({
        assetId,
        kind: "background" as const,
        usage: "scene_background" as const,
        overridePolicy: "replaceable" as const,
        fallbackToken: `${assetId}.fallback`,
        width: parsePositiveSafeInteger(width),
        height: parsePositiveSafeInteger(height),
        loadGroup: "scene" as const,
        safeArea: null,
        pivot: null,
      })),
  ];
  const assets: Array<ResolvedAssetManifestV1["assets"][number]> = slots.map((slot) => {
    const fixture = providerByAssetId.get(slot.assetId);
    if (!fixture) {
      return {
        ...slot,
        delivery: "code_fallback",
        provider: null,
        overrideChain: Object.freeze([]),
      };
    }

    const bytes = fixture.bytes ?? validPngV1;
    return {
      ...slot,
      runtimePath: fixture.runtimePath,
      mediaType: fixture.mediaType ?? "image/png",
      byteLength: parsePositiveSafeInteger(fixture.byteLength ?? bytes.byteLength),
      sha256: fixture.sha256 ?? digestBytes(bytes),
      delivery: "runtime_image",
      provider: providerRefV1,
      overrideChain: Object.freeze([providerRefV1]),
    };
  });

  return {
    packs: providers.length === 0 ? Object.freeze([]) : Object.freeze([providerIdentityV1]),
    slots: Object.freeze(slots),
    assets: Object.freeze(assets),
  };
}

function overrideRuntimeProviderV1(
  manifest: ResolvedAssetManifestV1,
  assetId: string,
  overrides: Partial<ResolvedRuntimeAssetEntryV1>,
): ResolvedAssetManifestV1 {
  return {
    ...manifest,
    assets: manifest.assets.map((asset) => {
      return asset.assetId === assetId && asset.delivery === "runtime_image"
        ? { ...asset, ...overrides }
        : asset;
    }),
  };
}

function createEnvironmentV1(
  input: {
    readonly files?: ReadonlyMap<string, Uint8Array>;
    readonly realpaths?: ReadonlyMap<string, string>;
    readonly reads?: string[];
    readonly realpathReads?: string[];
  } = {},
): RuntimeAssetValidationEnvironmentV1 {
  const files = input.files ?? new Map<string, Uint8Array>();
  const realpaths = input.realpaths ?? new Map<string, string>();
  return {
    repositoryRoot: "/repo/project-tavern",
    async readFile(path) {
      input.reads?.push(path);
      const bytes = files.get(path);
      if (!bytes) throw new Error(`ENOENT: ${path}`);
      return bytes;
    },
    async realpath(path) {
      input.realpathReads?.push(path);
      return realpaths.get(path) ?? path;
    },
  };
}

describe("runtime asset manifest validation", () => {
  it("reads only exact runtime providers in manifest order and never enumerates source archives", async () => {
    const firstPath = "game/packages/assets/e2e/scene.png";
    const secondPath = "game/stories/poc/assets/menu.png";
    const reads: string[] = [];
    const realpathReads: string[] = [];
    const manifest = createManifestV1(
      [
        { assetId: "scene.first", runtimePath: firstPath },
        { assetId: "scene.second", runtimePath: secondPath },
      ],
      ["scene.fallback"],
    );

    const result = await validateRuntimeAssetManifestV1(
      manifest,
      createEnvironmentV1({
        files: new Map([
          [firstPath, validPngV1],
          [secondPath, validPngV1],
        ]),
        reads,
        realpathReads,
      }),
    );

    expect(result.errors).toEqual([]);
    expect(realpathReads).toEqual([
      ".",
      "game/packages/assets",
      firstPath,
      "game/stories/poc/assets",
      secondPath,
    ]);
    expect(reads).toEqual([firstPath, secondPath]);
    expect(
      reads.every((path) => !path.startsWith("art-source/") && !path.startsWith("references/")),
    ).toBe(true);
  });

  it("performs zero realpath or file reads for a fallback-only manifest", async () => {
    const reads: string[] = [];
    const realpathReads: string[] = [];
    const manifest = createManifestV1([], ["scene.fallback"]);

    const result = await validateRuntimeAssetManifestV1(
      manifest,
      createEnvironmentV1({ reads, realpathReads }),
    );

    expect(result.errors).toEqual([]);
    expect(realpathReads).toEqual([]);
    expect(reads).toEqual([]);
  });

  it.each([
    "/game/packages/assets/scene.png",
    "game/packages/assets/../scene.png",
    "game/packages/assets/./scene.png",
    "game/packages/assets//scene.png",
    "game/packages/assets\\scene.png",
    "game/packages/assets/scene.png?download=1",
    "game/packages/assets/scene.png#fragment",
    "game/packages/assets/scene\0.png",
    "game/packages/assets/%2e%2e/scene.png",
    "game/packages/assets/%2E%2e/scene.png",
    "game/packages/assets/%252e%252e/scene.png",
    "game/packages/assets/%255C..%255Cscene.png",
    "game/packages/assets%2F..%2Fscene.png",
    "game/packages/assets",
    "game/stories/other/assets/scene.png",
    "art-source/aigc/scene.png",
    "references/scene.png",
  ])("rejects unsafe path %j before any filesystem read", async (runtimePath) => {
    const reads: string[] = [];
    const realpathReads: string[] = [];
    const manifest = overrideRuntimeProviderV1(
      createManifestV1([
        { assetId: "scene.unsafe", runtimePath: "game/packages/assets/scene.png" },
      ]),
      "scene.unsafe",
      { runtimePath },
    );

    const result = await validateRuntimeAssetManifestV1(
      manifest,
      createEnvironmentV1({ reads, realpathReads }),
    );

    expect(result.errors).toEqual([{ assetId: "scene.unsafe", code: "asset.runtime_path_unsafe" }]);
    expect(realpathReads).toEqual([]);
    expect(reads).toEqual([]);
  });

  it.each([
    "game/packages/assets/scene.png",
    "game/stories/e2e/assets/scene.png",
    "game/stories/poc/assets/scene.png",
  ])("accepts the exact runtime root for %s", async (runtimePath) => {
    const result = await validateRuntimeAssetManifestV1(
      createManifestV1([{ assetId: "scene.safe", runtimePath }]),
      createEnvironmentV1({ files: new Map([[runtimePath, validPngV1]]) }),
    );

    expect(result.errors).toEqual([]);
  });

  it("accepts a contained runtime file when the checkout root is reached through a symlink", async () => {
    const runtimePath = "game/packages/assets/scene.png";
    const checkoutRoot = "/repo/project-tavern-link";
    const realRepositoryRoot = "/repo/project-tavern";
    const realAllowedRoot = `${realRepositoryRoot}/game/packages/assets`;
    const realpathReads: string[] = [];
    const reads: string[] = [];
    const manifest = createManifestV1([{ assetId: "scene.symlinked-checkout", runtimePath }]);

    const result = await validateRuntimeAssetManifestV1(manifest, {
      repositoryRoot: checkoutRoot,
      async realpath(path) {
        realpathReads.push(path);
        if (path === ".") return realRepositoryRoot;
        if (path === "game/packages/assets") return realAllowedRoot;
        if (path === runtimePath) return `${realAllowedRoot}/scene.png`;
        throw new Error(`unexpected realpath: ${path}`);
      },
      async readFile(path) {
        reads.push(path);
        if (path !== runtimePath) throw new Error(`unexpected read: ${path}`);
        return validPngV1;
      },
    });

    expect(result.errors).toEqual([]);
    expect(realpathReads).toEqual([".", "game/packages/assets", runtimePath]);
    expect(reads).toEqual([runtimePath]);
  });

  it("canonicalizes a shared allowed root once while resolving each exact file once", async () => {
    const firstPath = "game/packages/assets/first.png";
    const secondPath = "game/packages/assets/second.png";
    const realpathReads: string[] = [];
    const reads: string[] = [];
    const result = await validateRuntimeAssetManifestV1(
      createManifestV1([
        { assetId: "scene.first", runtimePath: firstPath },
        { assetId: "scene.second", runtimePath: secondPath },
      ]),
      createEnvironmentV1({
        files: new Map([
          [firstPath, validPngV1],
          [secondPath, validPngV1],
        ]),
        realpathReads,
        reads,
      }),
    );

    expect(result.errors).toEqual([]);
    expect(realpathReads).toEqual([".", "game/packages/assets", firstPath, secondPath]);
    expect(reads).toEqual([firstPath, secondPath]);
  });

  it("rejects an allowed-root symlink outside the canonical repository before resolving a file", async () => {
    const runtimePath = "game/packages/assets/scene.png";
    const realpathReads: string[] = [];
    const reads: string[] = [];
    const result = await validateRuntimeAssetManifestV1(
      createManifestV1([{ assetId: "scene.root-escape", runtimePath }]),
      {
        repositoryRoot: "/repo/project-tavern",
        async realpath(path) {
          realpathReads.push(path);
          if (path === ".") return "/repo/project-tavern";
          if (path === "game/packages/assets") return "/outside/assets";
          throw new Error(`must not resolve file after root escape: ${path}`);
        },
        async readFile(path) {
          reads.push(path);
          throw new Error(`must not read after root escape: ${path}`);
        },
      },
    );

    expect(result.errors).toEqual([
      { assetId: "scene.root-escape", code: "asset.runtime_path_escape" },
    ]);
    expect(realpathReads).toEqual([".", "game/packages/assets"]);
    expect(reads).toEqual([]);
  });

  it("rejects a realpath escape before reading file bytes", async () => {
    const runtimePath = "game/packages/assets/scene.png";
    const reads: string[] = [];
    const result = await validateRuntimeAssetManifestV1(
      createManifestV1([{ assetId: "scene.escape", runtimePath }]),
      createEnvironmentV1({
        files: new Map([[runtimePath, validPngV1]]),
        realpaths: new Map([[runtimePath, "/repo/project-tavern/game/packages/assets-escape/x"]]),
        reads,
      }),
    );

    expect(result.errors).toEqual([{ assetId: "scene.escape", code: "asset.runtime_path_escape" }]);
    expect(reads).toEqual([]);
  });

  it("treats realpath and read failures as a missing runtime file", async () => {
    const runtimePath = "game/packages/assets/missing.png";
    const manifest = createManifestV1([{ assetId: "scene.missing", runtimePath }]);

    const realpathFailure = await validateRuntimeAssetManifestV1(manifest, {
      repositoryRoot: "/repo/project-tavern",
      async realpath() {
        throw new Error("ENOENT");
      },
      async readFile() {
        throw new Error("must not read after realpath failure");
      },
    });
    const readFailure = await validateRuntimeAssetManifestV1(manifest, createEnvironmentV1());

    expect(realpathFailure.errors).toEqual([
      { assetId: "scene.missing", code: "asset.runtime_file_missing" },
    ]);
    expect(readFailure.errors).toEqual([
      { assetId: "scene.missing", code: "asset.runtime_file_missing" },
    ]);
  });

  it.each([
    {
      id: "media-mismatch",
      manifest: createManifestV1([
        {
          assetId: "scene.media",
          runtimePath: "game/packages/assets/scene.svg",
          mediaType: "image/svg+xml",
        },
      ]),
      path: "game/packages/assets/scene.svg",
      bytes: validPngV1,
      code: "asset.runtime_media_mismatch",
    },
    {
      id: "byte-length-mismatch",
      manifest: createManifestV1([
        {
          assetId: "scene.bytes",
          runtimePath: "game/packages/assets/scene.png",
          byteLength: validPngV1.byteLength + 1,
        },
      ]),
      path: "game/packages/assets/scene.png",
      bytes: validPngV1,
      code: "asset.runtime_byte_length_mismatch",
    },
    {
      id: "hash-mismatch",
      manifest: createManifestV1([
        {
          assetId: "scene.hash",
          runtimePath: "game/packages/assets/scene.png",
          sha256: digestBytes(Uint8Array.of(0)),
        },
      ]),
      path: "game/packages/assets/scene.png",
      bytes: validPngV1,
      code: "asset.runtime_hash_mismatch",
    },
    {
      id: "dimension-mismatch",
      manifest: createManifestV1([
        {
          assetId: "scene.dimensions",
          runtimePath: "game/packages/assets/scene.png",
          width: 2,
        },
      ]),
      path: "game/packages/assets/scene.png",
      bytes: validPngV1,
      code: "asset.runtime_dimensions_mismatch",
    },
  ] as const)("rejects $id with $code", async ({ manifest, path, bytes, code }) => {
    const result = await validateRuntimeAssetManifestV1(
      manifest,
      createEnvironmentV1({ files: new Map([[path, bytes]]) }),
    );

    expect(result.errors.map((error) => error.code)).toContain(code);
  });

  it("keeps validating later manifest entries after an unsafe provider", async () => {
    const safePath = "game/stories/e2e/assets/scene.png";
    const reads: string[] = [];
    const result = await validateRuntimeAssetManifestV1(
      overrideRuntimeProviderV1(
        createManifestV1([
          { assetId: "scene.unsafe", runtimePath: "game/packages/assets/unsafe.png" },
          { assetId: "scene.safe", runtimePath: safePath },
        ]),
        "scene.unsafe",
        { runtimePath: "../scene.png" },
      ),
      createEnvironmentV1({
        files: new Map([[safePath, validPngV1]]),
        reads,
      }),
    );

    expect(result.errors).toEqual([{ assetId: "scene.unsafe", code: "asset.runtime_path_unsafe" }]);
    expect(reads).toEqual([safePath]);
  });
});
