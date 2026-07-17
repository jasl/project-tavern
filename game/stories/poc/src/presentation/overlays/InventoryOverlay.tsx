// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { TextId } from "@sillymaker/base";
import type { ReactElement } from "react";

import { ingredientIdsV1, pocTextIdsV1 } from "../../content/ids.js";
import type { IngredientId, PocInventoryProjectionV1 } from "../../gameplay/index.js";
import type { PocOverlayTextPortV1 } from "./PolicyOverlay.js";

const ingredientNameTextIdsByIdV1 = new Map<IngredientId, TextId>([
  [ingredientIdsV1[0], pocTextIdsV1.ingredientCoarseGrainName],
  [ingredientIdsV1[1], pocTextIdsV1.ingredientRootVegetableName],
  [ingredientIdsV1[2], pocTextIdsV1.ingredientAleName],
  [ingredientIdsV1[3], pocTextIdsV1.ingredientFreshMeatName],
  [ingredientIdsV1[4], pocTextIdsV1.ingredientHerbName],
]);

function ingredientNameTextIdV1(ingredientId: IngredientId): TextId {
  const textId = ingredientNameTextIdsByIdV1.get(ingredientId);
  if (textId === undefined) {
    throw new TypeError(`presentation.poc_ingredient_text_unknown:${ingredientId}`);
  }
  return textId;
}

export interface InventoryOverlayPropsV1 {
  readonly inventory: PocInventoryProjectionV1;
  readonly presentation: PocOverlayTextPortV1;
}

export function InventoryOverlayV1(props: InventoryOverlayPropsV1): ReactElement {
  const tableLabel = props.presentation.text(pocTextIdsV1.sectionInventoryTableLabel).text;
  const emptyLabel = props.presentation.text(pocTextIdsV1.sectionInventoryEmptyLabel).text;
  const ingredientLabel = props.presentation.text(pocTextIdsV1.formIngredientLabel).text;
  const quantityLabel = props.presentation.text(pocTextIdsV1.formQuantityLabel).text;

  if (props.inventory.ingredientBatches.length === 0 && props.inventory.itemStacks.length === 0) {
    return <p data-poc-overlay-content="inventory">{emptyLabel}</p>;
  }

  return (
    <section data-poc-overlay-content="inventory">
      <table aria-label={tableLabel}>
        <thead>
          <tr>
            <th scope="col">{ingredientLabel}</th>
            <th scope="col">{quantityLabel}</th>
          </tr>
        </thead>
        <tbody>
          {props.inventory.ingredientBatches.map((batch) => (
            <tr key={batch.batchId}>
              <td>{props.presentation.text(ingredientNameTextIdV1(batch.ingredientId)).text}</td>
              <td>{batch.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
