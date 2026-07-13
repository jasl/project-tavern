// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parsePositiveSafeInteger } from "@sillymaker/base";
import type { DeepReadonly, PositiveSafeInteger } from "@sillymaker/base";

import { e2eGameStateSchemaV1 } from "./contracts/index.js";
import type {
  E2eGameQueriesV1,
  E2eGameStateV1,
  E2eSimulationProgramInputV1,
} from "./contracts/index.js";
import { canCompleteE2eRunV1 as canCompleteFromTerminalInputV1 } from "./game-command-executor.js";

function terminalInputV1(state: E2eGameStateV1) {
  return Object.freeze({
    counterValue: state.simulation.counter.value,
    flowStatus: state.simulation.flow.status,
    nodeId: state.simulation.flow.nodeId,
    runStatus: state.simulation.run.status,
  });
}

export function canCompleteE2eRunV1(
  stateValue: DeepReadonly<E2eGameStateV1>,
  terminalThresholdValue: PositiveSafeInteger,
): boolean {
  const state = e2eGameStateSchemaV1.parse(stateValue);
  const terminalThreshold = parsePositiveSafeInteger(terminalThresholdValue);
  return canCompleteFromTerminalInputV1(terminalInputV1(state), terminalThreshold);
}

export function createE2eGameQueriesV1(
  stateValue: DeepReadonly<E2eGameStateV1>,
  terminalThresholdValue: PositiveSafeInteger,
  resolveChoiceDelta: E2eSimulationProgramInputV1["rules"]["resolveChoiceDelta"],
): E2eGameQueriesV1 {
  const state = e2eGameStateSchemaV1.parse(stateValue);
  const terminalThreshold = parsePositiveSafeInteger(terminalThresholdValue);
  if (typeof resolveChoiceDelta !== "function") {
    throw new TypeError("invalid E2E choice-delta query port");
  }
  const { counter, flow, run } = state.simulation;
  return Object.freeze({
    counterValue: counter.value,
    parity: counter.value % 2 === 0 ? "even" : "odd",
    flowStatus: flow.status,
    visibleNodeId: flow.nodeId,
    runStatus: run.status,
    choiceDeltas: Object.freeze({
      left: parsePositiveSafeInteger(resolveChoiceDelta("left")),
      right: parsePositiveSafeInteger(resolveChoiceDelta("right")),
    }),
    canStart:
      run.status === "active" &&
      flow.status === "idle" &&
      flow.branch === null &&
      flow.nodeId === "intro",
    canComplete: canCompleteFromTerminalInputV1(terminalInputV1(state), terminalThreshold),
  });
}
