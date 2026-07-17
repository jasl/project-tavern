// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import "@testing-library/jest-dom/vitest";
import { digestCanonical, resolveGamePackageV1 } from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import type { RuntimeAssetLoaderV1, RuntimeAssetLoadRequestV1 } from "@sillymaker/ui";
import { createWebHostV1 } from "@sillymaker/web";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { createPocPresentationRuntimeV1 } from "./create-poc-presentation-runtime.js";
import { PocApplicationRootV1 } from "./poc-application-root.js";

const emptyBuildIdentityV1 = Object.freeze({
  engineVersion: "SillyMaker PoC application-root-test",
  engine: Object.freeze([]),
  storySimulation: Object.freeze([]),
  storyPresentation: Object.freeze([]),
  application: Object.freeze([]),
}) satisfies Parameters<typeof resolveGamePackageV1>[2];

const assetLoaderV1 = Object.freeze({
  cacheKey: (request: RuntimeAssetLoadRequestV1) => `${request.runtimePath}#${request.sha256}`,
  load: async (request: RuntimeAssetLoadRequestV1) =>
    Object.freeze({ kind: "loaded" as const, url: request.runtimePath }),
  dispose: () => undefined,
}) satisfies RuntimeAssetLoaderV1;

async function createRuntimeV1(initialHash = "#/play") {
  const host = createWebHostV1({
    records: createMemoryHostRecordStoreV1(),
    seeds: [0x0002_3049],
    uuids: ["00000000-0000-4000-8000-000000000001"],
    now: () => "2026-07-12T00:00:00.000Z",
  });
  let hash = initialHash;
  return await createPocPresentationRuntimeV1({
    host,
    buildIdentity: emptyBuildIdentityV1,
    appBuildId: digestCanonical("sillymaker:application:v1", emptyBuildIdentityV1.application),
    pointerTarget: document.createElement("div"),
    location: {
      get hash() {
        return hash;
      },
      replace(nextHash: string) {
        hash = nextHash;
      },
    },
    hashEvents: { addEventListener: () => undefined, removeEventListener: () => undefined },
    pointerWindow: window,
    pointerDocument: document,
    assetLoader: assetLoaderV1,
  });
}

afterEach(cleanup);

describe("PocApplicationRootV1", () => {
  it("renders one seven-layer PoC application root", async () => {
    const runtime = await createRuntimeV1();

    const rendered = render(<PocApplicationRootV1 runtime={runtime} />);

    expect(screen.getByRole("application", { name: "Project Tavern 七日原型" })).toHaveAttribute(
      "data-application-id",
      "poc-web",
    );
    expect(screen.getAllByRole("application")).toHaveLength(1);
    expect(rendered.container.querySelectorAll("[data-stage-layer]")).toHaveLength(7);

    runtime.dispose();
  });

  it("removes spatial hotspots when the heroine falls back to a code-native silhouette", async () => {
    const runtime = await createRuntimeV1();
    const rendered = render(<PocApplicationRootV1 runtime={runtime} />);

    expect(screen.getByTestId("character-root")).toHaveAttribute(
      "data-character-fallback",
      "code_native",
    );
    expect(screen.getByTestId("character-root")).toHaveAttribute(
      "data-spatial-hit-test",
      "disabled",
    );
    expect(
      rendered.container.querySelector("[data-interaction-spatial-state]"),
    ).not.toBeInTheDocument();
    expect(
      rendered.container.querySelectorAll("[data-poc-interaction-surface-id]"),
    ).not.toHaveLength(0);

    runtime.dispose();
  });

  it("opens Settings without changing Semantic state", async () => {
    const runtime = await createRuntimeV1();
    const semanticRevision = runtime.application.semantic.observe().revision;
    render(<PocApplicationRootV1 runtime={runtime} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "设置" }));

    expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();
    expect(screen.getByText("当前故事没有可调整的内容过滤选项。")).toBeVisible();
    expect(runtime.application.semantic.observe().revision).toBe(semanticRevision);

    runtime.dispose();
  });

  it("keeps the canonical main menu navigable without reading Gameplay state", async () => {
    const runtime = await createRuntimeV1("#/");
    const semanticRevision = runtime.application.semantic.observe().revision;

    render(<PocApplicationRootV1 runtime={runtime} />);

    expect(screen.getByRole("navigation", { name: "Project Tavern 主菜单" })).toContainElement(
      screen.getByRole("link", { name: "开始七日原型" }),
    );
    expect(screen.getByRole("link", { name: "开始七日原型" })).toHaveAttribute("href", "#/play");
    expect(runtime.application.semantic.observe().revision).toBe(semanticRevision);

    runtime.dispose();
  });
});
