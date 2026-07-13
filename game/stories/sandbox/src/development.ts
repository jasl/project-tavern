// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  defineStoryToolingEntry,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
} from "@sillymaker/base";

import type { SandboxCommandV1 } from "./contracts.js";

export const sandboxToolingEntryV1 = defineStoryToolingEntry({
  contractRevision: 1,
  storyIdentity: Object.freeze({ id: "story.sandbox", revision: parsePositiveSafeInteger(1) }),
  defineToolingSupport() {
    return Object.freeze({
      fixtures: Object.freeze([
        Object.freeze({
          fixtureId: "fixture.sandbox.session-zero",
          seed: parseNonZeroUint32(0x0002_3049),
          commands: Object.freeze([]) as readonly SandboxCommandV1[],
        }),
      ]),
      notes: Object.freeze([]) as readonly string[],
      driver: Object.freeze({
        commandSequence: Object.freeze([
          Object.freeze({ kind: "sandbox.counter.increment" as const }),
        ]),
      }),
    });
  },
});
