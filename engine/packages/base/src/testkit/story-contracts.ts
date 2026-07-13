// SPDX-License-Identifier: MIT
import type { GamePackageV1 } from "../contracts/game-package.js";
import { resolveGamePackageV1 } from "../authoring/story-resolver.js";
import { deterministicBuildIdentityInputV1 } from "./resolver-fixtures.js";

export function resolveStoryForTestV1<TSimulationFacet, TPresentationFacet>(
  entry: GamePackageV1<TSimulationFacet, TPresentationFacet>,
) {
  const result = resolveGamePackageV1(entry, [], deterministicBuildIdentityInputV1);
  if (result.kind === "failed") {
    throw new TypeError(`${result.failure.code}: ${String(result.failure.details.message)}`);
  }
  return result.resolved;
}

export function validateStoryV1<TSimulationFacet, TPresentationFacet>(
  entry: GamePackageV1<TSimulationFacet, TPresentationFacet>,
): void {
  resolveStoryForTestV1(entry);
}
