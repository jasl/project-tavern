// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type {
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
  GameSnapshotEnvelopeV1,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
  RngDrawTraceV1,
  RngStateV1,
} from "@sillymaker/base";

import type { E2eDebugCommandV1, E2eGameCommandV1 } from "./commands.js";
import type { E2eGameplayFactV1 } from "./facts.js";
import type {
  E2eDebugValidationErrorV1,
  E2eGameplayFaultV1,
  E2eRejectionReasonV1,
} from "./results.js";
import type { E2eGameStateV1 } from "./state.js";

export type E2eGameBootstrapInputV1 = GameBootstrapInputV1;
export type E2eGameSnapshotV1 = GameSnapshotEnvelopeV1<E2eGameStateV1, RngStateV1>;

export interface E2eGameQueriesV1 {
  readonly counterValue: NonNegativeSafeInteger;
  readonly parity: "even" | "odd";
  readonly flowStatus: E2eGameStateV1["simulation"]["flow"]["status"];
  readonly visibleNodeId: E2eGameStateV1["simulation"]["flow"]["nodeId"];
  readonly runStatus: E2eGameStateV1["simulation"]["run"]["status"];
  readonly canStart: boolean;
  readonly canComplete: boolean;
}

export interface E2eGameViewV1 {
  readonly counterLabel: string;
  readonly flow: {
    readonly status: E2eGameQueriesV1["flowStatus"];
    readonly nodeId: E2eGameQueriesV1["visibleNodeId"];
  };
  readonly terminal: boolean;
}

export interface E2eSimulationProgramInputV1 {
  readonly rules: {
    readonly resolveChoiceDelta: (choice: "left" | "right") => PositiveSafeInteger;
  };
  readonly values: {
    readonly terminalThreshold: PositiveSafeInteger;
  };
}

export interface E2eGameSimulationTypesV1 extends GameSimulationTypeMapV1<
  E2eGameBootstrapInputV1,
  E2eGameStateV1,
  RngStateV1
> {
  readonly snapshot: E2eGameSnapshotV1;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: E2eGameCommandV1;
  readonly fact: E2eGameplayFactV1;
  readonly rejection: E2eRejectionReasonV1;
  readonly fault: E2eGameplayFaultV1;
  readonly debugCommand: E2eDebugCommandV1;
  readonly debugValidationError: E2eDebugValidationErrorV1;
  readonly executionContext: undefined;
  readonly queries: E2eGameQueriesV1;
  readonly viewModel: E2eGameViewV1;
}
