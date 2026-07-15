// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import type { DeepReadonly } from "@sillymaker/base";

import {
  pocStoryToolingFixturesV1 as authoritativePocStoryToolingFixturesV1,
  type PocStoryToolingFixtureV1,
} from "../tooling-fixtures.js";

export const pocStoryToolingFixturesV1 = authoritativePocStoryToolingFixturesV1;

export const pocFixtureIdsV1 = Object.freeze(
  pocStoryToolingFixturesV1.map(({ fixtureId }) => fixtureId),
);

export const pocStoryToolingFixtureByIdV1 = Object.freeze(
  Object.fromEntries(pocStoryToolingFixturesV1.map((fixture) => [fixture.fixtureId, fixture])),
) as Readonly<Record<string, DeepReadonly<PocStoryToolingFixtureV1>>>;
