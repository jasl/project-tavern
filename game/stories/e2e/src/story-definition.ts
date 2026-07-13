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
} from "./gameplay/contracts/index.js";
import { createE2eGameSimulationV1 } from "./gameplay/game-simulation.js";
import {
  e2eAssetPacksV1,
  e2eAssetSlotsV1,
  e2ePresentationPatchSurfaceV1,
  materializeE2ePresentationV1,
} from "./presentation/presentation-program.js";
import { e2eSceneGraphV1 } from "./presentation/scene-graph.js";
import { e2eTextCatalogsV1 } from "./presentation/text-catalogs.js";
import { e2eSimulationPatchSurfaceV1 } from "./simulation/patch-surfaces.js";
import { materializeE2eSimulationProgramV1 } from "./simulation/program.js";

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

export const e2eStoryDefinitionV1 = Object.freeze({
  simulation: Object.freeze({
    stateContractRevision: stateContractRevisionV1,
    stateContractManifest: e2eStateContractManifestV1,
    data: e2eSimulationDataV1,
    rules: e2eSimulationRulesV1,
    narrativeProgram: null,
    patchSurface: e2eSimulationPatchSurfaceV1,
    materializeProgram: materializeE2eSimulationProgramV1,
    createGameSimulation: createE2eGameSimulationV1,
  }),
  presentation: Object.freeze({
    uiSceneGraph: e2eSceneGraphV1,
    textCatalogs: e2eTextCatalogsV1,
    assetSlots: e2eAssetSlotsV1,
    assetPacks: e2eAssetPacksV1,
    patchSurface: e2ePresentationPatchSurfaceV1,
    materializePresentation: materializeE2ePresentationV1,
  }),
});

export function defineE2eStoryV1(): typeof e2eStoryDefinitionV1 {
  return e2eStoryDefinitionV1;
}
