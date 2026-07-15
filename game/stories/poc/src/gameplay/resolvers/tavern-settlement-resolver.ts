// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { canonicalJsonBytes } from "@sillymaker/base";
import type { DeepReadonly, RuleRngV1 } from "@sillymaker/base";

import {
  parseAttributeRank,
  parseFacilityId,
  parseIngredientId,
  parseRelationshipStage,
} from "../contracts/ids.js";
import type { CustomerSegmentId, IngredientId, RecipeId, ServiceMode } from "../contracts/ids.js";
import { pocSimulationDataSchemaV1 } from "../contracts/schemas.js";
import type {
  AppliedModifierV1,
  EffectIntentV1,
  IngredientQuantityV1,
  LedgerEntryDraftV1,
  MaterializedDemandSegmentV1,
  ModifierV1,
  OpeningActorInputsV1,
  OpeningOrderLineV1,
  OpeningSessionV1,
  PocSimulationDataV1,
  RecipeDefinitionV1,
  ServiceModeDefinitionV1,
  SettlementDraftV1,
  TavernPlanV1,
  TavernPreviewInputV1,
  TavernPreviewV1,
  TavernSettlementInputV1,
} from "../contracts/types.js";
import {
  deepFreezePocValueV1,
  parseDayIndex,
  parseMoney,
  parseMoodPoint,
  parseNonNegativeSafeInteger,
  parseQuantity,
  parseSafeInteger,
} from "../contracts/values.js";
import type { Money, NonNegativeSafeInteger, SafeInteger } from "../contracts/values.js";
import {
  parsePocTavernHelperStateV1,
  parsePocTavernMaterializedDemandDayV1,
  parsePocTavernPlanV1,
} from "../modules/tavern/contract.js";
import {
  parsePocWorkflowModifierV1,
  pocWorkflowStateSchemaV1,
} from "../modules/workflow/contract.js";

type PlainDataRecordV1 = Record<string, unknown>;

interface TavernCalculationContextV1 {
  readonly plan: TavernPlanV1;
  readonly mode: ServiceModeDefinitionV1;
  readonly preparationActionCount: NonNegativeSafeInteger;
  readonly demand: readonly MaterializedDemandSegmentV1[];
  readonly baselineModifiers: readonly ModifierV1[];
  readonly sessionModifiers: readonly ModifierV1[];
}

interface TavernPipelineResultV1 {
  readonly orders: readonly OpeningOrderLineV1[];
  readonly receptionCapacity: NonNegativeSafeInteger;
  readonly preparationCapacity: NonNegativeSafeInteger;
  readonly revenue: SafeInteger;
}

interface TavernSettlementConsequencesV1 {
  readonly appliedModifiers: readonly AppliedModifierV1[];
  readonly effects: readonly EffectIntentV1[];
  readonly entries: readonly LedgerEntryDraftV1[];
}

interface WeightedAllocationLineV1 {
  readonly key: string;
  readonly weight: NonNegativeSafeInteger;
}

const exhaustivePreviewVectorLimitV1 = 100_000n;
const minimumSafeIntegerBigIntV1 = BigInt(Number.MIN_SAFE_INTEGER);
const maximumSafeIntegerBigIntV1 = BigInt(Number.MAX_SAFE_INTEGER);

function exactDataObjectV1(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): PlainDataRecordV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const expected = new Set(expectedKeys);
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== expected.size ||
    keys.some((key) => typeof key !== "string" || !expected.has(key))
  ) {
    throw new TypeError(`invalid ${label} fields`);
  }
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} field ${key}`);
    }
  }
  return value as PlainDataRecordV1;
}

function exactDataArrayV1(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`invalid ${label}`);
  }
  const length = value.length;
  const keys = Reflect.ownKeys(value);
  if (
    !Number.isSafeInteger(length) ||
    keys.length !== length + 1 ||
    keys.some(
      (key) =>
        typeof key !== "string" ||
        (key !== "length" && (!/^(?:0|[1-9][0-9]*)$/u.test(key) || Number(key) >= length)),
    )
  ) {
    throw new TypeError(`invalid ${label} fields`);
  }
  const result: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} element ${index}`);
    }
    result.push(descriptor.value);
  }
  return result;
}

function dataPropertyV1(record: PlainDataRecordV1, key: string, label: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined || !("value" in descriptor)) {
    throw new TypeError(`invalid ${label} field ${key}`);
  }
  return descriptor.value;
}

function canonicalValuesEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.length === rightBytes.length &&
    leftBytes.every((byte, index) => byte === rightBytes[index])
  );
}

function compareStableIdV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function safeIntegerFromBigIntV1(value: bigint, label: string): SafeInteger {
  if (value < minimumSafeIntegerBigIntV1 || value > maximumSafeIntegerBigIntV1) {
    throw new TypeError(`${label} exceeds SafeInteger`);
  }
  return parseSafeInteger(Number(value));
}

function nonNegativeFromBigIntV1(value: bigint, label: string): NonNegativeSafeInteger {
  if (value < 0n || value > maximumSafeIntegerBigIntV1) {
    throw new TypeError(`${label} exceeds NonNegativeSafeInteger`);
  }
  return parseNonNegativeSafeInteger(Number(value));
}

function safeSumV1(values: readonly number[], label: string): SafeInteger {
  return safeIntegerFromBigIntV1(
    values.reduce((sum, value) => sum + BigInt(value), 0n),
    label,
  );
}

function clampedNonNegativeSumV1(values: readonly number[], label: string): NonNegativeSafeInteger {
  const sum = values.reduce((total, value) => total + BigInt(value), 0n);
  return nonNegativeFromBigIntV1(sum < 0n ? 0n : sum, label);
}

function multiplySafeV1(left: number, right: number, label: string): SafeInteger {
  return safeIntegerFromBigIntV1(BigInt(left) * BigInt(right), label);
}

function parseOpeningActorInputsV1(value: unknown): OpeningActorInputsV1 {
  const actors = exactDataObjectV1(
    value,
    ["playerAttributes", "heroineMood", "relationship", "helper"],
    "Tavern preview actors",
  );
  const attributes = exactDataObjectV1(
    dataPropertyV1(actors, "playerAttributes", "Tavern preview actors"),
    ["body", "social", "intellect"],
    "Tavern preview player attributes",
  );
  const relationship = exactDataObjectV1(
    dataPropertyV1(actors, "relationship", "Tavern preview actors"),
    ["affection", "teamwork", "stage"],
    "Tavern preview relationship",
  );
  return deepFreezePocValueV1({
    playerAttributes: {
      body: parseAttributeRank(
        dataPropertyV1(attributes, "body", "Tavern preview player attributes"),
      ),
      social: parseAttributeRank(
        dataPropertyV1(attributes, "social", "Tavern preview player attributes"),
      ),
      intellect: parseAttributeRank(
        dataPropertyV1(attributes, "intellect", "Tavern preview player attributes"),
      ),
    },
    heroineMood: parseMoodPoint(dataPropertyV1(actors, "heroineMood", "Tavern preview actors")),
    relationship: {
      affection: parseSafeInteger(
        dataPropertyV1(relationship, "affection", "Tavern preview relationship"),
      ),
      teamwork: parseNonNegativeSafeInteger(
        dataPropertyV1(relationship, "teamwork", "Tavern preview relationship"),
      ),
      stage: parseRelationshipStage(
        dataPropertyV1(relationship, "stage", "Tavern preview relationship"),
      ),
    },
    helper: parsePocTavernHelperStateV1(dataPropertyV1(actors, "helper", "Tavern preview actors")),
  });
}

function parseIngredientQuantitiesV1(value: unknown): readonly IngredientQuantityV1[] {
  return deepFreezePocValueV1(
    exactDataArrayV1(value, "Tavern preview available ingredients").map((entry) => {
      const line = exactDataObjectV1(
        entry,
        ["ingredientId", "quantity"],
        "Tavern preview available ingredient",
      );
      return {
        ingredientId: parseIngredientId(
          dataPropertyV1(line, "ingredientId", "Tavern preview available ingredient"),
        ),
        quantity: parseQuantity(
          dataPropertyV1(line, "quantity", "Tavern preview available ingredient"),
        ),
      };
    }),
  );
}

function parseCurrentPreviewInputV1(
  value: unknown,
): Extract<TavernPreviewInputV1, { readonly basis: "current_state" }> {
  const input = exactDataObjectV1(
    value,
    [
      "basis",
      "day",
      "plan",
      "preparationActionCount",
      "availableIngredients",
      "demand",
      "actors",
      "facilityIds",
      "modifiers",
      "resources",
    ],
    "current-state Tavern preview input",
  );
  if (dataPropertyV1(input, "basis", "current-state Tavern preview input") !== "current_state") {
    throw new TypeError("invalid current-state Tavern preview basis");
  }
  const day = parseDayIndex(dataPropertyV1(input, "day", "current-state Tavern preview input"));
  const demand = parsePocTavernMaterializedDemandDayV1({
    day,
    segments: dataPropertyV1(input, "demand", "current-state Tavern preview input"),
  }).segments;
  const resources = exactDataObjectV1(
    dataPropertyV1(input, "resources", "current-state Tavern preview input"),
    ["apRemaining", "cash", "playerStamina", "heroineStamina"],
    "current-state Tavern preview resources",
  );
  demand.forEach(({ preview, actualCustomers }) => {
    if (
      preview.min < 0 ||
      preview.min > preview.max ||
      actualCustomers < preview.min ||
      actualCustomers > preview.max
    ) {
      throw new TypeError("invalid Tavern preview demand range");
    }
  });
  return deepFreezePocValueV1({
    basis: "current_state",
    day,
    plan: parsePocTavernPlanV1(dataPropertyV1(input, "plan", "current-state Tavern preview input")),
    preparationActionCount: parseNonNegativeSafeInteger(
      dataPropertyV1(input, "preparationActionCount", "current-state Tavern preview input"),
    ),
    availableIngredients: parseIngredientQuantitiesV1(
      dataPropertyV1(input, "availableIngredients", "current-state Tavern preview input"),
    ),
    demand,
    actors: parseOpeningActorInputsV1(
      dataPropertyV1(input, "actors", "current-state Tavern preview input"),
    ),
    facilityIds: exactDataArrayV1(
      dataPropertyV1(input, "facilityIds", "current-state Tavern preview input"),
      "current-state Tavern preview FacilityIds",
    ).map(parseFacilityId),
    modifiers: exactDataArrayV1(
      dataPropertyV1(input, "modifiers", "current-state Tavern preview input"),
      "current-state Tavern preview Modifiers",
    ).map(parsePocWorkflowModifierV1),
    resources: {
      apRemaining: parseNonNegativeSafeInteger(
        dataPropertyV1(resources, "apRemaining", "current-state Tavern preview resources"),
      ),
      cash: parseMoney(dataPropertyV1(resources, "cash", "current-state Tavern preview resources")),
      playerStamina: parseNonNegativeSafeInteger(
        dataPropertyV1(resources, "playerStamina", "current-state Tavern preview resources"),
      ),
      heroineStamina: parseNonNegativeSafeInteger(
        dataPropertyV1(resources, "heroineStamina", "current-state Tavern preview resources"),
      ),
    },
  });
}

function parseOpeningSessionV1(value: unknown): OpeningSessionV1 {
  const parsed = pocWorkflowStateSchemaV1.parse(value);
  if (parsed === null || parsed.kind !== "opening") {
    throw new TypeError("invalid Tavern OpeningSession");
  }
  return parsed;
}

function parsePreviewInputV1(value: unknown): TavernPreviewInputV1 {
  const candidate = exactDataObjectV1(
    value,
    Reflect.ownKeys(value as object).filter((key): key is string => typeof key === "string"),
    "Tavern preview input",
  );
  const basis = dataPropertyV1(candidate, "basis", "Tavern preview input");
  if (basis === "current_state") return parseCurrentPreviewInputV1(value);
  if (basis !== "active_opening_baseline") throw new TypeError("invalid Tavern preview basis");
  const input = exactDataObjectV1(
    value,
    ["basis", "plan", "session"],
    "active-opening Tavern preview input",
  );
  const plan = parsePocTavernPlanV1(
    dataPropertyV1(input, "plan", "active-opening Tavern preview input"),
  );
  const session = parseOpeningSessionV1(
    dataPropertyV1(input, "session", "active-opening Tavern preview input"),
  );
  if (
    !canonicalValuesEqualV1(plan, {
      mode: session.baseline.mode,
      menu: session.baseline.menu,
    })
  ) {
    throw new TypeError("active-opening Tavern plan does not match its baseline");
  }
  return deepFreezePocValueV1({ basis, plan, session });
}

function parseSettlementInputV1(value: unknown): TavernSettlementInputV1 {
  const input = exactDataObjectV1(value, ["session"], "Tavern settlement input");
  return deepFreezePocValueV1({
    session: parseOpeningSessionV1(dataPropertyV1(input, "session", "Tavern settlement input")),
  });
}

function modeAppliesV1(modifier: ModifierV1, mode: ServiceMode): boolean {
  return (
    (modifier.kind === "capacity.add" ||
      modifier.kind === "prep_points.add" ||
      modifier.kind === "service_cost.add") &&
    modifier.modes.includes(mode)
  );
}

function numericModifierContributionV1(
  modifiers: readonly ModifierV1[],
  kind: "capacity.add" | "prep_points.add" | "service_cost.add",
  mode: ServiceMode,
): readonly SafeInteger[] {
  return modifiers
    .filter(
      (modifier): modifier is Extract<ModifierV1, { readonly kind: typeof kind }> =>
        modifier.kind === kind && modeAppliesV1(modifier, mode),
    )
    .map(({ amount }) => amount);
}

function appliedModifierV1(
  modifier: ModifierV1,
  teamworkGain: NonNegativeSafeInteger,
): AppliedModifierV1 {
  return deepFreezePocValueV1({
    modifier,
    contribution:
      modifier.kind === "teamwork_gain.block"
        ? parseSafeInteger(0 - teamworkGain)
        : modifier.kind === "recovery.add" ||
            modifier.kind === "demand.add" ||
            modifier.kind === "check.add" ||
            modifier.kind === "shelf_life.add_days"
          ? parseSafeInteger(0)
          : modifier.amount,
  });
}

function cashAppliedModifiersV1(
  modifiers: readonly ModifierV1[],
  mode: ServiceModeDefinitionV1,
): readonly AppliedModifierV1[] {
  return modifiers
    .filter(
      (modifier) => modifier.kind === "service_cost.add" && modeAppliesV1(modifier, mode.mode),
    )
    .map((modifier) => appliedModifierV1(modifier, mode.teamworkGain));
}

function settlementAppliedModifiersV1(
  context: TavernCalculationContextV1,
): readonly AppliedModifierV1[] {
  const applies = (modifier: ModifierV1, includeServiceCost: boolean): boolean =>
    modifier.kind === "teamwork_gain.block" ||
    ((modifier.kind === "capacity.add" || modifier.kind === "prep_points.add") &&
      modeAppliesV1(modifier, context.mode.mode)) ||
    (includeServiceCost &&
      modifier.kind === "service_cost.add" &&
      modeAppliesV1(modifier, context.mode.mode));
  return [
    ...context.baselineModifiers
      .filter((modifier) => applies(modifier, true))
      .map((modifier) => appliedModifierV1(modifier, context.mode.teamworkGain)),
    ...context.sessionModifiers
      .filter((modifier) => applies(modifier, false))
      .map((modifier) => appliedModifierV1(modifier, context.mode.teamworkGain)),
  ];
}

function allocateLargestRemainderV1(
  total: NonNegativeSafeInteger,
  lines: readonly WeightedAllocationLineV1[],
): readonly NonNegativeSafeInteger[] {
  const denominator = lines.reduce((sum, { weight }) => sum + BigInt(weight), 0n);
  if (denominator === 0n || total === 0) {
    return lines.map(() => parseNonNegativeSafeInteger(0));
  }
  const allocations = lines.map(({ weight }) => {
    const numerator = BigInt(total) * BigInt(weight);
    return { quotient: numerator / denominator, remainder: numerator % denominator };
  });
  const floorTotal = allocations.reduce((sum, { quotient }) => sum + quotient, 0n);
  const remaining = Number(BigInt(total) - floorTotal);
  const order = lines
    .map(({ key }, index) => ({ index, key, remainder: allocations[index]?.remainder ?? 0n }))
    .sort(
      (left, right) =>
        (left.remainder > right.remainder ? -1 : left.remainder < right.remainder ? 1 : 0) ||
        compareStableIdV1(left.key, right.key),
    );
  for (let index = 0; index < remaining; index += 1) {
    const target = order[index];
    if (target === undefined) throw new TypeError("invalid largest-remainder allocation");
    const current = allocations[target.index];
    if (current === undefined) throw new TypeError("invalid largest-remainder target");
    current.quotient += 1n;
  }
  return allocations.map(({ quotient }) =>
    nonNegativeFromBigIntV1(quotient, "largest-remainder allocation"),
  );
}

function roundedPreferenceOrdersV1(
  potentialCustomers: NonNegativeSafeInteger,
  highestPreference: number,
): NonNegativeSafeInteger {
  if (highestPreference === 0) return parseNonNegativeSafeInteger(0);
  const product = BigInt(potentialCustomers) * BigInt(highestPreference);
  return nonNegativeFromBigIntV1((2n * product + 3n) / 6n, "effective orders");
}

function calculateCapacitiesV1(context: TavernCalculationContextV1): {
  readonly reception: NonNegativeSafeInteger;
  readonly preparation: NonNegativeSafeInteger;
} {
  const modifiers = [...context.baselineModifiers, ...context.sessionModifiers];
  const reception = clampedNonNegativeSumV1(
    [
      context.mode.baseReceptionCapacity,
      ...numericModifierContributionV1(modifiers, "capacity.add", context.mode.mode),
    ],
    "Tavern reception capacity",
  );
  const preparationBase = multiplySafeV1(
    context.preparationActionCount,
    context.mode.preparationPointsPerAction,
    "Tavern preparation action points",
  );
  const preparation = clampedNonNegativeSumV1(
    [
      context.mode.basePreparationPoints,
      preparationBase,
      ...numericModifierContributionV1(modifiers, "prep_points.add", context.mode.mode),
    ],
    "Tavern preparation capacity",
  );
  return { reception, preparation };
}

function runTavernPipelineV1(
  context: TavernCalculationContextV1,
  demandVector: ReadonlyMap<CustomerSegmentId, NonNegativeSafeInteger>,
  recipesById: ReadonlyMap<RecipeId, RecipeDefinitionV1>,
): TavernPipelineResultV1 {
  const { reception, preparation } = calculateCapacitiesV1(context);
  const menu = [...context.plan.menu].sort((left, right) =>
    compareStableIdV1(left.recipeId, right.recipeId),
  );
  const segments = [...context.demand].sort((left, right) =>
    compareStableIdV1(left.segmentId, right.segmentId),
  );
  const initial: OpeningOrderLineV1[] = [];
  for (const segment of segments) {
    const potentialCustomers = demandVector.get(segment.segmentId);
    if (potentialCustomers === undefined) throw new TypeError("missing Tavern demand segment");
    const preferences = menu.map(({ recipeId }) => {
      const recipe = recipesById.get(recipeId);
      if (recipe === undefined) throw new TypeError(`unknown Tavern RecipeId: ${recipeId}`);
      return (
        recipe.preferences.find(({ segmentId }) => segmentId === segment.segmentId)?.value ?? 0
      );
    });
    const highest = Math.max(0, ...preferences);
    const effectiveTotal = roundedPreferenceOrdersV1(potentialCustomers, highest);
    const allocated = allocateLargestRemainderV1(
      effectiveTotal,
      menu.map(({ recipeId }, index) => ({
        key: recipeId,
        weight: parseNonNegativeSafeInteger(preferences[index] ?? 0),
      })),
    );
    menu.forEach(({ recipeId }, index) => {
      initial.push({
        segmentId: segment.segmentId,
        recipeId,
        potentialCustomers,
        effectiveOrders: allocated[index] ?? parseNonNegativeSafeInteger(0),
        capacityAccepted: parseNonNegativeSafeInteger(0),
        actualSales: parseNonNegativeSafeInteger(0),
      });
    });
  }
  const totalOrders = nonNegativeFromBigIntV1(
    initial.reduce((sum, { effectiveOrders }) => sum + BigInt(effectiveOrders), 0n),
    "Tavern total effective orders",
  );
  const accepted =
    totalOrders <= reception
      ? initial.map(({ effectiveOrders }) => effectiveOrders)
      : allocateLargestRemainderV1(
          reception,
          initial.map(({ segmentId, recipeId, effectiveOrders }) => ({
            key: `${segmentId}\u0000${recipeId}`,
            weight: effectiveOrders,
          })),
        );
  let orders = initial.map((line, index) => ({
    ...line,
    capacityAccepted: accepted[index] ?? parseNonNegativeSafeInteger(0),
  }));
  for (const planned of menu) {
    const indexes = orders
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.recipeId === planned.recipeId);
    const acceptedTotal = nonNegativeFromBigIntV1(
      indexes.reduce((sum, { line }) => sum + BigInt(line.capacityAccepted), 0n),
      "Tavern accepted recipe orders",
    );
    const sales =
      acceptedTotal <= planned.portions
        ? indexes.map(({ line }) => line.capacityAccepted)
        : allocateLargestRemainderV1(
            parseNonNegativeSafeInteger(planned.portions),
            indexes.map(({ line }) => ({
              key: `${line.segmentId}\u0000${line.recipeId}`,
              weight: line.capacityAccepted,
            })),
          );
    const byIndex = new Map(indexes.map(({ index }, position) => [index, sales[position]]));
    orders = orders.map((line, index) =>
      byIndex.has(index)
        ? { ...line, actualSales: byIndex.get(index) ?? parseNonNegativeSafeInteger(0) }
        : line,
    );
  }
  const revenue = safeSumV1(
    orders.map((line) => {
      const recipe = recipesById.get(line.recipeId);
      if (recipe === undefined) throw new TypeError(`unknown Tavern RecipeId: ${line.recipeId}`);
      return multiplySafeV1(line.actualSales, recipe.salePrice, "Tavern recipe revenue");
    }),
    "Tavern revenue",
  );
  return deepFreezePocValueV1({
    orders,
    receptionCapacity: reception,
    preparationCapacity: preparation,
    revenue,
  });
}

function demandVectorV1(
  demand: readonly MaterializedDemandSegmentV1[],
  select: (segment: MaterializedDemandSegmentV1) => number,
): ReadonlyMap<CustomerSegmentId, NonNegativeSafeInteger> {
  return new Map(
    demand.map((segment) => [segment.segmentId, parseNonNegativeSafeInteger(select(segment))]),
  );
}

function enumerateDemandVectorsV1(
  demand: readonly MaterializedDemandSegmentV1[],
): readonly ReadonlyMap<CustomerSegmentId, NonNegativeSafeInteger>[] | null {
  const count = demand.reduce(
    (product, { preview }) => product * BigInt(preview.max - preview.min + 1),
    1n,
  );
  if (count > exhaustivePreviewVectorLimitV1) return null;
  const result: ReadonlyMap<CustomerSegmentId, NonNegativeSafeInteger>[] = [];
  const current = new Map<CustomerSegmentId, NonNegativeSafeInteger>();
  const visit = (index: number): void => {
    const segment = demand[index];
    if (segment === undefined) {
      result.push(new Map(current));
      return;
    }
    for (let value: number = segment.preview.min; value <= segment.preview.max; value += 1) {
      current.set(segment.segmentId, parseNonNegativeSafeInteger(value));
      visit(index + 1);
    }
    current.delete(segment.segmentId);
  };
  visit(0);
  return result;
}

function recipeIngredientCostV1(
  recipe: RecipeDefinitionV1,
  ingredientUnitPrices: ReadonlyMap<IngredientId, Money>,
): SafeInteger {
  return safeSumV1(
    recipe.ingredients.map(({ ingredientId, quantity }) => {
      const unitPrice = ingredientUnitPrices.get(ingredientId);
      if (unitPrice === undefined) throw new TypeError(`unknown IngredientId: ${ingredientId}`);
      return multiplySafeV1(quantity, unitPrice, "Tavern recipe ingredient cost");
    }),
    "Tavern recipe ingredient cost",
  );
}

function requiredIngredientsV1(
  plan: TavernPlanV1,
  recipesById: ReadonlyMap<RecipeId, RecipeDefinitionV1>,
): ReadonlyMap<IngredientId, NonNegativeSafeInteger> {
  const totals = new Map<IngredientId, bigint>();
  for (const planned of plan.menu) {
    const recipe = recipesById.get(planned.recipeId);
    if (recipe === undefined) throw new TypeError(`unknown Tavern RecipeId: ${planned.recipeId}`);
    for (const ingredient of recipe.ingredients) {
      totals.set(
        ingredient.ingredientId,
        (totals.get(ingredient.ingredientId) ?? 0n) +
          BigInt(ingredient.quantity) * BigInt(planned.portions),
      );
    }
  }
  return new Map(
    [...totals].map(([ingredientId, quantity]) => [
      ingredientId,
      nonNegativeFromBigIntV1(quantity, "Tavern required ingredient quantity"),
    ]),
  );
}

function ingredientShortagesV1(
  plan: TavernPlanV1,
  available: readonly IngredientQuantityV1[],
  recipesById: ReadonlyMap<RecipeId, RecipeDefinitionV1>,
): readonly IngredientQuantityV1[] {
  const availableTotals = new Map<IngredientId, bigint>();
  for (const line of available) {
    availableTotals.set(
      line.ingredientId,
      (availableTotals.get(line.ingredientId) ?? 0n) + BigInt(line.quantity),
    );
  }
  return [...requiredIngredientsV1(plan, recipesById)]
    .filter(
      ([ingredientId, required]) => BigInt(required) > (availableTotals.get(ingredientId) ?? 0n),
    )
    .sort(([left], [right]) => compareStableIdV1(left, right))
    .map(([ingredientId, required]) => ({
      ingredientId,
      quantity: parseQuantity(Number(BigInt(required) - (availableTotals.get(ingredientId) ?? 0n))),
    }));
}

function cashCostV1(
  data: PocSimulationDataV1,
  mode: ServiceModeDefinitionV1,
  modifiers: readonly ModifierV1[],
): {
  readonly wage: Money;
  readonly openingFee: Money;
  readonly modifierDelta: SafeInteger;
  readonly total: Money;
  readonly appliedModifiers: readonly AppliedModifierV1[];
} {
  const openingFee = mode.mode === "closed" ? parseMoney(0) : data.balance.openingFee;
  const contributions = numericModifierContributionV1(modifiers, "service_cost.add", mode.mode);
  const modifierDelta = safeSumV1(contributions, "Tavern service-cost Modifier total");
  const total = parseMoney(
    clampedNonNegativeSumV1([mode.wage, openingFee, modifierDelta], "Tavern opening cash cost"),
  );
  return deepFreezePocValueV1({
    wage: mode.wage,
    openingFee,
    modifierDelta,
    total,
    appliedModifiers: cashAppliedModifiersV1(modifiers, mode),
  });
}

function validateUniqueCalculationInputsV1(
  context: TavernCalculationContextV1,
  data: PocSimulationDataV1,
): void {
  const recipeIds = context.plan.menu.map(({ recipeId }) => recipeId);
  if (new Set(recipeIds).size !== recipeIds.length)
    throw new TypeError("duplicate Tavern RecipeId");
  const segmentIds = context.demand.map(({ segmentId }) => segmentId);
  if (new Set(segmentIds).size !== segmentIds.length) {
    throw new TypeError("duplicate Tavern CustomerSegmentId");
  }
  const knownSegments = new Set(data.content.customerSegments.map(({ segmentId }) => segmentId));
  if (segmentIds.some((segmentId) => !knownSegments.has(segmentId))) {
    throw new TypeError("unknown Tavern CustomerSegmentId");
  }
}

function settlementConsequencesV1(
  data: PocSimulationDataV1,
  context: TavernCalculationContextV1,
  session: OpeningSessionV1,
  orders: readonly OpeningOrderLineV1[],
  discardedPortions: SettlementDraftV1["discardedPortions"],
  recipesById: ReadonlyMap<RecipeId, RecipeDefinitionV1>,
  ingredientUnitPrices: ReadonlyMap<IngredientId, Money>,
): TavernSettlementConsequencesV1 {
  const salesByRecipe = new Map<RecipeId, bigint>();
  for (const line of orders) {
    salesByRecipe.set(
      line.recipeId,
      (salesByRecipe.get(line.recipeId) ?? 0n) + BigInt(line.actualSales),
    );
  }
  const menu = [...context.plan.menu].sort((left, right) =>
    compareStableIdV1(left.recipeId, right.recipeId),
  );
  const entries: LedgerEntryDraftV1[] = [];
  for (const { recipeId } of menu) {
    const recipe = recipesById.get(recipeId);
    if (recipe === undefined) throw new TypeError(`unknown Tavern RecipeId: ${recipeId}`);
    const sales = nonNegativeFromBigIntV1(salesByRecipe.get(recipeId) ?? 0n, "Tavern recipe sales");
    const ingredientCost = recipeIngredientCostV1(recipe, ingredientUnitPrices);
    if (sales > 0) {
      entries.push({
        category: "revenue",
        reasonId: data.balance.ledgerReasons.revenue,
        cashDelta: multiplySafeV1(sales, recipe.salePrice, "Tavern revenue entry"),
        valuationDelta: parseSafeInteger(
          0 - multiplySafeV1(sales, ingredientCost, "Tavern sold-food valuation"),
        ),
        subject: { kind: "recipe", recipeId },
        quantity: parseQuantity(sales),
      });
    }
    const discarded = discardedPortions.find((line) => line.recipeId === recipeId)?.portions ?? 0;
    if (discarded > 0) {
      entries.push({
        category: "discarded_food",
        reasonId: data.balance.ledgerReasons.discardedFood,
        cashDelta: parseSafeInteger(0),
        valuationDelta: parseSafeInteger(
          0 - multiplySafeV1(discarded, ingredientCost, "Tavern discarded-food valuation"),
        ),
        subject: { kind: "recipe", recipeId },
        quantity: parseQuantity(discarded),
      });
    }
  }
  const potentialBySegment = new Map(
    context.demand.map(({ segmentId, actualCustomers }) => [segmentId, actualCustomers]),
  );
  const totalPotential = [...potentialBySegment.values()].reduce(
    (sum, potential) => sum + BigInt(potential),
    0n,
  );
  const totalSales = orders.reduce((sum, { actualSales }) => sum + BigInt(actualSales), 0n);
  const atLeastHalf = totalPotential > 0n && totalSales * 100n >= totalPotential * 50n;
  const reputationDelta =
    totalPotential > 0n && totalSales * 100n >= totalPotential * 80n ? 1 : atLeastHalf ? 0 : -1;
  const effects: EffectIntentV1[] = [
    {
      kind: "reputation.adjust",
      delta: parseSafeInteger(reputationDelta),
      reasonId: context.mode.reasonId,
    },
  ];
  const teamworkBlocked = [...context.baselineModifiers, ...context.sessionModifiers].some(
    ({ kind }) => kind === "teamwork_gain.block",
  );
  if (atLeastHalf && !teamworkBlocked && context.mode.teamworkGain > 0) {
    effects.push({
      kind: "relationship.teamwork.adjust",
      delta: parseSafeInteger(context.mode.teamworkGain),
      reasonId: context.mode.reasonId,
    });
  }
  if (session.baseline.heroineStamina.after < 2) {
    effects.push({
      kind: "actor.mood.adjust",
      actorId: "actor.heroine",
      delta: parseSafeInteger(-1),
      reasonId: context.mode.reasonId,
    });
  }
  return deepFreezePocValueV1({
    appliedModifiers: settlementAppliedModifiersV1(context),
    effects,
    entries,
  });
}

export function createPocTavernSettlementResolverV1(
  dataValue: DeepReadonly<PocSimulationDataV1>,
): DeepReadonly<{
  preview(input: DeepReadonly<TavernPreviewInputV1>): TavernPreviewV1;
  settle(input: DeepReadonly<TavernSettlementInputV1>, rng: RuleRngV1): SettlementDraftV1;
}> {
  const data = pocSimulationDataSchemaV1.parse(dataValue);
  const recipesById = new Map(data.content.recipes.map((recipe) => [recipe.recipeId, recipe]));
  const ingredientUnitPrices = new Map(
    data.content.ingredients.map(({ ingredientId, unitPrice }) => [ingredientId, unitPrice]),
  );
  const modeById = new Map(data.balance.serviceModes.map((mode) => [mode.mode, mode]));

  const contextForInputV1 = (input: TavernPreviewInputV1): TavernCalculationContextV1 => {
    const active = input.basis === "active_opening_baseline";
    const modeId = active ? input.session.baseline.mode : input.plan.mode;
    const mode = modeById.get(modeId);
    if (mode === undefined) throw new TypeError(`unknown Tavern ServiceMode: ${modeId}`);
    const context = deepFreezePocValueV1({
      plan: input.plan,
      mode,
      preparationActionCount: active
        ? input.session.baseline.preparationActionCount
        : input.preparationActionCount,
      demand: active ? input.session.baseline.demand : input.demand,
      baselineModifiers: active ? input.session.baseline.modifiers : input.modifiers,
      sessionModifiers: active ? input.session.sessionModifiers : [],
    });
    validateUniqueCalculationInputsV1(context, data);
    return context;
  };

  const preview = (inputValue: DeepReadonly<TavernPreviewInputV1>): TavernPreviewV1 => {
    const input = parsePreviewInputV1(inputValue);
    const context = contextForInputV1(input);
    const active = input.basis === "active_opening_baseline";
    const prospectiveCash = cashCostV1(data, context.mode, context.baselineModifiers);
    let openingCash = prospectiveCash;
    let shortages: readonly IngredientQuantityV1[] = [];
    let rejectionCodes: TavernPreviewV1["rejectionCodes"] = [];
    let ap = context.mode.apCost;
    let playerStamina = context.mode.playerStaminaCost;
    let heroineStamina = context.mode.heroineStaminaCost;
    if (active) {
      const baseline = input.session.baseline;
      ap = parseNonNegativeSafeInteger(baseline.ap.before - baseline.ap.after);
      playerStamina = parseNonNegativeSafeInteger(
        baseline.playerStamina.before - baseline.playerStamina.after,
      );
      heroineStamina = parseNonNegativeSafeInteger(
        baseline.heroineStamina.before - baseline.heroineStamina.after,
      );
      const committed = parseMoney(baseline.cashAtStart.before - baseline.cashAtStart.after);
      if (committed !== prospectiveCash.total) {
        throw new TypeError("Opening baseline cash cost does not match resolved Tavern cost");
      }
      openingCash = deepFreezePocValueV1({ ...prospectiveCash, total: committed });
    } else {
      shortages = ingredientShortagesV1(input.plan, input.availableIngredients, recipesById);
      const codes: TavernPreviewV1["rejectionCodes"][number][] = [];
      if (input.resources.apRemaining < ap) codes.push("calendar.insufficient_ap");
      if (input.resources.playerStamina < playerStamina) {
        codes.push("actor.insufficient_stamina");
      }
      if (input.resources.heroineStamina < heroineStamina) {
        codes.push("actor.insufficient_stamina");
      }
      if (input.resources.cash < openingCash.total) codes.push("inventory.insufficient_cash");
      if (shortages.length > 0) codes.push("inventory.insufficient_ingredient");
      rejectionCodes = codes;
    }
    const vectors = enumerateDemandVectorsV1(context.demand);
    const menu = [...context.plan.menu].sort((left, right) =>
      compareStableIdV1(left.recipeId, right.recipeId),
    );
    let expectedSales: TavernPreviewV1["expectedSales"];
    let finalizeRange: { readonly min: SafeInteger; readonly max: SafeInteger };
    const capacities = calculateCapacitiesV1(context);
    if (vectors === null) {
      expectedSales = menu.map(({ recipeId, portions }) => ({
        recipeId,
        range: { min: parseSafeInteger(0), max: parseSafeInteger(portions) },
      }));
      const maximumRevenue = safeSumV1(
        menu.map(({ recipeId, portions }) => {
          const recipe = recipesById.get(recipeId);
          if (recipe === undefined) throw new TypeError(`unknown Tavern RecipeId: ${recipeId}`);
          return multiplySafeV1(portions, recipe.salePrice, "Tavern preview maximum revenue");
        }),
        "Tavern preview maximum revenue",
      );
      finalizeRange = { min: parseSafeInteger(0), max: maximumRevenue };
    } else {
      const results = vectors.map((vector) => runTavernPipelineV1(context, vector, recipesById));
      expectedSales = menu.map(({ recipeId }) => {
        const totals = results.map((result) =>
          safeSumV1(
            result.orders
              .filter((line) => line.recipeId === recipeId)
              .map(({ actualSales }) => actualSales),
            "Tavern preview recipe sales",
          ),
        );
        return {
          recipeId,
          range: {
            min: parseSafeInteger(Math.min(...totals)),
            max: parseSafeInteger(Math.max(...totals)),
          },
        };
      });
      const revenues = results.map(({ revenue }) => revenue);
      finalizeRange = {
        min: parseSafeInteger(Math.min(...revenues)),
        max: parseSafeInteger(Math.max(...revenues)),
      };
    }
    const startCost = active ? 0 : openingCash.total;
    return deepFreezePocValueV1({
      basis: input.basis,
      allowed: active || rejectionCodes.length === 0,
      rejectionCodes,
      openingCosts: {
        commitment: active ? "committed" : "prospective",
        modeReasonId: context.mode.reasonId,
        ap,
        playerStamina,
        heroineStamina,
        cash: openingCash,
        ingredientShortages: shortages,
      },
      receptionCapacity: capacities.reception,
      preparationCapacity: capacities.preparation,
      expectedSales,
      cashDelta: {
        min: parseSafeInteger(finalizeRange.min - startCost),
        max: parseSafeInteger(finalizeRange.max - startCost),
      },
    });
  };

  const settle = (
    inputValue: DeepReadonly<TavernSettlementInputV1>,
    _rng: RuleRngV1,
  ): SettlementDraftV1 => {
    const { session } = parseSettlementInputV1(inputValue);
    const previewInput = deepFreezePocValueV1({
      basis: "active_opening_baseline" as const,
      plan: { mode: session.baseline.mode, menu: session.baseline.menu },
      session,
    });
    const context = contextForInputV1(parsePreviewInputV1(previewInput));
    const pipeline = runTavernPipelineV1(
      context,
      demandVectorV1(context.demand, ({ actualCustomers }) => actualCustomers),
      recipesById,
    );
    const salesByRecipe = new Map<RecipeId, bigint>();
    for (const line of pipeline.orders) {
      salesByRecipe.set(
        line.recipeId,
        (salesByRecipe.get(line.recipeId) ?? 0n) + BigInt(line.actualSales),
      );
    }
    const menu = [...context.plan.menu].sort((left, right) =>
      compareStableIdV1(left.recipeId, right.recipeId),
    );
    const discardedPortions = menu.flatMap(({ recipeId, portions }) => {
      const discarded = BigInt(portions) - (salesByRecipe.get(recipeId) ?? 0n);
      return discarded > 0n ? [{ recipeId, portions: parseQuantity(Number(discarded)) }] : [];
    });
    const consequences = settlementConsequencesV1(
      data,
      context,
      session,
      pipeline.orders,
      discardedPortions,
      recipesById,
      ingredientUnitPrices,
    );
    return deepFreezePocValueV1({
      orders: pipeline.orders,
      receptionCapacity: pipeline.receptionCapacity,
      preparationCapacity: pipeline.preparationCapacity,
      discardedPortions,
      ...consequences,
    });
  };

  return deepFreezePocValueV1({ preview, settle });
}

export function assertPocTavernPreviewOutputV1(
  dataValue: DeepReadonly<PocSimulationDataV1>,
  input: DeepReadonly<TavernPreviewInputV1>,
  output: DeepReadonly<TavernPreviewV1>,
): void {
  const expected = createPocTavernSettlementResolverV1(dataValue).preview(input);
  const authorityFields = (value: DeepReadonly<TavernPreviewV1>) => ({
    basis: value.basis,
    allowed: value.allowed,
    rejectionCodes: value.rejectionCodes,
    openingCosts: value.openingCosts,
    receptionCapacity: value.receptionCapacity,
    preparationCapacity: value.preparationCapacity,
  });
  if (!canonicalValuesEqualV1(authorityFields(output), authorityFields(expected))) {
    throw new TypeError("Tavern preview costs or resource result violate the resolved inputs");
  }
}

export function assertPocTavernSettlementOutputV1(
  dataValue: DeepReadonly<PocSimulationDataV1>,
  inputValue: DeepReadonly<TavernSettlementInputV1>,
  output: DeepReadonly<SettlementDraftV1>,
): void {
  const data = pocSimulationDataSchemaV1.parse(dataValue);
  const { session } = parseSettlementInputV1(inputValue);
  const mode = data.balance.serviceModes.find(
    ({ mode: candidateMode }) => candidateMode === session.baseline.mode,
  );
  if (mode === undefined) throw new TypeError("unknown Tavern settlement ServiceMode");
  const context = deepFreezePocValueV1({
    plan: { mode: session.baseline.mode, menu: session.baseline.menu },
    mode,
    preparationActionCount: session.baseline.preparationActionCount,
    demand: session.baseline.demand,
    baselineModifiers: session.baseline.modifiers,
    sessionModifiers: session.sessionModifiers,
  });
  validateUniqueCalculationInputsV1(context, data);
  const capacities = calculateCapacitiesV1(context);
  if (
    output.receptionCapacity !== capacities.reception ||
    output.preparationCapacity !== capacities.preparation
  ) {
    throw new TypeError("Tavern settlement capacities do not match the resolved inputs");
  }
  const recipesById = new Map(data.content.recipes.map((recipe) => [recipe.recipeId, recipe]));
  const ingredientUnitPrices = new Map(
    data.content.ingredients.map(({ ingredientId, unitPrice }) => [ingredientId, unitPrice]),
  );
  const expected = settlementConsequencesV1(
    data,
    context,
    session,
    output.orders,
    output.discardedPortions,
    recipesById,
    ingredientUnitPrices,
  );
  if (
    !canonicalValuesEqualV1(output.appliedModifiers, expected.appliedModifiers) ||
    !canonicalValuesEqualV1(output.effects, expected.effects) ||
    !canonicalValuesEqualV1(output.entries, expected.entries)
  ) {
    throw new TypeError("Tavern settlement provenance or accounting is inconsistent");
  }
}
