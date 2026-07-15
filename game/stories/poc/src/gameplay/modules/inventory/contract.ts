// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { canonicalJsonBytes } from "@sillymaker/base";
import type {
  DeepReadonly,
  ModuleOwnerProposalEnvelopeV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";

import {
  parseActionId,
  parseAuraId,
  parseBatchId,
  parseEndingId,
  parseEventId,
  parseFacilityId,
  parseIngredientId,
  parseItemId,
  parseLedgerEntryId,
  parseReasonId,
  parseRecipeId,
  parseServiceMode,
} from "../../contracts/ids.js";
import type {
  BatchId,
  FacilityId,
  IngredientId,
  LedgerEntryId,
  ReasonId,
} from "../../contracts/ids.js";
import { pocDebugCommandKindsV1 } from "../../contracts/types.js";
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
  PocDebugCommandV1,
  PocGameCommandV1,
  PocGameplayFactV1,
  PurchaseLineV1,
} from "../../contracts/types.js";
import {
  deepFreezePocValueV1,
  parseAbsoluteDayIndex,
  parseDayIndex,
  parseMoney,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseQuantity,
  parseSafeInteger,
} from "../../contracts/values.js";
import type {
  DayIndex,
  Money,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
  SafeInteger,
} from "../../contracts/values.js";

export interface PocInventoryIngredientPortV1 {
  readonly ingredientId: IngredientId;
  readonly unitPrice: Money;
  readonly shelfLifeDays: PositiveSafeInteger;
  readonly refrigeratable: boolean;
}

export interface PocInventoryShelfLifeExtensionV1 {
  readonly ingredientId: IngredientId;
  readonly days: PositiveSafeInteger;
}

export type PocInventoryLedgerAppendContextV1 =
  | {
      readonly kind: "effect_or_direct";
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "accepted_facility_build";
      readonly reason: ChangeReasonV1;
      readonly facilityId: FacilityId;
      readonly affectedBatchIds: readonly BatchId[];
      readonly ingredients: readonly PocInventoryIngredientPortV1[];
      readonly shelfLifeExtensions: readonly PocInventoryShelfLifeExtensionV1[];
    };

export type PocInventoryOwnerOperationV1 =
  | {
      readonly kind: "inventory.purchase";
      readonly lines: readonly PurchaseLineV1[];
      readonly reasonId: ReasonId;
    }
  | {
      readonly kind: "inventory.consume";
      readonly lines: readonly IngredientQuantityV1[];
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.grant";
      readonly lines: readonly IngredientQuantityV1[];
      readonly source: InventorySourceRefV1;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.item.grant";
      readonly lines: readonly ItemQuantityV1[];
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.item.consume";
      readonly lines: readonly ItemQuantityV1[];
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.spoil";
      readonly day: DayIndex;
      readonly reason: ChangeReasonV1;
    }
  | {
      readonly kind: "inventory.ledger.append";
      readonly entries: readonly LedgerEntryDraftV1[];
    }
  | {
      readonly kind: "inventory.debug.adjust_cash";
      readonly delta: SafeInteger;
      readonly reasonId: ReasonId;
    };

export type PocInventoryDependencyPortsV1 =
  | {
      readonly kind: "inventory.purchase";
      readonly commandSequence: PositiveSafeInteger;
      readonly day: DayIndex;
      readonly nextBatchIndex: NonNegativeSafeInteger;
      readonly nextLedgerEntryIndex: NonNegativeSafeInteger;
      readonly purchaseLineLimit: PositiveSafeInteger;
      readonly purchaseReasonId: ReasonId;
      readonly ingredients: readonly PocInventoryIngredientPortV1[];
      readonly shelfLifeExtensions: readonly PocInventoryShelfLifeExtensionV1[];
    }
  | { readonly kind: "inventory.consume" }
  | {
      readonly kind: "inventory.grant";
      readonly commandSequence: PositiveSafeInteger;
      readonly day: DayIndex;
      readonly nextBatchIndex: NonNegativeSafeInteger;
      readonly nextLedgerEntryIndex: NonNegativeSafeInteger;
      readonly ingredients: readonly PocInventoryIngredientPortV1[];
      readonly shelfLifeExtensions: readonly PocInventoryShelfLifeExtensionV1[];
    }
  | {
      readonly kind: "inventory.item.grant";
    }
  | {
      readonly kind: "inventory.item.consume";
    }
  | {
      readonly kind: "inventory.spoil";
      readonly commandSequence: PositiveSafeInteger;
      readonly nextLedgerEntryIndex: NonNegativeSafeInteger;
      readonly spoiledIngredientReasonId: ReasonId;
      readonly ingredients: readonly PocInventoryIngredientPortV1[];
    }
  | {
      readonly kind: "inventory.ledger.append";
      readonly commandSequence: PositiveSafeInteger;
      readonly nextLedgerEntryIndex: NonNegativeSafeInteger;
      readonly ledgerReasons: LedgerReasonBindingsV1;
      readonly context: PocInventoryLedgerAppendContextV1;
    }
  | {
      readonly kind: "inventory.debug.adjust_cash";
      readonly commandSequence: PositiveSafeInteger;
      readonly nextLedgerEntryIndex: NonNegativeSafeInteger;
    };

export type PocInventoryGameplayFactV1 = Extract<
  PocGameplayFactV1,
  {
    readonly kind:
      | "inventory.purchased"
      | "inventory.consumed"
      | "inventory.ingredient_granted"
      | "inventory.item_granted"
      | "inventory.item_consumed"
      | "inventory.spoiled"
      | "cash.changed";
  }
>;

export interface PocInventoryOwnerProposalPayloadV1 {
  readonly kind: PocInventoryOwnerOperationV1["kind"];
  readonly before: InventoryStateV1;
  readonly after: InventoryStateV1;
}

export type PocInventoryOwnerProposalV1 = ModuleOwnerProposalEnvelopeV1<
  PocInventoryOwnerProposalPayloadV1,
  PocInventoryGameplayFactV1
>;

export type PocInventoryReadPortV1 = InventoryStateV1;

type PlainDataRecordV1 = Record<string, unknown>;

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
  const keys = Reflect.ownKeys(value);
  const expected = new Set(expectedKeys);
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

function exactDataObjectForKindV1(value: unknown, label: string): PlainDataRecordV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, "kind");
  if (
    descriptor === undefined ||
    descriptor.get !== undefined ||
    descriptor.set !== undefined ||
    !("value" in descriptor) ||
    descriptor.enumerable !== true ||
    typeof descriptor.value !== "string"
  ) {
    throw new TypeError(`invalid ${label} kind`);
  }
  return value as PlainDataRecordV1;
}

function dataPropertyV1(record: PlainDataRecordV1, key: string, label: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined || !("value" in descriptor)) {
    throw new TypeError(`invalid ${label} field ${key}`);
  }
  return descriptor.value;
}

function exactDataArrayV1(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`invalid ${label}`);
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined ||
    !("value" in lengthDescriptor) ||
    typeof lengthDescriptor.value !== "number" ||
    lengthDescriptor.get !== undefined ||
    lengthDescriptor.set !== undefined ||
    lengthDescriptor.enumerable !== false
  ) {
    throw new TypeError(`invalid ${label} length`);
  }
  const length = lengthDescriptor.value;
  const keys = Reflect.ownKeys(value);
  if (
    !Number.isSafeInteger(length) ||
    length < 0 ||
    keys.length !== length + 1 ||
    keys.some((key) => typeof key !== "string")
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const parsed: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new TypeError(`invalid ${label} element`);
    }
    parsed.push(descriptor.value);
  }
  return parsed;
}

function exactDataObjectForKindlessV1(value: unknown, label: string): PlainDataRecordV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  return value as PlainDataRecordV1;
}

const pocGameCommandKindsV1 = Object.freeze([
  "run.start",
  "policy.choose",
  "inventory.buy",
  "actor.prepare_food",
  "actor.rest",
  "story.action.start",
  "facility.choose",
  "tavern.plan.set",
  "tavern.opening.start",
  "tavern.opening.continue",
  "tavern.opening.finalize",
  "world.action.begin",
  "world.action.complete",
  "narrative.advance",
  "narrative.choose",
  "calendar.advance_phase",
  "levy.pay",
] as const satisfies readonly PocGameCommandV1["kind"][]);

function parseCommandKindV1(value: unknown): PocGameCommandV1["kind"] {
  if (
    typeof value !== "string" ||
    !pocGameCommandKindsV1.includes(value as PocGameCommandV1["kind"])
  ) {
    throw new TypeError("invalid PoC command kind");
  }
  return value as PocGameCommandV1["kind"];
}

function parseDebugCommandKindV1(value: unknown): PocDebugCommandV1["kind"] {
  if (
    typeof value !== "string" ||
    !pocDebugCommandKindsV1.includes(value as PocDebugCommandV1["kind"])
  ) {
    throw new TypeError("invalid PoC debug command kind");
  }
  return value as PocDebugCommandV1["kind"];
}

export function parsePocInventoryChangeReasonV1(value: unknown): ChangeReasonV1 {
  const candidate = exactDataObjectForKindV1(value, "Inventory change reason");
  const kind = dataPropertyV1(candidate, "kind", "Inventory change reason");
  const expectedKeys =
    kind === "command" || kind === "debug"
      ? ["kind", "commandKind", "reasonId"]
      : kind === "event"
        ? ["kind", "eventId", "reasonId"]
        : kind === "story_action" || kind === "world_action"
          ? ["kind", "actionId", "reasonId"]
          : kind === "aura"
            ? ["kind", "auraId", "reasonId"]
            : kind === "facility"
              ? ["kind", "facilityId", "reasonId"]
              : kind === "ending"
                ? ["kind", "endingId", "reasonId"]
                : null;
  if (expectedKeys === null) throw new TypeError("invalid Inventory change reason kind");
  const reason = exactDataObjectV1(value, expectedKeys, "Inventory change reason");
  const reasonId = parseReasonId(dataPropertyV1(reason, "reasonId", "Inventory change reason"));
  if (kind === "command") {
    return deepFreezePocValueV1({
      kind,
      commandKind: parseCommandKindV1(
        dataPropertyV1(reason, "commandKind", "Inventory change reason"),
      ),
      reasonId,
    });
  }
  if (kind === "debug") {
    return deepFreezePocValueV1({
      kind,
      commandKind: parseDebugCommandKindV1(
        dataPropertyV1(reason, "commandKind", "Inventory change reason"),
      ),
      reasonId,
    });
  }
  if (kind === "event") {
    return deepFreezePocValueV1({
      kind,
      eventId: parseEventId(dataPropertyV1(reason, "eventId", "Inventory change reason")),
      reasonId,
    });
  }
  if (kind === "story_action" || kind === "world_action") {
    return deepFreezePocValueV1({
      kind,
      actionId: parseActionId(dataPropertyV1(reason, "actionId", "Inventory change reason")),
      reasonId,
    });
  }
  if (kind === "aura") {
    return deepFreezePocValueV1({
      kind,
      auraId: parseAuraId(dataPropertyV1(reason, "auraId", "Inventory change reason")),
      reasonId,
    });
  }
  if (kind === "facility") {
    return deepFreezePocValueV1({
      kind,
      facilityId: parseFacilityId(dataPropertyV1(reason, "facilityId", "Inventory change reason")),
      reasonId,
    });
  }
  return deepFreezePocValueV1({
    kind: "ending",
    endingId: parseEndingId(dataPropertyV1(reason, "endingId", "Inventory change reason")),
    reasonId,
  });
}

export function parsePocInventorySourceRefV1(value: unknown): InventorySourceRefV1 {
  const candidate = exactDataObjectForKindV1(value, "Inventory source");
  const kind = dataPropertyV1(candidate, "kind", "Inventory source");
  if (kind === "initial" || kind === "debug") {
    const source = exactDataObjectV1(value, ["kind", "reasonId"], "Inventory source");
    return deepFreezePocValueV1({
      kind,
      reasonId: parseReasonId(dataPropertyV1(source, "reasonId", "Inventory source")),
    });
  }
  if (kind === "purchase") {
    const source = exactDataObjectV1(value, ["kind", "commandSequence"], "Inventory source");
    return deepFreezePocValueV1({
      kind,
      commandSequence: parsePositiveSafeInteger(
        dataPropertyV1(source, "commandSequence", "Inventory source"),
      ),
    });
  }
  if (kind === "story_action" || kind === "world_action") {
    const source = exactDataObjectV1(value, ["kind", "actionId"], "Inventory source");
    return deepFreezePocValueV1({
      kind,
      actionId: parseActionId(dataPropertyV1(source, "actionId", "Inventory source")),
    });
  }
  if (kind === "story_event") {
    const source = exactDataObjectV1(value, ["kind", "eventId"], "Inventory source");
    return deepFreezePocValueV1({
      kind,
      eventId: parseEventId(dataPropertyV1(source, "eventId", "Inventory source")),
    });
  }
  throw new TypeError("invalid Inventory source kind");
}

export function parsePocInventoryBatchV1(value: unknown): InventoryBatchV1 {
  const batch = exactDataObjectV1(
    value,
    [
      "batchId",
      "ingredientId",
      "quantity",
      "acquiredDay",
      "lastUsableDay",
      "refrigerationExtended",
      "source",
    ],
    "Inventory batch",
  );
  const refrigerationExtended = dataPropertyV1(batch, "refrigerationExtended", "Inventory batch");
  if (typeof refrigerationExtended !== "boolean") {
    throw new TypeError("invalid Inventory batch refrigerationExtended");
  }
  return deepFreezePocValueV1({
    batchId: parseBatchId(dataPropertyV1(batch, "batchId", "Inventory batch")),
    ingredientId: parseIngredientId(dataPropertyV1(batch, "ingredientId", "Inventory batch")),
    quantity: parseQuantity(dataPropertyV1(batch, "quantity", "Inventory batch")),
    acquiredDay: parseDayIndex(dataPropertyV1(batch, "acquiredDay", "Inventory batch")),
    lastUsableDay: parseAbsoluteDayIndex(dataPropertyV1(batch, "lastUsableDay", "Inventory batch")),
    refrigerationExtended,
    source: parsePocInventorySourceRefV1(dataPropertyV1(batch, "source", "Inventory batch")),
  });
}

export function parsePocInventoryItemStackV1(value: unknown): ItemStackV1 {
  const stack = exactDataObjectV1(value, ["itemId", "quantity"], "Inventory item stack");
  return deepFreezePocValueV1({
    itemId: parseItemId(dataPropertyV1(stack, "itemId", "Inventory item stack")),
    quantity: parseQuantity(dataPropertyV1(stack, "quantity", "Inventory item stack")),
  });
}

function parseLedgerCategoryV1(value: unknown): LedgerCategoryV1 {
  if (
    value !== "purchase" &&
    value !== "wage" &&
    value !== "opening_fee" &&
    value !== "revenue" &&
    value !== "discarded_food" &&
    value !== "spoiled_ingredient" &&
    value !== "facility" &&
    value !== "world_action" &&
    value !== "levy" &&
    value !== "story_reward" &&
    value !== "story_cost" &&
    value !== "debug_adjustment"
  ) {
    throw new TypeError("invalid Ledger category");
  }
  return value;
}

export function parsePocInventoryLedgerSubjectV1(value: unknown): LedgerSubjectV1 {
  const candidate = exactDataObjectForKindV1(value, "Inventory ledger subject");
  const kind = dataPropertyV1(candidate, "kind", "Inventory ledger subject");
  if (kind === "ingredient") {
    const subject = exactDataObjectV1(value, ["kind", "ingredientId"], "Inventory ledger subject");
    return deepFreezePocValueV1({
      kind,
      ingredientId: parseIngredientId(
        dataPropertyV1(subject, "ingredientId", "Inventory ledger subject"),
      ),
    });
  }
  if (kind === "item") {
    const subject = exactDataObjectV1(value, ["kind", "itemId"], "Inventory ledger subject");
    return deepFreezePocValueV1({
      kind,
      itemId: parseItemId(dataPropertyV1(subject, "itemId", "Inventory ledger subject")),
    });
  }
  if (kind === "recipe") {
    const subject = exactDataObjectV1(value, ["kind", "recipeId"], "Inventory ledger subject");
    return deepFreezePocValueV1({
      kind,
      recipeId: parseRecipeId(dataPropertyV1(subject, "recipeId", "Inventory ledger subject")),
    });
  }
  if (kind === "facility") {
    const subject = exactDataObjectV1(value, ["kind", "facilityId"], "Inventory ledger subject");
    return deepFreezePocValueV1({
      kind,
      facilityId: parseFacilityId(
        dataPropertyV1(subject, "facilityId", "Inventory ledger subject"),
      ),
    });
  }
  if (kind === "service_mode") {
    const subject = exactDataObjectV1(value, ["kind", "mode"], "Inventory ledger subject");
    return deepFreezePocValueV1({
      kind,
      mode: parseServiceMode(dataPropertyV1(subject, "mode", "Inventory ledger subject")),
    });
  }
  if (kind === "event") {
    const subject = exactDataObjectV1(value, ["kind", "eventId"], "Inventory ledger subject");
    return deepFreezePocValueV1({
      kind,
      eventId: parseEventId(dataPropertyV1(subject, "eventId", "Inventory ledger subject")),
    });
  }
  if (kind === "action") {
    const subject = exactDataObjectV1(value, ["kind", "actionId"], "Inventory ledger subject");
    return deepFreezePocValueV1({
      kind,
      actionId: parseActionId(dataPropertyV1(subject, "actionId", "Inventory ledger subject")),
    });
  }
  if (kind === "levy" || kind === "debug") {
    exactDataObjectV1(value, ["kind"], "Inventory ledger subject");
    return deepFreezePocValueV1({ kind });
  }
  throw new TypeError("invalid Inventory ledger subject kind");
}

function parseLedgerFieldsV1(
  value: unknown,
  label: string,
  includeEntryId: boolean,
): Omit<LedgerEntryV1, "entryId"> & { readonly entryId?: LedgerEntryId } {
  const baseKeys = ["category", "reasonId", "cashDelta", "valuationDelta", "subject"];
  const candidate = exactDataObjectForKindlessV1(value, label);
  const hasQuantity = Object.prototype.hasOwnProperty.call(candidate, "quantity");
  const keys = includeEntryId ? ["entryId", ...baseKeys] : baseKeys;
  const entry = exactDataObjectV1(value, hasQuantity ? [...keys, "quantity"] : keys, label);
  const parsed = {
    ...(includeEntryId
      ? { entryId: parseLedgerEntryId(dataPropertyV1(entry, "entryId", label)) }
      : {}),
    category: parseLedgerCategoryV1(dataPropertyV1(entry, "category", label)),
    reasonId: parseReasonId(dataPropertyV1(entry, "reasonId", label)),
    cashDelta: parseSafeInteger(dataPropertyV1(entry, "cashDelta", label)),
    valuationDelta: parseSafeInteger(dataPropertyV1(entry, "valuationDelta", label)),
    subject: parsePocInventoryLedgerSubjectV1(dataPropertyV1(entry, "subject", label)),
    ...(hasQuantity ? { quantity: parseQuantity(dataPropertyV1(entry, "quantity", label)) } : {}),
  };
  return deepFreezePocValueV1(parsed);
}

export function parsePocInventoryLedgerEntryV1(value: unknown): LedgerEntryV1 {
  return parseLedgerFieldsV1(value, "Inventory ledger entry", true) as LedgerEntryV1;
}

export function parsePocInventoryLedgerEntryDraftV1(value: unknown): LedgerEntryDraftV1 {
  return parseLedgerFieldsV1(value, "Inventory ledger entry draft", false) as LedgerEntryDraftV1;
}

export function parsePocInventoryStateV1(value: unknown): InventoryStateV1 {
  const state = exactDataObjectV1(
    value,
    ["startingCash", "cash", "ingredientBatches", "itemStacks", "ledger"],
    "Inventory State",
  );
  return deepFreezePocValueV1({
    startingCash: parseMoney(dataPropertyV1(state, "startingCash", "Inventory State")),
    cash: parseMoney(dataPropertyV1(state, "cash", "Inventory State")),
    ingredientBatches: exactDataArrayV1(
      dataPropertyV1(state, "ingredientBatches", "Inventory State"),
      "Inventory batches",
    ).map(parsePocInventoryBatchV1),
    itemStacks: exactDataArrayV1(
      dataPropertyV1(state, "itemStacks", "Inventory State"),
      "Inventory item stacks",
    ).map(parsePocInventoryItemStackV1),
    ledger: exactDataArrayV1(
      dataPropertyV1(state, "ledger", "Inventory State"),
      "Inventory ledger",
    ).map(parsePocInventoryLedgerEntryV1),
  });
}

export const pocInventoryStateSchemaV1: RuntimeSchemaV1<InventoryStateV1> = Object.freeze({
  parse: parsePocInventoryStateV1,
});

function parsePurchaseLineV1(value: unknown): PurchaseLineV1 {
  const line = exactDataObjectV1(value, ["ingredientId", "quantity"], "Inventory purchase line");
  return deepFreezePocValueV1({
    ingredientId: parseIngredientId(
      dataPropertyV1(line, "ingredientId", "Inventory purchase line"),
    ),
    quantity: parseQuantity(dataPropertyV1(line, "quantity", "Inventory purchase line")),
  });
}

function parseIngredientQuantityV1(value: unknown): IngredientQuantityV1 {
  const line = exactDataObjectV1(
    value,
    ["ingredientId", "quantity"],
    "Inventory ingredient quantity",
  );
  return deepFreezePocValueV1({
    ingredientId: parseIngredientId(
      dataPropertyV1(line, "ingredientId", "Inventory ingredient quantity"),
    ),
    quantity: parseQuantity(dataPropertyV1(line, "quantity", "Inventory ingredient quantity")),
  });
}

function parseItemQuantityV1(value: unknown): ItemQuantityV1 {
  const line = exactDataObjectV1(value, ["itemId", "quantity"], "Inventory item quantity");
  return deepFreezePocValueV1({
    itemId: parseItemId(dataPropertyV1(line, "itemId", "Inventory item quantity")),
    quantity: parseQuantity(dataPropertyV1(line, "quantity", "Inventory item quantity")),
  });
}

function parseOperationLinesV1<TValue>(
  value: unknown,
  label: string,
  parser: (input: unknown) => TValue,
): readonly TValue[] {
  return deepFreezePocValueV1(exactDataArrayV1(value, label).map(parser));
}

interface PocInventoryOwnerOperationRuntimeSchemaV1 {
  parse<const TValue extends { readonly kind: PocInventoryOwnerOperationV1["kind"] }>(
    value: TValue,
  ): Extract<PocInventoryOwnerOperationV1, { readonly kind: TValue["kind"] }>;
  parse(value: unknown): PocInventoryOwnerOperationV1;
}

export const pocInventoryOwnerOperationSchemaV1 = Object.freeze({
  parse(value: unknown): PocInventoryOwnerOperationV1 {
    const candidate = exactDataObjectForKindV1(value, "Inventory owner operation");
    const kind = dataPropertyV1(candidate, "kind", "Inventory owner operation");
    if (kind === "inventory.purchase") {
      const operation = exactDataObjectV1(
        value,
        ["kind", "lines", "reasonId"],
        "Inventory owner operation",
      );
      const lines = parseOperationLinesV1(
        dataPropertyV1(operation, "lines", "Inventory owner operation"),
        "Inventory purchase lines",
        parsePurchaseLineV1,
      );
      if (lines.length < 1 || lines.length > 64) {
        throw new TypeError("Inventory purchase lines must contain 1..64 entries");
      }
      return deepFreezePocValueV1({
        kind,
        lines,
        reasonId: parseReasonId(dataPropertyV1(operation, "reasonId", "Inventory owner operation")),
      });
    }
    if (kind === "inventory.consume") {
      const operation = exactDataObjectV1(
        value,
        ["kind", "lines", "reason"],
        "Inventory owner operation",
      );
      return deepFreezePocValueV1({
        kind,
        lines: parseOperationLinesV1(
          dataPropertyV1(operation, "lines", "Inventory owner operation"),
          "Inventory consume lines",
          parseIngredientQuantityV1,
        ),
        reason: parsePocInventoryChangeReasonV1(
          dataPropertyV1(operation, "reason", "Inventory owner operation"),
        ),
      });
    }
    if (kind === "inventory.grant") {
      const operation = exactDataObjectV1(
        value,
        ["kind", "lines", "source", "reason"],
        "Inventory owner operation",
      );
      return deepFreezePocValueV1({
        kind,
        lines: parseOperationLinesV1(
          dataPropertyV1(operation, "lines", "Inventory owner operation"),
          "Inventory grant lines",
          parseIngredientQuantityV1,
        ),
        source: parsePocInventorySourceRefV1(
          dataPropertyV1(operation, "source", "Inventory owner operation"),
        ),
        reason: parsePocInventoryChangeReasonV1(
          dataPropertyV1(operation, "reason", "Inventory owner operation"),
        ),
      });
    }
    if (kind === "inventory.item.grant" || kind === "inventory.item.consume") {
      const operation = exactDataObjectV1(
        value,
        ["kind", "lines", "reason"],
        "Inventory owner operation",
      );
      return deepFreezePocValueV1({
        kind,
        lines: parseOperationLinesV1(
          dataPropertyV1(operation, "lines", "Inventory owner operation"),
          "Inventory item lines",
          parseItemQuantityV1,
        ),
        reason: parsePocInventoryChangeReasonV1(
          dataPropertyV1(operation, "reason", "Inventory owner operation"),
        ),
      });
    }
    if (kind === "inventory.spoil") {
      const operation = exactDataObjectV1(
        value,
        ["kind", "day", "reason"],
        "Inventory owner operation",
      );
      return deepFreezePocValueV1({
        kind,
        day: parseDayIndex(dataPropertyV1(operation, "day", "Inventory owner operation")),
        reason: parsePocInventoryChangeReasonV1(
          dataPropertyV1(operation, "reason", "Inventory owner operation"),
        ),
      });
    }
    if (kind === "inventory.ledger.append") {
      const operation = exactDataObjectV1(value, ["kind", "entries"], "Inventory owner operation");
      return deepFreezePocValueV1({
        kind,
        entries: parseOperationLinesV1(
          dataPropertyV1(operation, "entries", "Inventory owner operation"),
          "Inventory ledger entry drafts",
          parsePocInventoryLedgerEntryDraftV1,
        ),
      });
    }
    if (kind === "inventory.debug.adjust_cash") {
      const operation = exactDataObjectV1(
        value,
        ["kind", "delta", "reasonId"],
        "Inventory owner operation",
      );
      return deepFreezePocValueV1({
        kind,
        delta: parseSafeInteger(dataPropertyV1(operation, "delta", "Inventory owner operation")),
        reasonId: parseReasonId(dataPropertyV1(operation, "reasonId", "Inventory owner operation")),
      });
    }
    throw new TypeError("invalid Inventory owner operation kind");
  },
}) as PocInventoryOwnerOperationRuntimeSchemaV1;

function parseIngredientPortV1(value: unknown): PocInventoryIngredientPortV1 {
  const ingredient = exactDataObjectV1(
    value,
    ["ingredientId", "unitPrice", "shelfLifeDays", "refrigeratable"],
    "Inventory ingredient port",
  );
  const refrigeratable = dataPropertyV1(ingredient, "refrigeratable", "Inventory ingredient port");
  if (typeof refrigeratable !== "boolean") {
    throw new TypeError("invalid Inventory ingredient refrigeratable flag");
  }
  return deepFreezePocValueV1({
    ingredientId: parseIngredientId(
      dataPropertyV1(ingredient, "ingredientId", "Inventory ingredient port"),
    ),
    unitPrice: parseMoney(dataPropertyV1(ingredient, "unitPrice", "Inventory ingredient port")),
    shelfLifeDays: parsePositiveSafeInteger(
      dataPropertyV1(ingredient, "shelfLifeDays", "Inventory ingredient port"),
    ),
    refrigeratable,
  });
}

function parseShelfLifeExtensionV1(value: unknown): PocInventoryShelfLifeExtensionV1 {
  const extension = exactDataObjectV1(
    value,
    ["ingredientId", "days"],
    "Inventory shelf-life extension",
  );
  return deepFreezePocValueV1({
    ingredientId: parseIngredientId(
      dataPropertyV1(extension, "ingredientId", "Inventory shelf-life extension"),
    ),
    days: parsePositiveSafeInteger(
      dataPropertyV1(extension, "days", "Inventory shelf-life extension"),
    ),
  });
}

function compareStableIdsV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertUniqueStableStringOrderV1(values: readonly string[], label: string): void {
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (
      previous === undefined ||
      current === undefined ||
      compareStableIdsV1(previous, current) >= 0
    ) {
      throw new TypeError(`${label} must be unique and stably ordered`);
    }
  }
}

function parseIngredientPortsV1(
  value: unknown,
  label: string,
): readonly PocInventoryIngredientPortV1[] {
  const ingredients = exactDataArrayV1(value, label).map(parseIngredientPortV1);
  assertUniqueStableStringOrderV1(
    ingredients.map(({ ingredientId }) => ingredientId),
    label,
  );
  return deepFreezePocValueV1(ingredients);
}

function parseShelfLifeExtensionsV1(
  value: unknown,
  ingredients: readonly PocInventoryIngredientPortV1[],
  label: string,
): readonly PocInventoryShelfLifeExtensionV1[] {
  const extensions = exactDataArrayV1(value, label).map(parseShelfLifeExtensionV1);
  assertUniqueStableStringOrderV1(
    extensions.map(({ ingredientId }) => ingredientId),
    label,
  );
  const ingredientById = new Map(
    ingredients.map((ingredient) => [ingredient.ingredientId, ingredient]),
  );
  for (const extension of extensions) {
    const ingredient = ingredientById.get(extension.ingredientId);
    if (ingredient === undefined) {
      throw new TypeError(
        `unknown Inventory shelf-life extension ingredient ${extension.ingredientId}`,
      );
    }
    if (!ingredient.refrigeratable) {
      throw new TypeError(`non-refrigeratable Inventory ingredient ${extension.ingredientId}`);
    }
  }
  return deepFreezePocValueV1(extensions);
}

function batchIdPartsV1(batchId: BatchId): readonly ["initial" | number, number] {
  const [, sequenceValue, indexValue] = batchId.split(":");
  if (sequenceValue === undefined || indexValue === undefined) {
    throw new TypeError("invalid BatchId");
  }
  return [sequenceValue === "initial" ? "initial" : Number(sequenceValue), Number(indexValue)];
}

export function comparePocInventoryBatchIdsV1(left: BatchId, right: BatchId): number {
  const [leftSequence, leftIndex] = batchIdPartsV1(left);
  const [rightSequence, rightIndex] = batchIdPartsV1(right);
  if (leftSequence === rightSequence) return leftIndex - rightIndex;
  if (leftSequence === "initial") return -1;
  if (rightSequence === "initial") return 1;
  return leftSequence - rightSequence;
}

function parseBatchIdsV1(value: unknown): readonly BatchId[] {
  const batchIds = exactDataArrayV1(value, "Inventory affected batch IDs").map(parseBatchId);
  for (let index = 1; index < batchIds.length; index += 1) {
    const previous = batchIds[index - 1];
    const current = batchIds[index];
    if (
      previous === undefined ||
      current === undefined ||
      comparePocInventoryBatchIdsV1(previous, current) >= 0
    ) {
      throw new TypeError("Inventory affected batch IDs must be unique and stably ordered");
    }
  }
  return deepFreezePocValueV1(batchIds);
}

function parseLedgerReasonBindingsV1(value: unknown): LedgerReasonBindingsV1 {
  const reasons = exactDataObjectV1(
    value,
    [
      "purchase",
      "serviceWage",
      "openingFee",
      "revenue",
      "discardedFood",
      "spoiledIngredient",
      "facilityBuild",
      "worldActionCost",
      "levy",
    ],
    "Inventory ledger reason bindings",
  );
  return deepFreezePocValueV1({
    purchase: parseReasonId(
      dataPropertyV1(reasons, "purchase", "Inventory ledger reason bindings"),
    ),
    serviceWage: parseReasonId(
      dataPropertyV1(reasons, "serviceWage", "Inventory ledger reason bindings"),
    ),
    openingFee: parseReasonId(
      dataPropertyV1(reasons, "openingFee", "Inventory ledger reason bindings"),
    ),
    revenue: parseReasonId(dataPropertyV1(reasons, "revenue", "Inventory ledger reason bindings")),
    discardedFood: parseReasonId(
      dataPropertyV1(reasons, "discardedFood", "Inventory ledger reason bindings"),
    ),
    spoiledIngredient: parseReasonId(
      dataPropertyV1(reasons, "spoiledIngredient", "Inventory ledger reason bindings"),
    ),
    facilityBuild: parseReasonId(
      dataPropertyV1(reasons, "facilityBuild", "Inventory ledger reason bindings"),
    ),
    worldActionCost: parseReasonId(
      dataPropertyV1(reasons, "worldActionCost", "Inventory ledger reason bindings"),
    ),
    levy: parseReasonId(dataPropertyV1(reasons, "levy", "Inventory ledger reason bindings")),
  });
}

function parseLedgerAppendContextV1(value: unknown): PocInventoryLedgerAppendContextV1 {
  const candidate = exactDataObjectForKindV1(value, "Inventory ledger append context");
  const kind = dataPropertyV1(candidate, "kind", "Inventory ledger append context");
  if (kind === "effect_or_direct") {
    const context = exactDataObjectV1(value, ["kind", "reason"], "Inventory ledger append context");
    return deepFreezePocValueV1({
      kind,
      reason: parsePocInventoryChangeReasonV1(
        dataPropertyV1(context, "reason", "Inventory ledger append context"),
      ),
    });
  }
  if (kind === "accepted_facility_build") {
    const context = exactDataObjectV1(
      value,
      ["kind", "reason", "facilityId", "affectedBatchIds", "ingredients", "shelfLifeExtensions"],
      "Inventory ledger append context",
    );
    const facilityId = parseFacilityId(
      dataPropertyV1(context, "facilityId", "Inventory ledger append context"),
    );
    const reason = parsePocInventoryChangeReasonV1(
      dataPropertyV1(context, "reason", "Inventory ledger append context"),
    );
    if (reason.kind !== "facility" || reason.facilityId !== facilityId) {
      throw new TypeError("accepted Inventory facility context has mismatched provenance");
    }
    const ingredients = parseIngredientPortsV1(
      dataPropertyV1(context, "ingredients", "Inventory ledger append context"),
      "Inventory facility ingredient ports",
    );
    return deepFreezePocValueV1({
      kind,
      reason,
      facilityId,
      affectedBatchIds: parseBatchIdsV1(
        dataPropertyV1(context, "affectedBatchIds", "Inventory ledger append context"),
      ),
      ingredients,
      shelfLifeExtensions: parseShelfLifeExtensionsV1(
        dataPropertyV1(context, "shelfLifeExtensions", "Inventory ledger append context"),
        ingredients,
        "Inventory facility shelf-life extensions",
      ),
    });
  }
  throw new TypeError("invalid Inventory ledger append context kind");
}

function parseAcquisitionDependenciesV1(
  dependencies: PlainDataRecordV1,
  kind: "inventory.purchase" | "inventory.grant",
): Extract<
  PocInventoryDependencyPortsV1,
  { readonly kind: "inventory.purchase" | "inventory.grant" }
> {
  const isPurchase = kind === "inventory.purchase";
  const expectedKeys = isPurchase
    ? [
        "kind",
        "commandSequence",
        "day",
        "nextBatchIndex",
        "nextLedgerEntryIndex",
        "purchaseLineLimit",
        "purchaseReasonId",
        "ingredients",
        "shelfLifeExtensions",
      ]
    : [
        "kind",
        "commandSequence",
        "day",
        "nextBatchIndex",
        "nextLedgerEntryIndex",
        "ingredients",
        "shelfLifeExtensions",
      ];
  const parsedObject = exactDataObjectV1(dependencies, expectedKeys, "Inventory dependency ports");
  const ingredients = parseIngredientPortsV1(
    dataPropertyV1(parsedObject, "ingredients", "Inventory dependency ports"),
    "Inventory ingredient ports",
  );
  const common = {
    kind,
    commandSequence: parsePositiveSafeInteger(
      dataPropertyV1(parsedObject, "commandSequence", "Inventory dependency ports"),
    ),
    day: parseDayIndex(dataPropertyV1(parsedObject, "day", "Inventory dependency ports")),
    nextBatchIndex: parseNonNegativeSafeInteger(
      dataPropertyV1(parsedObject, "nextBatchIndex", "Inventory dependency ports"),
    ),
    nextLedgerEntryIndex: parseNonNegativeSafeInteger(
      dataPropertyV1(parsedObject, "nextLedgerEntryIndex", "Inventory dependency ports"),
    ),
    ingredients,
    shelfLifeExtensions: parseShelfLifeExtensionsV1(
      dataPropertyV1(parsedObject, "shelfLifeExtensions", "Inventory dependency ports"),
      ingredients,
      "Inventory shelf-life extensions",
    ),
  } as const;
  if (!isPurchase) {
    return deepFreezePocValueV1({ ...common, kind: "inventory.grant" as const });
  }
  const purchaseLineLimit = parsePositiveSafeInteger(
    dataPropertyV1(parsedObject, "purchaseLineLimit", "Inventory dependency ports"),
  );
  if (purchaseLineLimit > 64) throw new TypeError("Inventory purchase line limit exceeds 64");
  return deepFreezePocValueV1({
    ...common,
    kind: "inventory.purchase" as const,
    purchaseLineLimit,
    purchaseReasonId: parseReasonId(
      dataPropertyV1(parsedObject, "purchaseReasonId", "Inventory dependency ports"),
    ),
  });
}

interface PocInventoryDependencyPortsRuntimeSchemaV1 {
  parse<const TValue extends { readonly kind: PocInventoryDependencyPortsV1["kind"] }>(
    value: TValue,
  ): Extract<PocInventoryDependencyPortsV1, { readonly kind: TValue["kind"] }>;
  parse(value: unknown): PocInventoryDependencyPortsV1;
}

export const pocInventoryDependencyPortsSchemaV1 = Object.freeze({
  parse(value: unknown): PocInventoryDependencyPortsV1 {
    const candidate = exactDataObjectForKindV1(value, "Inventory dependency ports");
    const kind = dataPropertyV1(candidate, "kind", "Inventory dependency ports");
    if (kind === "inventory.purchase" || kind === "inventory.grant") {
      return parseAcquisitionDependenciesV1(candidate, kind);
    }
    if (kind === "inventory.consume") {
      exactDataObjectV1(value, ["kind"], "Inventory dependency ports");
      return deepFreezePocValueV1({ kind });
    }
    if (kind === "inventory.item.grant" || kind === "inventory.item.consume") {
      exactDataObjectV1(value, ["kind"], "Inventory dependency ports");
      return deepFreezePocValueV1({ kind });
    }
    if (kind === "inventory.spoil") {
      const dependencies = exactDataObjectV1(
        value,
        [
          "kind",
          "commandSequence",
          "nextLedgerEntryIndex",
          "spoiledIngredientReasonId",
          "ingredients",
        ],
        "Inventory dependency ports",
      );
      return deepFreezePocValueV1({
        kind,
        commandSequence: parsePositiveSafeInteger(
          dataPropertyV1(dependencies, "commandSequence", "Inventory dependency ports"),
        ),
        nextLedgerEntryIndex: parseNonNegativeSafeInteger(
          dataPropertyV1(dependencies, "nextLedgerEntryIndex", "Inventory dependency ports"),
        ),
        spoiledIngredientReasonId: parseReasonId(
          dataPropertyV1(dependencies, "spoiledIngredientReasonId", "Inventory dependency ports"),
        ),
        ingredients: parseIngredientPortsV1(
          dataPropertyV1(dependencies, "ingredients", "Inventory dependency ports"),
          "Inventory ingredient ports",
        ),
      });
    }
    if (kind === "inventory.ledger.append") {
      const dependencies = exactDataObjectV1(
        value,
        ["kind", "commandSequence", "nextLedgerEntryIndex", "ledgerReasons", "context"],
        "Inventory dependency ports",
      );
      return deepFreezePocValueV1({
        kind,
        commandSequence: parsePositiveSafeInteger(
          dataPropertyV1(dependencies, "commandSequence", "Inventory dependency ports"),
        ),
        nextLedgerEntryIndex: parseNonNegativeSafeInteger(
          dataPropertyV1(dependencies, "nextLedgerEntryIndex", "Inventory dependency ports"),
        ),
        ledgerReasons: parseLedgerReasonBindingsV1(
          dataPropertyV1(dependencies, "ledgerReasons", "Inventory dependency ports"),
        ),
        context: parseLedgerAppendContextV1(
          dataPropertyV1(dependencies, "context", "Inventory dependency ports"),
        ),
      });
    }
    if (kind === "inventory.debug.adjust_cash") {
      const dependencies = exactDataObjectV1(
        value,
        ["kind", "commandSequence", "nextLedgerEntryIndex"],
        "Inventory dependency ports",
      );
      return deepFreezePocValueV1({
        kind,
        commandSequence: parsePositiveSafeInteger(
          dataPropertyV1(dependencies, "commandSequence", "Inventory dependency ports"),
        ),
        nextLedgerEntryIndex: parseNonNegativeSafeInteger(
          dataPropertyV1(dependencies, "nextLedgerEntryIndex", "Inventory dependency ports"),
        ),
      });
    }
    throw new TypeError("invalid Inventory dependency port kind");
  },
}) as PocInventoryDependencyPortsRuntimeSchemaV1;

function parseBatchConsumptionV1(value: unknown): BatchConsumptionV1 {
  const line = exactDataObjectV1(
    value,
    ["batchId", "ingredientId", "quantity"],
    "Inventory batch consumption",
  );
  return deepFreezePocValueV1({
    batchId: parseBatchId(dataPropertyV1(line, "batchId", "Inventory batch consumption")),
    ingredientId: parseIngredientId(
      dataPropertyV1(line, "ingredientId", "Inventory batch consumption"),
    ),
    quantity: parseQuantity(dataPropertyV1(line, "quantity", "Inventory batch consumption")),
  });
}

function parseInventoryFactV1(value: unknown): PocInventoryGameplayFactV1 {
  const candidate = exactDataObjectForKindV1(value, "Inventory Fact");
  const kind = dataPropertyV1(candidate, "kind", "Inventory Fact");
  if (kind === "inventory.purchased") {
    const fact = exactDataObjectV1(
      value,
      ["kind", "lines", "createdBatchIds", "entries"],
      "Inventory purchased Fact",
    );
    const lines = exactDataArrayV1(
      dataPropertyV1(fact, "lines", "Inventory purchased Fact"),
      "Inventory purchased Fact lines",
    ).map(parsePurchaseLineV1);
    const createdBatchIds = exactDataArrayV1(
      dataPropertyV1(fact, "createdBatchIds", "Inventory purchased Fact"),
      "Inventory purchased Fact batch IDs",
    ).map(parseBatchId);
    const entries = exactDataArrayV1(
      dataPropertyV1(fact, "entries", "Inventory purchased Fact"),
      "Inventory purchased Fact entries",
    ).map(parsePocInventoryLedgerEntryV1);
    if (lines.length !== createdBatchIds.length || lines.length !== entries.length) {
      throw new TypeError("Inventory purchased Fact cardinality mismatch");
    }
    return deepFreezePocValueV1({ kind, lines, createdBatchIds, entries });
  }
  if (kind === "inventory.consumed") {
    const fact = exactDataObjectV1(value, ["kind", "lines", "reason"], "Inventory consumed Fact");
    return deepFreezePocValueV1({
      kind,
      lines: exactDataArrayV1(
        dataPropertyV1(fact, "lines", "Inventory consumed Fact"),
        "Inventory consumed Fact lines",
      ).map(parseBatchConsumptionV1),
      reason: parsePocInventoryChangeReasonV1(
        dataPropertyV1(fact, "reason", "Inventory consumed Fact"),
      ),
    });
  }
  if (kind === "inventory.ingredient_granted") {
    const fact = exactDataObjectV1(
      value,
      ["kind", "lines", "createdBatchIds", "entries", "reason"],
      "Inventory ingredient granted Fact",
    );
    const lines = exactDataArrayV1(
      dataPropertyV1(fact, "lines", "Inventory ingredient granted Fact"),
      "Inventory ingredient granted Fact lines",
    ).map(parseIngredientQuantityV1);
    const createdBatchIds = exactDataArrayV1(
      dataPropertyV1(fact, "createdBatchIds", "Inventory ingredient granted Fact"),
      "Inventory ingredient granted Fact batch IDs",
    ).map(parseBatchId);
    const entries = exactDataArrayV1(
      dataPropertyV1(fact, "entries", "Inventory ingredient granted Fact"),
      "Inventory ingredient granted Fact entries",
    ).map(parsePocInventoryLedgerEntryV1);
    if (lines.length !== createdBatchIds.length || lines.length !== entries.length) {
      throw new TypeError("Inventory ingredient granted Fact cardinality mismatch");
    }
    return deepFreezePocValueV1({
      kind,
      lines,
      createdBatchIds,
      entries,
      reason: parsePocInventoryChangeReasonV1(
        dataPropertyV1(fact, "reason", "Inventory ingredient granted Fact"),
      ),
    });
  }
  if (kind === "inventory.item_granted" || kind === "inventory.item_consumed") {
    const fact = exactDataObjectV1(value, ["kind", "lines", "reason"], "Inventory item Fact");
    return deepFreezePocValueV1({
      kind,
      lines: exactDataArrayV1(
        dataPropertyV1(fact, "lines", "Inventory item Fact"),
        "Inventory item Fact lines",
      ).map(parseItemQuantityV1),
      reason: parsePocInventoryChangeReasonV1(
        dataPropertyV1(fact, "reason", "Inventory item Fact"),
      ),
    });
  }
  if (kind === "inventory.spoiled") {
    const fact = exactDataObjectV1(value, ["kind", "lines", "entries"], "Inventory spoiled Fact");
    const lines = exactDataArrayV1(
      dataPropertyV1(fact, "lines", "Inventory spoiled Fact"),
      "Inventory spoiled Fact lines",
    ).map(parseBatchConsumptionV1);
    const entries = exactDataArrayV1(
      dataPropertyV1(fact, "entries", "Inventory spoiled Fact"),
      "Inventory spoiled Fact entries",
    ).map(parsePocInventoryLedgerEntryV1);
    if (lines.length !== entries.length) {
      throw new TypeError("Inventory spoiled Fact cardinality mismatch");
    }
    return deepFreezePocValueV1({ kind, lines, entries });
  }
  if (kind === "cash.changed") {
    const fact = exactDataObjectV1(
      value,
      ["kind", "value", "delta", "entryIds", "reason"],
      "Inventory cash changed Fact",
    );
    const pair = exactDataObjectV1(
      dataPropertyV1(fact, "value", "Inventory cash changed Fact"),
      ["before", "after"],
      "Inventory cash change",
    );
    const before = parseMoney(dataPropertyV1(pair, "before", "Inventory cash change"));
    const after = parseMoney(dataPropertyV1(pair, "after", "Inventory cash change"));
    const delta = parseSafeInteger(dataPropertyV1(fact, "delta", "Inventory cash changed Fact"));
    if (delta !== after - before) throw new TypeError("Inventory cash Fact delta mismatch");
    const entryIds = exactDataArrayV1(
      dataPropertyV1(fact, "entryIds", "Inventory cash changed Fact"),
      "Inventory cash changed Fact entry IDs",
    ).map(parseLedgerEntryId);
    if (new Set(entryIds).size !== entryIds.length) {
      throw new TypeError("duplicate Inventory cash Fact entry ID");
    }
    return deepFreezePocValueV1({
      kind,
      value: { before, after },
      delta,
      entryIds,
      reason: parsePocInventoryChangeReasonV1(
        dataPropertyV1(fact, "reason", "Inventory cash changed Fact"),
      ),
    });
  }
  throw new TypeError("invalid Inventory Fact kind");
}

export const pocInventoryGameplayFactSchemaV1: RuntimeSchemaV1<PocInventoryGameplayFactV1> =
  Object.freeze({ parse: parseInventoryFactV1 });

function parseProposalKindV1(value: unknown): PocInventoryOwnerProposalPayloadV1["kind"] {
  if (
    value === "inventory.purchase" ||
    value === "inventory.consume" ||
    value === "inventory.grant" ||
    value === "inventory.item.grant" ||
    value === "inventory.item.consume" ||
    value === "inventory.spoil" ||
    value === "inventory.ledger.append" ||
    value === "inventory.debug.adjust_cash"
  ) {
    return value;
  }
  throw new TypeError("invalid Inventory proposal kind");
}

function canonicalValuesEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.length === rightBytes.length &&
    leftBytes.every((byte, index) => byte === rightBytes[index])
  );
}

function appendedLedgerEntriesV1(
  before: InventoryStateV1,
  after: InventoryStateV1,
): readonly LedgerEntryV1[] {
  if (after.ledger.length < before.ledger.length) {
    throw new TypeError("Inventory proposal removes ledger entries");
  }
  if (!canonicalValuesEqualV1(after.ledger.slice(0, before.ledger.length), before.ledger)) {
    throw new TypeError("Inventory proposal rewrites ledger history");
  }
  return after.ledger.slice(before.ledger.length);
}

function checkedSafeIntegerSumV1(values: readonly SafeInteger[], label: string): SafeInteger {
  let total = 0;
  for (const value of values) {
    if (
      (value > 0 && total > Number.MAX_SAFE_INTEGER - value) ||
      (value < 0 && total < Number.MIN_SAFE_INTEGER - value)
    ) {
      throw new TypeError(`${label} exceeds safe integer bounds`);
    }
    total += value;
  }
  return parseSafeInteger(total);
}

function assertCashFactConsistencyV1(
  before: InventoryStateV1,
  after: InventoryStateV1,
  appendedEntries: readonly LedgerEntryV1[],
  facts: readonly PocInventoryGameplayFactV1[],
): void {
  const cashFact = facts.find(
    (fact): fact is Extract<PocInventoryGameplayFactV1, { readonly kind: "cash.changed" }> =>
      fact.kind === "cash.changed",
  );
  const delta = checkedSafeIntegerSumV1(
    appendedEntries.map(({ cashDelta }) => cashDelta),
    "Inventory proposal cash delta",
  );
  if (after.cash - before.cash !== delta) {
    throw new TypeError("Inventory proposal cash and ledger mismatch");
  }
  if (cashFact === undefined) {
    if (delta !== 0) throw new TypeError("Inventory cash change is missing its Fact");
    return;
  }
  if (
    cashFact.value.before !== before.cash ||
    cashFact.value.after !== after.cash ||
    cashFact.delta !== delta ||
    !canonicalValuesEqualV1(
      cashFact.entryIds,
      appendedEntries.map(({ entryId }) => entryId),
    )
  ) {
    throw new TypeError("Inventory cash change Fact is inconsistent");
  }
}

function assertProposalFactKindsV1(
  kind: PocInventoryOwnerProposalPayloadV1["kind"],
  facts: readonly PocInventoryGameplayFactV1[],
): void {
  const kinds = facts.map((fact) => fact.kind);
  const exact = (expected: readonly PocInventoryGameplayFactV1["kind"][]): boolean =>
    canonicalValuesEqualV1(kinds, expected);
  if (kind === "inventory.purchase" && exact(["inventory.purchased", "cash.changed"])) return;
  if (kind === "inventory.consume" && exact(["inventory.consumed"])) return;
  if (kind === "inventory.grant" && exact(["inventory.ingredient_granted"])) return;
  if (kind === "inventory.item.grant" && exact(["inventory.item_granted"])) return;
  if (kind === "inventory.item.consume" && exact(["inventory.item_consumed"])) return;
  if (kind === "inventory.spoil" && (facts.length === 0 || exact(["inventory.spoiled"]))) return;
  if (kind === "inventory.ledger.append" && (facts.length === 0 || exact(["cash.changed"]))) {
    return;
  }
  if (kind === "inventory.debug.adjust_cash" && exact(["cash.changed"])) return;
  throw new TypeError("invalid Inventory owner proposal Fact order");
}

function inventoryBatchByIdV1(
  batches: readonly InventoryBatchV1[],
): ReadonlyMap<BatchId, InventoryBatchV1> {
  return new Map(batches.map((batch) => [batch.batchId, batch]));
}

function assertUnchangedInventoryBatchesV1(
  before: readonly InventoryBatchV1[],
  after: readonly InventoryBatchV1[],
  label: string,
): void {
  if (!canonicalValuesEqualV1(before, after)) {
    throw new TypeError(`${label} changes Inventory batches`);
  }
}

function assertUnchangedInventoryItemsV1(
  before: readonly ItemStackV1[],
  after: readonly ItemStackV1[],
  label: string,
): void {
  if (!canonicalValuesEqualV1(before, after)) {
    throw new TypeError(`${label} changes Inventory item stacks`);
  }
}

function inventorySourceMatchesReasonV1(
  source: InventorySourceRefV1,
  reason: ChangeReasonV1,
): boolean {
  return (
    (source.kind === "story_action" &&
      reason.kind === "story_action" &&
      source.actionId === reason.actionId) ||
    (source.kind === "world_action" &&
      reason.kind === "world_action" &&
      source.actionId === reason.actionId) ||
    (source.kind === "story_event" &&
      reason.kind === "event" &&
      source.eventId === reason.eventId) ||
    (source.kind === "debug" && reason.kind === "debug" && source.reasonId === reason.reasonId)
  );
}

function inventorySubjectMatchesSourceV1(
  subject: LedgerSubjectV1,
  source: InventorySourceRefV1,
): boolean {
  if (source.kind === "story_action" || source.kind === "world_action") {
    return subject.kind === "action" && subject.actionId === source.actionId;
  }
  if (source.kind === "story_event") {
    return subject.kind === "event" && subject.eventId === source.eventId;
  }
  return source.kind === "debug" && subject.kind === "debug";
}

function assertAcquisitionProposalV1(
  before: InventoryStateV1,
  after: InventoryStateV1,
  fact: Extract<
    PocInventoryGameplayFactV1,
    { readonly kind: "inventory.purchased" | "inventory.ingredient_granted" }
  >,
): void {
  const beforeById = inventoryBatchByIdV1(before.ingredientBatches);
  const afterById = inventoryBatchByIdV1(after.ingredientBatches);
  const createdIds = new Set(fact.createdBatchIds);
  if (
    createdIds.size !== fact.createdBatchIds.length ||
    after.ingredientBatches.length !== before.ingredientBatches.length + createdIds.size
  ) {
    throw new TypeError("Inventory acquisition proposal has invalid created batches");
  }
  for (const batch of before.ingredientBatches) {
    if (!canonicalValuesEqualV1(afterById.get(batch.batchId), batch)) {
      throw new TypeError("Inventory acquisition proposal rewrites an existing batch");
    }
  }
  for (let index = 0; index < fact.createdBatchIds.length; index += 1) {
    const batchId = fact.createdBatchIds[index];
    const line = fact.lines[index];
    const entry = fact.entries[index];
    if (batchId === undefined || line === undefined || entry === undefined) {
      throw new TypeError("Inventory acquisition proposal cardinality mismatch");
    }
    const batch = afterById.get(batchId);
    if (
      beforeById.has(batchId) ||
      batch === undefined ||
      batch.ingredientId !== line.ingredientId ||
      batch.quantity !== line.quantity ||
      entry.quantity !== line.quantity ||
      entry.reasonId === undefined
    ) {
      throw new TypeError("Inventory acquisition Fact does not match its created batch");
    }
    if (fact.kind === "inventory.purchased") {
      if (
        batch.source.kind !== "purchase" ||
        entry.category !== "purchase" ||
        entry.subject.kind !== "ingredient" ||
        entry.subject.ingredientId !== line.ingredientId ||
        entry.cashDelta > 0 ||
        entry.valuationDelta < 0 ||
        entry.cashDelta !== 0 - entry.valuationDelta
      ) {
        throw new TypeError("Inventory purchase proposal has inconsistent valuation evidence");
      }
    } else if (
      !inventorySourceMatchesReasonV1(batch.source, fact.reason) ||
      !inventorySubjectMatchesSourceV1(entry.subject, batch.source) ||
      entry.category !== "story_reward" ||
      entry.reasonId !== fact.reason.reasonId ||
      entry.cashDelta !== 0 ||
      entry.valuationDelta <= 0
    ) {
      throw new TypeError("Inventory grant proposal has inconsistent source evidence");
    }
  }
  for (const batch of after.ingredientBatches) {
    if (!beforeById.has(batch.batchId) && !createdIds.has(batch.batchId)) {
      throw new TypeError("Inventory acquisition proposal adds an undeclared batch");
    }
  }
}

function assertConsumeProposalV1(
  before: InventoryStateV1,
  after: InventoryStateV1,
  fact: Extract<PocInventoryGameplayFactV1, { readonly kind: "inventory.consumed" }>,
): void {
  const consumedByBatch = new Map<BatchId, BatchConsumptionV1>();
  const beforeById = inventoryBatchByIdV1(before.ingredientBatches);
  const afterById = inventoryBatchByIdV1(after.ingredientBatches);
  for (const line of fact.lines) {
    const batch = beforeById.get(line.batchId);
    if (
      consumedByBatch.has(line.batchId) ||
      batch === undefined ||
      batch.ingredientId !== line.ingredientId ||
      line.quantity > batch.quantity
    ) {
      throw new TypeError("Inventory consume Fact has an invalid batch slice");
    }
    consumedByBatch.set(line.batchId, line);
  }
  let expectedAfterCount = before.ingredientBatches.length;
  for (const batch of before.ingredientBatches) {
    const consumed = consumedByBatch.get(batch.batchId)?.quantity ?? 0;
    const remaining = batch.quantity - consumed;
    const actual = afterById.get(batch.batchId);
    if (remaining === 0) {
      expectedAfterCount -= 1;
      if (actual !== undefined) {
        throw new TypeError("Inventory consume proposal retains an exhausted batch");
      }
    } else if (
      actual === undefined ||
      !canonicalValuesEqualV1(actual, { ...batch, quantity: remaining })
    ) {
      throw new TypeError("Inventory consume proposal has an inconsistent batch remainder");
    }
  }
  if (after.ingredientBatches.length !== expectedAfterCount) {
    throw new TypeError("Inventory consume proposal adds or removes an unrelated batch");
  }
}

function assertItemProposalV1(
  before: InventoryStateV1,
  after: InventoryStateV1,
  fact: Extract<
    PocInventoryGameplayFactV1,
    { readonly kind: "inventory.item_granted" | "inventory.item_consumed" }
  >,
): void {
  const expected = new Map<string, number>(
    before.itemStacks.map((stack) => [stack.itemId, stack.quantity]),
  );
  const seen = new Set<string>();
  for (const line of fact.lines) {
    if (seen.has(line.itemId)) throw new TypeError("Inventory item Fact has a duplicate line");
    seen.add(line.itemId);
    const current = expected.get(line.itemId) ?? 0;
    if (fact.kind === "inventory.item_granted") {
      if (current > Number.MAX_SAFE_INTEGER - line.quantity) {
        throw new TypeError("Inventory item Fact exceeds safe integer bounds");
      }
      expected.set(line.itemId, current + line.quantity);
    } else {
      if (current < line.quantity) {
        throw new TypeError("Inventory item consume Fact exceeds available quantity");
      }
      const remaining = current - line.quantity;
      if (remaining === 0) expected.delete(line.itemId);
      else expected.set(line.itemId, remaining);
    }
  }
  if (after.itemStacks.length !== expected.size) {
    throw new TypeError("Inventory item proposal changes an unrelated stack");
  }
  for (const stack of after.itemStacks) {
    if (expected.get(stack.itemId) !== stack.quantity) {
      throw new TypeError("Inventory item proposal does not match its Fact");
    }
  }
}

function assertSpoilProposalV1(
  before: InventoryStateV1,
  after: InventoryStateV1,
  fact: Extract<PocInventoryGameplayFactV1, { readonly kind: "inventory.spoiled" }> | undefined,
  appendedEntries: readonly LedgerEntryV1[],
): void {
  if (fact === undefined) {
    if (appendedEntries.length !== 0) {
      throw new TypeError("Inventory no-op spoil proposal appends ledger entries");
    }
    assertUnchangedInventoryBatchesV1(
      before.ingredientBatches,
      after.ingredientBatches,
      "Inventory spoil proposal",
    );
    return;
  }
  if (!canonicalValuesEqualV1(fact.entries, appendedEntries)) {
    throw new TypeError("Inventory spoil proposal ledger does not match its Fact");
  }
  const beforeById = inventoryBatchByIdV1(before.ingredientBatches);
  const afterById = inventoryBatchByIdV1(after.ingredientBatches);
  const removed = new Set<BatchId>();
  for (let index = 0; index < fact.lines.length; index += 1) {
    const line = fact.lines[index];
    const entry = fact.entries[index];
    if (line === undefined || entry === undefined) {
      throw new TypeError("Inventory spoil proposal cardinality mismatch");
    }
    const batch = beforeById.get(line.batchId);
    if (
      removed.has(line.batchId) ||
      batch === undefined ||
      line.ingredientId !== batch.ingredientId ||
      line.quantity !== batch.quantity ||
      entry.category !== "spoiled_ingredient" ||
      entry.cashDelta !== 0 ||
      entry.valuationDelta >= 0 ||
      entry.subject.kind !== "ingredient" ||
      entry.subject.ingredientId !== line.ingredientId ||
      entry.quantity !== line.quantity
    ) {
      throw new TypeError("Inventory spoil Fact does not match its removed batch");
    }
    removed.add(line.batchId);
  }
  const expectedOrder = [...removed]
    .map((batchId) => beforeById.get(batchId))
    .filter((batch): batch is InventoryBatchV1 => batch !== undefined)
    .sort(comparePocInventoryFifoBatchesV1)
    .map(({ batchId }) => batchId);
  if (
    !canonicalValuesEqualV1(
      expectedOrder,
      fact.lines.map(({ batchId }) => batchId),
    )
  ) {
    throw new TypeError("Inventory spoil Fact is not in FIFO order");
  }
  if (after.ingredientBatches.length !== before.ingredientBatches.length - removed.size) {
    throw new TypeError("Inventory spoil proposal changes an unrelated batch");
  }
  for (const batch of before.ingredientBatches) {
    const actual = afterById.get(batch.batchId);
    if (
      removed.has(batch.batchId) ? actual !== undefined : !canonicalValuesEqualV1(actual, batch)
    ) {
      throw new TypeError("Inventory spoil proposal does not remove exactly its Fact batches");
    }
  }
}

function assertColdStorageBatchTransitionV1(
  before: readonly InventoryBatchV1[],
  after: readonly InventoryBatchV1[],
): void {
  const afterById = inventoryBatchByIdV1(after);
  if (before.length !== after.length) {
    throw new TypeError("Inventory facility ledger proposal adds or removes batches");
  }
  for (const batch of before) {
    const next = afterById.get(batch.batchId);
    if (next === undefined) throw new TypeError("Inventory facility ledger proposal loses a batch");
    if (canonicalValuesEqualV1(batch, next)) continue;
    if (
      batch.refrigerationExtended ||
      !next.refrigerationExtended ||
      next.lastUsableDay <= batch.lastUsableDay ||
      next.ingredientId !== batch.ingredientId ||
      next.quantity !== batch.quantity ||
      next.acquiredDay !== batch.acquiredDay ||
      !canonicalValuesEqualV1(next.source, batch.source)
    ) {
      throw new TypeError(
        "Inventory facility ledger proposal has an invalid cold-storage transition",
      );
    }
  }
}

function ledgerSubjectMatchesReasonV1(subject: LedgerSubjectV1, reason: ChangeReasonV1): boolean {
  if (reason.kind === "story_action" || reason.kind === "world_action") {
    return subject.kind === "action" && subject.actionId === reason.actionId;
  }
  if (reason.kind === "event") {
    return subject.kind === "event" && subject.eventId === reason.eventId;
  }
  return false;
}

function assertLedgerAppendEntrySemanticsV1(
  entry: LedgerEntryV1,
  reason: ChangeReasonV1 | undefined,
): void {
  const noQuantity = entry.quantity === undefined;
  if (
    entry.category === "purchase" ||
    entry.category === "spoiled_ingredient" ||
    entry.category === "debug_adjustment"
  ) {
    throw new TypeError("Inventory ledger proposal uses a dedicated-operation category");
  }
  if (entry.category === "facility") return;
  if (entry.category === "wage" || entry.category === "opening_fee") {
    if (
      entry.subject.kind !== "service_mode" ||
      entry.cashDelta > 0 ||
      entry.valuationDelta !== 0 ||
      !noQuantity ||
      (reason !== undefined &&
        (reason.kind !== "command" || reason.commandKind !== "tavern.opening.start"))
    ) {
      throw new TypeError("Inventory service-cost ledger proposal is inconsistent");
    }
    return;
  }
  if (entry.category === "revenue") {
    if (
      entry.subject.kind !== "recipe" ||
      entry.cashDelta < 0 ||
      entry.valuationDelta > 0 ||
      entry.quantity === undefined ||
      (reason !== undefined &&
        (reason.kind !== "command" || reason.commandKind !== "tavern.opening.finalize"))
    ) {
      throw new TypeError("Inventory revenue ledger proposal is inconsistent");
    }
    return;
  }
  if (entry.category === "discarded_food") {
    if (
      entry.subject.kind !== "recipe" ||
      entry.cashDelta !== 0 ||
      entry.valuationDelta >= 0 ||
      entry.quantity === undefined ||
      (reason !== undefined &&
        (reason.kind !== "command" || reason.commandKind !== "tavern.opening.finalize"))
    ) {
      throw new TypeError("Inventory discarded-food ledger proposal is inconsistent");
    }
    return;
  }
  if (entry.category === "world_action") {
    if (
      entry.subject.kind !== "action" ||
      entry.cashDelta > 0 ||
      entry.valuationDelta !== 0 ||
      !noQuantity ||
      (reason !== undefined &&
        (reason.kind !== "world_action" || reason.actionId !== entry.subject.actionId))
    ) {
      throw new TypeError("Inventory WorldAction ledger proposal is inconsistent");
    }
    return;
  }
  if (entry.category === "levy") {
    if (
      entry.subject.kind !== "levy" ||
      entry.cashDelta > 0 ||
      entry.valuationDelta !== 0 ||
      !noQuantity ||
      (reason !== undefined && (reason.kind !== "command" || reason.commandKind !== "levy.pay"))
    ) {
      throw new TypeError("Inventory levy ledger proposal is inconsistent");
    }
    return;
  }
  const signMatches = entry.category === "story_cost" ? entry.cashDelta <= 0 : entry.cashDelta >= 0;
  if (
    (entry.subject.kind !== "action" && entry.subject.kind !== "event") ||
    !signMatches ||
    entry.valuationDelta !== 0 ||
    !noQuantity ||
    (reason !== undefined && !ledgerSubjectMatchesReasonV1(entry.subject, reason))
  ) {
    throw new TypeError("Inventory Story ledger proposal is inconsistent");
  }
}

function assertLedgerProposalV1(
  before: InventoryStateV1,
  after: InventoryStateV1,
  appendedEntries: readonly LedgerEntryV1[],
  facts: readonly PocInventoryGameplayFactV1[],
): void {
  if (appendedEntries.length === 0) {
    throw new TypeError("Inventory ledger proposal must append evidence");
  }
  const cashDelta = checkedSafeIntegerSumV1(
    appendedEntries.map(({ cashDelta: delta }) => delta),
    "Inventory ledger proposal cash delta",
  );
  const cashFact = facts[0]?.kind === "cash.changed" ? facts[0] : undefined;
  if ((cashDelta === 0) !== (cashFact === undefined)) {
    throw new TypeError("Inventory ledger proposal has an unexpected cash Fact");
  }
  const reasonId = appendedEntries[0]?.reasonId;
  if (
    reasonId === undefined ||
    appendedEntries.some((entry) => entry.reasonId !== reasonId) ||
    (cashFact !== undefined && cashFact.reason.reasonId !== reasonId)
  ) {
    throw new TypeError("Inventory ledger proposal has inconsistent reasons");
  }
  for (const entry of appendedEntries) {
    assertLedgerAppendEntrySemanticsV1(entry, cashFact?.reason);
  }
  const facilityEntry =
    appendedEntries.length === 1 && appendedEntries[0]?.category === "facility"
      ? appendedEntries[0]
      : undefined;
  if (facilityEntry === undefined) {
    if (appendedEntries.some((entry) => entry.category === "facility")) {
      throw new TypeError("Inventory facility ledger proposal must append exactly one entry");
    }
    assertUnchangedInventoryBatchesV1(
      before.ingredientBatches,
      after.ingredientBatches,
      "Inventory ledger proposal",
    );
  } else {
    if (
      facilityEntry.subject.kind !== "facility" ||
      facilityEntry.cashDelta > 0 ||
      facilityEntry.valuationDelta !== 0 ||
      facilityEntry.quantity !== undefined
    ) {
      throw new TypeError("Inventory facility ledger proposal has invalid evidence");
    }
    if (
      cashFact !== undefined &&
      (cashFact.reason.kind !== "facility" ||
        cashFact.reason.facilityId !== facilityEntry.subject.facilityId ||
        cashFact.reason.reasonId !== facilityEntry.reasonId)
    ) {
      throw new TypeError("Inventory facility ledger proposal has invalid provenance");
    }
    assertColdStorageBatchTransitionV1(before.ingredientBatches, after.ingredientBatches);
  }
}

function assertDebugCashProposalV1(
  before: InventoryStateV1,
  after: InventoryStateV1,
  appendedEntries: readonly LedgerEntryV1[],
  fact: Extract<PocInventoryGameplayFactV1, { readonly kind: "cash.changed" }> | undefined,
): void {
  const entry = appendedEntries[0];
  if (
    appendedEntries.length !== 1 ||
    entry === undefined ||
    fact === undefined ||
    fact.reason.kind !== "debug" ||
    fact.reason.commandKind !== "debug.inventory.adjust_cash" ||
    entry.category !== "debug_adjustment" ||
    entry.reasonId !== fact.reason.reasonId ||
    entry.cashDelta !== fact.delta ||
    entry.valuationDelta !== 0 ||
    entry.subject.kind !== "debug" ||
    entry.quantity !== undefined
  ) {
    throw new TypeError("Inventory debug cash proposal has invalid ledger evidence");
  }
  assertUnchangedInventoryBatchesV1(
    before.ingredientBatches,
    after.ingredientBatches,
    "Inventory debug cash proposal",
  );
  assertUnchangedInventoryItemsV1(
    before.itemStacks,
    after.itemStacks,
    "Inventory debug cash proposal",
  );
}

function assertProposalConsistencyV1(proposal: PocInventoryOwnerProposalV1): void {
  const { after, before, kind } = proposal.payload;
  if (before.startingCash !== after.startingCash) {
    throw new TypeError("Inventory proposal changes startingCash");
  }
  assertProposalFactKindsV1(kind, proposal.facts);
  const appendedEntries = appendedLedgerEntriesV1(before, after);
  assertCashFactConsistencyV1(before, after, appendedEntries, proposal.facts);

  if (kind === "inventory.purchase") {
    const fact = proposal.facts[0];
    if (
      fact?.kind !== "inventory.purchased" ||
      !canonicalValuesEqualV1(fact.entries, appendedEntries) ||
      !canonicalValuesEqualV1(before.itemStacks, after.itemStacks)
    ) {
      throw new TypeError("Inventory purchase proposal is inconsistent");
    }
    const cashFact = proposal.facts[1];
    if (
      cashFact?.kind !== "cash.changed" ||
      cashFact.reason.kind !== "command" ||
      cashFact.reason.commandKind !== "inventory.buy" ||
      appendedEntries.some((entry) => entry.reasonId !== cashFact.reason.reasonId)
    ) {
      throw new TypeError("Inventory purchase proposal has invalid cash provenance");
    }
    assertAcquisitionProposalV1(before, after, fact);
  } else if (kind === "inventory.consume") {
    const fact = proposal.facts[0];
    if (
      fact?.kind !== "inventory.consumed" ||
      appendedEntries.length !== 0 ||
      before.cash !== after.cash ||
      !canonicalValuesEqualV1(before.itemStacks, after.itemStacks)
    ) {
      throw new TypeError("Inventory consume proposal is inconsistent");
    }
    assertConsumeProposalV1(before, after, fact);
  } else if (kind === "inventory.grant") {
    const fact = proposal.facts[0];
    if (
      fact?.kind !== "inventory.ingredient_granted" ||
      !canonicalValuesEqualV1(fact.entries, appendedEntries) ||
      before.cash !== after.cash ||
      !canonicalValuesEqualV1(before.itemStacks, after.itemStacks)
    ) {
      throw new TypeError("Inventory grant proposal is inconsistent");
    }
    assertAcquisitionProposalV1(before, after, fact);
  } else if (kind === "inventory.item.grant" || kind === "inventory.item.consume") {
    const fact = proposal.facts[0];
    if (
      (fact?.kind !== "inventory.item_granted" && fact?.kind !== "inventory.item_consumed") ||
      (kind === "inventory.item.grant") !== (fact.kind === "inventory.item_granted") ||
      appendedEntries.length !== 0 ||
      before.cash !== after.cash ||
      !canonicalValuesEqualV1(before.ingredientBatches, after.ingredientBatches)
    ) {
      throw new TypeError("Inventory item proposal is inconsistent");
    }
    assertItemProposalV1(before, after, fact);
  } else if (kind === "inventory.spoil") {
    const fact = proposal.facts[0];
    if (
      before.cash !== after.cash ||
      !canonicalValuesEqualV1(before.itemStacks, after.itemStacks) ||
      (fact !== undefined &&
        (fact.kind !== "inventory.spoiled" ||
          !canonicalValuesEqualV1(fact.entries, appendedEntries)))
    ) {
      throw new TypeError("Inventory spoil proposal is inconsistent");
    }
    assertSpoilProposalV1(
      before,
      after,
      fact?.kind === "inventory.spoiled" ? fact : undefined,
      appendedEntries,
    );
  } else if (kind === "inventory.debug.adjust_cash") {
    const fact = proposal.facts[0];
    assertDebugCashProposalV1(
      before,
      after,
      appendedEntries,
      fact?.kind === "cash.changed" ? fact : undefined,
    );
  } else {
    assertUnchangedInventoryItemsV1(
      before.itemStacks,
      after.itemStacks,
      "Inventory ledger proposal",
    );
    assertLedgerProposalV1(before, after, appendedEntries, proposal.facts);
  }

  const violations = pocInventoryInvariantV1.check(after, after);
  if (violations.length > 0) throw new TypeError("Inventory proposal violates local invariants");
}

export const pocInventoryOwnerProposalSchemaV1: RuntimeSchemaV1<PocInventoryOwnerProposalV1> =
  Object.freeze({
    parse(value: unknown): PocInventoryOwnerProposalV1 {
      const proposal = exactDataObjectV1(value, ["payload", "facts"], "Inventory owner proposal");
      const payloadValue = exactDataObjectV1(
        dataPropertyV1(proposal, "payload", "Inventory owner proposal"),
        ["kind", "before", "after"],
        "Inventory owner proposal payload",
      );
      const parsed = deepFreezePocValueV1({
        payload: {
          kind: parseProposalKindV1(
            dataPropertyV1(payloadValue, "kind", "Inventory owner proposal payload"),
          ),
          before: pocInventoryStateSchemaV1.parse(
            dataPropertyV1(payloadValue, "before", "Inventory owner proposal payload"),
          ),
          after: pocInventoryStateSchemaV1.parse(
            dataPropertyV1(payloadValue, "after", "Inventory owner proposal payload"),
          ),
        },
        facts: exactDataArrayV1(
          dataPropertyV1(proposal, "facts", "Inventory owner proposal"),
          "Inventory owner proposal Facts",
        ).map(parseInventoryFactV1),
      }) satisfies PocInventoryOwnerProposalV1;
      assertProposalConsistencyV1(parsed);
      return parsed;
    },
  });

function ledgerEntryIdPartsV1(entryId: LedgerEntryId): readonly [number, number] {
  const [, sequenceValue, indexValue] = entryId.split(":");
  if (sequenceValue === undefined || indexValue === undefined) {
    throw new TypeError("invalid LedgerEntryId");
  }
  return [Number(sequenceValue), Number(indexValue)];
}

export function comparePocInventoryLedgerEntryIdsV1(
  left: LedgerEntryId,
  right: LedgerEntryId,
): number {
  const [leftSequence, leftIndex] = ledgerEntryIdPartsV1(left);
  const [rightSequence, rightIndex] = ledgerEntryIdPartsV1(right);
  return leftSequence === rightSequence ? leftIndex - rightIndex : leftSequence - rightSequence;
}

export function comparePocInventoryFifoBatchesV1(
  left: InventoryBatchV1,
  right: InventoryBatchV1,
): number {
  if (left.lastUsableDay !== right.lastUsableDay) {
    return left.lastUsableDay - right.lastUsableDay;
  }
  if (left.acquiredDay !== right.acquiredDay) return left.acquiredDay - right.acquiredDay;
  return comparePocInventoryBatchIdsV1(left.batchId, right.batchId);
}

export function sortPocInventoryBatchesV1(
  batches: readonly DeepReadonly<InventoryBatchV1>[],
): readonly InventoryBatchV1[] {
  return deepFreezePocValueV1(
    batches
      .map((batch) => parsePocInventoryBatchV1(batch))
      .sort((left, right) => comparePocInventoryBatchIdsV1(left.batchId, right.batchId)),
  );
}

export function sortPocInventoryItemStacksV1(
  itemStacks: readonly DeepReadonly<ItemStackV1>[],
): readonly ItemStackV1[] {
  return deepFreezePocValueV1(
    itemStacks
      .map((stack) => parsePocInventoryItemStackV1(stack))
      .sort((left, right) => compareStableIdsV1(left.itemId, right.itemId)),
  );
}

export function pocInventoryStatesEqualV1(
  left: DeepReadonly<InventoryStateV1>,
  right: DeepReadonly<InventoryStateV1>,
): boolean {
  return canonicalValuesEqualV1(left, right);
}

type PocInventoryInvariantViolationV1 =
  | {
      readonly code: "collection.duplicate_id";
      readonly details: { readonly collection: string; readonly id: string };
    }
  | {
      readonly code: "collection.unstable_order";
      readonly details: { readonly collection: string; readonly id: string };
    }
  | {
      readonly code: "snapshot.schema";
      readonly details: { readonly collection: string; readonly id: string };
    }
  | {
      readonly code: "ledger.unbalanced";
      readonly details: {
        readonly startingCash: Money;
        readonly cash: Money;
        readonly computedCash: number | null;
      };
    };

const noInventoryInvariantViolationsV1: readonly PocInventoryInvariantViolationV1[] = Object.freeze(
  [],
);

function batchHasValidProvenanceV1(batch: InventoryBatchV1): boolean {
  const [sequence] = batchIdPartsV1(batch.batchId);
  if (batch.source.kind === "initial") return sequence === "initial";
  if (sequence === "initial") return false;
  return batch.source.kind !== "purchase" || sequence === batch.source.commandSequence;
}

function inventoryLedgerBalanceV1(state: InventoryStateV1): number | null {
  let delta = 0;
  for (const entry of state.ledger) {
    if (
      (entry.cashDelta > 0 && delta > Number.MAX_SAFE_INTEGER - entry.cashDelta) ||
      (entry.cashDelta < 0 && delta < Number.MIN_SAFE_INTEGER - entry.cashDelta)
    ) {
      return null;
    }
    delta += entry.cashDelta;
  }
  if (
    (delta > 0 && state.startingCash > Number.MAX_SAFE_INTEGER - delta) ||
    (delta < 0 && state.startingCash < 0 - delta)
  ) {
    return null;
  }
  return state.startingCash + delta;
}

export const pocInventoryInvariantV1 = Object.freeze({
  check(
    stateValue: DeepReadonly<InventoryStateV1>,
    _readPort: PocInventoryReadPortV1,
  ): readonly PocInventoryInvariantViolationV1[] {
    const state = pocInventoryStateSchemaV1.parse(stateValue);
    const violations: PocInventoryInvariantViolationV1[] = [];

    const batchIds = new Set<BatchId>();
    let previousBatchId: BatchId | null = null;
    for (const batch of state.ingredientBatches) {
      if (batchIds.has(batch.batchId)) {
        violations.push(
          deepFreezePocValueV1({
            code: "collection.duplicate_id" as const,
            details: { collection: "inventory.ingredientBatches", id: batch.batchId },
          }),
        );
      }
      batchIds.add(batch.batchId);
      if (
        previousBatchId !== null &&
        comparePocInventoryBatchIdsV1(previousBatchId, batch.batchId) >= 0
      ) {
        violations.push(
          deepFreezePocValueV1({
            code: "collection.unstable_order" as const,
            details: { collection: "inventory.ingredientBatches", id: batch.batchId },
          }),
        );
      }
      previousBatchId = batch.batchId;
      if (batch.acquiredDay > batch.lastUsableDay || !batchHasValidProvenanceV1(batch)) {
        violations.push(
          deepFreezePocValueV1({
            code: "snapshot.schema" as const,
            details: { collection: "inventory.ingredientBatches", id: batch.batchId },
          }),
        );
      }
    }

    const itemIds = new Set<string>();
    let previousItemId: string | null = null;
    for (const stack of state.itemStacks) {
      if (itemIds.has(stack.itemId)) {
        violations.push(
          deepFreezePocValueV1({
            code: "collection.duplicate_id" as const,
            details: { collection: "inventory.itemStacks", id: stack.itemId },
          }),
        );
      }
      itemIds.add(stack.itemId);
      if (previousItemId !== null && compareStableIdsV1(previousItemId, stack.itemId) >= 0) {
        violations.push(
          deepFreezePocValueV1({
            code: "collection.unstable_order" as const,
            details: { collection: "inventory.itemStacks", id: stack.itemId },
          }),
        );
      }
      previousItemId = stack.itemId;
    }

    const ledgerEntryIds = new Set<LedgerEntryId>();
    let previousLedgerEntryId: LedgerEntryId | null = null;
    for (const entry of state.ledger) {
      if (ledgerEntryIds.has(entry.entryId)) {
        violations.push(
          deepFreezePocValueV1({
            code: "collection.duplicate_id" as const,
            details: { collection: "inventory.ledger", id: entry.entryId },
          }),
        );
      }
      ledgerEntryIds.add(entry.entryId);
      if (
        previousLedgerEntryId !== null &&
        comparePocInventoryLedgerEntryIdsV1(previousLedgerEntryId, entry.entryId) >= 0
      ) {
        violations.push(
          deepFreezePocValueV1({
            code: "collection.unstable_order" as const,
            details: { collection: "inventory.ledger", id: entry.entryId },
          }),
        );
      }
      previousLedgerEntryId = entry.entryId;
    }

    const computedCash = inventoryLedgerBalanceV1(state);
    if (computedCash === null || computedCash !== state.cash) {
      violations.push(
        deepFreezePocValueV1({
          code: "ledger.unbalanced" as const,
          details: { startingCash: state.startingCash, cash: state.cash, computedCash },
        }),
      );
    }

    return violations.length === 0
      ? noInventoryInvariantViolationsV1
      : deepFreezePocValueV1(violations);
  },
});

export function assertValidInitialPocInventoryStateV1(
  stateValue: DeepReadonly<InventoryStateV1>,
): void {
  const state = pocInventoryStateSchemaV1.parse(stateValue);
  if (state.startingCash !== state.cash || state.ledger.length !== 0) {
    throw new TypeError("invalid initial Inventory cash or ledger");
  }
  state.ingredientBatches.forEach((batch, index) => {
    if (batch.source.kind !== "initial" || batch.batchId !== `batch:initial:${index}`) {
      throw new TypeError("invalid initial Inventory batch provenance");
    }
  });
  const violations = pocInventoryInvariantV1.check(state, state);
  if (violations.length > 0) throw new TypeError("invalid initial Inventory invariants");
}
