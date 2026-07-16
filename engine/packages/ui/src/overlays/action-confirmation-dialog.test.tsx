// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useLayoutEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  inputHandledV1,
  systemInputActionIdsV1,
  type InputRouteResultV1,
} from "../input/contracts.js";
import { createInputRouterV1 } from "../input/input-router.js";
import { Button } from "../primitives/Button.js";
import { GameStageV1, useStageSystemFocusScopeTargetV1 } from "../shell/game-stage.js";
import { SettingsLauncherV1 } from "../system/settings-launcher.js";
import { SystemDialogHostV1 } from "../system/system-dialog-host.js";
import { ActionConfirmationDialogV1 } from "./action-confirmation-dialog.js";

afterEach(cleanup);

const invocationV1 = Object.freeze({
  actionId: "action.test.irreversible" as const,
  parameters: Object.freeze({ target: "fixture" as const }),
});

function ConfirmationHarnessV1(props: {
  readonly inputRouter: ReturnType<typeof createInputRouterV1>;
  readonly dispatch: (invocation: typeof invocationV1) => Promise<unknown>;
}) {
  const [opener, setOpener] = useState<HTMLButtonElement | null>(null);
  return (
    <>
      <Button onClick={(event) => setOpener(event.currentTarget)}>执行危险操作</Button>
      {opener === null ? null : (
        <ActionConfirmationDialogV1
          title="确认危险操作"
          description="此操作需要再次确认"
          confirmLabel="确认执行"
          cancelLabel="取消"
          pendingText="正在提交"
          completedText="操作已返回结果"
          failedText="操作未能提交"
          invocation={invocationV1}
          semantic={Object.freeze({ dispatch: props.dispatch })}
          inputRouter={props.inputRouter}
          opener={opener}
          onClose={() => setOpener(null)}
        />
      )}
    </>
  );
}

function WorkspaceConfirmationHarnessV1(props: {
  readonly inputRouter: ReturnType<typeof createInputRouterV1>;
  readonly dispatch: (invocation: typeof invocationV1) => Promise<unknown>;
}) {
  const [opener, setOpener] = useState<HTMLButtonElement | null>(null);
  return (
    <GameStageV1
      accessibleName="嵌套确认测试舞台"
      layers={{
        background: null,
        character: null,
        sceneInteraction: <button type="button">场景操作</button>,
        hud: <button type="button">HUD 操作</button>,
        workspaceOverlay: (
          <>
            <Button onClick={(event) => setOpener(event.currentTarget)}>打开嵌套确认</Button>
            {opener === null ? null : (
              <ActionConfirmationDialogV1
                title="确认嵌套操作"
                description="确认框来自 Workspace Overlay"
                confirmLabel="确认嵌套操作"
                cancelLabel="取消嵌套操作"
                pendingText="正在提交"
                completedText="操作已返回结果"
                failedText="操作未能提交"
                invocation={invocationV1}
                semantic={Object.freeze({ dispatch: props.dispatch })}
                inputRouter={props.inputRouter}
                opener={opener}
                onClose={() => setOpener(null)}
              />
            )}
          </>
        ),
        narrative: <button type="button">叙事操作</button>,
        system: <SystemFocusScopeTargetProbeV1 />,
      }}
    />
  );
}

function SystemFocusScopeTargetProbeV1() {
  const target = useStageSystemFocusScopeTargetV1();
  return (
    <output data-testid="system-focus-scope-target">
      {target?.dataset.systemSurface ?? "none"}
    </output>
  );
}

function NestedConfirmationSettingsSectionV1(props: {
  readonly inputRouter: ReturnType<typeof createInputRouterV1>;
  readonly dispatch: (invocation: typeof invocationV1) => Promise<unknown>;
}) {
  const [opener, setOpener] = useState<HTMLButtonElement | null>(null);
  return (
    <>
      <Button onClick={(event) => setOpener(event.currentTarget)}>打开设置内确认</Button>
      {opener === null ? null : (
        <ActionConfirmationDialogV1
          title="确认设置操作"
          description="确认框来自设置作用域"
          confirmLabel="确认设置操作"
          cancelLabel="取消设置操作"
          pendingText="正在提交"
          completedText="操作已返回结果"
          failedText="操作未能提交"
          invocation={invocationV1}
          semantic={Object.freeze({ dispatch: props.dispatch })}
          inputRouter={props.inputRouter}
          opener={opener}
          onClose={() => setOpener(null)}
        />
      )}
    </>
  );
}

function NestedSystemFocusScopeHarnessV1(props: {
  readonly inputRouter: ReturnType<typeof createInputRouterV1>;
  readonly dispatch: (invocation: typeof invocationV1) => Promise<unknown>;
}) {
  return (
    <GameStageV1
      accessibleName="系统焦点栈测试舞台"
      layers={{
        background: null,
        character: null,
        sceneInteraction: null,
        hud: null,
        workspaceOverlay: null,
        narrative: null,
        system: (
          <>
            <SystemFocusScopeTargetProbeV1 />
            <SystemDialogHostV1
              inputRouter={props.inputRouter}
              settings={{
                title: "设置",
                closeLabel: "关闭设置",
                sections: Object.freeze([
                  <NestedConfirmationSettingsSectionV1
                    key="confirmation"
                    inputRouter={props.inputRouter}
                    dispatch={props.dispatch}
                  />,
                ]),
                emptyText: "没有可调整设置",
              }}
            >
              <SettingsLauncherV1 label="设置" />
            </SystemDialogHostV1>
          </>
        ),
      }}
    />
  );
}

function ConfirmationLayoutRouteProbeV1(props: {
  readonly inputRouter: ReturnType<typeof createInputRouterV1>;
  readonly dispatch: (invocation: typeof invocationV1) => Promise<unknown>;
  readonly opener: HTMLElement;
  readonly routeResults: InputRouteResultV1[];
}) {
  useLayoutEffect(() => {
    props.routeResults.push(
      props.inputRouter.route({
        kind: "action",
        actionId: systemInputActionIdsV1.openMenu,
      }),
    );
  }, [props.inputRouter, props.routeResults]);

  return (
    <ActionConfirmationDialogV1
      title="布局期确认"
      description="确认输入必须在同一布局提交中闭合"
      confirmLabel="确认布局操作"
      cancelLabel="取消布局操作"
      pendingText="正在提交"
      completedText="操作已返回结果"
      failedText="操作未能提交"
      invocation={invocationV1}
      semantic={Object.freeze({ dispatch: props.dispatch })}
      inputRouter={props.inputRouter}
      opener={props.opener}
      onClose={() => undefined}
    />
  );
}

describe("ActionConfirmationDialogV1", () => {
  it("claims System input during the layout commit", () => {
    const inputRouter = createInputRouterV1();
    const dispatch = vi.fn(async (_invocation: typeof invocationV1) =>
      Object.freeze({ kind: "committed" as const }),
    );
    render(<button type="button">布局期 opener</button>);
    const opener = screen.getByRole("button", { name: "布局期 opener" });
    opener.focus();
    const routeResults: InputRouteResultV1[] = [];

    render(
      <ConfirmationLayoutRouteProbeV1
        inputRouter={inputRouter}
        dispatch={dispatch}
        opener={opener}
        routeResults={routeResults}
      />,
    );

    expect(routeResults).toEqual([{ kind: "handled", context: "system" }]);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("requires a native second activation and dispatches the exact supplied invocation once", async () => {
    const inputRouter = createInputRouterV1();
    const dispatch = vi.fn(async (_invocation: typeof invocationV1) =>
      Object.freeze({ kind: "committed" as const }),
    );
    render(<ConfirmationHarnessV1 inputRouter={inputRouter} dispatch={dispatch} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "执行危险操作" }));
    expect(screen.getByRole("dialog", { name: "确认危险操作" })).toBeVisible();
    expect(dispatch).not.toHaveBeenCalled();

    expect(inputRouter.route({ kind: "action", actionId: systemInputActionIdsV1.confirm })).toEqual(
      { kind: "handled", context: "system" },
    );
    expect(dispatch).not.toHaveBeenCalled();

    const confirm = screen.getByRole("button", { name: "确认执行" });
    expect(confirm.tagName).toBe("BUTTON");
    await user.click(confirm);

    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch.mock.calls[0]?.[0]).toBe(invocationV1);
    expect(await screen.findByRole("status")).toHaveTextContent("操作已返回结果");
    expect(confirm).toBeDisabled();
  });

  it("uses native cancel, never dispatches, and returns focus to the exact opener", async () => {
    const inputRouter = createInputRouterV1();
    const dispatch = vi.fn(async (_invocation: typeof invocationV1) =>
      Object.freeze({ kind: "committed" as const }),
    );
    render(<ConfirmationHarnessV1 inputRouter={inputRouter} dispatch={dispatch} />);
    const user = userEvent.setup();
    const opener = screen.getByRole("button", { name: "执行危险操作" });

    await user.click(opener);
    const cancel = screen.getByRole("button", { name: "取消" });
    expect(cancel.tagName).toBe("BUTTON");
    await user.click(cancel);

    expect(screen.queryByRole("dialog", { name: "确认危险操作" })).not.toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("passes transient cleanup through without confirming or closing", async () => {
    const inputRouter = createInputRouterV1();
    const dispatch = vi.fn(async (_invocation: typeof invocationV1) =>
      Object.freeze({ kind: "committed" as const }),
    );
    const lowerCleanup = vi.fn(() => inputHandledV1);
    inputRouter.register({ context: "overlay", handle: lowerCleanup });
    render(<ConfirmationHarnessV1 inputRouter={inputRouter} dispatch={dispatch} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "执行危险操作" }));

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
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "确认危险操作" })).toBeVisible();
  });

  it("portals a nested confirmation into the in-stage System focus scope", async () => {
    const inputRouter = createInputRouterV1();
    const dispatch = vi.fn(async (_invocation: typeof invocationV1) =>
      Object.freeze({ kind: "committed" as const }),
    );
    render(<WorkspaceConfirmationHarnessV1 inputRouter={inputRouter} dispatch={dispatch} />);
    const user = userEvent.setup();
    const opener = screen.getByRole("button", { name: "打开嵌套确认" });
    expect(screen.getByTestId("system-focus-scope-target")).toHaveTextContent("none");

    await user.click(opener);
    const dialog = screen.getByRole("dialog", { name: "确认嵌套操作" });
    expect(dialog.closest('[data-stage-layer="system"]')).toBe(screen.getByTestId("stage-system"));
    expect(dialog).toHaveAttribute("data-blocking-focus-scope", "system");
    expect(dialog).toHaveStyle({ position: "absolute" });
    expect(
      screen
        .getByTestId("stage-system")
        .querySelector('[data-system-dialog-backdrop="action_confirmation"]'),
    ).toHaveStyle({ position: "absolute" });
    expect(screen.getByTestId("stage-workspace-overlay")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-system")).not.toHaveAttribute("inert");
    expect(screen.getByTestId("system-focus-scope-target")).toHaveTextContent(
      "action_confirmation",
    );

    await user.click(screen.getByRole("button", { name: "取消嵌套操作" }));
    await waitFor(() => expect(opener).toHaveFocus());
    expect(screen.getByTestId("stage-workspace-overlay")).not.toHaveAttribute("inert");
    expect(screen.getByTestId("system-focus-scope-target")).toHaveTextContent("none");
  });

  it("restores the previous System focus scope when a nested confirmation closes", async () => {
    const inputRouter = createInputRouterV1();
    const dispatch = vi.fn(async (_invocation: typeof invocationV1) =>
      Object.freeze({ kind: "committed" as const }),
    );
    render(<NestedSystemFocusScopeHarnessV1 inputRouter={inputRouter} dispatch={dispatch} />);
    const user = userEvent.setup();

    expect(screen.getByTestId("system-focus-scope-target")).toHaveTextContent("none");
    await user.click(screen.getByRole("button", { name: "设置" }));
    expect(screen.getByTestId("system-focus-scope-target")).toHaveTextContent("settings");

    await user.click(screen.getByRole("button", { name: "打开设置内确认" }));
    expect(screen.getByTestId("system-focus-scope-target")).toHaveTextContent(
      "action_confirmation",
    );

    await user.click(screen.getByRole("button", { name: "取消设置操作" }));
    expect(screen.getByTestId("system-focus-scope-target")).toHaveTextContent("settings");

    await user.click(screen.getByRole("button", { name: "关闭设置" }));
    expect(screen.getByTestId("system-focus-scope-target")).toHaveTextContent("none");
  });

  it("closes on routed ui.cancel, returns focus, and unregisters on unmount", async () => {
    const inputRouter = createInputRouterV1();
    const dispatch = vi.fn(async (_invocation: typeof invocationV1) =>
      Object.freeze({ kind: "committed" as const }),
    );
    const rendered = render(
      <ConfirmationHarnessV1 inputRouter={inputRouter} dispatch={dispatch} />,
    );
    const opener = screen.getByRole("button", { name: "执行危险操作" });
    await userEvent.setup().click(opener);

    act(() => {
      expect(
        inputRouter.route({ kind: "action", actionId: systemInputActionIdsV1.cancel }),
      ).toEqual({ kind: "handled", context: "system" });
    });
    expect(screen.queryByRole("dialog", { name: "确认危险操作" })).not.toBeInTheDocument();
    await waitFor(() => expect(opener).toHaveFocus());

    rendered.unmount();
    expect(inputRouter.route({ kind: "action", actionId: systemInputActionIdsV1.cancel })).toEqual({
      kind: "ignored",
    });
  });

  it("bounds a thrown dispatch in the live result instead of leaking a rejection", async () => {
    const inputRouter = createInputRouterV1();
    const dispatch = vi.fn(async (_invocation: typeof invocationV1) => {
      throw new Error("synthetic failure");
    });
    render(<ConfirmationHarnessV1 inputRouter={inputRouter} dispatch={dispatch} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "执行危险操作" }));

    await user.click(screen.getByRole("button", { name: "确认执行" }));

    expect(await screen.findByRole("status")).toHaveTextContent("操作未能提交");
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it("defines a visible stage-bounded backdrop and scrollable dialog surface", async () => {
    const css = await readFile(resolve(import.meta.dirname, "overlay-host.module.css"), "utf8");

    expect(css).toMatch(/\.blocking-dialog__backdrop\s*\{[^}]*inset:\s*0;/su);
    expect(css).toMatch(/\.blocking-dialog__backdrop\s*\{[^}]*pointer-events:\s*auto;/su);
    expect(css).toMatch(
      /\.blocking-dialog__content\s*\{[^}]*max-block-size:\s*calc\(100% - 2 \* var\(--silly-space-3\)\);/su,
    );
    expect(css).toMatch(/\.blocking-dialog__content\s*\{[^}]*overflow:\s*auto;/su);
  });
});
