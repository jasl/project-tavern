// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import type { DeepReadonly, NonZeroUint32 } from "@sillymaker/base";

import type { FixtureId, PocGameCommandV1 } from "../gameplay/index.js";

export interface PocStoryToolingFixtureV1 {
  readonly fixtureId: FixtureId;
  readonly seed: NonZeroUint32;
  readonly commands: readonly DeepReadonly<PocGameCommandV1>[];
}

/**
 * The Story currently ships no fixture presets. Authors can still inject
 * ephemeral fixtures while exercising the generic DebugTools integration.
 */
export const pocStoryToolingFixturesV1 = Object.freeze(
  [],
) as readonly DeepReadonly<PocStoryToolingFixtureV1>[];
