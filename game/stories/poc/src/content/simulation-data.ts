// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  deepFreezePocValueV1,
  pocSimulationDataSchemaV1,
  type DeepReadonly,
  type PocSimulationDataV1,
  type StoryBalanceV1,
} from "../gameplay/index.js";
import { pocActionDefinitionsV1 } from "./actions.js";
import { pocBalanceV1 } from "./balance.js";
import {
  pocCheckDefinitionsV1,
  pocEndingDefinitionsV1,
  pocWorldActionDefinitionsV1,
} from "./checks-endings.js";
import {
  pocCharacterDefinitionsV1,
  pocCustomerSegmentDefinitionsV1,
  pocItemDefinitionsV1,
  pocModifierSourceDefinitionsV1,
  pocReasonDefinitionsV1,
  pocSimulationManifestV1,
} from "./simulation-core-definitions.js";
import { pocEventDefinitionsV1 } from "./events.js";
import {
  pocAuraDefinitionsV1,
  pocFacilityDefinitionsV1,
  pocFacilityOpportunityDefinitionsV1,
} from "./facilities-auras.js";
import { pocIngredientDefinitionsV1, pocRecipeDefinitionsV1 } from "./ingredients-recipes.js";
import { pocNarrativeScenesV1 } from "./narrative/index.js";
import { pocRelationshipStoryActionDefinitionsV1 } from "./narrative/relationship.js";
import { pocInitialStateV1, pocStateDefinitionsV1 } from "./state-definitions.js";

export function materializePocSimulationDataV1(
  resolvedBalance: DeepReadonly<StoryBalanceV1>,
): DeepReadonly<PocSimulationDataV1> {
  return deepFreezePocValueV1(
    pocSimulationDataSchemaV1.parse({
      dataRevision: 1,
      manifest: pocSimulationManifestV1,
      stateDefinitions: pocStateDefinitionsV1,
      initialState: pocInitialStateV1,
      balance: resolvedBalance,
      content: {
        characters: pocCharacterDefinitionsV1,
        reasons: pocReasonDefinitionsV1,
        actions: pocActionDefinitionsV1,
        storyActions: pocRelationshipStoryActionDefinitionsV1,
        customerSegments: pocCustomerSegmentDefinitionsV1,
        modifierSources: pocModifierSourceDefinitionsV1,
        ingredients: pocIngredientDefinitionsV1,
        items: pocItemDefinitionsV1,
        recipes: pocRecipeDefinitionsV1,
        facilities: pocFacilityDefinitionsV1,
        facilityOpportunities: pocFacilityOpportunityDefinitionsV1,
        auras: pocAuraDefinitionsV1,
        worldActions: pocWorldActionDefinitionsV1,
        events: pocEventDefinitionsV1,
        checks: pocCheckDefinitionsV1,
        endings: pocEndingDefinitionsV1,
      },
      narrative: { scenes: pocNarrativeScenesV1 },
    }),
  );
}

export const pocSimulationDataV1: DeepReadonly<PocSimulationDataV1> =
  materializePocSimulationDataV1(pocBalanceV1);
