// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  deepFreezePocValueV1,
  parseMoney,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseQuantity,
  parseSafeInteger,
  type CheckDefinitionV1,
  type DeepReadonly,
  type ReasonId,
  type WorldActionDefinitionV1,
} from "../gameplay/index.js";
import {
  actionIdsV1,
  actorIdsV1,
  auraIdsV1,
  checkBandIdsV1,
  checkIdsV1,
  choiceIdsV1,
  factIdsV1,
  ingredientIdsV1,
  investigationOutcomeTokensV1,
  outcomeIdsV1,
  pocTextIdsV1,
  reasonIdsV1,
  relationshipOutcomeTokensV1,
  sceneIdsV1,
  worldStepIdsV1,
} from "./ids.js";

function requireReasonIdV1(expected: string): ReasonId {
  const reasonId = reasonIdsV1.find((candidate) => candidate === expected);
  if (reasonId === undefined) throw new TypeError(`missing registered ReasonId: ${expected}`);
  return reasonId;
}

const investigationReasonIdsV1 = Object.freeze({
  begin: requireReasonIdV1("reason.investigation.begin"),
  setback: requireReasonIdV1("reason.investigation.setback"),
  successWithCost: requireReasonIdV1("reason.investigation.success_with_cost"),
  complete: requireReasonIdV1("reason.investigation.complete"),
  exceptional: requireReasonIdV1("reason.investigation.exceptional"),
});

export const pocWorldActionDefinitionsV1: DeepReadonly<readonly WorldActionDefinitionV1[]> =
  deepFreezePocValueV1([
    {
      actionId: actionIdsV1[9],
      nameTextId: pocTextIdsV1.actionOldTradeRoadLabel,
      availability: [],
      reasonId: investigationReasonIdsV1.begin,
      baseCashCost: parseMoney(4),
      playerStaminaCost: parseNonNegativeSafeInteger(3),
      beginEffects: [
        {
          kind: "outcome.set",
          outcomeId: outcomeIdsV1[0],
          value: { kind: "token", value: relationshipOutcomeTokensV1[2] },
          reasonId: investigationReasonIdsV1.begin,
        },
      ],
      options: [
        {
          optionId: choiceIdsV1[5],
          labelTextId: pocTextIdsV1.choiceOldTradeRoadBasicLabel,
          availability: [],
          additionalCashCost: parseMoney(0),
          preparationBonus: parseSafeInteger(0),
          beginEffects: [],
          confirmation: {
            benefitTextIds: [],
            mutuallyExcludedActionIds: [],
            majorRiskTextIds: [],
          },
        },
        {
          optionId: choiceIdsV1[6],
          labelTextId: pocTextIdsV1.choiceOldTradeRoadPreparedLabel,
          availability: [],
          additionalCashCost: parseMoney(4),
          preparationBonus: parseSafeInteger(1),
          beginEffects: [],
          confirmation: {
            benefitTextIds: [pocTextIdsV1.confirmationBenefitOldTradeRoadPrepared],
            mutuallyExcludedActionIds: [],
            majorRiskTextIds: [pocTextIdsV1.confirmationRiskOldTradeRoadPreparedCost],
          },
        },
      ],
      steps: [
        {
          stepId: worldStepIdsV1[0],
          phase: "morning",
          apCost: parseNonNegativeSafeInteger(1),
          sceneId: sceneIdsV1[6],
        },
        {
          stepId: worldStepIdsV1[1],
          phase: "afternoon",
          apCost: parseNonNegativeSafeInteger(2),
          sceneId: sceneIdsV1[7],
        },
      ],
      checkId: checkIdsV1[0],
    },
  ] satisfies readonly WorldActionDefinitionV1[]);

const oldTradeRoadInventorySourceV1 = Object.freeze({
  kind: "world_action" as const,
  actionId: actionIdsV1[9],
});

export const pocCheckDefinitionsV1: DeepReadonly<readonly CheckDefinitionV1[]> =
  deepFreezePocValueV1([
    {
      checkId: checkIdsV1[0],
      attribute: "intellect",
      dice: "2d6",
      bands: [
        {
          bandId: checkBandIdsV1[0],
          minInclusive: parseSafeInteger(2),
          maxInclusive: parseSafeInteger(5),
          effects: [
            {
              kind: "inventory.grant",
              lines: [{ ingredientId: ingredientIdsV1[4], quantity: parseQuantity(1) }],
              source: oldTradeRoadInventorySourceV1,
              reasonId: investigationReasonIdsV1.setback,
            },
            {
              kind: "aura.apply",
              auraId: auraIdsV1[2],
              target: { kind: "actor", actorId: actorIdsV1[0] },
              source: oldTradeRoadInventorySourceV1,
              duration: {
                kind: "countdown",
                unit: "night_recovery",
                remaining: parsePositiveSafeInteger(1),
              },
              reasonId: investigationReasonIdsV1.setback,
            },
            {
              kind: "outcome.set",
              outcomeId: outcomeIdsV1[1],
              value: { kind: "token", value: investigationOutcomeTokensV1[2] },
              reasonId: investigationReasonIdsV1.setback,
            },
          ],
        },
        {
          bandId: checkBandIdsV1[1],
          minInclusive: parseSafeInteger(6),
          maxInclusive: parseSafeInteger(8),
          effects: [
            {
              kind: "inventory.grant",
              lines: [
                { ingredientId: ingredientIdsV1[3], quantity: parseQuantity(1) },
                { ingredientId: ingredientIdsV1[4], quantity: parseQuantity(2) },
              ],
              source: oldTradeRoadInventorySourceV1,
              reasonId: investigationReasonIdsV1.successWithCost,
            },
            {
              kind: "outcome.set",
              outcomeId: outcomeIdsV1[1],
              value: { kind: "token", value: investigationOutcomeTokensV1[3] },
              reasonId: investigationReasonIdsV1.successWithCost,
            },
          ],
        },
        {
          bandId: checkBandIdsV1[2],
          minInclusive: parseSafeInteger(9),
          maxInclusive: parseSafeInteger(11),
          effects: [
            {
              kind: "inventory.grant",
              lines: [
                { ingredientId: ingredientIdsV1[3], quantity: parseQuantity(2) },
                { ingredientId: ingredientIdsV1[4], quantity: parseQuantity(3) },
              ],
              source: oldTradeRoadInventorySourceV1,
              reasonId: investigationReasonIdsV1.complete,
            },
            {
              kind: "fact.set",
              factId: factIdsV1[0],
              value: { kind: "boolean", value: true },
              reasonId: investigationReasonIdsV1.complete,
            },
            {
              kind: "outcome.set",
              outcomeId: outcomeIdsV1[1],
              value: { kind: "token", value: investigationOutcomeTokensV1[4] },
              reasonId: investigationReasonIdsV1.complete,
            },
          ],
        },
        {
          bandId: checkBandIdsV1[3],
          minInclusive: parseSafeInteger(12),
          maxInclusive: null,
          effects: [
            {
              kind: "inventory.grant",
              lines: [
                { ingredientId: ingredientIdsV1[3], quantity: parseQuantity(3) },
                { ingredientId: ingredientIdsV1[4], quantity: parseQuantity(4) },
              ],
              source: oldTradeRoadInventorySourceV1,
              reasonId: investigationReasonIdsV1.exceptional,
            },
            {
              kind: "fact.set",
              factId: factIdsV1[0],
              value: { kind: "boolean", value: true },
              reasonId: investigationReasonIdsV1.exceptional,
            },
            {
              kind: "reputation.adjust",
              delta: parseSafeInteger(1),
              reasonId: investigationReasonIdsV1.exceptional,
            },
            {
              kind: "outcome.set",
              outcomeId: outcomeIdsV1[1],
              value: { kind: "token", value: investigationOutcomeTokensV1[5] },
              reasonId: investigationReasonIdsV1.exceptional,
            },
          ],
        },
      ],
    },
  ] satisfies readonly CheckDefinitionV1[]);
