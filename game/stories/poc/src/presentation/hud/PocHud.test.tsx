// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import "@testing-library/jest-dom/vitest";

import {
  parseNonNegativeSafeInteger,
  type AssetId,
  type LocaleId,
  type ResolvedAssetManifestV1,
  type TextId,
} from "@sillymaker/base";
import type { GameSymbolRegistryV1, PresentationReadPortV1 } from "@sillymaker/ui";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { pocTextIdsV1, policyIdsV1 } from "../../content/ids.js";
import { createPocStoryHarnessV1, fixedPocBootstrapV1 } from "../../testing/poc-story-harness.js";
import { pocZhCnTextCatalogV1 } from "../text-catalogs/index.js";
import { pocGameSymbolRegistryV1 } from "../symbols/poc-game-symbols.js";
import { PocHudV1 } from "./PocHud.js";

type PocAssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];
type PocPresentationV1 = PresentationReadPortV1<TextId, AssetId, PocAssetUsageV1, LocaleId, string>;

function presentationFixtureV1(): PocPresentationV1 & {
  readonly text: ReturnType<typeof vi.fn>;
} {
  const text = vi.fn((textId: TextId) => {
    const entry = pocZhCnTextCatalogV1.entries.find((candidate) => candidate.textId === textId);
    if (entry === undefined) throw new TypeError(`missing PoC text fixture: ${textId}`);
    return Object.freeze({
      textId,
      requestedLocale: pocZhCnTextCatalogV1.locale,
      resolvedLocale: pocZhCnTextCatalogV1.locale,
      text: entry.text,
    });
  });
  return Object.freeze({
    locale: pocZhCnTextCatalogV1.locale,
    text,
    asset: vi.fn(() => {
      throw new TypeError("HUD must not resolve assets");
    }),
    observeAssets: () => Object.freeze({ revision: parseNonNegativeSafeInteger(0) }),
    subscribeAssets: () => () => {},
  }) as PocPresentationV1 & { readonly text: ReturnType<typeof vi.fn> };
}

afterEach(cleanup);

async function enterActiveRunV1(
  semantic: ReturnType<typeof createPocStoryHarnessV1>["semantic"],
): Promise<void> {
  await semantic.dispatch({ kind: "invoke", actionId: "action.run_start", options: {} });
  for (let count = 0; semantic.observe().narrative !== null; count += 1) {
    if (count >= 32) throw new RangeError("manifest Narrative did not settle");
    await semantic.dispatch({
      kind: "invoke",
      actionId: "action.narrative_advance",
      options: {},
    });
  }
  await semantic.dispatch({
    kind: "invoke",
    actionId: "action.choose_life_policy",
    options: { policyId: policyIdsV1[0] },
  });
}

describe("PocHudV1", () => {
  it("renders the compact top-card HUD from the projected GameView", async () => {
    const harness = createPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });
    await enterActiveRunV1(harness.semantic);
    const presentation = presentationFixtureV1();
    const resolveSymbol = vi.fn(pocGameSymbolRegistryV1.resolve);
    const gameSymbols = Object.freeze({ resolve: resolveSymbol }) satisfies GameSymbolRegistryV1;
    const attemptsBeforeRender = harness.executedAttempts().length;

    render(
      <PocHudV1
        viewSlice={harness.semantic.observe().game.hud}
        semantic={harness.semantic}
        presentation={presentation}
        gameSymbols={gameSymbols}
      />,
    );

    expect(screen.getByRole("region", { name: "旅店的一周" })).toBeVisible();
    expect(within(screen.getByTestId("top-card-start")).getByText("周一 · 上午")).toBeVisible();
    expect(within(screen.getByTestId("top-card-center")).getByText("行动点 2")).toBeVisible();
    expect(within(screen.getByTestId("top-card-end")).getByText("现金 70")).toBeVisible();
    expect(within(screen.getByTestId("top-card-end")).getByText("人气 50")).toBeVisible();
    expect(within(screen.getByTestId("top-card-end")).getByText("重建税 140")).toBeVisible();
    expect(screen.queryByRole("table", { name: "完整库存" })).not.toBeInTheDocument();
    expect(harness.executedAttempts()).toHaveLength(attemptsBeforeRender);
    expect(resolveSymbol).toHaveBeenCalled();

    for (const textId of [
      pocTextIdsV1.storyTitle,
      pocTextIdsV1.calendarDay1Label,
      pocTextIdsV1.calendarPhaseMorningLabel,
      pocTextIdsV1.hudActionPointsLabel,
      pocTextIdsV1.hudCashLabel,
      pocTextIdsV1.hudReputationLabel,
      pocTextIdsV1.hudLevyLabel,
    ]) {
      expect(presentation.text).toHaveBeenCalledWith(textId);
    }
  });

  it("uses only the two authoritative stamina meters and keeps AP discrete", () => {
    const harness = createPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });
    render(
      <PocHudV1
        viewSlice={harness.semantic.observe().game.hud}
        semantic={harness.semantic}
        presentation={presentationFixtureV1()}
        gameSymbols={pocGameSymbolRegistryV1}
      />,
    );

    const player = screen.getByRole("progressbar", { name: "主角体力" });
    const heroine = screen.getByRole("progressbar", { name: "女主体力" });
    expect(player).toHaveAttribute("value", "10");
    expect(player).toHaveAttribute("max", "10");
    expect(heroine).toHaveAttribute("value", "10");
    expect(heroine).toHaveAttribute("max", "10");
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
  });
});
