// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { canonicalJsonBytes } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import {
  pocReferenceToolingFixtureByStrategyIdV1,
  pocStoryToolingFixturesV1,
} from "../tooling-fixtures.js";
import { compilePocToolingCommandsV1 } from "../testing/compile-reference-strategy.js";
import { buildPocGoldenArtifactV1, readPocGoldenFixtureV1 } from "../testing/golden-artifact.js";
import { pocReferenceStrategyIdsV1 } from "../testing/reference-strategy-definitions.js";
import { readPocCommandFixtureV1 } from "../testing/run-reference-strategy.js";

describe("PoC provisional golden weeks", () => {
  it("owns exactly six deeply frozen synchronous tooling fixtures", () => {
    expect(pocStoryToolingFixturesV1).toHaveLength(pocReferenceStrategyIdsV1.length);
    expect(Object.isFrozen(pocStoryToolingFixturesV1)).toBe(true);
    expect(new Set(pocStoryToolingFixturesV1.map(({ fixtureId }) => fixtureId)).size).toBe(
      pocStoryToolingFixturesV1.length,
    );
    for (const strategyId of pocReferenceStrategyIdsV1) {
      const fixture = pocReferenceToolingFixtureByStrategyIdV1[strategyId];
      expect(pocStoryToolingFixturesV1).toContain(fixture);
      expect(Object.isFrozen(fixture)).toBe(true);
      expect(Object.isFrozen(fixture.commands)).toBe(true);
      expect(fixture.commands.length).toBeGreaterThan(0);
    }
  });

  for (const strategyId of pocReferenceStrategyIdsV1) {
    it(`${strategyId} equals its reviewed command and golden artifacts`, async () => {
      const source = pocReferenceToolingFixtureByStrategyIdV1[strategyId];
      const commands = await compilePocToolingCommandsV1(strategyId, source.commands);
      const storedCommands = await readPocCommandFixtureV1(strategyId);
      expect(canonicalJsonBytes(commands)).toEqual(canonicalJsonBytes(storedCommands));

      const actual = await buildPocGoldenArtifactV1(strategyId, source.commands);
      const stored = await readPocGoldenFixtureV1(strategyId);
      expect(canonicalJsonBytes(actual)).toEqual(canonicalJsonBytes(stored));
      expect(actual.attempts.map(({ order }) => order)).toEqual(
        source.commands.map((_, order) => order),
      );
      expect(actual.attempts.map(({ commandSequenceBefore }) => commandSequenceBefore)).toEqual(
        source.commands.map((_, order) => order),
      );
      expect(actual.nights).toHaveLength(6);
      expect(actual.nights.map(({ day }) => day)).toEqual([1, 2, 3, 4, 5, 6]);
      expect(actual.integrity.mode).toBe("normal");
      expect(actual.terminal.summary).toBeDefined();
    }, 15_000);
  }
});
