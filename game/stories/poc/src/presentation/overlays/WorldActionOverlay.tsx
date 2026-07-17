// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { Button } from "@sillymaker/ui";
import { useState } from "react";
import type { ReactElement } from "react";

import { pocTextIdsV1 } from "../../content/ids.js";
import type { PocSemanticPreviewV1 } from "../semantic-actions.js";
import {
  resolvePocRejectionReasonLabelsV1,
  type PocActionDescriptorForV1,
  type PocOverlaySemanticPortV1,
  type PocOverlayTextPortV1,
} from "./PolicyOverlay.js";
import { PocPreviewFeedbackV1 } from "./PurchaseOverlay.js";

export interface WorldActionOverlayPropsV1 {
  readonly descriptor: PocActionDescriptorForV1<"action.old_trade_road">;
  readonly semantic: PocOverlaySemanticPortV1;
  readonly presentation: PocOverlayTextPortV1;
}

export function WorldActionOverlayV1(props: WorldActionOverlayPropsV1): ReactElement {
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
  const confirmLabel = props.presentation.text(pocTextIdsV1.controlConfirmWorldActionLabel).text;

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
    <section data-poc-overlay-content="world-action">
      <fieldset>
        <legend>{legend}</legend>
        {props.descriptor.options.map((option) => (
          <label key={option.optionId}>
            <input
              type="radio"
              name="poc-world-action"
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
