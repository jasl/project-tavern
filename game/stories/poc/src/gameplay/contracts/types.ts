// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type {
  CommandExecutionAttemptEnvelopeV1,
  CommandExecutionDiagnosticsEnvelopeV1,
  DeepReadonly,
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
  GameSnapshotEnvelopeV1,
  RngDrawTraceV1,
  RngStateV1,
  RuleRngV1,
} from "@sillymaker/base";

import type {
  AbsoluteDayIndex,
  AttributeBonus,
  BeforeAfterV1,
  DayIndex,
  DieFace,
  IntegerRangeV1,
  Money,
  MoodPoint,
  NonNegativeSafeInteger,
  NonZeroUint32,
  PositiveSafeInteger,
  Quantity,
  SafeInteger,
} from "./values.js";
import type {
  ActionId,
  ActorId,
  AssetId,
  AttributeId,
  AttributeRank,
  AuraId,
  AuraInstanceId,
  BatchId,
  CalendarPhase,
  CharacterId,
  CheckBandId,
  CheckId,
  CheckpointId,
  ChoiceId,
  CustomerSegmentId,
  EndingId,
  EventId,
  FacilityId,
  FactId,
  FixtureId,
  HelperTier,
  IngredientId,
  ItemId,
  LedgerEntryId,
  ModifierSourceId,
  NodeId,
  OpenServiceMode,
  OpeningSessionId,
  OutcomeId,
  PolicyId,
  QuestId,
  ReasonId,
  RecipeId,
  RelationshipStage,
  RunId,
  RunStatus,
  SceneId,
  ServiceMode,
  StoryId,
  StoryToken,
  TextId,
  WeightedGroupId,
  WorldStepId,
} from "./ids.js";

export interface StaminaStateV1 {
  readonly current: NonNegativeSafeInteger;
  readonly maximum: PositiveSafeInteger;
}

export interface AttributeRanksV1 {
  readonly body: AttributeRank;
  readonly social: AttributeRank;
  readonly intellect: AttributeRank;
}

export interface PlayerActorStateV1 {
  readonly actorId: "actor.player";
  readonly stamina: StaminaStateV1;
  readonly mood: MoodPoint;
  readonly attributes: AttributeRanksV1;
}

export interface HeroineActorStateV1 {
  readonly actorId: "actor.heroine";
  readonly stamina: StaminaStateV1;
  readonly mood: MoodPoint;
}

export interface RelationshipStateV1 {
  readonly affection: SafeInteger;
  readonly teamwork: NonNegativeSafeInteger;
  readonly stage: RelationshipStage;
}

export interface ActorsStateV1 {
  readonly player: PlayerActorStateV1;
  readonly heroine: HeroineActorStateV1;
  readonly relationship: RelationshipStateV1;
}

export type InventorySourceRefV1 =
  | { readonly kind: "initial"; readonly reasonId: ReasonId }
  | { readonly kind: "purchase"; readonly commandSequence: PositiveSafeInteger }
  | { readonly kind: "story_action"; readonly actionId: ActionId }
  | { readonly kind: "world_action"; readonly actionId: ActionId }
  | { readonly kind: "story_event"; readonly eventId: EventId }
  | { readonly kind: "debug"; readonly reasonId: ReasonId };

export interface InventoryBatchV1 {
  readonly batchId: BatchId;
  readonly ingredientId: IngredientId;
  readonly quantity: Quantity;
  readonly acquiredDay: DayIndex;
  readonly lastUsableDay: AbsoluteDayIndex;
  readonly refrigerationExtended: boolean;
  readonly source: InventorySourceRefV1;
}

export interface ItemStackV1 {
  readonly itemId: ItemId;
  readonly quantity: Quantity;
}

export interface IngredientQuantityV1 {
  readonly ingredientId: IngredientId;
  readonly quantity: Quantity;
}

export interface ItemQuantityV1 {
  readonly itemId: ItemId;
  readonly quantity: Quantity;
}

export interface BatchConsumptionV1 {
  readonly batchId: BatchId;
  readonly ingredientId: IngredientId;
  readonly quantity: Quantity;
}

export type AuraTargetV1 =
  | { readonly kind: "actor"; readonly actorId: ActorId }
  | { readonly kind: "tavern" }
  | { readonly kind: "run" };

export type AuraDurationUnitV1 = "phase_end" | "day_end" | "opening" | "night_recovery";

export type AuraDurationV1 =
  | {
      readonly kind: "countdown";
      readonly unit: AuraDurationUnitV1;
      readonly remaining: PositiveSafeInteger;
    }
  | { readonly kind: "until_cleared" };

export type AuraDurationPolicyV1 =
  | {
      readonly kind: "countdown";
      readonly unit: AuraDurationUnitV1;
      readonly defaultRemaining: PositiveSafeInteger;
      readonly maximumRemaining: PositiveSafeInteger;
    }
  | { readonly kind: "until_cleared" };

export type AuraSourceRefV1 =
  | { readonly kind: "initial"; readonly reasonId: ReasonId }
  | { readonly kind: "story_event"; readonly eventId: EventId }
  | { readonly kind: "story_action"; readonly actionId: ActionId }
  | { readonly kind: "facility"; readonly facilityId: FacilityId }
  | { readonly kind: "world_action"; readonly actionId: ActionId }
  | { readonly kind: "debug"; readonly reasonId: ReasonId };

export interface AuraInstanceV1 {
  readonly instanceId: AuraInstanceId;
  readonly auraId: AuraId;
  readonly target: AuraTargetV1;
  readonly source: AuraSourceRefV1;
  readonly duration: AuraDurationV1;
  readonly appliedAtSequence: NonNegativeSafeInteger;
}

export interface StatusStateV1 {
  readonly auras: readonly AuraInstanceV1[];
}

export interface PlannedRecipeV1 {
  readonly recipeId: RecipeId;
  readonly portions: Quantity;
}

export interface TavernPlanV1 {
  readonly mode: ServiceMode;
  readonly menu: readonly PlannedRecipeV1[];
}

export type DemandRandomOffset = -1 | 0 | 1;

export interface DemandSeedSegmentStateV1 {
  readonly segmentId: CustomerSegmentId;
  readonly baseCustomers: NonNegativeSafeInteger;
  readonly randomOffset: DemandRandomOffset;
}

export interface DemandDayStateV1 {
  readonly day: DayIndex;
  readonly segments: readonly DemandSeedSegmentStateV1[];
}

export interface AppliedModifierV1 {
  readonly modifier: ModifierV1;
  readonly contribution: SafeInteger;
}

export interface MaterializedDemandSegmentV1 {
  readonly segmentId: CustomerSegmentId;
  readonly preview: IntegerRangeV1;
  readonly actualCustomers: NonNegativeSafeInteger;
  readonly modifiers: readonly AppliedModifierV1[];
}

export interface MaterializedDemandDayV1 {
  readonly day: DayIndex;
  readonly segments: readonly MaterializedDemandSegmentV1[];
}

export interface FacilityStateV1 {
  readonly facilityId: FacilityId;
  readonly builtAtSequence: PositiveSafeInteger;
}

export type FacilityDecisionV1 =
  { readonly kind: "built"; readonly facilityId: FacilityId } | { readonly kind: "skipped" };

export interface FacilityDecisionRecordV1 {
  readonly opportunityId: ActionId;
  readonly decision: FacilityDecisionV1;
}

export interface HelperStateV1 {
  readonly unlocked: boolean;
  readonly tier: HelperTier;
}

export interface DailyPreparationStateV1 {
  readonly day: DayIndex;
  readonly actionCount: NonNegativeSafeInteger;
}

export type LedgerCategoryV1 =
  | "purchase"
  | "wage"
  | "opening_fee"
  | "revenue"
  | "discarded_food"
  | "spoiled_ingredient"
  | "facility"
  | "world_action"
  | "levy"
  | "story_reward"
  | "story_cost"
  | "debug_adjustment";

export type LedgerSubjectV1 =
  | { readonly kind: "ingredient"; readonly ingredientId: IngredientId }
  | { readonly kind: "item"; readonly itemId: ItemId }
  | { readonly kind: "recipe"; readonly recipeId: RecipeId }
  | { readonly kind: "facility"; readonly facilityId: FacilityId }
  | { readonly kind: "service_mode"; readonly mode: ServiceMode }
  | { readonly kind: "event"; readonly eventId: EventId }
  | { readonly kind: "action"; readonly actionId: ActionId }
  | { readonly kind: "levy" }
  | { readonly kind: "debug" };

export interface LedgerEntryV1 {
  readonly entryId: LedgerEntryId;
  readonly category: LedgerCategoryV1;
  readonly reasonId: ReasonId;
  readonly cashDelta: SafeInteger;
  readonly valuationDelta: SafeInteger;
  readonly subject: LedgerSubjectV1;
  readonly quantity?: Quantity;
}

export interface LedgerEntryDraftV1 {
  readonly category: LedgerCategoryV1;
  readonly reasonId: ReasonId;
  readonly cashDelta: SafeInteger;
  readonly valuationDelta: SafeInteger;
  readonly subject: LedgerSubjectV1;
  readonly quantity?: Quantity;
}

export interface InventoryStateV1 {
  readonly startingCash: Money;
  readonly cash: Money;
  readonly ingredientBatches: readonly InventoryBatchV1[];
  readonly itemStacks: readonly ItemStackV1[];
  readonly ledger: readonly LedgerEntryV1[];
}

export interface OpeningOrderLineV1 {
  readonly segmentId: CustomerSegmentId;
  readonly recipeId: RecipeId;
  readonly potentialCustomers: NonNegativeSafeInteger;
  readonly effectiveOrders: NonNegativeSafeInteger;
  readonly capacityAccepted: NonNegativeSafeInteger;
  readonly actualSales: NonNegativeSafeInteger;
}

export interface OpeningLedgerV1 {
  readonly sessionId: OpeningSessionId;
  readonly day: DayIndex;
  readonly mode: OpenServiceMode;
  readonly preparationActionCount: NonNegativeSafeInteger;
  readonly menu: readonly PlannedRecipeV1[];
  readonly orders: readonly OpeningOrderLineV1[];
  readonly receptionCapacity: NonNegativeSafeInteger;
  readonly preparationCapacity: NonNegativeSafeInteger;
  readonly discardedPortions: readonly PlannedRecipeV1[];
  readonly entryIds: readonly LedgerEntryId[];
  readonly ap: BeforeAfterV1<NonNegativeSafeInteger>;
  readonly playerStamina: BeforeAfterV1<NonNegativeSafeInteger>;
  readonly heroineStamina: BeforeAfterV1<NonNegativeSafeInteger>;
  readonly cash: BeforeAfterV1<Money>;
  readonly reputation: BeforeAfterV1<NonNegativeSafeInteger>;
  readonly teamwork: BeforeAfterV1<NonNegativeSafeInteger>;
  readonly heroineMood: BeforeAfterV1<MoodPoint>;
  readonly triggeredEventIds: readonly EventId[];
  readonly appliedModifiers: readonly AppliedModifierV1[];
}

export interface ClosureHistoryV1 {
  readonly day: DayIndex;
  readonly kind: "planned" | "emergency";
  readonly reasonId: ReasonId;
  readonly reputation: BeforeAfterV1<NonNegativeSafeInteger>;
}

export type ServiceHistoryEntryV1 =
  | { readonly kind: "opening"; readonly opening: OpeningLedgerV1 }
  | { readonly kind: "closure"; readonly closure: ClosureHistoryV1 };

export interface OpeningActorInputsV1 {
  readonly playerAttributes: AttributeRanksV1;
  readonly heroineMood: MoodPoint;
  readonly relationship: RelationshipStateV1;
  readonly helper: HelperStateV1;
}

export interface OpeningBaselineV1 {
  readonly startedAtSequence: PositiveSafeInteger;
  readonly day: DayIndex;
  readonly mode: OpenServiceMode;
  readonly preparationActionCount: NonNegativeSafeInteger;
  readonly ap: BeforeAfterV1<NonNegativeSafeInteger>;
  readonly playerStamina: BeforeAfterV1<NonNegativeSafeInteger>;
  readonly heroineStamina: BeforeAfterV1<NonNegativeSafeInteger>;
  readonly cashAtStart: BeforeAfterV1<Money>;
  readonly reputationBeforeStart: NonNegativeSafeInteger;
  readonly menu: readonly PlannedRecipeV1[];
  readonly preparedPortions: readonly PlannedRecipeV1[];
  readonly consumedIngredients: readonly BatchConsumptionV1[];
  readonly demand: readonly MaterializedDemandSegmentV1[];
  readonly actors: OpeningActorInputsV1;
  readonly facilityIds: readonly FacilityId[];
  readonly modifiers: readonly ModifierV1[];
  readonly startEntryIds: readonly LedgerEntryId[];
}

export type OpeningCheckpointV1 = "started" | "middle" | "before_finalize" | "ready_to_finalize";

export interface OpeningBlockingEventV1 {
  readonly eventId: EventId;
  readonly sceneId: SceneId;
}

export interface OpeningSessionV1 {
  readonly kind: "opening";
  readonly sessionId: OpeningSessionId;
  readonly checkpoint: OpeningCheckpointV1;
  readonly baseline: OpeningBaselineV1;
  readonly triggeredEventIds: readonly EventId[];
  readonly sessionModifiers: readonly ModifierV1[];
  readonly blockingEvent: OpeningBlockingEventV1 | null;
}

export interface WorldActionChoiceV1 {
  readonly choiceId: ChoiceId;
  readonly committedAtSequence: PositiveSafeInteger;
}

export type WorldActionProgressV1 =
  "begin_scene" | "awaiting_completion_phase" | "completion_scene" | "ready_to_complete";

export interface WorldActionSessionV1 {
  readonly kind: "world_action";
  readonly actionId: ActionId;
  readonly optionId: ChoiceId;
  readonly beginStepId: WorldStepId;
  readonly completionStepId: WorldStepId;
  readonly preparationBonus: SafeInteger;
  readonly startedAtSequence: PositiveSafeInteger;
  readonly startedDay: DayIndex;
  readonly startedPhase: CalendarPhase;
  readonly progress: WorldActionProgressV1;
  readonly paidCostEntryIds: readonly LedgerEntryId[];
  readonly choices: readonly WorldActionChoiceV1[];
}

export type ActiveWorkflowV1 = OpeningSessionV1 | WorldActionSessionV1;

export interface TavernStateV1 {
  readonly reputation: NonNegativeSafeInteger;
  readonly unlockedRecipeIds: readonly RecipeId[];
  readonly helper: HelperStateV1;
  readonly preparation: DailyPreparationStateV1;
  readonly servicePlan: TavernPlanV1 | null;
  readonly demandSeeds: readonly DemandDayStateV1[];
  readonly currentDemand: MaterializedDemandDayV1 | null;
  readonly serviceHistory: readonly ServiceHistoryEntryV1[];
}

export interface FacilitiesStateV1 {
  readonly built: readonly FacilityStateV1[];
  readonly decisions: readonly FacilityDecisionRecordV1[];
}

export type StoryValueV1 =
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "integer"; readonly value: SafeInteger }
  | { readonly kind: "token"; readonly value: StoryToken };

export interface FactEntryV1 {
  readonly factId: FactId;
  readonly value: StoryValueV1;
}

export type QuestStatusV1 = "locked" | "active" | "completed" | "failed";

export interface QuestEntryV1 {
  readonly questId: QuestId;
  readonly status: QuestStatusV1;
  readonly progress: NonNegativeSafeInteger;
  readonly target: PositiveSafeInteger;
}

export interface OutcomeEntryV1 {
  readonly outcomeId: OutcomeId;
  readonly value: StoryValueV1;
}

export interface NarrativeCursorV1 {
  readonly sceneId: SceneId;
  readonly nodeId: NodeId;
}

export interface NarrativeCallFrameV1 {
  readonly sceneId: SceneId;
  readonly returnNodeId: NodeId;
}

export type CharacterSlotV1 = "left" | "center" | "right";

export interface NarrativeCharacterStateV1 {
  readonly slot: CharacterSlotV1;
  readonly characterId: CharacterId;
  readonly poseAssetId: AssetId;
}

export interface NarrativeStageStateV1 {
  readonly backgroundAssetId: AssetId | null;
  readonly characters: readonly NarrativeCharacterStateV1[];
  readonly transition: "cut" | "fade";
}

export type NarrativeSourceV1 =
  | { readonly kind: "manifest_start" }
  | { readonly kind: "event"; readonly eventId: EventId }
  | { readonly kind: "story_action"; readonly actionId: ActionId }
  | { readonly kind: "world_action"; readonly actionId: ActionId }
  | { readonly kind: "debug_fixture"; readonly fixtureId: FixtureId };

export interface NarrativeRuntimeStateV1 {
  readonly status: "idle" | "active" | "completed";
  readonly source: NarrativeSourceV1 | null;
  readonly cursor: NarrativeCursorV1 | null;
  readonly callStack: readonly NarrativeCallFrameV1[];
  readonly stage: NarrativeStageStateV1;
}

export interface StoryRuntimeStateV1 {
  readonly facts: readonly FactEntryV1[];
  readonly quests: readonly QuestEntryV1[];
  readonly outcomes: readonly OutcomeEntryV1[];
  readonly resolvedChecks: readonly ResolvedCheckV1[];
  readonly narrative: NarrativeRuntimeStateV1;
}

export interface RunStateV1 {
  readonly runId: RunId;
  readonly initialSeed: NonZeroUint32;
  readonly status: RunStatus;
  readonly completion: RunCompletionV1 | null;
}

export interface CalendarStateV1 {
  readonly day: DayIndex;
  readonly phase: CalendarPhase;
  readonly lifePolicyId: PolicyId | null;
  readonly apRemaining: NonNegativeSafeInteger;
  readonly eveningResolved: boolean;
}

export interface PocSimulationStateV1 {
  readonly run: RunStateV1;
  readonly calendar: CalendarStateV1;
  readonly actors: ActorsStateV1;
  readonly inventory: InventoryStateV1;
  readonly status: StatusStateV1;
  readonly facilities: FacilitiesStateV1;
  readonly tavern: TavernStateV1;
  readonly activeWorkflow: ActiveWorkflowV1 | null;
}

export interface PocGameStateV1 {
  readonly simulation: PocSimulationStateV1;
  readonly story: StoryRuntimeStateV1;
}

export interface PurchaseLineV1 {
  readonly ingredientId: IngredientId;
  readonly quantity: Quantity;
}

export type FacilityChoiceV1 =
  { readonly kind: "build"; readonly facilityId: FacilityId } | { readonly kind: "skip" };

export type PocGameCommandV1 =
  | { readonly kind: "run.start" }
  | { readonly kind: "policy.choose"; readonly policyId: PolicyId }
  | { readonly kind: "inventory.buy"; readonly lines: readonly PurchaseLineV1[] }
  | { readonly kind: "actor.prepare_food" }
  | { readonly kind: "actor.rest" }
  | { readonly kind: "story.action.start"; readonly actionId: ActionId }
  | {
      readonly kind: "facility.choose";
      readonly opportunityId: ActionId;
      readonly choice: FacilityChoiceV1;
    }
  | { readonly kind: "tavern.plan.set"; readonly plan: TavernPlanV1 }
  | { readonly kind: "tavern.opening.start" }
  | { readonly kind: "tavern.opening.continue" }
  | { readonly kind: "tavern.opening.finalize" }
  | {
      readonly kind: "world.action.begin";
      readonly actionId: ActionId;
      readonly optionId: ChoiceId;
    }
  | { readonly kind: "world.action.complete" }
  | { readonly kind: "narrative.advance" }
  | {
      readonly kind: "narrative.choose";
      readonly sceneId: SceneId;
      readonly nodeId: NodeId;
      readonly choiceId: ChoiceId;
    }
  | { readonly kind: "calendar.advance_phase" }
  | { readonly kind: "levy.pay" };

export type ModifierSourceRefV1 =
  | { readonly kind: "facility"; readonly facilityId: FacilityId }
  | { readonly kind: "aura"; readonly auraId: AuraId }
  | { readonly kind: "event"; readonly eventId: EventId }
  | { readonly kind: "story"; readonly sourceId: ModifierSourceId };

export type ModifierV1 =
  | {
      readonly kind: "capacity.add";
      readonly source: ModifierSourceRefV1;
      readonly modes: readonly ServiceMode[];
      readonly amount: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "prep_points.add";
      readonly source: ModifierSourceRefV1;
      readonly modes: readonly ServiceMode[];
      readonly amount: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "recovery.add";
      readonly source: ModifierSourceRefV1;
      readonly actorId: ActorId;
      readonly amount: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "demand.add";
      readonly source: ModifierSourceRefV1;
      readonly segmentId: CustomerSegmentId;
      readonly amount: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "check.add";
      readonly source: ModifierSourceRefV1;
      readonly checkId: CheckId;
      readonly amount: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "shelf_life.add_days";
      readonly source: ModifierSourceRefV1;
      readonly ingredientIds: readonly IngredientId[];
      readonly amount: PositiveSafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "teamwork_gain.block";
      readonly source: ModifierSourceRefV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "service_cost.add";
      readonly source: ModifierSourceRefV1;
      readonly modes: readonly ServiceMode[];
      readonly amount: SafeInteger;
      readonly reasonId: ReasonId;
    };

export type EffectIntentV1 =
  | {
      readonly kind: "calendar.ap.adjust";
      readonly delta: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | { readonly kind: "reputation.adjust"; readonly delta: SafeInteger; readonly reasonId: ReasonId }
  | {
      readonly kind: "actor.stamina.adjust";
      readonly actorId: ActorId;
      readonly delta: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "actor.mood.adjust";
      readonly actorId: ActorId;
      readonly delta: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "relationship.affection.adjust";
      readonly delta: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "relationship.teamwork.adjust";
      readonly delta: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "relationship.stage.set";
      readonly stage: RelationshipStage;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "tavern.helper.set";
      readonly helper: HelperStateV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "inventory.grant";
      readonly lines: readonly IngredientQuantityV1[];
      readonly source: InventorySourceRefV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "inventory.consume";
      readonly lines: readonly IngredientQuantityV1[];
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "inventory.item.grant";
      readonly lines: readonly ItemQuantityV1[];
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "inventory.item.consume";
      readonly lines: readonly ItemQuantityV1[];
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "aura.apply";
      readonly auraId: AuraId;
      readonly target: AuraTargetV1;
      readonly source: AuraSourceRefV1;
      readonly duration: AuraDurationV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "aura.clear";
      readonly auraId: AuraId;
      readonly target: AuraTargetV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "fact.set";
      readonly factId: FactId;
      readonly value: StoryValueV1;
      readonly reasonId: ReasonId;
    }
  | { readonly kind: "quest.set"; readonly quest: QuestEntryV1; readonly reasonId: ReasonId }
  | {
      readonly kind: "outcome.set";
      readonly outcomeId: OutcomeId;
      readonly value: StoryValueV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "modifier.add";
      readonly lifetime: "opening_session";
      readonly modifier: ModifierV1;
      readonly reasonId: ReasonId;
    }
  | { readonly kind: "ledger.append"; readonly entry: LedgerEntryDraftV1 };

export type PocEffectIntentV1 = EffectIntentV1;

export type ProgressionEffectIntentV1 = Extract<
  EffectIntentV1,
  { readonly kind: "fact.set" | "quest.set" | "outcome.set" }
>;

export type ChangeReasonV1 =
  | {
      readonly kind: "command";
      readonly commandKind: PocGameCommandV1["kind"];
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug";
      readonly commandKind: PocDebugCommandV1["kind"];
      readonly reasonId: ReasonId;
    }
  | { readonly kind: "event"; readonly eventId: EventId; readonly reasonId: ReasonId }
  | { readonly kind: "story_action"; readonly actionId: ActionId; readonly reasonId: ReasonId }
  | { readonly kind: "world_action"; readonly actionId: ActionId; readonly reasonId: ReasonId }
  | { readonly kind: "aura"; readonly auraId: AuraId; readonly reasonId: ReasonId }
  | { readonly kind: "facility"; readonly facilityId: FacilityId; readonly reasonId: ReasonId }
  | { readonly kind: "ending"; readonly endingId: EndingId; readonly reasonId: ReasonId };

/** Provenance supplied by the executor for one authored Effect batch. */
export type PocEffectSourceV1 =
  | { readonly kind: "command"; readonly commandKind: PocGameCommandV1["kind"] }
  | { readonly kind: "event"; readonly eventId: EventId }
  | { readonly kind: "story_action"; readonly actionId: ActionId }
  | { readonly kind: "world_action"; readonly actionId: ActionId }
  | { readonly kind: "aura"; readonly auraId: AuraId }
  | { readonly kind: "facility"; readonly facilityId: FacilityId }
  | { readonly kind: "ending"; readonly endingId: EndingId };

export interface StaminaChangeComponentV1 {
  readonly requestedDelta: SafeInteger;
  readonly reason: ChangeReasonV1;
}

export type PocGameplayFactV1 =
  | {
      readonly kind: "run.started";
      readonly runId: RunId;
      readonly initialSeed: NonZeroUint32;
      readonly demandSeeds: readonly DemandDayStateV1[];
    }
  | {
      readonly kind: "policy.chosen";
      readonly policyId: PolicyId;
      readonly apRemaining: NonNegativeSafeInteger;
    }
  | { readonly kind: "demand.materialized"; readonly demand: MaterializedDemandDayV1 }
  | {
      readonly kind: "calendar.ap_changed";
      readonly value: BeforeAfterV1<NonNegativeSafeInteger>;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "calendar.phase_advanced";
      readonly from: { readonly day: DayIndex; readonly phase: CalendarPhase };
      readonly to: { readonly day: DayIndex; readonly phase: CalendarPhase };
      readonly apRemaining: NonNegativeSafeInteger;
      readonly expiredAuraIds: readonly AuraInstanceId[];
    }
  | {
      readonly kind: "actor.stamina_changed";
      readonly actorId: ActorId;
      readonly value: BeforeAfterV1<NonNegativeSafeInteger>;
      readonly components: readonly StaminaChangeComponentV1[];
    }
  | {
      readonly kind: "actor.mood_changed";
      readonly actorId: ActorId;
      readonly value: BeforeAfterV1<MoodPoint>;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "relationship.affection_changed";
      readonly value: BeforeAfterV1<SafeInteger>;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "relationship.teamwork_changed";
      readonly value: BeforeAfterV1<NonNegativeSafeInteger>;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "relationship.stage_changed";
      readonly value: BeforeAfterV1<RelationshipStage>;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.purchased";
      readonly lines: readonly PurchaseLineV1[];
      readonly createdBatchIds: readonly BatchId[];
      readonly entries: readonly LedgerEntryV1[];
    }
  | {
      readonly kind: "inventory.consumed";
      readonly lines: readonly BatchConsumptionV1[];
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.ingredient_granted";
      readonly lines: readonly IngredientQuantityV1[];
      readonly createdBatchIds: readonly BatchId[];
      readonly entries: readonly LedgerEntryV1[];
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.item_granted";
      readonly lines: readonly ItemQuantityV1[];
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.item_consumed";
      readonly lines: readonly ItemQuantityV1[];
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.spoiled";
      readonly lines: readonly BatchConsumptionV1[];
      readonly entries: readonly LedgerEntryV1[];
    }
  | {
      readonly kind: "food.prepared";
      readonly day: DayIndex;
      readonly actionCount: NonNegativeSafeInteger;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "food.discarded";
      readonly portions: readonly PlannedRecipeV1[];
      readonly entries: readonly LedgerEntryV1[];
    }
  | {
      readonly kind: "cash.changed";
      readonly value: BeforeAfterV1<Money>;
      readonly delta: SafeInteger;
      readonly entryIds: readonly LedgerEntryId[];
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "reputation.changed";
      readonly value: BeforeAfterV1<NonNegativeSafeInteger>;
      readonly delta: SafeInteger;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "tavern.helper_changed";
      readonly value: BeforeAfterV1<HelperStateV1>;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "story.action_started";
      readonly actionId: ActionId;
      readonly sceneId: SceneId | null;
    }
  | {
      readonly kind: "facility.choice_committed";
      readonly opportunityId: ActionId;
      readonly choice: FacilityDecisionV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "aura.applied";
      readonly aura: AuraInstanceV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "aura.cleared";
      readonly instanceId: AuraInstanceId;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "aura.expired";
      readonly instanceId: AuraInstanceId;
      readonly auraId: AuraId;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "tavern.plan_set";
      readonly plan: TavernPlanV1;
      readonly reason: ChangeReasonV1;
    }
  | { readonly kind: "tavern.planned_closed"; readonly closure: ClosureHistoryV1 }
  | { readonly kind: "tavern.emergency_closed"; readonly closure: ClosureHistoryV1 }
  | {
      readonly kind: "opening.started";
      readonly sessionId: OpeningSessionId;
      readonly checkpoint: OpeningCheckpointV1;
    }
  | {
      readonly kind: "opening.checkpoint_advanced";
      readonly sessionId: OpeningSessionId;
      readonly from: OpeningCheckpointV1;
      readonly to: OpeningCheckpointV1;
    }
  | {
      readonly kind: "scheduler.event_triggered";
      readonly checkpointId: CheckpointId;
      readonly eventId: EventId;
    }
  | {
      readonly kind: "service.orders_created";
      readonly sessionId: OpeningSessionId;
      readonly orders: readonly OpeningOrderLineV1[];
    }
  | {
      readonly kind: "service.capacity_limited";
      readonly sessionId: OpeningSessionId;
      readonly receptionCapacity: NonNegativeSafeInteger;
      readonly preparationCapacity: NonNegativeSafeInteger;
    }
  | {
      readonly kind: "service.sale";
      readonly sessionId: OpeningSessionId;
      readonly recipeId: RecipeId;
      readonly quantity: Quantity;
      readonly revenue: NonNegativeSafeInteger;
    }
  | { readonly kind: "opening.finalized"; readonly ledger: OpeningLedgerV1 }
  | {
      readonly kind: "world.action_started";
      readonly actionId: ActionId;
      readonly stepId: WorldStepId;
    }
  | {
      readonly kind: "world.action_completed";
      readonly actionId: ActionId;
      readonly bandId: CheckBandId | null;
    }
  | {
      readonly kind: "narrative.advanced";
      readonly from: NarrativeCursorV1;
      readonly to: NarrativeCursorV1 | null;
    }
  | {
      readonly kind: "narrative.choice_committed";
      readonly cursor: NarrativeCursorV1;
      readonly choiceId: ChoiceId;
    }
  | { readonly kind: "check.resolved"; readonly result: CheckResultV1 }
  | {
      readonly kind: "fact.set";
      readonly factId: FactId;
      readonly value: StoryValueV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "quest.updated";
      readonly quest: QuestEntryV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "outcome.set";
      readonly outcomeId: OutcomeId;
      readonly value: StoryValueV1;
      readonly reason: ChangeReasonV1;
    }
  | { readonly kind: "levy.paid"; readonly amount: Money; readonly cash: BeforeAfterV1<Money> }
  | { readonly kind: "run.completed"; readonly completion: RunCompletionV1 };

export type CommandReferenceV1 =
  | { readonly kind: "policy"; readonly policyId: PolicyId }
  | { readonly kind: "action"; readonly actionId: ActionId }
  | { readonly kind: "ingredient"; readonly ingredientId: IngredientId }
  | { readonly kind: "recipe"; readonly recipeId: RecipeId }
  | { readonly kind: "facility"; readonly facilityId: FacilityId }
  | { readonly kind: "facility_opportunity"; readonly opportunityId: ActionId }
  | { readonly kind: "world_option"; readonly actionId: ActionId; readonly optionId: ChoiceId }
  | { readonly kind: "scene"; readonly sceneId: SceneId }
  | { readonly kind: "node"; readonly sceneId: SceneId; readonly nodeId: NodeId }
  | {
      readonly kind: "choice";
      readonly sceneId: SceneId;
      readonly nodeId: NodeId;
      readonly choiceId: ChoiceId;
    };

export type WorkflowBlockerV1 =
  | { readonly kind: "opening"; readonly checkpoint: OpeningCheckpointV1 }
  | { readonly kind: "world_action"; readonly progress: WorldActionProgressV1 };

export type StoryRuleFaultCodeV1 =
  "rule.threw" | "rule.returned_thenable" | "rule.output_invalid" | "effect.invalid";

export type CommandHandlerFaultCodeV1 =
  | "command.handler_threw"
  | "command.handler_not_implemented"
  | "narrative.step_limit_exceeded"
  | "narrative.call_depth_exceeded";

export type EngineInvariantCodeV1 =
  | "snapshot.schema"
  | "rng.invalid"
  | "resource.negative"
  | "stamina.above_maximum"
  | "calendar.invalid"
  | "workflow.conflict"
  | "scheduler.multiple_blocking_events"
  | "narrative.blocking_conflict"
  | "opening.invalid_checkpoint"
  | "narrative.invalid_cursor"
  | "story.reference_missing"
  | "story.value_invalid"
  | "collection.duplicate_id"
  | "collection.unstable_order"
  | "ledger.unbalanced"
  | "terminal_state.invalid";

export type PocRejectionReasonV1 =
  | {
      readonly code: "run.invalid_status";
      readonly details: { readonly actual: RunStatus; readonly allowed: readonly RunStatus[] };
    }
  | {
      readonly code: "run.already_started";
      readonly details: { readonly commandSequence: PositiveSafeInteger };
    }
  | {
      readonly code: "run.not_started";
      readonly details: { readonly commandKind: Exclude<PocGameCommandV1["kind"], "run.start"> };
    }
  | {
      readonly code: "run.policy_required";
      readonly details: { readonly commandKind: PocGameCommandV1["kind"] };
    }
  | {
      readonly code: "command.unknown_reference";
      readonly details: {
        readonly commandKind: PocGameCommandV1["kind"];
        readonly reference: CommandReferenceV1;
      };
    }
  | {
      readonly code: "command.blocked_by_narrative";
      readonly details: {
        readonly commandKind: PocGameCommandV1["kind"];
        readonly cursor: NarrativeCursorV1;
      };
    }
  | {
      readonly code: "command.blocked_by_workflow";
      readonly details: {
        readonly commandKind: PocGameCommandV1["kind"];
        readonly blocker: WorkflowBlockerV1;
      };
    }
  | { readonly code: "policy.already_chosen"; readonly details: { readonly policyId: PolicyId } }
  | {
      readonly code: "calendar.invalid_phase";
      readonly details: {
        readonly actual: CalendarPhase;
        readonly allowed: readonly CalendarPhase[];
      };
    }
  | {
      readonly code: "calendar.insufficient_ap";
      readonly details: {
        readonly required: NonNegativeSafeInteger;
        readonly available: NonNegativeSafeInteger;
      };
    }
  | {
      readonly code: "calendar.phase_blocked";
      readonly details: {
        readonly blocker:
          "narrative" | "opening" | "world_action" | "evening_unresolved" | "levy_due";
      };
    }
  | {
      readonly code: "action.unavailable";
      readonly details: { readonly actionId: ActionId; readonly reasonId: ReasonId };
    }
  | {
      readonly code: "actor.insufficient_stamina";
      readonly details: {
        readonly actorId: ActorId;
        readonly required: NonNegativeSafeInteger;
        readonly available: NonNegativeSafeInteger;
      };
    }
  | {
      readonly code: "actor.stamina_at_maximum";
      readonly details: { readonly actorId: ActorId; readonly maximum: PositiveSafeInteger };
    }
  | {
      readonly code: "tavern.preparation_limit_reached";
      readonly details: {
        readonly current: NonNegativeSafeInteger;
        readonly limit: PositiveSafeInteger;
      };
    }
  | {
      readonly code: "inventory.invalid_quantity";
      readonly details: { readonly ingredientId: IngredientId; readonly quantity: SafeInteger };
    }
  | {
      readonly code: "inventory.duplicate_line";
      readonly details: { readonly ingredientId: IngredientId };
    }
  | {
      readonly code: "inventory.line_limit_exceeded";
      readonly details: {
        readonly actual: PositiveSafeInteger;
        readonly limit: PositiveSafeInteger;
      };
    }
  | {
      readonly code: "inventory.insufficient_cash";
      readonly details: { readonly required: Money; readonly available: Money };
    }
  | {
      readonly code: "inventory.insufficient_ingredient";
      readonly details: {
        readonly ingredientId: IngredientId;
        readonly required: Quantity;
        readonly available: NonNegativeSafeInteger;
      };
    }
  | {
      readonly code: "facility.unavailable";
      readonly details: {
        readonly opportunityId: ActionId;
        readonly facilityId: FacilityId | null;
        readonly reasonId: ReasonId;
      };
    }
  | {
      readonly code: "facility.target_not_offered";
      readonly details: { readonly opportunityId: ActionId; readonly facilityId: FacilityId };
    }
  | {
      readonly code: "facility.already_built";
      readonly details: { readonly facilityId: FacilityId };
    }
  | {
      readonly code: "facility.choice_committed";
      readonly details: {
        readonly opportunityId: ActionId;
        readonly choice: FacilityDecisionV1;
      };
    }
  | {
      readonly code: "aura.already_present";
      readonly details: { readonly auraId: AuraId; readonly target: AuraTargetV1 };
    }
  | {
      readonly code: "aura.not_found";
      readonly details: { readonly auraId: AuraId; readonly target: AuraTargetV1 };
    }
  | {
      readonly code: "tavern.invalid_plan";
      readonly details: {
        readonly reason:
          | "menu_size"
          | "closed_has_menu"
          | "open_has_no_menu"
          | "duplicate_recipe"
          | "unknown_recipe"
          | "locked_recipe"
          | "capacity"
          | "preparation_capacity";
      };
    }
  | {
      readonly code: "tavern.plan_frozen";
      readonly details: { readonly day: DayIndex; readonly phase: CalendarPhase };
    }
  | {
      readonly code: "tavern.service_unavailable";
      readonly details: { readonly mode: ServiceMode; readonly reasonId: ReasonId };
    }
  | {
      readonly code: "tavern.opening_plan_missing";
      readonly details: { readonly day: DayIndex };
    }
  | {
      readonly code: "tavern.evening_resolved";
      readonly details: { readonly day: DayIndex; readonly planMode: ServiceMode | null };
    }
  | {
      readonly code: "tavern.opening_active";
      readonly details: { readonly sessionId: OpeningSessionId };
    }
  | {
      readonly code: "tavern.opening_missing";
      readonly details: {
        readonly commandKind: "tavern.opening.continue" | "tavern.opening.finalize";
      };
    }
  | {
      readonly code: "tavern.opening_checkpoint_blocked";
      readonly details: {
        readonly checkpoint: OpeningCheckpointV1;
        readonly eventId: EventId | null;
      };
    }
  | {
      readonly code: "tavern.opening_continue_not_needed";
      readonly details: { readonly checkpoint: "ready_to_finalize" };
    }
  | {
      readonly code: "tavern.opening_not_ready";
      readonly details: { readonly checkpoint: OpeningCheckpointV1 };
    }
  | {
      readonly code: "workflow.conflict";
      readonly details: {
        readonly activeKind: ActiveWorkflowV1["kind"];
        readonly attemptedKind: ActiveWorkflowV1["kind"];
      };
    }
  | {
      readonly code: "workflow.missing";
      readonly details: {
        readonly expectedKind: ActiveWorkflowV1["kind"];
        readonly commandKind: "world.action.complete";
      };
    }
  | {
      readonly code: "world.action_unavailable";
      readonly details: {
        readonly actionId: ActionId;
        readonly optionId: ChoiceId | null;
        readonly reasonId: ReasonId;
      };
    }
  | {
      readonly code: "world.action_wrong_phase";
      readonly details: {
        readonly actionId: ActionId;
        readonly expected: CalendarPhase;
        readonly actual: CalendarPhase;
      };
    }
  | {
      readonly code: "narrative.inactive";
      readonly details: { readonly commandKind: "narrative.advance" | "narrative.choose" };
    }
  | {
      readonly code: "narrative.cursor_mismatch";
      readonly details: {
        readonly expected: NarrativeCursorV1;
        readonly actual: NarrativeCursorV1 | null;
      };
    }
  | {
      readonly code: "narrative.choice_required";
      readonly details: { readonly cursor: NarrativeCursorV1 };
    }
  | {
      readonly code: "narrative.choice_hidden";
      readonly details: { readonly choiceId: ChoiceId };
    }
  | {
      readonly code: "narrative.choice_disabled";
      readonly details: { readonly choiceId: ChoiceId; readonly reasonId: ReasonId };
    }
  | {
      readonly code: "levy.not_due";
      readonly details: { readonly day: DayIndex; readonly phase: CalendarPhase };
    }
  | {
      readonly code: "story.rule_rejected";
      readonly details: { readonly slot: StoryRuleSlotV1; readonly reasonId: ReasonId };
    }
  | {
      readonly code: "engine.invariant_rejected";
      readonly details: { readonly invariantCode: EngineInvariantCodeV1 };
    };

export type ConditionV1 =
  | {
      readonly kind: "actor.rank_at_least";
      readonly attribute: AttributeId;
      readonly rank: AttributeRank;
    }
  | { readonly kind: "relationship.stage_is"; readonly stage: RelationshipStage }
  | { readonly kind: "relationship.affection_at_least"; readonly value: SafeInteger }
  | {
      readonly kind: "fact.equals";
      readonly factId: FactId;
      readonly value: StoryValueV1;
    }
  | {
      readonly kind: "quest.status_is";
      readonly questId: QuestId;
      readonly status: QuestStatusV1;
    }
  | {
      readonly kind: "outcome.equals";
      readonly outcomeId: OutcomeId;
      readonly value: StoryValueV1;
    }
  | { readonly kind: "aura.present"; readonly auraId: AuraId; readonly target: AuraTargetV1 }
  | {
      readonly kind: "inventory.ingredient_at_least";
      readonly ingredientId: IngredientId;
      readonly quantity: Quantity;
    }
  | { readonly kind: "tavern.helper_tier_at_least"; readonly tier: HelperTier }
  | {
      readonly kind: "tavern.facility_opportunity_undecided";
      readonly opportunityId: ActionId;
    }
  | { readonly kind: "tavern.reputation_at_least"; readonly value: NonNegativeSafeInteger }
  | { readonly kind: "calendar.day_at_least"; readonly day: DayIndex }
  | { readonly kind: "calendar.day_at_most"; readonly day: DayIndex }
  | {
      readonly kind: "calendar.matches";
      readonly day: DayIndex;
      readonly phases: readonly CalendarPhase[];
    }
  | { readonly kind: "narrative.not_active" }
  | { readonly kind: "run.started" }
  | { readonly kind: "run.status_is"; readonly status: RunStatus };

export interface AvailabilityGateV1 {
  readonly conditions: readonly ConditionV1[];
  readonly reasonId: ReasonId;
}

export interface ConfirmationMetadataV1 {
  readonly benefitTextIds: readonly TextId[];
  readonly mutuallyExcludedActionIds: readonly ActionId[];
  readonly majorRiskTextIds: readonly TextId[];
}

export type StageCueV1 =
  | {
      readonly kind: "background.set";
      readonly assetId: AssetId;
      readonly transition: "cut" | "fade";
    }
  | {
      readonly kind: "character.show";
      readonly slot: CharacterSlotV1;
      readonly characterId: CharacterId;
      readonly poseAssetId: AssetId;
    }
  | { readonly kind: "character.hide"; readonly slot: CharacterSlotV1 }
  | { readonly kind: "stage.clear"; readonly transition: "cut" | "fade" };

export interface CheckRequestV1 {
  readonly checkId: CheckId;
  readonly actorId: "actor.player";
  readonly preparationBonus: SafeInteger;
}

export interface NarrativeChoiceV1 {
  readonly choiceId: ChoiceId;
  readonly textId: TextId;
  readonly showWhen: readonly ConditionV1[];
  readonly enableWhen: readonly ConditionV1[];
  readonly disabledReasonId?: ReasonId;
  readonly confirmation: ConfirmationMetadataV1;
  readonly check?: CheckRequestV1;
  readonly effects: readonly EffectIntentV1[];
  readonly nextNodeId: NodeId;
}

export type NarrativeNodeV1 =
  | {
      readonly kind: "line";
      readonly nodeId: NodeId;
      readonly speakerId: CharacterId;
      readonly textId: TextId;
      readonly nextNodeId: NodeId;
    }
  | {
      readonly kind: "narration";
      readonly nodeId: NodeId;
      readonly textId: TextId;
      readonly nextNodeId: NodeId;
    }
  | {
      readonly kind: "choice";
      readonly nodeId: NodeId;
      readonly choices: readonly NarrativeChoiceV1[];
    }
  | {
      readonly kind: "condition";
      readonly nodeId: NodeId;
      readonly when: readonly ConditionV1[];
      readonly passNodeId: NodeId;
      readonly failNodeId: NodeId;
    }
  | {
      readonly kind: "check";
      readonly nodeId: NodeId;
      readonly request: CheckRequestV1;
      readonly branches: readonly CheckBranchV1[];
    }
  | {
      readonly kind: "command";
      readonly nodeId: NodeId;
      readonly effects: readonly EffectIntentV1[];
      readonly nextNodeId: NodeId;
    }
  | {
      readonly kind: "eventCheckpoint";
      readonly nodeId: NodeId;
      readonly checkpointId: CheckpointId;
      readonly nextNodeId: NodeId;
    }
  | { readonly kind: "jump"; readonly nodeId: NodeId; readonly targetNodeId: NodeId }
  | {
      readonly kind: "call";
      readonly nodeId: NodeId;
      readonly sceneId: SceneId;
      readonly entryNodeId: NodeId;
      readonly returnNodeId: NodeId;
    }
  | { readonly kind: "return"; readonly nodeId: NodeId }
  | {
      readonly kind: "stageCue";
      readonly nodeId: NodeId;
      readonly cue: StageCueV1;
      readonly nextNodeId: NodeId;
    }
  | { readonly kind: "end"; readonly nodeId: NodeId };

export interface CheckBranchV1 {
  readonly bandId: CheckBandId;
  readonly nextNodeId: NodeId;
}

export interface NarrativeSceneV1 {
  readonly sceneId: SceneId;
  readonly entryNodeId: NodeId;
  readonly nodes: readonly NarrativeNodeV1[];
}

export interface TextEntryV1 {
  readonly textId: TextId;
}

export interface StoryCharacterDefinitionV1 {
  readonly characterId: CharacterId;
  readonly nameTextId: TextId;
  readonly actorId: ActorId | null;
}

export interface ReasonDefinitionV1 {
  readonly reasonId: ReasonId;
  readonly textId: TextId;
}

export interface CustomerSegmentDefinitionV1 {
  readonly segmentId: CustomerSegmentId;
  readonly nameTextId: TextId;
}

export interface ModifierSourceDefinitionV1 {
  readonly sourceId: ModifierSourceId;
  readonly nameTextId: TextId;
}

export type ActionOccupationDefinitionV1 =
  | { readonly kind: "none" }
  | { readonly kind: "current_phase" }
  | { readonly kind: "fixed"; readonly phases: readonly CalendarPhase[] };

export interface ActionPresentationDefinitionV1 {
  readonly actionId: ActionId;
  readonly labelTextId: TextId;
  readonly commandKind: PocGameCommandV1["kind"];
  readonly availablePhases: readonly CalendarPhase[];
  readonly occupation: ActionOccupationDefinitionV1;
  readonly visibility: readonly AvailabilityGateV1[];
  readonly availability: readonly AvailabilityGateV1[];
  readonly confirmation: ConfirmationMetadataV1;
}

export interface StoryActionDefinitionV1 {
  readonly actionId: ActionId;
  readonly sceneId: SceneId | null;
  readonly startEffects: readonly EffectIntentV1[];
}

export interface IngredientDefinitionV1 {
  readonly ingredientId: IngredientId;
  readonly nameTextId: TextId;
  readonly unitPrice: Money;
  readonly shelfLifeDays: PositiveSafeInteger;
  readonly refrigeratable: boolean;
}

export interface ItemDefinitionV1 {
  readonly itemId: ItemId;
  readonly nameTextId: TextId;
}

export interface RecipeIngredientV1 {
  readonly ingredientId: IngredientId;
  readonly quantity: Quantity;
}

export interface SegmentPreferenceV1 {
  readonly segmentId: CustomerSegmentId;
  readonly value: 0 | 1 | 2 | 3;
}

export interface RecipeDefinitionV1 {
  readonly recipeId: RecipeId;
  readonly nameTextId: TextId;
  readonly ingredients: readonly RecipeIngredientV1[];
  readonly salePrice: Money;
  readonly prepPoints: PositiveSafeInteger;
  readonly preferences: readonly SegmentPreferenceV1[];
}

export interface ApByPhaseV1 {
  readonly morning: NonNegativeSafeInteger;
  readonly afternoon: NonNegativeSafeInteger;
  readonly evening: NonNegativeSafeInteger;
}

export interface LifePolicyDefinitionV1 {
  readonly policyId: PolicyId;
  readonly nameTextId: TextId;
  readonly apByPhase: ApByPhaseV1;
  readonly playerNightRecovery: NonNegativeSafeInteger;
  readonly nightRecoveryReasonId: ReasonId;
}

export interface FacilityDefinitionV1 {
  readonly facilityId: FacilityId;
  readonly nameTextId: TextId;
  readonly cashCost: Money;
  readonly modifiers: readonly ModifierV1[];
  readonly confirmation: ConfirmationMetadataV1;
}

export interface FacilityOpportunityDefinitionV1 {
  readonly opportunityId: ActionId;
  readonly availability: readonly AvailabilityGateV1[];
  readonly facilityIds: readonly FacilityId[];
  readonly confirmation: ConfirmationMetadataV1;
  readonly skipConfirmation: ConfirmationMetadataV1;
  readonly skipReasonId: ReasonId;
}

export interface AuraDefinitionV1 {
  readonly auraId: AuraId;
  readonly nameTextId: TextId;
  readonly reasonId: ReasonId;
  readonly durationPolicy: AuraDurationPolicyV1;
  readonly visibility: "buff" | "debuff" | "hidden";
  readonly allowedTargets: readonly AuraTargetV1[];
  readonly modifiers: readonly ModifierV1[];
}

export interface WorldActionStepDefinitionV1 {
  readonly stepId: WorldStepId;
  readonly phase: CalendarPhase;
  readonly apCost: NonNegativeSafeInteger;
  readonly sceneId: SceneId;
}

export interface WorldActionOptionDefinitionV1 {
  readonly optionId: ChoiceId;
  readonly labelTextId: TextId;
  readonly availability: readonly AvailabilityGateV1[];
  readonly additionalCashCost: Money;
  readonly preparationBonus: SafeInteger;
  readonly beginEffects: readonly EffectIntentV1[];
  readonly confirmation: ConfirmationMetadataV1;
}

export interface WorldActionDefinitionV1 {
  readonly actionId: ActionId;
  readonly nameTextId: TextId;
  readonly availability: readonly AvailabilityGateV1[];
  readonly reasonId: ReasonId;
  readonly baseCashCost: Money;
  readonly playerStaminaCost: NonNegativeSafeInteger;
  readonly beginEffects: readonly EffectIntentV1[];
  readonly options: readonly WorldActionOptionDefinitionV1[];
  readonly steps: readonly [WorldActionStepDefinitionV1, WorldActionStepDefinitionV1];
  readonly checkId: CheckId | null;
}

export type EventTriggerV1 =
  | {
      readonly kind: "phase.entered";
      readonly days: readonly DayIndex[];
      readonly phases: readonly CalendarPhase[];
    }
  | {
      readonly kind: "command.succeeded";
      readonly commandKinds: readonly PocGameCommandV1["kind"][];
    }
  | { readonly kind: "opening.started" }
  | { readonly kind: "opening.middle" }
  | { readonly kind: "opening.before_finalize" }
  | { readonly kind: "day.ended"; readonly days: readonly DayIndex[] }
  | { readonly kind: "week.ended" }
  | { readonly kind: "story.explicit"; readonly checkpointId: CheckpointId };

export type SchedulerContextV1 =
  | { readonly kind: "phase.entered"; readonly day: DayIndex; readonly phase: CalendarPhase }
  | { readonly kind: "command.succeeded"; readonly commandKind: PocGameCommandV1["kind"] }
  | { readonly kind: "opening.started"; readonly sessionId: OpeningSessionId }
  | { readonly kind: "opening.middle"; readonly sessionId: OpeningSessionId }
  | { readonly kind: "opening.before_finalize"; readonly sessionId: OpeningSessionId }
  | { readonly kind: "day.ended"; readonly day: DayIndex }
  | { readonly kind: "week.ended" }
  | { readonly kind: "story.explicit"; readonly checkpointId: CheckpointId };

export interface StoryEventDefinitionV1 {
  readonly eventId: EventId;
  readonly checkpointId: CheckpointId;
  readonly trigger: EventTriggerV1;
  readonly priority: SafeInteger;
  readonly weightedGroupId: WeightedGroupId | null;
  readonly weight: NonNegativeSafeInteger;
  readonly when: readonly ConditionV1[];
  readonly sceneId: SceneId | null;
  readonly effects: readonly EffectIntentV1[];
}

export interface CheckOutcomeBandV1 {
  readonly bandId: CheckBandId;
  readonly minInclusive: SafeInteger;
  readonly maxInclusive: SafeInteger | null;
  readonly effects: readonly EffectIntentV1[];
}

export interface CheckDefinitionV1 {
  readonly checkId: CheckId;
  readonly attribute: AttributeId;
  readonly dice: "2d6";
  readonly bands: readonly CheckOutcomeBandV1[];
}

export interface EndingDefinitionV1 {
  readonly endingId: EndingId;
  readonly status: "completed_stable" | "completed_danger" | "failed_arrears";
  readonly nameTextId: TextId;
  readonly summaryOutcomeIds: {
    readonly relationship: OutcomeId;
    readonly investigation: OutcomeId;
  };
  readonly effects: readonly ProgressionEffectIntentV1[];
}

export type StoryValueDefinitionV1 =
  | { readonly kind: "boolean"; readonly defaultValue: boolean }
  | {
      readonly kind: "integer";
      readonly defaultValue: SafeInteger;
      readonly range: IntegerRangeV1;
    }
  | {
      readonly kind: "token";
      readonly defaultValue: StoryToken;
      readonly allowedValues: readonly StoryToken[];
    };

export interface FactDefinitionV1 {
  readonly factId: FactId;
  readonly value: StoryValueDefinitionV1;
}

export interface QuestDefinitionV1 {
  readonly questId: QuestId;
  readonly initial: QuestEntryV1;
}

export interface OutcomeDefinitionV1 {
  readonly outcomeId: OutcomeId;
  readonly value: StoryValueDefinitionV1;
}

export interface StoryStateDefinitionsV1 {
  readonly facts: readonly FactDefinitionV1[];
  readonly quests: readonly QuestDefinitionV1[];
  readonly outcomes: readonly OutcomeDefinitionV1[];
}

export interface StoryInitialStateV1 {
  readonly player: PlayerActorStateV1;
  readonly heroine: HeroineActorStateV1;
  readonly relationship: RelationshipStateV1;
  readonly cash: Money;
  readonly reputation: NonNegativeSafeInteger;
  readonly helper: HelperStateV1;
  readonly unlockedRecipeIds: readonly RecipeId[];
  readonly ingredientBatches: readonly InventoryBatchV1[];
  readonly itemStacks: readonly ItemStackV1[];
  readonly auras: readonly AuraInstanceV1[];
}

export type FixedActionCostKeyV1 =
  "inventory.buy" | "actor.prepare_food" | "actor.rest" | "facility.choose.build";

export interface ActionCostDefinitionV1 {
  readonly action: FixedActionCostKeyV1;
  readonly apCost: NonNegativeSafeInteger;
  readonly playerStaminaCost: NonNegativeSafeInteger;
  readonly heroineStaminaCost: NonNegativeSafeInteger;
  readonly reasonId: ReasonId;
}

export interface ServiceModeDefinitionV1 {
  readonly mode: ServiceMode;
  readonly availability: readonly AvailabilityGateV1[];
  readonly confirmation: ConfirmationMetadataV1;
  readonly reasonId: ReasonId;
  readonly apCost: NonNegativeSafeInteger;
  readonly playerStaminaCost: NonNegativeSafeInteger;
  readonly heroineStaminaCost: NonNegativeSafeInteger;
  readonly wage: Money;
  readonly baseReceptionCapacity: NonNegativeSafeInteger;
  readonly basePreparationPoints: NonNegativeSafeInteger;
  readonly teamworkGain: NonNegativeSafeInteger;
  readonly preparationPointsPerAction: NonNegativeSafeInteger;
}

export interface BaseDemandLineV1 {
  readonly day: DayIndex;
  readonly segmentId: CustomerSegmentId;
  readonly customers: NonNegativeSafeInteger;
}

export interface LedgerReasonBindingsV1 {
  readonly purchase: ReasonId;
  readonly serviceWage: ReasonId;
  readonly openingFee: ReasonId;
  readonly revenue: ReasonId;
  readonly discardedFood: ReasonId;
  readonly spoiledIngredient: ReasonId;
  readonly facilityBuild: ReasonId;
  readonly worldActionCost: ReasonId;
  readonly levy: ReasonId;
}

export interface EmergencyClosureDefinitionV1 {
  readonly reputationPenalty: NonNegativeSafeInteger;
  readonly reasonId: ReasonId;
}

export type ObligationForecastKindV1 = "current_gap" | "committed_plan_conservative" | "final";

export interface ObligationRecommendationDefinitionV1 {
  readonly textId: TextId;
  readonly actionId: ActionId | null;
  readonly appliesTo: readonly ObligationForecastKindV1[];
}

export interface ObligationForecastPolicyV1 {
  readonly visibleFrom: { readonly day: DayIndex; readonly phase: CalendarPhase };
  readonly conservativeFrom: { readonly day: DayIndex; readonly phase: CalendarPhase };
  readonly reasonId: ReasonId;
  readonly recommendations: readonly ObligationRecommendationDefinitionV1[];
}

export interface EndingPolicyV1 {
  readonly stableMinimumCashAfterLevy: Money;
  readonly stableMinimumReputation: NonNegativeSafeInteger;
  readonly stableMinimumBuiltFacilities: PositiveSafeInteger;
  readonly reputationCrisisBelow: NonNegativeSafeInteger;
  readonly stableReasonId: ReasonId;
  readonly dangerReasonId: ReasonId;
  readonly arrearsReasonId: ReasonId;
  readonly reputationCrisisReasonId: ReasonId;
}

export interface StoryBalanceV1 {
  readonly lifePolicies: readonly [LifePolicyDefinitionV1, ...LifePolicyDefinitionV1[]];
  readonly actionCosts: readonly ActionCostDefinitionV1[];
  readonly serviceModes: readonly ServiceModeDefinitionV1[];
  readonly serviceDays: readonly DayIndex[];
  readonly baseDemand: readonly BaseDemandLineV1[];
  readonly ledgerReasons: LedgerReasonBindingsV1;
  readonly emergencyClosure: EmergencyClosureDefinitionV1;
  readonly plannedClosureReasonId: ReasonId;
  readonly heroineNightRecovery: NonNegativeSafeInteger;
  readonly heroineNightRecoveryReasonId: ReasonId;
  readonly restRecovery: NonNegativeSafeInteger;
  readonly purchaseLineLimit: PositiveSafeInteger;
  readonly menuRecipeLimit: PositiveSafeInteger;
  readonly dailyPreparationLimit: PositiveSafeInteger;
  readonly openingFee: Money;
  readonly levyAmount: Money;
  readonly levyDue: { readonly day: DayIndex; readonly phase: CalendarPhase };
  readonly obligationForecast: ObligationForecastPolicyV1;
  readonly endingPolicy: EndingPolicyV1;
  readonly maxNarrativeStepsPerCommand: PositiveSafeInteger;
  readonly maxNarrativeCallDepth: PositiveSafeInteger;
}

export interface StoryContentV1 {
  readonly texts: readonly TextEntryV1[];
  readonly characters: readonly StoryCharacterDefinitionV1[];
  readonly reasons: readonly ReasonDefinitionV1[];
  readonly actions: readonly ActionPresentationDefinitionV1[];
  readonly storyActions: readonly StoryActionDefinitionV1[];
  readonly customerSegments: readonly CustomerSegmentDefinitionV1[];
  readonly modifierSources: readonly ModifierSourceDefinitionV1[];
  readonly ingredients: readonly IngredientDefinitionV1[];
  readonly items: readonly ItemDefinitionV1[];
  readonly recipes: readonly RecipeDefinitionV1[];
  readonly facilities: readonly FacilityDefinitionV1[];
  readonly facilityOpportunities: readonly FacilityOpportunityDefinitionV1[];
  readonly auras: readonly AuraDefinitionV1[];
  readonly worldActions: readonly WorldActionDefinitionV1[];
  readonly events: readonly StoryEventDefinitionV1[];
  readonly checks: readonly CheckDefinitionV1[];
  readonly endings: readonly EndingDefinitionV1[];
  readonly scenes: readonly NarrativeSceneV1[];
}

export interface StorySourceIdentityV1 {
  readonly id: StoryId;
  readonly revision: PositiveSafeInteger;
}

export interface StoryManifestV1 {
  readonly titleTextId: TextId;
  readonly initialSceneId: SceneId;
  readonly playableDays: PositiveSafeInteger;
}

export interface PocStoryDataV1 {
  readonly dataRevision: 1;
  readonly manifest: StoryManifestV1;
  readonly stateDefinitions: StoryStateDefinitionsV1;
  readonly initialState: StoryInitialStateV1;
  readonly balance: StoryBalanceV1;
  readonly content: StoryContentV1;
}

export interface PocSimulationManifestV1 {
  readonly initialSceneId: SceneId;
  readonly playableDays: PositiveSafeInteger;
}

export interface PocSimulationContentV1 {
  readonly characters: readonly StoryCharacterDefinitionV1[];
  readonly reasons: readonly ReasonDefinitionV1[];
  readonly actions: readonly ActionPresentationDefinitionV1[];
  readonly storyActions: readonly StoryActionDefinitionV1[];
  readonly customerSegments: readonly CustomerSegmentDefinitionV1[];
  readonly modifierSources: readonly ModifierSourceDefinitionV1[];
  readonly ingredients: readonly IngredientDefinitionV1[];
  readonly items: readonly ItemDefinitionV1[];
  readonly recipes: readonly RecipeDefinitionV1[];
  readonly facilities: readonly FacilityDefinitionV1[];
  readonly facilityOpportunities: readonly FacilityOpportunityDefinitionV1[];
  readonly auras: readonly AuraDefinitionV1[];
  readonly worldActions: readonly WorldActionDefinitionV1[];
  readonly events: readonly StoryEventDefinitionV1[];
  readonly checks: readonly CheckDefinitionV1[];
  readonly endings: readonly EndingDefinitionV1[];
}

export interface PocNarrativeProgramV1 {
  readonly scenes: readonly NarrativeSceneV1[];
}

export interface PocSimulationDataV1 {
  readonly dataRevision: 1;
  readonly manifest: PocSimulationManifestV1;
  readonly stateDefinitions: StoryStateDefinitionsV1;
  readonly initialState: StoryInitialStateV1;
  readonly balance: StoryBalanceV1;
  readonly content: PocSimulationContentV1;
  readonly narrative: PocNarrativeProgramV1;
}

export interface DemandSeedInputLineV1 {
  readonly day: DayIndex;
  readonly segmentId: CustomerSegmentId;
  readonly baseCustomers: NonNegativeSafeInteger;
}

export interface DemandSeedInputV1 {
  readonly runId: RunId;
  readonly segments: readonly DemandSeedInputLineV1[];
}

export interface DemandSeedResultLineV1 {
  readonly day: DayIndex;
  readonly segmentId: CustomerSegmentId;
  readonly randomOffset: DemandRandomOffset;
}

export interface DemandSeedResultV1 {
  readonly lines: readonly DemandSeedResultLineV1[];
}

export interface DemandProjectionInputV1 {
  readonly day: DayIndex;
  readonly seeds: readonly DemandSeedSegmentStateV1[];
  readonly reputation: NonNegativeSafeInteger;
  readonly facts: readonly FactEntryV1[];
  readonly modifiers: readonly ModifierV1[];
}

export interface DemandPreviewLineV1 {
  readonly segmentId: CustomerSegmentId;
  readonly range: IntegerRangeV1;
  readonly actualCustomers: NonNegativeSafeInteger;
  readonly modifiers: readonly AppliedModifierV1[];
}

export interface DemandPreviewV1 {
  readonly day: DayIndex;
  readonly lines: readonly DemandPreviewLineV1[];
}

export type TavernPreviewInputV1 =
  | {
      readonly basis: "current_state";
      readonly day: DayIndex;
      readonly plan: TavernPlanV1;
      readonly preparationActionCount: NonNegativeSafeInteger;
      readonly availableIngredients: readonly IngredientQuantityV1[];
      readonly demand: readonly MaterializedDemandSegmentV1[];
      readonly actors: OpeningActorInputsV1;
      readonly facilityIds: readonly FacilityId[];
      readonly modifiers: readonly ModifierV1[];
      readonly resources: {
        readonly apRemaining: NonNegativeSafeInteger;
        readonly cash: Money;
        readonly playerStamina: NonNegativeSafeInteger;
        readonly heroineStamina: NonNegativeSafeInteger;
      };
    }
  | {
      readonly basis: "active_opening_baseline";
      readonly plan: TavernPlanV1;
      readonly session: OpeningSessionV1;
    };

export interface TavernOpeningCashCostV1 {
  readonly wage: Money;
  readonly openingFee: Money;
  readonly modifierDelta: SafeInteger;
  readonly total: Money;
  readonly appliedModifiers: readonly AppliedModifierV1[];
}

export interface TavernOpeningCostsV1 {
  readonly commitment: "prospective" | "committed";
  readonly modeReasonId: ReasonId;
  readonly ap: NonNegativeSafeInteger;
  readonly playerStamina: NonNegativeSafeInteger;
  readonly heroineStamina: NonNegativeSafeInteger;
  readonly cash: TavernOpeningCashCostV1;
  readonly ingredientShortages: readonly IngredientQuantityV1[];
}

export interface TavernPreviewV1 {
  readonly basis: "current_state" | "active_opening_baseline";
  readonly allowed: boolean;
  readonly rejectionCodes: readonly PocRejectionReasonV1["code"][];
  readonly openingCosts: TavernOpeningCostsV1;
  readonly receptionCapacity: NonNegativeSafeInteger;
  readonly preparationCapacity: NonNegativeSafeInteger;
  readonly expectedSales: readonly {
    readonly recipeId: RecipeId;
    readonly range: IntegerRangeV1;
  }[];
  readonly cashDelta: IntegerRangeV1;
}

export interface TavernSettlementInputV1 {
  readonly session: OpeningSessionV1;
}

export interface SettlementDraftV1 {
  readonly orders: readonly OpeningOrderLineV1[];
  readonly receptionCapacity: NonNegativeSafeInteger;
  readonly preparationCapacity: NonNegativeSafeInteger;
  readonly discardedPortions: readonly PlannedRecipeV1[];
  readonly appliedModifiers: readonly AppliedModifierV1[];
  readonly effects: readonly EffectIntentV1[];
  readonly entries: readonly LedgerEntryDraftV1[];
}

export interface CheckInputV1 {
  readonly checkId: CheckId;
  readonly actorId: ActorId;
  readonly attribute: AttributeId;
  readonly rank: AttributeRank;
  readonly attributeBonus: AttributeBonus;
  readonly preparationBonus: SafeInteger;
  readonly modifiers: readonly ModifierV1[];
  readonly bands: readonly CheckOutcomeBandV1[];
}

export interface CheckPreviewV1 {
  readonly formula: "2d6+bonuses";
  readonly totalBonus: SafeInteger;
  readonly possibleTotal: IntegerRangeV1;
  readonly bands: readonly { readonly bandId: CheckBandId; readonly total: IntegerRangeV1 }[];
}

export interface CheckResultV1 {
  readonly checkId: CheckId;
  readonly actorId: ActorId;
  readonly dice: readonly [DieFace, DieFace];
  readonly attributeBonus: AttributeBonus;
  readonly preparationBonus: SafeInteger;
  readonly modifiers: readonly AppliedModifierV1[];
  readonly totalBonus: SafeInteger;
  readonly total: SafeInteger;
  readonly bandId: CheckBandId;
  readonly effects: readonly EffectIntentV1[];
}

export interface ResolvedCheckV1 {
  readonly checkId: CheckId;
  readonly actorId: ActorId;
  readonly dice: readonly [DieFace, DieFace];
  readonly attributeBonus: AttributeBonus;
  readonly preparationBonus: SafeInteger;
  readonly modifiers: readonly AppliedModifierV1[];
  readonly totalBonus: SafeInteger;
  readonly total: SafeInteger;
  readonly bandId: CheckBandId;
  readonly resolvedAtSequence: PositiveSafeInteger;
}

export type LevyResolutionV1 =
  | { readonly kind: "paid"; readonly levyAmount: Money; readonly cash: BeforeAfterV1<Money> }
  | {
      readonly kind: "arrears";
      readonly levyAmount: Money;
      readonly availableCash: Money;
      readonly shortfall: Money;
    };

export interface EndingInputV1 {
  readonly cash: Money;
  readonly levy: LevyResolutionV1;
  readonly reputation: NonNegativeSafeInteger;
  readonly facilityIds: readonly FacilityId[];
  readonly relationship: RelationshipStateV1;
  readonly facts: readonly FactEntryV1[];
  readonly quests: readonly QuestEntryV1[];
  readonly outcomes: readonly OutcomeEntryV1[];
  readonly auras: readonly AuraInstanceV1[];
}

export interface EndingSummaryV1 {
  readonly relationship: OutcomeEntryV1;
  readonly investigation: OutcomeEntryV1;
}

export interface EndingResultV1 {
  readonly endingId: EndingId;
  readonly status: "completed_stable" | "completed_danger" | "failed_arrears";
  readonly reasonIds: readonly ReasonId[];
  readonly effects: readonly ProgressionEffectIntentV1[];
  readonly summary: EndingSummaryV1;
}

export interface RunCompletionV1 {
  readonly endingId: EndingId;
  readonly status: "completed_stable" | "completed_danger" | "failed_arrears";
  readonly levy: LevyResolutionV1;
  readonly reasonIds: readonly ReasonId[];
  readonly summary: EndingSummaryV1;
  readonly completedAtSequence: PositiveSafeInteger;
}

export interface PocRulesV1 {
  readonly demand: {
    preview(input: DeepReadonly<DemandProjectionInputV1>): DemandPreviewV1;
    resolve(input: DeepReadonly<DemandSeedInputV1>, rng: RuleRngV1): DemandSeedResultV1;
  };
  readonly tavern: {
    preview(input: DeepReadonly<TavernPreviewInputV1>): TavernPreviewV1;
    settle(input: DeepReadonly<TavernSettlementInputV1>, rng: RuleRngV1): SettlementDraftV1;
  };
  readonly checks: {
    describe(input: DeepReadonly<CheckInputV1>): CheckPreviewV1;
    resolve(input: DeepReadonly<CheckInputV1>, rng: RuleRngV1): CheckResultV1;
  };
  readonly endings: {
    evaluate(input: DeepReadonly<EndingInputV1>): EndingResultV1;
  };
}

export type StoryRuleSlotV1 =
  | "demand.preview"
  | "demand.resolve"
  | "tavern.preview"
  | "tavern.settle"
  | "checks.describe"
  | "checks.resolve"
  | "endings.evaluate";

export interface PocSimulationProgramV1 {
  readonly data: PocSimulationDataV1;
  readonly rules: PocRulesV1;
}

export interface CommandCostViewV1 {
  readonly ap: NonNegativeSafeInteger;
  readonly playerStamina: NonNegativeSafeInteger;
  readonly heroineStamina: NonNegativeSafeInteger;
  readonly cash: Money;
}

export interface ActionViewV1 {
  readonly actionId: ActionId;
  readonly labelTextId: TextId;
  readonly available: boolean;
  readonly costs: CommandCostViewV1;
  readonly availablePhases: readonly CalendarPhase[];
  readonly occupiedPhases: readonly CalendarPhase[];
  readonly confirmation: ConfirmationMetadataV1;
  readonly directCommand: PocGameCommandV1 | null;
  readonly rejectionCodes: readonly PocRejectionReasonV1["code"][];
}

export interface AvailabilityExplanationV1 {
  readonly actionId: ActionId;
  readonly visible: boolean;
  readonly available: boolean;
  readonly reasons: readonly PocRejectionReasonV1[];
}

export type PreviewDeltaTargetV1 =
  | { readonly kind: "cash" }
  | { readonly kind: "reputation" }
  | { readonly kind: "calendar.ap" }
  | { readonly kind: "actor.stamina"; readonly actorId: ActorId }
  | { readonly kind: "actor.mood"; readonly actorId: ActorId }
  | { readonly kind: "relationship.affection" }
  | { readonly kind: "relationship.teamwork" }
  | { readonly kind: "ingredient"; readonly ingredientId: IngredientId }
  | { readonly kind: "item"; readonly itemId: ItemId };

export type PreviewChangeV1 =
  | {
      readonly kind: "numeric";
      readonly target: PreviewDeltaTargetV1;
      readonly delta: IntegerRangeV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "relationship.stage.set";
      readonly stage: RelationshipStage;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "tavern.helper.set";
      readonly helper: HelperStateV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "aura.apply";
      readonly auraId: AuraId;
      readonly target: AuraTargetV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "aura.clear";
      readonly auraId: AuraId;
      readonly target: AuraTargetV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "fact.set";
      readonly factId: FactId;
      readonly value: StoryValueV1;
      readonly reasonId: ReasonId;
    }
  | { readonly kind: "quest.set"; readonly quest: QuestEntryV1; readonly reasonId: ReasonId }
  | {
      readonly kind: "outcome.set";
      readonly outcomeId: OutcomeId;
      readonly value: StoryValueV1;
      readonly reasonId: ReasonId;
    };

export type CommandConfirmationV1<C extends PocGameCommandV1> =
  C extends Extract<
    PocGameCommandV1,
    {
      readonly kind:
        | "run.start"
        | "tavern.opening.start"
        | "tavern.opening.continue"
        | "tavern.opening.finalize"
        | "world.action.complete"
        | "narrative.advance";
    }
  >
    ? null
    : ConfirmationMetadataV1;

export type CommandPreviewV1<C extends PocGameCommandV1 = PocGameCommandV1> =
  | {
      readonly allowed: true;
      readonly command: C;
      readonly costs: CommandCostViewV1;
      readonly changes: readonly PreviewChangeV1[];
      readonly unknownReasonIds: readonly ReasonId[];
      readonly confirmation: CommandConfirmationV1<C>;
    }
  | {
      readonly allowed: false;
      readonly command: C;
      readonly reasons: readonly PocRejectionReasonV1[];
    };

export interface NarrativeChoiceProjectionV1 {
  readonly choiceId: ChoiceId;
  readonly textId: TextId;
  readonly enabled: boolean;
  readonly disabledReasonId?: ReasonId;
  readonly checkPreview?: CheckPreviewV1;
  readonly confirmation: ConfirmationMetadataV1;
}

export interface NarrativeProjectionV1 {
  readonly status: NarrativeRuntimeStateV1["status"];
  readonly cursor: NarrativeCursorV1 | null;
  readonly stage: NarrativeStageStateV1;
  readonly speakerId: CharacterId | null;
  readonly textId: TextId | null;
  readonly choices: readonly NarrativeChoiceProjectionV1[];
  readonly latestResolvedCheck: ResolvedCheckV1 | null;
}

export interface DemandForecastV1 {
  readonly day: DayIndex;
  readonly lines: readonly {
    readonly segmentId: CustomerSegmentId;
    readonly range: IntegerRangeV1;
    readonly modifiers: readonly AppliedModifierV1[];
  }[];
}

export interface ObligationForecastBaseV1 {
  readonly currentCash: Money;
  readonly levyAmount: Money;
  readonly currentGap: Money;
  readonly reasonId: ReasonId;
  readonly recommendations: readonly {
    readonly textId: TextId;
    readonly actionId: ActionId | null;
  }[];
}

export type ObligationForecastV1 =
  | (ObligationForecastBaseV1 & { readonly kind: "current_gap" })
  | (ObligationForecastBaseV1 & {
      readonly kind: "committed_plan_conservative";
      readonly projectedCashAfterOpening: IntegerRangeV1;
      readonly projectedCashAfterLevy: IntegerRangeV1;
    })
  | (ObligationForecastBaseV1 & {
      readonly kind: "final";
      readonly projectedCashAfterLevy: SafeInteger;
    });

export interface RunStartControlProjectionV1 {
  readonly command: Extract<PocGameCommandV1, { readonly kind: "run.start" }>;
  readonly preview: Extract<
    CommandPreviewV1<Extract<PocGameCommandV1, { readonly kind: "run.start" }>>,
    { readonly allowed: true }
  >;
}

export interface LifePolicyOptionProjectionV1 {
  readonly policyId: PolicyId;
  readonly nameTextId: TextId;
  readonly apByPhase: ApByPhaseV1;
  readonly playerNightRecovery: NonNegativeSafeInteger;
  readonly nightRecoveryReasonId: ReasonId;
  readonly command: Extract<PocGameCommandV1, { readonly kind: "policy.choose" }>;
  readonly preview: Extract<
    CommandPreviewV1<Extract<PocGameCommandV1, { readonly kind: "policy.choose" }>>,
    { readonly allowed: true }
  >;
}

export interface LifePolicySelectionProjectionV1 {
  readonly options: readonly [LifePolicyOptionProjectionV1, ...LifePolicyOptionProjectionV1[]];
}

export type TavernOpeningControlProjectionV1 =
  | {
      readonly kind: "start";
      readonly command: Extract<PocGameCommandV1, { readonly kind: "tavern.opening.start" }>;
      readonly preview: CommandPreviewV1<
        Extract<PocGameCommandV1, { readonly kind: "tavern.opening.start" }>
      >;
    }
  | {
      readonly kind: "continue";
      readonly command: Extract<PocGameCommandV1, { readonly kind: "tavern.opening.continue" }>;
      readonly preview: CommandPreviewV1<
        Extract<PocGameCommandV1, { readonly kind: "tavern.opening.continue" }>
      >;
    }
  | {
      readonly kind: "finalize";
      readonly command: Extract<PocGameCommandV1, { readonly kind: "tavern.opening.finalize" }>;
      readonly preview: CommandPreviewV1<
        Extract<PocGameCommandV1, { readonly kind: "tavern.opening.finalize" }>
      >;
    };

export interface PocHudProjectionV1 {
  readonly day: DayIndex;
  readonly phase: CalendarPhase;
  readonly apRemaining: NonNegativeSafeInteger;
  readonly cash: Money;
  readonly reputation: NonNegativeSafeInteger;
  readonly playerStamina: StaminaStateV1;
  readonly heroineStamina: StaminaStateV1;
  readonly heroineMood: MoodPoint;
  readonly relationship: RelationshipStateV1;
  readonly levyAmount: Money;
}

export interface PocInventoryBatchProjectionV1 {
  readonly batchId: BatchId;
  readonly ingredientId: IngredientId;
  readonly quantity: Quantity;
  readonly acquiredDay: DayIndex;
  readonly lastUsableDay: AbsoluteDayIndex;
  readonly refrigerationExtended: boolean;
}

export interface PocInventoryProjectionV1 {
  readonly ingredientBatches: readonly PocInventoryBatchProjectionV1[];
  readonly itemStacks: readonly ItemStackV1[];
}

export interface PocTavernProjectionV1 {
  readonly unlockedRecipeIds: readonly RecipeId[];
  readonly helper: HelperStateV1;
  readonly preparation: DailyPreparationStateV1;
  readonly servicePlan: TavernPlanV1 | null;
  readonly currentPlanPreview: TavernPreviewV1 | null;
  readonly serviceHistory: readonly ServiceHistoryEntryV1[];
}

export interface PocFacilitiesProjectionV1 {
  readonly built: readonly FacilityStateV1[];
  readonly decisions: readonly FacilityDecisionRecordV1[];
}

export interface PocLedgerProjectionV1 {
  readonly startingCash: Money;
  readonly currentCash: Money;
  readonly entries: readonly LedgerEntryV1[];
}

export type PocGameViewStatusV1 = "setup" | "active" | "terminal";

export interface PocGameViewV1 {
  readonly status: PocGameViewStatusV1;
  readonly hud: PocHudProjectionV1;
  readonly actions: readonly ActionViewV1[];
  readonly runStartControl: RunStartControlProjectionV1 | null;
  readonly lifePolicySelection: LifePolicySelectionProjectionV1 | null;
  readonly tavernOpeningControl: TavernOpeningControlProjectionV1 | null;
  readonly demandForecast: DemandForecastV1 | null;
  readonly obligationForecast: ObligationForecastV1 | null;
  readonly inventory: PocInventoryProjectionV1;
  readonly tavern: PocTavernProjectionV1;
  readonly facilities: PocFacilitiesProjectionV1;
  readonly ledger: PocLedgerProjectionV1;
  readonly resolvedChecks: readonly ResolvedCheckV1[];
  readonly completion: RunCompletionV1 | null;
}

export interface PocGameQueriesV1 {
  getAvailableActions(): readonly ActionViewV1[];
  explainAvailability(actionId: ActionId): AvailabilityExplanationV1;
  previewCommand<C extends PocGameCommandV1>(command: C): CommandPreviewV1<C>;
  previewTavernPlan(plan: TavernPlanV1): TavernPreviewV1;
  getHudProjection(): PocHudProjectionV1;
  getInventoryProjection(): PocInventoryProjectionV1;
  getTavernProjection(): PocTavernProjectionV1;
  getFacilitiesProjection(): PocFacilitiesProjectionV1;
  getLedgerProjection(): PocLedgerProjectionV1;
  getNarrativeProjection(): NarrativeProjectionV1 | null;
  getRunStartControl(): RunStartControlProjectionV1 | null;
  getLifePolicySelection(): LifePolicySelectionProjectionV1 | null;
  getTavernOpeningControl(): TavernOpeningControlProjectionV1 | null;
  getDemandForecast(): DemandForecastV1 | null;
  getObligationForecast(): ObligationForecastV1 | null;
  getResolvedChecks(): readonly ResolvedCheckV1[];
  getRunCompletion(): RunCompletionV1 | null;
}

export interface EngineFaultBaseV1 {
  readonly message: string;
  readonly stack?: string;
}

export type PocEngineFaultV1 =
  | (EngineFaultBaseV1 & {
      readonly category: "story_rule";
      readonly code: StoryRuleFaultCodeV1;
      readonly ruleSlot: StoryRuleSlotV1;
    })
  | (EngineFaultBaseV1 & {
      readonly category: "engine_invariant";
      readonly code: EngineInvariantCodeV1;
      readonly ruleSlot: null;
    })
  | (EngineFaultBaseV1 & {
      readonly category: "command_handler";
      readonly code: CommandHandlerFaultCodeV1;
      readonly ruleSlot: null;
    });

export type PocDebugCommandV1 =
  | {
      readonly kind: "debug.calendar.set_ap";
      readonly value: NonNegativeSafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.actor.set_stamina";
      readonly actorId: ActorId;
      readonly value: NonNegativeSafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.actor.set_mood";
      readonly actorId: ActorId;
      readonly value: MoodPoint;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.relationship.set";
      readonly affection: SafeInteger;
      readonly teamwork: NonNegativeSafeInteger;
      readonly stage: RelationshipStage;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.inventory.adjust_cash";
      readonly delta: SafeInteger;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.aura.apply";
      readonly auraId: AuraId;
      readonly target: AuraTargetV1;
      readonly duration: AuraDurationV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.aura.clear";
      readonly instanceId: AuraInstanceId;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.story.fact.set";
      readonly factId: FactId;
      readonly value: StoryValueV1;
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "debug.narrative.jump";
      readonly cursor: NarrativeCursorV1;
      readonly reasonId: ReasonId;
    }
  | { readonly kind: "debug.rng.set"; readonly rng: RngStateV1; readonly reasonId: ReasonId };

export const pocDebugCommandKindsV1 = Object.freeze([
  "debug.calendar.set_ap",
  "debug.actor.set_stamina",
  "debug.actor.set_mood",
  "debug.relationship.set",
  "debug.inventory.adjust_cash",
  "debug.aura.apply",
  "debug.aura.clear",
  "debug.story.fact.set",
  "debug.narrative.jump",
  "debug.rng.set",
] as const satisfies readonly PocDebugCommandV1["kind"][]);

export type PocDebugReferenceV1 =
  | { readonly kind: "reason"; readonly reasonId: ReasonId }
  | { readonly kind: "actor"; readonly actorId: ActorId }
  | { readonly kind: "aura"; readonly auraId: AuraId }
  | { readonly kind: "aura_instance"; readonly instanceId: AuraInstanceId }
  | { readonly kind: "fact"; readonly factId: FactId }
  | { readonly kind: "narrative_node"; readonly sceneId: SceneId; readonly nodeId: NodeId };

export type PocDebugCommandValidationErrorV1 =
  | {
      readonly code: "debug.unknown_reference";
      readonly commandKind: PocDebugCommandV1["kind"];
      readonly reference: Extract<PocDebugReferenceV1, { readonly kind: "reason" }>;
    }
  | {
      readonly code: "debug.unknown_reference";
      readonly commandKind: "debug.actor.set_stamina" | "debug.actor.set_mood";
      readonly reference: Extract<PocDebugReferenceV1, { readonly kind: "actor" }>;
    }
  | {
      readonly code: "debug.unknown_reference";
      readonly commandKind: "debug.aura.apply";
      readonly reference: Extract<PocDebugReferenceV1, { readonly kind: "aura" }>;
    }
  | {
      readonly code: "debug.unknown_reference";
      readonly commandKind: "debug.aura.clear";
      readonly reference: Extract<PocDebugReferenceV1, { readonly kind: "aura_instance" }>;
    }
  | {
      readonly code: "debug.unknown_reference";
      readonly commandKind: "debug.story.fact.set";
      readonly reference: Extract<PocDebugReferenceV1, { readonly kind: "fact" }>;
    }
  | {
      readonly code: "debug.unknown_reference";
      readonly commandKind: "debug.narrative.jump";
      readonly reference: Extract<PocDebugReferenceV1, { readonly kind: "narrative_node" }>;
    }
  | {
      readonly code: "debug.value_out_of_range";
      readonly commandKind: "debug.actor.set_stamina";
      readonly field: "stamina";
      readonly actual: SafeInteger;
      readonly minimum: 0;
      readonly maximum: NonNegativeSafeInteger;
    }
  | {
      readonly code: "debug.value_out_of_range";
      readonly commandKind: "debug.inventory.adjust_cash";
      readonly field: "cash_delta_result";
      readonly actual: SafeInteger;
      readonly minimum: 0;
      readonly maximum: SafeInteger;
    }
  | {
      readonly code: "debug.value_out_of_range";
      readonly commandKind: "debug.aura.apply";
      readonly field: "aura_duration";
      readonly actual: SafeInteger;
      readonly minimum: 1;
      readonly maximum: PositiveSafeInteger;
    }
  | {
      readonly code: "debug.story_value_invalid";
      readonly commandKind: "debug.story.fact.set";
      readonly factId: FactId;
      readonly value: StoryValueV1;
    }
  | {
      readonly code: "debug.aura_target_not_allowed";
      readonly commandKind: "debug.aura.apply";
      readonly auraId: AuraId;
      readonly target: AuraTargetV1;
    }
  | {
      readonly code: "debug.aura_duration_policy_mismatch";
      readonly commandKind: "debug.aura.apply";
      readonly auraId: AuraId;
      readonly requested: AuraDurationV1;
      readonly expected: AuraDurationPolicyV1;
    }
  | {
      readonly code: "debug.state_conflict";
      readonly commandKind: "debug.aura.apply";
      readonly conflict: "aura_already_present";
    }
  | {
      readonly code: "debug.state_conflict";
      readonly commandKind: "debug.narrative.jump";
      readonly conflict: "narrative_inactive";
    };

export interface PocGameBootstrapInputV1 extends GameBootstrapInputV1 {
  readonly runId: RunId;
}

export type PocGameSnapshotV1 = GameSnapshotEnvelopeV1<PocGameStateV1, RngStateV1>;

export type PocCommandExecutionDiagnosticsV1 = CommandExecutionDiagnosticsEnvelopeV1<
  RngStateV1,
  RngDrawTraceV1
>;

export type PocCommandExecutionAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  PocGameSnapshotV1,
  PocGameplayFactV1,
  PocRejectionReasonV1,
  PocEngineFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

export type PocReplayableDebugExecutionResultV1 =
  | {
      readonly kind: "committed";
      readonly snapshot: PocGameSnapshotV1;
      readonly facts: readonly PocGameplayFactV1[];
    }
  | {
      readonly kind: "faulted";
      readonly snapshot: PocGameSnapshotV1;
      readonly fault: PocEngineFaultV1;
    };

export interface PocReplayableDebugExecutionAttemptV1 {
  readonly result: PocReplayableDebugExecutionResultV1;
  readonly diagnostics: PocCommandExecutionDiagnosticsV1;
}

export interface PocGameSimulationTypesV1 extends GameSimulationTypeMapV1<
  PocGameBootstrapInputV1,
  PocGameStateV1,
  RngStateV1
> {
  readonly snapshot: PocGameSnapshotV1;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: PocGameCommandV1;
  readonly fact: PocGameplayFactV1;
  readonly rejection: PocRejectionReasonV1;
  readonly fault: PocEngineFaultV1;
  readonly debugCommand: PocDebugCommandV1;
  readonly debugValidationError: PocDebugCommandValidationErrorV1;
  readonly executionContext: undefined;
  readonly queries: PocGameQueriesV1;
  readonly viewModel: PocGameViewV1;
}
