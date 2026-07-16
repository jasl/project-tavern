// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  parseAppearanceLayerId,
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
  parsePositiveSafeInteger,
  parseTextId,
} from "@sillymaker/base";
import type {
  AssetId,
  CharacterPoseId,
  CharacterRigDescriptorV1,
  HitMapId,
  LocaleId,
  ResolvedAssetManifestV1,
  ResolvedAssetPresentationV1,
  TextId,
} from "@sillymaker/base";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PresentationReadPortV1 } from "../assets/presentation-read-port.js";
import type { RuntimeAppearanceLayerV1, RuntimeCharacterPresentationV1 } from "./contracts.js";
import { PaperDollCharacterRendererV1 } from "./paper-doll-character-renderer.js";
import { StaticCharacterRendererV1 } from "./static-character-renderer.js";

type CharacterAssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];
type CharacterPresentationV1 = PresentationReadPortV1<
  TextId,
  AssetId,
  CharacterAssetUsageV1,
  LocaleId,
  string
>;

const characterIdV1 = parseCharacterId("character.synthetic.guide");
const accessibleNameTextIdV1 = parseTextId("text.synthetic.guide.name");
const rigIdV1 = parseCharacterRigId("rig.synthetic.guide");
const standingPoseIdV1 = parseCharacterPoseId("pose.synthetic.guide.standing");
const seatedPoseIdV1 = parseCharacterPoseId("pose.synthetic.guide.seated");
const expressionIdV1 = parseCharacterExpressionId("expression.synthetic.guide.neutral");
const defaultHitMapIdV1 = parseHitMapId("hit_map.synthetic.guide.default");
const seatedHitMapIdV1 = parseHitMapId("hit_map.synthetic.guide.seated");
const staticAssetIdV1 = parseAssetId("asset.synthetic.guide.static");
const alternateStaticAssetIdV1 = parseAssetId("asset.synthetic.guide.static.alternate");

const backLayerIdV1 = parseAppearanceLayerId("layer.e2e.back");
const bodyLayerIdV1 = parseAppearanceLayerId("layer.e2e.body");
const faceLayerIdV1 = parseAppearanceLayerId("layer.e2e.face");
const frontLayerIdV1 = parseAppearanceLayerId("layer.e2e.front");
const backAssetIdV1 = parseAssetId("asset.synthetic.guide.layer.back");
const bodyAssetIdV1 = parseAssetId("asset.synthetic.guide.layer.body");
const alternateBodyAssetIdV1 = parseAssetId("asset.synthetic.guide.layer.body.alternate");
const faceAssetIdV1 = parseAssetId("asset.synthetic.guide.layer.face");
const frontAssetIdV1 = parseAssetId("asset.synthetic.guide.layer.front");

const semanticV1 = Object.freeze({ revision: parseNonNegativeSafeInteger(9) });

const rigDescriptorV1 = Object.freeze({
  rigId: rigIdV1,
  rendererId: "renderer.synthetic.paper_doll",
  poseIds: Object.freeze([standingPoseIdV1, seatedPoseIdV1]),
  expressionIds: Object.freeze([expressionIdV1]),
  activityIds: Object.freeze([]),
  appearanceLayerOrder: Object.freeze([
    backLayerIdV1,
    bodyLayerIdV1,
    faceLayerIdV1,
    frontLayerIdV1,
  ]),
  defaultHitMapId: defaultHitMapIdV1,
  poseHitMapOverrides: Object.freeze([
    Object.freeze({ poseId: seatedPoseIdV1, hitMapId: seatedHitMapIdV1 }),
  ]),
  staticFallbackAssetId: staticAssetIdV1,
  fallbackHitMapCompatibility: "compatible",
}) satisfies CharacterRigDescriptorV1;

function resolveAuthoredHitMapV1(
  rig: CharacterRigDescriptorV1,
  poseId: CharacterPoseId,
): HitMapId | null {
  return (
    rig.poseHitMapOverrides.find((candidate) => candidate.poseId === poseId)?.hitMapId ??
    rig.defaultHitMapId
  );
}

function appearanceLayerV1(
  layerId: RuntimeAppearanceLayerV1["layerId"],
  assetId: AssetId,
  fallbackPolicy: RuntimeAppearanceLayerV1["fallbackPolicy"],
): RuntimeAppearanceLayerV1 {
  return Object.freeze({ layerId, assetId, fallbackPolicy });
}

function fullAppearanceV1(bodyAssetId: AssetId = bodyAssetIdV1) {
  const assetsByLayer = new Map([
    [backLayerIdV1, backAssetIdV1],
    [bodyLayerIdV1, bodyAssetId],
    [faceLayerIdV1, faceAssetIdV1],
    [frontLayerIdV1, frontAssetIdV1],
  ] as const);

  return Object.freeze(
    rigDescriptorV1.appearanceLayerOrder.map((layerId) =>
      appearanceLayerV1(
        layerId,
        assetsByLayer.get(layerId) as AssetId,
        layerId === bodyLayerIdV1 ? "character_fallback" : "omit",
      ),
    ),
  );
}

interface CharacterViewOverridesV1 {
  readonly rendererId?: string;
  readonly poseId?: CharacterPoseId;
  readonly appearance?: readonly RuntimeAppearanceLayerV1[];
  readonly hitMapId?: HitMapId | null;
  readonly staticFallbackAssetId?: AssetId | null;
  readonly fallbackHitMapCompatibility?: "compatible" | "incompatible";
}

function characterViewV1(overrides: CharacterViewOverridesV1 = {}): RuntimeCharacterPresentationV1 {
  const poseId = overrides.poseId ?? standingPoseIdV1;
  return Object.freeze({
    characterId: characterIdV1,
    accessibleNameTextId: accessibleNameTextIdV1,
    rendererId: overrides.rendererId ?? "renderer.synthetic.paper_doll",
    rigId: rigIdV1,
    poseId,
    expressionId: expressionIdV1,
    activityId: null,
    appearance: Object.freeze([...(overrides.appearance ?? fullAppearanceV1())]),
    hitMapId:
      overrides.hitMapId === undefined
        ? resolveAuthoredHitMapV1(rigDescriptorV1, poseId)
        : overrides.hitMapId,
    anchor: Object.freeze({
      x: parseNormalizedCoordinateV1(0.5),
      y: parseNormalizedCoordinateV1(0.85),
    }),
    scale: parsePositiveFiniteNumber(1),
    staticFallbackAssetId:
      overrides.staticFallbackAssetId === undefined
        ? staticAssetIdV1
        : overrides.staticFallbackAssetId,
    fallbackHitMapCompatibility: overrides.fallbackHitMapCompatibility ?? "compatible",
  });
}

function codeFallbackV1(
  assetId: AssetId,
): ResolvedAssetPresentationV1<AssetId, CharacterAssetUsageV1, string> {
  return Object.freeze({
    delivery: "code_fallback",
    assetId,
    usage: "character_pose",
    fallbackToken: `fallback.${assetId}`,
  });
}

function runtimeImageV1(
  assetId: AssetId,
  url: string,
): ResolvedAssetPresentationV1<AssetId, CharacterAssetUsageV1, string> {
  return Object.freeze({
    delivery: "runtime_image",
    assetId,
    usage: "character_pose",
    url,
    width: parsePositiveSafeInteger(1200),
    height: parsePositiveSafeInteger(1800),
    fallbackToken: `fallback.${assetId}`,
  });
}

function createCharacterPresentationFixtureV1() {
  const listeners = new Set<() => void>();
  const resolutions = new Map<
    AssetId,
    ResolvedAssetPresentationV1<AssetId, CharacterAssetUsageV1, string>
  >();
  let publication = Object.freeze({ revision: parseNonNegativeSafeInteger(0) });

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
    expect(usage).toBe("character_pose");
    return resolutions.get(assetId) ?? codeFallbackV1(assetId);
  });
  const observeAssets = vi.fn(() => publication);
  const subscribeAssets = vi.fn((listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  });
  const presentation = Object.freeze({
    locale: parseLocaleId("zh-CN"),
    text,
    asset,
    observeAssets,
    subscribeAssets,
  }) satisfies CharacterPresentationV1;

  return Object.freeze({
    presentation,
    text,
    asset,
    observeAssets,
    subscribeAssets,
    primeRuntimeImage(assetId: AssetId, url: string) {
      resolutions.set(assetId, runtimeImageV1(assetId, url));
    },
    primeCodeFallback(assetId: AssetId) {
      resolutions.set(assetId, codeFallbackV1(assetId));
    },
    publishRuntimeImage(assetId: AssetId, url: string) {
      resolutions.set(assetId, runtimeImageV1(assetId, url));
      publication = Object.freeze({
        revision: parseNonNegativeSafeInteger(Number(publication.revision) + 1),
      });
      for (const listener of [...listeners]) listener();
    },
    listenerCount() {
      return listeners.size;
    },
  });
}

function primePaperDollAssetsV1(
  fixture: ReturnType<typeof createCharacterPresentationFixtureV1>,
): void {
  fixture.primeRuntimeImage(backAssetIdV1, "/assets/back.webp");
  fixture.primeRuntimeImage(bodyAssetIdV1, "/assets/body.webp");
  fixture.primeRuntimeImage(alternateBodyAssetIdV1, "/assets/body-alternate.webp");
  fixture.primeRuntimeImage(faceAssetIdV1, "/assets/face.webp");
  fixture.primeRuntimeImage(frontAssetIdV1, "/assets/front.webp");
}

function renderStaticV1(
  character: RuntimeCharacterPresentationV1,
  presentation: CharacterPresentationV1,
) {
  return render(
    <StaticCharacterRendererV1
      viewSlice={character}
      semantic={semanticV1}
      presentation={presentation}
    />,
  );
}

function renderPaperDollV1(
  character: RuntimeCharacterPresentationV1,
  presentation: CharacterPresentationV1,
) {
  return render(
    <PaperDollCharacterRendererV1
      viewSlice={character}
      semantic={semanticV1}
      presentation={presentation}
    />,
  );
}

function renderedLayerIdsV1(): readonly string[] {
  return screen
    .queryAllByTestId("appearance-layer")
    .map((node) => node.dataset["layerId"] ?? "missing-layer-id");
}

afterEach(cleanup);

describe("StaticCharacterRendererV1 and PaperDollCharacterRendererV1", () => {
  it("renders static and paper-doll characters with the same stable identity", () => {
    const fixture = createCharacterPresentationFixtureV1();
    fixture.primeRuntimeImage(staticAssetIdV1, "/assets/static.webp");
    primePaperDollAssetsV1(fixture);
    const staticCharacter = characterViewV1({
      rendererId: "renderer.synthetic.static",
      appearance: Object.freeze([]),
    });
    const paperDollCharacter = characterViewV1();

    const staticResult = renderStaticV1(staticCharacter, fixture.presentation);
    expect(staticResult.getByTestId("character-root")).toHaveAttribute(
      "data-character-id",
      "character.synthetic.guide",
    );
    expect(staticResult.getByTestId("character-root")).toHaveAttribute(
      "data-hit-map-id",
      "hit_map.synthetic.guide.default",
    );
    staticResult.unmount();

    const layeredResult = renderPaperDollV1(paperDollCharacter, fixture.presentation);
    expect(layeredResult.getByTestId("character-root")).toHaveAttribute(
      "data-character-id",
      "character.synthetic.guide",
    );
    expect(layeredResult.getByTestId("character-root")).toHaveAttribute(
      "data-hit-map-id",
      "hit_map.synthetic.guide.default",
    );
  });

  it("uses the projected authored layer order rather than engine-owned clothing names", () => {
    const fixture = createCharacterPresentationFixtureV1();
    primePaperDollAssetsV1(fixture);

    renderPaperDollV1(characterViewV1(), fixture.presentation);

    expect(renderedLayerIdsV1()).toEqual([
      "layer.e2e.back",
      "layer.e2e.body",
      "layer.e2e.face",
      "layer.e2e.front",
    ]);
  });

  it("changes appearance without changing stable rig, pose, expression, or HitMap identity", () => {
    const fixture = createCharacterPresentationFixtureV1();
    primePaperDollAssetsV1(fixture);
    const initial = characterViewV1();
    const next = characterViewV1({ appearance: fullAppearanceV1(alternateBodyAssetIdV1) });
    const rendered = renderPaperDollV1(initial, fixture.presentation);
    const root = screen.getByTestId("character-root");

    rendered.rerender(
      <PaperDollCharacterRendererV1
        viewSlice={next}
        semantic={semanticV1}
        presentation={fixture.presentation}
      />,
    );

    expect(screen.getByTestId("character-root")).toBe(root);
    expect(root).toHaveAttribute("data-rig-id", "rig.synthetic.guide");
    expect(root).toHaveAttribute("data-pose-id", "pose.synthetic.guide.standing");
    expect(root).toHaveAttribute("data-expression-id", "expression.synthetic.guide.neutral");
    expect(root).toHaveAttribute("data-hit-map-id", "hit_map.synthetic.guide.default");
    expect(
      screen
        .getAllByTestId("appearance-layer-runtime-image")
        .some((node) => node.getAttribute("src") === "/assets/body-alternate.webp"),
    ).toBe(true);
  });

  it("preserves the rig default HitMap and an authored pose-specific override", () => {
    const fixture = createCharacterPresentationFixtureV1();
    primePaperDollAssetsV1(fixture);
    const standing = characterViewV1({ poseId: standingPoseIdV1 });
    const seated = characterViewV1({ poseId: seatedPoseIdV1 });
    const rendered = renderPaperDollV1(standing, fixture.presentation);

    expect(screen.getByTestId("character-root")).toHaveAttribute(
      "data-hit-map-id",
      "hit_map.synthetic.guide.default",
    );

    rendered.rerender(
      <PaperDollCharacterRendererV1
        viewSlice={seated}
        semantic={semanticV1}
        presentation={fixture.presentation}
      />,
    );
    expect(screen.getByTestId("character-root")).toHaveAttribute(
      "data-pose-id",
      "pose.synthetic.guide.seated",
    );
    expect(screen.getByTestId("character-root")).toHaveAttribute(
      "data-hit-map-id",
      "hit_map.synthetic.guide.seated",
    );
  });

  it("omits only an unavailable omit-policy layer", () => {
    const fixture = createCharacterPresentationFixtureV1();
    fixture.primeRuntimeImage(bodyAssetIdV1, "/assets/body.webp");
    fixture.primeRuntimeImage(faceAssetIdV1, "/assets/face.webp");
    fixture.primeRuntimeImage(frontAssetIdV1, "/assets/front.webp");
    fixture.primeCodeFallback(backAssetIdV1);

    renderPaperDollV1(characterViewV1(), fixture.presentation);

    expect(renderedLayerIdsV1()).toEqual(["layer.e2e.body", "layer.e2e.face", "layer.e2e.front"]);
    expect(screen.getByTestId("character-root")).not.toHaveAttribute(
      "data-character-fallback",
      "code_native",
    );
    expect(screen.getAllByTestId("appearance-layer-runtime-image")).toHaveLength(3);
  });

  it("falls back the whole character through the static asset for a critical layer failure", () => {
    const fixture = createCharacterPresentationFixtureV1();
    fixture.primeCodeFallback(bodyAssetIdV1);
    fixture.primeRuntimeImage(staticAssetIdV1, "/assets/static.webp");

    const rendered = renderPaperDollV1(
      characterViewV1({ fallbackHitMapCompatibility: "incompatible" }),
      fixture.presentation,
    );

    expect(screen.queryAllByTestId("appearance-layer")).toHaveLength(0);
    expect(rendered.container.querySelector('img[src="/assets/static.webp"]')).toBeVisible();
    expect(screen.getByTestId("character-root")).toHaveAttribute(
      "data-character-fallback",
      "static_asset",
    );
    expect(screen.getByTestId("character-root")).toHaveAttribute(
      "data-spatial-hit-test",
      "disabled",
    );
  });

  it("uses a named code-native silhouette when both the critical layer and static asset fail", () => {
    const fixture = createCharacterPresentationFixtureV1();
    fixture.primeCodeFallback(bodyAssetIdV1);
    fixture.primeCodeFallback(staticAssetIdV1);

    renderPaperDollV1(characterViewV1(), fixture.presentation);

    const root = screen.getByRole("img", { name: "测试角色" });
    expect(root).toBeVisible();
    expect(root).toHaveAttribute("data-character-fallback", "code_native");
    expect(root).toHaveAttribute("data-character-id", "character.synthetic.guide");
    expect(root).toHaveAttribute("data-spatial-hit-test", "disabled");
    expect(screen.queryAllByTestId("appearance-layer")).toHaveLength(0);
  });

  it("retains spatial hit testing only for a declared compatible static fallback", () => {
    const fixture = createCharacterPresentationFixtureV1();
    fixture.primeCodeFallback(bodyAssetIdV1);
    fixture.primeRuntimeImage(staticAssetIdV1, "/assets/static.webp");
    const rendered = renderPaperDollV1(
      characterViewV1({ fallbackHitMapCompatibility: "incompatible" }),
      fixture.presentation,
    );

    expect(screen.getByTestId("character-root")).toHaveAttribute(
      "data-spatial-hit-test",
      "disabled",
    );

    rendered.rerender(
      <PaperDollCharacterRendererV1
        viewSlice={characterViewV1({ fallbackHitMapCompatibility: "compatible" })}
        semantic={semanticV1}
        presentation={fixture.presentation}
      />,
    );
    expect(screen.getByTestId("character-root")).toHaveAttribute(
      "data-spatial-hit-test",
      "enabled",
    );
  });

  it("disables spatial hit testing when a compatible fallback has no projected HitMap", () => {
    const fixture = createCharacterPresentationFixtureV1();
    fixture.primeCodeFallback(bodyAssetIdV1);
    fixture.primeRuntimeImage(staticAssetIdV1, "/assets/static.webp");

    renderPaperDollV1(
      characterViewV1({
        hitMapId: null,
        fallbackHitMapCompatibility: "compatible",
      }),
      fixture.presentation,
    );

    expect(screen.getByTestId("character-root")).toHaveAttribute(
      "data-spatial-hit-test",
      "disabled",
    );
  });

  it("uses the named code-native silhouette when no static fallback asset is declared", () => {
    const fixture = createCharacterPresentationFixtureV1();
    fixture.primeCodeFallback(bodyAssetIdV1);

    renderPaperDollV1(characterViewV1({ staticFallbackAssetId: null }), fixture.presentation);

    const root = screen.getByRole("img", { name: "测试角色" });
    expect(root).toHaveAttribute("data-character-fallback", "code_native");
    expect(root).toHaveAttribute("data-spatial-hit-test", "disabled");
    expect(fixture.asset).not.toHaveBeenCalledWith(staticAssetIdV1, "character_pose");
  });

  it("exposes one accessible character root while every bitmap layer stays decorative", () => {
    const fixture = createCharacterPresentationFixtureV1();
    primePaperDollAssetsV1(fixture);

    renderPaperDollV1(characterViewV1(), fixture.presentation);

    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "测试角色" })).toBe(
      screen.getByTestId("character-root"),
    );
    for (const image of screen.getAllByTestId("appearance-layer-runtime-image")) {
      expect(image).toHaveAttribute("alt", "");
      expect(image).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("rerenders deferred paper-doll assets without replacing the runtime or Gameplay view", async () => {
    const fixture = createCharacterPresentationFixtureV1();
    fixture.primeRuntimeImage(backAssetIdV1, "/assets/back.webp");
    fixture.primeCodeFallback(bodyAssetIdV1);
    fixture.primeRuntimeImage(faceAssetIdV1, "/assets/face.webp");
    fixture.primeRuntimeImage(frontAssetIdV1, "/assets/front.webp");
    fixture.primeCodeFallback(staticAssetIdV1);
    const runtimePublication = Object.freeze({
      revision: parseNonNegativeSafeInteger(12),
      character: characterViewV1(),
    });
    const runtimePresentation = Object.freeze({ getSnapshot: () => runtimePublication });
    const gameplayWitness = Object.freeze({ day: 2, relationship: 3 });

    renderPaperDollV1(runtimePublication.character, fixture.presentation);
    expect(screen.getByTestId("character-root")).toHaveAttribute(
      "data-character-fallback",
      "code_native",
    );
    const runtimeBefore = runtimePresentation.getSnapshot();

    act(() => fixture.publishRuntimeImage(bodyAssetIdV1, "/assets/body.webp"));

    expect(
      (await screen.findAllByTestId("appearance-layer-runtime-image")).some(
        (node) => node.getAttribute("src") === "/assets/body.webp",
      ),
    ).toBe(true);
    expect(runtimePresentation.getSnapshot()).toBe(runtimeBefore);
    expect(gameplayWitness).toEqual({ day: 2, relationship: 3 });
  });

  it("uses one batch asset subscription across variable appearance layer counts", () => {
    const fixture = createCharacterPresentationFixtureV1();
    primePaperDollAssetsV1(fixture);
    fixture.primeRuntimeImage(alternateStaticAssetIdV1, "/assets/extra.webp");
    const oneLayer = Object.freeze([fullAppearanceV1()[1] as RuntimeAppearanceLayerV1]);
    const fourLayers = fullAppearanceV1();
    const twoLayers = Object.freeze([
      fullAppearanceV1()[0] as RuntimeAppearanceLayerV1,
      appearanceLayerV1(frontLayerIdV1, alternateStaticAssetIdV1, "omit"),
    ]);
    const rendered = renderPaperDollV1(
      characterViewV1({ appearance: oneLayer }),
      fixture.presentation,
    );

    expect(fixture.listenerCount()).toBe(1);
    expect(renderedLayerIdsV1()).toEqual(["layer.e2e.body"]);
    expect(() =>
      rendered.rerender(
        <PaperDollCharacterRendererV1
          viewSlice={characterViewV1({ appearance: fourLayers })}
          semantic={semanticV1}
          presentation={fixture.presentation}
        />,
      ),
    ).not.toThrow();
    expect(fixture.listenerCount()).toBe(1);
    expect(renderedLayerIdsV1()).toEqual([
      "layer.e2e.back",
      "layer.e2e.body",
      "layer.e2e.face",
      "layer.e2e.front",
    ]);

    expect(() =>
      rendered.rerender(
        <PaperDollCharacterRendererV1
          viewSlice={characterViewV1({ appearance: twoLayers })}
          semantic={semanticV1}
          presentation={fixture.presentation}
        />,
      ),
    ).not.toThrow();
    expect(fixture.listenerCount()).toBe(1);
    expect(renderedLayerIdsV1()).toEqual(["layer.e2e.back", "layer.e2e.front"]);
  });

  it("keeps renderer ownership neutral and raw asset reads behind the two approved hooks", async () => {
    const [paperDoll, staticRenderer, batchHook] = await Promise.all([
      readFile(resolve(import.meta.dirname, "paper-doll-character-renderer.tsx"), "utf8"),
      readFile(resolve(import.meta.dirname, "static-character-renderer.tsx"), "utf8"),
      readFile(resolve(import.meta.dirname, "use-character-assets.ts"), "utf8"),
    ]);

    expect(`${paperDoll}\n${staticRenderer}`).not.toMatch(
      /back_hair|costume_body|front_hair|held_prop|foreground_effect/u,
    );
    expect(paperDoll).toContain("useCharacterAssetsV1");
    expect(paperDoll).not.toMatch(/presentation\.asset\s*\(/u);
    expect(staticRenderer).toContain("usePresentationAssetV1");
    expect(staticRenderer).not.toMatch(/presentation\.asset\s*\(/u);
    expect(batchHook.match(/useSyncExternalStore\s*\(/gu)).toHaveLength(1);
    expect(batchHook.match(/presentation\.asset\s*\(/gu)).toHaveLength(1);
  });

  it("uses one shared absolute canvas and bottom-center foot pivot", async () => {
    const css = await readFile(
      resolve(import.meta.dirname, "character-renderers.module.css"),
      "utf8",
    );

    expect(css).toMatch(/\.character-root\s*\{[\s\S]*position:\s*absolute/u);
    expect(css).toMatch(/\.character-root\s*\{[\s\S]*transform-origin:\s*bottom center/u);
    expect(css).toMatch(/\.character-root\s*\{[\s\S]*pointer-events:\s*none/u);
    expect(css).toMatch(/\.appearance-layer\s*\{[\s\S]*position:\s*absolute/u);
    expect(css).toMatch(/\.appearance-layer\s*\{[\s\S]*inset:\s*0/u);
  });
});
