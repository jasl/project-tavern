// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { inputHandledV1, systemInputActionIdsV1, type InputEventV1 } from "../input/contracts.js";
import { createInputRouterV1 } from "../input/input-router.js";
import { GameStageV1 } from "../shell/game-stage.js";
import { SettingsLauncherV1 } from "./settings-launcher.js";
import { SystemDialogHostV1 } from "./system-dialog-host.js";
import { createSystemDialogSessionStoreV1 } from "./system-dialog-session-store.js";

afterEach(cleanup);

const settingsV1 = Object.freeze({
  title: "设置",
  closeLabel: "关闭设置",
  sections: Object.freeze([<section key="fixture">测试设置</section>]),
  emptyText: "没有可调整设置",
});

function SystemHarnessV1(props: { readonly inputRouter: ReturnType<typeof createInputRouterV1> }) {
  return (
    <SystemDialogHostV1 inputRouter={props.inputRouter} settings={settingsV1}>
      <div role="dialog" aria-label="测试叙事">
        测试叙事内容
      </div>
      <SettingsLauncherV1 label="设置" />
    </SystemDialogHostV1>
  );
}

function StageSystemHarnessV1(props: {
  readonly inputRouter: ReturnType<typeof createInputRouterV1>;
}) {
  return (
    <GameStageV1
      accessibleName="设置隔离测试舞台"
      layers={{
        background: <button type="button">背景操作</button>,
        character: null,
        sceneInteraction: null,
        hud: <button type="button">HUD 操作</button>,
        workspaceOverlay: <button type="button">Overlay 操作</button>,
        narrative: <button type="button">叙事操作</button>,
        system: (
          <SystemDialogHostV1 inputRouter={props.inputRouter} settings={settingsV1}>
            <SettingsLauncherV1 label="设置" />
          </SystemDialogHostV1>
        ),
      }}
    />
  );
}

describe("SystemDialogHostV1", () => {
  it("uses one supplied session store for rendering, diagnostics, and unmount cleanup", async () => {
    const store = createSystemDialogSessionStoreV1();
    const readSystemDialogOpenForDiagnosticsV1 = (): boolean => store.getSnapshot().settingsOpen;
    const rendered = render(
      <SystemDialogHostV1 store={store} inputRouter={createInputRouterV1()} settings={settingsV1}>
        <SettingsLauncherV1 label="设置" />
      </SystemDialogHostV1>,
    );
    const user = userEvent.setup();

    expect(readSystemDialogOpenForDiagnosticsV1()).toBe(false);
    expect(screen.queryByRole("dialog", { name: "设置" })).not.toBeInTheDocument();

    act(() => store.openSettings());

    expect(readSystemDialogOpenForDiagnosticsV1()).toBe(true);
    expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "关闭设置" }));

    expect(readSystemDialogOpenForDiagnosticsV1()).toBe(false);
    expect(screen.queryByRole("dialog", { name: "设置" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "设置" }));

    expect(readSystemDialogOpenForDiagnosticsV1()).toBe(true);
    expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();

    rendered.unmount();

    expect(readSystemDialogOpenForDiagnosticsV1()).toBe(false);
  });

  it("uses System above Overlay and Narrative and never leaks to Gameplay", async () => {
    const inputRouter = createInputRouterV1();
    const overlay = vi.fn(() => inputHandledV1);
    const narrative = vi.fn(() => inputHandledV1);
    const gameplay = vi.fn(() => inputHandledV1);
    inputRouter.register({ context: "gameplay", handle: gameplay });
    inputRouter.register({ context: "narrative", handle: narrative });
    inputRouter.register({ context: "overlay", handle: overlay });
    const rendered = render(<SystemHarnessV1 inputRouter={inputRouter} />);
    const opener = screen.getByRole("button", { name: "设置" });
    await userEvent.setup().click(opener);

    expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();
    expect(screen.getByRole("dialog", { name: "测试叙事", hidden: true })).toBeVisible();
    expect(
      rendered.container.querySelector('[data-system-dialog-host-content="true"]'),
    ).toHaveAttribute("inert");
    act(() => {
      expect(
        inputRouter.route({ kind: "action", actionId: systemInputActionIdsV1.cancel }),
      ).toEqual({ kind: "handled", context: "system" });
    });

    expect(overlay).not.toHaveBeenCalled();
    expect(narrative).not.toHaveBeenCalled();
    expect(gameplay).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "设置" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "测试叙事" })).toBeVisible();
    expect(
      rendered.container.querySelector('[data-system-dialog-host-content="true"]'),
    ).not.toHaveAttribute("inert");
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("returns focus to the exact launcher among multiple launchers", async () => {
    const inputRouter = createInputRouterV1();
    render(
      <SystemDialogHostV1 inputRouter={inputRouter} settings={settingsV1}>
        <SettingsLauncherV1 label="顶部设置" />
        <SettingsLauncherV1 label="底部设置" />
      </SystemDialogHostV1>,
    );
    const top = screen.getByRole("button", { name: "顶部设置" });
    const bottom = screen.getByRole("button", { name: "底部设置" });

    await userEvent.setup().click(bottom);
    await userEvent.setup().click(screen.getByRole("button", { name: "关闭设置" }));

    await waitFor(() => expect(bottom).toHaveFocus());
    expect(top).not.toHaveFocus();
  });

  it("traps keyboard focus inside the reserved System dialog", async () => {
    const inputRouter = createInputRouterV1();
    render(
      <>
        <button type="button">舞台外操作</button>
        <SystemDialogHostV1 inputRouter={inputRouter} settings={settingsV1}>
          <SettingsLauncherV1 label="设置" />
        </SystemDialogHostV1>
      </>,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "设置" }));
    const close = screen.getByRole("button", { name: "关闭设置" });
    expect(close).toHaveFocus();

    await user.tab();
    expect(close).toHaveFocus();
    expect(screen.getByRole("button", { name: "舞台外操作", hidden: true })).not.toHaveFocus();
  });

  it("passes transient cleanup through without closing the settings surface", async () => {
    const inputRouter = createInputRouterV1();
    const lowerCleanup = vi.fn(() => inputHandledV1);
    inputRouter.register({ context: "overlay", handle: lowerCleanup });
    render(<SystemHarnessV1 inputRouter={inputRouter} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "设置" }));

    expect(inputRouter.route({ kind: "focus_loss" })).toEqual({
      kind: "handled",
      context: "overlay",
    });
    expect(
      inputRouter.route({
        kind: "pointer_cancel",
        pointerId: parseNonNegativeSafeInteger(0),
      }),
    ).toEqual({ kind: "handled", context: "overlay" });
    expect(lowerCleanup).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();
  });

  it("isolates lower GameStage layers only while settings is open", async () => {
    const inputRouter = createInputRouterV1();
    render(<StageSystemHarnessV1 inputRouter={inputRouter} />);
    const user = userEvent.setup();

    expect(screen.getByTestId("stage-hud")).not.toHaveAttribute("inert");
    await user.click(screen.getByRole("button", { name: "设置" }));

    const dialog = screen.getByRole("dialog", { name: "设置" });
    await waitFor(() => expect(screen.getByTestId("stage-hud")).toHaveAttribute("inert"));
    expect(screen.getByTestId("stage-workspace-overlay")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-narrative")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-system")).not.toHaveAttribute("inert");
    expect(dialog.closest('[data-stage-layer="system"]')).toBe(screen.getByTestId("stage-system"));
    expect(dialog).toHaveAttribute("data-blocking-focus-scope", "system");
    expect(dialog).toHaveStyle({ position: "absolute" });

    await user.click(screen.getByRole("button", { name: "关闭设置" }));
    await waitFor(() => expect(screen.getByTestId("stage-hud")).not.toHaveAttribute("inert"));
  });

  it("unregisters the system handler when the host unmounts", async () => {
    const inputRouter = createInputRouterV1();
    const gameplay = vi.fn((_event: InputEventV1) => inputHandledV1);
    inputRouter.register({ context: "gameplay", handle: gameplay });
    const rendered = render(<SystemHarnessV1 inputRouter={inputRouter} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "设置" }));

    rendered.unmount();

    expect(inputRouter.route({ kind: "action", actionId: systemInputActionIdsV1.cancel })).toEqual({
      kind: "handled",
      context: "gameplay",
    });
    expect(gameplay).toHaveBeenCalledOnce();
  });
});
