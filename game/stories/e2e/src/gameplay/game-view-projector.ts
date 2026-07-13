// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { E2eGameQueriesV1, E2eGameViewV1 } from "./contracts/index.js";

export function projectE2eGameViewV1(queries: E2eGameQueriesV1): E2eGameViewV1 {
  return Object.freeze({
    counterLabel: `计数 ${queries.counterValue}`,
    flow: Object.freeze({
      status: queries.flowStatus,
      nodeId: queries.visibleNodeId,
    }),
    terminal: queries.runStatus === "complete",
  });
}
