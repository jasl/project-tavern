// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { PocRulesV1, PocSimulationDataV1 } from "../contracts/types.js";
import type { DeepReadonly } from "../contracts/values.js";
import { createPocDemandRulesV1 } from "../rules/demand-rules.js";

export function createPocDemandRuleProvidersV1(
  data: DeepReadonly<PocSimulationDataV1>,
): DeepReadonly<PocRulesV1["demand"]> {
  return createPocDemandRulesV1(data);
}
