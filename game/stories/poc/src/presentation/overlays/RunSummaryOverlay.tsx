// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parseTextId } from "@sillymaker/base";
import type { TextId } from "@sillymaker/base";
import type { ReactElement } from "react";

import { endingIdsV1, pocTextIdsV1 } from "../../content/ids.js";
import type { EndingId, RunCompletionV1 } from "../../gameplay/index.js";
import type { PocOverlayTextPortV1 } from "./PolicyOverlay.js";

const endingNameTextIdsByIdV1 = new Map<EndingId, TextId>([
  [endingIdsV1[0], pocTextIdsV1.endingStableName],
  [endingIdsV1[1], pocTextIdsV1.endingDangerName],
  [endingIdsV1[2], pocTextIdsV1.endingFailedArrearsName],
]);

function endingNameTextIdV1(endingId: EndingId): TextId {
  const textId = endingNameTextIdsByIdV1.get(endingId);
  if (textId === undefined) {
    throw new TypeError(`presentation.poc_ending_text_unknown:${endingId}`);
  }
  return textId;
}

export interface RunSummaryOverlayPropsV1 {
  readonly completion: RunCompletionV1;
  readonly presentation: PocOverlayTextPortV1;
}

export function RunSummaryOverlayV1(props: RunSummaryOverlayPropsV1): ReactElement {
  const endingLabel = props.presentation.text(pocTextIdsV1.sectionEndingLabel).text;
  const endingName = props.presentation.text(endingNameTextIdV1(props.completion.endingId)).text;

  return (
    <section data-poc-overlay-content="run-summary">
      <dl>
        <div>
          <dt>{endingLabel}</dt>
          <dd>{endingName}</dd>
        </div>
      </dl>
      {props.completion.reasonIds.length === 0 ? null : (
        <ul>
          {props.completion.reasonIds.map((reasonId) => (
            <li key={reasonId}>
              {props.presentation.text(parseTextId(`text.poc.${reasonId}`)).text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
