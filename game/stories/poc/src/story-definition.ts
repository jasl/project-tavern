// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { defineGamePackage, parsePositiveSafeInteger } from "@sillymaker/base";
import type {
  ResolvedAssetManifestV1,
  ResolvedGameV1,
  StateContractManifestV1,
} from "@sillymaker/base";

import { pocStateContractRevisionV1, pocStoryIdentityV1 } from "./content/identity.js";
import {
  actionIdsV1,
  actorIdsV1,
  assetIdsV1,
  auraIdsV1,
  characterIdsV1,
  checkBandIdsV1,
  checkIdsV1,
  choiceIdsV1,
  customerSegmentIdsV1,
  endingIdsV1,
  eventIdsV1,
  factIdsV1,
  facilityIdsV1,
  ingredientIdsV1,
  itemIdsV1,
  modifierSourceIdsV1,
  nodeIdsV1,
  outcomeIdsV1,
  policyIdsV1,
  questIdsV1,
  reasonIdsV1,
  recipeIdsV1,
  sceneIdsV1,
  storyTokenIdsV1,
  worldStepIdsV1,
} from "./content/ids.js";
import { pocSimulationDataV1 } from "./content/story-data.js";
import { pocGameplayModuleDescriptorsV1 } from "./gameplay/contracts/module-catalog.js";
import { deepFreezePocValueV1 } from "./gameplay/contracts/values.js";
import { createPocGameSimulationV1, type PocGameSimulationV1 } from "./gameplay/game-simulation.js";
import {
  materializePocPresentationV1,
  materializePocSimulationProgramV1,
  pocBaseRuleProvidersV1,
  pocPresentationPatchSurfaceV1,
  pocSimulationPatchSurfaceV1,
} from "./patch-surfaces.js";
import { pocAssetPacksV1, pocAssetSlotsV1 } from "./presentation/assets.js";
import { pocSceneGraphV1 } from "./presentation/scene-graph.js";
import { pocTextCatalogsV1 } from "./presentation/text-catalogs/index.js";

const stateSchemaRevisionV1 = parsePositiveSafeInteger(1);

function requireModuleDescriptorV1(moduleId: string) {
  const descriptor = pocGameplayModuleDescriptorsV1.find((candidate) => candidate.id === moduleId);
  if (descriptor === undefined) throw new TypeError(`missing PoC module descriptor: ${moduleId}`);
  return descriptor;
}

function moduleStateSchemaV1(moduleId: string, schemaId: string) {
  const descriptor = requireModuleDescriptorV1(moduleId);
  return {
    moduleId: descriptor.id,
    moduleContractRevision: descriptor.contractRevision,
    stateSlots: descriptor.stateSlots,
    stateSchema: {
      schemaId,
      revision: stateSchemaRevisionV1,
    },
  };
}

function sortedStableReferenceIdsV1(values: readonly string[]): readonly string[] {
  const sorted = [...values].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  if (new Set(sorted).size !== sorted.length) {
    throw new TypeError("duplicate PoC stable reference ID");
  }
  return Object.freeze(sorted);
}

export const pocStateContractManifestV1 = deepFreezePocValueV1({
  contractRevision: 1 as const,
  aggregateStateSchema: {
    schemaId: "schema.poc.game-state",
    revision: stateSchemaRevisionV1,
  },
  moduleStateSchemas: [
    moduleStateSchemaV1("module.actors", "schema.poc.module.actors-state"),
    moduleStateSchemaV1("module.calendar", "schema.poc.module.calendar-state"),
    moduleStateSchemaV1("module.facilities", "schema.poc.module.facilities-state"),
    moduleStateSchemaV1("module.inventory", "schema.poc.module.inventory-state"),
    moduleStateSchemaV1("module.narrative", "schema.poc.module.narrative-state"),
    moduleStateSchemaV1("module.progression", "schema.poc.module.progression-state"),
    moduleStateSchemaV1("module.run", "schema.poc.module.run-state"),
    moduleStateSchemaV1("module.status", "schema.poc.module.status-state"),
    moduleStateSchemaV1("module.tavern", "schema.poc.module.tavern-state"),
    moduleStateSchemaV1("module.workflow", "schema.poc.module.workflow-state"),
  ],
  persistentIrSchemas: [
    {
      schemaId: "schema.poc.narrative-runtime-ir",
      revision: stateSchemaRevisionV1,
    },
  ],
  stableReferenceSets: [
    { setId: "references.poc.action", ids: sortedStableReferenceIdsV1(actionIdsV1) },
    { setId: "references.poc.actor", ids: sortedStableReferenceIdsV1(actorIdsV1) },
    { setId: "references.poc.asset", ids: sortedStableReferenceIdsV1(assetIdsV1) },
    { setId: "references.poc.aura", ids: sortedStableReferenceIdsV1(auraIdsV1) },
    {
      setId: "references.poc.character",
      ids: sortedStableReferenceIdsV1(characterIdsV1),
    },
    { setId: "references.poc.check", ids: sortedStableReferenceIdsV1(checkIdsV1) },
    {
      setId: "references.poc.check-band",
      ids: sortedStableReferenceIdsV1(checkBandIdsV1),
    },
    { setId: "references.poc.choice", ids: sortedStableReferenceIdsV1(choiceIdsV1) },
    {
      setId: "references.poc.customer-segment",
      ids: sortedStableReferenceIdsV1(customerSegmentIdsV1),
    },
    { setId: "references.poc.ending", ids: sortedStableReferenceIdsV1(endingIdsV1) },
    { setId: "references.poc.event", ids: sortedStableReferenceIdsV1(eventIdsV1) },
    {
      setId: "references.poc.facility",
      ids: sortedStableReferenceIdsV1(facilityIdsV1),
    },
    { setId: "references.poc.fact", ids: sortedStableReferenceIdsV1(factIdsV1) },
    {
      setId: "references.poc.ingredient",
      ids: sortedStableReferenceIdsV1(ingredientIdsV1),
    },
    { setId: "references.poc.item", ids: sortedStableReferenceIdsV1(itemIdsV1) },
    {
      setId: "references.poc.modifier-source",
      ids: sortedStableReferenceIdsV1(modifierSourceIdsV1),
    },
    { setId: "references.poc.node", ids: sortedStableReferenceIdsV1(nodeIdsV1) },
    {
      setId: "references.poc.outcome",
      ids: sortedStableReferenceIdsV1(outcomeIdsV1),
    },
    { setId: "references.poc.policy", ids: sortedStableReferenceIdsV1(policyIdsV1) },
    { setId: "references.poc.quest", ids: sortedStableReferenceIdsV1(questIdsV1) },
    { setId: "references.poc.reason", ids: sortedStableReferenceIdsV1(reasonIdsV1) },
    { setId: "references.poc.recipe", ids: sortedStableReferenceIdsV1(recipeIdsV1) },
    { setId: "references.poc.scene", ids: sortedStableReferenceIdsV1(sceneIdsV1) },
    {
      setId: "references.poc.story-token",
      ids: sortedStableReferenceIdsV1(storyTokenIdsV1),
    },
    {
      setId: "references.poc.world-step",
      ids: sortedStableReferenceIdsV1(worldStepIdsV1),
    },
  ],
} satisfies StateContractManifestV1);

export const pocStorySimulationFacetV1 = Object.freeze({
  stateContractRevision: pocStateContractRevisionV1,
  stateContractManifest: pocStateContractManifestV1,
  data: pocSimulationDataV1,
  rules: pocBaseRuleProvidersV1,
  narrativeProgram: pocSimulationDataV1.narrative,
  patchSurface: pocSimulationPatchSurfaceV1,
  materializeProgram: materializePocSimulationProgramV1,
  createGameSimulation: createPocGameSimulationV1,
});

export const pocStoryPresentationFacetV1 = Object.freeze({
  uiSceneGraph: pocSceneGraphV1,
  textCatalogs: pocTextCatalogsV1,
  assetSlots: pocAssetSlotsV1,
  assetPacks: pocAssetPacksV1,
  patchSurface: pocPresentationPatchSurfaceV1,
  materializePresentation: materializePocPresentationV1,
});

export const pocStoryDefinitionV1 = Object.freeze({
  simulation: pocStorySimulationFacetV1,
  presentation: pocStoryPresentationFacetV1,
});

export function definePocStoryV1(): typeof pocStoryDefinitionV1 {
  return pocStoryDefinitionV1;
}

export const pocStoryEntryV1 = defineGamePackage({
  contractRevision: 1 as const,
  identity: pocStoryIdentityV1,
  define: definePocStoryV1,
});

export type PocPresentationV1 = ReturnType<typeof materializePocPresentationV1>;
export type PocStageSceneGraphV1 = typeof pocSceneGraphV1;
export type PocResolvedAssetsV1 = ResolvedAssetManifestV1;
export type PocResolvedGameV1 = ResolvedGameV1<
  PocGameSimulationV1,
  ReturnType<typeof materializePocSimulationProgramV1>,
  PocPresentationV1,
  PocStageSceneGraphV1,
  PocResolvedAssetsV1
>;

export default pocStoryEntryV1;
