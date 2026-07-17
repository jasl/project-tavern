// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import "@testing-library/jest-dom/vitest";

import type { DeepReadonly, TextId } from "@sillymaker/base";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PocSemanticGamePortV1 } from "../../application/create-poc-semantic-port.js";
import {
  choiceIdsV1,
  endingIdsV1,
  facilityIdsV1,
  ingredientIdsV1,
  outcomeIdsV1,
  pocTextIdsV1,
  policyIdsV1,
  reasonIdsV1,
  recipeIdsV1,
} from "../../content/ids.js";
import {
  parseAbsoluteDayIndex,
  parseDayIndex,
  parseMoney,
  parseMoodPoint,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseQuantity,
  parseSafeInteger,
  type PocFacilitiesProjectionV1,
  type PocGameViewV1,
  type PocInventoryProjectionV1,
  type PocLedgerProjectionV1,
  type RelationshipStateV1,
} from "../../gameplay/index.js";
import {
  parsePocSemanticInvocationV1,
  type PocSemanticActionDescriptorV1,
  type PocSemanticInvocationV1,
  type PocSemanticPreviewV1,
} from "../semantic-actions.js";
import { pocZhCnTextCatalogV1 } from "../text-catalogs/zh-CN.js";
import { FacilityOverlayV1 } from "./FacilityOverlay.js";
import { InventoryOverlayV1 } from "./InventoryOverlay.js";
import { LedgerOverlayV1 } from "./LedgerOverlay.js";
import { PolicyOverlayV1 } from "./PolicyOverlay.js";
import { PurchaseOverlayV1 } from "./PurchaseOverlay.js";
import { RelationshipOverlayV1 } from "./RelationshipOverlay.js";
import { RunSummaryOverlayV1 } from "./RunSummaryOverlay.js";
import { TavernPlanOverlayV1 } from "./TavernPlanOverlay.js";
import { WorldActionOverlayV1 } from "./WorldActionOverlay.js";

afterEach(cleanup);

type DescriptorForV1<TActionId extends PocSemanticInvocationV1["actionId"]> = Extract<
  PocSemanticActionDescriptorV1,
  { readonly actionId: TActionId }
>;

const emptyConfirmationV1 = Object.freeze({
  benefitTextIds: Object.freeze([]),
  mutuallyExcludedActionIds: Object.freeze([]),
  majorRiskTextIds: Object.freeze([]),
});

const allowedPreviewV1 = Object.freeze({
  allowed: true,
  command: Object.freeze({ kind: "actor.rest" as const }),
  costs: Object.freeze({
    ap: parseNonNegativeSafeInteger(0),
    playerStamina: parseNonNegativeSafeInteger(0),
    heroineStamina: parseNonNegativeSafeInteger(0),
    cash: parseMoney(0),
  }),
  changes: Object.freeze([]),
  unknownReasonIds: Object.freeze([]),
  confirmation: emptyConfirmationV1,
}) satisfies PocSemanticPreviewV1;

const insufficientCashReasonV1 = Object.freeze({
  code: "inventory.insufficient_cash" as const,
  details: Object.freeze({ required: parseMoney(2), available: parseMoney(1) }),
});

const rejectedPreviewV1 = Object.freeze({
  allowed: false,
  command: Object.freeze({ kind: "inventory.buy" as const, lines: Object.freeze([]) }),
  reasons: Object.freeze([insufficientCashReasonV1]),
}) satisfies PocSemanticPreviewV1;

const textByIdV1 = new Map(
  pocZhCnTextCatalogV1.entries.map(({ textId, text }) => [textId, text] as const),
);

function createPresentationFixtureV1() {
  const text = vi.fn((textId: TextId) => {
    const value = textByIdV1.get(textId);
    if (value === undefined) throw new TypeError(`missing PoC test text ${textId}`);
    return Object.freeze({
      textId,
      requestedLocale: pocZhCnTextCatalogV1.locale,
      resolvedLocale: pocZhCnTextCatalogV1.locale,
      text: value,
    });
  });
  return Object.freeze({ text });
}

function createSemanticFixtureV1(
  previewResult: DeepReadonly<PocSemanticPreviewV1> = allowedPreviewV1,
) {
  const preview = vi.fn(
    async (_invocation: DeepReadonly<PocSemanticInvocationV1>) => previewResult,
  );
  const dispatch = vi.fn(async (_invocation: DeepReadonly<PocSemanticInvocationV1>) =>
    Object.freeze({ kind: "committed" as const }),
  );
  const semantic = Object.freeze({ preview, dispatch }) satisfies Pick<
    PocSemanticGamePortV1,
    "preview" | "dispatch"
  >;
  return Object.freeze({ semantic, preview, dispatch });
}

const balancedPolicyInvocationV1 = parsePocSemanticInvocationV1({
  kind: "invoke",
  actionId: "action.choose_life_policy",
  options: { policyId: policyIdsV1[0] },
});

const nightOwlPolicyInvocationV1 = parsePocSemanticInvocationV1({
  kind: "invoke",
  actionId: "action.choose_life_policy",
  options: { policyId: policyIdsV1[1] },
});

const policyDescriptorV1 = Object.freeze({
  actionId: "action.choose_life_policy",
  textId: pocTextIdsV1.actionChooseLifePolicyLabel,
  enabled: true,
  reasons: Object.freeze([]),
  confirmation: emptyConfirmationV1,
  delivery: "choices",
  directInvocation: null,
  options: Object.freeze([
    Object.freeze({
      optionId: policyIdsV1[0],
      textId: pocTextIdsV1.policyBalancedName,
      invocation: balancedPolicyInvocationV1,
    }),
    Object.freeze({
      optionId: policyIdsV1[1],
      textId: pocTextIdsV1.policyNightOwlName,
      invocation: nightOwlPolicyInvocationV1,
    }),
  ]),
  form: null,
}) as DeepReadonly<DescriptorForV1<"action.choose_life_policy">>;

const purchaseDescriptorV1 = Object.freeze({
  actionId: "action.purchase",
  textId: pocTextIdsV1.actionPurchaseLabel,
  enabled: true,
  reasons: Object.freeze([]),
  confirmation: emptyConfirmationV1,
  delivery: "form",
  directInvocation: null,
  options: Object.freeze([]),
  form: Object.freeze({
    kind: "purchase",
    actionId: "action.purchase",
    input: Object.freeze({
      lineLimit: parsePositiveSafeInteger(4),
      quantityPerLineLimit: parsePositiveSafeInteger(99),
      ingredients: Object.freeze([
        Object.freeze({
          ingredientId: ingredientIdsV1[0],
          nameTextId: pocTextIdsV1.ingredientCoarseGrainName,
          unitPrice: parseMoney(1),
          shelfLifeDays: parsePositiveSafeInteger(7),
          refrigeratable: false,
        }),
      ]),
    }),
  }),
}) as DeepReadonly<DescriptorForV1<"action.purchase">>;

const purchaseDescriptorWithTwoIngredientsV1 = Object.freeze({
  ...purchaseDescriptorV1,
  form: Object.freeze({
    ...purchaseDescriptorV1.form,
    input: Object.freeze({
      ...purchaseDescriptorV1.form.input,
      ingredients: Object.freeze([
        ...purchaseDescriptorV1.form.input.ingredients,
        Object.freeze({
          ...purchaseDescriptorV1.form.input.ingredients[0]!,
          ingredientId: ingredientIdsV1[1],
          nameTextId: pocTextIdsV1.ingredientRootVegetableName,
        }),
      ]),
    }),
  }),
}) as DeepReadonly<DescriptorForV1<"action.purchase">>;

const tavernPlanDescriptorV1 = Object.freeze({
  actionId: "action.service_plan",
  textId: pocTextIdsV1.actionServicePlanLabel,
  enabled: true,
  reasons: Object.freeze([]),
  confirmation: emptyConfirmationV1,
  delivery: "form",
  directInvocation: null,
  options: Object.freeze([]),
  form: Object.freeze({
    kind: "tavern_plan",
    actionId: "action.service_plan",
    input: Object.freeze({
      recipeLimit: parsePositiveSafeInteger(4),
      portionsPerRecipeLimit: parsePositiveSafeInteger(99),
      serviceModes: Object.freeze([
        Object.freeze({
          mode: "manual" as const,
          nameTextId: pocTextIdsV1.serviceModeManualName,
          apCost: parseNonNegativeSafeInteger(2),
          playerStaminaCost: parseNonNegativeSafeInteger(3),
          heroineStaminaCost: parseNonNegativeSafeInteger(3),
          wage: parseMoney(0),
          baseReceptionCapacity: parseNonNegativeSafeInteger(10),
          basePreparationPoints: parseNonNegativeSafeInteger(8),
          preparationPointsPerAction: parseNonNegativeSafeInteger(2),
          confirmation: emptyConfirmationV1,
        }),
      ]),
      recipes: Object.freeze([
        Object.freeze({
          recipeId: recipeIdsV1[0],
          nameTextId: pocTextIdsV1.recipeGrainRootPorridgeName,
          ingredients: Object.freeze([
            Object.freeze({
              ingredientId: ingredientIdsV1[0],
              quantity: parseQuantity(1),
            }),
          ]),
          salePrice: parseMoney(5),
          prepPoints: parsePositiveSafeInteger(1),
        }),
      ]),
    }),
  }),
}) as DeepReadonly<DescriptorForV1<"action.service_plan">>;

const tavernPlanDescriptorWithTwoRecipesV1 = Object.freeze({
  ...tavernPlanDescriptorV1,
  form: Object.freeze({
    ...tavernPlanDescriptorV1.form,
    input: Object.freeze({
      ...tavernPlanDescriptorV1.form.input,
      recipes: Object.freeze([
        ...tavernPlanDescriptorV1.form.input.recipes,
        Object.freeze({
          ...tavernPlanDescriptorV1.form.input.recipes[0]!,
          recipeId: recipeIdsV1[1],
          nameTextId: pocTextIdsV1.recipeAleBreadName,
        }),
      ]),
    }),
  }),
}) as DeepReadonly<DescriptorForV1<"action.service_plan">>;

const tavernPlanDescriptorWithClosedV1 = Object.freeze({
  ...tavernPlanDescriptorV1,
  form: Object.freeze({
    ...tavernPlanDescriptorV1.form,
    input: Object.freeze({
      ...tavernPlanDescriptorV1.form.input,
      serviceModes: Object.freeze([
        ...tavernPlanDescriptorV1.form.input.serviceModes,
        Object.freeze({
          ...tavernPlanDescriptorV1.form.input.serviceModes[0]!,
          mode: "closed" as const,
          nameTextId: pocTextIdsV1.serviceModeClosedName,
        }),
      ]),
    }),
  }),
}) as DeepReadonly<DescriptorForV1<"action.service_plan">>;

const buildFacilityInvocationV1 = parsePocSemanticInvocationV1({
  kind: "invoke",
  actionId: "action.facility_window",
  options: { choice: { kind: "build", facilityId: facilityIdsV1[0] } },
});

const skipFacilityInvocationV1 = parsePocSemanticInvocationV1({
  kind: "invoke",
  actionId: "action.facility_window",
  options: { choice: { kind: "skip" } },
});

const facilityDescriptorV1 = Object.freeze({
  actionId: "action.facility_window",
  textId: pocTextIdsV1.actionFacilityWindowLabel,
  enabled: true,
  reasons: Object.freeze([]),
  confirmation: emptyConfirmationV1,
  delivery: "choices",
  directInvocation: null,
  options: Object.freeze([
    Object.freeze({
      optionId: facilityIdsV1[0],
      textId: pocTextIdsV1.facilityColdStorageName,
      invocation: buildFacilityInvocationV1,
    }),
    Object.freeze({
      optionId: "skip",
      textId: pocTextIdsV1.choiceFacilitySkipLabel,
      invocation: skipFacilityInvocationV1,
    }),
  ]),
  form: null,
}) as DeepReadonly<DescriptorForV1<"action.facility_window">>;

const basicWorldInvocationV1 = parsePocSemanticInvocationV1({
  kind: "invoke",
  actionId: "action.old_trade_road",
  options: { optionId: choiceIdsV1[5] },
});

const preparedWorldInvocationV1 = parsePocSemanticInvocationV1({
  kind: "invoke",
  actionId: "action.old_trade_road",
  options: { optionId: choiceIdsV1[6] },
});

const worldActionDescriptorV1 = Object.freeze({
  actionId: "action.old_trade_road",
  textId: pocTextIdsV1.actionOldTradeRoadLabel,
  enabled: true,
  reasons: Object.freeze([]),
  confirmation: emptyConfirmationV1,
  delivery: "choices",
  directInvocation: null,
  options: Object.freeze([
    Object.freeze({
      optionId: choiceIdsV1[5],
      textId: pocTextIdsV1.choiceOldTradeRoadBasicLabel,
      invocation: basicWorldInvocationV1,
    }),
    Object.freeze({
      optionId: choiceIdsV1[6],
      textId: pocTextIdsV1.choiceOldTradeRoadPreparedLabel,
      invocation: preparedWorldInvocationV1,
    }),
  ]),
  form: null,
}) as DeepReadonly<DescriptorForV1<"action.old_trade_road">>;

const inventoryFixtureV1 = Object.freeze({
  ingredientBatches: Object.freeze([
    Object.freeze({
      batchId: "batch:test:0",
      ingredientId: ingredientIdsV1[0],
      quantity: parseQuantity(2),
      acquiredDay: parseDayIndex(1),
      lastUsableDay: parseAbsoluteDayIndex(7),
      refrigerationExtended: false,
    }),
  ]),
  itemStacks: Object.freeze([]),
}) as unknown as DeepReadonly<PocInventoryProjectionV1>;

const facilitiesFixtureV1 = Object.freeze({
  built: Object.freeze([
    Object.freeze({
      facilityId: facilityIdsV1[0],
      builtAtSequence: parsePositiveSafeInteger(12),
    }),
  ]),
  decisions: Object.freeze([]),
}) satisfies DeepReadonly<PocFacilitiesProjectionV1>;

const ledgerFixtureV1 = Object.freeze({
  startingCash: parseMoney(70),
  currentCash: parseMoney(68),
  entries: Object.freeze([
    Object.freeze({
      entryId: "ledger:test:0",
      category: "purchase" as const,
      reasonId: reasonIdsV1[13],
      cashDelta: parseSafeInteger(-2),
      valuationDelta: parseSafeInteger(2),
      subject: Object.freeze({ kind: "ingredient" as const, ingredientId: ingredientIdsV1[0] }),
      quantity: parseQuantity(2),
    }),
  ]),
}) as unknown as DeepReadonly<PocLedgerProjectionV1>;

const relationshipFixtureV1 = Object.freeze({
  affection: parseSafeInteger(3),
  teamwork: parseNonNegativeSafeInteger(2),
  stage: "friendly" as const,
}) satisfies DeepReadonly<RelationshipStateV1>;

const completionFixtureV1 = Object.freeze({
  endingId: endingIdsV1[0],
  status: "completed_stable" as const,
  levy: Object.freeze({
    kind: "paid" as const,
    levyAmount: parseMoney(140),
    cash: Object.freeze({ before: parseMoney(208), after: parseMoney(68) }),
  }),
  reasonIds: Object.freeze([reasonIdsV1[43]]),
  summary: Object.freeze({
    relationship: Object.freeze({
      outcomeId: outcomeIdsV1[1],
      value: Object.freeze({ kind: "token" as const, value: "relationship.completed" }),
    }),
    investigation: Object.freeze({
      outcomeId: outcomeIdsV1[0],
      value: Object.freeze({ kind: "token" as const, value: "investigation.complete" }),
    }),
  }),
  completedAtSequence: parsePositiveSafeInteger(65),
}) as unknown as DeepReadonly<NonNullable<PocGameViewV1["completion"]>>;

describe("PoC Story overlays", () => {
  it("dispatches the exact Story-supplied policy choice without constructing an option", async () => {
    const presentation = createPresentationFixtureV1();
    const fixture = createSemanticFixtureV1();
    const user = userEvent.setup();

    render(
      <PolicyOverlayV1
        descriptor={policyDescriptorV1}
        semantic={fixture.semantic}
        presentation={presentation}
      />,
    );

    await user.click(screen.getByRole("radio", { name: "均衡作息" }));
    await user.click(screen.getByRole("button", { name: "确认" }));

    expect(fixture.preview).not.toHaveBeenCalled();
    expect(fixture.dispatch).toHaveBeenCalledOnce();
    expect(fixture.dispatch.mock.calls[0]?.[0]).toBe(balancedPolicyInvocationV1);
  });

  it("renders Inventory, Ledger, Relationship, and RunSummary as read-only projections", () => {
    const presentation = createPresentationFixtureV1();

    const inventory = render(
      <InventoryOverlayV1 inventory={inventoryFixtureV1} presentation={presentation} />,
    );
    expect(screen.getByRole("table", { name: "完整库存" })).toBeVisible();
    expect(screen.getByText("粗粮")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    inventory.unmount();

    const ledger = render(<LedgerOverlayV1 ledger={ledgerFixtureV1} presentation={presentation} />);
    expect(screen.getByText("初始现金")).toBeVisible();
    expect(screen.getByText("采购支出")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    ledger.unmount();

    const relationship = render(
      <RelationshipOverlayV1
        relationship={relationshipFixtureV1}
        heroineMood={parseMoodPoint(1)}
        presentation={presentation}
      />,
    );
    expect(screen.getByText("好感")).toBeVisible();
    expect(screen.getByText("默契")).toBeVisible();
    expect(screen.getByText("心情")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    relationship.unmount();

    render(<RunSummaryOverlayV1 completion={completionFixtureV1} presentation={presentation} />);
    expect(screen.getByText("本周结局")).toBeVisible();
    expect(screen.getByText("平稳的一周")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("parses purchase inputs once and previews then dispatches the same invocation reference", async () => {
    const presentation = createPresentationFixtureV1();
    const fixture = createSemanticFixtureV1();
    const user = userEvent.setup();

    render(
      <PurchaseOverlayV1
        descriptor={purchaseDescriptorV1}
        semantic={fixture.semantic}
        presentation={presentation}
      />,
    );

    await user.click(screen.getByRole("button", { name: "添加一项" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "食材" }), ingredientIdsV1[0]);
    const quantity = screen.getByRole("spinbutton", { name: "数量" });
    expect(quantity).toHaveAttribute("max", "99");
    await user.clear(quantity);
    await user.type(quantity, "2");
    await user.click(screen.getByRole("button", { name: "确认采购" }));

    await waitFor(() => expect(fixture.dispatch).toHaveBeenCalledOnce());
    expect(fixture.preview).toHaveBeenCalledOnce();
    const previewInvocation = fixture.preview.mock.calls[0]?.[0];
    const dispatchInvocation = fixture.dispatch.mock.calls[0]?.[0];
    expect(dispatchInvocation).toBe(previewInvocation);
    expect(dispatchInvocation).toEqual({
      kind: "invoke",
      actionId: "action.purchase",
      options: {
        lines: [{ ingredientId: ingredientIdsV1[0], quantity: 2 }],
      },
    });
  });

  it("renders rejected purchase preview reasons and fails closed without dispatch", async () => {
    const presentation = createPresentationFixtureV1();
    const fixture = createSemanticFixtureV1(rejectedPreviewV1);
    const user = userEvent.setup();

    render(
      <PurchaseOverlayV1
        descriptor={purchaseDescriptorV1}
        semantic={fixture.semantic}
        presentation={presentation}
      />,
    );
    await user.click(screen.getByRole("button", { name: "添加一项" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "食材" }), ingredientIdsV1[0]);
    await user.clear(screen.getByRole("spinbutton", { name: "数量" }));
    await user.type(screen.getByRole("spinbutton", { name: "数量" }), "2");
    await user.click(screen.getByRole("button", { name: "确认采购" }));

    expect(await screen.findByText("现金不足")).toBeVisible();
    expect(fixture.preview).toHaveBeenCalledOnce();
    expect(fixture.dispatch).not.toHaveBeenCalled();
  });

  it("fails closed when the current purchase descriptor removes a selected ingredient", async () => {
    const presentation = createPresentationFixtureV1();
    const fixture = createSemanticFixtureV1();
    const user = userEvent.setup();
    const rendered = render(
      <PurchaseOverlayV1
        descriptor={purchaseDescriptorV1}
        semantic={fixture.semantic}
        presentation={presentation}
      />,
    );

    await user.click(screen.getByRole("button", { name: "添加一项" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "食材" }), ingredientIdsV1[0]);
    expect(screen.getByRole("button", { name: "确认采购" })).toBeEnabled();

    const descriptorWithoutIngredients = Object.freeze({
      ...purchaseDescriptorV1,
      form: Object.freeze({
        ...purchaseDescriptorV1.form,
        input: Object.freeze({
          ...purchaseDescriptorV1.form.input,
          ingredients: Object.freeze([]),
        }),
      }),
    }) as DeepReadonly<DescriptorForV1<"action.purchase">>;
    rendered.rerender(
      <PurchaseOverlayV1
        descriptor={descriptorWithoutIngredients}
        semantic={fixture.semantic}
        presentation={presentation}
      />,
    );

    const confirm = screen.getByRole("button", { name: "确认采购" });
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    expect(fixture.preview).not.toHaveBeenCalled();
    expect(fixture.dispatch).not.toHaveBeenCalled();
  });

  it("fails closed when the current purchase descriptor lowers its line limit", async () => {
    const presentation = createPresentationFixtureV1();
    const fixture = createSemanticFixtureV1();
    const user = userEvent.setup();
    const rendered = render(
      <PurchaseOverlayV1
        descriptor={purchaseDescriptorWithTwoIngredientsV1}
        semantic={fixture.semantic}
        presentation={presentation}
      />,
    );

    for (const ingredientId of ingredientIdsV1.slice(0, 2)) {
      await user.click(screen.getByRole("button", { name: "添加一项" }));
      const selectors = screen.getAllByRole("combobox", { name: "食材" });
      await user.selectOptions(selectors.at(-1)!, ingredientId);
    }
    expect(screen.getByRole("button", { name: "确认采购" })).toBeEnabled();

    const descriptorWithLowerLimit = Object.freeze({
      ...purchaseDescriptorWithTwoIngredientsV1,
      form: Object.freeze({
        ...purchaseDescriptorWithTwoIngredientsV1.form,
        input: Object.freeze({
          ...purchaseDescriptorWithTwoIngredientsV1.form.input,
          lineLimit: parsePositiveSafeInteger(1),
        }),
      }),
    }) as DeepReadonly<DescriptorForV1<"action.purchase">>;
    rendered.rerender(
      <PurchaseOverlayV1
        descriptor={descriptorWithLowerLimit}
        semantic={fixture.semantic}
        presentation={presentation}
      />,
    );

    const confirm = screen.getByRole("button", { name: "确认采购" });
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    expect(fixture.preview).not.toHaveBeenCalled();
    expect(fixture.dispatch).not.toHaveBeenCalled();
  });

  it("constructs only the bounded TavernPlan form and reuses its parsed invocation", async () => {
    const presentation = createPresentationFixtureV1();
    const fixture = createSemanticFixtureV1();
    const user = userEvent.setup();

    render(
      <TavernPlanOverlayV1
        descriptor={tavernPlanDescriptorV1}
        semantic={fixture.semantic}
        presentation={presentation}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "营业方式" }), "manual");
    await user.click(screen.getByRole("button", { name: "添加一项" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "菜品" }), recipeIdsV1[0]);
    const portions = screen.getByRole("spinbutton", { name: "份数" });
    expect(portions).toHaveAttribute("max", "99");
    await user.clear(portions);
    await user.type(portions, "3");
    await user.click(screen.getByRole("button", { name: "确认营业计划" }));

    await waitFor(() => expect(fixture.dispatch).toHaveBeenCalledOnce());
    const previewInvocation = fixture.preview.mock.calls[0]?.[0];
    const dispatchInvocation = fixture.dispatch.mock.calls[0]?.[0];
    expect(dispatchInvocation).toBe(previewInvocation);
    expect(dispatchInvocation).toEqual({
      kind: "invoke",
      actionId: "action.service_plan",
      options: {
        plan: {
          mode: "manual",
          menu: [{ recipeId: recipeIdsV1[0], portions: 3 }],
        },
      },
    });
  });

  it("keeps every open TavernPlan mode disabled until its menu is non-empty", async () => {
    const presentation = createPresentationFixtureV1();
    const fixture = createSemanticFixtureV1();
    const user = userEvent.setup();

    render(
      <TavernPlanOverlayV1
        descriptor={tavernPlanDescriptorV1}
        semantic={fixture.semantic}
        presentation={presentation}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "营业方式" }), "manual");
    const confirm = screen.getByRole("button", { name: "确认营业计划" });
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    expect(fixture.preview).not.toHaveBeenCalled();
    expect(fixture.dispatch).not.toHaveBeenCalled();
  });

  it("accepts only an empty menu for the closed TavernPlan mode", async () => {
    const presentation = createPresentationFixtureV1();
    const fixture = createSemanticFixtureV1();
    const user = userEvent.setup();

    render(
      <TavernPlanOverlayV1
        descriptor={tavernPlanDescriptorWithClosedV1}
        semantic={fixture.semantic}
        presentation={presentation}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "营业方式" }), "manual");
    await user.click(screen.getByRole("button", { name: "添加一项" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "菜品" }), recipeIdsV1[0]);
    await user.selectOptions(screen.getByRole("combobox", { name: "营业方式" }), "closed");
    expect(screen.getByRole("button", { name: "确认营业计划" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "移除" }));
    const confirm = screen.getByRole("button", { name: "确认营业计划" });
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    await waitFor(() => expect(fixture.dispatch).toHaveBeenCalledOnce());
    expect(fixture.preview.mock.calls[0]?.[0]).toEqual({
      kind: "invoke",
      actionId: "action.service_plan",
      options: { plan: { mode: "closed", menu: [] } },
    });
    expect(fixture.dispatch.mock.calls[0]?.[0]).toBe(fixture.preview.mock.calls[0]?.[0]);
  });

  it("fails closed when the current TavernPlan descriptor lowers its recipe limit", async () => {
    const presentation = createPresentationFixtureV1();
    const fixture = createSemanticFixtureV1();
    const user = userEvent.setup();
    const rendered = render(
      <TavernPlanOverlayV1
        descriptor={tavernPlanDescriptorWithTwoRecipesV1}
        semantic={fixture.semantic}
        presentation={presentation}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "营业方式" }), "manual");
    for (const recipeId of recipeIdsV1.slice(0, 2)) {
      await user.click(screen.getByRole("button", { name: "添加一项" }));
      const selectors = screen.getAllByRole("combobox", { name: "菜品" });
      await user.selectOptions(selectors.at(-1)!, recipeId);
    }
    expect(screen.getByRole("button", { name: "确认营业计划" })).toBeEnabled();

    const descriptorWithLowerLimit = Object.freeze({
      ...tavernPlanDescriptorWithTwoRecipesV1,
      form: Object.freeze({
        ...tavernPlanDescriptorWithTwoRecipesV1.form,
        input: Object.freeze({
          ...tavernPlanDescriptorWithTwoRecipesV1.form.input,
          recipeLimit: parsePositiveSafeInteger(1),
        }),
      }),
    }) as DeepReadonly<DescriptorForV1<"action.service_plan">>;
    rendered.rerender(
      <TavernPlanOverlayV1
        descriptor={descriptorWithLowerLimit}
        semantic={fixture.semantic}
        presentation={presentation}
      />,
    );

    const confirm = screen.getByRole("button", { name: "确认营业计划" });
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    expect(fixture.preview).not.toHaveBeenCalled();
    expect(fixture.dispatch).not.toHaveBeenCalled();
  });

  it.each([
    ["service mode", "serviceModes"],
    ["recipe", "recipes"],
  ] as const)(
    "fails closed when the current TavernPlan descriptor removes a selected %s",
    async (_removedLabel, removedCatalog) => {
      const presentation = createPresentationFixtureV1();
      const fixture = createSemanticFixtureV1();
      const user = userEvent.setup();
      const rendered = render(
        <TavernPlanOverlayV1
          descriptor={tavernPlanDescriptorV1}
          semantic={fixture.semantic}
          presentation={presentation}
        />,
      );

      await user.selectOptions(screen.getByRole("combobox", { name: "营业方式" }), "manual");
      await user.click(screen.getByRole("button", { name: "添加一项" }));
      await user.selectOptions(screen.getByRole("combobox", { name: "菜品" }), recipeIdsV1[0]);
      expect(screen.getByRole("button", { name: "确认营业计划" })).toBeEnabled();

      const descriptorWithCurrentCatalog = Object.freeze({
        ...tavernPlanDescriptorV1,
        form: Object.freeze({
          ...tavernPlanDescriptorV1.form,
          input: Object.freeze({
            ...tavernPlanDescriptorV1.form.input,
            serviceModes:
              removedCatalog === "serviceModes"
                ? Object.freeze([])
                : tavernPlanDescriptorV1.form.input.serviceModes,
            recipes:
              removedCatalog === "recipes"
                ? Object.freeze([])
                : tavernPlanDescriptorV1.form.input.recipes,
          }),
        }),
      }) as DeepReadonly<DescriptorForV1<"action.service_plan">>;
      rendered.rerender(
        <TavernPlanOverlayV1
          descriptor={descriptorWithCurrentCatalog}
          semantic={fixture.semantic}
          presentation={presentation}
        />,
      );

      const confirm = screen.getByRole("button", { name: "确认营业计划" });
      expect(confirm).toBeDisabled();
      await user.click(confirm);
      expect(fixture.preview).not.toHaveBeenCalled();
      expect(fixture.dispatch).not.toHaveBeenCalled();
    },
  );

  it("previews the selected Facility option before dispatching its exact invocation", async () => {
    const presentation = createPresentationFixtureV1();
    const fixture = createSemanticFixtureV1();
    const user = userEvent.setup();

    render(
      <FacilityOverlayV1
        facilities={facilitiesFixtureV1}
        descriptor={facilityDescriptorV1}
        semantic={fixture.semantic}
        presentation={presentation}
      />,
    );

    expect(screen.getAllByText("冷藏库")).not.toHaveLength(0);
    expect(fixture.dispatch).not.toHaveBeenCalled();
    await user.click(screen.getByRole("radio", { name: "暂不建造设施" }));
    await user.click(screen.getByRole("button", { name: "确认设施选择" }));

    await waitFor(() => expect(fixture.dispatch).toHaveBeenCalledOnce());
    expect(fixture.preview.mock.calls[0]?.[0]).toBe(skipFacilityInvocationV1);
    expect(fixture.dispatch.mock.calls[0]?.[0]).toBe(fixture.preview.mock.calls[0]?.[0]);
  });

  it("keeps a disabled descriptor display-only even though its choices retain invocations", async () => {
    const presentation = createPresentationFixtureV1();
    const fixture = createSemanticFixtureV1();
    const user = userEvent.setup();
    const disabledDescriptor = Object.freeze({
      ...facilityDescriptorV1,
      enabled: false,
      reasons: Object.freeze([
        Object.freeze({
          code: "calendar.insufficient_ap" as const,
          details: Object.freeze({
            required: parseNonNegativeSafeInteger(1),
            available: parseNonNegativeSafeInteger(0),
          }),
        }),
      ]),
    }) as DeepReadonly<DescriptorForV1<"action.facility_window">>;

    render(
      <FacilityOverlayV1
        facilities={facilitiesFixtureV1}
        descriptor={disabledDescriptor}
        semantic={fixture.semantic}
        presentation={presentation}
      />,
    );

    expect(screen.getByText("行动点不足")).toBeVisible();
    expect(screen.getByRole("button", { name: "确认设施选择" })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: "暂不建造设施" }));
    expect(fixture.preview).not.toHaveBeenCalled();
    expect(fixture.dispatch).not.toHaveBeenCalled();
  });

  it("opens WorldAction choices without selecting one and preserves the chosen invocation", async () => {
    const presentation = createPresentationFixtureV1();
    const fixture = createSemanticFixtureV1();
    const user = userEvent.setup();

    render(
      <WorldActionOverlayV1
        descriptor={worldActionDescriptorV1}
        semantic={fixture.semantic}
        presentation={presentation}
      />,
    );

    expect(screen.getByRole("radio", { name: "基础准备" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "充分准备" })).not.toBeChecked();
    expect(fixture.preview).not.toHaveBeenCalled();
    expect(fixture.dispatch).not.toHaveBeenCalled();

    await user.click(screen.getByRole("radio", { name: "充分准备" }));
    await user.click(screen.getByRole("button", { name: "确认出发" }));

    await waitFor(() => expect(fixture.dispatch).toHaveBeenCalledOnce());
    expect(fixture.preview.mock.calls[0]?.[0]).toBe(preparedWorldInvocationV1);
    expect(fixture.dispatch.mock.calls[0]?.[0]).toBe(fixture.preview.mock.calls[0]?.[0]);
  });

  it("keeps Overlay content dialog-free so OverlayHost remains the sole modal owner", () => {
    const presentation = createPresentationFixtureV1();
    const fixture = createSemanticFixtureV1();

    render(
      <PurchaseOverlayV1
        descriptor={purchaseDescriptorV1}
        semantic={fixture.semantic}
        presentation={presentation}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
