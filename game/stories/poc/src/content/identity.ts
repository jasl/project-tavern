// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { parseNonZeroUint32, parsePositiveSafeInteger, parseRunId } from "@sillymaker/base";

import { parseStoryId } from "../gameplay/index.js";

export const pocStoryIdentityV1 = Object.freeze({
  id: parseStoryId("week.poc_001"),
  revision: parsePositiveSafeInteger(1),
});

export const pocStateContractRevisionV1 = parsePositiveSafeInteger(1);
export const pocReferenceSeedV1 = parseNonZeroUint32(0x00023049);

export const pocReferenceRunIdsV1 = Object.freeze({
  "strategy.cash_first": parseRunId("00000000-0000-4000-8000-000000000101"),
  "strategy.relationship_first": parseRunId("00000000-0000-4000-8000-000000000102"),
  "strategy.investigation_first": parseRunId("00000000-0000-4000-8000-000000000103"),
  "strategy.full_delegation": parseRunId("00000000-0000-4000-8000-000000000104"),
  "strategy.two_closures_recovery": parseRunId("00000000-0000-4000-8000-000000000105"),
  "strategy.explicit_failure": parseRunId("00000000-0000-4000-8000-000000000106"),
} as const);
