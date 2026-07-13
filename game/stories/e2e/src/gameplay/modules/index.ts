// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { createChoiceDeltaResolverModuleV1 } from "../resolvers/choice-delta-resolver.js";
import type { ChoiceDeltaProviderV1 } from "../resolvers/choice-delta-resolver.js";
import { counterModuleV1 } from "./counter-module.js";
import { flowModuleV1 } from "./flow-module.js";
import { runModuleV1 } from "./run-module.js";

export { createChoiceDeltaResolverModuleV1, counterModuleV1, flowModuleV1, runModuleV1 };
export type { ChoiceDeltaProviderV1 };
export type {
  CounterOwnerOperationV1,
  CounterOwnerProposalV1,
  CounterReadPortV1,
} from "./counter-module.js";
export type { FlowOwnerOperationV1, FlowOwnerProposalV1, FlowReadPortV1 } from "./flow-module.js";
export { runOwnerOperationSchemaV1, runOwnerProposalSchemaV1 } from "./run-module.js";
export type {
  RunCompleteOperationV1,
  RunCompletePayloadV1,
  RunCompleteTerminalV1,
  RunDependencyPortsV1,
  RunOwnerProposalV1,
  RunReadPortV1,
} from "./run-module.js";

export function createE2eGameplayModulesV1(provider: ChoiceDeltaProviderV1) {
  return Object.freeze([
    counterModuleV1,
    flowModuleV1,
    runModuleV1,
    createChoiceDeltaResolverModuleV1(provider),
  ] as const);
}

export type E2eGameplayModulesV1 = ReturnType<typeof createE2eGameplayModulesV1>;
