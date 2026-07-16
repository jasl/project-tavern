// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";

import {
  parseAssetId,
  parseCharacterExpressionId,
  parseCharacterId,
  parseCharacterPoseId,
  parseCharacterRigId,
  parseHitMapId,
  parseLocaleId,
  parseNonNegativeSafeInteger,
  parseNormalizedCoordinateV1,
  parsePositiveFiniteNumber,
  parseTextId,
} from "@sillymaker/base";
import type {
  AssetId,
  LocaleId,
  ResolvedAssetManifestV1,
  ResolvedAssetPresentationV1,
  TextId,
} from "@sillymaker/base";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PresentationReadPortV1 } from "../assets/presentation-read-port.js";
import { createUiContributionRegistryV1 } from "../contributions/registry.js";
import type {
  GameRendererContextV1,
  UiContributionRegistryV1,
  UiContributionSetV1,
} from "../contributions/types.js";
import { CharacterHostV1 } from "./character-host.js";
import type { RuntimeCharacterPresentationV1 } from "./contracts.js";

type CharacterAssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];
type CharacterPresentationV1 = PresentationReadPortV1<
  TextId,
  AssetId,
  CharacterAssetUsageV1,
  LocaleId,
  string
>;

interface TestSemanticPortV1 {
  readonly revision: ReturnType<typeof parseNonNegativeSafeInteger>;
}

type CharacterContextV1 = GameRendererContextV1<
  RuntimeCharacterPresentationV1,
  TestSemanticPortV1,
  CharacterPresentationV1
>;

type TestRendererContextsV1 = Readonly<{
  readonly background: unknown;
  readonly character: CharacterContextV1;
  readonly scene_interaction: unknown;
  readonly hud: unknown;
  readonly workspace_overlay: unknown;
  readonly narrative: unknown;
  readonly system: unknown;
}>;

const characterIdV1 = parseCharacterId("character.synthetic.guide");
const accessibleNameTextIdV1 = parseTextId("text.synthetic.guide.name");
const rigIdV1 = parseCharacterRigId("rig.synthetic.guide");
const poseIdV1 = parseCharacterPoseId("pose.synthetic.guide.standing");
const expressionIdV1 = parseCharacterExpressionId("expression.synthetic.guide.neutral");
const hitMapIdV1 = parseHitMapId("hit_map.synthetic.guide.standing");
const staticAssetIdV1 = parseAssetId("asset.synthetic.guide.static");
const semanticV1 = Object.freeze({ revision: parseNonNegativeSafeInteger(7) });

function characterViewV1(rendererId: string): RuntimeCharacterPresentationV1 {
  return Object.freeze({
    characterId: characterIdV1,
    accessibleNameTextId: accessibleNameTextIdV1,
    rendererId,
    rigId: rigIdV1,
    poseId: poseIdV1,
    expressionId: expressionIdV1,
    activityId: null,
    appearance: Object.freeze([]),
    hitMapId: hitMapIdV1,
    anchor: Object.freeze({
      x: parseNormalizedCoordinateV1(0.5),
      y: parseNormalizedCoordinateV1(0.8),
    }),
    scale: parsePositiveFiniteNumber(1),
    staticFallbackAssetId: staticAssetIdV1,
    fallbackHitMapCompatibility: "incompatible",
  });
}

function createPresentationFixtureV1() {
  const publication = Object.freeze({ revision: parseNonNegativeSafeInteger(0) });
  const resolved: ResolvedAssetPresentationV1<AssetId, CharacterAssetUsageV1, string> =
    Object.freeze({
      delivery: "code_fallback",
      assetId: staticAssetIdV1,
      usage: "character_pose",
      fallbackToken: "fallback.synthetic.guide.static",
    });
  const text = vi.fn((textId: TextId) => {
    expect(textId).toBe(accessibleNameTextIdV1);
    return Object.freeze({
      textId,
      requestedLocale: parseLocaleId("zh-CN"),
      resolvedLocale: parseLocaleId("zh-CN"),
      text: "测试角色",
    });
  });
  const asset = vi.fn((assetId: AssetId, usage: CharacterAssetUsageV1) => {
    expect(assetId).toBe(staticAssetIdV1);
    expect(usage).toBe("character_pose");
    return resolved;
  });
  const presentation = Object.freeze({
    locale: parseLocaleId("zh-CN"),
    text,
    asset,
    observeAssets: vi.fn(() => publication),
    subscribeAssets: vi.fn(() => () => {}),
  }) satisfies CharacterPresentationV1;

  return Object.freeze({ presentation, text, asset });
}

const RegisteredCharacterRendererV1 = vi.fn((context: CharacterContextV1): ReactElement => (
  <span data-testid="registered-character" data-character-id={context.viewSlice.characterId} />
));
const WrongNamespaceRendererV1 = vi.fn((_context: unknown): ReactElement => (
  <span data-testid="wrong-namespace-character" />
));

function createCharacterContributionsV1(): UiContributionRegistryV1<TestRendererContextsV1> {
  const contribution = Object.freeze({
    contributionId: "contribution.synthetic.characters",
    renderers: Object.freeze({
      character: Object.freeze([
        Object.freeze({
          rendererId: "renderer.synthetic.registered",
          component: RegisteredCharacterRendererV1,
        }),
      ]),
      hud: Object.freeze([
        Object.freeze({
          rendererId: "renderer.synthetic.unknown",
          component: WrongNamespaceRendererV1,
        }),
      ]),
    }),
  }) satisfies UiContributionSetV1<TestRendererContextsV1>;

  return createUiContributionRegistryV1<TestRendererContextsV1>([contribution]);
}

const interactiveSelectorV1 = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  "[data-interaction-target]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

beforeEach(() => {
  RegisteredCharacterRendererV1.mockClear();
  WrongNamespaceRendererV1.mockClear();
});

afterEach(cleanup);

describe("CharacterHostV1", () => {
  it("passes the registered character renderer exactly viewSlice, semantic, and presentation", () => {
    const fixture = createPresentationFixtureV1();
    const character = characterViewV1("renderer.synthetic.registered");

    render(
      <CharacterHostV1
        character={character}
        contributions={createCharacterContributionsV1()}
        semantic={semanticV1}
        presentation={fixture.presentation}
      />,
    );

    expect(screen.getByTestId("registered-character")).toHaveAttribute(
      "data-character-id",
      "character.synthetic.guide",
    );
    expect(RegisteredCharacterRendererV1).toHaveBeenCalledOnce();
    const context = RegisteredCharacterRendererV1.mock.calls[0]?.[0];
    expect(Object.keys(context ?? {}).toSorted()).toEqual([
      "presentation",
      "semantic",
      "viewSlice",
    ]);
    expect(context?.viewSlice).toBe(character);
    expect(context?.semantic).toBe(semanticV1);
    expect(context?.presentation).toBe(fixture.presentation);
  });

  it("uses the built-in named static fallback for an unknown character renderer", () => {
    const fixture = createPresentationFixtureV1();
    const rendered = render(
      <CharacterHostV1
        character={characterViewV1("renderer.synthetic.unknown")}
        contributions={createCharacterContributionsV1()}
        semantic={semanticV1}
        presentation={fixture.presentation}
      />,
    );

    const root = screen.getByRole("img", { name: "测试角色" });
    expect(root).toHaveAttribute("data-testid", "character-root");
    expect(root).toHaveAttribute("data-character-id", "character.synthetic.guide");
    expect(root).toHaveAttribute("data-character-fallback", "code_native");
    expect(root).toHaveAttribute("data-spatial-hit-test", "disabled");
    expect(fixture.text).toHaveBeenCalledWith(accessibleNameTextIdV1);
    expect(fixture.asset).toHaveBeenCalledWith(staticAssetIdV1, "character_pose");
    expect(rendered.container.querySelector(interactiveSelectorV1)).toBeNull();
  });

  it("never resolves a same-ID renderer from a non-character namespace", () => {
    const fixture = createPresentationFixtureV1();
    render(
      <CharacterHostV1
        character={characterViewV1("renderer.synthetic.unknown")}
        contributions={createCharacterContributionsV1()}
        semantic={semanticV1}
        presentation={fixture.presentation}
      />,
    );

    expect(WrongNamespaceRendererV1).not.toHaveBeenCalled();
    expect(screen.queryByTestId("wrong-namespace-character")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "测试角色" })).toBeVisible();
  });
});
