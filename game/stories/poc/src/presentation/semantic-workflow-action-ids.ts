// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { parseActionId } from "../gameplay/contracts/ids.js";

export const pocSemanticWorkflowActionIdsV1 = Object.freeze([
  parseActionId("action.run_start"),
  parseActionId("action.tavern_opening_start"),
  parseActionId("action.tavern_opening_continue"),
  parseActionId("action.tavern_opening_finalize"),
  parseActionId("action.world_action_complete"),
  parseActionId("action.narrative_advance"),
  parseActionId("action.narrative_choose"),
] as const);
