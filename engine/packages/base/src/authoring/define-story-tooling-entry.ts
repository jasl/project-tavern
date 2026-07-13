// SPDX-License-Identifier: MIT
import type { StoryToolingEntryV1 } from "../contracts/game-package.js";
import { parseModuleId, parsePositiveSafeInteger } from "../contracts/values.js";
import { deepFreezeAuthoringValueV1 } from "./define-gameplay-module.js";

export function defineStoryToolingEntry<TEntry extends StoryToolingEntryV1<unknown>>(
  entry: TEntry,
): TEntry {
  if (entry.contractRevision !== 1) {
    throw new TypeError("Story tooling contractRevision must be 1");
  }
  parseModuleId(entry.storyIdentity.id);
  parsePositiveSafeInteger(entry.storyIdentity.revision);
  if (typeof entry.defineToolingSupport !== "function" || entry.defineToolingSupport.length !== 0) {
    throw new TypeError("defineToolingSupport must be a zero-argument function");
  }
  return deepFreezeAuthoringValueV1(entry);
}
