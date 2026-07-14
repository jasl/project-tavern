// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  defineStoryToolingEntry,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
} from "@sillymaker/base";

import type { E2eGameCommandV1 } from "./gameplay/contracts/index.js";
import { e2eDebugCommandFormAdapterV1 } from "./tooling/debug-command-form-adapter.js";
import { createE2eFixtureResolverV1, e2eFixtureIdsV1 } from "./tooling/fixture-resolver.js";
import type { E2eToolingFixtureV1 } from "./tooling/fixture-resolver.js";

export {
  e2eDebugCommandFormAdapterV1,
  e2eDebugCommandKindsV1,
} from "./tooling/debug-command-form-adapter.js";
export { createE2eFixtureResolverV1, e2eFixtureIdsV1 } from "./tooling/fixture-resolver.js";
export type {
  E2eFixtureIdV1,
  E2eFixtureResolutionV1,
  E2eFixtureResolverV1,
  E2eToolingFixtureV1,
} from "./tooling/fixture-resolver.js";

const e2eFixtureSeedV1 = parseNonZeroUint32(0x0002_3049);

const e2eToolingFixturesV1 = Object.freeze([
  Object.freeze({
    fixtureId: e2eFixtureIdsV1[0],
    seed: e2eFixtureSeedV1,
    commands: Object.freeze([]) satisfies readonly E2eGameCommandV1[],
  }),
  Object.freeze({
    fixtureId: e2eFixtureIdsV1[1],
    seed: e2eFixtureSeedV1,
    commands: Object.freeze([
      Object.freeze({ kind: "e2e.flow.start" as const }),
      Object.freeze({ kind: "e2e.flow.choose" as const, choice: "left" as const }),
    ]),
  }),
  Object.freeze({
    fixtureId: e2eFixtureIdsV1[2],
    seed: e2eFixtureSeedV1,
    commands: Object.freeze([
      Object.freeze({ kind: "e2e.flow.start" as const }),
      Object.freeze({ kind: "e2e.flow.choose" as const, choice: "right" as const }),
    ]),
  }),
  Object.freeze({
    fixtureId: e2eFixtureIdsV1[3],
    seed: e2eFixtureSeedV1,
    commands: Object.freeze([
      Object.freeze({ kind: "e2e.flow.start" as const }),
      Object.freeze({ kind: "e2e.flow.choose" as const, choice: "right" as const }),
      Object.freeze({ kind: "e2e.flow.continue" as const }),
      Object.freeze({ kind: "e2e.run.complete" as const }),
    ]),
  }),
] satisfies readonly E2eToolingFixtureV1[]);

export const e2eToolingEntryV1 = defineStoryToolingEntry({
  contractRevision: 1,
  storyIdentity: Object.freeze({ id: "story.e2e", revision: parsePositiveSafeInteger(1) }),
  defineToolingSupport() {
    return Object.freeze({
      fixtures: e2eToolingFixturesV1,
      notes: Object.freeze([]) satisfies readonly string[],
      debugCommandFormAdapter: e2eDebugCommandFormAdapterV1,
      createFixtureResolver: createE2eFixtureResolverV1,
    });
  },
});
