// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { parsePositiveSafeInteger } from "@sillymaker/base";

import { parseStoryId } from "../gameplay/index.js";

export const pocStoryIdentityV1 = Object.freeze({
  id: parseStoryId("week.poc_001"),
  revision: parsePositiveSafeInteger(1),
});

export const pocStateContractRevisionV1 = parsePositiveSafeInteger(1);
