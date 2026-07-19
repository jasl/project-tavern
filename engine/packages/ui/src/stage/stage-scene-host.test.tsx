// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";

import { access, readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

import {
  parseAssetId,
  parseLocaleId,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseStageSceneId,
  parseStageSceneVariantId,
  parseTextId,
} from "@sillymaker/base";
import type {
  AssetId,
  DeepReadonly,
  LocaleId,
  ResolvedAssetPresentationV1,
  StageSceneVariantId,
  TextId,
} from "@sillymaker/base";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePresentationAssetV1 } from "../assets/use-presentation-asset.js";
import { createUiContributionRegistryV1 } from "../contributions/registry.js";
import type {
  GameRendererContextV1,
  UiContributionRegistryV1,
  UiContributionSetV1,
} from "../contributions/types.js";
import type { PresentationReadPortV1 } from "../assets/presentation-read-port.js";
import type { RuntimeStageSceneV1 } from "./contracts.js";
import { CodeFallbackStageSceneV1, StageSceneHostV1 } from "./stage-scene-host.js";

type StageAssetUsageV1 = "scene_background";
type StagePresentationV1 = PresentationReadPortV1<
  TextId,
  AssetId,
  StageAssetUsageV1,
  LocaleId,
  string
>;

interface TestSemanticPortV1 {
  readonly revision: ReturnType<typeof parseNonNegativeSafeInteger>;
}

type BackgroundContextV1 = GameRendererContextV1<
  RuntimeStageSceneV1,
  TestSemanticPortV1,
  StagePresentationV1
>;

type TestRendererContextsV1 = Readonly<{
  readonly background: BackgroundContextV1;
  readonly character: unknown;
  readonly scene_interaction: unknown;
  readonly hud: unknown;
  readonly workspace_overlay: unknown;
  readonly narrative: unknown;
  readonly system: unknown;
}>;

const calmSceneIdV1 = parseStageSceneId("stage_scene.e2e.main");
const calmVariantIdV1 = parseStageSceneVariantId("stage_variant.e2e.main.calm");
const activeVariantIdV1 = parseStageSceneVariantId("stage_variant.e2e.main.active");
const backgroundAssetIdV1 = parseAssetId("asset.e2e.stage.background");
const backgroundNameTextIdV1 = parseTextId("text.e2e.stage.background.name");
const semanticV1 = Object.freeze({ revision: parseNonNegativeSafeInteger(7) });

function runtimeStageV1(
  variantId: StageSceneVariantId,
  rendererId: string,
): DeepReadonly<RuntimeStageSceneV1> {
  return Object.freeze({
    stageSceneId: calmSceneIdV1,
    variantId,
    rendererId,
    background: Object.freeze({
      assetId: backgroundAssetIdV1,
      accessibleNameTextId: backgroundNameTextIdV1,
    }),
    layout: Object.freeze({ tone: variantId === calmVariantIdV1 ? "calm" : "active" }),
  });
}

function createStagePresentationFixtureV1() {
  const listeners = new Set<() => void>();
  let publication = Object.freeze({ revision: parseNonNegativeSafeInteger(0) });
  let resolved: ResolvedAssetPresentationV1<AssetId, StageAssetUsageV1, string> = Object.freeze({
    delivery: "code_fallback",
    assetId: backgroundAssetIdV1,
    usage: "scene_background",
    fallbackToken: "fallback.e2e.stage.background",
  });

  const text = vi.fn((textId: TextId) => {
    expect(textId).toBe(backgroundNameTextIdV1);
    return Object.freeze({
      textId,
      requestedLocale: parseLocaleId("zh-CN"),
      resolvedLocale: parseLocaleId("zh-CN"),
      text: "中性计数场景",
    });
  });
  const asset = vi.fn((assetId: AssetId, usage: StageAssetUsageV1) => {
    expect(assetId).toBe(backgroundAssetIdV1);
    expect(usage).toBe("scene_background");
    return resolved;
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
  }) satisfies StagePresentationV1;

  return Object.freeze({
    presentation,
    asset,
    text,
    publishRuntimeImage(url: string) {
      resolved = Object.freeze({
        delivery: "runtime_image",
        assetId: backgroundAssetIdV1,
        usage: "scene_background",
        url,
        width: parsePositiveSafeInteger(1600),
        height: parsePositiveSafeInteger(1000),
        fallbackToken: "fallback.e2e.stage.background",
      });
      publication = Object.freeze({ revision: parseNonNegativeSafeInteger(1) });
      for (const listener of [...listeners]) listener();
    },
  });
}

function ResolvedBackgroundV1(props: BackgroundContextV1): ReactElement {
  const asset = usePresentationAssetV1(
    props.presentation,
    props.viewSlice.background.assetId,
    "scene_background",
  );
  const accessibleName = props.presentation.text(
    props.viewSlice.background.accessibleNameTextId,
  ).text;

  if (asset.delivery === "runtime_image") {
    return (
      <img
        data-testid="stage-runtime-image"
        src={asset.url}
        width={asset.width}
        height={asset.height}
        alt={accessibleName}
      />
    );
  }

  return (
    <CodeFallbackStageSceneV1 accessibleName={accessibleName} fallbackToken={asset.fallbackToken} />
  );
}

const CalmBackgroundRendererV1 = vi.fn(ResolvedBackgroundV1);
const ActiveBackgroundRendererV1 = vi.fn(ResolvedBackgroundV1);
const HudRendererWithSharedIdV1 = vi.fn((_props: unknown) => (
  <p data-testid="wrong-namespace-renderer">wrong namespace</p>
));

function createBackgroundContributionsV1(): UiContributionRegistryV1<TestRendererContextsV1> {
  const contributions = Object.freeze({
    contributionId: "contribution.e2e.stage",
    renderers: Object.freeze({
      background: Object.freeze([
        Object.freeze({
          rendererId: "renderer.e2e.stage.calm",
          component: CalmBackgroundRendererV1,
        }),
        Object.freeze({
          rendererId: "renderer.e2e.stage.active",
          component: ActiveBackgroundRendererV1,
        }),
      ]),
      hud: Object.freeze([
        Object.freeze({
          rendererId: "renderer.e2e.stage.calm",
          component: HudRendererWithSharedIdV1,
        }),
      ]),
    }),
  }) satisfies UiContributionSetV1<TestRendererContextsV1>;

  return createUiContributionRegistryV1<TestRendererContextsV1>([contributions]);
}

function setReducedMotionV1(matches: boolean): void {
  const mediaQueryList: MediaQueryList = {
    matches,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  };
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => mediaQueryList),
  });
}

async function existingSourcePathV1(rawPath: string): Promise<string | null> {
  const extension = extname(rawPath);
  const candidates =
    extension === ".js"
      ? [`${rawPath.slice(0, -3)}.ts`, `${rawPath.slice(0, -3)}.tsx`]
      : extension === ""
        ? [rawPath, `${rawPath}.ts`, `${rawPath}.tsx`, resolve(rawPath, "index.ts")]
        : [rawPath];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next NodeNext source candidate.
    }
  }
  return null;
}

async function collectNodeImportClosureV1(entry: string): Promise<string> {
  const repositoryRoot = resolve(import.meta.dirname, "../../../../..");
  const queue = [resolve(repositoryRoot, entry)];
  const visited = new Set<string>();
  const output = new Set<string>();
  const staticPattern = /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/gu;

  while (queue.length > 0) {
    const file = queue.shift();
    if (file === undefined || visited.has(file)) continue;
    visited.add(file);
    output.add(file.slice(repositoryRoot.length + 1));
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(staticPattern)) {
      const specifier = match[1];
      if (specifier === undefined) continue;
      output.add(specifier);
      if (!specifier.startsWith(".")) continue;
      const target = await existingSourcePathV1(resolve(dirname(file), specifier));
      if (target === null) throw new TypeError(`missing closure import: ${specifier}`);
      queue.push(target);
    }
  }

  return [...output].toSorted().join("\n");
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
  setReducedMotionV1(false);
  CalmBackgroundRendererV1.mockClear();
  ActiveBackgroundRendererV1.mockClear();
  HudRendererWithSharedIdV1.mockClear();
});

afterEach(cleanup);

describe("StageSceneHostV1", () => {
  it("renders the selected variant through only its registered background renderer", () => {
    const fixture = createStagePresentationFixtureV1();
    const stage = runtimeStageV1(calmVariantIdV1, "renderer.e2e.stage.calm");

    render(
      <StageSceneHostV1
        stage={stage}
        contributions={createBackgroundContributionsV1()}
        semantic={semanticV1}
        presentation={fixture.presentation}
      />,
    );

    const background = screen.getByTestId("stage-scene-background");
    expect(background).toHaveAttribute("data-stage-scene-id", "stage_scene.e2e.main");
    expect(background).toHaveAttribute("data-stage-variant-id", "stage_variant.e2e.main.calm");
    expect(CalmBackgroundRendererV1).toHaveBeenCalledOnce();
    expect(HudRendererWithSharedIdV1).not.toHaveBeenCalled();
    expect(screen.queryByTestId("wrong-namespace-renderer")).not.toBeInTheDocument();

    const context = CalmBackgroundRendererV1.mock.calls[0]?.[0];
    expect(Object.keys(context ?? {}).toSorted()).toEqual([
      "presentation",
      "semantic",
      "viewSlice",
    ]);
    expect(context?.viewSlice).toBe(stage);
    expect(context?.semantic).toBe(semanticV1);
    expect(context?.presentation).toBe(fixture.presentation);
    expect(fixture.asset).toHaveBeenCalledWith(backgroundAssetIdV1, "scene_background");
  });

  it("replaces only the projected runtime variant and preserves the background host", () => {
    const fixture = createStagePresentationFixtureV1();
    const contributions = createBackgroundContributionsV1();
    const calm = runtimeStageV1(calmVariantIdV1, "renderer.e2e.stage.calm");
    const active = runtimeStageV1(activeVariantIdV1, "renderer.e2e.stage.active");
    const rendered = render(
      <StageSceneHostV1
        stage={calm}
        contributions={contributions}
        semantic={semanticV1}
        presentation={fixture.presentation}
      />,
    );
    const mountedHost = screen.getByTestId("stage-scene-background");
    const mountedVariant = screen.getByTestId("stage-scene-variant");

    rendered.rerender(
      <StageSceneHostV1
        stage={active}
        contributions={contributions}
        semantic={semanticV1}
        presentation={fixture.presentation}
      />,
    );

    expect(screen.getByTestId("stage-scene-background")).toBe(mountedHost);
    expect(screen.getByTestId("stage-scene-variant")).not.toBe(mountedVariant);
    expect(mountedHost).toHaveAttribute("data-stage-variant-id", "stage_variant.e2e.main.active");
    expect(CalmBackgroundRendererV1).toHaveBeenCalledOnce();
    expect(ActiveBackgroundRendererV1).toHaveBeenCalledOnce();
    expect(ActiveBackgroundRendererV1.mock.calls[0]?.[0]?.semantic).toBe(semanticV1);
    expect(ActiveBackgroundRendererV1.mock.calls[0]?.[0]?.presentation).toBe(fixture.presentation);
  });

  it("uses the localized code-native scene for an unknown renderer without guessing a default", () => {
    const fixture = createStagePresentationFixtureV1();
    const rendered = render(
      <StageSceneHostV1
        stage={runtimeStageV1(calmVariantIdV1, "renderer.e2e.stage.unknown")}
        contributions={createBackgroundContributionsV1()}
        semantic={semanticV1}
        presentation={fixture.presentation}
      />,
    );

    expect(CalmBackgroundRendererV1).not.toHaveBeenCalled();
    expect(ActiveBackgroundRendererV1).not.toHaveBeenCalled();
    expect(screen.getByRole("img", { name: "中性计数场景" })).toHaveAttribute(
      "data-stage-fallback",
      "code_native",
    );
    expect(screen.getByRole("img", { name: "中性计数场景" })).toHaveAttribute(
      "data-stage-fallback-token",
      "fallback.e2e.stage.background",
    );
    expect(fixture.text).toHaveBeenCalledWith(backgroundNameTextIdV1);
    expect(fixture.asset).toHaveBeenCalledWith(backgroundAssetIdV1, "scene_background");
    expect(rendered.container.querySelector(interactiveSelectorV1)).toBeNull();
  });

  it("keeps a registered renderer and uses the same code fallback when its asset is unavailable", () => {
    const fixture = createStagePresentationFixtureV1();
    render(
      <StageSceneHostV1
        stage={runtimeStageV1(calmVariantIdV1, "renderer.e2e.stage.calm")}
        contributions={createBackgroundContributionsV1()}
        semantic={semanticV1}
        presentation={fixture.presentation}
      />,
    );

    expect(CalmBackgroundRendererV1).toHaveBeenCalledOnce();
    expect(screen.getByRole("img", { name: "中性计数场景" })).toHaveAttribute(
      "data-stage-fallback",
      "code_native",
    );
  });

  it("uses the bounded opacity transition for ordinary motion", () => {
    const fixture = createStagePresentationFixtureV1();
    render(
      <StageSceneHostV1
        stage={runtimeStageV1(calmVariantIdV1, "renderer.e2e.stage.calm")}
        contributions={createBackgroundContributionsV1()}
        semantic={semanticV1}
        presentation={fixture.presentation}
      />,
    );

    expect(screen.getByTestId("stage-scene-background")).toHaveAttribute(
      "data-transition",
      "opacity",
    );
  });

  it("removes the cross-fade when reduced motion is requested", () => {
    setReducedMotionV1(true);
    const fixture = createStagePresentationFixtureV1();
    render(
      <StageSceneHostV1
        stage={runtimeStageV1(calmVariantIdV1, "renderer.e2e.stage.calm")}
        contributions={createBackgroundContributionsV1()}
        semantic={semanticV1}
        presentation={fixture.presentation}
      />,
    );

    expect(screen.getByTestId("stage-scene-background")).toHaveAttribute("data-transition", "none");
  });

  it("rerenders only the asset-backed subtree when deferred preload becomes ready", () => {
    const fixture = createStagePresentationFixtureV1();
    const runtimePresentationPublication = Object.freeze({
      revision: parseNonNegativeSafeInteger(11),
      semantic: semanticV1,
    });
    const runtimePresentation = Object.freeze({
      getSnapshot: () => runtimePresentationPublication,
    });
    const initialSemanticRevision = semanticV1.revision;
    render(
      <StageSceneHostV1
        stage={runtimeStageV1(calmVariantIdV1, "renderer.e2e.stage.calm")}
        contributions={createBackgroundContributionsV1()}
        semantic={semanticV1}
        presentation={fixture.presentation}
      />,
    );

    expect(screen.getByRole("img", { name: "中性计数场景" })).toHaveAttribute(
      "data-stage-fallback",
      "code_native",
    );
    const before = runtimePresentation.getSnapshot();

    act(() => fixture.publishRuntimeImage("/assets/active.webp"));

    expect(screen.getByTestId("stage-runtime-image")).toHaveAttribute("src", "/assets/active.webp");
    expect(runtimePresentation.getSnapshot()).toBe(before);
    expect(semanticV1.revision).toBe(initialSemanticRevision);
  });

  it("keeps the background CSS full-stage, non-interactive, bounded, and reduced-motion safe", async () => {
    const css = await readFile(resolve(import.meta.dirname, "stage-scene-host.module.css"), "utf8");
    const transition = css.match(/transition:\s*opacity\s+(\d+)ms/u);
    const duration = Number(transition?.[1]);

    expect(css).toMatch(/position:\s*absolute/u);
    expect(css).toMatch(/inset:\s*0/u);
    expect(css).toMatch(/pointer-events:\s*none/u);
    expect(duration).toBeGreaterThanOrEqual(160);
    expect(duration).toBeLessThanOrEqual(240);
    expect(css).toContain("@starting-style");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[^{]*\{[\s\S]*transition:\s*none/u,
    );
  });

  it.each(["game/stories/poc/src/index.ts", "game/stories/poc/src/story-definition.ts"] as const)(
    "keeps %s free of the React Stage host",
    async (entry) => {
      const closure = await collectNodeImportClosureV1(entry);
      expect(closure).not.toMatch(/stage-scene-host|PocGameQueries|GameSession|\.tsx|react/u);
    },
  );

  it("keeps Stage production imports free of Story, Session, Query, and simulation owners", async () => {
    const sources = await Promise.all(
      ["contracts.ts", "stage-scene-host.tsx", "index.ts"].map((filename) =>
        readFile(resolve(import.meta.dirname, filename), "utf8"),
      ),
    );
    expect(sources.join("\n")).not.toMatch(
      /@project-tavern|stories\/|PocGameQueries|GameSession|createQueries|Calendar|simulation/u,
    );
  });
});
