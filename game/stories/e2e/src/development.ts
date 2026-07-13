// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  defineStoryToolingEntry,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
} from "@sillymaker/base";

import type { E2eCommandV1 } from "./contracts.js";

export const e2eToolingEntryV1 = defineStoryToolingEntry({
  contractRevision: 1,
  storyIdentity: Object.freeze({ id: "story.e2e", revision: parsePositiveSafeInteger(1) }),
  defineToolingSupport() {
    return Object.freeze({
      fixtures: Object.freeze([
        Object.freeze({
          fixtureId: "fixture.e2e.session-zero",
          seed: parseNonZeroUint32(0x0002_3049),
          commands: Object.freeze([]) as readonly E2eCommandV1[],
        }),
      ]),
      notes: Object.freeze([]) as readonly string[],
      driver: Object.freeze({
        commandSequence: Object.freeze([Object.freeze({ kind: "e2e.counter.increment" as const })]),
      }),
    });
  },
});
