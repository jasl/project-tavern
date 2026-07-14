// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parseModuleId } from "@sillymaker/base";
import type { Brand } from "@sillymaker/base";

export type { AssetId, CharacterId, RunId, TextId } from "@sillymaker/base";
export { parseAssetId, parseCharacterId, parseRunId, parseTextId } from "@sillymaker/base";

export type StoryId = Brand<string, "StoryId">;
export type PolicyId = Brand<string, "PolicyId">;
export type ActionId = Brand<string, "ActionId">;
export type EventId = Brand<string, "EventId">;
export type CheckpointId = Brand<string, "CheckpointId">;
export type WeightedGroupId = Brand<string, "WeightedGroupId">;
export type SceneId = Brand<string, "SceneId">;
export type NodeId = Brand<string, "NodeId">;
export type ChoiceId = Brand<string, "ChoiceId">;
export type FactId = Brand<string, "FactId">;
export type QuestId = Brand<string, "QuestId">;
export type OutcomeId = Brand<string, "OutcomeId">;
export type IngredientId = Brand<string, "IngredientId">;
export type ItemId = Brand<string, "ItemId">;
export type RecipeId = Brand<string, "RecipeId">;
export type FacilityId = Brand<string, "FacilityId">;
export type AuraId = Brand<string, "AuraId">;
export type CustomerSegmentId = Brand<string, "CustomerSegmentId">;
export type ModifierSourceId = Brand<string, "ModifierSourceId">;
export type CheckId = Brand<string, "CheckId">;
export type CheckBandId = Brand<string, "CheckBandId">;
export type EndingId = Brand<string, "EndingId">;
export type ReasonId = Brand<string, "ReasonId">;
export type WorldStepId = Brand<string, "WorldStepId">;
export type FixtureId = Brand<string, "FixtureId">;
export type StoryToken = Brand<string, "StoryToken">;
export type FallbackToken = Brand<string, "FallbackToken">;

export type BatchId = Brand<string, "BatchId">;
export type AuraInstanceId = Brand<string, "AuraInstanceId">;
export type OpeningSessionId = Brand<string, "OpeningSessionId">;
export type LedgerEntryId = Brand<string, "LedgerEntryId">;

export const actorIdsV1 = Object.freeze(["actor.player", "actor.heroine"] as const);
export type ActorId = (typeof actorIdsV1)[number];

export const attributeIdsV1 = Object.freeze(["body", "social", "intellect"] as const);
export type AttributeId = (typeof attributeIdsV1)[number];

export const attributeRanksV1 = Object.freeze(["C", "B", "A", "S", "S+"] as const);
export type AttributeRank = (typeof attributeRanksV1)[number];

export const relationshipStagesV1 = Object.freeze([
  "stranger",
  "dislike",
  "cold",
  "friendly",
  "trust",
  "admiration",
  "lovers",
] as const);
export type RelationshipStage = (typeof relationshipStagesV1)[number];

export const calendarPhasesV1 = Object.freeze(["morning", "afternoon", "evening"] as const);
export type CalendarPhase = (typeof calendarPhasesV1)[number];

export const serviceModesV1 = Object.freeze(["manual", "assisted", "delegated", "closed"] as const);
export type ServiceMode = (typeof serviceModesV1)[number];

export const openServiceModesV1 = Object.freeze(["manual", "assisted", "delegated"] as const);
export type OpenServiceMode = (typeof openServiceModesV1)[number];

export const helperTiersV1 = Object.freeze(["apprentice", "skilled", "senior", "master"] as const);
export type HelperTier = (typeof helperTiersV1)[number];

export const runStatusesV1 = Object.freeze([
  "setup",
  "active",
  "completed_stable",
  "completed_danger",
  "failed_arrears",
] as const);
export type RunStatus = (typeof runStatusesV1)[number];

function parseStableId<TValue extends string>(
  value: unknown,
  label: string,
  requiredPrefix?: string,
): TValue {
  let parsed: string;
  try {
    parsed = parseModuleId(value) as string;
  } catch {
    throw new TypeError(`invalid ${label}`);
  }
  if (requiredPrefix !== undefined && !parsed.startsWith(requiredPrefix)) {
    throw new TypeError(`invalid ${label}`);
  }
  return parsed as TValue;
}

export function parseStoryId(value: unknown): StoryId {
  return parseStableId<StoryId>(value, "StoryId");
}

export function parsePolicyId(value: unknown): PolicyId {
  return parseStableId<PolicyId>(value, "PolicyId");
}

export function parseActionId(value: unknown): ActionId {
  return parseStableId<ActionId>(value, "ActionId", "action.");
}

export function parseEventId(value: unknown): EventId {
  return parseStableId<EventId>(value, "EventId", "event.");
}

export function parseCheckpointId(value: unknown): CheckpointId {
  return parseStableId<CheckpointId>(value, "CheckpointId");
}

export function parseWeightedGroupId(value: unknown): WeightedGroupId {
  return parseStableId<WeightedGroupId>(value, "WeightedGroupId");
}

export function parseSceneId(value: unknown): SceneId {
  return parseStableId<SceneId>(value, "SceneId");
}

export function parseNodeId(value: unknown): NodeId {
  return parseStableId<NodeId>(value, "NodeId");
}

export function parseChoiceId(value: unknown): ChoiceId {
  return parseStableId<ChoiceId>(value, "ChoiceId");
}

export function parseFactId(value: unknown): FactId {
  return parseStableId<FactId>(value, "FactId");
}

export function parseQuestId(value: unknown): QuestId {
  return parseStableId<QuestId>(value, "QuestId");
}

export function parseOutcomeId(value: unknown): OutcomeId {
  return parseStableId<OutcomeId>(value, "OutcomeId");
}

export function parseIngredientId(value: unknown): IngredientId {
  return parseStableId<IngredientId>(value, "IngredientId");
}

export function parseItemId(value: unknown): ItemId {
  return parseStableId<ItemId>(value, "ItemId");
}

export function parseRecipeId(value: unknown): RecipeId {
  return parseStableId<RecipeId>(value, "RecipeId");
}

export function parseFacilityId(value: unknown): FacilityId {
  return parseStableId<FacilityId>(value, "FacilityId");
}

export function parseAuraId(value: unknown): AuraId {
  return parseStableId<AuraId>(value, "AuraId");
}

export function parseCustomerSegmentId(value: unknown): CustomerSegmentId {
  return parseStableId<CustomerSegmentId>(value, "CustomerSegmentId");
}

export function parseModifierSourceId(value: unknown): ModifierSourceId {
  return parseStableId<ModifierSourceId>(value, "ModifierSourceId");
}

export function parseCheckId(value: unknown): CheckId {
  return parseStableId<CheckId>(value, "CheckId");
}

export function parseCheckBandId(value: unknown): CheckBandId {
  return parseStableId<CheckBandId>(value, "CheckBandId");
}

export function parseEndingId(value: unknown): EndingId {
  return parseStableId<EndingId>(value, "EndingId");
}

export function parseReasonId(value: unknown): ReasonId {
  return parseStableId<ReasonId>(value, "ReasonId");
}

export function parseWorldStepId(value: unknown): WorldStepId {
  return parseStableId<WorldStepId>(value, "WorldStepId");
}

export function parseFixtureId(value: unknown): FixtureId {
  return parseStableId<FixtureId>(value, "FixtureId");
}

export function parseStoryToken(value: unknown): StoryToken {
  return parseStableId<StoryToken>(value, "StoryToken");
}

export function parseFallbackToken(value: unknown): FallbackToken {
  return parseStableId<FallbackToken>(value, "FallbackToken");
}

function parseFixedValue<TValue extends string>(
  value: unknown,
  values: readonly TValue[],
  label: string,
): TValue {
  if (typeof value !== "string" || !values.includes(value as TValue)) {
    throw new TypeError(`invalid ${label}`);
  }
  return value as TValue;
}

function parseCanonicalIndex(value: string, label: string, positive: boolean): number {
  if (!/^(?:0|[1-9][0-9]*)$/u.test(value)) throw new TypeError(`invalid ${label}`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || (positive && parsed === 0)) {
    throw new TypeError(`invalid ${label}`);
  }
  return parsed;
}

export function parseBatchId(value: unknown): BatchId {
  if (typeof value !== "string") throw new TypeError("invalid BatchId");
  const parts = value.split(":");
  if (parts.length !== 3 || parts[0] !== "batch") throw new TypeError("invalid BatchId");
  if (parts[1] === "initial") parseCanonicalIndex(parts[2] ?? "", "BatchId", false);
  else {
    parseCanonicalIndex(parts[1] ?? "", "BatchId", true);
    parseCanonicalIndex(parts[2] ?? "", "BatchId", false);
  }
  return value as BatchId;
}

export function parseAuraInstanceId(value: unknown): AuraInstanceId {
  if (typeof value !== "string") throw new TypeError("invalid AuraInstanceId");
  const parts = value.split(":");
  if (parts.length !== 3 || parts[0] !== "aura") {
    throw new TypeError("invalid AuraInstanceId");
  }
  if (parts[1] === "initial") parseCanonicalIndex(parts[2] ?? "", "AuraInstanceId", false);
  else {
    parseCanonicalIndex(parts[1] ?? "", "AuraInstanceId", true);
    parseCanonicalIndex(parts[2] ?? "", "AuraInstanceId", false);
  }
  return value as AuraInstanceId;
}

export function parseOpeningSessionId(value: unknown): OpeningSessionId {
  if (typeof value !== "string") throw new TypeError("invalid OpeningSessionId");
  const parts = value.split(":");
  if (parts.length !== 2 || parts[0] !== "opening") {
    throw new TypeError("invalid OpeningSessionId");
  }
  parseCanonicalIndex(parts[1] ?? "", "OpeningSessionId", true);
  return value as OpeningSessionId;
}

export function parseLedgerEntryId(value: unknown): LedgerEntryId {
  if (typeof value !== "string") throw new TypeError("invalid LedgerEntryId");
  const parts = value.split(":");
  if (parts.length !== 3 || parts[0] !== "ledger") {
    throw new TypeError("invalid LedgerEntryId");
  }
  parseCanonicalIndex(parts[1] ?? "", "LedgerEntryId", true);
  parseCanonicalIndex(parts[2] ?? "", "LedgerEntryId", false);
  return value as LedgerEntryId;
}

export function parseActorId(value: unknown): ActorId {
  return parseFixedValue(value, actorIdsV1, "ActorId");
}

export function parseAttributeId(value: unknown): AttributeId {
  return parseFixedValue(value, attributeIdsV1, "AttributeId");
}

export function parseAttributeRank(value: unknown): AttributeRank {
  return parseFixedValue(value, attributeRanksV1, "AttributeRank");
}

export function parseRelationshipStage(value: unknown): RelationshipStage {
  return parseFixedValue(value, relationshipStagesV1, "RelationshipStage");
}

export function parseCalendarPhase(value: unknown): CalendarPhase {
  return parseFixedValue(value, calendarPhasesV1, "CalendarPhase");
}

export function parseServiceMode(value: unknown): ServiceMode {
  return parseFixedValue(value, serviceModesV1, "ServiceMode");
}

export function parseOpenServiceMode(value: unknown): OpenServiceMode {
  return parseFixedValue(value, openServiceModesV1, "OpenServiceMode");
}

export function parseHelperTier(value: unknown): HelperTier {
  return parseFixedValue(value, helperTiersV1, "HelperTier");
}

export function parseRunStatus(value: unknown): RunStatus {
  return parseFixedValue(value, runStatusesV1, "RunStatus");
}
