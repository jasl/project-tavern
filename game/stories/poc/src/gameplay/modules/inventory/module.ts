// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { DeepReadonly, ModuleOwnerCapabilityV1 } from "@sillymaker/base";

import { definePocGameplayModuleV1 } from "../../contracts/define-poc-gameplay-module.js";
import { parseBatchId, parseLedgerEntryId } from "../../contracts/ids.js";
import type {
  BatchId,
  IngredientId,
  ItemId,
  LedgerEntryId,
  ReasonId,
} from "../../contracts/ids.js";
import { descriptorForPocModuleV1 } from "../../contracts/module-catalog.js";
import type {
  BatchConsumptionV1,
  ChangeReasonV1,
  IngredientQuantityV1,
  InventoryBatchV1,
  InventorySourceRefV1,
  InventoryStateV1,
  ItemQuantityV1,
  ItemStackV1,
  LedgerCategoryV1,
  LedgerEntryDraftV1,
  LedgerEntryV1,
  LedgerReasonBindingsV1,
  LedgerSubjectV1,
  PocGameBootstrapInputV1,
  PocRejectionReasonV1,
  PurchaseLineV1,
} from "../../contracts/types.js";
import {
  deepFreezePocValueV1,
  parseAbsoluteDayIndex,
  parseMoney,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseQuantity,
  parseSafeInteger,
} from "../../contracts/values.js";
import type { Money, NonNegativeSafeInteger, SafeInteger } from "../../contracts/values.js";
import {
  assertValidInitialPocInventoryStateV1,
  comparePocInventoryFifoBatchesV1,
  pocInventoryDependencyPortsSchemaV1,
  pocInventoryInvariantV1,
  pocInventoryOwnerOperationSchemaV1,
  pocInventoryOwnerProposalSchemaV1,
  pocInventoryStateSchemaV1,
  pocInventoryStatesEqualV1,
  sortPocInventoryBatchesV1,
  sortPocInventoryItemStacksV1,
} from "./contract.js";
import type {
  PocInventoryDependencyPortsV1,
  PocInventoryGameplayFactV1,
  PocInventoryIngredientPortV1,
  PocInventoryOwnerOperationV1,
  PocInventoryOwnerProposalV1,
  PocInventoryReadPortV1,
  PocInventoryShelfLifeExtensionV1,
} from "./contract.js";

type PocInventoryProposalResultV1 =
  | { readonly kind: "proposed"; readonly proposal: PocInventoryOwnerProposalV1 }
  | { readonly kind: "rejected"; readonly rejection: PocRejectionReasonV1 };

type PocInventoryDomainRejectionV1 = Extract<
  PocRejectionReasonV1,
  {
    readonly code:
      | "inventory.invalid_quantity"
      | "inventory.duplicate_line"
      | "inventory.line_limit_exceeded"
      | "inventory.insufficient_cash"
      | "inventory.insufficient_ingredient";
  }
>;

type PocInventoryPurchaseDependenciesV1 = Extract<
  PocInventoryDependencyPortsV1,
  { readonly kind: "inventory.purchase" }
>;
type PocInventoryGrantDependenciesV1 = Extract<
  PocInventoryDependencyPortsV1,
  { readonly kind: "inventory.grant" }
>;
type PocInventorySpoilDependenciesV1 = Extract<
  PocInventoryDependencyPortsV1,
  { readonly kind: "inventory.spoil" }
>;
type PocInventoryLedgerDependenciesV1 = Extract<
  PocInventoryDependencyPortsV1,
  { readonly kind: "inventory.ledger.append" }
>;
type PocInventoryDebugCashDependenciesV1 = Extract<
  PocInventoryDependencyPortsV1,
  { readonly kind: "inventory.debug.adjust_cash" }
>;

function rejectedInventoryChangeV1(
  rejection: PocInventoryDomainRejectionV1,
): PocInventoryProposalResultV1 {
  return deepFreezePocValueV1({ kind: "rejected", rejection });
}

function proposedInventoryChangeV1(
  kind: PocInventoryOwnerOperationV1["kind"],
  before: InventoryStateV1,
  after: InventoryStateV1,
  facts: readonly PocInventoryGameplayFactV1[],
): PocInventoryProposalResultV1 {
  assertValidInventoryStateV1(after, "Inventory proposal");
  return deepFreezePocValueV1({
    kind: "proposed",
    proposal: pocInventoryOwnerProposalSchemaV1.parse({
      payload: { kind, before, after },
      facts,
    }),
  });
}

function assertValidInventoryStateV1(state: InventoryStateV1, label: string): void {
  const violations = pocInventoryInvariantV1.check(state, createPocInventoryReadPortV1(state));
  if (violations.length !== 0) {
    throw new TypeError(`${label} violates Inventory cash, ledger, or collection invariants`);
  }
}

function checkedAddV1(left: number, right: number, label: string): SafeInteger {
  if (
    !Number.isSafeInteger(left) ||
    !Number.isSafeInteger(right) ||
    (right > 0 && left > Number.MAX_SAFE_INTEGER - right) ||
    (right < 0 && left < Number.MIN_SAFE_INTEGER - right)
  ) {
    throw new TypeError(`${label} exceeds safe integer bounds`);
  }
  return parseSafeInteger(left + right);
}

function checkedNonNegativeProductV1(left: number, right: number, label: string): SafeInteger {
  if (
    !Number.isSafeInteger(left) ||
    !Number.isSafeInteger(right) ||
    left < 0 ||
    right < 0 ||
    (left !== 0 && right > Math.floor(Number.MAX_SAFE_INTEGER / left))
  ) {
    throw new TypeError(`${label} exceeds safe integer bounds`);
  }
  return parseSafeInteger(left * right);
}

function checkedCursorIndexV1(
  cursor: NonNegativeSafeInteger,
  offset: number,
  label: string,
): number {
  return checkedAddV1(cursor, offset, label);
}

function createBatchIdV1(
  commandSequence: number,
  cursor: NonNegativeSafeInteger,
  offset: number,
): BatchId {
  const index = checkedCursorIndexV1(cursor, offset, "Inventory batch cursor");
  return parseBatchId(`batch:${commandSequence}:${index}`);
}

function createLedgerEntryIdV1(
  commandSequence: number,
  cursor: NonNegativeSafeInteger,
  offset: number,
): LedgerEntryId {
  const index = checkedCursorIndexV1(cursor, offset, "Inventory ledger cursor");
  return parseLedgerEntryId(`ledger:${commandSequence}:${index}`);
}

function sortBatchesByIdV1(batches: readonly InventoryBatchV1[]): readonly InventoryBatchV1[] {
  return sortPocInventoryBatchesV1(batches);
}

function sortItemStacksV1(stacks: readonly ItemStackV1[]): readonly ItemStackV1[] {
  return sortPocInventoryItemStacksV1(stacks);
}

function sortBatchesForFifoV1(batches: readonly InventoryBatchV1[]): readonly InventoryBatchV1[] {
  return [...batches].sort(comparePocInventoryFifoBatchesV1);
}

function ingredientDefinitionV1(
  ingredients: readonly PocInventoryIngredientPortV1[],
  ingredientId: IngredientId,
): PocInventoryIngredientPortV1 {
  const definition = ingredients.find((candidate) => candidate.ingredientId === ingredientId);
  if (definition === undefined) {
    throw new TypeError(`Inventory dependency is missing ingredient ${ingredientId}`);
  }
  return definition;
}

function shelfLifeExtensionV1(
  extensions: readonly PocInventoryShelfLifeExtensionV1[],
  ingredient: PocInventoryIngredientPortV1,
): PocInventoryShelfLifeExtensionV1 | null {
  const matching = extensions.filter(
    (extension) => extension.ingredientId === ingredient.ingredientId,
  );
  if (matching.length > 1) {
    throw new TypeError(
      `Inventory has duplicate shelf-life extensions for ${ingredient.ingredientId}`,
    );
  }
  if (matching.length === 0) return null;
  if (!ingredient.refrigeratable) {
    throw new TypeError(`Inventory shelf-life extension targets non-refrigeratable ingredient`);
  }
  return matching[0] ?? null;
}

function validateExtensionDefinitionsV1(
  ingredients: readonly PocInventoryIngredientPortV1[],
  extensions: readonly PocInventoryShelfLifeExtensionV1[],
): void {
  const seen = new Set<IngredientId>();
  for (const extension of extensions) {
    if (seen.has(extension.ingredientId)) {
      throw new TypeError(`Inventory has duplicate shelf-life extension ingredient`);
    }
    seen.add(extension.ingredientId);
    const ingredient = ingredientDefinitionV1(ingredients, extension.ingredientId);
    if (!ingredient.refrigeratable) {
      throw new TypeError(`Inventory shelf-life extension targets non-refrigeratable ingredient`);
    }
  }
}

function lastUsableDayV1(
  acquiredDay: number,
  ingredient: PocInventoryIngredientPortV1,
  extension: PocInventoryShelfLifeExtensionV1 | null,
): ReturnType<typeof parseAbsoluteDayIndex> {
  const baseOffset = ingredient.shelfLifeDays - 1;
  const baseLastDay = checkedAddV1(acquiredDay, baseOffset, "Inventory shelf life");
  const extendedLastDay =
    extension === null
      ? baseLastDay
      : checkedAddV1(baseLastDay, extension.days, "Inventory extended shelf life");
  return parseAbsoluteDayIndex(extendedLastDay);
}

function validateIngredientLinesV1(
  lines: readonly IngredientQuantityV1[] | readonly PurchaseLineV1[],
): PocInventoryDomainRejectionV1 | null {
  const seen = new Set<IngredientId>();
  for (const line of lines) {
    if (line.quantity <= 0) {
      return {
        code: "inventory.invalid_quantity",
        details: { ingredientId: line.ingredientId, quantity: parseSafeInteger(line.quantity) },
      };
    }
    if (seen.has(line.ingredientId)) {
      return {
        code: "inventory.duplicate_line",
        details: { ingredientId: line.ingredientId },
      };
    }
    seen.add(line.ingredientId);
  }
  return null;
}

function validateItemLinesV1(lines: readonly ItemQuantityV1[]): void {
  const seen = new Set<ItemId>();
  for (const line of lines) {
    if (seen.has(line.itemId)) throw new TypeError(`duplicate Inventory item line`);
    seen.add(line.itemId);
  }
}

function assertFreshIdentifiersV1(
  state: InventoryStateV1,
  batchIds: readonly BatchId[],
  entryIds: readonly LedgerEntryId[],
): void {
  const existingBatchIds = new Set(state.ingredientBatches.map(({ batchId }) => batchId));
  const existingEntryIds = new Set(state.ledger.map(({ entryId }) => entryId));
  for (const batchId of batchIds) {
    if (existingBatchIds.has(batchId)) throw new TypeError(`duplicate Inventory BatchId`);
    existingBatchIds.add(batchId);
  }
  for (const entryId of entryIds) {
    if (existingEntryIds.has(entryId)) throw new TypeError(`duplicate Inventory LedgerEntryId`);
    existingEntryIds.add(entryId);
  }
}

function cashRejectionV1(required: number, available: Money): PocInventoryProposalResultV1 {
  return rejectedInventoryChangeV1({
    code: "inventory.insufficient_cash",
    details: { required: parseMoney(required), available },
  });
}

function materializeLedgerEntryV1(
  draft: LedgerEntryDraftV1,
  entryId: LedgerEntryId,
): LedgerEntryV1 {
  return {
    entryId,
    category: draft.category,
    reasonId: draft.reasonId,
    cashDelta: draft.cashDelta,
    valuationDelta: draft.valuationDelta,
    subject: draft.subject,
    ...(draft.quantity === undefined ? {} : { quantity: draft.quantity }),
  };
}

function proposePurchaseV1(
  state: InventoryStateV1,
  operation: Extract<PocInventoryOwnerOperationV1, { readonly kind: "inventory.purchase" }>,
  dependencies: PocInventoryPurchaseDependenciesV1,
): PocInventoryProposalResultV1 {
  const lineRejection = validateIngredientLinesV1(operation.lines);
  if (lineRejection !== null) return rejectedInventoryChangeV1(lineRejection);
  if (operation.lines.length > dependencies.purchaseLineLimit) {
    return rejectedInventoryChangeV1({
      code: "inventory.line_limit_exceeded",
      details: {
        actual: parsePositiveSafeInteger(operation.lines.length),
        limit: dependencies.purchaseLineLimit,
      },
    });
  }
  if (operation.reasonId !== dependencies.purchaseReasonId) {
    throw new TypeError("Inventory purchase reason does not match authored binding");
  }
  validateExtensionDefinitionsV1(dependencies.ingredients, dependencies.shelfLifeExtensions);

  const batches: InventoryBatchV1[] = [];
  const entries: LedgerEntryV1[] = [];
  let total = parseSafeInteger(0);
  for (let index = 0; index < operation.lines.length; index += 1) {
    const line = operation.lines[index];
    if (line === undefined) throw new TypeError("missing Inventory purchase line");
    const ingredient = ingredientDefinitionV1(dependencies.ingredients, line.ingredientId);
    const extension = shelfLifeExtensionV1(dependencies.shelfLifeExtensions, ingredient);
    const value = checkedNonNegativeProductV1(
      ingredient.unitPrice,
      line.quantity,
      "Inventory purchase value",
    );
    total = checkedAddV1(total, value, "Inventory purchase total");
    const batchId = createBatchIdV1(
      dependencies.commandSequence,
      dependencies.nextBatchIndex,
      index,
    );
    const entryId = createLedgerEntryIdV1(
      dependencies.commandSequence,
      dependencies.nextLedgerEntryIndex,
      index,
    );
    batches.push({
      batchId,
      ingredientId: line.ingredientId,
      quantity: line.quantity,
      acquiredDay: dependencies.day,
      lastUsableDay: lastUsableDayV1(dependencies.day, ingredient, extension),
      refrigerationExtended: extension !== null,
      source: { kind: "purchase", commandSequence: dependencies.commandSequence },
    });
    entries.push({
      entryId,
      category: "purchase",
      reasonId: operation.reasonId,
      cashDelta: parseSafeInteger(0 - value),
      valuationDelta: value,
      subject: { kind: "ingredient", ingredientId: line.ingredientId },
      quantity: line.quantity,
    });
  }
  if (total > state.cash) return cashRejectionV1(total, state.cash);
  const cash = parseMoney(state.cash - total);
  const batchIds = batches.map(({ batchId }) => batchId);
  const entryIds = entries.map(({ entryId }) => entryId);
  assertFreshIdentifiersV1(state, batchIds, entryIds);
  const after = pocInventoryStateSchemaV1.parse({
    ...state,
    cash,
    ingredientBatches: sortBatchesByIdV1([...state.ingredientBatches, ...batches]),
    ledger: [...state.ledger, ...entries],
  });
  const reason: ChangeReasonV1 = {
    kind: "command",
    commandKind: "inventory.buy",
    reasonId: operation.reasonId,
  };
  return proposedInventoryChangeV1(operation.kind, state, after, [
    { kind: "inventory.purchased", lines: operation.lines, createdBatchIds: batchIds, entries },
    {
      kind: "cash.changed",
      value: { before: state.cash, after: cash },
      delta: parseSafeInteger(0 - total),
      entryIds,
      reason,
    },
  ]);
}

function availableIngredientQuantityV1(
  batches: readonly InventoryBatchV1[],
  ingredientId: IngredientId,
): NonNegativeSafeInteger {
  let available = 0;
  for (const batch of batches) {
    if (batch.ingredientId !== ingredientId) continue;
    if (available > Number.MAX_SAFE_INTEGER - batch.quantity) {
      return parseNonNegativeSafeInteger(Number.MAX_SAFE_INTEGER);
    }
    available += batch.quantity;
  }
  return parseNonNegativeSafeInteger(available);
}

function proposeConsumeV1(
  state: InventoryStateV1,
  operation: Extract<PocInventoryOwnerOperationV1, { readonly kind: "inventory.consume" }>,
): PocInventoryProposalResultV1 {
  const lineRejection = validateIngredientLinesV1(operation.lines);
  if (lineRejection !== null) return rejectedInventoryChangeV1(lineRejection);
  for (const line of operation.lines) {
    const available = availableIngredientQuantityV1(state.ingredientBatches, line.ingredientId);
    if (available < line.quantity) {
      return rejectedInventoryChangeV1({
        code: "inventory.insufficient_ingredient",
        details: {
          ingredientId: line.ingredientId,
          required: line.quantity,
          available,
        },
      });
    }
  }

  const remainingByBatch = new Map(
    state.ingredientBatches.map((batch) => [batch.batchId, batch.quantity] as const),
  );
  const consumed: Array<{
    readonly batchId: BatchId;
    readonly ingredientId: IngredientId;
    readonly quantity: ReturnType<typeof parseQuantity>;
  }> = [];
  for (const line of operation.lines) {
    let remaining = line.quantity as number;
    const candidates = sortBatchesForFifoV1(
      state.ingredientBatches.filter((batch) => batch.ingredientId === line.ingredientId),
    );
    for (const batch of candidates) {
      if (remaining === 0) break;
      const current = remainingByBatch.get(batch.batchId);
      if (current === undefined) throw new TypeError("missing Inventory batch quantity");
      const quantity = Math.min(current, remaining);
      if (quantity === 0) continue;
      consumed.push({
        batchId: batch.batchId,
        ingredientId: batch.ingredientId,
        quantity: parseQuantity(quantity),
      });
      const next = current - quantity;
      remainingByBatch.set(batch.batchId, next as ReturnType<typeof parseQuantity>);
      remaining -= quantity;
    }
    if (remaining !== 0) throw new TypeError("Inventory consume preflight diverged");
  }
  const ingredientBatches = state.ingredientBatches.flatMap((batch) => {
    const quantity = remainingByBatch.get(batch.batchId);
    if (quantity === undefined) throw new TypeError("missing Inventory batch quantity");
    return quantity === 0 ? [] : [{ ...batch, quantity: parseQuantity(quantity) }];
  });
  const after = pocInventoryStateSchemaV1.parse({
    ...state,
    ingredientBatches: sortBatchesByIdV1(ingredientBatches),
  });
  return proposedInventoryChangeV1(operation.kind, state, after, [
    { kind: "inventory.consumed", lines: consumed, reason: operation.reason },
  ]);
}

function assertGrantSourceMatchesReasonV1(
  source: InventorySourceRefV1,
  reason: ChangeReasonV1,
): Exclude<InventorySourceRefV1, { readonly kind: "initial" | "purchase" }> {
  if (source.kind === "initial" || source.kind === "purchase") {
    throw new TypeError("Inventory grant cannot use initial or purchase provenance");
  }
  const matches =
    (source.kind === "story_action" &&
      reason.kind === "story_action" &&
      source.actionId === reason.actionId) ||
    (source.kind === "world_action" &&
      reason.kind === "world_action" &&
      source.actionId === reason.actionId) ||
    (source.kind === "story_event" &&
      reason.kind === "event" &&
      source.eventId === reason.eventId) ||
    (source.kind === "debug" && reason.kind === "debug" && source.reasonId === reason.reasonId);
  if (!matches) throw new TypeError("Inventory grant source does not match change reason");
  return source;
}

function grantSubjectV1(
  source: Exclude<InventorySourceRefV1, { readonly kind: "initial" | "purchase" }>,
): LedgerSubjectV1 {
  if (source.kind === "story_action" || source.kind === "world_action") {
    return { kind: "action", actionId: source.actionId };
  }
  if (source.kind === "story_event") return { kind: "event", eventId: source.eventId };
  return { kind: "debug" };
}

function proposeGrantV1(
  state: InventoryStateV1,
  operation: Extract<PocInventoryOwnerOperationV1, { readonly kind: "inventory.grant" }>,
  dependencies: PocInventoryGrantDependenciesV1,
): PocInventoryProposalResultV1 {
  const lineRejection = validateIngredientLinesV1(operation.lines);
  if (lineRejection !== null) return rejectedInventoryChangeV1(lineRejection);
  const source = assertGrantSourceMatchesReasonV1(operation.source, operation.reason);
  validateExtensionDefinitionsV1(dependencies.ingredients, dependencies.shelfLifeExtensions);
  const batches: InventoryBatchV1[] = [];
  const entries: LedgerEntryV1[] = [];
  let totalValuation = parseSafeInteger(0);
  for (let index = 0; index < operation.lines.length; index += 1) {
    const line = operation.lines[index];
    if (line === undefined) throw new TypeError("missing Inventory grant line");
    const ingredient = ingredientDefinitionV1(dependencies.ingredients, line.ingredientId);
    const extension = shelfLifeExtensionV1(dependencies.shelfLifeExtensions, ingredient);
    const valuation = checkedNonNegativeProductV1(
      ingredient.unitPrice,
      line.quantity,
      "Inventory grant valuation",
    );
    if (valuation === 0) throw new TypeError("Inventory grant valuation must be positive");
    totalValuation = checkedAddV1(totalValuation, valuation, "Inventory grant total valuation");
    const batchId = createBatchIdV1(
      dependencies.commandSequence,
      dependencies.nextBatchIndex,
      index,
    );
    const entryId = createLedgerEntryIdV1(
      dependencies.commandSequence,
      dependencies.nextLedgerEntryIndex,
      index,
    );
    batches.push({
      batchId,
      ingredientId: line.ingredientId,
      quantity: line.quantity,
      acquiredDay: dependencies.day,
      lastUsableDay: lastUsableDayV1(dependencies.day, ingredient, extension),
      refrigerationExtended: extension !== null,
      source,
    });
    entries.push({
      entryId,
      category: "story_reward",
      reasonId: operation.reason.reasonId,
      cashDelta: parseSafeInteger(0),
      valuationDelta: valuation,
      subject: grantSubjectV1(source),
      quantity: line.quantity,
    });
  }
  const batchIds = batches.map(({ batchId }) => batchId);
  const entryIds = entries.map(({ entryId }) => entryId);
  assertFreshIdentifiersV1(state, batchIds, entryIds);
  const after = pocInventoryStateSchemaV1.parse({
    ...state,
    ingredientBatches: sortBatchesByIdV1([...state.ingredientBatches, ...batches]),
    ledger: [...state.ledger, ...entries],
  });
  return proposedInventoryChangeV1(operation.kind, state, after, [
    {
      kind: "inventory.ingredient_granted",
      lines: operation.lines,
      createdBatchIds: batchIds,
      entries,
      reason: operation.reason,
    },
  ]);
}

function proposeItemGrantV1(
  state: InventoryStateV1,
  operation: Extract<PocInventoryOwnerOperationV1, { readonly kind: "inventory.item.grant" }>,
): PocInventoryProposalResultV1 {
  validateItemLinesV1(operation.lines);
  const quantities = new Map<ItemId, number>(
    state.itemStacks.map((stack) => [stack.itemId, stack.quantity]),
  );
  for (const line of operation.lines) {
    const current = quantities.get(line.itemId) ?? 0;
    quantities.set(
      line.itemId,
      checkedAddV1(current, line.quantity, "Inventory item grant quantity"),
    );
  }
  const itemStacks = sortItemStacksV1(
    [...quantities].map(([itemId, quantity]) => ({ itemId, quantity: parseQuantity(quantity) })),
  );
  const after = pocInventoryStateSchemaV1.parse({ ...state, itemStacks });
  return proposedInventoryChangeV1(operation.kind, state, after, [
    { kind: "inventory.item_granted", lines: operation.lines, reason: operation.reason },
  ]);
}

function proposeItemConsumeV1(
  state: InventoryStateV1,
  operation: Extract<PocInventoryOwnerOperationV1, { readonly kind: "inventory.item.consume" }>,
): PocInventoryProposalResultV1 {
  validateItemLinesV1(operation.lines);
  const quantities = new Map<ItemId, number>(
    state.itemStacks.map((stack) => [stack.itemId, stack.quantity]),
  );
  for (const line of operation.lines) {
    const current = quantities.get(line.itemId) ?? 0;
    if (current < line.quantity) throw new TypeError(`insufficient Inventory item quantity`);
  }
  for (const line of operation.lines) {
    const current = quantities.get(line.itemId);
    if (current === undefined) throw new TypeError("missing Inventory item quantity");
    const next = current - line.quantity;
    if (next === 0) quantities.delete(line.itemId);
    else quantities.set(line.itemId, next);
  }
  const itemStacks = sortItemStacksV1(
    [...quantities].map(([itemId, quantity]) => ({ itemId, quantity: parseQuantity(quantity) })),
  );
  const after = pocInventoryStateSchemaV1.parse({ ...state, itemStacks });
  return proposedInventoryChangeV1(operation.kind, state, after, [
    { kind: "inventory.item_consumed", lines: operation.lines, reason: operation.reason },
  ]);
}

function proposeSpoilV1(
  state: InventoryStateV1,
  operation: Extract<PocInventoryOwnerOperationV1, { readonly kind: "inventory.spoil" }>,
  dependencies: PocInventorySpoilDependenciesV1,
): PocInventoryProposalResultV1 {
  if (operation.reason.reasonId !== dependencies.spoiledIngredientReasonId) {
    throw new TypeError("Inventory spoil reason does not match authored binding");
  }
  const spoiled = sortBatchesForFifoV1(
    state.ingredientBatches.filter((batch) => operation.day >= batch.lastUsableDay),
  );
  const entries: LedgerEntryV1[] = [];
  const lines: BatchConsumptionV1[] = [];
  let totalValuation = parseSafeInteger(0);
  for (let index = 0; index < spoiled.length; index += 1) {
    const batch = spoiled[index];
    if (batch === undefined) throw new TypeError("missing spoiled Inventory batch");
    const ingredient = ingredientDefinitionV1(dependencies.ingredients, batch.ingredientId);
    const valuation = checkedNonNegativeProductV1(
      ingredient.unitPrice,
      batch.quantity,
      "Inventory spoil valuation",
    );
    if (valuation === 0) throw new TypeError("Inventory spoil valuation must be nonzero");
    totalValuation = checkedAddV1(totalValuation, valuation, "Inventory spoil total valuation");
    entries.push({
      entryId: createLedgerEntryIdV1(
        dependencies.commandSequence,
        dependencies.nextLedgerEntryIndex,
        index,
      ),
      category: "spoiled_ingredient",
      reasonId: operation.reason.reasonId,
      cashDelta: parseSafeInteger(0),
      valuationDelta: parseSafeInteger(0 - valuation),
      subject: { kind: "ingredient", ingredientId: batch.ingredientId },
      quantity: batch.quantity,
    });
    lines.push({
      batchId: batch.batchId,
      ingredientId: batch.ingredientId,
      quantity: batch.quantity,
    });
  }
  const entryIds = entries.map(({ entryId }) => entryId);
  assertFreshIdentifiersV1(state, [], entryIds);
  const spoiledIds = new Set(spoiled.map(({ batchId }) => batchId));
  const after = pocInventoryStateSchemaV1.parse({
    ...state,
    ingredientBatches: sortBatchesByIdV1(
      state.ingredientBatches.filter((batch) => !spoiledIds.has(batch.batchId)),
    ),
    ledger: [...state.ledger, ...entries],
  });
  const facts: readonly PocInventoryGameplayFactV1[] =
    spoiled.length === 0
      ? []
      : [{ kind: "inventory.spoiled", lines, entries } as PocInventoryGameplayFactV1];
  return proposedInventoryChangeV1(operation.kind, state, after, facts);
}

function ledgerReasonForCategoryV1(
  category: LedgerCategoryV1,
  reasons: LedgerReasonBindingsV1,
): ReasonId | null {
  if (category === "purchase") return reasons.purchase;
  if (category === "wage") return reasons.serviceWage;
  if (category === "opening_fee") return reasons.openingFee;
  if (category === "revenue") return reasons.revenue;
  if (category === "discarded_food") return reasons.discardedFood;
  if (category === "spoiled_ingredient") return reasons.spoiledIngredient;
  if (category === "facility") return reasons.facilityBuild;
  if (category === "world_action") return reasons.worldActionCost;
  if (category === "levy") return reasons.levy;
  return null;
}

function throwInvalidDirectLedgerEntryV1(category: LedgerCategoryV1, detail: string): never {
  throw new TypeError(`Inventory ${category} ledger entry ${detail}`);
}

function assertCommandLedgerReasonV1(
  category: LedgerCategoryV1,
  reason: ChangeReasonV1,
  commandKind: Extract<ChangeReasonV1, { readonly kind: "command" }>["commandKind"],
): void {
  if (reason.kind !== "command" || reason.commandKind !== commandKind) {
    throwInvalidDirectLedgerEntryV1(category, `requires ${commandKind} command provenance`);
  }
}

function assertServiceModeCostEntryV1(entry: LedgerEntryDraftV1, reason: ChangeReasonV1): void {
  assertCommandLedgerReasonV1(entry.category, reason, "tavern.opening.start");
  if (
    entry.subject.kind !== "service_mode" ||
    entry.cashDelta > 0 ||
    entry.valuationDelta !== 0 ||
    entry.quantity !== undefined
  ) {
    throwInvalidDirectLedgerEntryV1(
      entry.category,
      "requires a service-mode subject, non-positive cash, zero valuation, and no quantity",
    );
  }
}

function assertRevenueEntryV1(entry: LedgerEntryDraftV1, reason: ChangeReasonV1): void {
  assertCommandLedgerReasonV1(entry.category, reason, "tavern.opening.finalize");
  if (
    entry.subject.kind !== "recipe" ||
    entry.cashDelta < 0 ||
    entry.valuationDelta > 0 ||
    entry.quantity === undefined
  ) {
    throwInvalidDirectLedgerEntryV1(
      entry.category,
      "requires a recipe subject, non-negative cash, non-positive valuation, and quantity",
    );
  }
}

function assertDiscardedFoodEntryV1(entry: LedgerEntryDraftV1, reason: ChangeReasonV1): void {
  assertCommandLedgerReasonV1(entry.category, reason, "tavern.opening.finalize");
  if (
    entry.subject.kind !== "recipe" ||
    entry.cashDelta !== 0 ||
    entry.valuationDelta >= 0 ||
    entry.quantity === undefined
  ) {
    throwInvalidDirectLedgerEntryV1(
      entry.category,
      "requires a recipe subject, zero cash, negative valuation, and quantity",
    );
  }
}

function assertWorldActionEntryV1(entry: LedgerEntryDraftV1, reason: ChangeReasonV1): void {
  if (
    reason.kind !== "world_action" ||
    entry.subject.kind !== "action" ||
    entry.subject.actionId !== reason.actionId ||
    entry.cashDelta > 0 ||
    entry.valuationDelta !== 0 ||
    entry.quantity !== undefined
  ) {
    throwInvalidDirectLedgerEntryV1(
      entry.category,
      "requires its exact WorldAction subject, non-positive cash, zero valuation, and no quantity",
    );
  }
}

function assertLevyEntryV1(entry: LedgerEntryDraftV1, reason: ChangeReasonV1): void {
  assertCommandLedgerReasonV1(entry.category, reason, "levy.pay");
  if (
    entry.subject.kind !== "levy" ||
    entry.cashDelta > 0 ||
    entry.valuationDelta !== 0 ||
    entry.quantity !== undefined
  ) {
    throwInvalidDirectLedgerEntryV1(
      entry.category,
      "requires a levy subject, non-positive cash, zero valuation, and no quantity",
    );
  }
}

function storyLedgerSubjectMatchesReasonV1(
  subject: LedgerSubjectV1,
  reason: ChangeReasonV1,
): boolean {
  if (reason.kind === "story_action" || reason.kind === "world_action") {
    return subject.kind === "action" && subject.actionId === reason.actionId;
  }
  if (reason.kind === "event") {
    return subject.kind === "event" && subject.eventId === reason.eventId;
  }
  return false;
}

function assertStoryLedgerEntryV1(entry: LedgerEntryDraftV1, reason: ChangeReasonV1): void {
  const cashSignMatches =
    entry.category === "story_cost" ? entry.cashDelta <= 0 : entry.cashDelta >= 0;
  if (
    !storyLedgerSubjectMatchesReasonV1(entry.subject, reason) ||
    !cashSignMatches ||
    entry.valuationDelta !== 0 ||
    entry.quantity !== undefined
  ) {
    throwInvalidDirectLedgerEntryV1(
      entry.category,
      "requires its exact Story owner subject, aligned cash sign, zero valuation, and no quantity",
    );
  }
}

function assertDirectLedgerEntrySemanticsV1(
  entry: LedgerEntryDraftV1,
  reason: ChangeReasonV1,
): void {
  switch (entry.category) {
    case "purchase":
    case "spoiled_ingredient":
    case "debug_adjustment":
      throwInvalidDirectLedgerEntryV1(entry.category, "requires its dedicated owner operation");
    case "wage":
    case "opening_fee":
      assertServiceModeCostEntryV1(entry, reason);
      return;
    case "revenue":
      assertRevenueEntryV1(entry, reason);
      return;
    case "discarded_food":
      assertDiscardedFoodEntryV1(entry, reason);
      return;
    case "facility":
      return;
    case "world_action":
      assertWorldActionEntryV1(entry, reason);
      return;
    case "levy":
      assertLevyEntryV1(entry, reason);
      return;
    case "story_cost":
    case "story_reward":
      assertStoryLedgerEntryV1(entry, reason);
      return;
  }
  const unreachableCategory: never = entry.category;
  throw new TypeError(`invalid Inventory ledger category ${String(unreachableCategory)}`);
}

function assertFacilityLedgerV1(
  entries: readonly LedgerEntryDraftV1[],
  dependencies: PocInventoryLedgerDependenciesV1,
): asserts dependencies is PocInventoryLedgerDependenciesV1 & {
  readonly context: Extract<
    PocInventoryLedgerDependenciesV1["context"],
    { readonly kind: "accepted_facility_build" }
  >;
} {
  const { context } = dependencies;
  if (context.kind !== "accepted_facility_build") {
    throw new TypeError("Inventory facility ledger requires accepted build context");
  }
  if (
    context.reason.kind !== "facility" ||
    context.reason.facilityId !== context.facilityId ||
    context.reason.reasonId !== dependencies.ledgerReasons.facilityBuild ||
    entries.length !== 1
  ) {
    throw new TypeError("Inventory facility ledger does not match accepted build context");
  }
  const entry = entries[0];
  if (
    entry === undefined ||
    entry.category !== "facility" ||
    entry.reasonId !== context.reason.reasonId ||
    entry.subject.kind !== "facility" ||
    entry.subject.facilityId !== context.facilityId ||
    entry.cashDelta > 0 ||
    entry.valuationDelta !== 0 ||
    entry.quantity !== undefined
  ) {
    throw new TypeError("Inventory facility ledger entry is not exact");
  }
}

function exactAffectedFacilityBatchIdsV1(
  state: InventoryStateV1,
  dependencies: PocInventoryLedgerDependenciesV1 & {
    readonly context: Extract<
      PocInventoryLedgerDependenciesV1["context"],
      { readonly kind: "accepted_facility_build" }
    >;
  },
): readonly BatchId[] {
  const { context } = dependencies;
  validateExtensionDefinitionsV1(context.ingredients, context.shelfLifeExtensions);
  return sortBatchesByIdV1(state.ingredientBatches)
    .filter((batch) => {
      const ingredient = ingredientDefinitionV1(context.ingredients, batch.ingredientId);
      const extension = shelfLifeExtensionV1(context.shelfLifeExtensions, ingredient);
      return extension !== null && !batch.refrigerationExtended;
    })
    .map(({ batchId }) => batchId);
}

function assertExactBatchIdsV1(actual: readonly BatchId[], expected: readonly BatchId[]): void {
  if (
    actual.length !== expected.length ||
    actual.some((batchId, index) => batchId !== expected[index])
  ) {
    throw new TypeError("Inventory affected batch IDs do not match exact eligible batches");
  }
}

function extendFacilityBatchesV1(
  state: InventoryStateV1,
  dependencies: PocInventoryLedgerDependenciesV1 & {
    readonly context: Extract<
      PocInventoryLedgerDependenciesV1["context"],
      { readonly kind: "accepted_facility_build" }
    >;
  },
): readonly InventoryBatchV1[] {
  const affected = new Set(dependencies.context.affectedBatchIds);
  return sortBatchesByIdV1(
    state.ingredientBatches.map((batch) => {
      if (!affected.has(batch.batchId)) return batch;
      if (batch.refrigerationExtended) {
        throw new TypeError("Inventory batch shelf life is already extended");
      }
      const ingredient = ingredientDefinitionV1(
        dependencies.context.ingredients,
        batch.ingredientId,
      );
      const extension = shelfLifeExtensionV1(dependencies.context.shelfLifeExtensions, ingredient);
      if (extension === null) throw new TypeError("Inventory affected batch has no extension");
      return {
        ...batch,
        lastUsableDay: parseAbsoluteDayIndex(
          checkedAddV1(
            batch.lastUsableDay,
            extension.days,
            "Inventory facility shelf-life extension",
          ),
        ),
        refrigerationExtended: true,
      };
    }),
  );
}

function validateDirectLedgerEntriesV1(
  entries: readonly LedgerEntryDraftV1[],
  dependencies: PocInventoryLedgerDependenciesV1,
): void {
  const reason = dependencies.context.reason;
  for (const entry of entries) {
    if (entry.reasonId !== reason.reasonId) {
      throw new TypeError("Inventory ledger entries must share the exact context reason");
    }
    const authoredReason = ledgerReasonForCategoryV1(entry.category, dependencies.ledgerReasons);
    if (authoredReason !== null && entry.reasonId !== authoredReason) {
      throw new TypeError("Inventory ledger category does not match authored reason binding");
    }
    assertDirectLedgerEntrySemanticsV1(entry, reason);
    if (entry.category === "facility" && dependencies.context.kind !== "accepted_facility_build") {
      throw new TypeError("Inventory facility ledger requires accepted build context");
    }
  }
}

function proposeLedgerAppendV1(
  state: InventoryStateV1,
  operation: Extract<PocInventoryOwnerOperationV1, { readonly kind: "inventory.ledger.append" }>,
  dependencies: PocInventoryLedgerDependenciesV1,
): PocInventoryProposalResultV1 {
  if (operation.entries.length === 0) {
    throw new TypeError("Inventory ledger append requires at least one entry");
  }
  validateDirectLedgerEntriesV1(operation.entries, dependencies);
  let ingredientBatches = state.ingredientBatches;
  if (dependencies.context.kind === "accepted_facility_build") {
    assertFacilityLedgerV1(operation.entries, dependencies);
    const expected = exactAffectedFacilityBatchIdsV1(state, dependencies);
    assertExactBatchIdsV1(dependencies.context.affectedBatchIds, expected);
    ingredientBatches = extendFacilityBatchesV1(state, dependencies);
  }

  const entries = operation.entries.map((draft, index) =>
    materializeLedgerEntryV1(
      draft,
      createLedgerEntryIdV1(dependencies.commandSequence, dependencies.nextLedgerEntryIndex, index),
    ),
  );
  const entryIds = entries.map(({ entryId }) => entryId);
  assertFreshIdentifiersV1(state, [], entryIds);
  let cashDelta = parseSafeInteger(0);
  let valuationDelta = parseSafeInteger(0);
  for (const entry of entries) {
    cashDelta = checkedAddV1(cashDelta, entry.cashDelta, "Inventory ledger cash total");
    valuationDelta = checkedAddV1(
      valuationDelta,
      entry.valuationDelta,
      "Inventory ledger valuation total",
    );
  }
  if (cashDelta < 0 && state.cash < 0 - cashDelta) {
    return cashRejectionV1(0 - cashDelta, state.cash);
  }
  const cash = parseMoney(checkedAddV1(state.cash, cashDelta, "Inventory cash balance"));
  const after = pocInventoryStateSchemaV1.parse({
    ...state,
    cash,
    ingredientBatches,
    ledger: [...state.ledger, ...entries],
  });
  const facts: readonly PocInventoryGameplayFactV1[] =
    cashDelta === 0
      ? []
      : [
          {
            kind: "cash.changed",
            value: { before: state.cash, after: cash },
            delta: cashDelta,
            entryIds,
            reason: dependencies.context.reason,
          },
        ];
  return proposedInventoryChangeV1(operation.kind, state, after, facts);
}

function proposeDebugCashV1(
  state: InventoryStateV1,
  operation: Extract<
    PocInventoryOwnerOperationV1,
    { readonly kind: "inventory.debug.adjust_cash" }
  >,
  dependencies: PocInventoryDebugCashDependenciesV1,
): PocInventoryProposalResultV1 {
  if (operation.delta < 0 && state.cash < 0 - operation.delta) {
    return cashRejectionV1(0 - operation.delta, state.cash);
  }
  const cash = parseMoney(checkedAddV1(state.cash, operation.delta, "Inventory debug cash"));
  const entry: LedgerEntryV1 = {
    entryId: createLedgerEntryIdV1(
      dependencies.commandSequence,
      dependencies.nextLedgerEntryIndex,
      0,
    ),
    category: "debug_adjustment",
    reasonId: operation.reasonId,
    cashDelta: operation.delta,
    valuationDelta: parseSafeInteger(0),
    subject: { kind: "debug" },
  };
  assertFreshIdentifiersV1(state, [], [entry.entryId]);
  const after = pocInventoryStateSchemaV1.parse({
    ...state,
    cash,
    ledger: [...state.ledger, entry],
  });
  const reason: ChangeReasonV1 = {
    kind: "debug",
    commandKind: "debug.inventory.adjust_cash",
    reasonId: operation.reasonId,
  };
  return proposedInventoryChangeV1(operation.kind, state, after, [
    {
      kind: "cash.changed",
      value: { before: state.cash, after: cash },
      delta: operation.delta,
      entryIds: [entry.entryId],
      reason,
    },
  ]);
}

export function createPocInventoryReadPortV1(
  stateValue: DeepReadonly<InventoryStateV1>,
): PocInventoryReadPortV1 {
  return pocInventoryStateSchemaV1.parse(stateValue);
}

export const pocInventoryOwnerV1: ModuleOwnerCapabilityV1<
  InventoryStateV1,
  PocInventoryOwnerOperationV1,
  PocInventoryOwnerProposalV1,
  PocRejectionReasonV1,
  PocInventoryDependencyPortsV1
> = Object.freeze({
  propose(
    stateValue: DeepReadonly<InventoryStateV1>,
    operationValue: DeepReadonly<PocInventoryOwnerOperationV1>,
    dependenciesValue: PocInventoryDependencyPortsV1,
  ): PocInventoryProposalResultV1 {
    const state = pocInventoryStateSchemaV1.parse(stateValue);
    assertValidInventoryStateV1(state, "Inventory State");
    const operation = pocInventoryOwnerOperationSchemaV1.parse(operationValue);
    const dependencies = pocInventoryDependencyPortsSchemaV1.parse(dependenciesValue);
    if (operation.kind !== dependencies.kind) {
      throw new TypeError("Inventory operation and dependency kinds do not match");
    }

    if (operation.kind === "inventory.purchase") {
      if (dependencies.kind !== operation.kind)
        throw new TypeError("Inventory dependency mismatch");
      return proposePurchaseV1(state, operation, dependencies);
    }
    if (operation.kind === "inventory.consume") {
      if (dependencies.kind !== operation.kind)
        throw new TypeError("Inventory dependency mismatch");
      return proposeConsumeV1(state, operation);
    }
    if (operation.kind === "inventory.grant") {
      if (dependencies.kind !== operation.kind)
        throw new TypeError("Inventory dependency mismatch");
      return proposeGrantV1(state, operation, dependencies);
    }
    if (operation.kind === "inventory.item.grant") {
      if (dependencies.kind !== operation.kind)
        throw new TypeError("Inventory dependency mismatch");
      return proposeItemGrantV1(state, operation);
    }
    if (operation.kind === "inventory.item.consume") {
      if (dependencies.kind !== operation.kind)
        throw new TypeError("Inventory dependency mismatch");
      return proposeItemConsumeV1(state, operation);
    }
    if (operation.kind === "inventory.spoil") {
      if (dependencies.kind !== operation.kind)
        throw new TypeError("Inventory dependency mismatch");
      return proposeSpoilV1(state, operation, dependencies);
    }
    if (operation.kind === "inventory.ledger.append") {
      if (dependencies.kind !== operation.kind)
        throw new TypeError("Inventory dependency mismatch");
      return proposeLedgerAppendV1(state, operation, dependencies);
    }
    if (dependencies.kind !== operation.kind) throw new TypeError("Inventory dependency mismatch");
    return proposeDebugCashV1(state, operation, dependencies);
  },

  apply(
    stateValue: DeepReadonly<InventoryStateV1>,
    proposalValue: DeepReadonly<PocInventoryOwnerProposalV1>,
  ): InventoryStateV1 {
    const state = pocInventoryStateSchemaV1.parse(stateValue);
    assertValidInventoryStateV1(state, "Inventory State");
    const proposal = pocInventoryOwnerProposalSchemaV1.parse(proposalValue);
    if (!pocInventoryStatesEqualV1(state, proposal.payload.before)) {
      throw new TypeError("stale Inventory owner proposal");
    }
    assertValidInventoryStateV1(proposal.payload.after, "Inventory proposal");
    return pocInventoryStateSchemaV1.parse(proposal.payload.after);
  },
});

function definePocInventoryGameplayModuleV1(initialStateValue: DeepReadonly<InventoryStateV1>) {
  const initialState = pocInventoryStateSchemaV1.parse(initialStateValue);
  assertValidInitialPocInventoryStateV1(initialState);
  return definePocGameplayModuleV1({
    bindingKind: "stateful" as const,
    descriptor: descriptorForPocModuleV1("inventory"),
    commandSchema: null,
    querySchema: null,
    queryResultSchema: null,
    stateSchema: pocInventoryStateSchemaV1,
    ownerOperationSchema: pocInventoryOwnerOperationSchemaV1,
    ownerProposalSchema: pocInventoryOwnerProposalSchemaV1,
    localInvariants: Object.freeze([pocInventoryInvariantV1]),
    owner: pocInventoryOwnerV1,
    queries: null,
    createInitialState(_bootstrap: DeepReadonly<PocGameBootstrapInputV1>): InventoryStateV1 {
      return pocInventoryStateSchemaV1.parse(initialState);
    },
    createReadPort: createPocInventoryReadPortV1,
  });
}

export type PocInventoryGameplayModuleV1 = ReturnType<typeof definePocInventoryGameplayModuleV1>;

export function createPocInventoryGameplayModuleV1(
  initialStateValue: DeepReadonly<InventoryStateV1>,
): PocInventoryGameplayModuleV1 {
  return definePocInventoryGameplayModuleV1(initialStateValue);
}
