// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import "@testing-library/jest-dom/vitest";
import { digestCanonical, resolveGamePackageV1 } from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import type { RuntimeAssetLoaderV1, RuntimeAssetLoadRequestV1 } from "@sillymaker/ui";
import { createDevDockContributionSetV1 } from "@sillymaker/ui/debug";
import { createWebHostV1 } from "@sillymaker/web";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

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

async function createRuntimeV1(
  initialHash = "#/play",
  options: Pick<
    Parameters<typeof createPocPresentationRuntimeV1>[0],
    "capabilitySearch" | "loadToolingUi"
  > = {},
) {
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
    ...options,
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
    expect(runtime.rendering.systemDialogSession.getSnapshot()).toEqual({ settingsOpen: false });

    await userEvent.setup().click(screen.getByRole("button", { name: "设置" }));

    const settings = screen.getByRole("dialog", { name: "设置" });
    expect(settings).toBeVisible();
    expect(screen.getByText("当前故事没有可调整的内容过滤选项。")).toBeVisible();
    expect(runtime.rendering.systemDialogSession.getSnapshot()).toEqual({ settingsOpen: true });
    expect(runtime.application.semantic.observe().revision).toBe(semanticRevision);

    await userEvent.setup().click(within(settings).getByRole("button", { name: "关闭" }));
    expect(screen.queryByRole("dialog", { name: "设置" })).not.toBeInTheDocument();
    expect(runtime.rendering.systemDialogSession.getSnapshot()).toEqual({ settingsOpen: false });

    runtime.dispose();
  });

  it("binds the root-owned DevDock state to diagnostics without publishing gameplay state", async () => {
    const runtime = await createRuntimeV1();
    await runtime.application.capabilities.setEnabled("debug_tools", true);
    const presentationBefore = runtime.presentation.getSnapshot();
    const semanticBefore = runtime.application.semantic.observe();
    const presentationListener = vi.fn();
    const semanticListener = vi.fn();
    const unsubscribePresentation = runtime.presentation.subscribe(presentationListener);
    const unsubscribeSemantic = runtime.application.semantic.subscribe(semanticListener);
    const rendered = render(<PocApplicationRootV1 runtime={runtime} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "打开左侧开发工具" }));
    expect(screen.getByRole("complementary", { name: "左侧开发工具" })).toBeVisible();
    expect(runtime.presentation.getSnapshot()).toBe(presentationBefore);
    expect(runtime.application.semantic.observe()).toBe(semanticBefore);
    expect(presentationListener).not.toHaveBeenCalled();
    expect(semanticListener).not.toHaveBeenCalled();
    const bundle = JSON.parse(
      new TextDecoder().decode((await runtime.application.diagnostics.exportDebugBundle()).bytes),
    ) as {
      readonly uiContext?: {
        readonly session: {
          readonly devDock: { readonly leftOpen: boolean; readonly rightOpen: boolean };
        };
      };
    };
    expect(bundle.uiContext?.session.devDock).toEqual({ leftOpen: true, rightOpen: false });

    rendered.unmount();
    unsubscribePresentation();
    unsubscribeSemantic();
    runtime.dispose();
  });

  it("loads Story DevDock contributions only after DebugTools becomes effective", async () => {
    const contributions = createDevDockContributionSetV1({
      panels: [
        Object.freeze({
          id: "poc.test.tooling",
          side: "left" as const,
          title: "PoC 测试工具",
          authority: "read_only" as const,
          render: () => <p>PoC tooling loaded</p>,
        }),
      ],
    });
    const loadToolingUi = vi.fn(async () =>
      Object.freeze({
        pocToolingUiContributionsV1: () => contributions,
      }),
    );
    const runtime = await createRuntimeV1("#/play", { loadToolingUi });
    render(<PocApplicationRootV1 runtime={runtime} />);

    expect(loadToolingUi).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "打开左侧开发工具" })).not.toBeInTheDocument();

    await runtime.application.capabilities.setEnabled("debug_tools", true);
    await waitFor(() => expect(loadToolingUi).toHaveBeenCalledOnce());
    await userEvent.setup().click(screen.getByRole("button", { name: "打开左侧开发工具" }));
    expect(await screen.findByRole("button", { name: "PoC 测试工具" })).toBeVisible();
    expect(await screen.findByText("PoC tooling loaded")).toBeVisible();

    await runtime.application.capabilities.setEnabled("debug_tools", false);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "打开左侧开发工具" })).not.toBeInTheDocument(),
    );
    await runtime.application.capabilities.setEnabled("debug_tools", true);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "打开左侧开发工具" })).toBeVisible(),
    );
    expect(loadToolingUi).toHaveBeenCalledOnce();

    runtime.dispose();
  });

  it("exposes the public Semantic witness and player-safe System controls", async () => {
    const runtime = await createRuntimeV1();
    const semantic = runtime.application.semantic.observe();
    render(<PocApplicationRootV1 runtime={runtime} />);

    expect(screen.getByTestId("semantic-publication")).toHaveAttribute(
      "data-semantic-revision",
      String(semantic.revision),
    );
    expect(screen.getByTestId("semantic-publication")).toHaveAttribute(
      "data-semantic-status",
      semantic.status,
    );
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "导出调试包" })).toBeEnabled();

    runtime.dispose();
  });

  it("opens Purchase from tavern, projects market, and visibly returns with no Gameplay change", async () => {
    const runtime = await createRuntimeV1();
    const user = userEvent.setup();
    const initialSemanticRevision = runtime.application.semantic.observe().revision;
    render(<PocApplicationRootV1 runtime={runtime} />);

    await user.click(screen.getByRole("button", { name: "开始这一周" }));
    expect(runtime.application.semantic.observe().revision).toBe(initialSemanticRevision + 1);
    const narrative = screen.getByRole("dialog", { name: "旅店的一周" });
    await user.click(within(narrative).getByRole("button", { name: "继续" }));
    expect(runtime.application.semantic.observe().revision).toBe(initialSemanticRevision + 2);
    expect(screen.queryByRole("dialog", { name: "旅店的一周" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "选择生活策略" }));
    const policyDialog = screen.getByRole("dialog", { name: "生活策略" });
    await user.click(within(policyDialog).getByRole("radio", { name: "夜猫子作息" }));
    await user.click(within(policyDialog).getByRole("button", { name: "确认" }));
    expect(runtime.application.semantic.observe().revision).toBe(initialSemanticRevision + 3);
    await user.click(within(policyDialog).getByRole("button", { name: "关闭" }));
    const semanticRevision = runtime.application.semantic.observe().revision;

    const opener = screen.getByRole("button", { name: "采购原料" });
    await user.click(opener);
    expect(screen.getByRole("dialog", { name: "采购食材" })).toBeVisible();
    expect(
      document.querySelector('[data-stage-scene-id="stage_scene.poc.market"]'),
    ).toBeInTheDocument();
    expect(runtime.application.semantic.observe().revision).toBe(semanticRevision);

    await user.click(screen.getByRole("button", { name: "关闭" }));
    expect(screen.queryByRole("dialog", { name: "采购食材" })).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-stage-scene-id="stage_scene.poc.tavern"]'),
    ).toBeInTheDocument();
    expect(opener).toHaveFocus();
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
