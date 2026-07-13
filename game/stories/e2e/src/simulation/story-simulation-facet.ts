// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parsePositiveSafeInteger } from "@sillymaker/base";
import type { StateContractManifestV1 } from "@sillymaker/base";

import {
  e2eCounterModuleIdV1,
  e2eCounterStateSlotIdV1,
  e2eFlowModuleIdV1,
  e2eFlowStateSlotIdV1,
  e2eRunModuleIdV1,
  e2eRunStateSlotIdV1,
} from "../gameplay/contracts/index.js";
import { createE2eGameSimulationV1 } from "../gameplay/game-simulation.js";
import { e2eSimulationPatchSurfaceV1 } from "./patch-surfaces.js";
import { materializeE2eSimulationProgramV1 } from "./program.js";

const stateContractRevisionV1 = parsePositiveSafeInteger(1);
const moduleContractRevisionV1 = parsePositiveSafeInteger(1);
const schemaRevisionV1 = parsePositiveSafeInteger(1);

export const e2eStateContractManifestV1 = Object.freeze({
  contractRevision: 1 as const,
  aggregateStateSchema: Object.freeze({
    schemaId: "schema.e2e.game-state",
    revision: schemaRevisionV1,
  }),
  moduleStateSchemas: Object.freeze([
    Object.freeze({
      moduleId: e2eCounterModuleIdV1,
      moduleContractRevision: moduleContractRevisionV1,
      stateSlots: Object.freeze([e2eCounterStateSlotIdV1]),
      stateSchema: Object.freeze({
        schemaId: "schema.e2e.counter-state",
        revision: schemaRevisionV1,
      }),
    }),
    Object.freeze({
      moduleId: e2eFlowModuleIdV1,
      moduleContractRevision: moduleContractRevisionV1,
      stateSlots: Object.freeze([e2eFlowStateSlotIdV1]),
      stateSchema: Object.freeze({
        schemaId: "schema.e2e.flow-state",
        revision: schemaRevisionV1,
      }),
    }),
    Object.freeze({
      moduleId: e2eRunModuleIdV1,
      moduleContractRevision: moduleContractRevisionV1,
      stateSlots: Object.freeze([e2eRunStateSlotIdV1]),
      stateSchema: Object.freeze({
        schemaId: "schema.e2e.run-state",
        revision: schemaRevisionV1,
      }),
    }),
  ]),
  persistentIrSchemas: Object.freeze([]),
  stableReferenceSets: Object.freeze([
    Object.freeze({
      setId: "references.e2e.flow-node",
      ids: Object.freeze([
        "flow_node.e2e.choice",
        "flow_node.e2e.done",
        "flow_node.e2e.intro",
        "flow_node.e2e.left",
        "flow_node.e2e.rejoin",
        "flow_node.e2e.right",
      ]),
    }),
  ]),
}) satisfies StateContractManifestV1;

const e2eSimulationDataV1 = Object.freeze({});
const e2eSimulationRulesV1 = Object.freeze({});

export const e2eStorySimulationFacetV1 = Object.freeze({
  stateContractRevision: stateContractRevisionV1,
  stateContractManifest: e2eStateContractManifestV1,
  data: e2eSimulationDataV1,
  rules: e2eSimulationRulesV1,
  narrativeProgram: null,
  patchSurface: e2eSimulationPatchSurfaceV1,
  materializeProgram: materializeE2eSimulationProgramV1,
  createGameSimulation: createE2eGameSimulationV1,
});
