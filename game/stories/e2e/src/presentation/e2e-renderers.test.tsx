// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import type { UiContributionRenderContextV1 } from "@sillymaker/ui";
import { resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import { createWebHostV1 } from "@sillymaker/web";

import { createE2eGameRuntimeV1 } from "../application/create-e2e-game-runtime.js";
import type { E2ePresentationV1 } from "./presentation-program.js";
import type {
  E2eSemanticGamePortV1,
  E2eSemanticPublicationV1,
} from "../runtime/e2e-semantic-game-port.js";
import { e2eSceneGraphV1 } from "./scene-graph.js";
import type { E2eSceneGraphV1 } from "./scene-graph.js";
import { createE2eRendererRegistryV1 } from "./e2e-renderers.js";
import { e2eStoryEntryV1 } from "../story-entry.js";

afterEach(cleanup);

function rendererIdsInGraphV1(sceneGraph: E2eSceneGraphV1): readonly string[] {
  return Object.freeze([
    ...sceneGraph.variants.map(({ rendererId }) => rendererId),
    ...sceneGraph.characterRigs.map(({ rendererId }) => rendererId),
  ]);
}

describe("E2E Web renderer registry", () => {
  it("binds every resolved SceneGraph renderer ID exactly once", () => {
    const registry = createE2eRendererRegistryV1(e2eSceneGraphV1);
    const graphIds = rendererIdsInGraphV1(e2eSceneGraphV1);
    const registryIds = [
      ...registry.scenes.keys(),
      ...registry.overlays.keys(),
      ...registry.hud.keys(),
      ...registry.gameSymbols.keys(),
    ];

    expect([...new Set(graphIds)].sort()).toEqual([
      "renderer.e2e.character.layered",
      "renderer.e2e.stage.css",
    ]);
    expect(registryIds.sort()).toEqual([...new Set(graphIds)].sort());
    expect(registryIds).toHaveLength(new Set(registryIds).size);
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

  it("renders through only the narrow Semantic view and presentation context", async () => {
    const resolvedGame = resolveStoryForTestV1(e2eStoryEntryV1);
    const application = await createE2eGameRuntimeV1({
      resolved: resolvedGame,
      host: createWebHostV1({
        seeds: [0x0002_3049],
        uuids: ["00000000-0000-4000-8000-000000000001"],
        now: () => "2026-07-12T00:00:00.000Z",
      }),
    });
    const registry = createE2eRendererRegistryV1(resolvedGame.sceneGraph);
    const stageRenderer = registry.scenes.get("renderer.e2e.stage.css");
    if (stageRenderer === undefined) throw new TypeError("missing E2E stage renderer");
    const accessed = new Set<PropertyKey>();
    const context = new Proxy(
      Object.freeze({
        viewSlice: application.semantic.observe(),
        semantic: application.semantic,
        presentation: resolvedGame.presentation,
      }) satisfies UiContributionRenderContextV1<
        E2eSemanticPublicationV1,
        E2eSemanticGamePortV1,
        E2ePresentationV1
      >,
      {
        get(target, property, receiver) {
          accessed.add(property);
          return Reflect.get(target, property, receiver);
        },
      },
    );

    render(stageRenderer.render(context));

    expect(screen.getByText("计数 0")).toBeVisible();
    const increment = screen.getByRole("button", { name: "增加计数" });
    expect(increment).toBeEnabled();
    await userEvent.setup().click(increment);
    expect([...accessed].sort()).toEqual(["presentation", "semantic", "viewSlice"]);
    expect(context).not.toHaveProperty("host");
    expect(context).not.toHaveProperty("snapshot");
  });
});
