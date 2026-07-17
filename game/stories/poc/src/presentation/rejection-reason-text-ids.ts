// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import type { TextId } from "@sillymaker/base";

import type { PocRejectionReasonV1 } from "../gameplay/contracts/types.js";
import { pocPresentationTextIdsV1 } from "./presentation-text-ids.js";

export const pocRejectionReasonTextIdsByCodeV1 = Object.freeze({
  "run.invalid_status": pocPresentationTextIdsV1.rejectionRunInvalidStatus,
  "run.already_started": pocPresentationTextIdsV1.rejectionRunAlreadyStarted,
  "run.not_started": pocPresentationTextIdsV1.rejectionRunNotStarted,
  "run.policy_required": pocPresentationTextIdsV1.rejectionRunPolicyRequired,
  "command.unknown_reference": pocPresentationTextIdsV1.rejectionCommandUnknownReference,
  "command.blocked_by_narrative": pocPresentationTextIdsV1.rejectionCommandBlockedByNarrative,
  "command.blocked_by_workflow": pocPresentationTextIdsV1.rejectionCommandBlockedByWorkflow,
  "policy.already_chosen": pocPresentationTextIdsV1.rejectionPolicyAlreadyChosen,
  "calendar.invalid_phase": pocPresentationTextIdsV1.rejectionCalendarInvalidPhase,
  "calendar.insufficient_ap": pocPresentationTextIdsV1.rejectionCalendarInsufficientAp,
  "calendar.phase_blocked": pocPresentationTextIdsV1.rejectionCalendarPhaseBlocked,
  "action.unavailable": pocPresentationTextIdsV1.rejectionActionUnavailable,
  "actor.insufficient_stamina": pocPresentationTextIdsV1.rejectionActorInsufficientStamina,
  "actor.stamina_at_maximum": pocPresentationTextIdsV1.rejectionActorStaminaAtMaximum,
  "tavern.preparation_limit_reached":
    pocPresentationTextIdsV1.rejectionTavernPreparationLimitReached,
  "inventory.invalid_quantity": pocPresentationTextIdsV1.rejectionInventoryInvalidQuantity,
  "inventory.duplicate_line": pocPresentationTextIdsV1.rejectionInventoryDuplicateLine,
  "inventory.line_limit_exceeded": pocPresentationTextIdsV1.rejectionInventoryLineLimitExceeded,
  "inventory.insufficient_cash": pocPresentationTextIdsV1.rejectionInventoryInsufficientCash,
  "inventory.insufficient_ingredient":
    pocPresentationTextIdsV1.rejectionInventoryInsufficientIngredient,
  "facility.unavailable": pocPresentationTextIdsV1.rejectionFacilityUnavailable,
  "facility.target_not_offered": pocPresentationTextIdsV1.rejectionFacilityTargetNotOffered,
  "facility.already_built": pocPresentationTextIdsV1.rejectionFacilityAlreadyBuilt,
  "facility.choice_committed": pocPresentationTextIdsV1.rejectionFacilityChoiceCommitted,
  "aura.already_present": pocPresentationTextIdsV1.rejectionAuraAlreadyPresent,
  "aura.not_found": pocPresentationTextIdsV1.rejectionAuraNotFound,
  "tavern.invalid_plan": pocPresentationTextIdsV1.rejectionTavernInvalidPlan,
  "tavern.plan_frozen": pocPresentationTextIdsV1.rejectionTavernPlanFrozen,
  "tavern.service_unavailable": pocPresentationTextIdsV1.rejectionTavernServiceUnavailable,
  "tavern.opening_plan_missing": pocPresentationTextIdsV1.rejectionTavernOpeningPlanMissing,
  "tavern.evening_resolved": pocPresentationTextIdsV1.rejectionTavernEveningResolved,
  "tavern.opening_active": pocPresentationTextIdsV1.rejectionTavernOpeningActive,
  "tavern.opening_missing": pocPresentationTextIdsV1.rejectionTavernOpeningMissing,
  "tavern.opening_checkpoint_blocked":
    pocPresentationTextIdsV1.rejectionTavernOpeningCheckpointBlocked,
  "tavern.opening_continue_not_needed":
    pocPresentationTextIdsV1.rejectionTavernOpeningContinueNotNeeded,
  "tavern.opening_not_ready": pocPresentationTextIdsV1.rejectionTavernOpeningNotReady,
  "workflow.conflict": pocPresentationTextIdsV1.rejectionWorkflowConflict,
  "workflow.missing": pocPresentationTextIdsV1.rejectionWorkflowMissing,
  "world.action_unavailable": pocPresentationTextIdsV1.rejectionWorldActionUnavailable,
  "world.action_wrong_phase": pocPresentationTextIdsV1.rejectionWorldActionWrongPhase,
  "narrative.inactive": pocPresentationTextIdsV1.rejectionNarrativeInactive,
  "narrative.cursor_mismatch": pocPresentationTextIdsV1.rejectionNarrativeCursorMismatch,
  "narrative.choice_required": pocPresentationTextIdsV1.rejectionNarrativeChoiceRequired,
  "narrative.choice_hidden": pocPresentationTextIdsV1.rejectionNarrativeChoiceHidden,
  "narrative.choice_disabled": pocPresentationTextIdsV1.rejectionNarrativeChoiceDisabled,
  "levy.not_due": pocPresentationTextIdsV1.rejectionLevyNotDue,
  "story.rule_rejected": pocPresentationTextIdsV1.rejectionStoryRuleRejected,
  "engine.invariant_rejected": pocPresentationTextIdsV1.rejectionEngineInvariantRejected,
} satisfies Readonly<Record<PocRejectionReasonV1["code"], TextId>>);
