// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { readFile } from "node:fs/promises";

import { strictJsonRoundTripV1 } from "@sillymaker/base/testkit";
import { describe, expect, it } from "vitest";

import { pocActionDefinitionsV1 } from "../content/actions.js";
import { pocBalanceV1 } from "../content/balance.js";
import {
  pocCheckDefinitionsV1,
  pocEndingDefinitionsV1,
  pocWorldActionDefinitionsV1,
} from "../content/checks-endings.js";
import {
  pocCharacterDefinitionsV1,
  pocCustomerSegmentDefinitionsV1,
  pocItemDefinitionsV1,
  pocModifierSourceDefinitionsV1,
  pocReasonDefinitionsV1,
  pocTextEntriesV1,
} from "../content/core-definitions.js";
import { pocEventDefinitionsV1 } from "../content/events.js";
import {
  pocAuraDefinitionsV1,
  pocFacilityDefinitionsV1,
  pocFacilityOpportunityDefinitionsV1,
} from "../content/facilities-auras.js";
import { sceneIdsV1 } from "../content/ids.js";
import {
  pocIngredientDefinitionsV1,
  pocRecipeDefinitionsV1,
} from "../content/ingredients-recipes.js";
import { pocNarrativeScenesV1 } from "../content/narrative/index.js";
import { pocRelationshipStoryActionDefinitionsV1 } from "../content/narrative/relationship.js";
import {
  pocSimulationDataV1,
  pocStoryDataSchemaV1,
  pocStoryDataV1,
  projectPocSimulationDataV1,
} from "../content/story-data.js";
import {
  createPocGameSimulationV1,
  createPocRulesV1,
  deepFreezePocValueV1,
  parseNonZeroUint32,
  parseRunId,
  pocGameplayModuleDescriptorsV1,
  pocSimulationDataSchemaV1,
  type DeepReadonly,
  type PocStoryDataV1,
} from "../gameplay/index.js";

function omitKeyV1(
  value: Readonly<Record<string, unknown>>,
  omittedKey: string,
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== omittedKey));
}

function expectDeeplyFrozenV1(value: unknown, seen = new WeakSet<object>()): void {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeeplyFrozenV1(nested, seen);
}

describe("PoC complete Story data", () => {
  it("combines all eight Narrative scenes once in authored order", () => {
    expect(pocNarrativeScenesV1.map(({ sceneId }) => sceneId)).toEqual(sceneIdsV1);
    expect(new Set(pocNarrativeScenesV1.map(({ sceneId }) => sceneId)).size).toBe(8);
    expectDeeplyFrozenV1(pocNarrativeScenesV1);
  });

  it("owns one complete source object and projects the exact Simulation shape", () => {
    expect(Object.keys(pocStoryDataV1)).toEqual([
      "dataRevision",
      "manifest",
      "stateDefinitions",
      "initialState",
      "balance",
      "content",
    ]);
    expect(Object.keys(pocStoryDataV1.content)).toEqual([
      "texts",
      "characters",
      "reasons",
      "actions",
      "storyActions",
      "customerSegments",
      "modifierSources",
      "ingredients",
      "items",
      "recipes",
      "facilities",
      "facilityOpportunities",
      "auras",
      "worldActions",
      "events",
      "checks",
      "endings",
      "scenes",
    ]);
    expect(pocStoryDataV1.content).toEqual({
      texts: pocTextEntriesV1,
      characters: pocCharacterDefinitionsV1,
      reasons: pocReasonDefinitionsV1,
      actions: pocActionDefinitionsV1,
      storyActions: pocRelationshipStoryActionDefinitionsV1,
      customerSegments: pocCustomerSegmentDefinitionsV1,
      modifierSources: pocModifierSourceDefinitionsV1,
      ingredients: pocIngredientDefinitionsV1,
      items: pocItemDefinitionsV1,
      recipes: pocRecipeDefinitionsV1,
      facilities: pocFacilityDefinitionsV1,
      facilityOpportunities: pocFacilityOpportunityDefinitionsV1,
      auras: pocAuraDefinitionsV1,
      worldActions: pocWorldActionDefinitionsV1,
      events: pocEventDefinitionsV1,
      checks: pocCheckDefinitionsV1,
      endings: pocEndingDefinitionsV1,
      scenes: pocNarrativeScenesV1,
    });
    expect(pocStoryDataV1.balance).toEqual(pocBalanceV1);

    expect(Object.keys(pocSimulationDataV1)).toEqual([
      "dataRevision",
      "manifest",
      "stateDefinitions",
      "initialState",
      "balance",
      "content",
      "narrative",
    ]);
    expect(pocSimulationDataV1.manifest).toEqual({
      initialSceneId: pocStoryDataV1.manifest.initialSceneId,
      playableDays: pocStoryDataV1.manifest.playableDays,
    });
    expect(Object.keys(pocSimulationDataV1.content)).toEqual([
      "characters",
      "reasons",
      "actions",
      "storyActions",
      "customerSegments",
      "modifierSources",
      "ingredients",
      "items",
      "recipes",
      "facilities",
      "facilityOpportunities",
      "auras",
      "worldActions",
      "events",
      "checks",
      "endings",
    ]);
    expect(pocSimulationDataV1.manifest).not.toHaveProperty("titleTextId");
    expect(pocSimulationDataV1.content).not.toHaveProperty("texts");
    expect(pocSimulationDataV1.content).not.toHaveProperty("scenes");
    expect(pocSimulationDataV1.narrative).toEqual({ scenes: pocStoryDataV1.content.scenes });
    expectDeeplyFrozenV1(pocStoryDataV1);
    expectDeeplyFrozenV1(pocSimulationDataV1);
  });

  it("strictly validates source and projection JSON boundaries", () => {
    expect(strictJsonRoundTripV1(pocStoryDataV1, pocStoryDataSchemaV1)).toEqual(pocStoryDataV1);
    expect(strictJsonRoundTripV1(pocSimulationDataV1, pocSimulationDataSchemaV1)).toEqual(
      pocSimulationDataV1,
    );

    const sourceRecord = pocStoryDataV1 as Readonly<Record<string, unknown>>;
    for (const key of Object.keys(sourceRecord)) {
      expect(() => pocStoryDataSchemaV1.parse(omitKeyV1(sourceRecord, key)), key).toThrow();
    }
    expect(() => pocStoryDataSchemaV1.parse({ ...sourceRecord, extra: true })).toThrow();

    const simulationRecord = pocSimulationDataV1 as unknown as Readonly<Record<string, unknown>>;
    for (const key of Object.keys(simulationRecord)) {
      expect(
        () => pocSimulationDataSchemaV1.parse(omitKeyV1(simulationRecord, key)),
        `simulation.${key}`,
      ).toThrow();
    }
    expect(() =>
      pocSimulationDataSchemaV1.parse({ ...pocSimulationDataV1, extra: true }),
    ).toThrow();

    const manifestRecord = pocStoryDataV1.manifest as Readonly<Record<string, unknown>>;
    for (const key of Object.keys(manifestRecord)) {
      expect(
        () =>
          pocStoryDataSchemaV1.parse({
            ...pocStoryDataV1,
            manifest: omitKeyV1(manifestRecord, key),
          }),
        `manifest.${key}`,
      ).toThrow();
    }
    expect(() =>
      pocStoryDataSchemaV1.parse({
        ...pocStoryDataV1,
        manifest: { ...pocStoryDataV1.manifest, extra: true },
      }),
    ).toThrow();

    const simulationManifestRecord = pocSimulationDataV1.manifest as unknown as Readonly<
      Record<string, unknown>
    >;
    for (const key of Object.keys(simulationManifestRecord)) {
      expect(
        () =>
          pocSimulationDataSchemaV1.parse({
            ...pocSimulationDataV1,
            manifest: omitKeyV1(simulationManifestRecord, key),
          }),
        `simulation.manifest.${key}`,
      ).toThrow();
    }
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...pocSimulationDataV1,
        manifest: { ...pocSimulationDataV1.manifest, extra: true },
      }),
    ).toThrow();

    const contentRecord = pocStoryDataV1.content as Readonly<Record<string, unknown>>;
    for (const key of Object.keys(contentRecord)) {
      expect(
        () =>
          pocStoryDataSchemaV1.parse({
            ...pocStoryDataV1,
            content: omitKeyV1(contentRecord, key),
          }),
        `content.${key}`,
      ).toThrow();
    }
    expect(() =>
      pocStoryDataSchemaV1.parse({
        ...pocStoryDataV1,
        content: { ...pocStoryDataV1.content, presentation: {} },
      }),
    ).toThrow();

    const simulationContentRecord = pocSimulationDataV1.content as unknown as Readonly<
      Record<string, unknown>
    >;
    for (const key of Object.keys(simulationContentRecord)) {
      expect(
        () =>
          pocSimulationDataSchemaV1.parse({
            ...pocSimulationDataV1,
            content: omitKeyV1(simulationContentRecord, key),
          }),
        `simulation.content.${key}`,
      ).toThrow();
    }
    expect(() =>
      pocSimulationDataSchemaV1.parse({
        ...pocSimulationDataV1,
        content: { ...pocSimulationDataV1.content, extra: true },
      }),
    ).toThrow();
  });

  it("rejects unresolved references and non-canonical source values without mutation", () => {
    const unresolvedTextSource = {
      ...pocStoryDataV1,
      content: {
        ...pocStoryDataV1.content,
        characters: pocStoryDataV1.content.characters.map((character, index) =>
          index === 0 ? { ...character, nameTextId: "text.poc.missing" } : character,
        ),
      },
    };
    expect(() => pocStoryDataSchemaV1.parse(unresolvedTextSource)).toThrow();

    const unresolvedOutcomeSource = {
      ...pocStoryDataV1,
      content: {
        ...pocStoryDataV1.content,
        endings: pocStoryDataV1.content.endings.map((ending, index) =>
          index === 0
            ? {
                ...ending,
                summaryOutcomeIds: {
                  ...ending.summaryOutcomeIds,
                  relationship: "outcome.missing",
                },
              }
            : ending,
        ),
      },
    } as unknown as DeepReadonly<PocStoryDataV1>;
    const parsedUnresolvedOutcome = pocStoryDataSchemaV1.parse(unresolvedOutcomeSource);
    expect(() =>
      projectPocSimulationDataV1(parsedUnresolvedOutcome, pocStoryDataV1.balance),
    ).toThrow();

    const before = structuredClone(pocStoryDataV1);
    expect(projectPocSimulationDataV1(pocStoryDataV1, pocStoryDataV1.balance)).toEqual(
      pocSimulationDataV1,
    );
    expect(pocStoryDataV1).toEqual(before);
    expect(() =>
      pocStoryDataSchemaV1.parse({
        ...pocStoryDataV1,
        balance: { ...pocStoryDataV1.balance, levyAmount: Number.NaN },
      }),
    ).toThrow();
    for (const key of ["module", "presentation", "tooling"] as const) {
      expect(() => pocStoryDataSchemaV1.parse({ ...pocStoryDataV1, [key]: {} })).toThrow();
    }
    expect(() =>
      pocStoryDataSchemaV1.parse({
        ...pocStoryDataV1,
        manifest: { ...pocStoryDataV1.manifest, titleTextId: () => undefined },
      }),
    ).toThrow(/value\.function/u);
    const thenableKey = ["t", "h", "e", "n"].join("");
    const thenable = Object.fromEntries([[thenableKey, () => undefined]]);
    expect(() =>
      pocStoryDataSchemaV1.parse({
        ...pocStoryDataV1,
        manifest: { ...pocStoryDataV1.manifest, titleTextId: thenable },
      }),
    ).toThrow(/value\.function/u);
  });

  it("creates the sequence-zero replay base from complete concrete data", () => {
    const program = deepFreezePocValueV1({
      data: pocSimulationDataV1,
      rules: createPocRulesV1(pocSimulationDataV1),
    });
    const bootstrap = deepFreezePocValueV1({
      rngSeed: parseNonZeroUint32(0x0002_3049),
      runId: parseRunId("00000000-0000-4000-8000-000000000201"),
    });
    const simulation = createPocGameSimulationV1(program);
    const state = simulation.createInitialState(bootstrap);

    expect(simulation.modules.map(({ descriptor }) => descriptor)).toEqual(
      pocGameplayModuleDescriptorsV1,
    );
    expect(state.simulation.run.status).toBe("setup");
    expect(state.simulation.calendar).toMatchObject({
      day: 1,
      phase: "morning",
      lifePolicyId: null,
      apRemaining: 0,
    });
    expect(state.simulation.actors.player.attributes.intellect).toBe("B");
    expect(state.simulation.inventory).toMatchObject({ startingCash: 70, cash: 70 });
    expect(state.story.narrative.status).toBe("idle");
    expect(simulation.modules.map((module) => module.createInitialState(bootstrap))).toEqual([
      state.simulation.run,
      state.simulation.calendar,
      state.simulation.actors,
      state.simulation.status,
      state.simulation.inventory,
      state.simulation.facilities,
      state.simulation.tavern,
      state.simulation.activeWorkflow,
      {
        facts: state.story.facts,
        quests: state.story.quests,
        outcomes: state.story.outcomes,
        resolvedChecks: state.story.resolvedChecks,
      },
      state.story.narrative,
    ]);
  });

  it("keeps the production projector structural and field-by-field", async () => {
    const source = await readFile(new URL("../content/story-data.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/\.\.\.|Omit\s*</u);
  });
});
