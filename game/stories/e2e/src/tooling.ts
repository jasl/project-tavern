// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  defineStoryToolingEntry,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
} from "@sillymaker/base";

import type { E2eGameCommandV1 } from "./gameplay/contracts/index.js";

const e2eFixtureSeedV1 = parseNonZeroUint32(0x0002_3049);

const e2eToolingFixturesV1 = Object.freeze([
  Object.freeze({
    fixtureId: "fixture.e2e.initial",
    seed: e2eFixtureSeedV1,
    commands: Object.freeze([]) satisfies readonly E2eGameCommandV1[],
  }),
  Object.freeze({
    fixtureId: "fixture.e2e.choice-left-blocked",
    seed: e2eFixtureSeedV1,
    commands: Object.freeze([
      Object.freeze({ kind: "e2e.flow.start" as const }),
      Object.freeze({ kind: "e2e.flow.choose" as const, choice: "left" as const }),
    ]),
  }),
  Object.freeze({
    fixtureId: "fixture.e2e.choice-right-blocked",
    seed: e2eFixtureSeedV1,
    commands: Object.freeze([
      Object.freeze({ kind: "e2e.flow.start" as const }),
      Object.freeze({ kind: "e2e.flow.choose" as const, choice: "right" as const }),
    ]),
  }),
  Object.freeze({
    fixtureId: "fixture.e2e.terminal",
    seed: e2eFixtureSeedV1,
    commands: Object.freeze([
      Object.freeze({ kind: "e2e.flow.start" as const }),
      Object.freeze({ kind: "e2e.flow.choose" as const, choice: "right" as const }),
      Object.freeze({ kind: "e2e.flow.continue" as const }),
      Object.freeze({ kind: "e2e.run.complete" as const }),
    ]),
  }),
] satisfies readonly {
  readonly fixtureId: string;
  readonly seed: typeof e2eFixtureSeedV1;
  readonly commands: readonly E2eGameCommandV1[];
}[]);

export const e2eToolingEntryV1 = defineStoryToolingEntry({
  contractRevision: 1,
  storyIdentity: Object.freeze({ id: "story.e2e", revision: parsePositiveSafeInteger(1) }),
  defineToolingSupport() {
    return Object.freeze({
      fixtures: e2eToolingFixturesV1,
      notes: Object.freeze([]) satisfies readonly string[],
    });
  },
});
