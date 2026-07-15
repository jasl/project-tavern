// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { PocRulesV1, PocSimulationDataV1 } from "../contracts/types.js";
import type { DeepReadonly } from "../contracts/values.js";
import { createPocTavernSettlementResolverV1 } from "../resolvers/tavern-settlement-resolver.js";

export function createPocTavernRuleProvidersV1(
  data: DeepReadonly<PocSimulationDataV1>,
): DeepReadonly<PocRulesV1["tavern"]> {
  return createPocTavernSettlementResolverV1(data);
}
