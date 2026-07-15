// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { PocRulesV1, PocSimulationDataV1 } from "../contracts/types.js";
import type { DeepReadonly } from "../contracts/values.js";
import { createPocEndingRuleV1 } from "../rules/ending-rule.js";

export function createPocEndingRuleProvidersV1(
  data: DeepReadonly<PocSimulationDataV1>,
): DeepReadonly<PocRulesV1["endings"]> {
  return createPocEndingRuleV1(data);
}
