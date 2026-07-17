// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import "@testing-library/jest-dom/vitest";

import {
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type AssetId,
  type DeepReadonly,
  type LocaleId,
  type ResolvedAssetManifestV1,
  type TextId,
} from "@sillymaker/base";
import type { PresentationReadPortV1, RuntimeStageSceneV1 } from "@sillymaker/ui";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PocSemanticGamePortV1 } from "../../application/create-poc-semantic-port.js";
import { createPocStoryHarnessV1, fixedPocBootstrapV1 } from "../../testing/poc-story-harness.js";
import { pocAssetSlotsV1 } from "../assets.js";
import { pocSceneGraphV1 } from "../scene-graph.js";
import { pocZhCnTextCatalogV1 } from "../text-catalogs/index.js";
import { PocMainMenuSceneV1 } from "./PocMainMenuScene.js";
import { PocMarketSceneV1 } from "./PocMarketScene.js";
import { PocTavernSceneV1 } from "./PocTavernScene.js";
import { PocWeekSummarySceneV1 } from "./PocWeekSummaryScene.js";
import { PocWorldMapSceneV1 } from "./PocWorldMapScene.js";

type PocAssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];
type PocPresentationV1 = PresentationReadPortV1<TextId, AssetId, PocAssetUsageV1, LocaleId, string>;
type SceneRendererV1 = ComponentType<{
  readonly viewSlice: DeepReadonly<RuntimeStageSceneV1>;
  readonly semantic: PocSemanticGamePortV1;
  readonly presentation: PocPresentationV1;
}>;

function stageFixtureV1(index: number): DeepReadonly<RuntimeStageSceneV1> {
  const variant = pocSceneGraphV1.variants[index];
  if (variant === undefined || variant.backgroundAssetId === null) {
    throw new TypeError(`missing PoC stage fixture: ${index}`);
  }
  return Object.freeze({
    stageSceneId: variant.stageSceneId,
    variantId: variant.variantId,
    rendererId: variant.rendererId,
    background: Object.freeze({
      assetId: variant.backgroundAssetId,
      accessibleNameTextId: variant.accessibleNameTextId,
    }),
    layout: variant.layout,
  });
}

function presentationFixtureV1(stage: DeepReadonly<RuntimeStageSceneV1>): PocPresentationV1 & {
  readonly asset: ReturnType<typeof vi.fn>;
  readonly text: ReturnType<typeof vi.fn>;
} {
  const slot = pocAssetSlotsV1.find((candidate) => candidate.assetId === stage.background.assetId);
  if (slot === undefined)
    throw new TypeError(`missing PoC asset slot: ${stage.background.assetId}`);
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
  const asset = vi.fn((assetId: AssetId, usage: PocAssetUsageV1) =>
    Object.freeze({
      delivery: "code_fallback" as const,
      assetId,
      usage,
      fallbackToken: slot.fallbackToken,
    }),
  );
  const assetPublication = Object.freeze({ revision: parseNonNegativeSafeInteger(0) });
  return Object.freeze({
    locale: pocZhCnTextCatalogV1.locale,
    text,
    asset,
    observeAssets: () => assetPublication,
    subscribeAssets: () => () => {},
  }) as PocPresentationV1 & {
    readonly asset: ReturnType<typeof vi.fn>;
    readonly text: ReturnType<typeof vi.fn>;
  };
}

function runtimeImagePresentationFixtureV1(
  stage: DeepReadonly<RuntimeStageSceneV1>,
): PocPresentationV1 & {
  readonly asset: ReturnType<typeof vi.fn>;
  readonly text: ReturnType<typeof vi.fn>;
} {
  const fallback = presentationFixtureV1(stage);
  const asset = vi.fn((assetId: AssetId, usage: PocAssetUsageV1) =>
    Object.freeze({
      delivery: "runtime_image" as const,
      assetId,
      usage,
      url: "/assets/poc-stage.webp",
      width: parsePositiveSafeInteger(1600),
      height: parsePositiveSafeInteger(1000),
      fallbackToken: "fallback.poc.test.stage",
    }),
  );
  return Object.freeze({ ...fallback, asset }) as PocPresentationV1 & {
    readonly asset: ReturnType<typeof vi.fn>;
    readonly text: ReturnType<typeof vi.fn>;
  };
}

const sceneCasesV1 = [
  ["main menu", PocMainMenuSceneV1, 0, "旅店主菜单"],
  ["tavern day", PocTavernSceneV1, 1, "酒馆主厅"],
  ["tavern evening", PocTavernSceneV1, 2, "酒馆主厅"],
  ["market", PocMarketSceneV1, 3, "市集"],
  ["world map", PocWorldMapSceneV1, 4, "小镇与旧贸易路线地图"],
  ["week summary", PocWeekSummarySceneV1, 5, "七日经营总结"],
] as const satisfies readonly (readonly [string, SceneRendererV1, number, string])[];

afterEach(cleanup);

describe("PoC background scene renderers", () => {
  it.each(sceneCasesV1)(
    "renders the %s variant through its exact code fallback",
    (_label, Renderer, variantIndex, accessibleName) => {
      const stage = stageFixtureV1(variantIndex);
      const presentation = presentationFixtureV1(stage);
      const harness = createPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });
      const attemptsBeforeRender = harness.executedAttempts().length;

      const rendered = render(
        <Renderer viewSlice={stage} semantic={harness.semantic} presentation={presentation} />,
      );

      const image = screen.getByRole("img", { name: accessibleName });
      const slot = pocAssetSlotsV1.find(
        (candidate) => candidate.assetId === stage.background.assetId,
      );
      expect(image).toHaveAttribute("data-stage-fallback", "code_native");
      expect(image).toHaveAttribute("data-stage-fallback-token", slot?.fallbackToken);
      expect(presentation.asset).toHaveBeenCalledWith(stage.background.assetId, "scene_background");
      expect(presentation.text).toHaveBeenCalledWith(stage.background.accessibleNameTextId);
      expect(rendered.container.querySelector("button, a, input, select, textarea")).toBeNull();
      expect(harness.executedAttempts()).toHaveLength(attemptsBeforeRender);
    },
  );

  it("keeps heroine and interaction composition outside the tavern background renderer", () => {
    const stage = stageFixtureV1(1);
    const harness = createPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });
    render(
      <PocTavernSceneV1
        viewSlice={stage}
        semantic={harness.semantic}
        presentation={presentationFixtureV1(stage)}
      />,
    );

    expect(screen.getByRole("img", { name: "酒馆主厅" })).toBeVisible();
    expect(screen.queryByRole("img", { name: "女主" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "与女主互动" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "安排营业" })).not.toBeInTheDocument();
  });

  it("renders an approved runtime image with the resolved intrinsic metadata", () => {
    const stage = stageFixtureV1(3);
    const presentation = runtimeImagePresentationFixtureV1(stage);
    const harness = createPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });

    render(
      <PocMarketSceneV1
        viewSlice={stage}
        semantic={harness.semantic}
        presentation={presentation}
      />,
    );

    const image = screen.getByRole("img", { name: "市集" });
    expect(image).toHaveAttribute("src", "/assets/poc-stage.webp");
    expect(image).toHaveAttribute("width", "1600");
    expect(image).toHaveAttribute("height", "1000");
    expect(image).not.toHaveAttribute("data-stage-fallback");
    expect(presentation.asset).toHaveBeenCalledWith(stage.background.assetId, "scene_background");
  });
});
