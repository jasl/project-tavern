// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import styles from "./game-shell.module.css";
import { TopCardHudV1, type StageHudSlotsV1 } from "./top-card-hud.js";

afterEach(cleanup);

const topCardFixtureV1 = Object.freeze({
  end: <span>结束状态</span>,
  start: <span>开始状态</span>,
  center: <span>中央状态</span>,
}) satisfies StageHudSlotsV1;

describe("TopCardHudV1", () => {
  it("renders the three logical slots in fixed start, center, end order", () => {
    render(<TopCardHudV1 slots={topCardFixtureV1} accessibleName="状态" />);

    const slots = screen.getAllByTestId(/^top-card-(?:start|center|end)$/u);
    expect(slots.map((node) => node.dataset.slot)).toEqual(["start", "center", "end"]);
    expect(slots.map((node) => node.textContent)).toEqual(["开始状态", "中央状态", "结束状态"]);
  });

  it("always mounts exactly three slot containers even when every slot is empty", () => {
    render(
      <TopCardHudV1
        slots={Object.freeze({ start: null, center: null, end: null })}
        accessibleName="空状态"
      />,
    );

    const region = screen.getByRole("region", { name: "空状态" });
    expect(region.children).toHaveLength(3);
    expect(screen.getByTestId("top-card-start")).toBeEmptyDOMElement();
    expect(screen.getByTestId("top-card-center")).toBeEmptyDOMElement();
    expect(screen.getByTestId("top-card-end")).toBeEmptyDOMElement();
  });

  it("exposes an accessible named region and stable responsive structure hooks", () => {
    render(<TopCardHudV1 slots={topCardFixtureV1} accessibleName="游戏状态" />);

    const region = screen.getByRole("region", { name: "游戏状态" });
    expect(region).toHaveClass(styles["game-shell__top-card"] ?? "ui.missing_top_card_style");
    expect(region).toHaveAttribute("data-top-card-hud", "true");

    const slots = within(region).getAllByTestId(/^top-card-(?:start|center|end)$/u);
    expect(slots).toHaveLength(3);
    for (const slot of slots) {
      expect(slot).toHaveClass(
        styles["game-shell__top-card-slot"] ?? "ui.missing_top_card_slot_style",
      );
    }
  });
});
