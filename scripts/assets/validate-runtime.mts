// SPDX-License-Identifier: MIT
import { isAbsolute, relative, resolve, sep } from "node:path";

import {
  digestBytes,
  type DeepReadonly,
  type ResolvedAssetManifestV1,
} from "../../engine/packages/base/src/index.js";

import { readRuntimeImageMetadataV1 } from "./runtime-image-metadata.mjs";

const allowedRuntimeRootsV1 = Object.freeze([
  "game/packages/assets/",
  "game/stories/e2e/assets/",
  "game/stories/poc/assets/",
] as const);

type AllowedRuntimeRootV1 = (typeof allowedRuntimeRootsV1)[number];

type CanonicalRootResultV1 =
  | { readonly kind: "valid"; readonly path: string }
  | { readonly kind: "missing" }
  | { readonly kind: "escape" };

export interface RuntimeAssetValidationEnvironmentV1 {
  readonly repositoryRoot: string;
  readFile(repositoryRelativePath: string): Promise<Uint8Array>;
  realpath(repositoryRelativePath: string): Promise<string>;
}

export interface RuntimeAssetValidationErrorV1 {
  readonly assetId: string;
  readonly code:
    | "asset.runtime_path_unsafe"
    | "asset.runtime_path_escape"
    | "asset.runtime_file_missing"
    | "asset.runtime_media_mismatch"
    | "asset.runtime_byte_length_mismatch"
    | "asset.runtime_hash_mismatch"
    | "asset.runtime_dimensions_mismatch";
}

function declaredRuntimeRootV1(runtimePath: string): AllowedRuntimeRootV1 | undefined {
  return allowedRuntimeRootsV1.find((root) => runtimePath.startsWith(root));
}

function safeRuntimePathV1(runtimePath: string): AllowedRuntimeRootV1 | undefined {
  if (
    runtimePath.length === 0 ||
    isAbsolute(runtimePath) ||
    runtimePath.includes("\\") ||
    runtimePath.includes("?") ||
    runtimePath.includes("#") ||
    runtimePath.includes("\0") ||
    /%(?:00|23|25|2e|2f|3f|5c)/iu.test(runtimePath)
  ) {
    return undefined;
  }

  const segments = runtimePath.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return undefined;
  }

  return declaredRuntimeRootV1(runtimePath);
}

function strictlyContainedByRootV1(root: string, candidate: string): boolean {
  const relation = relative(root, candidate);
  return (
    relation !== "" &&
    relation !== ".." &&
    !relation.startsWith(`..${sep}`) &&
    !isAbsolute(relation)
  );
}

function absoluteRealpathV1(repositoryRoot: string, canonicalPath: string): string {
  return isAbsolute(canonicalPath)
    ? resolve(canonicalPath)
    : resolve(repositoryRoot, canonicalPath);
}

function validationErrorV1(
  assetId: string,
  code: RuntimeAssetValidationErrorV1["code"],
): RuntimeAssetValidationErrorV1 {
  return Object.freeze({ assetId, code });
}

export async function validateRuntimeAssetManifestV1(
  manifest: DeepReadonly<ResolvedAssetManifestV1>,
  environment: RuntimeAssetValidationEnvironmentV1,
): Promise<{ readonly errors: readonly RuntimeAssetValidationErrorV1[] }> {
  const errors: RuntimeAssetValidationErrorV1[] = [];
  const repositoryRoot = resolve(environment.repositoryRoot);
  let canonicalRepositoryRootPromise: Promise<CanonicalRootResultV1> | undefined;
  const canonicalAllowedRootPromises = new Map<
    AllowedRuntimeRootV1,
    Promise<CanonicalRootResultV1>
  >();

  const canonicalRepositoryRootV1 = (): Promise<CanonicalRootResultV1> => {
    canonicalRepositoryRootPromise ??= (async () => {
      try {
        const repositoryRealpath = await environment.realpath(".");
        return Object.freeze({
          kind: "valid" as const,
          path: absoluteRealpathV1(repositoryRoot, repositoryRealpath),
        });
      } catch {
        return Object.freeze({ kind: "missing" as const });
      }
    })();
    return canonicalRepositoryRootPromise;
  };

  const canonicalAllowedRootV1 = (
    declaredRoot: AllowedRuntimeRootV1,
  ): Promise<CanonicalRootResultV1> => {
    const cached = canonicalAllowedRootPromises.get(declaredRoot);
    if (cached) return cached;

    const pending = (async (): Promise<CanonicalRootResultV1> => {
      const canonicalRepositoryRoot = await canonicalRepositoryRootV1();
      if (canonicalRepositoryRoot.kind !== "valid") return canonicalRepositoryRoot;

      let allowedRootRealpath: string;
      try {
        allowedRootRealpath = await environment.realpath(declaredRoot.slice(0, -1));
      } catch {
        return Object.freeze({ kind: "missing" as const });
      }

      const canonicalAllowedRoot = absoluteRealpathV1(repositoryRoot, allowedRootRealpath);
      if (!strictlyContainedByRootV1(canonicalRepositoryRoot.path, canonicalAllowedRoot)) {
        return Object.freeze({ kind: "escape" as const });
      }
      return Object.freeze({ kind: "valid" as const, path: canonicalAllowedRoot });
    })();
    canonicalAllowedRootPromises.set(declaredRoot, pending);
    return pending;
  };

  for (const asset of manifest.assets) {
    if (asset.delivery !== "runtime_image") continue;

    const declaredRoot = safeRuntimePathV1(asset.runtimePath);
    if (!declaredRoot) {
      errors.push(validationErrorV1(asset.assetId, "asset.runtime_path_unsafe"));
      continue;
    }

    const canonicalDeclaredRoot = await canonicalAllowedRootV1(declaredRoot);
    if (canonicalDeclaredRoot.kind !== "valid") {
      errors.push(
        validationErrorV1(
          asset.assetId,
          canonicalDeclaredRoot.kind === "escape"
            ? "asset.runtime_path_escape"
            : "asset.runtime_file_missing",
        ),
      );
      continue;
    }

    let runtimeRealpath: string;
    try {
      runtimeRealpath = await environment.realpath(asset.runtimePath);
    } catch {
      errors.push(validationErrorV1(asset.assetId, "asset.runtime_file_missing"));
      continue;
    }

    const absoluteRuntimeRealpath = isAbsolute(runtimeRealpath)
      ? resolve(runtimeRealpath)
      : resolve(repositoryRoot, runtimeRealpath);
    if (!strictlyContainedByRootV1(canonicalDeclaredRoot.path, absoluteRuntimeRealpath)) {
      errors.push(validationErrorV1(asset.assetId, "asset.runtime_path_escape"));
      continue;
    }

    let bytes: Uint8Array;
    try {
      bytes = await environment.readFile(asset.runtimePath);
    } catch {
      errors.push(validationErrorV1(asset.assetId, "asset.runtime_file_missing"));
      continue;
    }

    const metadataResult = readRuntimeImageMetadataV1(bytes, asset.mediaType);
    const mediaMismatch =
      metadataResult.kind === "invalid"
        ? metadataResult.code !== "invalid_dimensions"
        : metadataResult.metadata.mediaType !== asset.mediaType;
    const dimensionsMismatch =
      metadataResult.kind === "invalid"
        ? metadataResult.code === "invalid_dimensions"
        : metadataResult.metadata.width !== asset.width ||
          metadataResult.metadata.height !== asset.height;

    if (mediaMismatch) {
      errors.push(validationErrorV1(asset.assetId, "asset.runtime_media_mismatch"));
    }
    if (bytes.byteLength !== asset.byteLength) {
      errors.push(validationErrorV1(asset.assetId, "asset.runtime_byte_length_mismatch"));
    }
    if (digestBytes(bytes) !== asset.sha256) {
      errors.push(validationErrorV1(asset.assetId, "asset.runtime_hash_mismatch"));
    }
    if (dimensionsMismatch) {
      errors.push(validationErrorV1(asset.assetId, "asset.runtime_dimensions_mismatch"));
    }
  }

  return Object.freeze({ errors: Object.freeze(errors) });
}
