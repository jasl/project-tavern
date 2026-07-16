// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { canonicalJsonBytes } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import {
  parseActionId,
  parseBatchId,
  parseFacilityId,
  parseIngredientId,
  parseItemId,
  parseRecipeId,
  parseReasonId,
  parseServiceMode,
} from "../gameplay/contracts/ids.js";
import type {
  ChangeReasonV1,
  InventoryBatchV1,
  InventoryStateV1,
  ItemStackV1,
  LedgerEntryV1,
} from "../gameplay/contracts/types.js";
import {
  parseAbsoluteDayIndex,
  parseDayIndex,
  parseMoney,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseQuantity,
  parseSafeInteger,
} from "../gameplay/contracts/values.js";
import {
  pocInventoryDependencyPortsSchemaV1,
  pocInventoryInvariantV1,
  pocInventoryOwnerOperationSchemaV1,
  pocInventoryOwnerProposalSchemaV1,
  pocInventoryStateSchemaV1,
} from "../gameplay/modules/inventory/contract.js";
import {
  createPocInventoryGameplayModuleV1,
  createPocInventoryReadPortV1,
  pocInventoryOwnerV1,
} from "../gameplay/modules/inventory/module.js";
import { createPocGameplayFixtureV1 } from "../testing/gameplay-fixture.js";

function requireProposedV1<TProposal>(
  result:
    | { readonly kind: "proposed"; readonly proposal: TProposal }
    | { readonly kind: "rejected"; readonly rejection: unknown },
): TProposal {
  if (result.kind !== "proposed") throw new TypeError("expected proposed Inventory operation");
  return result.proposal;
}

function fixtureReasonV1(): Extract<ChangeReasonV1, { readonly kind: "command" }> {
  return Object.freeze({
    kind: "command",
    commandKind: "actor.prepare_food",
    reasonId: parseReasonId("reason.fixture"),
  });
}

function calendarAdvanceReasonV1(): Extract<ChangeReasonV1, { readonly kind: "command" }> {
  return Object.freeze({
    kind: "command",
    commandKind: "calendar.advance_phase",
    reasonId: parseReasonId("reason.fixture"),
  });
}

function storyActionReasonV1(): Extract<ChangeReasonV1, { readonly kind: "story_action" }> {
  return Object.freeze({
    kind: "story_action",
    actionId: parseActionId("action.fixture_story"),
    reasonId: parseReasonId("reason.fixture"),
  });
}

function initialBatchV1(
  index: number,
  quantity: number,
  acquiredDay: number,
  lastUsableDay: number,
): InventoryBatchV1 {
  return Object.freeze({
    batchId: parseBatchId(`batch:initial:${index}`),
    ingredientId: parseIngredientId("ingredient.fixture"),
    quantity: parseQuantity(quantity),
    acquiredDay: parseDayIndex(acquiredDay),
    lastUsableDay: parseAbsoluteDayIndex(lastUsableDay),
    refrigerationExtended: false,
    source: { kind: "initial" as const, reasonId: parseReasonId("reason.fixture") },
  });
}

function inventoryStateV1(
  overrides: {
    readonly startingCash?: number;
    readonly cash?: number;
    readonly ingredientBatches?: readonly InventoryBatchV1[];
    readonly itemStacks?: readonly ItemStackV1[];
    readonly ledger?: readonly LedgerEntryV1[];
  } = {},
): InventoryStateV1 {
  const startingCash = overrides.startingCash ?? 20;
  return pocInventoryStateSchemaV1.parse({
    startingCash,
    cash: overrides.cash ?? startingCash,
    ingredientBatches: overrides.ingredientBatches ?? [],
    itemStacks: overrides.itemStacks ?? [],
    ledger: overrides.ledger ?? [],
  });
}

function consumeDependenciesV1() {
  return pocInventoryDependencyPortsSchemaV1.parse({ kind: "inventory.consume" });
}

function purchaseDependenciesV1() {
  return pocInventoryDependencyPortsSchemaV1.parse({
    kind: "inventory.purchase",
    commandSequence: parsePositiveSafeInteger(9),
    day: parseDayIndex(4),
    nextBatchIndex: parseNonNegativeSafeInteger(0),
    nextLedgerEntryIndex: parseNonNegativeSafeInteger(0),
    purchaseLineLimit: parsePositiveSafeInteger(4),
    purchaseQuantityPerLineLimit: parsePositiveSafeInteger(99),
    purchaseReasonId: parseReasonId("reason.fixture"),
    ingredients: [
      {
        ingredientId: parseIngredientId("ingredient.fixture"),
        unitPrice: parseMoney(3),
        shelfLifeDays: parsePositiveSafeInteger(2),
        refrigeratable: true,
      },
    ],
    shelfLifeExtensions: [],
  });
}

function ingredientDefinitionV1(
  overrides: {
    readonly ingredientId?: "ingredient.fixture" | "ingredient.fixture_second";
    readonly unitPrice?: number;
    readonly shelfLifeDays?: number;
    readonly refrigeratable?: boolean;
  } = {},
) {
  return Object.freeze({
    ingredientId: parseIngredientId(overrides.ingredientId ?? "ingredient.fixture"),
    unitPrice: parseMoney(overrides.unitPrice ?? 3),
    shelfLifeDays: parsePositiveSafeInteger(overrides.shelfLifeDays ?? 2),
    refrigeratable: overrides.refrigeratable ?? true,
  });
}

function grantDependenciesV1(shelfLifeExtensions: readonly unknown[] = [], commandSequence = 10) {
  return pocInventoryDependencyPortsSchemaV1.parse({
    kind: "inventory.grant",
    commandSequence: parsePositiveSafeInteger(commandSequence),
    day: parseDayIndex(2),
    nextBatchIndex: parseNonNegativeSafeInteger(0),
    nextLedgerEntryIndex: parseNonNegativeSafeInteger(0),
    ingredients: [ingredientDefinitionV1()],
    shelfLifeExtensions,
  });
}

function itemDependenciesV1(kind: "inventory.item.grant" | "inventory.item.consume") {
  return pocInventoryDependencyPortsSchemaV1.parse({ kind });
}

function spoilDependenciesV1(commandSequence = 11) {
  return pocInventoryDependencyPortsSchemaV1.parse({
    kind: "inventory.spoil",
    commandSequence: parsePositiveSafeInteger(commandSequence),
    nextLedgerEntryIndex: parseNonNegativeSafeInteger(0),
    spoiledIngredientReasonId: parseReasonId("reason.fixture"),
    ingredients: [ingredientDefinitionV1()],
  });
}

const ledgerReasonsV1 = Object.freeze({
  purchase: parseReasonId("reason.fixture"),
  serviceWage: parseReasonId("reason.fixture"),
  openingFee: parseReasonId("reason.fixture"),
  revenue: parseReasonId("reason.fixture"),
  discardedFood: parseReasonId("reason.fixture"),
  spoiledIngredient: parseReasonId("reason.fixture"),
  facilityBuild: parseReasonId("reason.fixture"),
  worldActionCost: parseReasonId("reason.fixture"),
  levy: parseReasonId("reason.fixture"),
});

function ledgerDependenciesForReasonV1(reason: ChangeReasonV1, commandSequence = 12) {
  return pocInventoryDependencyPortsSchemaV1.parse({
    kind: "inventory.ledger.append",
    commandSequence: parsePositiveSafeInteger(commandSequence),
    nextLedgerEntryIndex: parseNonNegativeSafeInteger(0),
    ledgerReasons: ledgerReasonsV1,
    context: {
      kind: "effect_or_direct",
      reason,
    },
  });
}

function directLedgerDependenciesV1(commandSequence = 12) {
  return ledgerDependenciesForReasonV1(storyActionReasonV1(), commandSequence);
}

function facilityLedgerDependenciesV1(affectedBatchIds: readonly string[]) {
  return pocInventoryDependencyPortsSchemaV1.parse({
    kind: "inventory.ledger.append",
    commandSequence: parsePositiveSafeInteger(12),
    nextLedgerEntryIndex: parseNonNegativeSafeInteger(0),
    ledgerReasons: ledgerReasonsV1,
    context: {
      kind: "accepted_facility_build",
      reason: {
        kind: "facility",
        facilityId: parseFacilityId("facility.fixture"),
        reasonId: parseReasonId("reason.fixture"),
      },
      facilityId: parseFacilityId("facility.fixture"),
      affectedBatchIds,
      ingredients: [ingredientDefinitionV1()],
      shelfLifeExtensions: [
        {
          ingredientId: parseIngredientId("ingredient.fixture"),
          days: parsePositiveSafeInteger(2),
        },
      ],
    },
  });
}

describe("PoC Inventory ownership", () => {
  it("binds only its validated initial owner slice and exports a fixed module surface", async () => {
    const fixture = createPocGameplayFixtureV1();
    const firstInitial = inventoryStateV1();
    const secondInitial = inventoryStateV1({ startingCash: 7 });
    const first = createPocInventoryGameplayModuleV1(firstInitial);
    const second = createPocInventoryGameplayModuleV1(secondInitial);

    expect(first.descriptor).toMatchObject({
      id: "module.inventory",
      contractRevision: 1,
      stateSlots: ["simulation.inventory"],
      dependencies: [],
    });
    expect(first.createInitialState(fixture.bootstrap)).toEqual(firstInitial);
    expect(second.createInitialState(fixture.bootstrap)).toEqual(secondInitial);
    expect(first.createInitialState(fixture.bootstrap)).not.toEqual(secondInitial);
    expect(first.owner).toBe(pocInventoryOwnerV1);
    expect(first.stateSchema).toBe(pocInventoryStateSchemaV1);
    expect(first.ownerOperationSchema).toBe(pocInventoryOwnerOperationSchemaV1);
    expect(first.ownerProposalSchema).toBe(pocInventoryOwnerProposalSchemaV1);
    expect(first.localInvariants).toEqual([pocInventoryInvariantV1]);

    const gameplay = await import("../gameplay/index.js");
    expect(gameplay.createPocInventoryGameplayModuleV1).toBe(createPocInventoryGameplayModuleV1);
    expect(gameplay.pocInventoryStateSchemaV1).toBe(pocInventoryStateSchemaV1);
  });

  it("consumes the earliest-expiry batch before a later batch without touching the ledger", () => {
    const state = inventoryStateV1({
      ingredientBatches: [initialBatchV1(0, 3, 1, 3), initialBatchV1(1, 1, 1, 2)],
    });
    const beforeBytes = canonicalJsonBytes(state);
    const proposal = requireProposedV1(
      pocInventoryOwnerV1.propose(
        state,
        pocInventoryOwnerOperationSchemaV1.parse({
          kind: "inventory.consume",
          lines: [
            { ingredientId: parseIngredientId("ingredient.fixture"), quantity: parseQuantity(2) },
          ],
          reason: fixtureReasonV1(),
        }),
        consumeDependenciesV1(),
      ),
    );
    const next = pocInventoryOwnerV1.apply(state, proposal);

    expect(canonicalJsonBytes(state)).toEqual(beforeBytes);
    expect(next.ingredientBatches).toEqual([
      expect.objectContaining({ batchId: "batch:initial:0", quantity: 2 }),
    ]);
    expect(next.cash).toBe(20);
    expect(next.ledger).toEqual([]);
    expect(proposal.facts).toEqual([
      {
        kind: "inventory.consumed",
        lines: [
          { batchId: "batch:initial:1", ingredientId: "ingredient.fixture", quantity: 1 },
          { batchId: "batch:initial:0", ingredientId: "ingredient.fixture", quantity: 1 },
        ],
        reason: fixtureReasonV1(),
      },
    ]);
  });

  it("uses expiry, acquisition day, and BatchId as the complete FIFO tie-break", () => {
    const state = inventoryStateV1({
      ingredientBatches: [
        initialBatchV1(0, 1, 2, 4),
        initialBatchV1(1, 1, 1, 4),
        initialBatchV1(2, 1, 1, 4),
        initialBatchV1(3, 1, 2, 3),
      ],
    });
    const proposal = requireProposedV1(
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.consume",
          lines: [
            { ingredientId: parseIngredientId("ingredient.fixture"), quantity: parseQuantity(4) },
          ],
          reason: fixtureReasonV1(),
        },
        consumeDependenciesV1(),
      ),
    );
    const next = pocInventoryOwnerV1.apply(state, proposal);

    expect(next.ingredientBatches).toEqual([]);
    expect(next.ledger).toEqual([]);
    expect(proposal.facts).toEqual([
      {
        kind: "inventory.consumed",
        lines: [
          { batchId: "batch:initial:3", ingredientId: "ingredient.fixture", quantity: 1 },
          { batchId: "batch:initial:1", ingredientId: "ingredient.fixture", quantity: 1 },
          { batchId: "batch:initial:2", ingredientId: "ingredient.fixture", quantity: 1 },
          { batchId: "batch:initial:0", ingredientId: "ingredient.fixture", quantity: 1 },
        ],
        reason: fixtureReasonV1(),
      },
    ]);
  });

  it("records a purchase, valuation, and cash movement in one proposal", () => {
    const state = inventoryStateV1();
    const proposal = requireProposedV1(
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.purchase",
          lines: [
            { ingredientId: parseIngredientId("ingredient.fixture"), quantity: parseQuantity(2) },
          ],
          reasonId: parseReasonId("reason.fixture"),
        },
        purchaseDependenciesV1(),
      ),
    );
    const next = pocInventoryOwnerV1.apply(state, proposal);

    expect(next.cash).toBe(parseMoney(14));
    expect(next.ingredientBatches).toEqual([
      {
        batchId: "batch:9:0",
        ingredientId: "ingredient.fixture",
        quantity: 2,
        acquiredDay: 4,
        lastUsableDay: 5,
        refrigerationExtended: false,
        source: { kind: "purchase", commandSequence: 9 },
      },
    ]);
    expect(next.ledger).toEqual([
      {
        entryId: "ledger:9:0",
        category: "purchase",
        reasonId: "reason.fixture",
        cashDelta: -6,
        valuationDelta: 6,
        subject: { kind: "ingredient", ingredientId: "ingredient.fixture" },
        quantity: 2,
      },
    ]);
    expect(proposal.facts).toEqual([
      {
        kind: "inventory.purchased",
        lines: [{ ingredientId: "ingredient.fixture", quantity: 2 }],
        createdBatchIds: ["batch:9:0"],
        entries: next.ledger,
      },
      {
        kind: "cash.changed",
        value: { before: 20, after: 14 },
        delta: -6,
        entryIds: ["ledger:9:0"],
        reason: {
          kind: "command",
          commandKind: "inventory.buy",
          reasonId: "reason.fixture",
        },
      },
    ]);
  });

  it("preserves a valid zero-valued authored purchase as explicit ledger evidence", () => {
    const state = inventoryStateV1();
    const dependencies = pocInventoryDependencyPortsSchemaV1.parse({
      ...purchaseDependenciesV1(),
      ingredients: [ingredientDefinitionV1({ unitPrice: 0 })],
    });
    const proposal = requireProposedV1(
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.purchase",
          lines: [
            { ingredientId: parseIngredientId("ingredient.fixture"), quantity: parseQuantity(1) },
          ],
          reasonId: parseReasonId("reason.fixture"),
        },
        dependencies,
      ),
    );
    const next = pocInventoryOwnerV1.apply(state, proposal);

    expect(next.cash).toBe(20);
    expect(next.ledger).toEqual([
      expect.objectContaining({ category: "purchase", cashDelta: 0, valuationDelta: 0 }),
    ]);
    expect(proposal.facts.at(-1)).toMatchObject({ kind: "cash.changed", delta: 0 });
  });

  it("enforces the authored purchase line limit before creating any batches or ledger rows", () => {
    const state = inventoryStateV1();
    const dependencies = pocInventoryDependencyPortsSchemaV1.parse({
      ...purchaseDependenciesV1(),
      purchaseLineLimit: parsePositiveSafeInteger(1),
      ingredients: [
        ingredientDefinitionV1(),
        ingredientDefinitionV1({ ingredientId: "ingredient.fixture_second" }),
      ],
    });
    const beforeBytes = canonicalJsonBytes(state);

    expect(
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.purchase",
          lines: [
            { ingredientId: parseIngredientId("ingredient.fixture"), quantity: parseQuantity(1) },
            {
              ingredientId: parseIngredientId("ingredient.fixture_second"),
              quantity: parseQuantity(1),
            },
          ],
          reasonId: parseReasonId("reason.fixture"),
        },
        dependencies,
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "inventory.line_limit_exceeded",
        details: { actual: 2, limit: 1 },
      },
    });
    expect(canonicalJsonBytes(state)).toEqual(beforeBytes);
  });

  it("rejects a purchase quantity above the Story limit before cost multiplication", () => {
    const state = inventoryStateV1({ startingCash: Number.MAX_SAFE_INTEGER });
    const dependencies = pocInventoryDependencyPortsSchemaV1.parse({
      ...purchaseDependenciesV1(),
      purchaseQuantityPerLineLimit: parsePositiveSafeInteger(99),
      ingredients: [ingredientDefinitionV1({ unitPrice: Number.MAX_SAFE_INTEGER })],
    });

    expect(
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.purchase",
          lines: [
            { ingredientId: parseIngredientId("ingredient.fixture"), quantity: parseQuantity(100) },
          ],
          reasonId: parseReasonId("reason.fixture"),
        },
        dependencies,
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "inventory.invalid_quantity",
        details: { ingredientId: "ingredient.fixture", quantity: 100 },
      },
    });
  });

  it("fails closed when purchase multiplication would exceed safe integer bounds", () => {
    const state = inventoryStateV1({ startingCash: Number.MAX_SAFE_INTEGER });
    const dependencies = pocInventoryDependencyPortsSchemaV1.parse({
      ...purchaseDependenciesV1(),
      ingredients: [ingredientDefinitionV1({ unitPrice: Number.MAX_SAFE_INTEGER })],
    });

    expect(() =>
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.purchase",
          lines: [
            { ingredientId: parseIngredientId("ingredient.fixture"), quantity: parseQuantity(2) },
          ],
          reasonId: parseReasonId("reason.fixture"),
        },
        dependencies,
      ),
    ).toThrow(/purchase value.*safe integer/u);
  });

  it("rejects insufficient cash or ingredient stock without partial mutation", () => {
    const cashState = inventoryStateV1({ startingCash: 5 });
    const cashBytes = canonicalJsonBytes(cashState);
    expect(
      pocInventoryOwnerV1.propose(
        cashState,
        {
          kind: "inventory.purchase",
          lines: [
            { ingredientId: parseIngredientId("ingredient.fixture"), quantity: parseQuantity(2) },
          ],
          reasonId: parseReasonId("reason.fixture"),
        },
        purchaseDependenciesV1(),
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "inventory.insufficient_cash",
        details: { required: 6, available: 5 },
      },
    });
    expect(canonicalJsonBytes(cashState)).toEqual(cashBytes);

    const stockState = inventoryStateV1({
      ingredientBatches: [initialBatchV1(0, 1, 1, 2)],
    });
    const stockBytes = canonicalJsonBytes(stockState);
    expect(
      pocInventoryOwnerV1.propose(
        stockState,
        {
          kind: "inventory.consume",
          lines: [
            { ingredientId: parseIngredientId("ingredient.fixture"), quantity: parseQuantity(2) },
          ],
          reason: fixtureReasonV1(),
        },
        consumeDependenciesV1(),
      ),
    ).toEqual({
      kind: "rejected",
      rejection: {
        code: "inventory.insufficient_ingredient",
        details: { ingredientId: "ingredient.fixture", required: 2, available: 1 },
      },
    });
    expect(canonicalJsonBytes(stockState)).toEqual(stockBytes);
  });

  it("grants deterministic valued batches and keeps item operations ledger-free", () => {
    const state = inventoryStateV1();
    const reason = Object.freeze({
      kind: "story_action" as const,
      actionId: parseActionId("action.fixture_story"),
      reasonId: parseReasonId("reason.fixture"),
    });
    const grant = requireProposedV1(
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.grant",
          lines: [
            { ingredientId: parseIngredientId("ingredient.fixture"), quantity: parseQuantity(2) },
          ],
          source: {
            kind: "story_action",
            actionId: parseActionId("action.fixture_story"),
          },
          reason,
        },
        grantDependenciesV1(),
      ),
    );
    const granted = pocInventoryOwnerV1.apply(state, grant);
    expect(granted.cash).toBe(20);
    expect(granted.ingredientBatches[0]).toMatchObject({
      batchId: "batch:10:0",
      acquiredDay: 2,
      lastUsableDay: 3,
      source: { kind: "story_action", actionId: "action.fixture_story" },
    });
    expect(granted.ledger[0]).toEqual({
      entryId: "ledger:10:0",
      category: "story_reward",
      reasonId: "reason.fixture",
      cashDelta: 0,
      valuationDelta: 6,
      subject: { kind: "action", actionId: "action.fixture_story" },
      quantity: 2,
    });
    expect(grant.facts.map(({ kind }) => kind)).toEqual(["inventory.ingredient_granted"]);

    const itemGrant = requireProposedV1(
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.item.grant",
          lines: [{ itemId: parseItemId("item.fixture"), quantity: parseQuantity(2) }],
          reason: fixtureReasonV1(),
        },
        itemDependenciesV1("inventory.item.grant"),
      ),
    );
    const withItem = pocInventoryOwnerV1.apply(state, itemGrant);
    expect(itemGrant.facts).toEqual([
      {
        kind: "inventory.item_granted",
        lines: [{ itemId: "item.fixture", quantity: 2 }],
        reason: fixtureReasonV1(),
      },
    ]);
    const itemConsume = requireProposedV1(
      pocInventoryOwnerV1.propose(
        withItem,
        {
          kind: "inventory.item.consume",
          lines: [{ itemId: parseItemId("item.fixture"), quantity: parseQuantity(1) }],
          reason: fixtureReasonV1(),
        },
        itemDependenciesV1("inventory.item.consume"),
      ),
    );
    const consumedItem = pocInventoryOwnerV1.apply(withItem, itemConsume);
    expect(consumedItem.itemStacks).toEqual([{ itemId: "item.fixture", quantity: 1 }]);
    expect(itemConsume.facts).toEqual([
      {
        kind: "inventory.item_consumed",
        lines: [{ itemId: "item.fixture", quantity: 1 }],
        reason: fixtureReasonV1(),
      },
    ]);
    expect(withItem.ledger).toEqual([]);
    expect(consumedItem.ledger).toEqual([]);
  });

  it("spoils at the inclusive day boundary with zero cash and negative valuation", () => {
    const state = inventoryStateV1({
      ingredientBatches: [
        initialBatchV1(0, 2, 1, 1),
        initialBatchV1(1, 1, 1, 2),
        initialBatchV1(2, 3, 1, 3),
      ],
    });
    const proposal = requireProposedV1(
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.spoil",
          day: parseDayIndex(2),
          reason: calendarAdvanceReasonV1(),
        },
        spoilDependenciesV1(),
      ),
    );
    const next = pocInventoryOwnerV1.apply(state, proposal);
    expect(next.cash).toBe(state.cash);
    expect(next.ingredientBatches.map(({ batchId }) => batchId)).toEqual(["batch:initial:2"]);
    expect(next.ledger).toEqual([
      expect.objectContaining({
        entryId: "ledger:11:0",
        cashDelta: 0,
        valuationDelta: -6,
        category: "spoiled_ingredient",
      }),
      expect.objectContaining({
        entryId: "ledger:11:1",
        cashDelta: 0,
        valuationDelta: -3,
        category: "spoiled_ingredient",
      }),
    ]);
    expect(proposal.facts).toEqual([
      {
        kind: "inventory.spoiled",
        lines: [
          { batchId: "batch:initial:0", ingredientId: "ingredient.fixture", quantity: 2 },
          { batchId: "batch:initial:1", ingredientId: "ingredient.fixture", quantity: 1 },
        ],
        entries: next.ledger,
      },
    ]);
  });

  it("appends direct ledger evidence and couples only tagged accepted facility builds", () => {
    const state = inventoryStateV1({
      ingredientBatches: [initialBatchV1(0, 2, 1, 2)],
    });
    const facility = requireProposedV1(
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.ledger.append",
          entries: [
            {
              category: "facility",
              reasonId: parseReasonId("reason.fixture"),
              cashDelta: parseSafeInteger(-5),
              valuationDelta: parseSafeInteger(0),
              subject: { kind: "facility", facilityId: parseFacilityId("facility.fixture") },
            },
          ],
        },
        facilityLedgerDependenciesV1(["batch:initial:0"]),
      ),
    );
    const built = pocInventoryOwnerV1.apply(state, facility);
    expect(built.cash).toBe(15);
    expect(built.ingredientBatches[0]).toMatchObject({
      lastUsableDay: 4,
      refrigerationExtended: true,
    });
    expect(built.ledger[0]).toMatchObject({
      entryId: "ledger:12:0",
      category: "facility",
      cashDelta: -5,
    });
    expect(facility.facts).toEqual([
      {
        kind: "cash.changed",
        value: { before: 20, after: 15 },
        delta: -5,
        entryIds: ["ledger:12:0"],
        reason: {
          kind: "facility",
          facilityId: "facility.fixture",
          reasonId: "reason.fixture",
        },
      },
    ]);
    expect(() =>
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.ledger.append",
          entries: [
            {
              category: "facility",
              reasonId: parseReasonId("reason.fixture"),
              cashDelta: parseSafeInteger(-5),
              valuationDelta: parseSafeInteger(0),
              subject: { kind: "facility", facilityId: parseFacilityId("facility.fixture") },
            },
          ],
        },
        facilityLedgerDependenciesV1([]),
      ),
    ).toThrow(/affected|batch/u);

    const direct = requireProposedV1(
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.ledger.append",
          entries: [
            {
              category: "story_cost",
              reasonId: parseReasonId("reason.fixture"),
              cashDelta: parseSafeInteger(-2),
              valuationDelta: parseSafeInteger(0),
              subject: { kind: "action", actionId: parseActionId("action.fixture_story") },
            },
          ],
        },
        directLedgerDependenciesV1(),
      ),
    );
    expect(pocInventoryOwnerV1.apply(state, direct).cash).toBe(18);
    expect(direct.facts).toEqual([
      {
        kind: "cash.changed",
        value: { before: 20, after: 18 },
        delta: -2,
        entryIds: ["ledger:12:0"],
        reason: storyActionReasonV1(),
      },
    ]);
  });

  it("rejects ledger categories whose subject or deltas contradict their meaning", () => {
    const state = inventoryStateV1();
    expect(() =>
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.ledger.append",
          entries: [
            {
              category: "levy",
              reasonId: parseReasonId("reason.fixture"),
              cashDelta: parseSafeInteger(5),
              valuationDelta: parseSafeInteger(1),
              subject: { kind: "debug" },
            },
          ],
        },
        directLedgerDependenciesV1(),
      ),
    ).toThrow(/levy|ledger.*entry|subject|delta/u);
  });

  it("accepts the closed valid ledger category and provenance combinations", () => {
    const cases = [
      {
        reason: {
          kind: "command",
          commandKind: "tavern.opening.start",
          reasonId: parseReasonId("reason.fixture"),
        },
        entry: {
          category: "wage",
          reasonId: parseReasonId("reason.fixture"),
          cashDelta: parseSafeInteger(-1),
          valuationDelta: parseSafeInteger(0),
          subject: { kind: "service_mode", mode: parseServiceMode("manual") },
        },
      },
      {
        reason: {
          kind: "command",
          commandKind: "tavern.opening.finalize",
          reasonId: parseReasonId("reason.fixture"),
        },
        entry: {
          category: "revenue",
          reasonId: parseReasonId("reason.fixture"),
          cashDelta: parseSafeInteger(2),
          valuationDelta: parseSafeInteger(-1),
          subject: { kind: "recipe", recipeId: parseRecipeId("recipe.fixture") },
          quantity: parseQuantity(1),
        },
      },
      {
        reason: {
          kind: "world_action",
          actionId: parseActionId("action.fixture_story"),
          reasonId: parseReasonId("reason.fixture"),
        },
        entry: {
          category: "world_action",
          reasonId: parseReasonId("reason.fixture"),
          cashDelta: parseSafeInteger(-1),
          valuationDelta: parseSafeInteger(0),
          subject: { kind: "action", actionId: parseActionId("action.fixture_story") },
        },
      },
      {
        reason: {
          kind: "command",
          commandKind: "levy.pay",
          reasonId: parseReasonId("reason.fixture"),
        },
        entry: {
          category: "levy",
          reasonId: parseReasonId("reason.fixture"),
          cashDelta: parseSafeInteger(-1),
          valuationDelta: parseSafeInteger(0),
          subject: { kind: "levy" },
        },
      },
      {
        reason: storyActionReasonV1(),
        entry: {
          category: "story_reward",
          reasonId: parseReasonId("reason.fixture"),
          cashDelta: parseSafeInteger(1),
          valuationDelta: parseSafeInteger(0),
          subject: { kind: "action", actionId: parseActionId("action.fixture_story") },
        },
      },
    ] as const satisfies readonly {
      readonly reason: ChangeReasonV1;
      readonly entry: Omit<LedgerEntryV1, "entryId">;
    }[];

    for (const [index, fixture] of cases.entries()) {
      const result = pocInventoryOwnerV1.propose(
        inventoryStateV1(),
        { kind: "inventory.ledger.append", entries: [fixture.entry] },
        ledgerDependenciesForReasonV1(fixture.reason, 20 + index),
      );
      expect(result.kind).toBe("proposed");
    }
  });

  it("does not re-extend cold batches or touch non-refrigeratable stock", () => {
    const extendedBatch = Object.freeze({
      ...initialBatchV1(0, 1, 1, 4),
      refrigerationExtended: true,
    });
    const dryBatch = Object.freeze({
      ...initialBatchV1(1, 1, 1, 4),
      ingredientId: parseIngredientId("ingredient.fixture_second"),
    });
    const state = inventoryStateV1({ ingredientBatches: [extendedBatch, dryBatch] });
    const dependencies = pocInventoryDependencyPortsSchemaV1.parse({
      kind: "inventory.ledger.append",
      commandSequence: parsePositiveSafeInteger(12),
      nextLedgerEntryIndex: parseNonNegativeSafeInteger(0),
      ledgerReasons: ledgerReasonsV1,
      context: {
        kind: "accepted_facility_build",
        reason: {
          kind: "facility",
          facilityId: parseFacilityId("facility.fixture"),
          reasonId: parseReasonId("reason.fixture"),
        },
        facilityId: parseFacilityId("facility.fixture"),
        affectedBatchIds: [],
        ingredients: [
          ingredientDefinitionV1(),
          ingredientDefinitionV1({
            ingredientId: "ingredient.fixture_second",
            refrigeratable: false,
          }),
        ],
        shelfLifeExtensions: [
          {
            ingredientId: parseIngredientId("ingredient.fixture"),
            days: parsePositiveSafeInteger(2),
          },
        ],
      },
    });
    const operation = pocInventoryOwnerOperationSchemaV1.parse({
      kind: "inventory.ledger.append",
      entries: [
        {
          category: "facility",
          reasonId: parseReasonId("reason.fixture"),
          cashDelta: parseSafeInteger(-5),
          valuationDelta: parseSafeInteger(0),
          subject: { kind: "facility", facilityId: parseFacilityId("facility.fixture") },
        },
      ],
    });
    const proposal = requireProposedV1(pocInventoryOwnerV1.propose(state, operation, dependencies));
    const next = pocInventoryOwnerV1.apply(state, proposal);

    expect(next.ingredientBatches).toEqual(state.ingredientBatches);
    expect(
      next.ingredientBatches.map(({ refrigerationExtended }) => refrigerationExtended),
    ).toEqual([true, false]);

    const emptyState = inventoryStateV1();
    const emptyProposal = requireProposedV1(
      pocInventoryOwnerV1.propose(emptyState, operation, dependencies),
    );
    expect(pocInventoryOwnerV1.apply(emptyState, emptyProposal)).toMatchObject({
      cash: 15,
      ingredientBatches: [],
    });
  });

  it("extends future refrigeratable acquisitions and records debug cash through the ledger", () => {
    const coldDependencies = pocInventoryDependencyPortsSchemaV1.parse({
      ...purchaseDependenciesV1(),
      shelfLifeExtensions: [
        {
          ingredientId: parseIngredientId("ingredient.fixture"),
          days: parsePositiveSafeInteger(2),
        },
      ],
    });
    const state = inventoryStateV1();
    const purchase = requireProposedV1(
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.purchase",
          lines: [
            { ingredientId: parseIngredientId("ingredient.fixture"), quantity: parseQuantity(1) },
          ],
          reasonId: parseReasonId("reason.fixture"),
        },
        coldDependencies,
      ),
    );
    expect(pocInventoryOwnerV1.apply(state, purchase).ingredientBatches[0]).toMatchObject({
      lastUsableDay: 7,
      refrigerationExtended: true,
    });

    const reason = storyActionReasonV1();
    const grant = requireProposedV1(
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.grant",
          lines: [
            { ingredientId: parseIngredientId("ingredient.fixture"), quantity: parseQuantity(1) },
          ],
          source: { kind: "story_action", actionId: reason.actionId },
          reason,
        },
        grantDependenciesV1([
          {
            ingredientId: parseIngredientId("ingredient.fixture"),
            days: parsePositiveSafeInteger(2),
          },
        ]),
      ),
    );
    expect(pocInventoryOwnerV1.apply(state, grant).ingredientBatches[0]).toMatchObject({
      lastUsableDay: 5,
      refrigerationExtended: true,
    });

    const debugDependencies = pocInventoryDependencyPortsSchemaV1.parse({
      kind: "inventory.debug.adjust_cash",
      commandSequence: parsePositiveSafeInteger(13),
      nextLedgerEntryIndex: parseNonNegativeSafeInteger(0),
    });
    const debug = requireProposedV1(
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.debug.adjust_cash",
          delta: parseSafeInteger(-20),
          reasonId: parseReasonId("reason.fixture"),
        },
        debugDependencies,
      ),
    );
    const debugged = pocInventoryOwnerV1.apply(state, debug);
    expect(debugged.cash).toBe(0);
    expect(debugged.ledger[0]).toMatchObject({
      category: "debug_adjustment",
      subject: { kind: "debug" },
      valuationDelta: 0,
    });
    expect(debug.facts).toEqual([
      {
        kind: "cash.changed",
        value: { before: 20, after: 0 },
        delta: -20,
        entryIds: ["ledger:13:0"],
        reason: {
          kind: "debug",
          commandKind: "debug.inventory.adjust_cash",
          reasonId: "reason.fixture",
        },
      },
    ]);
    expect(
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.debug.adjust_cash",
          delta: parseSafeInteger(-21),
          reasonId: parseReasonId("reason.fixture"),
        },
        debugDependencies,
      ),
    ).toMatchObject({ kind: "rejected", rejection: { code: "inventory.insufficient_cash" } });
  });

  it("rejects mismatched dependency kinds and extra fields on dependency-free operations", () => {
    const state = inventoryStateV1({
      ingredientBatches: [initialBatchV1(0, 1, 1, 2)],
    });

    expect(() =>
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.consume",
          lines: [
            { ingredientId: parseIngredientId("ingredient.fixture"), quantity: parseQuantity(1) },
          ],
          reason: fixtureReasonV1(),
        },
        itemDependenciesV1("inventory.item.consume"),
      ),
    ).toThrow(/operation and dependency kinds do not match/u);

    expect(() =>
      pocInventoryDependencyPortsSchemaV1.parse({
        kind: "inventory.consume",
        commandSequence: 1,
      }),
    ).toThrow(/Inventory dependency ports/u);
    expect(() =>
      pocInventoryDependencyPortsSchemaV1.parse({
        kind: "inventory.item.grant",
        items: [],
      }),
    ).toThrow(/Inventory dependency ports/u);
    expect(() =>
      pocInventoryDependencyPortsSchemaV1.parse({
        kind: "inventory.item.consume",
        items: [],
      }),
    ).toThrow(/Inventory dependency ports/u);
  });

  it("fails closed when a positive debug adjustment would overflow safe integer cash", () => {
    const state = inventoryStateV1({ startingCash: Number.MAX_SAFE_INTEGER });
    const dependencies = pocInventoryDependencyPortsSchemaV1.parse({
      kind: "inventory.debug.adjust_cash",
      commandSequence: parsePositiveSafeInteger(13),
      nextLedgerEntryIndex: parseNonNegativeSafeInteger(0),
    });

    expect(() =>
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.debug.adjust_cash",
          delta: parseSafeInteger(1),
          reasonId: parseReasonId("reason.fixture"),
        },
        dependencies,
      ),
    ).toThrow(/debug cash.*safe integer/u);
  });

  it("rejects stale or malformed proposals and invalid initial ledgers", () => {
    const state = inventoryStateV1();
    const proposal = requireProposedV1(
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.purchase",
          lines: [
            { ingredientId: parseIngredientId("ingredient.fixture"), quantity: parseQuantity(1) },
          ],
          reasonId: parseReasonId("reason.fixture"),
        },
        purchaseDependenciesV1(),
      ),
    );
    expect(Object.isFrozen(proposal)).toBe(true);
    expect(Object.isFrozen(proposal.facts)).toBe(true);
    const next = pocInventoryOwnerV1.apply(state, proposal);
    expect(() => pocInventoryOwnerV1.apply(next, proposal)).toThrow(/stale/u);
    expect(() =>
      pocInventoryOwnerProposalSchemaV1.parse({ ...proposal, facts: [{ kind: "run.started" }] }),
    ).toThrow();
    expect(() =>
      pocInventoryOwnerOperationSchemaV1.parse({
        kind: "inventory.consume",
        lines: [{ ingredientId: parseIngredientId("ingredient.fixture"), quantity: 1 }],
        reason: fixtureReasonV1(),
        extra: true,
      }),
    ).toThrow();

    const unbalanced = pocInventoryStateSchemaV1.parse({
      startingCash: 20,
      cash: 19,
      ingredientBatches: [],
      itemStacks: [],
      ledger: [],
    });
    expect(
      pocInventoryInvariantV1.check(unbalanced, createPocInventoryReadPortV1(unbalanced)),
    ).not.toHaveLength(0);
    expect(() => createPocInventoryGameplayModuleV1(unbalanced)).toThrow(/initial|ledger|cash/u);

    const balancedHistory = pocInventoryStateSchemaV1.parse({
      startingCash: 20,
      cash: 20,
      ingredientBatches: [],
      itemStacks: [],
      ledger: [
        {
          entryId: "ledger:1:0",
          category: "debug_adjustment",
          reasonId: "reason.fixture",
          cashDelta: 0,
          valuationDelta: 0,
          subject: { kind: "debug" },
        },
      ],
    });
    expect(
      pocInventoryInvariantV1.check(balancedHistory, createPocInventoryReadPortV1(balancedHistory)),
    ).toEqual([]);
    expect(() => createPocInventoryGameplayModuleV1(balancedHistory)).toThrow(/initial.*ledger/u);
  });

  it("rejects forged proposals whose facts do not describe the exact state transition", () => {
    const state = inventoryStateV1({
      ingredientBatches: [initialBatchV1(0, 2, 1, 3)],
    });
    const consumed = requireProposedV1(
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.consume",
          lines: [
            { ingredientId: parseIngredientId("ingredient.fixture"), quantity: parseQuantity(1) },
          ],
          reason: fixtureReasonV1(),
        },
        consumeDependenciesV1(),
      ),
    );
    expect(() =>
      pocInventoryOwnerProposalSchemaV1.parse({
        ...consumed,
        payload: { ...consumed.payload, after: state },
      }),
    ).toThrow(/consume.*inconsistent|transition/u);

    const direct = requireProposedV1(
      pocInventoryOwnerV1.propose(
        state,
        {
          kind: "inventory.ledger.append",
          entries: [
            {
              category: "story_cost",
              reasonId: parseReasonId("reason.fixture"),
              cashDelta: parseSafeInteger(-1),
              valuationDelta: parseSafeInteger(0),
              subject: { kind: "action", actionId: parseActionId("action.fixture_story") },
            },
          ],
        },
        directLedgerDependenciesV1(14),
      ),
    );
    expect(() =>
      pocInventoryOwnerProposalSchemaV1.parse({
        ...direct,
        payload: {
          ...direct.payload,
          after: {
            ...direct.payload.after,
            ingredientBatches: [
              {
                ...direct.payload.after.ingredientBatches[0],
                lastUsableDay: parseAbsoluteDayIndex(4),
                refrigerationExtended: true,
              },
            ],
          },
        },
      }),
    ).toThrow(/ledger.*batch|transition/u);
  });

  it("exposes a frozen owner-only read port", () => {
    const state = inventoryStateV1();
    const port = createPocInventoryReadPortV1(state);
    expect(port).toEqual(state);
    expect(port).not.toBe(state);
    expect(Object.isFrozen(port)).toBe(true);
    expect(port).not.toHaveProperty("snapshot");
    expect(port).not.toHaveProperty("facilities");
    expect(parseItemId("item.fixture")).toBe("item.fixture");
  });
});
