// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  deepFreezePocValueV1,
  parseDayIndex,
  type ActionPresentationDefinitionV1,
  type AvailabilityGateV1,
  type ConfirmationMetadataV1,
  type DeepReadonly,
} from "../gameplay/index.js";
import { pocFacilityOpportunityUndecidedGateV1 } from "./facilities-auras.js";
import {
  actionIdsV1,
  actorIdsV1,
  auraIdsV1,
  investigationOutcomeTokensV1,
  outcomeIdsV1,
  pocTextIdsV1,
  reasonIdsV1,
  relationshipOutcomeTokensV1,
} from "./ids.js";

const pocActionReasonIdsV1 = Object.freeze({
  unavailableStoryWindowClosed: reasonIdsV1[47],
  unavailableRelationshipResolved: reasonIdsV1[48],
  unavailableInvestigationResolved: reasonIdsV1[49],
  unavailableMutuallyExclusive: reasonIdsV1[50],
  unavailableHeroineNotAngry: reasonIdsV1[51],
  unavailableTaxNotVisible: reasonIdsV1[53],
} as const);

const emptyConfirmationV1: DeepReadonly<ConfirmationMetadataV1> = deepFreezePocValueV1({
  benefitTextIds: [],
  mutuallyExcludedActionIds: [],
  majorRiskTextIds: [],
});

const activeServiceWindowGateV1: DeepReadonly<AvailabilityGateV1> = deepFreezePocValueV1({
  conditions: [
    { kind: "run.status_is", status: "active" },
    { kind: "calendar.day_at_most", day: parseDayIndex(6) },
  ],
  reasonId: pocActionReasonIdsV1.unavailableStoryWindowClosed,
});

export const pocActionDefinitionsV1: DeepReadonly<readonly ActionPresentationDefinitionV1[]> =
  deepFreezePocValueV1([
    {
      actionId: actionIdsV1[0],
      labelTextId: pocTextIdsV1.actionChooseLifePolicyLabel,
      commandKind: "policy.choose",
      availablePhases: ["morning"],
      occupation: { kind: "none" },
      visibility: [],
      availability: [],
      confirmation: emptyConfirmationV1,
    },
    {
      actionId: actionIdsV1[1],
      labelTextId: pocTextIdsV1.actionPurchaseLabel,
      commandKind: "inventory.buy",
      availablePhases: ["morning", "afternoon"],
      occupation: { kind: "current_phase" },
      visibility: [activeServiceWindowGateV1],
      availability: [],
      confirmation: {
        benefitTextIds: [pocTextIdsV1.confirmationBenefitPurchaseStock],
        mutuallyExcludedActionIds: [],
        majorRiskTextIds: [pocTextIdsV1.confirmationRiskPurchaseCash],
      },
    },
    {
      actionId: actionIdsV1[2],
      labelTextId: pocTextIdsV1.actionPrepareFoodLabel,
      commandKind: "actor.prepare_food",
      availablePhases: ["morning", "afternoon"],
      occupation: { kind: "current_phase" },
      visibility: [activeServiceWindowGateV1],
      availability: [],
      confirmation: {
        benefitTextIds: [pocTextIdsV1.confirmationBenefitPrepareFood],
        mutuallyExcludedActionIds: [],
        majorRiskTextIds: [pocTextIdsV1.confirmationRiskPrepareFoodStamina],
      },
    },
    {
      actionId: actionIdsV1[3],
      labelTextId: pocTextIdsV1.actionRestLabel,
      commandKind: "actor.rest",
      availablePhases: ["morning", "afternoon", "evening"],
      occupation: { kind: "current_phase" },
      visibility: [activeServiceWindowGateV1],
      availability: [],
      confirmation: {
        benefitTextIds: [pocTextIdsV1.confirmationBenefitRestRecovery],
        mutuallyExcludedActionIds: [],
        majorRiskTextIds: [pocTextIdsV1.confirmationRiskRestTime],
      },
    },
    {
      actionId: actionIdsV1[4],
      labelTextId: pocTextIdsV1.actionServicePlanLabel,
      commandKind: "tavern.plan.set",
      availablePhases: ["morning", "afternoon"],
      occupation: { kind: "fixed", phases: ["evening"] },
      visibility: [activeServiceWindowGateV1],
      availability: [],
      confirmation: emptyConfirmationV1,
    },
    {
      actionId: actionIdsV1[5],
      labelTextId: pocTextIdsV1.actionAdvancePhaseLabel,
      commandKind: "calendar.advance_phase",
      availablePhases: ["morning", "afternoon", "evening"],
      occupation: { kind: "none" },
      visibility: [],
      availability: [],
      confirmation: emptyConfirmationV1,
    },
    {
      actionId: actionIdsV1[6],
      labelTextId: pocTextIdsV1.actionPayLevyLabel,
      commandKind: "levy.pay",
      availablePhases: ["afternoon"],
      occupation: { kind: "none" },
      visibility: [
        {
          conditions: [{ kind: "calendar.matches", day: parseDayIndex(7), phases: ["afternoon"] }],
          reasonId: pocActionReasonIdsV1.unavailableTaxNotVisible,
        },
      ],
      availability: [],
      confirmation: emptyConfirmationV1,
    },
    {
      actionId: actionIdsV1[7],
      labelTextId: pocTextIdsV1.actionFacilityWindowLabel,
      commandKind: "facility.choose",
      availablePhases: ["morning", "afternoon"],
      occupation: { kind: "current_phase" },
      visibility: [
        {
          conditions: [
            {
              kind: "calendar.matches",
              day: parseDayIndex(4),
              phases: ["morning", "afternoon"],
            },
          ],
          reasonId: pocActionReasonIdsV1.unavailableStoryWindowClosed,
        },
        pocFacilityOpportunityUndecidedGateV1,
      ],
      availability: [],
      confirmation: emptyConfirmationV1,
    },
    {
      actionId: actionIdsV1[8],
      labelTextId: pocTextIdsV1.actionRepairSignWithHeroineLabel,
      commandKind: "story.action.start",
      availablePhases: ["afternoon"],
      occupation: { kind: "fixed", phases: ["afternoon"] },
      visibility: [
        {
          conditions: [{ kind: "calendar.matches", day: parseDayIndex(5), phases: ["afternoon"] }],
          reasonId: pocActionReasonIdsV1.unavailableStoryWindowClosed,
        },
        {
          conditions: [
            {
              kind: "outcome.equals",
              outcomeId: outcomeIdsV1[0],
              value: { kind: "token", value: relationshipOutcomeTokensV1[0] },
            },
          ],
          reasonId: pocActionReasonIdsV1.unavailableRelationshipResolved,
        },
      ],
      availability: [
        {
          conditions: [
            {
              kind: "outcome.equals",
              outcomeId: outcomeIdsV1[1],
              value: { kind: "token", value: investigationOutcomeTokensV1[0] },
            },
          ],
          reasonId: pocActionReasonIdsV1.unavailableMutuallyExclusive,
        },
      ],
      confirmation: {
        benefitTextIds: [pocTextIdsV1.confirmationBenefitRepairSignRelationship],
        mutuallyExcludedActionIds: [actionIdsV1[9]],
        majorRiskTextIds: [pocTextIdsV1.confirmationRiskRepairSignConflict],
      },
    },
    {
      actionId: actionIdsV1[9],
      labelTextId: pocTextIdsV1.actionOldTradeRoadLabel,
      commandKind: "world.action.begin",
      availablePhases: ["morning"],
      occupation: { kind: "fixed", phases: ["morning", "afternoon"] },
      visibility: [
        {
          conditions: [{ kind: "calendar.matches", day: parseDayIndex(5), phases: ["morning"] }],
          reasonId: pocActionReasonIdsV1.unavailableStoryWindowClosed,
        },
        {
          conditions: [
            {
              kind: "outcome.equals",
              outcomeId: outcomeIdsV1[1],
              value: { kind: "token", value: investigationOutcomeTokensV1[0] },
            },
          ],
          reasonId: pocActionReasonIdsV1.unavailableInvestigationResolved,
        },
      ],
      availability: [
        {
          conditions: [
            {
              kind: "outcome.equals",
              outcomeId: outcomeIdsV1[0],
              value: { kind: "token", value: relationshipOutcomeTokensV1[0] },
            },
          ],
          reasonId: pocActionReasonIdsV1.unavailableMutuallyExclusive,
        },
      ],
      confirmation: {
        benefitTextIds: [pocTextIdsV1.confirmationBenefitOldTradeRoadClue],
        mutuallyExcludedActionIds: [actionIdsV1[8]],
        majorRiskTextIds: [pocTextIdsV1.confirmationRiskOldTradeRoadCost],
      },
    },
    {
      actionId: actionIdsV1[10],
      labelTextId: pocTextIdsV1.actionApologizeToHeroineLabel,
      commandKind: "story.action.start",
      availablePhases: ["morning", "afternoon"],
      occupation: { kind: "current_phase" },
      visibility: [
        {
          conditions: [
            {
              kind: "calendar.matches",
              day: parseDayIndex(6),
              phases: ["morning", "afternoon"],
            },
          ],
          reasonId: pocActionReasonIdsV1.unavailableStoryWindowClosed,
        },
        {
          conditions: [
            {
              kind: "aura.present",
              auraId: auraIdsV1[0],
              target: { kind: "actor", actorId: actorIdsV1[1] },
            },
          ],
          reasonId: pocActionReasonIdsV1.unavailableHeroineNotAngry,
        },
      ],
      availability: [],
      confirmation: {
        benefitTextIds: [pocTextIdsV1.confirmationBenefitApologyReconcile],
        mutuallyExcludedActionIds: [],
        majorRiskTextIds: [pocTextIdsV1.confirmationRiskApologyWindow],
      },
    },
  ] satisfies readonly ActionPresentationDefinitionV1[]);
