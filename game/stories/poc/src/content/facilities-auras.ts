// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  deepFreezePocValueV1,
  parseMoney,
  parsePositiveSafeInteger,
  parseSafeInteger,
  type AuraDefinitionV1,
  type AvailabilityGateV1,
  type DeepReadonly,
  type FacilityDefinitionV1,
  type FacilityOpportunityDefinitionV1,
} from "../gameplay/index.js";
import {
  actionIdsV1,
  actorIdsV1,
  auraIdsV1,
  facilityIdsV1,
  ingredientIdsV1,
  reasonIdsV1,
  serviceModeIdsV1,
} from "./simulation-ids.js";
import { pocSimulationTextIdsV1 as pocTextIdsV1 } from "./simulation-text-ids.js";

const pocFacilityAuraReasonIdsV1 = Object.freeze({
  actionFacilitySkip: reasonIdsV1[4],
  modifierColdStorageShelfLife: reasonIdsV1[22],
  modifierComfortableBedPlayerRecovery: reasonIdsV1[23],
  modifierComfortableBedHeroineRecovery: reasonIdsV1[24],
  auraSignRepaired: reasonIdsV1[27],
  auraHeroineAngry: reasonIdsV1[28],
  auraAdventureStrain: reasonIdsV1[29],
  unavailableFacilityDecided: reasonIdsV1[52],
} as const);

const [playerActorId, heroineActorId] = actorIdsV1;
const [coldStorageId, comfortableBedId] = facilityIdsV1;
const [heroineAngryAuraId, tavernSignRepairedAuraId, playerAdventureStrainAuraId] = auraIdsV1;
const [, rootVegetableId, , freshMeatId, herbId] = ingredientIdsV1;
const [manualServiceModeId, assistedServiceModeId] = serviceModeIdsV1;

export const pocFacilityOpportunityUndecidedGateV1: DeepReadonly<AvailabilityGateV1> =
  deepFreezePocValueV1({
    conditions: [
      {
        kind: "tavern.facility_opportunity_undecided",
        opportunityId: actionIdsV1[7],
      },
    ],
    reasonId: pocFacilityAuraReasonIdsV1.unavailableFacilityDecided,
  } satisfies AvailabilityGateV1);

export const pocFacilityDefinitionsV1: DeepReadonly<readonly FacilityDefinitionV1[]> =
  deepFreezePocValueV1([
    {
      facilityId: coldStorageId,
      nameTextId: pocTextIdsV1.facilityColdStorageName,
      cashCost: parseMoney(12),
      modifiers: [
        {
          kind: "shelf_life.add_days",
          source: { kind: "facility", facilityId: coldStorageId },
          ingredientIds: [rootVegetableId, freshMeatId, herbId],
          amount: parsePositiveSafeInteger(2),
          reasonId: pocFacilityAuraReasonIdsV1.modifierColdStorageShelfLife,
        },
      ],
      confirmation: {
        benefitTextIds: [pocTextIdsV1.confirmationBenefitColdStorageShelfLife],
        mutuallyExcludedActionIds: [],
        majorRiskTextIds: [pocTextIdsV1.confirmationRiskColdStorageCost],
      },
    },
    {
      facilityId: comfortableBedId,
      nameTextId: pocTextIdsV1.facilityComfortableBedName,
      cashCost: parseMoney(12),
      modifiers: [
        {
          kind: "recovery.add",
          source: { kind: "facility", facilityId: comfortableBedId },
          actorId: playerActorId,
          amount: parseSafeInteger(2),
          reasonId: pocFacilityAuraReasonIdsV1.modifierComfortableBedPlayerRecovery,
        },
        {
          kind: "recovery.add",
          source: { kind: "facility", facilityId: comfortableBedId },
          actorId: heroineActorId,
          amount: parseSafeInteger(1),
          reasonId: pocFacilityAuraReasonIdsV1.modifierComfortableBedHeroineRecovery,
        },
      ],
      confirmation: {
        benefitTextIds: [pocTextIdsV1.confirmationBenefitComfortableBedRecovery],
        mutuallyExcludedActionIds: [],
        majorRiskTextIds: [pocTextIdsV1.confirmationRiskComfortableBedCost],
      },
    },
  ] satisfies readonly FacilityDefinitionV1[]);

export const pocFacilityOpportunityDefinitionsV1: DeepReadonly<
  readonly FacilityOpportunityDefinitionV1[]
> = deepFreezePocValueV1([
  {
    opportunityId: actionIdsV1[7],
    skipLabelTextId: pocTextIdsV1.choiceFacilitySkipLabel,
    availability: [pocFacilityOpportunityUndecidedGateV1],
    facilityIds: [coldStorageId, comfortableBedId],
    confirmation: {
      benefitTextIds: [pocTextIdsV1.confirmationBenefitFacilityBuildPermanent],
      mutuallyExcludedActionIds: [],
      majorRiskTextIds: [pocTextIdsV1.confirmationRiskFacilityExclusiveChoice],
    },
    skipConfirmation: {
      benefitTextIds: [pocTextIdsV1.confirmationBenefitFacilitySkipCash],
      mutuallyExcludedActionIds: [],
      majorRiskTextIds: [pocTextIdsV1.confirmationRiskFacilitySkipOpportunity],
    },
    skipReasonId: pocFacilityAuraReasonIdsV1.actionFacilitySkip,
  },
] satisfies readonly FacilityOpportunityDefinitionV1[]);

export const pocAuraDefinitionsV1: DeepReadonly<readonly AuraDefinitionV1[]> = deepFreezePocValueV1(
  [
    {
      auraId: heroineAngryAuraId,
      nameTextId: pocTextIdsV1.auraHeroineAngryName,
      reasonId: pocFacilityAuraReasonIdsV1.auraHeroineAngry,
      durationPolicy: {
        kind: "countdown",
        unit: "day_end",
        defaultRemaining: parsePositiveSafeInteger(2),
        maximumRemaining: parsePositiveSafeInteger(2),
      },
      visibility: "debuff",
      allowedTargets: [{ kind: "actor", actorId: heroineActorId }],
      modifiers: [
        {
          kind: "capacity.add",
          source: { kind: "aura", auraId: heroineAngryAuraId },
          modes: [manualServiceModeId, assistedServiceModeId],
          amount: parseSafeInteger(-1),
          reasonId: pocFacilityAuraReasonIdsV1.auraHeroineAngry,
        },
        {
          kind: "teamwork_gain.block",
          source: { kind: "aura", auraId: heroineAngryAuraId },
          reasonId: pocFacilityAuraReasonIdsV1.auraHeroineAngry,
        },
      ],
    },
    {
      auraId: tavernSignRepairedAuraId,
      nameTextId: pocTextIdsV1.auraTavernSignRepairedName,
      reasonId: pocFacilityAuraReasonIdsV1.auraSignRepaired,
      durationPolicy: {
        kind: "countdown",
        unit: "opening",
        defaultRemaining: parsePositiveSafeInteger(1),
        maximumRemaining: parsePositiveSafeInteger(1),
      },
      visibility: "buff",
      allowedTargets: [{ kind: "tavern" }],
      modifiers: [
        {
          kind: "capacity.add",
          source: { kind: "aura", auraId: tavernSignRepairedAuraId },
          modes: [manualServiceModeId, assistedServiceModeId],
          amount: parseSafeInteger(1),
          reasonId: pocFacilityAuraReasonIdsV1.auraSignRepaired,
        },
        {
          kind: "prep_points.add",
          source: { kind: "aura", auraId: tavernSignRepairedAuraId },
          modes: [manualServiceModeId, assistedServiceModeId],
          amount: parseSafeInteger(1),
          reasonId: pocFacilityAuraReasonIdsV1.auraSignRepaired,
        },
      ],
    },
    {
      auraId: playerAdventureStrainAuraId,
      nameTextId: pocTextIdsV1.auraPlayerAdventureStrainName,
      reasonId: pocFacilityAuraReasonIdsV1.auraAdventureStrain,
      durationPolicy: {
        kind: "countdown",
        unit: "night_recovery",
        defaultRemaining: parsePositiveSafeInteger(1),
        maximumRemaining: parsePositiveSafeInteger(1),
      },
      visibility: "debuff",
      allowedTargets: [{ kind: "actor", actorId: playerActorId }],
      modifiers: [
        {
          kind: "recovery.add",
          source: { kind: "aura", auraId: playerAdventureStrainAuraId },
          actorId: playerActorId,
          amount: parseSafeInteger(-2),
          reasonId: pocFacilityAuraReasonIdsV1.auraAdventureStrain,
        },
      ],
    },
  ] satisfies readonly AuraDefinitionV1[],
);
