// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import "@testing-library/jest-dom/vitest";
import { createMemoryHostRecordStoreV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";
import type { RuntimeAssetLoaderV1, RuntimeAssetLoadRequestV1 } from "@sillymaker/ui";
import { createWebHostV1 } from "@sillymaker/web";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createE2ePresentationRuntimeV1 } from "./create-e2e-presentation-runtime.js";
import { E2eApplicationRootV1 } from "./e2e-application-root.js";
import { e2eStoryEntryV1 } from "../story-entry.js";

afterEach(cleanup);

function eventTargetV1() {
  const listeners = new Map<string, Set<() => void>>();
  return Object.freeze({
    addEventListener(type: string, listener: () => void) {
      const current = listeners.get(type) ?? new Set<() => void>();
      current.add(listener);
      listeners.set(type, current);
    },
    removeEventListener(type: string, listener: () => void) {
      listeners.get(type)?.delete(listener);
    },
  });
}

async function createRootFixtureV1(
  hash = "#/play",
  input: Pick<Parameters<typeof createE2ePresentationRuntimeV1>[0], "loadToolingUi"> & {
    readonly capabilitySearch?: string;
  } = {},
) {
  const container = document.createElement("div");
  document.body.append(container);
  const location = {
    hash,
    replace(nextHash: string) {
      location.hash = nextHash;
    },
  };
  const assetLoader = Object.freeze({
    cacheKey: ({ runtimePath, sha256 }: RuntimeAssetLoadRequestV1) => `${runtimePath}#${sha256}`,
    load: async () => Object.freeze({ kind: "failed" as const, code: "fetch_failed" as const }),
    dispose() {},
  }) satisfies RuntimeAssetLoaderV1;
  const runtime = await createE2ePresentationRuntimeV1({
    resolved: resolveStoryForTestV1(e2eStoryEntryV1),
    host: createWebHostV1({
      records: createMemoryHostRecordStoreV1(),
      seeds: [0x0002_3049],
      uuids: ["00000000-0000-4000-8000-000000000402"],
      now: () => "2026-07-17T00:00:00.000Z",
    }),
    environment: Object.freeze({
      pointerTarget: container,
      pointerWindow: eventTargetV1(),
      pointerDocument: Object.freeze({ ...eventTargetV1(), visibilityState: "visible" as const }),
      location,
      hashEventTarget: eventTargetV1(),
      capabilitySearch: input.capabilitySearch ?? "",
      assetLoader,
    }),
    ...(input.loadToolingUi === undefined ? {} : { loadToolingUi: input.loadToolingUi }),
  });
  return Object.freeze({ container, runtime });
}

describe("E2eApplicationRootV1", () => {
  it("does not load Story tooling UI until DebugTools is effective", async () => {
    const loadToolingUi = vi.fn(
      async (_specifier: "@project-tavern/story-e2e/tooling-ui") =>
        await import("../tooling-ui/index.js"),
    );
    const fixture = await createRootFixtureV1("#/play", { loadToolingUi });
    const rendered = render(<E2eApplicationRootV1 runtime={fixture.runtime} />, {
      container: fixture.container,
    });

    try {
      expect(loadToolingUi).not.toHaveBeenCalled();
      expect(screen.queryByRole("button", { name: "打开左侧开发工具" })).not.toBeInTheDocument();
    } finally {
      rendered.unmount();
      fixture.runtime.dispose();
    }
  });

  it("loads and mounts the fixed Story contributions for a session-requested DebugTools URL", async () => {
    const loadToolingUi = vi.fn(async (specifier: "@project-tavern/story-e2e/tooling-ui") => {
      expect(specifier).toBe("@project-tavern/story-e2e/tooling-ui");
      return await import("../tooling-ui/index.js");
    });
    const fixture = await createRootFixtureV1("#/play", {
      capabilitySearch: "?capability=debug_tools",
      loadToolingUi,
    });
    const rendered = render(<E2eApplicationRootV1 runtime={fixture.runtime} />, {
      container: fixture.container,
    });

    try {
      const launcher = await screen.findByRole("button", { name: "打开左侧开发工具" });
      expect(loadToolingUi).toHaveBeenCalledOnce();
      await userEvent.setup().click(launcher);
      expect(screen.getByRole("button", { name: "运行时能力" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "诊断" })).toBeEnabled();
      expect(fixture.runtime.capabilitySession.persisted.state.getCurrent().debugTools).toBe(false);
    } finally {
      rendered.unmount();
      fixture.runtime.dispose();
    }
  });

  it("ignores a stale tooling load after disable and reuses its success after re-enable", async () => {
    let resolveToolingUi: ((module: typeof import("../tooling-ui/index.js")) => void) | undefined;
    const pendingToolingUi = new Promise<typeof import("../tooling-ui/index.js")>((resolve) => {
      resolveToolingUi = resolve;
    });
    const loadToolingUi = vi.fn(async () => await pendingToolingUi);
    const fixture = await createRootFixtureV1("#/play", { loadToolingUi });
    const rendered = render(<E2eApplicationRootV1 runtime={fixture.runtime} />, {
      container: fixture.container,
    });

    try {
      await act(async () => {
        await fixture.runtime.application.capabilities.setEnabled("debug_tools", true);
      });
      await waitFor(() => expect(loadToolingUi).toHaveBeenCalledOnce());
      await act(async () => {
        await fixture.runtime.application.capabilities.setEnabled("debug_tools", false);
      });
      const resolve = resolveToolingUi;
      if (resolve === undefined) throw new TypeError("missing E2E tooling UI resolver");
      await act(async () => {
        resolve(await import("../tooling-ui/index.js"));
        await pendingToolingUi;
      });
      expect(screen.queryByRole("button", { name: "打开左侧开发工具" })).not.toBeInTheDocument();

      await act(async () => {
        await fixture.runtime.application.capabilities.setEnabled("debug_tools", true);
      });
      expect(await screen.findByRole("button", { name: "打开左侧开发工具" })).toBeEnabled();
      expect(loadToolingUi).toHaveBeenCalledOnce();
    } finally {
      rendered.unmount();
      fixture.runtime.dispose();
    }
  });

  it("renders one named application and all seven fixed Stage layers", async () => {
    const fixture = await createRootFixtureV1();
    try {
      render(<E2eApplicationRootV1 runtime={fixture.runtime} />, {
        container: fixture.container,
      });

      expect(screen.getByRole("application", { name: "SillyMaker 引擎测试" })).toHaveAttribute(
        "data-application-id",
        "e2e-web",
      );
      expect(screen.getAllByRole("application")).toHaveLength(1);
      expect(screen.getByRole("main", { name: "E2E 游戏舞台" })).toBeVisible();
      expect(screen.getAllByTestId(/^stage-/u)).toHaveLength(9);
      expect(screen.getByRole("img", { name: "测试计数器" })).toBeVisible();
      expect(screen.getByRole("button", { name: "增加计数" })).toBeEnabled();
      for (const testId of [
        "stage-background",
        "stage-character",
        "stage-scene-interaction",
        "stage-hud",
        "stage-workspace-overlay",
        "stage-narrative",
        "stage-system",
      ]) {
        expect(screen.getByTestId(testId)).toBeInTheDocument();
      }
    } finally {
      fixture.runtime.dispose();
    }
  });

  it("renders the main menu from the cached publication only", async () => {
    const fixture = await createRootFixtureV1("#/");
    const runtime = Object.freeze({
      ...fixture.runtime,
      uiState: Object.freeze({
        getCurrent(): never {
          throw new TypeError("application root read raw UI state");
        },
        subscribe: fixture.runtime.uiState.subscribe,
      }),
    });
    try {
      render(<E2eApplicationRootV1 runtime={runtime} />, {
        container: fixture.container,
      });

      expect(screen.getByRole("navigation", { name: "引擎测试主菜单" })).toBeVisible();
      expect(screen.getByRole("link", { name: "进入测试" })).toHaveAttribute("href", "#/play");
    } finally {
      fixture.runtime.dispose();
    }
  });

  it("keeps Settings reachable without changing Semantic state", async () => {
    const fixture = await createRootFixtureV1();
    const semanticBefore = fixture.runtime.application.semantic.observe();
    try {
      render(<E2eApplicationRootV1 runtime={fixture.runtime} />, {
        container: fixture.container,
      });
      await userEvent.setup().click(screen.getByRole("button", { name: "设置" }));

      expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();
      expect(screen.getAllByTestId("settings-section")).toHaveLength(1);
      expect(screen.getAllByRole("checkbox")).toHaveLength(2);
      expect(fixture.runtime.application.semantic.observe()).toBe(semanticBefore);
    } finally {
      fixture.runtime.dispose();
    }
  });

  it("wires the launcher and host to the one runtime-owned System-dialog session", async () => {
    const fixture = await createRootFixtureV1();
    const user = userEvent.setup();
    const rendered = render(<E2eApplicationRootV1 runtime={fixture.runtime} />, {
      container: fixture.container,
    });
    try {
      expect(fixture.runtime.systemDialogSession.getSnapshot()).toEqual({
        settingsOpen: false,
      });

      await user.click(screen.getByRole("button", { name: "设置" }));
      expect(fixture.runtime.systemDialogSession.getSnapshot()).toEqual({
        settingsOpen: true,
      });
      expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();

      await user.click(screen.getByRole("button", { name: "关闭" }));
      expect(fixture.runtime.systemDialogSession.getSnapshot()).toEqual({
        settingsOpen: false,
      });

      act(() => fixture.runtime.systemDialogSession.openSettings());
      expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();
      rendered.unmount();
      expect(fixture.runtime.systemDialogSession.getSnapshot()).toEqual({
        settingsOpen: false,
      });
    } finally {
      rendered.unmount();
      fixture.runtime.dispose();
    }
  });

  it("binds the root-owned DevDock state to diagnostics without publication notifications", async () => {
    const fixture = await createRootFixtureV1();
    await fixture.runtime.application.capabilities.setEnabled("debug_tools", true);
    const presentationBefore = fixture.runtime.presentation.getSnapshot();
    const semanticBefore = fixture.runtime.application.semantic.observe();
    const presentationListener = vi.fn();
    const semanticListener = vi.fn();
    const unsubscribePresentation = fixture.runtime.presentation.subscribe(presentationListener);
    const unsubscribeSemantic = fixture.runtime.application.semantic.subscribe(semanticListener);
    const rendered = render(<E2eApplicationRootV1 runtime={fixture.runtime} />, {
      container: fixture.container,
    });
    try {
      await userEvent.setup().click(screen.getByRole("button", { name: "打开右侧开发工具" }));
      expect(screen.getByRole("complementary", { name: "右侧开发工具" })).toBeVisible();
      expect(fixture.runtime.presentation.getSnapshot()).toBe(presentationBefore);
      expect(fixture.runtime.application.semantic.observe()).toBe(semanticBefore);
      expect(presentationListener).not.toHaveBeenCalled();
      expect(semanticListener).not.toHaveBeenCalled();
      const exported = await fixture.runtime.application.diagnostics.exportDebugBundle();
      const decoded = JSON.parse(new TextDecoder().decode(exported.bytes)) as {
        readonly uiContext?: {
          readonly session: {
            readonly devDock: { readonly leftOpen: boolean; readonly rightOpen: boolean };
          };
        };
      };
      expect(decoded.uiContext?.session.devDock).toEqual({ leftOpen: false, rightOpen: true });
    } finally {
      rendered.unmount();
      unsubscribePresentation();
      unsubscribeSemantic();
      fixture.runtime.dispose();
    }
  });

  it("exposes the public Semantic witness and always-reachable player controls", async () => {
    const fixture = await createRootFixtureV1();
    try {
      render(<E2eApplicationRootV1 runtime={fixture.runtime} />, {
        container: fixture.container,
      });

      const semantic = fixture.runtime.application.semantic.observe();
      expect(screen.getByTestId("semantic-publication")).toHaveAttribute(
        "data-semantic-revision",
        String(semantic.revision),
      );
      expect(screen.getByTestId("semantic-publication")).toHaveAttribute(
        "data-semantic-status",
        semantic.status,
      );
      expect(screen.getByRole("button", { name: "与测试计数器互动" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "打开测试面板" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "导出调试包" })).toBeEnabled();
    } finally {
      fixture.runtime.dispose();
    }
  });

  it("opens the published Interaction and blocking Narrative through public controls", async () => {
    const fixture = await createRootFixtureV1();
    const user = userEvent.setup();
    try {
      render(<E2eApplicationRootV1 runtime={fixture.runtime} />, {
        container: fixture.container,
      });

      const entry = screen.getByRole("button", { name: "与测试计数器互动" });
      await user.click(entry);
      expect(screen.getByRole("region", { name: "测试计数器互动" })).toBeVisible();
      await user.keyboard("{Escape}");
      expect(entry).toHaveFocus();

      await user.click(screen.getByRole("button", { name: "开始流程" }));
      expect(screen.getByRole("dialog", { name: "流程操作" })).toBeVisible();
      expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "设置" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "导出调试包" })).toBeEnabled();
    } finally {
      fixture.runtime.dispose();
    }
  });

  it("opens and visibly closes the neutral Overlay without changing Gameplay", async () => {
    const fixture = await createRootFixtureV1();
    const user = userEvent.setup();
    const semanticBefore = fixture.runtime.application.semantic.observe();
    try {
      render(<E2eApplicationRootV1 runtime={fixture.runtime} />, {
        container: fixture.container,
      });

      const opener = screen.getByRole("button", { name: "打开测试面板" });
      await user.click(opener);
      expect(screen.getByRole("dialog", { name: "测试面板" })).toBeVisible();
      await user.click(screen.getByRole("button", { name: "关闭" }));
      expect(screen.queryByRole("dialog", { name: "测试面板" })).not.toBeInTheDocument();
      expect(opener).toHaveFocus();
      expect(fixture.runtime.application.semantic.observe()).toBe(semanticBefore);
    } finally {
      fixture.runtime.dispose();
    }
  });

  it("dispatches through the published Semantic option and keeps Settings at terminal", async () => {
    const fixture = await createRootFixtureV1();
    try {
      render(<E2eApplicationRootV1 runtime={fixture.runtime} />, {
        container: fixture.container,
      });
      await userEvent.setup().click(screen.getByRole("button", { name: "增加计数" }));
      expect(screen.getByText("计数 1")).toBeVisible();

      await fixture.runtime.application.semantic.dispatch({
        actionId: "action.e2e.start",
        parameters: {},
      });
      await fixture.runtime.application.semantic.dispatch({
        actionId: "action.e2e.choose",
        parameters: { choice: "right" },
      });
      await fixture.runtime.application.semantic.dispatch({
        actionId: "action.e2e.continue",
        parameters: {},
      });
      await fixture.runtime.application.semantic.dispatch({
        actionId: "action.e2e.complete",
        parameters: {},
      });

      expect(screen.getByRole("main", { name: "E2E 流程总结" })).toBeVisible();
      expect(screen.getByRole("heading", { name: "E2E 流程总结" })).toBeVisible();
      expect(screen.getByRole("button", { name: "设置" })).toBeVisible();
    } finally {
      fixture.runtime.dispose();
    }
  });
});
