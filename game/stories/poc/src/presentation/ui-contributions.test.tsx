// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import "@testing-library/jest-dom/vitest";

import { defineGamePackage, parseNonNegativeSafeInteger } from "@sillymaker/base";
import type {
  AssetId,
  AssetPackV1,
  DeepReadonly,
  ResolvedAssetManifestV1,
  TextId,
} from "@sillymaker/base";
import { resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import {
  InputContextProviderV1,
  createAssetRegistryV1,
  createUiContributionRegistryV1,
  createInputRouterV1,
  createPresentationReadPortV1,
  initialInteractionSessionStateV1,
  type RuntimeAssetLoadRequestV1,
  type RuntimeAssetLoaderV1,
  type UiContributionSetV1,
  type UiRendererNamespaceV1,
} from "@sillymaker/ui";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PocSemanticGamePortV1 } from "../application/create-poc-semantic-port.js";
import {
  characterIdsV1,
  choiceIdsV1,
  nodeIdsV1,
  pocHeroinePresentationIdsV1,
  pocRejectionReasonTextIdsByCodeV1,
  pocTextIdsV1,
  reasonIdsV1,
  sceneIdsV1,
} from "../content/ids.js";
import type { NarrativeProjectionV1 } from "../gameplay/contracts/types.js";
import { createPocStoryHarnessV1, fixedPocBootstrapV1 } from "../testing/poc-story-harness.js";
import { pocStoryEntryV1 } from "../story-definition.js";
import { pocResolvedPresentationCatalogV1 } from "./assets.js";
import { pocContentMaturityPolicyV1 } from "./content-maturity-policy.js";
import type { PocPresentationUiStateV1 } from "./runtime/contracts.js";
import { isPocNarrativeOpenV1 } from "./runtime/contracts.js";
import { projectPocRuntimePresentationV1 } from "./runtime/project-poc-runtime-presentation.js";
import { pocSceneGraphV1, pocStageRendererIdsV1 } from "./scene-graph.js";
import { pocGameSymbolRegistryV1 } from "./symbols/poc-game-symbols.js";
import {
  parsePocSemanticInvocationV1,
  type PocSemanticActionDescriptorV1,
  type PocSemanticInvocationV1,
} from "./semantic-actions.js";
import { pocZhCnTextCatalogV1 } from "./text-catalogs/zh-CN.js";
import {
  pocFixedRendererIdsV1,
  pocUiContributionsV1,
  type PocUiPresentationReadPortV1,
  type PocUiRendererContextsV1,
} from "./ui-contributions.js";

const rendererNamespacesV1 = Object.freeze([
  "background",
  "character",
  "scene_interaction",
  "hud",
  "workspace_overlay",
  "narrative",
  "system",
] as const satisfies readonly UiRendererNamespaceV1[]);

type PocAssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];

function rendererIdsV1(namespace: UiRendererNamespaceV1): readonly string[] {
  return (pocUiContributionsV1.renderers[namespace] ?? []).map(({ rendererId }) => rendererId);
}

const emptyConfirmationV1 = Object.freeze({
  benefitTextIds: Object.freeze([]),
  mutuallyExcludedActionIds: Object.freeze([]),
  majorRiskTextIds: Object.freeze([]),
});

const parsedNarrativeInvocationV1 = parsePocSemanticInvocationV1({
  kind: "invoke",
  actionId: "action.narrative_choose",
  options: {
    sceneId: sceneIdsV1[1],
    nodeId: nodeIdsV1[2],
    choiceId: choiceIdsV1[0],
  },
});
if (parsedNarrativeInvocationV1.actionId !== "action.narrative_choose") {
  throw new TypeError("invalid Narrative invocation fixture");
}
const narrativeInvocationV1 = parsedNarrativeInvocationV1;

const narrativeDescriptorV1 = Object.freeze({
  actionId: "action.narrative_choose",
  textId: pocTextIdsV1.actionNarrativeChooseLabel,
  enabled: true,
  reasons: Object.freeze([]),
  confirmation: emptyConfirmationV1,
  delivery: "choices",
  directInvocation: null,
  options: Object.freeze([
    Object.freeze({
      optionId: choiceIdsV1[0],
      textId: pocTextIdsV1.choiceSupplierInvoiceIntellectBLabel,
      invocation: narrativeInvocationV1,
    }),
  ] as const),
  form: null,
}) satisfies Extract<
  PocSemanticActionDescriptorV1,
  { readonly actionId: "action.narrative_choose" }
>;

function narrativeFixtureV1(input?: {
  readonly status?: NarrativeProjectionV1["status"];
  readonly enabled?: boolean;
  readonly disabledReasonId?: (typeof reasonIdsV1)[number];
}): DeepReadonly<NarrativeProjectionV1> {
  const enabled = input?.enabled ?? true;
  return Object.freeze({
    status: input?.status ?? "active",
    cursor: Object.freeze({ sceneId: sceneIdsV1[1], nodeId: nodeIdsV1[2] }),
    stage: Object.freeze({
      backgroundAssetId: null,
      characters: Object.freeze([]),
      transition: "cut" as const,
    }),
    speakerId: characterIdsV1[2],
    textId: pocTextIdsV1.actionNarrativeChooseLabel,
    choices: Object.freeze([
      Object.freeze({
        choiceId: choiceIdsV1[0],
        textId: pocTextIdsV1.choiceSupplierInvoiceIntellectBLabel,
        enabled,
        ...(enabled ? {} : { disabledReasonId: input?.disabledReasonId ?? reasonIdsV1[56] }),
        confirmation: emptyConfirmationV1,
      }),
    ]),
    latestResolvedCheck: null,
  });
}

function presentationFixtureV1(): PocUiPresentationReadPortV1 {
  const textById = new Map(
    pocZhCnTextCatalogV1.entries.map(({ textId, text }) => [textId, text] as const),
  );
  return Object.freeze({
    locale: pocZhCnTextCatalogV1.locale,
    text(textId: TextId) {
      const text = textById.get(textId);
      if (text === undefined) throw new TypeError(`missing PoC test text ${textId}`);
      return Object.freeze({
        textId,
        requestedLocale: pocZhCnTextCatalogV1.locale,
        resolvedLocale: pocZhCnTextCatalogV1.locale,
        text,
      });
    },
    asset: vi.fn(() => {
      throw new TypeError("Narrative must not resolve assets");
    }),
    observeAssets: () => Object.freeze({ revision: parseNonNegativeSafeInteger(0) }),
    subscribeAssets: () => () => {},
  }) as PocUiPresentationReadPortV1;
}

function narrativeRendererV1() {
  const registry = createUiContributionRegistryV1<PocUiRendererContextsV1>([pocUiContributionsV1]);
  const resolution = registry.resolve("narrative", "renderer.poc.narrative.vn");
  if (resolution.kind !== "found") throw new TypeError("missing PoC Narrative renderer");
  return resolution.component;
}

function workspaceOverlayRendererV1() {
  const registry = createUiContributionRegistryV1<PocUiRendererContextsV1>([pocUiContributionsV1]);
  const resolution = registry.resolve("workspace_overlay", pocFixedRendererIdsV1.workspaceOverlay);
  if (resolution.kind !== "found") throw new TypeError("missing PoC Overlay renderer");
  return resolution.component;
}

function characterRendererV1() {
  const registry = createUiContributionRegistryV1<PocUiRendererContextsV1>([pocUiContributionsV1]);
  const resolution = registry.resolve("character", pocHeroinePresentationIdsV1.rendererId);
  if (resolution.kind !== "found") throw new TypeError("missing PoC Character renderer");
  return resolution.component;
}

function backgroundRendererV1(rendererId: string) {
  const registry = createUiContributionRegistryV1<PocUiRendererContextsV1>([pocUiContributionsV1]);
  const resolution = registry.resolve("background", rendererId);
  if (resolution.kind !== "found") throw new TypeError("missing PoC Background renderer");
  return resolution.component;
}

function resolvePocWithAssetPacksV1(assetPacks: readonly AssetPackV1[]) {
  const source = pocStoryEntryV1.define();
  return resolveStoryForTestV1(
    defineGamePackage({
      contractRevision: 1,
      identity: pocStoryEntryV1.identity,
      define: () =>
        Object.freeze({
          simulation: source.simulation,
          presentation: Object.freeze({ ...source.presentation, assetPacks }),
        }),
    }),
  );
}

function assetLoaderFixtureV1(): RuntimeAssetLoaderV1 {
  return Object.freeze({
    cacheKey(request: DeepReadonly<RuntimeAssetLoadRequestV1>) {
      return `${request.runtimePath}#${request.sha256}`;
    },
    load: vi.fn(async (request: DeepReadonly<RuntimeAssetLoadRequestV1>) =>
      Object.freeze({ kind: "loaded" as const, url: `${request.runtimePath}#loaded` }),
    ),
    dispose: vi.fn(),
  });
}

afterEach(cleanup);

describe("pocUiContributionsV1", () => {
  it("registers one closed PoC contribution across all seven renderer namespaces", () => {
    expect(Object.keys(pocUiContributionsV1.renderers).sort()).toEqual(
      [...rendererNamespacesV1].sort(),
    );
    expect(rendererIdsV1("background")).toEqual(Object.values(pocStageRendererIdsV1));
    expect(rendererIdsV1("character")).toEqual([pocHeroinePresentationIdsV1.rendererId]);
    expect(rendererIdsV1("scene_interaction")).toEqual([pocFixedRendererIdsV1.sceneInteraction]);
    expect(rendererIdsV1("hud")).toEqual([pocFixedRendererIdsV1.hud]);
    expect(rendererIdsV1("workspace_overlay")).toEqual([pocFixedRendererIdsV1.workspaceOverlay]);
    expect(rendererIdsV1("narrative")).toEqual([pocFixedRendererIdsV1.narrative]);
    expect(rendererIdsV1("system")).toEqual([pocFixedRendererIdsV1.system]);
    expect(Object.isFrozen(pocFixedRendererIdsV1)).toBe(true);
    expect(Object.keys(pocUiContributionsV1.renderers)).not.toContain("gameSymbols");
  });

  it("resolves every renderer referenced by the frozen SceneGraph exactly once", () => {
    const registry = createUiContributionRegistryV1<PocUiRendererContextsV1>([
      pocUiContributionsV1,
    ]);

    for (const variant of pocSceneGraphV1.variants) {
      expect(registry.resolve("background", variant.rendererId).kind).toBe("found");
    }
    for (const rig of pocSceneGraphV1.characterRigs) {
      expect(registry.resolve("character", rig.rendererId).kind).toBe("found");
    }
    expect(new Set(rendererIdsV1("background")).size).toBe(
      Object.values(pocStageRendererIdsV1).length,
    );
  });

  it.each([
    ["default approved pack", () => resolveStoryForTestV1(pocStoryEntryV1), false],
    ["injected empty pack", () => resolvePocWithAssetPacksV1(Object.freeze([])), true],
  ] as const)(
    "renders the resolved tavern Scene and heroine through the %s manifest",
    async (_label, resolveGame, requiresCompleteFallback) => {
      const resolved = resolveGame();
      const loader = assetLoaderFixtureV1();
      const assets = createAssetRegistryV1<AssetId, PocAssetUsageV1, string>(
        resolved.assets,
        loader,
        vi.fn(),
      );
      const presentation = createPresentationReadPortV1({
        catalogs: resolved.presentation.textCatalogs,
        locale: pocZhCnTextCatalogV1.locale,
        assets,
      }) as PocUiPresentationReadPortV1;
      const harness = createPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });
      const uiState = Object.freeze({
        route: "play" as const,
        primaryOverlayId: null,
        interaction: initialInteractionSessionStateV1,
        activeCueId: null,
      }) satisfies DeepReadonly<PocPresentationUiStateV1>;
      const projection = projectPocRuntimePresentationV1(
        Object.freeze({
          semantic: harness.semantic.observe(),
          resolvedCatalog: pocResolvedPresentationCatalogV1,
          contentPreference: Object.freeze({
            allowedFlags: pocContentMaturityPolicyV1.defaultAllowedFlags,
          }),
          uiState,
        }),
      );

      expect(projection.view.characters).toHaveLength(1);
      expect(projection.requiredAssetIds).toHaveLength(7);
      for (const assetId of projection.requiredAssetIds) {
        const matches = resolved.assets.assets.filter((entry) => entry.assetId === assetId);
        expect(matches, assetId).toHaveLength(1);
        expect(matches[0]?.overridePolicy).toBe("replaceable");
      }
      if (requiresCompleteFallback) {
        expect(resolved.assets.packs).toEqual([]);
        expect(
          projection.requiredAssetIds.every((assetId) =>
            resolved.assets.assets.some(
              (entry) => entry.assetId === assetId && entry.delivery === "code_fallback",
            ),
          ),
        ).toBe(true);
      }

      await assets.preload(projection.requiredAssetIds, new AbortController().signal);
      const BackgroundRenderer = backgroundRendererV1(projection.view.stage.rendererId);
      const CharacterRenderer = characterRendererV1();
      const rendered = render(
        <>
          <BackgroundRenderer
            viewSlice={projection.view.stage}
            semantic={harness.semantic}
            presentation={presentation}
          />
          <CharacterRenderer
            viewSlice={projection.view.characters[0]!}
            semantic={harness.semantic}
            presentation={presentation}
          />
        </>,
      );

      expect(screen.getByRole("img", { name: "酒馆主厅" })).toBeVisible();
      const heroine = screen.getByRole("img", { name: "女主" });
      expect(heroine).toBeVisible();
      expect(rendered.container.querySelector("a, button, input, select, textarea")).toBeNull();
      if (requiresCompleteFallback || resolved.assets.packs.length === 0) {
        expect(heroine).toHaveAttribute("data-character-fallback", "code_native");
        expect(heroine).toHaveAttribute("data-spatial-hit-test", "disabled");
        expect(rendered.container.querySelector('[data-spatial-hit-test="enabled"]')).toBeNull();
      }

      rendered.unmount();
      assets.dispose();
    },
  );

  it("fails closed for unknown renderers and rejects duplicate registrations", () => {
    const registry = createUiContributionRegistryV1<PocUiRendererContextsV1>([
      pocUiContributionsV1,
    ]);
    expect(registry.resolve("background", "renderer.poc.stage.unknown")).toEqual({
      kind: "not_found",
      code: "ui.renderer_not_found",
    });

    const firstBackground = pocUiContributionsV1.renderers.background?.[0];
    if (firstBackground === undefined) throw new TypeError("missing PoC background contribution");
    const duplicate = Object.freeze({
      contributionId: "ui.poc.presentation.duplicate-test",
      renderers: Object.freeze({
        background: Object.freeze([firstBackground]),
      }),
    }) satisfies UiContributionSetV1<PocUiRendererContextsV1>;

    expect(() =>
      createUiContributionRegistryV1<PocUiRendererContextsV1>([pocUiContributionsV1, duplicate]),
    ).toThrowError(`ui.duplicate_renderer_id:background:${firstBackground.rendererId}`);
  });

  it("reserves the Save Overlay for the application-owned player port", () => {
    const harness = createPocStoryHarnessV1({ bootstrap: fixedPocBootstrapV1() });
    const publication = harness.semantic.observe();
    const OverlayRenderer = workspaceOverlayRendererV1();
    const rendered = render(
      <OverlayRenderer
        viewSlice={Object.freeze({
          overlayId: "overlay.poc.save",
          game: publication.game,
          actions: publication.actions,
        })}
        semantic={harness.semantic}
        presentation={presentationFixtureV1()}
        gameSymbols={pocGameSymbolRegistryV1}
      />,
    );

    expect(rendered.container).toBeEmptyDOMElement();
  });

  it("dispatches only the uniquely joined enabled Narrative choice invocation", async () => {
    const dispatch = vi.fn(async (_invocation: DeepReadonly<PocSemanticInvocationV1>) =>
      Object.freeze({ kind: "committed" as const }),
    );
    const semantic = Object.freeze({ dispatch }) as unknown as PocSemanticGamePortV1;
    const NarrativeRenderer = narrativeRendererV1();
    const user = userEvent.setup();

    render(
      <InputContextProviderV1 router={createInputRouterV1()}>
        <NarrativeRenderer
          viewSlice={Object.freeze({
            narrative: narrativeFixtureV1(),
            actions: Object.freeze([narrativeDescriptorV1]),
          })}
          semantic={semantic}
          presentation={presentationFixtureV1()}
        />
      </InputContextProviderV1>,
    );

    await user.click(screen.getByRole("button", { name: "仔细核查账单" }));
    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch.mock.calls[0]?.[0]).toBe(narrativeInvocationV1);
  });

  it.each([
    ["missing", null],
    ["idle", narrativeFixtureV1({ status: "idle" })],
    ["active", narrativeFixtureV1({ status: "active" })],
    ["completed", narrativeFixtureV1({ status: "completed" })],
  ] as const)(
    "renders %s Narrative exactly when the shared predicate is open",
    (_name, narrative) => {
      const semantic = Object.freeze({ dispatch: vi.fn() }) as unknown as PocSemanticGamePortV1;
      const NarrativeRenderer = narrativeRendererV1();

      render(
        <InputContextProviderV1 router={createInputRouterV1()}>
          <NarrativeRenderer
            viewSlice={Object.freeze({
              narrative,
              actions: Object.freeze([narrativeDescriptorV1]),
            })}
            semantic={semantic}
            presentation={presentationFixtureV1()}
          />
        </InputContextProviderV1>,
      );

      expect(screen.queryByRole("dialog", { name: "旅店的一周" }) !== null).toBe(
        isPocNarrativeOpenV1(narrative),
      );
    },
  );

  it("keeps authored disabled Narrative choices visible and invocation-free", () => {
    const dispatch = vi.fn((_invocation: DeepReadonly<PocSemanticInvocationV1>) => undefined);
    const semantic = Object.freeze({ dispatch }) as unknown as PocSemanticGamePortV1;
    const NarrativeRenderer = narrativeRendererV1();

    render(
      <InputContextProviderV1 router={createInputRouterV1()}>
        <NarrativeRenderer
          viewSlice={Object.freeze({
            narrative: narrativeFixtureV1({
              enabled: false,
              disabledReasonId: reasonIdsV1[57],
            }),
            actions: Object.freeze([narrativeDescriptorV1]),
          })}
          semantic={semantic}
          presentation={presentationFixtureV1()}
        />
      </InputContextProviderV1>,
    );

    expect(screen.getByRole("button", { name: "仔细核查账单" })).toBeDisabled();
    expect(screen.getByText("需要达到智力 B")).toBeVisible();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("fails an enabled Narrative choice closed for missing or duplicate Semantic joins", () => {
    const dispatch = vi.fn((_invocation: DeepReadonly<PocSemanticInvocationV1>) => undefined);
    const semantic = Object.freeze({ dispatch }) as unknown as PocSemanticGamePortV1;
    const NarrativeRenderer = narrativeRendererV1();
    const presentation = presentationFixtureV1();
    const renderNarrativeV1 = (actions: readonly DeepReadonly<PocSemanticActionDescriptorV1>[]) => (
      <InputContextProviderV1 router={createInputRouterV1()}>
        <NarrativeRenderer
          viewSlice={Object.freeze({ narrative: narrativeFixtureV1(), actions })}
          semantic={semantic}
          presentation={presentation}
        />
      </InputContextProviderV1>
    );

    const rendered = render(renderNarrativeV1(Object.freeze([])));
    expect(screen.getByRole("button", { name: "仔细核查账单" })).toBeDisabled();
    expect(
      screen.getByText(
        presentation.text(pocRejectionReasonTextIdsByCodeV1["command.unknown_reference"]).text,
      ),
    ).toBeVisible();

    rendered.rerender(
      renderNarrativeV1(Object.freeze([narrativeDescriptorV1, narrativeDescriptorV1])),
    );
    expect(screen.getByRole("button", { name: "仔细核查账单" })).toBeDisabled();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
