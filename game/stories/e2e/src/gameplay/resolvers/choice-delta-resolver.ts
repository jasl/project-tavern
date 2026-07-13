// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { defineGameplayModule, parsePositiveSafeInteger } from "@sillymaker/base";

import type { E2eGameSimulationTypesV1, E2eSimulationProgramInputV1 } from "../contracts/index.js";
import { e2eChoiceDeltaResolverModuleIdV1 } from "../contracts/ids.js";

export type ChoiceDeltaProviderV1 = E2eSimulationProgramInputV1["rules"]["resolveChoiceDelta"];

function parseChoiceDeltaChoiceV1(value: unknown): "left" | "right" {
  if (value !== "left" && value !== "right") {
    throw new TypeError("invalid choice delta choice");
  }
  return value;
}

export function createChoiceDeltaResolverModuleV1(provider: ChoiceDeltaProviderV1) {
  if (typeof provider !== "function") throw new TypeError("invalid choice delta provider");
  return defineGameplayModule<E2eGameSimulationTypesV1>()({
    bindingKind: "stateless" as const,
    descriptor: {
      id: e2eChoiceDeltaResolverModuleIdV1,
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: [],
      dependencies: [],
    },
    commandSchema: null,
    querySchema: null,
    queryResultSchema: null,
    ownerOperationSchema: null,
    ownerProposalSchema: null,
    owner: null,
    capabilities: {
      resolveChoiceDelta(choiceValue: "left" | "right") {
        const choice = parseChoiceDeltaChoiceV1(choiceValue);
        return parsePositiveSafeInteger(provider(choice));
      },
    },
  });
}
