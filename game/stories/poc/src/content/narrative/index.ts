// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  deepFreezePocValueV1,
  type DeepReadonly,
  type NarrativeSceneV1,
} from "../../gameplay/index.js";
import { pocNarrativeD1D4V1 } from "./d1-d4.js";
import { pocInvestigationNarrativeV1 } from "./investigation.js";
import { pocRelationshipNarrativeV1 } from "./relationship.js";

export const pocNarrativeScenesV1: DeepReadonly<readonly NarrativeSceneV1[]> = deepFreezePocValueV1(
  pocNarrativeD1D4V1.concat(pocRelationshipNarrativeV1, pocInvestigationNarrativeV1),
);
