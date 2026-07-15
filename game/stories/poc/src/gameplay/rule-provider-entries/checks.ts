// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { PocRulesV1, PocSimulationDataV1 } from "../contracts/types.js";
import type { DeepReadonly } from "../contracts/values.js";
import { createPocCheckResolverV1 } from "../resolvers/check-resolver.js";

export function createPocCheckRuleProvidersV1(
  data: DeepReadonly<PocSimulationDataV1>,
): DeepReadonly<PocRulesV1["checks"]> {
  return createPocCheckResolverV1(data);
}
