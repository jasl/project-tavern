// SPDX-License-Identifier: MIT
import type { StoryDevelopmentEntryV1 } from "../contracts/game-package.js";
import {
  parseModuleId,
  parsePositiveSafeInteger,
} from "../contracts/values.js";
import { deepFreezeAuthoringValueV1 } from "./define-game-module.js";

export function defineStoryDevelopmentEntry<
  TEntry extends StoryDevelopmentEntryV1<unknown>,
>(entry: TEntry): TEntry {
  if (entry.contractRevision !== 1) {
    throw new TypeError("Story development contractRevision must be 1");
  }
  parseModuleId(entry.storyIdentity.id);
  parsePositiveSafeInteger(entry.storyIdentity.revision);
  if (
    typeof entry.defineDevelopmentSupport !== "function" ||
    entry.defineDevelopmentSupport.length !== 0
  ) {
    throw new TypeError(
      "defineDevelopmentSupport must be a zero-argument function",
    );
  }
  return deepFreezeAuthoringValueV1(entry);
}
