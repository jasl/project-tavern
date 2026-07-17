// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly, RuntimeSchemaV1, SaveImportInvariantViewV1 } from "@sillymaker/base";

import type { PocGameStateV1 } from "../gameplay/index.js";
import { pocStateContractManifestV1, type PocResolvedGameV1 } from "../story-definition.js";

const referenceSetIdByStateFieldV1 = Object.freeze({
  actionId: "references.poc.action",
  opportunityId: "references.poc.action",
  actorId: "references.poc.actor",
  assetId: "references.poc.asset",
  backgroundAssetId: "references.poc.asset",
  poseAssetId: "references.poc.asset",
  auraId: "references.poc.aura",
  characterId: "references.poc.character",
  checkId: "references.poc.check",
  bandId: "references.poc.check-band",
  choiceId: "references.poc.choice",
  optionId: "references.poc.choice",
  segmentId: "references.poc.customer-segment",
  endingId: "references.poc.ending",
  eventId: "references.poc.event",
  triggeredEventIds: "references.poc.event",
  facilityId: "references.poc.facility",
  facilityIds: "references.poc.facility",
  factId: "references.poc.fact",
  ingredientId: "references.poc.ingredient",
  ingredientIds: "references.poc.ingredient",
  itemId: "references.poc.item",
  sourceId: "references.poc.modifier-source",
  nodeId: "references.poc.node",
  returnNodeId: "references.poc.node",
  outcomeId: "references.poc.outcome",
  lifePolicyId: "references.poc.policy",
  policyId: "references.poc.policy",
  questId: "references.poc.quest",
  reasonId: "references.poc.reason",
  reasonIds: "references.poc.reason",
  recipeId: "references.poc.recipe",
  unlockedRecipeIds: "references.poc.recipe",
  sceneId: "references.poc.scene",
  beginStepId: "references.poc.world-step",
  completionStepId: "references.poc.world-step",
  stepId: "references.poc.world-step",
} as const);

function stableReferenceSetsByIdV1(): ReadonlyMap<string, ReadonlySet<string>> {
  const sets = new Map(
    pocStateContractManifestV1.stableReferenceSets.map(({ setId, ids }) => [setId, new Set(ids)]),
  );
  const consumedSetIds = new Set([
    ...Object.values(referenceSetIdByStateFieldV1),
    "references.poc.story-token",
  ]);
  for (const { setId } of pocStateContractManifestV1.stableReferenceSets) {
    if (!consumedSetIds.has(setId)) {
      throw new TypeError(`PoC Save reference validator does not consume ${setId}`);
    }
  }
  for (const setId of consumedSetIds) {
    if (!sets.has(setId)) {
      throw new TypeError(`PoC State contract manifest is missing ${setId}`);
    }
  }
  return sets;
}

const stableReferenceSetsByIdValueV1 = stableReferenceSetsByIdV1();

function appendReferenceErrorsV1(
  value: unknown,
  setId: string,
  path: string,
  errors: string[],
): void {
  const allowed = stableReferenceSetsByIdValueV1.get(setId);
  if (allowed === undefined) throw new TypeError(`missing stable reference set ${setId}`);
  const values = Array.isArray(value) ? value : [value];
  for (const [index, candidate] of values.entries()) {
    if (candidate === null) continue;
    const candidatePath = Array.isArray(value) ? `${path}.${index}` : path;
    if (typeof candidate !== "string" || !allowed.has(candidate)) {
      errors.push(`reference.unknown:${setId}:${candidatePath}`);
    }
  }
}

function scanStateReferencesV1(value: unknown, path: string, errors: string[]): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      scanStateReferencesV1(entry, `${path}.${index}`, errors);
    }
    return;
  }
  const record = value as Readonly<Record<string, unknown>>;
  for (const [field, fieldValue] of Object.entries(record)) {
    const fieldPath = `${path}.${field}`;
    const setId = referenceSetIdByStateFieldV1[field as keyof typeof referenceSetIdByStateFieldV1];
    if (setId !== undefined) appendReferenceErrorsV1(fieldValue, setId, fieldPath, errors);
    if (field === "value" && record.kind === "token") {
      appendReferenceErrorsV1(fieldValue, "references.poc.story-token", fieldPath, errors);
    }
    scanStateReferencesV1(fieldValue, fieldPath, errors);
  }
}

/** Validates every persistent stable-ID field against the Story State-contract manifest. */
export function validatePocStateReferencesV1(
  resolved: PocResolvedGameV1,
  state: DeepReadonly<PocGameStateV1>,
): readonly string[] {
  const parsed = resolved.gameSimulation.stateSchema.parse(state);
  const errors: string[] = [];
  scanStateReferencesV1(parsed, "state", errors);
  return Object.freeze(errors);
}

interface LocalInvariantModuleV1<TState, TReadPort> {
  readonly descriptor: { readonly id: string };
  readonly stateSchema: RuntimeSchemaV1<TState>;
  readonly localInvariants: readonly {
    check(state: DeepReadonly<TState>, readPort: TReadPort): readonly { readonly code: string }[];
  }[];
  createReadPort(state: DeepReadonly<TState>): TReadPort;
}

function localInvariantErrorsV1<TState, TReadPort>(
  module: LocalInvariantModuleV1<TState, TReadPort>,
  expectedModuleId: string,
  state: DeepReadonly<TState>,
): readonly string[] {
  if (module.descriptor.id !== expectedModuleId) {
    throw new TypeError(
      `PoC Save invariant module order drift: expected ${expectedModuleId}, received ${module.descriptor.id}`,
    );
  }
  const parsed = module.stateSchema.parse(state);
  const readonlyParsed = parsed as DeepReadonly<TState>;
  const readPort = module.createReadPort(readonlyParsed);
  return Object.freeze(
    module.localInvariants.flatMap((invariant) =>
      invariant
        .check(readonlyParsed, readPort)
        .map(({ code }) => `${module.descriptor.id}:${code}`),
    ),
  );
}

/** Runs all ten resolved GameplayModule local invariants over their owned State slices. */
export function validatePocStateInvariantsV1(
  resolved: PocResolvedGameV1,
  view: DeepReadonly<SaveImportInvariantViewV1<PocGameStateV1>>,
): readonly string[] {
  const state = resolved.gameSimulation.stateSchema.parse(view.state);
  const modules = resolved.gameSimulation.modules;
  const progression = Object.freeze({
    facts: state.story.facts,
    quests: state.story.quests,
    outcomes: state.story.outcomes,
    resolvedChecks: state.story.resolvedChecks,
  });
  return Object.freeze([
    ...localInvariantErrorsV1(modules[0], "module.run", state.simulation.run),
    ...localInvariantErrorsV1(modules[1], "module.calendar", state.simulation.calendar),
    ...localInvariantErrorsV1(modules[2], "module.actors", state.simulation.actors),
    ...localInvariantErrorsV1(modules[3], "module.status", state.simulation.status),
    ...localInvariantErrorsV1(modules[4], "module.inventory", state.simulation.inventory),
    ...localInvariantErrorsV1(modules[5], "module.facilities", state.simulation.facilities),
    ...localInvariantErrorsV1(modules[6], "module.tavern", state.simulation.tavern),
    ...localInvariantErrorsV1(modules[7], "module.workflow", state.simulation.activeWorkflow),
    ...localInvariantErrorsV1(modules[8], "module.progression", progression),
    ...localInvariantErrorsV1(modules[9], "module.narrative", state.story.narrative),
  ]);
}
