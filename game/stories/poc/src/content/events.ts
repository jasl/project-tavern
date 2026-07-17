// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  deepFreezePocValueV1,
  parseDayIndex,
  parseNonNegativeSafeInteger,
  parseSafeInteger,
  type DeepReadonly,
  type ReasonId,
  type StoryEventDefinitionV1,
} from "../gameplay/index.js";
import {
  checkpointIdsV1,
  eventIdsV1,
  factIdsV1,
  reasonIdsV1,
  sceneIdsV1,
} from "./simulation-ids.js";
import { pocFacilityOpportunityUndecidedGateV1 } from "./facilities-auras.js";

function requireReasonIdV1(expected: string): ReasonId {
  const reasonId = reasonIdsV1.find((candidate) => candidate === expected);
  if (reasonId === undefined) throw new TypeError(`missing registered ReasonId: ${expected}`);
  return reasonId;
}

const tutorialCompletedReasonIdV1 = requireReasonIdV1("reason.event.tutorial_completed");
const helperUnlockedReasonIdV1 = requireReasonIdV1("reason.event.helper_unlocked");

function buildTutorialFirstServiceEventV1(): StoryEventDefinitionV1 {
  return {
    eventId: eventIdsV1[0],
    checkpointId: checkpointIdsV1[0],
    trigger: { kind: "command.succeeded", commandKinds: ["tavern.opening.finalize"] },
    priority: parseSafeInteger(400),
    weightedGroupId: null,
    weight: parseNonNegativeSafeInteger(0),
    when: [
      { kind: "calendar.matches", day: parseDayIndex(1), phases: ["evening"] },
      {
        kind: "fact.equals",
        factId: factIdsV1[1],
        value: { kind: "boolean", value: false },
      },
    ],
    sceneId: null,
    effects: [
      {
        kind: "fact.set",
        factId: factIdsV1[1],
        value: { kind: "boolean", value: true },
        reasonId: tutorialCompletedReasonIdV1,
      },
    ],
  };
}

function buildSupplierInvoiceEventV1(): StoryEventDefinitionV1 {
  return {
    eventId: eventIdsV1[1],
    checkpointId: checkpointIdsV1[1],
    trigger: { kind: "phase.entered", days: [parseDayIndex(2)], phases: ["morning"] },
    priority: parseSafeInteger(400),
    weightedGroupId: null,
    weight: parseNonNegativeSafeInteger(0),
    when: [
      {
        kind: "fact.equals",
        factId: factIdsV1[2],
        value: { kind: "boolean", value: false },
      },
    ],
    sceneId: sceneIdsV1[1],
    effects: [],
  };
}

function buildHelperAvailableEventV1(): StoryEventDefinitionV1 {
  return {
    eventId: eventIdsV1[2],
    checkpointId: checkpointIdsV1[2],
    trigger: { kind: "day.ended", days: [parseDayIndex(1)] },
    priority: parseSafeInteger(300),
    weightedGroupId: null,
    weight: parseNonNegativeSafeInteger(0),
    when: [],
    sceneId: null,
    effects: [
      {
        kind: "tavern.helper.set",
        helper: { unlocked: true, tier: "apprentice" },
        reasonId: helperUnlockedReasonIdV1,
      },
    ],
  };
}

function buildFacilityWindowEventV1(): StoryEventDefinitionV1 {
  return {
    eventId: eventIdsV1[3],
    checkpointId: checkpointIdsV1[3],
    trigger: { kind: "phase.entered", days: [parseDayIndex(4)], phases: ["morning"] },
    priority: parseSafeInteger(300),
    weightedGroupId: null,
    weight: parseNonNegativeSafeInteger(0),
    when: pocFacilityOpportunityUndecidedGateV1.conditions,
    sceneId: sceneIdsV1[2],
    effects: [],
  };
}

function buildLevyDueEventV1(): StoryEventDefinitionV1 {
  return {
    eventId: eventIdsV1[4],
    checkpointId: checkpointIdsV1[4],
    trigger: { kind: "phase.entered", days: [parseDayIndex(7)], phases: ["morning"] },
    priority: parseSafeInteger(400),
    weightedGroupId: null,
    weight: parseNonNegativeSafeInteger(0),
    when: [{ kind: "run.status_is", status: "active" }],
    sceneId: sceneIdsV1[3],
    effects: [],
  };
}

export const pocEventDefinitionsV1: DeepReadonly<readonly StoryEventDefinitionV1[]> =
  deepFreezePocValueV1([
    buildTutorialFirstServiceEventV1(),
    buildSupplierInvoiceEventV1(),
    buildHelperAvailableEventV1(),
    buildFacilityWindowEventV1(),
    buildLevyDueEventV1(),
  ] satisfies readonly StoryEventDefinitionV1[]);
