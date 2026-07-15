// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import {
  deepFreezePocValueV1,
  parseMoney,
  parsePositiveSafeInteger,
  parseQuantity,
  type DeepReadonly,
  type IngredientDefinitionV1,
  type RecipeDefinitionV1,
} from "../gameplay/index.js";

import { customerSegmentIdsV1, ingredientIdsV1, pocTextIdsV1, recipeIdsV1 } from "./ids.js";

const [coarseGrainId, rootVegetableId, aleId, freshMeatId, herbId] = ingredientIdsV1;
const [localsId, travelersId] = customerSegmentIdsV1;

export const pocIngredientDefinitionsV1: DeepReadonly<readonly IngredientDefinitionV1[]> =
  deepFreezePocValueV1([
    {
      ingredientId: coarseGrainId,
      nameTextId: pocTextIdsV1.ingredientCoarseGrainName,
      unitPrice: parseMoney(1),
      shelfLifeDays: parsePositiveSafeInteger(7),
      refrigeratable: false,
    },
    {
      ingredientId: rootVegetableId,
      nameTextId: pocTextIdsV1.ingredientRootVegetableName,
      unitPrice: parseMoney(1),
      shelfLifeDays: parsePositiveSafeInteger(3),
      refrigeratable: true,
    },
    {
      ingredientId: aleId,
      nameTextId: pocTextIdsV1.ingredientAleName,
      unitPrice: parseMoney(2),
      shelfLifeDays: parsePositiveSafeInteger(7),
      refrigeratable: false,
    },
    {
      ingredientId: freshMeatId,
      nameTextId: pocTextIdsV1.ingredientFreshMeatName,
      unitPrice: parseMoney(3),
      shelfLifeDays: parsePositiveSafeInteger(2),
      refrigeratable: true,
    },
    {
      ingredientId: herbId,
      nameTextId: pocTextIdsV1.ingredientHerbName,
      unitPrice: parseMoney(2),
      shelfLifeDays: parsePositiveSafeInteger(3),
      refrigeratable: true,
    },
  ] satisfies readonly IngredientDefinitionV1[]);

export const pocRecipeDefinitionsV1: DeepReadonly<readonly RecipeDefinitionV1[]> =
  deepFreezePocValueV1([
    {
      recipeId: recipeIdsV1[0],
      nameTextId: pocTextIdsV1.recipeGrainRootPorridgeName,
      ingredients: [
        { ingredientId: coarseGrainId, quantity: parseQuantity(1) },
        { ingredientId: rootVegetableId, quantity: parseQuantity(1) },
      ],
      salePrice: parseMoney(5),
      prepPoints: parsePositiveSafeInteger(1),
      preferences: [
        { segmentId: localsId, value: 3 },
        { segmentId: travelersId, value: 1 },
      ],
    },
    {
      recipeId: recipeIdsV1[1],
      nameTextId: pocTextIdsV1.recipeAleBreadName,
      ingredients: [
        { ingredientId: coarseGrainId, quantity: parseQuantity(1) },
        { ingredientId: aleId, quantity: parseQuantity(1) },
      ],
      salePrice: parseMoney(6),
      prepPoints: parsePositiveSafeInteger(1),
      preferences: [
        { segmentId: localsId, value: 2 },
        { segmentId: travelersId, value: 3 },
      ],
    },
    {
      recipeId: recipeIdsV1[2],
      nameTextId: pocTextIdsV1.recipeHunterStewName,
      ingredients: [
        { ingredientId: freshMeatId, quantity: parseQuantity(1) },
        { ingredientId: rootVegetableId, quantity: parseQuantity(1) },
        { ingredientId: herbId, quantity: parseQuantity(1) },
      ],
      salePrice: parseMoney(12),
      prepPoints: parsePositiveSafeInteger(2),
      preferences: [
        { segmentId: localsId, value: 3 },
        { segmentId: travelersId, value: 2 },
      ],
    },
    {
      recipeId: recipeIdsV1[3],
      nameTextId: pocTextIdsV1.recipeTravelerRoastName,
      ingredients: [
        { ingredientId: freshMeatId, quantity: parseQuantity(1) },
        { ingredientId: aleId, quantity: parseQuantity(1) },
        { ingredientId: herbId, quantity: parseQuantity(1) },
      ],
      salePrice: parseMoney(13),
      prepPoints: parsePositiveSafeInteger(2),
      preferences: [
        { segmentId: localsId, value: 1 },
        { segmentId: travelersId, value: 3 },
      ],
    },
  ] satisfies readonly RecipeDefinitionV1[]);
