// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import "@testing-library/jest-dom/vitest";
import {
  emptyContentMaturityFlagsV1,
  parseTextId,
  type ContentMaturityFlagsV1,
  type InteractionBehaviorId,
  type InteractionSurfaceId,
  type InteractionTargetId,
} from "@sillymaker/base";
import { createMemoryHostRecordStoreV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import {
  createAssetRegistryV1,
  createInputRouterV1,
  createInteractionSessionStoreV1,
  createPresentationReadPortV1,
  initialInteractionSessionStateV1,
  type RuntimeAssetLoaderV1,
  type RuntimeAssetLoadRequestV1,
  type UiRendererNamespaceV1,
} from "@sillymaker/ui";
import { createWebHostV1 } from "@sillymaker/web";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType, ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createE2eGameRuntimeV1 } from "../application/create-e2e-game-runtime.js";
import type { E2eSemanticGamePortV1 } from "../runtime/e2e-semantic-game-port.js";
import { e2eStoryEntryV1 } from "../story-entry.js";
import { e2eAlphaFlagV1, e2eBetaFlagV1, e2eBothFlagsV1 } from "./content-maturity-policy.js";
import type {
  E2ePresentationUiStateV1,
  E2eRuntimePresentationViewV1,
} from "./runtime-presentation.js";
import { projectE2eRuntimePresentationV1 } from "./runtime-presentation.js";
import { e2eSceneGraphV1 } from "./scene-graph.js";
import { e2eUiContributionsV1 } from "./ui-contributions.js";

afterEach(cleanup);

const rendererNamespacesV1 = Object.freeze([
  "background",
  "character",
  "scene_interaction",
  "hud",
  "workspace_overlay",
  "narrative",
  "system",
] as const satisfies readonly UiRendererNamespaceV1[]);

const layeredCharacterRendererIdV1 = "renderer.e2e.character.layered";
const staticCharacterRendererIdV1 = "renderer.e2e.character.static";
const alphaCueIdV1 = "cue.e2e.counter.alpha";
const betaCueIdV1 = "cue.e2e.counter.beta";

type TestComponentV1 = ComponentType<Readonly<Record<string, unknown>>>;

function rendererContributionsV1(namespace: UiRendererNamespaceV1) {
  return e2eUiContributionsV1.renderers[namespace] ?? Object.freeze([]);
}

function requireRendererV1(namespace: UiRendererNamespaceV1, rendererId?: string): TestComponentV1 {
  const contributions = rendererContributionsV1(namespace);
  const contribution =
    rendererId === undefined
      ? contributions[0]
      : contributions.find((candidate) => candidate.rendererId === rendererId);
  if (contribution === undefined) {
    throw new TypeError(`missing E2E ${namespace} renderer ${rendererId ?? "at index zero"}`);
  }
  return contribution.component as unknown as TestComponentV1;
}

function createInteractionSessionFixtureV1() {
  let state = initialInteractionSessionStateV1;
  const listeners = new Set<() => void>();
  return createInteractionSessionStoreV1({
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(reducer) {
      state = reducer(state);
      for (const listener of listeners) listener();
    },
  });
}

async function createContributionFixtureV1() {
  let resolvedGameCreations = 0;
  let gameSessionCreations = 0;
  resolvedGameCreations += 1;
  const resolvedGame = resolveStoryForTestV1(e2eStoryEntryV1);
  gameSessionCreations += 1;
  const application = await createE2eGameRuntimeV1({
    resolved: resolvedGame,
    host: createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      seeds: [0x0002_3049],
      uuids: ["00000000-0000-4000-8000-000000000001"],
      now: () => "2026-07-12T00:00:00.000Z",
    }),
  });
  const loader: RuntimeAssetLoaderV1 = Object.freeze({
    cacheKey: ({ runtimePath, sha256 }: RuntimeAssetLoadRequestV1) => `${runtimePath}#${sha256}`,
    load: async () => Object.freeze({ kind: "failed" as const, code: "fetch_failed" as const }),
    dispose: vi.fn(),
  });
  const assets = createAssetRegistryV1(resolvedGame.assets, loader, vi.fn());
  const basePresentation = createPresentationReadPortV1({
    catalogs: resolvedGame.presentation.textCatalogs,
    locale: resolvedGame.presentation.textCatalogs.defaultLocale,
    assets,
  });
  const text = vi.fn(basePresentation.text);
  const presentation = Object.freeze({ ...basePresentation, text });
  const inputRouter = createInputRouterV1();
  const session = createInteractionSessionFixtureV1();
  const controller = Object.freeze({
    activate: vi.fn(async () => Object.freeze({ kind: "dispatched" as const })),
    activateBehavior: vi.fn(
      async (
        _activation: Readonly<{
          readonly surfaceId: InteractionSurfaceId;
          readonly targetId: InteractionTargetId;
          readonly activationKind: "pointer" | "semantic_control";
        }>,
        _behaviorId: InteractionBehaviorId,
      ) => Object.freeze({ kind: "dispatched" as const }),
    ),
  });

  function project(
    allowedFlags: ContentMaturityFlagsV1,
    activeCueId: string | null = null,
  ): E2eRuntimePresentationViewV1 {
    const uiState = Object.freeze({
      interaction: initialInteractionSessionStateV1,
      primaryOverlayId: "overlay.e2e.test_panel",
      activeCueId,
    }) satisfies E2ePresentationUiStateV1;
    return projectE2eRuntimePresentationV1(
      Object.freeze({
        semantic: application.semantic.observe(),
        resolvedCatalog: e2eSceneGraphV1,
        contentPreference: Object.freeze({ allowedFlags }),
        uiState,
      }),
    ).view;
  }

  return Object.freeze({
    application,
    resolvedGame,
    presentation,
    text,
    inputRouter,
    session,
    controller,
    project,
    resolvedGameCreations: () => resolvedGameCreations,
    gameSessionCreations: () => gameSessionCreations,
    dispose: () => assets.dispose(),
  });
}

type ContributionFixtureV1 = Awaited<ReturnType<typeof createContributionFixtureV1>>;

function requireCounterCharacterV1(view: E2eRuntimePresentationViewV1) {
  const character = view.characters.find(
    (candidate) => candidate.characterId === "character.e2e.counter",
  );
  if (character === undefined) throw new TypeError("missing projected E2E counter character");
  return character;
}

function requireCounterSurfaceV1(view: E2eRuntimePresentationViewV1) {
  const surface = view.interactionSurfaces.find(
    (candidate) => candidate.surfaceId === "surface.e2e.counter",
  );
  if (surface === undefined) throw new TypeError("missing projected E2E counter surface");
  return surface;
}

function requireCounterHitMapV1() {
  const hitMap = e2eSceneGraphV1.hitMaps.find(
    (candidate) => candidate.hitMapId === "hit_map.e2e.counter.idle",
  );
  if (hitMap === undefined) throw new TypeError("missing E2E counter HitMap");
  return hitMap;
}

function viewSliceForNamespaceV1(
  namespace: UiRendererNamespaceV1,
  view: E2eRuntimePresentationViewV1,
  rendererId?: string,
): Readonly<Record<string, unknown>> {
  const character = requireCounterCharacterV1(view);
  const surface = requireCounterSurfaceV1(view);
  const hitMap = requireCounterHitMapV1();
  switch (namespace) {
    case "background":
      return Object.freeze({ ...view, ...view.stage, stage: view.stage });
    case "character":
      return Object.freeze({
        ...view,
        ...character,
        rendererId: rendererId ?? character.rendererId,
        character,
      });
    case "scene_interaction":
      return Object.freeze({
        ...view,
        ...surface,
        surface,
        hitMap,
        spatialState: "enabled" as const,
      });
    case "hud":
      return Object.freeze({ ...view, ...view.game, game: view.game });
    case "workspace_overlay":
    case "narrative":
    case "system":
      return view as unknown as Readonly<Record<string, unknown>>;
  }
  const unsupported: never = namespace;
  throw new TypeError(`unsupported E2E renderer namespace ${String(unsupported)}`);
}

function contextForNamespaceV1(
  fixture: ContributionFixtureV1,
  namespace: UiRendererNamespaceV1,
  view: E2eRuntimePresentationViewV1,
  rendererId?: string,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    viewSlice: viewSliceForNamespaceV1(namespace, view, rendererId),
    semantic: fixture.application.semantic as E2eSemanticGamePortV1,
    presentation: fixture.presentation,
    controller: fixture.controller,
    interactionController: fixture.controller,
    session: fixture.session,
    interactionSession: fixture.session,
    inputRouter: fixture.inputRouter,
  });
}

function RenderContributionV1(props: {
  readonly fixture: ContributionFixtureV1;
  readonly namespace: UiRendererNamespaceV1;
  readonly view: E2eRuntimePresentationViewV1;
  readonly rendererId?: string;
}): ReactElement {
  const Renderer = requireRendererV1(props.namespace, props.rendererId);
  const context = contextForNamespaceV1(
    props.fixture,
    props.namespace,
    props.view,
    props.rendererId,
  );
  return (
    <div data-tested-ui-namespace={props.namespace}>
      <Renderer {...context} />
    </div>
  );
}

function E2eUiHarnessV1(props: {
  readonly fixture: ContributionFixtureV1;
  readonly view: E2eRuntimePresentationViewV1;
}): ReactElement {
  return (
    <>
      {rendererNamespacesV1.map((namespace) => (
        <RenderContributionV1
          key={namespace}
          fixture={props.fixture}
          namespace={namespace}
          view={props.view}
          {...(namespace === "background"
            ? { rendererId: "renderer.e2e.stage.css" }
            : namespace === "character"
              ? { rendererId: layeredCharacterRendererIdV1 }
              : {})}
        />
      ))}
    </>
  );
}

describe("e2eUiContributionsV1", () => {
  it("registers one neutral Web contribution closure across all seven namespaces", () => {
    expect(Object.keys(e2eUiContributionsV1.renderers).sort()).toEqual(
      [...rendererNamespacesV1].sort(),
    );
    expect(rendererContributionsV1("background").map(({ rendererId }) => rendererId)).toEqual([
      "renderer.e2e.stage.css",
    ]);
    expect(rendererContributionsV1("character").map(({ rendererId }) => rendererId)).toEqual([
      layeredCharacterRendererIdV1,
      staticCharacterRendererIdV1,
    ]);
    expect(rendererContributionsV1("scene_interaction")).toHaveLength(1);
    expect(rendererContributionsV1("hud")).toHaveLength(1);
    expect(rendererContributionsV1("workspace_overlay")).toHaveLength(1);
    expect(rendererContributionsV1("narrative")).toHaveLength(1);
    expect(rendererContributionsV1("system")).toHaveLength(1);

    const componentSources = rendererNamespacesV1.flatMap((namespace) =>
      rendererContributionsV1(namespace).map(({ component }) => component.toString()),
    );
    expect(`${JSON.stringify(e2eUiContributionsV1)}\n${componentSources.join("\n")}`).not.toMatch(
      /poc|tavern|heroine|relationship|suggestive|sexual|explicit/iu,
    );
  });

  it("renders the CSS stage plus layered and static counter paths through PresentationReadPort", async () => {
    const fixture = await createContributionFixtureV1();
    try {
      const view = fixture.project(emptyContentMaturityFlagsV1);
      const background = render(
        <RenderContributionV1
          fixture={fixture}
          namespace="background"
          view={view}
          rendererId="renderer.e2e.stage.css"
        />,
      );
      expect(background.container.querySelector("canvas")).not.toBeInTheDocument();
      expect(
        background.container.querySelector('[data-renderer-id="renderer.e2e.stage.css"]'),
      ).toBeInTheDocument();
      expect(fixture.text).toHaveBeenCalledWith(parseTextId("text.e2e.stage.main.name"));
      cleanup();

      render(
        <RenderContributionV1
          fixture={fixture}
          namespace="character"
          view={view}
          rendererId={layeredCharacterRendererIdV1}
        />,
      );
      expect(screen.getByRole("img", { name: "测试计数器" })).toHaveAttribute(
        "data-renderer-id",
        layeredCharacterRendererIdV1,
      );
      cleanup();

      render(
        <RenderContributionV1
          fixture={fixture}
          namespace="character"
          view={view}
          rendererId={staticCharacterRendererIdV1}
        />,
      );
      expect(screen.getByRole("img", { name: "测试计数器" })).toHaveAttribute(
        "data-renderer-id",
        staticCharacterRendererIdV1,
      );
      expect(fixture.text).toHaveBeenCalledWith(parseTextId("text.e2e.character.counter.name"));
    } finally {
      fixture.dispose();
    }
  });

  it("renders HUD, Overlay, Narrative, and System contributions with catalog text", async () => {
    const fixture = await createContributionFixtureV1();
    try {
      const view = fixture.project(emptyContentMaturityFlagsV1);
      for (const namespace of ["hud", "workspace_overlay", "narrative", "system"] as const) {
        fixture.text.mockClear();
        const rendered = render(
          <RenderContributionV1 fixture={fixture} namespace={namespace} view={view} />,
        );
        expect(fixture.text).toHaveBeenCalled();
        expect(document.querySelector(`[data-tested-ui-namespace="${namespace}"]`)).not.toBeNull();
        rendered.unmount();
      }
    } finally {
      fixture.dispose();
    }
  });

  it("keeps unrestricted Gameplay reachable for four masks with exact non-stale cue witnesses", async () => {
    const fixture = await createContributionFixtureV1();
    const cases = [
      [emptyContentMaturityFlagsV1, alphaCueIdV1, null],
      [e2eAlphaFlagV1, alphaCueIdV1, alphaCueIdV1],
      [e2eBetaFlagV1, betaCueIdV1, betaCueIdV1],
      [e2eBothFlagsV1, null, null],
    ] as const;

    try {
      for (const [allowedFlags, activeCueId, expectedCueId] of cases) {
        const view = fixture.project(allowedFlags, activeCueId);
        const rendered = render(<E2eUiHarnessV1 fixture={fixture} view={view} />);
        const increment = screen.getByRole("button", { name: "增加计数" });
        expect(increment).toBeEnabled();
        expect(increment).toHaveAttribute("data-interaction-surface-id", "surface.e2e.counter");
        expect(increment).toHaveAttribute(
          "data-interaction-target-id",
          "target.e2e.counter.figure",
        );
        expect(increment).toHaveAttribute(
          "data-interaction-behavior-id",
          "behavior.e2e.counter.increment",
        );
        expect(increment).toHaveAttribute("data-semantic-action-id", "action.e2e.increment");
        expect(fixture.text).toHaveBeenCalledWith(parseTextId("text.e2e.increment"));

        const alphaWitness = document.querySelectorAll(`[data-content-cue-id="${alphaCueIdV1}"]`);
        const betaWitness = document.querySelectorAll(`[data-content-cue-id="${betaCueIdV1}"]`);
        expect(alphaWitness).toHaveLength(expectedCueId === alphaCueIdV1 ? 1 : 0);
        expect(betaWitness).toHaveLength(expectedCueId === betaCueIdV1 ? 1 : 0);
        rendered.unmount();
      }

      expect(fixture.resolvedGameCreations()).toBe(1);
      expect(fixture.gameSessionCreations()).toBe(1);
    } finally {
      fixture.dispose();
    }
  });
});
