// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { TextId } from "@sillymaker/base";
import { Button } from "@sillymaker/ui";
import { useState } from "react";
import type { ReactElement } from "react";

import { facilityIdsV1, pocTextIdsV1 } from "../../content/ids.js";
import type { FacilityId, PocFacilitiesProjectionV1 } from "../../gameplay/index.js";
import type { PocSemanticPreviewV1 } from "../semantic-actions.js";
import {
  resolvePocRejectionReasonLabelsV1,
  type PocActionDescriptorForV1,
  type PocOverlaySemanticPortV1,
  type PocOverlayTextPortV1,
} from "./PolicyOverlay.js";
import { PocPreviewFeedbackV1 } from "./PurchaseOverlay.js";

const facilityNameTextIdsByIdV1 = new Map<FacilityId, TextId>([
  [facilityIdsV1[0], pocTextIdsV1.facilityColdStorageName],
  [facilityIdsV1[1], pocTextIdsV1.facilityComfortableBedName],
]);

function facilityNameTextIdV1(facilityId: FacilityId): TextId {
  const textId = facilityNameTextIdsByIdV1.get(facilityId);
  if (textId === undefined) {
    throw new TypeError(`presentation.poc_facility_text_unknown:${facilityId}`);
  }
  return textId;
}

export interface FacilityOverlayPropsV1 {
  readonly facilities: PocFacilitiesProjectionV1;
  readonly descriptor: PocActionDescriptorForV1<"action.facility_window">;
  readonly semantic: PocOverlaySemanticPortV1;
  readonly presentation: PocOverlayTextPortV1;
}

export function FacilityOverlayV1(props: FacilityOverlayPropsV1): ReactElement {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PocSemanticPreviewV1 | null>(null);
  const [pending, setPending] = useState(false);
  const selectedOption = props.descriptor.options.find(
    ({ optionId }) => optionId === selectedOptionId,
  );
  const descriptorReasons = resolvePocRejectionReasonLabelsV1(
    props.descriptor.reasons,
    props.presentation,
  );
  const legend = props.presentation.text(props.descriptor.textId).text;
  const confirmLabel = props.presentation.text(pocTextIdsV1.controlConfirmFacilityLabel).text;

  const submit = async (): Promise<void> => {
    if (!props.descriptor.enabled || selectedOption === undefined || pending) return;
    setPending(true);
    try {
      const nextPreview = await props.semantic.preview(selectedOption.invocation);
      setPreview(nextPreview);
      if (nextPreview.allowed) await props.semantic.dispatch(selectedOption.invocation);
    } finally {
      setPending(false);
    }
  };

  return (
    <section data-poc-overlay-content="facility">
      {props.facilities.built.length === 0 ? null : (
        <ul>
          {props.facilities.built.map((facility) => (
            <li key={facility.facilityId}>
              {props.presentation.text(facilityNameTextIdV1(facility.facilityId)).text}
            </li>
          ))}
        </ul>
      )}
      <fieldset>
        <legend>{legend}</legend>
        {props.descriptor.options.map((option) => (
          <label key={option.optionId}>
            <input
              type="radio"
              name="poc-facility"
              value={option.optionId}
              checked={selectedOptionId === option.optionId}
              disabled={!props.descriptor.enabled || pending}
              onChange={() => {
                setSelectedOptionId(option.optionId);
                setPreview(null);
              }}
            />
            <span>{props.presentation.text(option.textId).text}</span>
          </label>
        ))}
      </fieldset>
      {descriptorReasons.length === 0 ? null : (
        <ul>
          {descriptorReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      <PocPreviewFeedbackV1 preview={preview} presentation={props.presentation} />
      <Button
        disabled={!props.descriptor.enabled || selectedOption === undefined || pending}
        onClick={() => void submit()}
      >
        {confirmLabel}
      </Button>
    </section>
  );
}
