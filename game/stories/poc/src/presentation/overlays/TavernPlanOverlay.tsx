// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly } from "@sillymaker/base";
import { Button } from "@sillymaker/ui";
import { useRef, useState } from "react";
import type { ReactElement } from "react";

import { pocTextIdsV1 } from "../../content/ids.js";
import type { RecipeId, ServiceMode } from "../../gameplay/index.js";
import { parsePocSemanticInvocationV1, type PocSemanticPreviewV1 } from "../semantic-actions.js";
import {
  resolvePocRejectionReasonLabelsV1,
  type PocActionDescriptorForV1,
  type PocOverlaySemanticPortV1,
  type PocOverlayTextPortV1,
} from "./PolicyOverlay.js";
import { PocPreviewFeedbackV1 } from "./PurchaseOverlay.js";

interface TavernPlanLineDraftV1 {
  readonly key: number;
  readonly recipeId: RecipeId | null;
  readonly portions: string;
}

function parseBoundedPositiveIntegerV1(value: string, maximum: number): number | null {
  if (!/^[1-9]\d*$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : null;
}

export interface TavernPlanOverlayPropsV1 {
  readonly descriptor: PocActionDescriptorForV1<"action.service_plan">;
  readonly semantic: PocOverlaySemanticPortV1;
  readonly presentation: PocOverlayTextPortV1;
}

export function TavernPlanOverlayV1(props: TavernPlanOverlayPropsV1): ReactElement {
  const [mode, setMode] = useState<ServiceMode | null>(null);
  const [lines, setLines] = useState<readonly TavernPlanLineDraftV1[]>(Object.freeze([]));
  const [preview, setPreview] = useState<DeepReadonly<PocSemanticPreviewV1> | null>(null);
  const [pending, setPending] = useState(false);
  const nextKeyRef = useRef(0);
  const input = props.descriptor.form.input;
  const modeLabel = props.presentation.text(pocTextIdsV1.formServiceModeLabel).text;
  const recipeLabel = props.presentation.text(pocTextIdsV1.formRecipeLabel).text;
  const portionsLabel = props.presentation.text(pocTextIdsV1.formPortionsLabel).text;
  const addLabel = props.presentation.text(pocTextIdsV1.controlAddLineLabel).text;
  const removeLabel = props.presentation.text(pocTextIdsV1.controlRemoveLineLabel).text;
  const confirmLabel = props.presentation.text(pocTextIdsV1.controlConfirmTavernPlanLabel).text;
  const descriptorReasons = resolvePocRejectionReasonLabelsV1(
    props.descriptor.reasons,
    props.presentation,
  );

  const selectMode = (value: string): void => {
    const selectedMode = input.serviceModes.find(({ mode: candidate }) => candidate === value);
    if (selectedMode === undefined) return;
    setMode(selectedMode.mode);
    setPreview(null);
  };

  const addLine = (): void => {
    if (!props.descriptor.enabled || lines.length >= input.recipeLimit) return;
    const key = nextKeyRef.current;
    nextKeyRef.current += 1;
    setLines((current) => [...current, Object.freeze({ key, recipeId: null, portions: "1" })]);
    setPreview(null);
  };

  const setRecipe = (key: number, value: string): void => {
    const recipe = input.recipes.find(({ recipeId }) => recipeId === value);
    if (recipe === undefined) return;
    setLines((current) =>
      current.map((line) =>
        line.key === key ? Object.freeze({ ...line, recipeId: recipe.recipeId }) : line,
      ),
    );
    setPreview(null);
  };

  const setPortions = (key: number, portions: string): void => {
    setLines((current) =>
      current.map((line) => (line.key === key ? Object.freeze({ ...line, portions }) : line)),
    );
    setPreview(null);
  };

  const removeLine = (key: number): void => {
    setLines((current) => current.filter((line) => line.key !== key));
    setPreview(null);
  };

  const parsedLines = lines.map((line) => ({
    recipeId: line.recipeId,
    portions: parseBoundedPositiveIntegerV1(line.portions, input.portionsPerRecipeLimit),
  }));
  const currentServiceModes = new Set(input.serviceModes.map(({ mode: candidate }) => candidate));
  const currentRecipeIds = new Set(input.recipes.map(({ recipeId }) => recipeId));
  const uniqueRecipeCount = new Set(
    parsedLines.flatMap(({ recipeId }) => (recipeId === null ? [] : [recipeId])),
  ).size;
  const menuCardinalityValid =
    parsedLines.length <= input.recipeLimit &&
    (mode === "closed" ? parsedLines.length === 0 : mode !== null && parsedLines.length > 0);
  const formComplete =
    mode !== null &&
    currentServiceModes.has(mode) &&
    menuCardinalityValid &&
    parsedLines.every(
      (line): line is { readonly recipeId: RecipeId; readonly portions: number } =>
        line.recipeId !== null && currentRecipeIds.has(line.recipeId) && line.portions !== null,
    ) &&
    uniqueRecipeCount === parsedLines.length;

  const submit = async (): Promise<void> => {
    if (!props.descriptor.enabled || !formComplete || pending) return;
    const invocation = parsePocSemanticInvocationV1({
      kind: "invoke",
      actionId: props.descriptor.form.actionId,
      options: { plan: { mode, menu: parsedLines } },
    });
    if (invocation.actionId !== "action.service_plan") return;
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
    <section data-poc-overlay-content="tavern-plan">
      <label>
        <span>{modeLabel}</span>
        <select
          aria-label={modeLabel}
          value={mode ?? ""}
          disabled={!props.descriptor.enabled || pending}
          onChange={(event) => selectMode(event.currentTarget.value)}
        >
          <option value="" disabled />
          {input.serviceModes.map((serviceMode) => (
            <option key={serviceMode.mode} value={serviceMode.mode}>
              {props.presentation.text(serviceMode.nameTextId).text}
            </option>
          ))}
        </select>
      </label>
      {lines.map((line) => (
        <fieldset key={line.key}>
          <label>
            <span>{recipeLabel}</span>
            <select
              aria-label={recipeLabel}
              value={line.recipeId ?? ""}
              disabled={!props.descriptor.enabled || pending}
              onChange={(event) => setRecipe(line.key, event.currentTarget.value)}
            >
              <option value="" disabled />
              {input.recipes.map((recipe) => (
                <option key={recipe.recipeId} value={recipe.recipeId}>
                  {props.presentation.text(recipe.nameTextId).text}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{portionsLabel}</span>
            <input
              type="number"
              aria-label={portionsLabel}
              min={1}
              max={input.portionsPerRecipeLimit}
              step={1}
              value={line.portions}
              disabled={!props.descriptor.enabled || pending}
              onChange={(event) => setPortions(line.key, event.currentTarget.value)}
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
        disabled={!props.descriptor.enabled || pending || lines.length >= input.recipeLimit}
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
