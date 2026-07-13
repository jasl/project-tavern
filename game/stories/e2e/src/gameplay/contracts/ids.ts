// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parseModuleId, parseStateSlotId } from "@sillymaker/base";

export const e2eCounterModuleIdV1 = parseModuleId("e2e.counter");
export const e2eFlowModuleIdV1 = parseModuleId("e2e.flow");
export const e2eRunModuleIdV1 = parseModuleId("e2e.run");
export const e2eChoiceDeltaResolverModuleIdV1 = parseModuleId("e2e.choice-delta-resolver");

export const e2eCounterStateSlotIdV1 = parseStateSlotId("simulation.counter");
export const e2eFlowStateSlotIdV1 = parseStateSlotId("simulation.flow");
export const e2eRunStateSlotIdV1 = parseStateSlotId("simulation.run");
