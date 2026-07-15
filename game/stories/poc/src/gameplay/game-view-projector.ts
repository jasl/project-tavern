// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import type { PocGameQueriesV1, PocGameViewV1 } from "./contracts/types.js";
import { deepFreezePocValueV1 } from "./contracts/values.js";

export function projectPocGameViewV1(queries: PocGameQueriesV1): PocGameViewV1 {
  return deepFreezePocValueV1({
    status: queries.getGameViewStatus(),
    hud: queries.getHudProjection(),
    actions: queries.getAvailableActions(),
    runStartControl: queries.getRunStartControl(),
    lifePolicySelection: queries.getLifePolicySelection(),
    tavernOpeningControl: queries.getTavernOpeningControl(),
    demandForecast: queries.getDemandForecast(),
    obligationForecast: queries.getObligationForecast(),
    inventory: queries.getInventoryProjection(),
    tavern: queries.getTavernProjection(),
    facilities: queries.getFacilitiesProjection(),
    ledger: queries.getLedgerProjection(),
    resolvedChecks: queries.getResolvedChecks(),
    completion: queries.getRunCompletion(),
  });
}
