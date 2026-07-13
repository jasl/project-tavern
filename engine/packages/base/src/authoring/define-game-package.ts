// SPDX-License-Identifier: MIT
import type { GamePackageV1 } from "../contracts/game-package.js";
import { parseModuleId, parsePositiveSafeInteger } from "../contracts/values.js";
import { deepFreezeAuthoringValueV1 } from "./define-gameplay-module.js";

export function defineGamePackage<
  TSimulationFacet,
  TPresentationFacet,
  TPackage extends GamePackageV1<TSimulationFacet, TPresentationFacet>,
>(entry: TPackage): TPackage {
  if (entry.contractRevision !== 1) {
    throw new TypeError("GamePackage contractRevision must be 1");
  }
  parseModuleId(entry.identity.id);
  parsePositiveSafeInteger(entry.identity.revision);
  if (typeof entry.define !== "function" || entry.define.length !== 0) {
    throw new TypeError("GamePackage define must be a zero-argument function");
  }
  return deepFreezeAuthoringValueV1(entry);
}
