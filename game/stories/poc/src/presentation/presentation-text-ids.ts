// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { parseTextId } from "@sillymaker/base";

export const pocPresentationChromeTextIdsV1 = Object.freeze({
  storyTitle: parseTextId("text.poc.story.title"),
  settingsContentFilterNone: parseTextId("text.poc.settings.content_filter.none"),

  calendarDay1Label: parseTextId("text.poc.calendar.day_1.label"),
  calendarDay2Label: parseTextId("text.poc.calendar.day_2.label"),
  calendarDay3Label: parseTextId("text.poc.calendar.day_3.label"),
  calendarDay4Label: parseTextId("text.poc.calendar.day_4.label"),
  calendarDay5Label: parseTextId("text.poc.calendar.day_5.label"),
  calendarDay6Label: parseTextId("text.poc.calendar.day_6.label"),
  calendarDay7Label: parseTextId("text.poc.calendar.day_7.label"),
  calendarPhaseMorningLabel: parseTextId("text.poc.calendar.phase.morning.label"),
  calendarPhaseAfternoonLabel: parseTextId("text.poc.calendar.phase.afternoon.label"),
  calendarPhaseEveningLabel: parseTextId("text.poc.calendar.phase.evening.label"),

  hudActionPointsLabel: parseTextId("text.poc.hud.action_points.label"),
  hudPlayerStaminaLabel: parseTextId("text.poc.hud.player_stamina.label"),
  hudHeroineStaminaLabel: parseTextId("text.poc.hud.heroine_stamina.label"),
  hudCashLabel: parseTextId("text.poc.hud.cash.label"),
  hudReputationLabel: parseTextId("text.poc.hud.reputation.label"),
  hudLevyLabel: parseTextId("text.poc.hud.levy.label"),

  overlayPolicyTitle: parseTextId("text.poc.overlay.policy.title"),
  overlayInventoryTitle: parseTextId("text.poc.overlay.inventory.title"),
  overlayPurchaseTitle: parseTextId("text.poc.overlay.purchase.title"),
  overlayTavernPlanTitle: parseTextId("text.poc.overlay.tavern_plan.title"),
  overlayFacilityTitle: parseTextId("text.poc.overlay.facility.title"),
  overlayWorldActionTitle: parseTextId("text.poc.overlay.world_action.title"),
  overlayLedgerTitle: parseTextId("text.poc.overlay.ledger.title"),
  overlayRelationshipTitle: parseTextId("text.poc.overlay.relationship.title"),
  overlayRunSummaryTitle: parseTextId("text.poc.overlay.run_summary.title"),

  controlCloseLabel: parseTextId("text.poc.control.close.label"),
  controlCancelLabel: parseTextId("text.poc.control.cancel.label"),
  controlConfirmLabel: parseTextId("text.poc.control.confirm.label"),
  controlConfirmPurchaseLabel: parseTextId("text.poc.control.confirm_purchase.label"),
  controlConfirmTavernPlanLabel: parseTextId("text.poc.control.confirm_tavern_plan.label"),
  controlConfirmFacilityLabel: parseTextId("text.poc.control.confirm_facility.label"),
  controlConfirmWorldActionLabel: parseTextId("text.poc.control.confirm_world_action.label"),
  controlAddLineLabel: parseTextId("text.poc.control.add_line.label"),
  controlRemoveLineLabel: parseTextId("text.poc.control.remove_line.label"),

  formIngredientLabel: parseTextId("text.poc.form.ingredient.label"),
  formQuantityLabel: parseTextId("text.poc.form.quantity.label"),
  formRecipeLabel: parseTextId("text.poc.form.recipe.label"),
  formPortionsLabel: parseTextId("text.poc.form.portions.label"),
  formServiceModeLabel: parseTextId("text.poc.form.service_mode.label"),

  sectionInventoryTableLabel: parseTextId("text.poc.section.inventory_table.label"),
  sectionInventoryEmptyLabel: parseTextId("text.poc.section.inventory_empty.label"),
  sectionLedgerEmptyLabel: parseTextId("text.poc.section.ledger_empty.label"),
  sectionStartingCashLabel: parseTextId("text.poc.section.starting_cash.label"),
  sectionCurrentCashLabel: parseTextId("text.poc.section.current_cash.label"),
  sectionLedgerAmountLabel: parseTextId("text.poc.section.ledger_amount.label"),
  sectionLedgerReasonLabel: parseTextId("text.poc.section.ledger_reason.label"),
  sectionAffectionLabel: parseTextId("text.poc.section.affection.label"),
  sectionTeamworkLabel: parseTextId("text.poc.section.teamwork.label"),
  sectionMoodLabel: parseTextId("text.poc.section.mood.label"),
  sectionEndingLabel: parseTextId("text.poc.section.ending.label"),
  sectionPreviewLabel: parseTextId("text.poc.section.preview.label"),

  rejectionRunInvalidStatus: parseTextId("text.poc.rejection.run.invalid_status"),
  rejectionRunAlreadyStarted: parseTextId("text.poc.rejection.run.already_started"),
  rejectionRunNotStarted: parseTextId("text.poc.rejection.run.not_started"),
  rejectionRunPolicyRequired: parseTextId("text.poc.rejection.run.policy_required"),
  rejectionCommandUnknownReference: parseTextId("text.poc.rejection.command.unknown_reference"),
  rejectionCommandBlockedByNarrative: parseTextId(
    "text.poc.rejection.command.blocked_by_narrative",
  ),
  rejectionCommandBlockedByWorkflow: parseTextId("text.poc.rejection.command.blocked_by_workflow"),
  rejectionPolicyAlreadyChosen: parseTextId("text.poc.rejection.policy.already_chosen"),
  rejectionCalendarInvalidPhase: parseTextId("text.poc.rejection.calendar.invalid_phase"),
  rejectionCalendarInsufficientAp: parseTextId("text.poc.rejection.calendar.insufficient_ap"),
  rejectionCalendarPhaseBlocked: parseTextId("text.poc.rejection.calendar.phase_blocked"),
  rejectionActionUnavailable: parseTextId("text.poc.rejection.action.unavailable"),
  rejectionActorInsufficientStamina: parseTextId("text.poc.rejection.actor.insufficient_stamina"),
  rejectionActorStaminaAtMaximum: parseTextId("text.poc.rejection.actor.stamina_at_maximum"),
  rejectionTavernPreparationLimitReached: parseTextId(
    "text.poc.rejection.tavern.preparation_limit_reached",
  ),
  rejectionInventoryInvalidQuantity: parseTextId("text.poc.rejection.inventory.invalid_quantity"),
  rejectionInventoryDuplicateLine: parseTextId("text.poc.rejection.inventory.duplicate_line"),
  rejectionInventoryLineLimitExceeded: parseTextId(
    "text.poc.rejection.inventory.line_limit_exceeded",
  ),
  rejectionInventoryInsufficientCash: parseTextId("text.poc.rejection.inventory.insufficient_cash"),
  rejectionInventoryInsufficientIngredient: parseTextId(
    "text.poc.rejection.inventory.insufficient_ingredient",
  ),
  rejectionFacilityUnavailable: parseTextId("text.poc.rejection.facility.unavailable"),
  rejectionFacilityTargetNotOffered: parseTextId("text.poc.rejection.facility.target_not_offered"),
  rejectionFacilityAlreadyBuilt: parseTextId("text.poc.rejection.facility.already_built"),
  rejectionFacilityChoiceCommitted: parseTextId("text.poc.rejection.facility.choice_committed"),
  rejectionAuraAlreadyPresent: parseTextId("text.poc.rejection.aura.already_present"),
  rejectionAuraNotFound: parseTextId("text.poc.rejection.aura.not_found"),
  rejectionTavernInvalidPlan: parseTextId("text.poc.rejection.tavern.invalid_plan"),
  rejectionTavernPlanFrozen: parseTextId("text.poc.rejection.tavern.plan_frozen"),
  rejectionTavernServiceUnavailable: parseTextId("text.poc.rejection.tavern.service_unavailable"),
  rejectionTavernOpeningPlanMissing: parseTextId("text.poc.rejection.tavern.opening_plan_missing"),
  rejectionTavernEveningResolved: parseTextId("text.poc.rejection.tavern.evening_resolved"),
  rejectionTavernOpeningActive: parseTextId("text.poc.rejection.tavern.opening_active"),
  rejectionTavernOpeningMissing: parseTextId("text.poc.rejection.tavern.opening_missing"),
  rejectionTavernOpeningCheckpointBlocked: parseTextId(
    "text.poc.rejection.tavern.opening_checkpoint_blocked",
  ),
  rejectionTavernOpeningContinueNotNeeded: parseTextId(
    "text.poc.rejection.tavern.opening_continue_not_needed",
  ),
  rejectionTavernOpeningNotReady: parseTextId("text.poc.rejection.tavern.opening_not_ready"),
  rejectionWorkflowConflict: parseTextId("text.poc.rejection.workflow.conflict"),
  rejectionWorkflowMissing: parseTextId("text.poc.rejection.workflow.missing"),
  rejectionWorldActionUnavailable: parseTextId("text.poc.rejection.world.action_unavailable"),
  rejectionWorldActionWrongPhase: parseTextId("text.poc.rejection.world.action_wrong_phase"),
  rejectionNarrativeInactive: parseTextId("text.poc.rejection.narrative.inactive"),
  rejectionNarrativeCursorMismatch: parseTextId("text.poc.rejection.narrative.cursor_mismatch"),
  rejectionNarrativeChoiceRequired: parseTextId("text.poc.rejection.narrative.choice_required"),
  rejectionNarrativeChoiceHidden: parseTextId("text.poc.rejection.narrative.choice_hidden"),
  rejectionNarrativeChoiceDisabled: parseTextId("text.poc.rejection.narrative.choice_disabled"),
  rejectionLevyNotDue: parseTextId("text.poc.rejection.levy.not_due"),
  rejectionStoryRuleRejected: parseTextId("text.poc.rejection.story.rule_rejected"),
  rejectionEngineInvariantRejected: parseTextId("text.poc.rejection.engine.invariant_rejected"),
} as const);

export const pocSemanticWorkflowTextIdsV1 = Object.freeze({
  actionRunStartLabel: parseTextId("text.poc.action.run_start.label"),
  actionTavernOpeningStartLabel: parseTextId("text.poc.action.tavern_opening_start.label"),
  actionTavernOpeningContinueLabel: parseTextId("text.poc.action.tavern_opening_continue.label"),
  actionTavernOpeningFinalizeLabel: parseTextId("text.poc.action.tavern_opening_finalize.label"),
  actionWorldActionCompleteLabel: parseTextId("text.poc.action.world_action_complete.label"),
  actionNarrativeAdvanceLabel: parseTextId("text.poc.action.narrative_advance.label"),
  actionNarrativeChooseLabel: parseTextId("text.poc.action.narrative_choose.label"),
} as const);

export const pocScenePresentationTextIdsV1 = Object.freeze({
  stageSceneMainMenuAccessibleName: parseTextId("text.poc.stage_scene.main_menu.accessible_name"),
  stageSceneTavernAccessibleName: parseTextId("text.poc.stage_scene.tavern.accessible_name"),
  stageSceneMarketAccessibleName: parseTextId("text.poc.stage_scene.market.accessible_name"),
  stageSceneWorldMapAccessibleName: parseTextId("text.poc.stage_scene.world_map.accessible_name"),
  stageSceneWeekSummaryAccessibleName: parseTextId(
    "text.poc.stage_scene.week_summary.accessible_name",
  ),
  stageVariantMainMenuDefaultAccessibleName: parseTextId(
    "text.poc.stage_variant.main_menu.default.accessible_name",
  ),
  stageVariantTavernDayAccessibleName: parseTextId(
    "text.poc.stage_variant.tavern.day.accessible_name",
  ),
  stageVariantTavernEveningAccessibleName: parseTextId(
    "text.poc.stage_variant.tavern.evening.accessible_name",
  ),
  stageVariantMarketDayAccessibleName: parseTextId(
    "text.poc.stage_variant.market.day.accessible_name",
  ),
  stageVariantWorldMapDefaultAccessibleName: parseTextId(
    "text.poc.stage_variant.world_map.default.accessible_name",
  ),
  stageVariantWeekSummaryDefaultAccessibleName: parseTextId(
    "text.poc.stage_variant.week_summary.default.accessible_name",
  ),
  surfaceHeroineAccessibleName: parseTextId("text.poc.surface.heroine.accessible_name"),
  surfaceTavernAccessibleName: parseTextId("text.poc.surface.tavern.accessible_name"),
  surfaceMarketAccessibleName: parseTextId("text.poc.surface.market.accessible_name"),
  surfaceWorldMapAccessibleName: parseTextId("text.poc.surface.world_map.accessible_name"),
  targetHeroineFigureAccessibleName: parseTextId("text.poc.target.heroine.figure.accessible_name"),
  targetTavernServiceAccessibleName: parseTextId("text.poc.target.tavern.service.accessible_name"),
  targetMarketPurchaseAccessibleName: parseTextId(
    "text.poc.target.market.purchase.accessible_name",
  ),
  targetWorldMapOldTradeRoadAccessibleName: parseTextId(
    "text.poc.target.world_map.old_trade_road.accessible_name",
  ),
  behaviorHeroineOpenProfileName: parseTextId("text.poc.behavior.heroine.open_profile.name"),
  behaviorHeroineOpenProfileDescription: parseTextId(
    "text.poc.behavior.heroine.open_profile.description",
  ),
  behaviorHeroineRepairSignName: parseTextId("text.poc.behavior.heroine.repair_sign.name"),
  behaviorHeroineRepairSignDescription: parseTextId(
    "text.poc.behavior.heroine.repair_sign.description",
  ),
  behaviorHeroineApologizeName: parseTextId("text.poc.behavior.heroine.apologize.name"),
  behaviorHeroineApologizeDescription: parseTextId(
    "text.poc.behavior.heroine.apologize.description",
  ),
  behaviorTavernServicePlanName: parseTextId("text.poc.behavior.tavern.service_plan.name"),
  behaviorTavernServicePlanDescription: parseTextId(
    "text.poc.behavior.tavern.service_plan.description",
  ),
  behaviorMarketPurchaseName: parseTextId("text.poc.behavior.market.purchase.name"),
  behaviorMarketPurchaseDescription: parseTextId("text.poc.behavior.market.purchase.description"),
  behaviorWorldMapOldTradeRoadName: parseTextId("text.poc.behavior.world_map.old_trade_road.name"),
  behaviorWorldMapOldTradeRoadDescription: parseTextId(
    "text.poc.behavior.world_map.old_trade_road.description",
  ),
} as const);

export const pocPresentationTextIdsV1 = Object.freeze({
  ...pocPresentationChromeTextIdsV1,
  ...pocSemanticWorkflowTextIdsV1,
  ...pocScenePresentationTextIdsV1,
});
