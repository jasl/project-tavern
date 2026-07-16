// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createAssetRegistryV1,
  createPresentationReadPortV1,
  type GameRendererContextV1,
  type RuntimeAssetLoaderV1,
  type RuntimeAssetLoadRequestV1,
} from "@sillymaker/ui";
import { createMemoryHostRecordStoreV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import { createWebHostV1 } from "@sillymaker/web";

import { createE2eGameRuntimeV1 } from "../application/create-e2e-game-runtime.js";
import type {
  E2eSemanticGamePortV1,
  E2eSemanticPublicationV1,
} from "../runtime/e2e-semantic-game-port.js";
import { e2eSceneGraphV1 } from "./scene-graph.js";
import type { E2eSceneGraphV1 } from "./scene-graph.js";
import {
  createE2eRendererRegistryV1,
  type E2ePresentationReadPortV1,
  type E2eRendererContextV1,
} from "./e2e-renderers.js";
import { e2eStoryEntryV1 } from "../story-entry.js";
import type { E2eResolvedGameV1 } from "../story-entry.js";

afterEach(cleanup);

function rendererIdsInGraphV1(sceneGraph: E2eSceneGraphV1): readonly string[] {
  return Object.freeze([
    ...sceneGraph.variants.map(({ rendererId }) => rendererId),
    ...sceneGraph.characterRigs.map(({ rendererId }) => rendererId),
  ]);
}

function createPresentationFixtureV1(resolvedGame: E2eResolvedGameV1) {
  const loader: RuntimeAssetLoaderV1 = Object.freeze({
    cacheKey: ({ runtimePath, sha256 }: RuntimeAssetLoadRequestV1) => `${runtimePath}#${sha256}`,
    load: async () => Object.freeze({ kind: "failed" as const, code: "fetch_failed" as const }),
    dispose: vi.fn(),
  });
  const assets = createAssetRegistryV1(resolvedGame.assets, loader, vi.fn());
  const presentation = createPresentationReadPortV1({
    catalogs: resolvedGame.presentation.textCatalogs,
    locale: resolvedGame.presentation.textCatalogs.defaultLocale,
    assets,
  });
  return Object.freeze({ presentation, dispose: () => assets.dispose() });
}

function requireRendererV1(
  registry: ReturnType<typeof createE2eRendererRegistryV1>,
  namespace: "background" | "character" | "hud" | "narrative",
  rendererId: string,
) {
  const result = registry.resolve(namespace, rendererId);
  if (result.kind !== "found") throw new TypeError(`missing ${namespace} renderer`);
  return result.component as ComponentType<E2eRendererContextV1>;
}

describe("E2E Web renderer registry", () => {
  it("maps the closed SceneGraph into background, character, HUD, and narrative namespaces", () => {
    const registry = createE2eRendererRegistryV1(e2eSceneGraphV1);
    const graphIds = rendererIdsInGraphV1(e2eSceneGraphV1);

    expect([...new Set(graphIds)].sort()).toEqual([
      "renderer.e2e.character.layered",
      "renderer.e2e.stage.css",
    ]);
    expect(registry.resolve("background", "renderer.e2e.stage.css").kind).toBe("found");
    expect(registry.resolve("character", "renderer.e2e.character.layered").kind).toBe("found");
    expect(registry.resolve("hud", "renderer.e2e.stage.css").kind).toBe("found");
    expect(registry.resolve("narrative", "renderer.e2e.stage.css").kind).toBe("found");
    expect(registry.resolve("scene_interaction", "renderer.e2e.stage.css")).toEqual({
      kind: "not_found",
      code: "ui.renderer_not_found",
    });
    expect(registry.resolve("workspace_overlay", "renderer.e2e.stage.css").kind).toBe("not_found");
    expect(registry.resolve("system", "renderer.e2e.stage.css").kind).toBe("not_found");
  });

  it("rejects an unknown renderer ID with a stable composition failure", () => {
    const [firstVariant, ...remainingVariants] = e2eSceneGraphV1.variants;
    if (firstVariant === undefined) throw new TypeError("missing E2E fixture variant");
    const unknownGraph = Object.freeze({
      ...e2eSceneGraphV1,
      variants: Object.freeze([
        Object.freeze({ ...firstVariant, rendererId: "renderer.e2e.unknown" }),
        ...remainingVariants,
      ]),
    }) as E2eSceneGraphV1;

    expect(() => createE2eRendererRegistryV1(unknownGraph)).toThrowError(
      'E2E renderer composition failed: unknown renderer ID "renderer.e2e.unknown"',
    );
  });

  it("rejects a missing renderer ID with a stable composition failure", () => {
    const missingGraph = Object.freeze({
      ...e2eSceneGraphV1,
      characterRigs: Object.freeze([]),
    }) as E2eSceneGraphV1;

    expect(() => createE2eRendererRegistryV1(missingGraph)).toThrowError(
      'E2E renderer composition failed: missing renderer ID "renderer.e2e.character.layered"',
    );
  });

  it("renders only the narrow publication, Semantic port, and PresentationReadPort", async () => {
    const resolvedGame = resolveStoryForTestV1(e2eStoryEntryV1);
    const application = await createE2eGameRuntimeV1({
      resolved: resolvedGame,
      host: createWebHostV1({
        records: createMemoryHostRecordStoreV1(),
        seeds: [0x0002_3049],
        uuids: ["00000000-0000-4000-8000-000000000001"],
        now: () => "2026-07-12T00:00:00.000Z",
      }),
    });
    const presentationFixture = createPresentationFixtureV1(resolvedGame);
    const registry = createE2eRendererRegistryV1(resolvedGame.sceneGraph);
    const Background = requireRendererV1(registry, "background", "renderer.e2e.stage.css");
    const Hud = requireRendererV1(registry, "hud", "renderer.e2e.stage.css");
    const Narrative = requireRendererV1(registry, "narrative", "renderer.e2e.stage.css");
    const accessed = new Set<PropertyKey>();
    const context = new Proxy(
      Object.freeze({
        viewSlice: application.semantic.observe(),
        semantic: application.semantic,
        presentation: presentationFixture.presentation,
      }) satisfies GameRendererContextV1<
        E2eSemanticPublicationV1,
        E2eSemanticGamePortV1,
        E2ePresentationReadPortV1
      >,
      {
        get(target, property, receiver) {
          accessed.add(property);
          return Reflect.get(target, property, receiver);
        },
      },
    );

    render(
      <>
        <Background {...context} />
        <Hud {...context} />
        <Narrative {...context} />
      </>,
    );

    expect(screen.getByText("计数 0")).toBeVisible();
    const hud = screen.getByRole("group", { name: "经营操作" });
    const narrative = screen.getByRole("group", { name: "叙事操作" });
    expect(hud).toContainElement(screen.getByRole("button", { name: "增加计数" }));
    expect(hud).not.toContainElement(screen.getByRole("button", { name: "选择左侧" }));
    expect(narrative).toContainElement(screen.getByRole("button", { name: "选择左侧" }));
    expect(narrative).toContainElement(screen.getByRole("button", { name: "继续" }));
    await userEvent.setup().click(screen.getByRole("button", { name: "增加计数" }));
    expect([...accessed].sort()).toEqual(["presentation", "semantic", "viewSlice"]);
    expect(context).not.toHaveProperty("host");
    expect(context).not.toHaveProperty("snapshot");
    expect(context.presentation).not.toHaveProperty("textCatalogs");
    presentationFixture.dispose();
  });
});
