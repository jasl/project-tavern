// SPDX-License-Identifier: CC-BY-NC-SA-4.0

import {
  deepFreezePocValueV1,
  parseSafeInteger,
  type DeepReadonly,
  type NarrativeSceneV1,
  type ReasonId,
} from "../../gameplay/index.js";
import {
  choiceIdsV1,
  eventIdsV1,
  factIdsV1,
  nodeIdsV1,
  reasonIdsV1,
  sceneIdsV1,
} from "../simulation-ids.js";
import { pocSimulationTextIdsV1 as pocTextIdsV1 } from "../simulation-text-ids.js";

function requireReasonIdV1(expected: string): ReasonId {
  const reasonId = reasonIdsV1.find((candidate) => candidate === expected);
  if (reasonId === undefined) throw new TypeError(`missing registered ReasonId: ${expected}`);
  return reasonId;
}

const invoiceCheckedReasonIdV1 = requireReasonIdV1("reason.event.invoice_checked");
const intellectRequiredReasonIdV1 = requireReasonIdV1("reason.unavailable.intellect_b_required");

export const pocNarrativeD1D4V1: DeepReadonly<readonly NarrativeSceneV1[]> = deepFreezePocValueV1([
  {
    sceneId: sceneIdsV1[0],
    entryNodeId: nodeIdsV1[0],
    nodes: [
      {
        kind: "narration",
        nodeId: nodeIdsV1[0],
        textId: pocTextIdsV1.narrativeManifestStartCard,
        nextNodeId: nodeIdsV1[1],
      },
      { kind: "end", nodeId: nodeIdsV1[1] },
    ],
  },
  {
    sceneId: sceneIdsV1[1],
    entryNodeId: nodeIdsV1[2],
    nodes: [
      {
        kind: "choice",
        nodeId: nodeIdsV1[2],
        choices: [
          {
            choiceId: choiceIdsV1[0],
            textId: pocTextIdsV1.choiceSupplierInvoiceIntellectBLabel,
            showWhen: [],
            enableWhen: [{ kind: "actor.rank_at_least", attribute: "intellect", rank: "B" }],
            disabledReasonId: intellectRequiredReasonIdV1,
            confirmation: {
              benefitTextIds: [pocTextIdsV1.confirmationBenefitInvoiceInspect],
              mutuallyExcludedActionIds: [],
              majorRiskTextIds: [],
            },
            effects: [
              {
                kind: "ledger.append",
                entry: {
                  category: "story_reward",
                  reasonId: invoiceCheckedReasonIdV1,
                  cashDelta: parseSafeInteger(4),
                  valuationDelta: parseSafeInteger(0),
                  subject: { kind: "event", eventId: eventIdsV1[1] },
                },
              },
              {
                kind: "fact.set",
                factId: factIdsV1[2],
                value: { kind: "boolean", value: true },
                reasonId: invoiceCheckedReasonIdV1,
              },
            ],
            nextNodeId: nodeIdsV1[3],
          },
          {
            choiceId: choiceIdsV1[1],
            textId: pocTextIdsV1.choiceSupplierInvoicePayNormallyLabel,
            showWhen: [],
            enableWhen: [],
            confirmation: {
              benefitTextIds: [],
              mutuallyExcludedActionIds: [],
              majorRiskTextIds: [pocTextIdsV1.confirmationRiskInvoicePayment],
            },
            effects: [],
            nextNodeId: nodeIdsV1[3],
          },
        ],
      },
      { kind: "end", nodeId: nodeIdsV1[3] },
    ],
  },
  {
    sceneId: sceneIdsV1[2],
    entryNodeId: nodeIdsV1[4],
    nodes: [
      {
        kind: "narration",
        nodeId: nodeIdsV1[4],
        textId: pocTextIdsV1.narrativeFacilityWindowNotice,
        nextNodeId: nodeIdsV1[5],
      },
      { kind: "end", nodeId: nodeIdsV1[5] },
    ],
  },
  {
    sceneId: sceneIdsV1[3],
    entryNodeId: nodeIdsV1[6],
    nodes: [
      {
        kind: "narration",
        nodeId: nodeIdsV1[6],
        textId: pocTextIdsV1.narrativeLevyDueNotice,
        nextNodeId: nodeIdsV1[7],
      },
      { kind: "end", nodeId: nodeIdsV1[7] },
    ],
  },
] satisfies readonly NarrativeSceneV1[]);
