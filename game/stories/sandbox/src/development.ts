// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  defineStoryDevelopmentEntry,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
} from "@sillymaker/base";

import type { SandboxCommandV1 } from "./contracts.js";

export const sandboxDevelopmentEntryV1 = defineStoryDevelopmentEntry({
  contractRevision: 1,
  storyIdentity: Object.freeze({ id: "story.sandbox", revision: parsePositiveSafeInteger(1) }),
  defineDevelopmentSupport() {
    return Object.freeze({
      fixtures: Object.freeze([
        Object.freeze({
          fixtureId: "fixture.sandbox.session-zero",
          seed: parseNonZeroUint32(0x0002_3049),
          commands: Object.freeze([]) as readonly SandboxCommandV1[],
        }),
      ]),
      driver: Object.freeze({
        commandSequence: Object.freeze([
          Object.freeze({ kind: "sandbox.counter.increment" as const }),
        ]),
      }),
    });
  },
});
