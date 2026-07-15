// SPDX-License-Identifier: CC-BY-NC-SA-4.0

import {
  deepFreezePocValueV1,
  parsePositiveSafeInteger,
  parseSafeInteger,
  type DeepReadonly,
  type NarrativeSceneV1,
  type ReasonId,
  type StoryActionDefinitionV1,
} from "../../gameplay/index.js";
import {
  actionIdsV1,
  actorIdsV1,
  auraIdsV1,
  characterIdsV1,
  choiceIdsV1,
  investigationOutcomeTokensV1,
  nodeIdsV1,
  outcomeIdsV1,
  pocTextIdsV1,
  reasonIdsV1,
  relationshipOutcomeTokensV1,
  sceneIdsV1,
} from "../ids.js";

function requireReasonIdV1(expected: string): ReasonId {
  const reasonId = reasonIdsV1.find((candidate) => candidate === expected);
  if (reasonId === undefined) throw new TypeError(`missing registered ReasonId: ${expected}`);
  return reasonId;
}

const relationshipReasonIdsV1 = Object.freeze({
  repairSign: requireReasonIdV1("reason.relationship.repair_sign"),
  repairSignDeclined: requireReasonIdV1("reason.relationship.repair_sign_declined"),
  repairSignConflict: requireReasonIdV1("reason.relationship.repair_sign_conflict"),
  apology: requireReasonIdV1("reason.relationship.apology"),
});

export const pocRelationshipStoryActionDefinitionsV1: DeepReadonly<
  readonly StoryActionDefinitionV1[]
> = deepFreezePocValueV1([
  {
    actionId: actionIdsV1[8],
    sceneId: sceneIdsV1[4],
    startEffects: [],
  },
  {
    actionId: actionIdsV1[10],
    sceneId: sceneIdsV1[5],
    startEffects: [
      {
        kind: "calendar.ap.adjust",
        delta: parseSafeInteger(-1),
        reasonId: relationshipReasonIdsV1.apology,
      },
      {
        kind: "relationship.affection.adjust",
        delta: parseSafeInteger(1),
        reasonId: relationshipReasonIdsV1.apology,
      },
      {
        kind: "aura.clear",
        auraId: auraIdsV1[0],
        target: { kind: "actor", actorId: actorIdsV1[1] },
        reasonId: relationshipReasonIdsV1.apology,
      },
      {
        kind: "outcome.set",
        outcomeId: outcomeIdsV1[0],
        value: { kind: "token", value: relationshipOutcomeTokensV1[3] },
        reasonId: relationshipReasonIdsV1.apology,
      },
    ],
  },
] satisfies readonly StoryActionDefinitionV1[]);

export const pocRelationshipNarrativeV1: DeepReadonly<readonly NarrativeSceneV1[]> =
  deepFreezePocValueV1([
    {
      sceneId: sceneIdsV1[4],
      entryNodeId: nodeIdsV1[8],
      nodes: [
        {
          kind: "narration",
          nodeId: nodeIdsV1[8],
          textId: pocTextIdsV1.narrativeRepairSignIntro,
          nextNodeId: nodeIdsV1[9],
        },
        {
          kind: "choice",
          nodeId: nodeIdsV1[9],
          choices: [
            {
              choiceId: choiceIdsV1[2],
              textId: pocTextIdsV1.choiceRepairSignCooperateLabel,
              showWhen: [],
              enableWhen: [],
              confirmation: {
                benefitTextIds: [pocTextIdsV1.confirmationBenefitRepairSignRelationship],
                mutuallyExcludedActionIds: [actionIdsV1[9]],
                majorRiskTextIds: [],
              },
              effects: [
                {
                  kind: "calendar.ap.adjust",
                  delta: parseSafeInteger(-2),
                  reasonId: relationshipReasonIdsV1.repairSign,
                },
                {
                  kind: "actor.stamina.adjust",
                  actorId: actorIdsV1[0],
                  delta: parseSafeInteger(-1),
                  reasonId: relationshipReasonIdsV1.repairSign,
                },
                {
                  kind: "actor.stamina.adjust",
                  actorId: actorIdsV1[1],
                  delta: parseSafeInteger(-1),
                  reasonId: relationshipReasonIdsV1.repairSign,
                },
                {
                  kind: "relationship.affection.adjust",
                  delta: parseSafeInteger(3),
                  reasonId: relationshipReasonIdsV1.repairSign,
                },
                {
                  kind: "actor.mood.adjust",
                  actorId: actorIdsV1[1],
                  delta: parseSafeInteger(1),
                  reasonId: relationshipReasonIdsV1.repairSign,
                },
                {
                  kind: "aura.apply",
                  auraId: auraIdsV1[1],
                  target: { kind: "tavern" },
                  source: { kind: "story_action", actionId: actionIdsV1[8] },
                  duration: {
                    kind: "countdown",
                    unit: "opening",
                    remaining: parsePositiveSafeInteger(1),
                  },
                  reasonId: relationshipReasonIdsV1.repairSign,
                },
                {
                  kind: "outcome.set",
                  outcomeId: outcomeIdsV1[0],
                  value: { kind: "token", value: relationshipOutcomeTokensV1[1] },
                  reasonId: relationshipReasonIdsV1.repairSign,
                },
                {
                  kind: "outcome.set",
                  outcomeId: outcomeIdsV1[1],
                  value: { kind: "token", value: investigationOutcomeTokensV1[1] },
                  reasonId: relationshipReasonIdsV1.repairSign,
                },
              ],
              nextNodeId: nodeIdsV1[10],
            },
            {
              choiceId: choiceIdsV1[3],
              textId: pocTextIdsV1.choiceRepairSignDeclineLabel,
              showWhen: [],
              enableWhen: [],
              confirmation: {
                benefitTextIds: [],
                mutuallyExcludedActionIds: [actionIdsV1[9]],
                majorRiskTextIds: [],
              },
              effects: [
                {
                  kind: "outcome.set",
                  outcomeId: outcomeIdsV1[0],
                  value: { kind: "token", value: relationshipOutcomeTokensV1[2] },
                  reasonId: relationshipReasonIdsV1.repairSignDeclined,
                },
                {
                  kind: "outcome.set",
                  outcomeId: outcomeIdsV1[1],
                  value: { kind: "token", value: investigationOutcomeTokensV1[1] },
                  reasonId: relationshipReasonIdsV1.repairSignDeclined,
                },
              ],
              nextNodeId: nodeIdsV1[10],
            },
            {
              choiceId: choiceIdsV1[4],
              textId: pocTextIdsV1.choiceRepairSignConflictLabel,
              showWhen: [],
              enableWhen: [],
              confirmation: {
                benefitTextIds: [],
                mutuallyExcludedActionIds: [actionIdsV1[9]],
                majorRiskTextIds: [pocTextIdsV1.confirmationRiskRepairSignConflict],
              },
              effects: [
                {
                  kind: "relationship.affection.adjust",
                  delta: parseSafeInteger(-1),
                  reasonId: relationshipReasonIdsV1.repairSignConflict,
                },
                {
                  kind: "aura.apply",
                  auraId: auraIdsV1[0],
                  target: { kind: "actor", actorId: actorIdsV1[1] },
                  source: { kind: "story_action", actionId: actionIdsV1[8] },
                  duration: {
                    kind: "countdown",
                    unit: "day_end",
                    remaining: parsePositiveSafeInteger(2),
                  },
                  reasonId: relationshipReasonIdsV1.repairSignConflict,
                },
                {
                  kind: "outcome.set",
                  outcomeId: outcomeIdsV1[0],
                  value: { kind: "token", value: relationshipOutcomeTokensV1[4] },
                  reasonId: relationshipReasonIdsV1.repairSignConflict,
                },
                {
                  kind: "outcome.set",
                  outcomeId: outcomeIdsV1[1],
                  value: { kind: "token", value: investigationOutcomeTokensV1[1] },
                  reasonId: relationshipReasonIdsV1.repairSignConflict,
                },
              ],
              nextNodeId: nodeIdsV1[10],
            },
          ],
        },
        { kind: "end", nodeId: nodeIdsV1[10] },
      ],
    },
    {
      sceneId: sceneIdsV1[5],
      entryNodeId: nodeIdsV1[11],
      nodes: [
        {
          kind: "line",
          nodeId: nodeIdsV1[11],
          speakerId: characterIdsV1[2],
          textId: pocTextIdsV1.narrativeApologyLine,
          nextNodeId: nodeIdsV1[12],
        },
        { kind: "end", nodeId: nodeIdsV1[12] },
      ],
    },
  ] satisfies readonly NarrativeSceneV1[]);
