// SPDX-License-Identifier: MIT
import type { GamePackageV1 } from "../contracts/game-package.js";
import type { ResolvedStoryV1 } from "../authoring/story-resolver.js";
import { resolveGamePackageV1 } from "../authoring/story-resolver.js";
import { deterministicBuildIdentityInputV1 } from "./resolver-fixtures.js";

export function resolveStoryForTestV1(
  entry: GamePackageV1<unknown, unknown>,
): ResolvedStoryV1 {
  const result = resolveGamePackageV1(
    entry,
    [],
    deterministicBuildIdentityInputV1,
  );
  if (result.kind === "failed") {
    throw new TypeError(
      `${result.failure.code}: ${String(result.failure.details.message)}`,
    );
  }
  return result.resolved;
}

export function validateStoryV1(
  entry: GamePackageV1<unknown, unknown>,
): void {
  resolveStoryForTestV1(entry);
}
