// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { canonicalJsonBytes, parseTextId, type RuntimeSchemaV1 } from "@sillymaker/base";

import {
  deepFreezePocValueV1,
  parsePositiveSafeInteger,
  parseSceneId,
  pocNarrativeProgramSchemaV1,
  pocSimulationContentSchemaV1,
  pocSimulationDataSchemaV1,
  pocStoryBalanceSchemaV1,
  pocStoryInitialStateSchemaV1,
  pocStoryStateDefinitionsSchemaV1,
  type DeepReadonly,
  type PocSimulationDataV1,
  type PocStoryDataV1,
  type StoryBalanceV1,
  type StoryContentV1,
  type StoryManifestV1,
  type TextEntryV1,
} from "../gameplay/index.js";
import { pocActionDefinitionsV1 } from "./actions.js";
import { pocBalanceV1 } from "./balance.js";
import {
  pocCheckDefinitionsV1,
  pocEndingDefinitionsV1,
  pocWorldActionDefinitionsV1,
} from "./checks-endings.js";
import {
  pocCharacterDefinitionsV1,
  pocCustomerSegmentDefinitionsV1,
  pocItemDefinitionsV1,
  pocModifierSourceDefinitionsV1,
  pocReasonDefinitionsV1,
  pocStoryManifestV1,
  pocTextEntriesV1,
} from "./core-definitions.js";
import { pocEventDefinitionsV1 } from "./events.js";
import {
  pocAuraDefinitionsV1,
  pocFacilityDefinitionsV1,
  pocFacilityOpportunityDefinitionsV1,
} from "./facilities-auras.js";
import { pocIngredientDefinitionsV1, pocRecipeDefinitionsV1 } from "./ingredients-recipes.js";
import { pocNarrativeScenesV1 } from "./narrative/index.js";
import { pocRelationshipStoryActionDefinitionsV1 } from "./narrative/relationship.js";
import { pocSimulationDataV1 } from "./simulation-data.js";
import { pocInitialStateV1, pocStateDefinitionsV1 } from "./state-definitions.js";
import { textIdsV1 } from "./text-ids.js";

function parseExactRecordV1(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): Readonly<Record<string, unknown>> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`${label} must be a plain record`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(value);
  if (
    keys.some((key) => typeof key !== "string") ||
    keys.length !== expectedKeys.length ||
    expectedKeys.some((key) => !Object.hasOwn(value, key)) ||
    Object.values(descriptors).some(
      (descriptor) =>
        descriptor.enumerable !== true ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined,
    )
  ) {
    throw new TypeError(`${label} has an invalid field set`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function parseStoryManifestV1(value: unknown): StoryManifestV1 {
  const record = parseExactRecordV1(
    value,
    ["titleTextId", "initialSceneId", "playableDays"],
    "Story manifest",
  );
  return deepFreezePocValueV1({
    titleTextId: parseTextId(record.titleTextId),
    initialSceneId: parseSceneId(record.initialSceneId),
    playableDays: parsePositiveSafeInteger(record.playableDays),
  });
}

function parseTextEntriesV1(value: unknown): readonly TextEntryV1[] {
  if (!Array.isArray(value)) throw new TypeError("Story texts must be an array");
  const entries = value.map((entry, index) => {
    const record = parseExactRecordV1(entry, ["textId"], `Story text ${String(index)}`);
    return deepFreezePocValueV1({ textId: parseTextId(record.textId) });
  });
  if (
    entries.length !== textIdsV1.length ||
    entries.some((entry, index) => entry.textId !== textIdsV1[index])
  ) {
    throw new TypeError("Story texts must match the registered TextId order");
  }
  return deepFreezePocValueV1(entries);
}

function assertKnownTextReferencesV1(value: unknown, knownTextIds: ReadonlySet<string>): void {
  if (typeof value !== "object" || value === null) return;
  if (Array.isArray(value)) {
    for (const entry of value) assertKnownTextReferencesV1(entry, knownTextIds);
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (key === "textId" || key.endsWith("TextId")) {
      if (typeof entry !== "string" || !knownTextIds.has(entry)) {
        throw new TypeError(`unknown Story TextId: ${String(entry)}`);
      }
      continue;
    }
    if (key.endsWith("TextIds")) {
      if (
        !Array.isArray(entry) ||
        entry.some((textId) => typeof textId !== "string" || !knownTextIds.has(textId))
      ) {
        throw new TypeError(`unknown Story TextId list: ${key}`);
      }
      continue;
    }
    assertKnownTextReferencesV1(entry, knownTextIds);
  }
}

function parseStoryContentV1(value: unknown): StoryContentV1 {
  const record = parseExactRecordV1(
    value,
    [
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
    ],
    "Story content",
  );
  const texts = parseTextEntriesV1(record.texts);
  const simulationContent = pocSimulationContentSchemaV1.parse({
    characters: record.characters,
    reasons: record.reasons,
    actions: record.actions,
    storyActions: record.storyActions,
    customerSegments: record.customerSegments,
    modifierSources: record.modifierSources,
    ingredients: record.ingredients,
    items: record.items,
    recipes: record.recipes,
    facilities: record.facilities,
    facilityOpportunities: record.facilityOpportunities,
    auras: record.auras,
    worldActions: record.worldActions,
    events: record.events,
    checks: record.checks,
    endings: record.endings,
  });
  const narrative = pocNarrativeProgramSchemaV1.parse({ scenes: record.scenes });
  return deepFreezePocValueV1({
    texts,
    characters: simulationContent.characters,
    reasons: simulationContent.reasons,
    actions: simulationContent.actions,
    storyActions: simulationContent.storyActions,
    customerSegments: simulationContent.customerSegments,
    modifierSources: simulationContent.modifierSources,
    ingredients: simulationContent.ingredients,
    items: simulationContent.items,
    recipes: simulationContent.recipes,
    facilities: simulationContent.facilities,
    facilityOpportunities: simulationContent.facilityOpportunities,
    auras: simulationContent.auras,
    worldActions: simulationContent.worldActions,
    events: simulationContent.events,
    checks: simulationContent.checks,
    endings: simulationContent.endings,
    scenes: narrative.scenes,
  });
}

export const pocStoryDataSchemaV1: RuntimeSchemaV1<PocStoryDataV1> = Object.freeze({
  parse(value: unknown): PocStoryDataV1 {
    canonicalJsonBytes(value);
    const record = parseExactRecordV1(
      value,
      ["dataRevision", "manifest", "stateDefinitions", "initialState", "balance", "content"],
      "PoC Story data",
    );
    if (record.dataRevision !== 1) throw new TypeError("invalid PoC Story data revision");
    const parsed = deepFreezePocValueV1({
      dataRevision: 1 as const,
      manifest: parseStoryManifestV1(record.manifest),
      stateDefinitions: pocStoryStateDefinitionsSchemaV1.parse(record.stateDefinitions),
      initialState: pocStoryInitialStateSchemaV1.parse(record.initialState),
      balance: pocStoryBalanceSchemaV1.parse(record.balance),
      content: parseStoryContentV1(record.content),
    });
    assertKnownTextReferencesV1(parsed, new Set(parsed.content.texts.map((entry) => entry.textId)));
    canonicalJsonBytes(parsed);
    return parsed;
  },
});

const validatedPocStoryDataV1 = pocStoryDataSchemaV1.parse({
  dataRevision: 1,
  manifest: pocStoryManifestV1,
  stateDefinitions: pocStateDefinitionsV1,
  initialState: pocInitialStateV1,
  balance: pocBalanceV1,
  content: {
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
  },
});

export const pocStoryDataV1: DeepReadonly<PocStoryDataV1> = deepFreezePocValueV1({
  dataRevision: validatedPocStoryDataV1.dataRevision,
  manifest: validatedPocStoryDataV1.manifest,
  stateDefinitions: validatedPocStoryDataV1.stateDefinitions,
  initialState: validatedPocStoryDataV1.initialState,
  balance: pocBalanceV1,
  content: validatedPocStoryDataV1.content,
});

export function projectPocSimulationDataV1(
  source: DeepReadonly<PocStoryDataV1>,
  resolvedBalance: DeepReadonly<StoryBalanceV1>,
): DeepReadonly<PocSimulationDataV1> {
  const validatedSource = pocStoryDataSchemaV1.parse(source);
  return deepFreezePocValueV1(
    pocSimulationDataSchemaV1.parse({
      dataRevision: validatedSource.dataRevision,
      manifest: {
        initialSceneId: validatedSource.manifest.initialSceneId,
        playableDays: validatedSource.manifest.playableDays,
      },
      stateDefinitions: validatedSource.stateDefinitions,
      initialState: validatedSource.initialState,
      balance: resolvedBalance,
      content: {
        characters: validatedSource.content.characters,
        reasons: validatedSource.content.reasons,
        actions: validatedSource.content.actions,
        storyActions: validatedSource.content.storyActions,
        customerSegments: validatedSource.content.customerSegments,
        modifierSources: validatedSource.content.modifierSources,
        ingredients: validatedSource.content.ingredients,
        items: validatedSource.content.items,
        recipes: validatedSource.content.recipes,
        facilities: validatedSource.content.facilities,
        facilityOpportunities: validatedSource.content.facilityOpportunities,
        auras: validatedSource.content.auras,
        worldActions: validatedSource.content.worldActions,
        events: validatedSource.content.events,
        checks: validatedSource.content.checks,
        endings: validatedSource.content.endings,
      },
      narrative: { scenes: validatedSource.content.scenes },
    }),
  );
}

export { pocSimulationDataV1 };
