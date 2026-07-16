// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { inputHandledV1, systemInputActionIdsV1 } from "../input/contracts.js";
import { createInputRouterV1 } from "../input/input-router.js";
import { GameStageV1, useStageSystemFocusScopeTargetV1 } from "../shell/game-stage.js";
import { GameShell } from "../shell/game-shell.js";
import { RootErrorBoundaryV1 } from "./root-error-boundary.js";
import { RuntimeFailureDialogV1 } from "./runtime-failure-dialog.js";

afterEach(cleanup);

const labelsV1 = Object.freeze({
  title: "界面暂时无法继续",
  description: "你可以重试界面、重新加载应用，或导出诊断信息。",
  retryLabel: "重试界面",
  reloadApplicationLabel: "重新加载应用",
  requestExitLabel: "退出游戏",
});

function SystemFocusScopeTargetProbeV1() {
  const target = useStageSystemFocusScopeTargetV1();
  return (
    <output data-testid="system-focus-scope-target">
      {target?.dataset.blockingFocusScope ?? "none"}
    </output>
  );
}

function RuntimeFailureStageHarnessV1(props: {
  readonly inputRouter: ReturnType<typeof createInputRouterV1>;
  readonly actions?: {
    readonly retry: (() => void) | null;
    readonly reloadApplication: () => void;
    readonly requestExit: (() => void) | null;
  };
}) {
  return (
    <GameStageV1
      accessibleName="故障恢复测试舞台"
      layers={{
        background: <button type="button">背景操作</button>,
        character: null,
        sceneInteraction: null,
        hud: <button type="button">HUD 操作</button>,
        workspaceOverlay: <button type="button">Overlay 操作</button>,
        narrative: <button type="button">叙事操作</button>,
        system: (
          <>
            <SystemFocusScopeTargetProbeV1 />
            <RuntimeFailureDialogV1
              {...labelsV1}
              inputRouter={props.inputRouter}
              actions={
                props.actions ?? {
                  retry: () => undefined,
                  reloadApplication: () => undefined,
                  requestExit: () => undefined,
                }
              }
              diagnosticExport={<button type="button">导出诊断包</button>}
            />
          </>
        ),
      }}
    />
  );
}

function FocusReturnHarnessV1(props: {
  readonly inputRouter: ReturnType<typeof createInputRouterV1>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        打开故障恢复
      </button>
      {open ? (
        <RuntimeFailureDialogV1
          {...labelsV1}
          inputRouter={props.inputRouter}
          actions={{
            retry: () => setOpen(false),
            reloadApplication: () => undefined,
            requestExit: null,
          }}
          diagnosticExport={<button type="button">导出诊断包</button>}
        />
      ) : null}
    </>
  );
}

let mountedSubtreeCountV1 = 0;

function CrashingSubtreeV1() {
  const [instance] = useState(() => {
    mountedSubtreeCountV1 += 1;
    return mountedSubtreeCountV1;
  });
  const [shouldCrash, setShouldCrash] = useState(false);
  if (shouldCrash) throw new Error("synthetic render failure");
  return (
    <button type="button" onClick={() => setShouldCrash(true)}>
      触发故障（实例 {instance}）
    </button>
  );
}

beforeEach(() => {
  mountedSubtreeCountV1 = 0;
});

describe("RuntimeFailureDialogV1", () => {
  it("registers the highest System input and isolates every lower Stage layer", () => {
    const inputRouter = createInputRouterV1();
    const gameplay = vi.fn(() => inputHandledV1);
    inputRouter.register({ context: "gameplay", handle: gameplay });
    render(<RuntimeFailureStageHarnessV1 inputRouter={inputRouter} />);

    expect(screen.getByRole("dialog", { name: labelsV1.title })).toBeVisible();
    expect(screen.getByTestId("stage-hud")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-workspace-overlay")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-narrative")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-system")).not.toHaveAttribute("inert");
    expect(inputRouter.route({ kind: "action", actionId: systemInputActionIdsV1.cancel })).toEqual({
      kind: "handled",
      context: "system",
    });
    expect(gameplay).not.toHaveBeenCalled();
  });

  it("registers its actual fault-pause Dialog.Content as the System focus target", async () => {
    const inputRouter = createInputRouterV1();
    const rendered = render(<RuntimeFailureStageHarnessV1 inputRouter={inputRouter} />);

    const dialog = screen.getByRole("dialog", { name: labelsV1.title });
    await waitFor(() =>
      expect(screen.getByTestId("system-focus-scope-target")).toHaveTextContent("fault_pause"),
    );
    expect(dialog).toHaveAttribute("data-blocking-focus-scope", "fault_pause");
    expect(dialog).toHaveAttribute("data-system-surface", "runtime_failure");
    expect(dialog.closest('[data-stage-layer="system"]')).toBe(screen.getByTestId("stage-system"));

    rendered.unmount();
    expect(inputRouter.route({ kind: "action", actionId: systemInputActionIdsV1.cancel })).toEqual({
      kind: "ignored",
    });
  });

  it("exposes only supplied recovery actions and keeps diagnostic export reachable", async () => {
    const inputRouter = createInputRouterV1();
    const reloadApplication = vi.fn();
    render(
      <RuntimeFailureStageHarnessV1
        inputRouter={inputRouter}
        actions={{ retry: null, reloadApplication, requestExit: null }}
      />,
    );

    expect(screen.queryByRole("button", { name: labelsV1.retryLabel })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: labelsV1.requestExitLabel }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出诊断包" })).toBeEnabled();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: labelsV1.reloadApplicationLabel }));
    expect(reloadApplication).toHaveBeenCalledOnce();
  });

  it("contains focus and invokes each supplied action only from its native button", async () => {
    const inputRouter = createInputRouterV1();
    const retry = vi.fn();
    const reloadApplication = vi.fn();
    const requestExit = vi.fn();
    render(
      <>
        <button type="button">舞台外操作</button>
        <RuntimeFailureDialogV1
          {...labelsV1}
          inputRouter={inputRouter}
          actions={{ retry, reloadApplication, requestExit }}
          diagnosticExport={<button type="button">导出诊断包</button>}
        />
      </>,
    );
    const user = userEvent.setup();
    const retryButton = screen.getByRole("button", { name: labelsV1.retryLabel });

    await waitFor(() => expect(retryButton).toHaveFocus());
    act(() => {
      expect(
        inputRouter.route({ kind: "action", actionId: systemInputActionIdsV1.cancel }),
      ).toEqual({ kind: "handled", context: "system" });
    });
    expect(retry).not.toHaveBeenCalled();
    expect(reloadApplication).not.toHaveBeenCalled();
    expect(requestExit).not.toHaveBeenCalled();

    await user.click(retryButton);
    await user.click(screen.getByRole("button", { name: labelsV1.reloadApplicationLabel }));
    await user.click(screen.getByRole("button", { name: labelsV1.requestExitLabel }));
    expect(retry).toHaveBeenCalledOnce();
    expect(reloadApplication).toHaveBeenCalledOnce();
    expect(requestExit).toHaveBeenCalledOnce();

    screen.getByRole("button", { name: "导出诊断包" }).focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "舞台外操作", hidden: true })).not.toHaveFocus();
    expect(screen.getByRole("dialog", { name: labelsV1.title })).toContainElement(
      document.activeElement as HTMLElement,
    );
  });

  it("returns focus to the exact connected opener after the recovery surface unmounts", async () => {
    const inputRouter = createInputRouterV1();
    render(<FocusReturnHarnessV1 inputRouter={inputRouter} />);
    const user = userEvent.setup();
    const opener = screen.getByRole("button", { name: "打开故障恢复" });

    await user.click(opener);
    expect(screen.getByRole("button", { name: labelsV1.retryLabel })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: labelsV1.retryLabel }));

    await waitFor(() => expect(opener).toHaveFocus());
  });
});

describe("RootErrorBoundaryV1", () => {
  it("reports one bounded UI failure and retry remounts the failed subtree", async () => {
    const inputRouter = createInputRouterV1();
    const reportFailure = vi.fn(() => {
      throw new Error("reporter must stay isolated");
    });
    render(
      <RootErrorBoundaryV1
        inputRouter={inputRouter}
        reportFailure={reportFailure}
        failureDialog={{
          ...labelsV1,
          diagnosticExport: <button type="button">导出诊断包</button>,
        }}
        recoveryActions={{ reloadApplication: () => undefined, requestExit: null }}
      >
        <CrashingSubtreeV1 />
      </RootErrorBoundaryV1>,
    );
    const user = userEvent.setup();

    expect(screen.getByRole("button", { name: "触发故障（实例 1）" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "触发故障（实例 1）" }));

    expect(await screen.findByRole("dialog", { name: labelsV1.title })).toBeVisible();
    expect(reportFailure).toHaveBeenCalledOnce();
    expect(reportFailure).toHaveBeenCalledWith(expect.any(Error));

    await user.click(screen.getByRole("button", { name: labelsV1.retryLabel }));
    expect(await screen.findByRole("button", { name: "触发故障（实例 2）" })).toBeVisible();
    expect(mountedSubtreeCountV1).toBe(2);
  });

  it("lets GameShell replace a crashing Stage with a fresh system-only fallback", async () => {
    const inputRouter = createInputRouterV1();
    render(
      <GameShell
        accessibleName="安全恢复舞台"
        inputRouter={inputRouter}
        layers={{
          background: <span>原背景层</span>,
          character: null,
          sceneInteraction: null,
          hud: <CrashingSubtreeV1 />,
          workspaceOverlay: null,
          narrative: null,
          system: <span>原系统层</span>,
        }}
        errorBoundary={{
          reportFailure: () => undefined,
          failureDialog: {
            ...labelsV1,
            diagnosticExport: <button type="button">导出诊断包</button>,
          },
          recoveryActions: { reloadApplication: () => undefined, requestExit: null },
        }}
      />,
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "触发故障（实例 1）" }));

    const dialog = await screen.findByRole("dialog", { name: labelsV1.title });
    expect(screen.getByRole("main", { name: "安全恢复舞台" })).toBeVisible();
    expect(screen.queryByText("原背景层")).not.toBeInTheDocument();
    expect(screen.queryByText("原系统层")).not.toBeInTheDocument();
    expect(screen.getByTestId("stage-background")).toBeEmptyDOMElement();
    expect(screen.getAllByTestId(/^stage-/u)).toHaveLength(7);
    expect(dialog.closest('[data-stage-layer="system"]')).toBe(screen.getByTestId("stage-system"));
    act(() => {
      expect(
        inputRouter.route({ kind: "action", actionId: systemInputActionIdsV1.cancel }),
      ).toEqual({ kind: "handled", context: "system" });
    });
  });
});
