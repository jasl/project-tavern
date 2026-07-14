// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { defineGameplayModule } from "@sillymaker/base";

import type { PocGameSimulationTypesV1 } from "./types.js";

export const definePocGameplayModuleV1: ReturnType<
  typeof defineGameplayModule<PocGameSimulationTypesV1>
> = defineGameplayModule<PocGameSimulationTypesV1>();
