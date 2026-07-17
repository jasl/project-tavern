// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly } from "@sillymaker/base";
import { Button } from "@sillymaker/ui";
import { useRef, useState } from "react";
import type { ReactElement } from "react";

import { pocTextIdsV1 } from "../../content/ids.js";
import type { IngredientId } from "../../gameplay/index.js";
import { parsePocSemanticInvocationV1, type PocSemanticPreviewV1 } from "../semantic-actions.js";
import {
  resolvePocRejectionReasonLabelsV1,
  type PocActionDescriptorForV1,
  type PocOverlaySemanticPortV1,
  type PocOverlayTextPortV1,
} from "./PolicyOverlay.js";

interface PurchaseLineDraftV1 {
  readonly key: number;
  readonly ingredientId: IngredientId | null;
  readonly quantity: string;
}

function parseBoundedPositiveIntegerV1(value: string, maximum: number): number | null {
  if (!/^[1-9]\d*$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : null;
}

export interface PocPreviewFeedbackPropsV1 {
  readonly preview: DeepReadonly<PocSemanticPreviewV1> | null;
  readonly presentation: PocOverlayTextPortV1;
}

export function PocPreviewFeedbackV1(props: PocPreviewFeedbackPropsV1): ReactElement | null {
  if (props.preview === null) return null;
  const previewLabel = props.presentation.text(pocTextIdsV1.sectionPreviewLabel).text;
  if (!props.preview.allowed) {
    const reasons = resolvePocRejectionReasonLabelsV1(props.preview.reasons, props.presentation);
    return (
      <section aria-label={previewLabel}>
        <h3>{previewLabel}</h3>
        <ul>
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </section>
    );
  }

  const confirmation = props.preview.confirmation;
  const confirmationTextIds =
    confirmation === null ? [] : [...confirmation.benefitTextIds, ...confirmation.majorRiskTextIds];
  return (
    <section aria-label={previewLabel}>
      <h3>{previewLabel}</h3>
      {confirmationTextIds.length === 0 ? null : (
        <ul>
          {confirmationTextIds.map((textId) => (
            <li key={textId}>{props.presentation.text(textId).text}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export interface PurchaseOverlayPropsV1 {
  readonly descriptor: PocActionDescriptorForV1<"action.purchase">;
  readonly semantic: PocOverlaySemanticPortV1;
  readonly presentation: PocOverlayTextPortV1;
}

export function PurchaseOverlayV1(props: PurchaseOverlayPropsV1): ReactElement {
  const [lines, setLines] = useState<readonly PurchaseLineDraftV1[]>(Object.freeze([]));
  const [preview, setPreview] = useState<DeepReadonly<PocSemanticPreviewV1> | null>(null);
  const [pending, setPending] = useState(false);
  const nextKeyRef = useRef(0);
  const input = props.descriptor.form.input;
  const ingredientLabel = props.presentation.text(pocTextIdsV1.formIngredientLabel).text;
  const quantityLabel = props.presentation.text(pocTextIdsV1.formQuantityLabel).text;
  const addLabel = props.presentation.text(pocTextIdsV1.controlAddLineLabel).text;
  const removeLabel = props.presentation.text(pocTextIdsV1.controlRemoveLineLabel).text;
  const confirmLabel = props.presentation.text(pocTextIdsV1.controlConfirmPurchaseLabel).text;
  const descriptorReasons = resolvePocRejectionReasonLabelsV1(
    props.descriptor.reasons,
    props.presentation,
  );

  const addLine = (): void => {
    if (!props.descriptor.enabled || lines.length >= input.lineLimit) return;
    const key = nextKeyRef.current;
    nextKeyRef.current += 1;
    setLines((current) => [...current, Object.freeze({ key, ingredientId: null, quantity: "1" })]);
    setPreview(null);
  };

  const setIngredient = (key: number, value: string): void => {
    const ingredient = input.ingredients.find(({ ingredientId }) => ingredientId === value);
    if (ingredient === undefined) return;
    setLines((current) =>
      current.map((line) =>
        line.key === key ? Object.freeze({ ...line, ingredientId: ingredient.ingredientId }) : line,
      ),
    );
    setPreview(null);
  };

  const setQuantity = (key: number, quantity: string): void => {
    setLines((current) =>
      current.map((line) => (line.key === key ? Object.freeze({ ...line, quantity }) : line)),
    );
    setPreview(null);
  };

  const removeLine = (key: number): void => {
    setLines((current) => current.filter((line) => line.key !== key));
    setPreview(null);
  };

  const parsedLines = lines.map((line) => ({
    ingredientId: line.ingredientId,
    quantity: parseBoundedPositiveIntegerV1(line.quantity, input.quantityPerLineLimit),
  }));
  const currentIngredientIds = new Set(input.ingredients.map(({ ingredientId }) => ingredientId));
  const duplicateIngredientCount = new Set(
    parsedLines.flatMap(({ ingredientId }) => (ingredientId === null ? [] : [ingredientId])),
  ).size;
  const formComplete =
    parsedLines.length > 0 &&
    parsedLines.length <= input.lineLimit &&
    parsedLines.every(
      (line): line is { readonly ingredientId: IngredientId; readonly quantity: number } =>
        line.ingredientId !== null &&
        currentIngredientIds.has(line.ingredientId) &&
        line.quantity !== null,
    ) &&
    duplicateIngredientCount === parsedLines.length;

  const submit = async (): Promise<void> => {
    if (!props.descriptor.enabled || !formComplete || pending) return;
    const invocation = parsePocSemanticInvocationV1({
      kind: "invoke",
      actionId: props.descriptor.form.actionId,
      options: { lines: parsedLines },
    });
    if (invocation.actionId !== "action.purchase") return;
    setPending(true);
    try {
      const nextPreview = await props.semantic.preview(invocation);
      setPreview(nextPreview);
      if (nextPreview.allowed) await props.semantic.dispatch(invocation);
    } finally {
      setPending(false);
    }
  };

  return (
    <section data-poc-overlay-content="purchase">
      {lines.map((line) => (
        <fieldset key={line.key}>
          <label>
            <span>{ingredientLabel}</span>
            <select
              aria-label={ingredientLabel}
              value={line.ingredientId ?? ""}
              disabled={!props.descriptor.enabled || pending}
              onChange={(event) => setIngredient(line.key, event.currentTarget.value)}
            >
              <option value="" disabled />
              {input.ingredients.map((ingredient) => (
                <option key={ingredient.ingredientId} value={ingredient.ingredientId}>
                  {props.presentation.text(ingredient.nameTextId).text}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{quantityLabel}</span>
            <input
              type="number"
              aria-label={quantityLabel}
              min={1}
              max={input.quantityPerLineLimit}
              step={1}
              value={line.quantity}
              disabled={!props.descriptor.enabled || pending}
              onChange={(event) => setQuantity(line.key, event.currentTarget.value)}
            />
          </label>
          <Button
            disabled={!props.descriptor.enabled || pending}
            onClick={() => removeLine(line.key)}
          >
            {removeLabel}
          </Button>
        </fieldset>
      ))}
      <Button
        disabled={!props.descriptor.enabled || pending || lines.length >= input.lineLimit}
        onClick={addLine}
      >
        {addLabel}
      </Button>
      {descriptorReasons.length === 0 ? null : (
        <ul>
          {descriptorReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      <PocPreviewFeedbackV1 preview={preview} presentation={props.presentation} />
      <Button
        disabled={!props.descriptor.enabled || !formComplete || pending}
        onClick={() => void submit()}
      >
        {confirmLabel}
      </Button>
    </section>
  );
}
