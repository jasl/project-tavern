// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SemanticActionControlV1 } from "./semantic-action-control.js";

afterEach(cleanup);

const invocationV1 = Object.freeze({
  actionId: "action.test.purchase" as const,
  parameters: Object.freeze({ itemId: "item.test.tea" as const, quantity: 1 }),
});

function createSemanticFixtureV1() {
  const dispatch = vi.fn(async (_invocation: typeof invocationV1) =>
    Object.freeze({ kind: "committed" as const }),
  );
  const availableActions = vi.fn(() => Object.freeze([]));
  const preview = vi.fn(async () => Object.freeze({ kind: "allowed" as const }));
  return {
    dispatch,
    availableActions,
    preview,
    semantic: Object.freeze({ dispatch, availableActions, preview }),
  };
}

function createEnabledDescriptorV1() {
  return Object.freeze({
    actionId: invocationV1.actionId,
    textId: "text.test.purchase",
    enabled: true,
    reasons: Object.freeze([]),
    options: Object.freeze([invocationV1]),
  });
}

function createDisabledDescriptorV1() {
  const insufficientCashToString = vi.fn(() => "must not be rendered");
  const capacityToString = vi.fn(() => "must not be rendered");
  const descriptor = Object.freeze({
    actionId: invocationV1.actionId,
    textId: "text.test.purchase",
    enabled: false,
    reasons: Object.freeze([
      Object.freeze({ code: "cash.insufficient", toString: insufficientCashToString }),
      Object.freeze({ code: "inventory.capacity_reached", toString: capacityToString }),
    ]),
    options: Object.freeze([invocationV1]),
  });
  return { descriptor, insufficientCashToString, capacityToString };
}

describe("SemanticActionControlV1", () => {
  it("dispatches only the Story-supplied invocation and preserves its exact reference", async () => {
    const fixture = createSemanticFixtureV1();
    const descriptor = createEnabledDescriptorV1();

    render(
      <SemanticActionControlV1
        descriptor={descriptor}
        invocation={invocationV1}
        semantic={fixture.semantic}
        label="购买茶叶"
        disabledReasonLabels={Object.freeze([])}
      />,
    );

    const control = screen.getByRole("button", { name: "购买茶叶" });
    expect(control).toBeEnabled();
    expect(control.className).toMatch(/game-shell__action/u);
    expect(control).not.toHaveAttribute("aria-describedby");

    await userEvent.setup().click(control);

    expect(fixture.dispatch).toHaveBeenCalledOnce();
    expect(fixture.dispatch.mock.calls[0]?.[0]).toBe(invocationV1);
    expect(fixture.availableActions).not.toHaveBeenCalled();
    expect(fixture.preview).not.toHaveBeenCalled();
  });

  it("renders frozen disabled reasons in authored ARIA order without stringifying DTOs", async () => {
    const fixture = createSemanticFixtureV1();
    const { descriptor, insufficientCashToString, capacityToString } = createDisabledDescriptorV1();
    const disabledReasonLabels = Object.freeze(["金钱不足", "库存已满"]);

    render(
      <SemanticActionControlV1
        descriptor={descriptor}
        invocation={invocationV1}
        semantic={fixture.semantic}
        label="购买茶叶"
        disabledReasonLabels={disabledReasonLabels}
      />,
    );

    const control = screen.getByRole("button", { name: "购买茶叶" });
    const descriptionIds = control.getAttribute("aria-describedby")?.split(/\s+/u) ?? [];
    const authoredDescriptions = descriptionIds.map(
      (id) => document.getElementById(id)?.textContent,
    );

    expect(control).toBeDisabled();
    expect(descriptionIds).toHaveLength(2);
    expect(authoredDescriptions).toEqual(["金钱不足", "库存已满"]);
    expect(control).toHaveAccessibleDescription("金钱不足 库存已满");
    expect(insufficientCashToString).not.toHaveBeenCalled();
    expect(capacityToString).not.toHaveBeenCalled();

    await userEvent.setup().click(control);
    expect(fixture.dispatch).not.toHaveBeenCalled();
  });

  it.each([
    {
      caseName: "mutable labels",
      labels: ["金钱不足", "库存已满"],
    },
    {
      caseName: "missing labels",
      labels: Object.freeze(["金钱不足"]),
    },
    {
      caseName: "extra labels",
      labels: Object.freeze(["金钱不足", "库存已满", "其他原因"]),
    },
    {
      caseName: "empty labels",
      labels: Object.freeze(["金钱不足", "   "]),
    },
  ])("rejects $caseName with the stable mismatch code", ({ labels }) => {
    const fixture = createSemanticFixtureV1();
    const { descriptor } = createDisabledDescriptorV1();

    expect(() =>
      render(
        <SemanticActionControlV1
          descriptor={descriptor}
          invocation={invocationV1}
          semantic={fixture.semantic}
          label="购买茶叶"
          disabledReasonLabels={labels}
        />,
      ),
    ).toThrowError("ui.semantic_action_reason_mismatch");
  });
});
