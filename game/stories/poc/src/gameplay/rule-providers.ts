// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { PocRulesV1, PocSimulationDataV1 } from "./contracts/types.js";
import type { DeepReadonly } from "./contracts/values.js";
import { createPocCheckRuleProvidersV1 } from "./rule-provider-entries/checks.js";
import { createPocDemandRuleProvidersV1 } from "./rule-provider-entries/demand.js";
import { createPocEndingRuleProvidersV1 } from "./rule-provider-entries/endings.js";
import { createPocTavernRuleProvidersV1 } from "./rule-provider-entries/tavern.js";

export function createPocRuleProvidersV1(
  data: DeepReadonly<PocSimulationDataV1>,
): DeepReadonly<PocRulesV1> {
  return Object.freeze({
    demand: createPocDemandRuleProvidersV1(data),
    tavern: createPocTavernRuleProvidersV1(data),
    checks: createPocCheckRuleProvidersV1(data),
    endings: createPocEndingRuleProvidersV1(data),
  });
}
