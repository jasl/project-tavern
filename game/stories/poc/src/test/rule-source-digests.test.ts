// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { digestBytes, digestCanonical } from "@sillymaker/base";
import type { RuleRngV1 } from "@sillymaker/base";

import { createPocCheckResolverV1 } from "../gameplay/resolvers/check-resolver.js";
import { createPocTavernSettlementResolverV1 } from "../gameplay/resolvers/tavern-settlement-resolver.js";
import { createPocRuleProvidersV1 } from "../gameplay/rule-providers.js";
import { createPocDemandRulesV1 } from "../gameplay/rules/demand-rules.js";
import { createPocEndingRuleV1 } from "../gameplay/rules/ending-rule.js";
import type {
  CheckInputV1,
  DemandProjectionInputV1,
  DemandSeedInputV1,
  EndingInputV1,
  OpeningActorInputsV1,
  OpeningSessionV1,
  TavernPlanV1,
  TavernPreviewInputV1,
} from "../gameplay/contracts/types.js";
import {
  parseAttributeBonus,
  parseMoney,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseQuantity,
  parseSafeInteger,
} from "../gameplay/contracts/values.js";
import { pocWorkflowStateSchemaV1 } from "../gameplay/modules/workflow/contract.js";
import {
  pocChecksDescribeProviderSourceDigestV1,
  pocChecksResolveProviderSourceDigestV1,
  pocDemandPreviewProviderSourceDigestV1,
  pocDemandResolveProviderSourceDigestV1,
  pocEndingsEvaluateProviderSourceDigestV1,
  pocTavernPreviewProviderSourceDigestV1,
  pocTavernSettleProviderSourceDigestV1,
} from "../rule-source-digests.generated.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

const { collectManagedPaths } = (await import(
  new URL("../../../../../scripts/collect-import-closure.mjs", import.meta.url).href
)) as {
  readonly collectManagedPaths: (
    root: string,
    entries: readonly string[],
  ) => Promise<readonly string[]>;
};
const repositoryRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
const digestFixtures = Object.freeze([
  Object.freeze({
    symbolId: "demand.preview",
    entryPath: "game/stories/poc/src/gameplay/rule-provider-entries/demand.ts",
    generated: pocDemandPreviewProviderSourceDigestV1,
  }),
  Object.freeze({
    symbolId: "demand.resolve",
    entryPath: "game/stories/poc/src/gameplay/rule-provider-entries/demand.ts",
    generated: pocDemandResolveProviderSourceDigestV1,
  }),
  Object.freeze({
    symbolId: "tavern.preview",
    entryPath: "game/stories/poc/src/gameplay/rule-provider-entries/tavern.ts",
    generated: pocTavernPreviewProviderSourceDigestV1,
  }),
  Object.freeze({
    symbolId: "tavern.settle",
    entryPath: "game/stories/poc/src/gameplay/rule-provider-entries/tavern.ts",
    generated: pocTavernSettleProviderSourceDigestV1,
  }),
  Object.freeze({
    symbolId: "checks.describe",
    entryPath: "game/stories/poc/src/gameplay/rule-provider-entries/checks.ts",
    generated: pocChecksDescribeProviderSourceDigestV1,
  }),
  Object.freeze({
    symbolId: "checks.resolve",
    entryPath: "game/stories/poc/src/gameplay/rule-provider-entries/checks.ts",
    generated: pocChecksResolveProviderSourceDigestV1,
  }),
  Object.freeze({
    symbolId: "endings.evaluate",
    entryPath: "game/stories/poc/src/gameplay/rule-provider-entries/endings.ts",
    generated: pocEndingsEvaluateProviderSourceDigestV1,
  }),
]);

async function recomputeSourceDigestV1(symbolId: string, entryPath: string) {
  const paths = await collectManagedPaths(repositoryRoot, [entryPath]);
  const records = await Promise.all(
    paths.map(async (path: string) => ({
      path,
      sha256: digestBytes(new Uint8Array(await readFile(join(repositoryRoot, path)))),
    })),
  );
  return digestCanonical("sillymaker:patch-provider:v1", { symbolId, records });
}

function zeroRuleRngV1(): RuleRngV1 {
  return {
    nextInt() {
      return parseNonNegativeSafeInteger(0);
    },
    candidateState() {
      throw new TypeError("parity RNG has no candidate state");
    },
    attemptedDraws() {
      return [];
    },
  };
}

function requireFirstV1<T>(values: readonly T[], label: string): T {
  const value = values[0];
  if (value === undefined) throw new TypeError(`missing parity ${label}`);
  return value;
}

describe("PoC Rule provider source digests", () => {
  it.each(digestFixtures)(
    "binds $symbolId to its exact sorted live import closure",
    async ({ symbolId, entryPath, generated }) => {
      expect(generated).toBe(await recomputeSourceDigestV1(symbolId, entryPath));
    },
  );

  it("keeps every slot identity in its digest even when two slots share a closure", () => {
    expect(new Set(digestFixtures.map(({ generated }) => generated))).toHaveLength(
      digestFixtures.length,
    );
    expect(pocDemandPreviewProviderSourceDigestV1).not.toBe(pocDemandResolveProviderSourceDigestV1);
    expect(pocTavernPreviewProviderSourceDigestV1).not.toBe(pocTavernSettleProviderSourceDigestV1);
    expect(pocChecksDescribeProviderSourceDigestV1).not.toBe(
      pocChecksResolveProviderSourceDigestV1,
    );
  });

  it("assembles all seven exact raw provider behaviors without member remapping", () => {
    const fixture = createPocGameplayFixtureV1();
    const data = fixture.program.data;
    const assembled = createPocRuleProvidersV1(data);
    const rawDemand = createPocDemandRulesV1(data);
    const rawTavern = createPocTavernSettlementResolverV1(data);
    const rawChecks = createPocCheckResolverV1(data);
    const rawEndings = createPocEndingRuleV1(data);
    const demandLine = requireFirstV1(data.balance.baseDemand, "demand line");
    const demandSeedInput: DemandSeedInputV1 = {
      runId: fixture.bootstrap.runId,
      segments: [
        {
          day: demandLine.day,
          segmentId: demandLine.segmentId,
          baseCustomers: demandLine.customers,
        },
      ],
    };
    const demandPreviewInput: DemandProjectionInputV1 = {
      day: demandLine.day,
      seeds: [
        {
          segmentId: demandLine.segmentId,
          baseCustomers: demandLine.customers,
          randomOffset: 0,
        },
      ],
      reputation: fixture.snapshot.state.simulation.tavern.reputation,
      facts: fixture.snapshot.state.story.facts,
      modifiers: [],
    };

    expect(assembled.demand.preview(demandPreviewInput)).toEqual(
      rawDemand.preview(demandPreviewInput),
    );
    expect(assembled.demand.resolve(demandSeedInput, zeroRuleRngV1())).toEqual(
      rawDemand.resolve(demandSeedInput, zeroRuleRngV1()),
    );

    const recipe = requireFirstV1(data.content.recipes, "recipe");
    const ingredient = requireFirstV1(recipe.ingredients, "recipe ingredient");
    const mode = requireFirstV1(
      data.balance.serviceModes.filter(({ mode: candidate }) => candidate === "manual"),
      "manual service mode",
    );
    const plan: TavernPlanV1 = {
      mode: mode.mode,
      menu: [{ recipeId: recipe.recipeId, portions: parseQuantity(1) }],
    };
    const actors: OpeningActorInputsV1 = {
      playerAttributes: fixture.snapshot.state.simulation.actors.player.attributes,
      heroineMood: fixture.snapshot.state.simulation.actors.heroine.mood,
      relationship: fixture.snapshot.state.simulation.actors.relationship,
      helper: fixture.snapshot.state.simulation.tavern.helper,
    };
    const materializedDemand = [
      {
        segmentId: demandLine.segmentId,
        preview: { min: parseSafeInteger(1), max: parseSafeInteger(1) },
        actualCustomers: parseNonNegativeSafeInteger(1),
        modifiers: [],
      },
    ];
    const tavernPreviewInput: TavernPreviewInputV1 = {
      basis: "current_state",
      day: demandLine.day,
      plan,
      preparationActionCount: parseNonNegativeSafeInteger(0),
      availableIngredients: [{ ingredientId: ingredient.ingredientId, quantity: parseQuantity(1) }],
      demand: materializedDemand,
      actors,
      facilityIds: [],
      modifiers: [],
      resources: {
        apRemaining: parseNonNegativeSafeInteger(2),
        cash: parseMoney(100),
        playerStamina: parseNonNegativeSafeInteger(10),
        heroineStamina: parseNonNegativeSafeInteger(10),
      },
    };
    expect(assembled.tavern.preview(tavernPreviewInput)).toEqual(
      rawTavern.preview(tavernPreviewInput),
    );

    const workflow = pocWorkflowStateSchemaV1.parse({
      kind: "opening",
      sessionId: "opening:1",
      checkpoint: "ready_to_finalize",
      baseline: {
        startedAtSequence: parsePositiveSafeInteger(1),
        day: demandLine.day,
        mode: mode.mode,
        preparationActionCount: parseNonNegativeSafeInteger(0),
        ap: { before: 2, after: 1 },
        playerStamina: { before: 10, after: 9 },
        heroineStamina: { before: 10, after: 9 },
        cashAtStart: { before: 100, after: 100 },
        reputationBeforeStart: fixture.snapshot.state.simulation.tavern.reputation,
        menu: plan.menu,
        preparedPortions: plan.menu,
        consumedIngredients: [
          {
            batchId: "batch:1:0",
            ingredientId: ingredient.ingredientId,
            quantity: parseQuantity(1),
          },
        ],
        demand: materializedDemand,
        actors,
        facilityIds: [],
        modifiers: [],
        startEntryIds: [],
      },
      triggeredEventIds: [],
      sessionModifiers: [],
      blockingEvent: null,
    });
    if (workflow?.kind !== "opening") throw new TypeError("invalid parity opening session");
    const session: OpeningSessionV1 = workflow;
    expect(assembled.tavern.settle({ session }, zeroRuleRngV1())).toEqual(
      rawTavern.settle({ session }, zeroRuleRngV1()),
    );

    const check = requireFirstV1(data.content.checks, "check");
    const checkInput: CheckInputV1 = {
      checkId: check.checkId,
      actorId: fixture.snapshot.state.simulation.actors.player.actorId,
      attribute: check.attribute,
      rank: "C",
      attributeBonus: parseAttributeBonus(0),
      preparationBonus: parseSafeInteger(0),
      modifiers: [],
      bands: check.bands,
    };
    expect(assembled.checks.describe(checkInput)).toEqual(rawChecks.describe(checkInput));
    expect(assembled.checks.resolve(checkInput, zeroRuleRngV1())).toEqual(
      rawChecks.resolve(checkInput, zeroRuleRngV1()),
    );

    const endingInput: EndingInputV1 = {
      cash: parseMoney(20),
      levy: {
        kind: "paid",
        levyAmount: parseMoney(10),
        cash: { before: parseMoney(30), after: parseMoney(20) },
      },
      reputation: parseNonNegativeSafeInteger(50),
      facilityIds: [requireFirstV1(data.content.facilities, "facility").facilityId],
      relationship: fixture.snapshot.state.simulation.actors.relationship,
      facts: fixture.snapshot.state.story.facts,
      quests: fixture.snapshot.state.story.quests,
      outcomes: fixture.snapshot.state.story.outcomes,
      auras: fixture.snapshot.state.simulation.status.auras,
    };
    expect(assembled.endings.evaluate(endingInput)).toEqual(rawEndings.evaluate(endingInput));
  });
});
