// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { ReactElement } from "react";

import { pocTextIdsV1 } from "../../content/ids.js";
import type { MoodPoint, RelationshipStateV1 } from "../../gameplay/index.js";
import type { PocOverlayTextPortV1 } from "./PolicyOverlay.js";

export interface RelationshipOverlayPropsV1 {
  readonly relationship: RelationshipStateV1;
  readonly heroineMood: MoodPoint;
  readonly presentation: PocOverlayTextPortV1;
}

export function RelationshipOverlayV1(props: RelationshipOverlayPropsV1): ReactElement {
  const affectionLabel = props.presentation.text(pocTextIdsV1.sectionAffectionLabel).text;
  const teamworkLabel = props.presentation.text(pocTextIdsV1.sectionTeamworkLabel).text;
  const moodLabel = props.presentation.text(pocTextIdsV1.sectionMoodLabel).text;

  return (
    <dl data-poc-overlay-content="relationship">
      <div>
        <dt>{affectionLabel}</dt>
        <dd>{props.relationship.affection}</dd>
      </div>
      <div>
        <dt>{teamworkLabel}</dt>
        <dd>{props.relationship.teamwork}</dd>
      </div>
      <div>
        <dt>{moodLabel}</dt>
        <dd>{props.heroineMood}</dd>
      </div>
    </dl>
  );
}
