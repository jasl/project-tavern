// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly, TextId } from "@sillymaker/base";
import { Button } from "@sillymaker/ui";
import { useState } from "react";
import type { ReactElement } from "react";

import type { PocSemanticGamePortV1 } from "../../application/create-poc-semantic-port.js";
import { pocRejectionReasonTextIdsByCodeV1, pocTextIdsV1 } from "../../content/ids.js";
import type { PocRejectionReasonV1 } from "../../gameplay/index.js";
import type {
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1,
} from "../semantic-actions.js";

export interface PocOverlayTextPortV1 {
  text(textId: TextId): Readonly<{ readonly text: string }>;
}

export type PocOverlaySemanticPortV1 = Pick<PocSemanticGamePortV1, "preview" | "dispatch">;

export type PocActionDescriptorForV1<TActionId extends PocSemanticInvocationV1["actionId"]> =
  DeepReadonly<Extract<PocSemanticActionDescriptorV1, { readonly actionId: TActionId }>>;

export function resolvePocRejectionReasonLabelsV1(
  reasons: readonly DeepReadonly<PocRejectionReasonV1>[],
  presentation: PocOverlayTextPortV1,
): readonly string[] {
  return Object.freeze(
    reasons.map((reason) => presentation.text(pocRejectionReasonTextIdsByCodeV1[reason.code]).text),
  );
}

export interface PolicyOverlayPropsV1 {
  readonly descriptor: PocActionDescriptorForV1<"action.choose_life_policy">;
  readonly semantic: PocOverlaySemanticPortV1;
  readonly presentation: PocOverlayTextPortV1;
}

export function PolicyOverlayV1(props: PolicyOverlayPropsV1): ReactElement {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const selectedOption = props.descriptor.options.find(
    ({ optionId }) => optionId === selectedOptionId,
  );
  const reasonLabels = resolvePocRejectionReasonLabelsV1(
    props.descriptor.reasons,
    props.presentation,
  );
  const legend = props.presentation.text(props.descriptor.textId).text;
  const confirmLabel = props.presentation.text(pocTextIdsV1.controlConfirmLabel).text;

  const submit = async (): Promise<void> => {
    if (!props.descriptor.enabled || selectedOption === undefined || pending) return;
    setPending(true);
    try {
      await props.semantic.dispatch(selectedOption.invocation);
    } finally {
      setPending(false);
    }
  };

  return (
    <section data-poc-overlay-content="policy">
      <fieldset>
        <legend>{legend}</legend>
        {props.descriptor.options.map((option) => (
          <label key={option.optionId}>
            <input
              type="radio"
              name="poc-policy"
              value={option.optionId}
              checked={selectedOptionId === option.optionId}
              disabled={!props.descriptor.enabled || pending}
              onChange={() => setSelectedOptionId(option.optionId)}
            />
            <span>{props.presentation.text(option.textId).text}</span>
          </label>
        ))}
      </fieldset>
      {reasonLabels.length === 0 ? null : (
        <ul>
          {reasonLabels.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      <Button
        disabled={!props.descriptor.enabled || selectedOption === undefined || pending}
        onClick={() => void submit()}
      >
        {confirmLabel}
      </Button>
    </section>
  );
}
