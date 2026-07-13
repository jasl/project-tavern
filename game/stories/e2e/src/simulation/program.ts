// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parsePositiveSafeInteger } from "@sillymaker/base";
import type { DeepReadonly, ResolvedPatchValuesV1 } from "@sillymaker/base";

import type { E2eSimulationProgramInputV1 } from "../gameplay/contracts/index.js";
import { e2eSimulationPatchSurfaceV1 } from "./patch-surfaces.js";

export interface E2eSimulationProgramV1 extends E2eSimulationProgramInputV1 {
  readonly rules: {
    readonly resolveChoiceDelta: E2eSimulationProgramInputV1["rules"]["resolveChoiceDelta"];
  };
  readonly values: {
    readonly terminalThreshold: E2eSimulationProgramInputV1["values"]["terminalThreshold"];
  };
}

type E2eSimulationPatchValuesV1 = ResolvedPatchValuesV1<typeof e2eSimulationPatchSurfaceV1>;

export function materializeE2eSimulationProgramV1(
  values: DeepReadonly<E2eSimulationPatchValuesV1>,
): E2eSimulationProgramV1 {
  if (typeof values.choiceDelta !== "function") {
    throw new TypeError("invalid E2E choice-delta provider");
  }
  return Object.freeze({
    rules: Object.freeze({ resolveChoiceDelta: values.choiceDelta }),
    values: Object.freeze({
      terminalThreshold: parsePositiveSafeInteger(values.terminalThreshold),
    }),
  });
}
