// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DevDockPortalCoordinatorV1,
  useDevDockPortalTargetV1,
} from "../debug/DevDockPortalCoordinator.js";
import {
  inputHandledV1,
  parseInputActionIdV1,
  systemInputActionIdsV1,
} from "../input/contracts.js";
import { createInputRouterV1 } from "../input/input-router.js";
import { GameStageV1 } from "../shell/game-stage.js";
import type { OverlayRendererResolverV1, OverlayRendererResolutionV1 } from "./overlay-host.js";
import { OverlayHostV1 } from "./overlay-host.js";
import { createOverlaySessionStoreV1 } from "./overlay-session-store.js";

afterEach(cleanup);

type OverlayIdV1 = "inventory" | "ingredient" | "supplier" | "unknown";

function resolutionV1(accessibleName: string, content: OverlayRendererResolutionV1["content"]) {
  return Object.freeze({ accessibleName, content });
}

function createResolverV1(
  store: ReturnType<typeof createOverlaySessionStoreV1<OverlayIdV1>>,
): OverlayRendererResolverV1<OverlayIdV1> {
  const resolver: OverlayRendererResolverV1<OverlayIdV1> = {
    resolve(id: OverlayIdV1) {
      switch (id) {
        case "inventory":
          return resolutionV1(
            "背包",
            <button type="button" onClick={() => store.pushDetail("ingredient")}>
              食材详情
            </button>,
          );
        case "ingredient":
          return resolutionV1(
            "食材详情",
            <button type="button" onClick={() => store.pushDetail("supplier")}>
              供应商详情
            </button>,
          );
        case "supplier":
          return resolutionV1("供应商详情", <p>供应商内容</p>);
        case "unknown":
          return null;
      }
      return null;
    },
  };
  return Object.freeze(resolver);
}

function OverlayHarnessV1() {
  const store = createOverlaySessionStoreV1<OverlayIdV1>();
  const inputRouter = createInputRouterV1();
  const rendererResolver = createResolverV1(store);
  return (
    <div>
      <button type="button" onClick={() => store.openPrimary("inventory")}>
        打开背包
      </button>
      <OverlayHostV1
        store={store}
        rendererResolver={rendererResolver}
        inputRouter={inputRouter}
        closeLabel="关闭"
      />
    </div>
  );
}

function DevDockPortalSelectionProbeV1() {
  const { surface, target } = useDevDockPortalTargetV1();
  return (
    <output
      data-testid="devdock-portal-selection"
      data-surface={surface}
      data-target-scope={target?.dataset.blockingFocusScope ?? "none"}
      data-target-overlay-depth={target?.dataset.overlayDepth ?? "none"}
    />
  );
}

describe("OverlayHostV1", () => {
  it("registers only the actual top overlay Dialog.Content as the DevDock focus target", async () => {
    const store = createOverlaySessionStoreV1<OverlayIdV1>();
    store.openPrimary("inventory");
    store.pushDetail("ingredient");
    render(
      <DevDockPortalCoordinatorV1>
        <DevDockPortalSelectionProbeV1 />
        <OverlayHostV1
          store={store}
          rendererResolver={createResolverV1(store)}
          inputRouter={createInputRouterV1()}
          closeLabel="关闭"
        />
      </DevDockPortalCoordinatorV1>,
    );

    const primary = await screen.findByRole("dialog", { name: "背包" });
    const detail = screen.getByRole("dialog", { name: "食材详情" });
    expect(primary).not.toHaveAttribute("data-blocking-focus-scope");
    expect(detail).toHaveAttribute("data-blocking-focus-scope", "overlay");
    await waitFor(() =>
      expect(screen.getByTestId("devdock-portal-selection")).toHaveAttribute(
        "data-target-overlay-depth",
        "1",
      ),
    );

    act(() => {
      store.closeTop();
    });
    await waitFor(() =>
      expect(screen.getByTestId("devdock-portal-selection")).toHaveAttribute(
        "data-target-overlay-depth",
        "0",
      ),
    );
    expect(screen.getByRole("dialog", { name: "背包" })).toHaveAttribute(
      "data-blocking-focus-scope",
      "overlay",
    );

    act(() => {
      store.closeTop();
    });
    await waitFor(() =>
      expect(screen.getByTestId("devdock-portal-selection")).toHaveAttribute(
        "data-surface",
        "base",
      ),
    );
  });

  it("renders the primary and ordered details inside its Stage-layer host", async () => {
    const store = createOverlaySessionStoreV1<OverlayIdV1>();
    store.openPrimary("inventory");
    store.pushDetail("ingredient");
    store.pushDetail("supplier");

    render(
      <OverlayHostV1
        store={store}
        rendererResolver={createResolverV1(store)}
        inputRouter={createInputRouterV1()}
        closeLabel="关闭"
      />,
    );

    const dialogs = await screen.findAllByRole("dialog");
    expect(dialogs.map((dialog) => dialog.getAttribute("data-overlay-kind"))).toEqual([
      "primary",
      "detail",
      "detail",
    ]);
    expect(dialogs.map((dialog) => dialog.getAttribute("data-overlay-depth"))).toEqual([
      "0",
      "1",
      "2",
    ]);
    expect(screen.getByRole("dialog", { name: "背包" })).toBeVisible();
    expect(screen.getByRole("dialog", { name: "食材详情" })).toBeVisible();
    expect(screen.getByRole("dialog", { name: "供应商详情" })).toBeVisible();
    const host = screen.getByTestId("overlay-host");
    for (const dialog of dialogs) expect(host).toContainElement(dialog);
    const layers = dialogs.map((dialog) => dialog.closest("[data-overlay-layer]"));
    expect(layers[0]).toHaveAttribute("inert");
    expect(layers[1]).toHaveAttribute("inert");
    expect(layers[2]).not.toHaveAttribute("inert");
  });

  it("closes the top detail before the primary and returns focus to the exact opener", async () => {
    render(<OverlayHarnessV1 />);
    const user = userEvent.setup();
    const opener = screen.getByRole("button", { name: "打开背包" });

    await user.click(opener);
    const detailOpener = await screen.findByRole("button", { name: "食材详情" });
    await user.click(detailOpener);
    expect(screen.getByRole("dialog", { name: "食材详情" })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "食材详情" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "背包" })).toBeVisible();
    expect(detailOpener).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "背包" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("returns focus through every opener in a multi-detail stack", async () => {
    render(<OverlayHarnessV1 />);
    const user = userEvent.setup();
    const primaryOpener = screen.getByRole("button", { name: "打开背包" });

    await user.click(primaryOpener);
    const firstDetailOpener = await screen.findByRole("button", { name: "食材详情" });
    await user.click(firstDetailOpener);
    const secondDetailOpener = await screen.findByRole("button", { name: "供应商详情" });
    await user.click(secondDetailOpener);
    expect(screen.getByRole("dialog", { name: "供应商详情" })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "供应商详情" })).not.toBeInTheDocument();
    expect(secondDetailOpener).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "食材详情" })).not.toBeInTheDocument();
    expect(firstDetailOpener).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "背包" })).not.toBeInTheDocument();
    expect(primaryOpener).toHaveFocus();
  });

  it("exposes a visible native close control for the top entry on pointer and touch paths", async () => {
    render(<OverlayHarnessV1 />);
    const user = userEvent.setup();
    const primaryOpener = screen.getByRole("button", { name: "打开背包" });

    await user.click(primaryOpener);
    const detailOpener = await screen.findByRole("button", { name: "食材详情" });
    await user.click(detailOpener);

    const detail = screen.getByRole("dialog", { name: "食材详情" });
    const closeDetail = within(detail).getByRole("button", { name: "关闭" });
    expect(closeDetail).toBeInstanceOf(HTMLButtonElement);
    expect(closeDetail).toBeVisible();
    await user.pointer({ target: closeDetail, keys: "[TouchA]" });

    expect(screen.queryByRole("dialog", { name: "食材详情" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "背包" })).toBeVisible();
    expect(detailOpener).toHaveFocus();

    await user.click(
      within(screen.getByRole("dialog", { name: "背包" })).getByRole("button", {
        name: "关闭",
      }),
    );
    expect(screen.queryByRole("dialog", { name: "背包" })).not.toBeInTheDocument();
    expect(primaryOpener).toHaveFocus();
  });

  it("returns focus to the external opener when an active host unmounts", async () => {
    const store = createOverlaySessionStoreV1<OverlayIdV1>();
    const inputRouter = createInputRouterV1();
    const rendererResolver = createResolverV1(store);
    const opener = (
      <button type="button" onClick={() => store.openPrimary("inventory")}>
        打开背包
      </button>
    );
    const rendered = render(
      <>
        {opener}
        <OverlayHostV1
          store={store}
          rendererResolver={rendererResolver}
          inputRouter={inputRouter}
          closeLabel="关闭"
        />
      </>,
    );
    const user = userEvent.setup();
    const externalOpener = screen.getByRole("button", { name: "打开背包" });

    await user.click(externalOpener);
    expect(await screen.findByRole("dialog", { name: "背包" })).toBeVisible();
    expect(screen.getByRole("button", { name: "食材详情" })).toHaveFocus();

    rendered.rerender(opener);

    expect(screen.queryByRole("dialog", { name: "背包" })).not.toBeInTheDocument();
    expect(externalOpener).toHaveFocus();
  });

  it("registers Overlay only while active and blocks lower viewport/action events", async () => {
    const store = createOverlaySessionStoreV1<OverlayIdV1>();
    const inputRouter = createInputRouterV1();
    const gameplay = vi.fn(() => inputHandledV1);
    inputRouter.register({ context: "gameplay", handle: gameplay });
    const rendered = render(
      <OverlayHostV1
        store={store}
        rendererResolver={createResolverV1(store)}
        inputRouter={inputRouter}
        closeLabel="关闭"
      />,
    );
    const unrelatedAction = Object.freeze({
      kind: "action" as const,
      actionId: parseInputActionIdV1("ui.test_action"),
    });

    expect(inputRouter.route(unrelatedAction)).toEqual({ kind: "handled", context: "gameplay" });
    gameplay.mockClear();
    act(() => store.openPrimary("inventory"));
    const activeSnapshot = store.getSnapshot();

    const viewportEvent = Object.freeze({
      kind: "viewport_point" as const,
      phase: "activate" as const,
      point: Object.freeze({ x: 40, y: 50 }),
      pointerId: parseNonNegativeSafeInteger(1),
      pointerType: "mouse" as const,
    });
    expect(inputRouter.route(viewportEvent)).toEqual({ kind: "handled", context: "overlay" });
    expect(inputRouter.route(unrelatedAction)).toEqual({ kind: "handled", context: "overlay" });
    expect(gameplay).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(activeSnapshot);

    rendered.unmount();
    expect(inputRouter.route(unrelatedAction)).toEqual({ kind: "handled", context: "gameplay" });
  });

  it("marks lower Stage layers inert while preserving Overlay and System access", async () => {
    const store = createOverlaySessionStoreV1<OverlayIdV1>();
    const systemAction = vi.fn();
    const host = (
      <OverlayHostV1
        store={store}
        rendererResolver={createResolverV1(store)}
        inputRouter={createInputRouterV1()}
        closeLabel="关闭"
      />
    );
    render(
      <GameStageV1
        accessibleName="隔离测试舞台"
        layers={Object.freeze({
          background: <button type="button">背景操作</button>,
          character: null,
          sceneInteraction: <button type="button">场景操作</button>,
          hud: <button type="button">经营操作</button>,
          workspaceOverlay: host,
          narrative: <button type="button">叙事操作</button>,
          system: (
            <button type="button" onClick={systemAction}>
              系统操作
            </button>
          ),
        })}
      />,
    );

    const overlayHost = screen.getByTestId("overlay-host");
    expect(overlayHost).toHaveStyle({ pointerEvents: "none" });
    act(() => store.openPrimary("inventory"));
    expect(await screen.findByRole("dialog", { name: "背包" })).toBeVisible();
    expect(overlayHost).toHaveStyle({ pointerEvents: "auto" });
    expect(screen.getByTestId("stage-background")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-character")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-scene-interaction")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-hud")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-narrative")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-workspace-overlay")).not.toHaveAttribute("inert");
    expect(screen.getByTestId("stage-system")).not.toHaveAttribute("inert");
    await userEvent.setup().click(screen.getByRole("button", { name: "系统操作" }));
    expect(systemAction).toHaveBeenCalledOnce();
    expect(screen.getByRole("dialog", { name: "背包" })).toBeVisible();

    act(() => store.closeAll());
    expect(overlayHost).toHaveStyle({ pointerEvents: "none" });
    expect(screen.getByTestId("stage-background")).not.toHaveAttribute("inert");
    expect(screen.getByTestId("stage-narrative")).not.toHaveAttribute("inert");
  });

  it("handles ui.cancel one entry at a time but never closes on focus_loss", () => {
    const store = createOverlaySessionStoreV1<OverlayIdV1>();
    const inputRouter = createInputRouterV1();
    const gameplay = vi.fn(() => inputHandledV1);
    inputRouter.register({ context: "gameplay", handle: gameplay });
    render(
      <OverlayHostV1
        store={store}
        rendererResolver={createResolverV1(store)}
        inputRouter={inputRouter}
        closeLabel="关闭"
      />,
    );
    act(() => {
      store.openPrimary("inventory");
      store.pushDetail("ingredient");
    });

    const beforeFocusLoss = store.getSnapshot();
    expect(inputRouter.route(Object.freeze({ kind: "focus_loss" as const }))).toEqual({
      kind: "handled",
      context: "gameplay",
    });
    expect(store.getSnapshot()).toBe(beforeFocusLoss);
    gameplay.mockClear();
    expect(
      inputRouter.route(
        Object.freeze({
          kind: "pointer_cancel" as const,
          pointerId: parseNonNegativeSafeInteger(1),
        }),
      ),
    ).toEqual({ kind: "handled", context: "gameplay" });
    expect(gameplay).toHaveBeenCalledOnce();
    expect(store.getSnapshot()).toBe(beforeFocusLoss);

    act(() => {
      expect(
        inputRouter.route(
          Object.freeze({ kind: "action" as const, actionId: systemInputActionIdsV1.cancel }),
        ),
      ).toEqual({ kind: "handled", context: "overlay" });
    });
    expect(store.getSnapshot()).toEqual({ primaryId: "inventory", detailIds: [] });
    act(() => {
      inputRouter.route(
        Object.freeze({ kind: "action" as const, actionId: systemInputActionIdsV1.cancel }),
      );
    });
    expect(store.getSnapshot()).toEqual({ primaryId: null, detailIds: [] });
  });

  it("resolves only IDs from the one observed stack snapshot", () => {
    const store = createOverlaySessionStoreV1<OverlayIdV1>();
    store.openPrimary("inventory");
    store.pushDetail("ingredient");
    const baseResolver = createResolverV1(store);
    const resolveRenderer = vi.fn(baseResolver.resolve);
    const rendererResolver = Object.freeze({ resolve: resolveRenderer });
    render(
      <OverlayHostV1
        store={store}
        rendererResolver={rendererResolver}
        inputRouter={createInputRouterV1()}
        closeLabel="关闭"
      />,
    );

    expect(resolveRenderer.mock.calls.map(([id]) => id)).toEqual(["inventory", "ingredient"]);
    resolveRenderer.mockClear();
    act(() => store.openPrimary("supplier"));
    expect(resolveRenderer.mock.calls.map(([id]) => id)).toEqual(["supplier"]);
  });

  it("throws the bounded code when the closed resolver has no renderer", () => {
    const store = createOverlaySessionStoreV1<OverlayIdV1>();
    store.openPrimary("unknown");

    expect(() =>
      render(
        <OverlayHostV1
          store={store}
          rendererResolver={createResolverV1(store)}
          inputRouter={createInputRouterV1()}
          closeLabel="关闭"
        />,
      ),
    ).toThrowError("ui.overlay_renderer_missing");
  });

  it("does not steal focus when opening without an HTMLElement focus target", async () => {
    const store = createOverlaySessionStoreV1<OverlayIdV1>();
    const inputRouter = createInputRouterV1();
    render(
      <OverlayHostV1
        store={store}
        rendererResolver={createResolverV1(store)}
        inputRouter={inputRouter}
        closeLabel="关闭"
      />,
    );

    expect(document.activeElement).toBe(document.body);
    act(() => store.openPrimary("inventory"));
    expect(await screen.findByRole("dialog", { name: "背包" })).toBeVisible();
    act(() => store.closeAll());
    expect(document.activeElement).toBe(document.body);
  });

  it("bounds scrollable Overlay content to the actual Stage height", async () => {
    const css = await readFile(resolve(import.meta.dirname, "overlay-host.module.css"), "utf8");

    expect(css).toMatch(
      /\.overlay-host__content\s*\{[^}]*max-block-size:\s*calc\(100% - 2 \* var\(--silly-space-3\)\);/su,
    );
    expect(css).not.toMatch(/\.overlay-host__content\s*\{[^}]*max-block-size:\s*calc\(100dvh/su);
  });
});
